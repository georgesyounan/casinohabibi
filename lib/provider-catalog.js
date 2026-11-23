import { providerCatalogIssue } from '../public/catalog.js';
import { createHash } from 'node:crypto';
import { foldText, pageInfo, searchText } from './message-history.js';

const categories=['slots','table','live'];
const listingFrom=`FROM game_catalog g LEFT JOIN provider_listing_state s ON s.listing_id=g.id`;
const columns=`g.id,g.external_id AS externalId,g.title_en AS titleEn,g.title_fr AS titleFr,g.category,
  coalesce(s.in_feed,g.enabled) AS inFeed,coalesce(s.hidden,0) AS hidden,coalesce(s.version,0) AS version`;
const historyFrom=`FROM staff_events e LEFT JOIN provider_catalog_imports i ON i.audit_id=e.id
  LEFT JOIN staff_accounts a ON a.id=e.actor_id AND (e.actor_id=? OR ?=1)`;
const byId=(a,b)=>a.externalId<b.externalId?-1:a.externalId>b.externalId?1:0;
const display=row=>({titleEn:row.titleEn,titleFr:row.titleFr,category:row.category,inFeed:Boolean(row.inFeed),hidden:Boolean(row.hidden)});
const sampleGames=[
  {externalId:'northplay-sample-slots',titleEn:'Northern Lights',titleFr:'Aurores boréales',category:'slots'},
  {externalId:'northplay-sample-blackjack',titleEn:'Maple Blackjack',titleFr:'Blackjack à l’érable',category:'table'},
  {externalId:'northplay-sample-roulette',titleEn:'Roulette Studio',titleFr:'Studio de roulette',category:'live'},
  {externalId:'northplay-sample-aurora',titleEn:'Aurora Spins',titleFr:'Tours boréaux',category:'slots'}
];

