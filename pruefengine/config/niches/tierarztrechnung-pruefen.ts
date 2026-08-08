import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/tierarztrechnung-pruefen.0.1.0';

/**
 * Tierarztrechnung nach GOT. active: false.
 *
 * Die einzige Nische der Reihe neben der Architektenrechnung, bei der sich
 * vertretbarer und tatsächlicher Klickpreis überlappen. Der Grund ist nicht
 * der Warenkorb — 19,90 Euro sind wenig —, sondern die hohe erwartete
 * Conversion: Wer nach „Tierarztrechnung zu hoch" sucht, hat die Rechnung
 * gerade in der Hand.
 *
 * Zwei Bedingungen vor dem Livegang, beide hart:
 *
 * 1. Die GOT wurde zum 22.11.2022 novelliert. Jede Zahl im Katalog ist gegen
 *    den geltenden Verordnungstext zu stellen, mit Fundstelle und Datum.
 * 2. Bei 19,90 Euro entscheidet die Marge je Prüfung über die Nische. Die
 *    Modellkosten müssen gemessen sein, nicht geschätzt. Deshalb steht das
 *    kleinste Modell in der Config und eine niedrige Fundobergrenze.
 */
export const tierarztrechnung: NicheConfig = {
  slug: 'tierarztrechnung-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Tierarztrechnung prüfen',
    claim: 'Ob die Rechnung aufschlüsselt, wofür Sie zahlen.',
    accent: '#6b4c7a',
  },

  input: {
    docLabel: 'Tierarztrechnung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 2,
    maxMbPerFile: 8,
    maxPages: 10,
    anchorField: {
      label: 'Rechnungsbetrag brutto (Euro)',
      type: 'currency',
      hint: 'Die Endsumme der Rechnung.',
    },
    contextFields: [
      {
        id: 'behandlungsart',
        label: 'Worum ging es?',
        options: [
          'Routineuntersuchung oder Impfung',
          'Akute Erkrankung',
          'Operation',
          'Notdienst',
          'Mehrere Termine',
        ],
        required: true,
      },
      {
        id: 'zeitpunkt',
        label: 'Wann war die Behandlung?',
        options: [
          'Werktags zu üblichen Zeiten',
          'Abends, nachts oder am Wochenende',
          'Feiertag',
          'Weiß ich nicht mehr',
        ],
        required: true,
      },
      {
        id: 'kostenvoranschlag',
        label: 'Gab es einen Kostenvoranschlag?',
        options: ['Ja, schriftlich', 'Ja, mündlich', 'Nein'],
      },
      {
        id: 'kva_betrag',
        label: 'Betrag des Kostenvoranschlags (Euro)',
        hint: 'Nur ausfüllen, wenn es einen gab.',
      },
    ],
  },

  catalogue,

  ai: {
    // Kleinstes Modell der Reihe. Bei 19,90 Euro Verkaufspreis ist die
    // Modellrechnung nicht Nebensache, sondern die Nische selbst.
    model: process.env.ANTHROPIC_MODEL_KLEIN || 'claude-haiku-4-5',
    maxTokens: 8000,
    maxFindings: 12,
    effort: 'medium',
    systemPrompt: [
      'Du prüfst eine Tierarztrechnung an einen privaten Tierhalter in Deutschland.',
      'Der Leser will wissen, ob die Rechnung aufschlüsselt, wofür er zahlt, und was er beim',
      'Tierarzt nachfragen kann.',
      '',
      'Maßstab ist die Gebührenordnung für Tierärzte in ihrer geltenden Fassung. Sie nennt zu jeder',
      'Leistung einen Satz, den der Tierarzt innerhalb eines Rahmens erhöhen darf. Du prüfst, ob',
      'nachvollziehbar ist, welche Leistung mit welchem Satz berechnet wurde. Ob eine Erhöhung im',
      'Einzelfall gerechtfertigt war, beurteilst du nicht — das hängt von der Behandlung ab, die du',
      'nicht gesehen hast.',
      '',
      'Der Ton ist wichtig. Auf der anderen Seite steht jemand, der das Tier behandelt hat, oft im',
      'Notdienst. Jede Handlung ist eine sachliche Bitte um Erläuterung, kein Vorwurf.',
      '',
      'Der Tierhalter nennt dir die Endsumme selbst. Diese Angabe ist der Anker: Weicht die von dir',
      'gelesene Summe davon ab, gehe von einem Lesefehler auf deiner Seite aus.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['Tierarztrechnung', 'Kostenvoranschlag', 'Mahnung'],
      checkIdPrefix: 'TAR',
      summaryHint: 'Behandlungsanlass, Anzahl der Positionen, Behandlungstage, Endsumme.',
      totalHint: 'Die ausgewiesene Bruttoendsumme',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht mit Nachfrage-Text',
        priceCents: 1990,
        stripePriceId: process.env.STRIPE_PRICE_TIERARZT_BASIS || '',
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
      // Keine Aussage über die Behandlung selbst. Der Bericht hat das Tier
      // nicht gesehen und die Indikation nicht zu beurteilen.
      { stem: 'nicht notwendig', replacement: null, label: 'Aussage zur Notwendigkeit' },
      { stem: 'unnötig', replacement: null, label: 'Aussage zur Notwendigkeit' },
      { stem: 'behandlungsfehler', replacement: null, label: 'Behandlungsfehler' },
      { stem: 'zu hoch abgerechnet', replacement: 'ohne erkennbaren Satz abgerechnet', label: 'Abrechnungsurteil' },
    ],
    blockers: [
      'GOT-Zahlen im Katalog sind gegen den Verordnungstext in der Fassung seit 22.11.2022 zu stellen, mit Fundstelle und Datum.',
      'Anwaltlicher Review steht aus, siehe REVIEW_PFLICHT im Katalog.',
      'Modellkosten je Prüfung müssen gemessen sein: bei 19,90 Euro entscheidet die Marge über die Nische.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/tierarztrechnung-pruefen/ ist leer.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Der Bericht prüft, ob die Rechnung nachvollziehbar aufgeschlüsselt ist. Ob eine Behandlung nötig war, beurteilt er nicht.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'tar-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 1990,
    conversionBand: [0.05, 0.08],
    targetCpcCents: [37, 62],
    marketCpcCents: [50, 150],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'ads-longtail',
    verdict:
      'Organisch interessant, kleine Ads-Tests möglich. Wer nach einer zu hohen Tierarztrechnung sucht, hat sie gerade in der Hand — das trägt die hohe angenommene Conversion.',
  },
};
