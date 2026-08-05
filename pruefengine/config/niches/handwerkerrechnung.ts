import type { NicheConfig } from '../schema';
import { catalogue } from '../catalogues/handwerkerrechnung.2026-08-01';

/**
 * Nische 1 — Handwerkerrechnung.
 *
 * Migration des Bestandsprodukts handwerkerrechnung-pruefen.de in die Engine.
 * Ziel ist ausdrücklich kein neues Feature, sondern der Nachweis, dass die
 * Engine das bestehende Produkt ohne Funktionsverlust trägt. Preise
 * unverändert 24,90 / 39,90 Euro.
 */
export const handwerkerrechnung: NicheConfig = {
  slug: 'handwerkerrechnung',
  active: true,
  aliasDomains: [],

  brand: {
    name: 'Handwerkerrechnung prüfen',
    claim: 'Was auf der Rechnung steht — und was fehlt.',
    accent: '#1f5f4f',
  },

  input: {
    docLabel: 'Handwerkerrechnung',
    accept: ['pdf', 'jpg', 'png'],
    maxFiles: 3,
    maxMbPerFile: 10,
    maxPages: 12,
    anchorField: {
      label: 'Rechnungsbetrag brutto (Euro)',
      type: 'currency',
      hint: 'Die Endsumme, so wie sie auf der Rechnung steht. Sie dient als Anker gegen Lesefehler.',
    },
    contextFields: [
      {
        id: 'gewerk',
        label: 'Gewerk',
        options: [
          'Sanitär, Heizung, Klima',
          'Elektro',
          'Maler und Lackierer',
          'Dach und Zimmerei',
          'Fliesen und Boden',
          'Fenster und Türen',
          'Schlüsseldienst',
          'Garten und Landschaft',
          'Anderes Gewerk',
        ],
      },
      {
        id: 'auftragsart',
        label: 'Art des Auftrags',
        options: [
          'Reparatur oder Störungsbeseitigung',
          'Wartung',
          'Umbau oder Sanierung',
          'Neubau oder Erstinstallation',
          'Notdienst außerhalb der Regelarbeitszeit',
        ],
      },
      {
        id: 'vereinbarung',
        label: 'Was war vorher vereinbart?',
        options: [
          'Nichts Schriftliches',
          'Mündlicher Kostenrahmen',
          'Schriftlicher Kostenvoranschlag',
          'Festpreis oder Pauschale',
          'Abrechnung nach Aufwand',
        ],
      },
      {
        id: 'zahlungsstand',
        label: 'Stand der Zahlung',
        options: [
          'Noch nicht gezahlt',
          'Anzahlung geleistet',
          'Vollständig gezahlt',
          'Zahlung zurückgehalten',
        ],
      },
    ],
  },

  catalogue,

  ai: {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
    maxTokens: 8000,
    systemPrompt: [
      'Du prüfst eine Handwerkerrechnung an einen privaten Auftraggeber in Deutschland.',
      'Der Leser ist Privatperson ohne juristische Vorkenntnisse. Er will wissen, was auf seiner',
      'Rechnung von den Pflichtangaben, den vereinbarten Grundlagen oder den üblichen',
      'Referenzbändern abweicht, und was er als nächstes tun kann.',
      '',
      'Der Auftraggeber nennt dir die Bruttosumme der Rechnung selbst. Diese Angabe ist der Anker:',
      'Weicht die von dir gelesene Endsumme davon ab, gehe von einem Lesefehler auf deiner Seite aus',
      'und sage das, statt eine Rechendifferenz zu behaupten.',
    ].join('\n'),
    outputTool: {
      name: 'pruefbericht',
      description:
        'Gib das Ergebnis der Dokumentenprüfung strukturiert zurück. Verwende ausschließlich dieses Werkzeug.',
      input_schema: {
        type: 'object',
        properties: {
          assessable: {
            type: 'boolean',
            description:
              'false, wenn das Dokument unlesbar, kein Dokument der erwarteten Art oder inhaltlich zu dünn für eine Prüfung ist. Dann keine Funde ausgeben.',
          },
          notAssessableReason: {
            type: 'string',
            description:
              'Nur wenn assessable=false: ein bis zwei Sätze, warum nicht geprüft werden konnte. Nichts erfinden.',
          },
          detectedDocType: {
            type: 'string',
            description:
              'Was das Dokument tatsächlich ist, z. B. "Handwerkerrechnung", "Kostenvoranschlag", "Mahnung", "unbekannt".',
          },
          docSummary: {
            type: 'string',
            description:
              'Zwei bis drei Sätze: Gewerk, Leistungsumfang, Abrechnungsform, Endsumme. Rein beschreibend.',
          },
          documentTotalEuro: {
            type: 'number',
            description: 'Die im Dokument ausgewiesene Bruttoendsumme in Euro, falls lesbar.',
          },
          checkedIds: {
            type: 'array',
            items: { type: 'string' },
            description:
              'IDs aller Checks aus dem Prüfkatalog, die du am Dokument tatsächlich prüfen konntest.',
          },
          findings: {
            type: 'array',
            description:
              'Alle Feststellungen. Jede Feststellung bezieht sich auf genau einen Check aus dem Prüfkatalog. Keine Feststellung ohne Beleg im Dokument.',
            items: {
              type: 'object',
              properties: {
                checkId: {
                  type: 'string',
                  description: 'ID aus dem Prüfkatalog, z. B. "HR-14". Keine eigenen IDs erfinden.',
                },
                severity: {
                  type: 'string',
                  enum: ['info', 'warn', 'error'],
                  description:
                    'Schweregrad dieser konkreten Feststellung. Darf vom Katalogwert abweichen, wenn der Einzelfall es trägt.',
                },
                observation: {
                  type: 'string',
                  description:
                    'Was im Dokument steht oder fehlt. Feststellung, keine Bewertung. Zwei bis vier Sätze.',
                },
                documentRef: {
                  type: 'string',
                  description:
                    'Wörtliches Zitat oder Positionsbezeichnung aus dem Dokument, an der die Feststellung hängt.',
                },
                action: {
                  type: 'string',
                  description:
                    'Genau eine Handlung, formuliert als Satz, den der Auftraggeber wörtlich sagen oder schreiben kann.',
                },
                euroImpactLowEuro: {
                  type: 'number',
                  description:
                    'Untergrenze des finanziellen Effekts in Euro. Nur setzen, wenn im Dokument eine Grundlage dafür steht.',
                },
                euroImpactHighEuro: {
                  type: 'number',
                  description: 'Obergrenze des finanziellen Effekts in Euro. Immer zusammen mit der Untergrenze.',
                },
                euroBasis: {
                  type: 'string',
                  description:
                    'Woraus die Spanne rechnerisch folgt, mit den Zahlen aus dem Dokument. Leer lassen, wenn keine Spanne angegeben wird.',
                },
              },
              required: ['checkId', 'severity', 'observation', 'documentRef', 'action'],
            },
          },
        },
        required: ['assessable', 'detectedDocType', 'docSummary', 'checkedIds', 'findings'],
      },
    },
  },

  pricing: {
    preview: { visibleFindings: 1, hideEuroTotal: true },
    tiers: [
      {
        id: 'basis',
        label: 'Vollbericht',
        priceCents: 2490,
        stripePriceId: process.env.STRIPE_PRICE_HANDWERKERRECHNUNG_BASIS || '',
        includes: [
          'Alle Feststellungen im Wortlaut, nach Schweregrad sortiert',
          'Zu jeder Feststellung die Fundstelle im Dokument',
          'Zu jeder Feststellung genau ein Satz, den Sie schreiben oder sagen können',
          'Finanzielle Spanne je Feststellung und in der Summe',
          'PDF-Bericht mit Katalogversion und Prüfdatum',
        ],
      },
      {
        id: 'plus',
        label: 'Vollbericht und Anschreiben',
        priceCents: 3990,
        stripePriceId: process.env.STRIPE_PRICE_HANDWERKERRECHNUNG_PLUS || '',
        includes: [
          'Alles aus dem Vollbericht',
          'Fertiges Anschreiben an den Betrieb, auf Ihre Feststellungen zugeschnitten',
          'Positionsliste zum Abhaken für das Gespräch',
          'Zweite Prüfung der korrigierten Rechnung innerhalb von 14 Tagen',
        ],
        // Zwei zusätzliche Abschnitte im PDF. Beide werden generisch aus den
        // Feststellungen erzeugt, eine neue Nische bekommt sie ohne Code.
        sections: [
          'summary',
          'findings',
          'actions',
          'euro',
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
    sections: ['summary', 'findings', 'actions', 'euro', 'method', 'catalogue', 'legal'],
    showCatalogueVersion: true,
  },

  legal: {
    disclaimer:
      'Dieser Bericht ist eine technische Plausibilitätsprüfung eines hochgeladenen Dokuments anhand eines veröffentlichten Prüfkatalogs. Er ist keine Rechts-, Steuer- oder Fachberatung und kein Sachverständigengutachten. Die Feststellungen beruhen ausschließlich auf dem, was im hochgeladenen Dokument lesbar war, sowie auf den Angaben, die Sie selbst gemacht haben.',
    professionalAdviceNote:
      'Ob sich aus einer Feststellung ein Anspruch ergibt, hängt vom Vertrag und vom Einzelfall ab. Diese Frage beantworten eine Rechtsanwältin oder ein Rechtsanwalt, in steuerlichen Fragen eine Steuerberaterin oder ein Steuerberater, bei technischen Fragen eine öffentlich bestellte Sachverständige oder ein Sachverständiger.',
    imprintEntity: '',
    dataRetentionHours: 72,
    serviceDescription:
      'Prüfung einer Handwerkerrechnung gegen den veröffentlichten Prüfkatalog Handwerkerrechnung und Ausgabe eines PDF-Berichts',
  },

  landing: {
    h1: 'Handwerkerrechnung prüfen lassen — in zwei Minuten',
    subline:
      'Laden Sie Ihre Rechnung hoch. Wir prüfen sie gegen 33 veröffentlichte Prüfpunkte: Pflichtangaben, Steuerabzug, Stundensätze, Anfahrt, Zuschläge, Rechenwege. Sie sehen sofort, wie viele Abweichungen gefunden wurden.',
    proofPoints: [
      'Der Prüfkatalog ist öffentlich. Sie sehen vor dem Hochladen, wonach gesucht wird.',
      'Jede Feststellung nennt ihre Grundlage: Paragraf oder benanntes Referenzband.',
      'Jede Feststellung endet mit einem Satz, den Sie wörtlich schreiben oder sagen können.',
      'Die Vorschau ist kostenlos. Bezahlt wird erst, wenn etwas gefunden wurde.',
      'Ihr Dokument wird nach 72 Stunden automatisch gelöscht.',
    ],
    competitorAnchor:
      'Ein Erstberatungsgespräch bei einer Rechtsanwältin oder einem Rechtsanwalt kostet nach § 34 RVG bis zu 190 Euro zuzüglich Umsatzsteuer. Diese Prüfung ersetzt das nicht — sie sagt Ihnen, ob sich der Weg dorthin lohnt.',
    sample: {
      docTitle: 'Rechnung Nr. 2026-0847',
      docMeta: ['Sanitär, Heizung, Klima', 'Reparatur Warmwasser', 'Rechnungsbetrag 1.184,05 Euro brutto'],
      lines: [
        { text: 'Pos. 1  Monteurstunden, 6,5 Std. à 118,00', amount: '767,00', mark: 'A' },
        { text: 'Pos. 2  An- und Abfahrt, 2 Fahrten à 65,00', amount: '130,00', mark: 'B' },
        { text: 'Pos. 3  Reparaturarbeiten, pauschal', amount: '85,00', mark: 'C' },
        { text: 'Pos. 4  Kleinmaterial', amount: '13,10' },
        { text: 'Nettobetrag', amount: '995,10' },
        { text: 'Umsatzsteuer 19 %', amount: '188,95' },
        { text: 'Rechnungsbetrag', amount: '1.184,05' },
      ],
      annotations: [
        {
          mark: 'A',
          checkId: 'HR-15',
          severity: 'warn',
          note: '118,00 Euro je Monteurstunde liegen über dem Referenzband von 55 bis 95 Euro netto. Differenz zum oberen Bandwert: 149,50 Euro.',
        },
        {
          mark: 'B',
          checkId: 'HR-17',
          severity: 'warn',
          note: 'Zwei Anfahrten, aber nur ein Einsatztag im Leistungszeitraum genannt.',
        },
        {
          mark: 'C',
          checkId: 'HR-06',
          severity: 'error',
          note: '"Reparaturarbeiten, pauschal" lässt Art und Umfang der Leistung nicht erkennen — und trennt die Arbeitskosten nicht vom Material.',
        },
      ],
      caption:
        'So sieht eine geprüfte Rechnung aus: markierte Fundstelle, zitierter Prüfpunkt, benannte Grundlage.',
    },
    faq: [
      {
        q: 'Was genau bekomme ich?',
        a: 'Einen PDF-Bericht mit allen Feststellungen, jeweils mit Fundstelle im Dokument, Grundlage (Paragraf oder Referenzband), finanzieller Spanne und genau einem Satz, den Sie an den Betrieb schreiben oder im Gespräch sagen können. Zusätzlich die Katalogversion und das Prüfdatum, damit der Bericht auch in einem halben Jahr noch erklärbar ist.',
      },
      {
        q: 'Ist das eine Rechtsberatung?',
        a: 'Nein. Es ist eine technische Plausibilitätsprüfung gegen einen veröffentlichten Katalog. Der Bericht stellt fest, was fehlt oder von einer Regelung oder einem üblichen Band abweicht. Er bewertet nicht, ob eine Forderung durchsetzbar ist — das ist Sache einer anwaltlichen Beratung.',
      },
      {
        q: 'Warum sehe ich in der Vorschau nicht alles?',
        a: 'Die Vorschau zeigt Ihnen kostenlos, wie viele Abweichungen gefunden wurden, wie schwer sie wiegen und welche Kategorien betroffen sind — dazu eine vollständig ausformulierte Feststellung als Kostprobe. Der Rest ist die bezahlte Leistung. Wird nichts gefunden, bieten wir Ihnen den Kauf gar nicht erst an.',
      },
      {
        q: 'Was passiert mit meiner Rechnung?',
        a: 'Die Datei wird zur Analyse an Anthropic übermittelt und dort nicht zum Training verwendet. Ergebnis und Dokumentbezug werden 72 Stunden zwischengespeichert und danach automatisch gelöscht. Details in der Datenschutzerklärung.',
      },
      {
        q: 'Was ist, wenn nichts gefunden wird?',
        a: 'Dann sagen wir das, und es gibt nichts zu kaufen. Dasselbe gilt, wenn das Dokument unlesbar ist oder gar keine Rechnung: Wir sagen "nicht beurteilbar" und bieten keinen Kauf an.',
      },
      {
        q: 'Kann ich das nicht selbst in ein KI-Werkzeug werfen?',
        a: 'Sie können. Was Sie dabei nicht bekommen, ist der Prüfmassstab: 33 benannte Prüfpunkte mit Paragraf oder Referenzband, in einer versionierten Fassung, gegen die jede Rechnung gleich geprüft wird — und ein Bericht, der später noch nachvollziehbar ist, weil die Katalogversion darin steht.',
      },
      {
        q: 'Wie lange dauert die Prüfung?',
        a: 'Die Analyse laeuft in der Regel in unter einer Minute. Danach sehen Sie die kostenlose Vorschau; der Vollbericht steht unmittelbar nach der Zahlung als PDF bereit und geht zusätzlich per E-Mail an Sie.',
      },
      {
        q: 'Gilt ein Widerrufsrecht?',
        a: 'Ja, grundsätzlich 14 Tage. Weil der Bericht sofort bereitsteht, müssen Sie beim Kauf ausdrücklich zustimmen, dass wir vor Ablauf der Frist beginnen, und bestätigen, dass Sie damit Ihr Widerrufsrecht verlieren (§ 356 Abs. 5 BGB). Die Erklärung wird im Wortlaut mit Zeitstempel protokolliert.',
      },
    ],
  },

  experiment: {
    id: 'hr-2026-08',
    adsBudgetCents: 30000,
    killAfterClicks: 400,
    minPaidConversions: 5,
  },
};
