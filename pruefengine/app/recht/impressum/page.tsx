import type { Metadata } from 'next';
import { hasPlaceholders, site, siteUrl } from '@/config/site';

export const metadata: Metadata = {
  title: 'Impressum',
  description: `Anbieterkennzeichnung nach § 5 DDG für ${site.domain}.`,
  alternates: { canonical: siteUrl('/recht/impressum') },
  robots: { index: true, follow: false },
};

export default function ImpressumPage() {
  return (
    <>
      <p className="eyebrow">Rechtliches</p>
      <h1 className="mt-3 text-display-lg">Impressum</h1>

      {hasPlaceholders() && (
        <p className="mt-6 max-w-prose rounded-card border border-severity-error/40 bg-severity-error/[0.06] p-4 font-sans text-sm text-severity-error">
          Hinweis für den Betreiber: In <code>config/site.ts</code> stehen noch Platzhalter. Vor dem Livegang
          ausfüllen — eine unvollständige Anbieterkennzeichnung ist abmahnfähig.
        </p>
      )}

      <div className="prose-page mt-8">
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {site.provider.entity}
          <br />
          {site.provider.street}
          <br />
          {site.provider.zipCity}
          <br />
          {site.provider.country}
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href={`mailto:${site.provider.email}`}>{site.provider.email}</a>
          {site.provider.phone && (
            <>
              <br />
              Telefon: {site.provider.phone}
            </>
          )}
        </p>

        <h2>Umsatzsteuer</h2>
        {site.provider.smallBusiness ? (
          <p>{site.provider.vatNote}</p>
        ) : (
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {site.provider.vatId}</p>
        )}

        {site.provider.registerNote && (
          <>
            <h2>Registereintrag</h2>
            <p>{site.provider.registerNote}</p>
          </>
        )}

        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {site.provider.editorialResponsible}
          <br />
          {site.provider.street}
          <br />
          {site.provider.zipCity}
        </p>

        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
          <a href={site.odrUrl} rel="nofollow noopener" target="_blank">
            {site.odrUrl}
          </a>
          . Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2>Art der angebotenen Leistung</h2>
        <p>
          Angeboten wird eine technische Plausibilitätsprüfung hochgeladener Dokumente gegen einen jeweils
          veröffentlichten Prüfkatalog. Das Angebot ist keine Rechts-, Steuer- oder Fachberatung im Sinne des
          Rechtsdienstleistungsgesetzes oder des Steuerberatungsgesetzes und kein Sachverständigengutachten. Es
          werden keine Rechtsdienstleistungen im Einzelfall erbracht.
        </p>

        <h2>Haftung für Inhalte und Links</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
          verantwortlich. Für Inhalte externer Links ist der jeweilige Anbieter verantwortlich. Zum Zeitpunkt der
          Verlinkung waren keine rechtswidrigen Inhalte erkennbar; bei Bekanntwerden von Rechtsverletzungen
          entfernen wir entsprechende Links umgehend.
        </p>
      </div>
    </>
  );
}
