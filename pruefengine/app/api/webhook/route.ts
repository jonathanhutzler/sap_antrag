import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { findNiche } from '@/config/registry';
import { loadResult, markPaid } from '@/lib/store';
import { buildReportPdf } from '@/lib/report';
import { sendConfirmationMail, sendReportMail } from '@/lib/mail';
import { recordFailedMail } from '@/lib/mailqueue';
import { trackServer } from '@/lib/events';

export const runtime = 'nodejs';

/**
 * Stripe-Webhook. Einzige Stelle, an der eine Zahlung als bestätigt gilt.
 *
 * Der Erfolgs-Redirect nach dem Checkout ist keine Bestätigung — er lässt sich
 * aufrufen, ohne bezahlt zu haben. `paid` wird deshalb nur hier gezählt.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Signatur fehlt.' }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error(JSON.stringify({ type: 'webhook_signature_error', error: String(err) }));
    return NextResponse.json({ error: 'Signatur ungültig.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  const metadata = session.metadata ?? {};
  const nicheSlug = metadata.niche ?? '';
  const resultId = metadata.resultId ?? '';
  const tier = metadata.tier ?? '';

  const niche = findNiche(nicheSlug);
  if (!niche || !resultId) {
    console.error(JSON.stringify({ type: 'webhook_unknown_metadata', metadata }));
    return NextResponse.json({ received: true });
  }

  const existing = await loadResult(resultId);
  if (!existing) {
    // Ergebnis bereits abgelaufen. Die Zahlung ist trotzdem gültig — der Fall
    // gehört in den Support, nicht in einen stillen Abbruch.
    console.error(
      JSON.stringify({ type: 'webhook_result_expired', resultId, niche: nicheSlug, session: session.id }),
    );
    return NextResponse.json({ received: true });
  }

  // Stripe liefert dasselbe Ereignis unter Umständen mehrfach.
  const alreadyPaid = existing.paid;

  const result = await markPaid(
    resultId,
    {
      tier,
      stripeSessionId: session.id,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
    },
    niche.legal.dataRetentionHours,
  );

  if (!result || alreadyPaid) {
    return NextResponse.json({ received: true });
  }

  await trackServer('paid', {
    niche: niche.slug,
    experimentId: niche.experiment.id,
    catalogueVersion: result.catalogueVersion,
    tier,
  });

  // Reihenfolge mit Absicht: erst die Vertragsbestätigung nach § 312f BGB,
  // dann der Bericht. Die Bestätigung ist Pflicht und darf nicht daran
  // scheitern, dass ein PDF nicht gebaut werden kann.
  try {
    const confirmation = await sendConfirmationMail(result, niche);
    if (!confirmation.sent) {
      await recordFailedMail({
        resultId,
        niche: niche.slug,
        kind: 'confirmation',
        reason: confirmation.reason ?? 'unbekannt',
      });
    }
  } catch (err) {
    await recordFailedMail({
      resultId,
      niche: niche.slug,
      kind: 'confirmation',
      reason: String(err),
    });
  }

  try {
    const pdf = await buildReportPdf(result, niche);
    const mail = await sendReportMail(result, niche, pdf);
    if (!mail.sent) {
      await recordFailedMail({ resultId, niche: niche.slug, kind: 'report', reason: mail.reason ?? 'unbekannt' });
    }
  } catch (err) {
    // Der Bericht bleibt über die Ergebnisseite abrufbar; ein fehlgeschlagener
    // Versand darf den Webhook nicht in einen Retry-Sturm schicken.
    console.error(JSON.stringify({ type: 'report_error', resultId, error: String(err) }));
    await recordFailedMail({ resultId, niche: niche.slug, kind: 'report', reason: String(err) });
  }

  return NextResponse.json({ received: true });
}
