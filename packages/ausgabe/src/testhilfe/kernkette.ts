// SPDX-License-Identifier: AGPL-3.0-or-later
// Testdaten der Ausgaben der Kernkette (Ticket 141), nicht exportiert über index.ts. Die Zahlen sind Eingaben, wie `vergabe`
// und `abrechnung` sie liefern würden, von Hand gesetzt (der Druck rechnet nichts, A2); Namen und Anschriften sind erfunden.

import type {
  AngebotId,
  Betrag,
  Bieter,
  BieterId,
  Buero,
  Einheitspreis,
  GliederungId,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import type { PreisspiegelEingabe } from '../preisspiegel-druck';
import type { ProjektKopf } from '../koepfe';
import { leseXlsx } from '../xlsx';
import type { GeleseneZelle } from '../xlsx';

const b = (t: string): Betrag => t as Betrag;
const ep = (t: string): Einheitspreis => t as Einheitspreis;

export const BUERO: Buero = {
  name: 'Planungsbüro Beispiel',
  anschrift: { strasse: 'Planweg 1', plz: '10002', ort: 'Beispielstadt' },
  telefon: '030 1234',
  email: 'info@example.org',
};

export const PROJEKT: ProjektKopf = {
  name: 'Neubau Beispiel',
  bauherr: { name: 'Beispiel-Bauherr GmbH', anschrift: null },
  angaben: {
    nummer: 'P-2026-07',
    ort: 'Beispielstadt',
    baustelle: { strasse: 'Baustraße 9', plz: '10001', ort: 'Beispielstadt' },
  },
};

/** Die Positionen und der Titel der Fixture `winzig`. */
export const WINZIG = {
  titel: '019b76da-a801-72f5-8596-20c74f02d75c' as GliederungId,
  p1: '019b76da-a802-7bff-9d9e-7e682fb1fa60' as PositionId,
  p2: '019b76da-a803-7621-97fc-e3fb328735e7' as PositionId,
  p3: '019b76da-a804-7766-aab7-27531c96e5e2' as PositionId,
} as const;

export const BIETER: readonly Bieter[] = [
  {
    id: 'bieter-a' as BieterId,
    name: 'Beispielbau GmbH',
    angaben: {
      anschrift: { strasse: 'Werkweg 2', plz: '20000', ort: 'Musterort' },
      ansprechperson: 'Frau Muster',
      email: null,
      telefon: '040 5678',
    },
  },
  { id: 'bieter-b' as BieterId, name: 'Musterbau AG' },
  { id: 'bieter-c' as BieterId, name: 'Probe & Söhne KG' },
];

const A = 'angebot-a' as AngebotId;
const B = 'angebot-b' as AngebotId;
const C = 'angebot-c' as AngebotId;

type Kennzeichen = 'angeboten' | 'nullpreis' | 'nicht-angeboten' | 'zuschlagssatz-fehlt';
const preis = (
  angebotId: AngebotId,
  e: string | null,
  g: string | null,
  kennzeichen: Kennzeichen = 'angeboten',
  ausreisser: 'hoch' | 'niedrig' | null = null,
) => ({
  angebotId,
  kennzeichen,
  einheitspreis: e === null ? null : ep(e),
  gesamtpreis: g === null ? null : b(g),
  ausreisser,
  zuschlag: null,
});
const vergleich = (e: string, g: string) => ({ einheitspreis: ep(e), gesamtpreis: b(g) });

/** Ein Preisspiegel über `winzig` mit drei Bietern: Ausreißer, nicht angeboten, Nullpreis, Nachlass bei Bieter B. */
export const PREISSPIEGEL: PreisspiegelEingabe['preisspiegel'] = {
  einstellungen: {
    ausreisserSchwelle: '20.00' as Prozent,
    abcSchwelleA: '80.00' as Prozent,
    abcSchwelleB: '95.00' as Prozent,
    abcBezug: 'mittel',
  },
  zeilen: [
    {
      positionId: WINZIG.p1,
      gehtInSummeEin: true,
      zuschlagsposition: false,
      schaetzpreis: { ...vergleich('10.000', '12.35'), zuschlag: null },
      bieter: [
        preis(A, '11.000', '13.59'),
        preis(B, '9.500', '11.73'),
        preis(C, '15.000', '18.53', 'angeboten', 'hoch'),
      ],
      min: vergleich('9.500', '11.73'),
      mittel: vergleich('11.833', '14.61'),
      max: vergleich('15.000', '18.53'),
      abcKlasse: 'C',
    },
    {
      positionId: WINZIG.p2,
      gehtInSummeEin: true,
      zuschlagsposition: false,
      schaetzpreis: { ...vergleich('4.560', '15.20'), zuschlag: null },
      bieter: [
        preis(A, '5.000', '16.67'),
        preis(B, null, null, 'nicht-angeboten'),
        preis(C, '0.000', '0.00', 'nullpreis'),
      ],
      min: vergleich('5.000', '16.67'),
      mittel: vergleich('5.000', '16.67'),
      max: vergleich('5.000', '16.67'),
      abcKlasse: 'C',
    },
    {
      positionId: WINZIG.p3,
      gehtInSummeEin: true,
      zuschlagsposition: false,
      schaetzpreis: { ...vergleich('507.490', '2537.45'), zuschlag: null },
      bieter: [
        preis(A, '500.000', '2500.00'),
        preis(B, '480.000', '2400.00'),
        preis(C, '520.000', '2600.00'),
      ],
      min: vergleich('480.000', '2400.00'),
      mittel: vergleich('500.000', '2500.00'),
      max: vergleich('520.000', '2600.00'),
      abcKlasse: 'A',
    },
  ],
  bietersummen: [
    {
      angebotId: A,
      bieterId: 'bieter-a' as BieterId,
      gesamt: {
        netto: b('2530.26'),
        nachlass: b('0.00'),
        nettoNachNachlass: b('2530.26'),
        mwst: b('480.75'),
        brutto: b('3011.01'),
      },
      nichtAngeboten: 0,
      rang: 2,
    },
    {
      angebotId: B,
      bieterId: 'bieter-b' as BieterId,
      gesamt: {
        netto: b('2411.73'),
        nachlass: b('50.00'),
        nettoNachNachlass: b('2361.73'),
        mwst: b('448.73'),
        brutto: b('2810.46'),
      },
      nichtAngeboten: 1,
      rang: 1,
    },
    {
      angebotId: C,
      bieterId: 'bieter-c' as BieterId,
      gesamt: {
        netto: b('2618.53'),
        nachlass: b('0.00'),
        nettoNachNachlass: b('2618.53'),
        mwst: b('497.52'),
        brutto: b('3116.05'),
      },
      nichtAngeboten: 0,
      rang: 3,
    },
  ],
  gliederungen: [
    {
      gliederungId: WINZIG.titel,
      summen: [
        { angebotId: A, summe: b('2530.26') },
        { angebotId: B, summe: b('2411.73') },
        { angebotId: C, summe: b('2618.53') },
      ],
    },
  ],
  virtuelleSummen: { min: b('2428.40'), mittel: b('2531.28'), max: b('2635.20'), schaetzpreis: b('2565.00') },
};

/** Die Zeilen des ersten Blatts einer .xlsx als Texte je Zelle (Zahlen in Punktnotation, wie die Datei sie trägt). */
export function excelZeilen(bytes: Uint8Array): string[][] {
  const lesung = leseXlsx(bytes);
  if (!lesung.ok) throw new Error(lesung.meldung);
  const max = Math.max(...lesung.zeilen.keys());
  return Array.from({ length: max }, (_, i) => {
    const z = lesung.zeilen.get(i + 1) ?? new Map<number, GeleseneZelle>();
    const breite = z.size === 0 ? 0 : Math.max(...z.keys()) + 1;
    return Array.from({ length: breite }, (_, s) => {
      const w = z.get(s)?.wert;
      return w === undefined || w.art === 'leer' ? '' : w.text;
    });
  });
}
