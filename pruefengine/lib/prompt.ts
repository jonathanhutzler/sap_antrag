import type { NicheConfig } from '@/config/schema';
import { DEFAULT_MAX_FINDINGS } from './sanitize';

/**
 * System-Prompt-Erzeugung.
 *
 * Der Katalog ist das Produkt, nicht der Prompt. Deshalb wird der Prompt hier
 * aus `niche.catalogue` generiert: die Nische liefert nur ihre Rahmung
 * (`ai.systemPrompt`), die Formulierungsregeln sind für alle Nischen gleich.
 *
 * Die Regeln 1, 4 und 5 stehen zusätzlich in lib/sanitize.ts. Auf
 * Prompt-Befolgung allein verlassen wir uns nicht.
 */

/** Gilt für jede Nische. Reihenfolge und Nummerierung sind bewusst stabil. */
export const GLOBAL_RULES = `FORMULIERUNGSREGELN — sie gelten ausnahmslos.

1. Formulierungsgrenze. Du stellst fest, dass etwas fehlt, dass etwas von einer
   Regelung abweicht oder dass etwas außerhalb eines üblichen Bandes liegt.
   Du stellst nicht fest, dass etwas unwirksam, überteuert oder unserioes ist.
   Diese Wörter und ihre Beugungen sind verboten: "unwirksam", "rechtswidrig",
   "Betrug", "überteuert", "unserioes", "Abzocke", "Wucher", "sittenwidrig",
   "nichtig", "strafbar", "Taeuschung". Schreibe stattdessen: "weicht ab von",
   "fehlt", "liegt über dem Referenzband von", "ist im Dokument nicht belegt".

2. Kein Vorwurf gegenüber dem Rechnungssteller. Du beschreibst Risiken und
   Nachteile für den Auftraggeber, nicht Fehlverhalten des Anbieters. Keine
   Absichtszuschreibung ("bewusst", "absichtlich", "vorsätzlich"). Eine
   Abweichung ist eine Abweichung, kein Motiv.

3. Jeder Fund braucht genau eine Handlung. Formuliere sie als einen Satz, den
   der Auftraggeber wörtlich schreiben oder sagen kann. Kein "Sie sollten
   prüfen lassen", sondern der fertige Satz, zum Beispiel: "Bitte weisen Sie
   die Arbeitskosten getrennt von den Materialkosten aus, damit ich die
   Steuerermäßigung nach § 35a EStG geltend machen kann."

4. Finanzielle Spannen nur mit Grundlage im Dokument. Immer als Spanne von–bis,
   nie als Punktwert. Nenne in euroBasis die Rechnung mit den Zahlen, die im
   Dokument stehen. Überschneiden sich zwei Feststellungen wirtschaftlich
   (dieselbe Position), beziffere nur die weiter reichende von beiden und
   schreibe bei der anderen keine Spanne. Keine Spanne ohne Zahlengrundlage —
   lieber gar keine.

5. "Nicht beurteilbar" ist ein gültiges Ergebnis. Ist der Upload unlesbar, ist
   es ein anderes Dokument als erwartet oder reicht der Inhalt für eine
   Prüfung nicht aus, setze assessable=false, begründe es in einem bis zwei
   Sätzen und gib keine Feststellungen aus. Erfinde nichts, um ein Ergebnis
   zu haben.

6. Nur prüfen, was im Katalog steht. Jede Feststellung trägt die checkId
   eines Katalogpunkts. Fällt dir etwas auf, wofür es keinen Katalogpunkt
   gibt, lass es weg — der Katalog ist der zugesagte Maßstab.

7. Belege jede Feststellung. documentRef enthält ein wörtliches Zitat oder
   die Positionsbezeichnung aus dem Dokument. Ohne Beleg keine Feststellung.

8. Nichts gefunden ist ein gutes Ergebnis. Gibt es zu einem Katalogpunkt nichts
   zu beanstanden, nimm ihn in checkedIds auf und erzeuge keine Feststellung.
   Erzeuge keine Füllfunde.`;

function renderCheck(check: {
  id: string;
  label: string;
  severity: string;
  basis: string;
  instruction: string;
  category: string;
  euroImpact?: [number, number];
}): string {
  const lines = [
    `[${check.id}] ${check.label}`,
    `  Kategorie: ${check.category}`,
    `  Schweregrad (Vorgabe): ${check.severity}`,
    `  Grundlage: ${check.basis}`,
    `  Prüfauftrag: ${check.instruction}`,
  ];
  if (check.euroImpact) {
    lines.push(
      `  Plausibles Band des finanziellen Effekts: ${check.euroImpact[0]} bis ${check.euroImpact[1]} Euro. Werte außerhalb dieses Bandes werden nachträglich gedeckelt.`,
    );
  }
  return lines.join('\n');
}

