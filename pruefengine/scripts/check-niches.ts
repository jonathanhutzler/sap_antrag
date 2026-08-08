/**
 * Freischalt-Prüfung für Nischen.
 *
 * Läuft vor jedem Deploy und beantwortet eine Frage: Ist diese Nische
 * vollständig, oder fehlt etwas, das erst im Livebetrieb auffällt?
 *
 * Die Regeln hier sind die Gegenprobe zur Architektur-Regel. Wenn eine Nische
 * hier durchfällt, fehlt Config — nicht Code.
 *
 * Aufruf: npm run check:niches
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { registry } from '../config/registry';
import { hasPlaceholders, site } from '../config/site';
import { buildSystemPrompt } from '../lib/prompt';
import { getCalculator } from '../lib/calculators';
import { SERIES } from '../lib/data/zinsreihe';
import { getFreeTool } from '../components/freetools';
import type { NicheConfig } from '../config/schema';

/** Kleinschreibung, keine Satzzeichen, einfache Leerzeichen. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let errors = 0;
let warnings = 0;

function fail(where: string, message: string): void {
  errors += 1;
  console.log(`  FEHLER  ${where}: ${message}`);
}

function warn(where: string, message: string): void {
  warnings += 1;
  console.log(`  Hinweis ${where}: ${message}`);
}

function ok(message: string): void {
  console.log(`  ok      ${message}`);
}

/**
 * Wirtschaftlichkeitsdaten. Für aktive Nischen Pflicht, für vorbereitete
 * geprüft, sobald sie da sind — eine verdrehte Spanne fällt sonst erst auf,
 * wenn das Budget schon läuft.
 */
function checkEconomics(niche: NicheConfig, where: string): void {
  const e = niche.economics;

  if (!e) {
    if (niche.active) {
      fail(where, 'aktiv, aber ohne economics-Block. Ohne Ziel-CPC ist jedes Werbebudget eine Wette.');
    }
    return;
  }

  if (e.planPriceCents <= 0) fail(where, 'economics.planPriceCents muss größer als 0 sein.');

  const bands: Array<[string, [number, number]]> = [
    ['conversionBand', e.conversionBand],
    ['targetCpcCents', e.targetCpcCents],
    ['marketCpcCents', e.marketCpcCents],
  ];
  for (const [name, band] of bands) {
    if (band[0] > band[1]) fail(where, `economics.${name} ist verdreht (${band.join(' bis ')}).`);
  }

  if (e.conversionBand[0] <= 0 || e.conversionBand[1] > 0.5) {
    fail(where, `economics.conversionBand liegt außerhalb des Plausiblen (${e.conversionBand.join(' bis ')}).`);
  }
  if (!e.marketCpcSource.trim()) {
    fail(where, 'economics.marketCpcSource ist leer. Eine geschätzte Zahl ohne Herkunft ist eine erfundene Zahl.');
  }
  if (!e.verdict.trim()) fail(where, 'economics.verdict ist leer.');

  // Der Planpreis sollte zu einer Preisstufe passen. Weicht er ab, ist das
  // erlaubt — bei zwei Stufen ist er ein Mischpreis —, aber es soll auffallen.
  const preise = niche.pricing.tiers.map((t) => t.priceCents);
  if (preise.length > 0 && (e.planPriceCents < Math.min(...preise) || e.planPriceCents > Math.max(...preise))) {
    warn(
      where,
      `economics.planPriceCents (${(e.planPriceCents / 100).toFixed(2)} €) liegt außerhalb der Preisstufen (${preise
        .map((p) => (p / 100).toFixed(2))
        .join(', ')} €).`,
    );
  }

  // Ads-Kanal, obwohl der vertretbare Klickpreis nicht einmal den unteren
  // Marktpreis erreicht: Das ist die Verwechslung, die Geld kostet.
  if (e.channel === 'ads' && e.targetCpcCents[1] < e.marketCpcCents[0]) {
    fail(
      where,
      `economics.channel steht auf „ads", aber der Ziel-CPC (bis ${(e.targetCpcCents[1] / 100).toFixed(2)} €) liegt unter dem Marktpreis (ab ${(e.marketCpcCents[0] / 100).toFixed(2)} €).`,
    );
  }
  if (niche.active && niche.experiment.adsBudgetCents > 0 && e.channel.startsWith('seo')) {
    warn(
      where,
      `Werbebudget ist gesetzt, economics.channel steht aber auf „${e.channel}". Einer der beiden Werte ist veraltet.`,
    );
  }
}

