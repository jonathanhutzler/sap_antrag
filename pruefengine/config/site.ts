/**
 * Dachdomain- und Anbieterdaten. Eine Stelle für die gesamte Engine.
 *
 * ACHTUNG — vor dem ersten Deploy ausfüllen:
 * Alle Werte, die mit "[" beginnen, sind Platzhalter. `npm run check:niches`
 * bricht ab, solange noch Platzhalter gesetzt sind, und /recht/impressum
 * zeigt einen sichtbaren Hinweis statt einer unvollständigen Anbieterkennung.
 *
 * Warum hier und nicht in .env: Impressum und AGB sind statischer Vertragstext.
 * Sie gehören versioniert ins Repository, damit nachvollziehbar bleibt,
 * welcher Text zu welchem Zeitpunkt galt.
 */

export const site = {
  /** Ohne Protokoll, ohne www. Kanonische Dachdomain. */
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || '[DACHDOMAIN.de eintragen]',

  /** Marke der Dachdomain. Bewusst kein Nischenbegriff. */
  name: 'Prüfstelle',
  claim: 'Dokumente prüfen, bevor Sie zahlen.',

  /** Das Versprechen des Hubs. Kein Kachel-Verzeichnis, eine eigene Aussage. */
  promise:
    'Wir prüfen Abrechnungen gegen einen veröffentlichten Prüfkatalog — nicht gegen ein Bauchgefühl. Sie sehen vorab, wonach gesucht wird, und danach, was gefunden wurde.',

  /**
   * Übernommen aus dem Impressum des Bestandsprodukts
   * handwerkerrechnung-pruefen.de (Stand 08/2026).
   */
  provider: {
    entity: 'Jonathan Hutzler',
    street: 'Feldstraße 106',
    zipCity: '85716 Unterschleißheim',
    country: 'Deutschland',
    email: 'kontakt@handwerkerrechnung-pruefen.de',
    /**
     * Leer zulässig, solange eine zweite schnelle Kontaktmöglichkeit besteht
     * (Kontaktformular mit Antwort binnen 60 Minuten). Sonst hier eintragen.
     */
    phone: '',
    /** Kleinunternehmer nach § 19 UStG: kein Umsatzsteuerausweis. */
    smallBusiness: true,
    vatNote:
      'Als Kleinunternehmer im Sinne von § 19 UStG wird keine Umsatzsteuer berechnet und daher auch keine Umsatzsteuer-Identifikationsnummer geführt.',
    /** Nur ausfüllen, wenn vorhanden — sonst leer lassen. */
    vatId: '',
    /** § 18 Abs. 2 MStV — Verantwortlicher für redaktionelle Inhalte. */
    editorialResponsible: 'Jonathan Hutzler',
    registerNote: '',
  },

  support: {
    /** Eine Support-Inbox für alle Nischen. */
    inbox: process.env.SUPPORT_INBOX || 'kontakt@handwerkerrechnung-pruefen.de',
    /** Absender für Resend. Muss eine verifizierte Domain sein. */
    mailFrom:
      process.env.MAIL_FROM || 'Handwerkerrechnung pruefen <noreply@handwerkerrechnung-pruefen.de>',
  },

  /** EU-Plattform zur Online-Streitbeilegung, Pflichtangabe für Onlinehändler. */
  odrUrl: 'https://ec.europa.eu/consumers/odr/',

  /** Auftragsverarbeiter — Quelle für die Tabelle in der Datenschutzerklärung. */
  processors: [
    {
      name: 'Anthropic PBC',
      purpose: 'KI-Analyse des hochgeladenen Dokuments',
      location: 'USA',
      basis: 'Auftragsverarbeitung, EU-Standardvertragsklauseln',
      note: 'Keine Nutzung der Inhalte zum Modelltraining laut Commercial Terms.',
    },
    {
      name: 'Vercel Inc.',
      purpose: 'Hosting, Auslieferung der Website, Server-Logs',
      location: 'USA / EU-Region',
      basis: 'Auftragsverarbeitung, EU-Standardvertragsklauseln',
      note: 'Funktionen werden in der EU-Region ausgeführt.',
    },
    {
      name: 'Upstash Inc.',
      purpose: 'Zwischenspeicherung des Prüfergebnisses, Missbrauchsschutz',
      location: 'EU (Frankfurt)',
      basis: 'Auftragsverarbeitung',
      note: 'Automatische Löschung nach Ablauf der Aufbewahrungsfrist der Nische.',
    },
    {
      name: 'Stripe Payments Europe Ltd.',
      purpose: 'Zahlungsabwicklung',
      location: 'Irland / USA',
      basis: 'Eigene Verantwortlichkeit des Zahlungsdienstleisters, Art. 6 Abs. 1 lit. b DSGVO',
      note: 'Zahlungsdaten werden ausschließlich bei Stripe verarbeitet, nicht bei uns.',
    },
    {
      name: 'Resend (Plus Five Five, Inc.)',
      purpose: 'Versand des Berichts und der Bestellbestätigung per E-Mail',
      location: 'USA',
      basis: 'Auftragsverarbeitung, EU-Standardvertragsklauseln',
      note: 'Nur E-Mail-Adresse und Bericht, keine weitergehenden Profildaten.',
    },
  ],
} as const;

/**
 * Ursprung für kanonische URLs. Solange die Dachdomain ein Platzhalter ist,
 * fällt er auf localhost zurück — sonst scheitert der Build an `new URL()`,
 * und zwar mit einer Meldung, die nicht nach „Domain fehlt" aussieht.
 */
export function origin(): string {
  return site.domain.includes('[') ? 'http://localhost:3000' : `https://${site.domain}`;
}

export function siteUrl(path = '/'): string {
  const base = origin();
  if (!path.startsWith('/')) return `${base}/${path}`;
  return path === '/' ? base : `${base}${path}`;
}

/** true, solange Platzhalter in den Anbieterdaten stehen. */
export function hasPlaceholders(): boolean {
  const values = [
    site.domain,
    site.provider.entity,
    site.provider.street,
    site.provider.zipCity,
    site.provider.email,
    site.support.inbox,
  ];
  return values.some((v) => typeof v === 'string' && v.includes('['));
}
