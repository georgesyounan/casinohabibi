import {createPublicKey,randomBytes,randomUUID,verify} from 'node:crypto';
const network='Habibi-Test',asset='TUSD-DEMO',ttl=300000;
const addressOk=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function createDemoNetwork(db,{fail,cashier,playerCashier}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS test_network_settings(tenant TEXT PRIMARY KEY,enabled INTEGER NOT NULL,confirmations INTEGER NOT NULL,fee INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS test_address_challenges(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL,address TEXT NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS test_addresses(tenant TEXT NOT NULL,player INTEGER NOT NULL,address TEXT NOT NULL UNIQUE,linked INTEGER NOT NULL,PRIMARY KEY(tenant,player));
    CREATE TABLE IF NOT EXISTS test_chain_transfers(tenant TEXT NOT NULL,tx TEXT NOT NULL,idx INTEGER NOT NULL,player INTEGER NOT NULL,address TEXT NOT NULL,amount INTEGER NOT NULL,confirmations INTEGER NOT NULL,threshold INTEGER NOT NULL,state TEXT NOT NULL,payment TEXT,PRIMARY KEY(tenant,tx,idx));
    CREATE TABLE IF NOT EXISTS test_chain_exceptions(tenant TEXT NOT NULL,tx TEXT NOT NULL,idx INTEGER NOT NULL,payment TEXT,reason TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(tenant,tx,idx));
    CREATE TABLE IF NOT EXISTS test_chain_payouts(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL,address TEXT NOT NULL,amount INTEGER NOT NULL,fee INTEGER NOT NULL,origin TEXT NOT NULL,custody TEXT NOT NULL,UNIQUE(tenant,player,origin));`);
  const rules=t=>({network,asset,precision:2,custody:'local-simulator',...(q('SELECT enabled,confirmations,fee FROM test_network_settings WHERE tenant=?').get(t)||{enabled:0,confirmations:3,fee:2})});
  function allowed(t,i){const cfg=rules(t);if(!cfg.enabled||i.network!==network||i.asset!==asset)fail(409,'opUnavailable');return cfg;}
  const subject=(t,p)=>{const row=q('SELECT id FROM review_subjects WHERE tenant=? AND player=?').get(t,p);if(!row)fail(409,'identity_required');return row.id;};
  const signedText=c=>['Casino Habibi','Address ownership',network,asset,c.tenant,String(c.player),c.address,c.id,String(c.expires)].join('\n');
  function challenge(t,p,i,now=Date.now()){
    allowed(t,i);if(!addressOk(i.address))fail(400,'invalid');
    const id=randomBytes(32).toString('hex'),expires=now+ttl;
    q('DELETE FROM test_address_challenges WHERE expires<=? OR (tenant=? AND player=? AND used=0)').run(now,t,p);
    q('INSERT INTO test_address_challenges VALUES(?,?,?,?,?,0)').run(id,t,p,i.address,expires);return {id,expires,message:signedText({tenant:t,player:p,address:i.address,id,expires})};
  }
  function link(t,p,i,now=Date.now()){
    allowed(t,i);const c=q('SELECT * FROM test_address_challenges WHERE tenant=? AND player=? AND id=? AND used=0 AND expires>?').get(t,p,i.id||'',now);
    if(!c||typeof i.signature!=='string'||!/^[a-f0-9]{128}$/.test(i.signature))fail(409,'opStale');
    const key=createPublicKey({key:Buffer.from('302a300506032b6570032100'+c.address,'hex'),format:'der',type:'spki'});
    if(!verify(null,Buffer.from(signedText(c)),key,Buffer.from(i.signature,'hex')))fail(403,'partnerAuth');
    const other=q('SELECT * FROM test_addresses WHERE address=? OR (tenant=? AND player=?)').all(c.address,t,p);
    if(other.some(x=>x.tenant!==t||x.player!==p||x.address!==c.address))fail(409,'opStale');
    q('INSERT OR IGNORE INTO test_addresses VALUES(?,?,?,?)').run(t,p,c.address,now);q('UPDATE test_address_challenges SET used=1 WHERE id=?').run(c.id);return {address:c.address};
  }
  function instruction(t,p,i){allowed(t,i);const who=q('SELECT address FROM test_addresses WHERE tenant=? AND player=?').get(t,p);if(!who)fail(409,'opUnavailable');subject(t,p);return {...rules(t),address:who.address};}
  function startPayout(t,p,i,now=Date.now()){
    const cfg=allowed(t,i),who=instruction(t,p,i);
    if(i.address!==who.address||!Number.isSafeInteger(i.amount)||i.amount<100||i.amount<=cfg.fee||typeof i.key!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(i.key))fail(400,'invalid');
    const old=q('SELECT * FROM test_chain_payouts WHERE tenant=? AND player=? AND origin=?').get(t,p,i.key);
    if(old){if(old.address!==i.address||old.amount!==i.amount)fail(409,'opStale');return {id:old.id};}
    const id=playerCashier.start(t,p,i.amount,'network-'+i.key,now);playerCashier.confirm(t,p,id,now);
    q('INSERT INTO test_chain_payouts VALUES(?,?,?,?,?,?,?,?)').run(id,t,p,who.address,i.amount,cfg.fee,i.key,'sim-'+id);return {id};
  }
  function view(t,p){
    return {rules:rules(t),address:q('SELECT address FROM test_addresses WHERE tenant=? AND player=?').get(t,p)?.address||null,
      deposits:q('SELECT tx,idx,amount,confirmations,threshold,state,payment FROM test_chain_transfers WHERE tenant=? AND player=? ORDER BY rowid DESC LIMIT 50').all(t,p),
      payouts:q('SELECT w.id,w.address,w.amount,w.fee,w.custody,i.status FROM test_chain_payouts w JOIN cashier_intents i ON i.id=w.id WHERE w.tenant=? AND w.player=? ORDER BY w.rowid DESC LIMIT 50').all(t,p)};
  }
  function admin(t){
    return {rules:rules(t),deposits:q('SELECT tx,idx,address,amount,confirmations,state,payment FROM test_chain_transfers WHERE tenant=? ORDER BY rowid DESC LIMIT 50').all(t),
      payouts:q('SELECT w.id,w.amount,w.fee,w.custody,i.status,i.version FROM test_chain_payouts w JOIN cashier_intents i ON i.id=w.id WHERE w.tenant=? ORDER BY w.rowid DESC LIMIT 50').all(t),
      exceptions:q('SELECT tx,idx,payment,reason,at FROM test_chain_exceptions WHERE tenant=? ORDER BY at DESC LIMIT 50').all(t)};
  }
  function operate(t,staff,req,i,now=Date.now()){
    if(i.action==='settings'){
      if(typeof i.enabled!=='boolean'||!Number.isInteger(i.confirmations)||i.confirmations<1||i.confirmations>20||!Number.isInteger(i.fee)||i.fee<0||i.fee>=100)fail(400,'invalid');
      q('INSERT INTO test_network_settings VALUES(?,?,?,?) ON CONFLICT(tenant) DO UPDATE SET enabled=excluded.enabled,confirmations=excluded.confirmations,fee=excluded.fee').run(t,+i.enabled,i.confirmations,i.fee);return {network};
    }
    // In-flight payments and corrections can still settle after new instructions have been disabled.
    if(i.network!==network||i.asset!==asset)fail(409,'opUnavailable');
    if(i.action==='observe'||i.action==='reorg'){
      if(!addressOk(i.tx)||!Number.isSafeInteger(i.index)||i.index<0||i.index>65535)fail(400,'invalid');
      const old=q('SELECT * FROM test_chain_transfers WHERE tenant=? AND tx=? AND idx=?').get(t,i.tx,i.index);
      if(i.action==='reorg'){
        if(!old||typeof i.reason!=='string'||!i.reason.trim()||i.reason.length>200)fail(400,'invalid');
        q('INSERT OR IGNORE INTO test_chain_exceptions VALUES(?,?,?,?,?,?)').run(t,i.tx,i.index,old.payment,i.reason.trim(),now);
        q("UPDATE test_chain_transfers SET state='exception' WHERE tenant=? AND tx=? AND idx=?").run(t,i.tx,i.index);return {payment:old.payment};
      }
      const cfg=old?rules(t):allowed(t,i),who=q('SELECT player FROM test_addresses WHERE tenant=? AND address=?').get(t,i.address||'');
      if(!who||!Number.isInteger(i.amount)||i.amount<100||i.amount>200000||!Number.isInteger(i.confirmations)||i.confirmations<0||i.confirmations>10000000)fail(400,'invalid');
      if(old&&(old.amount!==i.amount||old.address!==i.address))fail(409,'opStale');
      if(old&&(old.state==='confirmed'||old.state==='exception'||i.confirmations<old.confirmations))return {payment:old.payment};
      const minimum=old?.threshold||cfg.confirmations;
      let payment=null,state=i.confirmations?'confirming':'observed';
      if(i.confirmations>=minimum){
        const sub=subject(t,who.player),source=i.tx+'-'+i.index;
        payment=cashier.change(t,staff,req,{action:'initiate',subject:sub,key:'net-'+source,direction:'deposit',route:'wallet',asset:'TST',minor:i.amount}).id;
        const intent=cashier.intent(t,payment);
        cashier.change(t,staff,req,{id:payment,action:'event',outcome:'success',eventId:'net-'+source,processorRef:intent.processorRef,minor:i.amount,asset:'TST',route:'wallet'});state='confirmed';
      }
      q('INSERT INTO test_chain_transfers VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant,tx,idx) DO UPDATE SET confirmations=excluded.confirmations,state=excluded.state,payment=excluded.payment').run(t,i.tx,i.index,who.player,i.address,i.amount,i.confirmations,minimum,state,payment);
      return {payment,state};
    }
    const p=q('SELECT * FROM test_chain_payouts WHERE id=? AND tenant=?').get(i.id||'',t);if(!p)fail(404,'opMissing');
    const row=cashier.intent(t,p.id);
    if(['send','timeout'].includes(i.action))return cashier.change(t,staff,req,{id:p.id,action:i.action,version:i.version});
    if(i.action==='confirm')return cashier.change(t,staff,req,{id:p.id,action:'event',outcome:'success',eventId:'network-sent-'+p.id,processorRef:row.processorRef,minor:p.amount,route:'wallet',asset:'TST'});
    fail(400,'invalid');
  }
  return {rules,challenge,link,instruction,startPayout,operate,admin,view};
}
