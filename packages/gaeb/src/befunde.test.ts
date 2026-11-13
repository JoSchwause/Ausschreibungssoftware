// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 136 Punkt 3 und 5: Befunde strukturiert für die Nutzersprache. Jeder Code hat einen deutschen Kurztext ohne
// „Vertrag“ und ohne Kennungen; Werte stehen als Daten am Befund, die OZ am Befund eines Knotens; was nicht übernommen wird,
// lässt sich zu „Nicht übernommen: …“ zusammenfassen; die Zeile der Datei nur, wo sie hilft. Seams: die drei Leser und
// die Hilfen `nichtUebernommeneAngaben`, `zeileHilft`, `BEFUNDTEXTE`.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AngebotId, BieterId, Knoten, Leistungsverzeichnis, ProjektId } from '@tethys/vertrag';
import { BEFUNDTEXTE, leseAngebot, leseGaeb, nichtUebernommeneAngaben, x31Lesen, zeileHilft } from './index';
import type { GaebBefund } from './index';
import {
  BVBS_MENGENERMITTLUNG,
  TEST_MWST,
  auftragsLvAus,
  lesePfad,
  leseTestdatei,
  testIds,
} from './testhilfen';

const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';
const lies = (bytes: Uint8Array, dateiname?: string) =>
  leseGaeb(bytes, {
    ids: testIds(),
    standardMwstSatz: TEST_MWST,
    ...(dateiname === undefined ? {} : { dateiname }),
  });

function lvAus(pfad: string): Leistungsverzeichnis {
  const l = lies(lesePfad(pfad));
  if (l.inhalt === null) throw new Error('LV nicht lesbar');
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  return { ...kopf, id: wurzelId, projektId: 'projekt-1' as ProjektId, knoten };
}

/** Alle GAEB-Dateien der Tests und Fixtures, je mit dem Leser, der sie liest. */
function alleBefunde(): { datei: string; befunde: readonly GaebBefund[] }[] {
  const ergebnis: { datei: string; befunde: readonly GaebBefund[] }[] = [];
  const ordner = [
    'fixtures/extern/bvbs/3.3-ava',
    'fixtures/extern/bvbs/3.3-bauausfuehrung',
    'fixtures/extern/bvbs/3.3-texterstellung',
    'fixtures/extern/gaeb/3.1-musterdateien',
    'packages/gaeb/testdaten/fehler',
  ];
  const wurzel = new URL('../../..', import.meta.url).pathname;
  for (const o of ordner)
    for (const d of readdirSync(join(wurzel, o)).filter((n) => /\.[xX]8[136]$/.test(n)))
      ergebnis.push({ datei: d, befunde: lies(lesePfad(`${o}/${d}`), d).befunde });
  const lv = lvAus(`${AVA}.X81`);
  const angebot = (bytes: Uint8Array) =>
    leseAngebot(bytes, { lv, angebotId: 'angebot-1' as AngebotId, bieterId: 'bieter-1' as BieterId });
  ergebnis.push({ datei: 'AVA.X84', befunde: angebot(lesePfad(`${AVA}.X84`)).befunde });
  ergebnis.push({ datei: 'fehler.x84', befunde: angebot(leseTestdatei('x84/fehler.x84')).befunde });
  const auftrag = auftragsLvAus(lesePfad(`${BVBS_MENGENERMITTLUNG}.x86`));
  ergebnis.push({
    datei: 'BVBS.x31',
    befunde: x31Lesen(lesePfad(`${BVBS_MENGENERMITTLUNG}.x31`), auftrag).befunde,
  });
  return ergebnis;
}
const ALLE = alleBefunde();

