// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Adressen der Rechnungen an einer Stelle: bauen (Links, Ziel nach Undo) und lesen (Routing der App). Ohne
// Abhängigkeit auf Kern oder Speicher, damit `App.tsx` und die Historie sie billig importieren.

import type {
  Aenderung,
  AuftragsLeistungsverzeichnisId,
  ProjektId,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import { auftragPfad } from '../auftrag/ziel';

/** Rechnungsliste eines Auftrags-LV. */
export const rechnungenPfad = (projektId: ProjektId, auftragsLvId: AuftragsLeistungsverzeichnisId): string =>
  `${auftragPfad(projektId, auftragsLvId)}/rechnungen`;

/** Prüfansicht einer Rechnung. */
export const rechnungPfad = (
  projektId: ProjektId,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  rechnungId: RechnungId,
): string => `${rechnungenPfad(projektId, auftragsLvId)}/${rechnungId}`;

export interface Rechnungsadresse {
  readonly projektId: ProjektId;
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
  /** `null`: die Liste. */
  readonly rechnungId: RechnungId | null;
}

/** Liest eine Adresse der Rechnungen; `null`, wenn `pfad` keine ist. */
export function rechnungsadresse(pfad: string): Rechnungsadresse | null {
  const m = /^\/projekt\/([^/]+)\/auftrag\/([^/]+)\/rechnungen(?:\/([^/]+))?$/.exec(pfad);
  if (m?.[1] === undefined || m[2] === undefined) return null;
  return {
    projektId: decodeURIComponent(m[1]) as ProjektId,
    auftragsLvId: decodeURIComponent(m[2]) as AuftragsLeistungsverzeichnisId,
    rechnungId: m[3] === undefined ? null : (decodeURIComponent(m[3]) as RechnungId),
  };
}

type Teil = Pick<Rechnung, 'id' | 'auftragsLvId'>;

/**
 * Wohin nach einem Teil an einer Rechnung (Undo/Redo): Steht die Rechnung danach, bleibt die App auf ihrer Liste oder
 * ihrer Prüfansicht, sonst geht sie zur Prüfansicht; ist die Rechnung danach weg, zur Liste. `null`: bleiben.
 */
export function rechnungZiel(
  projektId: ProjektId,
  cs: { readonly rechnung: Aenderung<Teil> },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  const nachher = rueckwaerts ? cs.rechnung.vorher : cs.rechnung.nachher;
  const r = nachher ?? cs.rechnung.vorher ?? cs.rechnung.nachher;
  if (r === null) return null;
  const liste = rechnungenPfad(projektId, r.auftragsLvId);
  const ansicht = rechnungPfad(projektId, r.auftragsLvId, r.id);
  if (nachher === null) return pfad === liste ? null : liste;
  return pfad === liste || pfad === ansicht ? null : ansicht;
}
