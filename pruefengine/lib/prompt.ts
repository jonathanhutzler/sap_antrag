import type { NicheConfig } from '@/config/schema';

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

  return [
    niche.ai.systemPrompt.trim(),
    '',
    GLOBAL_RULES,
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
