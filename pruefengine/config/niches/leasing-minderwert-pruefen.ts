import type { NicheConfig } from '../schema';
import { catalogue } from '../catalogues/leasing-minderwert-pruefen.0.1.0';

/**
 * Stub — Leasingrückgabe, Schadensaufstellung. active: false.
 *
 * Struktur vollständig, Inhalt skizziert. Zum Freischalten fehlen: belastbare
 * `basis`-Angaben im Katalog, eigene Texte und ein Silo. Danach ist es ein
 * Ein-Zeilen-Vorgang.
 *
 * Die ehrliche Grenze steht bereits in der Subline und gehört dort auch hin:
 * Ohne Fahrzeugbesichtigung ist nur eine Dokument- und Plausibilitätsprüfung
 * möglich, keine technische Bewertung. Wer das verschweigt, verkauft ein
 * Versprechen, das das Produkt nicht halten kann.
 */
export const leasingMinderwert: NicheConfig = {
  slug: 'leasing-minderwert-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Leasingrückgabe prüfen',
    claim: 'Was auf der Schadensaufstellung steht — und was dort nicht hingehört.',
    accent: '#7c4a2c',
  },

  input: {
    docLabel: 'Schadensaufstellung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 3,
    maxMbPerFile: 10,
    maxPages: 20,
    anchorField: {
      label: 'Geforderter Betrag (Euro)',
      type: 'currency',
      hint: 'Die Endsumme der Schadensaufstellung, so wie sie dort steht.',
    },
    contextFields: [
      {
        id: 'vertragsart',
        label: 'Art des Vertrags',
        options: ['Kilometerleasing', 'Restwertleasing', 'Unbekannt'],
      },
      {
        id: 'rueckgabe',
        label: 'Wie lief die Rückgabe?',
        options: [
          'Mit Termin und in meinem Beisein',
          'Ohne mich, Protokoll später erhalten',
          'Unbekannt',
        ],
      },
      {
        id: 'gutachten',
        label: 'Liegt ein Gutachten vor?',
        options: ['Ja, mit Fotos', 'Ja, ohne Fotos', 'Nein'],
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 8000,
    systemPrompt: '',
    outputTool: {
      name: 'pruefbericht',
      description: 'Noch nicht ausformuliert — Nische ist inaktiv.',
      input_schema: {
        type: 'object',
        properties: { assessable: { type: 'boolean' }, findings: { type: 'array', items: { type: 'object' } } },
        required: ['assessable', 'findings'],
      },
    },
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 7900,
        stripePriceId: process.env.STRIPE_PRICE_LEASING_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Anschreiben',
        priceCents: 11900,
        stripePriceId: process.env.STRIPE_PRICE_LEASING_PLUS || '',
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
    blockers: [
      'Katalog ist eine Skizze: jede basis-Angabe steht auf „ZU KLÄREN".',
      'Texte, Beispielansicht und FAQ fehlen.',
      'Silo unter content/blog/leasing-minderwert-pruefen/ ist leer.',
    ],
  },

  landing: {
    h1: '',
    subline:
      'Ohne Fahrzeugbesichtigung ist nur eine Dokument- und Plausibilitätsprüfung möglich, keine technische Bewertung des Schadens.',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'leasing-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },
};
