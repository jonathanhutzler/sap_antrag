import Anthropic from '@anthropic-ai/sdk';
import type { NicheConfig } from '@/config/schema';
import type { ParsedDoc } from './parse';
import { buildSystemPrompt, buildUserPreamble } from './prompt';

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

export async function analyze(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
): Promise<{ raw: RawAnalysis; model: string; usage: { input: number; output: number } }> {
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
      system: buildSystemPrompt(niche),
      tools: [
        {
          name: niche.ai.outputTool.name,
          description: niche.ai.outputTool.description,
          input_schema: niche.ai.outputTool.input_schema as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: niche.ai.outputTool.name },
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
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === niche.ai.outputTool.name,
  );

  if (!toolUse) {
    throw new AnalyzeError('Die Prüfung hat kein auswertbares Ergebnis geliefert. Bitte erneut versuchen.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AnalyzeError('Das Dokument ist für eine Prüfung in einem Durchgang zu umfangreich.');
  }

  const input = toolUse.input as Partial<RawAnalysis>;

  return {
    raw: {
      assessable: input.assessable === true,
      notAssessableReason: typeof input.notAssessableReason === 'string' ? input.notAssessableReason : undefined,
      detectedDocType: typeof input.detectedDocType === 'string' ? input.detectedDocType : 'unbekannt',
      docSummary: typeof input.docSummary === 'string' ? input.docSummary : '',
      documentTotalEuro:
        typeof input.documentTotalEuro === 'number' && Number.isFinite(input.documentTotalEuro)
          ? input.documentTotalEuro
          : undefined,
      checkedIds: Array.isArray(input.checkedIds) ? input.checkedIds.filter((c): c is string => typeof c === 'string') : [],
      findings: Array.isArray(input.findings)
        ? input.findings.filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
        : [],
    },
    model: message.model,
    usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
  };
}
