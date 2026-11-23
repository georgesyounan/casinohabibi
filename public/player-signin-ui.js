export const playerSignInCopy = {
  loginTitle:['Welcome back','Bon retour'], registrationTitle:['Create your account','Créer votre compte'],
  identifier:['Email or username','Courriel ou nom d’utilisateur'], username:['Username','Nom d’utilisateur'],
  usernameHelp:['3–24 characters. Use letters, numbers, dots, dashes or underscores.','De 3 à 24 caractères. Lettres, chiffres, points, tirets ou tirets bas.'],
  badEmail:['Enter a complete email address.','Entrez une adresse courriel complète.'],
  badPassword:['Use at least 10 characters.','Utilisez au moins 10 caractères.'],
  badLogin:['Check your email or username and your password.','Vérifiez votre courriel ou votre nom d’utilisateur et votre mot de passe.'],
  usernameOptional:['Login username (optional)','Nom d’utilisateur pour la connexion (facultatif)'],
  resendCodeHint:['You can request a new code after one minute.','Vous pouvez demander un nouveau code après une minute.'],
  passwordShort:['Password','Mot de passe'], passwordHelp:['At least 10 characters','Au moins 10 caractères'],
  invalidUsername:['Choose a username using the format shown.','Choisissez un nom d’utilisateur au format indiqué.'],
  usernameTaken:['This username is taken. Try another one.','Ce nom d’utilisateur est déjà pris. Essayez-en un autre.'],
  accountEmailUsed:['This address already has an account. Sign in or reset your password.','Un compte utilise déjà ce courriel. Connectez-vous ou réinitialisez le mot de passe.'],
  termsRequired:['Confirm your age and accept the terms to create an account.','Confirmez votre âge et acceptez les conditions pour créer un compte.'],
  consentLead:['I am 18 or older and accept the','J’ai 18 ans ou plus et j’accepte les'],
  demoTerms:['demo terms','conditions de la démo'], siteTerms:['terms of use','conditions d’utilisation'],
  demoRules:['Play uses simulated credits. They have no cash value and cannot be deposited or withdrawn.','Les parties utilisent des crédits fictifs. Ces crédits n’ont aucune valeur monétaire et ne peuvent être ni déposés ni retirés.'],
  referralLabel:['Referral code','Code de parrainage'], optional:['Optional','Facultatif'],
  signInTab:['Sign in','Connexion'], registerTab:['Register','Inscription'], loginAction:['Sign in','Se connecter'], registerAction:['Create my account','Créer mon compte'],
  moreMethods:['More sign-in options','Autres options de connexion'], moreRegister:['More registration options','Autres options d’inscription'],
  emailCode:['Continue with an email code','Continuer avec un code par courriel'], separator:['or','ou'],
  codeTitle:['Sign in by email','Connexion par courriel'], registerCodeTitle:['Register by email','Inscription par courriel'],
  sendAccessCode:['Send me a code','Recevoir un code'], codeSentTitle:['Enter your code','Saisissez votre code'],
  codeHint:['If this address is eligible, an 8-digit code will arrive shortly. It is valid for 10 minutes.','Si cette adresse est admissible, vous recevrez un code à 8 chiffres. Il est valide pendant 10 minutes.'],
  codeLabel:['8-digit code','Code à 8 chiffres'], codeInvalid:['The code is incorrect or has expired. Check it or request a new one.','Le code est incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.'],
  changeAddress:['Change address or request a new code','Changer de courriel ou demander un nouveau code'], backToPassword:['Use a password','Utiliser un mot de passe'],
  registerWith:['Continue with','Continuer avec'], finishRegistration:['Complete your profile','Compléter votre profil'],
  providerUnavailable:['This sign-in service is unavailable. Use another method.','Ce service de connexion est indisponible. Choisissez une autre méthode.'],
  providerExpired:['This sign-in request expired. Please try again.','Cette demande de connexion a expiré. Réessayez.'],
  providerCancelled:['Sign-in was cancelled. You can choose another method.','La connexion a été annulée. Vous pouvez choisir une autre méthode.'],
  providerUnverified:['Verify your email with the provider, or use an email code.','Confirmez votre courriel auprès du fournisseur ou utilisez un code par courriel.'],
  providerEmailUsed:['This email already has a player account. Use your usual password or an email code.','Ce courriel est déjà associé à un compte joueur. Utilisez votre mot de passe habituel ou un code par courriel.'],
  authSending:['Sending…','Envoi…'], authChecking:['Verifying…','Vérification…'], authCreating:['Creating…','Création…'],
  demoFunds:['Demo account','Compte démo'], initialCredit:['Starting balance','Solde de départ'],
  verifiedVia:['Verified with','Confirmé par'], accessMethods:['Account access','Accès au compte'],
  registerPrompt:['New to Habibi?','Nouveau sur Habibi?'], loginPrompt:['Already have an account?','Vous avez déjà un compte?']
};

