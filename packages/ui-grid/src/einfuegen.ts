// SPDX-License-Identifier: AGPL-3.0-or-later
// Einfügen aus der Excel-Zwischenablage: aus einer Textmatrix werden Befehle. Reine Logik; das Grid selbst
// bleibt eine Hülle um diese Funktion. Siehe Ticket 21, „Semantik des Einfügens“.
//
// Regeln:
// - Der Block liegt wie in Excel ab der aktiven Spalte über den sichtbaren Spalten. Zellen in Spalten, die sich
//   nicht bearbeiten lassen (Ordnungszahl, Art, Gesamtpreis), und Zellen rechts der letzten Spalte werden
//   übersprungen und nur gezählt.
// - Jede eingefügte Zeile ergibt genau einen Befehl `PositionAnlegen`, in Zeilenreihenfolge: die erste nach der
//   aktiven Zeile (`nach`), jede weitere nach der zuvor angelegten. Es wird nie eine bestehende Zeile überschrieben.
// - Ein Zahlentext, den der Parser ablehnt, wird nicht verworfen: Die Position entsteht mit leerem Feld (`null`),
//   der Originaltext kommt in `ungueltig`, damit das Grid die Zelle markieren kann. Ebenso eine formwidrige
//   Kostengruppe (Spalte „KG“, Ticket 93): Die Position entsteht ohne sie. Ohne Lesefunktion der App ist die Spalte
//   schreibgeschützt und wird übersprungen.
//
// Eine einzelne Spalte, die in der Spalte „KG“ beginnt, legt keine Positionen an, sondern setzt die Kostengruppe der
// vorhandenen Zeilen (`planeKostengruppen`, D-93.2).

import type {
  Einfuegeort,
  ElternId,
  Einheit,
  Einheitspreis,
  GridIdQuelle,
  GridZahlen,
  KnotenId,
  Kostengruppennummer,
  KostengruppeSetzen,
  LvBefehl,
  LvSpalte,
  LvZeile,
  Menge,
  PositionId,
  Positionsdaten,
} from '@tethys/vertrag';
import { leseEinheitspreis, leseKostengruppe, leseMenge, nimmtEingabe } from './eingabe';
import type { Zahlenlesung } from './eingabe';
import type { KostengruppeLesen } from './typen';

export interface UngueltigeZelle {
  readonly knotenId: PositionId;
  readonly spalte: LvSpalte;
  readonly text: string;
  readonly meldung: string;
}

/**
 * Was ein Einfügen ergibt: die Befehle (eine Folge), die Zellen, deren Text nicht gelesen wurde (markiert, U5), und die
 * Zahl der übersprungenen Zellen. Gemeinsam für neue Positionen und für das Füllen der Spalte „KG“.
 */
export interface Plan<B extends LvBefehl> {
  readonly befehle: readonly B[];
  readonly ungueltig: readonly UngueltigeZelle[];
  readonly uebersprungen: number;
}

export type Einfuegeplan = Plan<LvBefehl>;

/** Sammelt einen Plan: Befehle, ungültige Zellen und übersprungene Zellen. */
function planer<B extends LvBefehl>() {
  const befehle: B[] = [];
  const ungueltig: UngueltigeZelle[] = [];
  let uebersprungen = 0;
  return {
    befehl: (b: B): void => {
      befehle.push(b);
    },
    /** Liest eine Zelle; ein Fehler kommt als markierte Zelle in den Plan, der Wert ist dann `undefined`. */
    lies: <T>(
      r: Zahlenlesung<T>,
      knotenId: PositionId,
      spalte: LvSpalte,
      text: string,
    ): T | null | undefined => {
      if (r.ok) return r.wert;
      ungueltig.push({ knotenId, spalte, text, meldung: r.meldung });
      return undefined;
    },
    ueberspringe: (): void => {
      uebersprungen++;
    },
    plan: (): Plan<B> => ({ befehle, ungueltig, uebersprungen }),
  };
}

export type Einfuegeanker =
  | { readonly art: 'nach'; readonly knotenId: KnotenId }
  | { readonly art: 'ende'; readonly elternId: ElternId };

/** Daten einer leeren Position ohne Merkmale und ohne OZ (die OZ ergänzt die App, Ticket 46 Punkt 5). */
export function leerePositionsdaten(): Positionsdaten {
  return {
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext: '',
    langtext: [],
    menge: null,
    einheit: null,
    einheitspreis: null,
    epa: null,
  };
}

