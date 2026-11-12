// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 115 (X1e, D-52): DIN-277-Größen mit Eingaben des Nutzers und Kostenschätzung über Kennwerte aus den Eingaben der
// Oberfläche (de-DE). Sollwerte aus `fixtures/typisch-bim.json` (`erweitert.din277`, `erweitert.kostenschaetzung`).

import { readFileSync } from 'node:fs';
import { kostenermittlungBefehlAusfuehren } from '@tethys/kosten';
import type { Betrag, KostenermittlungId, Kostengruppennummer, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { groessenLesen, kennwerteLesen, kostenkennwerteZeilen, schaetzungBauen } from './kennwerte';
import { bauteil, hausModell, knoten, modell } from './testhilfen';

const fx = JSON.parse(
  readFileSync(new URL('../../../../fixtures/typisch-bim.json', import.meta.url), 'utf8'),
) as {
  erweitert: {
    din277: { summen: { bgf: string; bri: string; nrf: string } };
    kostenschaetzung: {
      kennwerte: { nummer: string; kennwert: string }[];
      eintraege: { nummer: string; betrag: string }[];
      gesamt: string;
    };
  };
};
const de = (s: string): string => s.replace('.', ',');

describe('groessenLesen', () => {
  it('am Haus: BGF, BRI und NRF aus dem Modell mit Quelle', () => {
    const g = groessenLesen(hausModell(), {});
    expect(g.groessen.bgf).toEqual({ art: 'BGF', wert: fx.erweitert.din277.summen.bgf, quelle: 'modell' });
    expect(g.groessen.bri).toEqual({ art: 'BRI', wert: fx.erweitert.din277.summen.bri, quelle: 'modell' });
    expect(g.groessen.nrf).toEqual({ art: 'NRF', wert: fx.erweitert.din277.summen.nrf, quelle: 'modell' });
    expect(g.fehler).toEqual({});
  });

  it('fehlt die Größe im Modell, gilt die Eingabe (als Eingabe gekennzeichnet); eine falsche Eingabe ist ein Feldfehler', () => {
    const m = modell([knoten('EG', 'geschoss', null)], [bauteil('W1', 'EG')]);
    expect(groessenLesen(m, {}).groessen.bgf).toMatchObject({ wert: null, quelle: 'modell' });
    const g = groessenLesen(m, { BGF: '120,5', BRI: 'abc', NRF: '  ' });
    expect(g.groessen.bgf).toEqual({ art: 'BGF', wert: '120.500', quelle: 'eingabe' });
    expect(g.groessen.bri.quelle).toBe('modell');
    expect(g.groessen.nrf.quelle).toBe('modell');
    expect(Object.keys(g.fehler)).toEqual(['BRI']);
  });
});

describe('Kostenschätzung über Kennwerte', () => {
  const zeilen = fx.erweitert.kostenschaetzung.kennwerte.map((k) => ({
    kostengruppe: k.nummer,
    bezug: 'BGF' as const,
    kennwert: de(k.kennwert),
  }));

  it('sechs Kostengruppen je m² BGF ergeben die Beträge und die Summe der Fixture; der Befehl geht durch `kosten`', () => {
    const { groessen } = groessenLesen(hausModell(), {});
    const r = schaetzungBauen({
      id: 'k1' as KostenermittlungId,
      projektId: 'p1' as ProjektId,
      name: 'Kostenschätzung aus dem Modell',
      groessen,
      zeilen,
    });
    expect(r.fehler).toEqual([]);
    if (r.schaetzung === null) throw new Error('keine Schätzung');
    expect(r.schaetzung.gesamt).toBe(fx.erweitert.kostenschaetzung.gesamt);
    expect(r.schaetzung.befehl.kostenermittlung.stufe).toBe('kostenschaetzung');
    expect(r.schaetzung.befehl.kostenermittlung.eintraege.map((e) => [e.nummer, e.betrag])).toEqual(
      fx.erweitert.kostenschaetzung.eintraege.map((e) => [e.nummer, e.betrag]),
    );
    expect(r.schaetzung.befehl.kostenermittlung.eintraege[0]?.bemerkung).toBe('BGF 197,596 m² × 148,30 €/m²');
    expect(kostenermittlungBefehlAusfuehren(null, r.schaetzung.befehl).ok).toBe(true);
  });

  it('Eingabefehler je Zeile und Feld statt einer Schätzung; leere Zeilen zählen nicht', () => {
    const r = kennwerteLesen([
      { kostengruppe: '32', bezug: 'BGF', kennwert: '1,00' },
      { kostengruppe: '330', bezug: 'BRI', kennwert: 'x' },
      { kostengruppe: '', bezug: 'BGF', kennwert: '' },
    ]);
    expect(r.fehler.map((f) => [f.zeile, f.feld])).toEqual([
      [0, 'kostengruppe'],
      [1, 'kennwert'],
    ]);
    expect(r.ansaetze).toEqual([]);
  });
});

describe('kostenkennwerteZeilen', () => {
  it('je Kostengruppe der bestehenden Ermittlung Summe je m² BGF und je m³ BRI', () => {
    const { groessen } = groessenLesen(hausModell(), {});
    const z = kostenkennwerteZeilen(
      [{ nummer: '320' as Kostengruppennummer, betrag: '29303.49' as Betrag }],
      groessen,
    );
    // 29.303,49 / 197,596 = 148,3000… → 148,30; / 617,485 = 47,4558… → 47,46
    expect(z.find((x) => x.nummer === '320')).toMatchObject({
      summe: '29303.49',
      jeBgf: '148.30',
      jeBri: '47.46',
    });
  });
});
