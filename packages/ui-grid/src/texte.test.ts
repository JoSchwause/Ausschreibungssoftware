// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { befehlshinweisText } from './texte';

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
