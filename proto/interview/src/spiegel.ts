// Wegwerfcode. Preisspiegel: Min / Mittel / Max, Ausreisser (+-20 %), Rangfolge.
// Mittel und Abweichung brauchen eine Division; dezimal hat keine. Darum BigInt auf Cent-Basis (exakt).
import { alsBetrag, gesamtpreis } from '@tethys/dezimal';
import type { Betrag, Knoten, Position } from '@tethys/vertrag';
import { ladeBieter, ladeLv, rechne } from './rechnen';
import type { BieterDaten, Rechnung, Summen } from './rechnen';

const cent = (b: Betrag): bigint => BigInt(b.replace('.', ''));
const vonCent = (c: bigint): Betrag => {
  const s = c.toString().padStart(3, '0');
  const r = alsBetrag(`${s.slice(0, -2)}.${s.slice(-2)}`);
  if (!r.ok) throw new Error('Cent-Wert ungueltig');
  return r.wert;
};
const halbHoch = (zaehler: bigint, nenner: bigint): bigint => (2n * zaehler + nenner) / (2n * nenner);

export interface Stat {
  min: Betrag | null;
  mittel: Betrag | null;
  max: Betrag | null;
}

export function statistik(werte: readonly (Betrag | null)[]): Stat {
  const da = werte.filter((w): w is Betrag => w !== null).map(cent);
  if (da.length === 0) return { min: null, mittel: null, max: null };
  const summe = da.reduce((a, b) => a + b, 0n);
  return {
    min: vonCent(da.reduce((a, b) => (b < a ? b : a))),
    mittel: vonCent(halbHoch(summe, BigInt(da.length))),
    max: vonCent(da.reduce((a, b) => (b > a ? b : a))),
  };
}

export interface SpiegelZelle {
  /** `null` = nicht angeboten (nicht dasselbe wie 0,00). */
  gp: Betrag | null;
  ausreisser: boolean;
  /** Abweichung vom Mittel als Text, z. B. "+45,3 %", nur wenn bewertbar. */
  abweichung: string | null;
  /** Staerke der Abweichung 0 bis 100 (Promille vom Mittel, auf 100 gekappt) fuer die Farbskala. */
  staerke: number;
  /** Rang unter den Bietern, die angeboten haben (1 = guenstigster GP); Gleichstand teilt den Rang. */
  rang: number | null;
}

export interface SpiegelZeile {
  knoten: Knoten;
  zellen: SpiegelZelle[];
  stat: Stat;
  schaetz: Betrag | null;
}

export interface Spiegel {
  bieter: BieterDaten[];
  rechnungen: Rechnung[];
  /** Gerechnet ueber die Positionen der Ausschreibung zum Zeitpunkt der Angebote. */
  zeilen: SpiegelZeile[];
  /** Summen je Bieter (Netto, Nachlass getrennt, Netto nach Nachlass, MwSt, Brutto). */
  summen: Summen[];
  /** Rangfolge nach Netto nach Nachlass: Index des Bieters, aufsteigend. */
  rangfolge: number[];
  nettoStat: Stat;
  nachStat: Stat;
  /** Je Bieter: Anzahl nicht angebotener Positionen. */
  nichtAngeboten: number[];
}

const MIN_WERTE = 3; // Annahme A7 der Fixtures: Ausreisser erst ab drei Werten

export function baueSpiegel(): Spiegel {
  const lv = ladeLv();
  const bieter = ladeBieter();
  const rechnungen = bieter.map((b) =>
    rechne(
      lv.knoten,
      (p: Position) => {
        const ep = b.ep.get(p.id);
        return ep && p.menge ? gesamtpreis(p.menge, ep) : null;
      },
      b.nachlass,
      lv.mwst,
    ),
  );
  const zeilen: SpiegelZeile[] = lv.knoten
    .filter((k): k is Position => k.art === 'position')
    .map((p) => {
      const werte = rechnungen.map((r) => r.gp.get(p.id) ?? null);
      const da = werte.filter((w): w is Betrag => w !== null);
      const n = BigInt(da.length);
      const summe = da.reduce((a, b) => a + cent(b), 0n);
      const bewertbar = da.length >= MIN_WERTE && summe > 0n;
      const sortiert = da.map(cent).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const zellen: SpiegelZelle[] = werte.map((w) => {
        if (w === null) return { gp: null, ausreisser: false, abweichung: null, staerke: 0, rang: null };
        const d = cent(w) * n - summe; // = n * (GP - Mittel)
        const betragD = d < 0n ? -d : d;
        return {
          gp: w,
          ausreisser: bewertbar && betragD * 5n > summe, // |GP - Mittel| / Mittel > 20 %
          abweichung: bewertbar ? prozentText(halbHoch(d * 1000n, summe)) : null,
          staerke: bewertbar ? Math.min(100, Number((betragD * 100n * 5n) / summe)) : 0,
          rang: sortiert.indexOf(cent(w)) + 1,
        };
      });
      return {
        knoten: p,
        zellen,
        stat: statistik(werte),
        schaetz: null,
      };
    });
  const summen = rechnungen.map((r) => r.summen);
  const rangfolge = summen
    .map((s, i) => ({ i, c: cent(s.nettoNachNachlass) }))
    .sort((a, b) => (a.c < b.c ? -1 : a.c > b.c ? 1 : 0))
    .map((x) => x.i);
  return {
    bieter,
    rechnungen,
    zeilen,
    summen,
    rangfolge,
    nettoStat: statistik(summen.map((s) => s.netto)),
    nachStat: statistik(summen.map((s) => s.nettoNachNachlass)),
    nichtAngeboten: rechnungen.map((r) => [...r.gp.values()].filter((g) => g === null).length),
  };
}

/** Abweichung in Promille als Text, z. B. 453 -> "+45,3 %". */
function prozentText(promille: bigint): string {
  const vz = promille > 0n ? '+' : promille < 0n ? '-' : '';
  const a = promille < 0n ? -promille : promille;
  return `${vz}${(a / 10n).toString()},${(a % 10n).toString()} %`;
}

/** Differenz von `a` zu `basis` als Text ("+0,9 %"), Promille gerundet. */
export function differenzText(a: Betrag, basis: Betrag): string {
  const b = cent(basis);
  if (b === 0n) return '';
  return prozentText(halbHoch((cent(a) - cent(basis)) * 1000n, b));
}

/** Anteil von `a` an `max` in Prozent (nur fuer die Breite eines Balkens, kein Betrag). */
export function anteil(a: Betrag, max: Betrag): number {
  const m = cent(max);
  return m === 0n ? 0 : Number((cent(a) * 10000n) / m) / 100;
}
