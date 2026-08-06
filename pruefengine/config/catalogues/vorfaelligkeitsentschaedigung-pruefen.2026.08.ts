import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Vorfälligkeitsentschädigung — Version 2026.08.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE, KEINE GEPRÜFTE RECHTSQUELLE.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Diese Nische berührt Bankrecht, Beträge im fünfstelligen Bereich und die
 * Grenze zum RDG. Vor dem Livegang gehört jeder Punkt mit `reviewPflicht`
 * über den Tisch einer Fachanwältin oder eines Fachanwalts für Bank- und
 * Kapitalmarktrecht. Bei der Handwerkerrechnung war ein Review Kür; hier ist
 * es Pflicht, und `check:niches` blockiert den Deploy, solange der Blocker in
 * der Nischen-Config steht.
 *
 * Die Liste der zu bestätigenden Punkte steht zusätzlich in
 * docs/vfe-anwaltlicher-review.md.
 *
 * Formulierungsgrenze dieser Nische, strenger als sonst: Der Bericht rechnet
 * nach und stellt Fragen. Er beurteilt nicht. Erlaubt ist „Ihre Bank setzt
 * einen Wiederanlagezins von X an; die laufzeitkongruente Referenz liegt zum
 * Stichtag bei Y." Verboten ist „Die Forderung ist unzulässig", „Sie müssen
 * nicht zahlen", „Die Bank hat falsch gerechnet". Erzwungen zusätzlich über
 * `legal.forbiddenTerms` in der Nischen-Config.
 */

const CAT_ANSPRUCH = 'Anspruchsgrundlage';
const CAT_RECHENWERK = 'Rechenwerk';
const CAT_FRISTEN = 'Fristen und Verfahren';
const CAT_ZUSAMMENHANG = 'Zusammenhang';

