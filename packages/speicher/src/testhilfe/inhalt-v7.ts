// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Inhalt der eingefrorenen Projektdatei der Schemaversion 7 (`fixtures/projektdatei-v7.json`), selbst verfasst
// (C4). Er beginnt mit dem Inhalt der Version 6 (`inhalt-v6.ts`) und bringt alles, was Version 7 (`vertrag` v1.7a, Ticket 139)
// neu speichert:
//  - Projektangaben; Bieterangaben an einem Bieter; ein neuer Bieter mit Angaben, danach umbenannt;
//  - Preisspiegel-Einstellungen und Kalkulationsangaben an einer Position des LV der Version 2;
//  - einen umbenannten LV-Stand und einen neuen Stand (mit Kalkulation und Preisspiegel eingefroren), gelöscht und per Undo an
//    seinen Platz zurückgelegt;
//  - die Einstellungen des Geräts (Büro, zwei Druckprofile, zwei Kostengruppenbezeichnungen) als Block der Datei.
// Die neuen Schritte tragen eigene Zeitpunkte nach denen der Version 6. Die Werte sind Speicherbeispiele (`speicher` rechnet
// nicht); Namen und Firmen erfunden.

import {
  LEERE_EINSTELLUNGEN,
  type Befehl,
  type Bieter,
  type BieterId,
  type ChangeSet,
  type LvChangeSet,
  type LvStand,
  type LvStandId,
  type LvZustand,
  type Position,
  type PositionId,
  type Projekt,
  type Protokolleintrag,
  type ProtokollId,
  type Zeitstempel,
} from '@tethys/vertrag';
import type { SpeicherKern } from '../kern';
import { LEERES_SUMMENVORHER } from '../summenvorher';
import { eintrag, NUTZER, type Schritt } from './fixtures';
import { V2_LV, V2_PROJEKT } from './inhalt-v2';
import { V4_STAND } from './inhalt-v4';
import { schritteV6 } from './inhalt-v6';
import { wert } from './node';
import { feldAendern, kopfAendern, standAnlegen, umkehren } from './umkehrung';
import { BIETERANGABEN, EINSTELLUNGEN, KALKULATION, PREISSPIEGEL, PROJEKTANGABEN } from './v17';

const id = (n: number): string => `019b7700-0000-7000-8000-${String(n).padStart(12, '0')}`;
const pid = (n: number): PositionId => id(100 + n) as PositionId;

export const V7_BIETER = 'bieter-3' as BieterId;
export const V7_STAND = id(701) as LvStandId;
/** Zeitpunkte der neuen Schritte, nach allen der Version 6 (die tragen `ZEIT`). */
const um = (n: number): Zeitstempel => `2026-11-13T09:${String(n).padStart(2, '0')}:00.000Z` as Zeitstempel;

