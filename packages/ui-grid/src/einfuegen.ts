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
  LvBefehl,
  LvSpalte,
  Menge,
  PositionId,
  Positionsdaten,
} from '@tethys/vertrag';
import { istBearbeitbareSpalte, leseEinheitspreis, leseKostengruppe, leseMenge } from './eingabe';
import type { KostengruppeLesen } from './typen';

export interface UngueltigeZelle {
  readonly knotenId: PositionId;
  readonly spalte: LvSpalte;
  readonly text: string;
  readonly meldung: string;
}

export interface Einfuegeplan {
  readonly befehle: readonly LvBefehl[];
  readonly ungueltig: readonly UngueltigeZelle[];
  readonly uebersprungen: number;
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
  const befehle: LvBefehl[] = [];
  const ungueltig: UngueltigeZelle[] = [];
  let uebersprungen = 0;
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
    zeile.forEach((text, offset) => {
      const spalte = spalten[ersteSpalte + offset];
      if (
        spalte === undefined ||
        !istBearbeitbareSpalte(spalte) ||
        (spalte === 'kostengruppe' && kostengruppeLesen === undefined)
      ) {
        uebersprungen++;
        return;
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
        case 'menge': {
          const r = leseMenge(text, zahlen);
          if (r.ok) menge = r.wert;
          else ungueltig.push({ knotenId: id, spalte, text, meldung: r.meldung });
          break;
        }
        case 'einheitspreis': {
          const r = leseEinheitspreis(text, zahlen);
          if (r.ok) einheitspreis = r.wert;
          else ungueltig.push({ knotenId: id, spalte, text, meldung: r.meldung });
          break;
        }
        case 'kostengruppe': {
          if (kostengruppeLesen === undefined) break;
          const r = leseKostengruppe(text, kostengruppeLesen);
          if (r.ok) kostengruppe = r.wert;
          else ungueltig.push({ knotenId: id, spalte, text, meldung: r.meldung });
          break;
        }
      }
    });
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
    befehle.push({ art: 'PositionAnlegen', id, ort, daten });
    ort = { art: 'nach', knotenId: id };
  }
  return { befehle, ungueltig, uebersprungen };
}
