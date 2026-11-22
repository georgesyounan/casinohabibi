export function engagementReport(db, ctx, params, fail) {
  const {tenantId,fixture,period,scope}=ctx;
  const {start,end}=period;
  const status=params.get('caseStatus') || 'all';
  if(!['all','open','answered','closed'].includes(status)) fail(400,'invalid');
  const grantFrom=`FROM cosmetic_grants g JOIN discovery_programs d ON d.id=g.program
    JOIN players p ON p.id=g.player AND p.tenant_id=d.tenant_id
    JOIN discovery_versions v ON v.program=g.program AND v.version=g.version LEFT JOIN cosmetic_claims c ON c.grant_id=g.id`;
  const grants=`${grantFrom} WHERE d.tenant_id=? AND p.report_fixture=?`;
  const cases=`FROM support_tickets t JOIN players p ON p.id=t.player_id AND p.tenant_id=t.tenant_id
    LEFT JOIN support_case_links l ON l.ticket=t.id WHERE t.tenant_id=? AND p.report_fixture=? AND t.created_at>=? AND t.created_at<?`;
  const base=[tenantId,fixture], range=[...base,start,end];
  const whereCase=status==='all'?'':' AND t.status=?', caseArgs=status==='all'?range:[...range,status];
  const metrics={
    grants:[`SELECT g.id AS id,g.player AS playerId,g.granted_at AS at,'grant-' || g.id AS reference ${grants} AND g.granted_at>=? AND g.granted_at<?`,range],
    claims:[`SELECT c.id AS id,g.player AS playerId,c.claimed_at AS at,'claim-' || c.id AS reference ${grants} AND c.claimed_at>=? AND c.claimed_at<?`,range],
    expired:[`SELECT g.id AS id,g.player AS playerId,json_extract(v.spec,'$.claimUntil') AS at,'grant-' || g.id AS reference ${grants}
      AND (c.id IS NULL OR c.claimed_at>=?) AND json_extract(v.spec,'$.claimUntil')>=? AND json_extract(v.spec,'$.claimUntil')<?`,[...base,end,start,end]],
    cases:[`SELECT t.id AS id,t.player_id AS playerId,t.created_at AS at,coalesce(l.reference,'case-'||t.id) AS reference,t.status ${cases}${whereCase}`,caseArgs]
  };
  const totals=Object.fromEntries(Object.entries(metrics).map(([k,[sql,args]])=>[k,db.prepare('SELECT count(*) AS n FROM ('+sql+')').get(...args).n]));
  const metric=params.get('metric')||'claims';
  if(!Object.hasOwn(metrics,metric)) fail(400,'invalid');
  const before=Number(params.get('before')||Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(before)||before<=0) fail(400,'invalid');
  const [sql,args]=metrics[metric], list=db.prepare('SELECT * FROM ('+sql+') WHERE id<? ORDER BY id DESC LIMIT 9').all(...args,before);
  const more=list.length>8;if(more)list.pop();
  const currentOpen=db.prepare(`SELECT count(*) AS n FROM support_tickets t JOIN players p ON p.id=t.player_id
    WHERE t.tenant_id=? AND p.tenant_id=t.tenant_id AND p.report_fixture=? AND t.status='open'`).get(...base).n;
  return {period,scope,metric,totals,currentOpen,asOf:ctx.now,list,next:more?list.at(-1).id:null};
}
