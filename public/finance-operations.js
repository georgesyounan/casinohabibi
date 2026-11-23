const actions=[
  ['fund','Credit test funds','Créditer des fonds de test','amount'],['hold','Reserve funds','Réserver des fonds','amount'],
  ['capture','Capture a reservation','Capturer une réservation','parent amount'],['release','Release a reservation','Libérer une réservation','parent amount'],
  ['reverse','Reverse a receipt','Contrepasser un reçu','parent'],['transfer','Transfer to studio','Transférer au studio','amount'],
  ['quote','Record an exchange quote','Enregistrer une cotation','rate'],['fx','Debit with a quote','Débiter avec une cotation','parent amount'],
  ['enable','Enable a game','Activer un jeu','game'],['suspend','Suspend a game','Suspendre un jeu','game'],['launch','Open a game session','Ouvrir une session de jeu','game'],
  ['stake','Record a stake','Enregistrer une mise','parent amount'],['win','Settle a round','Régler une manche','parent amount'],
  ['investigate','Investigate an open round','Examiner une manche ouverte','parent reason'],['jackpot','Update jackpot reading','Relever la cagnotte','game amount observed'],
  ['payout','Post a payout','Comptabiliser un retrait','amount'],['report-ggr','Import provider GGR','Importer le produit brut fournisseur','amount'],
  ['report-payout','Import a payout statement','Importer un relevé de retrait','parent amount'],['resolve-exception','Accept a difference','Accepter un écart','parent reason'],
  ['close','Close a snapshot','Clôturer les comptes',''],['reopen','Reopen a close','Rouvrir une clôture','reason']
];
export function financeOperationsUi(view,{api,t,ui}){
  const {el,l,field,button}=ui,section=el('details','','admin-disclosure'),panel=el('div');
  section.append(el('summary',l('Wallet operations and reconciliation','Opérations de portefeuille et rapprochement')),panel);view.append(section);
  const path='admin/operator/finance-operations',money=v=>(v/100).toLocaleString(l('en-CA','fr-CA'),{minimumFractionDigits:2,maximumFractionDigits:2})+' TST';
  const label=key=>{const action=actions.find(a=>a[0]===key);return action?l(action[1],action[2]):key;};
  let selected='',serial=0,lastKind='fund';
  async function load(note=''){
    const seq=++serial,message=el('p',note);message.setAttribute('role','status');panel.replaceChildren(message);
    try{
      const cases=await api(path,undefined,'GET');if(seq!==serial)return;
      const choose=field(panel,'wallet',l('Test account','Compte de test'),{items:[['',l('Select an account','Choisir un compte')],...cases.items.map(c=>[c.id,c.label])],value:selected});
      choose.onchange=()=>{selected=choose.value;void load();};
      if(!selected){
        const f=el('form','','op-form'),name=field(f,'label',l('New account name','Nom du nouveau compte'),{required:true,maxLength:80}),btn=el('button',l('Create','Créer'));f.append(btn);panel.append(f);
        f.onsubmit=async e=>{e.preventDefault();btn.disabled=true;try{const v=await api(path,{action:'create',label:name.value});selected=v.id;await load();}catch(err){message.textContent=t(err.message);btn.disabled=false;}};return;
      }
      const d=await api(path+'?id='+encodeURIComponent(selected),undefined,'GET');if(seq!==serial)return;
      panel.append(el('h4',l('Available','Disponible')+' · '+money(d.available)),el('p',l('Held','Réservé')+' '+money(d.held)+' · GGR '+money(d.ggr)+' · RTP '+(d.rtp===null?'—':d.rtp+' %')));
      const f=el('form','','op-form');panel.append(f);
      const action=field(f,'operation',l('Operation','Opération'),{items:actions.map(a=>[a[0],l(a[1],a[2])]),value:lastKind});
      const inputs=el('div'),send=el('button',l('Record operation','Enregistrer l’opération'));f.append(inputs,send);
      let build;
      function redraw(){
        lastKind=action.value;inputs.replaceChildren();const flags=actions.find(a=>a[0]===lastKind)[3].split(' ');
        const reference=field(inputs,'ref',l('Receipt reference','Référence du reçu'),{value:crypto.randomUUID(),required:true,maxLength:80});
        const parent=flags.includes('parent')?field(inputs,'parent',l('Original reference','Référence d’origine'),{required:true,maxLength:80}):null;
        const amount=flags.includes('amount')?field(inputs,'amount',l('Amount (TST)','Montant (TST)'),{type:'number',min:0,step:0.01,required:true}):null;
        const game=flags.includes('game')?field(inputs,'game',l('Game or source ID','Identifiant du jeu ou de la source'),{value:'demo-wheel',required:true}):null;
        const reason=flags.includes('reason')?field(inputs,'reason',l('Reason','Motif'),{required:true,maxLength:200}):null;
        const rate=flags.includes('rate')?field(inputs,'rate',l('TST per game unit','TST par unité de jeu'),{type:'number',step:0.01,value:2,min:0.01,max:100,required:true}):null;
        const ttl=rate?field(inputs,'ttl',l('Quote lifetime (minutes)','Durée de la cotation (minutes)'),{type:'number',min:1,max:1440,value:5,required:true}):null;
        const observed=flags.includes('observed')?field(inputs,'observed',l('Observation time','Heure du relevé'),{type:'datetime-local',required:true}):null;
        build=()=>({id:selected,action:action.value,ref:reference.value,...(parent&&{parent:parent.value}),...(amount&&{amount:Math.round(Number(amount.value)*100)}),...(game&&{game:game.value}),...(reason&&{reason:reason.value}),
          ...(rate&&{numerator:Math.round(Number(rate.value)*100),denominator:100,expires:Date.now()+Number(ttl.value)*60000}),...(observed&&{observed:new Date(observed.value).valueOf()})});
      }
      action.onchange=redraw;redraw();
      f.onsubmit=async e=>{e.preventDefault();send.disabled=true;try{const result=await api(path,build());await load(l('Receipt','Reçu')+' '+result.receipt);}catch(err){message.textContent=t(err.message);send.disabled=false;}};
      function history(title,entries,render){
        if(!entries.length)return;
        const group=el('details'),list=el('ul');group.append(el('summary',title+' · '+entries.length),list);panel.append(group);
        for(const record of entries){const li=el('li');li.append(...render(record));list.append(li);}
      }
      history(l('Receipts','Reçus'),d.receipts.slice().reverse(),r=>[el('strong',label(r.kind)+' · '+money(r.amount)),el('p',r.ref+(r.parent?' ← '+r.parent:''))]);
      history(l('Open investigations','Enquêtes ouvertes'),d.alerts.filter(a=>!a.resolved),a=>[el('strong',a.id),el('p',a.reason+' · '+l('Assignee','Responsable')+' #'+a.assignee)]);
      history(l('Round investigations','Enquêtes de manches'),d.alerts,a=>[el('strong',a.reason),el('p',a.id+' · '+(a.receipt||l('Open','Ouverte')))]);
      history(l('Statement reconciliation','Rapprochement de relevés'),d.exceptions,r=>[el('strong',r.id+' · '+r.state),el('p',money(r.reported)+' / '+(r.expected===null?'—':money(r.expected))+(r.variance===null?'':' · Δ '+money(r.variance))+' · '+r.source.join(', ')+(r.reason?' · '+r.reason:''))]);
      history(l('Jackpots','Cagnottes'),d.jackpots,r=>[el('strong',r.source+' · '+money(r.amount)),el('p',new Date(r.observed).toLocaleString()+' · '+(r.stale?l('Stale','Périmé'):l('Current','À jour')))]);
      history(l('Close adjustments','Corrections après clôture'),d.adjustments,r=>[el('strong',r.ref),el('p','v'+r.version+' · '+r.original)]);
      history(l('Close history','Historique des clôtures'),d.snapshots,c=>[el('strong','v'+c.version+' · '+money(c.snapshot.available)),el('p',c.reason||new Date(c.opened).toLocaleString())]);
    }catch(err){if(seq===serial)message.textContent=t(err.message);}
  }
  section.addEventListener('toggle',()=>{if(section.open)void load();});
}
