// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Das IFC-Haus des Tors X1 (Ticket 99): ein kleines, erfundenes Haus mit Erdgeschoss und Obergeschoss in zwei Ständen
// (v1, v2), geschrieben als IFC 4 in m (`haus-v1.ifc`, `haus-v2.ifc`) und als IFC 2x3 in mm (`haus-v1-ifc2x3.ifc`).
// Beschreibung als Daten (Quader in m, exakt), Mengen aus der Geometrie (`mengenVon`), GlobalIds aus festen Schlüsseln:
// gleiche Kennung, gleiche GlobalId in allen Dateien und Ständen. Die README („BIM: Haus und Tor X1“) beschreibt Haus,
// Mengen, Zuordnung und Herleitung. Alle Namen und Werte sind erfunden.

import {
  NULL, dez, dezDeutsch, fuellungenVon, globalIdAusSchluessel, ifcSchreiber, laengeUndDicke, mal, mengenVon, minus,
  schreibeBauteil, summe,
} from './schreiben.mjs';

const zahl = (v) => (typeof v === 'string' ? dez(v) : v);
const de = dezDeutsch;

/** GlobalId eines Objekts des Hauses aus seiner Kennung (oder seinem Schlüssel). */
export const hausGuid = (schluessel) => globalIdAusSchluessel(`tethys-ava/fixtures/ifc/haus/${schluessel}`);

const WANDHOEHE = dez('2.75');
const PLATTENDICKE = dez('0.25');
const AUSSENMASS = { x: dez('11.99'), y: dez('8.24') };
const DICKE = { aussen: dez('0.365'), innen: dez('0.115'), trocken: dez('0.1') };

// ---------------------------------------------------------------- Eigenschaftssätze (Namen der IFC-Spezifikation)

const wandPset = (referenz, aussen, tragend, bisDecke, feuer, schall, uWert = null) => ({
  name: 'Pset_WallCommon',
  werte: [
    ['Reference', 'IfcIdentifier', referenz],
    ['IsExternal', 'IfcBoolean', aussen],
    ['LoadBearing', 'IfcBoolean', tragend],
    ['ExtendToStructure', 'IfcBoolean', bisDecke],
    ['FireRating', 'IfcLabel', feuer],
    ['AcousticRating', 'IfcLabel', schall],
    ...(uWert ? [['ThermalTransmittance', 'IfcThermalTransmittanceMeasure', dez(uWert)]] : []),
  ],
});

/** Erfundene Werte; `R'w` (mit Apostroph) prüft das Maskieren von Zeichenketten. */
const WAND = {
  aussen: {
    pset: wandPset('AW 36,5', true, true, false, 'REI 90', "R'w 52 dB", '0.23'),
    gruppen: { typ: 'Außenwand Ziegel 36,5', material: 'Mauerwerk Ziegel', kg: '331' },
  },
  innen: {
    pset: wandPset('IW 11,5', false, false, true, 'EI 30', "R'w 42 dB"),
    gruppen: { typ: 'Innenwand Kalksandstein 11,5', material: 'Mauerwerk Kalksandstein', kg: '342' },
  },
  trocken: {
    pset: wandPset('TW 10', false, false, true, 'EI 30', "R'w 44 dB"),
    gruppen: { typ: 'Trockenbauwand 10', material: 'Gipskarton', kg: '342' },
  },
};

const zentimeter = (m) => de(mal(m, dez('100')));

// ---------------------------------------------------------------- Bausteine (auch für das große Modell)

/**
 * Wand als Quader in Richtung `x` oder `y` ab der Ecke (x, y) im System des Geschosses; Art `aussen` (Ziegel 36,5),
 * `innen` (Kalksandstein 11,5, nichttragend) oder `trocken` (Trockenbau 10); Höhe 2,75 m.
 */
