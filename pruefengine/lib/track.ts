'use client';

import { track } from '@vercel/analytics';
import type { EventPayload, FunnelEvent } from './events';

/**
 * Clientseitige Senke: Vercel Analytics.
 *
 * Gezählt wird serverseitig (lib/events.ts) — das ist die Zahl, mit der später
 * `paid / upload_started` gerechnet wird. Dieser Aufruf existiert zusätzlich,
 * damit der Funnel im Analytics-Dashboard sichtbar ist, ohne dass die
 * Auswertung von einem Skript abhängt, das ein Blocker verhindern kann.
 *
 * `paid` wird hier nie gesendet: eine Zahlung gilt erst als Zahlung, wenn der
 * Stripe-Webhook sie bestätigt hat.
 */
export function trackClient(event: Exclude<FunnelEvent, 'paid'>, payload: EventPayload): void {
  try {
    track(event, {
      niche: payload.niche,
      experiment: payload.experimentId,
      catalogue: payload.catalogueVersion,
      tier: payload.tier ?? '',
    });
  } catch {
    // Analytics darf den Funnel nie unterbrechen.
  }
}
