import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createSavedTitles } from '../lib/saved-titles.js';
import { reportPeriod } from '../lib/dashboard.js';
import { collectionKey, matchesCatalogue } from '../public/catalog.js';

const staffCredentials = { email: 'admin@example.test', password: 'example-staff-password' };
const playerCredentials = { email: 'player@example.test', password: 'example-test-password' };

async function startSandbox(t, { initializeDatabase, appBasePath = '', sandboxTenantHosts = '', captureMail = false,
  dataDirectory, encryptionKey = randomBytes(32).toString('hex'), onRequest } = {}) {
  const directory = dataDirectory || await mkdtemp(join(tmpdir(), 'northplay-test-'));
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
      await new Promise((resolve) => setTimeout(resolve, 40));
      appendFileSync(process.env.TEST_MAILBOX, JSON.stringify({ ...JSON.parse(options.body), key: options.headers['Idempotency-Key'] }) + '\\n');
      return new Response('{}', { status: 200 });
    };`);
  const server = spawn(process.execPath, [...(captureMail ? ['--import', preload] : []), 'server.js'], {
    env: {
      ...process.env, APP_ENV: 'development', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory,
      BOOTSTRAP_ADMIN_EMAIL: staffCredentials.email, BOOTSTRAP_ADMIN_PASSWORD: staffCredentials.password,
      PROVIDER_KEY_ENCRYPTION: encryptionKey, SECURE_COOKIES: '0',
      SANDBOX_TENANT_HOSTS: sandboxTenantHosts,
      APP_BASE_PATH: appBasePath, PUBLIC_BASE_URL: '', RESET_EMAIL_API_KEY: '', RESET_EMAIL_SENDMAIL: '', RESET_EMAIL_FROM: '', PLATFORM_ADMIN_TOKEN: '',
      ...(captureMail && { TEST_MAILBOX: mailbox, PUBLIC_BASE_URL: 'https://localhost' + appBasePath, RESET_EMAIL_API_KEY: 'fixture', RESET_EMAIL_FROM: 'test@example.test' })
    }
  });
  const errors = [];
  server.stderr.on('data', (data) => errors.push(data.toString()));
  const exited = once(server, 'exit');
  t.after(async () => {
    server.kill();
    await exited;
    if (!dataDirectory) await rm(directory, { recursive: true, force: true });
  });
  await Promise.race([
    once(server.stdout, 'data'),
    exited.then(([code]) => assert.fail(`Server exited with code ${code}\n${errors.join('')}`))
  ]);
  if (onRequest) {
    createInterface({ input: server.stdout }).on('line', (line) => {
      const entry = JSON.parse(line);
      if (entry.event === 'http_request') onRequest(entry);
    });
  } else server.stdout.resume();
  return { base: `http://127.0.0.1:${port}`, database, readMail: async () => (await readFile(mailbox, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)) };
}

