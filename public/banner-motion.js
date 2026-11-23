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

export function createRotation(advance, french, dwell = 6500) {
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

const themes = [
  {id:'casino', names:['Habibi Studio','Habibi Studio']},
  {id:'reels', names:['Neon reels','Rouleaux néon'], tag:['Slots','Machines à sous'],
    detail:['Explore the slot demos in the game lobby.','Retrouve les machines à sous jouables du hall.'],
    action:['Explore slots','Voir les machines'], query:'&amp;category=slots#games'},
  {id:'match', names:['Match night','Soir de match'], tag:['Sports demo','Sports en démo'],
    detail:['Follow the simulated scores and build your practice slip.','Suis les scores simulés et compose ton coupon démo.'],
    action:['Open sports','Ouvrir les sports'], query:'&amp;view=sports'}
];
export function homeCampaignExtras(fr, base) {
  const lang = Number(fr);
  const art = '<div class="campaign-images" aria-hidden="true">' + themes.map(theme=>`<i class="campaign-${theme.id}"></i>`).join('') + '</div>';
  const slides = themes.slice(1).map(({names,tag,detail,action,query},i)=>
    `<div class="hero-content" data-campaign-panel="${i+1}" hidden><p class="hero-mode">${tag[lang]}</p><h1>${names[lang]}</h1><p class="hero-description">${detail[lang]}</p><a class="button hero-browse hub-link" href="${base}/?lang=${fr?'fr':'en'}${query}">${action[lang]} <i class="ui-icon ico-next" aria-hidden="true"></i></a></div>`).join('');
  const dots = themes.map((theme,i) => `<button type="button" class="campaign-dot" data-campaign-select="${i}" aria-label="${fr?'Bannière':'Slide'} ${i+1} · ${theme.names[lang]}"${i===0?' aria-current="true"':''}></button>`).join('');
  return art + slides + `<div class="campaign-controls">${rotationButton(fr)}<div class="campaign-dots">${dots}</div></div>`;
}

export function createHomeCampaign(root, french, base) {
  let index = 0, locale;
  const rotation = createRotation(() => select((index+1)%themes.length),french);
  function select(next) {
    if (!Number.isInteger(next) || !themes[next]) return;
    index = next;
    root.dataset.campaignIndex = String(index);
    root.querySelectorAll(':scope > .hero-content').forEach((panel,i) => { panel.hidden = i !== index; });
    for (const button of root.querySelectorAll('[data-campaign-select]')) {
      if (Number(button.dataset.campaignSelect) === index) button.setAttribute('aria-current','true');
      else button.removeAttribute('aria-current');
    }
  }
  root.addEventListener('click',event => {
    const button = event.target.closest('[data-campaign-select]');
    if (button) select(Number(button.dataset.campaignSelect));
  });
  root.addEventListener('keydown',event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    if (!event.target.closest('.campaign-controls')) return;
    event.preventDefault();
    select(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3);
    root.querySelector('[data-campaign-select="'+index+'"]').focus({preventScroll:true});
  });
  let touch;
  root.addEventListener('touchstart',e => { touch = e.touches.length===1 ? [e.touches[0].clientX,e.touches[0].clientY] : null; },{passive:true});
  root.addEventListener('touchend',e => {
    if (touch && e.changedTouches.length) {
      const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];
      if (Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.6) select((index+(dx<0?1:2))%3);
    }
    touch=null;
  },{passive:true});
  return function render(enabled) {
    if (!enabled) { rotation.attach(null); return; }
    const fr = Boolean(french()), tag = fr ? 'fr' : 'en';
    if (locale !== tag) {
      if (root.dataset.campaignLocale !== tag || !root.querySelector('.campaign-controls')) {
        for (const el of root.querySelectorAll(':scope > .campaign-images,:scope > [data-campaign-panel],:scope > .campaign-controls')) el.remove();
        root.insertAdjacentHTML('beforeend',homeCampaignExtras(fr,base));
      }
      root.dataset.campaignLocale=tag;
      root.setAttribute('aria-roledescription',fr?'carrousel':'carousel');
      root.setAttribute('aria-label',fr?'À la une du casino':'Casino highlights');
      for (const b of root.querySelectorAll('.campaign-controls button')) b.disabled=false;
      select(index);locale=tag;
    }
    rotation.attach(root);
  };
}
