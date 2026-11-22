import { randomUUID } from 'node:crypto';
import { foldText } from './message-history.js';

const rows = [
  ['translation', 'Translation and Localisation', 'Traduction et localisation', 'business', true],
  ['finance', 'Financial', 'Services financiers', 'finance'],
  ['trade', 'Trade Shows and Logistics', 'Salons et logistique', 'business'],
  ['legal', 'Legal', 'Services juridiques', 'finance'],
  ['qa', 'QA & Testing', 'Assurance qualité et tests', 'it'],
  ['risk', 'Risk Management', 'Gestion des risques', 'finance'],
  ['studio', 'Live Casino Studio', 'Studio de casino en direct', 'gaming'],
  ['infosec', 'Information Security', 'Sécurité de l’information', 'it'],
  ['marketing', 'Marketing', 'Marketing', 'business'],
  ['design', 'Design', 'Design', 'business'],
  ['scouting', 'Live Scouting', 'Observation sportive en direct', 'gaming'],
  ['trading', 'Bookmaking (Trading)', 'Gestion des cotes', 'gaming'],
  ['operations', 'Operations & IT', 'Exploitation et TI', 'it'],
  ['licensing', 'Licensing', 'Licences', 'other'],
];
const languages = ['en', 'fr', 'es'];
const stages = { ordered: 'in_progress', in_progress: 'delivered', delivered: 'closed' };

