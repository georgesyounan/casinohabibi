import { games } from '../public/catalog.js';
import { eventMarkup } from '../public/lobby-events.js';
import { giftContents } from '../public/gift-menu.js';
import { lobbyCopy, lobbyView, viewTitle } from '../public/lobby-navigation.js';
import { campaignGallery, artPath } from '../public/habibi-campaigns.js';
import { homeCampaignExtras, rotationButton } from '../public/banner-motion.js';
import { sportsMarkup } from '../public/sports-centre.js';
import { comingSoonCopy } from '../public/coming-soon.js';
import { clubMarkup, clubSection } from '../public/player-club.js';
import { discoveryCopy } from '../public/discovery.js';
import { casinoPageTitle, spanishGuide } from '../public/guide-metadata.js';

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => entities[character]);

export function createPublicPages({ websiteContent, comingSoon, appBasePath, providerCount, clubHome, eventBoard, giftPreview }) {
  function guide(tenant, config, address, requested) {
    const locale = requested===spanishGuide || config.enabledLocales.includes(requested) ? requested : config.primaryLocale;
    let page = websiteContent.resolveGuide(tenant, config, address, locale);
    if (!page && !requested) {
      for (const other of [...config.enabledLocales,spanishGuide].filter((lang) => lang !== locale)) {
        page = websiteContent.resolveGuide(tenant, config, address, other);
        if (page) break;
      }
    }
    if (!page) return { status: 404 };
    const destination = page.translations.find((item) => item.locale === page.locale).href;
    const renamed = destination.split('?')[0] !== appBasePath + '/help/' + address;
    if (renamed || requested !== page.locale) return { status: renamed || requested ? 301 : 302, destination };
    return {
      page,
      noindex: !page.indexable,
      meta: {
        title: page.search.title + ' · ' + config.brandName,
        description: page.search.description,
        locale: page.locale,
        translations: page.translations
      }
    };
  }

  function preview(tenant, config, slug, wanted) {
    const audience = {
      market: config.displayMarket || '',
      locales: wanted ? [config.enabledLocales.includes(wanted) ? wanted : config.primaryLocale] : config.enabledLocales
    };
    const title = config.enabledSections?.comingSoon !== false && comingSoon.published(tenant, slug, audience);
    if (!title) return { status: 404 };
    const langs = config.enabledLocales.filter((lang) => title.locales.includes(lang));
    const locale = [wanted, config.primaryLocale].find((lang) => langs.includes(lang)) || langs[0];
    const suffix = locale === 'fr-CA' ? 'Fr' : 'En';
    return {
      meta: {
        preview: title,
        title: title['title' + suffix] + ' · ' + config.brandName,
        description: title['description' + suffix] || title['title' + suffix],
        locale,
        translations: langs.map((lang) => ({
          locale: lang,
          href: appBasePath + '/coming-soon/' + slug + '?lang=' + lang.slice(0, 2) + '&locale=' + lang
        }))
      }
    };
  }

  return function describe(tenant, config, { helpSlug, previewSlug, path, params, preferredLocale, signedIn, visitId }) {
    const lang = params.get('lang');
    const requested = lang === 'fr' ? 'fr-CA' : lang === 'en' ? 'en-CA' : helpSlug && lang === 'es' ? spanishGuide : undefined;
    const studio = config.brandName.trim().toLowerCase() === 'casino habibi';
    if (helpSlug || previewSlug) {
      const result = helpSlug ? guide(tenant, config, helpSlug, requested) : preview(tenant, config, previewSlug, params.get('locale') || requested);
      if (studio && result.meta) result.meta.standalone = { config, appBasePath, signedIn, standalone: true, gifts: giftPreview?.(tenant) };
      return result;
    }
    const preferred = requested || (preferredLocale === 'fr' ? 'fr-CA' : preferredLocale === 'en' ? 'en-CA' : undefined);
    const locale = config.enabledLocales.includes(preferred) ? preferred : config.primaryLocale;
    if (path === '/admin' && studio) return { noindex: true, meta: { staff: { config, appBasePath, locale } } };
    if (path !== '/') return { noindex: true };
    const french = locale === 'fr-CA';
    const suffix = french ? 'Fr' : 'En';
    const view = studio ? lobbyView(params.get('view')) : '';
    const category = params.get('category');
    const filtered = ['slots','table','live','favorites','recent'].includes(category) || Boolean(params.get('q')?.trim() || params.get('collection')?.trim());
    return {
      meta: {
        title: view ? viewTitle(view, french) + ' · ' + config.brandName : casinoPageTitle(config.brandName, french),
        lobby: { brand: config.brandName, headline: config['heroTitle' + suffix], intro: config['heroIntro' + suffix],
          studio, config, view, filtered, category, query: (params.get('q') || '').slice(0, 120), appBasePath, signedIn,
          eventBoard: studio && !view && !filtered && eventBoard ? eventBoard(tenant) : null,
          feedTab: params.get('feed'), gifts: studio ? giftPreview?.(tenant) : null,
          club: studio && ((!view && !filtered) || view==='promotions') && clubHome ? clubHome(tenant,locale) : null,
          clubTab: clubSection(view,params.get('club')),
          edition: studio && !view && !filtered ? { ...comingSoon.homeEdition(tenant,
            { market: config.displayMarket || '', locales: [locale] }, visitId, config.enabledSections?.comingSoon !== false),
            providers: providerCount(tenant) } : null },
        description: config['heroIntro' + suffix] || config['heroTitle' + suffix],
        locale,
        translations: config.enabledLocales.map((lang) => ({
          locale: lang,
          href: appBasePath + '/?lang=' + lang.slice(0, 2) + (view ? '&view=' + view : '')
        }))
      }
    };
  };
}

