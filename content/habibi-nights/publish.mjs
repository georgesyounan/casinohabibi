import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createComingSoon } from '../../lib/coming-soon.js';
import { createStaffAudit } from '../../lib/staff-audit.js';
import { createWebsiteContent } from '../../lib/website-content.js';

const [operation, database] = process.argv.slice(2);
if (operation !== 'publish' || !database || !isAbsolute(database) || !existsSync(database)) {
  throw new Error('Usage: node content/habibi-nights/publish.mjs publish /absolute/path/to/existing.sqlite');
}
const host = 'georgesyounan.com';
const appBasePath = '/casinohabibi';
const release = JSON.parse(readFileSync(new URL('./catalogue.json', import.meta.url), 'utf8'));
const { slug: guideSlug, ...guideFields } = release.guide;
const guide = { ...guideFields, artwork: '', altEn: '', altFr: '' };
const covers = new Set();
const cards = release.previews.map(({ image, slug, ...content }) => {
  assert.ok(/^[a-z]+[.]webp$/.test(image));
  const bytes = readFileSync(new URL('./' + image, import.meta.url));
  assert.ok(
    bytes.length <= 48 * 1024 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
  );
  const artwork = 'data:image/webp;base64,' + bytes.toString('base64');
  covers.add(artwork);
  return {
    slug,
    content: {
      ...content,
      artwork,
      studio: release.studio,
      collectionEn: release.collectionEn,
      collectionFr: release.collectionFr,
      featuredRank: 0,
      locales: [...release.locales].sort(),
      displayMarket: ''
    }
  };
});
assert.equal(new Set(cards.map((card) => card.slug)).size, 3);
const db = new DatabaseSync(database);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');

function transaction(work) {
  if (db.isTransaction) return work();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function assertMatches(slug, stored, expected) {
  if (
    !Object.entries(expected).every(([key, value]) => JSON.stringify(stored[key]) === JSON.stringify(value))
  ) {
    throw new Error('Existing editorial content differs: ' + slug);
  }
}

function publish() {
  const brand = db
    .prepare(
      "SELECT t.id FROM tenant_domains d JOIN tenants t ON t.id=d.tenant_id WHERE d.host=? AND d.verified=1 AND t.status='active'"
    )
    .get(host);
  assert.ok(brand, 'The active brand must have the verified target domain.');
  const tenant = brand.id;
  const published = db
    .prepare(
      "SELECT config FROM tenant_config_versions WHERE tenant_id=? AND status='published' ORDER BY version DESC LIMIT 1"
    )
    .get(tenant);
  const config = JSON.parse(published.config);
  assert.ok(
    release.locales.every((locale) => config.enabledLocales.includes(locale)) &&
      config.enabledSections?.comingSoon !== false &&
      config.enabledSections?.faq !== false,
    'The public catalogue and both guide languages must be enabled.'
  );
  const existingCard = db.prepare(
    'SELECT state,version,published_version,published FROM coming_soon_titles WHERE tenant_id=? AND slug=?'
  );
  const existingGuide = db.prepare(
    "SELECT r.live_rev,r.draft_rev,r.archived,v.data FROM website_content_records r LEFT JOIN website_content_revisions v ON v.tenant_id=r.tenant_id AND v.kind=r.kind AND v.slug=r.slug AND v.revision=r.live_rev WHERE r.tenant_id=? AND r.kind='help' AND r.slug=?"
  );
  const changes = cards.flatMap(({ slug, content }) => {
    const row = existingCard.get(tenant, slug);
    if (!row) return [{ slug, content, version: 0 }];
    assert.ok(
      row.state === 'published' && row.version === row.published_version,
      'Editorial changes at ' + slug
    );
    const prior = JSON.parse(row.published);
    const { demoGame, ...original } = content;
    assertMatches(slug, prior, original);
    if (prior.demoGame === demoGame) return [];
    // Only the original published edition can receive an automatic upgrade.
    assert.ok(row.version === 2 && !Object.hasOwn(prior, 'demoGame'), 'Editorial changes at ' + slug);
    return [{ slug, content, version: row.version }];
  });
  const currentGuide = existingGuide.get(tenant, guideSlug);
  if (currentGuide) {
    assert.ok(
      !currentGuide.archived && currentGuide.live_rev && currentGuide.live_rev === currentGuide.draft_rev,
      'Editorial changes at ' + guideSlug
    );
    assertMatches(guideSlug, JSON.parse(currentGuide.data), guide);
  }
  const auditIds = [];
  const receipt = {
    host,
    insertedPreviews: changes.filter(({ version }) => version === 0).length,
    updatedPreviews: changes.filter(({ version }) => version > 0).length,
    insertedGuides: Number(!currentGuide),
    auditIds
  };
  if (!changes.length && currentGuide) return receipt;

  // Attribute this server-side publication independently from human staff. This identity has no membership or login credential.
  const email = 'catalogue-demo@casinohabibi.invalid';
  const marker = '!offline-editorial-import';
  const account = db.prepare('SELECT id,password_hash FROM staff_accounts WHERE email=?').get(email);
  const actor =
    account?.id ??
    Number(
      db
        .prepare('INSERT INTO staff_accounts(email,password_hash,created_at) VALUES(?,?,?)')
        .run(email, marker, Date.now()).lastInsertRowid
    );
  assert.ok(!account || account.password_hash === marker, 'This audit identity is already in use.');
  assert.ok(
    !db.prepare('SELECT 1 FROM tenant_staff_memberships WHERE staff_id=?').get(actor),
    'The editorial system identity must have no roles.'
  );
  const fail = (_status, message) => {
    throw new Error(message);
  };
  const recordAudit = createStaffAudit(db, { fail, transaction }).record;
  const common = { fail, transaction, recordAudit, validArtwork: (value) => covers.has(value), appBasePath };
  const catalogue = createComingSoon(db, common);
  const website = createWebsiteContent(db, {
    ...common,
    titleAvailable: (id, slug, locale) =>
      Boolean(
        catalogue.published(id, slug, {
          market: config.displayMarket || '',
          locales: [locale]
        })
      )
  });
  for (const { slug, content, version } of changes) {
    const draft = catalogue.mutate(tenant, actor, randomUUID(), {
      ...content,
      slug,
      action: 'save',
      version
    });
    const live = catalogue.mutate(tenant, actor, randomUUID(), {
      slug,
      action: 'publish',
      version: draft.title.version
    });
    auditIds.push(draft.auditId, live.auditId);
  }
  if (!currentGuide) {
    const record = { slug: guideSlug, kind: 'help' };
    const draft = website.mutate(tenant, config, { id: actor }, randomUUID(), {
      ...record,
      action: 'save',
      version: 0,
      content: guide
    });
    const live = website.mutate(tenant, config, { id: actor }, randomUUID(), {
      ...record,
      action: 'publish',
      version: draft.version
    });
    auditIds.push(draft.auditId, live.auditId);
  }
  for (const locale of release.locales) {
    const rendered = website.publicRecord(tenant, config, 'help', guideSlug, locale);
    assert.ok(rendered?.link, 'Missing public guide link in ' + locale);
    const paths = new Set(
      rendered.collection.map((entry) => new URL(entry.href, 'https://' + host).pathname)
    );
    assert.ok(
      cards.every((card) => paths.has(appBasePath + '/coming-soon/' + card.slug)),
      'Missing preview in the published collection for ' + locale
    );
  }
  return receipt;
}

try {
  console.log(JSON.stringify(transaction(publish)));
} finally {
  db.close();
}
