// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: Mängel und Bautagebuch durch Ausführer und echten Speicher (In-Memory-SQLite); Rückgängig und Wiederholen
// über den Befehlsweg. Erwartet werden Werte, die von Hand aus den Eingaben folgen.

import type { Mangel, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer, projektSitzung } from '../lv/befehlsweg';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { eintragLesen, leererEintrag } from './bautagebuch';
import { leererEntwurf, mangelAnlegenBefehl, statusBefehle } from './maengel';
import { bautagebuchLaden, bautagebuchSitzung, maengelLaden, mangelSitzung } from './schreiben';

async function aufbau() {
  const speicher = await speicherImSpeicher();
  const u = testUmgebung(speicher);
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Kita', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  return { speicher, u, projekt, weg: befehlswegFuer(u) };
}

const neuerMangel = (u: ReturnType<typeof testUmgebung>, projekt: Projekt, nummer: number, titel: string) => {
  const r = mangelAnlegenBefehl(u.ids, projekt.id, { ...leererEntwurf(nummer, '2026-11-10'), titel, frist: '20.11.2026' }, null, []);
  if (!r.ok) throw new Error(JSON.stringify(r.fehler));
  return r.wert;
};

describe('Mängel durch den Speicher', () => {
  it('anlegen, anzeigen (Eintrag und Frist als ein Schritt), Rückgängig und Wiederholen stellen den gespeicherten Stand her', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const anlegen = neuerMangel(u, projekt, 1, 'Riss');
    expect((await mangelSitzung(u, projekt.id, null).befehl(anlegen)).ok).toBe(true);
    const gespeichert = await maengelLaden(speicher, projekt.id);
    if (!gespeichert.ok) throw new Error('laden');
    const m: Mangel = gespeichert.wert[0] as Mangel;
    expect(m).toMatchObject({ nummer: 1, titel: 'Riss', frist: '2026-11-20' });

    const stand = statusBefehle(m, 'anzeigen', { datum: '11.11.2026', frist: '25.11.2026', bemerkung: '' });
    if (!stand.ok) throw new Error('Status');
    const tiefeVor = weg.historie.tiefe.rueck;
    const aus = await mangelSitzung(u, projekt.id, m).folge(stand.wert);
    expect(aus.every((a) => a.ok)).toBe(true);
    expect(weg.historie.tiefe.rueck).toBe(tiefeVor + 1);
    let jetzt = (await maengelLaden(speicher, projekt.id)).ok ? (await maengelLaden(speicher, projekt.id)) : null;
    expect(jetzt?.ok && jetzt.wert[0]).toMatchObject({
      frist: '2026-11-25',
      verlauf: [
        { status: 'offen', datum: '2026-11-10' },
        { status: 'angezeigt', datum: '2026-11-11', frist: '2026-11-25' },
      ],
    });

    // ein Undo nimmt beide Befehle zurück
    expect((await weg.rueckgaengig()).ok).toBe(true);
    jetzt = await maengelLaden(speicher, projekt.id);
    expect(jetzt.ok && jetzt.wert[0]).toMatchObject({ frist: '2026-11-20', verlauf: [{ status: 'offen' }] });
    expect(jetzt.ok && jetzt.wert[0]?.verlauf).toHaveLength(1);
    expect((await weg.wiederholen()).ok).toBe(true);
    jetzt = await maengelLaden(speicher, projekt.id);
    expect(jetzt.ok && jetzt.wert[0]?.verlauf).toHaveLength(2);
    expect(jetzt.ok && jetzt.wert[0]?.frist).toBe('2026-11-25');

    // und das Anlegen
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    jetzt = await maengelLaden(speicher, projekt.id);
    expect(jetzt.ok && jetzt.wert).toHaveLength(0);
  });

  it('eine vergebene Nummer weist der Ausführer gegen den Bestand ab', async () => {
    const { u, projekt } = await aufbau();
    await mangelSitzung(u, projekt.id, null).befehl(neuerMangel(u, projekt, 1, 'Riss'));
    const zweiter = await mangelSitzung(u, projekt.id, null).befehl(neuerMangel(u, projekt, 1, 'Kiesnest'));
    expect(zweiter.ok).toBe(false);
    if (zweiter.ok) return;
    expect(zweiter.abweisung).toMatchObject({ art: 'befehl', fehler: { code: 'ungueltige-eingabe', feld: 'nummer' } });
  });

  it('löschen und Rückgängig holt den Mangel samt Verlauf zurück', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    await mangelSitzung(u, projekt.id, null).befehl(neuerMangel(u, projekt, 1, 'Riss'));
    const liste = await maengelLaden(speicher, projekt.id);
    const m = liste.ok ? (liste.wert[0] as Mangel) : null;
    if (m === null) throw new Error('laden');
    expect((await mangelSitzung(u, projekt.id, m).befehl({ art: 'MangelLoeschen' })).ok).toBe(true);
    expect((await maengelLaden(speicher, projekt.id)).ok && (await maengelLaden(speicher, projekt.id))).toMatchObject({ wert: [] });
    await weg.rueckgaengig();
    const danach = await maengelLaden(speicher, projekt.id);
    expect(danach.ok && danach.wert[0]).toEqual(m);
  });
});

describe('Bautagebuch durch den Speicher', () => {
  it('ein zweiter Eintrag am selben Datum wird abgewiesen; ersetzen, löschen und Rückgängig', async () => {
    const { speicher, u, projekt, weg } = await aufbau();
    const lesen = (datum: string, leistung: string, id = u.ids.bautagebucheintrag()) => {
      const r = eintragLesen({ ...leererEintrag(datum), leistungen: leistung }, id, projekt.id, []);
      if (!r.ok) throw new Error('Eintrag');
      return r.wert;
    };
    const erster = lesen('2026-11-16', 'Mauerwerk');
    expect((await bautagebuchSitzung(u, projekt.id, null).befehl({ art: 'BautagebucheintragSetzen', eintrag: erster })).ok).toBe(true);

    const doppelt = await bautagebuchSitzung(u, projekt.id, null).befehl({
      art: 'BautagebucheintragSetzen',
      eintrag: lesen('2026-11-16', 'noch einmal'),
    });
    expect(doppelt.ok).toBe(false);
    if (!doppelt.ok) expect(doppelt.abweisung).toMatchObject({ art: 'befehl', fehler: { feld: 'datum' } });

    // ersetzen: gleiche Kennung
    const geaendert = { ...erster, leistungen: 'Mauerwerk fertig' };
    const s = bautagebuchSitzung(u, projekt.id, erster);
    expect((await s.befehl({ art: 'BautagebucheintragSetzen', eintrag: geaendert })).ok).toBe(true);
    let liste = await bautagebuchLaden(speicher, projekt.id);
    expect(liste.ok && liste.wert).toEqual([geaendert]);
    await weg.rueckgaengig();
    liste = await bautagebuchLaden(speicher, projekt.id);
    expect(liste.ok && liste.wert).toEqual([erster]);

    // löschen und zurückholen
    expect((await bautagebuchSitzung(u, projekt.id, erster).befehl({ art: 'BautagebucheintragLoeschen' })).ok).toBe(true);
    liste = await bautagebuchLaden(speicher, projekt.id);
    expect(liste.ok && liste.wert).toEqual([]);
    await weg.rueckgaengig();
    liste = await bautagebuchLaden(speicher, projekt.id);
    expect(liste.ok && liste.wert).toEqual([erster]);
  });
});
