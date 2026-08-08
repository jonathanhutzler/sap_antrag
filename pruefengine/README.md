# Prüf-Engine

Mehrmandantenfähige Prüf-Engine unter einer Dachdomain nach dem Muster
**Upload → KI-Analyse → kostenlose Vorschau → Bezahlung → Vollbericht als PDF**.

Mehrere Nischen aus einem Codebase. Ein Vercel-Projekt, ein Stripe-Konto, ein
Analytics-Konto, eine Support-Inbox.

---

## Stand: noch nicht produktiv

Die Engine ist vollständig und lauffähig, aber bewusst noch nicht live.

**`handwerkerrechnung` ist eine Referenzimplementierung, kein Livebetrieb.**
Dasselbe Produkt läuft bereits eigenständig unter
`handwerkerrechnung-pruefen.de` und bleibt dort. Die Nische steht in diesem
Repository als vollständiges Beispiel dafür, wie eine Nische aussieht — an den
Live-Werten ausgerichtet (Preise 24,90 / 39,90 €, Aufbewahrung 14 Tage,
Anbieterdaten aus dem Impressum), aber aus den öffentlichen Seiten
rekonstruiert und nicht aus dem Quellcode des Bestands portiert.

**Vor dem ersten Deploy** muss deshalb eine Entscheidung fallen, sonst stehen
zwei eigene Angebote auf denselben Suchbegriffen:

- `active: false` in `config/niches/handwerkerrechnung.ts` — die Engine geht
  nur mit neuen Nischen live. **Das ist der aktuell vorgesehene Weg.**
- oder der Bestand wird abgelöst: `handwerkerrechnung-pruefen.de` per 301 auf
  `<dachdomain>/handwerkerrechnung`, Domain zusätzlich in `aliasDomains`.

Produktiv startet die Engine mit der ersten neuen Nische. Welche das wird,
entscheidet [Gate 0](docs/gate-0.md).

---

## Die harte Architektur-Regel

Eine neue Nische darf ausschließlich bestehen aus:

1. `config/niches/<slug>.ts`
2. `config/catalogues/<slug>.<version>.ts`
3. einem Eintrag in `config/registry.ts`

Erfordert eine neue Nische Änderungen an Komponenten, Routen oder API-Logik,
ist die Engine falsch geschnitten — dann wird die Engine umgebaut, nicht die
Nische ausgenommen. Der Beweis, dass die Regel hält, steht in
[`docs/nische-3-anleitung.md`](docs/nische-3-anleitung.md).

Praktisch heißt das: Diese Dinge sind Config, nicht Code — Landing-Texte, FAQ,
Beispielansicht mit markierten Fundstellen, Uploadgrenzen, Kontextfelder,
Prüfkatalog, System-Prompt-Rahmung, Ausgabeschema, Preisstufen und ihr
Leistungsumfang, Berichtsabschnitte, Rechtstexte der Nische, Akzentfarbe,
Aufbewahrungsfrist, Experimentbudget, kostenlose Werkzeuge.

**Eine Ausnahme gibt es, und sie war eine bewusste Engine-Erweiterung:** Eine
*Rechennische* braucht zusätzlich einen Rechner unter `lib/calculators/` samt
Testsuite. Siehe unten.

---

## Zwei Produktklassen

```
Dokumentnische:   PDF → Modell liest, findet, formuliert     → Feststellungen
Rechennische:     PDF → Modell extrahiert NUR Parameter
                      → deterministischer Rechner im Code
                      → Vergleich fremder Wert gegen eigener Wert
                      → Feststellungen aus der Differenz
```

Der Unterschied ist keine Architekturvorliebe, sondern Haftung: Ein
Sprachmodell darf in einem Streit über einen fünfstelligen Betrag keine Zahlen
selbst ausrechnen. Eine halluzinierte Barwertberechnung sieht genauso
überzeugend aus wie eine richtige.

Eine Nische wird zur Rechennische, indem sie `computePipeline` setzt. Dann:

- ruft die Engine das Modell **ausschließlich zur Parameterextraktion** auf.
  Das Extraktionsschema hat keine Felder für Bewertungen — `check:niches`
  bricht ab, wenn doch eines auftaucht.
- läuft danach der Rechner aus `lib/calculators/<id>.ts`.
- entstehen Feststellungen aus dem Vergleich, nicht aus einer Modellmeinung.
- ist ein fehlender Pflichtparameter „nicht beurteilbar" und **kein Kauf**.
- werden Euro-Beträge im Sanitizing **nicht gedeckelt**: Die Deckelung
  existiert gegen Modellhalluzination, nicht gegen eigenen, getesteten Code.
