import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/handwerkerrechnung.2026-08-01';

/**
 * Nische 1 — Handwerkerrechnung. REFERENZIMPLEMENTIERUNG, nicht produktiv.
 *
 * ACHTUNG vor dem Deploy: Dasselbe Produkt läuft bereits eigenständig unter
 * handwerkerrechnung-pruefen.de. Beide gleichzeitig online bedeutet zwei
 * eigene Angebote auf denselben Suchbegriffen, zwei Preisseiten und zwei
 * Rechtstexte-Sätze für dieselbe Leistung. Bevor die Engine live geht, gilt
 * genau eine der beiden Regelungen:
 *
 *   a) Diese Nische auf `active: false` — die Engine startet nur mit neuen
 *      Nischen, der Bestand bleibt unter seiner Domain. Das ist der derzeit
 *      gewählte Weg.
 *   b) Der Bestand wird abgelöst und handwerkerrechnung-pruefen.de per 301
 *      auf <dachdomain>/handwerkerrechnung umgeleitet, Domain zusätzlich in
 *      `aliasDomains` eintragen.
 *
 * Was hier steht, ist an den Live-Werten ausgerichtet (Preise 24,90 / 39,90,
 * Aufbewahrung 14 Tage, Anbieterdaten), aber aus den öffentlichen Seiten
 * rekonstruiert — nicht aus dem Quellcode des Bestands portiert. Prompt,
 * echter Prüfkatalog und PDF-Vorlage des Bestands lagen nicht vor. Der
 * Katalog hier ist deshalb eigenständig geschnitten und deckt drei der
 * sechs Muster, mit denen der Bestand wirbt, nicht als eigene Prüfpunkte ab
 * (aufgerundete Arbeitszeit im Viertelstunden-Takt, Fahrzeit zusätzlich zur
 * Anfahrtspauschale, zweiter Monteur ohne erkennbaren Grund).
 */
