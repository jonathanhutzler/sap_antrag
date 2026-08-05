import { randomBytes, createHash } from 'crypto';

/** Ergebnis-ID. Nicht ratbar, weil sie zugleich der Zugriffsschlüssel ist. */
export function newResultId(): string {
  return randomBytes(16).toString('base64url');
}

/** IP nur als Hash protokollieren — für die Widerrufsdokumentation reicht das. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'pruefengine';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}