- speichert die Engine Eingangswerte, Rechenschritte, Kennung und Stand der
  Datenreihe — damit ein Bericht Monate später reproduzierbar ist.

Ein Rechner kommt nur dann in die Registry, wenn er eine Testsuite hat.

```bash
npm run test:vfe        # 53 Prüfungen, u. a. die Kontrollrechnung
                        # „Barwert zum eigenen Effektivzins = Restschuld"
```

---

## Struktur

```
app/page.tsx                          Hub: eigenes Versprechen, führt in die Nischen
app/[niche]/page.tsx                  Nischen-Landing, vollständig aus Config
app/[niche]/pruefung/page.tsx         Upload + Vorschau
app/[niche]/pruefkatalog/page.tsx     öffentlicher Katalog = Vertrauenssignal
app/[niche]/ergebnis/[id]/page.tsx    Bericht nach der Zahlung
app/[niche]/ratgeber/…                Silo der Nische
app/recht/…                           Impressum, Datenschutz, AGB, Widerruf
app/api/analyze|checkout|webhook/     Analyse, Bezahl-Gate, Zahlungsbestätigung
app/api/report/[id]/                  PDF-Auslieferung, nur für bezahlte Berichte

lib/resolveNiche.ts                   Slug → Config, inaktive Nische = 404
lib/parse.ts                          Eingangsprüfung: Typ, Größe, Seitenzahl
lib/prompt.ts                         System-Prompt aus dem Katalog erzeugen
lib/analyze.ts                        Modellaufruf: streamt, erzwingt tool_use
lib/usage.ts                          Token-Zeile und Kostenschätzung je Aufruf
lib/sanitize.ts                       Wortfilter, Euro-Deckelung, harter Abbruch
lib/report.ts                         PDF mit Katalogversion
lib/events.ts                         vier Funnel-Ereignisse, serverseitig
lib/store.ts                          Ergebnisse mit TTL aus der Config
lib/ratelimit.ts / lib/ip.ts          Rate-Limit, Ausnahmen über Präfix-Vergleich
lib/http.ts                           Client liest erst Text, dann JSON
lib/mail.ts / lib/mailqueue.ts        § 312f-Bestätigung, Bericht, Nachversand
lib/legal.ts / lib/waiver.ts          Widerrufsverzicht, wortgleich geprüft
lib/blog.ts                           Silo aus content/blog/<slug>/

config/schema.ts                      Das Schema, an dem sich alles ausrichtet
config/registry.ts                    Einziger Ort, an dem eine Nische bekannt wird
config/site.ts                        Dachdomain und Anbieterdaten
config/niches/                        eine Datei je Nische
config/catalogues/                    eine Datei je Katalogversion
content/blog/<slug>/                  Silo je Nische
```

`generateStaticParams` liest über die Registry. Eine Nische mit `active: false`
ist nicht erreichbar, taucht nicht im Hub und nicht in der Sitemap auf.

---

## Vor dem ersten Start ausfüllen

In **`config/site.ts`** stehen Platzhalter in eckigen Klammern. Solange sie da
sind, bricht `npm run check:niches` ab und `/recht/impressum` zeigt einen
sichtbaren Hinweis:

| Feld | Bedeutung |
| --- | --- |
| `domain` | Dachdomain ohne Protokoll, ohne www |
| `provider.entity` | Name des Anbieters, wie er ins Impressum gehört |
| `provider.street`, `provider.zipCity` | ladungsfähige Anschrift |
| `provider.email` | Kontaktadresse nach § 5 DDG |
| `support.inbox`, `support.mailFrom` | Support-Inbox und verifizierter Absender |

`provider.smallBusiness` steht auf `true`; der Hinweis nach § 19 UStG erscheint
dann in Impressum, AGB und im Berichtsfuß. Bei Regelbesteuerung auf `false`
setzen und `vatId` füllen.

**Rechtstexte gehören ins Repository, nicht in Umgebungsvariablen.** Impressum
und AGB sind Vertragstext; sie müssen versioniert sein, damit später
nachvollziehbar bleibt, welche Fassung wann galt.

---

## Setup

```bash
git clone <repo-url>
cd pruefengine
npm install
cp .env.example .env.local     # Werte NUR hier eintragen, nie in .env.example
npm run dev
```

