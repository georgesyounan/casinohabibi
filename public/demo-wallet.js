const root=document.querySelector('#wallet'),status=document.querySelector('#feedback'),fr=new URL(location.href).searchParams.get('lang')==='fr',l=(en,frText)=>fr?frText:en;
document.documentElement.lang=fr?'fr':'en';document.querySelector('h1').textContent=l('Test network wallet','Portefeuille du réseau de test');
const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text||''});
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
function openKeys(){return new Promise((resolve,reject)=>{const req=indexedDB.open('habibi-demo-keys-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('wallets');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function keys(owner){
  const db=await openKeys(),read=()=>new Promise((ok,no)=>{const r=db.transaction('wallets').objectStore('wallets').get(owner);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
  try{const old=await read();if(old)return old;
    const fresh=await crypto.subtle.generateKey({name:'Ed25519'},false,['sign','verify']);
    await new Promise((ok,no)=>{const tx=db.transaction('wallets','readwrite');tx.objectStore('wallets').add(fresh,owner);tx.oncomplete=ok;tx.onabort=()=>tx.error?.name==='ConstraintError'?ok():no(tx.error);});
    return await read();
  }finally{db.close();}
}
async function api(data){const response=await fetch('./api/account/demo-network',{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const value=await response.json();if(!response.ok)throw Error(value.error);return value;}
function act(label,fn){const b=el('button',label);b.type='button';b.onclick=async()=>{status.textContent='';b.disabled=true;try{await fn();}catch(err){status.textContent=err.message;}finally{b.disabled=false;}};return b;}
async function show(){
  root.replaceChildren();
  try{const d=await api(),r=d.rules;root.append(el('p',r.network+' · '+r.asset+' · '+l('2 decimal places · simulated custody','2 décimales · garde simulée')));
    if(!r.enabled){root.append(el('p',l('Test network disabled.','Réseau de test désactivé.')));return;}
    const run=(action,extra)=>api({action,owner:d.owner,network:r.network,asset:r.asset,...extra});
    if(!d.address){root.append(act(l('Link a demo address on this device','Associer une adresse fictive sur cet appareil'),async()=>{
      const k=await keys(d.tenant+'/'+d.owner),address=hex(await crypto.subtle.exportKey('raw',k.publicKey)),c=await run('challenge',{address});
      const signature=hex(await crypto.subtle.sign('Ed25519',k.privateKey,new TextEncoder().encode(c.message)));await run('link',{id:c.id,signature});await show();}));return;}
    const addr=el('code',d.address);addr.style.overflowWrap='anywhere';root.append(addr);
    root.append(act(l('Show test funding instructions','Afficher les instructions de dépôt fictif'),async()=>{const inst=await run('instruction',{});status.textContent=inst.asset+' · '+inst.network+' · '+inst.confirmations+' '+l('confirmations','confirmations');}));
    const label=el('label',l('Test withdrawal amount','Montant du retrait fictif')),value=el('input');value.type='number';value.min='1';value.step='.01';label.append(value);root.append(label);
    let attempt=null;root.append(act(l('Request demo withdrawal','Demander le retrait fictif'),async()=>{const amount=Math.round(Number(value.value)*100);if(!attempt||attempt.amount!==amount)attempt={amount,key:crypto.randomUUID()};
      await run('payout',{...attempt,address:d.address});attempt=null;await show();}));
    root.append(el('p',l('Network fee','Frais du réseau')+' · '+(r.fee/100).toFixed(2)+' '+r.asset));
    for(const tx of d.deposits)root.append(el('p',tx.tx+' #'+tx.idx+' · '+(tx.amount/100).toFixed(2)+' · '+tx.state));
    for(const tx of d.payouts)root.append(el('p',tx.id+' · '+((tx.amount-tx.fee)/100).toFixed(2)+' · '+tx.status));
  }catch(err){if(err.message==='signin'){const a=el('a',l('Sign in','Se connecter'));a.href='./?access=signin&lang='+(fr?'fr':'en');root.append(a);}else status.textContent=err.message;}
}void show();
