import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const environment = process.env.APP_ENV || 'development';
if (environment !== 'development') throw new Error('Showcase data can only be added to the local development demo.');

const dataDirectory = resolve(process.env.DATA_DIR || 'data');
const markerPath = join(dataDirectory, '.northplay-environment');
const databasePath = join(dataDirectory, 'northplay.sqlite');
if (!existsSync(databasePath)) throw new Error(`Demo database not found at ${databasePath}. Start the demo once to initialize it, then run this command again.`);
if (!existsSync(markerPath)) throw new Error('The demo database has no environment marker. Start the local demo once, then retry.');
if (readFileSync(markerPath, 'utf8').trim() !== 'development') {
  throw new Error('Refusing to add showcase data to a database marked for another environment.');
}

const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
try {
  const requiredTables = ['tenants', 'players', 'player_profiles', 'ledger', 'support_tickets', 'support_ticket_messages', 'player_safety'];
  for (const name of requiredTables) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)) {
      throw new Error(`The demo database is missing its ${name} table. Start the demo once to complete database setup, then retry.`);
    }
  }
  if (!db.prepare("SELECT 1 FROM tenants WHERE id = 'sandbox'").get()) {
    throw new Error('The local sandbox tenant is not initialized. Start the demo once, then run this command again.');
  }
  const existing = db.prepare("SELECT count(*) AS count FROM players WHERE tenant_id = 'sandbox' AND email LIKE 'northplay-showcase-%@example.invalid'").get().count;
  if (existing > 0) {
    console.log('Northplay showcase data is already present. No records were changed.');
  } else {
    const existingDemoData = db.prepare(`
      SELECT
        (SELECT count(*) FROM players WHERE tenant_id = 'sandbox') AS players,
        (SELECT count(*) FROM ledger WHERE tenant_id = 'sandbox') AS ledgerEntries,
        (SELECT count(*) FROM support_tickets WHERE tenant_id = 'sandbox') AS tickets
    `).get();
    if (existingDemoData.players || existingDemoData.ledgerEntries || existingDemoData.tickets) {
      throw new Error('Showcase data can only be loaded into a fresh local demo database. Extract a new copy of the Windows ZIP and initialize it before running this command.');
    }
    const players = [
      ['Alex Morgan', 'en-CA'], ['Jordan Lee', 'en-CA'], ['Sam Rivera', 'en-CA'], ['Taylor Brooks', 'en-CA'],
      ['Camille Roy', 'fr-CA'], ['Émile Gagnon', 'fr-CA'], ['Sophie Tremblay', 'fr-CA'], ['Noah Chen', 'fr-CA']
    ];
    const games = ['gold', 'blackjack', 'roulette', 'aurora'];
    const wagers = [250, 500, 1000];
    const now = Date.now();
    const playerInsert = db.prepare('INSERT INTO players(email, password, tenant_id, email_verified, preferred_locale) VALUES (?, ?, \'sandbox\', 1, ?)');
    const profileInsert = db.prepare('INSERT INTO player_profiles(tenant_id, player_id, display_name, preferred_locale, updated_at) VALUES (\'sandbox\', ?, ?, ?, ?)');
    const roundInsert = db.prepare('INSERT INTO ledger(player, game, wager, amount, request_id, created_at, outcome, tenant_id) VALUES (?, ?, ?, ?, ?, ?, NULL, \'sandbox\')');
    const ticketInsert = db.prepare('INSERT INTO support_tickets(tenant_id, player_id, category, message, status, priority, is_complaint, created_at, updated_at) VALUES (\'sandbox\', ?, ?, ?, ?, ?, 0, ?, ?)');
    const messageInsert = db.prepare("INSERT INTO support_ticket_messages(tenant_id, ticket_id, author_type, player_id, message, created_at) VALUES ('sandbox', ?, 'player', ?, ?, ?)");

    db.exec('BEGIN IMMEDIATE');
    try {
      const playerIds = players.map(([name, locale], index) => {
        const email = `northplay-showcase-${String(index + 1).padStart(2, '0')}@example.invalid`;
        const nonLoginSecret = `${randomBytes(16).toString('hex')}:${randomBytes(64).toString('hex')}`;
        const result = playerInsert.run(email, nonLoginSecret, locale);
        const id = Number(result.lastInsertRowid);
        profileInsert.run(id, name, locale, now);
        return id;
      });

      players.forEach((_, playerIndex) => {
        for (let roundIndex = 0; roundIndex < 8; roundIndex += 1) {
          const ageDays = (playerIndex * 5 + roundIndex * 3) % 30;
          const createdAt = now - ageDays * 86_400_000 - (roundIndex + 1) * 60_000;
          const game = games[(playerIndex + roundIndex) % games.length];
          const wager = wagers[(playerIndex + roundIndex) % wagers.length];
          const outcome = (playerIndex + roundIndex) % 3 === 0 ? wager : (playerIndex + roundIndex) % 3 === 1 ? 0 : -wager;
          roundInsert.run(playerIds[playerIndex], game, wager, outcome, `northplay-showcase-${playerIndex + 1}-${roundIndex + 1}`, createdAt);
        }
      });

      const tickets = [
        [0, 'game', 'Sample demo request: I would like help finding my recent game activity.', 'open', 'normal', 1],
        [1, 'account', 'Sample demo request: Where can I update my display name?', 'open', 'low', 2],
        [4, 'responsible_play', 'Demande fictive : où puis-je consulter mes paramètres de jeu responsable?', 'open', 'high', 3],
        [5, 'game', 'Demande fictive : je cherche où consulter mes parties récentes.', 'closed', 'normal', 4],
        [6, 'other', 'Demande fictive : pouvez-vous m’aider à modifier la langue du hall?', 'closed', 'normal', 5]
      ];
      for (const [playerIndex, category, message, status, priority, ageDays] of tickets) {
        const createdAt = now - ageDays * 86_400_000;
        const result = ticketInsert.run(playerIds[playerIndex], category, message, status, priority, createdAt, createdAt + 60_000);
        messageInsert.run(Number(result.lastInsertRowid), playerIds[playerIndex], message, createdAt);
      }
      db.prepare('INSERT INTO player_safety(player, cooling_off_until, session_reminder_minutes) VALUES (?, ?, 60)').run(playerIds[4], now + 7 * 86_400_000);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    console.log('Added 8 fictional, non-login showcase accounts, 64 simulated game rounds, and 5 sample support requests to the local sandbox. No external services were contacted. Run this command again to leave the existing sample data unchanged.');
  }
} finally {
  db.close();
}
