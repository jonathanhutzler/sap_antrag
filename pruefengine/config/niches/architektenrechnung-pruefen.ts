import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/architektenrechnung-pruefen.0.1.0';

/**
 * Architekten- und Ingenieurhonorar. active: false.
 *
 * Nach der Wirtschaftlichkeitsrechnung die tragfähigste Ads-Nische der Reihe:
 * hoher Warenkorb, klarer Anlass, und ein Katalog, der sich auf die HOAI
 * stützen kann. Der vertretbare Klickpreis überlappt mit dem Marktpreis, aber
 * nur an dessen unterem Rand — breite Begriffe wie „Architekt Kosten" tragen
 * nicht, „Architektenrechnung prüfen" und „Honorarschlussrechnung prüfen"
 * schon eher.
 *
 * Zum Freischalten fehlen: anwaltlicher Review der HOAI-Punkte, eigene Texte,
 * Beispielansicht und ein Silo mit acht bis zehn Artikeln.
 */
export const architektenrechnung: NicheConfig = {
  slug: 'architektenrechnung-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Architektenrechnung prüfen',
    claim: 'Was die Honorarschlussrechnung offenlegen muss — und was in Ihrer fehlt.',
    accent: '#2f5d50',
  },

  input: {
    docLabel: 'Architekten- oder Ingenieurrechnung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 4,
    maxMbPerFile: 12,
    maxPages: 30,
    anchorField: {
      label: 'Rechnungsbetrag brutto (Euro)',
      type: 'currency',
      hint: 'Die Endsumme der Rechnung, so wie sie dort steht.',
    },
    contextFields: [
      {
        id: 'vertragsart',
        label: 'Was wurde vereinbart?',
        options: [
          'Honorar nach HOAI',
          'Pauschalhonorar',
          'Zeithonorar',
          'Nichts Schriftliches',
          'Weiß ich nicht',
        ],
        required: true,
      },
      {
        id: 'bauvorhaben',
        label: 'Art des Bauvorhabens',
        options: ['Neubau', 'Umbau oder Sanierung', 'Anbau', 'Innenausbau', 'Sonstiges'],
      },
      {
        id: 'rechnungsart',
        label: 'Art der Rechnung',
        options: ['Schlussrechnung', 'Abschlagsrechnung', 'Weiß ich nicht'],
      },
      {
        id: 'abschlaege',
        label: 'Bereits gezahlte Abschläge (Euro)',
        hint: 'Summe aller bisher gezahlten Abschlagsrechnungen. Leer lassen, wenn keine.',
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 10000,
    maxFindings: 20,
    systemPrompt: [
      'Du prüfst eine Architekten- oder Ingenieurrechnung an einen privaten Bauherrn in Deutschland.',
      'Der Leser ist Privatperson ohne juristische Vorkenntnisse. Er will wissen, welche Angaben',
      'seiner Rechnung fehlen, um sie überhaupt nachrechnen zu können, und was er als nächstes',
      'schreiben kann.',
      '',
      'Ein Punkt ist wichtiger als alle anderen: Seit dem Urteil des EuGH vom 04.07.2019 und der',
      'HOAI 2021 gibt es keine verbindlichen Mindest- und Höchstsätze mehr. Schreibe niemals, ein',
      'Honorar unterschreite den Mindestsatz oder überschreite den Höchstsatz. Maßstab ist, was der',
      'Vertrag vereinbart, und ob die Rechnung dem folgt.',
      '',
      'Der Bauherr nennt dir die Bruttoendsumme selbst. Diese Angabe ist der Anker: Weicht die von',
      'dir gelesene Summe davon ab, gehe von einem Lesefehler auf deiner Seite aus und sage das.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: ['Honorarschlussrechnung', 'Abschlagsrechnung', 'Architektenvertrag', 'Angebot'],
      checkIdPrefix: 'ARC',
      summaryHint:
        'Art der Rechnung, abgerechnete Leistungsphasen, Honorargrundlage, Endsumme.',
      totalHint: 'Die ausgewiesene Bruttoendsumme',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 7990,
        stripePriceId: process.env.STRIPE_PRICE_ARCHITEKTENRECHNUNG_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Anschreiben',
        priceCents: 11990,
        stripePriceId: process.env.STRIPE_PRICE_ARCHITEKTENRECHNUNG_PLUS || '',
        includes: ['Noch nicht ausformuliert'],
      },
    ],
  },

  report: {
    sections: ['summary', 'findings', 'actions', 'euro', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer: '',
    professionalAdviceNote: '',
    imprintEntity: '',
    dataRetentionHours: 336,
    serviceDescription: '',
    forbiddenTerms: [
      // Die häufigste Falschaussage zur HOAI. Sie darf nicht durchrutschen.
      { stem: 'mindestsatz', replacement: 'vereinbartes Honorar', label: 'Mindestsatz' },
      { stem: 'höchstsatz', replacement: 'vereinbartes Honorar', label: 'Höchstsatz' },
      { stem: 'preisrecht', replacement: 'Honorarvereinbarung', label: 'Preisrecht' },
    ],
    blockers: [
      'Anwaltlicher Review der HOAI-Punkte steht aus, siehe REVIEW_PFLICHT im Katalog.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/architektenrechnung-pruefen/ ist leer.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Der Bericht prüft, ob die Rechnung die Angaben enthält, mit denen sie nachrechenbar wird. Ob das Honorar der Höhe nach angemessen ist, beurteilt er nicht.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'arc-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 7990,
    conversionBand: [0.03, 0.05],
    targetCpcCents: [97, 167],
    marketCpcCents: [150, 400],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'ads-longtail',
    verdict:
      'Die tragfähigste Ads-Nische der Reihe. Der vertretbare Klickpreis reicht aber nur an den unteren Rand des Marktpreises heran, also ausschließlich sehr genaue Suchbegriffe.',
  },
};
