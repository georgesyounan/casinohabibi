import {randomUUID} from 'node:crypto';
const templates=[{key:'ocean',version:1,accent:'#76c4ff'},{key:'midnight',version:1,accent:'#96adff'}];
export function createPartnerSites(db,{fail}){
  const q=sql=>db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS partner_defaults(tenant TEXT PRIMARY KEY REFERENCES tenants(id),kind TEXT NOT NULL,locales TEXT NOT NULL,currencies TEXT NOT NULL,zone TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS partner_site_launches(id TEXT PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),host TEXT NOT NULL UNIQUE,template TEXT NOT NULL,version INTEGER NOT NULL,
    status TEXT NOT NULL,started INTEGER NOT NULL,finished INTEGER);`);
  function settings(input){
    const kind=input.kind||'demo',locales=input.locales??['en-CA','fr-CA'],currencies=input.currencies??['TST'],zone=input.zone||'UTC';
    if(!['demo','company'].includes(kind)||!Array.isArray(locales)||!locales.length||locales.length>6||new Set(locales).size!==locales.length||locales.some(l=>!['en-CA','fr-CA','es','es-MX'].includes(l))||
      !Array.isArray(currencies)||!currencies.length||currencies.length>8||new Set(currencies).size!==currencies.length||currencies.some(c=>!['TST','CAD','USD','MXN','EUR'].includes(c))||typeof zone!=='string'||zone.length>64)fail(400,'invalid');
    try{new Intl.DateTimeFormat('en',{timeZone:zone});}catch{fail(400,'invalid');}
    return {kind,locales,currencies,zone};
  }
  function defaults(t,input){
    const s=settings(input);q('INSERT INTO partner_defaults VALUES(?,?,?,?,?) ON CONFLICT(tenant) DO UPDATE SET kind=excluded.kind,locales=excluded.locales,currencies=excluded.currencies,zone=excluded.zone').run(t,s.kind,JSON.stringify(s.locales),JSON.stringify(s.currencies),s.zone);return s;
  }
  function workspace(t,search=''){
    if(typeof t!=='string'||!q('SELECT 1 FROM tenants WHERE id=?').get(t))fail(404,'tenantUnknown');
    if(typeof search!=='string'||search.length>100)fail(400,'invalid');
    const row=q('SELECT * FROM partner_defaults WHERE tenant=?').get(t);
    const recent=q('SELECT action,target,created_at AS at FROM platform_events WHERE tenant_id=? AND instr(lower(target),lower(?))>0 ORDER BY id DESC LIMIT 50').all(t,search);
    const domains=q('SELECT host,verified FROM tenant_domains WHERE tenant_id=? AND instr(host,lower(?))>0 ORDER BY host').all(t,search);
    return {tenant:t,settings:row?{kind:row.kind,locales:JSON.parse(row.locales),currencies:JSON.parse(row.currencies),zone:row.zone}:settings({}),
      templates,domains,recent,alerts:domains.filter(d=>!d.verified).map(d=>({kind:'dns',host:d.host})),sites:q('SELECT id,host,template,version,status,started,finished FROM partner_site_launches WHERE tenant=? AND instr(host,lower(?))>0 ORDER BY started DESC').all(t,search)};
  }
  function launch(t,input,request,now=Date.now()){
    const host=typeof input.host==='string'?input.host.trim().toLowerCase():'',template=templates.find(r=>r.key===input.template);
    if(!template)fail(400,'invalid');
    const d=q('SELECT verified FROM tenant_domains WHERE host=? AND tenant_id=?').get(host,t);if(!d)fail(409,'domainNotVerified');
    const old=q('SELECT * FROM partner_site_launches WHERE tenant=? AND host=?').get(t,host);
    if(old&&old.template!==template.key)fail(409,'opStale');
    const id=old?.id||randomUUID(),state=d.verified?'published':'awaiting_dns';
    if(!old){q('INSERT INTO partner_site_launches VALUES(?,?,?,?,?,?,?,?)').run(id,t,host,template.key,template.version,state,now,d.verified?now:null);}
    if(d.verified&&old?.status==='awaiting_dns')q("UPDATE partner_site_launches SET status='published',finished=? WHERE id=?").run(now,id);
    if(!old||old.status!==state){
      if(d.verified){const tenant=q('SELECT status FROM tenants WHERE id=?').get(t);if(!['pending','active'].includes(tenant?.status))fail(409,'tenantLifecycle');q("UPDATE tenants SET status='active' WHERE id=? AND status='pending'").run(t);
        const current=q("SELECT config FROM tenant_config_versions WHERE tenant_id=? AND status='published' ORDER BY version DESC LIMIT 1").get(t);
        const config=JSON.parse(current.config);if(config.accentColor!==template.accent){config.accentColor=template.accent;
          const next=q('SELECT max(version)+1 AS v FROM tenant_config_versions WHERE tenant_id=?').get(t).v;
          q("INSERT INTO tenant_config_versions VALUES(?,?,?,'published',?)").run(t,next,JSON.stringify(config),now);}}
      q('INSERT INTO platform_events(tenant_id,action,target,created_at,correlation_id) VALUES(?,?,?,?,?)').run(t,'site_'+state,host,now,request);
    }
    return {id,host,template:template.key,version:template.version,status:state};
  }
  return {settings,defaults,workspace,launch};
}
