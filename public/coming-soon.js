export const comingSoonCopy = {
  comingSoonMarket: ['Display market (blank for all markets)', 'Marché d’affichage (vide pour tous les marchés)'],
  comingSoonLanguages: ['Show this card in', 'Afficher cette fiche en'],
  comingSoonBoth: ['English and French', 'Anglais et français'],
  comingSoonDraftPreview: ['Preview draft', 'Aperçu du brouillon'],
  comingSoonBackToCatalogue: ['Back to catalogue', 'Retour au catalogue'],
  comingSoonPreviewLocale: ['Preview language', 'Langue de l’aperçu'],
  comingSoonRevision: ['Revision', 'Révision'],
  comingSoon: ['Coming soon', 'À venir'],
  comingSoonDiscover: ['Discover', 'À découvrir'],
  comingSoonFeatured: ['Featured previews', 'Aperçus en vedette'],
  comingSoonEmpty: ['New previews are on the way.', 'De nouveaux aperçus arrivent bientôt.'],
  comingSoonMissing: ['This preview is unavailable.', 'Cet aperçu est indisponible.'],
  comingSoonOpen: ['See preview', 'Voir l’aperçu'],
  comingSoonBack: ['Back to the lobby', 'Retour au hall'],
  comingSoonCatalogue: ['Coming Soon catalogue', 'Catalogue À venir'],
  comingSoonAdminHelp: ['Create a bilingual draft, then publish it to the lobby.', 'Rédigez le brouillon bilingue, puis publiez-le dans le hall.'],
  comingSoonNew: ['New preview', 'Nouvel aperçu'],
  comingSoonFind: ['Find previews', 'Rechercher des aperçus'],
  comingSoonNoDrafts: ['There are no previews yet.', 'Il n’y a aucun aperçu pour le moment.'],
  comingSoonNoMatches: ['No previews match your search.', 'Aucun aperçu ne correspond à votre recherche.'],
  comingSoonTitleEn: ['English title', 'Titre anglais'],
  comingSoonTitleFr: ['French title', 'Titre français'],
  comingSoonDescriptionEn: ['English description', 'Description anglaise'],
  comingSoonDescriptionFr: ['French description', 'Description française'],
  comingSoonStudio: ['Studio', 'Studio'],
  comingSoonCategory: ['Category', 'Catégorie'],
  comingSoonArtwork: ['Cover image (PNG, JPEG or WebP, up to 48 KB)', 'Image de couverture (PNG, JPEG ou WebP, jusqu’à 48 Ko)'],
  comingSoonRemoveArt: ['Remove cover', 'Retirer la couverture'],
  comingSoonAltEn: ['English image description', 'Description anglaise de l’image'],
  comingSoonAltFr: ['French image description', 'Description française de l’image'],
  comingSoonRank: ['Featured order (0 hides it from Featured)', 'Ordre en vedette (0 retire l’aperçu des vedettes)'],
  comingSoonEdit: ['Edit draft', 'Modifier le brouillon'],
  comingSoonPublish: ['Publish preview', 'Publier l’aperçu'],
  comingSoonArchive: ['Archive preview', 'Archiver l’aperçu'],
  comingSoonDraft: ['Draft', 'Brouillon'],
  comingSoonPublished: ['Published', 'Publié'],
  comingSoonArchived: ['Archived', 'Archivé'],
  comingSoonUnpublishedEdit: ['Draft changes', 'Modifications en brouillon'],
  comingSoonSaved: ['Draft saved.', 'Brouillon enregistré.'],
  comingSoonPublishedMessage: ['Preview published.', 'Aperçu publié.'],
  comingSoonArchivedMessage: ['Preview archived.', 'Aperçu archivé.'],
  comingSoonAuditRef: ['Audit entry #{id}', 'Entrée d’audit no {id}'],
  comingSoonConflict: ['This draft changed. Reload it from the catalogue before retrying.', 'Ce brouillon a changé. Rechargez-le depuis le catalogue avant de réessayer.'],
  comingSoonSaves: ['Preview saves', 'Favoris des joueurs'],
  comingSoonSavesSearch: ['Player email, player ID or save reference', 'Courriel, numéro de joueur ou référence du favori'],
  comingSoonSearch: ['Search', 'Rechercher'],
  comingSoonSavesEmpty: ['No preview saves found.', 'Aucun favori trouvé.'],
  comingSoonSaveRef: ['Save reference', 'Référence du favori'],
  comingSoonDate: ['Saved on', 'Enregistré le'],
  comingSoonCount: ['Published previews', 'Aperçus publiés'],
  comingSoonSaveCount: ['Distinct preview saves', 'Favoris distincts'],
  comingSoonAuditSaved: ['Saved preview draft', 'Brouillon d’aperçu enregistré'],
  comingSoonAuditPublished: ['Published Coming Soon preview', 'Aperçu À venir publié'],
  comingSoonAuditArchived: ['Archived Coming Soon preview', 'Aperçu À venir archivé'],
};

