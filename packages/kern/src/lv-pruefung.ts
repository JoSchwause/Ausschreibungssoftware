// SPDX-License-Identifier: AGPL-3.0-or-later
// Formale LV-Prüfung (K8, Ticket 41): `lvPruefen(zustand) → Prüfbefunde`. Rein und deterministisch (A2), sperrt nie (U5).
// Die Regeln stehen in `pruefregeln.ts`; hier entsteht einmal je Prüfung der Kontext (Stufen, doppelte OZ, Bereiche der
// Zuschlagspositionen), dann laufen die Regeln über das LV und die Knoten in Dokumentreihenfolge.

import type { Knoten, LvZustand, Pruefbefund } from '@tethys/vertrag';
import {
  doppelteOrdnungszahlen,
  maskeFehler,
  maskePruefen,
  ozFehler,
  ozZerlegen,
  stellenFuer,
} from './ozregeln';
import { KNOTEN_REGELN, LV_REGELN } from './pruefregeln';
import type { Pruefkontext } from './pruefregeln';
import { ebenenbeitrag } from './regeln';
import { indexVon } from './struktur';
import type { Baumindex } from './struktur';
import { gliederungssummeVon, positionssummeVon } from './summen';
import { istBasisposition } from './zuschlag';

/** Stufe je Knoten: Gliederung ihre eigene, Position und Hinweistext die Zahl der Stufen darüber. */
function stufen(lvId: string, knoten: readonly Knoten[]): Map<string, number> {
  const stufe = new Map<string, number>();
  for (const k of knoten) {
    const oben = k.elternId === lvId ? 0 : (stufe.get(k.elternId) ?? 0);
    stufe.set(k.id, oben + (k.art === 'los' || k.art === 'titel' ? ebenenbeitrag(k.art) : 0));
  }
  return stufe;
}

const ozArt = (k: Knoten): 'gliederung' | 'position' => (k.art === 'position' ? 'position' : 'gliederung');

/** OZ gegen die Maske: Fehlertext je Knoten, und je Knoten die Teile der gültigen OZ (für den Vergleich mit den Eltern). */
function ozAnalyse(
  z: LvZustand,
  stufe: ReadonlyMap<string, number>,
  baum: Baumindex,
): { fehler: Map<string, string>; abweichend: Set<string> } {
  const lv = z.leistungsverzeichnis;
  const maske = lv.ozMaske;
  const fehler = new Map<string, string>();
  const teile = new Map<string, readonly string[]>();
  for (const k of lv.knoten) {
    if (k.art === 'hinweis' || k.ordnungszahl === null) continue;
    const s = stufe.get(k.id) ?? 0;
    const f = ozFehler(maske, k.ordnungszahl, k.art === 'position' ? k.ozIndex : null, ozArt(k), s);
    if (f !== null) {
      fehler.set(k.id, f);
      continue;
    }
    const stellen = stellenFuer(maske, ozArt(k), s);
    const t = stellen === null ? null : ozZerlegen(maske, k.ordnungszahl, stellen);
    if (t !== null) teile.set(k.id, t);
  }
  const abweichend = new Set<string>();
  for (const k of lv.knoten) {
    const eigene = teile.get(k.id);
    const eltern = baum.byId.get(k.elternId);
    const vorne = eltern === undefined ? undefined : teile.get(eltern.id);
    if (eigene === undefined || vorne === undefined) continue;
    if (vorne.some((t, i) => eigene[i] !== t)) abweichend.add(k.id);
  }
  return { fehler, abweichend };
}

/** Gliederungen, unter denen (in beliebiger Tiefe) mindestens eine Position steht. */
function mitPosition(baum: Baumindex, knoten: readonly Knoten[]): Set<string> {
  const aus = new Set<string>();
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    let eltern = baum.byId.get(k.elternId);
    while (eltern !== undefined && !aus.has(eltern.id)) {
      aus.add(eltern.id);
      eltern = baum.byId.get(eltern.elternId);
    }
  }
  return aus;
}

/**
 * Bereiche der Zuschlagspositionen wie R3/R4 (`zuschlag.ts`, `bereichsbasen`): je Elternknoten über die Geschwister;
 * unmittelbar aufeinanderfolgende Zuschlagspositionen bilden einen Block mit gemeinsamem Bereich, der Bereich reicht bis
 * zur vorigen Zuschlagsposition oder zum Anfang; Hinweistexte und Untergliederungen werden übersprungen.
 *  - `ohneBasis`: Zuschlagspositionen, in deren Bezug keine Basisposition steht (Liste: keine genannte Position im Baum,
 *    die Basis sein kann).
 *  - `kennzeichenOhneZuschlag`: gekennzeichnete Positionen, deren Bereich in keinen Block mit Kennzeichnungs-Zuschlag
 *    mündet.
 */
