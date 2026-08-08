import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/hausgeldabrechnung-pruefen.0.1.0';

/**
 * WEG-Jahresabrechnung, aus Sicht des Wohnungseigentümers. active: false.
 *
 * Nicht zu verwechseln mit der Nebenkostenabrechnung im Mietverhältnis: Dort
 * geht es um Mieter gegen Vermieter, hier um Eigentümer gegen Gemeinschaft.
 * Andere Vorschriften, andere Fristen. Die beiden Nischen müssen getrennt
 * bleiben, auch in der Werbung, sonst laden Mieter ihre Abrechnung hier hoch
 * und bekommen einen Bericht nach dem falschen Katalog.
 *
 * Wirtschaftlich: jährlich wiederkehrender Anlass, große Zielgruppe, aber
 * schmaler Warenkorb. Der vertretbare Klickpreis überlappt gerade eben mit
 * dem Marktpreis. Das ist ein SEO-Profil mit Ads nur auf Longtails.
 */
export const hausgeldabrechnung: NicheConfig = {
  slug: 'hausgeldabrechnung-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Hausgeldabrechnung prüfen',
    claim: 'Ob die Jahresabrechnung nachrechenbar ist — Punkt für Punkt.',
    accent: '#3d5a80',
  },

  input: {
    docLabel: 'WEG-Jahresabrechnung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 4,
    maxMbPerFile: 12,
    maxPages: 40,
    anchorField: {
      label: 'Nachzahlung oder Guthaben (Euro)',
      type: 'currency',
      hint: 'Der Betrag aus Ihrer Einzelabrechnung. Bei Guthaben ohne Minuszeichen eintragen.',
    },
    contextFields: [
      {
        id: 'rolle',
        label: 'Ihre Rolle',
        options: ['Selbstnutzender Eigentümer', 'Vermietender Eigentümer'],
        required: true,
      },
      {
        id: 'unterlagen',
        label: 'Was haben Sie hochgeladen?',
        options: [
          'Nur die Einzelabrechnung',
          'Einzel- und Gesamtabrechnung',
          'Zusätzlich den Vermögensbericht',
          'Zusätzlich die Vorjahresabrechnung',
        ],
        required: true,
      },
      {
        id: 'wechsel',
        label: 'Eigentumswechsel im Abrechnungsjahr?',
        options: ['Nein', 'Ja, ich habe gekauft', 'Ja, ich habe verkauft'],
      },
      {
        id: 'miteigentumsanteil',
        label: 'Ihr Miteigentumsanteil',
        hint: 'Zum Beispiel 87/1000. Leer lassen, wenn unbekannt.',
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 10000,
    maxFindings: 20,
    systemPrompt: [
      'Du prüfst eine Jahresabrechnung einer Wohnungseigentümergemeinschaft in Deutschland.',
      'Der Leser ist Wohnungseigentümer ohne juristische Vorkenntnisse. Er will wissen, ob die',
      'Abrechnung nachvollziehbar ist und wo er nachfragen sollte.',
      '',
      'Zwei Dinge musst du auseinanderhalten:',
      'Erstens ist die Jahresabrechnung eine Einnahmen-Ausgaben-Rechnung. Rückstellungen und',
      'periodengerechte Abgrenzungen gehören dort nicht hinein. Das ist die häufigste Fehlerquelle.',
      'Zweitens beschließen die Eigentümer seit dem 01.12.2020 nicht mehr die Abrechnung selbst,',
      'sondern die Nachschüsse und die Anpassung der Vorschüsse. Formuliere nie eine Aussage über',
      'die Wirksamkeit eines Beschlusses und nenne keine Anfechtungsfrist als Handlungsempfehlung.',
      '',
      'Der Eigentümer nennt dir den Betrag seiner Einzelabrechnung selbst. Diese Angabe ist der',
      'Anker: Weicht die von dir gelesene Zahl davon ab, gehe von einem Lesefehler auf deiner Seite',
      'aus und sage das.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['WEG-Jahresabrechnung', 'Einzelabrechnung', 'Wirtschaftsplan', 'Vermögensbericht'],
      checkIdPrefix: 'HGA',
      summaryHint:
        'Abrechnungszeitraum, Anzahl der Einheiten, Gesamtausgaben, eigener Anteil, Nachzahlung oder Guthaben.',
      totalHint: 'Die ausgewiesene Nachzahlung oder das Guthaben',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 3990,
        stripePriceId: process.env.STRIPE_PRICE_HAUSGELD_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Anschreiben an die Verwaltung',
        priceCents: 5990,
        stripePriceId: process.env.STRIPE_PRICE_HAUSGELD_PLUS || '',
        includes: ['Noch nicht ausformuliert'],
      },
    ],
  },

  report: {
    sections: ['summary', 'findings', 'actions', 'euro', 'letter', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer: '',
    professionalAdviceNote: '',
    imprintEntity: '',
    dataRetentionHours: 336,
    serviceDescription: '',
    forbiddenTerms: [
      // Anfechtung ist eine Rechtsfrage mit einer Monatsfrist. Der Bericht
      // darf sie weder empfehlen noch ihre Aussichten andeuten.
      { stem: 'anfechtbar', replacement: null, label: 'anfechtbar' },
      { stem: 'anfechtung', replacement: null, label: 'Anfechtung' },
      { stem: 'beschluss ist', replacement: null, label: 'Aussage zur Beschlusswirksamkeit' },
    ],
    blockers: [
      'Anwaltlicher Review steht aus, siehe REVIEW_PFLICHT im Katalog.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/hausgeldabrechnung-pruefen/ ist leer.',
      'Abgrenzung zur Nebenkostenabrechnung muss in Landing und Formular eindeutig sein, sonst laden Mieter hier hoch.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Für Wohnungseigentümer, nicht für Mieter. Mietnebenkosten folgen anderen Vorschriften und haben einen eigenen Prüfkatalog.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'hga-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 4490,
    conversionBand: [0.04, 0.06],
    targetCpcCents: [62, 125],
    marketCpcCents: [120, 250],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'seo-first',
    verdict:
      'Jährlich wiederkehrender Anlass und große Zielgruppe. Der vertretbare Klickpreis reicht knapp an den Marktpreis heran, deshalb zuerst Suche und Ads nur auf Longtails.',
  },
};
