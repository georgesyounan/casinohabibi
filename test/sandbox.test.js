import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const staffCredentials = { email: 'admin@example.test', password: 'example-staff-password' };
const playerCredentials = { email: 'player@example.test', password: 'example-test-password' };

async function startSandbox(t, initializeDatabase) {
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
  const server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env, APP_ENV: 'development', HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory,
      BOOTSTRAP_ADMIN_EMAIL: staffCredentials.email, BOOTSTRAP_ADMIN_PASSWORD: staffCredentials.password,
      PROVIDER_KEY_ENCRYPTION: randomBytes(32).toString('hex'), SECURE_COOKIES: '0',
      PUBLIC_BASE_URL: '', RESET_EMAIL_API_KEY: '', RESET_EMAIL_FROM: '', PLATFORM_ADMIN_TOKEN: ''
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
  return { base: `http://127.0.0.1:${port}`, database };
}

function client(base, cookies = new Map()) {
  return async function request(path, payload, host) {
    const origin = new URL(base);
    if (host) origin.hostname = host;
    const response = await fetch(new URL('/api/' + path, origin), {
      method: payload === undefined ? 'GET' : 'POST',
      headers: {
        ...(payload !== undefined && { 'Content-Type': 'application/json' }),
        ...(cookies.size && { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') })
      },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [key, value] = cookie.split(';')[0].split('=');
      if (value) cookies.set(key, value);
      else cookies.delete(key);
    }
    return { status: response.status, data: await response.json(), requestId: response.headers.get('x-request-id') };
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

test('local startup migrates a non-tenant ledger and preserves existing player preferences', async (t) => {
  const { base, database } = await startSandbox(t, (db) => {
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
  });
  assert.equal((await fetch(base + '/readyz')).status, 200);
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const row = db.prepare('SELECT email_verified, preferred_locale, tenant_id FROM players WHERE id = 31').get();
    assert.deepEqual({ ...row }, { email_verified: 0, preferred_locale: 'fr-CA', tenant_id: 'sandbox' });
    assert.equal(db.prepare('SELECT amount FROM ledger WHERE player = 31 AND tenant_id = ?').get('sandbox').amount, 10000);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});
