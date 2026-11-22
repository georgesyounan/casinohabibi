import { collectionKey, normalizeCatalogueText } from '../public/catalog.js';

export function createDiscoveryNavigation({ website, configFor, appBasePath, fail }) {
  function guide(tenant, address, requested) {
    if (!address) return null;
    const config = configFor(tenant);
    const primary = config.enabledLocales.includes(requested) ? requested : config.primaryLocale;
    const locales = [primary, ...config.enabledLocales.filter((locale) => locale !== primary)];
    for (const lang of locales) {
      const source = website.resolveGuide(tenant, config, address, lang);
      if (!source) continue;
      if (!requested || lang === primary) return source;
      return website.publicRecord(tenant, config, 'help', source.slug, primary);
    }
    return null;
  }
  function collection(tenant, value, locale, rows) {
    const wanted = normalizeCatalogueText(value || '');
    if (!wanted) return null;
    const found = new Map();
    for (const row of rows || website.catalogueEntries(tenant, configFor(tenant))) {
      if (locale && !row.locales.includes(locale)) continue;
      const key = collectionKey(row);
      if (
        !key ||
        ![key, row.collectionFr, row.collectionEn].some(
          (label) => label && normalizeCatalogueText(label) === wanted
        )
      )
        continue;
      found.set(key, {
        key,
        titleEn: row.collectionEn || row.collectionFr,
        titleFr: row.collectionFr || row.collectionEn
      });
    }
    return found.get(wanted) || (found.size === 1 ? [...found.values()][0] : null);
  }
  function publish(tenant, draft) {
    const spec = { ...draft };
    const config = configFor(tenant);
    let supported = config.enabledLocales;
    if (['Q02', 'Q03', 'Q06'].includes(spec.template)) {
      const g = guide(tenant, spec.target);
      if (!g) fail(409, 'questDependencies');
      spec.target = g.slug;
      supported = g.translations.map((t) => t.locale);
    }
    if (['Q02', 'Q06'].includes(spec.template)) {
      const names = spec.template === 'Q02' ? [spec.collection] : spec.collection.split('|');
      const rows = website.catalogueEntries(tenant, config);
      const values = names.map((name) => collection(tenant, name, undefined, rows)?.key);
      if (
        values.some((v) => !v) ||
        values.length !== (spec.template === 'Q06' ? 2 : 1) ||
        new Set(values).size !== values.length
      )
        fail(409, 'questDependencies');
      spec.collection = values.join('|');
      if (!supported.some((locale) => values.every((value) => collection(tenant, value, locale, rows))))
        fail(409, 'questDependencies');
    }
    if (spec.template === 'Q09') {
      const rows = website.catalogueEntries(tenant, config).filter((row) => spec.pair.includes(row.id));
      if (rows.length !== 2 || !supported.some((locale) => rows.every((row) => row.locales.includes(locale))))
        fail(409, 'questDependencies');
    }
    return spec;
  }
  function attach(tenant, item, locale) {
    if (!['available', 'enrolled'].includes(item.state)) return;
    const s = item.spec;
    if (['Q02', 'Q03', 'Q06'].includes(s.template)) {
      const g = guide(tenant, s.target, locale);
      const href = g?.translations.find((x) => x.locale === g.locale)?.href;
      item.guide = href ? { slug: g.slug, path: href.slice(appBasePath.length) } : null;
    }
    if (['Q02', 'Q06'].includes(s.template)) {
      const rows = website.catalogueEntries(tenant, configFor(tenant));
      item.collections = s.collection
        .split('|')
        .map((v) => collection(tenant, v, locale, rows))
        .filter(Boolean);
    }
  }
  return { guide, collection, publish, attach };
}
