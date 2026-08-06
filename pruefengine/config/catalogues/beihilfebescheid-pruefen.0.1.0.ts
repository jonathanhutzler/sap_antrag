import type { Catalogue } from '../schema';

/**
 * Prüfkatalog Beihilfebescheid — Version 0.1.0, Skizze.
 *
 * `published: false`, und das bleibt vorerst so. Der Grund ist nicht
 * Zeitmangel, sondern Struktur: Es gibt den Bund und sechzehn Länder mit
 * jeweils eigenen Beihilfeverordnungen, abweichenden Bemessungssätzen,
 * Eigenbehalten und Beihilfefähigkeitsgrenzen. Das ist kein Prüfkatalog,
 * das sind siebzehn.
 *
 * Freischalten erst, wenn ein oder zwei Dienstherren vollständig gepflegt
 * sind — und dann mit einem Kontextfeld „Dienstherr", das den Katalog
 * einschränkt. Ein Katalog, der so tut, als gälte er bundesweit, ist bei
 * einer Widerspruchsfrist von einem Monat gefährlicher als kein Katalog.
 */
export const catalogue: Catalogue = {
  version: '0.1.0',
  published: false,
  checks: [
    {
      id: 'BEI-01',
      label: 'Angewandter Bemessungssatz',
      severity: 'error',
      basis: 'ZU KLÄREN JE DIENSTHERR: Bemessungssatz nach der jeweiligen Beihilfeverordnung',
      category: 'Bemessung',
      instruction:
        'Prüfe den angewandten Bemessungssatz gegen den für den Dienstherrn und die Familiensituation geltenden Satz.',
    },
    {
      id: 'BEI-02',
      label: 'Eigenbehalte richtig abgezogen',
      severity: 'warn',
      basis: 'ZU KLÄREN JE DIENSTHERR: Höhe und Anwendungsfälle der Eigenbehalte',
      category: 'Bemessung',
      instruction: 'Rechne die abgezogenen Eigenbehalte gegen die Vorgaben des Dienstherrn nach.',
    },
    {
      id: 'BEI-03',
      label: 'Beihilfefähigkeit der abgerechneten Leistungen',
      severity: 'error',
      basis: 'ZU KLÄREN JE DIENSTHERR: Katalog beihilfefähiger Aufwendungen',
      category: 'Beihilfefähigkeit',
      instruction: 'Prüfe, ob abgelehnte Positionen nach der geltenden Verordnung beihilfefähig wären.',
    },
    {
      id: 'BEI-04',
      label: 'Höchstbeträge und Begrenzungen',
      severity: 'warn',
      basis: 'ZU KLÄREN JE DIENSTHERR: Höchstbeträge, etwa bei Heilmitteln und Hilfsmitteln',
      category: 'Beihilfefähigkeit',
      instruction: 'Prüfe die angewandten Höchstbeträge gegen die geltenden Grenzen.',
    },
    {
      id: 'BEI-05',
      label: 'Rechnerische Richtigkeit des Bescheids',
      severity: 'error',
      basis: 'Rechnerische Prüfung der Einzelpositionen gegen den Auszahlungsbetrag',
      category: 'Rechenwerk',
      instruction: 'Addiere die beihilfefähigen Beträge und vergleiche das Ergebnis mit dem Auszahlungsbetrag.',
    },
    {
      id: 'BEI-06',
      label: 'Begründung der Ablehnung',
      severity: 'warn',
      basis: 'ZU KLÄREN: Anforderungen an die Begründung eines belastenden Verwaltungsakts',
      category: 'Form und Verfahren',
      instruction: 'Prüfe, ob abgelehnte Positionen einzeln und nachvollziehbar begründet sind.',
    },
    {
      id: 'BEI-07',
      label: 'Widerspruchsfrist',
      severity: 'error',
      basis: 'Regelmäßig ein Monat ab Bekanntgabe; ZU KLÄREN JE DIENSTHERR: Fristbeginn und Form',
      category: 'Form und Verfahren',
      instruction:
        'Nenne das konkrete Datum, bis zu dem Widerspruch eingelegt werden kann. Der wichtigste Punkt des gesamten Berichts.',
    },
    {
      id: 'BEI-08',
      label: 'Rechtsbehelfsbelehrung vorhanden und richtig',
      severity: 'warn',
      basis: 'ZU KLÄREN: Folgen einer fehlenden oder fehlerhaften Rechtsbehelfsbelehrung für die Frist',
      category: 'Form und Verfahren',
      instruction: 'Prüfe, ob eine Rechtsbehelfsbelehrung vorhanden ist und was sie zur Frist sagt.',
    },
  ],
};
