import type { Metadata } from 'next';
import Link from 'next/link';
import { activeNiches } from '@/config/registry';
import { site, siteUrl } from '@/config/site';
import { Page } from '@/components/ui/Shell';
import { JsonLd, faqLd, organizationLd } from '@/components/JsonLd';

/**
 * Hub.
 *
 * Der Hub braucht ein eigenes Versprechen, keine Kachelliste — eine
 * Verzeichnisseite rankt für nichts und erklärt niemandem, warum die
 * Dachdomain existiert. Er erklärt das Prinzip (veröffentlichter Prüfkatalog,
 * belegte Fundstelle, ein Satz je Fund) und führt danach in die Nischen.
 */

const HUB_FAQ = [
  {
    q: 'Warum eine Dachdomain und nicht je Thema eine eigene Seite?',
    a: 'Weil der Prüfmaßstab derselbe ist. Ein veröffentlichter Katalog, eine belegte Fundstelle je Feststellung, ein Satz zum Handeln — das gilt für eine Handwerkerrechnung genauso wie für jede andere Abrechnung. Was sich unterscheidet, sind die Prüfpunkte. Die stehen in einer eigenen, versionierten Datei je Prüfung.',
  },
  {
    q: 'Was heißt „technische Plausibilitätsprüfung"?',
    a: 'Wir stellen fest, was in einem Dokument fehlt, was von einer Regelung abweicht und was außerhalb eines üblichen Bandes liegt — jeweils mit Zitat aus Ihrem Dokument und mit benannter Grundlage. Wir sagen nicht, ob eine Forderung durchsetzbar ist. Das ist Rechtsberatung und die machen wir nicht.',
  },
  {
    q: 'Was kostet die Prüfung?',
    a: 'Die Vorschau kostet nichts: Sie sehen, wie viele Abweichungen gefunden wurden, wie schwer sie wiegen und welche Kategorien betroffen sind, dazu eine vollständig ausformulierte Feststellung. Bezahlt wird nur der Vollbericht. Wird nichts gefunden oder ist das Dokument nicht prüfbar, gibt es nichts zu kaufen.',
  },
  {
    q: 'Was passiert mit meinen Dokumenten?',
    a: 'Sie werden zur Analyse übermittelt und dort nicht zum Training von Modellen verwendet. Ergebnis und Dokumentbezug werden für die in der jeweiligen Prüfung genannte Frist zwischengespeichert und danach automatisch gelöscht. Die Auftragsverarbeiter stehen namentlich in der Datenschutzerklärung.',
  },
];

export const metadata: Metadata = {
  title: `${site.name} — ${site.claim}`,
  description: site.promise,
  alternates: { canonical: siteUrl('/') },
};

