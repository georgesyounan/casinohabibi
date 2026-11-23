import {randomUUID} from 'node:crypto';
export function createAffiliateStatements(db,{fail,notices}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS affiliate_terms(partner INTEGER NOT NULL,version INTEGER NOT NULL,rate INTEGER NOT NULL,grant_bonus INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(partner,version));
    CREATE TABLE IF NOT EXISTS affiliate_statements(id TEXT PRIMARY KEY,partner INTEGER NOT NULL,at INTEGER NOT NULL,amount INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS affiliate_earnings(id INTEGER PRIMARY KEY,partner INTEGER NOT NULL,player INTEGER NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,rule INTEGER NOT NULL,at INTEGER NOT NULL,statement TEXT,original INTEGER,reason TEXT,UNIQUE(partner,player,kind));
    CREATE TABLE IF NOT EXISTS affiliate_promotions(partner INTEGER NOT NULL,player INTEGER NOT NULL,rule INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(partner,player));`);
  function partner(t,id){const row=q('SELECT * FROM growth_partners WHERE tenant=? AND id=?').get(t,id||0);if(!row)fail(404,'opMissing');return row;}
  const terms=id=>q('SELECT version,rate,grant_bonus AS permission,at FROM affiliate_terms WHERE partner=? ORDER BY version DESC LIMIT 1').get(id)||{version:0,rate:0,permission:0,at:0};
  function refresh(t,id,now){
    const leads=q(`SELECT s.player,max(f.at,p.first_verified_at,coalesce(s.decided_at,0)) AS qualified FROM growth_signups s
      JOIN players p ON p.id=s.player AND p.tenant_id=s.tenant JOIN growth_first_saves f ON f.player=p.id AND f.tenant=s.tenant
      WHERE s.tenant=? AND s.partner=? AND s.review='valid' AND p.first_verified_at IS NOT NULL`).all(t,id);
    for(const lead of leads){const rule=q('SELECT * FROM affiliate_terms WHERE partner=? AND at<=? ORDER BY version DESC LIMIT 1').get(id,lead.qualified);
      if(rule&&lead.qualified<=now)q("INSERT OR IGNORE INTO affiliate_earnings(partner,player,kind,amount,rule,at) VALUES(?,?,'qualification',?,?,?)").run(id,lead.player,rule.rate,rule.version,lead.qualified);}
  }
  function state(t,id){const p=partner(t,id);return {partner:p.id,name:p.name,terms:terms(id),statements:q('SELECT id,at,amount FROM affiliate_statements WHERE partner=? ORDER BY at DESC,rowid DESC LIMIT 100').all(id),
    entries:q('SELECT e.id,e.player,e.kind,e.amount,e.rule,e.statement,e.original,o.statement AS originalStatement,e.reason FROM affiliate_earnings e LEFT JOIN affiliate_earnings o ON o.id=e.original WHERE e.partner=? ORDER BY e.id DESC LIMIT 150').all(id)};}
  function staff(t,i,now=Date.now()){
    const p=partner(t,i.partner),r=terms(p.id);
    if(i.action==='terms'){if(r.version!==i.version)fail(409,'opStale');
      if(!Number.isSafeInteger(i.rate)||i.rate<0||i.rate>100000||typeof i.grant!=='boolean')fail(400,'invalid');
      q('INSERT INTO affiliate_terms VALUES(?,?,?,?,?)').run(p.id,r.version+1,i.rate,+i.grant,now);}
    else if(i.action==='close'){
      refresh(t,p.id,now);const sum=q('SELECT count(*) n,coalesce(sum(amount),0) total FROM affiliate_earnings WHERE partner=? AND statement IS NULL').get(p.id);
      if(sum.n){const id=randomUUID();q('INSERT INTO affiliate_statements VALUES(?,?,?,?)').run(id,p.id,now,sum.total);q('UPDATE affiliate_earnings SET statement=? WHERE partner=? AND statement IS NULL').run(id,p.id);}
    }else if(i.action==='reverse'){
      if(typeof i.reason!=='string'||!i.reason.trim()||i.reason.length>200)fail(400,'invalid');
      const o=q("SELECT * FROM affiliate_earnings WHERE partner=? AND id=? AND kind='qualification'").get(p.id,i.entry||0);if(!o)fail(404,'opMissing');
      q("INSERT OR IGNORE INTO affiliate_earnings(partner,player,kind,amount,rule,at,original,reason) VALUES(?,?,'reversal',?,?,?,?,?)").run(p.id,o.player,-o.amount,o.rule,now,o.id,i.reason.trim());
    }else fail(400,'invalid');return state(t,p.id);
  }
  function issue(t,owner,recipient,now=Date.now()){
    const p=q('SELECT id FROM growth_partners WHERE tenant=? AND owner=? AND active=1').get(t,owner);if(!p||!terms(p.id).permission)fail(403,'staffForbidden');
    const target=q("SELECT p.id,p.access_status,s.excluded_at,s.pause_until,s.cooling_off_until FROM growth_signups g JOIN players p ON p.id=g.player LEFT JOIN player_safety s ON s.player=p.id WHERE g.tenant=? AND g.partner=? AND g.player=? AND g.review='valid' AND p.email_verified=1").get(t,p.id,recipient||0);
    if(!target||target.id===owner)fail(404,'opMissing');if(target.access_status!=='active'||target.excluded_at||target.pause_until>now||target.cooling_off_until>now)fail(403,'discoveryPaused');notices.block(t,target.id,now);
    if(q('INSERT OR IGNORE INTO affiliate_promotions VALUES(?,?,?,?)').run(p.id,target.id,terms(p.id).version,now).changes)
      q("INSERT INTO ledger(tenant_id,player,game,wager,amount,request_id,created_at,outcome) VALUES(?,?,NULL,0,1000,?,?,'{}')").run(t,target.id,'affiliate:offer:'+p.id,now);
    return {granted:true};
  }
  function playerState(t,id){
    const data=state(t,id);return {...data,entries:data.entries.map(({player,reason,...entry})=>entry),
      grants:data.terms.permission?data.entries.filter(x=>x.kind==='qualification'&&!data.entries.some(v=>v.original===x.id)).map(x=>({entry:x.id})):[]};
  }
  function issueByRef(t,owner,ref,now){
    const r=q("SELECT e.player FROM affiliate_earnings e JOIN growth_partners p ON p.id=e.partner WHERE p.tenant=? AND p.owner=? AND p.active=1 AND e.kind='qualification' AND e.id=? AND NOT EXISTS(SELECT 1 FROM affiliate_earnings c WHERE c.original=e.id)").get(t,owner,ref||0);
    if(!r)fail(403,'staffForbidden');return issue(t,owner,r.player,now);
  }
  return {staff,state,playerState,issueByRef};
}
