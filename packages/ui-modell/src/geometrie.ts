// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Geometrie eines Modells, wie der Worker sie an die Leinwand übergibt: je Deckung (deckend, durchsichtig) ein
// zusammengefasster Puffer mit Bereichen je Teil (D-50: Geometrie je Material zusammenfassen). Die Lage aus web-ifc ist
// schon eingerechnet (Weltkoordinaten, y oben, Meter). Alle Felder sind Typed Arrays, damit der Worker sie ohne Kopie
// überträgt.

import type { Grenzen, Vec3 } from './kamera';

/** Ein Geometrieteil eines Bauteils, wie web-ifc es liefert. */
export interface Rohteil {
  /** Bauteilindex (`zuordnung.ts`) */
  readonly bauteil: number;
  /** je Ecke x, y, z, nx, ny, nz im Koordinatensystem des Teils */
  readonly ecken: Float32Array;
  /** drei Eckennummern je Dreieck */
  readonly dreiecke: Uint32Array;
  /** Lage des Teils, 4 × 4 spaltenweise */
  readonly lage: ArrayLike<number>;
  /** r, g, b, Deckkraft (0 … 1) */
  readonly farbe: readonly [number, number, number, number];
}

/** Felder je Teil in `Geometriegruppe.teile`: Bauteilindex, erste Ecke, Eckenzahl, erster Index, Indexzahl. */
export const TEIL_FELDER = 5;

export interface Geometriegruppe {
  readonly durchsichtig: boolean;
  /** x, y, z je Ecke in Weltkoordinaten */
  readonly positionen: Float32Array;
  /** nx, ny, nz je Ecke, Länge 1 */
  readonly normalen: Float32Array;
  /** Eckennummern der ganzen Gruppe (ein Zeichenaufruf je Gruppe); die Dreiecke eines Teils liegen am Stück */
  readonly indizes: Uint32Array;
  /** `TEIL_FELDER` Werte je Teil */
  readonly teile: Uint32Array;
  /** r, g, b, Deckkraft je Teil */
  readonly farben: Float32Array;
  /** min x, y, z, max x, y, z je Teil */
  readonly grenzen: Float32Array;
}

/** Ab dieser Deckkraft gilt ein Teil als deckend. */
const DECKEND_AB = 0.999;

interface Sammlung {
  readonly positionen: Float32Array[];
  readonly normalen: Float32Array[];
  readonly indizes: Uint32Array[];
  readonly teile: number[];
  readonly farben: number[];
  readonly grenzen: number[];
  ecken: number;
  indexzahl: number;
}

const neueSammlung = (): Sammlung => ({
  positionen: [],
  normalen: [],
  indizes: [],
  teile: [],
  farben: [],
  grenzen: [],
  ecken: 0,
  indexzahl: 0,
});

function verbinden<T extends Float32Array | Uint32Array>(teile: readonly T[], neu: (n: number) => T): T {
  const ziel = neu(teile.reduce((n, t) => n + t.length, 0));
  let stelle = 0;
  for (const t of teile) {
    ziel.set(t, stelle);
    stelle += t.length;
  }
  return ziel;
}

/** Inverse Transponierte des oberen 3 × 3-Teils (zeilenweise), für Normalen; bei singulärer Lage die Lage selbst. */
function normalenmatrix(m: ArrayLike<number>): number[] {
  const e = (zeile: number, spalte: number): number => m[spalte * 4 + zeile] ?? 0;
  const [a, b, c, d, f, g, h, i, j] = [
    e(0, 0),
    e(0, 1),
    e(0, 2),
    e(1, 0),
    e(1, 1),
    e(1, 2),
    e(2, 0),
    e(2, 1),
    e(2, 2),
  ];
  // Kofaktoren; (A⁻¹)ᵀ = Kofaktormatrix / det
  const k = [f * j - g * i, g * h - d * j, d * i - f * h, c * i - b * j, a * j - c * h, b * h - a * i];
  const kofaktoren = [
    k[0],
    k[1],
    k[2],
    k[3],
    k[4],
    k[5],
    b * g - c * f,
    c * d - a * g,
    a * f - b * d,
  ] as number[];
  const det = a * (kofaktoren[0] ?? 0) + b * (kofaktoren[1] ?? 0) + c * (kofaktoren[2] ?? 0);
  if (Math.abs(det) < 1e-12) return [a, b, c, d, f, g, h, i, j];
  return kofaktoren.map((x) => x / det);
}

