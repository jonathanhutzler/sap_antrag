import type { Metadata } from 'next';
import { site, siteUrl } from '@/config/site';
import { activeNiches } from '@/config/registry';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Welche Daten wir verarbeiten, auf welcher Grundlage, wie lange und wer sie in unserem Auftrag verarbeitet.',
  alternates: { canonical: siteUrl('/recht/datenschutz') },
  robots: { index: true, follow: false },
};

/**
 * Datenschutzerklärung.
 *
 * Die Aufbewahrungsfristen und die Liste der Prüfungen werden aus der Registry
 * gerendert. Wird eine Nische freigeschaltet oder ihre Frist geändert, ändert
 * sich dieser Text automatisch mit — statt zu veralten.
 */
export default function DatenschutzPage() {
  const niches = activeNiches();
  const retention = Array.from(new Set(niches.map((n) => n.legal.dataRetentionHours))).sort((a, b) => a - b);

  return (
    <>
      <p className="eyebrow">Rechtliches</p>
      <h1 className="mt-3 text-display-lg">Datenschutzerklärung</h1>

      <div className="prose-page mt-8">
        <h2>1. Verantwortlicher</h2>
        <p>
          {site.provider.entity}, {site.provider.street}, {site.provider.zipCity}, {site.provider.country}.
          <br />
          E-Mail: <a href={`mailto:${site.provider.email}`}>{site.provider.email}</a>
        </p>
        <p>
          Ein Datenschutzbeauftragter ist nicht bestellt; die Voraussetzungen des § 38 BDSG liegen nicht vor.
        </p>

        <h2>2. Was wir verarbeiten, wenn Sie ein Dokument prüfen lassen</h2>
        <p>
          Für die Prüfung verarbeiten wir das von Ihnen hochgeladene Dokument, Ihre Angaben aus dem Formular
          (Auswahlwerte und die von Ihnen genannte Endsumme) und das daraus erzeugte Prüfergebnis. Rechtsgrundlage
          ist Art. 6 Abs. 1 lit. b DSGVO — die Verarbeitung ist zur Durchführung des von Ihnen angefragten
          Dienstes erforderlich.
        </p>
        <p>
          Bitte laden Sie nur Dokumente hoch, deren Weitergabe an die unten genannten Auftragsverarbeiter Sie
          verantworten können. Schwärzen Sie Angaben, die für die Prüfung nicht nötig sind.
        </p>

        <h2>3. Aufbewahrung und Löschung</h2>
        <p>
          Das hochgeladene Dokument wird nur für die Dauer der Analyse verarbeitet und nicht dauerhaft gespeichert.
          Das Prüfergebnis wird zwischengespeichert und automatisch gelöscht:
        </p>
        <ul>
          {niches.map((niche) => (
            <li key={niche.slug}>
              {niche.brand.name}: nach {niche.legal.dataRetentionHours} Stunden
            </li>
          ))}
        </ul>
        <p>
          Die Löschung erfolgt technisch über eine Ablauffrist im Speicher, nicht über einen manuellen Vorgang. Bei
          einem gekauften Bericht verlängert sich die Frist auf mindestens 72 Stunden, damit Sie ihn erneut
          herunterladen können. Die Dokumentation Ihrer Erklärung zum Widerrufsrecht (Wortlaut, Zeitstempel,
          gekürzter Hashwert Ihrer IP-Adresse) bewahren wir davon getrennt drei Jahre auf; Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit den Nachweispflichten aus § 312f BGB. Rechnungsdaten
          bewahrt der Zahlungsdienstleister nach den steuerlichen Fristen auf.
        </p>
        {retention.length > 0 && (
          <p>
            Kürzeste Frist zurzeit: {retention[0]} Stunden. Diese Angabe wird aus der Konfiguration der Prüfungen
            erzeugt und bleibt damit aktuell.
          </p>
        )}

        <h2>4. Auftragsverarbeiter und Empfänger</h2>
        <p>
          Wir setzen die folgenden Dienstleister ein. Mit den Auftragsverarbeitern bestehen Verträge nach Art. 28
          DSGVO; bei Verarbeitung außerhalb der EU stützen wir die Übermittlung auf die Standardvertragsklauseln
          der EU-Kommission nach Art. 46 Abs. 2 lit. c DSGVO.
        </p>

        <table>
          <thead>
            <tr>
              <th>Dienstleister</th>
              <th>Zweck</th>
              <th>Ort</th>
              <th>Grundlage</th>
            </tr>
          </thead>
          <tbody>
            {site.processors.map((processor) => (
              <tr key={processor.name}>
                <td>{processor.name}</td>
                <td>
                  {processor.purpose}
                  <br />
                  <span className="text-ink-faint">{processor.note}</span>
                </td>
                <td>{processor.location}</td>
                <td>{processor.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>5. Zahlungsabwicklung</h2>
        <p>
          Zahlungen wickelt Stripe ab. Ihre Zahlungsdaten werden ausschließlich dort verarbeitet; wir erhalten
          lediglich die Information, ob eine Zahlung erfolgt ist, sowie — sofern Sie sie angeben — Ihre
          E-Mail-Adresse für den Versand des Berichts. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h2>6. E-Mail-Versand</h2>
        <p>
          Geben Sie eine E-Mail-Adresse an, verwenden wir sie ausschließlich für die Zusendung Ihres Berichts und
          für Rückfragen dazu. Ein Newsletter wird nicht versendet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h2>7. Server-Logs und Missbrauchsschutz</h2>
        <p>
          Beim Aufruf der Seiten fallen technisch notwendige Protokolldaten an (IP-Adresse, Zeitpunkt, abgerufene
          Adresse, übermittelter Browsertyp). Zum Schutz vor missbräuchlicher Nutzung der Analysefunktion zählen wir
          Anfragen je IP-Adresse in einem kurzen Zeitfenster. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO;
          unser berechtigtes Interesse ist der sichere und wirtschaftliche Betrieb des Dienstes.
        </p>

        <h2>8. Reichweitenmessung</h2>
        <p>
          Wir nutzen Vercel Analytics. Die Messung arbeitet ohne Cookies und ohne geräteübergreifende Kennungen;
          es entstehen keine für uns personenbezogenen Nutzungsprofile. Erfasst werden aufgerufene Seiten und vier
          Ereignisse des Bestellvorgangs (Upload begonnen, Vorschau angezeigt, Zahlung begonnen, bezahlt), jeweils
          ohne Bezug zu Ihrem Dokument. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
        </p>

        <h2>9. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17),
          Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen eine
          Verarbeitung auf Grundlage berechtigter Interessen (Art. 21). Wenden Sie sich dafür an{' '}
          <a href={`mailto:${site.provider.email}`}>{site.provider.email}</a>.
        </p>
        <p>
          Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO);
          zuständig ist die Behörde Ihres Aufenthaltsorts oder unseres Sitzes.
        </p>

        <h2>10. Keine automatisierte Entscheidung mit Rechtswirkung</h2>
        <p>
          Die Analyse wird maschinell erstellt. Sie erzeugt einen Bericht mit Feststellungen und Hinweisen; sie
          trifft keine Entscheidung, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in ähnlicher Weise
          erheblich beeinträchtigt (Art. 22 DSGVO). Was Sie mit dem Bericht tun, entscheiden ausschließlich Sie.
        </p>
      </div>
    </>
  );
}
