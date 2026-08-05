/**
 * Strukturierte Daten. Ein Ort, an dem JSON-LD erzeugt wird — die Bausteine
 * lesen ausschließlich aus Config und Registry, damit eine neue Nische ihre
 * Auszeichnung ohne Codeänderung bekommt.
 */
import type { NicheConfig } from '@/config/schema';
import { site, siteUrl } from '@/config/site';

export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function organizationLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: siteUrl('/'),
    email: site.support.inbox,
    slogan: site.claim,
  };
}

export function serviceLd(niche: NicheConfig): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: niche.brand.name,
    serviceType: niche.legal.serviceDescription,
    description: niche.landing.subline,
    url: siteUrl(`/${niche.slug}`),
    areaServed: { '@type': 'Country', name: 'Deutschland' },
    provider: { '@type': 'Organization', name: site.name, url: siteUrl('/') },
    termsOfService: siteUrl('/recht/agb'),
    offers: niche.pricing.tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.label,
      price: (tier.priceCents / 100).toFixed(2),
      priceCurrency: 'EUR',
      url: siteUrl(`/${niche.slug}/pruefung`),
      availability: 'https://schema.org/InStock',
    })),
  };
}

export function faqLd(faq: Array<{ q: string; a: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: { '@type': 'Answer', text: entry.a },
    })),
  };
}

export function articleLd(article: {
  title: string;
  description: string;
  date: string;
  updated?: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    mainEntityOfPage: article.url,
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@type': 'Organization', name: site.name },
  };
}
