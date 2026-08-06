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
  active: true,
  aliasDomains: [],

  brand: {
    name: 'Vorfälligkeitsentschädigung prüfen',
    claim: 'Nachgerechnet, nicht geschätzt.',
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
          'Eigene Nachrechnung nach der Aktiv-Passiv-Methode als Band',
          'Vollständiger Rechenweg mit allen Eingangswerten und Zwischenschritten',
          'Alle Feststellungen mit Fundstelle und Grundlage',
          'Fristen nach § 489 BGB und, falls einschlägig, zur Verjährung',
          'PDF-Bericht mit Katalogversion, Zinsreihe und Stand',
        ],
      },
      {
        id: 'plus',
        label: 'Nachrechnung und Schreiben an die Bank',
        priceCents: 14900,
        stripePriceId: process.env.STRIPE_PRICE_VFE_PLUS || '',
        includes: [
          'Alles aus der Nachrechnung',
          'Nachfrage- und Einwendungsschreiben an die Bank mit Bitte um Offenlegung der Berechnungsgrundlagen',
          'Positionsliste zum Abhaken für das Gespräch',
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
      title: 'Wann können Sie ohne Vorfälligkeitsentschädigung kündigen?',
      intro:
        'Nach § 489 Abs. 1 Nr. 2 BGB können Sie ein Darlehen zehn Jahre nach vollständigem Empfang mit einer Frist von sechs Monaten kündigen — ohne Entschädigung. Tragen Sie das Datum der Vollauszahlung ein, dann rechnen wir Ihnen den Termin aus. Kostenlos, ohne Upload, ohne Anmeldung.',
      cta: 'Wenn Sie vorher ablösen und die Bank eine Entschädigung fordert: Wir rechnen die Forderung nach.',
    },
  ],

  landing: {
    h1: 'Vorfälligkeitsentschädigung nachrechnen lassen',
    subline:
      'Ihre Bank fordert eine Entschädigung für die vorzeitige Ablösung. Wir rechnen sie nach — nach der Aktiv-Passiv-Methode, mit laufzeitkongruenter Abzinsung, in geprüftem Programmcode statt per Schätzung. Sie bekommen ein Band, den vollständigen Rechenweg und die Fragen an Ihre Bank.',
    proofPoints: [
      'Gerechnet wird im Code, nicht von einem Sprachmodell. Das Modell liest nur die Parameter ab.',
      'Ergebnis als Band, nicht als Punktwert — die ersparten Kosten sind Schätzgrößen, und das sagen wir auch.',
      'Nicht ausgeübte Sondertilgungsrechte werden angesetzt. Rechnerisch der größte und häufigste Fehler.',
      'Der Berechnungszeitraum endet am Kündigungstermin nach § 489 BGB, wenn einer in der Restlaufzeit liegt.',
      'Fehlt ein Pflichtwert in Ihren Unterlagen, sagen wir das — und bieten Ihnen den Bericht gar nicht erst an.',
    ],
    competitorAnchor:
      'Die Verbraucherzentrale Hamburg überprüft eine Vorfälligkeitsentschädigung für 125 Euro je Kreditvertrag und braucht dafür bis zu zwei Wochen. Das ist eine seriöse und gründliche Anlaufstelle. Wir sind die schnelle Variante: dasselbe Rechenverfahren, Ergebnis in wenigen Minuten.',
    faq: [
      {
        q: 'Rechnet hier eine KI meine Entschädigung aus?',
        a: 'Nein, und das ist der Kern des Produkts. Ein Sprachmodell liest ausschließlich die Parameter aus Ihren Unterlagen ab — Restschuld, Zinssatz, Zinsbindung, Sondertilgungsrechte. Gerechnet wird danach in Programmcode, der getestet ist und bei gleichen Eingaben immer dasselbe Ergebnis liefert. Eine ausgedachte Barwertberechnung wäre bei diesen Beträgen kein Schönheitsfehler.',
      },
      {
        q: 'Warum bekomme ich ein Band und keine Zahl?',
        a: 'Weil zwei Bestandteile der Rechnung Schätzgrößen sind: die ersparten Verwaltungskosten und die ersparten Risikokosten. Wer daraus einen Betrag auf den Euro genau macht, tut nur so, als wäre er sicher. Wir nennen die Spanne und sagen dazu, worauf sie beruht.',
      },
      {
        q: 'Was ist die Aktiv-Passiv-Methode?',
        a: 'Die Zahlungen, die die Bank ohne Ihre vorzeitige Ablösung bis zum Ende der Zinsbindung erhalten hätte, werden auf den Ablösestichtag abgezinst — mit dem Zins, den die Bank für eine Wiederanlage gleicher Laufzeit erhalten könnte. Die Differenz zur Restschuld ist der Zinsschaden; davon gehen ersparte Verwaltungs- und Risikokosten ab. Der Bundesgerichtshof hat dieses Verfahren als zulässige Berechnungsmethode anerkannt.',
      },
      {
        q: 'Was ist mit Sondertilgungsrechten?',
        a: 'Wenn Ihr Vertrag jährliche Sondertilgungen erlaubt, ist bei der Berechnung zu unterstellen, dass Sie sie genutzt hätten — die Bank hätte dann weniger Zinsen bekommen. Wird das übergangen, fällt die Forderung deutlich höher aus. Wir rechnen beide Varianten und nennen die Differenz.',
      },
      {
        q: 'Ist das eine Rechtsberatung?',
        a: 'Nein. Es ist eine unabhängige rechnerische Überprüfung. Der Bericht rechnet nach und stellt Fragen; er sagt Ihnen nicht, ob Sie zahlen müssen oder ob eine Forderung durchsetzbar ist. Diese Fragen beantwortet eine Fachanwältin oder ein Fachanwalt für Bank- und Kapitalmarktrecht.',
      },
      {
        q: 'Welche Unterlagen brauche ich?',
        a: 'Die Berechnung der Bank und den Darlehensvertrag, optional den letzten Kontoauszug oder Tilgungsplan. Dazu das Datum der Vollauszahlung und das Ablösedatum. Fehlt einer der Pflichtwerte, sagen wir Ihnen das und bieten keinen Bericht an, statt zu schätzen.',
      },
      {
        q: 'Ich habe schon gezahlt — lohnt sich das noch?',
        a: 'Möglicherweise. Für Rückforderungen gilt die regelmäßige Verjährung von drei Jahren ab dem Schluss des Jahres, in dem der Anspruch entstanden ist und Sie davon wussten. Der Bericht nennt Ihnen das konkrete Datum als Orientierung und empfiehlt die anwaltliche Klärung. Wählen Sie beim Upload als Anlass „Bereits gezahlt".',
      },
      {
        q: 'Was kann ich mit dem Bericht anfangen?',
        a: 'Sie können die Berechnungsgrundlagen bei Ihrer Bank anfordern und Ihre Fragen belegt stellen. Im größeren Paket ist ein fertiges Nachfrage- und Einwendungsschreiben enthalten. Und wenn Sie danach zur Anwältin gehen, ist das Gespräch kürzer und konkreter, weil die Zahlen schon auf dem Tisch liegen.',
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
          note: 'Angesetzt sind 1,90 Prozent. Die laufzeitkongruente Referenz liegt zum Ablösestichtag höher. Ein niedriger angesetzter Wiederanlagezins erhöht die Forderung.',
        },
        {
          mark: 'B',
          checkId: 'VFE-12',
          severity: 'warn',
          note: 'Ersparte Verwaltungskosten sind mit null angesetzt. Durch die Ablösung entfällt der Verwaltungsaufwand für gut sechs Jahre Restlaufzeit.',
        },
        {
          mark: 'C',
          checkId: 'VFE-14',
          severity: 'error',
          note: 'Der Vertrag erlaubt jährliche Sondertilgungen von 5 Prozent. Bei der Berechnung ist zu unterstellen, dass sie genutzt worden wären.',
        },
      ],
      caption:
        'Drei Stellschrauben, drei Prüfpunkte. Was daraus rechnerisch folgt, steht im Bericht — mit vollständigem Rechenweg.',
    },
  },

  experiment: {
    id: 'vfe-2026-08',
    adsBudgetCents: 60000,
    killAfterClicks: 300,
    minPaidConversions: 4,
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
