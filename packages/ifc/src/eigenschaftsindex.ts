// SPDX-License-Identifier: AGPL-3.0-or-later
// Eigenschaften bei Bedarf (Ticket 107, Punkt 2; D-51): Das Bauwerksmodell speichert keine Eigenschaftssätze, Klassifikationen
// und Materialien; die App liest sie bei Bedarf aus den Bytes der Modelldatei. Der Index läuft einmal über die Datei und
// sammelt die Beziehungen (die App hält ihn im Worker); jede Abfrage liest dann nur die Sätze des einen Objekts. Rein (A2).

import type { Ergebnis, IfcGlobalId, Pruefbefund } from '@tethys/vertrag';
import { bauteileLesen } from './bauteile';
import { Definitionen } from './definitionen';
import { Eigenschaftenleser } from './eigenschaften';
import { istGlobalId } from './globalid';
import { Klassifikationsleser } from './klassifikation';
import { dateiOeffnen } from './lesen';
import { Materialleser } from './material';
import { Modellleser, strukturLesen, zerlegungLesen } from './modell';
import { pruefbefund } from './pruefbefund';
import type { Eigenschaft, IfcOptionen, Klassifikation } from './typen';

/** Was das Bauwerksmodell über ein Objekt nicht speichert (D-51), gelesen aus der Modelldatei. */
export interface Objekteigenschaften {
  /**
   * Eigenschaften der Eigenschaftssätze (`IfcPropertySet`) am Objekt und an seinem Typ; eine am Objekt überschreibt die
   * gleichnamige desselben Satzes am Typ. Reihenfolge: die Sätze nach ihrer Stelle in der Datei, darin ihre Liste.
   */
  readonly eigenschaften: readonly Eigenschaft[];
  /** Klassifikationen am Objekt, danach die weiteren an seinem Typ. */
  readonly klassifikationen: readonly Klassifikation[];
  /** Materialnamen ohne Wiederholung; die des Typs nur, wenn das Objekt selbst keine nennt. */
  readonly materialien: readonly string[];
  /**
   * Befunde beim Lesen dieser Angaben (Quelle `ifc-lesen`, `ort.globalId` das abgefragte Objekt), etwa eine Eigenschaft
   * einer Art, die nicht gelesen wird: Die Anzeige sagt so, dass etwas fehlt (Q5). Jede Abfrage meldet alles, was sie
   * betrifft, unabhängig von früheren Abfragen; nur ein Syntaxfehler einer Instanz kommt einmal je Index.
   */
  readonly befunde: readonly Pruefbefund[];
}

/** Ein Index über die Bytes einer Modelldatei für viele Abfragen hintereinander. */
export interface Eigenschaftsindex {
  /**
   * Angaben zum Strukturknoten oder Bauteil des Bauwerksmodells mit dieser GlobalId; `null`, wenn kein Objekt des Modells
   * sie trägt (auch für Objekte, die keine Strukturknoten oder Bauteile sind, etwa Öffnungen und Typen). Tragen mehrere sie,
   * gilt das erste wie bei jedem Verweis (`struktur` vor `bauteile`, D-66), mit dem Befund `globalid-doppelt`.
   */
  eigenschaften(globalId: IfcGlobalId): Objekteigenschaften | null;
}

/** Objektdaten, die der Index nicht braucht: Er sucht nur die Objekte des Modells. */
const KEINE_DATEN = {
  mengen: () => [],
  eigenschaften: () => [],
  klassifikationen: () => [],
  materialien: () => [],
  typname: () => null,
};

/**
 * Baut den Index über die Bytes einer Modelldatei: dieselben Objekte wie `bauwerksmodellLesen` (Strukturknoten und
 * Bauteile mit GlobalId in Form). Befunde zum Modell meldet `bauwerksmodellLesen`; hier zählt nur, ob die Datei gelesen
 * wird (sonst der eine Befund wie dort).
 */
export function eigenschaftsindexBauen(
  bytes: Uint8Array,
  optionen: IfcOptionen = {},
): Ergebnis<Eigenschaftsindex, Pruefbefund> {
  const datei = dateiOeffnen(bytes, optionen);
  if (!datei.ok) return { ok: false, fehler: pruefbefund(datei.befund, undefined) };
  const l = new Modellleser(datei.daten, []);
  const ganzes = zerlegungLesen(l);
  const objekte = [
    ...strukturLesen(l, ganzes, () => []).map((k) => ({ i: k.i, globalId: k.knoten.globalId })),
    ...bauteileLesen(l, ganzes, KEINE_DATEN).map((b) => ({ i: b.i, globalId: b.bauteil.globalId })),
  ];
  const traeger = new Map<string, number[]>();
  for (const { i, globalId } of objekte) {
    if (!istGlobalId(globalId)) continue;
    const liste = traeger.get(globalId);
    if (liste === undefined) traeger.set(globalId, [i]);
    else liste.push(i);
  }
  const definitionen = new Definitionen(l);
  const klassifikationen = new Klassifikationsleser(l);
  const materialien = new Materialleser(l);

  return {
    ok: true,
    wert: {
      eigenschaften(globalId) {
        const alle = traeger.get(globalId);
        const i = alle?.[0];
        if (alle === undefined || i === undefined) return null;
        // Je Abfrage ein eigener Leser: Befunde und Zwischenstände gehören dieser Abfrage.
        const q = new Modellleser(datei.daten, []);
        const d = new Definitionen(q, definitionen);
        if (alle.length > 1)
          q.melde(
            'warnung',
            'globalid-doppelt',
            `Die GlobalId ${globalId} tragen ${String(alle.length)} Objekte (${alle.map((n) => `#${String(q.daten.id(n))}`).join(', ')}); gezeigt werden die Angaben des ersten.`,
            q.ort(i, 'GlobalId'),
          );
        const typ = d.typ(i);
        const ergebnis = {
          eigenschaften: new Eigenschaftenleser(q, d).eigenschaften(i),
          klassifikationen: new Klassifikationsleser(q, klassifikationen).klassifikationen(i, typ),
          materialien: new Materialleser(q, materialien).materialien(i, typ),
        };
        return { ...ergebnis, befunde: q.befunde.map((b) => pruefbefund(b, globalId)) };
      },
    },
  };
}

/** Liest die Angaben zu einer GlobalId ohne bleibenden Index (eine Abfrage; für viele `eigenschaftsindexBauen`). */
export function eigenschaftenLesen(
  bytes: Uint8Array,
  globalId: IfcGlobalId,
  optionen: IfcOptionen = {},
): Ergebnis<Objekteigenschaften | null, Pruefbefund> {
  const index = eigenschaftsindexBauen(bytes, optionen);
  return index.ok ? { ok: true, wert: index.wert.eigenschaften(globalId) } : index;
}
