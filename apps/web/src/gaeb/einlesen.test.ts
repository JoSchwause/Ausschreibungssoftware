// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB einlesen ohne offenes Projekt (E7, Weg für den ersten Start): Projekt und LV entstehen in einem Schritt über den
// Befehlsweg, ein Rückgängig nimmt beide zurück. Echte Kern- und Speicherpakete. Seams: `projektVorschlag`,
// `projektAusGaebAnlegen`.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer } from '../lv/befehlsweg';
import { appIdQuelle } from '../lv/ids';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { projektAusGaebAnlegen, projektVorschlag } from './einlesen';
import { lvLesen } from './gaeb';

const wurzel = new URL('../../../../', import.meta.url);
const datei = (pfad: string): Uint8Array => new Uint8Array(readFileSync(new URL(pfad, wurzel)));
const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';

describe('projektVorschlag', () => {
  it('Name aus dem LV; Bauherr leer, wenn die Datei keinen Auftraggeber mit Namen trägt', () => {
    const v = lvLesen(datei(`${AVA}.X81`), 'BVBS.X81', appIdQuelle());
    if (v.inhalt === null) throw new Error('Inhalt');
    const ohneAuftraggeber = { ...v.inhalt, auftraggeber: { ...v.inhalt.auftraggeber, name: null } };
    expect(projektVorschlag({ inhalt: ohneAuftraggeber } as never, 'BVBS.X81')).toEqual({
      name: 'BVBS GAEB AVA',
      bauherr: '',
    });
  });

  it('der Name des Auftraggebers ist der Vorschlag für den Bauherrn', () => {
    // `OWN/Address/Name1` der Prüfdatei.
    const v = lvLesen(datei(`${AVA}.X81`), 'BVBS.X81', appIdQuelle());
    expect(projektVorschlag(v, 'BVBS.X81')).toEqual({ name: 'BVBS GAEB AVA', bauherr: 'BVBS' });
  });

  it('ohne Namen im LV: der Dateiname ohne Endung', () => {
    const v = lvLesen(datei(`${AVA}.X81`), 'BVBS.X81', appIdQuelle());
    if (v.inhalt === null) throw new Error('Inhalt');
    const ohne = { ...v, inhalt: { ...v.inhalt, name: '  ' } };
    expect(projektVorschlag(ohne, 'Schule Nord.x83').name).toBe('Schule Nord');
  });
});

describe('projektAusGaebAnlegen', () => {
  it('legt Projekt und LV an, ein Undo-Schritt; Rückgängig nimmt beide zurück', async () => {
    const u = testUmgebung(await speicherImSpeicher());
    const weg = befehlswegFuer(u);
    const v = lvLesen(datei(`${AVA}.X81`), 'BVBS.X81', u.ids);
    if (v.inhalt === null) throw new Error('Inhalt');
    const tiefe = weg.historie.tiefe.rueck;

    const a = await projektAusGaebAnlegen(u, { name: 'Prüfdatei', bauherr: 'Kreis' }, v.inhalt);
    if (!a.ok) throw new Error('nicht angelegt');
    expect(a.projekt).toMatchObject({ name: 'Prüfdatei', bauherr: { name: 'Kreis', anschrift: null } });
    expect(a.lv.leistungsverzeichnis.projektId).toBe(a.projekt.id);
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    const lvs = await u.speicher.leistungsverzeichnisse.auflisten(a.projekt.id);
    expect(lvs.ok && lvs.wert.map((l) => l.name)).toEqual(['BVBS GAEB AVA']);

    expect((await weg.rueckgaengig()).ok).toBe(true);
    const projekte = await u.speicher.projekte.auflisten();
    expect(projekte.ok && projekte.wert).toEqual([]);
  });

  it('leere Angaben: Name und Bauherr werden getrimmt; ein leerer Name nimmt den des LV', async () => {
    const u = testUmgebung(await speicherImSpeicher());
    const v = lvLesen(datei(`${AVA}.X81`), 'BVBS.X81', u.ids);
    if (v.inhalt === null) throw new Error('Inhalt');
    const a = await projektAusGaebAnlegen(u, { name: '  ', bauherr: ' Kreis ' }, v.inhalt);
    expect(a.ok && a.projekt).toMatchObject({ name: 'BVBS GAEB AVA', bauherr: { name: 'Kreis' } });
  });
});
