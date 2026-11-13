// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Beispielwerte der Felder aus `vertrag` v1.7a (Ticket 139, Schema 7), selbst verfasst (C4), Namen erfunden, und
// eine zählende `IdQuelle` für das Einlesen als Kopie.

import type {
  Bieterangaben,
  Druckprofil,
  Einheitspreis,
  Einstellungen,
  IdQuelle,
  Kalkulationsangaben,
  Kostengruppennummer,
  Menge,
  PreisspiegelEinstellungen,
  Projektangaben,
  Prozent,
} from '@tethys/vertrag';

export const PROJEKTANGABEN: Projektangaben = {
  nummer: 'P-2026-017',
  ort: 'Musterstadt',
  baustelle: { strasse: 'Am Bauplatz 3', plz: '12345', ort: 'Musterstadt' },
};

export const BIETERANGABEN: Bieterangaben = {
  anschrift: { strasse: 'Werkstraße 7', plz: '54321', ort: null },
  ansprechperson: 'Frau Beispiel (erfunden)',
  email: 'angebot@example.org',
  telefon: null,
};

export const PREISSPIEGEL: PreisspiegelEinstellungen = {
  ausreisserSchwelle: '15.00' as Prozent,
  abcSchwelleA: '70.00' as Prozent,
  abcSchwelleB: '90.00' as Prozent,
  abcBezug: 'schaetzpreis',
};

export const KALKULATION: Kalkulationsangaben = {
  ansaetze: [
    {
      art: 'lohn',
      bezeichnung: 'Facharbeiter',
      ansatzmenge: '0.450' as Menge,
      kostensatz: '48.500' as Einheitspreis,
    },
    { art: 'stoffe', bezeichnung: 'Mörtel', ansatzmenge: null, kostensatz: '3.200' as Einheitspreis },
  ],
  zuschlagssaetze: { lohn: '12.50' as Prozent, stoffe: '8.00' as Prozent },
};

export const DRUCKPROFIL: Druckprofil = {
  name: 'Bieterversand (erfunden)',
  mitPreisen: false,
  langtext: { art: 'zeilen', anzahl: 3 },
  titelsummen: false,
  schlussblock: false,
  deckblatt: true,
  kopfzeile: '{lv}',
  fusszeile: null,
  seitenrand: 'eng',
};

export const EINSTELLUNGEN: Einstellungen = {
  buero: {
    name: 'Planungsbüro Beispiel (erfunden)',
    anschrift: { strasse: 'Hauptstraße 1', plz: '12345', ort: 'Musterstadt' },
    telefon: '0123 4567',
    email: null,
  },
  druckprofile: [DRUCKPROFIL, { ...DRUCKPROFIL, name: 'Mit Preisen (erfunden)', mitPreisen: true }],
  kostengruppenbezeichnungen: [
    { nummer: '330' as Kostengruppennummer, bezeichnung: 'Außenwände (eigene Bezeichnung)' },
    { nummer: '340' as Kostengruppennummer, bezeichnung: 'Innenwände (eigene Bezeichnung)' },
  ],
};

/**
 * Eine `IdQuelle`, die je Aufruf `<vorsilbe>-<art>-<n>` liefert (n zählt über alle Arten). Ein Proxy aus Funktionen: Er kommt
 * nicht über `postMessage` (wie die echte `IdQuelle` der App), darum prüft er nebenbei, dass nur Daten zum Worker gehen.
 */
export function zaehlendeIds(vorsilbe: string): IdQuelle & { readonly gezogen: () => readonly string[] } {
  const gezogen: string[] = [];
  return new Proxy({} as IdQuelle & { readonly gezogen: () => readonly string[] }, {
    get: (_, art) =>
      art === 'gezogen'
        ? () => gezogen
        : () => {
            const id = `${vorsilbe}-${String(art)}-${String(gezogen.length + 1)}`;
            gezogen.push(id);
            return id;
          },
  });
}
