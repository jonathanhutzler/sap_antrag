import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Leasing-Minderwert — Version 0.1.0, Skizze.
 *
 * `published: false`: Die Punkte stehen als Arbeitsgrundlage da, damit beim
 * Ausbau nicht bei null angefangen wird. Jeder braucht vor dem Freischalten
 * eine belastbare `basis` — derzeit steht dort, was zu klären ist, nicht was
 * gilt.
 *
 * Ehrliche Grenze dieser Nische, die auf die Landingpage gehört: Ohne
 * Fahrzeugbesichtigung ist nur eine Dokument- und Plausibilitätsprüfung
 * möglich, keine technische Bewertung. Wer einen Kratzer beurteilen will,
 * braucht das Fahrzeug, nicht ein PDF.
 */
export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    {
      id: 'LMW-01',
      label: 'Abgrenzung normaler Verschleiß gegen ersatzpflichtigen Schaden',
      severity: 'error',
      basis: 'ZU KLÄREN: Rückgabebedingungen des konkreten Vertrags, Branchenstandard zur Fahrzeugrückgabe',
      category: 'Schadensabgrenzung',
      instruction:
        'Prüfe, ob die aufgeführten Positionen nach den Rückgabebedingungen des Vertrags als normaler Verschleiß oder als ersatzpflichtiger Schaden gelten.',
    },
    {
      id: 'LMW-02',
      label: 'Rückgabeprotokoll und Gutachten formal ordnungsgemäß',
      severity: 'warn',
      basis: 'ZU KLÄREN: Anforderungen an Rückgabeprotokoll und Zustandsbericht',
      category: 'Form und Verfahren',
      instruction:
        'Prüfe, ob das Rückgabeprotokoll vollständig ist, ob der Leasingnehmer anwesend war und ob das Gutachten die Schäden nachvollziehbar dokumentiert.',
    },
    {
      id: 'LMW-03',
      label: 'Wertminderung zusätzlich zu Reparaturkosten angesetzt',
      severity: 'error',
      basis: 'ZU KLÄREN: Zulässigkeit einer merkantilen Wertminderung neben den Reparaturkosten',
      category: 'Doppelansatz',
      instruction:
        'Stelle fest, wenn sowohl Reparaturkosten als auch eine Wertminderung für dieselbe Position angesetzt sind.',
    },
    {
      id: 'LMW-04',
      label: 'Umsatzsteuer auf fiktive Reparaturkosten',
      severity: 'warn',
      basis: 'ZU KLÄREN: Umsatzsteuer bei nicht durchgeführter Reparatur',
      category: 'Doppelansatz',
      instruction:
        'Prüfe, ob auf nicht tatsächlich angefallene Reparaturkosten Umsatzsteuer berechnet wurde.',
    },
    {
      id: 'LMW-05',
      label: 'Minderwert bei nicht reparierten Schäden',
      severity: 'warn',
      basis: 'ZU KLÄREN: Bemessung des Minderwerts ohne durchgeführte Reparatur',
      category: 'Schadensabgrenzung',
      instruction: 'Prüfe, wie der Minderwert bei nicht reparierten Schäden ermittelt wurde.',
    },
    {
      id: 'LMW-06',
      label: 'Mehrkilometer korrekt abgerechnet',
      severity: 'warn',
      basis: 'ZU KLÄREN: vertraglicher Kilometersatz und Freigrenze',
      category: 'Abrechnung',
      instruction:
        'Rechne die abgerechneten Mehrkilometer gegen den vertraglichen Satz und die vereinbarte Freigrenze nach.',
    },
    {
      id: 'LMW-07',
      label: 'Reifen- und Verschleißteilregelungen',
      severity: 'info',
      basis: 'ZU KLÄREN: vertragliche Mindestprofiltiefe und Verschleißteilkatalog',
      category: 'Schadensabgrenzung',
      instruction: 'Prüfe die Positionen zu Reifen und Verschleißteilen gegen die vertraglichen Vorgaben.',
    },
    {
      id: 'LMW-08',
      label: 'Fristen für Einwendungen',
      severity: 'warn',
      basis: 'ZU KLÄREN: vertragliche und gesetzliche Fristen nach Zugang der Schadensaufstellung',
      category: 'Form und Verfahren',
      instruction:
        'Nenne die Frist, innerhalb derer Einwendungen erhoben werden sollten, und das konkrete Datum.',
    },
  ],
};
