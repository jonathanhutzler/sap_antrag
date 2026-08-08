import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Architekten- und Ingenieurhonorar — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Der zentrale Punkt, an dem die meisten Ratgeber im Netz falsch liegen:
 * Seit dem Urteil des EuGH vom 04.07.2019 (C-377/17) und der HOAI 2021 sind
 * die Honorartafeln keine verbindlichen Mindest- und Höchstsätze mehr. Sie
 * sind Orientierungswerte. Wer eine Rechnung mit „unterschreitet den
 * Mindestsatz" beanstandet, argumentiert nach altem Recht.
 *
 * Was bleibt: Wenn die Parteien die HOAI vereinbart haben, gilt sie als
 * Vertragsinhalt, und dann ist jede Rechnung daran messbar. Genau darauf
 * zielt dieser Katalog — auf die Prüfbarkeit gegen das, was vereinbart wurde,
 * nicht auf eine gesetzliche Preisbindung, die es nicht mehr gibt.
 *
 * Jeder Punkt mit „ANWALTLICH ZU BESTÄTIGEN" gehört vor dem Livegang über den
 * Tisch einer Fachanwältin oder eines Fachanwalts für Bau- und
 * Architektenrecht.
 */

const CAT_FORM = 'Form und Prüfbarkeit';
const CAT_GRUNDLAGE = 'Honorargrundlage';
const CAT_LEISTUNG = 'Leistungsumfang';
const CAT_NEBEN = 'Nebenkosten und Zuschläge';
const CAT_ZAHLUNG = 'Zahlungen und Verrechnung';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Form und Prüfbarkeit ──────────────────────────────────────────── */
    {
      id: 'ARC-01',
      label: 'Pflichtangaben der Rechnung',
      severity: 'warn',
      basis: '§ 14 Abs. 4 UStG',
      category: CAT_FORM,
      instruction:
        'Prüfe die Pflichtangaben: Name und Anschrift beider Seiten, Steuernummer oder USt-IdNr., Rechnungsdatum, fortlaufende Rechnungsnummer, Art und Umfang der Leistung, Leistungszeitraum, Entgelt und Steuerbetrag getrennt. Nenne jede fehlende Angabe einzeln.',
      euroImpact: [0, 0],
    },
    {
      id: 'ARC-02',
      label: 'Prüffähigkeit der Honorarschlussrechnung',
      severity: 'error',
      basis:
        '§ 15 Abs. 1 HOAI — ANWALTLICH ZU BESTÄTIGEN: Reichweite der Prüffähigkeit und die Folge für die Fälligkeit',
      category: CAT_FORM,
      instruction:
        'Eine Honorarschlussrechnung ist prüffähig, wenn sie die anrechenbaren Kosten, die Honorarzone, den Honorarsatz, die abgerechneten Leistungsphasen mit ihren Prozentsätzen und die Nebenkosten nachvollziehbar ausweist. Prüfe, welche dieser Angaben fehlen. Formuliere als Feststellung, dass die Angabe fehlt, nicht als Aussage über Fälligkeit.',
      euroImpact: [0, 0],
    },
    {
      id: 'ARC-03',
      label: 'Bezug zum Vertrag',
      severity: 'warn',
      basis: '§ 650q i. V. m. § 631 BGB',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob die Rechnung auf den Architektenvertrag Bezug nimmt und ob die abgerechneten Leistungen den dort beauftragten entsprechen. Fehlt der Bezug oder tauchen Leistungen auf, die im Vertrag nicht stehen, ist das eine Feststellung.',
      euroImpact: [0, 0],
    },

    /* ── Honorargrundlage. Hier liegt der Euro-Hebel. ──────────────────── */
    {
      id: 'ARC-10',
      label: 'Anrechenbare Kosten nachvollziehbar',
      severity: 'error',
      basis: '§ 4 HOAI 2021, Kostenermittlung nach DIN 276',
      category: CAT_GRUNDLAGE,
      instruction:
        'Die anrechenbaren Kosten sind die größte Stellschraube des Honorars. Prüfe, ob die Rechnung sie beziffert, auf welche Kostenermittlung sie sich stützt (Kostenberechnung, Kostenanschlag, Kostenfeststellung) und ob dieselbe Grundlage über alle Leistungsphasen verwendet wird. Ein Wechsel der Grundlage mitten in der Rechnung ist eine Feststellung.',
      euroImpact: [200, 4000],
    },
    {
      id: 'ARC-11',
      label: 'Mitverarbeitete Bausubstanz',
      severity: 'warn',
      basis:
        '§ 4 Abs. 3 HOAI 2021 — ANWALTLICH ZU BESTÄTIGEN: Voraussetzungen einer schriftlichen Vereinbarung und Umfang der Anrechnung',
      category: CAT_GRUNDLAGE,
      instruction:
        'Bei Umbau und Modernisierung kann vorhandene Bausubstanz angemessen berücksichtigt werden. Prüfe, ob die Rechnung einen solchen Ansatz enthält, ob er beziffert ist und ob im Vertrag eine Vereinbarung dazu steht. Ein Ansatz ohne vertragliche Grundlage ist eine Nachfrage wert.',
      euroImpact: [150, 3000],
    },
    {
      id: 'ARC-12',
      label: 'Honorarzone begründet',
      severity: 'warn',
      basis: '§ 5 HOAI 2021 mit den Bewertungsmerkmalen der Anlagen',
      category: CAT_GRUNDLAGE,
      instruction:
        'Prüfe, welche Honorarzone angesetzt ist und ob die Rechnung oder der Vertrag die Einordnung begründet. Eine höhere Zone hebt das Honorar deutlich. Fehlt die Begründung, ist das eine Feststellung; die fachliche Richtigkeit der Einordnung beurteilst du nicht.',
      euroImpact: [200, 3500],
    },
    {
      id: 'ARC-13',
      label: 'Honorarsatz und vereinbartes Honorar',
      severity: 'error',
      basis:
        'HOAI 2021 §§ 7, 35 — die Honorartafeln sind seit EuGH C-377/17 vom 04.07.2019 keine verbindlichen Mindest- und Höchstsätze mehr, sondern Orientierungswerte. ANWALTLICH ZU BESTÄTIGEN: Formulierung der Feststellung',
      category: CAT_GRUNDLAGE,
      instruction:
        'Prüfe, welches Honorar der Vertrag vereinbart und ob die Rechnung diesem Vertrag folgt. Weicht die Rechnung von der Vereinbarung ab, ist das die Feststellung. Formuliere niemals, ein Satz sei zu hoch oder unterschreite einen Mindestsatz — eine gesetzliche Preisbindung besteht nicht mehr. Ohne Honorarvereinbarung gilt die übliche Vergütung; nenne das als Hinweis und verweise auf anwaltliche Klärung.',
      euroImpact: [200, 5000],
    },
    {
      id: 'ARC-14',
      label: 'Rechenweg vom Kostenansatz zum Honorar',
      severity: 'warn',
      basis: '§ 15 Abs. 1 HOAI, Nachvollziehbarkeit der Herleitung',
      category: CAT_GRUNDLAGE,
      instruction:
        'Rechne den ausgewiesenen Weg nach, soweit die Rechnung ihn offenlegt: anrechenbare Kosten, Honorarzone, Tafelwert, Interpolation, Summe. Weicht das Ergebnis von der ausgewiesenen Summe ab, nenne beide Zahlen und die Differenz. Wenn Angaben fehlen, stelle das fest und rechne nicht mit angenommenen Werten.',
      euroImpact: [100, 2500],
    },

    /* ── Leistungsumfang ──────────────────────────────────────────────── */
    {
      id: 'ARC-20',
      label: 'Leistungsphasen einzeln ausgewiesen',
      severity: 'error',
      basis: '§ 34 HOAI 2021 mit Anlage 10, Leistungsbild Gebäude',
      category: CAT_LEISTUNG,
      instruction:
        'Prüfe, ob die Rechnung die abgerechneten Leistungsphasen einzeln mit ihrem Prozentsatz ausweist. Eine Sammelposition über mehrere Phasen macht die Rechnung unprüfbar. Nenne die Position wörtlich.',
      euroImpact: [0, 0],
    },
    {
      id: 'ARC-21',
      label: 'Nicht erbrachte Leistungen abgerechnet',
      severity: 'error',
      basis:
        '§ 631 BGB — ANWALTLICH ZU BESTÄTIGEN: Umgang mit teilweise erbrachten Leistungsphasen und die Bewertung von Teilleistungen',
      category: CAT_LEISTUNG,
      instruction:
        'Vergleiche die abgerechneten Leistungsphasen mit den Angaben des Auftraggebers dazu, welche Leistungen tatsächlich erbracht wurden. Rechnet die Rechnung eine Phase voll ab, die nach diesen Angaben nur teilweise erbracht wurde, ist das eine Feststellung mit Verweis auf Klärung.',
      euroImpact: [300, 6000],
    },
    {
      id: 'ARC-22',
      label: 'Besondere Leistungen ohne Vereinbarung',
      severity: 'warn',
      basis: '§ 3 Abs. 3 HOAI 2021',
      category: CAT_LEISTUNG,
      instruction:
        'Besondere Leistungen sind gesondert zu vereinbaren. Prüfe, ob die Rechnung solche Positionen enthält und ob im Vertrag eine Vereinbarung dazu steht. Fehlt sie, ist das eine Nachfrage.',
      euroImpact: [150, 2500],
    },
    {
      id: 'ARC-23',
      label: 'Doppelte Abrechnung derselben Leistung',
      severity: 'error',
      basis: 'Vertragsauslegung, keine Vergütung derselben Leistung zweimal',
      category: CAT_LEISTUNG,
      instruction:
        'Prüfe, ob eine Leistung sowohl innerhalb einer Leistungsphase als auch als besondere Leistung oder Nebenkostenposition auftaucht. Nenne beide Positionen wörtlich.',
      euroImpact: [100, 2000],
    },
    {
      id: 'ARC-24',
      label: 'Zeithonorar ohne Nachweis',
      severity: 'warn',
      basis: '§ 6 Abs. 3 HOAI 2021 in Verbindung mit der Honorarvereinbarung',
      category: CAT_LEISTUNG,
      instruction:
        'Bei Abrechnung nach Zeit prüfe, ob Stundensatz, Anzahl der Stunden und die Tätigkeit je Stunde ausgewiesen sind. Eine Zeitabrechnung ohne Tätigkeitsnachweis ist eine Feststellung.',
      euroImpact: [100, 2000],
    },

    /* ── Nebenkosten und Zuschläge ────────────────────────────────────── */
    {
      id: 'ARC-30',
      label: 'Nebenkosten pauschal ohne Vereinbarung',
      severity: 'warn',
      basis: '§ 14 HOAI 2021',
      category: CAT_NEBEN,
      instruction:
        'Nebenkosten können einzeln nachgewiesen oder pauschal vereinbart werden. Prüfe, welcher Weg gewählt wurde und ob er zum Vertrag passt. Eine Pauschale ohne Vereinbarung ist eine Nachfrage; ein Einzelnachweis ohne Belege ebenfalls.',
      euroImpact: [50, 900],
    },
    {
      id: 'ARC-31',
      label: 'Umbauzuschlag',
      severity: 'warn',
      basis:
        '§ 6 Abs. 2 HOAI 2021 — ANWALTLICH ZU BESTÄTIGEN: Voraussetzungen des Zuschlags und die Frage der schriftlichen Vereinbarung',
      category: CAT_NEBEN,
      instruction:
        'Prüfe, ob ein Umbauzuschlag angesetzt ist, in welcher Höhe und ob der Vertrag ihn vorsieht. Nenne den Prozentsatz und den Eurobetrag, den er ausmacht.',
      euroImpact: [100, 2500],
    },
    {
      id: 'ARC-32',
      label: 'Umsatzsteuer korrekt ausgewiesen',
      severity: 'warn',
      basis: '§ 14 Abs. 4 Nr. 8 UStG',
      category: CAT_NEBEN,
      instruction:
        'Prüfe, ob der Steuersatz und der Steuerbetrag ausgewiesen sind und ob der Steuerbetrag zur Bemessungsgrundlage passt. Rechne nach.',
      euroImpact: [20, 800],
    },

    /* ── Zahlungen und Verrechnung ────────────────────────────────────── */
    {
      id: 'ARC-40',
      label: 'Abschlagszahlungen abgezogen',
      severity: 'error',
      basis: '§ 632a BGB, bei Verbrauchern zusätzlich § 650m BGB',
      category: CAT_ZAHLUNG,
      instruction:
        'Vergleiche die Summe der vom Auftraggeber genannten Abschlagszahlungen mit den in der Schlussrechnung abgezogenen Beträgen. Fehlt ein Abzug oder ist er zu niedrig, beziffere die Differenz.',
      euroImpact: [200, 8000],
    },
    {
      id: 'ARC-41',
      label: 'Skonto oder Nachlass berücksichtigt',
      severity: 'info',
      basis: 'Vereinbarung im Vertrag oder Angebot',
      category: CAT_ZAHLUNG,
      instruction:
        'Prüfe, ob ein vereinbarter Nachlass oder Skonto in der Rechnung berücksichtigt ist. Nur prüfen, wenn der Auftraggeber eine solche Vereinbarung angegeben hat.',
      euroImpact: [50, 1500],
    },
    {
      id: 'ARC-42',
      label: 'Rechnerische Richtigkeit',
      severity: 'error',
      basis: 'Addition der Einzelpositionen gegen die Endsumme',
      category: CAT_ZAHLUNG,
      instruction:
        'Addiere die Einzelpositionen und vergleiche mit der ausgewiesenen Endsumme. Weicht die vom Auftraggeber genannte Endsumme von der gelesenen ab, gehe von einem Lesefehler auf deiner Seite aus und sage das ausdrücklich.',
      euroImpact: [20, 2000],
    },
  ],
};

/**
 * Prüfpunkte, deren `basis` vor dem Livegang anwaltlich zu bestätigen ist.
 * Wird von check:niches gelesen.
 */
export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH'))
  .map((c) => c.id);
