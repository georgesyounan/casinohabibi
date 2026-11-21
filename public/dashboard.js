export const dashboardCopy = {
  reportBrand: ['Brand', 'Marque'], reportSource: ['Data', 'Données'], reportSite: ['Site activity', 'Activité du site'], reportTest: ['Test data', 'Données de test'],
  reportCustom: ['Custom dates', 'Dates au choix'], reportFrom: ['From', 'Du'], reportTo: ['Through', 'Au'], reportApply: ['Apply dates', 'Appliquer les dates'],
  reportApplyHint: ['Apply these dates to update the report.', 'Appliquez les dates pour actualiser le rapport.'],
  reportNoRounds: ['No demo rounds in this period.', 'Aucune partie de démo pendant cette période.'],
  reportSignups: ['Verified signups', 'Inscriptions vérifiées'], reportActive: ['Signed-in players', 'Joueurs connectés'],
  reportSaves: ['First saves', 'Premiers favoris'], reportPublished: ['Eligible previews now', 'Fiches visibles maintenant'],
  reportOpenPlayers: ['View players', 'Voir les joueurs'], reportOpenSaves: ['View saves', 'Voir les favoris'], reportOpenTitles: ['View previews', 'Voir les fiches'], reportEditDraft: ['Edit draft', 'Modifier le brouillon'],
  reportClose: ['Close list', 'Fermer la liste'], reportBrandSetup: ['Casino setup', 'Configuration du casino'],
  reportSnapshot: ['As of', 'État au'], reportNone: ['No matching records.', 'Aucun dossier pour cette sélection.'],
  reportCount: ['Matching records', 'Dossiers correspondants'],
  reportSignupsHelp: ['Players appear on the date of their first email verification.', 'Chaque joueur figure à la date de sa première vérification de courriel.'],
  reportActiveHelp: ['One row per signed-in player, with their first recorded visit during the period.', 'Chaque joueur figure une fois, avec sa première visite enregistrée pendant la période.'],
  reportSavesHelp: ['Each player and title pair appears once, on the date of its first save.', 'Chaque favori figure une fois par joueur et par titre, à la date du premier ajout.'],
  reportPublishedHelp: ['Currently published previews eligible for this brand’s market and enabled languages.', 'Fiches actuellement publiées pour le marché et les langues activées de cette marque.'],
  reportUndated: ['Previously verified accounts with an unknown verification date', 'Comptes déjà vérifiés dont la date de vérification est inconnue'],
  reportTrackingSince: ['Visit tracking started on', 'Début du suivi des visites le'],
  reportInvalidDates: ['Choose up to 366 days, ending today or earlier.', 'Choisissez une période d’au plus 366 jours qui se termine au plus tard aujourd’hui.'],
  reportChanged: ['The report changed. Refresh to see the current records.', 'Le rapport a changé. Actualisez pour voir les dossiers actuels.']
};

const metricLabels = { signups: 'reportSignups', active: 'reportActive', saves: 'reportSaves', published: 'reportPublished' };

