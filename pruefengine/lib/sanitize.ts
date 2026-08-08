import type { AnalysisResult, Finding, NicheConfig, Severity } from '@/config/schema';
import type { RawAnalysis } from './analyze';
import type { CalculatorOutput } from './calculators/types';

/**
 * Zweite Verteidigungslinie hinter dem System-Prompt.
 *
 * Die Regeln 1 (Formulierungsgrenze), 4 (Euro-Schätzungen) und 5 ("nicht
 * beurteilbar") stehen im Prompt und werden hier zusätzlich erzwungen. Auf
 * Prompt-Befolgung allein verlassen wir uns nicht: ein Modellwechsel, eine
 * neue Modellversion oder ein ungewöhnliches Dokument reichen, damit eine
 * Regel einmal durchrutscht — und genau dieser eine Bericht ist der, der
 * später zitiert wird.
 *
 * Alles, was hier greift, landet in `sanitizeLog` und damit im gespeicherten
 * Ergebnis. Ein still korrigierter Bericht wäre bei einer Reklamation nicht
 * erklärbar.
 */

/**
 * Regel 1 und 2: verbotene Begriffe. Ersetzung, wo es eine saubere gibt,
 * sonst fällt der ganze Satz weg.
 *
 * Die Muster werden aus Wortstämmen erzeugt, nicht als fertige Regexe notiert.
 * Grund: `\b` taugt für deutschen Wortschatz nicht — Umlaute sind für
 * JavaScript keine Wortzeichen, weshalb `/\büberteuert/` ausgerechnet das Wort
 * nicht findet, das es finden soll. Mit `\p{L}` und dem u-Flag stimmt die
 * Wortgrenze. Jeder Aufruf bekommt ein frisches Muster, damit kein `lastIndex`
 * zwischen zwei Feldern hängen bleibt.
 */
const FORBIDDEN: Array<{ stem: string; replacement: string | null; label: string }> = [
  { stem: 'unwirksam', replacement: 'von der gesetzlichen Regelung abweichend', label: 'unwirksam' },
  { stem: 'rechtswidrig', replacement: 'von der gesetzlichen Regelung abweichend', label: 'rechtswidrig' },
  { stem: 'nichtig', replacement: 'von der gesetzlichen Regelung abweichend', label: 'nichtig' },
  { stem: 'sittenwidrig', replacement: 'von der gesetzlichen Regelung abweichend', label: 'sittenwidrig' },
  { stem: 'überteuert', replacement: 'über dem Referenzband liegend', label: 'überteuert' },
  { stem: 'ueberteuert', replacement: 'über dem Referenzband liegend', label: 'überteuert' },
  { stem: 'zu teuer', replacement: 'über dem Referenzband', label: 'zu teuer' },
  { stem: 'wucher', replacement: 'deutlich über dem Referenzband liegend', label: 'Wucher' },
  { stem: 'strafbar', replacement: 'von der gesetzlichen Regelung abweichend', label: 'strafbar' },
  { stem: 'illegal', replacement: 'von der gesetzlichen Regelung abweichend', label: 'illegal' },
  // Regel 2: keine Absichtszuschreibung gegenüber dem Rechnungssteller. Das
  // Wort fällt weg, der Satz bleibt stehen — die Feststellung dahinter ist ja
  // in Ordnung, nur das unterstellte Motiv nicht.
  { stem: 'vorsätzlich', replacement: '', label: 'vorsätzlich' },
  { stem: 'absichtlich', replacement: '', label: 'absichtlich' },
  { stem: 'bewusst falsch', replacement: 'abweichend', label: 'bewusst falsch' },
  { stem: 'manipuliert', replacement: 'abweichend erfasst', label: 'manipuliert' },
  // Hier hilft keine Ersetzung: Wer „Betrug" schreibt, macht einen Vorwurf,
  // und der lässt sich nicht in eine Feststellung umbiegen. Der Satz fällt.
  { stem: 'betrug', replacement: null, label: 'Betrug' },
  { stem: 'betrüger', replacement: null, label: 'Betrüger' },
  { stem: 'unseriös', replacement: null, label: 'unseriös' },
  { stem: 'unserioes', replacement: null, label: 'unseriös' },
  { stem: 'abzocke', replacement: null, label: 'Abzocke' },
  { stem: 'täusch', replacement: null, label: 'Täuschung' },
  { stem: 'getäuscht', replacement: null, label: 'getäuscht' },
];

