// SPDX-License-Identifier: AGPL-3.0-or-later
// OZ-Vorschlag (K9, Ticket 42, Punkt 4; W-06, F2, D-42.3): die Ordnungszahl für einen neuen Knoten an einem Ort, und die
// Neuvergabe für Teilbäume, die `KnotenEinfuegen` und `KnotenlisteVerschieben` in einen anderen Elternknoten legen. Rein
// (A2). Die Regeln (Schritte, Rückfall, Stellen) stehen in `ozregeln.ts`; die Nummerierung eines Teilbaums wie
// `Umnummerieren` in `oz-befehle.ts`.
//
// Regel: Der neue Teil ist Vorgänger + Schritt der Umnummerierung (Position 10, Gliederung 1). „Vorgänger“ ist das nächste
// Geschwister derselben Art (Position bzw. Gliederung) vor dem Ort mit einer lesbaren, rein numerischen OZ, ohne einen 0;
// „Nachfolger“ das nächste solche danach. Passt der Teil nicht vor den Nachfolger, nicht in die Stellen oder ist er unter
// den Geschwistern schon belegt, weicht der Vorschlag auf Schritt 5, 2, 1 aus (nur Schritte unter dem Standard) und trägt
// den Hinweis `oz-schritt-ausgewichen`. Reicht auch 1 nicht: `null` (die App lässt die OZ leer, K8 meldet `oz-fehlt`).

import type {
  Befehlshinweis,
  Knoten,
  LvZustand,
  Ordnungszahl,
  OzMaske,
  OzStelle,
  OzVorschlag,
  OzVorschlagen,
} from '@tethys/vertrag';
import { befehlshinweis } from './hinweise';
import { nummeriere } from './oz-befehle';
import type { Vergabe } from './oz-befehle';
import {
  GLIEDERUNG_SCHRITT,
  OZ_RUECKFALL_SCHRITTE,
  POSITION_SCHRITT,
  maskeFehler,
  nummerAls,
  ozZerlegen,
  ozZusammensetzen,
  stellenFuer,
} from './ozregeln';
import { ortAufloesen } from './platzieren';
import { ebenenbeitrag } from './regeln';
import { ebenenBis, indexVon, unterbaum } from './struktur';
import type { Baumindex } from './struktur';

type OzArt = 'position' | 'gliederung';

/** Was eine Vergabe unter einem Elternknoten braucht: Maske, Stellen der Kinder, Vorsilben aus der OZ der Eltern. */
interface Rahmen {
  readonly maske: OzMaske;
  readonly art: OzArt;
  readonly stellen: readonly OzStelle[];
  readonly praefix: readonly string[];
  /** Stufe der Kinder (Gliederung: ihre eigene; Position: Zahl der Stufen darüber). */
  readonly stufe: number;
}

/** Rahmen unter `eltern` (ein Knoten des Baums oder die Wurzel) oder `null`, wenn die Maske dort nichts vergibt. */
function rahmen(
  maske: OzMaske,
  idx: Baumindex,
  eltern: string,
  knotenart: 'position' | 'los' | 'titel',
): Rahmen | null {
  if (maskeFehler(maske) !== null) return null;
  const art: OzArt = knotenart === 'position' ? 'position' : 'gliederung';
  const ebeneEltern = ebenenBis(idx, eltern);
  const stufe = ebeneEltern + ebenenbeitrag(knotenart);
  const stellen = stellenFuer(maske, art, stufe);
  if (stellen === null) return null;
  let praefix: readonly string[] = [];
  if (eltern !== idx.lvId) {
    const e = idx.byId.get(eltern);
    if (e === undefined || e.art === 'hinweis' || e.art === 'position' || e.ordnungszahl === null)
      return null;
    const teile = ozZerlegen(maske, e.ordnungszahl, stellenFuer(maske, 'gliederung', ebeneEltern) ?? []);
    if (teile === null) return null;
    praefix = teile;
  }
  return { maske, art, stellen, praefix, stufe };
}

