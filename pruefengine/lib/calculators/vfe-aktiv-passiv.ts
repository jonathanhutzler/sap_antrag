import type { ComputeResult } from '@/config/schema';
import { assertUsable, curveFor, rateFor, type RateCurve } from '../data/zinsreihe';
import {
  addMonths,
  bool,
  date,
  formatDate,
  formatEuroDe,
  formatPercentDe,
  monthsBetween,
  num,
  type CalcFinding,
  type Calculator,
  type CalculatorContext,
  type CalculatorOutput,
} from './types';

/**
 * Nachrechnung einer Vorfälligkeitsentschädigung nach der Aktiv-Passiv-Methode.
 *
 * Grundlogik: Die Zahlungen, die die Bank ohne die vorzeitige Ablösung bis zum
 * Ende der Zinsbindung erhalten hätte, werden laufzeitkongruent auf den
 * Ablösestichtag abgezinst. Die Differenz zwischen diesem Barwert und der
 * Restschuld ist der Zinsverschlechterungsschaden; davon gehen ersparte
 * Verwaltungs- und Risikokosten ab.
 *
 * Ausgegeben wird ein BAND, nie ein Punktwert. Die Ersparnisse sind
 * Schätzgrößen — ein Punktwert wäre Scheingenauigkeit, und bei einem
 * fünfstelligen Streitwert ist Scheingenauigkeit gefährlicher als eine
 * ehrliche Spanne.
 *
 * Was dieser Rechner NICHT tut: Er beurteilt nicht. Er stellt nicht fest, dass
 * eine Forderung unzulässig ist. Er rechnet nach und benennt die Differenz.
 */

/* ── Schätzbänder. Orientierungswerte, keine amtlichen Größen. ──────────── */

/** Ersparte Verwaltungskosten je Monat und Darlehen, Band in Euro. */
const VERWALTUNGSKOSTEN_BAND: [number, number] = [4, 8];
/** Ersparte Risikokosten p. a. auf den durchschnittlichen Saldo, Band. */
const RISIKOKOSTEN_BAND: [number, number] = [0.0004, 0.001];
/** Ab dieser Abweichung gilt ein Bankansatz als vom Referenzsatz abweichend. */
const WIEDERANLAGE_TOLERANZ_PP = 0.25;

export interface VfeParams {
  restschuldEuro: number;
  nominalzinsProzent: number;
  zinsbindungEnde: Date;
  ableoseDatum: Date;
  vollauszahlungDatum: Date | null;
  monatsrateEuro: number | null;
  tilgungssatzProzent: number | null;
  sondertilgungProzentProJahr: number | null;
  sondertilgungGenutztEuro: number | null;
  sondertilgungVereinbart: boolean | null;
  bankWiederanlagezinsProzent: number | null;
  bankVerwaltungskostenEuro: number | null;
  bankRisikokostenEuro: number | null;
  bearbeitungsentgeltEuro: number | null;
  methode: string | null;
}

interface Flow {
  /** Laufzeit in Jahren ab Ablösestichtag. */
  years: number;
  amount: number;
}

interface ScheduleResult {
  flows: Flow[];
  monate: number;
  restschuldAmEnde: number;
  sondertilgungSumme: number;
}

/**
 * Zahlungsstrom vom Ablösestichtag bis zum Ende des Berechnungszeitraums.
 * Monatliche Annuität, Zinsen auf den jeweiligen Saldo, am Ende zusätzlich die
 * dann noch offene Restschuld.
 */
