import { games } from './catalog.js';
import { matches, leagues, clockLabel, frameOf } from './sports-data.js';

const day = 86_400_000;
const tabs = ['casino','sports','race'];
const covers = new Map(games.map(game=>[game.id,game]));
const examples = [
  ['roulette',500,500],['gold',100,400],['blackjack',500,500],['aurora',1000,4000],
  ['gold',100,-100],['roulette',100,100],['blackjack',1000,1000],['aurora',100,400],
  ['roulette',500,-500],['gold',1000,1000],['blackjack',500,0],['aurora',500,2000],
  ['gold',100,100],['roulette',1000,1000],['blackjack',100,100],['aurora',100,100]
];
const pick = (fr, en, french) => fr ? french : en;
const money = (cents,fr) => new Intl.NumberFormat(fr?'fr-CA':'en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
const escape = raw => String(raw).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const href = (base,fr,params,anchor='') => escape(base+'/?'+new URLSearchParams({lang:fr?'fr':'en',...params})+anchor);
function sample(now,step=0) {
  return examples.map((_,i)=>{
    const [game,wager,amount]=examples[(i+examples.length-step%examples.length)%examples.length];
    return {game,wager,amount,at:Math.floor(now/60_000)*60_000-i*67_000};
  });
}
const marker = (key,fr) => key==='sports' ? pick(fr,'Simulated matches','Matchs simulés') :
  pick(fr,'Simulated preview','Aperçu simulé');
const trophy = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0zm0 2H3v2a5 5 0 0 0 5 5m9-7h4v2a5 5 0 0 1-5 5m-4 2v5m-4 2h8"/></svg>';

export function timeLeft(end,now,fr) {
  const minutes=Math.max(0,Math.ceil((end-now)/60_000)), hours=Math.floor(minutes/60);
  if (hours>=24) return Math.floor(hours/24)+(fr?' j ':'d ')+(hours%24)+(fr?' h':'h');
  if (hours) return hours+(fr?' h ':'h ')+(minutes%60)+' min';
  return minutes+' min';
}

function sourceRows(data,wins,step=0) {
  const actual=wins?data.wins:data.rounds;
  const rows=actual.length?actual:sample(data.now,step).filter(r=>!wins||r.amount>0);
  return {rows,illustrative:!actual.length};
}
function winCards(data,fr,base) {
  const {rows}=sourceRows(data,true);
  return rows.map(r=>{
    const game=covers.get(r.game),title=game.name[Number(fr)];
    return `<a class="win-tile hub-link" href="${href(base,fr,{q:title},'#games')}"><img src="${escape(base)}/game-${game.id}.webp" width="116" height="76" alt="" loading="lazy"><span>${escape(title)}</span><strong>+${money(r.amount,fr)}</strong></a>`;
  }).join('');
}
const feedTitle=(fr,tab)=>({casino:'Casino',sports:'Sports',race:pick(fr,'Race standings','Classement')})[tab];
function feedTable(data,fr,tab,base,step=0) {
  const l=(en,french)=>pick(fr,en,french);
  let headers,rows,empty='',source='';
  if (tab==='race') {
    headers=[l('Rank','Rang'),l('Points','Points'),l('Players at this rank','Joueurs à ce rang')];
    rows=data.race.rows.map(r=>['#'+r.rank,String(r.score),String(r.players)]);
    empty=l('The first club point opens this week’s standings.','Le premier point du Club ouvre le classement de la semaine.');
  } else if (tab==='sports') {
    source=marker('sports',fr);
    headers=[l('Match','Match'),l('League','Ligue'),l('Game clock','Chrono'),l('Score','Pointage')];
    rows=matches.filter(m=>m.frames?.length).map(m=>{
      const frame=frameOf(m,step);
      return [`<a class="hub-link" href="${href(base,fr,{view:'sports'})}">${escape(m.teams.join(' · '))}</a>`,escape(leagues[m.league][Number(fr)]),escape(clockLabel(m,frame,fr)),frame[1]+' – '+frame[2]];
    });
  } else {
    const feed=sourceRows(data,false,step);
    source=feed.illustrative?marker('casino',fr):l('Last 24 hours · Play money','Dernières 24 h · Argent fictif');
    headers=[l('Game','Jeu'),l('Time','Heure')+' (UTC)',l('Stake','Mise'),l('Multiplier','Multiplicateur'),l('Payout','Versement')];
    const time = new Intl.DateTimeFormat(fr?'fr-CA':'en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    rows=feed.rows.slice(0,8).map(r=>{
      const game=covers.get(r.game),name=game.name[Number(fr)],payout=r.wager+r.amount;
      return [`<a class="hub-link feed-game" href="${href(base,fr,{q:name},'#games')}"><img loading="lazy" alt="" width="29" height="29" src="${escape(base)}/game-${game.id}.webp"><span>${escape(name)}<small class="feed-narrow">${escape(time.format(r.at))} UTC</small></span></a>`,
        escape(time.format(r.at)),money(r.wager,fr),(payout/r.wager).toLocaleString(fr?'fr-CA':'en-CA',{maximumFractionDigits:2})+'×',
        `<span${r.amount>0?' class="feed-win"':''}>${money(payout,fr)}</span><small class="feed-narrow">${(payout/r.wager).toLocaleString(fr?'fr-CA':'en-CA',{maximumFractionDigits:2})}×</small>`];
    });
  }
  return `<p class="event-source"${source?'':' hidden'}>${source}</p><div class="feed-scroll" tabindex="0" role="region" aria-label="${feedTitle(fr,tab)}"><table data-feed="${tab}"><thead><tr>${headers.map(v=>'<th scope="col">'+v+'</th>').join('')}</tr></thead><tbody>${rows.map(cells=>'<tr>'+cells.map((v,i)=>i?'<td>'+v+'</td>':'<th scope="row">'+v+'</th>').join('')+'</tr>').join('') || '<tr><td colspan="'+headers.length+'">'+empty+'</td></tr>'}</tbody></table></div>`;
}
function ring(data,fr) {
  const remaining=Math.max(0,Math.min(100,100*(data.end-data.now)/(data.end-data.start)));
  return `<div class="event-clock"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/><circle class="event-arc" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="${remaining.toFixed(1)} 100" transform="rotate(-90 40 40)"/></svg><span>${pick(fr,'Ends in','Fin dans')}<strong data-event-time>${timeLeft(data.end,data.now,fr)}</strong></span></div>`;
}

