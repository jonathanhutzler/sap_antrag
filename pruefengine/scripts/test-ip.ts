/**
 * Tests für den IP-Vergleich der Rate-Limit-Ausnahmen.
 *
 * Der Fall, um den es geht, steht ganz unten: Dieselbe Verbindung, anderes
 * Geräte-Suffix. Genau daran scheitert eine exakt eingetragene IPv6-Adresse
 * nach zwei Tagen.
 */

import { ipMatches, parseIp } from '../lib/ip';

let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${ok ? '' : `  (erwartet ${expected}, war ${actual})`}`);
}

console.log('\nAdressen parsen');
check('IPv4', parseIp('192.0.2.1')?.value, 3221225985n);
check('IPv4 mit zu großem Oktett', parseIp('192.0.2.300'), null);
check('IPv4 mit drei Teilen', parseIp('192.0.2'), null);
check('IPv6 vollständig', parseIp('2001:db8:0:0:0:0:0:1')?.value, parseIp('2001:db8::1')?.value);
check('IPv6 kurz', parseIp('::1')?.value, 1n);
check('IPv6 mit zwei ::', parseIp('2001::db8::1'), null);
check('IPv6 mit ungültiger Gruppe', parseIp('2001:zzzz::1'), null);
check(
  'IPv4-in-IPv6',
  parseIp('::ffff:192.0.2.1')?.value,
  parseIp('::ffff:c000:201')?.value,
);
check('Leer', parseIp('   '), null);

console.log('\nIPv4: exakt, kein Präfix');
check('gleiche Adresse', ipMatches('84.112.9.7', '84.112.9.7'), true);
check('andere Adresse im selben Netz', ipMatches('84.112.9.8', '84.112.9.7'), false);
check('mit ausdrücklichem /24', ipMatches('84.112.9.8', '84.112.9.0/24'), true);
check('außerhalb /24', ipMatches('84.112.10.8', '84.112.9.0/24'), false);

console.log('\nIPv6: ohne Angabe über 64 Bit');
check(
  'gleiches Netz, anderes Suffix',
  ipMatches('2a02:8109:abcd:1234:1111:2222:3333:4444', '2a02:8109:abcd:1234::'),
  true,
);
check(
  'anderes Netz',
  ipMatches('2a02:8109:abcd:9999:1111:2222:3333:4444', '2a02:8109:abcd:1234::'),
  false,
);
check(
  'ausdrückliches /48 fasst weiter',
  ipMatches('2a02:8109:abcd:9999:1111:2222:3333:4444', '2a02:8109:abcd::/48'),
  true,
);
check(
  'ausdrückliches /128 ist exakt',
  ipMatches('2a02:8109:abcd:1234::2', '2a02:8109:abcd:1234::1/128'),
  false,
);

console.log('\nRobustheit');
check('IPv4 gegen IPv6-Eintrag', ipMatches('84.112.9.7', '2a02:8109::'), false);
check('kaputter Eintrag', ipMatches('84.112.9.7', 'nicht-ip'), false);
check('kaputte Präfixlänge', ipMatches('2a02:8109::1', '2a02:8109::/999'), false);
check('unbekannte IP', ipMatches('0.0.0.0', '84.112.9.7'), false);
check('Leerzeichen im Eintrag', ipMatches('84.112.9.7', '  84.112.9.7  '), true);
check('/0 fasst alles', ipMatches('84.112.9.7', '0.0.0.0/0'), true);

console.log(
  '\nDer Fall aus der Praxis: Privacy Extensions rotieren das Suffix, das Netz bleibt.',
);
const gestern = '2a02:8109:abcd:1234:a1b2:c3d4:e5f6:0007';
const heute = '2a02:8109:abcd:1234:9f8e:7d6c:5b4a:0039';
const eintrag = '2a02:8109:abcd:1234::';
check('gestern erkannt', ipMatches(gestern, eintrag), true);
check('heute erkannt', ipMatches(heute, eintrag), true);
check('exakter Alt-Eintrag wäre heute blind', ipMatches(heute, gestern + '/128'), false);

console.log(failed === 0 ? '\nAlle Prüfungen bestanden.\n' : `\n${failed} Prüfung(en) fehlgeschlagen.\n`);
if (failed > 0) process.exit(1);
