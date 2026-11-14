// SPDX-License-Identifier: AGPL-3.0-or-later
// Die 3D-Leinwand mit three.js, ohne React: Szene, Kamera, Zeichnen nur bei Bedarf, Picken über einen CPU-Raycast
// (D-50). Je Deckung (deckend, durchsichtig) ein zusammengeführter Puffer mit Bereichen je Teil, gezeichnet mit einem
// einzigen Aufruf (D-100.5): Die Farbe steht je Ecke im Puffer, ein ausgeblendetes Teil bekommt entartete Dreiecke in
// seinem Indexbereich. So gehen Hervorheben, Ausblenden, Isolieren und Färben je Bauteil ohne neues Laden, und eine
// Änderung lädt nur die geänderten Bereiche neu auf die GPU. Licht je Ecke (`schattierung.ts`). Bedienung: Maus und
// Tastatur (`tasten.ts`).

import type { IfcGlobalId } from '@tethys/vertrag';
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sphere,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { ShaderMaterial } from 'three';
import { darstellungBerechnen } from './darstellung';
import type { Anzeigefarbe, Darstellungseingaben } from './darstellung';
import { farbtafelLesen } from './farben';
import type { Farbrolle } from './farben';
import { TEIL_FELDER } from './geometrie';
import type { Modellgeometrie } from './geometrie-lesen';
import {
  bedienen as kameraBedienen,
  drehen,
  kameraposition,
  radius,
  SICHTWINKEL,
  startansicht,
  verschieben,
  zeigen,
  zoomen,
} from './kamera';
import type { Grenzen, Kamerastand } from './kamera';
import { gruppenmaterial, softwareRasterung } from './schattierung';
import { befehlAusTaste } from './tasten';
import type { Bedienbefehl } from './tasten';
import type { Bildschirmpunkt, Darstellungsstand } from './typen';
import { Bauteilverzeichnis } from './zuordnung';

export interface LeinwandRueckrufe {
  /** Klick ohne Ziehen: getroffenes Bauteil oder `null`; `ergaenzen` bei Strg bzw. Cmd */
  readonly klick: (globalId: IfcGlobalId | null, ergaenzen: boolean) => void;
}

/** WebGL 2 ist nicht verfügbar. */
export class WebglFehlt extends Error {
  override readonly name = 'WebglFehlt';
}

/** Eine Deckungsgruppe: ein Netz, ein Zeichenaufruf. */
interface Gruppe {
  readonly netz: Mesh<BufferGeometry, ShaderMaterial>;
  /** r, g, b, Deckkraft je Ecke (linear), der Farbpuffer des Netzes */
  readonly farben: Float32Array;
  /** Indexpuffer des Netzes: ausgeblendete Teile entartet */
  readonly indizes: Uint32Array;
  /** die Dreiecke, wie der Worker sie liefert */
  readonly original: Uint32Array;
  /** `TEIL_FELDER` je Teil (Bauteil, erste Ecke, Eckenzahl, erster Index, Indexzahl) */
  readonly teile: Uint32Array;
  /** eigene Farbe je Teil (linear r, g, b, Deckkraft) */
  readonly eigene: Float32Array;
  /** min x y z, max x y z je Teil (für den Raycast) */
  readonly grenzen: Float32Array;
  /** angewandt je Teil */
  readonly sichtbar: Uint8Array;
  readonly angewandt: (Anzeigefarbe | null)[];
}

interface Teilverweis {
  readonly gruppe: number;
  readonly teil: number;
}

interface Zeiger {
  readonly id: number;
  readonly taste: number;
  readonly startX: number;
  readonly startY: number;
  readonly verschieben: boolean;
  x: number;
  y: number;
  gezogen: boolean;
}

