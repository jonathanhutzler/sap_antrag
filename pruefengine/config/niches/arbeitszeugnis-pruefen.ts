import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/arbeitszeugnis-pruefen.0.1.0';

/**
 * Arbeitszeugnis. active: false.
 *
 * Wirtschaftlich die klarste Absage der Reihe: 14,90 Euro Verkaufspreis gegen
 * einen öffentlich genannten Klickpreis von 1,66 Euro. Selbst bei acht Prozent
 * Conversion liegt der vertretbare Klickpreis bei 45 Cent. Gekaufte Klicks
 * scheiden aus, und zwar nicht knapp.
 *
 * Inhaltlich ist die Nische trotzdem die interessanteste der Reihe. Der Anlass
 * ist emotional, das Suchvolumen groß, die Fragen sind konkret („was bedeutet
 * stets zu unserer Zufriedenheit"), und daraus lässt sich ein Silo bauen, das
 * organisch trägt. Wenn diese Nische kommt, dann über Inhalte.
 *
 * Die Formulierungsgrenze ist hier die schärfste der ganzen Engine. Der
 * Bericht ordnet Formulierungen in die gängige Zeugnissprache ein. Er vergibt
 * keine Noten und leitet keinen Anspruch ab. Das steht zusätzlich im
 * Wortfilter.
 */
