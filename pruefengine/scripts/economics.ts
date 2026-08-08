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
 * Anteil der Besucher, die tatsächlich ein Dokument hochladen. ANNAHME.
 *
 * Diese Rate wird gern übersehen, und dann rechnet man falsch. `conversionBand`
 * in der Config ist Klick → Kauf. Die Modellkosten fallen aber nicht je Klick
 * an, sondern je Upload. Ohne diese zweite Rate lässt sich beides nicht
 * auseinanderhalten:
 *
 *   Modellkosten je Klick   = Uploadrate × Modellkosten
 *   Upload → Kauf           = Klick-zu-Kauf ÷ Uploadrate
 *
 * Der Wert ist geschätzt. Er steht in Vercel Analytics als
 * upload_started ÷ Seitenaufrufe, sobald Traffic da ist.
 */
const UPLOAD_RATE_BAND: [number, number] = [0.25, 0.4];

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

/**
 * Deckungsbeitrag je Verkauf und je Upload.
 *
 * Die zweite Zahl ist die, auf die es ankommt und die gern vergessen wird:
 * Der Modellaufruf fällt bei **jedem** Upload an, auch bei den 95 Prozent, die
 * nichts kaufen. Die kostenlose Vorschau ist die einzige Route, die Geld
 * kostet, bevor jemand bezahlt hat.
 */
function deckungsbeitrag(niche: NicheConfig): {
  jeVerkauf: number;
  /** Nach Abzug der Modellkosten des einen Uploads, der zu diesem Kauf führt. */
  jeUpload: [number, number];
  /** Nach Abzug der anteiligen Modellkosten je Klick. Ohne Werbekosten. */
  jeKlick: [number, number];
  /** Upload → Kauf, abgeleitet aus Klick-zu-Kauf und Uploadrate. */
  uploadZuKauf: [number, number];
} | null {
  const e = niche.economics;
  if (!e) return null;

  const stripe = e.planPriceCents * STRIPE_ANTEIL + STRIPE_FIX_CENTS;
  const jeVerkauf = e.planPriceCents - stripe - ZUSTELLUNG_CENTS;

  // Vorsichtiger Rand zuerst: wenige Käufer, viele Uploads.
  const u2kNiedrig = e.conversionBand[0] / UPLOAD_RATE_BAND[1];
  const u2kHoch = e.conversionBand[1] / UPLOAD_RATE_BAND[0];

  return {
    jeVerkauf,
    jeUpload: [
      jeVerkauf * u2kNiedrig - MODELL_CENTS_GESCHAETZT,
      jeVerkauf * u2kHoch - MODELL_CENTS_GESCHAETZT,
    ],
    jeKlick: [
      jeVerkauf * e.conversionBand[0] - MODELL_CENTS_GESCHAETZT * UPLOAD_RATE_BAND[1],
      jeVerkauf * e.conversionBand[1] - MODELL_CENTS_GESCHAETZT * UPLOAD_RATE_BAND[0],
    ],
    uploadZuKauf: [u2kNiedrig, u2kHoch],
  };
}

function deckungsbeitragTabelle(nischen: NicheConfig[]): void {
  console.log('\nDeckungsbeitrag ohne Werbekosten\n');
  console.log(
    `        ${'Nische'.padEnd(38)}${'je Verkauf'.padStart(12)}${'Upload→Kauf'.padStart(14)}${'je Upload'.padStart(18)}${'je Klick'.padStart(16)}`,
  );
  console.log('  ' + '─'.repeat(100));

  for (const niche of nischen) {
    const db = deckungsbeitrag(niche);
    if (!db) continue;

    const u2k = `${(db.uploadZuKauf[0] * 100).toFixed(0)}–${(db.uploadZuKauf[1] * 100).toFixed(0)} %`;
    const upl = `${euro(Math.round(db.jeUpload[0]))}–${euro(Math.round(db.jeUpload[1]))} €`;
    const klk = `${euro(Math.round(db.jeKlick[0]))}–${euro(Math.round(db.jeKlick[1]))} €`;

    console.log(
      `  ${(niche.active ? 'aktiv ' : '      ') + niche.slug.padEnd(38)}${(euro(Math.round(db.jeVerkauf)) + ' €').padStart(12)}${u2k.padStart(14)}${upl.padStart(18)}${klk.padStart(16)}`,
    );
  }

  console.log(
    `\n  Uploadrate angenommen mit ${UPLOAD_RATE_BAND[0] * 100}–${UPLOAD_RATE_BAND[1] * 100} %. Daraus folgt Upload→Kauf und die Verteilung der Modellkosten.`,
  );
  console.log('  Feste Kosten für Hosting, Redis, Mailversand und Domain sind nicht abgezogen.\n');
}

/**
 * Was ein Werbebudget bringt.
 *
 * Die Rechnung, die vor jeder Kampagne fehlt: Deckungsbeitrag je Klick minus
 * Klickpreis. Ist die Zahl negativ, kostet jeder gekaufte Klick Geld, und mehr
 * Budget kostet mehr Geld. Gerechnet wird gegen beide Ränder des Marktpreises.
 */
function adsTabelle(nischen: NicheConfig[]): void {
  const BUDGET_CENTS = 100000;

  console.log('Mit Ads: 1.000 € Budget\n');
  console.log(
    `        ${'Nische'.padEnd(38)}${'DB je Klick'.padStart(15)}${'bei günstigem CPC'.padStart(24)}${'bei teurem CPC'.padStart(22)}`,
  );
  console.log('  ' + '─'.repeat(100));

  for (const niche of nischen) {
    const db = deckungsbeitrag(niche);
    const e = niche.economics;
    if (!db || !e) continue;

    const ergebnis = (cpc: number): string => {
      const klicks = BUDGET_CENTS / cpc;
      const low = Math.round((klicks * (db.jeKlick[0] - cpc)) / 100);
      const high = Math.round((klicks * (db.jeKlick[1] - cpc)) / 100);
      const fmt = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('de-DE')}`;
      return `${fmt(low)} … ${fmt(high)} €`;
    };

    console.log(
      `  ${(niche.active ? 'aktiv ' : '      ') + niche.slug.padEnd(38)}${`${euro(Math.round(db.jeKlick[0]))}–${euro(Math.round(db.jeKlick[1]))} €`.padStart(15)}${`${euro(e.marketCpcCents[0])} €: ${ergebnis(e.marketCpcCents[0])}`.padStart(24)}${`${euro(e.marketCpcCents[1])} €: ${ergebnis(e.marketCpcCents[1])}`.padStart(22)}`,
    );
  }

  console.log(
    '\n  Ergebnis nach Werbekosten, ohne feste Kosten. Der linke Wert jeder Spanne ist der vorsichtige Rand.',
  );
  console.log(
    '  Negativ heißt: Jeder gekaufte Klick kostet Geld, und ein größeres Budget kostet mehr Geld.\n',
  );
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

  deckungsbeitragTabelle(sortiert);
  adsTabelle(sortiert);

  console.log('Einschätzung im Klartext\n');
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
