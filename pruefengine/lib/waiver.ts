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
export const WAIVER_TEXT =
  'Ich stimme ausdrücklich zu, dass Sie mit der Ausführung des Vertrages vor Ablauf der Widerrufsfrist beginnen. Mir ist bekannt, dass ich durch diese Zustimmung mit Beginn der Ausführung des Vertrages mein Widerrufsrecht verliere.';

/** Vergleich ohne Rücksicht auf Zeilenumbrüche und doppelte Leerzeichen. */
export function waiverTextMatches(candidate: unknown): boolean {
  if (typeof candidate !== 'string') return false;
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  return normalize(candidate) === normalize(WAIVER_TEXT);
}
