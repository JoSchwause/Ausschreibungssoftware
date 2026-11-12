// SPDX-License-Identifier: AGPL-3.0-or-later
// Selbst verfasste IFC-4-Prüfmodelle (C4) für Unit-Tests und den Prüfstand: Quader als extrudierte Rechtecke
// (`IfcExtrudedAreaSolid` mit `IfcRectangleProfileDef`), wahlweise mit Öffnung (`IfcOpeningElement`, `IfcRelVoidsElement`),
// Farbe und Transparenz. Die GlobalIds kommen aus einem Zähler, nie aus dem Zufall. Nur für Tests (testhilfe/).

export interface Quader {
  /** Mitte der Grundfläche im Geschoss (IFC: z oben), in Metern */
  readonly x: number;
  readonly y: number;
  /** Unterkante über dem Geschoss */
  readonly z: number;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
}

export interface Stil {
  readonly name: string;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0 = deckend */
  readonly transparenz: number;
}

export type Bauteilklasse = 'IFCWALL' | 'IFCSLAB' | 'IFCCOLUMN' | 'IFCWINDOW' | 'IFCBUILDINGELEMENTPROXY';

export interface Bauteilvorgabe {
  readonly globalId: string;
  readonly klasse: Bauteilklasse;
  readonly name: string;
  readonly geschoss: number;
  /** ohne Körper: das Bauteil hat keine Geometrie */
  readonly koerper?: Quader;
  readonly stil?: Stil;
  /** Öffnung, die web-ifc vom Körper abzieht */
  readonly oeffnung?: { readonly globalId: string; readonly koerper: Quader };
}

export interface Raumvorgabe {
  readonly globalId: string;
  readonly name: string;
  readonly geschoss: number;
  readonly koerper: Quader;
}

export interface Modellvorgabe {
  readonly geschosse: readonly { readonly globalId: string; readonly name: string; readonly hoehe: number }[];
  readonly bauteile: readonly Bauteilvorgabe[];
  readonly raeume: readonly Raumvorgabe[];
}

const ALPHABET = /^[0-9A-Za-z_$]+$/;

/** Feste, gültige GlobalId (22 Zeichen, IFC-Base64-Alphabet, erstes Zeichen 0): `0` + Präfix + Zahl mit Nullen. */
export function globalId(praefix: string, n: number): string {
  const ziffern = String(n);
  if (!ALPHABET.test(praefix) || 1 + praefix.length + ziffern.length > 22) {
    throw new Error(`GlobalId passt nicht: ${praefix} ${ziffern}`);
  }
  return `0${praefix}${ziffern.padStart(21 - praefix.length, '0')}`;
}

const zahl = (x: number): string => {
  const s = String(x);
  return s.includes('.') || s.includes('e') ? s.toUpperCase() : `${s}.`;
};
const text = (s: string): string => `'${s.replace(/'/g, "''")}'`;

export const STILE = {
  wand: { name: 'Wand', r: 0.82, g: 0.8, b: 0.76, transparenz: 0 },
  decke: { name: 'Decke', r: 0.62, g: 0.62, b: 0.64, transparenz: 0 },
  stuetze: { name: 'Stuetze', r: 0.5, g: 0.52, b: 0.55, transparenz: 0 },
  glas: { name: 'Glas', r: 0.55, g: 0.75, b: 0.9, transparenz: 0.6 },
} as const satisfies Record<string, Stil>;

