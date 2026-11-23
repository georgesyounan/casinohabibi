const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function marketPanel(data,fr,tab,base) {
  if(!data)return '';
  const l=(en,frText)=>fr?frText:en;
  const when=n=>new Intl.DateTimeFormat(fr?'fr-CA':'en-CA',{dateStyle:'medium',timeStyle:'short'}).format(n);
  const act=(key,label,attrs='',disabled=false)=>data.wallet?
    `<button type="button" class="ghost" data-member-action="${key}" ${attrs} ${disabled?'disabled':''}>${safe(label)}</button>`:
    `<a class="club-signin" data-club-action="login" href="${safe(base)}/?lang=${fr?'fr':'en'}&amp;view=promotions&amp;club=${tab}&amp;access=signin#player-club">${l('Sign in','Se connecter')}</a>`;
  if(tab==='rewards' && data.telegram?.linked)return `<div class="club-member-line"><span>Telegram · ${l('Linked','Associé')} ${safe(when(data.telegram.since))}</span>${act('unlink',l('Unlink Telegram','Dissocier Telegram'))}</div>`;
  if(tab==='shop'){
    const wallet=data.wallet;
    const balance=wallet?'<p><strong>'+wallet.available+' pts</strong> · '+(wallet.vip?'VIP':l('VIP at ','VIP à ')+wallet.threshold+' pts')+'</p>':'';
    const items=data.items.map(item=>`<li><div><strong>${safe(fr?item.fr:item.en)}</strong><small>${item.price} pts · ${item.stock} ${l('available','en stock')}</small></div>${act('purchase',l('Reserve','Réserver'),`data-sku="${safe(item.sku)}" data-price="${item.price}"`,!item.stock||wallet?.available<item.price)}</li>`).join('');
    const states={reserved:l('Reserved','Réservé'),cancelled:l('Cancelled','Annulé'),delivered:l('Delivered','Livré')};
    const orders=data.orders.map(o=>`<li><div><strong>#${o.id} · ${safe(fr?o.fr:o.en)}</strong><small>${states[o.state]} · ${o.price} pts</small></div>${o.state==='reserved'?act('cancel',l('Cancel','Annuler'),'data-id="'+o.id+'"'):''}</li>`).join('');
    const reasons={gift:l('Daily gift','Cadeau quotidien'),quest:l('Quest','Quête'),staff:l('Staff award','Attribution du personnel'),invite:l('Referral','Parrainage'),order:l('Order','Commande'),cancel:l('Cancellation','Annulation'),reversal:l('Reversal','Correction'),tournament:l('Tournament prize','Prix de tournoi')};
    const log=data.journal.map(p=>`<li><span>${safe(reasons[p.source.split('/')[0]]||l('Club entry','Opération du Club'))}<small>${safe(when(p.at))} · #${p.id}</small></span><b>${p.delta>0?'+':''}${p.delta} pts</b></li>`).join('');
    return '<h3>'+l('Points shop','Boutique de points')+'</h3>'+balance+'<ul class="club-rows">'+items+'</ul>'+(orders?'<details><summary>'+l('My orders','Mes commandes')+'</summary><ul class="club-rows">'+orders+'</ul></details>':'')+(log?'<details><summary>'+l('Points history','Historique des points')+'</summary><ul class="club-rows">'+log+'</ul></details>':'');
  }
  if(tab!=='tournaments')return '';
  const cards=data.tournaments.map(t=>{
    const terms=(t.minTier?'VIP':l('All members','Tous les membres'))+' · '+(t.tie==='first-entry'?l('Tie: first entrant','Égalité selon l’ordre d’inscription'):l('Tie: score reached first','Égalité selon l’heure du dernier point'));
    const ranking=t.leaders.map(row=>`<li><b>#${row.place}</b><span>${row.score} pts ${row.mine?l('(you)','(vous)'):''}</span>${row.winner?'🏆':''}</li>`).join('');
    const participation=t.own?'<strong>'+l('Your rank','Votre rang')+' #'+t.own.place+' · '+t.own.score+' pts</strong>':t.closed?'':act('enter',l('Enter','Participer'),'data-id="'+t.id+'"',t.minTier && !data.wallet?.vip);
    return `<article class="club-tourney"><h4>${safe(t.title)}</h4><p>${t.prize} pts · ${t.closed?l('Closed','Terminé'):l('Ends','Fin')} ${safe(when(t.ends))}</p><small>${safe(terms)}</small><p>${l('Earn one point per daily gift and three per completed quest after entry.','Après inscription, un cadeau quotidien vaut un point et une quête terminée en vaut trois.')}</p>${participation}${ranking?'<ol class="club-ranks">'+ranking+'</ol>':''}</article>`;
  });
  return '<h3>'+l('Club tournaments','Tournois du Club')+'</h3>'+ (cards.join('')||'<p>'+l('No tournaments scheduled.','Aucun tournoi programmé.')+'</p>');
}