function cards(data,fr,base) {
  const l=(e,f)=>pick(fr,e,f), race=data.race, raffle=data.raffle, amount=money(data.prize,fr);
  const rules=(summary,body)=>`<details class="event-rules"><summary>${summary}</summary><p>${body}</p></details>`;
  const raceStatus=race.own ? '#'+race.own.rank+' · '+race.own.score+' pts' : l('No points this week','Aucun point cette semaine');
  const ticket=raffle.member ? `<button type="button" class="event-cta" data-raffle-enter ${raffle.entered || raffle.blocked?'disabled':''}>${raffle.blocked?l('Entries paused','Participations en pause'):raffle.entered?l('Today’s ticket collected','Billet du jour obtenu'):l('Get my free ticket','Prendre mon billet gratuit')}</button>` :
    `<a class="event-cta" href="${href(base,fr,{event:'raffle',access:'signin'},'#lobby-events')}" data-raffle-signin>${l('Get my free ticket','Prendre mon billet gratuit')}</a>`;
  const prior=raffle.previous;
  return `<article class="event-card event-race"><div class="event-lead"><div><h3>${l('Club points race','Course aux points')}</h3><p>${l('Climb this week’s club standings.','Grimpez au classement du Club cette semaine.')}</p></div>${ring(data,fr)}</div>
    <div class="event-actions"><a class="event-cta" data-event-tab="race" href="${href(base,fr,{feed:'race'},'#activity-board')}">${l('Standings','Classement')}</a>
    ${rules(l('Race rules','Règles de la course'),l('Daily gift +1 point. Completed quest +3 points. Ties share a rank. The race resets Monday at 00:00 UTC.','Cadeau quotidien +1 point. Quête terminée +3 points. Les ex æquo partagent leur rang. La course reprend le lundi à 0 h UTC.'))}</div>
    <div class="event-foot">${trophy} ${raceStatus}</div></article>
    <article class="event-card event-raffle" id="weekly-raffle"><div class="event-lead"><div><h3>${l('Weekly raffle','Tirage de la semaine')}</h3><p>${l(amount+' in play money to win.',amount+' en argent fictif à gagner.')}</p></div>${ring(data,fr)}</div>
    <div class="event-actions">${ticket}
    ${rules(l('Draw rules','Règles du tirage'),l('One free ticket per UTC day, up to seven. Each eligible ticket has the same chance. The draw closes Monday at 00:00 UTC. The winner’s active account receives the demo credit automatically.','Un billet gratuit par jour UTC, jusqu’à sept. Chaque billet admissible a la même chance. Le tirage ferme le lundi à 0 h UTC. Le compte actif gagnant reçoit automatiquement le crédit fictif.'))}</div>
    <div class="event-foot"><span>${l('My tickets','Mes billets')} <b>${raffle.own}/7</b></span><progress max="7" value="${raffle.own}" aria-label="${l('My tickets','Mes billets')}"></progress></div>
    ${prior?`<small class="draw-result">${prior.won?l('You won the last draw!','Vous avez gagné le dernier tirage!'):l('Last draw','Dernier tirage')} · ${money(prior.amount,fr)} · ${prior.entries} ${l('eligible tickets','billets admissibles')}</small>`:''}</article>`;
}
export function eventMarkup(data,fr,base,tab='casino') {
  const l=(e,f)=>pick(fr,e,f);
  tab=tabs.includes(tab)?tab:'casino';
  const fallback=!data.wins.length;
  const pause=l('Pause animations','Mettre les animations en pause');
  const arrow=(action,txt,symbol)=>`<button type="button" class="wire-control" data-wire="${action}" title="${txt}" aria-label="${txt}"><span aria-hidden="true">${symbol}</span></button>`;
  const rail=`<div class="wire-head"><h2><span class="wire-dot" aria-hidden="true"></span>${l('Latest wins','Derniers gains')}</h2><span class="wire-source">${fallback?marker('casino',fr):l('Play money','Argent fictif')}</span><div class="wire-controls">${arrow('prev',l('Previous wins','Gains précédents'),'‹')}${arrow('pause',pause,'Ⅱ')}${arrow('next',l('Next wins','Gains suivants'),'›')}</div></div><div class="wins-track">${winCards(data,fr,base)}</div>`;
  const lower=`<h2 id="events-title">${l('Races & raffles','Courses et tirages')}</h2><div class="event-cards">${cards(data,fr,base)}</div><p class="event-status" role="status"></p>
    <section id="activity-board" tabindex="-1" aria-labelledby="activity-title"><div class="activity-heading"><h2 id="activity-title">${l('Recent activity','Activité récente')}</h2><button type="button" class="wire-control" data-feed-motion title="${pause}" aria-label="${pause}"><span aria-hidden="true">Ⅱ</span></button><div class="feed-tabs">${tabs.map(k=>`<a data-event-tab="${k}" href="${href(base,fr,{feed:k},'#activity-board')}"${tab===k?' aria-current="true"':''}>${feedTitle(fr,k)}</a>`).join('')}</div></div><div class="feed-content">${feedTable(data,fr,tab,base)}</div></section>`;
  return {rail,lower};
}

