const kinds={break:['Mandatory break','Pause obligatoire'],time:['Time limit','Limite de temps'],money:['Budget limit','Limite budgétaire'],maintenance:['Maintenance','Maintenance'],suspension:['Play suspended','Jeu suspendu'],closure:['Play closed','Jeu fermé']};
export function playerNotice(banner,notice,{fr,element,acknowledge,help}){
  if(!notice||Date.now()>=notice.ends)return false;
  banner.hidden=false;const signature=[notice.id,notice.acknowledged,fr].join('/');
  if(banner.dataset.blocking===signature)return true;banner.dataset.blocking=signature;banner.replaceChildren();
  const lang=Number(fr),title=kinds[notice.kind]?.[lang]||kinds.break[lang],time=new Date(notice.ends).toLocaleString(fr?'fr-CA':'en-CA');
  banner.append(element('strong',title),element('span',notice.reason+' · '+(fr?'Fin prévue ':'Ends ')+time));
  if(!notice.acknowledged){const btn=element('button',fr?'Compris':'Acknowledge','ghost');btn.type='button';btn.onclick=async()=>{btn.disabled=true;try{await acknowledge(notice.id);}finally{btn.disabled=false;}};banner.append(btn);}
  const contact=element('button',fr?'Contacter le soutien':'Contact support','ghost');contact.type='button';contact.onclick=help;banner.append(contact);return true;
}
export function noticeEditor(root,id,{api,t,fr,element}){
  root.querySelector('[data-notice-editor]')?.remove();
  const box=element('details','','admin-disclosure');box.dataset.noticeEditor='';box.append(element('summary',fr?'Avis de jeu et pause obligatoire':'Play notices and mandatory break'));root.append(box);
  const panel=element('div');box.append(panel);
  async function render(){
    const url='admin/players/'+id+'/notice',status=element('p');status.setAttribute('role','status');panel.replaceChildren(status);
    try{
      const {notice}=await api(url,undefined,'GET');
      async function save(input){try{await api(url,input);await render();}catch(err){status.textContent=t(err.message);}}
      if(notice){const lift=element('button',fr?'Lever la restriction':'Lift restriction','ghost');lift.type='button';lift.onclick=()=>save({action:'lift',id:notice.id});panel.append(element('p',kinds[notice.kind][Number(fr)]+' · '+notice.reason),lift);}
      const form=element('form','','op-form');panel.append(form);
      function field(tag,label){const wrap=element('label',label),input=element(tag);wrap.append(input);form.append(wrap);return input;}
      const type=field('select',fr?'Type de restriction':'Restriction type');
      for(const [key,labels] of Object.entries(kinds)){const opt=element('option',labels[Number(fr)]);opt.value=key;type.append(opt);}
      const length=field('input',fr?'Durée (minutes)':'Duration (minutes)');length.type='number';length.min=1;length.max=525600;length.value=15;length.required=true;
      const reason=field('input',fr?'Motif visible du joueur':'Reason shown to the player');reason.required=true;reason.maxLength=200;
      const btn=element('button',fr?'Appliquer':'Apply');form.append(btn);form.onsubmit=async e=>{e.preventDefault();btn.disabled=true;await save({action:'create',kind:type.value,minutes:Number(length.value),reason:reason.value});btn.disabled=false;};
    }catch(err){status.textContent=t(err.message);}
  }
  box.ontoggle=()=>{if(box.open)void render();};
}
