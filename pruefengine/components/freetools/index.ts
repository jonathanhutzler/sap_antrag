import type { ComponentType } from 'react';
import { Fristrechner489 } from './Fristrechner489';

/**
 * Registry der kostenlosen Werkzeuge.
 *
 * Eine Nische wählt über `freeTools[].id` eines davon aus. Damit bekommt eine
 * neue Nische ihr Werkzeug über Config statt über eine eigene Route — die
 * Architektur-Regel bleibt auch für diese Erweiterung gültig.
 */
export const FREE_TOOLS: Record<string, ComponentType> = {
  'fristrechner-489': Fristrechner489,
};

export function getFreeTool(id: string): ComponentType | null {
  return FREE_TOOLS[id] ?? null;
}
