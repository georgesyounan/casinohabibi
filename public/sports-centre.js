const sports = {
  football:   { icon: '⚽', label: ['Soccer', 'Soccer'] },
  basketball: { icon: '🏀', label: ['Basketball', 'Basketball'] },
  hockey:     { icon: '🏒', label: ['Hockey', 'Hockey'] },
  tennis:     { icon: '🎾', label: ['Tennis', 'Tennis'] },
  baseball:   { icon: '⚾', label: ['Baseball', 'Baseball'] }
};

const leagues = {
  coast: ['Coastal Cup', 'Coupe du littoral'], north: ['Northern League', 'Ligue du Nord'],
  metro: ['Metro League', 'Ligue métropolitaine'], ice: ['Polar Cup', 'Coupe polaire'],
  open: ['Summit Open', 'Omnium du Sommet'], diamond: ['Bay Series', 'Série de la baie']
};

// Each live entry is a short, replayable fictional sequence. Prices are fixed for the whole demo.
const matches = [
  { id: 'marina', sport: 'football', league: 'coast', teams: ['Marina FC', 'Atlas 04'], marks: ['MF', 'A4'], odds: [2.15, 3.20, 2.70],
    frames: [
      ['62′', 1, 0, 'Marina wins a corner.', 'Marina obtient un corner.'],
      ['64′', 1, 0, 'Atlas clears the cross.', 'Atlas dégage le centre.'],
      ['67′', 1, 1, 'Atlas equalizes with a header.', 'Atlas égalise de la tête.'],
      ['70′', 1, 1, 'Marina hits the crossbar.', 'Marina frappe la barre transversale.']
    ] },
  { id: 'comets', sport: 'basketball', league: 'metro', teams: ['Metro Comets', 'Port Waves'], marks: ['MC', 'PW'], odds: [1.78, 2.05],
    frames: [
      ['Q3 · 04:38', 68, 64, 'Comets take possession.', 'Les Comets récupèrent le ballon.'],
      ['Q3 · 04:19', 70, 64, 'Comets score on the break.', 'Les Comets marquent en contre-attaque.'],
      ['Q3 · 04:02', 70, 67, 'Waves hit a three.', 'Les Waves réussissent un tir de trois points.'],
      ['Q3 · 03:51', 70, 67, 'Timeout for the Comets.', 'Temps d’arrêt des Comets.']
    ] },
  { id: 'frost', sport: 'hockey', league: 'ice', teams: ['Québec Frost', 'Harbour Lynx'], marks: ['QF', 'HL'], odds: [1.87, 1.96],
    frames: [
      ['P2 · 09:42', 2, 1, 'Frost win the faceoff.', 'Le Frost remporte la mise au jeu.'],
      ['P2 · 09:21', 2, 1, 'The Lynx goalie stops a wrist shot.', 'Le gardien des Lynx bloque un tir du poignet.'],
      ['P2 · 08:57', 2, 2, 'Lynx score on a rebound.', 'Les Lynx marquent sur un retour.'],
      ['P2 · 08:36', 2, 2, 'Icing against the Frost.', 'Dégagement refusé du Frost.']
    ] },
  { id: 'vega', sport: 'tennis', league: 'open', teams: ['S. Vega', 'M. Rami'], marks: ['SV', 'MR'], odds: [1.72, 2.18],
    frames: [
      ['15–15', 3, 2, 'Vega serves in the first set.', 'Vega est au service dans la première manche.'],
      ['30–15', 3, 2, 'Vega wins the rally.', 'Vega remporte l’échange.'],
      ['40–15', 3, 2, 'Vega serves an ace.', 'Vega réussit un as.'],
      ['0–0', 4, 2, 'Vega holds serve.', 'Vega remporte son jeu de service.']
    ] },
  { id: 'pilots', sport: 'baseball', league: 'diamond', teams: ['Bay Pilots', 'Canyon Foxes'], marks: ['BP', 'CF'], odds: [1.80, 2.02],
    frames: [
      ['6 ↑', 3, 2, 'Foxes put a runner on first.', 'Un joueur des Foxes atteint le premier but.'],
      ['6 ↑', 3, 3, 'A double ties the game.', 'Un double crée l’égalité.'],
      ['6 ↓', 3, 3, 'Pilots come up to bat.', 'Les Pilots s’amènent au bâton.'],
      ['6 ↓', 4, 3, 'A single brings the runner home.', 'Un simple fait rentrer le coureur.']
    ] },
  { id: 'union', sport: 'football', league: 'north', teams: ['Union Nord', 'Rivage SC'], marks: ['UN', 'RS'], odds: [2.45, 3.10, 2.30], time: '18:30' },
  { id: 'bears', sport: 'basketball', league: 'metro', teams: ['North Bears', 'City Sparks'], marks: ['NB', 'CS'], odds: [1.92, 1.86], time: '19:00' },
  { id: 'drift', sport: 'hockey', league: 'ice', teams: ['Nordik HC', 'Summit Ice'], marks: ['NH', 'SI'], odds: [2.04, 1.79], time: '19:15' },
  { id: 'azur', sport: 'football', league: 'coast', teams: ['Azur AC', 'Cedar Athletic'], marks: ['AZ', 'CA'], odds: [2.36, 3.25, 2.42], time: '19:30' },
  { id: 'kato', sport: 'tennis', league: 'open', teams: ['A. Kato', 'L. Marin'], marks: ['AK', 'LM'], odds: [1.91, 1.88], time: '20:00' },
  { id: 'caps', sport: 'baseball', league: 'diamond', teams: ['Harbour Caps', 'Delta Reds'], marks: ['HC', 'DR'], odds: [2.10, 1.75], time: '20:30' }
];

