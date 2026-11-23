import { marketPanel } from './club-market.js';
import { games } from './catalog.js';
import { questTasks } from './discovery.js';

const sections = ['daily','quests','rewards','league','shop','tournaments'];
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const action = (name,label,id,disabled=false) => `<button type="button" data-club-action="${name}"${id?` data-program="${Number(id)}"`:''}${disabled?' disabled':''}>${esc(label)}</button>`;
const levelNames = [['Rookie','Recrue'],['Scout','Éclaireur'],['All-Star','Étoile'],['Icon','Icône']];
const levelSteps = [0,5,15,30];
const pointsOf = points => points ? points.gifts + 3*points.quests : 0;
const money = (amount,fr) => new Intl.NumberFormat(fr?'fr-CA':'en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:amount%100?2:0,maximumFractionDigits:2}).format(amount/100);
export function clubSection(view, requested) {
  return sections.includes(requested) ? requested : view==='promotions' ? 'daily' : '';
}

export function clubMarkup(data, french, base, selected='', board=null, status='') {
  const l=(en,fr)=>french?fr:en, locale=l('en','fr'), col=l('En','Fr'), member=Boolean(data.points);
  const labels = {daily:l('Daily bonus','Bonus du jour'),quests:l('Quests','Quêtes'),rewards:l('Rewards','Récompenses'),league:l('Weekly league','Ligue hebdo'),shop:l('Points shop','Boutique'),tournaments:l('Tournaments','Tournois')};
  const icons = {daily:'engagement',quests:'review',rewards:'layers',league:'growth',shop:'engagement',tournaments:'active'};
  const titles = data.items.filter(i=>i.template!=='offer');
  const ready=data.items.filter(i=>i.state==='claimable').length;
  const amount=money(data.amount,french);
  const count=(n,en,fr)=>`${n} ${l(en,fr)}${n===1?'':'s'}`;
  const caption = {
    daily: !data.enabled&&!data.claimed?l('Paused','En pause'):data.claimed?l('Collected today','Réclamé aujourd’hui'):l(amount+' in demo credits',amount+' en crédits démo'),
    quests:count(titles.length,'quest','quête'),
    rewards: ready?l(ready+' ready to claim',ready+' à réclamer'):count(data.items.length,'collectible','objet'),
    league:l('View standings','Voir le classement'),shop:l('Spend club points','Utiliser ses points'),tournaments:l('Entries and prizes','Inscriptions et prix')
  };
  const nav=sections.filter(key=>key!=='daily'||data.enabled||data.claimed||selected==='daily').map(key=>`<a class="club-tile club-${key}" id="club-link-${key}" data-club-card="${key}" aria-controls="club-panel" aria-expanded="${selected===key}" href="${esc(base)}/?lang=${locale}&amp;view=promotions&amp;club=${key}#player-club"><i class="ui-icon ico-${icons[key]}" aria-hidden="true"></i><span><strong>${labels[key]}</strong><small>${esc(caption[key])}</small></span><i class="ui-icon ico-next" aria-hidden="true"></i></a>`).join('');
  const signInHref=esc(base)+'/?lang='+locale+'&amp;view=promotions&amp;club='+selected+'&amp;access=signin#player-club';
  const cta=(name,label,id)=>member ? action(name,label,id,data.blocked) :
    `<a class="club-signin" data-club-action="${name}"${id?` data-program="${Number(id)}"`:''} href="${signInHref}">${l('Sign in','Se connecter')}</a>`;
  const unblock = data.blocked ? `<p>${l('Your club activities are paused.','Les activités du club sont en pause sur votre compte.')}</p>` : '';
  let detail='';
  if(selected==='daily'){
    const time=new Intl.DateTimeFormat(l('en-CA','fr-CA'),{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(data.next));
    detail=`<div class="club-daily-detail"><div><h3>${l('Your daily gift','Votre cadeau quotidien')}</h3><p>${l('Collect '+amount+' in play money once each UTC day. No wager is required.', 'Recevez '+amount+' en argent fictif une fois par jour UTC, sans mise.')}</p><small>${esc(l('Renews at ','Renouvellement à ')+time)}</small></div>${data.claimed?action('daily',l('Collected today','Réclamé aujourd’hui'),null,true):cta('daily',l('Claim '+amount,'Réclamer '+amount))}</div>${unblock}`;
  }
  if(selected==='daily' && !data.enabled && !data.claimed)detail=`<p>${l('The daily bonus is currently paused.','Le bonus quotidien est présentement en pause.')}</p>`;
  if(selected==='quests'||selected==='rewards'){
    const quests=selected==='quests', list=quests?titles:data.items, tasks=questTasks(l);
    const rows=list.slice(0,6).map(i=>{
      let control, line;
      if(i.owned){ control=action('profile',l('View in profile','Voir dans mon profil'),i.id); }
      else if(i.state==='claimable' || i.template==='offer'){control=cta('claim',l('Claim','Réclamer'),i.id);}
      else if(i.state==='enrolled'){control=cta('continue',l('Continue','Continuer'),i.id);}
      else if(['paused','soldOut'].includes(i.state)){control=action('none',i.state==='paused'?l('Paused','En pause'):l('Out of stock','Épuisé'),i.id,true);}
      else{control=cta('join',l('Start quest','Commencer'),i.id);}
      if(quests){
        line=`<p>${esc(tasks[i.template]||'')}</p><small>${esc(l('Unlock ','À gagner · ')+i['item'+col])}</small>`;
      }else{
        line=`<p>${esc(i['title'+col])}</p>`;
      }
      if(!quests && i.deadline)line+='<small>'+l('Claim before ','À réclamer avant le ')+esc(new Intl.DateTimeFormat(french?'fr-CA':'en-CA',{dateStyle:'medium',timeStyle:'short'}).format(i.deadline))+'</small>';
      const progress=quests && member && (i.done||i.state==='enrolled') ? `<span class="club-progress"><progress aria-label="${l('Quest progress','Progression de la quête')}" max="${i.goal}" value="${i.done}"></progress> ${i.done}/${i.goal}</span>` : '';
      return `<li><div><strong>${esc(i[(quests?'title':'item')+col])}</strong>${line}${progress}</div>${control}</li>`;
    }).join('');
    const more=member?action(quests?'allQuests':'allRewards',l('Open player club','Ouvrir le club des joueurs')):'';
    detail=`<h3>${quests?l('Choose a quest','Choisissez une quête'):l('Reward collection','Collection de récompenses')}</h3>${unblock}<ul class="club-rows">${rows}</ul>${rows?'':`<p>${l('New items will appear here when published.','Les prochains articles apparaîtront ici dès leur publication.')}</p>`}${more}`;
  }
  if(selected==='league'){
    const points=pointsOf(data.points), index=levelSteps.findLastIndex(step=>points>=step),next=levelSteps[index+1];
    const level = member ? `<div class="club-level"><strong>${l('My level','Mon niveau')} · ${levelNames[index][Number(french)]}</strong><span>${points} pts</span>${next?`<progress max="${next-levelSteps[index]}" value="${points-levelSteps[index]}" aria-label="${l('Level progress','Progression du niveau')}"></progress><small>${esc(l('Next level at '+next+' pts','Prochain niveau à '+next+' pts'))}</small>`:''}</div>`:'';
    let ranking=`<p>${l('Loading standings…','Chargement du classement…')}</p>`;
    if(board){
      const rows=board.rows.map(r=>`<li><b>#${r.rank}</b><span>${count(r.players,'member','membre')}</span><strong>${r.score} pts</strong></li>`).join('');
      ranking=rows?`<ol class="club-ranks">${rows}</ol>`:`<p>${l('No points recorded this week yet.','Aucun point enregistré cette semaine pour le moment.')}</p>`;
      if(member)ranking+=`<p>${board.own?l('Your rank','Votre rang')+' · #'+board.own.rank+' · '+board.own.score+' pts':l('Your weekly score','Votre pointage de la semaine')+' · 0 pts'}</p>`;
    }
    detail=`<h3>${l('This week’s standings','Classement de la semaine')}</h3><p>${l('Daily bonus +1 point. Completed quest +3 points. The league restarts on Mondays at 00:00 UTC. Your level keeps all earned points.','Bonus quotidien +1 point. Quête terminée +3 points. La ligue recommence le lundi à 0 h UTC. Votre niveau conserve tous les points gagnés.')}</p>${level}${data.membership?.wallet?'<p>VIP · '+(data.membership.wallet.vip?l('Active','Actif'):data.membership.wallet.earned+' / '+data.membership.wallet.threshold+' pts')+'</p>':''}${ranking}`;
  }
  detail+=marketPanel(data.membership,french,selected,base);
  const period=data.period===7?7:1;
  const periodNav='<div class="club-period" role="group" aria-label="'+l('Trend period','Période des tendances')+'">'+[1,7].map(n=>'<button type="button" class="ghost" data-club-days="'+n+'" aria-pressed="'+(period===n)+'">'+(n===1?'24 h':l('7 days','7 jours'))+'</button>').join('')+'</div>';
  const trending=data.trending?.length>0;
  const picks=trending?data.trending:games.slice(0,3);
  const trends=picks.map(row=>{
    const game=games.find(g=>g.id===row.id);
    const gain=trending && row.topWin>0 ? l(' · Best win +',' · Meilleur gain +')+money(row.topWin,french) : '';
    return `<a data-club-game="${game.id}" href="${esc(base)}/?lang=${locale}#home-originals"><img width="43" height="34" loading="lazy" alt="" src="${esc(base)}/game-${game.id}.webp"><span><b>${esc(game.name[Number(french)])}</b><small>${trending?esc(count(row.rounds,'round','partie')+gain):l('Play demo','Jouer à la démo')}</small></span></a>`;
  }).join('');
  return `<div class="club-heading"><h2>Club Habibi</h2><a class="hub-link" href="${esc(base)}/?lang=${locale}&amp;view=invite">${l('Invite a friend','Inviter un ami')} <i class="ui-icon ico-next" aria-hidden="true"></i></a></div><nav class="club-tiles" aria-label="${l('Player club','Club des joueurs')}">${nav}</nav><div id="club-panel"${selected?` role="region" aria-labelledby="club-link-${selected}"`:' hidden'}>${detail}</div><p class="club-status" role="status">${esc(status)}</p><div class="club-trends"><h3>${trending?l('Trending','Tendances'):l('Studio picks','Sélection du studio')}</h3>${periodNav}${trends}</div>`;
}

export function createClubHome({root,api,base,french,account,accountPending=()=>false,signIn,openClub,openGame,updateAccount,translate}) {
  const boot=document.getElementById('club-public-model');
  let snapshot=boot ? JSON.parse(boot.textContent) : null;
  const params=new URLSearchParams(location.search);
  const routeKey=query=>location.pathname+'?'+(query.get('view')||'')+'/'+(query.get('club')||'');
  let board=null,selection=clubSection(params.get('view'),params.get('club')),locationKey=routeKey(params),owner=snapshot?0:undefined;
  let period=params.get('trends')==='7'?7:1;
  let memberRequest=null;
  let version=0,reading=false,busy=false,status='',timer;
  let signature='',boardRequest=0,boardLoading,modelLocale,freshUntil=0;
  if(snapshot)root.dataset.personal='false';
  const auth=()=>account()?.id||0;
  const msg=(en,fr)=>french()?fr:en;
  function paint() {
    if(!snapshot)return;
    const html=clubMarkup(snapshot,french(),base,selection,board,status);
    if(html===signature)return;
    const focused=document.activeElement, hadFocus=root.contains(focused);
    const key=hadFocus && (focused.dataset.clubCard || focused.dataset.clubAction);
    const id=hadFocus && focused.dataset.program;
    root.innerHTML=html; signature=html;
    if(key){
      const candidates=[...root.querySelectorAll('[data-club-card],[data-club-action]')];
      const next=candidates.find(el=>(el.dataset.clubCard===key||el.dataset.clubAction===key)&&el.dataset.program===id&&!el.disabled)
        || candidates.find(el=>id && el.dataset.program===id && !el.disabled) || root.querySelector('[data-club-card="'+selection+'"]');
      next?.focus({preventScroll:true});
    }
  }
  function setSnapshot(data){
    snapshot=data;freshUntil=Math.min(data.next,Date.now()+60_000);clearTimeout(timer);
    timer=setTimeout(()=>{if(!document.hidden&&!busy)sync(true);},Math.max(300,Math.min(60_000,data.next-Date.now()+100)));
    paint();
  }
  function showError(err) {
    status=translate(err.message);
    if(!status||status===translate('unavailable'))status=msg('Could not load the club. Please try again.','Impossible de charger le club. Réessayez.');
    paint();
    if(!snapshot){const p=root.querySelector('.club-status');if(p)p.textContent=status;}
  }
  async function readBoard(){
    if(selection!=='league')return;
    const current=auth();
    if(boardLoading?.owner===current && boardLoading.ticket===boardRequest)return;
    const ticket=++boardRequest;boardLoading={ticket,owner:current};
    try{const next=await api('discovery/standings',undefined,'GET');if(ticket===boardRequest&&current===auth()){board=next;paint();}}
    catch(e){if(ticket===boardRequest&&current===auth()){showError(e);}}
    finally{if(boardLoading?.ticket===ticket)boardLoading=null;}
  }
  async function sync(force=false){
    const params=new URLSearchParams(location.search), view=params.get('view'),key=routeKey(params);
    const lobby=document.getElementById('lobby');
    if(document.body.dataset.lobbyBrand!=='habibi' || !document.body.classList.contains('player-home') || (view && view!=='promotions') || (view!=='promotions'&&lobby.hasAttribute('data-filtered')))return;
    root.hidden=false;
    if(key!==locationKey){locationKey=key;selection=clubSection(view,params.get('club'));status='';board=null;boardRequest++;}
    const id=auth();
    if(owner!==id){owner=id;snapshot=null;board=null;signature='';status='';reading=false;busy=false;version++;boardRequest++;
      if(root.dataset.personal==='true'){root.replaceChildren();}root.dataset.personal=String(Boolean(id));}
    if(modelLocale!==french() || snapshot?.period!==period)force=true;
    if(snapshot && !force && Date.now()<freshUntil){paint();if(selection==='league'&&!board&&!reading)void readBoard();return;}
    if(reading && !force)return;
    const ticket=++version;reading=true;modelLocale=french();
    try{
      const data=await api('discovery/club?locale='+(french()?'fr-CA':'en-CA')+'&days='+period,undefined,'GET');
      if(ticket!==version||id!==auth())return;
      // Account and club requests can cross while the session is being restored.
      if(Boolean(id)!==Boolean(data.points))return;
      setSnapshot(data);if(selection==='league')void readBoard();
    }catch(e){if(ticket===version&&id===auth())showError(e);}
    finally{if(ticket===version)reading=false;}
  }
  root.addEventListener('click',async e=>{
    if(e.defaultPrevented || e.button!==0 || e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const windowButton=e.target.closest('[data-club-days]');
    if(windowButton){
      period=Number(windowButton.dataset.clubDays);const address=new URL(location.href);
      address.searchParams.set('trends',String(period));history.replaceState(null,'',address);await sync(true);return;
    }
    const control=e.target.closest('[data-member-action]');
    if(control){
      const user=auth(), verb=control.dataset.memberAction;
      if(!user||busy||control.disabled)return;
      if(verb==='unlink'&&!window.confirm(msg('Unlink your Telegram account?','Dissocier votre compte Telegram ?')))return;
      const operation=[user,verb,control.dataset.sku,control.dataset.id,control.dataset.price].join('/');
      if(memberRequest?.operation!==operation)memberRequest={operation,key:crypto.randomUUID()};
      busy=true;control.disabled=true;
      try{
        const value=await api('discovery/membership',{action:verb,owner:user,key:memberRequest.key,sku:control.dataset.sku,price:Number(control.dataset.price)||undefined,id:Number(control.dataset.id)||undefined});
        if(user!==auth()||value.owner!==user)return;
        memberRequest=null;snapshot.membership=value;
        status=msg('Saved.','Enregistré.');signature='';paint();
        if(verb==='unlink')document.dispatchEvent(new Event('club-telegram-updated'));
      }catch(err){if(user===auth()){showError(err);void sync(true);}}
      finally{if(user===auth()){busy=false;control.disabled=false;}}
      return;
    }
    const game=e.target.closest('[data-club-game]');
    if(game){e.preventDefault();openGame(game.dataset.clubGame);return;}
    const link=e.target.closest('[data-club-card]'), button=e.target.closest('[data-club-action]');
    if(link){
      if(!snapshot)return;
      e.preventDefault();selection=selection===link.dataset.clubCard?'':link.dataset.clubCard;status='';paint();
      if(selection==='league')void readBoard();return;
    }
    if(!button || busy || button.disabled)return;
    const type=button.dataset.clubAction, id=Number(button.dataset.program), user=auth();
    if(!user){
      if((!snapshot||accountPending()) && button.matches('a'))return;
      e.preventDefault();signIn(selection);return;
    }
    e.preventDefault();
    if(!snapshot || owner!==user){void sync(true);return;}
    if(['continue','profile','allQuests','allRewards'].includes(type)){
      openClub(type==='profile'?'profile':type==='allRewards'?'rewards':'quests',id);return;
    }
    if(!['daily','join','claim'].includes(type))return;
    busy=true;button.disabled=true;const ticket=++version;reading=false;boardRequest++;
    try{
      const result=await api('discovery/'+type+'?locale='+(french()?'fr-CA':'en-CA')+'&days='+period,type==='daily'?{day:snapshot.day,expectedAmount:snapshot.amount}:type==='join'?{id}:{ids:[id]});
      if(user!==auth() || ticket!==version)return;
      if(type==='daily'){
        updateAccount(result.account);status=result.credited?msg('Bonus added to your demo balance.','Bonus ajouté à votre solde démo.'):msg('Already collected today.','Déjà réclamé aujourd’hui.');
        setSnapshot(result.club);
      }else{
        const state=result.receipts?.[0]?.state;
        status=type==='join'?msg('Quest started.','Quête commencée.'):state?msg('This reward is currently unavailable.','Cette récompense est actuellement indisponible.'):msg('Reward added to your collection.','Récompense ajoutée à votre collection.');
        await sync(true);
      }
      board=null;if(selection==='league')void readBoard();
    }catch(err){if(user===auth()&&ticket===version){showError(err);void sync(true);}}
    finally{if(user===auth()){busy=false;signature='';paint();}}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)void sync(true);});
  window.addEventListener('pageshow',e=>{if(e.persisted)void sync(true);});
  return {sync, select(tab){selection=sections.includes(tab)?tab:'daily';status='';paint();void sync(true);root.querySelector('[data-club-card="'+selection+'"]')?.focus({preventScroll:true});}};
}
