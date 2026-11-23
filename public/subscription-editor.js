export function subscriptionEditor(root,{ui,api,t}){
  const {el,l,field,button}=ui,card=el('details','','admin-disclosure'),panel=el('div');
  card.append(el('summary',l('Event subscriptions and delivery log','Abonnements aux événements et journal de livraison')),panel);root.append(card);
  const url='admin/operator/subscriptions';
  async function show(){
    const status=el('p');status.setAttribute('role','status');panel.replaceChildren(status);
    async function save(input){try{await api(url,input);await show();}catch(err){status.textContent=t(err.message);}}
    try{const {items}=await api(url,undefined,'GET'),purposeLabels={crm:'CRM',affiliate:l('Referrals','Parrainages'),account:l('Account','Compte'),wallet:l('Wallet','Portefeuille'),telegram:'Telegram'};
      const f=el('form','','op-form'),name=field(f,'name',l('Test subscriber','Abonné de test'),{required:true,maxLength:75});
      const purpose=field(f,'purpose',l('Events','Événements'),{items:Object.entries(purposeLabels)});
      const modeItems=[['accept',l('Accept','Accepter')],['temporary',l('Temporary outage','Panne temporaire')],['permanent',l('Offline','Hors ligne')],['lost-reply',l('Lost acknowledgment','Accusé de réception perdu')]];
      const maps=field(f,'fields',l('Approved contact fields','Champs de contact autorisés'),{items:[['id,locale',l('ID and language','Identifiant et langue')],['id',l('ID only','Identifiant seul')],['id,locale,email',l('ID, language and email (CRM)','Identifiant, langue et courriel (CRM)')]]});
      const mode=field(f,'mode',l('Simulated receiver','Récepteur simulé'),{items:modeItems});
      f.append(el('button',l('Create subscription','Créer l’abonnement')));panel.append(f);
      f.onsubmit=e=>{e.preventDefault();void save({action:'configure',name:name.value,purpose:purpose.value,fields:maps.value.split(','),mode:mode.value});};
      for(const s of items){const box=el('article','','discovery-card');panel.append(box);
        box.append(el('strong',s.name+' · '+purposeLabels[s.purpose]),el('p','v'+s.version+' · '+l('Checkpoint','Point de reprise')+' '+s.cursor));
        const mapOptions=[['id,locale',l('ID and language','Identifiant et langue')],['id',l('ID only','Identifiant seul')],...(s.purpose==='crm'?[['id,locale,email',l('ID, language and email','Identifiant, langue et courriel')]]:[])];
        const fields=field(box,'mapping',l('Field mapping','Correspondance des champs'),{items:mapOptions,value:s.fields.join(',')});
        const receiver=field(box,'mode',l('Receiver','Récepteur'),{items:modeItems,value:s.mode});
        box.append(button(l('Save receiver','Enregistrer le récepteur'),()=>save({...s,action:'configure',mode:receiver.value,fields:fields.value.split(',')}),true));
        if(['crm','telegram'].includes(s.purpose)){const input=field(box,'campaign',l('Campaign identifier','Identifiant de campagne'),{maxLength:60});box.append(button(l('Snapshot audience','Figer l’audience'),()=>save({id:s.id,action:'snapshot',campaign:input.value}),true));}
        box.append(button(l('Process next batch','Traiter le prochain lot'),()=>save({id:s.id,action:'deliver'}),true));
        for(const e of s.events){const row=el('p',e.source+' · '+e.state+' · '+e.attempts);if(e.state==='dead')row.append(button(l('Retry','Relancer'),()=>save({id:s.id,action:'replay',event:e.id}),true));box.append(row);}
      }
    }catch(err){status.textContent=t(err.message);}
  }
  card.ontoggle=()=>{if(card.open)void show();};
}
