/**
 * Rauchtest für lib/sanitize.ts.
 *
 * Die Sanitizing-Schicht ist die einzige Stelle, die die Formulierungsgrenze
 * und die Euro-Deckelung auch dann noch hält, wenn das Modell sich nicht daran
 * hält. Deshalb wird sie hier gegen bewusst regelwidrige Modellausgaben
 * geprüft, statt darauf zu vertrauen, dass so etwas nicht vorkommt.
 *
 * Aufruf: npm run smoke:sanitize
 */
import { handwerkerrechnung } from '../config/niches/handwerkerrechnung';
import { DEFAULT_MAX_FINDINGS, canPurchase, previewFindings, previewStats, sanitize } from '../lib/sanitize';
import type { RawAnalysis } from '../lib/analyze';

let failed = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FEHL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function run(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

const base = {
  niche: handwerkerrechnung,
  context: {},
  model: 'test',
  id: 'test',
};

function raw(overrides: Partial<RawAnalysis>): RawAnalysis {
  return {
    assessable: true,
    detectedDocType: 'Handwerkerrechnung',
    docSummary: 'Eine Rechnung über Reparaturarbeiten.',
    checkedIds: ['HR-06', 'HR-15', 'HR-17'],
    findings: [],
    ...overrides,
  };
}

// ── Regel 1: Formulierungsgrenze ───────────────────────────────────────
run('Regel 1 — verbotene Begriffe', () => {
  const result = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      docSummary: 'Die Rechnung ist deutlich überteuert und wirkt unseriös.',
      findings: [
        {
          checkId: 'HR-15',
          severity: 'warn',
          observation: 'Der Stundensatz ist überteuert. Die Klausel im Fußtext ist unwirksam.',
          documentRef: 'Pos. 1 Monteurstunden à 140,00',
          action: 'Bitte erläutern Sie mir den Stundensatz.',
        },
      ],
    }),
  });

  const text = JSON.stringify(result.findings) + result.docSummary;
  check('„überteuert" ersetzt', !/überteuert/i.test(text));
  check('„unwirksam" ersetzt', !/unwirksam/i.test(text));
  check('Satz mit „unseriös" entfernt', !/unseriös/i.test(text));
  check('Ersetzung protokolliert', result.sanitizeLog.some((l) => l.startsWith('Regel 1')));
  check('Fund bleibt erhalten', result.findings.length === 1);
});

// ── Regel 4: Euro-Deckelung ────────────────────────────────────────────
run('Regel 4 — Deckelung auf einen Anteil der Dokumentsumme', () => {
  const result = sanitize({
    ...base,
    anchorCents: 100000, // 1.000 €
    raw: raw({
      findings: [
        {
          checkId: 'HR-17',
          severity: 'warn',
          observation: 'Zwei Anfahrten bei einem Einsatztag.',
          documentRef: 'Pos. 2 An- und Abfahrt',
          action: 'Bitte nennen Sie mir die beiden Einsatztage.',
          euroImpactLowEuro: 400,
          euroImpactHighEuro: 9000,
        },
      ],
    }),
  });

  const impact = result.findings[0]?.euroImpact;
  check('Spanne vorhanden', Boolean(impact));
  check('Obergrenze ≤ 40 % der Dokumentsumme', (impact?.[1] ?? 0) <= 400, `war ${impact?.[1]}`);
  check('Als gedeckelt markiert', result.findings[0]?.euroCapped === true);
  check('Deckelung protokolliert', result.sanitizeLog.some((l) => l.includes('gedeckelt')));
});

run('Regel 4 — keine Schätzung ohne Dokumentsumme', () => {
  const result = sanitize({
    ...base,
    anchorCents: null,
    raw: raw({
      findings: [
        {
          checkId: 'HR-17',
          severity: 'warn',
          observation: 'Zwei Anfahrten bei einem Einsatztag.',
          documentRef: 'Pos. 2 An- und Abfahrt',
          action: 'Bitte nennen Sie mir die beiden Einsatztage.',
          euroImpactLowEuro: 60,
          euroImpactHighEuro: 65,
        },
      ],
    }),
  });

  check('Spanne entfernt', result.findings[0]?.euroImpact === undefined);
  check('Summe leer', result.euroTotal === null);
});

