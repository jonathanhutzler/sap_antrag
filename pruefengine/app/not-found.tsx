import Link from 'next/link';
import { Page } from '@/components/ui/Shell';
import { activeNiches } from '@/config/registry';

export default function NotFound() {
  const niches = activeNiches();

  return (
    <Page>
      <section className="py-24">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-display-lg">Diese Seite gibt es nicht</h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          Möglicherweise ist die Adresse veraltet oder die Prüfung, die Sie suchen, ist noch nicht freigeschaltet.
        </p>

        <ul className="mt-8 space-y-2 font-sans">
          {niches.map((niche) => (
            <li key={niche.slug}>
              <Link
                href={`/${niche.slug}`}
                className="underline decoration-2 underline-offset-4 hover:text-accent-ink"
              >
                {niche.brand.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/" className="underline decoration-2 underline-offset-4 hover:text-accent-ink">
              Zur Startseite
            </Link>
          </li>
        </ul>
      </section>
    </Page>
  );
}