/** Schreibt das Modell als IFC-4-Text (STEP, ISO 10303-21). */
export function ifcText(m: Modellvorgabe): string {
  const z: string[] = [];
  let n = 0;
  const neu = (inhalt: string): string => {
    n += 1;
    z.push(`#${String(n)}=${inhalt};`);
    return `#${String(n)}`;
  };
  let gid = 0;
  const relId = (): string => globalId('Rel', ++gid);

  const ursprung = neu('IFCCARTESIANPOINT((0.,0.,0.))');
  const zAchse = neu('IFCDIRECTION((0.,0.,1.))');
  const xAchse = neu('IFCDIRECTION((1.,0.,0.))');
  const welt = neu(`IFCAXIS2PLACEMENT3D(${ursprung},${zAchse},${xAchse})`);
  const ursprung2d = neu('IFCCARTESIANPOINT((0.,0.))');
  const lage2d = neu(`IFCAXIS2PLACEMENT2D(${ursprung2d},$)`);
  const kontext = neu(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${welt},$)`);
  const koerperKontext = neu(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${kontext},$,.MODEL_VIEW.,$)`);
  const einheiten = [
    neu('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)'),
    neu('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)'),
    neu('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)'),
    neu('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)'),
  ];
  const zuweisung = neu(`IFCUNITASSIGNMENT((${einheiten.join(',')}))`);
  const projekt = neu(`IFCPROJECT(${text(globalId('Projekt', 1))},$,'Pruefmodell',$,$,$,$,(${kontext}),${zuweisung})`);
  const lageGrund = neu(`IFCLOCALPLACEMENT($,${welt})`);
  const grundstueck = neu(
    `IFCSITE(${text(globalId('Grund', 1))},$,'Grundstueck',$,$,${lageGrund},$,$,.ELEMENT.,$,$,$,$,$)`,
  );
  const lageGebaeude = neu(`IFCLOCALPLACEMENT(${lageGrund},${welt})`);
  const gebaeude = neu(
    `IFCBUILDING(${text(globalId('Gebaeude', 1))},$,'Gebaeude',$,$,${lageGebaeude},$,$,.ELEMENT.,$,$,$)`,
  );
  neu(`IFCRELAGGREGATES(${text(relId())},$,$,$,${projekt},(${grundstueck}))`);
  neu(`IFCRELAGGREGATES(${text(relId())},$,$,$,${grundstueck},(${gebaeude}))`);

  const geschosse = m.geschosse.map((g) => {
    const punkt = neu(`IFCCARTESIANPOINT((0.,0.,${zahl(g.hoehe)}))`);
    const lage = neu(`IFCLOCALPLACEMENT(${lageGebaeude},${neu(`IFCAXIS2PLACEMENT3D(${punkt},$,$)`)})`);
    const geschoss = neu(
      `IFCBUILDINGSTOREY(${text(g.globalId)},$,${text(g.name)},$,$,${lage},$,$,.ELEMENT.,${zahl(g.hoehe)})`,
    );
    return { geschoss, lage };
  });
  if (geschosse.length > 0) {
    neu(`IFCRELAGGREGATES(${text(relId())},$,$,$,${gebaeude},(${geschosse.map((g) => g.geschoss).join(',')}))`);
  }

  const stile = new Map<string, string>();
  const stilVon = (s: Stil): string => {
    const vorhanden = stile.get(s.name);
    if (vorhanden) return vorhanden;
    const farbe = neu(`IFCCOLOURRGB($,${zahl(s.r)},${zahl(s.g)},${zahl(s.b)})`);
    const darstellung = neu(`IFCSURFACESTYLERENDERING(${farbe},${zahl(s.transparenz)},$,$,$,$,$,$,.NOTDEFINED.)`);
    const stil = neu(`IFCSURFACESTYLE(${text(s.name)},.BOTH.,(${darstellung}))`);
    stile.set(s.name, stil);
    return stil;
  };

  /** Lage und Körperform eines Quaders im Geschoss. */
  const quader = (geschoss: number, q: Quader, stil?: Stil): { lage: string; form: string } => {
    const g = geschosse[geschoss];
    if (!g) throw new Error(`Kein Geschoss ${String(geschoss)}`);
    const punkt = neu(`IFCCARTESIANPOINT((${zahl(q.x)},${zahl(q.y)},${zahl(q.z)}))`);
    const lage = neu(`IFCLOCALPLACEMENT(${g.lage},${neu(`IFCAXIS2PLACEMENT3D(${punkt},$,$)`)})`);
    const profil = neu(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${lage2d},${zahl(q.dx)},${zahl(q.dy)})`);
    const koerper = neu(`IFCEXTRUDEDAREASOLID(${profil},${welt},${zAchse},${zahl(q.dz)})`);
    if (stil) neu(`IFCSTYLEDITEM(${koerper},(${stilVon(stil)}),$)`);
    const darstellung = neu(`IFCSHAPEREPRESENTATION(${koerperKontext},'Body','SweptSolid',(${koerper}))`);
    return { lage, form: neu(`IFCPRODUCTDEFINITIONSHAPE($,$,(${darstellung}))`) };
  };

  const enthalten = new Map<number, string[]>();
  for (const b of m.bauteile) {
    const g = geschosse[b.geschoss];
    if (!g) throw new Error(`Kein Geschoss ${String(b.geschoss)}`);
    const { lage, form } = b.koerper
      ? quader(b.geschoss, b.koerper, b.stil)
      : { lage: neu(`IFCLOCALPLACEMENT(${g.lage},${welt})`), form: '$' };
    const kopf = `${text(b.globalId)},$,${text(b.name)},$,$,${lage},${form},$`;
    const element =
      b.klasse === 'IFCWINDOW'
        ? neu(`IFCWINDOW(${kopf},$,$,.WINDOW.,$,$)`)
        : neu(
            `${b.klasse}(${kopf},${
              { IFCWALL: '.STANDARD.', IFCSLAB: '.FLOOR.', IFCCOLUMN: '.COLUMN.', IFCBUILDINGELEMENTPROXY: '$' }[
                b.klasse
              ]
            })`,
          );
    const liste = enthalten.get(b.geschoss) ?? [];
    liste.push(element);
    enthalten.set(b.geschoss, liste);
    if (b.oeffnung) {
      const o = quader(b.geschoss, b.oeffnung.koerper);
      const oeffnung = neu(
        `IFCOPENINGELEMENT(${text(b.oeffnung.globalId)},$,'Oeffnung',$,$,${o.lage},${o.form},$,.OPENING.)`,
      );
      neu(`IFCRELVOIDSELEMENT(${text(relId())},$,$,$,${element},${oeffnung})`);
    }
  }
  for (const [geschoss, elemente] of enthalten) {
    const g = geschosse[geschoss];
    if (!g) continue;
    neu(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${text(relId())},$,$,$,(${elemente.join(',')}),${g.geschoss})`);
  }
  const raeumeJeGeschoss = new Map<number, string[]>();
  for (const r of m.raeume) {
    const { lage, form } = quader(r.geschoss, r.koerper);
    const raum = neu(`IFCSPACE(${text(r.globalId)},$,${text(r.name)},$,$,${lage},${form},$,.ELEMENT.,.INTERNAL.,$)`);
    const liste = raeumeJeGeschoss.get(r.geschoss) ?? [];
    liste.push(raum);
    raeumeJeGeschoss.set(r.geschoss, liste);
  }
  for (const [geschoss, raeume] of raeumeJeGeschoss) {
    const g = geschosse[geschoss];
    if (g) neu(`IFCRELAGGREGATES(${text(relId())},$,$,$,${g.geschoss},(${raeume.join(',')}))`);
  }

  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');",
    "FILE_NAME('pruefmodell.ifc','2026-11-12T00:00:00',('Tethys AVA'),('Tethys AVA'),'Tethys AVA Pruefstand','Tethys AVA','');",
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
    ...z,
    'ENDSEC;',
    'END-ISO-10303-21;',
    '',
  ].join('\n');
}

