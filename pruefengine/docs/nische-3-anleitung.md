# So legst du Nische 3 an

Diese Anleitung ist zugleich der Beweis, dass die harte Architektur-Regel hält:
Wenn beim Durchgehen an irgendeiner Stelle eine Komponente, eine Route oder
API-Logik angefasst werden muss, ist die Engine falsch geschnitten. Dann gehört
die Engine umgebaut — nicht die Regel aufgeweicht.

**Berührte Dateien: drei.** Plus einen Ordner mit Artikeln.

```
config/niches/<slug>.ts                 neu
config/catalogues/<slug>.<version>.ts   neu
config/registry.ts                      zwei Zeilen
content/blog/<slug>/                    neu, 8 bis 10 Artikel
```

Aufwand: ein bis zwei Tage, davon der größte Teil im Prüfkatalog und in den
Texten. Der technische Teil ist eine Stunde.

---

## Schritt 0 — Gate 0 bestehen

Bevor eine Zeile entsteht: [`gate-0.md`](gate-0.md). Eine einzige
Kill-Bedingung reicht. Diese halbe Stunde ist billiger als zwei Tage.

---

## Schritt 1 — Slug festlegen

Der Slug ist die URL und ändert sich **nie**. Kleinbuchstaben, Ziffern,
Bindestriche. Er ist zugleich der Ordnername des Blog-Silos und der Präfix der
Stripe-Umgebungsvariablen.

Nimm den Begriff, den Betroffene selbst verwenden — nicht den Fachbegriff.

```
config/niches/wegabrechnung.ts
config/catalogues/wegabrechnung.2026-11-01.ts
content/blog/wegabrechnung/
STRIPE_PRICE_WEGABRECHNUNG_BASIS
```

---

## Schritt 2 — Prüfkatalog schreiben

Das ist das Produkt und die eigentliche Arbeit. Rechne mit einem guten Tag.

```bash
cp config/catalogues/handwerkerrechnung.2026-08-01.ts \
   config/catalogues/wegabrechnung.2026-11-01.ts
```

Dann alles ersetzen. Regeln, die `npm run check:niches` durchsetzt:

- **`basis` ist Pflicht.** Eine Norm (`§ 28 Abs. 2 WEG`) oder ein benanntes
  Referenzband (`Referenzband: 2,50 bis 4,50 € je m² und Jahr, Orientierungswert
  aus … , keine amtliche Größe`). Ein Prüfpunkt ohne Grundlage gehört nicht in
  den Katalog — er ist genau das, was Kunden misstrauisch macht.
- **IDs sind stabil und werden im Bericht zitiert.** Eigener Präfix je Nische
  (`WEG-01`), fortlaufend, keine Wiederverwendung nach dem Löschen.
- **`instruction` beschreibt eine Feststellung, keine Bewertung.** „Prüfe, ob …
  angegeben ist. Stelle fest, wenn …" — nicht „Bewerte, ob … angemessen ist."
- **`euroImpact` ist das plausible Band dieses Prüfpunkttyps.** Es dient
  zugleich als Deckel im Sanitizing. `[0, 0]` heißt ausdrücklich: dieser Punkt
  ist nicht bezifferbar, jede Euro-Schätzung wird entfernt.
- **`category`** gruppiert im Katalog, in der Vorschau und im PDF. Vier bis
  sechs Kategorien sind eine gute Größe.

Zahl der Prüfpunkte: 20 bis 40. Weniger wirkt dünn, mehr macht den
System-Prompt unübersichtlich und den Katalog unlesbar.

`published: false` lassen, solange der Katalog nicht fertig ist — dann ist die
Katalogseite nicht erreichbar.

---

## Schritt 3 — Nischen-Config schreiben

```bash
cp config/niches/nische-2.ts config/niches/wegabrechnung.ts
```

Der Reihe nach:

**`brand`** — Name, Claim, Akzentfarbe. Die Akzentfarbe ist der einzige
visuelle Freiheitsgrad. Nimm einen gedeckten Ton, der neben der Schrift
bestehen kann; die Typografie ist über alle Nischen gleich und soll es bleiben.

**`input`** — was hochgeladen wird, in welchen Formaten, wie viele Dateien und
Seiten. `anchorField` ist der Anker gegen Lesefehler: eine Zahl, die der Nutzer
selbst abliest und die das Modell nicht überschreiben darf. Bei
Abrechnungsdokumenten die Endsumme; wo es keine gibt, eine andere prägnante
Zahl aus dem Dokument.

