// SPDX-License-Identifier: AGPL-3.0-or-later
// Arbeitskalender (Ticket 102 Punkt 2, D-57): Arbeitstage der Woche, gesetzliche Feiertage des Landes, freie Tage des Plans.
// Ein Tag ist ein Arbeitstag, wenn sein Wochentag ein Arbeitstag ist und er weder Feiertag noch freier Tag ist. Rein (A2).

import type { Arbeitskalender, Bundesland, Kalenderdatum, Wochentag } from '@tethys/vertrag';
import type { Tagnummer } from './datum';
import { tagnummerLesen, wochentagVon, zivilAusTagnummer } from './datum';
import { LANDESFEIERTAGE, feiertageTagnummern } from './feiertage';

// Der Arbeitskalender ist der Vertragstyp v1.6 (Ticket 109). `freieTage` liest der Kalender als ungeprüfte Texte
// `JJJJ-MM-TT` (regionale und einmalige Feiertage, Betriebsruhe): Unlesbares übergeht er, die Rechnung meldet es als
// Befund (U5); der Ausführer lässt nur gültige zu.

/** Montag bis Freitag. */
export const STANDARD_ARBEITSTAGE: readonly Wochentag[] = [1, 2, 3, 4, 5];

/** Was der Kalender beim Lesen übergeht; die Rechnung macht daraus Befunde. */
export type Kalenderhinweis =
  | { readonly code: 'arbeitstag-ungueltig'; readonly wert: unknown }
  | { readonly code: 'bundesland-unbekannt'; readonly wert: unknown }
  | { readonly code: 'freier-tag-ungueltig'; readonly wert: string };

/** Geprüfter Kalender für schnelle Abfragen je Tagnummer (intern). Feiertage werden je Jahr einmal gerechnet. */
export class Tageskalender {
  readonly hinweise: readonly Kalenderhinweis[];
  /** Mindestens ein gültiger Wochentag ist Arbeitstag; sonst gibt es keinen Arbeitstag. */
  readonly hatArbeitstage: boolean;
  private readonly wochentage: ReadonlySet<number>;
  private readonly bundesland: Bundesland | null;
  private readonly frei: ReadonlySet<Tagnummer>;
  private readonly feiertageJeJahr = new Map<number, ReadonlySet<Tagnummer>>();

  constructor(kalender: Arbeitskalender) {
    const hinweise: Kalenderhinweis[] = [];
    const wochentage = new Set<number>();
    for (const w of kalender.arbeitstage as readonly unknown[]) {
      if (typeof w === 'number' && Number.isInteger(w) && w >= 1 && w <= 7) wochentage.add(w);
      else hinweise.push({ code: 'arbeitstag-ungueltig', wert: w });
    }
    const land: unknown = kalender.bundesland;
    let bundesland: Bundesland | null = null;
    if (typeof land === 'string' && Object.hasOwn(LANDESFEIERTAGE, land)) bundesland = land as Bundesland;
    else if (land !== null) hinweise.push({ code: 'bundesland-unbekannt', wert: land });
    const frei = new Set<Tagnummer>();
    for (const text of kalender.freieTage) {
      const tag = tagnummerLesen(text);
      if (tag.ok) frei.add(tag.wert);
      else hinweise.push({ code: 'freier-tag-ungueltig', wert: text });
    }
    this.hinweise = hinweise;
    this.hatArbeitstage = wochentage.size > 0;
    this.wochentage = wochentage;
    this.bundesland = bundesland;
    this.frei = frei;
  }

  istArbeitstag(tag: Tagnummer): boolean {
    if (!this.wochentage.has(wochentagVon(tag)) || this.frei.has(tag)) return false;
    return !this.feiertageIm(zivilAusTagnummer(tag).jahr).has(tag);
  }

  private feiertageIm(jahr: number): ReadonlySet<Tagnummer> {
    let tage = this.feiertageJeJahr.get(jahr);
    if (tage === undefined) {
      tage = new Set(feiertageTagnummern(jahr, this.bundesland).map((f) => f.tag));
      this.feiertageJeJahr.set(jahr, tage);
    }
    return tage;
  }
}

/** Ist der Tag ein Arbeitstag des Kalenders? Ein ungültiges `datum` (nur per Typumgehung möglich) wirft `RangeError`. */
export function istArbeitstag(kalender: Arbeitskalender, datum: Kalenderdatum): boolean {
  const tag = tagnummerLesen(datum);
  if (!tag.ok) throw new RangeError(tag.fehler.meldung);
  return new Tageskalender(kalender).istArbeitstag(tag.wert);
}
