// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Vitest (Ticket 116): die Hausstände v1 und v2 über `ifc` gelesen und das LV `typisch` nach der Übernahme mit v1
// im echten Speicher (In-Memory-SQLite).

import { bauwerksmodellLesen } from '@tethys/ifc';
import type { Bauwerksmodell, LvZustand, Projekt } from '@tethys/vertrag';
import { typischNachUebernahme } from '../../e2e/modellvergleich-inhalt';
import { hausBytes, kopfOhneSchema } from '../bim/testhilfen';
import { befehlswegFuer, lvSitzung, projektSitzung, type LvSitzung } from '../lv/befehlsweg';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';

function haus(name: 'haus-v1' | 'haus-v2'): Bauwerksmodell {
  const bytes = hausBytes(name);
  const r = bauwerksmodellLesen(bytes, kopfOhneSchema(bytes, name, `${name}.ifc`));
  if (r.bauwerksmodell === null) throw new Error(name);
  return r.bauwerksmodell;
}

export const V1 = haus('haus-v1');
export const V2 = haus('haus-v2');

/** Projekt mit dem LV `typisch` nach der Übernahme mit v1, als offene Sitzung. */
export async function typischImSpeicher(): Promise<{
  sitzung: LvSitzung;
  lv: LvZustand;
  weg: ReturnType<typeof befehlswegFuer>;
}> {
  const speicher = await speicherImSpeicher();
  const u = testUmgebung(speicher);
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Haus', 'Bauherr'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  const inhalt = typischNachUebernahme();
  const sitzung = lvSitzung(u, projekt.id, null);
  const a = await sitzung.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: projekt.id,
    inhalt,
  });
  if (!a.ok || a.zustand === null) throw new Error('LV');
  return { sitzung, lv: a.zustand, weg: befehlswegFuer(u) };
}
