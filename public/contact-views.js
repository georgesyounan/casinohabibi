export function createContactList(root,{ui,t,load,draw,searchLabel,filterLabel,filters,state,empty,summary,initial}) {
  const {el,l,field,button}=ui;
  const form=el('form','','discovery-filters contact-filters');
  const search=field(form,'q',searchLabel,{type:'search',maxLength:160,value:state.q});
  const select=field(form,'filter',filterLabel,{items:filters,value:state.filter});
  const status=el('p','','discovery-feedback');
  status.setAttribute('role','status');
  const list=el('div','','contact-list'),nav=el('div','','case-pager');
  const current=el('span');
  const prev=button(l('Previous','Précédent'),()=>{state.page--;void refresh();},true);
  const next=button(l('Next','Suivant'),()=>{state.page++;void refresh();},true);
  nav.append(prev,current,next);nav.hidden=true;
  root.replaceChildren(form,status,list,nav);
  let serial=0,timer;
  async function refresh(first) {
    clearTimeout(timer);
    const request=++serial;
    const params=new URLSearchParams({q:state.q,filter:state.filter,page:String(state.page)});
    status.textContent=t('loading');
    prev.disabled=true;next.disabled=true;
    try {
      const result=first||await load(params);
      if(request!==serial||!list.isConnected)return;
      state.page=result.page;
      status.textContent=summary(result);
      list.replaceChildren(...result.items.map(item=>draw(item,refresh)));
      if (!result.total) list.append(el('p',empty));
      current.textContent=result.page+' / '+result.pages;
      nav.hidden=result.pages<2;
      prev.disabled=result.page===1;next.disabled=result.page===result.pages;
    } catch(e) {
      if(request!==serial||!list.isConnected)return;
      status.textContent=t(e.message);
      list.replaceChildren(button(l('Try again','Réessayer'),()=>refresh(),true));
      nav.hidden=true;
    }
  }
  function change(delay=0) {
    ++serial;clearTimeout(timer);
    state.page=1;state.q=search.value.trim();state.filter=select.value;
    if(delay)timer=setTimeout(()=>{if(list.isConnected)void refresh();},delay);
    else void refresh();
  }
  form.addEventListener('submit',e=>{e.preventDefault();change();});
  search.addEventListener('input',()=>change(170));
  select.addEventListener('change',()=>change());
  void refresh(initial);
}

export function campaignLanguage(locale,l) {
  if (locale==='en-CA') return l('English','Anglais');
  if (locale==='fr-CA') return l('French','Français');
  return l('English and French','Français et anglais');
}
export function campaignLabels(l) {
  return {
    draft:l('Draft','Brouillon'),scheduled:l('Scheduled','Planifiée'),cancelled:l('Cancelled','Annulée'),
    delivered:l('Delivered','Livrés'),queued:l('Queued','En attente'),sending:l('Sending','En cours'),
    suppressed:l('Suppressed','Envois bloqués'),failed:l('Failed','Échecs'),
    quietHours:l('Quiet hours','Heures silencieuses'),accountBreak:l('Account break','Pause de compte'),
    optedOut:l('Opted out','Désabonnement'),contactPause:l('Topic paused','Sujet en pause'),
    accountUnavailable:l('Account unavailable','Compte indisponible'),destinationArchived:l('Destination unavailable','Destination indisponible'),
    mailUnavailable:l('Email unavailable','Courriel indisponible'),deliveryUnconfirmed:l('Delivery unconfirmed','Livraison non confirmée'),
    audienceChanged:l('Language changed','Langue modifiée')
  };
}

export function audiencePreview(form,{api,t,ui,values,appPath}) {
  const {el,l,button}=ui;
  const box=el('section','','discovery-card contact-preview');
  const status=el('div');status.setAttribute('role','status');
  const caption=l('Estimate audience','Estimer l’audience');
  let request=0;
  const estimate=button(caption,async()=>{
    if (!form.reportValidity())return;
    const serial=++request;
    estimate.disabled=true;status.textContent=t('loading');
    try {
      const r=await api('admin/discovery/campaign-preview',{spec:values()});
      if (serial!==request||!box.isConnected)return;
      const {selected,eligible,deferred,blocked}=r.counts;
      const numbers=el('dl','','contact-counts');
      for (const [label,n] of [[l('Subscribed accounts','Comptes abonnés'),selected],[l('Eligible','Admissibles'),eligible],
        [l('Deferred','Reportés'),deferred],[l('Blocked','Bloqués'),blocked]]) numbers.append(el('dt',label),el('dd',String(n)));
      const labels=campaignLabels(l);
      status.replaceChildren(numbers);
      for (const [reason,n] of Object.entries(r.reasons)) status.append(el('p',labels[reason]+' · '+n));
      if(values().destination)for (const [locale,href] of Object.entries(r.destinations)) {
        const label=campaignLanguage(locale,l);
        if(href){
          const link=el('a',l('Preview destination','Voir la destination')+' · '+label,'discovery-link');
          link.href=appPath(href);link.target='_blank';link.rel='noopener';status.append(link);
        } else status.append(el('p',label+' · '+labels.destinationArchived));
      }
      const when=new Intl.DateTimeFormat(l('en-CA','fr-CA'),{timeZone:r.zone,dateStyle:'medium',timeStyle:'short'}).format(r.at);
      status.append(el('small',l('Estimate for ','Estimation pour le ')+when+' · '+r.zone+'. '+l('Consent is checked again at delivery.','Le consentement est revérifié au moment de l’envoi.')));
    } catch(e) { if(serial===request&&box.isConnected)status.textContent=t(e.message); }
    finally {if(serial===request)estimate.disabled=false;}
  },true);
  form.addEventListener('input',()=>{++request;estimate.disabled=false;status.replaceChildren();});
  box.append(estimate,status);form.append(box);
}

export function campaignResults(row,ui) {
  const {el,l}=ui,labels=campaignLabels(l);
  const card=el('section','','discovery-card contact-results');
  card.append(el('h4',l('Delivery results','Résultats des envois')),el('p',l('Recipients','Destinataires')+' · '+row.total));
  for (const line of row.outcomes) {
    const label=labels[line.state]||line.state;
    card.append(el('p',[label,line.reason?labels[line.reason]||line.reason:null,line.count].filter(x=>x!==null).join(' · ')));
  }
  if(row.read!==null) card.append(el('p',l('Marked as read','Marqués comme lus')+' · '+row.read));
  return card;
}