export function buildSchedule(
  restschuld: number,
  nominalzinsPa: number,
  monatsrate: number,
  monate: number,
  sondertilgungProJahr = 0,
): ScheduleResult {
  const i = nominalzinsPa / 12;
  const flows: Flow[] = [];
  let saldo = restschuld;
  let sondertilgungSumme = 0;

  for (let m = 1; m <= monate && saldo > 0.005; m += 1) {
    const zins = saldo * i;
    let tilgung = monatsrate - zins;

    // Rate deckt nicht einmal die Zinsen: reines Zinsdarlehen, keine Tilgung.
    if (tilgung < 0) tilgung = 0;
    if (tilgung > saldo) tilgung = saldo;

    let zahlung = zins + tilgung;
    saldo -= tilgung;

    // Sondertilgung jeweils zum Jahrestag, soweit vereinbart und ungenutzt.
    if (sondertilgungProJahr > 0 && m % 12 === 0 && saldo > 0) {
      const sonder = Math.min(sondertilgungProJahr, saldo);
      zahlung += sonder;
      saldo -= sonder;
      sondertilgungSumme += sonder;
    }

    flows.push({ years: m / 12, amount: zahlung });
  }

  // Am Ende der Zinsbindung wird die verbliebene Restschuld fällig.
  if (saldo > 0.005) {
    const lastYears = flows.length > 0 ? flows[flows.length - 1].years : monate / 12;
    flows.push({ years: lastYears, amount: saldo });
  }

  return { flows, monate, restschuldAmEnde: saldo, sondertilgungSumme };
}

/** Barwert der Zahlungen, laufzeitkongruent abgezinst. */
export function presentValue(flows: Flow[], curve: RateCurve): number {
  return flows.reduce((sum, flow) => {
    const r = rateFor(curve, flow.years);
    return sum + flow.amount / Math.pow(1 + r, flow.years);
  }, 0);
}

/**
 * Frühester Termin, zu dem nach § 489 Abs. 1 Nr. 2 BGB ohne Entschädigung
 * gekündigt werden kann: zehn Jahre nach vollständigem Empfang, dazu die
 * Kündigungsfrist von sechs Monaten.
 */
export function kuendigungsterminNach489(vollauszahlung: Date): Date {
  return addMonths(vollauszahlung, 126);
}

function annuitaet(params: VfeParams): { rate: number; hergeleitet: boolean } {
  if (params.monatsrateEuro && params.monatsrateEuro > 0) {
    return { rate: params.monatsrateEuro, hergeleitet: false };
  }
  // Näherung, wenn die Rate nicht im Dokument steht: Zins plus Tilgung auf die
  // Restschuld. Wird im Bericht als Näherung ausgewiesen.
  const tilgung = params.tilgungssatzProzent ?? 1;
  return {
    rate: (params.restschuldEuro * (params.nominalzinsProzent + tilgung)) / 100 / 12,
    hergeleitet: true,
  };
}

export function parseVfeParams(raw: Record<string, unknown>, context: Record<string, string>) {
  const missing: string[] = [];

  const restschuldEuro = num(raw.restschuldEuro);
  const nominalzinsProzent = num(raw.nominalzinsProzent);
  const zinsbindungEnde = date(raw.zinsbindungEnde);
  const ableoseDatum = date(context.abloesedatum) ?? date(raw.ableoseDatum);
  const vollauszahlungDatum = date(context.vollauszahlung) ?? date(raw.vollauszahlungDatum);

  if (restschuldEuro === null || restschuldEuro <= 0) missing.push('Restschuld zum Ablösestichtag');
  if (nominalzinsProzent === null || nominalzinsProzent <= 0) missing.push('Nominalzins');
  if (!zinsbindungEnde) missing.push('Ende der Zinsbindung');
  if (!ableoseDatum) missing.push('Ablösedatum');

  if (missing.length > 0) return { missing, params: null as VfeParams | null };

  const sondertilgungKontext = context.sondertilgung;
  const params: VfeParams = {
    restschuldEuro: restschuldEuro as number,
    nominalzinsProzent: nominalzinsProzent as number,
    zinsbindungEnde: zinsbindungEnde as Date,
    ableoseDatum: ableoseDatum as Date,
    vollauszahlungDatum,
    monatsrateEuro: num(raw.monatsrateEuro),
    tilgungssatzProzent: num(raw.tilgungssatzProzent),
    sondertilgungProzentProJahr: num(raw.sondertilgungProzentProJahr),
    sondertilgungGenutztEuro: num(raw.sondertilgungGenutztEuro),
    sondertilgungVereinbart:
      sondertilgungKontext === 'Ja, Sondertilgungsrechte vereinbart'
        ? true
        : sondertilgungKontext === 'Nein, keine vereinbart'
          ? false
          : bool(raw.sondertilgungVereinbart),
    bankWiederanlagezinsProzent: num(raw.bankWiederanlagezinsProzent),
    bankVerwaltungskostenEuro: num(raw.bankVerwaltungskostenEuro),
    bankRisikokostenEuro: num(raw.bankRisikokostenEuro),
    bearbeitungsentgeltEuro: num(raw.bearbeitungsentgeltEuro),
    methode: typeof raw.methode === 'string' ? raw.methode : null,
  };

  if (params.zinsbindungEnde <= params.ableoseDatum) {
    return {
      missing: ['Ende der Zinsbindung liegt nicht nach dem Ablösedatum'],
      params: null as VfeParams | null,
    };
  }

  return { missing, params };
}

