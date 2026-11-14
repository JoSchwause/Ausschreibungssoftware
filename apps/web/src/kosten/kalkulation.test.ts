// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 89, C4: Formular → Kalkulation → Befehle. Ticket 154 (E9, B-19): Ansätze und Zuschlagssätze werden mit
// `KalkulationSetzen` an der Position gespeichert, der Dialog öffnet mit ihnen; geprüft über eine echte Sitzung. Erwartungen von Hand (D-39: Einzelkosten ungerundet, Anteil kaufmännisch
// auf 3 Stellen, EP = Σ der Anteile).
//   Lohn:   0,450 h × 48,500 €/h = 21,825; Kalkulationszuschlagssatz 10 % → 24,0075 → 24,008
//   Stoffe: 2,000 × 6,250        = 12,500; Kalkulationszuschlagssatz 5 %  → 13,125
//   EP = 24,008 + 13,125 = 37,133

import type { Einheitspreis, LvZustand, Menge, Position, PositionId, Positionsdaten, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer, lvSitzung, projektSitzung, type Befehlsweg, type LvSitzung } from '../lv/befehlsweg';
import { ozMaskeLesen } from '../lv/ozmaske';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import {
  LEERES_FORMULAR,
  formularAusPosition,
  kalkulationBefehl,
  kalkulationEntfernenBefehl,
  kalkulationRechnen,
  type Kalkulationsformular,
} from './kalkulation';

const form: Kalkulationsformular = {
  zeilen: [
    { art: 'lohn', bezeichnung: 'Maurer', ansatzmenge: '0,450', kostensatz: '48,50' },
    { art: 'stoffe', bezeichnung: 'Stein', ansatzmenge: '2', kostensatz: '6,25' },
  ],
  saetze: { lohn: '10', stoffe: '5' },
  freiBezeichnung: '',
};

describe('kalkulationRechnen', () => {
  it('rechnet EP und Anteile nach D-39', () => {
    const l = kalkulationRechnen(form, false);
    expect(l.fehler).toEqual([]);
    expect(l.ergebnis.anteile.lohn).toBe('24.008');
    expect(l.ergebnis.anteile.stoffe).toBe('13.125');
    expect(l.ergebnis.anteile.geraete).toBeNull();
    expect(l.ergebnis.einheitspreis).toBe('37.133');
    expect(l.ergebnis.befunde).toEqual([]);
  });

  it('ein unlesbarer Wert ist ein Feldfehler am Feld, die Zeile zählt dann nicht', () => {
    const l = kalkulationRechnen(
      { ...form, zeilen: [{ art: 'lohn', bezeichnung: '', ansatzmenge: 'x', kostensatz: '48,50' }] },
      false,
    );
    expect(l.fehler).toEqual([
      { ort: 'zeile', zeile: 0, feld: 'ansatzmenge', meldung: expect.stringMatching(/Menge/) as string },
    ]);
    expect(l.ergebnis.einheitspreis).toBeNull();
    expect(l.ergebnis.befunde.map((b) => b.code)).toEqual(['wert-fehlt']);
  });

  it('ein unlesbarer Zuschlagssatz ist ein Feldfehler und zählt als 0 %', () => {
    const l = kalkulationRechnen({ ...form, saetze: { lohn: 'zehn' } }, false);
    expect(l.fehler).toMatchObject([{ ort: 'satz', art: 'lohn' }]);
    expect(l.ergebnis.anteile.lohn).toBe('21.825');
  });

  it('eine ganz leere Zeile zählt nicht und erzeugt keinen Befund', () => {
    const l = kalkulationRechnen(LEERES_FORMULAR, false);
    expect(l.fehler).toEqual([]);
    expect(l.ergebnis.befunde).toEqual([]);
    expect(l.ergebnis.einheitspreis).toBeNull();
  });

  it('die freie Bezeichnung geht in die Anteile; mit epaBezeichnungen am LV nicht (D-28)', () => {
    const f: Kalkulationsformular = {
      zeilen: [{ art: 'frei', bezeichnung: 'Sperrfrist', ansatzmenge: '1', kostensatz: '3' }],
      saetze: {},
      freiBezeichnung: ' Verschiedenes ',
    };
    expect(kalkulationRechnen(f, false).ergebnis.anteile.freiBezeichnung).toBe('Verschiedenes');
    expect(kalkulationRechnen(f, true).ergebnis.anteile.freiBezeichnung).toBeNull();
  });
});

describe('kalkulationBefehl', () => {
  const id = 'p1' as PositionId;

  it('ein Befehl mit Ansätzen, Sätzen, EP und Anteilen (ein Undo-Schritt)', () => {
    const b = kalkulationBefehl(id, kalkulationRechnen(form, false));
    expect(b).toEqual({
      ok: true,
      wert: {
        art: 'KalkulationSetzen',
        positionId: 'p1',
        kalkulation: {
          ansaetze: [
            { art: 'lohn', bezeichnung: 'Maurer', ansatzmenge: '0.450', kostensatz: '48.500' },
            { art: 'stoffe', bezeichnung: 'Stein', ansatzmenge: '2.000', kostensatz: '6.250' },
          ],
          zuschlagssaetze: { lohn: '10.00', stoffe: '5.00' },
        },
        einheitspreis: '37.133',
        epa: {
          lohn: '24.008',
          stoffe: '13.125',
          geraete: null,
          nachunternehmer: null,
          sonstiges: null,
          frei: null,
          freiBezeichnung: null,
        },
      },
    });
  });

  it('ohne EP gibt es nichts zu übernehmen', () => {
    const b = kalkulationBefehl(id, kalkulationRechnen(LEERES_FORMULAR, false));
    expect(b).toEqual({ ok: false, fehler: 'Es gibt noch keinen Einheitspreis zum Übernehmen.' });
  });

  it('ein unlesbares Feld wird nicht still als leer gespeichert: kein Befehl (Q5)', () => {
    const l = kalkulationRechnen({ ...form, saetze: { lohn: 'zehn' } }, false);
    expect(l.ergebnis.einheitspreis).not.toBeNull();
    const b = kalkulationBefehl(id, l);
    expect(b.ok).toBe(false);
    expect(b.ok ? '' : b.fehler).toMatch(/markierten Felder/);
  });
});

