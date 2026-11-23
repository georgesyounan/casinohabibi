import { randomInt } from 'node:crypto';
import { games } from '../public/catalog.js';

const day = 86_400_000;
const week = 7 * day;
const prize = 2500; // Play-money CAD cents.
const gameIds = new Set(games.map(game => game.id));

export function weekStart(now) {
  const date = new Date(now);
  return Math.floor(now / day) * day - ((date.getUTCDay() + 6) % 7) * day;
}

export function createLobbyEvents(db, { fail, accountBreaks, standings }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS club_raffle_entries(
      tenant_id TEXT NOT NULL REFERENCES tenants(id), week_start INTEGER NOT NULL,
      player INTEGER NOT NULL REFERENCES players(id), day_start INTEGER NOT NULL,
      PRIMARY KEY(tenant_id,week_start,player,day_start));
    CREATE TABLE IF NOT EXISTS club_raffle_draws(
      tenant_id TEXT NOT NULL REFERENCES tenants(id), week_start INTEGER NOT NULL,
      winner INTEGER REFERENCES players(id), entries INTEGER NOT NULL, awarded_at INTEGER NOT NULL, amount INTEGER NOT NULL,
      PRIMARY KEY(tenant_id,week_start));
    CREATE INDEX IF NOT EXISTS lobby_round_feed ON ledger(tenant_id,created_at DESC,id DESC) WHERE game IS NOT NULL;
  `);
  const publicRounds = `SELECT l.game,l.wager,l.amount,l.created_at AS at FROM ledger l
    JOIN players p ON p.id=l.player AND p.tenant_id=l.tenant_id
    WHERE l.tenant_id=? AND l.game IS NOT NULL AND l.wager>0 AND l.created_at BETWEEN ? AND ? AND p.report_fixture=0`;
  const recent = db.prepare(publicRounds + ' ORDER BY l.created_at DESC,l.id DESC LIMIT 16');
  const winningFrom = ` FROM ledger l JOIN players p ON p.id=l.player AND p.tenant_id=l.tenant_id
    WHERE l.tenant_id=? AND l.game IN ('roulette','gold','blackjack','aurora') AND l.amount>0 AND p.report_fixture=0
    AND l.created_at BETWEEN ? AND ?`;
  db.exec('CREATE INDEX IF NOT EXISTS lobby_positive_rounds ON ledger(tenant_id,id DESC) WHERE game IS NOT NULL AND amount>0');
  const winningFields='SELECT l.id AS cursor,l.game,l.wager,l.amount,l.created_at AS at';
  const latestWins=db.prepare(winningFields+winningFrom+' ORDER BY l.id DESC LIMIT 48');
  const newWins=db.prepare(winningFields+winningFrom+' AND l.id>? ORDER BY l.id LIMIT 49');
  function winFeed(tenant,after,now=Date.now()) {
    const tail=after!==null && after!==undefined;
    if(tail && (!Number.isSafeInteger(after)||after<0))fail(400,'invalid');
    const batch=tail?newWins.all(tenant,now-day,now,after):latestWins.all(tenant,now-day,now);
    const more=tail && batch.length>48;
    const rows=tail?batch.slice(0,48).reverse():batch;
    return {wins:rows,cursor:rows[0]?.cursor??after??0,more};
  }
  const allowed = db.prepare(`SELECT 1 FROM players p LEFT JOIN player_safety s ON s.player=p.id
    WHERE p.tenant_id=? AND p.id=? AND p.access_status='active' AND p.report_fixture=0 AND s.excluded_at IS NULL`);
  const entry = db.prepare('INSERT INTO club_raffle_entries VALUES(?,?,?,?) ON CONFLICT DO NOTHING');
  const pending = db.prepare(`SELECT DISTINCT e.tenant_id AS tenant,e.week_start AS start FROM club_raffle_entries e
    WHERE e.week_start<? AND NOT EXISTS (SELECT 1 FROM club_raffle_draws d WHERE d.tenant_id=e.tenant_id AND d.week_start=e.week_start)
    ORDER BY e.week_start LIMIT 32`);
  const eligible = ` FROM club_raffle_entries e JOIN players p ON p.id=e.player AND p.tenant_id=e.tenant_id
    LEFT JOIN player_safety s ON s.player=p.id WHERE e.tenant_id=? AND e.week_start=?
    AND p.access_status='active' AND p.report_fixture=0 AND s.excluded_at IS NULL`;
  const eligibleCount = db.prepare('SELECT count(*) AS n' + eligible);
  const winnerAt = db.prepare('SELECT e.player' + eligible + ' ORDER BY e.player,e.day_start LIMIT 1 OFFSET ?');
  const saveDraw = db.prepare('INSERT INTO club_raffle_draws VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING');
  const award = db.prepare(`INSERT INTO ledger(tenant_id,player,wager,amount,request_id,created_at,outcome)
    VALUES(?,?,0,?,?,?,?)`);
  const count = db.prepare(`SELECT count(*) AS total,count(CASE WHEN player=? THEN 1 END) AS own,
    count(CASE WHEN player=? AND day_start=? THEN 1 END) AS entered FROM club_raffle_entries WHERE tenant_id=? AND week_start=?`);
  const last = db.prepare('SELECT week_start AS start,entries,amount,winner=? AS won FROM club_raffle_draws WHERE tenant_id=? ORDER BY week_start DESC LIMIT 1');
  const paused = (tenant, player, now) => !allowed.get(tenant,player) || Boolean(accountBreaks.at(tenant,player,now));
  function enter(tenant, player, expectedDay, now=Date.now()) {
    const today = Math.floor(now/day)*day;
    if (expectedDay!==today) fail(409,'clubDayChanged');
    if (paused(tenant,player,now)) fail(409,'discoveryPaused');
    return {added:Boolean(entry.run(tenant,weekStart(now),player,today).changes)};
  }
  function board(tenant, player, now=Date.now()) {
    const start=weekStart(now), today=Math.floor(now/day)*day;
    const feed = stmt => stmt.all(tenant,now-day,now).filter(row=>gameIds.has(row.game));
    const raffle=count.get(player||0,player||0,today,tenant,start);
    return {now, start, end:start+week, today, prize, rounds:feed(recent), wins:winFeed(tenant,null,now).wins,
      race:standings(tenant,player,now), raffle:{...raffle,member:Boolean(player),blocked:Boolean(player && paused(tenant,player,now)),previous:last.get(player||0,tenant)||null}};
  }
  // Run under one write transaction. A receipt and the matching credit commit together.
  function settle(now=Date.now()) {
    for (const {tenant,start} of pending.all(weekStart(now))) {
      const n=eligibleCount.get(tenant,start).n;
      const winner=n ? winnerAt.get(tenant,start,randomInt(n)).player : null;
      if (!saveDraw.run(tenant,start,winner,n,now,winner?prize:0).changes || !winner) continue;
      award.run(tenant,winner,prize,'club:raffle:'+start,now,JSON.stringify({type:'club_raffle',week:start}));
    }
  }
  function giftRaffle(tenant,player,now) {
    const today=Math.floor(now/day)*day;
    return {prize,tickets:player?count.get(player,player,today,tenant,weekStart(now)).own:0};
  }
  return {board,enter,settle,winFeed,giftRaffle,hasDue:(now=Date.now())=>Boolean(pending.get(weekStart(now)))};
}
