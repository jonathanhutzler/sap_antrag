import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate-Limiting ab Tag 1 auf der Analyse-Route.
 *
 * Ein Modellaufruf auf einem mehrseitigen PDF kostet echtes Geld; ohne Limit
 * ist die Route eine offene Rechnung. Die eigene IP wird über
 * RATE_LIMIT_ALLOWLIST_IPS ausgenommen, damit Tests und Demos nicht am
 * eigenen Limit hängenbleiben.
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

export async function checkRateLimit(ip: string): Promise<RateLimitVerdict> {
  if (allowlist().includes(ip)) {
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
