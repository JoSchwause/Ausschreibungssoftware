// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Panel der Mengenermittlung als reine Abbildung (Ticket 65): Position → Zeilenentwurf, Zeilen bearbeiten,
// Entwurf → ein Befehl `MengenansatzSetzen`. Gerechnet wird nur im Paket `mengen` (N1); hier steht nichts davon.

import { FORMELN, FREIER_RECHENANSATZ, mengenansatzBerechnen } from '@tethys/mengen';
import type { Mengenansatzergebnis } from '@tethys/mengen';
import type { Ansatzzeile, MengenansatzSetzen, Position } from '@tethys/vertrag';

/** Eine Zeile im Panel; Zahlen der Zeile als Zahl, Texte wie eingegeben. */
export interface Ansatzentwurf {
  /** Schlüssel der Zeile für die Oberfläche; ändert sich nie, auch wenn die Zeile wandert. */
  readonly schluessel: number;
  readonly zeile: number;
  readonly formel: number;
  readonly ausdruck: string;
  /** Leer: kein Variablenname. */
  readonly variable: string;
}

/** Die umgesetzten Formelnummern (Auswahl im Panel), aufsteigend. */
export const FORMELNUMMERN: readonly number[] = [...FORMELN.keys()].sort((a, b) => a - b);

export function entwurfAusPosition(p: Position): readonly Ansatzentwurf[] {
  return (p.mengenansatz ?? []).map((z, i) => ({
    schluessel: i + 1,
    zeile: z.zeile,
    formel: z.formel,
    ausdruck: z.ausdruck,
    variable: z.variable ?? '',
  }));
}

const naechster = (zeilen: readonly Ansatzentwurf[], feld: 'schluessel' | 'zeile'): number =>
  zeilen.reduce((m, z) => Math.max(m, z[feld]), 0) + 1;

/** Legt eine leere Zeile hinter `index` an (`-1`: vorn); ihre Nummer ist die größte vorhandene plus 1. */
export function zeileAnlegen(zeilen: readonly Ansatzentwurf[], index: number): readonly Ansatzentwurf[] {
  const neu: Ansatzentwurf = {
    schluessel: naechster(zeilen, 'schluessel'),
    zeile: naechster(zeilen, 'zeile'),
    formel: FREIER_RECHENANSATZ,
    ausdruck: '',
    variable: '',
  };
  return [...zeilen.slice(0, index + 1), neu, ...zeilen.slice(index + 1)];
}

/** Löscht die Zeile an `index`; die Nummern der übrigen bleiben (Bezüge `Z3` behalten ihren Sinn). */
export function zeileLoeschen(zeilen: readonly Ansatzentwurf[], index: number): readonly Ansatzentwurf[] {
  return zeilen.filter((_, i) => i !== index);
}

/** Tauscht die Zeile mit ihrem Nachbarn; am Rand bleibt die Folge dieselbe (dasselbe Objekt). */
export function zeileVerschieben(
  zeilen: readonly Ansatzentwurf[],
  index: number,
  richtung: -1 | 1,
): readonly Ansatzentwurf[] {
  const ziel = index + richtung;
  const a = zeilen[index];
  const b = zeilen[ziel];
  if (a === undefined || b === undefined) return zeilen;
  const neu = [...zeilen];
  neu[index] = b;
  neu[ziel] = a;
  return neu;
}

/** Eine ganz leere Zeile (weder Ausdruck noch Variable) zählt nicht. */
export const zeileLeer = (z: Ansatzentwurf): boolean => z.ausdruck.trim() === '' && z.variable.trim() === '';

/** Die Zeilen für `mengen` und den Befehl: ganz leere Zeilen fallen weg, ein leerer Variablenname ist keiner. */
function ansatzzeilen(zeilen: readonly Ansatzentwurf[]): readonly Ansatzzeile[] {
  return zeilen
    .filter((z) => !zeileLeer(z))
    .map((z) => ({
      zeile: z.zeile,
      formel: z.formel,
      ausdruck: z.ausdruck,
      variable: z.variable.trim() === '' ? null : z.variable.trim(),
    }));
}

/** Zeilenergebnisse und Summe des Entwurfs, gerechnet von `mengen`. */
export function ansatzBerechnen(zeilen: readonly Ansatzentwurf[]): Mengenansatzergebnis {
  return mengenansatzBerechnen(ansatzzeilen(zeilen));
}

const gleicheZeilen = (a: readonly Ansatzzeile[], b: readonly Ansatzzeile[]): boolean =>
  a.length === b.length &&
  a.every((x, i) => {
    const y = b[i];
    return (
      y !== undefined &&
      x.zeile === y.zeile &&
      x.formel === y.formel &&
      x.ausdruck === y.ausdruck &&
      x.variable === y.variable
    );
  });

/**
 * Der eine Befehl zum Übernehmen (A5) oder `null`, wenn es nichts zu tun gibt: Ansatz und Menge kommen zusammen
 * (D-22). Hat der Ansatz einen Fehler, ist `menge` null (Lesart b). Ohne Zeilen entfernt der Befehl einen vorhandenen
 * Ansatz und lässt die Menge, wie sie ist.
 */
export function ansatzBefehl(p: Position, zeilen: readonly Ansatzentwurf[]): MengenansatzSetzen | null {
  const ansatz = ansatzzeilen(zeilen);
  const alt = p.mengenansatz ?? [];
  if (ansatz.length === 0) {
    return alt.length === 0
      ? null
      : { art: 'MengenansatzSetzen', positionId: p.id, mengenansatz: null, menge: p.menge };
  }
  if (gleicheZeilen(ansatz, alt)) return null;
  return {
    art: 'MengenansatzSetzen',
    positionId: p.id,
    mengenansatz: ansatz,
    menge: mengenansatzBerechnen(ansatz).summe,
  };
}