/** Ab so vielen Pixeln Bewegung ist ein Druck ein Ziehen und kein Klick. */
const ZIEHSCHWELLE_PX = 4;
/** Höchstens so viele Dreiecke je Teil probiert `bildschirmpunkt`. */
const PROBEN_JE_TEIL = 64;
/** Ab so vielen geänderten Bereichen wird ein Puffer ganz statt stückweise hochgeladen. */
const HOECHSTENS_BEREICHE = 64;
const START: Kamerastand = { ziel: [0, 0, 0], azimut: Math.PI / 4, hoehe: Math.PI / 6, abstand: 10 };

/** Merkt geänderte Bereiche eines Puffers und lädt sie gesammelt hoch. */
class Bereiche {
  readonly #liste: [number, number][] = [];

  merken(start: number, anzahl: number): void {
    this.#liste.push([start, anzahl]);
  }

  hochladen(attribut: BufferAttribute): void {
    if (this.#liste.length === 0) return;
    attribut.clearUpdateRanges();
    if (this.#liste.length <= HOECHSTENS_BEREICHE) {
      for (const [start, anzahl] of this.#liste) attribut.addUpdateRange(start, anzahl);
    }
    attribut.needsUpdate = true;
    this.#liste.length = 0;
  }
}

export class Leinwand {
  readonly #canvas: HTMLCanvasElement;
  readonly #rueckrufe: LeinwandRueckrufe;
  readonly #renderer: WebGLRenderer;
  readonly #szene = new Scene();
  readonly #kamera3d = new PerspectiveCamera((SICHTWINKEL * 180) / Math.PI, 1, 0.01, 1000);
  readonly #raycaster = new Raycaster();
  readonly #trennen: (() => void)[] = [];

  #gruppen: Gruppe[] = [];
  /** je Bauteilindex seine Teile */
  #teile: Teilverweis[][] = [];
  /** je Bauteilindex min x y z, max x y z */
  #grenzenJeBauteil = new Float32Array(0);
  #verzeichnis: Bauteilverzeichnis | null = null;
  #grenzen: Grenzen | null = null;
  #kamera: Kamerastand = START;
  #eingaben: Darstellungseingaben = { auswahl: [], ausgeblendet: [], isoliert: null, faerbung: new Map() };
  #farben = new Map<Farbrolle, Color>();
  #bilder = 0;
  #angefordert: number | null = null;
  #wartende: (() => void)[] = [];
  #zeiger: Zeiger | null = null;

  constructor(canvas: HTMLCanvasElement, rueckrufe: LeinwandRueckrufe) {
    this.#canvas = canvas;
    this.#rueckrufe = rueckrufe;
    try {
      // Kantenglättung nur mit GPU; in der Software-Rasterung kostet sie ein Mehrfaches der Bildzeit (D-100.6).
      this.#renderer = new WebGLRenderer({ canvas, antialias: !softwareRasterung() });
    } catch (e) {
      throw new WebglFehlt(e instanceof Error ? e.message : String(e));
    }
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.outputColorSpace = SRGBColorSpace;

    const ereignisse: [string, EventListener, AddEventListenerOptions?][] = [
      ['pointerdown', this.#runter as EventListener],
      ['pointermove', this.#bewegt as EventListener],
      ['pointerup', this.#hoch as EventListener],
      ['pointercancel', this.#abgebrochen],
      ['wheel', this.#rad as EventListener, { passive: false }],
      ['keydown', this.#taste as EventListener],
      ['contextmenu', this.#kontextmenue],
    ];
    for (const [art, f, optionen] of ereignisse) canvas.addEventListener(art, f, optionen);
    this.#trennen.push(() => {
      for (const [art, f] of ereignisse) canvas.removeEventListener(art, f);
    });

    const groesse = new ResizeObserver(() => {
      this.#groesseAnpassen();
    });
    groesse.observe(canvas);
    // Schema hell/dunkel: data-theme an <html> oder einem Vorfahren
    const schema = new MutationObserver(() => {
      this.#farbenLesen();
      this.#darstellungAnwenden(true);
    });
    schema.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
      subtree: true,
    });
    this.#trennen.push(
      () => {
        groesse.disconnect();
      },
      () => {
        schema.disconnect();
      },
    );

    this.#farbenLesen();
    this.#groesseAnpassen();
  }

  get verzeichnis(): Bauteilverzeichnis | null {
    return this.#verzeichnis;
  }

  /** Zeigt ein neues Modell (das alte wird freigegeben) in der Startansicht. */
  modellZeigen(g: Modellgeometrie): void {
    this.#netzeFreigeben();
    const verzeichnis = new Bauteilverzeichnis(g.globalIdJeIndex);
    const teile: Teilverweis[][] = Array.from({ length: verzeichnis.anzahl }, () => []);
    const grenzen = new Float32Array(verzeichnis.anzahl * 6);
    for (let i = 0; i < verzeichnis.anzahl; i++) {
      grenzen.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], i * 6);
    }
    const farbe = new Color();
    for (const gruppe of g.gruppen) {
      const anzahl = gruppe.teile.length / TEIL_FELDER;
      const nr = this.#gruppen.length;
      const eigene = new Float32Array(anzahl * 4);
      const farben = new Float32Array((gruppe.positionen.length / 3) * 4);
      const box = new Box3();
      for (let t = 0; t < anzahl; t++) {
        const bauteil = gruppe.teile[t * TEIL_FELDER] ?? 0;
        teile[bauteil]?.push({ gruppe: nr, teil: t });
        farbe.setRGB(
          gruppe.farben[t * 4] ?? 1,
          gruppe.farben[t * 4 + 1] ?? 1,
          gruppe.farben[t * 4 + 2] ?? 1,
          SRGBColorSpace,
        );
        eigene.set([farbe.r, farbe.g, farbe.b, gruppe.farben[t * 4 + 3] ?? 1], t * 4);
        for (let k = 0; k < 3; k++) {
          const unten = gruppe.grenzen[t * 6 + k] ?? Infinity;
          const oben = gruppe.grenzen[t * 6 + 3 + k] ?? -Infinity;
          grenzen[bauteil * 6 + k] = Math.min(grenzen[bauteil * 6 + k] ?? Infinity, unten);
          grenzen[bauteil * 6 + 3 + k] = Math.max(grenzen[bauteil * 6 + 3 + k] ?? -Infinity, oben);
        }
        box.expandByPoint(
          new Vector3(gruppe.grenzen[t * 6], gruppe.grenzen[t * 6 + 1], gruppe.grenzen[t * 6 + 2]),
        );
        box.expandByPoint(
          new Vector3(gruppe.grenzen[t * 6 + 3], gruppe.grenzen[t * 6 + 4], gruppe.grenzen[t * 6 + 5]),
        );
      }
      const indizes = gruppe.indizes.slice();
      const geometrie = new BufferGeometry();
      geometrie.setAttribute('position', new BufferAttribute(gruppe.positionen, 3));
      geometrie.setAttribute('normal', new BufferAttribute(gruppe.normalen, 3));
      geometrie.setAttribute('farbe', new BufferAttribute(farben, 4));
      geometrie.setIndex(new BufferAttribute(indizes, 1));
      geometrie.boundingBox = box;
      geometrie.boundingSphere = box.getBoundingSphere(new Sphere());
      const netz = new Mesh(geometrie, gruppenmaterial(gruppe.durchsichtig));
      this.#szene.add(netz);
      this.#gruppen.push({
        netz,
        farben,
        indizes,
        original: gruppe.indizes,
        teile: gruppe.teile,
        eigene,
        grenzen: gruppe.grenzen,
        sichtbar: new Uint8Array(anzahl).fill(1),
        angewandt: new Array<Anzeigefarbe | null>(anzahl).fill(null),
      });
    }
    this.#verzeichnis = verzeichnis;
    this.#teile = teile;
    this.#grenzenJeBauteil = grenzen;
    this.#grenzen = g.grenzen;
    this.#kameraSetzen(g.grenzen ? startansicht(g.grenzen, this.#kamera3d.aspect) : START);
    this.#darstellungAnwenden(true);
  }

