const validInt=(x,min=1,max=1000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
export function createPrizeClub(db,{fail,accountBreaks}){
  const q=sql=>db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS prize_wallet(tenant TEXT NOT NULL,player INTEGER NOT NULL REFERENCES players(id),
    ref TEXT NOT NULL,unit TEXT NOT NULL,amount INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(tenant,player,ref,unit));
    CREATE TABLE IF NOT EXISTS prize_claims(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL REFERENCES players(id),
    request TEXT NOT NULL,amount INTEGER NOT NULL,state TEXT NOT NULL,submitted INTEGER NOT NULL,decision INTEGER,reason TEXT,
    UNIQUE(tenant,player,request));
    CREATE TABLE IF NOT EXISTS prize_rules(tenant TEXT PRIMARY KEY,threshold INTEGER NOT NULL,free_units INTEGER NOT NULL,zone TEXT NOT NULL,version INTEGER NOT NULL);`);
  const rule=t=>q('SELECT threshold,free_units AS freeUnits,zone,version FROM prize_rules WHERE tenant=?').get(t)||{threshold:10,freeUnits:2,zone:'UTC',version:0};
  function day(now,zone){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return [parts.year,parts.month,parts.day].join('-');}
  const has=(t,p,ref)=>q('SELECT 1 FROM prize_wallet WHERE tenant=? AND player=? AND ref=?').get(t,p,ref);
  const book=(t,p,ref,unit,amount,now)=>q('INSERT INTO prize_wallet VALUES(?,?,?,?,?,?)').run(t,p,ref,unit,amount,now);
  const units=(t,p,unit)=>q('SELECT coalesce(sum(amount),0) n FROM prize_wallet WHERE tenant=? AND player=? AND unit=?').get(t,p,unit).n;
  function view(t,p,now){
    const rules=rule(t),period=day(now,rules.zone);
    return {rules,period,member:p?Boolean(has(t,p,'welcome')):false,entered:p?Boolean(has(t,p,'free/'+period)):false,
      play:p?units(t,p,'play'):0,prize:p?units(t,p,'prize'):0,claims:p?q('SELECT id,amount,state,submitted,decision,reason FROM prize_claims WHERE tenant=? AND player=? ORDER BY id DESC LIMIT 25').all(t,p):[]};
  }
  const allowed=(t,p,now)=>q("SELECT 1 FROM players p LEFT JOIN player_safety s ON s.player=p.id WHERE p.tenant_id=? AND p.id=? AND p.email_verified=1 AND p.access_status='active' AND s.excluded_at IS NULL").get(t,p)&&!accountBreaks.at(t,p,now);
  function player(t,p,input,now){
    if(!allowed(t,p,now))fail(409,'discoveryPaused');
    const rules=rule(t),period=day(now,rules.zone);
    if(input.action==='prize-join'){
      if(!has(t,p,'welcome')){book(t,p,'welcome','play',100,now);book(t,p,'welcome','prize',5,now);}return;
    }
    if(!has(t,p,'welcome'))fail(409,'prizeJoin');
    if(input.action==='prize-free'){
      if(input.period!==period)fail(409,'clubOfferChanged');
      if(!has(t,p,'free/'+period))book(t,p,'free/'+period,'prize',rules.freeUnits,now);return;
    }
    if(input.action==='prize-request'){
      if(input.unit!=='prize')fail(409,'prizeUnit');
      if(!validInt(input.amount)||typeof input.key!=='string'||!/^[-\w]{8,80}$/.test(input.key))fail(400,'invalid');
      const prior=q('SELECT id,amount FROM prize_claims WHERE tenant=? AND player=? AND request=?').get(t,p,input.key);
      if(prior){if(prior.amount!==input.amount)fail(409,'requestConflict');return prior.id;}
      if(input.amount<rules.threshold||units(t,p,'prize')<input.amount)fail(409,'prizeThreshold');
      const id=Number(q("INSERT INTO prize_claims(tenant,player,request,amount,state,submitted) VALUES(?,?,?,?,'pending',?)").run(t,p,input.key,input.amount,now).lastInsertRowid);
      book(t,p,'claim/'+id,'prize',-input.amount,now);return id;
    }
    fail(400,'invalid');
  }
  function admin(t){return {rules:rule(t),claims:q('SELECT id,player,amount,state,submitted,decision,reason FROM prize_claims WHERE tenant=? ORDER BY id DESC LIMIT 60').all(t)};}
  function manage(t,verb,input,now){
    if(verb==='prize-rules'){
      const prev=rule(t);if(prev.version!==input.version)fail(409,'opStale');
      if(!validInt(input.threshold)||!validInt(input.freeUnits)||typeof input.zone!=='string'||input.zone.length>64)fail(400,'invalid');
      try{new Intl.DateTimeFormat('en',{timeZone:input.zone}).format(now);}catch{fail(400,'invalid');}
      q('INSERT INTO prize_rules VALUES(?,?,?,?,?) ON CONFLICT(tenant) DO UPDATE SET threshold=excluded.threshold,free_units=excluded.free_units,zone=excluded.zone,version=excluded.version')
        .run(t,input.threshold,input.freeUnits,input.zone,prev.version+1);return prev.version+1;
    }
    if(verb==='prize-decision'){
      const claim=q('SELECT * FROM prize_claims WHERE tenant=? AND id=?').get(t,input.id||0);
      if(!claim)fail(404,'opMissing');
      if(!['fulfilled','denied'].includes(input.state)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>200)fail(400,'invalid');
      if(claim.state===input.state)return claim.id;if(claim.state!=='pending')fail(409,'opStale');
      if(input.state==='fulfilled'&&(!input.checked||!allowed(t,claim.player,now)))fail(409,'discoveryPaused');
      q('UPDATE prize_claims SET state=?,reason=?,decision=? WHERE id=?').run(input.state,input.reason.trim(),now,claim.id);
      book(t,claim.player,'decision/'+claim.id,'prize',input.state==='denied'?claim.amount:0,now);return claim.id;
    }
    fail(400,'invalid');
  }
  return {view,player,admin,manage};
}
