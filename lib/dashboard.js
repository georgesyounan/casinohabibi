import { eligible } from './coming-soon.js';
import { games, roundPreview } from '../public/catalog.js';

const roundActivity = ` FROM ledger l JOIN players p ON p.id = l.player AND p.tenant_id = l.tenant_id
  WHERE l.tenant_id = ? AND p.report_fixture = ? AND l.game IS NOT NULL AND l.created_at >= ? AND l.created_at < ?`;
const roundStatistics = 'count(*) AS rounds, count(DISTINCT l.player) AS active_players, coalesce(sum(l.wager),0) AS wagered_cents';

const dayMs = 86_400_000;
const formatters = new Map();
const metrics = ['signups', 'active', 'saves', 'published'];

function localDay(value, zone) {
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat('sv-SE', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }));
  }
  return formatters.get(zone).format(value);
}

function dateAtOffset(day, offset) {
  return new Date(Date.parse(day + 'T00:00:00Z') + offset * dayMs).toISOString().slice(0, 10);
}

function startOfDay(day, zone) {
  const utc = Date.parse(day + 'T00:00:00Z');
  let low = utc - 36 * 3_600_000, high = utc + 36 * 3_600_000;
  // Calendar days can be 23 or 25 hours. Find the first local instant of the requested day.
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDay(middle, zone) < day) low = middle;
    else high = middle;
  }
  return high;
}

export function reportPeriod(params, zone, now, fail) {
  const today = localDay(now, zone);
  const days = params.get('days') || '30';
  const custom = params.has('from') || params.has('to');
  if (!['7', '30', '90'].includes(days) || (custom && params.has('days'))) fail(400, 'reportInvalidDates');
  const to = custom ? params.get('to') : today;
  const from = custom ? params.get('from') : dateAtOffset(today, 1 - Number(days));
  function valid(day) {
    return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
      Number.isFinite(Date.parse(day + 'T00:00:00Z')) && dateAtOffset(day, 0) === day;
  }
  if (!valid(from) || !valid(to) || from < '1970-01-01' || from > to || to > today) fail(400, 'reportInvalidDates');
  const count = 1 + (Date.parse(to) - Date.parse(from)) / dayMs;
  if (count > 366) fail(400, 'reportInvalidDates');
  return { from, to, zone, days: count, start: startOfDay(from, zone), end: Math.min(now + 1, startOfDay(dateAtOffset(to, 1), zone)) };
}

