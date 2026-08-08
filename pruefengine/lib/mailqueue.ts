import { Redis } from '@upstash/redis';

/**
 * Warteschlange für fehlgeschlagene Mails.
 *
 * Grund ist § 312f BGB: Die Vertragsbestätigung auf dauerhaftem Datenträger
 * ist Pflicht, kein Nice-to-have. Ein stiller Fehlversand ist damit kein
 * kosmetisches Problem — er fehlt in der Kette, die das Widerrufsrecht nach
 * § 356 Abs. 5 Nr. 3 BGB erlöschen lässt.
 *
 * Der Webhook darf deswegen trotzdem nicht scheitern: Ein Fehler dort schickt
 * Stripe in einen Wiederholungssturm, und der Kunde hat davon nichts. Also:
 * laut loggen, den Vorgang hier ablegen, und `npm run mail:resend` schickt
 * nach.
 */

export type MailKind = 'confirmation' | 'report';

export interface FailedMail {
  resultId: string;
  niche: string;
  kind: MailKind;
  reason: string;
  failedAt: string;
  attempts: number;
}

const KEY = 'mail:failed';

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const field = (resultId: string, kind: MailKind) => `${resultId}:${kind}`;

/**
 * Fehlversand vermerken. Loggt in jedem Fall — auch ohne Redis ist die Zeile
 * in den Runtime-Logs der einzige Hinweis, dass jemand nachfassen muss.
 */
export async function recordFailedMail(entry: Omit<FailedMail, 'failedAt' | 'attempts'>): Promise<void> {
  console.error(JSON.stringify({ type: 'mail_failed', ...entry }));

  const redis = getRedis();
  if (!redis) return;

  const key = field(entry.resultId, entry.kind);
  const existing = await redis.hget<string | FailedMail>(KEY, key);
  const previous = typeof existing === 'string' ? (JSON.parse(existing) as FailedMail) : existing;

  const record: FailedMail = {
    ...entry,
    failedAt: new Date().toISOString(),
    attempts: (previous?.attempts ?? 0) + 1,
  };

  await redis.hset(KEY, { [key]: JSON.stringify(record) });
}

export async function listFailedMails(): Promise<FailedMail[]> {
  const redis = getRedis();
  if (!redis) return [];

  const all = await redis.hgetall<Record<string, string | FailedMail>>(KEY);
  if (!all) return [];

  return Object.values(all).map((value) =>
    typeof value === 'string' ? (JSON.parse(value) as FailedMail) : value,
  );
}

export async function clearFailedMail(resultId: string, kind: MailKind): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hdel(KEY, field(resultId, kind));
}
