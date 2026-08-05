import type { Severity } from '@/config/schema';

/**
 * Ein Vokabular für Schweregrade, überall gleich.
 *
 * Die Wortwahl hält die Formulierungsgrenze ein: „Abweichung" und „Hinweis",
 * nicht „Fehler" oder „Verstoß". Was der Bericht nicht behaupten darf, darf
 * die Oberfläche erst recht nicht behaupten.
 */

export const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Wesentliche Abweichung',
  warn: 'Abweichung',
  info: 'Hinweis',
};

export const SEVERITY_LABEL_PLURAL: Record<Severity, string> = {
  error: 'Wesentliche Abweichungen',
  warn: 'Abweichungen',
  info: 'Hinweise',
};

const CLASSES: Record<Severity, string> = {
  error: 'border-severity-error/35 text-severity-error bg-severity-error/[0.06]',
  warn: 'border-severity-warn/35 text-severity-warn bg-severity-warn/[0.06]',
  info: 'border-severity-info/35 text-severity-info bg-severity-info/[0.06]',
};

const DOTS: Record<Severity, string> = {
  error: 'bg-severity-error',
  warn: 'bg-severity-warn',
  info: 'bg-severity-info',
};

export function SeverityTag({ severity, children }: { severity: Severity; children?: React.ReactNode }) {
  return (
    <span className={`tag ${CLASSES[severity]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[severity]}`} aria-hidden />
      {children ?? SEVERITY_LABEL[severity]}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DOTS[severity]}`} aria-hidden />;
}
