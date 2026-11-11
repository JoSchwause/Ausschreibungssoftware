// SPDX-License-Identifier: AGPL-3.0-or-later
// KnotenEinfuegen und KnotenlisteVerschieben (K9, Ticket 42, Punkte 2 bis 4). Rein (A2); alle Kennungen bringt der Befehl
// mit. Summen leitet `summenAenderung` aus den Knotenänderungen ab: neue Positions- und Gliederungssummen, Ausweise, die
// Zuschlagspositionen an Quelle und Ziel (R3/R4) und die Listen (R5), die eine betroffene Position nennen (A6).
//
// OZ (D-42.2, D-42.3): Wurzeln, die in einen anderen Elternknoten kommen, bekommen einen OZ-Vorschlag, ihr Unterbaum wird darunter
// neu nummeriert (`neuvergabe`). Eingefügte Wurzeln gelten immer als „anderer Elternknoten“ (ihre mitgebrachte Lage zählt
// nach dem Vertrag nicht). Verschieben innerhalb desselben Elternknotens behält die OZ (Anzeigedatum, A7).

import type {
  Befehlsfehler,
  Ergebnis,
  Knoten,
  KnotenEinfuegen,
  KnotenlisteVerschieben,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { positionNormal } from './mengenansatz';
import { nein, ok } from './fehler';
import { neuvergabe } from './oz-vorschlag';
import type { Neuvergabe } from './oz-vorschlag';
import {
  istListe,
  lageAenderungen,
  obenFehler,
  ortAufloesen,
  platzieren,
  wurzelFehler,
  wurzelnVon,
} from './platzieren';
import { positionsdatenFehler, unerlaubtesFeld } from './pruefung';
import { darfKinderHaben, losErlaubtUnter } from './regeln';
import { baueIndex, ebenenHoehe, indexVon, liegtUnter, papierkorbKnoten } from './struktur';
import type { Baumindex } from './struktur';
import { summenAenderung } from './summen';
import type { Knotenaenderungen } from './summen';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

const ARTEN: ReadonlySet<string> = new Set(['los', 'titel', 'position', 'hinweis']);

function changeSet(z: LvZustand, idx: Baumindex, knoten: Knotenaenderungen, nv: Neuvergabe): LvChangeSet {
  return baueChangeSet(z, {
    ...knoten,
    summen: summenAenderung(z, idx, { knoten }),
    hinweise: nv.hinweise,
  });
}

/** Der Knoten mit neuer OZ, wenn `nv` eine nennt (Hinweistexte tragen keine). */
function mitOz(k: Knoten, nv: Neuvergabe): Knoten {
  if (k.art === 'hinweis' || !nv.oz.has(k.id)) return k;
  const oz = nv.oz.get(k.id) ?? null;
  return k.ordnungszahl === oz ? k : { ...k, ordnungszahl: oz };
}

/**
 * Prüft eine mitgebrachte Liste von Teilbäumen (`KnotenEinfuegen`, v1.4 auch `NachtragUebernehmen` am Auftrags-LV): nicht
 * leer; bekannte Knotenarten; Kennungen neu (nicht im Baum `idx`, nicht in `extern` (Papierkorb), nicht die Wurzel `lvId`,
 * nicht doppelt: `id-vergeben`); Eltern vor Kindern; Kinder nur unter Gliederungen, ein Los nur ganz oben;
 * `reihenfolge` je Elternknoten im Teilbaum dicht 0..n-1; Felder wie beim Anlegen (Hinweistext und Gliederung ohne Menge
 * und Preis; Positionen nach `positionsdatenFehler`, Bezüge auf Liste, Baum oder `extern`). Liefert die Wurzeln (die
 * Knoten, deren Elternknoten nicht in der Liste steht), in Listenreihenfolge; ihre Lage prüft der Aufrufer.
 */
export function listeFehler(
  lvId: string,
  idx: Baumindex,
  extern: ReadonlyMap<string, Knoten>,
  liste: readonly Knoten[],
): Ergebnis<Knoten[], Befehlsfehler> {
  if (!istListe(liste) || liste.length === 0)
    return nein('ungueltige-eingabe', 'Die Liste der Knoten ist leer.', undefined, 'knoten');
  const inListe = new Map<string, Knoten>();
  for (const k of liste) {
    if (!ARTEN.has(k.art)) return nein('ungueltige-eingabe', `Unbekannte Knotenart „${k.art}“.`, k.id, 'art');
    if (inListe.has(k.id) || idx.byId.has(k.id) || k.id === lvId || extern.has(k.id))
      return nein('id-vergeben', `Kennung bereits vergeben: ${k.id}`, k.id);
    inListe.set(k.id, k);
  }
  const knotenVon = (i: string): Knoten | undefined => inListe.get(i) ?? idx.byId.get(i) ?? extern.get(i);
  const gesehen = new Set<string>();
  const wurzeln: Knoten[] = [];
  const reihen = new Map<string, number[]>();
  for (const k of liste) {
    const e = inListe.get(k.elternId);
    if (e === undefined) wurzeln.push(k);
    else {
      if (!gesehen.has(e.id))
        return nein('ungueltige-eingabe', `Elternknoten ${e.id} steht hinter seinem Kind.`, k.id, 'knoten');
      if (!darfKinderHaben(e.art))
        return nein('knotenart-unzulaessig', `Unter einer Knotenart „${e.art}“ stehen keine Kinder.`, k.id);
      if (k.art === 'los' && !losErlaubtUnter(e.art))
        return nein(
          'knotenart-unzulaessig',
          'Ein Los steht nur direkt unter dem LV (vorläufige Annahme).',
          k.id,
        );
      const r = reihen.get(e.id);
      if (r) r.push(k.reihenfolge);
      else reihen.set(e.id, [k.reihenfolge]);
    }
    gesehen.add(k.id);
    if (k.art === 'position') {
      const f = positionsdatenFehler(k, k.id, knotenVon);
      if (f) return { ok: false, fehler: f };
    } else {
      const feld = unerlaubtesFeld(k, k.art === 'hinweis' ? 'hinweis' : 'gliederung');
      if (feld !== null)
        return nein(
          'ungueltige-eingabe',
          `Feld „${feld}“ ist an dieser Knotenart nicht zulässig.`,
          k.id,
          feld,
        );
    }
  }
  for (const [eltern, r] of reihen) {
    r.sort((a, b) => a - b);
    if (r.some((x, i) => x !== i))
      return nein(
        'ungueltige-eingabe',
        `Reihenfolge unter ${eltern} ist nicht dicht 0..n-1.`,
        eltern,
        'reihenfolge',
      );
  }
  return ok(wurzeln);
}

/**
 * Fügt die Teilbäume ein: die Wurzeln in Listenreihenfolge hintereinander am `ort` (ihre Lage setzt der Kern), innen wie
 * mitgebracht. Prüfungen wie beim Anlegen (`listeFehler`, Ziel, Los, Ebenen, F1). `''` als Einheit wird `null`.
 * ChangeSet: `knoten.hinzugefuegt` (Listenreihenfolge, Eltern vor Kindern), die nachrückenden Geschwister unter
 * `knoten.geaendert`, Hinweise der OZ-Vergabe.
 */
export function knotenEinfuegen(z: LvZustand, b: KnotenEinfuegen): Antwort {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const geprueft = listeFehler(lv.id, idx, papierkorbKnoten(z.papierkorb), b.knoten);
  if (!geprueft.ok) return geprueft;
  const wurzeln = geprueft.wert;
  const ziel = ortAufloesen(idx, b.ort, new Set());
  if (!ziel.ok) return ziel;
  const eigen = baueIndex(lv.id, b.knoten);
  for (const w of wurzeln) {
    const f = wurzelFehler(idx, ziel.wert, w, ebenenHoehe(eigen, w));
    if (f !== null) return { ok: false, fehler: f };
  }
  const listen = platzieren(idx, new Set(), [{ eltern: ziel.wert.eltern, index: ziel.wert.index, wurzeln }]);
  const wurzelIds = new Set<string>(wurzeln.map((w) => w.id));
  const oben = obenFehler(z, idx, listen, wurzelIds);
  if (oben !== null) return { ok: false, fehler: oben };

  const nv = neuvergabe(z, idx, eigen, listen, wurzeln);
  const lage = new Map<string, Knoten>();
  for (const [eltern, liste] of listen)
    liste.forEach((k, i) => {
      if (wurzelIds.has(k.id))
        lage.set(k.id, { ...k, elternId: eltern as Knoten['elternId'], reihenfolge: i });
    });
  const hinzugefuegt = b.knoten.map((k) => {
    const n = mitOz(lage.get(k.id) ?? k, nv);
    return n.art === 'position' ? positionNormal(n) : n;
  });
  return ok(changeSet(z, idx, { hinzugefuegt, geaendert: lageAenderungen(listen, wurzelIds) }, nv));
}

/**
 * Verschiebt die Knoten samt Unterbäumen als ein Befehl, in Listenreihenfolge hintereinander am `ziel` (Nachfahren
 * genannter Knoten gehen mit und zählen nicht eigens). Fehler wie `KnotenVerschieben`: `zyklus` (Ziel im eigenen
 * Unterbaum), `ebene-ueberschritten`, `knotenart-unzulaessig` (Los, Kinder unter einer Position, F1). ChangeSet: alle
 * Knoten, deren Lage oder OZ sich ändert, unter `knoten.geaendert`.
 */
export function knotenlisteVerschieben(z: LvZustand, b: KnotenlisteVerschieben): Antwort {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const w = wurzelnVon(idx, b.knotenIds);
  if (!w.ok) return w;
  const wurzeln = w.wert;
  const bewegt = new Set<string>(wurzeln.map((k) => k.id));
  const ziel = ortAufloesen(idx, b.ziel, bewegt);
  if (!ziel.ok) return ziel;
  for (const k of wurzeln) {
    if (liegtUnter(idx, ziel.wert.eltern, k.id))
      return nein('zyklus', 'Ein Knoten lässt sich nicht in seinen eigenen Unterbaum verschieben.', k.id);
  }
  for (const k of wurzeln) {
    const f = wurzelFehler(idx, ziel.wert, k, ebenenHoehe(idx, k));
    if (f !== null) return { ok: false, fehler: f };
  }
  const listen = platzieren(idx, bewegt, [{ eltern: ziel.wert.eltern, index: ziel.wert.index, wurzeln }]);
  const umzug = wurzeln.filter((k) => k.elternId !== ziel.wert.eltern);
  const oben = obenFehler(z, idx, listen, new Set(umzug.map((k) => k.id)));
  if (oben !== null) return { ok: false, fehler: oben };

  const nv = neuvergabe(z, idx, idx, listen, umzug);
  const nachher = new Map<string, Knoten>();
  for (const g of lageAenderungen(listen, new Set())) nachher.set(g.nachher.id, g.nachher);
  for (const kennung of nv.oz.keys()) {
    const alt = nachher.get(kennung) ?? idx.byId.get(kennung);
    if (alt === undefined) continue;
    const n = mitOz(alt, nv);
    if (n !== alt) nachher.set(kennung, n);
  }
  const geaendert = [...nachher.values()].map((n) => ({ vorher: idx.byId.get(n.id) ?? n, nachher: n }));
  return ok(changeSet(z, idx, { geaendert }, nv));
}
