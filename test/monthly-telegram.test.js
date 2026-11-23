import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createMonthlyTelegram} from '../lib/monthly-telegram.js';
import {createGiftRewards} from '../lib/gift-rewards.js';

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE tenants(id TEXT PRIMARY KEY);INSERT INTO tenants VALUES('a'),('b');
    CREATE TABLE players(id INTEGER PRIMARY KEY,tenant_id TEXT,access_status TEXT);
    INSERT INTO players VALUES(1,'a','active'),(2,'a','active'),(3,'b','active');
    CREATE TABLE player_safety(player INTEGER,excluded_at INTEGER);
    CREATE TABLE ledger(tenant_id TEXT,player INTEGER,game TEXT,wager INTEGER,amount INTEGER,request_id TEXT,created_at INTEGER,outcome TEXT,UNIQUE(player,request_id));`);
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { const result=fn(); db.exec('COMMIT'); return result; }
    catch(e) {db.exec('ROLLBACK');throw e;}
  };
  const fail=(_,message)=>{throw Error(message);};
  const token='12003:'+randomBytes(30).toString('base64url');
  const remote={hook:'',botStatus:'administrator',status:'member',member:true,fail:false,wrongUser:false};
  const calls=[], secrets=new Map(), audits=[];
  const telegram=createMonthlyTelegram(db,{transaction,fail,
    seal:(_,value)=>{secrets.set('sealed',value);return 'sealed';},unseal:(_,key)=>secrets.get(key),
    fetcher:async(url, options)=>{
      assert.ok(url.startsWith('https://api.telegram.org/bot'+token+'/'));
      const method=url.split('/').at(-1),args=JSON.parse(options.body); calls.push(method);
      let result;
      if(method==='getMe')result={id:12003,username:'casino_qa_bot',is_bot:true};
      if(method==='getChat')result={id:-100010,username:'casino_qa_channel',title:'Casino QA',type:'channel',...remote.chat};
      if(method==='getWebhookInfo')result={url:remote.hook};
      if(method==='setWebhook'){if(remote.failSetup)throw Error('transport');Object.assign(remote,{hook:args.url,secret:args.secret_token});result=true;}
      if(method==='getChatMember'){
        if(args.user_id===12003)result={status:remote.botStatus,user:{id:12003,is_bot:true}};
        else if(remote.fail)throw Error('transport');
        else result={status:remote.status,is_member:remote.member,user:{id:remote.wrongUser?123:args.user_id,is_bot:false}};
      }
      return {ok:true,json:async()=>({ok:true,result})};
    }});
  const setup=(ver=0,tenant='a')=>telegram.configure(tenant,{version:ver,target:'https://t.me/casino_qa_channel',token},
    'https://example.test/casinohabibi',()=>{},step=>audits.push(step));
  const gifts=createGiftRewards(db,{club:{settings:()=>({amount:500,enabled:true})},events:{giftRaffle:()=>({tickets:0,prize:5000})},
    accountBreaks:{at:()=>false},telegram,fail});
  const row=(player,now=Date.now())=>gifts.describe('a',player,now).rows.find(r=>r.key==='monthly');
  const claim=(player,proof,now=Date.now())=>transaction(()=>gifts.redeem('a',player,{key:'monthly',action:'claim',amount:1000,period:row(player,now).period,membership:true},now,proof));
  const message=(start,id,patch={})=>({message:{text:'/start '+start,chat:{type:'private',id},from:{id,is_bot:false},...patch}});
  const link=(player,id,now=Date.now())=>{
    transaction(()=>telegram.start('a',player,'fr',now));
    const info=telegram.inspect('a',player,now);
    const start=new URL(info.botUrl).searchParams.get('start');
    const version=telegram.authenticateHook('a',remote.secret);
    const deliver=(event)=>transaction(()=>telegram.handleMessage('a',version,event,now));
    const reply=deliver(message(start,id));
    return {start,reply,code:reply.text.match(/\b\d{8}\b/)[0],deliver};
  };
  return {db,telegram,setup,remote,calls,audits,row,claim,link,message,transaction};
}

test('monthly credit requires a linked player and current channel membership, once per UTC month',async t=>{
  const {db,telegram,setup,remote,row,claim,link,transaction}=fixture(t);
  assert.equal(row(null).state,'telegramClosed');
  assert.throws(()=>claim(1),/telegramClosed/);
  await setup();
  assert.equal(row(null).state,'guest');
  assert.equal(row(1).state,'telegramStart');
  assert.throws(()=>claim(1),/telegramLinkRequired/);
  const {code}=link(1,131313);
  assert.equal(row(1).state,'telegramCode');
  assert.throws(()=>claim(1),/telegramLinkRequired/);
  assert.equal(transaction(()=>telegram.confirm('a',1,code)),null);
  assert.equal(row(1).state,'telegramClaim');
  assert.equal(row(2).state,'telegramStart');
  assert.equal(telegram.inspect('b',3,Date.now()).state,'telegramClosed');
  assert.throws(()=>claim(1),/telegramLinkRequired/);
  for(const status of ['left','kicked','restricted','unknown']){
    remote.status=status;remote.member=false;
    await assert.rejects(telegram.membership('a',1),/telegramJoinRequired/);
  }
  remote.status='member';remote.fail=true;
  await assert.rejects(telegram.membership('a',1),/telegramUnavailable/);
  remote.fail=false;remote.wrongUser=true;
  await assert.rejects(telegram.membership('a',1),/telegramUnavailable/);
  assert.equal(db.prepare('SELECT count(*) n FROM ledger').get().n,0);
  remote.wrongUser=false;remote.botStatus='member';
  await assert.rejects(telegram.membership('a',1),/telegramUnavailable/);
  remote.botStatus='administrator';remote.status='restricted';remote.member=true;
  const proof=await telegram.membership('a',1);
  assert.equal(telegram.permits('b',3,proof,Date.now()),false);
  assert.equal(telegram.permits('a',2,proof,Date.now()),false);
  assert.equal(telegram.permits('a',1,proof,proof.checked+16_000),false);
  assert.equal(claim(1,proof).changed,true);
  assert.equal(claim(1).changed,false);
  assert.equal(row(1).state,'claimed');
  assert.equal(db.prepare('SELECT sum(amount) n FROM ledger').get().n,1000);
  const nextMonth=new Date();nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1,1);
  assert.equal(row(1,+nextMonth).state,'telegramClaim');
  assert.throws(()=>claim(1,proof,+nextMonth),/telegramLinkRequired/);
  await setup(1);
  assert.equal(telegram.permits('a',1,proof,Date.now()),false);
  assert.equal(row(1).state,'claimed');
});

test('private Telegram codes are expiring, bound, rate-limited, and reusable only by the original player',async t=>{
  const {telegram,setup,remote,link,message,transaction}=fixture(t);await setup();
  assert.throws(()=>telegram.authenticateHook('a','wrong'),/telegramWebhookDenied/);
  assert.throws(()=>telegram.authenticateHook('b',remote.secret),/telegramWebhookDenied/);
  const now=Date.now(),first=link(1,44444,now);
  assert.equal(first.reply.method,'sendMessage');
  assert.deepEqual(first.deliver(message(first.start,12345)),{});
  assert.deepEqual(first.deliver(message(first.start,44444,{chat:{type:'group',id:44444}})),{});
  assert.deepEqual(first.deliver(message(first.start,44444,{from:{id:44444,is_bot:true}})),{});
  assert.deepEqual(first.reply,first.deliver(message(first.start,44444)));
  assert.equal(telegram.confirm('a',2,first.code,now),'telegramCodeInvalid');
  const wrong=first.code==='00000000'?'00000001':'00000000';
  for(let i=0;i<5;i++)assert.equal(transaction(()=>telegram.confirm('a',1,wrong,now)),'telegramCodeInvalid');
  assert.equal(telegram.confirm('a',1,first.code,now),'telegramCodeInvalid');
  assert.equal(telegram.inspect('a',1,now).state,'telegramWait');
  const after=now+600001;
  assert.equal(telegram.inspect('a',1,after).state,'telegramStart');
  const second=link(1,44444,after);
  assert.notEqual(first.start,second.start);
  assert.equal(transaction(()=>telegram.confirm('a',1,second.code,after)),null);
  assert.deepEqual(second.deliver(message(second.start,44444)),{});
  const reused=link(2,44444,after);
  assert.equal(transaction(()=>telegram.confirm('a',2,reused.code,after)),'telegramAlreadyLinked');
  assert.notEqual(telegram.inspect('a',2,after).state,'telegramClaim');
});

test('operator setup verifies an eligible target, protects existing bots, and retries an interrupted activation',async t=>{
  const {telegram,setup,remote,calls,audits}=fixture(t);
  remote.botStatus='member';await assert.rejects(setup(),/telegramAdminNeeded/);
  remote.botStatus='administrator';remote.hook='https://other.example/hook';await assert.rejects(setup(),/telegramBotBusy/);
  assert.equal(calls.includes('setWebhook'),false);
  remote.hook='';remote.chat={username:null,invite_link:'https://invalid.test/'};
  await assert.rejects(setup(),/telegramInviteNeeded/);
  remote.chat.invite_link='https://t.me/+Abc_123';
  remote.failSetup=true;await assert.rejects(setup(),/telegramUnavailable/);
  assert.equal(telegram.admin('a').ready,false);
  assert.equal(telegram.inspect('a',1,Date.now()).state,'telegramClosed');
  remote.failSetup=false;const config=await setup(1);
  assert.equal(config.ready,true);
  assert.equal('token' in config,false);
  assert.deepEqual(audits,['configure','configure','activate']);
  assert.equal(telegram.inspect('a',1,Date.now()).joinUrl,'https://t.me/+Abc_123');
  await assert.rejects(setup(0),/telegramChanged/);
  await assert.rejects(setup(0,'b'),/telegramBotBusy/);
});
