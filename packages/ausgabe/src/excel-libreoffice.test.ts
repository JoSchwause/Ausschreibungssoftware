// SPDX-License-Identifier: AGPL-3.0-or-later
// Die erzeugte Datei in LibreOffice (Ticket 61): öffnen und als CSV ausgeben (GP-Formeln rechnet LibreOffice beim
// Öffnen), und eine von LibreOffice neu gespeicherte .xlsx (Shared Strings, eigene Zahlschreibweise) zurücklesen.
// Läuft nur, wenn `soffice` vorhanden ist; sonst übersprungen (die CI hat es nicht).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { excelRuecklaufLesen, lvAlsExcel } from './index';
import { ausfuellen, excelText, typischAngebote, zahl, zeileVon } from './testhilfe/excel';
import { lvZustandAusFixture } from './testhilfen';

function sofficeVorhanden(): boolean {
  try {
    execFileSync('soffice', ['--version'], { stdio: 'ignore', timeout: 60_000 });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!sofficeVorhanden())('Excel-Datei in LibreOffice', () => {
  let ordner = '';

  /** Wandelt `name.xlsx` im Ordner in das Zielformat; eigenes Profil, damit parallele Läufe sich nicht stören. */
  function wandeln(name: string, ziel: string, aus: string): string {
    const profil = pathToFileURL(join(ordner, 'profil')).href;
    execFileSync(
      'soffice',
      [
        `-env:UserInstallation=${profil}`,
        '--headless',
        '--convert-to',
        ziel,
        '--outdir',
        join(ordner, aus),
        join(ordner, name),
      ],
      { stdio: 'ignore', timeout: 120_000 },
    );
    return join(ordner, aus, name.replace(/\.xlsx$/, `.${ziel.split(':')[0] ?? ''}`));
  }

  const { zustand } = lvZustandAusFixture('typisch');
  const angebot = typischAngebote()[1];
  if (angebot === undefined) throw new Error('Fixture ohne Bieter B');
  const bytes = ausfuellen(lvAlsExcel(zustand).bytes, angebot, (d) => zahl(excelText(d)));
  beforeAll(() => {
    ordner = mkdtempSync(join(tmpdir(), 'tethys-excel-'));
    writeFileSync(join(ordner, 'bieter-b.xlsx'), bytes);
  });
  afterAll(() => {
    rmSync(ordner, { recursive: true, force: true });
  });

  it('öffnet sich: CSV mit Kopf, allen Knoten und den von LibreOffice gerechneten GP der Fixture', () => {
    const csv = readFileSync(wandeln('bieter-b.xlsx', 'csv', 'csv'), 'utf8');
    const zeilen = csv.trimEnd().split('\n');
    expect(zeilen[2]).toBe('OZ,Kurztext,Merkmale,Menge,Einheit,EP,GP,Zuschlagssatz in %,Positions-ID');
    expect(zeilen).toHaveLength(3 + zustand.leistungsverzeichnis.knoten.length);
    for (const p of angebot.roh) {
      if (p.status !== 'angeboten' || 'zuschlagssatz' in p) continue;
      const zeile = zeilen[zeileVon(bytes, p.positionId) - 1] ?? '';
      const soll = angebot.sollGp.get(p.positionId) ?? '';
      // CSV schreibt die Zahl ohne Formatierung mit Komma (Gebietsschema des Prozesses ist egal: Feld in Anführung).
      const gp = /,"?([0-9.,-]*)"?,[^,]*,[0-9a-f-]{36}$/.exec(zeile)?.[1] ?? '';
      expect(gp.replace(',', '.'), zeile).toBe(excelText(soll));
    }
  });

  it('eine von LibreOffice neu gespeicherte Datei liefert dieselben Angebotspositionen', () => {
    const neu = readFileSync(wandeln('bieter-b.xlsx', 'xlsx:Calc MS Excel 2007 XML', 'xlsx'));
    const r = excelRuecklaufLesen(new Uint8Array(neu), zustand);
    expect(r.befunde).toEqual([]);
    expect(r.positionen).toEqual(angebot.positionen);
  });
});
