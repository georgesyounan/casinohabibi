import { createServer } from 'node:http';
import { resolveTxt } from 'node:dns/promises';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { games } from './public/catalog.js';
import { createComingSoon, installComingSoon } from './lib/coming-soon.js';
import { changedFields, createStaffAudit } from './lib/staff-audit.js';
import { createPlayerAccess, installPlayerAccess } from './lib/player-access.js';

const appEnvironment = process.env.APP_ENV || 'development';
if (!['development', 'staging', 'production'].includes(appEnvironment)) throw new Error('APP_ENV must be development, staging, or production');
const dataDir = resolve(process.env.DATA_DIR || (appEnvironment === 'development' ? 'data' : join('data', appEnvironment)));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const encryptionKeyValue = process.env.PROVIDER_KEY_ENCRYPTION || '';
const bootstrapEmailValue = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const bootstrapPasswordValue = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const platformAdminTokenValue = process.env.PLATFORM_ADMIN_TOKEN;
const resetEmailApiKey = process.env.RESET_EMAIL_API_KEY || '';
const resetEmailFrom = process.env.RESET_EMAIL_FROM || '';
const publicSite = process.env.PUBLIC_BASE_URL ? new URL(process.env.PUBLIC_BASE_URL) : null;
const appBasePath = (process.env.APP_BASE_PATH ?? publicSite?.pathname ?? '').replace(/\/$/, '');
if (!/^(?:\/[a-zA-Z0-9_-]+)*$/.test(appBasePath)) throw new Error('APP_BASE_PATH must contain only URL directory segments');
const cookiePath = appBasePath || '/';
const publicBaseUrl = publicSite ? `${publicSite.origin}${appBasePath}` : '';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
if (process.env.SECURE_COOKIES !== undefined && !['0', '1'].includes(process.env.SECURE_COOKIES)) throw new Error('SECURE_COOKIES must be 0 or 1');
if (encryptionKeyValue && !/^[a-f0-9]{64}$/i.test(encryptionKeyValue)) throw new Error('PROVIDER_KEY_ENCRYPTION must contain exactly 64 hexadecimal characters');
if ((bootstrapEmailValue && !bootstrapPasswordValue) || (!bootstrapEmailValue && bootstrapPasswordValue)) throw new Error('Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD');
if (bootstrapEmailValue && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bootstrapEmailValue)) throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address');
if (bootstrapPasswordValue && (bootstrapPasswordValue.length < 12 || bootstrapPasswordValue.length > 128)) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be between 12 and 128 characters');
if (bootstrapEmailValue && !encryptionKeyValue) throw new Error('PROVIDER_KEY_ENCRYPTION is required when bootstrapping an operator admin');
if (platformAdminTokenValue && platformAdminTokenValue.length < 32) throw new Error('PLATFORM_ADMIN_TOKEN must be at least 32 characters');
if ((resetEmailApiKey || resetEmailFrom || publicBaseUrl) && (!resetEmailApiKey || !/^[^<>\s]+@[^<>\s]+$/.test(resetEmailFrom) || !/^https:\/\//.test(publicBaseUrl))) throw new Error('Configure RESET_EMAIL_API_KEY, valid RESET_EMAIL_FROM, and HTTPS PUBLIC_BASE_URL together');
if (appEnvironment !== 'development') {
  if (!process.env.DATA_DIR) throw new Error(`DATA_DIR must be explicitly set for ${appEnvironment}`);
  if (!process.env.HOST) throw new Error(`HOST must be explicitly set for ${appEnvironment}`);
  if (process.env.SECURE_COOKIES !== '1') throw new Error(`SECURE_COOKIES=1 is required for ${appEnvironment}`);
  if (!encryptionKeyValue) throw new Error(`PROVIDER_KEY_ENCRYPTION is required for ${appEnvironment}`);
  if (!bootstrapEmailValue && !platformAdminTokenValue) throw new Error(`Configure a bootstrap operator admin or PLATFORM_ADMIN_TOKEN for ${appEnvironment}`);
  if (!resetEmailApiKey) throw new Error(`RESET_EMAIL_API_KEY, RESET_EMAIL_FROM, and PUBLIC_BASE_URL are required for ${appEnvironment}`);
}
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const environmentMarker = join(dataDir, '.northplay-environment');
try {
  writeFileSync(environmentMarker, `${appEnvironment}\n`, { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const recordedEnvironment = readFileSync(environmentMarker, 'utf8').trim();
  if (recordedEnvironment !== appEnvironment) throw new Error(`DATA_DIR is marked for ${recordedEnvironment}, not ${appEnvironment}`);
}
const db = new DatabaseSync(join(dataDir, 'northplay.sqlite'));
db.exec(`
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'suspended', 'closed')), created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS tenant_domains (host TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0, 1)), verification_token TEXT, verified_at INTEGER);
  CREATE TABLE IF NOT EXISTS tenant_config_versions (tenant_id TEXT NOT NULL REFERENCES tenants(id), version INTEGER NOT NULL, config TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft', 'published')), created_at INTEGER NOT NULL, PRIMARY KEY(tenant_id, version));
  CREATE TABLE IF NOT EXISTS platform_events (id INTEGER PRIMARY KEY, tenant_id TEXT REFERENCES tenants(id), action TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL, correlation_id TEXT);
  CREATE TABLE IF NOT EXISTS staff_accounts (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, mfa_secret TEXT, mfa_enabled INTEGER NOT NULL DEFAULT 0 CHECK(mfa_enabled IN (0, 1)));
  CREATE TABLE IF NOT EXISTS tenant_staff_memberships (tenant_id TEXT NOT NULL REFERENCES tenants(id), staff_id INTEGER NOT NULL REFERENCES staff_accounts(id), role TEXT NOT NULL CHECK(role IN ('operator_admin', 'operator_content', 'operator_provider', 'operator_support')), status TEXT NOT NULL CHECK(status IN ('active', 'disabled')), created_at INTEGER NOT NULL, PRIMARY KEY(tenant_id, staff_id));
  CREATE TABLE IF NOT EXISTS staff_sessions (token TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), staff_id INTEGER NOT NULL REFERENCES staff_accounts(id), expires INTEGER NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS staff_events (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), actor_id INTEGER NOT NULL REFERENCES staff_accounts(id), action TEXT NOT NULL, target TEXT NOT NULL, created_at INTEGER NOT NULL, correlation_id TEXT);
  CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 1 CHECK(email_verified IN (0, 1)), preferred_locale TEXT NOT NULL DEFAULT 'en-CA' CHECK(preferred_locale IN ('en-CA', 'fr-CA')));
  CREATE TABLE IF NOT EXISTS player_profiles (tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, display_name TEXT NOT NULL DEFAULT '', preferred_locale TEXT NOT NULL DEFAULT 'en-CA' CHECK(preferred_locale IN ('en-CA', 'fr-CA')), updated_at INTEGER NOT NULL, PRIMARY KEY(tenant_id, player_id));
  CREATE TABLE IF NOT EXISTS player_favorites (player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, tenant_id TEXT NOT NULL REFERENCES tenants(id), favorite_key TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(player_id, tenant_id, favorite_key));
  CREATE TABLE IF NOT EXISTS player_safety (player INTEGER PRIMARY KEY REFERENCES players(id), pause_until INTEGER, excluded_at INTEGER, cooling_off_until INTEGER, session_reminder_minutes INTEGER NOT NULL DEFAULT 60 CHECK(session_reminder_minutes IN (30, 60, 120)));
  CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id), category TEXT NOT NULL CHECK(category IN ('account', 'game', 'responsible_play', 'other')), message TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('open', 'answered', 'closed')), priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')), assigned_to INTEGER REFERENCES staff_accounts(id), reply TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, replied_by INTEGER REFERENCES staff_accounts(id), player_seen_at INTEGER, reply_thread_migrated INTEGER NOT NULL DEFAULT 0 CHECK(reply_thread_migrated IN (0, 1)));
  CREATE TABLE IF NOT EXISTS support_ticket_messages (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE, author_type TEXT NOT NULL CHECK(author_type IN ('player', 'staff')), player_id INTEGER REFERENCES players(id), staff_id INTEGER REFERENCES staff_accounts(id), message TEXT NOT NULL, created_at INTEGER NOT NULL, CHECK((author_type = 'player' AND player_id IS NOT NULL AND staff_id IS NULL) OR (author_type = 'staff' AND staff_id IS NOT NULL AND player_id IS NULL)));
  CREATE INDEX IF NOT EXISTS support_ticket_messages_thread ON support_ticket_messages(tenant_id, ticket_id, id);
  CREATE INDEX IF NOT EXISTS support_ticket_messages_player_rate ON support_ticket_messages(tenant_id, player_id, author_type, created_at);
  CREATE TABLE IF NOT EXISTS support_ticket_notes (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE, staff_id INTEGER NOT NULL REFERENCES staff_accounts(id), note TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS support_ticket_notes_ticket ON support_ticket_notes(tenant_id, ticket_id, id);
  CREATE INDEX IF NOT EXISTS support_tickets_player_time ON support_tickets(tenant_id, player_id, created_at);
  CREATE INDEX IF NOT EXISTS support_tickets_inbox ON support_tickets(tenant_id, status, updated_at);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, player INTEGER REFERENCES players(id), expires INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS player_password_resets (token_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, expires INTEGER NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS player_password_resets_expiry ON player_password_resets(expires);
  CREATE TABLE IF NOT EXISTS player_email_verifications (token_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, expires INTEGER NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS player_email_verifications_expiry ON player_email_verifications(expires);
  CREATE TABLE IF NOT EXISTS player_email_changes (token_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, new_email TEXT NOT NULL, expires INTEGER NOT NULL, created_at INTEGER NOT NULL, UNIQUE(tenant_id, new_email));
  CREATE INDEX IF NOT EXISTS player_email_changes_expiry ON player_email_changes(expires);
  CREATE TABLE IF NOT EXISTS player_consent_events (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, consent_type TEXT NOT NULL CHECK(consent_type IN ('marketing_email')), granted INTEGER NOT NULL CHECK(granted IN (0, 1)), locale TEXT NOT NULL CHECK(locale IN ('en-CA', 'fr-CA')), notice_version TEXT NOT NULL, source TEXT NOT NULL, captured_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS player_consent_history ON player_consent_events(tenant_id, player_id, consent_type, id);
  CREATE TABLE IF NOT EXISTS player_protection_events (id INTEGER PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, action TEXT NOT NULL CHECK(action IN ('cooling_off_started', 'cooling_off_extended')), duration_days INTEGER NOT NULL CHECK(duration_days IN (1, 7, 30)), until_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS player_protection_history ON player_protection_events(tenant_id, player_id, id);
  CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY, player INTEGER NOT NULL REFERENCES players(id), game TEXT, wager INTEGER NOT NULL, amount INTEGER NOT NULL, request_id TEXT, created_at INTEGER NOT NULL DEFAULT 0, UNIQUE(player, request_id));
  CREATE TABLE IF NOT EXISTS providers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, encrypted_key TEXT NOT NULL, updated TEXT NOT NULL, tenant_id TEXT NOT NULL DEFAULT 'sandbox', UNIQUE(tenant_id, name), UNIQUE(id, tenant_id));
  CREATE TABLE IF NOT EXISTS provider_events (id INTEGER PRIMARY KEY, name TEXT NOT NULL, action TEXT NOT NULL, created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS game_catalog (
    id INTEGER PRIMARY KEY,
    provider_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    tenant_id TEXT NOT NULL DEFAULT 'sandbox',
    external_id TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_fr TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('slots', 'table', 'live')),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
    UNIQUE(tenant_id, provider_id, external_id),
    FOREIGN KEY(provider_id, tenant_id) REFERENCES providers(id, tenant_id) ON DELETE CASCADE
  );
`);
if (!db.prepare('PRAGMA table_info(support_tickets)').all().some(({ name }) => name === 'player_seen_at')) {
  db.exec('ALTER TABLE support_tickets ADD COLUMN player_seen_at INTEGER');
}
if (!db.prepare('PRAGMA table_info(support_tickets)').all().some(({ name }) => name === 'priority')) {
  db.exec("ALTER TABLE support_tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent'))");
}
if (!db.prepare('PRAGMA table_info(support_tickets)').all().some(({ name }) => name === 'assigned_to')) {
  db.exec('ALTER TABLE support_tickets ADD COLUMN assigned_to INTEGER REFERENCES staff_accounts(id)');
}
if (!db.prepare('PRAGMA table_info(support_tickets)').all().some(({ name }) => name === 'reply_thread_migrated')) {
  db.exec('ALTER TABLE support_tickets ADD COLUMN reply_thread_migrated INTEGER NOT NULL DEFAULT 0 CHECK(reply_thread_migrated IN (0, 1))');
}
if (!db.prepare('PRAGMA table_info(support_tickets)').all().some(({ name }) => name === 'is_complaint')) {
  db.exec('ALTER TABLE support_tickets ADD COLUMN is_complaint INTEGER NOT NULL DEFAULT 0 CHECK(is_complaint IN (0, 1))');
}
db.exec('CREATE INDEX IF NOT EXISTS support_tickets_triage ON support_tickets(tenant_id, priority, status, updated_at)');
db.exec('CREATE INDEX IF NOT EXISTS support_tickets_assignee ON support_tickets(tenant_id, assigned_to, status, updated_at)');
db.exec('CREATE INDEX IF NOT EXISTS support_tickets_player_updated ON support_tickets(tenant_id, player_id, updated_at DESC, id DESC)');
db.exec('CREATE INDEX IF NOT EXISTS support_tickets_activity ON support_tickets(tenant_id, updated_at DESC, id DESC)');
transaction(() => {
  db.exec("INSERT INTO support_ticket_messages(tenant_id, ticket_id, author_type, staff_id, message, created_at) SELECT t.tenant_id, t.id, 'staff', t.replied_by, t.reply, t.updated_at FROM support_tickets t WHERE t.reply IS NOT NULL AND t.replied_by IS NOT NULL AND t.reply_thread_migrated = 0");
  db.exec('UPDATE support_tickets SET reply_thread_migrated = 1 WHERE reply_thread_migrated = 0');
});
for (const table of ['platform_events', 'staff_events']) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(({ name }) => name === 'correlation_id')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN correlation_id TEXT`);
  }
}
db.exec('CREATE INDEX IF NOT EXISTS staff_events_actor_activity ON staff_events(tenant_id, actor_id, created_at)');
db.exec('CREATE INDEX IF NOT EXISTS staff_events_tenant_page ON staff_events(tenant_id, id)');
transaction(() => {
  const columns = db.prepare('PRAGMA table_info(tenant_staff_memberships)').all().map(({ name }) => name);
  if (!columns.includes('publish_website')) {
    db.exec('ALTER TABLE tenant_staff_memberships ADD COLUMN publish_website INTEGER NOT NULL DEFAULT 0 CHECK(publish_website IN (0, 1))');
    db.exec("UPDATE tenant_staff_memberships SET publish_website = 1 WHERE role = 'operator_content'");
  }
  if (!columns.includes('publish_catalogue')) {
    db.exec('ALTER TABLE tenant_staff_memberships ADD COLUMN publish_catalogue INTEGER NOT NULL DEFAULT 0 CHECK(publish_catalogue IN (0, 1))');
    db.exec("UPDATE tenant_staff_memberships SET publish_catalogue = 1 WHERE role = 'operator_provider'");
  }
});
for (const [column, definition] of [['verification_token', 'TEXT'], ['verified_at', 'INTEGER']]) {
  if (!db.prepare('PRAGMA table_info(tenant_domains)').all().some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE tenant_domains ADD COLUMN ${column} ${definition}`);
  }
}
db.prepare("INSERT OR IGNORE INTO tenants(id, slug, name, status, created_at) VALUES ('sandbox', 'sandbox', 'Northplay Sandbox', 'active', ?)").run(Date.now());
const defaultBrandOptions = {
  enabledSections: { comingSoon: true, faq: true },
  displayMarket: '',
  reportingTimeZone: 'UTC'
};
const defaultTenantConfig = {
  brandName: 'Northplay', brandLogo: '', brandFavicon: '', primaryLocale: 'en-CA', enabledLocales: ['en-CA', 'fr-CA'], accentColor: '#d7b45a', supportEmail: '',
  heroTitleEn: 'Your seat at the table.', heroTitleFr: 'Votre place à la table.',
  heroIntroEn: 'Explore the game lobby and try a round with simulated CAD funds.',
  heroIntroFr: 'Explorez le hall et essayez une partie avec des fonds fictifs en dollars canadiens.',
  announcementEn: '', announcementFr: '',
  faqItems: [
    { questionEn: 'Can I withdraw my demo balance?', answerEn: 'No. The balance is simulated, has no cash value, and cannot be deposited or withdrawn.', questionFr: 'Puis-je retirer mon solde de démonstration?', answerFr: 'Non. Le solde est fictif, n’a aucune valeur monétaire et ne peut être ni déposé ni retiré.' },
    { questionEn: 'Can I play games from external providers?', answerEn: 'Not in this demo. It includes four built-in simulated games you can play. Imported provider listings are for catalog preview only; no external games are connected or launched.', questionFr: 'Puis-je jouer aux jeux de fournisseurs externes?', answerFr: 'Pas dans cette version de démonstration. Elle comprend quatre jeux simulés intégrés auxquels vous pouvez jouer. Les fiches importées servent uniquement à prévisualiser le catalogue; aucun jeu externe n’est connecté ni lancé.' },
    { questionEn: 'What account controls are available?', answerEn: 'You can set a daily limit for simulated wagers, pause demo play for 15 minutes, or self-exclude the account. These controls apply to this prototype account only.', questionFr: 'Quels contrôles sont offerts dans le compte?', answerFr: 'Vous pouvez fixer une limite quotidienne de mises fictives, mettre le jeu en pause pendant 15 minutes ou exclure le compte. Ces contrôles s’appliquent uniquement au compte de ce prototype.' }
  ],
  featuredGameIds: ['gold', 'roulette'],
  footerTextEn: 'Simulated funds only. No cash value.', footerTextFr: 'Fonds fictifs uniquement. Aucune valeur monétaire.',
  privacyUrlEn: '', privacyUrlFr: '', termsUrlEn: '', termsUrlFr: '',
  ...defaultBrandOptions
};
if (!db.prepare("SELECT 1 FROM tenant_config_versions WHERE tenant_id = 'sandbox' AND status = 'published'").get()) {
  db.prepare("INSERT INTO tenant_config_versions(tenant_id, version, config, status, created_at) VALUES ('sandbox', 1, ?, 'published', ?)").run(JSON.stringify(defaultTenantConfig), Date.now());
}
for (const host of ['localhost', '127.0.0.1']) {
  db.prepare("INSERT OR IGNORE INTO tenant_domains(host, tenant_id, verified) VALUES (?, 'sandbox', 1)").run(host);
}
const sandboxHosts = (process.env.SANDBOX_TENANT_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
if (sandboxHosts.length) transaction(() => {
  const hostPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/;
  const findHost = db.prepare('SELECT tenant_id AS tenant FROM tenant_domains WHERE host = ?');
  const addHost = db.prepare("INSERT OR IGNORE INTO tenant_domains(host, tenant_id, verified, verified_at) VALUES (?, 'sandbox', 1, ?)");
  for (const host of sandboxHosts) {
    if (!hostPattern.test(host)) throw new Error('SANDBOX_TENANT_HOSTS must contain valid hostnames');
    const existing = findHost.get(host);
    if (existing && existing.tenant !== 'sandbox') throw new Error(`Configured sandbox host ${host} is already assigned to another tenant`);
    addHost.run(host, Date.now());
  }
});
for (const table of ['players', 'sessions', 'ledger', 'providers', 'provider_events', 'game_catalog']) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some(({ name }) => name === 'tenant_id')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'sandbox'`);
  }
}
if (!db.prepare('PRAGMA table_info(sessions)').all().some(({ name }) => name === 'created_at')) {
  db.exec('ALTER TABLE sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0');
  db.prepare('UPDATE sessions SET created_at = ? WHERE created_at = 0').run(Date.now());
}
const providerCols = db.prepare('PRAGMA table_info(providers)').all().map(({ name }) => name);
if (!providerCols.includes('id') || !/UNIQUE\s*\(\s*tenant_id\s*,\s*name\s*\)/i.test(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='providers'").get().sql)) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE providers_tenant_migration (id INTEGER PRIMARY KEY, name TEXT NOT NULL, encrypted_key TEXT NOT NULL, updated TEXT NOT NULL, tenant_id TEXT NOT NULL DEFAULT 'sandbox', UNIQUE(tenant_id, name), UNIQUE(id, tenant_id));
    INSERT INTO providers_tenant_migration(id, name, encrypted_key, updated, tenant_id) SELECT rowid, name, encrypted_key, updated, tenant_id FROM providers;
    CREATE TABLE game_catalog_tenant_migration (id INTEGER PRIMARY KEY, provider_id INTEGER NOT NULL, provider TEXT NOT NULL, tenant_id TEXT NOT NULL DEFAULT 'sandbox', external_id TEXT NOT NULL, title_en TEXT NOT NULL, title_fr TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('slots', 'table', 'live')), enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)), UNIQUE(tenant_id, provider_id, external_id), FOREIGN KEY(provider_id, tenant_id) REFERENCES providers_tenant_migration(id, tenant_id) ON DELETE CASCADE);
    INSERT INTO game_catalog_tenant_migration(id, provider_id, provider, tenant_id, external_id, title_en, title_fr, category, enabled)
      SELECT gc.id, p.id, gc.provider, gc.tenant_id, gc.external_id, gc.title_en, gc.title_fr, gc.category, gc.enabled FROM game_catalog gc JOIN providers_tenant_migration p ON p.name = gc.provider AND p.tenant_id = gc.tenant_id;
    DROP TABLE game_catalog;
    DROP TABLE providers;
    ALTER TABLE providers_tenant_migration RENAME TO providers;
    ALTER TABLE game_catalog_tenant_migration RENAME TO game_catalog;
    PRAGMA foreign_keys = ON;
  `);
}
const playerTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'players'").get().sql;
if (!/UNIQUE\s*\(\s*tenant_id\s*,\s*email\s*\)/i.test(playerTableSql)) {
  const columns = new Set(db.prepare('PRAGMA table_info(players)').all().map(({ name }) => name));
  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE players_tenant_migration (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 1 CHECK(email_verified IN (0, 1)),
      preferred_locale TEXT NOT NULL DEFAULT 'en-CA' CHECK(preferred_locale IN ('en-CA', 'fr-CA')),
      tenant_id TEXT NOT NULL DEFAULT 'sandbox',
      UNIQUE(tenant_id, email)
    );
    INSERT INTO players_tenant_migration(id, email, password, tenant_id, email_verified, preferred_locale)
      SELECT id, email, password, tenant_id, ${columns.has('email_verified') ? 'email_verified' : '1'},
        ${columns.has('preferred_locale') ? 'preferred_locale' : "'en-CA'"} FROM players;
    DROP TABLE players;
    ALTER TABLE players_tenant_migration RENAME TO players;
    PRAGMA foreign_keys = ON;
  `);
}
if (!db.prepare('PRAGMA table_info(players)').all().some(({ name }) => name === 'email_verified')) {
  db.exec('ALTER TABLE players ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1 CHECK(email_verified IN (0, 1))');
}
if (!db.prepare('PRAGMA table_info(players)').all().some(({ name }) => name === 'preferred_locale')) {
  db.exec("ALTER TABLE players ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'en-CA' CHECK(preferred_locale IN ('en-CA', 'fr-CA'))");
}
db.prepare('INSERT OR IGNORE INTO player_profiles(tenant_id, player_id, display_name, preferred_locale, updated_at) SELECT tenant_id, id, \'\', preferred_locale, ? FROM players').run(Date.now());
if (!db.prepare('PRAGMA table_info(player_safety)').all().some(({ name }) => name === 'daily_limit_cents')) {
  db.exec('ALTER TABLE player_safety ADD COLUMN daily_limit_cents INTEGER NOT NULL DEFAULT 2500');
}
if (!db.prepare('PRAGMA table_info(player_safety)').all().some(({ name }) => name === 'cooling_off_until')) {
  db.exec('ALTER TABLE player_safety ADD COLUMN cooling_off_until INTEGER');
}
if (!db.prepare('PRAGMA table_info(player_safety)').all().some(({ name }) => name === 'session_reminder_minutes')) {
  db.exec('ALTER TABLE player_safety ADD COLUMN session_reminder_minutes INTEGER NOT NULL DEFAULT 60 CHECK(session_reminder_minutes IN (30, 60, 120))');
}
if (!db.prepare('PRAGMA table_info(ledger)').all().some(({ name }) => name === 'created_at')) {
  db.exec('ALTER TABLE ledger ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0');
}
if (!db.prepare('PRAGMA table_info(ledger)').all().some(({ name }) => name === 'outcome')) {
  db.exec('ALTER TABLE ledger ADD COLUMN outcome TEXT');
}
db.exec('CREATE INDEX IF NOT EXISTS ledger_tenant_activity ON ledger(tenant_id, created_at, player)');
installComingSoon(db);
const encryptionKey = encryptionKeyValue ? Buffer.from(encryptionKeyValue, 'hex') : null;
const staffAudit = createStaffAudit(db, { fail, transaction, encryptionKey });
installPlayerAccess(db, transaction);
const playerAccess = createPlayerAccess(db, { fail, recordAudit: staffAudit.record });
const comingSoon = createComingSoon(db, { fail, recordAudit: staffAudit.record, validArtwork: validBrandLogo, appBasePath });
const adminEnabled = Boolean(encryptionKey);
const bootstrapEmail = bootstrapEmailValue;
const bootstrapPassword = bootstrapPasswordValue;
if (adminEnabled && typeof bootstrapEmail === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bootstrapEmail) && typeof bootstrapPassword === 'string' && bootstrapPassword.length >= 12) {
  let staff = db.prepare('SELECT id FROM staff_accounts WHERE email = ?').get(bootstrapEmail);
  if (!staff) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${scryptSync(bootstrapPassword, salt, 64).toString('hex')}`;
    const { lastInsertRowid: id } = db.prepare('INSERT INTO staff_accounts(email, password_hash, created_at) VALUES (?, ?, ?)').run(bootstrapEmail, passwordHash, Date.now());
    staff = { id };
  }
  db.prepare("INSERT OR IGNORE INTO tenant_staff_memberships(tenant_id, staff_id, role, status, created_at) VALUES ('sandbox', ?, 'operator_admin', 'active', ?)").run(staff.id, Date.now());
}
const platformAdminToken = platformAdminTokenValue;
const platformAdminEnabled = typeof platformAdminToken === 'string' && platformAdminToken.length >= 32;
const secureCookie = process.env.SECURE_COOKIES === '1' ? '; Secure' : '';
const authAttempts = new Map();
let authRequestCount = 0;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const matches = (a, b) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const balance = (id, tenantId) => db.prepare('SELECT coalesce(sum(amount), 0) AS total FROM ledger WHERE player = ? AND tenant_id = ?').get(id, tenantId).total;
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function encodeBase32(bytes) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += base32Alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += base32Alphabet[(value << (5 - bits)) & 31];
  return output;
}
function decodeBase32(value) {
  let bits = 0;
  let current = 0;
  const bytes = [];
  for (const char of value.replace(/=+$/g, '').toUpperCase()) {
    const digit = base32Alphabet.indexOf(char);
    if (digit < 0) fail(400, 'staffMfaInvalid');
    current = (current << 5) | digit;
    bits += 5;
    if (bits >= 8) { bytes.push((current >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}
function encryptStaffSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  cipher.setAAD(Buffer.from('northplay-staff-totp'));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}
function decryptStaffSecret(value) {
  const packed = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, packed.subarray(0, 12));
  decipher.setAAD(Buffer.from('northplay-staff-totp'));
  decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
}
function verifyTotp(secret, code, now = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const key = decodeBase32(secret);
  for (const step of [-1, 0, 1]) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000) + step));
    const digest = createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 15;
    const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    if (matches(String(number).padStart(6, '0'), code)) return true;
  }
  return false;
}

