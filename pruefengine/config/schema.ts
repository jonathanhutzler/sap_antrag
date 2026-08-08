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
  /** Nur bei Rechennischen: Eingangswerte, Rechenschritte, Zinsreihe, Band. */
  'calculation',
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
    /**
     * Kontextangaben. `options` macht daraus ein Auswahlfeld — dann geht nur
     * ein Wert aus dieser Liste in den Prompt, nie Freitext. `type: 'date'`
     * für Stichtage, die eine Rechennische als Eingangsgröße braucht.
     */
    contextFields: Array<{
      id: string;
      label: string;
      options?: string[];
      type?: 'select' | 'date';
      hint?: string;
      /** Fehlt der Wert, wird gar nicht erst analysiert. */
      required?: boolean;
    }>;
  };

  catalogue: Catalogue;

  ai: {
    model: string;
    /** Wird aus dem Katalog generiert, siehe lib/prompt.ts. */
    systemPrompt: string;
    /**
     * JSON-Schema des erzwungenen Ausgabe-Tools.
     * Bei gesetzter `computePipeline` wird stattdessen deren
     * `extractionTool` verwendet — siehe dort.
     */
    outputTool: {
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    };
    maxTokens: number;
    /**
     * Denkaufwand des Modells. Der wichtigste Kosten- und Zeitregler, weil
     * Denk-Token als Output zählen und Output rund fünfmal so teuer ist wie
     * Input.
     *
     * Ohne Angabe gilt `high` — der Standard der API. Vor jeder Senkung eine
     * Messung: `npm run measure:effort` fährt dasselbe Dokument auf zwei
     * Stufen und zeigt neben Token und Laufzeit, welche Prüfkategorien
     * wegfallen. Fällt eine Kategorie weg, ist die Antwort nicht
     * zurückdrehen, sondern die Kategorie im Prompt zum Pflichtbereich
     * erklären und im Code absichern.
     */
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    /**
     * Obergrenze für die Anzahl der Feststellungen. Steht im Prompt und wird
     * in `sanitize.ts` erzwungen. Grund ist nicht Übersichtlichkeit: Ein zu
     * langer Bericht läuft in `max_tokens`, und dann schlägt der ganze
     * Vorgang fehl statt nur lang zu werden. Ohne Angabe gilt der Wert aus
     * lib/sanitize.ts.
     */
    maxFindings?: number;
  };

  /**
   * Zweite Produktklasse: Rechennische statt Dokumentnische.
   *
   *   Dokumentnische: PDF → Modell liest, findet, formuliert → Feststellungen
   *   Rechennische:   PDF → Modell extrahiert NUR Parameter
   *                       → deterministischer Rechner im Code
   *                       → Vergleich fremder Wert gegen eigenen Wert
   *                       → Feststellungen aus der Differenz
   *
   * Der Grund für die Trennung ist nicht Eleganz, sondern Haftung: Ein
   * Sprachmodell darf in einem Streit über einen fünfstelligen Betrag keine
   * Zahlen selbst ausrechnen. Eine halluzinierte Barwertberechnung ist kein
   * Schönheitsfehler.
   *
   * Ist dieses Feld gesetzt, gilt:
   * - Das Modell wird ausschließlich zur Parameterextraktion aufgerufen.
   * - `extractionTool` darf keine Felder für Bewertungen, Urteile oder
   *   selbst errechnete Beträge enthalten. Es extrahiert, was dasteht.
   * - Fehlt ein Pflichtparameter, ist das Ergebnis „nicht beurteilbar" und
   *   es wird kein Kauf angeboten. Nicht geschätzt.
   * - Euro-Beträge des Rechners werden im Sanitizing NICHT gedeckelt: Die
   *   Deckelung existiert gegen Modellhalluzination, nicht gegen eigenen Code.
   */
  computePipeline?: {
    /** Zugleich der Modulname unter lib/calculators/<id>.ts. */
    id: string;
    /** JSON-Schema der Extraktion. Nur Parameter, keine Bewertung. */
    extractionTool: {
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    };
    /** Registrierter Rechner, siehe lib/calculators/index.ts. */
    calculator: string;
    /**
     * Externe Datenreihen, die der Rechner braucht — mit Kennung, damit im
     * Bericht steht, worauf gerechnet wurde.
     */
    dataSources: string[];
    /** Erst ab dieser Abweichung entsteht eine Feststellung. */
    tolerancePercent: number;
  };

  /**
   * Kostenlose Werkzeuge ohne Upload und ohne Bezahlschranke.
   * `id` wählt eine von der Engine bereitgestellte Umsetzung
   * (lib/freetools/index.ts); eine neue Nische bekommt ihr Werkzeug damit
   * über Config statt über eine eigene Route.
   */
  freeTools?: Array<{
    id: string;
    /** URL-Segment unter der Nische. */
    slug: string;
    title: string;
    intro: string;
    /** Überleitung zur kostenpflichtigen Prüfung. */
    cta: string;
  }>;

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
    /**
     * Zusätzliche verbotene Begriffe dieser Nische, über die global
     * geltenden hinaus (lib/sanitize.ts). `replacement: null` löscht den
     * ganzen Satz, in dem der Begriff steht.
     */
    forbiddenTerms?: Array<{ stem: string; replacement: string | null; label: string }>;
    /**
     * Sperrt die Nische trotz `active: true`, solange offene Punkte
     * bestehen — `check:niches` bricht dann mit Nennung der Gründe ab.
     * Gedacht für Nischen, die vor dem Livegang eine fachliche Freigabe
     * brauchen.
     */
    blockers?: string[];
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

  /**
   * Wirtschaftlichkeit der Nische, bevor ein Euro Werbebudget fließt.
   *
   * Steht hier und nicht in einer Tabelle, weil eine Tabelle veraltet, sobald
   * jemand den Preis ändert. `npm run economics` rechnet aus diesen Werten den
   * vertretbaren Klickpreis und stellt ihn dem Marktpreis gegenüber.
   *
   * Die Rechnung dahinter: Ein Klick bringt im Schnitt `preis × conversion`
   * an Umsatz. Davon gehen variable Kosten ab (Zahlungsgebühr, Modellaufruf,
   * Versand), und vom Rest darf nur ein Teil in den Klick fließen, sonst
   * bleibt nichts übrig. Was übrig bleiben soll, steht in `targetMarginShare`.
   */
  economics?: {
    /**
     * Preis, auf dem die Rechnung beruht, in Cent. Muss nicht der Preis einer
     * Stufe sein — bei zwei Stufen ist es der erwartete Mischpreis.
     */
    planPriceCents: number;
    /** Angenommene Conversion Klick → Kauf als Band, z. B. [0.03, 0.05]. */
    conversionBand: [number, number];
    /** Wirtschaftlich vertretbarer Klickpreis in Cent, Band. */
    targetCpcCents: [number, number];
    /** Was der Markt für die passenden Suchbegriffe verlangt, in Cent. */
    marketCpcCents: [number, number];
    /**
     * Woher der Marktwert stammt. Pflichtfeld: Eine geschätzte Zahl ohne
     * Herkunft ist im Zweifel eine erfundene Zahl.
     */
    marketCpcSource: string;
    /** Empfohlener Kanal, aus der Gegenüberstellung abgeleitet. */
    channel: 'ads' | 'ads-longtail' | 'seo-first' | 'seo-only';
    /** Ein Satz Einschätzung, in Klartext. */
    verdict: string;
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

/**
 * Ergebnis einer Rechennische. Wird vollständig mitgespeichert, damit ein
 * Bericht Monate später reproduzierbar ist: dieselben Eingangswerte plus
 * dieselbe Zinsreihe zum selben Stand ergeben dasselbe Band.
 */
export interface ComputeResult {
  calculatorId: string;
  /** Eigenes Ergebnis als Band, nie als Punktwert. */
  band: [number, number] | null;
  /** Was die Gegenseite fordert — aus dem Ankerfeld, nicht aus dem Modell. */
  claimEuro: number | null;
  /** Abweichung der Forderung vom oberen bzw. unteren Bandrand, in Prozent. */
  deviationPercent: number | null;
  position: 'innerhalb' | 'oberhalb' | 'unterhalb' | null;
  /** Pflichtparameter, die im Dokument fehlten. Nicht leer => nicht beurteilbar. */
  missingParams: string[];
  /** Verwendete Eingangswerte, wie sie in den Rechner gingen. */
  inputs: Record<string, unknown>;
  /** Nachvollziehbare Zwischenschritte für den Berichtsabschnitt. */
  steps: Array<{ label: string; value: string; note?: string }>;
  dataSource: { id: string; asOf: string; verified: boolean };
  computedAt: string;
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
  /**
   * Hinweis, wenn die Angabe des Nutzers und die vom Modell gelesene Summe
   * auseinandergehen. Gerechnet wird immer mit der Angabe des Nutzers; die
   * Abweichung wird genannt und nicht stillschweigend wegkorrigiert.
   */
  anchorNote?: string;
  context: Record<string, string>;
  findings: Finding[];
  euroTotal: [number, number] | null;
  checkedIds: string[];
  model: string;
  /** Nur bei Rechennischen gesetzt. */
  compute?: ComputeResult;
  paid: boolean;
  tier?: string;
  paidAt?: string;
  stripeSessionId?: string;
  customerEmail?: string;
  sanitizeLog: string[];
}
