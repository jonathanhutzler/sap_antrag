import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Hausgeldabrechnung (WEG-Jahresabrechnung) — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ein Punkt, an dem ältere Ratgeber durchweg falsch liegen: Seit dem WEMoG
 * zum 01.12.2020 beschließen die Eigentümer nicht mehr die Jahresabrechnung
 * als solche, sondern die Nachschüsse beziehungsweise die Anpassung der
 * Vorschüsse (§ 28 Abs. 2 WEG). Gegenstand des Beschlusses ist damit die
 * Abrechnungsspitze, nicht das gesamte Zahlenwerk. Wer einen Beschluss über
 * „die Jahresabrechnung" anficht, greift das falsche Objekt an.
 *
 * Zweite Besonderheit: Die Jahresabrechnung ist eine Einnahmen-Ausgaben-
 * Rechnung. Eine Rückstellung oder Abgrenzung, wie man sie aus der
 * Buchhaltung kennt, gehört dort nicht hinein. Das ist die häufigste
 * Fehlerquelle überhaupt.
 *
 * Der Bericht prüft die Nachvollziehbarkeit des Zahlenwerks. Er beurteilt
 * nicht die Wirksamkeit eines Beschlusses und nennt keine Anfechtungsfristen
 * als Handlungsempfehlung. Beides ist Rechtsberatung.
 */

