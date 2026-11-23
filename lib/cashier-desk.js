import { randomUUID } from 'node:crypto';

const baseline = [
  {
    key: 'cards',
    directions: ['deposit'],
    markets: ['north', 'south'],
    assets: ['TST'],
    min: 100,
    max: 100000,
    priority: 10,
    enabled: true,
    online: true,
  },
  {
    key: 'wallet',
    directions: ['deposit', 'withdrawal'],
    markets: ['north', 'south'],
    assets: ['TST'],
    min: 100,
    max: 200000,
    priority: 20,
    enabled: true,
    online: true,
  },
];
const mexico=['spei','oxxo'].map((key,i)=>({key,directions:['deposit'],markets:['south'],assets:['TST'],min:100,max:100000,priority:30+i,enabled:true,online:true}));
const isAmount = (n) => Number.isSafeInteger(n) && n > 0 && n <= 100000000;
const refOk = (s) => typeof s === 'string' && /^[A-Za-z0-9._-]{1,96}$/.test(s);
const inSet = (xs, values) =>
  Array.isArray(xs) &&
  xs.length > 0 &&
  xs.length <= values.length &&
  new Set(xs).size === xs.length &&
  xs.every((x) => values.includes(x));

export function createCashierDesk(db, { audit, fail, review, ledger, budgets }) {
  db.exec(`CREATE TABLE IF NOT EXISTS cashier_local_rails(tenant TEXT PRIMARY KEY,enabled INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cashier_vouchers(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,reference TEXT NOT NULL UNIQUE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cashier_route_versions(
    tenant TEXT NOT NULL REFERENCES tenants(id),key TEXT NOT NULL,version INTEGER NOT NULL,spec TEXT NOT NULL,
    actor INTEGER NOT NULL REFERENCES staff_accounts(id),created INTEGER NOT NULL,PRIMARY KEY(tenant,key,version));
    CREATE TABLE IF NOT EXISTS cashier_intents(
    id TEXT PRIMARY KEY,subject TEXT NOT NULL REFERENCES review_subjects(id),origin_key TEXT NOT NULL,fingerprint TEXT NOT NULL,
    direction TEXT NOT NULL,route TEXT NOT NULL,route_version INTEGER NOT NULL,minor INTEGER NOT NULL,asset TEXT NOT NULL,
    status TEXT NOT NULL,version INTEGER NOT NULL,processor_ref TEXT NOT NULL UNIQUE,decision INTEGER,policy INTEGER,
    authorized_decision INTEGER,created INTEGER NOT NULL,updated INTEGER NOT NULL,original_audit INTEGER NOT NULL REFERENCES staff_events(id),
    UNIQUE(subject,origin_key));
    CREATE INDEX IF NOT EXISTS cashier_intent_lookup ON cashier_intents(subject,created DESC,id);
    CREATE TABLE IF NOT EXISTS cashier_fixture_receipts(
    tenant TEXT NOT NULL REFERENCES tenants(id),route TEXT NOT NULL,reference TEXT NOT NULL,payload TEXT NOT NULL,
    response TEXT NOT NULL,PRIMARY KEY(tenant,route,reference));
    CREATE TABLE IF NOT EXISTS cashier_intent_history(
    audit_id INTEGER PRIMARY KEY REFERENCES staff_events(id),intent TEXT NOT NULL REFERENCES cashier_intents(id),
    status TEXT NOT NULL,kind TEXT NOT NULL,at INTEGER NOT NULL);`);
  const q = (s) => db.prepare(s);
  function route(tenant, key) {
    const original = [...baseline,...mexico].find((r) => r.key === key);
    if (!original) fail(400, 'invalid');
    const saved = q(
      'SELECT version,spec FROM cashier_route_versions WHERE tenant=? AND key=? ORDER BY version DESC LIMIT 1',
    ).get(tenant, key);
    const selected=saved ? { ...JSON.parse(saved.spec), version: saved.version } : { ...original, version: 0 };
    if(mexico.some(r=>r.key===key)&&!localRails(tenant))selected.enabled=false;return selected;
  }
  const localRails=t=>Boolean(q('SELECT enabled FROM cashier_local_rails WHERE tenant=?').get(t)?.enabled);
  const routes = (tenant) => [...baseline,...(localRails(tenant)?mexico:[])].map((r) => route(tenant, r.key));
  function available(r, context) {
    if (!r.enabled) return 'route_disabled';
    if (!r.online) return 'route_offline';
    if (!r.directions.includes(context.direction)) return 'route_direction';
    if (!r.markets.includes(context.market)) return 'route_market';
    if (!r.assets.includes(context.asset)) return 'route_currency';
    if (context.minor < r.min) return 'route_min';
    if (context.minor > r.max) return 'route_max';
    return 'eligible';
  }
  function options(tenant, { direction, market, asset, minor }) {
    if (
      !['deposit', 'withdrawal'].includes(direction) ||
      !['north', 'south'].includes(market) ||
      !['TST', 'USD', 'CAD'].includes(asset) ||
      !isAmount(minor)
    )
      fail(400, 'invalid');
    const rows = routes(tenant)
      .sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key))
      .map((r) => ({ ...r, reason: available(r, { direction, market, asset, minor }) }));
    return { eligible: rows.filter((r) => r.reason === 'eligible').map((r) => r.key), routes: rows };
  }
  function configure(tenant, staff, request, input) {
    const prev = route(tenant, input.key);
    if (input.version !== prev.version) fail(409, 'opStale');
    if(mexico.some(r=>r.key===input.key)&&(!localRails(tenant)||input.directions?.join()!=='deposit'||input.markets?.join()!=='south'))fail(400,'invalid');
    if (
      !inSet(input.directions, ['deposit', 'withdrawal']) ||
      !inSet(input.markets, ['north', 'south']) ||
      !inSet(input.assets, ['TST']) ||
      !isAmount(input.min) ||
      !isAmount(input.max) ||
      input.min > input.max ||
      !Number.isSafeInteger(input.priority) ||
      input.priority < 1 ||
      input.priority > 100 ||
      typeof input.enabled !== 'boolean' ||
      typeof input.online !== 'boolean'
    )
      fail(400, 'invalid');
    const spec = Object.fromEntries(
      ['key', 'directions', 'markets', 'assets', 'min', 'max', 'priority', 'enabled', 'online'].map(
        (k) => [k, input[k]],
      ),
    );
    const version = prev.version + 1;
    q('INSERT INTO cashier_route_versions VALUES(?,?,?,?,?,?)').run(
      tenant,
      prev.key,
      version,
      JSON.stringify(spec),
      staff.id,
      Date.now(),
    );
    return {
      key: prev.key,
      version,
      auditId: audit(tenant, staff.id, 'cashier_route', prev.key, request, { version }),
    };
  }
  function accessIntent(tenant, id) {
    if (typeof id !== 'string') fail(404, 'opMissing');
    const row = q(
      `SELECT i.* FROM cashier_intents i JOIN review_subjects s ON s.id=i.subject WHERE s.tenant=? AND i.id=?`,
    ).get(tenant, id);
    if (!row) fail(404, 'opMissing');
    return row;
  }
  function expose(row) {
    return {
      id: row.id,
      direction: row.direction,
      route: row.route,
      routeVersion: row.route_version,
      minor: row.minor,
      asset: row.asset,
      status: row.status,
      version: row.version,
      processorRef: row.processor_ref,
      decision: row.decision,
      authorizedDecision: row.authorized_decision,
      policy: row.policy,
      created: row.created,
      updated: row.updated,
    };
  }
  function detail(tenant, id, page = 1) {
    const s = review.subject(tenant, id);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) fail(400, 'invalid');
    const total = q('SELECT count(*) AS n FROM cashier_intents WHERE subject=?').get(id).n;
    const actual = Math.min(page, Math.max(1, Math.ceil(total / 8)));
    return {
      subject: s.id,
      label: s.label,
      market: s.market,
      balance: ledger.balance(tenant, s.wallet),
      gate: review.eligibility(tenant, id),
      page: actual,
      total,
      items: q('SELECT * FROM cashier_intents WHERE subject=? ORDER BY created DESC,id LIMIT 8 OFFSET ?')
        .all(id, (actual - 1) * 8)
        .map(expose),
    };
  }
  function supportSummary(tenant, id) {
    const s = review.subject(tenant, id);
    return q(`SELECT i.id,i.status,i.updated,h.kind AS lastAction FROM cashier_intents i
      JOIN cashier_intent_history h ON h.audit_id=(SELECT max(x.audit_id) FROM cashier_intent_history x WHERE x.intent=i.id)
      WHERE i.subject=? AND i.direction='withdrawal' ORDER BY i.updated DESC,i.id LIMIT 8`).all(s.id);
  }
  function intent(tenant, id) {
    const row = accessIntent(tenant, id);
    return {
      ...expose(row),
      voucher:q('SELECT reference,expires FROM cashier_vouchers WHERE tenant=? AND id=?').get(tenant,id)||null,
      subject: row.subject,
      history: q(
        'SELECT status,kind,at FROM cashier_intent_history WHERE intent=? ORDER BY audit_id',
      ).all(id),
    };
  }
  function authorized(tenant, subject) {
    const gate = review.eligibility(tenant, subject);
    if (!gate.allowed) fail(409, gate.reason);
    return gate;
  }
  function change(tenant, staff, request, input, reservedId=null) {
    if(input.action==='local-rails'){if(typeof input.enabled!=='boolean')fail(400,'invalid');q('INSERT INTO cashier_local_rails VALUES(?,?) ON CONFLICT(tenant) DO UPDATE SET enabled=excluded.enabled').run(tenant,+input.enabled);return {auditId:audit(tenant,staff.id,'cashier_local_rails','mexico-demo',request,{enabled:input.enabled})};}
    if (input.action === 'route') return configure(tenant, staff, request, input);
    const auditEvent = (id, action, status) =>
      audit(tenant, staff.id, 'cashier_' + action, id, request, { status, environment: 'sandbox' });
    const history = (id, auditId, status, kind) =>
      q('INSERT INTO cashier_intent_history VALUES(?,?,?,?,?)').run(
        auditId,
        id,
        status,
        kind,
        Date.now(),
      );
    if (input.action === 'initiate') {
      const s = review.subject(tenant, input.subject);
      if (
        !refOk(input.key) ||
        !isAmount(input.minor) ||
        !['deposit', 'withdrawal'].includes(input.direction) ||
        !['TST', 'CAD', 'USD'].includes(input.asset)
      )
        fail(400, 'invalid');
      const fingerprint = JSON.stringify([input.direction, input.route, input.minor, input.asset]),
        previous = q(
          'SELECT id,original_audit,fingerprint FROM cashier_intents WHERE subject=? AND origin_key=?',
        ).get(s.id, input.key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) fail(409, 'staffRequestConflict');
        return { id: previous.id, auditId: previous.original_audit };
      }
      const r = route(tenant, input.route),
        reason = available(r, { ...input, market: s.market });
      if (reason !== 'eligible') fail(409, reason);
      if(input.direction==='deposit')budgets?.check(tenant,s.player,'deposit',input.minor);
      const gate = input.direction === 'withdrawal' ? authorized(tenant, s.id) : null;
      const id = reservedId || randomUUID(),
        isWithdrawal = input.direction === 'withdrawal',
        status = isWithdrawal ? 'held' : 'initiated',
        at = Date.now(),
        processor = 'TEST-' + id;
      if (isWithdrawal) {
        const held = ledger.apply(tenant, s.wallet, ['hold', id, input.minor]);
        if (held.status !== 'posted') fail(409, 'cashierFunds');
      }
      const auditId = auditEvent(id, 'initiate', status);
      q(`INSERT INTO cashier_intents(id,subject,origin_key,fingerprint,direction,route,route_version,minor,asset,status,version,processor_ref,decision,policy,created,updated,original_audit)
        VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?)`).run(
        id,
        s.id,
        input.key,
        fingerprint,
        input.direction,
        r.key,
        r.version,
        input.minor,
        input.asset,
        status,
        processor,
        gate?.decision ?? null,
        gate?.policy ?? null,
        at,
        at,
        auditId,
      );
      if(mexico.some(x=>x.key===r.key))q('INSERT INTO cashier_vouchers VALUES(?,?,?,?)').run(id,tenant,'DEMO-'+r.key.toUpperCase()+'-'+id.slice(0,13).toUpperCase(),at+(r.key==='oxxo'?48:24)*3600000);
      history(id, auditId, status, 'initiate');
      return { id, auditId };
    }
    const row = accessIntent(tenant, input.id),
      s = review.subject(tenant, row.subject),
      isWithdrawal = row.direction === 'withdrawal',
      a = input.action;
    let status,
      decision = null,
      payload = null;
    if (a === 'event') {
      if (
        !refOk(input.eventId) ||
        input.processorRef !== row.processor_ref ||
        input.route !== row.route ||
        input.minor !== row.minor ||
        input.asset !== row.asset ||
        !['success', 'decline', 'chargeback'].includes(input.outcome)
      )
        fail(400, 'cashierMismatch');
      payload = JSON.stringify([row.id, input.outcome, row.minor, row.asset]);
      const seen = q(
        'SELECT payload,response FROM cashier_fixture_receipts WHERE tenant=? AND route=? AND reference=?',
      ).get(tenant, row.route, input.eventId);
      if (seen) {
        if (seen.payload !== payload) fail(409, 'staffRequestConflict');
        return JSON.parse(seen.response);
      }
      if (isWithdrawal) {
        if (!['sent', 'unknown'].includes(row.status) || input.outcome === 'chargeback')
          fail(409, 'reviewState');
        const paid = input.outcome === 'success';
        status = paid ? 'paid' : 'declined';
        const result = ledger.apply(tenant, s.wallet, [
          'resolve',
          'settle-' + row.id,
          row.id,
          paid ? 'paid' : 'declined',
        ]);
        if (result.status !== 'posted') fail(409, 'reviewState');
      } else if (input.outcome === 'chargeback') {
        if (row.status !== 'confirmed') fail(409, 'reviewState');
        const result = ledger.apply(tenant, s.wallet, [
          'chargeback',
          'reverse-' + row.id,
          row.minor,
          'deposit-' + row.id,
        ]);
        if (result.status !== 'posted') fail(409, 'cashierFunds');
        status = 'reversed';
      } else {
        if (!['initiated', 'pending'].includes(row.status)) fail(409, 'reviewState');
        const voucher=q('SELECT expires FROM cashier_vouchers WHERE id=?').get(row.id);
        if(voucher&&voucher.expires<=Date.now()&&input.outcome==='success')fail(409,'voucherExpired');
        status = input.outcome === 'success' ? 'confirmed' : 'failed';
        if (status === 'confirmed') {
          const result = ledger.apply(tenant, s.wallet, ['confirm', 'deposit-' + row.id, row.minor]);
          if (result.status !== 'posted') fail(409, 'reviewState');
        }
      }
    } else {
      if (input.version !== row.version) fail(409, 'opStale');
      if (a === 'return' && !isWithdrawal && row.status === 'initiated') status = 'pending';
      else if (a === 'send' && isWithdrawal && row.status === 'held') {
        const gate = authorized(tenant, s.id);
        const selected = route(tenant, row.route),
          reason = available(selected, {
            direction: row.direction,
            market: s.market,
            minor: row.minor,
            asset: row.asset,
          });
        if (reason !== 'eligible') fail(409, reason);
        decision = gate.decision;
        status = 'sent';
      } else if (a === 'timeout' && isWithdrawal && row.status === 'sent') {
        ledger.apply(tenant, s.wallet, ['timeout', row.id]);
        status = 'unknown';
      } else if (a === 'cancel' && isWithdrawal && row.status === 'held') {
        const result = ledger.apply(tenant, s.wallet, [
          'resolve',
          'cancel-' + row.id,
          row.id,
          'declined',
        ]);
        if (result.status !== 'posted') fail(409, 'reviewState');
        status = 'cancelled';
      } else fail(409, 'reviewState');
    }
    const auditId = auditEvent(row.id, a, status);
    q(
      'UPDATE cashier_intents SET status=?,version=version+1,updated=?,authorized_decision=coalesce(?,authorized_decision) WHERE id=?',
    ).run(status, Date.now(), decision, row.id);
    history(row.id, auditId, status, a);
    const response = { id: row.id, auditId, status, version: row.version + 1 };
    if (payload)
      q('INSERT INTO cashier_fixture_receipts VALUES(?,?,?,?,?)').run(
        tenant,
        row.route,
        input.eventId,
        payload,
        JSON.stringify(response),
      );
    return response;
  }
  return { options, routes, detail, intent, change, supportSummary,localRails };
}