function checkInactive(niche: NicheConfig): void {
  // Eine inaktive Nische muss nur eines können: nicht erreichbar sein.
  if (niche.catalogue.published && niche.catalogue.checks.length === 0) {
    fail(niche.slug, 'Katalog ist als veröffentlicht markiert, enthält aber keine Prüfpunkte.');
  }

  // Doppelte IDs und verdrehte Euro-Bänder fallen sonst erst beim
  // Freischalten auf, und dann unter Zeitdruck.
  const ids = new Set<string>();
  for (const check of niche.catalogue.checks) {
    if (ids.has(check.id)) fail(niche.slug, `Prüfpunkt-ID „${check.id}" ist doppelt vergeben.`);
    ids.add(check.id);
    if (!check.basis.trim()) fail(niche.slug, `${check.id} hat keine Grundlage.`);
    if (check.euroImpact && check.euroImpact[0] > check.euroImpact[1]) {
      fail(niche.slug, `${check.id}: euroImpact ist verdreht (${check.euroImpact.join(' bis ')}).`);
    }
  }

  checkEconomics(niche, niche.slug);

  const offen = niche.legal.blockers?.length ?? 0;
  ok(
    `${niche.slug}: inaktiv, nicht erreichbar, nicht in der Sitemap. Katalog mit ${niche.catalogue.checks.length} Prüfpunkten, ${offen} offene Punkte bis zur Freischaltung.`,
  );
}