function alternateTags(translations, origin, tag) {
  return translations
    .map(({ locale, href }) => `<${tag} rel="alternate" hreflang="${escape(locale)}" href="${escape(origin + href)}"/>`)
    .join('\n');
}

// Native disclosure, GET form and links also work during the first page load.
function playerHeaderActions(base, locale, query, gifts, signedIn) {
  const tag = locale.slice(0, 2);
  const label = key => escape(lobbyCopy[key][Number(tag === 'fr')]);
  const home = escape(base + '/');
  const link = home + '?lang=' + tag;
  const icon = paths => '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + '</svg>';
  const magnifier = icon('<circle cx="9.9" cy="9.9" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="m15 15 6 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M6.7 10a3.2 3.2 0 0 1 2.2-3" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>');
  const present = icon('<path fill="currentColor" d="M2.2 7.3h19.6v4.1H2.2zm1.8 5.3h16v8.7a.9.9 0 0 1-.9.9H4.9a.9.9 0 0 1-.9-.9z"/><path fill="#5ceaa6" d="M10.5 7.3h3v14.9h-3zm1.4-.9C7.3 6.5 5 5.5 5.2 3.1 5.5.6 10.3 1.7 12 5c1.7-3.3 6.5-4.4 6.8-1.9.3 2.4-2.1 3.4-6.9 3.3z"/>');
  const bubbles = icon('<path fill="currentColor" d="M2.1 15.8 3 12.6A7 7 0 0 1 2.1 9c0-3.9 3.5-7 7.7-7 3.3 0 6.2 1.8 7.2 4.5-5.5-.9-10.2 3.1-10.2 8.1v.7a8.3 8.3 0 0 1-1.5-.7z"/><path fill="currentColor" d="M22.1 14.6a6.4 6.4 0 0 1-.8 3.2l.9 3.6-3.9-1.1a8.5 8.5 0 0 1-3.2.7c-4 0-7.1-2.9-7.1-6.4s3.1-6.6 7.1-6.6 7 2.9 7 6.6z"/>');
  return `<div class="player-tools">
    <details id="header-finder" name="player-header-popup"><summary class="player-tool" title="${label('searchGames')}" aria-label="${label('searchGames')}">${magnifier}</summary>
      <form id="home-search" class="finder-panel" role="search" method="get" action="${home}#games">
        <label for="game-search" data-copy="searchGames">${label('searchGames')}</label>
        <input type="hidden" name="lang" value="${tag}">
        <div class="finder-field"><input id="game-search" name="q" type="search" maxlength="120" autocomplete="off" enterkeyhint="search" placeholder="${label('headerSearchHint')}" value="${escape(query)}">
        <button type="submit" title="${label('headerSearchSubmit')}" aria-label="${label('headerSearchSubmit')}"><span aria-hidden="true">→</span></button></div>
        <ul id="finder-matches" hidden></ul>
      </form>
    </details>
    <details id="header-rewards" name="player-header-popup"><summary id="header-gifts" class="player-tool" title="${label('headerGifts')}" aria-label="${label('headerGifts')}">${present}</summary>
      <section class="gift-content gift-popup" aria-label="${label('headerGifts')}">${giftContents(gifts,tag==='fr',base,{pending:signedIn})}</section></details>
    <a id="header-support" class="player-tool" href="${link}&amp;support=1" title="${label('headerSupport')}" aria-label="${label('headerSupport')}">${bubbles}<span class="support-count" aria-hidden="true" hidden></span></a>
  </div>`;
}

