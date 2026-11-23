export function createPlayerNotices(db,{fail}){
  db.exec(`CREATE TABLE IF NOT EXISTS player_blocking_notices(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL,player INTEGER NOT NULL REFERENCES players(id),
    kind TEXT NOT NULL,reason TEXT NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL,acknowledged INTEGER,lifted INTEGER);
    CREATE INDEX IF NOT EXISTS notice_active ON player_blocking_notices(tenant,player,ends,starts);`);
  const q=sql=>db.prepare(sql);
  const nowActive=(t,p,now=Date.now())=>q('SELECT id,kind,reason,starts,ends,acknowledged FROM player_blocking_notices WHERE tenant=? AND player=? AND starts<=? AND ends>? AND lifted IS NULL ORDER BY ends DESC,id DESC LIMIT 1').get(t,p,now,now)||null;
  function block(t,p,now){if(nowActive(t,p,now))fail(403,'playRestricted');}
  function create(t,p,input,now=Date.now()){
    if(!q('SELECT 1 FROM players WHERE tenant_id=? AND id=?').get(t,p))fail(404,'opMissing');
    if(!['break','time','money','maintenance','suspension','closure'].includes(input.kind)||!Number.isInteger(input.minutes)||input.minutes<1||input.minutes>525600||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>200)fail(400,'invalid');
    const result=q('INSERT INTO player_blocking_notices(tenant,player,kind,reason,starts,ends) VALUES(?,?,?,?,?,?)').run(t,p,input.kind,input.reason.trim(),now,now+input.minutes*60000);
    return Number(result.lastInsertRowid);
  }
  function ack(t,p,id,now=Date.now()){
    if(!q('UPDATE player_blocking_notices SET acknowledged=coalesce(acknowledged,?) WHERE tenant=? AND player=? AND id=?').run(now,t,p,id||0).changes)fail(404,'opMissing');
    return nowActive(t,p,now);
  }
  function lift(t,p,id,now=Date.now()){
    if(!q('UPDATE player_blocking_notices SET lifted=coalesce(lifted,?) WHERE tenant=? AND player=? AND id=?').run(now,t,p,id||0).changes)fail(404,'opMissing');
    return id;
  }
  return {nowActive,block,create,ack,lift};
}