Ohne `ANTHROPIC_API_KEY` läuft alles außer der Analyse. Ohne Upstash-Werte
läuft die Anwendung mit einem Speicher im Prozess — für lokale Entwicklung
brauchbar, für die Produktion nicht: mehrere Lambda-Instanzen teilen sich
keinen Speicher.

### Umgebungsvariablen

| Variable | Pflicht | Wofür |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_DOMAIN` | ja | kanonische URLs, Sitemap, Stripe-Rücksprungadressen |
| `ANTHROPIC_API_KEY` | ja | Analyse |
| `ANTHROPIC_MODEL` | nein | überschreibt das Modell aus der Nischen-Config |
| `STRIPE_SECRET_KEY` | ja | Checkout. **`sk_…`**, nicht `pk_…` |
| `STRIPE_WEBHOOK_SECRET` | ja | Signaturprüfung des Webhooks (`whsec_…`) |
| `STRIPE_PRICE_<NISCHE>_<TIER>` | empfohlen | Preis-IDs; ohne sie fällt der Checkout auf `price_data` zurück |
| `UPSTASH_REDIS_REST_URL` | ja | Ergebnisspeicher, Widerrufsprotokoll, Rate-Limit |
| `UPSTASH_REDIS_REST_TOKEN` | ja | dito |
| `RESEND_API_KEY` | ja | Versand des Berichts |
| `MAIL_FROM` | ja | Absender, Domain muss bei Resend verifiziert sein |
| `SUPPORT_INBOX` | ja | Antwortadresse |
| `RATE_LIMIT_ALLOWLIST_IPS` | nein | eigene IPs vom Limit ausnehmen, komma-getrennt |
| `IP_HASH_SALT` | nein | Salz für den IP-Hash im Widerrufsprotokoll; einmal setzen, nie ändern |
| `EVENT_WEBHOOK_URL` | nein | zusätzliche Senke für die Funnel-Ereignisse |

### Prüfungen vor jedem Deploy

```bash
npm run check          # typecheck + Nischen-Prüfung + alle Tests
```

- `check:niches` — vollständige Config, Grundlage bei jedem Prüfpunkt, keine
  doppelten IDs, `hideEuroTotal === true`, `maxTokens >= 8000`, gültiges
  `ai.effort`, Beispielansicht verweist nur auf existierende Prüfpunkte, kein
  Ratgeberartikel greift dasselbe Keyword an wie die Landing, keine Platzhalter
  mehr.
- `smoke:sanitize` — die Sanitizing-Regeln gegen bewusst regelwidrige
  Modellausgaben: Wortfilter, Euro-Deckelung, Fundobergrenze, Severity nur nach
  unten, Anker-Abweichung.
- `smoke:report` — PDF-Erzeugung, prüft die pdfkit-Fallstricke.
- `test:vfe` — 53 Prüfungen gegen den Aktiv-Passiv-Rechner.
- `test:ip` — Präfix-Vergleich der Rate-Limit-Ausnahmen.

### Werkzeuge außerhalb des Deploy-Gates

```bash
npm run measure:effort -- handwerkerrechnung ./rechnung.pdf 1184,05 high medium
npm run mail:resend                # zeigt fehlgeschlagene Mails
npm run mail:resend -- --go        # sendet sie nach
```

`measure:effort` fährt dasselbe Dokument auf zwei Denkstufen und stellt Token,
Laufzeit, Kosten und die getroffenen Prüfkategorien nebeneinander. Beide Läufe
kosten echtes Geld. Der Punkt ist die letzte Spalte: Eine niedrigere Stufe
halbiert die Kosten, kann aber eine ganze Prüfkategorie kosten. Fällt eine weg,
gehört sie im Prompt zum Pflichtbereich erklärt und im Code abgesichert — und
danach wird erneut gemessen.

---

## Deployment auf Vercel

1. **Projekt anlegen.** Repository verbinden. Das Repository-Wurzelverzeichnis
   ist zugleich das Projektverzeichnis — **Root Directory** bleibt leer.
2. **Framework**: Next.js. Build- und Install-Kommandos bleiben Standard.
3. **Umgebungsvariablen** aus der Tabelle oben unter *Settings → Environment
   Variables* eintragen, für Production **und** Preview. Nach jeder Änderung
   neu deployen; Vercel liest sie nur beim Build.
4. **Domain hinzufügen** unter *Settings → Domains*: die Dachdomain und
   `www.` als Weiterleitung darauf.
5. **Stripe-Webhook** anlegen: *Developers → Webhooks → Add endpoint*,
   Adresse `https://<dachdomain>/api/webhook`, Ereignis
   `checkout.session.completed`. Das Signing Secret (`whsec_…`) als
   `STRIPE_WEBHOOK_SECRET` eintragen.
