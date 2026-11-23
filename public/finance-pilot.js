import { uiKit } from './discovery.js';

export const pilotCopy = {
  opPilot: ['Finance scenarios', 'Scénarios financiers'],
  pilot_started: ['Finance scenario started', 'Scénario financier démarré'],
  pilot_step_recorded: ['Finance step recorded', 'Étape financière enregistrée'],
  pilot_wager_checked: ['Test wager checked', 'Mise de test vérifiée'],
};

import {financeOperationsUi} from './finance-operations.js';

export function createPilotUi({ api, t, french, staffId }) {
  const { el, l, date, button } = uiKit(french),
    root = () => document.getElementById('operator-pilot-body');
  const scenarios = {
    V05: ['Deposit, play, payout and close', 'Dépôt, mise, retrait et clôture'],
    V06: ['Two suppliers and one limit', 'Deux fournisseurs, une limite'],
    V07: ['Uncertain withdrawal and late statement', 'Retrait incertain et relevé tardif'],
  };
  const stages = {
    deposit: ['Confirm the deposit twice', 'Confirmer le dépôt deux fois'],
    wager: ['Submit the wager twice', 'Soumettre la mise deux fois'],
    win: ['Settle the win twice', 'Régler le gain deux fois'],
    withdraw: ['Reserve and pay the withdrawal', 'Réserver et payer le retrait'],
    statement: ['Import the statement twice', 'Importer le relevé deux fois'],
    close: ['Close the period', 'Clôturer la période'],
    limit: ['Fund the account and set the limit', 'Créditer le compte et fixer la limite'],
    compete: ['Send both wagers together', 'Soumettre les deux mises simultanément'],
    break: ['Start a break and try a new wager', 'Activer une pause et tenter une mise'],
    late: ['Settle the accepted round twice', 'Régler deux fois la manche acceptée'],
    fund: ['Fund the test account', 'Créditer le compte fictif'],
    reserve: ['Reserve the withdrawal', 'Réserver le retrait'],
    timeout: ['Simulate a timeout and retry', 'Simuler un délai dépassé et réessayer'],
    authoritative: ['Record the confirmed payout', 'Enregistrer le retrait confirmé'],
    cutoff: ['Close before the statement', 'Clôturer avant le relevé'],
    lateStatement: ['Import the late statement', 'Importer le relevé tardif'],
    amend: ['Record the revised close', 'Enregistrer la clôture révisée'],
  };
  const accounts = {
    available: ['Available', 'Disponible'],
    held: ['Held', 'Réservé'],
    game: ['Games', 'Jeux'],
    clearing: ['Clearing', 'Compensation'],
  };
  const amount = (n) =>
    new Intl.NumberFormat(french() ? 'fr-CA' : 'en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n / 100) + ' TST';
  const status = {
    posted: ['Posted', 'Comptabilisé'],
    unknown: ['Awaiting confirmation', 'Confirmation en attente'],
    limit: ['Limit reached', 'Limite atteinte'],
    paused: ['On break', 'En pause'],
    recorded: ['Recorded', 'Enregistré'],
    replayed: ['Already processed', 'Déjà traité'],
    closed: ['Closed', 'Clôturé'],
    amended: ['Amended', 'Révisé'],
    matched: ['Matched', 'Rapproché'],
    mismatch: ['Amount mismatch', 'Écart de montant'],
  };
  let selected = '',
    page = 1,
    generation = 0;
  const get = (path) => api('admin/operator/' + path, undefined, 'GET'),
    post = (data) => api('admin/operator/pilot', data);
  const name = (key) => l(...scenarios[key]);
  function clear() {
    selected = '';
    page = 1;
    ++generation;
    root()?.replaceChildren();
  }
  function section(parent, title) {
    const d = el('details', '', 'admin-disclosure'),
      body = el('div', '', 'admin-detail-body');
    d.append(el('summary', title), body);
    parent.append(d);
    return body;
  }
  async function load() {
    const token = ++generation,
      scope = staffId(),
      dest = root(),
      view = el('div', '', 'operator-view'),
      note = el('p', '', 'muted');
    note.setAttribute('role', 'status');
    dest.replaceChildren(note);
    note.textContent = l('Loading…', 'Chargement…');
    function task(parent, title, run) {
      const b = button(title, async () => {
        if (b.disabled) return;
        b.disabled = true;
        try {
          const id = await run();
          if (token === generation && scope === staffId()) {
            selected = id;
            await load();
          }
        } catch (e) {
          if (token === generation) {
            note.textContent = t(e.message);
            b.disabled = false;
          }
        }
      });
      parent.append(b);
    }
    try {
      if (!selected) {
        financeOperationsUi(view,{api,t,ui:uiKit(french)});
        view.append(
          el(
            'p',
            l(
              'Each run creates an independent test account in TST.',
              'Chaque essai crée un compte fictif indépendant en TST.',
            ),
          ),
        );
        for (const [key] of Object.entries(scenarios)) {
          const card = el('article', '', 'contact-card');
          card.append(el('h4', key + ' · ' + name(key)));
          task(
            card,
            l('Start scenario', 'Démarrer le scénario'),
            async () => (await post({ action: 'start', scenario: key })).id,
          );
          view.append(card);
        }
        const r = await get('pilots?page=' + page);
        if (r.items.length) view.append(el('h4', l('Previous runs', 'Essais précédents')));
        for (const item of r.items)
          view.append(
            button(
              item.scenario + ' · ' + date(item.created) + ' · ' + l('Step', 'Étape') + ' ' + item.step,
              () => {
                selected = item.id;
                void load();
              },
              true,
            ),
          );
        if (r.page > 1)
          view.append(
            button(
              l('Previous', 'Précédent'),
              () => {
                page = r.page - 1;
                void load();
              },
              true,
            ),
          );
        if (r.page * 8 < r.total)
          view.append(
            button(
              l('Next', 'Suivant'),
              () => {
                page = r.page + 1;
                void load();
              },
              true,
            ),
          );
      } else {
        const r = await get('pilot?id=' + encodeURIComponent(selected)),
          s = r.summary;
        view.append(
          button(
            l('All scenarios', 'Tous les scénarios'),
            () => {
              selected = '';
              void load();
            },
            true,
          ),
          el('h4', r.scenario + ' · ' + name(r.scenario)),
          el('p', l('Completed steps', 'Étapes terminées') + ' · ' + r.step + ' / ' + r.stages.length),
        );
        const stats = el('dl', '', 'overview-grid');
        view.append(stats);
        function metric(k, v) {
          const div = el('div');
          div.append(el('dt', k), el('dd', v));
          stats.append(div);
        }
        metric(l('Available balance', 'Solde disponible'), amount(s.balance.available));
        metric(l('Funds held', 'Fonds réservés'), amount(s.balance.held));
        metric(l('Net cashier movement', 'Mouvement net de caisse'), amount(s.cash));
        metric(l('Gross gaming revenue', 'Produit brut des jeux'), amount(s.ggr));
        metric(l('Journal entries', 'Écritures'), s.journalCount);
        metric(l('Unbalanced entries', 'Écritures déséquilibrées'), s.unbalanced);
        if (r.step < r.stages.length) {
          const stage = r.stages[r.step];
          task(view, l(...stages[stage]), async () => {
            if (stage === 'compete')
              await Promise.all(
                ['atlas', 'cedar'].map((provider) =>
                  post({ action: 'attempt', id: r.id, provider, step: r.step }),
                ),
              );
            return (await post({ action: 'step', id: r.id, step: r.step })).id;
          });
        } else view.append(el('strong', l('Scenario complete', 'Scénario terminé')));
        if (s.timing.length)
          view.append(
            el('p', l('Waiting for statement', 'En attente de relevé') + ' · ' + s.timing.join(', ')),
          );
        if (r.closes.length) {
          const box = section(view, l('Close history', 'Historique des clôtures'));
          for (const c of r.closes)
            box.append(
              el(
                'p',
                'v' +
                  c.version +
                  ' · ' +
                  amount(c.snapshot.balance.available) +
                  ' · ' +
                  l('Timing exceptions', 'Écarts de date') +
                  ' ' +
                  c.snapshot.timing.length,
              ),
            );
        }
        if (s.statements.length) {
          const box = section(view, l('Statement lines', 'Lignes du relevé'));
          for (const line of s.statements)
            box.append(
              el(
                'p',
                [line.id, line.reference, amount(line.minor), l(...status[line.status])].join(' · '),
              ),
            );
        }
        if (r.journals.length) {
          const box = section(view, l('Journal lines', 'Lignes du journal'));
          for (const j of r.journals)
            box.append(el('p', [j.ref, l(...accounts[j.account]), amount(j.minor)].join(' · ')));
        }
        if (r.steps.length) {
          const box = section(view, l('Step receipts', 'Reçus des étapes'));
          for (const step of r.steps) {
            box.append(el('strong', step.step + ' · ' + l(...stages[r.stages[step.step - 1]])));
            for (const e of step.evidence)
              box.append(
                el(
                  'p',
                  [
                    e.reference || '',
                    e.replayed
                      ? l(...status.replayed)
                      : status[e.status]
                        ? l(...status[e.status])
                        : e.limit
                          ? amount(e.limit)
                          : '',
                  ]
                    .filter(Boolean)
                    .join(' · '),
                ),
              );
          }
        }
      }
      if (token === generation && scope === staffId()) {
        note.textContent = '';
        dest.replaceChildren(view, note);
      }
    } catch (e) {
      if (token === generation) note.textContent = t(e.message);
    }
  }
  return { load, clear };
}
