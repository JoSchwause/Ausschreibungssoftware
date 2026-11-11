// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektliste für die App (Ticket 38, Punkt 6; gebraucht von Ticket 39): `projekte.auflisten()` nach Name sortiert
// (de-DE, `Intl.Collator`), gelöschte Projekte fehlen, ein neues Projekt erscheint sofort; die LVs eines Projekts
// über `leistungsverzeichnisse.auflisten(projektId)`.

import type { LeistungsverzeichnisId, Projekt, ProjektId, Protokolleintrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import {
  anlegenSchritte,
  eintrag,
  ladeFixture,
  lvAnlegenChangeSet,
  projektChangeSet,
} from './testhilfe/fixtures';
import { neuerKern, wert } from './testhilfe/node';
import type { SpeicherKern } from './kern';

let nr = 900;
const projekt = (id: string, name: string): Projekt => ({
  id: id as ProjektId,
  name,
  bauherr: { name: 'Bauherr (erfunden)', anschrift: null },
  bieter: [],
});
const anlegen = async (kern: SpeicherKern, p: Projekt): Promise<void> => {
  const e: Protokolleintrag = eintrag(
    nr++,
    p.id,
    { art: 'projekt', id: p.id },
    { art: 'ProjektAnlegen', id: p.id, name: p.name, bauherr: p.bauherr },
  );
  wert(await kern.anwenden(e, projektChangeSet(p)));
};
const loeschen = async (kern: SpeicherKern, p: Projekt): Promise<void> => {
  const e = eintrag(nr++, p.id, { art: 'projekt', id: p.id }, { art: 'ProjektLoeschen' });
  wert(await kern.anwenden(e, { art: 'projekt', projektId: p.id, projekt: { vorher: p, nachher: null } }));
};
const namen = (kern: SpeicherKern): string[] => wert(kern.projekteAuflisten()).map((p) => p.name);

describe('Projektliste', () => {
  it('ist nach Name sortiert, deutsch verglichen (Umlaute bei ihrem Grundbuchstaben, Groß/klein nachrangig)', async () => {
    const { kern } = await neuerKern();
    // Kennungen absichtlich gegenläufig zum Namen: Die Sortierung folgt dem Namen, nicht der Kennung.
    const liste = ['zebra', 'Öl', 'Bad', 'Ofen', 'Ärztehaus', 'Zahn', 'Anbau'];
    for (const [i, n] of liste.entries()) await anlegen(kern, projekt(`p-${String(liste.length - i)}`, n));
    expect(namen(kern)).toEqual(['Anbau', 'Ärztehaus', 'Bad', 'Ofen', 'Öl', 'Zahn', 'zebra']);
  });

  it('gleiche Namen stehen nach Kennung geordnet (stabil)', async () => {
    const { kern } = await neuerKern();
    await anlegen(kern, projekt('p-b', 'Schule'));
    await anlegen(kern, projekt('p-a', 'Schule'));
    expect(wert(kern.projekteAuflisten()).map((p) => p.id)).toEqual(['p-a', 'p-b']);
  });

  it('ein neues Projekt erscheint sofort, ein gelöschtes fehlt sofort', async () => {
    const { kern } = await neuerKern();
    expect(wert(kern.projekteAuflisten())).toEqual([]);
    const a = projekt('p-1', 'Kita Nord');
    const b = projekt('p-2', 'Halle');
    await anlegen(kern, a);
    expect(wert(kern.projekteAuflisten())).toEqual([{ id: a.id, name: a.name }]);
    await anlegen(kern, b);
    expect(namen(kern)).toEqual(['Halle', 'Kita Nord']);
    await loeschen(kern, a);
    expect(wert(kern.projekteAuflisten())).toEqual([{ id: b.id, name: b.name }]);
  });

  it('über die Vertragsschnittstelle: projekte.auflisten und leistungsverzeichnisse.auflisten', async () => {
    const { kern } = await neuerKern();
    const speicher = speicherUeberTransport(direktTransport(kern), null);
    const f = ladeFixture('typisch');
    await anlegen(kern, projekt('p-0', 'Zahnarztpraxis'));
    for (const s of anlegenSchritte(f)) wert(await speicher.anwenden(s.eintrag, s.changeSet));
    expect(wert(await speicher.projekte.auflisten())).toEqual([
      { id: f.projekt.id, name: f.projekt.name },
      { id: 'p-0', name: 'Zahnarztpraxis' },
    ]);
    expect(wert(await speicher.leistungsverzeichnisse.auflisten(f.projekt.id))).toEqual([
      { id: f.lv.leistungsverzeichnis.id, name: f.lv.leistungsverzeichnis.name },
    ]);
    expect(wert(await speicher.leistungsverzeichnisse.auflisten('p-0' as ProjektId))).toEqual([]);
  });

  it('LV-Übersicht: Kennung und Name, nach Name deutsch sortiert, gleiche Namen nach Kennung', async () => {
    const { kern } = await neuerKern();
    const f = ladeFixture('winzig');
    for (const s of anlegenSchritte(f)) wert(await kern.anwenden(s.eintrag, s.changeSet));
    const lv = f.lv.leistungsverzeichnis;
    const weiteres = async (id: string, name: string): Promise<void> => {
      const neu = { ...lv, id: id as LeistungsverzeichnisId, name, knoten: [] };
      const z = {
        leistungsverzeichnis: neu,
        summen: { positionen: [], gliederungen: [], gesamt: f.lv.summen.gesamt },
      };
      const e = eintrag(
        nr++,
        f.projekt.id,
        { art: 'leistungsverzeichnis', id: neu.id },
        {
          art: 'LeistungsverzeichnisUmbenennen',
          name,
        },
      );
      wert(await kern.anwenden(e, lvAnlegenChangeSet(z)));
    };
    await weiteres('lv-2', 'Ärztehaus');
    await weiteres('lv-1', 'zebra');
    await weiteres('lv-0', 'Ärztehaus');
    expect(wert(kern.lvAuflisten(f.projekt.id))).toEqual([
      { id: 'lv-0', name: 'Ärztehaus' },
      { id: 'lv-2', name: 'Ärztehaus' },
      { id: lv.id, name: lv.name },
      { id: 'lv-1', name: 'zebra' },
    ]);
  });
});
