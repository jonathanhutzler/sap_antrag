import { NextResponse } from 'next/server';
import { findNiche } from '@/config/registry';
import { loadResult, markPaid } from '@/lib/store';
import { buildReportPdf } from '@/lib/report';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * PDF-Auslieferung. Nur für bezahlte Ergebnisse.
 *
 * Zwei Wege, ein Ergebnis als bezahlt zu erkennen:
 * 1. Der Webhook war schneller (Regelfall).
 * 2. Der Käufer ist vom Checkout zurück, der Webhook aber noch unterwegs. Dann
 *    wird die Stripe-Session direkt abgefragt — nicht dem Query-Parameter
 *    geglaubt, sondern bei Stripe nachgesehen.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const result = await loadResult(params.id);
  if (!result) {
    return NextResponse.json({ error: 'Bericht nicht gefunden oder abgelaufen.' }, { status: 404 });
  }

  const niche = findNiche(result.niche);
  if (!niche) {
    return NextResponse.json({ error: 'Nicht verfügbar.' }, { status: 404 });
  }

  let current = result;

  if (!current.paid) {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Für diesen Bericht liegt keine Zahlung vor.' }, { status: 402 });
    }

    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid' || session.metadata?.resultId !== current.id) {
        return NextResponse.json({ error: 'Für diesen Bericht liegt keine Zahlung vor.' }, { status: 402 });
      }
      const updated = await markPaid(
        current.id,
        {
          tier: session.metadata?.tier ?? '',
          stripeSessionId: session.id,
          customerEmail: session.customer_details?.email ?? undefined,
        },
        niche.legal.dataRetentionHours,
      );
      if (updated) current = updated;
    } catch {
      return NextResponse.json({ error: 'Die Zahlung konnte nicht bestätigt werden.' }, { status: 402 });
    }
  }

  const pdf = await buildReportPdf(current, niche);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="Pruefbericht-${niche.slug}-${current.id.slice(0, 8)}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
