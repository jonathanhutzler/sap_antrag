# Anwaltlicher Review: Prüfkatalog Vorfälligkeitsentschädigung

**Status: offen. Die Nische ist bis zum Abschluss dieses Reviews nicht
deploybar** — `npm run check:niches` bricht mit den Blockern aus
`config/niches/vorfaelligkeitsentschaedigung-pruefen.ts` ab.

Adressat: Fachanwältin oder Fachanwalt für Bank- und Kapitalmarktrecht.

Warum das hier anders läuft als bei der Handwerkerrechnung: Dort geht es um
dreistellige Beträge und Formfehler auf Rechnungen. Hier geht es um
fünfstellige Forderungen, um Bankrecht und um die Grenze zum
Rechtsdienstleistungsgesetz. Eine falsche Aussage kostet nicht einen
unzufriedenen Kunden, sondern eine Abmahnung.

---

## 1. Die Punkte, deren `basis` zu bestätigen ist

Alle sind im Katalog mit dem Wort `ANWALTLICH` markiert und lassen sich mit
`REVIEW_PFLICHT` aus
`config/catalogues/vorfaelligkeitsentschaedigung-pruefen.2026.08.ts` auslesen.

| ID | Prüfpunkt | Konkrete Frage |
| --- | --- | --- |
| **VFE-01** | Pflichtangaben im Darlehensvertrag | Welche Angaben genau lösen die Rechtsfolge des § 502 Abs. 2 BGB aus, und wie ist der Befund zu formulieren, ohne eine Rechtsdienstleistung zu erbringen? Dies ist der Punkt mit dem größten wirtschaftlichen Gewicht — er kann eine fünfstellige Forderung auf null setzen. |
| **VFE-02** | Gesetzliche Höchstgrenze | **Bewusst nicht aktiv.** Die Deckelung nach § 502 Abs. 3 BGB gilt für Allgemein-Verbraucherdarlehen; die Behandlung von Immobiliar-Verbraucherdarlehensverträgen ist gesondert zu klären. Erst nach Bestätigung auswerten. |
| **VFE-03** | Zulässigkeit dem Grunde nach | Welche Fallgruppen sind zu unterscheiden, und wo verläuft die Grenze zwischen zulässigem Prüfhinweis und Rechtsberatung? |
| **VFE-12** | Ersparte Verwaltungskosten | Ist das angesetzte Referenzband von 4 bis 8 Euro je Monat und Darlehen belastbar? Quelle? |
| **VFE-13** | Ersparte Risikokosten | Ist das Band von 0,04 bis 0,10 Prozent p. a. auf den durchschnittlichen Saldo belastbar? Quelle? |
| **VFE-14** | Nicht ausgeübte Sondertilgungsrechte | Bestätigung der Grundannahme, dass vereinbarte Rechte als ausgeübt zu unterstellen sind — und wie mit bereits teilweise genutzten Rechten sowie mit an Bedingungen geknüpften Rechten umzugehen ist. |
| **VFE-16** | Bearbeitungsentgelt | Darf ein Entgelt für die Erstellung der Berechnung neben der Entschädigung verlangt werden? Wenn die Antwort nicht eindeutig ist, bleibt es beim reinen Prüfhinweis. |
| **VFE-20** | Verjährung einer Rückforderung | Wann liegt Kenntnis im Sinne des § 199 Abs. 1 Nr. 2 BGB vor, wenn die Bank nur eine Endsumme ohne Rechenschritte mitgeteilt hat? Der Bericht nennt ein konkretes Datum — es muss vertretbar hergeleitet sein. |

## 2. Fragen zur Berechnungsmethode

Nicht Teil des Katalogs, aber Grundlage des Rechners
(`lib/calculators/vfe-aktiv-passiv.ts`):

1. **Kappung nach § 489 Abs. 1 Nr. 2 BGB.** Der Rechner begrenzt den
   Berechnungszeitraum auf Vollauszahlung plus zehn Jahre plus sechs Monate,
   sofern dieser Termin vor dem Ende der Zinsbindung liegt. Ist das der
   richtige Zeitpunkt, und ist die Begrenzung in dieser Form vertretbar?
2. **Laufzeitkongruente Abzinsung.** Der Rechner interpoliert zwischen den
   Stützstellen der Zinsreihe. Ist das methodisch unbedenklich?
