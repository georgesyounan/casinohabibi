export function distributionEditor(view,{ui,api,t,canPublish}){
  const {l,el,field,button}=ui,section=el('details','','admin-disclosure'),panel=el('div');
  section.append(el('summary',l('Studio distribution and unmapped types','Distribution des studios et types à réviser')),panel);view.append(section);
  async function load(note=''){
    const message=el('p',note);message.setAttribute('role','status');panel.replaceChildren(message);
    try{
      const data=await api('admin/shelves/distribution',undefined,'GET');
      async function commit(payload){
        try{await api('admin/shelves/distribution',payload);await load(l('Saved.','Enregistré.'));}
        catch(e){message.textContent=t(e.message);}
      }
      for(const r of data.rules)panel.append(el('p',[r.studio,r.market||l('All markets','Tous les marchés'),r.channel,r.enabled?l('Allowed','Autorisé'):l('Restricted','Restreint')].join(' · ')));
      if(canPublish()&&data.studios.length){
        const f=el('form','','op-form'),studio=field(f,'studio',l('Studio or supplier','Studio ou fournisseur'),{items:data.studios.map(s=>[s,s])});
        const market=field(f,'market',l('Market, e.g. CA-QC','Marché, p. ex. CA-QC'),{maxLength:8});
        const channel=field(f,'channel',l('Device','Appareil'),{items:[['all',l('All','Tous')],['mobile',l('Mobile','Téléphone')],['desktop',l('Desktop','Ordinateur')]]});
        const enabled=field(f,'state',l('Availability','Disponibilité'),{items:[['0',l('Restrict','Restreindre')],['1',l('Allow','Autoriser')]]});
        const submit=el('button',l('Save distribution rule','Enregistrer la distribution'));f.append(submit);panel.append(f);
        f.onsubmit=async e=>{e.preventDefault();submit.disabled=true;const region=market.value.trim().toUpperCase();
          const old=data.rules.find(r=>r.studio===studio.value&&r.market===region&&r.channel===channel.value);
          await commit({action:'rule',studio:studio.value,market:region,channel:channel.value,enabled:enabled.value==='1',version:old?.version||0});submit.disabled=false;};
      }
      for(const row of data.review){
        const div=el('div','','contact-card');panel.append(div);
        div.append(el('strong',row.titleEn),el('p',row.provider+' · '+row.nativeType+' · '+row.external));
        if(canPublish()){const category=field(div,'category',l('Mapped category','Catégorie correspondante'),{items:[['slots',l('Slots','Machines à sous')],['table',l('Table','Table')],['live',l('Live','En direct')]],value:row.mapped||'slots'});
          div.append(button(l('Use on next import','Appliquer au prochain import'),()=>commit({action:'map',...row,category:category.value}),true));}
      }
    }catch(err){message.textContent=t(err.message);}
  }
  section.addEventListener('toggle',()=>{if(section.open)void load();});
}