export function createDashboard(db, { transaction, fail }) {
  transaction(() => {
    const columns = (table) => db.prepare('PRAGMA table_info(' + table + ')').all().map((r) => r.name);
    const players = columns('players'), titles = columns('coming_soon_titles');
    if (!players.includes('first_verified_at')) db.exec('ALTER TABLE players ADD COLUMN first_verified_at INTEGER');
    if (!players.includes('report_fixture')) {
      db.exec(`ALTER TABLE players ADD COLUMN report_fixture INTEGER NOT NULL DEFAULT 0 CHECK(report_fixture IN (0,1));
        UPDATE players SET report_fixture = 1 WHERE tenant_id = 'sandbox' AND email GLOB 'northplay-showcase-??@example.invalid'
        AND EXISTS (SELECT 1 FROM ledger l WHERE l.player = players.id AND l.tenant_id = players.tenant_id AND l.request_id GLOB 'northplay-showcase-*')`);
    }
    if (!titles.includes('report_fixture')) db.exec('ALTER TABLE coming_soon_titles ADD COLUMN report_fixture INTEGER NOT NULL DEFAULT 0 CHECK(report_fixture IN (0,1))');
    if (!titles.includes('published_at')) db.exec(`ALTER TABLE coming_soon_titles ADD COLUMN published_at INTEGER;
      UPDATE coming_soon_titles AS t SET published_at = (SELECT max(e.created_at) FROM staff_events e WHERE e.tenant_id = t.tenant_id
        AND e.action = 'coming_soon_published' AND e.target = 'coming-soon/' || t.slug || '@' || t.published_version) WHERE t.published_version IS NOT NULL`);
    db.exec(`CREATE TABLE IF NOT EXISTS reporting_install (id INTEGER PRIMARY KEY CHECK(id = 1), started_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS report_fixture_tenants (tenant_id TEXT PRIMARY KEY REFERENCES tenants(id));
      CREATE TRIGGER IF NOT EXISTS report_flag_demo_player AFTER INSERT ON players
        WHEN EXISTS (SELECT 1 FROM report_fixture_tenants WHERE tenant_id = NEW.tenant_id) BEGIN
        UPDATE players SET report_fixture = 1 WHERE id = NEW.id; END;
      CREATE TRIGGER IF NOT EXISTS report_flag_demo_title AFTER INSERT ON coming_soon_titles
        WHEN EXISTS (SELECT 1 FROM report_fixture_tenants WHERE tenant_id = NEW.tenant_id) BEGIN
        UPDATE coming_soon_titles SET report_fixture = 1 WHERE id = NEW.id; END;
      CREATE TABLE IF NOT EXISTS player_report_visits (tenant_id TEXT NOT NULL REFERENCES tenants(id),
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, minute INTEGER NOT NULL, visited_at INTEGER NOT NULL,
        PRIMARY KEY(tenant_id, player_id, minute));
      CREATE INDEX IF NOT EXISTS report_visit_range ON player_report_visits(tenant_id, visited_at, player_id);
      CREATE INDEX IF NOT EXISTS report_verified_range ON players(tenant_id, report_fixture, first_verified_at);
      CREATE INDEX IF NOT EXISTS report_first_save_range ON coming_soon_saves(tenant_id, created_at);
      CREATE TRIGGER IF NOT EXISTS report_first_verification AFTER UPDATE OF email_verified ON players
        WHEN OLD.email_verified = 0 AND NEW.email_verified = 1 AND NEW.first_verified_at IS NULL BEGIN
        UPDATE players SET first_verified_at = CAST(unixepoch('subsec') * 1000 AS INTEGER) WHERE id = NEW.id; END;`);
    if (db.prepare('INSERT OR IGNORE INTO reporting_install VALUES (1, ?)').run(Date.now()).changes) {
      // Only an exclusively seeded legacy sandbox can be identified as a whole test brand.
      db.exec(`INSERT OR IGNORE INTO report_fixture_tenants SELECT 'sandbox'
        WHERE EXISTS (SELECT 1 FROM players WHERE tenant_id = 'sandbox' AND report_fixture = 1)
        AND NOT EXISTS (SELECT 1 FROM players WHERE tenant_id = 'sandbox' AND report_fixture = 0)
        AND NOT EXISTS (SELECT 1 FROM coming_soon_titles WHERE tenant_id = 'sandbox');
        INSERT OR IGNORE INTO player_report_visits
        SELECT s.tenant_id, s.player, s.created_at / 60000, min(s.created_at) FROM sessions s
        JOIN players p ON p.id = s.player AND p.tenant_id = s.tenant_id WHERE s.created_at > 0 GROUP BY s.tenant_id, s.player, s.created_at / 60000`);
    }
  });
  const startedAt = db.prepare('SELECT started_at FROM reporting_install WHERE id = 1').get().started_at;
  const visit = db.prepare('INSERT OR IGNORE INTO player_report_visits(tenant_id, player_id, minute, visited_at) VALUES (?, ?, ?, ?)');
  db.function('report_calendar_day', { deterministic: true }, (ms, zone) => localDay(ms, zone));
  db.function('report_round_source', { deterministic: true }, (game, outcome) => {
    const preview = roundPreview(outcome);
    return preview ? 'preview:' + preview.slug : 'game:' + game;
  });
  db.function('report_card_visible', { deterministic: true }, (market, locales, brandMarket, brandLocales) =>
    Number(eligible({ displayMarket: market || '', locales: locales ? JSON.parse(locales) : ['en-CA', 'fr-CA'] },
      { market: brandMarket, locales: JSON.parse(brandLocales) })));

  function context(tenantId, config, params, now) {
    if (params.has('brand') && params.get('brand') !== tenantId) fail(403, 'staffForbidden');
    const zone = config.reportingTimeZone || 'UTC';
    if (params.has('zone') && params.get('zone') !== zone) fail(409, 'reportChanged');
    const hasFixtures = Boolean(db.prepare(`SELECT EXISTS(SELECT 1 FROM players WHERE tenant_id = ? AND report_fixture = 1)
      OR EXISTS(SELECT 1 FROM coming_soon_titles WHERE tenant_id = ? AND report_fixture = 1) AS hasFixtures`).get(tenantId, tenantId).hasFixtures);
    let scope = params.get('scope');
    if (scope === null) {
      scope = hasFixtures && !db.prepare(`SELECT 1 FROM players WHERE tenant_id = ? AND report_fixture = 0
        UNION ALL SELECT 1 FROM coming_soon_titles WHERE tenant_id = ? AND report_fixture = 0 LIMIT 1`).get(tenantId, tenantId) ? 'test' : 'site';
    }
    if (!['site', 'test'].includes(scope)) fail(400, 'invalid');
    return { tenantId, config, hasFixtures, scope, fixture: Number(scope === 'test'),
      period: reportPeriod(params, zone, now, fail), now };
  }

  function query(metric, { tenantId, fixture, period, config }, source) {
    const range = [tenantId, fixture, period.start, period.end];
    switch (metric) {
      case 'signups': return [`SELECT p.id, p.id AS playerId, p.email, p.first_verified_at AS at FROM players p
        WHERE p.tenant_id = ? AND p.report_fixture = ? AND p.first_verified_at >= ? AND p.first_verified_at < ?`, range];
      case 'active': return [`SELECT p.id, p.id AS playerId, p.email, min(v.visited_at) AS at FROM player_report_visits v
        JOIN players p ON p.id = v.player_id AND p.tenant_id = v.tenant_id
        WHERE v.tenant_id = ? AND p.report_fixture = ? AND v.visited_at >= ? AND v.visited_at < ? GROUP BY p.id`, range];
      case 'saves': return [`SELECT s.id, p.id AS playerId, p.email, t.slug, s.created_at AS at, (SELECT min(a.id) FROM coming_soon_activity a WHERE a.save_id = s.id) AS activityId FROM coming_soon_saves s
        JOIN players p ON p.id = s.player_id AND p.tenant_id = s.tenant_id JOIN coming_soon_titles t ON t.id = s.title_id AND t.tenant_id = s.tenant_id
        WHERE s.tenant_id = ? AND max(p.report_fixture, t.report_fixture) = ? AND s.created_at >= ? AND s.created_at < ?`, range];
      case 'rounds': return [`SELECT l.id, p.id AS playerId, p.email, l.created_at AS at` + roundActivity +
        ' AND report_round_source(l.game,l.outcome) = ?', [...range, source]];
      case 'published': return [`SELECT id, slug, json_extract(published,'$.titleEn') AS titleEn, json_extract(published,'$.titleFr') AS titleFr,
        json_extract(published,'$.demoGame') AS demoGame, json_extract(published,'$.locales') AS locales, published_version AS revision, published_at AS at FROM coming_soon_titles
        WHERE tenant_id = ? AND report_fixture = ? AND state = 'published' AND ? AND
        report_card_visible(json_extract(published,'$.displayMarket'),json_extract(published,'$.locales'),?,?)`,
        [tenantId, fixture, Number(config.enabledSections?.comingSoon !== false), config.displayMarket || '', JSON.stringify(config.enabledLocales || ['en-CA','fr-CA'])]];
      default: fail(400, 'invalid');
    }
  }
  function count(sql, values) { return db.prepare('SELECT count(*) AS n FROM (' + sql + ')').get(...values).n; }
  function catalogueStamp(tenantId) {
    return db.prepare(`SELECT (SELECT coalesce(max(version),0) FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published') || '-' ||
      (SELECT coalesce(max(id),0) FROM staff_events WHERE tenant_id = ? AND action IN ('coming_soon_published','coming_soon_archived')) AS stamp`).get(tenantId, tenantId).stamp;
  }
  function titleActivity(ctx, range) {
    // Use the most recent receipt in the reporting period for the bilingual historical name.
    const played = db.prepare(`WITH grouped AS (
      SELECT report_round_source(l.game,l.outcome) AS source, ${roundStatistics}, max(l.id) AS lastId
      ${roundActivity} GROUP BY source
    ) SELECT source, rounds, active_players, wagered_cents, l.game, l.outcome
      FROM grouped JOIN ledger l ON l.id = grouped.lastId ORDER BY rounds DESC, source`).all(...range);
    const titles = new Map(played.map(({ outcome, ...row }) => [row.source, { ...row, preview: roundPreview(outcome) }]));
    function include(source, game, preview) {
      if (!titles.has(source)) titles.set(source, { source, game, preview, rounds: 0, active_players: 0, wagered_cents: 0 });
    }
    for (const game of games) include('game:' + game.id, game.id, null);
    const [published, values] = query('published', ctx);
    const eligible = db.prepare('SELECT slug,titleEn,titleFr,demoGame FROM (' + published + ') WHERE demoGame IS NOT NULL ORDER BY slug').all(...values);
    for (const { demoGame, ...preview } of eligible) include('preview:' + preview.slug, demoGame, preview);
    return [...titles.values()];
  }

  function summary(ctx) {
    const totals = Object.fromEntries(metrics.map((metric) => [metric, count(...query(metric, ctx))]));
    const { tenantId, fixture, period, now } = ctx;
    const players = db.prepare(`SELECT count(*) AS total, coalesce(sum(email_verified),0) AS verified,
      count(*) FILTER (WHERE email_verified = 1 AND first_verified_at IS NULL) AS undated FROM players WHERE tenant_id = ? AND report_fixture = ?`).get(tenantId, fixture);
    const range = [tenantId, fixture, period.start, period.end];
    const gameplay = db.prepare('SELECT ' + roundStatistics + roundActivity).get(...range);
    const byGame = db.prepare('SELECT l.game, ' + roundStatistics + roundActivity + ' GROUP BY l.game ORDER BY rounds DESC, l.game').all(...range);
    const byTitle = titleActivity(ctx, range);
    const daily = db.prepare('SELECT report_calendar_day(l.created_at, ?) AS day, count(*) AS rounds' + roundActivity + ' GROUP BY day').all(period.zone, ...range);
    const byDay = new Map(daily.map(({ day, rounds }) => [day, rounds]));
    const support = db.prepare(`SELECT count(*) AS n FROM support_tickets t JOIN players p ON p.id = t.player_id AND p.tenant_id = t.tenant_id
      WHERE t.tenant_id = ? AND p.report_fixture = ? AND t.status = 'open'`).get(tenantId, fixture).n;
    return { totals, startedAt, undatedVerified: players.undated, hasFixtures: ctx.hasFixtures, scope: ctx.scope, brandId: tenantId,
      from: period.from, to: period.to, reportingTimeZone: period.zone, catalogueStamp: catalogueStamp(tenantId),
      playerAccounts: players.total, verifiedAccounts: players.verified, showcaseDataLoaded: ctx.scope === 'test' && ctx.hasFixtures,
      periodDays: period.days, demoRoundsInPeriod: gameplay.rounds, activeDemoPlayersInPeriod: gameplay.active_players,
      simulatedWagersCentsInPeriod: gameplay.wagered_cents, demoRoundsByGame: byGame, demoRoundsByTitle: byTitle,
      demoRoundsByDay: Array.from({ length: period.days }, (_, n) => { const day = dateAtOffset(period.from, n); return { day, rounds: byDay.get(day) || 0 }; }),
      openSupportTickets: support, publishedComingSoon: totals.published, firstComingSoonSaves: totals.saves, generatedAt: now };
  }
  function records(ctx, metric, params, role) {
    if (metric !== 'rounds' && !metrics.includes(metric)) fail(400, 'invalid');
    if (metric !== 'published' && !['operator_admin', 'operator_support'].includes(role)) fail(403, 'staffForbidden');
    if (params.has('stamp') && metric === 'published' && params.get('stamp') !== catalogueStamp(ctx.tenantId)) fail(409, 'reportChanged');
    const before = params.has('before') ? Number(params.get('before')) : null;
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) fail(400, 'invalid');
    const source = params.get('source');
    if (metric === 'rounds' && (typeof source !== 'string' || source.length > 72 ||
        !/^(?:preview|game):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source))) fail(400, 'invalid');
    const [sql, values] = query(metric, ctx, source);
    const rows = db.prepare('SELECT * FROM (' + sql + ') WHERE id < coalesce(?,9223372036854775807) ORDER BY id DESC LIMIT 11').all(...values, before);
    const entries = rows.slice(0, 10);
    if (metric === 'published') {
      const enabled = ctx.config.enabledLocales || ['en-CA', 'fr-CA'];
      for (const entry of entries) entry.locales = entry.locales ? JSON.parse(entry.locales).filter((locale) => enabled.includes(locale)) : enabled;
    }
    return { metric, total: count(sql, values), entries, nextCursor: rows.length > 10 ? entries.at(-1).id : null };
  }
  return { context, summary, records, recordVisit(tenantId, playerId, now = Date.now()) {
    visit.run(tenantId, playerId, Math.floor(now / 60_000), now);
  } };
}
