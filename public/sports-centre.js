import { sports, leagues, matches, byId, prices, programTime, outcome, marketName, frameOf, clockLabel } from './sports-data.js';
import {currentMarket,quotedPrice,bookHistory,stakeControls} from './sport-tickets.js';
import { createRotation } from './banner-motion.js';
import { sportsNavigation, carousel, carouselContent, scoreWire, featureRail, selectionsView, slotView, ticketHistory, bundles, slotSymbols, icon, combinedPrice } from './sports-discovery.js';

const newBoard = () => ({
  sport: 'all', status: 'all', area: 'board', league: '', detail: '', picks: new Map(),
  confirmed: false, slipOpen: false, paused: false, step: 0, slide: 0, search: false, query: '',
  favorites: new Set(), history: [], pendingBundle: '', symbol: 0, spin: null, notice: ''
});

function fixtureCard(match, state, fr) {
  const lang = Number(fr);
  const frame = match.frames && frameOf(match, state.step);
  const expanded = state.detail === match.id;
  const teams = match.teams.map((team, i) => `<div class="sport-team"><span class="team-mark" aria-hidden="true">${match.marks[i]}</span><span>${team}</span>${frame ? `<b data-score="${match.id}-${i}">${frame[i + 1]}</b>` : ''}</div>`).join('');
  const liveMarket=currentMarket(state,match);
  const odds = liveMarket.prices.map((cents, i) => {
    const price=cents/100;
    const name = outcome(match, i, fr);
    const label = match.odds.length === 3 && i === 1 ? (fr ? 'N' : 'X') : i ? '2' : '1';
    return `<button type="button" class="ghost sport-odd" ${liveMarket.status!=='open'?'disabled':''} data-hub-control="${match.id}-${i}" aria-pressed="${state.picks.get(match.id) === i}" aria-label="${name}, ${prices[lang].format(price)}"><span>${label}</span><strong>${prices[lang].format(price)}</strong></button>`;
  }).join('');
  const favorite = state.favorites.has(match.id);
  const favoriteLabel = (fr ? 'Favori' : 'Favorite') + ' · ' + match.teams.join(' / ');
  const live = fr ? 'Direct simulé' : 'Simulated live';
  const status = frame ? `<span class="sport-live"><i></i>${live}</span><span data-clock="${match.id}">${clockLabel(match, frame, fr)}</span>`
    : `<span>${fr ? 'À venir' : 'Upcoming'} · ${programTime(match, fr)}</span>`;
  const details = frame ? `<small>${fr ? 'Séquence simulée en boucle' : 'Looping match simulation'}</small><strong data-event="${match.id}">${frame[lang + 3]}</strong>`
    : `<small>${fr ? 'Horaire fictif' : 'Demo schedule'}</small><strong>${leagues[match.league][lang]} · ${programTime(match, fr)}</strong>`;
  return `<article class="fixture sport-${match.sport}" aria-label="${match.teams.join(fr ? ' contre ' : ' vs ')}">
    <div class="fixture-top"><span>${leagues[match.league][lang]}</span><div class="fixture-tools"><button type="button" class="favorite-match" data-hub-control="save-${match.id}" aria-pressed="${favorite}" title="${favoriteLabel}" aria-label="${favoriteLabel}">${icon(favorite?'star':'star-outline')}</button><button type="button" class="match-detail" data-hub-control="detail-${match.id}" aria-expanded="${expanded}" aria-controls="detail-${match.id}" aria-label="${fr ? 'Détails du match' : 'Match details'} · ${match.teams.join(' / ')}">⌄</button></div></div>
    <div class="fixture-state">${status}</div><div class="sport-teams">${teams}</div>
    <div id="detail-${match.id}" class="fixture-detail"${expanded ? '' : ' hidden'}>${details}</div>
    <div class="sport-market"><small>${marketName(match, fr)}${liveMarket.status==='open'?'':fr?' · Fermé':' · Closed'}</small><div class="hub-markets">${odds}</div></div></article>`;
}

