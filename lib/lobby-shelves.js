import { localSchedule } from './communications.js';

export function createLobbyShelves(db, { fail, audit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS lobby_shelf_versions(
    tenant TEXT NOT NULL REFERENCES tenants(id),name TEXT NOT NULL,version INTEGER NOT NULL,active INTEGER NOT NULL,
    priority INTEGER NOT NULL,market TEXT NOT NULL,channel TEXT NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL,
    spec TEXT NOT NULL,audit_id INTEGER NOT NULL REFERENCES staff_events(id),PRIMARY KEY(tenant,name,version));`);
  const latest = `SELECT v.* FROM lobby_shelf_versions v WHERE tenant=? AND version=(
    SELECT max(version) FROM lobby_shelf_versions old WHERE old.tenant=v.tenant AND old.name=v.name)`;
  const options =
    db.prepare(`SELECT g.id,g.title_en AS titleEn,g.title_fr AS titleFr,g.category,g.external_id AS externalId,g.provider
    FROM game_catalog g JOIN providers p ON p.id=g.provider_id AND p.tenant_id=g.tenant_id
    WHERE g.tenant_id=? AND g.enabled=1 ORDER BY g.id`);
  const nameOk = (s) => typeof s === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(s);
  const marketOk = (s) => typeof s === 'string' && (!s || /^[A-Z]{2}(?:-[A-Z0-9]{1,3})?$/.test(s));
  function between(spec, field) {
    return Number.isSafeInteger(spec[field]) && spec[field] >= 1 && spec[field] <= 12;
  }
  function parse(tenant, value) {
    if (
      !value ||
      typeof value !== 'object' ||
      !nameOk(value.name) ||
      !marketOk(value.market) ||
      !['all', 'mobile', 'desktop'].includes(value.channel) ||
      !['all', 'slots', 'table', 'live'].includes(value.category) ||
      !['name', 'new'].includes(value.sort) ||
      !Number.isInteger(value.priority) ||
      value.priority < 0 ||
      value.priority > 100 ||
      !between(value, 'cap') ||
      !['titleEn', 'titleFr', 'titleEs'].every(
        (k) => typeof value[k] === 'string' && value[k].trim().length <= 80,
      ) ||
      !value.titleEn.trim() ||
      typeof value.zone !== 'string' ||
      value.zone.length > 64 ||
      !value.zone ||
      !Array.isArray(value.hide) ||
      !Array.isArray(value.pins) ||
      value.hide.length > 40 ||
      value.pins.length > value.cap
    )
      fail(400, 'invalid');
    try {
      new Intl.DateTimeFormat('en', { timeZone: value.zone });
    } catch {
      fail(400, 'invalid');
    }
    const starts = localSchedule(value.start, value.zone, fail),
      ends = localSchedule(value.end, value.zone, fail);
    if (ends <= starts) fail(400, 'invalid');
    const pins = value.pins,
      hide = value.hide;
    if (
      pins.some(
        (p) =>
          !p ||
          !Number.isSafeInteger(p.id) ||
          !Number.isInteger(p.slot) ||
          p.slot < 1 ||
          p.slot > value.cap,
      ) ||
      hide.some((id) => !Number.isSafeInteger(id)) ||
      new Set(pins.map((p) => p.slot)).size !== pins.length
    )
      fail(400, 'invalid');
    const entries = [...hide, ...pins.map((p) => p.id)];
    if (new Set(entries).size !== entries.length) fail(400, 'invalid');
    const member = db.prepare('SELECT category FROM game_catalog WHERE tenant_id=? AND id=?');
    for (const id of entries) {
      const found = member.get(tenant, id);
      if (
        !found ||
        (pins.some((p) => p.id === id) && value.category !== 'all' && value.category !== found.category)
      )
        fail(400, 'invalid');
    }
    return {
      name: value.name,
      titleEn: value.titleEn.trim(),
      titleFr: value.titleFr.trim(),
      titleEs: value.titleEs.trim(),
      market: value.market,
      channel: value.channel,
      priority: value.priority,
      category: value.category,
      sort: value.sort,
      cap: value.cap,
      start: value.start,
      end: value.end,
      zone: value.zone,
      hide: [...hide],
      pins: pins.map(({ id, slot }) => ({ id, slot })),
      starts,
      ends,
    };
  }
  function pick(rows, spec, lang) {
    const locale = lang === 'fr' ? 'fr' : 'en',
      label = lang === 'es' ? spec.titleEs : lang === 'fr' ? spec.titleFr : spec.titleEn;
    const pool = rows.filter(
      (r) => (spec.category === 'all' || r.category === spec.category) && !spec.hide.includes(r.id),
    );
    const title = (r) => (locale === 'fr' ? r.titleFr : r.titleEn);
    const compare = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
    const ranked = pool
      .slice()
      .sort((a, b) =>
        spec.sort === 'new' ? b.id - a.id : compare.compare(title(a), title(b)) || a.id - b.id,
      );
    const byId = new Map(pool.map((g) => [g.id, g])),
      positions = Array(spec.cap),
      placed = new Set();
    for (const { slot, id } of spec.pins)
      if (byId.has(id)) {
        positions[slot - 1] = byId.get(id);
        placed.add(id);
      }
    const free = ranked.filter((g) => !placed.has(g.id));
    for (let i = 0, offset = 0; i < positions.length; i++)
      if (!positions[i]) positions[i] = free[offset++];
    return {
      title: label || spec.titleEn,
      language: label ? lang : 'en',
      items: positions.filter(Boolean).map((g) => ({ ...g, title: title(g) })),
    };
  }
  function publicView(tenant, { market, channel, lang, now = Date.now() }) {
    if (
      !marketOk(market) ||
      !['desktop', 'mobile'].includes(channel) ||
      !['en', 'fr', 'es'].includes(lang) ||
      !Number.isSafeInteger(now)
    )
      fail(400, 'invalid');
    const candidates = db
      .prepare(
        `SELECT * FROM (${latest}) WHERE active=1 AND (market='' OR market=?) AND (channel='all' OR channel=?)
      AND ends>? ORDER BY priority DESC,name`,
      )
      .all(tenant, market, channel, now);
    const active = candidates.find((r) => r.starts <= now);
    const boundaries = candidates.map((r) => (r.starts > now ? r.starts : r.ends));
    const payload = {
      schemaVersion: 1,
      market,
      channel,
      locale: lang,
      nextChange: boundaries.length ? boundaries.reduce((a, b) => Math.min(a, b)) : null,
      shelf: null,
    };
    if (active)
      payload.shelf = {
        key: active.name,
        revision: active.version,
        ...pick(options.all(tenant), JSON.parse(active.spec), lang),
      };
    return payload;
  }
  function index(tenant) {
    return {
      items: db
        .prepare('SELECT name,version,active,spec FROM (' + latest + ') ORDER BY priority DESC,name')
        .all(tenant)
        .map((r) => ({ ...r, spec: JSON.parse(r.spec) })),
    };
  }
  function preview(tenant, input) {
    const s = parse(tenant, input.spec),
      lang = input.lang || 'en';
    if (!['en', 'fr', 'es'].includes(lang)) fail(400, 'invalid');
    return { ...pick(options.all(tenant), s, lang), starts: s.starts, ends: s.ends };
  }
  function update(tenant, staff, request, input) {
    if (
      !Number.isInteger(input.version) ||
      input.version < 0 ||
      !nameOk(input.name) ||
      !['publish', 'withdraw'].includes(input.action)
    )
      fail(400, 'invalid');
    const latestOne = db
      .prepare(
        'SELECT version,spec,active FROM lobby_shelf_versions WHERE tenant=? AND name=? ORDER BY version DESC LIMIT 1',
      )
      .get(tenant, input.name);
    if ((latestOne?.version || 0) !== input.version) fail(409, 'opStale');
    const active = Number(input.action === 'publish');
    if (!active && !latestOne?.active) fail(409, 'opUnavailable');
    const s = active ? parse(tenant, input.spec) : JSON.parse(latestOne.spec);
    if (s.name !== input.name) fail(400, 'invalid');
    if (active) {
      const overlap = db
        .prepare(
          `SELECT name FROM (${latest}) WHERE active=1 AND name<>? AND priority=? AND starts<? AND ends>?
        AND (market='' OR ?='' OR market=?) AND (channel='all' OR ?='all' OR channel=?) LIMIT 1`,
        )
        .get(tenant, s.name, s.priority, s.ends, s.starts, s.market, s.market, s.channel, s.channel);
      if (overlap) fail(409, 'shelfOverlap');
    }
    const version = input.version + 1,
      auditId = audit(
        tenant,
        staff.id,
        active ? 'shelf_published' : 'shelf_withdrawn',
        s.name,
        request,
        { version },
      );
    db.prepare('INSERT INTO lobby_shelf_versions VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(
      tenant,
      s.name,
      version,
      active,
      s.priority,
      s.market,
      s.channel,
      s.starts,
      s.ends,
      JSON.stringify(s),
      auditId,
    );
    return { auditId, name: s.name, version };
  }
  return { index, preview, publicView, update };
}
