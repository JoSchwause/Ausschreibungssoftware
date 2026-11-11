// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 89: Kostenermittlung durch Fachpaket und echten Speicher (In-Memory-SQLite), Rückgängig und Wiederholen über den
// Befehlsweg. Erwartet werden Zahlen, die von Hand aus den Eingaben folgen.

import type { KostenermittlungId, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { befehlswegFuer, projektSitzung } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { eintragEntfernenBefehl, eintragSetzenBefehl, kopfBefehl, kostenermittlungAnlegenBefehl } from './befehle';
import { kostenermittlungSitzung, kostenermittlungenLaden } from './schreiben';

async function aufbau() {
  const speicher = await speicherImSpeicher();
  const u = testUmgebung(speicher);
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Kita', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  return { speicher, u, projekt, weg: befehlswegFuer(u) };
}

const setzen = (nummer: string, betrag: string, bemerkung = '') => {
  const b = eintragSetzenBefehl(nummer, betrag, bemerkung);
  if (!b.ok) throw new Error(b.fehler.meldung);
  return b.wert;
};

describe('Befehle aus Formularfeldern', () => {
  it('liest Nummer und Betrag (de-DE) und lässt eine leere Bemerkung weg', () => {
    expect(setzen('330', '125.000,50')).toEqual({
      art: 'KostenermittlungseintragSetzen',
      eintrag: { nummer: '330', betrag: '125000.50' },
    });
    expect(setzen(' 410 ', '1,5', ' Heizung ').eintrag).toEqual({
      nummer: '410',
      betrag: '1.50',
      bemerkung: 'Heizung',
    });
  });

  it('eine formwidrige Nummer oder ein unlesbarer Betrag ist ein Feldfehler und kein Befehl', () => {
    const n = eintragSetzenBefehl('33', '1', '');
    expect(n.ok ? null : n.fehler.feld).toBe('nummer');
    const b = eintragSetzenBefehl('330', '1,234', '');
    expect(b.ok ? null : b.fehler).toMatchObject({ feld: 'betrag' });
    const c = eintragSetzenBefehl('330', 'abc', '');
    expect(c.ok).toBe(false);
    expect(eintragEntfernenBefehl('x').ok).toBe(false);
  });
});

describe('Kostenermittlung durch den Speicher', () => {
  it('anlegen, Einträge setzen, Kopf ändern; Rückgängig und Wiederholen stellen den gespeicherten Stand her', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const anlegen = kostenermittlungAnlegenBefehl(u.ids, projekt.id, ' Kostenberechnung ', 'kostenberechnung');
    const id: KostenermittlungId = anlegen.kostenermittlung.id;
    const s = kostenermittlungSitzung(u, projekt.id, null);
    expect((await s.befehl(anlegen)).ok).toBe(true);
    const a = await s.folge([setzen('330', '100.000,00'), setzen('320', '50.000,00', 'Gründung')]);
    expect(a.every((x) => x.ok)).toBe(true);
    expect((await s.befehl(kopfBefehl('Kostenberechnung 2', 'kostenanschlag'))).ok).toBe(true);

    const geladen = await kostenermittlungenLaden(speicher, projekt.id);
    expect(geladen.ok && geladen.wert[0]?.kostenermittlung).toMatchObject({
      id,
      name: 'Kostenberechnung 2',
      stufe: 'kostenanschlag',
      eintraege: [
        { nummer: '320', betrag: '50000.00', bemerkung: 'Gründung' },
        { nummer: '330', betrag: '100000.00' },
      ],
    });

    // Projekt anlegen, Kostenermittlung anlegen, die zwei Einträge einer Aktion (ein Schritt), Kopf ändern.
    expect(weg.historie.tiefe.rueck).toBe(4);
  });

  it('Mehrere Einträge einer Aktion sind genau ein Undo-Schritt; Undo und Redo kehren das ChangeSet um', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const s = kostenermittlungSitzung(u, projekt.id, null);
    await s.befehl(kostenermittlungAnlegenBefehl(u.ids, projekt.id, 'KB', 'kostenberechnung'));
    const vorher = weg.historie.tiefe.rueck;
    await s.folge([setzen('330', '1,00'), setzen('340', '2,00')]);
    expect(weg.historie.tiefe.rueck).toBe(vorher + 1);

    const stand = async () => {
      const g = await kostenermittlungenLaden(speicher, projekt.id);
      return g.ok ? (g.wert[0]?.kostenermittlung.eintraege.map((e) => `${e.nummer}=${e.betrag}`) ?? null) : null;
    };
    expect(await stand()).toEqual(['330=1.00', '340=2.00']);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect(await stand()).toEqual([]);
    expect((await weg.wiederholen()).ok).toBe(true);
    expect(await stand()).toEqual(['330=1.00', '340=2.00']);
    // Das Anlegen selbst lässt sich zurücknehmen: danach gibt es keine Kostenermittlung mehr.
    await weg.rueckgaengig();
    await weg.rueckgaengig();
    const leer = await kostenermittlungenLaden(speicher, projekt.id);
    expect(leer.ok && leer.wert).toEqual([]);
  });

  it('Löschen ist ein Befehl und per Undo zurückzuholen; ein fehlender Eintrag wird abgewiesen', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const s = kostenermittlungSitzung(u, projekt.id, null);
    await s.befehl(kostenermittlungAnlegenBefehl(u.ids, projekt.id, 'KB', 'kostenrahmen'));
    await s.befehl(setzen('330', '9,00'));
    const fehlt = eintragEntfernenBefehl('999');
    if (!fehlt.ok) throw new Error('Form');
    const abgewiesen = await s.befehl(fehlt.wert);
    expect(abgewiesen.ok).toBe(false);
    expect((await s.befehl({ art: 'KostenermittlungLoeschen' })).ok).toBe(true);
    const nachLoeschen = await kostenermittlungenLaden(speicher, projekt.id);
    expect(nachLoeschen.ok && nachLoeschen.wert).toEqual([]);
    await weg.rueckgaengig();
    const zurueck = await kostenermittlungenLaden(speicher, projekt.id);
    expect(zurueck.ok && zurueck.wert[0]?.kostenermittlung.eintraege).toEqual([{ nummer: '330', betrag: '9.00' }]);
  });
});