6. **Stripes eigene Quittung abschalten**: *Settings → Payments → Customer
   emails → Successful payments* deaktivieren. Die Vertragsbestätigung nach
   § 312f BGB verschickt die Engine selbst, mit Vertragsinhalt, Preis und dem
   Wortlaut der Widerrufserklärung. Stripes Quittung enthält davon nichts und
   käme zusätzlich.
7. **Resend**: Absenderdomain verifizieren (DKIM- und SPF-Einträge bei INWX
   setzen), dann `MAIL_FROM` auf diese Domain stellen.
8. **Vercel Analytics** im Projekt aktivieren. Die vier Funnel-Ereignisse
   erscheinen dort als Custom Events; die belastbare Zählung läuft zusätzlich
   serverseitig über die Logs.

### DNS bei INWX

Im INWX-Nameserver-Interface für die Dachdomain:

| Typ | Name | Wert |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Vercel zeigt die aktuell gültigen Zielwerte beim Hinzufügen der Domain an —
im Zweifel gilt, was dort steht.

**Fallstrick: keine doppelten A-Records.** INWX legt bei neuen Domains gern
einen A-Record auf die eigene Parkseite an. Bleibt der stehen, antwortet die
Domain abwechselnd mit der Parkseite und mit der Anwendung, und das Bild
wechselt je nach Resolver. Vor dem Anlegen des Vercel-Records alle vorhandenen
A- und AAAA-Records auf `@` löschen.

DKIM, SPF und DMARC für Resend kommen als TXT-Records dazu; sie stören den
A-Record nicht.

---

## Wie eine Nische später eine eigene Exact-Match-Domain bekommt

Der Pfad unter der Dachdomain bleibt **immer** kanonisch. Eine Exact-Match-Domain
ist ein zusätzlicher Eingang, kein zweiter Wohnsitz. Das ist bewusst so: Zwei
Adressen mit demselben Inhalt teilen sonst ihre Signale auf, und die Dachdomain
verliert genau das, wofür sie existiert.

1. **Domain bei INWX registrieren** und die Nameserver auf Vercel zeigen lassen
   oder die A-/CNAME-Records wie oben setzen.
2. **In Vercel** unter *Settings → Domains* die Domain zum **selben Projekt**
   hinzufügen — kein zweites Projekt, kein zweites Deployment.
3. **Redirect einrichten**: In Vercel die neue Domain als Redirect auf
   `https://<dachdomain>/<slug>` konfigurieren. Damit landen alle Aufrufe auf
   dem kanonischen Pfad, und es gibt nur eine indexierbare Adresse.
4. **In der Config eintragen**: die Domain in `aliasDomains` der Nische. Das
   Feld ist die Dokumentation dessen, was in Vercel eingerichtet ist —
   `check:niches` verhindert, dass dort versehentlich die Dachdomain steht.

Wenn die Exact-Match-Domain später doch eigenständig ausgeliefert werden soll
(etwa weil eine Nische groß genug für eine eigene Marke geworden ist), ist das
ein bewusster Schnitt und kein Konfigurationsdetail: Dann bekommt sie ein
eigenes Vercel-Projekt, und der Pfad unter der Dachdomain wird per 301 auf sie
umgeleitet — nicht umgekehrt und nicht beides zugleich.

---

## Die drei nicht verhandelbaren Punkte

**`catalogue.version` steht in jedem gespeicherten Ergebnis und in jedem PDF.**
Ohne sie ist ein sechs Monate alter Bericht bei einer Reklamation nicht mehr
erklärbar. Bei einem Produkt, das Geldforderungen begründet, ist das Pflicht.
Erzwungen in `lib/sanitize.ts` (schreibt sie ins Ergebnis) und `lib/report.ts`
(Deckblatt, Fußzeile jeder Seite, PDF-Metadaten).

**`hideEuroTotal` ist fest `true`.** Die Vorschau zeigt Anzahl und Schwere der
Funde und die betroffenen Kategorien, nie die Euro-Summe. Erzwungen im Typ
(`hideEuroTotal: true` als Literal), in `check:niches` und vor allem in
`app/api/analyze/route.ts`: Die Vorschau-Antwort enthält Euro-Beträge und
Handlungssätze gar nicht erst, statt sie im Client zu verstecken.

