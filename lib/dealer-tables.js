import {randomUUID} from 'node:crypto';
const local=[{id:'studio-rouge',title:'Roulette Riviera',game:'roulette',lang:'fr',capacity:6,provider:'Habibi Studio'},{id:'studio-ace',title:'Harbour Blackjack',game:'blackjack',lang:'en',capacity:5,provider:'Habibi Studio'}];
export function createDealerTables(db,{fail,notices}){
 const q=s=>db.prepare(s);
 db.exec(`CREATE TABLE IF NOT EXISTS demo_dealer_seats(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,table_id TEXT NOT NULL,player INTEGER NOT NULL,expires INTEGER NOT NULL,last_round INTEGER);
   CREATE INDEX IF NOT EXISTS demo_seat_occupancy ON demo_dealer_seats(tenant,table_id,expires);`);
 function available(t){
   const providers=q("SELECT b.provider FROM operator_bindings b JOIN operator_bindings product ON product.tenant_id=b.tenant_id AND product.environment=b.environment AND product.product=b.product AND product.provider='' WHERE b.tenant_id=? AND b.product='live-casino' AND b.state='active' AND product.state='active'").all(t);
   return [...local,...providers.flatMap(x=>x.provider==='atlas'?[{id:'atlas-wheel',title:'Atlas Wheel',game:'roulette',lang:'en',capacity:5,provider:'Atlas Studio'}]:x.provider==='cedar'?[{id:'cedar-cards',title:'Cartes du Cèdre',game:'blackjack',lang:'fr',capacity:4,provider:'Cedar Studio'}]:[])];
 }
 function list(t,p,now=Date.now()){return available(t).map(row=>{const seats=q('SELECT id,player,expires FROM demo_dealer_seats WHERE tenant=? AND table_id=? AND expires>?').all(t,row.id,now);
   return {...row,free:row.capacity-seats.length,seat:seats.find(x=>x.player===p)?.id||null};});}
 function enter(t,p,table,now=Date.now()){
   notices.block(t,p,now);const status=q('SELECT p.access_status,s.excluded_at,s.pause_until,s.cooling_off_until FROM players p LEFT JOIN player_safety s ON p.id=s.player WHERE p.tenant_id=? AND p.id=?').get(t,p);
   if(!status||status.access_status!=='active'||status.excluded_at||status.pause_until>now||status.cooling_off_until>now)fail(403,'playRestricted');
   const row=list(t,p,now).find(x=>x.id===table);if(!row)fail(404,'opMissing');if(row.seat)return {id:row.seat,game:row.game};if(!row.free)fail(409,'opUnavailable');
   const id=randomUUID();q('INSERT INTO demo_dealer_seats VALUES(?,?,?,?,?,NULL)').run(id,t,table,p,now+300000);return {id,game:row.game};
 }
 function use(t,p,id,game,now=Date.now()){const row=q('SELECT * FROM demo_dealer_seats WHERE id=? AND tenant=? AND player=? AND expires>?').get(id,t,p,now);
   if(!row||!available(t).some(x=>x.id===row.table_id&&x.game===game))fail(409,'opUnavailable');
   return row.table_id;}
 function record(t,p,id,receipt,now=Date.now()){q('UPDATE demo_dealer_seats SET expires=?,last_round=? WHERE tenant=? AND player=? AND id=?').run(now+300000,receipt,t,p,id);}
 function leave(t,p,id,now=Date.now()){q('UPDATE demo_dealer_seats SET expires=? WHERE id=? AND tenant=? AND player=?').run(now,id,t,p);}
 return {list,enter,use,record,leave};
}
