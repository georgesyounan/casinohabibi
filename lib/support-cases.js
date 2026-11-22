const caseFields = `t.id, l.reference, t.category, t.is_complaint AS isComplaint, t.status,
  t.created_at AS createdAt, t.updated_at AS updatedAt`;
const staffFields = `${caseFields}, t.player_id AS playerId, p.email, profile.display_name AS displayName,
  t.priority, t.assigned_to AS assignedTo, owner.email AS assignedEmail`;
const cases = `FROM support_tickets t LEFT JOIN support_case_links l ON l.ticket=t.id`;
const staffCases = `${cases} JOIN players p ON p.id=t.player_id AND p.tenant_id=t.tenant_id
  LEFT JOIN player_profiles profile ON profile.tenant_id=t.tenant_id AND profile.player_id=t.player_id
  LEFT JOIN staff_accounts owner ON owner.id=t.assigned_to`;
const latestReply = `(SELECT max(m.created_at) FROM support_ticket_messages m
  WHERE m.tenant_id=t.tenant_id AND m.ticket_id=t.id AND m.author_type='staff')`;
const unread = `coalesce(${latestReply},0)>coalesce(t.player_seen_at,0)`;
const updatedOrder = 't.updated_at DESC, t.id DESC';
const queueOrder = `CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
  CASE t.status WHEN 'open' THEN 0 WHEN 'answered' THEN 1 ELSE 2 END, ${updatedOrder}`;

