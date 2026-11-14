// SPDX-License-Identifier: AGPL-3.0-or-later
// Vorschau zum Dialog „OZ-Maske ändern“ (E8, F2): Der Kern führt `OzMaskeSetzen` auf dem geladenen Stand aus, ohne zu
// speichern (A5). Passt die Maske, zeigt die Vorschau die neuen Ordnungszahlen; passt sie nicht, nennt sie alle Zeilen,
// die der Kern nennt (`Befehlsfehler.knotenIds`, sonst `knotenId`). Gespeichert wird erst beim Übernehmen, als ein Befehl.

import { lvBefehlAusfuehren } from '@tethys/kern';
import type { Befehlsfehlercode, Knoten, KnotenId, LvZustand, OzMaske } from '@tethys/vertrag';
import { kinderJeEltern } from './ansicht';
import { ozText } from './oztext';

export interface OzAenderung {
  readonly knotenId: KnotenId;
  readonly vorher: string;
  readonly nachher: string;
  readonly kurztext: string;
}

export interface OzKonflikt {
  readonly knotenId: KnotenId;
  readonly oz: string;
  readonly kurztext: string;
}

export type OzMaskenvorschau =
  | { readonly art: 'gleich' }
  | { readonly art: 'neu'; readonly aenderungen: readonly OzAenderung[] }
  | {
      readonly art: 'abgewiesen';
      readonly code: Befehlsfehlercode;
      /** Meldung des Kerns; angezeigt nur, wenn die Maske selbst unzulässig ist (keine Zeilen). */
      readonly meldung: string;
      readonly knoten: readonly OzKonflikt[];
    };

const kurztextVon = (k: Knoten): string => (k.art === 'hinweis' ? '' : k.kurztext);

export function ozMaskeVorschau(zustand: LvZustand, maske: OzMaske): OzMaskenvorschau {
  const r = lvBefehlAusfuehren(zustand, { art: 'OzMaskeSetzen', maske });
  const knoten = zustand.leistungsverzeichnis.knoten;
  if (!r.ok) {
    const ids = r.fehler.knotenIds ?? (r.fehler.knotenId === undefined ? [] : [r.fehler.knotenId]);
    const nachId = new Map<string, Knoten>(knoten.map((k) => [k.id, k]));
    return {
      art: 'abgewiesen',
      code: r.fehler.code,
      meldung: r.fehler.meldung,
      knoten: ids.flatMap((id) => {
        const k = nachId.get(id);
        return k === undefined ? [] : [{ knotenId: id, oz: ozText(k), kurztext: kurztextVon(k) }];
      }),
    };
  }
  const geaendert = r.wert.knoten.geaendert;
  if (r.wert.kopf === null && geaendert.length === 0) return { art: 'gleich' };
  // In Dokumentreihenfolge wie im Grid.
  const lage = dokumentreihenfolge(knoten, zustand.leistungsverzeichnis.id);
  const aenderungen = geaendert
    .map(({ vorher, nachher }) => ({
      knotenId: nachher.id,
      vorher: ozText(vorher),
      nachher: ozText(nachher),
      kurztext: kurztextVon(nachher),
    }))
    .filter((a) => a.vorher !== a.nachher)
    .sort((a, b) => (lage.get(a.knotenId) ?? 0) - (lage.get(b.knotenId) ?? 0));
  return { art: 'neu', aenderungen };
}

function dokumentreihenfolge(knoten: readonly Knoten[], wurzel: string): ReadonlyMap<string, number> {
  const kinder = kinderJeEltern(knoten);
  const lage = new Map<string, number>();
  const besuche = (eltern: string): void => {
    for (const k of kinder.get(eltern) ?? []) {
      lage.set(k.id, lage.size);
      besuche(k.id);
    }
  };
  besuche(wurzel);
  return lage;
}
