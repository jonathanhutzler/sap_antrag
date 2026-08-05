import Link from 'next/link';
import type { ReactNode } from 'react';
import { site } from '@/config/site';
import { activeNiches } from '@/config/registry';

/**
 * Kopf und Fuß für jede Seite der Dachdomain.
 *
 * Bewusst identisch über alle Nischen: eine Marke, eine Navigation, eine
 * Rechtsleiste. Die Nische färbt nur den Akzent und trägt ihren Namen im Kopf.
 */

export function SiteHeader({ nicheName, nicheHref }: { nicheName?: string; nicheHref?: string }) {
  return (
    <header className="border-b border-rule bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70 sticky top-0 z-30">
      <div className="mx-auto flex max-w-shell items-baseline gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="font-display text-lg tracking-tight text-ink">
          {site.name}
        </Link>
        {nicheName && nicheHref && (
          <>
            <span aria-hidden className="text-ink-faint">
              /
            </span>
            <Link href={nicheHref} className="font-sans text-sm font-semibold text-accent-ink">
              {nicheName}
            </Link>
          </>
        )}
        <nav className="ml-auto flex items-center gap-5 font-sans text-sm text-ink-muted">
          <Link href="/#pruefungen" className="hover:text-ink">
            Prüfungen
          </Link>
          <Link href="/#so-arbeiten-wir" className="hidden hover:text-ink sm:inline">
            Maßstab
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const niches = activeNiches();

  return (
    <footer className="rule-top mt-24 bg-paper-sunken">
      <div className="mx-auto max-w-shell px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg">{site.name}</p>
            <p className="mt-2 max-w-xs font-sans text-sm text-ink-muted">{site.claim}</p>
          </div>

          <div>
            <p className="eyebrow">Prüfungen</p>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {niches.map((niche) => (
                <li key={niche.slug}>
                  <Link href={`/${niche.slug}`} className="text-ink-muted hover:text-ink">
                    {niche.brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow">Rechtliches</p>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              <li>
                <Link href="/recht/impressum" className="text-ink-muted hover:text-ink">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/recht/datenschutz" className="text-ink-muted hover:text-ink">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/recht/agb" className="text-ink-muted hover:text-ink">
                  AGB
                </Link>
              </li>
              <li>
                <Link href="/recht/widerruf" className="text-ink-muted hover:text-ink">
                  Widerrufsbelehrung
                </Link>
              </li>
              <li>
                <a href={`mailto:${site.support.inbox}`} className="text-ink-muted hover:text-ink">
                  Kontakt
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-rule pt-6 font-sans text-xs leading-relaxed text-ink-faint">
          Technische Plausibilitätsprüfung hochgeladener Dokumente gegen einen veröffentlichten Prüfkatalog. Keine
          Rechts-, Steuer- oder Fachberatung, kein Sachverständigengutachten. {site.provider.vatNote}
        </p>
      </div>
    </footer>
  );
}

export function Page({
  children,
  nicheName,
  nicheHref,
}: {
  children: ReactNode;
  nicheName?: string;
  nicheHref?: string;
}) {
  return (
    <>
      <SiteHeader nicheName={nicheName} nicheHref={nicheHref} />
      <main className="mx-auto w-full max-w-shell px-5 sm:px-8">{children}</main>
      <SiteFooter />
    </>
  );
}
