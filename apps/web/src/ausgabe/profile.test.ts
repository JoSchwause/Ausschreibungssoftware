// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90: Logik der eigenen Druckprofile (Ablage, Anlegen, Ändern, Löschen, Import, Dateiname).

import * as ausgabe from '@tethys/ausgabe';
import { describe, expect, it } from 'vitest';
import {
  alleProfile,
  dateinameProfil,
  eigeneAlsText,
  eigeneAusText,
  freierName,
  profilAendern,
  profilAnlegen,
  profilGleich,
  profilImportieren,
  profilLoeschen,
  zeilenLesen,
} from './profile';

const w = ausgabe;
const mein = (name: string) => ({ ...ausgabe.neuesDruckprofil(name), mitPreisen: false });
const stdName = (i: number): string => ausgabe.STANDARD_DRUCKPROFILE[i]?.name ?? '';

describe('Ablage', () => {
  it('Rundweg; Standardprofile stehen vor den eigenen', () => {
    const eigene = [mein('Bieter eng'), { ...mein('Kurz'), langtext: { art: 'zeilen' as const, anzahl: 3 } }];
    expect(eigeneAusText(w, eigeneAlsText(eigene))).toEqual(eigene);
    const alle = alleProfile(w, eigene);
    expect(alle.slice(0, 3).map((p) => p.name)).toEqual(ausgabe.STANDARD_DRUCKPROFILE.map((p) => p.name));
    expect(alle.slice(3)).toEqual(eigene);
  });
  it('Kaputtes, doppelte und Standardnamen fallen weg, nichts wirft', () => {
    expect(eigeneAusText(w, null)).toEqual([]);
    expect(eigeneAusText(w, 'kein json')).toEqual([]);
    expect(eigeneAusText(w, '{"a":1}')).toEqual([]);
    const text = JSON.stringify([mein('A'), mein('A'), mein(stdName(0)), 42, mein('B')]);
    expect(eigeneAusText(w, text).map((p) => p.name)).toEqual(['A', 'B']);
  });
});

describe('Anlegen, Ändern, Löschen', () => {
  it('Anlegen trimmt den Namen und weist leere, vergebene und Standardnamen ab', () => {
    const r = profilAnlegen(w, [], mein('  Neu  '));
    expect(r.ok && r.eigene.map((p) => p.name)).toEqual(['Neu']);
    expect(profilAnlegen(w, [], mein('  '))).toEqual({ ok: false, fehler: 'name-leer' });
    expect(profilAnlegen(w, [mein('Neu')], mein('Neu'))).toEqual({ ok: false, fehler: 'name-vergeben' });
    expect(profilAnlegen(w, [], mein(stdName(1)))).toEqual({ ok: false, fehler: 'name-standard' });
  });
  it('Ändern ersetzt am Platz, ein Standardprofil bleibt unveränderlich', () => {
    const a = mein('A');
    const r = profilAendern(w, [a, mein('B')], { ...a, titelsummen: false });
    expect(r.ok && r.eigene.map((p) => p.titelsummen)).toEqual([false, true]);
    expect(profilAendern(w, [a], mein(stdName(0)))).toEqual({ ok: false, fehler: 'name-standard' });
  });
  it('Löschen nimmt nur das benannte Profil', () => {
    expect(profilLoeschen([mein('A'), mein('B')], 'A').map((p) => p.name)).toEqual(['B']);
    expect(profilLoeschen([mein('A')], 'X').map((p) => p.name)).toEqual(['A']);
  });
});

describe('Freier Name und Import', () => {
  it('zählt hoch gegen eigene und Standardnamen', () => {
    expect(freierName(w, [], 'Neu')).toBe('Neu');
    expect(freierName(w, [mein('Neu')], 'Neu')).toBe('Neu (2)');
    expect(freierName(w, [mein('Neu'), mein('Neu (2)')], 'Neu')).toBe('Neu (3)');
    expect(freierName(w, [], '')).toBe('Profil');
    expect(freierName(w, [], stdName(2))).toBe(`${stdName(2)} (2)`);
  });
  it('Import hängt an und benennt bei Namenskollision um', () => {
    const text = ausgabe.druckprofilAlsJson(mein('Bieter'));
    const r = profilImportieren(w, [mein('Bieter')], text);
    expect(r.eigene.map((p) => p.name)).toEqual(['Bieter', 'Bieter (2)']);
    expect(r.umbenannt).toBe(true);
    expect(r.befunde).toEqual([]);
    const ohne = profilImportieren(w, [], text);
    expect(ohne.umbenannt).toBe(false);
    expect(ohne.profil?.name).toBe('Bieter');
  });
  it('Import einer fremden Datei: kein Profil, Befund, Liste unverändert', () => {
    const r = profilImportieren(w, [mein('A')], 'kein json');
    expect(r.profil).toBeNull();
    expect(r.befunde.map((b) => b.code)).toEqual(['kein-profil']);
    expect(r.eigene.map((p) => p.name)).toEqual(['A']);
  });
  it('Import mit unbekanntem Feld: Profil da, Befund steht', () => {
    const text = JSON.stringify({ schemaversion: 1, name: 'X', mitPreisen: false, blub: 1 });
    const r = profilImportieren(w, [], text);
    expect(r.profil?.mitPreisen).toBe(false);
    expect(r.befunde.map((b) => b.code)).toEqual(['unbekanntes-feld']);
  });
});

describe('Kleinigkeiten', () => {
  it('Dateiname ohne Sonderzeichen', () => {
    expect(dateinameProfil('Bieter: eng/kurz')).toBe('Bieter engkurz.druckprofil.json');
    expect(dateinameProfil('???')).toBe('Leistungsverzeichnis.druckprofil.json');
  });
  it('Zeilenzahl: 1 bis 999, sonst null', () => {
    expect(zeilenLesen('5')).toBe(5);
    expect(zeilenLesen(' 12 ')).toBe(12);
    for (const s of ['0', '1000', '-1', '2,5', '']) expect(zeilenLesen(s)).toBeNull();
  });
  it('profilGleich erkennt jede Feldänderung', () => {
    const a = mein('A');
    expect(profilGleich(a, { ...a })).toBe(true);
    expect(profilGleich(a, { ...a, seitenrand: 'eng' })).toBe(false);
    expect(profilGleich(a, { ...a, langtext: { art: 'zeilen', anzahl: 2 } })).toBe(false);
    const z = { ...a, langtext: { art: 'zeilen' as const, anzahl: 2 } };
    expect(profilGleich(z, { ...z })).toBe(true);
    expect(profilGleich(a, { ...a, kopfzeile: 'x' })).toBe(false);
  });
});
