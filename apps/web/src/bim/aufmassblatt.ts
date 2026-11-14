// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt aus Auswahl (Ticket 115, X1d, D-53): Nach dem Zuschlag führt der Weg vom Modell ins Auftrags-LV nur über ein
// neues Aufmaßblatt. Die Zeilen der ausgewählten, zugeordneten Bauteile baut `bim` (`aufmassAusAuswahl`), die Mengen rechnet
// die App mit `mengen` (D-22); das Blatt legt `AufmassAnlegen` an (ein Undo-Schritt). Rein.

import { aufmassAusAuswahl, aufmassUeberschneidungen, type Aufmasshinweis } from '@tethys/bim';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type {
  Ansatzzeile,
  Aufmass,
  AufmassAnlegen,
  AufmassKopf,
  AuftragsLeistungsverzeichnis,
  Bauwerksmodell,
  IdQuelle,
  IfcGlobalId,
  Knoten,
  Menge,
  Pruefbefund,
} from '@tethys/vertrag';
import { neuesBlatt } from '../abrechnung/aufmass';
import type { Zeilenkopf } from '../ui/zeilenkopf';

export interface Aufmassvorschauzeile extends Zeilenkopf {
  /** Die ausgewählten, zugeordneten GlobalIds (auch die ohne Zeile). */
  readonly bauteile: readonly IfcGlobalId[];
  readonly zeilen: readonly Ansatzzeile[];
  /** Menge aus `mengen`; `null` ohne Zeile (dann keine Aufmaßposition). */
  readonly menge: Menge | null;
  readonly befunde: readonly Pruefbefund[];
  /**
   * Ticket 155: die anderen Blätter desselben Auftrags-LV, auf denen die Position schon steht (Nummer und Menge dort).
   * Ob dort dieselben Bauteile gemessen sind, ist nicht erkennbar; die App zeigt es als Hinweis.
   */
  readonly schonAufgemessen: readonly { readonly nummer: number; readonly menge: Menge | null }[];
}

export interface Aufmassvorschau {
  readonly zeilen: readonly Aufmassvorschauzeile[];
  readonly hinweise: readonly Aufmasshinweis[];
}

/**
 * Die Vorschau je Position des Auftrags-LV mit mindestens einem ausgewählten, zugeordneten Bauteil (LV-Reihenfolge).
 * `blaetter`: die vorhandenen Blätter des Auftrags-LV, für den Hinweis „schon aufgemessen“ (Ticket 155).
 */
export function aufmassVorschau(
  knoten: readonly Knoten[],
  modell: Bauwerksmodell,
  auswahl: readonly string[],
  blaetter: readonly Aufmass[] = [],
): Aufmassvorschau {
  const positionen = new Map(knoten.map((k) => [k.id as string, k]));
  const r = aufmassAusAuswahl(knoten, modell, auswahl as readonly IfcGlobalId[]);
  const schon = new Map(
    aufmassUeberschneidungen(r, blaetter).map((u) => [
      u.positionId as string,
      u.blaetter.map((b) => ({ nummer: b.nummer, menge: b.menge })),
    ]),
  );
  return {
    zeilen: r.positionen.map((v) => {
      const k = positionen.get(v.positionId);
      const p = k?.art === 'position' ? k : null;
      return {
        positionId: v.positionId,
        oz: p?.ordnungszahl ?? '',
        kurztext: p?.kurztext ?? '',
        einheit: p?.einheit ?? '',
        bauteile: v.bauteile,
        zeilen: v.zeilen,
        menge: v.zeilen.length === 0 ? null : mengenansatzBerechnen(v.zeilen).summe,
        befunde: v.befunde,
        schonAufgemessen: schon.get(v.positionId) ?? [],
      };
    }),
    hinweise: r.hinweise,
  };
}

/** `AufmassAnlegen` für ein neues Blatt mit je einer Aufmaßposition je Vorschauzeile mit Zeilen (D-108.6). */
export function aufmassBlattBefehl(
  ids: Pick<IdQuelle, 'aufmass'>,
  auftrag: Pick<AuftragsLeistungsverzeichnis, 'id' | 'projektId'>,
  vorhanden: readonly Pick<AufmassKopf, 'nummer'>[],
  kopf: Pick<Aufmass, 'bezeichnung' | 'datum'>,
  vorschau: Aufmassvorschau,
): AufmassAnlegen {
  const positionen = vorschau.zeilen
    .filter((z) => z.zeilen.length > 0)
    .map((z) => ({ positionId: z.positionId, mengenansatz: z.zeilen, menge: z.menge }));
  return neuesBlatt(ids, auftrag, vorhanden, kopf, positionen);
}
