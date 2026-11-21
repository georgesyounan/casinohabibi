export function installPlayerAccess(db, transaction) {
  transaction(() => {
    const columns = db.prepare('PRAGMA table_info(players)').all().map(({ name }) => name);
    if (!columns.includes('access_status')) {
      db.exec("ALTER TABLE players ADD COLUMN access_status TEXT NOT NULL DEFAULT 'active' CHECK(access_status IN ('active','suspended'))");
    }
    if (!columns.includes('access_version')) {
      db.exec('ALTER TABLE players ADD COLUMN access_version INTEGER NOT NULL DEFAULT 0');
    }
    if (!db.prepare('PRAGMA table_info(tenant_staff_memberships)').all().some(({ name }) => name === 'manage_player_access')) {
      db.exec('ALTER TABLE tenant_staff_memberships ADD COLUMN manage_player_access INTEGER NOT NULL DEFAULT 0 CHECK(manage_player_access IN (0,1))');
    }
    db.exec(`CREATE TABLE IF NOT EXISTS player_recovery_deliveries (
      audit_id INTEGER PRIMARY KEY REFERENCES staff_events(id), locale TEXT NOT NULL,
      delivery TEXT NOT NULL DEFAULT 'pending' CHECK(delivery IN ('pending','sent','local'))
    )`);
  });
}

export function createPlayerAccess(db, { fail, recordAudit }) {
  const fields = `p.id, p.email, p.email_verified AS emailVerified, p.access_status AS status,
    p.access_version AS version, profile.display_name AS displayName, profile.preferred_locale AS locale`;
  const from = `FROM players p LEFT JOIN player_profiles profile ON profile.player_id = p.id AND profile.tenant_id = p.tenant_id`;
  const lookup = db.prepare(`SELECT ${fields} ${from} WHERE p.tenant_id = ? AND p.id = ?`);
  const sessions = db.prepare('DELETE FROM sessions WHERE tenant_id = ? AND player = ?');
  const resetTokens = db.prepare('DELETE FROM player_password_resets WHERE tenant_id = ? AND player_id = ?');
  const issueReset = db.prepare('INSERT INTO player_password_resets(token_hash, tenant_id, player_id, expires, created_at) VALUES (?, ?, ?, ?, ?)');

  function get(tenantId, id) {
    const row = lookup.get(tenantId, id);
    if (!row) fail(404, 'playerNotFound');
    return row;
  }

  function search(tenantId, query) {
    if (!query || query.length > 254) return [];
    const byId = query.match(/^(?:player-)?([1-9]\d*)$/);
    const bySave = query.match(/^save-([1-9]\d*)$/);
    const byActivity = query.match(/^activity-([1-9]\d*)$/);
    if (byId || bySave || byActivity) {
      const id = Number((byId || bySave || byActivity)[1]);
      if (!Number.isSafeInteger(id)) return [];
      if (byId) {
        const row = lookup.get(tenantId, id);
        return row ? [row] : [];
      }
      const row = db.prepare(`SELECT ${fields} ${from}
        JOIN coming_soon_saves s ON s.player_id = p.id AND s.tenant_id = p.tenant_id
        WHERE s.tenant_id = ? AND s.id = ${byActivity ? '(SELECT save_id FROM coming_soon_activity WHERE id = ?)' : '?'}`).get(tenantId, id);
      return row ? [row] : [];
    }
    if (query.length < 2) return [];
    const prefix = query.replace(/[\\%_]/g, '\\$&') + '%';
    return db.prepare(`SELECT ${fields} ${from} WHERE p.tenant_id = ? AND p.email LIKE ? ESCAPE '\\'
      ORDER BY p.email LIMIT 25`).all(tenantId, prefix);
  }

  function detail(tenantId, id) {
    const player = get(tenantId, id);
    const { count: activeSessions } = db.prepare('SELECT count(*) AS count FROM sessions WHERE tenant_id = ? AND player = ? AND expires > ?').get(tenantId, id, Date.now());
    const events = db.prepare(`SELECT e.id, e.action, e.created_at AS createdAt, a.email AS actor,
      json_extract(e.details, '$.reason') AS reason FROM staff_events e JOIN staff_accounts a ON a.id = e.actor_id
      WHERE e.tenant_id = ? AND e.target = ? AND e.action IN ('player_suspended','player_restored','player_recovery_requested')
      ORDER BY e.id DESC LIMIT 30`).all(tenantId, 'player-' + id);
    return { ...player, activeSessions, events };
  }

  function changeStatus(tenantId, staffId, requestId, id, { status, version, reason }) {
    if (!['active', 'suspended'].includes(status) || !Number.isSafeInteger(version) || version < 0) fail(400, 'invalid');
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 240) fail(400, 'staffReasonRequired');
    const player = get(tenantId, id);
    if (player.version !== version) fail(409, 'playerAccessConflict');
    if (player.status === status) return { id, status, version, auditId: null };
    db.prepare('UPDATE players SET access_status = ?, access_version = access_version + 1 WHERE tenant_id = ? AND id = ?').run(status, tenantId, id);
    if (status === 'suspended') {
      sessions.run(tenantId, id);
      resetTokens.run(tenantId, id);
      db.prepare('DELETE FROM player_email_verifications WHERE tenant_id = ? AND player_id = ?').run(tenantId, id);
      db.prepare('DELETE FROM player_email_changes WHERE tenant_id = ? AND player_id = ?').run(tenantId, id);
    }
    const auditId = recordAudit(tenantId, staffId, status === 'suspended' ? 'player_suspended' : 'player_restored', 'player-' + id, requestId, {
      recordId: id, revision: version + 1, fields: ['status'], previousStatus: player.status, status, reason: reason.trim()
    });
    return { id, status, version: version + 1, auditId };
  }

  function newReset(tenantId, id, tokenHash) {
    const now = Date.now();
    const player = get(tenantId, id);
    if (player.status !== 'active') fail(409, 'playerSuspended');
    resetTokens.run(tenantId, id);
    db.prepare('DELETE FROM player_password_resets WHERE expires <= ?').run(now);
    issueReset.run(tokenHash, tenantId, id, now + 30 * 60 * 1000, now);
    return player;
  }

  return { search, get, detail, changeStatus, newReset };
}
