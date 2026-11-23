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
import { createAccountBreaks } from '../lib/account-breaks.js';
import { createSavedTitles } from '../lib/saved-titles.js';
import { reportPeriod } from '../lib/dashboard.js';
import { collectionKey, matchesCatalogue } from '../public/catalog.js';
import { sitemapXml } from '../lib/public-pages.js';

const staffCredentials = { email: 'admin@example.test', password: 'example-staff-password' };
const playerCredentials = { email: 'player@example.test', password: 'example-test-password' };

async function startSandbox(t, { initializeDatabase, appBasePath = '', sandboxTenantHosts = '', captureMail = false,
  dataDirectory, testCredits = false, encryptionKey = randomBytes(32).toString('hex'), onRequest } = {}) {
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
      SANDBOX_TENANT_HOSTS: sandboxTenantHosts, ENABLE_TEST_CREDITS:testCredits?'1':'0', DEMO_CREDITS_TEST_DATA_DIR:testCredits?directory:'',
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

test('the mounted lobby renders its brand and artwork and respects a newly published identity', async (t) => {
  const mount = '/casinohabibi';
  const { base } = await startSandbox(t, { appBasePath: mount });
  const url = base + mount;
  const request = client(url);
  const first = await (await fetch(url + '/?lang=fr')).text();
  assert.match(first, /<title>Casino Habibi<\/title>/);
  assert.match(first, /<h1 data-copy="headline">Votre place à la table\.<\/h1>/);
  assert.match(first, /<body class="player-home" data-lobby-brand="habibi"/);
  assert.match(first, /data-copy="homeAll">Hall du casino<\/span>/);
  assert.match(first, /id="home-originals-title"[^>]*>Jeux maison<\/h3><div class="cards"><article/);
  const sportResponse = await fetch(url + '/?view=sports', { headers: { Cookie: 'northplay_ui_locale=fr' } });
  assert.equal(sportResponse.headers.get('cache-control'), 'no-store');
  const sports = await sportResponse.text();
  assert.match(sports, /<title>Sports en démo · Casino Habibi<\/title>/);
  assert.match(sports, /<main id="lobby"[^>]* data-hub-open/);
  assert.match(sports, /<h1 id="hub-title" tabindex="-1">Sports en démo<\/h1>/);
  assert.match(sports, /data-hub-control="marina-0"/);
  assert.match(sports, /Coupon démo/);
  const english = await (await fetch(url + '/?lang=en&view=sports', { headers: { Cookie: 'northplay_ui_locale=fr' } })).text();
  assert.match(english, /<title>Sports demo · Casino Habibi<\/title>/);
  const asset = await fetch(url + '/lobby-navigation.js');
  const etag = asset.headers.get('etag');
  assert.ok(etag);
  assert.equal((await fetch(url + '/lobby-navigation.js', { headers: { 'If-None-Match': etag } })).status, 304);
  assert.equal((await fetch(url + '/lobby-navigation.js', { headers: { 'If-None-Match': '"outdated"' } })).status, 200);
  for (const file of ['lobby.css', 'lobby-coast.webp', 'game-gold.webp', 'game-roulette.webp', 'game-blackjack.webp', 'game-aurora.webp']) {
    const asset = await fetch(url + '/' + file);
    assert.equal(asset.status, 200, file);
    assert.match(asset.headers.get('content-type'), file.endsWith('.webp') ? /image\/webp/ : /text\/css/);
    assert.ok((await asset.arrayBuffer()).byteLength > 1000, file);
  }
  assert.equal((await request('admin/login', staffCredentials)).status, 200);
  const initial = (await request('admin/config')).data;
  assert.equal(initial.config.brandName, 'Casino Habibi');
  const config = { ...initial.config, brandName: 'Table & Coast', heroTitleFr: 'Une table <ouverte>' };
  const draft = await request('admin/config', { version: initial.version, config });
  assert.equal(draft.status, 200);
  assert.equal((await request('admin/config/publish', { version: draft.data.version })).status, 200);
  assert.equal((await request('tenant')).data.config.brandName, 'Table & Coast');
  const updated = await (await fetch(url + '/?lang=fr')).text();
  assert.match(updated, /<title>Casino Table &amp; Coast<\/title>/);
  assert.doesNotMatch(updated, /id="lobby-settings"|data-lobby-brand="habibi"/);
  assert.match(updated, /<h1 data-copy="headline">Une table &lt;ouverte&gt;<\/h1>/);
});

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
  for (const name of ['admin-inter.woff2', 'admin-icons.woff2']) {
    const asset = await fetch(published + '/' + name);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), /font\/woff2/);
    assert.equal(Buffer.from(await asset.arrayBuffer()).subarray(0, 4).toString(), 'wOF2');
  }
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
  assert.equal((await otherBrand(route + '/break', undefined, 'localhost')).status, 404);

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

test('a timed break propagates to independent player and support sessions and marks saved activity at its event time', async (t) => {
  const { base, database } = await startSandbox(t);
  const [laptop, phone, admin, content, guest] = Array.from({ length: 5 }, () => client(base));
  await register(laptop);
  const id = (await phone('login', playerCredentials)).data.id;
  assert.equal((await laptop('safety/break')).data.accountBreak, null);
  assert.equal((await guest('safety/break')).status, 401);
  assert.equal((await guest('safety/pause', {})).status, 401);
  await admin('admin/login', staffCredentials);
  const writer = { email: 'editor@example.test', password: 'example-editor-password' };
  await admin('admin/staff', { ...writer, role: 'operator_content' });
  await content('admin/login', writer);
  const detail = 'admin/players/' + id;
  assert.equal((await content(detail)).status, 403);
  assert.equal((await content(detail + '/break')).status, 403);
  const card = (await admin('admin/coming-soon', cardDraft('Lunar Garden'))).data.title;
  await admin('admin/coming-soon', { action: 'publish', version: card.version, slug: card.slug });
  const shelf = 'me/saved/' + card.id;
  const first = await laptop(shelf, undefined, undefined, {}, 'PUT');
  await laptop(shelf, undefined, undefined, {}, 'DELETE');

  const key = { 'X-Request-ID': randomUUID() };
  const attempts = await Promise.all([laptop('safety/pause', {}, undefined, key), phone('safety/pause', {}, undefined, key)]);
  assert.ok(attempts.every(({status}) => status === 200));
  const period = attempts[0].data.accountBreak;
  assert.deepEqual(attempts[1].data.accountBreak, period);
  assert.equal(period.endsAt - period.startedAt, 15 * 60_000);
  assert.equal(attempts[0].data.dailyLimit, 2500);
  assert.deepEqual((await phone('account')).data.safety.accountBreak, period);
  assert.deepEqual((await admin(detail)).data.accountBreak, period);
  assert.equal((await laptop('safety/cooling-off', {days: 1}, undefined, key)).status, 409);
  assert.equal((await phone('safety/cooling-off', {days: 2})).status, 400);
  const bet = { game: 'gold', wager: 100, requestId: randomUUID() };
  assert.equal((await phone('play', bet)).data.error, 'paused');

  const both = await Promise.all([1, 7].map(days => phone('safety/cooling-off', {days})));
  assert.ok(both.every(({status}) => status === 200));
  const extended = (await laptop('safety/break')).data.accountBreak;
  assert.equal(extended.startedAt, period.startedAt);
  assert.ok(extended.endsAt >= period.startedAt + 7 * 86400_000);
  assert.deepEqual((await phone('safety/pause', {}, undefined, key)).data.accountBreak, extended);
  assert.deepEqual((await phone('safety/cooling-off', {days: 1})).data.safety.accountBreak, extended);
  assert.deepEqual((await admin(detail)).data.accountBreak, extended);
  assert.deepEqual((await admin(detail + '/break')).data, { accountBreak: extended });
  for (const category of ['responsible_play', 'account']) {
    assert.equal((await phone('support', { category, message: 'Please confirm the account status.' })).status, 200);
  }
  const tickets = (await admin('admin/support')).data.tickets;
  assert.deepEqual(tickets.find(ticket => ticket.category === 'responsible_play').accountBreak, extended);
  assert.equal(tickets.find(ticket => ticket.category === 'account').accountBreak, undefined);
  assert.equal((await fetch(base + '/coming-soon/' + card.slug)).status, 200);
  const saved = await phone(shelf, undefined, undefined, {}, 'PUT');
  assert.equal(saved.data.saved, true);
  const exported = (await laptop('account/export')).data;
  assert.deepEqual(exported.responsiblePlay.accountBreak, extended);
  assert.equal(exported.previewSaveActivity.find(entry => entry.id === first.data.activityId).duringAccountBreak, false);
  assert.equal(exported.previewSaveActivity.find(entry => entry.id === saved.data.activityId).duringAccountBreak, true);
  const db = new DatabaseSync(database);
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM player_account_breaks WHERE request_id = ?').get(key['X-Request-ID']).n, 1);
  } finally { db.close(); }
  const reset = await phone('password-reset/request', { email: playerCredentials.email, locale: 'fr-CA' });
  assert.equal(reset.status, 200);
  const password = 'replacement-break-password';
  assert.equal((await laptop('password-reset/complete', { token: new URL(reset.data.resetUrl).searchParams.get('reset'), password })).status, 200);
  assert.deepEqual((await phone('login', { email: playerCredentials.email, password })).data.safety.accountBreak, extended);
  assert.equal((await phone('safety/exclude', {})).status, 200);
  assert.equal((await phone('safety/break')).status, 401);
  assert.equal((await laptop('login', { email: playerCredentials.email, password })).data.error, 'excluded');
});

test('legacy protection windows migrate once, keep their boundaries and isolate brands and players', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`PRAGMA foreign_keys = ON;
      CREATE TABLE tenants(id TEXT PRIMARY KEY);
      CREATE TABLE players(id INTEGER PRIMARY KEY, tenant_id TEXT);
      CREATE TABLE player_safety(player INTEGER PRIMARY KEY, pause_until INTEGER, cooling_off_until INTEGER, excluded_at INTEGER);
      CREATE TABLE player_protection_events(tenant_id TEXT, player_id INTEGER, action TEXT, duration_days INTEGER, until_at INTEGER, created_at INTEGER);
      INSERT INTO tenants VALUES('one'),('two');
      INSERT INTO players VALUES(1,'one'),(2,'two'),(3,'one');
    `);
    const begin = Date.now() - 5 * 86_400_000;
    const firstEnd = begin + 86_400_000;
    const secondStart = begin + 86_400_000 * 2;
    const end = secondStart + 7 * 86_400_000;
    const legacy = db.prepare("INSERT INTO player_protection_events VALUES('one',1,?,?,?,?)");
    legacy.run('cooling_off_started', 1, firstEnd, begin);
    legacy.run('cooling_off_started', 1, secondStart + 86_400_000, secondStart);
    legacy.run('cooling_off_extended', 7, end + 1000, secondStart + 1000);
    const lastQuick = secondStart + 900_000 + 10;
    db.prepare('INSERT INTO player_safety VALUES(1,?,?,NULL),(2,NULL,?,NULL)').run(lastQuick, end + 1000, end);
    const transaction = fn => { db.exec('BEGIN'); try { const v = fn(); db.exec('COMMIT'); return v; } catch (e) { db.exec('ROLLBACK'); throw e; } };
    const deps = { transaction, fail: assert.fail };
    const periods = createAccountBreaks(db, deps);
    assert.equal(periods.at('one', 1, begin - 1), null);
    assert.deepEqual({ ...periods.at('one', 1, begin) }, { startedAt: begin, endsAt: firstEnd });
    assert.equal(periods.at('one', 1, firstEnd), null);
    const active = { startedAt: secondStart, endsAt: end + 1000 };
    assert.deepEqual({ ...periods.at('one', 1) }, active);
    assert.equal(periods.at('one', 1, active.endsAt), null);
    assert.equal(periods.at('two', 1), null);
    assert.equal(periods.at('one', 3), null);
    assert.deepEqual({ ...periods.at('two', 2) }, { startedAt: null, endsAt: end });
    assert.equal(periods.at('two', 2, begin), null);
    transaction(() => periods.start('one', 3, 15, 'test-request', begin));
    assert.equal(periods.at('one', 3, begin + 900_000 - 1).startedAt, begin);
    assert.equal(periods.at('one', 3, begin + 900_000), null);
    transaction(() => periods.start('one', 3, 15, 'test-request', end));
    assert.equal(periods.at('one', 3, end), null);

    db.exec(`CREATE TABLE coming_soon_titles(tenant_id TEXT, id INTEGER, slug TEXT, state TEXT, PRIMARY KEY(tenant_id,id));
      INSERT INTO coming_soon_titles VALUES('one',5,'lunar-garden','published');
      CREATE TABLE player_favorites(player_id INTEGER, tenant_id TEXT, favorite_key TEXT, created_at INTEGER, PRIMARY KEY(player_id,tenant_id,favorite_key));
      CREATE TABLE coming_soon_saves(id INTEGER PRIMARY KEY, tenant_id TEXT, player_id INTEGER, title_id INTEGER, created_at INTEGER, UNIQUE(tenant_id,player_id,title_id))`);
    const shelf = createSavedTitles(db, deps);
    const put = (time, key) => transaction(() => shelf.set('one', 3, 'coming-soon:5', true, time, key));
    const during = put(begin, 'original-save');
    transaction(() => shelf.set('one', 3, 'coming-soon:5', false, begin + 1, null));
    const after = put(begin + 900_000, 'new-save');
    assert.equal(put(end, 'original-save').activityId, during.activityId);
    const facts = shelf.history('one', 3).entries;
    assert.equal(facts.find(row => row.id === during.activityId).duringAccountBreak, true);
    assert.equal(facts.find(row => row.id === after.activityId).duringAccountBreak, false);

    const count = () => db.prepare('SELECT count(*) AS n FROM player_account_breaks').get().n;
    const before = count();
    assert.deepEqual({ ...createAccountBreaks(db, deps).at('one', 1) }, active);
    assert.equal(count(), before);
  } finally { db.close(); }
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

test('published guide translations preserve old links, private drafts, collections and tenant-specific indexing', async (t) => {
  const mount = '/casinohabibi';
  const { base, database } = await startSandbox(t, { appBasePath: mount });
  const site = base + mount, owner = client(site), editor = client(site), guest = client(site);
  await owner('admin/login', staffCredentials);
  const creds = { email: 'writer@example.test', password: 'draft-author-password' };
  assert.equal((await owner('admin/staff', { ...creds, role: 'operator_content' })).status, 200);
  await editor('admin/login', creds);
  for (const [name, extra, publish] of [
    ['Night Train', {}, true], ['Quiet Draft', {}, false], ['Another Market', { displayMarket: 'JP' }, true],
    ['French Only', { locales: ['fr-CA'] }, true]
  ]) {
    const card = (await owner('admin/coming-soon', cardDraft(name, {
      collectionEn: 'Night routes', collectionFr: 'Trains de nuit', ...extra
    }))).data.title;
    if (publish) assert.equal((await owner('admin/coming-soon', { action: 'publish', slug: card.slug, version: card.version })).status, 200);
  }
  const endpoint = 'admin/website-content', id = 'night-guide';
  const guide = { titleEn: 'Night guide', titleFr: 'Guide des trains', bodyEn: 'How to find previews.',
    bodyFr: 'Les fiches de la collection.', artwork: '', target: '', altEn: '', altFr: '', linkEn: '', linkFr: '' };
  const change = (actor, action, slug, version, content, headers) =>
    actor(endpoint, { kind: 'help', action, slug, version, ...(content && { content }) }, undefined, headers);
  const page = (address, language = 'fr') => fetch(site + '/help/' + address + '?lang=' + language, { redirect: 'manual' });
  const map = async () => (await fetch(site + '/sitemap.xml')).text();
  const refs = () => owner('admin/publication-followup?state=open');
  assert.equal((await change(owner, 'save', id, 0, guide)).status, 200);
  assert.equal((await change(owner, 'publish', id, 1)).status, 200);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  // A publication made before localized addresses existed has no history rows.
  db.prepare('DELETE FROM website_guide_addresses WHERE record_slug=?').run(id);
  assert.equal((await page(id)).status, 200);
  const edited = { ...guide, addressFr: 'trains-de-nuit', addressEn: 'night-trains', seoTitleFr: 'Trains & gares',
    seoDescriptionFr: 'Les stations <historiques> et leurs "fiches".', collection: 'night routes' };
  assert.equal((await change(editor, 'save', id, 2, edited)).status, 200);
  assert.equal((await page(edited.addressFr)).status, 404);
  assert.doesNotMatch(await map(), /trains-de-nuit/);
  assert.equal((await change(editor, 'publish', id, 3)).status, 403);
  const first = await change(owner, 'publish', id, 3);
  assert.ok(first.data.auditId);
  const previous = await page(id);
  assert.equal(previous.status, 301);
  assert.equal(previous.headers.get('location'), mount + '/help/trains-de-nuit?lang=fr');
  const live = await page('trains-de-nuit'), html = await live.text();
  assert.equal(live.status, 200);
  const oldHead = await fetch(site + '/help/' + id + '?lang=fr', { method: 'HEAD', redirect: 'manual' });
  assert.equal(oldHead.status, 301);
  assert.equal(oldHead.headers.get('location'), previous.headers.get('location'));
  assert.equal(await oldHead.text(), '');
  assert.equal((await fetch(site + '/help/night-trains?lang=toString', { redirect: 'manual' })).status, 302);
  assert.match(html, /<html lang="fr-CA"/);
  assert.match(html, /<title>Trains &amp; gares · [^<]+<\/title>/);
  assert.match(html, /Les stations &lt;historiques&gt; et leurs &quot;fiches&quot;/);
  assert.ok(html.includes('rel="canonical" href="' + site + '/help/trains-de-nuit?lang=fr"'));
  assert.ok(html.includes('hreflang="en-CA" href="' + site + '/help/night-trains?lang=en"'));
  assert.match(html, /<h1>Guide des trains<\/h1>/);
  assert.match(html, /href="[^"]*coming-soon\/night-train\?lang=fr&amp;locale=fr-CA"/);
  assert.doesNotMatch(html, /coming-soon\/(quiet-draft|another-market)/);
  const published = (await guest('help/trains-de-nuit?locale=fr-CA')).data;
  assert.equal(published.slug, id);
  assert.equal(published.collection.length, 2);
  assert.equal((await guest('help/night-trains?locale=en-CA')).data.collection.length, 1);
  const sitemap = await map();
  const mapHead = await fetch(site + '/sitemap.xml', { method: 'HEAD' });
  assert.equal(mapHead.status, 200);
  assert.match(mapHead.headers.get('content-type'), /application\/xml/);
  assert.equal(await mapHead.text(), '');
  assert.match(sitemap, /<loc>[^<]*\/help\/trains-de-nuit\?lang=fr<\/loc>/);
  assert.match(sitemap, /<loc>[^<]*\/coming-soon\/french-only\?lang=fr&amp;locale=fr-CA<\/loc>/);
  assert.doesNotMatch(sitemap, /french-only\?lang=en|quiet-draft|another-market|night-guide|\/admin/);
  assert.equal((await fetch(site + '/admin')).headers.get('x-robots-tag'), 'noindex');
  assert.equal((await page('unknown-guide')).headers.get('x-robots-tag'), 'noindex');
  // A legacy editor changes the body without sending the newer fields.
  assert.equal((await change(owner, 'save', id, 4, { ...guide, bodyFr: 'Texte mis à jour.' })).status, 200);
  assert.equal((await owner(endpoint + '/help/' + id)).data.content.addressFr, edited.addressFr);
  const next = { ...edited, addressFr: 'derniere-gare' };
  assert.equal((await change(owner, 'save', id, 5, next)).status, 200);
  const receipt = { 'X-Request-ID': randomUUID() };
  const renamed = await change(owner, 'publish', id, 6, undefined, receipt);
  assert.deepEqual((await change(owner, 'publish', id, 6, undefined, receipt)).data, renamed.data);
  for (const old of [id, 'trains-de-nuit']) {
    const response = await page(old);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), mount + '/help/derniere-gare?lang=fr');
    assert.equal((await fetch(base + response.headers.get('location'), { redirect: 'manual' })).status, 200);
  }
  assert.equal((await change(owner, 'save', 'other-guide', 0, { ...guide, addressFr: 'trains-de-nuit' })).status, 200);
  assert.equal((await change(owner, 'publish', 'other-guide', 1)).data.error, 'siteAddressTaken');
  assert.ok((await refs()).data.items.some((r) => r.reason === 'siteAddressTaken' && r.record.endsWith('/other-guide')));
  assert.equal((await change(owner, 'save', 'trains-de-nuit', 0, guide)).data.error, 'siteAddressTaken');
  assert.equal((await change(owner, 'save', id, 7, { ...next, indexable: false })).status, 200);
  assert.match(await map(), /derniere-gare/);
  assert.equal((await change(owner, 'publish', id, 8)).status, 200);
  assert.equal((await page('derniere-gare')).headers.get('x-robots-tag'), 'noindex');
  assert.doesNotMatch(await map(), /night-trains|derniere-gare/);
  assert.equal((await page('derniere-gare')).status, 200);
  assert.equal((await change(owner, 'save', id, 9, { ...next, indexable: true })).status, 200);
  assert.equal((await change(owner, 'publish', id, 10)).status, 200);
  assert.match(await map(), /derniere-gare/);
  db.exec("INSERT INTO tenants VALUES('other','other','Another Brand','active',1); UPDATE tenant_domains SET tenant_id='other' WHERE host='localhost'");
  const alternate = new URL(site + '/sitemap.xml'); alternate.hostname = 'localhost';
  assert.doesNotMatch(await (await fetch(alternate)).text(), /night-train|derniere-gare/);
  assert.equal((await guest('help/derniere-gare?locale=fr-CA', undefined, 'localhost')).status, 404);
  assert.equal((await change(owner, 'archive', id, 11)).status, 200);
  assert.doesNotMatch(await map(), /derniere-gare|night-trains\?lang=en/);
  for (const old of [id, 'trains-de-nuit', 'derniere-gare']) assert.equal((await page(old)).status, 404);
  assert.equal((await owner(endpoint + '/help/' + id)).data.history[0].action, 'website_content_archived');
});

