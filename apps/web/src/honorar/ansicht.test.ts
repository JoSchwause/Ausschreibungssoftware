// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Pruefbefund } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befundAnsicht } from './ansicht';
import { BEFUNDTEXT, DIN276_HINWEIS } from './texte';

const befund = (code: string, schwere: Pruefbefund['schwere'], ort: Pruefbefund['ort']): Pruefbefund => ({
  schwere,
  quelle: 'honorarberechnung',
  code,
  meldung: `Meldung ${code}`,
  ort,
});

describe('Befunde der Honorarberechnung für die Seite', () => {
  it('nennt Objekt und Feld aus dem Ort (Pfad ab 1)', () => {
    const a = befundAnsicht(
      befund('honorarsatz-ausserhalb-spanne', 'warnung', { pfad: '/objekte[2]', feld: 'honorarsatz' }),
    );
    expect(a).toEqual({
      schwere: 'warnung',
      ort: 'Objekt 2, honorarsatz',
      text: 'Meldung honorarsatz-ausserhalb-spanne',
      code: 'honorarsatz-ausserhalb-spanne',
    });
  });

  it('ein Befund zur ganzen Berechnung hat nur das Feld; ohne Ort bleibt der Ort leer', () => {
    expect(befundAnsicht(befund('wert-negativ', 'warnung', { feld: 'mwstSatz' })).ort).toBe('mwstSatz');
    expect(befundAnsicht(befund('mehrere-objekte', 'warnung', {})).ort).toBe('');
  });

  it('die Stufen der Kostenermittlung haben einen eigenen Text, alle anderen die Meldung der Rechnung (D-110.4)', () => {
    for (const code of [
      'kostenermittlung-unbekannt',
      'kostenberechnung-vorhanden',
      'kostenermittlungsstufe-abweichend',
    ]) {
      expect(befundAnsicht(befund(code, 'warnung', {})).text).toBe(BEFUNDTEXT[code]);
    }
    expect(befundAnsicht(befund('ausserhalb-honorartafel', 'fehler', {})).text).toBe(
      'Meldung ausserhalb-honorartafel',
    );
    expect(befundAnsicht(befund('ausserhalb-honorartafel', 'fehler', {})).schwere).toBe('fehler');
  });
});

describe('Hinweis zu DIN 276', () => {
  it('ist ein fester Text mit Fassung und Paragraph, kein Befund (D-66)', () => {
    expect(DIN276_HINWEIS).toContain('§ 4 Abs. 1 HOAI');
    expect(DIN276_HINWEIS).toContain('DIN 276:2008-12');
  });
});
