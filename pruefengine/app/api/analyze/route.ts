import { NextResponse } from 'next/server';
import type { AnalysisResult, NicheConfig } from '@/config/schema';
import { resolveNicheOrNull } from '@/lib/resolveNiche';
import { ParseError, parseAnchorToCents, parseUploads, type ParsedDoc } from '@/lib/parse';
import { AnalyzeError, analyze, extractParameters } from '@/lib/analyze';
import { canPurchase, previewFindings, previewStats, sanitize, sanitizeComputed } from '@/lib/sanitize';
import { getCalculator } from '@/lib/calculators';
import { SERIES } from '@/lib/data/zinsreihe';
import { saveResult } from '@/lib/store';
import { checkRateLimit, clientIp } from '@/lib/ratelimit';
import { newResultId } from '@/lib/id';
import { trackServer } from '@/lib/events';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** Dokumentnische: das Modell liest, findet und formuliert. */
async function runDocumentAnalysis(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
  id: string,
): Promise<AnalysisResult> {
  const { raw, model } = await analyze(niche, docs, context, anchorCents);
  return sanitize({ raw, niche, anchorCents, context, model, id });
}

/**
 * Rechennische: das Modell extrahiert nur Parameter, gerechnet wird im Code.
 *
 * Der Modellaufruf und die Rechnung sind hier bewusst getrennte Schritte mit
 * getrennten Verantwortlichkeiten. Was das Modell liefert, sind Ablesewerte;
 * was der Kunde bezahlt, ist die Rechnung darauf.
 */
async function runComputePipeline(
  niche: NicheConfig,
  docs: ParsedDoc[],
  context: Record<string, string>,
  anchorCents: number | null,
  id: string,
): Promise<AnalysisResult> {
  const pipeline = niche.computePipeline;
  if (!pipeline) throw new AnalyzeError('Für diese Prüfung ist kein Rechenweg hinterlegt.');

  const calculator = getCalculator(pipeline.calculator);
  if (!calculator) {
    throw new AnalyzeError(`Der Rechner „${pipeline.calculator}" ist nicht registriert.`);
  }

  const { params, sources, model } = await extractParameters(niche, docs, context, anchorCents);

  const output = calculator(params, {
    // Der Anker des Nutzers schlägt jeden extrahierten Wert. Bei einer
    // Forderung im fünfstelligen Bereich ist die Zahl, die der Kunde selbst
    // abgelesen hat, verlässlicher als jede Texterkennung.
    claimEuro: anchorCents !== null ? anchorCents / 100 : null,
    context,
    tolerancePercent: pipeline.tolerancePercent,
    series: SERIES,
  });

  return sanitizeComputed({ output, niche, anchorCents, context, model, id, sources });
}

