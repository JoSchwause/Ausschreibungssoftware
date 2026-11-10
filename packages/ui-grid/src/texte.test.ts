// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { befehlshinweisText, frageLoeschen, meldungZeilen } from './texte';

describe('Rückfrage beim Löschen', () => {
  const umfang = { knoten: 3, lose: 0, titel: 2, positionen: 41, mindestens: false };

  it('nennt Zeilen, Gliederungen und Positionen', () => {
    expect(frageLoeschen(umfang)).toBe('3 Zeilen in den Papierkorb legen, darunter 2 Titel mit 41 Positionen?');
    expect(frageLoeschen({ ...umfang, knoten: 1, titel: 1, positionen: 1 })).toBe(
      '1 Zeile in den Papierkorb legen, darunter 1 Titel mit 1 Position?',
    );
    expect(frageLoeschen({ ...umfang, titel: 0, lose: 1 })).toBe(
      '3 Zeilen in den Papierkorb legen, darunter 1 Los mit 41 Positionen?',
    );
    expect(frageLoeschen({ ...umfang, titel: 1, lose: 1, positionen: 0 })).toBe(
      '3 Zeilen in den Papierkorb legen, darunter 2 Gliederungen ohne Positionen?',
    );
  });

  it('ohne Gliederung nur die Zahl der Zeilen; zugeklappte Knoten machen die Zahl zur Mindestzahl', () => {
    expect(frageLoeschen({ knoten: 2, lose: 0, titel: 0, positionen: 2, mindestens: false })).toBe(
      '2 Zeilen in den Papierkorb legen?',
    );
    expect(frageLoeschen({ ...umfang, mindestens: true })).toBe(
      '3 Zeilen in den Papierkorb legen, darunter 2 Titel mit mindestens 41 Positionen?',
    );
  });
});

describe('Ansagen der Zeilenaktionen', () => {
  it('zählt Zeilen in Einzahl und Mehrzahl', () => {
    expect(meldungZeilen(1, 'kopiert')).toBe('1 Zeile kopiert.');
    expect(meldungZeilen(3, 'ausgeschnitten')).toBe('3 Zeilen ausgeschnitten.');
  });
});

describe('befehlshinweisText', () => {
  it('nennt je Hinweiscode einen deutschen Text für den Nutzer', () => {
    expect(befehlshinweisText('oz-schritt-ausgewichen')).toBe(
      'Die Ordnungszahlen wurden mit kleinerem Schritt vergeben.',
    );
    expect(befehlshinweisText('netto-nach-nachlass-negativ')).toBe('Das Netto nach Nachlass ist negativ.');
    expect(befehlshinweisText('oz-maske-ungueltig')).toBe('Die OZ-Maske ist ungültig.');
  });

  it('ein unbekannter Code ergibt den allgemeinen Text, damit ein neuer Code im Vertrag das Grid nicht bricht', () => {
    expect(befehlshinweisText('ein-kuenftiger-code')).toBe('Der Befehl wurde mit einem Hinweis ausgeführt.');
  });
});
