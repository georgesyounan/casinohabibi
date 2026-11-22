import { createHmac, randomUUID } from 'node:crypto';

export function createPartnerLobby(db, { audit, fail, encryptionKey }) {
  db.exec(`CREATE TABLE IF NOT EXISTS lobby_api_clients(
    id TEXT PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),label TEXT NOT NULL,version INTEGER NOT NULL,
    credential TEXT UNIQUE,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS lobby_client_events(
    id INTEGER PRIMARY KEY REFERENCES staff_events(id),client TEXT NOT NULL REFERENCES lobby_api_clients(id),version INTEGER NOT NULL,
    kind TEXT NOT NULL,happened INTEGER NOT NULL,UNIQUE(client,version));`);
  const digest = (s) =>
    createHmac('sha256', encryptionKey)
      .update('partner-lobby-sandbox\0' + s)
      .digest('hex');
  const projection = 'id,label,version,credential IS NOT NULL AS active,created,updated';
  function list(tenant) {
    return {
      environment: 'sandbox',
      capability: 'lobby.read',
      items: db
        .prepare(
          'SELECT ' + projection + ' FROM lobby_api_clients WHERE tenant=? ORDER BY updated DESC,id',
        )
        .all(tenant),
    };
  }
  function history(tenant, id) {
    if (!db.prepare('SELECT 1 FROM lobby_api_clients WHERE tenant=? AND id=?').get(tenant, id || ''))
      fail(404, 'opMissing');
    return {
      items: db
        .prepare(
          'SELECT version,kind,happened FROM lobby_client_events WHERE client=? ORDER BY version DESC LIMIT 50',
        )
        .all(id),
    };
  }
  function change(tenant, staff, request, input) {
    const { action, secret } = input,
      now = Date.now();
    if (!['create', 'rotate', 'revoke'].includes(action) || input.environment !== 'sandbox')
      fail(400, 'invalid');
    let hash = null;
    if (action !== 'revoke') {
      if (typeof secret !== 'string' || !/^hbs_[a-f0-9]{64}$/.test(secret)) fail(400, 'invalid');
      hash = digest(secret);
      if (db.prepare('SELECT 1 FROM lobby_api_clients WHERE credential=?').get(hash))
        fail(409, 'opStale');
    }
    let id, version;
    if (action === 'create') {
      if (typeof input.label !== 'string' || !input.label.trim() || input.label.trim().length > 80)
        fail(400, 'invalid');
      id = randomUUID();
      version = 1;
      db.prepare('INSERT INTO lobby_api_clients VALUES(?,?,?,?,?,?,?)').run(
        id,
        tenant,
        input.label.trim(),
        version,
        hash,
        now,
        now,
      );
    } else {
      if (typeof input.id !== 'string') fail(400, 'invalid');
      id = input.id;
      const prev = db
        .prepare(
          'SELECT version,credential IS NOT NULL AS active FROM lobby_api_clients WHERE tenant=? AND id=?',
        )
        .get(tenant, id);
      if (!prev) fail(404, 'opMissing');
      if (prev.version !== input.version || !prev.active) fail(409, 'opStale');
      version = prev.version + 1;
      db.prepare(
        'UPDATE lobby_api_clients SET credential=?,version=?,updated=? WHERE tenant=? AND id=?',
      ).run(hash, version, now, tenant, id);
    }
    const auditId = audit(tenant, staff.id, 'lobby_client_' + action, id, request, {
      version,
      capability: 'lobby.read',
      environment: 'sandbox',
    });
    db.prepare('INSERT INTO lobby_client_events VALUES(?,?,?,?,?)').run(
      auditId,
      id,
      version,
      action,
      now,
    );
    return { id, auditId, version };
  }
  function authorize(tenant, header, environment) {
    const secret = typeof header === 'string' && /^Bearer (hbs_[a-f0-9]{64})$/.exec(header)?.[1];
    if (
      !secret ||
      !db
        .prepare('SELECT 1 FROM lobby_api_clients WHERE tenant=? AND credential=?')
        .get(tenant, digest(secret))
    )
      fail(401, 'partnerAuth');
    if (environment !== 'sandbox') fail(403, 'staffForbidden');
  }
  return { list, history, change, authorize };
}
