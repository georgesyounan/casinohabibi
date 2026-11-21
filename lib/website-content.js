import { eligible } from './coming-soon.js';
import { changedFields } from './staff-audit.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const languages = ['en-CA', 'fr-CA'];
const suffix = (locale) => (locale === 'fr-CA' ? 'Fr' : 'En');
const status = (row) =>
  row.liveRevision
    ? row.liveRevision === row.draftRevision
      ? 'published'
      : 'changed'
    : row.archived
      ? 'archived'
      : 'draft';
const versions = 'r.kind, r.slug, r.version, r.draft_rev AS draftRevision, r.live_rev AS liveRevision, r.archived';
const joinRevision = (revision) =>
  ' JOIN website_content_revisions v ON v.tenant_id=r.tenant_id AND v.kind=r.kind AND v.slug=r.slug AND v.revision=r.' +
  revision;

export function createWebsiteContent(
  db,
  { transaction, fail, recordAudit, validArtwork, appBasePath, titleAvailable }
) {
  transaction(() =>
    db.exec(`
    CREATE TABLE IF NOT EXISTS website_content_records (
      tenant_id TEXT NOT NULL REFERENCES tenants(id), kind TEXT NOT NULL CHECK(kind IN ('banner','help')),
      slug TEXT NOT NULL, version INTEGER NOT NULL, draft_rev INTEGER NOT NULL, live_rev INTEGER,
      archived INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(tenant_id, kind, slug));
    CREATE TABLE IF NOT EXISTS website_content_revisions (
      tenant_id TEXT NOT NULL, kind TEXT NOT NULL, slug TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL,
      PRIMARY KEY(tenant_id,kind,slug,revision),
      FOREIGN KEY(tenant_id,kind,slug) REFERENCES website_content_records(tenant_id,kind,slug));
  `)
  );
  const getDraft = db.prepare(
    'SELECT ' +
      versions +
      ',v.data FROM website_content_records r' +
      joinRevision('draft_rev') +
      ' WHERE r.tenant_id=? AND r.kind=? AND r.slug=?'
  );
  const getLive = db.prepare(
    'SELECT ' +
      versions +
      ',v.data FROM website_content_records r' +
      joinRevision('live_rev') +
      ' WHERE r.tenant_id=? AND r.kind=? AND r.slug=?'
  );
  const index = db.prepare(
    'SELECT ' +
      versions +
      ",json_extract(v.data,'$.titleEn') AS titleEn,json_extract(v.data,'$.titleFr') AS titleFr FROM website_content_records r" +
      joinRevision('draft_rev') +
      ' WHERE r.tenant_id=? ORDER BY r.kind,r.slug'
  );
  const titles =
    db.prepare(`SELECT slug, json_extract(published,'$.titleEn') AS titleEn, json_extract(published,'$.titleFr') AS titleFr,
    json_extract(published,'$.displayMarket') AS market, json_extract(published,'$.locales') AS locales
    FROM coming_soon_titles WHERE tenant_id=? AND state='published' ORDER BY slug`);
  const pages = db.prepare(
    "SELECT r.slug,json_extract(v.data,'$.titleEn') AS titleEn,json_extract(v.data,'$.titleFr') AS titleFr," +
      " json_extract(v.data,'$.bodyEn')<>'' AND (json_extract(v.data,'$.artwork')='' OR json_extract(v.data,'$.altEn')<>'') AS readyEn," +
      " json_extract(v.data,'$.bodyFr')<>'' AND (json_extract(v.data,'$.artwork')='' OR json_extract(v.data,'$.altFr')<>'') AS readyFr" +
      ' FROM website_content_records r' +
      joinRevision('live_rev') +
      " WHERE r.tenant_id=? AND r.kind='help' ORDER BY r.slug"
  );
  const history =
    db.prepare(`SELECT e.id, e.action, e.created_at AS at, a.email AS actor, json_extract(e.details,'$.revision') AS revision
    FROM staff_events e JOIN staff_accounts a ON a.id=e.actor_id WHERE e.tenant_id=? AND e.target=?
    AND e.action IN ('website_content_published','website_content_archived') AND (? OR e.actor_id=?) ORDER BY e.id DESC LIMIT 12`);

  function identity(kind, slug) {
    if (
      !['banner', 'help'].includes(kind) ||
      typeof slug !== 'string' ||
      slug.length > 64 ||
      !slugPattern.test(slug) ||
      (kind === 'banner' && slug !== 'lobby')
    )
      fail(400, 'invalid');
  }
  function content(input, kind) {
    if (!input || typeof input !== 'object') fail(400, 'invalid');
    const clean = {};
    const limits = { title: 120, body: kind === 'banner' ? 500 : 6000, alt: 200, link: 80 };
    for (const lang of ['En', 'Fr'])
      for (const [field, limit] of Object.entries(limits)) {
        const value = input[field + lang];
        if (typeof value !== 'string' || value.length > limit) fail(400, 'invalid');
        clean[field + lang] = value.trim();
      }
    if (!clean.titleEn && !clean.titleFr) fail(400, 'siteContentTitleNeeded');
    if (typeof input.artwork !== 'string' || (input.artwork && !validArtwork(input.artwork))) fail(400, 'invalid');
    if (
      typeof input.target !== 'string' ||
      (!['', 'catalogue'].includes(input.target) && !/^(?:title|help)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.target))
    )
      fail(400, 'invalid');
    if ((input.target.split('/')[1]?.length || 0) > 64) fail(400, 'invalid');
    return { ...clean, artwork: input.artwork, target: input.target };
  }
  function complete(data, lang) {
    return Boolean(data['title' + lang] && data['body' + lang] && (!data.artwork || data['alt' + lang]));
  }
  function language(config, requested) {
    return config.enabledLocales.includes(requested) ? requested : config.primaryLocale;
  }
  function url(path, locale) {
    return appBasePath + path + '?lang=' + locale.slice(0, 2);
  }
  function targetHref(tenant, config, target, locale) {
    if (!target) return null;
    if (target === 'catalogue') return url('/', locale) + '#games';
    const [kind, slug] = target.split('/');
    if (kind === 'title') {
      if (config.enabledSections?.comingSoon !== false && titleAvailable(tenant, slug, locale)) {
        return url('/coming-soon/' + slug, locale) + '&locale=' + locale;
      }
    } else if (config.enabledSections?.faq !== false) {
      const page = getLive.get(tenant, 'help', slug);
      if (page && complete(JSON.parse(page.data), suffix(locale))) return url('/help/' + slug, locale);
    }
    return null;
  }
  function publicRecord(tenant, config, kind, slug, requested) {
    if (kind === 'help' && config.enabledSections?.faq === false) return null;
    const row = getLive.get(tenant, kind, slug);
    if (!row) return null;
    const locale = language(config, requested),
      lang = suffix(locale),
      data = JSON.parse(row.data);
    if (!complete(data, lang)) return null;
    let link = null;
    if (data.target) {
      const href = targetHref(tenant, config, data.target, locale);
      const key = href ? data.target.split('/')[0] : 'catalogue';
      const labels = {
        catalogue: ['Browse the catalogue', 'Voir le catalogue'],
        title: ['View preview', 'Voir la fiche'],
        help: ['Read the guide', 'Lire le guide']
      };
      link = {
        href: href || url('/', locale) + '#games',
        label: (href && data['link' + lang]) || labels[key][Number(lang === 'Fr')]
      };
    }
    return {
      slug,
      revision: row.liveRevision,
      locale,
      title: data['title' + lang],
      body: data['body' + lang],
      artwork: data.artwork,
      alt: data['alt' + lang],
      link
    };
  }
  function lobby(tenant, config, requested) {
    const locale = language(config, requested),
      lang = suffix(locale);
    const help =
      config.enabledSections?.faq === false
        ? []
        : pages
            .all(tenant)
            .filter((r) => r['ready' + lang] && r['title' + lang])
            .map((r) => ({ title: r['title' + lang], url: url('/help/' + r.slug, locale) }));
    return { locale, banner: publicRecord(tenant, config, 'banner', 'lobby', locale), help };
  }
  function adminList(tenant, config) {
    const items = index.all(tenant).map((r) => ({ ...r, status: status(r) }));
    const targets = [];
    if (config.enabledSections?.comingSoon !== false)
      for (const row of titles.all(tenant)) {
        const title = { displayMarket: row.market || '', locales: row.locales ? JSON.parse(row.locales) : languages };
        const locales = config.enabledLocales.filter((locale) =>
          eligible(title, { market: config.displayMarket || '', locales: [locale] })
        );
        if (locales.length)
          targets.push({ key: 'title/' + row.slug, titleEn: row.titleEn, titleFr: row.titleFr, locales });
      }
    if (config.enabledSections?.faq !== false)
      for (const row of pages.all(tenant)) {
        const locales = config.enabledLocales.filter(
          (locale) => row['ready' + suffix(locale)] && row['title' + suffix(locale)]
        );
        if (locales.length)
          targets.push({ key: 'help/' + row.slug, titleEn: row.titleEn, titleFr: row.titleFr, locales });
      }
    return { items, targets, enabledLocales: config.enabledLocales };
  }
  function get(tenant, kind, slug, staff) {
    identity(kind, slug);
    const row = getDraft.get(tenant, kind, slug);
    if (!row) fail(404, 'siteContentMissing');
    const { data, ...meta } = row;
    const admin = staff.role === 'operator_admin';
    return {
      ...meta,
      status: status(row),
      content: JSON.parse(data),
      history:
        admin || staff.publishWebsite
          ? history.all(tenant, 'website-content/' + kind + '/' + slug, Number(admin), staff.id)
          : []
    };
  }
  function mutate(tenant, config, staff, requestId, input) {
    const { kind, slug, action, version } = input;
    identity(kind, slug);
    if (!['save', 'publish', 'archive'].includes(action) || !Number.isSafeInteger(version) || version < 0)
      fail(400, 'invalid');
    const row = getDraft.get(tenant, kind, slug);
    if ((row?.version ?? 0) !== version) fail(409, 'siteContentConflict');
    if (!row && action !== 'save') fail(404, 'siteContentMissing');
    const next = version + 1,
      target = 'website-content/' + kind + '/' + slug;
    const prior = row ? JSON.parse(row.data) : {};
    let fields = [],
      revision = row?.draftRevision;
    if (action === 'save') {
      const draft = content(input.content, kind);
      fields = changedFields(prior, draft);
      if (!fields.length) return { kind, slug, version, auditId: null };
      if (row)
        db.prepare(
          'UPDATE website_content_records SET version=?,draft_rev=?,archived=0 WHERE tenant_id=? AND kind=? AND slug=?'
        ).run(next, next, tenant, kind, slug);
      else
        db.prepare('INSERT INTO website_content_records(tenant_id,kind,slug,version,draft_rev) VALUES (?,?,?,?,?)').run(
          tenant,
          kind,
          slug,
          next,
          next
        );
      db.prepare('INSERT INTO website_content_revisions VALUES (?,?,?,?,?)').run(
        tenant,
        kind,
        slug,
        next,
        JSON.stringify(draft)
      );
      revision = next;
    } else if (action === 'publish') {
      if (row.liveRevision === row.draftRevision) return { kind, slug, version, auditId: null };
      if (!config.enabledLocales.every((locale) => complete(prior, suffix(locale))))
        fail(400, 'siteContentTranslationNeeded');
      if (
        prior.target &&
        (prior.target === kind + '/' + slug ||
          !config.enabledLocales.some((locale) => targetHref(tenant, config, prior.target, locale)))
      )
        fail(400, 'siteContentTargetMissing');
      const previous = getLive.get(tenant, kind, slug);
      fields = changedFields(previous ? JSON.parse(previous.data) : {}, prior);
      db.prepare(
        'UPDATE website_content_records SET version=?,live_rev=draft_rev,archived=0 WHERE tenant_id=? AND kind=? AND slug=?'
      ).run(next, tenant, kind, slug);
    } else {
      if (!row.liveRevision) {
        if (row.archived) return { kind, slug, version, auditId: null };
        fail(409, 'siteContentNotLive');
      }
      revision = row.liveRevision;
      fields = ['status'];
      db.prepare(
        'UPDATE website_content_records SET version=?,live_rev=NULL,archived=1 WHERE tenant_id=? AND kind=? AND slug=?'
      ).run(next, tenant, kind, slug);
    }
    const state = status(getDraft.get(tenant, kind, slug));
    const events = {
      save: 'website_content_saved',
      publish: 'website_content_published',
      archive: 'website_content_archived'
    };
    const auditId = recordAudit(tenant, staff.id, events[action], target, requestId, {
      recordId: kind + '/' + slug,
      revision,
      fields,
      previousStatus: row ? status(row) : null,
      status: state
    });
    return { kind, slug, version: next, revision, status: state, auditId };
  }
  return { adminList, get, mutate, lobby, publicRecord };
}
