// SPDX-License-Identifier: AGPL-3.0-or-later
// Einmalige Übernahme der Einstellungen aus dem Browserspeicher (Ticket 150; E15, D-73, D-82 S8). Bis Welle 7 lagen die
// eigenen Druckprofile und die Kostengruppenbezeichnungen im `localStorage`; seitdem stehen sie in den Einstellungen des
// Speichers (und so in der Sicherung). Übernommen wird nur, **solange das Einstellungsprotokoll leer ist**, als gewöhnliche
// protokollierte Befehle; danach nie wieder, auch wenn die Einstellungen später leer sind. Die alten Schlüssel bleiben stehen.
// Was dort nicht als eigenes Profil gilt (unlesbar, Standardname, doppelt), bleibt dort und zeigt der Druckdialog weiter an.

import { bezeichnungenLesen } from '@tethys/kosten';
import type { Druckprofil, Kostengruppenbezeichnung, Kostengruppennummer } from '@tethys/vertrag';
import { PROFILE_SCHLUESSEL, ablageLesen, type Werkzeug } from '../ausgabe/profile';
import type { EinstellungenSitzung } from '../historie/einstellungen';
import { BEZEICHNUNGEN_SCHLUESSEL } from '../kosten/bezeichnungen';

/** Lesender Zugriff auf den Browserspeicher; jeder Zugriff darf scheitern (privates Fenster, gesperrte Daten). */
export type Leseablage = Pick<Storage, 'getItem'>;

/** Wie viel übernommen wurde. */
export interface Ablageuebernahme {
  readonly druckprofile: number;
  readonly kostengruppenbezeichnungen: number;
}

const NICHTS: Ablageuebernahme = { druckprofile: 0, kostengruppenbezeichnungen: 0 };

function lesen(ablage: Leseablage | null, schluessel: string): string | null {
  try {
    return ablage?.getItem(schluessel) ?? null;
  } catch {
    return null;
  }
}

export function standardLeseablage(): Leseablage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Die Bezeichnungen der CSV als Liste der Einstellungen, nach Nummer geordnet (wie `kgSortieren`). */
export function bezeichnungenAlsListe(
  karte: ReadonlyMap<Kostengruppennummer, string>,
): Kostengruppenbezeichnung[] {
  return [...karte]
    .map(([nummer, bezeichnung]) => ({ nummer, bezeichnung }))
    .sort((a, b) => (a.nummer < b.nummer ? -1 : a.nummer > b.nummer ? 1 : 0));
}

/**
 * Übernimmt Druckprofile und Kostengruppenbezeichnungen aus dem Browserspeicher, wenn das Einstellungsprotokoll leer ist.
 * `werkzeug` lädt das Druckpaket nach (es soll nicht ins Hauptbündel); es wird nur gerufen, wenn Profile abgelegt sind.
 * Die Übernahme ist kein Schritt im Rückgängig der Einstellungen (der Nutzer hat sie nicht ausgelöst).
 */
export async function browserablageUebernehmen(
  s: EinstellungenSitzung,
  ablage: Leseablage | null,
  werkzeug: () => Promise<Werkzeug>,
): Promise<Ablageuebernahme> {
  const profileText = lesen(ablage, PROFILE_SCHLUESSEL);
  const csv = lesen(ablage, BEZEICHNUNGEN_SCHLUESSEL);
  if (profileText === null && csv === null) return NICHTS;
  const repo = s.umgebung.speicher.einstellungen;
  if (repo === undefined) return NICHTS;
  const p = await repo.protokoll();
  if (!p.ok || p.wert.length > 0) return NICHTS;

  let profile: readonly Druckprofil[] = [];
  if (profileText !== null) profile = ablageLesen(await werkzeug(), profileText).eigene;
  let druckprofile = 0;
  for (const druckprofil of profile) {
    const a = await s.befehl({ art: 'DruckprofilSetzen', druckprofil }, false);
    if (a.ok) druckprofile += 1;
  }
  let kostengruppenbezeichnungen = 0;
  const bezeichnungen = csv === null ? [] : bezeichnungenAlsListe(bezeichnungenLesen(csv).bezeichnungen);
  if (bezeichnungen.length > 0) {
    const a = await s.befehl({ art: 'KostengruppenbezeichnungenSetzen', bezeichnungen }, false);
    if (a.ok) kostengruppenbezeichnungen = bezeichnungen.length;
  }
  return { druckprofile, kostengruppenbezeichnungen };
}
