import type { NicheConfig } from '../schema';
import { catalogue } from '../catalogues/beihilfebescheid-pruefen.0.1.0';

/**
 * Stub — Beihilfebescheid für Beamte. active: false.
 *
 * Die Nische ist attraktiv: harte Widerspruchsfrist von einem Monat,
 * zahlungskräftige und gut erreichbare Zielgruppe, klarer Anlass.
 *
 * Der Grund, warum sie ein Stub bleibt, ist struktureller Natur: Bund und
 * sechzehn Länder haben eigene Beihilfeverordnungen mit abweichenden
 * Bemessungssätzen, Eigenbehalten und Beihilfefähigkeitsgrenzen. Das ist kein
 * Prüfkatalog, das sind siebzehn.
 *
 * Erst freischalten, wenn ein oder zwei Dienstherren vollständig gepflegt
 * sind — und dann mit einem Kontextfeld „Dienstherr", das den Katalog
 * einschränkt, statt bundesweite Gültigkeit vorzutäuschen. Bei einer
 * Monatsfrist ist ein Katalog, der für das falsche Land rechnet, schlimmer
 * als gar keiner.
 */
export const beihilfebescheid: NicheConfig = {
  slug: 'beihilfebescheid-pruefen',
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Beihilfebescheid prüfen',
    claim: 'Vor Ablauf der Widerspruchsfrist.',
    accent: '#4a2c7c',
  },

  input: {
    docLabel: 'Beihilfebescheid',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 3,
    maxMbPerFile: 10,
    maxPages: 20,
    anchorField: {
      label: 'Ausgezahlter Beihilfebetrag (Euro)',
      type: 'currency',
      hint: 'Der Betrag, der im Bescheid als Auszahlung ausgewiesen ist.',
    },
    contextFields: [
      {
        id: 'dienstherr',
        label: 'Dienstherr',
        // Beim Freischalten auf die tatsächlich gepflegten Dienstherren
        // beschränken. Diese Liste ist der Schalter, der den Katalog
        // einschränkt — nicht Dekoration.
        options: ['Noch nicht gepflegt'],
      },
      {
        id: 'bescheiddatum',
        label: 'Datum des Bescheids',
        type: 'date',
        required: true,
        hint: 'Ab Bekanntgabe läuft die Widerspruchsfrist von regelmäßig einem Monat.',
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
        priceCents: 4900,
        stripePriceId: process.env.STRIPE_PRICE_BEIHILFE_BASIS || '',
        includes: ['Noch nicht ausformuliert'],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Widerspruchsentwurf',
        priceCents: 7900,
        stripePriceId: process.env.STRIPE_PRICE_BEIHILFE_PLUS || '',
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
      'Es gibt siebzehn Beihilfeverordnungen. Erst ein bis zwei Dienstherren vollständig pflegen, dann freischalten.',
      'Kontextfeld „Dienstherr" enthält nur einen Platzhalter.',
      'Katalog ist eine Skizze: jede basis-Angabe steht auf „ZU KLÄREN JE DIENSTHERR".',
    ],
  },

  landing: {
    h1: '',
    subline: '',
    proofPoints: [],
    faq: [],
    sample: { docTitle: '', docMeta: [], lines: [], annotations: [], caption: '' },
  },

  experiment: {
    id: 'beihilfe-unbestimmt',
    adsBudgetCents: 0,
    killAfterClicks: 0,
    minPaidConversions: 0,
  },
};
