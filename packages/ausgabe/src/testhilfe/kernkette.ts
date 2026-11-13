// SPDX-License-Identifier: AGPL-3.0-or-later
// Testdaten der Ausgaben der Kernkette (Ticket 141), nicht exportiert über index.ts. Die Zahlen sind Eingaben, wie `vergabe`
// und `abrechnung` sie liefern würden, von Hand gesetzt (der Druck rechnet nichts, A2); Namen und Anschriften sind erfunden.

import type {
  AngebotId,
  Aufmass,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  Bieter,
  BieterId,
  Buero,
  Einheitspreis,
  GliederungId,
  LvZustand,
  Menge,
  PositionId,
  ProjektId,
  Prozent,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import type { PreisspiegelEingabe } from '../preisspiegel-druck';
import type { SollIstEingabe } from '../soll-ist-druck';
import type { RechnungspruefungEingabe } from '../rechnung-druck';
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

/** Ein Auftrags-LV aus einem LV (gleiche Knoten und Summen), mit Auftragnehmer; wie nach dem Zuschlag an Bieter A. */
export function auftragsLvAus(zustand: LvZustand): AuftragsLvZustand {
  const lv = zustand.leistungsverzeichnis;
  return {
    auftragsLeistungsverzeichnis: {
      ...lv,
      id: lv.id as string as AuftragsLeistungsverzeichnisId,
      leistungsverzeichnisId: lv.id,
      angebotId: A,
      auftragnehmer: { name: 'Beispielbau GmbH', strasse: 'Werkweg 2', plz: '20000', ort: 'Musterort' },
    },
    summen: zustand.summen,
  };
}

const m = (t: string): Menge => t as Menge;

/**
 * Aufmaßblatt 3 über `winzig`: 01.0010 mit Ansatz (Variable, Bezug), 01.0020 mit einem Ansatz, dessen Zeile einen Fehler hat
 * (keine Menge), 01.0030 von Hand, dazu eine Zeile zu einer Position, die das Auftrags-LV nicht kennt.
 */
export const AUFMASS: Aufmass = {
  id: 'aufmass-3' as AufmassId,
  projektId: 'projekt-1' as ProjektId,
  auftragsLvId: 'auftrags-lv' as AuftragsLeistungsverzeichnisId,
  nummer: 3,
  bezeichnung: 'Pflasterflächen Hof',
  datum: '2026-11-10',
  positionen: [
    { positionId: WINZIG.p3, mengenansatz: null, menge: m('4.000') },
    {
      positionId: WINZIG.p1,
      mengenansatz: [
        { zeile: 1, formel: 91, ausdruck: '2,5*0,4', variable: 'A' },
        { zeile: 2, formel: 91, ausdruck: 'A-0,765', variable: null },
      ],
      menge: m('1.235'),
    },
    {
      positionId: WINZIG.p2,
      mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '3,333/0', variable: null }],
      menge: null,
    },
    { positionId: 'fremd' as PositionId, mengenansatz: null, menge: m('1.000') },
  ],
};

/** Zeilenergebnisse, wie `mengen` sie zu den Ansätzen von `AUFMASS` rechnet. */
export const AUFMASS_ERGEBNISSE = [
  {
    positionId: WINZIG.p1,
    zeilen: [
      { zeile: 1, menge: m('1.000') },
      { zeile: 2, menge: m('0.235') },
    ],
  },
  { positionId: WINZIG.p2, zeilen: [{ zeile: 1, menge: null }] },
] as const;

const pz = (t: string): Prozent => t as Prozent;

/** Soll/Ist über `winzig`, wie `abrechnung` es rechnen würde: 01.0010 über der Schwelle, 01.0030 noch ohne Aufmaß. */
export const SOLL_IST: SollIstEingabe['sollIst'] = {
  zeilen: [
    {
      positionId: WINZIG.p1,
      soll: m('1.235'),
      ist: m('1.500'),
      differenz: m('0.265'),
      anteil: pz('121.46'),
      gpSoll: b('12.35'),
      gpIst: b('15.00'),
    },
    {
      positionId: WINZIG.p2,
      soll: m('3.333'),
      ist: m('3.000'),
      differenz: m('-0.333'),
      anteil: pz('90.01'),
      gpSoll: b('15.20'),
      gpIst: b('13.68'),
    },
    {
      positionId: WINZIG.p3,
      soll: m('5.000'),
      ist: m('0.000'),
      differenz: m('-5.000'),
      anteil: pz('0.00'),
      gpSoll: b('2537.45'),
      gpIst: b('0.00'),
    },
  ],
  gliederungen: [{ gliederungId: WINZIG.titel, gpSoll: b('2565.00'), gpIst: b('28.68') }],
  gesamt: { gpSoll: b('2565.00'), gpIst: b('28.68') },
  befunde: [{ code: 'ueber-schwelle', positionId: WINZIG.p1, anteil: pz('121.46') }],
};

/** Abschlagsrechnung 2 zu den Blättern 3 und 9 (Blatt 9 kennt die Eingabe nicht), mit Umlage, Sicherheitseinbehalt und Forderung. */
export const RECHNUNG: Rechnung = {
  id: 'rechnung-2' as RechnungId,
  projektId: 'projekt-1' as ProjektId,
  auftragsLvId: 'auftrags-lv' as AuftragsLeistungsverzeichnisId,
  nummer: 2,
  art: 'abschlag',
  eingang: '2026-11-12',
  rechnungsnummerAuftragnehmer: 'AR-0815',
  gefordert: { netto: b('30.00'), brutto: null, zahlbetrag: b('20.00') },
  aufmassIds: ['aufmass-9' as AufmassId, 'aufmass-3' as AufmassId],
  umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: pz('0.50') }],
  sicherheitSatz: pz('5.00'),
  gewaehrleistungSatz: null,
  freigabe: null,
};

/** Das Prüfergebnis zu `RECHNUNG`, wie `abrechnung` es rechnen würde (D-34, jeder Schritt auf 2 Stellen). */
export const PRUEFUNG: RechnungspruefungEingabe['pruefung'] = {
  leistungsstand: {
    positionen: [
      { positionId: WINZIG.p1, menge: m('1.500'), gp: b('15.00') },
      { positionId: WINZIG.p2, menge: m('3.000'), gp: b('13.68') },
      { positionId: WINZIG.p3, menge: null, gp: b('0.00') },
    ],
    leistung: b('28.68'),
    nachlass: b('0.00'),
    nettoNachNachlass: b('28.68'),
  },
  kette: {
    leistung: b('28.68'),
    nachlass: b('0.00'),
    nettoNachNachlass: b('28.68'),
    mwst: b('5.45'),
    bruttoKumuliert: b('34.13'),
    umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: pz('0.50'), betrag: b('0.17') }],
    einbehalt: { art: 'sicherheit', satz: pz('5.00'), betrag: b('1.71') },
    fruehere: [{ rechnungId: 'rechnung-1' as RechnungId, nummer: 1, zahlbetrag: b('10.00') }],
    fruehereZahlbetraege: b('10.00'),
    zahlbetrag: b('22.25'),
  },
  forderung: {
    netto: { gefordert: b('30.00'), geprueft: b('28.68'), differenz: b('1.32') },
    brutto: null,
    zahlbetrag: { gefordert: b('20.00'), geprueft: b('22.25'), differenz: b('-2.25') },
  },
};
