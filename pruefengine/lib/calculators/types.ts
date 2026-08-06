import type { ComputeResult, Severity } from '@/config/schema';
import type { RateSeries } from '../data/zinsreihe';

/**
 * Vertrag zwischen Engine und Rechner.
 *
 * Ein Rechner ist reiner, testbarer Code: keine Modellaufrufe, keine Netz-
 * zugriffe, keine Zufallsquellen. Gleiche Eingaben plus gleicher Stand der
 * Zinsreihe ergeben dasselbe Ergebnis — das ist die Bedingung dafür, dass ein
 * Bericht Monate später reproduzierbar ist.
 */

export interface CalculatorContext {
  /** Forderung der Gegenseite in Euro. Aus dem Ankerfeld, nicht aus dem Modell. */
  claimEuro: number | null;
  /** Auswahl- und Datumsangaben des Nutzers. */
  context: Record<string, string>;
  /** Erst ab dieser Abweichung entsteht eine Feststellung. */
  tolerancePercent: number;
  series: RateSeries;
}

/** Feststellung, wie ein Rechner sie liefert. Label, Kategorie und Grundlage
 * ergänzt die Engine aus dem Katalog. */
export interface CalcFinding {
  checkId: string;
  severity?: Severity;
  observation: string;
  /** Woher der Wert stammt: Dokument und Seite, oder die eigene Rechnung. */
  documentRef: string;
  action: string;
  euroImpact?: [number, number];
}

export interface CalculatorOutput {
  assessable: boolean;
  notAssessableReason?: string;
  /** Beschreibender Zweizeiler für die Vorschau. Keine Bewertung. */
  summary: string;
  compute: ComputeResult;
  findings: CalcFinding[];
}

export type Calculator = (
  params: Record<string, unknown>,
  ctx: CalculatorContext,
) => CalculatorOutput;

/* ── Hilfsfunktionen, die mehr als ein Rechner braucht ──────────────────── */

export function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function bool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'ja' || value === 'true') return true;
  if (value === 'nein' || value === 'false') return false;
  return null;
}

/** Datum aus YYYY-MM-DD oder DD.MM.YYYY. Immer UTC-Mitternacht. */
export function date(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));

  const de = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) return new Date(Date.UTC(+de[3], +de[2] - 1, +de[1]));

  return null;
}

export function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const targetDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(targetDay, lastDay));
  return result;
}

/** Volle Monate zwischen zwei Daten, nie negativ. */
export function monthsBetween(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function formatEuroDe(value: number): string {
  return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €`;
}

export function formatPercentDe(value: number, digits = 2): string {
  return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} %`;
}
