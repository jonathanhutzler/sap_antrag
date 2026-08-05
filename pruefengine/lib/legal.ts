import { Redis } from '@upstash/redis';
import { hashIp } from './id';
import { WAIVER_TEXT } from './waiver';

/**
 * Serverseite des Widerrufsverzichts nach § 356 Abs. 5 BGB.
 *
 * Der Bericht ist digitaler Inhalt, der sofort bereitsteht. Damit das
 * Widerrufsrecht erlischt, muss der Kunde vor dem Kauf ausdrücklich zustimmen
 * und bestätigen, dass er dadurch sein Widerrufsrecht verliert. Der Wortlaut
 * steht in lib/waiver.ts, hier liegt nur die Protokollierung.
 */
export { WAIVER_TEXT, waiverTextMatches } from './waiver';

export interface WaiverRecord {
  resultId: string;
  niche: string;
  tier: string;
  text: string;
  acceptedAt: string;
  ipHash: string;
  userAgent: string;
}

/**
 * Protokoll des Verzichts. Getrennt vom Prüfergebnis gespeichert und deutlich
 * länger aufbewahrt: das Ergebnis wird nach der Aufbewahrungsfrist gelöscht,
 * der Nachweis der Widerrufsbelehrung muss den Vertrag überdauern.
 */
export async function logWaiver(record: Omit<WaiverRecord, 'text' | 'acceptedAt'>): Promise<WaiverRecord> {
  const full: WaiverRecord = {
    ...record,
    text: WAIVER_TEXT,
    acceptedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify({ type: 'waiver', ...full }));

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const redis = new Redis({ url, token });
    // Drei Jahre — Regelverjährung nach § 195 BGB.
    await redis.set(`waiver:${record.resultId}`, JSON.stringify(full), { ex: 60 * 60 * 24 * 365 * 3 });
  }

  return full;
}

export function waiverInput(ip: string, userAgent: string | null): { ipHash: string; userAgent: string } {
  return { ipHash: hashIp(ip), userAgent: (userAgent || '').slice(0, 200) };
}
