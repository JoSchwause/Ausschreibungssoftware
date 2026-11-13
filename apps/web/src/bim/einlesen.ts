// SPDX-License-Identifier: AGPL-3.0-or-later
// Einlesen einer IFC-Datei (Ticket 114, X1a): Größe prüfen (Befund, keine Sperre, D-51) → mit `ifc` lesen und abbilden (in
// der App im Web Worker, hier als `lesen` übergeben) → Bytes ablegen (`speicher.modelldateien.ablegen`) →
// `BauwerksmodellAnlegen` über den Befehlsweg (ein Undo-Schritt). Den Tag des Einlesens setzt die Uhr der App (Rand, A2).
//
// Reihenfolge (D-114.2): erst lesen, dann ablegen. So bleiben für eine Datei, die kein Modell ergibt, keine Bytes liegen; den
// Hash, den der Kopf beim Lesen noch nicht kennt, setzt die App danach in `datei` ein (`ifc` übernimmt den Kopf unverändert).

import type { BauwerksmodellLesung } from '@tethys/ifc';
import type {
  BauwerksmodellId,
  BauwerksmodellKopf,
  Pruefbefund,
  ProjektId,
  Zeitstempel,
} from '@tethys/vertrag';
import type { Abweisung, Umgebung } from '../lv/befehlsweg';
import { bauwerksmodellSitzung } from './schreiben';
import { texte } from './texte';

/** Etwa 200 MB (D-51): darüber ein Befund. */
export const GROSSE_DATEI = 200 * 1000 * 1000;

export type Lesen = (
  bytes: Uint8Array,
  kopf: Omit<BauwerksmodellKopf, 'schema'>,
) => Promise<BauwerksmodellLesung>;

export function groessenbefund(groesse: number): Pruefbefund | null {
  if (groesse <= GROSSE_DATEI) return null;
  return {
    schwere: 'warnung',
    quelle: 'ifc-lesen',
    code: 'datei-gross',
    meldung: texte.einlesen.dateiGross(groesse),
    ort: {},
  };
}

/** Der Dateiname ohne Endung `.ifc` als Vorschlag für den Namen. */
export function namensvorschlag(dateiname: string): string {
  const ohne = dateiname.replace(/\.ifc$/i, '');
  return ohne.trim() === '' ? dateiname : ohne;
}

/** `JJJJ-MM-TT` des Zeitpunkts in der Ortszeit des Nutzers. */
export function tagDesEinlesens(wann: Zeitstempel | string): string {
  const d = new Date(wann);
  const zwei = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export type Einlesung =
  | { readonly art: 'angelegt'; readonly id: BauwerksmodellId; readonly befunde: readonly Pruefbefund[] }
  /** Die Datei ergab kein Modell (zu groß, keine IFC-Datei, anderes Schema); nichts geschrieben. */
  | { readonly art: 'nicht-lesbar'; readonly befunde: readonly Pruefbefund[] }
  | { readonly art: 'abgewiesen'; readonly abweisung: Abweisung; readonly befunde: readonly Pruefbefund[] };

export async function modellEinlesen(
  u: Umgebung,
  projektId: ProjektId,
  datei: { readonly name: string; readonly bytes: Uint8Array },
  optionen: { readonly lesen: Lesen; readonly vorgaengerId: BauwerksmodellId | null; readonly name?: string },
): Promise<Einlesung> {
  const gross = groessenbefund(datei.bytes.length);
  const kopf: Omit<BauwerksmodellKopf, 'schema'> = {
    id: u.ids.bauwerksmodell(),
    projektId,
    name: optionen.name?.trim() || namensvorschlag(datei.name),
    datei: { hash: '', dateiname: datei.name, groesse: datei.bytes.length },
    vorgaengerId: optionen.vorgaengerId,
    eingelesen: tagDesEinlesens(u.uhr()),
  };
  const lesung = await optionen.lesen(datei.bytes, kopf);
  const befunde = gross === null ? lesung.befunde : [gross, ...lesung.befunde];
  if (lesung.bauwerksmodell === null) return { art: 'nicht-lesbar', befunde };
  const abgelegt = await u.speicher.modelldateien.ablegen(datei.bytes);
  if (!abgelegt.ok)
    return { art: 'abgewiesen', abweisung: { art: 'speicher', fehler: abgelegt.fehler }, befunde };
  const bauwerksmodell = {
    ...lesung.bauwerksmodell,
    datei: { ...lesung.bauwerksmodell.datei, hash: abgelegt.wert },
  };
  const a = await bauwerksmodellSitzung(u, projektId, null).befehl({
    art: 'BauwerksmodellAnlegen',
    bauwerksmodell,
  });
  return a.ok
    ? { art: 'angelegt', id: bauwerksmodell.id, befunde }
    : { art: 'abgewiesen', abweisung: a.abweisung, befunde };
}
