import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { activeNiches } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { siteUrl } from '@/config/site';
import { getFreeTool } from '@/components/freetools';

/**
 * Kostenlose Werkzeuge einer Nische.
 *
 * Statische Segmente derselben Ebene (pruefung, pruefkatalog, ratgeber,
 * ergebnis) gewinnen im Routing gegen dieses dynamische Segment — hier landen
 * nur Slugs, die in `freeTools` der Nische stehen.
 *
 * Keine Bezahlschranke, kein abgeschnittenes Ergebnis, kein Upload. Das
 * Werkzeug ist vollständig nutzbar; die Überleitung zur kostenpflichtigen
 * Prüfung steht darunter, nicht davor.
 */

export function generateStaticParams() {
  return activeNiches().flatMap((niche) =>
    (niche.freeTools ?? []).map((tool) => ({ niche: niche.slug, tool: tool.slug })),
  );
}

export function generateMetadata({ params }: { params: { niche: string; tool: string } }): Metadata {
  const niche = resolveNiche(params.niche);
  const tool = niche.freeTools?.find((t) => t.slug === params.tool);
  if (!tool) return {};

  return {
    title: tool.title,
    description: tool.intro.slice(0, 300),
    alternates: { canonical: siteUrl(`/${niche.slug}/${tool.slug}`) },
    openGraph: { title: tool.title, description: tool.intro.slice(0, 300) },
  };
}

export default function FreeToolPage({ params }: { params: { niche: string; tool: string } }) {
  const niche = resolveNiche(params.niche);
  const tool = niche.freeTools?.find((t) => t.slug === params.tool);
  if (!tool) notFound();

  const Tool = getFreeTool(tool.id);
  if (!Tool) notFound();

  return (
    <>
      <section className="pt-14 sm:pt-20">
        <p className="eyebrow">Kostenlos · ohne Upload · ohne Anmeldung</p>
        <h1 className="mt-3 max-w-[24ch] text-display-xl">{tool.title}</h1>
        <p className="mt-5 max-w-prose text-[1.06rem] leading-[1.62] text-ink-muted">{tool.intro}</p>
      </section>

      <section className="mt-10 max-w-2xl">
        <Tool />
      </section>

      <section className="mt-16">
        <div className="sheet flex flex-wrap items-center justify-between gap-6 p-8">
          <p className="max-w-prose font-display text-xl">{tool.cta}</p>
          <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
            {niche.input.docLabel} prüfen
          </Link>
        </div>
        <p className="mt-6 max-w-prose font-sans text-xs leading-relaxed text-ink-faint">{niche.legal.disclaimer}</p>
      </section>
    </>
  );
}
