export const websiteContentCopy = {
  siteContentTab: ['Banner and help pages', 'Bannière et pages d’aide'],
  siteBanner: ['Lobby banner', 'Bannière du hall'],
  siteHelpPage: ['Help page', 'Page d’aide'],
  siteNewPage: ['New help page', 'Nouvelle page d’aide'],
  siteSearch: ['Search content', 'Rechercher un contenu'],
  siteBackList: ['Back to content', 'Retour aux contenus'],
  siteEditor: ['Content editor', 'Éditeur de contenu'],
  siteEditLanguage: ['Translation to edit', 'Traduction à modifier'],
  siteSlug: ['Page address', 'Adresse de la page'],
  siteTitle: ['Title', 'Titre'],
  siteBody: ['Text', 'Texte'],
  siteImageAndLink: ['Image and link', 'Image et lien'],
  siteRemoveImage: ['Remove image', 'Retirer l’image'],
  siteImageDescription: ['Image description', 'Description de l’image'],
  siteDestination: ['Link destination', 'Destination du lien'],
  siteLinkLabel: ['Link text (optional)', 'Texte du lien (facultatif)'],
  siteNoLink: ['No link', 'Aucun lien'],
  siteCatalogueLink: ['Game catalogue', 'Catalogue de jeux'],
  siteUnavailableTarget: ['Unavailable destination', 'Destination indisponible'],
  sitePreview: ['Preview draft', 'Aperçu du brouillon'],
  sitePreviewEmpty: ['Add a title to preview this translation.', 'Ajoutez un titre pour voir cette traduction.'],
  sitePublish: ['Publish this content', 'Publier ce contenu'],
  siteArchive: ['Unpublish', 'Retirer du site'],
  siteReload: ['Reload saved version', 'Recharger la version enregistrée'],
  siteHistory: ['Recent publications and removals', 'Publications et retraits récents'],
  siteEmpty: ['No matching content.', 'Aucun contenu correspondant.'],
  siteNotCreated: ['Not configured', 'À configurer'],
  siteDraft: ['Draft', 'Brouillon'],
  siteChanged: ['Unpublished changes', 'Modifications à publier'],
  sitePublished: ['Published', 'Publié'],
  siteArchived: ['Unpublished', 'Retiré du site'],
  siteLiveRevision: ['Live revision', 'Révision en ligne'],
  siteDraftRevision: ['Draft revision', 'Révision du brouillon'],
  siteSavedMessage: ['Draft saved.', 'Brouillon enregistré.'],
  sitePublishedMessage: ['Content published.', 'Contenu publié.'],
  siteArchivedMessage: ['Content unpublished.', 'Contenu retiré du site.'],
  siteDiscard: ['Discard your unsaved changes?', 'Abandonner les modifications non enregistrées ?'],
  siteArchiveConfirm: ['Unpublish this content from the site?', 'Retirer ce contenu du site public ?'],
  siteContentConflict: [
    'Another version already exists. Reload it before editing.',
    'Une autre version existe. Rechargez-la avant de modifier le contenu.'
  ],
  siteContentTranslationNeeded: [
    'Complete the title, text and any image description in every enabled site language.',
    'Complétez le titre, le texte et la description de toute image dans chaque langue activée du site.'
  ],
  siteContentTitleNeeded: ['Enter a title in at least one language.', 'Saisissez un titre dans au moins une langue.'],
  siteContentRefreshNeeded: [
    'The change was saved. Reload to see the latest version.',
    'La modification a été enregistrée. Rechargez pour voir la dernière version.'
  ],
  siteContentTargetMissing: ['Choose another published destination.', 'Choisissez une autre destination publiée.'],
  siteContentSlugNeeded: [
    'Use letters a–z, numbers and hyphens for the page address.',
    'Utilisez les lettres a à z, des chiffres et des traits d’union pour l’adresse.'
  ],
  siteContentNotLive: ['This content is already offline.', 'Ce contenu est déjà hors ligne.'],
  siteContentMissing: ['This help page is unavailable.', 'Cette page d’aide est indisponible.'],
  siteBackHelp: ['Back to the lobby', 'Retour au hall'],
  siteUnsaved: ['Unsaved changes', 'Modifications non enregistrées'],
  siteBrowse: ['Browse the catalogue', 'Voir le catalogue'],
  siteRead: ['Read the guide', 'Lire le guide'],
  siteView: ['View preview', 'Voir la fiche'],
  website_content_saved: ['Website content draft saved', 'Brouillon de contenu enregistré'],
  website_content_published: ['Website content published', 'Contenu du site publié'],
  website_content_archived: ['Website content unpublished', 'Contenu retiré du site']
};

