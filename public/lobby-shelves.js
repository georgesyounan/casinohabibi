import { uiKit } from './discovery.js';
import { lobbyView, viewTitle } from './lobby-navigation.js';
import { campaignGallery } from './habibi-campaigns.js';
import { createHomeCampaign } from './banner-motion.js';
import {distributionEditor} from './catalogue-distribution.js';
import { createSportsCentre } from './sports-centre.js';
import { shareLink } from './referral-views.js';

export const shelfCopy = {
  opShelves: ['Scheduled shelves', 'Sélections planifiées'],
  shelfOverlap: [
    'A shelf with the same priority overlaps this market, device and time. Change the priority or the dates.',
    'Une sélection de même priorité couvre déjà ce marché, cet appareil et ces dates. Modifiez les dates ou la priorité.',
  ],
  shelf_published: ['Lobby shelf published', 'Sélection du hall publiée'],
  shelf_withdrawn: ['Lobby shelf withdrawn', 'Sélection du hall retirée'],
};

export function createPublicShelf({ api, french, appPath,openDemo,signIn }) {
  const media = matchMedia('(max-width: 700px)'),
    section = document.getElementById('scheduled-shelf');
  let last = '',
    generation = 0,
    timer;
  async function refresh(force = false) {
    const lang = french() ? 'fr' : 'en',
      channel = media.matches ? 'mobile' : 'desktop',
      key = lang + channel;
    if (!force && last === key) return;
    last = key;
    clearTimeout(timer);
    const token = ++generation;
    try {
      const data = await api('v1/lobby?lang=' + lang + '&channel=' + channel, undefined, 'GET');
      if (token !== generation) return;
      section.replaceChildren();
      const categories=(data.categories||[data.shelf]).filter(row=>row?.items?.length);
      section.hidden = !categories.length;
      for (const category of categories) {
        const h = document.createElement('h2');
        h.textContent = category.title;
        if(category.art){const cover=document.createElement('img');cover.src=appPath('/'+category.art);cover.alt='';cover.loading='lazy';cover.className='shelf-art';section.append(cover);}
        const ul = document.createElement('ul');
        ul.className = 'shelf-titles';
        for (const game of category.items) {
          const li = document.createElement('li'),
            a = document.createElement('a');
          a.textContent = game.title;
          a.href = appPath(
            '/?' + new URLSearchParams({ q: game.externalId, lang }) + '#provider-game-' + game.id,
          );
          li.append(a);
          if(globalThis.IntersectionObserver && crypto.randomUUID){
            const ref=crypto.randomUUID(),payload={ref,slot:category.key,revision:category.revision,position:category.items.indexOf(game)+1,game:game.id,lang,channel};
            let impression;
            const record=()=>impression||(impression=api('shelf-events',{...payload,action:'impression'}).catch(e=>{impression=null;throw e;}));
            const observer=new IntersectionObserver(entries=>{if(entries.some(v=>v.isIntersecting)){observer.disconnect();void record().catch(()=>{});}});
            observer.observe(li);
            const demo=document.createElement('button');demo.type='button';demo.className='ghost';demo.textContent=lang==='fr'?'Simulateur maison':'House simulator';
            demo.onclick=async()=>{demo.disabled=true;try{await record();const session=await api('shelf-events',{...payload,action:'launch'});openDemo(session.demo,undefined,session.ref);}
              catch(err){if(err.message==='signin')signIn();else {const error=document.createElement('small');error.setAttribute('role','status');error.textContent=lang==='fr'?'Sélection expirée.':'Selection expired.';li.append(error);}}finally{demo.disabled=false;}};
            li.append(demo);
          }
          ul.append(li);
        }
        section.append(h, ul);
        const discover=document.createElement('button');discover.type='button';discover.className='ghost';
        discover.textContent=lang==='fr'?'Un jeu au hasard':'Random game';
        discover.addEventListener('click',async()=>{discover.disabled=true;try{
          const {game}=await api('games/random?channel='+channel,undefined,'GET');
          if(game)location.assign(appPath('/?'+new URLSearchParams({q:game.externalId,lang})+'#provider-game-'+game.id));
          else await refresh(true);
        }finally{discover.disabled=false;}});
        section.append(discover);
      }
      // Re-read current eligibility when a long-running page crosses a publication boundary.
      const delay =
        data.nextChange == null
          ? 60000
          : Math.min(60000, Math.max(50, data.nextChange - Date.now() + 20));
      timer = setTimeout(() => {
        if (!document.hidden) void refresh(true);
      }, delay);
    } catch {
      if (token === generation) {
        last = '';
        section.hidden = true;
        timer = setTimeout(() => {
          if (!document.hidden) void refresh(true);
        }, 60000);
      }
    }
  }
  return {
    start() {
      media.addEventListener('change', () => void refresh());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void refresh(true);
      });
      void refresh();
    },
    refresh,
  };
}

