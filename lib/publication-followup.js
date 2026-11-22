import { matchesCatalogue } from '../public/catalog.js';

const correctionCodes = new Set([
  'siteContentTranslationNeeded',
  'siteContentTargetMissing',
  'siteAddressTaken',
  'comingSoonCollectionTranslation'
]);

export function createPublicationFollowup(db, { fail, transaction }) {
  transaction(() =>
    db.exec(`
    CREATE TABLE IF NOT EXISTS publication_followup (
      id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), actor_id INTEGER NOT NULL REFERENCES staff_accounts(id),
      request_id TEXT NOT NULL, record TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('publish','archive')),
      version INTEGER NOT NULL, reason TEXT NOT NULL, attempts INTEGER NOT NULL, last_at INTEGER NOT NULL,
      resolved_at INTEGER, audit_id INTEGER REFERENCES staff_events(id), UNIQUE(tenant_id, actor_id, request_id)
    );
    CREATE INDEX IF NOT EXISTS publication_followup_dashboard ON publication_followup(tenant_id,resolved_at,id);
    CREATE INDEX IF NOT EXISTS publication_followup_record ON publication_followup(tenant_id,record,action,version) WHERE resolved_at IS NULL;
  `)
  );
  const frontier = db.prepare('SELECT coalesce(max(id),0) AS id FROM staff_events');
  const laterAudit = db.prepare(`SELECT id,created_at FROM staff_events WHERE tenant_id=? AND id>? AND action=?
    AND (target=? OR target GLOB ?) ORDER BY id LIMIT 1`);
  const save =
    db.prepare(`INSERT INTO publication_followup(tenant_id,actor_id,request_id,record,action,version,reason,attempts,last_at,resolved_at,audit_id)
    VALUES(?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(tenant_id,actor_id,request_id) DO UPDATE SET
    attempts=attempts+1, last_at=excluded.last_at, reason=excluded.reason, resolved_at=excluded.resolved_at, audit_id=excluded.audit_id
    WHERE publication_followup.resolved_at IS NULL AND publication_followup.record=excluded.record
    AND publication_followup.action=excluded.action AND publication_followup.version=excluded.version`);
  const close =
    db.prepare(`UPDATE publication_followup SET resolved_at=?,audit_id=? WHERE tenant_id=? AND record=? AND action=?
    AND version<=? AND resolved_at IS NULL`);
  const scope = `f.tenant_id=:tenant AND (:admin OR (f.actor_id=:actor AND
    ((:catalogue AND f.record GLOB 'coming-soon/*') OR (:website AND f.record GLOB 'website-content/*'))))`;
  const totals = db.prepare(
    `SELECT count(*) AS total,count(*) FILTER (WHERE f.resolved_at IS NULL) AS open FROM publication_followup f WHERE ${scope}`
  );
  db.function('publication_title_matches', { deterministic: true }, (q, en, fr) =>
    Number(matchesCatalogue(q, [en, fr]))
  );
  const namedRecords = `WITH scoped AS (
    SELECT f.*, CASE
      WHEN record GLOB 'website-content/help/*' THEN 'help'
      WHEN record GLOB 'website-content/banner/*' THEN 'banner'
    END AS site_kind FROM publication_followup f WHERE ${scope} AND (f.resolved_at IS NULL)=:open
  ), named AS (
    SELECT f.*, json_extract(coalesce(c.draft,v.data),'$.titleEn') AS titleEn,
      json_extract(coalesce(c.draft,v.data),'$.titleFr') AS titleFr
    FROM scoped f
    LEFT JOIN coming_soon_titles c ON f.site_kind IS NULL AND c.tenant_id=f.tenant_id
      AND c.slug=substr(f.record,length('coming-soon/')+1)
    LEFT JOIN website_content_records r ON r.tenant_id=f.tenant_id AND r.kind=f.site_kind
      AND r.slug=substr(f.record,length('website-content/'||f.site_kind||'/')+1)
    LEFT JOIN website_content_revisions v ON v.tenant_id=r.tenant_id AND v.kind=r.kind AND v.slug=r.slug AND v.revision=r.draft_rev
  ) `;
  const filter = ` FROM named WHERE :q='' OR instr(record,:q)>0 OR instr(request_id,:q)>0
    OR cast(id AS TEXT)=:q OR publication_title_matches(:q,titleEn,titleFr)`;
  const count = db.prepare(namedRecords + 'SELECT count(*) AS total' + filter);
  const rows = db.prepare(
    namedRecords +
      `SELECT id,record,action,request_id AS requestId,reason,attempts,last_at AS lastAt,
    resolved_at AS resolvedAt,titleEn,titleFr,(SELECT email FROM staff_accounts WHERE id=named.actor_id) AS actor,
    (SELECT id FROM staff_events WHERE id=named.audit_id AND (:admin OR actor_id=:actor)) AS auditId` +
      filter +
      ' ORDER BY id DESC LIMIT 6 OFFSET :offset'
  );

  function describe(path, input) {
    if (
      !['publish', 'archive'].includes(input?.action) ||
      !Number.isSafeInteger(input.version) ||
      input.version < 0 ||
      typeof input.slug !== 'string' ||
      input.slug.length > 64 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)
    )
      return null;
    if (path === '/api/admin/coming-soon') return { action: input.action, record: 'coming-soon/' + input.slug };
    if (path === '/api/admin/website-content' && ['help', 'banner'].includes(input.kind))
      return { action: input.action, record: 'website-content/' + input.kind + '/' + input.slug };
    return null;
  }
  function failed(tenant, actor, requestId, publication, version, lastAudit, error) {
    const reason = !error.status || error.status >= 500 ? 'unavailable' : error.message;
    if (reason !== 'unavailable' && !correctionCodes.has(reason)) return;
    transaction(() => {
      const isCard = publication.record.startsWith('coming-soon/');
      const action =
        (isCard ? 'coming_soon_' : 'website_content_') + (publication.action === 'publish' ? 'published' : 'archived');
      // A second worker may have completed this record between the original rollback and this transaction.
      const later = laterAudit.get(
        tenant,
        lastAudit,
        action,
        publication.record,
        isCard ? publication.record + '@*' : publication.record
      );
      save.run(
        tenant,
        actor,
        requestId,
        publication.record,
        publication.action,
        version,
        reason,
        Date.now(),
        later?.created_at ?? null,
        later?.id ?? null
      );
    });
  }
  function access(tenant, staff, permissions) {
    if (!permissions.publishCatalogue && !permissions.publishWebsite) fail(403, 'staffForbidden');
    return {
      tenant,
      admin: Number(staff.role === 'operator_admin'),
      actor: staff.id,
      catalogue: Number(permissions.publishCatalogue),
      website: Number(permissions.publishWebsite)
    };
  }
  function list(tenant, staff, permissions, params) {
    const accessArgs = access(tenant, staff, permissions);
    const state = params.get('state') ?? 'open',
      q = (params.get('q') || '').trim().toLowerCase();
    const requested = params.get('page') ?? '1';
    if (!['open', 'resolved'].includes(state) || q.length > 120 || !/^[1-9]\d{0,8}$/.test(requested))
      fail(400, 'invalid');
    return transaction(
      () => {
        const filters = { ...accessArgs, open: Number(state === 'open'), q };
        const { total } = count.get(filters),
          page = Math.min(Number(requested), Math.max(1, Math.ceil(total / 6)));
        const items = rows.all({ ...filters, offset: (page - 1) * 6 });
        return { items, total, page, pageSize: 6, counts: totals.get(accessArgs) };
      },
      { readOnly: true }
    );
  }
  return {
    describe,
    failed,
    list,
    frontier: () => frontier.get().id,
    completed(tenant, publication, version, auditId) {
      close.run(Date.now(), auditId, tenant, publication.record, publication.action, version);
    },
    summary(tenant, staff, permissions) {
      return permissions.publishCatalogue || permissions.publishWebsite
        ? totals.get(access(tenant, staff, permissions))
        : null;
    }
  };
}
