import { uiKit } from './discovery.js';

export const operatorCopy = {
  opWorkspace: ['Operator services', 'Espace opérateur'],
  opProducts: ['Products', 'Produits'],
  opSessions: ['Demo sessions', 'Sessions démo'],
  opServices: ['Service directory', 'Catalogue de services'],
  opOrders: ['My orders', 'Mes commandes'],
  opUnavailable: [
    'This action is unavailable in the current state.',
    'Cette action est indisponible dans l’état actuel.',
  ],
  opStale: [
    'This record changed. Reopen it to see the current version.',
    'Cette fiche a changé. Rouvrez-la pour voir la version actuelle.',
  ],
  opProductFirst: [
    'Activate the product before its provider.',
    'Activez le produit avant son fournisseur.',
  ],
  opLaunchDenied: [
    'Activate both the product and its provider to launch this demo.',
    'Activez le produit et son fournisseur pour lancer cette démo.',
  ],
  opSettled: ['This session has already ended.', 'Cette session est déjà terminée.'],
  opMissing: ['Record unavailable.', 'Fiche introuvable.'],
  opQuoteFirst: [
    'Accept the test quote before issuing its invoice reference.',
    'Acceptez le devis de test pour obtenir une référence de facture.',
  ],
  sandbox_product_configured: ['Demo configuration updated', 'Configuration démo modifiée'],
  sandbox_session_opened: ['Demo session opened', 'Session démo ouverte'],
  sandbox_session_settled: ['Demo round completed', 'Manche démo terminée'],
  service_ordered: ['Service ordered', 'Service commandé'],
  service_comment: ['Order comment added', 'Commentaire ajouté'],
  service_in_progress: ['Order in progress', 'Commande en cours'],
  service_delivered: ['Order delivered', 'Commande livrée'],
  service_closed: ['Order closed', 'Commande fermée'],
  service_quote: ['Test quote issued', 'Devis de test émis'],
  service_accept: ['Test quote accepted', 'Devis de test accepté'],
  service_invoiced: ['Test invoice issued', 'Référence de facture test émise'],
  service_assign: ['Order reassigned', 'Commande réattribuée'],
};

import { sportsAdmin } from './sport-tickets.js';

