// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Modell der Navigation (Ticket 131, E1): zu welchem Bereich der Seitenleiste eine Seite gehört, welche Gegenstände ihre
// Brotkrumen nennen und wie daraus Krumen und Fenstertitel werden. Ohne React und ohne Speicher; die Namen lädt
// `OrtLader.tsx`, `App.tsx` beschreibt je Route den Ort.

import type {
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  BauwerksmodellId,
  BauzeitenplanId,
  HonorarberechnungId,
  KostenermittlungId,
  LeistungsverzeichnisId,
  LvStandId,
  ProjektId,
  RechnungId,
} from '@tethys/vertrag';
import { bautagebuchPfad, maengelPfad } from '../bauleitung/pfad';
import { bauzeitPfad } from '../bauzeit/pfad';
import { modellePfad } from '../bim/pfad';
import { honorarPfad } from '../honorar/pfad';
import { kostenPfad } from '../kosten/pfad';
import { projektPfad } from './pfade';
import { texte } from './texte';

/** Ein Eintrag der Seitenleiste; jede Seite gehört zu höchstens einem. */
export type Bereich =
  | 'projekte'
  | 'hilfe'
  | 'katalog'
  | 'uebersicht'
  | 'leistungsverzeichnisse'
  | 'vergabe'
  | 'auftraege'
  | 'nachtraege'
  | 'aufmass'
  | 'rechnungen'
  | 'kosten'
  | 'modelle'
  | 'bauzeit'
  | 'honorar'
  | 'maengel'
  | 'bautagebuch';

/** Bereiche eines Projekts, in der Reihenfolge der Seitenleiste. */
export type Projektbereich = Exclude<Bereich, 'projekte' | 'hilfe' | 'katalog'>;

/** Die Module aus Welle 6, die als Vorschau gekennzeichnet sind (G-60). */
export const VORSCHAU: readonly Projektbereich[] = [
  'modelle',
  'bauzeit',
  'honorar',
  'maengel',
  'bautagebuch',
];

export const istVorschau = (b: Bereich | null): boolean =>
  b !== null && (VORSCHAU as readonly string[]).includes(b);

/** Gruppen der Seitenleiste bei geöffnetem Projekt. */
export const SEITENLEISTE: readonly {
  readonly gruppe: string | null;
  readonly bereiche: readonly Projektbereich[];
}[] = [
  { gruppe: null, bereiche: ['uebersicht', 'leistungsverzeichnisse', 'vergabe'] },
  { gruppe: texte.huelle.gruppen.auftraege, bereiche: ['auftraege', 'nachtraege', 'aufmass', 'rechnungen'] },
  { gruppe: null, bereiche: ['kosten'] },
  { gruppe: texte.huelle.gruppen.vorschau, bereiche: VORSCHAU },
];

/** Listen je Projekt, die es nur für die Navigation gibt (Projektseiten in `projekt/`). */
export const PROJEKTLISTEN = {
  leistungsverzeichnisse: 'leistungsverzeichnisse',
  vergabe: 'vergabe',
  auftraege: 'auftraege',
  nachtraege: 'nachtraege',
  aufmass: 'aufmass',
  rechnungen: 'rechnungen',
} as const satisfies Partial<Record<Projektbereich, string>>;

export type Projektlistenart = keyof typeof PROJEKTLISTEN;

/** Erkennt `/projekt/<p>/<liste>` einer der Listen aus `PROJEKTLISTEN`. */
export function projektlistenRoute(pfad: string): { art: Projektlistenart; projektId: ProjektId } | null {
  const m = /^\/projekt\/([^/]+)\/([^/]+)$/.exec(pfad);
  if (m?.[1] === undefined || m[2] === undefined) return null;
  const art = (Object.keys(PROJEKTLISTEN) as Projektlistenart[]).find((a) => PROJEKTLISTEN[a] === m[2]);
  return art === undefined ? null : { art, projektId: decodeURIComponent(m[1]) as ProjektId };
}

/** Wohin ein Eintrag der Seitenleiste führt. */
export function bereichsPfad(bereich: Projektbereich, projektId: ProjektId): string {
  switch (bereich) {
    case 'uebersicht':
      return projektPfad(projektId);
    case 'kosten':
      return kostenPfad(projektId);
    case 'modelle':
      return modellePfad(projektId);
    case 'bauzeit':
      return bauzeitPfad(projektId);
    case 'honorar':
      return honorarPfad(projektId);
    case 'maengel':
      return maengelPfad(projektId);
    case 'bautagebuch':
      return bautagebuchPfad(projektId);
    default:
      return `${projektPfad(projektId)}/${PROJEKTLISTEN[bereich]}`;
  }
}

