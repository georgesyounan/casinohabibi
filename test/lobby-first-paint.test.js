import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createComingSoon, installComingSoon } from '../lib/coming-soon.js';
import { createPublicPages, pageHead } from '../lib/public-pages.js';

test('the initial home cover, filters and counts use only eligible published content', t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec("CREATE TABLE tenants(id TEXT PRIMARY KEY); INSERT INTO tenants VALUES ('home'), ('other')");
  installComingSoon(db);
  const appBasePath = '/casinohabibi';
  const comingSoon = createComingSoon(db, { appBasePath });
  const insert = db.prepare('INSERT INTO coming_soon_titles(tenant_id, slug, draft, published, state, version, updated_at) VALUES (?,?,?, ?,?,1,0)');
  const title = { titleEn: 'Fast lane', titleFr: 'Voie <rapide>', collectionEn: 'Racing', collectionFr: 'Courses', demoGame: 'gold',
    category: 'slots', artwork: 'data:image/webp;base64,YWJj', featuredRank: 4, altFr: 'Circuit', locales: ['fr-CA'], displayMarket: 'CA' };
  insert.run('home', 'race', '{"titleFr":"Private edits"}', JSON.stringify(title), 'published');
  for (const [tenant, slug, state, changes] of [
    ['home','archived','archived',{}], ['home','draft','draft',{}], ['other','foreign','published',{}],
    ['home','out-of-market','published',{displayMarket:'US'}], ['home','foreign-language','published',{locales:['en-CA']}]
  ]) insert.run(tenant, slug, '{}', JSON.stringify({...title, ...changes, titleFr: 'Private-'+slug, featuredRank:1}), state);
  const config = { brandName:'Casino Habibi', primaryLocale:'fr-CA', enabledLocales:['en-CA','fr-CA'],
    heroTitleFr:'Casino', heroIntroFr:'Démo', displayMarket:'CA-QC', enabledSections:{comingSoon:true} };
  const describe = createPublicPages({comingSoon, appBasePath, providerCount: () => 2});
  const template = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const home = () => pageHead(template, describe('home',config,{path:'/',params:new URLSearchParams('lang=fr')}).meta, 'https://example.test');
  const html = home();
  assert.match(html,/data-initial-slug="race"/);
  assert.match(html,/id="spotlight-name">Voie &lt;rapide&gt;</);
  assert.match(html,/id="spotlight-image"[^>]*alt="Circuit"[^>]*src="data:image\/webp;base64,YWJj"/);
  assert.match(html,/5 démos jouables · 2 aperçus/);
  assert.match(html,/<option value="racing">Courses<\/option>/);
  assert.doesNotMatch(html,/Private-|Private edits/);
  config.enabledSections.comingSoon = false;
  assert.doesNotMatch(home(),/data-initial-slug|Voie &lt;rapide&gt;/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM coming_soon_visits').get().n,0);
});
