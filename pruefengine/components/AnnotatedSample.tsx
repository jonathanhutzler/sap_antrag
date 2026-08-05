import type { AnnotatedSample as Sample } from '@/config/schema';
import { SeverityTag } from './ui/Severity';

/**
 * Signaturmotiv jeder Landing: eine Beispielansicht des zu prüfenden
 * Dokuments mit markierten Fundstellen und der zitierten Prüfpunkt-ID.
 *
 * Vollständig aus `landing.sample` der Nischen-Config gespeist. Eine neue
 * Nische bekommt ihr eigenes Motiv, ohne dass diese Komponente sich ändert —
 * genau das ist der Test für die Architektur-Regel.
 */
export function AnnotatedSample({ sample }: { sample: Sample }) {
  if (sample.lines.length === 0) return null;

  const markColor = (mark: string) => {
    const annotation = sample.annotations.find((a) => a.mark === mark);
    if (!annotation) return 'bg-ink-faint';
    return annotation.severity === 'error'
      ? 'bg-severity-error'
      : annotation.severity === 'warn'
        ? 'bg-severity-warn'
        : 'bg-severity-info';
  };

  return (
    <figure className="sheet overflow-hidden">
      <div className="border-b border-rule bg-paper-sunken px-5 py-3 sm:px-7">
        <p className="font-display text-[1.05rem] text-ink">{sample.docTitle}</p>
        <p className="mt-0.5 font-sans text-xs text-ink-faint">{sample.docMeta.join(' · ')}</p>
      </div>

      <div className="px-5 py-5 sm:px-7">
        <table className="w-full border-collapse font-mono text-[0.82rem]">
          <tbody>
            {sample.lines.map((line, i) => {
              const marked = Boolean(line.mark);
              return (
                <tr key={i} className={marked ? 'bg-accent-soft' : undefined}>
                  <td className="w-8 py-1.5 align-top">
                    {line.mark && (
                      <span className={`mark-dot ${markColor(line.mark)}`}>{line.mark}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 align-top text-ink">{line.text}</td>
                  <td className="py-1.5 text-right align-top tabular-nums text-ink">{line.amount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sample.annotations.length > 0 && (
        <div className="rule-top divide-y divide-rule bg-paper-raised">
          {sample.annotations.map((annotation) => (
            <div key={annotation.mark} className="flex gap-3 px-5 py-4 sm:px-7">
              <span className={`mark-dot mt-0.5 ${markColor(annotation.mark)}`}>{annotation.mark}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="checkid">{annotation.checkId}</span>
                  <SeverityTag severity={annotation.severity} />
                </div>
                <p className="mt-1.5 font-sans text-[0.92rem] leading-relaxed text-ink-muted">{annotation.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <figcaption className="rule-top bg-paper-sunken px-5 py-3 font-sans text-xs text-ink-faint sm:px-7">
        {sample.caption}
      </figcaption>
    </figure>
  );
}
