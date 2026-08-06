'use client';

import { useMemo, useState } from 'react';

/**
 * Kostenloser Fristrechner nach § 489 Abs. 1 Nr. 2 BGB.
 *
 * Kein Upload, keine Anmeldung, keine Bezahlschranke — und bewusst kein
 * abgeschnittenes Ergebnis. Wer hier landet, bekommt die volle Antwort.
 *
 * Das ist die glaubwürdigste Form der Produktvorschau: Die Rechnung stimmt,
 * sie ist nachvollziehbar, und wer danach eine Entschädigung nachrechnen
 * lassen will, weiß, worauf er sich einlässt.
 *
 * Gerechnet wird im Browser. Es wird nichts übertragen und nichts gespeichert.
 */

function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function formatDe(value: Date): string {
  return value.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

function tageBis(target: Date): number {
  const heute = new Date();
  const heuteUtc = Date.UTC(heute.getFullYear(), heute.getMonth(), heute.getDate());
  return Math.round((target.getTime() - heuteUtc) / 86400000);
}

export function Fristrechner489() {
  const [datum, setDatum] = useState('');

  const ergebnis = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return null;

    const [y, m, d] = datum.split('-').map(Number);
    const vollauszahlung = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(vollauszahlung.getTime())) return null;

    // Zehn Jahre nach vollständigem Empfang darf gekündigt werden,
    // die Kündigungsfrist beträgt sechs Monate.
    const kuendigungAb = addMonths(vollauszahlung, 120);
    const wirksamAb = addMonths(vollauszahlung, 126);

    return {
      vollauszahlung,
      kuendigungAb,
      wirksamAb,
      tageBisKuendigung: tageBis(kuendigungAb),
      tageBisWirksam: tageBis(wirksamAb),
    };
  }, [datum]);

  return (
    <div className="sheet p-7 sm:p-8">
      <label htmlFor="vollauszahlung" className="field-label">
        Datum der Vollauszahlung des Darlehens
      </label>
      <input
        id="vollauszahlung"
        type="date"
        value={datum}
        onChange={(e) => setDatum(e.target.value)}
        className="field max-w-xs"
      />
      <p className="mt-1.5 font-sans text-xs text-ink-faint">
        Der Tag, an dem das Geld vollständig auf Ihrem Konto war. Nicht der Tag der Unterschrift. Kam es in Raten,
        zählt die letzte.
      </p>

      {ergebnis && (
        <div className="mt-8 border-t border-rule pt-7">
          <dl className="space-y-5">
            <div>
              <dt className="font-sans text-sm text-ink-faint">Kündigung möglich ab</dt>
              <dd className="mt-0.5 font-display text-2xl text-ink">{formatDe(ergebnis.kuendigungAb)}</dd>
              <dd className="mt-1 font-sans text-sm text-ink-muted">
                Zehn Jahre nach der Vollauszahlung.{' '}
                {ergebnis.tageBisKuendigung > 0
                  ? `Noch ${ergebnis.tageBisKuendigung.toLocaleString('de-DE')} Tage.`
                  : 'Dieser Zeitpunkt ist erreicht.'}
              </dd>
            </div>

            <div>
              <dt className="font-sans text-sm text-ink-faint">
                Darlehen entschädigungsfrei abgelöst — frühestens
              </dt>
              <dd className="mt-0.5 font-display text-2xl text-accent-ink">{formatDe(ergebnis.wirksamAb)}</dd>
              <dd className="mt-1 font-sans text-sm text-ink-muted">
                Nach Ablauf der sechs Monate Kündigungsfrist.{' '}
                {ergebnis.tageBisWirksam > 0
                  ? `Noch ${ergebnis.tageBisWirksam.toLocaleString('de-DE')} Tage.`
                  : 'Dieser Zeitpunkt ist durch. Eine Vorfälligkeitsentschädigung fällt dafür nicht mehr an.'}
              </dd>
            </div>
          </dl>

          {ergebnis.tageBisWirksam > 0 && ergebnis.tageBisWirksam < 400 && (
            <p className="mt-6 rounded-card border border-accent bg-accent-soft p-4 font-sans text-[0.93rem] leading-relaxed text-ink">
              Der Termin liegt in weniger als einem Jahr. Abwarten kann dann billiger sein als jede Verhandlung über
              die Höhe. Vorausgesetzt, Ihr Vorhaben verträgt den Aufschub.
            </p>
          )}

          <p className="mt-6 font-sans text-xs leading-relaxed text-ink-faint">
            Grundlage ist § 489 Abs. 1 Nr. 2 BGB. Danach kann ein Darlehen mit festem Sollzinssatz zehn Jahre nach
            der Vollauszahlung mit sechsmonatiger Frist gekündigt werden. Gerechnet wird in Ihrem Browser, es geht
            nichts an uns und nichts wird gespeichert. Eine rechtliche Prüfung Ihres Vertrags ersetzt das nicht.
          </p>
        </div>
      )}
    </div>
  );
}
