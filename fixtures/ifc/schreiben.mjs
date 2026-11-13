// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// IFC-Dateien im STEP-Format (ISO 10303-21, „IFC-SPF“) für die Fixtures des Tors X1 (Ticket 99): das Haus (`haus.mjs`)
// und das große Modell (`erzeugen.mjs`). Selbst verfasst nach den öffentlichen Schemata IFC 4 (ADD2 TC1) und IFC 2x3
// (TC1): nur Klassennamen und Attributfolgen, kein fremder Quelltext (C1). Geschrieben wird nur, was die Fixtures
// brauchen: Struktur, Quader als `IfcExtrudedAreaSolid` mit `IfcRectangleProfileDef`, Öffnungen samt Füllung,
// Mengensätze, Eigenschaften, Wandtyp, Material und Klassifikation.
//
// Maße sind exakte Dezimalwerte (BigInt, nie `number`, N1) in Metern. Die Datei schreibt Längen in Metern oder exakt in
// Millimetern (IFC 2x3), Flächen immer in m² und Volumen in m³. Deterministisch: feste Zeit im Kopf, GlobalIds aus
// einer übergebenen Funktion (Schlüssel oder Zähler), Instanzen fortlaufend nummeriert.

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------- exakte Dezimalwerte

/** Dezimalwert `{ w, s }` = w × 10^−s (w BigInt, auch negativ) aus Text wie "11.99", "-0.1175", "3". */
export function dez(text) {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) throw new Error(`Kein Dezimalwert: ${JSON.stringify(text)}`);
  const nach = m[3] ?? '';
  const w = BigInt(m[2] + nach);
  return { w: m[1] === '-' ? -w : w, s: nach.length };
}

const aufStellen = (a, s) => a.w * 10n ** BigInt(s - a.s);
export const plus = (a, b) => {
  const s = Math.max(a.s, b.s);
  return { w: aufStellen(a, s) + aufStellen(b, s), s };
};
export const minus = (a, b) => plus(a, { w: -b.w, s: b.s });
export const mal = (...werte) => werte.reduce((a, b) => ({ w: a.w * b.w, s: a.s + b.s }));
export const summe = (werte) => werte.reduce(plus, { w: 0n, s: 0 });
export const NULL = dez('0');
const HALB = dez('0.5');
const ZWEI = dez('2');
const TAUSEND = dez('1000');

/** Kürzeste Schreibweise mit Punkt: "11.99", "3", "-0.1175". */
export function dezText(a) {
  let { w, s } = a;
  while (s > 0 && w % 10n === 0n) {
    w /= 10n;
    s -= 1;
  }
  const negativ = w < 0n;
  const ziffern = (negativ ? -w : w).toString().padStart(s + 1, '0');
  const t = s === 0 ? ziffern : `${ziffern.slice(0, -s)}.${ziffern.slice(-s)}`;
  return negativ ? `-${t}` : t;
}

/** de-DE für Herleitungen: Dezimalkomma, Tausenderpunkt, „−“ vor negativen Werten ("29.303,4868"). */
export function dezDeutsch(a) {
  const t = dezText(a);
  const negativ = t.startsWith('-');
  const [ganz, nach] = (negativ ? t.slice(1) : t).split('.');
  const gruppiert = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativ ? '−' : ''}${gruppiert}${nach === undefined ? '' : `,${nach}`}`;
}

/** REAL nach ISO 10303-21, immer mit Punkt: "3.", "11.99", "-117.5". */
function stepZahl(a) {
  const t = dezText(a);
  return t.includes('.') ? t : `${t}.`;
}

// ---------------------------------------------------------------- GlobalId und Zeichenketten

const BASIS64 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

/** 128-Bit-Zahl als GlobalId: 22 Zeichen IFC-Base64, höchstwertige Stelle zuerst (das erste Zeichen trägt 2 Bit). */
export function globalIdAus128(wert) {
  if (wert < 0n || wert >= 1n << 128n) throw new Error('Eine GlobalId hat 128 Bit');
  let t = '';
  let v = wert;
  for (let i = 0; i < 22; i++) {
    t = BASIS64[Number(v & 63n)] + t;
    v >>= 6n;
  }
  return t;
}

/** Feste GlobalId aus einem Schlüssel: die ersten 128 Bit seines SHA-256 (kein Zufall; gleicher Schlüssel, gleiche Id). */
export const globalIdAusSchluessel = (schluessel) =>
  globalIdAus128(BigInt(`0x${createHash('sha256').update(schluessel, 'utf8').digest('hex').slice(0, 32)}`));

const hex = (c, stellen) => c.toString(16).toUpperCase().padStart(stellen, '0');

/**
 * Zeichenkette nach ISO 10303-21: `'` als `''`, `\` als `\\`; Zeichen außerhalb von ASCII als `\X2\hhhh\X0\` (IFC 4)
 * bzw. Latin-1 als `\X\hh` (IFC 2x3, wie ältere Programme schreiben), damit der Leser beide Formen sieht.
 */
