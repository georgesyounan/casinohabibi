import { randomUUID } from 'node:crypto';

const marketDefaults = { north: ['age', 'photo'], south: ['age', 'photo', 'address'] };
const documents = ['age', 'photo', 'address', 'face', 'liveness'];
const sampleAges = { 'sample-30': 30, 'sample-19': 19, 'sample-16': 16 };
const states = ['pending', 'review', 'more', 'approved', 'declined', 'expired'];
const reasons = [
  'confirmed',
  'incomplete',
  'mismatch',
  'corrected',
  'fixture_expiry',
  'inspected',
  'list_change',
  'risk_confirmed',
];
const signals = ['shared_device', 'bonus_pattern', 'payment_pattern', 'screening'];

export function createReviewDesk(db, { fail, audit, clock = Date.now, createWallet }) {
  db.exec(`CREATE TABLE IF NOT EXISTS review_policies(
    tenant TEXT NOT NULL REFERENCES tenants(id),market TEXT NOT NULL,version INTEGER NOT NULL,documents TEXT NOT NULL,
    days INTEGER NOT NULL,min_age INTEGER NOT NULL,dual_release INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(tenant,market,version));
    CREATE TABLE IF NOT EXISTS review_subjects(
    id TEXT PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),label TEXT NOT NULL,market TEXT NOT NULL,
    player INTEGER REFERENCES players(id),wallet TEXT NOT NULL UNIQUE REFERENCES pilot_runs(id),revision INTEGER NOT NULL,
    opened INTEGER NOT NULL,UNIQUE(tenant,player));
    CREATE INDEX IF NOT EXISTS review_subject_lookup ON review_subjects(tenant,opened DESC,id);
    CREATE TABLE IF NOT EXISTS identity_checks(
    subject TEXT NOT NULL REFERENCES review_subjects(id),cycle INTEGER NOT NULL,policy INTEGER NOT NULL,
    docs TEXT NOT NULL,state TEXT NOT NULL,decision INTEGER REFERENCES staff_events(id),expires INTEGER,
    reviewer INTEGER REFERENCES staff_accounts(id),results TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(subject,cycle));
    CREATE TABLE IF NOT EXISTS review_events(
    id INTEGER PRIMARY KEY AUTOINCREMENT,subject TEXT NOT NULL REFERENCES review_subjects(id),cycle INTEGER NOT NULL,
    kind TEXT NOT NULL,reason TEXT,detail TEXT NOT NULL,at INTEGER NOT NULL,public_state TEXT);
    CREATE INDEX IF NOT EXISTS review_event_lookup ON review_events(subject,id DESC);
    CREATE TABLE IF NOT EXISTS review_vendor_receipts(
    subject TEXT NOT NULL REFERENCES review_subjects(id),source TEXT NOT NULL,external_id TEXT NOT NULL,
    payload TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(subject,source,external_id));
    CREATE TABLE IF NOT EXISTS screening_cases(
    id TEXT PRIMARY KEY,subject TEXT NOT NULL REFERENCES review_subjects(id),kind TEXT NOT NULL,marker TEXT NOT NULL,
    list_version INTEGER NOT NULL,prior TEXT REFERENCES screening_cases(id),status TEXT NOT NULL,version INTEGER NOT NULL,
    owner INTEGER REFERENCES staff_accounts(id),opened INTEGER NOT NULL,reason TEXT,
    UNIQUE(subject,kind,marker,list_version));
    CREATE TABLE IF NOT EXISTS review_holds(
    id TEXT PRIMARY KEY,subject TEXT NOT NULL REFERENCES review_subjects(id),risk TEXT NOT NULL REFERENCES screening_cases(id),
    started INTEGER NOT NULL,reason TEXT NOT NULL,ended INTEGER,end_reason TEXT,dual_release INTEGER NOT NULL,requested_by INTEGER REFERENCES staff_accounts(id),requested_at INTEGER,requested_reason TEXT);
    CREATE UNIQUE INDEX IF NOT EXISTS review_active_case_hold ON review_holds(risk) WHERE ended IS NULL;`);
  const q = (s) => db.prepare(s);
  const now = () => clock();
  const defaultPolicy = (market) => ({
    market,
    version: 0,
    documents: marketDefaults[market],
    days: 30,
    minAge: market === 'south' ? 21 : 18,
    dualRelease: false,
  });
  function policy(tenant, market, version) {
    if (!Object.hasOwn(marketDefaults, market)) fail(400, 'invalid');
    const row =
      version === undefined
        ? q(
            'SELECT * FROM review_policies WHERE tenant=? AND market=? ORDER BY version DESC LIMIT 1',
          ).get(tenant, market)
        : q('SELECT * FROM review_policies WHERE tenant=? AND market=? AND version=?').get(
            tenant,
            market,
            version,
          );
    if (!row) {
      if (version > 0) fail(409, 'opStale');
      return defaultPolicy(market);
    }
    return {
      market,
      version: row.version,
      documents: JSON.parse(row.documents),
      days: row.days,
      minAge: row.min_age,
      dualRelease: Boolean(row.dual_release),
    };
  }
  function subject(tenant, id) {
    if (typeof id !== 'string') fail(404, 'opMissing');
    const s = q('SELECT * FROM review_subjects WHERE tenant=? AND id=?').get(tenant, id);
    if (!s) fail(404, 'opMissing');
    return s;
  }
  const current = (id) =>
    q('SELECT * FROM identity_checks WHERE subject=? ORDER BY cycle DESC LIMIT 1').get(id);
  function effective(tenant, s, c) {
    if (c.state === 'approved' && (c.expires <= now() || c.policy !== policy(tenant, s.market).version))
      return 'expired';
    return c.state;
  }
  function eligibility(tenant, id) {
    const s = subject(tenant, id),
      c = current(id),
      state = effective(tenant, s, c);
    const hold = q(
      'SELECT id FROM review_holds WHERE subject=? AND ended IS NULL ORDER BY started,id LIMIT 1',
    ).get(id);
    return {
      allowed: state === 'approved' && !hold,
      reason: state !== 'approved' ? 'identity_required' : hold ? 'payout_hold' : 'eligible',
      state,
      decision: c.decision,
      policy: c.policy,
      hold: hold?.id ?? null,
    };
  }
  const documentation = (c) => JSON.parse(c.docs);
  function timeline(id, publicOnly, before = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(before) || before < 1) fail(400, 'invalid');
    const rows = q(`SELECT id,cycle,kind,reason,detail,at,public_state AS state FROM review_events
      WHERE subject=? AND id<? ${publicOnly ? 'AND public_state IS NOT NULL' : ''} ORDER BY id DESC LIMIT 13`).all(
      id,
      before,
    );
    const items = rows
      .slice(0, 12)
      .map((e) =>
        publicOnly
          ? { id: e.id, cycle: e.cycle, state: e.state, at: e.at }
          : { ...e, detail: JSON.parse(e.detail) },
      );
    return { items, next: rows.length > 12 ? items.at(-1).id : null };
  }
  function card(tenant, s) {
    const c = current(s.id);
    return {
      id: s.id,
      label: s.label,
      market: s.market,
      version: s.revision,
      cycle: c.cycle,
      policy: c.policy,
      state: effective(tenant, s, c),
      expires: c.expires,
    };
  }
  function detail(tenant, staff, id, before) {
    const s = subject(tenant, id),
      c = current(id),
      info = card(tenant, s),
      admin = staff.role === 'operator_admin';
    if (!admin) return { ...info, timeline: timeline(id, true, before) };
    return {
      ...info,
      player: s.player,
      decision: c.decision,
      reviewer: c.reviewer,
      results: JSON.parse(c.results),
      minimumAge: policy(tenant, s.market, c.policy).minAge,
      documents: documentation(c),
      required: policy(tenant, s.market, c.policy).documents,
      currentPolicy: policy(tenant, s.market),
      timeline: timeline(id, false, before),
      eligibility: eligibility(tenant, id),
      risks: q(
        "SELECT id,kind,marker,CASE WHEN kind='screening' THEN 'fixture-watchlist' ELSE 'fixture-signals' END AS provider,list_version AS listVersion,prior,status,version,owner,reason FROM screening_cases WHERE subject=? ORDER BY opened DESC,rowid DESC",
      ).all(id),
      holds: q(
        'SELECT id,risk,started,reason,ended,end_reason AS endReason,dual_release AS dualRelease,requested_by AS requestedBy,requested_at AS requestedAt,requested_reason AS requestedReason FROM review_holds WHERE subject=? ORDER BY started DESC,rowid DESC',
      ).all(id),
    };
  }
  function list(tenant, params) {
    const text = (params.get('q') || '').trim(),
      page = Number(params.get('page') || 1),
      state = params.get('state') || '';
    if (
      text.length > 80 ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      (state && !states.includes(state))
    )
      fail(400, 'invalid');
    const source = ` FROM (SELECT s.id,s.label,s.market,s.revision AS version,s.opened,c.cycle,c.policy,c.expires,
      CASE WHEN c.state='approved' AND (c.expires<=? OR c.policy<>coalesce((SELECT max(p.version) FROM review_policies p
        WHERE p.tenant=s.tenant AND p.market=s.market),0)) THEN 'expired' ELSE c.state END AS effective_state
      FROM review_subjects s JOIN identity_checks c ON c.subject=s.id AND c.cycle=(SELECT max(x.cycle) FROM identity_checks x WHERE x.subject=s.id)
      WHERE s.tenant=? AND (instr(lower(s.label),lower(?))>0 OR s.id=?)) WHERE (?='' OR effective_state=?)`;
    const args = [now(), tenant, text, text, state, state],
      total = q('SELECT count(*) AS n' + source).get(...args).n;
    const actual = Math.min(page, Math.max(1, Math.ceil(total / 8)));
    return {
      page: actual,
      total,
      items: q(
        'SELECT id,label,market,version,cycle,policy,expires,effective_state AS state' +
          source +
          ' ORDER BY opened DESC,id LIMIT 8 OFFSET ?',
      ).all(...args, (actual - 1) * 8),
    };
  }
  function event(s, c, kind, reason, detail = {}, publicState = null) {
    q(
      'INSERT INTO review_events(subject,cycle,kind,reason,detail,at,public_state) VALUES(?,?,?,?,?,?,?)',
    ).run(s.id, c.cycle, kind, reason || null, JSON.stringify(detail), now(), publicState);
  }
  function bump(id) {
    q('UPDATE review_subjects SET revision=revision+1 WHERE id=?').run(id);
  }
  function addEvidence(s, c, type, sample) {
    const p = policy(s.tenant, s.market, c.policy);
    if (!p.documents.includes(type) || !['pending', 'more'].includes(c.state)) fail(409, 'reviewState');
    const age = type === 'age';
    const value = sample ?? (age ? 'sample-30' : 'match');
    if (age ? !Object.hasOwn(sampleAges, value) : !['match', 'mismatch'].includes(value))
      fail(400, 'invalid');
    const docs = documentation(c),
      results = JSON.parse(c.results);
    if (results[type]?.sample === value) return;
    if (!docs.includes(type)) docs.push(type);
    results[type] = { sample: value, passed: age ? sampleAges[value] >= p.minAge : value === 'match' };
    q("UPDATE identity_checks SET docs=?,results=?,state='pending' WHERE subject=? AND cycle=?").run(
      JSON.stringify(docs),
      JSON.stringify(results),
      s.id,
      c.cycle,
    );
    event(s, c, 'evidence', '', { type, sample: value, passed: results[type].passed }, 'pending');
    bump(s.id);
  }
  function playerView(tenant, player, before) {
    const s = q('SELECT * FROM review_subjects WHERE tenant=? AND player=?').get(tenant, player);
    if (!s) return { subject: null };
    const c = current(s.id);
    return {
      subject: {
        state: effective(tenant, s, c),
        cycle: c.cycle,
        version: s.revision,
        market: s.market,
        expires: c.expires,
        required: policy(tenant, s.market, c.policy).documents,
        submitted: documentation(c),
        timeline: timeline(s.id, true, before),
      },
    };
  }
  function playerEvidence(tenant, player, input) {
    const s = q('SELECT * FROM review_subjects WHERE tenant=? AND player=?').get(tenant, player);
    if (!s) fail(404, 'opMissing');
    const c = current(s.id);
    if (input.cycle !== c.cycle || input.version !== s.revision) fail(409, 'opStale');
    addEvidence(s, c, input.type, input.sample);
    return playerView(tenant, player);
  }
  function settings(tenant) {
    return Object.keys(marketDefaults).map((m) => policy(tenant, m));
  }
  const validReason = (r) => {
    if (!reasons.includes(r)) fail(400, 'invalid');
    return r;
  };
  function change(tenant, staff, request, input) {
    const a = input.action;
    if (a === 'policy') {
      const p = policy(tenant, input.market);
      if (input.version !== p.version) fail(409, 'opStale');
      if (
        !Array.isArray(input.documents) ||
        !input.documents.includes('age') ||
        new Set(input.documents).size !== input.documents.length ||
        input.documents.some((d) => !documents.includes(d)) ||
        !Number.isInteger(input.days) ||
        input.days < 1 ||
        input.days > 365
      )
        fail(400, 'invalid');
      const age = input.minAge ?? p.minAge;
      if (![18, 19, 21].includes(age)) fail(400, 'invalid');
      const dual = input.dualRelease ?? p.dualRelease;
      if (typeof dual !== 'boolean') fail(400, 'invalid');
      const v = p.version + 1;
      q('INSERT INTO review_policies VALUES(?,?,?,?,?,?,?,?)').run(
        tenant,
        p.market,
        v,
        JSON.stringify(input.documents),
        input.days,
        age,
        Number(dual),
        now(),
      );
      return {
        version: v,
        auditId: audit(tenant, staff.id, 'review_policy', p.market, request, { version: v }),
      };
    }
    if (a === 'create') {
      const p = policy(tenant, input.market),
        id = randomUUID(),
        label = String(input.label ?? '').trim();
      if (!label || label.length > 64) fail(400, 'invalid');
      if (
        input.player != null &&
        (!Number.isSafeInteger(input.player) ||
          !q('SELECT 1 FROM players WHERE tenant_id=? AND id=? AND report_fixture=1').get(
            tenant,
            input.player,
          ))
      )
        fail(400, 'reviewFixture');
      if (
        input.player != null &&
        q('SELECT 1 FROM review_subjects WHERE tenant=? AND player=?').get(tenant, input.player)
      )
        fail(409, 'opStale');
      const wallet = createWallet(tenant, staff.id);
      q('INSERT INTO review_subjects VALUES(?,?,?,?,?,?,1,?)').run(
        id,
        tenant,
        label,
        p.market,
        input.player ?? null,
        wallet,
        now(),
      );
      q("INSERT INTO identity_checks(subject,cycle,policy,docs,state) VALUES(?,1,?,'[]','pending')").run(
        id,
        p.version,
      );
      event({ id }, { cycle: 1 }, 'opened', '', {}, 'pending');
      return {
        id,
        auditId: audit(tenant, staff.id, 'review_opened', id, request, { policy: p.version }),
      };
    }
    const s = subject(tenant, input.id),
      c = current(s.id);
    const provider = ['callback', 'signal'].includes(a);
    let external, payload;
    if (provider) {
      if (typeof input.eventId !== 'string' || !/^[a-zA-Z0-9._-]{1,90}$/.test(input.eventId))
        fail(400, 'invalid');
      external = input.eventId;
      payload = JSON.stringify(
        a === 'callback'
          ? [input.cycle, input.outcome]
          : [input.kind, input.marker, input.listVersion || 0],
      );
      const seen = q(
        'SELECT * FROM review_vendor_receipts WHERE subject=? AND source=? AND external_id=?',
      ).get(s.id, a, external);
      if (seen) {
        if (seen.payload !== payload) fail(409, 'staffRequestConflict');
        return JSON.parse(seen.response);
      }
    }
    if (!provider && input.version !== s.revision) fail(409, 'opStale');
    let result = {},
      why = null,
      details = {},
      recordedAction = a;
    const stamp = () =>
      audit(tenant, staff.id, 'review_' + recordedAction, s.id, request, { cycle: c.cycle });
    let auditId;
    if (a === 'evidence') {
      addEvidence(s, c, input.type, input.sample);
      return { id: s.id, auditId: stamp() };
    } else if (a === 'callback') {
      if (input.cycle !== c.cycle || !['pending', 'review'].includes(input.outcome))
        fail(409, 'reviewState');
      if (!['pending', 'more', 'review'].includes(c.state)) fail(409, 'reviewState');
      const required = policy(tenant, s.market, c.policy).documents;
      if (input.outcome === 'review' && !required.every((k) => documentation(c).includes(k)))
        fail(409, 'reviewIncomplete');
      if (input.outcome === 'review' && c.state !== 'review') {
        q("UPDATE identity_checks SET state='review',reviewer=? WHERE subject=? AND cycle=?").run(
          staff.id,
          s.id,
          c.cycle,
        );
        event(s, c, 'callback', '', {}, 'review');
      } else event(s, c, 'callback', '', { outcome: input.outcome, recordedState: c.state });
      result.state = input.outcome === 'review' ? 'review' : c.state;
    } else if (a === 'decide') {
      if (
        c.state !== 'review' ||
        c.reviewer !== staff.id ||
        !['approved', 'declined', 'more'].includes(input.outcome)
      )
        fail(409, 'reviewState');
      validReason(input.reason);
      if (c.policy !== policy(tenant, s.market).version) fail(409, 'reviewPolicy');
      if (
        input.outcome === 'approved' &&
        !policy(tenant, s.market, c.policy).documents.every((k) => JSON.parse(c.results)[k]?.passed)
      )
        fail(409, 'reviewSampleFailed');
      auditId = stamp();
      const expires =
        input.outcome === 'approved' ? now() + 86400000 * policy(tenant, s.market, c.policy).days : null;
      q('UPDATE identity_checks SET state=?,decision=?,expires=? WHERE subject=? AND cycle=?').run(
        input.outcome,
        auditId,
        expires,
        s.id,
        c.cycle,
      );
      event(s, c, 'decide', input.reason, { decision: auditId }, input.outcome);
      result.decision = auditId;
    } else if (a === 'claim') {
      if (c.state !== 'review') fail(409, 'reviewState');
      q('UPDATE identity_checks SET reviewer=? WHERE subject=? AND cycle=?').run(
        staff.id,
        s.id,
        c.cycle,
      );
      event(s, c, 'claim', validReason(input.reason), { reviewer: staff.id });
    } else if (a === 'expire') {
      if (effective(tenant, s, c) !== 'approved') fail(409, 'reviewState');
      q('UPDATE identity_checks SET expires=? WHERE subject=? AND cycle=?').run(now(), s.id, c.cycle);
      event(s, c, 'expire', 'fixture_expiry', {}, 'expired');
    } else if (a === 'recheck') {
      if (
        !['expired', 'declined', 'more'].includes(effective(tenant, s, c)) &&
        c.policy === policy(tenant, s.market).version
      )
        fail(409, 'reviewState');
      const version = policy(tenant, s.market).version;
      q("INSERT INTO identity_checks(subject,cycle,policy,docs,state) VALUES(?,?,?,'[]','pending')").run(
        s.id,
        c.cycle + 1,
        version,
      );
      event(s, { cycle: c.cycle + 1 }, 'recheck', '', { priorDecision: c.decision }, 'pending');
    } else if (a === 'signal') {
      if (!signals.includes(input.kind) || !['sample-a', 'sample-b', 'sample-c'].includes(input.marker))
        fail(400, 'invalid');
      const listVersion = input.kind === 'screening' ? input.listVersion : 0;
      if (
        !Number.isSafeInteger(listVersion) ||
        listVersion < 0 ||
        (input.kind === 'screening' && listVersion < 1)
      )
        fail(400, 'invalid');
      const existing = q(
        'SELECT * FROM screening_cases WHERE subject=? AND kind=? AND marker=? ORDER BY list_version DESC LIMIT 1',
      ).get(s.id, input.kind, input.marker);
      if (existing && listVersion < existing.list_version) fail(409, 'opStale');
      if (existing && listVersion === existing.list_version) result.risk = existing.id;
      else {
        const risk = randomUUID();
        q("INSERT INTO screening_cases VALUES(?,?,?,?,?,?,'open',1,?,?,NULL)").run(
          risk,
          s.id,
          input.kind,
          input.marker,
          listVersion,
          existing?.id ?? null,
          staff.id,
          now(),
        );
        event(s, c, 'signal', existing ? 'list_change' : '', {
          risk,
          kind: input.kind,
          listVersion,
          prior: existing?.id ?? null,
        });
        result.risk = risk;
      }
    } else if (['risk_claim', 'risk_decide', 'hold', 'release'].includes(a)) {
      const risk = q('SELECT * FROM screening_cases WHERE id=? AND subject=?').get(
        typeof input.risk === 'string' ? input.risk : '',
        s.id,
      );
      if (!risk) fail(404, 'opMissing');
      why = validReason(input.reason);
      if (!['risk_claim', 'release'].includes(a) && risk.owner !== staff.id) fail(403, 'staffForbidden');
      details = { risk: risk.id };
      if (a === 'risk_claim') {
        q('UPDATE screening_cases SET owner=?,version=version+1 WHERE id=?').run(staff.id, risk.id);
        details.owner = staff.id;
      }
      if (a === 'risk_decide') {
        if (
          !['open', 'more'].includes(risk.status) ||
          !['cleared', 'confirmed', 'more'].includes(input.outcome)
        )
          fail(409, 'reviewState');
        q('UPDATE screening_cases SET status=?,reason=?,version=version+1 WHERE id=?').run(
          input.outcome,
          why,
          risk.id,
        );
        details.outcome = input.outcome;
      }
      if (a === 'hold') {
        if (
          !['open', 'more', 'confirmed'].includes(risk.status) ||
          q('SELECT 1 FROM review_holds WHERE risk=? AND ended IS NULL').get(risk.id)
        )
          fail(409, 'reviewState');
        result.hold = randomUUID();
        q(
          'INSERT INTO review_holds(id,subject,risk,started,reason,dual_release) VALUES(?,?,?,?,?,?)',
        ).run(result.hold, s.id, risk.id, now(), why, Number(policy(tenant, s.market).dualRelease));
        details.hold = result.hold;
      }
      if (a === 'release') {
        const h = q(
          'SELECT id,dual_release,requested_by FROM review_holds WHERE subject=? AND risk=? AND ended IS NULL',
        ).get(s.id, risk.id);
        if (!h || input.hold !== h.id) fail(409, 'reviewState');
        if (h.requested_by === null && risk.owner !== staff.id) fail(403, 'staffForbidden');
        if (h.dual_release && h.requested_by === null) {
          recordedAction = 'release_request';
          q('UPDATE review_holds SET requested_by=?,requested_at=?,requested_reason=? WHERE id=?').run(
            staff.id,
            now(),
            why,
            h.id,
          );
        } else {
          if (h.requested_by === staff.id) fail(403, 'reviewSecond');
          q('UPDATE review_holds SET ended=?,end_reason=? WHERE id=?').run(now(), why, h.id);
        }
        details.hold = h.id;
        details.actor = staff.id;
      }
      event(s, c, recordedAction, why, details);
    } else fail(400, 'invalid');
    bump(s.id);
    result = { id: s.id, ...result, auditId: auditId ?? stamp() };
    if (provider)
      q('INSERT INTO review_vendor_receipts VALUES(?,?,?,?,?)').run(
        s.id,
        a,
        external,
        payload,
        JSON.stringify(result),
      );
    return result;
  }
  return { policy, settings, list, detail, change, eligibility, subject, playerView, playerEvidence };
}
