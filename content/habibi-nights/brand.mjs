import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { changedFields } from '../../lib/staff-audit.js';

const original = {
  brandName: 'Northplay', accentColor: '#d7b45a', brandLogo: '', brandFavicon: '',
  heroTitleEn: 'Your seat at the table.', heroTitleFr: 'Votre place à la table.',
  heroIntroEn: 'Explore the game lobby and try a round with simulated CAD funds.',
  heroIntroFr: 'Explorez le hall et essayez une partie avec des fonds fictifs en dollars canadiens.'
};
const mark = readFileSync(new URL('./mark.png', import.meta.url));
assert.ok(mark.length <= 16 * 1024 && mark.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')));
const logo = 'data:image/png;base64,' + mark.toString('base64');
const studio = {
  brandName: 'Casino Habibi', accentColor: '#91ccff', brandLogo: logo, brandFavicon: logo,
  heroTitleEn: 'Habibi Studio', heroTitleFr: 'Habibi Studio',
  heroIntroEn: 'Roulette, blackjack and slots. Play with demo credits.',
  heroIntroFr: 'Roulette, blackjack et machines à sous. Jouez avec des crédits fictifs.'
};

// This runs inside the editorial publishing transaction for the verified Habibi domain.
export function publishStudioBrand(db, tenant, published, actor, recordAudit) {
  const live = JSON.parse(published.config);
  assert.ok([original.brandName, studio.brandName].includes(live.brandName), 'Unexpected casino brand.');
  const next = { ...live };
  for (const [key, value] of Object.entries(studio)) {
    if (live[key] === original[key]) next[key] = value;
  }
  if (live.brandName === studio.brandName) {
    if (live.accentColor?.toLowerCase() === '#83ffd4') next.accentColor = studio.accentColor;
    for (const key of ['brandLogo','brandFavicon']) {
      const current = live[key];
      if (typeof current !== 'string' || !current.startsWith('data:image/png;base64,')) continue;
      const bytes = Buffer.from(current.slice('data:image/png;base64,'.length),'base64');
      if (createHash('sha256').update(bytes).digest('hex') === '489a91cd61d295c30529b7bf8f006a260b760b919c35cea7ab143cb936f7c4d9') next[key] = studio[key];
    }
  }
  const fields = changedFields(live, next);
  if (!fields.length) return [];
  const draft = db.prepare("SELECT version,config FROM tenant_config_versions WHERE tenant_id=? AND status='draft' ORDER BY version DESC LIMIT 1").get(tenant);
  const version = Math.max(published.version, draft?.version ?? 0) + 1;
  const insert = db.prepare('INSERT INTO tenant_config_versions(tenant_id,version,config,status,created_at) VALUES(?,?,?,?,?)');
  insert.run(tenant, version, JSON.stringify(next), 'published', Date.now());
  db.prepare('UPDATE tenants SET name=? WHERE id=?').run(next.brandName, tenant);
  const audit = (action, revision, keys, status, previousStatus) => recordAudit(tenant, actor, action, String(revision), randomUUID(),
    { recordId: tenant, revision, fields: keys, previousStatus, status });
  const ids = [audit('tenant_config_published', version, fields, 'published', 'published')];
  if (draft) {
    const previous = JSON.parse(draft.config);
    const rebased = { ...previous };
    for (const key of fields) if (previous[key] === live[key]) rebased[key] = next[key];
    // A stale editor must reload, and unrelated draft edits stay private.
    db.prepare("DELETE FROM tenant_config_versions WHERE tenant_id=? AND version=? AND status='draft'").run(tenant, draft.version);
    insert.run(tenant, version + 1, JSON.stringify(rebased), 'draft', Date.now());
    ids.push(audit('tenant_config_saved', version + 1, changedFields(previous, rebased), 'draft', 'draft'));
  }
  return ids;
}
