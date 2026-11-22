const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => entities[character]);

export function createPublicPages({ websiteContent, comingSoon, appBasePath }) {
  function guide(tenant, config, address, requested) {
    const locale = config.enabledLocales.includes(requested) ? requested : config.primaryLocale;
    let page = websiteContent.resolveGuide(tenant, config, address, locale);
    if (!page && !requested) {
      for (const other of config.enabledLocales.filter((lang) => lang !== locale)) {
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

  return function describe(tenant, config, { helpSlug, previewSlug, path, params }) {
    const lang = params.get('lang');
    const requested = lang === 'fr' ? 'fr-CA' : lang === 'en' ? 'en-CA' : undefined;
    if (helpSlug) return guide(tenant, config, helpSlug, requested);
    if (previewSlug) return preview(tenant, config, previewSlug, params.get('locale') || requested);
    if (path !== '/') return { noindex: true };
    const locale = config.enabledLocales.includes(requested) ? requested : config.primaryLocale;
    const suffix = locale === 'fr-CA' ? 'Fr' : 'En';
    return {
      meta: {
        title: locale === 'fr-CA' ? 'Casino ' + config.brandName : config.brandName + ' Casino',
        description: config['heroIntro' + suffix] || config['heroTitle' + suffix],
        locale,
        translations: config.enabledLocales.map((lang) => ({
          locale: lang,
          href: appBasePath + '/?lang=' + lang.slice(0, 2)
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

export function pageHead(html, { title, description, locale, translations }, origin) {
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

export function guideBody(html, page) {
  const french = page.locale === 'fr-CA';
  const artwork = page.artwork ? `<img src="${escape(page.artwork)}" alt="${escape(page.alt)}">` : '';
  const link = page.link ? `<a class="button" href="${escape(page.link.href)}">${escape(page.link.label)}</a>` : '';
  const titles = page.collection
    .map((item) => `<li><a href="${escape(item.href)}">${escape(item.title)}</a></li>`)
    .join('');
  const related = titles
    ? `<section class="guide-collection"><h2>${french ? 'Fiches de cette collection' : 'Previews in this collection'}</h2><ul>${titles}</ul></section>`
    : '';
  const article = `<article class="site-content-card" lang="${page.locale}"><div><h1>${escape(page.title)}</h1><p>${escape(page.body)}</p>${link}</div>${artwork}</article>`;
  return html
    .replace('id="lobby" class="shell" tabindex="-1"', 'id="lobby" class="shell" tabindex="-1" hidden')
    .replace(
      'id="site-public-help" class="shell site-public-help" tabindex="-1" hidden',
      'id="site-public-help" class="shell site-public-help" tabindex="-1"'
    )
    .replace(
      'data-copy="siteBackHelp"></a>',
      () => 'data-copy="siteBackHelp">' + (french ? 'Retour au hall' : 'Back to the lobby') + '</a>'
    )
    .replace(
      '<div id="site-help-content"><p role="status" data-copy="loading"></p></div>',
      () => '<div id="site-help-content">' + article + related + '</div>'
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
