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
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import { registry } from '../config/registry';
import { hasPlaceholders, site } from '../config/site';
import { buildSystemPrompt } from '../lib/prompt';
import type { NicheConfig } from '../config/schema';

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

function checkInactive(niche: NicheConfig): void {
  // Eine inaktive Nische muss nur eines können: nicht erreichbar sein.
  if (niche.catalogue.published && niche.catalogue.checks.length === 0) {
    fail(niche.slug, 'Katalog ist als veröffentlicht markiert, enthält aber keine Prüfpunkte.');
  }
  ok(`${niche.slug}: inaktiv, nicht erreichbar, nicht in der Sitemap.`);
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

  // 5. Recht
  if (niche.legal.dataRetentionHours <= 0) fail(where, 'dataRetentionHours muss größer als 0 sein.');

  // 6. Silo
  const blogDir = path.join(process.cwd(), 'content', 'blog', niche.slug);
  const articles = existsSync(blogDir) ? readdirSync(blogDir).filter((f) => f.endsWith('.md')) : [];
  if (articles.length < 8) {
    warn(where, `nur ${articles.length} Artikel im Silo content/blog/${niche.slug}/ — angepeilt sind 8 bis 10.`);
  }

  // 7. Der generierte Prompt muss den Katalog tatsächlich enthalten
  const prompt = buildSystemPrompt(niche);
  const missing = niche.catalogue.checks.filter((c) => !prompt.includes(c.id));
  if (missing.length > 0) {
    fail(where, `${missing.length} Prüfpunkte stehen nicht im generierten System-Prompt.`);
  }

  // 8. Alias-Domains bleiben Alias
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
