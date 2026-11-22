export function createDemoCredits(db, { fail, audit, enabled }) {
  db.exec(`CREATE TABLE IF NOT EXISTS test_credit_entries(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),player INTEGER NOT NULL REFERENCES players(id),
    kind TEXT NOT NULL,delta INTEGER NOT NULL,balance INTEGER NOT NULL,original INTEGER UNIQUE REFERENCES test_credit_entries(id),actor INTEGER NOT NULL REFERENCES staff_accounts(id),reason TEXT NOT NULL,
    request TEXT NOT NULL,at INTEGER NOT NULL,UNIQUE(tenant,actor,request));
    CREATE INDEX IF NOT EXISTS test_credit_player ON test_credit_entries(tenant,player,id);`);
  const q = (sql) => db.prepare(sql);
  const available = (t) =>
    Boolean(enabled && q('SELECT 1 FROM report_fixture_tenants WHERE tenant_id=?').get(t));
  function requireTest(t, p) {
    if (
      !available(t) ||
      !Number.isSafeInteger(p) ||
      !q('SELECT 1 FROM players WHERE tenant_id=? AND id=? AND report_fixture=1').get(t, p)
    )
      fail(403, 'creditsTestOnly');
  }
  const current = (t, p) =>
    q('SELECT balance FROM test_credit_entries WHERE tenant=? AND player=? ORDER BY id DESC LIMIT 1').get(t, p)
      ?.balance || 0;
  function history(t, p) {
    requireTest(t, p);
    return {
      balance: current(t, p),
      entries: q(
        'SELECT id,kind,delta,balance,original,reason,at FROM test_credit_entries WHERE tenant=? AND player=? ORDER BY id DESC'
      ).all(t, p)
    };
  }
  function post(t, actor, request, { playerId: p, kind, amount, original, reason }) {
    requireTest(t, p);
    if (
      !['grant', 'debit', 'reverse'].includes(kind) ||
      typeof reason !== 'string' ||
      !reason.trim() ||
      reason.length > 240
    )
      fail(400, 'invalid');
    let delta;
    if (kind === 'reverse') {
      if (!Number.isSafeInteger(original)) fail(400, 'invalid');
      const entry = q(
        "SELECT delta FROM test_credit_entries WHERE tenant=? AND player=? AND id=? AND kind<>'reverse'"
      ).get(t, p, original);
      if (!entry) fail(404, 'discoveryMissing');
      if (q('SELECT 1 FROM test_credit_entries WHERE original=?').get(original)) fail(409, 'discoveryConflict');
      delta = -entry.delta;
    } else {
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000 || original != null)
        fail(400, 'invalid');
      delta = kind === 'grant' ? amount : -amount;
    }
    const balance = current(t, p) + delta;
    if (balance < 0 || !Number.isSafeInteger(balance)) fail(409, 'creditsBalance');
    const id = Number(
      q(
        'INSERT INTO test_credit_entries(tenant,player,kind,delta,balance,original,actor,reason,request,at) VALUES(?,?,?,?,?,?,?,?,?,?)'
      ).run(t, p, kind, delta, balance, original ?? null, actor, reason.trim(), request, Date.now())
        .lastInsertRowid
    );
    return {
      id,
      kind,
      delta,
      balance,
      original: original ?? null,
      auditId: audit(t, actor, 'demo_credit_' + kind, 'test-credit-' + id, request, {
        recordId: id,
        reason: reason.trim(),
        fields: ['demoCredits']
      })
    };
  }
  return { available, requireTest, history, post };
}
