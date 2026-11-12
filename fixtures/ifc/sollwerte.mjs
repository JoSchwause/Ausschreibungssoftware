// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Sollwerte des Tors X1 (Ticket 99, D-58): `typisch-bim.json`. Zuordnung von Bauteilen des Hauses (v1) zu Positionen
// der Fixture `typisch`, Mengenübernahme nach D-53 (je Bauteil eine Ansatzzeile Formel 91, Wert kaufmännisch auf 3
// Stellen; Menge = Summe der Zeilen), Summen nach N2/N5. Gerechnet aus der Beschreibung des Hauses (`haus.mjs`) mit
// BigInt (`rechnen.mjs`), nie aus `ifc`, `bim`, `kern` oder `mengen`; der Selbsttest rechnet jede Zahl aus den IFC-Texten
// nach. Lesarten: README „BIM: Haus und Tor X1“ und Ticket 99 (D-99.x).

import { createHash } from 'node:crypto';
import { STELLEN, berechneSollwerteGaeb, format, preiseDesLv, rundeHalfUp } from '../rechnen.mjs';
import { hausGuid, hausModell } from './haus.mjs';
import { dezText } from './schreiben.mjs';

/**
 * Zuordnung `[OZ, Mengenart, Kennungen]` in der Reihenfolge der OZ (D-52: `mengenart` ist der Name der Menge im Modell
 * oder `Stueck`). Die Bodenplatte steht an zwei Positionen (Brutto- und Nettofläche), die Außenwände des EG an zwei
 * (Länge und Seitenfläche). Torweg der E2E (D-99.2): die gemauerten Innenwände des EG an 03.0010.
 */
const ZUORDNUNGEN = [
  ['02.0040', 'GrossArea', ['PL-EG']],
  ['02.0050', 'NetVolume', ['FU-S', 'FU-N', 'FU-W', 'FU-O']],
  ['02.0070', 'NetArea', ['PL-EG']],
  ['02.0080', 'Length', ['AW-EG-S', 'AW-EG-N', 'AW-EG-W', 'AW-EG-O']],
  ['03.0010', 'NetSideArea', ['IW-EG-1', 'IW-EG-2', 'IW-EG-3']],
  ['03.0020', 'NetSideArea', ['AW-EG-S', 'AW-EG-N', 'AW-EG-W', 'AW-EG-O']],
  ['03.0050', 'Stueck', ['T-EG-1', 'T-OG-1', 'T-OG-2']],
];
const TORWEG = '03.0010';

const auf3 = (wert) => rundeHalfUp(wert.w, wert.s, STELLEN.menge);
const komma = (text) => text.replace('.', ',');

/** Bauteil-Katalog eines Stands: Mengen auf 3 Stellen (wie gelesen), exakt (wie in der Datei) und hergeleitet. */
const katalog = (modell) => modell.bauteile.map((b) => ({
  globalId: b.globalId,
  kennung: b.kennung,
  klasse: b.klasse,
  name: b.name,
  geschoss: b.geschoss,
  mengen: b.mengen.map((q) => ({
    name: q.name, art: q.art, wert: format(auf3(q.wert), STELLEN.menge), exakt: dezText(q.wert), herleitung: q.herleitung,
  })),
}));

/**
 * Vordersatz einer Zuordnung aus einem Modellstand (D-53): je zugeordnetem Bauteil, das im Stand steht (und in der
 * Auswahl, falls gegeben), eine Ansatzzeile Formel 91 mit dem Wert der Menge, kaufmännisch auf 3 Stellen, als Ausdruck
 * de-DE (Komma, ohne Tausenderpunkt); `Stueck` zählt 1. Ein fehlendes Bauteil gibt keine Zeile, sondern einen Befund.
 */
