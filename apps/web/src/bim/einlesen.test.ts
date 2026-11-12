// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 114: Einlesen eines Modells durch `ifc`, Ablage, `bim` und echten Speicher (In-Memory-SQLite), Umbenennen, Löschen,
// Rückgängig und Wiederholen über den Befehlsweg. `lesen` ist hier `bauwerksmodellLesen` direkt (in der App im Worker).

import { bauwerksmodellLesen } from '@tethys/ifc';
import type { BauwerksmodellId, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer, projektSitzung } from '../lv/befehlsweg';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { GROSSE_DATEI, groessenbefund, modellEinlesen, namensvorschlag, tagDesEinlesens } from './einlesen';
import { bauwerksmodellSitzung, bauwerksmodellLaden } from './schreiben';
import { hausBytes } from './testhilfen';

const lesen = (bytes: Uint8Array, kopf: Parameters<typeof bauwerksmodellLesen>[1]) =>
  Promise.resolve(bauwerksmodellLesen(bytes, kopf));

async function aufbau() {
  const speicher = await speicherImSpeicher();
  const u = testUmgebung(speicher);
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Haus', 'Bauherr'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  return { speicher, u, projekt, weg: befehlswegFuer(u) };
}

describe('Angaben am Rand', () => {
  it('Name aus dem Dateinamen ohne Endung, Tag des Einlesens aus der Uhr (Ortszeit)', () => {
    expect(namensvorschlag('haus-v1.ifc')).toBe('haus-v1');
    expect(namensvorschlag('Modell.IFC')).toBe('Modell');
    expect(namensvorschlag('.ifc')).toBe('.ifc');
    const t = new Date(2026, 10, 12, 23, 30);
    expect(tagDesEinlesens(t.toISOString())).toBe('2026-11-12');
  });

  it('eine Datei über etwa 200 MB ist ein Befund (Warnung), keine Sperre', () => {
    expect(groessenbefund(GROSSE_DATEI)).toBeNull();
    expect(groessenbefund(GROSSE_DATEI + 1)).toMatchObject({ schwere: 'warnung', code: 'datei-gross' });
  });
});

describe('Modell einlesen', () => {
  it('haus-v1: Bytes abgelegt, Modell angelegt (ein Undo-Schritt); Rückgängig und Wiederholen', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const bytes = hausBytes();
    const vorher = weg.historie.tiefe.rueck;
    const e = await modellEinlesen(u, projekt.id, { name: 'haus-v1.ifc', bytes }, { lesen, vorgaengerId: null });
    expect(e.art).toBe('angelegt');
    if (e.art !== 'angelegt') return;
    expect(e.befunde).toEqual([]);
    expect(weg.historie.tiefe).toEqual({ rueck: vorher + 1, vor: 0 });

    const liste = await speicher.bauwerksmodelle.auflisten(projekt.id);
    expect(liste.ok && liste.wert.map((m) => [m.name, m.anzahlBauteile, m.schema, m.eingelesen])).toEqual([
      ['haus-v1', 30, 'IFC4', '2026-11-10'],
    ]);
    const z = await bauwerksmodellLaden(speicher, e.id);
    expect(z?.bauwerksmodell.datei).toMatchObject({ dateiname: 'haus-v1.ifc', groesse: bytes.length });
    expect(z?.bauwerksmodell.datei.hash).toBe(
      'b4e795a11166357ab4a596adb502c161cabde44810df5f44e385db8866080181',
    );
    const geladen = await speicher.modelldateien.laden(z?.bauwerksmodell.datei.hash ?? '');
    expect(geladen.ok && geladen.wert).toEqual(bytes);

    expect((await weg.rueckgaengig()).ok).toBe(true);
    const leer = await speicher.bauwerksmodelle.auflisten(projekt.id);
    expect(leer.ok && leer.wert).toEqual([]);
    expect((await weg.wiederholen()).ok).toBe(true);
    const wieder = await speicher.bauwerksmodelle.auflisten(projekt.id);
    expect(wieder.ok && wieder.wert.length).toBe(1);
  });

  it('neuer Stand nennt den Vorgänger', async () => {
    const { speicher, u, projekt } = await aufbau();
    const v1 = await modellEinlesen(u, projekt.id, { name: 'haus-v1.ifc', bytes: hausBytes() }, {
      lesen,
      vorgaengerId: null,
    });
    if (v1.art !== 'angelegt') throw new Error('v1');
    const v2 = await modellEinlesen(u, projekt.id, { name: 'haus-v2.ifc', bytes: hausBytes('haus-v2') }, {
      lesen,
      vorgaengerId: v1.id,
    });
    if (v2.art !== 'angelegt') throw new Error('v2');
    expect((await bauwerksmodellLaden(speicher, v2.id))?.bauwerksmodell.vorgaengerId).toBe(v1.id);
  });

  it('keine IFC-Datei: Befund, nichts abgelegt, nichts geschrieben', async () => {
    const { u, projekt, weg } = await aufbau();
    const tiefe = weg.historie.tiefe;
    const bytes = new TextEncoder().encode('kein IFC');
    const e = await modellEinlesen(u, projekt.id, { name: 'x.ifc', bytes }, { lesen, vorgaengerId: null });
    expect(e.art).toBe('nicht-lesbar');
    expect(e.befunde.map((b) => b.code)).toEqual(['keine-ifc-datei']);
    expect(weg.historie.tiefe).toEqual(tiefe);
  });
});

describe('Umbenennen und Löschen', () => {
  it('umbenennen und löschen sind je ein Undo-Schritt; Rückgängig des Löschens findet die Bytes', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const e = await modellEinlesen(u, projekt.id, { name: 'haus-v1.ifc', bytes: hausBytes() }, {
      lesen,
      vorgaengerId: null,
    });
    if (e.art !== 'angelegt') throw new Error('einlesen');
    const id: BauwerksmodellId = e.id;
    const z = await bauwerksmodellLaden(speicher, id);
    const s = bauwerksmodellSitzung(u, projekt.id, z);
    expect((await s.befehl({ art: 'BauwerksmodellUmbenennen', name: 'Haus Planung' })).ok).toBe(true);
    expect((await s.befehl({ art: 'BauwerksmodellLoeschen' })).ok).toBe(true);
    expect(await bauwerksmodellLaden(speicher, id)).toBeNull();
    await weg.rueckgaengig();
    expect((await bauwerksmodellLaden(speicher, id))?.bauwerksmodell.name).toBe('Haus Planung');
    await weg.rueckgaengig();
    expect((await bauwerksmodellLaden(speicher, id))?.bauwerksmodell.name).toBe('haus-v1');
  });
});