run('Regel 4 — keine Addition über dieselbe Fundstelle', () => {
  const result = sanitize({
    ...base,
    anchorCents: 1000000, // 10.000 €
    raw: raw({
      findings: [
        {
          checkId: 'HR-15',
          severity: 'warn',
          observation: 'Stundensatz über dem Band.',
          documentRef: 'Pos. 1 Monteurstunden',
          action: 'Bitte erläutern Sie den Satz.',
          euroImpactLowEuro: 200,
          euroImpactHighEuro: 300,
        },
        {
          checkId: 'HR-24',
          severity: 'info',
          observation: 'Stundenaufwand passt nicht zur Leistung.',
          documentRef: 'Pos. 1 Monteurstunden',
          action: 'Bitte schlüsseln Sie die Stunden auf.',
          euroImpactLowEuro: 150,
          euroImpactHighEuro: 250,
        },
      ],
    }),
  });

  check('Beide Funde bleiben', result.findings.length === 2);
  check('Summe zählt nur einen', result.euroTotal?.[1] === 300, `war ${result.euroTotal?.[1]}`);
  check('Überschneidung protokolliert', result.sanitizeLog.some((l) => l.includes('gleiche Fundstelle')));
});

run('Regel 4 — Katalogband [0,0] blockiert jede Bezifferung', () => {
  const result = sanitize({
    ...base,
    anchorCents: 500000,
    raw: raw({
      findings: [
        {
          checkId: 'HR-06', // euroImpact [0, 0] im Katalog
          severity: 'error',
          observation: 'Sammelposition ohne Angabe von Art und Umfang.',
          documentRef: 'Pos. 3 Reparaturarbeiten, pauschal',
          action: 'Bitte schlüsseln Sie Position 3 auf.',
          euroImpactLowEuro: 500,
          euroImpactHighEuro: 800,
        },
      ],
    }),
  });

  check('Spanne entfernt', result.findings[0]?.euroImpact === undefined);
  check('Grund protokolliert', result.sanitizeLog.some((l) => l.includes('nicht bezifferbar')));
});

// ── Regel 5: nicht beurteilbar ─────────────────────────────────────────
run('Regel 5 — nicht beurteilbar sperrt das Bezahl-Gate', () => {
  const result = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      assessable: false,
      notAssessableReason: 'Das Bild ist unscharf, Beträge sind nicht lesbar.',
      findings: [
        {
          checkId: 'HR-15',
          severity: 'warn',
          observation: 'Irgendetwas.',
          documentRef: 'Pos. 1',
          action: 'Irgendwas tun.',
        },
      ],
    }),
  });

  check('Funde verworfen', result.findings.length === 0);
  check('Kein Kauf möglich', canPurchase(result) === false);
  check('Begründung erhalten', Boolean(result.notAssessableReason));
});

run('Kein Fund — kein Kauf', () => {
  const result = sanitize({ ...base, anchorCents: 100000, raw: raw({ findings: [] }) });
  check('Kein Kauf möglich', canPurchase(result) === false);
});

// ── Regel 3 und 6: Handlung und Katalogbindung ─────────────────────────
run('Regeln 3 und 6 — Handlung und Katalogbindung', () => {
  const result = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      findings: [
        {
          checkId: 'XX-99',
          severity: 'error',
          observation: 'Erfundener Prüfpunkt.',
          documentRef: 'Pos. 9',
          action: 'Etwas tun.',
        },
        {
          checkId: 'HR-15',
          severity: 'warn',
          observation: 'Stundensatz über dem Band.',
          documentRef: 'Pos. 1',
          action: '',
        },
        {
          checkId: 'HR-17',
          severity: 'warn',
          observation: 'Zwei Anfahrten.',
          documentRef: '',
          action: 'Bitte nennen Sie die Einsatztage.',
        },
      ],
    }),
  });

  check('Alle drei verworfen', result.findings.length === 0, `es blieben ${result.findings.length}`);
  check('Unbekannte ID protokolliert', result.sanitizeLog.some((l) => l.includes('XX-99')));
  check('Fehlende Handlung protokolliert', result.sanitizeLog.some((l) => l.includes('ohne Handlungssatz')));
  check('Fehlende Fundstelle protokolliert', result.sanitizeLog.some((l) => l.includes('ohne Fundstelle')));
});

