import {randomUUID} from 'node:crypto';
export function createPlayerCashier(db,{fail,review,cashier}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS player_cashier_drafts(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL,subject TEXT NOT NULL,origin TEXT NOT NULL,amount INTEGER NOT NULL,state TEXT NOT NULL,expires INTEGER NOT NULL,UNIQUE(tenant,player,origin));`);
  function subject(t,p){const s=q('SELECT id FROM review_subjects WHERE tenant=? AND player=?').get(t,p);return s?.id;}
  function gate(t,p){
    const id=subject(t,p);return id?review.eligibility(t,id):{allowed:false,reason:'identity_required'};
  }
  function describe(t,p,now=Date.now()){
    const g=gate(t,p),drafts=q(`SELECT d.id,d.amount,d.expires,coalesce(i.status,d.state) state FROM player_cashier_drafts d LEFT JOIN cashier_intents i ON i.id=d.id
      WHERE d.tenant=? AND d.player=? AND (d.state<>'draft' OR d.expires>?) ORDER BY d.rowid DESC LIMIT 30`).all(t,p,now);
    return {allowed:g.allowed,reason:g.reason,drafts};
  }
  function start(t,p,amount,origin,now=Date.now()){
    if(!Number.isSafeInteger(amount)||amount<100||amount>200000||typeof origin!=='string'||!/^[a-zA-Z0-9._-]{1,80}$/.test(origin))fail(400,'invalid');
    const g=gate(t,p);if(!g.allowed)fail(409,g.reason);
    const old=q('SELECT * FROM player_cashier_drafts WHERE tenant=? AND player=? AND origin=?').get(t,p,origin);
    if(old){if(old.amount!==amount||old.expires<=now)fail(409,'opStale');return old.id;}
    const id=randomUUID();q("INSERT INTO player_cashier_drafts VALUES(?,?,?,?,?,?,'draft',?)").run(id,t,p,subject(t,p),origin,amount,now+10*60000);return id;
  }
  function confirm(t,p,id,now=Date.now()){
    const d=q('SELECT * FROM player_cashier_drafts WHERE tenant=? AND player=? AND id=?').get(t,p,id||'');if(!d)fail(404,'opMissing');
    if(d.state==='submitted')return d.id;
    if(d.expires<=now)fail(409,'opStale');
    const g=gate(t,p);if(!g.allowed)fail(409,g.reason);
    // This audit identity has no tenant staff membership, credential or login session.
    const service='player-cashier@system.invalid';
    q("INSERT OR IGNORE INTO staff_accounts(email,password_hash,created_at) VALUES(?,'!',?)").run(service,now);
    const actor=q('SELECT id FROM staff_accounts WHERE email=? AND password_hash=?').get(service,'!');if(!actor)fail(409,'opUnavailable');
    cashier.change(t,actor,randomUUID(),{action:'initiate',subject:d.subject,key:'player-'+d.id,direction:'withdrawal',minor:d.amount,asset:'TST',route:'wallet'},d.id);
    q("UPDATE player_cashier_drafts SET state='submitted' WHERE id=?").run(d.id);return d.id;
  }
  return {gate,describe,start,confirm};
}