export const vfeAktivPassiv: Calculator = (raw, ctx): CalculatorOutput => {
  assertUsable(ctx.series);

  const { missing, params } = parseVfeParams(raw, ctx.context);

  const leerErgebnis = (grund: string, fehlend: string[]): CalculatorOutput => ({
    assessable: false,
    notAssessableReason: grund,
    summary: '',
    findings: [],
    compute: {
      calculatorId: 'vfe-aktiv-passiv',
      band: null,
      claimEuro: ctx.claimEuro,
      deviationPercent: null,
      position: null,
      missingParams: fehlend,
      inputs: {},
      steps: [],
      dataSource: { id: ctx.series.id, asOf: '', verified: ctx.series.verified },
      computedAt: new Date().toISOString(),
    },
  });

  if (!params) {
    return leerErgebnis(
      `Für eine Nachrechnung fehlen Angaben, die im Dokument nicht lesbar waren: ${missing.join(', ')}. ` +
        'Ohne diese Werte lässt sich die Entschädigung nicht nachrechnen; geschätzt wird hier nichts.',
      missing,
    );
  }

  const curve = curveFor(ctx.series, params.ableoseDatum);
  const steps: ComputeResult['steps'] = [];

  /* 1 — Berechnungszeitraum, begrenzt durch § 489 Abs. 1 Nr. 2 BGB ───────── */
  const kuendigung489 = params.vollauszahlungDatum
    ? kuendigungsterminNach489(params.vollauszahlungDatum)
    : null;

  let ende = params.zinsbindungEnde;
  let gekapptAuf489 = false;
  if (kuendigung489 && kuendigung489 < params.zinsbindungEnde) {
    ende = kuendigung489;
    gekapptAuf489 = true;
  }

  const monate = monthsBetween(params.ableoseDatum, ende);
  if (monate < 1) {
    return leerErgebnis(
      'Zwischen Ablösestichtag und dem Ende des Berechnungszeitraums liegt weniger als ein Monat. ' +
        'Eine Nachrechnung ergibt hier keinen sinnvollen Wert.',
      [],
    );
  }

  steps.push({
    label: 'Berechnungszeitraum',
    value: `${formatDate(params.ableoseDatum)} bis ${formatDate(ende)} (${monate} Monate)`,
    note: gekapptAuf489
      ? `Begrenzt auf den frühestmöglichen Kündigungstermin nach § 489 Abs. 1 Nr. 2 BGB (${formatDate(kuendigung489 as Date)}), nicht auf das Ende der Zinsbindung am ${formatDate(params.zinsbindungEnde)}.`
      : undefined,
  });

  /* 2 — Zahlungsstrom ohne und mit Sondertilgung ─────────────────────────── */
  const { rate, hergeleitet } = annuitaet(params);
  steps.push({
    label: 'Angesetzte Monatsrate',
    value: formatEuroDe(rate),
    note: hergeleitet
      ? 'Aus Restschuld, Nominalzins und Tilgungssatz hergeleitet, da im Dokument keine Rate genannt war.'
      : 'Wie im Dokument angegeben.',
  });

  const ohneSonder = buildSchedule(
    params.restschuldEuro,
    params.nominalzinsProzent / 100,
    rate,
    monate,
    0,
  );

  // Nicht ausgeübte Sondertilgungsrechte: gerechnet wird so, als wären sie
  // genutzt worden. Das reduziert den Schaden, oft erheblich.
  const sonderProJahr =
    params.sondertilgungVereinbart && params.sondertilgungProzentProJahr
      ? (params.restschuldEuro * params.sondertilgungProzentProJahr) / 100
      : 0;

  const mitSonder =
    sonderProJahr > 0
      ? buildSchedule(params.restschuldEuro, params.nominalzinsProzent / 100, rate, monate, sonderProJahr)
      : ohneSonder;

  /* 3 — Barwerte ─────────────────────────────────────────────────────────── */
  const barwertOhne = presentValue(ohneSonder.flows, curve);
  const barwertMit = presentValue(mitSonder.flows, curve);

  const schadenOhneSonder = Math.max(0, barwertOhne - params.restschuldEuro);
  const schadenMitSonder = Math.max(0, barwertMit - params.restschuldEuro);

  const referenzsatz = rateFor(curve, monate / 12) * 100;

  steps.push(
    {
      label: 'Restschuld zum Ablösestichtag',
      value: formatEuroDe(params.restschuldEuro),
    },
    {
      label: 'Barwert der entgangenen Zahlungen',
      value: formatEuroDe(barwertMit),
      note: `Laufzeitkongruent abgezinst mit der Reihe ${ctx.series.id}, Stand ${curve.month}. Referenzsatz für ${(monate / 12).toFixed(1)} Jahre: ${formatPercentDe(referenzsatz)}.`,
    },
    {
      label: 'Zinsverschlechterungsschaden vor Abzügen',
      value: formatEuroDe(schadenMitSonder),
      note:
        sonderProJahr > 0
          ? `Gerechnet unter Ausübung der vereinbarten Sondertilgungsrechte von ${formatEuroDe(sonderProJahr)} je Jahr.`
          : 'Ohne Sondertilgungsrechte, da keine vereinbart oder keine Höhe im Dokument genannt.',
    },
  );

  /* 4 — Ersparte Kosten als Band ─────────────────────────────────────────── */
  const durchschnittsSaldo = params.restschuldEuro / 2;
  const jahre = monate / 12;

  const verwaltungNiedrig = VERWALTUNGSKOSTEN_BAND[0] * monate;
  const verwaltungHoch = VERWALTUNGSKOSTEN_BAND[1] * monate;
  const risikoNiedrig = durchschnittsSaldo * RISIKOKOSTEN_BAND[0] * jahre;
  const risikoHoch = durchschnittsSaldo * RISIKOKOSTEN_BAND[1] * jahre;

  // Hoher Abzug ergibt den unteren Bandrand und umgekehrt.
  const untergrenze = Math.max(0, schadenMitSonder - verwaltungHoch - risikoHoch);
  const obergrenze = Math.max(0, schadenMitSonder - verwaltungNiedrig - risikoNiedrig);

  steps.push({
    label: 'Ersparte Verwaltungs- und Risikokosten',
    value: `${formatEuroDe(verwaltungNiedrig + risikoNiedrig)} bis ${formatEuroDe(verwaltungHoch + risikoHoch)}`,
    note: `Schätzbänder: ${VERWALTUNGSKOSTEN_BAND[0]} bis ${VERWALTUNGSKOSTEN_BAND[1]} € Verwaltungskosten je Monat, ${(RISIKOKOSTEN_BAND[0] * 100).toFixed(2)} bis ${(RISIKOKOSTEN_BAND[1] * 100).toFixed(2)} % p. a. Risikokosten auf den durchschnittlichen Saldo. Orientierungswerte, keine amtlichen Größen.`,
  });

  const band: [number, number] = [Math.round(untergrenze), Math.round(obergrenze)];

  steps.push({
    label: 'Eigenes Ergebnis',
    value: `${formatEuroDe(band[0])} bis ${formatEuroDe(band[1])}`,
    note: 'Band statt Punktwert, weil die ersparten Kosten Schätzgrößen sind.',
  });

  /* 5 — Vergleich mit der Forderung ──────────────────────────────────────── */
  const claim = ctx.claimEuro;
  let position: ComputeResult['position'] = null;
  let deviationPercent: number | null = null;

  if (claim !== null && claim > 0) {
    if (claim > band[1]) {
      position = 'oberhalb';
      deviationPercent = band[1] > 0 ? ((claim - band[1]) / band[1]) * 100 : 100;
    } else if (claim < band[0]) {
      position = 'unterhalb';
      deviationPercent = band[0] > 0 ? ((band[0] - claim) / band[0]) * 100 : 0;
    } else {
      position = 'innerhalb';
      deviationPercent = 0;
    }
    steps.push({
      label: 'Forderung der Bank',
      value: formatEuroDe(claim),
      note: `Liegt ${position} des errechneten Bandes.`,
    });
  }

  /* 6 — Feststellungen ───────────────────────────────────────────────────── */
  const findings: CalcFinding[] = [];
  const eigeneRechnung = 'Eigene Nachrechnung nach der Aktiv-Passiv-Methode';

  if (!params.methode) {
    findings.push({
      checkId: 'VFE-10',
      severity: 'error',
      observation:
        'In den Unterlagen ist nicht benannt, nach welcher Methode die Entschädigung berechnet wurde. Ohne diese Angabe lässt sich die Rechnung nicht Schritt für Schritt nachprüfen.',
      documentRef: 'Berechnung der Bank, Angabe zur Methode nicht auffindbar',
      action:
        'Bitte teilen Sie mir mit, nach welcher Methode die Vorfälligkeitsentschädigung berechnet wurde, und stellen Sie mir die einzelnen Rechenschritte zur Verfügung.',
    });
  }

  if (params.bankWiederanlagezinsProzent !== null) {
    const abweichung = referenzsatz - params.bankWiederanlagezinsProzent;
    if (Math.abs(abweichung) > WIEDERANLAGE_TOLERANZ_PP) {
      findings.push({
        checkId: 'VFE-11',
        severity: 'warn',
        observation:
          `Die Bank setzt einen Wiederanlagezins von ${formatPercentDe(params.bankWiederanlagezinsProzent)} an. ` +
          `Die laufzeitkongruente Referenz liegt zum Ablösestichtag bei ${formatPercentDe(referenzsatz)} ` +
          `(Reihe ${ctx.series.id}, Stand ${curve.month}). Ein niedriger angesetzter Wiederanlagezins erhöht die Forderung.`,
        documentRef: `Berechnung der Bank, Wiederanlagezins ${formatPercentDe(params.bankWiederanlagezinsProzent)}`,
        action:
          'Bitte erläutern Sie mir, auf welche Zeitreihe und welchen Stichtag sich der angesetzte Wiederanlagezins stützt.',
      });
    }
  } else {
    findings.push({
      checkId: 'VFE-11',
      severity: 'warn',
      observation:
        'In den Unterlagen ist kein Wiederanlagezins ausgewiesen. Er ist die zentrale Stellgröße der Berechnung; ohne ihn ist das Ergebnis nicht nachprüfbar.',
      documentRef: 'Berechnung der Bank, kein Wiederanlagezins ausgewiesen',
      action:
        'Bitte nennen Sie mir den angesetzten Wiederanlagezins und die Zeitreihe, aus der er stammt.',
    });
  }

  if (params.bankVerwaltungskostenEuro === null || params.bankVerwaltungskostenEuro <= 0) {
    findings.push({
      checkId: 'VFE-12',
      severity: 'warn',
      observation:
        'Ersparte Verwaltungskosten sind in der Berechnung nicht oder mit null angesetzt. Durch die vorzeitige Ablösung entfällt der Verwaltungsaufwand für die Restlaufzeit; dieser Betrag mindert den Schaden.',
      documentRef: 'Berechnung der Bank, Position ersparte Verwaltungskosten',
      action:
        'Bitte weisen Sie die ersparten Verwaltungskosten für die Restlaufzeit gesondert aus und ziehen Sie sie vom Schaden ab.',
      euroImpact: [Math.round(verwaltungNiedrig), Math.round(verwaltungHoch)],
    });
  }

  if (params.bankRisikokostenEuro === null || params.bankRisikokostenEuro <= 0) {
    findings.push({
      checkId: 'VFE-13',
      severity: 'warn',
      observation:
        'Ersparte Risikokosten sind in der Berechnung nicht oder mit null angesetzt. Mit der Ablösung entfällt das Ausfallrisiko für die Restlaufzeit.',
      documentRef: 'Berechnung der Bank, Position ersparte Risikokosten',
      action:
        'Bitte weisen Sie die ersparten Risikokosten für die Restlaufzeit gesondert aus und ziehen Sie sie vom Schaden ab.',
      euroImpact: [Math.round(risikoNiedrig), Math.round(risikoHoch)],
    });
  }

  if (sonderProJahr > 0) {
    const differenz = schadenOhneSonder - schadenMitSonder;
    if (differenz > 1) {
      findings.push({
        checkId: 'VFE-14',
        severity: 'error',
        observation:
          `Der Vertrag sieht Sondertilgungsrechte von ${formatEuroDe(sonderProJahr)} je Jahr vor. ` +
          'Bei der Berechnung ist zu unterstellen, dass diese Rechte ausgeübt worden wären — die Bank hätte dann weniger Zinsen erhalten. ' +
          `Die eigene Nachrechnung mit ausgeübten Sondertilgungen liegt um ${formatEuroDe(differenz)} niedriger als ohne.`,
        documentRef: `Darlehensvertrag, Sondertilgungsrecht ${params.sondertilgungProzentProJahr} % je Jahr`,
        action:
          'Bitte legen Sie dar, ob und wie die vereinbarten Sondertilgungsrechte in der Berechnung berücksichtigt wurden, und stellen Sie die Rechnung andernfalls unter deren Ausübung neu auf.',
        euroImpact: [Math.round(differenz * 0.8), Math.round(differenz)],
      });
    }
  }

  if (gekapptAuf489 && kuendigung489) {
    findings.push({
      checkId: 'VFE-15',
      severity: 'error',
      observation:
        `Nach § 489 Abs. 1 Nr. 2 BGB kann das Darlehen zehn Jahre nach vollständigem Empfang mit einer Frist von sechs Monaten ohne Entschädigung gekündigt werden; das ist hier der ${formatDate(kuendigung489)}. ` +
        `Die Zinsbindung läuft bis ${formatDate(params.zinsbindungEnde)}. Für die Zeit nach dem Kündigungstermin entsteht der Bank kein Zinsschaden mehr, weshalb der Berechnungszeitraum an diesem Termin endet.`,
      documentRef: `Darlehensvertrag, Vollauszahlung ${params.vollauszahlungDatum ? formatDate(params.vollauszahlungDatum) : 'unbekannt'}`,
      action:
        'Bitte teilen Sie mir mit, bis zu welchem Termin die Entschädigung berechnet wurde, und begrenzen Sie den Zeitraum andernfalls auf den frühestmöglichen Kündigungstermin nach § 489 Abs. 1 Nr. 2 BGB.',
    });
  }

  if (params.bearbeitungsentgeltEuro !== null && params.bearbeitungsentgeltEuro > 0) {
    findings.push({
      checkId: 'VFE-16',
      severity: 'warn',
      observation:
        `Für die Erstellung der Berechnung ist ein Entgelt von ${formatEuroDe(params.bearbeitungsentgeltEuro)} gesondert in Rechnung gestellt. Ob ein solches Entgelt neben der Entschädigung verlangt werden darf, ist eine Rechtsfrage.`,
      documentRef: `Berechnung der Bank, Bearbeitungsentgelt ${formatEuroDe(params.bearbeitungsentgeltEuro)}`,
      action:
        'Bitte teilen Sie mir mit, auf welcher vertraglichen Grundlage das gesondert berechnete Bearbeitungsentgelt erhoben wird.',
      euroImpact: [params.bearbeitungsentgeltEuro, params.bearbeitungsentgeltEuro],
    });
  }

  const fehlendeRechenwerte = [
    params.bankWiederanlagezinsProzent,
    params.bankVerwaltungskostenEuro,
    params.bankRisikokostenEuro,
  ].filter((v) => v === null).length;

  if (fehlendeRechenwerte >= 2) {
    findings.push({
      checkId: 'VFE-17',
      severity: 'warn',
      observation:
        'Die Unterlagen enthalten die wesentlichen Rechengrößen nicht vollständig. Damit ist die Berechnung von außen nicht Schritt für Schritt nachprüfbar.',
      documentRef: 'Berechnung der Bank, unvollständige Angabe der Rechengrößen',
      action:
        'Bitte stellen Sie mir die vollständige Berechnung mit Wiederanlagezinssätzen je Laufzeit, ersparten Verwaltungs- und Risikokosten sowie dem zugrunde gelegten Zahlungsstrom zur Verfügung.',
    });
  }

  if (claim !== null && position === 'oberhalb' && (deviationPercent ?? 0) > ctx.tolerancePercent) {
    findings.push({
      checkId: 'VFE-18',
      severity: 'error',
      observation:
        `Die Bank fordert ${formatEuroDe(claim)}. Die eigene Nachrechnung nach der Aktiv-Passiv-Methode ergibt ein Band von ${formatEuroDe(band[0])} bis ${formatEuroDe(band[1])}. ` +
        `Die Forderung liegt um ${(deviationPercent ?? 0).toFixed(1)} Prozent über dem oberen Rand dieses Bandes.`,
      documentRef: eigeneRechnung,
      action:
        'Bitte legen Sie mir die Berechnung im Einzelnen offen, damit ich die Abweichung zu meiner eigenen Nachrechnung nachvollziehen kann.',
      euroImpact: [Math.round(claim - band[1]), Math.round(claim - band[0])],
    });
  }

  /* 7 — Fristen und Zusammenhang ─────────────────────────────────────────── */
  if (ctx.context.anlass === 'Bereits gezahlt') {
    const jahresende = new Date(Date.UTC(params.ableoseDatum.getUTCFullYear(), 11, 31));
    const verjaehrung = new Date(Date.UTC(jahresende.getUTCFullYear() + 3, 11, 31));
    findings.push({
      checkId: 'VFE-20',
      severity: 'warn',
      observation:
        `Die Entschädigung ist bereits gezahlt. Für Rückforderungsansprüche gilt die regelmäßige Verjährung von drei Jahren, gerechnet ab dem Schluss des Jahres, in dem der Anspruch entstanden ist und Kenntnis bestand. ` +
        `Ausgehend vom Ablösedatum ${formatDate(params.ableoseDatum)} wäre das der ${formatDate(verjaehrung)}. Ob dieser Zeitpunkt im Einzelfall gilt, hängt vom Kenntnisstand ab und gehört anwaltlich geklärt.`,
      documentRef: `Ablösedatum ${formatDate(params.ableoseDatum)}`,
      action:
        'Lassen Sie vor dem genannten Datum anwaltlich prüfen, ob eine Rückforderung in Betracht kommt.',
    });
  }

  if (kuendigung489) {
    const heute = new Date();
    const offen = kuendigung489 > heute;
    findings.push({
      checkId: 'VFE-21',
      severity: 'info',
      observation: offen
        ? `Nach § 489 Abs. 1 Nr. 2 BGB kann das Darlehen ab dem ${formatDate(addMonths(params.vollauszahlungDatum as Date, 120))} mit sechsmonatiger Frist gekündigt werden; wirksam wird die Kündigung damit frühestens zum ${formatDate(kuendigung489)}. Bis dahin fällt für eine Ablösung eine Entschädigung an, danach nicht mehr.`
        : `Der Termin nach § 489 Abs. 1 Nr. 2 BGB war am ${formatDate(kuendigung489)} erreicht. Ab diesem Zeitpunkt kann ohne Entschädigung gekündigt werden.`,
      documentRef: `Vollauszahlung ${formatDate(params.vollauszahlungDatum as Date)}`,
      action: offen
        ? 'Prüfen Sie, ob ein Abwarten bis zum genannten Termin für Sie günstiger ist als eine Ablösung mit Entschädigung.'
        : 'Bitte bestätigen Sie mir, dass eine Kündigung nach § 489 Abs. 1 Nr. 2 BGB ohne Vorfälligkeitsentschädigung möglich ist.',
    });
  }

  if (ctx.context.anlass === 'Umschuldung') {
    findings.push({
      checkId: 'VFE-31',
      severity: 'info',
      observation:
        `Bei einer Umschuldung ist die Entschädigung gegen die Zinsersparnis der neuen Finanzierung zu stellen. Als grobe Orientierung: Der eigenen Nachrechnung zufolge liegt die Entschädigung zwischen ${formatEuroDe(band[0])} und ${formatEuroDe(band[1])}; ob sich die Umschuldung lohnt, hängt vom Zinssatz des neuen Darlehens und der verbleibenden Laufzeit ab. Das ist ausdrücklich eine Orientierung und keine Finanzierungsberatung.`,
      documentRef: eigeneRechnung,
      action:
        'Lassen Sie sich vom neuen Darlehensgeber die Zinsersparnis über die verbleibende Laufzeit beziffern und stellen Sie sie der Entschädigung gegenüber.',
    });
  }

  if (ctx.context.darlehensart === 'Gewerbliches Darlehen') {
    // Bewusst kein Finding: Die Verbraucherschutzvorschriften greifen hier
    // nicht, der Katalog ist auf Verbraucherdarlehen zugeschnitten.
    steps.push({
      label: 'Hinweis zur Darlehensart',
      value: 'Gewerbliches Darlehen',
      note: 'Die verbraucherschützenden Vorschriften der §§ 489, 502 BGB gelten hier nicht oder nur eingeschränkt. Die Nachrechnung bleibt gültig, die rechtlichen Prüfpunkte des Katalogs überwiegend nicht.',
    });
  }

  const summary =
    `Darlehen mit ${formatPercentDe(params.nominalzinsProzent)} Nominalzins, Restschuld ${formatEuroDe(params.restschuldEuro)} zum Ablösestichtag ${formatDate(params.ableoseDatum)}. ` +
    `Berechnungszeitraum ${monate} Monate bis ${formatDate(ende)}. Nachgerechnet nach der Aktiv-Passiv-Methode.`;

  return {
    assessable: true,
    summary,
    findings,
    compute: {
      calculatorId: 'vfe-aktiv-passiv',
      band,
      claimEuro: claim,
      deviationPercent,
      position,
      missingParams: [],
      inputs: {
        restschuldEuro: params.restschuldEuro,
        nominalzinsProzent: params.nominalzinsProzent,
        zinsbindungEnde: formatDate(params.zinsbindungEnde),
        ableoseDatum: formatDate(params.ableoseDatum),
        vollauszahlungDatum: params.vollauszahlungDatum ? formatDate(params.vollauszahlungDatum) : null,
        monatsrateEuro: Math.round(rate * 100) / 100,
        monatsrateHergeleitet: hergeleitet,
        sondertilgungProJahrEuro: Math.round(sonderProJahr * 100) / 100,
        berechnungsmonate: monate,
        gekapptAuf489,
        bankWiederanlagezinsProzent: params.bankWiederanlagezinsProzent,
        bankVerwaltungskostenEuro: params.bankVerwaltungskostenEuro,
        bankRisikokostenEuro: params.bankRisikokostenEuro,
        bearbeitungsentgeltEuro: params.bearbeitungsentgeltEuro,
        methode: params.methode,
        referenzsatzProzent: Math.round(referenzsatz * 1000) / 1000,
      },
      steps,
      dataSource: { id: ctx.series.id, asOf: curve.month, verified: ctx.series.verified },
      computedAt: new Date().toISOString(),
    },
  };
};

export default vfeAktivPassiv;
