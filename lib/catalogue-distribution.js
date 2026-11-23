const categories=['slots','table','live'];
const assets=new Set(['game-gold.webp','game-aurora.webp','game-roulette.webp','game-blackjack.webp','campaign-match.webp','campaign-casino.webp','campaign-reels.webp']);
const channelSet=['desktop','mobile'];
export function createDistribution(db,{fail,audit}){
  const q=sql=>db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS distribution_titles(tenant TEXT NOT NULL,provider TEXT NOT NULL,external TEXT NOT NULL,
    metadata TEXT NOT NULL,editor_art TEXT NOT NULL DEFAULT '',PRIMARY KEY(tenant,provider,external));
    CREATE TABLE IF NOT EXISTS distribution_review(tenant TEXT NOT NULL,provider TEXT NOT NULL,external TEXT NOT NULL,
    native_type TEXT NOT NULL,title_en TEXT NOT NULL,title_fr TEXT NOT NULL,mapped TEXT,seen INTEGER NOT NULL,PRIMARY KEY(tenant,provider,external));
    CREATE TABLE IF NOT EXISTS distribution_rules(tenant TEXT NOT NULL,studio TEXT NOT NULL,market TEXT NOT NULL,
    channel TEXT NOT NULL,enabled INTEGER NOT NULL,version INTEGER NOT NULL,PRIMARY KEY(tenant,studio,market,channel));`);
  const marketOK=m=>typeof m==='string' && (!m||/^[A-Z]{2}(?:-[A-Z0-9]{1,3})?$/.test(m));
  const validArt=a=>a===''||assets.has(a);
  function metadata(g){
    const list=(value,allowed)=>{
      if(!Array.isArray(value)||value.length>20||value.some(x=>typeof x!=='string'||!x.trim()||x.length>56||(allowed&&!allowed.includes(x))))fail(400,'invalid');
      return [...new Set(value)];
    };
    const studio=g.studio||'',art=g.art||'',bonusBuy=g.bonusBuy??null,demo=g.demo??null;
    if(typeof studio!=='string'||studio.length>80||!validArt(art)||![null,true,false].includes(bonusBuy)||![null,true,false].includes(demo))fail(400,'invalid');
    return {studio,devices:list(g.devices??channelSet,channelSet),tags:list(g.tags??[]),art,bonusBuy,demo};
  }
  function normalise(t,provider,games,review){
    const rows=[],staged=[],extra=[];
    for(const game of games){
      const meta=metadata(game);extra.push([game.externalId,meta]);
      if(categories.includes(game.category))rows.push(game);
      else{
        if(!review||typeof game.category!=='string'||!game.category.trim()||game.category.length>80)fail(400,'catalogGameCategory');
        const mapping=q('SELECT mapped FROM distribution_review WHERE tenant=? AND provider=? AND external=? AND native_type=?').get(t,provider,game.externalId,game.category);
        staged.push(game);if(mapping?.mapped)rows.push({...game,category:mapping.mapped});
      }
    }
    return {rows,staged,extra};
  }
  function ingest(t,provider,feed,now){
    const touch=q(`INSERT INTO distribution_review VALUES(?,?,?,?,?,?,NULL,?) ON CONFLICT(tenant,provider,external) DO UPDATE SET
      mapped=CASE WHEN native_type=excluded.native_type THEN mapped ELSE NULL END,native_type=excluded.native_type,title_en=excluded.title_en,title_fr=excluded.title_fr,seen=excluded.seen`);
    for(const g of feed.staged)touch.run(t,provider,g.externalId,g.category,g.titleEn,g.titleFr,now);
    const current=new Set(feed.staged.map(g=>g.externalId));
    for(const r of q('SELECT external FROM distribution_review WHERE tenant=? AND provider=? AND seen>0').all(t,provider)){
      if(!current.has(r.external))q('UPDATE distribution_review SET seen=0 WHERE tenant=? AND provider=? AND external=?').run(t,provider,r.external);
    }
    const meta=q(`INSERT INTO distribution_titles(tenant,provider,external,metadata) VALUES(?,?,?,?)
      ON CONFLICT(tenant,provider,external) DO UPDATE SET metadata=excluded.metadata`);
    for(const [ref,spec] of feed.extra)meta.run(t,provider,ref,JSON.stringify(spec));
  }
  function eligible(t,{market='',channel='desktop'}={}){
    if(!marketOK(market)||!channelSet.includes(channel))fail(400,'invalid');
    const rules=q("SELECT studio FROM distribution_rules WHERE tenant=? AND enabled=0 AND (market='' OR market=? OR instr(?,market||'-')=1) AND (channel='all' OR channel=?)").all(t,market,market,channel);
    const blocked=new Set(rules.map(r=>r.studio));
    const rows=q(`SELECT g.id,g.provider,g.external_id AS externalId,g.title_en AS titleEn,g.title_fr AS titleFr,g.category,
      x.metadata,x.editor_art AS editorArt FROM game_catalog g JOIN providers p ON p.id=g.provider_id AND p.tenant_id=g.tenant_id
      LEFT JOIN distribution_titles x ON x.tenant=g.tenant_id AND x.provider=g.provider AND x.external=g.external_id WHERE g.tenant_id=? AND g.enabled=1 ORDER BY g.title_en,g.id`).all(t);
    return rows.flatMap(({metadata:raw,editorArt,...g})=>{
      const m=raw?JSON.parse(raw):{studio:'',devices:channelSet,tags:[],art:'',bonusBuy:null,demo:null};
      if(blocked.has(g.provider)||(m.studio&&blocked.has(m.studio))||!m.devices.includes(channel))return [];
      return [{...g,...m,art:editorArt||m.art}];
    });
  }
  function admin(t){
    return {assets:[...assets],rules:q('SELECT studio,market,channel,enabled,version FROM distribution_rules WHERE tenant=? ORDER BY studio,market,channel').all(t),
      review:q('SELECT provider,external,native_type AS nativeType,title_en AS titleEn,mapped FROM distribution_review WHERE tenant=? AND seen>0 ORDER BY provider,external LIMIT 500').all(t),
      studios:q("SELECT DISTINCT name FROM (SELECT name FROM providers WHERE tenant_id=? UNION SELECT json_extract(metadata,'$.studio') AS name FROM distribution_titles WHERE tenant=?) WHERE length(name)>0 ORDER BY name").all(t,t).map(x=>x.name)};
  }
  function change(t,staff,request,input){
    const {action}=input;
    if(action==='rule'){
      if(typeof input.studio!=='string'||!input.studio.trim()||input.studio.length>80||!marketOK(input.market)||!['all',...channelSet].includes(input.channel)||typeof input.enabled!=='boolean')fail(400,'invalid');
      const args=[t,input.studio,input.market,input.channel],old=q('SELECT version FROM distribution_rules WHERE tenant=? AND studio=? AND market=? AND channel=?').get(...args);
      if(input.version!==(old?.version??0))fail(409,'opStale');
      q('INSERT INTO distribution_rules VALUES(?,?,?,?,?,?) ON CONFLICT(tenant,studio,market,channel) DO UPDATE SET enabled=excluded.enabled,version=excluded.version').run(...args,Number(input.enabled),input.version+1);
    }else if(action==='art'){
      if(!validArt(input.art))fail(400,'invalid');
      const id=q('SELECT provider,external_id FROM game_catalog WHERE tenant_id=? AND id=?').get(t,input.id||0);
      if(!id)fail(404,'opMissing');
      q(`INSERT INTO distribution_titles VALUES(?,?,?,?,?) ON CONFLICT(tenant,provider,external) DO UPDATE SET editor_art=excluded.editor_art`)
        .run(t,id.provider,id.external_id,JSON.stringify(metadata({})),input.art);
    }else if(action==='map'){
      if(!categories.includes(input.category))fail(400,'invalid');
      const res=q('UPDATE distribution_review SET mapped=? WHERE tenant=? AND provider=? AND external=? AND native_type=? AND seen>0').run(input.category,t,input.provider,input.external,input.nativeType);
      if(!res.changes)fail(409,'opStale');
    }else fail(400,'invalid');
    const auditId=audit(t,staff.id,'catalogue_'+action,String(input.id||input.studio||input.external),request,{fields:[action]});
    return {auditId};
  }
  return {normalise,ingest,eligible,admin,change};
}
