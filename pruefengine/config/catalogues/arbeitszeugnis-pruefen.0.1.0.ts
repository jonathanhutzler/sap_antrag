import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Arbeitszeugnis — Version 0.1.0.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARBEITSGRUNDLAGE. NICHT FREIGEGEBEN.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Die Nische mit der schärfsten Formulierungsgrenze der ganzen Engine.
 *
 * Ein Arbeitszeugnis wird in Codes geschrieben. Die verbreiteten
 * Übersetzungstabellen („stets zu unserer vollsten Zufriedenheit" gleich
 * Note 1) stammen aus der Rechtsprechung und aus der Praxis, sind aber keine
 * Norm. Ein Bericht, der einem Zeugnis eine Note zuweist und daraus einen
 * Anspruch ableitet, betreibt Rechtsberatung. Deshalb gilt hier:
 *
 *   Der Bericht sagt, welche Formulierung im Zeugnis steht und welcher
 *   Einordnung sie in der gängigen Zeugnissprache entspricht. Er sagt nicht,
 *   welche Note dem Arbeitnehmer zusteht und ob er eine Änderung verlangen
 *   kann.
 *
 * Zwei Punkte, an denen viele Ratgeber falsch liegen und die deshalb im
 * Katalog stehen:
 *
 * 1. Auf eine Schlussformel mit Dank und guten Wünschen besteht kein
 *    Anspruch (BAG, Urteil vom 11.12.2012 – 9 AZR 227/11). Ihr Fehlen ist
 *    ein Hinweis, keine Beanstandung.
 * 2. Die Beweislast ist geteilt: Für eine Bewertung besser als „befriedigend"
 *    trägt der Arbeitnehmer die Darlegungslast (BAG, Urteil vom 18.11.2014 –
 *    9 AZR 584/13). Das gehört in die Einordnung, damit niemand mit falschen
 *    Erwartungen in ein Gespräch geht.
 *
 * Beide Fundstellen sind vor dem Livegang anwaltlich zu bestätigen.
 */

const CAT_FORM = 'Form und Pflichtangaben';
const CAT_INHALT = 'Inhaltliche Vollständigkeit';
const CAT_BEWERTUNG = 'Leistungs- und Verhaltensbeurteilung';
const CAT_SPRACHE = 'Zeugnissprache';
const CAT_SCHLUSS = 'Schlussteil';

