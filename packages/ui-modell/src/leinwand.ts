// SPDX-License-Identifier: AGPL-3.0-or-later
// Die 3D-Leinwand mit three.js, ohne React: Szene, Kamera, Zeichnen nur bei Bedarf, Picken über einen CPU-Raycast
// (D-50). Je Deckung ein `BatchedMesh`; jedes Teil eines Bauteils ist eine Instanz darin, so dass Hervorheben, Ausblenden
// und Färben je Bauteil ohne neues Laden gehen. Bedienung: Maus (drehen, verschieben, zoomen) und Tastatur (`tasten.ts`).

import {
  BatchedMesh,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Sphere,
  SRGBColorSpace,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';
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
import { befehlAusTaste } from './tasten';
import type { Bedienbefehl } from './tasten';
import type { Bildschirmpunkt, Darstellungsstand } from './typen';
import { Bauteilverzeichnis } from './zuordnung';

export interface LeinwandRueckrufe {
  /** Klick ohne Ziehen: getroffenes Bauteil oder `null`; `ergaenzen` bei Strg bzw. Cmd */
  readonly klick: (globalId: string | null, ergaenzen: boolean) => void;
}

/** WebGL 2 ist nicht verfügbar. */
export class WebglFehlt extends Error {
  override readonly name = 'WebglFehlt';
}

interface Instanz {
  readonly netz: number;
  readonly id: number;
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
const START: Kamerastand = { ziel: [0, 0, 0], azimut: Math.PI / 4, hoehe: Math.PI / 6, abstand: 10 };

export class Leinwand {
  readonly #canvas: HTMLCanvasElement;
  readonly #rueckrufe: LeinwandRueckrufe;
  readonly #renderer: WebGLRenderer;
  readonly #szene = new Scene();
  readonly #kamera3d = new PerspectiveCamera((SICHTWINKEL * 180) / Math.PI, 1, 0.01, 1000);
  readonly #raycaster = new Raycaster();
  readonly #beobachter: { trennen(): void }[] = [];

  #netze: BatchedMesh[] = [];
  /** je Netz: Bauteilindex je Instanz */
  #bauteilJeInstanz: Int32Array[] = [];
  /** je Netz: Farbe aus der IFC-Datei je Instanz (linear, r g b a) */
  #eigeneFarben: Float32Array[] = [];
  /** je Bauteilindex seine Instanzen */
  #instanzen: Instanz[][] = [];
  /** je Bauteilindex min x y z, max x y z */
  #grenzenJeBauteil = new Float32Array(0);
  #verzeichnis: Bauteilverzeichnis | null = null;
  #grenzen: Grenzen | null = null;
  #kamera: Kamerastand = START;
  #eingaben: Darstellungseingaben = { auswahl: [], ausgeblendet: [], isoliert: null, faerbung: new Map() };
  #angewandt: readonly Anzeigefarbe[] = [];
  #sichtbar: readonly boolean[] = [];
  #farben = new Map<Farbrolle, Color>();
  #bilder = 0;
  #angefordert: number | null = null;
  #wartende: (() => void)[] = [];
  #zeiger: Zeiger | null = null;

  constructor(canvas: HTMLCanvasElement, rueckrufe: LeinwandRueckrufe) {
    this.#canvas = canvas;
    this.#rueckrufe = rueckrufe;
    try {
      this.#renderer = new WebGLRenderer({ canvas, antialias: true });
    } catch (e) {
      throw new WebglFehlt(e instanceof Error ? e.message : String(e));
    }
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.outputColorSpace = SRGBColorSpace;

    // Licht: Himmel und Boden, dazu ein Licht schräg über der Kamera, das mit ihr wandert.
    this.#szene.add(new HemisphereLight(0xffffff, 0x8c8c8c, 2.2));
    const licht = new DirectionalLight(0xffffff, 1.6);
    licht.position.set(-1, 2, 1);
    const lichtziel = new Object3D();
    lichtziel.position.set(0, 0, -1);
    licht.target = lichtziel;
    this.#kamera3d.add(licht, lichtziel);
    this.#szene.add(this.#kamera3d);

    canvas.addEventListener('pointerdown', this.#runter);
    canvas.addEventListener('pointermove', this.#bewegt);
    canvas.addEventListener('pointerup', this.#hoch);
    canvas.addEventListener('pointercancel', this.#abgebrochen);
    canvas.addEventListener('wheel', this.#rad, { passive: false });
    canvas.addEventListener('keydown', this.#taste);
    canvas.addEventListener('contextmenu', this.#kontextmenue);

    const groesse = new ResizeObserver(() => {
      this.#groesseAnpassen();
    });
    groesse.observe(canvas);
    // Schema hell/dunkel: data-theme an <html> oder einem Vorfahren
    const schema = new MutationObserver(() => {
      this.#farbenLesen();
      this.#darstellungAnwenden();
    });
    schema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'], subtree: true });
    this.#beobachter.push(
      {
        trennen: () => {
          groesse.disconnect();
        },
      },
      {
        trennen: () => {
          schema.disconnect();
        },
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
    const instanzen: Instanz[][] = Array.from({ length: verzeichnis.anzahl }, () => []);
    const grenzen = new Float32Array(verzeichnis.anzahl * 6);
    for (let i = 0; i < verzeichnis.anzahl; i++) grenzen.set([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], i * 6);

    const farbe = new Color();
    const v4 = new Vector4();
    for (const gruppe of g.gruppen) {
      const anzahl = gruppe.teile.length / TEIL_FELDER;
      const material = new MeshLambertMaterial({
        color: 0xffffff,
        side: DoubleSide,
        transparent: gruppe.durchsichtig,
        depthWrite: !gruppe.durchsichtig,
      });
      const netz = new BatchedMesh(anzahl, gruppe.positionen.length / 3, gruppe.indizes.length, material);
      const nr = this.#netze.length;
      const bauteilJeInstanz = new Int32Array(anzahl);
      const eigene = new Float32Array(anzahl * 4);
      for (let t = 0; t < anzahl; t++) {
        const f = t * TEIL_FELDER;
        const [bauteil, ecke, ecken, index, indexzahl] = [
          gruppe.teile[f] ?? 0,
          gruppe.teile[f + 1] ?? 0,
          gruppe.teile[f + 2] ?? 0,
          gruppe.teile[f + 3] ?? 0,
          gruppe.teile[f + 4] ?? 0,
        ];
        const geo = new BufferGeometry();
        geo.setAttribute('position', new BufferAttribute(gruppe.positionen.subarray(ecke * 3, (ecke + ecken) * 3), 3));
        geo.setAttribute('normal', new BufferAttribute(gruppe.normalen.subarray(ecke * 3, (ecke + ecken) * 3), 3));
        geo.setIndex(new BufferAttribute(gruppe.indizes.subarray(index, index + indexzahl), 1));
        const b = gruppe.grenzen.subarray(t * 6, t * 6 + 6);
        geo.boundingBox = new Box3(new Vector3(b[0], b[1], b[2]), new Vector3(b[3], b[4], b[5]));
        geo.boundingSphere = geo.boundingBox.getBoundingSphere(new Sphere());
        const id = netz.addInstance(netz.addGeometry(geo));
        bauteilJeInstanz[id] = bauteil;
        instanzen[bauteil]?.push({ netz: nr, id });
        farbe.setRGB(gruppe.farben[t * 4] ?? 1, gruppe.farben[t * 4 + 1] ?? 1, gruppe.farben[t * 4 + 2] ?? 1, SRGBColorSpace);
        eigene.set([farbe.r, farbe.g, farbe.b, gruppe.farben[t * 4 + 3] ?? 1], id * 4);
        netz.setColorAt(id, v4.set(farbe.r, farbe.g, farbe.b, gruppe.farben[t * 4 + 3] ?? 1));
        for (let k = 0; k < 3; k++) {
          grenzen[bauteil * 6 + k] = Math.min(grenzen[bauteil * 6 + k] ?? Infinity, b[k] ?? Infinity);
          grenzen[bauteil * 6 + 3 + k] = Math.max(grenzen[bauteil * 6 + 3 + k] ?? -Infinity, b[3 + k] ?? -Infinity);
        }
      }
      netz.computeBoundingBox();
      netz.computeBoundingSphere();
      this.#szene.add(netz);
      this.#netze.push(netz);
      this.#bauteilJeInstanz.push(bauteilJeInstanz);
      this.#eigeneFarben.push(eigene);
    }
    this.#verzeichnis = verzeichnis;
    this.#instanzen = instanzen;
    this.#grenzenJeBauteil = grenzen;
    this.#grenzen = g.grenzen;
    this.#kameraSetzen(g.grenzen ? startansicht(g.grenzen, this.#kamera3d.aspect) : START);
    this.#darstellungAnwenden();
  }

  darstellungSetzen(e: Darstellungseingaben): void {
    this.#eingaben = e;
    this.#darstellungAnwenden();
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
    const sichtbar = new Set<string>();
    const hervorgehoben = new Set<string>();
    const farben: Record<string, string> = {};
    const v4 = new Vector4();
    const farbe = new Color();
    if (v) {
      this.#instanzen.forEach((liste, i) => {
        const erste = liste[0];
        if (!erste) return;
        const netz = this.#netze[erste.netz];
        if (!netz) return;
        const id = v.globalId(i);
        const zuSehen = netz.getVisibleAt(erste.id);
        if (zuSehen) sichtbar.add(id);
        if (zuSehen && this.#angewandt[i] === 'auswahl') hervorgehoben.add(id);
        netz.getColorAt(erste.id, v4);
        farben[id] = `#${farbe.setRGB(v4.x, v4.y, v4.z).getHexString()}`;
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

  bildschirmpunkt(globalId: string): Bildschirmpunkt | null {
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
      if (!this.#sichtbar[i]) continue;
      const g = this.#grenzenJeBauteil.subarray(i * 6, i * 6 + 6);
      const mitte = probieren(
        punkt.set(((g[0] ?? 0) + (g[3] ?? 0)) / 2, ((g[1] ?? 0) + (g[4] ?? 0)) / 2, ((g[2] ?? 0) + (g[5] ?? 0)) / 2),
      );
      if (mitte) return mitte;
      for (const inst of this.#instanzen[i] ?? []) {
        const netz = this.#netze[inst.netz];
        const bereich = netz?.getGeometryRangeAt(netz.getGeometryIdAt(inst.id));
        const index = netz?.geometry.getIndex();
        const lage = netz?.geometry.getAttribute('position');
        if (!bereich || !index || !lage) continue;
        const dreiecke = Math.min(PROBEN_JE_TEIL, Math.floor(bereich.indexCount / 3));
        for (let d = 0; d < dreiecke; d++) {
          punkt.set(0, 0, 0);
          for (let e = 0; e < 3; e++) {
            const ecke = index.getX(bereich.indexStart + d * 3 + e);
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
    for (const b of this.#beobachter) b.trennen();
    const c = this.#canvas;
    c.removeEventListener('pointerdown', this.#runter);
    c.removeEventListener('pointermove', this.#bewegt);
    c.removeEventListener('pointerup', this.#hoch);
    c.removeEventListener('pointercancel', this.#abgebrochen);
    c.removeEventListener('wheel', this.#rad);
    c.removeEventListener('keydown', this.#taste);
    c.removeEventListener('contextmenu', this.#kontextmenue);
    this.#netzeFreigeben();
    this.#renderer.dispose();
  }

  // ---------------------------------------------------------------------------------------------------------------

  #netzeFreigeben(): void {
    for (const netz of this.#netze) {
      this.#szene.remove(netz);
      netz.dispose();
      (netz.material as MeshLambertMaterial).dispose();
    }
    this.#netze = [];
    this.#bauteilJeInstanz = [];
    this.#eigeneFarben = [];
    this.#instanzen = [];
    this.#verzeichnis = null;
  }

  #farbenLesen(): void {
    const tafel = farbtafelLesen(this.#canvas);
    this.#farben = new Map(
      (Object.entries(tafel) as [Farbrolle, string][]).map(([rolle, wert]) => [rolle, new Color(wert || '#808080')]),
    );
    this.#renderer.setClearColor(this.#farben.get('hintergrund') ?? new Color(0x808080), 1);
    this.#anfordern();
  }

  #darstellungAnwenden(): void {
    const v = this.#verzeichnis;
    if (!v) return;
    const d = darstellungBerechnen(v, this.#eingaben);
    const v4 = new Vector4();
    this.#instanzen.forEach((liste, i) => {
      const art = d.farbe[i] ?? 'eigen';
      const sichtbar = d.sichtbar[i] ?? true;
      for (const { netz: n, id } of liste) {
        const netz = this.#netze[n];
        const eigene = this.#eigeneFarben[n];
        if (!netz || !eigene) continue;
        netz.setVisibleAt(id, sichtbar);
        const deckkraft = eigene[id * 4 + 3] ?? 1;
        const f = art === 'eigen' ? null : this.#farben.get(art);
        if (f) netz.setColorAt(id, v4.set(f.r, f.g, f.b, deckkraft));
        else netz.setColorAt(id, v4.set(eigene[id * 4] ?? 1, eigene[id * 4 + 1] ?? 1, eigene[id * 4 + 2] ?? 1, deckkraft));
      }
    });
    this.#angewandt = d.farbe;
    this.#sichtbar = d.sichtbar;
    this.#anfordern();
  }

  #grenzenVon(globalIds: readonly string[]): Grenzen | null {
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

  /** Bauteilindex unter einem Punkt in Gerätekoordinaten (−1 … 1). */
  #picken(ndc: Vector2): number | null {
    this.#raycaster.setFromCamera(ndc, this.#kamera3d);
    const [treffer] = this.#raycaster.intersectObjects(this.#netze, false);
    if (!treffer || treffer.batchId === undefined) return null;
    const n = this.#netze.indexOf(treffer.object as BatchedMesh);
    return this.#bauteilJeInstanz[n]?.[treffer.batchId] ?? null;
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