export function wand(kennung, name, art, x, y, laenge, richtung, oeffnungen = []) {
  const dicke = DICKE[art];
  return {
    kennung, klasse: 'IfcWall', name, richtung, art,
    ort: { x: zahl(x), y: zahl(y), z: NULL },
    masse: richtung === 'x'
      ? { dx: zahl(laenge), dy: dicke, dz: WANDHOEHE }
      : { dx: dicke, dy: zahl(laenge), dz: WANDHOEHE },
    psets: [WAND[art].pset],
    gruppen: WAND[art].gruppen,
    oeffnungen,
  };
}

/** Fensteröffnung ab `lage` entlang der Wand, Brüstung 0,885 m, Höhe 1,385 m, mit Fenster (Kennung `kennung`). */
export const fenster = (kennung, name, lage, breite) => ({
  kennung: `O-${kennung}`, name: `Öffnung ${kennung}`,
  lage: zahl(lage), unten: dez('0.885'), breite: zahl(breite), hoehe: dez('1.385'),
  fuellung: {
    kennung, klasse: 'IfcWindow', name,
    psets: [{
      name: 'Pset_WindowCommon',
      werte: [
        ['Reference', 'IfcIdentifier', `F ${zentimeter(zahl(breite))}/138,5`],
        ['IsExternal', 'IfcBoolean', true],
        ['ThermalTransmittance', 'IfcThermalTransmittanceMeasure', dez('1.1')],
      ],
    }],
    gruppen: { material: 'Holz-Aluminium', kg: '334' },
  },
});

/** Türöffnung ab `lage` entlang der Wand, vom Boden an, mit Tür; die Haustür (`aussen`) gehört zu KG 334, sonst 344. */
export const tuer = (kennung, name, lage, breite, hoehe, aussen) => ({
  kennung: `O-${kennung}`, name: `Öffnung ${kennung}`,
  lage: zahl(lage), unten: NULL, breite: zahl(breite), hoehe: zahl(hoehe),
  fuellung: {
    kennung, klasse: 'IfcDoor', name,
    psets: [{
      name: 'Pset_DoorCommon',
      werte: [
        ['Reference', 'IfcIdentifier', `T ${zentimeter(zahl(breite))}/${zentimeter(zahl(hoehe))}`],
        ['IsExternal', 'IfcBoolean', aussen],
        ['HandicapAccessible', 'IfcBoolean', false],
      ],
    }],
    gruppen: { material: 'Holz', kg: aussen ? '334' : '344' },
  },
});

/** Platte (Boden-, Geschoss- oder Dachplatte), Dicke 0,25 m, Unterkante `z` im System des Geschosses. */
export function platte(kennung, name, vordefiniert, x, y, dx, dy, z, { aussen, kg, aussparungen = [] }) {
  return {
    kennung, klasse: 'IfcSlab', name, vordefiniert,
    ort: { x: zahl(x), y: zahl(y), z: zahl(z) },
    masse: { dx: zahl(dx), dy: zahl(dy), dz: PLATTENDICKE },
    psets: [{
      name: 'Pset_SlabCommon',
      werte: [
        ['Reference', 'IfcIdentifier', `${vordefiniert === 'ROOF' ? 'Dach' : 'Platte'} 25`],
        ['IsExternal', 'IfcBoolean', aussen],
        ['LoadBearing', 'IfcBoolean', true],
        ['FireRating', 'IfcLabel', 'REI 90'],
      ],
    }],
    gruppen: { material: 'Stahlbeton', kg },
    aussparungen,
  };
}

/** Streifenfundament 0,60 m breit, 0,80 m hoch, Unterkante −1,05 m (unter der Bodenplatte). */
const fundament = (kennung, name, x, y, laenge, richtung) => ({
  kennung, klasse: 'IfcFooting', name, richtung,
  ort: { x: dez(x), y: dez(y), z: dez('-1.05') },
  masse: richtung === 'x'
    ? { dx: dez(laenge), dy: dez('0.6'), dz: dez('0.8') }
    : { dx: dez('0.6'), dy: dez(laenge), dz: dez('0.8') },
  gruppen: { material: 'Stahlbeton', kg: '322' },
});

// ---------------------------------------------------------------- Das Haus

