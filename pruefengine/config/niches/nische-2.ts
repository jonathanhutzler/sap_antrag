import type { NicheConfig } from '../schema';
import { catalogue } from '../catalogues/nische-2.0.0.0';

/**
 * Nische 2 — Platzhalter, active: false.
 *
 * Leere Struktur als Beweis, dass eine Nische ausschließlich aus Config,
 * Katalog und Registry-Eintrag besteht. Nicht erreichbar, nicht im Hub,
 * nicht in der Sitemap.
 *
 * Welche Nische das wird, entscheidet Gate 0 (docs/gate-0.md). Beim
 * Freischalten in dieser Reihenfolge vorgehen:
 *   1. `slug` auf den endgültigen Pfad setzen (ändert sich danach nie wieder)
 *   2. Katalog füllen und `published: true` setzen
 *   3. Texte, Beispielansicht und FAQ schreiben — nicht aus Nische 1 kopieren
 *   4. Stripe-Preise anlegen, IDs in .env.local eintragen
 *   5. content/blog/<slug>/ mit acht bis zehn Artikeln füllen
 *   6. `active: true`
 * Details in docs/nische-3-anleitung.md.
 */
export const nische2: NicheConfig = {
  slug: 'nische-2',
  active: false,
  aliasDomains: [],

  brand: {
    name: '',
    claim: '',
    accent: '#3c5a6e',
  },

  input: {
    docLabel: '',
    accept: ['pdf'],
    maxFiles: 1,
    maxMbPerFile: 10,
    maxPages: 12,
    anchorField: { label: '', type: 'currency' },
    contextFields: [],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 8000,
    systemPrompt: '',
    outputTool: {
      name: 'pruefbericht',
      description:
        'Gib das Ergebnis der Dokumentenprüfung strukturiert zurück. Verwende ausschließlich dieses Werkzeug.',
      input_schema: {
        type: 'object',
        properties: {
          assessable: { type: 'boolean' },
          notAssessableReason: { type: 'string' },
          detectedDocType: { type: 'string' },
          docSummary: { type: 'string' },
          documentTotalEuro: { type: 'number' },
          checkedIds: { type: 'array', items: { type: 'string' } },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                checkId: { type: 'string' },
                severity: { type: 'string', enum: ['info', 'warn', 'error'] },
                observation: { type: 'string' },
                documentRef: { type: 'string' },
                action: { type: 'string' },
                euroImpactLowEuro: { type: 'number' },
                euroImpactHighEuro: { type: 'number' },
                euroBasis: { type: 'string' },
              },
              required: ['checkId', 'severity', 'observation', 'documentRef', 'action'],
            },
          },
        },
        required: ['assessable', 'detectedDocType', 'docSummary', 'checkedIds', 'findings'],
      },
    },
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [],
  },

  report: {
    sections: ['summary', 'findings', 'actions', 'euro', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer: '',
    professionalAdviceNote: '',
    imprintEntity: '',
    dataRetentionHours: 72,
    serviceDescription: '',
  },

  landing: {
    h1: '',
    subline: '',
    proofPoints: [],
    faq: [],
    sample: {
      docTitle: '',
      docMeta: [],
      lines: [],
      annotations: [],
      caption: '',
    },
  },

  experiment: {
    id: 'nische-2-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },
};
