import { createContactList } from './contact-views.js';
export const discoveryCopy={
  discovery:['Discovery & rewards','Découverte et récompenses'],discoveryAdmin:['Quests & rewards','Quêtes et récompenses'],
  campaignAdmin:['Communications','Communications'],discoveryReports:['Reward reports','Rapports de récompenses'],
  discoveryMissing:['This record is unavailable.','Cette fiche est indisponible.'],discoveryConflict:['This record changed. Reopen it to use the current version.','Cette fiche a changé. Rouvrez-la pour utiliser la version actuelle.'],
  discoveryPaused:['Your account is on a break.','Votre compte est en pause.'],discoveryClosed:['This quest is outside its participation window.','La période de participation à cette quête est fermée.'],
  discoveryExpired:['The claim deadline has passed.','La date limite est passée.'],discoveryUnowned:['Claim this cosmetic to equip it.','Réclamez cet article pour l’équiper.'],
  questDependencies:['Publish the selected guides, collections and previews before publishing this quest.','Publiez les guides, les collections et les fiches sélectionnés avant de publier la quête.'],
  invalidRewardCollection:['Enter the collection name in both languages.','Entrez le nom de la collection dans les deux langues.'],
  contactChanged:['Your contact preferences changed. Reopen this page to see them.','Vos préférences ont changé. Rouvrez la page pour les consulter.'],
  campaignLocked:['A scheduled campaign can be cancelled. Create a new draft to change its message.','Une campagne planifiée peut être annulée. Créez un brouillon pour modifier le message.'],
  scheduleAmbiguous:['Choose a valid local time outside the daylight-saving transition.','Choisissez une heure locale valide hors du changement d’heure.']
};
export function uiKit(french) {
  const l=(en,fr)=>french()?fr:en;
  const el=(tag,text='',cls='')=>{const n=document.createElement(tag);if(text!=='')n.textContent=text;if(cls)n.className=cls;return n;};
  function button(text,fn,secondary=false){const b=el('button',text,secondary?'ghost':'');b.type='button';b.addEventListener('click',fn);return b;}
  function field(form,name,title,options={}) {
    const label=el('label',title), input=el(options.items?'select':options.multiline?'textarea':'input');
    input.name=name;
    if(options.items)input.setAttribute('aria-label',title);
    if(options.items) for(const [value,text] of options.items){const o=el('option',text);o.value=value;input.append(o);}
    else if(!options.multiline) input.type=options.type||'text';
    if(options.value!=null) input.value=options.value;
    for(const key of ['required','min','max','maxLength','placeholder']) if(options[key]!==undefined) input[key]=options[key];
    label.append(input);form.append(label);return input;
  }
  function pages(root,items,draw,empty,size=6,initialItem=0) {
    let page=Math.max(0,Math.floor(initialItem/size));
    function render(){
      root.replaceChildren();
      for(const item of items.slice(page*size,(page+1)*size)) root.append(draw(item));
      if(!items.length) root.append(el('p',empty,'muted'));
      if(items.length<=size) return;
      const nav=el('div','','discovery-actions');
      const prev=button(l('Previous','Précédent'),()=>{page--;render();},true), next=button(l('Next','Suivant'),()=>{page++;render();},true);
      prev.disabled=page===0;next.disabled=(page+1)*size>=items.length;
      nav.append(prev,el('span',`${page+1} / ${Math.ceil(items.length/size)}`),next);root.append(nav);
    }
    render();
  }
  function tabs(root,names,active,change){
    const nav=el('nav','','discovery-tabs');nav.setAttribute('aria-label',l('Sections','Rubriques'));
    for(const [key,label] of names){const b=button(label,()=>change(key),true);if(key===active)b.setAttribute('aria-current','page');nav.append(b);}
    root.append(nav);
  }
  const date=time=>new Intl.DateTimeFormat(french()?'fr-CA':'en-CA',{dateStyle:'medium',timeStyle:'short'}).format(time);
  const local=(obj,key)=>obj[key+(french()?'Fr':'En')];
  return {l,el,button,field,pages,tabs,date,local};
}
export function createDiscoveryPlayer({api,t,french,appPath,openSupport,extensions={}}) {
  const ui=uiKit(french);
  const {l,el,button,field,pages,tabs,date,local}=ui;
  let profileGroup=null,previewRewards=false,focusClaim=null;
  const inboxState={q:'',filter:'all',page:1};
  let selected='quests',generation=0,activePlayer,focusQuest=Number(new URLSearchParams(location.search).get('quest'));
  const labels=()=>({available:l('Open to join','Inscription ouverte'),enrolled:l('In progress','En cours'),claimable:l('Ready to claim','À réclamer'),
    claimed:l('Claimed','Réclamée'),archived:l('Archived','Archivée'),scheduled:l('Upcoming','À venir'),expired:l('Expired','Expirée'),
    soldOut:l('All items claimed','Stock épuisé'),paused:l('Account break','Compte en pause')});
  const names=()=>({collections:l('Collections','Collections'),rewards:l('Rewards','Récompenses'),announcements:l('Site news','Nouvelles du site')});
  const slots=()=>({badge:l('Badge','Badge'),theme:l('Theme','Thème'),frame:l('Frame','Cadre')});
  const tasks=()=>({Q01:l('Save three different Coming Soon previews.','Ajoutez trois fiches « À venir » différentes à vos favoris.'),
    Q02:l('Read the guide, then save a preview from its collection.','Lisez le guide, puis ajoutez une fiche de sa collection aux favoris.'),
    Q03:l('Acknowledge the guide and open your saved shelf.','Confirmez la lecture du guide et ouvrez vos favoris.'),
    Q04:l('Open three different Coming Soon previews.','Ouvrez trois fiches « À venir » différentes.'),
    Q05:l('Vote on an editorial theme, then view its result.','Votez sur un thème éditorial et consultez le résultat.'),
    Q06:l('Visit both seasonal collections and read their recap.','Visitez les deux collections saisonnières et consultez le bilan.'),
    Q07:l('Join a shared list and contribute a preview.','Rejoignez une liste partagée et ajoutez une fiche.'),
    Q08:l('Open one of your saved activities and acknowledge its reference.','Ouvrez une activité de vos favoris et confirmez sa référence.'),
    Q09:l('Open both previews in the featured pair.','Ouvrez les deux fiches du duo sélectionné.')});
  function cosmetic(s){const n=el('span',local(s,'item'),'cosmetic cosmetic-'+s.color+' cosmetic-'+s.slot);n.title=slots()[s.slot];return n;}
  function switchPlayer(playerId) {
    if(playerId!==activePlayer){
      const params=new URLSearchParams(location.search);
      profileGroup=null;previewRewards=false;focusClaim=null;Object.assign(inboxState,{q:'',filter:'all',page:1});
      selected=params.has('listInvite')?'community':params.get('inbox')==='1'?'inbox':params.get('partner')==='1'?'partner':'quests';
      activePlayer=playerId;
    }
  }
  async function render(root,playerId) {
    switchPlayer(playerId);
    const gen=++generation;
    root.replaceChildren(el('p',l('Loading…','Chargement…')));
    let data;
    try{data=await api('discovery?view=summary&locale='+(french()?'fr-CA':'en-CA'),undefined,'GET');}catch(e){if(gen===generation)root.replaceChildren(el('p',t(e.message)));return;}
    if(gen!==generation||!root.isConnected)return;
    const message=el('p','','discovery-feedback');message.setAttribute('role','status');
    let busy=false;
    async function run(fn,confirmation=''){
      if(busy)return;busy=true;
      try{await fn();await render(root,playerId);if(confirmation&&root.isConnected)root.querySelector('.discovery-feedback').textContent=confirmation;}
      catch(e){message.textContent=t(e.message);}finally{busy=false;}
    }
    function select(k){selected=k;render(root,playerId);}
    const tabNames=[['quests',l('Quests','Quêtes')],['rewards',l('Rewards','Récompenses')],['profile',l('My profile','Mon profil')],['inbox',l('Inbox','Messages')],['preferences',l('Contact preferences','Préférences')]];
    if(extensions.community)tabNames.push(['community',l('Shared lists','Listes partagées')]);
    if(data.partner&&extensions.partner)tabNames.push(['partner',l('Partner portal','Portail partenaire')]);
    if(selected==='partner'&&!data.partner){
      selected='quests';
      message.textContent=l('The partner portal requires an active partner account.','Le portail partenaire nécessite un compte partenaire actif.');
    }
    root.replaceChildren();tabs(root,tabNames,selected,select);root.append(message);
    const body=el('div','','discovery-body');root.append(body);
    if(selected==='partner'&&data.partner){await extensions.partner(body,playerId);return;}
    if(selected==='community'){await extensions.community(body,playerId);return;}
    const link=(label,path)=>{const a=el('a',label,'discovery-link');a.href=appPath(path);
      if(a.hash)a.addEventListener('click',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey)a.closest('dialog')?.close();});return a;};
    const post=(p,x)=>api('discovery/'+p,x);
    function card(item) {
      const {spec:s,award}=item,card=el('article','','discovery-card'),header=el('div','','discovery-line');
      header.append(el('h3',local(s,'title')),el('span',labels()[item.state],'discovery-state'));card.append(header,cosmetic(s));
      if(selected==='quests'){
        card.addEventListener('click',()=>{focusQuest=item.id;},true);
        card.append(el('p',tasks()[s.template]));
        const progress=el('progress');progress.value=item.marks.length;progress.max=item.goal;progress.setAttribute('aria-label',l('Quest progress','Progression'));
        card.append(progress,el('small',`${item.marks.length} / ${item.goal}`));
        if(item.catalogue?.missing && ['available','enrolled'].includes(item.state)){
          const {visible,missing}=item.catalogue;
          const text=!visible?l('The first Coming Soon previews will appear here when published.','Les premières fiches « À venir » apparaîtront ici dès leur publication.'):
            missing===1?l('One more preview needs to be published to finish this quest.','Une fiche supplémentaire doit être publiée pour terminer cette quête.'):
            l(`${missing} more previews need to be published to finish this quest.`,`${missing} fiches supplémentaires doivent être publiées pour terminer cette quête.`);
          card.append(el('p',text,'discovery-catalogue-status'));
        }
        if(item.state==='available')card.append(button(l('Join quest','Participer'),()=>run(()=>post('join',{id:item.id}))));
        if(item.state==='enrolled'){
          if(['Q02','Q03','Q06'].includes(s.template)){
            if(item.guide)card.append(link(l('Open guide','Ouvrir le guide'),item.guide.path+'&quest='+item.id));
            else card.append(el('p',l('The guide is currently unavailable in this language.','Le guide est actuellement indisponible dans cette langue.')));
          }
          if(s.template==='Q03'){
            if(item.guide&&!item.marks.some(m=>m.step==='guide')){
              if(item.guide.visited)card.append(button(l('I read the guide','J’ai lu le guide'),()=>run(()=>post('visit',{kind:'guideAck',key:item.guide.slug,locale:french()?'fr-CA':'en-CA'})),true));
              else card.append(el('small',l('Open the guide before confirming that you read it.','Ouvrez le guide pour pouvoir confirmer sa lecture.')));
            }
            card.append(link(l('Open saved shelf','Ouvrir mes favoris'),'/?lang='+(french()?'fr':'en')+'&category=favorites#games'));
          }else if(s.template==='Q08')card.append(button(l('My recent saves','Mes derniers favoris'),async()=>{
            try{const history=await api('discovery/activity',undefined,'GET');const list=el('div');card.append(list);
              pages(list,history.entries,r=>button(r.slug+' · activity-'+r.id,async()=>{
                try{await post('visit',{kind:'activity',key:r.id});list.replaceChildren(el('p',r.slug+' · '+date(r.createdAt)+' · activity-'+r.id),
                  button(l('Confirm this reference','Confirmer cette référence'),()=>run(()=>post('visit',{kind:'activityAck',key:r.id}))));}catch(e){message.textContent=t(e.message);}
              },true),l('No saved activity.','Aucune activité de favoris.'));
            }catch(e){message.textContent=t(e.message);}
          },true));
          else if(['Q05','Q07'].includes(s.template)&&extensions.community)card.append(button(l('Open shared lists','Ouvrir les listes partagées'),()=>select('community'),true));
          else if(['Q02','Q06'].includes(s.template)){
            for(const c of item.collections)card.append(link(local(c,'title'),'/?lang='+(french()?'fr':'en')+'&collection='+encodeURIComponent(c.key)+'#games'));
            if(item.collections.length<(s.template==='Q06'?2:1))card.append(el('small',l('A collection is currently unavailable in this language.','Une collection est actuellement indisponible dans cette langue.')));
          }else if(s.template==='Q09' && item.previews){
            for(const preview of item.previews)card.append(link(local(preview,'title'),'/coming-soon/'+preview.slug+'?lang='+(french()?'fr':'en')));
            if(item.previews.length<2)card.append(el('p',l('The full pair is currently unavailable in this language.','Le duo complet est actuellement indisponible dans cette langue.')));
          }
          else if(item.catalogue){
            if(item.catalogue.remaining)card.append(link(l('See Coming Soon previews','Voir les fiches à venir'),'/?lang='+(french()?'fr':'en')+'#coming-soon'));
          }else card.append(link(l('Browse catalogue','Voir le catalogue'),'/'+'#games'));
        }
        if(award)card.append(el('small',l('Completion','Quête terminée')+' · grant-'+award.grantId+' · '+date(award.grantedAt)));
      }
      if(selected==='rewards'){
        if(item.goal && !award)card.append(el('p',`${tasks()[s.template]} (${item.marks.length}/${item.goal})`));
        card.append(el('small',item.available===null?l('Unlimited stock','Stock illimité'):l('Available','Disponibles')+' · '+item.available));
      }
      if(item.state==='scheduled')card.append(el('small',l('Opens','Ouverture')+' · '+date(s.startsAt)));
      const claimDeadline=s.claimUntil??(s.template==='offer'?s.endsAt:null);
      if(claimDeadline)card.append(el('small',l('Claim by','À réclamer avant le')+' '+date(claimDeadline)));
      if(item.state==='paused'&&data.pause)card.append(el('small',l('Available again after','Accessible après le')+' '+date(data.pause.endsAt)));
      if(item.state==='claimable'&&selected!=='profile')card.append(button(l('Claim reward','Réclamer'),()=>run(()=>post('claim',{ids:[item.id]}))));
      if(award?.claimId){
        card.append(el('small','claim-'+award.claimId+' · '+date(award.claimedAt)));
        card.append(button(l('Contact support','Contacter le soutien'),()=>openSupport('claim-'+award.claimId),true));
      }
      if(selected==='profile' && !award?.claimId)card.append(el('p',s.template==='offer'?l('Claim this item in Rewards.','Réclamez cet article dans Récompenses.'):tasks()[s.template]));
      if(selected==='profile'&&award?.claimId){
        const equipped=data.equipped[s.slot]===award.claimId;
        card.append(button(equipped?l('Remove','Retirer'):l('Equip','Équiper'),()=>run(()=>post('equip',{slot:s.slot,claimId:equipped?null:award.claimId})),equipped));
      }
      return card;
    }
    if(selected==='quests'||selected==='rewards'||selected==='profile'){
      if(selected==='profile'){
        const display=el('div','','cosmetic-profile');display.append(el('h3',l('Equipped items','Articles équipés')));
        const worn=data.items.filter(i=>i.award?.claimId && data.equipped[i.spec.slot]===i.award.claimId);
        for(const i of worn){display.append(cosmetic(i.spec));if(i.spec.slot==='theme')display.classList.add('profile-'+i.spec.color);}
        if(!worn.length)display.append(el('p',l('No items equipped.','Aucun article équipé.')));body.append(display);
        const groups=new Map();
        for(const item of data.items){
          if(!item.award?.claimId && ['archived','expired','soldOut'].includes(item.state))continue;
          const key=item.spec.rewardCollectionEn?.trim().toLocaleLowerCase('en-CA')||'';
          if(!groups.has(key))groups.set(key,{label:item.spec.rewardCollectionEn?local(item.spec,'rewardCollection'):l('Discovery collection','Collection découverte'),items:[]});
          groups.get(key).items.push(item);
        }
        if(!groups.size){body.append(el('p',l('No collections yet.','Aucune collection pour le moment.')));return;}
        const sorted=[...groups].sort(([,a],[,b])=>Number(b.items.some(i=>i.award?.claimId))-Number(a.items.some(i=>i.award?.claimId)) || a.label.localeCompare(b.label));
        if(!groups.has(profileGroup))profileGroup=sorted[0][0];
        const toolbar=el('div','','discovery-actions'),groupBody=el('section');
        body.append(toolbar,groupBody);
        const picker=sorted.length>1?field(toolbar,'rewardGroup',l('Reward collection','Collection de récompenses'),{items:sorted.map(([key,g])=>[key,g.label]),value:profileGroup}):null;
        function drawGroup(){
          if(picker)profileGroup=picker.value;
          const group=groups.get(profileGroup),owned=group.items.filter(i=>i.award?.claimId),remaining=group.items.filter(i=>!i.award?.claimId);
          const milestone=l(owned.length+' of '+group.items.length+' items collected.',owned.length+' '+(owned.length>1?'articles obtenus':'article obtenu')+' sur '+group.items.length+'.');
          groupBody.replaceChildren(el('h3',group.label),el('p',milestone));
          if(owned.length===group.items.length)groupBody.append(el('p',l('Collection complete','Collection complète')));
          if(remaining.length){
            const show=button(previewRewards?l('Show owned items','Voir mes articles'):l('Preview remaining items','Aperçu des articles à obtenir'),()=>{previewRewards=!previewRewards;drawGroup();},true);
            groupBody.append(show);
          }
          const grid=el('div');groupBody.append(grid);
          pages(grid,previewRewards&&remaining.length?remaining:owned,card,l('No items collected yet.','Aucun article obtenu pour le moment.'),6,owned.findIndex(i=>i.award?.claimId===focusClaim));
        }
        picker?.addEventListener('change',()=>{previewRewards=false;drawGroup();});drawGroup();return;
      }
      if(selected==='rewards'){
        const ready=data.items.filter(i=>i.state==='claimable').slice(0,30);
        if(ready.length>1)body.append(button(l('Claim available items','Réclamer les articles disponibles')+' ('+ready.length+')',()=>run(()=>post('claim',{ids:ready.map(i=>i.id)}))));
      }
      const list=el('div');body.append(list);
      const items=data.items.filter(i=>selected==='quests'?i.spec.template!=='offer':true);
      pages(list,items,card,l('No items here yet.','Aucun article pour le moment.'),6,selected==='quests'?items.findIndex(i=>i.id===focusQuest):0);return;
    }
    if(selected==='inbox'){
      createContactList(body,{ui,t,state:inboxState,
        searchLabel:l('Message, reward or reference','Message, récompense ou référence'),filterLabel:l('Show','Afficher'),
        filters:[['all',l('All items','Tous les éléments')],['unread',l('Unread messages','Messages non lus')],['messages',l('Site messages','Messages du site')],['receipts',l('Reward receipts','Reçus de récompense')]],
        empty:l('No matching messages or receipts.','Aucun message ou reçu correspondant.'),
        summary:r=>l('Results','Résultats')+' · '+r.total+'　'+l('Unread messages','Messages non lus')+' · '+r.unread,
        load(params){params.set('locale',french()?'fr-CA':'en-CA');return api('discovery/inbox?'+params,undefined,'GET');},
        draw(row,refresh){
          const card=el('article','','discovery-card');
          if(row.kind==='receipt'){
            card.append(el('h3',l('Reward receipt','Reçu de récompense')),cosmetic(row),el('small',row.reference+' · '+date(row.at)));
            card.append(button(l('View in my collection','Voir dans ma collection'),()=>{
              profileGroup=row.rewardCollectionEn?.trim().toLocaleLowerCase('en-CA')||'';
              previewRewards=false;focusClaim=row.id;select('profile');
            },true));
            card.append(button(l('Get help with this receipt','Aide sur ce reçu'),()=>openSupport(row.reference),true));
          } else {
            const header=el('div','','discovery-line');
            header.append(el('h3',local(row,'subject')),el('small',row.readAt?l('Read','Lu'):l('Unread','Non lu')));
            card.append(header,el('p',local(row,'text')),el('small',names()[row.topic]+' · '+date(row.at)));
            if(row.destination)card.append(link(l('View','Consulter'),row.destination));
            if(!row.readAt){
              const mark=button(l('Mark as read','Marquer comme lu'),async()=>{
                mark.disabled=true;
                try{await post('read',{id:row.id});if(gen===generation&&card.isConnected)await refresh();}
                catch(e){if(gen===generation)message.textContent=t(e.message);mark.disabled=false;}
              },true);card.append(mark);
            }
          }
          return card;
        }
      });return;
    }
    for(const [topic,name] of Object.entries(names())){
      const section=el('section','','discovery-card');section.append(el('h3',name));
      for(const c of data.choices.filter(c=>c.topic===topic)){
        const label=el('label','','discovery-choice'),input=el('input');input.type='checkbox';input.checked=c.granted;
        label.append(input,document.createTextNode(c.channel==='email'?l('Email','Courriel'):l('Inbox','Messagerie du site')));section.append(label);
        input.addEventListener('change',()=>run(()=>post('preferences',{...c,granted:input.checked}),l('Preference saved.','Préférence enregistrée.')));
        if(c.granted){const paused=c.pauseUntil>Date.now();section.append(button(paused?l('Resume','Reprendre'):l('Pause for 7 days','Suspendre pour 7 jours'),()=>run(()=>post('preferences',{...c,pauseOnly:true,pauseUntil:paused?0:Date.now()+7*86400_000})),true));}
      }
      body.append(section);
    }
  }
  return {render,openTab(k,playerId){if(playerId!==undefined)switchPlayer(playerId);selected=k;}};
}
