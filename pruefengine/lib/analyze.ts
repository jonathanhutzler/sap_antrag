import Anthropic from '@anthropic-ai/sdk';
import type { NicheConfig } from '@/config/schema';
import type { ParsedDoc } from './parse';
import { buildExtractionPrompt, buildSystemPrompt, buildUserPreamble } from './prompt';
import { EMPTY_USAGE, logUsage, type CallUsage } from './usage';

/**
 * Modellaufruf.
 *
 * Das Ausgabeschema wird über `tool_use` erzwungen: Tool-Definition mit
 * JSON-Schema, `tool_choice` fest auf dieses Tool. Es gibt bewusst keinen
 * Reparatur-Fallback, der Fließtext nachträglich in JSON umbiegt — kommt kein
 * Tool-Aufruf zurück, ist das ein Fehler und kein Ergebnis.
 *
 * Vier Dinge sind hier nicht verhandelbar, weil sie in einem echten Livegang
 * Geld gekostet haben:
 *
 * 1. Gestreamt wird immer. Ein nicht gestreamter Aufruf mit großem
 *    `max_tokens` läuft in ein HTTP-Timeout, lange bevor das Modell fertig
 *    ist. Der Aufrufer bekommt trotzdem eine fertige Nachricht — das
 *    Streaming ist Transport, nicht Darstellung.
 * 2. `stop_reason` wird ausgewertet. Ohne das sucht man den Fehler bei „kein
 *    JSON in der Antwort" und nicht dort, wo er ist.
 * 3. Der System-Prompt ist je Nische konstant und wird zwischengespeichert.
 *    Alles Fallspezifische steht im User-Turn.
 * 4. Jeder Aufruf schreibt eine Zeile mit Token-Verbrauch.
 */

export class AnalyzeError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = 'AnalyzeError';
    this.userMessage = userMessage;
    if (cause) this.cause = cause;
  }
}

export interface RawAnalysis {
  assessable: boolean;
  notAssessableReason?: string;
  detectedDocType: string;
  docSummary: string;
  documentTotalEuro?: number;
  checkedIds: string[];
  findings: Array<Record<string, unknown>>;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AnalyzeError('Die Prüfung ist gerade nicht verfügbar.');
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * PDF oder Bild.
 *
 * Eine PDF-Seite geht als Bild UND als extrahierter Text ins Modell — das
 * kostet je Seite 1.500 bis 3.000 Text-Token obendrauf, die ein Foto nicht
 * kostet. Trotzdem ist PDF hier die richtige Wahl: Beträge und Klauselwortlaut
 * müssen exakt stimmen, und genau dafür ist die Textebene da. Wer an den
 * Kosten drehen will, dreht an `effort`, nicht am Dateiformat.
 */
function toContentBlock(doc: ParsedDoc): Anthropic.ContentBlockParam {
  if (doc.type === 'pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 },
    };
  }
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: doc.mediaType as 'image/jpeg' | 'image/png',
      data: doc.base64,
    },
  };
}

export interface CallOutcome {
  input: Record<string, unknown>;
  model: string;
  usage: CallUsage;
}

/**
 * Ein Modellaufruf mit erzwungenem Werkzeug. Gemeinsame Basis für beide
 * Produktklassen — den Unterschied machen System-Prompt und Werkzeug.
 */
