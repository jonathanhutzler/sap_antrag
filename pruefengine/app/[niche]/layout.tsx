import type { ReactNode } from 'react';
import { nicheParams } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { Page } from '@/components/ui/Shell';

/**
 * Nischen-Rahmen.
 *
 * Setzt den einzigen visuellen Freiheitsgrad — `--accent` aus brand.accent —
 * als CSS-Variable. Kein nischenspezifisches Layout, keine eigene Typografie,
 * keine eigene Navigation. Genau deshalb kostet eine neue Nische keine
 * Komponentenarbeit.
 */
export function generateStaticParams() {
  return nicheParams();
}

function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;
}

/** Akzent für Hover-Zustände etwas abdunkeln. */
function darken(hex: string, amount = 26): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const channels = [1, 3, 5].map((i) => Math.max(0, parseInt(hex.slice(i, i + 2), 16) - amount));
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export default function NicheLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { niche: string };
}) {
  const niche = resolveNiche(params.niche);

  return (
    <div
      style={
        {
          '--accent': niche.brand.accent,
          '--accent-soft': withAlpha(niche.brand.accent, '14'),
          '--accent-ink': darken(niche.brand.accent),
        } as React.CSSProperties
      }
    >
      <Page nicheName={niche.brand.name} nicheHref={`/${niche.slug}`}>
        {children}
      </Page>
    </div>
  );
}