function studioShell(html, { config, view, category, filtered, appBasePath, signedIn, standalone, staff = false, query = '', edition, club, clubTab, eventBoard, feedTab, gifts }, locale) {
  const french = locale === 'fr-CA';
  const lang = Number(french);
  const tag = locale.slice(0, 2);
  const mark = config.brandLogo ? `<img class="brand-logo" src="${escape(config.brandLogo)}" alt="" aria-hidden="true">` : '<span aria-hidden="true">✧</span>';
  const wordmark = mark + '<strong class="habibi-wordmark"><small>Casino</small> Habibi</strong>';
  const labels = { ...lobbyCopy, discovery: discoveryCopy.discovery, comingSoonBackToCatalogue: comingSoonCopy.comingSoonBackToCatalogue,
    catalogueCollection: comingSoonCopy.catalogueCollection, providerSortRecent: ['Recently added first','Ajouts récents en premier'], providerSortAlpha: ['Alphabetical','Ordre alphabétique'],
    disclaimer: [config.footerTextEn, config.footerTextFr] };
  const accountLabel = signedIn ? (french ? 'Mon compte' : 'My account') : lobbyCopy.signin[lang];
  // Logos are already in the document. Only published, public tenant settings are sent.
  const settings = JSON.stringify({ ...config, brandLogo: Boolean(config.brandLogo), brandFavicon: Boolean(config.brandFavicon) })
    .replaceAll('<', '\\u003c');
  html = html.replace(/<body(?: class="player-home")?>/, () => `<body${standalone ? '' : ' class="player-home"'} data-lobby-brand="habibi"${signedIn ? ' data-member-pending' : ''}>`)
    .replace(/<meta name="theme-color" content="[^"]*">/, '<meta name="theme-color" content="#0b162b">')
    .replace('</head>', () => `<link rel="stylesheet" href="${appBasePath}/sports-discovery.css"><link rel="stylesheet" href="${appBasePath}/habibi-theme.css">\n</head>`)
    .replace('</head>', () => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${appBasePath}/admin-inter.woff2"><link rel="preload" as="font" type="font/woff2" crossorigin href="${appBasePath}/admin-icons.woff2">\n</head>`)
    .replace('</head>', () => '<script type="application/json" id="lobby-settings">' + settings + '</script>\n</head>')
    .replace('<span aria-hidden="true">✧</span> NORTHPLAY</a>', () => wordmark + '</a>')
    .replace('<span aria-hidden="true">✧</span> NORTHPLAY</span>', () => wordmark + '</span>')
    .replace('<a class="brand" ', '<a class="brand" aria-label="Casino Habibi" ')
    .replace('id="lobby" class="shell" tabindex="-1"', () => 'id="lobby" class="shell" tabindex="-1"' + (view ? ' data-hub-open' : '') + (view==='promotions' ? ' data-club-promotions' : '') + (filtered ? ' data-filtered' : ''))
    .replace('id="home-search" role="search"', () => `id="home-search" role="search" data-compact="${lobbyCopy.searchCompact[lang]}"`)
    .replace('id="game-search" type="search"', () => 'id="game-search" type="search" placeholder="' + escape(lobbyCopy.searchGames[lang]) + '"')
    .replace('id="language" class="ghost" type="button"></button>', () => `id="language" class="ghost" type="button"${config.enabledLocales.length < 2 ? ' hidden' : ''}>${french ? 'EN' : 'FR'}</button>`)
    .replace('id="account" type="button" data-copy="signin"></button>', () => 'id="account" type="button" data-copy="signin">' + accountLabel + '</button>');
  if (!staff) {
    html = html.replace(/<!-- player-tools:start -->[\s\S]*?<!-- player-tools:end -->/, () => playerHeaderActions(appBasePath, locale, query, gifts, signedIn));
    if(gifts)html = html.replace('</head>',()=>'<script type="application/json" id="gift-public-state">'+JSON.stringify(gifts).replaceAll('<','\\u003c')+'</script>\n</head>');
  }
  if (config.brandFavicon) {
    const type = config.brandFavicon.split(';')[0].slice(5);
    html = html.replace(/<link id="tenant-favicon"[^>]+>/, () => `<link id="tenant-favicon" rel="icon" href="${escape(config.brandFavicon)}" type="${escape(type)}">`);
  }
  if (!standalone && !signedIn) html = html.replace('data-copy="joinHome" hidden', 'data-copy="joinHome"');
  html = html.replace(/data-copy="(\w+)"([^<>]*)><\//g, (original, key, attributes) =>
    labels[key]?.[lang] != null ? `data-copy="${key}"${attributes}>${escape(labels[key][lang])}</` : original);
  if (standalone) return html;
  const gallery = view === 'promotions' ? campaignGallery(french, appBasePath) : '';
  html = html.replace('<div id="lobby-announcement"', () =>
    '<div id="habibi-promo-gallery"' + (gallery ? ' data-locale="' + tag + '"' : ' hidden') + '>' + gallery + '</div><div id="lobby-announcement"');
  html = html.replace('<!-- gift-catalogue -->',()=>'<section id="gift-catalogue" aria-labelledby="gift-title" tabindex="-1"><h2 id="gift-title">'+(french?'Toutes les récompenses':'All rewards')+'</h2><div class="gift-content">'+
    (view==='promotions'?giftContents(gifts,french,appBasePath,{full:true,pending:signedIn}):'')+'</div></section>');
  const events = eventBoard ? eventMarkup(eventBoard,french,appBasePath,feedTab) : {rail:'',lower:''};
  html = html.replace('<!-- wins-wire -->', () => '<section id="wins-wire" aria-label="'+(french?'Derniers gains':'Latest wins')+'">'+events.rail+'</section>')
    .replace('<!-- lobby-events -->', () => '<section id="lobby-events" tabindex="-1" aria-labelledby="events-title">'+events.lower+'</section>' +
      (eventBoard ? '<script type="application/json" id="lobby-event-model">'+JSON.stringify(eventBoard).replaceAll('<','\\u003c')+'</script>' : ''));
  if (club) html=html.replace('<section id="player-club" aria-label="Club Habibi" hidden></section>',() =>
    '<section id="player-club" aria-label="Club Habibi">'+clubMarkup(club,french,appBasePath,clubTab)+'</section>'+
    '<script type="application/json" id="club-public-model">'+JSON.stringify(club).replaceAll('<','\\u003c')+'</script>');
  html = html.replace('<div class="spotlight-nav" hidden>', () => '<div class="spotlight-nav" hidden>' + rotationButton(french).replace('<button ','<button disabled '));
  html = html.replace(/(<a class="button hero-browse"[^>]*>[\s\S]*?<\/a>)/, (_, browse) =>
    '<div class="hero-entry-actions"><a id="hero-join" class="button" href="' + appBasePath + '/?lang=' + tag + '&amp;access=signup"' + (signedIn ? ' hidden' : '') + '>' +
    (french ? 'Créer un compte' : 'Create an account') + '</a>' + browse + '</div>');
  const campaign = homeCampaignExtras(french,appBasePath).replaceAll('<button type="button"','<button type="button" disabled');
  html = html.replace(/(<section class="hero" id="default-lobby-hero")>([\s\S]*?)<\/section>/, (_,tagName,body) =>
    tagName + ` data-campaign-index="0" data-campaign-locale="${tag}" aria-roledescription="${french?'carrousel':'carousel'}" aria-label="${french?'À la une du casino':'Casino highlights'}">` + body + campaign + '</section>');

  html = html.replace(/data-home-view="(\w+)" href="[^"]*"/g, (_, key) => {
    const current = key === 'home' ? view !== 'sports' : key === view;
    return `data-home-view="${key}" href="${appBasePath}/?lang=${tag}${key === 'home' ? '' : '&amp;view=' + key}"${current ? ' aria-current="page"' : ''}`;
  }).replace(/data-filter="(\w+)" aria-pressed="(?:true|false)"/g, (_, key) =>
    `data-filter="${key}" aria-pressed="${!view && key === (filtered ? category || 'all' : 'all')}"`);
  if (view) {
    const body = view === 'sports' ? sportsMarkup(french).replaceAll('<button type="button"', '<button type="button" disabled').replaceAll('<select ', '<select disabled ') : view==='promotions' && club ? '' : `<p role="status" class="hub-note">${french ? 'Chargement…' : 'Loading…'}</p>`;
    if (view === 'sports') html = html.replace('</head>', () => `<link rel="preload" as="image" href="${appBasePath}/campaign-match.webp"><link rel="preload" as="image" href="${appBasePath}/sports-nav.png">\n</head>`);
    return html.replace('aria-labelledby="hub-title" hidden></section>', () =>
      `aria-labelledby="hub-title" aria-busy="true"><h1 id="hub-title" tabindex="-1">${escape(viewTitle(view, french))}</h1>${body}</section>`);
  }
  if (filtered) return html.replace('class="home-showcase" id="home-showcase"', 'class="home-showcase" id="home-showcase" hidden');
  if (edition) html = initialEdition(html, edition, appBasePath, locale);
  const featured = config.featuredGameIds || [];
  const covers = [...games].sort((a,b) => Number(featured.includes(b.id)) - Number(featured.includes(a.id))).map(game => {
    const badge = featured.includes(game.id) ? `<small class="featured-label">${escape(lobbyCopy.featuredBadge[lang])}</small>` : '';
    return `<article class="card demo-card"><div class="home-game-launch"><span class="art demo-cover"><img width="464" height="300" alt="" src="${appBasePath}/game-${game.id}.webp">${badge}<span class="favorite-toggle" aria-hidden="true">☆</span></span><span class="card-info"><strong>${escape(game.name[lang])}</strong><small>${escape(lobbyCopy[game.type][lang])}</small><span class="home-play-label">${escape(lobbyCopy.playNow[lang])}</span></span></div></article>`;
  }).join('');
  return html.replace('aria-labelledby="home-originals-title" hidden', 'aria-labelledby="home-originals-title"')
    .replace(/(id="home-originals-title"[^>]*>[^<]*<\/h3><div class="cards">)<\/div>/, (_, start) => start + covers + '</div>')
    .replace('</head>', () => `<link rel="preload" as="image" href="${artPath(appBasePath, 1, french)}">\n</head>`);
}

