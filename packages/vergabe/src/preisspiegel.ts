// SPDX-License-Identifier: AGPL-3.0-or-later
// Preisspiegel-Rechnung (Ticket 36, Punkt 5). Die Ergebnistypen liegen hier, nicht in `vertrag` (D-04), bis ein anderes
// Paket sie braucht. Alle Rechnung über `@tethys/dezimal` (N1); Vergleiche mit Schwellen genau per Multiplikation,
// ohne gerundete Zwischenwerte. Jede vorläufige Annahme steht in `PREISSPIEGEL_ANNAHMEN`.

import {
  NULL_BETRAG,
  addiere,
  alsDezimal,
  dividiere,
  gesamtpreis,
  multipliziere,
  negiere,
  runden,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import { positionGehtInSumme, positionsSumme } from '@tethys/kern';
import type {
  AngebotId,
  AngebotZustand,
  Betrag,
  BieterId,
  Dezimal,
  Einheitspreis,
  Gesamtsummen,
  GliederungId,
  LvZustand,
  Menge,
  Position,
  PositionId,
  Prozent,
  Summenstand,
} from '@tethys/vertrag';
import { angebotSummenBerechnen, angebotspositionenNachId } from './summen';
import type { Preiskennzeichen } from './summen';

// --- Annahmen und Einstellungen -------------------------------------------------------------------------------------

/** Vorläufige Annahmen des Preisspiegels (Ticket 36), an genau einer Stelle. Entschieden ist D-05 (Demo-Modus). */
export const PREISSPIEGEL_ANNAHMEN = {
  status:
    'vorläufige Annahmen (Ticket 36, Demo-Modus); entschieden für die Demo: D-05 (Mittel nur über EP > 0)',
  keinEintrag: 'Eine Position ohne Eintrag im Angebot gilt als nicht angeboten.',
  negativerPreis:
    'Ein negativer EP ist „angeboten“, zählt aber wie 0,00 nicht für Min, Mittel, Max und ist nie Ausreißer.',
  maxNurPositiv: 'Auch Max bildet sich nur über EP > 0 (wie Min und Mittel nach D-05).',
  ausreisserBezug:
    'Verglichen wird der EP, unabhängig von der Menge (die Fixture-Annahme A7 vergleicht den GP; das weicht nur durch Rundung ab).',
  rang: 'Rang aufsteigend nach Netto nach Nachlass; gleiche Werte haben gleichen Rang (1, 1, 3).',
  virtuelleSummen:
    'Netto der virtuellen Bieter (Min, Mittel, Max, Schätzpreis) = Summe ihrer GP über die Positionen, die laut LV eingehen; ohne Nachlass.',
  abcSchwelleB: 'ABC-Schwelle B 95,00 % (nur A = 80 % ist durch G-26 belegt).',
  abcBezug: 'ABC-Bezug standardmäßig der virtuelle Bieter Mittel.',
  abcGrenze:
    'Die Position, die eine ABC-Schwelle überschreitet, gehört noch zur höheren Klasse (Klasse A, solange davor · 100 < A · gesamt).',
  gliederungssummen:
    'Bietersummen und Gliederungssummen werden aus dem übergebenen LV neu gerechnet (`angebotSummenBerechnen`), nicht aus dem gespeicherten Summenstand des Angebots.',
} as const;

export type AbcBezug = 'mittel' | 'schaetzpreis';

export interface PreisspiegelEinstellungen {
  /** Ausreißer, wenn der EP um mehr als diesen Anteil vom Mittel abweicht (G-26: einstellbar, Standard 20,00 %). */
  readonly ausreisserSchwelle: Prozent;
  readonly abcSchwelleA: Prozent;
  readonly abcSchwelleB: Prozent;
  readonly abcBezug: AbcBezug;
}

export const PREISSPIEGEL_STANDARD: PreisspiegelEinstellungen = {
  ausreisserSchwelle: '20.00' as Prozent,
  abcSchwelleA: '80.00' as Prozent,
  abcSchwelleB: '95.00' as Prozent,
  abcBezug: 'mittel',
};

// --- Ergebnistypen --------------------------------------------------------------------------------------------------

export type { Preiskennzeichen };
export type Ausreisser = 'hoch' | 'niedrig';
export type AbcKlasse = 'A' | 'B' | 'C';

export interface Bieterpreis {
  readonly angebotId: AngebotId;
  readonly kennzeichen: Preiskennzeichen;
  readonly einheitspreis: Einheitspreis | null;
  readonly gesamtpreis: Betrag | null;
  readonly ausreisser: Ausreisser | null;
}

export interface VirtuellerPreis {
  readonly einheitspreis: Einheitspreis | null;
  /** `gesamtpreis(Menge, EP)` (N2); `null` ohne Menge oder ohne EP. */
  readonly gesamtpreis: Betrag | null;
  /** Die Angebote, aus denen der Wert stammt (bei Min und Max alle mit diesem EP). */
  readonly angebotIds: readonly AngebotId[];
}

export interface Preisspiegelzeile {
  readonly positionId: PositionId;
  readonly menge: Menge | null;
  /** Geht die Position laut LV in die Summe ein (Bedarf, Wahl; Regel des Kerns)? */
  readonly gehtInSummeEin: boolean;
  /** Virtueller Bieter Schätzpreis: EP und GP aus dem LV. */
  readonly schaetzpreis: {
    readonly einheitspreis: Einheitspreis | null;
    readonly gesamtpreis: Betrag | null;
  };
  /** Je Angebot, in der Reihenfolge der übergebenen Angebote. */
  readonly bieter: readonly Bieterpreis[];
  readonly min: VirtuellerPreis;
  readonly mittel: VirtuellerPreis;
  readonly max: VirtuellerPreis;
  readonly abcKlasse: AbcKlasse | null;
}

/** Bietersumme eines Angebots samt Rang. */
export interface Bietersumme {
  readonly angebotId: AngebotId;
  readonly bieterId: BieterId;
  readonly gesamt: Gesamtsummen;
  /** Zahl der nicht angebotenen Positionen, die laut LV in die Summe eingehen. */
  readonly nichtAngeboten: number;
  readonly rang: number;
}

export interface Preisspiegelgliederung {
  readonly gliederungId: GliederungId;
  readonly summen: readonly { readonly angebotId: AngebotId; readonly summe: Betrag }[];
}

export interface Preisspiegel {
  readonly einstellungen: PreisspiegelEinstellungen;
  readonly zeilen: readonly Preisspiegelzeile[];
  readonly bietersummen: readonly Bietersumme[];
  readonly gliederungen: readonly Preisspiegelgliederung[];
  /** Netto der virtuellen Bieter (ohne Nachlass). */
  readonly virtuelleSummen: {
    readonly min: Betrag;
    readonly mittel: Betrag;
    readonly max: Betrag;
    readonly schaetzpreis: Betrag;
  };
}

// --- Rechnung -------------------------------------------------------------------------------------------------------

const zahl = (text: string): Dezimal => {
  const e = alsDezimal(text);
  if (!e.ok) throw new Error(`Konstante ${text} ist kein Dezimalwert`);
  return e.wert;
};
const HUNDERT = zahl('100.0');
const anzahl = (n: number): Dezimal => zahl(`${String(n)}.0`);

const KEIN_PREIS: VirtuellerPreis = { einheitspreis: null, gesamtpreis: null, angebotIds: [] };

const gp = (menge: Menge | null, e: Einheitspreis | null): Betrag | null =>
  menge === null || e === null ? null : gesamtpreis(menge, e);

interface Bepreist {
  readonly angebotId: AngebotId;
  readonly einheitspreis: Einheitspreis;
}

function extrem(menge: Menge | null, bepreist: readonly Bepreist[], richtung: 1 | -1): VirtuellerPreis {
  let best: Einheitspreis | null = null;
  for (const b of bepreist) {
    if (best === null || vergleiche(b.einheitspreis, best) === richtung) best = b.einheitspreis;
  }
  if (best === null) return KEIN_PREIS;
  const wert = best;
  return {
    einheitspreis: wert,
    gesamtpreis: gp(menge, wert),
    angebotIds: bepreist.filter((b) => vergleiche(b.einheitspreis, wert) === 0).map((b) => b.angebotId),
  };
}

/** Mittel-EP = Σ EP / n, kaufmännisch auf 3 Stellen (N3, `dividiere`). */
function mittel(menge: Menge | null, bepreist: readonly Bepreist[], summe: Dezimal): VirtuellerPreis {
  if (bepreist.length === 0) return KEIN_PREIS;
  const q = dividiere(summe, anzahl(bepreist.length), 3);
  if (!q.ok) throw new Error(`Mittel nicht berechenbar: ${q.fehler.meldung}`);
  const e = runden(q.wert, 'einheitspreis');
  return { einheitspreis: e, gesamtpreis: gp(menge, e), angebotIds: bepreist.map((b) => b.angebotId) };
}

/** G-26, D-05: n ≥ 2 Bieter mit EP > 0 und Σ > 0; strikt größer als die Schwelle, genau per Multiplikation. */
function ausreisser(e: Einheitspreis, n: number, summe: Dezimal, schwelle: Prozent): Ausreisser | null {
  const grenze = multipliziere(schwelle, summe);
  // (n · EP − Σ) · 100; „hoch“, wenn größer als Schwelle · Σ, „niedrig“, wenn (Σ − n · EP) · 100 größer ist.
  const abweichung = multipliziere(subtrahiere(multipliziere(anzahl(n), e), summe), HUNDERT);
  if (vergleiche(abweichung, grenze) > 0) return 'hoch';
  if (vergleiche(negiere(abweichung), grenze) > 0) return 'niedrig';
  return null;
}

function kennzeichenVon(e: Einheitspreis | null): Preiskennzeichen {
  if (e === null) return 'nicht-angeboten';
  return vorzeichen(e) === 0 ? 'nullpreis' : 'angeboten';
}

/** ABC-Klassen je Zeilenindex; Bezug ist der GP des gewählten virtuellen Bieters. */
function abcKlassen(
  zeilen: readonly Omit<Preisspiegelzeile, 'abcKlasse'>[],
  e: PreisspiegelEinstellungen,
): (AbcKlasse | null)[] {
  const bezug = (z: Omit<Preisspiegelzeile, 'abcKlasse'>): Betrag | null =>
    e.abcBezug === 'mittel' ? z.mittel.gesamtpreis : z.schaetzpreis.gesamtpreis;
  const kandidaten: { i: number; wert: Betrag }[] = [];
  zeilen.forEach((z, i) => {
    const wert = bezug(z);
    if (z.gehtInSummeEin && wert !== null && vorzeichen(wert) > 0) kandidaten.push({ i, wert });
  });
  // Absteigend nach GP, bei Gleichstand Dokumentreihenfolge (stabile Sortierung).
  kandidaten.sort((a, b) => vergleiche(b.wert, a.wert));
  const gesamt = summiereBetraege(kandidaten.map((k) => k.wert));
  const grenzeA = multipliziere(e.abcSchwelleA, gesamt);
  const grenzeB = multipliziere(e.abcSchwelleB, gesamt);
  const aus: (AbcKlasse | null)[] = zeilen.map(() => null);
  let davor: Betrag = NULL_BETRAG;
  for (const k of kandidaten) {
    const anteil = multipliziere(davor, HUNDERT);
    aus[k.i] = vergleiche(anteil, grenzeA) < 0 ? 'A' : vergleiche(anteil, grenzeB) < 0 ? 'B' : 'C';
    davor = addiere(davor, k.wert);
  }
  return aus;
}

const summeEingehend = (
  zeilen: readonly Omit<Preisspiegelzeile, 'abcKlasse'>[],
  wert: (z: Omit<Preisspiegelzeile, 'abcKlasse'>) => Betrag | null,
): Betrag =>
  summiereBetraege(
    zeilen.flatMap((z) => {
      const w = wert(z);
      return z.gehtInSummeEin && w !== null ? [w] : [];
    }),
  );

/**
 * Preisspiegel eines Ausschreibungs-LV über die übergebenen Angebote (G-26, D-05). Rein und deterministisch (A2).
 * Positionen im Papierkorb stehen nicht in `knoten` und kommen nicht vor.
 */
export function preisspiegelBerechnen(
  lv: LvZustand,
  angebote: readonly AngebotZustand[],
  einstellungen: Partial<PreisspiegelEinstellungen> = {},
): Preisspiegel {
  const e: PreisspiegelEinstellungen = { ...PREISSPIEGEL_STANDARD, ...einstellungen };
  const knoten = lv.leistungsverzeichnis.knoten;
  const positionen = knoten.filter((k): k is Position => k.art === 'position');
  const summen: Summenstand[] = angebote.map((a) => angebotSummenBerechnen(lv, a.angebot));
  const eintraege = angebote.map((a) => angebotspositionenNachId(a.angebot.positionen));
  const gpIndex = summen.map(
    (s) => new Map(s.positionen.map((p) => [p.positionId as string, p.gesamtpreis])),
  );

  const ohneAbc = positionen.map((p): Omit<Preisspiegelzeile, 'abcKlasse'> => {
    const preise = angebote.map((a, i) => {
      const eintrag = eintraege[i]?.get(p.id);
      return {
        angebotId: a.angebot.id,
        einheitspreis: eintrag?.status === 'angeboten' ? eintrag.einheitspreis : null,
      };
    });
    const bepreist: Bepreist[] = preise.flatMap((x) =>
      x.einheitspreis !== null && vorzeichen(x.einheitspreis) > 0
        ? [{ angebotId: x.angebotId, einheitspreis: x.einheitspreis }]
        : [],
    );
    let summe: Dezimal = zahl('0.000');
    for (const b of bepreist) summe = addiere<Dezimal>(summe, b.einheitspreis);
    const pruefen = bepreist.length >= 2 && vorzeichen(summe) > 0;
    const bieter = preise.map((x, i): Bieterpreis => {
      const kennzeichen = kennzeichenVon(x.einheitspreis);
      const positiv = x.einheitspreis !== null && vorzeichen(x.einheitspreis) > 0;
      return {
        angebotId: x.angebotId,
        kennzeichen,
        einheitspreis: x.einheitspreis,
        gesamtpreis: gpIndex[i]?.get(p.id) ?? null,
        ausreisser:
          pruefen && positiv && x.einheitspreis !== null
            ? ausreisser(x.einheitspreis, bepreist.length, summe, e.ausreisserSchwelle)
            : null,
      };
    });
    const schaetzpreis = { einheitspreis: p.einheitspreis, gesamtpreis: positionsSumme(p).gesamtpreis };
    return {
      positionId: p.id,
      menge: p.menge,
      gehtInSummeEin: positionGehtInSumme(p),
      schaetzpreis,
      bieter,
      min: extrem(p.menge, bepreist, -1),
      mittel: mittel(p.menge, bepreist, summe),
      max: extrem(p.menge, bepreist, 1),
    };
  });
  const abc = abcKlassen(ohneAbc, e);
  const zeilen = ohneAbc.map((z, i): Preisspiegelzeile => ({ ...z, abcKlasse: abc[i] ?? null }));

  const eingehend = positionen.filter((p) => positionGehtInSumme(p));
  const bietersummenOhneRang = angebote.map((a, i) => {
    const s = summen[i] as Summenstand;
    const nachId = eintraege[i];
    const nichtAngeboten = eingehend.filter((p) => nachId?.get(p.id)?.status !== 'angeboten').length;
    return { angebotId: a.angebot.id, bieterId: a.angebot.bieterId, gesamt: s.gesamt, nichtAngeboten };
  });
  const bietersummen = bietersummenOhneRang.map((b): Bietersumme => ({
    ...b,
    rang:
      1 +
      bietersummenOhneRang.filter(
        (x) => vergleiche(x.gesamt.nettoNachNachlass, b.gesamt.nettoNachNachlass) < 0,
      ).length,
  }));

  const gliederungsIndex = summen.map(
    (s) => new Map(s.gliederungen.map((g) => [g.gliederungId as string, g.summe])),
  );
  const gliederungen = knoten.flatMap((k): Preisspiegelgliederung[] =>
    k.art === 'los' || k.art === 'titel'
      ? [
          {
            gliederungId: k.id,
            summen: angebote.map((a, i) => ({
              angebotId: a.angebot.id,
              summe: gliederungsIndex[i]?.get(k.id) ?? NULL_BETRAG,
            })),
          },
        ]
      : [],
  );

  return {
    einstellungen: e,
    zeilen,
    bietersummen,
    gliederungen,
    virtuelleSummen: {
      min: summeEingehend(ohneAbc, (z) => z.min.gesamtpreis),
      mittel: summeEingehend(ohneAbc, (z) => z.mittel.gesamtpreis),
      max: summeEingehend(ohneAbc, (z) => z.max.gesamtpreis),
      schaetzpreis: summeEingehend(ohneAbc, (z) => z.schaetzpreis.gesamtpreis),
    },
  };
}