export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    /* ── Form ─────────────────────────────────────────────────────────── */
    {
      id: 'AZG-01',
      label: 'Schriftform und Firmenpapier',
      severity: 'error',
      basis: '§ 109 Abs. 1 Satz 1 GewO, § 109 Abs. 3 GewO schließt die elektronische Form aus',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob das Zeugnis auf Geschäftspapier des Arbeitgebers erstellt und unterschrieben ist. Nenne, was fehlt.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-02',
      label: 'Vollständige Personalien und Beschäftigungszeit',
      severity: 'error',
      basis: '§ 109 Abs. 1 Satz 2 GewO, Angaben zu Art und Dauer der Tätigkeit',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob Name, Geburtsdatum sowie Beginn und Ende des Arbeitsverhältnisses genannt sind. Prüfe außerdem, ob das genannte Enddatum zu der Angabe des Auftraggebers passt.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-03',
      label: 'Ausstellungsdatum passt zum Austrittsdatum',
      severity: 'warn',
      basis:
        'Grundsatz der Zeugnisklarheit, § 109 Abs. 2 GewO — ANWALTLICH ZU BESTÄTIGEN: Ab welcher Abweichung ein späteres Ausstellungsdatum als nachteilig gilt',
      category: CAT_FORM,
      instruction:
        'Vergleiche das Ausstellungsdatum mit dem Ende des Arbeitsverhältnisses. Liegt es deutlich später, nenne beide Daten und den Abstand. Formuliere als Feststellung zum Datum, nicht als Aussage über eine Rechtsfolge.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-04',
      label: 'Unterschrift mit Funktionsangabe',
      severity: 'warn',
      basis: 'Grundsatz der Zeugnisklarheit, § 109 Abs. 2 GewO',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob die unterzeichnende Person mit Namen und Funktion genannt ist. Eine Unterschrift von jemandem, der hierarchisch unter dem Beurteilten steht, ist eine Feststellung.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-05',
      label: 'Rechtschreibung, Streichungen, äußeres Bild',
      severity: 'warn',
      basis: 'Grundsatz der Zeugnisklarheit, § 109 Abs. 2 GewO',
      category: CAT_FORM,
      instruction:
        'Sammle Rechtschreib- und Grammatikfehler, auffällige Formatierungen, Streichungen und Auslassungen. Nenne jede Fundstelle wörtlich.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-06',
      label: 'Einfaches oder qualifiziertes Zeugnis',
      severity: 'error',
      basis: '§ 109 Abs. 1 Satz 3 GewO, Anspruch auf Erstreckung auf Leistung und Verhalten',
      category: CAT_FORM,
      instruction:
        'Prüfe, ob das Zeugnis Leistung und Verhalten bewertet. Enthält es nur Angaben zu Art und Dauer der Tätigkeit, ist es ein einfaches Zeugnis; stelle das fest und weise darauf hin, dass ein qualifiziertes Zeugnis verlangt werden kann.',
      euroImpact: [0, 0],
    },

    /* ── Inhalt ───────────────────────────────────────────────────────── */
    {
      id: 'AZG-10',
      label: 'Tätigkeitsbeschreibung vollständig',
      severity: 'error',
      basis: '§ 109 Abs. 1 Satz 2 GewO, Art der Tätigkeit',
      category: CAT_INHALT,
      instruction:
        'Vergleiche die im Zeugnis beschriebenen Aufgaben mit den Angaben des Auftraggebers zu seiner Tätigkeit. Nenne jede wesentliche Aufgabe, die im Zeugnis fehlt, und jede Aufgabe im Zeugnis, die nach diesen Angaben nicht zutrifft.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-11',
      label: 'Position und Verantwortung erkennbar',
      severity: 'warn',
      basis: 'Zeugnisklarheit, § 109 Abs. 2 GewO',
      category: CAT_INHALT,
      instruction:
        'Prüfe, ob Position, Weisungsbefugnis und Verantwortungsumfang erkennbar sind. Bei Führungsaufgaben prüfe, ob die Anzahl der geführten Mitarbeiter genannt ist.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-12',
      label: 'Zeugnis in der Länge angemessen',
      severity: 'info',
      basis: 'Verhältnis von Beschäftigungsdauer zu Umfang des Zeugnisses',
      category: CAT_INHALT,
      instruction:
        'Setze die Länge des Zeugnisses in Beziehung zur Beschäftigungsdauer, die der Auftraggeber angegeben hat. Ein Zeugnis über wenige Zeilen nach mehreren Jahren ist eine Feststellung. Nenne die Zahlen.',
      euroImpact: [0, 0],
    },

    /* ── Bewertung ────────────────────────────────────────────────────── */
    {
      id: 'AZG-20',
      label: 'Leistungsbeurteilung vorhanden',
      severity: 'error',
      basis: '§ 109 Abs. 1 Satz 3 GewO',
      category: CAT_BEWERTUNG,
      instruction:
        'Prüfe, ob eine zusammenfassende Leistungsbeurteilung enthalten ist. Fehlt sie in einem qualifizierten Zeugnis, ist das der schwerste Fund dieser Prüfung.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-21',
      label: 'Verhaltensbeurteilung vorhanden und vollständig',
      severity: 'error',
      basis:
        '§ 109 Abs. 1 Satz 3 GewO — ANWALTLICH ZU BESTÄTIGEN: Ob die Reihenfolge der genannten Personengruppen für sich genommen beanstandet werden kann',
      category: CAT_BEWERTUNG,
      instruction:
        'Prüfe, ob das Verhalten gegenüber Vorgesetzten, Kollegen und, sofern einschlägig, Kunden bewertet wird. Nenne, welche Gruppe fehlt. Zur Reihenfolge stelle nur fest, in welcher sie genannt werden.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-22',
      label: 'Einordnung der Zufriedenheitsformel',
      severity: 'error',
      basis:
        'Gängige Zeugnissprache, entwickelt in der arbeitsgerichtlichen Praxis — ANWALTLICH ZU BESTÄTIGEN: Formulierung der Einordnung und die Darstellung der Darlegungslast nach BAG, Urteil vom 18.11.2014 – 9 AZR 584/13',
      category: CAT_BEWERTUNG,
      instruction:
        'Zitiere die Zufriedenheitsformel wörtlich und nenne, welcher Stufe der gängigen Zeugnissprache sie entspricht. Formuliere als Einordnung, nicht als Note und nicht als Anspruch. Weise darauf hin, dass für eine Bewertung oberhalb der mittleren Stufe der Arbeitnehmer darlegen muss, dass sie gerechtfertigt ist.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-23',
      label: 'Widerspruch zwischen Einzelaussagen und Gesamturteil',
      severity: 'error',
      basis: 'Grundsatz der Zeugnisklarheit, § 109 Abs. 2 GewO',
      category: CAT_BEWERTUNG,
      instruction:
        'Vergleiche die Einzelaussagen zu Fachwissen, Arbeitsweise und Ergebnissen mit der zusammenfassenden Beurteilung. Nenne jeden Widerspruch mit beiden Fundstellen im Wortlaut.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-24',
      label: 'Bewertung nur einzelner Merkmale',
      severity: 'warn',
      basis: 'Zeugnisklarheit, § 109 Abs. 2 GewO',
      category: CAT_BEWERTUNG,
      instruction:
        'Prüfe, ob die Beurteilung nur Nebensächliches hervorhebt, etwa Pünktlichkeit oder Ordnung, ohne die eigentliche Fachleistung zu bewerten. Nenne die Stellen wörtlich.',
      euroImpact: [0, 0],
    },

    /* ── Zeugnissprache ───────────────────────────────────────────────── */
    {
      id: 'AZG-30',
      label: 'Auslassung einer erwarteten Aussage',
      severity: 'error',
      basis:
        'Grundsatz der Zeugniswahrheit und -klarheit, § 109 Abs. 2 GewO — ANWALTLICH ZU BESTÄTIGEN: Reichweite des sogenannten beredten Schweigens',
      category: CAT_SPRACHE,
      instruction:
        'Prüfe, ob eine Aussage fehlt, die nach Position und Aufgaben zu erwarten wäre, etwa Ehrlichkeit bei einer Kassentätigkeit oder Zuverlässigkeit bei einer Fahrtätigkeit. Stelle die Auslassung fest und beschreibe, warum sie an dieser Stelle auffällt. Behaupte keine Absicht.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-31',
      label: 'Einschränkende Wörter',
      severity: 'warn',
      basis: 'Gängige Zeugnissprache',
      category: CAT_SPRACHE,
      instruction:
        'Sammle einschränkende Formulierungen wie „im Großen und Ganzen", „im Wesentlichen", „bemühte sich", „versuchte", „hatte Gelegenheit". Zitiere jede Stelle wörtlich und beschreibe die Einordnung.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-32',
      label: 'Passivkonstruktionen statt eigener Leistung',
      severity: 'info',
      basis: 'Gängige Zeugnissprache',
      category: CAT_SPRACHE,
      instruction:
        'Prüfe, ob Leistungen im Passiv oder als Aufgabenzuweisung beschrieben werden statt als eigene Ergebnisse. Zitiere die Stellen.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-33',
      label: 'Unzulässige Angaben',
      severity: 'error',
      basis:
        '§ 109 Abs. 2 Satz 2 GewO, keine Merkmale mit einer anderen als der ersichtlichen Aussage — ANWALTLICH ZU BESTÄTIGEN: Katalog der unzulässigen Angaben im Einzelfall',
      category: CAT_SPRACHE,
      instruction:
        'Suche nach Angaben zu Krankheit, Schwerbehinderung, Elternzeit, Gewerkschaftszugehörigkeit, Betriebsratstätigkeit oder Religionszugehörigkeit sowie nach Hinweisen auf einen Rechtsstreit. Zitiere die Stelle wörtlich und formuliere die Bitte um Streichung.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-34',
      label: 'Fehlzeiten oder Elternzeit als Unterbrechung',
      severity: 'warn',
      basis:
        '§ 109 Abs. 2 GewO — ANWALTLICH ZU BESTÄTIGEN: Wann die Erwähnung längerer Unterbrechungen zulässig ist',
      category: CAT_SPRACHE,
      instruction:
        'Prüfe, ob das Zeugnis Unterbrechungen der Tätigkeit erwähnt. Zitiere die Stelle und stelle fest, dass sie enthalten ist. Beurteile die Zulässigkeit nicht.',
      euroImpact: [0, 0],
    },

    /* ── Schlussteil ──────────────────────────────────────────────────── */
    {
      id: 'AZG-40',
      label: 'Beendigungsgrund',
      severity: 'warn',
      basis: 'Grundsatz der Zeugnisklarheit, Angabe des Beendigungsgrundes nur auf Wunsch',
      category: CAT_SCHLUSS,
      instruction:
        'Prüfe, ob ein Beendigungsgrund genannt ist und ob er zu der Angabe des Auftraggebers passt. Eine Formulierung, die eine Kündigung durch den Arbeitgeber nahelegt, obwohl der Auftraggeber selbst gekündigt hat, ist ein Fund.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-41',
      label: 'Schlussformel',
      severity: 'info',
      basis:
        'BAG, Urteil vom 11.12.2012 – 9 AZR 227/11: kein Anspruch auf Dank, Bedauern und Zukunftswünsche — ANWALTLICH ZU BESTÄTIGEN',
      category: CAT_SCHLUSS,
      instruction:
        'Prüfe, ob eine Schlussformel vorhanden ist. Fehlt sie, stelle das als Hinweis fest und sage ausdrücklich dazu, dass darauf kein Anspruch besteht, der Arbeitgeber sie aber freiwillig aufnehmen kann. Ist sie vorhanden, prüfe, ob sie zur Gesamtbewertung passt.',
      euroImpact: [0, 0],
    },
    {
      id: 'AZG-42',
      label: 'Widerspruch zwischen Schlussformel und Bewertung',
      severity: 'warn',
      basis: 'Grundsatz der Zeugnisklarheit, § 109 Abs. 2 GewO',
      category: CAT_SCHLUSS,
      instruction:
        'Vergleiche die Schlussformel mit der Leistungsbeurteilung. Eine knappe oder kühle Schlussformel bei guter Bewertung ist ein Fund; zitiere beide Stellen.',
      euroImpact: [0, 0],
    },
  ],
};

export const REVIEW_PFLICHT = catalogue.checks
  .filter((c) => c.basis.includes('ANWALTLICH'))
  .map((c) => c.id);