const byId = new Map(matches.map(match => [match.id, match]));
const prices = ['en-CA', 'fr-CA'].map(locale => new Intl.NumberFormat(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
const programTime = (match, fr) => fr ? match.time.replace(':', ' h ') : match.time;
const outcome = (match, index, fr) => match.odds.length === 3 && index === 1 ? (fr ? 'Nul' : 'Draw') : match.teams[index === 0 ? 0 : 1];
const marketName = (match, fr) => match.sport === 'football'
  ? (fr ? 'Résultat à 90 min' : '90-minute result') : (fr ? 'Vainqueur du match' : 'Match winner');
const newBoard = () => ({sport: 'all', status: 'all', league: '', detail: '', picks: new Map(), confirmed: false, slipOpen: false, paused: false, step: 0});
const frameOf = (match, step) => match.frames[step % match.frames.length];

function clockLabel(match, frame, fr) {
  if (match.sport === 'tennis') return (fr ? '1ʳᵉ manche' : 'Set 1') + ' · ' + frame[0];
  if (match.sport === 'baseball') return (fr ? 'Manche ' : 'Inning ') + frame[0];
  return fr ? frame[0].replace('Q3', '3ᵉ quart') : frame[0];
}

function fixtureCard(match, state, fr) {
  const lang = Number(fr);
  const frame = match.frames && frameOf(match, state.step);
  const expanded = state.detail === match.id;
  const teams = match.teams.map((team, i) => `<div class="sport-team"><span class="team-mark" aria-hidden="true">${match.marks[i]}</span><span>${team}</span>${frame ? `<b data-score="${match.id}-${i}">${frame[i + 1]}</b>` : ''}</div>`).join('');
  const odds = match.odds.map((price, i) => {
    const name = outcome(match, i, fr);
    const label = match.odds.length === 3 && i === 1 ? (fr ? 'N' : 'X') : i ? '2' : '1';
    return `<button type="button" class="ghost sport-odd" data-hub-control="${match.id}-${i}" aria-pressed="${state.picks.get(match.id) === i}" aria-label="${name}, ${prices[lang].format(price)}"><span>${label}</span><strong>${prices[lang].format(price)}</strong></button>`;
  }).join('');
  const live = fr ? 'Direct simulé' : 'Simulated live';
  const status = frame ? `<span class="sport-live"><i></i>${live}</span><span data-clock="${match.id}">${clockLabel(match, frame, fr)}</span>`
    : `<span>${fr ? 'À venir' : 'Upcoming'} · ${programTime(match, fr)}</span>`;
  const details = frame ? `<small>${fr ? 'Séquence simulée en boucle' : 'Looping match simulation'}</small><strong data-event="${match.id}">${frame[lang + 3]}</strong>`
    : `<small>${fr ? 'Horaire fictif' : 'Demo schedule'}</small><strong>${leagues[match.league][lang]} · ${programTime(match, fr)}</strong>`;
  return `<article class="fixture sport-${match.sport}" aria-label="${match.teams.join(fr ? ' contre ' : ' vs ')}">
    <div class="fixture-top"><span>${leagues[match.league][lang]}</span><button type="button" class="match-detail" data-hub-control="detail-${match.id}" aria-expanded="${expanded}" aria-controls="detail-${match.id}" aria-label="${fr ? 'Détails du match' : 'Match details'} · ${match.teams.join(' / ')}">⌄</button></div>
    <div class="fixture-state">${status}</div><div class="sport-teams">${teams}</div>
    <div id="detail-${match.id}" class="fixture-detail"${expanded ? '' : ' hidden'}>${details}</div>
    <div class="sport-market"><small>${marketName(match, fr)}</small><div class="hub-markets">${odds}</div></div></article>`;
}

function slipMarkup(state, fr) {
  const lang = Number(fr);
  const t = (en, french) => fr ? french : en;
  const slipTitle = t('Practice slip', 'Coupon démo');
  let total = 1;
  const selections = [...state.picks].map(([id, i]) => {
    const match = byId.get(id);
    const name = outcome(match, i, fr);
    total *= match.odds[i];
    return `<div class="hub-slip-line"><div><strong>${name}</strong><small>${match.teams.join(' / ')}</small></div><b>${prices[lang].format(match.odds[i])}</b><button type="button" class="ghost" data-hub-control="remove-${id}" aria-label="${t('Remove', 'Retirer')} · ${name}">×</button></div>`;
  }).join('');
  const count = state.picks.size;
  const result = state.confirmed ? `<p class="slip-confirmed" role="status" tabindex="-1">${t('Demo slip confirmed for this visit.', 'Coupon démo validé pour cette visite.')}</p>`
    : `<button type="button" class="slip-submit" data-hub-control="confirm">${t('Confirm practice slip', 'Valider le coupon démo')}</button>`;
  const body = count ? `${selections}<div class="slip-total"><span>${t('Combined odds', 'Cote combinée')}</span><b>${prices[lang].format(total)}</b></div>${result}`
    : `<div class="slip-empty"><i class="ui-icon ico-listing" aria-hidden="true"></i><strong>${t('Your slip is empty', 'Ton coupon est vide')}</strong><span>${t('Select odds on a match to add a pick.', 'Sélectionne une cote sur un match pour ajouter ton premier choix.')}</span></div>`;
  return `<aside class="hub-slip" aria-label="${slipTitle}" data-slip-open="${state.slipOpen}"><h2><span class="slip-heading">${slipTitle}<b class="slip-count">${count}</b></span><button type="button" class="slip-toggle" data-hub-control="slip" aria-controls="sports-slip-body" aria-expanded="${state.slipOpen}"><i class="ui-icon ico-listing" aria-hidden="true"></i>${slipTitle}<b class="slip-count">${count}</b><span aria-hidden="true">⌃</span></button></h2>
    <div id="sports-slip-body">${body}<p class="slip-funds">${t('Fictional odds. No funds are used.', 'Cotes fictives. Aucun fonds engagé.')}</p></div></aside>`;
}

// The template only interpolates this module’s fixed, public demo data.
export function sportsMarkup(fr, state = newBoard()) {
  const lang = Number(fr);
  const t = (en, french) => fr ? french : en;
  const active = matches.filter(m => state.sport === 'all' || state.sport === m.sport);
  const competitions = [...new Set(active.map(m => m.league))];
  const selected = active.filter(m => !state.league || m.league === state.league);
  const live = selected.filter(m => m.frames), upcoming = selected.filter(m => !m.frames);
  const sportBar = [['all', {icon:'◉', label:['All sports', 'Tous les sports']}], ...Object.entries(sports)].map(([id, sport]) =>
    `<button type="button" class="sport-tab" data-hub-control="${id}" aria-pressed="${state.sport === id}"><i aria-hidden="true">${sport.icon}</i>${sport.label[lang]}</button>`).join('');
  const statusBar = [['all',t('All','Tout'),selected.length],['live',t('Live','En direct'),live.length],['upcoming',t('Upcoming','À venir'),upcoming.length]].map(([id,label,count]) =>
    `<button type="button" data-hub-control="status-${id}" aria-pressed="${state.status === id}">${label} <b>${count}</b></button>`).join('');
  const leaguesSelect = competitions.length < 2 ? '' : `<label class="sport-leagues"><select aria-label="${t('Competition','Compétition')}" data-sports-league><option value="">${t('All competitions','Toutes les compétitions')}</option>${competitions.map(key => `<option value="${key}"${state.league === key ? ' selected' : ''}>${leagues[key][lang]}</option>`).join('')}</select></label>`;
  const featured = byId.get('marina'), frame = frameOf(featured, state.step);
  const playback = state.paused ? t('Resume simulation', 'Reprendre la simulation') : t('Pause simulation', 'Mettre la simulation en pause');
  const group = (fixtures, isLive) => !fixtures.length ? '' : `<section class="match-group"><h2>${isLive ? t('Live matches','Matchs en direct') : t('Upcoming matches','Matchs à venir')}<small>${fixtures.length}</small></h2><div class="fixture-grid">${fixtures.map(m=>fixtureCard(m,state,fr)).join('')}</div></section>`;
  const groups = (state.status !== 'upcoming' ? group(live,true) : '') + (state.status !== 'live' ? group(upcoming,false) : '');
  return `<div class="sports-centre" data-sports-lang="${fr ? 'fr' : 'en'}"><nav class="sport-tabs" aria-label="${t('Choose a sport', 'Choisir un sport')}">${sportBar}</nav>
    <section class="sports-feature" aria-label="${t('Featured match','Match à la une')}"><div class="feature-inner">
      <div class="feature-meta"><span class="sport-live"><i></i>${t('Simulated live','Direct simulé')}</span><span>${leagues.coast[lang]}</span></div>
      <h2 class="feature-teams"><span>Marina FC <b data-score="marina-0">${frame[1]}</b></span><span>Atlas 04 <b data-score="marina-1">${frame[2]}</b></span></h2>
      <div class="feature-action"><button type="button" data-hub-control="feature">${t('Follow match','Suivre le match')} <span aria-hidden="true">→</span></button><span data-clock="marina">${frame[0]}</span><button type="button" class="simulation-toggle" data-hub-control="pause" aria-pressed="${state.paused}" aria-label="${playback}" title="${playback}"><span aria-hidden="true">${state.paused ? '▶' : 'Ⅱ'}</span></button></div></div></section>
    <div class="hub-sports"><div class="match-centre"><div class="match-controls"><div class="sport-status" role="group" aria-label="${t('Match status','Statut des matchs')}">${statusBar}</div>${leaguesSelect}</div>
      ${groups || `<p class="hub-note">${t('No matches for this selection.','Aucun match pour cette sélection.')}</p>`}

    </div>${slipMarkup(state,fr)}</div></div>`;
}

export function createSportsCentre(panel, french) {
  const state = newBoard();
  let mounted = false, locale, timer;
  function updateScores() {
    const fr = french();
    for (const node of panel.querySelectorAll('[data-score]')) {
      const [id, side] = node.dataset.score.split('-');
      node.textContent = frameOf(byId.get(id), state.step)[Number(side) + 1];
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
  function paint() {
    const old = panel.querySelector('.sports-centre');
    const focused = old?.contains(document.activeElement) && document.activeElement.dataset.hubControl;
    const tabScroll = old?.querySelector('.sport-tabs').scrollLeft || 0;
    const slipScroll = old?.querySelector('.hub-slip').scrollTop || 0;
    if (old) old.remove();
    panel.insertAdjacentHTML('beforeend', sportsMarkup(french(), state));
    const tabs = panel.querySelector('.sport-tabs');
    tabs.scrollLeft = tabScroll;
    const active = tabs.querySelector('[aria-pressed="true"]').getBoundingClientRect();
    const rail = tabs.getBoundingClientRect();
    if (active.left < rail.left) tabs.scrollLeft += active.left - rail.left;
    else if (active.right > rail.right) tabs.scrollLeft += active.right - rail.right;
    panel.querySelector('.hub-slip').scrollTop = slipScroll;
    if (focused) panel.querySelector(`[data-hub-control="${focused}"]`)?.focus({preventScroll:true});
  }
  function focusControl(id) { panel.querySelector(`[data-hub-control="${id}"]`)?.focus({preventScroll:true}); }
  panel.addEventListener('change', event => {
    if (!mounted || !event.target.matches('[data-sports-league]')) return;
    state.league = Object.hasOwn(leagues, event.target.value) ? event.target.value : '';
    state.detail = '';
    paint();
    panel.querySelector('[data-sports-league]')?.focus({preventScroll:true});
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-hub-control]');
    if (!mounted || !button) return;
    const id = button.dataset.hubControl;
    if (Object.hasOwn(sports, id) || id === 'all') {
      state.sport = id; state.league = ''; state.detail = '';
    } else if (id.startsWith('status-')) {
      state.status = id.slice(7); state.detail = '';
    } else if (id === 'feature') {
      state.sport = 'football'; state.status = 'live'; state.league = ''; state.detail = 'marina';
    } else if (id.startsWith('detail-')) {
      state.detail = state.detail === id.slice(7) ? '' : id.slice(7);
    } else if (id === 'slip') {
      state.slipOpen = !state.slipOpen;
    } else if (id === 'pause') {
      state.paused = !state.paused; runClock();
    } else if (id === 'confirm') {
      state.confirmed = state.picks.size > 0;
    } else if (id.startsWith('remove-')) {
      state.picks.delete(id.slice(7)); state.confirmed = false;
    } else {
      const [match, index] = id.split('-');
      const selection = Number(index);
      if (!Number.isInteger(selection) || !byId.get(match)?.odds[selection]) return;
      if (state.picks.get(match) === selection) state.picks.delete(match);
      else state.picks.set(match, selection);
      state.confirmed = false;
    }
    paint();
    if (id === 'feature') {
      const detail = panel.querySelector('[data-hub-control="detail-marina"]');
      detail.closest('.fixture').scrollIntoView({block:'center', behavior:'instant'}); detail.focus({preventScroll:true});
    } else if (id === 'confirm') panel.querySelector('.slip-confirmed')?.focus({preventScroll:true});
    else if (id.startsWith('remove-')) {
      const next = panel.querySelector('.hub-slip-line button') || panel.querySelector('.slip-toggle');
      if (next.getClientRects().length) next.focus({preventScroll:true});
      else focusControl(id.slice(7) + '-0');
    }
  });
  panel.addEventListener('keydown', event => {
    if (mounted && event.key === 'Escape' && state.slipOpen && panel.querySelector('.slip-toggle')?.getClientRects().length) {
      state.slipOpen = false; paint(); focusControl('slip');
    }
  });
  document.addEventListener('visibilitychange', runClock);
  return {
    render() {
      const fr = french();
      if (mounted && fr === locale) return;
      const initial = panel.querySelector('.sports-centre');
      if (!mounted && initial?.dataset.sportsLang === (fr ? 'fr' : 'en')) {
        initial.querySelectorAll('button:disabled, select:disabled').forEach(el => { el.disabled = false; });
      } else paint();
      locale = fr; mounted = true; runClock();
    },
    leave() {
      if (!mounted) return;
      mounted = false; state.slipOpen = false; clearInterval(timer);
      panel.querySelector('.sports-centre')?.remove();
    }
  };
}
