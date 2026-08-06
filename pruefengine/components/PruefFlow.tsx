'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Severity } from '@/config/schema';
import { SEVERITY_LABEL_PLURAL, SeverityTag } from './ui/Severity';
import { trackClient } from '@/lib/track';
import { WAIVER_TEXT } from '@/lib/waiver';

/**
 * Upload → Vorschau → Bezahl-Gate.
 *
 * Die Komponente kennt keine einzelne Nische. Alles, was sie anzeigt, kommt
 * über `config` aus der Nischen-Config: Feldbeschriftungen, Auswahlwerte,
 * Dateigrenzen, Preisstufen. Eine neue Nische ändert an dieser Datei nichts.
 *
 * Was die Vorschau zeigt und was nicht, entscheidet dabei nicht diese
 * Komponente, sondern der Server: /api/analyze liefert Euro-Beträge,
 * Handlungssätze und verborgene Funde erst gar nicht aus.
 */

export interface FlowConfig {
  slug: string;
  docLabel: string;
  accept: string[];
  maxFiles: number;
  maxMbPerFile: number;
  maxPages: number;
  anchorField: { label: string; type: 'currency' | 'number'; hint?: string };
  contextFields: Array<{
    id: string;
    label: string;
    type: 'select' | 'date';
    options: string[];
    hint?: string;
    required: boolean;
  }>;
  catalogueVersion: string;
  catalogueSize: number;
  experimentId: string;
  visibleFindings: number;
  tiers: Array<{ id: string; label: string; priceCents: number; includes: string[] }>;
  retentionHours: number;
  disclaimer: string;
}

interface PreviewSample {
  checkId: string;
  label: string;
  category: string;
  severity: Severity;
  observation: string;
  documentRef: string;
  basis: string;
}

interface PreviewResponse {
  id: string;
  catalogueVersion: string;
  assessable: boolean;
  purchasable: boolean;
  reason?: string;
  docSummary?: string;
  counts?: Record<Severity, number>;
  totalFindings?: number;
  categories?: string[];
  checkedCount?: number;
  catalogueSize?: number;
  sample?: PreviewSample[];
  hiddenFindings?: number;
  /** Nur Rechennischen: Lage der Forderung zum errechneten Band. */
  position?: 'innerhalb' | 'oberhalb' | 'unterhalb' | null;
}

/**
 * Die Kernaussage einer Rechennische in der Vorschau — ohne jede Zahl.
 * Das Band, die Differenz und die Rechenschritte sind die bezahlte Leistung.
 */
const POSITION_TEXT: Record<'innerhalb' | 'oberhalb' | 'unterhalb', { titel: string; text: string }> = {
  oberhalb: {
    titel: 'Die Forderung liegt über dem errechneten Band',
    text: 'Der von Ihnen genannte Betrag liegt oberhalb dessen, was die eigene Nachrechnung ergibt. Wie groß der Abstand ist und woraus er sich rechnerisch ergibt, steht im Vollbericht.',
  },
  innerhalb: {
    titel: 'Die Forderung liegt innerhalb des errechneten Bandes',
    text: 'Der von Ihnen genannte Betrag liegt in dem Bereich, den die eigene Nachrechnung ergibt. Der Vollbericht zeigt Ihnen das Band, den Rechenweg und die einzelnen Feststellungen.',
  },
  unterhalb: {
    titel: 'Die Forderung liegt unter dem errechneten Band',
    text: 'Der von Ihnen genannte Betrag liegt unterhalb dessen, was die eigene Nachrechnung ergibt. Auch das steht mit Rechenweg im Vollbericht.',
  },
};

const ACCEPT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
};

