import { sports, leagues, byId, prices, programTime, outcome, frameOf } from './sports-data.js';

export const icon = name => `<i class="sport-icon si-${name}" aria-hidden="true"></i>`;
const entities = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
export const safeQuery = text => String(text).replace(/[&<>"']/g, c => entities[c]);
export const combinedPrice = (legs, fr) => prices[Number(fr)].format([...legs].reduce((price,[id,i])=>price*byId.get(id).odds[i],1));

export const bundles = {
  weekend: { name:['Weekend treble','Le triplé du week-end'], picks:[['union',0],['bears',0],['drift',1]] },
  courts: { name:['Court double','Le duo du court'], picks:[['kato',0],['comets',1]] }
};
export const slotSymbols = [
  {icon:'numeric-7', name:['Seven','Sept']}, {icon:'diamond-stone', name:['Diamond','Diamant']}, {icon:'clover', name:['Clover','Trèfle']}
];

export function sportsNavigation(state, fr) {
  const t = (en, french) => fr ? french : en;
  const board = state.area === 'board';
  function tab(id, glyph, label, active, extra = '') {
    return `<button type="button" class="sport-tab ${extra}" data-hub-control="${id}" title="${label}" aria-label="${label}" aria-pressed="${active}">${icon(glyph)}<span>${label}</span></button>`;
  }
  const main = [
    tab('all','home-outline',t('Sports home','Accueil Sports'),board && state.sport === 'all' && !state.search),
    tab('favorites','star-outline',t('Favorites','Favoris'),state.area === 'favorites'),
    tab('tickets','ticket-confirmation-outline',t('My slips','Mes coupons'),state.area === 'tickets')
  ];
  const sportTabs = Object.entries(sports).map(([id,s])=>tab(id,s.icon,s.label[Number(fr)],board && state.sport === id));
  const items = [
    ['status-all','crown-outline',t('Popular','Populaires'), board && state.status === 'all' && !state.search],
    ['status-live','broadcast',t('Live','En direct'), board && state.status === 'live'],
    ['status-upcoming','clock-outline',t('Upcoming','À venir'), board && state.status === 'upcoming'],
    ['predictions','chart-line',t('Predictions','Pronostics'),state.area === 'predictions'],
    ['slots','slot-machine-outline',t('Slot challenge','Défi slots'),state.area === 'slots']
  ];
  const clear = t('Clear search','Effacer la recherche');
  return `<div class="sports-navbar"><nav class="sport-tabs" aria-label="${t('Sports navigation','Navigation Sports')}">${main.join('')}<span class="sport-divider" aria-hidden="true"></span>${sportTabs.join('')}</nav>
    <button type="button" class="sports-search-toggle" data-hub-control="search" aria-label="${t('Search matches','Rechercher un match')}" title="${t('Search matches','Rechercher un match')}" aria-controls="sports-search" aria-expanded="${state.search}">${icon(state.search ? 'close' : 'magnify')}</button></div>
    <div id="sports-search" class="sports-search"${state.search ? '' : ' hidden'}>${icon('magnify')}<input type="search" data-sport-query maxlength="80" aria-label="${t('Search by team, sport or competition','Rechercher une équipe, un sport ou une compétition')}" placeholder="${t('Team, sport or competition','Équipe, sport ou compétition')}" value="${safeQuery(state.query)}"><button type="button" data-hub-control="clear-query" aria-label="${clear}" title="${clear}">${icon('close')}</button></div>
    <nav class="sports-shortcuts" aria-label="${t('Sports sections','Sections Sports')}">${items.map(([id,glyph,label,on])=>
      `<button type="button" data-hub-control="${id}" aria-pressed="${on}">${icon(glyph)}${label}</button>`).join('')}</nav>`;
}

const slides = [
  ['Weekend treble','Le triplé du week-end'],
  ['Marina FC vs Atlas 04','Marina FC contre Atlas 04'],
  ['The reel challenge','Le défi des rouleaux']
];

export function carousel(state, fr) {
  const lang = Number(fr), t = (en, french) => fr ? french : en;
  const score = frameOf(byId.get('marina'), state.step);
  const pause = state.paused ? t('Resume simulation','Reprendre la simulation') : t('Pause simulation','Mettre la simulation en pause');
  const live = state.slide === 1;
  const title = live ? `<h2 class="feature-teams"><span>Marina FC <b data-score="marina-0">${score[1]}</b></span><span>Atlas 04 <b data-score="marina-1">${score[2]}</b></span></h2>`
    : `<h2>${slides[state.slide][lang]}</h2><p>${state.slide === 0 ? t('Soccer, basketball and hockey on one practice slip.','Soccer, basketball et hockey sur un seul coupon démo.') : t('Pick a symbol and spin three demo reels.','Choisis un symbole et lance les trois rouleaux démo.')}</p>`;
  const target = ['show-weekend','feature','open-slots'][state.slide];
  const action = [t('See the three picks','Voir les trois choix'),t('Follow match','Suivre le match'),t('Try the challenge','Essayer le défi')][state.slide];
  const label = [t('Featured combo','Combiné à la une'),t('Simulated live','Direct simulé'),t('Casino demo','Casino démo')][state.slide];
  const dots = slides.map((s,i)=>`<button type="button" data-hub-control="slide-${i}" aria-label="${t('Slide','Bannière')} ${i+1} · ${s[lang]}"${state.slide === i ? ' aria-current="true"' : ''}></button>`).join('');
  return `<section class="sports-feature sports-carousel slide-${state.slide}" aria-roledescription="${t('carousel','carrousel')}" aria-label="${t('Sports highlights','Sports à la une')}">
    <div class="feature-inner" aria-live="off"><div class="feature-meta"><span class="${live ? 'sport-live' : 'promo-kicker'}">${live ? '<i></i>' : ''}${label}</span>${live ? '<span>'+leagues.coast[lang]+'</span>' : ''}</div>
    ${title}<div class="feature-action"><button type="button" data-hub-control="${target}">${action} <span aria-hidden="true">→</span></button>${live ? `<span data-clock="marina">${score[0]}</span><button type="button" class="simulation-toggle" data-hub-control="pause" aria-pressed="${state.paused}" aria-label="${pause}" title="${pause}">${state.paused ? '▶' : 'Ⅱ'}</button>` : ''}</div></div>
    <button type="button" class="slide-arrow previous" data-hub-control="slide-prev" aria-label="${t('Previous slide','Bannière précédente')}">${icon('chevron-left')}</button><button type="button" class="slide-arrow next" data-hub-control="slide-next" aria-label="${t('Next slide','Bannière suivante')}">${icon('chevron-right')}</button>
    <div class="slide-dots">${dots}</div></section>`;
}

function bundleCard(id, state, fr) {
  const t = (en, french) => fr ? french : en, bundle = bundles[id];
  const included = bundle.picks.every(([match,i])=>state.picks.get(match) === i);
  const conflict = state.pendingBundle === id;
  const choices = bundle.picks.map(([key,i])=>{
    const m=byId.get(key);
    return `<li><strong>${outcome(m,i,fr)}</strong><small>${m.teams.join(' / ')}</small></li>`;
  }).join('');
  const button = conflict ? `<div class="bundle-conflict"><p>${t('A pick differs in your slip. Replace it?', 'Un choix diffère dans ton coupon. Le remplacer?')}</p><button type="button" data-hub-control="replace-${id}">${t('Replace','Remplacer')}</button><button type="button" data-hub-control="keep-${id}">${t('Keep my picks','Garder mes choix')}</button></div>`
    : `<button type="button" class="bundle-add" data-hub-control="bundle-${id}" aria-pressed="${included}"><span>${icon(included ? 'check' : 'plus')}${included ? t('Added','Ajouté') : t('Add to slip','Ajouter au coupon')}</span><b>${combinedPrice(bundle.picks,fr)}</b></button>`;
  return `<article class="bundle-card rail-card" data-bundle="${id}"><h3>${bundle.name[Number(fr)]}</h3><ul>${choices}</ul>${button}</article>`;
}

export function featureRail(state, fr) {
  const t = (en,french) => fr ? french : en;
  const cards = ['azur','caps'].map(id=>{
    const m=byId.get(id);
    return `<article class="rail-card bill-card sport-${m.sport}"><small>${icon(sports[m.sport].icon)}${leagues[m.league][Number(fr)]} · ${programTime(m,fr)}</small><h3>${m.teams.map((name,i)=>`<span><i class="team-mark">${m.marks[i]}</i>${name}</span>`).join('')}</h3>
    <button type="button" data-hub-control="match-${id}">${t('See odds','Voir les cotes')} ${icon('chevron-right')}</button></article>`;
  }).join('');
  return `<section class="sports-rail-wrap" aria-labelledby="rail-title"><div class="sports-section-head"><h2 id="rail-title">${t('Featured combos & matches','Combinés et matchs à la une')}</h2><div class="rail-arrows"><button type="button" data-hub-control="rail-prev" aria-label="${t('Previous cards','Fiches précédentes')}">${icon('chevron-left')}</button><button type="button" data-hub-control="rail-next" aria-label="${t('Next cards','Fiches suivantes')}">${icon('chevron-right')}</button></div></div>
    <div class="sports-rail">${bundleCard('weekend',state,fr)}${bundleCard('courts',state,fr)}${cards}</div></section>`;
}

export function selectionsView(state, fr) {
  const t = (en,french) => fr ? french : en;
  const cards = [['union',0],['drift',1],['kato',0]].map(([id,i])=>{
    const m=byId.get(id), name=outcome(m,i,fr), selected=state.picks.get(id)===i;
    return `<article class="forecast-card"><small>${icon(sports[m.sport].icon)}${leagues[m.league][Number(fr)]} · ${programTime(m,fr)}</small><h3>${m.teams.join(fr?' contre ':' vs ')}</h3><p>${t('Demo pick','Choix démo')} · <b>${name}</b></p><button type="button" class="bundle-add" data-hub-control="${id}-${i}" aria-pressed="${selected}"><span>${icon(selected?'check':'plus')}${selected?t('Added','Ajouté'):t('Add to slip','Ajouter au coupon')}</span><b>${prices[Number(fr)].format(m.odds[i])}</b></button></article>`;
  }).join('');
  return `<section class="sports-view"><h2>${t('Demo predictions','Pronostics démo')}</h2><div class="forecast-grid">${cards}</div></section>`;
}

export function slotView(state, fr) {
  const t = (en,french) => fr ? french : en, lang = Number(fr);
  return `<section class="sports-view slot-challenge"><h2>${t('The reel challenge','Le défi des rouleaux')}</h2><p>${t('Pick a symbol. If it lands on any of the three reels, your prediction wins.','Choisis un symbole. S’il apparaît sur un des trois rouleaux, ton pronostic est gagnant.')}</p>
    <div class="slot-choices">${slotSymbols.map((s,i)=>`<button type="button" data-hub-control="symbol-${i}" aria-pressed="${state.symbol===i}">${icon(s.icon)}${s.name[lang]}</button>`).join('')}</div>
    <div class="slot-reels" aria-label="${t('Reels','Rouleaux')}">${(state.spin?.reels || [null,null,null]).map(i=>`<span>${i===null ? '–' : icon(slotSymbols[i].icon)+'<small>'+slotSymbols[i].name[lang]+'</small>'}</span>`).join('')}</div>
    <button type="button" class="slot-spin" data-hub-control="spin">${t('Spin demo reels','Lancer les rouleaux démo')}</button>
    <p class="slot-result" role="status">${state.spin ? (state.spin.reels.includes(state.spin.symbol) ? t('Your symbol landed.','Ton symbole est sorti.') : t('Your symbol did not land this time.','Ton symbole n’est pas sorti cette fois.')) : ''}</p></section>`;
}

export function ticketHistory(state, fr) {
  const t=(en,french)=>fr?french:en;
  const formatter=new Intl.DateTimeFormat(fr?'fr-CA':'en-CA',{dateStyle:'short',timeStyle:'short'});
  const rows=state.history.map(entry=>`<article class="slip-history-card"><h3>${t('Confirmed slip','Coupon validé')} <time datetime="${new Date(entry.at).toISOString()}">${formatter.format(entry.at)}</time></h3><ul>${entry.legs.map(([id,i])=>`<li>${outcome(byId.get(id),i,fr)} <b>${prices[Number(fr)].format(byId.get(id).odds[i])}</b></li>`).join('')}</ul><div class="slip-total">${t('Combined odds','Cote combinée')}<b>${combinedPrice(entry.legs,fr)}</b></div></article>`).join('');
  return `<section class="sports-view"><h2>${t('My practice slips','Mes coupons démo')}</h2>${rows || `<p>${t('Slips you confirm in this tab will appear here.','Les coupons que tu valides dans cet onglet apparaîtront ici.')}</p>`}</section>`;
}
