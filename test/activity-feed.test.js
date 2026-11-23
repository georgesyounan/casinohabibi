import assert from 'node:assert/strict';
import test from 'node:test';
import { activityInterval, activityMarkup } from '../public/activity-feed.js';

const now=Date.parse('2026-11-23T15:03:12Z');
const board={now,rounds:[{id:47,at:now-220,game:'gold',wager:100,amount:400}],
  race:{rows:[{rank:1,score:7,players:1}],activity:[{id:52,points:3,at:now-450}]}};
const keys=html=>[...html.split('</tbody>')[0].matchAll(/data-activity-key="([^"]+)"/g)].map(match=>match[1]);
test('each recent activity tab receives timestamped entries in order without relabelling older rows',()=>{
  for(const tab of ['casino','sports','race']){
    const render=t=>activityMarkup(board,true,tab,'/casinohabibi',t,'America/Merida');
    const first=render(now),second=render(now+activityInterval);
    const a=keys(first),b=keys(second);
    assert.equal(a.length,10);assert.equal(new Set(b).size,10);
    assert.notEqual(a[0],b[0]);assert.deepEqual(b.slice(1),a.slice(0,9));
    assert.match(first,/Heure locale · America\/Merida/);
    assert.match(first,/<time datetime="2026-11-23T15:03:12.000Z">09:03:12<\/time>/);
    assert.match(first,/data-source="demo"/);
    if(tab!=='sports')assert.match(first,/data-source="played"/);
  }
});
test('standings and played history retain only recorded events while the demo feed keeps moving',()=>{
  const empty={now,rounds:[],race:{rows:[],activity:[]}};
  for(const tab of ['casino','race']){
    const markup=activityMarkup(empty,false,tab,'',now);
    assert.equal(keys(markup).length,10);
    const archive=markup.split('<details class="activity-archive">')[1];
    assert.match(archive,/No (club points|rounds) recorded/);
    assert.doesNotMatch(archive,/demo-(casino|race)-/);
  }
  const race=activityMarkup(board,true,'race','',now);
  assert.match(race,/club-3-52/);
  assert.match(race,/<th scope="row">#1<\/th><td>7<\/td><td>1<\/td>/);
});
