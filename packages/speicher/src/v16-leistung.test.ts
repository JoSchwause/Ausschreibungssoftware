// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudgets als Tests (Q4; D-54, D-57; Ticket 106 Punkt 5), unter Node mit In-Memory-SQLite wie die übrigen
// Budgettests des Pakets. Die Bytes der Modelldatei erzeugt `fixtures/ifc/erzeugen.mjs` (Ticket 99); das Bauwerksmodell dazu
// baut bis Ticket 107 ein eigener Testerzeuger in der Form von v1.6 (`testhilfe/v16.ts`), weil `speicher` `ifc` nicht
// importieren darf (A3). ChangeSets kommen geklont an, wie über die Worker-Grenze (`postMessage`); das Klonen selbst ist nicht
// mitgemessen (wie D-94.5). Budgets werden nicht aufgeweicht; die Messwerte stehen im Ticket.

import type {
  BieterId,
  Bauzeitenplan,
  BauzeitenplanChangeSet,
  ChangeSet,
  Menge,
  Position,
  Protokolleintrag,
} from '@tethys/vertrag';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { erzeugeModell } from '../../../fixtures/ifc/erzeugen.mjs';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { feldAendern, umkehren } from './testhilfe/umkehrung';
import { bauzeitenplan, modell, modellAnlegenCs } from './testhilfe/v16';

const median = (w: readonly number[]): number =>
  [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? NaN;
const ms = (w: readonly number[]): string =>
  `Median ${median(w).toFixed(1)} ms (min ${Math.min(...w).toFixed(1)}, max ${Math.max(...w).toFixed(1)})`;
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

const F = ladeFixture('gross');
const PROJEKT = { ...F.projekt, bieter: [{ id: 'bieter-gross-1' as BieterId, name: 'Bieter (erfunden)' }] };
const P = PROJEKT.id;
let nr = 5000;

/** Wendet ein (geklontes) ChangeSet an und misst nur `anwenden`. */
async function gemessen(
  kern: SpeicherKern,
  aggregat: Protokolleintrag['aggregat'],
  befehl: Protokolleintrag['befehl'],
  cs: ChangeSet,
) {
  const [e, c] = structuredClone([eintrag(++nr, P, aggregat, befehl), cs] as const);
  const t0 = performance.now();
  wert(await kern.anwenden(e, c));
  return { id: e.id, ms: performance.now() - t0 };
}

/** Projekt mit LV `gross` (5.000 Positionen); auf Wunsch dazu ein Bauwerksmodell mit `bauteile` Bauteilen samt Bytes. */
async function projekt(bauteile: number | null) {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte({ projekt: PROJEKT, lv: F.lv, angebote: [] }));
  if (bauteile === null) return { kern, ablegenMs: 0, anlegenMs: 0, bytes: new Uint8Array(0) };
  const bytes = new TextEncoder().encode(erzeugeModell({ bauteile }));
  const t0 = performance.now();
  wert(await kern.modelldateiAblegen(bytes));
  const ablegenMs = performance.now() - t0;
  const m = { ...modell(1, bytes, {}, bauteile), projektId: P };
  const a = await gemessen(
    kern,
    { art: 'bauwerksmodell', id: m.id },
    { art: 'BauwerksmodellAnlegen', bauwerksmodell: m },
    modellAnlegenCs(m),
  );
  return { kern, ablegenMs, anlegenMs: a.ms, bytes, modell: m };
}

