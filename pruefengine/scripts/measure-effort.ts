/**
 * Nebenwirkung von `effort` messen, bevor man daran dreht.
 *
 *   npm run measure:effort -- <nische> <datei.pdf> [ankerbetrag] [stufen…]
 *   npm run measure:effort -- handwerkerrechnung ./rechnung.pdf 1184,05 high medium
 *
 * `effort` ist der wichtigste Kosten- und Zeitregler, weil Denk-Token als
 * Output zählen und Output rund fünfmal so teuer ist wie Input. Die Senkung
 * ist aber nicht gratis: Sie kann eine ganze Prüfkategorie kosten. Deshalb
 * misst dieses Skript nicht nur Token und Laufzeit, sondern auch, welche
 * Kategorien auf welcher Stufe überhaupt noch auftauchen.
 *
 * Fällt eine Kategorie weg, ist die Antwort nicht, zurückzudrehen. Die
 * Antwort ist, die Kategorie im Prompt zum Pflichtbereich zu erklären und im
 * Code abzusichern — und danach erneut zu messen.
 *
 * Achtung: Jeder Lauf kostet echtes Geld. Zwei Stufen sind zwei Aufrufe.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { loadEnv } from './env';
import { findNiche } from '../config/registry';
import { parseAnchorToCents, parseUploads } from '../lib/parse';
import { analyze, extractParameters } from '../lib/analyze';
import { estimateCostUsd, type CallUsage } from '../lib/usage';
import type { NicheConfig } from '../config/schema';

loadEnv();

type Effort = NonNullable<NicheConfig['ai']['effort']>;

const VALID: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

interface Run {
  effort: Effort;
  ms: number;
  usage: CallUsage;
  costUsd: number | null;
  findings: number;
  categories: string[];
  assessable: boolean;
}

function withEffort(niche: NicheConfig, effort: Effort): NicheConfig {
  return { ...niche, ai: { ...niche.ai, effort } };
}

async function main() {
  const [slug, file, anchorRaw, ...levels] = process.argv.slice(2);

  if (!slug || !file) {
    console.error('Aufruf: npm run measure:effort -- <nische> <datei> [ankerbetrag] [stufen…]');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY fehlt. Erwartet in .env.local oder in der Shell.');
    process.exit(1);
  }

  const niche = findNiche(slug);
  if (!niche) {
    console.error(`Unbekannte Nische „${slug}".`);
    process.exit(1);
  }

  const efforts = (levels.length > 0 ? levels : ['high', 'medium']) as Effort[];
  for (const effort of efforts) {
    if (!VALID.includes(effort)) {
      console.error(`Unbekannte Stufe „${effort}". Erlaubt: ${VALID.join(', ')}.`);
      process.exit(1);
    }
  }

  const bytes = readFileSync(file);
  const upload = new File([new Uint8Array(bytes)], basename(file));
  const docs = await parseUploads([upload], niche);
  const anchorCents = anchorRaw ? parseAnchorToCents(anchorRaw) : null;

  const categoryOf = new Map(niche.catalogue.checks.map((c) => [c.id, c.category]));
  const runs: Run[] = [];

  console.log(
    `\n${niche.slug} · ${basename(file)} · ${docs.reduce((s, d) => s + d.pages, 0)} Seiten · Modell ${niche.ai.model}\n`,
  );

  for (const effort of efforts) {
    const tuned = withEffort(niche, effort);
    const started = Date.now();

    if (tuned.computePipeline) {
      const { params, usage, model } = await extractParameters(tuned, docs, {}, anchorCents);
      runs.push({
        effort,
        ms: Date.now() - started,
        usage,
        costUsd: estimateCostUsd(model, usage),
        findings: Object.keys(params).length,
        categories: Object.keys(params).sort(),
        assessable: Object.keys(params).length > 0,
      });
    } else {
      const { raw, usage, model } = await analyze(tuned, docs, {}, anchorCents);
      const categories = new Set<string>();
      for (const finding of raw.findings) {
        const category = categoryOf.get(String(finding.checkId));
        if (category) categories.add(category);
      }
      runs.push({
        effort,
        ms: Date.now() - started,
        usage,
        costUsd: estimateCostUsd(model, usage),
        findings: raw.findings.length,
        categories: Array.from(categories).sort(),
        assessable: raw.assessable,
      });
    }
  }

  const pad = (value: string | number, width: number) => String(value).padStart(width);

  console.log('Stufe    Sekunden   Input  Output  CacheR  CacheW    USD   Funde');
  for (const run of runs) {
    console.log(
      `${run.effort.padEnd(8)}${pad((run.ms / 1000).toFixed(1), 8)}${pad(run.usage.inputTokens, 8)}${pad(
        run.usage.outputTokens,
        8,
      )}${pad(run.usage.cacheReadTokens, 8)}${pad(run.usage.cacheWriteTokens, 8)}${pad(
        run.costUsd === null ? '—' : run.costUsd.toFixed(4),
        7,
      )}${pad(run.findings, 8)}`,
    );
  }

  console.log('\nKategorien je Stufe');
  for (const run of runs) {
    console.log(`  ${run.effort.padEnd(6)} ${run.categories.length}: ${run.categories.join(', ') || '—'}`);
  }

  // Der eigentliche Zweck: Was fällt weg?
  if (runs.length > 1) {
    const reference = runs[0];
    console.log(`\nGegen ${reference.effort}`);

    for (const run of runs.slice(1)) {
      const missing = reference.categories.filter((c) => !run.categories.includes(c));
      const costDelta =
        reference.costUsd !== null && run.costUsd !== null && reference.costUsd > 0
          ? Math.round(((run.costUsd - reference.costUsd) / reference.costUsd) * 100)
          : null;
      const timeDelta = Math.round(((run.ms - reference.ms) / reference.ms) * 100);

      console.log(
        `  ${run.effort.padEnd(6)} Kosten ${costDelta === null ? '—' : `${costDelta > 0 ? '+' : ''}${costDelta} %`}, Zeit ${
          timeDelta > 0 ? '+' : ''
        }${timeDelta} %`,
      );
      console.log(
        missing.length === 0
          ? '         Keine Kategorie fällt weg.'
          : `         Fällt weg: ${missing.join(', ')}  ← erst im Prompt zur Pflicht machen, dann erneut messen.`,
      );
    }
  }

  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
