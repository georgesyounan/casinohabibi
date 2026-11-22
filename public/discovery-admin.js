import { uiKit } from './discovery.js';
const templates=['offer','Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09'];
const toLocal=t=>{if(!t)return '';const d=new Date(t);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function createDiscoveryAdmin({api,t,french,publish,openPlayer}) {
  const {l,el,button,field,pages,date,local}=uiKit(french);
  let generation=0;
  async function load(kind){
    const gen=++generation, root=document.getElementById('engagement-'+kind+'-body');
    if(!root)return;
    const status=el('p','','discovery-feedback');status.setAttribute('role','status');
    const body=el('div');root.replaceChildren(status,body);
    const error=e=>{status.textContent=t(e.message);};
    try{
      if(kind==='report'){await report();return;}
      const result=await api('admin/discovery/'+kind+(kind==='programs'?'?withCatalogue=1':''),undefined,'GET');
      if(gen!==generation)return;
      const isProgram=kind==='programs';
      const items=result.items;
      if(isProgram&&result.previewCount<3&&result.threeSaveQuest){
        const note=el('aside','','discovery-card');
        note.append(el('p',result.enabled?l(`${result.previewCount} of 3 previews are available for the three-save quest.`,`${result.previewCount} ${result.previewCount>1?'fiches disponibles':'fiche disponible'} sur 3 pour la quête des favoris.`):
          l('Enable Coming Soon in the lobby to make catalogue quests available.','Activez la section À venir dans le hall pour rendre les quêtes du catalogue accessibles.')));
        const a=el('a',result.enabled?l('Manage Coming Soon previews','Gérer les fiches à venir'):l('Edit lobby settings','Modifier les paramètres du hall'),'discovery-link');
        a.href=result.enabled?'#coming-soon-admin':'#website-lobby';note.append(a);body.append(note);
      }
      const list=el('div'),editor=el('div');body.append(button(isProgram?l('New quest or offer','Créer une quête ou une offre'):l('New campaign','Créer une campagne'),()=>edit(null)),list,editor);
      if(!isProgram && publish())body.prepend(button(l('Process due deliveries','Traiter les envois dus'),async()=>{
        try{await api('admin/discovery/dispatch',{});await load(kind);}catch(e){error(e);}
      },true));
      let busy=false;
      async function editAction(row,action,spec){
        if(busy)return;busy=true;
        try{
          await api('admin/discovery/'+kind,{id:row?.id,version:row?.version||0,action,...(spec&&{spec})});
          await load(kind);
        }catch(e){error(e);}finally{busy=false;}
      }
      function edit(row){
        editor.replaceChildren();list.hidden=true;
        const form=el('form','','discovery-editor'),s=row?.spec||{};
        const head=el('h3',row?local(s,isProgram?'title':'subject'):isProgram?l('New programme','Nouveau programme'):l('Draft campaign','Brouillon de campagne'));
        head.tabIndex=-1;editor.append(head,button(l('Back to list','Retour à la liste'),()=>{editor.replaceChildren();list.hidden=false;},true),form);head.focus();
        const controls={};
        const input=(key,label,options={})=>controls[key]=field(form,key,label,{value:s[key],...options});
        const labels=items=>items.map(([k,en,fr])=>[k,l(en,fr)]);
        if(isProgram){
          const templateLabels=[l('Free offer','Offre gratuite'),'Lobby Curator','Backstage Pass','Catalogue Guide','Preview Passport','Community Curator','Seasonal Collector','Collection Crew','Activity Explorer','Double Feature'];
          input('template',l('Quest template','Modèle de quête'),{items:templates.map((k,i)=>[k,(i?k+' · ':'')+templateLabels[i]]),value:s.template||'Q01'});
          input('titleEn',l('English title','Titre anglais'),{required:true,maxLength:100});input('titleFr',l('French title','Titre français'),{required:true,maxLength:100});
          input('slot',l('Cosmetic type','Type d’article'),{items:labels([['badge','Badge','Badge'],['theme','Theme','Thème'],['frame','Frame','Cadre']]),value:s.slot||'badge'});
          input('itemEn',l('English reward name','Récompense en anglais'),{required:true,maxLength:100});input('itemFr',l('French reward name','Récompense en français'),{required:true,maxLength:100});
          input('color',l('Colour','Couleur'),{items:labels([['gold','Gold','Or'],['forest','Forest','Forêt'],['ocean','Ocean','Océan'],['plum','Plum','Prune']]),value:s.color||'gold'});
          input('collection',l('Collection names (separate two with |)','Collections (séparez deux noms par |)'),{maxLength:120});
          input('target',l('Guide address','Adresse du guide'),{maxLength:64});
          input('pair',l('Two catalogue IDs, separated by a comma','Deux numéros de fiches, séparés par une virgule'),{value:s.pair?.join(', ')||''});
          function requirements(){
            const v=controls.template.value;
            for(const [key,show] of [['collection',['Q02','Q06'].includes(v)],['target',['Q02','Q03','Q06'].includes(v)],['pair',v==='Q09']]){
              controls[key].closest('label').hidden=!show;controls[key].required=show;
            }
          }
          controls.template.addEventListener('change',requirements);requirements();
          for(const [key,en,fr] of [['startsAt','Opens (local time)','Ouverture (heure locale)'],['endsAt','Participation deadline','Fin de participation'],['claimUntil','Claim deadline','Fin des réclamations']])input(key,l(en,fr),{type:'datetime-local',value:toLocal(s[key])});
          input('stock',l('Total stock (blank for unlimited)','Stock total (vide pour illimité)'),{type:'number',min:1,max:1000000});
        }else{
          input('topic',l('Topic','Sujet'),{items:labels([['collections','Collections','Collections'],['rewards','Rewards','Récompenses'],['announcements','Site news','Nouvelles du site']]),value:s.topic||'collections'});
          input('channel',l('Channel','Canal'),{items:labels([['inbox','Site inbox','Messagerie du site'],['email','Email','Courriel']]),value:s.channel||'inbox'});
          for(const [key,en,fr,multi] of [['subjectEn','English subject','Objet en anglais'],['subjectFr','French subject','Objet en français'],['textEn','English message','Message en anglais',true],['textFr','French message','Message en français',true]])
            input(key,l(en,fr),{multiline:multi,required:true,maxLength:multi?1800:120});
          input('destination',l('Published destination (optional)','Destination publiée (facultative)'),{placeholder:'/coming-soon/…'});
          input('localTime',l('Scheduled time','Envoi prévu')+' · '+result.zone,{type:'datetime-local',required:true});
          input('quietStart',l('Quiet hours start (0–23)','Début des heures silencieuses (0–23)'),{type:'number',min:0,max:23,required:true,value:s.quietStart??22});
          input('quietEnd',l('Quiet hours end (0–23)','Fin des heures silencieuses (0–23)'),{type:'number',min:0,max:23,required:true,value:s.quietEnd??8});
        }
        function values(){
          const v=Object.fromEntries(new FormData(form));
          if(!isProgram)return {...v,quietStart:Number(v.quietStart),quietEnd:Number(v.quietEnd)};
          for(const k of ['startsAt','endsAt','claimUntil'])v[k]=v[k]?new Date(v[k]).getTime():k==='startsAt'?0:null;
          v.stock=v.stock?Number(v.stock):null;v.pair=v.template==='Q09'?v.pair.split(',').map(x=>Number(x.trim())):[];
          return v;
        }
        const preview=el('details','', 'admin-disclosure'),summary=el('summary',l('Preview','Aperçu')),sample=el('div');
        preview.append(summary,sample);form.append(preview);
        function previewNow(){const v=values();sample.replaceChildren(el('h4',local(v,isProgram?'title':'subject')),el('p',local(v,isProgram?'item':'text'),isProgram?'cosmetic cosmetic-'+v.color:''));}
        preview.addEventListener('toggle',previewNow);form.addEventListener('input',previewNow);
        const enabled=isProgram||!row||row.status==='draft';
        if(enabled){const save=el('button',l('Save draft','Enregistrer le brouillon'));save.type='submit';form.append(save);}
        else for(const c of Object.values(controls))c.disabled=true;
        form.addEventListener('submit',e=>{e.preventDefault();if(enabled)void editAction(row,'save',values());});
        if(row&&publish()){
          const actions=el('div','','discovery-actions');editor.append(actions);
          if(isProgram || row.status==='draft')actions.append(button(isProgram?l('Publish saved version','Publier la version enregistrée'):l('Schedule saved campaign','Planifier la campagne enregistrée'),()=>{
            if(!form.checkValidity())return form.reportValidity();
            if(JSON.stringify(values())!==original){status.textContent=l('Save your edits first.','Enregistrez les modifications avant de publier.');return;}
            if(window.confirm(isProgram?l('Publish this version?','Publier cette version?'):l('Schedule delivery to opted-in accounts?','Planifier l’envoi aux comptes abonnés?')))editAction(row,isProgram?'publish':'schedule');
          }));
          if((isProgram&&row.live&&!row.archived)||(!isProgram&&row.status==='scheduled'))actions.append(button(isProgram?l('Archive','Archiver'):l('Cancel campaign','Annuler la campagne'),()=>{if(window.confirm(l('Confirm this change?','Confirmer cette modification?')))editAction(row,isProgram?'archive':'cancel');},true));
        }
        const original=JSON.stringify(values());
      }
      const statuses={draft:l('Draft','Brouillon'),scheduled:l('Scheduled','Planifiée'),cancelled:l('Cancelled','Annulée'),queued:l('Queued','En attente'),suppressed:l('Suppressed','Envoi bloqué'),delivered:l('Delivered','Livrée'),failed:l('Failed','Échec'),sending:l('Sending','En cours')};
      const reasons={quietHours:l('quiet hours','heures silencieuses'),accountBreak:l('account break','pause de compte'),optedOut:l('opted out','désabonnement'),contactPause:l('topic paused','sujet en pause'),mailUnavailable:l('mail unavailable','courriel indisponible'),deliveryUnconfirmed:l('delivery unconfirmed','livraison non confirmée'),destinationArchived:l('destination unavailable','destination indisponible'),accountUnavailable:l('account unavailable','compte indisponible'),cancelled:l('cancelled','annulé')};
      pages(list,items,row=>{
        const n=el('article','','discovery-card');n.append(button(local(row.spec,isProgram?'title':'subject'),()=>edit(row),true));
        n.append(el('small',isProgram?(row.archived?l('Archived','Archivée'):row.live?(row.version===row.live?l('Published','Publiée'):l('Unpublished changes','Modifications en brouillon')):statuses.draft):statuses[row.status]));
        if(!isProgram){
          n.append(el('small',row.spec.localTime.replace('T',' ')+' · '+row.spec.zone));
          for(const r of row.outcomes)n.append(el('small',`${statuses[r.state]||r.state} · ${r.count}${r.reason?' · '+(reasons[r.reason]||r.reason):''}`));
        }
        return n;
      },l('No drafts or published items.','Aucune publication ou brouillon.'));
    }catch(e){if(gen===generation)error(e);}
    async function report(){
      const form=el('form','','discovery-filters');body.append(form);
      const period=field(form,'days',l('Period','Période'),{items:[7,30,90].map(x=>[x,x+l(' days',' jours')]),value:30});
      const scope=field(form,'scope',l('Data','Données'),{items:[['site',l('Site','Site')],['test',l('Test accounts','Comptes de test')]]});
      const cases=field(form,'caseStatus',l('Case status','État des demandes'),{items:[['all',l('All','Tous')],['open',l('Open','Ouvertes')],['answered',l('Answered','Répondues')],['closed',l('Closed','Fermées')]]});
      const area=el('div'),metricNames={claims:l('Claims','Réclamations'),grants:l('Grants','Droits attribués'),expired:l('Expired grants','Droits expirés'),cases:l('Support cases','Demandes de soutien')};body.append(area);
      let metric='claims',request=0;
      async function show(before){
        const seq=++request, p=new URLSearchParams({days:period.value,scope:scope.value,caseStatus:cases.value,metric});
        if(before)p.set('before',before);
        try{
          const r=await api('admin/discovery/report?'+p,undefined,'GET');if(seq!==request||gen!==generation)return;
          area.replaceChildren();const nav=el('div','','discovery-tabs');
          for(const [k,v] of Object.entries(r.totals))nav.append(button(metricNames[k]+' · '+v,()=>{metric=k;void show();},metric!==k));
          area.append(nav,el('small',r.period.from+' — '+r.period.to+' · '+r.period.zone));
          area.append(el('p',l('Currently open cases','Demandes ouvertes actuellement')+' · '+r.currentOpen));
          for(const row of r.list){const n=el('article','','discovery-line');n.append(button(row.reference,()=>openPlayer('player-'+row.playerId),true),el('small',date(row.at)));area.append(n);}
          if(!r.list.length)area.append(el('p',l('No records in this period.','Aucun dossier pour cette période.')));
          if(r.next)area.append(button(l('Next','Suivant'),()=>show(r.next),true));
          if(before)area.append(button(l('First page','Première page'),()=>show(),true));
        }catch(e){error(e);}
      }
      form.addEventListener('change',()=>show());form.addEventListener('submit',e=>e.preventDefault());await show();
    }
  }
  return {load};
}