export function PruefFlow({ config }: { config: FlowConfig }) {
  const [files, setFiles] = useState<File[]>([]);
  const [anchor, setAnchor] = useState('');
  const [context, setContext] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  const [tier, setTier] = useState(config.tiers[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [waiver, setWaiver] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const acceptAttr = useMemo(
    () => config.accept.map((a) => ACCEPT_MIME[a]).filter(Boolean).join(','),
    [config.accept],
  );

  const eventPayload = {
    niche: config.slug,
    experimentId: config.experimentId,
    catalogueVersion: config.catalogueVersion,
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (files.length === 0 || busy) return;

    setBusy(true);
    setError(null);
    setPreview(null);
    trackClient('upload_started', eventPayload);

    const form = new FormData();
    form.set('niche', config.slug);
    form.set('anchor', anchor);
    for (const file of files) form.append('files', file);
    for (const field of config.contextFields) form.set(`ctx_${field.id}`, context[field.id] ?? '');

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: form });
      const data = (await response.json()) as PreviewResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Die Prüfung ist fehlgeschlagen.');
        return;
      }

      setPreview(data);
      trackClient('preview_shown', eventPayload);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch {
      setError('Die Verbindung wurde unterbrochen. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!preview || !waiver || checkoutBusy) return;

    setCheckoutBusy(true);
    setCheckoutError(null);
    trackClient('checkout_started', { ...eventPayload, tier });

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          niche: config.slug,
          resultId: preview.id,
          tier,
          email: email || undefined,
          waiverAccepted: true,
          // Wortlaut mitschicken: der Server vergleicht ihn wortgleich mit
          // seiner eigenen Fassung und protokolliert ihn mit Zeitstempel.
          waiverText: WAIVER_TEXT,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setCheckoutError(data.error ?? 'Die Zahlung konnte nicht gestartet werden.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError('Die Verbindung wurde unterbrochen. Bitte erneut versuchen.');
    } finally {
      setCheckoutBusy(false);
    }
  }

  const selectedTier = config.tiers.find((t) => t.id === tier);

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
      {/* Formular */}
      <form onSubmit={submit} className="sheet h-fit p-7 sm:p-8">
        <p className="eyebrow">Schritt 1</p>
        <h2 className="mt-2 text-display-md">{config.docLabel} hochladen</h2>

        <div className="mt-7">
          <label htmlFor="files" className="field-label">
            {config.docLabel} als Datei
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple={config.maxFiles > 1}
            accept={acceptAttr}
            required
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="field file:mr-3 file:rounded file:border-0 file:bg-paper-sunken file:px-3 file:py-1.5 file:font-sans file:text-sm file:text-ink"
          />
          <p className="mt-1.5 font-sans text-xs text-ink-faint">
            {config.accept.map((a) => a.toUpperCase()).join(', ')} · bis {config.maxFiles}{' '}
            {config.maxFiles === 1 ? 'Datei' : 'Dateien'} · je {config.maxMbPerFile} MB · zusammen bis{' '}
            {config.maxPages} Seiten
          </p>
        </div>

        <div className="mt-6">
          <label htmlFor="anchor" className="field-label">
            {config.anchorField.label}
          </label>
          <input
            id="anchor"
            name="anchor"
            inputMode="decimal"
            required
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            placeholder={config.anchorField.type === 'currency' ? 'z. B. 1184,05' : 'z. B. 12'}
            className="field"
          />
          {config.anchorField.hint && (
            <p className="mt-1.5 font-sans text-xs text-ink-faint">{config.anchorField.hint}</p>
          )}
        </div>

        {config.contextFields.map((field) => (
          <div key={field.id} className="mt-6">
            <label htmlFor={field.id} className="field-label">
              {field.label}
              {field.required && <span className="text-severity-error"> *</span>}
            </label>

            {field.type === 'date' ? (
              // Stichtage sind bei Rechennischen Eingangsgrößen, keine
              // Zusatzinfo — deshalb ein echtes Datumsfeld statt Freitext.
              <input
                id={field.id}
                name={field.id}
                type="date"
                required={field.required}
                value={context[field.id] ?? ''}
                onChange={(e) => setContext((prev) => ({ ...prev, [field.id]: e.target.value }))}
                className="field"
              />
            ) : (
              <select
                id={field.id}
                name={field.id}
                required={field.required}
                value={context[field.id] ?? ''}
                onChange={(e) => setContext((prev) => ({ ...prev, [field.id]: e.target.value }))}
                className="field"
              >
                <option value="">Keine Angabe</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field.hint && <p className="mt-1.5 font-sans text-xs text-ink-faint">{field.hint}</p>}
          </div>
        ))}

        <button type="submit" disabled={busy || files.length === 0} className="btn-primary mt-8 w-full">
          {busy ? 'Wird geprüft …' : 'Kostenlose Vorschau erstellen'}
        </button>

        <p className="mt-3 font-sans text-xs leading-relaxed text-ink-faint">
          Die Vorschau kostet nichts. Ihr Dokument wird nach {config.retentionHours} Stunden automatisch gelöscht.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-card border border-severity-error/40 bg-severity-error/[0.06] p-4 font-sans text-sm text-severity-error">
            {error}
          </p>
        )}
      </form>

      {/* Vorschau */}
      <div ref={resultRef} className="scroll-mt-24">
        {!preview && (
          <div className="sheet border-dashed p-7 sm:p-8">
            <p className="eyebrow">Schritt 2</p>
            <h2 className="mt-2 text-display-md">Was Sie danach kostenlos sehen</h2>
            <ul className="mt-5 space-y-2.5 font-sans text-[0.95rem] leading-relaxed text-ink-muted">
              {[
                'Wie viele Abweichungen gefunden wurden, aufgeteilt nach Schweregrad',
                'Welche Kategorien des Prüfkatalogs betroffen sind, namentlich',
                'Eine vollständig ausformulierte Feststellung mit Fundstelle und Grundlage',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 font-sans text-[0.95rem] leading-relaxed text-ink-faint">
              Im Vollbericht stehen alle weiteren Feststellungen, die geschätzten Beträge und zu jedem Fund ein Satz,
              den Sie schreiben oder sagen können.
            </p>
          </div>
        )}

        {/* Regel 5: nicht beurteilbar — klare Ansage, kein Kaufangebot. */}
        {preview && !preview.assessable && (
          <div className="sheet p-7 sm:p-8">
            <p className="eyebrow">Ergebnis</p>
            <h2 className="mt-2 text-display-md">Nicht beurteilbar</h2>
            <p className="mt-4 font-sans leading-relaxed text-ink-muted">{preview.reason}</p>
            <p className="mt-5 font-sans text-[0.95rem] leading-relaxed text-ink">
              Es gibt deshalb nichts zu kaufen. Laden Sie das Dokument gern erneut hoch — als PDF aus dem
              Original oder als gut lesbares Foto der vollständigen Seite.
            </p>
          </div>
        )}

        {preview && preview.assessable && preview.totalFindings === 0 && (
          <div className="sheet p-7 sm:p-8">
            <p className="eyebrow">Ergebnis</p>
            <h2 className="mt-2 text-display-md">Keine Abweichung gefunden</h2>
            <p className="mt-4 font-sans leading-relaxed text-ink-muted">
              Wir haben {preview.checkedCount} von {config.catalogueSize} Prüfpunkten an Ihrem Dokument prüfen können
              und dabei nichts gefunden, das wir feststellen würden.
            </p>
            <p className="mt-4 font-sans text-[0.95rem] leading-relaxed text-ink">
              Ein Bericht hätte für Sie keinen Inhalt. Deshalb bieten wir ihn nicht an.
            </p>
          </div>
        )}

        {preview && preview.assessable && (preview.totalFindings ?? 0) > 0 && (
          <div className="space-y-6">
            <div className="sheet p-7 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="eyebrow">Kostenlose Vorschau</p>
                  <h2 className="mt-2 text-display-md">
                    {preview.totalFindings === 1
                      ? 'Eine Feststellung'
                      : `${preview.totalFindings} Feststellungen`}
                  </h2>
                </div>
                <span className="checkid">Katalog {preview.catalogueVersion}</span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-rule bg-rule">
                {(['error', 'warn', 'info'] as Severity[]).map((severity) => (
                  <div key={severity} className="bg-paper-raised px-4 py-4 text-center">
                    <p className="font-display text-2xl text-ink">{preview.counts?.[severity] ?? 0}</p>
                    <p className="mt-1 font-sans text-[0.7rem] uppercase tracking-wider text-ink-faint">
                      {SEVERITY_LABEL_PLURAL[severity]}
                    </p>
                  </div>
                ))}
              </div>

              {preview.categories && preview.categories.length > 0 && (
                <div className="mt-6">
                  <p className="font-sans text-sm font-semibold text-ink">Betroffene Kategorien</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {preview.categories.map((category) => (
                      <li key={category} className="tag border-rule text-ink-muted">
                        {category}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.position && (
                <div className="mt-6 rounded-card border border-accent bg-accent-soft p-5">
                  <p className="font-display text-lg text-ink">{POSITION_TEXT[preview.position].titel}</p>
                  <p className="mt-1.5 font-sans text-[0.92rem] leading-relaxed text-ink-muted">
                    {POSITION_TEXT[preview.position].text}
                  </p>
                </div>
              )}

              {preview.docSummary && (
                <p className="mt-6 font-sans text-[0.93rem] leading-relaxed text-ink-muted">{preview.docSummary}</p>
              )}
            </div>

            {/* Kostprobe: ein ausformulierter Fund, mittlerer Schwere. */}
            {preview.sample?.map((finding) => (
              <div key={finding.checkId} className="sheet p-7 sm:p-8">
                <p className="eyebrow">Eine Feststellung im Wortlaut</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="checkid">{finding.checkId}</span>
                  <SeverityTag severity={finding.severity} />
                  <span className="font-sans text-xs text-ink-faint">{finding.category}</span>
                </div>

                <h3 className="mt-3 text-xl">{finding.label}</h3>
                <p className="mt-3 font-sans leading-relaxed text-ink-muted">{finding.observation}</p>

                <dl className="mt-5 space-y-2 border-t border-rule pt-5 font-sans text-[0.9rem]">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="w-32 shrink-0 text-ink-faint">Fundstelle</dt>
                    <dd className="text-ink">„{finding.documentRef}"</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="w-32 shrink-0 text-ink-faint">Grundlage</dt>
                    <dd className="text-ink">{finding.basis}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <dt className="w-32 shrink-0 text-ink-faint">Ihr Satz dazu</dt>
                    <dd className="text-ink-faint">im Vollbericht</dd>
                  </div>
                </dl>
              </div>
            ))}

            {/* Bezahl-Gate */}
            {preview.purchasable && (
              <div className="sheet p-7 sm:p-8">
                <p className="eyebrow">Vollbericht</p>
                <h3 className="mt-2 text-display-md">
                  {preview.hiddenFindings === 1
                    ? 'Eine weitere Feststellung im Bericht'
                    : `${preview.hiddenFindings} weitere Feststellungen im Bericht`}
                </h3>
                <p className="mt-3 font-sans text-[0.95rem] leading-relaxed text-ink-muted">
                  Dazu die geschätzten Beträge je Feststellung und in der Summe sowie zu jedem Fund genau einen Satz,
                  den Sie schreiben oder sagen können.
                </p>

                <div className="mt-6 space-y-3">
                  {config.tiers.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer gap-3 rounded-card border p-4 transition-colors ${
                        tier === option.id ? 'border-accent bg-accent-soft' : 'border-rule bg-paper-raised'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={option.id}
                        checked={tier === option.id}
                        onChange={() => setTier(option.id)}
                        className="mt-1 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-sans font-semibold text-ink">{option.label}</span>
                          <span className="font-display text-lg text-ink">
                            {(option.priceCents / 100).toFixed(2).replace('.', ',')} €
                          </span>
                        </span>
                        <span className="mt-1.5 block font-sans text-[0.85rem] leading-relaxed text-ink-muted">
                          {option.includes.join(' · ')}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-6">
                  <label htmlFor="email" className="field-label">
                    E-Mail für den Bericht (optional)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="field"
                  />
                  <p className="mt-1.5 font-sans text-xs text-ink-faint">
                    Ohne Angabe können Sie den Bericht direkt nach der Zahlung herunterladen.
                  </p>
                </div>

                <label className="mt-6 flex cursor-pointer gap-3 rounded-card border border-rule bg-paper-sunken p-4">
                  <input
                    type="checkbox"
                    checked={waiver}
                    onChange={(e) => setWaiver(e.target.checked)}
                    className="mt-1 accent-accent"
                  />
                  <span className="font-sans text-[0.85rem] leading-relaxed text-ink-muted">{WAIVER_TEXT}</span>
                </label>

                <button
                  type="button"
                  onClick={checkout}
                  disabled={!waiver || checkoutBusy}
                  className="btn-primary mt-6 w-full"
                >
                  {checkoutBusy
                    ? 'Weiter zur Zahlung …'
                    : `Vollbericht kaufen — ${((selectedTier?.priceCents ?? 0) / 100).toFixed(2).replace('.', ',')} €`}
                </button>

                {checkoutError && (
                  <p role="alert" className="mt-4 font-sans text-sm text-severity-error">
                    {checkoutError}
                  </p>
                )}

                <p className="mt-4 font-sans text-xs leading-relaxed text-ink-faint">
                  Zahlung über Stripe. Mit dem Kauf gilt die{' '}
                  <Link href="/recht/agb" className="underline underline-offset-2">
                    AGB
                  </Link>
                  ; zur Widerrufsbelehrung und zum Muster-Widerrufsformular:{' '}
                  <Link href="/recht/widerruf" className="underline underline-offset-2">
                    Widerruf
                  </Link>
                  . {config.disclaimer}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
