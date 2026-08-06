import type { Metadata } from 'next';
import Link from 'next/link';
import { nicheParams } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { siteUrl } from '@/config/site';
import { listArticles } from '@/lib/blog';
import { AnnotatedSample } from '@/components/AnnotatedSample';
import { JsonLd, faqLd, serviceLd } from '@/components/JsonLd';

/**
 * Nischen-Landing. Vollständig aus der Config.
 *
 * Es gibt hier keinen nischenspezifischen Zweig — kein `if (slug === …)`,
 * keine ausgetauschten Begriffe in einer kopierten Vorlage. Was diese Seite
 * unterscheidet, sind ihre Texte, ihr Katalog und ihre Beispielansicht, und
 * die stehen alle in config/niches/<slug>.ts.
 */

export function generateStaticParams() {
  return nicheParams();
}

export function generateMetadata({ params }: { params: { niche: string } }): Metadata {
  const niche = resolveNiche(params.niche);
  return {
    title: niche.landing.metaTitle ?? niche.landing.h1,
    description: niche.landing.metaDescription ?? niche.landing.subline.slice(0, 300),
    alternates: { canonical: siteUrl(`/${niche.slug}`) },
    openGraph: {
      title: niche.landing.metaTitle ?? niche.landing.h1,
      description: niche.landing.metaDescription ?? niche.landing.subline.slice(0, 300),
      url: siteUrl(`/${niche.slug}`),
    },
  };
}

