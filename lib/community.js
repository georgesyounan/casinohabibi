import { createHash, randomBytes } from 'node:crypto';
const hash = (v) => createHash('sha256').update(v).digest('hex');
const short = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 120;
export function createCommunity(db, { fail, audit, rewards, getPreview }) {
  const q = (s) => db.prepare(s);
  db.exec(`CREATE TABLE IF NOT EXISTS shared_lists(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),owner INTEGER NOT NULL REFERENCES players(id),name TEXT NOT NULL,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shared_members(list INTEGER NOT NULL REFERENCES shared_lists(id),player INTEGER NOT NULL REFERENCES players(id),active INTEGER NOT NULL,PRIMARY KEY(list,player));
    CREATE TABLE IF NOT EXISTS shared_invites(id INTEGER PRIMARY KEY,list INTEGER NOT NULL REFERENCES shared_lists(id),token TEXT UNIQUE NOT NULL,expires INTEGER NOT NULL,consumed INTEGER REFERENCES players(id),revoked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS shared_entries(id INTEGER PRIMARY KEY,list INTEGER NOT NULL REFERENCES shared_lists(id),player INTEGER NOT NULL REFERENCES players(id),kind TEXT NOT NULL,value TEXT NOT NULL,state TEXT NOT NULL,at INTEGER NOT NULL,UNIQUE(list,kind,value));
    CREATE TABLE IF NOT EXISTS shared_polls(id INTEGER PRIMARY KEY,tenant TEXT NOT NULL REFERENCES tenants(id),title_en TEXT NOT NULL,title_fr TEXT NOT NULL,options TEXT NOT NULL,closed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS shared_votes(poll INTEGER NOT NULL REFERENCES shared_polls(id),player INTEGER NOT NULL REFERENCES players(id),choice INTEGER NOT NULL,PRIMARY KEY(poll,player));`);
  const member = q(
    'SELECT l.id,l.owner,l.name FROM shared_lists l JOIN shared_members m ON m.list=l.id WHERE l.tenant=? AND m.player=? AND m.active=1 AND l.id=?'
  );
  const poll = q('SELECT * FROM shared_polls WHERE tenant=? AND id=?');
  const presentPoll = (r) => ({
    id: r.id,
    titleEn: r.title_en,
    titleFr: r.title_fr,
    options: JSON.parse(r.options),
    closed: Boolean(r.closed)
  });
  function state(t, p) {
    return {
      lists: q(
        'SELECT l.id,l.name,l.owner=? AS organizer FROM shared_lists l JOIN shared_members m ON m.list=l.id WHERE l.tenant=? AND m.player=? AND m.active=1 ORDER BY l.id DESC'
      ).all(p, t, p),
      polls: q('SELECT * FROM shared_polls WHERE tenant=? ORDER BY id DESC')
        .all(t)
        .map((r) => ({
          ...presentPoll(r),
          choice: q('SELECT choice FROM shared_votes WHERE poll=? AND player=?').get(r.id, p)?.choice ?? null
        }))
    };
  }
  function detail(t, p, id) {
    const list = member.get(t, p, id);
    if (!list) fail(404, 'discoveryMissing');
    const organizer = list.owner === p;
    const entries = q(
      "SELECT id,kind,value,state,player FROM shared_entries WHERE list=? AND (state='approved' OR player=? OR ?=1) ORDER BY id DESC"
    )
      .all(id, p, Number(organizer))
      .map((e) => {
        const preview = e.kind === 'preview' && getPreview(t, e.value);
        return {
          id: e.id,
          kind: e.kind,
          value: e.value,
          state: e.state,
          own: e.player === p,
          ...(preview ? { titleEn: preview.titleEn, titleFr: preview.titleFr } : {}),
          available: e.kind !== 'preview' || Boolean(preview)
        };
      });
    return {
      id,
      name: list.name,
      organizer,
      entries,
      ...(organizer
        ? {
            members: q(
              'SELECT player FROM shared_members WHERE list=? AND active=1 AND player<>? ORDER BY player'
            ).all(id, p),
            invites: q(
              'SELECT id,expires,consumed IS NOT NULL AS used,revoked FROM shared_invites WHERE list=? ORDER BY id DESC'
            ).all(id)
          }
        : {})
    };
  }
  function mutate(t, p, action, input, now = Date.now()) {
    const id = input.id;
    if (action === 'create') {
      if (!short(input.name)) fail(400, 'invalid');
      const list = Number(
        q('INSERT INTO shared_lists(tenant,owner,name,at) VALUES(?,?,?,?)').run(t, p, input.name.trim(), now)
          .lastInsertRowid
      );
      q('INSERT INTO shared_members VALUES(?,?,1)').run(list, p);
      return { id: list };
    }
    if (action === 'join') {
      if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token))
        fail(404, 'inviteUnavailable');
      const row = q(
        'SELECT i.*,l.owner FROM shared_invites i JOIN shared_lists l ON l.id=i.list WHERE l.tenant=? AND i.token=? AND i.revoked=0 AND i.expires>?'
      ).get(t, hash(input.token), now);
      if (
        !row ||
        row.owner === p ||
        (row.consumed !== null && (row.consumed !== p || !member.get(t, p, row.list)))
      )
        fail(404, 'inviteUnavailable');
      if (row.consumed === null) {
        q('UPDATE shared_invites SET consumed=? WHERE id=?').run(p, row.id);
        q('INSERT INTO shared_members VALUES(?,?,1) ON CONFLICT(list,player) DO UPDATE SET active=1').run(
          row.list,
          p
        );
      }
      rewards.observe(t, p, 'joinList', row.list, 'list-' + row.list, now);
      return { id: row.list };
    }
    if (action === 'vote' || action === 'result') {
      const r = poll.get(t, id);
      if (!r) fail(404, 'discoveryMissing');
      if (action === 'result') {
        if (!r.closed) fail(409, 'pollOpen');
        rewards.observe(t, p, 'result', id, 'result-' + id, now, { voteRef: 'poll-' + id });
        return {
          ...presentPoll(r),
          counts: JSON.parse(r.options).map(
            (_, i) => q('SELECT count(*) AS n FROM shared_votes WHERE poll=? AND choice=?').get(id, i).n
          )
        };
      }
      if (
        r.closed ||
        !Number.isInteger(input.choice) ||
        input.choice < 0 ||
        input.choice >= JSON.parse(r.options).length
      )
        fail(409, 'discoveryConflict');
      q(
        'INSERT INTO shared_votes VALUES(?,?,?) ON CONFLICT(poll,player) DO UPDATE SET choice=excluded.choice'
      ).run(id, p, input.choice);
      rewards.observe(t, p, 'vote', id, 'poll-' + id, now);
      return { id, choice: input.choice };
    }
    if (!Number.isSafeInteger(id)) fail(400, 'invalid');
    const list = member.get(t, p, id);
    if (!list) fail(404, 'discoveryMissing');
    const organizer = list.owner === p;
    if (action === 'add') {
      const { kind, value } = input;
      if (
        !['preview', 'theme'].includes(kind) ||
        !short(value) ||
        (kind === 'preview' && !getPreview(t, value))
      )
        fail(400, 'invalid');
      const valueClean = value.trim();
      const result = q(
        'INSERT OR IGNORE INTO shared_entries(list,player,kind,value,state,at) VALUES(?,?,?,?,?,?)'
      ).run(id, p, kind, valueClean, organizer ? 'approved' : 'pending', now);
      if (result.changes && kind === 'preview')
        rewards.observe(
          t,
          p,
          'contribute',
          Number(result.lastInsertRowid),
          'entry-' + result.lastInsertRowid,
          now,
          { joinRef: 'list-' + id }
        );
      return { id };
    }
    if (!organizer) fail(403, 'staffForbidden');
    if (action === 'invite') {
      const token = randomBytes(32).toString('hex'),
        expires = now + 7 * 86400000;
      const row = q('INSERT INTO shared_invites(list,token,expires) VALUES(?,?,?)').run(
        id,
        hash(token),
        expires
      );
      return { id, inviteId: Number(row.lastInsertRowid), token, expires };
    }
    if (action === 'revoke') {
      if (!q('UPDATE shared_invites SET revoked=1 WHERE list=? AND id=?').run(id, input.inviteId).changes)
        fail(404, 'discoveryMissing');
    } else if (action === 'remove') {
      if (
        input.playerId === p ||
        !q('UPDATE shared_members SET active=0 WHERE list=? AND player=? AND active=1').run(id, input.playerId)
          .changes
      )
        fail(409, 'discoveryConflict');
      q('UPDATE shared_invites SET revoked=1 WHERE list=? AND consumed=?').run(id, input.playerId);
    } else if (action === 'moderate') {
      if (
        !['approved', 'rejected'].includes(input.state) ||
        !q("UPDATE shared_entries SET state=? WHERE list=? AND id=? AND state='pending'").run(
          input.state,
          id,
          input.entryId
        ).changes
      )
        fail(409, 'discoveryConflict');
    } else fail(404, 'discoveryMissing');
    return { id };
  }
  function managePoll(t, actor, request, input) {
    let id = input.id;
    if (id) {
      if (
        input.action !== 'publishResults' ||
        !q('UPDATE shared_polls SET closed=1 WHERE id=? AND tenant=? AND closed=0').run(id, t).changes
      )
        fail(409, 'discoveryConflict');
    } else {
      if (
        input.action !== 'open' ||
        ![input.titleEn, input.titleFr].every(short) ||
        !Array.isArray(input.options) ||
        input.options.length < 2 ||
        input.options.length > 8 ||
        input.options.some((x) => !x || ![x.titleEn, x.titleFr].every(short))
      )
        fail(400, 'invalid');
      id = Number(
        q('INSERT INTO shared_polls(tenant,title_en,title_fr,options) VALUES(?,?,?,?)').run(
          t,
          input.titleEn,
          input.titleFr,
          JSON.stringify(input.options)
        ).lastInsertRowid
      );
    }
    return {
      id,
      auditId: audit(t, actor, 'poll_' + input.action, 'poll-' + id, request, {
        recordId: id,
        fields: ['poll']
      })
    };
  }
  return {
    state,
    detail,
    mutate,
    managePoll,
    polls: (t) => q('SELECT * FROM shared_polls WHERE tenant=? ORDER BY id DESC').all(t).map(presentPoll),
    canLink: (t, p, ref) => /^list-[1-9]\d{0,14}$/.test(ref) && Boolean(member.get(t, p, Number(ref.slice(5))))
  };
}
