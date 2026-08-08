/**
 * Ausgabeschema für Dokumentnischen.
 *
 * Das Schema ist für jede Dokumentnische dasselbe — es beschreibt die Form
 * eines Prüfergebnisses, nicht den Inhalt einer Nische. Es lag vorher in
 * jeder Nischen-Config als Kopie. Bei zwei Nischen ging das; bei neun ist es
 * die sicherste Art, dass ein Feld in acht Dateien geändert wird und in der
 * neunten nicht.
 *
 * Die Architektur-Regel bleibt gewahrt: Eine neue Nische besteht weiterhin
 * nur aus Config. Sie ruft hier eine Funktion auf, statt neunzig Zeilen zu
 * kopieren.
 *
 * Was die Nische unterscheidet, gibt sie als Argumente mit: welche
 * Dokumentarten es zu unterscheiden gilt und wie das Präfix ihrer
 * Prüfpunkt-IDs aussieht.
 */

export interface DocumentOutputToolOptions {
  /** Beispiele für `detectedDocType`, z. B. ['Handwerkerrechnung', 'Mahnung']. */
  docTypes: string[];
  /** Präfix der Prüfpunkt-IDs dieser Nische, z. B. 'HR' oder 'ARC'. */
  checkIdPrefix: string;
  /** Was in `docSummary` stehen soll. Ein Satz, nischenspezifisch. */
  summaryHint: string;
  /**
   * Bezeichnung der Ankergröße im Dokument. Steht in der Beschreibung von
   * `documentTotalEuro` — bei einer Rechnung die Bruttoendsumme, bei einer
   * Abrechnung der Nachzahlungsbetrag.
   */
  totalHint: string;
}

export function documentOutputTool(options: DocumentOutputToolOptions): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
} {
  return {
    // ASCII-only. Die API verlangt ^[a-zA-Z0-9_-]{1,64}$ — ein Umlaut hier
    // bricht jeden Aufruf, und die Fehlermeldung sagt nicht, woran es liegt.
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
          description: `Was das Dokument tatsächlich ist, z. B. ${options.docTypes
            .map((t) => `"${t}"`)
            .join(', ')}, "unbekannt".`,
        },
        docSummary: {
          type: 'string',
          description: `Zwei bis drei Sätze, rein beschreibend: ${options.summaryHint}`,
        },
        documentTotalEuro: {
          type: 'number',
          description: `${options.totalHint} in Euro, falls lesbar.`,
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
                description: `ID aus dem Prüfkatalog, z. B. "${options.checkIdPrefix}-14". Keine eigenen IDs erfinden.`,
              },
              severity: {
                type: 'string',
                enum: ['info', 'warn', 'error'],
                description:
                  'Schweregrad dieser konkreten Feststellung. Darf vom Katalogwert nur nach unten abweichen, wenn der Einzelfall leichter wiegt. Ein höherer Wert wird verworfen und auf die Katalogvorgabe zurückgesetzt.',
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
  };
}
