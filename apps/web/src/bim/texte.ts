// SPDX-License-Identifier: AGPL-3.0-or-later
// Texte der Modellseiten (Ticket 114, L1): deutsch, an einer Stelle.

import type { Strukturknoten } from '@tethys/vertrag';

const strukturart: Record<Strukturknoten['art'], string> = {
  projekt: 'Projekt',
  grundstueck: 'Grundstück',
  gebaeude: 'Gebäude',
  geschoss: 'Geschoss',
  raum: 'Raum',
};

export const texte = {
  strukturart,
  baum: {
    beschriftung: 'Modellbaum',
    name: 'Name',
    klasse: 'Klasse',
    typ: 'Typ',
    laenge: 'Länge',
    flaeche: 'Fläche',
    volumen: 'Volumen',
    ohneStruktur: 'Ohne Strukturknoten',
    ohneName: (art: Strukturknoten['art']): string => `${strukturart[art]} ohne Namen`,
    ohneNameBauteil: 'Bauteil ohne Namen',
  },
  einlesen: {
    dateiGross: (bytes: number): string =>
      `Die Datei ist ${Math.round(bytes / 1_000_000).toLocaleString('de-DE')} MB groß. Einlesen und Anzeigen können lange dauern und viel Speicher brauchen.`,
  },
} as const;