export function stepZeichenkette(text, schema) {
  let aus = '';
  for (const z of text) {
    const c = z.codePointAt(0);
    if (z === "'") aus += "''";
    else if (z === '\\') aus += '\\\\';
    else if (c >= 0x20 && c <= 0x7e) aus += z;
    else if (schema === 'IFC2X3' && c >= 0xa0 && c <= 0xff) aus += `\\X\\${hex(c, 2)}`;
    else if (c <= 0xffff) aus += `\\X2\\${hex(c, 4)}\\X0\\`;
    else throw new Error(`Zeichen außerhalb der BMP: ${z}`);
  }
  return `'${aus}'`;
}

// ---------------------------------------------------------------- Mengen aus der Geometrie

/** Name des Mengensatzes je Klasse (IFC-4-Namen, auch in der IFC-2x3-Datei, D-99.4). */
export const MENGENSATZ = {
  IfcWall: 'Qto_WallBaseQuantities',
  IfcSlab: 'Qto_SlabBaseQuantities',
  IfcFooting: 'Qto_FootingBaseQuantities',
  IfcWindow: 'Qto_WindowBaseQuantities',
  IfcDoor: 'Qto_DoorBaseQuantities',
};

/** Länge und Dicke eines Wand- oder Fundamentquaders nach seiner Richtung (`x` oder `y`). */
export const laengeUndDicke = (b) => (b.richtung === 'x' ? [b.masse.dx, b.masse.dy] : [b.masse.dy, b.masse.dx]);

/**
 * Mengen eines Bauteils aus seiner Geometrie, exakt in m, m², m³, als `[Name, Art, Wert]` (Art `laenge`, `flaeche`,
 * `volumen`). Wand: Länge und Dicke nach der Richtung, Höhe; Seitenfläche Länge × Höhe, netto minus Σ Breite × Höhe der
 * Öffnungen; Volumen = Seitenfläche × Dicke (brutto, netto). Fundament: wie die Wand ohne Öffnung. Platte: Dicke, Umfang,
 * Fläche dx × dy, netto minus Σ Aussparungen; Volumen = Fläche × Dicke. Fenster und Tür: Breite, Höhe und Fläche der
 * Öffnung, die sie füllen.
 */
