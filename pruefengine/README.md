# Prüf-Engine

Mehrmandantenfähige Prüf-Engine unter einer Dachdomain nach dem Muster
**Upload → KI-Analyse → kostenlose Vorschau → Bezahlung → Vollbericht als PDF**.

Mehrere Nischen aus einem Codebase. Ein Vercel-Projekt, ein Stripe-Konto, ein
Analytics-Konto, eine Support-Inbox.

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
Aufbewahrungsfrist, Experimentbudget.

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
lib/analyze.ts                        Modellaufruf mit erzwungenem tool_use
lib/sanitize.ts                       Wortfilter, Euro-Deckelung, harter Abbruch
lib/report.ts                         PDF mit Katalogversion
lib/events.ts                         vier Funnel-Ereignisse, serverseitig
lib/store.ts                          Ergebnisse mit TTL aus der Config
lib/ratelimit.ts                      Rate-Limit auf der Analyse-Route
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
npm run check          # typecheck + Nischen-Prüfung + beide Rauchtests
```

- `check:niches` — vollständige Config, Grundlage bei jedem Prüfpunkt, keine
  doppelten IDs, `hideEuroTotal === true`, `maxTokens >= 8000`, Beispielansicht
  verweist nur auf existierende Prüfpunkte, keine Platzhalter mehr.
- `smoke:sanitize` — die Sanitizing-Regeln gegen bewusst regelwidrige
  Modellausgaben.
- `smoke:report` — PDF-Erzeugung, prüft die pdfkit-Fallstricke.

---

## Deployment auf Vercel

1. **Projekt anlegen.** Repository verbinden. **Root Directory** auf
   `pruefengine` setzen — dieses Verzeichnis, nicht das Repository-Wurzelverzeichnis.
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
   emails → Successful payments* deaktivieren. Sonst bekommt der Kunde zwei
   Mails aus zwei Systemen, von denen nur eine den Bericht enthält.
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

---

## Bekannte Fallstricke — und wo sie hier adressiert sind

| Fallstrick | Wo |
| --- | --- |
| pdfkit-Importpfad `pdfkit/js/pdfkit.standalone.js` | `lib/report.ts`, plus `serverComponentsExternalPackages` in `next.config.mjs` |
| Fußzeile erzeugt Leerseiten | `paintFooters()`: `lineBreak: false` **und** `page.margins.bottom = 0` — `lineBreak` allein reicht nicht |
| `flushPages()` vor `end()` | `buildReportPdf()` |
| `ignoreDuringBuilds` / `ignoreBuildErrors` | `next.config.mjs` |
| `max_tokens` mindestens 8000 | `lib/analyze.ts` erzwingt das Minimum, `check:niches` prüft die Config |
| Werte in `.env.local`, nicht `.env.example` | `.env.example` enthält nur Namen |
| keine doppelten A-Records | Abschnitt „DNS bei INWX" |
| Secret Key statt Publishable Key | `getStripe()` bricht bei `pk_…` mit klarer Meldung ab |
| Stripes eigene Quittung abschalten | Schritt 6 im Deployment |
| Rate-Limiting ab Tag 1, eigene IP ausnehmen | `lib/ratelimit.ts`, `RATE_LIMIT_ALLOWLIST_IPS` |

---

## Weiterführend

- [`docs/nische-3-anleitung.md`](docs/nische-3-anleitung.md) — So legst du Nische 3 an
- [`docs/gate-0.md`](docs/gate-0.md) — Acht Fragen vor jeder neuen Nische
