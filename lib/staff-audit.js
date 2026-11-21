import { createHmac } from 'node:crypto';

export function changedFields(before, after) {
  return Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

export function createStaffAudit(db, { fail, transaction, encryptionKey }) {
  transaction(() => {
    const columns = db.prepare('PRAGMA table_info(staff_events)').all().map(({ name }) => name);
    if (!columns.includes('details')) db.exec("ALTER TABLE staff_events ADD COLUMN details TEXT NOT NULL DEFAULT '{}'");
    db.exec(`
      CREATE TABLE IF NOT EXISTS staff_mutation_receipts (
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        actor_id INTEGER NOT NULL REFERENCES staff_accounts(id),
        request_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        response TEXT NOT NULL,
        PRIMARY KEY(tenant_id, actor_id, request_id)
      );
    `);
  });
  const insert = db.prepare('INSERT INTO staff_events(tenant_id, actor_id, action, target, created_at, correlation_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const receipt = db.prepare('SELECT fingerprint, response FROM staff_mutation_receipts WHERE tenant_id = ? AND actor_id = ? AND request_id = ?');
  const remember = db.prepare('INSERT INTO staff_mutation_receipts(tenant_id, actor_id, request_id, fingerprint, response) VALUES (?, ?, ?, ?, ?)');

  function record(tenantId, actorId, action, target, requestId, details = {}, now = Date.now()) {
    return Number(insert.run(tenantId, actorId, action, target, now, requestId, JSON.stringify(details)).lastInsertRowid);
  }

  function change(tenantId, requestId, route, input, authorize, work) {
    return transaction(() => {
      const actor = authorize();
      const digest = createHmac('sha256', encryptionKey)
        .update('staff-action\0' + route + '\0' + JSON.stringify(input, (_key, value) =>
          value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]))
            : value))
        .digest('hex');
      const previous = receipt.get(tenantId, actor.id, requestId);
      if (previous) {
        if (previous.fingerprint !== digest) fail(409, 'staffRequestConflict');
        return JSON.parse(previous.response);
      }
      const result = work(actor);
      if (result.auditId) remember.run(tenantId, actor.id, requestId, digest, JSON.stringify(result));
      return result;
    });
  }

  function list(tenantId, staff, before) {
    const admin = staff.role === 'operator_admin';
    const rows = db.prepare(`SELECT e.id, e.tenant_id AS brandId, e.actor_id AS actorId, a.email AS actor,
      e.action, e.target, e.created_at AS createdAt, e.correlation_id AS correlationId, e.details
      FROM staff_events e JOIN staff_accounts a ON a.id = e.actor_id
      WHERE e.tenant_id = ? AND e.id < coalesce(?, 9223372036854775807)
        AND (? OR (e.actor_id = ? AND ((? AND e.action GLOB 'tenant_config_*') OR
          (? AND (e.action GLOB 'coming_soon_*' OR e.action GLOB 'provider_catalog_*' OR e.action GLOB 'catalog_listing_*')))))
      ORDER BY e.id DESC LIMIT 51`).all(tenantId, before, Number(admin), staff.id, staff.publishWebsite, staff.publishCatalogue);
    const events = rows.slice(0, 50).map(({ details, ...event }) => ({ ...event, details: JSON.parse(details) }));
    return { events, nextCursor: rows.length > 50 ? events.at(-1).id : null };
  }

  return { record, change, list };
}
