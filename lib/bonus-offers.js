import {weekStart} from './lobby-events.js';
import {randomUUID} from 'node:crypto';
import {slotRoll} from './gift-rewards.js';
const week=7*86400000;
const v1={version:1,grant:1000,target:2000,eligible:['gold','aurora'],cashbackBps:1000,cap:2500,days:7,studio:'Habibi Studio · démo',game:'gold'};
export function createBonusOffers(db,{fail,notices}){
  const q=s=>db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS bonus_offers(tenant TEXT NOT NULL,player INTEGER NOT NULL,rule INTEGER NOT NULL,starts INTEGER NOT NULL,expires INTEGER NOT NULL,changes INTEGER NOT NULL DEFAULT 0,paid INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(tenant,player,rule));
    CREATE TABLE IF NOT EXISTS bonus_corrections(tenant TEXT NOT NULL,entry INTEGER NOT NULL REFERENCES ledger(id),reason TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(tenant,entry));
    CREATE TABLE IF NOT EXISTS bonus_cashback_adjustments(tenant TEXT NOT NULL,entry INTEGER NOT NULL,amount INTEGER NOT NULL,period INTEGER NOT NULL,PRIMARY KEY(tenant,entry));
    CREATE TABLE IF NOT EXISTS bonus_provider_grants(tenant TEXT NOT NULL,player INTEGER NOT NULL,period INTEGER NOT NULL,ref TEXT NOT NULL UNIQUE,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(tenant,player,period));
    CREATE TABLE IF NOT EXISTS bonus_cashback(tenant TEXT NOT NULL,player INTEGER NOT NULL,period INTEGER NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(tenant,player,period));`);
  function allow(t,p,now){
    const row=q('SELECT p.access_status,s.pause_until,s.cooling_off_until,s.excluded_at FROM players p LEFT JOIN player_safety s ON s.player=p.id WHERE p.id=? AND p.tenant_id=?').get(p,t);
    if(!row||row.access_status!=='active'||row.excluded_at||row.pause_until>now||row.cooling_off_until>now)fail(403,'discoveryPaused');notices.block(t,p,now);
  }
  const credit=(t,p,amount,ref,tag,now)=>q('INSERT INTO ledger(tenant_id,player,game,wager,amount,request_id,created_at,outcome) VALUES(?,?,NULL,0,?,?,?,?)').run(t,p,amount,ref,now,JSON.stringify({type:tag}));
  function progress(t,p,o){
    if(!o)return 0;
    return q(`SELECT coalesce(sum(wager),0) n FROM ledger l WHERE tenant_id=? AND player=? AND game IN ('gold','aurora') AND wager>0
      AND created_at>=? AND created_at<? AND NOT EXISTS(SELECT 1 FROM bonus_corrections c WHERE c.tenant=l.tenant_id AND c.entry=l.id)`).get(t,p,o.starts,o.expires).n;
  }
  function settle(t,p,now){
    const o=q('SELECT * FROM bonus_offers WHERE tenant=? AND player=? AND rule=?').get(t,p,v1.version);if(!o)return;
    const target=progress(t,p,o)>=v1.target?v1.grant:0;if(o.paid===target)return;
    const change=o.changes+1;credit(t,p,target-o.paid,'offer:unlock:'+o.rule+':'+change,'demo_bonus_conversion',now);
    q('UPDATE bonus_offers SET changes=?,paid=? WHERE tenant=? AND player=? AND rule=?').run(change,target,t,p,o.rule);
  }
  function loss(t,p,start){
    const {value}=q(`SELECT coalesce(-sum(l.amount),0) value FROM ledger l WHERE l.tenant_id=? AND l.player=? AND l.wager>0
      AND l.game IN ('gold','aurora','blackjack','roulette') AND l.created_at>=? AND l.created_at<?
      AND NOT EXISTS(SELECT 1 FROM bonus_corrections c WHERE c.tenant=l.tenant_id AND c.entry=l.id)`).get(t,p,start,start+week);
    return Math.min(v1.cap,Math.floor(Math.max(0,value)*v1.cashbackBps/10000));
  }
  function view(t,p,now=Date.now()){
    const period=weekStart(now),offer=p?q('SELECT * FROM bonus_offers WHERE tenant=? AND player=? AND rule=?').get(t,p,v1.version):null;
    const cashback=p?q('SELECT amount FROM bonus_cashback WHERE tenant=? AND player=? AND period=?').get(t,p,period-week):null;
    const grant=p?q('SELECT ref,expires,used FROM bonus_provider_grants WHERE tenant=? AND player=? AND period=?').get(t,p,period):null;
    return {rules:v1,period,offer:offer?{starts:offer.starts,expires:offer.expires,progress:progress(t,p,offer),unlocked:offer.paid,expired:offer.expires<=now}:null,
      cashback:{start:period-week,end:period,amount:cashback?.amount??(p?loss(t,p,period-week):0),claimed:Boolean(cashback)},spin:grant||null};
  }
  function player(t,p,input,now=Date.now()){
    allow(t,p,now);
    const period=weekStart(now),key=input.action;if(input.period!==undefined&&Number(input.period)!==period)fail(409,'clubOfferChanged');
    if(key==='bonus-start'){
      q('INSERT OR IGNORE INTO bonus_offers(tenant,player,rule,starts,expires) VALUES(?,?,?,?,?)').run(t,p,v1.version,now,now+v1.days*86400000);
    }else if(key==='bonus-cashback'){
      if(q('SELECT 1 FROM bonus_cashback WHERE tenant=? AND player=? AND period=?').get(t,p,period-week))return;
      const amount=loss(t,p,period-week);if(!amount)fail(409,'giftUnavailable');
      q('INSERT INTO bonus_cashback VALUES(?,?,?,?)').run(t,p,period-week,amount);credit(t,p,amount,'offer:cashback:'+period,'demo_net_loss_cashback',now);
    }else if(key==='bonus-spin-grant'){
      q('INSERT OR IGNORE INTO bonus_provider_grants VALUES(?,?,?,?,?,0)').run(t,p,period,randomUUID(),period+week);
    }else if(key==='bonus-spin-use'){
      const grant=q('SELECT * FROM bonus_provider_grants WHERE tenant=? AND player=? AND ref=?').get(t,p,input.ref||'');
      if(!grant||grant.expires<=now)fail(409,'giftUnavailable');if(grant.used)return;
      const roll=slotRoll();credit(t,p,100*roll.multiplier,'offer:spin:'+grant.ref,'studio_fixture_free_spin',now);
      q('UPDATE bonus_provider_grants SET used=1 WHERE ref=?').run(grant.ref);
    }else fail(400,'invalid');
  }
  function correct(t,id,reason,now=Date.now()){
    if(!Number.isInteger(id)||typeof reason!=='string'||!reason.trim()||reason.length>200)fail(400,'invalid');
    const r=q('SELECT player,created_at FROM ledger WHERE tenant_id=? AND id=? AND wager>0').get(t,id);if(!r)fail(404,'opMissing');
    if(!q('INSERT OR IGNORE INTO bonus_corrections VALUES(?,?,?,?)').run(t,id,reason.trim(),now).changes)return id;
    settle(t,r.player,now);const period=weekStart(r.created_at),old=q('SELECT amount FROM bonus_cashback WHERE tenant=? AND player=? AND period=?').get(t,r.player,period);
    if(old){const amount=loss(t,r.player,period),delta=amount-old.amount;if(delta){
      credit(t,r.player,delta,'offer:cashback-adjust:'+id,'demo_cashback_correction',now);
      q('INSERT INTO bonus_cashback_adjustments VALUES(?,?,?,?)').run(t,id,delta,period);
      q('UPDATE bonus_cashback SET amount=? WHERE tenant=? AND player=? AND period=?').run(amount,t,r.player,period);}}
    return id;
  }
  return {view,player,settle,correct};
}