const drawings = {
  eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff:'M3 3l18 18 M10 5.2a10 10 0 0 1 2-.2c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8 M6.5 6.5A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.5-1.5',
  mail:'M3 5h18v14H3z M3 6l9 7 9-7', arrow:'m9 5 7 7-7 7', down:'m5 9 7 7 7-7',
  lock:'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3', ticket:'m3 6 18 0 0 4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z M15 7v2m0 2v2m0 2v2',
  user:'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-2c0-3.4 3.6-5 8-5s8 1.6 8 5v2',
  key:'M14 4a5 5 0 0 1 6 7 5 5 0 0 1-6 2L7 20H3v-4l8-7a5 5 0 0 1 3-5Z M16.5 7.5h.1'
};
function icon(name) {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  path.setAttribute('d',drawings[name]);svg.append(path);return svg;
}
const providerNames={google:'Google',discord:'Discord'};

export function createPlayerSignInUi({element,action,api,t,locale,open,complete,verification,policy,saveIntent}) {
  let method='password', draft={}, challenge=null, previousCode=null, external=null, providerRequest=null, requestVersion=0;
  function reset() { method='password'; draft={}; challenge=null; previousCode=null; external=null; ++requestVersion; }
  function providers() {
    if (!providerRequest) providerRequest=api('player-auth/methods',undefined,'GET').then(data=>data.providers).catch(()=>{providerRequest=null;return [];});
    return providerRequest;
  }
  function portrait() {
    const aside=element('aside','','auth-portrait'); aside.setAttribute('aria-hidden','true');
    const identity=element('div','','auth-wordmark');
    for(const child of document.querySelector('header .brand')?.childNodes || []) identity.append(child.cloneNode(true));
    const balance=element('div','','auth-credit');
    balance.append(element('small',t('demoFunds')),element('span',t('initialCredit')),element('strong',new Intl.NumberFormat(locale(),{style:'currency',currency:'CAD',currencyDisplay:'code',maximumFractionDigits:0}).format(100)));
    aside.append(identity,balance);
    return aside;
  }
  function recovery(panel) {
    const body=element('div','','auth-body auth-recovery'), section=element('div','','auth-form-panel');
    section.append(...panel.childNodes);body.append(section);panel.append(portrait(),body);
  }
  function mount(panel,title,signup) {
    const version=++requestVersion, mode=signup?'signup':'signin';
    function changeMethod(next) { method=next; open(mode); panel.querySelector('#dialog-title')?.focus({preventScroll:true}); }
    function switchTab(next) { method='password';challenge=null;external=null;open(next?'signup':'signin');panel.querySelector('[aria-selected=true]')?.focus({preventScroll:true}); }
    const isCode=method==='code', confirming=isCode && challenge, social=method==='external' && external;
    const aside=portrait();
    const body=element('div','','auth-body'),tabs=element('div','','auth-tabs');
    tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label',t('accessMethods'));
    for(const join of [false,true]) {
      const tab=action(t(join?'registerTab':'signInTab'),()=>{if(join!==signup)switchTab(join);},'auth-tab');
      tab.id='auth-tab-'+(join?'signup':'signin');tab.setAttribute('role','tab');tab.setAttribute('aria-controls','auth-form-panel');
      tab.setAttribute('aria-selected',String(join===signup));tab.tabIndex=join===signup?0:-1;
      tab.addEventListener('keydown',e=>{
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();const next=e.key==='Home'?false:e.key==='End'?true:!join;
        if(next!==signup)switchTab(next);
      }); tabs.append(tab);
    }
    const section=element('section','','auth-form-panel'); section.id='auth-form-panel';
    section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby','auth-tab-'+mode);
    title.textContent=t(confirming?'codeSentTitle':social?'finishRegistration':isCode?(signup?'registerCodeTitle':'codeTitle'):(signup?'registrationTitle':'loginTitle'));
    const form=element('form','','auth-entry-form');
    const message=element('p','','auth-error');message.setAttribute('role','alert');
    const controls=[];
    function inputField(name,type,label,autocomplete,options={}) {
      const wrap=element('div','','auth-field'),caption=element('label',t(label)),input=element('input');
      Object.assign(input,{id:'habibi-access-'+name,name,type,required:true,autocomplete,...options.input});
      caption.htmlFor=input.id;
      const box=element('div','','auth-input');box.append(icon(options.icon||'user'),input);
      if (type==='password') {
        const toggle=action('',()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.setAttribute('aria-pressed',String(show));toggle.setAttribute('aria-label',t(show?'hidePassword':'showPassword'));toggle.replaceChildren(icon(show?'eyeOff':'eye'));},'auth-eye');
        toggle.setAttribute('aria-label',t('showPassword'));toggle.setAttribute('aria-pressed','false');toggle.append(icon('eye'));box.append(toggle);
      }
      wrap.append(caption,box);
      if(options.help) {
        const help=element('small',t(options.help),'auth-hint');help.id=input.id+'-hint';input.setAttribute('aria-describedby',help.id);wrap.append(help);
      }
      const invalidKey=name==='username'?'invalidUsername':type==='email'?'badEmail':type==='password'?'badPassword':null;
      if(invalidKey){
        const error=element('small',t(invalidKey),'auth-field-error');error.hidden=true;error.id=input.id+'-error';wrap.append(error);
        const normal=input.getAttribute('aria-describedby')||'';
        const validate=()=>{
          const invalid=Boolean(input.value)&&!input.validity.valid;error.hidden=!invalid;
          input.setAttribute('aria-invalid',String(invalid));input.setAttribute('aria-describedby',[normal,invalid?error.id:''].filter(Boolean).join(' '));
        };
        input.addEventListener('blur',validate);input.addEventListener('input',()=>{if(!error.hidden)validate();});
      }
      controls.push(input);return {wrap,input};
    }
    function remember(input,key) {input.value=draft[key]||'';input.addEventListener('input',()=>{draft[key]=input.value;});}
    if (confirming) {
      section.append(title,element('p',challenge.email,'auth-email-address'),element('p',t('codeHint'),'auth-description'));
      const {wrap,input}=inputField('code','text','codeLabel','one-time-code',{icon:'key',input:{inputMode:'numeric',maxLength:8,pattern:'[0-9]{8}'}});
      input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,8);});form.append(wrap);
      if(challenge.previewCode) form.append(element('small','Sandbox · '+challenge.previewCode,'auth-hint'));
    } else {
      section.append(title);
      if(social) section.append(element('p',t('verifiedVia')+' '+providerNames[external.provider]+' · '+external.email,'auth-email-address'));
      else {
        const email=signup || isCode;
        const {wrap,input}=inputField(email?'email':'identifier',email?'email':'text',email?'email':'identifier',email?'email':'username',
          {icon:email?'mail':'user',input:{maxLength:254,autocapitalize:'none',spellcheck:false}});
        if (email && !draft.email && draft.identifier?.includes('@'))draft.email=draft.identifier;
        if (!email && !draft.identifier && draft.email)draft.identifier=draft.email;
        remember(input,email?'email':'identifier');form.append(wrap);
      }
      if (signup) {
        const {wrap,input}=inputField('username','text','username','username',{icon:'user',help:'usernameHelp',
          input:{minLength:3,maxLength:24,pattern:'[A-Za-z0-9][A-Za-z0-9_.\\-]{2,23}',spellcheck:false,autocapitalize:'none'}});
        remember(input,'username');form.append(wrap);
      }
      if (!social && !isCode) {
        const {wrap}=inputField('password','password','passwordShort',signup?'new-password':'current-password',
          {icon:'lock',help:signup?'passwordHelp':null,input:{minLength:10,maxLength:128}});
        if (!signup) wrap.querySelector('label').after(action(t('passwordReset'),()=>open('passwordReset'),'auth-forgot'));
        form.append(wrap);
      }
      if(signup) {
        const referral=element('details','','auth-referral'),summary=element('summary');
        summary.append(icon('ticket'),element('span',t('referralLabel')),element('small',t('optional')),icon('down'));
        const code=element('input');Object.assign(code,{name:'referralCode',type:'text',maxLength:48,autocomplete:'off'});code.setAttribute('aria-label',t('referralLabel'));
        remember(code,'referralCode');referral.open=Boolean(code.value);referral.append(summary,code);
        const row=element('div','','auth-agreement'),check=element('input');
        Object.assign(check,{id:'auth-consent',type:'checkbox',name:'accepted',required:true,checked:draft.accepted===true});controls.push(check);
        check.addEventListener('change',()=>{draft.accepted=check.checked;});
        const content=element('div'),label=element('label',t('consentLead')+' ');label.htmlFor=check.id;content.append(label);
        const href=policy();
        if(href) {
          const link=element('a',t('siteTerms'));link.href=href;link.target='_blank';link.rel='noopener noreferrer';content.append(link);
        } else {
          const note=element('p',t('demoRules'),'auth-terms-note');note.hidden=true;note.id='auth-terms-note';
          const read=action(t('demoTerms'),()=>{note.hidden=!note.hidden;read.setAttribute('aria-expanded',String(!note.hidden));},'auth-text-button');
          read.setAttribute('aria-controls',note.id);read.setAttribute('aria-expanded','false');content.append(read,note);
        }
        row.append(check,content);form.append(referral,row);
      }
    }
    const primary=element('button','','auth-submit');primary.type='submit';
    const caption=t(confirming?'loginAction':isCode?'sendAccessCode':signup?'registerAction':'loginAction');
    primary.textContent=confirming && signup ? t('registerAction') : caption;
    const baseCaption=primary.textContent;
    let busy=false;
    function validity(){primary.disabled=busy || !controls.every(i=>i.validity.valid);}
    for(const event of ['input','change','focusin']) form.addEventListener(event,validity);
    form.append(message,primary);section.append(form);validity();
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy || !form.reportValidity())return;
      busy=true;validity();message.textContent='';form.setAttribute('aria-busy','true');
      primary.textContent=t(isCode&&!confirming?'authSending':signup&&!confirming?'authCreating':'authChecking');
      const data=Object.fromEntries(new FormData(form));data.accepted=data.accepted==='on';data.locale=locale();
      try {
        if(confirming) {
          const auth=await api('player-auth/code/finish',{ticket:challenge.ticket,code:data.code});
          if(version===requestVersion){reset();await complete(auth);} else await complete(auth,false);
        } else if(social) {
          const auth=await api('player-auth/external/finish',data);
          if(version===requestVersion){reset();await complete(auth);} else await complete(auth,false);
        } else if(isCode) {
          const key=JSON.stringify([mode,data.email.toLowerCase(),data.username,data.referralCode,data.locale]);
          const reuse=previousCode?.key===key && previousCode.time>Date.now()-60_000;
          const result=reuse ? previousCode.result : await api('player-auth/code/start',{...data,mode});
          if(version===requestVersion)previousCode={key,time:reuse?previousCode.time:Date.now(),result};
          if(version===requestVersion){challenge={...result,email:data.email};changeMethod('code');panel.querySelector('input[name=code]')?.focus();}
        } else {
          const auth=await api(signup?'signup':'login',data);
          if(version!==requestVersion){if(!auth.verificationRequired)await complete(auth,false);return;}
          reset();
          if(auth.verificationRequired) verification(data.email,auth.verifyUrl);else await complete(auth);
        }
      } catch(error) {
        if(version===requestVersion){message.textContent=t(error.message==='credentials' && !signup?'badLogin':error.message);message.scrollIntoView({block:'nearest'});}
      } finally {
        busy=false;form.removeAttribute('aria-busy');primary.textContent=baseCaption;validity();
      }
    });
    function methodButton(label,fn,kind,art) {
      const button=action('',fn,'auth-method '+kind);button.append(art||icon('mail'),element('span',label),icon('arrow'));return button;
    }
    if(method==='password') {
      const separator=element('div',t('separator'),'auth-or');section.append(separator);
      const google=element('div','','auth-google');
      const code=methodButton(t('emailCode'),()=>{challenge=null;changeMethod('code');},'code-method');
      section.append(google,code);
      const more=element('details','','auth-options'),summary=element('summary',t(signup?'moreRegister':'moreMethods'));summary.append(icon('down'));more.append(summary);
      const options=element('div','','auth-method-list');more.append(options);
      if(!signup)options.append(action(t('emailVerificationSend'),()=>verification(draft.email||(draft.identifier?.includes('@')?draft.identifier:'')), 'auth-link'));
      more.hidden=signup;section.append(more);
      void providers().then(enabled=>{
        if(!section.isConnected)return;
        for(const name of enabled.filter(n=>Object.hasOwn(providerNames,n))){
          const word=providerNames[name],mark=element('img','','auth-provider-mark');
          mark.alt='';mark.width=20;mark.height=20;mark.src=new URL(name==='google'?'player-google.png':'player-discord.svg',import.meta.url);
          const button=methodButton(t('registerWith')+' '+word,async()=>{
            button.disabled=true;
            try {
              const result=await api('player-auth/external/start',{provider:name,mode,locale:locale()});
              if(version!==requestVersion)return;
              saveIntent();location.assign(result.url);
            } catch(error) {if(section.isConnected)message.textContent=t(error.message);button.disabled=false;}
          },'method-'+name,mark);
          if(name==='google')google.append(button);else{more.hidden=false;options.prepend(button);}
        }
      });
    } else {
      if(confirming) section.append(element('small',t('resendCodeHint'),'auth-resend-hint'),action(t('changeAddress'),()=>{challenge=null;changeMethod('code');},'auth-link'));
      section.append(action(t('backToPassword'),()=>{challenge=null;external=null;changeMethod('password');},'auth-link'));
    }
    const footer=element('p','','auth-switch');footer.append(document.createTextNode(t(signup?'loginPrompt':'registerPrompt')+' '),action(t(signup?'signInTab':'registerTab'),()=>switchTab(!signup),'auth-text-button'));
    section.append(footer);body.append(tabs,section);panel.replaceChildren(aside,body);
  }
  async function resume() {
    external=await api('player-auth/external/pending',undefined,'GET');
    if(external.linked){const auth=await api('player-auth/external/finish',{});reset();await complete(auth);return;}
    method='external';open('signup');
  }
  return {mount,recovery,reset,resume};
}