const gleicheArt = (k: Knoten, art: OzArt): boolean =>
  art === 'position' ? k.art === 'position' : k.art === 'los' || k.art === 'titel';

/** Der eigene Teil eines Geschwisters als Zahl, wenn er rein numerisch ist; sonst `null`. */
function teilVon(r: Rahmen, k: Knoten): number | null {
  if (!gleicheArt(k, r.art) || k.art === 'hinweis' || k.ordnungszahl === null) return null;
  const teil = ozZerlegen(r.maske, k.ordnungszahl, r.stellen)?.at(-1);
  return teil !== undefined && /^[0-9]+$/.test(teil) ? Number(teil) : null;
}

/**
 * Vorschlag an Stelle `index` der Liste `geschwister` (ohne den neuen Knoten). Geschwister in `offen` zählen weder als
 * Vorgänger noch als Nachfolger (sie bekommen gleich selbst eine neue OZ).
 */
function vorschlagIn(
  r: Rahmen,
  geschwister: readonly Knoten[],
  index: number,
  offen: ReadonlySet<string>,
): OzVorschlag | null {
  const zahl = (k: Knoten): number | null => (offen.has(k.id) ? null : teilVon(r, k));
  let vorgaenger = 0;
  for (let i = Math.min(index, geschwister.length) - 1; i >= 0; i--) {
    const k = geschwister[i];
    const t = k === undefined ? null : zahl(k);
    if (t !== null) {
      vorgaenger = t;
      break;
    }
  }
  let nachfolger = Number.POSITIVE_INFINITY;
  for (let i = index; i < geschwister.length; i++) {
    const k = geschwister[i];
    const t = k === undefined ? null : zahl(k);
    if (t !== null) {
      nachfolger = t;
      break;
    }
  }
  const belegt = new Set<number>();
  for (const k of geschwister) {
    const t = zahl(k);
    if (t !== null) belegt.add(t);
  }
  const standard = r.art === 'position' ? POSITION_SCHRITT : GLIEDERUNG_SCHRITT;
  const stelle = r.stellen.at(-1);
  if (stelle === undefined) return null;
  for (const schritt of [standard, ...OZ_RUECKFALL_SCHRITTE.filter((s) => s < standard)]) {
    const wert = vorgaenger + schritt;
    const teil = nummerAls(stelle, wert);
    if (wert >= nachfolger || teil === null || belegt.has(wert)) continue;
    const ordnungszahl = ozZusammensetzen(r.maske, [...r.praefix, teil]);
    if (schritt === standard) return { ordnungszahl, ozIndex: null };
    return {
      ordnungszahl,
      ozIndex: null,
      hinweis: befehlshinweis(
        'oz-schritt-ausgewichen',
        `Mit Schritt ${String(standard)} passt hinter ${String(vorgaenger)} keine Nummer; der Vorschlag weicht auf Schritt ${String(schritt)} aus (${ordnungszahl}).`,
        undefined,
        'ordnungszahl',
      ),
    };
  }
  return null;
}

/**
 * Vorschlag für die OZ eines neuen Knotens der Art `art` am Ort `ort` (W-06): die App ruft ihn vor `PositionAnlegen` bzw.
 * `GliederungAnlegen` und gibt die OZ im Befehl mit (Befehle bleiben reine Daten). `null`: kein Platz, ein ungültiger Ort,
 * eine ungültige Maske, ein Elternknoten ohne lesbare OZ oder eine Stufe, die die Maske nicht hat.
 *
 * Seit Vertrag v1.5 (`OzVorschlagen`, D-80.1, D-95.3; Ticket 105) auch am Auftrags-LV: dieselbe Regel mit Maske und Baum des
 * übergebenen Aggregats; Wurzel ist dessen eigene Kennung (eine andere Kennung als `elternId` ist ein unbekannter Ort).
 */
