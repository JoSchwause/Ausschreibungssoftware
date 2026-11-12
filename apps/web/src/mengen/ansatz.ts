// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Panel der Mengenermittlung als reine Abbildung (Ticket 65): Ansatz → Zeilenentwurf, Zeilen bearbeiten,
// Entwurf → Ansatz und Menge (`mengeneingabe`). Seit Ticket 87 allgemein: für eine Position des LV (Befehl
// `MengenansatzSetzen`) und für eine Zeile eines Aufmaßblatts, dort auch mit einer Menge ohne Ansatz. Gerechnet wird nur
// im Paket `mengen` (N1); hier steht nichts davon.

import { FORMELN, FREIER_RECHENANSATZ, mengenansatzBerechnen } from '@tethys/mengen';
import type { Mengenansatzergebnis } from '@tethys/mengen';
import type { Ansatzzeile, Ergebnis, Menge, MengenansatzSetzen, Position } from '@tethys/vertrag';
import { zahlLesen } from '../lv/zahlen';

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
  return entwurfAusAnsatz(p.mengenansatz ?? null);
}

/** Die Zeilen eines gespeicherten Ansatzes (Position oder Aufmaßzeile) als Entwurf; ohne Ansatz leer. */
export function entwurfAusAnsatz(ansatz: readonly Ansatzzeile[] | null): readonly Ansatzentwurf[] {
  return (ansatz ?? []).map((z, i) => ({
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

/**
 * Eine Zeile in der Textform aus GAEB X31 (Glossar „Textform“, D-83.2): Der Ausdruck beginnt mit `*` und trägt die Zeile
 * der Datei im Wortlaut. `mengen` rechnet sie nie; das Panel zeigt sie als Text, nicht als bearbeitbaren Ausdruck.
 */
export const istTextform = (z: Pick<Ansatzentwurf, 'ausdruck'>): boolean => z.ausdruck.startsWith('*');

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

/** Was eine Mengenermittlung festlegt: Ansatz (oder keiner) und Menge, wie `MengenansatzSetzen` und `Aufmassposition`. */
export interface Mengeneingabe {
  readonly mengenansatz: readonly Ansatzzeile[] | null;
  readonly menge: Menge | null;
}

/**
 * Ansatz und Menge zum Übernehmen, `null`, wenn sich nichts ändert, oder die Meldung zu einer ungültigen Menge ohne
 * Ansatz. Zeilen gehen vor: Ansatz und Summe kommen zusammen (D-22); hat der Ansatz einen Fehler, ist `menge` null
 * (Lesart b). Ohne Zeilen gilt `direkt`: der Text der Menge ohne Ansatz (de-DE, leer = keine Menge); `direkt === null`
 * heißt, es gibt kein solches Feld (LV: die Menge steht im Grid), dann entfernt das Übernehmen nur einen vorhandenen
 * Ansatz und lässt die gespeicherte Menge.
 */
export function mengeneingabe(
  alt: Mengeneingabe,
  zeilen: readonly Ansatzentwurf[],
  direkt: string | null,
): Ergebnis<Mengeneingabe | null, string> {
  const ansatz = ansatzzeilen(zeilen);
  const altAnsatz = alt.mengenansatz ?? [];
  if (ansatz.length > 0) {
    if (gleicheZeilen(ansatz, altAnsatz)) return { ok: true, wert: null };
    return { ok: true, wert: { mengenansatz: ansatz, menge: mengenansatzBerechnen(ansatz).summe } };
  }
  if (direkt === null) {
    return {
      ok: true,
      wert: altAnsatz.length === 0 ? null : { mengenansatz: null, menge: alt.menge },
    };
  }
  let menge: Menge | null = null;
  if (direkt.trim() !== '') {
    const r = zahlLesen('menge', direkt);
    if (!r.ok) return r;
    menge = r.wert;
  }
  const gleich = altAnsatz.length === 0 && alt.menge === menge;
  return { ok: true, wert: gleich ? null : { mengenansatz: null, menge } };
}

/**
 * Der eine Befehl zum Übernehmen an einer Position des LV (A5) oder `null`, wenn es nichts zu tun gibt (siehe
 * `mengeneingabe` ohne Feld für die Menge).
 */
export function ansatzBefehl(p: Position, zeilen: readonly Ansatzentwurf[]): MengenansatzSetzen | null {
  const r = mengeneingabe({ mengenansatz: p.mengenansatz ?? null, menge: p.menge }, zeilen, null);
  if (!r.ok || r.wert === null) return null;
  return { art: 'MengenansatzSetzen', positionId: p.id, ...r.wert };
}
