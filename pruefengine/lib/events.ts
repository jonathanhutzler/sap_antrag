/**
 * Funnel-Messung.
 *
 * Vier Ereignisse, jedes mit { niche, experimentId, catalogueVersion, tier? }.
 * Zielgröße ist `paid / upload_started` je Nische. Ohne diese Zahl ist jede
 * weitere Nische eine Wette, deshalb wird sie schon in Nische 1 mitgeführt,
 * obwohl das Bestandsprodukt sie nicht hatte.
 *
 * Zwei Senken:
 * - Client: Vercel Analytics Custom Event (ein Analytics-Konto für alle Nischen)
 * - Server: strukturierte Zeile in den Vercel-Logs, plus optionaler Webhook
 *   (EVENT_WEBHOOK_URL) für eine eigene Auswertung
 */

export const FUNNEL_EVENTS = ['upload_started', 'preview_shown', 'checkout_started', 'paid'] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export interface EventPayload {
  niche: string;
  experimentId: string;
  catalogueVersion: string;
  tier?: string;
}

export function isFunnelEvent(value: unknown): value is FunnelEvent {
  return typeof value === 'string' && (FUNNEL_EVENTS as readonly string[]).includes(value);
}

/** Serverseitige Senke. Wird auch von /api/events für Client-Ereignisse benutzt. */
export async function trackServer(event: FunnelEvent, payload: EventPayload): Promise<void> {
  const record = {
    type: 'funnel',
    event,
    niche: payload.niche,
    experiment: payload.experimentId,
    catalogue: payload.catalogueVersion,
    tier: payload.tier ?? null,
    at: new Date().toISOString(),
  };

  // Eine Zeile pro Ereignis, maschinenlesbar in den Vercel-Logs.
  console.log(JSON.stringify(record));

  const webhook = process.env.EVENT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
      // Messung darf die Antwort an den Nutzer nie aufhalten.
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Ein verlorenes Ereignis ist hinnehmbar, ein blockierter Request nicht.
  }
}