export const ozVorschlag: OzVorschlagen = (zustand, ort, art) => {
  const a =
    'leistungsverzeichnis' in zustand ? zustand.leistungsverzeichnis : zustand.auftragsLeistungsverzeichnis;
  const idx = indexVon(a.id, a.knoten);
  const ziel = ortAufloesen(idx, ort, new Set());
  if (!ziel.ok) return null;
  const r = rahmen(a.ozMaske, idx, ziel.wert.eltern, art);
  if (r === null) return null;
  return vorschlagIn(r, idx.kinder.get(ziel.wert.eltern) ?? [], ziel.wert.index, new Set());
};

/** Neue OZ der Wurzeln und ihrer Unterbäume (Kennung → OZ oder `null`) und die Hinweise der Vergabe. */
export interface Neuvergabe {
  readonly oz: ReadonlyMap<string, Ordnungszahl | null>;
  readonly hinweise: readonly Befehlshinweis[];
}

/**
 * Neue OZ für Wurzeln, die in einen anderen Elternknoten kommen (`KnotenEinfuegen`, `KnotenlisteVerschieben`; D-42.3).
 * `listen`: die neuen Kinderlisten je Elternknoten (Wurzeln darin). Die Wurzeln bekommen der Reihe nach einen Vorschlag
 * (eine früher vergebene ist Vorgänger der nächsten); ihr Unterbaum wird darunter neu nummeriert wie bei `Umnummerieren`
 * (`quelle`: der Index, der die Kinder der Wurzeln kennt). Ohne Vorschlag (`null`) oder wenn der Unterbaum nicht in die
 * Maske passt, bleibt die OZ leer (`null`) und K8 meldet `oz-fehlt`; die Eingabe wird nicht abgewiesen (U5).
 */
export function neuvergabe(
  z: LvZustand,
  idx: Baumindex,
  quelle: Baumindex,
  listen: ReadonlyMap<string, readonly Knoten[]>,
  wurzeln: readonly Knoten[],
): Neuvergabe {
  const maske = z.leistungsverzeichnis.ozMaske;
  const oz = new Map<string, Ordnungszahl | null>();
  const hinweise: Befehlshinweis[] = [];
  const offen = new Set<string>(wurzeln.filter((k) => k.art !== 'hinweis').map((k) => k.id));
  const arbeit = new Map<string, Knoten[]>();
  const eltern = new Map<string, string>();
  for (const [e, l] of listen) for (const k of l) if (offen.has(k.id)) eltern.set(k.id, e);

  for (const w of wurzeln) {
    const e = eltern.get(w.id);
    if (w.art === 'hinweis' || e === undefined) continue;
    offen.delete(w.id);
    let liste = arbeit.get(e);
    if (liste === undefined) {
      liste = [...(listen.get(e) ?? [])];
      arbeit.set(e, liste);
    }
    const i = liste.findIndex((k) => k.id === w.id);
    const r = rahmen(maske, idx, e, w.art);
    const v =
      r === null
        ? null
        : vorschlagIn(
            r,
            liste.filter((k) => k.id !== w.id),
            i,
            offen,
          );
    const neu = v?.ordnungszahl ?? null;
    oz.set(w.id, neu);
    if (v?.hinweis !== undefined) hinweise.push({ ...v.hinweis, knotenId: w.id });
    liste[i] = { ...w, ordnungszahl: neu };
    if (w.art === 'position') continue;

    const unter = unterbaum(quelle, w).slice(1);
    const stufe = r?.stufe ?? 0;
    const praefix = r === null || neu === null ? null : ozZerlegen(maske, neu, r.stellen);
    const vergabe: Vergabe = { oz: new Map(), hinweise: [] };
    const fehler =
      praefix === null ? true : nummeriere(quelle, maske, w.id, stufe, praefix, vergabe) !== null;
    for (const k of unter) {
      if (k.art === 'hinweis') continue;
      oz.set(k.id, fehler ? null : (vergabe.oz.get(k.id) ?? null));
    }
    if (!fehler) hinweise.push(...vergabe.hinweise);
  }
  return { oz, hinweise };
}
