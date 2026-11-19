import { createReadStream } from 'node:fs';
import { chmodSync, copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync, constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync, backup as sqliteBackup } from 'node:sqlite';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const environment = process.env.APP_ENV || 'development';
if (!['development', 'staging', 'production'].includes(environment)) throw new Error('APP_ENV must be development, staging, or production');
const dataDirectory = resolve(process.env.DATA_DIR || (environment === 'development' ? 'data' : join('data', environment)));
const sourceDatabase = join(dataDirectory, 'northplay.sqlite');
const markerPath = join(dataDirectory, '.northplay-environment');

function fail(message) {
  console.error(`Database operation failed: ${message}`);
  process.exitCode = 1;
}

function assertEnvironmentMarker() {
  if (!existsSync(markerPath)) {
    if (environment !== 'development') throw new Error(`No environment marker found in ${dataDirectory}; start the service once before using its database`);
    return;
  }
  const recorded = readFileSync(markerPath, 'utf8').trim();
  if (recorded !== environment) throw new Error(`DATA_DIR is marked for ${recorded}, not ${environment}`);
}

function ensureOutsideDataDirectory(candidate, label) {
  const path = resolve(candidate);
  const fromData = relative(dataDirectory, path);
  if (fromData === '' || (fromData !== '..' && !fromData.startsWith(`..${sep}`) && !isAbsolute(fromData))) {
    throw new Error(`${label} must be outside DATA_DIR`);
  }
  return path;
}

async function sha256(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

function inspectDatabase(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const integrity = database.prepare('PRAGMA integrity_check').all().map((row) => row.integrity_check);
    if (integrity.length !== 1 || integrity[0] !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity.join('; ') || 'no result'}`);
    const foreignKeyIssues = database.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeyIssues.length) throw new Error(`SQLite foreign key check found ${foreignKeyIssues.length} issue(s)`);
    const tables = database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get().count;
    return { integrity: 'ok', foreignKeyIssues: 0, tables };
  } finally {
    database.close();
  }
}

async function inspectBackup(path, requireManifest = false) {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) throw new Error(`File does not exist: ${absolutePath}`);
  const checks = inspectDatabase(absolutePath);
  const digest = await sha256(absolutePath);
  const manifestPath = `${absolutePath}.manifest.json`;
  let manifest = null;
  if (existsSync(manifestPath)) {
    try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
    catch { throw new Error('Backup manifest is not valid JSON'); }
    if (manifest.formatVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.sha256) || manifest.sha256 !== digest) {
      throw new Error('Backup manifest is invalid or its SHA-256 does not match the database');
    }
  } else if (requireManifest) {
    throw new Error('A matching .manifest.json file is required to prepare a restore');
  }
  return { path: absolutePath, sha256: digest, manifest, ...checks };
}

function linkWithoutOverwrite(source, target) {
  try {
    linkSync(source, target);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Refusing to overwrite existing file: ${target}`);
    copyFileSync(source, target, constants.COPYFILE_EXCL);
  }
}

async function createBackup(outputArgument) {
  if (!outputArgument) throw new Error('Usage: npm run db:backup -- <backup-file.sqlite>');
  assertEnvironmentMarker();
  if (!existsSync(sourceDatabase)) throw new Error(`Source database does not exist: ${sourceDatabase}`);
  const output = ensureOutsideDataDirectory(outputArgument, 'Backup file');
  const manifestPath = `${output}.manifest.json`;
  if (existsSync(output) || existsSync(manifestPath)) throw new Error(`Backup or manifest already exists: ${output}`);
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const temporary = `${output}.tmp-${randomUUID()}`;
  const source = new DatabaseSync(sourceDatabase, { readOnly: true });
  const previousUmask = process.umask(0o077);
  try {
    await sqliteBackup(source, temporary);
    chmodSync(temporary, 0o600);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  } finally {
    source.close();
    process.umask(previousUmask);
  }
  try {
    const checks = inspectDatabase(temporary);
    const digest = await sha256(temporary);
    linkWithoutOverwrite(temporary, output);
    unlinkSync(temporary);
    chmodSync(output, 0o600);
    const manifest = {
      formatVersion: 1,
      environment,
      createdAt: new Date().toISOString(),
      sha256: digest,
      integrity: checks.integrity,
      foreignKeyIssues: checks.foreignKeyIssues
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ event: 'database_backup_created', path: output, environment, sha256: digest, ...checks }));
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

async function verifyBackup(path) {
  if (!path) throw new Error('Usage: npm run db:verify -- <backup-file.sqlite>');
  const result = await inspectBackup(path);
  if (result.manifest && result.manifest.environment !== environment) {
    throw new Error(`Backup belongs to ${result.manifest.environment}, not ${environment}`);
  }
  console.log(JSON.stringify({ event: 'database_backup_verified', path: result.path, environment: result.manifest?.environment || 'unmarked', sha256: result.sha256, integrity: result.integrity, foreignKeyIssues: result.foreignKeyIssues, tables: result.tables }));
}

async function prepareRestore(backupPath, targetArgument) {
  if (!backupPath || !targetArgument) throw new Error('Usage: npm run db:prepare-restore -- <backup-file.sqlite> <new-data-directory>');
  const inspected = await inspectBackup(backupPath, true);
  if (inspected.manifest.environment !== environment) throw new Error(`Backup belongs to ${inspected.manifest.environment}, not ${environment}`);
  const targetDirectory = ensureOutsideDataDirectory(targetArgument, 'Restore directory');
  if (existsSync(targetDirectory)) throw new Error(`Restore directory must not already exist: ${targetDirectory}`);
  mkdirSync(targetDirectory, { recursive: false, mode: 0o700 });
  const targetDatabase = join(targetDirectory, 'northplay.sqlite');
  const previousUmask = process.umask(0o077);
  const source = new DatabaseSync(inspected.path, { readOnly: true });
  try {
    await sqliteBackup(source, targetDatabase);
    chmodSync(targetDatabase, 0o600);
  } catch (error) {
    rmSync(targetDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    source.close();
    process.umask(previousUmask);
  }
  try {
    const checks = inspectDatabase(targetDatabase);
    const restoredHash = await sha256(targetDatabase);
    writeFileSync(join(targetDirectory, '.northplay-environment'), `${environment}\n`, { flag: 'wx', mode: 0o600 });
    const preparedAt = new Date().toISOString();
    const databaseManifest = { formatVersion: 1, environment, createdAt: preparedAt, sha256: restoredHash, ...checks };
    writeFileSync(`${targetDatabase}.manifest.json`, `${JSON.stringify(databaseManifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    const restoreManifest = { formatVersion: 1, environment, preparedAt, sourceBackup: basename(inspected.path), sourceSha256: inspected.sha256, restoredSha256: restoredHash, ...checks };
    writeFileSync(join(targetDirectory, 'restore-manifest.json'), `${JSON.stringify(restoreManifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ event: 'database_restore_prepared', dataDirectory: targetDirectory, environment, sourceSha256: inspected.sha256, ...checks }));
  } catch (error) {
    rmSync(targetDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'backup') return createBackup(args[0]);
  if (command === 'verify') return verifyBackup(args[0]);
  if (command === 'prepare-restore') return prepareRestore(args[0], args[1]);
  throw new Error('Commands: backup <backup-file.sqlite> | verify <backup-file.sqlite> | prepare-restore <backup-file.sqlite> <new-data-directory>');
}

try {
  await main();
} catch (error) {
  fail(error.message);
}
