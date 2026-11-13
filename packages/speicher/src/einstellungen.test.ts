// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen des Geräts im Speicher (v1.7a, Ticket 139; E15, D-73, D-127.8): ein Aggregat ohne Projekt, außerhalb der
// Undo-Historie jedes Projekts. `laden` liefert `LEERE_EINSTELLUNGEN`, solange nichts geschrieben ist; `anwenden` schreibt ein
// ChangeSet ganz oder gar nicht und weist einen abweichenden Vorherstand mit `konflikt` ab (Q5).

import { LEERE_EINSTELLUNGEN, type Einstellungen, type EinstellungenChangeSet } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { kernAufDb, neuerKern, speichere, wert } from './testhilfe/node';
import { DRUCKPROFIL, EINSTELLUNGEN } from './testhilfe/v17';

const aendern = (vorher: Einstellungen, nachher: Einstellungen): EinstellungenChangeSet => ({
  art: 'einstellungen',
  einstellungen: { vorher, nachher },
});

describe('Einstellungen (D-73, D-127.8)', () => {
  it('ohne Daten: LEERE_EINSTELLUNGEN; anwenden schreibt; Undo (getauschtes ChangeSet) stellt her; das Öffnen behält sie', async () => {
    const { kern, db } = await neuerKern();
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    const cs = aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN);
    wert(await kern.einstellungenAnwenden(cs));
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
    expect(wert(kernAufDb(db).einstellungenLaden())).toEqual(EINSTELLUNGEN);
    wert(await kern.einstellungenAnwenden(aendern(EINSTELLUNGEN, LEERE_EINSTELLUNGEN)));
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
  });

  it('abweichender Vorherstand: konflikt, nichts geschrieben (Q5)', async () => {
    const { kern } = await neuerKern();
    wert(await kern.einstellungenAnwenden(aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN)));
    const r = await kern.einstellungenAnwenden(
      aendern(LEERE_EINSTELLUNGEN, { ...EINSTELLUNGEN, buero: null }),
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
  });

  it('doppelte Profilnamen, doppelte oder ungeordnete Kostengruppen, ein ChangeSet anderer Art: unbekannt', async () => {
    const { kern } = await neuerKern();
    const [a, b] = EINSTELLUNGEN.kostengruppenbezeichnungen;
    if (a === undefined || b === undefined) throw new Error('zwei Bezeichnungen erwartet');
    for (const nachher of [
      { ...EINSTELLUNGEN, druckprofile: [DRUCKPROFIL, DRUCKPROFIL] },
      { ...EINSTELLUNGEN, kostengruppenbezeichnungen: [a, a] },
      { ...EINSTELLUNGEN, kostengruppenbezeichnungen: [b, a] },
    ])
      expect(await kern.einstellungenAnwenden(aendern(LEERE_EINSTELLUNGEN, nachher))).toMatchObject({
        ok: false,
        fehler: { code: 'unbekannt' },
      });
    const fremd = { art: 'projekt', einstellungen: { vorher: LEERE_EINSTELLUNGEN, nachher: EINSTELLUNGEN } };
    expect(await kern.einstellungenAnwenden(fremd as never)).toMatchObject({
      ok: false,
      fehler: { code: 'unbekannt' },
    });
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
  });

  it('gehören keinem Projekt: kein Eintrag im Protokoll eines Projekts; ein Projekt zu löschen lässt sie stehen', async () => {
    const f = ladeFixture('winzig');
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f).slice(0, 1));
    wert(await kern.einstellungenAnwenden(aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN)));
    expect(wert(kern.protokoll(f.projekt.id))).toHaveLength(1);
    wert(
      await kern.anwenden(
        eintrag(2, f.projekt.id, { art: 'projekt', id: f.projekt.id }, { art: 'ProjektLoeschen' }),
        { art: 'projekt', projektId: f.projekt.id, projekt: { vorher: f.projekt, nachher: null } },
      ),
    );
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
  });

  it('über die Speicher-Schnittstelle: speicher.einstellungen.laden und anwenden', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const repo = s.einstellungen;
    if (repo === undefined) throw new Error('Speicher.einstellungen fehlt');
    expect(wert(await repo.laden())).toEqual(LEERE_EINSTELLUNGEN);
    wert(await repo.anwenden(aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN)));
    expect(wert(await repo.laden())).toEqual(EINSTELLUNGEN);
  });
});
