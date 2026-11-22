import { foldText, pageInfo, searchText } from './message-history.js';

const counts=()=>({visits:0,signups:0,verified:0,qualified:0,pending:0});
const reviewFrom=`FROM growth_signups s JOIN players p ON p.id=s.player AND p.tenant_id=s.tenant
  JOIN growth_partners partner ON partner.id=s.partner AND partner.tenant=s.tenant
  LEFT JOIN growth_visit_links vl ON vl.visit=s.visit
  LEFT JOIN growth_partner_links link ON link.id=vl.link AND link.partner=s.partner
  LEFT JOIN growth_first_saves f ON f.player=s.player AND f.tenant=s.tenant
  LEFT JOIN staff_events event ON event.id=s.decision_id AND event.tenant_id=s.tenant
  LEFT JOIN staff_accounts staff ON staff.id=event.actor_id`;
const attribution=`s.player AS playerId,partner.name AS partnerName,partner.code AS partnerCode,
  link.name AS linkName,s.source,s.at,s.flag,s.review,s.decision AS reason,s.decided_at AS decidedAt,
  s.decision_id AS decisionId,staff.email AS decidedBy,p.first_verified_at AS verifiedAt,f.at AS savedAt`;

export function createPartnerLinks(db,fail,audit) {
  db.exec(`CREATE TABLE IF NOT EXISTS growth_partner_links (
    id INTEGER PRIMARY KEY,partner INTEGER NOT NULL REFERENCES growth_partners(id),
    name TEXT NOT NULL,slug TEXT NOT NULL,active INTEGER NOT NULL CHECK(active IN (0,1)),
    version INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(partner,slug));
    CREATE TABLE IF NOT EXISTS growth_visit_links (
      visit INTEGER PRIMARY KEY REFERENCES growth_visits(id),link INTEGER NOT NULL REFERENCES growth_partner_links(id));
    CREATE INDEX IF NOT EXISTS growth_named_visits ON growth_visit_links(link,visit);`);
  db.function('referral_fold',{deterministic:true},foldText);
  const partner=db.prepare('SELECT id,code,active FROM growth_partners WHERE id=? AND tenant=?');
  const get=db.prepare('SELECT id,name,slug,active,version FROM growth_partner_links WHERE id=? AND partner=?');
  const bySlug=db.prepare('SELECT id,active FROM growth_partner_links WHERE partner=? AND slug=?');
  const tagged=db.prepare('SELECT link FROM growth_visit_links WHERE visit=?');
  const tag=db.prepare('INSERT INTO growth_visit_links(visit,link) VALUES(?,?)');
  function manage(tenant,actor,request,input) {
    const {partnerId,id,version,name,active}=input;
    if (!Number.isSafeInteger(partnerId)||partnerId<1||!Number.isSafeInteger(version)||version<0||
        typeof name!=='string'||!name.trim()||name.trim().length>80||typeof active!=='boolean'||
        (id!=null&&(!Number.isSafeInteger(id)||id<1))) fail(400,'invalid');
    const owner=partner.get(partnerId,tenant);
    if(!owner)fail(404,'discoveryMissing');
    const old=id==null?null:get.get(id,partnerId);
    if(id!=null&&!old)fail(404,'discoveryMissing');
    if((old?.version||0)!==version)fail(409,'discoveryConflict');
    let key=id;
    if(old) {
      db.prepare('UPDATE growth_partner_links SET name=?,active=?,version=version+1 WHERE id=? AND partner=?').run(name.trim(),Number(active),id,partnerId);
    } else {
      const slug=foldText(name.trim()).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48).replace(/-$/,'');
      if(!slug)fail(400,'referralLinkName');
      if(bySlug.get(partnerId,slug))fail(409,'referralLinkExists');
      key=Number(db.prepare('INSERT INTO growth_partner_links(partner,name,slug,active,version,created_at) VALUES(?,?,?,?,1,?)')
        .run(partnerId,name.trim(),slug,Number(active),Date.now()).lastInsertRowid);
    }
    return {id:key,version:version+1,auditId:audit(tenant,actor,'partner_link_saved','partner-link-'+key,request,
      {recordId:key,revision:version+1,fields:['name','active']})};
  }
  function forPartner(tenant,id) {
    const p=partner.get(id,tenant);
    if(!p)fail(404,'discoveryMissing');
    const links=db.prepare('SELECT id,name,slug,active,version FROM growth_partner_links WHERE partner=? ORDER BY active DESC,id DESC').all(id);
    return {code:p.code,active:Boolean(p.active),links:links.map(row=>({...row,active:Boolean(row.active),path:'/r/'+p.code+'/'+row.slug}))};
  }
  function directory(tenant,params) {
    const filter=params.get('filter')||'all',term=searchText(params,fail);
    if(!['all','active','paused'].includes(filter))fail(400,'invalid');
    const where=['partner.tenant=?'],args=[tenant];
    if(filter!=='all'){where.push('partner.active=?');args.push(Number(filter==='active'));}
    if(term) {
      where.push("instr(referral_fold(partner.name||' '||partner.code||' '||p.email||' player-'||p.id||' partner-'||partner.id),?)>0");
      args.push(term);
    }
    const from='FROM growth_partners partner JOIN players p ON p.id=partner.owner AND p.tenant_id=partner.tenant WHERE '+where.join(' AND ');
    const page=pageInfo(params,db.prepare('SELECT count(*) AS n '+from).get(...args).n,8,fail);
    const items=db.prepare(`SELECT partner.id,partner.name,partner.code,partner.owner,partner.active,p.email,
      (SELECT count(*) FROM growth_partner_links l WHERE l.partner=partner.id) AS linkCount ${from}
      ORDER BY partner.active DESC,partner.name COLLATE NOCASE,partner.id LIMIT ? OFFSET ?`).all(...args,page.size,(page.page-1)*page.size);
    return {...page,items};
  }
  function activeLink(partnerId,slug) {
    const link=bySlug.get(partnerId,slug);
    if(!link?.active)fail(404,'discoveryMissing');
    return link.id;
  }
  function statement(ctx,partnerId,placement,signupRows) {
    const p=partner.get(partnerId,ctx.tenantId);
    if(!p)fail(404,'discoveryMissing');
    const links=db.prepare('SELECT id,name,slug,active FROM growth_partner_links WHERE partner=? AND created_at<=? ORDER BY active DESC,id DESC').all(partnerId,ctx.now);
    const rows=new Map(links.map(row=>[row.id,{id:row.id,name:row.name,active:Boolean(p.active&&row.active),path:'/r/'+p.code+'/'+row.slug,...counts()}]));
    rows.set(0,{id:null,name:null,active:false,path:null,...counts()});
    const visits=db.prepare(`SELECT coalesce(l.id,0) AS bucket,count(*) AS n FROM growth_visits v
      LEFT JOIN growth_visit_links x ON x.visit=v.id LEFT JOIN growth_partner_links l ON l.id=x.link AND l.partner=v.partner
      WHERE v.tenant=? AND v.fixture=? AND v.at>=? AND v.at<? AND v.partner=? AND (? IS NULL OR v.placement=?) GROUP BY bucket`)
      .all(ctx.tenantId,ctx.fixture,ctx.period.start,ctx.period.end,partnerId,placement,placement);
    for(const {bucket,n} of visits)if(rows.has(bucket))rows.get(bucket).visits=n;
    for(const {bucket,signups,verified,qualified,pending} of signupRows) {
      if(rows.has(bucket))Object.assign(rows.get(bucket),{signups,verified,qualified,pending});
    }
    return [...rows.values()];
  }
  function reviews(tenant,params) {
    const filter=params.get('filter')||'pending',term=searchText(params,fail);
    if(!['pending','valid','ineligible','all'].includes(filter))fail(400,'invalid');
    const where=["s.tenant=?","s.flag<>''"],args=[tenant];
    if(filter!=='all'){where.push('s.review=?');args.push(filter);}
    const exact=/^(player-|review-|#)?(\d+)$/.exec(term);
    if(exact) {where.push(exact[1]==='review-'?'s.decision_id=?':'s.player=?');args.push(exact[2]);}
    else if(term){
      where.push("instr(referral_fold(p.email||' '||partner.code||' '||partner.name||' '||coalesce(link.name,'')||' '||s.decision),?)>0");
      args.push(term);
    }
    const from=reviewFrom+' WHERE '+where.join(' AND ');
    const page=pageInfo(params,db.prepare('SELECT count(*) AS n '+from).get(...args).n,8,fail);
    const items=db.prepare(`SELECT ${attribution},p.email ${from}
      ORDER BY (s.review='pending') DESC,coalesce(s.decided_at,s.at) DESC,s.player DESC LIMIT ? OFFSET ?`)
      .all(...args,page.size,(page.page-1)*page.size);
    return {...page,items};
  }
  return {manage,directory,forPartner,activeLink,statement,reviews,
    visitLink:visit=>visit?tagged.get(visit)?.link??null:null,
    tagVisit:(visit,link)=>tag.run(visit,link),
    profile:(tenant,player)=>db.prepare(`SELECT ${attribution} ${reviewFrom} WHERE s.tenant=? AND s.player=?`).get(tenant,player)||null};
}
