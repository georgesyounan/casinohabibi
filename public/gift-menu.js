const copy = {
  spins: ['Weekly free spins', 'Tours gratuits de la semaine'],
  reload: ['Daily reload', 'Recharge quotidienne'],
  rakeback: ['Rakeback', 'Retour sur les mises'],
  daily: ['Daily bonus', 'Bonus quotidien'],
  weekly: ['Weekly bonus', 'Bonus hebdomadaire'],
  premonth: ['Pre-monthly bonus', 'Bonus pré-mensuel'],
  monthly: ['Monthly bonus', 'Bonus mensuel']
};
export const giftLabel = (key, fr) => copy[key]?.[Number(fr)] || '';
const formats = [false, true].map((fr) =>
  [0, 2].map(
    (minimumFractionDigits) =>
      new Intl.NumberFormat(fr ? 'fr-CA' : 'en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits,
        maximumFractionDigits: 2
      })
  )
);
const cash = (n, fr) => formats[Number(fr)][n % 100 ? 1 : 0].format(n / 100);
const safe = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const link = (base, fr, params, hash = '') =>
  safe(base + '/?' + new URLSearchParams({ lang: fr ? 'fr' : 'en', ...params }) + hash);
const svg = (body) =>
  '<svg aria-hidden="true" width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">' +
  body +
  '</svg>';
const chip = (mark) =>
  svg(
    '<circle cx="16" cy="16" r="13.3"/><circle cx="16" cy="16" r="11.7" stroke-width="3" stroke-dasharray="5 7"/><circle cx="16" cy="16" r="8.2" stroke-width="1"/>' +
      mark
  );
const number = (n) =>
  '<text x="16" y="16.8" text-anchor="middle" dominant-baseline="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif" font-weight="800" font-size="10">' +
  n +
  '</text>';
