import { games } from './catalog.js';
import { matches, frameOf, clockLabel, leagues } from './sports-data.js';

export const activityInterval = 1000;
const rowLimit = 10;
const gamesById = new Map(games.map(game => [game.id, game]));
const liveMatches = matches.filter(match => match.frames?.length);
const formatters = new Map();
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);

function clockFor(zone) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-GB',
    {timeZone:zone,hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'}));
  return formatters.get(zone);
}
function gameLink(base, fr, params, label) {
  const query = new URLSearchParams({lang:fr?'fr':'en',...params});
  return '<a class="hub-link" href="'+escape(base+'/?'+query+(params.q?'#games':''))+'">'+escape(label)+'</a>';
}
const cash = ['en-CA','fr-CA'].map(locale => new Intl.NumberFormat(locale,{style:'currency',currency:'CAD'}));
const multiplier = ['en-CA','fr-CA'].map(locale => new Intl.NumberFormat(locale,{maximumFractionDigits:2}));
function example(tab, tick) {
  const index = Math.imul(tick ^ (tick >>> 12), 0x45d9f3b) >>> 0;
  const base = {key:'demo-'+tab+'-'+tick,at:tick*activityInterval,demo:true};
  if (tab==='sports') {
    const match=liveMatches[tick % liveMatches.length];
    return {...base,match,frame:frameOf(match,Math.floor(tick/liveMatches.length))};
  }
  if (tab==='race') return {...base,entrant:1+index%64,points:(index>>>8)%3===0?3:1};
  const game=games[index%games.length],wager=[100,250,500,1000][(index>>>5)%4];
  const net=game.type==='slots'?[-1,-1,0,1,4][(index>>>8)%5]:[-1,0,1][(index>>>8)%3];
  return {...base,game:game.id,wager,amount:wager*net};
}
function recorded(data,tab) {
  if (tab==='casino') return data.rounds.filter(r=>gamesById.has(r.game)).map(r=>({...r,key:'round-'+r.id}));
  if (tab==='race') return (data.race.activity||[]).map(r=>({...r,key:'club-'+r.points+'-'+r.id}));
  return [];
}
function rowMarkup(row,tab,fr,base,zone) {
  const l=(en,french)=>fr?french:en;
  const date=new Date(row.at);
  const time='<time datetime="'+date.toISOString()+'">'+clockFor(zone).format(date)+'</time>';
  const type=row.demo?l('Demo','Démo'):l('Played','Joué');
  const badge='<small class="activity-kind'+(row.demo?'':' recorded')+'">'+type+'</small>';
  let name,detail,figures;
  if(tab==='casino') {
    const game=gamesById.get(row.game),title=game.name[Number(fr)],payout=row.wager+row.amount;
    name=gameLink(base,fr,{q:title},title);detail=badge;
    figures=[cash[Number(fr)].format(row.wager),multiplier[Number(fr)].format(payout/row.wager)+'×',
      '<span'+(row.amount>0?' class="feed-win"':'')+'>'+cash[Number(fr)].format(payout)+'</span>'];
  } else if(tab==='sports') {
    const {match,frame}=row;
    name=gameLink(base,fr,{view:'sports'},match.teams.join(' · '));detail=escape(frame[fr?4:3]);
    figures=[escape(leagues[match.league][Number(fr)]),escape(clockLabel(match,frame,fr)),frame[1]+' – '+frame[2]];
  } else {
    name=row.points===3?l('Quest completed','Quête terminée'):l('Daily gift collected','Cadeau du jour réclamé');
    detail=row.demo?l('Demo participant ','Participant démo ')+String(row.entrant).padStart(2,'0'):l('Club activity','Activité du Club');
    figures=['<span class="feed-win">+'+row.points+' '+(row.points===1?'pt':'pts')+'</span>',badge];
  }
  const title='<th scope="row"><div class="activity-title-cell">'+name+'<small>'+detail+'</small></div></th>';
  return '<tr data-activity-key="'+escape(row.key)+'" data-source="'+(row.demo?'demo':'played')+'"><td class="activity-time">'+time+'</td>'+title+figures.map(value=>'<td>'+value+'</td>').join('')+'</tr>';
}

