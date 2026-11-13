// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen des Geräts im Speicher (v1.7a, Ticket 139; E15, D-73, D-127.8, D-82 M1): ein Aggregat ohne Projekt, außerhalb
// der Undo-Historie jedes Projekts, mit eigenem Protokoll. `laden` liefert `LEERE_EINSTELLUNGEN`, solange nichts geschrieben ist;
// `anwenden` schreibt Eintrag und ChangeSet ganz oder gar nicht und weist einen abweichenden Vorherstand mit `konflikt` ab (Q5).

import {
  LEERE_EINSTELLUNGEN,
  type Einstellungen,
  type EinstellungenBefehl,
  type EinstellungenChangeSet,
  type EinstellungenProtokolleintrag,
  type HistorienBefehl,
  type ProtokollId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, eintrag, ladeFixture, NUTZER, ZEIT } from './testhilfe/fixtures';
import { kernAufDb, neuerKern, speichere, wert } from './testhilfe/node';
import { DRUCKPROFIL, EINSTELLUNGEN } from './testhilfe/v17';

const aendern = (vorher: Einstellungen, nachher: Einstellungen): EinstellungenChangeSet => ({
  art: 'einstellungen',
  einstellungen: { vorher, nachher },
});

let nr = 0;
const eintragE = (befehl: EinstellungenBefehl | HistorienBefehl): EinstellungenProtokolleintrag => {
  nr += 1;
  return { id: `einstellung-${String(nr)}` as ProtokollId, wer: NUTZER, wann: ZEIT, befehl };
};
const SETZEN: EinstellungenBefehl = { art: 'BueroSetzen', buero: EINSTELLUNGEN.buero };

/** Schreibt Eintrag und ChangeSet und liefert den Eintrag. */
async function schreibe(
  kern: SpeicherKern,
  befehl: EinstellungenBefehl | HistorienBefehl,
  cs: EinstellungenChangeSet,
): Promise<EinstellungenProtokolleintrag> {
  const e = eintragE(befehl);
  wert(await kern.einstellungenAnwenden(e, cs));
  return e;
}

describe('Einstellungen (D-73, D-127.8)', () => {
  it('ohne Daten: LEERE_EINSTELLUNGEN; anwenden schreibt; das Öffnen behält sie', async () => {
    const { kern, db } = await neuerKern();
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    await schreibe(kern, SETZEN, aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN));
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
    expect(wert(kernAufDb(db).einstellungenLaden())).toEqual(EINSTELLUNGEN);
  });

  it('abweichender Vorherstand: konflikt, weder Einstellungen noch Eintrag geschrieben (Q5)', async () => {
    const { kern } = await neuerKern();
    await schreibe(kern, SETZEN, aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN));
    const r = await kern.einstellungenAnwenden(
      eintragE(SETZEN),
      aendern(LEERE_EINSTELLUNGEN, { ...EINSTELLUNGEN, buero: null }),
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
    expect(wert(kern.einstellungenProtokoll())).toHaveLength(1);
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
      expect(
        await kern.einstellungenAnwenden(eintragE(SETZEN), aendern(LEERE_EINSTELLUNGEN, nachher)),
      ).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    const fremd = { art: 'projekt', einstellungen: { vorher: LEERE_EINSTELLUNGEN, nachher: EINSTELLUNGEN } };
    expect(await kern.einstellungenAnwenden(eintragE(SETZEN), fremd as never)).toMatchObject({
      ok: false,
      fehler: { code: 'unbekannt' },
    });
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    expect(wert(kern.einstellungenProtokoll())).toEqual([]);
  });

  it('gehören keinem Projekt: kein Eintrag im Protokoll eines Projekts; ein Projekt zu löschen lässt sie stehen', async () => {
    const f = ladeFixture('winzig');
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f).slice(0, 1));
    await schreibe(kern, SETZEN, aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN));
    expect(wert(kern.protokoll(f.projekt.id))).toHaveLength(1);
    wert(
      await kern.anwenden(
        eintrag(2, f.projekt.id, { art: 'projekt', id: f.projekt.id }, { art: 'ProjektLoeschen' }),
        { art: 'projekt', projektId: f.projekt.id, projekt: { vorher: f.projekt, nachher: null } },
      ),
    );
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
    expect(wert(kern.einstellungenProtokoll())).toHaveLength(1);
  });
});

describe('Einstellungsprotokoll (D-82 M1)', () => {
  it('je Befehl genau ein Eintrag, in der Reihenfolge des Schreibens; Rückgängig und Wiederholen mit Verweis auf das Original', async () => {
    const { kern } = await neuerKern();
    const cs = aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN);
    const original = await schreibe(kern, SETZEN, cs);
    const zurueck = await schreibe(
      kern,
      { art: 'Rueckgaengig', protokollId: original.id },
      aendern(EINSTELLUNGEN, LEERE_EINSTELLUNGEN),
    );
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    const wieder = await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs);
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
    expect(wert(kern.einstellungenProtokoll())).toEqual([original, zurueck, wieder]);
  });

  it('ein Wiederholen ohne ursprünglichen Eintrag oder mit Verweis auf ein Rückgängig: konflikt, nichts geschrieben', async () => {
    const { kern } = await neuerKern();
    const original = await schreibe(kern, SETZEN, aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN));
    const zurueck = await schreibe(
      kern,
      { art: 'Rueckgaengig', protokollId: original.id },
      aendern(EINSTELLUNGEN, LEERE_EINSTELLUNGEN),
    );
    for (const protokollId of ['gibt-es-nicht' as ProtokollId, zurueck.id])
      expect(
        await kern.einstellungenAnwenden(
          eintragE({ art: 'Wiederholen', protokollId }),
          aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN),
        ),
      ).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    expect(wert(kern.einstellungenProtokoll())).toHaveLength(2);
  });

  it('über die Speicher-Schnittstelle: speicher.einstellungen.laden, anwenden und protokoll', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const repo = s.einstellungen;
    if (repo === undefined) throw new Error('Speicher.einstellungen fehlt');
    expect(wert(await repo.laden())).toEqual(LEERE_EINSTELLUNGEN);
    expect(wert(await repo.protokoll())).toEqual([]);
    const e = eintragE(SETZEN);
    wert(await repo.anwenden(e, aendern(LEERE_EINSTELLUNGEN, EINSTELLUNGEN)));
    expect(wert(await repo.laden())).toEqual(EINSTELLUNGEN);
    expect(wert(await repo.protokoll())).toEqual([e]);
  });
});