function patternFor(stem: string): RegExp {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\p{L})${escaped}\\p{L}*`, 'giu');
}

type ForbiddenRule = { stem: string; replacement: string | null; label: string };

/**
 * Global geltende Begriffe plus die zusätzlichen dieser Nische.
 * Bei Rechennischen sind die zusätzlichen der eigentliche Schutz: Der Bericht
 * darf nachrechnen und fragen, aber nicht beurteilen.
 */
function rulesFor(niche: NicheConfig): ForbiddenRule[] {
  return [...FORBIDDEN, ...(niche.legal.forbiddenTerms ?? [])];
}


/** Ein einzelner Fund darf höchstens diesen Anteil der Dokumentsumme ausmachen. */
const MAX_SHARE_PER_FINDING = 0.4;
/** Alle Funde zusammen höchstens diesen Anteil der Dokumentsumme. */
const MAX_SHARE_TOTAL = 0.8;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Wortfilter auf einem Textfeld.
 *
 * Ersetzen geht vor Löschen. Ein gelöschter Satz reißt ein Loch in den
 * Bericht, und der Kunde sieht nur, dass etwas fehlt — nicht, was. Deshalb
 * hat jede Regel eine Ersetzung, wo es eine saubere gibt: `''` streicht nur
 * das Wort und lässt den Satz stehen, ein Text ersetzt es. Erst `null`
 * entfernt den ganzen Satz, und das ist auf die Fälle beschränkt, in denen
 * der Satz ein Vorwurf ist und nicht eine Feststellung mit falschem Wort.
 */
function filterWords(
  text: string,
  log: string[],
  where: string,
  rules: ForbiddenRule[] = FORBIDDEN,
): string {
  let working = text;

  for (const rule of rules) {
    // Nur `null` löscht. `''` ist eine Ersetzung und muss hier durchkommen.
    if (rule.replacement === null) continue;
    const pattern = patternFor(rule.stem);
    if (pattern.test(working)) {
      working = working.replace(patternFor(rule.stem), rule.replacement);
      // Ersetzungen mit leerem String hinterlassen doppelte Leerzeichen und
      // Leerzeichen vor Satzzeichen.
      working = working.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
      log.push(`Regel 1: „${rule.label}" in ${where} ersetzt.`);
    }
  }

  const kept = splitSentences(working).filter((sentence) => {
    for (const rule of rules) {
      if (rule.replacement !== null) continue;
      if (patternFor(rule.stem).test(sentence)) {
        log.push(`Regel 1: Satz mit „${rule.label}" in ${where} entfernt.`);
        return false;
      }
    }
    return true;
  });

  return kept.join(' ').trim();
}

function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warn: 1, error: 2 };

/**
 * Schweregrad. Der Katalog gibt die Obergrenze vor.
 *
 * Nach unten darf das Modell abweichen — es sieht den Einzelfall, und eine
 * fehlende Angabe kann in einem Dokument nebensächlich sein, in dem anderen
 * nicht. Nach oben nicht: Sonst steht im Bericht ein Schweregrad, den der
 * öffentliche Prüfkatalog nicht hergibt, und der Katalog ist das, was der
 * Kunde vor dem Hochladen gesehen hat.
 */
function severityWithin(value: unknown, cap: Severity, log: string[], checkId: string): Severity {
  if (value !== 'info' && value !== 'warn' && value !== 'error') return cap;
  if (SEVERITY_RANK[value] > SEVERITY_RANK[cap]) {
    log.push(`${checkId}: Schweregrad „${value}" auf die Katalogvorgabe „${cap}" zurückgesetzt.`);
    return cap;
  }
  return value;
}

/**
 * Obergrenze für die Anzahl der Feststellungen, wenn die Nische keine eigene
 * setzt. Sie steht auch im System-Prompt (lib/prompt.ts) — hier ist die
 * Durchsetzung. Der Grund ist nicht Lesbarkeit: Ein Bericht, der über die
 * Grenze läuft, läuft in `max_tokens`, und dann schlägt der ganze Vorgang
 * fehl statt nur lang zu werden.
 */
