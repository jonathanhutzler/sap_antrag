import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Handwerkerrechnung — Version 2026-08-01.
 *
 * Der Katalog ist das Produkt. Der System-Prompt wird aus dieser Datei
 * generiert (lib/prompt.ts), nicht umgekehrt. Eine Änderung an einem Check
 * ist eine neue Katalogversion: Datei kopieren, Version hochziehen, in der
 * Nischen-Config umhängen. Alte Versionen bleiben liegen, damit ein sechs
 * Monate alter Bericht bei einer Reklamation erklärbar bleibt.
 *
 * Regeln für jeden Check:
 * - `basis` ist Pflicht: entweder eine Norm oder ein benanntes Referenzband.
 * - `instruction` beschreibt eine Feststellung, keine Bewertung.
 * - `euroImpact` ist das plausible Band für diesen Check-Typ und dient
 *   zugleich als Deckel im Sanitizing (lib/sanitize.ts).
 */

const CAT_PFLICHT = 'Pflichtangaben';
const CAT_STEUER = 'Steuer und Abzug';
const CAT_PREIS = 'Preis und Kalkulation';
const CAT_LEISTUNG = 'Leistung und Nachweis';
const CAT_VERTRAG = 'Vertrag und Vereinbarung';
const CAT_ZAHLUNG = 'Zahlung und Fristen';

