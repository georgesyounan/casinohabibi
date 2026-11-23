export function membershipAdmin(body,{api,t,ui}){
  const {l,el,field}=ui,card=el('details','','discovery-card');
  card.append(el('summary',l('Points shop and tournaments','Boutique de points et tournois')));
  const content=el('div');card.append(content);body.append(card);
  let revision=0;
  async function refresh(note=''){
    const id=++revision;
    const status=el('p',note);status.setAttribute('role','status');content.replaceChildren(status);
    try{
      const data=await api('admin/discovery/membership',undefined,'GET');if(revision!==id)return;
      function form(title,submit,build){
        const section=el('details'),node=el('form','','discovery-form'),message=el('p');message.setAttribute('role','status');
        section.append(el('summary',title),node);content.append(section);
        const getInput=build(node),go=el('button',submit);go.type='submit';node.append(go,message);
        node.addEventListener('submit',async e=>{
          e.preventDefault();if(go.disabled)return;go.disabled=true;
          try{await api('admin/discovery/membership',getInput());if(revision===id)await refresh(l('Saved.','Enregistré.'));}
          catch(err){message.textContent=t(err.message);go.disabled=false;}
        });
      }
      const nfield=(node,name,label,initial,min=1)=>field(node,name,label,{type:'number',min,step:1,value:initial,required:true});
      const select=(node,label,pairs,chosen)=>{const wrap=el('label',label),s=el('select');for(const [v,txt] of pairs){const o=el('option',txt);o.value=v;s.append(o);}s.value=chosen;wrap.append(s);node.append(wrap);return s;};
      form(l('Reserved trending slots','Places réservées dans les tendances'),l('Save slot','Enregistrer la place'),node=>{
        const slot=select(node,l('Position','Position'),[1,2,3,4].map(i=>[String(i),'#'+i]),'1');
        const game=select(node,l('Game','Jeu'),[['',l('Rank by activity','Classer selon l’activité')],['gold','Gold Rush'],['roulette','Roulette'],['blackjack','Blackjack'],['aurora','Aurora']],data.pins.find(p=>p.slot===1)?.game||'');
        slot.onchange=()=>{game.value=data.pins.find(p=>p.slot===Number(slot.value))?.game||'';};
        return ()=>({action:'trend',slot:Number(slot.value),game:game.value});
      });
      form(l('Free entries and prize rules','Participations gratuites et prix'),l('Save rules','Enregistrer les règles'),node=>{
        const prev=data.prizes.rules,threshold=nfield(node,'minimum',l('Redemption threshold','Seuil de remise'),prev.threshold);
        const free=nfield(node,'units',l('Units per free entry','Unités par participation gratuite'),prev.freeUnits);
        const zone=field(node,'zone',l('Day boundary time zone','Fuseau de la journée'),{value:prev.zone,required:true});
        return ()=>({action:'prize-rules',threshold:Number(threshold.value),freeUnits:Number(free.value),zone:zone.value,version:prev.version});
      });
      for(const c of data.prizes.claims.filter(x=>x.state==='pending')){
        form(l('Prize request','Demande de prix')+' #'+c.id+' · '+c.amount,l('Record decision','Enregistrer la décision'),node=>{
          const state=select(node,l('Decision','Décision'),[['denied',l('Decline and return units','Refuser et restituer les unités')],['fulfilled',l('Award demo prize','Remettre le prix fictif')]],'denied');
          const check=field(node,'checked',l('Player and eligibility checked','Compte et admissibilité vérifiés'),{type:'checkbox'});
          const reason=field(node,'reason',l('Decision note','Motif de la décision'),{required:true,maxLength:200});
          return ()=>({action:'prize-decision',id:c.id,state:state.value,checked:check.checked,reason:reason.value});
        });
      }
      form(l('VIP rules','Règles VIP'),l('Save rules','Enregistrer les règles'),node=>{
        const threshold=nfield(node,'threshold',l('VIP threshold in points','Seuil VIP en points'),data.rules.threshold);
        const rule=select(node,l('After a reversal','Après une correction'),[['1',l('Recalculate tier','Recalculer le palier')],['0',l('Keep earned tier','Conserver le palier acquis')]],String(data.rules.demote));
        return ()=>({action:'rules',version:data.rules.version,threshold:Number(threshold.value),demote:rule.value==='1'});
      });
      form(l('Award points or reverse an entry','Attribuer des points ou annuler une écriture'),l('Record','Enregistrer'),node=>{
        const action=select(node,l('Action','Action'),[['award',l('Award','Attribuer')],['reverse',l('Reverse','Annuler')]],'award');
        const player=nfield(node,'player',l('Player ID','Identifiant joueur'),'');
        const amount=nfield(node,'amount',l('Points to award','Points à attribuer'),1);
        const id=nfield(node,'entry',l('Journal entry to reverse','Écriture à annuler'),1);
        function show(){amount.parentElement.hidden=action.value!=='award';id.parentElement.hidden=action.value!=='reverse';}
        action.addEventListener('change',show);show();
        const reason=field(node,'reason',l('Reason','Motif'),{required:true,maxLength:160});
        const key=crypto.randomUUID();return ()=>({action:action.value,player:Number(player.value),amount:Number(amount.value),id:Number(id.value),reason:reason.value.trim(),key});
      });
      for(const item of [...data.items,null]){
        form(item?(item.fr+' · '+item.stock):l('Add a shop item','Ajouter un article'),l('Save item','Enregistrer l’article'),node=>{
          const sku=field(node,'sku',l('Item code','Code d’article'),{value:item?.sku||'',required:true});sku.readOnly=Boolean(item);
          const en=field(node,'en',l('English name','Nom anglais'),{value:item?.en||'',required:true});
          const fr=field(node,'fr',l('French name','Nom français'),{value:item?.fr||'',required:true});
          const price=nfield(node,'price',l('Price in points','Prix en points'),item?.price||1);
          const stock=nfield(node,'stock',l('Available units','Unités disponibles'),item?.stock??1,0);
          return ()=>({action:'item',sku:sku.value,en:en.value,fr:fr.value,price:Number(price.value),stock:Number(stock.value),version:item?.version||0});
        });
      }
      if(data.orders.length){
        const orders=el('details');orders.append(el('summary',l('Shop orders','Commandes en boutique')));content.append(orders);
        for(const row of data.orders){
          const p=el('p','#'+row.id+' · '+row.sku+' · '+row.price+' pts · '+row.state);
          if(row.state==='reserved'){const button=el('button',l('Mark delivered','Confirmer la livraison'));button.type='button';
            button.onclick=async()=>{button.disabled=true;try{await api('admin/discovery/membership',{action:'deliver',id:row.id});await refresh();}catch(err){status.textContent=t(err.message);button.disabled=false;}};p.append(' ',button);}
          orders.append(p);
        }
      }
      form(l('Create a tournament','Créer un tournoi'),l('Create tournament','Créer le tournoi'),node=>{
        const title=field(node,'title',l('Tournament name','Nom du tournoi'),{required:true,maxLength:90});
        const start=field(node,'start',l('Local start','Début en heure locale'),{type:'datetime-local',required:true});
        const end=field(node,'end',l('Local end','Fin en heure locale'),{type:'datetime-local',required:true});
        const vip=select(node,l('Eligible members','Membres admissibles'),[['all',l('All members','Tous les membres')],['vip','VIP']],'all');
        const tie=select(node,l('Tie-break','Départage'),[['first-entry',l('Entry time','Heure d’inscription')],['last-point',l('Time score was reached','Heure du dernier point')]],'first-entry');
        const prize=nfield(node,'prize',l('Prize in points','Prix en points'),40);
        return ()=>({action:'tournament',title:title.value,start:new Date(start.value).valueOf(),end:new Date(end.value).valueOf(),vip:vip.value==='vip',tie:tie.value,prize:Number(prize.value)});
      });
      for(const tour of data.tournaments)content.append(el('p',tour.title+' · '+tour.prize+' pts · '+(tour.state==='closed'?l('Closed','Terminé'):new Date(tour.ends).toLocaleString())));
    }catch(err){if(id===revision)status.textContent=t(err.message);}
  }
  card.addEventListener('toggle',()=>{if(card.open)void refresh();});
}