export function createEventBoard({api,base,french,account,pending,signin,translate}) {
  const rail=document.getElementById('wins-wire'),lower=document.getElementById('lobby-events');
  if (!rail || !lower) return {sync(){},resume(){}};
  const seed=document.getElementById('lobby-event-model');
  let data=seed?JSON.parse(seed.textContent):null, owner=0, request=0, reading=false, joining=false, freshUntil=0;
  let tab=new URLSearchParams(location.search).get('feed')||'casino', renderedLocale=seed?document.documentElement.lang.slice(0,2):'',signature='',lastTab='',step=0;
  let paused=false, preference;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  try {preference=sessionStorage.getItem('habibi-activity-motion');} catch {}
  paused=preference===null || preference===undefined ? reduced.matches : preference==='off';
  const active=()=>{const lobby=document.getElementById('lobby');return document.body.classList.contains('player-home') && !lobby.hasAttribute('data-filtered') && !lobby.hasAttribute('data-hub-open');};
  const identity=()=>account()?.id||0;
  function motion() {
    const controls=[rail.querySelector('[data-wire="pause"]'),lower.querySelector('[data-feed-motion]')];
    const label=paused?pick(french(),'Resume animations','Reprendre les animations'):pick(french(),'Pause animations','Mettre les animations en pause');
    for(const control of controls)if(control){
      control.setAttribute('aria-label',label);control.title=label;control.setAttribute('aria-pressed',String(paused));
      control.firstElementChild.textContent=paused?'▶':'Ⅱ';
    }
  }
  function table() {
    if (!tabs.includes(tab)) tab='casino';
    const content=lower.querySelector('.feed-content');
    if (!data || !content) return;
    const top=content.querySelector('.feed-scroll')?.scrollLeft||0;
    content.innerHTML=feedTable(data,french(),tab,base,step);
    content.querySelector('.feed-scroll').scrollLeft=top;
    lower.querySelectorAll('.feed-tabs [data-event-tab]').forEach(link=>{
      if (link.dataset.eventTab===tab) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
  }
  function paint() {
    if (!data || !active()) return;
    const fr=french(),lang=fr?'fr':'en';
    const next=JSON.stringify([lang,data.start,data.wins,data.rounds,data.race,data.raffle]);
    if (signature===next && lastTab===tab) return;
    if (!rail.children.length || !lower.children.length || renderedLocale!==lang) {
      const html=eventMarkup(data,fr,base,tab);rail.innerHTML=html.rail;lower.innerHTML=html.lower;
    } else if (signature!==next) {
      const track=rail.querySelector('.wins-track'),horizontal=track.scrollLeft;
      const wins=winCards(data,fr,base);
      if (track.innerHTML!==wins && !track.contains(document.activeElement)) {track.innerHTML=wins;track.scrollLeft=horizontal;}
      rail.querySelector('.wire-source').textContent=data.wins.length?pick(fr,'Play money','Argent fictif'):marker('casino',fr);
      const grid=lower.querySelector('.event-cards');
      const open=[...grid.querySelectorAll('details')].map(d=>d.open);
      const controls=[...grid.querySelectorAll('a,button,summary')],focused=controls.indexOf(document.activeElement);
      grid.innerHTML=cards(data,fr,base);
      grid.querySelectorAll('details').forEach((el,i)=>{el.open=Boolean(open[i]);});
      if(focused>=0)grid.querySelectorAll('a,button,summary')[focused]?.focus({preventScroll:true});
    }
    signature=next;renderedLocale=lang;lastTab=tab;table();motion();
  }
  function refreshTime() {
    if (!data) return;
    const now=data.now+(Date.now()-received);
    for(const time of lower.querySelectorAll('[data-event-time]'))time.textContent=timeLeft(data.end,now,french());
    if (now>=Math.min(data.end,data.today+day)) freshUntil=0;
  }
  let received=Date.now();
  function accept(board) {data=board;received=Date.now();freshUntil=received+15_000;paint();refreshTime();}
  async function sync(force=false) {
    const id=identity();
    if (id!==owner) {owner=id;request++;reading=false;joining=false;freshUntil=0;data=null;signature='';lower.replaceChildren();rail.replaceChildren();}
    if (!active()) return;
    paint();
    if (pending()||reading||joining||document.hidden||(!force&&Date.now()<freshUntil)) return;
    const version=++request;reading=true;
    try {const board=await api('discovery/events',undefined,'GET');if (request===version && owner===identity()) accept(board);}
    catch {if (request===version) freshUntil=Date.now()+12_000;}
    finally {if (request===version)reading=false;}
  }
  async function takeTicket(button) {
    if (!data || joining || !identity() || button.disabled) return;
    const version=++request,id=identity();reading=false;joining=true;button.disabled=true;
    const status=lower.querySelector('.event-status');
    try {
      const result=await api('discovery/raffle',{day:data.today});
      if(version!==request || id!==identity())return;
      accept(result.board);status.textContent=pick(french(),'Your free ticket is in the draw.','Votre billet gratuit est inscrit au tirage.');
    } catch(e) {
      if(version!==request || id!==identity())return;
      status.textContent=translate(e.message);button.disabled=false;freshUntil=0;
    } finally {if(version===request)joining=false;}
  }
  function move(direction,automatic=false) {
    const track=rail.querySelector('.wins-track');
    if (!track || !track.firstElementChild || track.scrollWidth<=track.clientWidth+1) return;
    const max=track.scrollWidth-track.clientWidth;
    const distance=track.children[1] ? track.children[1].offsetLeft-track.children[0].offsetLeft : track.clientWidth;
    const end=direction>0?track.scrollLeft>=max-2:track.scrollLeft<=2;
    const target=end?(direction>0?0:max):track.scrollLeft+direction*distance;
    track.scrollTo({left:target,behavior:end || reduced.matches || (!automatic && paused)?'instant':'smooth'});
  }
  function toggleMotion(){
    paused=!paused;try{sessionStorage.setItem('habibi-activity-motion',paused?'off':'on');}catch{}motion();
  }
  rail.addEventListener('click',e=>{
    const button=e.target.closest('[data-wire]');if(!button)return;
    if(button.dataset.wire==='pause') toggleMotion();
    else move(button.dataset.wire==='prev'?-1:1);
  });
  lower.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    if(e.target.closest('[data-feed-motion]')){toggleMotion();return;}
    const link=e.target.closest('[data-event-tab],[data-raffle-signin],[data-raffle-enter]');if(!link)return;
    if(link.hasAttribute('data-raffle-enter')){void takeTicket(link);return;}
    if(link.hasAttribute('data-raffle-signin')){if(!pending()){e.preventDefault();if(identity())void sync(true);else signin();}return;}
    if (!data)return;
    e.preventDefault();tab=link.dataset.eventTab;lastTab=tab;table();
    history.replaceState(history.state,'',link.href);
    if (!link.closest('.feed-tabs')){const board=document.getElementById('activity-board');board.focus({preventScroll:true});board.scrollIntoView({block:'start'});}
  });
  function resume(){void sync(true);const focus=lower.querySelector('[data-raffle-enter]')||lower;focus.focus({preventScroll:true});lower.scrollIntoView({block:'start'});}
  reduced.addEventListener('change', e=>{if(e.matches){paused=true;motion();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
  window.setInterval(()=>{
    if(document.hidden||!active())return;
    refreshTime();void sync();
    if(paused)return;
    const onscreen=el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;};
    if(onscreen(rail)&&!rail.matches(':hover,:focus-within'))move(1,true);
    if((tab==='sports'||(tab==='casino'&&data&&!data.rounds.length))&&onscreen(lower)&&!lower.matches(':hover,:focus-within')){step++;table();}
  },3000);
  return {sync,resume};
}
