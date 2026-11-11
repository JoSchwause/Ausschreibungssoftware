// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: Aufmaßblätter auf dem Befehlsweg der App (A5, U7) gegen einen echten Speicher (In-Memory-SQLite), mit
// Rückgängig und Wiederholen (Nachtrag aus dem Review von v1.4: die App kehrt `aufmass`-ChangeSets um).

import type { Aufmass, Menge } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { zaehlenderSpeicher, speicherImSpeicher } from '../testhilfen';
import { abrechnungLaden, aufmassSitzung, neuesBlatt } from './aufmass';
import { mitAuftrag, positionMitOz } from './testhilfen';

describe('Aufmaßblatt über den Befehlsweg', () => {
  it('legt ein Blatt an, setzt Zeilen; jeder Schritt ein Befehl mit Protokolleintrag am Aggregat `aufmass`', async () => {
    const speicher = zaehlenderSpeicher(await speicherImSpeicher());
    const { u, weg, projekt, auftrag } = await mitAuftrag(speicher);
    const a = auftrag.auftragsLeistungsverzeichnis;
    const vorher = speicher.geschrieben.length;

    const blatt = aufmassSitzung(weg, projekt.id, null);
    const anlegen = neuesBlatt(u.ids, a, [], { bezeichnung: 'Erdarbeiten', datum: '2026-11-02' });
    expect(anlegen.aufmass.nummer).toBe(1);
    const r = await blatt.befehl(anlegen);
    expect(r.ok).toBe(true);
    const aushub = positionMitOz(auftrag, '02.0020');
    const r2 = await blatt.befehl({
      art: 'AufmasspositionSetzen',
      position: {
        positionId: aushub,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '12,5*8*3,5', variable: null }],
        menge: '350.000' as Menge,
      },
    });
    expect(r2.ok).toBe(true);

    const neu = speicher.geschrieben.slice(vorher);
    expect(neu.map((s) => s.eintrag.befehl.art)).toEqual(['AufmassAnlegen', 'AufmasspositionSetzen']);
    for (const s of neu) {
      expect(s.eintrag.aggregat).toEqual({ art: 'aufmass', id: anlegen.aufmass.id });
      expect(s.eintrag.projektId).toBe(projekt.id);
    }
    // Der Zustand der Sitzung ist der gespeicherte.
    const geladen = await speicher.aufmasse.laden(anlegen.aufmass.id);
    if (!geladen.ok) throw new Error(geladen.fehler.meldung);
    expect(geladen.wert.aufmass).toEqual(blatt.zustand?.aufmass);
    expect(geladen.wert.aufmass.positionen).toEqual([
      {
        positionId: aushub,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '12,5*8*3,5', variable: null }],
        menge: '350.000',
      },
    ]);
    expect(weg.historie.tiefe).toEqual({ rueck: 2, vor: 0 });
  });

  it('Rückgängig und Wiederholen kehren Zeile und Anlegen um; der Speicher folgt jedem Schritt', async () => {
    const { u, weg, projekt, auftrag } = await mitAuftrag();
    const a = auftrag.auftragsLeistungsverzeichnis;
    const blatt = aufmassSitzung(weg, projekt.id, null);
    const anlegen = neuesBlatt(u.ids, a, [], { bezeichnung: '', datum: null });
    await blatt.befehl(anlegen);
    const pos = positionMitOz(auftrag, '01.0020');
    await blatt.befehl({
      art: 'AufmasspositionSetzen',
      position: { positionId: pos, mengenansatz: null, menge: '50.000' as Menge },
    });
    const gespeichert = async (): Promise<Aufmass | null> => {
      const g = await u.speicher.aufmasse.laden(anlegen.aufmass.id);
      return g.ok ? g.wert.aufmass : null;
    };

    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await gespeichert())?.positionen).toEqual([]);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect(await gespeichert()).toBeNull();
    const liste = await u.speicher.aufmasse.auflisten(a.id);
    expect(liste.ok && liste.wert).toEqual([]);

    expect((await weg.wiederholen()).ok).toBe(true);
    expect((await weg.wiederholen()).ok).toBe(true);
    expect((await gespeichert())?.positionen).toEqual([
      { positionId: pos, mengenansatz: null, menge: '50.000' },
    ]);
    // Undo und Redo stehen im Protokoll mit dem Aggregat des Blatts.
    const p = await u.speicher.protokoll(projekt.id);
    if (!p.ok) throw new Error(p.fehler.meldung);
    const arten = p.wert.filter((e) => e.aggregat.art === 'aufmass').map((e) => e.befehl.art);
    expect(arten).toEqual([
      'Befehlskurzfassung', // AufmassAnlegen ist ein Massenbefehl (D-70.5)
      'AufmasspositionSetzen',
      'Rueckgaengig',
      'Rueckgaengig',
      'Wiederholen',
      'Wiederholen',
    ]);
  });

  it('lädt Auftrags-LV und alle Blätter nach Nummer; die nächste Nummer folgt der höchsten', async () => {
    const { u, weg, projekt, auftrag } = await mitAuftrag();
    const a = auftrag.auftragsLeistungsverzeichnis;
    const eins = neuesBlatt(u.ids, a, [], { bezeichnung: 'eins', datum: null });
    await aufmassSitzung(weg, projekt.id, null).befehl(eins);
    const zwei = neuesBlatt(u.ids, a, [eins.aufmass], { bezeichnung: 'zwei', datum: null });
    expect(zwei.aufmass.nummer).toBe(2);
    await aufmassSitzung(weg, projekt.id, null).befehl(zwei);

    const l = await abrechnungLaden(u.speicher, a.id);
    if (!l.ok) throw new Error(l.fehler.meldung);
    expect(l.wert.auftrag.auftragsLeistungsverzeichnis.id).toBe(a.id);
    expect(l.wert.blaetter.map((b) => [b.nummer, b.bezeichnung])).toEqual([
      [1, 'eins'],
      [2, 'zwei'],
    ]);
    const fehlt = await abrechnungLaden(u.speicher, u.ids.auftragsLeistungsverzeichnis());
    expect(fehlt.ok).toBe(false);
  });
});
