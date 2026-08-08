# Nischen-Pipeline

Elf Nischen liegen in der Registry, zwei sind aktiv. Diese Datei sagt, was die
anderen neun trennt vom Livegang und in welcher Reihenfolge das sinnvoll ist.

Die Zahlen dazu stehen nicht hier, sondern in der Config. `npm run economics`
rechnet sie aus und stellt sie nebeneinander. Eine Tabelle in einer Doku ist
veraltet, sobald jemand einen Preis ändert.

## Reihenfolge nach Wirtschaftlichkeit

Sortiert danach, wie weit der vertretbare Klickpreis reicht:

| Nische | Preis | Lage | Kanal |
| --- | --- | --- | --- |
| Architektenrechnung | 79,90 € | nur Longtail | Ads auf sehr genauen Begriffen |
| Hausgeldabrechnung | 44,90 € | nur Longtail | SEO zuerst |
| Tierarztrechnung | 19,90 € | nur Longtail | organisch, kleine Ads-Tests |
| Baubeschreibung | 99,90 € | grenzwertig | SEO zuerst |
| PV-Angebot | 59,90 € | unprofitabel | nur SEO |
| Nebenkostenabrechnung | 19,90 € | unprofitabel | nur SEO |
| Arbeitszeugnis | 14,90 € | unprofitabel | nur SEO |

„Unprofitabel" heißt: gekaufte Klicks rechnen sich nicht. Es heißt nicht, dass
die Nische nichts taugt. Das Arbeitszeugnis steht in dieser Tabelle unten und
ist inhaltlich die stärkste der Reihe — großes Suchvolumen, konkrete Fragen,
ein Silo, das organisch trägt.

## Was bei jeder Nische noch fehlt

Alle sieben stehen auf `active: false`. Die offenen Punkte stehen je Nische in
`legal.blockers`; `npm run check:niches` zählt sie mit. Gemeinsam ist allen:

1. **Anwaltlicher Review des Katalogs.** Jeder Prüfpunkt mit
   „ANWALTLICH ZU BESTÄTIGEN" in der `basis`. Die Liste steht als
   `REVIEW_PFLICHT` in jeder Katalogdatei.
2. **Texte.** H1, Subline, Beweispunkte, FAQ, Beispielansicht. Für die Sprache
   gilt `docs/schreibweise.md`.
3. **Silo.** Acht bis zehn Artikel unter `content/blog/<slug>/`. Keiner davon
   darf dasselbe Keyword angreifen wie die Landing — `check:niches` prüft das.
4. **Preisstufen bei Stripe.** Ohne Price-ID fällt der Checkout auf
   `price_data` zurück.

Dazu je Nische:

**Architektenrechnung.** Der Katalog steht und stützt sich auf die HOAI 2021.
Die eine Stelle, an der ein Fehler teuer wäre: Seit dem EuGH-Urteil vom
04.07.2019 gibt es keine verbindlichen Mindest- und Höchstsätze mehr. Der
Wortfilter der Nische sperrt „Mindestsatz" und „Höchstsatz" deshalb zusätzlich.

**Baubeschreibung.** Der härteste gesetzliche Kern der Reihe: Art. 249 § 2
EGBGB zählt auf, was drinstehen muss, und das lässt sich abhaken. Die Grenze
zum Bausachverständigen muss auf der Landing stehen, nicht im Kleingedruckten.

**Hausgeldabrechnung.** Muss sich sichtbar von der Nebenkostenabrechnung
abgrenzen, sonst laden Mieter hier hoch. Beide Landings brauchen einen Satz
dazu und einen Verweis aufeinander.

**Nebenkostenabrechnung.** Der stärkste Fund ist die Frist aus § 556 Abs. 3
BGB. Der Bericht nennt die Überschreitung mit Daten und Tagen und sagt nicht,
dass nicht gezahlt werden muss — das steht zusätzlich im Wortfilter.

**Tierarztrechnung.** Die GOT wurde zum 22.11.2022 novelliert. Jede Zahl im
Katalog gehört gegen den Verordnungstext gestellt, mit Fundstelle und Datum.
Bei 19,90 Euro entscheidet außerdem die Marge: Modellkosten je Prüfung müssen
gemessen sein, nicht geschätzt.

**Arbeitszeugnis.** Die schärfste Formulierungsgrenze der Engine. Der Bericht
ordnet ein, er benotet nicht und leitet keinen Anspruch ab. Zwei Punkte, an
denen verbreitete Ratgeber falsch liegen und der Katalog richtig liegen muss:
kein Anspruch auf eine Schlussformel (BAG 9 AZR 227/11), und für eine Bewertung
oberhalb der mittleren Stufe liegt die Darlegungslast beim Arbeitnehmer
(BAG 9 AZR 584/13). Beide Fundstellen sind vor dem Livegang zu prüfen.

**PV-Angebot.** Die schwächste der Reihe. Kein gesetzlicher Pflichtkatalog,
und die höchsten Klickpreise, weil Installateure um dieselben Begriffe bieten.
Die Referenzbänder für Preis je kWp und Ertrag je kWp sind Schätzwerte ohne
Quelle — solange das so ist, kann die Nische nicht live gehen.

## Was zuerst

Die Reihenfolge folgt nicht der Tabelle. Sie folgt dem, was der Betrieb hergibt.

Erst braucht die Handwerkerrechnung vier Wochen mit gemessenem
`paid / upload_started`. Ohne diese Zahl ist jede weitere Nische eine Wette,
und die Wirtschaftlichkeitsrechnung in `economics` beruht auf angenommenen
Conversion-Raten, die genau diese Messung ersetzen soll.

Danach in dieser Reihenfolge:

1. **Architektenrechnung.** Höchster Warenkorb unter den tragfähigen, und der
   Katalog steht auf einer Verordnung statt auf Plausibilität.
2. **Arbeitszeugnis.** Nicht wegen der Ads-Rechnung, sondern weil sich daraus
   ein Silo bauen lässt, das ohne Budget trägt. Der Preis ist niedrig genug,
   dass ein Kauf keine Überlegung ist.
3. **Hausgeldabrechnung.** Jährlicher Anlass, wiederkehrend, große Zielgruppe.

Alles Weitere danach und nur, wenn die drei davor die angenommenen Conversions
tatsächlich erreichen.

## Bevor eine Nische freigeschaltet wird

`docs/gate-0.md` stellt acht Fragen. Sie gelten weiterhin, und die
Wirtschaftlichkeitsrechnung beantwortet keine davon — sie sagt nur, ob gekaufte
Klicks in Frage kommen.
