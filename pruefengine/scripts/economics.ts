/**
 * Wirtschaftlichkeit je Nische.
 *
 *   npm run economics
 *
 * Rechnet aus Preis und angenommener Conversion den vertretbaren Klickpreis
 * und stellt ihn dem Marktpreis gegenüber. Die Einschätzung in der Spalte
 * rechts wird berechnet, nicht aus der Config abgeschrieben — wenn jemand
 * einen Preis ändert und die Einschätzung stehen lässt, fällt das hier auf.
 *
 * Die Rechnung dahinter, offen und nachprüfbar:
 *
 *   Umsatz je Klick   = Preis × Conversion
 *   variable Kosten   = Zahlungsgebühr + Modellaufruf + Zustellung, je Verkauf
 *   Deckungsbeitrag   = (Preis − variable Kosten) × Conversion
 *   Ziel-CPC          = Deckungsbeitrag × ADS_ANTEIL
 *
 * ADS_ANTEIL ist die Entscheidung, wie viel vom Deckungsbeitrag in den Klick
 * fließen darf. Bei 1,0 arbeitet die Nische zum Selbstkostenpreis.
 */

import { registry } from '../config/registry';
import type { NicheConfig } from '../config/schema';

/** Stripe: 1,5 % plus 25 Cent für europäische Karten, Stand 08/2026. */
const STRIPE_ANTEIL = 0.015;
const STRIPE_FIX_CENTS = 25;

/**
 * Modellkosten je Prüfung in Cent. GESCHÄTZT — es gibt für diese Engine noch
 * keinen gemessenen Lauf. `npm run measure:effort` liefert den echten Wert;
 * bis dahin ist jede Zahl hier eine Annahme und als solche gekennzeichnet.
 */
const MODELL_CENTS_GESCHAETZT = 60;

/** Resend und Zustellung, grob. */
const ZUSTELLUNG_CENTS = 5;

/**
 * Anteil des Deckungsbeitrags, der in den Klick fließen darf.
 *
 * 0,4 heißt: 60 Prozent des Deckungsbeitrags bleiben nach dem Klick übrig.
 * Der Wert ist eine Entscheidung, keine Ableitung — er reproduziert die
 * Planungstabelle, aus der die eingetragenen Ziel-CPCs stammen, auf wenige
 * Cent genau. Wer aggressiver einkaufen will, dreht ihn hoch und weiß dann,
 * was er aufgibt.
 */
const ADS_ANTEIL = 0.4;

const euro = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

type Lage = 'traegt' | 'longtail' | 'grenzwertig' | 'unprofitabel';

const LAGE_TEXT: Record<Lage, string> = {
  traegt: 'trägt',
  longtail: 'nur Longtail',
  grenzwertig: 'grenzwertig',
  unprofitabel: 'unprofitabel',
};

/**
 * Wo liegt der vertretbare Klickpreis zum Marktpreis?
 *
 * `traegt`       — auch der obere Marktpreis ist bezahlbar.
 * `longtail`     — die Bänder überlappen, also nur genaue Begriffe.
 * `grenzwertig`  — knapp darunter, bis 15 Prozent Abstand.
 * `unprofitabel` — deutlich darunter.
 */
function lage(target: [number, number], market: [number, number]): Lage {
  if (target[1] >= market[1]) return 'traegt';
  if (target[1] >= market[0]) return 'longtail';
  if (target[1] >= market[0] * 0.85) return 'grenzwertig';
  return 'unprofitabel';
}

/** Ziel-CPC aus Preis und Conversion, in Cent. */
function berechneTarget(preisCents: number, conversion: [number, number]): [number, number] {
  const variabel = preisCents * STRIPE_ANTEIL + STRIPE_FIX_CENTS + MODELL_CENTS_GESCHAETZT + ZUSTELLUNG_CENTS;
  const db = Math.max(0, preisCents - variabel);
  return [Math.round(db * conversion[0] * ADS_ANTEIL), Math.round(db * conversion[1] * ADS_ANTEIL)];
}

