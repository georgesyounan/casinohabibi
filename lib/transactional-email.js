import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { constants, accessSync, existsSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { parseEnv } from 'node:util';

const mailbox = /^[^@\s,;:<>()\[\]"\\\x00-\x1f\x7f]+@[\w.-]+\.[\w-]+$/u;

export function configureTransactionalEmail(environment, file = new URL('../.env.mail', import.meta.url)) {
  const local = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  const setting = (name) => environment[name] ?? local[name] ?? '';
  const apiKey = setting('RESET_EMAIL_API_KEY');
  const sendmail = setting('RESET_EMAIL_SENDMAIL');
  const from = setting('RESET_EMAIL_FROM');
  const base = setting('PUBLIC_BASE_URL');
  const site = base ? new URL(base) : null;
  const enabled = Boolean(apiKey || sendmail);
  if (enabled || from || site) {
    if (!enabled || (apiKey && sendmail) || !mailbox.test(from) || site?.protocol !== 'https:' || site.username || site.password) {
      throw new Error('Configure one mail transport, a sender address and an HTTPS PUBLIC_BASE_URL');
    }
    if (sendmail) {
      if (!isAbsolute(sendmail)) throw new Error('RESET_EMAIL_SENDMAIL must be an absolute path');
      accessSync(sendmail, constants.X_OK);
    }
  }

  async function deliver(to, subject, text, deliveryId) {
    if (!enabled || !mailbox.test(to)) throw new Error('Invalid transactional email destination');
    if (sendmail) {
      const id = deliveryId ? createHash('sha256').update(deliveryId).digest('hex') : randomUUID();
      const encodedBody = Buffer.from(text).toString('base64').match(/.{1,76}/g) || [];
      const lines = [
        'From: <' + from + '>', 'To: <' + to + '>', 'Date: ' + new Date().toUTCString(),
        'Message-ID: <' + id + '@' + from.split('@')[1] + '>',
        'Subject: =?UTF-8?B?' + Buffer.from(subject).toString('base64') + '?=',
        'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', ...encodedBody, ''
      ];
      await new Promise((resolve, reject) => {
        const child = execFile(sendmail, ['-i', '-f', from, '--', to], { timeout: 12_000, killSignal: 'SIGKILL' },
          (error) => error ? reject(new Error('Transactional email was not accepted')) : resolve());
        child.stdin.on('error', reject);
        child.stdin.end(lines.join('\r\n'));
      });
      return;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json',
        ...(deliveryId && { 'Idempotency-Key': deliveryId }) },
      signal: AbortSignal.timeout(12_000), body: JSON.stringify({ from, to: [to], subject, text })
    });
    if (!response.ok) throw new Error('Transactional email delivery failed');
  }
  return { site, enabled, deliver };
}
