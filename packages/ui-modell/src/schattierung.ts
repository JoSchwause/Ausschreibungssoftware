// SPDX-License-Identifier: AGPL-3.0-or-later
// Material der Leinwand (D-100.6): Licht je Ecke statt je Bildpunkt. Die Teile sind eben (Normale je Fläche), das Licht
// je Ecke ist deshalb so genau wie das je Bildpunkt; der Bildpunkt-Shader kopiert nur noch eine Farbe. Das hält ein Bild
// mit 10.000 Bauteilen auch in der Software-Rasterung (SwiftShader) schnell. Die Farbe kommt linear aus dem Puffer
// `farbe` (r, g, b, Deckkraft) und wird hier nach sRGB gewandelt.

import { DoubleSide, FrontSide, ShaderMaterial, Vector3 } from 'three';

const ECKEN = /* glsl */ `
attribute vec4 farbe;
uniform vec3 lichtRichtung;
varying vec4 vFarbe;

vec3 linearZuSrgb(vec3 c) {
  vec3 hell = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(c * 12.92, hell, step(vec3(0.0031308), c));
}

void main() {
  vec3 n = normalize(normalMatrix * normal);
  // Grundlicht, ein Licht schräg über der Kamera (Blickraum) und etwas Himmel von oben (Weltraum, y oben)
  float licht = 0.5 + 0.38 * max(dot(n, lichtRichtung), 0.0) + 0.12 * normal.y;
  vFarbe = vec4(linearZuSrgb(clamp(farbe.rgb * licht, 0.0, 1.0)), farbe.a);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BILDPUNKTE = /* glsl */ `
varying vec4 vFarbe;

void main() {
  gl_FragColor = vFarbe;
}
`;

/** Material einer Deckungsgruppe; deckende Teile nur mit Vorderseiten (geschlossene Körper), Glas beidseitig. */
export function gruppenmaterial(durchsichtig: boolean): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: ECKEN,
    fragmentShader: BILDPUNKTE,
    uniforms: { lichtRichtung: { value: new Vector3(-1, 2, 1).normalize() } },
    side: durchsichtig ? DoubleSide : FrontSide,
    transparent: durchsichtig,
    depthWrite: !durchsichtig,
  });
}

/** Ob WebGL nur in Software rasterisiert (SwiftShader, llvmpipe …); dann ohne Kantenglättung (D-100.6). */
export function softwareRasterung(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return false;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}
