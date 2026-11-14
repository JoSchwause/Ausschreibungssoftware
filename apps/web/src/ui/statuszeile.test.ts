// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { Statusspeicher, sicherungAnzeige, speicherAnzeige } from './statuszeile';

const a = 'p-a' as ProjektId;
const b = 'p-b' as ProjektId;
// 13.11.2026 14:05 und 12.11.2026 09:30 in Berlin (MEZ, UTC+1)
const spaet = Date.UTC(2026, 10, 13, 13, 5);
const frueh = Date.UTC(2026, 10, 12, 8, 30);
const BERLIN = 'Europe/Berlin';

describe('Statuszeile: Speicher', () => {
  it('sagt, ob der Browser die Daten dauerhaft hält', () => {
    expect(speicherAnzeige(true)?.text).toBe('Speicher: dauerhaft');
    expect(speicherAnzeige(false)?.text).toBe('Speicher: nicht dauerhaft');
    expect(speicherAnzeige(null)?.text).toBe('Speicher: unbekannt');
  });

  it('erklärt den Zustand und rät bei nicht dauerhaftem Speicher zum Sichern', () => {
    expect(speicherAnzeige(false)?.hinweis).toMatch(/löschen/);
    expect(speicherAnzeige(false)?.hinweis).toMatch(/sichern/);
  });

  it('zeigt nichts, solange der Zustand noch nicht abgefragt ist', () => {
    expect(speicherAnzeige(undefined)).toBeNull();
  });
});

describe('Statuszeile: letzte Sicherung', () => {
  const sicherungen = [
    { id: a, name: 'Musterhaus', zeit: frueh },
    { id: b, name: 'Turnhalle', zeit: spaet },
  ];

  it('im Projekt: dessen letzte Sicherung mit Datum und Uhrzeit', () => {
    expect(sicherungAnzeige(sicherungen, b, BERLIN)).toBe('Letzte Sicherung: 13.11.2026, 14:05');
    expect(sicherungAnzeige(sicherungen, a, BERLIN)).toBe('Letzte Sicherung: 12.11.2026, 09:30');
  });

  it('im Projekt ohne Sicherung: noch nicht gesichert (auch wenn die Liste das Projekt noch nicht kennt)', () => {
    expect(sicherungAnzeige([{ id: a, name: 'Musterhaus', zeit: null }], a, BERLIN)).toBe(
      'Noch nicht gesichert',
    );
    expect(sicherungAnzeige([], a, BERLIN)).toBe('Noch nicht gesichert');
  });

  it('ohne Projekt: die jüngste Sicherung mit dem Namen des Projekts', () => {
    expect(sicherungAnzeige(sicherungen, null, BERLIN)).toBe(
      'Letzte Sicherung: 13.11.2026, 14:05 (Turnhalle)',
    );
    expect(sicherungAnzeige([{ id: a, name: 'Musterhaus', zeit: null }], null, BERLIN)).toBe(
      'Noch keine Sicherung',
    );
  });

  it('ohne Projekte oder solange die Liste lädt: nichts', () => {
    expect(sicherungAnzeige([], null, BERLIN)).toBeNull();
    expect(sicherungAnzeige(null, a, BERLIN)).toBeNull();
  });
});

describe('Statusspeicher', () => {
  it('meldet Teile des Stands an die Hülle, Hörer nur bei einer Änderung', () => {
    const s = new Statusspeicher();
    let n = 0;
    const ab = s.abonnieren(() => {
      n += 1;
    });
    expect(s.lesen()).toEqual({ dauerhaft: undefined, sicherungen: null });
    s.melden({ dauerhaft: false });
    s.melden({ dauerhaft: false });
    s.melden({ sicherungen: [{ id: a, name: 'Musterhaus', zeit: null }] });
    expect(s.lesen()).toEqual({ dauerhaft: false, sicherungen: [{ id: a, name: 'Musterhaus', zeit: null }] });
    expect(n).toBe(2);
    ab();
    s.melden({ dauerhaft: true });
    expect(n).toBe(2);
  });
});