function zuschlagsbereiche(baum: Baumindex): {
  ohneBasis: Set<string>;
  kennzeichenOhneZuschlag: Set<string>;
} {
  const ohneBasis = new Set<string>();
  const kennzeichenOhneZuschlag = new Set<string>();
  for (const kinder of baum.kinder.values()) {
    let alle = 0;
    let markiert: string[] = [];
    let block: { alle: number; markiert: string[]; kennzeichnung: boolean } | null = null;
    const blockEnde = (): void => {
      if (block !== null && !block.kennzeichnung)
        for (const m of block.markiert) kennzeichenOhneZuschlag.add(m);
      block = null;
    };
    for (const k of kinder) {
      if (k.art !== 'position') continue;
      const bezug = k.zuschlag?.bezug;
      if (bezug === undefined) {
        blockEnde();
        if (k.merkmale.zuschlagskennzeichen) markiert.push(k.id);
        if (istBasisposition(k)) alle += 1;
        continue;
      }
      if (block === null) {
        block = { alle, markiert, kennzeichnung: false };
        alle = 0;
        markiert = [];
      }
      let leer: boolean;
      if (bezug.art === 'gliederung') leer = block.alle === 0;
      else if (bezug.art === 'kennzeichnung') {
        block.kennzeichnung = true;
        leer = block.markiert.length === 0;
      } else
        leer = !bezug.positionen.some((b) => {
          const p = baum.byId.get(b.positionId);
          return p?.art === 'position' && istBasisposition(p);
        });
      if (leer) ohneBasis.add(k.id);
    }
    blockEnde();
    for (const m of markiert) kennzeichenOhneZuschlag.add(m);
  }
  return { ohneBasis, kennzeichenOhneZuschlag };
}

function kontext(z: LvZustand): Pruefkontext {
  const lv = z.leistungsverzeichnis;
  const baum = indexVon(lv.id, lv.knoten);
  const stufe = stufen(lv.id, lv.knoten);
  const maskeGueltig = maskeFehler(lv.ozMaske) === null;
  const oz = maskeGueltig ? ozAnalyse(z, stufe, baum) : { fehler: new Map(), abweichend: new Set<string>() };
  const bereiche = zuschlagsbereiche(baum);
  return {
    zustand: z,
    baum,
    maskeGueltig,
    stufe,
    ozDoppelt: new Set(doppelteOrdnungszahlen(lv.knoten).flatMap((d) => d.knotenIds)),
    ozMaskenfehler: oz.fehler,
    ozAbweichend: oz.abweichend,
    gliederungMitPosition: mitPosition(baum, lv.knoten),
    zuschlagOhneBasis: bereiche.ohneBasis,
    kennzeichenOhneZuschlag: bereiche.kennzeichenOhneZuschlag,
    gesamtpreis: (id) => positionssummeVon(z.summen, id)?.gesamtpreis ?? null,
    gliederungssumme: (id) => gliederungssummeVon(z.summen, id)?.summe ?? null,
  };
}

/** Je Ort nach Code, dann Feld (stabil: gleiche Code-Feld-Paare bleiben in Regelreihenfolge). */
const nachCode = (a: Pruefbefund, b: Pruefbefund): number =>
  a.code < b.code
    ? -1
    : a.code > b.code
      ? 1
      : (a.ort.feld ?? '') < (b.ort.feld ?? '')
        ? -1
        : (a.ort.feld ?? '') > (b.ort.feld ?? '')
          ? 1
          : 0;

/**
 * Prüft ein LV und liefert die Prüfbefunde (Quelle `lv-pruefung`). Reihenfolge: zuerst die LV-weiten Befunde, dann die
 * Knoten in Dokumentreihenfolge (`LvZustand` ist kanonisch geordnet); je Ort nach Code und Feld. Gleiche Eingabe, gleiche
 * Ausgabe (Golden-tauglich). Sperrt nie (U5): Die Prüfung ändert nichts und weist nichts ab.
 */
export function lvPruefen(zustand: LvZustand): readonly Pruefbefund[] {
  const ctx = kontext(zustand);
  const aus: Pruefbefund[] = [
    ...maskePruefen(zustand.leistungsverzeichnis.ozMaske),
    ...LV_REGELN.flatMap((r) => r.pruefe(ctx)),
  ];
  aus.sort(nachCode);
  for (const k of zustand.leistungsverzeichnis.knoten) {
    const hier: Pruefbefund[] = [];
    for (const r of KNOTEN_REGELN) {
      const b = r.pruefe(k, ctx);
      if (b.length > 0) hier.push(...b);
    }
    if (hier.length > 1) hier.sort(nachCode);
    aus.push(...hier);
  }
  return aus;
}
