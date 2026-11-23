const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function dealerLobby(root,{show,fr,api,identity,signIn,start}){
 const key=JSON.stringify([show,fr,identity]);root.hidden=!show;if(!show){root.dataset.key='';return;}if(root.dataset.key===key)return;root.dataset.key=key;
 const l=(en,f)=>fr?f:en;
 async function load(){
   try{const {items}=await api('account/dealer-tables',undefined,'GET');if(root.dataset.key!==key)return;
     root.replaceChildren(el('h3',l('Demo dealer tables','Tables de croupiers en démo')));const grid=el('div');grid.className='dealer-grid';root.append(grid);
     for(const item of items){const card=el('article');card.className='club-tourney';const btn=el('button',item.seat?l('Return to table','Reprendre ma place'):l('Take a seat','Prendre place'));
       btn.type='button';btn.disabled=!item.free&&!item.seat;card.append(el('h4',item.title),el('p',item.provider+' · '+item.lang.toUpperCase()+' · '+item.free+'/'+item.capacity+' '+l('seats free','places libres')),btn);
       btn.onclick=async()=>{if(!identity){signIn();return;}btn.disabled=true;try{const session=await api('account/dealer-tables',{action:'enter',table:item.id});start(session.game,undefined,undefined,session.id);await load();}catch{await load();}};
       if(item.seat){const exit=el('button',l('Leave table','Quitter la table'));exit.type='button';exit.className='ghost';exit.onclick=async()=>{try{await api('account/dealer-tables',{action:'leave',seat:item.seat});}finally{await load();}};card.append(exit);}grid.append(card);}
   }catch{root.replaceChildren(el('p',l('Tables temporarily unavailable.','Tables temporairement indisponibles.')));root.dataset.key='';}
 }
 void load();
}
