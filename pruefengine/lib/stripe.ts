import Stripe from 'stripe';
import type { AnalysisResult, NicheConfig } from '@/config/schema';
import { siteUrl } from '@/config/site';

/**
 * Ein Stripe-Konto für alle Nischen. Die Trennung passiert über
 * `metadata.niche` und `metadata.experiment` — auf der Session und auf dem
 * PaymentIntent, damit sich Umsatz je Nische auch im Stripe-Dashboard ohne
 * Umweg filtern lässt.
 *
 * Fallstrick: serverseitig gehört der Secret Key hierher (sk_...), nicht der
 * Publishable Key. Mit pk_ antwortet Stripe mit einem 401, das wie ein
 * Konfigurationsfehler an ganz anderer Stelle aussieht.
 */

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY fehlt.');
  if (!key.startsWith('sk_') && !key.startsWith('rk_')) {
    throw new Error('STRIPE_SECRET_KEY ist kein Secret Key. Serverseitig wird sk_… benötigt.');
  }
  stripe = new Stripe(key);
  return stripe;
}

export function findTier(niche: NicheConfig, tierId: string) {
  return niche.pricing.tiers.find((t) => t.id === tierId) ?? null;
}

export async function createCheckoutSession(
  niche: NicheConfig,
  tierId: string,
  result: AnalysisResult,
  email?: string,
): Promise<Stripe.Checkout.Session> {
  const tier = findTier(niche, tierId);
  if (!tier) throw new Error(`Unbekannte Preisstufe „${tierId}" in Nische ${niche.slug}.`);

  const metadata: Record<string, string> = {
    niche: niche.slug,
    experiment: niche.experiment.id,
    catalogueVersion: result.catalogueVersion,
    tier: tier.id,
    resultId: result.id,
  };

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = tier.stripePriceId
    ? { price: tier.stripePriceId, quantity: 1 }
    : {
        // Fallback ohne angelegte Price-ID: Preis aus der Config. Für den
        // Live-Betrieb gehört die Price-ID in .env.local, damit Preisänderungen
        // in Stripe nachvollziehbar bleiben.
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: tier.priceCents,
          product_data: {
            name: `${niche.brand.name} — ${tier.label}`,
            description: niche.legal.serviceDescription,
          },
        },
      };

  return getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [lineItem],
    customer_email: email,
    metadata,
    payment_intent_data: { metadata },
    // Stripes eigene Quittung ist im Dashboard abzuschalten; der Bericht geht
    // über Resend raus, zwei Mails aus zwei Systemen verwirren nur.
    success_url: `${siteUrl(`/${niche.slug}/ergebnis/${result.id}`)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl(`/${niche.slug}/pruefung`)}?abgebrochen=1&ergebnis=${result.id}`,
    locale: 'de',
    allow_promotion_codes: false,
  });
}