export function planeEinfuegen(
  matrix: readonly (readonly string[])[],
  ersteSpalte: number,
  spalten: readonly LvSpalte[],
  anker: Einfuegeanker,
  zahlen: GridZahlen,
  ids: GridIdQuelle,
  kostengruppeLesen?: KostengruppeLesen,
): Einfuegeplan {
  const p = planer<LvBefehl>();
  let ort: Einfuegeort =
    anker.art === 'nach'
      ? { art: 'nach', knotenId: anker.knotenId }
      : { art: 'ende', elternId: anker.elternId };

  for (const zeile of matrix) {
    const id = ids.position();
    let kurztext = '';
    let menge: Menge | null = null;
    let einheit: Einheit | null = null;
    let einheitspreis: Einheitspreis | null = null;
    let kostengruppe: Kostengruppennummer | null = null;
    for (const [offset, text] of zeile.entries()) {
      const spalte = spalten[ersteSpalte + offset];
      if (spalte === undefined || !nimmtEingabe(spalte, kostengruppeLesen)) {
        p.ueberspringe();
        continue;
      }
      switch (spalte) {
        case 'kurztext':
          kurztext = text;
          break;
        case 'einheit': {
          const t = text.trim();
          einheit = t === '' ? null : t;
          break;
        }
        case 'menge':
          menge = p.lies(leseMenge(text, zahlen), id, spalte, text) ?? null;
          break;
        case 'einheitspreis':
          einheitspreis = p.lies(leseEinheitspreis(text, zahlen), id, spalte, text) ?? null;
          break;
        case 'kostengruppe':
          if (kostengruppeLesen === undefined) break;
          kostengruppe = p.lies(leseKostengruppe(text, kostengruppeLesen), id, spalte, text) ?? null;
          break;
      }
    }
    // Eine Position aus der Zwischenablage hat keine Merkmale; gesetzt werden sie im Positionsdialog. Die Kostengruppe
    // fehlt, wenn keine gelesen wurde (nie `null` im Zustand).
    const daten: Positionsdaten = {
      ...leerePositionsdaten(),
      kurztext,
      menge,
      einheit,
      einheitspreis,
      ...(kostengruppe === null ? {} : { kostengruppe }),
    };
    p.befehl({ art: 'PositionAnlegen', id, ort, daten });
    ort = { art: 'nach', knotenId: id };
  }
  return p.plan();
}

export type Kostengruppenplan = Plan<KostengruppeSetzen>;

/**
 * Eine einzelne Spalte aus der Zwischenablage in die Spalte „KG“ (Ticket 93, D-93.2): Die Werte gehen Zeile für Zeile auf
 * die sichtbaren Zeilen ab `ab`, wie Excel in eine Spalte einfügt; es entsteht keine Position. Je Position, deren
 * Kostengruppe sich ändert, ein `KostengruppeSetzen` (leer: `null`, Zuordnung entfernen); eine formwidrige Nummer verwirft
 * nur ihre Zelle (`ungueltig`). Eine Nummer auf einer Gliederung, einem Hinweistext oder hinter der letzten Zeile wird
 * übersprungen und gezählt; eine leere Zelle dort nicht, sie ginge ohnehin nirgends hin (so passt eine mit Strg+C kopierte
 * Spalte, in der Gliederungen leer sind, wieder auf dieselben Zeilen). Zellen rechts der ersten Spalte gibt es hier nicht.
 */
export function planeKostengruppen(
  matrix: readonly (readonly string[])[],
  ab: number,
  zeilen: readonly LvZeile[],
  lesen: KostengruppeLesen,
): Kostengruppenplan {
  const p = planer<KostengruppeSetzen>();
  matrix.forEach((zellen, offset) => {
    const text = zellen[0] ?? '';
    const k = zeilen[ab + offset]?.knoten;
    if (k?.art !== 'position') {
      if (text.trim() !== '') p.ueberspringe();
      return;
    }
    const wert = p.lies(leseKostengruppe(text, lesen), k.id, 'kostengruppe', text);
    if (wert === undefined || wert === (k.kostengruppe ?? null)) return;
    p.befehl({ art: 'KostengruppeSetzen', positionId: k.id, kostengruppe: wert });
  });
  return p.plan();
}
