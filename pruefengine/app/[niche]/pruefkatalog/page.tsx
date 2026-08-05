import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { nicheParams } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { siteUrl } from '@/config/site';
import { SEVERITY_LABEL, SeverityTag } from '@/components/ui/Severity';

/**
 * Öffentlicher Prüfkatalog — das Vertrauenssignal der Nische.
 *
 * Ein unveröffentlichter Katalog (published: false) ist nicht erreichbar. So
 * kann eine Nische nicht mit halbfertigem Maßstab live gehen.
 */

export function generateStaticParams() {
  return nicheParams();
}

export function generateMetadata({ params }: { params: { niche: string } }): Metadata {
  const niche = resolveNiche(params.niche);
  return {
    title: `Prüfkatalog ${niche.brand.name} — Version ${niche.catalogue.version}`,
    description: `Alle ${niche.catalogue.checks.length} Prüfpunkte, gegen die eine ${niche.input.docLabel} geprüft wird, jeweils mit Grundlage und Schweregrad. Version ${niche.catalogue.version}.`,
    alternates: { canonical: siteUrl(`/${niche.slug}/pruefkatalog`) },
  };
}

export default function CataloguePage({ params }: { params: { niche: string } }) {
  const niche = resolveNiche(params.niche);
  if (!niche.catalogue.published) notFound();

  const categories = Array.from(new Set(niche.catalogue.checks.map((c) => c.category)));
  const counts = niche.catalogue.checks.reduce(
    (acc, check) => ({ ...acc, [check.severity]: (acc[check.severity] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <>
      <section className="pt-14 sm:pt-20">
        <p className="eyebrow">Prüfkatalog · Version {niche.catalogue.version}</p>
        <h1 className="mt-4 max-w-[22ch] text-display-xl">Wonach wir Ihre {niche.input.docLabel} prüfen</h1>
        <p className="mt-6 max-w-prose text-[1.06rem] leading-[1.62] text-ink-muted">
          {niche.catalogue.checks.length} Prüfpunkte in {categories.length} Kategorien. Jeder Punkt nennt seine
          Grundlage: eine Norm oder ein benanntes Referenzband. Die Versionsnummer steht in jedem Bericht — damit
          bleibt auch in einem halben Jahr nachvollziehbar, nach welchem Maßstab geprüft wurde.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <SeverityTag severity="error">
            {counts.error ?? 0} × {SEVERITY_LABEL.error}
          </SeverityTag>
          <SeverityTag severity="warn">
            {counts.warn ?? 0} × {SEVERITY_LABEL.warn}
          </SeverityTag>
          <SeverityTag severity="info">
            {counts.info ?? 0} × {SEVERITY_LABEL.info}
          </SeverityTag>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
            {niche.input.docLabel} jetzt prüfen
          </Link>
        </div>
      </section>

      <nav aria-label="Kategorien" className="mt-14 border-y border-rule py-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-sm">
          {categories.map((category) => (
            <li key={category}>
              <a href={`#${encodeURIComponent(category)}`} className="text-ink-muted hover:text-accent-ink">
                {category}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {categories.map((category) => (
        <section key={category} id={category} className="mt-16 scroll-mt-24">
          <h2 className="text-display-md">{category}</h2>

          <div className="mt-6 divide-y divide-rule border-t border-rule">
            {niche.catalogue.checks
              .filter((check) => check.category === category)
              .map((check) => (
                <article key={check.id} className="py-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="checkid">{check.id}</span>
                    <SeverityTag severity={check.severity} />
                  </div>

                  <h3 className="mt-2 text-lg">{check.label}</h3>

                  <dl className="mt-3 space-y-2 font-sans text-[0.93rem] leading-relaxed">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="w-32 shrink-0 text-ink-faint">Grundlage</dt>
                      <dd className="text-ink">{check.basis}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                      <dt className="w-32 shrink-0 text-ink-faint">Geprüft wird</dt>
                      <dd className="max-w-prose text-ink-muted">{check.instruction}</dd>
                    </div>
                    {check.euroImpact && check.euroImpact[1] > 0 && (
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                        <dt className="w-32 shrink-0 text-ink-faint">Plausibles Band</dt>
                        <dd className="text-ink-muted">
                          {check.euroImpact[0]} bis {check.euroImpact[1]} € — Schätzungen darüber werden im Bericht
                          gedeckelt
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))}
          </div>
        </section>
      ))}

      <section className="mt-20">
        <div className="sheet p-8">
          <h2 className="text-display-md">Wie dieser Katalog gepflegt wird</h2>
          <div className="prose-page mt-4">
            <p>
              Der Katalog liegt in einer versionierten Datei. Ändert sich ein Prüfpunkt, entsteht eine neue Version;
              die alte bleibt bestehen. Jeder Bericht nennt die Version, unter der er erstellt wurde. Ein Bericht aus
              dem vergangenen Jahr lässt sich damit auch dann noch erklären, wenn der Katalog inzwischen weiter ist.
            </p>
            <p>
              Ein Prüfpunkt kommt nur in den Katalog, wenn er eine Grundlage hat — eine Norm oder ein benanntes
              Referenzband. Referenzbänder sind Orientierungswerte aus der Branche, keine amtlichen Größen; das steht
              bei jedem betroffenen Punkt dabei und auch im Bericht.
            </p>
            <p className="text-sm text-ink-faint">{niche.legal.disclaimer}</p>
          </div>
        </div>
      </section>
    </>
  );
}
