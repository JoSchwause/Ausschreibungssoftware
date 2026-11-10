// SPDX-License-Identifier: AGPL-3.0-or-later
// S3, Punkt 5 (ADR 0009): Über eine Folge gemischter Befehle steht genau ein Protokolleintrag je Befehl, in
// Reihenfolge, mit `wer` und `wann` wie übergeben; Massenbefehle als Kurzfassung (E-13). Dazu die Messung der
// Projektdatei von `gross` nach 1.000 Einzeländerungen, 100 Undo und einem Stand (Zahl im Ticket 43).

import type {
  Befehl,
  ChangeSet,
  LvZustand,
  NutzerId,
  Position,
  Protokolleintrag,
  Zeitstempel,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, eintrag, ladeFixture, type Schritt } from './testhilfe/fixtures';
import { imProtokoll, neuerKern, wert } from './testhilfe/node';
import { ausBaumNehmen, eintragEntfernen, feldAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';

describe('Befehlsprotokoll über gemischte Befehle (S3, Punkt 5; ADR 0009)', () => {
  it('genau ein Eintrag je Befehl, in Reihenfolge, wer und wann wie übergeben, Massenbefehle gekürzt', async () => {
    const f = ladeFixture('typisch');
    const lvId = f.lv.leistungsverzeichnis.id;
    const { kern } = await neuerKern();
    const erwartet: Protokolleintrag[] = [];
    let n = 0;
    const neu = (s: Schritt): Schritt => {
      n++;
      return {
        ...s,
        eintrag: {
          ...s.eintrag,
          wer: `nutzer-${String(n % 3)}` as NutzerId,
          wann: `2026-11-10T08:${String(n).padStart(2, '0')}:00.000Z` as Zeitstempel,
        },
      };
    };
    const schreibe = async (s: Schritt): Promise<Protokolleintrag> => {
      const x = neu(s);
      wert(await kern.anwenden(x.eintrag, x.changeSet));
      erwartet.push(imProtokoll(x.eintrag));
      return x.eintrag;
    };
    const lv = (): LvZustand => wert(kern.lvLaden(lvId));
    const amLv = (nr: number, befehl: Befehl, changeSet: ChangeSet): Schritt => ({
      eintrag: eintrag(nr, f.projekt.id, { art: 'leistungsverzeichnis', id: lvId }, befehl),
      changeSet,
    });
    const p = (i: number): Position =>
      lv().leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position')[i] as Position;

    for (const s of anlegenSchritte(f)) await schreibe(s); // Projekt, LV (Massenbefehl), drei Angebote (Massenbefehle)
    const m1 = feldAendern(lv(), p(0).id, { ...p(0), menge: '2.000' as Position['menge'] }, '20.00');
    const e1 = await schreibe(
      amLv(10, { art: 'MengeAendern', positionId: p(0).id, menge: '2.000' as never }, m1),
    );
    const m2 = feldAendern(lv(), p(1).id, { ...p(1), kurztext: 'neu' }, '21.00');
    const e2 = await schreibe(amLv(11, { art: 'KurztextAendern', knotenId: p(1).id, kurztext: 'neu' }, m2));
    // Undo in Stapelreihenfolge (D-12): erst m2, dann m1; dann m1 wiederholen.
    await schreibe(amLv(12, { art: 'Rueckgaengig', protokollId: e2.id }, umkehren(m2)));
    await schreibe(amLv(13, { art: 'Rueckgaengig', protokollId: e1.id }, umkehren(m1)));
    await schreibe(amLv(14, { art: 'Wiederholen', protokollId: e1.id }, m1));
    const hinweis = lv().leistungsverzeichnis.knoten.find((k) => k.art === 'hinweis')?.id as string;
    await schreibe(
      amLv(
        15,
        { art: 'KnotenInPapierkorbLegen', eintragId: 'e1' as never, knotenIds: [hinweis as never] },
        ausBaumNehmen(lv(), [hinweis], { id: 'e1', nummer: 1 }),
      ),
    );
    await schreibe(
      amLv(
        16,
        { art: 'LvStandAnlegen', id: 'stand-1' as never, name: 'Versand' },
        standAnlegen(lv(), 'stand-1', 'Versand'),
      ),
    );
    const e = lv().papierkorb?.[0];
    if (e === undefined) throw new Error('kein Eintrag');
    await schreibe(
      amLv(17, { art: 'PapierkorbeintragEntfernen', eintragId: e.id }, eintragEntfernen(lv(), e)),
    );

    const protokoll = wert(kern.protokoll(f.projekt.id));
    expect(protokoll).toEqual(erwartet);
    expect(protokoll).toHaveLength(13);
    expect(protokoll.map((x) => x.befehl.art)).toEqual([
      'ProjektAnlegen',
      'Befehlskurzfassung',
      'Befehlskurzfassung',
      'Befehlskurzfassung',
      'Befehlskurzfassung',
      'MengeAendern',
      'KurztextAendern',
      'Rueckgaengig',
      'Rueckgaengig',
      'Wiederholen',
      'KnotenInPapierkorbLegen',
      'LvStandAnlegen',
      'PapierkorbeintragEntfernen',
    ]);
  });
});

describe('Größe der Projektdatei (S3, Punkt 5)', () => {
  it('gross nach 1.000 Einzeländerungen, 100 Undo und einem Stand', { timeout: 120_000 }, async () => {
    const f = ladeFixture('gross');
    const lvId = f.lv.leistungsverzeichnis.id;
    const { kern } = await neuerKern();
    for (const s of anlegenSchritte(f)) wert(await kern.anwenden(s.eintrag, s.changeSet));
    const bytes = (k: SpeicherKern): number =>
      new TextEncoder().encode(wert(k.projektdateiExportieren(f.projekt.id))).length;
    const nachAnlegen = bytes(kern);

    let nr = 10;
    const aenderungen: { e: Protokolleintrag; cs: ChangeSet }[] = [];
    const positionen = f.lv.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position');
    let z = wert(kern.lvLaden(lvId));
    for (let i = 0; i < 1000; i++) {
      const p = positionen[(i * 7) % positionen.length] as Position;
      const aktuell = z.leistungsverzeichnis.knoten.find((k) => k.id === p.id) as Position;
      const menge = `${String(i + 1)}.000`;
      const cs = feldAendern(z, p.id, { ...aktuell, menge: menge as Position['menge'] }, `${String(i)}.00`);
      const e = eintrag(
        nr++,
        f.projekt.id,
        { art: 'leistungsverzeichnis', id: lvId },
        {
          art: 'MengeAendern',
          positionId: p.id,
          menge: menge as never,
        },
      );
      wert(await kern.anwenden(e, cs));
      aenderungen.push({ e, cs });
      z = {
        ...z,
        leistungsverzeichnis: {
          ...z.leistungsverzeichnis,
          knoten: z.leistungsverzeichnis.knoten.map((k) =>
            k.id === p.id ? { ...aktuell, menge: menge as never } : k,
          ),
        },
        summen: {
          ...z.summen,
          positionen: z.summen.positionen.map((s) =>
            s.positionId === p.id ? { ...s, gesamtpreis: `${String(i)}.00` as never } : s,
          ),
          gesamt: cs.summen.gesamt ?? z.summen.gesamt,
        },
      };
    }
    const nachAenderungen = bytes(kern);
    for (const { e, cs } of aenderungen.slice(-100).reverse()) {
      const r = eintrag(nr++, f.projekt.id, e.aggregat, { art: 'Rueckgaengig', protokollId: e.id });
      wert(await kern.anwenden(r, umkehren(cs)));
    }
    const nachUndo = bytes(kern);
    const lvJetzt = wert(kern.lvLaden(lvId));
    wert(
      await kern.anwenden(
        eintrag(
          nr,
          f.projekt.id,
          { art: 'leistungsverzeichnis', id: lvId },
          { art: 'LvStandAnlegen', id: 'stand-1' as never, name: 'Versand' },
        ),
        standAnlegen(lvJetzt, 'stand-1', 'Versand'),
      ),
    );
    const nachStand = bytes(kern);
    const meldung =
      `[speicher] gross: nach Anlegen ${String(nachAnlegen)} Bytes, nach 1.000 Einzeländerungen ${String(nachAenderungen)}, ` +
      `nach 100 Undo ${String(nachUndo)}, nach einem Stand ${String(nachStand)} (Stand +${String(nachStand - nachUndo)})`;
    console.info(meldung);
    expect(wert(kern.protokoll(f.projekt.id))).toHaveLength(2 + 1000 + 100 + 1);
    // Der Stand trägt das ganze LV samt Summen: die Datei wächst um etwa die Größe des LV.
    expect(nachStand - nachUndo).toBeGreaterThan((nachAnlegen * 9) / 10);
    expect(nachStand).toBeLessThan(nachAnlegen * 3);
  });
});