export const DEFAULT_MAX_FINDINGS = 25;

/** Anteil, ab dem Ankerwert und gelesene Summe als Abweichung gelten. */
const ANCHOR_TOLERANCE = 0.02;

/** Handlung: eine Handlung, kein Aufzählungsblock. */
function normalizeAction(text: string): string {
  return text
    .replace(/^\s*[-•*\d]+[.)]?\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Obergrenze durchsetzen. Läuft nach der Sortierung, also fallen die
 * leichtesten Funde weg und nicht die zufällig letzten. Der Abschnitt landet
 * im Protokoll: Ein Bericht, dem still etwas fehlt, ist bei einer Reklamation
 * nicht erklärbar.
 */
function capFindings(findings: Finding[], niche: NicheConfig, log: string[]): void {
  const max = niche.ai.maxFindings ?? DEFAULT_MAX_FINDINGS;
  if (findings.length <= max) return;

  const dropped = findings.length - max;
  findings.length = max;
  log.push(
    `Obergrenze: ${dropped} Feststellungen über die zugesagten ${max} hinaus entfernt. Entfernt wurden die leichtesten, sortiert nach Schwere und Betrag.`,
  );
}

function euro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

/** Wirtschaftlich überschneidende Funde erkennen wir an derselben Fundstelle. */
function overlapKey(finding: Finding): string {
  return finding.documentRef.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '').slice(0, 60);
}

export interface SanitizeInput {
  raw: RawAnalysis;
  niche: NicheConfig;
  anchorCents: number | null;
  context: Record<string, string>;
  model: string;
  id: string;
}

