// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB DA XML 3.1 lesen (Ticket 129, umfang-welle-7 §3 E5). Prüfsteine sind die amtlichen Musterdateien in
// `fixtures/extern/gaeb/3.1-musterdateien/` (C4). Seams: `leseGaeb` (X81, X83, X86) und `leseAngebot` (X84).
//
// Die Sollwerte kommen aus der Datei selbst, nicht aus dem Leser: Die Zählung läuft wie in `zaehlung-bvbs.test.ts` über
// die Start-Tags des Rohtexts; Mengen, EP, GP und Summen liest ein eigener Durchlauf über den XML-Baum (`Qty`, `UP`, `IT`,
// `Totals`) ohne den Leser.

import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addiere, subtrahiere, vergleiche } from '@tethys/dezimal';
import { summenBerechnen } from '@tethys/kern';
import type {
  AngebotId,
  Betrag,
  BieterId,
  Knoten,
  LvInhalt,
  Position,
  ProjektId,
  Pruefbefund,
  Summenstand,
} from '@tethys/vertrag';
import { leseAngebot, leseGaeb } from './index';
import type { AngebotLesung } from './index';
import { lesePfad, testIds, TEST_MWST } from './testhilfen';
import { elementKinder, parseXml, textInhalt } from './xml';
import type { XmlElement } from './xml';

const ORDNER = 'fixtures/extern/gaeb/3.1-musterdateien';
const DATEIEN = readdirSync(new URL(`../../../${ORDNER}`, import.meta.url)).sort();
const LV_DATEIEN = DATEIEN.filter((d) => !d.endsWith('.X84'));

const pfad = (d: string): string => `${ORDNER}/${d}`;
const lies = (d: string) =>
  leseGaeb(lesePfad(pfad(d)), { ids: testIds(), dateiname: d, standardMwstSatz: TEST_MWST });

/** Zählt Start-Tags nach Elementname im Rohtext; Kommentare und CDATA werden vorher entfernt. */
function zaehleStartTags(text: string): Map<string, number> {
  const ohne = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const zaehler = new Map<string, number>();
  for (const m of ohne.matchAll(/<([A-Za-z][A-Za-z0-9]*)(?=[\s/>])/g)) {
    const name = m[1] ?? '';
    zaehler.set(name, (zaehler.get(name) ?? 0) + 1);
  }
  return zaehler;
}

