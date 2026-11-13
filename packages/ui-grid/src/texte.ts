// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte des Grids (L1, U8) an einer Stelle. Keine Übersetzung in v1.

import type { LvSpalte, Position } from '@tethys/vertrag';

export const SPALTENTITEL: Readonly<Record<LvSpalte, string>> = {
  ordnungszahl: 'OZ',
  positionsart: 'Art',
  kurztext: 'Kurztext',
  menge: 'Menge',
  einheit: 'Einheit',
  einheitspreis: 'Einheitspreis',
  gesamtpreis: 'Gesamtpreis',
  kostengruppe: 'KG',
};

/**
 * Sichtbarer Kopf je Spalte: wie `SPALTENTITEL`, nur die Ordnungszahl als „OZ“, weil ihre Spalte so schmal sein darf wie
 * die OZ selbst (Ticket 130). Der zugängliche Name bleibt der volle Titel.
 */
export const SPALTENKOPF: Readonly<Record<LvSpalte, string>> = { ...SPALTENTITEL, ordnungszahl: 'OZ' };

/** Ansage nach dem Ändern einer Spaltenbreite per Tastatur, z. B. „Spalte Menge: 140 Pixel breit.“ */
export function meldungBreite(spalte: string, breite: number | null): string {
  return breite === null
    ? `Spalte ${spalte}: Standardbreite.`
    : `Spalte ${spalte}: ${String(breite)} Pixel breit.`;
}

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
  gridSchreibgeschuetzt: 'Schreibgeschützt: Hier lässt sich nichts ändern.',
  /** Schreibgeschütztes Grid mit bearbeitbarer Spalte „KG“ (Ticket 93, z. B. Auftrags-LV). */
  gridNurKostengruppe: 'Schreibgeschützt: Nur die Spalte KG lässt sich ändern.',
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
  /** Kennzeichen der Mengenzelle einer Position mit Mengenansatz (Ticket 74, D-65.2): Symbol und Beschreibung. */
  mengenansatzSymbol: 'Σ',
  mengenansatz: 'Menge aus Mengenansatz. Eine direkte Änderung der Menge entfernt den Mengenansatz',
  bild: '[Bild]',
  listenpunkt: '• ',
  zellentrenner: ' · ',
  leereErgaenzung: '…',
  leereZwischenablage: 'Die Zwischenablage enthält keinen Text.',
  loeschenTitel: 'In den Papierkorb legen',
  loeschenBestaetigen: 'In den Papierkorb legen',
  abbrechen: 'Abbrechen',
  loeschenAbgebrochen: 'Löschen abgebrochen.',
  inPapierkorb: 'In den Papierkorb gelegt.',
  ausschneidenAbgebrochen: 'Ausschneiden abgebrochen.',
  verschiebenNichtMoeglich:
    'Nicht verschoben: Die Zeilen stehen am Rand oder hängen unter ihren Geschwistern nicht zusammen.',
  zwischenablageGesperrt: 'Die Zwischenablage ist nicht verfügbar.',
  verschoben: 'Verschoben.',
  zielAusgeschnitten: 'Das Ziel liegt in den ausgeschnittenen Zeilen.',
  positionAngelegt: 'Neue Position angelegt.',
  vergleichBeschriftung: 'Vergleich',
  vergleichLeer: 'Keine Zeilen vorhanden.',
  /** Kennzeichen am Rand der Balkenspalte (Ticket 96): Der Balken reicht über den dargestellten Zeitraum hinaus. */
  balkenVorher: 'beginnt vor dem dargestellten Zeitraum',
  balkenNachher: 'endet nach dem dargestellten Zeitraum',
  balkenGanzVorher: 'liegt vor dem dargestellten Zeitraum',
  balkenGanzNachher: 'liegt nach dem dargestellten Zeitraum',
  istVorher: 'Ist-Termine beginnen vor dem dargestellten Zeitraum',
  istNachher: 'Ist-Termine enden nach dem dargestellten Zeitraum',
  istGanzVorher: 'Ist-Termine liegen vor dem dargestellten Zeitraum',
  istGanzNachher: 'Ist-Termine liegen nach dem dargestellten Zeitraum',
  /** Symbole der Randkennzeichen: wohin der Balken weitergeht. */
  balkenVorherSymbol: '◀',
  balkenNachherSymbol: '▶',
  /** Zugängliche Beschreibung des Kopfes einer Balkenspalte mit Markierungen, z. B. „Markierungen: Stichtag …“. */
  markierungen: 'Markierungen',
} as const;

/** Ansage nach Strg+C im Vergleichsgrid, z. B. „1 Zelle kopiert.“ oder „3 × 2 Zellen kopiert.“. */
export function meldungZellenKopiert(zeilen: number, spalten: number): string {
  return zeilen * spalten === 1
    ? '1 Zelle kopiert.'
    : `${String(zeilen)} × ${String(spalten)} Zellen kopiert.`;
}

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
  const name = u.lose === 0 ? 'Titel' : u.titel === 0 ? (u.lose === 1 ? 'Los' : 'Lose') : 'Gliederungen';
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
 * Ansage nach dem Einfügen einer Spalte in die Spalte „KG“ (Ticket 93), z. B. „2 Kostengruppen geändert, 1 Zelle ungültig
 * (markiert).“
 */
export function meldungKostengruppen(geaendert: number, ungueltig: number, uebersprungen: number): string {
  const teile = [
    geaendert === 0
      ? 'Keine Kostengruppe geändert'
      : geaendert === 1
        ? '1 Kostengruppe geändert'
        : `${String(geaendert)} Kostengruppen geändert`,
  ];
  if (ungueltig > 0) {
    teile.push(
      ungueltig === 1 ? '1 Zelle ungültig (markiert)' : `${String(ungueltig)} Zellen ungültig (markiert)`,
    );
  }
  if (uebersprungen > 0) {
    teile.push(
      uebersprungen === 1
        ? '1 Zelle ohne Position übersprungen'
        : `${String(uebersprungen)} Zellen ohne Position übersprungen`,
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
