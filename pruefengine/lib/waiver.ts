/**
 * Wortlaut des Widerrufsverzichts nach § 356 Abs. 5 BGB.
 *
 * Bewusst eine eigene Datei ohne Abhängigkeiten: Client und Server müssen
 * denselben Text verwenden, und der Client soll dafür nicht die halbe
 * Serverbibliothek in sein Bundle ziehen.
 *
 * Der Client zeigt diesen Text an der Checkbox an und schickt ihn beim Kauf
 * mit. Der Server vergleicht ihn wortgleich (lib/legal.ts) und protokolliert
 * ihn mit Zeitstempel. Ein Client, der etwas anderes anzeigt, kommt damit
 * nicht durch das Bezahl-Gate.
 */
/**
 * Zwei Sätze, weil § 356 Abs. 5 BGB zwei Erklärungen verlangt: die
 * ausdrückliche Zustimmung zum sofortigen Beginn (Nr. 1) und die Bestätigung
 * der Kenntnis vom Wegfall des Widerrufsrechts (Nr. 2). Fehlt der zweite
 * Satz, erlischt das Widerrufsrecht nicht — der Kunde liest den ganzen
 * Bericht und widerruft danach.
 *
 * „Erlischt" statt „verliere": Nr. 2 formuliert zwar „verliert", Satz 1
 * derselben Vorschrift sagt „erlischt". Die geforderte Substanz ist in beiden
 * Fällen dieselbe, und „erlischt" klingt nach Fristablauf statt nach Verlust.
 */
export const WAIVER_TEXT =
  'Ich stimme ausdrücklich zu, dass Sie mit der Ausführung des Vertrages vor Ablauf der Widerrufsfrist beginnen. Mir ist bekannt, dass mein Widerrufsrecht mit Beginn der Ausführung des Vertrages erlischt.';

/** Vergleich ohne Rücksicht auf Zeilenumbrüche und doppelte Leerzeichen. */
export function waiverTextMatches(candidate: unknown): boolean {
  if (typeof candidate !== 'string') return false;
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  return normalize(candidate) === normalize(WAIVER_TEXT);
}