function slipMarkup(state, fr) {
  const lang = Number(fr);
  const t = (en, french) => fr ? french : en;
  const slipTitle = t('Practice slip', 'Coupon démo');
  const selections = [...state.picks].map(([id, i]) => {
    const match = byId.get(id);
    const name = outcome(match, i, fr);
    return `<div class="hub-slip-line"><div><strong>${name}</strong><small>${match.teams.join(' / ')}</small></div><b>${prices[lang].format(quotedPrice(state,id,i))}</b><button type="button" class="ghost" data-hub-control="remove-${id}" aria-label="${t('Remove', 'Retirer')} · ${name}">×</button></div>`;
  }).join('');
  const count = state.picks.size;
  const result = state.confirmed ? `<p class="slip-confirmed" role="status" tabindex="-1">${(state.book?.owner?t('Slip accepted. Open My slips for the receipt.','Coupon accepté. Ouvrez Mes coupons pour le reçu.'):t('Demo slip confirmed for this visit.', 'Coupon démo validé pour cette visite.'))}</p>`
    : `<button type="button" class="slip-submit" data-hub-control="confirm" ${state.busy||state.bookLoading?'disabled':''}>${t('Confirm practice slip', 'Valider le coupon démo')}</button>`;
  const body = count ? `${selections}<div class="slip-total"><span>${t('Combined odds', 'Cote combinée')}</span><b>${prices[lang].format([...state.picks].reduce((n,[id,i])=>n*quotedPrice(state,id,i),1))}</b></div>${state.confirmed?'':stakeControls(state,fr)}${result}`
    : `<div class="slip-empty"><i class="ui-icon ico-listing" aria-hidden="true"></i><strong>${t('Your slip is empty', 'Ton coupon est vide')}</strong><span>${t('Select odds on a match to add a pick.', 'Sélectionne une cote sur un match pour ajouter ton premier choix.')}</span></div>`;
  return `<aside class="hub-slip" aria-label="${slipTitle}" data-slip-open="${state.slipOpen}"><h2><span class="slip-heading">${slipTitle}<b class="slip-count">${count}</b></span><button type="button" class="slip-toggle" data-hub-control="slip" aria-controls="sports-slip-body" aria-expanded="${state.slipOpen}"><i class="ui-icon ico-listing" aria-hidden="true"></i>${slipTitle}<b class="slip-count">${count}</b><span aria-hidden="true">⌃</span></button></h2>
    <div id="sports-slip-body">${body}<p class="slip-funds">${state.book?.owner?t('Settled in demo CAD.','Règlement en CAD fictifs.'):t('Fictional odds. No funds are used.', 'Cotes fictives. Aucun fonds engagé.')}</p></div></aside>`;
}

const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();

