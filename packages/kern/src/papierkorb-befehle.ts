// SPDX-License-Identifier: AGPL-3.0-or-later
// Papierkorb (K9, Ticket 42, Punkt 5; Vertrag v1.2, D-12): KnotenInPapierkorbLegen, PapierkorbeintragWiederherstellen,
// PapierkorbeintragEntfernen, PapierkorbLeeren. Rein (A2); die Kennung des Eintrags bringt der Befehl mit, die `nummer`
// vergibt der Kern (Höchstwert + 1, keine Uhr).
//
// Bezüge (Zuschlags-`Bezugsposition`, `wahl.grundpositionId`) auf Positionen im Papierkorb bleiben stehen und zählen
// nichts, solange das Ziel im Papierkorb liegt (die Summen finden die Position nicht im Baum). Erst Entfernen und Leeren
// lösen sie, im selben ChangeSet (`knoten.geaendert`; Bezüge aus anderen Einträgen unter `papierkorb.geaendert`).
// Ob ein Angebot auf eine Position im Eintrag verweist, prüft `speicher` (`konflikt`), nicht der Kern.

import type {
  Aenderungen,
  Befehlsfehler,
  Ergebnis,
  Knoten,
  KnotenInPapierkorbLegen,
  LvChangeSet,
  LvZustand,
  Papierkorbeintrag,
  PapierkorbeintragEntfernen,
  PapierkorbeintragWiederherstellen,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import {
  lageAenderungen,
  obenFehler,
  ortAufloesen,
  platzieren,
  wurzelFehler,
  wurzelnVon,
} from './platzieren';
import type { Gruppe, Ziel } from './platzieren';
import { baueIndex, ebenenHoehe, indexVon, unterbaum } from './struktur';
import type { Baumindex } from './struktur';
import { summenAenderung } from './summen';
import type { Knotenaenderungen } from './summen';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;
type Aenderung = { readonly vorher: Knoten; readonly nachher: Knoten };

/** ChangeSet aus Knotenänderungen samt Summen (A6) und Papierkorbänderung. */
function changeSet(
  z: LvZustand,
  idx: Baumindex,
  knoten: Knotenaenderungen,
  papierkorb: Partial<Aenderungen<Papierkorbeintrag>>,
): LvChangeSet {
  return {
    ...baueChangeSet(z, { ...knoten, summen: summenAenderung(z, idx, { knoten }) }),
    papierkorb: {
      hinzugefuegt: papierkorb.hinzugefuegt ?? [],
      geaendert: papierkorb.geaendert ?? [],
      entfernt: papierkorb.entfernt ?? [],
    },
  };
}

const eintragFehlt = (eintragId: string): Ergebnis<never, Befehlsfehler> =>
  nein('ungueltige-eingabe', `Papierkorbeintrag unbekannt: ${eintragId}`, undefined, 'eintragId');

/**
 * Nimmt die Knoten samt Unterbäumen aus dem Baum und legt sie als einen Eintrag ab: `knoten.entfernt` (Dokumentreihenfolge,
 * Eltern vor Kindern; die Knoten tragen ihre alte Lage), die Geschwister schließen die Lücken (`knoten.geaendert`),
 * `papierkorb.hinzugefuegt` mit `nummer` = Höchstwert + 1. Die Summen der Knoten fallen weg (`summen.vorher.entfernt`).
 */
export function knotenInPapierkorbLegen(z: LvZustand, b: KnotenInPapierkorbLegen): Antwort {
  const lv = z.leistungsverzeichnis;
  const korb = z.papierkorb ?? [];
  if (korb.some((e) => e.id === b.eintragId))
    return nein('id-vergeben', `Papierkorbeintrag bereits vorhanden: ${b.eintragId}`, undefined, 'eintragId');
  const idx = indexVon(lv.id, lv.knoten);
  const w = wurzelnVon(idx, b.knotenIds);
  if (!w.ok) return w;
  const lage = new Map<string, number>();
  lv.knoten.forEach((k, i) => lage.set(k.id, i));
  const wurzeln = [...w.wert].sort((x, y) => (lage.get(x.id) ?? 0) - (lage.get(y.id) ?? 0));
  const entfernt = wurzeln.flatMap((k) => unterbaum(idx, k));
  const weg = new Set(wurzeln.map((k) => k.id));
  const geaendert = lageAenderungen(platzieren(idx, weg, []), weg);
  const nummer = korb.reduce((m, e) => Math.max(m, e.nummer), 0) + 1;
  return ok(
    changeSet(
      z,
      idx,
      { entfernt, geaendert },
      { hinzugefuegt: [{ id: b.eintragId, nummer, knoten: entfernt }] },
    ),
  );
}

/**
 * Holt einen Eintrag zurück. `ort: null`: jede Wurzel an ihre alte Stelle (alter Elternknoten, alte `reihenfolge`, höchstens
 * ans Ende), wenn der alte Elternknoten besteht, sonst ans Ende der Wurzel (Vorschlag des Tickets); mehrere Wurzeln unter
 * demselben Elternknoten in aufsteigender alter Reihenfolge, so dass das Hineinlegen genau umgekehrt wird. Mit `ort`: alle
 * Wurzeln hintereinander dort. Kennungen und OZ bleiben (ADR 0011; doppelte OZ meldet K8). Prüfungen am Ziel wie beim
 * Einfügen (Knotenart, Los, Ebenen, F1); eine Kennung des Eintrags, die inzwischen im Baum steht: `id-vergeben`.
 */
export function papierkorbeintragWiederherstellen(
  z: LvZustand,
  b: PapierkorbeintragWiederherstellen,
): Antwort {
  const lv = z.leistungsverzeichnis;
  const eintrag = (z.papierkorb ?? []).find((e) => e.id === b.eintragId);
  if (eintrag === undefined) return eintragFehlt(b.eintragId);
  const idx = indexVon(lv.id, lv.knoten);
  for (const k of eintrag.knoten) {
    if (idx.byId.has(k.id) || (k.id as string) === lv.id)
      return nein('id-vergeben', `Kennung bereits im Baum vergeben: ${k.id}`, k.id);
  }
  const imEintrag = new Set<string>(eintrag.knoten.map((k) => k.id));
  const wurzeln = eintrag.knoten.filter((k) => !imEintrag.has(k.elternId));
  const eigenIdx = baueIndex(lv.id, eintrag.knoten);

  const ziele = new Map<string, Ziel>();
  let gruppen: Gruppe[];
  if (b.ort === null) {
    const alt: Gruppe[] = [];
    const neu: Gruppe[] = [];
    for (const k of wurzeln) {
      const e = idx.byId.get(k.elternId);
      const da = k.elternId === lv.id || e?.art === 'los' || e?.art === 'titel';
      const ziel: Ziel = da
        ? { eltern: k.elternId, elternArt: e?.art ?? 'wurzel', index: k.reihenfolge }
        : { eltern: lv.id, elternArt: 'wurzel', index: Number.MAX_SAFE_INTEGER };
      ziele.set(k.id, ziel);
      (da ? alt : neu).push({ eltern: ziel.eltern, index: ziel.index, wurzeln: [k] });
    }
    gruppen = [...alt.sort((x, y) => x.index - y.index), ...neu];
  } else {
    const ziel = ortAufloesen(idx, b.ort, new Set());
    if (!ziel.ok) return ziel;
    for (const k of wurzeln) ziele.set(k.id, ziel.wert);
    gruppen = [{ eltern: ziel.wert.eltern, index: ziel.wert.index, wurzeln }];
  }
  for (const k of wurzeln) {
    const ziel = ziele.get(k.id);
    const f = ziel === undefined ? null : wurzelFehler(idx, ziel, k, ebenenHoehe(eigenIdx, k));
    if (f !== null) return { ok: false, fehler: f };
  }
  const listen = platzieren(idx, new Set(), gruppen);
  const oben = obenFehler(z, idx, listen, new Set(wurzeln.map((k) => k.id)));
  if (oben !== null) return { ok: false, fehler: oben };

  const neueLage = new Map<string, Knoten>();
  for (const [eltern, liste] of listen) {
    liste.forEach((k, i) => {
      if (imEintrag.has(k.id))
        neueLage.set(k.id, { ...k, elternId: eltern as Knoten['elternId'], reihenfolge: i });
    });
  }
  const hinzugefuegt = eintrag.knoten.map((k) => neueLage.get(k.id) ?? k);
  const geaendert = lageAenderungen(listen, imEintrag);
  return ok(changeSet(z, idx, { hinzugefuegt, geaendert }, { entfernt: [eintrag] }));
}

/** Die Position ohne Bezüge auf `weg` (Zuschlagsliste, Grundposition der Wahl); unverändert: dasselbe Objekt. */
function ohneBezuege(k: Knoten, weg: ReadonlySet<string>): Knoten {
  if (k.art !== 'position') return k;
  let n = k;
  const z = k.zuschlag;
  if (z?.bezug.art === 'positionen' && z.bezug.positionen.some((p) => weg.has(p.positionId))) {
    n = {
      ...n,
      zuschlag: {
        ...z,
        bezug: { art: 'positionen', positionen: z.bezug.positionen.filter((p) => !weg.has(p.positionId)) },
      },
    };
  }
  const wahl = k.merkmale.wahl;
  if (wahl !== null && wahl.grundpositionId !== null && weg.has(wahl.grundpositionId)) {
    n = { ...n, merkmale: { ...n.merkmale, wahl: { ...wahl, grundpositionId: null } } };
  }
  return n;
}

/**
 * Entfernt Einträge endgültig: `papierkorb.entfernt` mit dem vollen Stand (samt `nummer`), die Knoten im Baum mit Bezügen
 * auf eine Position der Einträge ohne diese Bezüge (`knoten.geaendert`, D-12), ebenso Knoten in verbleibenden Einträgen
 * (`papierkorb.geaendert`), damit ein späteres Wiederherstellen keine hängenden Bezüge zurückbringt. Die Summen ändern
 * sich nicht (die Bezüge zählten schon nichts).
 */
function entfernenChangeSet(z: LvZustand, weg: readonly Papierkorbeintrag[]): LvChangeSet {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const wegIds = new Set(weg.map((e) => e.id));
  const positionen = new Set<string>();
  for (const e of weg) for (const k of e.knoten) if (k.art === 'position') positionen.add(k.id);
  const geaendert: Aenderung[] = [];
  for (const k of lv.knoten) {
    const n = ohneBezuege(k, positionen);
    if (n !== k) geaendert.push({ vorher: k, nachher: n });
  }
  const korbGeaendert: { vorher: Papierkorbeintrag; nachher: Papierkorbeintrag }[] = [];
  for (const e of z.papierkorb ?? []) {
    if (wegIds.has(e.id)) continue;
    const knoten = e.knoten.map((k) => ohneBezuege(k, positionen));
    if (knoten.some((k, i) => k !== e.knoten[i]))
      korbGeaendert.push({ vorher: e, nachher: { ...e, knoten } });
  }
  return changeSet(z, idx, { geaendert }, { geaendert: korbGeaendert, entfernt: weg });
}

export function papierkorbeintragEntfernen(z: LvZustand, b: PapierkorbeintragEntfernen): Antwort {
  const eintrag = (z.papierkorb ?? []).find((e) => e.id === b.eintragId);
  if (eintrag === undefined) return eintragFehlt(b.eintragId);
  return ok(entfernenChangeSet(z, [eintrag]));
}

/** Entfernt alle Einträge (wie `PapierkorbeintragEntfernen`); ein leerer Papierkorb ergibt ein leeres ChangeSet. */
export function papierkorbLeeren(z: LvZustand): Antwort {
  const korb = z.papierkorb ?? [];
  return ok(korb.length === 0 ? baueChangeSet(z, {}) : entfernenChangeSet(z, korb));
}
