// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Excel-Dateien der Berichte (Ticket 141) in LibreOffice: Preisspiegel, Aufmaßblatt und Soll/Ist öffnen sich (Ausgabe
// als CSV), und eine von LibreOffice neu gespeicherte Datei trägt dieselben Zahlen. Läuft nur, wenn `soffice` vorhanden
// ist; sonst übersprungen (die CI hat es nicht), wie der Test des LV-Exports.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Prozent } from '@tethys/vertrag';
import { aufmassblattAlsExcel, preisspiegelAlsExcel, sollIstAlsExcel } from './index';
import { fixtureZustand } from './testhilfe/bau';
import {
  AUFMASS,
  AUFMASS_ERGEBNISSE,
  BIETER,
  PREISSPIEGEL,
  SOLL_IST,
  auftragsLvAus,
  excelZeilen,
} from './testhilfe/kernkette';

function sofficeVorhanden(): boolean {
  try {
    execFileSync('soffice', ['--version'], { stdio: 'ignore', timeout: 60_000 });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!sofficeVorhanden())('Excel der Berichte in LibreOffice', { timeout: 240_000 }, () => {
  let ordner = '';
  const { zustand } = fixtureZustand('winzig');
  const auftragsLv = auftragsLvAus(zustand);
  const dateien: Record<string, Uint8Array> = {
    'preisspiegel.xlsx': preisspiegelAlsExcel({ lv: zustand, preisspiegel: PREISSPIEGEL, bieter: BIETER }),
    'aufmass.xlsx': aufmassblattAlsExcel({ aufmass: AUFMASS, auftragsLv, ergebnisse: AUFMASS_ERGEBNISSE }),
    'sollist.xlsx': sollIstAlsExcel({
      auftragsLv,
      sollIst: SOLL_IST,
      optionen: { oberSchwelle: '110.00' as Prozent },
    }),
  };

  /** Wandelt die Dateien im Ordner in das Zielformat; eigenes Profil, damit parallele Läufe sich nicht stören. */
  function wandeln(ziel: string, aus: string): void {
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
        ...Object.keys(dateien).map((n) => join(ordner, n)),
      ],
      { stdio: 'ignore', timeout: 180_000 },
    );
  }

  beforeAll(() => {
    ordner = mkdtempSync(join(tmpdir(), 'tethys-bericht-'));
    for (const [name, bytes] of Object.entries(dateien)) writeFileSync(join(ordner, name), bytes);
    wandeln('csv', 'csv');
    wandeln('xlsx:Calc MS Excel 2007 XML', 'xlsx');
  });
  afterAll(() => {
    rmSync(ordner, { recursive: true, force: true });
  });

  it('öffnet jede Datei (CSV mit den Kopfzeilen der Tabelle)', () => {
    const csv = (name: string): string =>
      readFileSync(join(ordner, 'csv', name.replace('.xlsx', '.csv')), 'utf8');
    expect(csv('preisspiegel.xlsx')).toContain('Probe & Söhne KG EP');
    expect(csv('aufmass.xlsx')).toContain('OZ,Kurztext,Zeile,Formel,Ansatz,Ergebnis,Menge');
    expect(csv('sollist.xlsx')).toContain('OZ,Kurztext,Einh.,Soll,Ist,Differenz');
  });

  it('trägt nach dem Speichern in LibreOffice dieselben Zellen', () => {
    for (const [name, bytes] of Object.entries(dateien)) {
      const pfad = join(ordner, 'xlsx', name);
      expect(existsSync(pfad), name).toBe(true);
      const neu = excelZeilen(new Uint8Array(readFileSync(pfad)));
      const alt = excelZeilen(bytes);
      // LibreOffice schreibt Zahlen in eigener Schreibweise (etwa mit Exponent): verglichen wird der Wert.
      const wert = (t: string): string => (/^-?[0-9.]+(E-?[0-9]+)?$/.test(t) ? String(Number(t)) : t);
      expect(
        neu.map((r) => r.map(wert)),
        name,
      ).toEqual(alt.map((r) => r.map(wert)));
    }
  });
});
