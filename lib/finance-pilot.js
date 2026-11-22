import { randomUUID } from 'node:crypto';

const scripts = {
  V05: [
    ['deposit', ['confirm', 'deposit-1', 10000], ['confirm', 'deposit-1', 10000]],
    [
      'wager',
      ['bet', 'stake-1', 1000, 'atlas', 'round-1'],
      ['bet', 'stake-1', 1000, 'atlas', 'round-1'],
    ],
    ['win', ['win', 'win-1', 600, 'round-1'], ['win', 'win-1', 600, 'round-1']],
    [
      'withdraw',
      ['hold', 'payout-1', 2000],
      ['resolve', 'paid-1', 'payout-1', 'paid'],
      ['resolve', 'paid-1', 'payout-1', 'paid'],
    ],
    [
      'statement',
      ...['deposit-1', 'stake-1', 'win-1', 'paid-1'].flatMap((key, i) => [
        ['statement', 'line-' + i, key, [10000, 1000, 600, 2000][i]],
        ['statement', 'line-' + i, key, [10000, 1000, 600, 2000][i]],
      ]),
    ],
    ['close', ['close']],
  ],
  V06: [
    ['limit', ['confirm', 'funds', 2000], ['limit', 1000]],
    [
      'compete',
      ['bet', 'atlas-bet', 800, 'atlas', 'round-A'],
      ['bet', 'cedar-bet', 800, 'cedar', 'round-B'],
    ],
    ['break', ['break'], ['bet', 'after-break', 100, 'cedar', 'round-C']],
    ['late', ['win', 'late-win', 400, 'round-A'], ['win', 'late-win', 400, 'round-A']],
  ],
  V07: [
    ['fund', ['confirm', 'funds', 10000]],
    ['reserve', ['hold', 'payout-1', 2000]],
    ['timeout', ['timeout', 'payout-1'], ['timeout', 'payout-1']],
    [
      'authoritative',
      ['resolve', 'provider-result', 'payout-1', 'paid'],
      ['resolve', 'provider-result', 'payout-1', 'paid'],
    ],
    ['cutoff', ['close']],
    [
      'lateStatement',
      ['statement', 'next-day-1', 'provider-result', 2000],
      ['statement', 'next-day-1', 'provider-result', 2000],
    ],
    ['amend', ['close']],
  ],
};
const accounts = ['available', 'held', 'clearing', 'game'];
export function createFinancePilot(db, { audit, fail }) {
  db.exec(`CREATE TABLE IF NOT EXISTS pilot_runs(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),
    scenario TEXT NOT NULL,step INTEGER NOT NULL,created INTEGER NOT NULL,actor INTEGER NOT NULL REFERENCES staff_accounts(id),
    paused INTEGER NOT NULL DEFAULT 0,wager_limit INTEGER);
    CREATE INDEX IF NOT EXISTS pilot_run_lookup ON pilot_runs(tenant_id,created DESC,id);
    CREATE TABLE IF NOT EXISTS pilot_events(run TEXT NOT NULL REFERENCES pilot_runs(id),reference TEXT NOT NULL,kind TEXT NOT NULL,
    payload TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(run,reference));
    CREATE TABLE IF NOT EXISTS pilot_postings(run TEXT NOT NULL,ref TEXT NOT NULL,account TEXT NOT NULL,minor INTEGER NOT NULL,
    PRIMARY KEY(run,ref,account),FOREIGN KEY(run,ref) REFERENCES pilot_events(run,reference));
    CREATE TABLE IF NOT EXISTS pilot_rounds(run TEXT NOT NULL REFERENCES pilot_runs(id),id TEXT NOT NULL,supplier TEXT NOT NULL,
    stake_ref TEXT NOT NULL,settle_ref TEXT,PRIMARY KEY(run,id),FOREIGN KEY(run,stake_ref) REFERENCES pilot_events(run,reference));
    CREATE TABLE IF NOT EXISTS pilot_payouts(run TEXT NOT NULL REFERENCES pilot_runs(id),id TEXT NOT NULL,minor INTEGER NOT NULL,
    status TEXT NOT NULL,outcome_ref TEXT,PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS pilot_statement_lines(run TEXT NOT NULL REFERENCES pilot_runs(id),id TEXT NOT NULL,reference TEXT NOT NULL,
    minor INTEGER NOT NULL,PRIMARY KEY(run,id));
    CREATE TABLE IF NOT EXISTS pilot_closes(run TEXT NOT NULL REFERENCES pilot_runs(id),version INTEGER NOT NULL,snapshot TEXT NOT NULL,
    PRIMARY KEY(run,version));
    CREATE TABLE IF NOT EXISTS pilot_steps(run TEXT NOT NULL REFERENCES pilot_runs(id),step INTEGER NOT NULL,evidence TEXT NOT NULL,
    PRIMARY KEY(run,step));`);
  const event = db.prepare('SELECT kind,payload,result FROM pilot_events WHERE run=? AND reference=?');
  const saveEvent = db.prepare('INSERT INTO pilot_events VALUES(?,?,?,?,?)');
  const posting = db.prepare('INSERT INTO pilot_postings VALUES(?,?,?,?)');
  const onePayout = db.prepare(
    'SELECT id,minor,status,outcome_ref AS outcomeRef FROM pilot_payouts WHERE run=? AND id=?',
  );
  function owned(tenant, id) {
    if (typeof id !== 'string') fail(404, 'opMissing');
    const row = db.prepare('SELECT * FROM pilot_runs WHERE tenant_id=? AND id=?').get(tenant, id);
    if (!row) fail(404, 'opMissing');
    return row;
  }
  function balances(id) {
    const sums = db
      .prepare('SELECT account,sum(minor) AS minor FROM pilot_postings WHERE run=? GROUP BY account')
      .all(id);
    return {
      ...Object.fromEntries(accounts.map((k) => [k, 0])),
      ...Object.fromEntries(sums.map((x) => [x.account, x.minor])),
    };
  }
  function total(id, kind, account) {
    return db
      .prepare(
        `SELECT coalesce(sum(p.minor),0) AS n FROM pilot_postings p JOIN pilot_events e ON e.run=p.run AND e.reference=p.ref
      WHERE p.run=? AND e.kind=? AND p.account=?`,
      )
      .get(id, kind, account).n;
  }
  function summary(id) {
    const balance = balances(id),
      stakes = total(id, 'bet', 'game'),
      wins = -total(id, 'win', 'game');
    const statements = db
      .prepare(
        `SELECT s.id,s.reference,s.minor,
      CASE WHEN p.ref IS NULL THEN 'unknown' WHEN s.minor=abs(p.minor) THEN 'matched' ELSE 'mismatch' END AS status
      FROM pilot_statement_lines s LEFT JOIN pilot_postings p ON p.run=s.run AND p.ref=s.reference AND p.account IN ('clearing','game')
      WHERE s.run=? ORDER BY s.id`,
      )
      .all(id);
    const payouts = db
      .prepare(
        'SELECT id,minor,status,outcome_ref AS outcomeRef FROM pilot_payouts WHERE run=? ORDER BY id',
      )
      .all(id);
    const timing = payouts
      .filter(
        (p) =>
          p.status === 'paid' &&
          !statements.some((s) => s.reference === p.outcomeRef && s.status === 'matched'),
      )
      .map((p) => p.id);
    const openRounds = db
      .prepare('SELECT count(*) AS n FROM pilot_rounds WHERE run=? AND settle_ref IS NULL')
      .get(id).n;
    const journalCount = db
      .prepare('SELECT count(DISTINCT ref) AS n FROM pilot_postings WHERE run=?')
      .get(id).n;
    const unbalanced = db
      .prepare('SELECT ref FROM pilot_postings WHERE run=? GROUP BY ref HAVING sum(minor)<>0')
      .all(id);
    return {
      asset: 'TST',
      scale: 2,
      balance,
      journalCount,
      unbalanced: unbalanced.length,
      stakes,
      wins,
      ggr: stakes - wins,
      cash: -balance.clearing,
      openRounds,
      payouts,
      statements,
      timing,
    };
  }
  // Every command runs inside the caller's immediate SQLite transaction.
  function execute(run, command) {
    const [kind, reference, value, scope, round] = command,
      id = run.id;
    if (kind === 'limit') {
      db.prepare('UPDATE pilot_runs SET wager_limit=? WHERE id=?').run(reference, id);
      return { kind, limit: reference };
    }
    if (kind === 'break') {
      db.prepare('UPDATE pilot_runs SET paused=1 WHERE id=?').run(id);
      return { kind, status: 'paused' };
    }
    if (kind === 'timeout') {
      const p = onePayout.get(id, reference);
      if (!p || !['held', 'unknown'].includes(p.status)) fail(409, 'opUnavailable');
      db.prepare("UPDATE pilot_payouts SET status='unknown' WHERE run=? AND id=?").run(id, reference);
      return { kind, reference, status: 'unknown' };
    }
    if (kind === 'statement') {
      const existing = db
        .prepare('SELECT reference,minor FROM pilot_statement_lines WHERE run=? AND id=?')
        .get(id, reference);
      if (existing)
        return {
          kind,
          reference,
          status: existing.reference === value && existing.minor === scope ? 'replayed' : 'conflict',
        };
      db.prepare('INSERT INTO pilot_statement_lines VALUES(?,?,?,?)').run(id, reference, value, scope);
      return { kind, reference, status: 'recorded' };
    }
    if (kind === 'close') {
      const snapshot = JSON.stringify(summary(id));
      const prior = db
        .prepare('SELECT version,snapshot FROM pilot_closes WHERE run=? ORDER BY version DESC LIMIT 1')
        .get(id);
      if (prior?.snapshot === snapshot) return { kind, version: prior.version, status: 'replayed' };
      const version = (prior?.version ?? 0) + 1;
      db.prepare('INSERT INTO pilot_closes VALUES(?,?,?)').run(id, version, snapshot);
      return { kind, version, status: prior ? 'amended' : 'closed' };
    }
    const payload = JSON.stringify(command),
      prior = event.get(id, reference);
    if (prior)
      return prior.payload === payload
        ? { ...JSON.parse(prior.result), replayed: true }
        : { kind, reference, status: 'conflict' };
    let status = 'posted',
      from,
      to,
      amount = value,
      after;
    const balance = balances(id),
      current = db.prepare('SELECT paused,wager_limit FROM pilot_runs WHERE id=?').get(id);
    if (kind === 'confirm') {
      from = 'clearing';
      to = 'available';
    } else if (kind === 'bet') {
      from = 'available';
      to = 'game';
      if (current.paused) status = 'paused';
      else if (current.wager_limit !== null && total(id, 'bet', 'game') + value > current.wager_limit)
        status = 'limit';
      else if (balance.available < value) status = 'funds';
      else if (db.prepare('SELECT 1 FROM pilot_rounds WHERE run=? AND id=?').get(id, round))
        status = 'round_exists';
      after = () =>
        db.prepare('INSERT INTO pilot_rounds VALUES(?,?,?,?,NULL)').run(id, round, scope, reference);
    } else if (kind === 'win') {
      from = 'game';
      to = 'available';
      const accepted = db
        .prepare('SELECT settle_ref FROM pilot_rounds WHERE run=? AND id=?')
        .get(id, scope);
      if (!accepted || accepted.settle_ref) status = 'round_closed';
      after = () =>
        db
          .prepare('UPDATE pilot_rounds SET settle_ref=? WHERE run=? AND id=?')
          .run(reference, id, scope);
    } else if (kind === 'hold') {
      from = 'available';
      to = 'held';
      if (balance.available < value) status = 'funds';
      after = () =>
        db.prepare("INSERT INTO pilot_payouts VALUES(?,?,?,'held',NULL)").run(id, reference, value);
    } else if (kind === 'resolve') {
      const p = onePayout.get(id, value);
      if (!p || !['held', 'unknown'].includes(p.status)) status = 'payout_final';
      amount = p?.minor;
      from = 'held';
      to = scope === 'paid' ? 'clearing' : 'available';
      after = () =>
        db
          .prepare('UPDATE pilot_payouts SET status=?,outcome_ref=? WHERE run=? AND id=?')
          .run(scope, reference, id, value);
    } else fail(400, 'invalid');
    const result = { kind, reference, status };
    saveEvent.run(id, reference, kind, payload, JSON.stringify(result));
    if (status === 'posted') {
      if (!Number.isSafeInteger(amount) || amount < 0 || from === to) fail(400, 'invalid');
      posting.run(id, reference, from, -amount);
      posting.run(id, reference, to, amount);
      after?.();
    }
    return result;
  }
  function list(tenant, page = 1) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) fail(400, 'invalid');
    const { total } = db
      .prepare('SELECT count(*) AS total FROM pilot_runs WHERE tenant_id=?')
      .get(tenant);
    page = Math.min(page, Math.max(1, Math.ceil(total / 8)));
    const items = db
      .prepare(
        'SELECT id,scenario,step,created FROM pilot_runs WHERE tenant_id=? ORDER BY created DESC,id LIMIT 8 OFFSET ?',
      )
      .all(tenant, (page - 1) * 8);
    return { page, total, items };
  }
  function detail(tenant, id) {
    const run = owned(tenant, id);
    const steps = db
      .prepare('SELECT step,evidence FROM pilot_steps WHERE run=? ORDER BY step')
      .all(id)
      .map((s) => ({ ...s, evidence: JSON.parse(s.evidence) }));
    const closes = db
      .prepare('SELECT version,snapshot FROM pilot_closes WHERE run=? ORDER BY version')
      .all(id)
      .map((c) => ({ ...c, snapshot: JSON.parse(c.snapshot) }));
    const journals = db
      .prepare('SELECT ref,account,minor FROM pilot_postings WHERE run=? ORDER BY rowid')
      .all(id);
    return {
      id,
      scenario: run.scenario,
      step: run.step,
      created: run.created,
      paused: Boolean(run.paused),
      limit: run.wager_limit,
      stages: scripts[run.scenario].map((s) => s[0]),
      steps,
      closes,
      journals,
      summary: summary(id),
    };
  }
  function change(tenant, staff, request, input) {
    if (input.action === 'start') {
      if (!Object.hasOwn(scripts, input.scenario)) fail(400, 'invalid');
      const id = randomUUID();
      db.prepare(
        'INSERT INTO pilot_runs(id,tenant_id,scenario,step,created,actor) VALUES(?,?,?,0,?,?)',
      ).run(id, tenant, input.scenario, Date.now(), staff.id);
      return {
        id,
        auditId: audit(tenant, staff.id, 'pilot_started', id, request, { scenario: input.scenario }),
      };
    }
    const run = owned(tenant, input.id),
      script = scripts[run.scenario];
    if (input.action === 'attempt') {
      if (
        run.scenario !== 'V06' ||
        run.step !== 1 ||
        input.step !== run.step ||
        !['atlas', 'cedar'].includes(input.provider)
      )
        fail(409, 'opStale');
      const command = script[1].slice(1).find((c) => c[3] === input.provider),
        result = execute(run, command);
      return {
        id: run.id,
        result,
        auditId: audit(tenant, staff.id, 'pilot_wager_checked', run.id, request, {
          provider: input.provider,
          status: result.status,
        }),
      };
    }
    if (input.action !== 'step' || !Number.isSafeInteger(input.step)) fail(400, 'invalid');
    if (input.step !== run.step || run.step >= script.length) fail(409, 'opStale');
    const [stage, ...commands] = script[run.step];
    let results;
    if (stage === 'compete') {
      results = commands.map((c) => {
        const attempt = event.get(run.id, c[1]);
        if (!attempt) fail(409, 'opUnavailable');
        return JSON.parse(attempt.result);
      });
    } else if (stage === 'late') {
      const accepted = db
        .prepare('SELECT id FROM pilot_rounds WHERE run=? AND settle_ref IS NULL')
        .get(run.id);
      if (!accepted) fail(409, 'opUnavailable');
      results = commands.map(([kind, key, amount]) => execute(run, [kind, key, amount, accepted.id]));
    } else results = commands.map((c) => execute(run, c));
    db.prepare('INSERT INTO pilot_steps VALUES(?,?,?)').run(
      run.id,
      run.step + 1,
      JSON.stringify(results),
    );
    db.prepare('UPDATE pilot_runs SET step=step+1 WHERE id=?').run(run.id);
    return {
      id: run.id,
      step: run.step + 1,
      auditId: audit(tenant, staff.id, 'pilot_step_recorded', run.id, request, {
        stage,
        step: run.step + 1,
      }),
    };
  }
  return { list, detail, change };
}
