// SPDX-License-Identifier: AGPL-3.0-or-later
// „Befunde beim Einlesen“ (E7, B-12): zusammengefasst statt einer Zeile je Befund, Texte aus Code und Werten, Zahlen
// deutsch (N4), keine Codes als Lesetext, Zeile nur, wo sie hilft. Seam: `befundeZusammenfassen`.

import { readFileSync } from 'node:fs';
import type { GaebBefund } from '@tethys/gaeb';
import type { Betrag, KnotenId, Prozent, Pruefbefund } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { appIdQuelle } from '../lv/ids';
import { befundeZusammenfassen } from './befunde';
import { lvLesen } from './gaeb';

const wurzel = new URL('../../../../', import.meta.url);
const datei = (pfad: string): Uint8Array => new Uint8Array(readFileSync(new URL(pfad, wurzel)));

const nicht = (pfad: string, bezeichnung: string, zeile: number): GaebBefund => ({
  schwere: 'warnung',
  quelle: 'gaeb-lesen',
  code: 'nicht-abgebildet',
  meldung: `${bezeichnung} (${pfad}) wird nicht übernommen.`,
  ort: { pfad: `/GAEB/${pfad}`, zeile },
  werte: { element: { art: 'text', wert: pfad }, anzahl: { art: 'anzahl', wert: 1 } },
  nichtUebernommen: bezeichnung,
});