export function mengenVon(b) {
  const { dx, dy, dz } = b.masse ?? {};
  switch (b.klasse) {
    case 'IfcWall': {
      const [l, d] = laengeUndDicke(b);
      const brutto = mal(l, dz);
      const netto = minus(brutto, summe((b.oeffnungen ?? []).map((o) => mal(o.breite, o.hoehe))));
      return [
        ['Length', 'laenge', l],
        ['Width', 'laenge', d],
        ['Height', 'laenge', dz],
        ['GrossSideArea', 'flaeche', brutto],
        ['NetSideArea', 'flaeche', netto],
        ['GrossVolume', 'volumen', mal(brutto, d)],
        ['NetVolume', 'volumen', mal(netto, d)],
      ];
    }
    case 'IfcFooting': {
      const [l, d] = laengeUndDicke(b);
      const v = mal(l, d, dz);
      return [
        ['Length', 'laenge', l],
        ['Width', 'laenge', d],
        ['Height', 'laenge', dz],
        ['GrossVolume', 'volumen', v],
        ['NetVolume', 'volumen', v],
      ];
    }
    case 'IfcSlab': {
      const brutto = mal(dx, dy);
      const netto = minus(brutto, summe((b.aussparungen ?? []).map((a) => mal(a.dx, a.dy))));
      return [
        ['Width', 'laenge', dz],
        ['Perimeter', 'laenge', mal(ZWEI, plus(dx, dy))],
        ['GrossArea', 'flaeche', brutto],
        ['NetArea', 'flaeche', netto],
        ['GrossVolume', 'volumen', mal(brutto, dz)],
        ['NetVolume', 'volumen', mal(netto, dz)],
      ];
    }
    case 'IfcWindow':
    case 'IfcDoor':
      return [
        ['Width', 'laenge', b.breite],
        ['Height', 'laenge', b.hoehe],
        ['Area', 'flaeche', mal(b.breite, b.hoehe)],
      ];
    default:
      throw new Error(`Keine Mengen für ${b.klasse}`);
  }
}

/** Die Füllungen der Öffnungen eines Bauteils als eigene Bauteile (mit Breite und Höhe der Öffnung). */
export const fuellungenVon = (b) =>
  (b.oeffnungen ?? []).filter((o) => o.fuellung).map((o) => ({ ...o.fuellung, breite: o.breite, hoehe: o.hoehe }));

// ---------------------------------------------------------------- Schreiber

const ZEITSTEMPEL = '2026-11-12T00:00:00';
/** IfcTimeStamp (Sekunden seit 1970) für 2026-11-12T00:00:00Z. */
const ERSTELLT = '1794441600';
/** Öffnungskörper ragen je 5 cm über beide Wandflächen (sauberes Ausschneiden in der 3D-Ansicht). */
const UEBERSTAND = dez('0.05');
/** Dicke von Fenster und Tür; sie sitzen mittig in der Wand. */
const RAHMEN = dez('0.07');

/**
 * Schreiber für eine IFC-Datei. `schema`: `IFC4` oder `IFC2X3`; `millimeter`: Längeneinheit mm statt m; `guid(schluessel)`
 * liefert die GlobalId eines IfcRoot-Objekts. Jede Methode legt Instanzen an und liefert den Verweis (`#n`).
 */