/** Ein Gegenstand, dessen Name in den Brotkrumen steht und aus dem Speicher kommt. */
export type Gegenstand =
  | { readonly art: 'lv'; readonly id: LeistungsverzeichnisId }
  | { readonly art: 'lvStand'; readonly lvId: LeistungsverzeichnisId; readonly id: LvStandId }
  | { readonly art: 'auftragsLv'; readonly id: AuftragsLeistungsverzeichnisId }
  | {
      readonly art: 'aufmass';
      readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
      readonly id: AufmassId;
    }
  | {
      readonly art: 'rechnung';
      readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
      readonly id: RechnungId;
    }
  | { readonly art: 'kostenermittlung'; readonly id: KostenermittlungId }
  | { readonly art: 'modell'; readonly id: BauwerksmodellId }
  | { readonly art: 'bauzeitenplan'; readonly id: BauzeitenplanId }
  | { readonly art: 'honorarberechnung'; readonly id: HonorarberechnungId };

/** Eine Krume, bevor die Namen geladen sind: ein Gegenstand oder ein fester Text, mit Ziel. */
export interface Ortskrume {
  readonly teil: Gegenstand | { readonly art: 'text'; readonly text: string };
  /** Ziel der Krume; die letzte Krume ist die Seite selbst und nie ein Verweis. */
  readonly pfad: string;
}

/** Wo eine Seite liegt, so wie die Adresse es sagt. */
export interface Ort {
  readonly bereich: Bereich | null;
  /** Das Projekt der Seite: aus der Adresse, über ein LV zu finden (LV-Seiten tragen kein Projekt) oder keines. */
  readonly projekt:
    | { readonly art: 'id'; readonly id: ProjektId }
    | { readonly art: 'lv'; readonly lvId: LeistungsverzeichnisId }
    | null;
  /** Krumen nach „Projekte › Projekt › Bereich“; ohne Projekt die ganze Krumenreihe. */
  readonly krumen: readonly Ortskrume[];
  /** Name der Seite im Fenstertitel; ohne: die letzte Krume. */
  readonly seite?: string;
}

/** Ein Ort ohne Projekt mit einem festen Namen (Projektliste, Hilfe, Katalog, unbekannte Adresse). */
export function festerOrt(bereich: Bereich | null, text: string, pfad: string): Ort {
  return { bereich, projekt: null, krumen: [{ teil: { art: 'text', text }, pfad }] };
}

/** Schlüssel eines Gegenstands für die geladenen Namen. */
export function gegenstandSchluessel(g: Gegenstand): string {
  return `${g.art}:${g.id}`;
}

/** Name eines Gegenstands, solange er lädt oder fehlt. */
export function ersatzname(g: Gegenstand): string {
  return texte.gegenstand[g.art];
}

/** Eine Krume, wie die Kopfzeile sie zeigt. `pfad: null`: die aktuelle Seite. */
export interface Krume {
  readonly text: string;
  readonly pfad: string | null;
}

export interface Navigationsstand {
  readonly bereich: Bereich | null;
  /** Das geöffnete Projekt; die Seitenleiste folgt ihm. */
  readonly projekt: { readonly id: ProjektId; readonly name: string } | null;
  readonly krumen: readonly Krume[];
  /** Fenstertitel: „Seite – Projekt – Tethys AVA“. */
  readonly titel: string;
}

export interface Namen {
  readonly projekt: { readonly id: ProjektId; readonly name: string } | null;
  /** Name je `gegenstandSchluessel`. */
  readonly gegenstaende: ReadonlyMap<string, string>;
  /** Ein anderer Bereich als der der Adresse (ein Nachtrags-LV gehört zu „Nachträge“). */
  readonly bereich?: Bereich;
}

export const KEINE_NAMEN: Namen = { projekt: null, gegenstaende: new Map() };

const bereichsname = (b: Projektbereich): string => texte.huelle.eintraege[b];

/** Krumen und Titel eines Orts mit den geladenen Namen; fehlende Namen durch Ersatznamen. */
export function navigationsstand(ort: Ort, namen: Namen): Navigationsstand {
  const teile: Krume[] = ort.krumen.map((k) => ({
    text:
      k.teil.art === 'text'
        ? k.teil.text
        : (namen.gegenstaende.get(gegenstandSchluessel(k.teil)) ?? ersatzname(k.teil)),
    pfad: k.pfad,
  }));
  const projekt = ort.projekt === null ? null : namen.projekt;
  const bereich = namen.bereich ?? ort.bereich;
  const vorne: Krume[] = [];
  if (projekt !== null) {
    vorne.push({ text: texte.huelle.eintraege.projekte, pfad: '/' });
    vorne.push({ text: projekt.name, pfad: projektPfad(projekt.id) });
    const b = bereich;
    if (b !== null && b !== 'uebersicht' && b !== 'projekte' && b !== 'hilfe' && b !== 'katalog') {
      vorne.push({ text: bereichsname(b), pfad: bereichsPfad(b, projekt.id) });
    }
  }
  const alle = [...vorne, ...teile];
  // Die letzte Krume ist die Seite selbst: kein Verweis.
  const krumen = alle.map((k, i) => (i === alle.length - 1 ? { text: k.text, pfad: null } : k));
  const seite = ort.seite ?? krumen.at(-1)?.text ?? texte.produkt;
  const titel = [seite, ...(projekt === null ? [] : [projekt.name]), texte.produkt].join(
    texte.huelle.titelTrenner,
  );
  return { bereich, projekt, krumen, titel };
}
