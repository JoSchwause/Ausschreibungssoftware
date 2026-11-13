// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Erzeuger des großen IFC-4-Modells für die Leistungsbudgets (Ticket 99, D-54). Dieselben Bausteine, Mengensätze und
// Eigenschaftssätze wie das Haus (`haus.mjs`, Schreiber `schreiben.mjs`): Felder zu je sechs Bauteilen (Außenwand mit
// Fenster, Innenwand mit Tür, Innenwand, Deckenfeld) auf mehreren Geschossen. Deterministisch: GlobalIds aus einem
// Zähler, feste Zeit im Kopf, kein Zufall; gleicher Aufruf, gleicher Text (gleicher SHA-256). Die Datei (etwa 21 MB bei
// 10.000 Bauteilen, D-99.3) liegt nicht im Repo (D-54), sie wird bei Bedarf erzeugt.
//
// Funktion:      erzeugeModell({ bauteile = 10000, geschosse = 10 }) liefert den Text der Datei.
// Kommandozeile: node fixtures/ifc/erzeugen.mjs [--bauteile 10000] [--geschosse 10] [--aus datei.ifc]
//                ohne --aus auf die Standardausgabe; mit --aus in die Datei und eine Zeile mit Bauteilen, Bytes, SHA-256.

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fenster, platte, tuer, wand } from './haus.mjs';
import { NULL, dez, globalIdAus128, ifcSchreiber, mal, plus, schreibeBauteil } from './schreiben.mjs';

/** Basis der GlobalIds: "TethysAVA" in den oberen 9 Byte, darunter der Zähler (kein Zufall). */
const BASIS = 0x54657468797341564100000000000000n;
/** Bauteile je Feld in der Reihenfolge der Zählung: Außenwand, Fenster, Innenwand, Tür, Innenwand, Deckenfeld. */
const JE_FELD = 6;
/** Felder je Reihe; Raster 6,50 m × 7,00 m. */
const SPALTEN = 20;
const RASTER_X = dez('6.5');
const RASTER_Y = dez('7');
const GESCHOSSHOEHE = dez('3');
const FELDFLAECHE = dez('36');

/**
 * Die ersten `anzahl` (1 bis 6) Bauteile des Feldes `f` im Geschoss `g`. Eine Öffnung gehört zu ihrer Wand; ihre Füllung
 * zählt als eigenes Bauteil und fehlt, wenn die Zählung vor ihr endet (dann bleibt ein Durchbruch ohne Füllung).
 */
function feld(g, f, anzahl) {
  const x = mal(dez(String(f % SPALTEN)), RASTER_X);
  const y = mal(dez(String(Math.floor(f / SPALTEN))), RASTER_Y);
  const k = `G${String(g + 1).padStart(2, '0')}-F${String(f + 1).padStart(4, '0')}`;
  const mitFuellung = (oeffnung, ja) => (ja ? oeffnung : { ...oeffnung, fuellung: null });
  const teile = [
    wand(`${k}-AW`, 'Außenwand', 'aussen', x, y, '6', 'x', [
      mitFuellung(fenster(`${k}-F`, 'Fenster', '2.37', '1.26'), anzahl >= 2),
    ]),
  ];
  if (anzahl >= 3) {
    teile.push(wand(`${k}-IW`, 'Innenwand mit Tür', 'innen', x, plus(y, dez('0.365')), '5.635', 'y', [
      mitFuellung(tuer(`${k}-T`, 'Tür', '1', '0.885', '2.01', false), anzahl >= 4),
    ]));
  }
  if (anzahl >= 5) {
    teile.push(wand(`${k}-IW2`, 'Innenwand', 'innen', plus(x, dez('0.115')), plus(y, dez('5.885')), '5.885', 'x'));
  }
  if (anzahl >= 6) {
    teile.push(platte(`${k}-DE`, 'Deckenfeld', 'FLOOR', x, y, '6', '6', '-0.25', { aussen: false, kg: '351' }));
  }
  return teile;
}

/**
 * Text des großen Modells: `bauteile` Bauteile (Wände, Fenster, Türen, Deckenfelder; Öffnungen zählen nicht) auf
 * `geschosse` Geschossen; je Geschoss ⌊bauteile / geschosse⌋, der Rest der Teilung je eins an die unteren Geschosse.
 */