export function createShelfEditor({ api, t, french, canPublish, staffId }) {
  const { el, l, field, button, local, date, pages } = uiKit(french),
    root = () => document.getElementById('operator-shelves-body');
  let selected = null,
    generation = 0;
  const get = (path) => api(path, undefined, 'GET'),
    post = (path, input) => api('admin/shelves/' + path, input);
  function clear() {
    selected = null;
    ++generation;
    root()?.replaceChildren();
  }
  async function load() {
    const token = ++generation,
      scope = staffId(),
      dest = root(),
      view = el('div', '', 'operator-view'),
      note = el('p');
    note.setAttribute('role', 'status');
    note.textContent = l('Loading…', 'Chargement…');
    dest.replaceChildren(note);
    const current = () => token === generation && scope === staffId();
    try {
      const { items, zone } = await get('admin/shelves');
      function edit(name) {
        selected = name;
        void load();
      }
      const row = items.find((r) => r.name === selected);
      if (selected === null) {
        placementReport(view,{api,ui:uiKit(french)});
        distributionEditor(view,{ui:uiKit(french),api,t,canPublish});
        if (canPublish()) view.append(button(l('Create shelf', 'Créer une sélection'), () => edit('')));
        const list = el('div', '', 'contact-list');
        view.append(list);
        pages(
          list,
          items,
          (r) => {
            const c = el('article', '', 'contact-card');
            c.append(
              el('h4', local(r.spec, 'title') || r.spec.titleEn),
              el(
                'p',
                [
                  r.spec.market || l('All markets', 'Tous les marchés'),
                  r.spec.start,
                  r.spec.end,
                  r.spec.zone,
                  'v' + r.version,
                ].join(' · '),
              ),
              el('p', r.active ? l('Published', 'Publiée') : l('Withdrawn', 'Retirée')),
              button(l('View shelf', 'Voir la sélection'), () => edit(r.name), true),
            );
            return c;
          },
          l('No shelves have been scheduled.', 'Aucune sélection planifiée.'),
        );
      } else {
        const games = await get('games'),
          s = row?.spec || {};
        view.append(button(l('Back to shelves', 'Retour aux sélections'), () => edit(null), true));
        const f = el('form', '', 'admin-editor op-form');
        view.append(f);
        const name = field(f, 'name', l('Permanent ID', 'Identifiant permanent'), {
          required: true,
          maxLength: 40,
          value: s.name || '',
          placeholder: 'weekend-picks',
        });
        name.pattern = '[a-z][a-z0-9-]{0,39}';
        name.disabled = !!row;
        const en = field(f, 'titleEn', l('Default title (English)', 'Titre par défaut (anglais)'), {
          required: true,
          maxLength: 80,
          value: s.titleEn,
        });
        const translations = el('details', '', 'admin-disclosure');
        translations.append(el('summary', l('Translations', 'Traductions')));
        f.append(translations);
        const fr = field(translations, 'titleFr', l('French title', 'Titre français'), {
            maxLength: 80,
            value: s.titleFr,
          }),
          es = field(translations, 'titleEs', l('Spanish title', 'Titre espagnol'), {
            maxLength: 80,
            value: s.titleEs,
          });
        const market = field(
          f,
          'market',
          l('Market code (blank for all)', 'Code du marché (vide pour tous)'),
          { maxLength: 6, value: s.market, placeholder: 'CA' },
        );
        const channel = field(f, 'channel', l('Device', 'Appareil'), {
          items: [
            ['all', l('All devices', 'Tous')],
            ['mobile', l('Mobile', 'Téléphone')],
            ['desktop', l('Desktop', 'Ordinateur')],
          ],
          value: s.channel || 'all',
        });
        const cohort=field(f,'cohort',l('Audience','Public'),{items:[['all',l('All players','Tous les joueurs')],['vip','VIP']],value:s.cohort||'all'});
        const artKeys=['','game-gold.webp','game-aurora.webp','game-roulette.webp','game-blackjack.webp','campaign-match.webp','campaign-casino.webp','campaign-reels.webp'];
        const artwork=['En','Fr','Es'].map(lang=>field(translations,'art'+lang,l('Artwork','Visuel')+' · '+lang,{items:artKeys.map(a=>[a,a||'—']),value:s['art'+lang]||''}));
        const start = field(f, 'start', l('Start (local time)', 'Début (heure locale)'), {
          type: 'datetime-local',
          required: true,
          value: s.start,
        });
        const end = field(f, 'end', l('End (local time)', 'Fin (heure locale)'), {
          type: 'datetime-local',
          required: true,
          value: s.end,
        });
        const timezone = field(f, 'zone', l('Editorial time zone', 'Fuseau horaire éditorial'), {
          value: s.zone || zone,
          required: true,
          maxLength: 64,
        });
        const category = field(f, 'category', l('Game category', 'Catégorie de jeux'), {
          items: [
            ['all', l('All games', 'Tous les jeux')],
            ['slots', t('slots')],
            ['table', t('table')],
            ['live', t('live')],
          ],
          value: s.category || 'all',
        });
        const sort = field(f, 'sort', l('Fill remaining slots', 'Remplir les places restantes'), {
          items: [
            ['name', l('By title', 'Par titre')],
            ['new', l('Newest first', 'Plus récents')],['popular',l('Most launched in 7 days','Plus lancés sur 7 jours')],['jackpot','Jackpot'],
          ],
          value: s.sort || 'name',
        });
        const cap = field(f, 'cap', l('Number of places', 'Nombre de places'), {
          type: 'number',
          min: 1,
          max: 12,
          required: true,
          value: s.cap || 3,
        });
        const priority = field(
          f,
          'priority',
          l('Priority (higher wins)', 'Priorité (la plus élevée l’emporte)'),
          { type: 'number', min: 0, max: 100, required: true, value: s.priority ?? 10 },
        );
        const overrides = el('details', '', 'admin-disclosure');
        overrides.append(el('summary', l('Pin or hide titles', 'Épingler ou masquer des titres')));
        f.append(overrides);
        const rows = el('div');
        overrides.append(rows);
        function override(mode, id, slot = 1) {
          const div = el('div', '', 'op-override');
          rows.append(div);
          const items = games.map((g) => [
            g.id,
            (french() ? g.titleFr : g.titleEn) + ' · ' + g.provider,
          ]);
          if (id && !games.some((g) => g.id === id))
            items.unshift([id, l('Unavailable listing', 'Fiche indisponible') + ' #' + id]);
          const game = field(
            div,
            'game',
            mode === 'pin' ? l('Pinned title', 'Titre épinglé') : l('Hidden title', 'Titre masqué'),
            { items, value: id },
          );
          const position =
            mode === 'pin'
              ? field(div, 'slot', l('Position', 'Position'), {
                  type: 'number',
                  required: true,
                  min: 1,
                  max: 12,
                  value: slot,
                })
              : null;
          div.dataset.mode = mode;
          div.append(button(l('Remove', 'Retirer'), () => div.remove(), true));
          return { game, position };
        }
        (s.pins || []).forEach((p) => override('pin', p.id, p.slot));
        (s.hide || []).forEach((id) => override('hide', id));
        if (games.length)
          overrides.append(
            button(l('Pin a title', 'Épingler un titre'), () => override('pin'), true),
            button(l('Hide a title', 'Masquer un titre'), () => override('hide'), true),
          );
        function spec() {
          const pins = [],
            hide = [];
          for (const div of rows.children) {
            const id = Number(div.querySelector('[name=game]').value);
            if (div.dataset.mode === 'pin')
              pins.push({ id, slot: Number(div.querySelector('[name=slot]').value) });
            else hide.push(id);
          }
          return {
            name: name.value,
            titleEn: en.value,
            titleFr: fr.value,
            titleEs: es.value,
            market: market.value.trim().toUpperCase(),
            channel: channel.value,
            start: start.value,
            end: end.value,
            zone: timezone.value,
            category: category.value,
            sort: sort.value,cohort:cohort.value,artEn:artwork[0].value,artFr:artwork[1].value,artEs:artwork[2].value,
            cap: Number(cap.value),
            priority: Number(priority.value),
            pins,
            hide,
          };
        }
        const messages = el('p');
        messages.setAttribute('role', 'status');
        const preview = el('ol'),
          actions = el('div', '', 'discovery-actions');
        f.append(actions, messages, preview);
        let busy = false;
        function action(label, fn, validate = true) {
          const b = button(
            label,
            async () => {
              if (busy || (validate && !f.reportValidity())) return;
              busy = true;
              b.disabled = true;
              try {
                await fn();
              } catch (e) {
                if (current()) messages.textContent = t(e.message);
              } finally {
                busy = false;
                b.disabled = false;
              }
            },
            true,
          );
          actions.append(b);
        }
        f.onsubmit = (e) => e.preventDefault();
        action(l('Preview order', 'Prévisualiser l’ordre'), async () => {
          const data = await post('preview', { spec: spec(), lang: french() ? 'fr' : 'en' });
          if (current()) {
            messages.textContent =
              date(data.starts) +
              ' – ' +
              date(data.ends) +
              ' · ' +
              data.items.length +
              ' ' +
              l('titles', 'titres');
            preview.replaceChildren(...data.items.map((g) => el('li', g.title)));
          }
        });
        if (canPublish())
          action(l('Publish shelf', 'Publier la sélection'), async () => {
            const value = spec();
            await post('change', {
              action: 'publish',
              name: value.name,
              version: row?.version || 0,
              spec: value,
            });
            if (current()) edit(null);
          });
        if (row?.active && canPublish())
          action(
            l('Withdraw shelf', 'Retirer la sélection'),
            async () => {
              await post('change', { action: 'withdraw', name: row.name, version: row.version });
              if (current()) edit(null);
            },
            false,
          );
      }
      if (current()) dest.replaceChildren(view);
    } catch (e) {
      if (current()) note.textContent = t(e.message);
    }
  }
  return { load, clear };
}