export function createOperatorUi({ api, t, french, role, staffId, canPublish, open }) {
  const { el, l, button, field, pages, date, local } = uiKit(french);
  const get = (path) => api('admin/operator/' + path, undefined, 'GET');
  const post = (path, input) => api('admin/operator/' + path, input);
  const root = (tab) => document.getElementById('operator-' + tab + '-body');
  const terms = {
    off: ['Inactive', 'Inactif'],
    active: ['Active', 'Actif'],
    suspended: ['Suspended', 'Suspendu'],
    pending: ['Awaiting connector check','Vérification en attente'],
    failed: ['Check failed', 'Vérification échouée'],
    setup: ['Setup available', 'Configuration disponible'],
    listed: ['Reference listing', 'Fiche de référence'],
    later: ['Planned', 'Prévu'],
    coming: ['Coming soon', 'À venir'],
    sport: ['Sport', 'Sport'],
    gaming: ['Sports and gaming', 'Sports et jeux'],
    data: ['Data feeds', 'Données'],
    marketing: ['Marketing', 'Marketing'],
    retail: ['Retail', 'Vente au détail'],
    business: ['Business development', 'Développement des affaires'],
    finance: ['Law and finance', 'Droit et finances'],
    it: ['IT', 'TI'],
    other: ['Other', 'Autres'],
    ordered: ['Ordered', 'Commandée'],
    in_progress: ['In progress', 'En cours'],
    delivered: ['Delivered', 'Livrée'],
    closed: ['Closed', 'Fermée'],
    en: ['English', 'Anglais'],
    fr: ['French', 'Français'],
    es: ['Spanish', 'Espagnol'],
    'wheel-7': ['Wheel landed on 7', 'La roue s’est arrêtée au 7'],
    'pair-queens': ['Pair of queens', 'Paire de dames'],
  };
  const label = (k) => (terms[k] ? l(...terms[k]) : k);
  const state = {
    product: '',
    service: '',
    session: '',
    order: '',
    productGroup: '',
    serviceGroup: '',
    q: '',
    orderPage: 1,
    sessionsBefore: '',
    sessionsTrail: [],
  };
  let generation = 0;
  const idPart = encodeURIComponent;
  function clear() {
    ++generation;
    Object.assign(state, {
      product: '',
      service: '',
      session: '',
      order: '',
      productGroup: '',
      serviceGroup: '',
      q: '',
      orderPage: 1,
      sessionsBefore: '',
      sessionsTrail: [],
    });
    for (const tab of ['products', 'sessions', 'services', 'orders']) root(tab)?.replaceChildren();
  }
  function form(parent) {
    const f = el('form', '', 'admin-editor op-form');
    parent.append(f);
    return f;
  }
  function group(parent, title) {
    const d = el('details', '', 'admin-disclosure'),
      s = el('summary', title),
      content = el('div', '', 'admin-detail-body');
    d.append(s, content);
    parent.append(d);
    return content;
  }
  function submit(f, title, save) {
    const b = el('button', title);
    b.type = 'submit';
    const status = el('p', '', 'muted');
    status.setAttribute('role', 'status');
    f.append(b, status);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (b.disabled) return;
      b.disabled = true;
      const token = generation;
      try {
        await save(() => token === generation);
      } catch (error) {
        if (token === generation) status.textContent = t(error.message);
      } finally {
        b.disabled = false;
      }
    });
  }
  function back(parent, tab, prop) {
    parent.append(
      button(
        l('Back to list', 'Retour à la liste'),
        () => {
          state[prop] = '';
          void load(tab);
        },
        true,
      ),
    );
  }
  function card(title, meta, action, fn) {
    const a = el('article', '', 'contact-card');
    a.append(el('h4', title), el('p', meta, 'muted'), button(action, fn, true));
    return a;
  }
  const options = (values) => values.map((v) => [v, label(v)]);
  const allOption = () => ['', l('All categories', 'Toutes les catégories')];
  const empty = () => l('No results.', 'Aucun résultat.');
  function selectIn(tab, key, id) {
    state[key] = id;
    void load(tab);
  }
  function goto(tab, key, id) {
    state[key] = id;
    open(tab);
  }
  async function load(tab) {
    const token = ++generation,
      dest = root(tab),
      scope = staffId();
    const view = el('div', '', 'operator-view');
    const status = el('p', l('Loading…', 'Chargement…'), 'muted');
    status.setAttribute('role', 'status');
    dest.replaceChildren(status);
    try {
      if (tab === 'products') await products(view);
      if (tab === 'sessions') await sessions(view);
      if (tab === 'services') await services(view);
      if (tab === 'orders') await orders(view);
      if (token === generation && scope === staffId()) dest.replaceChildren(view);
    } catch (e) {
      if (token === generation) status.textContent = t(e.message);
    }
  }
  async function products(view) {
    const data = await get('products'),
      p = data.products.find((p) => p.id === state.product);
    if (!p) {
      const filters = el('div', '', 'discovery-filters'),
        list = el('div', '', 'contact-list');
      view.append(filters, list);
      const cat = field(filters, 'category', l('Product category', 'Catégorie de produits'), {
        items: [allOption(), ...options(['sport', 'gaming', 'data', 'retail', 'marketing'])],
        value: state.productGroup,
      });
      function draw() {
        state.productGroup = cat.value;
        pages(
          list,
          data.products.filter((p) => !cat.value || p.category === cat.value),
          (p) =>
            card(
              local(p, 'name'),
              label(p.availability) + (p.availability === 'setup' ? ' · ' + label(p.binding.state) : ''),
              l('Open product', 'Ouvrir le produit'),
              () => selectIn('products', 'product', p.id),
            ),
          empty(),
        );
      }
      cat.onchange = draw;
      draw();
      return;
    }
    back(view, 'products', 'product');
    if(p.id==='sportsbook' && role()==='operator_admin')sportsAdmin(view,{get,post,t,ui:uiKit(french)});
    view.append(el('h4', local(p, 'name')), el('p', label(p.category) + ' · ' + label(p.availability)));
    if (p.availability === 'setup') {
      view.append(
        el(
          'p',
          l(
            'Sandbox configuration · local test connector',
            'Configuration démo · connecteur de test local',
          ),
          'muted',
        ),
      );
      configureForm(view, p, '', p.binding);
      for (const s of p.providers) {
        const body = group(view, s.name + ' · ' + label(s.binding.state));
        body.append(el('p', local(s, 'title')));
        configureForm(body, p, s.id, s.binding);
        if (p.binding.state === 'active' && s.binding.state === 'active' && canPublish()) {
          const f = form(body),
            listing =
              s.id === 'atlas' && data.fixtureTitles.length
                ? field(f, 'listing', l('Demo title', 'Titre de démonstration'), {
                    items: [
                      ['', local(s, 'title')],
                      ...data.fixtureTitles.map((g) => [g.id, local(g, 'title') + ' · ' + g.provider]),
                    ],
                  })
                : null;
          submit(f, l('Launch demo', 'Lancer la démo'), async (current) => {
            const r = await post('play', {
              action: 'launch',
              environment: 'sandbox',
              provider: s.id,
              game: s.game,
              listingId: listing?.value ? Number(listing.value) : null,
            });
            if (current()) goto('sessions', 'session', r.id);
          });
        }
      }
      const history = group(view, l('Configuration history', 'Historique de configuration'));
      await productHistory(history, p.id);
    }
    const release = group(view, l('Release notes', 'Notes de version'));
    release.append(
      el(
        'p',
        data.referenceDate +
          ' · ' +
          (p.availability === 'setup'
            ? l('Version 1 of the sandbox setup.', 'Version 1 de la configuration de démonstration.')
            : l('Reference directory entry.', 'Fiche du catalogue de référence.')),
      ),
    );
  }
  function configureForm(parent, p, provider, binding) {
    parent.append(
      el(
        'p',
        label(binding.state) + ' · v' + binding.version + (binding.reason ? ' · ' + binding.reason : ''),
      ),
    );
    if (!canPublish()) return;
    const area = group(parent, l('Change configuration', 'Modifier la configuration')),
      f = form(area);
    const actions = [['enable', l('Activate or retry', 'Activer ou réessayer')]];
    if (!['off', 'suspended'].includes(binding.state))
      actions.push(['suspend', l('Suspend', 'Suspendre')]);
    const action = field(f, 'action', l('Action', 'Action'), { items: actions });
    const profile = field(f, 'profile', l('Test connector', 'Connecteur de test'), {
      items: [
        ['healthy', l('Available', 'Disponible')],
        ['pending', l('Awaiting credentials','En attente des identifiants')],
        ['offline', l('Simulate an outage', 'Simuler une panne')],
      ],
      value: binding.profile,
    });
    action.onchange = () => {
      profile.disabled = action.value === 'suspend';
    };
    const reason = field(f, 'reason', l('Reason', 'Motif'), { required: true, maxLength: 200 });
    submit(f, l('Save configuration', 'Enregistrer la configuration'), async (current) => {
      await post('configure', {
        environment: 'sandbox',
        product: p.id,
        provider,
        version: binding.version,
        action: action.value,
        profile: profile.value,
        reason: reason.value,
      });
      if (current()) await load('products');
    });
  }
  async function productHistory(area, product, before = '') {
    const r = await get('history?product=' + idPart(product) + (before ? '&before=' + before : ''));
    for (const e of r.items)
      area.append(
        el(
          'p',
          [
            e.provider || l('Product', 'Produit'),
            'v' + e.version,
            label(e.state),
            e.reason,
            date(e.happened), ...(e.incident?['Incident #'+e.incident]:[]),
          ].join(' · '),
        ),
      );
    if (!r.items.length) area.append(el('p', empty(), 'muted'));
    more(area, r.next, (n) => productHistory(area, product, n));
  }
  function more(area, next, draw) {
    if (!next) return;
    const b = button(
      l('Older entries', 'Entrées précédentes'),
      async () => {
        b.disabled = true;
        try {
          await draw(next);
          b.remove();
        } catch (e) {
          b.disabled = false;
          area.append(el('p', t(e.message)));
        }
      },
      true,
    );
    area.append(b);
  }
  async function sessions(view) {
    if (!state.session) {
      const r = await get(
        'sessions' + (state.sessionsBefore ? '?before=' + idPart(state.sessionsBefore) : ''),
      );
      if (!r.items.length)
        view.append(
          el(
            'p',
            l(
              'Launch a demo from an active provider to see its session here.',
              'Lancez une démo depuis un fournisseur actif pour voir sa session ici.',
            ),
          ),
        );
      for (const s of r.items)
        view.append(
          card(
            s.game,
            date(s.opened) + ' · ' + (s.closed ? label('closed') : l('Open', 'Ouverte')),
            l('View session', 'Voir la session'),
            () => selectIn('sessions', 'session', s.id),
          ),
        );
      if (state.sessionsTrail.length)
        view.append(
          button(
            l('Previous', 'Précédent'),
            () => {
              state.sessionsBefore = state.sessionsTrail.pop();
              void load('sessions');
            },
            true,
          ),
        );
      if (r.next)
        view.append(
          button(
            l('Next', 'Suivant'),
            () => {
              state.sessionsTrail.push(state.sessionsBefore);
              state.sessionsBefore = r.next;
              void load('sessions');
            },
            true,
          ),
        );
      return;
    }
    const s = await get('session?id=' + idPart(state.session));
    back(view, 'sessions', 'session');
    view.append(
      el('h4', s.listingTitle || s.game),
      el('p', s.id, 'op-reference'),
      el(
        'p',
        s.provider +
          ' · ' +
          l('Product version', 'Version du produit') +
          ' ' +
          s.productVersion +
          ' · ' +
          l('Provider version', 'Version du fournisseur') +
          ' ' +
          s.providerVersion,
      ),
    );
    if (s.listingRef) view.append(el('p', s.listingRef));
    const timeline = el('ol');
    for (const e of s.events)
      timeline.append(
        el(
          'li',
          date(e.time) +
            ' · ' +
            (e.kind === 'opened' ? l('Session opened', 'Session ouverte') : label(e.outcome)),
        ),
      );
    view.append(timeline);
    if (!s.closed && canPublish()) {
      const f = form(view);
      submit(f, l('Play the demo round', 'Jouer la manche démo'), async (current) => {
        await post('play', { action: 'settle', environment: 'sandbox', id: s.id });
        if (current()) await load('sessions');
      });
    }
    if (s.closed && s.replay) {
      const replay = group(view, l('Replay the fixture round', 'Revoir la manche fictive'));
      replay.append(
        el('p', date(s.opened) + ' · ' + l('Wheel starts', 'Départ de la roue')),
        el('p', date(s.closed) + ' · ' + label(s.outcome)),
      );
    }
  }
  async function services(view) {
    const { items } = await get('services'),
      s = items.find((x) => x.id === state.service);
    if (!s) {
      const filters = el('div', '', 'discovery-filters'),
        list = el('div', '', 'contact-list');
      view.append(filters, list);
      const search = field(filters, 'search', l('Find a service', 'Rechercher un service'), {
        type: 'search',
        maxLength: 100,
        value: state.q,
      });
      const cat = field(filters, 'category', l('Service group', 'Groupe de services'), {
        items: [allOption(), ...options(['business', 'finance', 'it', 'gaming', 'other'])],
        value: state.serviceGroup,
      });
      const fold = (v) => v.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      function draw() {
        state.q = search.value;
        state.serviceGroup = cat.value;
        pages(
          list,
          items.filter(
            (i) =>
              (!cat.value || i.group === cat.value) &&
              fold(i.nameEn + ' ' + i.nameFr).includes(fold(search.value.trim())),
          ),
          (i) =>
            card(
              local(i, 'name'),
              label(i.group) +
                ' · ' +
                (i.available
                  ? l('Available to order', 'Commande disponible')
                  : l('Reference only', 'Fiche de référence')),
              l('View service', 'Voir le service'),
              () => selectIn('services', 'service', i.id),
            ),
          empty(),
        );
      }
      search.oninput = draw;
      cat.onchange = draw;
      draw();
      return;
    }
    back(view, 'services', 'service');
    view.append(el('h4', local(s, 'name')), el('p', label(s.group)));
    if (!s.available) {
      view.append(
        el(
          'p',
          l(
            'Ordering is unavailable for this service.',
            'Les commandes sont indisponibles pour ce service.',
          ),
        ),
      );
      return;
    }
    view.append(
      el(
        'p',
        l(
          'Request a website translation and track the assigned agent’s replies under My orders.',
          'Demandez une traduction de site et retrouvez les réponses de l’agent dans Mes commandes.',
        ),
      ),
    );
    const info = group(view, l('Pricing and delivery', 'Tarification et livraison'));
    info.append(
      el(
        'p',
        l(
          'The assigned agent can propose a test quote. The requester reviews and accepts it before an invoice reference is available.',
          'L’agent peut proposer un devis fictif. Le demandeur l’accepte pour permettre la création d’une référence de facture de test.',
        ),
      ),
    );
    if (role() === 'operator_support') return;
    const agents = (await get('agents')).items,
      f = form(view);
    if (!agents.length) {
      f.append(
        el('p', l('An active service agent is required.', 'Un agent de service actif est requis.')),
      );
      return;
    }
    const lang = options(['en', 'fr', 'es']);
    const title = field(f, 'title', l('Order title', 'Titre de la commande'), {
      required: true,
      maxLength: 100,
    });
    const source = field(f, 'source', l('Source language', 'Langue source'), {
        items: lang,
        value: 'en',
      }),
      target = field(f, 'target', l('Target language', 'Langue cible'), { items: lang, value: 'es' });
    const agent = field(f, 'agent', l('Assigned agent', 'Agent responsable'), {
      items: agents.map((a) => [a.id, a.email]),
    });
    const brief = field(f, 'brief', l('Translation brief', 'Consignes de traduction'), {
      multiline: true,
      required: true,
      maxLength: 2000,
    });
    const file = field(
      f,
      'attachment',
      l('Optional text file (.txt, 16 KB)', 'Fichier texte facultatif (.txt, 16 Ko)'),
      { type: 'file' },
    );
    file.accept = '.txt,text/plain';
    submit(f, l('Place demo order', 'Créer la commande démo'), async (current) => {
      if (source.value === target.value) throw Error('invalid');
      let attachment;
      const selected = file.files[0];
      if (selected) {
        if (selected.size > 16384 || !selected.name.toLowerCase().endsWith('.txt'))
          throw Error('invalid');
        attachment = { name: selected.name, text: await selected.text() };
      }
      if (!current()) return;
      const r = await post('orders', {
        action: 'order',
        service: s.id,
        title: title.value,
        source: source.value,
        target: target.value,
        agent: Number(agent.value),
        brief: brief.value,
        attachment,
      });
      if (current()) goto('orders', 'order', r.id);
    });
  }
  async function orders(view) {
    if (!state.order) {
      const r = await get('orders?page=' + state.orderPage);
      view.append(
        el(
          'p',
          l(
            'Orders you requested or were assigned.',
            'Commandes que vous avez demandées ou qui vous sont attribuées.',
          ),
          'muted',
        ),
      );
      if (!r.items.length)
        view.append(
          button(
            l('Browse services', 'Ouvrir le catalogue de services'),
            () => goto('services', 'service', ''),
            true,
          ),
        );
      for (const o of r.items)
        view.append(
          card(
            o.title,
            label(o.status) + ' · ' + date(o.updated),
            l('View order', 'Voir la commande'),
            () => selectIn('orders', 'order', o.id),
          ),
        );
      if (r.page > 1)
        view.append(
          button(
            l('Previous', 'Précédent'),
            () => {
              state.orderPage = r.page - 1;
              void load('orders');
            },
            true,
          ),
        );
      if (r.page * r.pageSize < r.total)
        view.append(
          button(
            l('Next', 'Suivant'),
            () => {
              state.orderPage = r.page + 1;
              void load('orders');
            },
            true,
          ),
        );
      return;
    }
    const o = await get('order?id=' + idPart(state.order));
    back(view, 'orders', 'order');
    view.append(
      el('h4', o.title),
      el('p', [label(o.status), label(o.source) + ' → ' + label(o.target), date(o.updated)].join(' · ')),
      el('p', o.brief),
    );
    const refresh = async (action, input, current) => {
      await post('orders', { id: o.id, version: o.version, action, ...input });
      if (current()) await load('orders');
    };
    if (
      (o.canFulfill && ['ordered', 'in_progress'].includes(o.status)) ||
      (o.isOwner && o.status === 'delivered')
    ) {
      const f = form(view);
      submit(
        f,
        {
          ordered: l('Start work', 'Commencer le travail'),
          in_progress: l('Mark delivered', 'Marquer comme livrée'),
          delivered: l('Close order', 'Fermer la commande'),
        }[o.status],
        (c) => refresh('advance', {}, c),
      );
    }
    const f = form(view),
      note = field(
        f,
        'comment',
        l('Comment for the order participants', 'Commentaire pour les participants'),
        { multiline: true, required: true, maxLength: 2000 },
      );
    submit(f, l('Add comment', 'Ajouter le commentaire'), (c) =>
      refresh('comment', { text: note.value }, c),
    );
    if (o.isOwner && o.status !== 'closed') {
      const agents = (await get('agents')).items.filter((a) => a.id !== o.agent);
      if (agents.length) {
        const f = form(group(view, l('Change agent', 'Changer d’agent'))),
          agent = field(f, 'agent', l('New agent', 'Nouvel agent'), {
            items: agents.map((a) => [a.id, a.email]),
          });
        submit(f, l('Assign', 'Attribuer'), (c) => refresh('assign', { agent: Number(agent.value) }, c));
      }
    }
    function amount(n) {
      return (
        new Intl.NumberFormat(french() ? 'fr-CA' : 'en-CA', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n / 100) + ' TST'
      );
    }
    const commercial = group(view, l('Test quotes and invoice', 'Devis et facture de test'));
    if (o.latestQuote)
      commercial.append(
        el(
          'p',
          'v' +
            o.latestQuote.version +
            ' · ' +
            amount(o.latestQuote.minor) +
            (o.acceptedQuote ? ' · ' + l('Accepted', 'Accepté') : ''),
        ),
      );
    if (o.canFulfill && !o.acceptedQuote && o.status !== 'closed') {
      const f = form(commercial),
        price = field(f, 'price', l('Test quote amount (TST)', 'Montant du devis fictif (TST)'), {
          required: true,
          type: 'text',
          maxLength: 12,
        });
      price.inputMode = 'decimal';
      submit(f, l('Issue test quote', 'Émettre le devis de test'), (c) => {
        const v = price.value.trim().replace(',', '.');
        if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) throw Error('invalid');
        const [whole, fraction = ''] = v.split('.');
        return refresh('quote', { minor: Number(whole) * 100 + Number(fraction.padEnd(2, '0')) }, c);
      });
    }
    if (o.isOwner && o.latestQuote && !o.acceptedQuote && o.status !== 'closed') {
      const f = form(commercial);
      submit(f, l('Accept current quote', 'Accepter le devis actuel'), (c) =>
        refresh('accept', { quote: o.latestQuote.version }, c),
      );
    }
    if (o.canFulfill && o.acceptedQuote && !o.invoice) {
      const f = form(commercial);
      submit(f, l('Issue test invoice', 'Émettre la facture de test'), (c) => refresh('invoice', {}, c));
    }
    if (o.invoice) commercial.append(el('p', o.invoice, 'op-reference'));
    const history = el('section');
    history.append(el('h4', l('Order history', 'Historique de la commande')));
    view.append(history);
    function draw(r) {
      for (const e of r.events) {
        const article = el('article', '', 'contact-card'),
          b = e.body;
        article.append(
          el('strong', t('service_' + e.kind)),
          el('p', e.author + ' · ' + date(e.happened), 'muted'),
        );
        if (b.text) article.append(el('p', b.text));
        if (b.quote) article.append(el('p', 'v' + b.quote + (b.minor ? ' · ' + amount(b.minor) : '')));
        if (b.attachment) {
          const a = group(article, b.attachment.name);
          a.append(el('pre', b.attachment.text, 'op-attachment'));
        }
        history.append(article);
      }
      more(history, r.next, async (n) => draw(await get('order?id=' + idPart(o.id) + '&before=' + n)));
    }
    draw(o);
  }
  return { load, clear };
}
