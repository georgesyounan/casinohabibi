import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ttl = 10 * 60_000;
const username = /^[a-z][a-z0-9_]{4,31}$/i;
const invite = /^https:\/\/t\.me\/(?:\+[A-Za-z0-9_-]+|joinchat\/[A-Za-z0-9_-]+)$/;
const positiveId = value => Number.isSafeInteger(value) && value > 0;
const isAdmin = member => ['administrator', 'creator'].includes(member?.status);
const memberOf = member => isAdmin(member) || member?.status === 'member' ||
  (member?.status === 'restricted' && member.is_member === true);
const webhookSecret = (token, tenant) => createHmac('sha256', token).update('monthly-hook:' + tenant).digest('hex');
const codeFor = (token, tenant, start, sender) => {
  const bytes = createHmac('sha256', token).update(JSON.stringify(['monthly-code', tenant, start, sender])).digest();
  return String(bytes.readUInt32BE(0) % 100_000_000).padStart(8, '0');
};
const same = (a, b) => typeof b === 'string' && b.length <= 128 &&
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export function createMonthlyTelegram(db, {fail, transaction, seal, unseal, fetcher = fetch}) {
  db.exec(`CREATE TABLE IF NOT EXISTS monthly_telegram_settings (
    tenant TEXT PRIMARY KEY REFERENCES tenants(id), version INTEGER NOT NULL,
    bot_id INTEGER NOT NULL UNIQUE, bot_name TEXT NOT NULL, token_cipher TEXT NOT NULL,
    chat_id TEXT NOT NULL, chat_title TEXT NOT NULL, join_url TEXT NOT NULL,
    ready INTEGER NOT NULL, changed_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS monthly_telegram_challenges (
    tenant TEXT NOT NULL, player INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    version INTEGER NOT NULL, start TEXT NOT NULL UNIQUE, sender INTEGER, lang TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL, PRIMARY KEY(tenant,player));
    CREATE INDEX IF NOT EXISTS monthly_telegram_expiry ON monthly_telegram_challenges(expires);
    CREATE TABLE IF NOT EXISTS monthly_telegram_players (
    tenant TEXT NOT NULL REFERENCES tenants(id), player INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    sender INTEGER NOT NULL, linked_at INTEGER NOT NULL, PRIMARY KEY(tenant,player), UNIQUE(tenant,sender));`);
  const settings = db.prepare('SELECT * FROM monthly_telegram_settings WHERE tenant=?');
  const challenge = db.prepare('SELECT * FROM monthly_telegram_challenges WHERE tenant=? AND player=? AND version=? AND expires>?');
  const identity = db.prepare('SELECT sender FROM monthly_telegram_players WHERE tenant=? AND player=?');
  const discard = db.prepare('DELETE FROM monthly_telegram_challenges WHERE tenant=? AND player=?');
  const secret = config => unseal(config.tenant, config.token_cipher);
  function admin(tenant) {
    const config = settings.get(tenant);
    return config ? {version:config.version, ready:Boolean(config.ready), target:config.chat_id,
      title:config.chat_title, bot:config.bot_name} : {version:0, ready:false, target:'', title:'', bot:''};
  }
  async function call(token, method, body) {
    try {
      const response = await fetcher('https://api.telegram.org/bot' + token + '/' + method, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
        redirect:'error', signal:AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const json = await response.json();
        if (json.ok === true && json.result != null) return json.result;
      }
    } catch { /* Transport errors may contain the secret request URL. */ }
    fail(503, 'telegramUnavailable');
  }
  // Stage a version before installing the webhook. A failed installation can be retried.
  async function configure(tenant, input, base, authorize, record) {
    const previous = settings.get(tenant);
    if (input.version !== (previous?.version || 0)) fail(409, 'telegramChanged');
    if (previous && !previous.ready && previous.changed_at > Date.now() - 30_000) fail(409, 'telegramBusy');
    const token = String(input.token || '').trim() || (previous && secret(previous));
    let target = String(input.target || '').trim().replace(/^https:\/\/t\.me\/([\w]+)\/?$/i, '@$1');
    if (!/^\d{4,16}:[A-Za-z0-9_-]{30,80}$/.test(token || '') || typeof base !== 'string' ||
        !base.startsWith('https://') || !(target.startsWith('@') && username.test(target.slice(1)) || /^-\d{1,15}$/.test(target)))
      fail(400, 'telegramSettings');
    const bot = await call(token, 'getMe', {});
    if (!bot.is_bot || !positiveId(bot.id) || !username.test(bot.username || '') || !/bot$/i.test(bot.username)) fail(400, 'telegramSettings');
    const url = base + '/api/discovery/telegram/webhook';
    const chat = await call(token, 'getChat', {chat_id:target});
    if (!['group','channel','supergroup'].includes(chat.type) || !Number.isSafeInteger(chat.id) || chat.id >= 0) fail(400, 'telegramSettings');
    target = String(chat.id);
    const botMember = await call(token, 'getChatMember', {chat_id:target, user_id:bot.id});
    if (!isAdmin(botMember) || botMember.user?.id !== bot.id) fail(409, 'telegramAdminNeeded');
    const hook = await call(token, 'getWebhookInfo', {});
    if (typeof hook.url !== 'string' || (hook.url && hook.url !== url)) fail(409, 'telegramBotBusy');
    const joinUrl = username.test(chat.username || '') ? 'https://t.me/' + chat.username : chat.invite_link;
    if (!joinUrl || (!chat.username && !invite.test(joinUrl)) ||
        (chat.username && !username.test(chat.username))) fail(409, 'telegramInviteNeeded');
    const version = input.version + 1;
    transaction(() => {
      authorize();
      if ((settings.get(tenant)?.version || 0) !== input.version) fail(409, 'telegramChanged');
      if (db.prepare('SELECT 1 FROM monthly_telegram_settings WHERE bot_id=? AND tenant<>?').get(bot.id, tenant)) fail(409, 'telegramBotBusy');
      db.prepare(`INSERT INTO monthly_telegram_settings(tenant,version,bot_id,bot_name,token_cipher,chat_id,chat_title,join_url,ready,changed_at)
        VALUES(?,?,?,?,?,?,?,?,0,?) ON CONFLICT(tenant) DO UPDATE SET version=excluded.version,bot_id=excluded.bot_id,bot_name=excluded.bot_name,
        token_cipher=excluded.token_cipher,chat_id=excluded.chat_id,chat_title=excluded.chat_title,join_url=excluded.join_url,ready=0,changed_at=excluded.changed_at`)
        .run(tenant,version,bot.id,bot.username,seal(tenant,token),target,String(chat.title || target).slice(0,160),joinUrl,Date.now());
      record('configure');
    });
    try {
      if (await call(token,'setWebhook',{url, secret_token:webhookSecret(token,tenant), allowed_updates:['message']}) !== true)
        fail(503,'telegramUnavailable');
    } catch (error) {
      db.prepare('UPDATE monthly_telegram_settings SET changed_at=0 WHERE tenant=? AND version=?').run(tenant,version);
      throw error;
    }
    return transaction(() => {
      if (!db.prepare('UPDATE monthly_telegram_settings SET ready=1 WHERE tenant=? AND version=?').run(tenant, version).changes)
        fail(409, 'telegramChanged');
      record('activate');
      return admin(tenant);
    });
  }

  function inspect(tenant, player, now) {
    const config = settings.get(tenant);
    if (!config?.ready) return {state:'telegramClosed'};
    if (!player) return {state:'guest'};
    const joinUrl = config.join_url;
    if (identity.get(tenant,player)) return {state:'telegramClaim',joinUrl};
    const current = challenge.get(tenant,player,config.version,now);
    if (!current) return {state:'telegramStart',joinUrl};
    if (current.attempts >= 5) return {state:'telegramWait',joinUrl, retryAt:current.expires};
    return {state:'telegramCode',joinUrl, botUrl:'https://t.me/' + config.bot_name + '?start=' + current.start};
  }
  function start(tenant, player, lang, now = Date.now()) {
    const config = settings.get(tenant);
    if (!config?.ready) fail(409,'telegramClosed');
    if (identity.get(tenant,player) || challenge.get(tenant,player,config.version,now)) return;
    db.prepare('DELETE FROM monthly_telegram_challenges WHERE expires<=?').run(now);
    discard.run(tenant,player);
    db.prepare('INSERT INTO monthly_telegram_challenges(tenant,player,version,start,lang,expires) VALUES(?,?,?,?,?,?)')
      .run(tenant,player,config.version,randomBytes(24).toString('base64url'),lang === 'fr' ? 'fr' : 'en',now+ttl);
  }
  function authenticateHook(tenant, header) {
    const config = settings.get(tenant);
    if (!config?.ready || typeof header !== 'string' || !same(webhookSecret(secret(config),tenant),header)) fail(403,'telegramWebhookDenied');
    return config.version;
  }
  function handleMessage(tenant, version, update, now = Date.now()) {
    const msg = update?.message, sender = msg?.from?.id;
    const start = /^\/start ([A-Za-z0-9_-]{32})$/.exec(msg?.text || '')?.[1];
    if (!start || msg.chat?.type !== 'private' || !positiveId(sender) || msg.from.is_bot !== false || msg.chat.id !== sender) return {};
    const config = settings.get(tenant);
    if (!config?.ready || config.version !== version) return {};
    const current = db.prepare('SELECT * FROM monthly_telegram_challenges WHERE tenant=? AND start=? AND version=? AND expires>?')
      .get(tenant,start,version,now);
    if (!current || current.attempts >= 5 || (current.sender && current.sender !== sender)) return {};
    db.prepare('UPDATE monthly_telegram_challenges SET sender=? WHERE tenant=? AND start=?').run(sender,tenant,start);
    const code = codeFor(secret(config),tenant,start,sender), fr = current.lang === 'fr';
    return {method:'sendMessage',chat_id:sender,protect_content:true,
      text:fr ? 'Votre code Casino Habibi est ' + code + '. Entrez-le dans votre compte Casino Habibi, puis rejoignez le canal pour recevoir votre bonus mensuel.'
              : 'Your Casino Habibi code is ' + code + '. Enter it in your Casino Habibi account, then join the channel to receive your monthly bonus.',
      reply_markup:{inline_keyboard:[[{text:fr?'Rejoindre le canal':'Join the channel',url:config.join_url}]]}};
  }
  // Return failures so the caller commits the attempt counter before reporting the error.
  function confirm(tenant, player, code, now = Date.now()) {
    const config = settings.get(tenant);
    if (!config?.ready) return 'telegramClosed';
    if (identity.get(tenant,player)) return null;
    const current = challenge.get(tenant,player,config.version,now);
    if (!current || !current.sender || current.attempts>=5 || typeof code !== 'string' || !/^\d{8}$/.test(code))
      return 'telegramCodeInvalid';
    if (!same(codeFor(secret(config),tenant,current.start,current.sender),code)) {
      db.prepare('UPDATE monthly_telegram_challenges SET attempts=attempts+1 WHERE tenant=? AND player=?').run(tenant,player);
      return 'telegramCodeInvalid';
    }
    if (db.prepare('SELECT 1 FROM monthly_telegram_players WHERE tenant=? AND sender=?').get(tenant,current.sender))
      return 'telegramAlreadyLinked';
    db.prepare('INSERT INTO monthly_telegram_players(tenant,player,sender,linked_at) VALUES(?,?,?,?)').run(tenant,player,current.sender,now);
    discard.run(tenant,player);
    return null;
  }
  async function membership(tenant, player) {
    const config = settings.get(tenant), sender = identity.get(tenant,player)?.sender;
    if (!config?.ready || !sender) fail(409,'telegramLinkRequired');
    const token = secret(config);
    const botMember = await call(token,'getChatMember',{chat_id:config.chat_id,user_id:config.bot_id});
    if (botMember.user?.id !== config.bot_id || !isAdmin(botMember)) fail(503,'telegramUnavailable');
    const member = await call(token,'getChatMember',{chat_id:config.chat_id,user_id:sender});
    if (member.user?.id !== sender || member.user.is_bot !== false) fail(503,'telegramUnavailable');
    if (!memberOf(member)) fail(409,'telegramJoinRequired');
    return {tenant,player,sender,version:config.version,checked:Date.now()};
  }
  function permits(tenant, player, proof, now) {
    const config = settings.get(tenant);
    return Boolean(config?.ready && proof && proof.tenant === tenant && proof.player === player &&
      proof.version === config.version && proof.checked <= now && now - proof.checked <= 15_000 &&
      proof.sender === identity.get(tenant,player)?.sender);
  }
  return {admin,configure,inspect,start,authenticateHook,handleMessage,confirm,membership,permits};
}
