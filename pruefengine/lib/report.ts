import type { AnalysisResult, Finding, NicheConfig, ReportSection, Severity } from '@/config/schema';
import { site } from '@/config/site';
import { formatEuro } from './parse';

/**
 * PDF-Bericht.
 *
 * Fallstricke, die hier bewusst adressiert sind:
 * - Importpfad `pdfkit/js/pdfkit.standalone.js` plus
 *   `serverComponentsExternalPackages: ['pdfkit']` in next.config.mjs.
 *   Der normale Einstiegspunkt sucht seine Schriftmetriken zur Laufzeit im
 *   Dateisystem und findet sie im Lambda nicht.
 * - Jede Fußzeile nah am Seitenrand mit `lineBreak: false`, sonst erzeugt
 *   pdfkit beim Umbruch eine leere Folgeseite — und zwar für jede Seite eine.
 * - `flushPages()` vor `end()`, damit die Seitenzahlen der zuletzt
 *   geschriebenen Seiten noch im Dokument landen.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument: typeof import('pdfkit') = require('pdfkit/js/pdfkit.standalone.js');

const MARGIN = 56;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Wesentliche Abweichung',
  warn: 'Abweichung',
  info: 'Hinweis',
};

const SEVERITY_COLOR: Record<Severity, string> = {
  error: '#9a2b1f',
  warn: '#8a5a12',
  info: '#3c5a6e',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function euroRange(range: [number, number]): string {
  const fmt = (v: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v);
  return range[0] === range[1] ? `${fmt(range[0])} €` : `${fmt(range[0])} bis ${fmt(range[1])} €`;
}

type Doc = InstanceType<typeof PDFDocument>;

function heading(doc: Doc, text: string): void {
  if (doc.y > PAGE_HEIGHT - MARGIN - 120) doc.addPage();
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#14140f').text(text, { width: CONTENT_WIDTH });
  doc.moveTo(MARGIN, doc.y + 4).lineTo(PAGE_WIDTH - MARGIN, doc.y + 4).lineWidth(0.75).strokeColor('#c9c5b4').stroke();
  doc.moveDown(0.8);
}

function body(doc: Doc, text: string, options: { size?: number; color?: string; indent?: number } = {}): void {
  doc
    .font('Helvetica')
    .fontSize(options.size ?? 10)
    .fillColor(options.color ?? '#2c2b25')
    .text(text, MARGIN + (options.indent ?? 0), doc.y, {
      width: CONTENT_WIDTH - (options.indent ?? 0),
      align: 'left',
      lineGap: 2.2,
    });
}

function labelled(doc: Doc, label: string, value: string): void {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#57564d').text(label, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.12);
  body(doc, value);
  doc.moveDown(0.5);
}

function renderFinding(doc: Doc, finding: Finding, index: number): void {
  if (doc.y > PAGE_HEIGHT - MARGIN - 170) doc.addPage();

  doc.moveDown(0.6);
  const top = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#14140f')
    .text(`${index}. ${finding.label}`, MARGIN, top, { width: CONTENT_WIDTH - 130 });

  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(SEVERITY_COLOR[finding.severity])
    .text(`${SEVERITY_LABEL[finding.severity]}  ·  ${finding.checkId}`, PAGE_WIDTH - MARGIN - 130, top + 1, {
      width: 130,
      align: 'right',
    });

  doc.y = Math.max(doc.y, top + 16);
  doc.moveDown(0.35);

  body(doc, finding.observation);
  doc.moveDown(0.45);

  labelled(doc, 'Fundstelle im Dokument', `„${finding.documentRef}"`);
  labelled(doc, 'Grundlage', finding.basis);
  labelled(doc, 'Ihr nächster Schritt', finding.action);

  if (finding.euroImpact) {
    const suffix = finding.euroCapped ? ' (Obergrenze auf einen plausiblen Anteil der Dokumentsumme begrenzt)' : '';
    labelled(doc, 'Finanzieller Effekt, geschätzte Spanne', `${euroRange(finding.euroImpact)}${suffix}`);
  }

  doc.moveTo(MARGIN, doc.y + 2).lineTo(PAGE_WIDTH - MARGIN, doc.y + 2).lineWidth(0.5).strokeColor('#e2dfd3').stroke();
  doc.moveDown(0.4);
}

function sectionSummary(doc: Doc, result: AnalysisResult, niche: NicheConfig): void {
  heading(doc, 'Das Ergebnis in Kürze');

  const counts = { error: 0, warn: 0, info: 0 } as Record<Severity, number>;
  for (const f of result.findings) counts[f.severity] += 1;

  body(
    doc,
    `Geprüft wurde ein Dokument der Art „${niche.input.docLabel}" gegen ${result.checkedIds.length} von ${niche.catalogue.checks.length} Prüfpunkten des Prüfkatalogs ${niche.catalogue.version}. ${result.findings.length === 1 ? 'Es gibt eine Feststellung.' : `Es gibt ${result.findings.length} Feststellungen.`}`,
  );
  doc.moveDown(0.6);

  const rows: Array<[string, string]> = [
    ['Wesentliche Abweichungen', String(counts.error)],
    ['Abweichungen', String(counts.warn)],
    ['Hinweise', String(counts.info)],
    ['Prüfdatum', formatDate(result.createdAt)],
    ['Katalogversion', result.catalogueVersion],
  ];
  if (result.anchorValueCents !== null) {
    rows.splice(3, 0, [niche.input.anchorField.label, formatEuro(result.anchorValueCents)]);
  }

  for (const [label, value] of rows) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#57564d').text(label, MARGIN, y, { width: 260 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#14140f').text(value, MARGIN + 260, y, { width: 180 });
    doc.moveDown(0.25);
  }

  if (result.docSummary) {
    doc.moveDown(0.6);
    body(doc, result.docSummary, { color: '#57564d' });
  }
}

function sectionFindings(doc: Doc, result: AnalysisResult): void {
  heading(doc, 'Feststellungen im Einzelnen');
  if (result.findings.length === 0) {
    body(doc, 'Zu den geprüften Punkten gibt es keine Feststellung.');
    return;
  }
  result.findings.forEach((finding, i) => renderFinding(doc, finding, i + 1));
}

function sectionActions(doc: Doc, result: AnalysisResult): void {
  heading(doc, 'Ihre Sätze zum Mitnehmen');
  body(
    doc,
    'Jeder Satz gehört zu genau einer Feststellung und ist so formuliert, dass Sie ihn wörtlich schreiben oder sagen können.',
    { color: '#57564d' },
  );
  doc.moveDown(0.7);

  result.findings.forEach((finding, i) => {
    if (doc.y > PAGE_HEIGHT - MARGIN - 70) doc.addPage();
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#57564d').text(`${i + 1}.`, MARGIN, y, { width: 18 });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#2c2b25')
      .text(finding.action, MARGIN + 18, y, { width: CONTENT_WIDTH - 18, lineGap: 2.2 });
    doc.moveDown(0.5);
  });
}

function sectionEuro(doc: Doc, result: AnalysisResult): void {
  heading(doc, 'Finanzielle Einordnung');

  // Rechennische: die Aussage ist der Vergleich der Forderung mit dem Band.
  if (result.compute) {
    const { band, claimEuro, position, deviationPercent } = result.compute;
    if (!band) {
      body(doc, 'Für diese Unterlagen ließ sich kein Band ermitteln.');
      return;
    }

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#14140f').text(euroRange(band), { width: CONTENT_WIDTH });
    doc.moveDown(0.3);
    body(doc, 'So hoch fällt die Nachrechnung nach eigenem Rechenweg aus — als Band, nicht als Punktwert.', {
      color: '#57564d',
    });

    if (claimEuro !== null && position) {
      doc.moveDown(0.6);
      labelled(
        doc,
        'Gefordert wird',
        `${euroRange([Math.round(claimEuro), Math.round(claimEuro)])} — das liegt ${position} des errechneten Bandes${
          position !== 'innerhalb' && deviationPercent !== null
            ? ` (${deviationPercent.toFixed(1)} Prozent)`
            : ''
        }.`,
      );
    }

    doc.moveDown(0.3);
    body(
      doc,
      'Das Band ist eine Nachrechnung, keine Feststellung darüber, welcher Betrag geschuldet ist. Die ersparten Verwaltungs- und Risikokosten sind Schätzgrößen; ein Punktwert wäre an dieser Stelle Scheingenauigkeit.',
      { color: '#57564d' },
    );
    return;
  }

  if (!result.euroTotal) {
    body(
      doc,
      'Für dieses Dokument lässt sich keine belastbare Spanne beziffern. Eine Schätzung ohne Zahlengrundlage im Dokument geben wir bewusst nicht ab.',
    );
    return;
  }

  doc.font('Helvetica-Bold').fontSize(15).fillColor('#14140f').text(euroRange(result.euroTotal), { width: CONTENT_WIDTH });
  doc.moveDown(0.4);
  body(
    doc,
    'Das ist die Summe der bezifferbaren Feststellungen als Spanne. Feststellungen, die sich auf dieselbe Position beziehen, sind nur einmal gezählt. Die Spanne ist eine Schätzung auf Grundlage der Zahlen im Dokument, keine Forderung und keine Zusage.',
    { color: '#57564d' },
  );
}

function sectionLetter(doc: Doc, result: AnalysisResult, niche: NicheConfig): void {
  heading(doc, 'Anschreiben an den Betrieb');
  body(
    doc,
    'Vorschlag zum Übernehmen. Ergänzen Sie Anrede, Datum und Ihre Kontaktdaten. Der Text nennt nur Feststellungen und bittet um Klärung.',
    { color: '#57564d' },
  );
  doc.moveDown(0.8);

  const boxTop = doc.y;
  const lines: string[] = [
    `Betreff: Rückfragen zu Ihrer Rechnung${result.docSummary ? '' : ''}`,
    '',
    'Sehr geehrte Damen und Herren,',
    '',
    `vielen Dank für Ihre Rechnung. Bevor ich sie ausgleiche, habe ich ${result.findings.length === 1 ? 'eine Rückfrage' : `${result.findings.length} Rückfragen`}:`,
    '',
    ...result.findings.map((f, i) => `${i + 1}. ${f.action}`),
    '',
    'Bitte lassen Sie mir dazu eine kurze Rückmeldung zukommen. Sobald die Punkte geklärt sind, überweise ich den dann offenen Betrag umgehend.',
    '',
    'Mit freundlichen Grüßen',
  ];

  for (const line of lines) {
    if (doc.y > PAGE_HEIGHT - MARGIN - 60) doc.addPage();
    if (line === '') {
      doc.moveDown(0.5);
      continue;
    }
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#2c2b25')
      .text(line, MARGIN + 12, doc.y, { width: CONTENT_WIDTH - 24, lineGap: 2.4 });
    doc.moveDown(0.2);
  }

  doc.moveDown(0.4);
  body(doc, `Prüfkatalog ${niche.catalogue.version} · ${niche.brand.name}`, { color: '#8a897e', size: 8.5, indent: 12 });
  void boxTop;
}

function sectionChecklist(doc: Doc, result: AnalysisResult): void {
  heading(doc, 'Positionsliste zum Abhaken');
  body(doc, 'Für das Gespräch: eine Zeile je Feststellung, mit Platz für die Antwort des Betriebs.', {
    color: '#57564d',
  });
  doc.moveDown(0.7);

  for (const finding of result.findings) {
    if (doc.y > PAGE_HEIGHT - MARGIN - 60) doc.addPage();
    const y = doc.y;
    doc.rect(MARGIN, y + 1.5, 9, 9).lineWidth(0.75).strokeColor('#8a897e').stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#14140f')
      .text(`${finding.checkId} — ${finding.label}`, MARGIN + 18, y, { width: CONTENT_WIDTH - 18 });
    doc.moveDown(0.15);
    doc.font('Helvetica').fontSize(9).fillColor('#8a897e').text('Antwort: ', MARGIN + 18, doc.y, { width: 60, continued: false });
    doc
      .moveTo(MARGIN + 60, doc.y - 2)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y - 2)
      .lineWidth(0.5)
      .strokeColor('#c9c5b4')
      .stroke();
    doc.moveDown(0.9);
  }
}

/**
 * Rechenweg einer Rechennische.
 *
 * Der Abschnitt existiert, damit der Bericht überprüfbar ist statt geglaubt
 * werden zu müssen: jeder Eingangswert, jeder Zwischenschritt, die Kennung
 * der Zinsreihe und ihr Stand. Wer nachrechnen will, kann es damit.
 */
