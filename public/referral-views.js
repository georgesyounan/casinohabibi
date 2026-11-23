import { createContactList } from './contact-views.js';

const metricLabels=l=>[
  ['visits',l('Visits','Visites')],['signups',l('Signups','Inscriptions')],
  ['verified',l('Verified signups','Inscriptions vérifiées')],['qualified',l('Qualified first saves','Premiers favoris admissibles')],
  ['pending',l('Awaiting review','À vérifier')]
];
const otherSources=l=>l('Main link, codes and other sources','Lien principal, codes et autres sources');
const linkStatus=(active,l)=>active?l('Active','Actif'):l('Paused','En pause');
const states=l=>({pending:l('Awaiting review','À vérifier'),valid:l('Eligible','Admissible'),ineligible:l('Ineligible','Non admissible')});

export function shareLink(root,value,{el,l,button}) {
  const line=el('div','','referral-share'),label=el('label',l('Share link','Lien à partager')),input=el('input');
  input.value=value;
  input.readOnly=true;
  label.append(input);
  const copy=button(l('Copy link','Copier le lien'),async()=>{
    try {
      await navigator.clipboard.writeText(value);
      copy.textContent=l('Copied','Copié');
    } catch {
      input.focus();
      input.select();
    }
  },true);
  line.append(label,copy);root.append(line);
}
export function linkReportRows(report,l) {
  if(!report.links)return [];
  const metrics=metricLabels(l);
  return [[],[l('Campaign link','Lien de campagne'),...metrics.map(([,label])=>label)],
    ...report.links.map(row=>[row.name??otherSources(l),...metrics.map(([key])=>row[key])])];
}
export function showLinkReport(root,report,ui,urlFor) {
  if(!report.links)return;
  const {el,l,pages}=ui;
  const section=el('section','','referral-statement'),list=el('div');
  section.append(el('h4',l('Results by campaign link','Résultats par lien de campagne')),list);
  root.append(section);
  pages(list,report.links,row=>{
    const item=el('details','','discovery-card');
    const title=el('summary',row.name??otherSources(l));
    const stats=el('dl','','growth-metrics');
    for(const [key,label] of metricLabels(l))stats.append(el('dt',label),el('dd',String(row[key])));
    item.append(title,stats);
    if(row.id){
      item.append(el('small',linkStatus(row.active,l)));
      if(row.active&&urlFor)shareLink(item,urlFor(row.path),ui);
    }
    return item;
  },'',5);
}

export function partnerDirectory(root,{ui,t,get,edit,manage,statements}) {
  const {el,l,button}=ui;
  const list=el('div');
  root.replaceChildren(button(l('New partner','Nouveau partenaire'),()=>edit(null)),list);
  createContactList(list,{ui,t,load:params=>get('/partners?'+params),
    searchLabel:l('Partner name, code or email','Nom, code ou courriel du partenaire'),filterLabel:l('Partner status','Statut du partenaire'),
    filters:[['all',l('All partners','Tous les partenaires')],['active',l('Active','Actifs')],['paused',l('Inactive','Inactifs')]],
    state:{q:'',filter:'all',page:1},empty:l('No matching partner.','Aucun partenaire trouvé.'),
    summary:r=>l('Partners found','Partenaires trouvés')+' · '+r.total,
    draw:p=>{
      const item=el('article','','discovery-card');
      item.append(button(p.name+' · '+p.code,()=>edit(p),true),el('small',[p.email,p.active?l('Active','Actif'):l('Inactive','Inactif')].join(' · ')),
        button(l('Manage links','Gérer les liens')+' ('+p.linkCount+')',()=>manage(p),true));
      if(statements)item.append(button(l('Commission statements','Relevés de commission'),()=>statements(p),true));
      return item;
    }});
}

