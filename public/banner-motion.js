import { artPath, habibiCampaigns } from './habibi-campaigns.js';

// Shared player preference. Imported by both server-rendered and hydrated carousels.
let paused;
function preference() {
  if (paused === undefined) {
    try { paused = sessionStorage.getItem('habibi-banner-pause:' + location.pathname) === '1'; }
    catch { paused = false; }
  }
  return paused;
}
export function rotationButton(fr) {
  const label = fr ? 'Mettre le défilement en pause' : 'Pause automatic rotation';
  return `<button type="button" class="rotation-toggle" data-banner-toggle aria-label="${label}" title="${label}" aria-pressed="false"><span aria-hidden="true"></span></button>`;
}

export function createRotation(advance, french, dwell = 3800) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let banner, timer, inView = false, hovered = false, touching = false;
  const observer = new IntersectionObserver(entries => {
    const item = entries.find(entry => entry.target === banner);
    if (item) { inView = item.isIntersecting && item.intersectionRatio >= .32; sync(); }
  }, { threshold: [0,.32] });
  function eligible() {
    return banner && inView && !document.hidden && !reduced.matches && !preference() && !hovered && !touching &&
      !banner.contains(document.activeElement) && !document.querySelector('dialog[open]');
  }
  function sync() {
    clearTimeout(timer);
    if (!banner) return;
    const button = banner.querySelector('[data-banner-toggle]');
    if (button) {
      const label = preference() ? (french() ? 'Reprendre le défilement' : 'Resume automatic rotation') :
        (french() ? 'Mettre le défilement en pause' : 'Pause automatic rotation');
      button.setAttribute('aria-pressed',String(preference()));
      button.setAttribute('aria-label',label);
      button.title = label;
      button.disabled = false;
    }
    const active = Boolean(eligible());
    banner.toggleAttribute('data-rotating',active);
    if (active) timer = setTimeout(() => {
      if (eligible()) advance();
      sync();
    },dwell);
  }
  function handle(event) {
    if (event.type === 'pointerenter' && event.pointerType === 'mouse') hovered = true;
    if (event.type === 'pointerleave' && event.pointerType === 'mouse') hovered = false;
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse') touching = true;
    if (['pointercancel','pointerup'].includes(event.type)) touching = false;
    if (event.type === 'click' && event.target.closest('[data-banner-toggle]')) {
      paused = !preference();
      try { sessionStorage.setItem('habibi-banner-pause:' + location.pathname,paused ? '1' : '0'); } catch {}
      window.dispatchEvent(new Event('habibi-banner-preference'));
      return;
    }
    sync();
  }
  const pointerEvents = ['pointerenter','pointerleave','pointerdown','pointerup','pointercancel','click'];
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('focusin',sync);
  document.addEventListener('focusout',() => queueMicrotask(sync));
  // A dialog closed programmatically may restore focus to the body without a focus event.
  document.addEventListener('close',sync,true);
  reduced.addEventListener('change',sync);
  window.addEventListener('habibi-banner-preference',sync);
  return {
    attach(element) {
      if (banner === element) return;
      if (banner) for (const name of pointerEvents) banner.removeEventListener(name,handle);
      observer.disconnect();
      banner = element; inView = false; touching = false;
      hovered = Boolean(banner && matchMedia('(hover: hover)').matches && banner.matches(':hover'));
      if (banner) {
        for (const name of pointerEvents) banner.addEventListener(name,handle);
        observer.observe(banner);
      }
      sync();
    },
    sync
  };
}

const featured = [
  {art: 1, names:['Habibi Studio','Habibi Studio']},
  {art: 13, names:['Neon reels','Rouleaux néon'], tag:['Slots','Machines à sous'],
    detail:['Explore the slot demos in the game lobby.','Retrouve les machines à sous jouables du hall.'],
    action:['Explore slots','Voir les machines'], query:'&amp;category=slots#games'},
  {art: 6, names:['Match night','Soir de match'], tag:['Sports demo','Sports en démo'],
    detail:['Follow the simulated scores and build your practice slip.','Suis les scores simulés et compose ton coupon démo.'],
    action:['Open sports','Ouvrir les sports'], query:'&amp;view=sports'},
  {art: 21, names:['Welcome match preview','Aperçu du bonus de bienvenue'], tag:['Proposed promotion','Promotion proposée'],
    detail:['100% match up to CA$500. Launch terms to be confirmed.','100 % jusqu’à 500 $ CA. Modalités à confirmer pour le lancement.'],
    action:['Explore the club','Explorer le club'], query:'&amp;view=promotions&amp;club=quests#player-club'}
];
const themes = [
  ...featured,
  ...habibiCampaigns.filter(campaign => !featured.some(theme => theme.art === campaign.id))
    .map(campaign => ({ art: campaign.id, names: campaign.title, detail: campaign.detail }))
];

