// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Sollwerte des Tors X1 (Ticket 99, D-58): `typisch-bim.json`. Zuordnung von Bauteilen des Hauses (v1) zu Positionen
// der Fixture `typisch`, Mengenübernahme nach D-53 (je Bauteil eine Ansatzzeile Formel 91, Wert kaufmännisch auf 3
// Stellen; Menge = Summe der Zeilen), Summen nach N2/N5. Gerechnet aus der Beschreibung des Hauses (`haus.mjs`) mit
// BigInt (`rechnen.mjs`), nie aus `ifc`, `bim`, `kern` oder `mengen`; der Selbsttest rechnet jede Zahl aus den IFC-Texten
// nach. Lesarten: README „BIM: Haus und Tor X1“ und Ticket 99 (D-99.x).

import { createHash } from 'node:crypto';
import { STELLEN, berechneSollwerteGaeb, format, parse, preiseDesLv, rundeHalfUp } from '../rechnen.mjs';
import { hausGuid, hausModell } from './haus.mjs';
import { dezDeutsch, dezText } from './schreiben.mjs';

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

/** Erfundene Kennwerte in € je m² BGF (keine lizenzierten Kennwerte, C1, D-52), je Kostengruppe nach DIN 276. */
const KENNWERTE = [
  ['320', '148.30'],
  ['330', '402.65'],
  ['340', '131.45'],
  ['350', '189.20'],
  ['360', '97.85'],
  ['400', '418.75'],
];

const auf3 = (wert) => rundeHalfUp(wert.w, wert.s, STELLEN.menge);
const komma = (text) => text.replace('.', ',');
/** Kanonischer Dezimaltext ("29303.49") als de-DE mit allen Stellen ("29.303,49"). */
const deutsch = (text) => {
  const [ganz, nach] = text.split('.');
  return `${ganz.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${nach === undefined ? '' : `,${nach}`}`;
};
const summe3 = (texte) => texte.reduce((s, t) => s + parse(t, STELLEN.menge), 0n);
const summenText = (texte) => `${texte.map(deutsch).join(' + ')} = ${deutsch(format(summe3(texte), STELLEN.menge))}`;
/** Menge mit Vorzeichen auf 3 Stellen ("-4.125"); gerundet wird dabei nichts. */
const mitVorzeichen = (w) => (w < 0n ? `-${format(-w, STELLEN.menge)}` : format(w, STELLEN.menge));

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
 * DIN-277-Größen des Modells (D-99.7): BGF = Σ GrossFloorArea, BRI = Σ GrossVolume der Geschosse, NRF = Σ NetFloorArea
 * der Räume; jede Menge wie gelesen auf 3 Stellen, dann summiert.
 */
function din277(modell) {
  const menge = (x, name) => x.mengen.find((q) => q.name === name);
  const geschosse = modell.geschosse.map((g) => {
    const [bgf, bri] = ['GrossFloorArea', 'GrossVolume'].map((n) => format(auf3(menge(g, n).wert), STELLEN.menge));
    return {
      globalId: g.globalId, name: g.name, langname: g.langname, bgf, bri,
      herleitung: `BGF ${menge(g, 'GrossFloorArea').herleitung} → ${deutsch(bgf)}; ` +
        `BRI ${menge(g, 'GrossVolume').herleitung} → ${deutsch(bri)}`,
    };
  });
  const raeume = modell.raeume.map((r) => {
    const q = menge(r, 'NetFloorArea');
    const nrf = format(auf3(q.wert), STELLEN.menge);
    return {
      globalId: r.globalId, name: r.name, langname: r.langname, geschoss: r.geschoss, nrf,
      herleitung: `${q.herleitung} → ${deutsch(nrf)}`,
    };
  });
  const texte = { bgf: geschosse.map((g) => g.bgf), bri: geschosse.map((g) => g.bri), nrf: raeume.map((r) => r.nrf) };
  return {
    regel:
      'BGF = Σ GrossFloorArea und BRI = Σ GrossVolume der Geschosse (Qto_BuildingStoreyBaseQuantities), NRF = Σ ' +
      'NetFloorArea der Räume (Qto_SpaceBaseQuantities); jede Menge wie gelesen auf 3 Stellen, dann summiert (D-99.7).',
    geschosse,
    raeume,
    summen: Object.fromEntries(Object.entries(texte).map(([k, t]) => [k, format(summe3(t), STELLEN.menge)])),
    herleitung: Object.fromEntries(Object.entries(texte).map(([k, t]) => [k, summenText(t)])),
  };
}

