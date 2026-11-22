const messages = `SELECT 'message' AS kind,d.id,d.updated_at AS at,d.read_at AS readAt,c.spec,
    'message-'||d.id AS reference,json_extract(c.spec,'$.subjectEn') AS titleEn,json_extract(c.spec,'$.subjectFr') AS titleFr,
    json_extract(c.spec,'$.textEn') AS bodyEn,json_extract(c.spec,'$.textFr') AS bodyFr
  FROM contact_deliveries d JOIN contact_campaigns c ON c.id=d.campaign
  WHERE c.tenant=? AND d.player=? AND d.state='delivered' AND json_extract(c.spec,'$.channel')='inbox'`;
const receipts = `SELECT 'receipt' AS kind,c.id,c.claimed_at AS at,NULL AS readAt,v.spec,
    'claim-'||c.id AS reference,json_extract(v.spec,'$.itemEn') AS titleEn,json_extract(v.spec,'$.itemFr') AS titleFr,
    json_extract(v.spec,'$.titleEn') AS bodyEn,json_extract(v.spec,'$.titleFr') AS bodyFr
  FROM cosmetic_claims c JOIN cosmetic_grants g ON g.id=c.grant_id
  JOIN discovery_programs p ON p.id=g.program JOIN discovery_versions v ON v.program=g.program AND v.version=g.version
  WHERE p.tenant_id=? AND g.player=?`;

export const foldText = value => String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export function searchText(params,fail) {
  const q=params.get('q')?.trim()||'';
  if (q.length>160) fail(400,'invalid');
  return foldText(q);
}
export function pageInfo(params,total,size,fail) {
  const raw=params.get('page')??'1', requested=Number(raw);
  if (!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(requested)) fail(400,'invalid');
  const pages=Math.max(1,Math.ceil(total/size));
  return {page:Math.min(requested,pages),pages,size,total};
}

export function messageHistory(db,tenant,player,params,locale,resolveDestination,fail) {
  const kind=params.get('filter')||'all';
  if (!['all','unread','messages','receipts'].includes(kind)) fail(400,'invalid');
  const term=searchText(params,fail);
  const args=[tenant,player];
  let source=kind==='receipts'?receipts:messages;
  if (kind==='all') { source+=' UNION ALL '+receipts;args.push(tenant,player); }
  const where=[kind==='unread'?'readAt IS NULL':'1'];
  if (term) {
    if (/^(claim|message)-\d+$/.test(term)) {
      where.push('reference=?');args.push(term);
    } else {
      where.push("instr(contact_fold(reference||' '||titleEn||' '||titleFr||' '||bodyEn||' '||bodyFr),?)>0");
      args.push(term);
    }
  }
  const from=`FROM (${source}) WHERE ${where.join(' AND ')}`;
  const page=pageInfo(params,db.prepare('SELECT count(*) AS n '+from).get(...args).n,6,fail);
  const rows=db.prepare(`SELECT kind,id,reference,at,readAt,spec ${from} ORDER BY at DESC,kind,id DESC LIMIT ? OFFSET ?`)
    .all(...args,page.size,(page.page-1)*page.size);
  const items=rows.map(({spec:raw,...row})=>{
    const spec=JSON.parse(raw);
    if (row.kind==='receipt') {
      const {itemEn,itemFr,titleEn,titleFr,slot,color,rewardCollectionEn,rewardCollectionFr}=spec;
      return {...row,itemEn,itemFr,titleEn,titleFr,slot,color,rewardCollectionEn,rewardCollectionFr};
    }
    const {subjectEn,subjectFr,textEn,textFr,topic,destination}=spec;
    return {...row,subjectEn,subjectFr,textEn,textFr,topic,destination:destination?resolveDestination(tenant,destination,locale):null};
  });
  const unread=db.prepare(`SELECT count(*) AS n FROM (${messages}) WHERE readAt IS NULL`).get(tenant,player).n;
  return {...page,unread,items};
}