export function ifcSchreiber({ schema, millimeter = false, guid }) {
  if (schema !== 'IFC4' && schema !== 'IFC2X3') throw new Error(`Schema nicht unterstützt: ${schema}`);
  const ifc4 = schema === 'IFC4';
  const zeilen = [];
  const neu = (klasse, ...attribute) => {
    zeilen.push(`#${zeilen.length + 1}=${klasse}(${attribute.join(',')});`);
    return `#${zeilen.length}`;
  };
  const txt = (s) => (s == null ? '$' : stepZeichenkette(s, schema));
  const liste = (xs) => `(${xs.join(',')})`;
  const laenge = (a) => stepZahl(millimeter ? mal(a, TAUSEND) : a);
  /** Attribute, die nur IFC 4 hat (am Ende der Attributfolge). */
  const nur4 = (...attribute) => (ifc4 ? attribute : []);

  const person = neu('IFCPERSON', '$', txt('Fixture'), '$', '$', '$', '$', '$', '$');
  const organisation = neu('IFCORGANIZATION', '$', txt('Tethys AVA'), '$', '$', '$');
  const anwendung = neu(
    'IFCAPPLICATION', organisation, txt('1.0'), txt('Tethys AVA Fixture-Erzeuger'), txt('tethys-ava-fixtures'),
  );
  const besitzer = neu('IFCPERSONANDORGANIZATION', person, organisation, '$');
  const historie = neu('IFCOWNERHISTORY', besitzer, anwendung, '$', '.ADDED.', '$', '$', '$', ERSTELLT);
  const einheiten = neu('IFCUNITASSIGNMENT', liste([
    neu('IFCSIUNIT', '*', '.LENGTHUNIT.', millimeter ? '.MILLI.' : '$', '.METRE.'),
    neu('IFCSIUNIT', '*', '.AREAUNIT.', '$', '.SQUARE_METRE.'),
    neu('IFCSIUNIT', '*', '.VOLUMEUNIT.', '$', '.CUBIC_METRE.'),
    neu('IFCSIUNIT', '*', '.PLANEANGLEUNIT.', '$', '.RADIAN.'),
  ]));
  const ursprung = neu('IFCAXIS2PLACEMENT3D', neu('IFCCARTESIANPOINT', '(0.,0.,0.)'), '$', '$');
  const oben = neu('IFCDIRECTION', '(0.,0.,1.)');
  const kontext = neu(
    'IFCGEOMETRICREPRESENTATIONCONTEXT', '$', txt('Model'), '3', '1.E-05', ursprung, neu('IFCDIRECTION', '(0.,1.)'),
  );
  const achsKontext = neu(
    'IFCGEOMETRICREPRESENTATIONSUBCONTEXT', txt('Axis'), txt('Model'), '*', '*', '*', '*', kontext, '$', '.GRAPH_VIEW.',
    '$',
  );
  const koerperKontext = neu(
    'IFCGEOMETRICREPRESENTATIONSUBCONTEXT', txt('Body'), txt('Model'), '*', '*', '*', '*', kontext, '$', '.MODEL_VIEW.',
    '$',
  );
  let klassifikationssystem = null;

  /** GlobalId, OwnerHistory, Name, Description (IfcRoot). */
  const wurzel = (schluessel, name) => [`'${guid(schluessel)}'`, historie, txt(name), '$'];
  /** dazu ObjectType, ObjectPlacement, Representation (IfcProduct). */
  const produkt = (schluessel, name, platzierung, form) => [...wurzel(schluessel, name), '$', platzierung, form];
  const nachArt = { laenge: 'IFCQUANTITYLENGTH', flaeche: 'IFCQUANTITYAREA', volumen: 'IFCQUANTITYVOLUME' };

  return {
    projekt: (schluessel, name) =>
      neu('IFCPROJECT', ...wurzel(schluessel, name), '$', '$', '$', liste([kontext]), einheiten),

    /** Lokale Platzierung (nur verschoben, nicht gedreht) relativ zu `bezug` (`null`: absolut). */
    platzierung: (bezug, x, y, z) =>
      neu('IFCLOCALPLACEMENT', bezug ?? '$', neu(
        'IFCAXIS2PLACEMENT3D', neu('IFCCARTESIANPOINT', liste([laenge(x), laenge(y), laenge(z)])), '$', '$',
      )),

    /**
     * Körper: Rechteck dx × dy mit der Ecke im Ursprung der Platzierung, um dz nach oben extrudiert. `achse` (Wände):
     * die Wandachse als Linie `[[x1, y1], [x2, y2]]` im selben System, als Darstellung `Axis` vor `Body`.
     */
    quader: (dx, dy, dz, achse = null) => {
      const darstellungen = [];
      if (achse) {
        const punkte = achse.map(([x, y]) => neu('IFCCARTESIANPOINT', liste([laenge(x), laenge(y)])));
        const linie = neu('IFCPOLYLINE', liste(punkte));
        darstellungen.push(neu('IFCSHAPEREPRESENTATION', achsKontext, txt('Axis'), txt('Curve2D'), liste([linie])));
      }
      const mitte = neu('IFCCARTESIANPOINT', liste([laenge(mal(dx, HALB)), laenge(mal(dy, HALB))]));
      const profil = neu(
        'IFCRECTANGLEPROFILEDEF', '.AREA.', '$', neu('IFCAXIS2PLACEMENT2D', mitte, '$'), laenge(dx), laenge(dy),
      );
      const koerper = neu('IFCEXTRUDEDAREASOLID', profil, ursprung, oben, laenge(dz));
      darstellungen.push(
        neu('IFCSHAPEREPRESENTATION', koerperKontext, txt('Body'), txt('SweptSolid'), liste([koerper])),
      );
      return neu('IFCPRODUCTDEFINITIONSHAPE', '$', '$', liste(darstellungen));
    },

    grundstueck: (schluessel, name, pl) =>
      neu('IFCSITE', ...produkt(schluessel, name, pl, '$'), '$', '.ELEMENT.', '$', '$', '$', '$', '$'),
    gebaeude: (schluessel, name, pl) =>
      neu('IFCBUILDING', ...produkt(schluessel, name, pl, '$'), '$', '.ELEMENT.', '$', '$', '$'),
    geschoss: (schluessel, name, langname, pl, hoehe) =>
      neu('IFCBUILDINGSTOREY', ...produkt(schluessel, name, pl, '$'), txt(langname), '.ELEMENT.', laenge(hoehe)),
    raum: (schluessel, name, langname, pl, form) =>
      neu(
        'IFCSPACE', ...produkt(schluessel, name, pl, form), txt(langname), '.ELEMENT.', ifc4 ? '.SPACE.' : '.INTERNAL.',
        '$',
      ),
    zerlegt: (schluessel, ganzes, teile) => neu('IFCRELAGGREGATES', ...wurzel(schluessel, null), ganzes, liste(teile)),
    enthaelt: (schluessel, struktur, elemente) =>
      neu('IFCRELCONTAINEDINSPATIALSTRUCTURE', ...wurzel(schluessel, null), liste(elemente), struktur),

    /** Bauteil der Klasse `b.klasse`; Tag = Kennung. Fenster und Tür tragen Höhe und Breite ihrer Öffnung. */
    bauteil: (b, pl, form) => {
      const basis = [...produkt(b.kennung, b.name, pl, form), txt(b.kennung)];
      switch (b.klasse) {
        case 'IfcWall':
          return neu('IFCWALL', ...basis, ...nur4('.STANDARD.'));
        case 'IfcSlab':
          return neu('IFCSLAB', ...basis, `.${b.vordefiniert}.`);
        case 'IfcFooting':
          return neu('IFCFOOTING', ...basis, '.STRIP_FOOTING.');
        case 'IfcWindow':
          return neu(
            'IFCWINDOW', ...basis, laenge(b.hoehe), laenge(b.breite), ...nur4('.WINDOW.', '.SINGLE_PANEL.', '$'),
          );
        case 'IfcDoor':
          return neu(
            'IFCDOOR', ...basis, laenge(b.hoehe), laenge(b.breite), ...nur4('.DOOR.', '.SINGLE_SWING_LEFT.', '$'),
          );
        default:
          throw new Error(`Klasse nicht unterstützt: ${b.klasse}`);
      }
    },
    oeffnung: (schluessel, name, pl, form) =>
      neu('IFCOPENINGELEMENT', ...produkt(schluessel, name, pl, form), '$', ...nur4('.OPENING.')),
    spartAus: (schluessel, element, oeffnung) =>
      neu('IFCRELVOIDSELEMENT', ...wurzel(schluessel, null), element, oeffnung),
    fuellt: (schluessel, oeffnung, element) =>
      neu('IFCRELFILLSELEMENT', ...wurzel(schluessel, null), oeffnung, element),

    /** Mengensatz `satz` mit `[Name, Art, Wert]`; Längen in der Dateieinheit, Flächen in m², Volumen in m³. */
    mengen: (schluessel, objekt, satz, eintraege) => {
      const mengen = eintraege.map(([name, art, wert]) =>
        neu(nachArt[art], txt(name), '$', '$', art === 'laenge' ? laenge(wert) : stepZahl(wert), ...nur4('$')));
      const satzRef = neu('IFCELEMENTQUANTITY', ...wurzel(`${schluessel}/${satz}`, satz), '$', liste(mengen));
      neu('IFCRELDEFINESBYPROPERTIES', ...wurzel(`${schluessel}/${satz}/zu`, null), liste([objekt]), satzRef);
    },
    /**
     * Eigenschaftssatz mit Einzelwerten `[Name, Typ, Wert]`: `IfcBoolean` (true/false), `IfcLabel` und `IfcIdentifier`
     * (Text), `IfcThermalTransmittanceMeasure` (Dezimalwert in W/(m²K)).
     */
    eigenschaften: (schluessel, objekt, satz, werte) => {
      const wertText = (typ, wert) => {
        if (typ === 'IfcBoolean') return wert ? '.T.' : '.F.';
        if (typ === 'IfcLabel' || typ === 'IfcIdentifier') return txt(wert);
        if (typ === 'IfcThermalTransmittanceMeasure') return stepZahl(wert);
        throw new Error(`Eigenschaftstyp nicht unterstützt: ${typ}`);
      };
      const props = werte.map(([name, typ, wert]) =>
        neu('IFCPROPERTYSINGLEVALUE', txt(name), '$', `${typ.toUpperCase()}(${wertText(typ, wert)})`, '$'));
      const satzRef = neu('IFCPROPERTYSET', ...wurzel(`${schluessel}/${satz}`, satz), liste(props));
      neu('IFCRELDEFINESBYPROPERTIES', ...wurzel(`${schluessel}/${satz}/zu`, null), liste([objekt]), satzRef);
    },
    wandtyp: (name, objekte) => {
      const typ = neu('IFCWALLTYPE', ...wurzel(`typ/${name}`, name), '$', '$', '$', '$', '$', '.STANDARD.');
      neu('IFCRELDEFINESBYTYPE', ...wurzel(`typ/${name}/zu`, null), liste(objekte), typ);
    },
    material: (name, objekte) => {
      const material = neu('IFCMATERIAL', txt(name), ...nur4('$', '$'));
      neu('IFCRELASSOCIATESMATERIAL', ...wurzel(`material/${name}`, null), liste(objekte), material);
    },
    /** Kostengruppe nach DIN 276 als Klassifikationsreferenz, nur die Nummer (keine Katalogtexte, C1). */
    klassifikation: (nummer, objekte) => {
      klassifikationssystem ??= neu(
        'IFCCLASSIFICATION', txt('DIN'), txt('2018-12'), '$', txt('DIN 276'), ...nur4('$', '$', '$'),
      );
      const ref = neu('IFCCLASSIFICATIONREFERENCE', '$', txt(nummer), '$', klassifikationssystem, ...nur4('$', '$'));
      neu('IFCRELASSOCIATESCLASSIFICATION', ...wurzel(`kg/${nummer}`, null), liste(objekte), ref);
    },

    /** Die ganze Datei: Kopf mit fester Zeit, Datenteil, Zeilenende LF, mit Zeilenumbruch am Schluss. */
    text: (dateiname) =>
      [
        'ISO-10303-21;',
        'HEADER;',
        `FILE_DESCRIPTION((${txt('Tethys AVA, Fixture des Tors X1 (Ticket 99): selbst verfasst, erfunden')}),'2;1');`,
        `FILE_NAME(${txt(dateiname)},'${ZEITSTEMPEL}',(${txt('Tethys AVA contributors')}),(${txt('Tethys AVA')}),` +
          `${txt('Tethys AVA Fixture-Erzeuger')},${txt('Tethys AVA')},'');`,
        `FILE_SCHEMA(('${schema}'));`,
        'ENDSEC;',
        'DATA;',
        ...zeilen,
        'ENDSEC;',
        'END-ISO-10303-21;',
        '',
      ].join('\n'),
  };
}

