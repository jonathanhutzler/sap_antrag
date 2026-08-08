import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/baubeschreibung-pruefen.0.1.0';

/**
 * Baubeschreibung im Verbraucherbauvertrag. active: false.
 *
 * Der höchste Warenkorb der Reihe und der härteste gesetzliche Kern: Art. 249
 * EGBGB listet auf, was in einer Baubeschreibung stehen muss, und diese Liste
 * lässt sich abhaken. Nach der Wirtschaftlichkeitsrechnung liegt der
 * vertretbare Klickpreis trotzdem knapp unter dem Marktpreis — der Anlass ist
 * selten, dafür teuer, und das ist eher ein SEO- als ein Ads-Profil.
 *
 * Die Grenze steht in der Subline und gehört dort auch hin: Der Bericht prüft
 * Vollständigkeit und Widerspruchsfreiheit der Beschreibung. Ob eine bauliche
 * Ausführung fachlich taugt, beurteilt ein Bausachverständiger.
 */
export const baubeschreibung: NicheConfig = {
  slug: 'baubeschreibung-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Baubeschreibung prüfen',
    claim: 'Was das Gesetz an Angaben verlangt — und was in Ihrer Baubeschreibung fehlt.',
    accent: '#8a5a2b',
  },

  input: {
    docLabel: 'Baubeschreibung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 5,
    maxMbPerFile: 15,
    maxPages: 60,
    anchorField: {
      label: 'Vereinbarte Bausumme (Euro)',
      type: 'currency',
      hint: 'Der Gesamtpreis aus Vertrag oder Angebot.',
    },
    contextFields: [
      {
        id: 'vertragsart',
        label: 'Um was für einen Vertrag geht es?',
        options: [
          'Bauträgervertrag',
          'Generalunternehmer',
          'Fertighausanbieter',
          'Einzelgewerke',
          'Weiß ich nicht',
        ],
        required: true,
      },
      {
        id: 'stand',
        label: 'Wo stehen Sie?',
        options: [
          'Angebot liegt vor, noch nicht unterschrieben',
          'Vertrag ist unterschrieben',
          'Bau läuft bereits',
        ],
        required: true,
      },
      {
        id: 'grundstueck',
        label: 'Grundstück',
        options: ['Gehört mir bereits', 'Kommt vom Anbieter', 'Weiß ich nicht'],
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    maxTokens: 12000,
    maxFindings: 25,
    systemPrompt: [
      'Du prüfst eine Baubeschreibung zu einem Verbraucherbauvertrag in Deutschland.',
      'Der Leser ist Privatperson und steht vor der größten Ausgabe seines Lebens. Er will wissen,',
      'welche Leistung im Preis enthalten ist, welche nicht, und wo die Beschreibung eine Lücke',
      'lässt, die ihn später Geld kostet.',
      '',
      'Maßstab ist Art. 249 § 2 EGBGB: Die Vorschrift zählt auf, was eine Baubeschreibung enthalten',
      'muss. Prüfe jede dieser Angaben einzeln. Eine Lücke ist der wichtigste Fund dieser Prüfung,',
      'weil Unklarheiten nach § 650k Abs. 2 BGB zulasten des Unternehmers gehen.',
      '',
      'Du prüfst Vollständigkeit und Widerspruchsfreiheit. Du beurteilst nicht, ob eine bauliche',
      'Ausführung fachlich richtig oder eine Bauweise geeignet ist. Dafür braucht es einen',
      'Bausachverständigen, und darauf weist du hin, wenn eine Frage in diese Richtung geht.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['Baubeschreibung', 'Bau- und Leistungsbeschreibung', 'Bauvertrag', 'Angebot'],
      checkIdPrefix: 'BBS',
      summaryHint: 'Gebäudetyp, Bauweise, Umfang der Beschreibung, genannte Bausumme.',
      totalHint: 'Die ausgewiesene Bausumme',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 9990,
        stripePriceId: process.env.STRIPE_PRICE_BAUBESCHREIBUNG_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Nachfragekatalog',
        priceCents: 14990,
        stripePriceId: process.env.STRIPE_PRICE_BAUBESCHREIBUNG_PLUS || '',
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
      // Der Bericht ist kein Gutachten und darf sich nicht so nennen.
      { stem: 'gutachten', replacement: 'Prüfbericht', label: 'Gutachten' },
      { stem: 'baumangel', replacement: 'fehlende Angabe', label: 'Baumangel' },
      { stem: 'mangelhaft', replacement: 'unvollständig beschrieben', label: 'mangelhaft' },
    ],
    blockers: [
      'Anwaltlicher Review steht aus, siehe REVIEW_PFLICHT im Katalog.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/baubeschreibung-pruefen/ ist leer.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Der Bericht prüft, ob die Baubeschreibung die gesetzlich verlangten Angaben enthält und ob sie sich widerspricht. Eine bauliche Bewertung ist das nicht, dafür braucht es einen Sachverständigen.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'bbs-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 9990,
    conversionBand: [0.025, 0.045],
    targetCpcCents: [100, 187],
    marketCpcCents: [200, 500],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'seo-first',
    verdict:
      'Grenzwertig für Ads, der Warenkorb ist aber der höchste der Reihe. Über Suche und Bauforen tragfähiger als über gekaufte Klicks.',
  },
};