function sectionCalculation(doc: Doc, result: AnalysisResult): void {
  const compute = result.compute;
  if (!compute) return;

  heading(doc, 'Der Rechenweg');

  body(
    doc,
    'Die folgenden Werte sind in die Nachrechnung eingegangen. Sie stammen aus Ihren Unterlagen und aus Ihren eigenen Angaben; gerechnet hat sie kein Sprachmodell, sondern geprüfter Programmcode.',
    { color: '#57564d' },
  );
  doc.moveDown(0.8);

  for (const step of compute.steps) {
    if (doc.y > PAGE_HEIGHT - MARGIN - 90) doc.addPage();

    const y = doc.y;
    doc.font('Helvetica').fontSize(9.5).fillColor('#57564d').text(step.label, MARGIN, y, { width: 210 });
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#14140f')
      .text(step.value, MARGIN + 215, y, { width: CONTENT_WIDTH - 215 });

    if (step.note) {
      doc.moveDown(0.15);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#8a897e')
        .text(step.note, MARGIN + 215, doc.y, { width: CONTENT_WIDTH - 215, lineGap: 1.4 });
    }
    doc.moveDown(0.55);
  }

  doc.moveDown(0.4);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(0.5).strokeColor('#e2dfd3').stroke();
  doc.moveDown(0.6);

  body(
    doc,
    `Zinsreihe: ${compute.dataSource.id}, Stand ${compute.dataSource.asOf}. Rechner: ${compute.calculatorId}. Gerechnet am ${formatDate(compute.computedAt)}.`,
    { size: 8.5, color: '#8a897e' },
  );

  if (!compute.dataSource.verified) {
    doc.moveDown(0.3);
    body(
      doc,
      'Hinweis: Die verwendete Zinsreihe ist im System nicht als geprüft markiert. Dieser Bericht ist damit nicht für den Livebetrieb bestimmt.',
      { size: 8.5, color: '#9a2b1f' },
    );
  }
}

