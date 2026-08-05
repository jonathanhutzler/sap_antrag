import { notFound } from 'next/navigation';
import type { NicheConfig } from '@/config/schema';
import { findNiche } from '@/config/registry';

/**
 * Eine Nische aus einem Routenparameter auflösen.
 *
 * Inaktive und unbekannte Slugs enden in 404 — dieselbe Antwort, damit ein
 * noch nicht freigeschalteter Slug nicht durch das Antwortverhalten
 * erkennbar wird.
 */
export function resolveNiche(slug: string): NicheConfig {
  const niche = findNiche(slug);
  if (!niche) notFound();
  return niche;
}

/** Für API-Routen: kein notFound(), sondern null. */
export function resolveNicheOrNull(slug: string | null | undefined): NicheConfig | null {
  if (!slug) return null;
  return findNiche(slug);
}

/**
 * Kanonisch bleibt immer der Pfad unter der Dachdomain. Eine spätere
 * Exact-Match-Domain aus `aliasDomains` zeigt auf denselben Pfad und wird
 * per rel=canonical auf ihn zurückgeführt.
 */
export function canonicalPath(niche: NicheConfig, sub = ''): string {
  const suffix = sub ? `/${sub.replace(/^\//, '')}` : '';
  return `/${niche.slug}${suffix}`;
}
