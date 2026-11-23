import { randomUUID } from 'node:crypto';

// Availability in the reference directory is independent of a brand's saved activation.
const productRows = [
  ['sportsbook', 'Sportsbook', 'Paris sportifs', 'sport', 'setup'],
  ['live-casino', 'Live Casino Software', 'Casino en direct', 'gaming', 'setup'],
  ['financial', 'Financial betting', 'Paris financiers', 'sport', 'listed'],
  ['virtual', 'Virtual sports', 'Sports virtuels', 'sport', 'listed'],
  ['statistics', 'Statistics', 'Statistiques', 'data', 'listed'],
  ['streaming', 'Live sport video streaming', 'Diffusion sportive en direct', 'data', 'listed'],
  ['poker', 'Poker software', 'Poker', 'gaming', 'listed'],
  ['skill', 'Skill game software', 'Jeux d’adresse', 'gaming', 'listed'],
  ['suite', 'Casino suite software', 'Suite casino', 'gaming', 'listed'],
  ['vivarogo', 'VivaroGo', 'VivaroGo', 'retail', 'listed'],
  ['vr-casino', 'VR Casino', 'Casino en réalité virtuelle', 'gaming', 'listed'],
  ['fantasy', 'Fantasy sports', 'Sports fantasy', 'sport', 'later'],
  ['vr-expo', 'VR Expo Builder', 'Création de salons virtuels', 'marketing', 'coming'],
];
const studios = [
  {
    id: 'atlas',
    name: 'Atlas Studio',
    game: 'atlas-wheel',
    titleEn: 'Atlas Wheel',
    titleFr: 'Roue Atlas',
    replay: true,
  },
  {
    id: 'cedar',
    name: 'Cedar Studio',
    game: 'cedar-cards',
    titleEn: 'Cedar Cards',
    titleFr: 'Cartes du Cèdre',
    replay: false,
  },
];
const defaults = { state: 'off', version: 0, reason: '', profile: 'healthy', updatedAt: null };
const environment = 'sandbox';

