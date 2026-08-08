import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ipMatches } from './ip';

/**
 * Rate-Limiting ab Tag 1 auf der Analyse-Route.
 *
 * Ein Modellaufruf auf einem mehrseitigen PDF kostet echtes Geld; ohne Limit
 * ist die Route eine offene Rechnung. Die eigene Verbindung wird über
 * RATE_LIMIT_ALLOWLIST_IPS ausgenommen, damit Tests und Demos nicht am
 * eigenen Limit hängenbleiben.
 *
 * Die Liste ist kommagetrennt und versteht drei Formen:
 *   2a02:8109:abcd:1234::         IPv6, verglichen über die ersten 64 Bit
 *   2a02:8109:abcd::/48           IPv6 mit eigener Präfixlänge
 *   84.112.9.7                    IPv4, exakt
 */

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'rl:analyze',
  });
  return limiter;
}

function allowlist(): string[] {
  return (process.env.RATE_LIMIT_ALLOWLIST_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') || '0.0.0.0';
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  reason?: 'allowlist' | 'not-configured' | 'limit';
}

/**
 * Ausnahme für die eigene Verbindung.
 *
 * Verglichen wird über Präfixe, nicht exakt: IPv6-Anschlüsse rotieren das
 * Geräte-Suffix, eine hart eingetragene Adresse passt nach zwei Tagen nicht
 * mehr. Details in lib/ip.ts.
 */
export function isAllowlisted(ip: string): boolean {
  return allowlist().some((entry) => ipMatches(ip, entry));
}

export async function checkRateLimit(ip: string): Promise<RateLimitVerdict> {
  if (isAllowlisted(ip)) {
    return { allowed: true, remaining: 999, resetInSeconds: 0, reason: 'allowlist' };
  }

  const rl = getLimiter();
  if (!rl) {
    return { allowed: true, remaining: 999, resetInSeconds: 0, reason: 'not-configured' };
  }

  const { success, remaining, reset } = await rl.limit(ip);
  return {
    allowed: success,
    remaining,
    resetInSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
    reason: success ? undefined : 'limit',
  };
}