function checkActive(niche: NicheConfig): void {
  const where = niche.slug;

  // 1. Katalog
  if (!niche.catalogue.published) {
    fail(where, 'aktiv, aber der Prüfkatalog ist nicht veröffentlicht.');
  }
  if (niche.catalogue.checks.length === 0) {
    fail(where, 'aktiv, aber der Prüfkatalog ist leer.');
  }
  if (!niche.catalogue.version) {
    fail(where, 'Katalog ohne Version. Die Version steht in jedem Bericht und ist Pflicht.');
  }

  const ids = new Set<string>();
  for (const check of niche.catalogue.checks) {
    if (ids.has(check.id)) fail(where, `Prüfpunkt-ID „${check.id}" ist doppelt vergeben.`);
    ids.add(check.id);
    if (!check.basis.trim()) fail(where, `${check.id} hat keine Grundlage. Ohne Norm oder Referenzband kein Prüfpunkt.`);
    if (!check.instruction.trim()) fail(where, `${check.id} hat keinen Prüfauftrag.`);
    if (!check.category.trim()) fail(where, `${check.id} hat keine Kategorie.`);
    if (check.euroImpact && check.euroImpact[0] > check.euroImpact[1]) {
      fail(where, `${check.id}: euroImpact ist verdreht (${check.euroImpact.join(' bis ')}).`);
    }
  }

  // 2. Texte
  const texts: Array<[string, string]> = [
    ['brand.name', niche.brand.name],
    ['brand.claim', niche.brand.claim],
    ['input.docLabel', niche.input.docLabel],
    ['input.anchorField.label', niche.input.anchorField.label],
    ['ai.systemPrompt', niche.ai.systemPrompt],
    ['legal.disclaimer', niche.legal.disclaimer],
    ['legal.professionalAdviceNote', niche.legal.professionalAdviceNote],
    ['legal.serviceDescription', niche.legal.serviceDescription],
    ['landing.h1', niche.landing.h1],
    ['landing.subline', niche.landing.subline],
  ];
  for (const [field, value] of texts) {
    if (!value || !value.trim()) fail(where, `${field} ist leer.`);
  }

  if (niche.landing.proofPoints.length < 3) warn(where, 'weniger als drei proofPoints.');
  if (niche.landing.faq.length < 5) warn(where, 'weniger als fünf FAQ-Einträge — zu wenig für FAQPage-Auszeichnung.');
  if (niche.landing.sample.lines.length === 0) {
    fail(where, 'landing.sample ist leer. Ohne Beispielansicht fehlt der Landing ihr Signaturmotiv.');
  }
  for (const annotation of niche.landing.sample.annotations) {
    if (!ids.has(annotation.checkId)) {
      fail(where, `Beispielansicht verweist auf Prüfpunkt „${annotation.checkId}", den es im Katalog nicht gibt.`);
    }
    if (!niche.landing.sample.lines.some((l) => l.mark === annotation.mark)) {
      warn(where, `Markierung „${annotation.mark}" hat keine zugehörige Zeile in der Beispielansicht.`);
    }
  }

  // 3. Preise
  if (niche.pricing.tiers.length === 0) {
    fail(where, 'keine Preisstufe. Ohne Preis kein Bezahl-Gate.');
  }
  for (const tier of niche.pricing.tiers) {
    if (tier.priceCents <= 0) fail(where, `Preisstufe „${tier.id}" ohne Preis.`);
    if (tier.includes.length === 0) fail(where, `Preisstufe „${tier.id}" ohne Leistungsumfang — steht so auch in den AGB.`);
    if (!tier.stripePriceId) {
      warn(
        where,
        `Preisstufe „${tier.id}" ohne Stripe-Price-ID. Der Checkout fällt auf price_data zurück; für den Livebetrieb gehört die ID in .env.local.`,
      );
    }
  }
  if (niche.pricing.preview.hideEuroTotal !== true) {
    fail(where, 'hideEuroTotal ist nicht true. Die Euro-Summe ist der Kaufgrund und gehört nicht in die Vorschau.');
  }
  if (niche.pricing.preview.visibleFindings < 1) {
    warn(where, 'visibleFindings ist 0 — die Vorschau zeigt keine ausformulierte Feststellung.');
  }

  // 4. Modell
  if (niche.ai.maxTokens < 8000) {
    fail(where, `maxTokens ist ${niche.ai.maxTokens}. Unter 8000 läuft der Tool-Aufruf bei vollem Katalog aus.`);
  }
  const schema = niche.ai.outputTool.input_schema as { required?: string[] };
  for (const field of ['assessable', 'findings']) {
    if (!schema.required?.includes(field)) {
      fail(where, `outputTool: „${field}" fehlt in required. Ohne das ist die Ausgabe nicht erzwungen.`);
    }
  }

  const efforts = ['low', 'medium', 'high', 'xhigh', 'max'];
  if (niche.ai.effort && !efforts.includes(niche.ai.effort)) {
    fail(where, `ai.effort ist „${niche.ai.effort}". Erlaubt: ${efforts.join(', ')}.`);
  }
  if (niche.ai.effort && niche.ai.effort !== 'high') {
    // Kein Fehler, aber es soll niemand vergessen, warum der Wert dasteht.
    warn(
      where,
      `ai.effort steht auf „${niche.ai.effort}". Vor einer Senkung gehört eine Messung mit npm run measure:effort — dabei kann eine ganze Prüfkategorie wegfallen.`,
    );
  }

  const maxFindings = niche.ai.maxFindings;
  if (maxFindings !== undefined) {
    if (!Number.isInteger(maxFindings) || maxFindings < 1) {
      fail(where, `ai.maxFindings ist ${maxFindings}. Erwartet wird eine ganze Zahl ab 1.`);
    } else if (maxFindings > niche.catalogue.checks.length) {
      warn(
        where,
        `ai.maxFindings (${maxFindings}) liegt über der Kataloggröße (${niche.catalogue.checks.length}) und greift damit nie.`,
      );
    }
  }

  // 5. Recht
  if (niche.legal.dataRetentionHours <= 0) fail(where, 'dataRetentionHours muss größer als 0 sein.');

  // 5b. Wirtschaftlichkeit. Eine aktive Nische ohne diese Zahlen ist eine
  //     Wette, und der Kill-Switch im Experiment hat nichts, woran er misst.
  checkEconomics(niche, where);

  // 6. Silo
  const blogDir = path.join(process.cwd(), 'content', 'blog', niche.slug);
  const articles = existsSync(blogDir) ? readdirSync(blogDir).filter((f) => f.endsWith('.md')) : [];
  if (articles.length < 8) {
    warn(where, `nur ${articles.length} Artikel im Silo content/blog/${niche.slug}/ — angepeilt sind 8 bis 10.`);
  }

  // Keyword-Kollision. Zwei eigene Seiten auf denselben Begriff schwächen
  // beide, und die Geldseite verliert dabei mehr. Verglichen wird die
  // Kernphrase der H1 gegen jeden Artikeltitel.
  const moneyPhrase = normalize(niche.landing.h1.split(/[,:.—–-]/)[0]);
  if (moneyPhrase.split(' ').length >= 2) {
    for (const file of articles) {
      const source = readFileSync(path.join(blogDir, file), 'utf8');
      const title = source.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? '';
      if (title && normalize(title).includes(moneyPhrase)) {
        warn(
          where,
          `content/blog/${niche.slug}/${file} greift dasselbe Keyword an wie die Landing („${moneyPhrase}"). Andere Suchabsicht wählen.`,
        );
      }
    }
  }

  // 7. Der generierte Prompt muss den Katalog tatsächlich enthalten.
  //    Bei Rechennischen wendet nicht das Modell den Katalog an, sondern der
  //    Rechner — dort ist die Prüfung deshalb eine andere.
  if (!niche.computePipeline) {
    const prompt = buildSystemPrompt(niche);
    const missing = niche.catalogue.checks.filter((c) => !prompt.includes(c.id));
    if (missing.length > 0) {
      fail(where, `${missing.length} Prüfpunkte stehen nicht im generierten System-Prompt.`);
    }
  } else {
    const pipeline = niche.computePipeline;

    if (!getCalculator(pipeline.calculator)) {
      fail(where, `Rechner „${pipeline.calculator}" ist nicht in lib/calculators/index.ts registriert.`);
    }

    // Das Extraktionsschema darf keine Bewertungsfelder haben. Genau darüber
    // würde die Trennung zwischen Ablesen und Rechnen wieder aufweichen.
    const schema = pipeline.extractionTool.input_schema as { properties?: Record<string, unknown> };
    const verboten = ['findings', 'bewertung', 'einschaetzung', 'urteil', 'empfehlung', 'schaden', 'vfeBerechnetEuro'];
    for (const key of Object.keys(schema.properties ?? {})) {
      if (verboten.some((v) => key.toLowerCase().includes(v.toLowerCase()))) {
        fail(
          where,
          `Extraktionsschema enthält das Feld „${key}". Ein Rechner-Modell liest ab und bewertet nicht.`,
        );
      }
    }

    if (pipeline.tolerancePercent <= 0) {
      warn(where, 'tolerancePercent ist 0 — jede noch so kleine Abweichung erzeugt eine Feststellung.');
    }

    if (pipeline.dataSources.length === 0) {
      warn(where, 'computePipeline ohne dataSources — im Bericht steht dann nicht, worauf gerechnet wurde.');
    }

    if (!SERIES.verified) {
      fail(
        where,
        `Rechennische, aber die Zinsreihe „${SERIES.id}" ist nicht verifiziert. Kennung, Bezugsquelle und historische Stände prüfen, dann RATE_SERIES_VERIFIED=true setzen.`,
      );
    }
  }

  // 8. Kostenlose Werkzeuge müssen umgesetzt sein
  for (const tool of niche.freeTools ?? []) {
    if (!getFreeTool(tool.id)) {
      fail(where, `Kostenloses Werkzeug „${tool.id}" ist nicht in components/freetools/index.ts registriert.`);
    }
    if (!tool.slug || !tool.title || !tool.intro) {
      fail(where, `Kostenloses Werkzeug „${tool.id}" ist unvollständig konfiguriert.`);
    }
  }

  // 9. Ausdrückliche Blocker der Nische
  for (const blocker of niche.legal.blockers ?? []) {
    fail(where, `Blocker: ${blocker}`);
  }

  // 10. Alias-Domains bleiben Alias
  for (const domain of niche.aliasDomains) {
    if (domain === site.domain) {
      fail(where, 'aliasDomains enthält die Dachdomain. Kanonisch bleibt der Pfad unter der Dachdomain.');
    }
  }

  ok(
    `${niche.slug}: aktiv, Katalog ${niche.catalogue.version} mit ${niche.catalogue.checks.length} Prüfpunkten, ` +
      `${niche.pricing.tiers.length} Preisstufe(n), ${articles.length} Artikel.`,
  );
}