// ── Vorschau ───────────────────────────────────────────────────────────
run('Vorschau — mittelschwerer Fund, nicht der größte', () => {
  const result = sanitize({
    ...base,
    anchorCents: 1000000,
    raw: raw({
      findings: [
        {
          checkId: 'HR-27',
          severity: 'error',
          observation: 'Anzahlung nicht abgezogen.',
          documentRef: 'Fußtext Anzahlung',
          action: 'Bitte ziehen Sie die Anzahlung ab.',
          euroImpactLowEuro: 900,
          euroImpactHighEuro: 1000,
        },
        {
          checkId: 'HR-17',
          severity: 'warn',
          observation: 'Zwei Anfahrten bei einem Einsatztag.',
          documentRef: 'Pos. 2 Anfahrt',
          action: 'Bitte nennen Sie die Einsatztage.',
          euroImpactLowEuro: 60,
          euroImpactHighEuro: 65,
        },
        {
          checkId: 'HR-05',
          severity: 'info',
          observation: 'Rechnungsnummer vorhanden.',
          documentRef: 'Kopf Rechnungsnummer',
          action: 'Keine Handlung nötig, nur zur Kenntnis.',
        },
      ],
    }),
  });

  const sample = previewFindings(result, handwerkerrechnung.pricing.preview.visibleFindings);
  const stats = previewStats(result);

  check('Genau ein Fund in der Vorschau', sample.length === 1);
  check('Nicht der größte Fund', sample[0]?.checkId !== 'HR-27', `war ${sample[0]?.checkId}`);
  check('Mittlerer Schweregrad bevorzugt', sample[0]?.severity === 'warn');
  check('Kategorien werden genannt', stats.categories.length > 0);
  check('Zählung stimmt', stats.total === 3 && stats.counts.error === 1);
  check(
    'hideEuroTotal ist unveränderlich true',
    handwerkerrechnung.pricing.preview.hideEuroTotal === true,
  );
});

// ── Ersetzen geht vor Löschen ──────────────────────────────────────────
run('Wortfilter — Vorwurfswort raus, Satz bleibt', () => {
  const result = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      findings: [
        {
          checkId: 'HR-15',
          severity: 'warn',
          observation: 'Die Anfahrt wurde absichtlich zweimal berechnet. Beide Fahrten liegen am selben Tag.',
          documentRef: 'Pos. 4 Anfahrtspauschale',
          action: 'Bitte erläutern Sie mir die zweite Anfahrt.',
        },
      ],
    }),
  });

  const observation = result.findings[0]?.observation ?? '';
  check('Fund bleibt erhalten', result.findings.length === 1);
  check('„absichtlich" ist weg', !/absichtlich/i.test(observation));
  check('Der Satz steht noch', /zweimal berechnet/.test(observation));
  check('Zweiter Satz unangetastet', /Beide Fahrten liegen am selben Tag/.test(observation));
  check('Keine Doppelleerzeichen', !/ {2}/.test(observation), observation);
});

// ── Severity nur nach unten ────────────────────────────────────────────
run('Katalogtreue — Schweregrad darf nur nach unten', () => {
  // HR-06 steht im Katalog auf „error".
  const katalogSeverity = handwerkerrechnung.catalogue.checks.find((c) => c.id === 'HR-06')?.severity;

  const runter = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      findings: [
        {
          checkId: 'HR-06',
          severity: 'info',
          observation: 'Position 3 lautet „Reparaturarbeiten".',
          documentRef: 'Pos. 3 Reparaturarbeiten',
          action: 'Bitte schlüsseln Sie Position 3 auf.',
        },
      ],
    }),
  });

  // HR-15 steht im Katalog auf „warn"; „error" wäre eine Anhebung.
  const hoch = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      findings: [
        {
          checkId: 'HR-15',
          severity: 'error',
          observation: 'Der Stundensatz liegt über dem Referenzband.',
          documentRef: 'Pos. 1 Monteurstunden',
          action: 'Bitte erläutern Sie mir den Stundensatz.',
        },
      ],
    }),
  });

  const katalogHr15 = handwerkerrechnung.catalogue.checks.find((c) => c.id === 'HR-15')?.severity;

  check('Katalog HR-06 steht auf error', katalogSeverity === 'error');
  check('Abstufung nach unten bleibt', runter.findings[0]?.severity === 'info');
  check('Anhebung wird zurückgesetzt', hoch.findings[0]?.severity === katalogHr15, `war ${hoch.findings[0]?.severity}`);
  check('Rücksetzung protokolliert', hoch.sanitizeLog.some((l) => l.includes('zurückgesetzt')));
});

