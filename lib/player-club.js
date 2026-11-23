import { games } from '../public/catalog.js';

const dayMs = 86_400_000;
const defaultAmount = 500;
const rewardKind = 'club:daily:';
const utcDay = now => new Date(now).toISOString().slice(0, 10);

export function createPlayerClub(db, { rewards, accountBreaks, fail, previewCount, audit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS club_trend_pins(tenant TEXT NOT NULL,slot INTEGER NOT NULL,game TEXT NOT NULL,PRIMARY KEY(tenant,slot),UNIQUE(tenant,game));
    CREATE INDEX IF NOT EXISTS club_daily_activity ON ledger(tenant_id,created_at,player)
    WHERE request_id GLOB 'club:daily:*';
    CREATE TABLE IF NOT EXISTS club_daily_settings(tenant_id TEXT PRIMARY KEY REFERENCES tenants(id), version INTEGER NOT NULL,
      enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 1000000))`);
  const query = sql => db.prepare(sql);
  const dailyReceipt = query('SELECT id,amount FROM ledger WHERE tenant_id=? AND player=? AND request_id=?');
  const credit = query(`INSERT INTO ledger(tenant_id,player,wager,amount,request_id,created_at,outcome)
    VALUES(?,?,0,?,?,?,?)`);
  const safety = query('SELECT excluded_at FROM player_safety WHERE player=?');
  const lifetime = query(`SELECT
    (SELECT COUNT(*) FROM ledger WHERE tenant_id=:tenant AND player=:player AND request_id GLOB 'club:daily:*') AS gifts,
    (SELECT COUNT(*) FROM cosmetic_grants g JOIN discovery_programs p ON p.id=g.program
     JOIN discovery_versions v ON v.program=g.program AND v.version=g.version
     WHERE p.tenant_id=:tenant AND g.player=:player AND json_extract(v.spec,'$.template')<>'offer') AS quests`);
  const scoredEvents = `WITH events AS (
    SELECT id,player,created_at AS at,1 AS points FROM ledger WHERE tenant_id=:tenant AND created_at>=:start AND created_at<:end AND request_id GLOB 'club:daily:*'
    UNION ALL
    SELECT g.id,g.player,g.granted_at,3 FROM cosmetic_grants g JOIN discovery_programs p ON p.id=g.program
      JOIN discovery_versions v ON v.program=g.program AND v.version=g.version
      WHERE p.tenant_id=:tenant AND g.granted_at>=:start AND g.granted_at<:end AND json_extract(v.spec,'$.template')<>'offer'
    ), eligible AS (
      SELECT e.* FROM events e JOIN players p ON p.id=e.player AND p.tenant_id=:tenant
      LEFT JOIN player_safety s ON s.player=e.player
      WHERE p.report_fixture=0 AND p.access_status='active' AND s.excluded_at IS NULL
    )`;
  const recentPoints = query(scoredEvents + ' SELECT id,at,points FROM eligible ORDER BY at DESC,points DESC,id DESC LIMIT 16');
  const weekly = query(scoredEvents + `, scores AS (
      SELECT player,sum(points) AS score FROM eligible GROUP BY player
    ), groups_by_score AS (
      SELECT score,count(*) AS players,max(player=:player) AS mine FROM scores GROUP BY score
    ) SELECT score,players,mine,1+coalesce(sum(players) OVER (ORDER BY score DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS rank
    FROM groups_by_score ORDER BY score DESC`);
  const recentGames = query(`SELECT l.game AS id,count(*) AS rounds,max(max(l.amount,0)) AS topWin FROM ledger l
    JOIN players p ON p.id=l.player AND p.tenant_id=l.tenant_id
    WHERE l.tenant_id=? AND l.created_at>=? AND l.created_at<=? AND l.game IS NOT NULL AND p.report_fixture=0
    GROUP BY l.game ORDER BY rounds DESC,l.game`);
  const publicPrograms = query(`SELECT p.id,v.spec FROM discovery_programs p
    JOIN discovery_versions v ON v.program=p.id AND v.version=p.live
    WHERE p.tenant_id=? AND p.archived=0 ORDER BY p.id DESC`);
  const configRow=query('SELECT version,enabled,amount FROM club_daily_settings WHERE tenant_id=?');
  function settings(tenant) {
    const row=configRow.get(tenant);
    return row ? {...row,enabled:Boolean(row.enabled)} : {version:0,enabled:true,amount:defaultAmount};
  }
  function configure(tenant,actor,request,input) {
    const before=settings(tenant);
    if(!Number.isSafeInteger(input.version) || typeof input.enabled!=='boolean' || !Number.isSafeInteger(input.amount) || input.amount<1 || input.amount>1000000) fail(400,'invalid');
    if(input.version!==before.version) fail(409,'discoveryConflict');
    const version=before.version+1;
    query(`INSERT INTO club_daily_settings VALUES(?,?,?,?) ON CONFLICT(tenant_id) DO UPDATE SET
      version=excluded.version,enabled=excluded.enabled,amount=excluded.amount`).run(tenant,version,Number(input.enabled),input.amount);
    return {version,auditId:audit(tenant,actor,'club_daily_settings','player-club',request,{revision:version,fields:['enabled','amount']})};
  }
  function catalogue(tenant, now) {
    return publicPrograms.all(tenant).flatMap(({id,spec:raw}) => {
      const spec = JSON.parse(raw);
      if (spec.startsAt>now || now>=(spec.endsAt??Infinity) || now>=(spec.claimUntil??Infinity)) return [];
      return [{id,spec}];
    });
  }
  const blocked = (tenant, player, now) => Boolean(safety.get(player)?.excluded_at || accountBreaks.at(tenant,player,now));
  function home(tenant, player, locale, now=Date.now(), period=1) {
    const day = utcDay(now), config=settings(tenant);
    const receipt=player && dailyReceipt.get(tenant,player,rewardKind+day);
    const items = player ? rewards.state(tenant,player).items.filter(item =>
      ['available','enrolled','claimable','claimed','paused','soldOut'].includes(item.state)) : catalogue(tenant,now);
    const previews=previewCount(tenant,locale);
    const visible=items.filter(i=>!['Q01','Q04'].includes(i.spec.template) || previews>=3 || i.startedAt || i.award);
    if(![1,7].includes(period))fail(400,'invalid');
    const ordered=recentGames.all(tenant,now-dayMs*period,now).filter(row=>games.some(game=>game.id===row.id));
    const positions=Array(Math.min(4,ordered.length)),pinned=new Set();
    for(const {slot,game} of query('SELECT slot,game FROM club_trend_pins WHERE tenant=? ORDER BY slot').all(tenant)){
      const row=ordered.find(r=>r.id===game);
      if(row&&slot<=positions.length){positions[slot-1]=row;pinned.add(game);}
    }
    const remaining=ordered.filter(r=>!pinned.has(r.id));let offset=0;
    for(let i=0;i<positions.length;i++)if(!positions[i])positions[i]=remaining[offset++];
    const trending=positions;
    return {
      trending,period,
      day, next:Date.parse(day+'T00:00:00Z')+dayMs, amount:receipt?.amount??config.amount, enabled:config.enabled,
      claimed:Boolean(receipt),
      blocked:Boolean(player && blocked(tenant,player,now)),
      points:player ? lifetime.get({tenant,player}) : null,
      items:visible.map(({id,spec,state,marks,goal,award}) => ({
        id, titleEn:spec.titleEn, titleFr:spec.titleFr, itemEn:spec.itemEn, itemFr:spec.itemFr,
        template:spec.template, slot:spec.slot, color:spec.color, state:state||'public', deadline:spec.claimUntil??spec.endsAt??null,
        done:marks?.length||0, goal:goal||0, owned:Boolean(award?.claimId)
      }))
    };
  }
  function claim(tenant, player, day, expectedAmount, now=Date.now()) {
    if (day!==utcDay(now)) fail(409,'clubDayChanged');
    if (blocked(tenant,player,now)) fail(409,'discoveryPaused');
    const key=rewardKind+day, prior=dailyReceipt.get(tenant,player,key);
    if (prior) return {credited:false};
    const config=settings(tenant);
    if(!config.enabled || (expectedAmount!==undefined && expectedAmount!==config.amount)) fail(409,'clubOfferChanged');
    credit.run(tenant,player,config.amount,key,now,JSON.stringify({type:'club_daily',day}));
    return {credited:true};
  }
  function standings(tenant, player, now=Date.now(), includeActivity=false) {
    const date=new Date(now);
    const start=Date.parse(utcDay(now)+'T00:00:00Z')-(date.getUTCDay()+6)%7*dayMs;
    const end=start+7*dayMs;
    const rows=weekly.all({tenant,start,end,player:player||0});
    const present=({rank,score,players})=>({rank,score,players});
    const own=rows.find(row=>row.mine);
    return {start,end,rows:rows.slice(0,5).map(present),own:own?present(own):null,
      ...(includeActivity && {activity:recentPoints.all({tenant,start,end:Math.min(end,now+1)})})};
  }
  return {home,claim,standings,settings,configure};
}
