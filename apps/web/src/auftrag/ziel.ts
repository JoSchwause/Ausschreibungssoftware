// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: Adressen des Auftrags-LV und das Ziel nach Rückgängig/Wiederholen eines Zuschlags (für `zielNach` der
// Historie). Ohne Abhängigkeit auf Kern oder Speicher, damit die Hülle sie billig importiert.

import type { Aenderung, AuftragsLeistungsverzeichnisId, AuftragsLvKopf, ProjektId } from '@tethys/vertrag';
import { preisspiegelPfad } from '../vergabe/pfad';

/** Seite eines Auftrags-LV. Mit Projekt, weil das Auftrags-LV nur über die Projektdatei zu laden ist (D-64.2). */
export function auftragPfad(projektId: ProjektId, id: AuftragsLeistungsverzeichnisId): string {
  return `/projekt/${projektId}/auftrag/${id}`;
}

type Kopf = Pick<AuftragsLvKopf, 'id' | 'leistungsverzeichnisId'>;

/**
 * Wohin nach einem Teil am Auftrags-LV: Steht das Auftrags-LV danach (Wiederholen), auf seine Seite; ist es weg
 * (Rückgängig), zum Preisspiegel seines LV, wo der Zuschlag wieder möglich ist. `null`: bleiben.
 */
export function auftragZiel(
  projektId: ProjektId,
  cs: { readonly kopf: Aenderung<Kopf> | null },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  if (cs.kopf === null) return null;
  const nachher = rueckwaerts ? cs.kopf.vorher : cs.kopf.nachher;
  const k = nachher ?? (rueckwaerts ? cs.kopf.nachher : cs.kopf.vorher);
  if (k === null) return null;
  const ziel = nachher !== null ? auftragPfad(projektId, k.id) : preisspiegelPfad(k.leistungsverzeichnisId);
  return ziel === pfad ? null : ziel;
}
