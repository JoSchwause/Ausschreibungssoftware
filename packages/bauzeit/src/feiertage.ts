// SPDX-License-Identifier: AGPL-3.0-or-later
// Gesetzliche Feiertage rein aus Regeln (Ticket 102 Punkt 2, D-57): die bundesweiten und die landesweiten nach den
// Feiertagsgesetzen der Länder, je ab dem Jahr, in dem sie gelten. Nur regional geltende Feiertage (Fronleichnam in Teilen
// Sachsens und Thüringens, Mariä Himmelfahrt in Teilen Bayerns, Augsburger Friedensfest) und einmalige Feiertage
// (Reformationstag 2017 bundesweit; Berlin: 8. Mai 2020 und 2025, 17. Juni 2028) stehen hier nicht; sie trägt der Nutzer
// als freie Tage des Arbeitskalenders ein. Rein (A2).
//
// Stand: Feiertagsgesetze der Länder 2026 (Liste je Land unten mit Gesetz; gegengeprüft mit der Übersicht des DGB 2026).
// Abgebildet sind die Änderungen ab 1995 mit ihrem ersten Jahr; frühere Jahre rechnen mit dem Stand von 1995 (D-102.4).
// Genannt sind die Feiertage mit Namen im Gesetz. Hessen zählt dort alle Sonntage zu den Feiertagen; Sonntage regeln hier
// die Arbeitstage des Kalenders, nicht die Feiertagsliste.

import type { Bundesland } from '@tethys/vertrag';
import type { Datum, Tagnummer } from './datum';
import { datumAusTagnummer, tagnummerAusZivil, wochentagVon } from './datum';

export type Feiertagskennung =
  | 'neujahr'
  | 'heilige-drei-koenige'
  | 'frauentag'
  | 'karfreitag'
  | 'ostersonntag'
  | 'ostermontag'
  | 'erster-mai'
  | 'christi-himmelfahrt'
  | 'pfingstsonntag'
  | 'pfingstmontag'
  | 'fronleichnam'
  | 'mariae-himmelfahrt'
  | 'weltkindertag'
  | 'tag-der-deutschen-einheit'
  | 'reformationstag'
  | 'allerheiligen'
  | 'buss-und-bettag'
  | 'erster-weihnachtstag'
  | 'zweiter-weihnachtstag';

export interface Feiertag {
  readonly datum: Datum;
  readonly kennung: Feiertagskennung;
  /** Gebräuchlicher Name, z. B. „Tag der Deutschen Einheit“. */
  readonly name: string;
}

type Lage =
  | { readonly art: 'fest'; readonly monat: number; readonly tag: number }
  | { readonly art: 'ostern'; readonly abstand: number } // Tage nach Ostersonntag
  | { readonly art: 'buss-und-bettag' }; // Mittwoch vor dem 23. November

const REGELN: Readonly<Record<Feiertagskennung, { readonly name: string; readonly lage: Lage }>> = {
  neujahr: { name: 'Neujahr', lage: { art: 'fest', monat: 1, tag: 1 } },
  'heilige-drei-koenige': { name: 'Heilige Drei Könige', lage: { art: 'fest', monat: 1, tag: 6 } },
  frauentag: { name: 'Internationaler Frauentag', lage: { art: 'fest', monat: 3, tag: 8 } },
  karfreitag: { name: 'Karfreitag', lage: { art: 'ostern', abstand: -2 } },
  ostersonntag: { name: 'Ostersonntag', lage: { art: 'ostern', abstand: 0 } },
  ostermontag: { name: 'Ostermontag', lage: { art: 'ostern', abstand: 1 } },
  'erster-mai': { name: 'Tag der Arbeit', lage: { art: 'fest', monat: 5, tag: 1 } },
  'christi-himmelfahrt': { name: 'Christi Himmelfahrt', lage: { art: 'ostern', abstand: 39 } },
  pfingstsonntag: { name: 'Pfingstsonntag', lage: { art: 'ostern', abstand: 49 } },
  pfingstmontag: { name: 'Pfingstmontag', lage: { art: 'ostern', abstand: 50 } },
  fronleichnam: { name: 'Fronleichnam', lage: { art: 'ostern', abstand: 60 } },
  'mariae-himmelfahrt': { name: 'Mariä Himmelfahrt', lage: { art: 'fest', monat: 8, tag: 15 } },
  weltkindertag: { name: 'Weltkindertag', lage: { art: 'fest', monat: 9, tag: 20 } },
  'tag-der-deutschen-einheit': {
    name: 'Tag der Deutschen Einheit',
    lage: { art: 'fest', monat: 10, tag: 3 },
  },
  reformationstag: { name: 'Reformationstag', lage: { art: 'fest', monat: 10, tag: 31 } },
  allerheiligen: { name: 'Allerheiligen', lage: { art: 'fest', monat: 11, tag: 1 } },
  'buss-und-bettag': { name: 'Buß- und Bettag', lage: { art: 'buss-und-bettag' } },
  'erster-weihnachtstag': { name: '1. Weihnachtstag', lage: { art: 'fest', monat: 12, tag: 25 } },
  'zweiter-weihnachtstag': { name: '2. Weihnachtstag', lage: { art: 'fest', monat: 12, tag: 26 } },
};

