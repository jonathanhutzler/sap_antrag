/**
 * Token-Protokoll je Modellaufruf.
 *
 * Ohne diese Zeile ist jede Kostendiskussion geraten. Sie steht deshalb als
 * eigene Datei da und nicht als Nebensache in `analyze.ts`: Was hier
 * protokolliert wird, ist die einzige Grundlage für die Frage, ob eine Nische
 * sich rechnet.
 *
 * Ausgabe ist eine JSON-Zeile auf stdout. Auf Vercel landet sie in den
 * Runtime-Logs und lässt sich dort nach `type: "model_usage"` filtern.
 */

export interface CallUsage {
  inputTokens: number;
  outputTokens: number;
  /** Aus dem Cache gelesener Anteil des Prefix. Kostet 10 % des Input-Preises. */
  cacheReadTokens: number;
  /** In den Cache geschriebener Anteil. Kostet 125 % des Input-Preises. */
  cacheWriteTokens: number;
}

export const EMPTY_USAGE: CallUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/**
 * Listenpreise in US-Dollar je einer Million Token.
 *
 * Stand 24.06.2026, von Hand gepflegt. Ein Modell, das hier nicht steht,
 * bekommt keine geschätzten Kosten — eine falsche Zahl im Protokoll ist
 * schlechter als gar keine. Wer ein Modell ergänzt, prüft den Preis vorher
 * auf der Preisseite und schreibt das Datum in diesen Kommentar.
 */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

/** Faktoren auf den Input-Preis. */
const CACHE_READ_FACTOR = 0.1;
const CACHE_WRITE_FACTOR = 1.25;

/** Präfix-Treffer, damit datierte Modell-IDs dieselbe Zeile finden. */
function priceFor(model: string): { input: number; output: number } | null {
  if (PRICE_PER_MTOK[model]) return PRICE_PER_MTOK[model];
  for (const [id, price] of Object.entries(PRICE_PER_MTOK)) {
    if (model.startsWith(id)) return price;
  }
  return null;
}

/** Geschätzte Kosten eines Aufrufs in US-Dollar. `null`, wenn der Preis fehlt. */
export function estimateCostUsd(model: string, usage: CallUsage): number | null {
  const price = priceFor(model);
  if (!price) return null;

  const usd =
    (usage.inputTokens * price.input +
      usage.cacheReadTokens * price.input * CACHE_READ_FACTOR +
      usage.cacheWriteTokens * price.input * CACHE_WRITE_FACTOR +
      usage.outputTokens * price.output) /
    1_000_000;

  return Math.round(usd * 10_000) / 10_000;
}

export interface UsageLogEntry extends CallUsage {
  niche: string;
  tool: string;
  model: string;
  effort: string;
  stopReason: string | null;
  durationMs: number;
  /** Anzahl Dokumente und Seiten — der Haupttreiber der Input-Token. */
  docs: number;
  pages: number;
}

export function logUsage(entry: UsageLogEntry): void {
  const costUsd = estimateCostUsd(entry.model, entry);

  console.log(
    JSON.stringify({
      type: 'model_usage',
      niche: entry.niche,
      tool: entry.tool,
      model: entry.model,
      effort: entry.effort,
      stopReason: entry.stopReason,
      durationMs: entry.durationMs,
      docs: entry.docs,
      pages: entry.pages,
      input: entry.inputTokens,
      output: entry.outputTokens,
      cacheRead: entry.cacheReadTokens,
      cacheWrite: entry.cacheWriteTokens,
      // Output ist rund fünfmal so teuer wie Input. Diese Kennzahl zeigt
      // sofort, ob ein Aufruf am Denken hängt oder am Dokument.
      outputShare: entry.inputTokens + entry.outputTokens > 0
        ? Math.round((entry.outputTokens / (entry.inputTokens + entry.outputTokens)) * 100) / 100
        : 0,
      costUsd,
    }),
  );
}
