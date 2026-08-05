import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { activeNiches } from '@/config/registry';
import { resolveNiche } from '@/lib/resolveNiche';
import { siteUrl } from '@/config/site';
import { listArticles, loadArticle, renderMarkdown } from '@/lib/blog';
import { JsonLd, articleLd } from '@/components/JsonLd';

/** Ein Beitrag im Silo seiner Nische. */

export function generateStaticParams() {
  return activeNiches().flatMap((niche) =>
    listArticles(niche.slug).map((article) => ({ niche: niche.slug, slug: article.slug })),
  );
}

export function generateMetadata({ params }: { params: { niche: string; slug: string } }): Metadata {
  const niche = resolveNiche(params.niche);
  const article = loadArticle(niche.slug, params.slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: siteUrl(`/${niche.slug}/ratgeber/${article.slug}`) },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      publishedTime: article.date,
      modifiedTime: article.updated ?? article.date,
      url: siteUrl(`/${niche.slug}/ratgeber/${article.slug}`),
    },
  };
}

export default function ArticlePage({ params }: { params: { niche: string; slug: string } }) {
  const niche = resolveNiche(params.niche);
  const article = loadArticle(niche.slug, params.slug);
  if (!article) notFound();

  // Verwandte Beiträge nur aus demselben Silo.
  const siblings = listArticles(niche.slug).filter((a) => a.slug !== article.slug);
  const related = article.related.length
    ? siblings.filter((a) => article.related.includes(a.slug))
    : siblings.slice(0, 3);

  return (
    <>
      <JsonLd
        data={articleLd({
          title: article.title,
          description: article.description,
          date: article.date,
          updated: article.updated,
          url: siteUrl(`/${niche.slug}/ratgeber/${article.slug}`),
        })}
      />

      <article className="pt-14 sm:pt-20">
        <p className="eyebrow">
          <Link href={`/${niche.slug}/ratgeber`} className="hover:text-ink">
            Ratgeber {niche.brand.name}
          </Link>
        </p>
        <h1 className="mt-3 max-w-[24ch] text-display-lg">{article.title}</h1>
        <p className="mt-4 max-w-prose text-[1.06rem] leading-[1.6] text-ink-muted">{article.description}</p>
        <p className="mt-3 font-sans text-xs text-ink-faint">
          {new Date(article.date).toLocaleDateString('de-DE')}
          {article.updated && ` · aktualisiert ${new Date(article.updated).toLocaleDateString('de-DE')}`} ·{' '}
          {article.readingMinutes} Minuten Lesezeit
        </p>

        <div
          className="prose-page mt-10"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
        />
      </article>

      <section className="mt-14">
        <div className="sheet flex flex-wrap items-center justify-between gap-6 p-8">
          <div className="max-w-prose">
            <p className="font-display text-xl">{niche.brand.name}</p>
            <p className="mt-1.5 font-sans text-[0.95rem] leading-relaxed text-ink-muted">
              {niche.catalogue.checks.length} veröffentlichte Prüfpunkte, Katalog {niche.catalogue.version}. Die
              Vorschau kostet nichts.
            </p>
          </div>
          <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
            {niche.input.docLabel} prüfen
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <p className="eyebrow">Weitere Beiträge</p>
          <ul className="mt-5 divide-y divide-rule border-y border-rule">
            {related.map((item) => (
              <li key={item.slug} className="py-4">
                <Link href={`/${niche.slug}/ratgeber/${item.slug}`} className="group block">
                  <h2 className="text-lg group-hover:text-accent-ink">{item.title}</h2>
                  <p className="mt-1 max-w-prose font-sans text-sm text-ink-muted">{item.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 max-w-prose font-sans text-xs leading-relaxed text-ink-faint">{niche.legal.disclaimer}</p>
    </>
  );
}
