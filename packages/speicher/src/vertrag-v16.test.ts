// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.6: mechanisch angepasst, Folgeticket 106 (vertrag v1.6, Ticket 97). Bis Ticket 106 weist `speicher` Teile aus v1.6
// laut ab (`unbekannt`), statt sie still zu verwerfen (Q5); die Ablage der Modelldateien antwortet `unbekannt`. Ticket 106
// löscht diese Datei samt `vertrag-v16.ts`.

import type { Mangel, MangelId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';

const f = ladeFixture('typisch');
const P = f.projekt.id;

describe('vertrag v1.6 in speicher bis Ticket 106: laut abweisen', () => {
  it('die Repositories der neuen Aggregate antworten unbekannt', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    for (const e of [
      await s.bauzeitenplaene.auflisten(P),
      await s.honorarberechnungen.auflisten(P),
      await s.maengel.auflisten(P),
      await s.bautagebuch.auflisten(P),
    ])
      expect(!e.ok && e.fehler.code).toBe('unbekannt');
  });

  it('ein ChangeSet eines neuen Aggregats: unbekannt, nichts geschrieben (auch kein Protokolleintrag)', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f));
    const vorher = wert(kern.protokoll(P)).length;
    const mangel: Mangel = {
      id: 'mangel-1' as MangelId,
      projektId: P,
      nummer: 1,
      titel: 'Putzriss',
      beschreibung: null,
      ort: null,
      auftragsLvId: null,
      positionId: null,
      bauteil: null,
      festgestellt: '2026-11-20',
      frist: null,
      verlauf: [{ status: 'offen', datum: '2026-11-20', bemerkung: null }],
    };
    const e = await kern.anwenden(
      eintrag(901, P, { art: 'mangel', id: mangel.id }, { art: 'MangelAnlegen', mangel }),
      { art: 'mangel', mangelId: mangel.id, mangel: { vorher: null, nachher: mangel } },
    );
    expect(!e.ok && e.fehler.code).toBe('unbekannt');
    expect(wert(kern.protokoll(P))).toHaveLength(vorher);
  });
});
