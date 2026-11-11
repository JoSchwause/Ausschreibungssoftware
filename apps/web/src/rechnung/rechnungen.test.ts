// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Rechnungen auf dem Befehlsweg der App, gegen einen echten Speicher (In-Memory-SQLite): jede Änderung ein
// Befehl mit Protokolleintrag (A5, U7), Undo/Redo über die Umkehrung der `rechnung`-ChangeSets (Nachtrag D-42), ein
// `konflikt` des Speichers bleibt ein Wert und ändert nichts (Q5).

import type { Betrag, Rechnung } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { entwurfLesen, neuerEntwurf, rechnungAnlegenBefehl } from './entwurf';
import { rechnungenSitzung, rechnungsstandLaden } from './rechnungen';
import { blattAnlegen, mitAuftrag, type Auftragsstand } from './testhilfen';

async function mitZweiRechnungen(): Promise<Auftragsstand & { s: ReturnType<typeof rechnungenSitzung> }> {
  const a = await mitAuftrag();
  const b1 = await blattAnlegen(a, 1, { '01.0010': '1.000' });
  const kopf = a.auftrag.auftragsLeistungsverzeichnis;
  const s = rechnungenSitzung(a.weg, kopf.projektId, []);
  for (let i = 0; i < 2; i++) {
    const w = entwurfLesen(neuerEntwurf(s.zustand, [b1]));
    if (!w.ok) throw new Error('unlesbar');
    const r = await s.befehl({
      rechnungId: null,
      befehl: rechnungAnlegenBefehl(a.u.ids.rechnung(), kopf.projektId, kopf.id, s.zustand, w.wert),
    });
    if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
  }
  return { ...a, s };
}

const nummern = (rs: readonly Rechnung[]): number[] => rs.map((r) => r.nummer);

describe('Rechnungen auf dem Befehlsweg', () => {
  it('Anlegen: je ein Befehl mit Protokolleintrag am Aggregat Rechnung, gespeichert und geladen nach Nummer', async () => {
    const { u, s, auftrag, projekt } = await mitZweiRechnungen();
    expect(nummern(s.zustand)).toEqual([1, 2]);
    const geladen = await rechnungsstandLaden(u.speicher, auftrag.auftragsLeistungsverzeichnis.id);
    if (!geladen.ok) throw new Error(geladen.fehler.meldung);
    expect(geladen.wert.rechnungen).toEqual(s.zustand);
    expect(geladen.wert.blaetter.map((b) => b.nummer)).toEqual([1]);
    expect(geladen.wert.aufmasse.map((b) => b.positionen.length)).toEqual([1]);
    expect(geladen.wert.auftrag.auftragsLeistungsverzeichnis.id).toBe(
      auftrag.auftragsLeistungsverzeichnis.id,
    );
    const p = await u.speicher.protokoll(projekt.id);
    const letzte = p.ok ? p.wert.slice(-2) : [];
    expect(letzte.map((e) => [e.befehl.art, e.aggregat.art])).toEqual([
      ['RechnungAnlegen', 'rechnung'],
      ['RechnungAnlegen', 'rechnung'],
    ]);
  });

  it('Freigabe vor der früheren Rechnung: der Speicher weist mit konflikt ab, der Zustand bleibt (Q5)', async () => {
    const { s } = await mitZweiRechnungen();
    const [ar1, ar2] = s.zustand;
    if (ar1 === undefined || ar2 === undefined) throw new Error('Rechnungen');
    const r = await s.befehl({
      rechnungId: ar2.id,
      befehl: { art: 'RechnungFreigeben', zahlbetrag: '1.00' as Betrag },
    });
    expect(r).toMatchObject({ ok: false, abweisung: { art: 'speicher', fehler: { code: 'konflikt' } } });
    expect(s.zustand[1]?.freigabe).toBeNull();
  });

  it('Befehlsfolge ist ein Undo-Schritt; Rückgängig und Wiederholen kehren rechnung-ChangeSets um', async () => {
    const { u, weg, s, auftrag } = await mitZweiRechnungen();
    const [ar1] = s.zustand;
    if (ar1 === undefined) throw new Error('AR 1');
    const tiefe = weg.historie.tiefe.rueck;
    const a = await s.folge([
      {
        rechnungId: ar1.id,
        befehl: {
          art: 'RechnungsangabenSetzen',
          rechnungsart: 'abschlag',
          eingang: '2026-09-16',
          rechnungsnummerAuftragnehmer: 'AR-1',
          gefordert: null,
        },
      },
      { rechnungId: ar1.id, befehl: { art: 'RechnungFreigeben', zahlbetrag: '10.00' as Betrag } },
    ]);
    expect(a.map((x) => x.ok)).toEqual([true, true]);
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);

    const laden = async (): Promise<readonly Rechnung[]> => {
      const g = await rechnungsstandLaden(u.speicher, auftrag.auftragsLeistungsverzeichnis.id);
      if (!g.ok) throw new Error(g.fehler.meldung);
      return g.wert.rechnungen;
    };
    expect((await laden())[0]).toMatchObject({
      rechnungsnummerAuftragnehmer: 'AR-1',
      freigabe: { zahlbetrag: '10.00' },
    });
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await laden())[0]).toEqual(ar1);
    expect((await weg.wiederholen()).ok).toBe(true);
    expect((await laden())[0]).toMatchObject({
      rechnungsnummerAuftragnehmer: 'AR-1',
      freigabe: { zahlbetrag: '10.00' },
    });

    // Das Anlegen zurücknehmen löscht die Rechnung wieder.
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect(nummern(await laden())).toEqual([1]);
  });
});