export function sanitize({
  raw,
  niche,
  anchorCents,
  context,
  model,
  id,
}: SanitizeInput): AnalysisResult {
  const log: string[] = [];
  const rules = rulesFor(niche);
  const checksById = new Map(niche.catalogue.checks.map((c) => [c.id, c]));

  const base: AnalysisResult = {
    id,
    niche: niche.slug,
    catalogueVersion: niche.catalogue.version,
    experimentId: niche.experiment.id,
    createdAt: new Date().toISOString(),
    assessable: raw.assessable,
    docSummary: filterWords(clean(raw.docSummary), log, 'Zusammenfassung', rules),
    anchorValueCents: anchorCents,
    context,
    findings: [],
    euroTotal: null,
    checkedIds: raw.checkedIds.filter((cid) => checksById.has(cid)),
    model,
    paid: false,
    sanitizeLog: log,
  };

  // Regel 5: harter Abbruch. Kein Fund, keine Summe, kein Bezahl-Gate.
  if (!raw.assessable) {
    const reason = filterWords(
      clean(raw.notAssessableReason) || 'Das hochgeladene Dokument konnte nicht geprüft werden.',
      log,
      'Begründung',
      rules,
    );
    return { ...base, assessable: false, notAssessableReason: reason, docSummary: '' };
  }

  /** Bezugsgröße für die Deckelung: Angabe des Nutzers vor Modell-Lesung. */
  const referenceEuro =
    anchorCents !== null && anchorCents > 0
      ? anchorCents / 100
      : typeof raw.documentTotalEuro === 'number' && raw.documentTotalEuro > 0
        ? raw.documentTotalEuro
        : null;

  if (referenceEuro === null) {
    log.push('Regel 4: keine belastbare Dokumentsumme vorhanden — alle Euro-Schätzungen entfernt.');
  }

  // Nutzereingabe schlägt Modell-Lesung. Weicht beides voneinander ab, wird
  // die Abweichung genannt statt stillschweigend wegkorrigiert. Beide Zahlen
  // können richtig sein — Brutto gegen Netto, Schlussrechnung gegen
  // Abschlagsrechnung — und die Frage, welche gemeint ist, gehört zum Kunden.
  let anchorNote: string | undefined;
  const readEuro =
    typeof raw.documentTotalEuro === 'number' && raw.documentTotalEuro > 0 ? raw.documentTotalEuro : null;

  if (anchorCents !== null && anchorCents > 0 && readEuro !== null) {
    const anchorEuro = anchorCents / 100;
    const deviation = Math.abs(readEuro - anchorEuro) / anchorEuro;

    if (deviation > ANCHOR_TOLERANCE) {
      const percent = Math.round(deviation * 100);
      anchorNote = [
        `Sie haben ${euro(anchorEuro)} als Endsumme angegeben, im Dokument gelesen wurde ${euro(readEuro)}.`,
        `Das sind ${percent} % Unterschied. Gerechnet wurde mit Ihrer Angabe.`,
        'Beide Zahlen können richtig sein, etwa bei Brutto und Netto oder bei einer Rechnung mit Abschlägen.',
        'Bitte prüfen Sie, welche der beiden die Endsumme Ihrer Rechnung ist.',
      ].join(' ');
      log.push(
        `Anker: Angabe ${anchorEuro.toFixed(2)} €, Modell-Lesung ${readEuro.toFixed(2)} €, Abweichung ${percent} %. Gerechnet wurde mit der Angabe.`,
      );
    }
  }

  const findings: Finding[] = [];

  for (const rawFinding of raw.findings) {
    const checkId = clean(rawFinding.checkId);
    const check = checksById.get(checkId);

    // Regel 6: kein Fund ohne Katalogpunkt.
    if (!check) {
      log.push(`Fund mit unbekannter Prüfpunkt-ID „${checkId || '—'}" verworfen.`);
      continue;
    }

    const documentRef = clean(rawFinding.documentRef);
    if (!documentRef) {
      log.push(`${checkId}: Fund ohne Fundstelle im Dokument verworfen.`);
      continue;
    }

    const observation = filterWords(clean(rawFinding.observation), log, `${checkId}/Feststellung`, rules);
    const action = filterWords(normalizeAction(clean(rawFinding.action)), log, `${checkId}/Handlung`, rules);

    if (!observation) {
      log.push(`${checkId}: Fund ohne verbleibende Feststellung verworfen.`);
      continue;
    }
    // Regel 3: ohne Handlung kein Fund.
    if (!action) {
      log.push(`${checkId}: Fund ohne Handlungssatz verworfen.`);
      continue;
    }

    const finding: Finding = {
      checkId,
      label: check.label,
      category: check.category,
      severity: severityWithin(rawFinding.severity, check.severity, log, checkId),
      observation,
      documentRef,
      action,
      basis: check.basis,
    };

    // Regel 4: Euro-Schätzung nur mit Grundlage, immer als Spanne, gedeckelt.
    const low = Number(rawFinding.euroImpactLowEuro);
    const high = Number(rawFinding.euroImpactHighEuro);
    const hasRange = Number.isFinite(low) && Number.isFinite(high) && high > 0;

    if (hasRange && referenceEuro !== null) {
      // Katalogpunkte mit Band [0,0] sind ausdrücklich nicht bezifferbar.
      const catalogueMax = check.euroImpact ? check.euroImpact[1] : null;

      if (catalogueMax === 0) {
        log.push(`${checkId}: Euro-Schätzung entfernt, der Prüfpunkt ist nicht bezifferbar.`);
      } else {
        let lo = Math.max(0, Math.min(low, high));
        let hi = Math.max(low, high);
        let capped = false;

        const shareCap = referenceEuro * MAX_SHARE_PER_FINDING;
        if (hi > shareCap) {
          hi = shareCap;
          capped = true;
          log.push(
            `${checkId}: Obergrenze auf ${Math.round(shareCap)} € gedeckelt (${Math.round(
              MAX_SHARE_PER_FINDING * 100,
            )} % der Dokumentsumme).`,
          );
        }
        if (catalogueMax !== null && hi > catalogueMax) {
          hi = catalogueMax;
          capped = true;
          log.push(`${checkId}: Obergrenze auf das Katalogband ${catalogueMax} € gedeckelt.`);
        }
        lo = Math.min(lo, hi);

        if (hi >= 1) {
          finding.euroImpact = [Math.round(lo), Math.round(hi)];
          if (capped) finding.euroCapped = true;
        } else {
          log.push(`${checkId}: Euro-Schätzung unter 1 € entfernt.`);
        }
      }
    } else if (hasRange) {
      log.push(`${checkId}: Euro-Schätzung ohne belastbare Dokumentsumme entfernt.`);
    }

    findings.push(finding);
  }

  // Sortierung: schwerste zuerst, innerhalb gleicher Schwere die teuerste.
  const order: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => {
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return (b.euroImpact?.[1] ?? 0) - (a.euroImpact?.[1] ?? 0);
  });

  capFindings(findings, niche, log);

  // Regel 4: keine Addition über überschneidende Posten. Bei gleicher
  // Fundstelle zählt nur der weiter reichende Fund in die Summe.
  let total: [number, number] | null = null;
  if (referenceEuro !== null) {
    const seen = new Set<string>();
    let lo = 0;
    let hi = 0;
    let counted = 0;

    for (const finding of findings) {
      if (!finding.euroImpact) continue;
      const key = overlapKey(finding);
      if (key && seen.has(key)) {
        log.push(`${finding.checkId}: nicht in die Summe aufgenommen, gleiche Fundstelle bereits gezählt.`);
        continue;
      }
      if (key) seen.add(key);
      lo += finding.euroImpact[0];
      hi += finding.euroImpact[1];
      counted += 1;
    }

    if (counted > 0) {
      const totalCap = referenceEuro * MAX_SHARE_TOTAL;
      if (hi > totalCap) {
        const factor = totalCap / hi;
        lo = lo * factor;
        hi = totalCap;
        log.push(
          `Summe auf ${Math.round(totalCap)} € gedeckelt (${Math.round(MAX_SHARE_TOTAL * 100)} % der Dokumentsumme).`,
        );
      }
      total = [Math.round(lo), Math.round(hi)];
    }
  }

  return { ...base, findings, euroTotal: total, anchorNote, sanitizeLog: log };
}

