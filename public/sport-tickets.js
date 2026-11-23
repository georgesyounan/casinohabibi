import { byId,outcome } from './sports-data.js';

const money=(n,fr)=>new Intl.NumberFormat(fr?'fr-CA':'en-CA',{style:'currency',currency:'CAD'}).format(n/100);
export const currentMarket=(state,match)=>state.book?.markets.find(m=>m.id===match.id)||
  {status:'open',version:0,prices:match.odds.map(n=>Math.round(n*100))};
export const quotedPrice=(state,id,index)=>currentMarket(state,byId.get(id)).prices[index]/100;
export function bookHistory(state,fr){
  const l=(en,french)=>fr?french:en;
  const status={open:l('Open','Ouvert'),won:l('Won','Gagné'),lost:l('Lost','Perdu'),void:l('Voided','Annulé'),cashed:l('Cashed out','Racheté')};
  const fmt=new Intl.DateTimeFormat(fr?'fr-CA':'en-CA',{dateStyle:'short',timeStyle:'medium'});
  const command=(name,label)=>'<button type="button" class="ghost" data-hub-control="'+name+'" '+(state.busy?'disabled':'')+'>'+label+'</button>';
  return (state.book?.history||[]).map(h=>{
    const rows=h.legs.map(v=>'<li>'+outcome(byId.get(v.id),v.pick,fr)+' <b>'+Number(v.price/100).toLocaleString(fr?'fr-CA':'en-CA',{minimumFractionDigits:2})+'</b></li>').join('');
    let action='';
    if(h.state==='open'){
      const offer=state.quote?.slip===h.id?state.quote:null;
      action=offer?'<p>'+money(offer.value,fr)+' · '+l('valid until ','valide jusqu’à ')+fmt.format(offer.expires)+'</p>'+command('book-cash',l('Accept cash out','Accepter le rachat')):
        command('book-full-'+h.id,l('Full cash out','Rachat total'))+(h.remaining>1?command('book-half-'+h.id,l('Cash out half','Rachat de la moitié')):'');
    }
    return '<article class="slip-history-card"><h3>#'+h.id+' · '+status[h.state]+' <time>'+fmt.format(h.at)+'</time></h3><ul>'+rows+'</ul><p>'+l('Stake','Mise')+' '+money(h.stake,fr)+' · '+l('Still in play','Mise restante')+' '+money(h.remaining,fr)+'</p>'+action+(h.receipt?'<small>'+l('Receipt','Reçu')+' #'+h.receipt+'</small>':'')+'</article>';
  }).join('');
}
export function stakeControls(state,fr){
  if(!state.book?.owner)return '';
  const l=(en,french)=>fr?french:en;
  return '<label class="book-stake">'+l('Stake in demo CAD','Mise en CAD fictifs')+'<input data-book-stake type="number" inputmode="decimal" step="0.01" min="0.01" max="'+state.book.limits.maxStake/100+'" value="'+(state.stake??1)+'"></label>';
}

export function sportsAdmin(view,{get,post,t,ui}){
  const {el,l,field}=ui, section=el('details'),content=el('div');
  section.append(el('summary',l('Demo markets, limits and results','Marchés démo, limites et résultats')),content);view.append(section);
  async function load(note=''){
    const message=el('p',note);message.setAttribute('role','status');content.replaceChildren(message);
    try{
      const data=await get('sports');
      function editor(title,inputs){
        const form=el('form','','discovery-form');form.append(el('h4',title));content.append(form);
        const payload=inputs(form),submit=el('button',l('Save','Enregistrer'));submit.type='submit';form.append(submit);
        form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await post('sports',payload());await load(l('Saved.','Enregistré.'));}
          catch(err){message.textContent=t(err.message);submit.disabled=false;}};
      }
      const numeric=(form,name,label,value,min,step)=>field(form,name,label,{type:'number',value,min,step,required:true});
      editor(l('Exposure limits in demo CAD','Limites d’exposition en CAD fictifs'),form=>{
        const cap=numeric(form,'stake',l('Maximum stake','Mise maximale'),data.limits.maxStake/100,0.01,0.01);
        const exp=numeric(form,'risk',l('Total open liability','Exposition ouverte totale'),data.limits.liability/100,0.01,0.01);
        return ()=>({action:'limits',version:data.limits.version,maxStake:Math.round(Number(cap.value)*100),liability:Math.round(Number(exp.value)*100)});
      });
      const selector=el('label',l('Match','Match')),select=el('select'),area=el('div');
      for(const m of data.markets){const opt=el('option',byId.get(m.id).teams.join(' / '));opt.value=m.id;select.append(opt);}
      selector.append(select);content.append(selector,area);
      function marketForm(){
        area.replaceChildren();const m=data.markets.find(v=>v.id===select.value),fixture=byId.get(m.id),fr=ui.l('en','fr')==='fr';
        editor(fixture.teams.join(' / '),form=>{
          area.append(form);
          const prices=m.prices.map((n,i)=>numeric(form,'price'+i,outcome(fixture,i,fr),n/100,1.01,0.01));
          const status=field(form,'status',l('Market status','État du marché'),{items:[['open',l('Open','Ouvert')],['suspended',l('Suspended','Suspendu')],['final',l('Settle result','Régler le résultat')],['void',l('Void market','Annuler le marché')]],value:m.status});
          const winning=field(form,'winner',l('Winning outcome','Résultat gagnant'),{items:m.prices.map((_,i)=>[String(i),outcome(fixture,i,fr)]),value:String(m.winning??0)});
          const adjust=()=>{winning.disabled=status.value!=='final';};status.onchange=adjust;adjust();
          return ()=>({action:'market',id:m.id,version:m.version,status:status.value,prices:prices.map(p=>Math.round(Number(p.value)*100)),winning:Number(winning.value)});
        });
      }
      select.onchange=marketForm;marketForm();
    }catch(err){message.textContent=t(err.message);}
  }
  section.addEventListener('toggle',()=>{if(section.open)void load();});
}