const el = (id) => document.getElementById(id);
const suffix = (lang) => (lang === 'fr-CA' ? 'Fr' : 'En');
const stateKeys = { draft: 'siteDraft', published: 'sitePublished', changed: 'siteChanged', archived: 'siteArchived' };
const slugify = (title) =>
  title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 64)
    .replace(/^-|-$/g, '');

function contentCard(element, data, preview = false) {
  const article = element('article', '', 'site-content-card');
  article.lang = data.locale;
  const text = element('div');
  text.append(element(preview ? 'h4' : 'h1', data.title), element('p', data.body));
  if (data.link) {
    const link = element(preview ? 'span' : 'a', data.link.label, 'button');
    if (!preview) link.href = data.link.href;
    text.append(link);
  }
  article.append(text);
  if (data.artwork) {
    const image = element('img');
    image.src = data.artwork;
    image.alt = data.alt;
    article.append(image);
  }
  return article;
}

export function createPublicWebsiteContent({ api, element, t, currentRoute, locale, brand }) {
  const helpSlug = currentRoute.match(/^\/help\/([a-z0-9-]{1,64})$/)?.[1];
  let generation = 0,
    pageTitle = '';
  async function load() {
    if (currentRoute !== '/' && !helpSlug) return;
    const request = ++generation;
    const lang = locale(),
      query = '?locale=' + lang;
    try {
      const data = await api((helpSlug ? 'help/' + helpSlug : 'website-content') + query, undefined, 'GET');
      if (request !== generation) return;
      if (helpSlug) {
        pageTitle = data.title;
        document.title = pageTitle + ' · ' + brand();
        el('site-help-content').replaceChildren(contentCard(element, data));
      } else {
        el('default-lobby-hero').hidden = Boolean(data.banner);
        const banner = el('site-public-banner');
        banner.hidden = !data.banner;
        banner.replaceChildren(...(data.banner ? [contentCard(element, data.banner)] : []));
        const list = el('site-help-links');
        list.hidden = data.help.length === 0;
        list.replaceChildren(
          ...data.help.map((page) => {
            const item = element('li'),
              link = element('a', page.title);
            link.href = page.url;
            item.append(link);
            return item;
          })
        );
      }
    } catch (error) {
      if (request !== generation) return;
      if (helpSlug) {
        pageTitle = t(error.message);
        document.title = pageTitle + ' · ' + brand();
        el('site-help-content').replaceChildren(element('h1', pageTitle));
      } else {
        el('default-lobby-hero').hidden = false;
        el('site-public-banner').hidden = el('site-help-links').hidden = true;
      }
    }
  }
  return { load, isHelp: Boolean(helpSlug), title: () => pageTitle };
}

