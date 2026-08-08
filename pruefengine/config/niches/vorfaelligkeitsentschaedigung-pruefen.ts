import type { NicheConfig } from '../schema';
import { catalogue } from '../catalogues/vorfaelligkeitsentschaedigung-pruefen.2026.08';

/**
 * Nische — Vorfälligkeitsentschädigung. Erste Rechennische der Plattform.
 *
 * Anders als alle Dokumentnischen liest das Modell hier nur ab; gerechnet wird
 * in lib/calculators/vfe-aktiv-passiv.ts. Der Grund steht im Schema bei
 * `computePipeline`: Ein Sprachmodell darf in einem Streit über einen
 * fünfstelligen Betrag keine Zahlen selbst ausrechnen.
 *
 * ZWEI BLOCKER stehen unter legal.blockers und verhindern den Deploy:
 * der anwaltliche Review des Katalogs und die Verifikation der Zinsreihe.
 * Beide sind hier keine Formalie — sie sind der Unterschied zwischen einem
 * belastbaren Produkt und einer Abmahnung.
 */
export const vorfaelligkeitsentschaedigung: NicheConfig = {
  slug: 'vorfaelligkeitsentschaedigung-pruefen',
  // Auf false gesetzt für den ersten Livegang. Grund steht in legal.blockers:
  // Der anwaltliche Review fehlt, und die Zinsreihe ist nicht verifiziert.
  // Eine Rechennische mit Platzhalter-Zinsen würde fünfstellige Beträge
  // ausrechnen, die auf erfundenen Daten beruhen. Sobald beides erledigt ist,
  // ist das eine Zeile zurück.
  active: false,
  aliasDomains: [],

  brand: {
    name: 'Vorfälligkeitsentschädigung prüfen',
    claim: 'Nachgerechnet statt geschätzt.',
    accent: '#2c4a7c',
  },

  input: {
    docLabel: 'Vorfälligkeitsberechnung',
    accept: ['pdf'],
    maxFiles: 3,
    maxMbPerFile: 15,
    maxPages: 40,
    anchorField: {
      label: 'Von der Bank geforderte Vorfälligkeitsentschädigung (Euro)',
      type: 'currency',
      hint: 'Der Betrag, so wie er im Schreiben der Bank steht. Diese Angabe überschreibt immer den aus dem Dokument gelesenen Wert.',
    },
    contextFields: [
      {
        id: 'darlehensart',
        label: 'Art des Darlehens',
        options: [
          'Immobiliar-Verbraucherdarlehen',
          'Allgemein-Verbraucherdarlehen',
          'Gewerbliches Darlehen',
        ],
      },
      {
        id: 'anlass',
        label: 'Anlass der Ablösung',
        options: ['Verkauf', 'Umschuldung', 'Sondertilgung', 'Bereits gezahlt'],
      },
      {
        id: 'vollauszahlung',
        label: 'Datum der Vollauszahlung des Darlehens',
        type: 'date',
        required: true,
        hint: 'Ab diesem Tag läuft die Zehnjahresfrist des § 489 Abs. 1 Nr. 2 BGB. Ohne dieses Datum lässt sich der Kündigungstermin nicht berechnen.',
      },
      {
        id: 'abloesedatum',
        label: 'Ablösedatum',
        type: 'date',
        required: true,
        hint: 'Der Stichtag, zu dem abgelöst wurde oder werden soll. Er bestimmt, mit welchem Stand der Zinsreihe gerechnet wird.',
      },
      {
        id: 'sondertilgung',
        label: 'Sondertilgungsrechte im Vertrag',
        options: [
          'Ja, Sondertilgungsrechte vereinbart',
          'Nein, keine vereinbart',
          'Unbekannt',
        ],
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 8000,
    systemPrompt: [
      'Du liest Unterlagen zu einem Immobiliendarlehen: die Vorfälligkeitsberechnung einer Bank,',
      'den Darlehensvertrag und gegebenenfalls einen Tilgungsplan oder Kontoauszug.',
      '',
      'Deine einzige Aufgabe ist es, die unten aufgeführten Parameter abzulesen. Du bewertest',
      'nichts und rechnest nichts. Die Nachrechnung übernimmt anschließend geprüfter',
      'Programmcode — deine Zahlen sind dessen Eingangswerte. Ein falsch abgelesener oder',
      'geratener Wert wird dort nicht auffallen und geht ungeprüft in ein Ergebnis über einen',
      'fünfstelligen Betrag ein. Im Zweifel gilt deshalb: nicht gefunden.',
    ].join('\n'),
    // Wird bei gesetzter computePipeline nicht verwendet; steht hier, weil das
    // Schema es verlangt und ein Nachrüsten sonst leicht vergessen wird.
    outputTool: {
      name: 'pruefbericht',
      description: 'Bei dieser Nische nicht verwendet — es gilt computePipeline.extractionTool.',
      input_schema: {
        type: 'object',
        properties: { assessable: { type: 'boolean' }, findings: { type: 'array', items: { type: 'object' } } },
        required: ['assessable', 'findings'],
      },
    },
  },

  computePipeline: {
    id: 'vfe-aktiv-passiv',
    calculator: 'vfe-aktiv-passiv',
    dataSources: ['zinsreihe:hypothekenpfandbriefe'],
    tolerancePercent: 5,
    extractionTool: {
      name: 'parameter_ablesen',
      description:
        'Lies die Parameter aus den Unterlagen ab. Keine Bewertung, keine Berechnung, keine Schätzung.',
      input_schema: {
        type: 'object',
        description:
          'Jeder Parameter ist ein Objekt mit wert, gefunden und quelle. Steht ein Wert nicht in den Unterlagen, setze gefunden auf false und lass wert leer.',
        properties: {
          dokumentart: {
            type: 'string',
            description:
              'Was die Unterlagen tatsächlich sind, z. B. "Vorfälligkeitsberechnung", "Darlehensvertrag", "Tilgungsplan", "unbekannt".',
          },
          restschuldEuro: param('Restschuld zum Ablösestichtag in Euro.'),
          nominalzinsProzent: param('Nominalzinssatz p. a. in Prozent, z. B. 3.45.'),
          zinsbindungEnde: param('Ende der Zinsbindung im Format JJJJ-MM-TT.'),
          monatsrateEuro: param('Vereinbarte monatliche Rate in Euro.'),
          tilgungssatzProzent: param('Anfänglicher Tilgungssatz p. a. in Prozent.'),
          zahlungsrhythmus: param('Rhythmus der Zahlungen, z. B. "monatlich", "vierteljährlich".'),
          sondertilgungProzentProJahr: param(
            'Vereinbartes jährliches Sondertilgungsrecht in Prozent der ursprünglichen Darlehenssumme.',
          ),
          sondertilgungHaeufigkeit: param('Wie oft das Sondertilgungsrecht ausgeübt werden darf.'),
          sondertilgungGenutztEuro: param('Tatsächlich geleistete Sondertilgungen in Euro, soweit erkennbar.'),
          vollauszahlungDatum: param('Datum der vollständigen Auszahlung des Darlehens, JJJJ-MM-TT.'),
          bankWiederanlagezinsProzent: param(
            'Von der Bank angesetzter Wiederanlagezins in Prozent. Nicht selbst herleiten.',
          ),
          bankVerwaltungskostenEuro: param('Von der Bank angesetzte ersparte Verwaltungskosten in Euro.'),
          bankRisikokostenEuro: param('Von der Bank angesetzte ersparte Risikokosten in Euro.'),
          bearbeitungsentgeltEuro: param('Gesondert berechnetes Entgelt für die Erstellung der Berechnung, in Euro.'),
          methode: param('Von der Bank benannte Berechnungsmethode, z. B. "Aktiv-Passiv" oder "Aktiv-Aktiv".'),
          vfeGefordertEuro: param(
            'Die in den Unterlagen ausgewiesene Vorfälligkeitsentschädigung in Euro. Dient nur dem Abgleich; maßgeblich ist die Angabe des Auftraggebers.',
          ),
        },
        required: ['dokumentart', 'restschuldEuro', 'nominalzinsProzent', 'zinsbindungEnde'],
      },
    },
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Nachrechnung',
        priceCents: 9900,
        stripePriceId: process.env.STRIPE_PRICE_VFE_BASIS || '',
        includes: [
          'Die Nachrechnung nach der Aktiv-Passiv-Methode, als Spanne',
          'Der komplette Rechenweg mit allen Eingangswerten',
          'Jede Feststellung mit Fundstelle und Grundlage',
          'Ihre Fristen nach § 489 BGB, bei Bedarf auch zur Verjährung',
          'PDF mit Katalogversion, Zinsreihe und deren Stand',
        ],
      },
      {
        id: 'plus',
        label: 'Nachrechnung und Schreiben an die Bank',
        priceCents: 14900,
        stripePriceId: process.env.STRIPE_PRICE_VFE_PLUS || '',
        includes: [
          'Alles aus der Nachrechnung',
          'Fertiges Schreiben an die Bank, das die Berechnungsgrundlagen anfordert',
          'Positionsliste zum Abhaken fürs Gespräch',
        ],
        sections: [
          'summary',
          'findings',
          'euro',
          'calculation',
          'actions',
          'letter',
          'checklist',
          'method',
          'catalogue',
          'legal',
        ],
      },
    ],
  },

  report: {
    sections: ['summary', 'findings', 'euro', 'calculation', 'actions', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer:
      'Dieser Bericht ist eine unabhängige rechnerische Überprüfung einer Vorfälligkeitsberechnung anhand eines veröffentlichten Prüfkatalogs. Er ist keine Rechtsberatung und keine Rechtsdienstleistung im Sinne des Rechtsdienstleistungsgesetzes und ersetzt keinen Fachanwalt. Der Bericht rechnet nach und stellt Fragen; er trifft keine Entscheidung darüber, welcher Betrag geschuldet ist.',
    professionalAdviceNote:
      'Ob sich aus einer Feststellung ein Anspruch ergibt, ob eine Forderung ganz oder teilweise entfällt und ob eine Rückforderung durchsetzbar ist, beantwortet eine Fachanwältin oder ein Fachanwalt für Bank- und Kapitalmarktrecht. Steuerliche Fragen gehören zur Steuerberatung. Für eine zweite Meinung zur Berechnung bieten auch die Verbraucherzentralen eine kostenpflichtige Überprüfung an.',
    imprintEntity: '',
    dataRetentionHours: 336,
    serviceDescription:
      'Rechnerische Überprüfung einer Vorfälligkeitsentschädigung nach der Aktiv-Passiv-Methode gegen den veröffentlichten Prüfkatalog Vorfälligkeitsentschädigung und Ausgabe eines PDF-Berichts',

    /**
     * Zusätzlich zu den global verbotenen Begriffen. Die Formulierungsgrenze
     * ist hier enger: nachrechnen und fragen ja, beurteilen nein.
     */
    forbiddenTerms: [
      { stem: 'unzulässig', replacement: 'klärungsbedürftig', label: 'unzulässig' },
      { stem: 'falsch gerechnet', replacement: 'abweichend von der eigenen Nachrechnung', label: 'falsch gerechnet' },
      { stem: 'überhöht', replacement: 'über dem errechneten Band liegend', label: 'überhöht' },
      { stem: 'zu hoch angesetzt', replacement: 'über dem Referenzwert angesetzt', label: 'zu hoch angesetzt' },
      { stem: 'müssen nicht zahlen', replacement: null, label: 'müssen nicht zahlen' },
      { stem: 'nicht zahlen müssen', replacement: null, label: 'nicht zahlen müssen' },
      { stem: 'zurückfordern können', replacement: null, label: 'zurückfordern können' },
      { stem: 'erfolgsaussicht', replacement: null, label: 'Erfolgsaussicht' },
      { stem: 'aussichtsreich', replacement: null, label: 'aussichtsreich' },
      { stem: 'durchsetzbar', replacement: null, label: 'durchsetzbar' },
      { stem: 'im schnitt', replacement: null, label: 'im Schnitt' },
      { stem: 'widerrufsjoker', replacement: null, label: 'Widerrufsjoker' },
      { stem: 'widerrufsbelehrung', replacement: null, label: 'Widerrufsbelehrung' },
    ],

    blockers: [
      'Anwaltlicher Review des Prüfkatalogs steht aus — siehe docs/vfe-anwaltlicher-review.md. Betroffen sind insbesondere VFE-01, VFE-02, VFE-03, VFE-12, VFE-13, VFE-14, VFE-16 und VFE-20.',
      'Die Zinsreihe in lib/data/zinsreihe.ts ist nicht verifiziert. Kennung, Bezugsquelle und historische Stände prüfen, dann RATE_SERIES_VERIFIED=true setzen.',
    ],
  },

  freeTools: [
    {
      id: 'fristrechner-489',
      slug: 'fristrechner',
      title: 'Wann kommen Sie ohne Vorfälligkeitsentschädigung raus?',
      intro:
        'Zehn Jahre nach der Vollauszahlung dürfen Sie kündigen, mit sechs Monaten Frist, ohne Entschädigung. So steht es in § 489 Abs. 1 Nr. 2 BGB. Tragen Sie das Datum ein, wir rechnen den Termin aus. Kostenlos, ohne Upload, ohne Anmeldung.',
      cta: 'Sie wollen vorher raus und die Bank verlangt eine Entschädigung? Die rechnen wir Ihnen nach.',
    },
  ],

  landing: {
    h1: 'Vorfälligkeitsentschädigung nachrechnen lassen',
    subline:
      'Ihre Bank will Geld dafür, dass Sie früher aussteigen. Wir rechnen den Betrag nach: Aktiv-Passiv-Methode, laufzeitkongruent abgezinst, in getestetem Programmcode. Sie bekommen eine Spanne, den kompletten Rechenweg und die Fragen, die Sie Ihrer Bank stellen können.',
    proofPoints: [
      'Gerechnet wird im Code. Das Sprachmodell liest nur die Werte aus Ihren Unterlagen ab.',
      'Das Ergebnis ist eine Spanne. Zwei Posten der Rechnung sind Schätzgrößen, und dann ist ein Betrag auf den Euro genau geflunkert.',
      'Nicht genutzte Sondertilgungsrechte werden angesetzt. Das ist der Fehler, der am häufigsten vorkommt und am meisten ausmacht.',
      'Liegt Ihr Kündigungstermin nach § 489 BGB innerhalb der Restlaufzeit, endet unsere Rechnung dort.',
      'Fehlt ein Pflichtwert in Ihren Unterlagen, sagen wir das. Geschätzt wird hier nichts.',
    ],
    competitorAnchor:
      'Die Verbraucherzentrale Hamburg prüft eine Vorfälligkeitsentschädigung für 125 Euro je Kreditvertrag und braucht dafür bis zu zwei Wochen. Gute Adresse, gründliche Arbeit. Wir rechnen dasselbe Verfahren, nur schneller.',
    faq: [
      {
        q: 'Rechnet hier eine KI meine Entschädigung aus?',
        a: 'Nein. Ein Sprachmodell liest die Werte aus Ihren Unterlagen ab: Restschuld, Zinssatz, Zinsbindung, Sondertilgungsrechte. Das war seine ganze Aufgabe. Gerechnet wird danach in Programmcode, der getestet ist und bei gleichen Eingaben immer dasselbe Ergebnis liefert. Eine erfundene Barwertrechnung sähe genauso überzeugend aus wie eine richtige, und dafür geht es hier um zu viel Geld.',
      },
      {
        q: 'Warum eine Spanne und keine Zahl?',
        a: 'Zwei Posten der Rechnung lassen sich nicht exakt bestimmen: die ersparten Verwaltungskosten und die ersparten Risikokosten. Wer daraus einen Betrag auf den Euro genau macht, tut nur so, als wüsste er es. Wir nennen die Spanne und schreiben dazu, welche Werte wir angesetzt haben.',
      },
      {
        q: 'Was ist die Aktiv-Passiv-Methode?',
        a: 'Man nimmt alle Zahlungen, die Ihre Bank ohne die vorzeitige Ablösung bis zum Ende der Zinsbindung noch bekommen hätte, und rechnet sie auf den Ablösestichtag zurück. Der Zinssatz dafür ist der, den die Bank für eine gleich lange Wiederanlage bekäme. Was über der Restschuld liegt, ist ihr Zinsschaden. Davon gehen ersparte Verwaltungs- und Risikokosten ab. Der Bundesgerichtshof hat das Verfahren anerkannt.',
      },
      {
        q: 'Was ist mit Sondertilgungsrechten?',
        a: 'Erlaubt Ihr Vertrag jährliche Sondertilgungen, muss die Rechnung so tun, als hätten Sie sie genutzt. Die Bank hätte dann weniger Zinsen bekommen. Fällt das unter den Tisch, wird die Forderung deutlich größer. Wir rechnen beide Varianten und schreiben die Differenz hin.',
      },
      {
        q: 'Ist das eine Rechtsberatung?',
        a: 'Nein. Wir rechnen nach und stellen Fragen. Ob Sie zahlen müssen und ob sich etwas durchsetzen lässt, beantwortet ein Fachanwalt für Bank- und Kapitalmarktrecht.',
      },
      {
        q: 'Welche Unterlagen brauche ich?',
        a: 'Die Berechnung der Bank und den Darlehensvertrag. Kontoauszug oder Tilgungsplan helfen, sind aber nicht nötig. Dazu zwei Daten: wann das Darlehen vollständig ausgezahlt war und wann Sie ablösen. Fehlt einer der Pflichtwerte, sagen wir Ihnen das, statt zu schätzen.',
      },
      {
        q: 'Ich habe schon gezahlt. Lohnt sich das noch?',
        a: 'Kann sein. Für Rückforderungen gelten drei Jahre, gerechnet ab dem Ende des Jahres, in dem der Anspruch entstanden ist und Sie davon wussten. Der Bericht nennt Ihnen das Datum als Orientierung und rät zur anwaltlichen Klärung. Wählen Sie beim Hochladen als Anlass „Bereits gezahlt".',
      },
      {
        q: 'Was mache ich mit dem Bericht?',
        a: 'Sie fordern bei Ihrer Bank die Berechnungsgrundlagen an und stellen Ihre Fragen mit Zahlen im Rücken. Im größeren Paket liegt ein fertiges Schreiben dafür bei. Gehen Sie danach zum Anwalt, wird das Gespräch kürzer, weil die Rechnung schon auf dem Tisch liegt.',
      },
    ],
    sample: {
      docTitle: 'Vorfälligkeitsberechnung, Darlehen Nr. 4711',
      docMeta: ['Immobiliar-Verbraucherdarlehen', 'Ablösung zum 01.06.2026', 'Gefordert 24.180,00 Euro'],
      lines: [
        { text: 'Restschuld zum Ablösestichtag', amount: '198.400,00' },
        { text: 'Nominalzins p. a.', amount: '3,45 %' },
        { text: 'Zinsbindung bis', amount: '30.09.2032' },
        { text: 'Wiederanlagezins angesetzt', amount: '1,90 %', mark: 'A' },
        { text: 'Ersparte Verwaltungskosten', amount: '0,00', mark: 'B' },
        { text: 'Sondertilgungsrecht 5 % p. a.', amount: 'nicht angesetzt', mark: 'C' },
        { text: 'Vorfälligkeitsentschädigung', amount: '24.180,00' },
      ],
      annotations: [
        {
          mark: 'A',
          checkId: 'VFE-11',
          severity: 'warn',
          note: 'Angesetzt sind 1,90 Prozent. Die Referenz für diese Laufzeit liegt zum Ablösestichtag höher. Je niedriger dieser Satz, desto größer die Forderung.',
        },
        {
          mark: 'B',
          checkId: 'VFE-12',
          severity: 'warn',
          note: 'Hier steht eine Null. Nach der Ablösung muss die Bank das Darlehen gut sechs Jahre lang nicht mehr verwalten.',
        },
        {
          mark: 'C',
          checkId: 'VFE-14',
          severity: 'error',
          note: 'Der Vertrag erlaubt 5 Prozent Sondertilgung im Jahr. Die Rechnung muss unterstellen, dass Sie davon Gebrauch gemacht hätten.',
        },
      ],
      caption:
        'Drei Stellschrauben, drei Prüfpunkte. Was daraus folgt, steht im Bericht, mitsamt Rechenweg.',
    },
  },

  experiment: {
    id: 'vfe-2026-08',
    adsBudgetCents: 60000,
    killAfterClicks: 300,
    minPaidConversions: 4,
  },

  economics: {
    planPriceCents: 9900,
    // Niedriger angesetzt als bei den Dokumentnischen: Der Anlass ist selten,
    // die Suchintention oft noch informativ und nicht kaufbereit.
    conversionBand: [0.02, 0.04],
    targetCpcCents: [83, 165],
    marketCpcCents: [200, 500],
    marketCpcSource: 'Eigene Markteinschätzung 08/2026, nicht aus dem Keyword-Planer verifiziert',
    channel: 'seo-first',
    verdict:
      'Höchster Warenkorb der aktiven Nischen, aber Banken- und Kanzleiwerbung treibt den Klickpreis. Zuerst über die Ratgeberartikel und den kostenlosen Fristrechner.',
  },
};

/** Kurzform für die Parameterfelder des Extraktionsschemas. */
function param(description: string) {
  return {
    type: 'object',
    description,
    properties: {
      wert: { description: 'Der abgelesene Wert. Leer lassen, wenn nicht gefunden.' },
      gefunden: { type: 'boolean', description: 'true nur, wenn der Wert wirklich im Dokument steht.' },
      quelle: { type: 'string', description: 'Dokument und Seite, aus der der Wert stammt.' },
    },
    required: ['gefunden'],
  };
}