// ── Obergrenze für die Anzahl der Funde ────────────────────────────────
run('Obergrenze — mehr Funde als zugesagt', () => {
  const max = handwerkerrechnung.ai.maxFindings ?? DEFAULT_MAX_FINDINGS;
  const alle = handwerkerrechnung.catalogue.checks.slice(0, max + 5);

  const result = sanitize({
    ...base,
    anchorCents: 100000,
    raw: raw({
      findings: alle.map((check, index) => ({
        checkId: check.id,
        // Absteigende Schwere, damit die Sortierung etwas zu tun hat.
        severity: index < 3 ? 'error' : index < 10 ? 'warn' : 'info',
        observation: `Feststellung zu ${check.id}.`,
        documentRef: `Pos. ${index + 1}`,
        action: `Bitte erläutern Sie mir Position ${index + 1}.`,
      })),
    }),
  });

  // Der Schweregrad im Ergebnis ist der aus dem Katalog, nicht der oben
  // gesetzte: severityWithin lässt nur Abstufungen nach unten durch. Geprüft
  // wird deshalb die Reihenfolge, nicht ein einzelner Wert.
  const rang = { error: 0, warn: 1, info: 2 } as const;
  const sortiert = result.findings.every(
    (f, i) => i === 0 || rang[result.findings[i - 1].severity] <= rang[f.severity],
  );

  check('Auf die Obergrenze gekürzt', result.findings.length === max, `waren ${result.findings.length}`);
  check('Kürzung protokolliert', result.sanitizeLog.some((l) => l.startsWith('Obergrenze')));
  check('Nach Schwere sortiert, schwerste zuerst', sortiert);
  check(
    'Kein gekürzter Fund ist schwerer als ein behaltener',
    rang[result.findings[result.findings.length - 1].severity] >= rang[result.findings[0].severity],
  );
});

// ── Nutzereingabe schlägt Modell-Lesung ────────────────────────────────
run('Anker — Abweichung wird genannt, nicht wegkorrigiert', () => {
  const abweichend = sanitize({
    ...base,
    anchorCents: 118405, // 1.184,05 € vom Nutzer abgetippt
    raw: raw({
      documentTotalEuro: 995.1, // das Modell hat etwas anderes gelesen
      findings: [
        {
          checkId: 'HR-15',
          severity: 'warn',
          observation: 'Der Stundensatz liegt über dem Referenzband.',
          documentRef: 'Pos. 1 Monteurstunden',
          action: 'Bitte erläutern Sie mir den Stundensatz.',
        },
      ],
    }),
  });

  const gleich = sanitize({
    ...base,
    anchorCents: 118405,
    raw: raw({ documentTotalEuro: 1184.05, findings: [] }),
  });

  check('Hinweis gesetzt', typeof abweichend.anchorNote === 'string' && abweichend.anchorNote.length > 0);
  check('Beide Zahlen stehen darin', /1\.184,05/.test(abweichend.anchorNote ?? '') && /995,10/.test(abweichend.anchorNote ?? ''));
  check('Ankerwert bleibt unverändert', abweichend.anchorValueCents === 118405);
  check('Abweichung protokolliert', abweichend.sanitizeLog.some((l) => l.startsWith('Anker:')));
  check('Kein Hinweis ohne Abweichung', gleich.anchorNote === undefined);
});

console.log('');
if (failed > 0) {
  console.error(`${failed} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('Alle Prüfungen bestanden.');