const staffRoles = ['operator_admin', 'operator_content', 'operator_provider', 'operator_support'];
const websiteRoles = ['operator_admin', 'operator_content'];
const catalogueRoles = ['operator_admin', 'operator_content', 'operator_provider'];
const supportRoles = ['operator_admin', 'operator_support'];

function staffPermissions(staff) {
  const isAdmin = staff.role === 'operator_admin';
  const publishWebsite = isAdmin || (staff.role === 'operator_content' && Boolean(staff.publishWebsite));
  const publishCatalogue = isAdmin || (catalogueRoles.includes(staff.role) && Boolean(staff.publishCatalogue));
  const managePlayerAccess = isAdmin || (staff.role === 'operator_support' && Boolean(staff.managePlayerAccess));
  return { publishWebsite, publishCatalogue, viewAudit: publishWebsite || publishCatalogue, managePlayerAccess };
}

function staffSession(staff, tenantId) {
  return {
    id: staff.id, email: staff.email, role: staff.role, mfaEnabled: Boolean(staff.mfa_enabled),
    brandId: tenantId, brandName: db.prepare('SELECT name FROM tenants WHERE id = ?').get(tenantId).name,
    permissions: staffPermissions(staff)
  };
}

function staffContext(req, tenantId, allowedRoles = ['operator_admin']) {
  const token = req.headers.cookie?.match(/(?:^|; )northplay_staff=([a-f0-9]{64})(?:;|$)/)?.[1];
  const staff = token && db.prepare(`SELECT a.id, a.email, a.mfa_enabled, m.role,
    m.publish_website AS publishWebsite, m.publish_catalogue AS publishCatalogue, m.manage_player_access AS managePlayerAccess FROM staff_sessions s
    JOIN staff_accounts a ON a.id = s.staff_id JOIN tenant_staff_memberships m ON m.staff_id = a.id AND m.tenant_id = s.tenant_id
    WHERE s.token = ? AND s.tenant_id = ? AND s.expires > ? AND m.status = 'active'`).get(hash(token), tenantId, Date.now());
  if (!staff) fail(401, 'staffAuth');
  if (!allowedRoles.includes(staff.role)) fail(403, 'staffForbidden');
  return staff;
}

function publishedTenantConfig(tenantId) {
  const row = db.prepare("SELECT version, config FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1").get(tenantId);
  return { version: row.version, config: { ...defaultBrandOptions, ...JSON.parse(row.config) } };
}

function catalogueAudience(tenantId, locale) {
  const row = db.prepare(`SELECT json_extract(config, '$.displayMarket') AS market, json_extract(config, '$.enabledLocales') AS locales,
    json_extract(config, '$.primaryLocale') AS primaryLocale FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1`).get(tenantId);
  const locales = row.locales ? JSON.parse(row.locales) : ['en-CA', 'fr-CA'];
  return { market: row.market || '', locales: locale ? [locales.includes(locale) ? locale : row.primaryLocale || locales[0]] : locales };
}

function comingSoonEnabled(tenantId) {
  const { enabled } = db.prepare(`SELECT coalesce(json_extract(config, '$.enabledSections.comingSoon'), 1) AS enabled
    FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1`).get(tenantId);
  return Boolean(enabled);
}

function validBrandOptions({ primaryLocale, enabledLocales, enabledSections, displayMarket, reportingTimeZone }) {
  if (!Array.isArray(enabledLocales) || !enabledLocales.includes(primaryLocale) ||
      new Set(enabledLocales).size !== enabledLocales.length || !enabledLocales.every((locale) => ['en-CA', 'fr-CA'].includes(locale)) ||
      !enabledSections || Object.keys(enabledSections).sort().join(',') !== 'comingSoon,faq' ||
      typeof enabledSections.comingSoon !== 'boolean' || typeof enabledSections.faq !== 'boolean' ||
      typeof displayMarket !== 'string' || (displayMarket && !/^[A-Z]{2}(?:-[A-Z0-9]{1,3})?$/.test(displayMarket)) ||
      typeof reportingTimeZone !== 'string' || reportingTimeZone.length > 64 || !/^[a-zA-Z0-9_+/-]+$/.test(reportingTimeZone) ||
      /^[+-]/.test(reportingTimeZone)) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: reportingTimeZone });
    return true;
  } catch {
    return false;
  }
}

function resolveTenant(req) {
  const rawHost = req.headers.host;
  if (typeof rawHost !== 'string') fail(421, 'tenantUnknown');
  let host;
  try {
    host = new URL(`http://${rawHost}`).hostname.toLowerCase();
  } catch {
    fail(421, 'tenantUnknown');
  }
  const tenant = db.prepare(`SELECT tenants.id FROM tenant_domains
    JOIN tenants ON tenants.id = tenant_domains.tenant_id
    WHERE tenant_domains.host = ? AND tenant_domains.verified = 1 AND tenants.status = 'active'`).get(host);
  if (!tenant) fail(421, 'tenantUnknown');
  if (!db.prepare("SELECT 1 FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published'").get(tenant.id)) {
    const initial = { ...defaultTenantConfig, brandName: db.prepare('SELECT name FROM tenants WHERE id = ?').get(tenant.id).name };
    const version = db.prepare('SELECT coalesce(max(version), 0) + 1 AS version FROM tenant_config_versions WHERE tenant_id = ?').get(tenant.id).version;
    db.prepare("INSERT INTO tenant_config_versions(tenant_id, version, config, status, created_at) VALUES (?, ?, ?, 'published', ?)").run(tenant.id, version, JSON.stringify(initial), Date.now());
  }
  return tenant.id;
}

