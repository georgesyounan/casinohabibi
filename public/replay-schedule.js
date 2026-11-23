const fr=new URL(location.href).searchParams.get('lang')==='fr';document.documentElement.lang=fr?'fr':'en';
document.querySelector('#sports-back').href='./?view=sports&lang='+(fr?'fr':'en');
document.querySelector('#replay-label').textContent=fr?'Coupe du littoral · reprise animée d’un match fictif':'Coastal Cup · animated replay of a simulated match';
document.querySelector('#description').textContent=fr?'Marina mène 1 à 0. Atlas égalise à la 67ᵉ minute.':'Marina lead 1–0. Atlas equalize in the 67th minute.';
document.querySelector('#schedule').textContent=fr?'Prochaines reprises':'Upcoming replays';
const clock=new Intl.DateTimeFormat(fr?'fr-CA':'en-CA',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
function update(){const step=3*3600000,next=(Math.floor(Date.now()/step)+1)*step,list=document.querySelector('#airtimes');list.replaceChildren();
for(let i=0;i<3;i++){const at=new Date(next+i*step),item=document.createElement('li'),time=document.createElement('time');time.dateTime=at.toISOString();time.textContent=clock.format(at);item.append(time);list.append(item);}}
update();setInterval(update,60000);

const follow=document.querySelector('#follow-schedule'),feedback=document.querySelector('#schedule-status'),video=document.querySelector('video');let armed=false,lastSlot=0;
function toggle(){follow.textContent=armed?(fr?'Désactiver la lecture programmée':'Turn off scheduled playback'):(fr?'Lire aux heures programmées':'Play at scheduled times');follow.setAttribute('aria-pressed',String(armed));}
follow.onclick=()=>{armed=!armed;toggle();feedback.textContent=armed?(fr?'Lecture programmée pendant que cette page est ouverte.':'Scheduled playback while this page is open.') : '';};
toggle();setInterval(()=>{const period=3*3600000,now=Date.now(),slot=Math.floor(now/period)*period;if(!armed||document.hidden||lastSlot===slot||now-slot>7000)return;
lastSlot=slot;video.currentTime=(now-slot)/1000;video.play().catch(()=>{feedback.textContent=fr?'La reprise est disponible. Appuyez sur Lecture.':'The replay is available. Press play.';});},1000);
