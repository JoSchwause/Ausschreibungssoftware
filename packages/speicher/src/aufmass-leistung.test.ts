// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, Ticket 94; D-45, D-47 P4): ein Aufmaßblatt mit 5.000 Zeilen am Auftrags-LV aus
// `fixtures/gross`, eine Zeile je Position mit zwei Ansatzzeilen (wie die Messung D-45 in `apps/web`). Gemessen wird
// `anwenden` im Speicherkern (Node, In-Memory-SQLite): eine Einzeländerung (`AufmasspositionSetzen`, das ganze Blatt
// vorher und nachher, D-36 (8)), ihre Umkehrung (Undo) und erneut (Redo), warm, Median unter 100 ms. Das Budget wird
// nicht aufgeweicht; die Messwerte stehen im Ticket.

import type {
  Aufmass,
  AufmassChangeSet,
  AufmassId,
  AngebotZustand,
  BieterId,
  Menge,
  Position,
  Protokolleintrag,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import {
  anlegenSchritte,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
} from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';

const BUDGET_MS = 100;
const WARMLAUF = 3;
const LAEUFE = 9;

const median = (w: readonly number[]): number =>
  [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? NaN;
const ms = (w: readonly number[]): string =>
  `Median ${median(w).toFixed(1)} ms (min ${Math.min(...w).toFixed(1)}, max ${Math.max(...w).toFixed(1)})`;

const F = ladeFixture('gross');
const BIETER = { id: 'bieter-gross-1' as BieterId, name: 'Bieter (erfunden)' };
const PROJEKT = { ...F.projekt, bieter: [BIETER] };
const P = PROJEKT.id;
const ANGEBOT: AngebotZustand = {
  angebot: {
    id: 'angebot-gross-1' as AngebotZustand['angebot']['id'],
    projektId: P,
    leistungsverzeichnisId: F.lv.leistungsverzeichnis.id,
    bieterId: BIETER.id,
    nachlass: null,
    positionen: [],
  },
  summen: { positionen: [], gliederungen: [], gesamt: F.lv.summen.gesamt },
};
const AUFTRAG = auftragsLvAus(F.lv, ANGEBOT.angebot.id);

/** Projekt, LV `gross`, ein Angebot und das Auftrags-LV mit seinen 5.000 Positionen; dazu das große Blatt. */
async function grossesBlatt(): Promise<{ kern: SpeicherKern; blatt: Aufmass; anlegenMs: number }> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte({ projekt: PROJEKT, lv: F.lv, angebote: [ANGEBOT] }));
  const a = AUFTRAG.auftragsLeistungsverzeichnis;
  wert(
    await kern.anwenden(
      eintrag(
        10,
        P,
        { art: 'auftrags-leistungsverzeichnis', id: a.id },
        { art: 'AuftragsLeistungsverzeichnisAnlegen', auftragsLeistungsverzeichnis: a },
      ),
      auftragsLvAnlegenChangeSet(AUFTRAG),
    ),
  );
  const blatt: Aufmass = {
    id: 'aufmass-gross-1' as AufmassId,
    projektId: P,
    auftragsLvId: a.id,
    nummer: 1,
    bezeichnung: 'groß (erfunden)',
    datum: null,
    positionen: a.knoten
      .filter((k): k is Position => k.art === 'position')
      .map((k) => ({
        positionId: k.id,
        mengenansatz: [
          { zeile: 1, formel: 91, ausdruck: '12,5*8', variable: 'flaeche' },
          { zeile: 2, formel: 91, ausdruck: 'flaeche*2', variable: null },
        ],
        menge: '300.000' as Menge,
      })),
  };
  const t0 = performance.now();
  wert(
    await kern.anwenden(
      eintrag(11, P, { art: 'aufmass', id: blatt.id }, { art: 'AufmassAnlegen', aufmass: blatt }),
      { art: 'aufmass', aufmassId: blatt.id, aufmass: { vorher: null, nachher: blatt } },
    ),
  );
  return { kern, blatt, anlegenMs: performance.now() - t0 };
}

/** Das Blatt mit einer neuen Zeile an Stelle `i`; die übrigen Zeilen bleiben dieselben Objekte (wie im Ausführer). */
function zeileSetzen(a: Aufmass, i: number, menge: string): [AufmassChangeSet, Protokolleintrag['befehl']] {
  const alt = a.positionen[i];
  if (alt === undefined) throw new Error(`keine Zeile ${String(i)}`);
  const neu = { positionId: alt.positionId, mengenansatz: null, menge: menge as Menge };
  const nachher: Aufmass = { ...a, positionen: a.positionen.map((z, j) => (j === i ? neu : z)) };
  return [
    { art: 'aufmass', aufmassId: a.id, aufmass: { vorher: a, nachher } },
    { art: 'AufmasspositionSetzen', position: neu },
  ];
}

describe('Leistungsbudget Aufmaßblatt (Q4, Ticket 94)', () => {
  it(
    `5.000 Zeilen: AufmasspositionSetzen, Undo und Redo je anwenden, warm, Median unter ${String(BUDGET_MS)} ms`,
    { timeout: 120_000 },
    async () => {
      const { kern, blatt, anlegenMs } = await grossesBlatt();
      expect(blatt.positionen).toHaveLength(5000);
      const json = JSON.stringify(blatt).length;
      const aggregat = { art: 'aufmass', id: blatt.id } as const;
      const setzenMs: number[] = [];
      const undoMs: number[] = [];
      const redoMs: number[] = [];
      let stand = blatt;
      let nr = 100;
      const anwenden = async (befehl: Protokolleintrag['befehl'], cs: AufmassChangeSet) => {
        const e = eintrag(++nr, P, aggregat, befehl);
        const t0 = performance.now();
        wert(await kern.anwenden(e, cs));
        return { id: e.id, ms: performance.now() - t0 };
      };
      for (let i = 0; i < WARMLAUF + LAEUFE; i++) {
        const [cs, befehl] = zeileSetzen(stand, (i * 97) % 5000, `${String(i + 1)}.000`);
        const setzen = await anwenden(befehl, cs);
        const undo = await anwenden({ art: 'Rueckgaengig', protokollId: setzen.id }, umkehren(cs));
        const redo = await anwenden({ art: 'Wiederholen', protokollId: setzen.id }, cs);
        if (i >= WARMLAUF) {
          setzenMs.push(setzen.ms);
          undoMs.push(undo.ms);
          redoMs.push(redo.ms);
        }
        stand = cs.aufmass.nachher ?? stand;
      }
      // Der Speicher folgt: nach dem letzten Redo steht das Blatt des letzten Befehls.
      expect(wert(kern.aufmassLaden(blatt.id)).aufmass).toEqual(stand);
      console.info(
        [
          `[speicher/94] Aufmaßblatt 5.000 Zeilen (Blatt als JSON ${(json / 1024).toFixed(0)} KiB), anwenden warm (${String(LAEUFE)} Läufe):`,
          `  Anlegen (AufmassAnlegen, Massenbefehl): ${anlegenMs.toFixed(0)} ms`,
          `  AufmasspositionSetzen: ${ms(setzenMs)}`,
          `  Rückgängig: ${ms(undoMs)}`,
          `  Wiederholen: ${ms(redoMs)}`,
        ].join('\n'),
      );
      expect(median(setzenMs)).toBeLessThan(BUDGET_MS);
      expect(median(undoMs)).toBeLessThan(BUDGET_MS);
      expect(median(redoMs)).toBeLessThan(BUDGET_MS);
    },
  );
});