/**
 * Beschreibung des Hauses im Stand `v1` oder `v2`. Außenmaß 11,99 × 8,24 m; Außenwände 36,5 cm (Süd und Nord über die
 * ganze Länge, West und Ost dazwischen); EG mit Mauerwerkswänden 11,5 cm, OG mit Trockenbauwänden 10 cm.
 * v2 gegenüber v1: Raumteiler IW-EG-3 entfernt, neuer Raumteiler IW-EG-4 (andere Lage, gleiche Maße), IW-EG-2 um 0,50 m
 * länger, Fenster F-EG-W von der Westwand des EG in die Westwand des OG, Bodenplatte umbenannt; sonst alles gleich.
 */
export function hausBeschreibung(stand) {
  if (stand !== 'v1' && stand !== 'v2') throw new Error(`Stand: v1 oder v2, nicht ${stand}`);
  const v2 = stand === 'v2';
  const fensterWest = fenster('F-EG-W', 'Fenster West', '1.635', '1.01');
  const eg = {
    kennung: 'EG', name: 'EG', langname: 'Erdgeschoss', hoehe: NULL,
    brutto: { unten: dez('-0.25'), oben: dez('3') },
    raeume: [
      { kennung: 'E.01', langname: 'Wohnen', x: '0.365', y: '0.365', dx: '6.375', dy: '7.51', abzug: [v2 ? 'IW-EG-4' : 'IW-EG-3'] },
      { kennung: 'E.02', langname: 'Flur', x: '6.855', y: '0.365', dx: '4.77', dy: '3.635' },
      { kennung: 'E.03', langname: 'Küche', x: '6.855', y: '4.115', dx: '4.77', dy: '3.76' },
    ],
    bauteile: [
      fundament('FU-S', 'Streifenfundament Süd', '-0.1175', '-0.1175', '12.225', 'x'),
      fundament('FU-N', 'Streifenfundament Nord', '-0.1175', '7.7575', '12.225', 'x'),
      fundament('FU-W', 'Streifenfundament West', '-0.1175', '0.4825', '7.275', 'y'),
      fundament('FU-O', 'Streifenfundament Ost', '11.5075', '0.4825', '7.275', 'y'),
      platte('PL-EG', v2 ? 'Bodenplatte WU-Beton' : 'Bodenplatte', 'BASESLAB', '0', '0', '11.99', '8.24', '-0.25', {
        aussen: true, kg: '322',
        aussparungen: [
          { kennung: 'AS-PL-EG', name: 'Aussparung Hausanschluss', x: dez('10.5'), y: dez('6.5'), dx: dez('0.4'), dy: dez('0.4') },
        ],
      }),
      wand('AW-EG-S', 'Außenwand Süd EG', 'aussen', '0', '0', '11.99', 'x', [
        fenster('F-EG-S', 'Fenster Wohnen', '2', '1.26'),
        tuer('T-EG-H', 'Haustür', '8.5', '1.135', '2.135', true),
      ]),
      wand('AW-EG-N', 'Außenwand Nord EG', 'aussen', '0', '7.875', '11.99', 'x', [
        fenster('F-EG-N', 'Fenster Küche', '8.5', '1.26'),
      ]),
      wand('AW-EG-W', 'Außenwand West EG', 'aussen', '0', '0.365', '7.51', 'y', v2 ? [] : [fensterWest]),
      wand('AW-EG-O', 'Außenwand Ost EG', 'aussen', '11.625', '0.365', '7.51', 'y'),
      wand('IW-EG-1', 'Innenwand Wohnen/Flur', 'innen', '6.74', '0.365', '7.51', 'y', [
        tuer('T-EG-1', 'Tür Wohnen', '1.135', '0.885', '2.01', false),
      ]),
      wand('IW-EG-2', 'Innenwand Flur/Küche', 'innen', '6.855', '4', v2 ? '3.645' : '3.145', 'x'),
      v2
        ? wand('IW-EG-4', 'Raumteiler Wohnen Nord', 'innen', '4.5', '5.875', '2', 'y')
        : wand('IW-EG-3', 'Raumteiler Wohnen', 'innen', '0.365', '3.5', '2', 'x'),
    ],
  };
  const og = {
    kennung: 'OG', name: 'OG', langname: 'Obergeschoss', hoehe: dez('3'),
    brutto: { unten: NULL, oben: dez('3') },
    raeume: [
      { kennung: 'O.01', langname: 'Schlafen', x: '0.365', y: '0.365', dx: '6.375', dy: '7.51' },
      { kennung: 'O.02', langname: 'Flur', x: '6.84', y: '0.365', dx: '4.785', dy: '3.635' },
      { kennung: 'O.03', langname: 'Kind', x: '6.84', y: '4.1', dx: '4.785', dy: '3.775' },
    ],
    bauteile: [
      platte('DE-OG', 'Geschossdecke', 'FLOOR', '0', '0', '11.99', '8.24', '-0.25', { aussen: false, kg: '351' }),
      wand('AW-OG-S', 'Außenwand Süd OG', 'aussen', '0', '0', '11.99', 'x', [
        fenster('F-OG-S', 'Fenster Schlafen', '2', '1.26'),
        fenster('F-OG-F', 'Fenster Flur OG', '8.5', '1.01'),
      ]),
      wand('AW-OG-N', 'Außenwand Nord OG', 'aussen', '0', '7.875', '11.99', 'x', [
        fenster('F-OG-N', 'Fenster Kind', '8.5', '1.26'),
      ]),
      wand('AW-OG-W', 'Außenwand West OG', 'aussen', '0', '0.365', '7.51', 'y', v2 ? [fensterWest] : []),
      wand('AW-OG-O', 'Außenwand Ost OG', 'aussen', '11.625', '0.365', '7.51', 'y'),
      wand('IW-OG-1', 'Trockenbauwand Schlafen/Flur', 'trocken', '6.74', '0.365', '7.51', 'y', [
        tuer('T-OG-1', 'Tür Schlafen', '1.135', '0.885', '2.01', false),
      ]),
      wand('IW-OG-2', 'Trockenbauwand Flur/Kind', 'trocken', '6.84', '4', '4.785', 'x', [
        tuer('T-OG-2', 'Tür Kind', '1.16', '0.885', '2.01', false),
      ]),
      platte('DA-OG', 'Dachdecke', 'ROOF', '0', '0', '11.99', '8.24', '2.75', { aussen: true, kg: '361' }),
    ],
  };
  for (const g of [eg, og]) {
    for (const r of g.raeume) {
      for (const k of ['x', 'y', 'dx', 'dy']) r[k] = dez(r[k]);
      r.name = r.kennung;
    }
  }
  return {
    stand, projekt: 'Musterhaus (erfunden)', grundstueck: 'Grundstück (erfunden)', gebaeude: 'Haus (erfunden)',
    geschosse: [eg, og],
  };
}

