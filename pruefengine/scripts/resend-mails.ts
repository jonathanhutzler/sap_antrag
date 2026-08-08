/**
 * Nachsenden fehlgeschlagener Mails.
 *
 *   npm run mail:resend          zeigt die Warteschlange
 *   npm run mail:resend -- --go  sendet nach
 *
 * Braucht dieselben Umgebungsvariablen wie die Anwendung (Upstash, Resend).
 * Am einfachsten: `vercel env pull .env.local` und dann von dort laden.
 *
 * Warum ein Skript und kein Cronjob: Der Fall ist selten und gehört gesehen.
 * Ein Automatismus, der still nachsendet, verdeckt genau die Ursache, die man
 * finden will.
 */

import { loadEnv } from './env';
import { findNiche } from '../config/registry';
import { loadResult } from '../lib/store';
import { buildReportPdf } from '../lib/report';
import { sendConfirmationMail, sendReportMail } from '../lib/mail';
import { clearFailedMail, listFailedMails } from '../lib/mailqueue';

loadEnv();

async function main() {
  const send = process.argv.includes('--go');
  const queue = await listFailedMails();

  if (queue.length === 0) {
    console.log('Warteschlange leer.');
    return;
  }

  console.log(`${queue.length} offene Mail(s):\n`);
  for (const entry of queue) {
    console.log(
      `  ${entry.kind.padEnd(12)} ${entry.resultId}  ${entry.niche}  ${entry.attempts}× versucht, zuletzt ${entry.failedAt}`,
    );
    console.log(`  ${''.padEnd(12)} Grund: ${entry.reason}`);
  }

  if (!send) {
    console.log('\nNichts gesendet. Mit --go noch einmal aufrufen.');
    return;
  }

  console.log('');
  let ok = 0;
  let failed = 0;

  for (const entry of queue) {
    const niche = findNiche(entry.niche);
    const result = await loadResult(entry.resultId);

    if (!niche || !result) {
      console.log(`  ✗ ${entry.resultId} (${entry.kind}): Vorgang oder Nische nicht mehr vorhanden.`);
      failed += 1;
      continue;
    }

    try {
      const outcome =
        entry.kind === 'confirmation'
          ? await sendConfirmationMail(result, niche)
          : await sendReportMail(result, niche, await buildReportPdf(result, niche));

      if (outcome.sent) {
        await clearFailedMail(entry.resultId, entry.kind);
        console.log(`  ✓ ${entry.resultId} (${entry.kind}) gesendet.`);
        ok += 1;
      } else {
        console.log(`  ✗ ${entry.resultId} (${entry.kind}): ${outcome.reason}`);
        failed += 1;
      }
    } catch (err) {
      console.log(`  ✗ ${entry.resultId} (${entry.kind}): ${String(err)}`);
      failed += 1;
    }
  }

  console.log(`\n${ok} gesendet, ${failed} weiterhin offen.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
