import { randomUUID } from 'node:crypto';
import { matches, byId } from '../public/sports-data.js';

const isInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const keyValid=v=>typeof v==='string' && /^[A-Za-z0-9_-]{8,80}$/.test(v);
export function createSportsBook(db,{fail,balance,dailyWagered,accountBreaks,playerNotices}){
  const q=sql=>db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS sport_markets(tenant TEXT NOT NULL,fixture TEXT NOT NULL,prices TEXT NOT NULL,version INTEGER NOT NULL,
    status TEXT NOT NULL,winning INTEGER,PRIMARY KEY(tenant,fixture));
    CREATE TABLE IF NOT EXISTS sport_limits(tenant TEXT PRIMARY KEY,max_stake INTEGER NOT NULL,liability INTEGER NOT NULL,version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sport_slips(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL REFERENCES players(id),
    request TEXT NOT NULL,legs TEXT NOT NULL,stake INTEGER NOT NULL,remaining INTEGER NOT NULL,maximum INTEGER NOT NULL,exposure INTEGER NOT NULL,
    state TEXT NOT NULL,at INTEGER NOT NULL,receipt INTEGER REFERENCES ledger(id),UNIQUE(tenant,player,request));
    CREATE INDEX IF NOT EXISTS sport_open ON sport_slips(tenant,state);
    CREATE TABLE IF NOT EXISTS sport_buyouts(id TEXT PRIMARY KEY,slip INTEGER NOT NULL REFERENCES sport_slips(id),
    remaining INTEGER NOT NULL,part INTEGER NOT NULL,value INTEGER NOT NULL,expires INTEGER NOT NULL,versions TEXT NOT NULL,receipt INTEGER REFERENCES ledger(id));
    CREATE INDEX IF NOT EXISTS sport_quotes ON sport_buyouts(slip,expires);`);
  const limits=t=>q('SELECT max_stake AS maxStake,liability,version FROM sport_limits WHERE tenant=?').get(t)||{maxStake:1000,liability:100000,version:0};
  function market(t,id){
    const fixture=byId.get(id);if(!fixture)fail(400,'invalid');
    const m=q('SELECT prices,version,status,winning FROM sport_markets WHERE tenant=? AND fixture=?').get(t,id);
    return {id,prices:m?JSON.parse(m.prices):fixture.odds.map(n=>Math.round(n*100)),version:m?.version??0,status:m?.status||'open',winning:m?.winning??null};
  }
  function wallet(t,p,now){
    playerNotices.block(t,p,now);
    const safety=q('SELECT excluded_at,daily_limit_cents FROM player_safety WHERE player=?').get(p);
    if(safety?.excluded_at || accountBreaks.at(t,p,now))fail(403,'discoveryPaused');
    return {available:balance(p,t),budget:(safety?.daily_limit_cents??2500)-dailyWagered(p,t,new Date(now).toISOString().slice(0,10))};
  }
  function post(t,p,wager,amount,key,now,kind,id){
    return Number(q(`INSERT INTO ledger(tenant_id,player,game,wager,amount,request_id,created_at,outcome)
      VALUES(?,?,'sports',?,?,?,?,?)`).run(t,p,wager,amount,key,now,JSON.stringify({kind:'sport-'+kind,slip:id})).lastInsertRowid);
  }
  function view(t,p){
    const history=p?q('SELECT id,legs,stake,remaining,maximum,state,at,receipt FROM sport_slips WHERE tenant=? AND player=? ORDER BY id DESC LIMIT 40').all(t,p):[];
    return {owner:p||null,markets:matches.map(m=>market(t,m.id)),limits:limits(t),history:history.map(x=>({...x,legs:JSON.parse(x.legs)}))};
  }
  function accept(t,p,input,now){
    if(!keyValid(input.key)||!isInt(input.stake,1,1000000)||!Array.isArray(input.legs)||!input.legs.length||input.legs.length>6)fail(400,'invalid');
    const seen=new Set(),legs=input.legs.map(leg=>{
      if(!leg||!byId.has(leg.id)||!isInt(leg.pick,0,byId.get(leg.id).odds.length-1)||seen.has(leg.id)||!isInt(leg.price,101,10000)||!isInt(leg.version,0,1e9))fail(400,'invalid');
      seen.add(leg.id);return {id:leg.id,pick:leg.pick,price:leg.price,version:leg.version};
    });
    const encoded=JSON.stringify(legs),prior=q('SELECT * FROM sport_slips WHERE tenant=? AND player=? AND request=?').get(t,p,input.key);
    if(prior){if(prior.stake!==input.stake||prior.legs!==encoded)fail(409,'requestConflict');return prior.id;}
    let multiplier=1;
    for(const leg of legs){const live=market(t,leg.id);if(live.status!=='open')fail(409,'sportSuspended');
      if(live.version!==leg.version||live.prices[leg.pick]!==leg.price)fail(409,'sportPriceChanged');
      multiplier*=leg.price/100;}
    const risk=limits(t),permitted=wallet(t,p,now),maximum=Math.round(input.stake*multiplier);
    const exposure=maximum-input.stake;
    const reserved=q("SELECT coalesce(sum(exposure),0) n FROM sport_slips WHERE tenant=? AND state='open'").get(t).n;
    if(input.stake>risk.maxStake||!Number.isSafeInteger(maximum)||exposure>risk.liability-reserved)fail(409,'sportRisk');
    if(input.stake>permitted.budget)fail(409,'dailyLimit');
    if(input.stake>permitted.available)fail(409,'balance');
    const id=Number(q(`INSERT INTO sport_slips(tenant,player,request,legs,stake,remaining,maximum,exposure,state,at)
      VALUES(?,?,?,?,?,?,?,?,'open',?)`).run(t,p,input.key,encoded,input.stake,input.stake,maximum,exposure,now).lastInsertRowid);
    post(t,p,input.stake,-input.stake,'sport:stake:'+id,now,'stake',id);return id;
  }
  function quote(t,p,input,now){
    const s=q("SELECT * FROM sport_slips WHERE id=? AND tenant=? AND player=? AND state='open'").get(input.id||0,t,p);
    if(!s||!isInt(input.part,1,s.remaining))fail(409,'sportUnavailable');
    const legs=JSON.parse(s.legs),versions=[];let ratio=1;
    for(const l of legs){const m=market(t,l.id);if(m.status!=='open')fail(409,'sportUnavailable');
      versions.push(m.version);ratio*=l.price/m.prices[l.pick];}
    const value=Math.min(Math.round(s.maximum*input.part/s.stake),Math.floor(input.part*ratio*0.9));
    if(value<1)fail(409,'sportUnavailable');
    const expires=now+20000,id=randomUUID();
    q('DELETE FROM sport_buyouts WHERE receipt IS NULL AND expires<?').run(now-86400000);
    q('INSERT INTO sport_buyouts(id,slip,remaining,part,value,expires,versions) VALUES(?,?,?,?,?,?,?)').run(id,s.id,s.remaining,input.part,value,expires,JSON.stringify(versions));
    return {id,slip:s.id,part:input.part,value,expires};
  }
  function cash(t,p,input,now){
    const offer=q('SELECT b.*,s.tenant,s.player,s.state,s.remaining AS current,s.stake,s.maximum,s.legs FROM sport_buyouts b JOIN sport_slips s ON s.id=b.slip WHERE b.id=? AND s.tenant=? AND s.player=?').get(input.quote||'',t,p);
    if(!offer)fail(404,'sportUnavailable');
    if(offer.receipt)return offer.receipt;
    if(now>=offer.expires)fail(409,'sportExpired');
    if(offer.state!=='open'||offer.remaining!==offer.current)fail(409,'sportUnavailable');
    const versions=JSON.parse(offer.versions);
    if(JSON.parse(offer.legs).some((l,i)=>{const m=market(t,l.id);return m.status!=='open'||m.version!==versions[i];}))fail(409,'sportPriceChanged');
    const remaining=offer.current-offer.part, receipt=post(t,p,0,offer.value,'sport:cash:'+offer.id,now,'cashout',offer.slip);
    q('UPDATE sport_slips SET remaining=?,exposure=?,state=?,receipt=coalesce(?,receipt) WHERE id=?')
      .run(remaining,Math.max(0,Math.round((offer.maximum-offer.stake)*remaining/offer.stake)),remaining?'open':'cashed',remaining?null:receipt,offer.slip);
    q('UPDATE sport_buyouts SET receipt=? WHERE id=?').run(receipt,offer.id);return receipt;
  }
  function settle(t,now){
    for(const slip of q("SELECT * FROM sport_slips WHERE tenant=? AND state='open'").all(t)){
      const legs=JSON.parse(slip.legs);let lost=false,open=false,multiplier=1,allVoid=true;
      for(const l of legs){const m=market(t,l.id);if(m.status==='void')continue;allVoid=false;
        if(m.status!=='final'){open=true;continue;}if(m.winning!==l.pick)lost=true;else multiplier*=l.price/100;}
      if(!lost&&open)continue;
      const amount=lost?0:Math.round(slip.remaining*multiplier),state=lost?'lost':allVoid?'void':'won';
      const receipt=post(t,slip.player,0,amount,'sport:result:'+slip.id,now,state,slip.id);
      q('UPDATE sport_slips SET state=?,remaining=0,exposure=0,receipt=? WHERE id=?').run(state,receipt,slip.id);
    }
  }
  function operate(t,input,now=Date.now()){
    if(input.action==='limits'){
      const rule=limits(t);if(input.version!==rule.version)fail(409,'sportPriceChanged');
      if(!isInt(input.maxStake,1,1000000)||!isInt(input.liability,1,1000000000))fail(400,'invalid');
      q('INSERT INTO sport_limits VALUES(?,?,?,?) ON CONFLICT(tenant) DO UPDATE SET max_stake=excluded.max_stake,liability=excluded.liability,version=excluded.version').run(t,input.maxStake,input.liability,rule.version+1);
      return rule.version+1;
    }
    if(input.action!=='market')fail(400,'invalid');
    const m=market(t,input.id),state=input.status;
    if(!['open','suspended','final','void'].includes(state)||!Array.isArray(input.prices)||input.prices.length!==m.prices.length||input.prices.some(x=>!isInt(x,101,10000)))fail(400,'invalid');
    const win=state==='final'?input.winning:null;if(state==='final'&&!isInt(win,0,m.prices.length-1))fail(400,'invalid');
    if(['final','void'].includes(m.status)){
      if(m.status===state&&m.winning===win&&JSON.stringify(m.prices)===JSON.stringify(input.prices))return m.version;
      fail(409,'sportUnavailable');
    }
    if(input.version!==m.version)fail(409,'sportPriceChanged');
    q(`INSERT INTO sport_markets VALUES(?,?,?,?,?,?) ON CONFLICT(tenant,fixture) DO UPDATE SET prices=excluded.prices,version=excluded.version,status=excluded.status,winning=excluded.winning`)
      .run(t,m.id,JSON.stringify(input.prices),m.version+1,state,win);
    if(state==='final'||state==='void')settle(t,now);return m.version+1;
  }
  return {view,accept,quote,cash,operate};
}
