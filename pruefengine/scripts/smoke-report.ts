/**
 * Rauchtest für die PDF-Erzeugung.
 *
 * Prüft die drei pdfkit-Fallstricke auf einmal: den Importpfad
 * (pdfkit.standalone.js), Fußzeilen ohne erzeugte Leerseiten und
 * flushPages() vor end(). Wenn dieser Test läuft, läuft der Bericht.
 *
 * Aufruf: npm run smoke:report
 */
import { writeFileSync } from 'fs';
import { handwerkerrechnung } from '../config/niches/handwerkerrechnung';
import { buildReportPdf } from '../lib/report';
import type { AnalysisResult } from '../config/schema';

const result: AnalysisResult = {
  id: 'smoketest0000000',
  niche: handwerkerrechnung.slug,
  catalogueVersion: handwerkerrechnung.catalogue.version,
  experimentId: handwerkerrechnung.experiment.id,
  createdAt: new Date().toISOString(),
  assessable: true,
  docSummary:
    'Rechnung eines SHK-Betriebs über die Beseitigung einer Störung an der Warmwasserbereitung. Abgerechnet nach Aufwand mit 6,5 Monteurstunden, zwei Anfahrten und einer Pauschalposition. Endsumme 1.184,05 Euro brutto.',
  anchorValueCents: 118405,
  context: { gewerk: 'Sanitär, Heizung, Klima', auftragsart: 'Reparatur oder Störungsbeseitigung' },
  findings: [
    {
      checkId: 'HR-06',
      label: 'Leistungsbeschreibung ausreichend konkret',
      category: 'Pflichtangaben',
      severity: 'error',
      observation:
        'Position 3 ist mit „Reparaturarbeiten, pauschal" bezeichnet. Art und Umfang der Leistung sind daraus nicht erkennbar.',
      documentRef: 'Pos. 3 Reparaturarbeiten, pauschal — 85,00',
      action:
        'Bitte schlüsseln Sie Position 3 nach Art und Umfang der Arbeiten auf, damit ich die Rechnung nachvollziehen kann.',
      basis: '§ 14 Abs. 4 Nr. 5 UStG',
    },
    {
      checkId: 'HR-15',
      label: 'Stundenverrechnungssatz außerhalb des üblichen Bandes',
      category: 'Preis und Kalkulation',
      severity: 'warn',
      observation:
        'Der Stundensatz beträgt 118,00 Euro netto. Das übliche Referenzband liegt bei 55 bis 95 Euro netto je Monteurstunde.',
      documentRef: 'Pos. 1 Monteurstunden, 6,5 Std. à 118,00',
      action:
        'Bitte erläutern Sie mir, worauf sich der Stundensatz von 118,00 Euro stützt, oder passen Sie ihn an den üblichen Rahmen an.',
      basis: 'Referenzband: 55 bis 95 Euro netto je Monteurstunde',
      euroImpact: [100, 150],
      euroCapped: true,
    },
    {
      checkId: 'HR-17',
      label: 'An- und Abfahrt ohne Vereinbarung oder doppelt berechnet',
      category: 'Preis und Kalkulation',
      severity: 'warn',
      observation:
        'Es sind zwei Anfahrten zu je 65,00 Euro abgerechnet. Im Leistungszeitraum ist nur ein Einsatztag genannt.',
      documentRef: 'Pos. 2 An- und Abfahrt, 2 Fahrten à 65,00',
      action:
        'Bitte teilen Sie mir mit, an welchen zwei Tagen die Anfahrten stattgefunden haben, oder nehmen Sie eine der beiden Positionen heraus.',
      basis: '§ 632 Abs. 2 BGB',
      euroImpact: [65, 65],
    },
  ],
  euroTotal: [165, 215],
  checkedIds: handwerkerrechnung.catalogue.checks.slice(0, 24).map((c) => c.id),
  model: 'smoke-test',
  paid: true,
  tier: 'plus',
  paidAt: new Date().toISOString(),
  sanitizeLog: ['HR-15: Obergrenze auf das Katalogband 900 € gedeckelt.'],
};

async function main() {
  const pdf = await buildReportPdf(result, handwerkerrechnung);
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const out = process.argv[2] ?? '/tmp/pruefbericht-smoke.pdf';

  writeFileSync(out, pdf);
  console.log(`PDF erzeugt: ${(pdf.length / 1024).toFixed(1)} kB, ${pages} Seiten → ${out}`);

  if (pdf.length < 5000) throw new Error('PDF verdächtig klein — vermutlich fehlen Abschnitte.');
  if (pages < 3) throw new Error('Zu wenige Seiten — die Abschnitte wurden nicht gerendert.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
