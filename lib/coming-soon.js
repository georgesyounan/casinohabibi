import { randomBytes, randomInt } from 'node:crypto';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugFromTitle = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').slice(0, 64).replace(/^-|-$/g, '');
const favoritePrefix = 'coming-soon:';
const favoriteKey = (id) => favoritePrefix + id;
const allLocales = ['en-CA', 'fr-CA'];
const metadata = (json) => ({ displayMarket: '', locales: allLocales, ...JSON.parse(json) });

function eligible(title, audience) {
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

  function validateDraft(input, previous) {
    const bounds = { titleEn: 120, titleFr: 120, studio: 64, descriptionEn: 800, descriptionFr: 800, altEn: 200, altFr: 200 };
    const data = {};
    for (const [key, max] of Object.entries(bounds)) {
      if (typeof input[key] !== 'string' || input[key].trim().length > max) fail(400, 'invalid');
      data[key] = input[key].trim();
    }
    if (!data.titleEn || !data.titleFr || !['slots', 'table', 'live'].includes(input.category)) fail(400, 'invalid');
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
      before = { ...JSON.parse(current.published || '{}'), state: current.state };
      after = { ...JSON.parse(current.draft), state: 'published' };
      db.prepare("UPDATE coming_soon_titles SET published = draft, state = 'published', version = ?, published_version = ?, updated_at = ? WHERE tenant_id = ? AND id = ?")
        .run(version, version, now, tenantId, current.id);
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

  function recordSave(tenantId, playerId, key, now) {
    if (!key.startsWith(favoritePrefix)) return;
    const titleId = Number(key.slice(favoritePrefix.length));
    db.prepare(`INSERT INTO coming_soon_saves(tenant_id, player_id, title_id, created_at)
      SELECT ?, ?, id, ? FROM coming_soon_titles WHERE tenant_id = ? AND id = ? AND state = 'published'
      ON CONFLICT(tenant_id, player_id, title_id) DO NOTHING`).run(tenantId, playerId, now, tenantId, titleId);
  }

  return {
    mutate, lobby, recordSave,
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
    counts: (tenantId) => db.prepare(`SELECT
      (SELECT count(*) FROM coming_soon_titles WHERE tenant_id = ? AND state = 'published') AS publishedComingSoon,
      (SELECT count(*) FROM coming_soon_saves WHERE tenant_id = ?) AS firstComingSoonSaves`).get(tenantId, tenantId),
    playerSaves: (tenantId, playerId) => db.prepare(`SELECT s.id, s.created_at AS createdAt, t.slug
      FROM coming_soon_saves s JOIN coming_soon_titles t ON t.id = s.title_id AND t.tenant_id = s.tenant_id
      WHERE s.tenant_id = ? AND s.player_id = ? ORDER BY s.id`).all(tenantId, playerId),
    saves: (tenantId, query) => db.prepare(`SELECT s.id, p.id AS playerId, p.email, s.created_at AS createdAt, t.slug, t.state
      FROM coming_soon_saves s
      JOIN players p ON p.id = s.player_id AND p.tenant_id = s.tenant_id
      JOIN coming_soon_titles t ON t.id = s.title_id AND t.tenant_id = s.tenant_id
      WHERE s.tenant_id = ? AND (? = '' OR instr(lower(p.email), ?) > 0 OR cast(p.id AS TEXT) = ? OR 'save-' || s.id = ?)
      ORDER BY s.id DESC LIMIT 100`).all(tenantId, query, query, query, query)
  };
}