function staffShell(html, {config, appBasePath, locale}) {
  const fr=locale==='fr-CA';
  const labels = { staffLogin:fr?'Connexion du personnel':'Staff sign in', staffLoginHelp:fr?'Connectez-vous avec votre compte du personnel.':'Sign in with your staff account.',
    staffLoginIdentifier:fr?'Nom d’utilisateur ou courriel':'Username or email', staffPassword:fr?'Mot de passe':'Password', mfaCode:fr?'Code de l’authentificateur':'Authenticator code', mfaLoginHint:fr?'Laissez ce champ vide si la vérification en deux étapes n’est pas déjà activée pour ce compte.':'Leave blank unless two-step verification is already enabled for this account.',
    staffSignIn:fr?'Se connecter':'Sign in', showPassword:fr?'Afficher le mot de passe':'Show password' };
  return studioShell(html,{config,appBasePath,standalone:true,staff:true},locale)
    .replace('<body data-lobby-brand="habibi"', '<body class="admin-route" data-lobby-brand="habibi"')
    .replace('<html lang="en-CA"',()=>`<html lang="${escape(locale)}"`)
    .replace(/<title>[^<]*<\/title>/,()=>`<title>Administration · ${escape(config.brandName)}</title>`)
    .replace('id="lobby" class="shell" tabindex="-1"','id="lobby" class="shell" tabindex="-1" hidden')
    .replace('id="admin" class="shell admin" tabindex="-1" hidden','id="admin" class="shell admin" tabindex="-1"')
    .replace(/data-copy="(\w+)"([^<>]*)><\//g,(full,key,attrs)=>labels[key] ? `data-copy="${key}"${attrs}>${escape(labels[key])}</` : full);
}

function initialEdition(html, edition, base, locale) {
  const fr = locale === 'fr-CA', lang = Number(fr), suffix = fr ? 'Fr' : 'En';
  const {title, providers, collections} = edition;
  const catalogueLabels = [...collections].map(([key, name]) => `<option value="${escape(key)}">${escape(name)}</option>`).join('');
  const playable = games.length + edition.playable;
  const previews = edition.count - edition.playable + providers;
  const labels = [];
  if (playable) labels.push(playable + ' ' + (fr ? (playable === 1 ? 'démo jouable' : 'démos jouables') : (playable === 1 ? 'playable demo' : 'playable demos')));
  if (previews) labels.push(previews + ' ' + (fr ? (previews === 1 ? 'aperçu' : 'aperçus') : (previews === 1 ? 'preview' : 'previews')));
  html = html.replace('id="catalog-summary" class="catalog-summary" role="status" aria-live="polite" hidden></p>',
    () => `id="catalog-summary" class="catalog-summary" role="status" aria-live="polite" data-locale="${locale}" data-providers="${providers}" data-count="${edition.count}" data-playable="${edition.playable}">${escape(labels.join(' · '))}</p>`);
  if (collections.length || providers) html = html.replace('class="home-options" hidden', 'class="home-options"').replace('class="catalog-controls" hidden', 'class="catalog-controls"');
  if (collections.length) html = html.replace('id="catalog-collection-control" class="provider-sort" hidden', 'id="catalog-collection-control" class="provider-sort"')
    .replace('<select id="catalog-collection"></select>', () => `<select id="catalog-collection"><option value="">${comingSoonCopy.catalogueAllCollections[lang]}</option>${catalogueLabels}</select>`);
  if (providers) html = html.replace('id="provider-sort-control" class="provider-sort" hidden', 'id="provider-sort-control" class="provider-sort"');
  if (!title) return html;
  const caption = [title['collection' + suffix] || title.collectionEn || title.collectionFr, (title.demoGame ? comingSoonCopy.playableDemo : comingSoonCopy.comingSoon)[lang]].filter(Boolean).join(' · ');
  html = html.replace('aria-labelledby="spotlight-label" hidden', () => `aria-labelledby="spotlight-label" data-initial-slug="${escape(title.slug)}"`)
    .replace('<a id="spotlight-link">', () => `<a id="spotlight-link" href="${base}/coming-soon/${escape(title.slug)}?lang=${locale.slice(0,2)}&amp;locale=${locale}">`)
    .replace('<strong id="spotlight-name"></strong>', () => `<strong id="spotlight-name">${escape(title['title' + suffix])}</strong>`)
    .replace('<span id="spotlight-type"></span>', () => `<span id="spotlight-type">${escape(caption)}</span>`);
  if (title.artwork) html = html.replace('id="spotlight-image" alt="" hidden', () => `id="spotlight-image" fetchpriority="high" alt="${escape(title['alt' + suffix] || '')}" src="${escape(title.artwork)}"`);
  if (edition.count > 1) html = html.replace('class="spotlight-nav" hidden', 'class="spotlight-nav"')
    .replace('id="spotlight-prev" data-copy', 'id="spotlight-prev" disabled data-copy')
    .replace('id="spotlight-next" data-copy', 'id="spotlight-next" disabled data-copy');
  return html;
}

function previewBody(html, preview, locale) {
  const lang = Number(locale === 'fr-CA');
  const key = lang ? 'Fr' : 'En';
  const image = preview.artwork ? `<img alt="${escape(preview['alt' + key] || '')}" src="${escape(preview.artwork)}">` : '';
  const label = preview.demoGame ? comingSoonCopy.playableDemo[lang] : comingSoonCopy.comingSoon[lang];
  const metadata = [lobbyCopy[preview.category]?.[lang], preview.studio, preview['collection' + key]].filter(Boolean).join(' · ');
  const description = preview['description' + key];
  const play = preview.demoGame ? `<button type="button" disabled>${escape(comingSoonCopy.openPlayableDemo[lang])}</button>` : '';
  const card = `<article class="coming-soon-detail-card" lang="${locale}"><div class="art coming-soon-art coming-soon-${escape(preview.category)}">${image}</div><div class="coming-soon-detail-copy"><p class="eyebrow">${escape(label)}</p><h1>${escape(preview['title' + key])}</h1><p>${escape(metadata)}</p>${description ? '<p>' + escape(description) + '</p>' : ''}${play}</div></article>`;
  return html.replace('id="lobby" class="shell" tabindex="-1"', 'id="lobby" class="shell" tabindex="-1" hidden')
    .replace('id="coming-soon-detail" class="shell coming-soon-detail" tabindex="-1" hidden', 'id="coming-soon-detail" class="shell coming-soon-detail" tabindex="-1"')
    .replace('<div id="coming-soon-detail-content"><p role="status" data-copy="loading"></p></div>', () => '<div id="coming-soon-detail-content">' + card + '</div>');
}

export function pageHead(html, { title, description, locale, translations, lobby, standalone, preview, staff }, origin) {
  if (staff) return staffShell(html, staff);
  if (standalone) {
    html = studioShell(html, standalone, locale);
    if (preview) html = previewBody(html, preview, locale);
  }
  if (lobby) {
    if (lobby.studio) html = studioShell(html, lobby, locale);
    html = html.replaceAll(' NORTHPLAY</', () => ' ' + escape(lobby.brand.toUpperCase()) + '</')
      .replace('<h1 data-copy="headline"></h1>', () => '<h1 data-copy="headline">' + escape(lobby.headline) + '</h1>')
      .replace('<p class="hero-description" data-copy="intro"></p>', () => '<p class="hero-description" data-copy="intro">' + escape(lobby.intro) + '</p>');
  }
  const canonical = translations.find((item) => item.locale === locale);
  const tags = [
    `<link rel="canonical" href="${escape(origin + canonical.href)}">`,
    alternateTags(translations, origin, 'link'),
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${escape(origin + canonical.href)}">`
  ].join('\n');
  return html
    .replace('<html lang="en-CA"', () => `<html lang="${escape(locale)}"`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escape(title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      () => `<meta name="description" content="${escape(description)}">`
    )
    .replace('</head>', () => tags + '\n</head>');
}

export function guideBody(html, page, returnToQuest) {
  const french = page.locale === 'fr-CA';
  const artwork = page.artwork ? `<img src="${escape(page.artwork)}" alt="${escape(page.alt)}">` : '';
  const link = page.link ? `<a class="button" href="${escape(page.link.href)}">${escape(page.link.label)}</a>` : '';
  const titles = page.collection
    .map((item) => `<li><a href="${escape(item.href)}">${escape(item.title)}</a></li>`)
    .join('');
  const spanish=page.locale===spanishGuide;
  const related = titles
    ? `<section class="guide-collection"><h2>${spanish?'Fichas de esta colección':french ? 'Fiches de cette collection' : 'Previews in this collection'}</h2><ul>${titles}</ul></section>`
    : '';
  const quest = returnToQuest ? `<a class="discovery-link" href="${escape(returnToQuest)}">${spanish?'Volver a mi misión':french?'Revenir à ma quête':'Return to my quest'}</a>` : '';
  const languages=page.translations.some(t=>t.locale===spanishGuide) ? '<nav class="guide-languages" aria-label="'+(spanish?'Idiomas':french?'Langues':'Languages')+'">'+page.translations.map(t=>
    '<a lang="'+escape(t.locale)+'" hreflang="'+escape(t.locale)+'" href="'+escape(t.href)+'"'+(page.locale===t.locale?' aria-current="page"':'')+'>'+({'en-CA':'English','fr-CA':'Français','es-MX':'Español'}[t.locale])+'</a>').join(' · ')+'</nav>' : '';
  const article = `<article class="site-content-card" lang="${page.locale}"><div><h1>${escape(page.title)}</h1><p>${escape(page.body)}</p>${link}</div>${artwork}</article>`;
  return html
    .replace('id="lobby" class="shell" tabindex="-1"', 'id="lobby" class="shell" tabindex="-1" hidden')
    .replace(
      'id="site-public-help" class="shell site-public-help" tabindex="-1" hidden',
      'id="site-public-help" class="shell site-public-help" tabindex="-1"'
    )
    .replace(
      'data-copy="siteBackHelp"></a>',
      () => (spanish?'lang="es-MX">Volver al inicio':'data-copy="siteBackHelp">' + (french ? 'Retour au hall' : 'Back to the lobby')) + '</a>'
    )
    .replace(
      '<div id="site-help-content"><p role="status" data-copy="loading"></p></div>',
      () => '<div id="site-help-content">' + languages + article + related + quest + '</div>'
    );
}

export function sitemapXml(groups, origin, basePath, part) {
  const groupLimit = 4000;
  const files = Math.ceil(groups.length / groupLimit);
  const ns = 'http://www.sitemaps.org/schemas/sitemap/0.9';
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
  if (part === undefined && files > 1) {
    const entries = Array.from(
      { length: files },
      (_, i) => `<sitemap><loc>${escape(origin + basePath)}/sitemap-${i + 1}.xml</loc></sitemap>`
    );
    return header + `<sitemapindex xmlns="${ns}">` + entries.join('\n') + '</sitemapindex>';
  }
  if (part !== undefined && (files <= 1 || part < 1 || part > files)) return null;
  const start = ((part || 1) - 1) * groupLimit;
  const entries = groups.slice(start, start + groupLimit).flatMap((translations) => {
    const alternatives = alternateTags(translations, origin, 'xhtml:link');
    return translations.map(({ href }) => `<url><loc>${escape(origin + href)}</loc>${alternatives}</url>`);
  });
  return (
    header + `<urlset xmlns="${ns}" xmlns:xhtml="http://www.w3.org/1999/xhtml">` + entries.join('\n') + '</urlset>'
  );
}