export default function HubPage() {
  const niches = activeNiches();

  return (
    <Page>
      <JsonLd data={[organizationLd(), faqLd(HUB_FAQ)]} />

      {/* Versprechen */}
      <section className="pt-16 sm:pt-24">
        <p className="eyebrow">{site.name}</p>
        <h1 className="mt-4 max-w-[19ch] text-display-xl">
          Der Maßstab steht fest, <span className="text-accent">bevor</span> Sie hochladen.
        </h1>
        <p className="mt-6 max-w-prose text-[1.12rem] leading-[1.62] text-ink-muted">
          Die meisten Prüfangebote sagen Ihnen erst hinterher, wonach sie gesucht haben. Wir machen es umgekehrt:
          Jede Prüfung hat einen öffentlichen Katalog. Sie lesen vorher, welche Punkte geprüft werden und worauf
          jeder einzelne sich stützt — Paragraf oder benanntes Referenzband. Danach bekommen Sie zu jedem Fund
          das Zitat aus Ihrem eigenen Dokument.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="#pruefungen" className="btn-primary">
            Prüfungen ansehen
          </Link>
          <Link href="#so-arbeiten-wir" className="btn-quiet">
            Wie wir prüfen
          </Link>
        </div>
      </section>

      {/* Methode */}
      <section id="so-arbeiten-wir" className="mt-24 scroll-mt-24">
        <p className="eyebrow">Der Maßstab</p>
        <h2 className="mt-3 max-w-[22ch] text-display-lg">Drei Regeln, an denen wir uns messen lassen</h2>

        <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-3">
          {[
            {
              n: '01',
              h: 'Der Katalog ist öffentlich',
              p: 'Jede Prüfung veröffentlicht ihre Prüfpunkte samt Grundlage und Versionsnummer. Sie können sie lesen, bevor Sie etwas hochladen — und hinterher nachschlagen, wonach geprüft wurde.',
            },
            {
              n: '02',
              h: 'Jeder Fund zeigt seine Fundstelle',
              p: 'Keine Feststellung ohne Zitat aus Ihrem Dokument. Was sich nicht belegen lässt, kommt nicht in den Bericht. Beträge nennen wir nur als Spanne und nur, wenn Zahlen im Dokument sie tragen.',
            },
            {
              n: '03',
              h: 'Jeder Fund endet in einem Satz',
              p: 'Zu jeder Feststellung gehört genau eine Handlung — formuliert als Satz, den Sie wörtlich schreiben oder sagen können. Ein Bericht, aus dem nichts folgt, hilft niemandem.',
            },
          ].map((item) => (
            <div key={item.n} className="bg-paper-raised p-7">
              <span className="font-mono text-xs text-accent">{item.n}</span>
              <h3 className="mt-3 text-lg">{item.h}</h3>
              <p className="mt-2 font-sans text-[0.95rem] leading-relaxed text-ink-muted">{item.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Abgrenzung */}
      <section className="mt-24">
        <div className="sheet grid gap-8 p-8 sm:grid-cols-2 sm:p-10">
          <div>
            <p className="eyebrow">Was Sie bekommen</p>
            <ul className="mt-4 space-y-3 font-sans text-[0.97rem] text-ink">
              {[
                'Eine Feststellung je Prüfpunkt, mit Zitat und Grundlage',
                'Einen Satz zum Handeln je Feststellung',
                'Eine finanzielle Spanne, wo das Dokument sie hergibt',
                'Ein PDF mit Prüfdatum und Katalogversion',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[0.52em] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Was Sie nicht bekommen</p>
            <ul className="mt-4 space-y-3 font-sans text-[0.97rem] text-ink-muted">
              {[
                'Keine Rechts-, Steuer- oder Fachberatung',
                'Kein Sachverständigengutachten',
                'Keine Aussage darüber, ob eine Forderung durchsetzbar ist',
                'Keine Bewertung des Betriebs, der die Abrechnung gestellt hat',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[0.52em] h-1 w-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Nischen */}
      <section id="pruefungen" className="mt-24 scroll-mt-24">
        <p className="eyebrow">Prüfungen</p>
        <h2 className="mt-3 max-w-[24ch] text-display-lg">
          {niches.length === 1 ? 'Zurzeit eine Prüfung' : `Zurzeit ${niches.length} Prüfungen`} — jede mit eigenem
          Katalog
        </h2>
        <p className="mt-4 max-w-prose text-ink-muted">
          Eine Prüfung wird erst freigeschaltet, wenn ihr Katalog fertig und veröffentlicht ist. Ein Thema ohne
          eigenen Maßstab bekommt hier keine Seite.
        </p>

        <div className="mt-10 space-y-5">
          {niches.map((niche) => (
            <article key={niche.slug} className="sheet p-7 sm:p-9">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 className="text-display-md">
                  <Link href={`/${niche.slug}`} className="hover:text-accent-ink">
                    {niche.brand.name}
                  </Link>
                </h3>
                <span className="checkid">
                  Katalog {niche.catalogue.version} · {niche.catalogue.checks.length} Prüfpunkte
                </span>
              </div>

              <p className="mt-3 max-w-prose text-ink-muted">{niche.landing.subline}</p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href={`/${niche.slug}/pruefung`} className="btn-primary">
                  {niche.input.docLabel} prüfen
                </Link>
                <Link
                  href={`/${niche.slug}/pruefkatalog`}
                  className="font-sans text-sm font-semibold text-accent-ink underline decoration-2 underline-offset-4"
                >
                  Prüfkatalog lesen
                </Link>
                <span className="font-sans text-sm text-ink-faint">
                  ab {(Math.min(...niche.pricing.tiers.map((t) => t.priceCents)) / 100).toFixed(2).replace('.', ',')} €
                  · Vorschau kostenlos
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-24">
        <p className="eyebrow">Häufige Fragen</p>
        <h2 className="mt-3 text-display-lg">Zum Prinzip</h2>

        <dl className="mt-8 divide-y divide-rule border-y border-rule">
          {HUB_FAQ.map((entry) => (
            <div key={entry.q} className="py-6">
              <dt className="font-display text-lg text-ink">{entry.q}</dt>
              <dd className="mt-2 max-w-prose font-sans text-[0.97rem] leading-relaxed text-ink-muted">{entry.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Page>
  );
}