export function createOperatorProducts(db, { fail, audit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS operator_bindings (
    tenant_id TEXT NOT NULL REFERENCES tenants(id), environment TEXT NOT NULL CHECK(environment='sandbox'),
    product TEXT NOT NULL, provider TEXT NOT NULL, version INTEGER NOT NULL, requested TEXT NOT NULL,
    state TEXT NOT NULL, profile TEXT NOT NULL, reason TEXT NOT NULL, updated_at INTEGER NOT NULL,
    PRIMARY KEY(tenant_id,environment,product,provider));
    CREATE TABLE IF NOT EXISTS operator_binding_events (
    id INTEGER PRIMARY KEY REFERENCES staff_events(id), tenant_id TEXT NOT NULL REFERENCES tenants(id),
    product TEXT NOT NULL, provider TEXT NOT NULL, version INTEGER NOT NULL, requested TEXT NOT NULL,
    state TEXT NOT NULL, profile TEXT NOT NULL, reason TEXT NOT NULL, happened INTEGER NOT NULL,
    UNIQUE(tenant_id,product,provider,version));
    CREATE TABLE IF NOT EXISTS operator_connector_incidents (
      tenant TEXT NOT NULL, product TEXT NOT NULL, provider TEXT NOT NULL, opened INTEGER PRIMARY KEY REFERENCES staff_events(id),
      resolved INTEGER REFERENCES staff_events(id));
    CREATE TABLE IF NOT EXISTS operator_demo_sessions (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), product TEXT NOT NULL, provider TEXT NOT NULL,
    game TEXT NOT NULL, product_version INTEGER NOT NULL, provider_version INTEGER NOT NULL, opened INTEGER NOT NULL,
    closed INTEGER, outcome TEXT, replay INTEGER NOT NULL, actor INTEGER NOT NULL REFERENCES staff_accounts(id),
    listing_id INTEGER,listing_ref TEXT,listing_title TEXT);
    CREATE INDEX IF NOT EXISTS operator_session_lookup ON operator_demo_sessions(tenant_id,opened DESC,id);`);
  const get =
    db.prepare(`SELECT version,requested,state,profile,reason,updated_at AS updatedAt FROM operator_bindings
    WHERE tenant_id=? AND environment='sandbox' AND product=? AND provider=?`);
  const binding = (tenant, product, provider = '') =>
    get.get(tenant, product, provider) || { ...defaults, requested: 'off' };
  // Only this application's marked sample catalogue can be sent to the local simulator.
  // A rotated provider credential ends its fixture status immediately.
  function fixtureTitles(tenant) {
    return db
      .prepare(
        `SELECT g.id,g.external_id AS externalId,g.title_en AS titleEn,g.title_fr AS titleFr,g.provider
      FROM game_catalog g JOIN providers p ON p.id=g.provider_id AND p.tenant_id=g.tenant_id
      WHERE g.tenant_id=? AND g.enabled=1 AND EXISTS (SELECT 1 FROM provider_events e
      WHERE e.tenant_id=g.tenant_id AND e.name=g.provider AND e.action='sample_catalog_created' AND NOT EXISTS
      (SELECT 1 FROM provider_events x WHERE x.tenant_id=e.tenant_id AND x.name=e.name AND x.action='rotated' AND x.id>e.id))
      ORDER BY g.title_en,g.id`,
      )
      .all(tenant);
  }
  function directory(tenant) {
    return {
      environment,
      referenceDate: '2026-11-22',
      fixtureTitles: fixtureTitles(tenant),
      products: productRows.map(([id, nameEn, nameFr, category, availability]) => ({
        id,
        nameEn,
        nameFr,
        category,
        availability,
        binding: binding(tenant, id),
        providers:
          id === 'live-casino'
            ? studios.map((studio) => ({ ...studio, binding: binding(tenant, id, studio.id) }))
            : [],
      })),
    };
  }
  function history(tenant, product, before = Number.MAX_SAFE_INTEGER) {
    if (!productRows.some(([id]) => id === product) || !Number.isSafeInteger(before) || before < 1)
      fail(400, 'invalid');
    const rows = db
      .prepare(
        `SELECT id,provider,version,requested,state,profile,reason,happened,
       (SELECT opened FROM operator_connector_incidents i WHERE i.opened=e.id OR i.resolved=e.id ORDER BY opened DESC LIMIT 1) AS incident FROM operator_binding_events e
      WHERE tenant_id=? AND product=? AND id<? ORDER BY id DESC LIMIT 13`,
      )
      .all(tenant, product, before);
    const items = rows.slice(0, 12);
    return { items, next: rows.length > 12 ? items.at(-1).id : null };
  }
  function configure(tenant, staff, request, input) {
    const { product, provider = '', action, version, profile = 'healthy' } = input;
    if (!productRows.some(([id, , , , availability]) => id === product && availability === 'setup'))
      fail(409, 'opUnavailable');
    if (
      input.environment !== environment ||
      (provider !== '' && !(product === 'live-casino' && studios.some((s) => s.id === provider))) ||
      !['enable', 'suspend'].includes(action) ||
      !['healthy', 'offline','pending'].includes(profile) ||
      !Number.isSafeInteger(version) ||
      typeof input.reason !== 'string' ||
      !input.reason.trim() ||
      input.reason.trim().length > 200
    )
      fail(400, 'invalid');
    const old = binding(tenant, product, provider),
      reason = input.reason.trim();
    if (old.version !== version) fail(409, 'opStale');
    if (action === 'enable' && provider && binding(tenant, product).state !== 'active')
      fail(409, 'opProductFirst');
    if (action === 'suspend' && ['off', 'suspended'].includes(old.state)) fail(409, 'opUnavailable');
    const requested = action === 'enable' ? 'active' : 'suspended';
    const checkedProfile = action === 'suspend' ? old.profile : profile;
    const state = action==='enable' && checkedProfile!=='healthy' ? (checkedProfile==='pending'?'pending':'failed') : requested;
    const now = Date.now(),
      next = version + 1;
    db.prepare(
      `INSERT INTO operator_bindings VALUES(?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(tenant_id,environment,product,provider) DO UPDATE SET version=excluded.version,
      requested=excluded.requested,state=excluded.state,profile=excluded.profile,reason=excluded.reason,updated_at=excluded.updated_at`,
    ).run(tenant, environment, product, provider, next, requested, state, checkedProfile, reason, now);
    const auditId = audit(
      tenant,
      staff.id,
      'sandbox_product_configured',
      product + (provider ? '/' + provider : ''),
      request,
      { version: next, state, environment },
    );
    db.prepare('INSERT INTO operator_binding_events VALUES(?,?,?,?,?,?,?,?,?,?)').run(
      auditId,
      tenant,
      product,
      provider,
      next,
      requested,
      state,
      checkedProfile,
      reason,
      now,
    );
    const incident=db.prepare('SELECT opened FROM operator_connector_incidents WHERE tenant=? AND product=? AND provider=? AND resolved IS NULL').get(tenant,product,provider);
    if(state==='failed' && !incident)db.prepare('INSERT INTO operator_connector_incidents VALUES(?,?,?,?,NULL)').run(tenant,product,provider,auditId);
    if(state==='active' && incident)db.prepare('UPDATE operator_connector_incidents SET resolved=? WHERE opened=?').run(auditId,incident.opened);
    return { auditId, version: next, state };
  }
  function detail(tenant, id) {
    const row = db
      .prepare(
        `SELECT id,product,provider,game,product_version AS productVersion,provider_version AS providerVersion,
      opened,closed,outcome,replay,listing_id AS listingId,listing_ref AS listingRef,listing_title AS listingTitle FROM operator_demo_sessions WHERE id=? AND tenant_id=?`,
      )
      .get(id, tenant);
    if (!row) fail(404, 'opMissing');
    return {
      ...row,
      environment,
      replay: Boolean(row.replay),
      events: [
        { kind: 'opened', time: row.opened },
        ...(row.closed ? [{ kind: 'settled', time: row.closed, outcome: row.outcome }] : []),
      ],
    };
  }
  function sessions(tenant, before) {
    if (before && (typeof before !== 'string' || before.length !== 36)) fail(400, 'invalid');
    const after = before ? detail(tenant, before) : { opened: Number.MAX_SAFE_INTEGER, id: '~' };
    const rows = db
      .prepare(
        `SELECT id,provider,game,opened,closed FROM operator_demo_sessions
      WHERE tenant_id=? AND (opened,id)<(?,?) ORDER BY opened DESC,id DESC LIMIT 11`,
      )
      .all(tenant, after.opened, after.id);
    return { items: rows.slice(0, 10), next: rows.length > 10 ? rows[9].id : null };
  }
  function play(tenant, staff, request, input) {
    if (input.environment !== environment) fail(400, 'invalid');
    if (input.action === 'launch') {
      const studio = studios.find((s) => s.id === input.provider && s.game === input.game);
      if (!studio) fail(400, 'invalid');
      const parent = binding(tenant, 'live-casino'),
        child = binding(tenant, 'live-casino', studio.id);
      if (parent.state !== 'active' || child.state !== 'active') fail(409, 'opLaunchDenied');
      let listing = null;
      if (input.listingId != null) {
        if (studio.id !== 'atlas' || !Number.isSafeInteger(input.listingId)) fail(400, 'invalid');
        listing = fixtureTitles(tenant).find((row) => row.id === input.listingId);
        if (!listing) fail(409, 'opLaunchDenied');
      }
      const id = randomUUID();
      db.prepare('INSERT INTO operator_demo_sessions VALUES(?,?,?,?,?,?,?,?,NULL,NULL,?,?,?,?,?)').run(
        id,
        tenant,
        'live-casino',
        studio.id,
        studio.game,
        parent.version,
        child.version,
        Date.now(),
        Number(studio.replay),
        staff.id,
        listing?.id ?? null,
        listing?.externalId ?? null,
        listing?.titleEn ?? null,
      );
      return {
        id,
        auditId: audit(tenant, staff.id, 'sandbox_session_opened', id, request, {
          provider: studio.id,
          environment,
        }),
      };
    }
    if (input.action !== 'settle' || typeof input.id !== 'string') fail(400, 'invalid');
    const row = detail(tenant, input.id);
    if (row.closed) fail(409, 'opSettled');
    // The fixture's single round can complete even after its supplier or product is suspended.
    const outcome = row.provider === 'atlas' ? 'wheel-7' : 'pair-queens';
    db.prepare('UPDATE operator_demo_sessions SET closed=?, outcome=? WHERE id=? AND tenant_id=?').run(
      Date.now(),
      outcome,
      row.id,
      tenant,
    );
    return {
      id: row.id,
      outcome,
      auditId: audit(tenant, staff.id, 'sandbox_session_settled', row.id, request, {
        provider: row.provider,
        environment,
      }),
    };
  }
  return { directory, history, configure, sessions, detail, play };
}
