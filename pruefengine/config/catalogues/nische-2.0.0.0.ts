import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Nische 2 — Version 0.0.0, leer.
 *
 * Struktur-Beweis, kein Inhalt. Welche Nische das wird, entscheidet Gate 0
 * (siehe docs/gate-0.md), nicht diese Datei.
 *
 * Beim Füllen gilt:
 * - `published: false` lassen, solange der Katalog nicht fertig ist. Ein
 *   unveröffentlichter Katalog blendet die Prüfkatalog-Seite aus.
 * - Jeder Check braucht `basis`. Ein Check ohne Norm und ohne benanntes
 *   Referenzband gehört nicht in den Katalog.
 * - IDs sind stabil und werden im Bericht zitiert. Ein einmal vergebener
 *   Präfix-Zähler wird nie wiederverwendet.
 */
export const catalogue: Catalogue = {
  version: '0.0.0',
  published: false,
  checks: [],
};
