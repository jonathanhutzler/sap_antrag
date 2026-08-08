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
    q: 'Warum mehrere Prüfungen unter einem Dach?',
    a: 'Der Maßstab ist überall derselbe. Ein Katalog, den Sie vorher lesen können. Ein Zitat aus Ihrem Dokument zu jeder Feststellung. Ein Satz, mit dem Sie weiterkommen. Nur die Prüfpunkte unterscheiden sich, und die stehen je Prüfung in einer eigenen Datei mit Versionsnummer.',
  },
  {
    q: 'Was heißt technische Plausibilitätsprüfung?',
    a: 'Wir sagen Ihnen, was in einem Dokument fehlt, was von einer Vorschrift abweicht und was außerhalb der üblichen Spanne liegt. Zu jedem Punkt gehört ein Zitat und die Norm oder das Referenzband, auf das er sich stützt. Ob Sie zahlen müssen, sagen wir nicht. Das wäre Rechtsberatung.',
  },
  {
    q: 'Was kostet das?',
    a: 'Die Vorschau nichts. Sie sehen die Anzahl der Funde, ihre Schwere, die betroffenen Kategorien und einen Fund komplett ausformuliert. Geld kostet nur der Vollbericht. Finden wir nichts oder lässt sich Ihr Dokument nicht lesen, bieten wir Ihnen auch nichts an.',
  },
  {
    q: 'Was passiert mit meinen Dokumenten?',
    a: 'Sie gehen zur Analyse an Anthropic und werden dort nicht zum Training verwendet. Ergebnis und Dokumentbezug liegen für die in der jeweiligen Prüfung genannte Frist im Zwischenspeicher, danach löscht das System sie selbst. Wer sonst noch beteiligt ist, steht mit Namen in der Datenschutzerklärung.',
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
          Sie lesen den Katalog, <span className="text-accent">bevor</span> Sie hochladen.
        </h1>
        <p className="mt-6 max-w-prose text-[1.12rem] leading-[1.62] text-ink-muted">
          Bei den meisten Prüfangeboten erfahren Sie erst hinterher, wonach gesucht wurde. Hier steht der Katalog
          vorher offen. Jeder Punkt darin nennt seine Grundlage: einen Paragrafen oder ein Referenzband mit
          Zahlen. Findet die Prüfung etwas, bekommen Sie die Stelle aus Ihrem eigenen Dokument dazu.
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
              p: 'Jeder Prüfpunkt steht im Netz, mit Grundlage und Versionsnummer. Vorher zum Lesen. Hinterher zum Nachschlagen, wonach eigentlich geprüft wurde.',
            },
            {
              n: '02',
              h: 'Jeder Fund zeigt seine Stelle',
              p: 'Ohne Zitat aus Ihrem Dokument keine Feststellung. Beträge nennen wir als Spanne und nur dann, wenn Zahlen im Dokument sie hergeben.',
            },
            {
              n: '03',
              h: 'Jeder Fund endet in einem Satz',
              p: 'Zu jeder Feststellung gehört ein fertiger Satz zum Schreiben oder Sagen. Kein „lassen Sie das prüfen". Aus einem Bericht muss etwas folgen.',
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
            <p className="eyebrow">Im Bericht</p>
            <ul className="mt-4 space-y-3 font-sans text-[0.97rem] text-ink">
              {[
                'Jede Feststellung mit Zitat und Grundlage',
                'Ein fertiger Satz zum Schreiben oder Sagen',
                'Eine Spanne in Euro, wo das Dokument sie hergibt',
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
            <p className="eyebrow">Nicht im Bericht</p>
            <ul className="mt-4 space-y-3 font-sans text-[0.97rem] text-ink-muted">
              {[
                'Rechts-, Steuer- oder Fachberatung',
                'Ein Sachverständigengutachten',
                'Die Antwort, ob eine Forderung durchsetzbar ist',
                'Ein Urteil über den Betrieb, der die Abrechnung gestellt hat',
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
          {niches.length === 0
            ? 'Zurzeit ist keine Prüfung freigeschaltet'
            : niches.length === 1
              ? 'Zurzeit eine Prüfung — mit eigenem Katalog'
              : `Zurzeit ${niches.length} Prüfungen — jede mit eigenem Katalog`}
        </h2>
        <p className="mt-4 max-w-prose text-ink-muted">
          Freigeschaltet wird eine Prüfung erst, wenn ihr Katalog fertig ist. Solange es keinen gibt, gibt es hier
          auch keine Seite dazu.
        </p>

        {/*
          Der leere Fall ist kein Fehler, sondern der Normalzustand vor der
          ersten Freischaltung. Er darf nur nicht wie ein Ladefehler aussehen.
        */}
        {niches.length === 0 && (
          <p className="mt-6 max-w-prose font-sans text-[0.97rem] leading-relaxed text-ink-faint">
            Die erste Prüfung ist in Arbeit. Bis dahin gibt es hier nichts zu kaufen.
          </p>
        )}

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
        <h2 className="mt-3 text-display-lg">Wie das hier läuft</h2>

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
