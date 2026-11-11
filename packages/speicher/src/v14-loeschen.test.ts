// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostenermittlung und die Löschregeln aus Vertrag v1.4 (Ticket 79; Kommentar an `Speicher`, Q5): Nichts verschwindet,
// woran ein anderes Aggregat hängt, auch nicht über ein Undo (ChangeSet ohne Ausführer). Dazu Undo und Redo mit
// `Rueckgaengig`/`Wiederholen` im Protokoll für die neuen Aggregatarten.

import type {
  AuftragsLvChangeSet,
  ChangeSet,
  Position,
  Projekt,
  Protokolleintrag,
  Titel,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { anlegenSchritte, auftragsLvLoeschenChangeSet, eintrag } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { kopfAendern, umkehren } from './testhilfe/umkehrung';
import {
  aggregatVon,
  anwenden,
  aufmass,
  aufmassCs,
  AUFTRAG,
  AUFTRAG_ZUSTAND,
  F,
  kostenermittlung,
  kostenermittlungCs,
  mitAuftrag,
  P,
  rechnung,
  rechnungCs,
} from './testhilfe/v14';

const code = (r: { ok: boolean; fehler?: { code: string } }): string | false =>
  !r.ok && (r.fehler?.code ?? '');
const projektLoeschen = (p: Projekt): ChangeSet => ({
  art: 'projekt',
  projektId: p.id,
  projekt: { vorher: p, nachher: null },
});

describe('Kostenermittlung speichern und laden', () => {
  it('Anlegen → Laden; auflisten ohne Einträge nach Name; Eintrag setzen mit Undo; Löschen mit Undo', async () => {
    const kern = await mitAuftrag();
    const b = kostenermittlung(2, { name: 'Ärger-Kostenschätzung', stufe: 'kostenschaetzung' });
    const a = kostenermittlung(1, { name: 'Zahlen' });
    wert(await anwenden(kern, kostenermittlungCs(null, a)));
    wert(await anwenden(kern, kostenermittlungCs(null, b)));
    expect(wert(kern.kostenermittlungLaden(a.id))).toEqual({ kostenermittlung: a });
    const uebersicht = (k: typeof a) => ({ id: k.id, projektId: k.projektId, stufe: k.stufe, name: k.name });
    // de-DE: „Ärger“ steht bei A, vor „Zahlen“ (Bytes würden Ä hinter Z stellen).
    expect(wert(kern.kostenermittlungenAuflisten(P))).toEqual([uebersicht(b), uebersicht(a)]);
    const eintrag350 = {
      ...a,
      eintraege: [...a.eintraege.slice(0, 2), { nummer: '350', betrag: '5.00' }, ...a.eintraege.slice(2)],
    };
    const setzen = kostenermittlungCs(a, eintrag350 as typeof a);
    wert(await anwenden(kern, setzen));
    expect(wert(kern.kostenermittlungLaden(a.id)).kostenermittlung).toEqual(eintrag350);
    wert(await anwenden(kern, umkehren(setzen)));
    expect(wert(kern.kostenermittlungLaden(a.id)).kostenermittlung).toEqual(a);
    expect(code(await anwenden(kern, kostenermittlungCs({ ...a, name: 'veraltet' }, null)))).toBe('konflikt');
    const loeschen = kostenermittlungCs(a, null);
    wert(await anwenden(kern, loeschen));
    expect(code(kern.kostenermittlungLaden(a.id))).toBe('nicht-gefunden');
    wert(await anwenden(kern, umkehren(loeschen)));
    expect(wert(kern.kostenermittlungLaden(a.id)).kostenermittlung).toEqual(a);
    expect(code(kern.kostenermittlungenAuflisten('unbekannt' as never))).toBe('nicht-gefunden');
  });
});

describe('Löschregeln aus Vertrag v1.4 (konflikt, Q5)', () => {
  it('Auftrags-LV löschen, solange ein Aufmaßblatt oder eine Rechnung daran hängt: konflikt', async () => {
    const kern = await mitAuftrag();
    const loeschen = auftragsLvLoeschenChangeSet(AUFTRAG_ZUSTAND);
    wert(await anwenden(kern, aufmassCs(null, aufmass(1))));
    expect(code(await anwenden(kern, loeschen))).toBe('konflikt');
    wert(await anwenden(kern, rechnungCs(null, rechnung(1, [1]))));
    wert(await anwenden(kern, aufmassCs(null, aufmass(2))));
    expect(code(await anwenden(kern, loeschen))).toBe('konflikt');
    wert(await anwenden(kern, rechnungCs(rechnung(1, [1]), null)));
    for (const n of [1, 2]) wert(await anwenden(kern, aufmassCs(aufmass(n), null)));
    wert(await anwenden(kern, loeschen)); // jetzt hängt nichts mehr daran
    expect(code(kern.auftragsLvLaden(AUFTRAG))).toBe('nicht-gefunden');
  });

  it('Auftrags-LV löschen, solange die Nachtragsangaben eines LV darauf verweisen: konflikt', async () => {
    const kern = await mitAuftrag();
    const lv = F.lv;
    const setzen = kopfAendern(
      lv,
      { nachtrag: { auftragsLvId: AUFTRAG, nummer: 'N01', status: 'angemeldet' } },
      '1.00',
    );
    wert(await anwenden(kern, setzen));
    expect(code(await anwenden(kern, auftragsLvLoeschenChangeSet(AUFTRAG_ZUSTAND)))).toBe('konflikt');
    wert(await anwenden(kern, umkehren(setzen)));
    wert(await anwenden(kern, auftragsLvLoeschenChangeSet(AUFTRAG_ZUSTAND)));
  });

  it('eine Position aus dem Auftrags-LV entfernen, auf die eine Aufmaßzeile verweist (Umkehrung einer Übernahme): konflikt', async () => {
    const kern = await mitAuftrag();
    const z = AUFTRAG_ZUSTAND;
    const titel = z.auftragsLeistungsverzeichnis.knoten.find(
      (k): k is Titel => k.art === 'titel' && k.elternId === AUFTRAG,
    );
    if (titel === undefined) throw new Error('kein Titel auf oberster Ebene');
    // NachtragUebernehmen (vereinfacht): eine neue Gliederung mit einer Position am Ende der obersten Ebene.
    const oben = z.auftragsLeistungsverzeichnis.knoten.filter((k) => k.elternId === AUFTRAG).length;
    const gliederung: Titel = {
      ...titel,
      id: 'nachtrag-titel' as TitelId,
      reihenfolge: oben,
      kurztext: 'Nachtrag N01',
    };
    const vorlage = z.auftragsLeistungsverzeichnis.knoten.find((k): k is Position => k.art === 'position');
    if (vorlage === undefined) throw new Error('keine Position');
    const position: Position = {
      ...vorlage,
      id: 'nachtrag-pos' as never,
      elternId: 'nachtrag-titel' as never,
      reihenfolge: 0,
    };
    const uebernehmen: AuftragsLvChangeSet = {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: AUFTRAG,
      kopf: null,
      knoten: { hinzugefuegt: [gliederung, position], geaendert: [], entfernt: [] },
      summen: {
        positionen: [{ positionId: position.id, gesamtpreis: '30.00' as never, gehtInSummeEin: true }],
        gliederungen: [{ gliederungId: 'nachtrag-titel' as never, summe: '30.00' as never }],
        gesamt: { ...z.summen.gesamt, netto: '1.00' as never },
        vorher: {
          positionen: [],
          gliederungen: [],
          gesamt: z.summen.gesamt,
          entfernt: { positionen: [], gliederungen: [] },
        },
      },
    };
    wert(await anwenden(kern, uebernehmen));
    const blatt = aufmass(1, {
      positionen: [{ positionId: position.id, mengenansatz: null, menge: '2.000' as never }],
    });
    wert(await anwenden(kern, aufmassCs(null, blatt)));
    expect(code(await anwenden(kern, umkehren(uebernehmen)))).toBe('konflikt');
    expect(
      wert(kern.auftragsLvLaden(AUFTRAG)).auftragsLeistungsverzeichnis.knoten.map((k) => k.id),
    ).toContain(position.id);
    // Ohne Aufmaßzeile geht die Umkehrung durch.
    wert(await anwenden(kern, aufmassCs(blatt, null)));
    wert(await anwenden(kern, umkehren(uebernehmen)));
    expect(wert(kern.auftragsLvLaden(AUFTRAG))).toEqual(AUFTRAG_ZUSTAND);
  });

  it('Projekt löschen, solange eine Kostenermittlung daran hängt: konflikt', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(F).slice(0, 1));
    const k = kostenermittlung(1);
    wert(await anwenden(kern, kostenermittlungCs(null, k)));
    expect(code(await anwenden(kern, projektLoeschen(F.projekt)))).toBe('konflikt');
    wert(await anwenden(kern, kostenermittlungCs(k, null)));
    wert(await anwenden(kern, projektLoeschen(F.projekt)));
  });

  it('Kostenermittlung in einem unbekannten Projekt anlegen: nicht-gefunden; Projekt des Eintrags weicht ab: unbekannt', async () => {
    const kern = await mitAuftrag();
    const fremd = kostenermittlung(1, { projektId: 'anderes' as never });
    expect(code(await anwenden(kern, kostenermittlungCs(null, fremd)))).toBe('unbekannt');
    const r = await kern.anwenden(
      eintrag(990, 'anderes' as never, aggregatVon(kostenermittlungCs(null, fremd)), {
        art: 'KostenermittlungLoeschen',
      }),
      kostenermittlungCs(null, fremd),
    );
    expect(code(r)).toBe('nicht-gefunden');
  });
});

