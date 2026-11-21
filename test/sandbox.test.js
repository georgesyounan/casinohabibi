import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const staffCredentials = { email: 'admin@example.test', password: 'example-staff-password' };
const playerCredentials = { email: 'player@example.test', password: 'example-test-password' };

async function startSandbox(t, { initializeDatabase, appBasePath = '', sandboxTenantHosts = '', captureMail = false } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'northplay-test-'));
  const database = join(directory, 'northplay.sqlite');
  if (initializeDatabase) {
    const db = new DatabaseSync(database);
    try { initializeDatabase(db); } finally { db.close(); }
  }
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const mailbox = join(directory, 'mail.jsonl');
  const preload = join(directory, 'mailer.mjs');
  if (captureMail) await writeFile(preload, `import { appendFileSync } from 'node:fs';
    globalThis.fetch = async (url, options) => {
      if (url !== 'https://api.resend.com/emails') throw new Error('Unexpected destination');
      appendFileSync(process.env.TEST_MAILBOX, JSON.stringify({ ...JSON.parse(options.body), key: options.headers['Idempotency-Key'] }) + '\\n');
      return new Response('{}', { status: 200 });
    };`);
  const server = spawn(process.execPath, [...(captureMail ? ['--import', preload] : []), 'server.js'], {
    env: {
      ...process.env, APP_ENV: 'development', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory,
      BOOTSTRAP_ADMIN_EMAIL: staffCredentials.email, BOOTSTRAP_ADMIN_PASSWORD: staffCredentials.password,
      PROVIDER_KEY_ENCRYPTION: randomBytes(32).toString('hex'), SECURE_COOKIES: '0',
      SANDBOX_TENANT_HOSTS: sandboxTenantHosts,
      APP_BASE_PATH: appBasePath, PUBLIC_BASE_URL: '', RESET_EMAIL_API_KEY: '', RESET_EMAIL_FROM: '', PLATFORM_ADMIN_TOKEN: '',
      ...(captureMail && { TEST_MAILBOX: mailbox, PUBLIC_BASE_URL: 'https://localhost' + appBasePath, RESET_EMAIL_API_KEY: 'fixture', RESET_EMAIL_FROM: 'test@example.test' })
    }
  });
  const errors = [];
  server.stderr.on('data', (data) => errors.push(data.toString()));
  const exited = once(server, 'exit');
  t.after(async () => {
    server.kill();
    await exited;
    await rm(directory, { recursive: true, force: true });
  });
  await Promise.race([
    once(server.stdout, 'data'),
    exited.then(([code]) => assert.fail(`Server exited with code ${code}\n${errors.join('')}`))
  ]);
  server.stdout.resume();
  return { base: `http://127.0.0.1:${port}`, database, readMail: async () => (await readFile(mailbox, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)) };
}