**Der Prüfkatalog liegt in einer eigenen versionierten Datei**, aus der der
System-Prompt generiert wird (`lib/prompt.ts`). Der Katalog ist das Produkt,
nicht der Prompt.

---

## System-Prompt-Regeln und ihre Absicherung

Die Regeln stehen in `lib/prompt.ts` als `GLOBAL_RULES` und gelten für jede
Nische. Auf Prompt-Befolgung allein verlässt sich die Engine nicht:

| Regel | Im Prompt | Zusätzlich erzwungen |
| --- | --- | --- |
| 1 Formulierungsgrenze | ja | Wortfilter in `sanitize.ts`, Ersetzung oder Satz entfällt |
| 2 kein Vorwurf | ja | Filter auf Absichtszuschreibungen |
| 3 genau eine Handlung | ja | Fund ohne Handlungssatz wird verworfen |
| 4 euroImpact nur mit Grundlage | ja | Deckelung auf 40 % je Fund, 80 % in Summe; keine Addition über dieselbe Fundstelle |
| 5 „nicht beurteilbar" | ja | harter Abbruch vor dem Bezahl-Gate, `canPurchase()` |
| 6 nur Katalogpunkte | ja | Fund mit unbekannter ID wird verworfen |
| 7 jede Feststellung belegt | ja | Fund ohne `documentRef` wird verworfen |
| 8 nichts gefunden ist ein Ergebnis | ja | ohne Fund kein Kaufangebot |
| 9 Obergrenze der Fundanzahl | ja, mit der Zahl aus `ai.maxFindings` | `capFindings()` kürzt nach der Sortierung, protokolliert die Kürzung |

Nicht als Regel formuliert, aber genauso erzwungen: `label`, `category` und
`basis` kommen immer aus dem Katalog, nie aus der Modellantwort. Der
Schweregrad darf nur nach unten von der Katalogvorgabe abweichen — sonst stünde
im Bericht eine Einstufung, die der öffentliche Katalog nicht hergibt.

Das Ausgabeschema wird über `tool_use` erzwungen: Tool-Definition mit
JSON-Schema, `tool_choice` fest auf dieses Tool. Es gibt bewusst **keinen**
Reparatur-Fallback, der Fließtext nachträglich in JSON umbiegt — kommt kein
Tool-Aufruf zurück, ist das ein Fehler und kein Ergebnis.

Jeder Eingriff des Sanitizings landet in `sanitizeLog` im gespeicherten
Ergebnis. Ein still korrigierter Bericht wäre bei einer Reklamation nicht
erklärbar.

---

## Messung

Vier Ereignisse, jedes mit `{ niche, experimentId, catalogueVersion, tier? }`:

| Ereignis | Ausgelöst in |
| --- | --- |
| `upload_started` | `api/analyze`, vor der Eingangsprüfung |
| `preview_shown` | `api/analyze`, nach dem Sanitizing |
| `checkout_started` | `api/checkout`, nach dem Bezahl-Gate |
| `paid` | `api/webhook` — **nur dort**, der Erfolgs-Redirect beweist nichts |

Serverseitig als eine JSON-Zeile je Ereignis in den Vercel-Logs, zusätzlich
optional an `EVENT_WEBHOOK_URL`. Clientseitig gehen dieselben Ereignisse
(außer `paid`) an Vercel Analytics.

Auf jedem PaymentIntent stehen `metadata.niche` und `metadata.experiment`.

**Zielgröße: `paid / upload_started` je Nische.** Ohne diese Zahl aus vier
Wochen Bestandsbetrieb ist jede weitere Nische eine Wette.

### Token und Kosten

Jeder Modellaufruf schreibt eine Zeile:

```json
{"type":"model_usage","niche":"handwerkerrechnung","model":"claude-opus-5",
 "effort":"high","stopReason":"tool_use","durationMs":41230,"docs":1,"pages":3,
 "input":4384,"output":22052,"cacheRead":0,"cacheWrite":3910,
 "outputShare":0.83,"costUsd":0.5977}
```

Die Token-Zahlen im Beispiel stammen aus dem Livegang des Bestandsprodukts.
Für diese Engine gibt es noch keinen gemessenen Lauf.

`outputShare` ist die Kennzahl, auf die es ankommt. Denk-Token zählen als
Output, und Output kostet rund das Fünffache von Input. Steht der Wert bei 0,8,
hängt der Aufruf am Denken und nicht am Dokument — dann ist `ai.effort` der
Hebel, nicht das Dateiformat.

