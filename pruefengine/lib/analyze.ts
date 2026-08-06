import Anthropic from '@anthropic-ai/sdk';
import type { NicheConfig } from '@/config/schema';
import type { ParsedDoc } from './parse';
import { buildExtractionPrompt, buildSystemPrompt, buildUserPreamble } from './prompt';

/**
 * Modellaufruf.
 *
 * Das Ausgabeschema wird über `tool_use` erzwungen: Tool-Definition mit
 * JSON-Schema, `tool_choice` fest auf dieses Tool. Es gibt bewusst keinen
 * Reparatur-Fallback, der Fließtext nachträglich in JSON umbiegt — kommt kein
 * Tool-Aufruf zurück, ist das ein Fehler und kein Ergebnis.
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
): Promise<{ input: Record<string, unknown>; model: string; usage: { input: number; output: number } }> {
  const anthropic = getClient();

  const content: Anthropic.ContentBlockParam[] = [
    { type: 'text', text: buildUserPreamble(niche, context, anchorCents) },
    ...docs.map(toContentBlock),
  ];

  // max_tokens mindestens 8000 — ein voller Bericht mit 30+ Prüfpunkten
  // läuft darunter mitten im Tool-Aufruf aus und ist dann unbrauchbar.
  const maxTokens = Math.max(8000, niche.ai.maxTokens);

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: niche.ai.model,
      max_tokens: maxTokens,
      system,
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
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      throw new AnalyzeError('Gerade sind sehr viele Prüfungen unterwegs. Bitte in einer Minute erneut versuchen.', err);
    }
    if (status === 413) {
      throw new AnalyzeError('Das Dokument ist zu groß für die Prüfung.', err);
    }
    throw new AnalyzeError('Die Prüfung konnte nicht abgeschlossen werden. Bitte erneut versuchen.', err);
  }

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === tool.name,
  );

  if (!toolUse) {
    throw new AnalyzeError('Die Prüfung hat kein auswertbares Ergebnis geliefert. Bitte erneut versuchen.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AnalyzeError('Das Dokument ist für eine Prüfung in einem Durchgang zu umfangreich.');
  }

  return {
    input: toolUse.input as Record<string, unknown>,
    model: message.model,
    usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}

/** Dokumentnische: das Modell liest, findet und formuliert. */
export async function analyze(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
): Promise<{ raw: RawAnalysis; model: string; usage: { input: number; output: number } }> {
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
  usage: { input: number; output: number };
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
