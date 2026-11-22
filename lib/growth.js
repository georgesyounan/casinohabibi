import { createHash, randomBytes } from 'node:crypto';
const day = 86400_000;
const digest = (v) => createHash('sha256').update(v).digest('hex');
const slug = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{1,47}$/.test(v);
const label = (v) => typeof v === 'string' && v.trim() && v.length <= 120;
export function createGrowth(db, { fail, audit, accountBreaks, getPreview }) {
  const q = (sql) => db.prepare(sql);
  db.exec(`CREATE TABLE IF NOT EXISTS growth_partners(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),owner INTEGER NOT NULL REFERENCES players(id),
    name TEXT NOT NULL,code TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,UNIQUE(tenant,code),UNIQUE(tenant,owner));
    CREATE TABLE IF NOT EXISTS growth_placements(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),slug TEXT NOT NULL,
      version INTEGER NOT NULL,draft TEXT NOT NULL,live TEXT,published_version INTEGER,active INTEGER NOT NULL,UNIQUE(tenant,slug));
    CREATE TABLE IF NOT EXISTS growth_creatives(placement INTEGER NOT NULL REFERENCES growth_placements(id),version INTEGER NOT NULL,spec TEXT NOT NULL,
      approved_at INTEGER NOT NULL,PRIMARY KEY(placement,version));
    CREATE TABLE IF NOT EXISTS growth_visits(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),visitor TEXT NOT NULL,
      partner INTEGER REFERENCES growth_partners(id),placement INTEGER REFERENCES growth_placements(id),at INTEGER NOT NULL,self_visit INTEGER NOT NULL,fixture INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS growth_visit_cookie ON growth_visits(tenant,visitor,id DESC);
    CREATE INDEX IF NOT EXISTS growth_visit_time ON growth_visits(tenant,at);
    CREATE TABLE IF NOT EXISTS growth_signups(player INTEGER PRIMARY KEY REFERENCES players(id),tenant TEXT NOT NULL REFERENCES tenants(id),
      partner INTEGER REFERENCES growth_partners(id),placement INTEGER REFERENCES growth_placements(id),visit INTEGER REFERENCES growth_visits(id),at INTEGER,
      source TEXT NOT NULL,review TEXT NOT NULL,flag TEXT NOT NULL,decision TEXT NOT NULL DEFAULT '',decided_at INTEGER,decision_id INTEGER);
    CREATE INDEX IF NOT EXISTS growth_signup_brand ON growth_signups(tenant,at,partner,placement);
    CREATE TABLE IF NOT EXISTS growth_first_saves(player INTEGER PRIMARY KEY REFERENCES players(id),tenant TEXT NOT NULL REFERENCES tenants(id),
      title INTEGER NOT NULL,activity INTEGER,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS growth_spend(placement INTEGER NOT NULL REFERENCES growth_placements(id),day TEXT NOT NULL,currency TEXT NOT NULL,cents INTEGER NOT NULL,
      PRIMARY KEY(placement,day));
    CREATE TABLE IF NOT EXISTS growth_experiments(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),placement INTEGER NOT NULL REFERENCES growth_placements(id),
      name TEXT NOT NULL,start INTEGER NOT NULL,end INTEGER NOT NULL,days INTEGER NOT NULL,holdout INTEGER NOT NULL,seed TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
    CREATE UNIQUE INDEX IF NOT EXISTS growth_active_test ON growth_experiments(placement) WHERE active=1;
    CREATE TABLE IF NOT EXISTS growth_assignments(experiment INTEGER NOT NULL REFERENCES growth_experiments(id),player INTEGER NOT NULL REFERENCES players(id),
      arm TEXT NOT NULL,at INTEGER NOT NULL,fixture INTEGER NOT NULL,PRIMARY KEY(experiment,player));
    CREATE TABLE IF NOT EXISTS growth_setup(id INTEGER PRIMARY KEY);`);
  if (!q('SELECT 1 FROM growth_setup WHERE id=1').get()) {
    // Older signups can be dated from the original starting-credit entry only when the time was recorded.
    db.exec(`INSERT OR IGNORE INTO growth_signups(player,tenant,at,source,review,flag)
      SELECT p.id,p.tenant_id,(SELECT min(l.created_at) FROM ledger l WHERE l.player=p.id AND l.tenant_id=p.tenant_id AND l.game IS NULL AND l.created_at>0 AND l.request_id IS NULL),'legacy','valid','' FROM players p;
      INSERT OR IGNORE INTO growth_first_saves(player,tenant,title,activity,at)
      SELECT s.player_id,s.tenant_id,s.title_id,a.id,a.created_at FROM coming_soon_activity a JOIN coming_soon_saves s ON s.id=a.save_id JOIN players p ON p.id=s.player_id AND p.tenant_id=s.tenant_id
      WHERE a.action='save' AND p.email_verified=1 AND NOT EXISTS(SELECT 1 FROM player_account_breaks b WHERE b.player_id=s.player_id AND b.tenant_id=s.tenant_id AND b.requested_at<=a.created_at AND b.ends_at>a.created_at)
      ORDER BY a.created_at,a.id; INSERT INTO growth_setup VALUES(1);`);
  }
  const partnerByCode = q('SELECT * FROM growth_partners WHERE tenant=? AND code=? AND active=1');
  const placement = q('SELECT * FROM growth_placements WHERE tenant=? AND id=?');
  const bySlug = q('SELECT * FROM growth_placements WHERE tenant=? AND slug=?');
  const owner = q('SELECT * FROM growth_partners WHERE tenant=? AND owner=? AND active=1');
  function partner(t, actor, request, { code, name, playerId, active = true, id }) {
    if (
      !slug(code) ||
      !label(name) ||
      !Number.isSafeInteger(playerId) ||
      typeof active !== 'boolean' ||
      !q('SELECT 1 FROM players WHERE tenant_id=? AND id=? AND email_verified=1').get(t, playerId)
    )
      fail(400, 'invalid');
    if (id && !q('SELECT 1 FROM growth_partners WHERE tenant=? AND id=?').get(t, id))
      fail(404, 'discoveryMissing');
    const used = q('SELECT id FROM growth_partners WHERE tenant=? AND (code=? OR owner=?) AND id<>?').get(
      t,
      code,
      playerId,
      id || 0
    );
    if (used) fail(409, 'discoveryConflict');
    let key = id;
    if (id)
      q('UPDATE growth_partners SET name=?,code=?,owner=?,active=? WHERE tenant=? AND id=?').run(
        name.trim(),
        code,
        playerId,
        Number(active),
        t,
        id
      );
    else
      key = Number(
        q('INSERT INTO growth_partners(tenant,owner,name,code,active) VALUES(?,?,?,?,?)').run(
          t,
          playerId,
          name.trim(),
          code,
          Number(active)
        ).lastInsertRowid
      );
    return {
      id: key,
      auditId: audit(t, actor, 'partner_saved', 'partner-' + key, request, {
        recordId: key,
        fields: ['partner']
      })
    };
  }
  function edit(t, actor, request, input) {
    const { action, id, version, slug: address } = input;
    if (!['save', 'publish', 'pause'].includes(action) || !Number.isSafeInteger(version) || version < 0)
      fail(400, 'invalid');
    const old = id ? placement.get(t, id) : null;
    if (id && !old) fail(404, 'discoveryMissing');
    if ((old?.version || 0) !== version) fail(409, 'discoveryConflict');
    if (!old && (action !== 'save' || !slug(address) || bySlug.get(t, address))) fail(400, 'invalid');
    const s = action === 'save' ? input.spec : JSON.parse(old.draft);
    if (
      !s ||
      ![s.titleEn, s.titleFr].every(label) ||
      ![s.textEn, s.textFr].every((v) => typeof v === 'string' && v.length <= 360) ||
      !/^[a-z0-9-]{1,64}$/.test(s.preview || '') ||
      ![s.start, s.end].every(Number.isSafeInteger) ||
      s.start < 0 ||
      s.end <= s.start ||
      !/^[A-Z]{3}$/.test(s.currency) ||
      !Number.isSafeInteger(s.budget) ||
      s.budget < 0 ||
      s.budget > 1e12
    )
      fail(400, 'invalid');
    if (
      s.partner != null &&
      !q('SELECT 1 FROM growth_partners WHERE tenant=? AND id=? AND active=1').get(t, s.partner)
    )
      fail(400, 'invalid');
    if (
      old &&
      action === 'save' &&
      q('SELECT 1 FROM growth_spend WHERE placement=? AND currency<>? LIMIT 1').get(old.id, s.currency)
    )
      fail(409, 'discoveryConflict');
    if (action === 'publish' && (!getPreview(t, s.preview) || s.end <= Date.now()))
      fail(409, 'discoveryClosed');
    const key =
      id ||
      Number(
        q('INSERT INTO growth_placements(tenant,slug,version,draft,active) VALUES(?,?,0,?,0)').run(
          t,
          address,
          JSON.stringify(s)
        ).lastInsertRowid
      );
    const next = version + 1;
    if (action === 'publish')
      q('INSERT INTO growth_creatives VALUES(?,?,?,?)').run(key, next, JSON.stringify(s), Date.now());
    q('UPDATE growth_placements SET version=?,draft=?,live=?,published_version=?,active=? WHERE id=?').run(
      next,
      JSON.stringify(s),
      action === 'publish' ? JSON.stringify(s) : (old?.live ?? null),
      action === 'publish' ? next : (old?.published_version ?? null),
      action === 'publish' ? 1 : action === 'pause' ? 0 : old?.active || 0,
      key
    );
    return {
      id: key,
      version: next,
      auditId: audit(t, actor, 'placement_' + action, 'placement-' + key, request, {
        recordId: key,
        revision: next,
        fields: ['creative']
      })
    };
  }
  function standing(t, p, now) {
    if (!p?.active || !p.live) return null;
    const s = JSON.parse(p.live);
    if (now < s.start || now >= s.end || !getPreview(t, s.preview)) return null;
    return s;
  }
  function assignment(t, p, player, now) {
    if (player) {
      const observed =
        q(`SELECT a.arm FROM growth_assignments a JOIN growth_experiments e ON e.id=a.experiment WHERE e.tenant=? AND e.placement=?
        AND a.player=? AND (a.at+e.days*86400000>? OR (e.active=1 AND e.start<=? AND e.end>?)) ORDER BY a.at DESC LIMIT 1`).get(
          t,
          p.id,
          player,
          now,
          now,
          now
        );
      if (observed) return observed.arm;
    }
    const ex = q(
      'SELECT * FROM growth_experiments WHERE tenant=? AND placement=? AND active=1 AND start<=? AND end>?'
    ).get(t, p.id, now, now);
    if (!ex) return 'treatment';
    if (!player) return 'outside';
    const old = q('SELECT arm FROM growth_assignments WHERE experiment=? AND player=?').get(ex.id, player);
    if (old) return old.arm;
    const profile = q(
      "SELECT report_fixture FROM players WHERE tenant_id=? AND id=? AND access_status='active' AND email_verified=1"
    ).get(t, player);
    if (
      !profile ||
      q('SELECT 1 FROM growth_first_saves WHERE player=?').get(player) ||
      accountBreaks.at(t, player, now)
    )
      return 'outside';
    const arm =
      Number.parseInt(digest(ex.seed + '|' + t + '|' + player).slice(0, 8), 16) % 100 < ex.holdout
        ? 'holdout'
        : 'treatment';
    q('INSERT INTO growth_assignments VALUES(?,?,?,?,?)').run(ex.id, player, arm, now, profile.report_fixture);
    return arm;
  }
  function banner(t, player, now = Date.now()) {
    if (player && accountBreaks.at(t, player, now)) return null;
    for (const p of q('SELECT * FROM growth_placements WHERE tenant=? AND active=1 ORDER BY id DESC').all(t)) {
      const s = standing(t, p, now);
      if (s && assignment(t, p, player, now) === 'treatment')
        return {
          slug: p.slug,
          titleEn: s.titleEn,
          titleFr: s.titleFr,
          textEn: s.textEn,
          textFr: s.textFr,
          expires: s.end
        };
    }
    return null;
  }
  function click(t, kind, code, rawCookie, player, now = Date.now()) {
    let partner, place, s;
    if (kind === 'r') {
      partner = partnerByCode.get(t, code);
      if (!partner) fail(404, 'discoveryMissing');
    } else {
      place = bySlug.get(t, code);
      s = standing(t, place, now);
      if (
        !s ||
        (player && accountBreaks.at(t, player, now)) ||
        assignment(t, place, player, now) !== 'treatment'
      )
        fail(404, 'discoveryMissing');
      if (s.partner)
        partner = q('SELECT * FROM growth_partners WHERE tenant=? AND id=? AND active=1').get(t, s.partner);
    }
    const token = /^[a-f0-9]{64}$/.test(rawCookie || '') ? rawCookie : randomBytes(32).toString('hex'),
      visitor = digest(token);
    const previous = q('SELECT * FROM growth_visits WHERE tenant=? AND visitor=? ORDER BY id DESC LIMIT 1').get(
      t,
      visitor
    );
    if (!partner && place && previous?.partner && now - previous.at < 30 * day)
      partner = q('SELECT * FROM growth_partners WHERE tenant=? AND id=? AND active=1').get(
        t,
        previous.partner
      );
    const fixture = player
      ? q('SELECT report_fixture FROM players WHERE tenant_id=? AND id=?').get(t, player)?.report_fixture || 0
      : Number(Boolean(q('SELECT 1 FROM report_fixture_tenants WHERE tenant_id=?').get(t)));
    const self = Number(Boolean(player && partner?.owner === player));
    if (
      !previous ||
      previous.partner !== (partner?.id ?? null) ||
      previous.placement !== (place?.id ?? null) ||
      now - previous.at >= day ||
      previous.self_visit !== self ||
      previous.fixture !== fixture
    ) {
      q(
        'INSERT INTO growth_visits(tenant,visitor,partner,placement,at,self_visit,fixture) VALUES(?,?,?,?,?,?,?)'
      ).run(t, visitor, partner?.id ?? null, place?.id ?? null, now, self, fixture);
    }
    return { token, path: place ? '/coming-soon/' + s.preview : '/' };
  }
  function signup(t, player, raw, code, now = Date.now()) {
    if (code != null && (typeof code !== 'string' || code.length > 48)) fail(400, 'invalid');
    const typed = code?.trim().toLowerCase();
    const fromCode = typed && partnerByCode.get(t, typed);
    if (typed && !fromCode) fail(400, 'referralInvalid');
    const v =
      /^[a-f0-9]{64}$/.test(raw || '') &&
      q('SELECT * FROM growth_visits WHERE tenant=? AND visitor=? AND at>=? ORDER BY id DESC LIMIT 1').get(
        t,
        digest(raw),
        now - 30 * day
      );
    const fromLink =
      v?.partner && q('SELECT * FROM growth_partners WHERE tenant=? AND id=? AND active=1').get(t, v.partner);
    const credited = fromCode || fromLink,
      duplicate =
        v &&
        credited &&
        q(
          `SELECT 1 FROM growth_signups s JOIN growth_visits old ON old.id=s.visit WHERE s.tenant=? AND old.visitor=? AND s.partner=? LIMIT 1`
        ).get(t, v.visitor, credited.id);
    const flag =
      credited && (credited.owner === player || (v?.self_visit && credited.id === v.partner))
        ? 'self'
        : duplicate
          ? 'duplicate'
          : '';
    // A code for another partner displaces that partner's tagged campaign as well.
    const campaign = v && (!fromCode || !v.partner || fromCode.id === v.partner) ? v.placement : null;
    q(
      'INSERT INTO growth_signups(player,tenant,partner,placement,visit,at,source,review,flag) VALUES(?,?,?,?,?,?,?,?,?)'
    ).run(
      player,
      t,
      credited?.id ?? null,
      campaign || null,
      v?.id ?? null,
      now,
      fromCode ? 'code' : v ? 'link' : 'direct',
      flag ? 'pending' : 'valid',
      flag
    );
  }
  function save(t, player, title, activity, now) {
    if (!accountBreaks.at(t, player, now))
      q('INSERT OR IGNORE INTO growth_first_saves VALUES(?,?,?,?,?)').run(player, t, title, activity, now);
  }
  function decide(t, actor, request, { playerId, decision, reason }) {
    if (
      !['valid', 'ineligible'].includes(decision) ||
      typeof reason !== 'string' ||
      !reason.trim() ||
      reason.length > 240
    )
      fail(400, 'invalid');
    const record = q('SELECT review FROM growth_signups WHERE tenant=? AND player=?').get(t, playerId);
    if (!record) fail(404, 'discoveryMissing');
    if (record.review !== 'pending') fail(409, 'discoveryConflict');
    const auditId = audit(t, actor, 'referral_reviewed', 'player-' + playerId, request, {
      recordId: playerId,
      fields: ['review'],
      reason: reason.trim()
    });
    q('UPDATE growth_signups SET review=?,decision=?,decided_at=?,decision_id=? WHERE player=?').run(
      decision,
      reason.trim(),
      Date.now(),
      auditId,
      playerId
    );
    return { auditId, decision };
  }
  function spend(t, actor, request, { id, entries }) {
    const p = placement.get(t, id);
    if (!p) fail(404, 'discoveryMissing');
    const currency = JSON.parse(p.live || p.draft).currency;
    if (!Array.isArray(entries) || !entries.length || entries.length > 366) fail(400, 'invalid');
    for (const e of entries) {
      if (
        !e ||
        !/^\d{4}-\d\d-\d\d$/.test(e.day) ||
        !Number.isFinite(Date.parse(e.day)) ||
        new Date(e.day).toISOString().slice(0, 10) !== e.day ||
        e.currency !== currency ||
        !Number.isSafeInteger(e.cents) ||
        e.cents < 0 ||
        e.cents > 1e12
      )
        fail(400, 'invalid');
      q(
        'INSERT INTO growth_spend VALUES(?,?,?,?) ON CONFLICT(placement,day) DO UPDATE SET currency=excluded.currency,cents=excluded.cents'
      ).run(id, e.day, currency, e.cents);
    }
    return {
      auditId: audit(t, actor, 'campaign_spend', 'placement-' + id, request, {
        recordId: id,
        fields: ['spend']
      })
    };
  }
  function experiment(t, actor, request, s) {
    if (s.close) {
      const done = q('UPDATE growth_experiments SET active=0 WHERE tenant=? AND id=? AND active=1').run(
        t,
        s.close
      );
      if (!done.changes) fail(409, 'discoveryConflict');
      return {
        id: s.close,
        auditId: audit(t, actor, 'experiment_closed', 'experiment-' + s.close, request, {
          recordId: s.close,
          fields: ['active']
        })
      };
    }
    const p = placement.get(t, s.placement);
    if (
      !p?.live ||
      !label(s.name) ||
      ![s.start, s.end, s.days, s.holdout].every(Number.isSafeInteger) ||
      s.start < 0 ||
      s.end <= s.start ||
      s.days < 1 ||
      s.days > 90 ||
      s.holdout < 1 ||
      s.holdout > 99
    )
      fail(400, 'invalid');
    if (q('SELECT 1 FROM growth_experiments WHERE placement=? AND active=1').get(p.id))
      fail(409, 'discoveryConflict');
    const id = Number(
      q(
        'INSERT INTO growth_experiments(tenant,placement,name,start,end,days,holdout,seed) VALUES(?,?,?,?,?,?,?,?)'
      ).run(t, p.id, s.name, s.start, s.end, s.days, s.holdout, randomBytes(16).toString('hex')).lastInsertRowid
    );
    return {
      id,
      auditId: audit(t, actor, 'experiment_started', 'experiment-' + id, request, {
        recordId: id,
        fields: ['assignment']
      })
    };
  }
  function delivery(t, p, now = Date.now()) {
    if (!p.live) return 'draft';
    if (!p.active) return 'paused';
    const s = JSON.parse(p.live);
    if (now >= s.end) return 'expired';
    if (!getPreview(t, s.preview)) return 'destination';
    return now < s.start ? 'scheduled' : 'published';
  }
  function staff(t) {
    return {
      partners: q('SELECT id,name,code,owner,active FROM growth_partners WHERE tenant=? ORDER BY id DESC').all(
        t
      ),
      placements: q('SELECT * FROM growth_placements WHERE tenant=? ORDER BY id DESC')
        .all(t)
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          version: p.version,
          live: p.published_version,
          active: Boolean(p.active),
          delivery: delivery(t, p),
          history: q(
            "SELECT version,approved_at AS at,json_extract(spec,'$.titleEn') AS titleEn,json_extract(spec,'$.titleFr') AS titleFr FROM growth_creatives WHERE placement=? ORDER BY version DESC"
          ).all(p.id),
          spec: JSON.parse(p.draft)
        })),
      pending: q(
        "SELECT player,partner,flag FROM growth_signups WHERE tenant=? AND review='pending' ORDER BY player DESC"
      ).all(t),
      experiments: q(
        'SELECT id,name,placement,start,end,days,holdout,active FROM growth_experiments WHERE tenant=? ORDER BY id DESC'
      ).all(t)
    };
  }
  function report(ctx, filters = {}, restricted) {
    const { tenantId: t, fixture, period, now } = ctx;
    for (const key of ['partner', 'placement'])
      if (filters[key] && !/^[1-9]\d{0,14}$/.test(filters[key])) fail(400, 'invalid');
    const partner = restricted?.id || Number(filters.partner) || null,
      place = Number(filters.placement) || null;
    if (
      (partner && !q('SELECT 1 FROM growth_partners WHERE tenant=? AND id=?').get(t, partner)) ||
      (place && !placement.get(t, place))
    )
      fail(404, 'discoveryMissing');
    const base = `FROM growth_signups s JOIN players p ON p.id=s.player AND p.tenant_id=s.tenant LEFT JOIN growth_first_saves f ON f.player=s.player AND f.tenant=s.tenant
      WHERE s.tenant=? AND p.report_fixture=? AND (? IS NULL OR s.partner=?) AND (? IS NULL OR s.placement=?)`;
    const args = [t, fixture, partner, partner, place, place],
      range = [period.start, period.end];
    // Keep signup, verification and qualified-save dates distinct when the filter spans a boundary.
    const validAt = "s.review='valid' AND (s.decided_at IS NULL OR s.decided_at<=?)";
    const totals = q(`SELECT count(CASE WHEN s.at>=? AND s.at<? THEN 1 END) AS signups,
      count(CASE WHEN p.first_verified_at>=? AND p.first_verified_at<? THEN 1 END) AS verified,
      count(CASE WHEN p.first_verified_at<=? AND f.at>=? AND f.at<? AND ${validAt} THEN 1 END) AS qualified,
      count(CASE WHEN s.at>=? AND s.at<? AND s.flag<>'' AND (s.review='pending' OR s.decided_at>?) THEN 1 END) AS pending,
      count(CASE WHEN s.at>=? AND s.at<? AND p.first_verified_at<=? AND s.at+7*86400000<=? THEN 1 END) AS mature,
      count(CASE WHEN s.at>=? AND s.at<? AND p.first_verified_at<=? AND s.at+7*86400000<=? AND f.at BETWEEN s.at AND s.at+7*86400000 THEN 1 END) AS activated
      ${base}`).get(
      ...range,
      ...range,
      now,
      ...range,
      now,
      ...range,
      now,
      ...range,
      now,
      now,
      ...range,
      now,
      now,
      ...args
    );
    const ret =
      q(`SELECT count(*) AS mature,count(CASE WHEN EXISTS(SELECT 1 FROM player_report_visits v WHERE v.tenant_id=s.tenant AND v.player_id=s.player AND v.visited_at BETWEEN f.at+24*86400000 AND f.at+30*86400000) THEN 1 END) AS returned
      ${base} AND f.at>=? AND f.at<? AND f.at+30*86400000<=?`).get(...args, ...range, now);
    const visits = q(
      'SELECT count(*) AS n FROM growth_visits WHERE tenant=? AND fixture=? AND at>=? AND at<? AND (? IS NULL OR partner=?) AND (? IS NULL OR placement=?)'
    ).get(t, fixture, ...range, partner, partner, place, place).n;
    const result = {
      period,
      scope: ctx.scope,
      asOf: now,
      visits,
      ...totals,
      returnCohort: ret.mature,
      returning: ret.returned,
      activationRate: totals.mature ? totals.activated / totals.mature : null,
      returnRate: ret.mature ? ret.returned / ret.mature : null
    };
    const funnel = q(`SELECT count(DISTINCT v.visitor) AS taggedVisitors,
      count(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM growth_signups x JOIN growth_visits xv ON xv.id=x.visit JOIN players xp ON xp.id=x.player
        WHERE x.tenant=v.tenant AND xp.report_fixture=v.fixture AND xv.visitor=v.visitor AND x.at>=v.at AND x.at<=? AND (? IS NULL OR x.partner=?) AND (? IS NULL OR x.placement=?)) THEN v.visitor END) AS convertedVisitors
      FROM growth_visits v WHERE v.tenant=? AND v.fixture=? AND v.at>=? AND v.at<? AND (? IS NULL OR v.partner=?) AND (? IS NULL OR v.placement=?)`).get(
      now,
      partner,
      partner,
      place,
      place,
      t,
      fixture,
      ...range,
      partner,
      partner,
      place,
      place
    );
    Object.assign(result, funnel, {
      visitSignupRate: funnel.taggedVisitors ? funnel.convertedVisitors / funnel.taggedVisitors : null
    });
    if (restricted) return result;
    result.breakdown = q(`SELECT s.source,count(CASE WHEN s.at>=? AND s.at<? THEN 1 END) AS signups,
      count(CASE WHEN p.first_verified_at<=? AND f.at>=? AND f.at<? AND ${validAt} THEN 1 END) AS qualified ${base}
      GROUP BY s.source HAVING signups>0 OR qualified>0 ORDER BY s.source`).all(
      ...range,
      now,
      ...range,
      now,
      ...args
    );
    if (filters.metric) {
      const metric = filters.metric,
        zone = period.zone;
      const sources = {
        visits: [
          'v.at',
          'FROM growth_visits v WHERE v.tenant=? AND v.fixture=? AND (? IS NULL OR v.partner=?) AND (? IS NULL OR v.placement=?)',
          '',
          []
        ],
        verified: ['p.first_verified_at', base, '', []],
        qualified: ['f.at', base, ' AND p.first_verified_at<=? AND ' + validAt, [now, now]],
        activated: [
          's.at',
          base,
          ' AND p.first_verified_at<=? AND s.at+7*86400000<=? AND f.at BETWEEN s.at AND s.at+7*86400000',
          [now, now]
        ],
        returning: [
          'f.at',
          base,
          ' AND f.at+30*86400000<=? AND EXISTS(SELECT 1 FROM player_report_visits v WHERE v.tenant_id=s.tenant AND v.player_id=s.player AND v.visited_at BETWEEN f.at+24*86400000 AND f.at+30*86400000)',
          [now]
        ]
      };
      if (!Object.hasOwn(sources, metric)) fail(400, 'invalid');
      const [event, from, conditions, extra] = sources[metric];
      result.daily =
        q(`SELECT report_calendar_day(${event},?) AS day,count(*) AS total ${from} AND ${event}>=? AND ${event}<? ${conditions}
        GROUP BY day ORDER BY day`).all(zone, ...args, ...range, ...extra);
    }
    const costs =
      place && !partner
        ? q(
            'SELECT currency,sum(cents) AS cents FROM growth_spend WHERE placement=? AND day BETWEEN ? AND ? GROUP BY currency'
          ).all(place, period.from, period.to)
        : [];
    const first = q(`SELECT count(*) AS n ${base} AND f.at>=? AND f.at<? AND ${validAt}`).get(
      ...args,
      ...range,
      now
    ).n;
    result.costs = costs.map((c) => ({
      ...c,
      budget: JSON.parse(placement.get(t, place).live || placement.get(t, place).draft).budget,
      firstSavers: first,
      perSaver: first ? c.cents / first : null
    }));
    result.experiments = partner
      ? []
      : q(`SELECT e.id,e.name,a.arm,count(*) AS cohort,count(CASE WHEN f.at BETWEEN a.at AND a.at+e.days*86400000 THEN 1 END) AS converted
      FROM growth_experiments e JOIN growth_assignments a ON a.experiment=e.id LEFT JOIN growth_first_saves f ON f.player=a.player AND f.tenant=e.tenant
      WHERE e.tenant=? AND a.fixture=? AND a.at>=? AND a.at<? AND a.at+e.days*86400000<=? AND (? IS NULL OR e.placement=?)
      GROUP BY e.id,a.arm ORDER BY e.id,a.arm`).all(t, fixture, ...range, now, place, place);
    return result;
  }
  function approved(t, partner, now = Date.now()) {
    return q('SELECT * FROM growth_placements WHERE tenant=? AND active=1 ORDER BY id DESC')
      .all(t)
      .flatMap((p) => {
        const s = standing(t, p, now);
        return s?.partner === partner
          ? [
              {
                slug: p.slug,
                titleEn: s.titleEn,
                titleFr: s.titleFr,
                textEn: s.textEn,
                textFr: s.textFr,
                expires: s.end
              }
            ]
          : [];
      });
  }
  return {
    approved,
    partner,
    edit,
    banner,
    click,
    signup,
    save,
    decide,
    spend,
    experiment,
    report,
    staff,
    owner: (t, p) => owner.get(t, p)
  };
}