  darstellungSetzen(e: Darstellungseingaben): void {
    this.#eingaben = e;
    this.#darstellungAnwenden(false);
  }

  bedienen(b: Bedienbefehl): void {
    switch (b.art) {
      case 'auswahl-zeigen': {
        const g = this.#grenzenVon(this.#eingaben.auswahl);
        if (g) this.#kameraSetzen(zeigen(this.#kamera, g, this.#kamera3d.aspect));
        return;
      }
      case 'zuruecksetzen':
        this.#kameraSetzen(this.#grenzen ? startansicht(this.#grenzen, this.#kamera3d.aspect) : START);
        return;
      default:
        this.#kameraSetzen(kameraBedienen(this.#kamera, b));
    }
  }

  /** Erfüllt sich nach dem nächsten Bild, wenn eines aussteht, sonst sofort. */
  gezeichnet(): Promise<void> {
    if (this.#angefordert === null) return Promise.resolve();
    return new Promise((erfuellen) => this.#wartende.push(erfuellen));
  }

  darstellung(): Darstellungsstand {
    const v = this.#verzeichnis;
    const sichtbar = new Set<IfcGlobalId>();
    const hervorgehoben = new Set<IfcGlobalId>();
    const farben: Record<string, string> = {};
    const farbe = new Color();
    if (v) {
      this.#teile.forEach((liste, i) => {
        const erster = liste[0];
        const g = erster ? this.#gruppen[erster.gruppe] : undefined;
        if (!erster || !g) return;
        const id = v.globalId(i);
        const zuSehen = g.sichtbar[erster.teil] === 1;
        if (zuSehen) sichtbar.add(id);
        if (zuSehen && g.angewandt[erster.teil] === 'auswahl') hervorgehoben.add(id);
        const ecke = (g.teile[erster.teil * TEIL_FELDER + 1] ?? 0) * 4;
        farbe.setRGB(g.farben[ecke] ?? 0, g.farben[ecke + 1] ?? 0, g.farben[ecke + 2] ?? 0);
        farben[id] = `#${farbe.getHexString()}`;
      });
    }
    return {
      geladen: v !== null,
      bauteile: v?.anzahl ?? 0,
      sichtbar: [...sichtbar],
      hervorgehoben: [...hervorgehoben],
      farben,
      hintergrund: `#${this.#renderer.getClearColor(farbe).getHexString()}`,
      kamera: this.#kamera,
      bilder: this.#bilder,
    };
  }

