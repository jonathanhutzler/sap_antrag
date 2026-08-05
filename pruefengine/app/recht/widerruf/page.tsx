import type { Metadata } from 'next';
import { site, siteUrl } from '@/config/site';
import { WAIVER_TEXT } from '@/lib/waiver';

export const metadata: Metadata = {
  title: 'Widerrufsbelehrung',
  description: 'Widerrufsrecht, Widerrufsfolgen, Muster-Widerrufsformular und das vorzeitige Erlöschen nach § 356 Abs. 5 BGB.',
  alternates: { canonical: siteUrl('/recht/widerruf') },
  robots: { index: true, follow: false },
};

export default function WiderrufPage() {
  const address = `${site.provider.entity}, ${site.provider.street}, ${site.provider.zipCity}, ${site.provider.email}`;

  return (
    <>
      <p className="eyebrow">Rechtliches</p>
      <h1 className="mt-3 text-display-lg">Widerrufsbelehrung</h1>

      <div className="prose-page mt-8">
        <h2>Widerrufsrecht</h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die
          Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
        </p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({address}) mittels einer eindeutigen Erklärung (z. B. ein
          mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen,
          informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht
          vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
          Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
        </p>

        <h2>Folgen des Widerrufs</h2>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
          einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie
          eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben),
          unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
          Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe
          Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde
          ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte
          berechnet.
        </p>

        <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
        <p>
          Das Widerrufsrecht bei einem Vertrag über die Lieferung von nicht auf einem körperlichen Datenträger
          befindlichen digitalen Inhalten erlischt nach § 356 Abs. 5 BGB, wenn wir mit der Ausführung des Vertrages
          begonnen haben, nachdem Sie
        </p>
        <ol>
          <li>
            ausdrücklich zugestimmt haben, dass wir mit der Ausführung des Vertrages vor Ablauf der Widerrufsfrist
            beginnen, und
          </li>
          <li>
            Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung des
            Vertrages Ihr Widerrufsrecht verlieren.
          </li>
        </ol>
        <p>
          Beides holen wir vor dem Kauf über eine Ankreuzmöglichkeit ein. Der Wortlaut, dem Sie dabei zustimmen,
          lautet:
        </p>
        <blockquote>{WAIVER_TEXT}</blockquote>
        <p>
          Ohne dieses Häkchen ist der Kauf nicht möglich. Die Erklärung wird serverseitig im angezeigten Wortlaut
          geprüft und mit Zeitstempel protokolliert; auf Anfrage stellen wir Ihnen diese Dokumentation zur
          Verfügung.
        </p>

        <h2>Muster-Widerrufsformular</h2>
        <p>
          (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es
          zurück.)
        </p>

        <div className="sheet not-prose my-6 p-6 font-sans text-[0.95rem] leading-[1.9] text-ink">
          <p>
            An {site.provider.entity}, {site.provider.street}, {site.provider.zipCity}, E-Mail:{' '}
            {site.provider.email}
          </p>
          <p className="mt-4">
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der
            folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*)
          </p>
          <p className="mt-4">
            _______________________________________________
            <br />
            Bestellt am (*)/erhalten am (*): __________________
            <br />
            Name des/der Verbraucher(s): ____________________
            <br />
            Anschrift des/der Verbraucher(s): ________________
            <br />
            _______________________________________________
            <br />
            Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ______________
            <br />
            Datum: ______________
          </p>
          <p className="mt-4 text-ink-faint">(*) Unzutreffendes streichen.</p>
        </div>

        <p className="text-sm text-ink-faint">
          Hinweis: Sie können uns Ihren Widerruf auch formlos per E-Mail an{' '}
          <a href={`mailto:${site.provider.email}`}>{site.provider.email}</a> senden. Nennen Sie dabei bitte die
          Bericht-Nummer, damit wir die Bestellung zuordnen können.
        </p>
      </div>
    </>
  );
}