function makeRows(data,tab,now) {
  const tick=Math.floor(now/activityInterval);
  const samples=Array.from({length:rowLimit},(_,i)=>example(tab,tick-i));
  return [...recorded(data,tab),...samples].filter(row=>row.at<=now)
    .sort((a,b)=>b.at-a.at||Number(Boolean(a.demo))-Number(Boolean(b.demo))).slice(0,rowLimit);
}
function headings(tab,fr) {
  const l=(en,french)=>fr?french:en;
  return [l('Time','Heure'),...(tab==='casino'?[l('Game','Jeu'),l('Stake','Mise'),l('Multiplier','Multiplicateur'),l('Payout','Versement')]:
    tab==='sports'?[l('Match & play','Match et action'),l('League','Ligue'),l('Game clock','Chrono'),l('Score','Pointage')]:
    [l('Race activity','Activité de la course'),l('Points earned','Points gagnés'),l('Source','Source')])];
}
const head = cells => '<thead><tr>'+cells.map(v=>'<th scope="col">'+v+'</th>').join('')+'</tr></thead>';
function savedContent(data,fr,tab,base,zone) {
  const l=(en,french)=>fr?french:en;
  if(tab==='sports')return '';
  if(tab==='race'){
    if(!data.race.rows.length)return '<p>'+l('No club points recorded this week.','Aucun point enregistré au Club cette semaine.')+'</p>';
    return '<table>'+head([l('Rank','Rang'),l('Points','Points'),l('Players','Joueurs')])+'<tbody>'+
      data.race.rows.map(r=>'<tr><th scope="row">#'+r.rank+'</th><td>'+r.score+'</td><td>'+r.players+'</td></tr>').join('')+'</tbody></table>';
  }
  const rows=recorded(data,tab);
  if(!rows.length)return '<p>'+l('No rounds recorded in the last 24 hours.','Aucune partie enregistrée dans les dernières 24 h.')+'</p>';
  return '<table class="activity-log" data-feed="casino">'+head(headings(tab,fr))+'<tbody>'+rows.map(r=>rowMarkup(r,tab,fr,base,zone)).join('')+'</tbody></table>';
}
export function activityMarkup(data,fr,tab,base,now=data.now,zone='UTC') {
  const l=(en,french)=>fr?french:en;
  const source=tab==='sports'?l('Simulated match events','Actions de matchs simulées'):l('Demo and recorded activity','Activité simulée et enregistrée');
  const archive=tab==='sports'?'':'<details class="activity-archive"><summary>'+ (tab==='race'?l('Weekly club standings','Classement hebdomadaire du Club'):l('Played rounds · Last 24 h','Parties jouées · Dernières 24 h'))+
    '</summary><div>'+savedContent(data,fr,tab,base,zone)+'</div></details>';
  return '<div data-activity-view="'+tab+'" lang="'+(fr?'fr':'en')+'" data-zone="'+escape(zone)+'"><p class="event-source"><span>'+source+'</span><span>'+
    (zone==='UTC'?'UTC':l('Local time','Heure locale')+' · '+escape(zone.replaceAll('_',' ')))+'</span></p>'+
    '<div class="feed-scroll" tabindex="0" role="region" aria-label="'+l('Activity feed','Fil d’activité')+'"><table class="activity-log" data-feed="'+tab+'">'+head(headings(tab,fr))+
    '<tbody>'+makeRows(data,tab,now).map(r=>rowMarkup(r,tab,fr,base,zone)).join('')+'</tbody></table></div>'+archive+'</div>';
}
// Keep existing rows, links and keyboard focus in place as new entries arrive.
export function updateActivity(container,data,fr,tab,base,now,zone,updateRecorded=false,animate=false) {
  const view=container.firstElementChild;
  if(view?.dataset.activityView!==tab || view.lang!==(fr?'fr':'en') || view.dataset.zone!==zone){
    container.innerHTML=activityMarkup(data,fr,tab,base,now,zone);return;
  }
  const tbody=view.querySelector('.feed-scroll tbody');
  const previous=new Map([...tbody.rows].map(tr=>[tr.dataset.activityKey,tr]));
  const rows=makeRows(data,tab,now);
  rows.forEach((event,index)=>{
    let row=previous.get(event.key);
    if(row)previous.delete(event.key);
    else{
      const fragment=document.createElement('tbody');
      fragment.innerHTML=rowMarkup(event,tab,fr,base,zone);row=fragment.firstElementChild;
      if(animate)row.classList.add('activity-arrival');
    }
    if(tbody.rows[index]!==row)tbody.insertBefore(row,tbody.rows[index]||null);
  });
  for(const old of previous.values())if(!old.contains(document.activeElement))old.remove();
  const archive=view.querySelector('.activity-archive > div');
  if(updateRecorded && archive && !archive.contains(document.activeElement)){
    const markup=savedContent(data,fr,tab,base,zone);
    if(archive.innerHTML!==markup)archive.innerHTML=markup;
  }
}
