// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte des Grids (L1, U8) an einer Stelle. Keine Übersetzung in v1.

import type { LvSpalte, Positionsart } from '@tethys/vertrag';

export const SPALTENTITEL: Readonly<Record<LvSpalte, string>> = {
  ordnungszahl: 'Ordnungszahl',
  positionsart: 'Art',
  kurztext: 'Kurztext',
  menge: 'Menge',
  einheit: 'Einheit',
  einheitspreis: 'Einheitspreis',
  gesamtpreis: 'Gesamtpreis',
};

export const ARTTEXT: Readonly<Record<Positionsart, string>> = {
  normal: 'Normal',
  bedarf: 'Bedarf',
  wahl: 'Wahl',
  zuschlag: 'Zuschlag',
  stundenlohn: 'Stundenlohn',
};

export const texte = {
  standardBeschriftung: 'Leistungsverzeichnis',
  los: 'Los',
  titel: 'Titel',
  hinweis: 'Hinweis',
  pauschal: 'pauschal',
  aufklappen: 'Aufklappen',
  zuklappen: 'Zuklappen',
  nichtInSumme: 'Geht nicht in die Summe ein',
  schreibgeschuetzt: 'Diese Zelle lässt sich nicht bearbeiten.',
  summen: 'Summen',
  summeNetto: 'Netto',
  summeNachlass: 'Nachlass',
  summeNettoNachNachlass: 'Netto nach Nachlass',
  summeMwst: 'MwSt',
  summeBrutto: 'Brutto',
  keineSummen: 'Keine Summen vorhanden',
  leer: 'Das Leistungsverzeichnis enthält noch keine Einträge.',
  fehler: 'Fehler',
  warnung: 'Warnung',
  eingabeUngueltig: 'Eingabe nicht übernommen',
  bild: '[Bild]',
  keinEinfuegeort: 'Einfügen nicht möglich: Es ist keine Zeile aktiv.',
  leereZwischenablage: 'Die Zwischenablage enthält keinen Text.',
} as const;

export function meldungEingefuegt(positionen: number, ungueltig: number, uebersprungen: number): string {
  const teile = [positionen === 1 ? '1 Position eingefügt' : `${String(positionen)} Positionen eingefügt`];
  if (ungueltig > 0) {
    teile.push(
      ungueltig === 1 ? '1 Zelle ungültig (markiert)' : `${String(ungueltig)} Zellen ungültig (markiert)`,
    );
  }
  if (uebersprungen > 0) {
    teile.push(
      uebersprungen === 1
        ? '1 Zelle in schreibgeschützter Spalte übersprungen'
        : `${String(uebersprungen)} Zellen in schreibgeschützten Spalten übersprungen`,
    );
  }
  return teile.join(', ') + '.';
}
