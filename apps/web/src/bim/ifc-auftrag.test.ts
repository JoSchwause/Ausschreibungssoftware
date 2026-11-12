// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { IfcBearbeiter } from './ifc-auftrag';
import { hausBytes, kopfOhneSchema } from './testhilfen';

// Außenwand Süd EG aus haus-v1 (Ticket 107: Pset_WallCommon).
const WAND = '1l3nLN5cFF3QXQ8i5cD4LA';

describe('Aufträge des IFC-Workers', () => {
  it('lesen bildet das Modell ab', () => {
    const bytes = hausBytes();
    const a = new IfcBearbeiter().bearbeite({ nr: 1, art: 'lesen', bytes, kopf: kopfOhneSchema(bytes) });
    expect(a.art).toBe('gelesen');
    if (a.art !== 'gelesen') return;
    expect(a.nr).toBe(1);
    expect(a.lesung.bauwerksmodell?.bauteile).toHaveLength(30);
  });

  it('Eigenschaften erst nach dem Index; danach je GlobalId, fremde und kaputte GlobalIds ergeben null', () => {
    const b = new IfcBearbeiter();
    expect(b.bearbeite({ nr: 1, art: 'eigenschaften', globalId: WAND })).toEqual({
      nr: 1,
      art: 'fehler',
      meldung: 'kein Index',
    });
    expect(b.bearbeite({ nr: 2, art: 'index', bytes: hausBytes() })).toEqual({ nr: 2, art: 'index' });
    const e = b.bearbeite({ nr: 3, art: 'eigenschaften', globalId: WAND });
    if (e.art !== 'eigenschaften' || e.wert === null) throw new Error('keine Eigenschaften');
    expect(e.wert.eigenschaften.some((x) => x.satz === 'Pset_WallCommon' && x.name === 'IsExternal')).toBe(true);
    const fremd = b.bearbeite({ nr: 4, art: 'eigenschaften', globalId: 'x'.repeat(22) });
    expect(fremd).toEqual({ nr: 4, art: 'eigenschaften', wert: null });
    expect(b.bearbeite({ nr: 5, art: 'eigenschaften', globalId: 'kaputt' })).toEqual({
      nr: 5,
      art: 'eigenschaften',
      wert: null,
    });
  });

  it('keine IFC-Datei: der Index meldet den Befund als Fehler', () => {
    const a = new IfcBearbeiter().bearbeite({ nr: 1, art: 'index', bytes: new TextEncoder().encode('nein') });
    expect(a.art).toBe('fehler');
  });
});
