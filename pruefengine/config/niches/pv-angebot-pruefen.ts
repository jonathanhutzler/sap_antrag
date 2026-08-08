import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/pv-angebot-pruefen.0.1.0';

/**
 * Photovoltaik-Angebot. active: false.
 *
 * Die schwächste Nische der Reihe, und das hat zwei Gründe, die beide hier
 * stehen sollten statt in einem Rückblick.
 *
 * Erstens fehlt der gesetzliche Pflichtkatalog. Eine Rechnung muss § 14 UStG
 * erfüllen, eine Baubeschreibung Art. 249 EGBGB. Ein PV-Angebot muss gar
 * nichts. Der Katalog stützt sich deshalb auf Vollständigkeit und
 * Plausibilität, und das ist eine schwächere Grundlage.
 *
 * Zweitens sind die Klickpreise die höchsten der Reihe, weil Installateure
 * um dieselben Begriffe bieten und ein Auftrag bei ihnen fünfstellig ist.
 * Gegen 2,50 bis 6,00 Euro je Klick ist ein Bericht für 59,90 Euro chancenlos.
 *
 * Wenn diese Nische kommt, dann nicht als gekaufter Klick, sondern über
 * Vergleichsportale, Foren und Suche.
 */
export const pvAngebot: NicheConfig = {
  slug: 'pv-angebot-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'PV-Angebot prüfen',
    claim: 'Welche Angaben fehlen, bevor Sie zwei Angebote überhaupt vergleichen können.',
    accent: '#b8860b',
  },

  input: {
    docLabel: 'Photovoltaik-Angebot',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 3,
    maxMbPerFile: 12,
    maxPages: 30,
    anchorField: {
      label: 'Angebotssumme brutto (Euro)',
      type: 'currency',
      hint: 'Der Endpreis des Angebots, so wie er dort steht.',
    },
    contextFields: [
      {
        id: 'anlagenart',
        label: 'Was ist angeboten?',
        options: ['Nur Photovoltaik', 'Photovoltaik mit Speicher', 'Mit Wallbox', 'Weiß ich nicht'],
        required: true,
      },
      {
        id: 'dach',
        label: 'Dachform',
        options: ['Satteldach', 'Flachdach', 'Pultdach', 'Sonstiges', 'Weiß ich nicht'],
      },
      {
        id: 'verbrauch',
        label: 'Jahresstromverbrauch (kWh)',
        hint: 'Steht auf Ihrer letzten Stromrechnung. Ohne diese Zahl lässt sich der Speicher nicht einordnen.',
      },
      {
        id: 'anbahnung',
        label: 'Wie kam der Kontakt zustande?',
        options: [
          'Ich habe angefragt',
          'Beratung bei mir zu Hause',
          'Telefonisch angeboten',
          'An der Haustür',
        ],
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 10000,
    maxFindings: 18,
    systemPrompt: [
      'Du prüfst ein Angebot für eine Photovoltaikanlage an einen privaten Haushalt in Deutschland.',
      'Der Leser will wissen, ob das Angebot vollständig genug ist, um es mit einem zweiten zu',
      'vergleichen, und welche Angaben er nachfordern sollte.',
      '',
      'Diese Nische hat keinen gesetzlichen Pflichtkatalog. Dein Maßstab ist deshalb: Ist die',
      'Leistung so beschrieben, dass sie bestimmt ist, und liegen die genannten Kennzahlen',
      'innerhalb der im Katalog benannten Referenzbänder? Rechne die Kennzahlen selbst aus und nenne',
      'sie: Preis je kWp, Ertrag je kWp, Verhältnis von Modul- zu Wechselrichterleistung.',
      '',
      'Du vergleichst keine Anbieter, du empfiehlst kein Produkt und du sagst nicht, ob ein Angebot',
      'gut oder schlecht ist. Du sagst, welche Angabe fehlt und welche Zahl außerhalb des benannten',
      'Bandes liegt.',
      '',
      'Der Interessent nennt dir die Angebotssumme selbst. Diese Angabe ist der Anker: Weicht die',
      'von dir gelesene Summe davon ab, gehe von einem Lesefehler auf deiner Seite aus.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['Photovoltaik-Angebot', 'Auftragsbestätigung', 'Wirtschaftlichkeitsberechnung'],
      checkIdPrefix: 'PVA',
      summaryHint:
        'Anlagenleistung in kWp, Modulanzahl, Wechselrichter, Speicher, Angebotssumme, Preis je kWp.',
      totalHint: 'Die ausgewiesene Angebotssumme brutto',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 5990,
        stripePriceId: process.env.STRIPE_PRICE_PV_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Nachfragekatalog',
        priceCents: 8990,
        stripePriceId: process.env.STRIPE_PRICE_PV_PLUS || '',
        includes: ['Noch nicht ausformuliert'],
      },
    ],
  },

  report: {
    sections: ['summary', 'findings', 'actions', 'euro', 'checklist', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer: '',
    professionalAdviceNote: '',
    imprintEntity: '',
    dataRetentionHours: 336,
    serviceDescription: '',
    forbiddenTerms: [
      // Kein Anbietervergleich, keine Empfehlung, keine Renditeaussage.
      { stem: 'empfehlen wir', replacement: null, label: 'Empfehlung' },
      { stem: 'rendite', replacement: null, label: 'Renditeaussage' },
      { stem: 'lohnt sich', replacement: null, label: 'Wirtschaftlichkeitsurteil' },
      { stem: 'seriös', replacement: null, label: 'Anbieterbewertung' },
    ],
    blockers: [
      'Referenzbänder für Preis je kWp und Ertrag je kWp sind Schätzwerte ohne Quelle und Datum.',
      'Steuerliche Bewertung des Nullsteuersatzes nach § 12 Abs. 3 UStG ist nicht bestätigt.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/pv-angebot-pruefen/ ist leer.',
      'Wirtschaftlichkeit als reiner Bericht ist fraglich, siehe economics.verdict.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Der Bericht prüft ein einzelnes Angebot auf Vollständigkeit und Plausibilität. Er vergleicht keine Anbieter und empfiehlt keine Anlage.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'pva-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 5990,
    conversionBand: [0.03, 0.05],
    targetCpcCents: [70, 122],
    marketCpcCents: [250, 600],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'seo-only',
    verdict:
      'Als reiner Bericht schwierig. Installateure bieten auf dieselben Begriffe und verdienen an einem Auftrag fünfstellig; dagegen ist ein Bericht für 59,90 Euro im Klickpreis chancenlos.',
  },
};
