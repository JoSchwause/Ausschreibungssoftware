// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeilen und Spalten der Kostenseiten für das gemeinsame Vergleichsgrid (U2, Ticket 89). Die Zahlen kommen fertig aus
// `kosten` (`kostenermittlungBerechnen`, `kostenkontrolleBerechnen`); hier wird nur formatiert (N4) und der Baum der
// Kostengliederung (Elternteil aus den Ziffern, D-24) in sichtbare Zeilen gelegt.

import { formatiereBetragDe } from '@tethys/dezimal';
import { kgElternteil, kgVorfahren } from '@tethys/kosten';
import type { Kostenermittlungsergebnis, Kostenkontrolle, Kostenkontrollwerte } from '@tethys/kosten';
import type { KennzeichenText, VergleichsSpalte, VergleichsSummenzeile, VergleichsZelle, VergleichsZeile } from '@tethys/ui-grid';
import { vorzeichen } from '@tethys/dezimal';
import type { Betrag, Kostengruppennummer } from '@tethys/vertrag';
import { texte } from './texte';

/** Bezeichnungen der Kostengruppen aus der CSV des Nutzers (G-16); fehlt eine Nummer, bleibt die Zelle leer. */
export type Bezeichnungen = ReadonlyMap<string, string>;

export interface KostenAnsicht {
  readonly spalten: readonly VergleichsSpalte[];
  readonly zeilen: readonly VergleichsZeile[];
  readonly summen: readonly VergleichsSummenzeile[];
}

const betrag = (b: Betrag): string => formatiereBetragDe(b);
const zelle = (text: string, extra: Omit<VergleichsZelle, 'text'> = {}): VergleichsZelle => ({ text, ...extra });

interface Baumknoten {
  readonly nummer: Kostengruppennummer;
}

/**
 * Die sichtbaren Zeilen eines Kostengruppenbaums: `gruppen` stehen nach Nummer (Elternteil vor Kindern), also in
 * Dokumentreihenfolge. Eine Gruppe ist sichtbar, wenn kein Vorfahr zugeklappt ist; die Tiefe ist die Zahl der Vorfahren.
 */
function baumZeilen<T extends Baumknoten>(
  gruppen: readonly T[],
  zugeklappt: ReadonlySet<string>,
  zellen: (g: T) => Readonly<Record<string, VergleichsZelle | undefined>>,
): VergleichsZeile[] {
  const hatKinder = new Set<string>();
  for (const g of gruppen) {
    const e = kgElternteil(g.nummer);
    if (e !== null) hatKinder.add(e);
  }
  const zeilen: VergleichsZeile[] = [];
  for (const g of gruppen) {
    if (kgVorfahren(g.nummer).some((v) => zugeklappt.has(v))) continue;
    const kinder = hatKinder.has(g.nummer);
    zeilen.push({
      id: g.nummer,
      art: kinder ? 'gliederung' : 'position',
      tiefe: kgVorfahren(g.nummer).length,
      hatUnterknoten: kinder,
      aufgeklappt: kinder && !zugeklappt.has(g.nummer),
      zellen: zellen(g),
    });
  }
  return zeilen;
}

// --- Kostenermittlung --------------------------------------------------------------------------------------------

/**
 * Ansicht einer Kostenermittlung. `bemerkungen`: je Nummer die Bemerkung des gespeicherten Eintrags (das Ergebnis der
 * Rechnung trägt sie nicht).
 */
export function ermittlungAnsicht(
  ergebnis: Pick<Kostenermittlungsergebnis, 'gruppen' | 'gesamtsumme'>,
  bezeichnungen: Bezeichnungen,
  bemerkungen: ReadonlyMap<string, string>,
  zugeklappt: ReadonlySet<string>,
): KostenAnsicht {
  const t = texte.editor;
  const spalten: VergleichsSpalte[] = [
    { id: 'nummer', kopf: t.spalteNummer, breite: 120 },
    { id: 'bezeichnung', kopf: t.spalteBezeichnung, breite: 260 },
    { id: 'eigener', kopf: t.spalteEigener, ausrichtung: 'rechts', breite: 140 },
    { id: 'summe', kopf: t.spalteSumme, ausrichtung: 'rechts', breite: 140 },
    { id: 'bemerkung', kopf: t.spalteBemerkung, breite: 260 },
  ];
  const zeilen = baumZeilen(ergebnis.gruppen, zugeklappt, (g) => ({
    nummer: zelle(g.nummer),
    bezeichnung: zelle(bezeichnungen.get(g.nummer) ?? ''),
    eigener: zelle(g.eigenerBetrag === null ? '' : betrag(g.eigenerBetrag)),
    summe: zelle(betrag(g.summe)),
    bemerkung: zelle(bemerkungen.get(g.nummer) ?? ''),
  }));
  return {
    spalten,
    zeilen,
    summen: [{ id: 'gesamt', zellen: { nummer: zelle(t.gesamt), summe: zelle(betrag(ergebnis.gesamtsumme)) } }],
  };
}