export function createSupportCases(db, fail, attachMessages, accountBreaks) {
  const fold = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  db.function('support_fold', { deterministic:true }, fold);

  function paging(params, total, size) {
    const input = params.get('page') ?? '1';
    if (!/^[1-9]\d*$/.test(input) || !Number.isSafeInteger(Number(input))) fail(400,'invalid');
    const pages = Math.max(1,Math.ceil(total/size));
    const page = Math.min(pages,Number(input));
    return {total, page, pages, size};
  }

  function queue(tenant, staffId, params) {
    const clauses = ['t.tenant_id=?'];
    const args = [tenant];
    for (const [key,column,allowed] of [
      ['status','t.status',['open','answered','closed']],
      ['priority','t.priority',['urgent','high','normal','low']],
      ['topic','t.category',['account','game','responsible_play','other']],
      ['type','t.is_complaint',['complaints','requests']],
      ['assignee','t.assigned_to',['mine','unassigned']]
    ]) {
      const value = params.get(key) ?? 'all';
      if (value==='all') continue;
      if (!allowed.includes(value)) fail(400,'invalid');
      if (value==='unassigned') { clauses.push('t.assigned_to IS NULL'); continue; }
      if (key==='topic') clauses.push('t.is_complaint=0');
      clauses.push(column+'=?');
      args.push(key==='assignee' ? staffId : key==='type' ? Number(value==='complaints') : value);
    }
    const q=fold(params.get('q')).trim();
    if (q.length>254) fail(400,'invalid');
    const exact=q.match(/^(case-|#|player-)?(\d+)$/);
    if (exact) {
      if (!Number.isSafeInteger(Number(exact[2]))) fail(400,'invalid');
      clauses.push(exact[1]==='player-' ? 't.player_id=?' : 't.id=?');
      args.push(Number(exact[2]));
    } else if (/^(round|claim|grant|save|activity|list)-\d+$/.test(q)) {
      clauses.push('l.reference=?');
      args.push(q);
    } else if (q) {
      clauses.push(`(instr(support_fold(p.email),?) OR instr(support_fold(profile.display_name),?) OR
        instr(support_fold(owner.email),?) OR instr(support_fold(l.reference),?) OR instr(support_fold(t.message),?) OR
        EXISTS(SELECT 1 FROM support_ticket_messages m WHERE m.ticket_id=t.id AND m.tenant_id=t.tenant_id AND instr(support_fold(m.message),?)) OR
        EXISTS(SELECT 1 FROM support_ticket_notes n WHERE n.ticket_id=t.id AND n.tenant_id=t.tenant_id AND instr(support_fold(n.note),?)))`);
      args.push(...Array(7).fill(q));
    }
    const from=staffCases+' WHERE '+clauses.join(' AND ');
    const n=db.prepare('SELECT count(*) AS n '+from).get(...args).n;
    const page=paging(params,n,10);
    const tickets=db.prepare(`SELECT ${staffFields},substr(t.message,1,90) AS subject ${from} ORDER BY ${queueOrder} LIMIT ? OFFSET ?`)
      .all(...args,page.size,(page.page-1)*page.size);
    const counts={open:0,answered:0,closed:0};
    for (const row of db.prepare('SELECT status,count(*) AS n FROM support_tickets WHERE tenant_id=? GROUP BY status').all(tenant)) counts[row.status]=row.n;
    return {...page,tickets,counts};
  }

  const detailQuery=`SELECT ${staffFields},t.message,safety.excluded_at AS playerExcludedAt,
    safety.cooling_off_until AS playerCoolingOffUntil,safety.pause_until AS playerPauseUntil ${staffCases}
    LEFT JOIN player_safety safety ON safety.player=t.player_id AND t.category='responsible_play' AND t.is_complaint=0 WHERE t.tenant_id=?`;
  function conversations(tenant,tickets) {
    if (!tickets.length) return [];
    const ids=tickets.map(t=>t.id);
    const notes=db.prepare(`SELECT n.ticket_id AS ticketId,n.note,s.email AS author,n.created_at AS createdAt
      FROM support_ticket_notes n JOIN staff_accounts s ON s.id=n.staff_id
      WHERE n.tenant_id=? AND n.ticket_id IN (${ids.map(()=>'?').join(',')}) ORDER BY n.id`).all(tenant,...ids);
    const byId=new Map(tickets.map(t=>[t.id,[]]));
    for (const note of notes) byId.get(note.ticketId).push(note);
    const now=Date.now();
    return attachMessages(tickets.map(t=>({...t,notes:byId.get(t.id),
      ...(t.category==='responsible_play' && !t.isComplaint && {accountBreak:t.playerPauseUntil>now || t.playerCoolingOffUntil>now ? accountBreaks.at(tenant,t.playerId,now) : null})})),tenant,true);
  }
  function staffCase(tenant,id) {
    const row=db.prepare(detailQuery+' AND t.id=?').get(tenant,id);
    if (!row) fail(404,'invalid');
    return conversations(tenant,[row])[0];
  }
  const own=cases+' WHERE t.tenant_id=? AND t.player_id=?';
  function profile(tenant,player) {
    const total=db.prepare('SELECT count(*) AS n '+own).get(tenant,player).n;
    const tickets=db.prepare(`SELECT ${caseFields} ${own} ORDER BY ${updatedOrder} LIMIT 3`).all(tenant,player);
    return {total,tickets};
  }
  function unreadCount(tenant,player) {
    return db.prepare(`SELECT count(*) AS n FROM support_tickets t WHERE t.tenant_id=? AND t.player_id=? AND ${unread}`).get(tenant,player).n;
  }
  function inbox(tenant,player,params) {
    const total=db.prepare('SELECT count(*) AS n '+own).get(tenant,player).n;
    const page=paging(params,total,6);
    const tickets=db.prepare(`SELECT ${caseFields},substr(t.message,1,90) AS subject,${unread} AS unread ${own}
      ORDER BY ${updatedOrder} LIMIT ? OFFSET ?`).all(tenant,player,page.size,(page.page-1)*page.size);
    return {...page,tickets,unread:unreadCount(tenant,player)};
  }
  function read(tenant,player,id) {
    if (!Number.isSafeInteger(id) || id<1) fail(400,'invalid');
    const row=db.prepare(`SELECT ${caseFields},t.message ${own} AND t.id=?`).get(tenant,player,id);
    if (!row) fail(404,'invalid');
    const [ticket]=attachMessages([row],tenant);
    db.prepare(`UPDATE support_tickets AS t SET player_seen_at=${latestReply} WHERE t.tenant_id=? AND t.player_id=? AND t.id=? AND ${unread}`).run(tenant,player,id);
    return {ticket,unread:unreadCount(tenant,player)};
  }
  return {queue,detailQuery,conversations,staffCase,profile,inbox,read,unreadCount};
}
