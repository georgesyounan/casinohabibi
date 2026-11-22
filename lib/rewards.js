const steps = { Q01: 3, Q02: 2, Q03: 2, Q04: 3, Q05: 2, Q06: 3, Q07: 2, Q08: 2, Q09: 2, offer: 0 };
export function createRewards(db, { fail, accountBreaks, audit, navigation }) {
  db.exec(`CREATE TABLE IF NOT EXISTS discovery_programs (
    id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), version INTEGER NOT NULL, live INTEGER, draft TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0,builtin TEXT, UNIQUE(tenant_id,builtin));
    CREATE INDEX IF NOT EXISTS discovery_brand ON discovery_programs(tenant_id,id);
    CREATE TABLE IF NOT EXISTS discovery_versions (program INTEGER NOT NULL REFERENCES discovery_programs(id), version INTEGER NOT NULL,
      spec TEXT NOT NULL, published_at INTEGER NOT NULL, PRIMARY KEY(program,version));
    CREATE TABLE IF NOT EXISTS discovery_enrolments (id INTEGER PRIMARY KEY, program INTEGER NOT NULL, version INTEGER NOT NULL,
      player INTEGER NOT NULL REFERENCES players(id), started_at INTEGER NOT NULL, UNIQUE(program,player),
      FOREIGN KEY(program,version) REFERENCES discovery_versions(program,version));
    CREATE INDEX IF NOT EXISTS discovery_player ON discovery_enrolments(player,program);
    CREATE TABLE IF NOT EXISTS discovery_steps (enrolment INTEGER NOT NULL REFERENCES discovery_enrolments(id),
      step TEXT NOT NULL, ref TEXT NOT NULL, occurred_at INTEGER NOT NULL, PRIMARY KEY(enrolment,step));
    CREATE TABLE IF NOT EXISTS discovery_observations (enrolment INTEGER NOT NULL REFERENCES discovery_enrolments(id), step TEXT NOT NULL,
      ref TEXT NOT NULL, occurred_at INTEGER NOT NULL, PRIMARY KEY(enrolment,step,ref));
    CREATE TABLE IF NOT EXISTS cosmetic_grants (id INTEGER PRIMARY KEY, program INTEGER NOT NULL, version INTEGER NOT NULL,
      player INTEGER NOT NULL REFERENCES players(id), granted_at INTEGER NOT NULL, UNIQUE(program,player),
      FOREIGN KEY(program,version) REFERENCES discovery_versions(program,version));
    CREATE TABLE IF NOT EXISTS cosmetic_claims (id INTEGER PRIMARY KEY, grant_id INTEGER NOT NULL UNIQUE REFERENCES cosmetic_grants(id), claimed_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS profile_cosmetics (player INTEGER NOT NULL REFERENCES players(id), slot TEXT NOT NULL,
      claim_id INTEGER NOT NULL REFERENCES cosmetic_claims(id), PRIMARY KEY(player,slot));
    CREATE TABLE IF NOT EXISTS support_case_links (ticket INTEGER PRIMARY KEY REFERENCES support_tickets(id), reference TEXT NOT NULL);`);
  const stmt = sql => db.prepare(sql);
  const programs = stmt('SELECT * FROM discovery_programs WHERE tenant_id=? ORDER BY id DESC');
  const one = stmt('SELECT * FROM discovery_programs WHERE tenant_id=? AND id=?');
  const version = stmt('SELECT spec FROM discovery_versions WHERE program=? AND version=?');
  const enrol = stmt('SELECT * FROM discovery_enrolments WHERE program=? AND player=?');
  const ledger = stmt(`SELECT g.id AS grantId,g.granted_at AS grantedAt,g.version,c.id AS claimId,c.claimed_at AS claimedAt
    FROM cosmetic_grants g LEFT JOIN cosmetic_claims c ON c.grant_id=g.id WHERE g.program=? AND g.player=?`);
  const countClaimed = stmt('SELECT COUNT(*) AS n FROM cosmetic_claims c JOIN cosmetic_grants g ON g.id=c.grant_id WHERE g.program=?');
  const progress = stmt('SELECT step,ref,occurred_at AS occurredAt FROM discovery_steps WHERE enrolment=? ORDER BY occurred_at,step');
  const give = stmt('INSERT OR IGNORE INTO cosmetic_grants(program,version,player,granted_at) VALUES(?,?,?,?)');
  const palette = ['gold','forest','ocean','plum'];
  function validate(input) {
    const { template, slot, color, titleEn, titleFr, itemEn, itemFr, startsAt, endsAt, claimUntil, stock, collection = '', target = '', pair = [], rewardCollectionEn = '', rewardCollectionFr = '' } = input || {};
    const texts = [titleEn,titleFr,itemEn,itemFr];
    if (!Object.hasOwn(steps,template) || !['badge','theme','frame'].includes(slot) || !palette.includes(color) ||
        !texts.every(v=>typeof v==='string' && v.trim() && v.length<=100) || !Number.isSafeInteger(startsAt) || ![endsAt,claimUntil].every(x=>x===null || Number.isSafeInteger(x)) ||
        startsAt<0 || (endsAt!==null && endsAt<=startsAt) || (claimUntil!==null && (claimUntil<(endsAt??startsAt) || claimUntil>8.64e15)) ||
        (stock!==null && (!Number.isSafeInteger(stock) || stock<1 || stock>1000000)) || typeof collection!=='string' || collection.length>120 ||
        typeof target!=='string' || target.length>120 || !Array.isArray(pair) || pair.length>2 || !pair.every(id=>Number.isSafeInteger(id)&&id>0)) fail(400,'invalid');
    if (![rewardCollectionEn,rewardCollectionFr].every(name=>typeof name==='string' && name.length<=80) ||
        Boolean(rewardCollectionEn.trim())!==Boolean(rewardCollectionFr.trim())) fail(400,'invalidRewardCollection');
    if ((['Q02','Q06'].includes(template) && !collection.trim()) || (['Q02','Q03','Q06'].includes(template) && !/^[a-z0-9-]{1,64}$/.test(target)) ||
        (template==='Q09' && new Set(pair).size!==2)) fail(400,'invalid');
    if (template==='Q06' && new Set(collection.split('|').map(x=>x.trim()).filter(Boolean)).size<2) fail(400,'invalid');
    return {template,slot,color,titleEn:titleEn.trim(),titleFr:titleFr.trim(),itemEn:itemEn.trim(),itemFr:itemFr.trim(),startsAt,endsAt,claimUntil,stock,collection:collection.trim(),target,pair,rewardCollectionEn:rewardCollectionEn.trim(),rewardCollectionFr:rewardCollectionFr.trim()};
  }
  function edit(tenant,actor,request,input) {
    const {id,action,version:expected} = input;
    if (!['save','publish','archive'].includes(action) || !Number.isSafeInteger(expected) || expected<0) fail(400,'invalid');
    const old = id ? one.get(tenant,id) : null;
    if (id && !old) fail(404,'discoveryMissing');
    if ((old?.version || 0)!==expected) fail(409,'discoveryConflict');
    if (!old && action!=='save') fail(400,'invalid');
    const draft = action==='save' ? validate(input.spec) : JSON.parse(old.draft);
    const spec = action==='publish' ? navigation.publish(tenant,draft) : draft;
    if (action==='publish' && spec.claimUntil!==null && spec.claimUntil<=Date.now()) fail(400,'discoveryExpired');
    const next = expected+1;
    const key = old?.id || Number(stmt('INSERT INTO discovery_programs(tenant_id,version,draft) VALUES(?,?,?)').run(tenant,next,JSON.stringify(spec)).lastInsertRowid);
    if (action==='publish') stmt('INSERT INTO discovery_versions VALUES(?,?,?,?)').run(key,next,JSON.stringify(spec),Date.now());
    stmt('UPDATE discovery_programs SET version=?,draft=?,live=?,archived=? WHERE id=?').run(next,JSON.stringify(spec),
      action==='publish'?next:old?.live??null,action==='archive'?1:action==='publish'?0:old?.archived??0,key);
    const auditId = audit(tenant,actor,'discovery_'+action,'program-'+key,request,{recordId:key,revision:next,fields:['program']});
    return {id:key,version:next,auditId};
  }
  function staff(tenant) {
    return programs.all(tenant).map(p=>({id:p.id,version:p.version,live:p.live,archived:Boolean(p.archived),spec:JSON.parse(p.draft)}));
  }
  function summary(tenant,player,p,now,paused) {
    const entry=enrol.get(p.id,player), award=ledger.get(p.id,player);
    const rev=entry?.version || award?.version || p.live;
    if (!rev || (p.archived && !entry && !award)) return null;
    const spec=JSON.parse(version.get(p.id,rev).spec);
    const marks=entry?progress.all(entry.id):[];
    const stock=p.live && p.live!==rev ? JSON.parse(version.get(p.id,p.live).spec).stock : spec.stock;
    const available=stock===null?null:Math.max(0,stock-countClaimed.get(p.id).n);
    let state='available';
    if (award?.claimId) state='claimed';
    else if (p.archived) state='archived';
    else if (now<spec.startsAt) state='scheduled';
    else if (now>=(spec.claimUntil??(spec.template==='offer'?spec.endsAt:null)??Infinity) || (!award && spec.template!=='offer' && now>=(spec.endsAt??Infinity))) state='expired';
    else if (paused) state='paused';
    else if (award || spec.template==='offer') state=available!==0?'claimable':'soldOut';
    else if (entry) state='enrolled';
    return {id:p.id,version:rev,spec,state,available,goal:steps[spec.template],marks,startedAt:entry?.started_at??null,award:award||null};
  }
  function state(tenant,player) {
    const now=Date.now(), pause=accountBreaks.at(tenant,player,now);
    const items=programs.all(tenant).map(p=>summary(tenant,player,p,now,pause)).filter(Boolean);
    const equipped=Object.fromEntries(stmt('SELECT slot,claim_id FROM profile_cosmetics WHERE player=?').all(player).map(row=>[row.slot,row.claim_id]));
    return {items,equipped,pause};
  }
  function join(tenant,player,id,now=Date.now()) {
    const p=one.get(tenant,id);
    if (!p?.live || p.archived) fail(404,'discoveryMissing');
    if (accountBreaks.at(tenant,player,now)) fail(409,'discoveryPaused');
    if (enrol.get(id,player)) return {id};
    const spec=JSON.parse(version.get(id,p.live).spec);
    if (spec.template==='offer' || now<spec.startsAt || now>=(spec.endsAt??spec.claimUntil??Infinity)) fail(409,'discoveryClosed');
    stmt('INSERT INTO discovery_enrolments(program,version,player,started_at) VALUES(?,?,?,?)').run(id,p.live,player,now);
    return {id};
  }
  const openQuests=stmt(`SELECT e.*,v.spec FROM discovery_enrolments e JOIN discovery_programs p ON p.id=e.program
    JOIN discovery_versions v ON v.program=e.program AND v.version=e.version
    WHERE p.tenant_id=? AND e.player=? AND p.archived=0 AND e.started_at<=?
    AND NOT EXISTS (SELECT 1 FROM cosmetic_grants g WHERE g.program=e.program AND g.player=e.player)`);
  function stepKey(spec,kind,key,context,prior,seen,guideMatches) {
    switch(spec.template) {
      case 'Q01': return kind==='save' && 'title-'+key;
      case 'Q02': return kind==='guide' && guideMatches() ? 'guide' : kind==='save' && [context.collectionKey,...(context.collections||[])].includes(spec.collection) && prior.has('guide') && 'save';
      case 'Q03': return kind==='guideAck' && guideMatches() && seen('guideSeen','guide-'+key) ? 'guide' : kind==='shelf' && prior.has('guide') && 'shelf';
      case 'Q04': return kind==='preview' && 'title-'+key;
      case 'Q05': return kind==='vote'?'vote':kind==='result' && seen('vote',context.voteRef) && 'result';
      case 'Q06': return kind==='collection' && spec.collection.split('|').some(x=>[key,...(context.labels||[])].includes(x.trim())) ? 'collection-'+key :
        kind==='guide' && guideMatches() && [...prior.keys()].filter(k=>k.startsWith('collection-')).length>=2 && 'recap';
      case 'Q07': return kind==='joinList'?'join':kind==='contribute' && seen('join',context.joinRef) && 'add';
      case 'Q08': return kind==='activity'?'visit':kind==='activityAck' && seen('visit','activity-'+key) && 'ack';
      case 'Q09': return kind==='preview' && spec.pair.includes(Number(key)) && 'title-'+key;
      default: return null;
    }
  }
  const remember=stmt('INSERT OR IGNORE INTO discovery_observations VALUES(?,?,?,?)');
  const observation=stmt('SELECT 1 FROM discovery_observations WHERE enrolment=? AND step=? AND ref=?');
  function observe(tenant,player,kind,key,ref,now=Date.now(),context={}) {
    if (!player) return;
    const active=openQuests.all(tenant,player,now);
    if (!active.length || accountBreaks.at(tenant,player,now)) return;
    for(const e of active) {
      const spec=JSON.parse(e.spec);
      if (now<spec.startsAt || now>=(spec.endsAt??spec.claimUntil??Infinity)) continue;
      const marks=progress.all(e.id), prior=new Map(marks.map(m=>{
        if(spec.template==='Q06'&&m.step.startsWith('collection-')){
          const old=m.step.slice('collection-'.length);
          return ['collection-'+(navigation.collection(tenant,old)?.key || old),m.ref];
        }
        return [m.step,m.ref];
      }));
      const guideMatches=()=>spec.target===key||navigation.guide(tenant,spec.target)?.slug===key;
      const seen=(name,source)=>typeof source==='string'&&(prior.get(name)===source||Boolean(observation.get(e.id,name,source)));
      if(spec.template==='Q03'&&kind==='guide'&&guideMatches()){
        remember.run(e.id,'guideSeen','guide-'+key,now);
        continue;
      }
      const step=stepKey(spec,kind,key,context,prior,seen,guideMatches);
      if(!step)continue;
      if(['vote','join','visit'].includes(step))remember.run(e.id,step,ref,now);
      if(prior.has(step))continue;
      stmt('INSERT INTO discovery_steps VALUES(?,?,?,?)').run(e.id,step,ref,now);
      if (prior.size+1>=steps[spec.template] && (spec.template!=="Q06" || step==="recap")) give.run(e.program,e.version,player,now);
    }
  }
  function claim(tenant,player,ids) {
    if (!Array.isArray(ids) || !ids.length || ids.length>30 || !ids.every(id=>Number.isSafeInteger(id)&&id>0)) fail(400,'invalid');
    const now=Date.now(), pause=accountBreaks.at(tenant,player,now),receipts=[];
    for (const id of new Set(ids)) {
      const p=one.get(tenant,id);
      const item=p && summary(tenant,player,p,now,pause);
      if (!item) fail(404,'discoveryMissing');
      if (item.award?.claimId) {receipts.push(item.award);continue;}
      if (item.state!=='claimable') {receipts.push({program:id,state:item.state});continue;}
      give.run(id,item.version,player,now);
      const grant=ledger.get(id,player);
      stmt('INSERT INTO cosmetic_claims(grant_id,claimed_at) VALUES(?,?)').run(grant.grantId,now);
      receipts.push(ledger.get(id,player));
    }
    return {receipts};
  }
  function equip(tenant,player,slot,claimId) {
    if (!['badge','theme','frame'].includes(slot)) fail(400,'invalid');
    if (claimId===null) stmt('DELETE FROM profile_cosmetics WHERE player=? AND slot=?').run(player,slot);
    else {
      if (!Number.isSafeInteger(claimId) || !stmt(`SELECT 1 FROM cosmetic_claims c JOIN cosmetic_grants g ON g.id=c.grant_id
        JOIN discovery_programs p ON p.id=g.program JOIN discovery_versions v ON v.program=g.program AND v.version=g.version
        WHERE c.id=? AND g.player=? AND p.tenant_id=? AND json_extract(v.spec,'$.slot')=?`).get(claimId,player,tenant,slot)) fail(403,'discoveryUnowned');
      stmt('INSERT INTO profile_cosmetics VALUES(?,?,?) ON CONFLICT(player,slot) DO UPDATE SET claim_id=excluded.claim_id').run(player,slot,claimId);
    }
    return {slot,claimId};
  }
  function owner(tenant,reference) {
    const match=/^(claim|save|activity)-([1-9]\d{0,14})$/.exec(reference||'');
    if (!match) return;
    const id=Number(match[2]);
    if (match[1]==='claim') return stmt('SELECT g.player AS id FROM cosmetic_claims c JOIN cosmetic_grants g ON g.id=c.grant_id JOIN discovery_programs p ON p.id=g.program WHERE p.tenant_id=? AND c.id=?').get(tenant,id)?.id;
    return stmt(`SELECT s.player_id AS id FROM coming_soon_saves s WHERE s.tenant_id=? AND s.id=${match[1]==='save'?'?':'(SELECT save_id FROM coming_soon_activity WHERE id=?)'}`).get(tenant,id)?.id;
  }
  function link(tenant,player,ticket,reference) {
    if (!reference) return;
    if(owner(tenant,reference)!==player) fail(404,'discoveryMissing');
    stmt('INSERT INTO support_case_links VALUES(?,?)').run(ticket,reference);
  }
  function seed(tenant) {
    const spec=JSON.stringify({template:'Q01',slot:'badge',color:'gold',titleEn:'Lobby Curator',titleFr:'Curateur du catalogue',
      itemEn:'Curator badge',itemFr:'Badge Curateur',startsAt:0,endsAt:null,claimUntil:null,stock:null,collection:'',target:'',pair:[]});
    const created=stmt("INSERT OR IGNORE INTO discovery_programs(tenant_id,version,live,draft,builtin) VALUES(?,1,1,?,'curator')").run(tenant,spec);
    if(created.changes) stmt('INSERT INTO discovery_versions VALUES(?,1,?,?)').run(created.lastInsertRowid,spec,Date.now());
  }
  function sawGuide(tenant,player,program,slug){
    const enrolment=enrol.get(program,player);
    return Boolean(enrolment && one.get(tenant,program) && observation.get(enrolment.id,'guideSeen','guide-'+slug));
  }
  function personal(tenant,player){
    const data=state(tenant,player);
    return {...data,items:data.items.filter(item=>item.startedAt||item.award)};
  }
  return {staff,edit,state,personal,sawGuide,join,observe,claim,equip,owner,link,seed};
}