export function createWebsiteEditor({ api, element, action, t, appPath, locale, canPublish }) {
  const form = el('site-editor'),
    field = (name) => form.elements.namedItem(name);
  const library = el('site-library'),
    langSelect = el('site-edit-language'),
    itemList = el('site-content-items');
  let index,
    record,
    data,
    original,
    page = 0,
    busy = false,
    conflict = false,
    upload = 0,
    readingImage = false,
    listRequest = 0,
    editRequest = 0;
  const pageSize = 8;
  let linkedContent = new URLSearchParams(location.search).get('editContent');
  const say = (key) => {
    el('site-status').textContent = key ? t(key) : '';
  };
  function empty() {
    return {
      titleEn: '',
      bodyEn: '',
      altEn: '',
      linkEn: '',
      titleFr: '',
      bodyFr: '',
      altFr: '',
      linkFr: '',
      artwork: '',
      target: ''
    };
  }
  const isDirty = () =>
    Boolean(record && (readingImage || JSON.stringify(data) !== original || (!record.version && field('slug').value)));
  const suggestedSlug = () => slugify(data.titleEn || data.titleFr || '');
  function address() {
    const slug = field('slug').value.trim() || suggestedSlug();
    field('slug').placeholder = suggestedSlug();
    el('site-url').textContent = appPath('/help/') + slug;
    return record.kind === 'banner' ? 'lobby' : slug;
  }
  function libraryView() {
    el('site-new-page').disabled = !index || busy;
    if (!index) return;
    const query = el('site-search').value.trim().toLocaleLowerCase();
    const entries = [
      index.items.find((i) => i.kind === 'banner') || { kind: 'banner', slug: 'lobby', titleEn: '', titleFr: '' },
      ...index.items.filter((i) => i.kind === 'help')
    ];
    const rows = entries.filter((i) =>
      [i.slug, i.titleEn, i.titleFr, t(i.kind === 'banner' ? 'siteBanner' : 'siteHelpPage')]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query)
    );
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, pages - 1);
    itemList.replaceChildren(
      ...rows.slice(page * pageSize, (page + 1) * pageSize).map((item) => {
        const li = element('li');
        const title = item['title' + suffix(locale())] || item.titleEn || item.titleFr;
        const name = item.kind === 'banner' ? t('siteBanner') + (title ? ' · ' + title : '') : title;
        const button = action(
          name,
          () => {
            void open(item);
          },
          'ghost'
        );
        button.disabled = busy;
        li.append(
          button,
          element(
            'small',
            [item.kind === 'help' ? appPath('/help/' + item.slug) : '', t(stateKeys[item.status] || 'siteNotCreated')]
              .filter(Boolean)
              .join(' · ')
          )
        );
        return li;
      })
    );
    if (!rows.length) itemList.append(element('li', t('siteEmpty')));
    el('site-pagination').hidden = pages === 1;
    el('site-page').textContent = page + 1 + ' / ' + pages;
    el('site-prev').disabled = !page;
    el('site-next').disabled = page + 1 >= pages;
  }
  async function load() {
    const id = ++listRequest;
    try {
      const result = await api('admin/website-content', undefined, 'GET');
      if (id !== listRequest) return;
      index = result;
      libraryView();
      if (record) {
        destinations();
        controls();
      } else if (!busy && linkedContent) {
        const match = /^(banner|help)\/([a-z0-9-]{1,64})$/.exec(linkedContent);
        linkedContent = null;
        if (match) await open({ kind: match[1], slug: match[2] }, { existing: true });
      }
    } catch (error) {
      if (id === listRequest) say(error.message);
    }
  }
  function destinations() {
    const target = field('target');
    const opts = [new Option(t('siteNoLink'), ''), new Option(t('siteCatalogueLink'), 'catalogue')];
    const self = record.kind + '/' + record.slug;
    for (const item of index?.targets || []) {
      if (item.key === self) continue;
      const label =
        (item.key.startsWith('title/') ? t('adminNavCatalogue') : t('siteHelpPage')) +
        ' · ' +
        (item['title' + suffix(langSelect.value)] || item.titleEn || item.titleFr);
      opts.push(new Option(label, item.key));
    }
    if (!opts.some((opt) => opt.value === data.target))
      opts.push(new Option(t('siteUnavailableTarget') + ' · ' + data.target, data.target));
    target.replaceChildren(...opts);
    target.value = data.target;
  }
  function preview() {
    if (!record || !el('site-preview').open) return;
    const lang = langSelect.value,
      s = suffix(lang);
    const available =
      data.target === 'catalogue' ||
      index?.targets.some(
        (item) =>
          item.key === data.target && item.key !== record.kind + '/' + record.slug && item.locales.includes(lang)
      );
    const linkTypes = { catalogue: 'siteBrowse', help: 'siteRead', title: 'siteView' };
    const linkType = available ? linkTypes[data.target.split('/')[0]] : 'siteBrowse';
    const label = (available && data['link' + s]) || websiteContentCopy[linkType][Number(lang === 'fr-CA')];
    const value = {
      locale: lang,
      title: data['title' + s],
      body: data['body' + s],
      alt: data['alt' + s],
      artwork: data.artwork,
      link: data.target ? { label } : null
    };
    el('site-preview-body').replaceChildren(
      value.title ? contentCard(element, value, true) : element('p', t('sitePreviewEmpty'))
    );
  }
  function controls() {
    if (!record) return;
    const dirty = isDirty(),
      saved = Boolean(record.version);
    el('site-fields').disabled = busy;
    el('site-close').disabled = busy;
    el('site-save').disabled = busy || readingImage || (saved && (conflict || !dirty));
    el('site-publish').hidden = !canPublish();
    el('site-publish').disabled = busy || readingImage || dirty || !saved || record.status === 'published' || conflict;
    el('site-archive').hidden = !canPublish() || !record.liveRevision;
    el('site-archive').disabled = busy || dirty || conflict;
    el('site-reload').hidden = !conflict;
    el('site-reload').disabled = busy;
    el('site-draft-only').hidden = canPublish();
    el('site-alt-field').hidden = el('site-remove-image').hidden = !data.artwork;
    el('site-link-field').hidden = !data.target;
    el('site-revision').textContent = [
      record.status && t(stateKeys[record.status]),
      record.draftRevision && t('siteDraftRevision') + ' ' + record.draftRevision,
      record.liveRevision && t('siteLiveRevision') + ' ' + record.liveRevision,
      dirty && t('siteUnsaved')
    ]
      .filter(Boolean)
      .join(' · ');
    address();
    preview();
  }
  function translation() {
    const s = suffix(langSelect.value);
    field('heading').value = data['title' + s];
    field('body').value = data['body' + s];
    field('alt').value = data['alt' + s];
    field('link').value = data['link' + s];
    for (const key of ['heading', 'body', 'alt', 'link']) field(key).lang = langSelect.value;
    destinations();
    controls();
  }
  function history() {
    const rows = record.history || [];
    el('site-history').hidden = !rows.length;
    const fmt = new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' });
    el('site-history-list').replaceChildren(
      ...rows.map((r) =>
        element(
          'li',
          [t(r.action), r.actor, fmt.format(r.at), t('comingSoonRevision') + ' ' + r.revision, '#' + r.id].join(' · ')
        )
      )
    );
  }
  function display(result) {
    record = result;
    data = { ...(result.content || empty()) };
    original = JSON.stringify(data);
    conflict = false;
    readingImage = false;
    ++upload;
    form.hidden = false;
    library.hidden = true;
    field('image').value = '';
    field('slug').value = result.kind === 'help' ? result.slug || '' : '';
    field('slug').readOnly = Boolean(result.version);
    field('body').maxLength = result.kind === 'banner' ? 500 : 6000;
    el('site-slug-field').hidden = result.kind === 'banner';
    el('site-editor-heading').textContent = t(result.kind === 'banner' ? 'siteBanner' : 'siteHelpPage');
    translation();
    history();
  }
  async function open(item, { existing = Boolean(item.version), refresh = false } = {}) {
    if (busy) return;
    const id = ++editRequest;
    busy = true;
    say('loading');
    libraryView();
    try {
      const result = existing || refresh
        ? await api('admin/website-content/' + item.kind + '/' + item.slug, undefined, 'GET')
        : { kind: item.kind, slug: item.slug || '', version: 0 };
      if (id !== editRequest) return;
      if (!refresh) {
        langSelect.value = locale();
        el('site-preview').open = el('site-options').open = el('site-history').open = false;
      }
      display(result);
      say('');
      el('site-editor-heading').focus();
    } catch (error) {
      if (id === editRequest) say(error.message);
    } finally {
      if (id === editRequest) {
        busy = false;
        controls();
        libraryView();
      }
    }
  }
  function close() {
    if (busy || (isDirty() && !window.confirm(t('siteDiscard')))) return;
    ++editRequest;
    ++upload;
    record = null;
    readingImage = false;
    form.hidden = true;
    library.hidden = false;
    const url = new URL(location.href);
    if (url.searchParams.has('editContent')) {
      url.searchParams.delete('editContent');
      window.history.replaceState(window.history.state, '', url);
    }
    say('');
    libraryView();
    el('site-search').focus();
  }
  async function change(verb) {
    if (!record || busy || readingImage || (conflict && record.version)) return;
    const slug = address();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) {
      say('siteContentSlugNeeded');
      field('slug').focus();
      return;
    }
    if (verb === 'publish') {
      if (isDirty() || !canPublish()) return;
      for (const lang of index.enabledLocales) {
        const s = suffix(lang);
        const missing = !data['title' + s].trim()
          ? 'heading'
          : !data['body' + s].trim()
            ? 'body'
            : data.artwork && !data['alt' + s].trim()
              ? 'alt'
              : null;
        if (missing) {
          langSelect.value = lang;
          translation();
          if (missing === 'alt') el('site-options').open = true;
          say('siteContentTranslationNeeded');
          field(missing).focus();
          return;
        }
      }
    }
    if (verb === 'archive' && (isDirty() || !canPublish() || !window.confirm(t('siteArchiveConfirm')))) return;
    const id = ++editRequest;
    busy = true;
    controls();
    say('loading');
    let committed = false;
    try {
      const result = await api('admin/website-content', {
        action: verb,
        kind: record.kind,
        slug,
        version: record.version,
        ...(verb === 'save' && { content: data })
      });
      if (id !== editRequest) return;
      committed = true;
      record.slug = result.slug;
      record.version = result.version;
      if (verb === 'save') original = JSON.stringify(data);
      if (record.kind === 'help') {
        field('slug').value = result.slug;
        field('slug').readOnly = true;
      }
      const fresh = await api('admin/website-content/' + record.kind + '/' + result.slug, undefined, 'GET');
      if (id !== editRequest) return;
      display(fresh);
      await load();
      if (id === editRequest)
        el('site-status').textContent =
          t({ save: 'siteSavedMessage', publish: 'sitePublishedMessage', archive: 'siteArchivedMessage' }[verb]) +
          (result.auditId ? ' · #' + result.auditId : '');
    } catch (error) {
      if (id === editRequest) {
        conflict = committed || error.message === 'siteContentConflict';
        say(committed ? 'siteContentRefreshNeeded' : error.message);
        if (error.requestId) el('site-status').append(' · ' + t('supportReference') + ' ' + error.requestId);
      }
    } finally {
      if (id === editRequest) {
        busy = false;
        controls();
        libraryView();
      }
    }
  }
  el('site-new-page').addEventListener('click', () => {
    void open({ kind: 'help' });
  });
  el('site-search').addEventListener('input', () => {
    page = 0;
    libraryView();
  });
  el('site-prev').addEventListener('click', () => {
    page--;
    libraryView();
  });
  el('site-next').addEventListener('click', () => {
    page++;
    libraryView();
  });
  el('site-close').addEventListener('click', close);
  langSelect.addEventListener('change', translation);
  for (const [name, key] of Object.entries({ heading: 'title', body: 'body', alt: 'alt', link: 'link' })) {
    field(name).addEventListener('input', () => {
      data[key + suffix(langSelect.value)] = field(name).value;
      controls();
    });
  }
  field('slug').addEventListener('input', controls);
  field('target').addEventListener('change', () => {
    data.target = field('target').value;
    controls();
  });
  field('image').addEventListener('change', async () => {
    const file = field('image').files[0],
      id = ++upload;
    if (!file) {
      readingImage = false;
      controls();
      return;
    }
    readingImage = true;
    controls();
    try {
      if (file.size > 48 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
        throw Error('invalid');
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error('invalid'));
        reader.readAsDataURL(file);
      });
      if (id === upload) {
        data.artwork = image;
        say('');
      }
    } catch (error) {
      if (id === upload) {
        field('image').value = '';
        say(error.message);
      }
    } finally {
      if (id === upload) {
        readingImage = false;
        controls();
      }
    }
  });
  el('site-remove-image').addEventListener('click', () => {
    ++upload;
    readingImage = false;
    data.artwork = '';
    field('image').value = '';
    controls();
  });
  el('site-preview').addEventListener('toggle', preview);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void change('save');
  });
  el('site-publish').addEventListener('click', () => {
    void change('publish');
  });
  el('site-archive').addEventListener('click', () => {
    void change('archive');
  });
  el('site-reload').addEventListener('click', () => {
    if (!isDirty() || window.confirm(t('siteDiscard'))) void open({ ...record, slug: address() }, { refresh: true });
  });
  return {
    load,
    translate() {
      libraryView();
      if (record) {
        el('site-editor-heading').textContent = t(record.kind === 'banner' ? 'siteBanner' : 'siteHelpPage');
        translation();
        history();
      }
    }
  };
}
