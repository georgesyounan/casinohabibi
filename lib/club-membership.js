import {createPrizeClub} from './club-prizes.js';

// Spendable club points are independent of the demo cash ledger.
export function createMembership(db, {fail, accountBreaks}) {
  const query = sql => db.prepare(sql);
  const prizes=createPrizeClub(db,{fail,accountBreaks});
  db.exec(`CREATE TABLE IF NOT EXISTS club_members (
    player INTEGER PRIMARY KEY REFERENCES players(id), tenant TEXT NOT NULL, code TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS club_referrals (
    player INTEGER PRIMARY KEY REFERENCES players(id), tenant TEXT NOT NULL, sponsor INTEGER NOT NULL REFERENCES players(id), qualified_at INTEGER);
    CREATE INDEX IF NOT EXISTS club_referral_sponsor ON club_referrals(tenant,sponsor);
    CREATE TABLE IF NOT EXISTS club_point_rules (
    tenant TEXT NOT NULL, version INTEGER NOT NULL, threshold INTEGER NOT NULL, demote INTEGER NOT NULL,
    changed_at INTEGER NOT NULL, PRIMARY KEY(tenant,version));
    CREATE TABLE IF NOT EXISTS club_points (
    id INTEGER PRIMARY KEY, tenant TEXT NOT NULL, player INTEGER NOT NULL REFERENCES players(id),
    source TEXT NOT NULL, delta INTEGER NOT NULL, tier_delta INTEGER NOT NULL, rule INTEGER NOT NULL DEFAULT 1,
    at INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', UNIQUE(tenant,player,source));
    CREATE TABLE IF NOT EXISTS club_shop_items (
    tenant TEXT NOT NULL, sku TEXT NOT NULL, en TEXT NOT NULL, fr TEXT NOT NULL,
    price INTEGER NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), version INTEGER NOT NULL,
    PRIMARY KEY(tenant,sku));
    CREATE TABLE IF NOT EXISTS club_shop_orders (
    id INTEGER PRIMARY KEY, tenant TEXT NOT NULL, player INTEGER NOT NULL REFERENCES players(id),
    sku TEXT NOT NULL, price INTEGER NOT NULL, state TEXT NOT NULL, request TEXT NOT NULL, at INTEGER NOT NULL,
    UNIQUE(tenant,player,request), FOREIGN KEY(tenant,sku) REFERENCES club_shop_items(tenant,sku));
    CREATE INDEX IF NOT EXISTS club_orders_owner ON club_shop_orders(tenant,player,id);
    CREATE TABLE IF NOT EXISTS club_tournaments (
    id INTEGER PRIMARY KEY, tenant TEXT NOT NULL, title TEXT NOT NULL, starts INTEGER NOT NULL, ends INTEGER NOT NULL,
    min_tier INTEGER NOT NULL, tie TEXT NOT NULL, prize INTEGER NOT NULL, state TEXT NOT NULL,
    rules_version INTEGER NOT NULL DEFAULT 1, finalized_at INTEGER, winner INTEGER REFERENCES players(id));
    CREATE INDEX IF NOT EXISTS club_tourney_end ON club_tournaments(state,ends);
    CREATE TABLE IF NOT EXISTS club_tournament_weeks (tenant TEXT NOT NULL, monday INTEGER NOT NULL, tournament INTEGER NOT NULL REFERENCES club_tournaments(id), PRIMARY KEY(tenant,monday));
    CREATE TABLE IF NOT EXISTS club_entries (
    tournament INTEGER NOT NULL REFERENCES club_tournaments(id), player INTEGER NOT NULL REFERENCES players(id),
    entered INTEGER NOT NULL, place INTEGER, score INTEGER, PRIMARY KEY(tournament,player));
    CREATE TABLE IF NOT EXISTS club_member_migrations(version INTEGER PRIMARY KEY);
    CREATE TRIGGER IF NOT EXISTS club_enrol_member AFTER INSERT ON players BEGIN
      INSERT OR IGNORE INTO club_members VALUES(new.id,new.tenant_id,lower(hex(randomblob(12))));
    END;
    CREATE TRIGGER IF NOT EXISTS club_earn_daily AFTER INSERT ON ledger WHEN new.request_id GLOB 'club:daily:*' BEGIN
      INSERT OR IGNORE INTO club_points(tenant,player,source,delta,tier_delta,at)
      VALUES(new.tenant_id,new.player,'gift/'||new.id,1,1,new.created_at);
    END;
    CREATE TRIGGER IF NOT EXISTS club_earn_quest AFTER INSERT ON cosmetic_grants BEGIN
      INSERT OR IGNORE INTO club_points(tenant,player,source,delta,tier_delta,at)
      SELECT p.tenant_id,new.player,'quest/'||new.id,3,3,new.granted_at FROM discovery_programs p
      JOIN discovery_versions v ON v.program=p.id AND v.version=new.version
      WHERE p.id=new.program AND json_extract(v.spec,'$.template')<>'offer';
    END;`);
  if (!query('SELECT 1 FROM club_member_migrations WHERE version=1').get()) {
    db.exec(`INSERT OR IGNORE INTO club_members SELECT id,tenant_id,lower(hex(randomblob(12))) FROM players;
      INSERT OR IGNORE INTO club_points(tenant,player,source,delta,tier_delta,at)
      SELECT tenant_id,player,'gift/'||id,1,1,created_at FROM ledger WHERE request_id GLOB 'club:daily:*';
      INSERT OR IGNORE INTO club_points(tenant,player,source,delta,tier_delta,at)
      SELECT p.tenant_id,g.player,'quest/'||g.id,3,3,g.granted_at FROM cosmetic_grants g
      JOIN discovery_programs p ON p.id=g.program JOIN discovery_versions v ON v.program=g.program AND v.version=g.version
      WHERE json_extract(v.spec,'$.template')<>'offer';
      INSERT INTO club_member_migrations VALUES(1)`);
  }
  const safeInt=(x,min=1,max=1000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
  const eligible=(tenant,id)=>query(`SELECT 1 FROM players p LEFT JOIN player_safety s ON s.player=p.id
    WHERE p.tenant_id=? AND p.id=? AND p.access_status='active' AND s.excluded_at IS NULL`).get(tenant,id);
  const requestKey=v=>typeof v==='string' && /^[a-zA-Z0-9_-]{8,80}$/.test(v);
  function rules(tenant) {
    return query('SELECT version,threshold,demote FROM club_point_rules WHERE tenant=? ORDER BY version DESC LIMIT 1').get(tenant)
      || {version:1,threshold:100,demote:1};
  }
  function balance(tenant,player) {
    const row=query(`WITH movements AS (SELECT delta,tier_delta,
      sum(tier_delta) OVER(ORDER BY at,id ROWS UNBOUNDED PRECEDING) AS running
      FROM club_points WHERE tenant=? AND player=?)
      SELECT coalesce(sum(delta),0) AS available, coalesce(sum(tier_delta),0) AS earned,coalesce(max(running),0) AS peak FROM movements`).get(tenant,player);
    const rule=rules(tenant);
    return {...row,vip:(rule.demote?row.earned:row.peak)>=rule.threshold,threshold:rule.threshold};
  }
  function points(tenant,player,source,delta,tier,at,note='') {
    query('INSERT INTO club_points(tenant,player,source,delta,tier_delta,rule,at,note) VALUES(?,?,?,?,?,?,?,?)')
      .run(tenant,player,source,delta,tier,rules(tenant).version,at,note);
  }
  function seed(tenant) {
    query(`INSERT OR IGNORE INTO club_shop_items VALUES(?,?,?,?,?,?,1)`).run(tenant,'ocean-frame','Ocean frame','Cadre Océan',40,20);
    query(`INSERT OR IGNORE INTO club_shop_items VALUES(?,?,?,?,?,?,1)`).run(tenant,'studio-badge','Studio badge','Badge Studio',10,50);
  }
  function weekly(tenant,now=Date.now()) {
    const days=Math.floor(now/86400000);
    const monday=(days-(days+3)%7)*86400000;
    if(query('SELECT 1 FROM club_tournament_weeks WHERE tenant=? AND monday=?').get(tenant,monday))return;
    const id=operate(tenant,'tournament',{title:'Habibi Open',start:monday,end:monday+7*86400000,vip:false,tie:'first-entry',prize:40},now);
    query('INSERT INTO club_tournament_weeks VALUES(?,?,?)').run(tenant,monday,id);
  }
  function invite(tenant,player) {
    const member=query('SELECT code FROM club_members WHERE tenant=? AND player=?').get(tenant,player);
    if(!member)return null;
    const counts=query('SELECT count(*) AS invited,count(qualified_at) AS qualified FROM club_referrals WHERE tenant=? AND sponsor=?').get(tenant,player);
    return {...member,...counts};
  }
  function inviter(tenant,code) {
    if(!/^[a-f0-9]{24}$/.test(code||''))return null;
    const member=query('SELECT player FROM club_members WHERE tenant=? AND code=?').get(tenant,code);
    return member && eligible(tenant,member.player)?member.player:null;
  }
  function attribute(tenant,player,code) {
    const sponsor=inviter(tenant,code);
    if(sponsor && sponsor!==player)query('INSERT OR IGNORE INTO club_referrals(tenant,player,sponsor) VALUES(?,?,?)').run(tenant,player,sponsor);
  }
  function qualify(tenant,player,now=Date.now()) {
    const item=query(`SELECT r.sponsor FROM club_referrals r JOIN players p ON p.id=r.player AND p.tenant_id=r.tenant
      JOIN growth_first_saves s ON s.player=p.id AND s.tenant=r.tenant WHERE r.tenant=? AND r.player=? AND r.qualified_at IS NULL
      AND p.email_verified=1 AND p.access_status='active'`).get(tenant,player);
    if(!item || !eligible(tenant,item.sponsor))return;
    query('UPDATE club_referrals SET qualified_at=? WHERE tenant=? AND player=? AND qualified_at IS NULL').run(now,tenant,player);
    points(tenant,item.sponsor,'invite/'+player,5,5,now,'referral');
  }
  const items=tenant=>query('SELECT sku,en,fr,price,stock,version FROM club_shop_items WHERE tenant=? ORDER BY price,sku').all(tenant);
  function orders(tenant,player) {
    return query(`SELECT o.id,o.sku,o.price,o.state,o.at,i.en,i.fr FROM club_shop_orders o JOIN club_shop_items i
      ON i.tenant=o.tenant AND i.sku=o.sku WHERE o.tenant=? AND o.player=? ORDER BY o.id DESC LIMIT 60`).all(tenant,player);
  }
  function purchase(tenant,player,input,now) {
    if(!requestKey(input.key))fail(400,'invalid');
    const prior=query('SELECT id,sku,price FROM club_shop_orders WHERE tenant=? AND player=? AND request=?').get(tenant,player,input.key);
    if(prior){if(prior.sku!==input.sku || prior.price!==input.price)fail(409,'clubOfferChanged');return prior.id;}
    if(!eligible(tenant,player)||accountBreaks.at(tenant,player,now))fail(409,'discoveryPaused');
    const item=query('SELECT * FROM club_shop_items WHERE tenant=? AND sku=?').get(tenant,input.sku||'');
    if(!item||item.price!==input.price)fail(409,'clubOfferChanged');
    if(!item.stock)fail(409,'clubSoldOut');
    if(balance(tenant,player).available<item.price)fail(409,'clubNotEnoughPoints');
    const id=Number(query("INSERT INTO club_shop_orders(tenant,player,sku,price,state,request,at) VALUES(?,?,?,?,'reserved',?,?)")
      .run(tenant,player,item.sku,item.price,input.key,now).lastInsertRowid);
    query('UPDATE club_shop_items SET stock=stock-1,version=version+1 WHERE tenant=? AND sku=?').run(tenant,item.sku);
    points(tenant,player,'order/'+id,-item.price,0,now,item.sku);return id;
  }
  function cancel(tenant,player,id,now) {
    const order=query('SELECT * FROM club_shop_orders WHERE tenant=? AND player=? AND id=?').get(tenant,player,id);
    if(!order)fail(404,'discoveryMissing');
    if(order.state==='cancelled')return id;
    if(order.state!=='reserved')fail(409,'clubOrderClosed');
    query("UPDATE club_shop_orders SET state='cancelled' WHERE id=?").run(id);
    query('UPDATE club_shop_items SET stock=stock+1,version=version+1 WHERE tenant=? AND sku=?').run(tenant,order.sku);
    points(tenant,player,'cancel/'+id,order.price,0,now,order.sku);return id;
  }
  function rank(tour,now) {
    if(tour.state==='closed')return query('SELECT player,place,score FROM club_entries WHERE tournament=? ORDER BY place').all(tour.id);
    const sort=tour.tie==='last-point'?'coalesce(max(p.at),e.entered),e.entered,e.player':'e.entered,e.player';
    return query(`SELECT e.player,coalesce(sum(p.tier_delta),0) AS score FROM club_entries e LEFT JOIN club_points p ON
      p.tenant=? AND p.player=e.player AND p.at>=e.entered AND p.at<? AND (p.source LIKE 'gift/%' OR p.source LIKE 'quest/%')
      WHERE e.tournament=? GROUP BY e.player ORDER BY score DESC,${sort}`).all(tour.tenant,Math.min(now+1,tour.ends),tour.id)
      .map((v,i)=>({...v,place:i+1}));
  }
  function closeDue(tenant,now=Date.now()) {
    for(const tour of query("SELECT * FROM club_tournaments WHERE tenant=? AND state='open' AND ends<=?").all(tenant,now)) {
      const ranks=rank(tour,now);
      for(const row of ranks)query('UPDATE club_entries SET score=?,place=? WHERE tournament=? AND player=?').run(row.score,row.place,tour.id,row.player);
      const first=ranks.find(row=>row.score>0 && eligible(tenant,row.player))?.player||null;
      if(first)points(tenant,first,'tournament/'+tour.id,tour.prize,0,now,tour.title);
      query("UPDATE club_tournaments SET state='closed',winner=?,finalized_at=? WHERE id=?").run(first,now,tour.id);
    }
  }
  function tournaments(tenant,player,now) {
    const tours=query("SELECT * FROM club_tournaments WHERE tenant=? AND starts<=? ORDER BY (state='open') DESC,ends DESC LIMIT 8").all(tenant,now);
    return tours.map(t=>{
      const rows=rank(t,now),mine=rows.find(v=>v.player===player);
      return {id:t.id,title:t.title,ends:t.ends,closed:t.state==='closed'||t.ends<=now,prize:t.prize,minTier:t.min_tier,tie:t.tie,
        own:mine?{score:mine.score,place:mine.place,winner:t.winner===player}:null,
        leaders:rows.slice(0,5).map(v=>({place:v.place,score:v.score,mine:v.player===player,winner:t.winner===v.player}))};
    });
  }
  function enter(tenant,player,id,now) {
    const tour=query('SELECT * FROM club_tournaments WHERE id=? AND tenant=?').get(id,tenant);
    if(!tour)fail(404,'discoveryMissing');
    if(query('SELECT 1 FROM club_entries WHERE tournament=? AND player=?').get(id,player))return id;
    if(now<tour.starts || now>=tour.ends || tour.state!=='open')fail(409,'clubOrderClosed');
    if(!eligible(tenant,player)||accountBreaks.at(tenant,player,now))fail(409,'discoveryPaused');
    if(tour.min_tier&&!balance(tenant,player).vip)fail(409,'clubTierRequired');
    query('INSERT INTO club_entries(tournament,player,entered) VALUES(?,?,?)').run(id,player,now);return id;
  }
  function view(tenant,player,now=Date.now()) {
    return {prizes:prizes.view(tenant,player,now),items:items(tenant),wallet:player?balance(tenant,player):null,orders:player?orders(tenant,player):[],
      journal:player?query('SELECT id,source,delta,tier_delta AS tierDelta,at FROM club_points WHERE tenant=? AND player=? ORDER BY id DESC LIMIT 30').all(tenant,player):[],
      tournaments:tournaments(tenant,player,now)};
  }
  function operate(tenant,verb,input,now=Date.now()) {
    if(verb.startsWith('prize-'))return prizes.manage(tenant,verb,input,now);
    if(verb==='trend'){
      if(!safeInt(input.slot,1,4)||!['','gold','roulette','blackjack','aurora'].includes(input.game))fail(400,'invalid');
      query('DELETE FROM club_trend_pins WHERE tenant=? AND (slot=? OR game=?)').run(tenant,input.slot,input.game);
      if(input.game)query('INSERT INTO club_trend_pins VALUES(?,?,?)').run(tenant,input.slot,input.game);
      return input.slot;
    }
    if(verb==='rules'){
      const prev=rules(tenant);
      if(prev.version!==input.version)fail(409,'clubOfferChanged');
      if(!safeInt(input.threshold)||typeof input.demote!=='boolean')fail(400,'invalid');
      query('INSERT INTO club_point_rules VALUES(?,?,?,?,?)').run(tenant,prev.version+1,input.threshold,Number(input.demote),now);return prev.version+1;
    }
    if(verb==='item'){
      if(!/^[a-z][a-z0-9-]{1,48}$/.test(input.sku)||![input.en,input.fr].every(v=>typeof v==='string'&&v.trim()&&v.length<=90)||!safeInt(input.price)||!safeInt(input.stock,0))fail(400,'invalid');
      const prior=query('SELECT version FROM club_shop_items WHERE tenant=? AND sku=?').get(tenant,input.sku);
      if((prior?.version||0)!==input.version)fail(409,'clubOfferChanged');
      query(`INSERT INTO club_shop_items VALUES(?,?,?,?,?,?,?) ON CONFLICT(tenant,sku) DO UPDATE SET en=excluded.en,fr=excluded.fr,price=excluded.price,stock=excluded.stock,version=excluded.version`)
        .run(tenant,input.sku,input.en.trim(),input.fr.trim(),input.price,input.stock,input.version+1);return input.sku;
    }
    if(verb==='deliver'){
      const row=query('SELECT state FROM club_shop_orders WHERE tenant=? AND id=?').get(tenant,input.id||0);
      if(!row)fail(404,'discoveryMissing');if(row.state==='cancelled')fail(409,'clubOrderClosed');
      query("UPDATE club_shop_orders SET state='delivered' WHERE tenant=? AND id=?").run(tenant,input.id);return input.id;
    }
    if(verb==='award'||verb==='reverse'){
      if(!safeInt(input.player)||!eligible(tenant,input.player)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>160)fail(400,'invalid');
      if(verb==='award'){
        if(!safeInt(input.amount)||!requestKey(input.key))fail(400,'invalid');
        const source='staff/'+input.key;
        const prev=query('SELECT delta,note FROM club_points WHERE tenant=? AND player=? AND source=?').get(tenant,input.player,source);
        if(prev){if(prev.delta!==input.amount||prev.note!==input.reason)fail(409,'clubOfferChanged');return source;}
        points(tenant,input.player,source,input.amount,input.amount,now,input.reason);return source;
      }
      const entry=query('SELECT * FROM club_points WHERE tenant=? AND player=? AND id=?').get(tenant,input.player,input.id||0);
      if(!entry||entry.tier_delta<=0)fail(404,'discoveryMissing');
      if(!query('SELECT 1 FROM club_points WHERE tenant=? AND player=? AND source=?').get(tenant,input.player,'reversal/'+entry.id))
        points(tenant,input.player,'reversal/'+entry.id,-entry.delta,-entry.tier_delta,now,input.reason);
      return entry.id;
    }
    if(verb==='tournament'){
      if(typeof input.title!=='string'||!input.title.trim()||input.title.length>90||!safeInt(input.start,0,9e15)||
        !safeInt(input.end,input.start+1,9e15)||input.end<=now||typeof input.vip!=='boolean'||!['first-entry','last-point'].includes(input.tie)||!safeInt(input.prize))fail(400,'invalid');
      return Number(query("INSERT INTO club_tournaments(tenant,title,starts,ends,min_tier,tie,prize,state) VALUES(?,?,?,?,?,?,?,'open')")
        .run(tenant,input.title.trim(),input.start,input.end,Number(input.vip),input.tie,input.prize).lastInsertRowid);
    }
    if(verb==='close'){closeDue(tenant,now);return true;}
    fail(400,'invalid');
  }
  function adminView(tenant,now=Date.now()) {
    return {prizes:prizes.admin(tenant),rules:rules(tenant),pins:query('SELECT slot,game FROM club_trend_pins WHERE tenant=? ORDER BY slot').all(tenant),items:items(tenant),orders:query('SELECT id,player,sku,price,state FROM club_shop_orders WHERE tenant=? ORDER BY id DESC LIMIT 60').all(tenant),
      tournaments:query('SELECT id,title,starts,ends,state,min_tier,prize,tie FROM club_tournaments WHERE tenant=? ORDER BY id DESC LIMIT 60').all(tenant)};
  }
  return {seed,weekly,prizes,balance,invite,inviter,attribute,qualify,view,adminView,operate,purchase,cancel,enter,closeDue};
}