function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function attachSupportMessages(tickets, tenantId, includeStaffAuthor = false) {
  if (!tickets.length) return tickets.map((ticket) => ({ ...ticket, messages: [] }));
  const ticketIds = tickets.map((ticket) => ticket.id);
  const placeholders = ticketIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT m.ticket_id AS ticketId, m.author_type AS authorType, m.message, m.created_at AS createdAt, s.email AS staffAuthor FROM support_ticket_messages m LEFT JOIN staff_accounts s ON s.id = m.staff_id WHERE m.tenant_id = ? AND m.ticket_id IN (${placeholders}) ORDER BY m.id`).all(tenantId, ...ticketIds);
  const byTicket = new Map();
  for (const row of rows) {
    if (!byTicket.has(row.ticketId)) byTicket.set(row.ticketId, []);
    byTicket.get(row.ticketId).push({ authorType: row.authorType, message: row.message, createdAt: row.createdAt, ...(includeStaffAuthor && row.staffAuthor ? { author: row.staffAuthor } : {}) });
  }
  return tickets.map((ticket) => ({ ...ticket, messages: byTicket.get(ticket.id) || [] }));
}

function fail(status, code) {
  throw Object.assign(new Error(code), { status });
}

function validateCatalogGames(importedGames) {
  if (!Array.isArray(importedGames) || importedGames.length < 1 || importedGames.length > 500) fail(400, 'invalid');
  const externalIds = new Set();
  for (const game of importedGames) {
    if (!game || typeof game.externalId !== 'string' || !/^[\w.-]{1,128}$/.test(game.externalId) ||
        externalIds.has(game.externalId) || typeof game.titleEn !== 'string' || !game.titleEn.trim() || game.titleEn.length > 120 ||
        typeof game.titleFr !== 'string' || !game.titleFr.trim() || game.titleFr.length > 120 ||
        !['slots', 'table', 'live'].includes(game.category)) fail(400, 'invalid');
    externalIds.add(game.externalId);
  }
  return externalIds;
}

function providerCatalogSnapshot(providerId, tenantId) {
  const rows = db.prepare('SELECT external_id, title_en, title_fr, category, enabled FROM game_catalog WHERE provider_id = ? AND tenant_id = ? ORDER BY external_id').all(providerId, tenantId);
  const revision = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return { rows, revision };
}

function limitAuthAttempts(req, route) {
  const now = Date.now();
  const key = `${route}:${req.socket.remoteAddress || 'unknown'}`;
  const bucket = authAttempts.get(key);
  if (bucket && bucket.resetAt > now && bucket.count >= 12) fail(429, 'rateLimited');
  if (!bucket || bucket.resetAt <= now) authAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else bucket.count += 1;
  authRequestCount += 1;
  if (authRequestCount % 256 === 0) {
    for (const [attemptKey, attempt] of authAttempts) {
      if (attempt.resetAt <= now) authAttempts.delete(attemptKey);
    }
    while (authAttempts.size > 10000) authAttempts.delete(authAttempts.keys().next().value);
  }
}

async function deliverTransactionalEmail(to, subject, text, deliveryId) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resetEmailApiKey}`, 'Content-Type': 'application/json',
      ...(deliveryId && { 'Idempotency-Key': deliveryId }) },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({ from: resetEmailFrom, to: [to], subject, text })
  });
  if (!response.ok) throw new Error('Transactional email delivery failed');
}

function localRecoveryPreview(req) {
  const loopback = ['127.0.0.1', 'localhost', '::1', '[::1]'];
  return appEnvironment === 'development' && !secureCookie && !resetEmailApiKey && loopback.includes(host) &&
    (loopback.includes(req.socket.remoteAddress) || req.socket.remoteAddress === '::ffff:127.0.0.1') &&
    loopback.includes(new URL('http://' + req.headers.host).hostname);
}

function requireEmailDelivery(req) {
  if (!resetEmailApiKey && !localRecoveryPreview(req)) fail(503, 'recoveryDeliveryUnavailable');
}

function playerLinkBase(req, tenantId) {
  if (publicSite && db.prepare('SELECT 1 FROM tenant_domains WHERE tenant_id = ? AND host = ? AND verified = 1').get(tenantId, publicSite.hostname)) return publicBaseUrl;
  if (localRecoveryPreview(req)) return `http://${req.headers.host}${appBasePath}`;
  const verifiedHost = new URL('http://' + req.headers.host).hostname;
  return `https://${verifiedHost}${appBasePath}`;
}

async function sendPasswordReset(req, tenantId, email, locale, rawToken, deliveryId) {
  const url = `${playerLinkBase(req, tenantId)}/?reset=${rawToken}&lang=${locale === 'fr-CA' ? 'fr' : 'en'}`;
  if (resetEmailApiKey) {
    const french = locale === 'fr-CA';
    await deliverTransactionalEmail(email, french ? 'Réinitialisation de votre mot de passe' : 'Reset your password',
      french ? `Utilisez ce lien dans les 30 prochaines minutes pour réinitialiser votre mot de passe. ${url}`
        : `Use this link within 30 minutes to reset your password. ${url}`, deliveryId);
    return;
  }
  requireEmailDelivery(req);
  return url;
}

async function issuePlayerEmailVerification(req, playerId, tenantId, email, locale) {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  transaction(() => {
    db.prepare('DELETE FROM player_email_verifications WHERE player_id = ? AND tenant_id = ?').run(playerId, tenantId);
    db.prepare('DELETE FROM player_email_verifications WHERE expires <= ?').run(now);
    db.prepare('INSERT INTO player_email_verifications(token_hash, tenant_id, player_id, expires, created_at) VALUES (?, ?, ?, ?, ?)').run(hash(token), tenantId, playerId, now + 24 * 60 * 60 * 1000, now);
  });
  const verifyUrl = `${playerLinkBase(req, tenantId)}/?verify=${token}&lang=${locale === 'fr-CA' ? 'fr' : 'en'}`;
  if (resetEmailApiKey) {
    const french = locale === 'fr-CA';
    try {
      await deliverTransactionalEmail(email,
        french ? 'Confirmez votre adresse courriel' : 'Verify your email address',
        french ? `Utilisez ce lien dans les prochaines 24 heures pour confirmer votre adresse courriel : ${verifyUrl}` : `Use this link within 24 hours to verify your email address: ${verifyUrl}`);
    } catch {
      db.prepare('DELETE FROM player_email_verifications WHERE token_hash = ?').run(hash(token));
      fail(503, 'unavailable');
    }
  } else if (localRecoveryPreview(req)) {
    console.info(`Development email verification link for player ${playerId}: ${verifyUrl}`);
  }
  return localRecoveryPreview(req) ? verifyUrl : undefined;
}

async function body(req, maxBytes = 8192) {
  let result = '';
  for await (const chunk of req) {
    result += chunk;
    if (Buffer.byteLength(result) > maxBytes) fail(413, 'invalid');
  }
  req.assertPlayerSession?.();
  try {
    const value = JSON.parse(result);
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'invalid');
    return value;
  } catch {
    fail(400, 'invalid');
  }
}

function dailyWagered(id, tenantId, today = new Date().toISOString().slice(0, 10)) {
  return db.prepare("SELECT coalesce(sum(wager), 0) AS total FROM ledger WHERE player = ? AND tenant_id = ? AND game IS NOT NULL AND date(created_at / 1000, 'unixepoch') = ?").get(id, tenantId, today).total;
}

function validBrandLogo(dataUri) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 48 * 1024 || bytes.toString('base64') !== match[2]) return false;
  if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (match[1] === 'jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

function validBrandFavicon(dataUri) {
  const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 16 * 1024 || bytes.toString('base64') !== match[2]) return false;
  if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}

