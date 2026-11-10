// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte des Grids (L1, U8) an einer Stelle. Keine Übersetzung in v1.

import type { LvSpalte, Position } from '@tethys/vertrag';

export const SPALTENTITEL: Readonly<Record<LvSpalte, string>> = {
  ordnungszahl: 'Ordnungszahl',
  positionsart: 'Art',
  kurztext: 'Kurztext',
  menge: 'Menge',
  einheit: 'Einheit',
  einheitspreis: 'Einheitspreis',
  gesamtpreis: 'Gesamtpreis',
};

/**
 * Text der Spalte „Art“: alle gesetzten Merkmale einer Position in fester Reihenfolge (Zuschlag, Wahl, Bedarf,
 * Stundenlohn, pauschal), getrennt durch „, “; ohne Merkmal „Normal“ (F5, E-05). Die Wahl nennt Gruppe und Variante,
 * soweit bekannt (`Wahl 1.2`, nur Gruppe: `Wahl 1`). Das Zuschlagskennzeichen ist kein eigener Eintrag: Es ist eine
 * Bezugsangabe, keine Art.
 */
export function artText(p: Pick<Position, 'merkmale' | 'zuschlag'>): string {
  const { bedarf, wahl, stundenlohn, pauschal } = p.merkmale;
  const teile: string[] = [];
  if (p.zuschlag !== null) teile.push('Zuschlag');
  if (wahl !== null) {
    const nummer =
      wahl.gruppe === null
        ? ''
        : wahl.variante === null
          ? ` ${String(wahl.gruppe)}`
          : ` ${String(wahl.gruppe)}.${String(wahl.variante)}`;
    teile.push(`Wahl${nummer}`);
  }
  if (bedarf === 'ohne-gesamtbetrag') teile.push('Bedarf');
  if (bedarf === 'mit-gesamtbetrag') teile.push('Bedarf m. GB');
  if (stundenlohn) teile.push('Stundenlohn');
  if (pauschal) teile.push('pauschal');
  return teile.length === 0 ? 'Normal' : teile.join(', ');
}

export const texte = {
  standardBeschriftung: 'Leistungsverzeichnis',
  los: 'Los',
  titel: 'Titel',
  hinweis: 'Hinweis',
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
  summeBedarf: 'Bedarfssumme',
  summeWahl: 'Wahlsumme',
  nichtImNetto: 'nicht im Netto',
  hinweise: 'Hinweise',
  zurZeile: 'Zur Zeile springen',
  zeileNichtSichtbar: 'Die Zeile ist nicht sichtbar. Bitte die Gliederung aufklappen.',
  keineSummen: 'Keine Summen vorhanden',
  leer: 'Das Leistungsverzeichnis enthält noch keine Einträge.',
  fehler: 'Fehler',
  warnung: 'Warnung',
  eingabeUngueltig: 'Eingabe nicht übernommen',
  bild: '[Bild]',
  listenpunkt: '• ',
  zellentrenner: ' | ',
  leereErgaenzung: '…',
  leereZwischenablage: 'Die Zwischenablage enthält keinen Text.',
  loeschenTitel: 'In den Papierkorb legen',
  loeschenBestaetigen: 'In den Papierkorb legen',
  abbrechen: 'Abbrechen',
  loeschenAbgebrochen: 'Löschen abgebrochen.',
  inPapierkorb: 'In den Papierkorb gelegt.',
  ausschneidenAbgebrochen: 'Ausschneiden abgebrochen.',
  verschiebenRand: 'Die Zeile steht schon am Rand.',
  verschiebenNichtMoeglich: 'Nur zusammenhängende Zeilen unter demselben Elternknoten lassen sich verschieben.',
  verschoben: 'Verschoben.',
  zielAusgeschnitten: 'Das Ziel liegt in den ausgeschnittenen Zeilen.',
  positionAngelegt: 'Neue Position angelegt.',
} as const;

export function meldungZeilen(anzahl: number, was: 'kopiert' | 'ausgeschnitten' | 'eingefügt'): string {
  return `${anzahl === 1 ? '1 Zeile' : `${String(anzahl)} Zeilen`} ${was}.`;
}

/** Rückfrage vor dem Löschen (Q5), z. B. „3 Zeilen in den Papierkorb legen, darunter 2 Titel mit 41 Positionen?“. */
export function frageLoeschen(u: {
  readonly knoten: number;
  readonly lose: number;
  readonly titel: number;
  readonly positionen: number;
  readonly mindestens: boolean;
}): string {
  const zeilen = u.knoten === 1 ? '1 Zeile' : `${String(u.knoten)} Zeilen`;
  const gliederungen = u.lose + u.titel;
  if (gliederungen === 0) return `${zeilen} in den Papierkorb legen?`;
  const name =
    u.lose === 0 ? 'Titel' : u.titel === 0 ? (u.lose === 1 ? 'Los' : 'Lose') : 'Gliederungen';
  const positionen =
    u.positionen === 0 && !u.mindestens
      ? 'ohne Positionen'
      : `mit ${u.mindestens ? 'mindestens ' : ''}${String(u.positionen)} ${u.positionen === 1 ? 'Position' : 'Positionen'}`;
  return `${zeilen} in den Papierkorb legen, darunter ${String(gliederungen)} ${name} ${positionen}?`;
}

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

/**
 * Texte der Befehlshinweise (v1.1a, Punkt 10) je `Befehlshinweiscode`. Bewusst keine erschöpfende Tabelle über den
 * Code-Typ: Ein neuer Code im Vertrag zeigt den allgemeinen Text, statt das Grid zu brechen. `oz-maske-ungueltig`
 * kommt mit Vertrag v1.2.
 */
const BEFEHLSHINWEISTEXT: ReadonlyMap<string, string> = new Map([
  ['oz-schritt-ausgewichen', 'Die Ordnungszahlen wurden mit kleinerem Schritt vergeben.'],
  ['netto-nach-nachlass-negativ', 'Das Netto nach Nachlass ist negativ.'],
  ['oz-maske-ungueltig', 'Die OZ-Maske ist ungültig.'],
]);

const BEFEHLSHINWEIS_ALLGEMEIN = 'Der Befehl wurde mit einem Hinweis ausgeführt.';

/** Anzeigetext eines Befehlshinweises; `meldung` des Hinweises ist für Entwickler und wird nicht angezeigt. */
export function befehlshinweisText(code: string): string {
  return BEFEHLSHINWEISTEXT.get(code) ?? BEFEHLSHINWEIS_ALLGEMEIN;
}
