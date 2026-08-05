import type { Metadata } from 'next';
import Link from 'next/link';
import { site, siteUrl } from '@/config/site';
import { serviceCatalogue } from '@/config/registry';
import { WAIVER_TEXT } from '@/lib/waiver';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description: 'Vertragsgegenstand, Leistungsumfang, Preise, Widerruf und Haftung.',
  alternates: { canonical: siteUrl('/recht/agb') },
  robots: { index: true, follow: false },
};

/**
 * AGB.
 *
 * § 2 (Leistungsbeschreibung) wird aus der Registry generiert. Wird eine
 * Nische freigeschaltet, steht sie automatisch in den AGB — genau der Punkt,
 * der sonst beim Freischalten vergessen wird und dann in der Abmahnung steht.
 */
export default function AgbPage() {
  const services = serviceCatalogue();

  return (
    <>
      <p className="eyebrow">Rechtliches</p>
      <h1 className="mt-3 text-display-lg">Allgemeine Geschäftsbedingungen</h1>
      <p className="mt-3 font-sans text-sm text-ink-faint">Stand: automatisch erzeugt aus dem aktuellen Leistungsangebot</p>

      <div className="prose-page mt-8">
        <h2>§ 1 Geltungsbereich und Vertragspartner</h2>
        <p>
          Diese Bedingungen gelten für alle Verträge über die auf {site.domain} angebotenen Dokumentenprüfungen
          zwischen {site.provider.entity}, {site.provider.street}, {site.provider.zipCity} (nachfolgend „Anbieter")
          und dem Besteller. Abweichende Bedingungen des Bestellers werden nicht Vertragsbestandteil, es sei denn,
          der Anbieter stimmt ihnen schriftlich zu.
        </p>
        <p>
          Verbraucher ist jede natürliche Person, die das Rechtsgeschäft zu Zwecken abschließt, die überwiegend
          weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können
          (§ 13 BGB).
        </p>

        <h2>§ 2 Leistungsgegenstand</h2>
        <p>
          Der Anbieter erbringt eine technische Plausibilitätsprüfung eines vom Besteller hochgeladenen Dokuments
          gegen einen veröffentlichten, versionierten Prüfkatalog. Ergebnis ist ein Bericht in Textform (PDF), der
          die festgestellten Abweichungen benennt, die jeweilige Fundstelle im Dokument zitiert, die Grundlage des
          Prüfpunkts angibt und je Feststellung einen Handlungsvorschlag enthält.
        </p>

        <p>Angeboten werden derzeit die folgenden Prüfungen:</p>

        {services.map((service) => (
          <div key={service.slug}>
            <h3>
              {service.name} (Prüfkatalog Version {service.catalogueVersion})
            </h3>
            <p>
              Leistung: {service.description}. Der jeweils gültige Prüfkatalog ist unter{' '}
              <Link href={`/${service.slug}/pruefkatalog`}>
                {site.domain}/{service.slug}/pruefkatalog
              </Link>{' '}
              öffentlich einsehbar und Bestandteil der Leistungsbeschreibung.
            </p>
            <ul>
              {service.tiers.map((tier) => (
                <li key={tier.label}>
                  <strong>
                    {tier.label} — {(tier.priceCents / 100).toFixed(2).replace('.', ',')} €
                  </strong>
                  : {tier.includes.join('; ')}.
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p>
          Maßgeblich für den Leistungsumfang ist die Katalogversion, die zum Zeitpunkt der Prüfung galt. Sie wird im
          Bericht genannt. Eine spätere Änderung des Katalogs wirkt nicht auf bereits erstellte Berichte zurück.
        </p>

        <h2>§ 3 Was ausdrücklich nicht geschuldet ist</h2>
        <p>
          Die Leistung ist keine Rechtsberatung und keine Rechtsdienstleistung im Einzelfall im Sinne des § 2 RDG,
          keine Hilfeleistung in Steuersachen im Sinne des § 1 StBerG, keine Fachberatung und kein
          Sachverständigengutachten. Der Bericht trifft keine Aussage darüber, ob eine Forderung besteht, wirksam
          ist oder durchgesetzt werden kann, und er bewertet nicht das Verhalten des Rechnungsstellers. Er stellt
          fest, was in einem Dokument fehlt, was von einer benannten Regelung abweicht oder was außerhalb eines
          benannten Referenzbandes liegt.
        </p>
        <p>
          Referenzbänder sind Orientierungswerte aus der jeweiligen Branche, keine amtlichen Größen. Angegebene
          Beträge sind Schätzungen in Form von Spannen auf Grundlage der im Dokument enthaltenen Zahlen; sie sind
          keine Zusage und keine bezifferte Forderung.
        </p>

        <h2>§ 4 Zustandekommen des Vertrages</h2>
        <p>
          Die Darstellung der Prüfungen auf der Website ist kein bindendes Angebot. Der Besteller lädt zunächst
          kostenfrei ein Dokument hoch und erhält eine Vorschau. Mit dem Klick auf die Schaltfläche zum Kauf des
          Vollberichts gibt er ein verbindliches Angebot ab. Der Vertrag kommt mit der Bestätigung der Zahlung
          zustande.
        </p>
        <p>
          Ergibt die Prüfung, dass das Dokument nicht beurteilbar ist, oder wird keine Feststellung getroffen, wird
          kein kostenpflichtiger Bericht angeboten. Ein Vertrag kommt in diesem Fall nicht zustande.
        </p>

        <h2>§ 5 Preise und Zahlung</h2>
        <p>
          Es gelten die zum Zeitpunkt der Bestellung auf der Website angegebenen Preise. Sie sind Endpreise.{' '}
          {site.provider.smallBusiness ? site.provider.vatNote : 'Die Umsatzsteuer ist enthalten.'}
        </p>
        <p>
          Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Der Anbieter erhebt keine Zahlungsdaten
          selbst.
        </p>

        <h2>§ 6 Mitwirkung des Bestellers</h2>
        <p>
          Die Qualität des Ergebnisses hängt von der Lesbarkeit und Vollständigkeit des hochgeladenen Dokuments ab.
          Der Besteller lädt das Dokument vollständig und lesbar hoch und gibt die abgefragte Endsumme zutreffend
          an; diese Angabe dient als Anker gegen Lesefehler. Der Besteller versichert, zur Weitergabe des Dokuments
          zum Zweck der Prüfung berechtigt zu sein.
        </p>

        <h2>§ 7 Widerrufsrecht</h2>
        <p>
          Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Einzelheiten und das Muster-Widerrufsformular
          finden sich in der <Link href="/recht/widerruf">Widerrufsbelehrung</Link>.
        </p>
        <p>
          Da der Bericht unmittelbar nach der Zahlung bereitgestellt wird, erlischt das Widerrufsrecht nach § 356
          Abs. 5 BGB, wenn der Besteller vor dem Kauf ausdrücklich zustimmt und bestätigt, dass er sein
          Widerrufsrecht dadurch verliert. Der Wortlaut dieser Erklärung lautet:
        </p>
        <blockquote>{WAIVER_TEXT}</blockquote>
        <p>
          Der Anbieter protokolliert diese Erklärung im Wortlaut mit Zeitstempel und stellt sie dem Besteller auf
          Anfrage zur Verfügung.
        </p>

        <h2>§ 8 Gewährleistung und Haftung</h2>
        <p>
          Für Mängel der erbrachten Leistung gelten die gesetzlichen Vorschriften. Der Anbieter haftet unbeschränkt
          bei Vorsatz und grober Fahrlässigkeit sowie bei der Verletzung von Leben, Körper oder Gesundheit. Bei
          leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht ist die Haftung auf den bei
          Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt. Im Übrigen ist die Haftung
          ausgeschlossen. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
        </p>
        <p>
          Der Anbieter schuldet die sorgfältige Prüfung nach dem veröffentlichten Katalog, nicht die
          Vollständigkeit der Erfassung aller denkbaren Auffälligkeiten eines Dokuments und keinen wirtschaftlichen
          Erfolg gegenüber Dritten.
        </p>

        <h2>§ 9 Nutzungsrechte</h2>
        <p>
          Der Besteller darf den Bericht für eigene Zwecke uneingeschränkt nutzen, insbesondere ihn dem
          Rechnungssteller, einer Rechtsanwältin oder einem Rechtsanwalt vorlegen. Eine Veröffentlichung des
          Berichts oder des Prüfkatalogs zu gewerblichen Zwecken Dritter ist nicht gestattet.
        </p>

        <h2>§ 10 Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gegenüber
          Verbrauchern gilt diese Rechtswahl nur, soweit dadurch der Schutz zwingender Vorschriften des Staates,
          in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, nicht entzogen wird.
        </p>
        <p>
          Der Anbieter ist weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen. Die Plattform der EU-Kommission zur Online-Streitbeilegung
          ist erreichbar unter{' '}
          <a href={site.odrUrl} rel="nofollow noopener" target="_blank">
            {site.odrUrl}
          </a>
          .
        </p>
        <p>
          Sollte eine Bestimmung dieser Bedingungen unwirksam sein, bleibt die Wirksamkeit der übrigen
          Bestimmungen unberührt.
        </p>
      </div>
    </>
  );
}
