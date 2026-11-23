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

test('opening the league during startup preserves the chosen panel when the account finishes loading', async t=>{
  const {createClubHome}=await import('../public/player-club.js');
  t.mock.timers.enable({apis:['setTimeout']});
  const snapshot={day:'2026-11-23',next:Date.now()+120000,amount:500,enabled:true,claimed:false,points:null,items:[],trending:[]};
  const globals={location:new URL('https://example.test/casinohabibi/?view=promotions&club=daily'),
    window:new EventTarget(),document:Object.assign(new EventTarget(),{
      body:{dataset:{lobbyBrand:'habibi'},classList:{contains:()=>true}},activeElement:null,
      getElementById:id=>id==='club-public-model'?{textContent:JSON.stringify(snapshot)}:{hasAttribute:()=>false}
    })};
  for(const [key,value] of Object.entries(globals)){
    const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
    t.after(()=>{if(old)Object.defineProperty(globalThis,key,old);else delete globalThis[key];});
  }
  let click;
  const root={dataset:{},contains:()=>false,querySelector:()=>null,addEventListener(name,fn){if(name==='click')click=fn;}};
  const api=async path=>path.includes('standings')?{rows:[],own:null}:snapshot;
  const club=createClubHome({root,api,base:'/casinohabibi',account:()=>null,french:()=>true,translate:x=>x});
  await click({button:0,preventDefault(){},target:{closest:s=>s==='[data-club-card]'?{dataset:{clubCard:'league'}}:null}});
  assert.match(root.innerHTML,/id="club-link-league"[^>]+aria-expanded="true"/);
  await club.sync();
  assert.match(root.innerHTML,/id="club-link-league"[^>]+aria-expanded="true"/);
  assert.match(root.innerHTML,/Aucun point enregistré/);
});

test('the public header renders searchable, localized player shortcuts before scripts load', () => {
  const template = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const config = {brandName:'Casino Habibi', enabledLocales:['fr-CA','en-CA'], primaryLocale:'fr-CA'};
  const appBasePath = '/casinohabibi';
  const gifts={now:0,nextDay:86400000,member:false,raffle:{prize:2500,tickets:0},
    rows:['spins','reload','rakeback','daily','weekly','premonth','monthly'].map(key=>({key,state:'guest',amount:500,remaining:0}))};
  const describe = createPublicPages({appBasePath,giftPreview:()=>gifts});
  function render(path, query, brand = config) {
    const {meta} = describe('tenant', brand, {path, params:new URLSearchParams(query)});
    return pageHead(template, meta, 'https://example.test');
  }
  for (const [tag, label] of [['fr','Bonus et quêtes'],['en','Bonuses and quests']]) {
    const html = render('/', {lang:tag, q:'a"<b'});
    assert.match(html, /<summary class="player-tool"/);
    assert.ok(html.includes('aria-label="' + label + '"'));
    assert.ok(html.includes('<summary id="header-gifts" class="player-tool"'));
    assert.ok(html.includes('href="/casinohabibi/?lang=' + tag + '&amp;view=promotions&amp;club=daily#gift-catalogue"'));
    assert.ok(html.includes('href="/casinohabibi/?lang=' + tag + '&amp;gift=spins&amp;access=signin"'));
    assert.equal((html.match(/class="gift-row"/g)||[]).length,7);
    assert.ok(html.includes('href="/casinohabibi/?lang=' + tag + '&amp;support=1"'));
    assert.match(html, /method="get" action="\/casinohabibi\/#games"/);
    assert.match(html, /id="game-search" name="q"[^>]*value="a&quot;&lt;b"/);
    assert.equal((html.match(/id="home-search"/g) || []).length, 1);
  }
  assert.doesNotMatch(render('/admin', {lang:'fr'}), /id="header-support"/);
  assert.doesNotMatch(render('/', {lang:'en'}, {...config, brandName:'Northplay'}), /id="header-gifts"/);
});