describe('befundeZusammenfassen', () => {
  it('Kopfdaten stehen als eine Zeile „Nicht übernommen“, jede Bezeichnung einmal, in der Reihenfolge der Datei', () => {
    const z = befundeZusammenfassen([
      nicht('PrjInfo/Cur', 'Währung', 15),
      nicht('PrjInfo/LblPrj', 'Projektbezeichnung', 14),
      nicht('AwardInfo/Cur', 'Währung', 22),
    ]);
    expect(z.nichtUebernommen).toEqual(['Währung', 'Projektbezeichnung']);
    expect(z.gruppen).toEqual([]);
    expect(z.warnungen).toBe(3);
    expect(z.fehler).toBe(0);
    // Einzelheiten: alle drei, ohne Zeile (die Gruppe braucht sie nicht), Kurztext statt Code.
    expect(z.einzelheiten.map((e) => [e.titel, e.zeile])).toEqual([
      ['Nicht übernommen', null],
      ['Nicht übernommen', null],
      ['Nicht übernommen', null],
    ]);
    expect(z.einzelheiten[0]?.meldung).toBe('Währung (PrjInfo/Cur) wird nicht übernommen.');
  });

  it('übrige Befunde gruppiert nach Code mit Kurztext, Fehler zuerst, OZ gesammelt, Werte deutsch', () => {
    const satz: GaebBefund = {
      schwere: 'warnung',
      quelle: 'gaeb-lesen',
      code: 'mwst-ersatzwert',
      meldung: 'Die Datei trägt keinen Steuersatz; eingesetzt wird 19,00 %.',
      ort: { feld: 'mwstSatz' },
      werte: { satz: { art: 'prozent', wert: '19.00' as Prozent } },
    };
    const wahl = (oz: string): GaebBefund => ({
      schwere: 'warnung',
      quelle: 'gaeb-lesen',
      code: 'gliederungswahl-nicht-abgebildet',
      meldung: `Die Gliederung ${oz} ist eine Wahl.`,
      ort: { zeile: 3393, knotenId: `k-${oz}` as KnotenId },
      oz,
    });
    const gp: GaebBefund = {
      schwere: 'fehler',
      quelle: 'gaeb-lesen',
      code: 'gesamtpreis-abweichend',
      meldung: 'Der Gesamtpreis weicht ab.',
      ort: { zeile: 40 },
      oz: '01.0010',
      werte: {
        datei: { art: 'betrag', wert: '450000.00' as Betrag },
        gerechnet: { art: 'betrag', wert: '1234.50' as Betrag },
      },
    };
    const z = befundeZusammenfassen([satz, wahl('1.10.30'), gp, wahl('1.10.40')]);
    expect(z.gruppen).toEqual([
      {
        schwere: 'fehler',
        titel: 'Gesamtpreis der Datei weicht ab',
        anzahl: 1,
        oz: ['01.0010'],
        werte: 'Datei 450.000,00 €, gerechnet 1.234,50 €',
      },
      { schwere: 'warnung', titel: 'Steuersatz ergänzt', anzahl: 1, oz: [], werte: '19,00 %' },
      {
        schwere: 'warnung',
        titel: 'Wahl einer ganzen Gliederung nicht übernommen',
        anzahl: 2,
        oz: ['1.10.30', '1.10.40'],
        werte: null,
      },
    ]);
    expect(z.fehler).toBe(1);
    expect(z.warnungen).toBe(3);
    // Mit OZ hilft die Zeile nicht; ohne Knoten (Aufbau, Kopf) schon.
    expect(z.einzelheiten.map((e) => e.zeile)).toEqual([null, null, null, null]);
    expect(z.abweisung).toBeNull();
  });

  it('Zeile nur, wenn sie hilft: Aufbaufehler ohne Knoten nennt sie', () => {
    const z = befundeZusammenfassen([
      {
        schwere: 'fehler',
        quelle: 'gaeb-lesen',
        code: 'xml-tag-nicht-geschlossen',
        meldung: 'Der Abschnitt „Item“ ist nicht geschlossen.',
        ort: { zeile: 1200, spalte: 4 },
      } satisfies GaebBefund,
    ]);
    expect(z.einzelheiten).toEqual([
      {
        schwere: 'fehler',
        titel: 'Abschnitt nicht geschlossen',
        meldung: 'Der Abschnitt „Item“ ist nicht geschlossen.',
        oz: null,
        zeile: 1200,
      },
    ]);
  });

  it('eine abgewiesene Datei: der Satz steht vorn und nicht noch einmal in Gruppen und Einzelheiten', () => {
    const satz =
      'Die Datei ist ein Nebenangebot (X85). Nebenangebote werden nicht eingelesen. Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.';
    const z = befundeZusammenfassen([
      {
        schwere: 'fehler',
        quelle: 'gaeb-lesen',
        code: 'phase-nicht-unterstuetzt',
        meldung: satz,
        ort: { pfad: '/GAEB', zeile: 3 },
        werte: { phase: { art: 'text', wert: 'X85' } },
      } satisfies GaebBefund,
    ]);
    expect(z.abweisung).toBe(satz);
    expect(z.gruppen).toEqual([]);
    expect(z.einzelheiten).toEqual([]);
    expect(z.fehler).toBe(1);
  });

  it('Anzahl aus den Werten: ein Befund für 68 Vorkommen zählt 68', () => {
    const z = befundeZusammenfassen([
      {
        schwere: 'warnung',
        quelle: 'gaeb-lesen',
        code: 'bild-ungueltig',
        meldung: 'Bilder sind nicht lesbar (1.200 Vorkommen).',
        ort: {},
        werte: { anzahl: { art: 'anzahl', wert: 1200 } },
      } satisfies GaebBefund,
    ]);
    expect(z.gruppen).toEqual([
      { schwere: 'warnung', titel: 'Bild nicht lesbar', anzahl: 1200, oz: [], werte: null },
    ]);
  });

  it('Befunde anderer Leser (ohne Werte): Kurztext aus der übergebenen Liste, sonst die Meldung als Titel', () => {
    const b = (code: string, meldung: string, zeile?: number): Pruefbefund => ({
      schwere: 'warnung',
      quelle: 'ifc-lesen',
      code,
      meldung,
      ort: zeile === undefined ? {} : { pfad: '#12', zeile },
    });
    const z = befundeZusammenfassen(
      [
        b('menge-ohne-wert', 'Die Menge „NetVolume“ an #12 hat keinen Wert.', 12),
        b('menge-ohne-wert', 'Die Menge „NetArea“ an #14 hat keinen Wert.', 14),
        b('unbekannt', 'Etwas Seltenes.'),
      ],
      { 'menge-ohne-wert': 'Menge ohne Wert' },
    );
    expect(z.gruppen).toEqual([
      { schwere: 'warnung', titel: 'Menge ohne Wert', anzahl: 2, oz: [], werte: null },
      { schwere: 'warnung', titel: 'Etwas Seltenes.', anzahl: 1, oz: [], werte: null },
    ]);
    // Ohne Kurztext steht die Meldung nur einmal (als Titel, nicht noch als Text).
    expect(z.einzelheiten).toEqual([
      {
        schwere: 'warnung',
        titel: 'Menge ohne Wert',
        meldung: 'Die Menge „NetVolume“ an #12 hat keinen Wert.',
        oz: null,
        zeile: 12,
      },
      {
        schwere: 'warnung',
        titel: 'Menge ohne Wert',
        meldung: 'Die Menge „NetArea“ an #14 hat keinen Wert.',
        oz: null,
        zeile: 14,
      },
      { schwere: 'warnung', titel: 'Etwas Seltenes.', meldung: null, oz: null, zeile: null },
    ]);
  });

  it('BVBS-X83 (Bauausführung): 14 Warnungen, Kopfdaten in einer Zeile, nur der Steuersatz einzeln', () => {
    const v = lvLesen(
      datei('fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83'),
      'Pruefdatei.x83',
      appIdQuelle(),
    );
    const z = befundeZusammenfassen(v.befunde);
    expect(z.warnungen).toBe(14);
    expect(z.nichtUebernommen).toEqual([
      'Textformatierung',
      'Projektbezeichnung',
      'Währung',
      'Bezeichnung der Währung',
      'Zulassung von Bieterkommentaren',
      'Zusatztext',
      'Vorgangsnummer des Auftraggebers',
      'Bezeichnung des Leistungsverzeichnisses',
      'Datum des Leistungsverzeichnisses',
      'Zeitangabe des Leistungsverzeichnisses',
      'Kurztext eines Hinweistexts',
    ]);
    expect(z.gruppen).toEqual([
      { schwere: 'warnung', titel: 'Steuersatz ergänzt', anzahl: 1, oz: [], werte: '19,00 %' },
    ]);
    expect(z.einzelheiten).toHaveLength(14);
    expect(z.einzelheiten.every((e) => e.zeile === null)).toBe(true);
  });
});
