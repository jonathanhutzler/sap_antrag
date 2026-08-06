import type { MetadataRoute } from 'next';
import { activeNiches } from '@/config/registry';
import { siteUrl } from '@/config/site';
import { listArticles } from '@/lib/blog';

/**
 * Eine sitemap.xml für die Dachdomain.
 *
 * Quelle ist die Registry. Eine Nische mit `active: false` taucht nicht auf —
 * genauso wenig wie ein unveröffentlichter Prüfkatalog. Damit kann keine
 * halbfertige Nische versehentlich in den Index geraten.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ];

  for (const niche of activeNiches()) {
    entries.push(
      { url: siteUrl(`/${niche.slug}`), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: siteUrl(`/${niche.slug}/pruefung`), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    );

    if (niche.catalogue.published) {
      entries.push({
        url: siteUrl(`/${niche.slug}/pruefkatalog`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }

    // Kostenlose Werkzeuge tragen organisch und gehören deshalb weit nach oben.
    for (const tool of niche.freeTools ?? []) {
      entries.push({
        url: siteUrl(`/${niche.slug}/${tool.slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }

    const articles = listArticles(niche.slug);
    if (articles.length > 0) {
      entries.push({
        url: siteUrl(`/${niche.slug}/ratgeber`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const article of articles) {
      entries.push({
        url: siteUrl(`/${niche.slug}/ratgeber/${article.slug}`),
        lastModified: new Date(article.updated ?? article.date),
        changeFrequency: 'yearly',
        priority: 0.5,
      });
    }
  }

  for (const path of ['/recht/impressum', '/recht/datenschutz', '/recht/agb', '/recht/widerruf']) {
    entries.push({ url: siteUrl(path), lastModified: now, changeFrequency: 'yearly', priority: 0.2 });
  }

  return entries;
}