/**
 * Bezahl-Gate. Nur wenn beides gilt, darf ein Kauf angeboten werden:
 * das Dokument war beurteilbar und es gibt mindestens einen Fund.
 */
export function canPurchase(result: AnalysisResult): boolean {
  return result.assessable && result.findings.length > 0;
}

/**
 * Der eine ausformulierte Fund in der Vorschau: ein mittelschwerer, nicht der
 * größte. Reihenfolge der Suche: warn ohne Höchstbetrag, dann warn, dann info,
 * dann error — und aus der Auswahl nie der teuerste Fund insgesamt.
 */
export function previewFindings(result: AnalysisResult, count: number): Finding[] {
  if (result.findings.length === 0) return [];

  const maxEuro = Math.max(...result.findings.map((f) => f.euroImpact?.[1] ?? 0));
  const notLargest = (f: Finding) => (f.euroImpact?.[1] ?? 0) < maxEuro || maxEuro === 0;

  const pools: Finding[][] = [
    result.findings.filter((f) => f.severity === 'warn' && notLargest(f)),
    result.findings.filter((f) => f.severity === 'info' && notLargest(f)),
    result.findings.filter((f) => f.severity === 'error' && notLargest(f)),
    result.findings,
  ];

  const picked: Finding[] = [];
  for (const pool of pools) {
    for (const finding of pool) {
      if (picked.length >= count) break;
      if (!picked.includes(finding)) picked.push(finding);
    }
    if (picked.length >= count) break;
  }

  return picked.slice(0, count);
}

/** Kennzahlen der Vorschau — ohne Euro-Beträge. */
export function previewStats(result: AnalysisResult): {
  counts: Record<Severity, number>;
  total: number;
  categories: string[];
} {
  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  const categories = new Set<string>();

  for (const finding of result.findings) {
    counts[finding.severity] += 1;
    categories.add(finding.category);
  }

  return { counts, total: result.findings.length, categories: Array.from(categories) };
}

/* ══════════════════════════════════════════════════════════════════════════
   Rechennischen
   ══════════════════════════════════════════════════════════════════════════ */

export interface SanitizeComputedInput {
  output: CalculatorOutput;
  niche: NicheConfig;
  anchorCents: number | null;
  context: Record<string, string>;
  model: string;
  id: string;
  /** Fundstellen aus der Extraktion, je Parameter. */
  sources: Record<string, string>;
}

