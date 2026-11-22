import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

test('the demo edition publishes three eligible bilingual previews and a guide atomically and never overwrites an editor', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'habibi-nights-content-'));
  const dbPath = join(dir, 'northplay.sqlite');
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      DATA_DIR: dir,
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_ENV: 'development',
      BOOTSTRAP_ADMIN_EMAIL: '',
      BOOTSTRAP_ADMIN_PASSWORD: '',
      PLATFORM_ADMIN_TOKEN: '',
      PUBLIC_BASE_URL: '',
      SANDBOX_TENANT_HOSTS: 'georgesyounan.com',
      RESET_EMAIL_API_KEY: '',
      RESET_EMAIL_FROM: '',
      DISABLE_CAMPAIGN_WORKER: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const end = once(child, 'exit');
  t.after(async () => {
    child.kill();
    await end;
    await rm(dir, { recursive: true, force: true });
  });
  let stderr = '';
  child.stderr.on('data', (part) => {
    stderr += part;
  });
  const lines = createInterface({ input: child.stdout });
  await Promise.race([
    once(lines, 'line'),
    end.then(() => {
      throw new Error(stderr || 'Test service exited');
    })
  ]);
  const db = new DatabaseSync(dbPath);
  t.after(() => db.close());
  const run = () =>
    execFileSync(process.execPath, ['content/habibi-nights/publish.mjs', 'publish', dbPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  const input = JSON.parse(
    await readFile(new URL('../content/habibi-nights/catalogue.json', import.meta.url))
  );
  db.prepare('UPDATE tenant_domains SET verified=0 WHERE host=?').run('georgesyounan.com');
  assert.throws(run, /verified target domain/);
  db.prepare('UPDATE tenant_domains SET verified=1 WHERE host=?').run('georgesyounan.com');
  const counts = () =>
    db
      .prepare(
        'SELECT (SELECT count(*) FROM coming_soon_titles) AS titles,(SELECT count(*) FROM website_content_records) AS guides,(SELECT count(*) FROM staff_events) AS audits'
      )
      .get();
  const before = counts();
  // A conflicting localized address is detected after the three draft/publication calls and rolls back the entire edition.
  db.prepare(
    "INSERT INTO website_content_records(tenant_id,kind,slug,version,draft_rev) VALUES('sandbox','help','editor-guide',1,1)"
  ).run();
  db.prepare(
    "INSERT INTO website_guide_addresses(tenant_id,locale,address,record_slug) VALUES('sandbox','fr-CA',?,'editor-guide')"
  ).run(input.guide.addressFr);
  const other = counts();
  assert.throws(run);
  assert.deepEqual(counts(), other);
  assert.ok(
    !db.prepare("SELECT 1 FROM staff_accounts WHERE email='catalogue-demo@casinohabibi.invalid'").get()
  );
  db.prepare("DELETE FROM website_guide_addresses WHERE record_slug='editor-guide'").run();
  db.prepare("DELETE FROM website_content_records WHERE slug='editor-guide'").run();
  const first = JSON.parse(run());
  assert.deepEqual([first.insertedPreviews, first.insertedGuides, new Set(first.auditIds).size], [3, 1, 8]);
  assert.deepEqual(Object.values(counts()), [before.titles + 3, before.guides + 1, before.audits + 8]);
  assert.equal(
    db
      .prepare(
        "SELECT count(*) AS n FROM tenant_staff_memberships m JOIN staff_accounts s ON s.id=m.staff_id WHERE s.email='catalogue-demo@casinohabibi.invalid'"
      )
      .get().n,
    0
  );
  for (const entry of input.previews) {
    const row = db
      .prepare(
        "SELECT id,published FROM coming_soon_titles WHERE tenant_id='sandbox' AND state='published' AND slug=?"
      )
      .get(entry.slug);
    const value = JSON.parse(row.published);
    assert.deepEqual(value.locales, ['en-CA', 'fr-CA']);
    const art = Buffer.from(value.artwork.split(',')[1], 'base64');
    assert.ok(art.length < 48 * 1024);
    assert.deepEqual(
      art,
      await readFile(new URL('../content/habibi-nights/' + entry.image, import.meta.url))
    );
    assert.ok(value.titleFr.includes('Démo') && value.titleEn.includes('Demo'));
  }
  const second = JSON.parse(run());
  assert.deepEqual([second.insertedPreviews, second.insertedGuides, second.auditIds.length], [0, 0, 0]);
  const ids = () => db.prepare('SELECT id,slug FROM coming_soon_titles ORDER BY id').all();
  const originalIds = ids();
  // The previous edition had the same illustrations and saves but no playable game.
  db.prepare("UPDATE coming_soon_titles SET draft=json_remove(draft,'$.demoGame'),published=json_remove(published,'$.demoGame')").run();
  const upgraded = JSON.parse(run());
  assert.deepEqual([upgraded.insertedPreviews, upgraded.updatedPreviews, upgraded.insertedGuides, new Set(upgraded.auditIds).size], [0, 3, 0, 6]);
  assert.deepEqual(ids(), originalIds);
  for (const card of input.previews) {
    const row = db.prepare("SELECT version,published_version,json_extract(published,'$.demoGame') AS game FROM coming_soon_titles WHERE slug=?").get(card.slug);
    assert.deepEqual(Object.values(row), [4, 4, card.demoGame]);
  }
  assert.deepEqual(JSON.parse(run()).auditIds, []);
  // A later editor deliberately removing a game must retain that choice.
  db.prepare("UPDATE coming_soon_titles SET draft=json_remove(draft,'$.demoGame'),published=json_remove(published,'$.demoGame') WHERE slug=?").run(input.previews[0].slug);
  assert.throws(run, /Editorial changes/);
  assert.deepEqual(Object.values(counts()), [before.titles + 3, before.guides + 1, before.audits + 14]);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});
