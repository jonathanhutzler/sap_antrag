/**
 * IP-Vergleich für die Rate-Limit-Ausnahmen.
 *
 * Eine exakt eingetragene IPv6-Adresse passt nach zwei Tagen nicht mehr:
 * Anschlüsse behalten ihr Netz-Präfix, rotieren aber das Geräte-Suffix
 * (Privacy Extensions, RFC 4941). Wer seine eigene Adresse einträgt, um beim
 * Testen nicht am eigenen Limit hängenzubleiben, steht ohne Präfix-Vergleich
 * am Montag wieder davor.
 *
 * Regel:
 * - Eintrag mit `/N` — Vergleich über die ersten N Bit.
 * - IPv6 ohne `/N` — Vergleich über die ersten 64 Bit, also das Netz des
 *   Anschlusses. Das ist genau die Grenze, unterhalb derer das Suffix
 *   rotiert.
 * - IPv4 ohne `/N` — exakter Vergleich. Eine IPv4-Adresse wechselt im Ganzen,
 *   ein Präfix-Vergleich wäre hier viel zu weit.
 */

interface ParsedIp {
  value: bigint;
  bits: 32 | 128;
}

function parseIpv4(ip: string): bigint | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function parseIpv6(ip: string): bigint | null {
  // IPv4-in-IPv6 (::ffff:192.0.2.1) auf Hex-Gruppen bringen.
  const mapped = ip.match(/^(.*:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (mapped) {
    const v4 = parseIpv4(mapped[2]);
    if (v4 === null) return null;
    const high = (v4 >> 16n).toString(16);
    const low = (v4 & 0xffffn).toString(16);
    ip = `${mapped[1]}${high}:${low}`;
  }

  const doubleColon = ip.split('::');
  if (doubleColon.length > 2) return null;

  const toGroups = (part: string): string[] => (part ? part.split(':') : []);
  const head = toGroups(doubleColon[0]);
  const tail = doubleColon.length === 2 ? toGroups(doubleColon[1]) : [];

  if (doubleColon.length === 1 && head.length !== 8) return null;
  if (head.length + tail.length > 8) return null;

  const groups = [
    ...head,
    ...Array<string>(8 - head.length - tail.length).fill('0'),
    ...tail,
  ];

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    value = (value << 16n) | BigInt(Number.parseInt(group, 16));
  }
  return value;
}

export function parseIp(ip: string): ParsedIp | null {
  const trimmed = ip.trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const value = parseIpv6(trimmed);
    return value === null ? null : { value, bits: 128 };
  }

  const value = parseIpv4(trimmed);
  return value === null ? null : { value, bits: 32 };
}

/** Standardpräfix für IPv6-Einträge ohne ausdrückliche Länge. */
export const DEFAULT_IPV6_PREFIX = 64;

/**
 * Passt `ip` auf den Allowlist-Eintrag `entry`?
 *
 * Unbrauchbare Einträge geben `false` zurück statt zu werfen — eine kaputte
 * Umgebungsvariable darf die Analyse-Route nicht abschießen.
 */
export function ipMatches(ip: string, entry: string): boolean {
  const [network, prefixText] = entry.trim().split('/');

  const parsedEntry = parseIp(network);
  const parsedIp = parseIp(ip);
  if (!parsedEntry || !parsedIp) return false;
  if (parsedEntry.bits !== parsedIp.bits) return false;

  let prefix: number;
  if (prefixText !== undefined) {
    prefix = Number(prefixText);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > parsedEntry.bits) return false;
  } else {
    prefix = parsedEntry.bits === 128 ? DEFAULT_IPV6_PREFIX : 32;
  }

  if (prefix === 0) return true;

  const shift = BigInt(parsedEntry.bits - prefix);
  return parsedEntry.value >> shift === parsedIp.value >> shift;
}
