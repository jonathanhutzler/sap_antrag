import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Tierarztrechnung (GOT) — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Die Gebührenordnung für Tierärzte wurde zum 22.11.2022 grundlegend
 * novelliert. Sätze, Positionen und der Notdienstzuschlag haben sich dabei
 * geändert. Jede Zahl in diesem Katalog stammt aus der Arbeitsvorbereitung
 * und ist vor dem Livegang gegen den geltenden Verordnungstext zu stellen —
 * mit Datum und Fundstelle. Eine falsche Zahl in einem Gebührenkatalog ist
 * kein Schönheitsfehler.
 *
 * Der Aufbau der Prüfung folgt der Struktur der GOT: Die Verordnung nennt
 * einen einfachen Gebührensatz je Leistung; der Tierarzt kann diesen Satz
 * innerhalb eines Rahmens erhöhen. Der Bericht prüft, ob nachvollziehbar
 * ist, welcher Satz angesetzt wurde und ob die Leistung als Position benannt
 * ist. Ob eine Erhöhung im Einzelfall gerechtfertigt war, ist eine fachliche
 * und rechtliche Frage und gehört nicht in diesen Bericht.
 *
 * Preislage der Nische: 19,90 Euro. Der Katalog ist deshalb bewusst schlanker
 * als der einer Baubeschreibung. Ein Bericht, der länger dauert als er
 * einbringt, ist ein Verlustgeschäft.
 */