function matchBoard(state, fr) {
  const lang = Number(fr), t = (en,french) => fr ? french : en;
  const favorites = state.area === 'favorites';
  const active = matches.filter(m => (state.sport === 'all' || m.sport === state.sport) && (!favorites || state.favorites.has(m.id)));
  const competitions = [...new Set(active.map(m => m.league))];
  const query = normalize(state.query);
  const filtered = active.filter(m => (!state.league || m.league === state.league) &&
    (!query || normalize([...m.teams,...leagues[m.league],...sports[m.sport].label].join(' ')).includes(query)));
  const live = filtered.filter(m=>m.frames), upcoming=filtered.filter(m=>!m.frames);
  const selector = competitions.length < 2 ? '' : `<label class="sport-leagues"><select aria-label="${t('Competition','Compétition')}" data-sports-league><option value="">${t('All competitions','Toutes les compétitions')}</option>${competitions.map(key=>`<option value="${key}"${state.league===key?' selected':''}>${leagues[key][lang]}</option>`).join('')}</select></label>`;
  const group = (items, title) => items.length ? `<section class="match-group"><h3>${title}<small>${items.length}</small></h3><div class="fixture-grid">${items.map(m=>fixtureCard(m,state,fr)).join('')}</div></section>` : '';
  const groups = (state.status !== 'upcoming' ? group(live,t('Live matches','Matchs en direct')) : '') + (state.status !== 'live' ? group(upcoming,t('Upcoming matches','Matchs à venir')) : '');
  const heading = favorites ? t('Favorite matches','Matchs favoris') : state.search ? t('Search results','Résultats de recherche')
    : state.sport === 'all' ? t('Match centre','Centre des matchs') : sports[state.sport].label[lang];
  const empty = favorites && !state.favorites.size ? t('Tap the star on a match to find it here.','Touche l’étoile d’un match pour le retrouver ici.') : t('No matches found for these filters.','Aucun match trouvé pour ces filtres.');
  const toggleLabel = state.paused ? t('Resume simulation','Reprendre la simulation') : t('Pause simulation','Mettre la simulation en pause');
  const liveBanner = featuredBoard(state) && state.slide === 1;
  const showToggle = live.length && state.status !== 'upcoming';
  const toggle = showToggle ? `<button type="button" class="board-pause" ${liveBanner ? 'hidden' : 'data-hub-control="pause"'} aria-pressed="${state.paused}" aria-label="${toggleLabel}" title="${toggleLabel}"><span aria-hidden="true">${state.paused ? '▶' : 'Ⅱ'}</span></button>` : '';
  return `<div class="match-controls"><h2>${heading}</h2><div class="match-tools">${toggle}${selector}</div></div>${groups || `<p class="hub-note">${empty}</p>`}`;
}

function featuredBoard(state) {
  return state.area === 'board' && state.sport === 'all' && state.status === 'all' && !state.search && !state.league;
}

export function sportsMarkup(fr, state = newBoard()) {
  const popular = featuredBoard(state);
  const views = { predictions: selectionsView, slots: slotView, tickets: ticketHistory };
  const content = state.area==='tickets'&&state.book?.owner?'<section class="sports-view"><h2>'+ (fr?'Mes coupons démo':'My demo slips')+'</h2>'+(bookHistory(state,fr)||(fr?'Aucun coupon accepté.':'No accepted slips.'))+'</section>':(views[state.area] || matchBoard)(state,fr);
  return `<div class="sports-centre" data-sports-lang="${fr?'fr':'en'}">${sportsNavigation(state,fr)}
    ${popular ? carousel(state,fr)+scoreWire(state,fr)+featureRail(state,fr) : ''}
    <div class="sports-feedback" aria-live="polite">${state.message?escapeMessage(state.message):state.notice ? (fr ? 'Coupon démo mis à jour.' : 'Practice slip updated.') : ''}</div>
    <div class="hub-sports"><div class="match-centre">${content}</div>${slipMarkup(state,fr)}</div></div>`;
}

const escapeMessage=v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function validLeg(leg) {
  return Array.isArray(leg) && leg.length === 2 && Number.isInteger(leg[1]) && byId.get(leg[0])?.odds[leg[1]] !== undefined;
}

