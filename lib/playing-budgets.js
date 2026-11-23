import {weekStart} from './lobby-events.js';
export function createPlayingBudgets(db,{fail}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS playing_budgets(tenant TEXT NOT NULL,player INTEGER NOT NULL,period TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER,pending INTEGER,start_pending INTEGER,version INTEGER NOT NULL,PRIMARY KEY(tenant,player,period,kind));`);
  const periods=['week','month'],kinds=['deposit','stake','loss'];
  function start(period,now){const d=new Date(now);return period==='week'?weekStart(now):Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);}
  function effective(row,now){return row?.start_pending&&row.start_pending<=now?row.pending:row?.amount??null;}
  function spent(t,p,from){
    const play=q(`SELECT coalesce(sum(CASE WHEN wager>0 THEN wager ELSE 0 END),0) stake,coalesce(-sum(amount),0) loss FROM ledger
      WHERE tenant_id=? AND player=? AND created_at>=? AND ((game IN ('gold','aurora','blackjack','roulette') AND wager>0) OR game='sports')`).get(t,p,from);
    const deposit=q(`SELECT coalesce(sum(i.minor),0) n FROM cashier_intents i JOIN review_subjects s ON s.id=i.subject
      WHERE s.tenant=? AND s.player=? AND i.created>=? AND i.direction='deposit' AND i.status IN ('initiated','pending','confirmed','reversed')`).get(t,p,from).n;
    return {stake:play.stake,loss:Math.max(0,play.loss),deposit};
  }
  function view(t,p,now=Date.now()){
    const rows=q('SELECT * FROM playing_budgets WHERE tenant=? AND player=?').all(t,p);
    return periods.flatMap(period=>{const from=start(period,now),usage=spent(t,p,from);
      return kinds.map(kind=>{const r=rows.find(x=>x.period===period&&x.kind===kind);return {period,kind,from,used:usage[kind],amount:effective(r,now),pending:r?.start_pending>now?r.pending:null,effectiveAt:r?.start_pending>now?r.start_pending:null,version:r?.version||0};});});
  }
  function change(t,p,i,now=Date.now()){
    if(!periods.includes(i.period)||!kinds.includes(i.kind)||!(i.amount===null||Number.isSafeInteger(i.amount)&&i.amount>=0&&i.amount<=10000000))fail(400,'invalid');
    const old=q('SELECT * FROM playing_budgets WHERE tenant=? AND player=? AND kind=? AND period=?').get(t,p,i.kind,i.period);
    if(i.version!==(old?.version||0))fail(409,'opStale');
    const cur=effective(old,now),delay=cur!==null&&(i.amount===null||i.amount>cur),v=(old?.version||0)+1;
    q('INSERT INTO playing_budgets VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(tenant,player,period,kind) DO UPDATE SET amount=excluded.amount,pending=excluded.pending,start_pending=excluded.start_pending,version=excluded.version').run(t,p,i.period,i.kind,delay?cur:i.amount,delay?i.amount:null,delay?now+86400000:null,v);
  }
  function check(t,p,type,amount,now=Date.now()){
    if(!p)return;
    const rows=q('SELECT * FROM playing_budgets WHERE tenant=? AND player=?').all(t,p);
    for(const period of periods){
      const applicable=rows.filter(r=>r.period===period&&(r.kind===type||type==='stake'&&r.kind==='loss')&&effective(r,now)!==null);
      if(!applicable.length)continue;
      const used=spent(t,p,start(period,now));for(const r of applicable)if(used[r.kind]+amount>effective(r,now))fail(409,'periodBudget');
    }
  }
  return {view,change,check};
}
