import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

test('player and provider sandbox flows', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'northplay-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const token = randomBytes(32).toString('hex');
  const server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: directory,
      ADMIN_TOKEN: token, PROVIDER_KEY_ENCRYPTION: randomBytes(32).toString('hex'),
      SECURE_COOKIES: '0'
    }
  });
  const exited = once(server, 'exit');
  t.after(async () => {
    server.kill();
    await exited;
  });
  await Promise.race([
    once(server.stdout, 'data'),
    exited.then(([code]) => assert.fail('Server exited with code ' + code))
  ]);

  const base = 'http://127.0.0.1:' + port;
  let cookie = '';
  async function request(path, payload, auth) {
    const response = await fetch(base + '/api/' + path, {
      method: payload ? 'POST' : 'GET',
      headers: {
        ...(payload && { 'Content-Type': 'application/json' }),
        ...(auth && { Authorization: 'Bearer ' + auth }),
        ...(cookie && { Cookie: cookie })
      },
      body: payload && JSON.stringify(payload)
    });
    const newCookie = response.headers.get('set-cookie');
    if (newCookie) cookie = newCookie.split(';')[0];
    return { status: response.status, data: await response.json() };
  }

  assert.match(await (await fetch(base)).text(), /Northplay Casino/);
  assert.equal((await fetch(base + '/hero.webp')).status, 200);
  assert.equal((await request('account')).data, null);

  const credentials = { email: 'player@example.test', password: 'example-test-password' };
  assert.equal((await request('signup', credentials)).data.balance, 10000);
  const play = { game: 'gold', wager: 500, requestId: randomBytes(18).toString('hex') };
  const round = await request('play', play);
  assert.equal(round.status, 200);
  assert.equal(Math.abs(round.data.amount), 500);
  assert.equal(round.data.balance, 10000 + round.data.amount);
  assert.deepEqual((await request('play', play)).data, round.data);
  assert.equal((await request('play', { ...play, wager: 100 })).status, 409);
  assert.equal((await request('account')).data.history.length, 2);
  await request('logout', {});
  assert.equal((await request('play', play)).status, 401);
  assert.equal((await request('login', credentials)).data.balance, round.data.balance);

  const key = 'sample-provider-secret';
  assert.equal((await request('providers', { name: 'Demo', key })).status, 401);
  assert.equal((await request('providers', { name: 'Demo', key }, token)).status, 200);
  assert.equal((await request('providers', { name: 'Demo', key: key + '-rotated' }, token)).status, 200);
  const providers = (await request('providers/list', {}, token)).data;
  assert.equal(providers.length, 1);
  assert.deepEqual(Object.keys(providers[0]).sort(), ['name', 'updated']);
  const db = new DatabaseSync(join(directory, 'northplay.sqlite'), { readOnly: true });
  assert.match(db.prepare('SELECT encrypted_key FROM providers').get().encrypted_key, /^[A-Za-z0-9+/]+=*$/);
  assert.deepEqual(db.prepare('SELECT action FROM provider_events ORDER BY id').all().map(({ action }) => action), ['added', 'rotated']);
  db.close();
});
