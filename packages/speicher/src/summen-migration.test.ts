// SPDX-License-Identifier: AGPL-3.0-or-later
// Summen nach Migration 2 (D-17, Review C1): Version 1 kannte weder Bedarfs- und Wahlsumme noch Pauschal ohne Menge
// (D-37.1). Nach dem Schritt auf Version 2 stehen deshalb alle gespeicherten Summen so, wie der Kern sie vollständig
// rechnet (`summenBerechnen`), auf dem Dateiweg wie auf dem Datenbankweg; und sie bleiben es nach der ersten Änderung,
// weil der Kern danach nur noch Differenzen darauf rechnet. Weist der Kern Altdaten ab, bleiben die Daten, wie sie sind,
// und es gibt einen Befund; die Migration bricht nicht ab.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, summenBerechnen } from '@tethys/kern';
import type {
  LvBefehl,
  LvZustand,
  Menge,
  Position,
  Projektdatei,
  ProjektId,
  Summenstand,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import type { SpeicherKern } from './kern';
import { migriere, MIGRATIONEN } from './migrationen';
import { eintrag } from './testhilfe/fixtures';
import { inhaltMitAllenAltenArten, mitKernSummen } from './testhilfe/inhalt-v1';
import { kernAufDb, neueDatenbank, neuerKern, wert } from './testhilfe/node';
import { schreibeInSchema1 } from './testhilfe/schema1';

const V1 = readFileSync(new URL('../fixtures/projektdatei-v1.json', import.meta.url), 'utf8');
const V1_LV = '019b76da-a800-727e-984b-1b9791bc2486';

/** Alle gespeicherten Summen des Projekts stimmen mit der vollständigen Rechnung des Kerns überein (Orakel). */
function pruefeAlleSummen(kern: SpeicherKern, projektId: ProjektId): void {
  const ist = JSON.parse(wert(kern.projektdateiExportieren(projektId))) as Projektdatei;
  const soll = mitKernSummen(ist);
  expect(ist.leistungsverzeichnisse).toEqual(soll.leistungsverzeichnisse);
  expect(ist.angebote).toEqual(soll.angebote);
  expect(ist.auftragsLeistungsverzeichnisse).toEqual(soll.auftragsLeistungsverzeichnisse);
  for (const z of ist.leistungsverzeichnisse) {
    const lv = wert(kern.lvLaden(z.leistungsverzeichnis.id));
    expect(lv.summen, `LV ${lv.leistungsverzeichnis.id}`).toEqual(summenBerechnen(lv.leistungsverzeichnis));
  }
}

/** Eine Änderung über den Kern (Menge der ersten Position mit Menge) und `anwenden`, wie die App sie macht. */
async function eineAenderung(kern: SpeicherKern, z: LvZustand): Promise<void> {
  const p = z.leistungsverzeichnis.knoten.find(
    (k): k is Position => k.art === 'position' && k.menge !== null,
  );
  if (p === undefined) throw new Error('keine Position mit Menge');
  const befehl: LvBefehl = { art: 'MengeAendern', positionId: p.id, menge: '7.125' as Menge };
  const cs = lvBefehlAusfuehren(z, befehl);
  if (!cs.ok) throw new Error(cs.fehler.meldung);
  const id = z.leistungsverzeichnis.id;
  wert(
    await kern.anwenden(
      eintrag(900, z.leistungsverzeichnis.projektId, { art: 'leistungsverzeichnis', id }, befehl),
      cs.wert,
    ),
  );
}

describe('Summen nach Migration 2 (D-17)', () => {
  it('Dateiweg: das eingefrorene v1-Projekt hat danach die vollständigen Summen des Kerns, auch nach einer Änderung', async () => {
    const { kern } = await neuerKern();
    const projektId = wert(await kern.projektdateiImportieren(V1));
    pruefeAlleSummen(kern, projektId);
    const lv = wert(kern.lvLaden(V1_LV as never));
    expect(lv.summen.gesamt).toMatchObject({ summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' });

    await eineAenderung(kern, lv);
    const danach = wert(kern.lvLaden(V1_LV as never));
    expect(danach.summen).toEqual(summenBerechnen(danach.leistungsverzeichnis));
    expect(danach.summen).not.toEqual(lv.summen);
    expect(wert(kern.migrationsbefunde())).toEqual([]);
  });

  it('Datenbankweg: eine Datenbank der Version 1 mit jeder alten Positionsart hat danach die Summen des Kerns', async () => {
    const inhalt = inhaltMitAllenAltenArten(2);
    const db = await neueDatenbank();
    db.ausfuehren('PRAGMA foreign_keys = ON');
    expect(
      migriere(
        db,
        MIGRATIONEN.filter((m) => m.version <= 1),
      ).ok,
    ).toBe(true);
    schreibeInSchema1(db, inhalt);

    const kern = kernAufDb(db);
    pruefeAlleSummen(kern, inhalt.projekt.id);
    const lvId = inhalt.leistungsverzeichnisse[0]?.leistungsverzeichnis.id;
    if (lvId === undefined) throw new Error('kein LV');
    const lv = wert(kern.lvLaden(lvId));
    // Die Altdaten haben Bedarf ohne Gesamtbetrag und Wahl: die Ausweise sind nicht 0,00 (nicht nur nachgetragen).
    expect(lv.summen.gesamt.summeWahl).not.toBe('0.00');
    expect(lv.summen.gesamt.summeBedarfOhneGesamtbetrag).not.toBe('0.00');

    await eineAenderung(kern, lv);
    const danach = wert(kern.lvLaden(lvId));
    expect(danach.summen).toEqual(summenBerechnen(danach.leistungsverzeichnis));
    expect(wert(kern.migrationsbefunde())).toEqual([]);
  });

  it('Dateiweg: weist der Kern das LV ab, bleiben Daten und Summen, wie sie sind; es gibt einen Befund', async () => {
    // Der Hinweistext hängt unter einer Position: Speicher und Dekoder nehmen das an, der Kern nicht (Baumregel).
    const d = JSON.parse(V1) as {
      leistungsverzeichnisse: { leistungsverzeichnis: { knoten: Record<string, unknown>[] } }[];
    };
    const knoten = d.leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten ?? [];
    const position = knoten.find((k) => k['art'] === 'position');
    const hinweis = knoten.find((k) => k['art'] === 'hinweis');
    if (position === undefined || hinweis === undefined)
      throw new Error('Fixture ohne Position oder Hinweis');
    hinweis['elternId'] = position['id'];
    hinweis['reihenfolge'] = 0;
    const kaputt = kanonischesJson(d);
    const vorher = JSON.parse(V1) as { leistungsverzeichnisse: { summen: Summenstand }[] };

    const { kern } = await neuerKern();
    const projektId = wert(await kern.projektdateiImportieren(kaputt));
    const lv = wert(kern.lvLaden(V1_LV as never));
    expect(lv.leistungsverzeichnis.knoten).toHaveLength(5);
    expect(lv.summen.gesamt).toEqual(vorher.leistungsverzeichnisse[0]?.summen.gesamt);
    const befunde = wert(kern.migrationsbefunde());
    expect(befunde.map((b) => b.aggregat)).toEqual(
      expect.arrayContaining([{ art: 'leistungsverzeichnis', id: V1_LV }]),
    );
    expect(befunde.every((b) => b.meldung.length > 0)).toBe(true);
    expect(wert(kern.projektLaden(projektId)).id).toBe(projektId);
  });

  it('Datenbankweg: weist der Kern ein LV ab, läuft die Migration durch; Befund statt Abbruch', async () => {
    const inhalt = inhaltMitAllenAltenArten(2);
    const lvZ = inhalt.leistungsverzeichnisse[0];
    if (lvZ === undefined) throw new Error('kein LV');
    const ks = lvZ.leistungsverzeichnis.knoten;
    const position = ks.find((k) => k.art === 'position');
    const hinweis = ks.find((k) => k.art === 'hinweis');
    if (position === undefined || hinweis === undefined)
      throw new Error('Fixture ohne Position oder Hinweis');
    // Hinweis unter eine Position, die Geschwister dahinter rücken auf (dicht, sonst nimmt die Datenbank es nicht an).
    const knoten = ks.map((k) =>
      k.id === hinweis.id
        ? { ...k, elternId: position.id as never, reihenfolge: 0 }
        : k.elternId === hinweis.elternId && k.reihenfolge > hinweis.reihenfolge
          ? { ...k, reihenfolge: k.reihenfolge - 1 }
          : k,
    );
    const kaputt = {
      ...inhalt,
      leistungsverzeichnisse: [{ ...lvZ, leistungsverzeichnis: { ...lvZ.leistungsverzeichnis, knoten } }],
    };
    const db = await neueDatenbank();
    db.ausfuehren('PRAGMA foreign_keys = ON');
    expect(
      migriere(
        db,
        MIGRATIONEN.filter((m) => m.version <= 1),
      ).ok,
    ).toBe(true);
    schreibeInSchema1(db, kaputt);

    const kern = kernAufDb(db);
    const lv = wert(kern.lvLaden(lvZ.leistungsverzeichnis.id));
    expect(lv.summen.gesamt).toEqual(lvZ.summen.gesamt);
    expect(wert(kern.migrationsbefunde()).map((b) => b.aggregat)).toEqual(
      expect.arrayContaining([{ art: 'leistungsverzeichnis', id: lvZ.leistungsverzeichnis.id }]),
    );
  });
});
