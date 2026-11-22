// Each request covers [requested_at, ends_at). Extensions retain the start of the uninterrupted break.
export function createAccountBreaks(db, { transaction, fail }) {
  const minute = 60_000;
  let covering, insert;
  function at(tenantId, playerId, time = Date.now()) {
    return covering.get(tenantId, playerId, time, time) || null;
  }
  function record(tenantId, playerId, time, end, minutes, requestId, startKnown = true) {
    const previous = at(tenantId, playerId, time);
    const start = previous ? previous.startedAt : time;
    insert.run(tenantId, playerId, time, startKnown ? start : null, end, minutes, requestId);
  }
  transaction(() => {
    const installed = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'player_account_breaks'").get();
    db.exec(`CREATE TABLE IF NOT EXISTS player_account_breaks (
      id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      requested_at INTEGER NOT NULL, period_start INTEGER CHECK(period_start <= requested_at),
      ends_at INTEGER NOT NULL CHECK(ends_at > requested_at), duration_minutes INTEGER CHECK(duration_minutes IN (15,1440,10080,43200)),
      request_id TEXT, UNIQUE(tenant_id, player_id, request_id)
    );
    CREATE INDEX IF NOT EXISTS player_break_coverage ON player_account_breaks(tenant_id, player_id, ends_at DESC, requested_at)`);
    covering = db.prepare(`SELECT period_start AS startedAt, ends_at AS endsAt FROM player_account_breaks
      WHERE tenant_id = ? AND player_id = ? AND requested_at <= ? AND ends_at > ? ORDER BY ends_at DESC, id DESC LIMIT 1`);
    insert = db.prepare(`INSERT INTO player_account_breaks
      (tenant_id, player_id, requested_at, period_start, ends_at, duration_minutes, request_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    if (installed) return;
    // Older short pauses recorded only the last 15-minute window. A cooling-off end with no audit record has no known start.
    const now = Date.now();
    const legacy = db.prepare(`SELECT e.tenant_id, e.player_id, e.created_at AS time, e.until_at AS end,
        e.duration_days * 1440 AS minutes, 1 AS known FROM player_protection_events e
      UNION ALL SELECT p.tenant_id, p.id, s.pause_until - 900000, s.pause_until, 15, 1
        FROM player_safety s JOIN players p ON p.id = s.player WHERE s.pause_until IS NOT NULL
      UNION ALL SELECT p.tenant_id, p.id, ?, s.cooling_off_until, NULL, 0
        FROM player_safety s JOIN players p ON p.id = s.player WHERE s.cooling_off_until > ?
        AND NOT EXISTS (SELECT 1 FROM player_protection_events e WHERE e.tenant_id = p.tenant_id
          AND e.player_id = p.id AND e.until_at = s.cooling_off_until)
      ORDER BY time, end`);
    for (const row of legacy.iterate(now, now)) {
      if (row.end > row.time) record(row.tenant_id, row.player_id, row.time, row.end, row.minutes, null, Boolean(row.known));
    }
  });

  const receipt = db.prepare('SELECT duration_minutes AS minutes FROM player_account_breaks WHERE tenant_id = ? AND player_id = ? AND request_id = ?');
  const safety = db.prepare('SELECT excluded_at, cooling_off_until FROM player_safety WHERE player = ?');
  const pause = db.prepare(`INSERT INTO player_safety(player, pause_until) VALUES (?, ?) ON CONFLICT(player)
    DO UPDATE SET pause_until = max(coalesce(player_safety.pause_until, 0), excluded.pause_until)`);
  const cool = db.prepare(`INSERT INTO player_safety(player, cooling_off_until) VALUES (?, ?) ON CONFLICT(player)
    DO UPDATE SET cooling_off_until = max(coalesce(player_safety.cooling_off_until, 0), excluded.cooling_off_until)`);
  const audit = db.prepare('INSERT INTO player_protection_events(tenant_id, player_id, action, duration_days, until_at, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  // The route holds the write transaction while it checks the session, records the interval and updates the existing play limits.
  function start(tenantId, playerId, minutes, requestId, now = Date.now()) {
    const current = safety.get(playerId) || {};
    if (current.excluded_at) fail(403, 'excluded');
    const prior = requestId && receipt.get(tenantId, playerId, requestId);
    if (prior) {
      if (prior.minutes !== minutes) fail(409, 'breakRequestConflict');
      return;
    }
    const end = now + minutes * minute;
    record(tenantId, playerId, now, end, minutes, requestId);
    if (minutes === 15) {
      pause.run(playerId, end);
    } else if (end > (current.cooling_off_until || 0)) {
      cool.run(playerId, end);
      audit.run(tenantId, playerId, current.cooling_off_until > now ? 'cooling_off_extended' : 'cooling_off_started', minutes / 1440, end, now);
    }
  }
  return { at, start };
}