const CAT_FORM = 'Form und Vollständigkeit';
const CAT_VERTEILUNG = 'Kostenverteilung';
const CAT_POSTEN = 'Einzelne Kostenarten';
const CAT_RUECKLAGE = 'Rücklage und Vermögen';
const CAT_STEUER = 'Steuerliche Angaben';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Form und Vollständigkeit ──────────────────────────────────────── */
    {
      id: 'HGA-01',
      label: 'Gesamt- und Einzelabrechnung vorhanden',
      severity: 'error',
      basis: '§ 28 Abs. 2 WEG',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob sowohl eine Gesamtabrechnung für die Gemeinschaft als auch eine Einzelabrechnung für die eigene Einheit vorliegt. Fehlt eine von beiden, ist die Abrechnung nicht nachvollziehbar.',
      euroImpact: [0, 0],
    },
    {
      id: 'HGA-02',
      label: 'Abrechnungszeitraum genannt',
      severity: 'warn',
      basis: '§ 28 Abs. 2 WEG, Wirtschaftsjahr',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob der Abrechnungszeitraum eindeutig genannt ist und ob er ein volles Wirtschaftsjahr umfasst. Bei unterjährigem Eigentumswechsel prüfe, ob die zeitanteilige Zuordnung erkennbar ist.',
      euroImpact: [0, 0],
    },
    {
      id: 'HGA-03',
      label: 'Einnahmen-Ausgaben-Rechnung statt Buchhaltung',
      severity: 'error',
      basis:
        '§ 28 Abs. 2 WEG — ANWALTLICH ZU BESTÄTIGEN: Reichweite des Grundsatzes und zulässige Ausnahmen bei einzelnen Positionen',
      category: CAT_FORM,
      instruction:
        'Die Jahresabrechnung stellt tatsächliche Einnahmen und tatsächliche Ausgaben des Zeitraums gegenüber. Suche nach Positionen, die auf eine periodengerechte Abgrenzung hindeuten: „Rückstellung", „Abgrenzung", „periodengerecht", „noch nicht fällig", „anteilig für Folgejahr". Nenne jede solche Position wörtlich.',
      euroImpact: [50, 2000],
    },
    {
      id: 'HGA-04',
      label: 'Anfangs- und Endbestand der Konten',
      severity: 'error',
      basis: '§ 28 Abs. 2 WEG, Nachvollziehbarkeit der Geldbewegung',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob Anfangsbestand, Einnahmen, Ausgaben und Endbestand aller Konten ausgewiesen sind und ob die Rechnung aufgeht: Anfangsbestand plus Einnahmen minus Ausgaben gleich Endbestand. Weicht das ab, nenne die Differenz in Euro.',
      euroImpact: [0, 3000],
    },
    {
      id: 'HGA-05',
      label: 'Abrechnungsspitze getrennt ausgewiesen',
      severity: 'error',
      basis:
        '§ 28 Abs. 2 WEG in der Fassung seit 01.12.2020 — beschlossen werden Nachschüsse und die Anpassung der Vorschüsse, nicht die Abrechnung selbst',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob die Einzelabrechnung erkennen lässt, welcher Betrag als Nachzahlung oder Guthaben zu beschließen ist, getrennt von den gezahlten Vorschüssen. Fehlt diese Trennung, nenne das als Feststellung. Formuliere keine Aussage über die Wirksamkeit eines Beschlusses.',
      euroImpact: [0, 0],
    },
    {
      id: 'HGA-06',
      label: 'Rechnerische Richtigkeit der Einzelabrechnung',
      severity: 'error',
      basis: 'Addition der Einzelpositionen gegen den ausgewiesenen Anteil',
      category: CAT_FORM,
      instruction:
        'Addiere die auf die eigene Einheit entfallenden Positionen und vergleiche mit dem ausgewiesenen Gesamtanteil. Weicht die vom Auftraggeber genannte Summe von der gelesenen ab, gehe von einem Lesefehler auf deiner Seite aus.',
      euroImpact: [20, 1500],
    },

    /* ── Kostenverteilung ─────────────────────────────────────────────── */
    {
      id: 'HGA-10',
      label: 'Verteilerschlüssel genannt und einheitlich',
      severity: 'error',
      basis: '§ 16 Abs. 2 WEG, Verteilung nach Miteigentumsanteilen, soweit nichts anderes beschlossen ist',
      category: CAT_VERTEILUNG,
      instruction:
        'Prüfe, ob zu jeder Kostenart der Verteilerschlüssel genannt ist (Miteigentumsanteile, Einheiten, Fläche, Verbrauch, Personen). Fehlt er bei einer Position, nenne die Position wörtlich.',
      euroImpact: [50, 2500],
    },
    {
      id: 'HGA-11',
      label: 'Schlüssel stimmt mit Teilungserklärung oder Beschluss überein',
      severity: 'warn',
      basis:
        '§ 16 Abs. 2 Satz 2 WEG — ANWALTLICH ZU BESTÄTIGEN: Anforderungen an einen wirksamen Änderungsbeschluss und dessen Rückwirkung',
      category: CAT_VERTEILUNG,
      instruction:
        'Nur prüfen, wenn der Auftraggeber die Teilungserklärung oder einen Beschluss zum Verteilerschlüssel mit hochgeladen hat. Vergleiche den dort genannten Schlüssel mit dem in der Abrechnung verwendeten und nenne jede Abweichung.',
      euroImpact: [100, 3000],
    },
    {
      id: 'HGA-12',
      label: 'Summe der Miteigentumsanteile',
      severity: 'warn',
      basis: 'Rechnerische Kontrolle, Gesamtsumme der Anteile',
      category: CAT_VERTEILUNG,
      instruction:
        'Prüfe, ob die Summe der verteilten Anteile die Gesamtsumme ergibt, die die Abrechnung nennt. Fehlbeträge deuten auf nicht verteilte Einheiten hin.',
      euroImpact: [50, 2000],
    },
    {
      id: 'HGA-13',
      label: 'Sondereigentum in der Gemeinschaftsabrechnung',
      severity: 'error',
      basis:
        '§ 16 Abs. 2 WEG, Kosten des Sondereigentums trägt der jeweilige Eigentümer — ANWALTLICH ZU BESTÄTIGEN: Abgrenzung im Einzelfall',
      category: CAT_VERTEILUNG,
      instruction:
        'Suche nach Positionen, die nach der Bezeichnung dem Sondereigentum zuzuordnen sind und dennoch auf alle Eigentümer verteilt wurden, etwa Reparaturen in einer einzelnen Wohnung. Nenne die Position wörtlich und formuliere als Nachfrage.',
      euroImpact: [100, 4000],
    },

    /* ── Einzelne Kostenarten ─────────────────────────────────────────── */
    {
      id: 'HGA-20',
      label: 'Heizkosten verbrauchsabhängig verteilt',
      severity: 'error',
      basis: '§ 7 Abs. 1 HeizkostenV, mindestens 50 und höchstens 70 Prozent nach Verbrauch',
      category: CAT_POSTEN,
      instruction:
        'Prüfe, ob die Heiz- und Warmwasserkosten in einen verbrauchsabhängigen und einen flächenabhängigen Teil geteilt sind und in welchem Verhältnis. Liegt der Verbrauchsanteil außerhalb von 50 bis 70 Prozent, nenne den tatsächlichen Prozentsatz.',
      euroImpact: [50, 1200],
    },
    {
      id: 'HGA-21',
      label: 'Verwaltervergütung nachvollziehbar',
      severity: 'warn',
      basis: 'Verwaltervertrag, Vergütung je Einheit und Monat',
      category: CAT_POSTEN,
      instruction:
        'Prüfe, ob die Verwaltervergütung als eigene Position ausgewiesen ist und ob erkennbar ist, wie sie sich errechnet. Sonderhonorare für einzelne Vorgänge gehören gesondert ausgewiesen; sind sie in der Grundvergütung versteckt, ist das eine Feststellung.',
      euroImpact: [50, 800],
    },
    {
      id: 'HGA-22',
      label: 'Instandhaltung gegen Instandsetzung',
      severity: 'warn',
      basis:
        '§ 19 Abs. 2 Nr. 2 WEG — ANWALTLICH ZU BESTÄTIGEN: Abgrenzung laufender Erhaltung von Maßnahmen, die aus der Erhaltungsrücklage zu bestreiten sind',
      category: CAT_POSTEN,
      instruction:
        'Prüfe, ob größere Erhaltungsmaßnahmen aus der Erhaltungsrücklage entnommen oder als laufende Kosten umgelegt wurden. Nenne Positionen über 1.000 Euro, die als laufende Kosten erscheinen, und formuliere als Nachfrage.',
      euroImpact: [100, 5000],
    },
    {
      id: 'HGA-23',
      label: 'Nicht umlagefähige Positionen',
      severity: 'warn',
      basis:
        'Vertragliche Vereinbarung und Beschlusslage — ANWALTLICH ZU BESTÄTIGEN: Katalog der Positionen, die in der WEG-Abrechnung gegenüber dem Eigentümer nicht ansetzbar sind',
      category: CAT_POSTEN,
      instruction:
        'Suche nach Positionen ohne erkennbaren Bezug zur Bewirtschaftung des gemeinschaftlichen Eigentums, etwa Kosten eines Rechtsstreits gegen einen einzelnen Eigentümer oder Bewirtungskosten. Nenne sie wörtlich und formuliere als Nachfrage, nicht als Bewertung.',
      euroImpact: [50, 2000],
    },
    {
      id: 'HGA-24',
      label: 'Versicherungen einzeln ausgewiesen',
      severity: 'info',
      basis: 'Nachvollziehbarkeit der Kostenarten',
      category: CAT_POSTEN,
      instruction:
        'Prüfe, ob Gebäudeversicherung, Haftpflicht und weitere Versicherungen getrennt ausgewiesen sind. Eine Sammelposition „Versicherungen" ohne Aufteilung ist eine Nachfrage wert.',
      euroImpact: [0, 400],
    },
    {
      id: 'HGA-25',
      label: 'Sprung gegenüber dem Vorjahr',
      severity: 'info',
      basis: 'Vergleich mit der Vorjahresabrechnung',
      category: CAT_POSTEN,
      instruction:
        'Nur prüfen, wenn die Vorjahresabrechnung mit hochgeladen wurde. Nenne jede Kostenart, die sich um mehr als 30 Prozent verändert hat, mit beiden Beträgen. Bewerte die Veränderung nicht, sondern stelle sie fest.',
      euroImpact: [0, 2000],
    },

    /* ── Rücklage und Vermögen ────────────────────────────────────────── */
    {
      id: 'HGA-30',
      label: 'Erhaltungsrücklage getrennt geführt',
      severity: 'error',
      basis: '§ 19 Abs. 2 Nr. 4 WEG',
      category: CAT_RUECKLAGE,
      instruction:
        'Prüfe, ob die Erhaltungsrücklage getrennt vom Bewirtschaftungskonto ausgewiesen ist, mit Anfangsbestand, Zuführung, Entnahme und Endbestand. Fehlt eine dieser Größen, nenne sie.',
      euroImpact: [0, 3000],
    },
    {
      id: 'HGA-31',
      label: 'Entnahmen aus der Rücklage begründet',
      severity: 'warn',
      basis: '§ 19 Abs. 2 Nr. 4 WEG in Verbindung mit dem Beschluss über die Maßnahme',
      category: CAT_RUECKLAGE,
      instruction:
        'Prüfe, ob zu jeder Entnahme aus der Rücklage die Maßnahme benannt ist. Eine Entnahme ohne Zweckangabe ist eine Feststellung.',
      euroImpact: [0, 5000],
    },
    {
      id: 'HGA-32',
      label: 'Vermögensbericht vorhanden',
      severity: 'warn',
      basis: '§ 28 Abs. 4 WEG',
      category: CAT_RUECKLAGE,
      instruction:
        'Prüfe, ob ein Vermögensbericht beiliegt, der den Stand der Erhaltungsrücklage und das wesentliche Gemeinschaftsvermögen ausweist. Fehlt er, stelle das fest.',
      euroImpact: [0, 0],
    },

    /* ── Steuerliche Angaben ──────────────────────────────────────────── */
    {
      id: 'HGA-40',
      label: 'Bescheinigung nach § 35a EStG',
      severity: 'error',
      basis: '§ 35a EStG, haushaltsnahe Dienstleistungen und Handwerkerleistungen',
      category: CAT_STEUER,
      instruction:
        'Prüfe, ob die Abrechnung die auf die Einheit entfallenden Arbeitskosten für haushaltsnahe Dienstleistungen und Handwerkerleistungen gesondert ausweist. Ohne diese Trennung entfällt die Steuerermäßigung. Beziffere den möglichen Effekt vorsichtig und nur, wenn die Rechnung Zahlen dafür hergibt.',
      euroImpact: [50, 1200],
    },
    {
      id: 'HGA-41',
      label: 'Materialkosten nicht als Arbeitskosten ausgewiesen',
      severity: 'warn',
      basis: '§ 35a Abs. 3 EStG, nur Arbeitskosten sind begünstigt',
      category: CAT_STEUER,
      instruction:
        'Prüfe, ob die ausgewiesenen begünstigten Beträge erkennbar nur Arbeitskosten umfassen. Ist eine Gesamtsumme ohne Trennung als begünstigt bezeichnet, nenne das als Feststellung.',
      euroImpact: [20, 600],
    },
  ],
};

export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH'))
  .map((c) => c.id);
