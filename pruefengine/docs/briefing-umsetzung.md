# Briefing aus dem Livegang: was davon in der Engine steht

Jede Zeile aus dem Briefing, mit Fundort im Code. Was offen ist, steht als
offen da.

## 1. Prüfkatalog

| Punkt | Umsetzung |
| --- | --- |
| Versionierte Katalogdatei | `config/catalogues/<slug>.<version>.ts` |
| `id`, `label`, `severity`, `basis`, `instruction`, optionales Euro-Band | `Check` in `config/schema.ts`; `check:niches` verwirft einen Katalog ohne `basis` |
| System-Prompt aus dem Katalog erzeugen | `buildSystemPrompt()` in `lib/prompt.ts`; `check:niches` prüft, dass jede Prüfpunkt-ID im erzeugten Prompt steht |
| Katalogversion in jedem Vorgang und jedem PDF | `AnalysisResult.catalogueVersion`, Deckblatt und Fußzeile in `lib/report.ts` |

## 2. Invarianten im Code

| Punkt | Umsetzung |
| --- | --- |
| Nutzereingabe schlägt Modell-Lesung | `referenceEuro` in `lib/sanitize.ts` nimmt immer den Ankerwert |
| Abweichung als Hinweis, nicht still korrigiert | `anchorNote` — steht in der Vorschau, im PDF und im `sanitizeLog` |
| Fund mit unbekannter ID verwerfen | `sanitize()`, Protokolleintrag je Fall |
| `label`, `category`, `basis` aus dem Katalog | `sanitize()` liest sie aus `checksById`, nie aus der Modellantwort |
| Severity nur nach unten | `severityWithin()`; Anhebung wird zurückgesetzt und protokolliert |
| Wortfilter, ersetzen statt löschen | `FORBIDDEN` in `lib/sanitize.ts`: Text ersetzt, `''` streicht nur das Wort, `null` erst dann, wenn der ganze Satz ein Vorwurf ist |
| Zahlen deckeln | 40 % je Fund, 80 % in Summe, dazu das Katalogband |
| Obergrenze der Fundanzahl in Prompt und Code | Regel 9 in `buildSystemPrompt()`, `capFindings()` in `lib/sanitize.ts`, Zahl aus `ai.maxFindings` |
| „Nicht beurteilbar" ohne Kaufangebot | `canPurchase()`; `api/checkout` lehnt serverseitig mit 409 ab |

## 3. Anthropic-API

| Punkt | Umsetzung |
| --- | --- |
| Immer streamen | `anthropic.messages.stream()` + `finalMessage()` in `callTool()` |
| `max_tokens` deckelt Denken und Text gemeinsam | Minimum 8000 in `callTool()`, Prüfung in `check:niches`, Kommentar an der Stelle |
| `stop_reason` auswerten | `max_tokens`, `refusal` (mit `stop_details` im Log), `model_context_window_exceeded`, `pause_turn` — jeweils eigene Meldung |
| System-Prompt statisch halten | Aus dem Katalog erzeugt, je Nische konstant; `cache_control: ephemeral` dahinter, Fallspezifisches im User-Turn (`buildUserPreamble`) |
| `effort` als Kostenregler | `ai.effort` in der Nischen-Config, Standard `high` |
| Nebenwirkung messen, bevor man senkt | `npm run measure:effort` — stellt Token, Zeit, Kosten und getroffene Prüfkategorien zweier Stufen nebeneinander |
| `usage` protokollieren | `lib/usage.ts`, eine Zeile `type: "model_usage"` je Aufruf mit Input, Output, Cache-Read, Cache-Write, `outputShare` und geschätzten Kosten |
| PDF gegen Bild | Kommentar an `toContentBlock()`: PDF bleibt die Wahl, weil Beträge und Klauselwortlaut exakt stimmen müssen |
| Kein Trainingswissen zur API | Umgesetzt gegen die aktuelle SDK-Dokumentation, SDK-Version steht in `package.json` |

**Offen:** Es gibt noch keinen echten Aufruf gegen diese Engine. Alle Zahlen zu
Kosten und Laufzeit stammen aus dem Bestandsprodukt. `measure:effort` liefert
die eigenen, sobald ein Schlüssel und ein Testdokument da sind.

## 4. Freemium-Gate

| Punkt | Umsetzung |
| --- | --- |
| Sichtbar: Anzahl je Schweregrad, Kategorien, ein ausformulierter Fund | `previewStats()`, `previewFindings()`, Antwort von `api/analyze` |
| Der Kostprobenfund ist ein mittelschwerer | `previewFindings()` sucht in der Reihenfolge warn, info, error und nimmt nie den teuersten |
| Verborgen: weitere Funde, alle Euro-Angaben, Handlungssätze, PDF | Die Vorschau-Antwort enthält diese Felder gar nicht erst |

