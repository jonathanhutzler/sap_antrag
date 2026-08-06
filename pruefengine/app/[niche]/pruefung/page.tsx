import type { Metadata } from 'next';
import Link from 'next/link';
import { nicheParams } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { siteUrl } from '@/config/site';
import { PruefFlow, type FlowConfig } from '@/components/PruefFlow';

/**
 * Upload und Vorschau.
 *
 * Die Serverkomponente reicht nur die Teile der Nischen-Config an den Client,
 * die für die Anzeige nötig sind. Prompt, Katalogtexte und Preis-IDs bleiben
 * auf dem Server.
 */

export function generateStaticParams() {
  return nicheParams();
}

export function generateMetadata({ params }: { params: { niche: string } }): Metadata {
  const niche = resolveNiche(params.niche);
  return {
    title: `${niche.input.docLabel} prüfen — kostenlose Vorschau`,
    description: `${niche.input.docLabel} hochladen und gegen ${niche.catalogue.checks.length} veröffentlichte Prüfpunkte prüfen lassen. Die Vorschau ist kostenlos.`,
    alternates: { canonical: siteUrl(`/${niche.slug}/pruefung`) },
    robots: { index: true, follow: true },
  };
}

export default function PruefungPage({ params }: { params: { niche: string } }) {
  const niche = resolveNiche(params.niche);

  const config: FlowConfig = {
    slug: niche.slug,
    docLabel: niche.input.docLabel,
    accept: [...niche.input.accept],
    maxFiles: niche.input.maxFiles,
    maxMbPerFile: niche.input.maxMbPerFile,
    maxPages: niche.input.maxPages,
    anchorField: { ...niche.input.anchorField },
    contextFields: niche.input.contextFields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.options && f.options.length > 0 ? ('select' as const) : (f.type ?? ('select' as const)),
      options: f.options ? [...f.options] : [],
      hint: f.hint,
      required: f.required ?? false,
    })),
    catalogueVersion: niche.catalogue.version,
    catalogueSize: niche.catalogue.checks.length,
    experimentId: niche.experiment.id,
    visibleFindings: niche.pricing.preview.visibleFindings,
    tiers: niche.pricing.tiers.map((t) => ({
      id: t.id,
      label: t.label,
      priceCents: t.priceCents,
      includes: [...t.includes],
    })),
    retentionHours: niche.legal.dataRetentionHours,
    disclaimer: niche.legal.disclaimer,
  };

  return (
    <>
      <section className="pt-14 sm:pt-16">
        <p className="eyebrow">{niche.brand.name}</p>
        <h1 className="mt-3 max-w-[20ch] text-display-lg">{niche.input.docLabel} prüfen</h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          Geprüft wird gegen {niche.catalogue.checks.length} Punkte des{' '}
          <Link
            href={`/${niche.slug}/pruefkatalog`}
            className="underline decoration-2 underline-offset-4 hover:text-accent-ink"
          >
            öffentlichen Prüfkatalogs
          </Link>{' '}
          in der Version {niche.catalogue.version}. Die Vorschau kostet nichts.
        </p>
      </section>

      <section className="mt-12 pb-8">
        <PruefFlow config={config} />
      </section>

      <section className="mt-6">
        <p className="max-w-prose font-sans text-xs leading-relaxed text-ink-faint">
          {niche.legal.disclaimer} {niche.legal.professionalAdviceNote}
        </p>
      </section>
    </>
  );
}
