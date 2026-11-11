// SPDX-License-Identifier: AGPL-3.0-or-later
// Vom LV-Zustand zur Ansicht des Grids: sichtbarer, flacher Baum in Dokumentreihenfolge, Summen aus dem Kern
// (die App rechnet nie, N1). Auf- und Zuklappen gehört der App: Sie merkt sich die zugeklappten Knoten, neu angelegte
// Gliederungen sind damit aufgeklappt.

import type { Betrag, Knoten, LvAnsicht, LvZeile, LvZustand, Pruefbefund } from '@tethys/vertrag';

const KEINE: readonly Pruefbefund[] = [];

/** Kinder je Elternknoten, nach `reihenfolge`. */
export function kinderJeEltern(knoten: readonly Knoten[]): ReadonlyMap<string, readonly Knoten[]> {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
  }
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  return kinder;
}

/** `befunde`: die Befunde der LV-Prüfung je Knoten (`befundeJeKnoten`); sie stehen an den Zellen (`ort.feld`). */
export function lvAnsichtBauen(
  zustand: LvZustand,
  zugeklappt: ReadonlySet<string>,
  befunde: ReadonlyMap<string, readonly Pruefbefund[]> = new Map(),
): LvAnsicht {
  const lv = zustand.leistungsverzeichnis;
  const kinder = kinderJeEltern(lv.knoten);
  const gp = new Map<string, { gesamtpreis: Betrag | null; gehtInSummeEin: boolean }>();
  for (const p of zustand.summen.positionen) gp.set(p.positionId, p);
  const gliederung = new Map<string, Betrag>();
  for (const g of zustand.summen.gliederungen) gliederung.set(g.gliederungId, g.summe);

  const zeilen: LvZeile[] = [];
  const besuche = (elternId: string, tiefe: number): void => {
    for (const knoten of kinder.get(elternId) ?? []) {
      const unter = kinder.get(knoten.id);
      const hatUnterknoten = unter !== undefined && unter.length > 0;
      const aufgeklappt = hatUnterknoten && !zugeklappt.has(knoten.id);
      const s = knoten.art === 'position' ? gp.get(knoten.id) : undefined;
      zeilen.push({
        knoten,
        tiefe,
        hatUnterknoten,
        aufgeklappt,
        summe:
          knoten.art === 'position'
            ? (s?.gesamtpreis ?? null)
            : knoten.art === 'hinweis'
              ? null
              : (gliederung.get(knoten.id) ?? null),
        gehtInSummeEin: knoten.art === 'position' ? (s?.gehtInSummeEin ?? null) : null,
        befunde: befunde.get(knoten.id) ?? KEINE,
      });
      if (aufgeklappt) besuche(knoten.id, tiefe + 1);
    }
  };
  besuche(lv.id, 0);
  return { wurzelId: lv.id, zeilen, gesamt: zustand.summen.gesamt };
}
