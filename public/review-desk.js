import { uiKit } from './discovery.js';

export const reviewCopy = {
  reviewSecond: [
    'A second reviewer must approve this release.',
    'Un deuxième réviseur doit approuver cette levée.',
  ],
  reviewDesk: ['Verification and cashier', 'Vérifications et caisse'],
  reviewSubjects: ['Demo case files', 'Dossiers fictifs'],
  reviewCashier: ['Test cashier', 'Caisse de test'],
  reviewSettings: ['Policies and payment routes', 'Politiques et moyens de paiement'],
  reviewState: [
    'This action is unavailable at this stage. Reopen the file for its latest status.',
    'Cette action est indisponible à cette étape. Rouvrez le dossier pour voir son état actuel.',
  ],
  reviewSampleFailed: [
    'A sample failed the policy. Request new information or decline the check.',
    'Un spécimen ne satisfait pas à la politique. Demandez un complément ou refusez la vérification.',
  ],
  reviewIncomplete: [
    'Add all required samples before requesting a review.',
    'Ajoutez tous les spécimens requis avant de demander une révision.',
  ],
  reviewPolicy: [
    'The policy changed. Start a new verification.',
    'La politique a changé. Démarrez une nouvelle vérification.',
  ],
  reviewFixture: [
    'Choose a test player from this brand or leave the field blank.',
    'Choisissez un joueur de test de cette marque ou laissez le champ vide.',
  ],
  cashierFunds: [
    'Insufficient test balance for this operation.',
    'Le solde de test est insuffisant pour cette opération.',
  ],
  cashierMismatch: [
    'The confirmation must match the original reference, amount and currency.',
    'La confirmation doit correspondre à la référence, au montant et à la devise d’origine.',
  ],
  identity_required: ['Identity review required', 'Vérification d’identité requise'],
  payout_hold: ['Withdrawal under review', 'Retrait bloqué pour examen'],
  route_disabled: ['Method disabled', 'Moyen désactivé'],
  route_offline: ['Test processor offline', 'Processeur de test hors ligne'],
  route_direction: ['Unsupported operation', 'Opération non offerte'],
  route_market: ['Market unavailable', 'Marché non desservi'],
  route_currency: ['Unsupported currency', 'Devise non prise en charge'],
  route_min: ['Below minimum', 'Montant sous le minimum'],
  route_max: ['Above maximum', 'Montant au-dessus du maximum'],
};
const words = {
  face: ['Facial match sample', 'Spécimen de concordance du visage'],
  liveness: ['Liveness sample', 'Spécimen de présence'],
  match: ['Matches', 'Concordance'],
  'sample-30': ['30 years (test)', '30 ans (test)'],
  'sample-19': ['19 years (test)', '19 ans (test)'],
  'sample-16': ['16 years (test)', '16 ans (test)'],
  north: ['North test market', 'Marché démo Nord'],
  south: ['South test market', 'Marché démo Sud'],
  age: ['Age check sample', 'Spécimen de contrôle d’âge'],
  photo: ['Photo ID sample', 'Spécimen de pièce photo'],
  address: ['Address sample', 'Spécimen de domicile'],
  pending: ['Pending', 'En attente'],
  review: ['Awaiting reviewer', 'À réviser'],
  more: ['More information', 'Complément requis'],
  approved: ['Approved', 'Approuvé'],
  declined: ['Declined', 'Refusé'],
  expired: ['Expired', 'Expiré'],
  opened: ['File opened', 'Dossier ouvert'],
  evidence: ['Sample added', 'Spécimen ajouté'],
  callback: ['Fixture response', 'Réponse du simulateur'],
  decide: ['Reviewer decision', 'Décision de révision'],
  expire: ['Verification expired', 'Vérification expirée'],
  recheck: ['New verification', 'Nouvelle vérification'],
  claim: ['Reviewer assigned', 'Réviseur attribué'],
  shared_device: ['Shared device', 'Appareil partagé'],
  bonus_pattern: ['Promotion signal', 'Signal promotionnel'],
  payment_pattern: ['Payment signal', 'Signal de paiement'],
  screening: ['Screening list', 'Liste de contrôle'],
  open: ['Open', 'Ouvert'],
  cleared: ['Cleared', 'Levé'],
  confirmed: ['Confirmed', 'Confirmé'],
  incomplete: ['Information missing', 'Renseignements manquants'],
  corrected: ['Correction received', 'Correction reçue'],
  mismatch: ['Mismatch', 'Incohérence'],
  inspected: ['Reviewed', 'Examiné'],
  list_change: ['List update', 'Mise à jour de la liste'],
  risk_confirmed: ['Risk confirmed', 'Risque confirmé'],
  fixture_expiry: ['Test expiry', 'Expiration de test'],
  release_request: ['Hold release requested', 'Demande de levée du blocage'],
  signal: ['Signal received', 'Signal reçu'],
  risk_claim: ['Case assigned', 'Enquête attribuée'],
  risk_decide: ['Screening decision', 'Décision de contrôle'],
  hold: ['Withdrawal hold', 'Blocage du retrait'],
  release: ['Hold released', 'Blocage levé'],
  eligible: ['Eligible', 'Admissible'],
  deposit: ['Deposit', 'Dépôt'],
  withdrawal: ['Withdrawal', 'Retrait'],
  cards: ['Visa / Mastercard (test)', 'Visa / Mastercard (test)'],
  spei: ['SPEI reference (demo)','Référence SPEI (démo)'],oxxo:['OXXO voucher (demo)','Bon OXXO (démo)'],
  wallet: ['Digital wallet (test)', 'Portefeuille numérique (test)'],
  initiated: ['Initiated', 'Créé'],
  held: ['Funds reserved', 'Fonds réservés'],
  sent: ['Submitted', 'Transmis'],
  unknown: ['Awaiting processor confirmation', 'Confirmation du processeur en attente'],
  paid: ['Paid', 'Payé'],
  failed: ['Failed', 'Échoué'],
  reversed: ['Reversed', 'Contrepassé'],
  cancelled: ['Cancelled', 'Annulé'],
  return: ['Record browser return', 'Enregistrer le retour du navigateur'],
  send: ['Submit withdrawal', 'Transmettre le retrait'],
  timeout: ['Simulate timeout', 'Simuler un délai dépassé'],
  cancel: ['Cancel reservation', 'Annuler la réservation'],
  success: ['Simulate confirmation', 'Simuler une confirmation'],
  decline: ['Simulate refusal', 'Simuler un refus'],
  chargeback: ['Reverse test deposit', 'Contrepasser le dépôt fictif'],
  initiate: ['Initiated', 'Création'],
  event: ['Processor receipt', 'Reçu du processeur'],
};
for (const item of [
  'opened',
  'policy',
  'evidence',
  'callback',
  'decide',
  'claim',
  'expire',
  'recheck',
  'signal',
  'risk_claim',
  'risk_decide',
  'hold',
  'release',
  'release_request',
])
  reviewCopy['review_' + item] = words[item] || ['Fixture policy revised', 'Politique de démo révisée'];
