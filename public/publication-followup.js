export const followupCopy = {
  followupHeading: ['Publication follow-up', 'Suivi des publications'],
  followupCount: ['{n} to review', '{n} à traiter'],
  followupOpen: ['To review', 'À traiter'],
  followupResolved: ['Resolved', 'Résolues'],
  followupFind: ['Title, record ID or request reference', 'Titre, identifiant de fiche ou référence'],
  followupEmpty: ['No matching publications.', 'Aucune publication correspondante.'],
  followupRange: ['{start}–{end} of {total}', '{start} à {end} sur {total}'],
  followupPublish: ['Publish', 'Publication'],
  followupArchive: ['Unpublish', 'Retrait du site'],
  followupAttempts: ['{n} attempts', '{n} tentatives'],
  followupResolvedAt: ['Resolved {date}', 'Résolu le {date}'],
  followupOpenRecord: ['Open record', 'Ouvrir la fiche']
};

export function createPublicationFollowup({ api, t, element, appPath, locale }) {
  const byId = (id) => document.getElementById(id);
  const panel = byId('publication-followup'),
    form = byId('followup-filters'),
    status = byId('followup-status');
  let totals,
    result,
    page = 1,
    request = 0,
    search = '',
    loading = false;
  const displayCount = () => {
    byId('followup-count').textContent = totals ? '· ' + t('followupCount').replace('{n}', totals.open) : '';
  };
  function render() {
    displayCount();
    if (loading || !result) return;
    const format = new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' });
    status.textContent = result.total
      ? t('followupRange')
          .replace('{start}', (result.page - 1) * result.pageSize + 1)
          .replace('{end}', Math.min(result.total, result.page * result.pageSize))
          .replace('{total}', result.total)
      : t('followupEmpty');
    byId('followup-list').replaceChildren(
      ...result.items.map((item) => {
        const row = element('li');
        const [area, kind, slug] = item.record.split('/');
        const card = area === 'coming-soon';
        const label =
          (locale() === 'fr-CA' ? item.titleFr : item.titleEn) || item.titleEn || item.titleFr || slug || kind;
        const name = element('a', label, 'followup-title');
        const query = new URLSearchParams(card ? { editCard: kind } : { editContent: kind + '/' + slug });
        name.href = appPath('/admin') + '?' + query + (card ? '#coming-soon-admin' : '#website-editorial');
        name.setAttribute('aria-label', t('followupOpenRecord') + ' · ' + label);
        const action = t(item.action === 'publish' ? 'followupPublish' : 'followupArchive');
        row.append(
          name,
          element('small', [action, item.actor, format.format(item.lastAt)].join(' · ')),
          element('p', t(item.reason))
        );
        const reference = t('supportReference') + ' ' + item.requestId;
        row.append(
          element(
            'small',
            item.attempts > 1 ? reference + ' · ' + t('followupAttempts').replace('{n}', item.attempts) : reference
          )
        );
        if (item.resolvedAt) {
          const resolution = t('followupResolvedAt').replace('{date}', format.format(item.resolvedAt));
          row.append(
            element(
              'small',
              item.auditId ? resolution + ' · ' + t('comingSoonAuditRef').replace('{id}', item.auditId) : resolution
            )
          );
        }
        return row;
      })
    );
    byId('followup-pages').hidden = result.total <= result.pageSize;
    byId('followup-prev').disabled = page === 1;
    byId('followup-next').disabled = page * result.pageSize >= result.total;
  }
  async function load(selectedPage = 1) {
    if (panel.hidden || !panel.open) return;
    const id = ++request;
    loading = true;
    status.textContent = t('loading');
    byId('followup-list').replaceChildren();
    byId('followup-pages').hidden = true;
    try {
      const params = new URLSearchParams({ state: form.elements.state.value, q: search, page: selectedPage });
      const response = await api('admin/publication-followup?' + params, undefined, 'GET');
      if (id !== request) return;
      result = response;
      page = response.page;
      totals = response.counts;
      loading = false;
      render();
    } catch (error) {
      if (id !== request) return;
      loading = false;
      result = null;
      status.textContent = t(error.message);
    }
  }
  panel.addEventListener('toggle', () => {
    if (panel.open) void load(page);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search = form.elements.q.value.trim();
    void load();
  });
  form.elements.state.addEventListener('change', () => {
    search = form.elements.q.value.trim();
    void load();
  });
  byId('followup-prev').addEventListener('click', () => {
    void load(page - 1);
  });
  byId('followup-next').addEventListener('click', () => {
    void load(page + 1);
  });
  return {
    render,
    update(counts) {
      totals = counts;
      panel.hidden = !counts?.total;
      if (panel.hidden) {
        ++request;
        loading = false;
        panel.open = false;
        form.reset();
        search = '';
        page = 1;
        result = null;
        status.textContent = '';
        byId('followup-list').replaceChildren();
        byId('followup-pages').hidden = true;
      } else if (panel.open) void load(page);
      else if (!counts.open) form.elements.state.value = 'resolved';
      else form.elements.state.value = 'open';
      displayCount();
    }
  };
}
