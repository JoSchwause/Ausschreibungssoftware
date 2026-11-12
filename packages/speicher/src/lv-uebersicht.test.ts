// SPDX-License-Identifier: AGPL-3.0-or-later
// `LvUebersicht.nettoNachNachlass` (`vertrag` v1.5 Punkt 5, D-92.4, Name nach D-95.5, D-62; Ticket 106 Punkt 4): das gespeicherte
// Netto nach Nachlass, aus den gespeicherten Summen, nie nachgerechnet; nach Setzen und nach Undo gleich dem gespeicherten
// Summenstand (Test wie D-43).

import type { Betrag, LvChangeSet } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { kopfAendern, umkehren } from './testhilfe/umkehrung';

const f = ladeFixture('typisch');
const lv = f.lv.leistungsverzeichnis;
const P = f.projekt.id;

describe('LvUebersicht.nettoNachNachlass', () => {
  it('ist das gespeicherte Netto nach Nachlass, nicht das Netto vor Nachlass; nach Setzen und Undo wie die Summen', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f));
    const s = speicherUeberTransport(direktTransport(kern), null);
    const uebersicht = async () =>
      wert(await s.leistungsverzeichnisse.auflisten(P)).find((u) => u.id === lv.id);
    const gespeichert = () => wert(kern.lvLaden(lv.id)).summen.gesamt.nettoNachNachlass;

    expect((await uebersicht())?.nettoNachNachlass).toBe(f.lv.summen.gesamt.nettoNachNachlass);

    // Nachlass setzen: Netto bleibt, Netto nach Nachlass ändert sich (Speicherbeispiel, `speicher` rechnet nicht).
    const roh = kopfAendern(
      f.lv,
      { nachlass: { art: 'betrag', wert: '10.00' as Betrag } },
      f.lv.summen.gesamt.netto,
    );
    const setzen: LvChangeSet = {
      ...roh,
      summen: {
        ...roh.summen,
        gesamt: { ...f.lv.summen.gesamt, nachlass: '10.00' as Betrag, nettoNachNachlass: '1.23' as Betrag },
      },
    };
    const befehl = { art: 'NachlassSetzen', nachlass: { art: 'betrag', wert: '10.00' } } as never;
    wert(await kern.anwenden(eintrag(901, P, { art: 'leistungsverzeichnis', id: lv.id }, befehl), setzen));
    expect(gespeichert()).toBe('1.23');
    expect((await uebersicht())?.nettoNachNachlass).toBe('1.23');
    expect((await uebersicht())?.nettoNachNachlass).not.toBe(wert(kern.lvLaden(lv.id)).summen.gesamt.netto);

    const rueck = {
      art: 'Rueckgaengig',
      protokollId: eintrag(901, P, { art: 'projekt', id: P }, befehl).id,
    } as const;
    wert(
      await kern.anwenden(
        eintrag(902, P, { art: 'leistungsverzeichnis', id: lv.id }, rueck),
        umkehren(setzen),
      ),
    );
    expect((await uebersicht())?.nettoNachNachlass).toBe(gespeichert());
    expect(gespeichert()).toBe(f.lv.summen.gesamt.nettoNachNachlass);
  });

  it('ein LV ohne Nachlass trägt sein Netto; ein Projekt ohne LV liefert eine leere Liste', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f).slice(0, 2));
    expect(wert(kern.lvAuflisten(P))).toEqual([
      { id: lv.id, name: lv.name, nettoNachNachlass: f.lv.summen.gesamt.nettoNachNachlass },
    ]);
  });
});
