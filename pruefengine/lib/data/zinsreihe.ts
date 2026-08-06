/**
 * Laufzeitkongruente Wiederanlagesätze für die Abzinsung.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ACHTUNG — DIESE REIHE IST NICHT VERIFIZIERT UND ENTHÄLT KEINE ECHTEN DATEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Die Bundesbank-Zeitreihe für Hypothekenpfandbrief-Renditen muss vor dem
 * Livegang selbst herausgesucht, ihre Kennung hier eingetragen und die
 * Lizenzbedingungen geprüft werden. Ich habe bewusst KEINE Kennung geraten:
 * eine falsche Reihe fällt niemandem auf und produziert monatelang falsche
 * Bänder — und zwar bei fünfstelligen Beträgen.
 *
 * Bis `verified: true` gesetzt ist:
 * - `npm run check:niches` bricht für jede Nische ab, die auf diese Reihe baut
 * - der Rechner verweigert in Produktion die Arbeit (siehe rateFor)
 * - in Entwicklung und Test rechnet er mit den Platzhaltern und warnt laut
 *
 * Was zu tun ist:
 *   1. Passende Reihe im Bundesbank-Zeitreihen-Portal identifizieren
 *      (Umlaufsrenditen bzw. Renditen von Hypothekenpfandbriefen,
 *       nach Restlaufzeitbändern gegliedert)
 *   2. Kennung in `SERIES.id` eintragen, Bezugsquelle in `SERIES.source`
 *   3. Historische Monatsstände importieren — nicht nur den aktuellen Stand.
 *      Ohne Historie lässt sich ein zurückliegender Ablösestichtag nicht
 *      rechnen, und genau das ist der Rückforderungsfall.
 *   4. `verified: true` setzen und den Blocker aus der Nischen-Config nehmen
 */

export interface RateCurvePoint {
  /** Restlaufzeit in Jahren. */
  years: number;
  /** Rendite p. a. als Dezimalzahl, 0.032 = 3,2 %. */
  rate: number;
}

export interface RateCurve {
  /** Monatsstand im Format YYYY-MM. */
  month: string;
  points: RateCurvePoint[];
}

export interface RateSeries {
  id: string;
  label: string;
  source: string;
  verified: boolean;
  curves: RateCurve[];
}

export const SERIES: RateSeries = {
  id: process.env.RATE_SERIES_ID || 'PLATZHALTER-KENNUNG-EINTRAGEN',
  label: 'Renditen von Hypothekenpfandbriefen nach Restlaufzeit',
  source: process.env.RATE_SERIES_SOURCE || 'PLATZHALTER-BEZUGSQUELLE-EINTRAGEN',
  verified: process.env.RATE_SERIES_VERIFIED === 'true',

  /**
   * PLATZHALTER. Struktur ist echt, die Zahlen sind es nicht. Sie sind so
   * gewählt, dass die Testsuite deterministisch läuft — nicht, weil sie einem
   * Marktstand entsprechen.
   */
  curves: [
    {
      month: '2024-01',
      points: [
        { years: 1, rate: 0.032 },
        { years: 2, rate: 0.03 },
        { years: 3, rate: 0.029 },
        { years: 5, rate: 0.029 },
        { years: 7, rate: 0.03 },
        { years: 10, rate: 0.031 },
        { years: 15, rate: 0.033 },
      ],
    },
    {
      month: '2025-01',
      points: [
        { years: 1, rate: 0.026 },
        { years: 2, rate: 0.025 },
        { years: 3, rate: 0.025 },
        { years: 5, rate: 0.026 },
        { years: 7, rate: 0.027 },
        { years: 10, rate: 0.029 },
        { years: 15, rate: 0.031 },
      ],
    },
    {
      month: '2026-01',
      points: [
        { years: 1, rate: 0.022 },
        { years: 2, rate: 0.022 },
        { years: 3, rate: 0.023 },
        { years: 5, rate: 0.024 },
        { years: 7, rate: 0.025 },
        { years: 10, rate: 0.027 },
        { years: 15, rate: 0.029 },
      ],
    },
  ],
};

export class RateSeriesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateSeriesError';
  }
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Kurve zum Stichtag. Genommen wird der jüngste Monatsstand, der nicht nach
 * dem Stichtag liegt — nie ein späterer. Sonst würde ein zurückliegender
 * Ablösestichtag mit Zinsen gerechnet, die es damals nicht gab.
 */
export function curveFor(series: RateSeries, asOf: Date): RateCurve {
  const key = monthKey(asOf);
  const eligible = series.curves.filter((c) => c.month <= key).sort((a, b) => (a.month < b.month ? 1 : -1));

  if (eligible.length === 0) {
    throw new RateSeriesError(
      `Für den Stichtag ${key} liegt kein Stand der Zinsreihe „${series.id}" vor. ` +
        'Historische Stände importieren, bevor zurückliegende Stichtage gerechnet werden.',
    );
  }
  return eligible[0];
}

/**
 * Laufzeitkongruenter Satz. Zwischen Stützstellen linear interpoliert,
 * außerhalb auf den Randwert gesetzt.
 */
export function rateFor(curve: RateCurve, years: number): number {
  const points = [...curve.points].sort((a, b) => a.years - b.years);
  if (points.length === 0) throw new RateSeriesError('Zinskurve ohne Stützstellen.');

  if (years <= points[0].years) return points[0].rate;
  if (years >= points[points.length - 1].years) return points[points.length - 1].rate;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (years >= a.years && years <= b.years) {
      const t = (years - a.years) / (b.years - a.years);
      return a.rate + t * (b.rate - a.rate);
    }
  }
  return points[points.length - 1].rate;
}

/**
 * Verweigert die Arbeit, solange die Reihe nicht bestätigt ist — außer in
 * Entwicklung und Test, dort nur mit lauter Warnung.
 */
export function assertUsable(series: RateSeries): void {
  if (series.verified) return;

  if (process.env.NODE_ENV === 'production') {
    throw new RateSeriesError(
      `Die Zinsreihe „${series.id}" ist nicht als verifiziert markiert. ` +
        'Kennung, Bezugsquelle und historische Stände prüfen, dann RATE_SERIES_VERIFIED=true setzen.',
    );
  }
  console.warn(
    JSON.stringify({
      type: 'rate_series_unverified',
      id: series.id,
      hinweis: 'Es wird mit Platzhalterwerten gerechnet. Nicht für den Livebetrieb.',
    }),
  );
}
