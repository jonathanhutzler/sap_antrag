# Livegang

Die Reihenfolge für den ersten Deploy. Abhaken von oben nach unten; jeder
Punkt ist entweder erledigt oder er blockiert.

Ziel dieses Livegangs ist **ein Verkauf**, nicht ein Portfolio. Solange keine
Nische einmal von Klick bis Zahlung durchgelaufen ist, ist jede weitere Nische
eine Vervielfachung einer offenen Frage.

## Was live geht

Die erste eigene Nische der Dachdomain. Aktuell ist keine fertig, deshalb
bricht `npm run check:niches` mit „Keine einzige Nische ist aktiv" ab. Das ist
kein Fehler im Code, sondern die Aussage, dass es nichts zu verkaufen gibt.

`handwerkerrechnung` gehört nicht dazu. Das Produkt läuft eigenständig unter
`handwerkerrechnung-pruefen.de` und bleibt dort. Die Nische steht im Repository
als Referenzimplementierung und ist nicht erreichbar.

Die Vorfälligkeitsentschädigung ist nicht freigegeben: anwaltlicher Review
fehlt, Zinsreihe nicht verifiziert. Eine Rechennische mit Platzhalter-Zinsen
würde fünfstellige Beträge auf erfundenen Daten ausrechnen.

Bevor dieses Dokument abgearbeitet wird, muss also eine Nische fertig sein:
Katalog anwaltlich bestätigt, Texte geschrieben, Silo mit acht bis zehn
Artikeln, Stripe-Preise angelegt. Empfehlung und Reihenfolge stehen in
[`nischen-pipeline.md`](nischen-pipeline.md).

## 1. Dachdomain

Der einzige verbleibende Fehler in `npm run check:niches`.

- Domain kaufen. Ein Wort, das keine Nische ist.
- `NEXT_PUBLIC_SITE_DOMAIN` in Vercel setzen, ohne Protokoll und ohne www.
- `check:niches` erneut laufen lassen. Danach nur noch Hinweise.

## 2. Das Bestandsprodukt bleibt, wo es ist

`handwerkerrechnung-pruefen.de` läuft weiter auf seiner eigenen Domain. Auf der
Dachdomain gibt es keine Handwerkerrechnungs-Prüfung, also auch keine
Keyword-Kollision und nichts umzuleiten.

Wenn das später anders entschieden wird, sind es zwei Schritte: `active: true`
in `config/niches/handwerkerrechnung.ts` und eine 301 von der alten Domain auf
`<dachdomain>/handwerkerrechnung`, mit Eintrag in `aliasDomains`. Beide Seiten
parallel laufen zu lassen wäre die schlechteste Variante.

## 3. Umgebungsvariablen

Alle in Vercel unter *Settings → Environment Variables*, für Production **und**
Preview. Werte gehören nie in `.env.example`.

| Variable | Woher |
| --- | --- |
| `NEXT_PUBLIC_SITE_DOMAIN` | die Dachdomain |
| `ANTHROPIC_API_KEY` | Anthropic-Konsole |
| `STRIPE_SECRET_KEY` | Stripe, **`sk_…`**, nicht `pk_…` |
| `STRIPE_WEBHOOK_SECRET` | entsteht in Schritt 5 |
| `STRIPE_PRICE_<NISCHE>_BASIS` / `_PLUS` | Preise der freigeschalteten Nische in Stripe anlegen |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Upstash, Region Frankfurt |
| `RESEND_API_KEY` | Resend |
| `MAIL_FROM` | verifizierte Absenderdomain |
| `SUPPORT_INBOX` | Postfach, das jemand liest |
| `IP_HASH_SALT` | einmal setzen, nie ändern |

Ohne Upstash läuft der Ergebnisspeicher auf eine Map im Prozess. Auf Vercel
teilen sich mehrere Instanzen keinen Speicher — dann findet der Webhook das
Ergebnis nicht und der Kunde bezahlt ins Leere. Upstash ist Pflicht.

## 4. Deploy

Repository mit Vercel verbinden. Root Directory bleibt leer, Framework
Next.js, Build- und Install-Kommando Standard.

## 5. Stripe

- Webhook anlegen: `https://<dachdomain>/api/webhook`, Ereignis
  `checkout.session.completed`. Signing Secret als `STRIPE_WEBHOOK_SECRET`
  eintragen und neu deployen.
- Stripes eigene Quittung abschalten: *Settings → Payments → Customer emails →
  Successful payments*. Die Vertragsbestätigung nach § 312f BGB verschickt die
  Engine selbst, mit Vertragsinhalt und dem Wortlaut der Widerrufserklärung.

## 6. Ein echter Durchlauf, bevor Werbung läuft

Mit Stripe im Testmodus, von Anfang bis Ende:

1. Ein echtes Dokument der freigeschalteten Nische hochladen.
2. Vorschau prüfen: Werden Funde angezeigt? Steht **keine** Euro-Summe darin?
3. Kaufen mit Testkarte `4242 4242 4242 4242`.
4. Zwei Mails prüfen: erst die Bestellbestätigung, dann der Bericht mit PDF.
5. PDF öffnen: Steht die Katalogversion drin?
6. In den Vercel-Logs nach `type: "model_usage"` suchen und die Zeile notieren.

Punkt 6 liefert nebenbei die Zahl, die in allen Wirtschaftlichkeitsrechnungen
noch geschätzt ist. Sie gehört danach in `scripts/economics.ts` statt der
Annahme von 60 Cent.

## 7. Erst dann Traffic

Vier Ereignisse laufen ab dem ersten Besucher: `upload_started`,
`preview_shown`, `checkout_started`, `paid`. Nach zwei Wochen zeigen sie, wo
der Trichter abreißt — und das ist die Antwort auf die Frage, warum die alte
Seite keinen Umsatz gemacht hat.

Vorher kein Werbebudget. Welcher Klickpreis für die freigeschaltete Nische
überhaupt vertretbar ist, sagt `npm run economics` — bei den meisten Nischen
tragen breite Kampagnen nicht.
