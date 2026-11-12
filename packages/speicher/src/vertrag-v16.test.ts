// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.6: mechanisch angepasst, Folgeticket 106 (vertrag v1.6, Ticket 97). Bis Ticket 106 weist `speicher` Teile aus v1.6
// laut ab (`unbekannt`), statt sie still zu verwerfen (Q5); die Ablage der Modelldateien antwortet `unbekannt`. Ticket 106
// löscht diese Datei samt `vertrag-v16.ts`.

import type { Bauteilzuordnung, IfcGlobalId, Knoten, Position } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { feldAendern } from './testhilfe/umkehrung';

const f = ladeFixture('typisch');
const lv = f.lv.leistungsverzeichnis;
const P = f.projekt.id;
const erste = lv.knoten.find((k): k is Position => k.art === 'position') as Position;
const ZUORDNUNG: Bauteilzuordnung = {
  globalId: '1Wand$Aussen_EG_000001' as IfcGlobalId,
  mengenart: 'NetVolume',
};

describe('vertrag v1.6 in speicher bis Ticket 106: laut abweisen', () => {
  it('eine Position mit Bauteilzuordnungen: unbekannt, nichts geschrieben', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f));
    const nachher: Knoten = { ...erste, bauteile: [ZUORDNUNG] };
    const cs = feldAendern(f.lv, erste.id, nachher, '0.00');
    const e = await kern.anwenden(
      eintrag(
        900,
        P,
        { art: 'leistungsverzeichnis', id: lv.id },
        {
          art: 'BauteileZuordnen',
          positionId: erste.id,
          bauteile: [ZUORDNUNG],
        },
      ),
      cs,
    );
    expect(!e.ok && e.fehler.code).toBe('unbekannt');
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
  });

  it('die Ablage der Modelldateien antwortet unbekannt', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const bytes = new TextEncoder().encode('ISO-10303-21;');
    for (const e of [await s.modelldateien.ablegen(bytes), await s.modelldateien.vorhanden('0'.repeat(64))])
      expect(!e.ok && e.fehler.code).toBe('unbekannt');
  });
});
