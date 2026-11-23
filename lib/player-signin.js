import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const minutes = n => n * 60_000;
const digest = text => createHash('sha256').update(text).digest('hex');
const token = () => randomBytes(32).toString('hex');
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@,;:<>()[\]"\\]+@[\w.-]+\.[\w-]+$/u.test(email);
const localeOf = value => value === 'fr-CA' ? 'fr-CA' : 'en-CA';
export const validPlayerName = name => typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/.test(name);

const sources = {
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', profile: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email' },
  discord: { authorize: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/v10/oauth2/token', profile: 'https://discord.com/api/v10/users/@me', scope: 'identify email' }
};

export function createPlayerSignIn({db, fail, transaction, register, session, emailPreview, requireMail, deliver, publicBaseUrl, cookiePath, secureCookie, environment = process.env, fetcher = fetch}) {
  transaction(()=>db.exec(`
    CREATE TABLE IF NOT EXISTS player_login_names (
      player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE, tenant_id TEXT NOT NULL REFERENCES tenants(id),
      username TEXT NOT NULL COLLATE NOCASE, accepted_at INTEGER, terms_version TEXT, UNIQUE(tenant_id,username)
    );
    CREATE TABLE IF NOT EXISTS player_login_identities (
      tenant_id TEXT NOT NULL REFERENCES tenants(id), provider TEXT NOT NULL, subject TEXT NOT NULL,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, PRIMARY KEY(tenant_id,provider,subject), UNIQUE(tenant_id,player_id,provider)
    );
    CREATE TABLE IF NOT EXISTS player_login_codes (
      ticket TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, email TEXT NOT NULL, mode TEXT NOT NULL, player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, details TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS player_login_code_recipient ON player_login_codes(tenant_id,email,created_at);
    CREATE TABLE IF NOT EXISTS player_login_redirects (
      browser_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, mode TEXT NOT NULL, locale TEXT NOT NULL,
      state_hash TEXT NOT NULL, verifier TEXT NOT NULL, subject TEXT, email TEXT, expires INTEGER NOT NULL
    );
  `));
  const names = db.prepare('SELECT 1 FROM player_login_names WHERE tenant_id=? AND username=?');
  function registration(tenant, input) {
    const username = typeof input.username === 'string' ? input.username.trim() : '';
    if (!validPlayerName(username)) fail(400,'invalidUsername');
    if (input.accepted !== true) fail(400,'termsRequired');
    if (names.get(tenant, username)) fail(409,'usernameTaken');
    return { username, locale:localeOf(input.locale), referralCode:input.referralCode, accepted:true };
  }
  const publicOrigin = publicBaseUrl ? new URL(publicBaseUrl).origin : '';
  function providerSettings(req, name) {
    if (!Object.hasOwn(sources, name) || !publicOrigin || !secureCookie || req.headers.host?.toLowerCase() !== new URL(publicOrigin).host) return null;
    const prefix = 'PLAYER_' + name.toUpperCase() + '_';
    const id = environment[prefix + 'CLIENT_ID'], secret = environment[prefix + 'CLIENT_SECRET'];
    return id && secret ? { ...sources[name], id, secret, redirect:publicBaseUrl+'/api/player-auth/callback/'+name } : null;
  }
  function methods(req) {
    return { providers:Object.keys(sources).filter(name => providerSettings(req,name)) };
  }

  const codeExpiry = minutes(10);
  async function startCode(req, tenant, input) {
    requireMail(req);
    if (!validEmail(input.email) || !['signin','signup'].includes(input.mode)) fail(400,'credentials');
    const email = input.email.toLowerCase(), signup = input.mode === 'signup';
    const details = signup ? registration(tenant,input) : { locale:localeOf(input.locale) };
    const ticket = token(), code = String(randomInt(0,100_000_000)).padStart(8,'0');
    const now = Date.now();
    const saved = transaction(() => {
      db.prepare('DELETE FROM player_login_codes WHERE created_at<=?').run(now - minutes(15));
      const recent = db.prepare('SELECT COUNT(*) AS count, MAX(created_at) AS latest FROM player_login_codes WHERE tenant_id=? AND email=?').get(tenant,email);
      if (recent.count >= 3 || recent.latest > now - 60_000) return false;
      const row = db.prepare('SELECT id,email_verified,access_status FROM players WHERE tenant_id=? AND email=?').get(tenant,email);
      if (signup ? row : !row?.email_verified || row.access_status !== 'active' || db.prepare('SELECT excluded_at FROM player_safety WHERE player=?').get(row.id)?.excluded_at) return false;
      db.prepare('INSERT INTO player_login_codes(ticket,tenant_id,email,mode,player_id,code_hash,details,created_at) VALUES(?,?,?,?,?,?,?,?)')
        .run(digest(ticket),tenant,email,input.mode,row?.id ?? null,digest(ticket+code),JSON.stringify(details),now);
      return true;
    });
    if (saved && !emailPreview(req)) {
      const french = details.locale === 'fr-CA';
      // Always give the browser the same reply regardless of account or mail transport.
      void deliver(email, french ? 'Votre code d’accès joueur' : 'Your player access code', french
        ? 'Votre code est '+code+'. Il expire dans 10 minutes. Si vous n’avez pas demandé ce code, ignorez ce message.'
        : 'Your code is '+code+'. It expires in 10 minutes. If you did not request this code, ignore this message.')
        .catch(() => { db.prepare('DELETE FROM player_login_codes WHERE ticket=?').run(digest(ticket)); });
    }
    return { ticket, ...(saved && emailPreview(req) ? { previewCode:code } : {}) };
  }
  function finishCode(req, res, tenant, input) {
    if (!validToken(input.ticket) || typeof input.code !== 'string' || !/^\d{8}$/.test(input.code)) fail(400,'codeInvalid');
    const key = digest(input.ticket);
    const result = transaction(() => {
      const row = db.prepare('SELECT * FROM player_login_codes WHERE ticket=? AND tenant_id=? AND created_at>? AND attempts<5').get(key,tenant,Date.now()-codeExpiry);
      if (!row) return null;
      if (!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(digest(input.ticket+input.code),'hex'))) {
        db.prepare('UPDATE player_login_codes SET attempts=attempts+1 WHERE ticket=?').run(key);
        return null;
      }
      const details = JSON.parse(row.details);
      let id = row.player_id;
      if (row.mode === 'signup') {
        registration(tenant,details);
        id = register(req,tenant,row.email,details,{ verified:true });
      } else if (!db.prepare('SELECT 1 FROM players WHERE id=? AND tenant_id=? AND email=? AND email_verified=1').get(id,tenant,row.email)) return null;
      db.prepare('DELETE FROM player_login_codes WHERE tenant_id=? AND email=?').run(tenant,row.email);
      return session(req,res,tenant,id);
    });
    if (!result) fail(400,'codeInvalid');
    return result;
  }

  const browserCookie = req => req.headers.cookie?.match(/(?:^|;\s*)habibi_player_flow=([0-9a-f]{64})(?:;|$)/)?.[1];
  const cookieValue = (value,age) => 'habibi_player_flow='+value+'; Path='+cookiePath+'; HttpOnly; SameSite=Lax; Max-Age='+age+secureCookie;
  function startExternal(req,res,tenant,input) {
    const name = input.provider, config = providerSettings(req,name);
    if (!config || !['signin','signup'].includes(input.mode)) fail(400,'providerUnavailable');
    const state=token(), browser=token(), verifier=randomBytes(48).toString('base64url'), now=Date.now();
    db.prepare('DELETE FROM player_login_redirects WHERE expires<=? OR browser_hash=?').run(now,digest(browserCookie(req)||''));
    db.prepare('INSERT INTO player_login_redirects(browser_hash,tenant_id,provider,mode,locale,state_hash,verifier,expires) VALUES(?,?,?,?,?,?,?,?)')
      .run(digest(browser),tenant,name,input.mode,localeOf(input.locale),digest(state),verifier,now+minutes(10));
    res.appendHeader('Set-Cookie',cookieValue(browser,600));
    const url = new URL(config.authorize);
    url.search = new URLSearchParams({client_id:config.id,redirect_uri:config.redirect,response_type:'code',scope:config.scope,state});
    if (name === 'google') {
      url.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'));
      url.searchParams.set('code_challenge_method','S256');
    }
    return { url:url.href };
  }
  function flow(req,tenant) {
    const browser=browserCookie(req);
    return browser && db.prepare('SELECT * FROM player_login_redirects WHERE browser_hash=? AND tenant_id=? AND expires>?').get(digest(browser),tenant,Date.now());
  }
  async function callback(req,tenant,provider,params) {
    const row=flow(req,tenant), config=providerSettings(req,provider);
    if (!config || !row || row.provider!==provider || !validToken(params.get('state')) || digest(params.get('state'))!==row.state_hash) return 'expired';
    // Consume the state before making network calls. A callback cannot be replayed.
    const claim=db.prepare("UPDATE player_login_redirects SET state_hash='',verifier='' WHERE browser_hash=? AND state_hash=?").run(row.browser_hash,row.state_hash);
    if (!claim.changes) return 'expired';
    const code=params.get('code');
    if (params.has('error') || !code || code.length>2048) return 'cancelled';
    const body=new URLSearchParams({client_id:config.id,client_secret:config.secret,grant_type:'authorization_code',redirect_uri:config.redirect,code});
    if (provider==='google') body.set('code_verifier',row.verifier);
    try {
      const result=await fetcher(config.token,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(7000)});
      if (!result.ok) return 'expired';
      const grant=await result.json();
      if (typeof grant.access_token!=='string' || !grant.access_token || grant.token_type?.toLowerCase()!=='bearer') return 'expired';
      // Read identity only over the provider's authenticated back channel.
      const profile=await fetcher(config.profile,{headers:{Authorization:'Bearer '+grant.access_token},redirect:'error',signal:AbortSignal.timeout(7000)});
      if (!profile.ok) return 'expired';
      const info=await profile.json(), subject=provider==='google'?info.sub:info.id;
      if (typeof subject!=='string' || !/^[0-9A-Za-z_-]{1,255}$/.test(subject) || !validEmail(info.email) || (provider==='google'?info.email_verified:info.verified)!==true) return 'unverified';
      const saved=db.prepare('UPDATE player_login_redirects SET subject=?,email=? WHERE browser_hash=? AND expires>?')
        .run(subject,info.email.toLowerCase(),row.browser_hash,Date.now());
      return saved.changes ? 'return' : 'expired';
    } catch { return 'expired'; }
  }
  function pending(req,tenant) {
    const row=flow(req,tenant);
    if (!row?.subject) fail(400,'providerExpired');
    const linked=db.prepare('SELECT player_id FROM player_login_identities WHERE tenant_id=? AND provider=? AND subject=?').get(tenant,row.provider,row.subject);
    if (!linked && db.prepare('SELECT 1 FROM players WHERE tenant_id=? AND email=?').get(tenant,row.email)) fail(409,'providerEmailUsed');
    return {provider:row.provider,email:row.email,locale:row.locale,linked:Boolean(linked)};
  }
  function finishExternal(req,res,tenant,input) {
    return transaction(() => {
      const current=pending(req,tenant), row=flow(req,tenant);
      let id=db.prepare('SELECT player_id FROM player_login_identities WHERE tenant_id=? AND provider=? AND subject=?').get(tenant,row.provider,row.subject)?.player_id;
      if (!current.linked) {
        const details=registration(tenant,{...input,locale:row.locale});
        id=register(req,tenant,row.email,details,{verified:true});
        db.prepare('INSERT INTO player_login_identities(tenant_id,provider,subject,player_id) VALUES(?,?,?,?)').run(tenant,row.provider,row.subject,id);
      }
      const auth=session(req,res,tenant,id);
      db.prepare('DELETE FROM player_login_redirects WHERE browser_hash=?').run(row.browser_hash);
      res.appendHeader('Set-Cookie',cookieValue('',0));
      return auth;
    });
  }
  return {registration, methods, startCode, finishCode, startExternal, callback, pending, finishExternal};
}
