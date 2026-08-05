import type { ReactNode } from 'react';
import { Page } from '@/components/ui/Shell';

/**
 * Rechtstexte liegen einmal unter /recht und werden aus jeder Nische
 * verlinkt. Kein Akzent — diese Seiten gehören der Dachdomain, nicht einer
 * einzelnen Prüfung.
 */
export default function RechtLayout({ children }: { children: ReactNode }) {
  return (
    <Page>
      <div className="pb-4 pt-14 sm:pt-16">{children}</div>
    </Page>
  );
}
