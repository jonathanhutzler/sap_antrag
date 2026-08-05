import type { MetadataRoute } from 'next';
import { siteUrl } from '@/config/site';

/**
 * Eine robots.txt für die Domain.
 *
 * Ergebnisseiten und API-Routen bleiben draußen: eine Ergebnis-URL ist zugleich
 * der Zugriffsschlüssel auf einen bezahlten Bericht.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/*/ergebnis/'],
      },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl('/'),
  };
}