3. **Bandbreite statt Punktwert.** Der Bericht gibt ein Band aus, weil die
   ersparten Kosten Schätzgrößen sind. Bestehen dagegen Bedenken — etwa weil
   ein Band gegenüber einem Punktwert als weniger belastbar gelesen werden
   könnte?
4. **Näherung der Rate.** Steht keine Monatsrate in den Unterlagen, leitet
   der Rechner sie aus Restschuld, Nominalzins und Tilgungssatz her und weist
   das im Bericht aus. Ist diese Näherung vertretbar, oder sollte in diesem
   Fall „nicht beurteilbar" ausgegeben werden?

## 3. Fragen zur Abgrenzung gegenüber dem RDG

1. Trägt die Formulierungsgrenze — nachrechnen und fragen, nicht beurteilen —
   in der umgesetzten Form? Der Wortfilter steht in
   `legal.forbiddenTerms` der Nischen-Config; verboten sind unter anderem
   „unzulässig", „falsch gerechnet", „müssen nicht zahlen",
   „durchsetzbar", „Erfolgsaussicht".
2. Ist das **Nachfrage- und Einwendungsschreiben** des Premium-Tiers
   unbedenklich? Es fordert die Offenlegung der Berechnungsgrundlagen und
   stellt Fragen; es enthält keine Fristsetzung mit Rechtsfolgenandrohung,
   keine Rückforderung und keine Klageandrohung.
3. Ist der Umgang mit **Widerrufsthemen** richtig? Der Bericht rechnet an
   dieser Stelle nicht weiter und verweist auf anwaltliche Prüfung; der
   Begriff „Widerrufsbelehrung" ist im Wortfilter gesperrt, damit er nicht
   versehentlich in einen Bericht gerät.
4. Sind Disclaimer und Hinweis auf die Fachberatung in
   `legal.disclaimer` und `legal.professionalAdviceNote` ausreichend? Sie
   erscheinen auf der Landingpage, im Bericht und in den AGB.

## 4. Fragen zur Werbung

1. Der Preisanker nennt die Verbraucherzentrale Hamburg mit 125 Euro je
   Kreditvertrag und bis zu zwei Wochen Bearbeitungszeit, ausdrücklich
   anerkennend formuliert. Ist die Nennung in dieser Form zulässig?
   **Vor dem Livegang zusätzlich prüfen, ob Preis und Bearbeitungsdauer noch
   aktuell sind.**
2. Auf der Landingpage stehen keine Erfolgsquoten und keine
   Durchschnittsbeträge. Ist darüber hinaus etwas zu streichen?

## 5. Nach dem Review

1. Bestätigte `basis`-Angaben im Katalog eintragen, das Wort `ANWALTLICH`
   entfernen.
2. Bei VFE-02: entweder auswerten und im Rechner umsetzen, oder den
   Prüfpunkt aus dem Katalog nehmen. Ein dauerhaft inaktiver Prüfpunkt in
   einem veröffentlichten Katalog ist ein Versprechen, das nicht eingelöst
   wird.
3. Katalogversion hochziehen — der Review ist eine inhaltliche Änderung.
   Neue Datei `vorfaelligkeitsentschaedigung-pruefen.<version>.ts`, alte
   liegen lassen.
4. Ersten Blocker aus `legal.blockers` entfernen.
5. Zweiter Blocker (Zinsreihe) bleibt, bis `RATE_SERIES_VERIFIED=true` gesetzt
   werden kann.

---

## Getrennt davon: die Zinsreihe

Kein anwaltliches Thema, aber der zweite Blocker.

- Passende Bundesbank-Zeitreihe für Hypothekenpfandbrief-Renditen nach
  Restlaufzeitbändern identifizieren. **Kennung nicht raten** — eine falsche
  Reihe fällt niemandem auf und produziert monatelang falsche Bänder.
- Lizenzbedingungen für die gewerbliche Nutzung prüfen.
- Historische Monatsstände importieren, nicht nur den aktuellen Stand.
- Kennung und Bezugsquelle in `RATE_SERIES_ID` und `RATE_SERIES_SOURCE`
  eintragen, danach `RATE_SERIES_VERIFIED=true`.
- Aktualisierung einplanen: Ohne laufende Pflege veraltet die Reihe still,
  und die Berichte werden mit der Zeit falsch, ohne dass es auffällt.