export function ifcBytes(m: Modellvorgabe): Uint8Array {
  return new TextEncoder().encode(ifcText(m));
}

/**
 * Ein Raum mit vier Wänden (10 m × 8 m, 3 m hoch), Bodenplatte, Stütze, einem Fenster in der Südwand (mit Öffnung),
 * einem Platzhalter ohne Geometrie und einem Raumkörper (wird nicht gezeichnet).
 */
export function kleinesModell(): Modellvorgabe {
  const wand = (n: number, name: string, koerper: Quader): Bauteilvorgabe => ({
    globalId: globalId('Wand', n),
    klasse: 'IFCWALL',
    name,
    geschoss: 0,
    koerper,
    stil: STILE.wand,
  });
  return {
    geschosse: [{ globalId: globalId('Geschoss', 1), name: 'EG', hoehe: 0 }],
    bauteile: [
      {
        ...wand(1, 'Wand Sued', { x: 5, y: 0, z: 0, dx: 10, dy: 0.3, dz: 3 }),
        oeffnung: { globalId: globalId('Oeffnung', 1), koerper: { x: 3, y: 0, z: 1, dx: 1.2, dy: 0.6, dz: 1.2 } },
      },
      wand(2, 'Wand Nord', { x: 5, y: 8, z: 0, dx: 10, dy: 0.3, dz: 3 }),
      wand(3, 'Wand West', { x: 0, y: 4, z: 0, dx: 0.3, dy: 8, dz: 3 }),
      wand(4, 'Wand Ost', { x: 10, y: 4, z: 0, dx: 0.3, dy: 8, dz: 3 }),
      {
        globalId: globalId('Platte', 1),
        klasse: 'IFCSLAB',
        name: 'Bodenplatte',
        geschoss: 0,
        koerper: { x: 5, y: 4, z: -0.25, dx: 10.3, dy: 8.3, dz: 0.25 },
        stil: STILE.decke,
      },
      {
        globalId: globalId('Stuetze', 1),
        klasse: 'IFCCOLUMN',
        name: 'Stuetze',
        geschoss: 0,
        koerper: { x: 6, y: 5, z: 0, dx: 0.4, dy: 0.4, dz: 3 },
        stil: STILE.stuetze,
      },
      {
        globalId: globalId('Fenster', 1),
        klasse: 'IFCWINDOW',
        name: 'Fenster',
        geschoss: 0,
        koerper: { x: 3, y: 0, z: 1, dx: 1.2, dy: 0.1, dz: 1.2 },
        stil: STILE.glas,
      },
      { globalId: globalId('Platzhalter', 1), klasse: 'IFCBUILDINGELEMENTPROXY', name: 'Platzhalter', geschoss: 0 },
    ],
    raeume: [
      {
        globalId: globalId('Raum', 1),
        name: 'Raum 1',
        geschoss: 0,
        koerper: { x: 5, y: 4, z: 0, dx: 9.7, dy: 7.7, dz: 3 },
      },
    ],
  };
}