export const catalogue: Catalogue = {
  version: '2026-08-01',
  published: true,
  checks: [
    // ── Pflichtangaben nach § 14 UStG ──────────────────────────────────
    {
      id: 'HR-01',
      label: 'Vollständiger Name und Anschrift des Rechnungsstellers',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 1 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob der vollständige Name und die vollständige Anschrift des leistenden Unternehmers auf der Rechnung stehen. Stelle fest, wenn Angaben fehlen oder unvollständig sind (z. B. nur Ortsname ohne Straße).',
    },
    {
      id: 'HR-02',
      label: 'Vollständiger Name und Anschrift des Empfängers',
      severity: 'info',
      basis: '§ 14 Abs. 4 Nr. 1 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob Name und Anschrift des Leistungsempfaengers vollständig angegeben sind. Stelle Abweichungen fest, etwa fehlende Hausnummer oder falsch geschriebener Name.',
    },
    {
      id: 'HR-03',
      label: 'Steuernummer oder Umsatzsteuer-Identifikationsnummer',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 2 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob die Steuernummer oder die USt-IdNr. des Rechnungsstellers angegeben ist. Fehlt beides, stelle das fest.',
    },
    {
      id: 'HR-04',
      label: 'Rechnungsdatum',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 3 UStG',
      category: CAT_PFLICHT,
      instruction: 'Prüfe, ob ein Ausstellungsdatum der Rechnung angegeben ist.',
    },
    {
      id: 'HR-05',
      label: 'Fortlaufende Rechnungsnummer',
      severity: 'info',
      basis: '§ 14 Abs. 4 Nr. 4 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob eine Rechnungsnummer vergeben ist. Ob sie fortlaufend ist, lässt sich aus einem einzelnen Dokument nicht feststellen — sage das ausdrücklich, wenn eine Nummer vorhanden ist.',
    },
    {
      id: 'HR-06',
      label: 'Leistungsbeschreibung ausreichend konkret',
      severity: 'error',
      basis: '§ 14 Abs. 4 Nr. 5 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob jede Position handelsübliche Bezeichnung, Art und Umfang der Leistung erkennen lässt. Sammelbezeichnungen wie "Reparaturarbeiten", "diverse Arbeiten", "Material" oder "Sonstiges" ohne weitere Aufschlüsselung sind festzustellen. Nenne die betroffene Position wörtlich.',
      euroImpact: [0, 0],
    },
    {
      id: 'HR-07',
      label: 'Leistungszeitpunkt oder Leistungszeitraum',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 6 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob der Zeitpunkt oder Zeitraum der Leistung angegeben ist. Der Hinweis "Leistungsdatum entspricht Rechnungsdatum" genügt; fehlt jede Angabe, stelle das fest.',
    },
    {
      id: 'HR-08',
      label: 'Entgelt nach Steuersätzen aufgeschlüsselt',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 7 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob das Nettoentgelt, der Steuersatz und der Steuerbetrag getrennt ausgewiesen sind. Stelle fest, wenn nur ein Bruttobetrag genannt ist.',
    },
    {
      id: 'HR-09',
      label: 'Hinweis auf Aufbewahrungspflicht bei Privatkunden',
      severity: 'info',
      basis: '§ 14 Abs. 4 Nr. 9 i. V. m. § 14b Abs. 1 S. 5 UStG',
      category: CAT_PFLICHT,
      instruction:
        'Bei Leistungen im Zusammenhang mit einem Grundstück an eine Privatperson muss die Rechnung auf die zweijährige Aufbewahrungspflicht hinweisen. Prüfe, ob dieser Hinweis vorhanden ist, wenn es sich erkennbar um eine grundstücksbezogene Leistung handelt.',
    },

    // ── Steuer und Abzug ───────────────────────────────────────────────
    {
      id: 'HR-10',
      label: 'Arbeitskosten getrennt ausgewiesen (§ 35a EStG)',
      severity: 'error',
      basis: '§ 35a Abs. 3 EStG, BMF-Schreiben vom 09.11.2016',
      category: CAT_STEUER,
      instruction:
        'Die Steuerermäßigung für Handwerkerleistungen setzt voraus, dass Arbeits-, Maschinen- und Fahrtkosten getrennt von den Materialkosten ausgewiesen sind. Prüfe, ob diese Trennung erkennbar ist. Ist sie es nicht, beziffere den entgangenen Abzug mit 20 Prozent der nicht getrennt ausgewiesenen Arbeitskosten, höchstens 1.200 Euro im Jahr.',
      euroImpact: [0, 1200],
    },
    {
      id: 'HR-11',
      label: 'Angewandter Umsatzsteuersatz',
      severity: 'warn',
      basis: '§ 12 UStG',
      category: CAT_STEUER,
      instruction:
        'Prüfe, ob der ausgewiesene Steuersatz zur Leistungsart passt. Handwerkerleistungen unterliegen im Regelfall 19 Prozent. Stelle fest, wenn der ausgewiesene Steuerbetrag rechnerisch nicht zum genannten Satz passt, und nenne die Differenz.',
      euroImpact: [0, 0],
    },
    {
      id: 'HR-12',
      label: 'Umsatzsteuer trotz Kleinunternehmerstatus ausgewiesen',
      severity: 'warn',
      basis: '§ 19 Abs. 1 S. 4 UStG',
      category: CAT_STEUER,
      instruction:
        'Prüfe, ob die Rechnung sowohl auf die Kleinunternehmerregelung hinweist als auch Umsatzsteuer ausweist. Beides zusammen ist eine Abweichung und ist festzustellen.',
    },
    {
      id: 'HR-13',
      label: 'Reverse-Charge-Hinweis gegenüber Privatperson',
      severity: 'warn',
      basis: '§ 13b Abs. 5 UStG',
      category: CAT_STEUER,
      instruction:
        'Der Übergang der Steuerschuld gilt nicht gegenüber Privatpersonen. Stelle fest, wenn die Rechnung an eine Privatperson einen Reverse-Charge-Hinweis oder "Steuerschuldnerschaft des Leistungsempfaengers" enthält.',
    },
    {
      id: 'HR-14',
      label: 'Zahlungsweg für den Steuerabzug',
      severity: 'info',
      basis: '§ 35a Abs. 5 S. 3 EStG',
      category: CAT_STEUER,
      instruction:
        'Der Abzug nach § 35a EStG setzt eine unbare Zahlung voraus. Stelle fest, wenn die Rechnung ausschließlich Barzahlung vorsieht oder eine Barzahlung quittiert, und weise auf die Folge für den Steuerabzug hin.',
      euroImpact: [0, 1200],
    },

    // ── Preis und Kalkulation ──────────────────────────────────────────
    {
      id: 'HR-15',
      label: 'Stundenverrechnungssatz außerhalb des üblichen Bandes',
      severity: 'warn',
      basis:
        'Referenzband: 55 bis 95 Euro netto je Monteurstunde im Bauhaupt- und Ausbaugewerbe, regional abweichend (Orientierungswert, keine amtliche Größe)',
      category: CAT_PREIS,
      instruction:
        'Prüfe den ausgewiesenen Stundensatz je Monteur gegen das Referenzband. Liegt er darüber, stelle die Abweichung fest und beziffere die Differenz zum oberen Bandwert multipliziert mit den abgerechneten Stunden. Nenne das Band ausdrücklich als Orientierungswert.',
      euroImpact: [20, 900],
    },
    {
      id: 'HR-16',
      label: 'Materialaufschlag außerhalb des üblichen Bandes',
      severity: 'warn',
      basis:
        'Referenzband: 10 bis 30 Prozent Aufschlag auf den Materialeinkauf (Orientierungswert aus Branchenkalkulation)',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob Materialpositionen mit einem erkennbaren Aufschlag abgerechnet werden, der über dem Referenzband liegt, etwa wenn ein Listenpreis und ein Rechnungspreis genannt sind. Ohne Vergleichswert im Dokument keine Bezifferung.',
      euroImpact: [10, 400],
    },
    {
      id: 'HR-17',
      label: 'An- und Abfahrt ohne Vereinbarung oder doppelt berechnet',
      severity: 'warn',
      basis:
        '§ 632 Abs. 2 BGB; Referenzband: 25 bis 60 Euro je Anfahrt oder 0,50 bis 1,20 Euro je Kilometer',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob Anfahrtskosten abgerechnet werden und ob sie mehrfach für denselben Einsatztag erscheinen. Stelle fest, wenn die Pauschale außerhalb des Referenzbandes liegt oder die Anzahl der Anfahrten die Zahl der Einsatztage übersteigt.',
      euroImpact: [25, 240],
    },
    {
      id: 'HR-18',
      label: 'Kleinmaterial- oder Gemeinkostenpauschale',
      severity: 'info',
      basis:
        'Referenzband: 3 bis 5 Prozent des Materialwerts für Kleinmaterial (Orientierungswert aus Branchenkalkulation)',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob eine Pauschale für Kleinmaterial, Verbrauchsmaterial oder Gemeinkosten abgerechnet wird und ob sie im Verhältnis zum Materialwert außerhalb des Referenzbandes liegt.',
      euroImpact: [5, 150],
    },
    {
      id: 'HR-19',
      label: 'Zuschlag für Notdienst, Wochenende oder Nacht',
      severity: 'warn',
      basis:
        '§ 632 Abs. 2 BGB; Referenzband: 50 bis 100 Prozent Zuschlag außerhalb der Regelarbeitszeit, nur bei Vereinbarung',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob Zuschläge für Notdienst, Wochenend- oder Nachtarbeit abgerechnet werden, ob der Einsatzzeitpunkt im Dokument dazu passt und ob die Höhe im Referenzband liegt. Stelle fest, wenn ein Zuschlag ohne erkennbaren Einsatzzeitpunkt außerhalb der Regelarbeitszeit abgerechnet wird.',
      euroImpact: [30, 600],
    },
    {
      id: 'HR-20',
      label: 'Entsorgungs- und Nebenkosten ohne Bezug zur Leistung',
      severity: 'info',
      basis: '§ 632 Abs. 2 BGB',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob Entsorgungs-, Rüst- oder Nebenkosten abgerechnet werden, zu denen die Leistungsbeschreibung keinen passenden Vorgang nennt.',
      euroImpact: [10, 250],
    },
    {
      id: 'HR-21',
      label: 'Rechnerische Richtigkeit der Summen',
      severity: 'error',
      basis: 'Rechnerische Prüfung der Einzelpositionen gegen die Endsumme',
      category: CAT_PREIS,
      instruction:
        'Addiere die Einzelpositionen und vergleiche das Ergebnis mit dem ausgewiesenen Netto-, Steuer- und Bruttobetrag. Stelle jede Abweichung mit dem genauen Differenzbetrag fest. Rechne sorgfältig und nur mit den Zahlen, die im Dokument stehen.',
      euroImpact: [1, 2000],
    },
    {
      id: 'HR-22',
      label: 'Doppelt abgerechnete Position',
      severity: 'error',
      basis: 'Abgleich der Positionen untereinander',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob dieselbe Leistung oder dasselbe Material in zwei Positionen erscheint, etwa als Einzelposition und zusätzlich in einer Pauschale. Nenne beide Positionen wörtlich.',
      euroImpact: [10, 1500],
    },

    // ── Leistung und Nachweis ──────────────────────────────────────────
    {
      id: 'HR-23',
      label: 'Arbeitszeit ohne nachvollziehbaren Nachweis',
      severity: 'warn',
      basis: '§ 632 Abs. 2 BGB, Darlegungslast des Werkunternehmers',
      category: CAT_LEISTUNG,
      instruction:
        'Bei Abrechnung nach Aufwand prüfe, ob Datum, Anzahl der Monteure und Stunden je Einsatz erkennbar sind. Stelle fest, wenn nur eine Gesamtstundenzahl ohne Aufschlüsselung genannt ist.',
    },
    {
      id: 'HR-24',
      label: 'Stundenaufwand im Verhältnis zur beschriebenen Leistung',
      severity: 'info',
      basis: 'Plausibilitätsabgleich zwischen Leistungsbeschreibung und abgerechneten Stunden',
      category: CAT_LEISTUNG,
      instruction:
        'Prüfe, ob der abgerechnete Stundenaufwand zur beschriebenen Leistung passt. Aeussere dich nur, wenn die Leistungsbeschreibung konkret genug ist. Ist sie es nicht, sage das statt zu schätzen.',
      euroImpact: [0, 500],
    },
    {
      id: 'HR-25',
      label: 'Mengen und Aufmaß nachvollziehbar',
      severity: 'info',
      basis: 'Nachvollziehbarkeit der Mengenermittlung',
      category: CAT_LEISTUNG,
      instruction:
        'Prüfe, ob abgerechnete Mengen (Quadratmeter, Meter, Stück) im Dokument hergeleitet sind oder nur als Endwert erscheinen.',
    },

    // ── Vertrag und Vereinbarung ───────────────────────────────────────
    {
      id: 'HR-26',
      label: 'Überschreitung eines Kostenvoranschlags',
      severity: 'error',
      basis: '§ 650 Abs. 2 BGB',
      category: CAT_VERTRAG,
      instruction:
        'Wenn das Dokument auf einen Kostenvoranschlag Bezug nimmt und dessen Betrag nennt, vergleiche ihn mit der Rechnungssumme. Stelle eine wesentliche Überschreitung fest und beziffere die Differenz. Ohne genannten Voranschlagsbetrag keine Aussage.',
      euroImpact: [0, 3000],
    },
    {
      id: 'HR-27',
      label: 'Abschlagszahlungen verrechnet',
      severity: 'error',
      basis: '§ 632a BGB',
      category: CAT_VERTRAG,
      instruction:
        'Prüfe, ob geleistete Abschlags- oder Anzahlungen genannt und von der Schlussrechnung abgezogen sind. Stelle fest, wenn eine Anzahlung erwähnt, aber nicht abgezogen ist, und nenne den Betrag.',
      euroImpact: [50, 5000],
    },
    {
      id: 'HR-28',
      label: 'Zusatzleistung ohne erkennbare Beauftragung',
      severity: 'warn',
      basis: '§ 650b BGB',
      category: CAT_VERTRAG,
      instruction:
        'Prüfe, ob Positionen abgerechnet werden, die im Dokument als Zusatz, Nachtrag oder Mehraufwand bezeichnet sind, ohne dass ein Bezug zu einer Beauftragung erkennbar ist.',
      euroImpact: [20, 1500],
    },
    {
      id: 'HR-29',
      label: 'Verweis auf VOB/B gegenüber Verbrauchern',
      severity: 'warn',
      basis: '§ 310 Abs. 1 S. 1 BGB, § 650b ff. BGB',
      category: CAT_VERTRAG,
      instruction:
        'Stelle fest, wenn die Rechnung gegenüber einer Privatperson auf die VOB/B verweist, ohne dass eine Einbeziehung erkennbar ist. Beschreibe nur den Umstand des Verweises.',
    },
    {
      id: 'HR-30',
      label: 'Fälligkeit vor Abnahme',
      severity: 'warn',
      basis: '§ 641 Abs. 1 BGB',
      category: CAT_VERTRAG,
      instruction:
        'Die Vergütung wird grundsätzlich mit der Abnahme fällig. Stelle fest, wenn die Rechnung eine Zahlungsfrist setzt und zugleich erkennbar ist, dass die Leistung noch nicht abgenommen oder noch nicht abgeschlossen ist.',
    },

    // ── Zahlung und Fristen ────────────────────────────────────────────
    {
      id: 'HR-31',
      label: 'Zahlungsfrist und Skonto',
      severity: 'info',
      basis: '§ 271 BGB, § 14 Abs. 4 Nr. 7 UStG (Hinweis auf Entgeltminderung)',
      category: CAT_ZAHLUNG,
      instruction:
        'Prüfe die genannte Zahlungsfrist und einen etwaigen Skontoabzug. Stelle fest, wenn Skonto genannt, aber nicht bezifferbar ist, oder wenn eine Frist von unter sieben Tagen gesetzt wird.',
      euroImpact: [0, 200],
    },
    {
      id: 'HR-32',
      label: 'Verzugszinsen und Mahnkosten',
      severity: 'warn',
      basis: '§ 288 Abs. 1 BGB (5 Prozentpunkte über Basiszinssatz gegenüber Verbrauchern), § 309 Nr. 5 BGB',
      category: CAT_ZAHLUNG,
      instruction:
        'Prüfe angekündigte oder berechnete Verzugszinsen und Mahnkosten. Stelle fest, wenn ein Zinssatz genannt wird, der über dem gesetzlichen Satz gegenüber Verbrauchern liegt, oder wenn Mahnpauschalen ohne Höhe der tatsächlichen Kosten angesetzt sind.',
      euroImpact: [3, 150],
    },
    {
      id: 'HR-33',
      label: 'Gewährleistungsfrist im Dokument verkürzt',
      severity: 'warn',
      basis: '§ 634a Abs. 1 BGB, § 309 Nr. 8 lit. b ff. BGB',
      category: CAT_ZAHLUNG,
      instruction:
        'Stelle fest, wenn das Dokument eine Gewährleistungs- oder Verjährungsfrist nennt, die kürzer ist als zwei Jahre (fünf Jahre bei Arbeiten an einem Bauwerk).',
    },
  ],
};
