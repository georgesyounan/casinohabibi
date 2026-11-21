import { randomBytes, randomInt } from 'node:crypto';
import { catalogueCategories, matchesCatalogue, normalizeCatalogueText } from '../public/catalog.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugFromTitle = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').slice(0, 64).replace(/^-|-$/g, '');
const favoritePrefix = 'coming-soon:';
const favoriteKey = (id) => favoritePrefix + id;
const allLocales = ['en-CA', 'fr-CA'];
const metadata = (json) => ({ displayMarket: '', locales: allLocales, collectionEn: '', collectionFr: '', ...JSON.parse(json) });

export function eligible(title, audience) {
  return (!title.displayMarket || audience.market === title.displayMarket || audience.market.startsWith(title.displayMarket + '-')) &&
    title.locales.some((locale) => audience.locales.includes(locale));
}

export function installComingSoon(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS coming_soon_titles (
      id INTEGER PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      slug TEXT NOT NULL,
      draft TEXT NOT NULL,
      published TEXT,
      state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft', 'published', 'archived')),
      version INTEGER NOT NULL DEFAULT 1,
      published_version INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE(tenant_id, slug),
      UNIQUE(tenant_id, id)
    );
    CREATE INDEX IF NOT EXISTS coming_soon_titles_state ON coming_soon_titles(tenant_id, state);
    CREATE TABLE IF NOT EXISTS coming_soon_saves (
      id INTEGER PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      title_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(tenant_id, player_id, title_id),
      FOREIGN KEY(tenant_id, title_id) REFERENCES coming_soon_titles(tenant_id, id)
    );
    CREATE INDEX IF NOT EXISTS coming_soon_saves_order ON coming_soon_saves(tenant_id, id);
    CREATE TABLE IF NOT EXISTS coming_soon_visits (
      tenant_id TEXT NOT NULL REFERENCES tenants(id), visit_id TEXT NOT NULL,
      shelves TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(tenant_id, visit_id)
    );
    CREATE INDEX IF NOT EXISTS coming_soon_visit_expiry ON coming_soon_visits(expires);
  `);
}

export function createComingSoon(db, { fail, recordAudit, validArtwork, appBasePath, transaction }) {
  const bySlug = db.prepare('SELECT * FROM coming_soon_titles WHERE tenant_id = ? AND slug = ?');
  const visible = db.prepare("SELECT id, slug, published FROM coming_soon_titles WHERE tenant_id = ? AND state = 'published' ORDER BY slug");
  const visibleIds = db.prepare(`SELECT id, coalesce(json_extract(published, '$.displayMarket'), '') AS displayMarket,
    json_extract(published, '$.locales') AS locales FROM coming_soon_titles WHERE tenant_id = ? AND state = 'published'`);
  const label = (row) => ({ id: row.id, slug: row.slug, favoriteKey: favoriteKey(row.id),
    previewUrl: appBasePath + '/coming-soon/' + row.slug, ...metadata(row.published) });
  const view = (row) => ({
    slug: row.slug, state: row.state, version: row.version, publishedVersion: row.published_version,
    id: row.id, revision: row.version, previewUrl: appBasePath + '/admin?preview=' + row.slug + '#coming-soon-admin',
    updatedAt: row.updated_at, ...metadata(row.draft)
  });

  db.function('catalogue_matches', { deterministic: true }, (query, titleEn, titleFr, studio, collectionEn, collectionFr, slug, category) =>
    Number(matchesCatalogue(query, [titleEn, titleFr, studio, collectionEn, collectionFr, slug], category)));
  const summarySql = `SELECT tenant_id, id, slug, state, version, published_version AS publishedVersion, updated_at AS updatedAt,
    json_extract(draft, '$.titleEn') AS titleEn, json_extract(draft, '$.titleFr') AS titleFr,
    json_extract(draft, '$.category') AS category, json_extract(draft, '$.studio') AS studio,
    coalesce(json_extract(draft, '$.collectionEn'), '') AS collectionEn, coalesce(json_extract(draft, '$.collectionFr'), '') AS collectionFr
    FROM coming_soon_titles`;
  const filteredSql = ` FROM (${summarySql}) WHERE tenant_id=:tenant
    AND (:state='' OR state=:state OR (:state='changed' AND state='published' AND version<>publishedVersion))
    AND (:category='' OR category=:category)
    AND (:q='' OR catalogue_matches(:q, titleEn, titleFr, studio, collectionEn, collectionFr, slug, category))`;
  const countDrafts = db.prepare('SELECT count(*) AS total' + filteredSql);
  const listDrafts = db.prepare('SELECT id, slug, state, version, publishedVersion, updatedAt, titleEn, titleFr, studio, category, collectionEn, collectionFr' +
    filteredSql + ' ORDER BY updatedAt DESC, id DESC LIMIT 8 OFFSET :offset');

  function draftIndex(tenant, params) {
    const q = (params.get('q') || '').trim(), state = params.get('state') || '', category = params.get('category') || '';
    const requested = params.get('page') ?? '1';
    if (q.length > 120 || !['', 'draft', 'published', 'changed', 'archived'].includes(state) ||
        (category && !Object.hasOwn(catalogueCategories, category)) || !/^[1-9]\d{0,8}$/.test(requested)) fail(400, 'invalid');
    return transaction(() => {
      const filters = { tenant, q, state, category };
      const { total } = countDrafts.get(filters);
      const page = Math.min(Number(requested), Math.max(1, Math.ceil(total / 8)));
      return { items: listDrafts.all({ ...filters, offset: (page - 1) * 8 }), total, page, pageSize: 8 };
    });
  }

  function validateDraft(input, previous) {
    const bounds = { titleEn: 120, titleFr: 120, studio: 64, descriptionEn: 800, descriptionFr: 800, altEn: 200, altFr: 200 };
    const data = {};
    for (const [key, max] of Object.entries(bounds)) {
      if (typeof input[key] !== 'string' || input[key].trim().length > max) fail(400, 'invalid');
      data[key] = input[key].trim();
    }
    if (!data.titleEn || !data.titleFr || !['slots', 'table', 'live'].includes(input.category)) fail(400, 'invalid');
    for (const field of ['collectionEn', 'collectionFr']) {
      const value = input[field] === undefined ? (previous[field] || '') : input[field];
      if (typeof value !== 'string' || value.length > 64 || (value.trim() && !normalizeCatalogueText(value))) fail(400, 'invalid');
      data[field] = value.trim();
    }
    if (!Number.isInteger(input.featuredRank) || input.featuredRank < 0 || input.featuredRank > 99) fail(400, 'invalid');
    if (typeof input.artwork !== 'string' || (input.artwork &&
        (!validArtwork(input.artwork) || !data.altEn || !data.altFr))) fail(400, 'invalid');
    const displayMarket = input.displayMarket ?? previous.displayMarket ?? '';
    const locales = input.locales ?? previous.locales ?? allLocales;
    if (typeof displayMarket !== 'string' || (displayMarket && !/^[A-Z]{2}(?:-[A-Z0-9]{1,3})?$/.test(displayMarket)) ||
        !Array.isArray(locales) || !locales.length || locales.length > allLocales.length || new Set(locales).size !== locales.length ||
        locales.some((locale) => !allLocales.includes(locale))) fail(400, 'invalid');
    return { ...data, displayMarket, locales: allLocales.filter((locale) => locales.includes(locale)), category: input.category, artwork: input.artwork, featuredRank: input.featuredRank };
  }

  function mutate(tenantId, staffId, requestId, input) {
    if (!input || !['save', 'publish', 'archive'].includes(input.action) || !Number.isInteger(input.version) || input.version < 0) fail(400, 'invalid');
    const slug = input.slug || (input.action === 'save' && typeof input.titleEn === 'string' && slugFromTitle(input.titleEn));
    if (typeof slug !== 'string' || slug.length > 64 || !slugPattern.test(slug)) fail(400, 'invalid');
    const current = bySlug.get(tenantId, slug);
    if ((current?.version ?? 0) !== input.version) fail(409, 'comingSoonConflict');
    const draft = input.action === 'save' ? validateDraft(input, current ? metadata(current.draft) : {}) : null;
    if (!current && !draft) fail(404, 'comingSoonMissing');
    if (input.action === 'publish' && current.state === 'published' && current.published_version === current.version) return { title: view(current), auditId: null };
    if (input.action === 'archive' && current.state === 'archived') return { title: view(current), auditId: null };
    const now = Date.now();
    const version = input.version + 1;
    let event;
    let before;
    let after;
    if (draft) {
      before = current ? JSON.parse(current.draft) : {};
      after = draft;
      const payload = JSON.stringify(draft);
      if (current) db.prepare('UPDATE coming_soon_titles SET draft = ?, version = ?, updated_at = ? WHERE tenant_id = ? AND id = ?').run(payload, version, now, tenantId, current.id);
      else db.prepare('INSERT INTO coming_soon_titles(tenant_id, slug, draft, updated_at) VALUES (?, ?, ?, ?)').run(tenantId, slug, payload, now);
      event = 'coming_soon_draft_saved';
    } else if (input.action === 'publish') {
      const card = metadata(current.draft);
      if ((card.collectionEn || card.collectionFr) && card.locales.some((locale) =>
        !(locale === 'fr-CA' ? card.collectionFr : card.collectionEn))) fail(400, 'comingSoonCollectionTranslation');
      before = { ...JSON.parse(current.published || '{}'), state: current.state };
      after = { ...JSON.parse(current.draft), state: 'published' };
      db.prepare("UPDATE coming_soon_titles SET published = draft, state = 'published', version = ?, published_version = ?, updated_at = ?, published_at = ? WHERE tenant_id = ? AND id = ?")
        .run(version, version, now, now, tenantId, current.id);
      event = 'coming_soon_published';
    } else {
      before = { state: current.state };
      after = { state: 'archived' };
      db.prepare("UPDATE coming_soon_titles SET state = 'archived', version = ?, updated_at = ? WHERE tenant_id = ? AND id = ?")
        .run(version, now, tenantId, current.id);
      db.prepare('DELETE FROM player_favorites WHERE tenant_id = ? AND favorite_key = ?').run(tenantId, favoriteKey(current.id));
      event = 'coming_soon_archived';
    }
    const row = bySlug.get(tenantId, slug);
    const fields = Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const auditId = recordAudit(tenantId, staffId, event, `coming-soon/${slug}@${version}`, requestId, {
      recordId: row.id, revision: version, fields, previousStatus: current?.state ?? null, status: row.state
    }, now);
    return { title: view(row), auditId };
  }

  function reconcileDiscover(previous, eligibleSlugs) {
    const eligible = new Set(eligibleSlugs);
    const slots = previous.map((slug) => eligible.delete(slug) ? slug : null);
    const candidates = [...eligible];
    function draw() {
      if (!candidates.length) return null;
      const index = randomInt(candidates.length);
      const choice = candidates[index];
      candidates[index] = candidates.at(-1);
      candidates.pop();
      return choice;
    }
    for (let index = 0; index < slots.length; index++) {
      if (slots[index] === null) slots[index] = draw();
    }
    while (slots.length < 6 && candidates.length) slots.push(draw());
    return slots.filter(Boolean);
  }

  function lobby(tenantId, previousVisit, audience, playerId, enabled) {
    return transaction(() => {
      const now = Date.now();
      db.prepare('DELETE FROM coming_soon_visits WHERE expires <= ?').run(now);
      const visit = previousVisit && db.prepare('SELECT shelves FROM coming_soon_visits WHERE tenant_id = ? AND visit_id = ?').get(tenantId, previousVisit);
      const visitId = visit ? previousVisit : randomBytes(16).toString('hex');
      const shelves = visit ? JSON.parse(visit.shelves) : {};
      const locale = audience.locales[0];
      const favorites = playerId ? db.prepare("SELECT favorite_key AS key FROM player_favorites WHERE tenant_id = ? AND player_id = ? AND favorite_key GLOB 'coming-soon:*'").all(tenantId, playerId) : [];
      const savedKeys = new Set(favorites.map(({ key }) => key));
      const titles = enabled ? visible.all(tenantId).map(label).filter((title) => eligible(title, audience))
        .map((title) => ({ ...title, visible: true, saved: savedKeys.has(title.favoriteKey) })) : [];
      const featured = titles.filter((title) => title.featuredRank > 0)
        .sort((a, b) => a.featuredRank - b.featuredRank || a.slug.localeCompare(b.slug)).map(({ slug }) => slug);
      const discover = reconcileDiscover(shelves[locale] || [], titles.map(({ slug }) => slug));
      shelves[locale] = discover;
      db.prepare(`INSERT INTO coming_soon_visits(tenant_id, visit_id, shelves, expires) VALUES (?, ?, ?, ?)
        ON CONFLICT(tenant_id, visit_id) DO UPDATE SET shelves = excluded.shelves, expires = excluded.expires`)
        .run(tenantId, visitId, JSON.stringify(shelves), now + 30 * 60 * 1000);
      return { visitId, titles, featured, discover, eligibleCount: titles.length, collectionSize: titles.length === 0 ? 'empty' : titles.length < 6 ? 'small' : 'full' };
    });
  }

  return {
    mutate, lobby, draftIndex,
    savedShelf(tenantId, playerId, audience) {
      return db.prepare(`SELECT t.id, t.slug, t.published, f.created_at AS savedAt, s.id AS saveId,
        (SELECT max(a.id) FROM coming_soon_activity a WHERE a.save_id = s.id) AS activityId
        FROM player_favorites f JOIN coming_soon_titles t ON t.tenant_id = f.tenant_id AND f.favorite_key = 'coming-soon:' || t.id
        JOIN coming_soon_saves s ON s.tenant_id = f.tenant_id AND s.player_id = f.player_id AND s.title_id = t.id
        WHERE f.tenant_id = ? AND f.player_id = ? AND t.state = 'published'
        ORDER BY f.created_at DESC, activityId DESC`).all(tenantId, playerId)
        .map((row) => ({ ...label(row), saved: true, visible: true, savedAt: row.savedAt, saveId: row.saveId, activityId: row.activityId }))
        .filter((title) => eligible(title, audience));
    },
    keys: (tenantId, audience) => visibleIds.all(tenantId)
      .filter((row) => eligible({ displayMarket: row.displayMarket, locales: row.locales ? JSON.parse(row.locales) : allLocales }, audience))
      .map(({ id }) => favoriteKey(id)),
    draft(tenantId, slug) {
      const row = bySlug.get(tenantId, slug);
      if (!row) fail(404, 'comingSoonMissing');
      return view(row);
    },
    published(tenantId, slug, audience) {
      const row = bySlug.get(tenantId, slug);
      if (row?.state !== 'published') return null;
      const title = label(row);
      return eligible(title, audience) ? title : null;
    },
    drafts: (tenantId) => db.prepare('SELECT * FROM coming_soon_titles WHERE tenant_id = ? ORDER BY updated_at DESC, id DESC').all(tenantId).map(view),
    playerSaves: (tenantId, playerId) => db.prepare(`SELECT s.id, s.created_at AS createdAt, t.slug
      FROM coming_soon_saves s JOIN coming_soon_titles t ON t.id = s.title_id AND t.tenant_id = s.tenant_id
      WHERE s.tenant_id = ? AND s.player_id = ? ORDER BY s.id`).all(tenantId, playerId),
    saves: (tenantId, query, before, limit) => db.prepare(`SELECT s.id, p.id AS playerId, p.email, s.created_at AS createdAt, t.slug, t.state
      FROM coming_soon_saves s
      JOIN players p ON p.id = s.player_id AND p.tenant_id = s.tenant_id
      JOIN coming_soon_titles t ON t.id = s.title_id AND t.tenant_id = s.tenant_id
      WHERE s.tenant_id = ? AND s.id < coalesce(?, 9223372036854775807) AND
        (? = '' OR instr(lower(p.email), ?) > 0 OR cast(p.id AS TEXT) = ? OR 'player-' || p.id = ? OR 'save-' || s.id = ?
        OR s.id = (SELECT save_id FROM coming_soon_activity WHERE id = ?))
      ORDER BY s.id DESC LIMIT ?`).all(tenantId, before, query, query, query, query, query,
        /^activity-[1-9]\d{0,15}$/.test(query) ? Number(query.slice(9)) : null, limit)
  };
}