Die Preise für die Schätzung stehen in `lib/usage.ts` mit Datum. Ein Modell,
das dort nicht steht, bekommt `costUsd: null` statt einer geratenen Zahl.

Nach jedem Kauf gehen zwei Mails raus: erst die Vertragsbestätigung nach
§ 312f BGB, dann der Bericht. Schlägt eine fehl, steht eine Zeile
`type: "mail_failed"` in den Logs und der Vorgang in der Warteschlange.
`npm run mail:resend` zeigt sie, `-- --go` sendet nach.

---

## Bekannte Fallstricke — und wo sie hier adressiert sind

| Fallstrick | Wo |
| --- | --- |
| pdfkit-Importpfad `pdfkit/js/pdfkit.standalone.js` | `lib/report.ts`, plus `serverComponentsExternalPackages` in `next.config.mjs` |
| Fußzeile erzeugt Leerseiten | `paintFooters()`: `lineBreak: false` **und** `page.margins.bottom = 0` — `lineBreak` allein reicht nicht |
| `flushPages()` vor `end()` | `buildReportPdf()` |
| `ignoreDuringBuilds` / `ignoreBuildErrors` | `next.config.mjs` |
| `max_tokens` mindestens 8000 | `lib/analyze.ts` erzwingt das Minimum, `check:niches` prüft die Config |
| Nicht gestreamte Requests laufen in HTTP-Timeouts | `callTool()` streamt immer und wartet auf `finalMessage()` |
| `stop_reason` nicht ausgewertet, Fehlersuche an der falschen Stelle | `callTool()` übersetzt `max_tokens`, `refusal`, `model_context_window_exceeded` und `pause_turn` in verständliche Meldungen |
| Prompt-Cache trifft nie, weil der System-Prompt pro Fall gebaut wird | System-Prompt kommt aus dem Katalog und ist je Nische konstant, `cache_control` sitzt dahinter; alles Fallspezifische steht im User-Turn |
| Kostendiskussion ohne Zahlen | `lib/usage.ts` schreibt je Aufruf eine Zeile `type: "model_usage"` mit Input, Output, Cache-Read, Cache-Write und geschätzten Kosten |
| Zu langer Bericht läuft in `max_tokens` | Obergrenze steht in Regel 9 des Prompts **und** in `capFindings()` |
| Werte in `.env.local`, nicht `.env.example` | `.env.example` enthält nur Namen |
| `package-lock.json` auf macOS neu erzeugt, Linux-Build bricht ab | Lockfile hier unter Linux erzeugt. Neu bauen nur mit `rm -f package-lock.json && npm install --package-lock-only --os=linux --cpu=x64` |
| keine doppelten A-Records | Abschnitt „DNS bei INWX" |
| Secret Key statt Publishable Key | `getStripe()` bricht bei `pk_…` mit klarer Meldung ab |
| Stripes eigene Quittung abschalten | Schritt 6 im Deployment |
| Rate-Limiting ab Tag 1, eigene Verbindung ausnehmen | `lib/ratelimit.ts`, Präfix-Vergleich in `lib/ip.ts` — eine exakt eingetragene IPv6-Adresse passt nach zwei Tagen nicht mehr |
| Client ruft blind `res.json()` auf, Nutzer sieht „Unexpected token 'A'" | `readJson()` in `lib/http.ts` liest erst Text, parst dann |
| Leerer Upload durch verschobene Datei | `parseUploads()` bricht bei 0 Bytes ab |
| § 312f-Bestätigung fehlt, Widerrufsrecht erlischt nicht | `sendConfirmationMail()` läuft vor dem Berichtsversand; Fehlversand landet in `lib/mailqueue.ts` und geht mit `npm run mail:resend` raus |
| Ratgeberartikel greift dasselbe Keyword an wie die Geldseite | `check:niches` vergleicht die Kernphrase der H1 gegen jeden Artikeltitel |

---

## Weiterführend

- [`docs/briefing-umsetzung.md`](docs/briefing-umsetzung.md) — Die Lehren aus dem Livegang, Punkt für Punkt mit Fundort im Code
- [`docs/nische-3-anleitung.md`](docs/nische-3-anleitung.md) — So legst du Nische 3 an
- [`docs/gate-0.md`](docs/gate-0.md) — Acht Fragen vor jeder neuen Nische
