import { foldText, searchText, pageInfo, messageHistory } from './message-history.js';

const topics = ['collections','rewards','announcements'];
const channels = ['inbox','email'];
const hour = 3600_000;
export function localSchedule(value,zone,fail) {
  if (typeof value!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) fail(400,'invalid');
  const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const wall=Date.parse(value+'Z');
  if (!Number.isFinite(wall)) fail(400,'invalid');
  const matches=new Set();
  for(const offset of [-36,0,36]) {
    const sample=wall+offset*hour;
    const local=fmt.format(sample).replace(' ','T');
    const candidate=wall-(Date.parse(local+'Z')-sample);
    if(fmt.format(candidate).replace(' ','T')===value) matches.add(candidate);
  }
  if(matches.size!==1) fail(400,'scheduleAmbiguous');
  return [...matches][0];
}
export function createCommunications(db,{fail,transaction,accountBreaks,audit,send,mailEnabled,zoneFor,validDestination}) {
  const q=sql=>db.prepare(sql);
  db.function('contact_fold',{deterministic:true},foldText);
  db.exec(`CREATE TABLE IF NOT EXISTS contact_choices (id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),
    player INTEGER NOT NULL REFERENCES players(id),topic TEXT NOT NULL,channel TEXT NOT NULL,granted INTEGER NOT NULL,
    pause_until INTEGER NOT NULL,created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS latest_contact_choice ON contact_choices(tenant,player,topic,channel,id DESC);
    CREATE TABLE IF NOT EXISTS contact_campaigns (id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),
    version INTEGER NOT NULL,status TEXT NOT NULL,spec TEXT NOT NULL,created_at INTEGER NOT NULL,scheduled_at INTEGER);
    CREATE INDEX IF NOT EXISTS contact_campaign_brand ON contact_campaigns(tenant,id);
    CREATE TABLE IF NOT EXISTS contact_deliveries (id INTEGER PRIMARY KEY,campaign INTEGER NOT NULL REFERENCES contact_campaigns(id),
    player INTEGER NOT NULL REFERENCES players(id),state TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',next_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,read_at INTEGER,UNIQUE(campaign,player));
    CREATE INDEX IF NOT EXISTS contact_due ON contact_deliveries(state,next_at);
    CREATE INDEX IF NOT EXISTS contact_player_inbox ON contact_deliveries(player,state,id DESC)`);
  const latest=q('SELECT granted,pause_until AS pauseUntil,created_at AS createdAt FROM contact_choices WHERE tenant=? AND player=? AND topic=? AND channel=? ORDER BY id DESC LIMIT 1');
  const master=q("SELECT granted,captured_at AS at FROM player_consent_events WHERE tenant_id=? AND player_id=? AND consent_type='marketing_email' ORDER BY id DESC LIMIT 1");
  const denial=q("SELECT max(captured_at) AS at FROM player_consent_events WHERE tenant_id=? AND player_id=? AND consent_type='marketing_email' AND granted=0");
  const append=q('INSERT INTO contact_choices(tenant,player,topic,channel,granted,pause_until,created_at) VALUES(?,?,?,?,?,?,?)');
  function emailState(t,p){
    return {master:master.get(t,p),lastDenial:denial.get(t,p).at??-1};
  }
  function effective(row,channel,email){
    return Boolean(row?.granted && (channel!=='email' || email.master?.granted && row.createdAt>email.lastDenial));
  }
  function choices(t,p) {
    const email=emailState(t,p);
    return topics.flatMap(topic=>channels.map(channel=>{
      const row=latest.get(t,p,topic,channel),granted=effective(row,channel,email);
      return {topic,channel,granted,pauseUntil:granted?row.pauseUntil:0};
    }));
  }
  function setEmailConsent(t,p,granted,now=Date.now()) {
    const previous=master.get(t,p);
    const at=Math.max(now,(previous?.at??0)+1);
    if(Boolean(previous?.granted)!==granted){
      const locale=q('SELECT preferred_locale FROM player_profiles WHERE tenant_id=? AND player_id=?').get(t,p)?.preferred_locale||'en-CA';
      q("INSERT INTO player_consent_events(tenant_id,player_id,consent_type,granted,locale,notice_version,source,captured_at) VALUES(?,?,'marketing_email',?,?,'marketing_email_v1','account_settings',?)").run(t,p,Number(granted),locale,at);
    }
    if(!granted)for(const topic of topics){
      if(latest.get(t,p,topic,'email')?.granted)append.run(t,p,topic,'email',0,0,at);
    }
  }
  function choose(t,p,{topic,channel,granted,pauseUntil=0,pauseOnly=false}) {
    if(!topics.includes(topic)||!channels.includes(channel)||typeof granted!=='boolean'||typeof pauseOnly!=='boolean'||!Number.isSafeInteger(pauseUntil)||pauseUntil<0||pauseUntil>Date.now()+366*24*hour)fail(400,'invalid');
    const old=latest.get(t,p,topic,channel),email=emailState(t,p);
    const current=effective(old,channel,email);
    if(pauseOnly&&!current)fail(409,'contactChanged');
    if(channel==='email' && granted && !email.master?.granted)setEmailConsent(t,p,true);
    const until=granted?pauseUntil:0;
    if(!old || Boolean(old.granted)!==granted || current!==granted || old.pauseUntil!==until){
      const at=Math.max(Date.now(),channel==='email'?email.lastDenial+1:0);
      append.run(t,p,topic,channel,Number(granted),until,at);
    }
    return choices(t,p);
  }
  function checkSpec(s,t) {
    if(!s || !topics.includes(s.topic)||!channels.includes(s.channel)||![s.subjectEn,s.subjectFr,s.textEn,s.textFr].every(v=>typeof v==='string'&&v.trim()&&v.length<=1800) ||
      s.subjectEn.length>120||s.subjectFr.length>120||typeof s.destination!=='string'||s.destination&&!/^\/(?:coming-soon|help)\/[a-z0-9-]{1,64}$/.test(s.destination) ||
      ![s.quietStart,s.quietEnd].every(x=>Number.isInteger(x)&&x>=0&&x<=23)) fail(400,'invalid');
    const audienceLocale=s.audienceLocale??'all';
    if (!['all','en-CA','fr-CA'].includes(audienceLocale)) fail(400,'invalid');
    const zone=zoneFor(t);
    const due=localSchedule(s.localTime,zone,fail);
    return {topic:s.topic,channel:s.channel,audienceLocale,subjectEn:s.subjectEn.trim(),subjectFr:s.subjectFr.trim(),textEn:s.textEn.trim(),textFr:s.textFr.trim(),
      destination:s.destination,quietStart:s.quietStart,quietEnd:s.quietEnd,localTime:s.localTime,zone,due};
  }
  const row=q('SELECT * FROM contact_campaigns WHERE id=? AND tenant=?');
  const localeColumn='coalesce(f.preferred_locale,p.preferred_locale)';
  const subscribers=`FROM contact_choices c JOIN players p ON p.id=c.player AND p.tenant_id=c.tenant
    LEFT JOIN player_profiles f ON f.player_id=c.player AND f.tenant_id=c.tenant
    LEFT JOIN player_safety s ON s.player=p.id
    WHERE c.tenant=? AND c.topic=? AND c.channel=? AND c.granted=1
    AND c.id=(SELECT max(v.id) FROM contact_choices v WHERE v.tenant=c.tenant AND v.player=c.player AND v.topic=c.topic AND v.channel=c.channel)
    AND (?='all' OR ${localeColumn}=?)`;
  function audienceArgs(tenant,spec) {
    const locale=spec.audienceLocale||'all';
    return [tenant,spec.topic,spec.channel,locale,locale];
  }
  function quietHours(spec,now) {
    if (spec.quietStart===spec.quietEnd) return false;
    const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:spec.zone,hour:'2-digit',hourCycle:'h23'}).format(now));
    return spec.quietStart<spec.quietEnd ? h>=spec.quietStart && h<spec.quietEnd : h>=spec.quietStart || h<spec.quietEnd;
  }
  function blocked(member,spec,pref,at,destination) {
    if (!member.email_verified || member.access_status!=='active' || member.excluded_at) return 'accountUnavailable';
    if (accountBreaks.at(member.tenant,member.player,at)) return 'accountBreak';
    if (!effective(pref,spec.channel,spec.channel==='email'?emailState(member.tenant,member.player):null)) return 'optedOut';
    if (spec.audienceLocale && spec.audienceLocale!=='all' && member.locale!==spec.audienceLocale) return 'audienceChanged';
    if (pref.pauseUntil>at) return 'contactPause';
    if (spec.destination && !destination) return 'destinationArchived';
    return '';
  }
  function preview(tenant,input) {
    const spec=checkSpec(input,tenant),at=Math.max(Date.now(),spec.due);
    const destinations=Object.fromEntries(['en-CA','fr-CA'].map(locale=>[locale,spec.destination?validDestination(tenant,spec.destination,locale):null]));
    const quiet=quietHours(spec,at);
    const counts={selected:0,eligible:0,deferred:0,blocked:0},reasons={};
    const members=q(`SELECT p.id AS player,p.tenant_id AS tenant,p.email_verified,p.access_status,s.excluded_at,
      ${localeColumn} AS locale,c.granted,c.created_at AS createdAt,c.pause_until AS pauseUntil ${subscribers}`);
    for (const member of members.iterate(...audienceArgs(tenant,spec))) {
      counts.selected++;
      const reason=blocked(member,spec,member,at,destinations[member.locale])
        || (quiet?'quietHours':spec.channel==='email'&&!mailEnabled?'mailUnavailable':'');
      if (!reason) counts.eligible++;
      else {
        counts[reason==='quietHours'?'deferred':'blocked']++;
        reasons[reason]=(reasons[reason]||0)+1;
      }
    }
    return {counts,reasons,destinations,at,zone:spec.zone};
  }
  function edit(t,actor,request,input) {
    const {action,id,version}=input;
    if(!['save','schedule','cancel'].includes(action)||!Number.isSafeInteger(version)||version<0) fail(400,'invalid');
    const old=id && row.get(id,t);
    if(id && !old) fail(404,'discoveryMissing');
    if((old?.version||0)!==version) fail(409,'discoveryConflict');
    if(!old && action!=='save' || old && (old.status==='cancelled'||old.status==='scheduled'&&action!=='cancel')) fail(409,'campaignLocked');
    const now=Date.now(), spec=action==='save'?checkSpec(input.spec,t):JSON.parse(old.spec);
    if(action==='schedule' && spec.destination && !validDestination(t,spec.destination)) fail(409,'discoveryMissing');
    const key=id||Number(q("INSERT INTO contact_campaigns(tenant,version,status,spec,created_at) VALUES(?,0,'draft',?,?)").run(t,JSON.stringify(spec),now).lastInsertRowid);
    const status={save:'draft',schedule:'scheduled',cancel:'cancelled'}[action];
    q('UPDATE contact_campaigns SET version=?,status=?,spec=?,scheduled_at=? WHERE id=?').run(version+1,status,JSON.stringify(spec),action==='schedule'?now:old?.scheduled_at??null,key);
    if(action==='schedule') q(`INSERT INTO contact_deliveries(campaign,player,state,next_at,updated_at)
      SELECT ?,c.player,'queued',?,? ${subscribers}`).run(key,Math.max(now,spec.due),now,...audienceArgs(t,spec));
    if(action==='cancel') q("UPDATE contact_deliveries SET state='suppressed',reason='cancelled',updated_at=? WHERE campaign=? AND state='queued'").run(now,key);
    const auditId=audit(t,actor,'campaign_'+action,'campaign-'+key,request,{recordId:key,revision:version+1,fields:['campaign']});
    return {id:key,version:version+1,auditId};
  }
  function staff(t) {
    return q('SELECT * FROM contact_campaigns WHERE tenant=? ORDER BY id DESC').all(t).map(c=>({
      id:c.id,version:c.version,status:c.status,spec:JSON.parse(c.spec),outcomes:q('SELECT state,reason,count(*) AS count FROM contact_deliveries WHERE campaign=? GROUP BY state,reason').all(c.id)
    }));
  }
  function campaignPage(tenant,params) {
    const state=params.get('status')||'all',term=searchText(params,fail);
    if (!['all','draft','scheduled','cancelled'].includes(state)) fail(400,'invalid');
    const clauses=['tenant=?'],args=[tenant];
    if (state!=='all') {clauses.push('status=?');args.push(state);}
    if (term) {
      if (/^(?:campaign-|#)?[0-9]+$/.test(term)) {
        clauses.push('id=?');args.push(term.replace(/^(campaign-|#)/,''));
      } else {
        clauses.push("instr(contact_fold(json_extract(spec,'$.subjectEn')||' '||json_extract(spec,'$.subjectFr')),?)>0");
        args.push(term);
      }
    }
    const from='FROM contact_campaigns WHERE '+clauses.join(' AND ');
    const page=pageInfo(params,q('SELECT count(*) AS n '+from).get(...args).n,8,fail);
    const items=q(`SELECT id,status,json_extract(spec,'$.subjectEn') AS subjectEn,json_extract(spec,'$.subjectFr') AS subjectFr,
      json_extract(spec,'$.channel') AS channel,json_extract(spec,'$.localTime') AS localTime,json_extract(spec,'$.zone') AS zone
      ${from} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args,page.size,(page.page-1)*page.size);
    return {...page,items,zone:zoneFor(tenant)};
  }
  function campaignDetail(tenant,id) {
    const c=row.get(id,tenant);
    if (!c) fail(404,'discoveryMissing');
    const spec=JSON.parse(c.spec);
    const outcomes=q(`SELECT state,reason,count(*) AS count,count(read_at) AS opened
      FROM contact_deliveries WHERE campaign=? GROUP BY state,reason ORDER BY state,reason`).all(id);
    return {id,version:c.version,status:c.status,spec,outcomes,
      total:outcomes.reduce((sum,r)=>sum+r.count,0),
      read:spec.channel==='inbox'?outcomes.reduce((sum,r)=>sum+(r.state==='delivered'?r.opened:0),0):null};
  }
  function preferredLocale(tenant,player) {
    return q('SELECT preferred_locale FROM player_profiles WHERE tenant_id=? AND player_id=?').get(tenant,player)?.preferred_locale||'en-CA';
  }
  function inbox(t,p,limit=50,uiLocale) {
    const locale=uiLocale||preferredLocale(t,p);
    return q(`SELECT d.id,d.updated_at AS deliveredAt,d.read_at AS readAt,c.spec FROM contact_deliveries d JOIN contact_campaigns c ON c.id=d.campaign
      WHERE c.tenant=? AND d.player=? AND d.state='delivered' AND json_extract(c.spec,'$.channel')='inbox' ORDER BY d.id DESC LIMIT ?`).all(t,p,limit)
      .map(({spec,...r})=>{const {subjectEn,subjectFr,textEn,textFr,destination,topic}=JSON.parse(spec);return {...r,subjectEn,subjectFr,textEn,textFr,destination:destination?validDestination(t,destination,locale):null,topic,purpose:'promotion'};});
  }
  function read(t,p,id) {
    if (!Number.isSafeInteger(id) || id<1) fail(400,'invalid');
    const result=q(`UPDATE contact_deliveries SET read_at=coalesce(read_at,?) WHERE id=? AND player=? AND state='delivered'
      AND campaign IN(SELECT id FROM contact_campaigns WHERE tenant=? AND json_extract(spec,'$.channel')='inbox')`).run(Date.now(),id,p,t);
    if(!result.changes) fail(404,'discoveryMissing');
    return {id};
  }
  function reserve(now,tenant) {
    const d=q(`SELECT d.id,d.player,c.tenant,c.spec,c.status,p.email,p.email_verified,p.access_status,s.excluded_at,
      coalesce(f.preferred_locale,p.preferred_locale) AS locale FROM contact_deliveries d JOIN contact_campaigns c ON c.id=d.campaign
      JOIN players p ON p.id=d.player AND p.tenant_id=c.tenant LEFT JOIN player_safety s ON s.player=p.id
      LEFT JOIN player_profiles f ON f.player_id=p.id AND f.tenant_id=c.tenant
      WHERE d.state='queued' AND d.next_at<=? AND (? IS NULL OR c.tenant=?) ORDER BY d.next_at,d.id LIMIT 1`).get(now,tenant,tenant);
    if(!d) return null;
    const spec=JSON.parse(d.spec),pref=latest.get(d.tenant,d.player,spec.topic,spec.channel);
    const destination=spec.destination?validDestination(d.tenant,spec.destination,d.locale):null;
    const reason=d.status!=='scheduled'?'cancelled':blocked(d,spec,pref,now,destination);
    const set=q('UPDATE contact_deliveries SET state=?,reason=?,updated_at=?,next_at=? WHERE id=?');
    if(reason){set.run('suppressed',reason,now,now,d.id);return {};}
    if(quietHours(spec,now)) {
      set.run('queued','quietHours',now,now+60_000,d.id);return {};
    }
    if(spec.channel==='inbox'){set.run('delivered','',now,now,d.id);return {};}
    if(!mailEnabled){set.run('failed','mailUnavailable',now,now,d.id);return {};}
    set.run('sending','',now,now,d.id);
    return {id:d.id,email:d.email,subject:d.locale==='fr-CA'?spec.subjectFr:spec.subjectEn,text:d.locale==='fr-CA'?spec.textFr:spec.textEn,destination,tenant:d.tenant};
  }
  let running=false;
  async function dispatch(now=Date.now(),tenant=null) {
    if(running) return;
    running=true;
    try{
      q("UPDATE contact_deliveries SET state='failed',reason='deliveryUnconfirmed',updated_at=? WHERE state='sending' AND updated_at<? AND (? IS NULL OR campaign IN(SELECT id FROM contact_campaigns WHERE tenant=?))").run(now,now-10*60_000,tenant,tenant);
      for(let i=0;i<100;i++) {
        const d=transaction(()=>reserve(now,tenant));
        if(!d) break;
        if(!d.id) continue;
        let state='delivered',reason='';
        try{await send(d);}catch{state='failed';reason='deliveryUnconfirmed';}
        q("UPDATE contact_deliveries SET state=?,reason=?,updated_at=? WHERE id=? AND state='sending'").run(state,reason,Date.now(),d.id);
        now=Date.now();
      }
    } finally{running=false;}
  }
  return {choices,choose,setEmailConsent,emailEnabled:(t,p)=>Boolean(master.get(t,p)?.granted),edit,staff,preview,campaignPage,campaignDetail,inbox,read,dispatch,
    history:(tenant,player,params,locale)=>messageHistory(db,tenant,player,params,locale||preferredLocale(tenant,player),validDestination,fail)};
}