// Public destinations share the catalogue, campaign, guide and account data already loaded for the lobby.
export function createLobbySections({
  bookApi,applyBookAccount,translate,
  french,
  appPath,
  catalogue,
  providers,
  house,
  account,
  club,
  support,
  roundTitle,
  money,
  ready,
  editionFailed,
  retryEdition,
  onNavigate
}) {
  const ui = uiKit(french);
  const { el, l, button } = ui;
  const lobby = document.getElementById('lobby');
  const panel = document.getElementById('hub-content');
  const menu = document.getElementById('home-menu');
  const offers = document.getElementById('campaign-placement');
  const help = document.querySelector('.faq-section');
  const locationView = () => lobbyView(new URL(location.href).searchParams.get('view'));
  const offersHome = document.createComment('Campaign placement');
  const guideHome = document.createComment('Casino FAQ');
  offers.before(offersHome);
  help.before(guideHome);
  let view = locationView();
  const enabled = () =>
    document.body.classList.contains('player-home') && document.body.dataset.lobbyBrand === 'habibi';
  const href = (params = {}, hash = '') =>
    appPath('/?') + new URLSearchParams({ lang: l('en', 'fr'), ...params }) + hash;
  let period = 7;
  const sports = createSportsCentre(panel, french, account, {api:bookApi,update:applyBookAccount,translate});
  const homeCampaign = createHomeCampaign(document.getElementById('default-lobby-hero'), french, appPath(''));
  function closeMenu() {
    lobby.removeAttribute('data-menu-open');
    menu.setAttribute('aria-expanded', 'false');
  }
  menu.addEventListener('click', () =>
    menu.setAttribute('aria-expanded', String(lobby.toggleAttribute('data-menu-open')))
  );
  document.addEventListener('keydown', (event) => {
    if (enabled() && event.key === 'Escape' && lobby.hasAttribute('data-menu-open')) {
      closeMenu();
      menu.focus();
    }
  });
  function link(text, url) {
    const a = el('a', text, 'hub-link');
    a.href = url;
    return a;
  }
  function note(text) {
    return el('p', text, 'hub-note');
  }
  function box() {
    return el('article', '', 'hub-card');
  }
  function control(label, run, id) {
    const b = button(label, run, true);
    b.dataset.hubControl = id;
    return b;
  }
  function options(items, active, change) {
    const nav = el('div', '', 'hub-choices');
    for (const [id, label] of items) {
      const b = control(
        label,
        () => {
          change(id);
          render();
        },
        String(id)
      );
      b.setAttribute('aria-pressed', String(id === active));
      nav.append(b);
    }
    return nav;
  }
  function directory() {
    const counts = new Map();
    const add = (key, n = 1) => counts.set(key, (counts.get(key) || 0) + n);
    const builtins = house();
    if (builtins.count) add(builtins.name, builtins.count);
    for (const title of catalogue.titles()) if (title.studio) add(title.studio);
    for (const title of providers()) add(title.provider);
    const grid = el('div', '', 'hub-directory');
    for (const [name, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
      const a = link(name, href({ q: name }, '#games'));
      a.append(el('small', count + ' ' + (count === 1 ? l('game', 'jeu') : l('games', 'jeux'))));
      grid.append(a);
    }
    panel.append(grid);
  }
  function activity() {
    const player = account();
    panel.append(
      note(
        player
          ? l('Your most recent simulated rounds.', 'Vos dernières parties en crédits fictifs.')
          : l(
              'Illustrative results with demo credits. Sign in to see your own rounds.',
              'Exemples de résultats en crédits fictifs. Connectez-vous pour voir vos propres parties.'
            )
      )
    );
    panel.append(
      options(
        [
          [1, l('24 hours', '24 heures')],
          [7, l('7 days', '7 jours')],
          [30, l('30 days', '30 jours')]
        ],
        period,
        (id) => {
          period = id;
        }
      )
    );
    const day = 86400000,
      now = Date.now();
    const rows = player
      ? (player.history || [])
          .filter((e) => e.game && e.createdAt >= now - period * day)
          .map((e) => [roundTitle(e), money(e.amount)])
      : [
          [0, 'Pulse 777', 250],
          [2, l('Neon Blackjack', 'Blackjack Néon'), -100],
          [12, l('Orbit Roulette', 'Roulette Orbit'), 400]
        ]
          .filter(([days]) => days < period)
          .map(([, name, cents]) => [name, money(cents)]);
    const list = el('ul', '', 'hub-results');
    for (const [name, amount] of rows) {
      const li = el('li');
      li.append(el('strong', name), el('span', amount));
      list.append(li);
    }
    panel.append(
      rows.length ? list : note(l('No rounds in this period.', 'Aucune partie pour cette période.'))
    );
  }
  // Keep the document, sidebar scroll and practice slip when moving between lobby sections.
  function navigate(target, push = true) {
    if (!enabled()) return false;
    const url = new URL(target, location.href);
    if (url.origin !== location.origin || url.pathname !== appPath('/')) return false;
    if (push && url.href !== location.href) {
      history.replaceState({ ...history.state, lobbyScroll: window.scrollY }, '', location.href);
      history.pushState({ lobbyScroll: 0 }, '', url);
    }
    view = locationView();
    closeMenu();
    onNavigate(url);
    const targetId = url.hash.slice(1);
    const anchor = targetId && document.getElementById(targetId);
    const heading = view ? document.getElementById('hub-title') : lobby;
    const focus = anchor || heading;
    if (focus && !focus.hasAttribute('tabindex')) focus.tabIndex = -1;
    focus?.focus({ preventScroll: true });
    if (!push && Number.isFinite(history.state?.lobbyScroll)) {
      window.scrollTo({ top: history.state.lobbyScroll, behavior: 'instant' });
    } else if (anchor) {
      anchor.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    return true;
  }
  document.addEventListener('click', event => {
    if (!enabled() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[data-home-view], a[data-house-games], a.hub-link, a.rail-safety, header a.brand');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = link.matches('.rail-safety') ? href({}, '#play-safely') : link.matches('header .brand') ? href() : link.href;
    if (navigate(target)) event.preventDefault();
  });
  window.addEventListener('popstate', () => { if (enabled()) navigate(location.href, false); });
  function render() {
    const active = enabled() && Boolean(view);
    homeCampaign(enabled() && !active);
    const gallery = document.getElementById('habibi-promo-gallery');
    if (gallery) {
      gallery.hidden = !(active && view === 'promotions');
      const locale = french() ? 'fr' : 'en';
      if (!gallery.hidden && gallery.dataset.locale !== locale) {
        gallery.innerHTML = campaignGallery(Boolean(french()), appPath(''));
        gallery.dataset.locale = locale;
      }
    }
    lobby.toggleAttribute('data-hub-open', active);
    lobby.toggleAttribute('data-club-promotions', active && view==='promotions');
    panel.hidden = !active;
    panel.removeAttribute('aria-busy');
    // These nodes carry live API updates and event handlers even while another section is open.
    if (view !== 'promotions' && panel.contains(offers)) offersHome.after(offers);
    if (view !== 'help' && panel.contains(help)) guideHome.after(help);
    if (!active || view !== 'sports') sports.leave();
    if (!enabled()) return;
    for (const a of document.querySelectorAll('[data-home-view]')) {
      const key = a.dataset.homeView;
      a.href = href(key === 'home' ? {} : { view: key });
      const current = key === 'home' ? view !== 'sports' : key === view;
      if (current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    document.querySelector('[data-house-games]').href = href({}, '#home-originals');
    if (!active) return;
    for (const filter of document.querySelectorAll('#filters [data-filter]')) filter.setAttribute('aria-pressed', 'false');
    const focused = panel.contains(document.activeElement)
      ? document.activeElement.dataset.hubControl
      : null;
    let title = document.getElementById('hub-title');
    if (!title) {
      title = el('h1');
      title.id = 'hub-title';
      title.tabIndex = -1;
      panel.prepend(title);
    }
    title.textContent = viewTitle(view, french());
    if (view === 'sports') {
      if (!panel.querySelector('.sports-centre')) while (title.nextSibling) title.nextSibling.remove();
      sports.render();
      return;
    }
    while (title.nextSibling) title.nextSibling.remove();
    const waiting = (view === 'new' || view === 'studios' || view === 'activity') && !ready(view);
    if (waiting) {
      panel.setAttribute('aria-busy', 'true');
      const loading = note(l('Loading…', 'Chargement…'));
      loading.setAttribute('role', 'status');
      panel.append(loading);
      return;
    }
    if (view === 'new' && editionFailed()) {
      panel.append(note(l('New releases could not be loaded.', 'Impossible de charger les nouveautés.')),
        button(l('Try again', 'Réessayer'), retryEdition, true));
      return;
    }
    if (view === 'studios') directory();
    if (view === 'activity') activity();
    if (view === 'new') {
      const titles = [...catalogue.titles()].sort((a, b) => b.id - a.id);
      const grid = el('div', '', 'cards');
      grid.append(...titles.slice(0, 24).map(catalogue.card));
      panel.append(
        titles.length
          ? grid
          : note(l('New releases will appear here.', 'Les nouveaux jeux apparaîtront ici.'))
      );
    }
    if (view === 'promotions') {
      const area = el('div', '', 'hub-offers');
      area.append(offers);
      panel.append(area);
    }
    if (view === 'invite') {
      const card = box();
      card.append(
        el('h2', l('Share the casino', 'Partager le casino')),
        note(
          l(
            'Send the French or English lobby link to a friend.',
            'Envoyez le lien de l’accueil en français ou en anglais à un ami.'
          )
        )
      );
      const invite=account()?.invitation;
      if(invite){
        card.querySelector('p')?.remove();
        card.append(note(l('Earn 5 club points when your friend verifies their account and saves their first studio game.','Recevez 5 points du Club quand votre ami confirme son compte et enregistre son premier jeu du studio.')));
        shareLink(card,new URL(appPath('/i/'+invite.code)+'?lang='+l('en','fr'),location.origin).href,ui);
        card.append(note(invite.invited+' '+l('registered','inscrits')+' · '+invite.qualified+' '+l('qualified','qualifiés')));
      }else{
        shareLink(card,new URL(href(),location.origin).href,ui);
        const sign=el('a',l('Sign in for your personal invite link','Se connecter pour obtenir son lien personnel'));
        sign.href=href({view:'invite',access:'signin'});card.append(sign);
      }
      panel.append(
        card,
        button(l('Partner portal', 'Portail partenaire'), () => club('partner'), true)
      );
    }
    if (view === 'help') {
      panel.append(
        help,
        button(l('Contact support', 'Contacter l’assistance'), support),
        button(
          l('Notification preferences', 'Préférences de notification'),
          () => club('preferences'),
          true
        )
      );
    }
    if (focused)
      [...panel.querySelectorAll('[data-hub-control]')]
        .find((n) => n.dataset.hubControl === focused)
        ?.focus({ preventScroll: true });
  }
  return { render, navigate, closeMenu, active: () => enabled() && Boolean(view), homeUrl: href };
}

function placementReport(view,{api,ui}){
  const {el,l,field}=ui,box=el('details','','admin-disclosure'),panel=el('div');
  box.append(el('summary',l('Placement performance','Performance des placements')),panel);view.append(box);
  async function show(slot='',game=''){
    try{const p=new URLSearchParams();if(slot)p.set('slot',slot);if(game)p.set('game',game);
      const data=await api('admin/shelves/metrics?'+p,undefined,'GET');panel.replaceChildren();
      const f=el('form','','op-form'),a=field(f,'slot',l('Shelf','Sélection'),{value:slot}),g=field(f,'game',l('Game ID','Numéro de jeu'),{type:'number',min:1,value:game});
      f.append(el('button',l('Filter','Filtrer')));panel.append(f);f.onsubmit=e=>{e.preventDefault();void show(a.value,g.value);};
      if(!data.entries.length)panel.append(el('p',l('Conversion unavailable · zero impressions','Conversion indisponible · zéro impression')));
      for(const x of data.entries){const d=el('details');d.append(el('summary',x.slot+' #'+x.position+' · '+x.title+' · '+x.conversion.toFixed(1)+' %'),el('p',x.launches+' / '+x.impressions+' · GGR '+(x.ggr/100).toFixed(2)+' '+x.currency));for(const r of x.receipts)d.append(el('small','#'+r.receipt+' · '+r.stake+' / '+r.wins+(r.corrected?' · '+l('corrected','corrigé'):'')));panel.append(d);}
      for(const pay of data.payments)panel.append(el('p',l('Deposits / withdrawals','Dépôts / retraits')+' · '+(pay.deposits/100).toFixed(2)+' / '+(pay.withdrawals/100).toFixed(2)+' '+pay.currency));
    }catch{panel.textContent=l('Unable to load report.','Chargement du rapport impossible.');}
  }
  box.ontoggle=()=>{if(box.open)void show();};
}
