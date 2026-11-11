// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: Adressen der Abrechnung eines Auftrags-LV (Aufmaßblätter, ein Blatt, Soll/Ist) und das Ziel nach
// Rückgängig/Wiederholen eines Aufmaß-Schritts (für `zielNach` der Historie). Ohne Abhängigkeit auf Kern oder Speicher,
// damit die Hülle sie billig importiert.

import type {
  Aenderung,
  AufmassId,
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  ProjektId,
} from '@tethys/vertrag';

const basis = (projektId: ProjektId, auftragsLvId: AuftragsLeistungsverzeichnisId): string =>
  `/projekt/${projektId}/auftrag/${auftragsLvId}`;

/** Liste der Aufmaßblätter eines Auftrags-LV. */
export function aufmassPfad(projektId: ProjektId, auftragsLvId: AuftragsLeistungsverzeichnisId): string {
  return `${basis(projektId, auftragsLvId)}/aufmass`;
}

/** Ein Aufmaßblatt. */
export function blattPfad(
  projektId: ProjektId,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  aufmassId: AufmassId,
): string {
  return `${aufmassPfad(projektId, auftragsLvId)}/${aufmassId}`;
}

/** Soll/Ist des Auftrags-LV über alle Blätter. */
export function sollIstPfad(projektId: ProjektId, auftragsLvId: AuftragsLeistungsverzeichnisId): string {
  return `${basis(projektId, auftragsLvId)}/soll-ist`;
}

export type Abrechnungsseite =
  | {
      readonly art: 'liste' | 'soll-ist';
      readonly projektId: ProjektId;
      readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
    }
  | {
      readonly art: 'blatt';
      readonly projektId: ProjektId;
      readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
      readonly aufmassId: AufmassId;
    };

/** Welche Seite der Abrechnung ein Pfad meint; `null`: keine. */
export function abrechnungsseite(pfad: string): Abrechnungsseite | null {
  const m = /^\/projekt\/([^/]+)\/auftrag\/([^/]+)\/(aufmass|soll-ist)(?:\/([^/]+))?$/.exec(pfad);
  if (m?.[1] === undefined || m[2] === undefined) return null;
  const projektId = decodeURIComponent(m[1]) as ProjektId;
  const auftragsLvId = decodeURIComponent(m[2]) as AuftragsLeistungsverzeichnisId;
  if (m[3] === 'soll-ist') return m[4] === undefined ? { art: 'soll-ist', projektId, auftragsLvId } : null;
  if (m[4] === undefined) return { art: 'liste', projektId, auftragsLvId };
  return { art: 'blatt', projektId, auftragsLvId, aufmassId: decodeURIComponent(m[4]) as AufmassId };
}

type Kopf = Pick<AufmassKopf, 'id' | 'auftragsLvId'>;

/**
 * Wohin nach einem Teil an einem Aufmaßblatt: Steht das Blatt danach, auf das Blatt (auf Soll/Ist desselben
 * Auftrags-LV ist die Änderung schon sichtbar: bleiben); ist es weg, auf die Liste der Blätter. `null`: bleiben.
 */
export function aufmassZiel(
  projektId: ProjektId,
  cs: { readonly aufmass: Aenderung<Kopf> },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  const danach = rueckwaerts ? cs.aufmass.vorher : cs.aufmass.nachher;
  const k = danach ?? cs.aufmass.vorher ?? cs.aufmass.nachher;
  if (k === null) return null;
  if (danach !== null && pfad === sollIstPfad(projektId, k.auftragsLvId)) return null;
  const ziel =
    danach === null ? aufmassPfad(projektId, k.auftragsLvId) : blattPfad(projektId, k.auftragsLvId, k.id);
  return ziel === pfad ? null : ziel;
}