/** Bauteile eines Geschosses in Dateireihenfolge: jedes Bauteil, gefolgt von den Füllungen seiner Öffnungen. */
const bauteileMitFuellungen = (g) => g.bauteile.flatMap((b) => [b, ...fuellungenVon(b)]);

/** Mengen eines Geschosses (DIN 277: BGF aus dem Außenmaß, BRI über die Bruttohöhe) mit Herleitung. */
function geschossmengen(g) {
  const flaeche = mal(AUSSENMASS.x, AUSSENMASS.y);
  const hoehe = minus(g.brutto.oben, g.brutto.unten);
  const volumen = mal(flaeche, hoehe);
  return [
    ['GrossHeight', 'laenge', hoehe, `${de(g.brutto.oben)} − (${de(g.brutto.unten)}) = ${de(hoehe)}`],
    ['GrossFloorArea', 'flaeche', flaeche, `Außenmaß ${de(AUSSENMASS.x)} × ${de(AUSSENMASS.y)} = ${de(flaeche)}`],
    ['GrossVolume', 'volumen', volumen, `${de(flaeche)} × ${de(hoehe)} = ${de(volumen)}`],
  ];
}

/** Mengen eines Raums: Höhe; Bruttofläche Lichtmaß dx × dy; netto ohne die Grundfläche der Bauteile im Raum. */
function raummengen(r, g) {
  const brutto = mal(r.dx, r.dy);
  const abzug = (r.abzug ?? []).map((k) => g.bauteile.find((b) => b.kennung === k));
  const netto = minus(brutto, summe(abzug.map((b) => mal(b.masse.dx, b.masse.dy))));
  const abzugText = abzug.map((b) => ` − ${b.kennung} ${de(b.masse.dx)} × ${de(b.masse.dy)}`).join('');
  return [
    ['Height', 'laenge', WANDHOEHE, de(WANDHOEHE)],
    ['GrossFloorArea', 'flaeche', brutto, `${de(r.dx)} × ${de(r.dy)} = ${de(brutto)}`],
    ['NetFloorArea', 'flaeche', netto, `${de(r.dx)} × ${de(r.dy)}${abzugText} = ${de(netto)}`],
  ];
}