function client(base, cookies = new Map()) {
  return async function request(path, payload, host, headers = {}) {
    const origin = new URL(base);
    if (host) origin.hostname = host;
    const pathname = origin.pathname.replace(/\/$/, '');
    const response = await fetch(new URL(pathname + '/api/' + path, origin), {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {
        ...(payload !== undefined && { 'Content-Type': 'application/json' }),
        ...(cookies.size && { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') }),
        ...headers
      },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    const setCookies = response.headers.getSetCookie();
    for (const cookie of setCookies) {
      const [key, value] = cookie.split(';')[0].split('=');
      if (value) cookies.set(key, value);
      else cookies.delete(key);
    }
    return { status: response.status, data: await response.json(), requestId: response.headers.get('x-request-id'), setCookies };
  };
}

async function register(request) {
  const result = await request('signup', playerCredentials);
  assert.equal(result.status, 200);
  assert.equal(result.data.verificationRequired, true);
  const token = new URL(result.data.verifyUrl).searchParams.get('verify');
  assert.equal((await request('email-verification/complete', { token })).status, 200);
  assert.equal((await request('login', playerCredentials)).data.balance, 10000);
}

test('player and provider sandbox flows', async (t) => {
  const { base, database } = await startSandbox(t);
  const request = client(base);
  const staff = client(base);

  assert.match(await (await fetch(base)).text(), /Northplay Casino/);
  assert.equal((await fetch(base + '/hero.webp')).status, 200);
  assert.equal((await request('account')).data, null);

  await register(request);
  const play = { game: 'roulette', choice: 'red', wager: 500, requestId: randomUUID() };
  const round = await request('play', play);
  assert.equal(round.status, 200);
  assert.equal(Math.abs(round.data.amount), 500);
  assert.equal(round.data.balance, 10000 + round.data.amount);
  assert.deepEqual((await request('play', play)).data, round.data);
  assert.equal((await request('play', { ...play, wager: 100 })).status, 409);
  assert.equal((await request('account')).data.history.length, 2);
  await request('logout', {});
  assert.equal((await request('play', play)).status, 401);
  assert.equal((await request('login', playerCredentials)).data.balance, round.data.balance);

  const key = 'sample-provider-secret';
  assert.equal((await request('providers', { name: 'Demo', key })).status, 401);
  assert.equal((await staff('admin/login', staffCredentials)).status, 200);
  assert.equal((await staff('providers', { name: 'Demo', key })).status, 200);
  assert.equal((await staff('providers', { name: 'Demo', key: key + '-rotated' })).status, 200);
  const providers = (await staff('providers/list', {})).data;
  assert.equal(providers.length, 1);
  assert.deepEqual(Object.keys(providers[0]).sort(), ['name', 'updated']);
  const db = new DatabaseSync(database, { readOnly: true });
  assert.match(db.prepare('SELECT encrypted_key FROM providers').get().encrypted_key, /^[A-Za-z0-9+/]+=*$/);
  assert.deepEqual(db.prepare('SELECT action FROM provider_events ORDER BY id').all().map(({ action }) => action), ['added', 'rotated']);
  db.close();
});

test('Coming Soon publication, role and tenant scope, and favorite reconciliation', async (t) => {
  const { base, database } = await startSandbox(t);
  const staff = client(base);
  const editor = client(base);
  const guestCookies = new Map();
  const guest = client(base, guestCookies);
  const player = client(base);
  const secondDevice = client(base);
  const edit = (title, featuredRank = 0) => ({
    action: 'save', version: 0, titleEn: title, titleFr: title, studio: 'Studio Test', category: 'slots',
    descriptionEn: 'Upcoming title', descriptionFr: 'Titre à venir', artwork: '', altEn: '', altFr: '', featuredRank
  });
  const publish = (title) => staff('admin/coming-soon', { action: 'publish', slug: title.slug, version: title.version });

  assert.deepEqual((await guest('coming-soon')).data.titles, []);
  assert.equal((await guest('admin/coming-soon')).status, 401);
  assert.equal((await staff('admin/login', staffCredentials)).status, 200);
  const editorCredentials = { email: 'editor@example.test', password: 'example-editor-password' };
  assert.equal((await staff('admin/staff', { ...editorCredentials, role: 'operator_content' })).status, 200);
  assert.equal((await editor('admin/login', editorCredentials)).status, 200);

  const exampleTitles = ['Copper Comet', 'Moonlit Vault', 'Pixel Pier', 'Cloud Carousel', 'Velvet Orbit'];
  for (const [index, name] of exampleTitles.entries()) {
    const created = await staff('admin/coming-soon', edit(name, index < 2 ? 2 - index : 0));
    assert.equal(created.status, 200);
    assert.equal((await publish(created.data.title)).status, 200);
  }
  assert.equal((await staff('admin/overview')).data.publishedComingSoon, 5);

  const created = await editor('admin/coming-soon', edit('Neon Orchard'));
  assert.equal(created.status, 200);
  assert.equal(created.data.title.state, 'draft');
  const { slug, version } = created.data.title;
  assert.equal((await guest(`coming-soon/${slug}`)).status, 404);
  assert.equal((await fetch(`${base}/coming-soon/${slug}`)).status, 404);
  assert.equal((await editor('admin/coming-soon', { action: 'publish', slug, version })).status, 403);

  const db = new DatabaseSync(database);
  try {
    db.prepare("INSERT INTO tenants VALUES ('second', 'second', 'Second Test Tenant', 'active', ?)").run(Date.now());
    db.prepare("UPDATE tenant_domains SET tenant_id = 'second' WHERE host = 'localhost'").run();
  } finally { db.close(); }
  assert.equal((await staff('admin/coming-soon', undefined, 'localhost')).status, 401);
  assert.deepEqual((await guest('coming-soon', undefined, 'localhost')).data.titles, []);

  const published = await publish(created.data.title);
  assert.equal(published.status, 200);
  assert.equal((await publish(created.data.title)).status, 409);
  assert.equal((await staff('admin/overview')).data.publishedComingSoon, 6);
  const lobby = await guest('coming-soon');
  assert.deepEqual(lobby.data.featured, ['moonlit-vault', 'copper-comet']);
  assert.equal(lobby.data.titles.length, 6);
  assert.equal(new Set(lobby.data.discover).size, 6);
  const visit = guestCookies.get('northplay_visit');
  assert.deepEqual((await guest('coming-soon')).data.discover, lobby.data.discover);
  const newVisitCookies = new Map();
  await client(base, newVisitCookies)('coming-soon');
  assert.notEqual(visit, newVisitCookies.get('northplay_visit'));
  const { favoriteKey } = (await guest(`coming-soon/${slug}`)).data;
  assert.equal((await guest(`coming-soon/${slug}`, undefined, 'localhost')).status, 404);
  const scene = await fetch(`${base}/coming-soon/${slug}`);
  assert.equal(scene.status, 200);
  assert.match(await scene.text(), /id="coming-soon-detail"/);

  const audit = (await staff('admin/audit')).data.events.filter(({ action, target }) => action === 'coming_soon_published' && target.startsWith(`coming-soon/${slug}@`));
  assert.equal(audit.length, 1);
  assert.equal(audit[0].id, published.data.auditId);
  assert.equal(audit[0].actor, staffCredentials.email);
  assert.equal(audit[0].correlationId, published.requestId);

  const revision = await staff('admin/coming-soon', { ...edit('Neon Orchard revised'), slug, version: published.data.title.version });
  assert.equal(revision.status, 200);
  assert.equal((await guest(`coming-soon/${slug}`)).data.titleEn, 'Neon Orchard');
  assert.equal((await guest('account/favorite', { key: favoriteKey, saved: true })).status, 401);

  await register(player);
  assert.equal((await secondDevice('login', playerCredentials)).status, 200);
  const attempt = { key: favoriteKey, saved: true };
  const both = await Promise.all([player('account/favorite', attempt), secondDevice('account/favorite', attempt)]);
  assert.deepEqual(both.map(({ data }) => data.favorites), [[favoriteKey], [favoriteKey]]);
  assert.deepEqual((await secondDevice('account')).data.favorites, [favoriteKey]);
  const saves = (await staff(`admin/coming-soon/saves?q=${playerCredentials.email}`)).data;
  assert.equal(saves.length, 1);
  assert.equal(saves[0].slug, slug);
  assert.equal((await staff('admin/overview')).data.firstComingSoonSaves, 1);
  assert.equal((await editor('admin/coming-soon/saves')).status, 403);

  const archived = await staff('admin/coming-soon', { action: 'archive', slug, version: revision.data.title.version });
  assert.equal(archived.status, 200);
  assert.equal((await staff('admin/overview')).data.publishedComingSoon, 5);
  assert.equal((await fetch(`${base}/coming-soon/${slug}`)).status, 404);
  assert.deepEqual((await player('account')).data.favorites, []);
  assert.equal((await player('account/favorite', attempt)).status, 404);
  const history = (await staff(`admin/coming-soon/saves?q=save-${saves[0].id}`)).data;
  assert.equal(history[0].id, saves[0].id);
  assert.equal(history[0].state, 'archived');
  assert.deepEqual((await player('account/export')).data.previewSaveHistory.map(({ id }) => id), [saves[0].id]);

  for (const name of ['Lantern Parade', 'Cobalt Cove', 'Silver Garden']) {
    const newTitle = await staff('admin/coming-soon', edit(name));
    assert.equal((await publish(newTitle.data.title)).status, 200);
  }
  const expandedLobby = (await guest('coming-soon')).data;
  assert.equal(expandedLobby.titles.length, 8);
  assert.equal(new Set(expandedLobby.discover).size, 6);
});

test('brand publication and audit use explicit, revocable grants and replay one committed event', async (t) => {
  const { base, database } = await startSandbox(t, { appBasePath: '/casinohabibi' });
  const admin = client(base + '/casinohabibi');
  const publisher = client(base + '/casinohabibi');
  const draftEditor = client(base + '/casinohabibi');
  const anotherBrand = client(base + '/casinohabibi');
  const publicClient = client(base + '/casinohabibi');
  const player = client(base + '/casinohabibi');
  const publisherCredentials = { email: 'publisher@example.test', password: 'example-publisher-password' };
  const editorCredentials = { email: 'draft@example.test', password: 'example-draft-password' };
  const contentRole = 'operator_content';
  assert.equal((await admin('admin/login', staffCredentials)).status, 200);
  const grant = { ...publisherCredentials, role: contentRole, publishWebsite: true, publishCatalogue: true, reason: 'Manage demo content' };
  assert.equal((await admin('admin/staff', { ...grant, reason: '' })).data.error, 'staffReasonRequired');
  assert.equal((await admin('admin/staff', grant)).status, 200);
  assert.equal((await admin('admin/staff', { ...editorCredentials, role: contentRole })).status, 200);
  const identity = await publisher('admin/login', publisherCredentials);
  assert.equal(identity.data.brandId, 'sandbox');
  assert.deepEqual(identity.data.permissions, { publishWebsite: true, publishCatalogue: true, viewAudit: true, managePlayerAccess: false });
  assert.equal((await draftEditor('admin/login', editorCredentials)).status, 200);
  assert.equal((await draftEditor('admin/audit')).status, 403);

  const db = new DatabaseSync(database, { timeout: 5000 });
  t.after(() => db.close());
  db.prepare("INSERT INTO tenants VALUES ('other', 'other', 'Another Brand', 'active', ?)").run(Date.now());
  db.prepare("UPDATE tenant_domains SET tenant_id = 'other' WHERE host = 'localhost'").run();
  db.prepare("INSERT INTO tenant_staff_memberships(tenant_id, staff_id, role, status, created_at) VALUES ('other', ?, ?, 'active', ?)")
    .run(identity.data.id, contentRole, Date.now());
  const otherIdentity = await anotherBrand('admin/login', publisherCredentials, 'localhost');
  assert.equal(otherIdentity.data.brandId, 'other');
  assert.equal(otherIdentity.data.permissions.viewAudit, false);
  assert.equal((await publisher('admin/audit', undefined, 'localhost')).status, 401);
  assert.equal((await anotherBrand('admin/audit', undefined, 'localhost')).status, 403);

  const title = await draftEditor('admin/coming-soon', {
    action: 'save', version: 0, category: 'table', titleEn: 'Oak Trail', titleFr: 'Sentier du chêne',
    artwork: '', studio: '', descriptionEn: '', descriptionFr: '', altEn: '', altFr: '', featuredRank: 0
  });
  assert.equal(title.status, 200);
  const { slug, version } = title.data.title;
  const publishTitle = { action: 'publish', slug, version };
  assert.equal((await draftEditor('admin/coming-soon', publishTitle)).status, 403);
  assert.equal((await anotherBrand('admin/coming-soon', publishTitle, 'localhost')).status, 403);
  const publicationHeaders = { 'X-Request-ID': randomUUID() };
  const [published, duplicate] = await Promise.all([
    publisher('admin/coming-soon', publishTitle, undefined, publicationHeaders),
    publisher('admin/coming-soon', { version, slug, action: 'publish' }, undefined, publicationHeaders)
  ]);
  assert.equal(published.status, 200);
  assert.deepEqual(duplicate.data, published.data);
  assert.equal((await publisher('admin/coming-soon', { ...publishTitle, action: 'archive' }, undefined, publicationHeaders)).data.error, 'staffRequestConflict');
  const notes = (await publisher('admin/audit')).data.events;
  assert.equal(notes.length, 1);
  assert.equal(notes[0].id, published.data.auditId);
  assert.equal(notes[0].actorId, identity.data.id);
  assert.equal(notes[0].actor, publisherCredentials.email);
  assert.equal(notes[0].brandId, 'sandbox');
  assert.equal(notes[0].correlationId, publicationHeaders['X-Request-ID']);
  assert.equal(notes[0].details.revision, published.data.title.version);
  assert.equal(notes[0].details.previousStatus, 'draft');
  assert.equal(notes[0].details.status, 'published');
  assert.ok(notes[0].details.fields.includes('titleFr'));
  assert.equal((await publicClient('coming-soon/' + slug)).status, 200);

  const initial = (await draftEditor('admin/config')).data;
  const config = {
    ...initial.config, brandName: 'A01 Demo', announcementFr: 'Bienvenue', displayMarket: 'CA-QC',
    enabledLocales: ['fr-CA'], primaryLocale: 'fr-CA', reportingTimeZone: 'America/Toronto',
    enabledSections: { comingSoon: false, faq: false }
  };
  assert.equal((await draftEditor('admin/config', { config: { ...config, reportingTimeZone: '+02:00' }, version: initial.version })).status, 400);
  const draft = await draftEditor('admin/config', { config, version: initial.version });
  assert.equal(draft.status, 200);
  assert.equal((await publicClient('tenant')).data.config.enabledSections.comingSoon, true);
  assert.equal((await draftEditor('admin/config/publish', { version: draft.data.version })).status, 403);
  assert.equal((await publisher('admin/config/publish', { version: initial.version })).data.error, 'configConflict');
  assert.equal((await anotherBrand('admin/config/publish', { version: draft.data.version }, 'localhost')).status, 403);
  assert.equal((await publicClient('tenant', undefined, 'localhost')).data.config.brandName, 'Another Brand');

  // A failed audit write must roll back both the publication and its brand name.
  db.exec(`CREATE TRIGGER reject_demo_publish BEFORE INSERT ON staff_events
    WHEN NEW.action = 'tenant_config_published' BEGIN SELECT RAISE(ABORT, 'test audit rollback'); END`);
  const settingsHeaders = { 'X-Request-ID': randomUUID() };
  const publishSettings = { version: draft.data.version };
  assert.equal((await publisher('admin/config/publish', publishSettings, undefined, settingsHeaders)).status, 500);
  assert.equal((await publicClient('tenant')).data.config.brandName, initial.config.brandName);
  assert.equal((await publisher('admin/config')).data.status, 'draft');
  db.exec('DROP TRIGGER reject_demo_publish');
  const liveSettings = await publisher('admin/config/publish', publishSettings, undefined, settingsHeaders);
  assert.equal(liveSettings.status, 200);
  assert.deepEqual((await publisher('admin/config/publish', publishSettings, undefined, settingsHeaders)).data, liveSettings.data);
  assert.deepEqual((await publicClient('tenant')).data.config, config);
  assert.deepEqual((await publicClient('coming-soon')).data.titles, []);
  assert.equal((await publicClient('coming-soon/' + slug)).status, 404);
  assert.equal((await fetch(base + '/casinohabibi/coming-soon/' + slug)).status, 404);

  const role = { email: publisherCredentials.email, role: contentRole, publishWebsite: false, publishCatalogue: false, reason: 'Temporary coverage ended' };
  const accessHeaders = { 'X-Request-ID': randomUUID() };
  const revoked = await admin('admin/staff/role', role, undefined, accessHeaders);
  assert.equal(revoked.status, 200);
  assert.deepEqual((await admin('admin/staff/role', role, undefined, accessHeaders)).data, revoked.data);
  assert.equal((await publisher('admin/session')).data.permissions.publishWebsite, false);
  assert.equal((await publisher('admin/config/publish', publishSettings, undefined, settingsHeaders)).status, 403);
  assert.equal((await publisher('admin/audit')).status, 403);

  await register(player);
  const ticket = (await player('support', { category: 'account', message: 'Can you review my demo account?' })).data;
  const { updatedAt } = (await admin('admin/support')).data.tickets.find(({ id }) => id === ticket.id);
  const supportHeaders = { 'X-Request-ID': randomUUID() };
  const privateNote = 'This example belongs in the support case.';
  const note = { ticketId: ticket.id, expectedUpdatedAt: updatedAt, note: privateNote };
  const savedNote = await admin('admin/support/note', note, undefined, supportHeaders);
  assert.equal(savedNote.status, 200);
  assert.deepEqual((await admin('admin/support/note', note, undefined, supportHeaders)).data, savedNote.data);
  const events = (await admin('admin/audit')).data.events;
  for (const id of [published.data.auditId, liveSettings.data.auditId, revoked.data.auditId, savedNote.data.auditId]) {
    assert.equal(events.filter((event) => event.id === id).length, 1);
  }
  assert.equal(events.find((event) => event.id === revoked.data.auditId).details.reason, role.reason);
  assert.deepEqual(events.find((event) => event.id === savedNote.data.auditId).details.fields, ['privateNote']);
  assert.ok(!JSON.stringify(events).includes(privateNote));
  assert.ok(!JSON.stringify(events).includes(publisherCredentials.password));
  assert.equal((await admin('admin/support')).data.tickets[0].notes.length, 1);
});

test('existing memberships retain their original staff publication rights and audit history', async (t) => {
  const { base } = await startSandbox(t, { initializeDatabase(db) {
    db.exec(`
      CREATE TABLE tenants (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE staff_accounts (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, mfa_secret TEXT, mfa_enabled INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE tenant_staff_memberships (tenant_id TEXT NOT NULL REFERENCES tenants(id), staff_id INTEGER NOT NULL REFERENCES staff_accounts(id), role TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(tenant_id, staff_id));
      CREATE TABLE staff_events (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), actor_id INTEGER NOT NULL REFERENCES staff_accounts(id), action TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL, correlation_id TEXT);
      INSERT INTO tenants VALUES ('sandbox', 'sandbox', 'Legacy Demo', 'active', 1);
      INSERT INTO staff_accounts(id, email, password_hash, created_at) VALUES (1, 'legacy-editor@example.test', 'unused-in-test', 1), (2, 'legacy-provider@example.test', 'unused-in-test', 1);
      INSERT INTO tenant_staff_memberships VALUES ('sandbox', 1, 'operator_content', 'active', 1), ('sandbox', 2, 'operator_provider', 'active', 1);
      INSERT INTO staff_events VALUES (1, 'sandbox', 1, 'tenant_config_published', '1', 1, NULL);
    `);
  } });
  const admin = client(base);
  assert.equal((await admin('admin/login', staffCredentials)).status, 200);
  const { data: members } = await admin('admin/staff');
  const editor = members.find((member) => member.role === 'operator_content');
  const provider = members.find((member) => member.role === 'operator_provider');
  assert.deepEqual([editor.publishWebsite, editor.publishCatalogue], [true, false]);
  assert.deepEqual([provider.publishWebsite, provider.publishCatalogue], [false, true]);
  const historical = (await admin('admin/audit')).data.events.find(({ id }) => id === 1);
  assert.equal(historical.actor, 'legacy-editor@example.test');
  assert.equal(historical.action, 'tenant_config_published');
  assert.deepEqual(historical.details, {});
});

test('local startup migrates a non-tenant ledger and preserves existing player preferences', async (t) => {
  const { base, database } = await startSandbox(t, { initializeDatabase(db) {
    db.exec(`
      CREATE TABLE players (
        id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        email_verified INTEGER NOT NULL, preferred_locale TEXT NOT NULL
      );
      INSERT INTO players VALUES (31, 'existing@example.test', 'fixture', 0, 'fr-CA');
      CREATE TABLE ledger (id INTEGER PRIMARY KEY, player INTEGER, game TEXT,
        wager INTEGER NOT NULL, amount INTEGER NOT NULL, request_id TEXT);
      INSERT INTO ledger VALUES (1, 31, NULL, 0, 10000, NULL);
    `);
  } });
  assert.equal((await fetch(base + '/readyz')).status, 200);
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const row = db.prepare('SELECT email_verified, preferred_locale, tenant_id FROM players WHERE id = 31').get();
    assert.deepEqual({ ...row }, { email_verified: 0, preferred_locale: 'fr-CA', tenant_id: 'sandbox' });
    assert.equal(db.prepare('SELECT amount FROM ledger WHERE player = 31 AND tenant_id = ?').get('sandbox').amount, 10000);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});

test('published routes work under a directory and behind a prefix-stripping proxy', async (t) => {
  const mount = '/casinohabibi';
  const host = 'demo.example.test';
  const { base, database } = await startSandbox(t, { appBasePath: `${mount}/`, sandboxTenantHosts: ' Demo.Example.test , www.demo.example.test ' });
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const aliases = db.prepare('SELECT host, tenant_id as tenant, verified FROM tenant_domains WHERE host IN (?, ?) ORDER BY host').all(host, `www.${host}`);
    assert.deepEqual(aliases.map(({ host, tenant, verified }) => [host, tenant, verified]), [[host, 'sandbox', 1], [`www.${host}`, 'sandbox', 1]]);
  } finally { db.close(); }
  const published = base + mount;
  const redirect = await fetch(`${published}?lang=fr`, { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), `${mount}/?lang=fr`);

  for (const prefix of [published, base]) {
    const admin = await fetch(prefix + '/admin');
    assert.equal(admin.status, 200);
    const body = await admin.text();
    assert.match(body, /data-app-base-path="\/casinohabibi"/);
    assert.match(body, /href="\/casinohabibi\/admin\.css"/);
    assert.match(body, /src="\/casinohabibi\/app\.js"/);
    assert.match(body, /id="admin-section-picker"/);
    assert.equal((await fetch(prefix + '/readyz')).status, 200);
  }

  const css = await fetch(published + '/style.css');
  assert.match(await css.text(), /url\('hero\.webp'\)/);
  assert.equal((await fetch(published + '/hero.webp')).status, 200);
  assert.equal((await fetch(published + '/admin-workspace.js')).status, 200);
  const cookieHasMount = (cookie) => cookie.includes(`; Path=${mount};`);
  const guestLobby = await fetch(published + '/api/coming-soon');
  assert.equal(guestLobby.status, 200);
  assert.ok(guestLobby.headers.getSetCookie().some(cookieHasMount));
  const staff = client(published);
  const staffSession = await staff('admin/login', staffCredentials);
  assert.equal(staffSession.status, 200);
  assert.ok(staffSession.setCookies.some(cookieHasMount));
  assert.equal((await staff('admin/overview')).status, 200);
  const staffLogout = await staff('admin/logout', {});
  assert.equal(staffLogout.status, 200);
  assert.ok(staffLogout.setCookies.some(cookieHasMount));
  const player = client(published);
  const registration = await player('signup', playerCredentials);
  assert.equal(registration.status, 200);
  const verification = new URL(registration.data.verifyUrl);
  assert.equal(verification.pathname, mount + '/');
  assert.equal((await player('email-verification/complete', { token: verification.searchParams.get('verify') })).status, 200);
  const playerSession = await player('login', playerCredentials);
  assert.equal(playerSession.status, 200);
  assert.ok(playerSession.setCookies.some(cookieHasMount));
  const playerLogout = await player('logout', {});
  assert.equal(playerLogout.status, 200);
  assert.ok(playerLogout.setCookies.some(cookieHasMount));
});

test('player access across devices, recovery delivery, brand isolation and revocable support grants', async (t) => {
  const { base, database, readMail } = await startSandbox(t, { appBasePath: '/casinohabibi', captureMail: true });
  const [desktop, phone, admin, support, otherBrand] = Array.from({ length: 5 }, () => client(base + '/casinohabibi'));
  await admin('admin/login', staffCredentials);
  const creds = { email: 'support@example.test', password: 'example-support-password' };
  const role = { email: creds.email, role: 'operator_support' };
  await admin('admin/staff', { ...role, password: creds.password });
  const supporter = (await support('admin/login', creds)).data;
  const signup = await desktop('signup', { ...playerCredentials, locale: 'fr-CA' });
  assert.equal(signup.status, 200);
  assert.equal(signup.data.verifyUrl, undefined);
  const tokenIn = (mail, key) => new URL(mail.text.match(/https:\/\/\S+$/)[0]).searchParams.get(key);
  const verification = (await readMail())[0];
  assert.match(verification.text, /https:\/\/localhost\/casinohabibi\//);
  await phone('email-verification/complete', { token: tokenIn(verification, 'verify') });
  const id = (await desktop('login', playerCredentials)).data.id;
  await phone('login', playerCredentials);
  const route = 'admin/players/' + id;
  assert.equal((await support('admin/players?q=player%40example')).data[0].id, id);
  assert.equal((await support(route)).data.activeSessions, 2);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  db.prepare("INSERT INTO tenants VALUES ('second', 'second', 'Second Brand', 'active', ?)").run(Date.now());
  db.prepare("UPDATE tenant_domains SET tenant_id = 'second' WHERE host = 'localhost'").run();
  db.prepare("INSERT INTO tenant_staff_memberships(tenant_id, staff_id, role, status, created_at) VALUES ('second', ?, ?, 'active', ?)").run(supporter.id, role.role, Date.now());
  await otherBrand('admin/login', creds, 'localhost');
  assert.deepEqual((await otherBrand('admin/players?q=player', undefined, 'localhost')).data, []);
  assert.equal((await otherBrand(route, undefined, 'localhost')).status, 404);

  const deliveryKey = { 'X-Request-ID': randomUUID() };
  const send = await support(route + '/recovery', {}, undefined, deliveryKey);
  assert.equal(send.data.delivery, 'sent');
  assert.deepEqual(Object.keys(send.data).sort(), ['auditId', 'delivery', 'id']);
  assert.deepEqual((await support(route + '/recovery', {}, undefined, deliveryKey)).data, send.data);
  const messages = await readMail();
  assert.equal(messages.length, 2);
  assert.deepEqual(messages[1].to, [playerCredentials.email]);
  assert.match(messages[1].subject, /mot de passe/);
  assert.ok(messages[1].key);
  const initialReset = tokenIn(messages[1], 'reset');
  const change = { status: 'suspended', version: 0, reason: 'Account owner requested a review' };
  assert.equal((await support(route + '/access', change)).status, 403);
  await admin('admin/staff/role', { ...role, managePlayerAccess: true, reason: 'Player access desk' });
  assert.equal((await support(route + '/access', { ...change, reason: ' ' })).status, 400);
  const headers = { 'X-Request-ID': randomUUID() };
  const suspension = await support(route + '/access', change, undefined, headers);
  assert.equal(suspension.status, 200);
  assert.deepEqual((await support(route + '/access', change, undefined, headers)).data, suspension.data);
  assert.equal((await desktop('account')).data, null);
  assert.equal((await phone('account')).data, null);
  assert.equal((await phone('login', playerCredentials)).data.error, 'playerSuspended');
  assert.equal((await support(route + '/recovery', {})).data.error, 'playerSuspended');
  assert.equal((await phone('password-reset/complete', { token: initialReset, password: 'replacement-password' })).data.error, 'passwordResetInvalid');
  assert.equal((await support(route + '/access', { ...change, status: 'active' })).status, 409);
  await admin('admin/staff/role', { ...role, managePlayerAccess: false, reason: 'End of shift' });
  assert.equal((await support(route + '/access', { ...change, version: 1, status: 'active' })).status, 403);
  await admin(route + '/access', { status: 'active', version: 1, reason: 'Review completed' });
  assert.equal((await desktop('account')).data, null);
  await desktop('login', playerCredentials);
  await phone('login', playerCredentials);
  const newPassword = { ...playerCredentials, password: 'replacement-password' };
  await support(route + '/recovery', {});
  const newReset = tokenIn((await readMail()).at(-1), 'reset');
  assert.equal((await desktop('password-reset/complete', { token: newReset, password: newPassword.password })).status, 200);
  assert.equal((await phone('account')).data, null);
  assert.equal((await phone('password-reset/complete', { token: newReset, password: newPassword.password })).status, 400);
  assert.equal((await phone('login', newPassword)).status, 200);
  const detail = (await admin(route)).data;
  assert.equal(detail.activeSessions, 1);
  assert.equal(detail.events.filter(({ action }) => action === 'player_suspended').length, 1);
  assert.equal(detail.events.find(({ action }) => action === 'player_restored').reason, 'Review completed');
  await phone('safety/exclude', {});
  await admin(route + '/access', { status: 'suspended', version: 2, reason: 'Review' });
  await admin(route + '/access', { status: 'active', version: 3, reason: 'Review complete' });
  assert.equal((await desktop('login', newPassword)).data.error, 'excluded');
});