function validPolicyUrl(value) {
  if (!value) return true;
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function availableFavorites(tenantId, locale) {
  const available = new Set(games.map(({ id }) => `demo:${id}`));
  for (const { provider, externalId } of db.prepare('SELECT provider, external_id AS externalId FROM game_catalog WHERE tenant_id = ? AND enabled = 1').all(tenantId)) {
    available.add(`provider:${provider}:${externalId}`);
  }
  if (comingSoonEnabled(tenantId)) {
    for (const key of comingSoon.keys(tenantId, catalogueAudience(tenantId, locale))) available.add(key);
  }
  return available;
}

function accountFavorites(playerId, tenantId) {
  const available = availableFavorites(tenantId);
  return db.prepare('SELECT favorite_key AS key FROM player_favorites WHERE player_id = ? AND tenant_id = ? ORDER BY created_at, favorite_key')
    .all(playerId, tenantId).map(({ key }) => key).filter((key) => available.has(key));
}

function account(id, tenantId) {
  const profile = db.prepare('SELECT display_name AS displayName, preferred_locale AS preferredLocale FROM player_profiles WHERE player_id = ? AND tenant_id = ?').get(id, tenantId);
  const safety = db.prepare('SELECT pause_until, excluded_at, daily_limit_cents, cooling_off_until, session_reminder_minutes FROM player_safety WHERE player = ?').get(id) || {};
  const marketingConsent = db.prepare("SELECT granted FROM player_consent_events WHERE player_id = ? AND tenant_id = ? AND consent_type = 'marketing_email' ORDER BY id DESC LIMIT 1").get(id, tenantId);
  const supportReplies = db.prepare("SELECT count(*) AS count FROM support_tickets t WHERE t.player_id = ? AND t.tenant_id = ? AND coalesce((SELECT max(m.created_at) FROM support_ticket_messages m WHERE m.tenant_id = t.tenant_id AND m.ticket_id = t.id AND m.author_type = 'staff'), 0) > coalesce(t.player_seen_at, 0) AND t.id IN (SELECT id FROM support_tickets WHERE player_id = ? AND tenant_id = ? ORDER BY updated_at DESC, id DESC LIMIT 50)").get(id, tenantId, id, tenantId).count;
  const historyRows = db.prepare('SELECT id, game, wager, amount, outcome, created_at AS createdAt FROM ledger WHERE player = ? AND tenant_id = ? ORDER BY id DESC LIMIT 21').all(id, tenantId);
  const favorites = accountFavorites(id, tenantId);
  const hasMoreHistory = historyRows.length > 20;
  if (hasMoreHistory) historyRows.pop();
  return {
    ...db.prepare('SELECT id, email, email_verified AS emailVerified, access_status AS status FROM players WHERE id = ? AND tenant_id = ?').get(id, tenantId),
    displayName: profile?.displayName || '',
    preferredLocale: profile?.preferredLocale || 'en-CA',
    balance: balance(id, tenantId),
    history: historyRows,
    historyNextCursor: hasMoreHistory ? historyRows.at(-1).id : null,
    favorites,
    safety: { pausedUntil: safety.pause_until || null, coolingOffUntil: safety.cooling_off_until || null, excluded: Boolean(safety.excluded_at), dailyLimit: safety.daily_limit_cents ?? 2500, dailyWagered: dailyWagered(id, tenantId), sessionReminderMinutes: safety.session_reminder_minutes ?? 60 },
    marketingEmailConsent: Boolean(marketingConsent?.granted),
    supportReplies
  };
}

async function api(req, res, path, tenantId, requestId) {
  const cookie = req.headers.cookie?.match(/(?:^|; )northplay=([a-f0-9]{64})(?:;|$)/)?.[1];
  const activeSession = () => cookie && db.prepare(`SELECT s.player FROM sessions s
    JOIN players p ON p.id = s.player AND p.tenant_id = s.tenant_id AND p.access_status = 'active'
    WHERE s.token = ? AND s.tenant_id = ? AND s.expires > ?`).get(hash(cookie), tenantId, Date.now())?.player;
  const player = activeSession();
  if (player && req.method !== 'GET' && /^\/api\/(?:account\/|support(?:\/|$)|safety\/|play$)/.test(path)) {
    req.assertPlayerSession = () => { if (activeSession() !== player) fail(401, 'signin'); };
  }
  const staffCookie = req.headers.cookie?.match(/(?:^|; )northplay_staff=([a-f0-9]{64})(?:;|$)/)?.[1];
  const route = `${req.method} ${path}`;
  const auditedChange = (roles, input, work, permission) => staffAudit.change(tenantId, requestId, route, input, () => {
    const staff = staffContext(req, tenantId, roles);
    if (!adminEnabled) fail(503, 'adminDisabled');
    if (permission && !staffPermissions(staff)[permission]) fail(403, 'staffForbidden');
    return staff;
  }, work);
  if (req.method !== 'GET' && req.headers['content-type'] !== 'application/json') fail(415, 'invalid');
  const catalogueLocale = new URL(req.url, 'http://localhost').searchParams.get('locale');
  if (route === 'GET /api/coming-soon') {
    if (!comingSoonEnabled(tenantId)) return { titles: [], featured: [], discover: [] };
    const seed = req.headers.cookie?.match(/(?:^|;\s*)northplay_visit=([a-f0-9]{32})(?:;|$)/)?.[1] || randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', `northplay_visit=${seed}; Path=${cookiePath}; HttpOnly; SameSite=Lax; Max-Age=1800${secureCookie}`);
    return comingSoon.lobby(tenantId, seed, catalogueAudience(tenantId, catalogueLocale || 'default'));
  }
  const preview = route.match(/^GET \/api\/coming-soon\/([a-z0-9-]{1,64})$/);
  if (preview) {
    const title = comingSoonEnabled(tenantId) && comingSoon.published(tenantId, preview[1], catalogueAudience(tenantId, catalogueLocale || 'default'));
    if (!title) fail(404, 'comingSoonMissing');
    return title;
  }
  const draftPreview = route.match(/^GET \/api\/admin\/coming-soon\/preview\/([a-z0-9-]{1,64})$/);
  if (draftPreview) {
    staffContext(req, tenantId, catalogueRoles);
    return comingSoon.draft(tenantId, draftPreview[1]);
  }
  if (route === 'GET /api/admin/coming-soon') {
    staffContext(req, tenantId, catalogueRoles);
    return comingSoon.drafts(tenantId);
  }
  if (route === 'POST /api/admin/coming-soon') {
    staffContext(req, tenantId, catalogueRoles);
    const input = await body(req, 96 * 1024);
    const permission = ['publish', 'archive'].includes(input?.action) ? 'publishCatalogue' : undefined;
    return auditedChange(catalogueRoles, input, (staff) => comingSoon.mutate(tenantId, staff.id, requestId, input), permission);
  }
  if (route === 'GET /api/admin/coming-soon/saves') {
    staffContext(req, tenantId, supportRoles);
    const query = new URL(req.url, 'http://localhost').searchParams.get('q')?.trim().toLowerCase() || '';
    if (query.length > 254) fail(400, 'invalid');
    return comingSoon.saves(tenantId, query);
  }
  if (route === 'GET /api/admin/players') {
    staffContext(req, tenantId, supportRoles);
    const query = new URL(req.url, 'http://localhost').searchParams.get('q')?.trim().toLowerCase() || '';
    return playerAccess.search(tenantId, query);
  }
  const playerRoute = path.match(/^\/api\/admin\/players\/([1-9]\d*)(?:\/(access|recovery))?$/);
  if (playerRoute) {
    const staff = staffContext(req, tenantId, supportRoles);
    const id = Number(playerRoute[1]);
    if (!Number.isSafeInteger(id)) fail(400, 'invalid');
    if (req.method === 'GET' && !playerRoute[2]) return playerAccess.detail(tenantId, id);
    if (req.method !== 'POST' || !playerRoute[2]) fail(404, 'invalid');
    const input = await body(req);
    if (playerRoute[2] === 'access') return auditedChange(supportRoles, input, (actor) =>
      playerAccess.changeStatus(tenantId, actor.id, requestId, id, input), 'managePlayerAccess');
    if (!adminEnabled) fail(503, 'adminDisabled');
    requireEmailDelivery(req);
    limitAuthAttempts(req, 'player-recovery/' + tenantId + '/' + staff.id);
    if (Object.keys(input).length) fail(400, 'invalid');
    const rawToken = createHmac('sha256', encryptionKey).update(JSON.stringify(['staff-recovery', tenantId, staff.id, id, requestId])).digest('hex');
    const tokenHash = hash(rawToken);
    const result = auditedChange(supportRoles, input, (actor) => {
      const target = playerAccess.newReset(tenantId, id, tokenHash);
      const auditId = staffAudit.record(tenantId, actor.id, 'player_recovery_requested', 'player-' + id, requestId, { recordId: id });
      db.prepare('INSERT INTO player_recovery_deliveries(audit_id, locale) VALUES (?, ?)').run(auditId, target.locale || 'en-CA');
      return { id, auditId };
    });
    const dispatch = db.prepare('SELECT delivery, locale FROM player_recovery_deliveries WHERE audit_id = ?').get(result.auditId);
    if (dispatch.delivery !== 'pending') return { ...result, delivery: dispatch.delivery };
    const target = db.prepare(`SELECT p.email FROM player_password_resets r JOIN players p ON p.id = r.player_id AND p.tenant_id = r.tenant_id
      WHERE r.token_hash = ? AND r.player_id = ? AND r.tenant_id = ? AND r.expires > ? AND p.access_status = 'active'`).get(tokenHash, id, tenantId, Date.now());
    if (!target) return { ...result, delivery: 'expired' };
    try {
      const localUrl = await sendPasswordReset(req, tenantId, target.email, dispatch.locale, rawToken, 'player-reset/' + tokenHash.slice(0, 32));
      const delivery = localUrl ? 'local' : 'sent';
      const saved = db.prepare("UPDATE player_recovery_deliveries SET delivery = ? WHERE audit_id = ? AND delivery = 'pending'").run(delivery, result.auditId);
      if (localUrl && saved.changes) console.info(`Development player recovery link: ${localUrl}`);
      return { ...result, delivery };
    } catch { fail(503, 'recoveryDeliveryUnavailable'); }
  }
  if (route === 'POST /api/admin/login') {
    if (!adminEnabled) fail(503, 'adminDisabled');
    limitAuthAttempts(req, route);
    const { email, password, code } = await body(req);
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128) fail(401, 'staffCredentials');
    const staff = db.prepare('SELECT id, password_hash, mfa_enabled, mfa_secret FROM staff_accounts WHERE email = ?').get(email.trim().toLowerCase());
    const salt = staff?.password_hash.split(':')[0] || '00000000000000000000000000000000';
    const candidate = `${salt}:${scryptSync(password.slice(0, 128), salt, 64).toString('hex')}`;
    if (!staff || !matches(candidate, staff.password_hash) || (staff.mfa_enabled && (!staff.mfa_secret || !verifyTotp(decryptStaffSecret(staff.mfa_secret), code)))) fail(401, 'staffCredentials');
    const membership = db.prepare("SELECT role, publish_website AS publishWebsite, publish_catalogue AS publishCatalogue, manage_player_access AS managePlayerAccess FROM tenant_staff_memberships WHERE staff_id = ? AND tenant_id = ? AND status = 'active'").get(staff.id, tenantId);
    if (!membership) fail(403, 'staffForbidden');
    const token = randomBytes(32).toString('hex');
    transaction(() => {
      db.prepare('INSERT INTO staff_sessions(token, tenant_id, staff_id, expires, created_at) VALUES (?, ?, ?, ?, ?)').run(hash(token), tenantId, staff.id, Date.now() + 8 * 60 * 60 * 1000, Date.now());
      staffAudit.record(tenantId, staff.id, 'staff_login', 'session', requestId);
    });
    res.setHeader('Set-Cookie', `northplay_staff=${token}; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=28800${secureCookie}`);
    return staffSession({ ...staff, email: email.trim().toLowerCase(), ...membership }, tenantId);
  }
  if (route === 'GET /api/admin/session') {
    return staffSession(staffContext(req, tenantId, staffRoles), tenantId);
  }
  if (route === 'GET /api/admin/overview') {
    staffContext(req, tenantId, ['operator_admin', 'operator_content', 'operator_provider', 'operator_support']);
    const periodValue = new URL(req.url, 'http://localhost').searchParams.get('days') || '30';
    if (!['7', '30', '90'].includes(periodValue)) fail(400, 'invalid');
    const periodDays = Number(periodValue);
    const dayMilliseconds = 24 * 60 * 60 * 1000;
    const since = Math.floor(Date.now() / dayMilliseconds) * dayMilliseconds - (periodDays - 1) * dayMilliseconds;
    const players = db.prepare('SELECT count(*) AS total, coalesce(sum(email_verified), 0) AS verified FROM players WHERE tenant_id = ?').get(tenantId);
    const showcaseDataLoaded = Boolean(db.prepare("SELECT 1 FROM players WHERE tenant_id = ? AND email LIKE 'northplay-showcase-%@example.invalid' LIMIT 1").get(tenantId));
    const gameplay = db.prepare('SELECT count(*) AS rounds, count(DISTINCT player) AS active_players, coalesce(sum(wager), 0) AS wagered_cents FROM ledger WHERE tenant_id = ? AND game IS NOT NULL AND created_at >= ?').get(tenantId, since);
    const demoRoundsByGame = db.prepare('SELECT game, count(*) AS rounds, count(DISTINCT player) AS active_players, coalesce(sum(wager), 0) AS wagered_cents FROM ledger WHERE tenant_id = ? AND game IS NOT NULL AND created_at >= ? GROUP BY game ORDER BY rounds DESC, game').all(tenantId, since);
    const dailyRounds = new Map(db.prepare("SELECT date(created_at / 1000, 'unixepoch') AS day, count(*) AS rounds FROM ledger WHERE tenant_id = ? AND game IS NOT NULL AND created_at >= ? GROUP BY day").all(tenantId, since).map(({ day, rounds }) => [day, rounds]));
    const demoRoundsByDay = Array.from({ length: periodDays }, (_, index) => {
      const day = new Date(since + index * dayMilliseconds).toISOString().slice(0, 10);
      return { day, rounds: dailyRounds.get(day) || 0 };
    });
    const support = db.prepare("SELECT count(*) AS open FROM support_tickets WHERE tenant_id = ? AND status = 'open'").get(tenantId);
    const catalog = db.prepare('SELECT count(*) AS enabled FROM game_catalog WHERE tenant_id = ? AND enabled = 1').get(tenantId);
    const publishedConfig = db.prepare("SELECT version, config FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1").get(tenantId);
    const draftConfig = db.prepare("SELECT config FROM tenant_config_versions WHERE tenant_id = ? AND status = 'draft' ORDER BY version DESC LIMIT 1").get(tenantId);
    return {
      playerAccounts: players.total,
      verifiedAccounts: players.verified,
      showcaseDataLoaded,
      periodDays,
      demoRoundsInPeriod: gameplay.rounds,
      activeDemoPlayersInPeriod: gameplay.active_players,
      simulatedWagersCentsInPeriod: gameplay.wagered_cents,
      demoRoundsByDay,
      demoRoundsByGame,
      openSupportTickets: support.open,
      enabledCatalogListings: catalog.enabled,
      ...comingSoon.counts(tenantId),
      publishedConfigVersion: publishedConfig?.version ?? 0,
      configNeedsPublish: Boolean(draftConfig && draftConfig.config !== publishedConfig?.config),
      generatedAt: Date.now()
    };
  }
  if (route === 'POST /api/admin/password') {
    const staff = staffContext(req, tenantId, ['operator_admin', 'operator_content', 'operator_provider', 'operator_support']);
    limitAuthAttempts(req, route);
    const { currentPassword, newPassword } = await body(req);
    if (typeof currentPassword !== 'string' || currentPassword.length > 128 || typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) fail(400, 'invalid');
    const row = db.prepare('SELECT password_hash FROM staff_accounts WHERE id = ?').get(staff.id);
    const salt = row.password_hash.split(':')[0];
    const candidate = `${salt}:${scryptSync(currentPassword.slice(0, 128), salt, 64).toString('hex')}`;
    if (!matches(candidate, row.password_hash)) fail(401, 'staffCredentials');
    const newSalt = randomBytes(16).toString('hex');
    const passwordHash = `${newSalt}:${scryptSync(newPassword, newSalt, 64).toString('hex')}`;
    const currentSessionToken = hash(staffCookie);
    const revokedSessions = db.prepare('SELECT count(*) AS total FROM staff_sessions WHERE staff_id = ? AND token <> ? AND expires > ?').get(staff.id, currentSessionToken, Date.now()).total;
    transaction(() => {
      db.prepare('UPDATE staff_accounts SET password_hash = ? WHERE id = ?').run(passwordHash, staff.id);
      db.prepare('DELETE FROM staff_sessions WHERE staff_id = ? AND token <> ?').run(staff.id, currentSessionToken);
      staffAudit.record(tenantId, staff.id, 'staff_password_changed', staff.email, requestId, { recordId: staff.id, fields: ['password'] });
    });
    return { changed: true, revokedSessions };
  }
  if (route === 'POST /api/admin/logout') {
    if (staffCookie) transaction(() => {
      const staff = db.prepare('SELECT staff_id FROM staff_sessions WHERE token = ? AND tenant_id = ?').get(hash(staffCookie), tenantId);
      if (staff) staffAudit.record(tenantId, staff.staff_id, 'staff_logout', 'session', requestId);
      db.prepare('DELETE FROM staff_sessions WHERE token = ? AND tenant_id = ?').run(hash(staffCookie), tenantId);
    });
    res.setHeader('Set-Cookie', `northplay_staff=; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);
    return null;
  }
  if (['POST /api/admin/mfa/setup', 'POST /api/admin/mfa/enable', 'POST /api/admin/mfa/disable'].includes(route)) {
    limitAuthAttempts(req, route);
    const staff = staffContext(req, tenantId, ['operator_admin', 'operator_content', 'operator_provider', 'operator_support']);
    if (route === 'POST /api/admin/mfa/setup') {
      if (db.prepare('SELECT mfa_enabled FROM staff_accounts WHERE id = ?').get(staff.id).mfa_enabled) fail(409, 'staffMfaAlreadyEnabled');
      const secret = encodeBase32(randomBytes(20));
      transaction(() => {
        db.prepare('UPDATE staff_accounts SET mfa_secret = ? WHERE id = ?').run(encryptStaffSecret(secret), staff.id);
        staffAudit.record(tenantId, staff.id, 'staff_mfa_setup', staff.email, requestId, { recordId: staff.id, fields: ['mfa'] });
      });
      const publishedConfig = db.prepare("SELECT config FROM tenant_config_versions WHERE tenant_id = ? AND status = 'published' ORDER BY version DESC LIMIT 1").get(tenantId);
      const issuer = JSON.parse(publishedConfig.config).brandName || 'Northplay';
      const label = encodeURIComponent(`${issuer}:${staff.email}`);
      return { secret, issuer, account: staff.email, otpauth: `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30` };
    }
    const { code } = await body(req);
    const current = db.prepare('SELECT mfa_secret, mfa_enabled FROM staff_accounts WHERE id = ?').get(staff.id);
    if (!current.mfa_secret || !verifyTotp(decryptStaffSecret(current.mfa_secret), code)) fail(400, 'staffMfaInvalid');
    if (route === 'POST /api/admin/mfa/enable') {
      transaction(() => {
        db.prepare('UPDATE staff_accounts SET mfa_enabled = 1 WHERE id = ?').run(staff.id);
        staffAudit.record(tenantId, staff.id, 'staff_mfa_enabled', staff.email, requestId, { recordId: staff.id, fields: ['mfa'] });
      });
      return { enabled: true };
    }
    transaction(() => {
      db.prepare('UPDATE staff_accounts SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?').run(staff.id);
      staffAudit.record(tenantId, staff.id, 'staff_mfa_disabled', staff.email, requestId, { recordId: staff.id, fields: ['mfa'] });
    });
    return { enabled: false };
  }
  if (route === 'GET /api/admin/audit') {
    const actor = staffContext(req, tenantId, staffRoles);
    const permissions = staffPermissions(actor);
    if (!permissions.viewAudit) fail(403, 'staffForbidden');
    const beforeValue = new URL(req.url, 'http://localhost').searchParams.get('before');
    const before = beforeValue === null ? null : Number(beforeValue);
    if (before !== null && (!Number.isSafeInteger(before) || before < 1)) fail(400, 'invalid');
    return staffAudit.list(tenantId, {
      ...actor, publishWebsite: Number(permissions.publishWebsite), publishCatalogue: Number(permissions.publishCatalogue)
    }, before);
  }
  if (['GET /api/admin/staff', 'POST /api/admin/staff', 'POST /api/admin/staff/disable', 'POST /api/admin/staff/role'].includes(route)) {
    staffContext(req, tenantId);
    if (route === 'GET /api/admin/staff') return db.prepare(`SELECT a.email, a.mfa_enabled AS mfaEnabled, m.role, m.status,
      m.publish_website AS publishWebsite, m.publish_catalogue AS publishCatalogue, m.manage_player_access AS managePlayerAccess, m.created_at AS createdAt,
      (SELECT max(e.created_at) FROM staff_events e WHERE e.tenant_id = m.tenant_id AND e.actor_id = a.id) AS lastActivityAt
      FROM tenant_staff_memberships m JOIN staff_accounts a ON a.id = m.staff_id WHERE m.tenant_id = ? ORDER BY m.created_at`).all(tenantId)
      .map((member) => ({ ...member, ...staffPermissions(member) }));
    const input = await body(req);
    const { email, password, role, publishWebsite, publishCatalogue, managePlayerAccess, reason: reasonInput } = input ?? {};
    const disable = route === 'POST /api/admin/staff/disable';
    const changeRole = route === 'POST /api/admin/staff/role';
    if (typeof email !== 'string' || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        (!disable && !staffRoles.includes(role)) ||
        (publishWebsite !== undefined && (typeof publishWebsite !== 'boolean' || (publishWebsite && role !== 'operator_content'))) ||
        (publishCatalogue !== undefined && (typeof publishCatalogue !== 'boolean' || (publishCatalogue && !['operator_content', 'operator_provider'].includes(role)))) ||
        (managePlayerAccess !== undefined && (typeof managePlayerAccess !== 'boolean' || (managePlayerAccess && role !== 'operator_support'))) ||
        (reasonInput !== undefined && (typeof reasonInput !== 'string' || reasonInput.length > 240))) fail(400, 'invalid');
    const normalizedEmail = email.trim().toLowerCase();
    const reason = reasonInput?.trim();
    return auditedChange(['operator_admin'], input, (actor) => {
      let target = db.prepare('SELECT id FROM staff_accounts WHERE email = ?').get(normalizedEmail);
      const member = target && db.prepare(`SELECT role, status, publish_website AS publishWebsite, publish_catalogue AS publishCatalogue, manage_player_access AS managePlayerAccess
        FROM tenant_staff_memberships WHERE tenant_id = ? AND staff_id = ?`).get(tenantId, target.id);
      if (disable || changeRole) {
        if (member?.status !== 'active' || target.id === actor.id) fail(409, 'staffLifecycle');
        if (member.role === 'operator_admin' && (disable || role !== 'operator_admin') &&
            db.prepare("SELECT count(*) AS total FROM tenant_staff_memberships WHERE tenant_id = ? AND role = 'operator_admin' AND status = 'active'").get(tenantId).total <= 1) fail(409, 'staffLifecycle');
      } else if (member?.status === 'active') fail(409, 'staffExists');

      const keepGrants = member?.role === role;
      const next = disable ? { ...member, status: 'disabled' } : {
        role, status: 'active',
        publishWebsite: Number(publishWebsite ?? (keepGrants && member.publishWebsite)),
        publishCatalogue: Number(publishCatalogue ?? (keepGrants && member.publishCatalogue)),
        managePlayerAccess: Number(managePlayerAccess ?? (keepGrants && member.managePlayerAccess))
      };
      const fields = changedFields(member ?? {}, next);
      const result = { email: normalizedEmail, role: next.role, status: next.status, ...staffPermissions(next) };
      if (changeRole && !fields.length) return { ...result, changed: false };
      if ((disable || changeRole || member || next.publishWebsite || next.publishCatalogue || next.managePlayerAccess) && !reason) fail(400, 'staffReasonRequired');

      if (!target) {
        if (typeof password !== 'string' || password.length < 12 || password.length > 128) fail(400, 'invalid');
        const salt = randomBytes(16).toString('hex');
        const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
        const { lastInsertRowid: id } = db.prepare('INSERT INTO staff_accounts(email, password_hash, created_at) VALUES (?, ?, ?)').run(normalizedEmail, passwordHash, Date.now());
        target = { id };
      }
      db.prepare(`INSERT INTO tenant_staff_memberships(tenant_id, staff_id, role, status, created_at, publish_website, publish_catalogue, manage_player_access)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tenant_id, staff_id) DO UPDATE SET
          role = excluded.role, status = excluded.status, publish_website = excluded.publish_website,
          publish_catalogue = excluded.publish_catalogue, manage_player_access = excluded.manage_player_access`)
        .run(tenantId, target.id, next.role, next.status, Date.now(), next.publishWebsite, next.publishCatalogue, next.managePlayerAccess);
      if (disable) db.prepare('DELETE FROM staff_sessions WHERE tenant_id = ? AND staff_id = ?').run(tenantId, target.id);
      const action = disable ? 'staff_disabled' : changeRole ? 'staff_role_changed' : member ? 'staff_reenabled' : 'staff_created';
      const auditId = staffAudit.record(tenantId, actor.id, action, normalizedEmail, requestId, {
        recordId: target.id, fields, reason, previousStatus: member?.status ?? null, status: next.status,
        previousRole: member?.role ?? null, role: next.role
      });
      return changeRole ? { ...result, changed: true, auditId } : { ...result, auditId };
    });
  }
  if (route.startsWith('GET /api/platform/tenants') || route.startsWith('POST /api/platform/tenants') ||
      route.startsWith('POST /api/platform/domains') || route === 'GET /api/platform/audit') {
    if (!platformAdminEnabled) fail(503, 'platformAdminDisabled');
    if (!matches(req.headers.authorization || '', `Bearer ${platformAdminToken}`)) fail(401, 'platformAdminAuth');
    if (route === 'GET /api/platform/tenants') {
      return db.prepare(`SELECT t.id, t.slug, t.name, t.status, t.created_at AS createdAt,
        coalesce(json_group_array(json_object('host', d.host, 'verified', d.verified, 'verifiedAt', d.verified_at)) FILTER (WHERE d.host IS NOT NULL), '[]') AS domains
        FROM tenants t LEFT JOIN tenant_domains d ON d.tenant_id = t.id GROUP BY t.id ORDER BY t.created_at DESC`).all()
        .map((tenant) => ({ ...tenant, domains: JSON.parse(tenant.domains) }));
    }
    if (route === 'GET /api/platform/audit') {
      return db.prepare('SELECT tenant_id AS tenantId, action, target, created_at AS createdAt, correlation_id AS correlationId FROM platform_events ORDER BY id DESC LIMIT 200').all();
    }
    if (route === 'POST /api/platform/tenants') {
      const { slug, name } = await body(req);
      if (typeof slug !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug) ||
          typeof name !== 'string' || !name.trim() || name.trim().length > 64) fail(400, 'invalid');
      const id = randomUUID();
      try {
        transaction(() => {
          db.prepare("INSERT INTO tenants(id, slug, name, status, created_at) VALUES (?, ?, ?, 'pending', ?)").run(id, slug, name.trim(), Date.now());
          const config = { ...defaultTenantConfig, brandName: name.trim() };
          db.prepare("INSERT INTO tenant_config_versions(tenant_id, version, config, status, created_at) VALUES (?, 1, ?, 'published', ?)").run(id, JSON.stringify(config), Date.now());
          db.prepare("INSERT INTO platform_events(tenant_id, action, target, created_at, correlation_id) VALUES (?, 'tenant_created', ?, ?, ?)").run(id, slug, Date.now(), requestId);
        });
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) fail(409, 'tenantSlugTaken');
        throw error;
      }
      return { id, slug, name: name.trim(), status: 'pending' };
    }
    if (route === 'POST /api/platform/tenants/admin') {
      const { tenantId: requestedTenant, email, password } = await body(req);
      if (typeof requestedTenant !== 'string' || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, 'invalid');
      const tenant = db.prepare('SELECT status FROM tenants WHERE id = ?').get(requestedTenant);
      if (!tenant || tenant.status === 'closed') fail(404, 'tenantUnknown');
      if (db.prepare("SELECT 1 FROM tenant_staff_memberships WHERE tenant_id = ? AND role = 'operator_admin' AND status = 'active'").get(requestedTenant)) fail(409, 'tenantAdminExists');
      const normalizedEmail = email.trim().toLowerCase();
      let staff = db.prepare('SELECT id FROM staff_accounts WHERE email = ?').get(normalizedEmail);
      if (!staff) {
        if (typeof password !== 'string' || password.length < 12 || password.length > 128) fail(400, 'invalid');
        const salt = randomBytes(16).toString('hex');
        const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
        const { lastInsertRowid: id } = db.prepare('INSERT INTO staff_accounts(email, password_hash, created_at) VALUES (?, ?, ?)').run(normalizedEmail, passwordHash, Date.now());
        staff = { id };
      }
      db.prepare("INSERT INTO tenant_staff_memberships(tenant_id, staff_id, role, status, created_at) VALUES (?, ?, 'operator_admin', 'active', ?)").run(requestedTenant, staff.id, Date.now());
      db.prepare("INSERT INTO platform_events(tenant_id, action, target, created_at, correlation_id) VALUES (?, 'tenant_admin_assigned', ?, ?, ?)").run(requestedTenant, normalizedEmail, Date.now(), requestId);
      return { tenantId: requestedTenant, email: normalizedEmail, role: 'operator_admin' };
    }
    if (route === 'POST /api/platform/domains') {
      const { tenantId: requestedTenant, host } = await body(req);
      if (typeof requestedTenant !== 'string' || typeof host !== 'string') fail(400, 'invalid');
      let normalized;
      try { normalized = new URL(`http://${host}`).hostname.toLowerCase(); } catch { fail(400, 'invalid'); }
      if (normalized !== host.toLowerCase() || normalized.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized)) fail(400, 'invalid');
      const tenantState = db.prepare('SELECT status FROM tenants WHERE id = ?').get(requestedTenant);
      if (!tenantState) fail(404, 'tenantUnknown');
      if (tenantState.status === 'closed') fail(409, 'tenantLifecycle');
      const verificationToken = randomBytes(24).toString('hex');
      try {
        db.prepare('INSERT INTO tenant_domains(host, tenant_id, verified, verification_token, verified_at) VALUES (?, ?, 0, ?, NULL)').run(normalized, requestedTenant, verificationToken);
        db.prepare("INSERT INTO platform_events(tenant_id, action, target, created_at, correlation_id) VALUES (?, 'domain_challenge_issued', ?, ?, ?)").run(requestedTenant, normalized, Date.now(), requestId);
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) fail(409, 'domainInUse');
        throw error;
      }
      return { host: normalized, status: 'pending_verification', txtName: `_northplay-verification.${normalized}`, txtValue: verificationToken };
    }
    if (route === 'POST /api/platform/domains/verify') {
      const { host } = await body(req);
      if (typeof host !== 'string') fail(400, 'invalid');
      const normalized = host.toLowerCase();
      const domain = db.prepare('SELECT verification_token, verified FROM tenant_domains WHERE host = ?').get(normalized);
      if (!domain) fail(404, 'domainUnknown');
      if (domain.verified) return { host: normalized, status: 'verified' };
      let records = [];
      try { records = await resolveTxt(`_northplay-verification.${normalized}`); } catch { /* Missing DNS record means verification is pending. */ }
      if (!records.some((parts) => parts.join('') === domain.verification_token)) fail(409, 'domainNotVerified');
      db.prepare('UPDATE tenant_domains SET verified = 1, verified_at = ? WHERE host = ?').run(Date.now(), normalized);
      db.prepare("INSERT INTO platform_events(tenant_id, action, target, created_at, correlation_id) SELECT tenant_id, 'domain_verified', host, ?, ? FROM tenant_domains WHERE host = ?").run(Date.now(), requestId, normalized);
      return { host: normalized, status: 'verified' };
    }
    if (route === 'POST /api/platform/tenants/status') {
      const { tenantId: requestedTenant, status } = await body(req);
      if (typeof requestedTenant !== 'string' || !['active', 'suspended', 'closed'].includes(status)) fail(400, 'invalid');
      const current = db.prepare('SELECT status FROM tenants WHERE id = ?').get(requestedTenant);
      if (!current) fail(404, 'tenantUnknown');
      if (current.status === 'closed' || (status === 'active' && !db.prepare('SELECT 1 FROM tenant_domains WHERE tenant_id = ? AND verified = 1').get(requestedTenant))) fail(409, 'tenantLifecycle');
      if (status === 'closed' && current.status !== 'pending' && current.status !== 'suspended') fail(409, 'tenantLifecycle');
      db.prepare('UPDATE tenants SET status = ? WHERE id = ?').run(status, requestedTenant);
      db.prepare("INSERT INTO platform_events(tenant_id, action, target, created_at, correlation_id) VALUES (?, ?, ?, ?, ?)").run(requestedTenant, `tenant_${status}`, current.status, Date.now(), requestId);
      return { id: requestedTenant, status };
    }
    fail(404, 'invalid');
  }
  if (route === 'GET /api/tenant') {
    const published = publishedTenantConfig(tenantId);
    return { tenant: db.prepare('SELECT name FROM tenants WHERE id = ?').get(tenantId).name, ...published };
  }
  if (['GET /api/admin/config', 'POST /api/admin/config', 'POST /api/admin/config/publish'].includes(route)) {
    if (!adminEnabled) fail(503, 'adminDisabled');
    staffContext(req, tenantId, websiteRoles);
    const getDraft = () => db.prepare("SELECT version, config FROM tenant_config_versions WHERE tenant_id = ? AND status = 'draft' ORDER BY version DESC LIMIT 1").get(tenantId);
    if (route === 'GET /api/admin/config') {
      const draft = getDraft();
      return draft
        ? { version: draft.version, config: { ...defaultBrandOptions, ...JSON.parse(draft.config) }, status: 'draft' }
        : { ...publishedTenantConfig(tenantId), status: 'published' };
    }
    const input = await body(req, 96 * 1024);
    const { version: expectedVersion, config: proposed } = input ?? {};
    if (expectedVersion !== undefined && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)) fail(400, 'invalid');
    const publish = route.endsWith('/publish');
    return auditedChange(websiteRoles, input, (staff) => {
      const draft = getDraft();
      const published = publishedTenantConfig(tenantId);
      const currentVersion = draft?.version ?? published.version;
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) fail(409, 'configConflict');
      if (publish) {
        if (!draft) fail(409, 'configDraftMissing');
        const config = { ...defaultBrandOptions, ...JSON.parse(draft.config) };
        db.prepare("UPDATE tenant_config_versions SET status = 'published' WHERE tenant_id = ? AND version = ?").run(tenantId, draft.version);
        db.prepare('UPDATE tenants SET name = ? WHERE id = ?').run(config.brandName, tenantId);
        const auditId = staffAudit.record(tenantId, staff.id, 'tenant_config_published', String(draft.version), requestId, {
          recordId: tenantId, revision: draft.version, fields: changedFields(published.config, config), previousStatus: 'draft', status: 'published'
        });
        return { version: draft.version, status: 'published', auditId };
      }
      if (!proposed || typeof proposed !== 'object' || Array.isArray(proposed)) fail(400, 'invalid');
      const previous = draft ? { ...defaultBrandOptions, ...JSON.parse(draft.config) } : published.config;
      const config = {
        enabledSections: previous.enabledSections, displayMarket: previous.displayMarket,
        reportingTimeZone: previous.reportingTimeZone, ...proposed
      };
      const keys = Object.keys(defaultTenantConfig);
      if (Object.keys(config).length !== keys.length || !keys.every((key) => Object.hasOwn(config, key)) ||
          !validBrandOptions(config) ||
          typeof config.brandName !== 'string' || !config.brandName.trim() || config.brandName.length > 48 ||
          typeof config.brandLogo !== 'string' || (config.brandLogo !== '' && !validBrandLogo(config.brandLogo)) ||
          typeof config.brandFavicon !== 'string' || (config.brandFavicon !== '' && !validBrandFavicon(config.brandFavicon)) ||
          typeof config.accentColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(config.accentColor) ||
          typeof config.supportEmail !== 'string' || config.supportEmail.length > 254 || (config.supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.supportEmail)) ||
          typeof config.heroTitleEn !== 'string' || !config.heroTitleEn.trim() || config.heroTitleEn.length > 120 ||
          typeof config.heroTitleFr !== 'string' || !config.heroTitleFr.trim() || config.heroTitleFr.length > 120 ||
          typeof config.heroIntroEn !== 'string' || !config.heroIntroEn.trim() || config.heroIntroEn.length > 300 ||
          typeof config.heroIntroFr !== 'string' || !config.heroIntroFr.trim() || config.heroIntroFr.length > 300 ||
          typeof config.announcementEn !== 'string' || config.announcementEn.length > 140 ||
          typeof config.announcementFr !== 'string' || config.announcementFr.length > 140 ||
          !Array.isArray(config.faqItems) || config.faqItems.length !== 3 || config.faqItems.some((item) =>
            !item || Object.keys(item).sort().join(',') !== 'answerEn,answerFr,questionEn,questionFr' ||
            typeof item.questionEn !== 'string' || !item.questionEn.trim() || item.questionEn.length > 140 ||
            typeof item.questionFr !== 'string' || !item.questionFr.trim() || item.questionFr.length > 140 ||
            typeof item.answerEn !== 'string' || !item.answerEn.trim() || item.answerEn.length > 500 ||
            typeof item.answerFr !== 'string' || !item.answerFr.trim() || item.answerFr.length > 500) ||
          !Array.isArray(config.featuredGameIds) || config.featuredGameIds.length > 3 || new Set(config.featuredGameIds).size !== config.featuredGameIds.length ||
          config.featuredGameIds.some((id) => typeof id !== 'string' || !games.some((game) => game.id === id)) ||
          !['privacyUrlEn', 'privacyUrlFr', 'termsUrlEn', 'termsUrlFr'].every((key) => typeof config[key] === 'string' && validPolicyUrl(config[key])) ||
          typeof config.footerTextEn !== 'string' || !config.footerTextEn.trim() || config.footerTextEn.length > 160 ||
          typeof config.footerTextFr !== 'string' || !config.footerTextFr.trim() || config.footerTextFr.length > 160) fail(400, 'invalid');
      config.enabledLocales = ['en-CA', 'fr-CA'].filter((locale) => config.enabledLocales.includes(locale));
      config.enabledSections = { comingSoon: config.enabledSections.comingSoon, faq: config.enabledSections.faq };
      const fields = changedFields(previous, config);
      if (!fields.length) return { version: currentVersion, status: draft ? 'draft' : 'published', auditId: null };
      const version = db.prepare('SELECT coalesce(max(version), 0) + 1 AS version FROM tenant_config_versions WHERE tenant_id = ?').get(tenantId).version;
      if (draft) db.prepare('DELETE FROM tenant_config_versions WHERE tenant_id = ? AND version = ?').run(tenantId, draft.version);
      db.prepare("INSERT INTO tenant_config_versions(tenant_id, version, config, status, created_at) VALUES (?, ?, ?, 'draft', ?)").run(tenantId, version, JSON.stringify(config), Date.now());
      const auditId = staffAudit.record(tenantId, staff.id, 'tenant_config_saved', String(version), requestId, {
        recordId: tenantId, revision: version, fields, previousStatus: draft ? 'draft' : 'published', status: 'draft'
      });
      return { version, status: 'draft', auditId };
    }, publish ? 'publishWebsite' : undefined);
  }
  if (route === 'GET /api/account') {
    if (!player) return null;
    const session = db.prepare('SELECT created_at AS sessionStartedAt FROM sessions WHERE token = ? AND tenant_id = ?').get(hash(cookie), tenantId);
    return { ...account(player, tenantId), sessionStartedAt: session.sessionStartedAt };
  }
  if (route === 'POST /api/account/demo-balance/reset') {
    if (!player) fail(401, 'signin');
    return transaction(() => {
      const targetBalance = 10000;
      const currentBalance = balance(player, tenantId);
      const delta = targetBalance - currentBalance;
      if (delta === 0) return { ...account(player, tenantId), balanceReset: false };
      const now = Date.now();
      const outcome = JSON.stringify({ type: 'demo_balance_reset', previousBalance: currentBalance, newBalance: targetBalance });
      db.prepare('INSERT INTO ledger(player, game, wager, amount, created_at, outcome, tenant_id) VALUES (?, NULL, 0, ?, ?, ?, ?)').run(player, delta, now, outcome, tenantId);
      return { ...account(player, tenantId), balanceReset: true };
    });
  }
  if (route === 'POST /api/account/favorites' || route === 'POST /api/account/favorite') {
    if (!player) fail(401, 'signin');
    const { favorites: requested, key, saved, merge = false } = await body(req, 128 * 1024) ?? {};
    const single = route.endsWith('/favorite');
    const validKey = (value) => typeof value === 'string' && value.length <= 256;
    if (single ? !validKey(key) || typeof saved !== 'boolean'
      : !Array.isArray(requested) || requested.length > 1000 || requested.some((item) => !validKey(item)) || typeof merge !== 'boolean') fail(400, 'invalid');
    return transaction(() => {
      const allowed = availableFavorites(tenantId);
      if (single && saved && !allowed.has(key)) fail(404, 'comingSoonMissing');
      const nextKeys = single ? (saved ? [key] : []) : [...new Set(requested)].filter((item) => allowed.has(item));
      const remove = db.prepare('DELETE FROM player_favorites WHERE player_id = ? AND tenant_id = ? AND favorite_key = ?');
      if (single && !saved) remove.run(player, tenantId, key);
      if (!single && !merge) {
        const keep = new Set(nextKeys);
        const existing = db.prepare('SELECT favorite_key FROM player_favorites WHERE player_id = ? AND tenant_id = ?').all(player, tenantId);
        for (const row of existing) if (!keep.has(row.favorite_key)) remove.run(player, tenantId, row.favorite_key);
      }
      const now = Date.now();
      const insert = db.prepare('INSERT OR IGNORE INTO player_favorites(player_id, tenant_id, favorite_key, created_at) VALUES (?, ?, ?, ?)');
      for (const item of nextKeys) {
        insert.run(player, tenantId, item, now);
        comingSoon.recordSave(tenantId, player, item, now);
      }
      return { favorites: accountFavorites(player, tenantId) };
    });
  }
  if (route === 'POST /api/account/email-change/request') {
    if (!player) fail(401, 'signin');
    requireEmailDelivery(req);
    limitAuthAttempts(req, route);
    const { email, password, locale } = await body(req);
    if (typeof email !== 'string' || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || typeof password !== 'string' || password.length > 128 || !['en-CA', 'fr-CA'].includes(locale)) fail(400, 'invalid');
    const newEmail = email.trim().toLowerCase();
    const playerRecord = db.prepare('SELECT email, password FROM players WHERE id = ? AND tenant_id = ?').get(player, tenantId);
    const salt = playerRecord.password.split(':')[0];
    const candidate = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
    if (!matches(candidate, playerRecord.password)) fail(401, 'credentials');
    if (newEmail === playerRecord.email) fail(400, 'emailUnchanged');
    db.prepare('DELETE FROM player_email_changes WHERE expires <= ?').run(Date.now());
    const existingPlayer = db.prepare('SELECT 1 FROM players WHERE tenant_id = ? AND email = ?').get(tenantId, newEmail);
    const pendingAddress = db.prepare('SELECT player_id AS playerId FROM player_email_changes WHERE tenant_id = ? AND new_email = ?').get(tenantId, newEmail);
    if (existingPlayer || (pendingAddress && pendingAddress.playerId !== player)) fail(409, 'emailUnavailable');
    const token = randomBytes(32).toString('hex');
    const now = Date.now();
    transaction(() => {
      db.prepare('DELETE FROM player_email_changes WHERE player_id = ? AND tenant_id = ?').run(player, tenantId);
      db.prepare('DELETE FROM player_email_changes WHERE expires <= ?').run(now);
      db.prepare('INSERT INTO player_email_changes(token_hash, tenant_id, player_id, new_email, expires, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(hash(token), tenantId, player, newEmail, now + 24 * 60 * 60 * 1000, now);
    });
    const changeUrl = `${playerLinkBase(req, tenantId)}/?email-change=${token}&lang=${locale === 'fr-CA' ? 'fr' : 'en'}`;
    if (resetEmailApiKey) {
      try {
        const french = locale === 'fr-CA';
        await deliverTransactionalEmail(newEmail,
          french ? 'Confirmez votre nouvelle adresse courriel' : 'Confirm your new email address',
          french ? `Utilisez ce lien dans les prochaines 24 heures pour confirmer votre nouvelle adresse courriel : ${changeUrl}` : `Use this link within 24 hours to confirm your new email address: ${changeUrl}`);
      } catch {
        db.prepare('DELETE FROM player_email_changes WHERE token_hash = ?').run(hash(token));
        fail(503, 'unavailable');
      }
    } else {
      console.info(`Development email change link for player ${player}: ${changeUrl}`);
    }
    if (resetEmailApiKey) {
      try {
        const french = locale === 'fr-CA';
        await deliverTransactionalEmail(playerRecord.email,
          french ? 'Demande de changement d’adresse courriel' : 'Email address change requested',
          french ? `Une demande de changement d’adresse courriel a été faite pour votre compte. Votre adresse actuelle reste active jusqu’à la confirmation de la nouvelle adresse. Si vous n’êtes pas à l’origine de cette demande, contactez le soutien du casino.` : `An email address change was requested for your account. Your current address remains active until the new address is confirmed. If you did not request this, contact casino support.`);
      } catch {
        // Keep the verified-new-address flow available if the security notice cannot be delivered.
      }
    }
    return { message: 'emailChangeRequested', ...(localRecoveryPreview(req) ? { changeUrl } : {}) };
  }
  if (route === 'POST /api/account/email-change/complete') {
    limitAuthAttempts(req, route);
    const { token } = await body(req);
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(400, 'emailChangeInvalid');
    transaction(() => {
      const pending = db.prepare('SELECT player_id AS player, new_email AS newEmail FROM player_email_changes WHERE token_hash = ? AND tenant_id = ? AND expires > ?').get(hash(token), tenantId, Date.now());
      if (!pending) fail(400, 'emailChangeInvalid');
      if (db.prepare('SELECT 1 FROM players WHERE tenant_id = ? AND email = ? AND id <> ?').get(tenantId, pending.newEmail, pending.player)) fail(409, 'emailUnavailable');
      db.prepare('UPDATE players SET email = ? WHERE id = ? AND tenant_id = ?').run(pending.newEmail, pending.player, tenantId);
      db.prepare('DELETE FROM player_email_changes WHERE player_id = ? AND tenant_id = ?').run(pending.player, tenantId);
      db.prepare('DELETE FROM player_email_verifications WHERE player_id = ? AND tenant_id = ?').run(pending.player, tenantId);
      db.prepare('DELETE FROM player_password_resets WHERE player_id = ? AND tenant_id = ?').run(pending.player, tenantId);
      db.prepare('DELETE FROM sessions WHERE player = ? AND tenant_id = ?').run(pending.player, tenantId);
    });
    return { emailChanged: true };
  }
  if (route === 'POST /api/account/preferences') {
    if (!player) fail(401, 'signin');
    const { locale } = await body(req);
    if (!['en-CA', 'fr-CA'].includes(locale)) fail(400, 'invalid');
    db.prepare('UPDATE player_profiles SET preferred_locale = ?, updated_at = ? WHERE player_id = ? AND tenant_id = ?').run(locale, Date.now(), player, tenantId);
    return account(player, tenantId);
  }
  if (route === 'POST /api/account/profile') {
    if (!player) fail(401, 'signin');
    const { displayName, locale } = await body(req);
    if (typeof displayName !== 'string' || displayName.length > 80 || !['en-CA', 'fr-CA'].includes(locale) || /[\u0000-\u001f\u007f]/.test(displayName)) fail(400, 'invalid');
    const normalizedName = displayName.trim().replace(/\s+/gu, ' ');
    if (normalizedName.length > 40) fail(400, 'invalid');
    db.prepare('UPDATE player_profiles SET display_name = ?, preferred_locale = ?, updated_at = ? WHERE player_id = ? AND tenant_id = ?').run(normalizedName, locale, Date.now(), player, tenantId);
    return account(player, tenantId);
  }
  if (route === 'POST /api/account/sessions/revoke-others') {
    if (!player) fail(401, 'signin');
    const currentToken = hash(cookie);
    const now = Date.now();
    const activeSessions = db.prepare('SELECT count(*) AS count FROM sessions WHERE player = ? AND tenant_id = ? AND token <> ? AND expires > ?').get(player, tenantId, currentToken, now).count;
    db.prepare('DELETE FROM sessions WHERE player = ? AND tenant_id = ? AND token <> ?').run(player, tenantId, currentToken);
    return { ...account(player, tenantId), revokedSessions: activeSessions };
  }
  if (route === 'POST /api/account/consents') {
    if (!player) fail(401, 'signin');
    const { marketingEmail } = await body(req);
    if (typeof marketingEmail !== 'boolean') fail(400, 'invalid');
    const latest = db.prepare("SELECT granted FROM player_consent_events WHERE player_id = ? AND tenant_id = ? AND consent_type = 'marketing_email' ORDER BY id DESC LIMIT 1").get(player, tenantId);
    if (Boolean(latest?.granted) !== marketingEmail) {
      const locale = db.prepare('SELECT preferred_locale AS locale FROM player_profiles WHERE player_id = ? AND tenant_id = ?').get(player, tenantId).locale;
      db.prepare("INSERT INTO player_consent_events(tenant_id, player_id, consent_type, granted, locale, notice_version, source, captured_at) VALUES (?, ?, 'marketing_email', ?, ?, 'marketing_email_v1', 'account_settings', ?)").run(tenantId, player, Number(marketingEmail), locale, Date.now());
    }
    return account(player, tenantId);
  }
  if (route === 'POST /api/email-verification/request') {
    limitAuthAttempts(req, route);
    requireEmailDelivery(req);
    const { email, locale } = await body(req);
    if (typeof email !== 'string' || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['en-CA', 'fr-CA'].includes(locale)) fail(400, 'invalid');
    const normalizedEmail = email.trim().toLowerCase();
    const row = db.prepare("SELECT id FROM players WHERE email = ? AND tenant_id = ? AND email_verified = 0 AND access_status = 'active'").get(normalizedEmail, tenantId);
    const verifyUrl = row ? await issuePlayerEmailVerification(req, row.id, tenantId, normalizedEmail, locale) : undefined;
    return { message: 'emailVerificationRequested', ...(verifyUrl ? { verifyUrl } : {}) };
  }
  if (route === 'POST /api/email-verification/complete') {
    limitAuthAttempts(req, route);
    const { token } = await body(req);
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(400, 'emailVerificationInvalid');
    transaction(() => {
      const verification = db.prepare('SELECT player_id AS player FROM player_email_verifications WHERE token_hash = ? AND tenant_id = ? AND expires > ?').get(hash(token), tenantId, Date.now());
      if (!verification) fail(400, 'emailVerificationInvalid');
      db.prepare('UPDATE players SET email_verified = 1 WHERE id = ? AND tenant_id = ?').run(verification.player, tenantId);
      db.prepare('DELETE FROM player_email_verifications WHERE player_id = ? AND tenant_id = ?').run(verification.player, tenantId);
    });
    return { message: 'emailVerified' };
  }
  if (route === 'GET /api/account/export') {
    if (!player) fail(401, 'signin');
    const profile = db.prepare('SELECT p.email, p.email_verified AS emailVerified, profile.display_name AS displayName, profile.preferred_locale AS preferredLocale FROM players p JOIN player_profiles profile ON profile.player_id = p.id AND profile.tenant_id = p.tenant_id WHERE p.id = ? AND p.tenant_id = ?').get(player, tenantId);
    const favorites = db.prepare('SELECT favorite_key AS key FROM player_favorites WHERE player_id = ? AND tenant_id = ? ORDER BY created_at, favorite_key').all(player, tenantId).map(({ key }) => key);
    const safety = db.prepare('SELECT pause_until AS pausedUntil, cooling_off_until AS coolingOffUntil, excluded_at AS excludedAt, daily_limit_cents AS dailyLimitCents, session_reminder_minutes AS sessionReminderMinutes FROM player_safety WHERE player = ?').get(player) || {};
    const dailyWagerDateUtc = new Date().toISOString().slice(0, 10);
    const dailyWageredCents = dailyWagered(player, tenantId, dailyWagerDateUtc);
    const transactions = db.prepare('SELECT game, wager, amount, outcome, created_at AS createdAt FROM ledger WHERE player = ? AND tenant_id = ? ORDER BY id').all(player, tenantId);
    const tickets = db.prepare('SELECT id, category, is_complaint AS isComplaint, message, status, created_at AS createdAt, updated_at AS updatedAt FROM support_tickets WHERE player_id = ? AND tenant_id = ? ORDER BY id').all(player, tenantId);
    const consents = db.prepare('SELECT consent_type AS type, granted, locale, notice_version AS noticeVersion, source, captured_at AS capturedAt FROM player_consent_events WHERE player_id = ? AND tenant_id = ? ORDER BY id').all(player, tenantId).map((entry) => ({ ...entry, granted: Boolean(entry.granted) }));
    const protectionHistory = db.prepare('SELECT action, duration_days AS durationDays, until_at AS untilAt, created_at AS createdAt FROM player_protection_events WHERE player_id = ? AND tenant_id = ? ORDER BY id').all(player, tenantId);
    const messages = tickets.length ? db.prepare(`SELECT m.ticket_id AS ticketId, m.author_type AS authorType, m.message, m.created_at AS createdAt FROM support_ticket_messages m JOIN support_tickets t ON t.id = m.ticket_id AND t.tenant_id = m.tenant_id WHERE m.tenant_id = ? AND t.player_id = ? AND m.ticket_id IN (${tickets.map(() => '?').join(',')}) ORDER BY m.id`).all(tenantId, player, ...tickets.map(({ id }) => id)) : [];
    const messagesByTicket = new Map();
    for (const item of messages) {
      if (!messagesByTicket.has(item.ticketId)) messagesByTicket.set(item.ticketId, []);
      messagesByTicket.get(item.ticketId).push({ author: item.authorType, message: item.message, createdAt: item.createdAt });
    }
    return {
      schemaVersion: 1,
      exportedAt: Date.now(),
      account: { email: profile.email, displayName: profile.displayName, emailVerified: Boolean(profile.emailVerified), preferredLocale: profile.preferredLocale, tenantId },
      favorites,
      previewSaveHistory: comingSoon.playerSaves(tenantId, player),
      simulatedBalanceCents: balance(player, tenantId),
      responsiblePlay: { dailyLimitCents: safety.dailyLimitCents ?? 2500, dailyWageredCents, dailyWagerDateUtc, sessionReminderMinutes: safety.sessionReminderMinutes ?? 60, pausedUntil: safety.pausedUntil || null, coolingOffUntil: safety.coolingOffUntil || null, selfExcluded: Boolean(safety.excludedAt), history: protectionHistory },
      marketingEmailConsent: Boolean(consents.at(-1)?.granted),
      consentHistory: consents,
      activity: transactions,
      supportRequests: tickets.map(({ id, isComplaint, ...ticket }) => ({ ...ticket, isComplaint: Boolean(isComplaint), messages: messagesByTicket.get(id) || [] }))
    };
  }
  if (route === 'GET /api/account/activity') {
    if (!player) fail(401, 'signin');
    const beforeValue = new URL(req.url, 'http://localhost').searchParams.get('beforeId');
    const beforeId = Number(beforeValue);
    if (!beforeValue || !Number.isSafeInteger(beforeId) || beforeId < 1) fail(400, 'invalid');
    const rows = db.prepare('SELECT id, game, wager, amount, outcome, created_at AS createdAt FROM ledger WHERE player = ? AND tenant_id = ? AND id < ? ORDER BY id DESC LIMIT 21').all(player, tenantId, beforeId);
    const hasMore = rows.length > 20;
    if (hasMore) rows.pop();
    return { entries: rows, nextCursor: hasMore ? rows.at(-1).id : null };
  }
  if (route === 'POST /api/password-reset/request') {
    limitAuthAttempts(req, route);
    const { email, locale } = await body(req);
    if (typeof email !== 'string' || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !['en-CA', 'fr-CA'].includes(locale)) fail(400, 'invalid');
    requireEmailDelivery(req);
    const normalizedEmail = email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hash(rawToken);
    const recipient = transaction(() => {
      const row = db.prepare("SELECT id FROM players WHERE email = ? AND tenant_id = ? AND access_status = 'active'").get(normalizedEmail, tenantId);
      return row && playerAccess.newReset(tenantId, row.id, tokenHash);
    });
    let resetUrl;
    if (recipient) {
      try {
        resetUrl = await sendPasswordReset(req, tenantId, recipient.email, locale, rawToken);
      } catch {
        db.prepare('DELETE FROM player_password_resets WHERE token_hash = ? AND tenant_id = ?').run(tokenHash, tenantId);
        fail(503, 'recoveryDeliveryUnavailable');
      }
    }
    return { message: 'passwordResetRequested', ...(resetUrl && { resetUrl }) };
  }
  if (route === 'POST /api/password-reset/complete') {
    limitAuthAttempts(req, route);
    const { token, password } = await body(req);
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400, 'credentials');
    transaction(() => {
      const reset = db.prepare(`SELECT r.player_id AS player FROM player_password_resets r JOIN players p ON p.id = r.player_id AND p.tenant_id = r.tenant_id
        WHERE r.token_hash = ? AND r.tenant_id = ? AND r.expires > ? AND p.access_status = 'active'`).get(hash(token), tenantId, Date.now());
      if (!reset) fail(400, 'passwordResetInvalid');
      const salt = randomBytes(16).toString('hex');
      const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
      db.prepare('UPDATE players SET password = ?, email_verified = 1 WHERE id = ? AND tenant_id = ?').run(passwordHash, reset.player, tenantId);
      db.prepare('DELETE FROM player_password_resets WHERE player_id = ? AND tenant_id = ?').run(reset.player, tenantId);
      db.prepare('DELETE FROM sessions WHERE player = ? AND tenant_id = ?').run(reset.player, tenantId);
    });
    return { message: 'passwordResetComplete' };
  }
  if (route === 'POST /api/account/password') {
    if (!player) fail(401, 'signin');
    limitAuthAttempts(req, route);
    const { currentPassword, newPassword } = await body(req);
    if (typeof currentPassword !== 'string' || currentPassword.length > 128 || typeof newPassword !== 'string' || newPassword.length < 10 || newPassword.length > 128) fail(400, 'credentials');
    const row = db.prepare('SELECT password FROM players WHERE id = ? AND tenant_id = ?').get(player, tenantId);
    const salt = row.password.split(':')[0];
    const candidate = `${salt}:${scryptSync(currentPassword, salt, 64).toString('hex')}`;
    if (!matches(candidate, row.password)) fail(401, 'credentials');
    const newSalt = randomBytes(16).toString('hex');
    const passwordHash = `${newSalt}:${scryptSync(newPassword, newSalt, 64).toString('hex')}`;
    transaction(() => {
      db.prepare('UPDATE players SET password = ? WHERE id = ? AND tenant_id = ?').run(passwordHash, player, tenantId);
      db.prepare('DELETE FROM sessions WHERE player = ? AND tenant_id = ? AND token <> ?').run(player, tenantId, hash(cookie));
    });
    return account(player, tenantId);
  }
  if (route === 'GET /api/support') {
    if (!player) fail(401, 'signin');
    const tickets = db.prepare('SELECT id, category, is_complaint AS isComplaint, message, status, created_at AS createdAt, updated_at AS updatedAt FROM support_tickets WHERE player_id = ? AND tenant_id = ? ORDER BY updated_at DESC, id DESC LIMIT 50').all(player, tenantId);
    db.prepare('UPDATE support_tickets SET player_seen_at = ? WHERE player_id = ? AND tenant_id = ? AND id IN (SELECT id FROM support_tickets WHERE player_id = ? AND tenant_id = ? ORDER BY updated_at DESC, id DESC LIMIT 50)').run(Date.now(), player, tenantId, player, tenantId);
    return attachSupportMessages(tickets, tenantId);
  }
  if (route === 'POST /api/support') {
    if (!player) fail(401, 'signin');
    const { category, message } = await body(req, 8192);
    if (!['account', 'game', 'responsible_play', 'other', 'complaint'].includes(category) || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 3000) fail(400, 'invalid');
    const recent = db.prepare("SELECT count(*) AS count FROM support_tickets WHERE player_id = ? AND tenant_id = ? AND created_at > ?").get(player, tenantId, Date.now() - 60 * 60 * 1000).count;
    if (recent >= 5) fail(429, 'supportRateLimited');
    const now = Date.now();
    const isComplaint = category === 'complaint';
    const storedCategory = isComplaint ? 'other' : category;
    const ticketId = transaction(() => {
      const result = db.prepare("INSERT INTO support_tickets(tenant_id, player_id, category, is_complaint, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)").run(tenantId, player, storedCategory, Number(isComplaint), message.trim(), now, now);
      const id = Number(result.lastInsertRowid);
      db.prepare("INSERT INTO support_ticket_messages(tenant_id, ticket_id, author_type, player_id, message, created_at) VALUES (?, ?, 'player', ?, ?, ?)").run(tenantId, id, player, message.trim(), now);
      return id;
    });
    return { id: ticketId };
  }
  if (route === 'POST /api/support/reply') {
    if (!player) fail(401, 'signin');
    const { ticketId, message } = await body(req, 8192);
    if (!Number.isSafeInteger(ticketId) || ticketId < 1 || typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 3000) fail(400, 'invalid');
    const ticket = db.prepare('SELECT id, updated_at AS updatedAt FROM support_tickets WHERE id = ? AND player_id = ? AND tenant_id = ?').get(ticketId, player, tenantId);
    if (!ticket) fail(404, 'invalid');
    const recent = db.prepare("SELECT count(*) AS count FROM support_ticket_messages WHERE player_id = ? AND tenant_id = ? AND author_type = 'player' AND created_at > ?").get(player, tenantId, Date.now() - 60 * 60 * 1000).count;
    if (recent >= 20) fail(429, 'supportRateLimited');
    const now = Math.max(Date.now(), ticket.updatedAt + 1);
    transaction(() => {
      db.prepare("INSERT INTO support_ticket_messages(tenant_id, ticket_id, author_type, player_id, message, created_at) VALUES (?, ?, 'player', ?, ?, ?)").run(tenantId, ticketId, player, message.trim(), now);
      db.prepare("UPDATE support_tickets SET status = 'open', updated_at = ?, player_seen_at = ? WHERE id = ? AND player_id = ? AND tenant_id = ?").run(now, now, ticketId, player, tenantId);
    });
    return { id: ticketId, status: 'open', createdAt: now };
  }
  if (route === 'GET /api/admin/support') {
    staffContext(req, tenantId, supportRoles);
    const params = new URL(req.url, 'http://localhost').searchParams;
    const cursorUpdatedAt = params.get('beforeUpdatedAt');
    const cursorId = params.get('beforeId');
    if ((cursorUpdatedAt === null) !== (cursorId === null) || (cursorUpdatedAt !== null && (!/^\d{1,16}$/.test(cursorUpdatedAt) || !Number.isSafeInteger(Number(cursorUpdatedAt)) || Number(cursorUpdatedAt) < 1 || !/^\d{1,16}$/.test(cursorId) || !Number.isSafeInteger(Number(cursorId)) || Number(cursorId) < 1))) fail(400, 'invalid');
    const total = db.prepare('SELECT count(*) AS count FROM support_tickets WHERE tenant_id = ?').get(tenantId).count;
    const counts = { open: 0, answered: 0, closed: 0 };
    for (const row of db.prepare('SELECT status, count(*) AS count FROM support_tickets WHERE tenant_id = ? GROUP BY status').all(tenantId)) counts[row.status] = row.count;
    const ticketQuery = 'SELECT t.id, t.player_id AS playerId, p.email, profile.display_name AS displayName, t.category, t.is_complaint AS isComplaint, t.message, t.status, t.priority, t.assigned_to AS assignedTo, owner.email AS assignedEmail, t.created_at AS createdAt, t.updated_at AS updatedAt, safety.excluded_at AS playerExcludedAt, safety.cooling_off_until AS playerCoolingOffUntil, safety.pause_until AS playerPauseUntil FROM support_tickets t JOIN players p ON p.id = t.player_id AND p.tenant_id = t.tenant_id LEFT JOIN player_profiles profile ON profile.player_id = p.id AND profile.tenant_id = t.tenant_id LEFT JOIN staff_accounts owner ON owner.id = t.assigned_to LEFT JOIN player_safety safety ON safety.player = p.id AND t.category = \'responsible_play\' AND t.is_complaint = 0 WHERE t.tenant_id = ?';
    const pageRows = cursorUpdatedAt === null
      ? db.prepare(`${ticketQuery} ORDER BY t.updated_at DESC, t.id DESC LIMIT 201`).all(tenantId)
      : db.prepare(`${ticketQuery} AND (t.updated_at < ? OR (t.updated_at = ? AND t.id < ?)) ORDER BY t.updated_at DESC, t.id DESC LIMIT 201`).all(tenantId, Number(cursorUpdatedAt), Number(cursorUpdatedAt), Number(cursorId));
    const hasMore = pageRows.length > 200;
    const tickets = pageRows.slice(0, 200);
    const ticketIds = tickets.map((ticket) => ticket.id);
    const ticketPlaceholders = ticketIds.map(() => '?').join(',');
    const notes = ticketIds.length ? db.prepare(`SELECT n.ticket_id AS ticketId, n.note, s.email AS author, n.created_at AS createdAt FROM support_ticket_notes n JOIN staff_accounts s ON s.id = n.staff_id WHERE n.tenant_id = ? AND n.ticket_id IN (${ticketPlaceholders}) ORDER BY n.id`).all(tenantId, ...ticketIds) : [];
    const notesByTicket = new Map();
    for (const note of notes) {
      if (!notesByTicket.has(note.ticketId)) notesByTicket.set(note.ticketId, []);
      notesByTicket.get(note.ticketId).push(note);
    }
    const items = attachSupportMessages(tickets.map((ticket) => ({ ...ticket, notes: notesByTicket.get(ticket.id) || [] })), tenantId, true);
    const lastTicket = tickets.at(-1);
    return { tickets: items, total, counts, nextCursor: hasMore ? { updatedAt: lastTicket.updatedAt, id: lastTicket.id } : null };
  }
  if (route === 'GET /api/admin/support/team') {
    staffContext(req, tenantId, supportRoles);
    return db.prepare("SELECT a.id, a.email, m.role FROM tenant_staff_memberships m JOIN staff_accounts a ON a.id = m.staff_id WHERE m.tenant_id = ? AND m.status = 'active' AND m.role IN ('operator_admin', 'operator_support') ORDER BY a.email").all(tenantId);
  }
  if (['POST /api/admin/support/assign', 'POST /api/admin/support/note', 'POST /api/admin/support/reply'].includes(route)) {
    staffContext(req, tenantId, supportRoles);
    const input = await body(req);
    const { ticketId, expectedUpdatedAt, staffId, note, reply, status, priority } = input ?? {};
    if (!Number.isSafeInteger(ticketId) || ticketId < 1 || !Number.isSafeInteger(expectedUpdatedAt)) fail(400, 'invalid');
    return auditedChange(supportRoles, input, (staff) => {
      const ticket = db.prepare('SELECT id, status, priority, assigned_to AS assignedTo, updated_at AS updatedAt FROM support_tickets WHERE id = ? AND tenant_id = ?').get(ticketId, tenantId);
      if (!ticket) fail(404, 'invalid');
      if (ticket.updatedAt !== expectedUpdatedAt) fail(409, 'supportConflict');
      const now = Math.max(Date.now(), ticket.updatedAt + 1);
      if (route.endsWith('/assign')) {
        if (staffId !== null && (!Number.isSafeInteger(staffId) || staffId < 1 || !db.prepare("SELECT 1 FROM tenant_staff_memberships WHERE tenant_id = ? AND staff_id = ? AND status = 'active' AND role IN ('operator_admin', 'operator_support')").get(tenantId, staffId))) fail(400, 'invalid');
        db.prepare('UPDATE support_tickets SET assigned_to = ?, updated_at = ? WHERE id = ? AND tenant_id = ?').run(staffId, now, ticketId, tenantId);
        const auditId = staffAudit.record(tenantId, staff.id, staffId === null ? 'support_ticket_unassigned' : 'support_ticket_assigned', `${ticketId}:${staffId ?? 'unassigned'}`, requestId, {
          recordId: ticketId, revision: now, fields: changedFields(ticket, { assignedTo: staffId })
        }, now);
        return { ticketId, staffId, updatedAt: now, auditId };
      }
      if (route.endsWith('/note')) {
        if (typeof note !== 'string' || note.trim().length < 1 || note.trim().length > 2000) fail(400, 'invalid');
        db.prepare('INSERT INTO support_ticket_notes(tenant_id, ticket_id, staff_id, note, created_at) VALUES (?, ?, ?, ?, ?)').run(tenantId, ticketId, staff.id, note.trim(), now);
        db.prepare('UPDATE support_tickets SET updated_at = ? WHERE id = ? AND tenant_id = ?').run(now, ticketId, tenantId);
        const auditId = staffAudit.record(tenantId, staff.id, 'support_ticket_note_added', String(ticketId), requestId, {
          recordId: ticketId, revision: now, fields: ['privateNote']
        }, now);
        return { ticketId, createdAt: now, auditId };
      }
      const hasReply = typeof reply === 'string' && reply.trim().length > 0;
      if ((reply !== undefined && typeof reply !== 'string') || (typeof reply === 'string' && reply.trim().length > 3000) ||
          (status === 'answered' && !hasReply) || !['answered', 'closed'].includes(status) || !['low', 'normal', 'high', 'urgent'].includes(priority)) fail(400, 'invalid');
      if (hasReply) {
        db.prepare('UPDATE support_tickets SET reply = ?, status = ?, priority = ?, replied_by = ?, updated_at = ?, reply_thread_migrated = 1 WHERE id = ? AND tenant_id = ?').run(reply.trim(), status, priority, staff.id, now, ticketId, tenantId);
        db.prepare("INSERT INTO support_ticket_messages(tenant_id, ticket_id, author_type, staff_id, message, created_at) VALUES (?, ?, 'staff', ?, ?, ?)").run(tenantId, ticketId, staff.id, reply.trim(), now);
      } else {
        db.prepare('UPDATE support_tickets SET status = ?, priority = ?, updated_at = ? WHERE id = ? AND tenant_id = ?').run(status, priority, now, ticketId, tenantId);
      }
      const action = hasReply ? `support_ticket_${status}_priority_${priority}` : `support_ticket_closed_without_reply_priority_${priority}`;
      const fields = changedFields(ticket, { status, priority });
      if (hasReply) fields.push('reply');
      const auditId = staffAudit.record(tenantId, staff.id, action, String(ticketId), requestId, {
        recordId: ticketId, revision: now, fields, previousStatus: ticket.status, status
      }, now);
      return { id: ticketId, status, priority, updatedAt: now, replied: hasReply, auditId };
    });
  }
  if (route === 'GET /api/games') return db.prepare('SELECT gc.id, gc.provider, gc.external_id AS externalId, gc.title_en AS titleEn, gc.title_fr AS titleFr, gc.category FROM game_catalog gc JOIN providers p ON p.id = gc.provider_id AND p.tenant_id = gc.tenant_id WHERE gc.tenant_id = ? AND gc.enabled = 1 ORDER BY gc.title_en').all(tenantId);
  if (route === 'POST /api/signup' || route === 'POST /api/login') {
    limitAuthAttempts(req, route);
    const { email, password, locale } = await body(req);
    if (typeof email !== 'string' || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        typeof password !== 'string' || password.length < 10 || password.length > 128 || (route.endsWith('signup') && locale !== undefined && !['en-CA', 'fr-CA'].includes(locale))) fail(400, 'credentials');
    const cleanEmail = email.trim().toLowerCase();
    let row = db.prepare('SELECT * FROM players WHERE email = ? AND tenant_id = ?').get(cleanEmail, tenantId);
    const salt = route.endsWith('signup') ? randomBytes(16).toString('hex') : row?.password.split(':')[0] || '00000000000000000000000000000000';
    const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
    if (route.endsWith('signup')) {
      requireEmailDelivery(req);
      if (row) fail(409, 'credentials');
      row = transaction(() => {
        const { lastInsertRowid: id } = db.prepare('INSERT INTO players(email, password, tenant_id, email_verified, preferred_locale) VALUES (?, ?, ?, 0, ?)').run(cleanEmail, passwordHash, tenantId, locale || 'en-CA');
        db.prepare('INSERT INTO player_profiles(tenant_id, player_id, display_name, preferred_locale, updated_at) VALUES (?, ?, ?, ?, ?)').run(tenantId, id, '', locale || 'en-CA', Date.now());
        db.prepare('INSERT INTO ledger(player, wager, amount, tenant_id) VALUES (?, 0, 10000, ?)').run(id, tenantId);
        return { id };
      });
    } else if (!matches(passwordHash, row?.password || '')) {
      fail(401, 'credentials');
    }
    if (route.endsWith('signup')) {
      const verifyUrl = await issuePlayerEmailVerification(req, row.id, tenantId, cleanEmail, locale || 'en-CA');
      return { verificationRequired: true, ...(verifyUrl ? { verifyUrl } : {}) };
    }
    const token = randomBytes(32).toString('hex');
    const sessionStartedAt = Date.now();
    transaction(() => {
      const current = db.prepare('SELECT access_status, email_verified, password FROM players WHERE id = ? AND tenant_id = ?').get(row.id, tenantId);
      if (!current || current.password !== row.password) fail(401, 'credentials');
      if (current.access_status === 'suspended') fail(403, 'playerSuspended');
      if (!current.email_verified) fail(403, 'emailVerificationRequired');
      if (db.prepare('SELECT excluded_at FROM player_safety WHERE player = ?').get(row.id)?.excluded_at) fail(403, 'excluded');
      if (cookie) db.prepare('DELETE FROM sessions WHERE token = ? AND tenant_id = ?').run(hash(cookie), tenantId);
      db.prepare('INSERT INTO sessions(token, player, expires, tenant_id, created_at) VALUES (?, ?, ?, ?, ?)').run(hash(token), row.id, sessionStartedAt + 86400000, tenantId, sessionStartedAt);
    });
    res.setHeader('Set-Cookie', `northplay=${token}; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=86400${secureCookie}`);
    return { ...account(row.id, tenantId), sessionStartedAt };
  }
  if (route === 'POST /api/logout') {
    if (cookie) db.prepare('DELETE FROM sessions WHERE token = ? AND tenant_id = ?').run(hash(cookie), tenantId);
    res.setHeader('Set-Cookie', `northplay=; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);
    return null;
  }
  if (route === 'POST /api/safety/pause' || route === 'POST /api/safety/exclude') {
    if (!player) fail(401, 'signin');
    const current = db.prepare('SELECT excluded_at FROM player_safety WHERE player = ?').get(player);
    if (current?.excluded_at) fail(403, 'excluded');
    const now = Date.now();
    const pauseUntil = route.endsWith('/pause') ? now + 15 * 60 * 1000 : null;
    transaction(() => {
      db.prepare('INSERT INTO player_safety(player, pause_until, excluded_at) VALUES (?, ?, ?) ON CONFLICT(player) DO UPDATE SET pause_until = excluded.pause_until, excluded_at = coalesce(player_safety.excluded_at, excluded.excluded_at)').run(
        player, pauseUntil, route.endsWith('/exclude') ? now : null
      );
      if (route.endsWith('/exclude')) db.prepare('DELETE FROM sessions WHERE player = ? AND tenant_id = ?').run(player, tenantId);
    });
    if (route.endsWith('/exclude')) res.setHeader('Set-Cookie', `northplay=; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie}`);
    return { pausedUntil: pauseUntil, excluded: route.endsWith('/exclude') };
  }
  if (route === 'POST /api/safety/cooling-off') {
    if (!player) fail(401, 'signin');
    const { days } = await body(req);
    if (![1, 7, 30].includes(days)) fail(400, 'invalid');
    const current = db.prepare('SELECT excluded_at AS excludedAt, cooling_off_until AS coolingOffUntil FROM player_safety WHERE player = ?').get(player) || {};
    if (current.excludedAt) fail(403, 'excluded');
    const now = Date.now();
    const requestedUntil = now + days * 24 * 60 * 60 * 1000;
    const until = Math.max(current.coolingOffUntil || 0, requestedUntil);
    if (until > (current.coolingOffUntil || 0)) {
      transaction(() => {
        db.prepare('INSERT INTO player_safety(player, cooling_off_until) VALUES (?, ?) ON CONFLICT(player) DO UPDATE SET cooling_off_until = max(coalesce(player_safety.cooling_off_until, 0), excluded.cooling_off_until)').run(player, until);
        const action = current.coolingOffUntil > now ? 'cooling_off_extended' : 'cooling_off_started';
        db.prepare('INSERT INTO player_protection_events(tenant_id, player_id, action, duration_days, until_at, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(tenantId, player, action, days, until, now);
      });
    }
    return account(player, tenantId);
  }
  if (route === 'POST /api/safety/limit') {
    if (!player) fail(401, 'signin');
    const { dailyLimit } = await body(req);
    if (!Number.isInteger(dailyLimit) || dailyLimit < 500 || dailyLimit > 10000 || dailyLimit % 500 !== 0) fail(400, 'invalid');
    if (db.prepare('SELECT excluded_at FROM player_safety WHERE player = ?').get(player)?.excluded_at) fail(403, 'excluded');
    db.prepare('INSERT INTO player_safety(player, daily_limit_cents) VALUES (?, ?) ON CONFLICT(player) DO UPDATE SET daily_limit_cents = min(player_safety.daily_limit_cents, excluded.daily_limit_cents)').run(player, dailyLimit);
    return account(player, tenantId);
  }
  if (route === 'POST /api/safety/reminder') {
    if (!player) fail(401, 'signin');
    const { minutes } = await body(req);
    if (![30, 60, 120].includes(minutes)) fail(400, 'invalid');
    db.prepare('INSERT INTO player_safety(player, session_reminder_minutes) VALUES (?, ?) ON CONFLICT(player) DO UPDATE SET session_reminder_minutes = excluded.session_reminder_minutes').run(player, minutes);
    return account(player, tenantId);
  }
  if (route === 'POST /api/play') {
    if (!player) fail(401, 'signin');
    const { game, wager, requestId, choice } = await body(req);
    if (!games.some(({ id }) => id === game) || ![100, 500, 1000].includes(wager) ||
        typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId) ||
        (game === 'roulette' && !['red', 'black'].includes(choice)) || (game !== 'roulette' && choice !== undefined)) fail(400, 'invalid');
    return transaction(() => {
      const safety = db.prepare('SELECT pause_until, cooling_off_until, excluded_at, daily_limit_cents FROM player_safety WHERE player = ?').get(player);
      if (safety?.excluded_at) fail(403, 'excluded');
      if (safety?.pause_until > Date.now()) fail(403, 'paused');
      if (safety?.cooling_off_until > Date.now()) fail(403, 'coolingOffBlocked');
      const existing = db.prepare('SELECT game, wager, amount, outcome FROM ledger WHERE player = ? AND tenant_id = ? AND request_id = ?').get(player, tenantId, requestId);
      if (existing) {
        if (existing.game !== game || existing.wager !== wager || (game === 'roulette' && JSON.parse(existing.outcome || '{}').choice !== choice)) fail(409, 'invalid');
        return { ...account(player, tenantId), amount: existing.amount, outcome: existing.outcome };
      }
      const wagered = dailyWagered(player, tenantId);
      if (wagered + wager > (safety?.daily_limit_cents ?? 2500)) fail(409, 'dailyLimit');
      if (balance(player, tenantId) < wager) fail(409, 'balance');
      let amount;
      let outcome;
      if (game === 'roulette') {
        const number = randomInt(37);
        const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
        const color = number === 0 ? 'green' : redNumbers.has(number) ? 'red' : 'black';
        amount = color === choice ? wager : -wager;
        outcome = JSON.stringify({ number, color, choice });
      } else if (game === 'gold' || game === 'aurora') {
        const symbols = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎'];
        const reels = Array.from({ length: 3 }, () => symbols[randomInt(symbols.length)]);
        const counts = new Map(reels.map((symbol) => [symbol, reels.filter((item) => item === symbol).length]));
        const match = Math.max(...counts.values());
        const multiplier = match === 3 ? 5 : match === 2 ? 2 : 0;
        amount = multiplier ? wager * (multiplier - 1) : -wager;
        outcome = JSON.stringify({ reels, multiplier });
      } else if (game === 'blackjack') {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = Array.from({ length: 13 }, (_, index) => index + 2);
        const deck = suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit })));
        for (let index = deck.length - 1; index > 0; index -= 1) {
          const swapIndex = randomInt(index + 1);
          [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
        }
        const draw = () => deck.pop();
        const score = (hand) => {
          let total = hand.reduce((sum, card) => sum + (card.rank === 14 ? 11 : Math.min(card.rank, 10)), 0);
          let aces = hand.filter((card) => card.rank === 14).length;
          while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
          return total;
        };
        const label = ({ rank, suit }) => `${rank === 14 ? 'A' : rank === 13 ? 'K' : rank === 12 ? 'Q' : rank === 11 ? 'J' : rank}${suit}`;
        const playerHand = [draw(), draw()];
        const dealerHand = [draw(), draw()];
        while (score(dealerHand) < 17) dealerHand.push(draw());
        const playerScore = score(playerHand);
        const dealerScore = score(dealerHand);
        const verdict = playerScore > 21 || (dealerScore <= 21 && dealerScore > playerScore) ? 'loss'
          : playerScore === dealerScore ? 'push' : 'win';
        amount = verdict === 'win' ? wager : verdict === 'loss' ? -wager : 0;
        outcome = JSON.stringify({ playerCards: playerHand.map(label), dealerCards: dealerHand.map(label), playerScore, dealerScore, verdict });
      } else {
        amount = randomInt(2) === 1 ? wager : -wager;
      }
      db.prepare('INSERT INTO ledger(player, game, wager, amount, request_id, created_at, outcome, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(player, game, wager, amount, requestId, Date.now(), outcome, tenantId);
      return { ...account(player, tenantId), amount, outcome };
    });
  }
  if (route === 'POST /api/providers' || route === 'POST /api/providers/list' || route === 'POST /api/providers/audit' || route === 'POST /api/providers/catalog' || route === 'POST /api/providers/catalog/preview' || route === 'POST /api/providers/catalog/list' || route === 'POST /api/providers/catalog/status') {
    if (!adminEnabled) fail(503, 'adminDisabled');
    const providerRoles = ['operator_admin', 'operator_provider'];
    staffContext(req, tenantId, providerRoles);
    if (route === 'POST /api/providers') {
      const { name, key } = await body(req);
      if (typeof name !== 'string' || !/^[\p{L}\p{N} ._-]{1,64}$/u.test(name) ||
          typeof key !== 'string' || !key.trim() || key.length > 2048) fail(400, 'invalid');
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
      cipher.setAAD(Buffer.from(name));
      const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
      const value = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
      const now = new Date().toISOString();
      transaction(() => {
        const staff = staffContext(req, tenantId, providerRoles);
        const exists = db.prepare('SELECT 1 FROM providers WHERE name = ? AND tenant_id = ?').get(name, tenantId);
        db.prepare('INSERT INTO providers(name, encrypted_key, updated, tenant_id) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, name) DO UPDATE SET encrypted_key = excluded.encrypted_key, updated = excluded.updated').run(name, value, now, tenantId);
        db.prepare('INSERT INTO provider_events(name, action, created, tenant_id) VALUES (?, ?, ?, ?)').run(name, exists ? 'rotated' : 'added', now, tenantId);
        staffAudit.record(tenantId, staff.id, exists ? 'provider_key_rotated' : 'provider_key_added', name, requestId, { fields: ['providerCredential'] });
      });
    }
    if (route === 'POST /api/providers/audit') {
      return db.prepare('SELECT name, action, created FROM provider_events WHERE tenant_id = ? ORDER BY id DESC LIMIT 100').all(tenantId);
    }
    if (route === 'POST /api/providers/catalog') {
      const input = await body(req, 256 * 1024);
      const { name, games: importedGames, expectedRevision } = input ?? {};
      const providerRow = typeof name === 'string' && db.prepare('SELECT id FROM providers WHERE name = ? AND tenant_id = ?').get(name, tenantId);
      if (typeof name !== 'string' || !providerRow || typeof expectedRevision !== 'string' || !/^[a-f0-9]{64}$/.test(expectedRevision)) fail(400, 'invalid');
      validateCatalogGames(importedGames);
      const now = new Date().toISOString();
      return auditedChange(providerRoles, input, (staff) => {
        if (providerCatalogSnapshot(providerRow.id, tenantId).revision !== expectedRevision) fail(409, 'catalogChanged');
        db.prepare('UPDATE game_catalog SET enabled = 0 WHERE provider_id = ? AND tenant_id = ?').run(providerRow.id, tenantId);
        const upsert = db.prepare('INSERT INTO game_catalog(provider_id, provider, tenant_id, external_id, title_en, title_fr, category, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(tenant_id, provider_id, external_id) DO UPDATE SET title_en = excluded.title_en, title_fr = excluded.title_fr, category = excluded.category, enabled = 1');
        for (const game of importedGames) upsert.run(providerRow.id, name, tenantId, game.externalId, game.titleEn.trim(), game.titleFr.trim(), game.category);
        db.prepare('INSERT INTO provider_events(name, action, created, tenant_id) VALUES (?, ?, ?, ?)').run(name, `catalog_synced:${importedGames.length}`, now, tenantId);
        const auditId = staffAudit.record(tenantId, staff.id, 'provider_catalog_synced', name, requestId, { recordId: providerRow.id, fields: ['listings'] });
        return { imported: importedGames.length, auditId };
      }, 'publishCatalogue');
    }
    if (route === 'POST /api/providers/catalog/list') {
      return db.prepare('SELECT gc.provider AS name, gc.external_id AS externalId, gc.title_en AS titleEn, gc.title_fr AS titleFr, gc.category, gc.enabled FROM game_catalog gc WHERE gc.tenant_id = ? ORDER BY gc.provider, gc.title_en LIMIT 2000').all(tenantId);
    }
    if (route === 'POST /api/providers/catalog/status') {
      const input = await body(req);
      const { name, externalId, enabled } = input ?? {};
      if (typeof name !== 'string' || !/^[\p{L}\p{N} ._-]{1,64}$/u.test(name) || typeof externalId !== 'string' || !/^[\w.-]{1,128}$/.test(externalId) || typeof enabled !== 'boolean') fail(400, 'invalid');
      return auditedChange(providerRoles, input, (staff) => {
        const listing = db.prepare('SELECT id, enabled FROM game_catalog WHERE tenant_id = ? AND provider = ? AND external_id = ?').get(tenantId, name, externalId);
        if (!listing) fail(404, 'invalid');
        if (Boolean(listing.enabled) === enabled) return { name, externalId, enabled };
        db.prepare('UPDATE game_catalog SET enabled = ? WHERE id = ? AND tenant_id = ?').run(Number(enabled), listing.id, tenantId);
        const auditId = staffAudit.record(tenantId, staff.id, enabled ? 'catalog_listing_enabled' : 'catalog_listing_disabled', `${name}:${externalId}`, requestId, {
          recordId: listing.id, fields: ['enabled']
        });
        return { name, externalId, enabled, auditId };
      }, 'publishCatalogue');
    }
    if (route === 'POST /api/providers/catalog/preview') {
      const { name, games: importedGames } = await body(req, 256 * 1024);
      const providerRow = typeof name === 'string' && db.prepare('SELECT id FROM providers WHERE name = ? AND tenant_id = ?').get(name, tenantId);
      if (typeof name !== 'string' || !providerRow) fail(400, 'invalid');
      const externalIds = validateCatalogGames(importedGames);
      const { rows, revision } = providerCatalogSnapshot(providerRow.id, tenantId);
      const current = new Map(rows.map((row) => [row.external_id, row]));
      let added = 0;
      let updated = 0;
      let unchanged = 0;
      for (const game of importedGames) {
        const row = current.get(game.externalId);
        if (!row || !row.enabled) added += 1;
        else if (row.title_en !== game.titleEn.trim() || row.title_fr !== game.titleFr.trim() || row.category !== game.category) updated += 1;
        else unchanged += 1;
      }
      const removed = rows.filter((row) => row.enabled && !externalIds.has(row.external_id)).length;
      return { added, updated, unchanged, removed, revision };
    }
    return db.prepare('SELECT name, updated FROM providers WHERE tenant_id = ? ORDER BY name').all(tenantId);
  }
  fail(404, 'invalid');
}

const assets = {
  '/': ['index.html', 'text/html'],
  '/admin': ['index.html', 'text/html'],
  '/style.css': ['style.css', 'text/css'],
  '/admin.css': ['admin.css', 'text/css'],
  '/app.js': ['app.js', 'text/javascript'],
  '/admin-workspace.js': ['admin-workspace.js', 'text/javascript'],
  '/catalog.js': ['catalog.js', 'text/javascript'],
  '/player-access.js': ['player-access.js', 'text/javascript'],
  '/coming-soon.js': ['coming-soon.js', 'text/javascript'],
  '/hero.webp': ['hero.webp', 'image/webp'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml']
};
createServer(async (req, res) => {
  const incomingRequestId = req.headers['x-request-id'];
  const requestId = typeof incomingRequestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(incomingRequestId)
    ? incomingRequestId.toLowerCase() : randomUUID();
  const startedAt = Date.now();
  let tenantId = null;
  let path = '/';
  let errorCode = null;
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    const entry = { event: 'http_request', requestId, method: req.method, path, status: res.statusCode, durationMs: Date.now() - startedAt };
    if (tenantId) entry.tenantId = tenantId;
    if (errorCode) entry.errorCode = errorCode;
    console.log(JSON.stringify(entry));
  });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  res.setHeader('Cache-Control', 'no-store');
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    path = requestUrl.pathname;
    if (appBasePath && path.startsWith(appBasePath + '/')) path = path.slice(appBasePath.length);
    else if (appBasePath && path === appBasePath && req.method === 'GET') {
      res.writeHead(308, { Location: `${appBasePath}/${requestUrl.search}` });
      return res.end();
    }
    if (req.method === 'GET' && path === '/healthz') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ status: 'ok', requestId }));
    }
    if (req.method === 'GET' && path === '/readyz') {
      db.prepare('SELECT 1').get();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ status: 'ready', requestId }));
    }
    tenantId = resolveTenant(req);
    if (path.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(await api(req, res, path, tenantId, requestId)));
    }
    const preview = req.method === 'GET' && path.match(/^\/coming-soon\/([a-z0-9-]{1,64})$/);
    if (req.method !== 'GET' || (!preview && !Object.hasOwn(assets, path))) fail(404, 'invalid');
    if (preview && (!comingSoonEnabled(tenantId) || !comingSoon.published(tenantId, preview[1], catalogueAudience(tenantId, requestUrl.searchParams.get('locale'))))) res.statusCode = 404;
    const [file, type] = preview ? assets['/'] : assets[path];
    let content = readFileSync(new URL(`./public/${file}`, import.meta.url));
    if (type === 'text/html' && appBasePath) {
      content = content.toString('utf8')
        .replace('data-app-base-path=""', `data-app-base-path="${appBasePath}"`)
        .replace(/\b(href|src)="\/(?!\/)/g, (_match, attribute) => `${attribute}="${appBasePath}/`);
    }
    res.setHeader('Content-Type', type.startsWith('text/') ? `${type}; charset=utf-8` : type);
    res.end(content);
  } catch (error) {
    res.statusCode = error.status || (error.code === 'ENOENT' ? 404 : 500);
    errorCode = error.status ? error.message : 'internal';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: error.status ? error.message : 'unavailable', requestId }));
  }
}).listen(port, host, () => {
  console.log(JSON.stringify({ event: 'server_started', environment: appEnvironment, host, port }));
});
