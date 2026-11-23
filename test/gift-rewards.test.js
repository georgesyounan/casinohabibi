import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createGiftRewards } from '../lib/gift-rewards.js';

test('gift periods, yesterday’s rebate, free spins and retries preserve balances across players and months', (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`CREATE TABLE tenants(id TEXT PRIMARY KEY);CREATE TABLE players(id INTEGER PRIMARY KEY,tenant_id TEXT,access_status TEXT);
    CREATE TABLE player_safety(player INTEGER,excluded_at INTEGER);
    CREATE TABLE ledger(id INTEGER PRIMARY KEY,tenant_id TEXT,player INTEGER,game TEXT,wager INTEGER,amount INTEGER,request_id TEXT,created_at INTEGER,outcome TEXT,UNIQUE(player,request_id));
    INSERT INTO tenants VALUES('a'),('b');INSERT INTO players VALUES(1,'a','active'),(2,'a','active'),(3,'b','active');`);
  let paused = false;
  const fail = (_, msg) => {
      throw Error(msg);
    },
    accountBreaks = { at: () => paused };
  const gifts = createGiftRewards(db, {
    club: { settings: () => ({ amount: 500, enabled: true }) },
    events: { giftRaffle: () => ({ prize: 2500, tickets: 0 }) },
    accountBreaks,
    telegram: { inspect: () => ({state:'telegramClosed'}), permits: () => false },
    fail
  });
  const now = Date.parse('2026-11-23T10:00:00Z'),
    day = 86400000;
  const row = (key, at = now, id = 1) => gifts.describe('a', id, at).rows.find((r) => r.key === key);
  const get = (key, at = now, ordinal) => {
    const r = row(key, at);
    return gifts.redeem(
      'a',
      1,
      { key, period: r.period, amount: r.amount, action: ordinal ? 'spin' : 'claim', ordinal },
      at
    );
  };
  assert.equal(row('rakeback').state, 'empty');
  const bet = db.prepare(
    "INSERT INTO ledger(tenant_id,player,game,wager,amount,created_at) VALUES(?,?,'gold',?,-100,?)"
  );
  bet.run('a', 1, 1150, now - day);
  bet.run('a', 2, 50000, now - day);
  bet.run('b', 3, 20000, now - day);
  bet.run('a', 1, 2000, now);
  assert.equal(row('rakeback').amount, 11);
  assert.equal(get('rakeback').changed, true);
  assert.equal(get('rakeback').changed, false);
  assert.equal(row('rakeback', now + day).amount, 20);
  assert.equal(row('rakeback', now + day).state, 'available');
  assert.equal(row('premonth').state, 'scheduled');
  assert.throws(() => get('premonth'), /giftUnavailable/);
  assert.equal(get('premonth', now + day * 2).changed, true);
  assert.equal(get('premonth', now + day * 3).changed, false);
  assert.throws(() => get('monthly'), /telegramClosed/);
  for (const key of ['reload', 'weekly', 'spins']) {
    assert.equal(get(key).changed, true);
    assert.equal(get(key).changed, false);
  }
  assert.equal(row('weekly', now + day * 3).state, 'claimed');
  assert.equal(row('weekly', now + day * 7).state, 'available');
  assert.equal(row('monthly', Date.parse('2026-12-01T00:00:00Z')).state, 'telegramClosed');
  assert.throws(() => get('spins', now, 2), /giftUnavailable/);
  for (let i = 1; i <= 7; i++) {
    const result = get('spins', now, i),
      duplicate = get('spins', now, i);
    assert.equal(result.changed, true);
    assert.ok([0, 200, 500].includes(result.amount));
    assert.deepEqual(duplicate, { ...result, changed: false });
    assert.equal(row('spins').remaining, 7 - i);
  }
  assert.equal(row('spins').state, 'claimed');
  assert.equal(row('spins', now, 2).state, 'available');
  assert.equal(
    db.prepare("SELECT count(*) AS n FROM ledger WHERE request_id LIKE 'club:freespin:%'").get().n,
    7
  );
  assert.throws(
    () =>
      gifts.redeem(
        'a',
        1,
        { key: 'spins', action: 'spin', period: row('spins').period, ordinal: 1 },
        now + 7 * day
      ),
    /clubDayChanged/
  );
  paused = true;
  assert.equal(row('reload').state, 'paused');
  assert.throws(() => get('reload'), /discoveryPaused/);
  assert.throws(
    () => gifts.redeem('b', 1, { key: 'weekly', action: 'claim', period: now }, now),
    /discoveryPaused/
  );
  assert.equal(gifts.describe('a', null, now).rows.find((r) => r.key === 'spins').state, 'guest');
});