/**
 * Die neun bundesweiten Feiertage: in den Feiertagsgesetzen aller Länder genannt, der 3. Oktober zudem nach Art. 2 Abs. 2
 * Einigungsvertrag.
 */
export const BUNDESWEITE_FEIERTAGE: readonly Feiertagskennung[] = [
  'neujahr',
  'karfreitag',
  'ostermontag',
  'erster-mai',
  'christi-himmelfahrt',
  'pfingstmontag',
  'tag-der-deutschen-einheit',
  'erster-weihnachtstag',
  'zweiter-weihnachtstag',
];

/** Ein landesweiter Feiertag über die bundesweiten hinaus; `ab` = erstes Jahr, fehlt = schon 1995. */
export interface Landesfeiertag {
  readonly kennung: Feiertagskennung;
  readonly ab?: number;
}

/** Je Land das Feiertagsgesetz (Quelle) und seine landesweiten Feiertage über die bundesweiten hinaus. */
export const LANDESFEIERTAGE: Readonly<
  Record<Bundesland, { readonly gesetz: string; readonly feiertage: readonly Landesfeiertag[] }>
> = {
  BW: {
    gesetz: 'Gesetz über die Sonntage und Feiertage (Feiertagsgesetz – FTG) Baden-Württemberg',
    feiertage: [
      { kennung: 'heilige-drei-koenige' },
      { kennung: 'fronleichnam' },
      { kennung: 'allerheiligen' },
    ],
  },
  BY: {
    // Mariä Himmelfahrt nur in Gemeinden mit überwiegend katholischer Bevölkerung, das Friedensfest nur in Augsburg:
    // regional, also freie Tage.
    gesetz: 'Gesetz über den Schutz der Sonn- und Feiertage (Feiertagsgesetz – FTG) Bayern, Art. 1',
    feiertage: [
      { kennung: 'heilige-drei-koenige' },
      { kennung: 'fronleichnam' },
      { kennung: 'allerheiligen' },
    ],
  },
  BE: {
    // Frauentag ab 2019 (Beschluss des Abgeordnetenhauses vom 24. Januar 2019).
    gesetz: 'Gesetz über die Sonn- und Feiertage (Berlin)',
    feiertage: [{ kennung: 'frauentag', ab: 2019 }],
  },
  BB: {
    gesetz:
      'Gesetz über die Sonn- und Feiertage (Feiertagsgesetz – FTG) Brandenburg vom 21. März 1991, § 2 Abs. 1',
    feiertage: [{ kennung: 'ostersonntag' }, { kennung: 'pfingstsonntag' }, { kennung: 'reformationstag' }],
  },
  HB: {
    gesetz: 'Gesetz über die Sonn-, Gedenk- und Feiertage (Bremen)',
    feiertage: [{ kennung: 'reformationstag', ab: 2018 }],
  },
  HH: {
    gesetz: 'Gesetz über Sonntage, Feiertage, Gedenktage und Trauertage (Feiertagsgesetz) Hamburg',
    feiertage: [{ kennung: 'reformationstag', ab: 2018 }],
  },
  HE: {
    gesetz: 'Hessisches Feiertagsgesetz (HFeiertagsG) vom 29. Dezember 1971, § 1 Abs. 1',
    feiertage: [{ kennung: 'fronleichnam' }],
  },
  MV: {
    // Frauentag ab 2023 (Landtagsbeschluss Juni 2022, Drucksache 8/793).
    gesetz: 'Gesetz über Sonn- und Feiertage (Feiertagsgesetz Mecklenburg-Vorpommern – FTG M-V)',
    feiertage: [{ kennung: 'frauentag', ab: 2023 }, { kennung: 'reformationstag' }],
  },
  NI: {
    gesetz: 'Niedersächsisches Gesetz über die Feiertage (NFeiertagsG)',
    feiertage: [{ kennung: 'reformationstag', ab: 2018 }],
  },
  NW: {
    gesetz: 'Gesetz über die Sonn- und Feiertage (Feiertagsgesetz NW)',
    feiertage: [{ kennung: 'fronleichnam' }, { kennung: 'allerheiligen' }],
  },
  RP: {
    gesetz: 'Landesgesetz über den Schutz der Sonn- und Feiertage (Feiertagsgesetz – LFtG) Rheinland-Pfalz',
    feiertage: [{ kennung: 'fronleichnam' }, { kennung: 'allerheiligen' }],
  },
  SL: {
    gesetz: 'Gesetz über die Sonn- und Feiertage (Feiertagsgesetz – SFG) Saarland',
    feiertage: [{ kennung: 'fronleichnam' }, { kennung: 'mariae-himmelfahrt' }, { kennung: 'allerheiligen' }],
  },
  SN: {
    // Fronleichnam nur in den Gemeinden der Fronleichnamsverordnung: regional, also freie Tage.
    gesetz: 'Gesetz über Sonn- und Feiertage im Freistaat Sachsen (SächsSFG)',
    feiertage: [{ kennung: 'reformationstag' }, { kennung: 'buss-und-bettag' }],
  },
  ST: {
    gesetz: 'Gesetz über die Sonn- und Feiertage (FeiertG LSA) Sachsen-Anhalt',
    feiertage: [{ kennung: 'heilige-drei-koenige' }, { kennung: 'reformationstag' }],
  },
  SH: {
    gesetz: 'Gesetz über Sonn- und Feiertage (SFTG) Schleswig-Holstein',
    feiertage: [{ kennung: 'reformationstag', ab: 2018 }],
  },
  TH: {
    // Weltkindertag ab 2019 (Drittes Gesetz zur Änderung des Thüringer Feier- und Gedenktagsgesetzes, Landtag
    // 28. Februar 2019); Fronleichnam nur in einzelnen Gemeinden: regional, also freie Tage.
    gesetz: 'Thüringer Feier- und Gedenktagsgesetz (ThürFGtG)',
    feiertage: [{ kennung: 'weltkindertag', ab: 2019 }, { kennung: 'reformationstag' }],
  },
};