export function createSportsCentre(panel, french, account, {api,update,translate}) {
  let state = newBoard();
  let mounted = false, locale, timer, ownerKey;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const rotation = createRotation(() => {
    moveSlide(state.slide+1);
    const track = panel.querySelector('.wire-track');
    if (!track || track.matches(':hover,:focus-within') || track.scrollWidth <= track.clientWidth+2) return;
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth-3;
    const next = [...track.children].find(card => card.offsetLeft > track.scrollLeft+3);
    track.scrollTo({left:end ? 0 : next?.offsetLeft || 0,behavior:'smooth'});
  }, french, 3000);
  let refreshSequence=0;
  async function refreshBook(){
    const key=ownerKey,seq=++refreshSequence;
    try{
      const book=await api('sports/book',undefined,'GET');
      if(key!==ownerKey || seq!==refreshSequence || (account()?.id||null)!==book.owner)return;
      state.book=book;state.bookLoading=false;if(mounted)paint();
    }catch(e){if(key===ownerKey && seq===refreshSequence){state.bookLoading=Boolean(account());state.message=translate(e.message);if(mounted)paint();}}
  }
  async function transact(action,fields){
    if(state.busy||!account())return;
    const current=state,key=ownerKey;
    current.busy=true;current.message='';paint();
    try{
      const result=await api('sports/book',{action,owner:account().id,...fields});
      if(key!==ownerKey||current!==state||account()?.id!==current.book?.owner)return;
      if(action==='quote'){state.quote=result.quote;}
      else{state.book=result.book;state.quote=null;if(action==='accept')state.confirmed=true;update(result.account);}
    }catch(err){
      if(key!==ownerKey||current!==state)return;
      if(action==='accept'&&['sportPriceChanged','sportSuspended'].includes(err.message)){state.bookKey='';await refreshBook();}
      if(action==='cash')state.quote=null;
      state.message=translate(err.message);
    }finally{current.busy=false;if(mounted&&current===state)paint();}
  }
  function storageKey() {
    return 'habibi-sports-v1:' + location.pathname + ':' + (account()?.id || 'guest');
  }
  function restoreSaved() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(ownerKey) || '{}');
      state.favorites = new Set(Array.isArray(saved.favorites) ? saved.favorites.filter(id=>byId.has(id)) : []);
      state.history = Array.isArray(saved.history) ? saved.history.filter(entry=>entry && Number.isSafeInteger(entry.at) && entry.at>0 && entry.at<=8640000000000000 && Array.isArray(entry.legs) && entry.legs.length>0 && entry.legs.length<=matches.length && entry.legs.every(validLeg)).slice(0,12) : [];
    } catch { /* A new or unavailable tab store starts empty. */ }
  }
  function save() {
    try { sessionStorage.setItem(ownerKey,JSON.stringify({favorites:[...state.favorites],history:state.history})); }
    catch { /* The current board stays usable without browser storage. */ }
  }
  function updateScores() {
    const fr = french();
    for (const node of panel.querySelectorAll('[data-score]')) {
      const [id, side] = node.dataset.score.split('-');
      const value = String(frameOf(byId.get(id), state.step)[Number(side)+1]);
      if (node.textContent === value) continue;
      node.textContent = value;
      if (!reducedMotion.matches) node.animate([{color:'#ffdf6a'},{color:getComputedStyle(node).color}],{duration:750});
    }
    for (const node of panel.querySelectorAll('[data-clock]')) {
      const match = byId.get(node.dataset.clock);
      node.textContent = clockLabel(match, frameOf(match, state.step), fr);
    }
    for (const node of panel.querySelectorAll('[data-event]')) node.textContent = frameOf(byId.get(node.dataset.event), state.step)[Number(fr) + 3];
  }
  function runClock() {
    clearInterval(timer);
    if (mounted && !state.paused && !document.hidden) timer = setInterval(() => { state.step++; updateScores(); }, 12000);
  }
  function updateRail() {
    const rail = panel.querySelector('.sports-rail');
    if (!rail) return;
    panel.querySelector('[data-hub-control="rail-prev"]').disabled = rail.scrollLeft <= 2;
    panel.querySelector('[data-hub-control="rail-next"]').disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  }
  function paint() {
    const old = panel.querySelector('.sports-centre');
    const focused = old?.contains(document.activeElement) ? document.activeElement : null;
    const editing = focused?.hasAttribute('data-sport-query');
    const cursor = editing ? focused.selectionStart : 0;
    const offsets = ['.sport-tabs','.sports-shortcuts','.sports-rail','.wire-track'].map(sel=>[sel,old?.querySelector(sel)?.scrollLeft || 0]);
    const slipScroll = old?.querySelector('.hub-slip').scrollTop || 0;
    old?.remove();
    panel.insertAdjacentHTML('beforeend', sportsMarkup(french(), state));
    for (const [sel,left] of offsets) {
      const track = panel.querySelector(sel);
      if (!track) continue;
      track.scrollLeft = left;
      const selected = track.querySelector('.sport-tab[aria-pressed="true"],.sports-shortcuts button[aria-pressed="true"]');
      if (!selected) continue;
      const active = selected.getBoundingClientRect(), bounds = track.getBoundingClientRect();
      if (active.left < bounds.left) track.scrollLeft += active.left - bounds.left;
      else if (active.right > bounds.right) track.scrollLeft += active.right - bounds.right;
    }
    panel.querySelector('.hub-slip').scrollTop = slipScroll;
    if (editing) {
      const input = panel.querySelector('[data-sport-query]');
      input.focus({preventScroll:true}); input.setSelectionRange(cursor,cursor);
    } else if (focused?.dataset.hubControl) focusControl(focused.dataset.hubControl);
    updateRail();
    rotation.attach(panel.querySelector('.sports-carousel'));
  }
  function focusControl(id) { panel.querySelector(`[data-hub-control="${id}"]`)?.focus({preventScroll:true}); }
  function choose(area, sport = 'all', status = 'all') {
    Object.assign(state,{area,sport,status,league:'',detail:'',query:'',search:false,pendingBundle:'',notice:''});
  }
  function addBundle(id, replace) {
    const legs = bundles[id]?.picks;
    if (!legs) return;
    if (!replace && legs.some(([m,i])=>state.picks.has(m) && state.picks.get(m)!==i)) {
      state.pendingBundle = id; return;
    }
    state.pendingBundle = '';
    if (legs.every(([m,i])=>state.picks.get(m)===i)) return;
    for (const [m,i] of legs) state.picks.set(m,i);
    state.confirmed = false; state.notice = 'added';
  }
  function revealMatch(id) {
    const match = byId.get(id);
    choose('board',match.sport,match.frames?'live':'upcoming');
    state.detail=id; paint();
    const detail=panel.querySelector(`[data-hub-control="detail-${id}"]`);
    detail.closest('.fixture').scrollIntoView({block:'center',behavior:'instant'});detail.focus({preventScroll:true});
  }
  function moveSlide(index) {
    const hero=panel.querySelector('.sports-carousel');
    if (!hero) return;
    const before=state.slide;
    state.slide=(index+3)%3;
    if (before===state.slide) return;
    hero.classList.replace('slide-'+before,'slide-'+state.slide);
    hero.querySelector('.feature-inner').outerHTML=carouselContent(state,french());
    for (const [i,dot] of [...hero.querySelectorAll('.slide-dots button')].entries()) {
      if (i===state.slide) dot.setAttribute('aria-current','true');
      else dot.removeAttribute('aria-current');
    }
    const pause=panel.querySelector('.board-pause');
    if (pause) {
      pause.hidden=state.slide===1;
      if (pause.hidden) pause.removeAttribute('data-hub-control');
      else pause.dataset.hubControl='pause';
    }
  }
  panel.addEventListener('scroll', event=>{ if (event.target.classList?.contains('sports-rail')) updateRail(); },true);
  const railSize = new ResizeObserver(() => { if (mounted) updateRail(); });
  railSize.observe(panel);
  panel.addEventListener('input',event=>{
    if (!mounted || !event.target.hasAttribute('data-sport-query')) return;
    state.query=event.target.value.slice(0,80); state.detail='';paint();
  });
  panel.addEventListener('change', event => {
    if (!mounted || !event.target.matches('[data-sports-league]')) return;
    state.league = Object.hasOwn(leagues, event.target.value) ? event.target.value : '';
    state.detail = '';
    paint();
    panel.querySelector('[data-sports-league]')?.focus({preventScroll:true});
  });
  panel.addEventListener('input',event=>{if(event.target.matches('[data-book-stake]')){state.stake=event.target.valueAsNumber;state.bookKey='';}});
  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-hub-control]');
    if (!mounted || !button) return;
    const id = button.dataset.hubControl;
    state.notice = '';
    if (Object.hasOwn(sports,id) || id==='all') {
      choose('board',id,id==='all' ? 'all' : state.status);
    } else if (id.startsWith('status-')) {
      choose('board',state.area==='board' ? state.sport : 'all',id.slice(7));
    } else if (['favorites','tickets','predictions','slots','open-slots'].includes(id)) {
      choose(id==='open-slots'?'slots':id);
    } else if (id==='search') {
      const opening=!state.search;
      choose('board');state.search=opening;paint();
      if (opening) panel.querySelector('[data-sport-query]').focus();
      else focusControl('search');
      return;
    } else if (id==='clear-query') {
      state.query='';paint();panel.querySelector('[data-sport-query]').focus();return;
    } else if (id.startsWith('slide-')) {
      const value=id.slice(6);
      moveSlide(value==='next'? state.slide+1 : value==='prev'?state.slide-1:Number(value));return;
    } else if (id.startsWith('rail-')) {
      const rail=panel.querySelector('.sports-rail'), direction=id==='rail-next'?1:-1;
      const card=rail.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(rail).columnGap);
      rail.scrollBy({left:card*direction,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;
    } else if (id==='show-weekend') {
      const target=panel.querySelector('[data-hub-control="bundle-weekend"],[data-hub-control="replace-weekend"]');
      target?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});target?.focus({preventScroll:true});return;
    } else if (id==='feature' || id.startsWith('match-') || id.startsWith('wire-')) {
      revealMatch(id==='feature'?'marina':id.slice(id.indexOf('-')+1));return;
    } else if (id.startsWith('bundle-') || id.startsWith('replace-')) {
      addBundle(id.slice(id.indexOf('-')+1),id.startsWith('replace-'));
    } else if (id.startsWith('keep-')) {
      state.pendingBundle='';
    } else if (id.startsWith('save-')) {
      const key=id.slice(5);
      if (state.favorites.has(key)) state.favorites.delete(key); else state.favorites.add(key);
      save();
    } else if (id.startsWith('symbol-')) {
      state.symbol=Number(id.slice(7));state.spin=null;
    } else if (id==='spin') {
      state.spin={symbol:state.symbol,reels:Array.from({length:3},()=>Math.floor(Math.random()*slotSymbols.length))};
    } else if (id.startsWith('detail-')) {
      state.detail=state.detail===id.slice(7)?'':id.slice(7);
    } else if (id==='slip') {
      state.slipOpen=!state.slipOpen;
    } else if (id==='pause') {
      state.paused=!state.paused;runClock();
    } else if(id.startsWith('book-')){
      if(!state.book?.owner)return;
      if(id==='book-cash'){if(state.quote)void transact('cash',{quote:state.quote.id});}
      else{const [,which,slip]=id.split('-'),h=state.book.history.find(v=>v.id===Number(slip));
        if(h)void transact('quote',{id:h.id,part:which==='full'?h.remaining:Math.floor(h.remaining/2)});}
      return;
    } else if (id==='confirm') {
      if (!state.picks.size || state.confirmed || state.bookLoading) return;
      if(account()){
        if(!state.book?.owner)return;
        const stake=Math.round((state.stake??1)*100);
        if(!Number.isSafeInteger(stake)||stake<1||stake>state.book.limits.maxStake){state.message=translate('sportRisk');paint();return;}
        const legs=[...state.picks].map(([id,pick])=>{const m=currentMarket(state,byId.get(id));return {id,pick,price:m.prices[pick],version:m.version};});
        const signature=JSON.stringify({stake,legs});
        if(state.bookSignature!==signature||!state.bookKey){state.bookSignature=signature;state.bookKey=crypto.randomUUID();}
        void transact('accept',{stake,legs,key:state.bookKey});return;
      }
      state.confirmed=true;state.history.unshift({at:Date.now(),legs:[...state.picks]});state.history=state.history.slice(0,12);save();
    } else if (id.startsWith('remove-')) {
      state.picks.delete(id.slice(7));state.confirmed=false;state.pendingBundle='';
    } else {
      const [match,index]=id.split('-'), selection=Number(index);
      if (!validLeg([match,selection])) return;
      if (state.picks.get(match)===selection) state.picks.delete(match); else state.picks.set(match,selection);
      state.confirmed=false;state.pendingBundle='';state.notice='added';
    }
    paint();
    if (id==='confirm') panel.querySelector('.slip-confirmed')?.focus({preventScroll:true});
    else if (id==='open-slots') focusControl('slots');
    else if (id.startsWith('bundle-') && state.pendingBundle) focusControl('replace-'+state.pendingBundle);
    else if (id.startsWith('keep-') || id.startsWith('replace-')) focusControl('bundle-'+id.slice(id.indexOf('-')+1));
    else if (id.startsWith('save-') && state.area==='favorites' && !state.favorites.has(id.slice(5))) focusControl('favorites');
    else if (id.startsWith('remove-')) {
      const next=panel.querySelector('.hub-slip-line button') || panel.querySelector('.slip-toggle');
      if (next.getClientRects().length) next.focus({preventScroll:true}); else focusControl('tickets');
    }
  });
  panel.addEventListener('keydown', event=>{
    if (!mounted) return;
    if (event.target.closest('.sports-carousel') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();
      moveSlide(event.key==='Home'?0:event.key==='End'?2:state.slide+(event.key==='ArrowLeft'?-1:1));
      focusControl('slide-'+state.slide);
    } else if (event.key==='Escape' && state.slipOpen) {
      state.slipOpen=false;paint();focusControl('slip');
    } else if (event.key==='Escape' && state.search) {
      choose('board');paint();focusControl('search');
    }
  });
  let startTouch;
  panel.addEventListener('touchstart', event=>{
    startTouch=event.target.closest('.sports-carousel') && event.touches.length===1 ? [event.touches[0].clientX,event.touches[0].clientY] : null;
  },{passive:true});
  panel.addEventListener('touchend', event=>{
    if (!startTouch || !event.changedTouches.length || !mounted) return;
    const dx=event.changedTouches[0].clientX-startTouch[0],dy=event.changedTouches[0].clientY-startTouch[1];
    startTouch=null;
    if (Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.6) moveSlide(state.slide+(dx<0?1:-1));
  },{passive:true});
  document.addEventListener('visibilitychange', runClock);
  return {
    render() {
      const fr = french();
      const key=storageKey(), changed=key!==ownerKey;
      if (changed) { state=newBoard();ownerKey=key;restoreSaved();state.bookLoading=Boolean(account()); }
      if(changed||!mounted)void refreshBook();
      if (mounted && fr===locale && !changed) return;
      const initial = panel.querySelector('.sports-centre');
      if (!mounted && !state.favorites.size && !state.history.length && initial?.dataset.sportsLang === (fr ? 'fr' : 'en')) {
        initial.querySelectorAll('button:disabled, select:disabled').forEach(el => { el.disabled = false; });
      } else paint();
      locale = fr; mounted = true; runClock();updateRail();
      rotation.attach(panel.querySelector('.sports-carousel'));
    },
    leave() {
      if (!mounted) return;
      mounted = false; state.slipOpen = false; clearInterval(timer);rotation.attach(null);
      panel.querySelector('.sports-centre')?.remove();
    }
  };
}
