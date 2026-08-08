import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Heiz- und Nebenkostenabrechnung (Mietverhältnis) — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Nicht zu verwechseln mit der Hausgeldabrechnung: Hier geht es um das
 * Verhältnis Mieter zu Vermieter, dort um Eigentümer zu Gemeinschaft. Andere
 * Vorschriften, andere Fristen, andere Verteilerschlüssel. Die beiden
 * Kataloge dürfen nicht zusammenwachsen.
 *
 * Der wirtschaftlich stärkste Punkt ist die Abrechnungsfrist aus § 556 Abs. 3
 * BGB: Nach Ablauf von zwölf Monaten kann der Vermieter eine Nachforderung
 * grundsätzlich nicht mehr geltend machen. Das ist eine Ausschlussfrist, und
 * genau deshalb muss der Bericht sie nennen, ohne daraus eine Handlungs-
 * anweisung zu machen. Ob die Ausnahme greift, dass der Vermieter die
 * Verspätung nicht zu vertreten hat, ist eine Rechtsfrage.
 *
 * Der zweite Hebel ist § 12 HeizkostenV: Wird nicht verbrauchsabhängig
 * abgerechnet, besteht ein Kürzungsrecht von 15 Prozent. Auch hier nennt der
 * Bericht den Sachverhalt und rechnet den Betrag aus, spricht aber kein Recht
 * zu.
 */

