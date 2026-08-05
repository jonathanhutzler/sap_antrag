import { NextResponse } from 'next/server';
import { resolveNicheOrNull } from '@/lib/resolveNiche';
import { ParseError, parseAnchorToCents, parseUploads } from '@/lib/parse';
import { AnalyzeError, analyze } from '@/lib/analyze';
import { canPurchase, previewFindings, previewStats, sanitize } from '@/lib/sanitize';
import { saveResult } from '@/lib/store';
import { checkRateLimit, clientIp } from '@/lib/ratelimit';
import { newResultId } from '@/lib/id';
import { trackServer } from '@/lib/events';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
  for (const field of niche.input.contextFields) {
    const value = String(form.get(`ctx_${field.id}`) || '');
    // Nur Werte aus der Config übernehmen — kein Freitext in den Prompt.
    if (field.options.includes(value)) context[field.id] = value;
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
    const { raw, model } = await analyze(niche, docs, context, anchorCents);

    const result = sanitize({
      raw,
      niche,
      anchorCents,
      context,
      model,
      id: newResultId(),
    });

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