/**
 * Großes Prüfmodell mit genau `anzahl` Bauteilen in 10 Geschossen (3 m): je Rasterfeld (5 m × 5 m) eine Wand in x- und
 * eine in y-Richtung, eine Stütze und eine Deckenplatte; jede fünfte Südwand hat ein Fenster mit Öffnung.
 */
export function grossesModell(anzahl: number, geschosszahl = 10): Modellvorgabe {
  const jeGeschoss = Math.ceil(anzahl / geschosszahl);
  const felderJeGeschoss = Math.ceil(jeGeschoss / 4);
  const seite = Math.ceil(Math.sqrt(felderJeGeschoss));
  const bauteile: Bauteilvorgabe[] = [];
  const geschosse = Array.from({ length: geschosszahl }, (_, g) => ({
    globalId: globalId('Geschoss', g + 1),
    name: `Geschoss ${String(g)}`,
    hoehe: g * 3,
  }));
  let nr = 0;
  const plus = (v: Omit<Bauteilvorgabe, 'globalId'>, praefix: string): void => {
    if (bauteile.length < anzahl) bauteile.push({ ...v, globalId: globalId(praefix, ++nr) });
  };
  for (let g = 0; g < geschosszahl && bauteile.length < anzahl; g++) {
    const ende = Math.min(anzahl, (g + 1) * jeGeschoss);
    for (let feld = 0; feld < felderJeGeschoss && bauteile.length < ende; feld++) {
      const x = (feld % seite) * 5;
      const y = Math.floor(feld / seite) * 5;
      const mitFenster = feld % 5 === 0;
      plus(
        {
          klasse: 'IFCWALL',
          name: 'Wand x',
          geschoss: g,
          koerper: { x: x + 2.5, y, z: 0, dx: 5, dy: 0.24, dz: 2.75 },
          stil: STILE.wand,
          ...(mitFenster
            ? {
                oeffnung: {
                  globalId: globalId('O', nr + 1),
                  koerper: { x: x + 2.5, y, z: 0.9, dx: 1.5, dy: 0.5, dz: 1.3 },
                },
              }
            : {}),
        },
        'W',
      );
      if (mitFenster && bauteile.length < ende) {
        plus(
          {
            klasse: 'IFCWINDOW',
            name: 'Fenster',
            geschoss: g,
            koerper: { x: x + 2.5, y, z: 0.9, dx: 1.5, dy: 0.08, dz: 1.3 },
            stil: STILE.glas,
          },
          'F',
        );
      }
      if (bauteile.length < ende) {
        plus(
          {
            klasse: 'IFCWALL',
            name: 'Wand y',
            geschoss: g,
            koerper: { x, y: y + 2.5, z: 0, dx: 0.24, dy: 5, dz: 2.75 },
            stil: STILE.wand,
          },
          'W',
        );
      }
      if (bauteile.length < ende) {
        plus(
          {
            klasse: 'IFCCOLUMN',
            name: 'Stuetze',
            geschoss: g,
            koerper: { x, y, z: 0, dx: 0.3, dy: 0.3, dz: 2.75 },
            stil: STILE.stuetze,
          },
          'S',
        );
      }
      if (bauteile.length < ende) {
        plus(
          {
            klasse: 'IFCSLAB',
            name: 'Decke',
            geschoss: g,
            koerper: { x: x + 2.5, y: y + 2.5, z: 2.75, dx: 5, dy: 5, dz: 0.25 },
            stil: STILE.decke,
          },
          'D',
        );
      }
    }
  }
  return { geschosse, bauteile, raeume: [] };
}