function client(base, cookies = new Map()) {
  return async function request(path, payload, host, headers = {}, method = payload === undefined ? 'GET' : 'POST') {
    const origin = new URL(base);
    if (host) origin.hostname = host;
    const pathname = origin.pathname.replace(/\/$/, '');
    const response = await fetch(new URL(pathname + '/api/' + path, origin), {
      method,
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
  const attempts = await Promise.all(Array.from({ length: 2 }, () => support(route + '/recovery', {}, undefined, deliveryKey)));
  assert.ok(attempts.every((attempt) => attempt.status === 200 && ['sending', 'sent'].includes(attempt.data.delivery)));
  assert.equal(attempts[0].data.auditId, attempts[1].data.auditId);
  const send = attempts.find((attempt) => attempt.data.delivery === 'sent');
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

const cardDraft = (title, extra = {}) => ({
  action: 'save', version: 0, category: 'table', titleEn: title, titleFr: title + ' FR', studio: '',
  descriptionEn: '', descriptionFr: '', artwork: '', altEn: '', altFr: '', featuredRank: 0, ...extra
});

test('protected catalogue previews and published market and language restrictions', async (t) => {
  const { base, database } = await startSandbox(t, { appBasePath: '/casinohabibi' });
  const staff = client(base + '/casinohabibi');
  const guest = client(base + '/casinohabibi');
  await staff('admin/login', staffCredentials);
  const art = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lXB8WAAAAABJRU5ErkJggg==';
  const editor = cardDraft('Orchard', { artwork: art, altEn: 'Apple tree', altFr: 'Pommier', displayMarket: 'CA', locales: ['fr-CA'] });
  for (const invalid of [{ altFr: '' }, { locales: [] }, { locales: ['es'] }, { displayMarket: '123' }]) {
    assert.equal((await staff('admin/coming-soon', { ...editor, ...invalid })).status, 400);
  }
  const saved = (await staff('admin/coming-soon', editor)).data;
  assert.ok(saved.auditId);
  assert.equal(saved.title.revision, 1);
  assert.equal(saved.title.previewUrl, '/casinohabibi/admin?preview=orchard#coming-soon-admin');
  const preview = 'admin/coming-soon/preview/orchard';
  assert.equal((await guest(preview)).status, 401);
  assert.equal((await staff(preview)).data.altFr, 'Pommier');
  assert.equal((await guest('coming-soon/orchard?locale=fr-CA')).status, 404);
  const published = (await staff('admin/coming-soon', { action: 'publish', version: 1, slug: 'orchard' })).data;
  assert.equal(published.title.revision, 2);
  assert.equal((await guest('coming-soon?locale=fr-CA')).data.titles.length, 0);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  db.prepare("UPDATE tenant_config_versions SET config = json_set(config, '$.displayMarket', 'CA-QC') WHERE tenant_id = 'sandbox' AND status = 'published'").run();
  assert.equal((await guest('coming-soon?locale=fr-CA')).data.titles.length, 1);
  assert.equal((await guest('coming-soon?locale=en-CA')).data.titles.length, 0);
  assert.equal((await guest('coming-soon/orchard?locale=en-CA')).status, 404);
  const live = (await guest('coming-soon/orchard?locale=fr-CA')).data;
  assert.equal(live.altFr, 'Pommier');
  const edited = await staff('admin/coming-soon', { ...editor, titleFr: 'Nouveau titre', version: 2, slug: 'orchard' });
  assert.equal(edited.status, 200);
  assert.equal((await staff(preview)).data.titleFr, 'Nouveau titre');
  assert.equal((await guest('coming-soon/orchard?locale=fr-CA')).data.titleFr, live.titleFr);
  assert.equal((await staff('admin/coming-soon', { action: 'publish', slug: 'orchard', version: 2 })).status, 409);
});

test('catalogue search matches bilingual titles, categories, studios and collections across terms', () => {
  const labels = ['Winter Garden', 'Jardin d’hiver', 'Écho Montréal', 'Railway', 'Les chemins de fer'];
  assert.ok(matchesCatalogue('hiver montreal', labels, 'table'));
  assert.ok(matchesCatalogue('jeux table fer', labels, 'table'));
  assert.ok(matchesCatalogue('Table games', labels, 'table'));
  assert.ok(matchesCatalogue('machines a sous', [], 'slots'));
  assert.ok(!matchesCatalogue('roulette', labels, 'table'));
  assert.ok(!matchesCatalogue('???', labels, 'table'));
  assert.equal(collectionKey({ collectionEn: 'Café Express', collectionFr: 'Train-café' }), 'cafe express');
  assert.equal(collectionKey({ collectionFr: 'Rétro été' }), 'retro ete');
});

test('the catalogue index pages compact staff records while public collections follow published revisions and eligibility', async (t) => {
  const { base, database } = await startSandbox(t);
  const staff = client(base), guest = client(base), editor = client(base);
  await staff('admin/login', staffCredentials);
  const credentials = { email: 'catalogue-editor@example.test', password: 'example-editor-password' };
  await staff('admin/staff', { ...credentials, role: 'operator_content' });
  await editor('admin/login', credentials);
  const path = 'admin/coming-soon', index = path + '/index';
  assert.equal((await guest(index)).status, 401);
  const titles = [];
  for (let n = 1; n <= 10; n++) {
    const data = cardDraft('Garden ' + n, { studio: 'Écho Montréal', category: 'table', collectionEn: 'Midnight', collectionFr: 'Après minuit' });
    const { title } = (await editor(path, data)).data;
    titles.push(title);
  }
  const first = (await editor(index)).data, last = (await editor(index + '?page=2')).data;
  assert.deepEqual([first.total, first.page, first.items.length, last.items.length], [10, 1, 8, 2]);
  assert.equal(new Set([...first.items, ...last.items].map((r) => r.id)).size, 10);
  for (const field of ['artwork', 'descriptionEn', 'draft', 'published']) assert.ok(!Object.hasOwn(first.items[0], field));
  assert.equal((await editor(index + '?page=999')).data.page, 2);
  for (const invalid of ['page=0', 'page=-1', 'page=1e1', 'category=unknown', 'state=unknown', 'q=' + 'x'.repeat(121)])
    assert.equal((await editor(index + '?' + invalid)).status, 400);
  assert.equal((await editor(index + '?q=montreal+minuit+jeux&category=table&state=draft')).data.total, 10);
  assert.equal((await editor(index + '?q=missing')).data.total, 0);
  const active = titles[0], other = titles[1];
  const command = (actor, action, title) => actor(path, { action, slug: title.slug, version: title.version });
  assert.equal((await command(editor, 'publish', active)).status, 403);
  const firstLive = (await command(staff, 'publish', active)).data.title;
  const put = (title, extra) => staff(path, { ...cardDraft(title.titleEn), slug: title.slug, version: title.version, ...extra });
  const draftChanged = (await put(firstLive, { collectionEn: 'Station', collectionFr: 'La gare' })).data.title;
  assert.equal((await editor(index + '?q=gare&state=changed')).data.items[0].id, active.id);
  assert.equal((await editor(index + '?state=published')).data.total, 1);
  assert.deepEqual((await guest('coming-soon?locale=fr-CA')).data.titles.map((r) => r.collectionFr), ['Après minuit']);
  const legacyEdit = (await put(draftChanged, {})).data.title;
  assert.equal(legacyEdit.collectionFr, 'La gare');
  const newLive = (await command(staff, 'publish', legacyEdit)).data.title;
  assert.equal((await guest('coming-soon/' + active.slug + '?locale=fr-CA')).data.collectionFr, 'La gare');
  let restricted = (await put(other, { locales: ['fr-CA'], displayMarket: 'MX', collectionEn: '', collectionFr: 'Voyages' })).data.title;
  restricted = (await command(staff, 'publish', restricted)).data.title;
  assert.ok(!(await guest('coming-soon?locale=fr-CA')).data.titles.some((r) => r.id === restricted.id));
  const missing = (await put(titles[2], { collectionEn: 'Hidden', collectionFr: '' })).data.title;
  assert.equal((await command(staff, 'publish', missing)).data.error, 'comingSoonCollectionTranslation');
  assert.equal((await put(titles[3], { collectionEn: '!!!' })).status, 400);
  assert.equal((await command(staff, 'archive', newLive)).status, 200);
  assert.equal((await guest('coming-soon?locale=fr-CA')).data.titles.length, 0);
  assert.equal((await editor(index + '?state=archived')).data.items[0].id, active.id);
  const db = new DatabaseSync(database);
  try {
    db.exec("UPDATE tenant_config_versions SET config=json_set(config,'$.displayMarket','MX') WHERE tenant_id='sandbox' AND status='published'");
    assert.equal((await guest('coming-soon?locale=fr-CA')).data.titles[0].collectionFr, 'Voyages');
    assert.equal((await guest('coming-soon?locale=en-CA')).data.titles.length, 0);
    db.exec("INSERT INTO tenants VALUES('other','other','Other Brand','active',1); UPDATE tenant_domains SET tenant_id='other' WHERE host='localhost'");
    assert.equal((await editor(index, undefined, 'localhost')).status, 401);
  } finally { db.close(); }
});

test('Discover preserves surviving positions, fills vacancies and rotates expired visits', async (t) => {
  const { base, database } = await startSandbox(t);
  const staff = client(base);
  const guest = client(base);
  const player = client(base);
  await staff('admin/login', staffCredentials);
  const empty = (await guest('coming-soon')).data;
  assert.equal(empty.collectionSize, 'empty');
  const publish = async (draft) => {
    const saved = (await staff('admin/coming-soon', draft)).data.title;
    return (await staff('admin/coming-soon', { action: 'publish', version: saved.version, slug: saved.slug })).data.title;
  };
  for (let index = 1; index <= 8; index++) {
    await publish(cardDraft('Preview ' + index, { featuredRank: index }));
    if (index === 5) {
      const small = (await guest('coming-soon')).data;
      assert.equal(small.collectionSize, 'small');
      assert.equal(small.discover.length, 5);
    }
  }
  const full = (await guest('coming-soon')).data;
  assert.equal(full.eligibleCount, 8);
  assert.equal(full.collectionSize, 'full');
  assert.equal(full.visitId, empty.visitId);
  assert.equal(new Set(full.discover).size, 6);
  await publish(cardDraft('Preview 1', { slug: 'preview-1', version: 2, featuredRank: 9 }));
  const reordered = (await guest('coming-soon')).data;
  assert.equal(reordered.featured.at(-1), 'preview-1');
  assert.deepEqual(reordered.discover, full.discover);
  const index = 2;
  const slug = full.discover[index];
  const draft = (await staff('admin/coming-soon/preview/' + slug)).data;
  await staff('admin/coming-soon', { action: 'archive', slug, version: draft.version });
  const after = (await guest('coming-soon')).data;
  assert.equal(after.discover.length, 6);
  assert.ok(!full.discover.includes(after.discover[index]));
  assert.deepEqual(after.discover.filter((_, i) => i !== index), full.discover.filter((_, i) => i !== index));
  await register(player);
  const sample = (await player('coming-soon')).data;
  assert.notEqual(sample.visitId, full.visitId);
  const first = sample.titles[0];
  await player('account/favorite', { key: first.favoriteKey, saved: true });
  assert.equal((await player('coming-soon')).data.titles.find(({ id }) => id === first.id).saved, true);
  assert.ok((await guest('coming-soon')).data.titles.every((title) => title.visible && !title.saved));
  const db = new DatabaseSync(database);
  try { db.prepare('UPDATE coming_soon_visits SET expires = 0 WHERE visit_id = ?').run(full.visitId); } finally { db.close(); }
  const fresh = (await guest('coming-soon')).data;
  assert.notEqual(fresh.visitId, full.visitId);
  assert.equal(new Set(fresh.discover).size, 6);
});

test('saved shelves and support activity retain actual changes, historical references and retry identity', async (t) => {
  const { base } = await startSandbox(t);
  const [staff, phone, laptop, visitor] = Array.from({ length: 4 }, () => client(base));
  await staff('admin/login', staffCredentials);
  const card = (await staff('admin/coming-soon', cardDraft('Paper Moon'))).data.title;
  await staff('admin/coming-soon', { action: 'publish', version: card.version, slug: card.slug });
  const shelf = 'me/saved/' + card.id;
  const key = 'coming-soon:' + card.id;
  const put = (client, headers = {}) => client(shelf, undefined, undefined, headers, 'PUT');
  const remove = () => laptop(shelf, undefined, undefined, {}, 'DELETE');
  assert.equal((await put(visitor)).status, 401);
  await register(phone);
  const playerId = (await laptop('login', playerCredentials)).data.id;
  const header = { 'X-Request-ID': randomUUID() };
  const [first, repeat] = await Promise.all([put(phone, header), put(laptop)]);
  assert.equal(first.status, 200);
  assert.deepEqual(first.data, repeat.data);
  assert.ok(first.data.activityId);
  const [title] = (await laptop('me/saved')).data.titles;
  assert.equal(title.activityId, first.data.activityId);
  assert.equal(title.saved, true);
  assert.equal((await phone('me/saved')).data.titles.length, 1);
  const one = (await staff('admin/players/' + playerId)).data.savedActivity.entries;
  assert.deepEqual(one.map(({ id }) => id), [first.data.activityId]);
  const deleted = await remove();
  assert.equal(deleted.data.saved, false);
  assert.notEqual(deleted.data.activityId, first.data.activityId);
  assert.deepEqual((await remove()).data, deleted.data);
  const lateRetry = await put(phone, header);
  assert.equal(lateRetry.data.activityId, first.data.activityId);
  assert.equal(lateRetry.data.saved, false);
  assert.equal((await phone('me/saved')).data.titles.length, 0);
  const savedAgain = await phone('account/favorite', { key, saved: true });
  assert.notEqual(savedAgain.data.activityId, first.data.activityId);
  await phone('account/favorites', { favorites: [] });
  await laptop('account/favorites', { favorites: [key, key], merge: true });
  const history = (await staff('admin/players/' + playerId)).data.savedActivity.entries;
  assert.deepEqual(history.map(({ action }) => action), ['save', 'remove', 'save', 'remove', 'save']);
  assert.ok(history.every((entry) => entry.saveId === title.saveId));
  assert.deepEqual((await staff('admin/players?q=activity-' + deleted.data.activityId)).data.map(({ id }) => id), [playerId]);
  const byReference = (await staff('admin/players/' + playerId + '?activity=' + deleted.data.activityId)).data.savedActivity.entries;
  assert.deepEqual(byReference.map(({ id }) => id), [deleted.data.activityId]);
  assert.equal((await staff('admin/coming-soon/saves?q=activity-' + first.data.activityId)).data[0].id, title.saveId);
  assert.equal((await staff('admin/coming-soon/saves?q=player-' + playerId)).data.length, 1);
  await staff('admin/coming-soon', { action: 'archive', version: 2, slug: card.slug });
  assert.equal((await laptop('me/saved')).data.titles.length, 0);
  assert.equal((await put(laptop)).status, 404);
  const remaining = (await phone('account/export')).data.previewSaveActivity;
  assert.deepEqual(remaining.map(({ id }) => id), history.map(({ id }) => id));
  assert.ok(remaining.every(({ state }) => state === 'archived'));
  for (let i = 1; i <= 10; i++) {
    const { title } = (await staff('admin/coming-soon', cardDraft('Page ' + i))).data;
    await staff('admin/coming-soon', { action: 'publish', version: title.version, slug: title.slug });
    await phone('me/saved/' + title.id, undefined, undefined, {}, 'PUT');
  }
  const page1 = (await staff('admin/coming-soon/saves?limit=10')).data;
  const page2 = (await staff('admin/coming-soon/saves?limit=10&before=' + page1.at(-1).id)).data;
  assert.equal(page1.length, 10);
  assert.deepEqual(page2.map(({ id }) => id), [title.saveId]);
  assert.equal((await staff('admin/coming-soon/saves?before=-1')).status, 400);
});

test('existing first saves migrate once with original dates and references', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE players(id INTEGER PRIMARY KEY);
      CREATE TABLE coming_soon_titles(tenant_id TEXT, id INTEGER, PRIMARY KEY(tenant_id, id));
      CREATE TABLE player_favorites(player_id INTEGER, tenant_id TEXT, favorite_key TEXT, created_at INTEGER, PRIMARY KEY(player_id, tenant_id, favorite_key));
      CREATE TABLE coming_soon_saves(id INTEGER PRIMARY KEY, tenant_id TEXT, player_id INTEGER, title_id INTEGER, created_at INTEGER, UNIQUE(tenant_id, player_id, title_id));
      INSERT INTO coming_soon_saves VALUES(43, 'sandbox', 9, 7, 1000);`);
    const transaction = (work) => { db.exec('BEGIN IMMEDIATE'); try { work(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } };
    for (let i = 0; i < 2; i++) createSavedTitles(db, { transaction, fail: assert.fail });
    assert.deepEqual(db.prepare('SELECT save_id, action, created_at FROM coming_soon_activity').all().map((row) => ({ ...row })),
      [{ save_id: 43, action: 'save', created_at: 1000 }]);
  } finally { db.close(); }
});

test('dashboard dates follow the brand calendar through both daylight-saving transitions', () => {
  function period(from, to = from) {
    return reportPeriod(new URLSearchParams({ from, to }), 'America/Toronto', Date.UTC(2025, 0, 3), () => { throw new Error('invalid dates'); });
  }
  const spring = period('2024-03-10');
  assert.equal(spring.start, Date.parse('2024-03-10T05:00:00Z'));
  assert.equal(spring.end - spring.start, 23 * 3_600_000);
  const fall = period('2024-11-03');
  assert.equal(fall.start, Date.parse('2024-11-03T04:00:00Z'));
  assert.equal(fall.end - fall.start, 25 * 3_600_000);
  assert.equal(period('2024-01-01', '2024-12-31').days, 366);
  for (const dates of [['2024-02-30'], ['2025-02-01'], ['2024-05-02','2024-05-01'], ['2024-01-01','2025-01-01']]) {
    assert.throws(() => period(...dates), /invalid dates/);
  }
});

test('dashboard totals match paged records, honour roles, and isolate catalogue eligibility, test data and history', async (t) => {
  const { base, database } = await startSandbox(t);
  const [staff, editor, phone, laptop, guest] = Array.from({ length: 5 }, () => client(base));
  await staff('admin/login', staffCredentials);
  const credentials = { email: 'dashboard-editor@example.test', password: 'example-editor-password' };
  await staff('admin/staff', { ...credentials, role: 'operator_content' });
  await editor('admin/login', credentials);
  assert.equal((await guest('admin/overview')).status, 401);
  await guest('coming-soon');
  assert.deepEqual((await staff('admin/overview')).data.totals, { signups: 0, active: 0, saves: 0, published: 0 });
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  const config = (jsonPath, value) => db.prepare("UPDATE tenant_config_versions SET config = json_set(config, ?, json(?)) WHERE tenant_id = 'sandbox' AND status = 'published'").run(jsonPath, JSON.stringify(value));
  config('$.reportingTimeZone', 'America/Toronto');
  config('$.displayMarket', 'CA-QC');
  const create = async (name, extra) => {
    const draft = (await staff('admin/coming-soon', cardDraft(name, extra))).data.title;
    return (await staff('admin/coming-soon', { action: 'publish', slug: draft.slug, version: draft.version })).data.title;
  };
  const first = await create('Orchard', { displayMarket: 'CA', locales: ['fr-CA'] });
  await create('Unlisted in Quebec', { displayMarket: 'MX' });
  await staff('admin/coming-soon', cardDraft('Draft only'));
  await register(phone);
  const playerId = (await laptop('login', playerCredentials)).data.id;
  await phone('account');
  await laptop('coming-soon');
  const change = (device, method) => device('me/saved/' + first.id + '?locale=fr-CA', undefined, undefined, {}, method);
  const firstSave = (await change(phone, 'PUT')).data;
  await change(laptop, 'DELETE');
  await change(laptop, 'PUT');
  await phone('logout', {});
  await laptop('logout', {});
  const firstVerification = db.prepare('SELECT first_verified_at FROM players WHERE id = ?').get(playerId).first_verified_at;
  db.prepare('UPDATE players SET email_verified = 0 WHERE id = ?').run(playerId);
  db.prepare('UPDATE players SET email_verified = 1 WHERE id = ?').run(playerId);
  assert.equal(db.prepare('SELECT first_verified_at FROM players WHERE id = ?').get(playerId).first_verified_at, firstVerification);
  const summary = (await staff('admin/overview?days=7')).data;
  assert.deepEqual(summary.totals, { signups: 1, active: 1, saves: 1, published: 1 });
  assert.deepEqual((await editor('admin/overview?days=7')).data.totals, summary.totals);
  assert.equal(summary.reportingTimeZone, 'America/Toronto');
  assert.equal(summary.brands.length, 1);
  const qs = new URLSearchParams({ brand: summary.brandId, scope: summary.scope, from: summary.from, to: summary.to,
    asOf: summary.generatedAt, stamp: summary.catalogueStamp, zone: summary.reportingTimeZone });
  const list = (who, metric, more = '') => who('admin/overview/records?' + qs + '&metric=' + metric + more);
  for (const [metric, total] of Object.entries(summary.totals)) {
    const result = (await list(staff, metric)).data;
    assert.equal(result.total, total);
    assert.equal(result.entries.length, total);
    const row = result.entries[0];
    if (metric === 'published') {
      assert.equal(row.slug, first.slug);
      assert.deepEqual(row.locales, ['fr-CA']);
      assert.ok(row.at > 0);
    } else {
      assert.equal(row.playerId, playerId);
      if (metric === 'saves') assert.equal(row.activityId, firstSave.activityId);
    }
    assert.equal((await list(editor, metric)).status, metric === 'published' ? 200 : 403);
  }
  assert.equal((await staff('admin/overview?brand=other')).status, 403);
  assert.equal((await staff('admin/overview/records?metric=active&brand=other')).status, 403);
  assert.equal((await staff('admin/overview?days=1')).status, 400);
  assert.equal((await staff('admin/overview?days=7&from=2024-08-13&to=2024-08-23')).status, 400);
  assert.equal((await list(staff, 'saves', '&before=-1')).status, 400);
  assert.equal((await list(guest, 'active')).status, 401);
  await staff('admin/coming-soon', { action: 'archive', slug: first.slug, version: first.version });
  assert.equal((await list(staff, 'published')).status, 409);
  const afterArchive = (await staff('admin/overview')).data;
  assert.equal(afterArchive.totals.published, 0);
  assert.equal(afterArchive.totals.saves, 1);
  await create('Enabled language', { locales: ['en-CA'] });
  config('$.enabledLocales', ['fr-CA']);
  assert.equal((await staff('admin/overview')).data.totals.published, 0);
  config('$.enabledLocales', ['en-CA','fr-CA']);
  config('$.enabledSections.comingSoon', false);
  assert.equal((await staff('admin/overview')).data.totals.published, 0);
  config('$.reportingTimeZone', 'UTC');
  assert.equal((await list(staff, 'active')).status, 409);
  config('$.reportingTimeZone', 'America/Toronto');
  const insert = db.prepare("INSERT INTO players (email,password,tenant_id,email_verified,report_fixture,first_verified_at) VALUES (?,'unused','sandbox',1,?,?)");
  insert.run('example-showcase@example.invalid', 1, summary.generatedAt);
  insert.run('unknown-date@example.invalid', 0, null);
  const next = (await staff('admin/overview?scope=test')).data;
  assert.equal(next.totals.signups, 1);
  assert.equal(next.playerAccounts, 1);
  const site = (await staff('admin/overview')).data;
  assert.equal(site.scope, 'site');
  assert.equal(site.undatedVerified, 1);
  assert.equal(site.verifiedAccounts, 2);
  assert.equal(site.totals.signups, 1);
  const midnight = Date.parse('2024-03-10T05:00:00Z');
  for (let n = 0; n < 12; n++) insert.run('range-' + n + '@example.invalid', 0, midnight + n);
  insert.run('before-day@example.invalid', 0, midnight - 1);
  insert.run('after-day@example.invalid', 0, Date.parse('2024-03-11T04:00:00Z'));
  const range = 'from=2024-03-10&to=2024-03-10';
  assert.equal((await staff('admin/overview?' + range)).data.totals.signups, 12);
  const detail = 'admin/overview/records?metric=signups&' + range;
  const page1 = (await staff(detail)).data;
  const page2 = (await staff(detail + '&before=' + page1.nextCursor)).data;
  assert.equal(page1.entries.length, 10);
  assert.equal(page2.entries.length, 2);
  assert.equal(page2.nextCursor, null);
  assert.equal(page1.total, 12);
  assert.equal(new Set([...page1.entries, ...page2.entries].map((entry) => entry.id)).size, 12);
});

test('a seeded test brand goes from five to six previews and a second authorized brand keeps its own report', async (t) => {
  const { base, database } = await startSandbox(t);
  const staff = client(base), other = client(base), player = client(base);
  await staff('admin/login', staffCredentials);
  execFileSync(process.execPath, ['scripts/demo-seed.js'], { env: { ...process.env, APP_ENV: 'development', DATA_DIR: dirname(database) } });
  const overview = async (scope = '') => (await staff('admin/overview?days=90' + (scope ? '&scope=' + scope : ''))).data;
  const initial = await overview();
  assert.equal(initial.scope, 'test');
  assert.deepEqual(initial.totals, { signups: 8, active: 8, saves: 0, published: 0 });
  for (let i = 1; i <= 6; i++) {
    const { title } = (await staff('admin/coming-soon', cardDraft('Test card ' + i))).data;
    await staff('admin/coming-soon', { action: 'publish', slug: title.slug, version: title.version });
    assert.equal((await overview()).totals.published, i);
  }
  await register(player);
  const publicCards = (await player('coming-soon')).data.titles;
  await player('me/saved/' + publicCards[0].id, undefined, undefined, {}, 'PUT');
  await player('me/saved/' + publicCards[0].id, undefined, undefined, {}, 'PUT');
  assert.deepEqual((await overview()).totals, { signups: 9, active: 9, saves: 1, published: 6 });
  assert.deepEqual((await overview('site')).totals, { signups: 0, active: 0, saves: 0, published: 0 });
  assert.equal((await staff('admin/overview/records?scope=test&metric=published')).data.entries.length, 6);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  db.exec(`INSERT INTO tenants(id,slug,name,status,created_at) VALUES ('second','second','Internal Tenant Two','active',1);
    UPDATE tenant_domains SET tenant_id = 'second' WHERE host = 'localhost';
    INSERT INTO tenant_config_versions(tenant_id,version,config,status,created_at)
      SELECT 'second',version,json_set(config,'$.brandName','Second Brand'),'published',created_at FROM tenant_config_versions WHERE status = 'published' AND tenant_id = 'sandbox' ORDER BY version DESC LIMIT 1;
    INSERT INTO tenant_staff_memberships(tenant_id,staff_id,role,status,created_at)
      SELECT 'second',staff_id,'operator_support','active',1 FROM tenant_staff_memberships WHERE tenant_id = 'sandbox';`);
  assert.ok((await overview()).brands.some((brand) => brand.id === 'second' && brand.name === 'Second Brand' && brand.host === 'localhost'));
  assert.equal((await staff('admin/overview', undefined, 'localhost')).status, 401);
  assert.equal((await other('admin/login', staffCredentials, 'localhost')).status, 200);
  const second = (await other('admin/overview', undefined, 'localhost')).data;
  assert.equal(second.brandId, 'second');
  assert.deepEqual(second.totals, { signups: 0, active: 0, saves: 0, published: 0 });
  db.exec("UPDATE tenant_staff_memberships SET status = 'disabled' WHERE tenant_id = 'second'");
  assert.equal((await overview()).brands.length, 1);
  assert.equal((await other('admin/overview', undefined, 'localhost')).status, 401);
});

test('website content keeps drafts private, publishes single bilingual revisions, and resolves live destinations by brand and language', async (t) => {
  const mount = '/casinohabibi';
  const { base, database } = await startSandbox(t, { appBasePath: mount });
  const [staff, editor, guest] = Array.from({ length: 3 }, () => client(base + mount));
  await staff('admin/login', staffCredentials);
  const editorLogin = { email: 'site-editor@example.test', password: 'example-editor-password' };
  await staff('admin/staff', { ...editorLogin, role: 'operator_content' });
  await editor('admin/login', editorLogin);
  const endpoint = 'admin/website-content';
  const content = (en, fr, extra = {}) => ({
    titleEn: en,
    titleFr: fr,
    bodyEn: 'Read this page.',
    bodyFr: 'Lisez cette page.',
    altEn: '',
    altFr: '',
    linkEn: '',
    linkFr: '',
    artwork: '',
    target: '',
    ...extra
  });
  const edit = (kind, slug, version, data) => ({ kind, slug, version, action: 'save', content: data });
  const change = (who, kind, slug, version, action, head = {}) =>
    who(endpoint, { kind, slug, version, action }, undefined, head);
  const art =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+aCUEAAAAASUVORK5CYII=';
  assert.equal((await guest(endpoint)).status, 401);
  assert.deepEqual((await guest('website-content?locale=fr-CA')).data, { locale: 'fr-CA', banner: null, help: [] });
  const page = content('Saving previews', 'Vos favoris');
  assert.equal((await editor(endpoint, edit('help', 'saved-titles', 0, page))).status, 200);
  assert.equal((await guest('help/saved-titles?locale=fr-CA')).status, 404);
  assert.equal((await fetch(base + mount + '/help/saved-titles?lang=fr')).status, 404);
  assert.equal((await guest(endpoint + '/help/saved-titles')).status, 401);
  assert.equal((await editor(endpoint + '/help/saved-titles')).data.content.titleFr, 'Vos favoris');
  assert.equal((await change(editor, 'help', 'saved-titles', 1, 'publish')).status, 403);
  const header = { 'X-Request-ID': randomUUID() };
  const publish = await change(staff, 'help', 'saved-titles', 1, 'publish', header);
  assert.equal(publish.status, 200);
  assert.deepEqual((await change(staff, 'help', 'saved-titles', 1, 'publish', header)).data, publish.data);
  assert.equal((await guest('help/saved-titles?locale=en-CA')).data.title, 'Saving previews');
  assert.equal((await fetch(base + mount + '/help/saved-titles?lang=fr')).status, 200);
  const banner = content('Discover', 'Découvrez', {
    artwork: art,
    altEn: 'A leaf',
    altFr: 'Une feuille',
    target: 'help/saved-titles',
    linkFr: 'Gérer mes favoris'
  });
  assert.equal((await editor(endpoint, edit('banner', 'lobby', 0, banner))).status, 200);
  assert.equal((await guest('website-content')).data.banner, null);
  assert.equal((await change(staff, 'banner', 'lobby', 1, 'publish')).status, 200);
  const fr = (await guest('website-content?locale=fr-CA')).data;
  assert.deepEqual(fr.help, [{ title: 'Vos favoris', url: mount + '/help/saved-titles?lang=fr' }]);
  assert.equal(fr.banner.artwork, art);
  assert.equal(fr.banner.alt, 'Une feuille');
  assert.deepEqual(fr.banner.link, { href: fr.help[0].url, label: 'Gérer mes favoris' });
  const draft = await editor(
    endpoint,
    edit('banner', 'lobby', 2, { ...banner, titleFr: 'Nouvelle bannière', altFr: '' })
  );
  assert.equal(draft.data.status, 'changed');
  assert.equal((await change(staff, 'banner', 'lobby', 2, 'publish')).status, 409);
  assert.equal((await change(staff, 'banner', 'lobby', 3, 'publish')).data.error, 'siteContentTranslationNeeded');
  assert.equal((await guest('website-content?locale=fr-CA')).data.banner.title, 'Découvrez');
  assert.equal(
    (await editor(endpoint, edit('banner', 'lobby', 3, { ...banner, target: 'https://example.org' }))).status,
    400
  );
  assert.equal(
    (await editor(endpoint, edit('banner', 'lobby', 3, { ...banner, artwork: 'data:text/html;base64,YQ==' }))).status,
    400
  );
  await change(staff, 'help', 'saved-titles', 2, 'archive');
  const missingTarget = (await guest('website-content?locale=fr-CA')).data;
  assert.deepEqual(missingTarget.help, []);
  assert.deepEqual(missingTarget.banner.link, { href: mount + '/?lang=fr#games', label: 'Voir le catalogue' });
  assert.equal((await guest('help/saved-titles')).status, 404);
  assert.equal((await fetch(base + mount + '/help/saved-titles')).status, 404);
  const card = (await staff('admin/coming-soon', cardDraft('Orchard', { locales: ['fr-CA'] }))).data.title;
  await staff('admin/coming-soon', { action: 'publish', slug: card.slug, version: card.version });
  const destinations = (await editor(endpoint)).data.targets;
  assert.deepEqual(destinations.find((item) => item.key === 'title/' + card.slug).locales, ['fr-CA']);
  assert.ok(!destinations.some((item) => item.key === 'help/saved-titles'));
  await staff(endpoint, edit('banner', 'lobby', 3, { ...banner, titleFr: 'Au verger', target: 'title/' + card.slug }));
  await change(staff, 'banner', 'lobby', 4, 'publish');
  assert.equal(
    (await guest('website-content?locale=fr-CA')).data.banner.link.href,
    mount + '/coming-soon/orchard?lang=fr&locale=fr-CA'
  );
  assert.equal((await guest('website-content?locale=en-CA')).data.banner.link.href, mount + '/?lang=en#games');
  await staff('admin/coming-soon', { action: 'archive', slug: card.slug, version: 2 });
  assert.equal((await guest('website-content?locale=fr-CA')).data.banner.link.href, mount + '/?lang=fr#games');
  const audit = (await staff('admin/audit')).data.events.filter(
    (e) => e.target === 'website-content/help/saved-titles' && e.action === 'website_content_published'
  );
  assert.deepEqual(
    audit.map((e) => [e.id, e.actor, e.details.revision]),
    [[publish.data.auditId, staffCredentials.email, 1]]
  );
  assert.equal((await editor(endpoint + '/help/saved-titles')).data.history.length, 0);
  const history = (await staff(endpoint + '/help/saved-titles')).data.history;
  assert.deepEqual(
    history.map((r) => r.action),
    ['website_content_archived', 'website_content_published']
  );
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  db.exec(
    "INSERT INTO tenants VALUES('other','other','Other Brand','active',1); UPDATE tenant_domains SET tenant_id='other' WHERE host='localhost'"
  );
  assert.equal((await guest('website-content', undefined, 'localhost')).data.banner, null);
  assert.equal((await guest('help/saved-titles', undefined, 'localhost')).status, 404);
  assert.equal((await staff(endpoint + '/banner/lobby', undefined, 'localhost')).status, 401);
  await staff(endpoint, edit('help', 'fr-guide', 0, content('', 'Guide français', { bodyEn: '' })));
  assert.equal((await change(staff, 'help', 'fr-guide', 1, 'publish')).status, 400);
  db.exec(
    "UPDATE tenant_config_versions SET config=json_set(config,'$.enabledLocales',json('[\"fr-CA\"]'),'$.primaryLocale','fr-CA') WHERE tenant_id='sandbox' AND status='published'"
  );
  assert.equal((await change(staff, 'help', 'fr-guide', 1, 'publish')).status, 200);
  assert.equal((await guest('help/fr-guide?locale=en-CA')).data.locale, 'fr-CA');
  db.exec(
    "UPDATE tenant_config_versions SET config=json_set(config,'$.enabledSections.faq',json('false')) WHERE tenant_id='sandbox' AND status='published'"
  );
  assert.equal((await guest('help/fr-guide')).status, 404);
  assert.equal((await guest('website-content')).data.help.length, 0);
});

test('website publication survives request chunk boundaries, concurrent edits and an audited transaction retry', { timeout: 20_000 }, async (t) => {
  const header = { 'X-Request-ID': randomUUID() };
  let observeFailure;
  const failedRequest = new Promise((resolve) => { observeFailure = resolve; });
  const { base, database } = await startSandbox(t, { onRequest(entry) {
    if (entry.requestId === header['X-Request-ID'] && entry.status === 500) observeFailure(entry);
  } });
  const staff = client(base);
  const login = await staff('admin/login', staffCredentials);
  const cookie = login.setCookies[0].split(';')[0];
  const input = {
    slug: 'accents',
    kind: 'help',
    version: 0,
    action: 'save',
    content: {
      titleEn: 'Help',
      titleFr: 'Préférences',
      bodyEn: 'Read this guide.',
      bodyFr: 'Vos réglages.',
      altEn: '',
      altFr: '',
      linkEn: '',
      linkFr: '',
      target: '',
      artwork: ''
    }
  };
  const payload = Buffer.from(JSON.stringify(input));
  const split = payload.indexOf(Buffer.from('é')) + 1;
  assert.ok(split > 1);
  const response = await new Promise((resolve, reject) => {
    const req = httpRequest(
      base + '/api/admin/website-content',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' }
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      }
    );
    req.on('error', reject);
    req.write(payload.subarray(0, split), () => setTimeout(() => req.end(payload.subarray(split)), 10));
  });
  assert.equal(response, 200);
  assert.equal((await staff('admin/website-content/help/accents')).data.content.titleFr, 'Préférences');
  const edits = await Promise.all(
    ['Texte un.', 'Texte deux.'].map((bodyFr) =>
      staff('admin/website-content', { ...input, version: 1, content: { ...input.content, bodyFr } })
    )
  );
  assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  const action = { kind: 'help', slug: 'accents', version: 2, action: 'publish' };
  db.exec(
    "CREATE TRIGGER deny_publication BEFORE INSERT ON staff_events WHEN NEW.action='website_content_published' BEGIN SELECT RAISE(ABORT,'test rollback'); END"
  );
  const failed = await staff('admin/website-content', action, undefined, header);
  assert.equal(failed.status, 500);
  assert.equal(failed.data.requestId, header['X-Request-ID']);
  const log = await failedRequest;
  assert.deepEqual(log.publication, { action: 'publish', record: 'website-content/help/accents' });
  assert.equal(log.tenantId, 'sandbox');
  assert.equal(log.errorCode, 'internal');
  assert.equal((await client(base)('help/accents')).status, 404);
  assert.equal((await staff('admin/website-content/help/accents')).data.version, 2);
  db.exec('DROP TRIGGER deny_publication');
  const published = await staff('admin/website-content', action, undefined, header);
  assert.equal(published.status, 200);
  assert.deepEqual((await staff('admin/website-content', action, undefined, header)).data, published.data);
  assert.equal((await staff('admin/website-content/help/accents')).data.history.length, 1);
});

test('P1 recovery drill restores account, catalogue, saved activity, website revisions and publication receipts into a second instance', async (t) => {
  const encryptionKey = randomBytes(32).toString('hex');
  const source = await startSandbox(t, { encryptionKey });
  const staff = client(source.base),
    player = client(source.base);
  await staff('admin/login', staffCredentials);
  await register(player);
  const account = (await player('account')).data;
  const card = (await staff('admin/coming-soon', cardDraft('Neon Orchard'))).data.title;
  const publishedCard = (
    await staff('admin/coming-soon', { action: 'publish', slug: card.slug, version: card.version })
  ).data;
  const savePath = 'me/saved/' + card.id;
  const saved = (await player(savePath, undefined, undefined, {}, 'PUT')).data;
  assert.ok(publishedCard.auditId && saved.activityId);
  const path = 'admin/website-content',
    page = { kind: 'help', slug: 'saved-titles' };
  const content = {
    titleEn: 'Saving titles',
    titleFr: 'Mes favoris',
    bodyEn: 'How to save a title.',
    bodyFr: 'Comment garder un favori.',
    artwork: '',
    altEn: '',
    altFr: '',
    linkEn: '',
    linkFr: '',
    target: 'title/' + card.slug
  };
  const draft = (await staff(path, { ...page, action: 'save', version: 0, content })).data;
  const operation = { ...page, action: 'publish', version: draft.version };
  const header = { 'X-Request-ID': randomUUID() };
  const publishedPage = (await staff(path, operation, undefined, header)).data;
  assert.ok(publishedPage.auditId);
  const newDraft = (
    await staff(path, {
      ...page,
      action: 'save',
      version: publishedPage.version,
      content: { ...content, titleFr: 'Brouillon privé' }
    })
  ).data;
  assert.equal(newDraft.status, 'changed');
  const events = (await staff('admin/audit')).data.events.filter((e) =>
    [publishedCard.auditId, publishedPage.auditId].includes(e.id)
  );
  assert.equal(events.length, 2);
  const root = await mkdtemp(join(tmpdir(), 'northplay-restore-drill-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const backup = join(root, 'snapshot.sqlite'),
    restoredDirectory = join(root, 'restored');
  const dbOp = (...args) =>
    JSON.parse(
      execFileSync(process.execPath, ['scripts/db-ops.js', ...args], {
        env: { ...process.env, APP_ENV: 'development', DATA_DIR: dirname(source.database) },
        encoding: 'utf8'
      })
    );
  const snapshot = dbOp('backup', backup);
  assert.equal(dbOp('verify', backup).sha256, snapshot.sha256);
  assert.equal(dbOp('prepare-restore', backup, restoredDirectory).sourceSha256, snapshot.sha256);
  assert.equal((await staff(path, { ...page, action: 'archive', version: newDraft.version })).status, 200);
  await player(savePath, undefined, undefined, {}, 'DELETE');
  await staff('admin/coming-soon', { action: 'archive', slug: card.slug, version: publishedCard.title.version });
  assert.equal((await client(source.base)('help/saved-titles')).status, 404);
  await t.test('start the restored service and verify the snapshot through its public and staff APIs', async (t) => {
    const restored = await startSandbox(t, { dataDirectory: restoredDirectory, encryptionKey });
    assert.equal((await (await fetch(restored.base + '/readyz')).json()).status, 'ready');
    const owner = client(restored.base),
      member = client(restored.base),
      visitor = client(restored.base);
    await owner('admin/login', staffCredentials);
    const identity = (await member('login', playerCredentials)).data;
    assert.equal(identity.id, account.id);
    assert.equal(identity.emailVerified, 1);
    const listing = (await visitor('coming-soon/' + card.slug)).data;
    assert.deepEqual([listing.id, listing.slug], [card.id, card.slug]);
    const restoredCard = (await owner('admin/coming-soon')).data.find((row) => row.id === card.id);
    assert.equal(restoredCard.publishedVersion, publishedCard.title.publishedVersion);
    assert.deepEqual(
      (await member('me/saved')).data.titles.map((row) => row.activityId),
      [saved.activityId]
    );
    assert.deepEqual((await member(savePath, undefined, undefined, {}, 'PUT')).data, saved);
    const profile = (await owner('admin/players/' + account.id)).data;
    assert.deepEqual(
      profile.savedActivity.entries.map((row) => row.id),
      [saved.activityId]
    );
    const publicPage = (await visitor('help/saved-titles?locale=fr-CA')).data;
    assert.deepEqual([publicPage.revision, publicPage.title], [publishedPage.revision, 'Mes favoris']);
    assert.match(publicPage.link.href, /\/coming-soon\/neon-orchard\?/);
    const editorial = (await owner(path + '/help/saved-titles')).data;
    assert.deepEqual([editorial.draftRevision, editorial.content.titleFr], [newDraft.revision, 'Brouillon privé']);
    assert.deepEqual((await owner(path, operation, undefined, header)).data, publishedPage);
    const restoredEvents = (await owner('admin/audit')).data.events;
    assert.deepEqual(
      restoredEvents.filter((e) => events.some((original) => e.id === original.id)),
      events
    );
    assert.deepEqual(
      restoredEvents.filter((e) => e.correlationId === header['X-Request-ID']).map((e) => e.id),
      [publishedPage.auditId]
    );
    assert.equal((await client(source.base)('help/saved-titles')).status, 404);
  });
});