/** Herleitung jeder Menge eines Bauteils aus seiner Geometrie (de-DE); die Zahlen am Ende sind die von `mengenVon`. */
function herleitungVon(b) {
  const werte = new Map(mengenVon(b).map(([name, , wert]) => [name, wert]));
  const t = (name) => de(werte.get(name));
  const { dx, dy, dz } = b.masse ?? {};
  switch (b.klasse) {
    case 'IfcWall': {
      const [l, dicke] = laengeUndDicke(b);
      const abzug = b.oeffnungen.map((o) => ` − ${o.fuellung?.kennung ?? o.kennung} ${de(o.breite)} × ${de(o.hoehe)}`);
      return {
        Length: t('Length'), Width: t('Width'), Height: t('Height'),
        GrossSideArea: `${de(l)} × ${de(dz)} = ${t('GrossSideArea')}`,
        NetSideArea: `${de(l)} × ${de(dz)}${abzug.join('')} = ${t('NetSideArea')}`,
        GrossVolume: `${t('GrossSideArea')} × ${de(dicke)} = ${t('GrossVolume')}`,
        NetVolume: `${t('NetSideArea')} × ${de(dicke)} = ${t('NetVolume')}`,
      };
    }
    case 'IfcFooting': {
      const [l, breite] = laengeUndDicke(b);
      const v = `${de(l)} × ${de(breite)} × ${de(dz)} = ${t('GrossVolume')}`;
      return { Length: t('Length'), Width: t('Width'), Height: t('Height'), GrossVolume: v, NetVolume: v };
    }
    case 'IfcSlab': {
      const abzug = b.aussparungen.map((a) => ` − ${a.kennung} ${de(a.dx)} × ${de(a.dy)}`).join('');
      return {
        Width: t('Width'), Perimeter: `2 × (${de(dx)} + ${de(dy)}) = ${t('Perimeter')}`,
        GrossArea: `${de(dx)} × ${de(dy)} = ${t('GrossArea')}`,
        NetArea: `${de(dx)} × ${de(dy)}${abzug} = ${t('NetArea')}`,
        GrossVolume: `${t('GrossArea')} × ${de(dz)} = ${t('GrossVolume')}`,
        NetVolume: `${t('NetArea')} × ${de(dz)} = ${t('NetVolume')}`,
      };
    }
    default:
      return { Width: t('Width'), Height: t('Height'), Area: `${t('Width')} × ${t('Height')} = ${t('Area')}` };
  }
}

/**
 * Das Haus als Daten für die Sollwerte: Geschosse und Räume mit Mengen, Bauteile in Dateireihenfolge mit GlobalId,
 * Kennung, Klasse, Name, Geschoss, exakten Mengen und Herleitung. Gleiche Quelle wie die Dateien (`hausIfc`).
 */
