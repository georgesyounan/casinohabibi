import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createPlayerSignIn } from '../lib/player-signin.js';

for (const provider of ['google','discord']) test(provider+' uses the configured callback and binds consent, the session and the external identity to one tenant',async t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE tenants(id TEXT PRIMARY KEY); INSERT INTO tenants VALUES('one'),('two'); CREATE TABLE players(id INTEGER PRIMARY KEY,tenant_id TEXT,email TEXT)");
  const transaction=work=>{db.exec('BEGIN');try{const result=work();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
  const fail=(status,text)=>{throw new Error(text);};
  let mailbox='fixture@example.test', callCount=0, sub='101', verified=true;
  const origin='https://accounts.example.test', configKey='PLAYER_'+provider.toUpperCase();
  const access=createPlayerSignIn({db,fail,transaction,environment:{[configKey+'_CLIENT_ID']:'test-id',[configKey+'_CLIENT_SECRET']:'test-secret'}, publicBaseUrl:origin+'/casino',cookiePath:'/casino',secureCookie:'; Secure',
    session:(_req,_res,tenant,id)=>({id,tenant}),register:(_req,tenant,email)=>Number(db.prepare('INSERT INTO players(tenant_id,email) VALUES(?,?)').run(tenant,email).lastInsertRowid),
    fetcher:async(url,opts)=>{
      callCount++;
      if(opts.method==='POST'){
        assert.equal(opts.body.get('redirect_uri'),origin+'/casino/api/player-auth/callback/'+provider);
        assert.equal(opts.body.get('code'),'fixture-code');assert.equal(opts.body.get('client_secret'),'test-secret');
        if(provider==='google')assert.ok(opts.body.get('code_verifier'));
        return Response.json({access_token:'fixture-token',token_type:'Bearer'});
      }
      assert.equal(opts.headers.Authorization,'Bearer fixture-token');
      return Response.json(provider==='google'?{sub,email:mailbox,email_verified:verified}:{id:sub,email:mailbox,verified});
    }});
  const req={headers:{host:'accounts.example.test'}}, cookies=[];
  const res={appendHeader:(_key,value)=>cookies.push(value)};
  assert.deepEqual(access.methods(req),{providers:[provider]});
  assert.deepEqual(access.methods({headers:{host:'other.example.test'}}),{providers:[]});
  const begin=()=>{
    const url=new URL(access.startExternal(req,res,'one',{mode:'signup',provider,locale:'fr-CA'}).url);
    assert.equal(url.searchParams.get('client_id'),'test-id');assert.match(cookies.at(-1),/HttpOnly; SameSite=Lax/);
    req.headers.cookie=cookies.at(-1).split(';')[0];
    return new URLSearchParams({code:'fixture-code',state:url.searchParams.get('state')});
  };
  let params=begin(); assert.equal(await access.callback(req,'two',provider,params),'expired');
  assert.equal(await access.callback({headers:{host:req.headers.host}},'one',provider,params),'expired');
  assert.equal(await access.callback(req,'one',provider,new URLSearchParams({state:'x'})),'expired');assert.equal(callCount,0);
  assert.equal(await access.callback(req,'one',provider,params),'return');
  assert.equal(await access.callback(req,'one',provider,params),'expired');assert.equal(callCount,2);
  assert.equal(access.pending(req,'one').linked,false);
  assert.throws(()=>access.finishExternal(req,res,'one',{username:'PlayerOne',accepted:false}),/termsRequired/);
  const created=access.finishExternal(req,res,'one',{username:'PlayerOne',accepted:true});assert.equal(created.id,1);
  assert.throws(()=>access.finishExternal(req,res,'one',{}),/providerExpired/);
  params=begin();await access.callback(req,'one',provider,params);
  assert.equal(access.pending(req,'one').linked,true);assert.equal(access.finishExternal(req,res,'one',{}).id,1);
  sub='102';params=begin();await access.callback(req,'one',provider,params);
  assert.throws(()=>access.pending(req,'one'),/providerEmailUsed/);
  verified=false;params=begin();assert.equal(await access.callback(req,'one',provider,params),'unverified');
  params=begin();params.set('error','access_denied');assert.equal(await access.callback(req,'one',provider,params),'cancelled');
});
