export function budgetControls({api,element,t,fr}){
  const l=(en,s)=>fr?s:en,box=element('details','','account-budget'),title=element('summary',l('Weekly and monthly budgets','Budgets hebdomadaires et mensuels')),body=element('div');
  box.append(title,body);const f=(v)=>v===null?'—':(v/100).toFixed(2);
  async function load(note=''){
    const status=element('p',note);status.setAttribute('role','status');body.replaceChildren(status);
    try{const data=await api('safety/budgets',undefined,'GET'),items=data.items,form=element('form');
      const field=(label,control)=>{const x=element('label',label);x.append(control);form.append(x);return control;};
      const slot=field(l('Budget','Budget'),element('select')),value=field(l('Maximum (blank removes limit)','Maximum (vide pour retirer la limite)'),element('input'));
      value.type='number';value.min='0';value.step='.01';value.max='100000';
      const kind={stake:l('Stakes (demo CAD)','Mises (CAD fictifs)'),loss:l('Net loss (demo CAD)','Perte nette (CAD fictifs)'),deposit:l('Deposits (TST)','Dépôts (TST)')};
      for(const [i,row] of items.entries()){const o=element('option',(row.period==='week'?l('Week','Semaine'):l('Month','Mois'))+' · '+kind[row.kind]);o.value=String(i);slot.append(o);}
      const summary=element('p'),save=element('button',l('Save budget','Enregistrer le budget'));form.append(summary,save);body.append(form);
      body.append(element('small',l('UTC calendar periods. Reductions apply immediately. Increases and removals take effect after 24 hours.','Périodes civiles en UTC. Les baisses sont immédiates. Les hausses et les retraits de limites prennent effet après 24 heures.')));
      function paint(){const r=items[Number(slot.value)];value.value=r.amount===null?'':f(r.amount);summary.textContent=l('Used','Utilisé')+' · '+f(r.used)+(r.effectiveAt?' · '+l('New limit','Nouvelle limite')+' '+f(r.pending)+' · '+new Date(r.effectiveAt).toLocaleString(fr?'fr-CA':'en-CA'):'');}
      slot.onchange=paint;paint();form.onsubmit=async e=>{e.preventDefault();save.disabled=true;const r=items[Number(slot.value)];
        try{await api('safety/budgets',{period:r.period,kind:r.kind,amount:value.value===''?null:Math.round(Number(value.value)*100),version:r.version});await load(l('Budget saved.','Budget enregistré.'));}catch(err){status.textContent=t(err.message);save.disabled=false;}};
    }catch(err){status.textContent=t(err.message);}
  }
  box.ontoggle=()=>{if(box.open)void load();};return box;
}
