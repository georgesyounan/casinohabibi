const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function marketPanel(data,fr,tab,base) {
  if(!data)return '';
  const l=(en,frText)=>fr?frText:en;
  const when=n=>new Intl.DateTimeFormat(fr?'fr-CA':'en-CA',{dateStyle:'medium',timeStyle:'short'}).format(n);
  const act=(key,label,attrs='',disabled=false)=>data.wallet?
    `<button type="button" class="ghost" data-member-action="${key}" ${attrs} ${disabled?'disabled':''}>${safe(label)}</button>`:
    `<a class="club-signin" data-club-action="login" href="${safe(base)}/?lang=${fr?'fr':'en'}&amp;view=promotions&amp;club=${tab}&amp;access=signin#player-club">${l('Sign in','Se connecter')}</a>`;
  if(tab==='rewards' && data.promotions){
    const d=data.promotions,o=d.offer,m=x=>new Intl.NumberFormat(fr?'fr-CA':'en-CA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(x/100);
    const attrs='data-period="'+d.period+'"';
    const row=(name,info,action)=>'<li><div><strong>'+name+'</strong><small>'+info+'</small></div>'+action+'</li>';
    let list=row(l('Play-through bonus','Bonus de mise'),o?m(Math.min(o.progress,d.rules.target))+' / '+m(d.rules.target)+' · '+(o.unlocked?l('Credited','Crédité'):o.expired?l('Expired','Expiré'):safe(when(o.expires))):l('10 demo units unlock after 20 in settled Gold or Aurora stakes within 7 days.','10 unités fictives sont créditées après 20 unités misées et réglées sur Gold ou Aurora en 7 jours.'),o?'':act('bonus-start',l('Activate','Activer'),attrs));
    list+=row(l('Weekly net-loss cashback','Remise sur la perte nette'),l('Previous week · 10%, up to 25 demo units','Semaine précédente · 10 %, jusqu’à 25 unités fictives')+' · '+m(d.cashback.amount),act('bonus-cashback',d.cashback.claimed?l('Claimed','Réclamé'):l('Claim','Réclamer'),attrs,!d.cashback.amount||d.cashback.claimed));
    list+=row(l('Studio demo spin','Tour du studio fictif'),l('Gold · one free spin per week','Gold · un tour gratuit par semaine'),d.spin?act('bonus-spin-use',d.spin.used?l('Played','Joué'):l('Play spin','Jouer le tour'),attrs+' data-ref="'+safe(d.spin.ref)+'"',d.spin.used):act('bonus-spin-grant',l('Get spin','Obtenir le tour'),attrs));
    const link=data.telegram?.linked?'<p>Telegram · '+l('Linked','Associé')+' '+act('unlink',l('Unlink','Dissocier'))+'</p>':'';
    const labels={crm:l('Promotional CRM email','Courriels promotionnels CRM'),telegram:l('Telegram promotions','Promotions Telegram'),affiliate:l('Referral activity','Activité de parrainage'),account:l('Account events','Événements du compte'),wallet:l('Wallet receipt references','Références des reçus du portefeuille')};
    const sharing=data.sharing?'<details><summary>'+l('Sharing preferences','Préférences de partage')+'</summary><ul class="club-rows">'+Object.entries(data.sharing).map(([k,on])=>row(labels[k],on?l('Allowed','Autorisé'):l('Off','Désactivé'),act('sharing',on?l('Turn off','Désactiver'):l('Allow','Autoriser'),'data-purpose="'+k+'" data-enabled="'+(on?0:1)+'"'))).join('')+'</ul></details>':'';
    const desk=data.cashier;const drafts=desk?.drafts?.map(d=>row('#'+safe(d.id),m(d.amount)+' TST · '+safe(d.state),d.state==='draft'?act('cashier-confirm',l('Confirm demo withdrawal','Confirmer le retrait fictif'),'data-ref="'+safe(d.id)+'"',!desk.allowed):'')).join('');
    const expenses=desk?.vouchers;const railPanel=expenses?.enabled||expenses?.items?.length?'<details><summary>'+l('SPEI and OXXO test deposits','Dépôts de test SPEI et OXXO')+'</summary><p>'+l('Simulated references, denominated in TST.','Références fictives en unités TST.')+'</p>'+(expenses.enabled?'<label>'+l('Amount','Montant')+'<select data-voucher-amount><option value="500">5 TST</option><option value="1000">10 TST</option><option value="2000">20 TST</option></select></label>'+['spei','oxxo'].map(k=>act('cashier-deposit',k.toUpperCase(),'data-route="'+k+'"')).join(''):'')+expenses.items.map(v=>'<p>'+safe(v.reference)+' · '+m(v.amount)+' TST · '+safe(v.status)+' · '+safe(when(v.expires))+'</p>').join('')+'</details>':'';
    const cashier=drafts?'<section><h3>'+l('My demo cashier','Ma caisse fictive')+'</h3>'+(desk.reason==='payout_hold'?'<p>'+l('A payout hold applies.','Un blocage des retraits est actif.')+'</p>':'')+'<ul class="club-rows">'+drafts+'</ul></section>':'';
    const wallet=data.networkEnabled?'<p><a class="club-signin" href="'+safe(base)+'/demo-wallet.html?lang='+(fr?'fr':'en')+'">'+l('Test network wallet','Portefeuille du réseau de test')+'</a></p>':'';
    return wallet+railPanel+cashier+sharing+'<h3>'+l('Demo offers','Offres fictives')+'</h3><ul class="club-rows">'+list+'</ul>'+link;
  }
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
  let awards='';
  const p=data.prizes;
  if(p){
    const claimState={pending:l('Pending','En attente'),denied:l('Returned','Restitué'),fulfilled:l('Award delivered','Prix remis')};
    const controls=p.member?
      '<p>'+l('Play coins','Jetons loisir')+' · '+p.play+' &nbsp; '+l('Prize units','Unités de prix')+' · '+p.prize+'</p>'+
      act('prize-free',p.entered?l('Entered today','Participation enregistrée'):l('Free daily entry','Participation quotidienne gratuite'),'data-period="'+safe(p.period)+'"',p.entered)+
      act('prize-request',l('Request a demo prize','Demander un prix fictif')+' · '+p.rules.threshold,'data-amount="'+p.rules.threshold+'"',p.prize<p.rules.threshold)+
      p.claims.map(c=>'<p>#'+c.id+' · '+c.amount+' · '+claimState[c.state]+'</p>').join(''):
      act('prize-join',l('Join the prize demo','Rejoindre le programme fictif'));
    awards='<details class="club-tourney" data-prize-program><summary>'+l('Free entries and demo prizes','Participations gratuites et prix fictifs')+'</summary><p>'+l('Join for 100 play coins and 5 prize units. Each free entry grants ','À l’inscription, recevez 100 jetons loisir et 5 unités de prix. Chaque participation gratuite ajoute ')+p.rules.freeUnits+
      l(' prize units. Daily reset in ',' unités de prix. Journée selon le fuseau ')+safe(p.rules.zone)+'.</p>'+controls+'</details>';
  }
  return awards+'<h3>'+l('Club tournaments','Tournois du Club')+'</h3>'+ (cards.join('')||'<p>'+l('No tournaments scheduled.','Aucun tournoi programmé.')+'</p>');
}
