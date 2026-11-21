import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { configureTransactionalEmail } from '../lib/transactional-email.js';

test('cPanel transport queues a bilingual message to exactly one envelope recipient', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'casino-mail-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const executable = join(directory, 'sendmail');
  await writeFile(executable, '#!/bin/sh\nprintf "%s\\n" "$@" > "$0.args"\ncat > "$0.eml"\n', { mode: 0o700 });
  const settings = join(directory, 'mail.env');
  await writeFile(settings, 'RESET_EMAIL_SENDMAIL=' + executable + '\nRESET_EMAIL_FROM=app@example.test\nPUBLIC_BASE_URL=https://casino.example.test/casinohabibi\n');
  const transport = configureTransactionalEmail({}, settings);
  assert.equal(transport.site.pathname, '/casinohabibi');
  const message = 'Vérifiez votre adresse en ouvrant ce lien de démonstration.';
  await transport.deliver('player@example.test', 'Récupération', message, 'request-123');
  const eml = await readFile(executable + '.eml', 'utf8');
  assert.deepEqual((await readFile(executable + '.args', 'utf8')).trim().split('\n'), ['-i', '-f', 'app@example.test', '--', 'player@example.test']);
  assert.equal(Buffer.from(eml.split('\r\n\r\n')[1], 'base64').toString('utf8'), message);
  assert.match(eml, /Message-ID: <[a-f0-9]{64}@example\.test>/);
  await assert.rejects(transport.deliver('a@example.test\r\nBcc: b@example.test', 'Test', message));
  await writeFile(executable, '#!/bin/sh\ncat >/dev/null\nexit 1\n');
  await assert.rejects(transport.deliver('player@example.test', 'Test', message));
  assert.throws(() => configureTransactionalEmail({ RESET_EMAIL_API_KEY: 'test' }, settings));
  assert.throws(() => configureTransactionalEmail({ PUBLIC_BASE_URL: 'http://example.test' }, settings));
});