for (const item of ['route', 'initiate', 'return', 'send', 'timeout', 'cancel', 'event'])
  reviewCopy['cashier_' + item] = words[item] || ['Cashier route revised', 'Moyen de paiement révisé'];

export function createReviewUi({ api, t, french, role, staffId, open }) {
  const { el, l, button, field, date, tabs } = uiKit(french);
  const names = (k) => (words[k] ? l(...words[k]) : t(k));
  const opts = (arr) => arr.map((k) => [k, names(k)]);
  const currency = (minor) =>
    new Intl.NumberFormat(french() ? 'fr-CA' : 'en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100) + ' TST';
  const get = (path, params = {}) =>
    api('admin/desk/' + path + '?' + new URLSearchParams(params), undefined, 'GET');
  const post = (path, input) => api('admin/desk/' + path, input);
  const root = (tab) => document.getElementById('review-' + tab + '-body');
  let generation = 0,
    id = '',
    intentId = '',
    subjectTab = 'identity',
    openCreate = false,
    page = 1,
    cashPage = 1,
    q = '',
    filter = '';
  function clear() {
    ++generation;
    openCreate = false;
    id = '';
    intentId = '';
    subjectTab = 'identity';
    page = 1;
    cashPage = 1;
    q = '';
    filter = '';
    for (const tab of ['subjects', 'cashier', 'settings']) root(tab)?.replaceChildren();
  }
  function form(p) {
    const f = el('form', '', 'admin-editor op-form');
    p.append(f);
    return f;
  }
  function section(p, title) {
    const d = el('details', '', 'admin-disclosure'),
      body = el('div', '', 'admin-detail-body');
    d.append(el('summary', title), body);
    p.append(d);
    return body;
  }
  function submit(f, title, save) {
    const b = el('button', title),
      err = el('p', '', 'muted');
    b.type = 'submit';
    err.setAttribute('role', 'status');
    f.append(b, err);
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (b.disabled) return;
      b.disabled = true;
      const current = generation;
      try {
        const next = await save();
        if (current === generation && typeof next === 'function') await next();
      } catch (e) {
        if (current === generation) err.textContent = t(e.message);
      } finally {
        b.disabled = false;
      }
    };
  }
  function act(p, title, fn) {
    submit(form(p), title, fn);
  }
  function moneyField(p, name, title, v) {
    const i = field(p, name, title, { required: true, value: v, maxLength: 12 });
    i.inputMode = 'decimal';
    return i;
  }
  function minor(i) {
    const s = i.value.trim().replace(',', '.');
    if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(s)) throw Error('invalid');
    const [a, b = ''] = s.split('.');
    return Number(a) * 100 + Number(b.padEnd(2, '0'));
  }
  function choose(p, name, title, vals, value) {
    return field(p, name, title, { items: opts(vals), value });
  }
  function pager(p, current, total, select) {
    if (total <= 8) return;
    const nav = el('div', '', 'discovery-actions');
    const prev = button(l('Previous', 'Précédent'), () => select(current - 1), true),
      next = button(l('Next', 'Suivant'), () => select(current + 1), true);
    prev.disabled = current === 1;
    next.disabled = current * 8 >= total;
    nav.append(prev, el('span', current + ' / ' + Math.ceil(total / 8)), next);
    p.append(nav);
  }
  function select(value, tab) {
    id = value;
    intentId = '';
    cashPage = 1;
    subjectTab = 'identity';
    void load(tab);
  }
  async function load(tab) {
    const token = ++generation,
      scope = staffId(),
      dest = root(tab),
      v = el('div', '', 'operator-view');
    const note = el('p', l('Loading…', 'Chargement…'));
    note.setAttribute('role', 'status');
    dest.replaceChildren(note);
    try {
      if (tab === 'subjects') {
        if (id) await subject(v);
        else await directory(v, tab);
      }
      if (tab === 'cashier') {
        if (!id) await directory(v, tab);
        else if (intentId) await payment(v);
        else await wallet(v);
      }
      if (tab === 'settings') await settings(v);
      if (token === generation && scope === staffId()) dest.replaceChildren(v);
    } catch (e) {
      if (token === generation) note.textContent = t(e.message);
    }
  }
  async function directory(v, tab) {
    const data = await get('subjects', { page, q, state: filter });
    const toolbar = el('div', '', 'desk-toolbar');
    v.append(toolbar);
    if (tab === 'subjects' && role() === 'operator_admin') {
      const body = section(toolbar, l('Open a demo file', 'Créer un dossier fictif'));
      const createBox = body.parentElement;
      createBox.classList.add('desk-create');
      if (openCreate) {
        createBox.open = true;
        openCreate = false;
      }
      const f = form(body);
      const alias = field(f, 'alias', l('Fictitious name', 'Nom fictif'), {
        required: true,
        maxLength: 64,
        placeholder: l('Test account A', 'Compte test A'),
      });
      if (createBox.open)
        requestAnimationFrame(() => {
          if (alias.isConnected) alias.focus();
        });
      const market = choose(
        f,
        'market',
        l('Test market', 'Marché de test'),
        ['north', 'south'],
        'north',
      );
      const p = field(
        f,
        'player',
        l('Linked test player ID (optional)', 'Numéro de joueur de test associé (facultatif)'),
        { type: 'number', min: 1 },
      );
      submit(f, l('Create file', 'Créer le dossier'), async () => {
        const res = await post('review', {
          action: 'create',
          label: alias.value,
          market: market.value,
          player: p.value ? Number(p.value) : null,
        });
        return () => select(res.id, tab);
      });
      f.append(
        button(
          l('Cancel', 'Annuler'),
          () => {
            createBox.open = false;
            createBox.querySelector('summary').focus();
          },
          true,
        ),
      );
    }
    const f = form(v),
      search = field(f, 'search', l('Name or reference', 'Nom ou référence'), {
        type: 'search',
        maxLength: 80,
        value: q,
      });
    f.classList.add('desk-filters');
    const state = field(f, 'state', l('Verification status', 'État de la vérification'), {
      items: [
        ['', l('All statuses', 'Tous les états')],
        ...opts(['pending', 'review', 'approved', 'more', 'declined', 'expired']),
      ],
      value: filter,
    });
    submit(f, l('Search', 'Rechercher'), async () => () => {
      q = search.value;
      filter = state.value;
      page = 1;
      return load(tab);
    });
    const reset = () => {
      q = '';
      filter = '';
      page = 1;
      void load(tab);
    };
    if (q || filter) f.append(button(l('Clear filters', 'Effacer les filtres'), reset, true));
    if (!data.items.length) {
      const blank = el('div', '', 'desk-empty');
      const mark = el('i', '', 'ui-icon ico-file');
      mark.setAttribute('aria-hidden', 'true');
      const title =
        q || filter
          ? l('No matching demo files.', 'Aucun dossier fictif correspondant.')
          : l('No demo files yet.', 'Aucun dossier fictif pour le moment.');
      blank.append(mark, el('strong', title));
      if (q || filter)
        blank.append(
          el(
            'p',
            l(
              'Change the name or verification status to find a file.',
              'Modifiez le nom ou l’état de la vérification pour retrouver un dossier.',
            ),
          ),
        );
      else if (role() === 'operator_admin' && tab === 'cashier') {
        blank.append(
          button(
            l('Create a file', 'Créer un dossier fictif'),
            () => {
              openCreate = true;
              open('subjects');
            },
            true,
          ),
        );
      }
      v.append(blank);
    } else {
      const list = el('div', '', 'desk-directory-list');
      const ref = el('p', l('Files', 'Dossiers') + ' · ' + data.total, 'desk-count');
      toolbar.prepend(ref);
      for (const row of data.items) {
        const card = el('article', '', 'desk-directory-row');
        const lead = el('div', '', 'desk-row-name');
        lead.append(el('h4', row.label), el('small', names(row.market)));
        const status = el('span', names(row.state), 'desk-state');
        status.dataset.state = row.state;
        const action = button(
          tab === 'cashier' ? l('Open wallet', 'Ouvrir la caisse') : l('Open file', 'Ouvrir le dossier'),
          () => select(row.id, tab),
          true,
        );
        action.classList.add('desk-row-open');
        card.append(lead, status, action);
        list.append(card);
      }
      v.append(list);
    }
    pager(v, data.page, data.total, (n) => {
      page = n;
      void load(tab);
    });
  }
  function showHistory(v, e, full) {
    const box = el('article', '', 'contact-card');
    box.append(
      el('strong', names(full ? e.kind : e.state)),
      el('p', date(e.at) + ' · ' + l('Check', 'Contrôle') + ' ' + e.cycle),
    );
    if (full && e.reason) box.append(el('p', names(e.reason)));
    if (full && e.detail?.type) box.append(el('p', names(e.detail.type)));
    if (full && e.detail?.outcome) box.append(el('p', names(e.detail.outcome)));
    v.append(box);
  }
  async function subject(v) {
    const admin = role() === 'operator_admin',
      s = await get('subject', { id });
    v.append(
      button(l('All files', 'Tous les dossiers'), () => select('', 'subjects'), true),
      el('h4', s.label),
      el('p', [names(s.market), names(s.state), l('Check', 'Contrôle') + ' ' + s.cycle].join(' · ')),
    );
    if (!admin) {
      if (s.withdrawals.length) {
        const pay = section(v, l('Recent withdrawal updates', 'Dernières nouvelles des retraits'));
        for (const x of s.withdrawals)
          pay.append(
            el('p', names(x.status) + ' · ' + names(x.lastAction) + ' · ' + date(x.updated)),
            el('small', x.id, 'op-reference'),
          );
      }
      for (const e of s.timeline.items) showHistory(v, e, false);
      return;
    }
    v.append(
      button(
        l('Open test cashier', 'Ouvrir la caisse de test'),
        () => {
          intentId = '';
          open('cashier');
        },
        true,
      ),
    );
    tabs(
      v,
      [
        ['identity', l('Identity', 'Identité')],
        ['risk', l('Screening', 'Risques')],
        ['history', l('History', 'Historique')],
      ],
      subjectTab,
      (key) => {
        subjectTab = key;
        void load('subjects');
      },
    );
    const change = async (action, data = {}) => {
      await post('review', { action, id: s.id, version: s.version, ...data });
      return () => load('subjects');
    };
    if (subjectTab === 'history') {
      const draw = (chunk) => {
        for (const e of chunk.items) showHistory(v, e, true);
        if (chunk.next) {
          const b = button(
            l('Older entries', 'Entrées précédentes'),
            async () => {
              b.disabled = true;
              try {
                const next = await get('subject', { id: s.id, before: chunk.next });
                b.remove();
                draw(next.timeline);
              } catch (e) {
                b.disabled = false;
                v.append(el('p', t(e.message)));
              }
            },
            true,
          );
          v.append(b);
        }
      };
      draw(s.timeline);
      return;
    }
    if (subjectTab === 'identity') {
      v.append(el('p', l('Minimum test age', 'Âge minimal fictif') + ' · ' + s.minimumAge));
      v.append(
        el(
          'p',
          l('Policy version', 'Version de politique') +
            ' ' +
            s.policy +
            (s.expires ? ' · ' + l('Expires', 'Échéance') + ' ' + date(s.expires) : ''),
        ),
      );
      const ul = el('ul');
      for (const doc of s.required)
        ul.append(
          el(
            'li',
            names(doc) +
              ' · ' +
              (s.results[doc]?.passed === false
                ? l('Does not meet policy', 'Critère non satisfait')
                : s.documents.includes(doc)
                  ? l('Received', 'Reçu')
                  : l('Missing', 'Manquant')),
          ),
        );
      v.append(ul);
      if (['pending', 'more'].includes(s.state)) {
        const remaining = s.required.filter((type) => !s.documents.includes(type));
        const editable = s.required.filter(
          (type) =>
            !s.documents.includes(type) || s.results[type]?.passed === false || s.state === 'more',
        );
        if (editable.length) {
          const f = form(v),
            type = choose(f, 'type', l('Test evidence', 'Pièce fictive'), editable);
          const sample = field(f, 'sample', l('Sample result', 'Résultat du spécimen'), { items: [] });
          const update = () => {
            const choices =
              type.value === 'age' ? ['sample-30', 'sample-19', 'sample-16'] : ['match', 'mismatch'];
            sample.replaceChildren(...choices.map((k) => new Option(names(k), k)));
          };
          type.onchange = update;
          update();
          submit(f, l('Add sample', 'Ajouter le spécimen'), () =>
            change('evidence', { type: type.value, sample: sample.value }),
          );
        }
        if (!remaining.length)
          act(v, l('Send for review', 'Soumettre à révision'), () =>
            change('callback', {
              cycle: s.cycle,
              eventId: 'manual-review-' + s.cycle + '-' + s.version,
              outcome: 'review',
            }),
          );
      }
      if (s.state === 'review') {
        if (s.reviewer !== staffId())
          act(v, l('Take this review', 'Prendre cette révision'), () =>
            change('claim', { reason: 'inspected' }),
          );
        else {
          const f = form(v),
            out = choose(f, 'outcome', l('Decision', 'Décision'), ['approved', 'more', 'declined']),
            why = choose(f, 'reason', l('Reason', 'Motif'), [
              'confirmed',
              'incomplete',
              'mismatch',
              'corrected',
            ]);
          submit(f, l('Record decision', 'Enregistrer la décision'), () =>
            change('decide', { outcome: out.value, reason: why.value }),
          );
        }
      }
      if (s.state === 'approved')
        act(
          section(v, l('Expiry test', 'Test d’expiration')),
          l('Expire this test approval', 'Faire expirer cette approbation fictive'),
          () => change('expire'),
        );
      if (['declined', 'more', 'expired'].includes(s.state) || s.policy !== s.currentPolicy.version)
        act(v, l('Start a new check', 'Ouvrir une nouvelle vérification'), () => change('recheck'));
      return;
    }
    const signals = form(section(v, l('Record a fixture signal', 'Ajouter un signal fictif')));
    const kind = choose(signals, 'signal', l('Signal type', 'Type de signal'), [
      'shared_device',
      'bonus_pattern',
      'payment_pattern',
      'screening',
    ]);
    const marker = field(signals, 'marker', l('Fixture match', 'Marqueur fictif'), {
      items: ['sample-a', 'sample-b', 'sample-c'].map((v) => [v, v]),
    });
    const version = field(
      signals,
      'version',
      l('Screening list version', 'Version de la liste de contrôle'),
      { type: 'number', min: 1, max: 999999, value: 1 },
    );
    version.parentElement.hidden = true;
    kind.onchange = () => {
      version.parentElement.hidden = kind.value !== 'screening';
    };
    submit(signals, l('Record signal', 'Enregistrer le signal'), () =>
      change('signal', {
        kind: kind.value,
        marker: marker.value,
        listVersion: kind.value === 'screening' ? Number(version.value) : 0,
        eventId: crypto.randomUUID(),
      }),
    );
    if (!s.risks.length)
      v.append(el('p', l('No screening cases for this file.', 'Aucune enquête pour ce dossier.')));
    for (const risk of s.risks) {
      const box = section(
        v,
        [
          names(risk.kind),
          risk.marker,
          risk.listVersion ? 'v' + risk.listVersion : '',
          names(risk.status),
        ]
          .filter(Boolean)
          .join(' · '),
      );
      box.append(el('p', risk.id, 'op-reference'));
      if (risk.prior)
        box.append(el('p', l('Prior case', 'Enquête précédente') + ' · ' + risk.prior, 'op-reference'));
      if (risk.reason) box.append(el('p', names(risk.reason)));
      const held = s.holds.find((h) => h.risk === risk.id && !h.ended);
      if (risk.kind === 'screening')
        box.append(el('p', l('Source: demo watchlist', 'Source de démo · liste de contrôle')));
      if (held?.requestedBy) {
        box.append(el('p', l('Awaiting a second reviewer', 'En attente d’un deuxième réviseur')));
        if (held.requestedBy !== staffId())
          act(box, l('Approve hold release', 'Approuver la levée du blocage'), () =>
            change('release', { risk: risk.id, hold: held.id, reason: 'inspected' }),
          );
      }
      if (risk.owner !== staffId()) {
        act(box, l('Take this case', 'Prendre cette enquête'), () =>
          change('risk_claim', { risk: risk.id, reason: 'inspected' }),
        );
        continue;
      }
      if (['open', 'more'].includes(risk.status)) {
        const f = form(box),
          out = choose(f, 'decision', l('Disposition', 'Conclusion'), ['cleared', 'confirmed', 'more']),
          why = choose(f, 'reason', l('Reason', 'Motif'), [
            'inspected',
            'list_change',
            'incomplete',
            'risk_confirmed',
            'corrected',
          ]);
        submit(f, l('Save screening decision', 'Enregistrer la conclusion'), () =>
          change('risk_decide', { risk: risk.id, outcome: out.value, reason: why.value }),
        );
      }
      if (!held?.requestedBy && (held || ['open', 'more', 'confirmed'].includes(risk.status))) {
        const f = form(box),
          why = choose(
            f,
            'reason',
            l('Withdrawal control reason', 'Motif du contrôle du retrait'),
            held ? ['corrected', 'inspected'] : ['risk_confirmed', 'incomplete'],
          );
        submit(
          f,
          held
            ? held.dualRelease
              ? l('Request hold release', 'Demander la levée du blocage')
              : l('Release withdrawal hold', 'Lever le blocage du retrait')
            : l('Hold withdrawals', 'Bloquer les retraits'),
          () => change(held ? 'release' : 'hold', { risk: risk.id, hold: held?.id, reason: why.value }),
        );
      }
    }
  }
  async function wallet(v) {
    const w = await get('cashier', { id, page: cashPage });
    const header = el('div', '', 'desk-wallet-heading'),
      links = el('div', '', 'desk-wallet-links');
    links.append(
      button(l('Choose another file', 'Choisir un autre dossier'), () => select('', 'cashier'), true),
      button(
        l('Open verification file', 'Ouvrir le dossier de vérification'),
        () => open('subjects'),
        true,
      ),
    );
    header.append(el('h4', w.label), links);
    v.append(header);
    const balances = el('div', '', 'desk-balances');
    for (const [title, minorUnits] of [
      [l('Available', 'Disponible'), w.balance.available],
      [l('Reserved', 'Réservé'), w.balance.held],
    ]) {
      const card = el('p', '', 'desk-balance');
      card.append(
        el('span', title),
        el('span', ' · ', 'admin-visually-hidden'),
        el('strong', currency(minorUnits)),
      );
      balances.append(card);
    }
    const gate = el(
      'p',
      l('Withdrawal eligibility', 'Admissibilité au retrait') + ' · ' + names(w.gate.reason),
      'desk-gate',
    );
    gate.dataset.allowed = String(w.gate.allowed);
    v.append(balances, gate);
    const f = form(v);
    f.classList.add('desk-cash-form');
    f.append(el('h4', l('New test transaction', 'Nouvelle transaction fictive')));
    const direction = choose(f, 'direction', l('Operation', 'Opération'), ['deposit', 'withdrawal']),
      amount = moneyField(f, 'amount', l('Test amount (TST)', 'Montant fictif (TST)'), '20.00');
    const choice = field(f, 'route', l('Eligible method', 'Moyen admissible'), { items: [] }),
      explanation = el('p', '', 'muted');
    f.append(explanation);
    let serial = 0;
    async function refresh() {
      const pending = ++serial;
      const confirm = f.querySelector('button[type=submit]');
      if (confirm) confirm.disabled = true;
      choice.replaceChildren();
      choice.disabled = true;
      try {
        const data = await get('options', {
          direction: direction.value,
          market: w.market,
          asset: 'TST',
          minor: minor(amount),
        });
        if (serial !== pending) return;
        for (const r of data.routes)
          if (r.reason === 'eligible') choice.append(new Option(names(r.key), r.key));
        const blocked = direction.value === 'withdrawal' && !w.gate.allowed;
        choice.disabled = !data.eligible.length || blocked;
        if (confirm) confirm.disabled = choice.disabled;
        explanation.textContent = blocked
          ? names(w.gate.reason)
          : data.routes
              .filter((r) => r.reason !== 'eligible')
              .map((r) => names(r.key) + ' · ' + names(r.reason))
              .join(' / ');
      } catch (e) {
        if (serial === pending) explanation.textContent = t(e.message);
      }
    }
    direction.onchange = refresh;
    amount.oninput = refresh;
    let requestKey = crypto.randomUUID(),
      lastIntent = '';
    submit(f, l('Create test transaction', 'Créer la transaction fictive'), async () => {
      if (!choice.value || choice.disabled) throw Error('opUnavailable');
      const data = {
          direction: direction.value,
          minor: minor(amount),
          asset: 'TST',
          route: choice.value,
        },
        sig = JSON.stringify(data);
      if (lastIntent !== sig) {
        requestKey = crypto.randomUUID();
        lastIntent = sig;
      }
      const result = await post('cashier', {
        action: 'initiate',
        subject: w.subject,
        key: requestKey,
        ...data,
      });
      return () => {
        intentId = result.id;
        return load('cashier');
      };
    });
    await refresh();
    const ledger = el('div', '', 'desk-transactions');
    if (w.items.length) {
      ledger.append(el('h4', l('Transactions', 'Transactions')));
      v.append(ledger);
    }
    for (const i of w.items) {
      const b = button(
        [names(i.direction), currency(i.minor), names(i.status)].join(' · '),
        () => {
          intentId = i.id;
          void load('cashier');
        },
        true,
      );
      b.classList.add('transaction-row');
      ledger.append(b);
    }
    pager(v, w.page, w.total, (n) => {
      cashPage = n;
      void load('cashier');
    });
  }
  async function payment(v) {
    const i = await get('intent', { id: intentId });
    v.append(
      button(
        l('Back to wallet', 'Retour à la caisse'),
        () => {
          intentId = '';
          void load('cashier');
        },
        true,
      ),
      el('h4', names(i.direction) + ' · ' + currency(i.minor)),
      el('p', names(i.status)),
      el('p', names(i.route) + ' · v' + i.routeVersion),
      el('p', i.processorRef, 'op-reference'),
    );
    const actions = el('div', '', 'desk-payment-actions');
    v.append(actions);
    const simple = (a) =>
      act(actions, names(a), async () => {
        await post('cashier', { action: a, id: i.id, version: i.version });
        return () => load('cashier');
      });
    const simulate = (outcome) =>
      act(actions, names(outcome), async () => {
        await post('cashier', {
          action: 'event',
          id: i.id,
          processorRef: i.processorRef,
          route: i.route,
          minor: i.minor,
          asset: i.asset,
          eventId: i.id + '-' + outcome,
          outcome,
        });
        return () => load('cashier');
      });
    if (i.direction === 'deposit') {
      if (i.status === 'initiated') simple('return');
      if (['initiated', 'pending'].includes(i.status)) {
        simulate('success');
        simulate('decline');
      }
      if (i.status === 'confirmed') simulate('chargeback');
    } else {
      if (i.status === 'held') {
        simple('send');
        simple('cancel');
      }
      if (i.status === 'sent') simple('timeout');
      if (['sent', 'unknown'].includes(i.status)) {
        simulate('success');
        simulate('decline');
      }
    }
    const history = section(v, l('Transaction history', 'Historique de la transaction'));
    for (const e of i.history)
      history.append(el('p', date(e.at) + ' · ' + names(e.kind) + ' · ' + names(e.status)));
  }
  async function settings(v) {
    const [{ items: policies }, { items: routes,localRails }] = await Promise.all([get('policies'), get('routes')]);
    const flags = (parent, values, selected) =>
      values.map((k) => {
        const lbl = el('label'),
          input = el('input');
        input.type = 'checkbox';
        input.checked = selected.includes(k);
        lbl.append(input, document.createTextNode(' ' + names(k)));
        parent.append(lbl);
        return [k, input];
      });
    const selected = (items) => items.filter(([, e]) => e.checked).map(([k]) => k);
    v.append(
      el(
        'p',
        l(
          'These settings apply to fictitious files and TST transactions.',
          'Ces paramètres s’appliquent aux dossiers fictifs et aux transactions en TST.',
        ),
      ),
    );
    const railSwitch=el('button',localRails?l('Disable Mexican test payment methods','Désactiver les moyens de paiement mexicains de test'):l('Enable SPEI and OXXO in the demo','Activer SPEI et OXXO en démo'));
    railSwitch.type='button';railSwitch.onclick=async()=>{railSwitch.disabled=true;try{await post('cashier',{action:'local-rails',enabled:!localRails});v.replaceChildren();await settings(v);}catch(err){v.append(el('p',t(err.message)));railSwitch.disabled=false;}};v.append(railSwitch);
    for (const p of policies) {
      const f = form(section(v, names(p.market) + ' · v' + p.version));
      const docs = flags(f, ['age', 'photo', 'address', 'face', 'liveness'], p.documents);
      docs[0][1].disabled = true;
      const age = field(f, 'age', l('Minimum test age', 'Âge minimal fictif'), {
        items: [18, 19, 21].map((n) => [n, String(n)]),
        value: p.minAge,
      });
      const dual = field(f, 'dual', l('Withdrawal hold release', 'Levée du blocage de retrait'), {
        items: [
          ['one', l('Assigned reviewer', 'Réviseur attribué')],
          ['two', l('Two reviewers', 'Deux réviseurs')],
        ],
        value: p.dualRelease ? 'two' : 'one',
      });
      const days = field(f, 'days', l('Approval validity (days)', 'Validité de l’approbation (jours)'), {
        type: 'number',
        min: 1,
        max: 365,
        required: true,
        value: p.days,
      });
      submit(f, l('Save policy', 'Enregistrer la politique'), async () => {
        await post('review', {
          action: 'policy',
          market: p.market,
          version: p.version,
          documents: selected(docs),
          minAge: Number(age.value),
          dualRelease: dual.value === 'two',
          days: Number(days.value),
        });
        return () => load('settings');
      });
    }
    for (const r of routes) {
      const f = form(section(v, names(r.key) + ' · v' + r.version));
      const grouping = (title, values, selection) => {
        const g = el('fieldset');
        g.append(el('legend', title));
        f.append(g);
        return flags(g, values, selection);
      };
      const directions = grouping(
          l('Operations', 'Opérations'),
          ['deposit', 'withdrawal'],
          r.directions,
        ),
        markets = grouping(l('Markets', 'Marchés'), ['north', 'south'], r.markets);
      const range = [
        moneyField(f, 'min', l('Minimum (TST)', 'Minimum (TST)'), (r.min / 100).toFixed(2)),
        moneyField(f, 'max', l('Maximum (TST)', 'Maximum (TST)'), (r.max / 100).toFixed(2)),
      ];
      const priority = field(
        f,
        'priority',
        l('Routing priority (1 first)', 'Priorité de routage (1 en premier)'),
        { type: 'number', min: 1, max: 100, required: true, value: r.priority },
      );
      const state = field(f, 'enabled', l('Availability', 'Disponibilité'), {
        items: [
          ['on', l('Enabled', 'Activé')],
          ['off', l('Disabled', 'Désactivé')],
        ],
        value: r.enabled ? 'on' : 'off',
      });
      const health = field(f, 'online', l('Test processor', 'Processeur de test'), {
        items: [
          ['on', l('Online', 'Disponible')],
          ['off', l('Offline', 'Hors ligne')],
        ],
        value: r.online ? 'on' : 'off',
      });
      submit(f, l('Save route', 'Enregistrer le moyen'), async () => {
        await post('cashier', {
          action: 'route',
          key: r.key,
          version: r.version,
          assets: ['TST'],
          markets: selected(markets),
          directions: selected(directions),
          min: minor(range[0]),
          max: minor(range[1]),
          priority: Number(priority.value),
          enabled: state.value === 'on',
          online: health.value === 'on',
        });
        return () => load('settings');
      });
    }
  }
  function player(panel, who) {
    const owner = who();
    if (!owner) return;
    const v = el('div');
    panel.append(v);
    async function draw() {
      try {
        const { subject: s } = await api('me/review-demo', undefined, 'GET');
        if (!s || who() !== owner || !v.isConnected) return;
        v.replaceChildren();
        const body = section(v, l('My demo verification', 'Ma vérification fictive'));
        body.append(el('p', names(s.state)));
        if (['pending', 'more'].includes(s.state))
          for (const type of s.required.filter((k) => !s.submitted.includes(k))) {
            const b = button(
              l('Submit', 'Soumettre') + ' · ' + names(type),
              async () => {
                b.disabled = true;
                try {
                  await api('me/review-demo', { type, version: s.version, cycle: s.cycle });
                  await draw();
                  if (v.isConnected && v.querySelector('details'))
                    v.querySelector('details').open = true;
                } catch (e) {
                  body.append(el('p', t(e.message)));
                  b.disabled = false;
                }
              },
              true,
            );
            body.append(b);
          }
        for (const e of s.timeline.items) showHistory(body, e, false);
      } catch {}
    }
    void draw();
  }
  return { load, player, clear };
}
