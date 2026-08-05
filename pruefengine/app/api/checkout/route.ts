import { NextResponse } from 'next/server';
import { resolveNicheOrNull } from '@/lib/resolveNiche';
import { loadResult } from '@/lib/store';
import { canPurchase } from '@/lib/sanitize';
import { createCheckoutSession, findTier } from '@/lib/stripe';
import { logWaiver, waiverInput, waiverTextMatches } from '@/lib/legal';
import { clientIp } from '@/lib/ratelimit';
import { trackServer } from '@/lib/events';

export const runtime = 'nodejs';

/**
 * Bezahl-Gate.
 *
 * Drei Bedingungen, alle serverseitig geprüft:
 * 1. Das Ergebnis existiert, gehört zu dieser Nische und war beurteilbar.
 * 2. Es gibt mindestens eine Feststellung. Ohne Fund kein Kauf.
 * 3. Der Widerrufsverzicht nach § 356 Abs. 5 BGB liegt im Wortlaut vor und
 *    wird mit Zeitstempel protokolliert.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  const niche = resolveNicheOrNull(String(payload.niche || ''));
  if (!niche) return NextResponse.json({ error: 'Unbekannte Prüfung.' }, { status: 404 });

  const resultId = String(payload.resultId || '');
  const tierId = String(payload.tier || '');
  const email = typeof payload.email === 'string' && payload.email.includes('@') ? payload.email : undefined;

  const tier = findTier(niche, tierId);
  if (!tier) return NextResponse.json({ error: 'Unbekannte Preisstufe.' }, { status: 400 });

  const result = await loadResult(resultId);
  if (!result || result.niche !== niche.slug) {
    return NextResponse.json(
      { error: 'Das Prüfergebnis ist nicht mehr verfügbar. Bitte laden Sie das Dokument erneut hoch.' },
      { status: 404 },
    );
  }

  // Harter Abbruch vor dem Bezahl-Gate: nicht beurteilbar oder ohne Fund.
  if (!canPurchase(result)) {
    return NextResponse.json(
      { error: 'Für dieses Dokument gibt es keinen Bericht zu kaufen.' },
      { status: 409 },
    );
  }

  if (payload.waiverAccepted !== true || !waiverTextMatches(payload.waiverText)) {
    return NextResponse.json(
      { error: 'Bitte bestätigen Sie die Erklärung zum Widerrufsrecht im angezeigten Wortlaut.' },
      { status: 400 },
    );
  }

  const { ipHash, userAgent } = waiverInput(clientIp(request.headers), request.headers.get('user-agent'));
  await logWaiver({ resultId: result.id, niche: niche.slug, tier: tier.id, ipHash, userAgent });

  try {
    const session = await createCheckoutSession(niche, tier.id, result, email);

    await trackServer('checkout_started', {
      niche: niche.slug,
      experimentId: niche.experiment.id,
      catalogueVersion: result.catalogueVersion,
      tier: tier.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(JSON.stringify({ type: 'checkout_error', niche: niche.slug, error: String(err) }));
    return NextResponse.json({ error: 'Die Zahlung konnte nicht gestartet werden.' }, { status: 502 });
  }
}