  bildschirmpunkt(globalId: IfcGlobalId): Bildschirmpunkt | null {
    const v = this.#verzeichnis;
    if (!v) return null;
    const ziele = new Set(v.indizes(globalId));
    const punkt = new Vector3();
    const ndc = new Vector2();
    const rechteck = this.#canvas.getBoundingClientRect();
    this.#kamera3d.updateMatrixWorld();
    const probieren = (p: Vector3): Bildschirmpunkt | null => {
      p.project(this.#kamera3d);
      if (Math.abs(p.x) > 0.98 || Math.abs(p.y) > 0.98 || p.z > 1 || p.z < -1) return null;
      const treffer = this.#picken(ndc.set(p.x, p.y));
      if (treffer === null || !ziele.has(treffer)) return null;
      return {
        x: rechteck.left + ((p.x + 1) / 2) * rechteck.width,
        y: rechteck.top + ((1 - p.y) / 2) * rechteck.height,
      };
    };
    for (const i of ziele) {
      const g = this.#grenzenJeBauteil.subarray(i * 6, i * 6 + 6);
      const mitte = probieren(
        punkt.set(
          ((g[0] ?? 0) + (g[3] ?? 0)) / 2,
          ((g[1] ?? 0) + (g[4] ?? 0)) / 2,
          ((g[2] ?? 0) + (g[5] ?? 0)) / 2,
        ),
      );
      if (mitte) return mitte;
      for (const { gruppe, teil } of this.#teile[i] ?? []) {
        const gr = this.#gruppen[gruppe];
        if (!gr || gr.sichtbar[teil] !== 1) continue;
        const lage = gr.netz.geometry.getAttribute('position');
        const f = teil * TEIL_FELDER;
        const index = gr.teile[f + 3] ?? 0;
        const dreiecke = Math.min(PROBEN_JE_TEIL, Math.floor((gr.teile[f + 4] ?? 0) / 3));
        for (let d = 0; d < dreiecke; d++) {
          punkt.set(0, 0, 0);
          for (let e = 0; e < 3; e++) {
            const ecke = gr.original[index + d * 3 + e] ?? 0;
            punkt.x += lage.getX(ecke) / 3;
            punkt.y += lage.getY(ecke) / 3;
            punkt.z += lage.getZ(ecke) / 3;
          }
          const p = probieren(punkt);
          if (p) return p;
        }
      }
    }
    return null;
  }

  entsorgen(): void {
    if (this.#angefordert !== null) cancelAnimationFrame(this.#angefordert);
    this.#angefordert = null;
    for (const f of this.#wartende.splice(0)) f();
    for (const f of this.#trennen.splice(0)) f();
    this.#netzeFreigeben();
    this.#renderer.dispose();
  }

  // ---------------------------------------------------------------------------------------------------------------

  #netzeFreigeben(): void {
    for (const { netz } of this.#gruppen) {
      this.#szene.remove(netz);
      netz.geometry.dispose();
      netz.material.dispose();
    }
    this.#gruppen = [];
    this.#teile = [];
    this.#verzeichnis = null;
  }

  #farbenLesen(): void {
    const tafel = farbtafelLesen(this.#canvas);
    this.#farben = new Map(
      (Object.entries(tafel) as [Farbrolle, string][]).map(([rolle, wert]) => [
        rolle,
        new Color(wert || '#808080'),
      ]),
    );
    this.#renderer.setClearColor(this.#farben.get('hintergrund') ?? new Color(0x808080), 1);
    this.#anfordern();
  }

  /** Überträgt Sichtbarkeit und Farbe je Bauteil in die Puffer; nur geänderte Teile (oder alle mit `erzwingen`). */
  #darstellungAnwenden(erzwingen: boolean): void {
    const v = this.#verzeichnis;
    if (!v) return;
    const d = darstellungBerechnen(v, this.#eingaben);
    const farbBereiche = this.#gruppen.map(() => new Bereiche());
    const indexBereiche = this.#gruppen.map(() => new Bereiche());
    this.#teile.forEach((liste, i) => {
      const art = d.farbe[i] ?? 'eigen';
      const sichtbar = (d.sichtbar[i] ?? true) ? 1 : 0;
      for (const { gruppe, teil } of liste) {
        const g = this.#gruppen[gruppe];
        if (!g) continue;
        const f = teil * TEIL_FELDER;
        const [ecke, ecken, index, indexzahl] = [
          g.teile[f + 1] ?? 0,
          g.teile[f + 2] ?? 0,
          g.teile[f + 3] ?? 0,
          g.teile[f + 4] ?? 0,
        ];
        if (g.sichtbar[teil] !== sichtbar) {
          if (sichtbar) g.indizes.set(g.original.subarray(index, index + indexzahl), index);
          else g.indizes.fill(ecke, index, index + indexzahl);
          g.sichtbar[teil] = sichtbar;
          indexBereiche[gruppe]?.merken(index, indexzahl);
        }
        // ein Teil ohne angewandte Farbe (null) unterscheidet sich immer von `art`
        if (g.angewandt[teil] !== art || (erzwingen && art !== 'eigen')) {
          const tafel = art === 'eigen' ? null : this.#farben.get(art);
          const deckkraft = g.eigene[teil * 4 + 3] ?? 1;
          const [r, gr, b] = tafel
            ? [tafel.r, tafel.g, tafel.b]
            : [g.eigene[teil * 4] ?? 1, g.eigene[teil * 4 + 1] ?? 1, g.eigene[teil * 4 + 2] ?? 1];
          for (let k = ecke; k < ecke + ecken; k++) {
            g.farben[k * 4] = r;
            g.farben[k * 4 + 1] = gr;
            g.farben[k * 4 + 2] = b;
            g.farben[k * 4 + 3] = deckkraft;
          }
          g.angewandt[teil] = art;
          farbBereiche[gruppe]?.merken(ecke * 4, ecken * 4);
        }
      }
    });
    this.#gruppen.forEach((g, n) => {
      const index = g.netz.geometry.getIndex();
      const farbe = g.netz.geometry.getAttribute('farbe');
      if (index) indexBereiche[n]?.hochladen(index);
      if (farbe instanceof BufferAttribute) farbBereiche[n]?.hochladen(farbe);
    });
    this.#anfordern();
  }

  #grenzenVon(globalIds: readonly IfcGlobalId[]): Grenzen | null {
    const v = this.#verzeichnis;
    if (!v) return null;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const id of globalIds) {
      for (const i of v.indizes(id)) {
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k] ?? Infinity, this.#grenzenJeBauteil[i * 6 + k] ?? Infinity);
          max[k] = Math.max(max[k] ?? -Infinity, this.#grenzenJeBauteil[i * 6 + 3 + k] ?? -Infinity);
        }
      }
    }
    if (!Number.isFinite(min[0]) || !Number.isFinite(max[0])) return null;
    return { min: [min[0] ?? 0, min[1] ?? 0, min[2] ?? 0], max: [max[0] ?? 0, max[1] ?? 0, max[2] ?? 0] };
  }

  #kameraSetzen(k: Kamerastand): void {
    this.#kamera = k;
    const c = this.#kamera3d;
    const [x, y, z] = kameraposition(k);
    c.position.set(x, y, z);
    c.up.set(0, 1, 0);
    c.lookAt(k.ziel[0], k.ziel[1], k.ziel[2]);
    const r = this.#grenzen ? radius(this.#grenzen) : 1;
    c.far = k.abstand + r * 4 + 1;
    c.near = Math.max(c.far / 20000, 0.005);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    this.#anfordern();
  }

  #groesseAnpassen(): void {
    const w = this.#canvas.clientWidth;
    const h = this.#canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.#renderer.setSize(w, h, false);
    this.#kamera3d.aspect = w / h;
    this.#kamera3d.updateProjectionMatrix();
    this.#anfordern();
  }

  #anfordern(): void {
    if (this.#angefordert !== null) return;
    this.#angefordert = requestAnimationFrame(() => {
      this.#angefordert = null;
      this.#renderer.render(this.#szene, this.#kamera3d);
      this.#bilder += 1;
      for (const f of this.#wartende.splice(0)) f();
    });
  }

  /**
   * Bauteilindex unter einem Punkt in Gerätekoordinaten (−1 … 1), CPU-Raycast (D-100.7): erst die Grenzen je sichtbarem
   * Teil, dann nur die Dreiecke der Teile, deren Grenzen der Strahl vor dem bisher nächsten Treffer schneidet.
   */
  #picken(ndc: Vector2): number | null {
    this.#raycaster.setFromCamera(ndc, this.#kamera3d);
    const strahl = this.#raycaster.ray;
    const box = new Box3();
    const [a, b, c, punkt] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    let naechster = Infinity;
    let bauteil: number | null = null;
    for (const g of this.#gruppen) {
      const lage = g.netz.geometry.getAttribute('position');
      const anzahl = g.teile.length / TEIL_FELDER;
      for (let t = 0; t < anzahl; t++) {
        if (g.sichtbar[t] !== 1) continue;
        box.min.fromArray(g.grenzen, t * 6);
        box.max.fromArray(g.grenzen, t * 6 + 3);
        // ebene Teile (Grenzen ohne Dicke) sicher treffen
        if (!strahl.intersectBox(box.expandByScalar(1e-4), punkt)) continue;
        if (strahl.origin.distanceTo(punkt) >= naechster) continue;
        const f = t * TEIL_FELDER;
        const start = g.teile[f + 3] ?? 0;
        const ende = start + (g.teile[f + 4] ?? 0);
        for (let i = start; i < ende; i += 3) {
          a.fromBufferAttribute(lage, g.original[i] ?? 0);
          b.fromBufferAttribute(lage, g.original[i + 1] ?? 0);
          c.fromBufferAttribute(lage, g.original[i + 2] ?? 0);
          if (!strahl.intersectTriangle(a, b, c, false, punkt)) continue;
          const abstand = strahl.origin.distanceTo(punkt);
          if (abstand < naechster) {
            naechster = abstand;
            bauteil = g.teile[f] ?? null;
          }
        }
      }
    }
    return bauteil;
  }

  #pickenBei(clientX: number, clientY: number): number | null {
    const r = this.#canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return this.#picken(
      new Vector2(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1)),
    );
  }

  readonly #runter = (e: PointerEvent): void => {
    if (e.button > 2) return;
    try {
      this.#canvas.setPointerCapture(e.pointerId);
    } catch {
      // synthetische Zeigerereignisse haben keinen aktiven Zeiger
    }
    this.#zeiger = {
      id: e.pointerId,
      taste: e.button,
      startX: e.clientX,
      startY: e.clientY,
      verschieben: e.button !== 0 || e.shiftKey,
      x: e.clientX,
      y: e.clientY,
      gezogen: false,
    };
  };

  readonly #bewegt = (e: PointerEvent): void => {
    const z = this.#zeiger;
    if (!z || e.pointerId !== z.id) return;
    const dx = e.clientX - z.x;
    const dy = e.clientY - z.y;
    z.x = e.clientX;
    z.y = e.clientY;
    if (!z.gezogen && Math.hypot(e.clientX - z.startX, e.clientY - z.startY) < ZIEHSCHWELLE_PX) return;
    z.gezogen = true;
    const hoehe = this.#canvas.clientHeight || 1;
    if (z.verschieben) {
      const weltJePixel = (2 * this.#kamera.abstand * Math.tan(SICHTWINKEL / 2)) / hoehe;
      this.#kameraSetzen(verschieben(this.#kamera, -dx * weltJePixel, dy * weltJePixel));
    } else {
      this.#kameraSetzen(drehen(this.#kamera, (-dx * 2 * Math.PI) / hoehe, (dy * 2 * Math.PI) / hoehe));
    }
  };

  readonly #hoch = (e: PointerEvent): void => {
    const z = this.#zeiger;
    if (!z || e.pointerId !== z.id) return;
    this.#zeiger = null;
    try {
      this.#canvas.releasePointerCapture(e.pointerId);
    } catch {
      // siehe #runter
    }
    const v = this.#verzeichnis;
    if (z.gezogen || z.taste !== 0 || !v) return;
    const treffer = this.#pickenBei(e.clientX, e.clientY);
    this.#rueckrufe.klick(treffer === null ? null : v.globalId(treffer), e.ctrlKey || e.metaKey);
  };

  readonly #abgebrochen = (): void => {
    this.#zeiger = null;
  };

  readonly #rad = (e: WheelEvent): void => {
    e.preventDefault();
    const zeilen = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 33 : 1;
    this.#kameraSetzen(zoomen(this.#kamera, Math.exp(e.deltaY * zeilen * 0.0015)));
  };

  readonly #taste = (e: KeyboardEvent): void => {
    const b = befehlAusTaste(e);
    if (!b) return;
    e.preventDefault();
    this.bedienen(b);
  };

  readonly #kontextmenue = (e: Event): void => {
    e.preventDefault();
  };
}
