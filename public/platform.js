const app=document.getElementById('platform'),message=document.getElementById('feedback'),language=document.getElementById('language');
let token='',tenant='',generation=0;language.value=new URL(location.href).searchParams.get('lang')==='en'?'en':'fr';
const tx=(en,fr)=>language.value==='fr'?fr:en;
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function field(box,title,options){
  const wrap=el('label',title),c=el(Array.isArray(options)?'select':'input');if(Array.isArray(options))for(const [v,label] of options){const o=el('option',label);o.value=v;c.append(o);}
  else{c.type=options||'text';c.autocomplete='off';c.required=true;}
  wrap.append(c);box.append(wrap);return c;
}
async function request(path,data){
  const r=await fetch('./api/platform/'+path,{method:data?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,...(data&&{'Content-Type':'application/json'})},...(data&&{body:JSON.stringify(data)})});
  const value=await r.json();if(!r.ok)throw Error(value.error);return value;
}
function task(form,label,f){
  const go=el('button',label);go.type='submit';form.append(go);
  form.onsubmit=async e=>{e.preventDefault();if(go.disabled)return;go.disabled=true;message.textContent='';try{await f();}catch(err){message.textContent=err.message;}finally{go.disabled=false;}};
}
async function show(){
  const sequence=++generation;document.documentElement.lang=language.value;document.querySelector('h1').textContent=tx('Partner platform','Plateforme partenaires');app.replaceChildren();message.textContent='';
  if(!token){const f=el('form'),key=field(f,tx('Platform administrator token','Jeton administrateur de la plateforme'),'password');app.append(f);task(f,tx('Open platform','Ouvrir la plateforme'),async()=>{token=key.value;try{await request('tenants');await show();}catch(err){token='';throw err;}});return;}
  const brands=await request('tenants');if(sequence!==generation)return;
  const quit=el('button',tx('Sign out','Fermer la session'));quit.onclick=()=>{token='';tenant='';void show();};app.append(quit);
  const picker=field(app,tx('Partner','Partenaire'),[['',tx('Choose a partner','Choisir un partenaire')],...brands.map(b=>[b.id,b.name])]);picker.value=tenant;picker.onchange=()=>{tenant=picker.value;void show();};
  if(!tenant){const create=el('form');app.append(create);create.append(el('h2',tx('New partner','Nouveau partenaire')));
    const name=field(create,tx('Company or demo name','Nom de l’entreprise ou de la démo')),slug=field(create,tx('Permanent identifier','Identifiant permanent')),kind=field(create,tx('Type','Type'),[['demo',tx('Demo','Démo')],['company',tx('Company','Entreprise')]]);
    const locales=field(create,tx('Languages, default first','Langues, langue principale en premier'));locales.value='en-CA, es';
    const currencies=field(create,tx('Display currencies, default first','Devises d’affichage, principale en premier'));currencies.value='TST';
    const zone=field(create,tx('Reporting time zone','Fuseau des rapports'));zone.value='UTC';
    task(create,tx('Create partner','Créer le partenaire'),async()=>{const result=await request('tenants',{name:name.value,slug:slug.value,kind:kind.value,locales:locales.value.split(',').map(s=>s.trim()),currencies:currencies.value.split(',').map(s=>s.trim()),zone:zone.value});tenant=result.id||result.tenantId;await show();});return;
  }
  const selected=tenant,data=await request('tenants/workspace?tenant='+encodeURIComponent(selected));if(sequence!==generation)return;
  const profile=el('section');profile.append(el('h2',brands.find(b=>b.id===selected)?.name),el('p',[data.settings.locales.join(', '),data.settings.currencies.join(', '),data.settings.zone].join(' · ')));app.append(profile);
  const search=field(profile,tx('Search this partner','Chercher dans ce partenaire')),results=el('div');profile.append(results);
  function activity(d){results.replaceChildren(...[...d.alerts.map(a=>tx('DNS pending','DNS en attente')+' · '+a.host),...d.recent.map(a=>a.action+' · '+a.target)].map(x=>el('p',x)));}
  activity(data);let n=0;search.required=false;search.oninput=async()=>{const count=++n;try{const d=await request('tenants/workspace?tenant='+encodeURIComponent(selected)+'&q='+encodeURIComponent(search.value));if(count===n&&tenant===selected)activity(d);}catch(err){message.textContent=err.message;}};
  const form=el('form'),host=field(form,tx('Hostname','Nom d’hôte'));app.append(form);
  task(form,tx('Reserve hostname','Réserver le nom d’hôte'),async()=>{const r=await request('domains',{tenantId:selected,host:host.value});await show();message.textContent=r.txtName+' = '+r.txtValue;});
  for(const d of data.domains){const f=el('form');f.append(el('h3',d.host));app.append(f);
    if(!d.verified){const verify=el('button',tx('Check DNS','Vérifier le DNS'));verify.type='button';verify.onclick=async()=>{try{await request('domains/verify',{host:d.host});await show();}catch(err){message.textContent=err.message;}};f.append(verify);}
    const theme=field(f,tx('Theme','Thème'),data.templates.map(v=>[v.key,v.key+' · v'+v.version]));
    const record=data.sites.find(s=>s.host===d.host);if(record){theme.value=record.template;theme.disabled=true;f.append(el('p',record.status));}
    const swatch=el('progress');swatch.className='template-swatch';swatch.max=1;swatch.value=1;
    const preview=()=>{swatch.style.accentColor=data.templates.find(v=>v.key===theme.value).accent;};theme.onchange=preview;preview();f.append(swatch);
    task(f,tx('Launch or resume','Lancer ou reprendre'),async()=>{await request('tenants/launch',{tenant:selected,host:d.host,template:theme.value});await show();});
  }
}
language.onchange=()=>void show().catch(err=>{message.textContent=err.message;});void show();
