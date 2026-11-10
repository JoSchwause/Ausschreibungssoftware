// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des Angebotslesers X84 → `AngebotAnlegen` (Ticket 45). Zuerst geschrieben (Q1). Seam: `leseAngebot`.
//
// Golden-Dateien wie beim LV-Leser (`lesen.test.ts`): erste Zeile Zusammenfassung, dann ein Befund je Zeile.
// Aktualisieren nach einer gewollten Änderung: `GOLDEN_UPDATE=1 pnpm vitest run packages/gaeb`, dann den Diff prüfen.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  Angebotsposition,
  BieterId,
  Leistungsverzeichnis,
  Position,
  ProjektId,
  Pruefbefund,
} from '@tethys/vertrag';
import { leseAngebot, leseGaeb } from './index';
import type { AngebotLesung } from './index';
import { TEST_MWST, lesePfad, leseTestdatei, testIds } from './testhilfen';

const HIER = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HIER, '..', 'testdaten', 'golden');
const AKTUALISIEREN = process.env['GOLDEN_UPDATE'] === '1';

const ANGEBOT = 'angebot-1' as AngebotId;
const BIETER = 'bieter-1' as BieterId;
const PROJEKT = 'projekt-1' as ProjektId;

/** Das Ausschreibungs-LV aus einer X81/X83, wie die App es nach `LeistungsverzeichnisAnlegen` hält. */
function lvAus(bytes: Uint8Array): Leistungsverzeichnis {
  const l = leseGaeb(bytes, { ids: testIds(), standardMwstSatz: TEST_MWST });
  if (l.inhalt === null) throw new Error('LV nicht lesbar');
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  return { ...kopf, id: wurzelId, projektId: PROJEKT, knoten };
}

const lies = (bytes: Uint8Array | string, lv: Leistungsverzeichnis, dateiname?: string): AngebotLesung =>
  leseAngebot(bytes, {
    lv,
    angebotId: ANGEBOT,
    bieterId: BIETER,
    ...(dateiname === undefined ? {} : { dateiname }),
  });

const codes = (l: { befunde: readonly Pruefbefund[] }): string[] => l.befunde.map((b) => b.code);
const mitCode = (l: AngebotLesung, code: string): Pruefbefund[] => l.befunde.filter((b) => b.code === code);

/** Angebotsposition zur OZ (mit Index ohne Trenner dahinter, wie `Position.ozIndex`). */
function zeile(l: AngebotLesung, lv: Leistungsverzeichnis, oz: string, index: string | null = null): Angebotsposition {
  const p = lv.knoten.find(
    (k): k is Position => k.art === 'position' && k.ordnungszahl === oz && k.ozIndex === index,
  );
  if (!p) throw new Error(`OZ ${oz} nicht im LV`);
  const a = l.befehl?.angebot.positionen.find((x) => x.positionId === p.id);
  if (!a) throw new Error(`OZ ${oz} nicht im Angebot`);
  return a;
}

/** OZ des Knotens, an dem ein Befund hängt. */
function ozVon(lv: Leistungsverzeichnis, b: Pruefbefund): string | null {
  const k = lv.knoten.find((x) => x.id === b.ort.knotenId);
  return k && k.art !== 'hinweis' ? `${k.ordnungszahl ?? ''}${k.art === 'position' ? (k.ozIndex ?? '') : ''}` : null;
}

// --- Golden ----------------------------------------------------------------------------------------------

function zusammenfassung(datei: string, l: AngebotLesung): Record<string, unknown> {
  const ps = l.befehl?.angebot.positionen ?? [];
  const angeboten = ps.filter((p) => p.status === 'angeboten');
  return {
    datei,
    phase: l.phase,
    version: l.version,
    befehl: l.befehl === null ? null : l.befehl.art,
    nachlass: l.befehl?.angebot.nachlass ?? null,
    anzahl: {
      positionen: ps.length,
      angeboten: angeboten.length,
      nichtAngeboten: ps.length - angeboten.length,
      mitZuschlagssatz: angeboten.filter((p) => p.zuschlagssatz !== undefined).length,
      mitEpa: angeboten.filter((p) => p.epa !== null).length,
    },
    befunde: l.befunde.length,
  };
}

