import type { Calculator } from './types';
import { vfeAktivPassiv } from './vfe-aktiv-passiv';

/**
 * Registry der Rechner. Eine Nische verweist über
 * `computePipeline.calculator` auf einen Eintrag hier.
 *
 * Ein Rechner kommt nur in diese Liste, wenn er eine Testsuite hat. Bei
 * Beträgen dieser Größenordnung ist ungetesteter Rechencode kein Feature.
 */
export const CALCULATORS: Record<string, Calculator> = {
  'vfe-aktiv-passiv': vfeAktivPassiv,
};

export function getCalculator(id: string): Calculator | null {
  return CALCULATORS[id] ?? null;
}

export type { Calculator, CalculatorContext, CalculatorOutput, CalcFinding } from './types';