/**
 * Sanitizing für Rechennischen.
 *
 * Unterschied zur Dokumentnische, bewusst und wichtig: Die Euro-Beträge
 * werden hier NICHT gedeckelt. Die Deckelung existiert gegen halluzinierte
 * Zahlen eines Sprachmodells. Diese Zahlen kommen aus getestetem Rechencode —
 * sie nachträglich zu beschneiden würde ein korrektes Ergebnis verfälschen
 * und wäre bei einer Reklamation nicht erklärbar.
 *
 * Was bleibt: der Wortfilter. Er ist hier sogar strenger, weil die Nische
 * eigene verbotene Begriffe mitbringen kann (`legal.forbiddenTerms`) — der
 * Bericht darf nachrechnen und fragen, aber nicht beurteilen.
 */
export function sanitizeComputed({
  output,
  niche,
  anchorCents,
  context,
  model,
  id,
  sources,
}: SanitizeComputedInput): AnalysisResult {
  const log: string[] = [];
  const rules = rulesFor(niche);
  const checksById = new Map(niche.catalogue.checks.map((c) => [c.id, c]));

  const base: AnalysisResult = {
    id,
    niche: niche.slug,
    catalogueVersion: niche.catalogue.version,
    experimentId: niche.experiment.id,
    createdAt: new Date().toISOString(),
    assessable: output.assessable,
    docSummary: filterWords(clean(output.summary), log, 'Zusammenfassung', rules),
    anchorValueCents: anchorCents,
    context,
    findings: [],
    euroTotal: null,
    checkedIds: [],
    model,
    compute: output.compute,
    paid: false,
    sanitizeLog: log,
  };

  // Fehlender Pflichtparameter: harter Abbruch vor dem Bezahl-Gate.
  if (!output.assessable) {
    const reason = filterWords(
      clean(output.notAssessableReason) || 'Die Unterlagen reichen für eine Nachrechnung nicht aus.',
      log,
      'Begründung',
      rules,
    );
    return { ...base, assessable: false, notAssessableReason: reason, docSummary: '' };
  }

  const findings: Finding[] = [];

  for (const calcFinding of output.findings) {
    const check = checksById.get(calcFinding.checkId);
    if (!check) {
      log.push(`Fund mit unbekannter Prüfpunkt-ID „${calcFinding.checkId}" verworfen.`);
      continue;
    }

    const observation = filterWords(
      clean(calcFinding.observation),
      log,
      `${calcFinding.checkId}/Feststellung`,
      rules,
    );
    const action = filterWords(
      normalizeAction(clean(calcFinding.action)),
      log,
      `${calcFinding.checkId}/Handlung`,
      rules,
    );

    if (!observation) {
      log.push(`${calcFinding.checkId}: Fund ohne verbleibende Feststellung verworfen.`);
      continue;
    }
    if (!action) {
      log.push(`${calcFinding.checkId}: Fund ohne Handlungssatz verworfen.`);
      continue;
    }

    findings.push({
      checkId: calcFinding.checkId,
      label: check.label,
      category: check.category,
      severity: calcFinding.severity ?? check.severity,
      observation,
      // Fundstelle aus der Extraktion, sonst die des Rechners.
      documentRef: sources[calcFinding.checkId] ?? clean(calcFinding.documentRef),
      action,
      basis: check.basis,
      euroImpact: calcFinding.euroImpact
        ? [Math.round(calcFinding.euroImpact[0]), Math.round(calcFinding.euroImpact[1])]
        : undefined,
    });
  }

  const order: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => {
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return (b.euroImpact?.[1] ?? 0) - (a.euroImpact?.[1] ?? 0);
  });

  capFindings(findings, niche, log);

  log.push(
    'Rechennische: Euro-Beträge stammen aus geprüftem Rechencode und werden nicht gedeckelt.',
  );

  return {
    ...base,
    findings,
    // Die Gesamtaussage ist das Band des Rechners, nicht eine Summe der Funde.
    euroTotal: output.compute.band,
    checkedIds: niche.catalogue.checks.map((c) => c.id),
    sanitizeLog: log,
  };
}