export const arbeitszeugnis: NicheConfig = {
  slug: 'arbeitszeugnis-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Arbeitszeugnis prüfen',
    claim: 'Was in Ihrem Zeugnis steht — und was dort zwischen den Zeilen steht.',
    accent: '#4a4a6a',
  },

  input: {
    docLabel: 'Arbeitszeugnis',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 2,
    maxMbPerFile: 8,
    maxPages: 6,
    anchorField: {
      // Diese Nische hat keinen Geldbetrag. Der Anker ist trotzdem nützlich:
      // Er zwingt zur Angabe der Beschäftigungsdauer, gegen die sich die
      // Länge und Tiefe des Zeugnisses messen lässt.
      label: 'Beschäftigungsdauer in Monaten',
      type: 'number',
      hint: 'Zum Beispiel 38 für drei Jahre und zwei Monate.',
    },
    contextFields: [
      {
        id: 'zeugnisart',
        label: 'Um welches Zeugnis geht es?',
        options: ['Endzeugnis', 'Zwischenzeugnis', 'Weiß ich nicht'],
        required: true,
      },
      {
        id: 'beendigung',
        label: 'Wie endete das Arbeitsverhältnis?',
        options: [
          'Ich habe gekündigt',
          'Der Arbeitgeber hat gekündigt',
          'Aufhebungsvertrag',
          'Befristung ausgelaufen',
          'Läuft noch',
        ],
        required: true,
      },
      {
        id: 'position',
        label: 'Ihre Position',
        hint: 'Zum Beispiel „Sachbearbeiterin Einkauf" oder „Teamleiter Logistik, 6 Mitarbeitende".',
        required: true,
      },
      {
        id: 'aufgaben',
        label: 'Ihre wichtigsten Aufgaben',
        hint: 'Zwei bis vier Stichworte. Daran prüfen wir, ob die Tätigkeitsbeschreibung vollständig ist.',
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL_KLEIN || 'claude-haiku-4-5',
    maxTokens: 8000,
    maxFindings: 15,
    effort: 'medium',
    systemPrompt: [
      'Du prüfst ein deutsches Arbeitszeugnis für den Arbeitnehmer, dem es ausgestellt wurde.',
      'Der Leser will wissen, was in seinem Zeugnis steht, wie die Formulierungen üblicherweise',
      'gelesen werden und was er beim Arbeitgeber ansprechen kann.',
      '',
      'Die wichtigste Regel dieser Prüfung: Du ordnest Formulierungen in die gängige Zeugnissprache',
      'ein. Du vergibst keine Schulnote und leitest keinen Anspruch ab. Schreibe „diese Formulierung',
      'entspricht in der gängigen Zeugnissprache einer befriedigenden Bewertung", nicht „Sie haben',
      'eine Drei bekommen und können eine Zwei verlangen".',
      '',
      'Zwei Punkte, bei denen viele Ratgeber irren und du nicht irren darfst:',
      'Auf eine Schlussformel mit Dank und guten Wünschen besteht kein Anspruch. Ihr Fehlen ist ein',
      'Hinweis, keine Beanstandung, und du sagst ausdrücklich dazu, dass kein Anspruch besteht.',
      'Für eine Bewertung oberhalb der mittleren Stufe muss der Arbeitnehmer darlegen, dass sie',
      'gerechtfertigt ist. Nenne das, wenn du eine Einordnung unterhalb der Erwartung feststellst.',
      '',
      'Zitiere jede beanstandete Formulierung wörtlich. Ohne Zitat keine Feststellung.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['Endzeugnis', 'Zwischenzeugnis', 'einfaches Zeugnis', 'Arbeitsbescheinigung'],
      checkIdPrefix: 'AZG',
      summaryHint:
        'Art des Zeugnisses, Beschäftigungszeitraum, Position, Umfang in Absätzen, Einordnung der Gesamtbewertung.',
      totalHint: 'Kein Geldbetrag in diesem Dokument. Lass das Feld leer',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 1490,
        stripePriceId: process.env.STRIPE_PRICE_ARBEITSZEUGNIS_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Formulierungsvorschläge',
        priceCents: 2990,
        stripePriceId: process.env.STRIPE_PRICE_ARBEITSZEUGNIS_PLUS || '',
        includes: ['Noch nicht ausformuliert'],
      },
    ],
  },

  report: {
    // Kein euro-Abschnitt: Diese Nische hat keine bezifferbaren Effekte, und
    // ein leerer Abschnitt im PDF sieht aus wie ein Fehler.
    sections: ['summary', 'findings', 'actions', 'letter', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer: '',
    professionalAdviceNote: '',
    imprintEntity: '',
    dataRetentionHours: 336,
    serviceDescription: '',
    forbiddenTerms: [
      // Noten und Ansprüche sind die zwei Wege, auf denen diese Nische in die
      // Rechtsberatung rutscht. Beide sind gesperrt.
      { stem: 'note', replacement: 'Einordnung', label: 'Notenvergabe' },
      { stem: 'schulnote', replacement: 'Einordnung', label: 'Notenvergabe' },
      { stem: 'anspruch auf', replacement: null, label: 'Anspruchsaussage' },
      { stem: 'können verlangen', replacement: null, label: 'Anspruchsaussage' },
      { stem: 'klagen', replacement: null, label: 'Klageaussage' },
      { stem: 'geheimcode', replacement: 'in der Zeugnissprache übliche Formulierung', label: 'Geheimcode' },
    ],
    blockers: [
      'Anwaltlicher Review steht aus, siehe REVIEW_PFLICHT im Katalog. Besonders AZG-22, AZG-30 und AZG-41.',
      'Die zitierten BAG-Entscheidungen sind vor dem Livegang zu prüfen: 9 AZR 227/11 zur Schlussformel, 9 AZR 584/13 zur Darlegungslast.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/arbeitszeugnis-pruefen/ ist leer.',
      'Ads scheiden nach der Wirtschaftlichkeitsrechnung aus, siehe economics.verdict.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Der Bericht ordnet die Formulierungen in Ihrem Zeugnis in die gängige Zeugnissprache ein. Er vergibt keine Note und sagt nicht, was Ihnen zusteht.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'azg-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 1490,
    conversionBand: [0.05, 0.08],
    targetCpcCents: [27, 45],
    marketCpcCents: [166, 166],
    marketCpcSource: 'Öffentlich genannter Wert von 1,66 Euro; Quelle vor einem Test zu belegen',
    channel: 'seo-only',
    verdict:
      'Ads klar unprofitabel: 45 Cent vertretbar gegen 1,66 Euro am Markt. Inhaltlich die stärkste Nische der Reihe, weil die Fragen konkret sind und sich ein Silo daraus bauen lässt.',
  },
};
