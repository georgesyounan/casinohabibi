import { randomInt } from 'node:crypto';
import { weekStart } from './lobby-events.js';

const dayMs = 86_400_000;
const spinCount = 7;
const stake = 100;
const definitions = ['spins', 'reload', 'rakeback', 'daily', 'weekly', 'premonth', 'monthly'];
const isoDay = (time) => new Date(time).toISOString().slice(0, 10);

export function slotRoll() {
  const symbols = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎'];
  const reels = Array.from({ length: 3 }, () => symbols[randomInt(symbols.length)]);
  const distinct = new Set(reels).size;
  return { reels, multiplier: distinct === 1 ? 5 : distinct === 2 ? 2 : 0 };
}

export function createGiftRewards(db, { club, events, accountBreaks, fail }) {
  db.exec(`CREATE TABLE IF NOT EXISTS club_spin_packs(
    tenant_id TEXT NOT NULL REFERENCES tenants(id), player INTEGER NOT NULL REFERENCES players(id),
    week_start INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0 CHECK(used BETWEEN 0 AND 7),
    PRIMARY KEY(tenant_id,player,week_start))`);
  const pack = db.prepare('SELECT used FROM club_spin_packs WHERE tenant_id=? AND player=? AND week_start=?');
  const grant = db.prepare(
    'INSERT INTO club_spin_packs(tenant_id,player,week_start) VALUES(?,?,?) ON CONFLICT DO NOTHING'
  );
  const spend = db.prepare(
    'UPDATE club_spin_packs SET used=used+1 WHERE tenant_id=? AND player=? AND week_start=? AND used=? AND used<7'
  );
  const receipts = db.prepare(
    'SELECT amount,outcome FROM ledger WHERE tenant_id=? AND player=? AND request_id=?'
  );
  const credit = db.prepare(
    'INSERT INTO ledger(tenant_id,player,game,wager,amount,request_id,created_at,outcome) VALUES(?,?,?,0,?,?,?,?)'
  );
  const volume = db.prepare(
    'SELECT coalesce(sum(wager),0) AS cents FROM ledger WHERE tenant_id=? AND player=? AND game IS NOT NULL AND wager>0 AND created_at>=? AND created_at<?'
  );
  const eligible = db.prepare(`SELECT 1 FROM players p LEFT JOIN player_safety s ON s.player=p.id
    WHERE p.tenant_id=? AND p.id=? AND p.access_status='active' AND s.excluded_at IS NULL`);
  const paused = (tenant, player, now) =>
    !eligible.get(tenant, player) || Boolean(accountBreaks.at(tenant, player, now));
  const receiptKey = (key, period) =>
    key === 'daily' ? 'club:daily:' + isoDay(period) : 'club:gift:' + key + ':' + period;

  function describe(tenant, player, now = Date.now()) {
    const today = Math.floor(now / dayMs) * dayMs,
      week = weekStart(now),
      date = new Date(now);
    const month = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    const late = month + 24 * dayMs,
      daily = club.settings(tenant);
    const member = Boolean(player),
      blocked = member && paused(tenant, player, now);
    const currentPack = member && pack.get(tenant, player, week);
    const rebate = member ? Math.floor(volume.get(tenant, player, today - dayMs, today).cents / 100) : 0;
    const amounts = {
      spins: spinCount,
      reload: 200,
      rakeback: rebate,
      daily: daily.amount,
      weekly: 700,
      premonth: 300,
      monthly: 1000
    };
    const rows = definitions.map((key) => {
      const weekly = key === 'spins' || key === 'weekly',
        monthly = key === 'premonth' || key === 'monthly';
      const period = weekly ? week : monthly ? month : today;
      const next = weekly ? week + 7 * dayMs : monthly ? nextMonth : today + dayMs;
      const receipt = member && key !== 'spins' && receipts.get(tenant, player, receiptKey(key, period));
      let state = member ? 'available' : 'guest';
      let remaining = 0;
      if (key === 'spins' && currentPack) {
        remaining = spinCount - currentPack.used;
        state = remaining ? 'play' : 'claimed';
      } else if (receipt) state = 'claimed';
      else if (key === 'daily' && !daily.enabled) state = 'off';
      else if (key === 'premonth' && now < late) state = 'scheduled';
      else if (member && key === 'rakeback' && rebate === 0) state = 'empty';
      if (blocked) state = 'paused';
      return {
        key,
        period,
        next,
        amount: receipt ? receipt.amount : amounts[key],
        state,
        remaining,
        ...(key === 'premonth' ? { opens: late } : {}),
        ...(key === 'spins' ? { ordinal: currentPack ? currentPack.used + 1 : 1 } : {})
      };
    });
    return {
      now,
      nextDay: today + dayMs,
      rows,
      raffle: events.giftRaffle(tenant, player, now),
      owner: player || null,
      member
    };
  }
  // The HTTP handler holds a write transaction across verification, entitlement and wallet update.
  function redeem(tenant, player, input, now = Date.now()) {
    if (!player) fail(401, 'signin');
    if (
      !input ||
      !definitions.includes(input.key) ||
      !Number.isSafeInteger(input.period) ||
      !['claim', 'spin'].includes(input.action)
    )
      fail(400, 'invalid');
    if (paused(tenant, player, now)) fail(409, 'discoveryPaused');
    const { key, period, action } = input;
    const row = describe(tenant, player, now).rows.find((r) => r.key === key);
    if (period !== row.period) fail(409, 'clubDayChanged');
    if (action === 'spin') {
      if (
        key !== 'spins' ||
        !Number.isInteger(input.ordinal) ||
        input.ordinal < 1 ||
        input.ordinal > spinCount
      )
        fail(400, 'invalid');
      const request = 'club:freespin:' + period + ':' + input.ordinal;
      const existing = receipts.get(tenant, player, request);
      if (existing) return { spin: JSON.parse(existing.outcome), amount: existing.amount, changed: false };
      if (row.state !== 'play' || !spend.run(tenant, player, period, input.ordinal - 1).changes)
        fail(409, 'giftUnavailable');
      const spin = { ...slotRoll(), type: 'club_free_spin', game: 'gold', ordinal: input.ordinal };
      const amount = stake * spin.multiplier;
      credit.run(tenant, player, 'gold', amount, request, now, JSON.stringify(spin));
      return { spin, amount, changed: true };
    }
    if (row.state === 'claimed' || row.state === 'play') return { changed: false };
    if (row.state !== 'available') fail(409, 'giftUnavailable');
    if (key === 'spins') return { changed: Boolean(grant.run(tenant, player, period).changes) };
    if (input.amount !== row.amount) fail(409, 'clubOfferChanged');
    if (key === 'daily')
      return { changed: club.claim(tenant, player, isoDay(period), row.amount, now).credited };
    credit.run(
      tenant,
      player,
      null,
      row.amount,
      receiptKey(key, period),
      now,
      JSON.stringify({ type: 'club_gift', key })
    );
    return { changed: true };
  }
  return { describe, redeem };
}
