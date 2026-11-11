// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein erfundener Preisspiegel für die Testseite des Vergleichsgrids (Ticket 60). Er spielt die Rolle der App: In der
// App rechnet `vergabe` und formatiert `dezimal`; hier entstehen die Texte aus ganzen Cent-Beträgen (exakt, keine
// Gleitkommazahl). Nur Testseite, nie Produktivcode.
//
// Aufbau: Titel „01“, „02“, … mit je bis zu `JE_TITEL` Positionen; je Bieter EP und GP, dazu die virtuellen Bieter
// Min, Mittel und Max. Kennzeichen nach der laufenden Nummer p der Position (ab 0):
//   p % 5 = 0: Bieter C mit 160 % des Grundpreises, Ausreißer „hoch“
//   p % 5 = 1: Bieter B hat nicht angeboten
//   p % 5 = 2: Bieter A mit 0,00 (Nullpreis)
//   p % 5 = 3: Bieter A mit 60 % des Grundpreises, Ausreißer „niedrig“
// Min/Max markieren den niedrigsten/höchsten Preis über 0,00 unter den Bietern.

import type {
  Kennzeichen,
  VergleichsSpalte,
  VergleichsSummenzeile,
  VergleichsZelle,
  VergleichsZeile,
} from '../../src/index';

export const JE_TITEL = 50;
const BIETERNAMEN = ['Bieter A', 'Bieter B', 'Bieter C', 'Bieter D', 'Bieter E'];
/** Aufschlag je Bieter in Promille des Grundpreises. */
const FAKTOR = [1000, 1050, 970, 1100, 930];