function vergleicheGolden(name: string, datei: string, l: AngebotLesung): void {
  const pfad = join(GOLDEN, `${name}.golden.jsonl`);
  const ist = [zusammenfassung(datei, l), ...l.befunde].map((z) => JSON.stringify(z)).join('\n') + '\n';
  if (AKTUALISIEREN) {
    mkdirSync(GOLDEN, { recursive: true });
    writeFileSync(pfad, ist);
  }
  expect(existsSync(pfad), `Golden fehlt: ${pfad} (GOLDEN_UPDATE=1 setzen)`).toBe(true);
  expect(ist).toBe(readFileSync(pfad, 'utf8'));
}

// --- Amtliche Prüfdatei AVA ---------------------------------------------------------------------------------

const AVA_X81 = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81';
const AVA_X84 = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84';

describe('BVBS AVA X84 gegen das LV aus der X81', () => {
  const lv = lvAus(lesePfad(AVA_X81));
  const l = lies(lesePfad(AVA_X84), lv, 'a.X84');
  const ps = l.befehl?.angebot.positionen ?? [];

  it('liefert einen AngebotAnlegen mit Kennungen des Aufrufers, Phase X84, Version 3.3', () => {
    expect(l.phase).toBe('X84');
    expect(l.version).toBe('3.3');
    expect(l.befehl?.art).toBe('AngebotAnlegen');
    expect(l.befehl?.angebot).toMatchObject({
      id: ANGEBOT,
      bieterId: BIETER,
      projektId: PROJEKT,
      leistungsverzeichnisId: lv.id,
      nachlass: null,
    });
  });

  it('ordnet alle 74 Positionen über die OZ zu: 68 mit EP, 6 Zuschlagspositionen mit Satz 10,00', () => {
    const lvPositionen = lv.knoten.filter((k) => k.art === 'position').map((k) => k.id);
    expect(ps.map((p) => p.positionId)).toEqual(lvPositionen);
    expect(ps).toHaveLength(74);
    expect(ps.every((p) => p.status === 'angeboten')).toBe(true);
    const mitSatz = ps.filter((p) => p.status === 'angeboten' && p.zuschlagssatz !== undefined);
    expect(mitSatz).toHaveLength(6);
    for (const oz of ['1.30.10.40', '1.30.20.40', '1.30.20.50', '1.30.20.70', '1.30.30.30', '1.30.30.40'])
      expect(zeile(l, lv, oz)).toMatchObject({ status: 'angeboten', zuschlagssatz: '10.00', einheitspreis: '0.000' });
    expect(codes(l)).not.toContain('position-unbekannt');
    expect(codes(l)).not.toContain('position-fehlt-im-angebot');
    expect(codes(l)).not.toContain('maske-abweichend');
  });

  it('Stichproben EP: 1.30.20.30 = 30,000; 1.10.30.20 = 27,910', () => {
    expect(zeile(l, lv, '1.30.20.30')).toMatchObject({ status: 'angeboten', einheitspreis: '30.000' });
    expect(zeile(l, lv, '1.10.30.20')).toMatchObject({ status: 'angeboten', einheitspreis: '27.910' });
  });

  it('EPA ohne LblUPComp in der Datei: nicht zugeordnet, ein Befund epa-nicht-abgebildet für die Datei', () => {
    expect(zeile(l, lv, '1.10.30.20')).toMatchObject({ epa: null });
    const b = mitCode(l, 'epa-nicht-abgebildet');
    expect(b).toHaveLength(1);
    expect(b[0]?.meldung).toContain('20 Werte');
  });

  it('gp-abweichend genau an 1.30.10.30 (900,00 gegen 855,00) und 1.10.10.60', () => {
    const b = mitCode(l, 'gp-abweichend');
    expect(b.map((x) => ozVon(lv, x))).toEqual(['1.10.10.60', '1.30.10.30']);
    expect(b[1]?.meldung).toContain('855.00');
    expect(b[1]?.meldung).toContain('900.00');
  });

  it('nachlass-nicht-abgebildet an 1.10.10.60, 1.30.10.30 und den Gliederungen 1.10.10, 1.10.15, 1.10.20, 1.10', () => {
    const b = mitCode(l, 'nachlass-nicht-abgebildet');
    expect(b.every((x) => x.schwere === 'fehler')).toBe(true);
    expect(b.map((x) => ozVon(lv, x))).toEqual(['1.10.10.60', '1.10.10', '1.10.15', '1.10.20', '1.10', '1.30.10.30']);
    expect(b[1]?.meldung).toContain('10.00 %');
    expect(b[3]?.meldung).toContain('-5.00 %');
    expect(b[4]?.meldung).toContain('10000.00');
  });

  it('Bietername aus CTR (Name1 bis Name4) als Vorschlag', () => {
    expect(l.bieter).toEqual({ name: 'Maler + Lackierer Pinsel und Co KG' });
  });

  it('leere Bieterergänzungen (Empty="Yes") sind kein Befund', () => {
    expect(codes(l)).not.toContain('bieterergaenzung-nicht-abgebildet');
  });

  it('Golden', () => {
    vergleicheGolden('angebot-ava-x84', 'BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X84', l);
  });

  it('ist deterministisch', () => {
    expect(lies(lesePfad(AVA_X84), lv)).toEqual(lies(lesePfad(AVA_X84), lv));
  });
});