describe('Leistungsbudgets X1 in speicher (D-54)', () => {
  it(
    'ein Modell mit 10.000 Bauteilen speichern (Massenbefehl): höchstens 3 s',
    { timeout: 300_000 },
    async () => {
      const r = await projekt(10_000);
      const liste = wert(r.kern.bauwerksmodelleAuflisten(P));
      expect(liste[0]?.anzahlBauteile).toBe(10_000);
      const t0 = performance.now();
      const geladen = wert(r.kern.bauwerksmodellLaden(liste[0]?.id ?? ('?' as never))).bauwerksmodell;
      const ladenMs = performance.now() - t0;
      expect(geladen.bauteile).toHaveLength(10_000);
      console.info(
        `[speicher/106] Modell 10.000 Bauteile (Datei ${(r.bytes.length / 1e6).toFixed(1)} MB): ablegen ${r.ablegenMs.toFixed(0)} ms, ` +
          `anwenden (BauwerksmodellAnlegen) ${r.anlegenMs.toFixed(0)} ms, zusammen ${(r.ablegenMs + r.anlegenMs).toFixed(0)} ms; laden ${ladenMs.toFixed(0)} ms`,
      );
      expect(r.anlegenMs).toBeLessThan(3000);
      // D-106.7: Die App legt erst die Bytes ab, dann das Modell an; auch beides zusammen bleibt im Budget.
      expect(r.ablegenMs + r.anlegenMs).toBeLessThan(3000);
    },
  );

  it(
    'Projektdatei mit einem 25-MB-Modell exportieren und importieren: je höchstens 10 s',
    { timeout: 300_000 },
    async () => {
      const r = await projekt(12_000);
      expect(r.bytes.length).toBeGreaterThanOrEqual(25_000_000);
      let t0 = performance.now();
      const text = wert(r.kern.projektdateiExportieren(P));
      const exportMs = performance.now() - t0;
      const { kern } = await neuerKern();
      t0 = performance.now();
      wert(await kern.projektdateiImportieren(text));
      const importMs = performance.now() - t0;
      expect(sha(wert(kern.modelldateiLaden(sha(r.bytes))))).toBe(sha(r.bytes));
      console.info(
        `[speicher/106] Projektdatei mit Modell (${(r.bytes.length / 1e6).toFixed(1)} MB Datei, 12.000 Bauteile, LV gross): ` +
          `Text ${(text.length / 1e6).toFixed(1)} Mio. Zeichen; Export ${exportMs.toFixed(0)} ms, Import ${importMs.toFixed(0)} ms`,
      );
      expect(exportMs).toBeLessThan(10_000);
      expect(importMs).toBeLessThan(10_000);
    },
  );

  it(
    'eine Einzeländerung im LV gross bleibt mit 10.000-Bauteile-Modell im Projekt im Budget (Median unter 100 ms, D-29)',
    { timeout: 300_000 },
    async () => {
      const messe = async (bauteile: number | null): Promise<number[]> => {
        const { kern } = await projekt(bauteile);
        const positionen = F.lv.leistungsverzeichnis.knoten.filter(
          (k): k is Position => k.art === 'position',
        );
        let stand = wert(kern.lvLaden(F.lv.leistungsverzeichnis.id));
        const zeiten: number[] = [];
        for (let i = 0; i < 12; i++) {
          const p = positionen[(i * 397) % positionen.length];
          if (p === undefined) throw new Error('Position');
          const vorher = stand.leistungsverzeichnis.knoten.find((k) => k.id === p.id) as Position;
          const menge = `${String(i + 2)}.000` as Menge;
          const cs = feldAendern(stand, p.id, { ...vorher, menge }, '1.00');
          const r = await gemessen(
            kern,
            { art: 'leistungsverzeichnis', id: stand.leistungsverzeichnis.id },
            { art: 'MengeAendern', positionId: p.id, menge },
            cs,
          );
          if (i >= 3) zeiten.push(r.ms);
          stand = wert(kern.lvLaden(stand.leistungsverzeichnis.id));
        }
        return zeiten;
      };
      const ohne = await messe(null);
      const mit = await messe(10_000);
      console.info(
        `[speicher/106] MengeAendern auf gross: ohne Modell ${ms(ohne)}; mit 10.000-Bauteile-Modell ${ms(mit)}`,
      );
      expect(median(mit)).toBeLessThan(100);
    },
  );
});

describe('Leistungsbudget X2 in speicher (D-57)', () => {
  it(
    'Bauzeitenplan mit 1.000 Vorgängen: VorgangSetzen, Undo und Redo je anwenden, warm, Median unter 100 ms',
    { timeout: 300_000 },
    async () => {
      const { kern } = await neuerKern();
      await speichere(kern, anlegenSchritte({ projekt: PROJEKT, lv: F.lv, angebote: [] }).slice(0, 1));
      const plan: Bauzeitenplan = { ...bauzeitenplan(1, 1000), projektId: P };
      const aggregat = { art: 'bauzeitenplan', id: plan.id } as const;
      const anlegen = await gemessen(
        kern,
        aggregat,
        { art: 'BauzeitenplanAnlegen', bauzeitenplan: plan },
        {
          art: 'bauzeitenplan',
          bauzeitenplanId: plan.id,
          bauzeitenplan: { vorher: null, nachher: plan },
        },
      );
      const setzenMs: number[] = [];
      const undoMs: number[] = [];
      const redoMs: number[] = [];
      let stand = plan;
      for (let i = 0; i < 12; i++) {
        const stelle = 1 + ((i * 97) % 999);
        const alt = stand.vorgaenge[stelle];
        if (alt === undefined) throw new Error('Vorgang');
        const neu = { ...alt, dauer: alt.dauer + 1 };
        const nachher: Bauzeitenplan = {
          ...stand,
          vorgaenge: stand.vorgaenge.map((v, j) => (j === stelle ? neu : v)),
        };
        const cs: BauzeitenplanChangeSet = {
          art: 'bauzeitenplan',
          bauzeitenplanId: plan.id,
          bauzeitenplan: { vorher: stand, nachher },
        };
        const setzen = await gemessen(kern, aggregat, { art: 'VorgangSetzen', vorgang: neu, nach: null }, cs);
        const undo = await gemessen(
          kern,
          aggregat,
          { art: 'Rueckgaengig', protokollId: setzen.id },
          umkehren(cs),
        );
        const redo = await gemessen(kern, aggregat, { art: 'Wiederholen', protokollId: setzen.id }, cs);
        if (i >= 3) {
          setzenMs.push(setzen.ms);
          undoMs.push(undo.ms);
          redoMs.push(redo.ms);
        }
        stand = nachher;
      }
      expect(wert(kern.bauzeitenplanLaden(plan.id)).bauzeitenplan).toEqual(stand);
      console.info(
        `[speicher/106] Bauzeitenplan 1.000 Vorgänge (JSON ${(JSON.stringify(plan).length / 1024).toFixed(0)} KiB): anlegen ${anlegen.ms.toFixed(0)} ms; ` +
          `VorgangSetzen ${ms(setzenMs)}; Rückgängig ${ms(undoMs)}; Wiederholen ${ms(redoMs)}`,
      );
      expect(median(setzenMs)).toBeLessThan(100);
      expect(median(undoMs)).toBeLessThan(100);
      expect(median(redoMs)).toBeLessThan(100);
    },
  );
});
