// SPDX-License-Identifier: AGPL-3.0-or-later
// Projekt samt Inhalt löschen in der App (E8, D-96): Anzahl je Art aus dem Bestand, ein Undo-Schritt durch Kern und Speicher,
// Rückgängig stellt alles her, Wiederholen löscht wieder (D-104); Ziel nach Undo/Redo wie beim Löschen des Projekts allein.

import type { Projekt, ProtokollId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { zielNach } from '../historie/arten';
import { Befehlsweg } from '../lv/befehlsweg';
import { ozMaskeLesen } from '../lv/ozmaske';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { lvAnlegenBefehl, projektAnlegenBefehl } from './befehle';
import { anzahlJeArt, projektinhaltLesen, projektSamtInhaltLoeschen } from './samtInhalt';

const maske = (() => {
  const r = ozMaskeLesen('NN.NNNN');
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
})();

async function aufbau(): Promise<{ weg: Befehlsweg; projekt: Projekt }> {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = new Befehlsweg(u);
  const p = await weg.projekt(null).befehl(projektAnlegenBefehl(u.ids, 'Kita', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  for (const name of ['Rohbau', 'Dach'])
    await weg.lv(p.zustand.id, null).befehl(lvAnlegenBefehl(u.ids, p.zustand.id, name, maske));
  return { weg, projekt: p.zustand };
}

describe('Projekt samt Inhalt löschen', () => {
  it('zählt je Art nur, was es gibt; das Protokoll zählt nicht', async () => {
    const { weg, projekt } = await aufbau();
    const r = await projektinhaltLesen(weg.umgebung.speicher, projekt.id);
    if (!r.ok) throw new Error(r.fehler.meldung);
    expect(r.wert.projekt).toEqual(projekt);
    expect(r.wert.bestand.protokoll.length).toBe(3);
    expect(anzahlJeArt(r.wert.bestand)).toEqual([{ art: 'leistungsverzeichnisse', anzahl: 2 }]);
    expect(
      anzahlJeArt({
        leistungsverzeichnisse: [],
        angebote: [],
        auftragsLeistungsverzeichnisse: [],
        protokoll: [],
      }),
    ).toEqual([]);
  });

  it('löscht als ein Undo-Schritt; Rückgängig stellt die Projektdatei her, Wiederholen löscht wieder', async () => {
    const { weg, projekt } = await aufbau();
    const s = weg.umgebung.speicher;
    const vorher = await s.projektdateiExportieren(projekt.id);
    if (!vorher.ok) throw new Error('Export');
    const tiefe = weg.historie.tiefe.rueck;

    const a = await projektSamtInhaltLoeschen(weg, projekt.id);
    expect(a.ok).toBe(true);
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    expect((await s.projekte.laden(projekt.id)).ok).toBe(false);
    const teil = weg.historie.naechsterRueckgaengig()?.at(-1);
    if (teil === undefined) throw new Error('kein Teil');
    const projektPfad = `/projekt/${projekt.id}`;
    // Undo auf der Liste: das Projekt erscheint dort, also bleiben; Redo von der Projektseite: zurück zur Liste.
    expect(zielNach(teil, true, '/')).toBeNull();
    expect(zielNach(teil, false, projektPfad)).toBe('/');

    const undo = await weg.rueckgaengig();
    expect(undo.ok).toBe(true);
    const nachher = await s.projektdateiExportieren(projekt.id);
    if (!nachher.ok) throw new Error('Export nach Undo');
    const d = JSON.parse(nachher.wert) as {
      protokoll: { befehl: { art: string; protokollId?: ProtokollId } }[];
    };
    expect(d.protokoll.at(-1)?.befehl).toEqual({ art: 'Rueckgaengig', protokollId: teil.protokollId });
    expect(JSON.stringify({ ...d, protokoll: d.protokoll.slice(0, -1) })).toBe(
      JSON.stringify(JSON.parse(vorher.wert)),
    );

    const redo = await weg.wiederholen();
    expect(redo.ok).toBe(true);
    expect((await s.projekte.laden(projekt.id)).ok).toBe(false);
    expect(weg.historie.kannRueckgaengig).toBe(true);
  });

  it('ein Projekt, das es nicht gibt: abgewiesen, kein Undo-Schritt', async () => {
    const { weg } = await aufbau();
    const tiefe = weg.historie.tiefe.rueck;
    const a = await projektSamtInhaltLoeschen(weg, 'gibt-es-nicht' as Projekt['id']);
    expect(a.ok).toBe(false);
    expect(weg.historie.tiefe.rueck).toBe(tiefe);
  });
});