const CAT_FORM = 'Form und Nachvollziehbarkeit';
const CAT_SATZ = 'Gebührensatz';
const CAT_POSITION = 'Einzelne Positionen';
const CAT_AUSLAGE = 'Arzneimittel und Auslagen';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Form ─────────────────────────────────────────────────────────── */
    {
      id: 'TAR-01',
      label: 'Pflichtangaben der Rechnung',
      severity: 'warn',
      basis: '§ 14 Abs. 4 UStG',
      category: CAT_FORM,
      instruction:
        'Prüfe Name und Anschrift beider Seiten, Steuernummer oder USt-IdNr., Rechnungsdatum, fortlaufende Rechnungsnummer, Leistungsbeschreibung, Behandlungsdatum, Entgelt und Steuerbetrag getrennt. Nenne jede fehlende Angabe einzeln.',
      euroImpact: [0, 0],
    },
    {
      id: 'TAR-02',
      label: 'Einzelne Leistungen statt Sammelposition',
      severity: 'error',
      basis:
        'GOT in der Fassung seit 22.11.2022 — VOR LIVEGANG GEGEN DEN VERORDNUNGSTEXT ZU PRÜFEN: Anforderungen an die Bezeichnung der berechneten Leistungen',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob jede berechnete Leistung als eigene Position mit Bezeichnung erscheint. Sammelpositionen wie „Behandlung", „Untersuchung und Therapie" oder „Praxisleistung" machen die Rechnung unprüfbar. Nenne die Position wörtlich.',
      euroImpact: [10, 200],
    },
    {
      id: 'TAR-03',
      label: 'Behandlungsdatum je Position',
      severity: 'warn',
      basis: 'Nachvollziehbarkeit bei mehreren Behandlungsterminen',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob zu jeder Position das Datum der Leistung genannt ist. Bei einer Rechnung über mehrere Termine ist das die Grundlage jeder weiteren Prüfung.',
      euroImpact: [0, 100],
    },
    {
      id: 'TAR-04',
      label: 'Rechnerische Richtigkeit',
      severity: 'error',
      basis: 'Addition der Einzelpositionen gegen die Endsumme',
      category: CAT_FORM,
      instruction:
        'Addiere die Einzelpositionen und vergleiche mit der ausgewiesenen Endsumme. Weicht die vom Auftraggeber genannte Endsumme von der gelesenen ab, gehe von einem Lesefehler auf deiner Seite aus und sage das ausdrücklich.',
      euroImpact: [5, 150],
    },
    {
      id: 'TAR-05',
      label: 'Umsatzsteuer ausgewiesen und nachgerechnet',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 8 UStG',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob Steuersatz und Steuerbetrag ausgewiesen sind und ob der Betrag zur Bemessungsgrundlage passt. Rechne nach und nenne die Differenz, wenn sie über einem Euro liegt.',
      euroImpact: [2, 80],
    },

    /* ── Gebührensatz. Der Kern der Prüfung. ──────────────────────────── */
    {
      id: 'TAR-10',
      label: 'Angesetzter Steigerungssatz erkennbar',
      severity: 'error',
      basis:
        'GOT in der Fassung seit 22.11.2022 — VOR LIVEGANG ZU PRÜFEN: Zulässiger Rahmen des Steigerungssatzes und die Frage, ob er auf der Rechnung auszuweisen ist',
      category: CAT_SATZ,
      instruction:
        'Prüfe, ob die Rechnung zu den Leistungen erkennen lässt, mit welchem Satz sie berechnet wurden. Fehlt die Angabe durchgehend, ist die Rechnung nicht nachprüfbar; nenne das als Feststellung mit der Bitte um Aufschlüsselung.',
      euroImpact: [10, 250],
    },
    {
      id: 'TAR-11',
      label: 'Erhöhter Satz ohne Begründung',
      severity: 'warn',
      basis:
        'GOT in der Fassung seit 22.11.2022 — ANWALTLICH ZU BESTÄTIGEN: Ob und in welcher Form eine Begründung für einen erhöhten Satz verlangt werden kann',
      category: CAT_SATZ,
      instruction:
        'Prüfe, ob bei Positionen mit erhöhtem Satz eine Begründung genannt ist, etwa erhöhter Zeitaufwand oder Schwierigkeit. Fehlt sie, formuliere eine sachliche Bitte um Erläuterung. Stelle nicht fest, die Erhöhung sei unberechtigt.',
      euroImpact: [10, 300],
    },
    {
      id: 'TAR-12',
      label: 'Einheitlicher Satz über alle Positionen',
      severity: 'info',
      basis: 'Nachvollziehbarkeit, unterschiedliche Sätze innerhalb einer Rechnung',
      category: CAT_SATZ,
      instruction:
        'Prüfe, ob innerhalb einer Rechnung unterschiedliche Steigerungssätze verwendet werden. Das kann seinen Grund haben; ohne Kennzeichnung ist es eine Nachfrage.',
      euroImpact: [0, 150],
    },
    {
      id: 'TAR-13',
      label: 'Notdienstgebühr',
      severity: 'warn',
      basis:
        'GOT in der Fassung seit 22.11.2022, gesonderte Notdienstgebühr — VOR LIVEGANG ZU PRÜFEN: Höhe, Zeitfenster und ob sie je Behandlung oder je Termin anfällt',
      category: CAT_SATZ,
      instruction:
        'Prüfe, ob eine Notdienstgebühr berechnet wurde und ob das Behandlungsdatum und die Uhrzeit dazu passen, soweit die Rechnung sie nennt. Prüfe außerdem, ob sie mehrfach berechnet wurde. Nenne die Position wörtlich.',
      euroImpact: [10, 120],
    },
    {
      id: 'TAR-14',
      label: 'Zuschlag und erhöhter Satz nebeneinander',
      severity: 'warn',
      basis:
        'GOT in der Fassung seit 22.11.2022 — ANWALTLICH ZU BESTÄTIGEN: Verhältnis von Notdienstgebühr, Zuschlägen und Steigerungssatz',
      category: CAT_SATZ,
      instruction:
        'Prüfe, ob neben einer Notdienstgebühr zusätzlich ein erhöhter Steigerungssatz angesetzt wurde. Stelle den Sachverhalt mit beiden Positionen dar und formuliere eine Bitte um Erläuterung.',
      euroImpact: [10, 200],
    },

    /* ── Einzelne Positionen ──────────────────────────────────────────── */
    {
      id: 'TAR-20',
      label: 'Allgemeine Untersuchung mehrfach berechnet',
      severity: 'error',
      basis: 'Keine zweifache Vergütung derselben Leistung an einem Termin',
      category: CAT_POSITION,
      instruction:
        'Prüfe, ob eine allgemeine Untersuchung an einem Behandlungstag mehrfach erscheint. Nenne beide Positionen mit Datum.',
      euroImpact: [10, 120],
    },
    {
      id: 'TAR-21',
      label: 'Leistungen, die in einer anderen enthalten sind',
      severity: 'warn',
      basis:
        'GOT in der Fassung seit 22.11.2022 — VOR LIVEGANG ZU PRÜFEN: Welche Leistungen nach dem Verordnungstext mit anderen abgegolten sind',
      category: CAT_POSITION,
      instruction:
        'Prüfe, ob Positionen berechnet wurden, die typischerweise Bestandteil einer anderen Leistung sind. Formuliere ausschließlich als Bitte um Erläuterung, welche Leistung mit welcher abgegolten ist.',
      euroImpact: [10, 180],
    },
    {
      id: 'TAR-22',
      label: 'Hausbesuch und Wegegeld',
      severity: 'warn',
      basis:
        'GOT in der Fassung seit 22.11.2022 — VOR LIVEGANG ZU PRÜFEN: Berechnung von Wegegeld nach Entfernung und die Aufteilung bei mehreren Patienten',
      category: CAT_POSITION,
      instruction:
        'Prüfe bei Hausbesuchen, ob Wegegeld berechnet wurde und ob die Entfernung genannt ist. Prüfe außerdem, ob mehrere Behandlungen auf derselben Fahrt jeweils volles Wegegeld tragen.',
      euroImpact: [5, 100],
    },
    {
      id: 'TAR-23',
      label: 'Narkose und Überwachung getrennt',
      severity: 'info',
      basis: 'Nachvollziehbarkeit zusammengehöriger Leistungen',
      category: CAT_POSITION,
      instruction:
        'Prüfe bei Eingriffen unter Narkose, ob Narkose, Überwachung und Eingriff einzeln benannt sind. Eine Pauschale ohne Aufteilung ist eine Nachfrage wert.',
      euroImpact: [0, 150],
    },
    {
      id: 'TAR-24',
      label: 'Kostenvoranschlag eingehalten',
      severity: 'warn',
      basis: '§ 650 BGB, wesentliche Überschreitung eines Kostenanschlags',
      category: CAT_POSITION,
      instruction:
        'Nur prüfen, wenn der Auftraggeber einen Kostenvoranschlag angegeben oder hochgeladen hat. Stelle den Betrag der Rechnung gegenüber und nenne die Überschreitung in Euro und Prozent. Verweise auf rechtliche Klärung, ohne eine Zahlungspflicht zu beurteilen.',
      euroImpact: [20, 500],
    },

    /* ── Arzneimittel und Auslagen ────────────────────────────────────── */
    {
      id: 'TAR-30',
      label: 'Arzneimittel mit Menge und Bezeichnung',
      severity: 'error',
      basis:
        'GOT in der Fassung seit 22.11.2022 — VOR LIVEGANG ZU PRÜFEN: Anforderungen an die Abrechnung von Arzneimitteln und Verbrauchsmaterial',
      category: CAT_AUSLAGE,
      instruction:
        'Prüfe, ob abgegebene Arzneimittel mit Bezeichnung, Menge und Preis ausgewiesen sind. Eine Position „Medikamente" ohne Aufschlüsselung ist eine Feststellung.',
      euroImpact: [10, 250],
    },
    {
      id: 'TAR-31',
      label: 'Laborleistungen nachvollziehbar',
      severity: 'warn',
      basis: 'Nachvollziehbarkeit fremd erbrachter Leistungen',
      category: CAT_AUSLAGE,
      instruction:
        'Prüfe, ob Laborleistungen einzeln benannt sind und ob erkennbar ist, ob sie in der Praxis oder in einem Fremdlabor erbracht wurden. Nenne Sammelpositionen wörtlich.',
      euroImpact: [10, 200],
    },
    {
      id: 'TAR-32',
      label: 'Verbrauchsmaterial doppelt berechnet',
      severity: 'warn',
      basis: 'Keine zweifache Vergütung derselben Aufwendung',
      category: CAT_AUSLAGE,
      instruction:
        'Prüfe, ob Material sowohl als eigene Position als auch erkennbar innerhalb einer Leistung berechnet wurde. Nenne beide Positionen.',
      euroImpact: [5, 100],
    },
  ],
};

export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH') || c.basis.includes('ZU PRÜFEN'))
  .map((c) => c.id);
