// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlag zurücknehmen im Speicher (v1.7a, Ticket 139 Punkt 4; E8, D-74, D-127.2, D-127.3): Das ChangeSet ist das Löschen des
// Auftrags-LV und geht über den bestehenden Weg. Nachträge, Aufmaßblätter, Rechnungen und Mängel sperren (`konflikt`, auch als
// Undo), ein Bauzeitenplan nicht (schwacher Verweis, er bleibt unverändert). Angebot und LV bleiben; Undo stellt alles her.

import type { Befehl, ChangeSet, Protokolleintrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import { auftragsLvAnlegenChangeSet, auftragsLvLoeschenChangeSet, eintrag } from './testhilfe/fixtures';
import { wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';
import { AUFTRAG, AUFTRAG_ZUSTAND, F, P, aggregatVon, aufmass, aufmassCs, mitAuftrag } from './testhilfe/v14';
import { bauzeitenplan, mangel, mangelCs, planCs, vorgaenge } from './testhilfe/v16';

let nr = 5000;
async function versuche(kern: SpeicherKern, befehl: Befehl, cs: ChangeSet) {
  nr += 1;
  const e: Protokolleintrag = eintrag(nr, P, aggregatVon(cs), befehl);
  return { e, r: await kern.anwenden(e, cs) };
}
const ZURUECKNEHMEN: Befehl = { art: 'ZuschlagZuruecknehmen' };
const zuruecknehmen = auftragsLvLoeschenChangeSet(AUFTRAG_ZUSTAND);

describe('Zuschlag zurücknehmen (D-74, D-127.3)', () => {
  it('ohne Verweise: das Auftrags-LV entfällt, Angebot und LV bleiben; Undo stellt es her', async () => {
    const kern = await mitAuftrag();
    const { e, r } = await versuche(kern, ZURUECKNEHMEN, zuruecknehmen);
    wert(r);
    expect(wert(kern.auftragsLvAuflisten(P))).toEqual([]);
    expect(wert(kern.angeboteAuflisten(F.lv.leistungsverzeichnis.id))).toHaveLength(F.angebote.length);
    expect(wert(kern.lvLaden(F.lv.leistungsverzeichnis.id))).toEqual(F.lv);
    wert((await versuche(kern, { art: 'Rueckgaengig', protokollId: e.id }, umkehren(zuruecknehmen))).r);
    expect(wert(kern.auftragsLvLaden(AUFTRAG))).toEqual(AUFTRAG_ZUSTAND);
  });

  it('ein Bauzeitenplan mit Bezug auf das Auftrags-LV sperrt nicht und bleibt unverändert (schwacher Verweis, D-74)', async () => {
    const kern = await mitAuftrag();
    const [erster, ...rest] = vorgaenge(3);
    if (erster === undefined) throw new Error('Vorgang fehlt');
    const plan = bauzeitenplan(1, 3, {
      vorgaenge: [
        { ...erster, bezug: { art: 'auftrags-leistungsverzeichnis', id: AUFTRAG, knotenIds: null } },
        ...rest,
      ],
    });
    wert((await versuche(kern, { art: 'BauzeitenplanAnlegen', bauzeitenplan: plan }, planCs(null, plan))).r);
    wert((await versuche(kern, ZURUECKNEHMEN, zuruecknehmen)).r);
    expect(wert(kern.bauzeitenplanLaden(plan.id))).toEqual({ bauzeitenplan: plan });
  });

  it('ein Mangel oder ein Aufmaßblatt am Auftrags-LV sperrt: konflikt mit der Art in der Meldung, nichts geschrieben', async () => {
    for (const [art, cs] of [
      ['Mangel', mangelCs(null, mangel(1, { auftragsLvId: AUFTRAG }))],
      ['Aufmaßblatt', aufmassCs(null, aufmass(1))],
    ] as const) {
      const kern = await mitAuftrag();
      wert((await versuche(kern, { art: 'MangelAnlegen', mangel: mangel(1) }, cs)).r);
      const { r } = await versuche(kern, ZURUECKNEHMEN, zuruecknehmen);
      expect(r, art).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
      expect(r.ok ? '' : r.fehler.meldung, art).toContain(art);
      expect(wert(kern.auftragsLvLaden(AUFTRAG)), art).toEqual(AUFTRAG_ZUSTAND);
    }
  });

  it('auch als Undo (Umkehrung eines Zuschlags) sperrt ein Mangel', async () => {
    const kern = await mitAuftrag();
    // Das Anlegen des Auftrags-LV rückgängig machen, nachdem ein Mangel darauf verweist.
    wert(
      (
        await versuche(
          kern,
          { art: 'MangelAnlegen', mangel: mangel(1) },
          mangelCs(null, mangel(1, { auftragsLvId: AUFTRAG })),
        )
      ).r,
    );
    const umkehrung = umkehren(auftragsLvAnlegenChangeSet(AUFTRAG_ZUSTAND));
    const { r } = await versuche(
      kern,
      { art: 'Rueckgaengig', protokollId: 'protokoll-000090' as never },
      umkehrung,
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(r.ok ? '' : r.fehler.meldung).toContain('Mangel');
    expect(wert(kern.auftragsLvLaden(AUFTRAG))).toEqual(AUFTRAG_ZUSTAND);
  });
});
