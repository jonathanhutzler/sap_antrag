import type { NicheConfig } from './schema';
import { handwerkerrechnung } from './niches/handwerkerrechnung';
import { nische2 } from './niches/nische-2';

/**
 * Registry aller Nischen. Einziger Ort, an dem eine Nische bekannt gemacht
 * wird. Routing, Hub, Sitemap, AGB-Leistungsbeschreibung und
 * generateStaticParams lesen ausschließlich hier.
 *
 * Eine neue Nische = ein Import und ein Array-Eintrag. Mehr nicht.
 */
export const registry: NicheConfig[] = [handwerkerrechnung, nische2];

/** Nur diese Nischen sind erreichbar, im Hub sichtbar und in der Sitemap. */
export function activeNiches(): NicheConfig[] {
  return registry.filter((n) => n.active);
}

export function allNiches(): NicheConfig[] {
  return registry;
}

/** Gibt es nicht oder ist inaktiv => null. Die Route antwortet dann mit 404. */
export function findNiche(slug: string): NicheConfig | null {
  const niche = registry.find((n) => n.slug === slug);
  if (!niche || !niche.active) return null;
  return niche;
}

/** Für generateStaticParams. Inaktive Nischen erzeugen keine Route. */
export function nicheParams(): Array<{ niche: string }> {
  return activeNiches().map((n) => ({ niche: n.slug }));
}

/**
 * Leistungsbeschreibung für die AGB, generiert aus der Registry.
 * Damit sie beim Freischalten einer Nische nicht vergessen wird.
 */
export function serviceCatalogue(): Array<{
  slug: string;
  name: string;
  description: string;
  catalogueVersion: string;
  tiers: Array<{ label: string; priceCents: number; includes: string[] }>;
}> {
  return activeNiches().map((n) => ({
    slug: n.slug,
    name: n.brand.name,
    description: n.legal.serviceDescription,
    catalogueVersion: n.catalogue.version,
    tiers: n.pricing.tiers.map((t) => ({
      label: t.label,
      priceCents: t.priceCents,
      includes: t.includes,
    })),
  }));
}