function zeile(niche: NicheConfig): string | null {
  const e = niche.economics;
  if (!e) return null;

  const gerechnet = berechneTarget(e.planPriceCents, e.conversionBand);
  const eingetragen = e.targetCpcCents;
  const l = lage(eingetragen, e.marketCpcCents);

  const status = niche.active ? 'aktiv ' : '      ';
  const conv = `${(e.conversionBand[0] * 100).toFixed(1)}–${(e.conversionBand[1] * 100).toFixed(1)} %`;

  return [
    `${status}${niche.slug.padEnd(38)}`,
    `${euro(e.planPriceCents).padStart(7)} €`,
    `${conv.padStart(12)}`,
    `${`${euro(eingetragen[0])}–${euro(eingetragen[1])}`.padStart(13)} €`,
    `${`${euro(e.marketCpcCents[0])}–${euro(e.marketCpcCents[1])}`.padStart(13)} €`,
    `  ${LAGE_TEXT[l].padEnd(13)}`,
    `${e.channel}`,
    `${gerechnet[1] < eingetragen[0] || gerechnet[0] > eingetragen[1] ? `   ← nachgerechnet ${euro(gerechnet[0])}–${euro(gerechnet[1])} €` : ''}`,
  ].join('');
}

function main(): void {
  const mitDaten = registry.filter((n) => n.economics);
  const ohneDaten = registry.filter((n) => !n.economics);

  console.log('\nWirtschaftlichkeit je Nische');
  console.log(
    `Annahmen: Stripe ${STRIPE_ANTEIL * 100} % + ${STRIPE_FIX_CENTS} ct, Modell ${MODELL_CENTS_GESCHAETZT} ct (GESCHÄTZT), Zustellung ${ZUSTELLUNG_CENTS} ct, ${ADS_ANTEIL * 100} % des Deckungsbeitrags in den Klick.\n`,
  );

  console.log(
    `        ${'Nische'.padEnd(38)}${'Preis'.padStart(9)}${'Conversion'.padStart(12)}${'Ziel-CPC'.padStart(15)}${'Markt-CPC'.padStart(15)}  ${'Lage'.padEnd(13)}Kanal`,
  );
  console.log('  ' + '─'.repeat(118));

  // Sortiert nach dem, was zählt: Wie weit trägt der Klickpreis?
  const rang: Record<Lage, number> = { traegt: 0, longtail: 1, grenzwertig: 2, unprofitabel: 3 };
  const sortiert = [...mitDaten].sort((a, b) => {
    const la = lage(a.economics!.targetCpcCents, a.economics!.marketCpcCents);
    const lb = lage(b.economics!.targetCpcCents, b.economics!.marketCpcCents);
    if (rang[la] !== rang[lb]) return rang[la] - rang[lb];
    return b.economics!.planPriceCents - a.economics!.planPriceCents;
  });

  for (const niche of sortiert) {
    const z = zeile(niche);
    if (z) console.log('  ' + z);
  }

  console.log('\nEinschätzung im Klartext\n');
  for (const niche of sortiert) {
    console.log(`  ${niche.slug}`);
    console.log(`    ${niche.economics!.verdict}`);
    console.log(`    Marktwert: ${niche.economics!.marketCpcSource}\n`);
  }

  if (ohneDaten.length > 0) {
    console.log('Ohne Wirtschaftlichkeitsdaten:');
    for (const niche of ohneDaten) console.log(`  ${niche.slug}`);
    console.log('');
  }

  console.log(
    'Der Modellkostenwert ist geschätzt. Solange das so ist, ist jede Zahl in der Spalte Ziel-CPC eine Annahme.',
  );
  console.log('Ein Lauf mit npm run measure:effort ersetzt sie durch einen gemessenen Wert.\n');
}

main();