export async function managePartnerLinks(root,partner,{ui,t,get,post,back,urlFor}) {
  const {el,l,button,field,pages}=ui;
  const status=el('p','','discovery-feedback'),body=el('div');
  status.setAttribute('role','status');
  root.replaceChildren(button(l('All partners','Tous les partenaires'),back,true),el('h4',partner.name+' · '+partner.code),status,body);
  let saving=false,serial=0;
  async function persist(row,name,active){
    if(saving)return;
    saving=true;status.textContent=t('loading');
    try {
      await post('link',{partnerId:partner.id,id:row?.id,version:row?.version??0,name,active});
      if(!body.isConnected)return;
      await refresh(l('Link saved.','Lien enregistré.'));
    }catch(e){
      if(!body.isConnected)return;
      status.replaceChildren(el('span',t(e.message)));
      if(e.message==='discoveryConflict')status.append(button(l('Reload links','Recharger les liens'),()=>refresh(),true));
    }finally{saving=false;}
  }
  function editor(row){
    const form=el('form','','discovery-form');
    const name=field(form,'name',l('Link name','Nom du lien'),{required:true,maxLength:80,value:row?.name,placeholder:l('e.g. Newsletter','Ex. Infolettre')});
    form.append(el('button',l('Save link','Enregistrer le lien')),button(l('Cancel','Annuler'),()=>refresh(),true));
    form.onsubmit=e=>{e.preventDefault();void persist(row,name.value,row?.active??true);};
    status.textContent='';
    body.replaceChildren(form);name.focus();
  }
  async function refresh(note=''){
    const current=++serial;
    try {
      const result=await get('/partners/'+partner.id+'/links');
      if(!body.isConnected||current!==serial)return;
      status.textContent=note;
      const list=el('div'),main=el('details','','discovery-card');
      main.append(el('summary',l('Main referral link','Lien de parrainage principal')));
      if(result.active)shareLink(main,urlFor('/r/'+result.code),ui);
      else main.append(el('p',l('Partner is inactive.','Le partenaire est inactif.')));
      body.replaceChildren(main,button(l('Create link','Créer un lien'),()=>editor(null)),list);
      pages(list,result.links,row=>{
        const item=el('article','','discovery-card');
        item.append(el('h4',row.name),el('small',linkStatus(row.active&&result.active,l)));
        if(row.active&&result.active)shareLink(item,urlFor(row.path),ui);
        item.append(button(l('Rename','Renommer'),()=>editor(row),true),
          button(row.active?l('Pause link','Suspendre le lien'):l('Reactivate link','Réactiver le lien'),()=>persist(row,row.name,!row.active),true));
        return item;
      },l('No campaign links yet.','Aucun lien de campagne pour le moment.'),5);
    } catch(e) {
      if(body.isConnected&&current===serial){
        status.textContent=t(e.message);
        body.replaceChildren(button(l('Try again','Réessayer'),()=>refresh(),true));
      }
    }
  }
  await refresh();
}

export function referralDetails(root,row,{el,l,date}) {
  const table=el('dl','','growth-metrics');
  const lines=[[l('Partner','Partenaire'),row.partnerName+' · '+row.partnerCode],
    [l('Signup source','Source de l’inscription'),row.source==='code'?l('Signup code','Code de parrainage'):l('Referral link','Lien de parrainage')],
    [l('Campaign link','Lien de campagne'),row.linkName],
    [l('Signed up','Inscription'),date(row.at)],
    [l('Verified','Vérification du courriel'),row.verifiedAt&&date(row.verifiedAt)],
    [l('First save','Premier favori'),row.savedAt&&date(row.savedAt)]];
  if(row.flag){
    lines.push([l('Flag','Signalement'),row.flag==='self'?l('Self-referral','Auto-parrainage'):l('Possible duplicate','Doublon possible')],
      [l('Decision','Décision'),states(l)[row.review]],[l('Reference','Référence'),row.decisionId&&'review-'+row.decisionId],
      [l('Reason','Motif'),row.reason],[l('Decided by','Décision prise par'),row.decidedBy],
      [l('Decision date','Date de décision'),row.decidedAt&&date(row.decidedAt)]);
  }
  for(const [label,value] of lines)if(value)table.append(el('dt',label),el('dd',value));
  root.replaceChildren(table);
}
export function referralReviews(root,{ui,t,get,post,openPlayer}) {
  const {el,l,field,button}=ui;
  const feedback=el('p','','discovery-feedback'),list=el('div');
  feedback.setAttribute('role','status');
  const wanted=new URLSearchParams(location.search).get('referralPlayer');
  const focus=/^[1-9]\d{0,14}$/.test(wanted||'');
  const state={q:focus?'player-'+wanted:'',filter:focus?'all':'pending',page:1};
  const labels=states(l);
  root.replaceChildren(feedback,list);
  function show(){
    createContactList(list,{ui,t,load:params=>get('/reviews?'+params),
      searchLabel:l('Player, partner or decision reference','Joueur, partenaire ou référence de décision'),
      filterLabel:l('Review status','Statut de vérification'),filters:[['pending',labels.pending],['valid',labels.valid],['ineligible',labels.ineligible],['all',l('All reviews','Toutes les vérifications')]],
      state,summary:r=>l('Referrals found','Parrainages trouvés')+' · '+r.total,
      empty:l('No referrals match this view.','Aucun parrainage dans cette vue.'),
      draw:(row,refresh)=>{
        const item=el('article','','discovery-card'),details=el('details'),info=el('div');
        details.append(el('summary',l('Referral details','Détails du parrainage')),info);referralDetails(info,row,ui);
        item.append(el('h4',row.email),el('p',[row.partnerName,row.linkName,labels[row.review]].filter(Boolean).join(' · ')),
          details,button(l('Open player record','Ouvrir la fiche du joueur'),()=>openPlayer(row.playerId),true));
        if(row.review==='pending'){
          const form=el('form','','discovery-form');
          const decision=field(form,'decision',l('Decision','Décision'),{required:true,items:[['',l('Select a decision','Choisir une décision')],['valid',labels.valid],['ineligible',labels.ineligible]]});
          const reason=field(form,'reason',l('Reason','Motif'),{required:true,maxLength:240});
          const submit=el('button',l('Record decision','Enregistrer la décision'));
          form.append(submit);item.append(form);
          form.onsubmit=async e=>{
            e.preventDefault();if(submit.disabled)return;
            submit.disabled=true;feedback.replaceChildren();
            try {
              const result=await post('review',{playerId:row.playerId,decision:decision.value,reason:reason.value.trim()});
              if(!item.isConnected)return;
              feedback.append(el('span',l('Decision recorded','Décision enregistrée')+' · review-'+result.auditId),
                button(l('View decision','Voir la décision'),()=>{Object.assign(state,{filter:'all',page:1,q:'review-'+result.auditId});show();},true));
              await refresh();
            }catch(err){
              feedback.textContent=t(err.message);
              if(err.message==='discoveryConflict')await refresh();
            }finally{submit.disabled=false;}
          };
        }else item.append(el('p',[row.decisionId&&'review-'+row.decisionId,row.reason].filter(Boolean).join(' · ')));
        return item;
      }});
  }
  show();
}

