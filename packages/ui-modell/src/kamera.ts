// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Kamera der Leinwand als reiner Zustand: ein Ziel, um das sie in festem Abstand umläuft. Die y-Achse zeigt nach oben
// (web-ifc dreht die z-oben-Koordinaten der IFC-Datei so). Maus und Tastatur ändern nur diesen Zustand; `leinwand.ts`
// überträgt ihn auf die three.js-Kamera.

import type { Bedienbefehl, Richtung } from './tasten';

export type Vec3 = readonly [number, number, number];

/** Achsparallele Grenzen (Bounding Box) in Metern. */
export interface Grenzen {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface Kamerastand {
  readonly ziel: Vec3;
  /** Umlaufwinkel um die Senkrechte in Bogenmaß; 0 = Kamera auf der +z-Seite des Ziels, wachsend zur +x-Seite. */
  readonly azimut: number;
  /** Höhenwinkel über der Waagerechten in Bogenmaß, höchstens ±89°. */
  readonly hoehe: number;
  readonly abstand: number;
}

/** Senkrechter Sichtwinkel der Kamera in Bogenmaß (45°). */
export const SICHTWINKEL = Math.PI / 4;

const GRAD = Math.PI / 180;
const DREHSCHRITT = 15 * GRAD;
const HOEHE_GRENZE = 89 * GRAD;
/** Anteil des Abstands je Verschiebeschritt. */
const VERSCHIEBESCHRITT = 0.1;
const ZOOMSCHRITT = 0.8;
const KLEINSTER_ABSTAND = 0.001;

export type Kamerabefehl = Extract<Bedienbefehl, { art: 'drehen' | 'verschieben' | 'zoomen' }>;

export function kameraposition(k: Kamerastand): Vec3 {
  const waagerecht = Math.cos(k.hoehe) * k.abstand;
  return [
    k.ziel[0] + waagerecht * Math.sin(k.azimut),
    k.ziel[1] + Math.sin(k.hoehe) * k.abstand,
    k.ziel[2] + waagerecht * Math.cos(k.azimut),
  ];
}

/** Rechts und oben der Bildebene in Weltkoordinaten. */
export function bildachsen(k: Kamerastand): { readonly rechts: Vec3; readonly oben: Vec3 } {
  const [sa, ca, sh, ch] = [Math.sin(k.azimut), Math.cos(k.azimut), Math.sin(k.hoehe), Math.cos(k.hoehe)];
  return { rechts: [ca, 0, -sa], oben: [-sa * sh, ch, -ca * sh] };
}

export function mitte(g: Grenzen): Vec3 {
  return [(g.min[0] + g.max[0]) / 2, (g.min[1] + g.max[1]) / 2, (g.min[2] + g.max[2]) / 2];
}

/** Halbe Raumdiagonale: der Radius einer Kugel um die Grenzen. */
export function radius(g: Grenzen): number {
  return Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]) / 2;
}

/** Abstand, aus dem die Kugel um die Grenzen genau in den engeren der beiden Sichtwinkel passt. */
export function passenderAbstand(g: Grenzen, seitenverhaeltnis: number): number {
  const r = radius(g) || 1;
  const senkrecht = SICHTWINKEL / 2;
  const waagerecht = Math.atan(Math.tan(senkrecht) * seitenverhaeltnis);
  return r / Math.sin(Math.min(senkrecht, waagerecht));
}

/** Schräg von oben auf das ganze Modell. */
export function startansicht(g: Grenzen, seitenverhaeltnis: number): Kamerastand {
  return {
    ziel: mitte(g),
    azimut: 45 * GRAD,
    hoehe: 30 * GRAD,
    abstand: passenderAbstand(g, seitenverhaeltnis),
  };
}

/** Ziel und Abstand auf die Grenzen, die Blickrichtung bleibt. */
export function zeigen(k: Kamerastand, g: Grenzen, seitenverhaeltnis: number): Kamerastand {
  return { ...k, ziel: mitte(g), abstand: passenderAbstand(g, seitenverhaeltnis) };
}

export function drehen(k: Kamerastand, dAzimut: number, dHoehe: number): Kamerastand {
  const hoehe = Math.min(HOEHE_GRENZE, Math.max(-HOEHE_GRENZE, k.hoehe + dHoehe));
  return { ...k, azimut: k.azimut + dAzimut, hoehe };
}

/** Verschiebt Ziel und Kamera in der Bildebene (Weltmaß, nach rechts und nach oben). */
export function verschieben(k: Kamerastand, nachRechts: number, nachOben: number): Kamerastand {
  const { rechts, oben } = bildachsen(k);
  return {
    ...k,
    ziel: [
      k.ziel[0] + rechts[0] * nachRechts + oben[0] * nachOben,
      k.ziel[1] + rechts[1] * nachRechts + oben[1] * nachOben,
      k.ziel[2] + rechts[2] * nachRechts + oben[2] * nachOben,
    ],
  };
}

export function zoomen(k: Kamerastand, faktor: number): Kamerastand {
  return { ...k, abstand: Math.max(KLEINSTER_ABSTAND, k.abstand * faktor) };
}

const RICHTUNG: Readonly<Record<Richtung, readonly [number, number]>> = {
  links: [-1, 0],
  rechts: [1, 0],
  hoch: [0, 1],
  runter: [0, -1],
};

/** Ein Tastaturschritt; die Kamera bewegt sich in Richtung der Taste. */
export function bedienen(k: Kamerastand, b: Kamerabefehl): Kamerastand {
  switch (b.art) {
    case 'drehen': {
      const [x, y] = RICHTUNG[b.richtung];
      return drehen(k, x * DREHSCHRITT, y * DREHSCHRITT);
    }
    case 'verschieben': {
      const [x, y] = RICHTUNG[b.richtung];
      const schritt = k.abstand * VERSCHIEBESCHRITT;
      return verschieben(k, x * schritt, y * schritt);
    }
    case 'zoomen':
      return zoomen(k, b.richtung === 'naeher' ? ZOOMSCHRITT : 1 / ZOOMSCHRITT);
  }
}