export function createOperatorServices(db, { fail, audit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS operator_service_orders(
    id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),service TEXT NOT NULL,
    owner INTEGER NOT NULL REFERENCES staff_accounts(id),agent INTEGER NOT NULL REFERENCES staff_accounts(id),
    title TEXT NOT NULL,brief TEXT NOT NULL,source TEXT NOT NULL,target TEXT NOT NULL,
    status TEXT NOT NULL,version INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,
    accepted_quote INTEGER,invoice TEXT UNIQUE);
    CREATE INDEX IF NOT EXISTS operator_service_order_lookup ON operator_service_orders(tenant_id,updated DESC,id);
    CREATE TABLE IF NOT EXISTS operator_service_events(
    id INTEGER PRIMARY KEY REFERENCES staff_events(id),order_id TEXT NOT NULL REFERENCES operator_service_orders(id),
    actor INTEGER NOT NULL REFERENCES staff_accounts(id),kind TEXT NOT NULL,body TEXT NOT NULL,happened INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS operator_service_event_lookup ON operator_service_events(order_id,id DESC);
    CREATE TABLE IF NOT EXISTS operator_service_quotes(
    order_id TEXT NOT NULL REFERENCES operator_service_orders(id),version INTEGER NOT NULL,minor INTEGER NOT NULL,
    created INTEGER NOT NULL,PRIMARY KEY(order_id,version));`);
  function string(value, max) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, 'invalid');
    return value.trim();
  }
  function catalogue(query, category) {
    if (!['', 'business', 'finance', 'it', 'gaming', 'other'].includes(category) || query.length > 100)
      fail(400, 'invalid');
    const q = foldText(query.trim());
    return {
      items: rows
        .filter(
          ([, en, fr, group]) =>
            (!category || category === group) && foldText(en + ' ' + fr).includes(q),
        )
        .map(([id, nameEn, nameFr, group, available]) => ({
          id,
          nameEn,
          nameFr,
          group,
          available: Boolean(available),
        })),
    };
  }
  function agents(tenant) {
    return db
      .prepare(
        `SELECT m.staff_id AS id,a.email,m.role FROM tenant_staff_memberships m JOIN staff_accounts a ON a.id=m.staff_id
      WHERE m.tenant_id=? AND m.status='active' AND m.role IN ('operator_admin','operator_support') ORDER BY a.email`,
      )
      .all(tenant);
  }
  const summary = `id,service,owner,agent,title,source,target,status,version,created,updated,accepted_quote AS acceptedQuote,invoice`;
  function assignedReader(staff) {
    return ['operator_admin', 'operator_support'].includes(staff.role) ? staff.id : null;
  }
  function order(tenant, staff, id) {
    if (typeof id !== 'string' || id.length !== 36) fail(404, 'opMissing');
    const row = db
      .prepare(
        'SELECT ' +
          summary +
          ',brief FROM operator_service_orders WHERE tenant_id=? AND id=? AND (owner=? OR agent=?)',
      )
      .get(tenant, id, staff.id, assignedReader(staff));
    if (!row) fail(404, 'opMissing');
    return row;
  }
  function list(tenant, staff, page = 1) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) fail(400, 'invalid');
    const condition = ' FROM operator_service_orders WHERE tenant_id=? AND (owner=? OR agent=?)';
    const args = [tenant, staff.id, assignedReader(staff)];
    const { total } = db.prepare('SELECT count(*) AS total' + condition).get(...args);
    page = Math.min(page, Math.max(1, Math.ceil(total / 8)));
    return {
      page,
      total,
      pageSize: 8,
      items: db
        .prepare('SELECT ' + summary + condition + ' ORDER BY updated DESC,id LIMIT 8 OFFSET ?')
        .all(...args, (page - 1) * 8),
    };
  }
  function detail(tenant, staff, id, before = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(before) || before < 1) fail(400, 'invalid');
    const row = order(tenant, staff, id);
    const events = db
      .prepare(
        `SELECT e.id,e.kind,e.body,e.happened,a.email AS author FROM operator_service_events e
      JOIN staff_accounts a ON e.actor=a.id WHERE order_id=? AND e.id<? ORDER BY e.id DESC LIMIT 13`,
      )
      .all(id, before);
    const latestQuote =
      db
        .prepare(
          'SELECT version,minor,created FROM operator_service_quotes WHERE order_id=? ORDER BY version DESC LIMIT 1',
        )
        .get(id) ?? null;
    return {
      ...row,
      latestQuote,
      canFulfill: staff.id === row.agent && ['operator_admin', 'operator_support'].includes(staff.role),
      isOwner: staff.id === row.owner,
      events: events.slice(0, 12).map((e) => ({ ...e, body: JSON.parse(e.body) })),
      next: events.length > 12 ? events[11].id : null,
    };
  }
  function change(tenant, staff, request, input) {
    const now = Date.now();
    function event(id, kind, body = {}) {
      const auditId = audit(tenant, staff.id, 'service_' + kind, id, request, {
        environment: 'sandbox',
      });
      db.prepare('INSERT INTO operator_service_events VALUES(?,?,?,?,?,?)').run(
        auditId,
        id,
        staff.id,
        kind,
        JSON.stringify(body),
        now,
      );
      return { id, auditId };
    }
    if (input.action === 'order') {
      if (!['operator_admin', 'operator_content', 'operator_provider'].includes(staff.role))
        fail(403, 'staffForbidden');
      if (!rows.some((row) => row[0] === input.service && row[4])) fail(409, 'opUnavailable');
      const title = string(input.title, 100),
        brief = string(input.brief, 2000);
      if (
        !languages.includes(input.source) ||
        !languages.includes(input.target) ||
        input.source === input.target
      )
        fail(400, 'invalid');
      if (!Number.isSafeInteger(input.agent) || !agents(tenant).some((a) => a.id === input.agent))
        fail(400, 'invalid');
      let attachment;
      if (input.attachment != null) {
        const file = input.attachment;
        if (
          typeof file !== 'object' ||
          typeof file.name !== 'string' ||
          !/^[-\p{L}\p{N}_. ()]{1,80}\.txt$/iu.test(file.name) ||
          typeof file.text !== 'string' ||
          !file.text.trim() ||
          Buffer.byteLength(file.text) > 16384 ||
          file.text.includes('\0')
        )
          fail(400, 'invalid');
        attachment = { name: file.name, text: file.text };
      }
      const id = randomUUID();
      db.prepare(
        `INSERT INTO operator_service_orders VALUES(?,?,?,?,?,?,?,?,?,'ordered',1,?,?,NULL,NULL)`,
      ).run(
        id,
        tenant,
        input.service,
        staff.id,
        input.agent,
        title,
        brief,
        input.source,
        input.target,
        now,
        now,
      );
      return event(id, 'ordered', attachment ? { attachment } : {});
    }
    const o = order(tenant, staff, input.id);
    const owner = o.owner === staff.id,
      agent = o.agent === staff.id && ['operator_admin', 'operator_support'].includes(staff.role);
    if (!agent && !owner) fail(403, 'staffForbidden');
    if (input.action === 'invoice' && agent && o.invoice)
      return {
        id: o.id,
        invoice: o.invoice,
        auditId: db
          .prepare("SELECT id FROM operator_service_events WHERE order_id=? AND kind='invoiced'")
          .get(o.id).id,
      };
    if (!Number.isSafeInteger(input.version) || input.version !== o.version) fail(409, 'opStale');
    let body = {},
      kind = input.action;
    if (kind === 'comment') body = { text: string(input.text, 2000) };
    else if (kind === 'advance') {
      const next = stages[o.status];
      if (!next) fail(409, 'opUnavailable');
      if (next === 'closed' ? !owner : !agent) fail(403, 'staffForbidden');
      db.prepare('UPDATE operator_service_orders SET status=? WHERE id=?').run(next, o.id);
      kind = next;
    } else if (kind === 'assign') {
      if (!owner) fail(403, 'staffForbidden');
      if (o.status === 'closed') fail(409, 'opUnavailable');
      if (
        input.agent === o.agent ||
        !Number.isSafeInteger(input.agent) ||
        !agents(tenant).some((a) => a.id === input.agent)
      )
        fail(400, 'invalid');
      db.prepare('UPDATE operator_service_orders SET agent=? WHERE id=?').run(input.agent, o.id);
      body = { agent: input.agent };
    } else if (kind === 'quote') {
      if (!agent) fail(403, 'staffForbidden');
      if (o.acceptedQuote || o.status === 'closed') fail(409, 'opUnavailable');
      if (!Number.isSafeInteger(input.minor) || input.minor <= 0 || input.minor > 100000000)
        fail(400, 'invalid');
      const n = db
        .prepare('SELECT coalesce(max(version),0)+1 AS n FROM operator_service_quotes WHERE order_id=?')
        .get(o.id).n;
      db.prepare('INSERT INTO operator_service_quotes VALUES(?,?,?,?)').run(o.id, n, input.minor, now);
      body = { quote: n, minor: input.minor, asset: 'TST' };
    } else if (kind === 'accept') {
      if (!owner) fail(403, 'staffForbidden');
      const q = db
        .prepare('SELECT max(version) AS v FROM operator_service_quotes WHERE order_id=?')
        .get(o.id).v;
      if (o.status === 'closed' || o.acceptedQuote || !q || q !== input.quote) fail(409, 'opStale');
      db.prepare('UPDATE operator_service_orders SET accepted_quote=? WHERE id=?').run(q, o.id);
      body = { quote: q };
    } else if (kind === 'invoice') {
      if (!agent) fail(403, 'staffForbidden');
      if (!o.acceptedQuote) fail(409, 'opQuoteFirst');
      body = { invoice: 'TEST-' + o.id, quote: o.acceptedQuote };
      db.prepare('UPDATE operator_service_orders SET invoice=? WHERE id=?').run(body.invoice, o.id);
      kind = 'invoiced';
    } else fail(400, 'invalid');
    db.prepare('UPDATE operator_service_orders SET updated=?,version=version+1 WHERE id=?').run(
      now,
      o.id,
    );
    return { ...event(o.id, kind, body), ...(body.invoice && { invoice: body.invoice }) };
  }
  return { catalogue, agents, list, detail, change };
}
