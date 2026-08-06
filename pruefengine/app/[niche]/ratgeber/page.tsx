import type { Metadata } from 'next';
import Link from 'next/link';
import { nicheParams } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { siteUrl } from '@/config/site';
import { listArticles } from '@/lib/blog';

/**
 * Silo-Übersicht einer Nische.
 *
 * Konvention: alles unter content/blog/<slug>/ gehört hierher. Keine Verweise
 * auf andere Nischen — ein mechanischer Querverweis zwischen fremden Themen
 * wäre genau das Netzwerkmuster, das die Dachdomain vermeiden soll.
 */

export function generateStaticParams() {
  return nicheParams();
}

export function generateMetadata({ params }: { params: { niche: string } }): Metadata {
  const niche = resolveNiche(params.niche);
  return {
    title: `Ratgeber ${niche.brand.name}`,
    description: `Beiträge rund um ${niche.input.docLabel}: was drinstehen muss, woran häufig etwas fehlt und was Sie tun können.`,
    alternates: { canonical: siteUrl(`/${niche.slug}/ratgeber`) },
  };
}

export default function RatgeberPage({ params }: { params: { niche: string } }) {
  const niche = resolveNiche(params.niche);
  const articles = listArticles(niche.slug);

  return (
    <>
      <section className="pt-14 sm:pt-20">
        <p className="eyebrow">Ratgeber · {niche.brand.name}</p>
        <h1 className="mt-3 max-w-[22ch] text-display-xl">Worauf es bei {niche.input.docLabel}en ankommt</h1>
        <p className="mt-5 max-w-prose text-[1.06rem] leading-[1.62] text-ink-muted">
          Zu den Punkten aus dem Prüfkatalog, ausführlicher als es in einen Bericht passt. Jeder Beitrag nennt seine
          Grundlage und bleibt bei dem, was sich belegen lässt.
        </p>
      </section>

      {articles.length === 0 ? (
        <p className="mt-16 text-ink-muted">Für diese Prüfung gibt es noch keine Beiträge.</p>
      ) : (
        <ul className="mt-14 divide-y divide-rule border-y border-rule">
          {articles.map((article) => (
            <li key={article.slug} className="py-7">
              <Link href={`/${niche.slug}/ratgeber/${article.slug}`} className="group block">
                <h2 className="text-display-md group-hover:text-accent-ink">{article.title}</h2>
                <p className="mt-2 max-w-prose font-sans text-[0.97rem] leading-relaxed text-ink-muted">
                  {article.description}
                </p>
                <p className="mt-2 font-sans text-xs text-ink-faint">
                  {new Date(article.date).toLocaleDateString('de-DE')} · {article.readingMinutes} Minuten
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-16">
        <div className="sheet flex flex-wrap items-center justify-between gap-6 p-8">
          <p className="max-w-prose font-display text-xl">
            {niche.input.docLabel} zur Hand? Die Vorschau kostet nichts.
          </p>
          <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
            Jetzt prüfen
          </Link>
        </div>
      </section>
    </>
  );
}