export const catalogue: Catalogue = {
  version: '2026.08',
  published: true,
  checks: [
    /* ── A — Anspruchsgrundlage. Der Euro-Hebel. ────────────────────────── */
    {
      id: 'VFE-01',
      label: 'Pflichtangaben im Darlehensvertrag',
      severity: 'error',
      basis:
        '§ 502 Abs. 2 BGB — ANWALTLICH ZU BESTÄTIGEN: Reichweite der Angaben zu Laufzeit, Kündigungsrecht und Berechnungsmethode sowie die Folge für den Anspruch',
      category: CAT_ANSPRUCH,
      instruction:
        'Prüfe, ob der Darlehensvertrag Angaben zur Laufzeit, zum Kündigungsrecht des Darlehensnehmers und zur Berechnung der Vorfälligkeitsentschädigung enthält. Sind sie unzureichend, kann der Anspruch der Bank entfallen. Formuliere das Ergebnis ausschließlich als Prüfhinweis mit Empfehlung zur anwaltlichen Klärung, niemals als Feststellung, dass kein Anspruch besteht. Dies ist der Einzelpunkt mit dem größten wirtschaftlichen Gewicht.',
    },
    {
      id: 'VFE-02',
      label: 'Gesetzliche Höchstgrenze der Entschädigung',
      severity: 'warn',
      basis:
        '§ 502 Abs. 3 BGB — ANWALTLICH ZU BESTÄTIGEN, VOR BESTÄTIGUNG NICHT AKTIV: Die Deckelung gilt für Allgemein-Verbraucherdarlehen; für Immobiliar-Verbraucherdarlehensverträge ist die Fallunterscheidung gesondert zu klären',
      category: CAT_ANSPRUCH,
      instruction:
        'Nicht aktiv. Der Prüfpunkt steht im Katalog, damit die Fallunterscheidung zwischen Allgemein- und Immobiliar-Verbraucherdarlehen sichtbar offen ist. Er wird erst nach anwaltlicher Bestätigung ausgewertet; bis dahin erzeugt er keine Feststellung.',
    },
    {
      id: 'VFE-03',
      label: 'Zulässigkeit dem Grunde nach',
      severity: 'warn',
      basis:
        '§§ 490, 500, 502 BGB — ANWALTLICH ZU BESTÄTIGEN: Fallgruppen, in denen eine Entschädigung verlangt werden darf',
      category: CAT_ANSPRUCH,
      instruction:
        'Prüfe, ob nach den Unterlagen überhaupt ein Fall vorliegt, in dem eine Entschädigung verlangt werden darf, oder ob ein gesetzliches oder vertragliches Kündigungsrecht besteht. Ergebnis nur als Prüfhinweis mit Verweis auf anwaltliche Klärung.',
    },

    /* ── B — Rechenwerk. Hier rechnet der Code, nicht das Modell. ───────── */
    {
      id: 'VFE-10',
      label: 'Berechnungsmethode benannt',
      severity: 'error',
      basis: 'Nachprüfbarkeit der Berechnung; Aktiv-Passiv- oder Aktiv-Aktiv-Methode',
      category: CAT_RECHENWERK,
      instruction:
        'Stelle fest, ob in den Unterlagen benannt ist, nach welcher Methode gerechnet wurde. Fehlt die Angabe, ist die Rechnung von außen nicht nachprüfbar.',
    },
    {
      id: 'VFE-11',
      label: 'Angesetzter Wiederanlagezins',
      severity: 'warn',
      basis:
        'Laufzeitkongruente Wiederanlage in Hypothekenpfandbriefen; Referenzreihe siehe lib/data/zinsreihe.ts — KENNUNG VOR LIVEGANG ZU VERIFIZIEREN',
      category: CAT_RECHENWERK,
      instruction:
        'Vergleiche den von der Bank angesetzten Wiederanlagezins mit der laufzeitkongruenten Referenz zum Ablösestichtag. Benenne beide Werte und die Zeitreihe. Beschreibe die Wirkungsrichtung sachlich: Ein niedriger angesetzter Wiederanlagezins erhöht die Forderung.',
    },
    {
      id: 'VFE-12',
      label: 'Ersparte Verwaltungskosten angesetzt',
      severity: 'warn',
      basis:
        'Schadensmindernde Anrechnung ersparter Aufwendungen; Referenzband 4 bis 8 Euro je Monat und Darlehen (Orientierungswert, keine amtliche Größe) — BAND ANWALTLICH ZU BESTÄTIGEN',
      category: CAT_RECHENWERK,
      instruction:
        'Prüfe, ob ersparte Verwaltungskosten für die Restlaufzeit angesetzt sind und ob die Höhe im Referenzband liegt. Ein Ansatz von null ist festzustellen.',
      euroImpact: [0, 3000],
    },
    {
      id: 'VFE-13',
      label: 'Ersparte Risikokosten angesetzt',
      severity: 'warn',
      basis:
        'Schadensmindernde Anrechnung des entfallenden Ausfallrisikos; Referenzband 0,04 bis 0,10 Prozent p. a. auf den durchschnittlichen Saldo (Orientierungswert) — BAND ANWALTLICH ZU BESTÄTIGEN',
      category: CAT_RECHENWERK,
      instruction:
        'Prüfe, ob ersparte Risikokosten für die Restlaufzeit angesetzt sind und ob die Höhe im Referenzband liegt.',
      euroImpact: [0, 5000],
    },
    {
      id: 'VFE-14',
      label: 'Nicht ausgeübte Sondertilgungsrechte berücksichtigt',
      severity: 'error',
      basis:
        'Vertraglich vereinbarte Sondertilgungsrechte sind bei der Schadensberechnung als ausgeübt zu unterstellen — ANWALTLICH ZU BESTÄTIGEN, insbesondere für den Fall bereits teilweise genutzter Rechte',
      category: CAT_RECHENWERK,
      instruction:
        'Prüfe, ob vereinbarte Sondertilgungsrechte in der Berechnung berücksichtigt sind. Rechne den Zahlungsstrom so, als wären sie ausgeübt worden, und benenne die Differenz. Rechnerisch der größte und zugleich häufigste Fehler.',
      euroImpact: [0, 40000],
    },
    {
      id: 'VFE-15',
      label: 'Berechnungszeitraum über den Kündigungstermin hinaus',
      severity: 'error',
      basis:
        '§ 489 Abs. 1 Nr. 2 BGB — zehn Jahre nach vollständigem Empfang, Kündigungsfrist sechs Monate',
      category: CAT_RECHENWERK,
      instruction:
        'Prüfe, ob innerhalb der Restlaufzeit ein ordentlicher Kündigungstermin liegt. Ist das der Fall, endet der Berechnungszeitraum dort. Benenne den konkreten Termin und die Folge für die Berechnung.',
      euroImpact: [0, 50000],
    },
    {
      id: 'VFE-16',
      label: 'Gesondertes Bearbeitungsentgelt für die Berechnung',
      severity: 'warn',
      basis:
        'Entgelt für die Erstellung der Vorfälligkeitsberechnung — ANWALTLICH ZU BESTÄTIGEN, ob und in welcher Höhe zulässig',
      category: CAT_RECHENWERK,
      instruction:
        'Stelle fest, wenn für die Erstellung der Berechnung ein Entgelt gesondert in Rechnung gestellt wird. Ausschließlich als Prüfhinweis mit Verweis auf anwaltliche Klärung, keine Aussage zur Zulässigkeit.',
      euroImpact: [0, 500],
    },
    {
      id: 'VFE-17',
      label: 'Rechnerische Nachvollziehbarkeit',
      severity: 'warn',
      basis: 'Darlegung der Rechenschritte als Voraussetzung jeder Nachprüfung',
      category: CAT_RECHENWERK,
      instruction:
        'Prüfe, ob die Rechenschritte so dargestellt sind, dass sie von außen nachvollzogen werden können: Zahlungsstrom, Wiederanlagesätze je Laufzeit, angesetzte Ersparnisse. Fehlt das, ist es ein eigener Fund und begründet die Nachforderung der Details.',
    },
    {
      id: 'VFE-18',
      label: 'Abgleich der Forderung mit dem eigenen Band',
      severity: 'error',
      basis:
        'Eigene Nachrechnung nach der Aktiv-Passiv-Methode, laufzeitkongruent abgezinst (lib/calculators/vfe-aktiv-passiv.ts)',
      category: CAT_RECHENWERK,
      instruction:
        'Kernaussage des Berichts. Stelle die geforderte Entschädigung dem selbst errechneten Band gegenüber und benenne die Abweichung. Sage nicht, dass die Forderung falsch ist — sage, wie hoch sie ist, wie hoch die eigene Nachrechnung ausfällt und worin die Differenz besteht.',
      euroImpact: [0, 60000],
    },

    /* ── C — Fristen und Verfahren ──────────────────────────────────────── */
    {
      id: 'VFE-20',
      label: 'Bereits gezahlt — Verjährung einer Rückforderung',
      severity: 'warn',
      basis:
        '§§ 195, 199 BGB — drei Jahre ab Schluss des Jahres, in dem der Anspruch entstanden ist und Kenntnis bestand; ANWALTLICH ZU BESTÄTIGEN, wann Kenntnis im Sinne des § 199 BGB vorliegt',
      category: CAT_FRISTEN,
      instruction:
        'Ist die Entschädigung bereits gezahlt, nenne das konkrete Datum, zu dem eine Rückforderung verjährt sein könnte, und empfiehl anwaltliche Klärung. Nenne die Frist als Orientierung, nicht als feststehendes Ergebnis.',
    },
    {
      id: 'VFE-21',
      label: 'Kündigungstermin nach § 489 BGB',
      severity: 'info',
      basis: '§ 489 Abs. 1 Nr. 2 BGB',
      category: CAT_FRISTEN,
      instruction:
        'Berechne aus dem Datum der Vollauszahlung den Zeitpunkt, ab dem ohne Entschädigung gekündigt werden kann, zuzüglich der sechsmonatigen Frist. Liegt der Termin nahe, weise darauf hin, dass Abwarten günstiger sein kann als jede Verhandlung.',
    },
    {
      id: 'VFE-22',
      label: 'Nachforderung der Berechnungsgrundlagen',
      severity: 'info',
      basis: 'Nachvollziehbarkeit der Forderung gegenüber dem Verbraucher',
      category: CAT_FRISTEN,
      instruction:
        'Formuliere die Fragen an die Bank und die Nachforderung der Berechnungsdetails. Keine Klageempfehlung, keine Fristsetzung mit Rechtsfolgenandrohung.',
    },

    /* ── D — Zusammenhang ───────────────────────────────────────────────── */
    {
      id: 'VFE-30',
      label: 'Steuerliche Behandlung bei vermieteter Immobilie',
      severity: 'info',
      basis: 'Steuerliche Einordnung der Entschädigung — nur Hinweis, keine Berechnung',
      category: CAT_ZUSAMMENHANG,
      instruction:
        'Beim Verkauf einer vermieteten Immobilie kann die Entschädigung steuerlich relevant sein. Ausschließlich als Prüfhinweis an die Steuerberatung. Keine eigene Berechnung, keine Aussage zur Abzugsfähigkeit.',
    },
    {
      id: 'VFE-31',
      label: 'Wirtschaftlichkeit der Umschuldung',
      severity: 'info',
      basis: 'Gegenüberstellung von Entschädigung und Zinsersparnis — ausdrücklich als grobe Orientierung',
      category: CAT_ZUSAMMENHANG,
      instruction:
        'Nur wenn als Anlass „Umschuldung" gewählt wurde. Stelle die Entschädigung der Zinsersparnis gegenüber und kennzeichne das ausdrücklich als grobe Orientierung, nicht als Finanzierungsberatung.',
    },
  ],
};

/**
 * Prüfpunkte, deren `basis` vor dem Livegang anwaltlich zu bestätigen ist.
 * Wird von check:niches und docs/vfe-anwaltlicher-review.md gelesen.
 */
export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH'))
  .map((c) => c.id);
