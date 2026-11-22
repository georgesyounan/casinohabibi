import { uiKit } from './discovery.js';
import { reportRows, downloadReport } from './growth-player.js';
export function createGrowthAdmin({ api, t, french, role, publish }) {
  const { el, l, local, field, button, pages, date } = uiKit(french);
  const get = (path) => api('admin/growth' + path, undefined, 'GET'),
    post = (key, input) => api('admin/growth/' + key, input);
  const localInput = (ms) => {
    const d = new Date(ms);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const datestr = (d) => new Date(d).getTime();
  const dataOf = (f) => Object.fromEntries(new FormData(f));
  async function load(key) {
    const target = document.querySelector('#growth-' + key + '-body');
    if (!target) return;
    const message = el('p', '', 'discovery-feedback');
    message.setAttribute('role', 'status');
    const body = el('div');
    target.replaceChildren(message, body);
    let busy = false,
      state;
    async function run(fn) {
      if (busy) return;
      busy = true;
      message.textContent = '';
      try {
        await fn();
      } catch (e) {
        message.textContent = t(e.message);
      } finally {
        busy = false;
      }
    }
    async function reload() {
      await load(key);
    }
    const btn = (s, fn, secondary = true) => button(s, () => run(fn), secondary);
    function form(caption, build, fn) {
      const f = el('form', '', 'discovery-form');
      build(f);
      f.append(el('button', caption));
      f.onsubmit = (e) => {
        e.preventDefault();
        void run(() => fn(dataOf(f)));
      };
      return f;
    }
    const inp = (f, k, title, opts = {}) => field(f, k, title, { required: true, ...opts });
    const numeric = (f, k, label, value, min = 1, max = 1000000000) =>
      inp(f, k, label, { type: 'number', value, min, max });
    const opts = (f, k, title, items, value, optional = false) =>
      inp(f, k, title, { items, value, required: !optional });
    const lst = (items, draw, empty) => {
      const n = el('div');
      body.append(n);
      pages(n, items, draw, empty);
    };
    function back() {
      body.replaceChildren(btn(l('Back', 'Retour'), reload));
    }
    function catalogueLink(root) {
      const a = el('a', l('Manage Coming Soon previews', 'Gérer les fiches à venir'), 'discovery-link');
      a.href = '#coming-soon-admin';
      root.append(a);
    }
    const isoTitle = l('Your local time', 'Heure de cet appareil');
    function placementEditor(p) {
      back();
      const s = p?.spec || {},
        now = Date.now();
      body.append(
        form(
          l('Save draft', 'Enregistrer le brouillon'),
          (f) => {
            if (!p)
              inp(f, 'slug', l('Tracking link name', 'Nom du lien de suivi'), {
                placeholder: 'collection-nuit',
                maxLength: 48
              });
            for (const [k, title] of [
              ['titleEn', 'Title (EN)'],
              ['titleFr', 'Titre (FR)'],
              ['textEn', 'Message (EN)'],
              ['textFr', 'Message (FR)']
            ])
              inp(f, k, title, {
                value: s[k] || '',
                required: k.startsWith('title'),
                maxLength: k.startsWith('title') ? 120 : 360
              });
            const choices = state.previewOptions.map((x) => [x.slug, local(x, 'title')]);
            const custom = '!draft';
            const selected = opts(
              f,
              'previewSelection',
              l('Destination preview', 'Fiche de destination'),
              [...choices, [custom, l('Enter a draft destination', 'Saisir une destination de brouillon')]],
              choices.some(([slug]) => slug === s.preview)
                ? s.preview
                : s.preview
                  ? custom
                  : choices[0]?.[0] || custom
            );
            const slug = inp(f, 'preview', l('Preview address (slug)', 'Identifiant de la fiche'), {
              value: s.preview || '',
              maxLength: 64
            });
            function syncDestination() {
              const draft = selected.value === custom;
              slug.closest('label').hidden = !draft;
              if (!draft) slug.value = selected.value;
            }
            selected.onchange = syncDestination;
            syncDestination();
            opts(
              f,
              'partner',
              l('Partner', 'Partenaire'),
              [['', l('No partner', 'Aucun partenaire')], ...state.partnerFilters.map((r) => [r.id, r.name])],
              s.partner || '',
              true
            );
            inp(f, 'start', l('Starts', 'Début') + ' · ' + isoTitle, {
              type: 'datetime-local',
              value: localInput(s.start ?? now)
            });
            inp(f, 'end', l('Ends', 'Fin') + ' · ' + isoTitle, {
              type: 'datetime-local',
              value: localInput(s.end ?? now + 7 * 86400000)
            });
            inp(f, 'currency', l('Budget currency', 'Devise du budget'), {
              value: s.currency || 'CAD',
              maxLength: 3
            });
            numeric(f, 'budget', l('Budget (cents)', 'Budget (cents)'), s.budget ?? 0, 0, 1e12);
          },
          async (d) => {
            await post('placement', {
              action: 'save',
              id: p?.id,
              slug: d.slug,
              version: p?.version || 0,
              spec: {
                titleEn: d.titleEn,
                titleFr: d.titleFr,
                textEn: d.textEn,
                textFr: d.textFr,
                preview: d.preview,
                partner: d.partner ? Number(d.partner) : null,
                start: datestr(d.start),
                end: datestr(d.end),
                currency: d.currency.toUpperCase(),
                budget: Number(d.budget)
              }
            });
            await reload();
          }
        )
      );
    }
    function partnerEditor(p) {
      back();
      body.append(
        form(
          l('Save partner', 'Enregistrer le partenaire'),
          (f) => {
            inp(f, 'name', l('Partner name', 'Nom du partenaire'), { value: p?.name, maxLength: 120 });
            inp(f, 'code', l('Signup code', 'Code de parrainage'), { value: p?.code, maxLength: 48 });
            numeric(f, 'player', l('Verified account ID', 'Numéro du compte vérifié'), p?.owner);
            opts(
              f,
              'active',
              l('Status', 'Statut'),
              [
                ['1', l('Active', 'Actif')],
                ['0', l('Inactive', 'Inactif')]
              ],
              p?.active ?? 1
            );
          },
          async (d) => {
            await post('partner', {
              id: p?.id,
              code: d.code.trim().toLowerCase(),
              name: d.name,
              playerId: Number(d.player),
              active: d.active === '1'
            });
            await reload();
          }
        )
      );
    }
    function spend(p) {
      back();
      body.append(
        el('h4', p.slug + ' · ' + p.spec.currency),
        form(
          l('Record spend', 'Enregistrer les dépenses'),
          (f) =>
            inp(f, 'csv', l('One line per day (YYYY-MM-DD, cents)', 'Une ligne par jour (AAAA-MM-JJ, cents)'), {
              multiline: true,
              placeholder: '2026-11-20, 2500'
            }),
          async (d) => {
            const entries = d.csv
              .trim()
              .split(/\r?\n/)
              .map((line) => {
                const [day, amount, ...extra] = line.split(',').map((x) => x.trim());
                if (extra.length || !/^\d+$/.test(amount || '')) throw Error('invalid');
                return { day, currency: p.spec.currency, cents: Number(amount) };
              });
            await post('spend', { id: p.id, entries });
            await reload();
          }
        )
      );
    }
    function placementList() {
      if (!state.previewOptions.length) {
        const note = el('aside', '', 'discovery-card');
        note.append(
          el(
            'p',
            l(
              'Publish a Coming Soon preview before activating an ad. You can prepare its draft now.',
              'Publiez une fiche À venir pour activer une publicité. Vous pouvez déjà préparer le brouillon.'
            )
          )
        );
        catalogueLink(note);
        body.append(note);
      }
      body.append(btn(l('New placement', 'Nouvelle publicité'), () => placementEditor(null), false));
      lst(
        state.placements,
        (p) => {
          const s = p.spec,
            n = el('article', '', 'discovery-card');
          const label = {
            published: l('Published', 'Publiée'),
            scheduled: l('Scheduled', 'Planifiée'),
            expired: l('Expired', 'Expirée'),
            destination: l('Destination unavailable', 'Destination indisponible'),
            paused: l('Paused', 'En pause'),
            draft: l('Draft', 'Brouillon')
          }[p.delivery];
          n.append(
            el('h4', local(s, 'title')),
            el('small', p.slug + ' · ' + label + ' · v' + p.version),
            el('p', date(s.start) + ' – ' + date(s.end)),
            btn(l('Edit draft', 'Modifier le brouillon'), () => placementEditor(p))
          );
          if (publish()) {
            n.append(
              btn(l('Publish this version', 'Publier cette version'), async () => {
                await post('placement', { action: 'publish', id: p.id, version: p.version });
                await reload();
              })
            );
            if (p.active)
              n.append(
                btn(l('Pause placement', 'Suspendre la publicité'), async () => {
                  await post('placement', { action: 'pause', id: p.id, version: p.version });
                  await reload();
                })
              );
          }
          if (p.history?.length) {
            const h = el('details');
            h.append(el('summary', l('Approved versions', 'Versions approuvées')));
            for (const v of p.history)
              h.append(el('p', `v${v.version} · ${date(v.at)} · ${local(v, 'title')}`));
            n.append(h);
          }
          if (role() === 'operator_admin')
            n.append(btn(l('Enter campaign spend', 'Saisir les dépenses'), () => spend(p)));
          return n;
        },
        l('No placements.', 'Aucune publicité.')
      );
    }
    async function report() {
      const box = el('div');
      const filters = form(
        l('Apply filters', 'Appliquer les filtres'),
        (f) => {
          inp(f, 'from', l('From', 'Du'), { type: 'date', required: false });
          inp(f, 'to', l('To', 'Au'), { type: 'date', required: false });
          opts(
            f,
            'scope',
            l('Accounts', 'Comptes'),
            [
              ['', l('Brand default', 'Par défaut')],
              ['site', l('Site accounts', 'Comptes du site')],
              ['test', l('Test accounts', 'Comptes de test')]
            ],
            '',
            true
          );
          opts(
            f,
            'partner',
            l('Partner', 'Partenaire'),
            [
              ['', l('All partners', 'Tous les partenaires')],
              ...state.partnerFilters.map((p) => [p.id, p.name])
            ],
            '',
            true
          );
          opts(
            f,
            'placement',
            l('Placement', 'Publicité'),
            [['', l('All placements', 'Toutes les publicités')], ...state.filters.map((p) => [p.id, p.slug])],
            '',
            true
          );
        },
        (d) => display(d)
      );
      body.append(filters, box);
      async function display(d) {
        const params = new URLSearchParams(Object.entries(d).filter(([, v]) => v !== ''));
        const r = await get('/report?' + params);
        const rows = reportRows(r, l);
        box.replaceChildren(
          el(
            'p',
            r.period.from +
              ' – ' +
              r.period.to +
              ' · ' +
              r.period.zone +
              ' · ' +
              (r.scope === 'test'
                ? l('Test accounts', 'Comptes de test')
                : l('Site accounts', 'Comptes du site'))
          )
        );
        const list = el('dl', '', 'growth-metrics');
        for (const [label, value] of rows.slice(3)) list.append(el('dt', label), el('dd', value));
        box.append(list);
        const more = el('details');
        more.append(el('summary', l('Break down by signup source', 'Ventiler par source d’inscription')));
        const sources = {
          code: l('Signup code', 'Code de parrainage'),
          link: l('Tagged link', 'Lien suivi'),
          direct: l('Direct', 'Direct'),
          legacy: l('Prior accounts', 'Comptes antérieurs')
        };
        for (const b of r.breakdown || []) {
          more.append(
            el(
              'p',
              `${sources[b.source]} · ${b.signups} ${l('signups', 'inscriptions')} · ${b.qualified} ${l('qualified', 'admissibles')}`
            )
          );
          rows.push([sources[b.source], b.signups, b.qualified]);
        }
        box.append(more);
        const daily = el('details'),
          result = el('div');
        daily.append(el('summary', l('Inspect counts by day', 'Consulter les totaux par jour')));
        const metric = field(daily, 'metric', l('Measure', 'Mesure'), {
          items: [
            ['visits', l('Tagged visits', 'Visites suivies')],
            ['verified', l('Verified signups', 'Inscriptions vérifiées')],
            ['qualified', l('Qualified first saves', 'Premiers favoris admissibles')],
            ['activated', l('7-day activation', 'Activation à 7 jours')],
            ['returning', l('30-day returns', 'Retours à 30 jours')]
          ]
        });
        daily.append(
          btn(l('Show daily totals', 'Afficher les totaux quotidiens'), async () => {
            const selected = new URLSearchParams(params);
            selected.set('metric', metric.value);
            selected.set('asOf', r.asOf);
            const detail = await get('/report?' + selected);
            pages(
              result,
              detail.daily,
              (d) => el('p', d.day + ' · ' + d.total),
              l('No matching records.', 'Aucun enregistrement correspondant.'),
              7
            );
          }),
          result
        );
        box.append(daily);
        if (params.get('placement')) {
          box.append(el('h4', l('Campaign spend', 'Dépenses de campagne')));
          if (!r.costs.length)
            box.append(
              el(
                'p',
                l(
                  'Insufficient cost data for these filters.',
                  'Données de coût insuffisantes pour ces filtres.'
                )
              )
            );
          for (const c of r.costs) {
            const money = (v) => (v / 100).toFixed(2) + ' ' + c.currency;
            for (const [title, value] of [
              [l('Budget', 'Budget'), money(c.budget)],
              [l('Recorded spend', 'Dépenses saisies'), money(c.cents)],
              [
                l('Cost per first saver', 'Coût par premier favori'),
                c.perSaver == null ? l('Insufficient data', 'Données insuffisantes') : money(c.perSaver)
              ]
            ]) {
              box.append(el('p', title + ' · ' + value));
              rows.push([title, value]);
            }
          }
        }
        if (r.experiments.length) {
          box.append(el('h4', l('Experiment cohorts', 'Cohortes expérimentales')));
          for (const e of r.experiments) {
            const text =
              e.name + ' · ' + (e.arm === 'holdout' ? l('Holdout', 'Témoin') : l('Exposed', 'Exposés'));
            box.append(el('p', `${text} · ${e.converted} / ${e.cohort}`));
            rows.push([text, e.converted, e.cohort]);
          }
        }
        box.append(
          btn(l('Export these figures', 'Exporter ces chiffres'), () =>
            downloadReport('acquisition-' + r.period.from + '.csv', rows)
          )
        );
      }
      await display({});
    }
    function experimentEditor() {
      back();
      const available = state.placements.filter((p) => p.active);
      if (!available.length) {
        body.append(
          el(
            'p',
            l(
              'Publish a placement to start an experiment.',
              'Publiez une publicité pour démarrer une expérience.'
            )
          )
        );
        return;
      }
      body.append(
        form(
          l('Start experiment', 'Démarrer l’expérience'),
          (f) => {
            inp(f, 'name', l('Experiment name', 'Nom de l’expérience'), { maxLength: 120 });
            opts(
              f,
              'placement',
              l('Placement', 'Publicité'),
              available.map((p) => [p.id, local(p.spec, 'title')])
            );
            inp(f, 'start', l('Enrollment starts', 'Début des inscriptions') + ' · ' + isoTitle, {
              type: 'datetime-local',
              value: localInput(Date.now())
            });
            inp(f, 'end', l('Enrollment ends', 'Fin des inscriptions') + ' · ' + isoTitle, {
              type: 'datetime-local',
              value: localInput(Date.now() + 14 * 86400000)
            });
            numeric(f, 'days', l('Observation days', 'Jours d’observation'), 7, 1, 90);
            numeric(f, 'holdout', l('Holdout (%)', 'Groupe témoin (%)'), 50, 1, 99);
          },
          async (d) => {
            await post('experiment', {
              name: d.name,
              placement: Number(d.placement),
              start: datestr(d.start),
              end: datestr(d.end),
              days: Number(d.days),
              holdout: Number(d.holdout)
            });
            await reload();
          }
        )
      );
    }
    function polls() {
      if (publish())
        body.append(
          btn(
            l('New collection poll', 'Nouveau sondage'),
            () => {
              back();
              body.append(
                form(
                  l('Open voting', 'Ouvrir le vote'),
                  (f) => {
                    inp(f, 'titleEn', 'Question (EN)');
                    inp(f, 'titleFr', 'Question (FR)');
                    inp(f, 'en', l('English options, one per line', 'Choix anglais, un par ligne'), {
                      multiline: true
                    });
                    inp(f, 'fr', l('French options, one per line', 'Choix français, un par ligne'), {
                      multiline: true
                    });
                  },
                  async (d) => {
                    const en = d.en.trim().split(/\r?\n/),
                      fr = d.fr.trim().split(/\r?\n/);
                    if (en.length !== fr.length) throw Error('invalid');
                    await post('poll', {
                      action: 'open',
                      titleEn: d.titleEn,
                      titleFr: d.titleFr,
                      options: en.map((x, i) => ({ titleEn: x.trim(), titleFr: fr[i].trim() }))
                    });
                    await reload();
                  }
                )
              );
            },
            false
          )
        );
      lst(
        state.polls,
        (p) => {
          const n = el('article', '', 'discovery-card');
          n.append(
            el('strong', local(p, 'title')),
            el(
              'small',
              p.closed ? l('Results published', 'Résultats publiés') : l('Voting open', 'Vote ouvert')
            )
          );
          if (!p.closed && publish())
            n.append(
              btn(l('Close and publish results', 'Clore et publier les résultats'), async () => {
                await post('poll', { action: 'publishResults', id: p.id });
                await reload();
              })
            );
          return n;
        },
        l('No polls.', 'Aucun sondage.')
      );
    }
    async function creditAccount(player) {
      const h = await get('/credits?player=' + player);
      back();
      body.append(
        el('h4', l('Test account', 'Compte de test') + ' #' + player + ' · ' + h.balance + ' Demo Credits')
      );
      body.append(
        form(
          l('Post movement', 'Enregistrer le mouvement'),
          (f) => {
            opts(f, 'kind', l('Movement', 'Mouvement'), [
              ['grant', l('Grant', 'Octroi')],
              ['debit', l('Debit', 'Débit')]
            ]);
            numeric(f, 'amount', l('Whole credits', 'Crédits entiers'), 1);
            inp(f, 'reason', l('Reason', 'Motif'), { maxLength: 240 });
          },
          async (d) => {
            await post('credits', {
              playerId: player,
              kind: d.kind,
              amount: Number(d.amount),
              reason: d.reason
            });
            await creditAccount(player);
          }
        )
      );
      lst(
        h.entries,
        (e) => {
          const n = el('article', '', 'discovery-card');
          n.append(
            el('strong', `#${e.id} · ${e.delta > 0 ? '+' : ''}${e.delta} · ${e.balance}`),
            el('p', e.reason),
            el('small', date(e.at))
          );
          if (e.kind !== 'reverse' && !h.entries.some((r) => r.original === e.id))
            n.append(
              form(
                l('Reverse this entry', 'Contrepasser cette écriture'),
                (f) => inp(f, 'reason', l('Reason', 'Motif'), { maxLength: 240 }),
                async (d) => {
                  await post('credits', {
                    playerId: player,
                    kind: 'reverse',
                    original: e.id,
                    reason: d.reason
                  });
                  await creditAccount(player);
                }
              )
            );
          return n;
        },
        l('No movements.', 'Aucun mouvement.')
      );
    }
    await run(async () => {
      state = await get(key === 'placements' ? '?view=placements' : '');
      if (!target.contains(body)) return;
      if (key === 'partners') {
        body.append(btn(l('New partner', 'Nouveau partenaire'), () => partnerEditor(null), false));
        lst(
          state.partners,
          (p) =>
            btn(p.name + ' · ' + p.code + (p.active ? '' : ' · ' + l('Inactive', 'Inactif')), () =>
              partnerEditor(p)
            ),
          l('No partners.', 'Aucun partenaire.')
        );
      } else if (key === 'placements') placementList();
      else if (key === 'report') await report();
      else if (key === 'experiments') {
        body.append(btn(l('New experiment', 'Nouvelle expérience'), experimentEditor, false));
        lst(
          state.experiments,
          (e) => {
            const n = el('article', '', 'discovery-card');
            n.append(
              el('strong', e.name),
              el('p', e.holdout + ' % ' + l('holdout', 'témoin') + ' · ' + e.days + l(' days', ' jours')),
              el('small', date(e.start) + ' – ' + date(e.end))
            );
            if (e.active)
              n.append(
                btn(l('Stop enrollment', 'Arrêter les inscriptions'), async () => {
                  await post('experiment', { close: e.id });
                  await reload();
                })
              );
            return n;
          },
          l('No experiments.', 'Aucune expérience.')
        );
      } else if (key === 'polls') polls();
      else if (key === 'review') {
        lst(
          state.pending,
          (r) => {
            const n = el('article', '', 'discovery-card');
            n.append(
              el('strong', l('Account', 'Compte') + ' #' + r.player),
              el(
                'p',
                r.flag === 'self'
                  ? l('Self-referral', 'Auto-parrainage')
                  : l('Possible duplicate', 'Doublon possible')
              ),
              form(
                l('Record decision', 'Enregistrer la décision'),
                (f) => {
                  opts(f, 'decision', l('Decision', 'Décision'), [
                    ['valid', l('Eligible', 'Admissible')],
                    ['ineligible', l('Ineligible', 'Non admissible')]
                  ]);
                  inp(f, 'reason', l('Reason', 'Motif'), { maxLength: 240 });
                },
                async (d) => {
                  await post('review', { playerId: r.player, ...d });
                  await reload();
                }
              )
            );
            return n;
          },
          l('No referrals awaiting review.', 'Aucun parrainage en attente de vérification.')
        );
      } else if (key === 'credits' && state.testCredits)
        body.append(
          form(
            l('Open test ledger', 'Ouvrir le registre de test'),
            (f) => numeric(f, 'player', l('Test account ID', 'Numéro du compte de test')),
            (d) => creditAccount(Number(d.player))
          )
        );
    });
  }
  return { load };
}
