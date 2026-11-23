import assert from 'node:assert/strict';
import test from 'node:test';
import { homeCampaignExtras } from '../public/banner-motion.js';
import { sportsMarkup } from '../public/sports-centre.js';
import { matches } from '../public/sports-data.js';

test('the first Habibi paint exposes real, localized campaign destinations and a score for each simulated live match', () => {
  for (const [fr,locale] of [[false,'en'],[true,'fr']]) {
    const home = homeCampaignExtras(fr,'/casinohabibi');
    assert.ok(home.includes('/casinohabibi/?lang='+locale+'&amp;category=slots#games'));
    assert.ok(home.includes('/casinohabibi/?lang='+locale+'&amp;view=sports'));
    assert.equal([...home.matchAll(/data-campaign-select=/g)].length,3);
    assert.equal([...home.matchAll(/data-campaign-panel="\d+" hidden/g)].length,2);
    const board = sportsMarkup(fr);
    const wire = board.match(/<div class="wire-track">([\s\S]*?)<\/div>/)[1];
    for (const match of matches) {
      if (!match.frames) { assert.ok(!wire.includes('wire-'+match.id)); continue; }
      assert.ok(wire.includes('data-hub-control="wire-'+match.id+'"'));
      assert.ok(wire.includes('data-score="'+match.id+'-0">'+match.frames[0][1]+'<'));
      assert.ok(wire.includes('data-score="'+match.id+'-1">'+match.frames[0][2]+'<'));
    }
    assert.match(board, /class="rotation-toggle" data-banner-toggle/);
  }
});

test('banners advance only while visible and disengaged, and respect pause and reduced motion', async t => {
  const { createRotation } = await import('../public/banner-motion.js');
  const classes = new Map();
  const media = Object.assign(new EventTarget(), {matches:false});
  const doc = Object.assign(new EventTarget(),{
    hidden:false, activeElement:null, querySelector:() => null
  });
  const controls = { setAttribute() {} };
  const root = Object.assign(new EventTarget(),{
    querySelector:() => controls, contains:el=>el===controls, matches:()=>false,
    toggleAttribute:(key,value)=>classes.set(key,value)
  });
  let observe;
  const bindings = {
    document:doc, window:new EventTarget(), location:{pathname:'/casinohabibi/'},
    matchMedia:()=>media, sessionStorage:{getItem:()=>'0',setItem(){}},
    IntersectionObserver:class { constructor(fn){observe=fn;} observe(){} disconnect(){} }
  };
  for (const [key,value] of Object.entries(bindings)) {
    const previous=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value,configurable:true});
    t.after(()=>{ if (previous) Object.defineProperty(globalThis,key,previous); else delete globalThis[key]; });
  }
  t.mock.timers.enable({apis:['setTimeout']});
  let steps=0;
  const rotator=createRotation(()=>steps++,()=>true,1000);
  rotator.attach(root);
  const reveal=ratio=>observe([{target:root,isIntersecting:ratio>0,intersectionRatio:ratio}]);
  reveal(1);t.mock.timers.tick(1000);assert.equal(steps,1);
  doc.activeElement=controls;doc.dispatchEvent(new Event('focusin'));t.mock.timers.tick(2000);assert.equal(steps,1);
  doc.activeElement=null;rotateWithMedia(true);t.mock.timers.tick(2000);assert.equal(steps,1);
  rotateWithMedia(false);reveal(0);t.mock.timers.tick(2000);assert.equal(steps,1);
  reveal(1);
  const toggle = new Event('click');
  Object.defineProperty(toggle,'target',{value:{closest:()=>controls}});
  root.dispatchEvent(toggle);t.mock.timers.tick(2000);assert.equal(steps,1);
  root.dispatchEvent(toggle);t.mock.timers.tick(1000);assert.equal(steps,2);
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(classes.get('data-rotating'),false);
  rotator.attach(null);t.mock.timers.tick(2000);assert.equal(steps,2);
  function rotateWithMedia(matches) { media.matches=matches;media.dispatchEvent(new Event('change')); }
});
