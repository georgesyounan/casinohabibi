import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
const purposes=['crm','affiliate','account','wallet','telegram'];
const fields={id:'contact_id',locale:'language',email:'email_address'};
const modes=['accept','temporary','permanent','lost-reply'];
export function createSubscriptions(db,{fail,communications,key}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS outbound_subscribers(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,name TEXT NOT NULL,purpose TEXT NOT NULL,version INTEGER NOT NULL,mode TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS outbound_maps(sub TEXT NOT NULL,version INTEGER NOT NULL,mapping TEXT NOT NULL,PRIMARY KEY(sub,version));
    CREATE TABLE IF NOT EXISTS outbound_events(id TEXT PRIMARY KEY,sub TEXT NOT NULL,player INTEGER NOT NULL,source TEXT NOT NULL,version INTEGER NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next INTEGER NOT NULL DEFAULT 0,signature TEXT,UNIQUE(sub,source));
    CREATE INDEX IF NOT EXISTS outbound_work ON outbound_events(sub,state,next);
    CREATE TABLE IF NOT EXISTS outbound_effects(id TEXT PRIMARY KEY,sub TEXT NOT NULL,body TEXT NOT NULL,signature TEXT NOT NULL,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS channel_consent(tenant TEXT NOT NULL,player INTEGER NOT NULL,purpose TEXT NOT NULL,active INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(tenant,player,purpose));
    CREATE TABLE IF NOT EXISTS outbound_sources(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL,purpose TEXT NOT NULL,source TEXT NOT NULL,UNIQUE(tenant,purpose,source));
    CREATE TRIGGER IF NOT EXISTS outbound_wallet_source AFTER INSERT ON ledger BEGIN
      INSERT OR IGNORE INTO outbound_sources(tenant,player,purpose,source) VALUES(new.tenant_id,new.player,'wallet','receipt-'||new.id);
    END;
    CREATE TRIGGER IF NOT EXISTS outbound_affiliate_source AFTER INSERT ON affiliate_earnings BEGIN
      INSERT OR IGNORE INTO outbound_sources(tenant,player,purpose,source) SELECT tenant,new.player,'affiliate','commission-'||new.id FROM growth_partners WHERE id=new.partner;
    END;
    CREATE TRIGGER IF NOT EXISTS outbound_account_source AFTER INSERT ON players BEGIN
      INSERT OR IGNORE INTO outbound_sources(tenant,player,purpose,source) VALUES(new.tenant_id,new.id,'account','account-'||new.id);
    END;`);
  function consent(t,p,purpose,on,now=Date.now()){
    if(!purposes.includes(purpose)||typeof on!=='boolean')fail(400,'invalid');
    q('INSERT INTO channel_consent VALUES(?,?,?,?,?) ON CONFLICT(tenant,player,purpose) DO UPDATE SET active=excluded.active,at=excluded.at').run(t,p,purpose,+on,now);
  }
  function choices(t,p){const rows=q('SELECT purpose,active FROM channel_consent WHERE tenant=? AND player=?').all(t,p);return Object.fromEntries(purposes.map(x=>[x,Boolean(rows.find(r=>r.purpose===x)?.active)]));}
  function allowed(t,p,purpose,now){
    const row=q('SELECT p.access_status,s.excluded_at,s.cooling_off_until,s.pause_until FROM players p LEFT JOIN player_safety s ON s.player=p.id WHERE p.tenant_id=? AND p.id=? AND p.email_verified=1').get(t,p);
    if(!row||row.access_status!=='active'||row.excluded_at||row.pause_until>now||row.cooling_off_until>now)return false;
    if(!choices(t,p)[purpose])return false;
    if(purpose==='crm')return communications.choices(t,p).some(c=>c.topic==='rewards'&&c.channel==='email'&&c.granted&&c.pauseUntil<=now);
    if(purpose==='telegram')return Boolean(q('SELECT 1 FROM monthly_telegram_players WHERE tenant=? AND player=?').get(t,p));
    return true;
  }
  function load(t,id){const s=q('SELECT * FROM outbound_subscribers WHERE tenant=? AND id=?').get(t,id||'');if(!s)fail(404,'opMissing');return s;}
  function subscribe(t,i){
    if(!purposes.includes(i.purpose)||typeof i.name!=='string'||!i.name.trim()||i.name.length>75||!modes.includes(i.mode||'accept'))fail(400,'invalid');
    const mappings=i.fields||['id','locale'];if(!Array.isArray(mappings)||!mappings.length||new Set(mappings).size!==mappings.length||mappings.some(f=>!Object.hasOwn(fields,f)||(f==='email'&&i.purpose!=='crm')))fail(400,'invalid');
    const id=i.id||randomUUID(),prior=i.id?load(t,id):null;if(prior&&(i.version!==prior.version||i.purpose!==prior.purpose))fail(409,'opStale');
    const v=(prior?.version||0)+1;q('INSERT INTO outbound_subscribers(id,tenant,name,purpose,version,mode) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=excluded.version,mode=excluded.mode').run(id,t,i.name.trim(),i.purpose,v,i.mode||'accept');
    q('INSERT INTO outbound_maps VALUES(?,?,?)').run(id,v,JSON.stringify(mappings));return id;
  }
  const enqueue=(s,p,source)=>q("INSERT OR IGNORE INTO outbound_events(id,sub,player,source,version,state) VALUES(?,?,?,?,?,'pending')").run(randomUUID(),s.id,p,source,s.version).changes;
  function snapshot(t,id,ref){
    const s=load(t,id);if(!['crm','telegram'].includes(s.purpose)||typeof ref!=='string'||!/^[a-z0-9_-]{1,60}$/i.test(ref))fail(400,'invalid');
    for(const p of q('SELECT player FROM channel_consent WHERE tenant=? AND purpose=? AND active=1').all(t,s.purpose))if(allowed(t,p.player,s.purpose,Date.now()))enqueue(s,p.player,ref+'-'+p.player);
  }
  function receive(t,id,body,signature,now){
    const s=load(t,id),secret=createHmac('sha256',key).update('event-subscription:'+t+':'+s.id).digest();
    const expected=createHmac('sha256',secret).update(body).digest();
    if(typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(expected,Buffer.from(signature,'hex')))fail(403,'partnerAuth');
    const parsed=JSON.parse(body);if(parsed.schema!==1||parsed.purpose!==s.purpose||typeof parsed.id!=='string')fail(400,'invalid');
    q('INSERT OR IGNORE INTO outbound_effects VALUES(?,?,?,?,?)').run(parsed.id,id,body,signature,now);
  }
  function run(t,id,limit=25,now=Date.now()){
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail(400,'invalid');
    const s=load(t,id);
    for(const src of q('SELECT * FROM outbound_sources WHERE tenant=? AND purpose=? AND id>? ORDER BY id LIMIT ?').all(t,s.purpose,s.cursor,limit)){
      if(allowed(t,src.player,s.purpose,now))enqueue(s,src.player,src.source);
      q('UPDATE outbound_subscribers SET cursor=? WHERE id=?').run(src.id,id);
    }
    const signing=createHmac('sha256',key).update('event-subscription:'+t+':'+s.id).digest();
    for(const e of q("SELECT * FROM outbound_events WHERE sub=? AND state IN ('pending','retry') AND next<=? ORDER BY rowid LIMIT ?").all(id,now,limit)){
      const tries=e.attempts+1;
      if(!allowed(t,e.player,s.purpose,now)){q("UPDATE outbound_events SET state='suppressed' WHERE id=?").run(e.id);continue;}
      const p=q('SELECT id,email,preferred_locale AS locale FROM players WHERE tenant_id=? AND id=?').get(t,e.player);
      const mapping=JSON.parse(q('SELECT mapping FROM outbound_maps WHERE sub=? AND version=?').get(id,e.version).mapping);
      const contact=Object.fromEntries(mapping.map(f=>[fields[f],p[f]])),body=JSON.stringify({id:e.id,schema:1,mapping:e.version,purpose:s.purpose,reference:e.source,contact});
      const sign=message=>createHmac('sha256',signing).update(message).digest(),mac=sign(body);
      let state='delivered';
      if(s.mode==='permanent'||(s.mode==='temporary'&&e.attempts===0))state=tries>=3?'dead':'retry';
      else{receive(t,id,body,mac.toString('hex'),now);if(s.mode==='lost-reply'&&e.attempts===0)state='retry';}
      q('UPDATE outbound_events SET state=?,attempts=?,next=?,signature=? WHERE id=?').run(state,tries,now+1000*2**Math.min(tries,5),mac.toString('hex'),e.id);
    }
  }
  function replay(t,id,event){load(t,id);const e=q('SELECT state FROM outbound_events WHERE id=? AND sub=?').get(event,id);if(!e)fail(404,'opMissing');
    if(e.state==='dead')q("UPDATE outbound_events SET state='pending',attempts=0,next=0 WHERE id=?").run(event);}
  function list(t){return q('SELECT * FROM outbound_subscribers WHERE tenant=? ORDER BY rowid DESC').all(t).map(s=>({...s,events:q('SELECT id,source,version,state,attempts,next FROM outbound_events WHERE sub=? ORDER BY rowid DESC LIMIT 50').all(s.id),fields:JSON.parse(q('SELECT mapping FROM outbound_maps WHERE sub=? AND version=?').get(s.id,s.version).mapping)}));}
  return {choices,consent,subscribe,snapshot,run,replay,list,receive,source:(t,p,purpose,source)=>q('INSERT OR IGNORE INTO outbound_sources(tenant,player,purpose,source) VALUES(?,?,?,?)').run(t,p,purpose,source)};
}
