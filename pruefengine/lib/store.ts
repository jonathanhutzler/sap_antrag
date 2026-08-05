import { Redis } from '@upstash/redis';
import type { AnalysisResult } from '@/config/schema';

/**
 * Ablage der Prüfergebnisse.
 *
 * Aufbewahrungsdauer kommt aus der Nischen-Config (`legal.dataRetentionHours`)
 * und wird als TTL gesetzt — die Löschung ist damit nicht von einem Cronjob
 * abhängig, den jemand abschalten kann. Die Datenschutzerklärung nennt
 * dieselbe Zahl, weil sie aus derselben Config gerendert wird.
 *
 * Ohne Upstash-Konfiguration (lokale Entwicklung) fällt der Speicher auf eine
 * Map im Prozess zurück. In der Produktion ist das keine Option: mehrere
 * Lambda-Instanzen teilen sich keinen Speicher.
 */

let redis: Redis | null = null;
const memory = new Map<string, { value: string; expires: number }>();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export function storeIsPersistent(): boolean {
  return getRedis() !== null;
}

const key = (id: string) => `result:${id}`;

export async function saveResult(result: AnalysisResult, ttlHours: number): Promise<void> {
  const ttl = Math.max(1, Math.round(ttlHours * 3600));
  const payload = JSON.stringify(result);
  const client = getRedis();

  if (client) {
    await client.set(key(result.id), payload, { ex: ttl });
    return;
  }
  memory.set(key(result.id), { value: payload, expires: Date.now() + ttl * 1000 });
}

export async function loadResult(id: string): Promise<AnalysisResult | null> {
  const client = getRedis();

  if (client) {
    const value = await client.get<string | AnalysisResult>(key(id));
    if (!value) return null;
    return typeof value === 'string' ? (JSON.parse(value) as AnalysisResult) : value;
  }

  const entry = memory.get(key(id));
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    memory.delete(key(id));
    return null;
  }
  return JSON.parse(entry.value) as AnalysisResult;
}

/**
 * Zahlung vermerken. Bewusst als Read-Modify-Write über dieselbe ID: das
 * Ergebnis bleibt ein Objekt, damit im PDF garantiert die Katalogversion
 * steht, unter der tatsächlich geprüft wurde.
 */
export async function markPaid(
  id: string,
  data: { tier: string; stripeSessionId: string; customerEmail?: string },
  ttlHours: number,
): Promise<AnalysisResult | null> {
  const result = await loadResult(id);
  if (!result) return null;
  if (result.paid) return result;

  const updated: AnalysisResult = {
    ...result,
    paid: true,
    paidAt: new Date().toISOString(),
    tier: data.tier,
    stripeSessionId: data.stripeSessionId,
    customerEmail: data.customerEmail,
  };

  // Nach der Zahlung länger aufbewahren als die reine Analysefrist, damit der
  // Käufer den Bericht noch einmal herunterladen kann.
  await saveResult(updated, Math.max(ttlHours, 72));
  return updated;
}
