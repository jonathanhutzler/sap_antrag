import { Resend } from 'resend';
import type { AnalysisResult, NicheConfig } from '@/config/schema';
import { site, siteUrl } from '@/config/site';
import { formatEuro } from './parse';
import { loadWaiver } from './legal';
import { WAIVER_TEXT } from './waiver';

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

function formatDateTime(iso: string | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

/**
 * Vertragsbestätigung nach § 312f BGB.
 *
 * Pflicht nach jedem Kauf, auf dauerhaftem Datenträger, mit dem Inhalt des
 * Vertrages. Sie ist außerdem das dritte Element aus § 356 Abs. 5 BGB: ohne
 * sie erlischt das Widerrufsrecht nicht, egal wie sauber die Ankreuzerklärung
 * eingeholt wurde.
 *
 * Bewusst eine eigene Mail und kein Absatz in der Berichtsmail. Der Bericht
 * kann scheitern — ein zu großes PDF, ein Fehler beim Rendern —, die
 * Bestätigung darf davon nicht abhängen.
 */
export async function sendConfirmationMail(
  result: AnalysisResult,
  niche: NicheConfig,
): Promise<{ sent: boolean; reason?: string }> {
  const client = getResend();
  if (!client) return { sent: false, reason: 'RESEND_API_KEY fehlt' };
  if (!result.customerEmail) return { sent: false, reason: 'keine E-Mail-Adresse' };

  const tier = niche.pricing.tiers.find((t) => t.id === result.tier);
  const waiver = await loadWaiver(result.id);
  const waiverText = waiver?.text ?? WAIVER_TEXT;
  const p = site.provider;

  const rows: Array<[string, string]> = [
    ['Vorgangsnummer', result.id],
    ['Vertragsschluss', formatDateTime(result.paidAt)],
    ['Leistung', `${tier?.label ?? 'Vollbericht'} — ${niche.brand.name}`],
    ['Prüfkatalog', `Version ${result.catalogueVersion}`],
    ['Preis', tier ? `${formatEuro(tier.priceCents)} (Endpreis)` : '—'],
  ];
  if (p.smallBusiness) {
    rows.push(['Umsatzsteuer', 'Kein Ausweis, Kleinunternehmer nach § 19 UStG']);
  }

  const text = [
    'Guten Tag,',
    '',
    'hiermit bestätigen wir Ihren Vertrag. Bitte bewahren Sie diese E-Mail auf.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Anbieter:',
    p.entity,
    p.street,
    p.zipCity,
    p.country,
    p.email,
    '',
    'Widerrufsrecht:',
    'Sie haben vor dem Kauf folgende Erklärung abgegeben:',
    `„${waiverText}"`,
    waiver?.acceptedAt ? `Abgegeben am ${formatDateTime(waiver.acceptedAt)}.` : '',
    'Da wir mit der Ausführung sofort begonnen haben, ist Ihr Widerrufsrecht nach § 356 Abs. 5 BGB erloschen.',
    `Die vollständige Widerrufsbelehrung: ${siteUrl('/recht/widerruf')}`,
    '',
    'Vertragsbedingungen:',
    `AGB: ${siteUrl('/recht/agb')}`,
    `Datenschutz: ${siteUrl('/recht/datenschutz')}`,
    `Prüfkatalog: ${siteUrl(`/${niche.slug}/pruefkatalog`)}`,
    '',
    'Zur Verarbeitung: Ihr Dokument wird automatisiert ausgewertet. Beteiligt ist Anthropic PBC',
    'als Auftragsverarbeiter. Die Auswertung ist eine technische Plausibilitätsprüfung, keine',
    'Rechtsberatung, keine Steuerberatung und kein Sachverständigengutachten.',
    '',
    `Fragen? Antworten Sie auf diese E-Mail oder schreiben Sie an ${site.support.inbox}.`,
    '',
    site.name,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#14140f;max-width:34rem">
  <p>Guten Tag,</p>
  <p>hiermit bestätigen wir Ihren Vertrag. Bitte bewahren Sie diese E-Mail auf.</p>
  <table style="border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:3px 16px 3px 0;color:#57564d">${label}</td><td style="padding:3px 0"><strong>${value}</strong></td></tr>`,
      )
      .join('')}
  </table>
  <p style="font-size:14px"><strong>Anbieter</strong><br>${p.entity}<br>${p.street}<br>${p.zipCity}<br>${p.country}<br>
     <a href="mailto:${p.email}" style="color:${niche.brand.accent}">${p.email}</a></p>
  <p style="font-size:14px"><strong>Widerrufsrecht</strong><br>Sie haben vor dem Kauf folgende Erklärung abgegeben:</p>
  <blockquote style="margin:0 0 12px;padding-left:12px;border-left:3px solid #d8d6cc;font-size:14px;color:#57564d">${waiverText}</blockquote>
  <p style="font-size:14px">${waiver?.acceptedAt ? `Abgegeben am ${formatDateTime(waiver.acceptedAt)}. ` : ''}Da wir mit der Ausführung sofort begonnen haben, ist Ihr Widerrufsrecht nach § 356 Abs. 5 BGB erloschen.
     <a href="${siteUrl('/recht/widerruf')}" style="color:${niche.brand.accent}">Vollständige Widerrufsbelehrung</a></p>
  <p style="font-size:14px"><a href="${siteUrl('/recht/agb')}" style="color:${niche.brand.accent}">AGB</a> ·
     <a href="${siteUrl('/recht/datenschutz')}" style="color:${niche.brand.accent}">Datenschutz</a> ·
     <a href="${siteUrl(`/${niche.slug}/pruefkatalog`)}" style="color:${niche.brand.accent}">Prüfkatalog</a></p>
  <p style="font-size:13px;color:#57564d">Ihr Dokument wird automatisiert ausgewertet. Beteiligt ist Anthropic PBC als
     Auftragsverarbeiter. Die Auswertung ist eine technische Plausibilitätsprüfung, keine Rechtsberatung, keine
     Steuerberatung und kein Sachverständigengutachten.</p>
  <p style="font-size:13px;color:#8a897e">${site.name}</p>
</div>`;

  try {
    await client.emails.send({
      from: site.support.mailFrom,
      to: result.customerEmail,
      replyTo: site.support.inbox,
      subject: `Bestellbestätigung — ${niche.brand.name}`,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(JSON.stringify({ type: 'mail_error', kind: 'confirmation', resultId: result.id, error: String(err) }));
    return { sent: false, reason: 'Versand fehlgeschlagen' };
  }
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
    console.error(JSON.stringify({ type: 'mail_error', kind: 'report', resultId: result.id, error: String(err) }));
    return { sent: false, reason: 'Versand fehlgeschlagen' };
  }
}