/** Kostenschätzung über Kennwerte (D-52): je KG Betrag = round(BGF × Kennwert, 2), Herleitung in `bemerkung`. */
function kostenschaetzung(bgfText) {
  const bgf = parse(bgfText, STELLEN.menge);
  const eintraege = KENNWERTE.map(([nummer, kennwert]) => {
    const exakt = bgf * parse(kennwert, STELLEN.betrag);
    const betrag = format(rundeHalfUp(exakt, STELLEN.menge + STELLEN.betrag, STELLEN.betrag), STELLEN.betrag);
    return {
      nummer, betrag,
      bemerkung: `Modell: BGF ${deutsch(bgfText)} m² × ${deutsch(kennwert)} €/m² (Kennwert erfunden) = ` +
        `${dezDeutsch({ w: exakt, s: STELLEN.menge + STELLEN.betrag })} → ${deutsch(betrag)}`,
    };
  });
  return {
    stufe: 'kostenschaetzung',
    name: 'Kostenschätzung aus dem Modell (erfunden)',
    bezugsgroesse: { art: 'BGF', wert: bgfText, einheit: 'm²' },
    kennwerte: KENNWERTE.map(([nummer, kennwert]) => ({ nummer, kennwert })),
    eintraege,
    gesamt: format(eintraege.reduce((s, x) => s + parse(x.betrag, STELLEN.betrag), 0n), STELLEN.betrag),
  };
}

/**
 * Vergleich zweier Stände über die GlobalId (D-53): hinzugefügt, entfernt, geändert mit den Feldern Klasse, Name,
 * Strukturknoten (Geschoss) und Mengen; Mengen werden wie gelesen auf 3 Stellen verglichen (D-99.8).
 */
function vergleich(alt, neu) {
  const vorherIds = new Set(alt.bauteile.map((b) => b.globalId));
  const nachher = new Map(neu.bauteile.map((b) => [b.globalId, b]));
  const kopf = (b) => ({ globalId: b.globalId, kennung: b.kennung, klasse: b.klasse, name: b.name, geschoss: b.geschoss });
  const geaendert = [];
  for (const v of alt.bauteile) {
    const n = nachher.get(v.globalId);
    if (!n) continue;
    const g = { globalId: v.globalId, kennung: v.kennung, felder: [] };
    for (const [feld, vorher, danach] of [['klasse', v.klasse, n.klasse], ['name', v.name, n.name], ['strukturknoten', v.geschoss, n.geschoss]]) {
      if (vorher === danach) continue;
      g.felder.push(feld);
      g[feld] = { vorher, nachher: danach };
    }
    const mengen = v.mengen.map((q) => ({
      name: q.name,
      vorher: format(auf3(q.wert), STELLEN.menge),
      nachher: format(auf3(n.mengen.find((x) => x.name === q.name).wert), STELLEN.menge),
    })).filter((x) => x.vorher !== x.nachher);
    if (mengen.length > 0) {
      g.felder.push('mengen');
      g.mengen = mengen;
    }
    if (g.felder.length > 0) geaendert.push(g);
  }
  return {
    vorher: alt.stand,
    nachher: neu.stand,
    hinzugefuegt: neu.bauteile.filter((b) => !vorherIds.has(b.globalId)).map(kopf),
    entfernt: alt.bauteile.filter((b) => !nachher.has(b.globalId)).map(kopf),
    geaendert,
  };
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

  // X1-Erweitert: DIN 277 und Kosten (v1), Aufmaßblatt aus der Auswahl „Geschoss EG“ (v1), Vergleich und Aktualisierung (v2)
  const groessen = din277(v1);
  const auswahl = new Set(v1.bauteile.filter((b) => b.geschoss === 'EG').map((b) => b.globalId));
  const aufmass = zuordnungen.map((z) => {
    const { positionId, oz, ...rest } = vordersatz(v1, mitKennung(z), auswahl).vordersatz;
    return { positionId, oz, bauteile: z.bauteile.map((b) => b.globalId).filter((id) => auswahl.has(id)), ...rest };
  }).filter((p) => p.mengenansatz.length > 0);
  const v2 = hausModell('v2');
  const aktualisiert = zuordnungen.map((z) => vordersatz(v2, mitKennung(z)));
  const vordersaetzeV2 = aktualisiert.map((x) => x.vordersatz);
  const betroffen = vordersaetzeV2.filter((v, i) =>
    JSON.stringify(v.mengenansatz) !== JSON.stringify(vordersaetze[i].mengenansatz)).map((v) => {
    const vorher = vordersaetze.find((x) => x.positionId === v.positionId).menge;
    return {
      positionId: v.positionId, oz: v.oz, vorher, nachher: v.menge,
      differenz: mitVorzeichen(parse(v.menge, STELLEN.menge) - parse(vorher, STELLEN.menge)),
    };
  });
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
    bauteile: { v1: katalog(v1), v2: katalog(v2) },
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
    erweitert: {
      din277: groessen,
      kostenschaetzung: kostenschaetzung(groessen.summen.bgf),
      aufmassAusAuswahl: {
        modell: 'v1', auswahl: { art: 'geschoss', globalId: hausGuid('EG'), name: 'EG' }, positionen: aufmass,
      },
      vergleich: vergleich(v1, v2),
      betroffenePositionen: betroffen,
      mengenAktualisieren: {
        modell: 'v2',
        vordersaetze: vordersaetzeV2,
        befunde: aktualisiert.flatMap((x) => x.befunde),
        sollwerte: lvSollwerte(lv, new Map(vordersaetzeV2.map((v) => [v.positionId, v.menge]))),
      },
    },
  };
}