`contextFields` sind Auswahlfelder, keine Freitextfelder — bewusst: Nur Werte
aus der Config gehen in den Prompt (`app/api/analyze/route.ts` verwirft alles
andere). Drei bis fünf Felder, die die Prüfung tatsächlich verändern.

**`ai.systemPrompt`** — **nur die Rahmung**, drei bis sechs Sätze: Wer liest
den Bericht, was ist das Dokument, was ist der Anker. Die Formulierungsregeln
kommen aus `GLOBAL_RULES` in `lib/prompt.ts` und gelten für alle Nischen; der
Katalog wird generiert angehängt. Schreib hier nichts hinein, was schon in den
globalen Regeln steht.

**`ai.outputTool`** — das Schema aus `nische-2.ts` passt für die allermeisten
Nischen unverändert. Ändern nur, wenn die Nische ein zusätzliches Feld
tatsächlich braucht.

**`ai.maxTokens`** — 8000 ist das Minimum, `lib/analyze.ts` erzwingt es. Bei
mehr als 30 Prüfpunkten eher 12000.

**`pricing`** — `hideEuroTotal` bleibt `true`, das ist im Typ festgeschrieben.
`visibleFindings: 1` ist die Vorgabe: ein ausformulierter Fund als Kostprobe,
und zwar ein mittelschwerer, nie der größte — die Auswahl macht
`previewFindings()`, du musst nichts tun.

Preisstufen: `stripePriceId` aus der Umgebung lesen, Namensschema
`STRIPE_PRICE_<SLUG_GROSS>_<TIER_GROSS>`. `includes` ist zugleich die
Leistungsbeschreibung in den AGB — sie wird aus der Registry generiert.

Braucht eine Preisstufe zusätzliche PDF-Abschnitte, setze `sections` auf der
Stufe. Verfügbar sind `summary`, `findings`, `actions`, `euro`, `letter`,
`checklist`, `method`, `catalogue`, `legal`; alle werden generisch aus dem
Ergebnis erzeugt.

**`legal`** — `disclaimer` und `professionalAdviceNote` an die Nische anpassen:
Welcher Beruf ist für die weitergehende Frage zuständig? Bei einer
WEG-Abrechnung eine Rechtsanwältin für WEG-Recht, bei einer Pflegeabrechnung
eine Pflegeberatung nach § 7a SGB XI. `serviceDescription` ist ein Satz und
landet wörtlich in den AGB. `dataRetentionHours` erscheint in der
Datenschutzerklärung und ist die tatsächliche TTL im Speicher.

**`landing`** — h1, subline, proofPoints, FAQ. **Nicht aus Nische 1 kopieren
und Begriffe austauschen.** Landingpage-Vervielfältigung ist genau das Muster,
das eine Dachdomain unglaubwürdig macht — und Suchmaschinen erkennen es
zuverlässiger als Menschen.

`landing.sample` ist das Signaturmotiv: eine Beispielansicht des Dokuments mit
markierten Fundstellen. `lines` sind die Zeilen des Musterdokuments, `mark`
setzt eine Markierung, `annotations` erklärt sie unter Angabe eines
Prüfpunkts. `check:niches` prüft, dass jede Annotation auf einen Prüfpunkt
zeigt, den es wirklich gibt.

**`experiment`** — Budget, Abbruchschwelle, Mindestzahl bezahlter Umsätze. Die
Werte werden nicht automatisch durchgesetzt; sie stehen in der Config, damit
die Entscheidung vor dem Geldausgeben getroffen ist und nicht danach.

---

## Schritt 4 — Registry

Zwei Zeilen in `config/registry.ts`:

```ts
import { wegabrechnung } from './niches/wegabrechnung';

export const registry: NicheConfig[] = [handwerkerrechnung, nische2, wegabrechnung];
```

Ab hier kennt die Engine die Nische. Solange `active: false` ist, ist sie
nicht erreichbar, nicht im Hub, nicht in der Sitemap, nicht in den AGB.

---

## Schritt 5 — Stripe

Zwei Preise im **bestehenden** Stripe-Konto anlegen (kein zweites Konto). Die
Price-IDs nach `.env.local` und in die Vercel-Projekteinstellungen:

