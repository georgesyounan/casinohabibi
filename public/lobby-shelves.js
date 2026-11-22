import { uiKit } from './discovery.js';

export const shelfCopy = {
  opShelves: ['Scheduled shelves', 'Sélections planifiées'],
  shelfOverlap: [
    'A shelf with the same priority overlaps this market, device and time. Change the priority or the dates.',
    'Une sélection de même priorité couvre déjà ce marché, cet appareil et ces dates. Modifiez les dates ou la priorité.',
  ],
  shelf_published: ['Lobby shelf published', 'Sélection du hall publiée'],
  shelf_withdrawn: ['Lobby shelf withdrawn', 'Sélection du hall retirée'],
};

export function createPublicShelf({ api, french, appPath }) {
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
      section.hidden = !data.shelf?.items?.length;
      if (!section.hidden) {
        const h = document.createElement('h2');
        h.textContent = data.shelf.title;
        const ul = document.createElement('ul');
        ul.className = 'shelf-titles';
        for (const game of data.shelf.items) {
          const li = document.createElement('li'),
            a = document.createElement('a');
          a.textContent = game.title;
          a.href = appPath(
            '/?' + new URLSearchParams({ q: game.externalId, lang }) + '#provider-game-' + game.id,
          );
          li.append(a);
          ul.append(li);
        }
        section.append(h, ul);
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
            ['new', l('Newest first', 'Plus récents')],
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
            sort: sort.value,
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