/**
 * Upload → Analyse → Vorschau.
 *
 * Diese Route ist die einzige, die Geld kostet, bevor jemand bezahlt hat.
 * Deshalb in dieser Reihenfolge: Rate-Limit, Eingangsprüfung, erst dann das
 * Modell. Die Antwort enthält ausschließlich Vorschaudaten — die vollständigen
 * Feststellungen bleiben serverseitig und werden erst nach der Zahlung
 * ausgeliefert.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  const limit = await checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Aus dieser Verbindung kamen zuletzt viele Prüfungen. Bitte in ${Math.ceil(limit.resetInSeconds / 60)} Minuten erneut versuchen.`,
      },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Der Upload konnte nicht gelesen werden.' }, { status: 400 });
  }

  const niche = resolveNicheOrNull(String(form.get('niche') || ''));
  if (!niche) {
    return NextResponse.json({ error: 'Unbekannte Prüfung.' }, { status: 404 });
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  const anchorCents = parseAnchorToCents(String(form.get('anchor') || ''));

  const context: Record<string, string> = {};
  const missingRequired: string[] = [];

  for (const field of niche.input.contextFields) {
    const value = String(form.get(`ctx_${field.id}`) || '').trim();

    if (field.options && field.options.length > 0) {
      // Nur Werte aus der Config übernehmen — kein Freitext in den Prompt.
      if (field.options.includes(value)) context[field.id] = value;
    } else if (field.type === 'date') {
      // Nur ein sauberes ISO-Datum, nichts anderes.
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) context[field.id] = value;
    }

    if (field.required && !context[field.id]) missingRequired.push(field.label);
  }

  if (missingRequired.length > 0) {
    return NextResponse.json(
      { error: `Bitte ergänzen Sie: ${missingRequired.join(', ')}.` },
      { status: 400 },
    );
  }

  // Der Zähler des Funnels. Bewusst vor der Eingangsprüfung: die Zielgröße ist
  // `paid / upload_started`, und ein Upload, der an der Dateigröße scheitert,
  // ist ein verlorener Kunde und kein Ereignis, das man wegdefiniert.
  await trackServer('upload_started', {
    niche: niche.slug,
    experimentId: niche.experiment.id,
    catalogueVersion: niche.catalogue.version,
  });

  try {
    const docs = await parseUploads(files, niche);
    const id = newResultId();

    // Zwei Produktklassen, eine Route. Die Verzweigung hängt allein daran,
    // ob die Nische eine Compute-Pipeline hat — nicht an ihrem Slug.
    const result = niche.computePipeline
      ? await runComputePipeline(niche, docs, context, anchorCents, id)
      : await runDocumentAnalysis(niche, docs, context, anchorCents, id);

    await saveResult(result, niche.legal.dataRetentionHours);

    await trackServer('preview_shown', {
      niche: niche.slug,
      experimentId: niche.experiment.id,
      catalogueVersion: niche.catalogue.version,
    });

    // Regel 5: nicht beurteilbar => kein Kauf, keine Funde, klare Ansage.
    if (!result.assessable) {
      return NextResponse.json({
        id: result.id,
        catalogueVersion: result.catalogueVersion,
        assessable: false,
        reason: result.notAssessableReason,
        purchasable: false,
      });
    }

    const stats = previewStats(result);
    const sample = previewFindings(result, niche.pricing.preview.visibleFindings);

    return NextResponse.json({
      id: result.id,
      catalogueVersion: result.catalogueVersion,
      assessable: true,
      // hideEuroTotal ist fest true: keine Euro-Summe, keine Euro-Beträge,
      // keine Handlungssätze der verborgenen Funde in dieser Antwort.
      purchasable: canPurchase(result),
      docSummary: result.docSummary,
      // Der Hinweis auf eine Abweichung zwischen Angabe und gelesener Summe
      // gehört vor die Bezahlschranke. Wer die falsche Zahl eingetippt hat,
      // soll das sehen, bevor er kauft.
      anchorNote: result.anchorNote ?? null,
      counts: stats.counts,
      totalFindings: stats.total,
      categories: stats.categories,
      checkedCount: result.checkedIds.length,
      catalogueSize: niche.catalogue.checks.length,
      sample: sample.map((f) => ({
        checkId: f.checkId,
        label: f.label,
        category: f.category,
        severity: f.severity,
        observation: f.observation,
        documentRef: f.documentRef,
        basis: f.basis,
      })),
      hiddenFindings: Math.max(0, stats.total - sample.length),
      // Rechennische: sichtbar ist NUR, ob die Forderung innerhalb, oberhalb
      // oder unterhalb des Bandes liegt. Das Band selbst, die Differenz und
      // die Rechenschritte bleiben hinter der Bezahlschranke.
      position: result.compute?.position ?? null,
    });
  } catch (err) {
    if (err instanceof ParseError) {
      return NextResponse.json({ error: err.userMessage }, { status: 400 });
    }
    if (err instanceof AnalyzeError) {
      console.error(JSON.stringify({ type: 'analyze_error', niche: niche.slug, error: String(err.cause ?? err) }));
      return NextResponse.json({ error: err.userMessage }, { status: 502 });
    }
    console.error(JSON.stringify({ type: 'analyze_unexpected', niche: niche.slug, error: String(err) }));
    return NextResponse.json({ error: 'Die Prüfung ist fehlgeschlagen. Bitte erneut versuchen.' }, { status: 500 });
  }
}
