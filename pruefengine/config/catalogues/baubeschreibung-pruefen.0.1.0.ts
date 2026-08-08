import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Baubeschreibung — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Diese Nische hat einen ungewöhnlich harten gesetzlichen Kern: Art. 249
 * EGBGB listet für Verbraucherbauverträge auf, was in einer Baubeschreibung
 * stehen muss. Die Liste ist abschließend formuliert und damit prüfbar wie
 * eine Checkliste. Das ist der Grund, warum die Nische überhaupt trägt.
 *
 * Der zweite Kern ist § 650k Abs. 2 BGB: Unklarheiten in der Baubeschreibung
 * gehen zulasten des Unternehmers. Eine Lücke ist deshalb kein Schönheits-
 * fehler, sondern wirkt sich später auf den Leistungsumfang aus.
 *
 * Wichtige Grenze, die im Prompt und im Bericht stehen muss: Der Bericht
 * prüft, ob eine Angabe vorhanden und in sich schlüssig ist. Er beurteilt
 * nicht, ob eine bauliche Ausführung fachlich richtig ist. Dafür braucht es
 * einen Bausachverständigen, und das gehört auch so gesagt.
 */

const CAT_PFLICHT = 'Pflichtangaben';
const CAT_UMFANG = 'Leistungsumfang';
const CAT_ZAHLUNG = 'Zahlungsplan und Sicherheit';
const CAT_FRIST = 'Bauzeit und Fristen';
const CAT_KLARHEIT = 'Klarheit und Widersprüche';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Pflichtangaben nach Art. 249 § 2 Abs. 1 EGBGB ─────────────────── */
    {
      id: 'BBS-01',
      label: 'Art und Umfang der angebotenen Leistungen',
      severity: 'error',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 1 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob die Baubeschreibung Art und Umfang der angebotenen Leistungen beschreibt, gegebenenfalls mit Plänen zu Bauart, Bauweise und Baukonstruktion und mit Angaben zu den Bauteilen. Fehlt der Abschnitt oder bleibt er bei Schlagworten, ist das eine Feststellung.',
      euroImpact: [0, 0],
    },
    {
      id: 'BBS-02',
      label: 'Gebäudedaten, Pläne, Raum- und Flächenangaben',
      severity: 'error',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 2 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob Gebäudetyp und Bauweise, Grundrisse mit Raumangaben sowie Flächen genannt sind. Nenne, welche dieser Angaben fehlen.',
      euroImpact: [0, 0],
    },
    {
      id: 'BBS-03',
      label: 'Angaben zur Gründung und zum Baugrund',
      severity: 'error',
      basis:
        'Art. 249 § 2 Abs. 1 Nr. 3 EGBGB — ANWALTLICH ZU BESTÄTIGEN: Abgrenzung, welche Baugrundangaben geschuldet sind und wer das Baugrundrisiko trägt',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob die Baubeschreibung Angaben zur Gründung enthält und ob erkennbar ist, von welchem Baugrund ausgegangen wird. Prüfe außerdem, ob ein Bodengutachten vorausgesetzt wird und wer es beibringt. Formuliere als Feststellung zur Angabe, nicht als Aussage zur Risikoverteilung.',
      euroImpact: [500, 25000],
    },
    {
      id: 'BBS-04',
      label: 'Bauphysikalische Kennwerte',
      severity: 'warn',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 4 EGBGB, Schall- und Wärmeschutz',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob Angaben zum Schallschutz und zum Wärmeschutz vorhanden sind, mit Kennwerten und nicht nur als Zusicherung, die geltenden Vorschriften würden eingehalten. Ein bloßer Verweis auf „nach den anerkannten Regeln der Technik" ist keine Angabe.',
      euroImpact: [0, 0],
    },
    {
      id: 'BBS-05',
      label: 'Beschreibung der Innenausstattung',
      severity: 'error',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 5 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob die Innenausstattung beschrieben ist: Bodenbeläge, Wandoberflächen, Türen, Sanitärobjekte, Fliesen. Achte besonders auf Budgetangaben ohne Produktbeschreibung, etwa „Sanitärobjekte im Wert von 3.000 Euro". Nenne solche Positionen wörtlich.',
      euroImpact: [500, 20000],
    },
    {
      id: 'BBS-06',
      label: 'Beschreibung der technischen Anlagen',
      severity: 'error',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 6 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob Heizung, Lüftung, Elektroinstallation und Sanitärinstallation beschrieben sind, mit Leistungsdaten und Anzahl. Bei der Elektroinstallation gehört die Anzahl der Steckdosen und Schalterstellen je Raum dazu; fehlt sie, ist das eine Feststellung.',
      euroImpact: [500, 25000],
    },
    {
      id: 'BBS-07',
      label: 'Angaben zu Qualitätsmerkmalen',
      severity: 'warn',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 7 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob die Baubeschreibung Qualitätsmerkmale nennt, denen das Gebäude genügen soll. Ein pauschaler Verweis auf die anerkannten Regeln der Technik ohne konkretes Merkmal ist eine Feststellung.',
      euroImpact: [0, 0],
    },
    {
      id: 'BBS-08',
      label: 'Sanitärobjekte, Armaturen, Elektroanlage, Bodenbelag im Einzelnen',
      severity: 'error',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 8 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Diese Gewerke verlangt das Gesetz ausdrücklich einzeln beschrieben. Prüfe jedes davon und nenne, welches fehlt oder nur pauschal erwähnt wird.',
      euroImpact: [500, 15000],
    },
    {
      id: 'BBS-09',
      label: 'Erdarbeiten, Außenanlagen und Erschließung',
      severity: 'warn',
      basis: 'Art. 249 § 2 Abs. 1 Nr. 9 EGBGB',
      category: CAT_PFLICHT,
      instruction:
        'Prüfe, ob beschrieben ist, welche Erd- und Außenarbeiten enthalten sind und welche Hausanschlüsse zum Leistungsumfang gehören. Erschließungskosten sind ein häufiger Streitpunkt; fehlt die Zuordnung, ist das eine Feststellung.',
      euroImpact: [1000, 30000],
    },

    /* ── Leistungsumfang ───────────────────────────────────────────────── */
    {
      id: 'BBS-20',
      label: 'Ausschlüsse und Eigenleistungen benannt',
      severity: 'error',
      basis: '§ 650k Abs. 2 BGB, Unklarheiten gehen zulasten des Unternehmers',
      category: CAT_UMFANG,
      instruction:
        'Prüfe, ob eindeutig steht, was nicht enthalten ist. Sammle alle Positionen, die als Eigenleistung, bauseits oder optional gekennzeichnet sind. Eine Leistung, die weder als enthalten noch als ausgeschlossen erkennbar ist, ist der wichtigste Fund dieser Prüfung.',
      euroImpact: [1000, 40000],
    },
    {
      id: 'BBS-21',
      label: 'Budget- und Wertangaben statt Beschreibung',
      severity: 'error',
      basis:
        'Art. 249 § 2 Abs. 1 EGBGB — ANWALTLICH ZU BESTÄTIGEN: Ob und wann eine Budgetangabe die geschuldete Beschreibung ersetzen kann',
      category: CAT_UMFANG,
      instruction:
        'Sammle jede Position, die statt einer Beschreibung nur einen Geldbetrag nennt („Fliesen bis 25 Euro je Quadratmeter", „Küchenbudget 8.000 Euro"). Nenne sie wörtlich und beziffere, welcher Anteil der Bausumme so beschrieben ist.',
      euroImpact: [500, 30000],
    },
    {
      id: 'BBS-22',
      label: 'Mengenangaben vorhanden',
      severity: 'warn',
      basis: 'Prüfbarkeit der Leistung, Art. 249 § 2 Abs. 1 EGBGB',
      category: CAT_UMFANG,
      instruction:
        'Prüfe, ob zu den beschriebenen Leistungen Mengen genannt sind, etwa Quadratmeter Fliesenfläche, laufende Meter Sockelleiste, Stückzahlen. Ohne Menge lässt sich eine Nachtragsforderung später nicht bestreiten.',
      euroImpact: [300, 8000],
    },

    /* ── Bauzeit ──────────────────────────────────────────────────────── */
    {
      id: 'BBS-30',
      label: 'Verbindliche Angabe zur Bauzeit',
      severity: 'error',
      basis: 'Art. 249 § 2 Abs. 2 EGBGB',
      category: CAT_FRIST,
      instruction:
        'Die Baubeschreibung muss verbindliche Angaben zum Zeitpunkt der Fertigstellung enthalten; steht der Baubeginn noch nicht fest, muss die Dauer der Bauausführung angegeben werden. Prüfe, ob eine solche Angabe vorhanden und verbindlich formuliert ist. „Voraussichtlich" oder „nach Baufortschritt" ist keine verbindliche Angabe.',
      euroImpact: [0, 0],
    },
    {
      id: 'BBS-31',
      label: 'Vorbehalte, die die Bauzeit aushebeln',
      severity: 'warn',
      basis:
        '§§ 307 ff. BGB — ANWALTLICH ZU BESTÄTIGEN: Bewertung von Vorbehaltsklauseln zur Bauzeit in Allgemeinen Geschäftsbedingungen',
      category: CAT_FRIST,
      instruction:
        'Sammle Klauseln, die die Bauzeitangabe unter Vorbehalt stellen (Witterung, Lieferengpässe, behördliche Genehmigungen). Nenne sie wörtlich und stelle fest, dass sie die verbindliche Angabe relativieren. Bewerte ihre Wirksamkeit nicht.',
      euroImpact: [0, 0],
    },

    /* ── Zahlungsplan ─────────────────────────────────────────────────── */
    {
      id: 'BBS-40',
      label: 'Abschlagszahlungen der Höhe nach',
      severity: 'error',
      basis: '§ 650m Abs. 1 BGB, insgesamt höchstens 90 Prozent der Gesamtvergütung',
      category: CAT_ZAHLUNG,
      instruction:
        'Addiere die Abschlagszahlungen des Zahlungsplans und setze sie ins Verhältnis zur Gesamtvergütung. Übersteigt die Summe der Abschläge 90 Prozent, nenne den Prozentsatz und den Eurobetrag der Überschreitung.',
      euroImpact: [1000, 30000],
    },
    {
      id: 'BBS-41',
      label: 'Sicherheit für die rechtzeitige Herstellung',
      severity: 'error',
      basis: '§ 650m Abs. 2 BGB, fünf Prozent der vereinbarten Gesamtvergütung',
      category: CAT_ZAHLUNG,
      instruction:
        'Prüfe, ob dem Verbraucher bei der ersten Abschlagszahlung eine Sicherheit in Höhe von fünf Prozent der Gesamtvergütung gestellt wird. Fehlt die Regelung im Vertrag oder in der Baubeschreibung, ist das eine Feststellung.',
      euroImpact: [1000, 20000],
    },
    {
      id: 'BBS-42',
      label: 'Zahlungsplan an Baufortschritt gekoppelt',
      severity: 'warn',
      basis: '§ 632a Abs. 1 BGB, Wertzuwachs beim Besteller',
      category: CAT_ZAHLUNG,
      instruction:
        'Prüfe, ob die einzelnen Raten an einen erkennbaren Baufortschritt geknüpft sind. Raten nach Kalenderdaten ohne Bezug zum Bautenstand sind eine Feststellung.',
      euroImpact: [500, 15000],
    },

    /* ── Klarheit ─────────────────────────────────────────────────────── */
    {
      id: 'BBS-50',
      label: 'Widersprüche zwischen Dokumenten',
      severity: 'error',
      basis: '§ 650k Abs. 2 BGB',
      category: CAT_KLARHEIT,
      instruction:
        'Wurden mehrere Dokumente hochgeladen, vergleiche sie: Baubeschreibung gegen Vertrag, Vertrag gegen Zahlungsplan, Beschreibung gegen Plan. Nenne jeden Widerspruch mit beiden Fundstellen im Wortlaut.',
      euroImpact: [500, 20000],
    },
    {
      id: 'BBS-51',
      label: 'Änderungsvorbehalt des Unternehmers',
      severity: 'warn',
      basis:
        '§§ 307 ff. BGB — ANWALTLICH ZU BESTÄTIGEN: Bewertung von Änderungsvorbehalten zu Material und Ausführung',
      category: CAT_KLARHEIT,
      instruction:
        'Sammle Klauseln, die dem Unternehmer erlauben, Material oder Ausführung durch Gleichwertiges zu ersetzen. Nenne sie wörtlich. Bewerte ihre Wirksamkeit nicht, sondern stelle fest, dass sie den beschriebenen Umfang veränderlich machen.',
      euroImpact: [0, 0],
    },
    {
      id: 'BBS-52',
      label: 'Widerrufsbelehrung beim Verbraucherbauvertrag',
      severity: 'warn',
      basis:
        '§ 650l BGB in Verbindung mit Art. 249 § 3 EGBGB — ANWALTLICH ZU BESTÄTIGEN: Anforderungen an die Belehrung und die Folgen eines Fehlers',
      category: CAT_KLARHEIT,
      instruction:
        'Prüfe, ob eine Widerrufsbelehrung beiliegt und ob sie eine Frist nennt. Stelle nur fest, ob sie vorhanden ist und was sie sagt. Bewerte ihre Richtigkeit nicht und leite daraus keine Widerrufsmöglichkeit ab.',
      euroImpact: [0, 0],
    },
  ],
};

export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH'))
  .map((c) => c.id);