/** Die 16 Länder in der Reihenfolge von {@link LANDESFEIERTAGE}. */
export const BUNDESLAENDER: readonly Bundesland[] = Object.keys(LANDESFEIERTAGE) as Bundesland[];

function jahrPruefen(jahr: number): void {
  if (!Number.isInteger(jahr) || jahr < 1 || jahr > 9999) {
    throw new RangeError(`Jahr muss eine ganze Zahl von 1 bis 9999 sein: ${String(jahr)}`);
  }
}

/** Ostersonntag als Tagnummer (Verfahren von Meeus/Jones/Butcher für den gregorianischen Kalender). */
export function ostersonntagTagnummer(jahr: number): Tagnummer {
  jahrPruefen(jahr);
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return tagnummerAusZivil(jahr, monat, tag);
}

/** Ostersonntag eines Jahres (1 bis 9999) nach der gregorianischen Osterformel. */
export function ostersonntag(jahr: number): Datum {
  return datumAusTagnummer(ostersonntagTagnummer(jahr));
}

function tagnummerDerLage(lage: Lage, jahr: number, ostern: () => Tagnummer): Tagnummer {
  switch (lage.art) {
    case 'fest':
      return tagnummerAusZivil(jahr, lage.monat, lage.tag);
    case 'ostern':
      return ostern() + lage.abstand;
    case 'buss-und-bettag': {
      // Mittwoch (3) vor dem 23. November, also der Mittwoch zwischen dem 16. und 22. November.
      const t23 = tagnummerAusZivil(jahr, 11, 23);
      return t23 - ((wochentagVon(t23) - 3 + 7) % 7 || 7);
    }
  }
}

/** Gesetzliche Feiertage eines Jahres als Tagnummern mit Kennung, nach Datum geordnet. */
export function feiertageTagnummern(
  jahr: number,
  bundesland: Bundesland | null,
): readonly { readonly tag: Tagnummer; readonly kennung: Feiertagskennung }[] {
  jahrPruefen(jahr);
  let osterTag: Tagnummer | null = null;
  const ostern = (): Tagnummer => (osterTag ??= ostersonntagTagnummer(jahr));
  const kennungen: Feiertagskennung[] = [...BUNDESWEITE_FEIERTAGE];
  if (bundesland !== null) {
    for (const f of LANDESFEIERTAGE[bundesland].feiertage) {
      if (f.ab === undefined || jahr >= f.ab) kennungen.push(f.kennung);
    }
  }
  return kennungen
    .map((kennung) => ({ tag: tagnummerDerLage(REGELN[kennung].lage, jahr, ostern), kennung }))
    .sort((x, y) => x.tag - y.tag);
}

/**
 * Die gesetzlichen Feiertage eines Jahres (1 bis 9999): die bundesweiten und, mit Land, dessen landesweite, nach Datum
 * geordnet. Ein Feiertag zählt auch, wenn er auf ein Wochenende fällt.
 */
export function feiertage(jahr: number, bundesland: Bundesland | null): readonly Feiertag[] {
  return feiertageTagnummern(jahr, bundesland).map(({ tag, kennung }) => ({
    datum: datumAusTagnummer(tag),
    kennung,
    name: REGELN[kennung].name,
  }));
}
