// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87, D-45 (Q4): Zeit und Speicher je Undo-Schritt an einem Aufmaßblatt mit 5.000 Zeilen. Jeder Befehl am Blatt
// trägt das ganze Blatt vorher und nachher (D-36 (8)); gemessen wird, was das kostet. Auftrags-LV aus `gross` (5.000
// Positionen) mit einem Angebot zu den EP des LV, Zuschlag über den Befehlsweg; das Blatt hat eine Zeile je Position des
// LV (auch Alternativen und Zuschlagspositionen, die als Befund zählen), jede mit zwei Ansatzzeilen.
//
// Gemessen am Befehlsweg der App mit dem echten Speicherkern (SQLite im Arbeitsspeicher, dieselbe Logik wie im Worker;
// ohne Worker-Grenze und OPFS). Die Zahlen stehen im Ticket; die Schranke unten ist grob (Ausreißer bei Last), die
// Messung entscheidet nach D-45, ob v1.5 Zeilen-ChangeSets braucht.

import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import type { Angebot, Aufmass, Knoten, Menge, PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { zuschlagserteilungSpeichern } from '../auftrag/auftrag';
import { zuschlagserteilungPlanen } from '../auftrag/zuschlagserteilung';
import { Befehlsweg } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { aufmassSitzung, neuesBlatt } from './aufmass';
import { blattAnsicht, kumuliertBisHier } from './blatt';

setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;

/**
 * Grobe Schranke je Undo-Schritt (Median) gegen einen krankhaften Rückschritt; kein Budget (D-45 verlangt die Messung,
 * das Budget einer Einzeländerung im Browser, 100 ms in `e2e/leistung.spec.ts`, ist der Vergleich im Ticket).
 */
const SCHRANKE_MS = 1000;
const SCHRITTE = 10;
const BEFEHLE = 20;

const median = (w: readonly number[]): number =>
  [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? NaN;
const ms = (w: readonly number[]): string =>
  `Median ${median(w).toFixed(1)} ms (min ${Math.min(...w).toFixed(1)}, max ${Math.max(...w).toFixed(1)})`;

function heap(): number {
  gc();
  gc();
  return process.memoryUsage().heapUsed;
}

/** Dauer jedes `anwenden` des Speichers (Lesen, Vergleich mit `vorher`, Schreiben, Protokoll), in Aufrufreihenfolge. */
const anwendenMs: number[] = [];

async function grossesBlatt() {
  const innen = await speicherImSpeicher();
  const u = testUmgebung({
    ...innen,
    anwenden: async (e, cs) => {
      const t0 = performance.now();
      const r = await innen.anwenden(e, cs);
      anwendenMs.push(performance.now() - t0);
      return r;
    },
  });
  const weg = new Befehlsweg(u);
  const p = await weg.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Groß',
    bauherr: { name: 'Bauherr', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const inhalt = fixtureInhalt('gross');
  const s = weg.lv(p.zustand.id, null);
  const l = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: p.zustand.id,
    inhalt,
  });
  if (!l.ok || s.zustand === null) throw new Error('LV');
  const lv = s.zustand;
  const positionen = lv.leistungsverzeichnis.knoten.filter(
    (k): k is Knoten & { art: 'position' } => k.art === 'position',
  );
  const angebot: Angebot = {
    id: u.ids.angebot(),
    projektId: p.zustand.id,
    leistungsverzeichnisId: lv.leistungsverzeichnis.id,
    bieterId: u.ids.bieter(),
    nachlass: null,
    positionen: positionen.map((k) =>
      k.zuschlag !== null
        ? {
            positionId: k.id,
            status: 'angeboten',
            einheitspreis: '0.000' as never,
            epa: null,
            ...(k.zuschlag.prozentsatz === null ? {} : { zuschlagssatz: k.zuschlag.prozentsatz }),
          }
        : {
            positionId: k.id,
            status: 'angeboten',
            einheitspreis: k.einheitspreis ?? ('1.000' as never),
            epa: null,
          },
    ),
  };
  const a = await weg.angebotAnlegen(p.zustand, lv, { id: angebot.bieterId, name: 'Bieter' }, angebot);
  if (!a.ok) throw new Error('Angebot');
  const z = zuschlagserteilungPlanen({
    lv,
    angebot,
    projekt: a.zustand,
    gewaehlt: new Set<PositionId>(),
    neueId: u.ids.auftragsLeistungsverzeichnis(),
  });
  if (z.befehl === null) throw new Error(z.fehler ?? 'Zuschlag');
  const r = await zuschlagserteilungSpeichern(weg, z.befehl);
  if (!r.ok) throw new Error('Zuschlag');
  const auftrag = await u.speicher.auftragsLeistungsverzeichnisse.laden(r.id);
  if (!auftrag.ok) throw new Error(auftrag.fehler.meldung);

  const zeilen: Aufmass['positionen'] = positionen.map((k) => ({
    positionId: k.id,
    mengenansatz: [
      { zeile: 1, formel: 91, ausdruck: '12,5*8', variable: 'flaeche' },
      { zeile: 2, formel: 91, ausdruck: 'flaeche*2', variable: null },
    ],
    menge: '300.000' as Menge,
  }));
  const anlegen = neuesBlatt(
    u.ids,
    auftrag.wert.auftragsLeistungsverzeichnis,
    [],
    { bezeichnung: 'groß', datum: null },
    zeilen,
  );
  const blatt = aufmassSitzung(weg, p.zustand.id, null);
  const t0 = performance.now();
  const angelegt = await blatt.befehl(anlegen);
  const anlegenMs = performance.now() - t0;
  if (!angelegt.ok) throw new Error('Blatt');
  return {
    u,
    weg,
    auftrag: auftrag.wert,
    blatt,
    positionen,
    aufmassId: anlegen.aufmass.id,
    anlegenMs,
  };
}

describe('D-45: Undo an einem Aufmaßblatt mit 5.000 Zeilen', () => {
  it('Zeit und Speicher je Schritt', { timeout: 120_000 }, async () => {
    const { u, weg, auftrag, blatt, positionen, aufmassId, anlegenMs } = await grossesBlatt();
    expect(blatt.zustand?.aufmass.positionen).toHaveLength(5000);

    // Arbeitsspeicher: Was hält ein Undo-Schritt fest? Befehle an verschiedenen Zeilen, vorher und nachher gemessen.
    const vorher = heap();
    const befehlMs: number[] = [];
    const befehlSpeicherMs: number[] = [];
    for (let i = 0; i < BEFEHLE; i++) {
      const k = positionen[i * 97];
      if (k === undefined) throw new Error('Position');
      const t0 = performance.now();
      const r = await blatt.befehl({
        art: 'AufmasspositionSetzen',
        position: { positionId: k.id, mengenansatz: null, menge: `${String(i + 1)}.000` as Menge },
      });
      befehlMs.push(performance.now() - t0);
      befehlSpeicherMs.push(anwendenMs.at(-1) ?? NaN);
      expect(r.ok).toBe(true);
    }
    const jeSchrittByte = (heap() - vorher) / BEFEHLE;

    // Zeit: Rückgängig (Umkehren, Speicher, Protokoll) und das Nachführen der Seite: Soll/Ist für „kumuliert bis hier“
    // (`abrechnung`) und die Zeilen des Grids.
    const rueckMs: number[] = [];
    const rueckSpeicherMs: number[] = [];
    const kumuliertMs: number[] = [];
    const zeilenMs: number[] = [];
    for (let i = 0; i < SCHRITTE; i++) {
      const t0 = performance.now();
      const a = await weg.rueckgaengig();
      rueckMs.push(performance.now() - t0);
      rueckSpeicherMs.push(anwendenMs.at(-1) ?? NaN);
      expect(a.ok).toBe(true);
      const cs = a.ok ? a.teile[0]?.changeSet : undefined;
      const neu = cs?.art === 'aufmass' ? cs.aufmass.vorher : null;
      if (neu === null) throw new Error('kein Blatt');
      blatt.setze({ aufmass: neu });
      const t1 = performance.now();
      const kumuliert = kumuliertBisHier(auftrag, [neu], neu.nummer);
      const t2 = performance.now();
      blattAnsicht({ auftrag, blatt: neu, kumuliert, zugeklappt: new Set() });
      kumuliertMs.push(t2 - t1);
      zeilenMs.push(performance.now() - t2);
    }
    const vorMs: number[] = [];
    for (let i = 0; i < SCHRITTE; i++) {
      const t0 = performance.now();
      const a = await weg.wiederholen();
      vorMs.push(performance.now() - t0);
      expect(a.ok).toBe(true);
    }
    // Der Speicher folgt: nach Rückgängig und Wiederholen steht die Menge des letzten Befehls.
    const g = await u.speicher.aufmasse.laden(aufmassId);
    if (!g.ok) throw new Error(g.fehler.meldung);
    const letzte = positionen[(BEFEHLE - 1) * 97]?.id;
    expect(g.wert.aufmass.positionen.find((z) => z.positionId === letzte)?.menge).toBe(
      `${String(BEFEHLE)}.000`,
    );
    const json = JSON.stringify(g.wert.aufmass).length;

    console.info(
      [
        `D-45 Aufmaßblatt 5.000 Zeilen (Blatt als JSON ${(json / 1024).toFixed(0)} KiB):`,
        `  Anlegen (X31-Fall, ein Befehl): ${anlegenMs.toFixed(0)} ms`,
        `  Befehl AufmasspositionSetzen gesamt: ${ms(befehlMs)}; davon Speicher: ${ms(befehlSpeicherMs)}`,
        `  Rückgängig je Schritt gesamt: ${ms(rueckMs)}; davon Speicher: ${ms(rueckSpeicherMs)}`,
        `  Wiederholen je Schritt gesamt: ${ms(vorMs)}`,
        `  Seite nachführen je Schritt: kumuliert (Soll/Ist) ${ms(kumuliertMs)}; Grid-Zeilen ${ms(zeilenMs)}`,
        `  Arbeitsspeicher je Undo-Schritt (Historie): ${(jeSchrittByte / 1024).toFixed(1)} KiB`,
      ].join('\n'),
    );
    expect(median(rueckMs)).toBeLessThan(SCHRANKE_MS);
    expect(median(vorMs)).toBeLessThan(SCHRANKE_MS);
    // Ein Schritt hält ein neues Feld der Zeilen (5.000 Verweise), nicht das ganze Blatt: weit unter dessen Größe.
    expect(jeSchrittByte).toBeLessThan(json / 4);
  });
});
