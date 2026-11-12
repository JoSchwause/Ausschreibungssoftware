// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { bedienen, kameraposition, passenderAbstand, startansicht, zeigen } from './kamera';
import type { Kamerastand, Vec3 } from './kamera';

const nahe = (a: Vec3, b: Vec3): void => {
  a.forEach((x, i) => {
    expect(x).toBeCloseTo(b[i] ?? Number.NaN, 9);
  });
};
const grad = (g: number): number => (g * Math.PI) / 180;
const vorne: Kamerastand = { ziel: [0, 0, 0], azimut: 0, hoehe: 0, abstand: 10 };

describe('Kamera: Umlauf um ein Ziel (y ist oben, wie web-ifc liefert)', () => {
  it('steht bei Azimut 0 und Höhe 0 vor dem Ziel auf der z-Achse', () => {
    nahe(kameraposition(vorne), [0, 0, 10]);
    nahe(kameraposition({ ...vorne, azimut: grad(90) }), [10, 0, 0]);
    nahe(kameraposition({ ...vorne, ziel: [1, 2, 3], hoehe: grad(90) }), [1, 12, 3]);
  });

  it('Abstand für das ganze Modell: die umschließende Kugel passt in den Sichtwinkel von 45°', () => {
    // halbe Raumdiagonale 1: Abstand 1 / sin(22,5°)
    const einheit = { min: [-1, 0, 0], max: [1, 0, 0] } as const;
    expect(passenderAbstand(einheit, 1)).toBeCloseTo(2.613125929752753, 9);
    // Hochformat: der waagerechte Sichtwinkel ist enger (tan 22,5° × 0,5 → halber Winkel 11,70°)
    expect(passenderAbstand(einheit, 0.5)).toBeCloseTo(4.9309, 3);
    // ein Punkt als Modell: kein Abstand 0
    expect(passenderAbstand({ min: [2, 2, 2], max: [2, 2, 2] }, 1)).toBeGreaterThan(0);
  });

  it('Startansicht: schräg von oben (Azimut 45°, Höhe 30°) auf die Mitte des Modells', () => {
    const k = startansicht({ min: [0, 0, 0], max: [4, 2, 6] }, 1.6);
    nahe(k.ziel, [2, 1, 3]);
    expect(k.azimut).toBeCloseTo(grad(45), 9);
    expect(k.hoehe).toBeCloseTo(grad(30), 9);
    expect(k.abstand).toBeCloseTo(passenderAbstand({ min: [0, 0, 0], max: [4, 2, 6] }, 1.6), 9);
  });

  it('„Auswahl zeigen“ richtet Ziel und Abstand auf die Grenzen, die Blickrichtung bleibt', () => {
    const vorher: Kamerastand = { ziel: [9, 9, 9], azimut: grad(10), hoehe: grad(20), abstand: 50 };
    const k = zeigen(vorher, { min: [-1, 0, 0], max: [1, 0, 0] }, 1);
    nahe(k.ziel, [0, 0, 0]);
    expect(k.abstand).toBeCloseTo(2.613125929752753, 9);
    expect(k.azimut).toBe(vorher.azimut);
    expect(k.hoehe).toBe(vorher.hoehe);
  });
});

describe('Kamera: Bedienbefehle', () => {
  it('drehen: links und rechts um 15° um die Senkrechte, hoch und runter um 15° bis höchstens 89°', () => {
    expect(bedienen(vorne, { art: 'drehen', richtung: 'links' }).azimut).toBeCloseTo(grad(-15), 9);
    expect(bedienen(vorne, { art: 'drehen', richtung: 'rechts' }).azimut).toBeCloseTo(grad(15), 9);
    expect(bedienen(vorne, { art: 'drehen', richtung: 'hoch' }).hoehe).toBeCloseTo(grad(15), 9);
    expect(bedienen(vorne, { art: 'drehen', richtung: 'runter' }).hoehe).toBeCloseTo(grad(-15), 9);
    expect(bedienen({ ...vorne, hoehe: grad(80) }, { art: 'drehen', richtung: 'hoch' }).hoehe).toBeCloseTo(
      grad(89),
      9,
    );
    expect(
      bedienen({ ...vorne, hoehe: grad(-80) }, { art: 'drehen', richtung: 'runter' }).hoehe,
    ).toBeCloseTo(grad(-89), 9);
  });

  it('drehen rechts bewegt die Kamera nach rechts (von vorn gesehen: zur +x-Seite)', () => {
    const k = bedienen(vorne, { art: 'drehen', richtung: 'rechts' });
    expect(kameraposition(k)[0]).toBeGreaterThan(0);
  });

  it('verschieben: Ziel und Kamera wandern um ein Zehntel des Abstands in Richtung der Taste', () => {
    nahe(bedienen(vorne, { art: 'verschieben', richtung: 'rechts' }).ziel, [1, 0, 0]);
    nahe(bedienen(vorne, { art: 'verschieben', richtung: 'links' }).ziel, [-1, 0, 0]);
    nahe(bedienen(vorne, { art: 'verschieben', richtung: 'hoch' }).ziel, [0, 1, 0]);
    // von der Seite (+x) gesehen ist rechts die −z-Richtung
    nahe(bedienen({ ...vorne, azimut: grad(90) }, { art: 'verschieben', richtung: 'rechts' }).ziel, [0, 0, -1]);
    const k = bedienen(vorne, { art: 'verschieben', richtung: 'runter' });
    expect(k.abstand).toBe(10);
    nahe(kameraposition(k), [0, -1, 10]);
  });

  it('zoomen: näher auf vier Fünftel des Abstands, weiter auf fünf Viertel', () => {
    expect(bedienen(vorne, { art: 'zoomen', richtung: 'naeher' }).abstand).toBeCloseTo(8, 9);
    expect(bedienen(vorne, { art: 'zoomen', richtung: 'weiter' }).abstand).toBeCloseTo(12.5, 9);
  });
});
