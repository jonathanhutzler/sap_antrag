/**
 * Config-Schema der Prüf-Engine.
 *
 * Harte Architektur-Regel: Eine neue Nische besteht ausschließlich aus
 *   1. config/niches/<slug>.ts
 *   2. config/catalogues/<slug>.<version>.ts
 *   3. einem Eintrag in config/registry.ts
 * Alles, was eine Nische von einer anderen unterscheidet, muss in diesem
 * Schema abbildbar sein. Wenn etwas hier nicht abbildbar ist, ist die Engine
 * falsch geschnitten — dann wird die Engine umgebaut, nicht die Nische
 * ausgenommen.
 */

export type Severity = 'info' | 'warn' | 'error';

export interface Check {
  /** "HR-14" — stabil über Katalogversionen hinweg, wird im Report zitiert. */
  id: string;
  label: string;
  severity: Severity;
  /** Norm, Gesetz oder Referenzband. Pflichtfeld — ohne Grundlage kein Check. */
  basis: string;
  /** Was das Modell konkret prüfen soll. Geht wörtlich in den System-Prompt. */
  instruction: string;
  /** Realistische Spanne des finanziellen Effekts in Euro, falls bezifferbar. */
  euroImpact?: [number, number];
  /** Fachliche Gruppe, wird in der Vorschau namentlich gezeigt. */
  category: string;
}

export interface Catalogue {
  version: string;
  checks: Check[];
  published: boolean;
}

/**
 * Bekannte Berichtsabschnitte. Eine Nische wählt und ordnet daraus; jeder
 * Abschnitt wird generisch aus dem Ergebnis gerendert (lib/report.ts). Eine
 * neue Nische bekommt sie damit ohne Codeänderung.
 */
export const REPORT_SECTIONS = [
  'summary',
  'findings',
  'actions',
  'euro',
  'letter',
  'checklist',
  'method',
  'catalogue',
  'legal',
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

export interface AnnotatedSampleLine {
  text: string;
  amount?: string;
  /** Verweis auf eine Annotation, die diese Zeile markiert. */
  mark?: string;
}

/**
 * Signaturmotiv jeder Landing: annotierte Beispielansicht mit markierten
 * Fundstellen. Liegt in der Config, damit eine neue Nische ihr Motiv ohne
 * Komponentenänderung bekommt.
 */
export interface AnnotatedSample {
  docTitle: string;
  docMeta: string[];
  lines: AnnotatedSampleLine[];
  annotations: Array<{
    mark: string;
    checkId: string;
    severity: Severity;
    note: string;
  }>;
  caption: string;
}

export interface NicheConfig {
  /** = URL-Pfad, kanonisch. Ändert sich nie. */
  slug: string;
  active: boolean;
  /** Leer. Später optionale Exact-Match-Domain, die auf /<slug> zeigt. */
  aliasDomains: string[];

  brand: {
    name: string;
    claim: string;
    /** Einziger visueller Freiheitsgrad. Hex. */
    accent: string;
  };

  input: {
    docLabel: string;
    accept: Array<'pdf' | 'jpg' | 'png'>;
    maxFiles: number;
    maxMbPerFile: number;
    maxPages: number;
    /** Anker gegen Lesefehler: der Nutzer nennt die Summe selbst. */
    anchorField: { label: string; type: 'currency' | 'number'; hint?: string };
    contextFields: Array<{ id: string; label: string; options: string[] }>;
  };

  catalogue: Catalogue;

  ai: {
    model: string;
    /** Wird aus dem Katalog generiert, siehe lib/prompt.ts. */
    systemPrompt: string;
    /** JSON-Schema des erzwungenen Ausgabe-Tools. */
    outputTool: {
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    };
    maxTokens: number;
  };

  pricing: {
    preview: { visibleFindings: number; hideEuroTotal: true };
    tiers: Array<{
      id: string;
      label: string;
      priceCents: number;
      /** Aus der Umgebung gelesen, damit Test- und Live-Keys sauber trennen. */
      stripePriceId: string;
      includes: string[];
      /** Optionaler Override von `report.sections` für diese Preisstufe. */
      sections?: ReportSection[];
    }>;
  };

  report: { sections: ReportSection[]; showCatalogueVersion: true };

  legal: {
    disclaimer: string;
    professionalAdviceNote: string;
    imprintEntity: string;
    dataRetentionHours: number;
    /** Ein Satz für die Leistungsbeschreibung in den AGB, aus der Registry generiert. */
    serviceDescription: string;
  };

  landing: {
    h1: string;
    subline: string;
    proofPoints: string[];
    competitorAnchor?: string;
    faq: Array<{ q: string; a: string }>;
    /** Signaturmotiv. */
    sample: AnnotatedSample;
    /** Optionale Metadaten-Überschreibung; sonst aus h1/subline abgeleitet. */
    metaTitle?: string;
    metaDescription?: string;
  };

  experiment: {
    id: string;
    adsBudgetCents: number;
    killAfterClicks: number;
    minPaidConversions: number;
  };
}

/** Ergebnis eines einzelnen Funds, nach Sanitizing. */
export interface Finding {
  checkId: string;
  label: string;
  category: string;
  severity: Severity;
  /** Was im Dokument steht bzw. fehlt. Feststellung, keine Bewertung. */
  observation: string;
  /** Wörtliches Zitat oder Positionsbezeichnung aus dem Dokument. */
  documentRef: string;
  /** Genau eine Handlung, als Satz zum Sagen oder Schreiben. */
  action: string;
  basis: string;
  euroImpact?: [number, number];
  /** true, wenn der Betrag beim Sanitizing gedeckelt wurde. */
  euroCapped?: boolean;
}

export interface AnalysisResult {
  id: string;
  niche: string;
  /** Pflicht in jedem gespeicherten Ergebnis und in jedem PDF. */
  catalogueVersion: string;
  experimentId: string;
  createdAt: string;
  /** false => harter Abbruch vor dem Bezahl-Gate. */
  assessable: boolean;
  notAssessableReason?: string;
  docSummary: string;
  anchorValueCents: number | null;
  context: Record<string, string>;
  findings: Finding[];
  euroTotal: [number, number] | null;
  checkedIds: string[];
  model: string;
  paid: boolean;
  tier?: string;
  paidAt?: string;
  stripeSessionId?: string;
  customerEmail?: string;
  sanitizeLog: string[];
}