const CAT_FRIST = 'Fristen';
const CAT_FORM = 'Form und Nachvollziehbarkeit';
const CAT_UMLAGE = 'Umlagefähigkeit';
const CAT_SCHLUESSEL = 'Verteilerschlüssel';
const CAT_HEIZ = 'Heiz- und Warmwasserkosten';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Fristen. Der größte Einzelhebel. ─────────────────────────────── */
    {
      id: 'NKA-01',
      label: 'Abrechnungsfrist von zwölf Monaten',
      severity: 'error',
      basis:
        '§ 556 Abs. 3 Satz 2 und 3 BGB — ANWALTLICH ZU BESTÄTIGEN: Formulierung der Feststellung und Umgang mit der Ausnahme, dass der Vermieter die Verspätung nicht zu vertreten hat',
      category: CAT_FRIST,
      instruction:
        'Vergleiche das Ende des Abrechnungszeitraums mit dem Zugangsdatum der Abrechnung, das der Auftraggeber angegeben hat. Liegen mehr als zwölf Monate dazwischen, stelle das mit beiden Daten und der Anzahl der Tage fest. Formuliere ausschließlich als Prüfhinweis mit Verweis auf anwaltliche Klärung, niemals als Aussage, die Forderung sei ausgeschlossen.',
      euroImpact: [50, 3000],
    },
    {
      id: 'NKA-02',
      label: 'Abrechnungszeitraum von zwölf Monaten',
      severity: 'warn',
      basis: '§ 556 Abs. 3 Satz 1 BGB, jährliche Abrechnung',
      category: CAT_FRIST,
      instruction:
        'Prüfe, ob der Abrechnungszeitraum zwölf Monate umfasst. Ein längerer Zeitraum ist eine Feststellung; ein kürzerer nur dann, wenn das Mietverhältnis nicht unterjährig begonnen oder geendet hat.',
      euroImpact: [0, 500],
    },
    {
      id: 'NKA-03',
      label: 'Zeitanteilige Abrechnung bei unterjährigem Einzug',
      severity: 'warn',
      basis: '§ 556a Abs. 1 BGB, Umlage nach dem Anteil der Wohnfläche und der Mietzeit',
      category: CAT_FRIST,
      instruction:
        'Nur prüfen, wenn der Auftraggeber einen Ein- oder Auszug im Abrechnungszeitraum angegeben hat. Prüfe, ob die zeitanteilige Aufteilung erkennbar ist und ob die Anzahl der Monate stimmt.',
      euroImpact: [50, 1500],
    },

    /* ── Form ─────────────────────────────────────────────────────────── */
    {
      id: 'NKA-10',
      label: 'Zusammenstellung der Gesamtkosten',
      severity: 'error',
      basis: '§ 259 BGB, Mindestanforderungen an eine Betriebskostenabrechnung',
      category: CAT_FORM,
      instruction:
        'Eine Abrechnung braucht die Zusammenstellung der Gesamtkosten, die Angabe des Verteilerschlüssels, die Berechnung des Anteils und den Abzug der Vorauszahlungen. Prüfe jeden dieser vier Bestandteile einzeln und nenne, welcher fehlt.',
      euroImpact: [0, 0],
    },
    {
      id: 'NKA-11',
      label: 'Vorauszahlungen abgezogen',
      severity: 'error',
      basis: '§ 556 Abs. 3 BGB, Verrechnung der geleisteten Vorauszahlungen',
      category: CAT_FORM,
      instruction:
        'Vergleiche die vom Auftraggeber angegebene Summe der geleisteten Vorauszahlungen mit dem in der Abrechnung abgezogenen Betrag. Beziffere jede Differenz.',
      euroImpact: [50, 2000],
    },
    {
      id: 'NKA-12',
      label: 'Rechnerische Richtigkeit',
      severity: 'error',
      basis: 'Addition der Einzelpositionen gegen die Endsumme',
      category: CAT_FORM,
      instruction:
        'Addiere die auf die Wohnung entfallenden Positionen und vergleiche mit der ausgewiesenen Summe. Weicht die vom Auftraggeber genannte Endsumme von der gelesenen ab, gehe von einem Lesefehler auf deiner Seite aus und sage das ausdrücklich.',
      euroImpact: [20, 800],
    },
    {
      id: 'NKA-13',
      label: 'Belegeinsicht angeboten',
      severity: 'info',
      basis: '§ 259 BGB, Recht auf Einsicht in die Abrechnungsunterlagen',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob die Abrechnung auf die Möglichkeit der Belegeinsicht hinweist. Fehlt der Hinweis, ist das ein Hinweis und keine schwere Feststellung.',
      euroImpact: [0, 0],
    },

    /* ── Umlagefähigkeit ──────────────────────────────────────────────── */
    {
      id: 'NKA-20',
      label: 'Umlagevereinbarung im Mietvertrag',
      severity: 'error',
      basis: '§ 556 Abs. 1 BGB, Betriebskosten nur bei Vereinbarung umlagefähig',
      category: CAT_UMLAGE,
      instruction:
        'Nur prüfen, wenn der Mietvertrag mit hochgeladen wurde. Vergleiche die abgerechneten Kostenarten mit den im Vertrag vereinbarten. Nenne jede abgerechnete Art, die im Vertrag nicht auftaucht.',
      euroImpact: [50, 1500],
    },
    {
      id: 'NKA-21',
      label: 'Positionen außerhalb des Katalogs der BetrKV',
      severity: 'error',
      basis: '§ 2 BetrKV, abschließender Katalog der umlagefähigen Betriebskosten',
      category: CAT_UMLAGE,
      instruction:
        'Gleiche jede abgerechnete Kostenart mit dem Katalog des § 2 BetrKV ab. Nenne jede Position, die dort nicht vorkommt, wörtlich. Häufige Fälle: Reparaturen, Instandhaltung, Verwaltung, Kontoführungsgebühren, Mietausfallwagnis.',
      euroImpact: [50, 1200],
    },
    {
      id: 'NKA-22',
      label: 'Verwaltungskosten umgelegt',
      severity: 'error',
      basis: '§ 1 Abs. 2 Nr. 1 BetrKV, Verwaltungskosten sind keine Betriebskosten',
      category: CAT_UMLAGE,
      instruction:
        'Suche nach Positionen wie „Verwaltung", „Verwaltergebühr", „Hausverwaltung". In der Wohnraummiete sind sie nicht umlagefähig. Nenne die Position wörtlich und beziffere den auf die Wohnung entfallenden Anteil.',
      euroImpact: [50, 600],
    },
    {
      id: 'NKA-23',
      label: 'Instandhaltung und Reparatur umgelegt',
      severity: 'error',
      basis: '§ 1 Abs. 2 Nr. 2 BetrKV, Instandhaltungs- und Instandsetzungskosten sind keine Betriebskosten',
      category: CAT_UMLAGE,
      instruction:
        'Suche nach Positionen mit Bezeichnungen wie „Reparatur", „Instandsetzung", „Erneuerung", „Austausch". Wartung ist umlagefähig, Reparatur nicht. Nenne die Position wörtlich und beziffere den Anteil.',
      euroImpact: [50, 1500],
    },
    {
      id: 'NKA-24',
      label: 'Wirtschaftlichkeit einzelner Positionen',
      severity: 'info',
      basis:
        '§ 556 Abs. 3 Satz 1 BGB, Grundsatz der Wirtschaftlichkeit — ANWALTLICH ZU BESTÄTIGEN: Ob und wie eine Abweichung vom örtlichen Rahmen im Bericht benannt werden darf',
      category: CAT_UMLAGE,
      instruction:
        'Nenne Positionen, deren Betrag je Quadratmeter deutlich außerhalb üblicher Spannen liegt, mit dem Wert je Quadratmeter. Formuliere ausschließlich als Nachfrage nach der Zusammensetzung, ohne Bewertung.',
      euroImpact: [0, 800],
    },

    /* ── Verteilerschlüssel ───────────────────────────────────────────── */
    {
      id: 'NKA-30',
      label: 'Schlüssel genannt und gleichbleibend',
      severity: 'error',
      basis: '§ 556a Abs. 1 BGB, Umlage nach Wohnfläche, soweit nichts anderes vereinbart ist',
      category: CAT_SCHLUESSEL,
      instruction:
        'Prüfe, ob zu jeder Kostenart der Verteilerschlüssel angegeben ist und ob er dem Mietvertrag entspricht, sofern dieser vorliegt. Ein Wechsel des Schlüssels gegenüber dem Vorjahr ist eine Feststellung, wenn er nicht begründet wird.',
      euroImpact: [50, 1000],
    },
    {
      id: 'NKA-31',
      label: 'Wohnfläche stimmt mit dem Mietvertrag überein',
      severity: 'error',
      basis: '§ 556a Abs. 1 BGB in Verbindung mit der im Mietvertrag genannten Fläche',
      category: CAT_SCHLUESSEL,
      instruction:
        'Vergleiche die in der Abrechnung angesetzte Wohnfläche mit der vom Auftraggeber angegebenen Fläche aus dem Mietvertrag. Nenne beide Zahlen und den prozentualen Unterschied.',
      euroImpact: [30, 900],
    },
    {
      id: 'NKA-32',
      label: 'Gesamtfläche plausibel',
      severity: 'warn',
      basis: 'Rechnerische Kontrolle, Anteil der eigenen Fläche an der Gesamtfläche',
      category: CAT_SCHLUESSEL,
      instruction:
        'Prüfe, ob die Gesamtfläche des Hauses genannt ist und ob der eigene Anteil damit rechnerisch aufgeht. Fehlt die Gesamtfläche, ist die Abrechnung an dieser Stelle nicht nachprüfbar.',
      euroImpact: [0, 700],
    },
    {
      id: 'NKA-33',
      label: 'Leerstand zulasten der Mieter',
      severity: 'warn',
      basis:
        '§ 556a BGB — ANWALTLICH ZU BESTÄTIGEN: Behandlung von Leerstandsflächen bei flächen- und verbrauchsabhängiger Umlage',
      category: CAT_SCHLUESSEL,
      instruction:
        'Prüfe, ob die Summe der umgelegten Anteile 100 Prozent ergibt. Ergibt sie mehr, deutet das darauf hin, dass Leerstand mitverteilt wurde. Nenne die Abweichung in Prozent.',
      euroImpact: [50, 1000],
    },

    /* ── Heizkosten ───────────────────────────────────────────────────── */
    {
      id: 'NKA-40',
      label: 'Verbrauchsanteil zwischen 50 und 70 Prozent',
      severity: 'error',
      basis: '§ 7 Abs. 1 und § 8 Abs. 1 HeizkostenV',
      category: CAT_HEIZ,
      instruction:
        'Prüfe, in welchem Verhältnis Heiz- und Warmwasserkosten nach Verbrauch und nach Fläche verteilt sind. Liegt der Verbrauchsanteil außerhalb von 50 bis 70 Prozent, nenne den tatsächlichen Prozentsatz.',
      euroImpact: [30, 800],
    },
    {
      id: 'NKA-41',
      label: 'Kürzungsrecht bei fehlender Verbrauchserfassung',
      severity: 'error',
      basis:
        '§ 12 Abs. 1 HeizkostenV, Kürzung um 15 Prozent — ANWALTLICH ZU BESTÄTIGEN: Voraussetzungen und Formulierung im Bericht',
      category: CAT_HEIZ,
      instruction:
        'Prüfe, ob die Heizkosten überhaupt verbrauchsabhängig abgerechnet wurden. Ist das nicht der Fall, rechne 15 Prozent des auf die Wohnung entfallenden Heizkostenanteils aus und nenne den Betrag. Formuliere ausschließlich als Prüfhinweis mit Verweis auf rechtliche Klärung.',
      euroImpact: [30, 700],
    },
    {
      id: 'NKA-42',
      label: 'Zähler- und Verbrauchswerte ausgewiesen',
      severity: 'warn',
      basis: '§ 6 Abs. 1 HeizkostenV, Erfassung des anteiligen Verbrauchs',
      category: CAT_HEIZ,
      instruction:
        'Prüfe, ob Anfangs- und Endstand der Zähler oder die erfassten Einheiten ausgewiesen sind. Ohne diese Werte ist der Verbrauchsanteil nicht nachprüfbar.',
      euroImpact: [0, 500],
    },
    {
      id: 'NKA-43',
      label: 'Warmwasser vom Heizungsanteil getrennt',
      severity: 'warn',
      basis: '§ 9 HeizkostenV, Aufteilung bei verbundenen Anlagen',
      category: CAT_HEIZ,
      instruction:
        'Bei verbundenen Anlagen prüfe, ob die Kosten der Warmwasserbereitung getrennt vom Heizungsanteil ausgewiesen sind und ob die Aufteilung nachvollziehbar ist.',
      euroImpact: [20, 500],
    },
    {
      id: 'NKA-44',
      label: 'Unterjährige Verbrauchsinformation',
      severity: 'info',
      basis:
        '§ 6a HeizkostenV in der Fassung seit 01.12.2021 — ANWALTLICH ZU BESTÄTIGEN: Voraussetzungen der Pflicht und mögliche Folgen bei Verstoß',
      category: CAT_HEIZ,
      instruction:
        'Prüfe, ob der Auftraggeber angegeben hat, unterjährige Verbrauchsinformationen erhalten zu haben, und ob die Abrechnung darauf Bezug nimmt. Stelle nur fest, was sich aus den Angaben ergibt.',
      euroImpact: [0, 400],
    },
    {
      id: 'NKA-45',
      label: 'Kosten der Verbrauchserfassung',
      severity: 'info',
      basis: '§ 7 Abs. 2 HeizkostenV, Kosten der Verbrauchserfassung gehören zu den Heizkosten',
      category: CAT_HEIZ,
      instruction:
        'Prüfe, ob Miete oder Wartung der Erfassungsgeräte als eigene Position ausgewiesen ist. Eine Position ohne Bezeichnung des Geräts ist eine Nachfrage wert.',
      euroImpact: [0, 300],
    },
  ],
};

export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH'))
  .map((c) => c.id);
