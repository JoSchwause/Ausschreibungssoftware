// SPDX-License-Identifier: AGPL-3.0-or-later
// CSV-Leser für Kostengruppen-Bezeichnungen (Ticket 55): Trenner, BOM, Kopfzeile, Anführungszeichen nach RFC 4180,
// Befunde je Zeile. Alle Bezeichnungen sind erfunden (G-16).

import { describe, expect, it } from 'vitest';
import { bezeichnungenLesen } from './index';

function alsObjekt(m: ReadonlyMap<string, string>): Record<string, string> {
  return Object.fromEntries(m);
}

describe('bezeichnungenLesen: Trenner, BOM, Kopfzeile', () => {
  it('liest Semikolon-CSV mit BOM, Kopfzeile und CRLF', () => {
    const r = bezeichnungenLesen('﻿Nummer;Bezeichnung\r\n100;Gruppe A\r\n110;Gruppe A1\r\n');
    expect(alsObjekt(r.bezeichnungen)).toEqual({ '100': 'Gruppe A', '110': 'Gruppe A1' });
    expect(r.trenner).toBe(';');
    expect(r.kopfzeile).toBe(true);
    expect(r.befunde).toEqual([]);
  });

  it('liest Komma-CSV ohne Kopfzeile, LF, ohne Zeilenende am Schluss', () => {
    const r = bezeichnungenLesen('200,Gruppe B\n210,Gruppe B1');
    expect(alsObjekt(r.bezeichnungen)).toEqual({ '200': 'Gruppe B', '210': 'Gruppe B1' });
    expect(r.trenner).toBe(',');
    expect(r.kopfzeile).toBe(false);
  });

  it('der erste Trenner außerhalb von Anführungszeichen in der ersten Zeile entscheidet', () => {
    expect(bezeichnungenLesen('100,"Gruppe A; Teil"\n').trenner).toBe(',');
    expect(bezeichnungenLesen('100;Gruppe A, Teil\n').trenner).toBe(';');
    expect(bezeichnungenLesen('\n\n100,Gruppe A\n').trenner).toBe(',');
  });

  it('ohne Trenner in der ersten Zeile gilt das Semikolon', () => {
    expect(bezeichnungenLesen('').trenner).toBe(';');
    expect(bezeichnungenLesen('﻿').bezeichnungen.size).toBe(0);
  });

  it('nimmt alte Mac-Zeilenenden (nur CR) an', () => {
    const r = bezeichnungenLesen('300;Gruppe C\r310;Gruppe C1\r');
    expect(alsObjekt(r.bezeichnungen)).toEqual({ '300': 'Gruppe C', '310': 'Gruppe C1' });
  });

  it('erkennt eine Kopfzeile nur, wenn ihre erste Zelle keine Ziffer enthält', () => {
    expect(bezeichnungenLesen('KG;Text\n100;Gruppe A').kopfzeile).toBe(true);
    const r = bezeichnungenLesen('Nr 1;Text\n100;Gruppe A');
    expect(r.kopfzeile).toBe(false);
    expect(r.befunde.map((b) => [b.code, b.zeile])).toEqual([['nummer-ungueltig', 1]]);
  });
});

describe('bezeichnungenLesen: Anführungszeichen (RFC 4180)', () => {
  it('Trenner, doppelte Anführungszeichen und Zeilenumbrüche im Feld', () => {
    const text = [
      '"Nr";"Bezeichnung"',
      '300;"Gruppe ""C""; mit Trenner"',
      '310;"zwei',
      'Zeilen"',
      '"320";"Komma, drin"',
    ].join('\r\n');
    const r = bezeichnungenLesen(text);
    expect(r.kopfzeile).toBe(true);
    expect(alsObjekt(r.bezeichnungen)).toEqual({
      '300': 'Gruppe "C"; mit Trenner',
      '310': 'zwei\r\nZeilen',
      '320': 'Komma, drin',
    });
  });

  it('Zeilennummern zählen physische Zeilen, auch nach mehrzeiligen Feldern', () => {
    const r = bezeichnungenLesen('310,"zwei\nZeilen"\n3x0,Gruppe X\n');
    expect(r.befunde.map((b) => [b.code, b.zeile])).toEqual([['nummer-ungueltig', 3]]);
  });

  it('offenes Anführungszeichen am Ende: Befund, Datensatz wird nicht übernommen', () => {
    const r = bezeichnungenLesen('100;Gruppe A\n110;"offen\n120;Gruppe B\n');
    expect(alsObjekt(r.bezeichnungen)).toEqual({ '100': 'Gruppe A' });
    expect(r.befunde.map((b) => [b.code, b.zeile])).toEqual([['anfuehrungszeichen-offen', 2]]);
  });

  it('Zeichen nach dem schließenden Anführungszeichen werden angehängt', () => {
    const r = bezeichnungenLesen('100;"Gruppe" A\n');
    expect(r.bezeichnungen.get('100' as never)).toBe('Gruppe A');
  });
});

describe('bezeichnungenLesen: Befunde je Zeile', () => {
  it('ungültige, doppelte und leere Einträge; Leerzeilen und Zusatzspalten stören nicht', () => {
    const text = [
      'Nummer;Bezeichnung', // 1
      '100;Gruppe A', // 2
      '1x0;Gruppe X', // 3 ungültig
      '100;Gruppe A doppelt', // 4 doppelt, die erste gilt
      '120;', // 5 leer
      '', // 6 übersprungen
      '130', // 7 Spalte fehlt
      ';;', // 8 übersprungen
      ' 140 ; Gruppe E ;Zusatz', // 9 Leerraum entfernt, Zusatzspalte ignoriert
      '050;Gruppe F', // 10 unter 100
    ].join('\n');
    const r = bezeichnungenLesen(text);
    expect(alsObjekt(r.bezeichnungen)).toEqual({ '100': 'Gruppe A', '140': 'Gruppe E' });
    expect(r.befunde.map((b) => [b.code, b.zeile, b.nummer])).toEqual([
      ['nummer-ungueltig', 3, null],
      ['nummer-doppelt', 4, '100'],
      ['bezeichnung-leer', 5, '120'],
      ['bezeichnung-leer', 7, '130'],
      ['nummer-ungueltig', 10, null],
    ]);
  });
});