/** Sammelt die Teile eines Modells und fasst sie je Deckung zusammen. */
export class Geometriesammler {
  readonly #deckend = neueSammlung();
  readonly #durchsichtig = neueSammlung();
  #min: [number, number, number] = [Infinity, Infinity, Infinity];
  #max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  hinzufuegen(t: Rohteil): void {
    const s = t.farbe[3] >= DECKEND_AB ? this.#deckend : this.#durchsichtig;
    const anzahl = Math.floor(t.ecken.length / 6);
    const positionen = new Float32Array(anzahl * 3);
    const normalen = new Float32Array(anzahl * 3);
    const m = t.lage;
    const n = normalenmatrix(m);
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < anzahl; i++) {
      const [x, y, z, nx, ny, nz] = [
        t.ecken[i * 6] ?? 0,
        t.ecken[i * 6 + 1] ?? 0,
        t.ecken[i * 6 + 2] ?? 0,
        t.ecken[i * 6 + 3] ?? 0,
        t.ecken[i * 6 + 4] ?? 0,
        t.ecken[i * 6 + 5] ?? 0,
      ];
      for (let k = 0; k < 3; k++) {
        const p = (m[k] ?? 0) * x + (m[4 + k] ?? 0) * y + (m[8 + k] ?? 0) * z + (m[12 + k] ?? 0);
        positionen[i * 3 + k] = p;
        if (p < (min[k] ?? Infinity)) min[k] = p;
        if (p > (max[k] ?? -Infinity)) max[k] = p;
      }
      const qx = (n[0] ?? 0) * nx + (n[1] ?? 0) * ny + (n[2] ?? 0) * nz;
      const qy = (n[3] ?? 0) * nx + (n[4] ?? 0) * ny + (n[5] ?? 0) * nz;
      const qz = (n[6] ?? 0) * nx + (n[7] ?? 0) * ny + (n[8] ?? 0) * nz;
      const laenge = Math.hypot(qx, qy, qz) || 1;
      normalen[i * 3] = qx / laenge;
      normalen[i * 3 + 1] = qy / laenge;
      normalen[i * 3 + 2] = qz / laenge;
    }
    s.teile.push(t.bauteil, s.ecken, anzahl, s.indexzahl, t.dreiecke.length);
    s.farben.push(...t.farbe);
    s.grenzen.push(...min, ...max);
    s.positionen.push(positionen);
    s.normalen.push(normalen);
    s.indizes.push(s.ecken === 0 ? t.dreiecke : t.dreiecke.map((e) => e + s.ecken));
    s.ecken += anzahl;
    s.indexzahl += t.dreiecke.length;
    for (let k = 0; k < 3; k++) {
      this.#min[k] = Math.min(this.#min[k] ?? Infinity, min[k] ?? Infinity);
      this.#max[k] = Math.max(this.#max[k] ?? -Infinity, max[k] ?? -Infinity);
    }
  }

  /** Grenzen aller Teile, `null` ohne Teile. */
  grenzen(): Grenzen | null {
    if (this.#deckend.teile.length + this.#durchsichtig.teile.length === 0) return null;
    return { min: [...this.#min] as Vec3, max: [...this.#max] as Vec3 };
  }

  /** Die nicht leeren Gruppen, deckend zuerst. */
  fertig(): Geometriegruppe[] {
    const gruppen: Geometriegruppe[] = [];
    for (const [s, durchsichtig] of [
      [this.#deckend, false],
      [this.#durchsichtig, true],
    ] as const) {
      if (s.teile.length === 0) continue;
      gruppen.push({
        durchsichtig,
        positionen: verbinden(s.positionen, (n) => new Float32Array(n)),
        normalen: verbinden(s.normalen, (n) => new Float32Array(n)),
        indizes: verbinden(s.indizes, (n) => new Uint32Array(n)),
        teile: new Uint32Array(s.teile),
        farben: new Float32Array(s.farben),
        grenzen: new Float32Array(s.grenzen),
      });
    }
    return gruppen;
  }
}