// --- Kostenkontrolle ---------------------------------------------------------------------------------------------

/** Texte der Kennzeichen der Abweichung (Symbol und Beschreibung in Worten, U8). */
export const KENNZEICHEN_TEXTE: Readonly<Record<string, KennzeichenText>> = {
  'ueber-budget': { symbol: '▲', beschreibung: texte.kontrolle.ueber },
  'unter-budget': { symbol: '▼', beschreibung: texte.kontrolle.unter },
};

/** Wertzellen einer Zeile; `null` ist leer („–“, D-82.5), die Abrechnung ist leer, solange es keine Rechnung gibt. */
function werte(w: Kostenkontrollwerte, mitAbrechnung: boolean): Record<string, VergleichsZelle> {
  const k = texte.kontrolle;
  const leer = zelle(k.leer);
  const abw = w.abweichung;
  return {
    budget: w.budget === null ? leer : zelle(betrag(w.budget)),
    vergabe: zelle(betrag(w.vergabe)),
    abrechnung: mitAbrechnung ? zelle(betrag(w.abrechnung)) : leer,
    abweichung:
      abw === null
        ? leer
        : vorzeichen(abw) > 0
          ? zelle(betrag(abw), { kennzeichen: ['ueber-budget'] })
          : vorzeichen(abw) < 0
            ? zelle(betrag(abw), { kennzeichen: ['unter-budget'] })
            : zelle(betrag(abw)),
  };
}

/**
 * Ansicht der Kostenkontrolle: der Baum der Kostengruppen, darunter fest die Zeilen „Ohne Kostengruppe“, „Nachlass“ und
 * „Gesamt“ (D-37). `mitAbrechnung`: es gibt mindestens einen Leistungsstand; sonst bleibt die Spalte leer.
 */
export function kontrolleAnsicht(
  kontrolle: Pick<Kostenkontrolle, 'kostengruppen' | 'ohneKostengruppe' | 'nachlass' | 'gesamt'>,
  bezeichnungen: Bezeichnungen,
  zugeklappt: ReadonlySet<string>,
  mitAbrechnung: boolean,
): KostenAnsicht {
  const k = texte.kontrolle;
  const spalten: VergleichsSpalte[] = [
    { id: 'nummer', kopf: k.spalteNummer, breite: 130 },
    { id: 'bezeichnung', kopf: k.spalteBezeichnung, breite: 260 },
    { id: 'budget', kopf: k.spalteBudget, ausrichtung: 'rechts', breite: 140 },
    { id: 'vergabe', kopf: k.spalteVergabe, ausrichtung: 'rechts', breite: 140 },
    { id: 'abrechnung', kopf: k.spalteAbrechnung, ausrichtung: 'rechts', breite: 140 },
    { id: 'abweichung', kopf: k.spalteAbweichung, ausrichtung: 'rechts', breite: 140 },
  ];
  const zeilen = baumZeilen(kontrolle.kostengruppen, zugeklappt, (g) => ({
    nummer: zelle(g.nummer),
    bezeichnung: zelle(bezeichnungen.get(g.nummer) ?? ''),
    ...werte(g, mitAbrechnung),
  }));
  const sonder = (id: string, name: string, w: Kostenkontrollwerte): VergleichsSummenzeile => ({
    id,
    zellen: { nummer: zelle(name), ...werte(w, mitAbrechnung) },
  });
  return {
    spalten,
    zeilen,
    summen: [
      sonder('ohne-kostengruppe', k.ohneKostengruppe, kontrolle.ohneKostengruppe),
      sonder('nachlass', k.nachlass, kontrolle.nachlass),
      sonder('gesamt', k.gesamt, kontrolle.gesamt),
    ],
  };
}