const fields = ['titleEn', 'titleFr', 'studio', 'descriptionEn', 'descriptionFr', 'altEn', 'altFr', 'category', 'featuredRank'];
const canEdit = ['operator_admin', 'operator_content', 'operator_provider'];
const canReviewSaves = ['operator_admin', 'operator_support'];
const searchable = (text) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function createComingSoonUi({ api, t, element, action, appPath, currentRoute, openPlayer, lobbyEnabled, isFrench, getFavorites, favoritePending, toggleFavorite }) {
  const detailSlug = currentRoute.match(/^\/coming-soon\/([a-z0-9-]{1,64})$/)?.[1];
  const $ = (id) => document.getElementById(id);
  const form = $('coming-soon-form');
  const list = $('coming-soon-admin-list');
  const adminStatus = $('coming-soon-admin-status');
  const newButton = $('coming-soon-new');
  const search = $('coming-soon-admin-search');
  const saveForm = $('coming-soon-save-search');
  let lobby = { titles: [], featured: [], discover: [] };
  let preview;
  let detailLoaded = false;
  let staffRole;
  let canPublish = false;
  let drafts = [];
  let draftsLoaded = false;
  let selected;
  let artwork = '';
  let saving = false;
  let saves;
  let savesRequest = 0;
  let savesPage = 0;
  let savesHasNext = false;
  let savesCursors = [null];
  let savedSearch = '';
  const pageSize = 10;

  const titleName = (title) => isFrench() ? title.titleFr : title.titleEn;
  const isFavorite = (key) => getFavorites().has(key);
  const dateTime = (time) => new Intl.DateTimeFormat(isFrench() ? 'fr-CA' : 'en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(time);
  const stateText = (state) => t({ draft: 'comingSoonDraft', published: 'comingSoonPublished', archived: 'comingSoonArchived' }[state]);
  const linkTo = (title, label, className) => {
    const link = element('a', label, className);
    link.href = appPath(`/coming-soon/${title.slug}`);
    return link;
  };

  function cover(title, french = isFrench(), allowSave = true) {
    const art = element('div', '', `art coming-soon-art coming-soon-${title.category}`);
    if (title.artwork) {
      const image = element('img');
      image.src = title.artwork;
      image.alt = french ? title.altFr : title.altEn;
      art.append(image);
    } else {
      const mark = element('span', { slots: '✦', table: '♢', live: '◈' }[title.category]);
      mark.setAttribute('aria-hidden', 'true');
      art.append(mark);
    }
    if (!allowSave) return art;
    const saved = isFavorite(title.favoriteKey);
    const favorite = action(saved ? '★' : '☆', () => { void toggleFavorite(title.favoriteKey); }, 'favorite-toggle');
    favorite.disabled = favoritePending();
    favorite.setAttribute('aria-pressed', String(saved));
    favorite.setAttribute('aria-label', t(saved ? 'removeFavorite' : 'addFavorite').replace('{game}', titleName(title)));
    art.append(favorite);
    return art;
  }

  function card(title) {
    const info = element('div', '', 'card-info');
    info.append(element('small', t('comingSoon'), 'catalog-label'), element('strong', titleName(title)),
      element('small', [t(title.category), title.studio].filter(Boolean).join(' · ')),
      linkTo(title, t('comingSoonOpen'), 'button ghost'));
    const node = element('article', '', 'card');
    node.append(cover(title), info);
    return node;
  }

  function showRow(id, items) {
    const row = $(id);
    row.hidden = !items.length;
    row.querySelector('.cards').replaceChildren(...items.map(card));
  }

  function renderLobby(filter, search) {
    if (!lobbyEnabled()) {
      $('coming-soon').hidden = true;
      return { count: 0, hasFavorites: false };
    }
    const bySlug = new Map(lobby.titles.map((title) => [title.slug, title]));
    const stars = lobby.titles.filter((title) => isFavorite(title.favoriteKey));
    const normal = filter === 'all' && !search.trim();
    const query = searchable(search.trim());
    const filtered = normal ? [] : lobby.titles.filter((title) => {
      if (filter === 'recent' || (filter === 'favorites' && !isFavorite(title.favoriteKey))) return false;
      if (!['all', 'favorites'].includes(filter) && filter !== title.category) return false;
      return searchable([title.titleEn, title.titleFr, title.studio].join(' ')).includes(query);
    });
    if (filter === 'favorites') {
      const order = new Map([...getFavorites()].map((key, index) => [key, index]));
      filtered.sort((a, b) => order.get(b.favoriteKey) - order.get(a.favoriteKey));
    }
    $('coming-soon').hidden = !normal && !filtered.length;
    $('coming-soon-empty').hidden = Boolean(lobby.titles.length) || !normal;
    showRow('coming-soon-featured', normal ? lobby.featured.map((slug) => bySlug.get(slug)) : []);
    showRow('coming-soon-discover', normal ? lobby.discover.map((slug) => bySlug.get(slug)) : []);
    showRow('coming-soon-filtered', filtered);
    return { count: normal ? lobby.titles.length : filtered.length, hasFavorites: stars.length > 0 };
  }

  function detailCard(title, french, allowSave) {
    const body = element('article', '', 'coming-soon-detail-card');
    body.lang = french ? 'fr-CA' : 'en-CA';
    const info = element('div', '', 'coming-soon-detail-copy');
    const category = { slots: ['Slots', 'Machines à sous'], live: ['Live', 'En direct'], table: ['Table games', 'Jeux de table'] }[title.category];
    info.append(element('p', french ? 'À venir' : 'Coming Soon', 'eyebrow'), element(allowSave ? 'h1' : 'h4', french ? title.titleFr : title.titleEn),
      element('p', [category[Number(french)], title.studio].filter(Boolean).join(' · ')));
    const description = french ? title.descriptionFr : title.descriptionEn;
    if (description) info.append(element('p', description));
    body.append(cover(title, french, allowSave), info);
    return body;
  }

  function renderDetail() {
    if (!detailSlug) return;
    const target = $('coming-soon-detail-content');
    if (!detailLoaded) return;
    if (!preview) {
      target.replaceChildren(element('h1', t('comingSoonMissing')));
      return;
    }
    target.replaceChildren(detailCard(preview, isFrench(), true));
    return titleName(preview);
  }

  let lobbyRequest = 0;
  async function loadLobby() {
    const request = ++lobbyRequest;
    const suffix = '?locale=' + (isFrench() ? 'fr-CA' : 'en-CA');
    if (detailSlug) {
      preview = undefined;
      try {
        const title = await api('coming-soon/' + detailSlug + suffix, undefined, 'GET');
        if (request === lobbyRequest) preview = title;
      } finally { if (request === lobbyRequest) detailLoaded = true; }
    } else {
      lobby = { titles: [], featured: [], discover: [] };
      const result = await api('coming-soon' + suffix, undefined, 'GET');
      if (request === lobbyRequest) lobby = result;
    }
  }

  function selectDraft(title) {
    selected = title;
    artwork = title?.artwork || '';
    form.reset();
    for (const name of fields) {
      if (title) form.elements[name].value = title[name];
    }
    form.elements.cardMarket.value = title?.displayMarket || '';
    form.elements.locales.value = title?.locales.length === 1 ? title.locales[0] : 'both';
    $('coming-soon-edit-title').textContent = title ? titleName(title) : t('comingSoonNew');
    $('coming-soon-remove-art').hidden = !artwork;
  }

  function openEditor(title) {
    selectDraft(title);
    form.hidden = false;
    newButton.setAttribute('aria-expanded', 'true');
    form.elements.titleEn.focus();
  }

  function closeEditor() {
    form.hidden = true;
    newButton.setAttribute('aria-expanded', 'false');
    newButton.focus();
  }

  function renderAdmin() {
    if (canEdit.includes(staffRole)) {
      $('coming-soon-edit-title').textContent = selected ? titleName(selected) : t('comingSoonNew');
      search.closest('label').hidden = drafts.length === 0 || Boolean(draftSlug);
      newButton.hidden = list.hidden = Boolean(draftSlug);
      $('catalogue-draft-preview').hidden = !draftSlug;
      if (draftPreview) {
        const french = $('draft-preview-language').value === 'fr-CA';
        $('draft-preview-content').replaceChildren(detailCard(draftPreview, french, false));
        $('draft-preview-revision').textContent = [t('comingSoonRevision') + ' ' + draftPreview.version, draftPreview.displayMarket,
          draftPreview.locales.join(' / ')].filter(Boolean).join(' · ');
      }
      const query = searchable(search.value.trim());
      const matches = drafts.filter((title) => searchable([title.titleEn, title.titleFr, title.studio, title.slug].join(' ')).includes(query));
      const rows = matches.map((title) => {
        const row = element('li', '', 'coming-soon-admin-row');
        const name = element('div');
        const status = title.state === 'published' && title.publishedVersion !== title.version
          ? `${stateText(title.state)} · ${t('comingSoonUnpublishedEdit')}` : stateText(title.state);
        name.append(element('strong', titleName(title)), element('small', status));
        const controls = element('div', '', 'actions');
        controls.append(action(t('comingSoonEdit'), () => openEditor(title), 'ghost'));
        const previewLink = element('a', t('comingSoonDraftPreview'), 'button ghost');
        previewLink.href = title.previewUrl;
        controls.append(previewLink);
        if (title.state === 'published') controls.append(linkTo(title, t('comingSoonOpen'), 'button ghost'));
        if (canPublish) {
          if (title.state !== 'published' || title.publishedVersion !== title.version) {
            controls.append(action(t('comingSoonPublish'), () => { void change('publish', title); }));
          }
          if (title.state === 'published') controls.append(action(t('comingSoonArchive'), () => { void change('archive', title); }, 'ghost'));
        }
        row.append(name, controls);
        return row;
      });
      const empty = $('coming-soon-admin-empty');
      empty.hidden = Boolean(draftSlug) || !draftsLoaded || matches.length > 0;
      empty.textContent = t(drafts.length ? 'comingSoonNoMatches' : 'comingSoonNoDrafts');
      list.replaceChildren(...rows);
    }
    if (canReviewSaves.includes(staffRole) && saves) {
      $('saves-pages').hidden = !savesPage && !savesHasNext;
      $('saves-previous').disabled = savesPage === 0;
      $('saves-next').disabled = !savesHasNext;
      $('saves-page-count').textContent = 'Page ' + (savesPage + 1);
      $('coming-soon-saves-body').replaceChildren(...saves.map((entry) => {
        const row = element('tr');
        const player = element('td');
        player.append(action(entry.email, () => openPlayer(entry.playerId), 'ghost'));
        row.append(element('td', 'save-' + entry.id), player);
        for (const value of [entry.slug, stateText(entry.state), dateTime(entry.createdAt)]) row.append(element('td', value));
        return row;
      }));
      $('coming-soon-saves-status').textContent = saves.length ? '' : t('comingSoonSavesEmpty');
    }
  }

  async function loadSaves(page = 0) {
    const request = ++savesRequest;
    $('coming-soon-saves-status').textContent = t('loading');
    try {
      const search = page ? savedSearch : saveForm.elements.query.value.trim();
      const query = new URLSearchParams({ q: search, limit: pageSize + 1 });
      if (page) query.set('before', savesCursors[page]);
      const rows = await api(`admin/coming-soon/saves?${query}`, undefined, 'GET');
      if (request !== savesRequest) return;
      savedSearch = search;
      savesPage = page;
      saves = rows.slice(0, pageSize);
      savesHasNext = rows.length > pageSize;
      savesCursors = savesCursors.slice(0, page + 1);
      if (savesHasNext) savesCursors.push(saves.at(-1).id);
      renderAdmin();
    } catch (error) {
      if (request === savesRequest) $('coming-soon-saves-status').textContent = t(error.message);
    }
  }

  const draftSlug = new URLSearchParams(location.search).get('preview');
  let draftPreview;
  $('draft-preview-language').addEventListener('change', renderAdmin);

  async function loadDrafts(showLoading = true) {
    if (!canEdit.includes(staffRole)) return;
    if (showLoading) adminStatus.textContent = t('loading');
    try {
      if (draftSlug) {
        draftPreview = await api('admin/coming-soon/preview/' + encodeURIComponent(draftSlug), undefined, 'GET');
        $('draft-preview-language').value = draftPreview.locales.includes(isFrench() ? 'fr-CA' : 'en-CA') ? (isFrench() ? 'fr-CA' : 'en-CA') : draftPreview.locales[0];
      } else drafts = await api('admin/coming-soon', undefined, 'GET');
      draftsLoaded = true;
      if (showLoading) adminStatus.textContent = '';
      renderAdmin();
    } catch (error) {
      adminStatus.textContent = t(error.message);
    }
  }

  async function change(verb, title, draft = {}) {
    if (saving) return;
    saving = true;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    adminStatus.textContent = t('loading');
    try {
      const result = await api('admin/coming-soon', { action: verb, slug: title?.slug, version: title?.version ?? 0, ...draft });
      drafts = [result.title, ...drafts.filter(({ slug }) => slug !== result.title.slug)];
      if (verb === 'save') {
        search.value = '';
        closeEditor();
      }
      if (verb === 'save' || title?.slug === selected?.slug) selectDraft(result.title);
      renderAdmin();
      const message = t({ save: 'comingSoonSaved', publish: 'comingSoonPublishedMessage', archive: 'comingSoonArchivedMessage' }[verb]);
      adminStatus.textContent = result.auditId ? `${message} ${t('comingSoonAuditRef').replace('{id}', result.auditId)}` : message;
    } catch (error) {
      adminStatus.textContent = t(error.message);
      if (error.requestId) adminStatus.append(' · ' + t('supportReference') + ' ' + error.requestId);
      if (error.message === 'comingSoonConflict') void loadDrafts(false);
    } finally {
      saving = false;
      submit.disabled = false;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const file = form.elements.artworkFile.files[0];
    const data = Object.fromEntries(fields.map((name) => [name, form.elements[name].value]));
    data.displayMarket = form.elements.cardMarket.value.trim().toUpperCase();
    data.locales = form.elements.locales.value === 'both' ? ['en-CA', 'fr-CA'] : [form.elements.locales.value];
    data.featuredRank = Number(data.featuredRank);
    try {
      if (file?.size > 48 * 1024) throw new Error('invalid');
      data.artwork = file ? await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('invalid'));
        reader.readAsDataURL(file);
      }) : artwork;
      await change('save', selected, data);
    } catch (error) {
      adminStatus.textContent = t(error.message);
    }
  });
  newButton.addEventListener('click', () => openEditor(null));
  $('coming-soon-close-editor').addEventListener('click', closeEditor);
  search.addEventListener('input', renderAdmin);
  $('coming-soon-remove-art').addEventListener('click', () => {
    artwork = '';
    form.elements.artworkFile.value = '';
    $('coming-soon-remove-art').hidden = true;
  });
  saveForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void loadSaves();
  });
  $('saves-previous').addEventListener('click', () => { void loadSaves(savesPage - 1); });
  $('saves-next').addEventListener('click', () => { void loadSaves(savesPage + 1); });

  function favoriteStatus(message) {
    $('coming-soon-favorite-status').textContent = message;
  }

  return {
    isDetail: Boolean(detailSlug), loadLobby, renderDetail, renderLobby, loadDrafts, loadSaves, renderAdmin, favoriteStatus,
    setStaffAccess(role, allowed) {
      staffRole = role;
      canPublish = allowed;
    }
  };
}
