export function createPlacementMetrics(db,{fail}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS shelf_impressions(ref TEXT PRIMARY KEY,tenant TEXT NOT NULL,slot TEXT NOT NULL,revision INTEGER NOT NULL,position INTEGER NOT NULL,game INTEGER NOT NULL,
    demo TEXT NOT NULL,viewer TEXT NOT NULL,seen INTEGER NOT NULL,player INTEGER,launched INTEGER);
    CREATE INDEX IF NOT EXISTS shelf_impression_totals ON shelf_impressions(tenant,slot,position,game,seen);
    CREATE TABLE IF NOT EXISTS shelf_rounds(receipt INTEGER PRIMARY KEY REFERENCES ledger(id),ref TEXT NOT NULL REFERENCES shelf_impressions(ref));`);
  function expose(t,input,viewer,categories,now=Date.now()){
    if(typeof input.ref!=='string'||!/^[a-f0-9-]{36}$/.test(input.ref)||!Number.isInteger(input.position)||input.position<1||input.position>100)fail(400,'invalid');
    const shelf=categories.find(c=>c.key===input.slot&&c.revision===input.revision),game=shelf?.items[input.position-1];
    if(!game||game.id!==input.game)fail(409,'opUnavailable');
    const demo=game.category==='slots'?'gold':game.category==='table'?'roulette':'blackjack';
    const old=q('SELECT * FROM shelf_impressions WHERE ref=?').get(input.ref);
    if(old&&(old.tenant!==t||old.viewer!==viewer||old.game!==game.id||old.slot!==input.slot||old.position!==input.position||old.revision!==input.revision))fail(409,'opStale');
    q('INSERT OR IGNORE INTO shelf_impressions(ref,tenant,slot,revision,position,game,demo,viewer,seen) VALUES(?,?,?,?,?,?,?,?,?)').run(input.ref,t,input.slot,input.revision,input.position,game.id,demo,viewer,now);
    return {ref:input.ref,demo};
  }
  function launch(t,input,viewer,p,categories,now=Date.now()){
    const prior=q('SELECT * FROM shelf_impressions WHERE tenant=? AND ref=? AND viewer=?').get(t,input.ref||'',viewer);
    if(!prior||prior.seen<now-1800000||prior.player&&prior.player!==p)fail(409,'opUnavailable');
    expose(t,{ref:prior.ref,slot:prior.slot,revision:prior.revision,position:prior.position,game:prior.game},viewer,categories,now);
    q('UPDATE shelf_impressions SET player=?,launched=coalesce(launched,?) WHERE ref=?').run(p,now,prior.ref);return {ref:prior.ref,demo:prior.demo};
  }
  function attribute(t,p,receipt,ref,game,now=Date.now()){
    if(!ref)return;
    const hit=q('SELECT ref FROM shelf_impressions WHERE tenant=? AND player=? AND ref=? AND demo=? AND launched>?').get(t,p,ref,game,now-1800000);
    if(hit)q('INSERT OR IGNORE INTO shelf_rounds VALUES(?,?)').run(receipt,ref);
  }
  function report(t,slot,game,now=Date.now()){
    const from=now-30*86400000;
    const filters=' WHERE i.tenant=? AND i.seen>=? AND (? IS NULL OR i.slot=?) AND (? IS NULL OR i.game=?)';
    const args=[t,from,slot,slot,game,game];
    const rows=q('SELECT i.slot,i.position,i.game,g.title_en title,count(*) impressions,count(DISTINCT CASE WHEN i.launched IS NOT NULL THEN i.ref END) launches FROM shelf_impressions i LEFT JOIN game_catalog g ON g.id=i.game'+filters+' GROUP BY i.slot,i.position,i.game ORDER BY i.slot,i.position,i.game').all(...args);
    const rounds=q(`SELECT i.slot,i.position,i.game,l.id receipt,l.wager stake,l.wager+l.amount wins,coalesce(c.entry,0) corrected FROM shelf_rounds sr JOIN shelf_impressions i ON i.ref=sr.ref JOIN ledger l ON l.id=sr.receipt LEFT JOIN bonus_corrections c ON c.entry=l.id AND c.tenant=i.tenant`+filters).all(...args);
    const entries=rows.map(r=>{const receipts=rounds.filter(x=>x.slot===r.slot&&x.position===r.position&&x.game===r.game),valid=receipts.filter(x=>!x.corrected);
      return {...r,conversion:r.impressions?100*r.launches/r.impressions:null,currency:'CAD-demo',ggr:valid.reduce((s,x)=>s+x.stake-x.wins,0),receipts};});
    const payments=q(`SELECT i.asset currency,sum(CASE WHEN i.direction='deposit' AND i.status='confirmed' THEN i.minor ELSE 0 END) deposits,sum(CASE WHEN i.direction='withdrawal' AND i.status='paid' THEN i.minor ELSE 0 END) withdrawals FROM cashier_intents i JOIN review_subjects s ON s.id=i.subject WHERE s.tenant=? AND i.updated>=? GROUP BY i.asset`).all(t,from);
    return {entries,payments,from,conversion:entries.length?undefined:null};
  }
  return {expose,launch,attribute,report};
}
