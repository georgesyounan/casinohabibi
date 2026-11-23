import {randomUUID} from 'node:crypto';
const integer=(n,min=1,max=100000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const validRef=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(v);
export function createFinanceOperations(db,{fail,audit,cashier}){
  const q=sql=>db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS ops_cases(run TEXT PRIMARY KEY REFERENCES pilot_runs(id),label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ops_receipts(run TEXT NOT NULL REFERENCES ops_cases(run),ref TEXT NOT NULL,kind TEXT NOT NULL,parent TEXT NOT NULL,
    amount INTEGER NOT NULL,from_acc TEXT NOT NULL,to_acc TEXT NOT NULL,signature TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(run,ref));
    CREATE INDEX IF NOT EXISTS ops_original ON ops_receipts(run,parent,kind);
    CREATE TABLE IF NOT EXISTS ops_sessions(run TEXT NOT NULL,id TEXT NOT NULL,game TEXT NOT NULL,stake TEXT,win TEXT,PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS ops_games(run TEXT NOT NULL,game TEXT NOT NULL,active INTEGER NOT NULL,PRIMARY KEY(run,game));
    CREATE TABLE IF NOT EXISTS ops_alerts(run TEXT NOT NULL,id TEXT NOT NULL,reason TEXT NOT NULL,opened INTEGER NOT NULL,receipt TEXT,resolved INTEGER,PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS ops_alert_owners(run TEXT NOT NULL,id TEXT NOT NULL,assignee INTEGER NOT NULL REFERENCES staff_accounts(id),PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS ops_adjustments(run TEXT NOT NULL,ref TEXT NOT NULL,original TEXT NOT NULL,version INTEGER NOT NULL,PRIMARY KEY(run,ref));
    CREATE TABLE IF NOT EXISTS ops_rates(run TEXT NOT NULL,id TEXT NOT NULL,numerator INTEGER NOT NULL,denominator INTEGER NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS ops_reports(run TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,reference TEXT NOT NULL,reported INTEGER NOT NULL,expected INTEGER,source TEXT NOT NULL,
    state TEXT NOT NULL,reason TEXT NOT NULL,PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS ops_versions(run TEXT NOT NULL,version INTEGER NOT NULL,snapshot TEXT NOT NULL,opened INTEGER NOT NULL,reason TEXT NOT NULL,PRIMARY KEY(run,version));
    CREATE TABLE IF NOT EXISTS ops_reopen(run TEXT PRIMARY KEY,reason TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ops_jackpot(run TEXT NOT NULL,source TEXT NOT NULL,amount INTEGER NOT NULL,observed INTEGER NOT NULL,PRIMARY KEY(run,source));`);
  function owned(tenant,id){
    if(!validRef(id)||!q('SELECT 1 FROM ops_cases c JOIN pilot_runs r ON r.id=c.run WHERE c.run=? AND r.tenant_id=?').get(id,tenant))fail(404,'opMissing');
  }
  const entries=run=>q('SELECT ref,kind,parent,amount,from_acc AS source,to_acc AS destination,created FROM ops_receipts WHERE run=? ORDER BY created,rowid').all(run);
  function totals(run){
    const rows=entries(run),reversed=new Set(rows.filter(x=>x.kind==='reverse').map(x=>x.parent));
    const stakes=rows.filter(x=>['stake','fx'].includes(x.kind)&&!reversed.has(x.ref)),wins=rows.filter(x=>x.kind==='win'&&!reversed.has(x.ref));
    const sum=xs=>xs.reduce((v,x)=>v+x.amount,0),staked=sum(stakes),paid=sum(wins);
    return {stakes:staked,wins:paid,ggr:staked-paid,rtp:staked?Math.round(10000*paid/staked)/100:null,sources:[...stakes,...wins].map(x=>x.ref)};
  }
  const acc=(run,account)=>q('SELECT coalesce(sum(minor),0) AS n FROM pilot_postings WHERE run=? AND account=?').get(run,account).n;
  const receipt=(run,ref)=>q('SELECT * FROM ops_receipts WHERE run=? AND ref=?').get(run,ref);
  function post(run,ref,kind,parent,value,from,to,signature,now){
    if(from==='available'&&acc(run,from)<value)fail(409,'balance');
    q('INSERT INTO pilot_events VALUES(?,?,?,?,?)').run(run,ref,'ops_'+kind,signature,JSON.stringify({reference:ref,amount:value,parent}));
    if(value){q('INSERT INTO pilot_postings VALUES(?,?,?,?)').run(run,ref,from,-value);q('INSERT INTO pilot_postings VALUES(?,?,?,?)').run(run,ref,to,value);}
    q('INSERT INTO ops_receipts VALUES(?,?,?,?,?,?,?,?,?)').run(run,ref,kind,parent,value,from,to,signature,now);
  }
  const list=tenant=>q('SELECT c.run AS id,c.label,r.created FROM ops_cases c JOIN pilot_runs r ON r.id=c.run WHERE r.tenant_id=? ORDER BY r.created DESC LIMIT 100').all(tenant);
  function detail(tenant,run,now=Date.now()){
    owned(tenant,run);const sums=totals(run);
    return {id:run,currency:'TST',available:acc(run,'available'),held:acc(run,'held'),...sums,receipts:entries(run),
      rounds:q('SELECT id,game,stake,win FROM ops_sessions WHERE run=? ORDER BY rowid DESC').all(run),
      alerts:q('SELECT a.id,a.reason,a.opened,a.receipt,a.resolved,o.assignee FROM ops_alerts a LEFT JOIN ops_alert_owners o ON o.run=a.run AND o.id=a.id WHERE a.run=? ORDER BY a.opened DESC').all(run),
      adjustments:q('SELECT ref,original,version FROM ops_adjustments WHERE run=? ORDER BY rowid DESC').all(run),
      exceptions:q('SELECT id,kind,reference,reported,expected,source,state,reason FROM ops_reports WHERE run=? ORDER BY rowid DESC').all(run).map(x=>({...x,source:JSON.parse(x.source),variance:x.expected===null?null:x.reported-x.expected})),
      snapshots:q('SELECT version,snapshot,opened,reason FROM ops_versions WHERE run=? ORDER BY version DESC').all(run).map(x=>({...x,snapshot:JSON.parse(x.snapshot)})),
      jackpots:q('SELECT source,amount,observed FROM ops_jackpot WHERE run=? ORDER BY source').all(run).map(r=>({...r,stale:now-r.observed>60000}))};
  }
  function operate(tenant,actor,request,input,now=Date.now()){
    const kind=input.action;
    if(kind==='create'){
      if(typeof input.label!=='string'||!input.label.trim()||input.label.length>80)fail(400,'invalid');
      const run=cashier.open(tenant,actor.id);q('INSERT INTO ops_cases VALUES(?,?)').run(run,input.label.trim());
      audit(tenant,actor.id,'finance_case_open',run,request,{fields:['case']});return {id:run};
    }
    const run=input.id;owned(tenant,run);
    const ref=input.ref,parent=input.parent||'',amount=input.amount??0,game=input.game||'demo-wheel',reason=input.reason||'';
    if(!validRef(ref)||(parent&&!validRef(parent))||!validRef(game)||!integer(amount,0)||typeof reason!=='string'||reason.length>200)fail(400,'invalid');
    const sig=JSON.stringify([kind,parent,amount,game,reason,input.numerator??null,input.denominator??null,input.expires??null,input.observed??null]);
    const old=receipt(run,ref);
    if(old){if(old.signature!==sig)fail(409,'requestConflict');return {id:run,receipt:old.ref};}
    const original=parent?receipt(run,parent):null;
    const rec=()=>{if(!original)fail(404,'opMissing');return original;};
    let value=amount,from='clearing',to='available',nonFinancial=false;
    const cause=(message='opUnavailable')=>fail(409,message);
    const round=parent?q('SELECT * FROM ops_sessions WHERE run=? AND id=?').get(run,parent):null;
    if(['fund','hold','capture','release','stake','win','transfer','payout'].includes(kind)&&!integer(value,kind==='win'?0:1))fail(400,'invalid');
    if(kind==='fund'){}
    else if(kind==='hold'){from='available';to='held';}
    else if(['capture','release'].includes(kind)){
      if(rec().kind!=='hold')cause();const used=q("SELECT coalesce(sum(amount),0) n FROM ops_receipts WHERE run=? AND parent=? AND kind IN ('capture','release')").get(run,parent).n;
      if(amount>original.amount-used)cause();from='held';to=kind==='capture'?'game':'available';
    }else if(kind==='reverse'){
      const o=rec();if(!['capture','stake','fx','win','payout','transfer'].includes(o.kind))cause();
      const prior=q("SELECT ref FROM ops_receipts WHERE run=? AND parent=? AND kind='reverse'").get(run,parent);
      if(prior)return {id:run,receipt:prior.ref};
      from=o.to_acc;to=o.kind==='capture'?'available':o.from_acc;value=o.amount;
      const closed=q("SELECT version FROM ops_versions v WHERE run=? AND EXISTS(SELECT 1 FROM json_each(v.snapshot,'$.receipts') WHERE value=?) ORDER BY version DESC LIMIT 1").get(run,parent);
      if(closed)q('INSERT INTO ops_adjustments VALUES(?,?,?,?)').run(run,ref,parent,closed.version);
    }else if(kind==='quote'){
      if(!integer(input.numerator,1,10000)||!integer(input.denominator,1,10000)||!integer(input.expires,now+1,now+86400000))fail(400,'invalid');
      q('INSERT INTO ops_rates VALUES(?,?,?,?,?)').run(run,ref,input.numerator,input.denominator,input.expires);nonFinancial=true;
    }else if(kind==='fx'){
      const rate=q('SELECT * FROM ops_rates WHERE run=? AND id=?').get(run,parent);
      if(!rate||now>=rate.expires)cause('sportExpired');if(!integer(amount))fail(400,'invalid');
      value=Math.round(amount*rate.numerator/rate.denominator);if(!integer(value))fail(400,'invalid');from='available';to='game';
    }else if(kind==='suspend'||kind==='enable'){
      q('INSERT INTO ops_games VALUES(?,?,?) ON CONFLICT(run,game) DO UPDATE SET active=excluded.active').run(run,game,Number(kind==='enable'));nonFinancial=true;
    }else if(kind==='launch'){
      if(q('SELECT active FROM ops_games WHERE run=? AND game=?').get(run,game)?.active===0)cause();
      q('INSERT INTO ops_sessions(run,id,game) VALUES(?,?,?)').run(run,ref,game);nonFinancial=true;
    }else if(kind==='stake'||kind==='win'){
      if(!round)fail(404,'opMissing');
      if(kind==='stake'){if(round.stake||q('SELECT active FROM ops_games WHERE run=? AND game=?').get(run,round.game)?.active===0)cause();
        from='available';to='game';q('UPDATE ops_sessions SET stake=? WHERE run=? AND id=?').run(ref,run,parent);
      }else{if(!round.stake||round.win)cause();from='game';to='available';q('UPDATE ops_sessions SET win=? WHERE run=? AND id=?').run(ref,run,parent);
        q('UPDATE ops_alerts SET receipt=?,resolved=? WHERE run=? AND id=? AND resolved IS NULL').run(ref,now,run,parent);}
    }else if(kind==='investigate'){
      if(!round||!round.stake||round.win||!reason.trim())cause();
      q('INSERT OR IGNORE INTO ops_alerts VALUES(?,?,?,?,NULL,NULL)').run(run,parent,reason,now);
      q('INSERT INTO ops_alert_owners VALUES(?,?,?) ON CONFLICT(run,id) DO UPDATE SET assignee=excluded.assignee').run(run,parent,actor.id);nonFinancial=true;
    }else if(kind==='transfer'||kind==='payout'){from='available';to=kind==='payout'?'clearing':'transfer';}
    else if(kind==='jackpot'){
      if(!integer(input.observed,0,now))fail(400,'invalid');
      q(`INSERT INTO ops_jackpot VALUES(?,?,?,?) ON CONFLICT(run,source) DO UPDATE SET amount=excluded.amount,observed=excluded.observed WHERE excluded.observed>=ops_jackpot.observed`).run(run,game,amount,input.observed);nonFinancial=true;
    }else if(kind==='report-ggr'||kind==='report-payout'){
      const g=totals(run);const expected=kind==='report-ggr'?g.ggr:original?.kind==='payout'?original.amount:null;
      const refs=kind==='report-ggr'?g.sources:original?[original.ref]:[];
      q('INSERT INTO ops_reports VALUES(?,?,?,?,?,?,?,?,?)').run(run,ref,kind,parent,value,expected,JSON.stringify(refs),expected===null?'timing':expected===value?'matched':'mismatch','');
      nonFinancial=true;
    }else if(kind==='resolve-exception'){
      if(!reason.trim()||!q("UPDATE ops_reports SET state='accepted',reason=? WHERE run=? AND id=? AND state IN ('timing','mismatch')").run(reason,run,parent).changes)cause();nonFinancial=true;
    }else if(kind==='reopen'){
      if(!reason.trim()||!q('SELECT 1 FROM ops_versions WHERE run=?').get(run))cause();
      q('INSERT INTO ops_reopen VALUES(?,?) ON CONFLICT(run) DO UPDATE SET reason=excluded.reason').run(run,reason);nonFinancial=true;
    }else if(kind==='close'){
      const latest=q('SELECT version FROM ops_versions WHERE run=? ORDER BY version DESC LIMIT 1').get(run),reopen=q('SELECT reason FROM ops_reopen WHERE run=?').get(run);
      if(!latest||reopen){
        const snapshot={...totals(run),available:acc(run,'available'),held:acc(run,'held'),receipts:entries(run).map(r=>r.ref)};
        q('INSERT INTO ops_versions VALUES(?,?,?,?,?)').run(run,(latest?.version||0)+1,JSON.stringify(snapshot),now,reopen?.reason||'');
        q('DELETE FROM ops_reopen WHERE run=?').run(run);
      }
      nonFinancial=true;
    }else fail(400,'invalid');
    if(nonFinancial){value=0;from='clearing';to='clearing';}
    post(run,ref,kind,parent,value,from,to,sig,now);
    if(kind==='payout')q(`UPDATE ops_reports SET expected=?,source=?, state=CASE WHEN reported=? THEN 'matched' ELSE 'mismatch' END
       WHERE run=? AND kind='report-payout' AND reference=? AND state='timing'`).run(value,JSON.stringify([ref]),value,run,ref);
    audit(tenant,actor.id,'finance_'+kind,run,request,{fields:[kind]});return {id:run,receipt:ref};
  }
  return {list,detail,operate};
}