export async function schritteV7(kern: SpeicherKern): Promise<Schritt[]> {
  const schritte = await schritteV6(kern);
  let minute = 0;
  const schreibe = async (
    aggregat: Protokolleintrag['aggregat'],
    befehl: Befehl,
    changeSet: ChangeSet,
  ): Promise<Schritt> => {
    minute += 1;
    const s: Schritt = {
      eintrag: { ...eintrag(schritte.length + 1, V2_PROJEKT, aggregat, befehl), wann: um(minute) },
      changeSet,
    };
    wert(await kern.anwenden(s.eintrag, s.changeSet));
    schritte.push(s);
    return s;
  };
  const amProjekt = { art: 'projekt', id: V2_PROJEKT } as const;
  const amLv = { art: 'leistungsverzeichnis', id: V2_LV } as const;
  const projekt = (): Projekt => wert(kern.projektLaden(V2_PROJEKT));
  const lv = (): LvZustand => wert(kern.lvLaden(V2_LV));
  const projektAendern = (nachher: Projekt): ChangeSet => ({
    art: 'projekt',
    projektId: V2_PROJEKT,
    projekt: { vorher: projekt(), nachher },
  });
  const keineSummen = { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER };

  // Projekt- und Bieterangaben (E10).
  const p = projekt();
  await schreibe(
    amProjekt,
    { art: 'ProjektangabenSetzen', name: p.name, bauherr: p.bauherr, angaben: PROJEKTANGABEN },
    projektAendern({ ...p, angaben: PROJEKTANGABEN }),
  );
  const [b1, ...rest] = projekt().bieter;
  if (b1 === undefined) throw new Error('Bieter fehlt');
  await schreibe(
    amProjekt,
    { art: 'BieterangabenSetzen', bieterId: b1.id, angaben: BIETERANGABEN },
    projektAendern({ ...projekt(), bieter: [{ ...b1, angaben: BIETERANGABEN }, ...rest] }),
  );
  const neu: Bieter = {
    id: V7_BIETER,
    name: 'Neubau KG (erfunden)',
    angaben: { anschrift: null, ansprechperson: null, email: 'kontakt@example.org', telefon: '0123 99' },
  };
  await schreibe(
    amProjekt,
    { art: 'BieterAnlegen', bieter: neu },
    projektAendern({ ...projekt(), bieter: [...projekt().bieter, neu] }),
  );
  await schreibe(
    amProjekt,
    { art: 'BieterUmbenennen', bieterId: V7_BIETER, name: 'Neubau GmbH & Co. KG (erfunden)' },
    projektAendern({
      ...projekt(),
      bieter: projekt().bieter.map((b) =>
        b.id === V7_BIETER ? { ...b, name: 'Neubau GmbH & Co. KG (erfunden)' } : b,
      ),
    }),
  );

  // Preisspiegel-Einstellungen am LV (nur Kopf, keine Summen) und Kalkulation an einer Position (E9, E15).
  await schreibe(
    amLv,
    { art: 'PreisspiegelEinstellungenSetzen', einstellungen: PREISSPIEGEL },
    {
      ...kopfAendern(lv(), { preisspiegel: PREISSPIEGEL }, '0.00'),
      summen: keineSummen,
    },
  );
  const position = lv().leistungsverzeichnis.knoten.find((k): k is Position => k.id === pid(4));
  if (position === undefined) throw new Error('Position fehlt');
  await schreibe(
    amLv,
    {
      art: 'KalkulationSetzen',
      positionId: position.id,
      kalkulation: KALKULATION,
      einheitspreis: position.einheitspreis,
      epa: position.epa,
    },
    {
      ...feldAendern(lv(), position.id, { ...position, kalkulation: KALKULATION }, '0.00'),
      summen: keineSummen,
    },
  );

  // LV-Stände (E8): einen umbenennen; einen neuen anlegen, löschen und per Undo zurücklegen.
  const kopf = (s: LvStand) => ({ id: s.id, leistungsverzeichnisId: s.leistungsverzeichnisId, name: s.name });
  const rahmen = (): Omit<LvChangeSet, 'lvStand' | 'lvStandInhalt'> => ({
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: V2_LV,
    kopf: null,
    knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
    summen: keineSummen,
  });
  const alt = wert(kern.lvStandLaden(V4_STAND as LvStandId));
  const neuerName = `${alt.name} (umbenannt)`;
  await schreibe(
    amLv,
    { art: 'LvStandUmbenennen', lvStandId: alt.id, name: neuerName },
    { ...rahmen(), lvStand: { vorher: kopf(alt), nachher: { ...kopf(alt), name: neuerName } } },
  );
  await schreibe(
    amLv,
    { art: 'LvStandAnlegen', id: V7_STAND, name: 'Mit Kalkulation' },
    standAnlegen(lv(), V7_STAND, 'Mit Kalkulation'),
  );
  const stand = wert(kern.lvStandLaden(V7_STAND));
  const loeschen: LvChangeSet = {
    ...rahmen(),
    lvStand: { vorher: kopf(stand), nachher: null },
    lvStandInhalt: { vorher: { angelegt: stand.angelegt, zustand: stand.zustand }, nachher: null },
  };
  const geloescht = await schreibe(amLv, { art: 'LvStandLoeschen', lvStandId: V7_STAND }, loeschen);
  await schreibe(amLv, { art: 'Rueckgaengig', protokollId: geloescht.eintrag.id }, umkehren(loeschen));

  // Die Einstellungen des Geräts: kein Befehl eines Projekts, sondern im Einstellungsprotokoll (D-82 M1); die Datei trägt nur
  // ihren Stand.
  wert(
    await kern.einstellungenAnwenden(
      {
        id: 'einstellungen-000001' as ProtokollId,
        wer: NUTZER,
        wann: um((minute += 1)),
        befehl: {
          art: 'KostengruppenbezeichnungenSetzen',
          bezeichnungen: EINSTELLUNGEN.kostengruppenbezeichnungen,
        },
      },
      {
        art: 'einstellungen',
        einstellungen: { vorher: LEERE_EINSTELLUNGEN, nachher: EINSTELLUNGEN },
      },
    ),
  );
  return schritte;
}