export function erzeugeModell({ bauteile = 10000, geschosse = 10 } = {}) {
  if (!Number.isInteger(bauteile) || bauteile < 1) throw new Error('bauteile: ganze Zahl ab 1');
  if (!Number.isInteger(geschosse) || geschosse < 1) throw new Error('geschosse: ganze Zahl ab 1');
  let zaehler = 0n;
  const s = ifcSchreiber({ schema: 'IFC4', guid: () => globalIdAus128(BASIS + zaehler++) });
  const projekt = s.projekt('projekt', 'Großes Modell (erzeugt)');
  const plGrundstueck = s.platzierung(null, NULL, NULL, NULL);
  const grundstueck = s.grundstueck('grundstueck', 'Grundstück (erzeugt)', plGrundstueck);
  const plGebaeude = s.platzierung(plGrundstueck, NULL, NULL, NULL);
  const gebaeude = s.gebaeude('gebaeude', 'Gebäude (erzeugt)', plGebaeude);
  s.zerlegt('projekt/teile', projekt, [grundstueck]);
  s.zerlegt('grundstueck/teile', grundstueck, [gebaeude]);

  const liste = Array.from({ length: geschosse }, (_, g) => {
    const anzahl = Math.floor(bauteile / geschosse) + (g < bauteile % geschosse ? 1 : 0);
    const nr = `G${String(g + 1).padStart(2, '0')}`;
    const hoehe = mal(dez(String(g)), GESCHOSSHOEHE);
    const pl = s.platzierung(plGebaeude, NULL, NULL, hoehe);
    return { anzahl, g, nr, pl, ref: s.geschoss(nr, nr, `Geschoss ${g + 1}`, pl, hoehe) };
  });
  s.zerlegt('gebaeude/teile', gebaeude, liste.map((x) => x.ref));

  const gruppen = new Map();
  const merke = (art, schluessel, ref) => {
    const k = `${art}/${schluessel}`;
    if (!gruppen.has(k)) gruppen.set(k, { art, schluessel, refs: [] });
    gruppen.get(k).refs.push(ref);
  };
  for (const { anzahl, g, nr, pl, ref } of liste) {
    const flaeche = mal(dez(String(Math.floor(anzahl / JE_FELD))), FELDFLAECHE);
    s.mengen(nr, ref, 'Qto_BuildingStoreyBaseQuantities', [
      ['GrossHeight', 'laenge', GESCHOSSHOEHE],
      ['GrossFloorArea', 'flaeche', flaeche],
      ['GrossVolume', 'volumen', mal(flaeche, GESCHOSSHOEHE)],
    ]);
    const enthalten = [];
    for (let f = 0; f * JE_FELD < anzahl; f++) {
      for (const b of feld(g, f, Math.min(JE_FELD, anzahl - f * JE_FELD))) {
        for (const { bauteil, ref: bref } of schreibeBauteil(s, pl, b)) {
          enthalten.push(bref);
          if (bauteil.gruppen.typ) merke('typ', bauteil.gruppen.typ, bref);
          merke('material', bauteil.gruppen.material, bref);
          merke('kg', bauteil.gruppen.kg, bref);
        }
      }
    }
    if (enthalten.length > 0) s.enthaelt(`${nr}/enthaelt`, ref, enthalten);
  }
  const alle = [...gruppen.values()];
  for (const x of alle.filter((y) => y.art === 'typ')) s.wandtyp(x.schluessel, x.refs);
  for (const x of alle.filter((y) => y.art === 'material')) s.material(x.schluessel, x.refs);
  const kg = alle.filter((y) => y.art === 'kg').sort((a, b) => a.schluessel.localeCompare(b.schluessel));
  for (const x of kg) s.klassifikation(x.schluessel, x.refs);
  return s.text(`modell-${bauteile}.ifc`);
}

/** Kommandozeile: `--bauteile N`, `--geschosse G`, `--aus datei.ifc` (sonst Standardausgabe). */
function kommandozeile(argumente) {
  const optionen = {};
  let aus = null;
  for (let i = 0; i < argumente.length; i += 2) {
    const [schalter, wert] = [argumente[i], argumente[i + 1]];
    if (wert === undefined) throw new Error(`Wert fehlt nach ${schalter}`);
    if (schalter === '--aus') aus = wert;
    else if (schalter === '--bauteile' || schalter === '--geschosse') {
      if (!/^\d+$/.test(wert)) throw new Error(`${schalter}: ganze Zahl erwartet, nicht ${wert}`);
      optionen[schalter.slice(2)] = Number(wert);
    } else throw new Error(`Unbekannter Schalter: ${schalter}`);
  }
  const text = erzeugeModell(optionen);
  if (aus === null) {
    process.stdout.write(text);
    return;
  }
  writeFileSync(aus, text, 'utf8');
  const hash = createHash('sha256').update(text, 'utf8').digest('hex');
  console.log(`${aus}: ${optionen.bauteile ?? 10000} Bauteile, ${Buffer.byteLength(text)} Bytes, SHA-256 ${hash}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    kommandozeile(process.argv.slice(2));
  } catch (fehler) {
    console.error(fehler.message);
    process.exit(2);
  }
}