export const handwerkerrechnung: NicheConfig = {
  slug: 'handwerkerrechnung',
  active: true,
  aliasDomains: [],

  brand: {
    name: 'Handwerkerrechnung prüfen',
    claim: 'Was draufsteht. Und was fehlt.',
    accent: '#1f5f4f',
  },

  input: {
    docLabel: 'Handwerkerrechnung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 3,
    maxMbPerFile: 10,
    maxPages: 12,
    anchorField: {
      label: 'Rechnungsbetrag brutto (Euro)',
      type: 'currency',
      hint: 'Die Endsumme, so wie sie auf der Rechnung steht. Sie dient als Anker gegen Lesefehler.',
    },
    contextFields: [
      {
        id: 'gewerk',
        label: 'Gewerk',
        options: [
          'Sanitär, Heizung, Klima',
          'Elektro',
          'Maler und Lackierer',
          'Dach und Zimmerei',
          'Fliesen und Boden',
          'Fenster und Türen',
          'Schlüsseldienst',
          'Garten und Landschaft',
          'Anderes Gewerk',
        ],
      },
      {
        id: 'auftragsart',
        label: 'Art des Auftrags',
        options: [
          'Reparatur oder Störungsbeseitigung',
          'Wartung',
          'Umbau oder Sanierung',
          'Neubau oder Erstinstallation',
          'Notdienst außerhalb der Regelarbeitszeit',
        ],
      },
      {
        id: 'vereinbarung',
        label: 'Was war vorher vereinbart?',
        options: [
          'Nichts Schriftliches',
          'Mündlicher Kostenrahmen',
          'Schriftlicher Kostenvoranschlag',
          'Festpreis oder Pauschale',
          'Abrechnung nach Aufwand',
        ],
      },
      {
        id: 'zahlungsstand',
        label: 'Stand der Zahlung',
        options: [
          'Noch nicht gezahlt',
          'Anzahlung geleistet',
          'Vollständig gezahlt',
          'Zahlung zurückgehalten',
        ],
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 8000,
    systemPrompt: [
      'Du prüfst eine Handwerkerrechnung an einen privaten Auftraggeber in Deutschland.',
      'Der Leser ist Privatperson ohne juristische Vorkenntnisse. Er will wissen, was auf seiner',
      'Rechnung von den Pflichtangaben, den vereinbarten Grundlagen oder den üblichen',
      'Referenzbändern abweicht, und was er als nächstes tun kann.',
      '',
      'Der Auftraggeber nennt dir die Bruttosumme der Rechnung selbst. Diese Angabe ist der Anker:',
      'Weicht die von dir gelesene Endsumme davon ab, gehe von einem Lesefehler auf deiner Seite aus',
      'und sage das, statt eine Rechendifferenz zu behaupten.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['Handwerkerrechnung', 'Kostenvoranschlag', 'Mahnung'],
      checkIdPrefix: 'HR',
      summaryHint: 'Gewerk, Leistungsumfang, Abrechnungsform, Endsumme.',
      totalHint: 'Die im Dokument ausgewiesene Bruttoendsumme',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 2490,
        stripePriceId: process.env.STRIPE_PRICE_HANDWERKERRECHNUNG_BASIS || '',
        includes: [
          'Alle Feststellungen im Wortlaut, schwerste zuerst',
          'Zu jeder die Stelle aus Ihrer Rechnung',
          'Zu jeder ein fertiger Satz zum Schreiben oder Sagen',
          'Spanne in Euro, je Feststellung und zusammen',
          'PDF mit Katalogversion und Prüfdatum',
        ],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Anschreiben',
        priceCents: 3990,
        stripePriceId: process.env.STRIPE_PRICE_HANDWERKERRECHNUNG_PLUS || '',
        includes: [
          'Alles aus dem Vollbericht',
          'Fertiges Anschreiben an den Betrieb, auf Ihre Funde zugeschnitten',
          'Positionsliste zum Abhaken fürs Gespräch',
          'Zweite Prüfung der korrigierten Rechnung, 14 Tage lang',
        ],
        // Zwei zusätzliche Abschnitte im PDF. Beide werden generisch aus den
        // Feststellungen erzeugt, eine neue Nische bekommt sie ohne Code.
        sections: [
          'summary',
          'findings',
          'actions',
          'euro',
          'letter',
          'checklist',
          'method',
          'catalogue',
          'legal',
        ],
      },
    ],
  },

  report: {
    sections: ['summary', 'findings', 'actions', 'euro', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer:
      'Dieser Bericht ist eine technische Plausibilitätsprüfung eines hochgeladenen Dokuments anhand eines veröffentlichten Prüfkatalogs. Er ist keine Rechts-, Steuer- oder Fachberatung und kein Sachverständigengutachten. Die Feststellungen beruhen ausschließlich auf dem, was im hochgeladenen Dokument lesbar war, sowie auf den Angaben, die Sie selbst gemacht haben.',
    professionalAdviceNote:
      'Ob sich aus einer Feststellung ein Anspruch ergibt, hängt vom Vertrag und vom Einzelfall ab. Diese Frage beantworten eine Rechtsanwältin oder ein Rechtsanwalt, in steuerlichen Fragen eine Steuerberaterin oder ein Steuerberater, bei technischen Fragen eine öffentlich bestellte Sachverständige oder ein Sachverständiger.',
    imprintEntity: '',
    // 14 Tage — wie im Bestandsprodukt zugesagt („automatische Löschung nach
    // 14 Tagen"). Die Zahl wird direkt als TTL im Speicher gesetzt und
    // erscheint so auch in der Datenschutzerklärung.
    dataRetentionHours: 336,
    serviceDescription:
      'Prüfung einer Handwerkerrechnung gegen den veröffentlichten Prüfkatalog Handwerkerrechnung und Ausgabe eines PDF-Berichts',
  },

  landing: {
    h1: 'Handwerkerrechnung prüfen lassen, in zwei Minuten',
    subline:
      'Rechnung hochladen, fertig. Wir gehen 33 Punkte durch: Pflichtangaben, Steuerabzug, Stundensätze, Anfahrt, Zuschläge, Rechenwege. Sie sehen sofort, wie viel dabei herauskommt.',
    proofPoints: [
      'Der Prüfkatalog steht offen im Netz. Lesen Sie ihn, bevor Sie etwas hochladen.',
      'Zu jeder Feststellung gehört ein Paragraf oder ein Referenzband mit Zahlen.',
      'Am Ende jeder Feststellung steht ein Satz, den Sie so verschicken können.',
      'Die Vorschau kostet nichts. Zahlen Sie erst, wenn wir etwas gefunden haben.',
      'Nach 14 Tagen löscht das System Ihre Datei von selbst.',
    ],
    competitorAnchor:
      'Ein Erstberatungsgespräch bei einem Anwalt kostet nach § 34 RVG bis zu 190 Euro plus Umsatzsteuer. Diese Prüfung ersetzt das nicht. Sie sagt Ihnen, ob sich der Weg dorthin lohnt.',
    sample: {
      docTitle: 'Rechnung Nr. 2026-0847',
      docMeta: ['Sanitär, Heizung, Klima', 'Reparatur Warmwasser', 'Rechnungsbetrag 1.184,05 Euro brutto'],
      lines: [
        { text: 'Pos. 1  Monteurstunden, 6,5 Std. à 118,00', amount: '767,00', mark: 'A' },
        { text: 'Pos. 2  An- und Abfahrt, 2 Fahrten à 65,00', amount: '130,00', mark: 'B' },
        { text: 'Pos. 3  Reparaturarbeiten, pauschal', amount: '85,00', mark: 'C' },
        { text: 'Pos. 4  Kleinmaterial', amount: '13,10' },
        { text: 'Nettobetrag', amount: '995,10' },
        { text: 'Umsatzsteuer 19 %', amount: '188,95' },
        { text: 'Rechnungsbetrag', amount: '1.184,05' },
      ],
      annotations: [
        {
          mark: 'A',
          checkId: 'HR-15',
          severity: 'warn',
          note: '118,00 Euro je Monteurstunde liegen über dem Referenzband von 55 bis 95 Euro netto. Differenz zum oberen Bandwert: 149,50 Euro.',
        },
        {
          mark: 'B',
          checkId: 'HR-17',
          severity: 'warn',
          note: 'Zwei Anfahrten, aber nur ein Einsatztag im Leistungszeitraum genannt.',
        },
        {
          mark: 'C',
          checkId: 'HR-06',
          severity: 'error',
          note: '"Reparaturarbeiten, pauschal" lässt Art und Umfang der Leistung nicht erkennen — und trennt die Arbeitskosten nicht vom Material.',
        },
      ],
      caption:
        'So sieht eine geprüfte Rechnung aus: markierte Fundstelle, zitierter Prüfpunkt, benannte Grundlage.',
    },
    faq: [
      {
        q: 'Was bekomme ich für mein Geld?',
        a: 'Ein PDF. Darin steht jede Feststellung mit der Stelle aus Ihrer Rechnung, dem Paragrafen oder Referenzband dahinter, einer Spanne in Euro und einem fertigen Satz für den Betrieb. Auf dem Deckblatt stehen Prüfdatum und Katalogversion, damit Sie in einem halben Jahr noch wissen, wonach geprüft wurde.',
      },
      {
        q: 'Ist das eine Rechtsberatung?',
        a: 'Nein. Wir prüfen Ihre Rechnung gegen einen veröffentlichten Katalog und sagen Ihnen, was fehlt oder von der üblichen Spanne abweicht. Ob eine Forderung durchsetzbar ist, beantwortet ein Anwalt.',
      },
      {
        q: 'Warum zeigt die Vorschau nicht alles?',
        a: 'Kostenlos sehen Sie die Anzahl der Funde, ihre Schwere, die betroffenen Kategorien und einen Fund vollständig ausformuliert. Der Rest ist die Leistung, für die Sie zahlen. Finden wir gar nichts, gibt es auch nichts zu kaufen.',
      },
      {
        q: 'Was passiert mit meiner Rechnung?',
        a: 'Die Datei geht zur Analyse an Anthropic und wird dort nicht zum Training verwendet. Ergebnis und Dokumentbezug bleiben 14 Tage im Zwischenspeicher, danach löscht das System sie. Mehr dazu in der Datenschutzerklärung.',
      },
      {
        q: 'Und wenn meine Rechnung in Ordnung ist?',
        a: 'Dann sagen wir Ihnen das und bieten Ihnen keinen Bericht an. Genauso, wenn wir die Datei nicht lesen können oder es gar keine Rechnung ist. Dann steht da „nicht beurteilbar" und der Kauf-Knopf erscheint erst gar nicht.',
      },
      {
        q: 'Kann ich das nicht selbst in ChatGPT werfen?',
        a: 'Können Sie. Was dabei fehlt, ist der Maßstab. Hier sind es 33 benannte Punkte, jeder mit Paragraf oder Referenzband, in einer Fassung mit Versionsnummer. Jede Rechnung läuft gegen dieselben 33. Im Bericht steht die Version, deshalb lässt er sich später noch nachvollziehen.',
      },
      {
        q: 'Wie lange dauert das?',
        a: 'Die Analyse braucht meist unter einer Minute. Danach kommt die Vorschau. Nach der Zahlung steht das PDF sofort bereit und geht zusätzlich per E-Mail raus.',
      },
      {
        q: 'Kann ich widerrufen?',
        a: 'Grundsätzlich haben Sie 14 Tage. Weil der Bericht sofort bereitsteht, müssen Sie beim Kauf ankreuzen, dass wir vorher anfangen dürfen, und bestätigen, dass Ihr Widerrufsrecht damit erlischt (§ 356 Abs. 5 BGB). Diese Erklärung protokollieren wir im Wortlaut mit Zeitstempel.',
      },
    ],
  },

  experiment: {
    id: 'hr-2026-08',
    adsBudgetCents: 30000,
    killAfterClicks: 400,
    minPaidConversions: 5,
  },

  economics: {
    // Planpreis ist die obere Stufe: Sie ist die, auf die die Vorschau
    // hinführt, und damit die realistische Bezugsgröße für die Ads-Rechnung.
    planPriceCents: 3990,
    conversionBand: [0.03, 0.06],
    targetCpcCents: [45, 96],
    marketCpcCents: [150, 300],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'seo-only',
    verdict:
      'Breite Ads wahrscheinlich unprofitabel: 96 Cent vertretbar gegen 1,50 bis 3,00 Euro am Markt. Das Bestandsprodukt läuft, die Zahlen dort schlagen jede Schätzung hier.',
  },
};