export function hausModell(stand) {
  const h = hausBeschreibung(stand);
  const mitText = (liste) => liste.map(([name, art, wert, herleitung]) => ({ name, art, wert, herleitung }));
  return {
    stand,
    geschosse: h.geschosse.map((g) => ({
      globalId: hausGuid(g.kennung), name: g.name, langname: g.langname, mengen: mitText(geschossmengen(g)),
    })),
    raeume: h.geschosse.flatMap((g) => g.raeume.map((r) => ({
      globalId: hausGuid(r.kennung), name: r.name, langname: r.langname, geschoss: g.name,
      mengen: mitText(raummengen(r, g)),
    }))),
    bauteile: h.geschosse.flatMap((g) => bauteileMitFuellungen(g).map((b) => {
      const herleitung = herleitungVon(b);
      return {
        globalId: hausGuid(b.kennung), kennung: b.kennung, klasse: b.klasse, name: b.name, geschoss: g.name,
        mengen: mengenVon(b).map(([name, art, wert]) => ({ name, art, wert, herleitung: herleitung[name] })),
      };
    })),
  };
}

/** Text einer Hausdatei: `v1` oder `v2`, `IFC4` (Längen in m) oder `IFC2X3` (Längen in mm). */
export function hausIfc(stand, schema = 'IFC4') {
  const h = hausBeschreibung(stand);
  const s = ifcSchreiber({ schema, millimeter: schema === 'IFC2X3', guid: hausGuid });
  const projekt = s.projekt('projekt', h.projekt);
  const plGrundstueck = s.platzierung(null, NULL, NULL, NULL);
  const grundstueck = s.grundstueck('grundstueck', h.grundstueck, plGrundstueck);
  const plGebaeude = s.platzierung(plGrundstueck, NULL, NULL, NULL);
  const gebaeude = s.gebaeude('gebaeude', h.gebaeude, plGebaeude);
  s.zerlegt('projekt/teile', projekt, [grundstueck]);
  s.zerlegt('grundstueck/teile', grundstueck, [gebaeude]);
  const geschosse = h.geschosse.map((g) => {
    const pl = s.platzierung(plGebaeude, NULL, NULL, g.hoehe);
    return { g, pl, ref: s.geschoss(g.kennung, g.name, g.langname, pl, g.hoehe) };
  });
  s.zerlegt('gebaeude/teile', gebaeude, geschosse.map((x) => x.ref));
  const gruppen = new Map();
  const merke = (art, schluessel, ref) => {
    const k = `${art}/${schluessel}`;
    if (!gruppen.has(k)) gruppen.set(k, { art, schluessel, refs: [] });
    gruppen.get(k).refs.push(ref);
  };
  for (const { g, pl, ref } of geschosse) {
    s.mengen(g.kennung, ref, 'Qto_BuildingStoreyBaseQuantities', geschossmengen(g));
    const raeume = g.raeume.map((r) => {
      const raum = s.raum(r.kennung, r.name, r.langname, s.platzierung(pl, r.x, r.y, NULL), s.quader(r.dx, r.dy, WANDHOEHE));
      s.mengen(r.kennung, raum, 'Qto_SpaceBaseQuantities', raummengen(r, g));
      return raum;
    });
    s.zerlegt(`${g.kennung}/raeume`, ref, raeume);
    const enthalten = [];
    for (const b of g.bauteile) {
      for (const { bauteil, ref: bref } of schreibeBauteil(s, pl, b)) {
        enthalten.push(bref);
        if (bauteil.gruppen.typ) merke('typ', bauteil.gruppen.typ, bref);
        merke('material', bauteil.gruppen.material, bref);
        merke('kg', bauteil.gruppen.kg, bref);
      }
    }
    s.enthaelt(`${g.kennung}/enthaelt`, ref, enthalten);
  }
  const alle = [...gruppen.values()];
  for (const x of alle.filter((y) => y.art === 'typ')) s.wandtyp(x.schluessel, x.refs);
  for (const x of alle.filter((y) => y.art === 'material')) s.material(x.schluessel, x.refs);
  const kg = alle.filter((y) => y.art === 'kg').sort((a, b) => a.schluessel.localeCompare(b.schluessel));
  for (const x of kg) s.klassifikation(x.schluessel, x.refs);
  return s.text(hausDateiname(stand, schema));
}

/** Dateiname einer Hausdatei unter `fixtures/ifc/`. */
export const hausDateiname = (stand, schema = 'IFC4') => `haus-${stand}${schema === 'IFC2X3' ? '-ifc2x3' : ''}.ifc`;
