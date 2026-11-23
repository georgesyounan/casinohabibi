import {drawRound,proofText,unbiased} from './round-rules.js';
export async function reproduce(proof){
  if(proof.version!==1)throw Error('proofUnavailable');
  const key=Uint8Array.from(proof.seed.match(/../g),v=>parseInt(v,16));
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',key)),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==proof.commitment)return {valid:false};
  const secret=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const choice=proof.outcome?.choice,prefix=proofText(proof.client,proof.game,proof.wager,choice),words=[];
  for(;;){
    const offset=words.length/8;
    const blocks=await Promise.all(Array.from({length:8},(_,i)=>crypto.subtle.sign('HMAC',secret,new TextEncoder().encode(prefix+(offset+i)))));
    for(const b of blocks){const v=new DataView(b);for(let i=0;i<8;i++)words.push(v.getUint32(i*4));}
    let index=0;
    const empty=Symbol();
    try{
      const round=drawRound(proof.game,proof.wager,choice,n=>unbiased(()=>{if(index===words.length)throw empty;return words[index++];},n));
      return {valid:round.amount===proof.amount&&JSON.stringify(round.outcome)===JSON.stringify(proof.outcome),round};
    }catch(err){if(err!==empty)throw err;}
  }
}
export function proofControl(row,entry,{api,fr,element}){
  const l=(en,french)=>fr?french:en,details=element('details','','round-proof');
  details.append(element('summary',l('Verify result','Vérifier le résultat')));
  const output=element('div');details.append(output);row.append(details);
  let done=false;
  details.addEventListener('toggle',async()=>{
    if(!details.open||done)return;done=true;
    try{
      const proof=await api('account/round-proof/'+entry.id,undefined,'GET'),result=await reproduce(proof);
      output.append(element('strong',result.valid?l('Result reproduced','Résultat reproduit'):l('Result mismatch','Écart au recalcul')),
        element('p',proof.precommitted?l('Commitment issued before this play.','Empreinte remise avant cette manche.'):l('Seed recorded at play time.','Graine enregistrée au moment du jeu.')));
      for(const [label,value] of [[l('Commitment','Empreinte'),proof.commitment],[l('Revealed seed','Graine révélée'),proof.seed],[l('Client seed','Graine du joueur'),proof.client]]){
        output.append(element('small',label),element('code',value));
      }
    }catch(err){output.textContent=err.message==='proofUnavailable'?l('Verification data is unavailable for this older receipt.','Les données de vérification sont indisponibles pour cet ancien reçu.'):l('Could not verify. Reopen to try again.','Vérification impossible. Rouvrez pour réessayer.');done=err.message==='proofUnavailable';}
  });
}
