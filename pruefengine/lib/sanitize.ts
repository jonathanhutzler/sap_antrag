import type { AnalysisResult, Finding, NicheConfig, Severity } from '@/config/schema';
import type { RawAnalysis } from './analyze';

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
  { stem: 'überteuert', replacement: 'über dem Referenzband liegend', label: 'überteuert' },
  { stem: 'ueberteuert', replacement: 'über dem Referenzband liegend', label: 'überteuert' },
  { stem: 'zu teuer', replacement: 'über dem Referenzband', label: 'zu teuer' },
  { stem: 'betrug', replacement: null, label: 'Betrug' },
  { stem: 'betrüger', replacement: null, label: 'Betrüger' },
  { stem: 'unseriös', replacement: null, label: 'unseriös' },
  { stem: 'unserioes', replacement: null, label: 'unseriös' },
  { stem: 'abzocke', replacement: null, label: 'Abzocke' },
  { stem: 'wucher', replacement: null, label: 'Wucher' },
  { stem: 'sittenwidrig', replacement: null, label: 'sittenwidrig' },
  { stem: 'strafbar', replacement: null, label: 'strafbar' },
  { stem: 'illegal', replacement: null, label: 'illegal' },
  // Regel 2: keine Absichtszuschreibung gegenüber dem Rechnungssteller.
  { stem: 'täusch', replacement: null, label: 'Täuschung' },
  { stem: 'getäuscht', replacement: null, label: 'getäuscht' },
  { stem: 'vorsätzlich', replacement: null, label: 'vorsätzlich' },
  { stem: 'absichtlich', replacement: null, label: 'absichtlich' },
  { stem: 'manipuliert', replacement: null, label: 'manipuliert' },
];

function patternFor(stem: string): RegExp {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\p{L})${escaped}\\p{L}*`, 'giu');
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
 * Wortfilter auf einem Textfeld. Ersetzbare Begriffe werden ersetzt, nicht
 * ersetzbare löschen den Satz, in dem sie stehen.
 */
function filterWords(text: string, log: string[], where: string): string {
  let working = text;

  for (const rule of FORBIDDEN) {
    if (!rule.replacement) continue;
    const pattern = patternFor(rule.stem);
    if (pattern.test(working)) {
      working = working.replace(patternFor(rule.stem), rule.replacement);
      log.push(`Regel 1: „${rule.label}" in ${where} ersetzt.`);
    }
  }

  const kept = splitSentences(working).filter((sentence) => {
    for (const rule of FORBIDDEN) {
      if (rule.replacement) continue;
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

function asSeverity(value: unknown, fallback: Severity): Severity {
  return value === 'info' || value === 'warn' || value === 'error' ? value : fallback;
}

/** Handlung: eine Handlung, kein Aufzählungsblock. */
function normalizeAction(text: string): string {
  return text
    .replace(/^\s*[-•*\d]+[.)]?\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  const checksById = new Map(niche.catalogue.checks.map((c) => [c.id, c]));

  const base: AnalysisResult = {
    id,
    niche: niche.slug,
    catalogueVersion: niche.catalogue.version,
    experimentId: niche.experiment.id,
    createdAt: new Date().toISOString(),
    assessable: raw.assessable,
    docSummary: filterWords(clean(raw.docSummary), log, 'Zusammenfassung'),
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

    const observation = filterWords(clean(rawFinding.observation), log, `${checkId}/Feststellung`);
    const action = filterWords(normalizeAction(clean(rawFinding.action)), log, `${checkId}/Handlung`);

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
      severity: asSeverity(rawFinding.severity, check.severity),
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

  return { ...base, findings, euroTotal: total, sanitizeLog: log };
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