export function createProviderCatalog(db,{fail,audit,encryptKey,distribution}) {
  db.exec(`CREATE TABLE IF NOT EXISTS provider_listing_state (
    listing_id INTEGER PRIMARY KEY REFERENCES game_catalog(id) ON DELETE CASCADE,
    in_feed INTEGER NOT NULL CHECK(in_feed IN (0,1)),hidden INTEGER NOT NULL CHECK(hidden IN (0,1)),version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS provider_catalog_imports (
    audit_id INTEGER PRIMARY KEY REFERENCES staff_events(id),counts TEXT NOT NULL,entries TEXT NOT NULL);`);
  // Older imports disabled omitted titles. A later staff hide identifies a listing that was still offered.
  if(db.prepare('SELECT 1 '+listingFrom+' WHERE s.listing_id IS NULL LIMIT 1').get()){
    db.exec(`WITH toggles AS (SELECT tenant_id,target,max(id) AS id FROM staff_events
        WHERE action IN ('catalog_listing_disabled','catalog_listing_enabled') GROUP BY tenant_id,target),
      imports AS (SELECT tenant_id,target,max(id) AS id FROM staff_events WHERE action='provider_catalog_synced' GROUP BY tenant_id,target)
      INSERT INTO provider_listing_state(listing_id,in_feed,hidden,version)
      SELECT g.id,CASE WHEN g.enabled=1 OR (ev.action='catalog_listing_disabled' AND ev.id>coalesce(i.id,0)) THEN 1 ELSE 0 END,
        CASE WHEN g.enabled=0 AND ev.action='catalog_listing_disabled' THEN 1 ELSE 0 END,1
      ${listingFrom}
      LEFT JOIN toggles t ON t.tenant_id=g.tenant_id AND t.target=g.provider||':'||g.external_id
      LEFT JOIN staff_events ev ON ev.id=t.id LEFT JOIN imports i ON i.tenant_id=g.tenant_id AND i.target=g.provider
      WHERE s.listing_id IS NULL`);
  }
  db.function('provider_catalog_fold',{deterministic:true},foldText);
  const provider=db.prepare('SELECT id FROM providers WHERE tenant_id=? AND name=?');
  const all=db.prepare('SELECT '+columns+' '+listingFrom+' WHERE g.tenant_id=? AND g.provider_id=? ORDER BY g.external_id');
  const names=db.prepare('SELECT name FROM providers WHERE tenant_id=? ORDER BY name COLLATE NOCASE,name');
  const writeState=db.prepare(`INSERT INTO provider_listing_state(listing_id,in_feed,hidden,version) VALUES(?,?,?,1)
    ON CONFLICT(listing_id) DO UPDATE SET in_feed=excluded.in_feed,hidden=excluded.hidden,version=provider_listing_state.version+1`);
  const writeGame=db.prepare(`INSERT INTO game_catalog(tenant_id,provider_id,provider,external_id,title_en,title_fr,category,enabled)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,provider_id,external_id) DO UPDATE SET
    title_en=excluded.title_en,title_fr=excluded.title_fr,category=excluded.category,enabled=excluded.enabled RETURNING id`);
  function sampleName(tenant,brand) {
    const known=db.prepare(`SELECT e.name FROM provider_events e JOIN providers p ON p.name=e.name AND p.tenant_id=e.tenant_id
      WHERE e.tenant_id=? AND e.action='sample_catalog_created' AND NOT EXISTS (
        SELECT 1 FROM provider_events x WHERE x.tenant_id=e.tenant_id AND x.name=e.name AND x.id>e.id AND x.action='rotated')
      ORDER BY e.id DESC LIMIT 1`).get(tenant);
    if(known)return known.name;
    const base=(String(brand||'').replace(/[^\p{L}\p{N} ._-]/gu,' ').trim().slice(0,40)||'Local')+' Demo Sample';
    const used=new Set(names.all(tenant).map(row=>row.name));
    let choice=base;
    for(let n=2;used.has(choice);n++)choice=base+' '+n;
    return choice;
  }
  function plan(tenant,brand,input) {
    const {name,games,sample=false}=input||{};
    if(typeof name!=='string'||!name.trim()||name.length>64||typeof sample!=='boolean')fail(400,'invalid');
    if(sample&&name!==sampleName(tenant,brand))fail(409,'catalogChanged');
    const owner=provider.get(tenant,name);
    if(!owner&&!sample)fail(400,'catalogProviderMissing');
    const issue=providerCatalogIssue(games,input.reviewUnknown===true);
    if(issue)fail(400,issue.key);
    const feed=distribution.normalise(tenant,name,games,input.reviewUnknown===true);
    const ids=new Set(feed.rows.map(game=>game.externalId));
    const incoming=feed.rows.map(game=>({externalId:game.externalId,titleEn:game.titleEn.trim(),titleFr:game.titleFr.trim(),category:game.category}));
    incoming.sort(byId);
    const previous=owner?all.all(tenant,owner.id):[],rows=new Map(previous.map(row=>[row.externalId,row]));
    const entries=[],counts={added:0,updated:0,returned:0,removed:0,unchanged:0,held:0};
    for(const row of incoming){
      const old=rows.get(row.externalId),before=old?display(old):null;
      let kind='unchanged';
      if(!old)kind='added';
      else if(!old.inFeed)kind='returned';
      else if(['titleEn','titleFr','category'].some(key=>old[key]!==row[key]))kind='updated';
      counts[kind]++;
      if(old?.hidden)counts.held++;
      entries.push({externalId:row.externalId,kind,before,after:display({...row,inFeed:true,hidden:old?.hidden})});
    }
    for(const old of previous)if(old.inFeed&&!ids.has(old.externalId)){
      counts.removed++;
      entries.push({externalId:old.externalId,kind:'removed',before:display(old),after:display({...old,inFeed:false})});
    }
    entries.sort(byId);
    const revision=createHash('sha256').update(JSON.stringify([tenant,name,sample,owner?.id??null,previous,incoming,feed.extra,feed.staged.map(x=>[x.externalId,x.category])])).digest('hex');
    return {owner,revision,counts,entries,feed};
  }
  function preview(tenant,brand,input) {
    const {revision,counts,entries,feed}=plan(tenant,brand,input);
    return {revision,counts,entries,review:feed.staged.map(x=>({externalId:x.externalId,nativeType:x.category})),added:counts.added+counts.returned,updated:counts.updated,removed:counts.removed,unchanged:counts.unchanged};
  }
  function sample(tenant,brand) {
    const name=sampleName(tenant,brand);
    return {name,games:sampleGames,preview:preview(tenant,brand,{name,games:sampleGames,sample:true})};
  }
  function sync(tenant,brand,actor,request,input) {
    if(typeof input?.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedRevision))fail(400,'invalid');
    const {owner,revision,counts,entries,feed}=plan(tenant,brand,input);
    if(revision!==input.expectedRevision)fail(409,'catalogChanged');
    const {name,games}=input,now=new Date().toISOString();
    let providerId=owner?.id;
    if(!providerId){
      providerId=Number(db.prepare('INSERT INTO providers(name,encrypted_key,updated,tenant_id) VALUES(?,?,?,?)')
        .run(name,encryptKey(name,'LOCAL-ONLY-NO-PROVIDER-CONNECTION'),now,tenant).lastInsertRowid);
      db.prepare("INSERT INTO provider_events(name,action,created,tenant_id) VALUES(?,'sample_catalog_created',?,?)").run(name,now,tenant);
    }
    distribution.ingest(tenant,name,feed,Date.now());
    for(const entry of entries){
      if(entry.kind==='unchanged')continue;
      const next=entry.after;
      const {id}=writeGame.get(tenant,providerId,name,entry.externalId,next.titleEn,next.titleFr,next.category,Number(next.inFeed&&!next.hidden));
      writeState.run(id,Number(next.inFeed),Number(next.hidden));
    }
    db.prepare('INSERT INTO provider_events(name,action,created,tenant_id) VALUES(?,?,?,?)').run(name,'catalog_synced:'+games.length,now,tenant);
    const auditId=audit(tenant,actor,'provider_catalog_synced',name,request,{recordId:providerId,fields:['listings']});
    db.prepare('INSERT INTO provider_catalog_imports VALUES(?,?,?)').run(auditId,JSON.stringify(counts),JSON.stringify(entries));
    return {imported:games.length,auditId,counts};
  }
  function visibility(tenant,actor,request,{name,externalId,enabled,version}) {
    if(typeof name!=='string'||!name.trim()||name.length>64||typeof externalId!=='string'||!/^[\w.-]{1,128}$/.test(externalId)||
       typeof enabled!=='boolean'||(version!==undefined&&(!Number.isSafeInteger(version)||version<0)))fail(400,'invalid');
    const row=db.prepare('SELECT '+columns+' '+listingFrom+' WHERE g.tenant_id=? AND g.provider=? AND g.external_id=?').get(tenant,name,externalId);
    if(!row)fail(404,'invalid');
    if(version!==undefined&&row.version!==version)fail(409,'catalogListingChanged');
    if(!row.inFeed&&enabled)fail(409,'catalogSourceMissing');
    if(Boolean(row.hidden)===!enabled)return {name,externalId,enabled};
    writeState.run(row.id,row.inFeed,Number(!enabled));
    db.prepare('UPDATE game_catalog SET enabled=? WHERE tenant_id=? AND id=?').run(Number(enabled&&row.inFeed),tenant,row.id);
    const auditId=audit(tenant,actor,enabled?'catalog_listing_enabled':'catalog_listing_disabled',name+':'+externalId,request,{recordId:row.id,fields:['enabled']});
    return {name,externalId,enabled,auditId};
  }
  function paged(params,from,fields,args,sort) {
    const page=pageInfo(params,db.prepare('SELECT count(*) AS n '+from).get(...args).n,8,fail);
    return {...page,items:db.prepare('SELECT '+fields+' '+from+' ORDER BY '+sort+' LIMIT ? OFFSET ?')
      .all(...args,page.size,(page.page-1)*page.size)};
  }
  function listings(tenant,params) {
    const q=searchText(params,fail),category=params.get('category')||'',filter=params.get('filter')||'all',name=params.get('provider')||'';
    if(!['all','visible','hidden','missing'].includes(filter)||(category&&!categories.includes(category))||name.length>64)fail(400,'invalid');
    const where=['g.tenant_id=?'],args=[tenant];
    for(const word of q.split(/\s+/).filter(Boolean)){
      where.push("instr(provider_catalog_fold(g.external_id||' '||g.title_en||' '||g.title_fr||' '||g.provider),?)>0");args.push(word);
    }
    if(name){where.push('g.provider=?');args.push(name);}
    if(category){where.push('g.category=?');args.push(category);}
    if(filter==='visible')where.push('g.enabled=1');
    if(filter==='missing')where.push('coalesce(s.in_feed,g.enabled)=0');
    if(filter==='hidden')where.push('coalesce(s.in_feed,g.enabled)=1 AND coalesce(s.hidden,0)=1');
    const page=paged(params,listingFrom+' WHERE '+where.join(' AND '),columns+',g.provider AS name,g.enabled,(SELECT editor_art FROM distribution_titles x WHERE x.tenant=g.tenant_id AND x.provider=g.provider AND x.external=g.external_id) AS editorArt',args,'g.provider COLLATE NOCASE,g.title_en COLLATE NOCASE,g.id');
    return {...page,providers:names.all(tenant).map(p=>p.name)};
  }
  function imports(tenant,staff,params) {
    const term=searchText(params,fail),name=params.get('provider')||'',where=["e.tenant_id=?","e.action='provider_catalog_synced'"],args=[staff.id,Number(staff.role==='operator_admin'),tenant];
    if(name.length>64)fail(400,'invalid');
    if(name){where.push('e.target=?');args.push(name);}
    if(/^import-\d+$/.test(term)){where.push('e.id=?');args.push(term.slice(7));}
    else if(term){where.push("instr(provider_catalog_fold(e.target||' '||coalesce(a.email,'')),?)>0");args.push(term);}
    const page=paged(params,historyFrom+' WHERE '+where.join(' AND '),'e.id,e.target AS name,e.created_at AS at,a.email AS actor,i.counts',args,'e.id DESC');
    return {...page,items:page.items.map(r=>({...r,counts:r.counts?JSON.parse(r.counts):null})),providers:names.all(tenant).map(p=>p.name)};
  }
  function receipt(tenant,staff,id) {
    const row=db.prepare(`SELECT e.id,e.target AS name,e.created_at AS at,a.email AS actor,i.counts,i.entries ${historyFrom}
      WHERE e.tenant_id=? AND e.id=? AND e.action='provider_catalog_synced'`).get(staff.id,Number(staff.role==='operator_admin'),tenant,id);
    if(!row)fail(404,'catalogImportMissing');
    return {...row,counts:row.counts?JSON.parse(row.counts):null,entries:row.entries?JSON.parse(row.entries):[]};
  }
  return {preview,sync,visibility,listings,imports,receipt,sample};
}