## 5. Verbraucherrecht

| Punkt | Umsetzung |
| --- | --- |
| § 356 Abs. 5 BGB, beide Elemente | `WAIVER_TEXT` in `lib/waiver.ts`: Zustimmung zum sofortigen Beginn und Bestätigung der Kenntnis vom Erlöschen |
| Angezeigter und protokollierter Text identisch | Eine Konstante, Client rendert sie, Server vergleicht wortgleich (`waiverTextMatches`) und protokolliert sie (`logWaiver`) |
| „Erlischt" statt „verliere" | Umgestellt. In der Widerrufsbelehrung bleibt der Gesetzeswortlaut von § 356 Abs. 5 Nr. 2 stehen, dort zählt die Wiedergabe |
| § 312f BGB: Bestätigung auf dauerhaftem Datenträger | `sendConfirmationMail()`, läuft vor dem Berichtsversand |
| Fehlversand laut loggen und nachsenden | `lib/mailqueue.ts` plus `npm run mail:resend` |
| Automatisierte Verarbeitung offenlegen | Bestätigungsmail, Datenschutzerklärung mit Auftragsverarbeiter-Tabelle |
| Keine Rechts-, Steuerberatung, kein Gutachten | AGB § 3, `legal.disclaimer` jeder Nische, Berichtsabschnitt „legal" |

## 6. Betrieb

| Punkt | Umsetzung |
| --- | --- |
| Lockfile nicht auf macOS neu erzeugen | Hier unter Linux erzeugt; das richtige Kommando steht in der Fallstrick-Tabelle im README |
| `maxDuration` großzügig | 120 s in `api/analyze` |
| Rate-Limit-Ausnahmen mit Präfix | `lib/ip.ts`, IPv6 ohne Angabe über 64 Bit, CIDR möglich, IPv4 exakt. Tests in `scripts/test-ip.ts` |
| Client nie blind `res.json()` | `readJson()` in `lib/http.ts`, benutzt in beiden Fetches von `PruefFlow` |
| Leere Uploads abfangen | `parseUploads()` bricht bei 0 Bytes ab |
| Git von Anfang an | Eigenes Repository, `github.com/jonathanhutzler/pruefengine` |

## 7. Messung

| Punkt | Umsetzung |
| --- | --- |
| Vier Ereignisse mit Produkt-Dimension | `lib/events.ts`, `{ niche, experimentId, catalogueVersion, tier? }` |
| `paid` serverseitig aus dem Webhook | `api/webhook`, nirgends sonst |
| Zahlungsanbieter-Metadaten je Produkt | `metadata.niche` und `metadata.experiment` auf jedem PaymentIntent |
| Zielgröße `paid / upload_started` | Im README als solche benannt |

**Offen:** Ob Custom Events im gebuchten Vercel-Tarif ankommen, ist ungeprüft.
Serverseitig liegt jedes Ereignis zusätzlich als JSON-Zeile im Log, damit die
Zählung nicht am Tarif hängt.

## 8. SEO

| Punkt | Umsetzung |
| --- | --- |
| Rechtsseiten mit eigener Meta-Description | Alle vier Seiten unter `app/recht/` haben eigene `metadata` |
| Kategorisierung über Frontmatter | `lib/blog.ts` liest ausschließlich Frontmatter, keine Dateinamen-Präfixe |
| Kein Artikel auf dem Keyword der Geldseite | Der Artikel `handwerkerrechnung-pruefen-lassen` ist auf die Kostenfrage umgeschrieben und heißt jetzt `handwerkerrechnung-anwalt-sachverstaendiger-kosten`. `check:niches` warnt künftig automatisch |
| Search Console nach 404ern durchsehen | Kann erst nach dem Livegang laufen |

## Was vor dem Livegang bleibt

1. Dachdomain in `config/site.ts` eintragen. Bis dahin bricht `check:niches` ab.
2. Anwaltlicher Review des VFE-Katalogs, siehe `docs/vfe-anwaltlicher-review.md`.
3. Zinsreihe verifizieren: Kennung, Bezugsquelle, historische Stände. Erst dann
   `RATE_SERIES_VERIFIED=true`.
4. Stripe-Price-IDs eintragen, sonst läuft der Checkout über `price_data`.
5. Einen echten Lauf mit `measure:effort` fahren und die eigene Kostenzeile
   haben, statt mit den Zahlen aus dem Bestandsprodukt zu argumentieren.