describe('Kurztexte je Code', () => {
  it('jeder gemeldete Code hat einen Kurztext', () => {
    const codes = new Set(ALLE.flatMap((d) => d.befunde.map((b) => b.code)));
    expect(codes.size).toBeGreaterThan(20);
    for (const c of codes) expect(BEFUNDTEXTE[c], c).toBeTruthy();
  });

  it('Kurztexte in Nutzersprache: kein „Vertrag“, keine Codes, keine Element- oder Funktionsnamen, keine Nummern', () => {
    for (const [code, kurz] of Object.entries(BEFUNDTEXTE)) {
      expect(kurz, code).toMatch(/^[A-ZÄÖÜ]/);
      expect(kurz, code).not.toMatch(/Vertrag|\b[a-z]+-[a-z]+\b|[a-z][A-Z]|[0-9]|`|lese[A-Z]|Ticket/);
    }
  });

  it('Meldungen der Leser ohne „Vertrag“, ohne Ticket- oder Entscheidungsnummern und ohne Funktionsnamen', () => {
    for (const { datei, befunde } of ALLE)
      for (const b of befunde)
        expect(b.meldung, `${datei}: ${b.code}`).not.toMatch(
          /Vertrag|\(G-\d|D-\d+|Ticket|lese[A-Z]|x31Lesen|Aufrufer/,
        );
  });
});

describe('Gruppe „Nicht übernommen“', () => {
  it('BVBS AVA X81: eine Liste von Bezeichnungen, jede einmal, in der Reihenfolge der Befunde', () => {
    const l = lies(lesePfad(`${AVA}.X81`));
    expect(nichtUebernommeneAngaben(l.befunde)).toEqual([
      'Textformatierung',
      'Zusatztext',
      'Projektbezeichnung',
      'Währung',
      'Bezeichnung der Währung',
      'Zulassung von Bieterkommentaren',
      'Vergabeart',
      'Ende der Zuschlagsfrist',
      'Bezeichnung des Leistungsverzeichnisses',
      'Datum des Leistungsverzeichnisses',
      'Katalog',
      'Kurztext eines Hinweistexts',
      'Vordersatz',
      'Zuordnung zu einem Katalog',
      'Nummer aus dem Standardleistungsbuch',
      'Zusatz zum Text',
      'Ausführungsbeschreibung',
      'Verweis auf eine Ausführungsbeschreibung',
      'Verweis auf eine Beschreibung',
      'Verweis auf eine Position',
      'Mengenaufteilung',
      'Kennzeichen „entfällt“',
    ]);
    // Die Einzelheiten bleiben an den Befunden: Pfad und Anzahl als Werte.
    const vordersatz = l.befunde.find((b) => b.nichtUebernommen === 'Vordersatz');
    expect(vordersatz?.werte).toEqual({
      element: { art: 'text', wert: 'Item/PredQty' },
      anzahl: { art: 'anzahl', wert: 68 },
    });
  });

  it('eine Angabe ohne eigene Bezeichnung trägt ihren Pfad', () => {
    const xml = new TextDecoder()
      .decode(leseTestdatei('fehler/09-menge-ohne-einheit.x83'))
      .replace('</PrjInfo>', '<Unbekannt>x</Unbekannt></PrjInfo>');
    expect(nichtUebernommeneAngaben(lies(new TextEncoder().encode(xml)).befunde)).toContain(
      'PrjInfo/Unbekannt',
    );
  });
});

describe('Ort: OZ am Befund, Zeile nur, wo sie hilft', () => {
  it('jeder Befund an einem Knoten mit OZ trägt diese OZ (LV, Angebot, Mengenermittlung)', () => {
    let geprueft = 0;
    const l = lies(lesePfad(`${AVA}.X86`));
    const knoten = new Map<string, Knoten>((l.inhalt?.knoten ?? []).map((k) => [k.id, k]));
    for (const b of l.befunde) {
      const k = b.ort.knotenId === undefined ? undefined : knoten.get(b.ort.knotenId);
      if (k === undefined || k.art === 'hinweis' || k.ordnungszahl === null) continue;
      expect(b.oz).toBe(`${k.ordnungszahl}${k.art === 'position' ? (k.ozIndex ?? '') : ''}`);
      geprueft += 1;
    }
    expect(geprueft).toBeGreaterThan(0);
    for (const { datei, befunde } of ALLE.filter(
      (d) => d.datei.endsWith('.x84') || d.datei.endsWith('.X84') || d.datei.endsWith('.x31'),
    ))
      for (const b of befunde.filter((x) => x.ort.knotenId !== undefined))
        expect(b.oz, `${datei}: ${b.code}`).toBeDefined();
  });

  it('Mengenermittlung: die Befunde einer Position tragen OZ und Anzahl als Daten', () => {
    const bvbs = ALLE.find((d) => d.datei === 'BVBS.x31')?.befunde ?? [];
    const formel = bvbs.find((b) => b.code === 'formel-nicht-unterstuetzt');
    expect(formel?.oz).toMatch(/^\d{3}\.\d{3}\.\d{4}/);
    expect(formel?.werte?.['anzahl']?.art).toBe('anzahl');
  });

  it('die Zeile hilft bei Fehlern im Aufbau der Datei, nicht an Positionen und nicht in der Gruppe „Nicht übernommen“', () => {
    const kaputt = lies(leseTestdatei('fehler/01-tag-nicht-geschlossen.x83'), '01.x83').befunde;
    expect(zeileHilft(kaputt.find((b) => b.code === 'xml-tag-nicht-geschlossen') as GaebBefund)).toBe(true);
    const ava = lies(lesePfad(`${AVA}.X81`)).befunde;
    expect(ava.filter((b) => b.nichtUebernommen !== undefined).some(zeileHilft)).toBe(false);
    const einheit = lies(leseTestdatei('fehler/09-menge-ohne-einheit.x83')).befunde.find(
      (b) => b.code === 'einheit-fehlt',
    );
    expect(einheit?.oz).toBeDefined();
    expect(zeileHilft(einheit as GaebBefund)).toBe(false);
  });
});
