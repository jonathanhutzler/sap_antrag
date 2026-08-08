import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Photovoltaik-Angebot — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Diese Nische ist die schwächste der Reihe, und das steht besser hier als in
 * einer Verkaufsseite: Ein PV-Angebot hat keinen gesetzlichen Pflichtkatalog
 * wie eine Rechnung nach § 14 UStG oder eine Baubeschreibung nach Art. 249
 * EGBGB. Der Katalog stützt sich deshalb zu einem großen Teil auf
 * Vollständigkeit, Vergleichbarkeit und technische Plausibilität — und das
 * sind schwächere Grundlagen als eine Norm.
 *
 * Die Konsequenz für die Formulierung: Der Bericht sagt, welche Angabe fehlt
 * und welche Zahl außerhalb eines benannten Referenzbandes liegt. Er sagt
 * nicht, ob ein Angebot gut oder schlecht ist. Ein Angebotsvergleich ist
 * keine Prüfung, und diese Nische darf nicht so tun.
 *
 * Preisbänder in `euroImpact` sind Orientierungswerte des Marktes und keine
 * Rechtsgrundlage. Sie gehören vor dem Livegang gegen aktuelle Marktdaten
 * gestellt und mit Datum versehen.
 */

const CAT_VOLLSTAENDIG = 'Vollständigkeit des Angebots';
const CAT_TECHNIK = 'Technische Angaben';
const CAT_ERTRAG = 'Ertragsprognose';
const CAT_PREIS = 'Preis und Zahlung';
const CAT_VERTRAG = 'Vertragliches';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Vollständigkeit ──────────────────────────────────────────────── */
    {
      id: 'PVA-01',
      label: 'Komponenten mit Hersteller und Typ benannt',
      severity: 'error',
      basis: 'Bestimmtheit der Leistung, § 631 BGB',
      category: CAT_VOLLSTAENDIG,
      instruction:
        'Prüfe, ob Module, Wechselrichter und gegebenenfalls Speicher mit Hersteller, Typbezeichnung und Stückzahl genannt sind. Formulierungen wie „Module namhafter Hersteller" oder „Wechselrichter nach Verfügbarkeit" sind keine Angabe. Nenne die Position wörtlich.',
      euroImpact: [500, 5000],
    },
    {
      id: 'PVA-02',
      label: 'Anlagenleistung in kWp angegeben',
      severity: 'error',
      basis: 'Bestimmtheit der Leistung, Grundgröße jedes Vergleichs',
      category: CAT_VOLLSTAENDIG,
      instruction:
        'Prüfe, ob die Gesamtleistung der Anlage in Kilowatt-Peak genannt ist und ob sie zur Modulanzahl mal Modulleistung passt. Rechne nach und nenne beide Zahlen bei Abweichung.',
      euroImpact: [0, 2000],
    },
    {
      id: 'PVA-03',
      label: 'Montagearbeiten im Umfang enthalten',
      severity: 'error',
      basis: 'Abgrenzung des Leistungsumfangs, § 631 BGB',
      category: CAT_VOLLSTAENDIG,
      instruction:
        'Prüfe, ob Gerüst, Dachdurchdringung, Kabelwege, Zählerschrankanpassung und Inbetriebnahme ausdrücklich enthalten oder ausdrücklich ausgeschlossen sind. Jede Leistung, die weder als enthalten noch als ausgeschlossen erkennbar ist, ist ein Fund.',
      euroImpact: [300, 6000],
    },
    {
      id: 'PVA-04',
      label: 'Elektroarbeiten und Zählerschrank',
      severity: 'warn',
      basis: 'VDE-AR-N 4105 als anerkannte Regel der Technik für den Netzanschluss',
      category: CAT_VOLLSTAENDIG,
      instruction:
        'Prüfe, ob das Angebot die Anpassung des Zählerschranks und den Anschluss ans Hausnetz abdeckt. Ein Vorbehalt „falls erforderlich" ohne Preisangabe ist eine Feststellung, weil er eine offene Position im vierstelligen Bereich sein kann.',
      euroImpact: [300, 4000],
    },
    {
      id: 'PVA-05',
      label: 'Anmeldung bei Netzbetreiber und Marktstammdatenregister',
      severity: 'warn',
      basis: 'Registrierungspflicht im Marktstammdatenregister, MaStRV',
      category: CAT_VOLLSTAENDIG,
      instruction:
        'Prüfe, ob das Angebot die Anmeldung beim Netzbetreiber und die Registrierung im Marktstammdatenregister als Leistung enthält. Fehlt beides, ist das eine Feststellung mit Hinweis, dass die Pflicht beim Betreiber der Anlage liegt.',
      euroImpact: [0, 500],
    },

    /* ── Technik ──────────────────────────────────────────────────────── */
    {
      id: 'PVA-10',
      label: 'Wechselrichterleistung passt zur Modulleistung',
      severity: 'warn',
      basis: 'Auslegungsverhältnis von Generator- zu Wechselrichterleistung, Referenzband 0,8 bis 1,2',
      category: CAT_TECHNIK,
      instruction:
        'Setze die Modulleistung in kWp ins Verhältnis zur Wechselrichter-Nennleistung. Liegt der Wert außerhalb von 0,8 bis 1,2, nenne beide Zahlen und das Verhältnis. Formuliere als Abweichung vom Referenzband, nicht als Fehler.',
      euroImpact: [0, 1500],
    },
    {
      id: 'PVA-11',
      label: 'Speichergröße im Verhältnis zum Verbrauch',
      severity: 'info',
      basis: 'Marktübliche Auslegung, etwa 1 kWh nutzbare Kapazität je 1.000 kWh Jahresverbrauch',
      category: CAT_TECHNIK,
      instruction:
        'Nur prüfen, wenn ein Speicher angeboten wird und der Auftraggeber seinen Jahresverbrauch angegeben hat. Nenne das Verhältnis und stelle fest, wenn es deutlich außerhalb der genannten Orientierung liegt. Keine Empfehlung, keine Bewertung.',
      euroImpact: [0, 4000],
    },
    {
      id: 'PVA-12',
      label: 'Nutzbare gegen nominale Speicherkapazität',
      severity: 'warn',
      basis: 'Vergleichbarkeit der Angaben, nutzbare Kapazität ist die maßgebliche Größe',
      category: CAT_TECHNIK,
      instruction:
        'Prüfe, ob die Speicherkapazität als nutzbare oder als nominale Kapazität angegeben ist. Fehlt die Unterscheidung, ist das eine Feststellung, weil sie den Vergleich zweier Angebote unmöglich macht.',
      euroImpact: [0, 1500],
    },
    {
      id: 'PVA-13',
      label: 'Dachbelegung und Ausrichtung',
      severity: 'info',
      basis: 'Nachvollziehbarkeit der Ertragsannahme',
      category: CAT_TECHNIK,
      instruction:
        'Prüfe, ob Ausrichtung, Dachneigung und Belegungsplan genannt sind. Ohne diese Angaben ist eine Ertragsprognose nicht nachprüfbar.',
      euroImpact: [0, 0],
    },
    {
      id: 'PVA-14',
      label: 'Garantien der Komponenten benannt',
      severity: 'warn',
      basis: 'Herstellergarantie als Vertragsbestandteil, abzugrenzen von der Gewährleistung',
      category: CAT_TECHNIK,
      instruction:
        'Prüfe, ob Produktgarantie und Leistungsgarantie der Module sowie die Garantie des Wechselrichters mit Laufzeit genannt sind. Prüfe außerdem, ob zwischen Herstellergarantie und gesetzlicher Gewährleistung unterschieden wird.',
      euroImpact: [0, 2500],
    },

    /* ── Ertragsprognose ──────────────────────────────────────────────── */
    {
      id: 'PVA-20',
      label: 'Spezifischer Ertrag im plausiblen Bereich',
      severity: 'error',
      basis:
        'Referenzband für Deutschland, etwa 850 bis 1.100 kWh je kWp und Jahr je nach Standort und Ausrichtung — VOR LIVEGANG GEGEN AKTUELLE MARKTDATEN ZU PRÜFEN',
      category: CAT_ERTRAG,
      instruction:
        'Teile den prognostizierten Jahresertrag durch die Anlagenleistung in kWp. Liegt der Wert über 1.100, nenne ihn und stelle fest, dass er über dem Referenzband liegt. Nenne immer den errechneten Wert, nicht nur die Bewertung.',
      euroImpact: [200, 6000],
    },
    {
      id: 'PVA-21',
      label: 'Eigenverbrauchsquote begründet',
      severity: 'warn',
      basis: 'Nachvollziehbarkeit der Wirtschaftlichkeitsrechnung',
      category: CAT_ERTRAG,
      instruction:
        'Prüfe, ob das Angebot eine Eigenverbrauchsquote annimmt und ob es sagt, worauf sie beruht. Eine Quote ohne Lastprofil und ohne Verbrauchsangabe des Haushalts ist eine Annahme, keine Rechnung. Nenne die Zahl.',
      euroImpact: [200, 5000],
    },
    {
      id: 'PVA-22',
      label: 'Strompreissteigerung in der Amortisationsrechnung',
      severity: 'warn',
      basis: 'Nachvollziehbarkeit der Annahmen einer Wirtschaftlichkeitsrechnung',
      category: CAT_ERTRAG,
      instruction:
        'Prüfe, ob die Amortisationsrechnung eine jährliche Strompreissteigerung unterstellt und wie hoch sie ist. Nenne den Prozentsatz. Werte über 4 Prozent pro Jahr sind als Annahme zu kennzeichnen, nicht als Prognose.',
      euroImpact: [0, 3000],
    },
    {
      id: 'PVA-23',
      label: 'Einspeisevergütung mit Datum',
      severity: 'warn',
      basis: 'EEG, Vergütungssatz abhängig vom Zeitpunkt der Inbetriebnahme',
      category: CAT_ERTRAG,
      instruction:
        'Prüfe, ob der angesetzte Vergütungssatz mit Stand und Bezugsdatum genannt ist. Ein Satz ohne Datum ist nicht nachprüfbar, weil er sich mit dem Inbetriebnahmezeitpunkt ändert.',
      euroImpact: [0, 2000],
    },
    {
      id: 'PVA-24',
      label: 'Degradation der Module berücksichtigt',
      severity: 'info',
      basis: 'Übliche Annahme, jährlicher Leistungsrückgang im Bereich von 0,3 bis 0,5 Prozent',
      category: CAT_ERTRAG,
      instruction:
        'Prüfe, ob die Wirtschaftlichkeitsrechnung einen Leistungsrückgang über die Jahre ansetzt. Fehlt er, stelle das fest, ohne die Rechnung selbst zu korrigieren.',
      euroImpact: [0, 1500],
    },

    /* ── Preis ────────────────────────────────────────────────────────── */
    {
      id: 'PVA-30',
      label: 'Preis je kWp im Referenzband',
      severity: 'error',
      basis:
        'Marktübliches Band für schlüsselfertige Aufdachanlagen im Einfamilienhaus — VOR LIVEGANG MIT DATUM ZU HINTERLEGEN, danach halbjährlich zu prüfen',
      category: CAT_PREIS,
      instruction:
        'Teile den Gesamtpreis ohne Speicher durch die Anlagenleistung in kWp und nenne den Wert je kWp. Stelle ihn dem hinterlegten Referenzband gegenüber. Nenne immer die eigene Rechnung, damit sie nachvollziehbar ist.',
      euroImpact: [500, 8000],
    },
    {
      id: 'PVA-31',
      label: 'Speicherpreis getrennt ausgewiesen',
      severity: 'error',
      basis: 'Vergleichbarkeit zweier Angebote',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob der Speicher als eigene Position mit eigenem Preis ausgewiesen ist. Ein Gesamtpreis für Anlage und Speicher macht jeden Vergleich unmöglich. Nenne die Position wörtlich.',
      euroImpact: [0, 4000],
    },
    {
      id: 'PVA-32',
      label: 'Umsatzsteuer korrekt behandelt',
      severity: 'warn',
      basis:
        '§ 12 Abs. 3 UStG, Nullsteuersatz für die Lieferung und Installation bestimmter Photovoltaikanlagen — ANWALTLICH ODER STEUERLICH ZU BESTÄTIGEN: Voraussetzungen im Einzelfall',
      category: CAT_PREIS,
      instruction:
        'Prüfe, ob das Angebot Umsatzsteuer ausweist und in welcher Höhe. Weist es 19 Prozent aus, stelle das als Feststellung mit Verweis auf steuerliche Klärung dar. Beurteile nicht selbst, ob der Nullsteuersatz greift.',
      euroImpact: [500, 6000],
    },
    {
      id: 'PVA-33',
      label: 'Zahlungsplan und Anzahlungshöhe',
      severity: 'error',
      basis: '§ 632a BGB, bei Verbraucherbauverträgen zusätzlich § 650m BGB',
      category: CAT_PREIS,
      instruction:
        'Prüfe, welche Anzahlung verlangt wird und ob weitere Raten an einen Leistungsfortschritt gekoppelt sind. Eine Anzahlung über 30 Prozent ohne Sicherheit ist eine Feststellung; nenne den Prozentsatz und den Betrag.',
      euroImpact: [500, 15000],
    },
    {
      id: 'PVA-34',
      label: 'Preisvorbehalt oder Preisgleitklausel',
      severity: 'warn',
      basis:
        '§§ 307 ff. BGB — ANWALTLICH ZU BESTÄTIGEN: Bewertung von Preisanpassungsklauseln gegenüber Verbrauchern',
      category: CAT_PREIS,
      instruction:
        'Sammle Klauseln, die eine spätere Preisanpassung erlauben (Materialkosten, Wechselkurse, Verfügbarkeit). Nenne sie wörtlich. Stelle fest, dass der genannte Preis dadurch nicht fest ist, ohne die Klausel zu bewerten.',
      euroImpact: [0, 5000],
    },
    {
      id: 'PVA-35',
      label: 'Rechnerische Richtigkeit',
      severity: 'error',
      basis: 'Addition der Einzelpositionen gegen die Endsumme',
      category: CAT_PREIS,
      instruction:
        'Addiere die Einzelpositionen und vergleiche mit der ausgewiesenen Endsumme. Weicht die vom Auftraggeber genannte Summe von der gelesenen ab, gehe von einem Lesefehler auf deiner Seite aus.',
      euroImpact: [50, 3000],
    },

    /* ── Vertragliches ────────────────────────────────────────────────── */
    {
      id: 'PVA-40',
      label: 'Bindefrist und Gültigkeit des Angebots',
      severity: 'info',
      basis: '§ 145 BGB, Bindung an das Angebot',
      category: CAT_VERTRAG,
      instruction:
        'Prüfe, ob eine Gültigkeitsdauer genannt ist. Fehlt sie, stelle das fest.',
      euroImpact: [0, 0],
    },
    {
      id: 'PVA-41',
      label: 'Liefer- und Montagetermin',
      severity: 'warn',
      basis: 'Bestimmtheit der Leistungszeit, § 271 BGB',
      category: CAT_VERTRAG,
      instruction:
        'Prüfe, ob ein Zeitraum für Lieferung und Montage genannt ist und ob er verbindlich formuliert ist. „Voraussichtlich" oder „nach Verfügbarkeit" ist keine verbindliche Angabe.',
      euroImpact: [0, 1000],
    },
    {
      id: 'PVA-42',
      label: 'Widerrufsbelehrung bei Vertragsschluss außerhalb von Geschäftsräumen',
      severity: 'warn',
      basis:
        '§§ 312b, 312g BGB — ANWALTLICH ZU BESTÄTIGEN: Anwendungsbereich bei Beratung beim Kunden zu Hause und Anforderungen an die Belehrung',
      category: CAT_VERTRAG,
      instruction:
        'Nur prüfen, wenn der Auftraggeber angegeben hat, dass der Vertrag zu Hause oder telefonisch angebahnt wurde. Prüfe, ob eine Widerrufsbelehrung beiliegt. Stelle fest, ob sie vorhanden ist; bewerte sie nicht.',
      euroImpact: [0, 0],
    },
  ],
};

export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH') || c.basis.includes('STEUERLICH') || c.basis.includes('MARKTDATEN'))
  .map((c) => c.id);