// --- Durch Kern und Speicher -------------------------------------------------------------------------------------

const daten = (kurztext: string, ep: string): Positionsdaten => ({
  ordnungszahl: null,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext,
  langtext: [],
  menge: '86.500' as Menge,
  einheit: 'm',
  einheitspreis: ep as Einheitspreis,
  epa: null,
});

const zustand = (s: LvSitzung): LvZustand => {
  if (s.zustand === null) throw new Error('kein LV');
  return s.zustand;
};

async function lvMitPosition(): Promise<{ s: LvSitzung; id: PositionId; weg: Befehlsweg }> {
  const u = testUmgebung(await speicherImSpeicher());
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'P', 'B'));
  const projekt = (p.ok ? p.zustand : null) as Projekt;
  const s = lvSitzung(u, projekt.id, null);
  const maske = ozMaskeLesen('NN.NNNN');
  if (!maske.ok) throw new Error(maske.fehler);
  await s.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'LV', maske.wert));
  const id = u.ids.position();
  const r = await s.befehl({
    art: 'PositionAnlegen',
    id,
    ort: { art: 'ende', elternId: zustand(s).leistungsverzeichnis.id },
    daten: daten('Bauzaun', '7.450'),
  });
  if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
  const weg = befehlswegFuer(u);
  weg.anmelden(zustand(s).leistungsverzeichnis.id, s);
  return { s, id, weg };
}

const position = (s: LvSitzung, id: PositionId): Position => {
  const k = zustand(s).leistungsverzeichnis.knoten.find((x) => x.id === id);
  if (k?.art !== 'position') throw new Error('keine Position');
  return k;
};

describe('Kalkulation an der Position (B-19)', () => {
  it('Übernehmen speichert die Ansätze; der Dialog öffnet mit denselben Werten; Rückgängig nimmt alles zurück', async () => {
    const { s, id, weg } = await lvMitPosition();
    expect(formularAusPosition(position(s, id), false)).toEqual(LEERES_FORMULAR);

    const b = kalkulationBefehl(id, kalkulationRechnen(form, false));
    if (!b.ok) throw new Error(b.fehler);
    const r = await s.befehl(b.wert);
    expect(r.ok).toBe(true);
    const p = position(s, id);
    expect(p.einheitspreis).toBe('37.133');
    expect(p.epa?.lohn).toBe('24.008');

    // Der Dialog öffnet mit den gespeicherten Werten (de-DE, Stellen nach N3) und rechnet denselben EP.
    const wieder = formularAusPosition(p, false);
    expect(wieder).toEqual({
      zeilen: [
        { art: 'lohn', bezeichnung: 'Maurer', ansatzmenge: '0,450', kostensatz: '48,500' },
        { art: 'stoffe', bezeichnung: 'Stein', ansatzmenge: '2,000', kostensatz: '6,250' },
      ],
      saetze: { lohn: '10,00', stoffe: '5,00' },
      freiBezeichnung: '',
    });
    expect(kalkulationRechnen(wieder, false).ergebnis.einheitspreis).toBe('37.133');

    // Ein Undo-Schritt: EP, Anteile und Kalkulation wie vorher.
    expect((await weg.rueckgaengig()).ok).toBe(true);
    const vorher = position(s, id);
    expect(vorher.einheitspreis).toBe('7.450');
    expect(vorher.epa).toBeNull();
    expect(vorher.kalkulation).toBeUndefined();
  });

  it('die freie Bezeichnung kommt aus den Anteilen der Position zurück', async () => {
    const { s, id } = await lvMitPosition();
    const f: Kalkulationsformular = {
      zeilen: [{ art: 'frei', bezeichnung: 'Sperrfrist', ansatzmenge: '1', kostensatz: '3' }],
      saetze: {},
      freiBezeichnung: 'Verschiedenes',
    };
    const b = kalkulationBefehl(id, kalkulationRechnen(f, false));
    if (!b.ok) throw new Error(b.fehler);
    await s.befehl(b.wert);
    expect(formularAusPosition(position(s, id), false).freiBezeichnung).toBe('Verschiedenes');
  });

  it('Kalkulation entfernen lässt EP und Anteile stehen', async () => {
    const { s, id } = await lvMitPosition();
    const b = kalkulationBefehl(id, kalkulationRechnen(form, false));
    if (!b.ok) throw new Error(b.fehler);
    await s.befehl(b.wert);
    const r = await s.befehl(kalkulationEntfernenBefehl(position(s, id)));
    expect(r.ok).toBe(true);
    const p = position(s, id);
    expect(p.kalkulation).toBeUndefined();
    expect(p.einheitspreis).toBe('37.133');
    expect(p.epa?.stoffe).toBe('13.125');
    expect(formularAusPosition(p, false)).toEqual(LEERES_FORMULAR);
  });
});