const icons = {
  spins: svg(
    '<path d="M5.1 10.2A12 12 0 0 1 25 8M26.9 21.8A12 12 0 0 1 7.2 24M4.8 5.5v5.3h5m17.5 15.8v-5.3h-5"/><path d="M11.6 12h9l-5 9h-3.3l4.2-7H12z" fill="currentColor" stroke="none"/>'
  ),
  reload: svg(
    '<rect x="4.5" y="4" width="22.5" height="24" rx="4"/><circle cx="16" cy="16" r="5"/><path d="M16 9v3m0 8v3m-7-7h3m8 0h3m4-6h2m-2 12h2"/>'
  ),
  rakeback: svg(
    '<path d="M7 7a12 12 0 0 0 8 20m-3-3 3 3-3 3m13-5a12 12 0 0 0-8-20m3 3-3-3 3-3"/><circle cx="16" cy="16" r="7.6"/><path d="M18.4 13.6c-1-1.6-4.8-1.4-4.8.6 0 2.1 5 .8 5 3.4 0 2.2-3.6 2.6-5.4.8M16 11v1.8m0 6.4V21" stroke-width="1.5"/>'
  ),
  daily: chip(number(1)),
  weekly: chip(number(7)),
  monthly: chip(number(30)),
  premonth: chip(
    '<path d="m16 10.9 1.6 3.1 3.5.5-2.6 2.5.7 3.4-3.2-1.6-3.1 1.6.6-3.4-2.5-2.5 3.4-.5z" stroke-width="1.4"/>'
  )
};
const ticket = svg(
  '<path d="M4 8h24v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z" fill="currentColor" stroke="none"/><path d="M21 9v2m0 2v2m0 2v2m0 2v2" stroke="#5e411b"/>'
);
function rowText(row, fr) {
  const l = (en, f) => (fr ? f : en);
  if (row.key === 'spins')
    return row.state === 'play'
      ? l(row.remaining + ' left · Gold Rush', row.remaining + ' restants · Ruée vers l’or')
      : l('7 × $1 play-money spins', '7 tours fictifs de 1 $');
  if (row.key === 'rakeback')
    return (
      l('1% of yesterday’s play-money stakes', '1 % des mises fictives d’hier') +
      (row.amount ? ' · ' + cash(row.amount, fr) : '')
    );
  if (row.key === 'premonth') return cash(row.amount, fr) + ' · ' + l('from the 25th', 'dès le 25 du mois');
  return cash(row.amount, fr) + ' · ' + l('play money', 'argent fictif');
}
function giftRow(row, fr, base, pending) {
  const l = (en, f) => (fr ? f : en),
    key = row.key;
  const labels = {
    available: l('Claim', 'Réclamer'),
    guest: l('Claim', 'Réclamer'),
    claimed: l('Claimed', 'Réclamé'),
    play: l('Spin', 'Jouer'),
    off: l('Inactive', 'Inactif'),
    empty: l('No credit', 'Aucun crédit'),
    scheduled: l('From the 25th', 'Dès le 25'),
    paused: l('Paused', 'En pause'),
    pending: '…'
  };
  const state = pending ? 'pending' : row.state,
    text = labels[state],
    name = giftLabel(key, fr);
  const attr = 'data-gift-key="' + key + '" class="gift-cta" aria-label="' + safe(text + ' · ' + name) + '"';
  const control =
    state === 'guest'
      ? `<a ${attr} href="${link(base, fr, { gift: key, access: 'signin' })}">${text}</a>`
      : `<button type="button" ${attr}${['available', 'play'].includes(state) ? '' : ' disabled'}>${text}</button>`;
  return `<li class="gift-row" data-reward="${key}" data-state="${state}"><span class="gift-icon">${icons[key]}</span><div><strong>${name}</strong><small>${rowText(row, fr)}</small></div>${control}</li>`;
}
export function giftContents(data, fr, base, { full = false, pending = false } = {}) {
  const l = (en, f) => (fr ? f : en);
  const all = link(base, fr, { view: 'promotions', club: 'daily' }, '#gift-catalogue');
  if (!data)
    return (
      '<p class="gift-status" role="status">' + l('Loading rewards…', 'Chargement des récompenses…') + '</p>'
    );
  const tickets = pending ? '…' : data.raffle.tickets;
  const raffle = `<a class="gift-banner hub-link" href="${link(base, fr, {}, '#weekly-raffle')}"><span class="gold-pass" aria-hidden="true"><b>H</b></span><span class="gift-prize"><strong>${cash(data.raffle.prize, fr)} <small>${l('play money', 'fictifs')}</small></strong><b>${l('Weekly raffle', 'Tirage de la semaine')}</b></span><span class="gift-tickets" aria-label="${l('My tickets', 'Mes billets')} · ${tickets}">${ticket}<b>${tickets}</b></span></a>`;
  return (
    raffle +
    '<ul class="gift-list">' +
    data.rows.map((row) => giftRow(row, fr, base, pending)).join('') +
    '</ul>' +
    '<p class="gift-status" role="status"></p>' +
    (full
      ? ''
      : `<a class="gift-all hub-link" href="${all}">${l('All rewards', 'Toutes les récompenses')} <span aria-hidden="true">›</span></a>`)
  );
}
export function createGiftMenu({
  api,
  base,
  french,
  account,
  pending,
  signin,
  update,
  refreshIdentity,
  translate
}) {
  const menu = document.getElementById('header-rewards');
  if (!menu) return { sync() {}, open() {}, close() {} };
  const summary = menu.querySelector('summary'),
    panel = menu.querySelector('.gift-content');
  const catalogue = document.getElementById('gift-catalogue');
  const surfaces = [panel, catalogue?.querySelector('.gift-content')].filter(Boolean);
  const initial = document.getElementById('gift-public-state');
  const preview = initial ? JSON.parse(initial.textContent) : null;
  const owner = () => account()?.id || 0;
  const inCatalogue = () =>
    catalogue && document.getElementById('lobby')?.hasAttribute('data-club-promotions');
  const showing = () => menu.open || inCatalogue();
  let model = preview,
    identity = 0,
    revision = 0,
    loading = false,
    saving = '',
    expires = 0,
    notice = '',
    error = false,
    intent = '';
  function paint(all = false) {
    const fr = Boolean(french()),
      wait = pending() || Boolean(owner() && !model?.member);
    if (catalogue) catalogue.querySelector('h2').textContent = fr ? 'Toutes les récompenses' : 'All rewards';
    for (const surface of surfaces) {
      if (!all && (surface === panel ? !menu.open : !inCatalogue())) continue;
      const markup = giftContents(model || preview, fr, base, { full: surface !== panel, pending: wait });
      if (surface.giftMarkup !== markup) {
        const focus = surface.contains(document.activeElement)
          ? document.activeElement.closest('[data-gift-key]')?.dataset.giftKey
          : null;
        const scroll = surface.querySelector('.gift-list')?.scrollTop || 0;
        surface.innerHTML = markup;
        surface.giftMarkup = markup;
        const list = surface.querySelector('.gift-list');
        if (list) list.scrollTop = scroll;
        if (focus) focusRow(surface, focus);
      }
      const status = surface.querySelector('.gift-status');
      if (status && (status.giftNotice !== notice || status.giftError !== error)) {
        status.giftNotice = notice;
        status.giftError = error;
        status.textContent = notice;
        if (error) {
          const retry = document.createElement('button');
          retry.type = 'button';
          retry.dataset.giftRetry = '';
          retry.textContent = fr ? 'Réessayer' : 'Retry';
          status.append(' ', retry);
        }
      }
      for (const button of surface.querySelectorAll('button[data-gift-key]')) {
        const available = ['available', 'play'].includes(button.closest('[data-state]').dataset.state);
        button.disabled = Boolean(saving) || !available;
        button.toggleAttribute('data-submitting', saving === button.dataset.giftKey);
      }
      surface.setAttribute('aria-busy', String(Boolean(saving || loading)));
    }
  }
  function focusRow(surface, key) {
    const target = surface.querySelector('[data-gift-key="' + key + '"]');
    if (!target) return;
    if (!target.disabled) target.focus({ preventScroll: true });
    else {
      const row = target.closest('li');
      row.tabIndex = -1;
      row.focus({ preventScroll: true });
    }
  }
  function receive(next) {
    model = next;
    expires = Math.min(next.nextDay, Date.now() + 30_000);
    paint();
  }
  async function sync(force = false, preserveNotice = false) {
    const id = owner();
    const changed = identity !== id;
    if (changed) {
      identity = id;
      revision++;
      loading = false;
      saving = '';
      model = preview;
      notice = '';
      error = false;
      expires = 0;
    }
    paint(changed);
    if (pending() || !showing() || loading || saving || document.hidden || (!force && Date.now() < expires))
      return;
    const version = ++revision;
    loading = true;
    try {
      const fresh = await api('discovery/gifts', undefined, 'GET');
      if (version !== revision || id !== owner()) return;
      if ((fresh.owner || 0) !== id) {
        model = null;
        await refreshIdentity(id);
        return;
      }
      if (!preserveNotice) {
        if (error) notice = '';
        error = false;
      }
      receive(fresh);
      if (intent && menu.open) {
        focusRow(panel, intent);
        intent = '';
      }
    } catch {
      if (version === revision) {
        expires = Date.now() + 10_000;
        error = true;
        notice = french() ? 'Impossible d’actualiser les récompenses.' : 'Rewards could not be refreshed.';
      }
    } finally {
      if (version === revision) {
        loading = false;
        paint();
      }
    }
  }
  async function redeem(key) {
    if (saving || pending() || !owner()) return;
    const row = model?.rows.find((item) => item.key === key);
    if (!row || !['available', 'play'].includes(row.state)) return;
    const id = owner(),
      version = ++revision;
    loading = false;
    saving = key;
    notice = '';
    error = false;
    paint();
    try {
      const result = await api('discovery/gift', {
        owner: id,
        key,
        period: row.period,
        action: row.state === 'play' ? 'spin' : 'claim',
        ordinal: row.ordinal,
        amount: row.amount
      });
      if (version !== revision || id !== owner() || result.account.id !== id) return;
      const fr = french();
      notice = result.spin
        ? result.spin.reels.join(' ') +
          ' · ' +
          (result.amount ? '+' + cash(result.amount, fr) : fr ? 'Aucun gain' : 'No win')
        : row.key === 'spins'
          ? fr
            ? 'Vos 7 tours gratuits sont prêts.'
            : 'Your 7 free spins are ready.'
          : giftLabel(key, fr) + ' · +' + cash(row.amount, fr);
      receive(result.gifts);
      update(result.account);
    } catch (e) {
      if (version === revision) {
        notice = translate(e.message);
        error = true;
        expires = 0;
      }
    } finally {
      if (version === revision) {
        saving = '';
        paint();
        if (error) void sync(true, true);
      }
    }
  }
  for (const surface of surfaces)
    surface.addEventListener('click', (e) => {
      const retry = e.target.closest('[data-gift-retry]');
      if (retry) {
        void sync(true);
        return;
      }
      const control = e.target.closest('[data-gift-key]');
      if (
        !control ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      if (!owner() && pending()) return;
      e.preventDefault();
      if (control.disabled || saving || e.detail > 1) return;
      const key = control.dataset.giftKey;
      if (!owner()) {
        menu.open = false;
        signin(key);
      } else void redeem(key);
    });
  menu.addEventListener('toggle', () => {
    if (menu.open) {
      notice = '';
      error = false;
      void sync(true);
    }
  });
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener('focusin', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      e.preventDefault();
      menu.open = false;
      summary.focus();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && showing()) void sync(true);
  });
  window.setInterval(() => {
    if (showing() && !document.hidden) void sync();
  }, 10_000);
  return {
    sync,
    close() {
      menu.open = false;
    },
    open(key) {
      intent = Object.hasOwn(copy, key) ? key : '';
      menu.open = true;
      summary.focus({ preventScroll: true });
      void sync(true);
    }
  };
}