test('large sitemaps split complete language groups across numbered maps', () => {
  const groups = Array.from({ length: 4001 }, (_, i) => [
    { locale: 'en-CA', href: '/casinohabibi/help/p-' + i + '?lang=en' },
    { locale: 'fr-CA', href: '/casinohabibi/help/p-' + i + '?lang=fr' }
  ]);
  const origin = 'https://brand.example', mount = '/casinohabibi';
  assert.ok(sitemapXml(groups, origin, mount).includes(origin + mount + '/sitemap-2.xml'));
  const last = sitemapXml(groups, origin, mount, 2);
  assert.equal((last.match(/<url>/g) || []).length, 2);
  assert.match(last, /p-4000\?lang=fr/);
  assert.doesNotMatch(last, /p-3999/);
  assert.equal(sitemapXml(groups, origin, mount, 3), null);
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
  const failedItem = (await staff('admin/publication-followup?q=' + header['X-Request-ID'])).data.items[0];
  assert.equal(failedItem.reason, 'unavailable');
  assert.equal(failedItem.record, 'website-content/help/accents');
  assert.deepEqual((await staff('admin/publication-followup?q=preferences')).data.items.map((item) => item.id), [failedItem.id]);
  assert.equal((await client(base)('help/accents')).status, 404);
  assert.equal((await staff('admin/website-content/help/accents')).data.version, 2);
  db.exec('DROP TRIGGER deny_publication');
  const published = await staff('admin/website-content', action, undefined, header);
  assert.equal(published.status, 200);
  assert.deepEqual((await staff('admin/website-content', action, undefined, header)).data, published.data);
  assert.equal((await staff('admin/website-content/help/accents')).data.history.length, 1);
  const resolved = (await staff('admin/publication-followup?state=resolved')).data.items;
  assert.deepEqual(resolved.map((row) => [row.id, row.auditId]), [[failedItem.id, published.data.auditId]]);
});