console.log('Prüfe Registry …\n');

const slugs = new Set<string>();
for (const niche of registry) {
  if (slugs.has(niche.slug)) fail('registry', `Slug „${niche.slug}" ist doppelt vergeben.`);
  slugs.add(niche.slug);

  if (!/^[a-z0-9-]+$/.test(niche.slug)) {
    fail(niche.slug, 'Slug enthält Zeichen außerhalb von a–z, 0–9 und Bindestrich.');
  }

  const configFile = path.join(process.cwd(), 'config', 'niches', `${niche.slug}.ts`);
  if (!existsSync(configFile)) {
    warn(niche.slug, `config/niches/${niche.slug}.ts nicht gefunden — Dateiname und Slug sollten übereinstimmen.`);
  }

  if (niche.active) checkActive(niche);
  else checkInactive(niche);
}

// Keine aktive Nische heißt: nichts zu verkaufen. Der Hub zeigt eine leere
// Liste, die AGB beschreiben keine Leistung, die Sitemap führt nur Rechtsseiten.
// Als Zwischenstand ist das in Ordnung, als Deploy nicht.
if (registry.filter((n) => n.active).length === 0) {
  fail(
    'Registry',
    'Keine einzige Nische ist aktiv. Der Hub hätte nichts anzubieten und die AGB keine Leistungsbeschreibung.',
  );
}

console.log('\nPrüfe Anbieterdaten …\n');
if (hasPlaceholders()) {
  fail('config/site.ts', 'Es stehen noch Platzhalter in den Anbieterdaten. Impressum und AGB sind unvollständig.');
} else {
  ok('Anbieterdaten vollständig.');
}

console.log('');
if (errors > 0) {
  console.error(`${errors} Fehler, ${warnings} Hinweis(e). Nicht deployen.`);
  process.exit(1);
}
console.log(`Keine Fehler, ${warnings} Hinweis(e).`);