/** Der vollständige System-Prompt für eine Nische. */
export function buildSystemPrompt(niche: NicheConfig): string {
  const byCategory = new Map<string, typeof niche.catalogue.checks>();
  for (const check of niche.catalogue.checks) {
    const list = byCategory.get(check.category) ?? [];
    list.push(check);
    byCategory.set(check.category, list);
  }

  const catalogueText = Array.from(byCategory.entries())
    .map(([category, checks]) => `## ${category}\n\n${checks.map(renderCheck).join('\n\n')}`)
    .join('\n\n');

  // Regel 9 trägt eine Zahl aus der Config und steht deshalb hier statt in
  // GLOBAL_RULES. Sie wird zusätzlich in lib/sanitize.ts durchgesetzt: Ein
  // Bericht, der über die Grenze läuft, läuft in max_tokens, und dann kommt
  // gar kein Ergebnis zurück statt eines langen.
  const maxFindings = niche.ai.maxFindings ?? DEFAULT_MAX_FINDINGS;
  const cappingRule = `9. Höchstens ${maxFindings} Feststellungen. Sind es mehr, nimm die
   ${maxFindings} gewichtigsten und lass den Rest weg. Ein Bericht, der diese
   Grenze überschreitet, bricht technisch ab und erreicht den Auftraggeber
   gar nicht.`;

  return [
    niche.ai.systemPrompt.trim(),
    '',
    GLOBAL_RULES,
    '',
    cappingRule,
    '',
    `PRUEFKATALOG — Version ${niche.catalogue.version}, ${niche.catalogue.checks.length} Prüfpunkte.`,
    'Dieser Katalog ist öffentlich einsehbar. Der Auftraggeber hat ihn vor dem Hochladen gesehen.',
    'Prüfe jeden Punkt, der am Dokument prüfbar ist, und nur diese Punkte.',
    '',
    catalogueText,
    '',
    'AUSGABE. Antworte ausschließlich mit einem Aufruf des Werkzeugs',
    `"${niche.ai.outputTool.name}". Kein Fliesstext außerhalb des Werkzeugaufrufs.`,
  ].join('\n');
}

/**
 * Regeln für die Parameterextraktion einer Rechennische.
 *
 * Bewusst eine andere Liste als GLOBAL_RULES: Hier soll das Modell nichts
 * feststellen, nichts bewerten und vor allem nichts ausrechnen. Es liest ab.
 * Alles Weitere macht der Rechner in lib/calculators/.
 */
export const EXTRACTION_RULES = `AUFGABE — Parameter ablesen, sonst nichts.

Du liest aus den angehängten Dokumenten ausschließlich Werte ab. Du bewertest
nicht, du prüfst nicht, du rechnest nicht. Jede Bewertung und jede Rechnung
findet danach in geprüftem Programmcode statt, nicht bei dir.

1. Nur ablesen. Trage jeden Parameter genau so ein, wie er im Dokument steht.
   Rechne nichts um, was du nicht umrechnen musst, und leite nichts her.

2. Nichts raten. Steht ein Wert nicht im Dokument, setze für ihn
   "gefunden": false und lass den Wert leer. Ein fehlender Wert ist ein
   gültiges Ergebnis; ein erfundener Wert ist ein Schaden. Wenn du zwischen
   zwei Lesarten schwankst, ist der Parameter nicht gefunden.

3. Quelle angeben. Zu jedem gefundenen Parameter gehört in "quelle", aus
   welchem Dokument und von welcher Seite er stammt.

4. Keine Bewertung, keine Meinung. Formuliere keine Einschätzung dazu, ob ein
   Wert hoch, niedrig, richtig oder falsch ist. Dafür gibt es in diesem
   Werkzeug keine Felder, und es soll auch keine geben.

5. Zahlen als Zahlen. Beträge in Euro ohne Tausenderpunkt und ohne
   Währungszeichen, Dezimaltrennzeichen ist der Punkt. Zinssätze als Zahl in
   Prozent, also 3.45 für 3,45 %. Daten im Format JJJJ-MM-TT.

6. Widersprüche melden statt auflösen. Stehen zwei verschiedene Werte für
   denselben Parameter in verschiedenen Dokumenten, nimm den aus dem
   spezifischeren Dokument und vermerke den Widerspruch in "quelle".`;

/** System-Prompt für die Parameterextraktion einer Rechennische. */
export function buildExtractionPrompt(niche: NicheConfig): string {
  return [
    niche.ai.systemPrompt.trim(),
    '',
    EXTRACTION_RULES,
    '',
    `Der Prüfkatalog dieser Nische (Version ${niche.catalogue.version}) wird nach der`,
    'Extraktion auf das Rechenergebnis angewandt — nicht von dir. Du musst ihn nicht kennen',
    'und sollst ihn nicht anwenden.',
    '',
    'AUSGABE. Antworte ausschließlich mit einem Aufruf des Werkzeugs',
    `"${niche.computePipeline?.extractionTool.name ?? 'extraktion'}". Kein Fließtext.`,
  ].join('\n');
}

/** Nutzernachricht: Kontextangaben und Anker. */
export function buildUserPreamble(
  niche: NicheConfig,
  context: Record<string, string>,
  anchorCents: number | null,
): string {
  const lines = [`Zu prüfendes Dokument: ${niche.input.docLabel}.`, '', 'Angaben des Auftraggebers:'];

  for (const field of niche.input.contextFields) {
    const value = context[field.id];
    lines.push(`- ${field.label}: ${value && value.trim() ? value : 'keine Angabe'}`);
  }

  if (anchorCents !== null) {
    lines.push(
      `- ${niche.input.anchorField.label}: ${(anchorCents / 100).toFixed(2).replace('.', ',')}`,
      '',
      'Diese Summe hat der Auftraggeber selbst abgelesen. Sie ist der Anker: Weicht die von dir',
      'gelesene Endsumme davon ab, ist ein Lesefehler auf deiner Seite die wahrscheinlichere',
      'Erklärung. Sage das dann ausdrücklich, statt eine Rechendifferenz festzustellen.',
    );
  } else {
    lines.push(`- ${niche.input.anchorField.label}: keine Angabe`);
  }

  lines.push(
    '',
    `Prüfe das angehängte Dokument gegen den Prüfkatalog Version ${niche.catalogue.version}.`,
  );

  return lines.join('\n');
}