async function callTool(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
  system: string,
  tool: { name: string; description: string; input_schema: Record<string, unknown> },
): Promise<CallOutcome> {
  const anthropic = getClient();
  const started = Date.now();
  const effort = niche.ai.effort ?? 'high';
  const pages = docs.reduce((sum, doc) => sum + doc.pages, 0);

  const content: Anthropic.ContentBlockParam[] = [
    { type: 'text', text: buildUserPreamble(niche, context, anchorCents) },
    ...docs.map(toContentBlock),
  ];

  // max_tokens mindestens 8000 — ein voller Bericht mit 30+ Prüfpunkten
  // läuft darunter mitten im Tool-Aufruf aus und ist dann unbrauchbar.
  // Die Grenze deckelt Denk-Token und Antworttext gemeinsam: zu knapp
  // bemessen verbraucht das Modell alles beim Denken und liefert einen leeren
  // Block mit stop_reason "max_tokens" — technisch ein Erfolg, inhaltlich
  // nichts.
  const maxTokens = Math.max(8000, niche.ai.maxTokens);

  let message: Anthropic.Message;
  try {
    const stream = anthropic.messages.stream({
      model: niche.ai.model,
      max_tokens: maxTokens,
      // Werkzeug und System-Prompt sind je Nische konstant. Der Cache-Punkt
      // sitzt hinter dem System-Prompt und umfasst damit beides. Er trifft
      // nur, solange nichts Fallspezifisches in diesen Teil rutscht — der
      // Fall steht im User-Turn, und das bleibt so.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      // Der wichtigste Kosten- und Zeitregler. Denk-Token zählen als Output,
      // Output ist rund fünfmal so teuer wie Input. Vor jeder Senkung gehört
      // eine Messung: scripts/measure-effort.ts zeigt, welche Prüfkategorien
      // dabei wegfallen.
      output_config: { effort },
      tools: [
        {
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content }],
    });
    message = await stream.finalMessage();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    console.error(
      JSON.stringify({
        type: 'model_call_failed',
        niche: niche.slug,
        tool: tool.name,
        model: niche.ai.model,
        effort,
        status: status ?? null,
        durationMs: Date.now() - started,
        docs: docs.length,
        pages,
        error: String(err),
      }),
    );

    if (status === 429) {
      throw new AnalyzeError('Gerade sind sehr viele Prüfungen unterwegs. Bitte in einer Minute erneut versuchen.', err);
    }
    if (status === 413) {
      throw new AnalyzeError('Das Dokument ist zu groß für die Prüfung.', err);
    }
    throw new AnalyzeError('Die Prüfung konnte nicht abgeschlossen werden. Bitte erneut versuchen.', err);
  }

  const usage: CallUsage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };

  logUsage({
    ...usage,
    niche: niche.slug,
    tool: tool.name,
    model: message.model,
    effort,
    stopReason: message.stop_reason,
    durationMs: Date.now() - started,
    docs: docs.length,
    pages,
  });

  // stop_reason zuerst. Ein abgebrochener Aufruf sieht sonst aus wie ein
  // Modell, das sich nicht ans Werkzeug hält, und man sucht falsch.
  if (message.stop_reason === 'refusal') {
    console.error(
      JSON.stringify({
        type: 'model_refusal',
        niche: niche.slug,
        tool: tool.name,
        stopDetails: message.stop_details ?? null,
      }),
    );
    throw new AnalyzeError(
      'Das hochgeladene Dokument konnte nicht geprüft werden. Bitte laden Sie das Dokument hoch, das im Formular verlangt wird.',
    );
  }

  if (message.stop_reason === 'max_tokens') {
    throw new AnalyzeError(
      'Das Dokument ist für eine Prüfung in einem Durchgang zu umfangreich. Bitte laden Sie nur die Seiten hoch, um die es geht.',
    );
  }

  if (message.stop_reason === 'model_context_window_exceeded') {
    throw new AnalyzeError(
      'Das Dokument ist zu lang für eine Prüfung. Bitte laden Sie nur die Seiten hoch, um die es geht.',
    );
  }

  if (message.stop_reason === 'pause_turn') {
    // Tritt nur mit serverseitigen Werkzeugen auf. Diese Engine benutzt keine.
    throw new AnalyzeError('Die Prüfung wurde unterbrochen. Bitte erneut versuchen.');
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === tool.name,
  );

  if (!toolUse) {
    console.error(
      JSON.stringify({
        type: 'model_no_tool_use',
        niche: niche.slug,
        tool: tool.name,
        stopReason: message.stop_reason,
        blocks: message.content.map((b) => b.type),
      }),
    );
    throw new AnalyzeError('Die Prüfung hat kein auswertbares Ergebnis geliefert. Bitte erneut versuchen.');
  }

  const input = (toolUse.input ?? {}) as Record<string, unknown>;
  if (Object.keys(input).length === 0) {
    throw new AnalyzeError('Die Prüfung hat kein auswertbares Ergebnis geliefert. Bitte erneut versuchen.');
  }

  return { input, model: message.model, usage };
}

/** Dokumentnische: das Modell liest, findet und formuliert. */
export async function analyze(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
): Promise<{ raw: RawAnalysis; model: string; usage: CallUsage }> {
  const { input, model, usage } = await callTool(
    niche,
    docs,
    context,
    anchorCents,
    buildSystemPrompt(niche),
    niche.ai.outputTool,
  );

  const typed = input as Partial<RawAnalysis>;

  return {
    raw: {
      assessable: typed.assessable === true,
      notAssessableReason: typeof typed.notAssessableReason === 'string' ? typed.notAssessableReason : undefined,
      detectedDocType: typeof typed.detectedDocType === 'string' ? typed.detectedDocType : 'unbekannt',
      docSummary: typeof typed.docSummary === 'string' ? typed.docSummary : '',
      documentTotalEuro:
        typeof typed.documentTotalEuro === 'number' && Number.isFinite(typed.documentTotalEuro)
          ? typed.documentTotalEuro
          : undefined,
      checkedIds: Array.isArray(typed.checkedIds)
        ? typed.checkedIds.filter((c): c is string => typeof c === 'string')
        : [],
      findings: Array.isArray(typed.findings)
        ? typed.findings.filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
        : [],
    },
    model,
    usage,
  };
}

/**
 * Rechennische: das Modell extrahiert ausschließlich Parameter.
 *
 * Die Werte kommen flach zurück — jeder Parameter als Objekt mit `wert`,
 * `gefunden` und `quelle`. Nur was `gefunden: true` trägt, wird an den Rechner
 * weitergereicht; alles andere gilt als nicht im Dokument vorhanden. Damit
 * kann ein Wert, den das Modell aus Höflichkeit ausgefüllt hat, nicht
 * versehentlich in eine Berechnung geraten.
 */
export async function extractParameters(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
): Promise<{
  params: Record<string, unknown>;
  sources: Record<string, string>;
  docType: string;
  model: string;
  usage: CallUsage;
}> {
  const pipeline = niche.computePipeline;
  if (!pipeline) throw new AnalyzeError('Für diese Prüfung ist kein Rechenweg hinterlegt.');

  const { input, model, usage } = await callTool(
    niche,
    docs,
    context,
    anchorCents,
    buildExtractionPrompt(niche),
    pipeline.extractionTool,
  );

  const params: Record<string, unknown> = {};
  const sources: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (key === 'dokumentart') continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    const entry = value as { wert?: unknown; gefunden?: unknown; quelle?: unknown };
    if (entry.gefunden !== true) continue;
    if (entry.wert === null || entry.wert === undefined || entry.wert === '') continue;

    params[key] = entry.wert;
    if (typeof entry.quelle === 'string') sources[key] = entry.quelle;
  }

  return {
    params,
    sources,
    docType: typeof input.dokumentart === 'string' ? input.dokumentart : 'unbekannt',
    model,
    usage,
  };
}

export { EMPTY_USAGE };
export type { CallUsage };