test('publication follow-up limits references by brand and grant, pages attempts, and resolves the matching record on success', async (t) => {
  const { base, database } = await startSandbox(t);
  const [owner, publisher, other, guest] = Array.from({ length: 4 }, () => client(base));
  await owner('admin/login', staffCredentials);
  const first = { email: 'publisher-one@example.test', password: 'fixture-password-one' };
  const second = { email: 'publisher-two@example.test', password: 'fixture-password-two' };
  for (const [who, creds] of [[publisher, first], [other, second]]) {
    await owner('admin/staff', { ...creds, role: 'operator_content', publishCatalogue: true, reason: 'Publish the test catalogue' });
    assert.equal((await who('admin/login', creds)).status, 200);
  }
  const follow = 'admin/publication-followup', endpoint = 'admin/coming-soon';
  const input = cardDraft('Midnight', { titleFr: 'Étoiles de nuit', collectionEn: 'Night journey', collectionFr: '' });
  const title = (await publisher(endpoint, input)).data.title;
  const operation = { action: 'publish', slug: title.slug, version: title.version };
  const header = { 'X-Request-ID': randomUUID() };
  assert.equal((await guest(follow)).status, 401);
  assert.deepEqual((await owner('admin/overview')).data.publicationFollowup, { total: 0, open: 0 });
  for (let i = 0; i < 2; i++) assert.equal((await publisher(endpoint, operation, undefined, header)).data.error, 'comingSoonCollectionTranslation');
  assert.deepEqual((await publisher('admin/overview')).data.publicationFollowup, { total: 1, open: 1 });
  assert.deepEqual((await other(follow)).data.items, []);
  const problem = (await owner(follow + '?q=' + header['X-Request-ID'])).data.items[0];
  assert.deepEqual([problem.record, problem.titleEn, problem.attempts, problem.actor], ['coming-soon/midnight', 'Midnight', 2, first.email]);
  assert.equal(problem.auditId, null);
  assert.deepEqual((await owner(follow + '?q=etoiles+nuit')).data.items.map((item) => item.id), [problem.id]);
  assert.deepEqual((await other(follow + '?q=etoiles+nuit')).data.items, []);
  assert.equal((await other(endpoint, operation)).data.error, 'comingSoonCollectionTranslation');
  assert.equal((await owner(follow + '?q=midnight')).data.total, 2);
  const updated = (await publisher(endpoint, { ...input, slug: title.slug, version: title.version, collectionFr: 'Voyage de nuit' })).data.title;
  assert.equal((await owner(follow)).data.total, 2);
  const published = (await owner(endpoint, { ...operation, version: updated.version })).data;
  assert.ok(published.auditId);
  assert.deepEqual((await owner(follow)).data.counts, { total: 2, open: 0 });
  assert.equal((await owner(follow + '?state=resolved&q=' + header['X-Request-ID'])).data.items[0].auditId, published.auditId);
  const personal = (await publisher(follow + '?state=resolved')).data.items;
  assert.equal(personal.length, 1);
  assert.ok(personal[0].resolvedAt);
  assert.equal(personal[0].auditId, null);
  // A successful action on another record cannot clear an outstanding problem.
  for (let n = 0; n < 7; n++) {
    const draft = (await publisher(endpoint, { ...input, titleEn: 'Record ' + n })).data.title;
    await publisher(endpoint, { ...operation, slug: draft.slug, version: draft.version });
  }
  assert.equal((await owner(endpoint, { action: 'archive', slug: title.slug, version: published.title.version })).status, 200);
  const page = (await owner(follow)).data, tail = (await owner(follow + '?page=2')).data;
  assert.deepEqual([page.total, page.items.length, tail.items.length], [7, 6, 1]);
  assert.equal(new Set([...page.items, ...tail.items].map((r) => r.id)).size, 7);
  assert.equal((await owner(follow + '?q=record-2')).data.total, 1);
  assert.equal((await owner(follow + '?state=all')).status, 400);
  assert.equal((await owner(follow + '?page=-1')).status, 400);
  assert.equal((await owner('admin/staff/role', { email: first.email, role: 'operator_content', publishCatalogue: false, reason: 'End test publishing shift' })).status, 200);
  assert.equal((await publisher(follow)).status, 403);
  assert.equal((await publisher('admin/overview')).data.publicationFollowup, null);
  const db = new DatabaseSync(database);
  try {
    db.exec("INSERT INTO tenants VALUES('other','other','Other Brand','active',1); UPDATE tenant_domains SET tenant_id='other' WHERE host='localhost'");
    assert.equal((await owner(follow, undefined, 'localhost')).status, 401);
  } finally { db.close(); }
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
test('discovery quests use distinct eligible saves, preserve progress across sessions, and reconcile stock, profile and cases', async t => {
  const {base,database}=await startSandbox(t);
  const [staff,a,b,other]=Array.from({length:4},()=>client(base));
  await staff('admin/login',staffCredentials);
  await register(a);const id=(await b('login',playerCredentials)).data.id;
  const alt={email:'discovery-second@example.test',password:'another-test-password'};
  const signup=await other('signup',alt);await other('email-verification/complete',{token:new URL(signup.data.verifyUrl).searchParams.get('verify')});await other('login',alt);
  const program=(await a('discovery')).data.items.find(i=>i.spec.template==='Q01');
  const spec={...program.spec,titleEn:'Collector',stock:1};
  const draft=(await staff('admin/discovery/programs',{action:'save',version:0,spec})).data;
  const published=await staff('admin/discovery/programs',{action:'publish',id:draft.id,version:1});assert.equal(published.status,200);
  assert.equal((await staff('admin/discovery/programs',{action:'publish',id:draft.id,version:1})).status,409);
  const ids=[];
  for(const text of ['River','Mountains','Night','Sunrise']){
    const c=(await staff('admin/coming-soon',cardDraft(text))).data.title;
    await staff('admin/coming-soon',{slug:c.slug,version:c.version,action:'publish'});ids.push(c.id);
  }
  const save=(session,n,headers={})=>session('me/saved/'+ids[n],undefined,undefined,headers,'PUT');
  const remove=(session,n)=>session('me/saved/'+ids[n],undefined,undefined,{},'DELETE');
  const current=async who=>(await who('discovery')).data.items.find(i=>i.id===draft.id);
  await save(a,0);
  for(const who of [a,other])assert.equal((await who('discovery/join',{id:draft.id})).status,200);
  const req={'X-Request-ID':randomUUID()};await save(a,1,req);await save(b,1,req);await remove(b,1);await save(a,1);await save(a,2);
  assert.equal((await current(b)).marks.length,2);
  await a('safety/pause',{});await save(b,3);assert.equal((await current(a)).marks.length,2);
  assert.equal((await a('discovery/join',{id:program.id})).data.error,'discoveryPaused');
  assert.equal((await a('discovery/claim',{ids:[draft.id]})).data.receipts[0].state,'paused');
  const db=new DatabaseSync(database);
  try{
    const p=db.prepare('SELECT id,requested_at FROM player_account_breaks WHERE player_id=?').get(id);
    // Expire this short synthetic pause immediately after its saved activity.
    const last=db.prepare("SELECT max(a.created_at) AS at FROM coming_soon_activity a JOIN coming_soon_saves s ON s.id=a.save_id WHERE s.player_id=?").get(id).at;
    db.prepare('UPDATE player_account_breaks SET ends_at=? WHERE id=?').run(Math.max(p.requested_at+1,last+1),p.id);
    db.prepare('UPDATE player_safety SET pause_until=0 WHERE player=?').run(id);
  }finally{db.close();}
  await remove(b,3);await save(b,3);assert.equal((await current(a)).state,'claimable');
  for(const n of [0,1,2])await save(other,n);
  const [first,second]=await Promise.all([a,other].map(who=>who('discovery/claim',{ids:[draft.id]})));
  const winner=first.data.receipts[0].claimId?a:other,loser=winner===a?other:a;
  const receipt=(first.data.receipts[0].claimId?first:second).data.receipts[0];
  assert.ok(receipt.claimId);assert.equal((await current(loser)).state,'soldOut');
  assert.deepEqual((await winner('discovery/claim',{ids:[draft.id]})).data.receipts[0],receipt);
  assert.equal((await loser('discovery/equip',{slot:'badge',claimId:receipt.claimId})).status,403);
  await winner('discovery/equip',{slot:'badge',claimId:receipt.claimId});
  assert.equal((await winner('discovery')).data.equipped.badge,receipt.claimId);
  const ref='claim-'+receipt.claimId;
  assert.equal((await loser('support',{category:'account',message:'Check this reference please.',reference:ref})).status,404);
  const ticket=await winner('support',{category:'account',message:'Help with this claim please.',reference:ref});
  assert.equal(ticket.status,200);assert.equal((await staff('admin/support')).data.tickets[0].reference,ref);
  assert.equal((await staff('admin/players?q='+ref)).data.length,1);
  const report=(await staff('admin/discovery/report?scope=site&caseStatus=open')).data;
  assert.equal(report.totals.claims,1);assert.equal(report.totals.cases,1);assert.equal(report.list[0].reference,ref);
  assert.equal((await winner('account/export')).data.discovery.equipped.badge,receipt.claimId);
  const offers=[];
  for(const color of ['plum','forest']){
    const offer=(await staff('admin/discovery/programs',{action:'save',version:0,spec:{...spec,template:'offer',slot:'theme',color}})).data;
    await staff('admin/discovery/programs',{action:'publish',id:offer.id,version:1});offers.push(offer.id);
  }
  const old=(await winner('discovery/claim',{ids:[offers[0]]})).data.receipts[0];
  const batch=(await winner('discovery/claim',{ids:offers})).data.receipts;assert.equal(batch.length,2);assert.deepEqual(batch[0],old);assert.notEqual(batch[1].claimId,old.claimId);
});

test('scheduled campaigns recheck brand, topic, channel, current break, quiet hours and consent at dispatch',async t=>{
  const {base,database}=await startSandbox(t),staff=client(base),person=client(base);
  await staff('admin/login',staffCredentials);await register(person);
  const pref={topic:'collections',channel:'inbox',granted:true};
  const arm=async(patch={})=>{
    const spec={...pref,subjectEn:'Collection update',subjectFr:'Nouvelle collection',textEn:'Browse the collection.',textFr:'Consultez la collection.',
      quietStart:0,quietEnd:0,destination:'',localTime:'2025-01-15T12:00',...patch};
    const res=await staff('admin/discovery/campaigns',{action:'save',version:0,spec});assert.equal(res.status,200);
    assert.equal((await staff('admin/discovery/campaigns',{id:res.data.id,action:'schedule',version:1})).status,200);return res.data.id;
  };
  const run=()=>staff('admin/discovery/dispatch',{});
  const outcomes=async id=>(await staff('admin/discovery/campaigns')).data.items.find(c=>c.id===id).outcomes;
  await person('discovery/preferences',pref);
  const good=await arm();await run();await run();assert.deepEqual(await outcomes(good),[{state:'delivered',reason:'',count:1}]);
  let messages=(await person('discovery')).data.messages;assert.equal(messages.length,1);
  await person('discovery/read',{id:messages[0].id});assert.ok((await person('discovery')).data.messages[0].readAt);
  const muted=await arm();await person('discovery/preferences',{...pref,granted:false});await run();
  assert.equal((await outcomes(muted))[0].reason,'optedOut');
  await person('discovery/preferences',pref);const quiet=await arm();
  const db=new DatabaseSync(database);
  try{let c=db.prepare('SELECT spec FROM contact_campaigns WHERE id=?').get(quiet);const s=JSON.parse(c.spec);
    s.quietStart=Number(new Intl.DateTimeFormat('en-GB',{timeZone:s.zone,hour:'2-digit',hourCycle:'h23'}).format(Date.now()));s.quietEnd=(s.quietStart+2)%24;
    db.prepare('UPDATE contact_campaigns SET spec=? WHERE id=?').run(JSON.stringify(s),quiet);
  }finally{db.close();}
  await run();assert.equal((await outcomes(quiet))[0].reason,'quietHours');
  const paused=await arm();await person('safety/pause',{});await run();assert.equal((await outcomes(paused))[0].reason,'accountBreak');
  assert.equal((await person('discovery')).data.messages.length,1);
  assert.equal((await person('password-reset/request',{email:playerCredentials.email,locale:'en-CA'})).status,200);
});
async function growthAccount(who,alias,extra={}){
  const credentials={email:alias+'@example.test',password:'private-fixture-password'};
  const signup=await who('signup',{...credentials,...extra});
  assert.equal(signup.status,200,JSON.stringify(signup.data));
  assert.equal((await who('email-verification/complete',{token:new URL(signup.data.verifyUrl).searchParams.get('verify')})).status,200);
  const login=await who('login',credentials);assert.equal(login.status,200);return login.data.id;
}
async function growthPreview(staff,name){
  const card=(await staff('admin/coming-soon',cardDraft(name))).data.title;
  assert.equal((await staff('admin/coming-soon',{slug:card.slug,version:card.version,action:'publish'})).status,200);return card;
}
const week=7*86400000;
test('growth attributes one first save, isolates partner exports, versions placements, reconciles campaign spend and hides expired landings',async t=>{
  const {base,database}=await startSandbox(t,{appBasePath:'/casinohabibi'}),url=base+'/casinohabibi';
  const staff=client(url),alice=client(url),bob=client(url),jar=new Map(),guest=client(url,jar);
  await staff('admin/login',staffCredentials);
  const a=await growthAccount(alice,'affiliate-a'),b=await growthAccount(bob,'affiliate-b');
  const partner=async(id,code)=>(await staff('admin/growth/partner',{name:code,code,playerId:id})).data.id;
  const A=await partner(a,'alpha-link'),B=await partner(b,'bravo-link');assert.ok(A&&B);
  const card=await growthPreview(staff,'Coastal Skies');
  const spec={titleEn:'On the coast',titleFr:'Sur la côte',textEn:'See preview',textFr:'Voir la fiche',start:Date.now()-10000,end:Date.now()+week,preview:card.slug,currency:'CAD',budget:20000,partner:B};
  const draft=await staff('admin/growth/placement',{action:'save',version:0,slug:'coast-preview',spec});assert.equal(draft.status,200);
  const placement=draft.data.id;assert.equal((await guest('growth/banner')).data.banner,null);
  assert.equal((await staff('admin/growth/placement',{action:'publish',id:placement,version:1})).status,200);
  assert.equal((await guest('growth/banner')).data.banner.slug,'coast-preview');
  async function tag(path,jar){
    const response=await fetch(url+path,{redirect:'manual',headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}});
    for(const item of response.headers.getSetCookie()){const [k,v]=item.split(';')[0].split('=');jar.set(k,v);}
    return response;
  }
  assert.equal((await tag('/r/alpha-link',jar)).status,302);
  const id=await growthAccount(guest,'acquired-via-code',{referralCode:'bravo-link'});
  const save=(client)=>client('me/saved/'+card.id,undefined,undefined,{},'PUT');
  await save(guest);await save(guest);
  assert.equal((await alice('growth/partner')).data.report.qualified,0);
  const ownerReport=await bob('growth/partner');assert.equal(ownerReport.status,200,JSON.stringify(ownerReport.data));
  assert.equal(ownerReport.data.report.qualified,1);assert.equal(ownerReport.data.creatives.length,1);
  assert.doesNotMatch(JSON.stringify(ownerReport.data),/example\.test|playerId|budget|ownerId/);
  assert.equal((await guest('growth/partner')).status,403);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  assert.deepEqual({...db.prepare('SELECT partner,source,review FROM growth_signups WHERE player=?').get(id)},{partner:B,source:'code',review:'valid'});
  const adJar=new Map(),adGuest=client(url,adJar);
  const landed=await tag('/go/coast-preview?lang=fr',adJar);assert.equal(landed.headers.get('location'),'/casinohabibi/coming-soon/'+card.slug+'?lang=fr');
  await tag('/go/coast-preview',adJar);
  await growthAccount(adGuest,'ad-lead');await save(adGuest);
  const dupJar=new Map([['habibi_ref',adJar.get('habibi_ref')]]),dup=client(url,dupJar);
  const flagged=await growthAccount(dup,'duplicate-lead');await save(dup);
  const staffState=await staff('admin/growth');assert.equal(staffState.data.pending[0].player,flagged);
  assert.equal((await staff('admin/growth/review',{playerId:flagged,decision:'ineligible',reason:'Duplicate in the private fixture'})).status,200);
  const day=new Date().toISOString().slice(0,10);
  assert.equal((await staff('admin/growth/spend',{id:placement,entries:[{day,currency:'CAD',cents:2500}]})).status,200);
  const report=await staff('admin/growth/report?scope=site&placement='+placement);
  assert.equal(report.status,200,JSON.stringify(report.data));assert.equal(report.data.qualified,1);assert.equal(report.data.visits,1);
  assert.equal(report.data.costs[0].perSaver,2500);assert.equal(report.data.costs[0].budget,20000);assert.equal(report.data.visitSignupRate,1);
  assert.equal((await staff('admin/growth/report?scope=test&placement='+placement)).data.visits,0);
  assert.equal((await staff('admin/growth/report?brand=other')).status,403);
  assert.equal((await staff('admin/growth/placement',{action:'save',id:placement,version:2,spec:{...spec,titleEn:'Revised'}})).status,200);
  assert.equal((await guest('growth/banner')).data.banner.titleEn,'On the coast');
  const past={...spec,start:Date.now()-week,end:Date.now()-1};
  db.prepare('UPDATE growth_placements SET live=? WHERE id=?').run(JSON.stringify(past),placement);
  assert.equal((await guest('growth/banner')).data.banner,null);assert.equal((await tag('/go/coast-preview',adJar)).status,404);
  db.prepare('UPDATE growth_placements SET live=? WHERE id=?').run(JSON.stringify(spec),placement);
  const stored=db.prepare('SELECT version FROM coming_soon_titles WHERE id=?').get(card.id);
  assert.equal((await staff('admin/coming-soon',{action:'archive',slug:card.slug,version:stored.version})).status,200);
  assert.equal((await tag('/go/coast-preview',adJar)).status,404);
});

test('growth reconciles a mature 6/10 cohort, repeated observations and reproducible holdout assignments',async t=>{
  const {base,database}=await startSandbox(t),staff=client(base);await staff('admin/login',staffCredentials);
  const card=await growthPreview(staff,'Northern Lights'),now=Date.now(),day=86400000;
  const spec={titleEn:'North',titleFr:'Nord',textEn:'',textFr:'',start:now-60*day,end:now+15*day,preview:card.slug,currency:'CAD',budget:0};
  const id=(await staff('admin/growth/placement',{action:'save',version:0,slug:'north-banner',spec})).data.id;
  await staff('admin/growth/placement',{action:'publish',version:1,id});
  const ex=(await staff('admin/growth/experiment',{placement:id,name:'First save study',start:now-40*day,end:now+day,days:7,holdout:50})).data.id;assert.ok(ex);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  const seeds=[],signupAt=now-40*day;const {createHash}=await import('node:crypto');
  db.prepare('UPDATE growth_experiments SET seed=? WHERE id=?').run('reproducible-study',ex);
  for(let i=0;i<10;i++){
    const pid=Number(db.prepare("INSERT INTO players(email,password,tenant_id,email_verified,first_verified_at,report_fixture) VALUES(?,'fixture','sandbox',1,?,0)").run('cohort-'+i+'@example.test',signupAt+1000).lastInsertRowid);
    db.prepare("INSERT INTO growth_signups(player,tenant,at,source,review,flag) VALUES(?,'sandbox',?,'direct','valid','')").run(pid,signupAt);
    const token=randomBytes(32).toString('hex');
    db.prepare("INSERT INTO sessions(token,player,expires,tenant_id,created_at) VALUES(?,?,?,'sandbox',?)").run(createHash('sha256').update(token).digest('hex'),pid,now+day,now);
    const user=client(base,new Map([['northplay',token]]));const before=(await user('growth/banner')).data.banner?.slug||'holdout';
    assert.equal((await user('growth/banner')).data.banner?.slug||'holdout',before);seeds.push({pid,user,before});
  }
  assert.equal(new Set(seeds.map(s=>s.before)).size,2);assert.equal(db.prepare('SELECT count(*) AS n FROM growth_assignments').get().n,10);
  db.prepare('UPDATE growth_assignments SET at=? WHERE experiment=?').run(signupAt+500,ex);
  for(const {user,pid} of seeds.slice(0,6)){
    for(let i=0;i<2;i++)await user('me/saved/'+card.id,undefined,undefined,{},'PUT');
    db.prepare('UPDATE growth_first_saves SET at=? WHERE player=?').run(signupAt+day,pid);
  }
  for(const {pid} of seeds.slice(0,2))db.prepare("INSERT INTO player_report_visits VALUES('sandbox',?,?,?)").run(pid,Math.floor((signupAt+26*day)/60000),signupAt+26*day);
  const ctx='?days=90&scope=site&asOf='+now;
  const report=await staff('admin/growth/report'+ctx);assert.equal(report.status,200,JSON.stringify(report.data));
  const r=report.data;assert.deepEqual([r.mature,r.activated,r.activationRate,r.returnCohort,r.returning],[10,6,0.6,6,2]);
  assert.equal(r.experiments.reduce((s,e)=>s+e.cohort,0),10);assert.equal(r.experiments.reduce((s,e)=>s+e.converted,0),6);
  assert.deepEqual((await staff('admin/growth/report'+ctx)).data,r);
  for(const metric of ['visits','verified','qualified','activated','returning']){
    const detail=await staff('admin/growth/report'+ctx+'&metric='+metric);
    assert.equal(detail.status,200);assert.equal(detail.data.daily.reduce((sum,row)=>sum+row.total,0),r[metric]);
    assert.ok(detail.data.daily.every(row=>Object.keys(row).length===2));
  }
  const control=seeds.find(s=>s.before==='holdout');
  db.prepare('UPDATE growth_assignments SET at=? WHERE experiment=? AND player=?').run(now-1000,ex,control.pid);
  await staff('admin/growth/experiment',{close:ex});assert.equal((await control.user('growth/banner')).data.banner,null);
});

test('invite-only collections keep private shelves separate, moderation and voting finish the correct quests',async t=>{
  const {base}=await startSandbox(t);const [staff,owner,member,outsider]=Array.from({length:4},()=>client(base));
  await staff('admin/login',staffCredentials);await growthAccount(owner,'list-owner');const mid=await growthAccount(member,'list-member');await growthAccount(outsider,'outside-list');
  const privateCard=await growthPreview(staff,'My Secret Favorite'),shared=await growthPreview(staff,'Community Title');
  await owner('me/saved/'+privateCard.id,undefined,undefined,{},'PUT');
  const baseSpec=(await member('discovery')).data.items[0].spec,quests={};
  for(const template of ['Q05','Q07']){
    const d=(await staff('admin/discovery/programs',{action:'save',version:0,spec:{...baseSpec,template,titleEn:template,titleFr:template}})).data;
    await staff('admin/discovery/programs',{action:'publish',id:d.id,version:1});await member('discovery/join',{id:d.id});quests[template]=d.id;
  }
  const id=(await owner('community/create',{name:'Film night'})).data.id;
  assert.equal((await outsider('community?id='+id)).status,404);
  const invite=async()=>(await owner('community/invite',{id})).data;
  const denied=await invite();await owner('community/revoke',{id,inviteId:denied.inviteId});
  assert.equal((await member('community/join',{token:denied.token})).status,404);
  const valid=await invite();assert.equal((await member('community/join',{token:valid.token})).status,200);
  assert.equal((await outsider('community/join',{token:valid.token})).status,404);
  await member('community/add',{id,kind:'preview',value:shared.slug});await member('community/add',{id,kind:'theme',value:'Moon'});
  const organizer=(await owner('community?id='+id)).data;
  assert.equal(organizer.entries.length,2);assert.doesNotMatch(JSON.stringify(organizer),/my-secret-favorite/i);
  const ent=organizer.entries.find(e=>e.kind==='preview').id;
  assert.equal((await member('community/moderate',{id,entryId:ent,state:'approved'})).status,403);
  await owner('community/moderate',{id,entryId:ent,state:'approved'});
  assert.equal((await member('support',{category:'account',message:'Please review this shared list.',reference:'list-'+id})).status,200);
  assert.equal((await outsider('support',{category:'account',message:'Please review this shared list.',reference:'list-'+id})).status,404);
  const poll=(await staff('admin/growth/poll',{action:'open',titleEn:'Next theme',titleFr:'Prochain thème',options:[{titleEn:'North',titleFr:'Nord'},{titleEn:'South',titleFr:'Sud'}]})).data.id;
  assert.equal((await member('community/result',{id:poll})).status,409);
  await member('community/vote',{id:poll,choice:0});await member('community/vote',{id:poll,choice:1});
  await staff('admin/growth/poll',{id:poll,action:'publishResults'});
  assert.deepEqual((await member('community/result',{id:poll})).data.counts,[0,1]);
  const results=(await member('discovery')).data.items;for(const quest of Object.values(quests))assert.equal(results.find(i=>i.id===quest).state,'claimable');
  await owner('community/remove',{id,playerId:mid});assert.equal((await member('community?id='+id)).status,404);
  assert.equal((await member('community/join',{token:valid.token})).status,404);
  assert.equal((await member('community')).data.lists.length,0);
});

test('isolated demo credits grant debit reverse and retry exactly once, respect concurrent debits and reject live and nonfixture accounts',async t=>{
  const isolated=await startSandbox(t,{testCredits:true}),normal=await startSandbox(t),staff=client(isolated.base),live=client(normal.base),player=client(isolated.base);
  await staff('admin/login',staffCredentials);await live('admin/login',staffCredentials);
  const pid=await growthAccount(player,'ledger-player');
  const db=new DatabaseSync(isolated.database);t.after(()=>db.close());
  const input=(kind,amount)=>({playerId:pid,kind,amount,reason:'Private ledger acceptance'});
  assert.equal((await staff('admin/growth/credits',input('grant',100))).status,403);
  db.exec("INSERT INTO report_fixture_tenants VALUES('sandbox')");
  assert.equal((await staff('admin/growth/credits',input('grant',100))).status,403);
  db.prepare('UPDATE players SET report_fixture=1 WHERE id=?').run(pid);
  assert.equal((await player('admin/growth/credits',input('grant',100))).status,401);
  const grant=await staff('admin/growth/credits',input('grant',100));assert.equal(grant.data.balance,100);
  const req={'X-Request-ID':randomUUID()};const debit=await staff('admin/growth/credits',input('debit',20),undefined,req);assert.equal(debit.data.balance,80);
  const reverse={playerId:pid,kind:'reverse',original:debit.data.id,reason:'Undo test debit'};
  const reversed=await staff('admin/growth/credits',reverse);assert.equal(reversed.data.balance,100);
  assert.deepEqual((await staff('admin/growth/credits',input('debit',20),undefined,req)).data,debit.data);
  assert.equal((await staff('admin/growth/credits',reverse)).status,409);
  const h=(await staff('admin/growth/credits?player='+pid)).data;assert.equal(h.entries.length,3);assert.equal(h.balance,100);
  const concurrent=await Promise.all([1,2].map(()=>staff('admin/growth/credits',input('debit',80))));assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
  assert.equal((await staff('admin/growth/credits?player='+pid)).data.balance,20);
  assert.equal((await live('admin/growth/credits',input('grant',100))).status,403);
});
test('catalogue quests explain the live supply by language, retain archived progress and give staff current destinations',async t=>{
  const {base}=await startSandbox(t),admin=client(base),user=client(base);await admin('admin/login',staffCredentials);await register(user);
  const item=async locale=>(await user('discovery?locale='+locale)).data.items.find(i=>i.spec.template==='Q01');
  const status=async()=> (await admin('admin/discovery/programs?withCatalogue=1')).data;
  const zero=await item('fr-CA');assert.deepEqual(zero.catalogue,{visible:0,remaining:0,missing:3});assert.equal((await status()).threeSaveQuest,true);
  assert.ok(Array.isArray((await admin('admin/discovery/programs')).data));await user('discovery/join',{id:zero.id});
  const first=await growthPreview(admin,'Spring Coast');
  assert.equal((await item('fr-CA')).catalogue.missing,2);await user('me/saved/'+first.id,undefined,undefined,{},'PUT');
  const archive=await admin('admin/coming-soon',{action:'archive',slug:first.slug,version:2});assert.equal(archive.status,200);
  const draft=(await admin('admin/coming-soon',cardDraft('French Collection',{locales:['fr-CA']}))).data.title;
  await admin('admin/coming-soon',{action:'publish',slug:draft.slug,version:draft.version});
  assert.deepEqual((await item('fr-CA')).catalogue,{visible:1,remaining:1,missing:1});
  assert.deepEqual((await item('en-CA')).catalogue,{visible:0,remaining:0,missing:2});
  await growthPreview(admin,'Winter Coast');
  assert.equal((await item('fr-CA')).catalogue.missing,0);assert.equal((await status()).previewCount,2);
  const options=(await admin('admin/growth?view=placements')).data.previewOptions;
  assert.equal(options.length,2);assert.equal(options.some(x=>x.slug===first.slug),false);assert.equal(options.find(x=>x.slug===draft.slug).titleFr,'French Collection FR');
});

async function checked(who, path, input, host, headers, method) {
  const result = await who(path, input, host, headers, method);
  assert.equal(result.status, 200, `${path} ${JSON.stringify(result.data).slice(0, 160)}`);
  return result.data;
}
async function editorialFixture(staff, slug = 'field-notes') {
  const content = {
    titleEn: 'Field notes',
    titleFr: 'Carnet du soir',
    bodyEn: 'Read the collected previews.',
    bodyFr: 'Découvrez les fiches de la collection.',
    artwork: '',
    altEn: '',
    altFr: '',
    linkEn: '',
    linkFr: '',
    target: '',
    addressEn: 'night-notes',
    addressFr: 'carnet-du-soir',
    collection: 'night trains'
  };
  await checked(staff, 'admin/website-content', { kind: 'help', slug, version: 0, action: 'save', content });
  await checked(staff, 'admin/website-content', { kind: 'help', slug, version: 1, action: 'publish' });
  return content;
}
async function questFixture(staff, template, overrides = {}) {
  const spec = {
    template,
    titleEn: template,
    titleFr: template,
    itemEn: 'Souvenir',
    itemFr: 'Souvenir',
    slot: 'badge',
    color: 'gold',
    startsAt: 0,
    endsAt: null,
    claimUntil: null,
    stock: null,
    collection: '',
    target: '',
    pair: [],
    ...overrides
  };
  const draft = await checked(staff, 'admin/discovery/programs', { action: 'save', version: 0, spec });
  await checked(staff, 'admin/discovery/programs', { action: 'publish', id: draft.id, version: draft.version });
  return draft.id;
}
test('handoff: a localized guide, two real collection pages, the saved shelf and all nine quests yield the same receipts on two devices', async (t) => {
  const { base } = await startSandbox(t, { appBasePath: '/casinohabibi' }),
    site = base + '/casinohabibi';
  const phoneJar = new Map(),
    phone = client(site, phoneJar),
    desktop = client(site),
    staff = client(site),
    owner = client(site);
  await checked(staff, 'admin/login', staffCredentials);
  await register(phone);
  await checked(desktop, 'login', playerCredentials);
  await growthAccount(owner, 'organizer-bridge');
  const cards = [];
  for (const [name, en, fr] of [
    ['Night Shifts', 'Night trains', 'Trains de nuit'],
    ['Garden Party', 'Spring garden', 'Jardin de printemps'],
    ['Weekend Rail', 'Night trains', 'Trains de nuit']
  ]) {
    const c = (await checked(staff, 'admin/coming-soon', cardDraft(name, { collectionEn: en, collectionFr: fr })))
      .title;
    await checked(staff, 'admin/coming-soon', { action: 'publish', slug: c.slug, version: c.version });
    cards.push(c);
  }
  const guide = await editorialFixture(staff),
    programs = {},
    args = {
      Q02: { target: 'carnet-du-soir', collection: 'Trains de nuit' },
      Q03: { target: 'night-notes' },
      Q06: { target: 'field-notes', collection: 'Night trains|Jardin de printemps' },
      Q09: { pair: [cards[0].id, cards[2].id] }
    };
  for (const n of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07', 'Q08', 'Q09']) {
    programs[n] = await questFixture(staff, n, args[n]);
    await checked(phone, 'discovery/join', { id: programs[n] });
  }
  const getItem = async (n) =>
    (await checked(desktop, 'discovery?locale=fr-CA')).items.find((i) => i.id === programs[n]);
  const html = async (path, method = 'GET') =>
    fetch(site + path, {
      method,
      redirect: 'manual',
      headers: { Cookie: [...phoneJar].map(([k, v]) => k + '=' + v).join('; ') }
    });
  const path = '/help/carnet-du-soir?lang=fr';
  assert.deepEqual(
    (await getItem('Q02')).collections.map((c) => c.titleFr),
    ['Trains de nuit']
  );
  assert.equal((await html(path, 'HEAD')).status, 200);
  assert.equal((await getItem('Q02')).marks.length, 0);
  assert.equal((await html('/help/field-notes?lang=fr')).status, 301);
  assert.equal((await getItem('Q02')).marks.length, 0);
  assert.match(await (await html(path)).text(), /Carnet du soir/);
  assert.equal(
    (await getItem('Q02')).marks.length,
    1,
    'opening the actual server-rendered guide must register the read'
  );
  await checked(phone, 'discovery/visit', { kind: 'guideAck', key: 'carnet-du-soir' });
  await html('/?lang=fr&category=favorites');
  assert.equal((await getItem('Q03')).marks.length, 2);
  await html('/?lang=fr&collection=night%20trains');
  await html('/?lang=fr&collection=night%20trains');
  await html('/?lang=fr&collection=spring%20garden');
  await html(path);
  assert.equal((await getItem('Q06')).marks.length, 3);
  const ids = [];
  for (const c of cards) {
    await checked(phone, 'coming-soon/' + c.slug + '?locale=fr-CA');
    ids.push((await checked(phone, 'me/saved/' + c.id, undefined, undefined, {}, 'PUT')).activityId);
  }
  await checked(phone, 'discovery/visit', { kind: 'activity', key: ids[0] });
  await checked(phone, 'discovery/visit', { kind: 'activity', key: ids[1] });
  await checked(desktop, 'discovery/visit', { kind: 'activityAck', key: ids[1] });
  const lists = [];
  for (const name of ['Books', 'Movies']) {
    const list = (await checked(owner, 'community/create', { name })).id;
    lists.push(list);
    const { token } = await checked(owner, 'community/invite', { id: list });
    await checked(phone, 'community/join', { token });
  }
  await checked(desktop, 'community/add', { id: lists[1], kind: 'preview', value: cards[0].slug });
  const polls = [];
  for (const name of ['Autumn', 'Winter']) {
    const p = await checked(staff, 'admin/growth/poll', {
      action: 'open',
      titleEn: name,
      titleFr: name,
      options: [
        { titleEn: 'A', titleFr: 'A' },
        { titleEn: 'B', titleFr: 'B' }
      ]
    });
    await checked(phone, 'community/vote', { id: p.id, choice: 1 });
    polls.push(p.id);
  }
  await checked(staff, 'admin/growth/poll', { action: 'publishResults', id: polls[1] });
  await checked(desktop, 'community/result', { id: polls[1] });
  for (const n of Object.keys(programs)) assert.equal((await getItem(n)).state, 'claimable', n);
  const receipts = await checked(desktop, 'discovery/claim', { ids: Object.values(programs) });
  assert.equal(new Set(receipts.receipts.map((r) => r.claimId)).size, 9);
  assert.deepEqual(
    (await checked(phone, 'discovery/claim', { ids: Object.values(programs) })).receipts,
    receipts.receipts
  );
  const renamed = { ...guide, addressFr: 'carnet-de-nuit' };
  await checked(staff, 'admin/website-content', {
    kind: 'help',
    slug: 'field-notes',
    version: 2,
    action: 'save',
    content: renamed
  });
  await checked(staff, 'admin/website-content', {
    kind: 'help',
    slug: 'field-notes',
    version: 3,
    action: 'publish'
  });
  assert.equal((await html(path)).status, 301);
});
test('handoff: a claim reference follows the player to the support inbox, staff report and personal export', async (t) => {
  const { base } = await startSandbox(t),
    staff = client(base),
    person = client(base),
    other = client(base);
  await checked(staff, 'admin/login', staffCredentials);
  await register(person);
  await growthAccount(other, 'support-neighbor');
  const id = await questFixture(staff, 'offer');
  const { receipts } = await checked(person, 'discovery/claim', { ids: [id] });
  const ref = 'claim-' + receipts[0].claimId;
  const ticket = await checked(person, 'support', {
    category: 'account',
    message: 'Please check the cosmetic on this receipt.',
    reference: ref
  });
  const staffTicket = (await checked(staff, 'admin/support')).tickets.find((i) => i.id === ticket.id);
  assert.equal(staffTicket.reference, ref);
  assert.equal((await checked(person, 'support')).find((i) => i.id === ticket.id).reference, ref);
  const exported = await checked(person, 'account/export');
  assert.equal(exported.supportRequests.find((i) => i.id === ticket.id)?.reference, ref);
  assert.equal(
    exported.discovery.items.some((i) => !i.startedAt && !i.award),
    false
  );
  assert.equal((await checked(other, 'account/export')).supportRequests.length, 0);
  assert.equal((await checked(staff, 'admin/discovery/report?scope=site&metric=cases')).list[0].reference, ref);
});
test('handoff: revoking all promotional emails updates each topic on the other device; opting in to one topic leaves the others unsubscribed', async (t) => {
  const { base } = await startSandbox(t),
    phone = client(base),
    laptop = client(base);
  await register(phone);
  await checked(laptop, 'login', playerCredentials);
  const pref = (topic) => ({ topic, channel: 'email', granted: true });
  for (const topic of ['collections', 'rewards']) await checked(phone, 'discovery/preferences', pref(topic));
  await checked(phone, 'discovery/preferences', { topic: 'announcements', channel: 'inbox', granted: true });
  assert.equal((await checked(laptop, 'account')).marketingEmailConsent, true);
  await checked(laptop, 'account/consents', { marketingEmail: false });
  const choices = async () => (await checked(phone, 'discovery')).choices;
  assert.deepEqual(
    (await choices()).filter((c) => c.channel === 'email' && c.granted),
    []
  );
  assert.equal((await choices()).find((c) => c.channel === 'inbox' && c.topic === 'announcements').granted, true);
  await checked(phone, 'discovery/preferences', pref('rewards'));
  assert.deepEqual(
    (await choices()).filter((c) => c.channel === 'email' && c.granted).map((c) => c.topic),
    ['rewards']
  );
  assert.ok(
    (await checked(laptop, 'password-reset/request', { email: playerCredentials.email, locale: 'fr-CA' })).resetUrl
  );
});
test('handoff: the participation deadline closes an undated-claim free offer and blocks late quest enrolment', async (t) => {
  const { base } = await startSandbox(t),
    staff = client(base),
    p = client(base);
  await checked(staff, 'admin/login', staffCredentials);
  await register(p);
  const past = Date.now() - 60000;
  const offer = await questFixture(staff, 'offer', { endsAt: past });
  assert.equal((await checked(p, 'discovery/claim', { ids: [offer] })).receipts[0].state, 'expired');
  const quest = await questFixture(staff, 'Q01', { claimUntil: Date.now() + 900 });
  await new Promise((r) => setTimeout(r, 940));
  assert.equal((await p('discovery/join', { id: quest })).status, 409);
});
test('handoff: banners, partner creatives and an inbox message land on an eligible published page in the reader’s language', async (t) => {
  const { base } = await startSandbox(t, { appBasePath: '/casinohabibi' }),
    site = base + '/casinohabibi',
    staff = client(site),
    jar = new Map(),
    p = client(site, jar),
    publicUser = client(site);
  await checked(staff, 'admin/login', staffCredentials);
  const pid = await growthAccount(p, 'fr-creator', { locale: 'fr-CA' });
  const { id: partner } = await checked(staff, 'admin/growth/partner', {
    name: 'Studio FR',
    code: 'studio-fr',
    playerId: pid
  });
  const draft = (
    await checked(
      staff,
      'admin/coming-soon',
      cardDraft('Only French', {
        locales: ['fr-CA'],
        collectionEn: 'Night trains',
        collectionFr: 'Trains de nuit'
      })
    )
  ).title;
  await checked(staff, 'admin/coming-soon', { action: 'publish', slug: draft.slug, version: draft.version });
  await editorialFixture(staff);
  const bilingual = await growthPreview(staff, 'Both languages'),
    pair = await questFixture(staff, 'Q09', { pair: [draft.id, bilingual.id] });
  const previews = async (lang) =>
    (await checked(p, 'discovery?locale=' + lang)).items.find((i) => i.id === pair).previews.map((x) => x.slug);
  assert.deepEqual(await previews('en-CA'), [bilingual.slug]);
  assert.deepEqual(await previews('fr-CA'), [draft.slug, bilingual.slug]);
  const english = (await checked(staff, 'admin/coming-soon', cardDraft('Only English', { locales: ['en-CA'] })))
    .title;
  await checked(staff, 'admin/coming-soon', { action: 'publish', slug: english.slug, version: english.version });
  const pairedSpec = (await checked(staff, 'admin/discovery/programs')).find((i) => i.id === pair).spec;
  const impossible = await checked(staff, 'admin/discovery/programs', {
    action: 'save',
    version: 0,
    spec: { ...pairedSpec, pair: [draft.id, english.id] }
  });
  assert.equal(
    (
      await staff('admin/discovery/programs', {
        action: 'publish',
        id: impossible.id,
        version: impossible.version
      })
    ).status,
    409
  );
  const b = await checked(staff, 'admin/growth/placement', {
    action: 'save',
    version: 0,
    slug: 'studio-spot',
    spec: {
      titleEn: 'Studio',
      titleFr: 'Studio',
      textEn: '',
      textFr: '',
      start: 0,
      end: Date.now() + week,
      preview: draft.slug,
      currency: 'CAD',
      budget: 100,
      partner
    }
  });
  await checked(staff, 'admin/growth/placement', { action: 'publish', id: b.id, version: b.version });
  assert.equal((await checked(publicUser, 'growth/banner?locale=en-CA')).banner, null);
  assert.equal((await checked(publicUser, 'growth/banner?locale=fr-CA')).banner.slug, 'studio-spot');
  assert.equal((await checked(p, 'growth/partner?locale=en-CA')).creatives.length, 0);
  const link = await fetch(site + '/go/studio-spot', { redirect: 'manual' });
  assert.equal(link.status, 302);
  assert.match(link.headers.get('Location'), /\?lang=fr/);
  assert.equal((await fetch(base + link.headers.get('location'))).status, 200);
  await checked(p, 'discovery/preferences', { topic: 'collections', channel: 'inbox', granted: true });
  const message = await checked(staff, 'admin/discovery/campaigns', {
    action: 'save',
    version: 0,
    spec: {
      topic: 'collections',
      channel: 'inbox',
      subjectEn: 'New guide',
      subjectFr: 'Nouveau guide',
      textEn: 'Read',
      textFr: 'Lire',
      quietStart: 0,
      quietEnd: 0,
      localTime: '2025-01-15T12:00',
      destination: '/help/night-notes'
    }
  });
  await checked(staff, 'admin/discovery/campaigns', {
    action: 'schedule',
    id: message.id,
    version: message.version
  });
  await checked(staff, 'admin/discovery/dispatch', {});
  const fr = (await checked(p, 'discovery?locale=fr-CA')).messages[0];
  assert.equal(fr.destination, '/help/carnet-du-soir?lang=fr');
  const en = (await checked(p, 'discovery?locale=en-CA')).messages[0];
  assert.equal(en.destination, '/help/night-notes?lang=en');
  assert.match(await (await fetch(site + fr.destination)).text(), /Carnet du soir/);
  await checked(staff, 'admin/website-content', {
    kind: 'help',
    slug: 'field-notes',
    action: 'archive',
    version: 2
  });
  assert.equal((await checked(p, 'discovery?locale=fr-CA')).messages[0].destination, null);
});
test('handoff: the authorized publisher can trace their own quest, poll and placement actions in the existing brand audit', async (t) => {
  const { base } = await startSandbox(t),
    admin = client(base),
    publisher = client(base),
    peer = client(base);
  await checked(admin, 'admin/login', staffCredentials);
  const creds = { email: 'author-bridge@example.test', password: 'private-publisher-password' },
    other = { email: 'reviewer-bridge@example.test', password: 'private-reviewer-password' };
  for (const ident of [creds, other])
    await checked(admin, 'admin/staff', {
      ...ident,
      role: 'operator_content',
      publishWebsite: true,
      reason: 'Private acceptance publisher'
    });
  await checked(publisher, 'admin/login', creds);
  await checked(peer, 'admin/login', other);
  await questFixture(publisher, 'offer');
  const card = await growthPreview(admin, 'Evening Garden');
  const d = await checked(publisher, 'admin/growth/placement', {
    action: 'save',
    version: 0,
    slug: 'audit-link',
    spec: {
      titleEn: 'Garden',
      titleFr: 'Jardin',
      textEn: '',
      textFr: '',
      start: 0,
      end: Date.now() + week,
      preview: card.slug,
      currency: 'CAD',
      budget: 0
    }
  });
  await checked(publisher, 'admin/growth/placement', { action: 'publish', id: d.id, version: d.version });
  await checked(publisher, 'admin/growth/poll', {
    action: 'open',
    titleEn: 'Garden',
    titleFr: 'Jardin',
    options: [
      { titleEn: 'A', titleFr: 'A' },
      { titleEn: 'B', titleFr: 'B' }
    ]
  });
  const events = await checked(publisher, 'admin/audit');
  for (const action of ['discovery_publish', 'placement_publish', 'poll_open'])
    assert.ok(
      events.events.some((e) => e.action === action),
      action
    );
  assert.equal(
    (await checked(peer, 'admin/audit')).events.some((e) => e.actor === creds.email),
    false
  );
});
test('recovery preserves guide evidence, entitlements, support, campaign delivery, community, attribution, experiments and test credit receipts', async (t) => {
  const encryptionKey = randomBytes(32).toString('hex'),
    source = await startSandbox(t, { encryptionKey, testCredits: true });
  const staff = client(source.base),
    phone = client(source.base),
    organizer = client(source.base);
  await checked(staff, 'admin/login', staffCredentials);
  const fixture = new DatabaseSync(source.database);
  try {
    fixture.exec("INSERT INTO report_fixture_tenants VALUES('sandbox')");
  } finally {
    fixture.close();
  }
  const affiliateId = await growthAccount(organizer, 'snapshot-organizer');
  await checked(staff, 'admin/growth/partner', {
    name: 'Reading club',
    code: 'reading-club',
    playerId: affiliateId
  });
  const playerId = await growthAccount(phone, 'snapshot-reader', {
    referralCode: 'reading-club',
    locale: 'fr-CA'
  });
  const mark = new DatabaseSync(source.database);
  try {
    mark.prepare('UPDATE players SET report_fixture=1 WHERE id IN (?,?)').run(playerId, affiliateId);
  } finally {
    mark.close();
  }
  const card = (
    await checked(
      staff,
      'admin/coming-soon',
      cardDraft('Sleeper train', { collectionEn: 'Night trains', collectionFr: 'Trains de nuit' })
    )
  ).title;
  await checked(staff, 'admin/coming-soon', { action: 'publish', slug: card.slug, version: card.version });
  await editorialFixture(staff);
  const now = Date.now(),
    placement = await checked(staff, 'admin/growth/placement', {
      action: 'save',
      version: 0,
      slug: 'reading-preview',
      spec: {
        titleEn: 'Sleeper',
        titleFr: 'Train de nuit',
        textEn: 'New preview',
        textFr: 'Nouvelle fiche',
        start: now - 60000,
        end: now + week,
        preview: card.slug,
        currency: 'CAD',
        budget: 0
      }
    });
  await checked(staff, 'admin/growth/placement', { action: 'publish', id: placement.id, version: 1 });
  const experiment = await checked(staff, 'admin/growth/experiment', {
    placement: placement.id,
    name: 'Reading group',
    start: now - 60000,
    end: now + week,
    days: 7,
    holdout: 50
  });
  await checked(phone, 'growth/banner?locale=fr-CA');
  const enrollment = await questFixture(staff, 'Q03', { target: 'carnet-du-soir' });
  await checked(phone, 'discovery/join', { id: enrollment });
  await checked(phone, 'help/carnet-du-soir?locale=fr-CA');
  const offer = await questFixture(staff, 'offer', {
    slot: 'theme',
    itemEn: 'Train ticket',
    itemFr: 'Billet de train'
  });
  const award = (await checked(phone, 'discovery/claim', { ids: [offer] })).receipts[0];
  await checked(phone, 'discovery/equip', { slot: 'theme', claimId: award.claimId });
  const reference = 'claim-' + award.claimId;
  const ticket = await checked(phone, 'support', {
    category: 'account',
    message: 'Please check this train ticket receipt.',
    reference
  });
  const list = (await checked(organizer, 'community/create', { name: 'Train club' })).id;
  await checked(phone, 'community/join', {
    token: (await checked(organizer, 'community/invite', { id: list })).token
  });
  await checked(phone, 'community/add', { id: list, kind: 'preview', value: card.slug });
  const poll = (
    await checked(staff, 'admin/growth/poll', {
      action: 'open',
      titleEn: 'Next train',
      titleFr: 'Prochain train',
      options: [
        { titleEn: 'Night', titleFr: 'Nuit' },
        { titleEn: 'Day', titleFr: 'Jour' }
      ]
    })
  ).id;
  await checked(phone, 'community/vote', { id: poll, choice: 1 });
  await checked(staff, 'admin/growth/poll', { action: 'publishResults', id: poll });
  await checked(phone, 'me/saved/' + card.id, undefined, undefined, {}, 'PUT');
  const preference = { topic: 'collections', channel: 'inbox', granted: true };
  await checked(phone, 'discovery/preferences', preference);
  const campaign = await checked(staff, 'admin/discovery/campaigns', {
    action: 'save',
    version: 0,
    spec: {
      ...preference,
      subjectEn: 'Travel',
      subjectFr: 'Voyage',
      textEn: 'New preview',
      textFr: 'Nouvelle fiche',
      destination: '/help/field-notes',
      localTime: '2025-01-15T12:00',
      quietStart: 0,
      quietEnd: 0
    }
  });
  await checked(staff, 'admin/discovery/campaigns', { id: campaign.id, action: 'schedule', version: 1 });
  await checked(staff, 'admin/discovery/dispatch', {});
  const credit = { playerId, kind: 'debit', amount: 20, reason: 'Test-only seat reservation' },
    request = { 'X-Request-ID': randomUUID() };
  await checked(staff, 'admin/growth/credits', {
    playerId,
    kind: 'grant',
    amount: 100,
    reason: 'Test-only allowance'
  });
  const debit = await checked(staff, 'admin/growth/credits', credit, undefined, request);
  await checked(staff, 'admin/growth/credits', {
    playerId,
    kind: 'reverse',
    original: debit.id,
    reason: 'Test-only cancellation'
  });
  const ledger = await checked(staff, 'admin/growth/credits?player=' + playerId);
  const asOf = Date.now(),
    partnerPath = 'growth/partner?asOf=' + asOf,
    partner = await checked(organizer, partnerPath);
  const reportPath = 'admin/growth/report?scope=test&days=90&asOf=' + asOf;
  const report = await checked(staff, reportPath);
  const root = await mkdtemp(join(tmpdir(), 'casino-cross-module-restore-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const op = (...args) =>
    JSON.parse(
      execFileSync(process.execPath, ['scripts/db-ops.js', ...args], {
        encoding: 'utf8',
        env: { ...process.env, APP_ENV: 'development', DATA_DIR: dirname(source.database) }
      })
    );
  const snapshot = join(root, 'snapshot.sqlite'),
    destination = join(root, 'restored'),
    hash = op('backup', snapshot).sha256;
  assert.equal(op('verify', snapshot).sha256, hash);
  assert.equal(op('prepare-restore', snapshot, destination).sourceSha256, hash);
  await checked(phone, 'discovery/equip', { slot: 'theme', claimId: null });
  await checked(organizer, 'community/remove', { id: list, playerId });
  assert.equal((await phone('community?id=' + list)).status, 404);
  await t.test('resume the same player journey in a separately restored service', async (t) => {
    const restored = await startSandbox(t, { dataDirectory: destination, encryptionKey, testCredits: true });
    const member = client(restored.base),
      admin = client(restored.base),
      affiliate = client(restored.base);
    await checked(admin, 'admin/login', staffCredentials);
    for (const [user, email] of [
      [member, 'snapshot-reader'],
      [affiliate, 'snapshot-organizer']
    ])
      await checked(user, 'login', { email: email + '@example.test', password: 'private-fixture-password' });
    const state = await checked(member, 'discovery?locale=fr-CA');
    assert.equal(state.items.find((i) => i.id === enrollment).guide.visited, true);
    assert.equal(state.equipped.theme, award.claimId);
    assert.deepEqual((await checked(member, 'discovery/claim', { ids: [offer] })).receipts, [award]);
    assert.equal(state.messages.filter((m) => m.subjectFr === 'Voyage').length, 1);
    assert.match(state.messages.find((m) => m.subjectFr === 'Voyage').destination, /carnet-du-soir\?lang=fr/);
    assert.equal(
      (await checked(member, 'account/export')).supportRequests.find((r) => r.id === ticket.id).reference,
      reference
    );
    assert.equal(
      (await checked(admin, 'admin/support')).tickets.find((r) => r.id === ticket.id).reference,
      reference
    );
    assert.equal((await checked(member, 'community?id=' + list)).entries.length, 1);
    assert.deepEqual((await checked(member, 'community/result', { id: poll })).counts, [0, 1]);
    assert.deepEqual((await checked(affiliate, partnerPath)).report, partner.report);
    assert.deepEqual(await checked(admin, reportPath), report);
    assert.deepEqual(await checked(admin, 'admin/growth/credits', credit, undefined, request), debit);
    assert.equal(ledger.balance, 100);
    assert.equal(ledger.entries.length, 3);
    assert.deepEqual(await checked(admin, 'admin/growth/credits?player=' + playerId), ledger);
    await checked(member, 'discovery/visit', { kind: 'guideAck', key: 'carnet-du-soir', locale: 'fr-CA' });
    await checked(member, 'discovery/visit', { kind: 'shelf' });
    const completed = (await checked(member, 'discovery/claim', { ids: [enrollment] })).receipts[0];
    assert.ok(completed.claimId && completed.claimId !== award.claimId);
    const db = new DatabaseSync(restored.database, { readOnly: true });
    try {
      assert.equal(
        db
          .prepare('SELECT count(*) AS n FROM growth_assignments WHERE experiment=? AND player=?')
          .get(experiment.id, playerId).n,
        1
      );
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
      assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    } finally {
      db.close();
    }
  });
});
test('cosmetic collections preserve the earned edition and restrict equipment to the owner across sessions', async (t) => {
  const { base } = await startSandbox(t),
    admin = client(base),
    phone = client(base),
    desktop = client(base),
    visitor = client(base);
  await checked(admin, 'admin/login', staffCredentials);
  await register(phone);
  await checked(desktop, 'login', playerCredentials);
  await growthAccount(visitor, 'inventory-outsider');
  const group = { rewardCollectionEn: 'First edition', rewardCollectionFr: 'Première édition' };
  const id = await questFixture(admin, 'offer', { slot: 'theme', ...group }),
    receipt = (await checked(phone, 'discovery/claim', { ids: [id] })).receipts[0];
  await checked(phone, 'discovery/equip', { slot: 'theme', claimId: receipt.claimId });
  const original = (await checked(admin, 'admin/discovery/programs')).find((p) => p.id === id);
  assert.equal(
    (
      await admin('admin/discovery/programs', {
        id,
        version: original.version,
        action: 'save',
        spec: { ...original.spec, rewardCollectionFr: '' }
      })
    ).status,
    400
  );
  const draft = await checked(admin, 'admin/discovery/programs', {
    id,
    version: original.version,
    action: 'save',
    spec: { ...original.spec, rewardCollectionEn: 'Winter', rewardCollectionFr: 'Hiver' }
  });
  await checked(admin, 'admin/discovery/programs', { id, version: draft.version, action: 'publish' });
  const mine = await checked(desktop, 'discovery');
  assert.equal(mine.items.find((i) => i.id === id).spec.rewardCollectionFr, group.rewardCollectionFr);
  assert.equal(mine.equipped.theme, receipt.claimId);
  const preview = (await checked(visitor, 'discovery')).items.find((i) => i.id === id);
  assert.equal(preview.spec.rewardCollectionFr, 'Hiver');
  assert.equal(preview.award, null);
  assert.equal((await visitor('discovery/equip', { slot: 'theme', claimId: receipt.claimId })).status, 403);
  assert.equal(
    (await checked(desktop, 'account/export')).discovery.items.find((i) => i.id === id).spec.rewardCollectionEn,
    group.rewardCollectionEn
  );
});
test('published demo rounds retain their source, enforce availability and account limits, and retry once across devices', async (t) => {
  const { base } = await startSandbox(t);
  const [staff, phone, laptop] = Array.from({ length: 3 }, () => client(base));
  await checked(staff, 'admin/login', staffCredentials);
  await register(phone);
  await checked(laptop, 'login', playerCredentials);
  const input = cardDraft('Lanterns', { category: 'slots', demoGame: 'gold', locales: ['fr-CA'] });
  assert.equal((await staff('admin/coming-soon', { ...input, demoGame: 'blackjack' })).status, 400);
  const { title } = await checked(staff, 'admin/coming-soon', input);
  const { slug } = title;
  const change = (action, version) => checked(staff, 'admin/coming-soon', { action, slug, version });
  const spin = { game: 'gold', wager: 100, requestId: randomUUID(), previewSlug: slug, locale: 'fr-CA' };
  assert.equal((await phone('play', spin)).data.error, 'demoUnavailable');
  await change('publish', title.version);
  assert.equal((await checked(phone, 'coming-soon/' + slug + '?locale=fr-CA')).demoGame, 'gold');
  assert.equal((await phone('play', { ...spin, locale: 'en-CA' })).data.error, 'demoUnavailable');
  assert.equal((await phone('play', { ...spin, game: 'aurora' })).data.error, 'demoUnavailable');
  assert.equal((await phone('play', { ...spin, locale: 'default' })).status, 400);
  const round = await checked(phone, 'play', spin);
  const outcome = JSON.parse(round.outcome);
  assert.equal(outcome.reels.length, 3);
  assert.deepEqual(outcome.preview, { slug, titleEn: input.titleEn, titleFr: input.titleFr });
  assert.equal(round.balance, 10000 + round.amount);
  assert.equal((await checked(laptop, 'play', spin)).outcome, round.outcome);
  assert.equal((await laptop('play', { ...spin, previewSlug: undefined })).status, 409);
  await checked(phone, 'safety/limit', { dailyLimit: 500 });
  assert.equal((await laptop('play', { ...spin, wager: 500, requestId: randomUUID() })).data.error, 'dailyLimit');
  const saved = await checked(staff, 'admin/coming-soon', { ...input, slug, titleFr: 'Nouveau titre', demoGame: undefined, version: 2 });
  await change('publish', saved.title.version);
  assert.equal((await checked(phone, 'coming-soon/' + slug + '?locale=fr-CA')).demoGame, 'gold');
  await change('archive', 4);
  assert.equal((await laptop('play', { ...spin, requestId: randomUUID() })).data.error, 'demoUnavailable');
  assert.equal((await checked(laptop, 'play', spin)).outcome, round.outcome);
  const activity = (await checked(laptop, 'account/export')).activity.filter(entry => entry.game);
  assert.equal(activity.length, 1);
  assert.deepEqual(JSON.parse(activity[0].outcome).preview, outcome.preview);
  const other = (await checked(staff, 'admin/coming-soon', { ...input, titleEn: 'Other slot' })).title;
  await checked(staff, 'admin/coming-soon', { action: 'publish', slug: other.slug, version: other.version });
  await checked(phone, 'safety/pause', {});
  assert.equal((await laptop('play', { ...spin, previewSlug: other.slug, requestId: randomUUID() })).data.error, 'paused');
});
test('a scoped title report reconciles with round receipts, the player history, and a linked support case', async (t) => {
  const { base, database } = await startSandbox(t);
  const [admin, support, editor, a, b, fixture] = Array.from({ length: 6 }, () => client(base));
  const pageHtml = await (await fetch(base + '/admin')).text();
  for (const id of ['overview-round-report', 'player-round-list', 'player-reward-details', 'player-reward-list']) {
    assert.ok(pageHtml.includes('id="' + id + '"'), id);
  }
  await checked(admin, 'admin/login', staffCredentials);
  for (const [role, who] of [['operator_support', support], ['operator_content', editor]]) {
    const creds = { email: role + '@example.test', password: 'operator-test-password' };
    await checked(admin, 'admin/staff', { ...creds, role });
    await checked(who, 'admin/login', creds);
  }
  const aid = await growthAccount(a, 'lantern-player');
  const bid = await growthAccount(b, 'souk-player');
  const fixtureId = await growthAccount(fixture, 'fixture-player');
  const issue = async (name, options = {}) => {
    const input = cardDraft(name, { category: 'slots', demoGame: 'gold', ...options });
    const saved = (await checked(admin, 'admin/coming-soon', input)).title;
    return (await checked(admin, 'admin/coming-soon', { action: 'publish', slug: saved.slug, version: saved.version })).title;
  };
  const original = await issue('Lanterns');
  const idle = await issue('The unplayed souk');
  const play = (who, input = {}) => checked(who, 'play', { game: 'gold', wager: 100, requestId: randomUUID(), ...input });
  await play(a);
  const source = { previewSlug: original.slug, locale: 'fr-CA' };
  const first = { ...source, requestId: randomUUID() };
  const oldRound = (await play(a, first)).history[0];
  await play(a, first);
  for (let n = 0; n < 10; n++) await play(a, source);
  const renamed = await issue('After dark', { slug: original.slug, version: original.version });
  const latest = (await play(b, source)).history[0];
  await checked(admin, 'admin/coming-soon', { action: 'archive', slug: original.slug, version: renamed.version });
  const db = new DatabaseSync(database);
  let foreignRound;
  try {
    db.prepare('UPDATE players SET report_fixture=1 WHERE id=?').run(fixtureId);
    db.prepare("INSERT INTO ledger(player,game,wager,amount,created_at,outcome,tenant_id) VALUES(?,'gold',500,-500,?,'historic text','sandbox')").run(fixtureId,Date.now());
    db.prepare("INSERT INTO ledger(player,game,wager,amount,created_at,outcome,tenant_id) VALUES(?,'gold',100,-100,0,NULL,'sandbox')").run(aid);
    db.prepare("INSERT INTO tenants VALUES('elsewhere','elsewhere','Another brand','active',?)").run(Date.now());
    const foreign = db.prepare("INSERT INTO players(email,password,tenant_id,email_verified) VALUES('local@example.invalid','unused','elsewhere',1)").run().lastInsertRowid;
    foreignRound = Number(db.prepare("INSERT INTO ledger(player,game,wager,amount,created_at,tenant_id) VALUES(?,'gold',100,-100,?,'elsewhere')").run(foreign,Date.now()).lastInsertRowid);
  } finally { db.close(); }
  const report = await checked(support, 'admin/overview?scope=site&days=7');
  assert.equal(report.demoRoundsInPeriod, 13);
  assert.equal(report.demoRoundsByGame.find(x => x.game === 'gold').rounds, 13);
  const grouped = report.demoRoundsByTitle;
  assert.equal(grouped.reduce((sum,row) => sum + row.rounds, 0), 13);
  assert.equal(grouped.reduce((sum,row) => sum + row.wagered_cents, 0), report.simulatedWagersCentsInPeriod);
  const featured = grouped.find(x => x.preview?.slug === original.slug);
  assert.deepEqual([featured.preview.titleEn, featured.rounds, featured.active_players, featured.wagered_cents], ['After dark',12,2,1200]);
  assert.equal(grouped.find(row => row.source === 'game:gold').rounds, 1);
  assert.equal(grouped.find(row => row.preview?.slug === idle.slug).rounds, 0);
  assert.equal((await checked(admin,'admin/overview?scope=test')).demoRoundsByTitle.find(row => row.source === 'game:gold').rounds,1);
  const params = new URLSearchParams({ metric:'rounds', source:featured.source, from:report.from, to:report.to, asOf:report.generatedAt, scope:'site', zone:report.reportingTimeZone });
  const path = 'admin/overview/records?' + params;
  assert.equal((await editor(path)).status,403);
  assert.equal((await admin(path+'&brand=elsewhere')).status,403);
  const list = await checked(support,path);
  assert.equal(list.total,12);assert.equal(list.entries.length,10);assert.equal(list.entries[0].id,latest.id);
  const rest = await checked(support,path+'&before='+list.nextCursor);
  assert.equal(rest.entries.length,2);assert.equal(rest.nextCursor,null);assert.equal(rest.entries.at(-1).id,oldRound.id);
  const ref = 'round-' + oldRound.id, playerPath = 'admin/players/' + aid;
  assert.deepEqual((await checked(support,'admin/players?q='+ref)).map(x=>x.id),[aid]);
  assert.deepEqual(await checked(support,'admin/players?q=round-'+foreignRound),[]);
  assert.equal((await editor(playerPath+'?round='+oldRound.id)).status,403);
  const page = (await checked(support,playerPath)).rounds;
  assert.equal(page.entries.length,5);
  const page2 = (await checked(support,playerPath+'?beforeRound='+page.nextCursor)).rounds;
  assert.ok(page2.entries.every(row=>row.id<page.nextCursor));
  assert.deepEqual((await checked(support,'admin/players/'+bid+'?round='+oldRound.id)).rounds.entries,[]);
  const exact = (await checked(support,playerPath+'?round='+oldRound.id)).rounds.entries;
  assert.deepEqual(exact,[oldRound]);assert.equal(JSON.parse(exact[0].outcome).preview.titleEn,'Lanterns');
  const ticket = { category:'game', message:'Please help me understand this demo round.', reference:ref };
  assert.equal((await b('support',ticket)).status,404);
  assert.deepEqual(await checked(b,'support'),[]);
  assert.equal((await a('support',{...ticket,reference:'round-'+foreignRound})).status,404);
  const sent = await checked(a,'support',ticket);
  assert.equal((await checked(support,'admin/support')).tickets.find(e=>e.id===sent.id).reference,ref);
  const exported = await checked(a,'account/export');
  assert.ok(exported.activity.some(e=>e.id===oldRound.id && e.outcome===oldRound.outcome));
  assert.equal(exported.supportRequests.find(e=>e.id===sent.id).reference,ref);
});
test('support searches every request, linked reference and private note before paginating',async t=>{
  const {base,database}=await startSandbox(t);
  const staff=client(base), other=client(base), alice=client(base), guest=client(base);
  const admin=await checked(staff,'admin/login',staffCredentials);
  const id=await growthAccount(alice,'queue-fixture');
  const round=await checked(alice,'play',{game:'gold',wager:100,requestId:randomUUID()});
  const ref='round-'+round.history[0].id;
  const target=await checked(alice,'support',{category:'game',message:'Please review the demo round.',reference:ref});
  const db=new DatabaseSync(database);t.after(()=>db.close());
  const seed=db.prepare(`INSERT INTO support_tickets(tenant_id,player_id,category,message,status,priority,created_at,updated_at)
    VALUES('sandbox',?,'other','General inquiry','open','normal',?,?)`);
  for(let i=0;i<215;i++) seed.run(id,Date.now()+i,Date.now()+i);
  db.prepare("UPDATE support_tickets SET priority='urgent',assigned_to=? WHERE id=?").run(admin.id,target.id);
  db.prepare(`INSERT INTO support_ticket_notes(tenant_id,ticket_id,staff_id,note,created_at)
    VALUES('sandbox',?,?,'Précision réservée au personnel',?)`).run(target.id,admin.id,Date.now());
  const path='admin/support/queue';
  const first=await checked(staff,path);
  assert.equal(first.total,216);assert.equal(first.pages,22);assert.equal(first.tickets.length,10);
  assert.equal(first.tickets[0].id,target.id);
  for(const q of [ref,'#'+target.id,'case-'+target.id,'precision reservee']) {
    const only=await checked(staff,path+'?'+new URLSearchParams({q,priority:'urgent',topic:'game',assignee:'mine'}));
    assert.equal(only.total,1);assert.equal(only.tickets[0].reference,ref);
    assert.ok(!('notes' in only.tickets[0]) && !('messages' in only.tickets[0]));
  }
  assert.equal((await checked(staff,path+'?q=player-'+id)).total,216);
  const second=await checked(staff,path+'?page=2');
  assert.ok(second.tickets.every(x=>!first.tickets.some(y=>x.id===y.id)));
  assert.equal((await checked(staff,path+'?page=99')).tickets.length,6);
  assert.equal((await checked(staff,path+'?q='+ref+'&type=complaints')).total,0);
  assert.equal((await checked(staff,path+'?assignee=unassigned')).total,215);
  assert.equal((await staff(path+'?page=0')).status,400);
  const detail='admin/support/case/'+target.id;
  assert.match((await checked(staff,detail)).notes[0].note,/Précision/);
  const profile=await checked(staff,'admin/players/'+id);
  assert.equal(profile.supportCases.total,216);assert.equal(profile.supportCases.tickets.length,3);
  assert.equal((await guest(detail)).status,401);assert.equal((await alice(path)).status,401);
  const credentials={email:'queue-content@example.test',password:'test-editor-password'};
  await checked(staff,'admin/staff',{...credentials,role:'operator_content'});
  await checked(other,'admin/login',credentials);
  assert.equal((await other(detail)).status,403);assert.equal((await other(path)).status,403);
  db.prepare("INSERT INTO tenants VALUES('second','second','Second','active',1)").run();
  db.prepare("UPDATE tenant_domains SET tenant_id='second' WHERE host='localhost'").run();
  db.prepare("INSERT INTO tenant_staff_memberships(tenant_id,staff_id,role,status,created_at) VALUES('second',?,'operator_admin','active',1)").run(admin.id);
  const secondBrand=client(base);
  await checked(secondBrand,'admin/login',staffCredentials,'localhost');
  assert.equal((await checked(secondBrand,path,undefined,'localhost')).total,0);
  assert.equal((await secondBrand(detail,undefined,'localhost')).status,404);
});

test('player support pages keep older unread replies until that player opens the exact conversation',async t=>{
  const {base,database}=await startSandbox(t);
  const staff=client(base), alice=client(base), bob=client(base);
  const admin=await checked(staff,'admin/login',staffCredentials);
  const id=await growthAccount(alice,'case-owner');
  await growthAccount(bob,'case-neighbour');
  const db=new DatabaseSync(database);t.after(()=>db.close());
  const add=db.prepare(`INSERT INTO support_tickets(tenant_id,player_id,category,message,status,priority,created_at,updated_at)
    VALUES('sandbox',?,'account','Original player question','answered','normal',?,?)`);
  const reply=db.prepare(`INSERT INTO support_ticket_messages(tenant_id,ticket_id,author_type,staff_id,message,created_at)
    VALUES('sandbox',?,'staff',?,'Public response',?)`);
  const ids=[];
  for(let i=0;i<64;i++){
    const at=Date.now()-10000+i, ticket=Number(add.run(id,at,at).lastInsertRowid);
    ids.push(ticket);if(i<2) reply.run(ticket,admin.id,at+1);
  }
  db.prepare(`INSERT INTO support_ticket_notes(tenant_id,ticket_id,staff_id,note,created_at)
    VALUES('sandbox',?,?,'Confidential handoff',?)`).run(ids[0],admin.id,Date.now());
  const inbox=await checked(alice,'support/inbox?page=11');
  assert.equal(inbox.total,64);assert.equal(inbox.tickets.length,4);assert.equal(inbox.unread,2);
  assert.ok(inbox.tickets.find(row=>row.id===ids[0]).unread);
  assert.equal((await checked(alice,'account')).supportReplies,2);
  assert.equal((await bob('support/read',{ticketId:ids[0]})).status,404);
  assert.equal((await checked(bob,'support/inbox')).total,0);
  const opened=await checked(alice,'support/read',{ticketId:ids[0]});
  assert.equal(opened.unread,1);assert.equal(opened.ticket.messages[0].message,'Public response');
  assert.ok(!JSON.stringify(opened).includes('Confidential') && !JSON.stringify(opened).includes(staffCredentials.email));
  assert.equal((await checked(alice,'support/read',{ticketId:ids[0]})).unread,1);
  assert.equal((await checked(alice,'account')).supportReplies,1);
  const detail=await checked(staff,'admin/support/case/'+ids[0]);
  await checked(staff,'admin/support/reply',{ticketId:ids[0],expectedUpdatedAt:detail.updatedAt,status:'answered',priority:'normal',reply:'A second public reply.'});
  assert.equal((await checked(alice,'support/inbox')).unread,2);
  assert.equal((await checked(alice,'support/read',{ticketId:ids[1]})).unread,1);
});
const collectionMessage=(patch={})=>({topic:'collections',channel:'inbox',subjectEn:'Studio update',subjectFr:'Nouvelles du studio',
  textEn:'Read our studio notes.',textFr:'Consultez nos nouvelles.',destination:'',localTime:'2025-01-15T12:00',quietStart:0,quietEnd:0,...patch});

test('a campaign preview is read only and the scheduled audience rechecks consent, pauses and language',async t=>{
  const {base,database}=await startSandbox(t);
  const staff=client(base),players=Array.from({length:5},()=>client(base)),guest=client(base);
  const operator=await checked(staff,'admin/login',staffCredentials);
  for(const [i,p] of players.entries()){
    await growthAccount(p,'audience-'+i,{locale:i===4?'en-CA':'fr-CA'});
    await checked(p,'discovery/preferences',{topic:'collections',channel:'inbox',granted:true});
  }
  await checked(players[1],'safety/pause',{});
  const spec=collectionMessage({audienceLocale:'fr-CA'});
  const preview='admin/discovery/campaign-preview',campaigns='admin/discovery/campaigns';
  const db=new DatabaseSync(database);t.after(()=>db.close());
  const before=()=>['contact_deliveries','contact_campaigns','staff_events'].map(table=>db.prepare('SELECT count(*) AS n FROM '+table).get().n);
  const initial=before();
  const estimate=await checked(staff,preview,{spec});
  assert.deepEqual(estimate.counts,{selected:4,eligible:3,deferred:0,blocked:1});
  assert.deepEqual(estimate.reasons,{accountBreak:1});
  assert.deepEqual(before(),initial);
  assert.equal((await checked(staff,preview,{spec:{...spec,audienceLocale:'all'}})).counts.selected,5);
  assert.equal((await staff(preview,{spec:{...spec,audienceLocale:'es'}})).status,400);
  const zone=estimate.zone;
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(Date.now()));
  const overnight=await checked(staff,preview,{spec:{...spec,quietStart:hour,quietEnd:(hour+2)%24}});
  assert.deepEqual(overnight.counts,{selected:4,eligible:0,deferred:3,blocked:1});
  assert.equal(overnight.reasons.quietHours,3);
  assert.equal((await guest(preview,{spec})).status,401);
  const creds={email:'preview-staff@example.test',password:'preview-operator-password'};
  await checked(staff,'admin/staff',{...creds,role:'operator_support'});
  const supporter=client(base);await checked(supporter,'admin/login',creds);
  assert.equal((await supporter(preview,{spec})).status,403);
  const result=await checked(staff,campaigns,{action:'save',version:0,spec});
  await checked(staff,campaigns,{action:'schedule',version:1,id:result.id});
  await checked(players[2],'account/preferences',{locale:'en-CA'});
  await checked(players[3],'discovery/preferences',{topic:'collections',channel:'inbox',granted:false});
  await checked(staff,'admin/discovery/dispatch',{});
  await checked(staff,'admin/discovery/dispatch',{});
  const detail=()=>checked(staff,campaigns+'/'+result.id);
  const actual=await detail();
  assert.equal(actual.total,4);assert.equal(actual.read,0);
  assert.deepEqual(actual.outcomes.map(r=>[r.state,r.reason,r.count]),[
    ['delivered','',1],['suppressed','accountBreak',1],['suppressed','audienceChanged',1],['suppressed','optedOut',1]]);
  assert.ok(!JSON.stringify(actual).includes('@example.test'));
  const delivered=await checked(players[0],'discovery/inbox');
  assert.equal(delivered.unread,1);
  assert.equal((await players[4]('discovery/read',{id:delivered.items[0].id})).status,404);
  await checked(players[0],'discovery/read',{id:delivered.items[0].id});
  await checked(players[0],'discovery/read',{id:delivered.items[0].id});
  assert.equal((await detail()).read,1);
  const old=JSON.stringify(collectionMessage({subjectFr:'Édition du théâtre'}));
  const seed=db.prepare("INSERT INTO contact_campaigns(tenant,version,status,spec,created_at) VALUES('sandbox',1,'draft',?,1)");
  for(let i=0;i<10;i++)seed.run(old);
  const page=await checked(staff,campaigns+'?view=list&q=theatre&status=draft&page=2');
  assert.equal(page.total,10);assert.equal(page.items.length,2);assert.equal(page.pages,2);
  assert.equal((await checked(staff,campaigns+'?view=list&q=campaign-'+result.id)).items[0].id,result.id);
  db.prepare("INSERT INTO tenants VALUES('campaign-test','campaign-test','Private test','active',1)").run();
  db.prepare("UPDATE tenant_domains SET tenant_id='campaign-test' WHERE host='localhost'").run();
  db.prepare("INSERT INTO tenant_staff_memberships(tenant_id,staff_id,role,status,created_at) VALUES('campaign-test',?,'operator_admin','active',1)").run(operator.id);
  const second=client(base);await checked(second,'admin/login',staffCredentials,'localhost');
  assert.equal((await checked(second,campaigns+'?view=list',undefined,'localhost')).total,0);
  assert.equal((await second(campaigns+'/'+result.id,undefined,'localhost')).status,404);
  assert.equal((await checked(second,preview,{spec},'localhost')).counts.selected,0);
});

test('the player inbox finds older bilingual messages and original reward receipts in its own paged history',async t=>{
  const {base,database}=await startSandbox(t),alice=client(base),bob=client(base),staff=client(base);
  await checked(staff,'admin/login',staffCredentials);
  const player=await growthAccount(alice,'inbox-a');
  await growthAccount(bob,'inbox-b');
  const db=new DatabaseSync(database);t.after(()=>db.close());
  const created=Date.now()-86400000;
  const campaign=db.prepare("INSERT INTO contact_campaigns(tenant,version,status,spec,created_at) VALUES('sandbox',2,'scheduled',?,?)");
  const delivery=db.prepare('INSERT INTO contact_deliveries(campaign,player,state,next_at,updated_at,read_at) VALUES(?,?,?,?,?,?)');
  let oldest;
  for(let i=0;i<62;i++){
    const spec=collectionMessage({subjectFr:i===0?'Édition mémoire':'Émission '+i,channel:i===61?'email':'inbox'});
    const c=campaign.run(JSON.stringify(spec),created+i).lastInsertRowid;
    const d=delivery.run(c,player,i===60?'suppressed':'delivered',created+i,created+i,i<2?null:created+i);
    if(!i) oldest=Number(d.lastInsertRowid);
  }
  const grantSpec={template:'offer',slot:'badge',color:'gold',titleEn:'Old quest',titleFr:'Ancienne quête',itemEn:'Original badge',itemFr:'Écusson original'};
  const prog=db.prepare("INSERT INTO discovery_programs(tenant_id,version,draft,live) VALUES('sandbox',1,?,1)").run(JSON.stringify(grantSpec)).lastInsertRowid;
  db.prepare('INSERT INTO discovery_versions VALUES(?,?,?,?)').run(prog,1,JSON.stringify(grantSpec),created);
  const grant=db.prepare('INSERT INTO cosmetic_grants(program,version,player,granted_at) VALUES(?,1,?,?)').run(prog,player,created).lastInsertRowid;
  const claim=Number(db.prepare('INSERT INTO cosmetic_claims(grant_id,claimed_at) VALUES(?,?)').run(grant,created).lastInsertRowid);
  const inbox='discovery/inbox';
  assert.equal((await checked(alice,'discovery')).messages.length,50);
  assert.ok(!('messages' in await checked(alice,'discovery?view=summary')));
  let first=await checked(alice,inbox);
  assert.equal(first.total,61);assert.equal(first.unread,2);assert.equal(first.items.length,6);
  const gathered=new Set();for(let n=1;n<=first.pages;n++){
    const page=await checked(alice,inbox+'?page='+n);
    for(const row of page.items){assert.ok(!gathered.has(row.reference));gathered.add(row.reference);}
  }
  assert.equal(gathered.size,61);
  for(const [term,ref] of [['edition memoire','message-'+oldest],['ecusson','claim-'+claim],['claim-'+claim,'claim-'+claim]]){
    const found=await checked(alice,inbox+'?'+new URLSearchParams({q:term,page:'99'}));
    assert.equal(found.page,1);assert.deepEqual(found.items.map(r=>r.reference),[ref]);
  }
  assert.equal((await checked(alice,inbox+'?filter=receipts')).items[0].itemFr,'Écusson original');
  assert.equal((await checked(alice,inbox+'?filter=messages')).total,60);
  assert.equal((await checked(alice,inbox+'?filter=unread')).total,2);
  assert.equal((await checked(bob,inbox)).total,0);
  assert.equal((await alice(inbox+'?filter=broken')).status,400);
  await checked(alice,'discovery/read',{id:oldest});
  first=await checked(alice,inbox+'?filter=unread');assert.equal(first.unread,1);assert.equal(first.total,1);
});
async function followReferral(base,path,jar=new Map()) {
  const response=await fetch(base+path,{redirect:'manual',headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}});
  for (const cookie of response.headers.getSetCookie()){
    const [name,value]=cookie.split(';')[0].split('=');jar.set(name,value);
  }
  return response;
}

test('campaign links attribute visits and first saves to the right partner across redirects, codes and link changes',async t=>{
  const {base}=await startSandbox(t,{appBasePath:'/casinohabibi'});
  const url=base+'/casinohabibi',staff=client(url),alice=client(url),ben=client(url);
  await checked(staff,'admin/login',staffCredentials);
  await growthAccount(alice,'link-alice');const benId=await growthAccount(ben,'link-ben');
  const A=(await checked(staff,'admin/growth/partner',{name:'Studio Québec',code:'studio-nord',playerEmail:'LINK-ALICE@example.test'})).id;
  const B=(await checked(staff,'admin/growth/partner',{name:'Studio Sud',code:'studio-sud',playerId:benId})).id;
  const manage=(data)=>checked(staff,'admin/growth/link',{partnerId:A,...data});
  const first=await manage({version:0,name:'Infolettre été',active:true});
  const second=await manage({version:0,name:'Réseaux',active:true});
  assert.equal((await staff('admin/growth/link',{partnerId:A,version:0,name:'Infolettre Été',active:true})).status,409);
  assert.equal((await checked(staff,'admin/growth/partners?q=quebec')).items[0].linkCount,2);
  assert.equal((await checked(staff,'admin/growth/partners?q=link-ben%40example.test')).items[0].id,B);
  const links=(await checked(staff,'admin/growth/partners/'+A+'/links')).links;
  const path=id=>links.find(row=>row.id===id).path;
  const card=await growthPreview(staff,'Private Vista');
  const ad=(await checked(staff,'admin/growth/placement',{action:'save',version:0,slug:'private-vista',spec:{
    titleEn:'Vista',titleFr:'Vue',textEn:'',textFr:'',start:Date.now()-360000,end:Date.now()+week,preview:card.slug,currency:'CAD',budget:0,partner:A
  }})).id;
  await checked(staff,'admin/growth/placement',{action:'publish',id:ad,version:1});
  const jar=new Map();
  for(const p of [path(first.id),path(first.id),path(second.id),path(second.id),'/go/private-vista']){
    assert.equal((await followReferral(url,p+'?lang=fr',jar)).status,302);
  }
  const nick=client(url,jar);
  const nickId=await growthAccount(nick,'named-vista');
  const save=who=>checked(who,'me/saved/'+card.id,undefined,undefined,{},'PUT');
  await save(nick);await save(nick);
  assert.equal((await checked(staff,'admin/players/'+nickId)).referral.linkName,'Réseaux');
  const override=new Map();await followReferral(url,path(first.id),override);
  const routed=client(url,override);await growthAccount(routed,'overridden-link',{referralCode:'studio-sud'});await save(routed);
  const main=new Map();await followReferral(url,'/r/studio-nord',main);
  const legacy=client(url,main);await growthAccount(legacy,'main-link');await save(legacy);
  await manage({id:first.id,version:1,name:'Bulletin du lundi',active:false});
  assert.equal((await staff('admin/growth/link',{partnerId:A,id:first.id,version:1,name:'Stale',active:true})).status,409);
  assert.equal((await followReferral(url,path(first.id))).status,404);
  assert.equal((await followReferral(url,'/r/studio-nord/missing')).status,404);
  const r=(await checked(alice,'growth/partner?links=1&partner='+B)).report;
  const row=id=>r.links.find(x=>x.id===id);
  assert.equal(row(first.id).path,'/r/studio-nord/infolettre-ete');
  assert.deepEqual([row(first.id).visits,row(first.id).signups,row(first.id).active],[2,0,false]);
  assert.deepEqual([row(second.id).visits,row(second.id).signups,row(second.id).qualified],[2,1,1]);
  assert.deepEqual([row(null).visits,row(null).qualified],[1,1]);
  for(const k of ['visits','signups','verified','qualified','pending'])assert.equal(r.links.reduce((a,x)=>a+x[k],0),r[k]);
  const report=await checked(staff,'admin/growth/report?scope=site&links=1&partner='+A+'&asOf='+r.asOf);
  assert.deepEqual(report.links,r.links);
  assert.doesNotMatch(JSON.stringify(r),/example\.test|playerId|review-|Bulletin du mardi/);
  const other=(await checked(ben,'growth/partner?links=1&partner='+A)).report.links;
  assert.equal(other.length,1);assert.deepEqual([other[0].id,other[0].visits,other[0].qualified],[null,0,1]);
  assert.ok((await checked(staff,'admin/growth/report?scope=test&links=1&partner='+A)).links.every(x=>!x.visits&&!x.signups));
  const filtered=await checked(staff,'admin/growth/report?scope=site&links=1&partner='+A+'&placement='+ad);
  assert.equal(filtered.visits,1);assert.equal(filtered.links.find(x=>x.id===second.id).qualified,1);
  assert.equal((await nick('admin/growth/partners')).status,401);
  assert.equal((await nick('growth/partner?links=1')).status,403);
  assert.equal((await staff('admin/growth/link',{partnerId:B,id:first.id,version:2,name:'Wrong partner',active:true})).status,404);
  await manage({id:first.id,version:2,name:'Bulletin du lundi',active:true});
  assert.equal((await followReferral(url,path(first.id))).status,302);
});

test('referral decisions stay searchable and reconcile with the private player file and frozen partner reports',async t=>{
  const {base}=await startSandbox(t),admin=client(base),support=client(base),editor=client(base),owner=client(base);
  await checked(admin,'admin/login',staffCredentials);
  for(const [role,who] of [['operator_support',support],['operator_content',editor]]){
    const creds={email:role+'@example.test',password:'private-staff-password'};
    await checked(admin,'admin/staff',{...creds,role});await checked(who,'admin/login',creds);
  }
  const ownerId=await growthAccount(owner,'review-owner');
  const p=(await checked(admin,'admin/growth/partner',{name:'Groupe Nord',code:'northern',playerId:ownerId})).id;
  const link=(await checked(admin,'admin/growth/link',{partnerId:p,version:0,name:'Lancement',active:true})).id;
  const card=await growthPreview(admin,'Account Window'),jar=new Map();
  await followReferral(base,'/r/northern/lancement',jar);
  await growthAccount(client(base,jar),'original-account');
  const duplicate=client(base,new Map([['habibi_ref',jar.get('habibi_ref')]]));
  const id=await growthAccount(duplicate,'second-account');
  await checked(duplicate,'me/saved/'+card.id,undefined,undefined,{},'PUT');
  const before=(await checked(owner,'growth/partner?links=1')).report;
  assert.equal(before.pending,1);assert.deepEqual([before.links.find(r=>r.id===link).pending,before.qualified],[1,0]);
  const pending=await checked(support,'admin/growth/reviews?q=player-'+id);
  assert.equal(pending.total,1);assert.deepEqual([pending.items[0].flag,pending.items[0].linkName],['duplicate','Lancement']);
  assert.equal((await editor('admin/growth/reviews')).status,403);
  assert.equal((await support('admin/growth/partners')).status,403);
  assert.equal((await owner('admin/growth/reviews')).status,401);
  assert.equal((await support('admin/growth/review',{playerId:id,decision:'valid',reason:' '})).status,400);
  const reason='Deux joueurs distincts, dossier vérifié';
  const {auditId}=await checked(support,'admin/growth/review',{playerId:id,decision:'valid',reason});
  assert.equal((await support('admin/growth/review',{playerId:id,decision:'ineligible',reason})).status,409);
  assert.equal((await checked(admin,'admin/growth/reviews?filter=pending')).total,0);
  for(const q of ['review-'+auditId,'player-'+id,'verifie','second-account','lancement']){
    const result=await checked(support,'admin/growth/reviews?filter=all&q='+encodeURIComponent(q));
    assert.equal(result.total,1);assert.equal(result.items[0].reason,reason);assert.equal(result.items[0].decidedBy,'operator_support@example.test');
  }
  assert.equal((await checked(support,'admin/growth/reviews?filter=ineligible')).total,0);
  const profile=(await checked(support,'admin/players/'+id)).referral;
  assert.equal(profile.decisionId,auditId);assert.equal(profile.review,'valid');
  const fresh=(await checked(owner,'growth/partner?links=1')).report;
  assert.deepEqual([fresh.qualified,fresh.pending,fresh.links.find(r=>r.id===link).qualified],[1,0,1]);
  assert.deepEqual((await checked(owner,'growth/partner?links=1&asOf='+before.asOf)).report,before);
  assert.doesNotMatch(JSON.stringify(fresh),/second-account|operator_support|distincts/);
});
test('sample catalog previews are read-only and a validated import produces a tenant-scoped, replayable receipt',async t=>{
  const {base,database}=await startSandbox(t),admin=client(base),provider=client(base),support=client(base);
  await checked(admin,'admin/login',staffCredentials);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  const size=table=>db.prepare('SELECT count(*) AS n FROM '+table).get().n;
  const before=['providers','provider_events','game_catalog','staff_events'].map(size);
  const draft=await checked(admin,'providers/catalog/sample');
  assert.equal(draft.preview.counts.added,4);assert.deepEqual(['providers','provider_events','game_catalog','staff_events'].map(size),before);
  await checked(admin,'providers',{name:draft.name,key:'only-a-test-owner-key'});
  const key=()=>db.prepare('SELECT encrypted_key FROM providers WHERE name=?').get(draft.name).encrypted_key;
  const original=key();
  const collision=await admin('providers/catalog',{name:draft.name,games:draft.games,sample:true,expectedRevision:draft.preview.revision});
  assert.equal(collision.status,409);assert.ok(key()===original);assert.equal(size('game_catalog'),0);
  const demo=await checked(admin,'providers/catalog/sample');assert.notEqual(demo.name,draft.name);
  for(const [role,who] of [['operator_provider',provider],['operator_support',support]]){
    const creds={email:role+'@example.test',password:'catalog-private-fixture'};
    await checked(admin,'admin/staff',{...creds,role,publishCatalogue:false});
    await checked(who,'admin/login',creds);
  }
  assert.equal((await support('providers/catalog/sample')).status,403);
  assert.equal((await provider('providers/catalog/sample')).status,200);
  const candidate={name:demo.name,games:demo.games,sample:true,expectedRevision:demo.preview.revision};
  assert.equal((await provider('providers/catalog',candidate)).status,403);
  assert.equal((await admin('providers/catalog',{...candidate,games:demo.games.slice(0,3)})).status,409);
  const bad=await admin('providers/catalog/preview',{name:demo.name,sample:true,games:[demo.games[0],demo.games[0]]});
  assert.equal(bad.status,400);assert.equal(bad.data.error,'catalogGameDuplicate');
  const headers={'X-Request-ID':randomUUID()};
  const result=await checked(admin,'providers/catalog',candidate,undefined,headers);
  assert.deepEqual(await checked(admin,'providers/catalog',candidate,undefined,headers),result);
  assert.equal((await checked(admin,'games')).length,4);assert.equal(size('provider_catalog_imports'),1);
  const receipt=await checked(provider,'providers/catalog/imports/'+result.auditId);
  assert.deepEqual(receipt.entries,demo.preview.entries);assert.deepEqual(receipt.counts,demo.preview.counts);assert.equal(receipt.actor,null);
  assert.equal((await checked(admin,'providers/catalog/imports/'+result.auditId)).actor,staffCredentials.email);
  assert.equal((await checked(provider,'providers/catalog/imports?q='+encodeURIComponent(staffCredentials.email))).total,0);
  assert.equal((await checked(provider,'providers/catalog/imports?q=import-'+result.auditId)).total,1);
  assert.equal((await support('providers/catalog/imports/'+result.auditId)).status,403);
  assert.equal((await client(base)('providers/catalog/listings')).status,401);
  assert.ok(key()===original);
  const repeat=await checked(admin,'providers/catalog/sample');assert.equal(repeat.name,demo.name);assert.equal(repeat.preview.counts.unchanged,4);
  await checked(admin,'providers',{name:demo.name,key:'replaced-only-in-private-test'});
  assert.notEqual((await checked(admin,'providers/catalog/sample')).name,demo.name);
  assert.equal((await admin('providers/catalog',{...candidate,expectedRevision:repeat.preview.revision})).status,409);
});

test('staff visibility survives provider edits, removals and returns and matches the public lobby and saved favorites',async t=>{
  const {base,database}=await startSandbox(t),staff=client(base),guest=client(base),name='Atelier Nord';
  await checked(staff,'admin/login',staffCredentials);await checked(staff,'providers',{name,key:'local-sample'});
  await growthAccount(guest,'catalog-favorites');
  const alpha={externalId:'alpha',titleEn:'Moon',titleFr:'Lune',category:'slots'};
  const beta={externalId:'beta',titleEn:'Harbor',titleFr:'Port',category:'table'};
  const make=games=>checked(staff,'providers/catalog/preview',{name,games});
  async function sync(games){const p=await make(games);return checked(staff,'providers/catalog',{name,games,expectedRevision:p.revision});}
  const listing=async id=>(await checked(staff,'providers/catalog/listings?q='+id)).items[0];
  const publicIds=async()=>(await checked(guest,'games')).map(g=>g.externalId).sort();
  await sync([alpha,beta]);const favorite='provider:'+name+':alpha';
  await checked(guest,'account/favorites',{favorites:[favorite]});
  const cached=await make([alpha]),first=await listing('alpha');
  const toggle={name,externalId:'alpha',version:first.version,enabled:false};
  await checked(staff,'providers/catalog/status',toggle);
  assert.equal((await staff('providers/catalog/status',{...toggle,enabled:true})).status,409);
  assert.equal((await staff('providers/catalog',{name,games:[alpha],expectedRevision:cached.revision})).status,409);
  assert.deepEqual(await publicIds(),['beta']);assert.deepEqual((await checked(guest,'account')).favorites,[]);
  const changed={...alpha,titleFr:'Lune d’été'};
  const edit=await sync([changed,beta]);assert.deepEqual([edit.counts.updated,edit.counts.held],[1,1]);
  const record=await checked(staff,'providers/catalog/imports/'+edit.auditId);
  assert.deepEqual([record.entries[0].before.titleFr,record.entries[0].after.titleFr,record.entries[0].after.hidden],['Lune','Lune d’été',true]);
  assert.equal((await checked(staff,'providers/catalog/listings?filter=hidden&category=slots&q=ete%20nord')).total,1);
  const removal=await sync([beta]);assert.equal(removal.counts.removed,1);
  assert.equal((await checked(staff,'providers/catalog/listings?filter=missing')).items[0].externalId,'alpha');
  assert.equal((await staff('providers/catalog/status',{name,externalId:'alpha',enabled:true})).status,409);
  const returned=await sync([changed,beta]);assert.deepEqual([returned.counts.returned,returned.counts.held],[1,1]);
  assert.deepEqual(await publicIds(),['beta']);
  await checked(staff,'providers/catalog/status',{name,externalId:'alpha',enabled:true,version:(await listing('alpha')).version});
  assert.deepEqual(await publicIds(),['alpha','beta']);assert.deepEqual((await checked(guest,'account')).favorites,[favorite]);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  db.exec(`INSERT INTO tenants(id,slug,name,status,created_at) VALUES('catalog-other','catalog-other','Other studio','active',1);
    UPDATE tenant_domains SET tenant_id='catalog-other' WHERE host='localhost';
    INSERT INTO tenant_staff_memberships(tenant_id,staff_id,role,status,created_at) SELECT 'catalog-other',staff_id,'operator_admin','active',1 FROM tenant_staff_memberships WHERE tenant_id='sandbox' AND role='operator_admin'`);
  const other=client(base);await checked(other,'admin/login',staffCredentials,'localhost');
  assert.equal((await checked(other,'providers/catalog/imports',undefined,'localhost')).total,0);
  assert.equal((await other('providers/catalog/imports/'+edit.auditId,undefined,'localhost')).status,404);
  assert.equal((await checked(other,'providers/catalog/listings?q=alpha',undefined,'localhost')).total,0);
});

test('legacy provider history restores manual hides and searches the catalog beyond the former two-thousand-row limit',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'legacy-provider-catalog-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  let legacyAudit;
  await t.test('prepare an earlier saved catalog',async child=>{
    const {base,database}=await startSandbox(child,{dataDirectory:dir}),staff=client(base);
    await checked(staff,'admin/login',staffCredentials);await checked(staff,'providers',{name:'Heritage',key:'legacy-test'});
    const db=new DatabaseSync(database);
    try{
      const actor=db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(staffCredentials.email).id;
      const provider=db.prepare("SELECT id FROM providers WHERE name='Heritage'").get().id;
      const add=db.prepare("INSERT INTO game_catalog(tenant_id,provider_id,provider,external_id,title_en,title_fr,category,enabled) VALUES('sandbox',?,'Heritage',?,?,?,'slots',?)");
      db.exec('BEGIN IMMEDIATE');add.run(provider,'missing','Older','Ancienne',0);add.run(provider,'hidden','Manual','Manuelle',0);
      for(let i=0;i<2001;i++)add.run(provider,'entry-'+i,'Preview '+i,i===2000?'Étoile recherchée':'Aperçu '+i,1);
      const event=db.prepare("INSERT INTO staff_events(tenant_id,actor_id,action,target,created_at) VALUES('sandbox',?,?,?,?)");
      legacyAudit=Number(event.run(actor,'provider_catalog_synced','Heritage',1).lastInsertRowid);
      event.run(actor,'catalog_listing_disabled','Heritage:hidden',2);db.exec('COMMIT');
    }finally{db.close();}
  });
  const {base}=await startSandbox(t,{dataDirectory:dir}),staff=client(base);await checked(staff,'admin/login',staffCredentials);
  const all=await checked(staff,'providers/catalog/listings');assert.deepEqual([all.total,all.items.length,all.pages],[2003,8,251]);
  assert.equal((await checked(staff,'providers/catalog/listings?page=251')).items.length,3);
  assert.equal((await checked(staff,'providers/catalog/listings?q=etoile%20recherchee')).items[0].externalId,'entry-2000');
  assert.equal((await checked(staff,'providers/catalog/listings?filter=hidden')).items[0].externalId,'hidden');
  assert.equal((await checked(staff,'providers/catalog/listings?filter=missing')).items[0].externalId,'missing');
  const audit=await checked(staff,'providers/catalog/imports/'+legacyAudit);assert.equal(audit.counts,null);assert.deepEqual(audit.entries,[]);
  assert.equal((await staff('providers/catalog/listings?page=0')).status,400);
});
test('operator sandbox rechecks product, provider, role and brand at launch and retains a versioned session after suspension',async t=>{
  const {base,database}=await startSandbox(t),admin=client(base),other=client(base),reader=client(base);
  const prefix='admin/operator/',req=(route,data,headers)=>checked(admin,prefix+route,data,undefined,headers);
  await checked(admin,'admin/login',staffCredentials);
  const directory=await req('products');assert.equal(directory.products.length,13);
  const live=directory.products.find(p=>p.id==='live-casino');assert.equal(live.providers.length,2);assert.equal(live.binding.version,0);
  const config=(provider,version,action='enable',profile='healthy')=>({product:'live-casino',provider,version,action,profile,environment:'sandbox',reason:'Acceptance fixture'});
  const play={action:'launch',environment:'sandbox',provider:'atlas',game:'atlas-wheel'};
  assert.equal((await other(prefix+'products')).status,401);
  for(const bad of [{...config('',0),product:'vr-expo'},{...config('atlas',0)},{...config('',0),environment:'production'}])
    assert.ok([400,409].includes((await admin(prefix+'configure',bad)).status));
  await req('configure',config('',0));assert.equal((await admin(prefix+'play',play)).status,409);
  assert.equal((await req('configure',config('atlas',0,'enable','offline'))).state,'failed');
  assert.equal((await admin(prefix+'play',play)).status,409);
  const key={'X-Request-ID':randomUUID()},act=config('atlas',1),accepted=await req('configure',act,key);
  assert.deepEqual(await req('configure',act,key),accepted);
  assert.equal((await admin(prefix+'configure',act)).status,409);
  const lease=await req('play',play,keyFor());assert.equal((await req('session?id='+lease.id)).providerVersion,2);
  assert.equal((await admin(prefix+'play',{...play,provider:'cedar',game:'cedar-cards'})).status,409);
  await req('configure',config('atlas',2,'suspend'));assert.equal((await admin(prefix+'play',play)).status,409);
  const finishKey=keyFor(),settle={action:'settle',environment:'sandbox',id:lease.id};
  const finish=await req('play',settle,finishKey);assert.deepEqual(await req('play',settle,finishKey),finish);
  const trace=await req('session?id='+lease.id);assert.equal(trace.events.length,2);assert.equal(trace.replay,true);
  await req('configure',config('cedar',0));const cedar=await req('play',{...play,provider:'cedar',game:'cedar-cards'});
  assert.equal((await req('session?id='+cedar.id)).replay,false);
  await req('configure',config('',1,'suspend'));assert.equal((await admin(prefix+'play',{...play,provider:'cedar',game:'cedar-cards'})).status,409);
  const list=await req('sessions');assert.equal(list.items.length,2);
  assert.equal((await req('history?product=live-casino')).items.length,6);
  const credentials={email:'product-reader@example.test',password:'reader-demo-credentials'};
  await checked(admin,'admin/staff',{...credentials,role:'operator_provider',publishCatalogue:false});await checked(reader,'admin/login',credentials);
  await checked(reader,prefix+'products');assert.equal((await reader(prefix+'configure',config('',2))).status,403);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  assert.equal(db.prepare('SELECT count(*) AS n FROM ledger').get().n,0);
  db.prepare("INSERT INTO tenants(id,slug,name,status,created_at) VALUES('second','second','Second','active',1)").run();
  db.prepare("INSERT INTO tenant_domains(host,tenant_id,verified) VALUES('localhost','second',1) ON CONFLICT(host) DO UPDATE SET tenant_id='second',verified=1").run();
  db.prepare("INSERT INTO tenant_staff_memberships(tenant_id,staff_id,role,status,created_at) SELECT 'second',id,'operator_admin','active',1 FROM staff_accounts WHERE email=?").run(staffCredentials.email);
  await checked(other,'admin/login',staffCredentials,'localhost');
  assert.equal((await checked(other,prefix+'sessions',undefined,'localhost')).items.length,0);
  assert.equal((await other(prefix+'session?id='+lease.id,undefined,'localhost')).status,404);
  assert.equal((await checked(other,prefix+'products',undefined,'localhost')).products.find(p=>p.id==='live-casino').binding.version,0);
  function keyFor(){return {'X-Request-ID':randomUUID()};}
});

