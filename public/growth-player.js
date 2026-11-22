import { uiKit } from './discovery.js';
export const growthCopy = {
  growth: ['Acquisition', 'Acquisition'],
  growthPartners: ['Partners', 'Partenaires'],
  growthPlacement: ['Ad placements', 'Publicités'],
  growthReport: ['Growth reports', 'Rapports d’acquisition'],
  growthReview: ['Referral review', 'Parrainages à vérifier'],
  growthExperiment: ['Experiments', 'Expériences'],
  growthPoll: ['Collection polls', 'Sondages'],
  growthCredits: ['Test credits', 'Crédits de test'],
  inviteUnavailable: [
    'This invitation has expired, was used, or was revoked.',
    'Cette invitation a expiré, a déjà servi ou a été révoquée.'
  ],
  referralInvalid: [
    'Check the referral code or leave it empty.',
    'Vérifiez le code de parrainage ou laissez le champ vide.'
  ],
  pollOpen: [
    'Results are available after this poll closes.',
    'Les résultats seront disponibles à la clôture du sondage.'
  ],
  creditsTestOnly: [
    'Available for designated test accounts in the isolated environment.',
    'Disponible pour les comptes de test désignés dans l’environnement isolé.'
  ],
  creditsBalance: [
    'The test balance does not cover this movement.',
    'Le solde de test est insuffisant pour ce mouvement.'
  ]
};
export function downloadReport(name, rows) {
  const csv = rows
    .map((row) => row.map((cell) => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(','))
    .join('\r\n');
  const link = document.createElement('a'),
    url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function reportRows(r, l) {
  return [
    [l('Period starts', 'Début'), r.period.from],
    [l('Period ends', 'Fin'), r.period.to],
    [l('Time zone', 'Fuseau horaire'), r.period.zone],
    [l('Visits from tagged links', 'Visites par lien suivi'), r.visits],
    [l('Signups in the period', 'Inscriptions de la période'), r.signups],
    [l('Verified signups', 'Inscriptions vérifiées'), r.verified],
    [l('Qualified first saves', 'Premiers favoris admissibles'), r.qualified],
    [l('Referrals awaiting review', 'Parrainages à vérifier'), r.pending],
    [l('Mature verified cohort (7 days)', 'Comptes vérifiés observés 7 jours'), r.mature],
    [l('First save within 7 days', 'Premier favori en 7 jours'), r.activated],
    [
      l('Activation rate', 'Taux d’activation'),
      r.activationRate == null ? '—' : Math.round(r.activationRate * 1000) / 10 + ' %'
    ],
    [
      l('First savers observed for 30 days', 'Comptes observés 30 jours après leur premier favori'),
      r.returnCohort
    ],
    [l('Returned on days 24–30', 'Retours entre les jours 24 et 30'), r.returning],
    [
      l('Return rate', 'Taux de retour'),
      r.returnRate == null ? '—' : Math.round(r.returnRate * 1000) / 10 + ' %'
    ],
    [
      l('Tagged visit to signup', 'Visite suivie vers inscription'),
      r.visitSignupRate == null ? '—' : Math.round(r.visitSignupRate * 1000) / 10 + ' %'
    ]
  ];
}
export function createGrowthPlayer({ api, t, french, appPath, openSupport }) {
  const { el, l, local, button, pages, field, date } = uiKit(french);
  const get = (path) => api(path, undefined, 'GET'),
    post = (action, input) => api('community/' + action, input);
  let bannerVersion = 0,
    bannerTimer;
  async function banner(root) {
    const request = ++bannerVersion;
    clearTimeout(bannerTimer);
    try {
      const { banner: b } = await get('growth/banner');
      if (request !== bannerVersion) return;
      root.replaceChildren();
      root.hidden = !b;
      if (!b) return;
      const link = el('a', local(b, 'title'), 'discovery-link');
      link.href = appPath('/go/' + b.slug + '?lang=' + (french() ? 'fr' : 'en'));
      root.append(link, el('p', local(b, 'text')));
      bannerTimer = setTimeout(
        () => {
          root.hidden = true;
          void banner(root);
        },
        Math.max(1, Math.min(2147483647, b.expires - Date.now()))
      );
    } catch {
      if (request === bannerVersion) {
        root.hidden = true;
        root.replaceChildren();
      }
    }
  }
  function share(root, value) {
    const label = el('label', l('Share link', 'Lien à partager')),
      input = el('input');
    input.value = value;
    input.readOnly = true;
    label.append(input);
    root.append(
      label,
      button(
        l('Copy link', 'Copier le lien'),
        async (e) => {
          try {
            await navigator.clipboard.writeText(value);
            e.currentTarget?.setAttribute('aria-label', l('Copied', 'Copié'));
          } catch {
            input.focus();
            input.select();
          }
        },
        true
      )
    );
  }
  async function partner(root) {
    let days = '30';
    async function refresh() {
      try {
        const p = await get('growth/partner?days=' + days);
        root.replaceChildren(
          el('h3', p.name),
          el('p', l('Signup code', 'Code d’inscription') + ' · ' + p.code)
        );
        share(root, location.origin + appPath(p.link));
        const scope = field(root, 'days', l('Reporting period', 'Période'), {
          items: ['7', '30', '90'].map((n) => [n, n + l(' days', ' jours')]),
          value: days
        });
        scope.onchange = () => {
          days = scope.value;
          refresh();
        };
        const rows = reportRows(p.report, l);
        const list = el('dl', '', 'growth-metrics');
        for (const [label, value] of rows.slice(3, 8)) list.append(el('dt', label), el('dd', value));
        root.append(
          el('p', p.report.period.from + ' – ' + p.report.period.to + ' · ' + p.report.period.zone),
          list,
          button(
            l('Export aggregate counts', 'Exporter les totaux'),
            () => downloadReport('referrals-' + p.code + '.csv', rows),
            true
          )
        );
        const cards = el('div');
        root.append(el('h3', l('Approved creatives', 'Publicités approuvées')), cards);
        pages(
          cards,
          p.creatives,
          (c) => {
            const n = el('article', '', 'discovery-card');
            n.append(el('strong', local(c, 'title')), el('p', local(c, 'text')), el('small', date(c.expires)));
            share(n, location.origin + appPath('/go/' + c.slug));
            return n;
          },
          l('No active creative.', 'Aucune publicité active.')
        );
      } catch (e) {
        root.replaceChildren(el('p', t(e.message)));
      }
    }
    await refresh();
  }
  async function community(root) {
    const message = el('p');
    message.setAttribute('role', 'status');
    const content = el('div');
    root.replaceChildren(message, content);
    let id = null,
      busy = false;
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
    function form(title, build, send) {
      const f = el('form', '', 'discovery-form');
      build(f);
      f.append(el('button', title));
      f.onsubmit = (e) => {
        e.preventDefault();
        void run(() => send(Object.fromEntries(new FormData(f))));
      };
      return f;
    }
    function action(label, fn) {
      return button(label, () => run(fn), true);
    }
    async function open(next) {
      id = next;
      await refresh();
    }
    async function change(key, data) {
      await post(key, { id, ...data });
      await refresh();
    }
    async function refresh() {
      const data = await get('community' + (id ? '?id=' + id : ''));
      content.replaceChildren();
      if (id) {
        content.append(
          action(l('All shared lists', 'Toutes les listes'), () => open(null)),
          el('h3', data.name)
        );
        const actions = el('div', '', 'discovery-actions');
        content.append(actions);
        if (data.organizer)
          actions.append(
            action(l('Create invitation', 'Créer une invitation'), async () => {
              const inv = await post('invite', { id });
              await refresh();
              const box = el('div', '', 'discovery-card');
              box.append(
                el('strong', l('Single-use invitation', 'Invitation à usage unique')),
                el('p', l('Expires', 'Expire le') + ' ' + date(inv.expires))
              );
              share(box, location.origin + appPath('/?listInvite=' + inv.token));
              content.prepend(box);
            })
          );
        actions.append(action(l('Contact support', 'Contacter le soutien'), () => openSupport('list-' + id)));
        const { titles } = await get('coming-soon?locale=' + (french() ? 'fr-CA' : 'en-CA'));
        if (titles.length)
          content.append(
            form(
              l('Suggest a preview', 'Proposer une fiche'),
              (f) =>
                field(f, 'value', l('Preview', 'Fiche'), {
                  items: titles.map((c) => [c.slug, local(c, 'title')])
                }),
              (d) => change('add', { kind: 'preview', value: d.value })
            )
          );
        content.append(
          form(
            l('Suggest a theme', 'Proposer un thème'),
            (f) => field(f, 'value', l('Missing theme', 'Thème manquant'), { required: true, maxLength: 120 }),
            (d) => change('add', { kind: 'theme', value: d.value })
          )
        );
        const entries = el('div');
        content.append(el('h4', l('Shared suggestions', 'Suggestions partagées')), entries);
        const statuses = {
          pending: l('Awaiting review', 'À vérifier'),
          approved: l('Approved', 'Approuvée'),
          rejected: l('Declined', 'Refusée')
        };
        pages(
          entries,
          data.entries,
          (e) => {
            const n = el('article', '', 'discovery-card');
            n.append(el('strong', e.titleEn ? local(e, 'title') : e.value), el('small', statuses[e.state]));
            if (e.kind === 'preview' && e.available) {
              const a = el('a', l('Open preview', 'Ouvrir la fiche'));
              a.href = appPath('/coming-soon/' + e.value);
              n.append(a);
            }
            if (data.organizer && e.state === 'pending')
              for (const key of ['approved', 'rejected'])
                n.append(
                  action(key === 'approved' ? l('Approve', 'Approuver') : l('Decline', 'Refuser'), () =>
                    change('moderate', { entryId: e.id, state: key })
                  )
                );
            return n;
          },
          l('No suggestions yet.', 'Aucune suggestion pour le moment.')
        );
        if (data.organizer) {
          const manage = el('details'),
            details = el('div');
          manage.append(
            el('summary', l('Manage members and invitations', 'Gérer les membres et invitations')),
            details
          );
          content.append(manage);
          const members = el('div'),
            invites = el('div');
          details.append(members, invites);
          pages(
            members,
            data.members,
            (m) =>
              action(l('Remove member', 'Retirer le membre') + ' #' + m.player, () =>
                change('remove', { playerId: m.player })
              ),
            l('No other members.', 'Aucun autre membre.')
          );
          pages(
            invites,
            data.invites,
            (i) => {
              const n = el('div', '', 'discovery-line');
              n.append(el('span', `#${i.id} · ${date(i.expires)}`));
              if (i.revoked || i.used || i.expires <= Date.now())
                n.append(el('small', i.used ? l('Used', 'Utilisée') : l('Inactive', 'Inactive')));
              else n.append(action(l('Revoke', 'Révoquer'), () => change('revoke', { inviteId: i.id })));
              return n;
            },
            l('No invitations.', 'Aucune invitation.')
          );
        }
        return;
      }
      const url = new URL(location.href),
        token = url.searchParams.get('listInvite');
      if (token)
        content.append(
          action(l('Accept invitation', 'Accepter l’invitation'), async () => {
            const result = await post('join', { token });
            url.searchParams.delete('listInvite');
            history.replaceState(null, '', url);
            await open(result.id);
          })
        );
      const lists = el('div');
      content.append(el('h3', l('My shared lists', 'Mes listes partagées')), lists);
      pages(
        lists,
        data.lists,
        (x) => action(x.name, () => open(x.id)),
        l('No shared lists yet.', 'Aucune liste partagée pour le moment.')
      );
      content.append(
        form(
          l('Create list', 'Créer la liste'),
          (f) => field(f, 'name', l('List name', 'Nom de la liste'), { required: true, maxLength: 120 }),
          async (d) => open((await post('create', d)).id)
        )
      );
      const polls = el('div');
      content.append(el('h3', l('Collection polls', 'Sondages sur les collections')), polls);
      pages(
        polls,
        data.polls,
        (p) => {
          const n = el('article', '', 'discovery-card');
          n.append(el('strong', local(p, 'title')));
          if (p.closed)
            n.append(
              action(l('View published results', 'Voir les résultats publiés'), async () => {
                const r = await post('result', { id: p.id });
                const counts = el('ul');
                r.options.forEach((o, i) => counts.append(el('li', local(o, 'title') + ' · ' + r.counts[i])));
                n.replaceChildren(el('strong', local(r, 'title')), counts);
              })
            );
          else
            n.append(
              form(
                l('Save vote', 'Enregistrer le vote'),
                (f) =>
                  field(f, 'choice', l('Your choice', 'Votre choix'), {
                    items: p.options.map((o, i) => [i, local(o, 'title')]),
                    value: p.choice ?? 0
                  }),
                async (d) => {
                  await post('vote', { id: p.id, choice: Number(d.choice) });
                  await refresh();
                  message.textContent = l('Vote recorded.', 'Vote enregistré.');
                }
              )
            );
          return n;
        },
        l('No collection polls yet.', 'Aucun sondage pour le moment.')
      );
    }
    await run(refresh);
  }
  return { banner, community, partner };
}
