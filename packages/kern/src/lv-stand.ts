// SPDX-License-Identifier: AGPL-3.0-or-later
// LvStandAnlegen (Ticket 42, Punkt 6; Vertrag v1.2, ADR 0006). Der Kern liefert nur den Kopf des Stands im ChangeSet;
// den Zustand friert `speicher` in derselben Transaktion ein (Ticket 43). Ein Stand verändert den LV-Zustand nicht.

//
// Vertrag v1.7a (Ticket 137, D-127.1): `LvStandUmbenennen` und `LvStandLoeschen` mit eigenem Ausführer
// `lvStandBefehlAusfuehren` (Zustand: der ganze Stand). Das ChangeSet ist ein `LvChangeSet` des LV, dem der Stand gehört,
// ohne Kopf, Knoten und Summen; Löschen trägt zusätzlich `lvStandInhalt`, damit Undo den Stand unverändert wieder ablegt.

import type {
  Befehlsfehler,
  Ergebnis,
  LvChangeSet,
  LvStand,
  LvStandAnlegen,
  LvStandBefehlAusfuehren,
  LvStandKopf,
  LvZustand,
} from '@tethys/vertrag';
import { LEERE_SUMMENAENDERUNG, baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { indexVon } from './struktur';

/** Ein Stand braucht einen Namen; Leerraum zählt als leer (beim Anlegen wie beim Umbenennen, D-137.1). */
const nameFehlt = (name: unknown): boolean => typeof name !== 'string' || name.trim() === '';
const NAME_FEHLT = 'Ein LV-Stand braucht einen Namen.';

/**
 * Prüft den Namen (nicht leer, Leerraum zählt als leer: `ungueltige-eingabe`, `feld: 'name'`) und die Kennung, soweit
 * der Kern sie kennt: nicht die Kennung des LV oder eines Knotens (`id-vergeben`). Ob es schon einen Stand mit dieser
 * Kennung gibt, weiß nur `speicher` (`konflikt`, Ticket 43).
 */
export function lvStandAnlegen(z: LvZustand, b: LvStandAnlegen): Ergebnis<LvChangeSet, Befehlsfehler> {
  const lv = z.leistungsverzeichnis;
  if (nameFehlt(b.name)) return nein('ungueltige-eingabe', NAME_FEHLT, undefined, 'name');
  if ((b.id as string) === lv.id || indexVon(lv.id, lv.knoten).byId.has(b.id))
    return nein('id-vergeben', `Kennung bereits vergeben: ${b.id}`, undefined, 'id');
  return ok({
    ...baueChangeSet(z, {}),
    lvStand: { vorher: null, nachher: { id: b.id, leistungsverzeichnisId: lv.id, name: b.name } },
  });
}

/** Das leere ChangeSet am LV des Stands: kein Kopf, keine Knoten, keine Summen (D-127.1). */
const leeresChangeSet = (stand: LvStand): LvChangeSet => ({
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: stand.leistungsverzeichnisId,
  kopf: null,
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: LEERE_SUMMENAENDERUNG,
});

/**
 * Führt einen Befehl an einem gespeicherten LV-Stand aus (Vertrag v1.7a, D-127.1), rein (A2).
 *
 * - Eine Kennung, die nicht die des übergebenen Stands ist, und eine unbekannte Befehlsart: `befehl-nicht-zustaendig`.
 * - `LvStandUmbenennen`: Name wie beim Anlegen (nicht leer, `ungueltige-eingabe` mit `feld: 'name'`, D-137.1); derselbe
 *   Name ist keine Änderung (leeres ChangeSet ohne `lvStand`), sonst `lvStand` mit beiden Köpfen.
 * - `LvStandLoeschen`: `lvStand.nachher: null` und `lvStandInhalt` mit `angelegt` und eingefrorenem Zustand. Nichts
 *   verweist auf einen Stand; es gibt keine Sperre.
 *
 * Kopf und Inhalt tragen genau ihre Felder, auch wenn ein Aufrufer mehr mitbringt.
 */
export const lvStandBefehlAusfuehren: LvStandBefehlAusfuehren = (stand, befehl) => {
  const art: string = befehl.art;
  if (befehl.lvStandId !== stand.id)
    return nein(
      'befehl-nicht-zustaendig',
      `${art}: der Befehl nennt den Stand ${String(befehl.lvStandId)}, übergeben ist ${stand.id}.`,
    );
  const kopf: LvStandKopf = {
    id: stand.id,
    leistungsverzeichnisId: stand.leistungsverzeichnisId,
    name: stand.name,
  };
  switch (befehl.art) {
    case 'LvStandUmbenennen':
      if (nameFehlt(befehl.name)) return nein('ungueltige-eingabe', NAME_FEHLT, undefined, 'name');
      if (befehl.name === stand.name) return ok(leeresChangeSet(stand));
      return ok({
        ...leeresChangeSet(stand),
        lvStand: { vorher: kopf, nachher: { ...kopf, name: befehl.name } },
      });
    case 'LvStandLoeschen':
      return ok({
        ...leeresChangeSet(stand),
        lvStand: { vorher: kopf, nachher: null },
        lvStandInhalt: { vorher: { angelegt: stand.angelegt, zustand: stand.zustand }, nachher: null },
      });
    default:
      return nein('befehl-nicht-zustaendig', `Befehl ${art} gehört nicht zum LV-Stand.`);
  }
};
