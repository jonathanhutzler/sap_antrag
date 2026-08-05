import { Resend } from 'resend';
import type { AnalysisResult, NicheConfig } from '@/config/schema';
import { site, siteUrl } from '@/config/site';

/**
 * Zustellung des Berichts.
 *
 * Stripes eigene Quittung ist im Dashboard abzuschalten (Einstellungen →
 * Zahlungen → Kunden-E-Mails). Sonst bekommt der Kunde zwei Mails aus zwei
 * Systemen, von denen nur eine den Bericht enthält.
 */

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

export async function sendReportMail(
  result: AnalysisResult,
  niche: NicheConfig,
  pdf: Buffer,
): Promise<{ sent: boolean; reason?: string }> {
  const client = getResend();
  if (!client) return { sent: false, reason: 'RESEND_API_KEY fehlt' };
  if (!result.customerEmail) return { sent: false, reason: 'keine E-Mail-Adresse' };

  const link = `${siteUrl(`/${niche.slug}/ergebnis/${result.id}`)}`;
  const tier = niche.pricing.tiers.find((t) => t.id === result.tier);

  const text = [
    'Guten Tag,',
    '',
    `im Anhang finden Sie Ihren Prüfbericht (${tier?.label ?? 'Vollbericht'}).`,
    '',
    `Geprüft wurde gegen den Prüfkatalog „${niche.brand.name}" in der Version ${result.catalogueVersion}.`,
    `Diese Versionsnummer steht auch im Bericht — damit bleibt nachvollziehbar, nach welchem Maßstab`,
    'geprüft wurde, auch in einem halben Jahr.',
    '',
    `Online abrufbar: ${link}`,
    '',
    niche.legal.disclaimer,
    '',
    `Fragen? Antworten Sie einfach auf diese E-Mail oder schreiben Sie an ${site.support.inbox}.`,
    '',
    site.name,
  ].join('\n');

  const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#14140f;max-width:34rem">
  <p>Guten Tag,</p>
  <p>im Anhang finden Sie Ihren Prüfbericht (${tier?.label ?? 'Vollbericht'}).</p>
  <p>Geprüft wurde gegen den Prüfkatalog „${niche.brand.name}" in der Version
     <strong>${result.catalogueVersion}</strong>. Diese Versionsnummer steht auch im Bericht — damit
     bleibt nachvollziehbar, nach welchem Maßstab geprüft wurde, auch in einem halben Jahr.</p>
  <p><a href="${link}" style="color:${niche.brand.accent}">Bericht online ansehen</a></p>
  <p style="font-size:13px;color:#57564d">${niche.legal.disclaimer}</p>
  <p style="font-size:13px;color:#57564d">Fragen? Antworten Sie auf diese E-Mail oder schreiben Sie an
     <a href="mailto:${site.support.inbox}" style="color:${niche.brand.accent}">${site.support.inbox}</a>.</p>
  <p style="font-size:13px;color:#8a897e">${site.name}</p>
</div>`;

  try {
    await client.emails.send({
      from: site.support.mailFrom,
      to: result.customerEmail,
      replyTo: site.support.inbox,
      subject: `Ihr Prüfbericht — ${niche.brand.name}`,
      text,
      html,
      attachments: [
        {
          filename: `Pruefbericht-${niche.slug}-${result.id.slice(0, 8)}.pdf`,
          content: pdf.toString('base64'),
        },
      ],
    });
    return { sent: true };
  } catch (err) {
    console.error(JSON.stringify({ type: 'mail_error', resultId: result.id, error: String(err) }));
    return { sent: false, reason: 'Versand fehlgeschlagen' };
  }
}