describe('Undo und Redo der neuen Aggregate im Protokoll (Rueckgaengig/Wiederholen)', () => {
  it('Aufmaßblatt, Rechnung und Kostenermittlung: Umkehrung durch Tausch, Verweis auf den ursprünglichen Befehl', async () => {
    const kern = await mitAuftrag();
    let nr = 700;
    const schreibe = async (cs: ChangeSet, befehl: Protokolleintrag['befehl']): Promise<Protokolleintrag> => {
      nr += 1;
      const e = eintrag(nr, P, aggregatVon(cs), befehl);
      wert(await kern.anwenden(e, cs));
      return e;
    };
    const faelle: [ChangeSet, Protokolleintrag['befehl'], () => unknown][] = [
      [
        aufmassCs(null, aufmass(1)),
        { art: 'AufmassAnlegen', aufmass: aufmass(1) },
        () => kern.aufmassLaden(aufmass(1).id),
      ],
      [
        rechnungCs(null, rechnung(1, [1])),
        { art: 'RechnungAnlegen', rechnung: rechnung(1, [1]) },
        () => kern.rechnungLaden(rechnung(1, []).id),
      ],
      [
        kostenermittlungCs(null, kostenermittlung(1)),
        { art: 'KostenermittlungAnlegen', kostenermittlung: kostenermittlung(1) },
        () => kern.kostenermittlungLaden(kostenermittlung(1).id),
      ],
    ];
    for (const [cs, befehl, laden] of faelle) {
      const original = await schreibe(cs, befehl);
      const geladen = laden();
      await schreibe(umkehren(cs), { art: 'Rueckgaengig', protokollId: original.id });
      expect(laden()).toMatchObject({ ok: false, fehler: { code: 'nicht-gefunden' } });
      await schreibe(cs, { art: 'Wiederholen', protokollId: original.id });
      expect(laden()).toEqual(geladen);
    }
    // Rückgängig in umgekehrter Reihenfolge der Bezüge: erst die Rechnung, dann das Blatt (D-12 (9)).
    const arten = wert(kern.protokoll(P))
      .slice(-9)
      .map((e) => `${e.aggregat.art}:${e.befehl.art}`);
    expect(arten).toEqual([
      'aufmass:Befehlskurzfassung',
      'aufmass:Rueckgaengig',
      'aufmass:Wiederholen',
      'rechnung:RechnungAnlegen',
      'rechnung:Rueckgaengig',
      'rechnung:Wiederholen',
      'kostenermittlung:KostenermittlungAnlegen',
      'kostenermittlung:Rueckgaengig',
      'kostenermittlung:Wiederholen',
    ]);
    // Ein Rueckgaengig, das auf einen Befehl an einem anderen Aggregat zeigt: konflikt.
    const fremd = eintrag(
      800,
      P,
      { art: 'rechnung', id: rechnung(1, []).id },
      {
        art: 'Rueckgaengig',
        protokollId: 'protokoll-000701' as never,
      },
    );
    const r = await kern.anwenden(fremd, rechnungCs(rechnung(1, [1]), null));
    expect(code(r)).toBe('konflikt');
  });
});