function sectionMethod(doc: Doc, result: AnalysisResult, niche: NicheConfig): void {
  heading(doc, 'Wie geprüft wurde');
  body(
    doc,
    [
      `Grundlage ist der veröffentlichte Prüfkatalog „${niche.brand.name}" in der Version ${result.catalogueVersion} mit ${niche.catalogue.checks.length} Prüfpunkten. Jeder Prüfpunkt nennt seine Grundlage: eine Norm oder ein benanntes Referenzband.`,
      '',
      `Das hochgeladene Dokument wurde maschinell gelesen und gegen diese Prüfpunkte abgeglichen. Von den ${niche.catalogue.checks.length} Punkten waren an diesem Dokument ${result.checkedIds.length} prüfbar. Nicht prüfbare Punkte erscheinen nicht als Feststellung.`,
      '',
      'Ihre eigenen Angaben — insbesondere die von Ihnen abgelesene Endsumme — dienten als Anker gegen Lesefehler.',
      '',
      'Geschätzte Beträge sind immer Spannen und immer auf einen plausiblen Anteil der Dokumentsumme begrenzt. Überschneiden sich zwei Feststellungen wirtschaftlich, wird nur eine davon gezählt.',
    ].join('\n'),
  );

  if (result.sanitizeLog.length > 0) {
    doc.moveDown(0.6);
    body(doc, `Nachträgliche Korrekturen an der Ausgabe: ${result.sanitizeLog.length}. Sie sind im gespeicherten Ergebnis protokolliert.`, {
      color: '#8a897e',
      size: 8.5,
    });
  }
}

