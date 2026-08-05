import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveNiche } from '@/lib/resolveNiche';
import { loadResult, markPaid } from '@/lib/store';
import { getStripe } from '@/lib/stripe';
import { SEVERITY_LABEL_PLURAL, SeverityTag } from '@/components/ui/Severity';
import type { AnalysisResult, Severity } from '@/config/schema';

/**
 * Ergebnisseite nach der Zahlung.
 *
 * Der Zugriff hängt nicht am Query-Parameter: Ist das Ergebnis noch nicht als
 * bezahlt vermerkt, wird die Stripe-Session direkt bei Stripe abgefragt. Der
 * Redirect allein beweist nichts.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ihr Prüfbericht',
  robots: { index: false, follow: false },
};

function euroRange(range: [number, number]): string {
  const fmt = (v: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v);
  return range[0] === range[1] ? `${fmt(range[0])} €` : `${fmt(range[0])} bis ${fmt(range[1])} €`;
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { niche: string; id: string };
  searchParams: { session_id?: string };
}) {
  const niche = resolveNiche(params.niche);
  const stored = await loadResult(params.id);

  if (!stored || stored.niche !== niche.slug) {
    return (
      <section className="py-24">
        <h1 className="text-display-lg">Bericht nicht gefunden</h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          Der Bericht ist abgelaufen oder die Adresse stimmt nicht. Prüfergebnisse werden nach{' '}
          {niche.legal.dataRetentionHours} Stunden automatisch gelöscht. Haben Sie bezahlt und keinen Bericht
          erhalten, schreiben Sie uns — nennen Sie dabei die Bericht-Nummer aus der Adresszeile.
        </p>
        <Link href={`/${niche.slug}/pruefung`} className="btn-primary mt-8">
          Neue Prüfung starten
        </Link>
      </section>
    );
  }

  let result: AnalysisResult = stored;

  // Käufer ist schneller zurück als der Webhook: bei Stripe nachsehen.
  if (!result.paid && searchParams.session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(searchParams.session_id);
      if (session.payment_status === 'paid' && session.metadata?.resultId === result.id) {
        const updated = await markPaid(
          result.id,
          {
            tier: session.metadata?.tier ?? '',
            stripeSessionId: session.id,
            customerEmail: session.customer_details?.email ?? undefined,
          },
          niche.legal.dataRetentionHours,
        );
        if (updated) result = updated;
      }
    } catch {
      // Bleibt unbezahlt; die Seite zeigt dann den Hinweis unten.
    }
  }

  if (!result.paid) {
    return (
      <section className="py-24">
        <h1 className="text-display-lg">Für diesen Bericht liegt keine Zahlung vor</h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          Falls Sie gerade bezahlt haben, laden Sie die Seite in ein paar Sekunden neu — die Bestätigung von Stripe
          ist möglicherweise noch unterwegs.
        </p>
        <Link href={`/${niche.slug}/pruefung`} className="btn-quiet mt-8">
          Zurück zur Prüfung
        </Link>
      </section>
    );
  }

  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const finding of result.findings) counts[finding.severity] += 1;

  const pdfHref = `/api/report/${result.id}${searchParams.session_id ? `?session_id=${searchParams.session_id}` : ''}`;

  return (
    <>
      <section className="pt-14 sm:pt-16">
        <p className="eyebrow">Prüfbericht · Katalog {result.catalogueVersion}</p>
        <h1 className="mt-3 max-w-[22ch] text-display-lg">Ihr Bericht zu {niche.input.docLabel}</h1>
        <p className="mt-4 max-w-prose text-ink-muted">
          {result.findings.length === 1
            ? 'Eine Feststellung'
            : `${result.findings.length} Feststellungen`}{' '}
          aus {result.checkedIds.length} geprüften Punkten. Erstellt am{' '}
          {new Date(result.createdAt).toLocaleDateString('de-DE')}. Bericht-Nr. {result.id.slice(0, 8)}.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <a href={pdfHref} className="btn-primary">
            PDF herunterladen
          </a>
          {result.customerEmail && (
            <span className="btn-quiet cursor-default">Auch versendet an {result.customerEmail}</span>
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-rule bg-rule sm:max-w-lg">
          {(['error', 'warn', 'info'] as Severity[]).map((severity) => (
            <div key={severity} className="bg-paper-raised px-4 py-4 text-center">
              <p className="font-display text-2xl">{counts[severity]}</p>
              <p className="mt-1 font-sans text-[0.7rem] uppercase tracking-wider text-ink-faint">
                {SEVERITY_LABEL_PLURAL[severity]}
              </p>
            </div>
          ))}
        </div>

        {result.euroTotal && (
          <div className="sheet mt-6 max-w-lg p-6">
            <p className="eyebrow">Finanzielle Einordnung</p>
            <p className="mt-2 font-display text-3xl">{euroRange(result.euroTotal)}</p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink-muted">
              Summe der bezifferbaren Feststellungen als Spanne. Feststellungen zur selben Position sind nur einmal
              gezählt. Schätzung auf Grundlage der Zahlen im Dokument, keine Forderung.
            </p>
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-display-md">Feststellungen</h2>

        <div className="mt-6 divide-y divide-rule border-t border-rule">
          {result.findings.map((finding, index) => (
            <article key={`${finding.checkId}-${index}`} className="py-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="checkid">{finding.checkId}</span>
                <SeverityTag severity={finding.severity} />
                <span className="font-sans text-xs text-ink-faint">{finding.category}</span>
              </div>

              <h3 className="mt-2.5 text-xl">
                {index + 1}. {finding.label}
              </h3>
              <p className="mt-3 max-w-prose font-sans leading-relaxed text-ink-muted">{finding.observation}</p>

              <dl className="mt-5 space-y-2.5 font-sans text-[0.92rem]">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="w-40 shrink-0 text-ink-faint">Fundstelle</dt>
                  <dd className="max-w-prose text-ink">„{finding.documentRef}"</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="w-40 shrink-0 text-ink-faint">Grundlage</dt>
                  <dd className="max-w-prose text-ink">{finding.basis}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="w-40 shrink-0 text-ink-faint">Ihr nächster Schritt</dt>
                  <dd className="max-w-prose rounded-card bg-accent-soft px-3 py-2 text-ink">{finding.action}</dd>
                </div>
                {finding.euroImpact && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="w-40 shrink-0 text-ink-faint">Geschätzte Spanne</dt>
                    <dd className="text-ink">
                      {euroRange(finding.euroImpact)}
                      {finding.euroCapped && (
                        <span className="text-ink-faint"> · auf einen plausiblen Anteil begrenzt</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="sheet p-7">
          <h2 className="text-display-md">Rechtliche Einordnung</h2>
          <p className="mt-3 max-w-prose font-sans text-[0.93rem] leading-relaxed text-ink-muted">
            {niche.legal.disclaimer}
          </p>
          <p className="mt-3 max-w-prose font-sans text-[0.93rem] leading-relaxed text-ink-muted">
            {niche.legal.professionalAdviceNote}
          </p>
          <p className="mt-4 font-sans text-xs text-ink-faint">
            Geprüft nach Katalogversion {result.catalogueVersion} ·{' '}
            <Link href={`/${niche.slug}/pruefkatalog`} className="underline underline-offset-2">
              Katalog ansehen
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
