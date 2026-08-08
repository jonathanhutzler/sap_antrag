import type { NicheConfig } from '../schema';
import { documentOutputTool } from '../output-tool';
import { catalogue } from '../catalogues/nebenkostenabrechnung-pruefen.0.1.0';

/**
 * Heiz- und Nebenkostenabrechnung im Mietverhältnis. active: false.
 *
 * Der Gegenpol zur Hausgeldabrechnung: Mieter gegen Vermieter, § 556 BGB,
 * BetrKV, HeizkostenV. Beide Nischen dürfen nicht ineinanderlaufen.
 *
 * Wirtschaftlich die schwächste Ads-Nische nach dem Arbeitszeugnis: 19,90
 * Euro Warenkorb gegen Klickpreise ab 90 Cent. Breite Kampagnen rechnen sich
 * nicht. Der Anlass ist dafür jährlich und massenhaft, und die Suchanfragen
 * sind konkret — das ist ein reines SEO-Profil.
 *
 * Der stärkste Einzelfund ist die Abrechnungsfrist aus § 556 Abs. 3 BGB. Der
 * Bericht nennt die Fristüberschreitung mit Daten und Tagen und überlässt die
 * Folge der anwaltlichen Klärung.
 */
export const nebenkostenabrechnung: NicheConfig = {
  slug: 'nebenkostenabrechnung-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Nebenkostenabrechnung prüfen',
    claim: 'Was umlagefähig ist, was nicht — und ob die Frist eingehalten wurde.',
    accent: '#5b6c3a',
  },

  input: {
    docLabel: 'Betriebs- oder Heizkostenabrechnung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 3,
    maxMbPerFile: 10,
    maxPages: 20,
    anchorField: {
      label: 'Nachzahlung oder Guthaben (Euro)',
      type: 'currency',
      hint: 'Der Betrag am Ende Ihrer Abrechnung. Bei Guthaben ohne Minuszeichen eintragen.',
    },
    contextFields: [
      {
        id: 'zugang',
        label: 'Wann ist die Abrechnung bei Ihnen angekommen?',
        type: 'date',
        hint: 'Das Datum entscheidet über die Frist aus § 556 Abs. 3 BGB.',
        required: true,
      },
      {
        id: 'wohnflaeche',
        label: 'Wohnfläche laut Mietvertrag (Quadratmeter)',
        hint: 'Leer lassen, wenn Sie den Vertrag gerade nicht zur Hand haben.',
      },
      {
        id: 'vorauszahlung',
        label: 'Monatliche Vorauszahlung (Euro)',
        hint: 'Was Sie im Abrechnungsjahr monatlich für Nebenkosten gezahlt haben.',
      },
      {
        id: 'mietdauer',
        label: 'Wohndauer im Abrechnungszeitraum',
        options: ['Das ganze Jahr', 'Eingezogen im Laufe des Jahres', 'Ausgezogen im Laufe des Jahres'],
        required: true,
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 9000,
    maxFindings: 18,
    systemPrompt: [
      'Du prüfst eine Betriebs- und Heizkostenabrechnung für eine Mietwohnung in Deutschland.',
      'Der Leser ist Mieter ohne juristische Vorkenntnisse. Er will wissen, ob die Abrechnung',
      'nachvollziehbar ist, ob Positionen abgerechnet wurden, die nicht umlagefähig sind, und was',
      'er seinem Vermieter schreiben kann.',
      '',
      'Diese Prüfung gilt dem Mietverhältnis. Eine WEG-Jahresabrechnung folgt anderen Vorschriften;',
      'erkennst du eine solche, setze assessable=false und sage, dass dafür ein anderer Prüfkatalog',
      'gilt.',
      '',
      'Der Mieter nennt dir den Nachzahlungs- oder Guthabenbetrag selbst. Diese Angabe ist der',
      'Anker: Weicht die von dir gelesene Zahl davon ab, gehe von einem Lesefehler auf deiner Seite',
      'aus und sage das.',
      '',
      'Zur Abrechnungsfrist nach § 556 Abs. 3 BGB: Nenne die Überschreitung mit beiden Daten und',
      'der Anzahl der Tage. Schreibe nie, die Nachforderung sei ausgeschlossen oder der Mieter',
      'müsse nicht zahlen. Ob die Ausnahme greift, ist eine Rechtsfrage.',
    ].join('\n'),
    outputTool: documentOutputTool({
      docTypes: [
        'Betriebskostenabrechnung',
        'Heizkostenabrechnung',
        'WEG-Jahresabrechnung',
        'Mietvertrag',
      ],
      checkIdPrefix: 'NKA',
      summaryHint:
        'Abrechnungszeitraum, Wohnfläche, abgerechnete Kostenarten, Vorauszahlungen, Ergebnis.',
      totalHint: 'Die ausgewiesene Nachzahlung oder das Guthaben',
    }),
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht mit Anschreiben',
        priceCents: 1990,
        stripePriceId: process.env.STRIPE_PRICE_NEBENKOSTEN_BASIS || '',
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
      // Der stärkste Fund ist zugleich der gefährlichste Satz. Beides darf
      // der Bericht nicht sagen.
      { stem: 'müssen nicht zahlen', replacement: null, label: 'Zahlungsaussage' },
      { stem: 'ausgeschlossen', replacement: 'außerhalb der Frist des § 556 Abs. 3 BGB', label: 'ausgeschlossen' },
      { stem: 'verjährt', replacement: null, label: 'verjährt' },
      { stem: 'zurückfordern', replacement: null, label: 'Rückforderungsaussage' },
    ],
    blockers: [
      'Anwaltlicher Review steht aus, siehe REVIEW_PFLICHT im Katalog. Besonders NKA-01 und NKA-41.',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/nebenkostenabrechnung-pruefen/ ist leer.',
      'Bei 19,90 Euro Verkaufspreis müssen Modellkosten je Prüfung gemessen sein, bevor die Nische live geht.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Für Mieter. Wohnungseigentümer mit einer WEG-Jahresabrechnung brauchen einen anderen Prüfkatalog.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'nka-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },

  economics: {
    planPriceCents: 1990,
    conversionBand: [0.04, 0.07],
    targetCpcCents: [28, 53],
    marketCpcCents: [90, 150],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'seo-only',
    verdict:
      'Keine breiten Ads. Der Marktpreis je Klick liegt beim Doppelten des vertretbaren Werts. Jährlicher Massenanlass, deshalb über Suche tragfähig.',
  },
};
