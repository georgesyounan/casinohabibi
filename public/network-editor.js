export function networkEditor(root,{api,t,ui}){
 const {el,l,field,button}=ui,box=el('details','','admin-disclosure'),panel=el('div');
 box.append(el('summary',l('Test asset network','Réseau d’actifs fictifs')),panel);root.append(box);
 const url='admin/operator/demo-network';
 async function show(){
  const status=el('p');status.setAttribute('role','status');panel.replaceChildren(status);
  try{const d=await api(url,undefined,'GET'),r=d.rules;
   async function command(payload){try{await api(url,{network:r.network,asset:r.asset,...payload});await show();}catch(e){status.textContent=t(e.message);}}
   panel.append(el('p',r.network+' · '+r.asset+' · '+l('Local simulator','Simulateur local')));
   const f=el('form','','op-form'),state=field(f,'state',l('Allow new instructions','Autoriser les nouvelles instructions'),{items:[['0',l('Off','Non')],['1',l('On','Oui')]],value:String(r.enabled)});
   const count=field(f,'confirmations',l('Confirmations','Confirmations'),{type:'number',min:1,max:20,value:r.confirmations}),fee=field(f,'fee',l('Fee in cents','Frais en cents'),{type:'number',min:0,max:99,value:r.fee});
   f.append(el('button',l('Save settings','Enregistrer les réglages')));panel.append(f);f.onsubmit=e=>{e.preventDefault();void command({action:'settings',enabled:state.value==='1',confirmations:Number(count.value),fee:Number(fee.value)});};
   const g=el('form','','op-form'),tx=field(g,'tx',l('Test transaction hash','Empreinte de la transaction fictive'),{required:true,maxLength:64}),idx=field(g,'index',l('Transfer index','Index du transfert'),{type:'number',min:0,value:0});
   const address=field(g,'address',l('Linked test address','Adresse fictive associée'),{required:true,maxLength:64}),amount=field(g,'amount',l('Amount (cents)','Montant (cents)'),{type:'number',min:100,value:1000}),depth=field(g,'depth',l('Observed confirmations','Confirmations observées'),{type:'number',min:0,value:0});
   g.append(el('button',l('Record observed transfer','Enregistrer le transfert observé')));panel.append(g);
   g.onsubmit=e=>{e.preventDefault();void command({action:'observe',tx:tx.value.trim(),index:Number(idx.value),address:address.value.trim(),amount:Number(amount.value),confirmations:Number(depth.value)});};
   for(const dtx of d.deposits){const item=el('details');item.append(el('summary',dtx.tx.slice(0,10)+'… #'+dtx.idx+' · '+dtx.state),el('p',dtx.payment||l('Awaiting finality','En attente de confirmations')));
     if(dtx.state!=='exception'){const why=field(item,'reason',l('Reorganization reason','Motif de réorganisation'),{maxLength:200});item.append(button(l('Record chain exception','Enregistrer une anomalie de chaîne'),()=>command({action:'reorg',tx:dtx.tx,index:dtx.idx,reason:why.value}),true));}panel.append(item);}
   for(const p of d.payouts){const line=el('p',p.id+' · '+p.status+' · '+p.custody);panel.append(line);
     const next=p.status==='held'?['send']:p.status==='sent'?['timeout','confirm']:p.status==='unknown'?['confirm']:[];
     const labels={send:l('Send in simulation','Simuler l’envoi'),timeout:l('Simulate timeout','Simuler un délai expiré'),confirm:l('Confirm payout','Confirmer le retrait')};for(const step of next)line.append(button(labels[step],()=>command({action:step,id:p.id,version:p.version}),true));}
   for(const x of d.exceptions)panel.append(el('p',x.tx.slice(0,10)+'… #'+x.idx+' · '+x.reason+' · '+(x.payment||'')));
  }catch(e){status.textContent=t(e.message);}
 }
 box.ontoggle=()=>{if(box.open)void show();};
}