```
STRIPE_PRICE_WEGABRECHNUNG_BASIS=price_…
STRIPE_PRICE_WEGABRECHNUNG_PLUS=price_…
```

Der Webhook bleibt derselbe. `metadata.niche` und `metadata.experiment` setzt
`lib/stripe.ts` automatisch aus der Config.

---

## Schritt 6 — Silo füllen

8 bis 10 Artikel unter `content/blog/wegabrechnung/`. Frontmatter:

```markdown
---
title: …
description: …
date: 2026-11-04
related: [anderer-artikel-slug]
---
```

Zwei Regeln:

- **Keine Cross-Links zwischen Nischen.** Artikel verlinken innerhalb ihres
  Silos und auf die eigene Landing, sonst nirgends. Mechanische Querverweise
  zwischen fremden Themen erzeugen genau das Netzwerkmuster, das die
  Dachdomain vermeiden soll.
- **Themen entlang des Katalogs.** Jeder Artikel behandelt einen oder zwei
  Prüfpunkte ausführlicher, als es in einen Bericht passt, und nennt am Ende
  die Prüfpunkt-ID. Das ist zugleich die ehrlichste Form von interner
  Verlinkung.

---

## Schritt 7 — Prüfen und freischalten

```bash
npm run check
```

Erst wenn das ohne Fehler durchläuft:

```ts
active: true,
published: true,   // im Katalog
```

Dann `npm run build` und deployen. Danach von Hand:

1. `/<slug>` — Landing, Beispielansicht, Preise, FAQ
2. `/<slug>/pruefkatalog` — vollständig, alle Grundlagen lesbar
3. `/<slug>/pruefung` — echtes Dokument hochladen, Vorschau ansehen
4. Kauf im Stripe-Testmodus, PDF prüfen: **Katalogversion auf Deckblatt und in
   jeder Fußzeile?**
5. `/sitemap.xml` — Nische und Artikel enthalten
6. `/recht/agb` — die neue Leistungsbeschreibung ist automatisch da

Punkt 6 ist der Grund, warum die AGB aus der Registry generiert werden: Es ist
der Schritt, der sonst vergessen wird und später in einer Abmahnung steht.

---

## Was du bewusst **nicht** anfassen musst

Zur Kontrolle — wird eine dieser Dateien für eine neue Nische gebraucht, ist
etwas schiefgelaufen:

| Datei | Warum sie nichts von der Nische wissen muss |
| --- | --- |
| `app/[niche]/*` | liest alles aus `resolveNiche()` |
| `components/PruefFlow.tsx` | Felder, Grenzen, Preisstufen kommen als Props |
| `components/AnnotatedSample.tsx` | rendert `landing.sample` generisch |
| `app/api/*` | Nische kommt aus der Registry, Katalog aus der Config |
| `lib/prompt.ts` | generiert den Prompt aus dem Katalog |
| `lib/sanitize.ts` | Deckel kommen aus dem Katalog und der Dokumentsumme |
| `lib/report.ts` | Abschnitte kommen aus `report.sections` |
| `app/sitemap.ts`, `app/robots.ts` | lesen die Registry |
| `app/recht/agb/page.tsx` | generiert § 2 aus der Registry |
| `app/page.tsx` | Hub listet `activeNiches()` |

---

## Wenn doch Code nötig wird

Das kommt vor — dann liegt es fast immer an einer dieser drei Ursachen:

1. **Das Schema kann etwas nicht ausdrücken.** Richtig ist dann, das Schema zu
   erweitern und die generische Umsetzung nachzuziehen. So sind
   `landing.sample` und die tarifabhängigen `sections` entstanden.
2. **Ein Abschnitt fehlt im Bericht.** Neuen Wert in `REPORT_SECTIONS`, Renderer
   in `lib/report.ts` — generisch, aus dem Ergebnis, nicht aus der Nische.
3. **Die Nische braucht einen anderen Ablauf.** Zum Beispiel zwei Dokumente,
   die gegeneinander geprüft werden. Das ist ein echter Engine-Umbau. Er lohnt
   sich, wenn mindestens zwei geplante Nischen ihn brauchen — sonst ist es
   eine Sonderlocke mit Ansage.

Was in keinem Fall richtig ist: ein `if (niche.slug === '…')` in einer
Komponente oder Route. Das ist der Punkt, an dem die Grenzkosten je Nische
wieder zu steigen beginnen, und danach hört es nicht mehr auf.