test('operator translation orders retain private discussions, optional text, fulfillment, quote revisions and one test invoice',async t=>{
  const {base}=await startSandbox(t),admin=client(base),owner=client(base),agent=client(base),outsider=client(base),prefix='admin/operator/';
  await checked(admin,'admin/login',staffCredentials);
  async function sign(who,name,role){
    const credentials={email:name+'@example.test',password:'staff-fixture-password'};
    await checked(admin,'admin/staff',{...credentials,role});return checked(who,'admin/login',credentials);
  }
  const requester=await sign(owner,'service-owner','operator_content');
  const assigned=await sign(agent,'service-agent','operator_support');
  await sign(outsider,'service-stranger','operator_support');
  assert.equal((await checked(owner,prefix+'services')).items.length,14);
  assert.deepEqual((await checked(owner,prefix+'services?q=translation')).items.map(i=>i.id),['translation']);
  assert.ok((await checked(owner,prefix+'services?category=it')).items.every(i=>i.group==='it'));
  const input={action:'order',title:'Translate the website',brief:'Home and help pages',service:'translation',agent:assigned.id,source:'en',target:'es'};
  assert.equal((await owner(prefix+'orders',{...input,service:'legal'})).status,409);
  assert.equal((await owner(prefix+'orders',{...input,agent:requester.id})).status,400);
  assert.equal((await owner(prefix+'orders',{...input,attachment:{name:'bad.html',text:'bad'}})).status,400);
  assert.equal((await agent(prefix+'orders',input)).status,403);
  const key={'X-Request-ID':randomUUID()},created=await checked(owner,prefix+'orders',input,undefined,key);
  assert.deepEqual(await checked(owner,prefix+'orders',input,undefined,key),created);
  const orderPath=prefix+'order?id='+created.id;
  assert.equal((await checked(agent,orderPath)).status,'ordered');assert.equal((await checked(owner,prefix+'orders')).total,1);
  for(const actor of [outsider,admin]){assert.equal((await actor(orderPath)).status,404);assert.equal((await checked(actor,prefix+'orders')).total,0);}
  const send=(who,version,action,extra={})=>checked(who,prefix+'orders',{id:created.id,version,action,...extra});
  await send(owner,1,'comment',{text:'Internal translation note'});
  assert.equal((await checked(agent,orderPath)).events[0].body.text,'Internal translation note');
  assert.equal((await owner(prefix+'orders',{id:created.id,version:1,action:'comment',text:'stale'})).status,409);
  assert.equal((await agent(prefix+'orders',{id:created.id,version:2,action:'invoice'})).status,409);
  await send(agent,2,'advance');await send(agent,3,'quote',{minor:8500});await send(agent,4,'quote',{minor:7200});
  assert.equal((await owner(prefix+'orders',{id:created.id,version:5,action:'accept',quote:1})).status,409);
  await send(owner,5,'accept',{quote:2});const invoice=await send(agent,6,'invoice');
  assert.equal((await send(agent,6,'invoice')).invoice,invoice.invoice);
  await send(agent,7,'advance');await send(owner,8,'advance');
  const result=await checked(owner,orderPath);assert.equal(result.status,'closed');assert.equal(result.acceptedQuote,2);
  assert.deepEqual(result.events.filter(e=>e.kind==='quote').map(e=>e.body.minor),[7200,8500]);assert.equal(result.events.filter(e=>e.kind==='invoiced').length,1);
  const withFile=await checked(owner,prefix+'orders',{...input,title:'Copy with file',attachment:{name:'Site notes.txt',text:'Synthetic fixture'}});
  assert.equal((await checked(agent,prefix+'order?id='+withFile.id)).events[0].body.attachment.text,'Synthetic fixture');
  const [{id:newAgent}]=(await checked(owner,prefix+'agents')).items.filter(a=>a.email===staffCredentials.email);
  await checked(owner,prefix+'orders',{id:withFile.id,version:1,action:'assign',agent:newAgent});
  assert.equal((await agent(prefix+'order?id='+withFile.id)).status,404);
  assert.equal((await checked(admin,prefix+'order?id='+withFile.id)).canFulfill,true);
  await checked(admin,'admin/staff/role',{email:'service-agent@example.test',role:'operator_content',reason:'Remove fulfillment assignment privileges'});
  await checked(agent,'admin/login',{email:'service-agent@example.test',password:'staff-fixture-password'});
  assert.equal((await agent(orderPath)).status,404);
  assert.equal((await checked(agent,prefix+'orders')).total,0);

});
test('V05 V06 V07 settle integer double entries, serialize competing suppliers, and retain both financial closes',async t=>{
  const {base,database}=await startSandbox(t),admin=client(base),second=client(base),visitor=client(base);
  await checked(admin,'admin/login',staffCredentials);await checked(second,'admin/login',staffCredentials);
  const prefix='admin/operator/',path=prefix+'pilot',post=(who,cmd,key)=>checked(who,path,cmd,undefined,key?{'X-Request-ID':key}:undefined);
  assert.equal((await visitor(prefix+'pilots')).status,401);
  for(const scenario of ['V05','V06','V07']){
    const key=randomUUID(),start={action:'start',scenario},r=await post(admin,start,key);
    assert.deepEqual(await post(admin,start,key),r);
    const read=()=>checked(admin,path+'?id='+r.id);
    let detail=await read();assert.equal(detail.summary.balance.available,0);
    for(let step=0;step<detail.stages.length;step++){
      const stage=detail.stages[step],cmd={action:'step',id:r.id,step};
      if(stage==='compete'){
        assert.equal((await admin(path,cmd)).status,409);
        const attempts=await Promise.all([['cedar',second],['atlas',admin]].map(([provider,who])=>post(who,{...cmd,action:'attempt',provider})));
        assert.deepEqual(attempts.map(a=>a.result.status).sort(),['limit','posted']);
      }
      const k=randomUUID(),saved=await post(admin,cmd,k);assert.deepEqual(await post(admin,cmd,k),saved);
      assert.equal((await second(path,cmd)).status,409);
      detail=await read();const s=detail.summary;
      assert.equal(s.unbalanced,0);assert.equal(Object.values(s.balance).reduce((a,b)=>a+b,0),0);
      if(stage==='timeout'){
        assert.equal(s.payouts.length,1);assert.equal(s.balance.held,2000);assert.equal(s.balance.available,8000);
        assert.equal(s.payouts[0].status,'unknown');
      }
      if(stage==='break'){assert.equal(detail.paused,true);assert.equal(s.openRounds,1);assert.equal(detail.steps.at(-1).evidence.at(-1).status,'paused');}
    }
    const s=detail.summary;
    if(scenario==='V05'){
      assert.deepEqual([s.balance.available,s.cash,s.ggr,s.openRounds,s.statements.length],[7600,8000,400,0,4]);
      assert.ok(s.statements.every(line=>line.status==='matched'));assert.equal(s.journalCount,5);assert.equal(detail.closes.length,1);
    }
    if(scenario==='V06'){
      assert.equal(s.stakes,800);assert.equal(s.wins,400);assert.equal(s.openRounds,0);assert.equal(s.journalCount,3);
      assert.equal(detail.steps.at(-1).evidence[1].replayed,true);
    }
    if(scenario==='V07'){
      assert.equal(s.payouts[0].status,'paid');assert.equal(s.balance.held,0);assert.equal(s.balance.available,8000);assert.equal(s.journalCount,3);
      assert.equal(s.statements.length,1);assert.deepEqual(detail.closes.map(c=>c.snapshot.timing.length),[1,0]);
    }
  }
  const db=new DatabaseSync(database);t.after(()=>db.close());assert.equal(db.prepare('SELECT count(*) AS n FROM players').get().n,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM ledger').get().n,0);assert.equal((await checked(admin,prefix+'pilots')).total,3);
  const creds={email:'pilot-reader@example.test',password:'some-reader-passphrase'};
  await checked(admin,'admin/staff',{...creds,role:'operator_provider',publishCatalogue:true,reason:'Validate finance role separation'});await checked(visitor,'admin/login',creds);
  assert.equal((await visitor(prefix+'pilots')).status,403);
});
test('V04 public and custom lobby share eligible fixture listings and the exact schedule, slot and locale boundaries',async t=>{
  const {base,database}=await startSandbox(t),admin=client(base),publicSite=client(base),reader=client(base);
  await checked(admin,'admin/login',staffCredentials);
  const prefix='admin/operator/',configure=(provider)=>checked(admin,prefix+'configure',{product:'live-casino',provider,action:'enable',version:0,profile:'healthy',reason:'V04 fixture',environment:'sandbox'});
  await configure('');await configure('atlas');
  async function importSample(){
    const sample=await checked(admin,'providers/catalog/sample');
    return checked(admin,'providers/catalog',{name:sample.name,sample:true,games:sample.games,expectedRevision:sample.preview.revision});
  }
  await importSample();
  const original=await checked(publicSite,'games');await importSample();
  assert.deepEqual((await checked(publicSite,'games')).map(i=>i.id),original.map(i=>i.id));assert.ok(original.length>=4);
  const [hidden,pinned,extra]=original;
  const spec={name:'evening',titleEn:'Evening picks',titleFr:'Sélection du soir',titleEs:'',market:'CA',channel:'all',zone:'America/Toronto',
    start:'2026-11-19T10:00',end:'2026-11-19T13:00',priority:5,category:'all',sort:'name',cap:3,hide:[hidden.id],pins:[{slot:2,id:pinned.id}]};
  const preview=await checked(admin,'admin/shelves/preview',{spec,lang:'fr'});assert.equal(preview.items[1].id,pinned.id);
  assert.equal(preview.items.length,3);assert.equal(new Set(preview.items.map(g=>g.id)).size,3);
  const change=(action,name,version,spec)=>({action,name,version,spec});
  const receipt=await checked(admin,'admin/shelves/change',change('publish',spec.name,0,spec));
  const overlap={...spec,name:'overlap',market:'',channel:'mobile'};assert.equal((await admin('admin/shelves/change',change('publish',overlap.name,0,overlap))).status,409);
  const invalid={...spec,start:'2026-11-01T01:30'};assert.equal((await admin('admin/shelves/preview',{spec:invalid})).status,400);
  const view=(at,market='CA',lang='es',channel='mobile')=>checked(admin,'admin/shelves/at?'+new URLSearchParams({at,market,lang,channel}));
  assert.equal((await view(preview.starts-1)).shelf,null);
  const active=(await view(preview.starts)).shelf;assert.equal(active.revision,receipt.version);assert.equal(active.title,spec.titleEn);assert.equal(active.language,'en');
  assert.equal(active.items[1].id,pinned.id);assert.ok(active.items.every(g=>g.id!==hidden.id));
  assert.equal((await view(preview.ends)).shelf,null);assert.equal((await view(preview.starts,'MX')).shelf,null);
  assert.equal((await publicSite('v1/lobby?at='+preview.starts)).status,400);assert.equal((await publicSite('admin/shelves/at?at='+preview.starts)).status,401);
  const open={...spec,start:'2020-01-01T10:00',end:'2090-01-01T10:00',market:'',channel:'all'};
  await checked(admin,'admin/shelves/change',change('publish',spec.name,1,open));
  const publicView=()=>checked(publicSite,'v1/lobby?market=CA&channel=mobile&lang=fr');
  assert.deepEqual((await publicView()).shelf,(await view(Date.now(),'CA','fr','mobile')).shelf);
  const launch={action:'launch',environment:'sandbox',provider:'atlas',game:'atlas-wheel',listingId:pinned.id};
  const round=await checked(admin,prefix+'play',launch);
  assert.equal((await checked(admin,prefix+'session?id='+round.id)).listingRef,pinned.externalId);
  const listings=await checked(admin,'providers/catalog/listings?provider='+encodeURIComponent(pinned.provider));
  const listing=listings.items.find(g=>g.id===pinned.id);
  await checked(admin,'providers/catalog/status',{name:pinned.provider,externalId:pinned.externalId,enabled:false,version:listing.version});
  assert.ok((await publicView()).shelf.items.every(g=>g.id!==pinned.id));
  assert.ok((await checked(publicSite,'games')).every(g=>g.id!==pinned.id));assert.equal((await admin(prefix+'play',launch)).status,409);
  await checked(admin,prefix+'play',{action:'settle',environment:'sandbox',id:round.id});
  assert.ok((await publicView()).shelf.items.some(g=>g.id===extra.id));
  await checked(admin,'admin/shelves/change',change('withdraw',spec.name,2));
  assert.equal((await publicView()).shelf,null);
  const creds={email:'shelf-reader@example.test',password:'private-fixture-password'};
  await checked(admin,'admin/staff',{...creds,role:'operator_content',publishCatalogue:false});await checked(reader,'admin/login',creds);
  await checked(reader,'admin/shelves');assert.equal((await reader('admin/shelves/change',change('publish',spec.name,3,open))).status,403);
  const db=new DatabaseSync(database);t.after(()=>db.close());
  assert.equal(db.prepare('SELECT count(*) AS n FROM ledger').get().n,0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM lobby_shelf_versions WHERE name=?').get(spec.name).n,3);
});
test('D27 a scoped fixture client follows the public shelf, rotates once and cannot read a second brand or production',async t=>{
  const {base,database}=await startSandbox(t),admin=client(base),site=client(base),p='admin/operator/clients';
  await checked(admin,'admin/login',staffCredentials);
  const secret=()=> 'hbs_'+randomBytes(32).toString('hex'),first=secret(),second=secret(),key={'X-Request-ID':randomUUID()};
  const payload={action:'create',environment:'sandbox',secret:first,label:'Sandbox kiosk'};
  const one=await checked(admin,p,payload,undefined,key);assert.deepEqual(await checked(admin,p,payload,undefined,key),one);
  const read=(s,env='sandbox',host)=>site('partner/v1/lobby?channel=mobile&lang=es&environment='+env,undefined,host,{Authorization:'Bearer '+s});
  const db=new DatabaseSync(database);t.after(()=>db.close());
  db.exec("INSERT INTO tenants VALUES('partner-two','partner-two','Other','active',1); UPDATE tenant_domains SET tenant_id='partner-two' WHERE host='localhost';");
  assert.equal((await read(first,'sandbox','localhost')).status,401);
  assert.equal((await read(first,'production')).status,403);assert.equal((await read('invalid')).status,401);
  assert.deepEqual((await read(first)).data,await checked(site,'v1/lobby?channel=mobile&lang=es'));
  const rotated=await checked(admin,p,{action:'rotate',id:one.id,version:1,environment:'sandbox',secret:second});
  assert.equal(rotated.version,2);assert.equal((await read(first)).status,401);assert.equal((await read(second)).status,200);
  const detail=await checked(admin,'admin/operator/client-history?id='+one.id);assert.deepEqual(detail.items.map(e=>e.kind),['rotate','create']);
  await checked(admin,p,{action:'revoke',id:one.id,version:2,environment:'sandbox'});assert.equal((await read(second)).status,401);
  const meta=JSON.stringify([await checked(admin,p),detail,db.prepare('SELECT * FROM staff_mutation_receipts').all(),db.prepare('SELECT * FROM staff_events').all()]);
  assert.ok(!meta.includes(first)&&!meta.includes(second));assert.equal((await site(p)).status,401);
});

test('D14 verification, player evidence, expiry and re-verification stay scoped to the brand and decision cycle', async (t) => {
  const { base, database } = await startSandbox(t),
    admin = client(base),
    support = client(base),
    player = client(base),
    other = client(base),
    guest = client(base),
    d = 'admin/desk/';
  await checked(admin, 'admin/login', staffCredentials);
  await register(player);
  const pid = (await checked(player, 'account')).id;
  const supportCred = { email: 'desk-help@example.test', password: 'some-help-password' };
  await checked(admin, 'admin/staff', { ...supportCred, role: 'operator_support' });
  await checked(support, 'admin/login', supportCred);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  const open = { action: 'create', market: 'south', label: 'South sample', player: pid };
  assert.equal((await admin(d + 'review', open)).status, 400);
  db.prepare('UPDATE players SET report_fixture=1 WHERE id=?').run(pid);
  const s = await checked(admin, d + 'review', open),
    n = await checked(admin, d + 'review', { action: 'create', market: 'north', label: 'North sample' });
  const record = () => checked(admin, d + 'subject?id=' + s.id);
  const command = async (action, fields) =>
    checked(admin, d + 'review', { action, id: s.id, version: (await record()).version, ...fields });
  assert.equal((await guest(d + 'subjects')).status, 401);
  assert.equal((await support(d + 'routes')).status, 403);
  assert.deepEqual((await record()).required, ['age', 'photo', 'address']);
  assert.deepEqual((await checked(admin, d + 'subject?id=' + n.id)).required, ['age', 'photo']);
  assert.equal((await checked(player, 'me/review-demo')).subject.market, 'south');
  assert.equal((await guest('me/review-demo')).status, 401);
  await command('evidence', { type: 'age' });
  const pending = { action: 'callback', id: s.id, cycle: 1, eventId: 'p1', outcome: 'pending' };
  const pend = await checked(admin, d + 'review', pending);
  assert.deepEqual(await checked(admin, d + 'review', pending), pend);
  const send = { ...pending, eventId: 'r1', outcome: 'review' };
  assert.equal((await admin(d + 'review', send)).data.error, 'reviewIncomplete');
  await command('evidence', { type: 'photo' });
  let publicView = (await checked(player, 'me/review-demo')).subject;
  await checked(player, 'me/review-demo', {
    type: 'address',
    version: publicView.version,
    cycle: publicView.cycle,
  });
  const ack = await checked(admin, d + 'review', send);
  assert.deepEqual(await checked(admin, d + 'review', send), ack);
  assert.equal((await admin(d + 'review', { ...send, outcome: 'pending' })).status, 409);
  assert.equal((await checked(admin, d + 'subjects?state=review')).total, 1);
  const supportView = await checked(support, d + 'subject?id=' + s.id);
  assert.equal(supportView.documents, undefined);
  assert.equal(supportView.risks, undefined);
  assert.ok(supportView.timeline.items.every((e) => !('detail' in e)));
  assert.equal(
    (await support(d + 'review', { action: 'decide', id: s.id, outcome: 'approved' })).status,
    403,
  );
  const approved = await command('decide', { outcome: 'approved', reason: 'confirmed' });
  assert.ok(approved.decision);
  const accountId = (await record()).id;
  const createPayout = () =>
    admin(d + 'cashier', {
      action: 'initiate',
      subject: accountId,
      key: randomUUID(),
      direction: 'withdrawal',
      route: 'wallet',
      asset: 'TST',
      minor: 1000,
    });
  assert.equal((await createPayout()).data.error, 'cashierFunds');
  await command('expire', {});
  assert.equal((await createPayout()).data.error, 'identity_required');
  assert.equal((await checked(admin, d + 'subjects?state=expired')).total, 1);
  await command('recheck', {});
  for (const type of ['age', 'photo', 'address']) await command('evidence', { type });
  await command('callback', { cycle: 2, eventId: 'r2', outcome: 'review' });
  const accepted = await command('decide', { outcome: 'approved', reason: 'corrected' });
  assert.notEqual(approved.decision, accepted.decision);
  assert.equal((await record()).eligibility.decision, accepted.decision);
  publicView = (await checked(player, 'me/review-demo')).subject;
  assert.equal(publicView.state, 'approved');
  assert.ok(!JSON.stringify(publicView).includes('corrected'));
  assert.ok(!JSON.stringify(publicView).includes('reviewer'));
  await checked(admin, d + 'review', {
    action: 'policy',
    market: 'south',
    version: 0,
    days: 7,
    documents: ['age', 'photo'],
  });
  assert.equal((await record()).state, 'expired');
  assert.equal((await createPayout()).data.error, 'identity_required');
  db.exec(
    "INSERT INTO tenants VALUES('desk-second','desk-second','Desk Two','active',1); UPDATE tenant_domains SET tenant_id='desk-second' WHERE host='localhost'; INSERT INTO tenant_staff_memberships(tenant_id,staff_id,role,status,created_at) SELECT 'desk-second',staff_id,'operator_admin','active',1 FROM tenant_staff_memberships WHERE tenant_id='sandbox' AND role='operator_admin';",
  );
  await checked(other, 'admin/login', staffCredentials, 'localhost');
  assert.equal((await checked(other, d + 'subjects', undefined, 'localhost')).total, 0);
  assert.equal((await other(d + 'subject?id=' + s.id, undefined, 'localhost')).status, 404);
  assert.equal((await other(d + 'cashier?id=' + s.id, undefined, 'localhost')).status, 404);
  assert.equal(
    (await checked(other, d + 'policies', undefined, 'localhost')).items.find(
      (i) => i.market === 'south',
    ).version,
    0,
  );
});

test('D15 screening keeps shared signals independent, carries list history, and lifts only the selected withdrawal hold', async (t) => {
  const { base } = await startSandbox(t),
    admin = client(base),
    backup = client(base),
    d = 'admin/desk/';
  await checked(admin, 'admin/login', staffCredentials);
  const creds = { email: 'other-reviewer@example.test', password: 'reviewer-password-2' };
  await checked(admin, 'admin/staff', { ...creds, role: 'operator_admin' });
  await checked(backup, 'admin/login', creds);
  const create = async (label) =>
    (await checked(admin, d + 'review', { action: 'create', market: 'north', label })).id;
  const a = await create('Sample A'),
    b = await create('Sample B');
  const detail = (who) => checked(admin, d + 'subject?id=' + who);
  const edit = async (id, action, extra, actor = admin) =>
    checked(actor, d + 'review', { id, version: (await detail(id)).version, action, ...extra });
  for (const type of ['age', 'photo']) await edit(a, 'evidence', { type });
  await edit(a, 'callback', { cycle: 1, eventId: 'review', outcome: 'review' });
  await edit(a, 'decide', { outcome: 'approved', reason: 'confirmed' });
  const signal = { kind: 'shared_device', marker: 'sample-a', eventId: 'shared-1' },
    r1 = await edit(a, 'signal', signal),
    r2 = await edit(b, 'signal', signal);
  assert.deepEqual(await edit(a, 'signal', signal), r1);
  assert.notEqual(r1.risk, r2.risk);
  await edit(b, 'risk_decide', { risk: r2.risk, outcome: 'cleared', reason: 'inspected' });
  const p1 = await edit(a, 'signal', {
    kind: 'screening',
    marker: 'sample-b',
    listVersion: 1,
    eventId: 'list1',
  });
  await edit(a, 'risk_decide', { risk: p1.risk, outcome: 'cleared', reason: 'inspected' });
  const p2 = await edit(a, 'signal', {
    kind: 'screening',
    marker: 'sample-b',
    listVersion: 2,
    eventId: 'list2',
  });
  assert.equal(
    (
      await edit(a, 'signal', {
        kind: 'screening',
        marker: 'sample-b',
        listVersion: 2,
        eventId: 'list2b',
      })
    ).risk,
    p2.risk,
  );
  const a1 = await detail(a);
  assert.equal(a1.risks.find((k) => k.id === p2.risk).prior, p1.risk);
  assert.equal(a1.risks.find((k) => k.id === p1.risk).reason, 'inspected');
  const h1 = await edit(a, 'hold', { risk: r1.risk, reason: 'risk_confirmed' }),
    h2 = await edit(a, 'hold', { risk: p2.risk, reason: 'incomplete' });
  assert.equal((await detail(a)).eligibility.reason, 'payout_hold');
  assert.equal(
    (
      await backup(d + 'review', {
        id: a,
        version: (await detail(a)).version,
        action: 'release',
        risk: r1.risk,
        hold: h1.hold,
        reason: 'corrected',
      })
    ).status,
    403,
  );
  await edit(a, 'release', { risk: r1.risk, hold: h1.hold, reason: 'corrected' });
  assert.equal((await detail(a)).eligibility.hold, h2.hold);
  await edit(a, 'risk_claim', { risk: p2.risk, reason: 'inspected' }, backup);
  await edit(a, 'release', { risk: p2.risk, hold: h2.hold, reason: 'inspected' }, backup);
  const final = await detail(a);
  assert.equal(final.eligibility.allowed, true);
  assert.equal(final.holds.length, 2);
  assert.ok(final.holds.every((h) => h.ended));
  assert.equal((await detail(b)).risks[0].status, 'cleared');
});

test('D18 payment methods, confirmation, uncertain withdrawal, decline and chargeback reconcile one sandbox wallet', async (t) => {
  const { base, database } = await startSandbox(t),
    admin = client(base),
    second = client(base),
    d = 'admin/desk/';
  await checked(admin, 'admin/login', staffCredentials);
  await checked(second, 'admin/login', staffCredentials);
  const id = (
    await checked(admin, d + 'review', { action: 'create', label: 'Cashier test', market: 'north' })
  ).id;
  const wallet = () => checked(admin, d + 'cashier?id=' + id),
    file = () => checked(admin, d + 'subject?id=' + id);
  const edit = async (action, extra) =>
    checked(admin, d + 'review', { id, version: (await file()).version, action, ...extra });
  const routes = (await checked(admin, d + 'routes')).items;
  assert.equal(routes.length, 2);
  const simulate = (minor, asset = 'TST', direction = 'deposit') =>
    checked(admin, d + 'options?' + new URLSearchParams({ direction, market: 'north', asset, minor }));
  assert.deepEqual((await simulate(1000)).eligible, ['cards', 'wallet']);
  assert.equal((await simulate(1000, 'CAD')).routes[0].reason, 'route_currency');
  await checked(admin, d + 'cashier', { action: 'route', ...routes[0], enabled: false });
  assert.equal((await simulate(1000)).routes.find((r) => r.key === 'cards').reason, 'route_disabled');
  assert.deepEqual((await simulate(200001)).eligible, []);
  assert.equal((await simulate(200001)).routes.find((r) => r.key === 'wallet').reason, 'route_max');
  const create = (direction, minor, key = randomUUID()) => ({
    action: 'initiate',
    subject: id,
    key,
    direction,
    minor,
    asset: 'TST',
    route: 'wallet',
  });
  assert.equal((await admin(d + 'cashier', create('withdrawal', 2000))).data.error, 'identity_required');
  const dep = create('deposit', 5000),
    created = await checked(admin, d + 'cashier', dep);
  assert.deepEqual(await checked(admin, d + 'cashier', dep), created);
  assert.equal((await admin(d + 'cashier', { ...dep, minor: 1000 })).status, 409);
  const read = (id) => checked(admin, d + 'intent?id=' + id);
  const step = async (id, action) =>
    checked(admin, d + 'cashier', { id, action, version: (await read(id)).version });
  const evt = async (id, outcome, eventId) => {
    const r = await read(id);
    return {
      id,
      action: 'event',
      outcome,
      eventId,
      processorRef: r.processorRef,
      route: r.route,
      minor: r.minor,
      asset: r.asset,
    };
  };
  await step(created.id, 'return');
  assert.equal((await wallet()).balance.available, 0);
  const credited = await evt(created.id, 'success', 'deposit-settled');
  assert.equal((await admin(d + 'cashier', { ...credited, minor: 4999 })).status, 400);
  const [one, two] = await Promise.all([
    checked(admin, d + 'cashier', credited),
    checked(second, d + 'cashier', credited),
  ]);
  assert.deepEqual(one, two);
  assert.equal((await wallet()).balance.available, 5000);
  assert.equal((await admin(d + 'cashier', { ...credited, outcome: 'decline' })).status, 409);
  for (const type of ['age', 'photo']) await edit('evidence', { type });
  await edit('callback', { cycle: 1, eventId: 's1', outcome: 'review' });
  const approval = await edit('decide', { outcome: 'approved', reason: 'confirmed' });
  const [a, b] = await Promise.all([
    admin(d + 'cashier', create('withdrawal', 3000)),
    second(d + 'cashier', create('withdrawal', 3000)),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const withdraw = (a.status === 200 ? a : b).data;
  assert.equal((await wallet()).balance.held, 3000);
  await edit('expire', {});
  assert.equal(
    (await admin(d + 'cashier', { id: withdraw.id, action: 'send', version: 1 })).data.error,
    'identity_required',
  );
  await edit('recheck', {});
  for (const type of ['age', 'photo']) await edit('evidence', { type });
  await edit('callback', { cycle: 2, eventId: 's2', outcome: 'review' });
  const refreshed = await edit('decide', { outcome: 'approved', reason: 'corrected' });
  await step(withdraw.id, 'send');
  const sent = await read(withdraw.id);
  assert.equal(sent.decision, approval.decision);
  assert.equal(sent.authorizedDecision, refreshed.decision);
  await step(withdraw.id, 'timeout');
  const pending = await read(withdraw.id);
  assert.equal(pending.processorRef, sent.processorRef);
  assert.equal(pending.status, 'unknown');
  assert.equal((await wallet()).balance.held, 3000);
  await edit('expire', {});
  const late = await evt(withdraw.id, 'success', 'payout-success');
  const paid = await checked(admin, d + 'cashier', late);
  assert.deepEqual(await checked(admin, d + 'cashier', late), paid);
  assert.equal((await wallet()).balance.held, 0);
  await edit('recheck', {});
  for (const type of ['age', 'photo']) await edit('evidence', { type });
  await edit('callback', { cycle: 3, eventId: 's3', outcome: 'review' });
  await edit('decide', { outcome: 'approved', reason: 'confirmed' });
  const bad = await checked(admin, d + 'cashier', create('withdrawal', 2000));
  await step(bad.id, 'send');
  await step(bad.id, 'timeout');
  await checked(admin, d + 'cashier', await evt(bad.id, 'decline', 'payout-declined'));
  assert.deepEqual((await wallet()).balance, { available: 2000, held: 0, clearing: -2000, game: 0 });
  const top = await checked(admin, d + 'cashier', create('deposit', 1000));
  await checked(admin, d + 'cashier', await evt(top.id, 'success', 'top-ok'));
  const reverse = await evt(top.id, 'chargeback', 'top-reversed');
  const reversed = await checked(admin, d + 'cashier', reverse);
  assert.deepEqual(await checked(admin, d + 'cashier', reverse), reversed);
  assert.equal((await wallet()).balance.available, 2000);
  const db = new DatabaseSync(database);
  t.after(() => db.close());
  assert.equal(db.prepare('SELECT count(*) AS n FROM ledger').get().n, 0);
  assert.equal((await checked(admin, 'admin/operator/pilots')).total, 0);
  const run = db.prepare('SELECT wallet FROM review_subjects WHERE id=?').get(id).wallet;
  assert.equal((await admin('admin/operator/pilot?id=' + run)).status, 404);
  assert.equal(
    db
      .prepare(
        'SELECT count(*) AS n FROM (SELECT ref FROM pilot_postings GROUP BY run,ref HAVING sum(minor)<>0)',
      )
      .get().n,
    0,
  );
});
test('Market-specific age and optional face checks require passed samples, and a two-reviewer hold survives the first release', async (t) => {
  const { base } = await startSandbox(t),
    admin = client(base),
    second = client(base),
    help = client(base),
    d = 'admin/desk/';
  await checked(admin, 'admin/login', staffCredentials);
  for (const [account, name, role] of [
    [second, 'second', 'operator_admin'],
    [help, 'help', 'operator_support'],
  ]) {
    const login = { email: name + '-v25@example.test', password: 'fixture-only-password' };
    await checked(admin, 'admin/staff', { ...login, role });
    await checked(account, 'admin/login', login);
  }
  await checked(admin, d + 'review', {
    action: 'policy',
    market: 'north',
    documents: ['age', 'face', 'liveness'],
    days: 30,
    minAge: 21,
    dualRelease: true,
    version: 0,
  });
  const { id } = await checked(admin, d + 'review', {
    action: 'create',
    market: 'north',
    label: 'QA actor',
  });
  const detail = () => checked(admin, d + 'subject?id=' + id);
  const call = async (actor, action, extra) =>
    actor(d + 'review', { id, action, version: (await detail()).version, ...extra });
  const action = async (actor, k, fields) => {
    const x = await call(actor, k, fields);
    assert.equal(x.status, 200, JSON.stringify(x.data));
    return x.data;
  };
  for (const [type, sample] of [
    ['age', 'sample-19'],
    ['face', 'mismatch'],
    ['liveness', 'match'],
  ])
    await action(admin, 'evidence', { type, sample });
  await action(admin, 'callback', { cycle: 1, outcome: 'review', eventId: 'first' });
  assert.equal(
    (await call(admin, 'decide', { outcome: 'approved', reason: 'confirmed' })).data.error,
    'reviewSampleFailed',
  );
  await action(admin, 'decide', { outcome: 'more', reason: 'mismatch' });
  for (const [type, sample] of [
    ['face', 'match'],
    ['age', 'sample-30'],
  ])
    await action(admin, 'evidence', { type, sample });
  await action(admin, 'callback', { cycle: 1, outcome: 'review', eventId: 'resubmit' });
  await action(admin, 'decide', { outcome: 'approved', reason: 'corrected' });
  const { risk } = await action(admin, 'signal', {
    kind: 'screening',
    marker: 'sample-a',
    listVersion: 4,
    eventId: 'r4',
  });
  assert.equal((await detail()).risks[0].provider, 'fixture-watchlist');
  const { hold } = await action(admin, 'hold', { risk, reason: 'risk_confirmed' });
  await action(admin, 'release', { risk, hold, reason: 'corrected' });
  assert.equal((await detail()).eligibility.reason, 'payout_hold');
  assert.equal(
    (await call(admin, 'release', { risk, hold, reason: 'corrected' })).data.error,
    'reviewSecond',
  );
  await action(second, 'release', { risk, hold, reason: 'inspected' });
  assert.equal((await detail()).eligibility.reason, 'eligible');
  const dep = await checked(admin, d + 'cashier', {
    action: 'initiate',
    direction: 'deposit',
    subject: id,
    key: 'dep',
    route: 'wallet',
    minor: 5000,
    asset: 'TST',
  });
  const val = await checked(admin, d + 'intent?id=' + dep.id);
  await checked(admin, d + 'cashier', {
    action: 'event',
    id: val.id,
    eventId: 'fund',
    processorRef: val.processorRef,
    route: val.route,
    minor: val.minor,
    asset: val.asset,
    outcome: 'success',
  });
  const withdrawal = await checked(admin, d + 'cashier', {
    action: 'initiate',
    direction: 'withdrawal',
    subject: id,
    key: 'out',
    route: 'wallet',
    minor: 2000,
    asset: 'TST',
  });
  await checked(admin, d + 'cashier', { action: 'send', id: withdrawal.id, version: 1 });
  await checked(admin, d + 'cashier', { action: 'timeout', id: withdrawal.id, version: 2 });
  const summary = await checked(help, d + 'subject?id=' + id);
  assert.deepEqual(
    summary.withdrawals.map((x) => [x.id, x.status, x.lastAction, typeof x.updated]),
    [[withdrawal.id, 'unknown', 'timeout', 'number']],
  );
  assert.equal(summary.results, undefined);
  assert.equal(summary.withdrawals[0].processorRef, undefined);
  assert.equal((await help(d + 'cashier?id=' + id)).status, 403);
});
test('player entry supports a verified alias, email codes and older email-only accounts', async t => {
  const {base,database}=await startSandbox(t);
  const app=client(base), db=new DatabaseSync(database); t.after(()=>db.close());
  const profile={email:'new-entry@example.test',username:'Arena.Blue',accepted:true,password:'demo-example-password',locale:'fr-CA'};
  assert.equal((await app('signup',{...profile,accepted:false})).data.error,'termsRequired');
  assert.equal((await app('signup',{...profile,username:'a'})).data.error,'invalidUsername');
  const signup=await app('signup',profile); assert.equal(signup.status,200);
  assert.equal((await app('signup',{...profile,email:'next@example.test',username:'arena.blue'})).data.error,'usernameTaken');
  assert.equal((await app('login',{identifier:'ARENA.BLUE',password:profile.password})).data.error,'emailVerificationRequired');
  await app('email-verification/complete',{token:new URL(signup.data.verifyUrl).searchParams.get('verify')});
  assert.equal((await app('login',{identifier:'ARENA.BLUE',password:profile.password})).data.username,'Arena.Blue');
  await app('logout',{});
  const start=async body=>(await app('player-auth/code/start',body)).data;
  const end=async (ticket,code)=>app('player-auth/code/finish',{ticket,code});
  const {ticket,previewCode}=await start({mode:'signin',email:profile.email});
  assert.match(previewCode,/^\d{8}$/);
  assert.equal((await start({mode:'signin',email:profile.email})).previewCode,undefined);
  assert.equal((await start({mode:'signin',email:'absent@example.test'})).previewCode,undefined);
  assert.equal((await end(ticket,previewCode==='11111111'?'00000000':'11111111')).data.error,'codeInvalid');
  const confirmed=await end(ticket,previewCode);assert.equal(confirmed.data.username,profile.username);
  assert.equal(confirmed.data.balance,10000);assert.equal(confirmed.data.sessionToken,undefined);
  assert.equal((await end(ticket,previewCode)).data.error,'codeInvalid');
  await app('logout',{});
  const codeEntry={...profile,email:'code-entry@example.test',username:'SeatOne',mode:'signup'};
  const pending=await start(codeEntry);
  assert.equal(db.prepare('SELECT id FROM players WHERE email=?').get(codeEntry.email),undefined);
  const joined=await end(pending.ticket,pending.previewCode);assert.equal(joined.data.emailVerified,1);
  assert.equal(joined.data.username,codeEntry.username);assert.equal(joined.data.preferredLocale,'fr-CA');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ledger WHERE player=?').get(joined.data.id).n,1);
  assert.equal(db.prepare('SELECT terms_version FROM player_login_names WHERE player_id=?').get(joined.data.id).terms_version,'player-18-demo-v1');
  await app('logout',{});
  const blocked=await start({mode:'signin',email:codeEntry.email});
  db.prepare("UPDATE players SET access_status='suspended' WHERE id=?").run(joined.data.id);
  assert.equal((await end(blocked.ticket,blocked.previewCode)).data.error,'playerSuspended');
  assert.equal((await app('account')).data,null);
  db.prepare("UPDATE players SET access_status='active' WHERE id=?").run(joined.data.id);
  db.prepare('UPDATE player_login_codes SET created_at=0').run();
  assert.equal((await end(blocked.ticket,blocked.previewCode)).data.error,'codeInvalid');
  const legacy=client(base);await register(legacy);
  assert.equal((await legacy('account')).data.username,null);
  assert.equal((await legacy('account/profile',{displayName:'',locale:'en-CA',username:'Arena.Blue'})).status,409);
  assert.equal((await legacy('account/profile',{displayName:'',locale:'en-CA',username:'LegacyPlayer'})).data.username,'LegacyPlayer');
  await legacy('logout',{});
  assert.equal((await legacy('login',{identifier:'legacyplayer',password:playerCredentials.password})).data.username,'LegacyPlayer');
});

test('a mailed access code stays out of API responses and stops after repeated invalid entries',async t=>{
  const {base,readMail}=await startSandbox(t,{captureMail:true});
  const api=client(base);
  const result=await api('player-auth/code/start',{mode:'signup',locale:'fr-CA',email:'delivery@example.test',username:'NewSeat',accepted:true});
  assert.deepEqual(Object.keys(result.data),['ticket']);
  let mail;
  for(let i=0;i<30 && !mail;i++){await new Promise(done=>setTimeout(done,15));mail=await readMail().then(items=>items[0]).catch(()=>null);}
  assert.ok(mail);assert.equal(mail.to[0],'delivery@example.test');
  const code=mail.text.match(/\b\d{8}\b/)[0], wrong=code==='00000000'?'11111111':'00000000';
  for(let i=0;i<5;i++)assert.equal((await api('player-auth/code/finish',{ticket:result.data.ticket,code:wrong})).data.error,'codeInvalid');
  assert.equal((await api('player-auth/code/finish',{ticket:result.data.ticket,code})).data.error,'codeInvalid');
  assert.deepEqual((await api('player-auth/methods')).data.providers,[]);
  assert.equal((await api('player-auth/external/start',{mode:'signup',provider:'google'})).data.error,'providerUnavailable');
});
