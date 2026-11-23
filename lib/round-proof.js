import {randomBytes,createHash,createHmac} from 'node:crypto';
import {drawRound,unbiased,proofText} from '../public/round-rules.js';
export function createRoundProof(db,{fail}){
  db.exec(`CREATE TABLE IF NOT EXISTS round_commitments(player INTEGER PRIMARY KEY REFERENCES players(id),tenant TEXT NOT NULL,seed TEXT NOT NULL,commitment TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS round_proofs(receipt INTEGER PRIMARY KEY REFERENCES ledger(id),seed TEXT NOT NULL,commitment TEXT NOT NULL,client TEXT NOT NULL,precommitted INTEGER NOT NULL);`);
  const q=s=>db.prepare(s),make=()=>{const seed=randomBytes(32).toString('hex');return {seed,commitment:createHash('sha256').update(Buffer.from(seed,'hex')).digest('hex')};};
  function prepare(t,p,now=Date.now()){
    const active=q('SELECT commitment,expires FROM round_commitments WHERE player=? AND tenant=? AND expires>?').get(p,t,now);
    if(active)return active;
    const {seed,commitment}=make(),expires=now+1800000;
    q('INSERT INTO round_commitments VALUES(?,?,?,?,?) ON CONFLICT(player) DO UPDATE SET tenant=excluded.tenant,seed=excluded.seed,commitment=excluded.commitment,expires=excluded.expires').run(p,t,seed,commitment,expires);
    return {commitment,expires};
  }
  function consume(t,p,input,request,now){
    if(!input)return {...make(),client:request,precommitted:false};
    const r=q('SELECT seed,commitment FROM round_commitments WHERE player=? AND tenant=? AND expires>?').get(p,t,now);
    if(!r||r.commitment!==input.commitment)fail(409,'proofChanged');
    if(typeof input.client!=='string'||!/^[-A-Za-z0-9]{16,80}$/.test(input.client))fail(400,'invalid');
    q('DELETE FROM round_commitments WHERE player=? AND tenant=?').run(p,t);
    return {...r,client:input.client,precommitted:true};
  }
  function draw(proof,game,wager,choice){
    let counter=0,block,index=8;
    const prefix=proofText(proof.client,game,wager,choice);
    const next=()=>{if(index===8){block=createHmac('sha256',Buffer.from(proof.seed,'hex')).update(prefix+counter++).digest();index=0;}return block.readUInt32BE(4*index++);};
    return drawRound(game,wager,choice,limit=>unbiased(next,limit));
  }
  const save=(receipt,p)=>q('INSERT INTO round_proofs VALUES(?,?,?,?,?)').run(receipt,p.seed,p.commitment,p.client,Number(p.precommitted));
  function get(t,p,receipt){
    const row=q('SELECT l.id,l.game,l.wager,l.amount,l.outcome,p.seed,p.commitment,p.client,p.precommitted FROM round_proofs p JOIN ledger l ON l.id=p.receipt WHERE l.id=? AND l.tenant_id=? AND l.player=?').get(receipt,t,p);
    if(!row)fail(404,'proofUnavailable');
    const {preview,...outcome}=JSON.parse(row.outcome||'{}');return {...row,outcome:Object.keys(outcome).length?outcome:null,version:1};
  }
  return {prepare,consume,draw,save,get};
}