function sectionCatalogue(doc: Doc, result: AnalysisResult, niche: NicheConfig): void {
  heading(doc, `Prüfkatalog ${niche.catalogue.version}`);
  body(doc, 'Alle Prüfpunkte, gegen die geprüft wurde. Angehakt sind die Punkte, zu denen es eine Feststellung gibt.', {
    color: '#57564d',
  });
  doc.moveDown(0.7);

  const hits = new Set(result.findings.map((f) => f.checkId));

  for (const check of niche.catalogue.checks) {
    if (doc.y > PAGE_HEIGHT - MARGIN - 50) doc.addPage();
    const y = doc.y;
    const marker = hits.has(check.id) ? '×' : '·';
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(hits.has(check.id) ? SEVERITY_COLOR[check.severity] : '#8a897e')
      .text(marker, MARGIN, y, { width: 10 });
    doc
      .font(hits.has(check.id) ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor('#2c2b25')
      .text(`${check.id}  ${check.label}`, MARGIN + 12, y, { width: CONTENT_WIDTH - 12 });
    doc.font('Helvetica').fontSize(8).fillColor('#8a897e').text(check.basis, MARGIN + 12, doc.y, { width: CONTENT_WIDTH - 12 });
    doc.moveDown(0.45);
  }
}

function sectionLegal(doc: Doc, niche: NicheConfig): void {
  heading(doc, 'Rechtliche Einordnung');
  body(doc, niche.legal.disclaimer);
  doc.moveDown(0.5);
  body(doc, niche.legal.professionalAdviceNote);
  doc.moveDown(0.5);
  body(doc, `Anbieter: ${niche.legal.imprintEntity || site.provider.entity}, ${site.provider.zipCity}. ${site.provider.vatNote}`, {
    color: '#8a897e',
    size: 8.5,
  });
}

const RENDERERS: Record<ReportSection, (doc: Doc, result: AnalysisResult, niche: NicheConfig) => void> = {
  summary: (d, r, n) => sectionSummary(d, r, n),
  findings: (d, r) => sectionFindings(d, r),
  actions: (d, r) => sectionActions(d, r),
  euro: (d, r) => sectionEuro(d, r),
  calculation: (d, r) => sectionCalculation(d, r),
  letter: (d, r, n) => sectionLetter(d, r, n),
  checklist: (d, r) => sectionChecklist(d, r),
  method: (d, r, n) => sectionMethod(d, r, n),
  catalogue: (d, r, n) => sectionCatalogue(d, r, n),
  legal: (d, _r, n) => sectionLegal(d, n),
};

function coverAndHeader(doc: Doc, result: AnalysisResult, niche: NicheConfig): void {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(niche.brand.accent).text(site.name.toUpperCase(), MARGIN, MARGIN, {
    characterSpacing: 1.4,
    width: CONTENT_WIDTH,
  });
  doc.moveDown(1.4);

  doc.font('Helvetica-Bold').fontSize(23).fillColor('#14140f').text(`Prüfbericht ${niche.brand.name}`, {
    width: CONTENT_WIDTH,
    lineGap: 1,
  });
  doc.moveDown(0.4);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#57564d')
    .text(
      `Prüfdatum ${formatDate(result.createdAt)} · Katalogversion ${result.catalogueVersion} · Bericht-Nr. ${result.id.slice(0, 8)}`,
      { width: CONTENT_WIDTH },
    );

  doc.moveTo(MARGIN, doc.y + 10).lineTo(PAGE_WIDTH - MARGIN, doc.y + 10).lineWidth(1.2).strokeColor(niche.brand.accent).stroke();
  doc.y += 16;
}

/**
 * Fußzeile auf jeder Seite.
 *
 * Zwei Dinge sind hier nötig, nicht eines:
 * - `lineBreak: false`, damit der Text nicht umbricht und dabei über den
 *   Seitenrand hinausläuft.
 * - `page.margins.bottom = 0` für die Dauer des Schreibens. Ohne das legt
 *   pdfkit für jeden Text unterhalb des unteren Rands eine neue Seite an —
 *   auch mit lineBreak: false. Ergebnis wäre ein Bericht mit einer leeren
 *   Seite hinter jeder gefüllten und Fußzeilen auf den falschen Seiten.
 */
function paintFooters(doc: Doc, result: AnalysisResult, niche: NicheConfig): void {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    const restore = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = PAGE_HEIGHT - MARGIN + 14;

    doc.moveTo(MARGIN, y - 8).lineTo(PAGE_WIDTH - MARGIN, y - 8).lineWidth(0.5).strokeColor('#e2dfd3').stroke();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#8a897e')
      .text(
        `${site.name} · ${niche.brand.name} · Katalog ${result.catalogueVersion} · Keine Rechts-, Steuer- oder Fachberatung`,
        MARGIN,
        y,
        { width: CONTENT_WIDTH - 70, lineBreak: false },
      )
      .text(`Seite ${i - range.start + 1} von ${range.count}`, PAGE_WIDTH - MARGIN - 70, y, {
        width: 70,
        align: 'right',
        lineBreak: false,
      });

    doc.page.margins.bottom = restore;
  }
}

/** Abschnitte dieser Bestellung: Tarif-Override schlägt Nischen-Vorgabe. */
export function sectionsFor(niche: NicheConfig, tierId?: string): ReportSection[] {
  const tier = niche.pricing.tiers.find((t) => t.id === tierId);
  return tier?.sections ?? niche.report.sections;
}

export async function buildReportPdf(result: AnalysisResult, niche: NicheConfig): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: `Prüfbericht ${niche.brand.name} — ${result.id.slice(0, 8)}`,
      Author: site.name,
      Subject: `${niche.legal.serviceDescription} (Katalogversion ${result.catalogueVersion})`,
      Keywords: `${niche.slug}, Prüfkatalog ${result.catalogueVersion}`,
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    doc.on('end', () => resolve());
    doc.on('error', reject);
  });

  coverAndHeader(doc, result, niche);

  for (const section of sectionsFor(niche, result.tier)) {
    const render = RENDERERS[section];
    if (render) render(doc, result, niche);
  }

  paintFooters(doc, result, niche);

  // flushPages() vor end(): sonst fehlen die zuletzt gemalten Fußzeilen.
  doc.flushPages();
  doc.end();

  await done;
  return Buffer.concat(chunks);
}