/** Ganze Cent als de-DE-Text, z. B. 123456 → „1.234,56“. */
export function cent(wert: number): string {
  const vorzeichen = wert < 0 ? '-' : '';
  const betrag = Math.abs(wert);
  const ganz = String(Math.floor(betrag / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${vorzeichen}${ganz},${String(betrag % 100).padStart(2, '0')}`;
}

export interface Preisspiegel {
  readonly spalten: VergleichsSpalte[];
  /** Alle Zeilen, aufgeklappt; die Testseite blendet zugeklappte Unterzeilen aus. */
  readonly zeilen: (VergleichsZeile & { elternId: string | null })[];
  readonly summen: VergleichsSummenzeile[];
}

export function erfindePreisspiegel(anzahlZeilen: number, anzahlBieter: number): Preisspiegel {
  const bieter = BIETERNAMEN.slice(0, anzahlBieter).map((name, b) => ({
    id: `b${String(b + 1)}`,
    name,
    faktor: FAKTOR[b] ?? 1000,
  }));
  const virtuell = [
    { id: 'min', name: 'Min' },
    { id: 'mittel', name: 'Mittel' },
    { id: 'max', name: 'Max' },
  ];
  const preisspalten = (id: string, name: string): VergleichsSpalte[] => [
    { id: `${id}-ep`, kopf: 'EP', gruppe: { id, kopf: name }, ausrichtung: 'rechts', breite: 136 },
    { id: `${id}-gp`, kopf: 'GP', gruppe: { id, kopf: name }, ausrichtung: 'rechts', breite: 120 },
  ];
  const spalten: VergleichsSpalte[] = [
    { id: 'oz', kopf: 'OZ', breite: 96 },
    { id: 'kurztext', kopf: 'Kurztext', breite: 260 },
    { id: 'menge', kopf: 'Menge', ausrichtung: 'rechts', breite: 80 },
    { id: 'einheit', kopf: 'Einheit', breite: 64 },
    ...bieter.flatMap((b) => preisspalten(b.id, b.name)),
    ...virtuell.flatMap((v) => preisspalten(v.id, v.name)),
  ];

  const zeilen: Preisspiegel['zeilen'] = [];
  const netto = bieter.map(() => 0);
  let titel: (VergleichsZeile & { elternId: string | null }) | null = null;
  let titelNr = 0;
  let imTitel = 0;
  let p = 0;
  while (zeilen.length < anzahlZeilen) {
    if (titel === null || imTitel === JE_TITEL) {
      titelNr++;
      imTitel = 0;
      const oz = String(titelNr).padStart(2, '0');
      titel = {
        id: `t${oz}`,
        elternId: null,
        art: 'gliederung',
        tiefe: 0,
        hatUnterknoten: true,
        aufgeklappt: true,
        zellen: { oz: { text: oz }, kurztext: { text: `Titel ${oz}` } },
      };
      zeilen.push(titel);
      continue;
    }
    imTitel++;
    const oz = `${titel.zellen['oz']?.text ?? ''}.${String(imTitel * 10).padStart(4, '0')}`;
    const menge = 10 + ((p * 13) % 90);
    const grund = 1000 + ((p * 7919) % 50000);
    const ep: (number | null)[] = bieter.map((b) => Math.round((grund * b.faktor) / 1000));
    const kennzeichen: Kennzeichen[][] = bieter.map(() => []);
    const fall = p % 5;
    if (fall === 0 && bieter.length > 2) {
      ep[2] = Math.round((grund * 1600) / 1000);
      kennzeichen[2]?.push('hoch');
    }
    if (fall === 1 && bieter.length > 1) {
      ep[1] = null;
      kennzeichen[1]?.push('nicht-angeboten');
    }
    if (fall === 2) {
      ep[0] = 0;
      kennzeichen[0]?.push('nullpreis');
    }
    if (fall === 3) {
      ep[0] = Math.round((grund * 600) / 1000);
      kennzeichen[0]?.push('niedrig');
    }
    const mitPreis = ep.filter((x): x is number => x !== null && x > 0);
    const min = Math.min(...mitPreis);
    const max = Math.max(...mitPreis);
    const mittel = Math.round(mitPreis.reduce((s, x) => s + x, 0) / mitPreis.length);
    const zellen: Record<string, VergleichsZelle> = {
      oz: { text: oz },
      kurztext: { text: `Leistung ${String(p + 1)}` },
      menge: { text: String(menge) },
      einheit: { text: 'm²' },
    };
    bieter.forEach((b, i) => {
      const preis = ep[i] ?? null;
      const k = kennzeichen[i] ?? [];
      if (preis === min && preis > 0) k.push('min');
      if (preis === max && preis > 0) k.push('max');
      if (preis === null) {
        zellen[`${b.id}-ep`] = { text: 'nicht angeboten', kennzeichen: k };
        zellen[`${b.id}-gp`] = { text: '' };
        return;
      }
      netto[i] = (netto[i] ?? 0) + preis * menge;
      zellen[`${b.id}-ep`] = {
        text: cent(preis),
        ...(k.length > 0 ? { kennzeichen: k } : {}),
        ...(k.includes('hoch') || k.includes('niedrig') ? { tooltip: `Mittel ${cent(mittel)}` } : {}),
      };
      zellen[`${b.id}-gp`] = { text: cent(preis * menge) };
    });
    for (const [id, wert] of [
      ['min', min],
      ['mittel', mittel],
      ['max', max],
    ] as const) {
      zellen[`${id}-ep`] = { text: cent(wert) };
      zellen[`${id}-gp`] = { text: cent(wert * menge) };
    }
    zeilen.push({
      id: `p${String(p)}`,
      elternId: titel.id,
      art: 'position',
      tiefe: 1,
      hatUnterknoten: false,
      aufgeklappt: false,
      zellen,
    });
    p++;
  }

  // Summenzeilen: Netto, Nachlass (Bieter B 2 %), Netto nach Nachlass, Brutto (19 %), Rang nach Netto nach Nachlass.
  const nachlass = netto.map((n, i) => (i === 1 ? Math.round((n * 2) / 100) : 0));
  const nachNachlass = netto.map((n, i) => n - (nachlass[i] ?? 0));
  const brutto = nachNachlass.map((n) => n + Math.round((n * 19) / 100));
  const reihenfolge = [...nachNachlass.keys()].sort(
    (a, b) => (nachNachlass[a] ?? 0) - (nachNachlass[b] ?? 0),
  );
  const rang = bieter.map((_, i) => reihenfolge.indexOf(i) + 1);
  const summenzeile = (id: string, name: string, werte: string[]): VergleichsSummenzeile => ({
    id,
    zellen: Object.fromEntries([
      ['kurztext', { text: name }],
      ...bieter.map((b, i) => [`${b.id}-gp`, { text: werte[i] ?? '' }]),
    ]) as Record<string, VergleichsZelle>,
  });
  const summen = [
    summenzeile('s-netto', 'Netto', netto.map(cent)),
    summenzeile('s-nachlass', 'Nachlass', nachlass.map(cent)),
    summenzeile('s-nach-nachlass', 'Netto nach Nachlass', nachNachlass.map(cent)),
    summenzeile('s-brutto', 'Brutto', brutto.map(cent)),
    summenzeile('s-rang', 'Rang', rang.map(String)),
  ];
  return { spalten, zeilen, summen };
}