describe('GAEB DA XML 3.1: die amtlichen Musterdateien', () => {
  it('es sind acht Dateien, sieben LV (X81, X83, X86) und ein Angebot (X84)', () => {
    expect(DATEIEN).toHaveLength(8);
    expect(LV_DATEIEN).toHaveLength(7);
  });

  for (const d of LV_DATEIEN)
    it(`${d}: gelesen als 3.1 ohne Fehler, Zählung wie im Rohtext`, () => {
      const l = lies(d);
      expect(l.version).toBe('3.1');
      expect(l.phase).toBe(`X${d.slice(-2)}`);
      expect(l.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
      const knoten: readonly Knoten[] = l.inhalt?.knoten ?? [];
      const je = (art: Knoten['art']): number => knoten.filter((k) => k.art === art).length;
      const tags = zaehleStartTags(new TextDecoder('utf-8').decode(lesePfad(pfad(d))));
      const n = (name: string): number => tags.get(name) ?? 0;
      expect(n('BoQCtgy') + n('Item')).toBeGreaterThan(0);
      expect(je('titel') + je('los')).toBe(n('BoQCtgy'));
      expect(je('position')).toBe(n('Item') + n('MarkupItem'));
      expect(je('hinweis')).toBe(n('Remark'));
    });
});

// --- Mengen, EP, GP und Summen gegen die Werte der Datei ---------------------------------------------------------

const kind = (e: XmlElement | undefined, name: string): XmlElement | undefined =>
  e ? elementKinder(e).find((k) => k.name === name) : undefined;
const kinderVon = (e: XmlElement | undefined, name: string): XmlElement[] =>
  e ? elementKinder(e).filter((k) => k.name === name) : [];
const wert = (e: XmlElement | undefined): string | null => (e ? textInhalt(e).trim() : null);
const betrag = (s: string): Betrag => s as Betrag;
const NULL = betrag('0.00');
const gleich = (a: string | null, b: string | null): boolean =>
  a === null || b === null ? a === b : vergleiche(betrag(a), betrag(b)) === 0;

function wurzelVon(d: string): XmlElement {
  const w = parseXml(new TextDecoder('utf-8').decode(lesePfad(pfad(d)))).wurzel;
  if (w === null) throw new Error(`${d}: kein XML`);
  return w;
}

interface Gelesen {
  readonly inhalt: LvInhalt;
  readonly befunde: readonly Pruefbefund[];
  readonly summen: Summenstand;
  readonly positionen: readonly Position[];
  readonly gliederungen: readonly Knoten[];
}

function gelesen(d: string): Gelesen {
  const l = lies(d);
  if (l.inhalt === null) throw new Error(`${d}: kein Inhalt`);
  const inhalt = l.inhalt;
  const summen = summenBerechnen({
    id: inhalt.wurzelId,
    knoten: inhalt.knoten,
    nachlass: inhalt.nachlass,
    mwstSatz: inhalt.mwstSatz,
  });
  return {
    inhalt,
    befunde: l.befunde,
    summen,
    positionen: inhalt.knoten.filter((k): k is Position => k.art === 'position'),
    gliederungen: inhalt.knoten.filter((k) => k.art === 'titel' || k.art === 'los'),
  };
}

const ozVon = (k: Knoten): string =>
  k.art === 'hinweis' ? '' : `${k.ordnungszahl ?? ''}${k.art === 'position' ? (k.ozIndex ?? '') : ''}`;

/**
 * Was die Datei für einen Bereich ausweist: `TotalLSUM` (Pauschalsumme), sonst `TotAfterDisc` (nach dem Nachlass des
 * Bereichs), sonst `Total`. Diesen Wert summiert die Datei im übergeordneten Bereich.
 */
const nachBereich = (totals: XmlElement | undefined): string | null =>
  wert(kind(totals, 'TotalLSUM')) ?? wert(kind(totals, 'TotAfterDisc')) ?? wert(kind(totals, 'Total'));

describe('GAEB DA XML 3.1: Mengen und EP wie in der Datei', () => {
  for (const d of LV_DATEIEN)
    it(`${d}: jede Position hat Menge und EP der Datei (Qty, UP)`, () => {
      const g = gelesen(d);
      const items: XmlElement[] = [];
      const sammle = (e: XmlElement): void => {
        if (e.name === 'Item' || e.name === 'MarkupItem') items.push(e);
        else for (const k of elementKinder(e)) sammle(k);
      };
      sammle(wurzelVon(d));
      expect(g.positionen).toHaveLength(items.length);
      items.forEach((el, i) => {
        const p = g.positionen[i] as Position;
        expect(gleich(p.menge, wert(kind(el, 'Qty'))), `${ozVon(p)} Menge`).toBe(true);
        expect(gleich(p.einheitspreis, wert(kind(el, 'UP'))), `${ozVon(p)} EP`).toBe(true);
      });
    });
});

/**
 * Abweichungen, die die Datei selbst trägt und der Vertrag nicht abbildet: Nachlass an einer Position
 * (`Item/DiscountPcnt`), entfallende Position (`NotAppl`), eine Zuschlagsposition, deren Basis daran hängt, Nachlass oder
 * Pauschalsumme eines Bereichs (`Totals/DiscountPcnt`, `DiscountAmt`, `TotalLSUM`), ein Bereich als Wahl
 * (`ALNBGroupNo`, `ALNBSerNo`) und ein eigener Steuersatz eines Bereichs (`Totals/VAT`).
 */
const SOLL_ABWEICHUNGEN: Readonly<Record<string, { positionen: readonly string[]; bereiche: number }>> = {
  // Positionsnachlass 10 % (1.10.10.60) und 5 % (1.30.10.30), entfallende Position (1.10.40.30), Zuschlag auf die
  // rabattierte Position (1.30.10.40: Basis 955,00 statt 1.000,00); Bereiche 1.10 (DiscountAmt), 1.10.10, 1.10.15 und
  // 1.10.20 (DiscountPcnt), 1.10.40 (Wahl, Gruppe 100, Variante 1), 1.20 (TotalLSUM).
  'Musterdatei_3.1_2008-001.X86': {
    positionen: ['1.10.10.60', '1.10.40.30', '1.30.10.30', '1.30.10.40'],
    bereiche: 6,
  },
  'Musterdatei_3.1_2008-002.X86': { positionen: [], bereiche: 0 },
  // Jeder der 682 Bereiche (2 Lose, 680 Titel) mit eigenem Nachlass 10 %.
  'Musterdatei_3.1_2008-003.X86': { positionen: [], bereiche: 682 },
  // Bereich 2 mit 7 % statt 19 %.
  'Musterdatei_3.1_2008-004.X86': { positionen: [], bereiche: 1 },
  // Das Angebot zum LV der Musterdatei 001 (X83): die Abweichungen der 001.X86 und drei Positionen mit einer Menge des
  // Bieters (1.10.30.10, 1.10.40.10, 1.10.40.30; im LV „Menge vom Bieter“ ohne Menge).
  'Musterdatei_3.1_2008-001.X84': {
    positionen: ['1.10.10.60', '1.10.30.10', '1.10.40.10', '1.10.40.30', '1.30.10.30', '1.30.10.40'],
    bereiche: 6,
  },
};

/**
 * Golden der Summen (X86). Die App rechnet GP und Summen selbst (Ticket 40); verglichen wird mit `IT` und `Totals` der
 * Datei. Jede Abweichung aus `SOLL_ABWEICHUNGEN` ist ein Befund an ihrem Knoten (U5), und die Summen stimmen bis auf genau
 * diese Beträge: an jedem Bereich und am LV ist eigene Summe − Datei = Σ Abweichungen darunter. Ohne Abweichung sind
 * auch Steuersatz und Brutto die der Datei.
 */
/** Item/MarkupItem und BoQCtgy einer Datei in Dokumentreihenfolge. */
function elementeVon(w: XmlElement): { readonly items: XmlElement[]; readonly bereiche: XmlElement[] } {
  const items: XmlElement[] = [];
  const bereiche: XmlElement[] = [];
  const sammle = (e: XmlElement): void => {
    if (e.name === 'Item' || e.name === 'MarkupItem') items.push(e);
    else {
      if (e.name === 'BoQCtgy') bereiche.push(e);
      for (const k of elementKinder(e)) sammle(k);
    }
  };
  sammle(w);
  return { items, bereiche };
}

/**
 * `lvDatei`: Datei des LV, wenn die geprüfte Datei ein Angebot ist. Eine X84 trägt nicht, ob eine Position entfällt
 * (`NotAppl`) oder ein Bereich eine Wahl ist (`ALNBSerNo`); das steht im LV und gilt für die Summen der X84 genauso.
 */
function pruefeSummen(d: string, g: Gelesen, lvDatei: string = d): void {
  const soll = SOLL_ABWEICHUNGEN[d];
  expect(soll, 'Datei in SOLL_ABWEICHUNGEN').toBeDefined();
  const gp = new Map(g.summen.positionen.map((s) => [s.positionId as string, s]));
  const gs = new Map(g.summen.gliederungen.map((s) => [s.gliederungId as string, s.summe]));
  const befundAn = (id: string): boolean => g.befunde.some((b) => b.ort.knotenId === id);
  const boq = kind(kind(wurzelVon(d), 'Award'), 'BoQ');
  const lvTotals = kind(kind(boq, 'BoQInfo'), 'Totals');
  const lvVat = wert(kind(lvTotals, 'VAT'));
  const lv = elementeVon(wurzelVon(lvDatei));

  const positionsAbweichung: string[] = [];
  let bereichsAbweichung = 0;
  let iPos = 0;
  let iBer = 0;
  /** Σ Abweichungen im Teilbaum (Positionen in der Summe und Bereiche); prüft dabei jeden Bereich. */
  const pruefe = (e: XmlElement): Betrag => {
    if (e.name === 'Item' || e.name === 'MarkupItem') {
      const entfaellt = wert(kind(lv.items[iPos], 'NotAppl')) === 'Yes';
      const p = g.positionen[iPos++] as Position;
      const s = gp.get(p.id);
      const it = wert(kind(e, 'IT'));
      const eigen = s?.gesamtpreis ?? NULL;
      if (it === null || gleich(eigen, it)) return NULL;
      positionsAbweichung.push(ozVon(p));
      expect(befundAn(p.id) || p.zuschlag !== null, `${ozVon(p)}: Abweichung ohne Befund`).toBe(true);
      // Ohne eigenen GP (keine Menge im LV) zählt die Datei ihren IT, die App nichts; eine entfallende Position zählt
      // die Datei nicht.
      if (s?.gesamtpreis != null && s.gehtInSummeEin === false) return NULL;
      return subtrahiere(eigen, entfaellt ? NULL : betrag(it));
    }
    if (e.name !== 'BoQCtgy') return elementKinder(e).reduce((a, k) => addiere(a, pruefe(k)), NULL);
    const lvBereich = lv.bereiche[iBer];
    const k = g.gliederungen[iBer++] as Knoten;
    const darunter = elementKinder(e).reduce((a, x) => addiere(a, pruefe(x)), NULL);
    const totals = kind(e, 'Totals');
    const total = wert(kind(totals, 'Total'));
    if (total === null) return darunter;
    expect(
      vergleiche(subtrahiere(gs.get(k.id) ?? NULL, betrag(total)), darunter),
      `${ozVon(k)}: eigene Summe − Datei = Abweichungen darunter`,
    ).toBe(0);
    // Ein Bereich als Wahl (ALNBSerNo ≠ 0) zählt in der Datei nicht im übergeordneten Bereich.
    const wahl = (wert(kind(lvBereich, 'ALNBSerNo')) ?? '0') !== '0';
    const eigen = wahl ? betrag(total) : subtrahiere(betrag(total), betrag(nachBereich(totals) ?? total));
    const vat = wert(kind(totals, 'VAT'));
    const fremderSatz = vat !== null && lvVat !== null && !gleich(vat, lvVat);
    if (vergleiche(eigen, NULL) !== 0 || fremderSatz) {
      bereichsAbweichung += 1;
      expect(befundAn(k.id), `${ozVon(k)}: Abweichung des Bereichs ohne Befund`).toBe(true);
    }
    return addiere(darunter, eigen);
  };
  const alle = kinderVon(boq, 'BoQBody').reduce((a, b) => addiere(a, pruefe(b)), NULL);
  expect(iPos).toBe(g.positionen.length);
  expect(iBer).toBe(g.gliederungen.length);
  expect({ positionen: positionsAbweichung, bereiche: bereichsAbweichung }).toEqual(soll);

  const lvTotal = wert(kind(lvTotals, 'Total'));
  expect(lvTotal).not.toBeNull();
  expect(
    vergleiche(subtrahiere(g.summen.gesamt.netto, betrag(lvTotal ?? '')), alle),
    'LV: eigene Summe − Datei = alle Abweichungen',
  ).toBe(0);
  if (vergleiche(alle, NULL) === 0 && bereichsAbweichung === 0) {
    expect(gleich(g.inhalt.mwstSatz, lvVat)).toBe(true);
    expect(gleich(g.summen.gesamt.brutto, wert(kind(lvTotals, 'TotalGross')))).toBe(true);
  }
}

describe('GAEB DA XML 3.1: Summen wie in der Datei bis auf die ausgewiesenen Abweichungen', () => {
  for (const d of LV_DATEIEN.filter((x) => x.endsWith('.X86')))
    it(`${d}: GP, Bereichssummen und LV-Summe`, () => {
      pruefeSummen(d, gelesen(d));
    });
});

// --- Angebot X84 ------------------------------------------------------------------------------------------------

const X84 = 'Musterdatei_3.1_2008-001.X84';

/**
 * Das Angebot gegen das LV der Musterdatei 001 (3.1, X83). Die Summen rechnen wie bei der Vergabe über ein gedachtes LV:
 * die Knoten des LV mit dem EP des Angebots, an einer Zuschlagsposition mit dem Satz des Bieters (R7). Die Regel steht
 * in `vergabe`, das `gaeb` nicht importiert; hier ist sie in wenigen Zeilen nachgebaut.
 */
function angebotGelesen(): Gelesen & { readonly lesung: AngebotLesung } {
  const lvLesung = gelesen('Musterdatei_3.1_2008-001.X83');
  const lv = lvLesung.inhalt;
  const { wurzelId, knoten, ...kopf } = lv;
  const lesung = leseAngebot(lesePfad(pfad(X84)), {
    lv: { ...kopf, id: wurzelId, projektId: 'projekt-1' as ProjektId, knoten },
    angebotId: 'angebot-1' as AngebotId,
    bieterId: 'bieter-1' as BieterId,
    dateiname: X84,
  });
  const nachId = new Map((lesung.befehl?.angebot.positionen ?? []).map((a) => [a.positionId as string, a]));
  const gedacht = knoten.map((k): Knoten => {
    if (k.art !== 'position') return k;
    const a = nachId.get(k.id);
    const ep = a?.status === 'angeboten' ? a.einheitspreis : null;
    const satz = a?.status === 'angeboten' ? (a.zuschlagssatz ?? null) : null;
    return k.zuschlag === null
      ? { ...k, einheitspreis: ep }
      : { ...k, einheitspreis: satz === null ? ep : null, zuschlag: { ...k.zuschlag, prozentsatz: satz } };
  });
  const nachlass = lesung.befehl?.angebot.nachlass ?? null;
  const inhalt: LvInhalt = { ...lv, knoten: gedacht, nachlass };
  return {
    lesung,
    inhalt,
    // Was das LV nicht abbildet (die Wahl des Bereichs 1.10.40), meldet schon das Einlesen des LV.
    befunde: [...lvLesung.befunde, ...lesung.befunde],
    summen: summenBerechnen({ id: wurzelId, knoten: gedacht, nachlass, mwstSatz: lv.mwstSatz }),
    positionen: gedacht.filter((k): k is Position => k.art === 'position'),
    gliederungen: gedacht.filter((k) => k.art === 'titel' || k.art === 'los'),
  };
}

describe('GAEB DA XML 3.1: Angebot X84', () => {
  it(`${X84}: gelesen als 3.1 gegen das LV der Musterdatei 001, jede Position mit dem EP der Datei`, () => {
    const g = angebotGelesen();
    expect([g.lesung.phase, g.lesung.version]).toEqual(['X84', '3.1']);
    expect(g.lesung.befehl).not.toBeNull();
    expect(g.lesung.bieter?.name).toBe('Maler + Lackierer Pinsel und Co KG');
    const items: XmlElement[] = [];
    const sammle = (e: XmlElement): void => {
      if (e.name === 'Item' || e.name === 'MarkupItem') items.push(e);
      else for (const k of elementKinder(e)) sammle(k);
    };
    sammle(wurzelVon(X84));
    expect(g.positionen).toHaveLength(items.length);
    items.forEach((el, i) => {
      const p = g.positionen[i] as Position;
      expect(gleich(p.einheitspreis, wert(kind(el, 'UP'))), `${ozVon(p)} EP`).toBe(true);
    });
  });

  it(`${X84}: Summen wie in der Datei bis auf die ausgewiesenen Abweichungen`, () => {
    pruefeSummen(X84, angebotGelesen(), 'Musterdatei_3.1_2008-001.X83');
  });

  it(`${X84}: Menge des Bieters und Pauschalsumme eines Bereichs sind Befunde am Knoten`, () => {
    const g = angebotGelesen();
    const an = (code: string): string[] =>
      g.befunde
        .filter((b) => b.code === code)
        .map((b) => ozVon(g.inhalt.knoten.find((k) => k.id === b.ort.knotenId) ?? g.positionen[0]!));
    expect(an('bietermenge-nicht-abgebildet')).toEqual(['1.10.30.10', '1.10.40.10', '1.10.40.30']);
    expect(g.befunde.find((b) => b.code === 'bietermenge-nicht-abgebildet')?.meldung).toBe(
      'Die Position 1.10.30.10 trägt eine Menge des Bieters (10.000). Ein Angebot übernimmt nur Preise; es gilt die Menge des LV (ohne Menge).',
    );
    expect(an('pauschalsumme-nicht-abgebildet')).toEqual(['1.20']);
    expect(g.lesung.befunde.map((b) => b.meldung).filter((m) => m.includes('Element Item/Qty '))).toEqual([]);
  });
});