function vordersatz(modell, z, auswahl = null) {
  const zeilen = [];
  const befunde = [];
  for (const { globalId, mengenart } of z.bauteile) {
    const b = modell.bauteile.find((x) => x.globalId === globalId);
    if (!b) {
      befunde.push({ positionId: z.positionId, oz: z.oz, art: 'bauteil-fehlt', globalId, kennung: z.kennung(globalId) });
      continue;
    }
    if (auswahl && !auswahl.has(globalId)) continue;
    if (mengenart === 'Stueck') {
      zeilen.push({ wert: 1000n, herleitung: `${b.kennung} ${b.name}: Stueck = 1` });
      continue;
    }
    const q = b.mengen.find((x) => x.name === mengenart);
    if (!q) throw new Error(`${b.kennung}: Menge ${mengenart} fehlt`);
    const wert = auf3(q.wert);
    zeilen.push({
      wert, herleitung: `${b.kennung} ${b.name}: ${mengenart} = ${q.herleitung} → ${komma(format(wert, STELLEN.menge))}`,
    });
  }
  return {
    vordersatz: {
      positionId: z.positionId,
      oz: z.oz,
      mengenansatz: zeilen.map((x, i) => ({
        zeile: String(i + 1), formel: '91', ausdruck: komma(format(x.wert, STELLEN.menge)), variable: null,
      })),
      zeilenergebnisse: zeilen.map((x) => format(x.wert, STELLEN.menge)),
      menge: format(zeilen.reduce((s, x) => s + x.wert, 0n), STELLEN.menge),
      herleitung: zeilen.map((x) => x.herleitung),
    },
    befunde,
  };
}

/** Sollwerte des LV mit neuen Mengen (Positions-ID → Menge) nach N2/N5, wie `typisch.json` (`berechneSollwerteGaeb`). */
function lvSollwerte(lv, mengen) {
  const knoten = lv.knoten.map((k) => (mengen.has(k.id) ? { ...k, menge: mengen.get(k.id) } : k));
  return berechneSollwerteGaeb(knoten, preiseDesLv, lv.nachlass, lv.mwstSatz);
}

/**
 * `typisch-bim.json`: `lv` ist das LV `typisch`, `dateien` die Hausdateien (Pfad unter fixtures/ → Text) für den SHA-256
 * der Bytes (D-51).
 */
export function bimSollwerte(lv, dateien) {
  const v1 = hausModell('v1');
  const kennungVon = new Map(v1.bauteile.map((b) => [b.globalId, b.kennung]));
  const zuordnungen = ZUORDNUNGEN.map(([oz, mengenart, kennungen]) => {
    const p = lv.knoten.find((k) => k.art === 'position' && k.ordnungszahl === oz && !k.ozIndex);
    return {
      positionId: p.id, oz, kurztext: p.kurztext, einheit: p.einheit,
      bauteile: kennungen.map((k) => ({ globalId: hausGuid(k), mengenart })),
      kennungen,
    };
  });
  const mitKennung = (z) => ({ ...z, kennung: (id) => kennungVon.get(id) });
  const vordersaetze = zuordnungen.map((z) => vordersatz(v1, mitKennung(z)).vordersatz);
  const mengen = new Map(vordersaetze.map((v) => [v.positionId, v.menge]));
  const tor = vordersaetze.find((v) => v.oz === TORWEG);
  const sha = (pfad) => createHash('sha256').update(dateien[pfad], 'utf8').digest('hex');
  return {
    schemaVersion: 'fixture-v1',
    art: 'bimset',
    regel:
      'Ticket 99, README „BIM: Haus und Tor X1“: Zuordnung am Positionsfeld (D-52), Mengenübernahme nach D-53 (je ' +
      'zugeordnetem Bauteil im gewählten Modell eine Ansatzzeile Formel 91, Wert in SI-Einheit kaufmännisch auf 3 ' +
      'Stellen; Menge = Summe der Zeilen; fehlendes Bauteil: keine Zeile, Befund), GP und Summen nach N2/N5.',
    lvId: lv.id,
    lvName: lv.name,
    modelle: [
      { stand: 'v1', datei: 'ifc/haus-v1.ifc', schema: 'IFC4', laengeneinheit: 'm' },
      { stand: 'v1', datei: 'ifc/haus-v1-ifc2x3.ifc', schema: 'IFC2X3', laengeneinheit: 'mm' },
      { stand: 'v2', datei: 'ifc/haus-v2.ifc', schema: 'IFC4', laengeneinheit: 'm' },
    ].map((x) => ({ ...x, sha256: sha(x.datei) })),
    bauteile: { v1: katalog(v1), v2: katalog(hausModell('v2')) },
    zuordnungen,
    kern: {
      torweg: {
        beschreibung: 'E2E des Tors X1-Kern: die gemauerten Innenwände des EG an 03.0010 (NetSideArea), sonst keine.',
        positionIds: [tor.positionId],
        sollwerte: lvSollwerte(lv, new Map([[tor.positionId, tor.menge]])),
      },
      vordersaetze,
      sollwerte: lvSollwerte(lv, mengen),
    },
  };
}