export function createReportUi({ api, t, element, action, appPath, locale, role, refresh, datesChanged, openPlayer }) {
  const el = (id) => document.getElementById(id);
  const filters = el('report-filters'), period = el('overview-period'), scope = el('report-scope');
  const from = el('report-from'), to = el('report-to'), detail = el('report-records'), heading = el('report-records-heading');
  const buttons = [...document.querySelectorAll('[data-report-metric]')];
  let current, lastBrand, brands = [], records, selected, cursorStack = [null], page = 0, serial = 0;
  const initial = new URLSearchParams(location.search);
  const initialDays = initial.get('reportDays');
  if (['7', '30', '90'].includes(initialDays)) period.value = initialDays;
  if (initial.has('reportFrom') && initial.has('reportTo')) {
    period.value = 'custom';
    from.value = initial.get('reportFrom'); to.value = initial.get('reportTo');
  }
  let preferredScope = ['site','test'].includes(initial.get('reportScope')) ? initial.get('reportScope') : null;

  function customFields() {
    for (const field of filters.querySelectorAll('[data-report-custom]')) field.hidden = period.value !== 'custom';
    from.required = to.required = period.value === 'custom';
  }
  customFields();
  function params() {
    const out = new URLSearchParams(period.value === 'custom' ? { from: from.value, to: to.value } : { days: period.value });
    if (preferredScope) out.set('scope', preferredScope);
    return out;
  }
  function close(focus = false) {
    serial++;
    if (focus) buttons.find((b) => b.dataset.reportMetric === selected)?.focus();
    selected = records = null; page = 0; cursorStack = [null];
    detail.hidden = true;
    el('report-record-list').replaceChildren();
    for (const button of buttons) button.setAttribute('aria-expanded', 'false');
  }
  function loading() {
    close();
    current = null;
    for (const button of buttons) button.disabled = true;
    for (const id of ['report-signups','report-active','overview-coming-soon-saves','overview-coming-soon']) el(id).textContent = '—';
    el('report-context').textContent = ''; el('report-coverage').hidden = true;
  }
  function renderRecords() {
    if (!selected) return;
    heading.textContent = t(metricLabels[selected]);
    el('report-record-help').textContent = t(metricLabels[selected] + 'Help');
    if (!records) return;
    const fmt = new Intl.DateTimeFormat(locale(), { timeZone: current.reportingTimeZone, dateStyle: 'medium', timeStyle: 'short' });
    el('report-record-status').textContent = records.total ? t('reportCount') + ' · ' + records.total : t('reportNone');
    el('report-record-list').replaceChildren(...records.entries.map((row) => {
      const li = element('li');
      if (selected === 'published') {
        const language = row.locales.includes(locale()) ? locale() : row.locales[0];
        const link = element('a', language === 'fr-CA' ? row.titleFr : row.titleEn);
        const query = new URLSearchParams({ locale: language, lang: language.slice(0, 2) });
        link.href = appPath('/coming-soon/' + row.slug + '?' + query);
        li.append(link);
        if (['operator_admin','operator_content','operator_provider'].includes(role())) {
          const edit = element('a', t('reportEditDraft'));
          edit.href = appPath('/admin?preview=' + row.slug + '#coming-soon-admin');
          li.append(' · ', edit);
        }
      } else {
        const reference = selected === 'saves' ? (row.activityId ? 'activity-' + row.activityId : 'save-' + row.id) : 'player-' + row.playerId;
        li.append(action(row.email, () => openPlayer(reference), 'report-record-link'));
      }
      const ref = selected === 'published' ? row.slug + ' · ' + t('comingSoonRevision') + ' ' + row.revision :
        selected === 'saves' ? 'save-' + row.id + ' · ' + row.slug : 'player-' + row.playerId;
      li.append(element('small', [ref, row.at && fmt.format(row.at)].filter(Boolean).join(' · ')));
      return li;
    }));
    el('report-record-pages').hidden = !page && !records.nextCursor;
    el('report-prev').disabled = !page; el('report-next').disabled = !records.nextCursor;
    el('report-page').textContent = 'Page ' + (page + 1);
  }
  async function loadRecords(metric, nextPage = 0, retry = true) {
    if (!current) return;
    if (selected !== metric) { cursorStack = [null]; nextPage = 0; }
    const id = ++serial;
    selected = metric; page = nextPage; records = null; detail.hidden = false;
    for (const button of buttons) button.setAttribute('aria-expanded', String(button.dataset.reportMetric === metric));
    renderRecords();
    heading.focus({ preventScroll: true });
    el('report-record-list').replaceChildren();
    el('report-record-pages').hidden = true; el('report-record-status').textContent = t('loading');
    const query = new URLSearchParams({ metric, from: current.from, to: current.to, brand: current.brandId, scope: current.scope,
      asOf: current.generatedAt, stamp: current.catalogueStamp, zone: current.reportingTimeZone });
    if (nextPage) query.set('before', cursorStack[nextPage]);
    try {
      const result = await api('admin/overview/records?' + query, undefined, 'GET');
      if (id !== serial) return;
      if (current.totals[metric] !== result.total) throw new Error('reportChanged');
      records = result; cursorStack = cursorStack.slice(0, nextPage + 1);
      if (result.nextCursor) cursorStack.push(result.nextCursor);
      renderRecords();
    } catch (error) {
      if (id !== serial) return;
      if (retry && error.message === 'reportChanged') {
        await refresh();
        if (current && !selected) await loadRecords(metric, 0, false);
      } else el('report-record-status').textContent = t(error.message);
    }
  }
  function render(data) {
    current = data;
    brands = data.brands; lastBrand = data.brandId;
    const brand = brands.find((entry) => entry.id === lastBrand);
    const brandSelect = el('report-brand');
    brandSelect.replaceChildren(...data.brands.map((entry) => new Option(entry.name, entry.id, false, entry.id === data.brandId)));
    el('report-brand-field').hidden = data.brands.length < 2;
    el('report-scope-field').hidden = !data.hasFixtures && data.scope !== 'test'; scope.value = data.scope;
    if (period.value !== 'custom' || !from.value || !to.value) { from.value = data.from; to.value = data.to; }
    const total = new Intl.NumberFormat(locale());
    el('report-signups').textContent = total.format(data.totals.signups); el('report-active').textContent = total.format(data.totals.active);
    const fmt = new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', dateStyle: 'medium' });
    const range = [data.from,data.to].map((day) => fmt.format(new Date(day + 'T12:00:00Z'))).join(' – ');
    el('report-context').textContent = [brand?.name || data.brandId, range, data.reportingTimeZone, data.scope === 'test' ? t('reportTest') : ''].filter(Boolean).join(' · ');
    const notes = [];
    const started = new Intl.DateTimeFormat('sv-SE', { timeZone: data.reportingTimeZone }).format(data.startedAt);
    if (data.scope === 'site' && data.playerAccounts && data.from < started) notes.push(t('reportTrackingSince') + ' ' + fmt.format(new Date(started + 'T12:00:00Z')));
    if (data.undatedVerified) notes.push(t('reportUndated') + ' · ' + data.undatedVerified);
    el('report-coverage').textContent = notes.join('. '); el('report-coverage').hidden = !notes.length;
    for (const button of buttons) {
      button.hidden = button.dataset.reportMetric !== 'published' && !['operator_admin','operator_support'].includes(role());
      button.disabled = false;
      button.setAttribute('aria-controls', detail.id);
      button.setAttribute('aria-label', t(button.dataset.copy) + ' · ' + t(metricLabels[button.dataset.reportMetric]));
    }
    renderRecords();
  }
  for (const button of buttons) button.addEventListener('click', () => { void loadRecords(button.dataset.reportMetric); });
  el('report-close').addEventListener('click', () => close(true));
  el('report-prev').addEventListener('click', () => { if (page) void loadRecords(selected, page - 1); });
  el('report-next').addEventListener('click', () => { if (records?.nextCursor) void loadRecords(selected, page + 1); });
  filters.addEventListener('submit', (e) => { e.preventDefault(); void refresh(); });
  period.addEventListener('change', () => {
    customFields();
    if (period.value === 'custom') { datesChanged(); from.focus(); }
    else void refresh();
  });
  for (const input of [from, to]) input.addEventListener('input', datesChanged);
  scope.addEventListener('change', () => { preferredScope = scope.value; void refresh(); });
  el('report-brand').addEventListener('change', () => {
    const destination = brands.find((brand) => brand.id === el('report-brand').value);
    if (!destination || destination.id === lastBrand || !destination.host) return;
    const url = new URL(appPath('/admin'), location.origin);
    url.hostname = destination.host;
    if (url.hostname !== destination.host) return;
    if (period.value === 'custom') { url.searchParams.set('reportFrom', from.value); url.searchParams.set('reportTo', to.value); }
    else url.searchParams.set('reportDays', period.value);
    if (preferredScope) url.searchParams.set('reportScope', preferredScope);
    url.hash = 'overview'; location.assign(url.href);
  });
  return { render, loading, params };
}