export default function NicheLandingPage({ params }: { params: { niche: string } }) {
  const niche = resolveNiche(params.niche);
  const articles = listArticles(niche.slug).slice(0, 6);
  const cheapest = Math.min(...niche.pricing.tiers.map((t) => t.priceCents));

  return (
    <>
      <JsonLd data={[serviceLd(niche), faqLd(niche.landing.faq)]} />

      <section className="pt-14 sm:pt-20">
        <p className="eyebrow">{niche.brand.claim}</p>
        <h1 className="mt-4 max-w-[20ch] text-display-xl">{niche.landing.h1}</h1>
        <p className="mt-6 max-w-prose text-[1.1rem] leading-[1.62] text-ink-muted">{niche.landing.subline}</p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
            {niche.input.docLabel} hochladen
          </Link>
          <span className="font-sans text-sm text-ink-faint">
            Vorschau kostenlos · Vollbericht ab {(cheapest / 100).toFixed(2).replace('.', ',')} €
          </span>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {niche.landing.proofPoints.map((point) => (
            <li key={point} className="flex gap-3 font-sans text-[0.97rem] leading-relaxed text-ink">
              <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* Signaturmotiv */}
      <section className="mt-20">
        <p className="eyebrow">So sieht ein Fund aus</p>
        <h2 className="mt-3 max-w-[24ch] text-display-lg">Markierte Stelle, zitierter Prüfpunkt, benannte Grundlage</h2>
        <div className="mt-8 max-w-3xl">
          <AnnotatedSample sample={niche.landing.sample} />
        </div>
      </section>

      {/* Ablauf */}
      <section className="mt-20">
        <p className="eyebrow">Ablauf</p>
        <h2 className="mt-3 text-display-lg">Vier Schritte</h2>

        <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-4">
          {[
            {
              h: 'Hochladen',
              p: `${niche.input.docLabel} als ${niche.input.accept.map((a) => a.toUpperCase()).join(', ')}, bis zu ${niche.input.maxPages} Seiten. Dazu ein paar Angaben zum Vorgang.`,
            },
            {
              h: 'Prüfen',
              p: `Abgleich gegen ${niche.catalogue.checks.length} Prüfpunkte des Katalogs ${niche.catalogue.version}. Dauert in der Regel unter einer Minute.`,
            },
            {
              h: 'Vorschau',
              p: 'Kostenlos: Anzahl und Schwere der Funde, betroffene Kategorien, eine ausformulierte Feststellung.',
            },
            {
              h: 'Vollbericht',
              p: 'Nach der Zahlung sofort als PDF und per E-Mail, mit allen Feststellungen und Ihren Sätzen zum Mitnehmen.',
            },
          ].map((step, i) => (
            <li key={step.h} className="bg-paper-raised p-6">
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 text-base">{step.h}</h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-muted">{step.p}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Preise */}
      <section className="mt-20">
        <p className="eyebrow">Preise</p>
        <h2 className="mt-3 text-display-lg">Bezahlt wird erst, wenn etwas gefunden wurde</h2>
        <p className="mt-4 max-w-prose text-ink-muted">
          Die Vorschau ist kostenlos und zeigt Ihnen, ob sich der Bericht lohnt. Ist das Dokument nicht prüfbar oder
          gibt es nichts zu beanstanden, bieten wir Ihnen den Kauf gar nicht erst an.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {niche.pricing.tiers.map((tier) => (
            <div key={tier.id} className="sheet flex flex-col p-7">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-xl">{tier.label}</h3>
                <span className="font-display text-2xl text-ink">
                  {(tier.priceCents / 100).toFixed(2).replace('.', ',')} €
                </span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.includes.map((item) => (
                  <li key={item} className="flex gap-3 font-sans text-[0.93rem] leading-relaxed text-ink-muted">
                    <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {niche.landing.competitorAnchor && (
          <p className="mt-6 max-w-prose border-l-2 border-rule pl-5 font-sans text-sm italic leading-relaxed text-ink-muted">
            {niche.landing.competitorAnchor}
          </p>
        )}
      </section>

      {/* Kostenlose Werkzeuge */}
      {(niche.freeTools ?? []).length > 0 && (
        <section className="mt-20">
          <p className="eyebrow">Kostenlos</p>
          <h2 className="mt-3 text-display-lg">Erst rechnen, dann entscheiden</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {(niche.freeTools ?? []).map((tool) => (
              <Link key={tool.slug} href={`/${niche.slug}/${tool.slug}`} className="sheet group block p-7">
                <h3 className="text-xl group-hover:text-accent-ink">{tool.title}</h3>
                <p className="mt-2 font-sans text-[0.93rem] leading-relaxed text-ink-muted">{tool.intro}</p>
                <span className="mt-4 inline-block font-sans text-sm font-semibold text-accent-ink underline decoration-2 underline-offset-4">
                  Kostenlos berechnen
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Katalog-Verweis */}
      <section className="mt-20">
        <div className="sheet flex flex-wrap items-center justify-between gap-6 p-8">
          <div className="max-w-prose">
            <h2 className="text-display-md">Der Prüfkatalog ist öffentlich</h2>
            <p className="mt-2 font-sans text-[0.97rem] leading-relaxed text-ink-muted">
              {niche.catalogue.checks.length} Prüfpunkte, jeder mit Grundlage und Schweregrad, in der Version{' '}
              {niche.catalogue.version}. Lesen Sie ihn, bevor Sie etwas hochladen.
            </p>
          </div>
          <Link href={`/${niche.slug}/pruefkatalog`} className="btn-quiet">
            Prüfkatalog ansehen
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-20">
        <p className="eyebrow">Häufige Fragen</p>
        <h2 className="mt-3 text-display-lg">{niche.brand.name}</h2>
        <dl className="mt-8 divide-y divide-rule border-y border-rule">
          {niche.landing.faq.map((entry) => (
            <div key={entry.q} className="py-6">
              <dt className="font-display text-lg text-ink">{entry.q}</dt>
              <dd className="mt-2 max-w-prose font-sans text-[0.97rem] leading-relaxed text-ink-muted">{entry.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Silo */}
      {articles.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow">Zum Weiterlesen</p>
          <h2 className="mt-3 text-display-lg">Was bei {niche.input.docLabel}en häufig gefragt wird</h2>
          <ul className="mt-8 divide-y divide-rule border-y border-rule">
            {articles.map((article) => (
              <li key={article.slug} className="py-5">
                <Link href={`/${niche.slug}/ratgeber/${article.slug}`} className="group block">
                  <h3 className="text-lg group-hover:text-accent-ink">{article.title}</h3>
                  <p className="mt-1 max-w-prose font-sans text-sm leading-relaxed text-ink-muted">
                    {article.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/${niche.slug}/ratgeber`}
            className="mt-6 inline-block font-sans text-sm font-semibold text-accent-ink underline decoration-2 underline-offset-4"
          >
            Alle Beiträge zu {niche.brand.name}
          </Link>
        </section>
      )}

      <section className="mt-20">
        <div className="sheet flex flex-wrap items-center justify-between gap-6 p-8">
          <p className="max-w-prose font-display text-xl">
            {niche.input.docLabel} hochladen, Vorschau in unter einer Minute.
          </p>
          <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
            Jetzt prüfen
          </Link>
        </div>
        <p className="mt-6 max-w-prose font-sans text-xs leading-relaxed text-ink-faint">{niche.legal.disclaimer}</p>
      </section>
    </>
  );
}