export function homeCampaignExtras(fr, base, current = 0) {
  const lang = Number(fr);
  const home = base + '/?lang=' + (fr ? 'fr' : 'en');
  const art = themes.map((theme, i) => {
    const source = artPath(base, theme.art, fr);
    const image = i === current ? `src="${source}" fetchpriority="high"` : `data-src="${source}" hidden`;
    return `<img data-art-slide="${i}" ${image} width="1440" height="480" alt="">`;
  }).join('');
  const slides = themes.slice(1).map((theme, i) => {
    const title = theme.names[lang];
    const tag = theme.tag?.[lang] ?? (theme.detail ? (fr ? 'Promotion proposée' : 'Proposed promotion') : '');
    const detail = theme.detail ? `<p class="hero-description">${theme.detail[lang]}</p>` : '';
    const link = theme.query
      ? `<a class="button hero-browse hub-link" href="${home}${theme.query}">${theme.action[lang]} <i class="ui-icon ico-next" aria-hidden="true"></i></a>`
      : `<a class="button hero-browse" href="${artPath(base, theme.art, fr)}" target="_blank" rel="noopener">${fr ? 'Agrandir la bannière' : 'View full banner'}</a>`;
    const mode = tag ? `<p class="hero-mode">${tag}</p>` : '';
    return `<div class="hero-content" data-campaign-panel="${i + 1}" hidden>${mode}<h1>${title}</h1>${detail}${link}</div>`;
  }).join('');
  const previous = fr ? 'Bannière précédente' : 'Previous banner';
  const next = fr ? 'Bannière suivante' : 'Next banner';
  const pager = `<div class="campaign-pager" role="group" aria-label="${fr ? 'Navigation des bannières' : 'Banner navigation'}"><button type="button" data-campaign-step="-1" aria-label="${previous}">‹</button><span data-campaign-position>${current + 1} / ${themes.length}</span><button type="button" data-campaign-step="1" aria-label="${next}">›</button></div>`;
  return `<div class="habibi-carousel-art" aria-hidden="true">${art}</div>${slides}<div class="campaign-controls">${rotationButton(fr)}${pager}<a class="hub-link campaign-all" href="${home}&amp;view=promotions">${fr ? 'Toutes les promos' : 'All promotions'} ↗</a></div>`;
}

export function createHomeCampaign(root, french, base) {
  let index = 0, locale;
  const rotation = createRotation(() => select(index + 1), french);
  function select(next) {
    index = (next + themes.length) % themes.length;
    root.dataset.campaignIndex = String(index);
    for (const image of root.querySelectorAll('[data-art-slide]')) {
      const active = Number(image.dataset.artSlide) === index;
      if (active && !image.hasAttribute('src')) image.src = image.dataset.src;
      image.hidden = !active;
    }
    root.querySelectorAll(':scope > .hero-content').forEach((panel, i) => { panel.hidden = i !== index; });
    root.querySelector('[data-campaign-position]').textContent = (index + 1) + ' / ' + themes.length;
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-campaign-step]');
    if (button) select(index + Number(button.dataset.campaignStep));
  });
  root.addEventListener('keydown', event => {
    if (!event.target.closest('.campaign-controls')) return;
    const positions = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: themes.length - 1 };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    select(positions[event.key]);
  });
  let touch;
  root.addEventListener('touchstart',e => { touch = e.touches.length===1 ? [e.touches[0].clientX,e.touches[0].clientY] : null; },{passive:true});
  root.addEventListener('touchend',e => {
    if (touch && e.changedTouches.length) {
      const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];
      if (Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.6) select((index+(dx<0?1:themes.length-1))%themes.length);
    }
    touch=null;
  },{passive:true});
  return function render(enabled) {
    if (!enabled) { rotation.attach(null); return; }
    const fr = Boolean(french()), tag = fr ? 'fr' : 'en';
    if (locale !== tag) {
      if (root.dataset.campaignLocale !== tag || !root.querySelector('[data-campaign-position]')) {
        for (const el of root.querySelectorAll(':scope > .habibi-carousel-art,:scope > [data-campaign-panel],:scope > .campaign-controls')) el.remove();
        root.insertAdjacentHTML('beforeend',homeCampaignExtras(fr,base,index));
      }
      root.dataset.campaignLocale=tag;
      root.setAttribute('aria-roledescription',fr?'carrousel':'carousel');
      root.setAttribute('aria-label',fr?'À la une du casino':'Casino highlights');
      for (const b of root.querySelectorAll('.campaign-controls button')) b.disabled=false;
      select(index);locale=tag;
      rotation.sync();
    }
    rotation.attach(root);
  };
}
