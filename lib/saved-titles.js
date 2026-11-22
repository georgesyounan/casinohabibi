const titleIdFromKey = (key) => {
  const match = /^coming-soon:([1-9]\d*)$/.exec(key);
  const id = match && Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
};

export function createSavedTitles(db, { fail, transaction }) {
  transaction(() => {
    const firstInstall = !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'coming_soon_activity'").get();
    db.exec(`CREATE TABLE IF NOT EXISTS coming_soon_activity (
        id INTEGER PRIMARY KEY, save_id INTEGER NOT NULL REFERENCES coming_soon_saves(id) ON DELETE CASCADE,
        action TEXT NOT NULL CHECK(action IN ('save','remove')), created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS coming_soon_activity_by_save ON coming_soon_activity(save_id, id);
      CREATE TABLE IF NOT EXISTS coming_soon_activity_receipts (
        tenant_id TEXT NOT NULL, player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        request_id TEXT NOT NULL, title_id INTEGER NOT NULL, saved INTEGER NOT NULL CHECK(saved IN (0,1)), activity_id INTEGER REFERENCES coming_soon_activity(id) ON DELETE CASCADE,
        PRIMARY KEY(tenant_id, player_id, request_id), FOREIGN KEY(tenant_id, title_id) REFERENCES coming_soon_titles(tenant_id, id)
      );`);
    // Only the first save was recorded by older versions. Its original reference and time are retained.
    if (firstInstall) db.exec("INSERT INTO coming_soon_activity(save_id, action, created_at) SELECT id, 'save', created_at FROM coming_soon_saves ORDER BY id");
  });

  const findSave = db.prepare('SELECT id FROM coming_soon_saves WHERE tenant_id = ? AND player_id = ? AND title_id = ?');
  const ensureSave = db.prepare(`INSERT INTO coming_soon_saves(tenant_id, player_id, title_id, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(tenant_id, player_id, title_id) DO NOTHING`);
  const add = db.prepare('INSERT OR IGNORE INTO player_favorites(player_id, tenant_id, favorite_key, created_at) VALUES (?, ?, ?, ?)');
  const remove = db.prepare('DELETE FROM player_favorites WHERE player_id = ? AND tenant_id = ? AND favorite_key = ?');
  const append = db.prepare('INSERT INTO coming_soon_activity(save_id, action, created_at) VALUES (?, ?, ?)');
  const last = db.prepare('SELECT id, action FROM coming_soon_activity WHERE save_id = ? ORDER BY id DESC LIMIT 1');
  const current = db.prepare('SELECT 1 FROM player_favorites WHERE player_id = ? AND tenant_id = ? AND favorite_key = ?');
  const lookup = db.prepare('SELECT title_id AS titleId, saved, activity_id AS activityId FROM coming_soon_activity_receipts WHERE tenant_id = ? AND player_id = ? AND request_id = ?');
  const remember = db.prepare('INSERT INTO coming_soon_activity_receipts(tenant_id, player_id, request_id, title_id, saved, activity_id) VALUES (?, ?, ?, ?, ?, ?)');

  // Caller validates publish eligibility and wraps the entire shelf mutation in one transaction.
  function set(tenantId, playerId, key, saved, now, requestId) {
    const titleId = titleIdFromKey(key);
    if (titleId && requestId) {
      const receipt = lookup.get(tenantId, playerId, requestId);
      if (receipt) {
        if (receipt.titleId !== titleId || Boolean(receipt.saved) !== saved) fail(409, 'favoriteRequestConflict');
        return { saved: Boolean(current.get(playerId, tenantId, key)), activityId: receipt.activityId };
      }
    }
    const changed = saved ? add.run(playerId, tenantId, key, now).changes : remove.run(playerId, tenantId, key).changes;
    if (!titleId) return { saved };
    if (saved && changed) ensureSave.run(tenantId, playerId, titleId, now);
    const first = findSave.get(tenantId, playerId, titleId);
    const action = saved ? 'save' : 'remove';
    let activityId = null;
    if (first) {
      if (changed) activityId = Number(append.run(first.id, action, now).lastInsertRowid);
      else {
        const latest = last.get(first.id);
        if (latest?.action === action) activityId = latest.id;
      }
    }
    if (requestId && (first || db.prepare('SELECT 1 FROM coming_soon_titles WHERE tenant_id = ? AND id = ?').get(tenantId, titleId))) {
      remember.run(tenantId, playerId, requestId, titleId, Number(saved), activityId);
    }
    return { saved, activityId };
  }

  function history(tenantId, playerId, { activityId = null, before = null, limit = 30 } = {}) {
    const rows = db.prepare(`SELECT a.id, a.action, a.created_at AS createdAt, s.id AS saveId, t.slug, t.state,
      EXISTS (SELECT 1 FROM player_account_breaks b WHERE b.tenant_id = s.tenant_id AND b.player_id = s.player_id
        AND b.requested_at <= a.created_at AND b.ends_at > a.created_at) AS duringAccountBreak
      FROM coming_soon_saves s JOIN coming_soon_activity a ON a.save_id = s.id
      JOIN coming_soon_titles t ON t.tenant_id = s.tenant_id AND t.id = s.title_id
      WHERE s.tenant_id = ? AND s.player_id = ? AND (? IS NULL OR a.id = ?) AND (? IS NULL OR a.id < ?)
      ORDER BY a.id DESC LIMIT ?`).all(tenantId, playerId, activityId, activityId, before, before, limit === -1 ? -1 : limit + 1);
    const more = limit > 0 && rows.length > limit;
    if (more) rows.pop();
    return { entries: rows.map((row) => ({ ...row, duringAccountBreak: Boolean(row.duringAccountBreak) })), nextCursor: more ? rows.at(-1).id : null };
  }
  return { set, history };
}