// --- Amtliche Prüfdatei Bauausführung ------------------------------------------------------------------------

const BAU_X83 = 'fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';
const BAU_X84 = 'fixtures/extern/bvbs/3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84';

describe('BVBS Bauausführung X84 gegen das LV aus der X83', () => {
  const lv = lvAus(lesePfad(BAU_X83));
  const l = lies(lesePfad(BAU_X84), lv, 'b.x84');
  const ps = l.befehl?.angebot.positionen ?? [];

  it('ordnet alle 28 Positionen über die OZ (mit Index) zu', () => {
    expect(ps).toHaveLength(28);
    expect(ps.every((p) => p.status === 'angeboten')).toBe(true);
    expect(codes(l)).not.toContain('position-unbekannt');
    expect(codes(l)).not.toContain('position-fehlt-im-angebot');
    expect(zeile(l, lv, '001.001.0010', 'A')).toMatchObject({ einheitspreis: '600.000' });
  });

  it('002.001.0030 mit Satz 10,00; EP 002.001.0010 = 1,000 und 0020 = 2,000', () => {
    expect(zeile(l, lv, '002.001.0030')).toMatchObject({ status: 'angeboten', zuschlagssatz: '10.00' });
    expect(zeile(l, lv, '002.001.0010')).toMatchObject({ status: 'angeboten', einheitspreis: '1.000' });
    expect(zeile(l, lv, '002.001.0020')).toMatchObject({ status: 'angeboten', einheitspreis: '2.000' });
  });

  it('Bietername aus CTR', () => {
    expect(l.bieter).toEqual({ name: 'BVBS' });
  });

  it('IT 0.00 an der Alternativposition 001.002.0050 ist kein gp-abweichend', () => {
    expect(zeile(l, lv, '001.002.0050')).toMatchObject({ status: 'angeboten', einheitspreis: '12.000' });
    expect(codes(l)).not.toContain('gp-abweichend');
  });

  it('vier Bieterergänzungen mit Inhalt: ein zusammengefasster Befund', () => {
    const b = mitCode(l, 'bieterergaenzung-nicht-abgebildet');
    expect(b).toHaveLength(1);
    expect(b[0]?.meldung).toMatch(/^4 Textergänzungen/);
  });

  it('Golden', () => {
    vergleicheGolden('angebot-bauausfuehrung-x84', 'BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84', l);
  });
});

// --- Andere Version, andere Phase ----------------------------------------------------------------------------

describe('was leseAngebot nicht liest', () => {
  const lv = lvAus(lesePfad(AVA_X81));

  it('Musterdatei 3.1 (X84): kein Befehl, Befund version-nicht-unterstuetzt (G4)', () => {
    const l = lies(lesePfad('fixtures/extern/gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X84'), lv);
    expect(l.befehl).toBeNull();
    expect(l.version).toBe('3.1');
    expect(codes(l)).toContain('version-nicht-unterstuetzt');
  });

  it('eine X81 ist kein Angebot: Fehler phase-nicht-unterstuetzt, kein Befehl', () => {
    const l = lies(lesePfad(AVA_X81), lv);
    expect(l.befehl).toBeNull();
    expect(l.phase).toBe('X81');
    expect(mitCode(l, 'phase-nicht-unterstuetzt')[0]?.schwere).toBe('fehler');
  });
});