/**
 * Schreibt ein Bauteil (Quader in m, relativ zur Platzierung `bezug`) samt Öffnungen mit Füllung, Aussparungen,
 * Mengensatz und Eigenschaften. Öffnungen sitzen im System der Wand: ab `lage` entlang der Wand, ab `unten` in der
 * Höhe, quer über die ganze Dicke (mit Überstand); Fenster und Tür mittig in der Wand, im System ihrer Öffnung.
 * Liefert `[{ bauteil, ref }]` für das Bauteil und seine Füllungen (Enthaltensein, Typ, Material, Klassifikation).
 */
export function schreibeBauteil(s, bezug, b) {
  const pl = s.platzierung(bezug, b.ort.x, b.ort.y, b.ort.z);
  const { dx: bdx, dy: bdy, dz: bdz } = b.masse;
  let achse = null;
  if (b.klasse === 'IfcWall') {
    achse = b.richtung === 'x' ? [[NULL, mal(bdy, HALB)], [bdx, mal(bdy, HALB)]] : [[mal(bdx, HALB), NULL], [mal(bdx, HALB), bdy]];
  }
  const ref = s.bauteil(b, pl, s.quader(bdx, bdy, bdz, achse));
  s.mengen(b.kennung, ref, MENGENSATZ[b.klasse], mengenVon(b));
  for (const p of b.psets ?? []) s.eigenschaften(b.kennung, ref, p.name, p.werte);
  const geschrieben = [{ bauteil: b, ref }];
  const fuellungen = fuellungenVon(b);
  for (const o of b.oeffnungen ?? []) {
    const [, dicke] = laengeUndDicke(b);
    const quer = plus(dicke, mal(ZWEI, UEBERSTAND));
    const vor = minus(NULL, UEBERSTAND);
    const [x, y, dx, dy] = b.richtung === 'x' ? [o.lage, vor, o.breite, quer] : [vor, o.lage, quer, o.breite];
    const opl = s.platzierung(pl, x, y, o.unten);
    const oe = s.oeffnung(o.kennung, o.name, opl, s.quader(dx, dy, o.hoehe));
    s.spartAus(`${o.kennung}/spart`, ref, oe);
    s.mengen(o.kennung, oe, 'Qto_OpeningElementBaseQuantities', oeffnungsmengen(o.breite, o.hoehe, dicke));
    if (!o.fuellung) continue;
    const f = fuellungen.find((x) => x.kennung === o.fuellung.kennung);
    const versatz = plus(UEBERSTAND, mal(minus(dicke, RAHMEN), HALB));
    const [fx, fy, fdx, fdy] = b.richtung === 'x' ? [NULL, versatz, o.breite, RAHMEN] : [versatz, NULL, RAHMEN, o.breite];
    const fref = s.bauteil(f, s.platzierung(opl, fx, fy, NULL), s.quader(fdx, fdy, o.hoehe));
    s.fuellt(`${o.kennung}/fuellt`, oe, fref);
    s.mengen(f.kennung, fref, MENGENSATZ[f.klasse], mengenVon(f));
    for (const p of f.psets ?? []) s.eigenschaften(f.kennung, fref, p.name, p.werte);
    geschrieben.push({ bauteil: f, ref: fref });
  }
  for (const a of b.aussparungen ?? []) {
    const apl = s.platzierung(pl, a.x, a.y, minus(NULL, UEBERSTAND));
    const ae = s.oeffnung(a.kennung, a.name, apl, s.quader(a.dx, a.dy, plus(bdz, mal(ZWEI, UEBERSTAND))));
    s.spartAus(`${a.kennung}/spart`, ref, ae);
    s.mengen(a.kennung, ae, 'Qto_OpeningElementBaseQuantities', oeffnungsmengen(a.dx, a.dy, bdz));
  }
  return geschrieben;
}

/** Mengen einer Öffnung (sie ist kein Bauteil): Breite, Höhe, Tiefe = Dicke des Bauteils, Fläche, Volumen. */
const oeffnungsmengen = (breite, hoehe, tiefe) => [
  ['Width', 'laenge', breite],
  ['Height', 'laenge', hoehe],
  ['Depth', 'laenge', tiefe],
  ['Area', 'flaeche', mal(breite, hoehe)],
  ['Volume', 'volumen', mal(breite, hoehe, tiefe)],
];
