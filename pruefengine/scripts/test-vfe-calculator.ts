/**
 * Testsuite für lib/calculators/vfe-aktiv-passiv.ts.
 *
 * Der Rechner ist reiner Code ohne Modellaufruf — deshalb ist er testbar, und
 * deshalb wird er getestet. Bei einer Nachrechnung über fünfstellige Beträge
 * ist ungeprüfter Rechencode kein Feature, sondern ein Haftungsfall.
 *
 * Die Zinsreihe wird hier injiziert, nicht importiert: Die Tests müssen
 * unabhängig davon laufen, ob die echte Reihe schon verifiziert ist.
 *
 * Aufruf: npm run test:vfe
 */
import type { RateSeries } from '../lib/data/zinsreihe';
import {
  buildSchedule,
  kuendigungsterminNach489,
  presentValue,
  vfeAktivPassiv,
} from '../lib/calculators/vfe-aktiv-passiv';
import type { CalculatorContext } from '../lib/calculators/types';

let failed = 0;
let passed = 0;

function ok(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`    ok   ${name}`);
  } else {
    failed += 1;
    console.log(`    FEHL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function near(name: string, actual: number, expected: number, tolerance: number): void {
  ok(
    name,
    Math.abs(actual - expected) <= tolerance,
    `erwartet ${expected.toFixed(2)} ± ${tolerance}, war ${actual.toFixed(2)}`,
  );
}

function fall(title: string, fn: () => void): void {
  console.log(`\n  ${title}`);
  fn();
}

/** Flache Zinskurve zum Testen. Verifiziert, damit keine Warnung stört. */
function flacheReihe(rate: number): RateSeries {
  return {
    id: 'TEST-FLACH',
    label: 'Testreihe, flach',
    source: 'Testsuite',
    verified: true,
    curves: [
      {
        month: '2020-01',
        points: [
          { years: 0.5, rate },
          { years: 30, rate },
        ],
      },
    ],
  };
}

/** Effektivzins, der zur monatlichen Verzinsung des Darlehens passt. */
function effektiv(nominalPa: number): number {
  return Math.pow(1 + nominalPa / 12, 12) - 1;
}

function ctxFor(series: RateSeries, claimEuro: number | null, context: Record<string, string> = {}): CalculatorContext {
  return {
    claimEuro,
    context: { abloesedatum: '2024-06-01', ...context },
    tolerancePercent: 5,
    series,
  };
}

const basisParams = {
  restschuldEuro: 200000,
  nominalzinsProzent: 3,
  zinsbindungEnde: '2031-06-01',
  monatsrateEuro: 1000,
  bankWiederanlagezinsProzent: 2.0,
  bankVerwaltungskostenEuro: 300,
  bankRisikokostenEuro: 200,
  methode: 'Aktiv-Passiv',
};

console.log('Testsuite vfe-aktiv-passiv');

/* ── 1 — Bausteine ───────────────────────────────────────────────────────── */

fall('Baustein: Zahlungsstrom erhält die Restschuld', () => {
  const s = buildSchedule(200000, 0.03, 1000, 84);
  const tilgungsSumme = s.flows.reduce((sum, f) => sum + f.amount, 0);
  const zinsSumme = tilgungsSumme - 200000;

  ok('Zahlungen vorhanden', s.flows.length > 0);
  ok('Summe der Zahlungen übersteigt die Restschuld', tilgungsSumme > 200000);
  ok('Zinsanteil positiv', zinsSumme > 0);
  ok('Restschuld am Ende kleiner als am Anfang', s.restschuldAmEnde < 200000);
});

fall('Baustein: Barwert zum eigenen Effektivzins entspricht der Restschuld', () => {
  // Wird der Zahlungsstrom mit genau dem Effektivzins des Darlehens abgezinst,
  // muss der Barwert exakt der Restschuld entsprechen. Das ist die
  // Kontrollrechnung, die die gesamte Abzinsung absichert.
  const s = buildSchedule(200000, 0.03, 1000, 84);
  const curve = flacheReihe(effektiv(0.03)).curves[0];
  near('Barwert = Restschuld', presentValue(s.flows, curve), 200000, 1);
});

fall('Baustein: Kündigungstermin nach § 489 Abs. 1 Nr. 2 BGB', () => {
  const termin = kuendigungsterminNach489(new Date(Date.UTC(2015, 2, 15)));
  ok(
    'Zehn Jahre plus sechs Monate',
    termin.toISOString().slice(0, 10) === '2025-09-15',
    `war ${termin.toISOString().slice(0, 10)}`,
  );
});

/* ── 2 — Kernfälle der Bewertung ─────────────────────────────────────────── */

fall('Fall 1: Wiederanlage zum eigenen Effektivzins ergibt keinen Schaden', () => {
  const series = flacheReihe(effektiv(0.03));
  const out = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 5000));

  ok('beurteilbar', out.assessable);
  ok('Band bei null', (out.compute.band?.[1] ?? -1) === 0, `Band war ${JSON.stringify(out.compute.band)}`);
  ok('Forderung liegt oberhalb', out.compute.position === 'oberhalb');
});

fall('Fall 2: niedrigere Wiederanlage ergibt einen Schaden', () => {
  const series = flacheReihe(0.015);
  const out = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 12000));

  ok('beurteilbar', out.assessable);
  ok('Band positiv', (out.compute.band?.[0] ?? 0) > 0);
  ok('Untergrenze kleiner als Obergrenze', (out.compute.band as number[])[0] < (out.compute.band as number[])[1]);
  ok(
    'Band in plausibler Größenordnung',
    (out.compute.band as number[])[1] < 200000 * 0.2,
    `Obergrenze war ${(out.compute.band as number[])[1]}`,
  );
});

fall('Fall 3: höhere Wiederanlage ergibt keinen negativen Schaden', () => {
  const series = flacheReihe(0.06);
  const out = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 8000));

  ok('Band bei null gekappt', (out.compute.band as number[])[1] === 0);
  ok('kein negativer Wert', (out.compute.band as number[])[0] >= 0);
});

/* ── 3 — Nicht ausgeübte Sondertilgungsrechte ────────────────────────────── */

fall('Fall 4: Sondertilgungsrecht 5 % senkt den Schaden', () => {
  const series = flacheReihe(0.015);
  const ohne = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 12000));
  const mit = vfeAktivPassiv(
    { ...basisParams, sondertilgungProzentProJahr: 5 },
    ctxFor(series, 12000, { sondertilgung: 'Ja, Sondertilgungsrechte vereinbart' }),
  );

  const bandOhne = ohne.compute.band as number[];
  const bandMit = mit.compute.band as number[];

  ok('Band sinkt', bandMit[1] < bandOhne[1], `${bandMit[1]} vs. ${bandOhne[1]}`);
  ok('Feststellung VFE-14 erzeugt', mit.findings.some((f) => f.checkId === 'VFE-14'));
  ok(
    'Feststellung nennt einen Betrag',
    Boolean(mit.findings.find((f) => f.checkId === 'VFE-14')?.euroImpact),
  );
});

fall('Fall 5: höheres Sondertilgungsrecht senkt stärker', () => {
  const series = flacheReihe(0.015);
  const fuenf = vfeAktivPassiv(
    { ...basisParams, sondertilgungProzentProJahr: 5 },
    ctxFor(series, 12000, { sondertilgung: 'Ja, Sondertilgungsrechte vereinbart' }),
  );
  const zehn = vfeAktivPassiv(
    { ...basisParams, sondertilgungProzentProJahr: 10 },
    ctxFor(series, 12000, { sondertilgung: 'Ja, Sondertilgungsrechte vereinbart' }),
  );

  ok(
    '10 % senkt stärker als 5 %',
    (zehn.compute.band as number[])[1] < (fuenf.compute.band as number[])[1],
    `${(zehn.compute.band as number[])[1]} vs. ${(fuenf.compute.band as number[])[1]}`,
  );
  ok(
    'ohne Vereinbarung keine Anrechnung',
    !vfeAktivPassiv(
      { ...basisParams, sondertilgungProzentProJahr: 10 },
      ctxFor(series, 12000, { sondertilgung: 'Nein, keine vereinbart' }),
    ).findings.some((f) => f.checkId === 'VFE-14'),
  );
});

/* ── 4 — Kündigungstermin innerhalb der Restlaufzeit ─────────────────────── */

fall('Fall 6: § 489-Termin kappt den Berechnungszeitraum', () => {
  const series = flacheReihe(0.015);

  // Vollauszahlung 2015-01-01 => Kündigung wirksam ab 2025-07-01.
  // Zinsbindung läuft bis 2031 — der Zeitraum wird also gekappt.
  const gekappt = vfeAktivPassiv(
    { ...basisParams },
    ctxFor(series, 12000, { vollauszahlung: '2015-01-01' }),
  );
  const ungekappt = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 12000));

  ok('Kappung vermerkt', gekappt.compute.inputs.gekapptAuf489 === true);
  ok(
    'kürzerer Zeitraum',
    (gekappt.compute.inputs.berechnungsmonate as number) <
      (ungekappt.compute.inputs.berechnungsmonate as number),
  );
  ok(
    'niedrigeres Band',
    (gekappt.compute.band as number[])[1] < (ungekappt.compute.band as number[])[1],
  );
  ok('Feststellung VFE-15 erzeugt', gekappt.findings.some((f) => f.checkId === 'VFE-15'));
});

fall('Fall 7: § 489-Termin nach Ende der Zinsbindung kappt nicht', () => {
  const series = flacheReihe(0.015);
  const out = vfeAktivPassiv(
    { ...basisParams },
    ctxFor(series, 12000, { vollauszahlung: '2023-01-01' }),
  );

  ok('keine Kappung', out.compute.inputs.gekapptAuf489 === false);
  ok('keine Feststellung VFE-15', !out.findings.some((f) => f.checkId === 'VFE-15'));
  ok('aber Fristhinweis VFE-21', out.findings.some((f) => f.checkId === 'VFE-21'));
});

/* ── 5 — Nicht beurteilbar statt geschätzt ───────────────────────────────── */

fall('Fall 8: fehlender Pflichtparameter beendet die Prüfung', () => {
  const series = flacheReihe(0.015);
  const out = vfeAktivPassiv(
    { nominalzinsProzent: 3, zinsbindungEnde: '2031-06-01' },
    ctxFor(series, 12000),
  );

  ok('nicht beurteilbar', out.assessable === false);
  ok('keine Feststellungen', out.findings.length === 0);
  ok('kein Band', out.compute.band === null);
  ok('fehlende Parameter benannt', out.compute.missingParams.length > 0);
  ok(
    'Restschuld als fehlend genannt',
    out.compute.missingParams.some((p) => p.includes('Restschuld')),
  );
});

fall('Fall 9: Ablösedatum nach Ende der Zinsbindung ist nicht beurteilbar', () => {
  const series = flacheReihe(0.015);
  const out = vfeAktivPassiv(
    { ...basisParams, zinsbindungEnde: '2024-01-01' },
    ctxFor(series, 12000),
  );
  ok('nicht beurteilbar', out.assessable === false);
});

/* ── 6 — Toleranz und Vergleich ──────────────────────────────────────────── */

fall('Fall 10: Feststellung erst oberhalb der Toleranz', () => {
  const series = flacheReihe(0.015);
  const referenz = vfeAktivPassiv({ ...basisParams }, ctxFor(series, null));
  const obergrenze = (referenz.compute.band as number[])[1];

  const knappDarueber = vfeAktivPassiv(
    { ...basisParams },
    ctxFor(series, Math.round(obergrenze * 1.02)),
  );
  const deutlichDarueber = vfeAktivPassiv(
    { ...basisParams },
    ctxFor(series, Math.round(obergrenze * 1.4)),
  );

  ok('2 % über dem Band: keine Feststellung VFE-18', !knappDarueber.findings.some((f) => f.checkId === 'VFE-18'));
  ok('40 % über dem Band: Feststellung VFE-18', deutlichDarueber.findings.some((f) => f.checkId === 'VFE-18'));
  ok(
    'Feststellung beziffert die Differenz',
    Boolean(deutlichDarueber.findings.find((f) => f.checkId === 'VFE-18')?.euroImpact),
  );
});

fall('Fall 11: Forderung innerhalb des Bandes', () => {
  const series = flacheReihe(0.015);
  const referenz = vfeAktivPassiv({ ...basisParams }, ctxFor(series, null));
  const band = referenz.compute.band as number[];
  const mitte = Math.round((band[0] + band[1]) / 2);

  const out = vfeAktivPassiv({ ...basisParams }, ctxFor(series, mitte));
  ok('Position innerhalb', out.compute.position === 'innerhalb');
  ok('keine Feststellung VFE-18', !out.findings.some((f) => f.checkId === 'VFE-18'));
});

/* ── 7 — Fehlende Rechengrößen der Bank ──────────────────────────────────── */

fall('Fall 12: fehlende Rechengrößen erzeugen die passenden Feststellungen', () => {
  const series = flacheReihe(0.015);
  const out = vfeAktivPassiv(
    {
      restschuldEuro: 200000,
      nominalzinsProzent: 3,
      zinsbindungEnde: '2031-06-01',
      monatsrateEuro: 1000,
      bearbeitungsentgeltEuro: 250,
    },
    ctxFor(series, 20000),
  );

  const ids = out.findings.map((f) => f.checkId);
  ok('VFE-10 fehlende Methode', ids.includes('VFE-10'));
  ok('VFE-11 fehlender Wiederanlagezins', ids.includes('VFE-11'));
  ok('VFE-12 fehlende Verwaltungskosten', ids.includes('VFE-12'));
  ok('VFE-13 fehlende Risikokosten', ids.includes('VFE-13'));
  ok('VFE-16 Bearbeitungsentgelt', ids.includes('VFE-16'));
  ok('VFE-17 Nachvollziehbarkeit', ids.includes('VFE-17'));
});

/* ── 8 — Reproduzierbarkeit ──────────────────────────────────────────────── */

fall('Fall 13: Ergebnis ist reproduzierbar und dokumentiert seine Quelle', () => {
  const series = flacheReihe(0.015);
  const a = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 12000));
  const b = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 12000));

  ok('gleiches Band', JSON.stringify(a.compute.band) === JSON.stringify(b.compute.band));
  ok('Kennung der Zinsreihe gespeichert', a.compute.dataSource.id === 'TEST-FLACH');
  ok('Stand der Zinsreihe gespeichert', a.compute.dataSource.asOf === '2020-01');
  ok('Eingangswerte gespeichert', Object.keys(a.compute.inputs).length > 8);
  ok('Rechenschritte vorhanden', a.compute.steps.length >= 5);
  ok('Verjährungshinweis nur bei bereits gezahlt', !a.findings.some((f) => f.checkId === 'VFE-20'));
});

fall('Fall 14: bereits gezahlt erzeugt den Verjährungshinweis mit Datum', () => {
  const series = flacheReihe(0.015);
  const out = vfeAktivPassiv({ ...basisParams }, ctxFor(series, 12000, { anlass: 'Bereits gezahlt' }));
  const finding = out.findings.find((f) => f.checkId === 'VFE-20');

  ok('VFE-20 erzeugt', Boolean(finding));
  ok('nennt ein konkretes Datum', /\d{4}-12-31/.test(finding?.observation ?? ''));
  ok('verweist auf anwaltliche Klärung', /anwaltlich/i.test(finding?.observation ?? ''));
});

/* ── Ergebnis ────────────────────────────────────────────────────────────── */

console.log(`\n${passed} Prüfungen bestanden, ${failed} fehlgeschlagen.`);
if (failed > 0) process.exit(1);
