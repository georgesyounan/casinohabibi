import { games, catalogueCategories, collectionKey, matchesCatalogue } from './catalog.js';

export const comingSoonCopy = {
  catalogueCollection: ['Collection', 'Collection'],
  catalogueCollectionOptional: ['Collection name (optional)', 'Nom de la collection (facultatif)'],
  catalogueAllCollections: ['All collections', 'Toutes les collections'],
  catalogueMissingCollection: ['Unavailable collection', 'Collection indisponible'],
  comingSoonCollectionTranslation: ['Enter the collection name in each language available for this preview.', 'Ajoutez le nom de la collection dans chaque langue où cette fiche est visible.'],
  catalogueEditLanguage: ['Translation to edit', 'Traduction à modifier'],
  catalogueClassification: ['Category, studio and visibility', 'Catégorie, studio et visibilité'],
  catalogueCover: ['Cover image', 'Image de couverture'],
  catalogueReturnList: ['Back to preview list', 'Retour à la liste des fiches'],
  catalogueState: ['Status', 'Statut'],
  catalogueAllStates: ['All statuses', 'Tous les statuts'],
  catalogueAllCategories: ['All categories', 'Toutes les catégories'],
  catalogueRange: ['{start}–{end} of {total} previews', 'Fiches {start} à {end} sur {total}'],
  catalogueModified: ['Unsaved changes', 'Modifications non enregistrées'],
  catalogueConfirmClose: ['Discard your unsaved changes?', 'Abandonner les modifications non enregistrées ?'],
  catalogueConfirmArchive: ['Archive this preview and remove it from the public catalogue?', 'Archiver cette fiche et la retirer du catalogue public ?'],
  catalogueReload: ['Reload this preview', 'Recharger cette fiche'],
  catalogueOtherPreview: ['Another preview', 'Autre fiche à découvrir'],
  playableDemo: ['Playable demo', 'Démo jouable'],
  cataloguePreviewsAndDemos: ['Previews and demos', 'Aperçus et démos'],
  openPlayableDemo: ['Play the demo', 'Jouer à la démo'],
  demoMechanics: ['Playable demo', 'Démo jouable'],
  noDemoGame: ['Preview only', 'Fiche seulement'],
  invalidDemoGame: ['Choose an available demo for this category.', 'Choisissez une démo disponible dans cette catégorie.'],
  demoUnavailable: ['This demo is no longer available here.', 'Cette démo n’est plus disponible sur cette fiche.'],
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

const fields = ['titleEn', 'titleFr', 'studio', 'descriptionEn', 'descriptionFr', 'altEn', 'altFr', 'collectionEn', 'collectionFr', 'category', 'featuredRank'];
const canEdit = ['operator_admin', 'operator_content', 'operator_provider'];
const canReviewSaves = ['operator_admin', 'operator_support'];
export function createComingSoonUi({ api, t, element, action, appPath, currentRoute, openPlayer, lobbyEnabled, isFrench, getFavorites, favoritePending, toggleFavorite, catalogueParams, startDemo }) {
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
  let library, listRequest = 0, editorRequest = 0, opening = false, dirty = false, conflict = false, searchTimer, refreshOnClose = false;
  let alternative, previewError;
  let selected;
  let artwork = '';
  let saving = false, readingArtwork = false;
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
  const revisionText = (title) => title.state === 'published' && title.publishedVersion !== title.version
    ? stateText(title.state) + ' · ' + t('comingSoonUnpublishedEdit') : stateText(title.state);
  const collectionName = (title) => (isFrench() ? title.collectionFr : title.collectionEn) || title.collectionEn || title.collectionFr || '';
  function publicUrl(title) {
    const preferred = isFrench() ? 'fr-CA' : 'en-CA';
    const locale = title.locales?.includes(preferred) ? preferred : title.locales?.[0] || preferred;
    const params = catalogueParams();
    params.set('lang', locale.slice(0, 2));
    params.set('locale', locale);
    return appPath('/coming-soon/' + title.slug) + '?' + params;
  }
  const linkTo = (title, label, className) => {
    const link = element('a', label, className);
    link.href = publicUrl(title);
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
    info.append(element('small', t(title.demoGame ? 'playableDemo' : 'comingSoon'), 'catalog-label'), element('strong', titleName(title)),
      element('small', [t(title.category), title.studio, collectionName(title)].filter(Boolean).join(' · ')),
      linkTo(title, t('comingSoonOpen'), 'button ghost'));
    const node = element('article', '', 'card');
    node.append(cover(title), info);
    return node;
  }

  let spotlightTitles = [], spotlightSlug = '';
  const spotlight = $('lobby-spotlight');
  function showSpotlight() {
    const title = spotlightTitles.find((item) => item.slug === spotlightSlug) || spotlightTitles[0];
    spotlight.hidden = !title;
    if (!title) return;
    spotlightSlug = title.slug;
    const image = $('spotlight-image');
    if (title.artwork && image.getAttribute('src') !== title.artwork) image.src = title.artwork;
    image.hidden = !title.artwork;
    $('spotlight-link').href = publicUrl(title);
    $('spotlight-name').textContent = titleName(title);
    $('spotlight-type').textContent = [collectionName(title), t(title.demoGame ? 'playableDemo' : 'comingSoon')].filter(Boolean).join(' · ');
    spotlight.querySelector('.spotlight-nav').hidden = spotlightTitles.length < 2;
  }
  function stepSpotlight(direction) {
    const index = spotlightTitles.findIndex((item) => item.slug === spotlightSlug);
    spotlightSlug = spotlightTitles[(index + direction + spotlightTitles.length) % spotlightTitles.length].slug;
    showSpotlight();
  }
  $('spotlight-prev').addEventListener('click', () => stepSpotlight(-1));
  $('spotlight-next').addEventListener('click', () => stepSpotlight(1));

  function showRow(id, items) {
    const row = $(id);
    row.hidden = !items.length;
    row.querySelector('.cards').replaceChildren(...items.map(card));
  }

  function renderLobby(filter, search, collection, recentPreviews) {
    const collections = new Map();
    if (lobbyEnabled()) for (const title of lobby.titles) {
      if (collectionName(title)) collections.set(collectionKey(title), collectionName(title));
    }
    const selector = $('catalog-collection');
    const options = [...collections].sort((a, b) => a[1].localeCompare(b[1], isFrench() ? 'fr' : 'en'));
    selector.replaceChildren(new Option(t('catalogueAllCollections'), ''), ...options.map(([key, name]) => new Option(name, key)));
    if (collection && !collections.has(collection)) selector.add(new Option(t('catalogueMissingCollection'), collection));
    selector.value = collection;
    $('catalog-collection-control').hidden = !collection && !options.length;
    if (!lobbyEnabled()) {
      spotlightTitles = [];
      showSpotlight();
      $('coming-soon').hidden = true;
      return { count: 0, playable: 0, available: 0, hasFavorites: false };
    }
    const bySlug = new Map(lobby.titles.map((title) => [title.slug, title]));
    const ordered = new Set([...lobby.featured, ...lobby.discover]);
    spotlightTitles = [...ordered].map(slug => bySlug.get(slug)).filter(Boolean);
    showSpotlight();
    const stars = lobby.titles.filter((title) => isFavorite(title.favoriteKey));
    const normal = filter === 'all' && !search.trim() && !collection;
    const filtered = normal ? [] : lobby.titles.filter((title) => {
      if (filter === 'recent' && (!title.demoGame || !recentPreviews.has(title.slug))) return false;
      if (filter === 'favorites' && !isFavorite(title.favoriteKey)) return false;
      if (!['all', 'favorites', 'recent'].includes(filter) && filter !== title.category) return false;
      return (!collection || collectionKey(title) === collection) &&
        matchesCatalogue(search, [title.titleEn, title.titleFr, title.studio, title.collectionEn, title.collectionFr], title.category);
    });
    if (filter === 'recent') filtered.sort((a,b) => recentPreviews.get(a.slug)-recentPreviews.get(b.slug));
    if (filter === 'favorites') {
      const order = new Map([...getFavorites()].map((key, index) => [key, index]));
      filtered.sort((a, b) => order.get(b.favoriteKey) - order.get(a.favoriteKey));
    }
    $('coming-soon').hidden = !normal && !filtered.length;
    $('coming-soon-empty').hidden = Boolean(lobby.titles.length) || !normal;
    showRow('coming-soon-featured', normal ? lobby.featured.map((slug) => bySlug.get(slug)) : []);
    showRow('coming-soon-discover', normal ? lobby.discover.map((slug) => bySlug.get(slug)) : []);
    showRow('coming-soon-filtered', filtered);
    const listed = normal ? lobby.titles : filtered;
    const playable = listed.filter(title => title.demoGame).length;
    $('coming-soon-heading').textContent = t(playable ? 'cataloguePreviewsAndDemos' : 'comingSoon');
    return { count: listed.length, playable, available: lobby.titles.length, hasFavorites: stars.length > 0 };
  }

  function detailCard(title, french, allowSave) {
    const body = element('article', '', 'coming-soon-detail-card');
    body.lang = french ? 'fr-CA' : 'en-CA';
    const info = element('div', '', 'coming-soon-detail-copy');
    const category = catalogueCategories[title.category];
    info.append(element('p', title.demoGame ? (french ? 'Démo jouable' : 'Playable demo') : (french ? 'À venir' : 'Coming Soon'), 'eyebrow'), element(allowSave ? 'h1' : 'h4', french ? title.titleFr : title.titleEn),
      element('p', [category[Number(french)], title.studio, french ? title.collectionFr : title.collectionEn].filter(Boolean).join(' · ')));
    const description = french ? title.descriptionFr : title.descriptionEn;
    if (description) info.append(element('p', description));
    if (allowSave && title.demoGame) info.append(action(t('openPlayableDemo'), () => startDemo(title.demoGame, title)));
    body.append(cover(title, french, allowSave), info);
    return body;
  }

  function renderDetail() {
    if (!detailSlug) return;
    const target = $('coming-soon-detail-content');
    const back = catalogueParams();
    back.set('lang', isFrench() ? 'fr' : 'en');
    $('preview-back-to-results').href = appPath('/') + '?' + back + '#games';
    if (!detailLoaded) return;
    if (!preview) {
      target.replaceChildren(element('h1', t(previewError || 'comingSoonMissing')));
      if (alternative) target.append(element('h2', t('catalogueOtherPreview')), linkTo(alternative, titleName(alternative), 'button ghost'));
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
      preview = alternative = previewError = undefined;
      detailLoaded = false;
      try {
        const title = await api('coming-soon/' + detailSlug + suffix, undefined, 'GET');
        if (request === lobbyRequest) preview = title;
      } catch (error) {
        if (request !== lobbyRequest) return;
        previewError = error.message;
        if (previewError === 'comingSoonMissing') {
          const result = await api('coming-soon' + suffix, undefined, 'GET');
          if (request === lobbyRequest) alternative = result.titles.find((title) => title.slug !== detailSlug);
        }
      } finally { if (request === lobbyRequest) detailLoaded = true; }
    } else {
      lobby = { titles: [], featured: [], discover: [] };
      const result = await api('coming-soon' + suffix, undefined, 'GET');
      if (request === lobbyRequest) lobby = result;
    }
  }

  const editLanguage = $('catalogue-edit-language');
  function showTranslation() {
    for (const group of form.querySelectorAll('[data-card-locale]')) group.hidden = group.dataset.cardLocale !== editLanguage.value;
  }
  function selectDraft(title) {
    const language = editLanguage.value;
    selected = title;
    artwork = title?.artwork || '';
    form.reset();
    editLanguage.value = language;
    for (const name of fields) if (title) form.elements[name].value = title[name] ?? '';
    updateDemoOptions(title?.demoGame || '');
    form.elements.cardMarket.value = title?.displayMarket || '';
    form.elements.locales.value = title?.locales.length === 1 ? title.locales[0] : 'both';
    dirty = conflict = false;
    showTranslation();
  }
  function editorActions() {
    if (form.hidden) return;
    $('coming-soon-edit-title').textContent = selected ? titleName(selected) : t('comingSoonNew');
    $('catalogue-record-state').textContent = [
      selected && revisionText(selected), selected && t('comingSoonRevision') + ' ' + selected.version, dirty && t('catalogueModified')
    ].filter(Boolean).join(' · ');
    const busy = saving || opening || readingArtwork;
    $('catalogue-edit-fields').disabled = busy;
    $('coming-soon-close-editor').disabled = busy;
    $('coming-soon-remove-art').hidden = !artwork && !form.elements.artworkFile.files.length;
    form.querySelector('[type="submit"]').disabled = busy || conflict || (Boolean(selected) && !dirty);
    const publish = $('catalogue-publish'), archive = $('catalogue-archive'), reload = $('catalogue-reload');
    publish.hidden = !canPublish || !selected || (selected.state === 'published' && selected.version === selected.publishedVersion);
    archive.hidden = !canPublish || selected?.state !== 'published';
    publish.disabled = archive.disabled = busy || dirty || conflict;
    reload.hidden = !conflict || !selected;
    reload.disabled = busy;
    const previewAction = $('catalogue-preview-action'), publicAction = $('catalogue-public-action');
    previewAction.hidden = !selected || dirty;
    publicAction.hidden = dirty || selected?.state !== 'published';
    if (selected) {
      previewAction.href = selected.previewUrl;
      publicAction.href = publicUrl(selected);
    }
  }
  async function openEditor(title) {
    if (saving || opening || readingArtwork) return;
    const request = ++editorRequest;
    opening = true;
    adminStatus.textContent = t('loading');
    renderAdmin();
    try {
      const result = title ? await api('admin/coming-soon/preview/' + encodeURIComponent(title.slug), undefined, 'GET') : null;
      if (request !== editorRequest) return;
      selectDraft(result);
      editLanguage.value = isFrench() ? 'fr-CA' : 'en-CA';
      showTranslation();
      $('catalogue-classification').open = $('catalogue-cover').open = false;
      form.hidden = false;
      adminStatus.textContent = '';
      $('coming-soon-edit-title').focus();
    } catch (error) {
      if (request === editorRequest) adminStatus.textContent = t(error.message);
    } finally {
      if (request === editorRequest) { opening = false; renderAdmin(); }
    }
  }
  function closeEditor() {
    if (saving || opening || readingArtwork || (dirty && !window.confirm(t('catalogueConfirmClose')))) return;
    const slug = selected?.slug;
    ++editorRequest;
    selected = null;
    dirty = conflict = false;
    form.hidden = true;
    const url = new URL(location.href);
    if (url.searchParams.has('editCard')) {
      url.searchParams.delete('editCard');
      window.history.replaceState(window.history.state, '', url);
    }
    adminStatus.textContent = '';
    renderAdmin();
    (Array.from(list.querySelectorAll('button')).find((button) => button.dataset.slug === slug) || search).focus();
    if (refreshOnClose) void loadDrafts();
  }
  function renderAdmin() {
    updateDemoOptions();
    if (canEdit.includes(staffRole)) {
      const browsing = form.hidden && !draftSlug;
      newButton.hidden = !browsing;
      newButton.disabled = opening;
      newButton.setAttribute('aria-expanded', String(!form.hidden));
      $('catalogue-browser').hidden = !browsing;
      $('catalogue-draft-preview').hidden = !draftSlug;
      editorActions();
      if (draftPreview) {
        const french = $('draft-preview-language').value === 'fr-CA';
        $('draft-preview-content').replaceChildren(detailCard(draftPreview, french, false));
        $('draft-preview-revision').textContent = [t('comingSoonRevision') + ' ' + draftPreview.version, draftPreview.displayMarket,
          draftPreview.locales.join(' / ')].filter(Boolean).join(' · ');
      }
      if (browsing && library) {
        const { items, page, pageSize, total } = library;
        list.replaceChildren(...items.map((title) => {
          const row = element('li', '', 'coming-soon-admin-row');
          const button = action('', () => { void openEditor(title); }, 'catalogue-title-button');
          button.dataset.slug = title.slug;
          button.disabled = opening;
          const name = element('span');
          name.append(element('strong', titleName(title)), element('small', [t(title.category), title.studio, collectionName(title)].filter(Boolean).join(' · ')));
          button.append(name, element('span', revisionText(title), 'catalogue-state'));
          row.append(button);
          return row;
        }));
        const empty = $('coming-soon-admin-empty');
        empty.hidden = Boolean(total);
        const filtered = Boolean(search.value.trim() || $('catalogue-state-filter').value || $('catalogue-category-filter').value);
        empty.textContent = t(filtered ? 'comingSoonNoMatches' : 'comingSoonNoDrafts');
        $('catalogue-range').textContent = total ? t('catalogueRange').replace('{start}', (page - 1) * pageSize + 1)
          .replace('{end}', Math.min(page * pageSize, total)).replace('{total}', total) : '';
        $('catalogue-pages').hidden = total <= pageSize;
        $('catalogue-previous').disabled = page <= 1;
        $('catalogue-next').disabled = page * pageSize >= total;
      }
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
  let linkedCard = new URLSearchParams(location.search).get('editCard');
  let draftPreview;
  $('draft-preview-language').addEventListener('change', renderAdmin);

  async function loadDrafts(showLoading = true, page = library?.page || 1) {
    if (!canEdit.includes(staffRole)) return;
    const request = ++listRequest;
    const showListStatus = () => showLoading && form.hidden && !opening && !saving;
    if (showListStatus()) adminStatus.textContent = t('loading');
    try {
      if (draftSlug) {
        const result = await api('admin/coming-soon/preview/' + encodeURIComponent(draftSlug), undefined, 'GET');
        if (request !== listRequest) return;
        draftPreview = result;
        const lang = isFrench() ? 'fr-CA' : 'en-CA';
        $('draft-preview-language').value = result.locales.includes(lang) ? lang : result.locales[0];
      } else {
        const params = new URLSearchParams({ page, q: search.value.trim(), state: $('catalogue-state-filter').value, category: $('catalogue-category-filter').value });
        const result = await api('admin/coming-soon/index?' + params, undefined, 'GET');
        if (request !== listRequest) return;
        library = result;
      }
      refreshOnClose = false;
      if (showListStatus()) adminStatus.textContent = '';
      renderAdmin();
      if (!draftSlug && linkedCard && !opening && form.hidden) {
        const slug = linkedCard;
        linkedCard = null;
        if (/^[a-z0-9-]{1,64}$/.test(slug)) await openEditor({ slug });
      }
      return true;
    } catch (error) {
      if (request === listRequest) {
        refreshOnClose = true;
        if (showListStatus()) adminStatus.textContent = t(error.message);
      }
      return false;
    }
  }

  async function change(verb, title, draft = {}) {
    if (saving || opening || (conflict && selected) || (verb !== 'save' && (!canPublish || dirty || !title))) return;
    if (verb === 'archive' && !window.confirm(t('catalogueConfirmArchive'))) return;
    saving = true;
    editorActions();
    adminStatus.textContent = t('loading');
    try {
      const result = await api('admin/coming-soon', { action: verb, slug: title?.slug, version: title?.version ?? 0, ...draft });
      selectDraft(result.title);
      await loadDrafts(false);
      const message = t({ save: 'comingSoonSaved', publish: 'comingSoonPublishedMessage', archive: 'comingSoonArchivedMessage' }[verb]);
      adminStatus.textContent = result.auditId ? message + ' ' + t('comingSoonAuditRef').replace('{id}', result.auditId) : message;
    } catch (error) {
      adminStatus.textContent = t(error.message);
      if (error.requestId) adminStatus.append(' · ' + t('supportReference') + ' ' + error.requestId);
      if (error.message === 'comingSoonConflict') {
        conflict = Boolean(selected);
        void loadDrafts(false);
      }
    } finally {
      saving = false;
      renderAdmin();
    }
  }

  function updateDemoOptions(value = form.elements.demoGame.value) {
    const select = form.elements.demoGame;
    const options = games.filter(game => game.type === form.elements.category.value);
    select.replaceChildren(new Option(t('noDemoGame'), ''), ...options.map(game => new Option(game.name[Number(isFrench())], game.id)));
    select.value = options.some(game => game.id === value) ? value : '';
  }
  form.elements.category.addEventListener('change', () => updateDemoOptions());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving || opening || readingArtwork || conflict) return;
    const file = form.elements.artworkFile.files[0];
    const data = Object.fromEntries(fields.map((name) => [name, form.elements[name].value]));
    data.demoGame = form.elements.demoGame.value;
    data.displayMarket = form.elements.cardMarket.value.trim().toUpperCase();
    data.locales = form.elements.locales.value === 'both' ? ['en-CA', 'fr-CA'] : [form.elements.locales.value];
    data.featuredRank = Number(data.featuredRank);
    readingArtwork = true;
    editorActions();
    try {
      if (file?.size > 48 * 1024) throw new Error('invalid');
      data.artwork = file ? await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('invalid'));
        reader.readAsDataURL(file);
      }) : artwork;
      readingArtwork = false;
      await change('save', selected, data);
    } catch (error) {
      adminStatus.textContent = t(error.message);
    } finally {
      readingArtwork = false;
      editorActions();
    }
  });
  newButton.addEventListener('click', () => { void openEditor(null); });
  $('coming-soon-close-editor').addEventListener('click', closeEditor);
  $('catalogue-publish').addEventListener('click', () => { void change('publish', selected); });
  $('catalogue-archive').addEventListener('click', () => { void change('archive', selected); });
  $('catalogue-reload').addEventListener('click', () => { if (!dirty || window.confirm(t('catalogueConfirmClose'))) void openEditor(selected); });
  editLanguage.addEventListener('change', showTranslation);
  form.addEventListener('input', (event) => {
    if (event.target !== editLanguage) { dirty = true; editorActions(); }
  });
  form.addEventListener('invalid', (event) => {
    const group = event.target.closest('[data-card-locale]');
    if (group && group.hidden && form.querySelector(':invalid:not(fieldset)') === event.target) {
      editLanguage.value = group.dataset.cardLocale; showTranslation();
    }
    const details = event.target.closest('details');
    if (details) details.open = true;
  }, true);
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    ++listRequest;
    searchTimer = setTimeout(() => { void loadDrafts(true, 1); }, 160);
  });
  for (const id of ['catalogue-state-filter', 'catalogue-category-filter']) $(id).addEventListener('change', () => {
    clearTimeout(searchTimer); void loadDrafts(true, 1);
  });
  $('catalogue-previous').addEventListener('click', () => { void loadDrafts(true, library.page - 1); });
  $('catalogue-next').addEventListener('click', () => { void loadDrafts(true, library.page + 1); });
  $('coming-soon-remove-art').addEventListener('click', () => {
    artwork = '';
    form.elements.artworkFile.value = '';
    dirty = true;
    editorActions();
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