export function referralExample(root,{el,l,button}) {
  const panel=el('details','','discovery-card referral-example');
  panel.open=new URLSearchParams(location.search).get('exemple')==='parrainage';
  const numbers=el('dl','','growth-metrics'),controls=el('div','','discovery-actions'),status=el('p');
  status.setAttribute('role','status');
  const steps=[
    [l('Simulate a visit','Simuler une visite'),l('A reader opens the newsletter link.','Une lectrice ouvre le lien de l’infolettre.'),[1,0,0,0,0]],
    [l('Verify signup','Vérifier l’inscription'),l('The reader signs up and verifies her email.','La lectrice s’inscrit et vérifie son courriel.'),[1,1,1,0,0]],
    [l('Save a first favorite','Ajouter un premier favori'),l('Her first favorite qualifies.','Son premier favori est admissible.'),[1,1,1,1,0]],
    [l('Simulate a flagged referral','Simuler un parrainage signalé'),l('A second verified reader uses the same browser and saves a favorite. This referral goes to review.','Un deuxième lecteur vérifié utilise le même navigateur et ajoute un favori. Son parrainage est à vérifier.'),[1,2,2,1,1]]
  ];
  const metrics=metricLabels(l);
  function draw(index,outcome){
    let values=index?steps[index-1][2]:[0,0,0,0,0];
    let message=index?steps[index-1][1]:l('The fictional newsletter starts with zero visits.','L’infolettre fictive démarre à zéro visite.');
    if(outcome){
      const valid=outcome==='valid';
      values=[1,2,2,valid?2:1,0];
      message=valid?l('Both first saves now qualify.','Les deux premiers favoris sont maintenant admissibles.'):
        l('Only the first reader’s favorite qualifies.','Seul le favori de la première lectrice est admissible.');
    }
    status.textContent=message;
    numbers.replaceChildren();metrics.forEach(([,label],i)=>numbers.append(el('dt',label),el('dd',String(values[i]))));
    controls.replaceChildren();
    if(index<steps.length)controls.append(button(steps[index][0],()=>draw(index+1)));
    else if(!outcome)controls.append(button(l('Mark eligible','Déclarer admissible'),()=>draw(index,'valid')),
      button(l('Mark ineligible','Déclarer non admissible'),()=>draw(index,'ineligible'),true));
    if(index)controls.append(button(l('Restart demo','Recommencer la démo'),()=>draw(0),true));
  }
  panel.append(el('summary',l('Try a fictional referral','Essayer un parrainage fictif')),status,numbers,controls);
  root.append(panel);draw(0);
}
