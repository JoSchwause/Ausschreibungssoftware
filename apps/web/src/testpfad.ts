// SPDX-License-Identifier: AGPL-3.0-or-later
// Testpfad für Playwright (nur im Test-Build mit VITE_TESTPFAD=1; ein normaler Build enthält ihn nicht, die Konstante
// wird zur Bauzeit ersetzt). Er schreibt nie an den Befehlen vorbei: Auch das Laden eines großen LV geht als
// `LeistungsverzeichnisAnlegen` durch Kern und Speicher. Dazu kann er den Speicher Fehler liefern lassen (Q5).

import type {
  LeistungsverzeichnisId,
  LvInhalt,
  ProjektId,
  Speicher,
  Speicherfehlercode,
} from '@tethys/vertrag';
import { befehlswegFuer, lvBefehlAnwenden, type Umgebung } from './lv/befehlsweg';
import { rechnungTestpfad, type RechnungTestpfad } from './rechnung/testpfad'; // Ticket 88
import type { SpeicherAnbieterProps } from './speicher/SpeicherAnbieter';

export interface Testpfad extends RechnungTestpfad /* Ticket 88 */ {
  /** Legt ein LV mit vollem Inhalt an (z. B. die Fixture `gross`); `inhalt.wurzelId` ist die neue Kennung. */
  lvAnlegen(projektId: ProjektId, inhalt: LvInhalt): Promise<{ ok: boolean; id: LeistungsverzeichnisId }>;
  /** Ab jetzt weist `anwenden` mit diesem Code ab, ohne zu schreiben; `null` hebt das auf. */
  speicherFehler(code: Speicherfehlercode | null): void;
  /** Dauer jedes `anwenden` (Worker, OPFS) in ms, in Aufrufreihenfolge: trennt in Messungen Speicher und App. */
  readonly anwendenMs: number[];
  /** Die Projektdatei ohne Befehlsprotokoll (das wächst mit jedem Befehl, auch mit Undo; ADR 0009); `null` bei Fehler. */
  projektdatei(projektId: ProjektId): Promise<string | null>;
  /** Tiefe des Undo- und des Redo-Stapels der Sitzung (Ticket 48), damit ein Test auf das Ende einer Aktion wartet. */
  historie(): { readonly rueck: number; readonly vor: number };
  /** Wartet, bis alle eingereihten Befehle (auch Undo/Redo) durch Kern und Speicher sind. */
  leerlauf(): Promise<void>;
}

declare global {
  interface Window {
    tethysTest?: Testpfad;
  }
}

const AKTIV = import.meta.env.VITE_TESTPFAD === '1';

let fehlercode: Speicherfehlercode | null = null;
const anwendenMs: number[] = [];

function umhuellen(speicher: Speicher): Speicher {
  return {
    ...speicher,
    anwenden: async (eintrag, changeSet) => {
      if (fehlercode !== null) return { ok: false, fehler: { code: fehlercode, meldung: 'Testpfad' } };
      const t0 = performance.now();
      const r = await speicher.anwenden(eintrag, changeSet);
      anwendenMs.push(performance.now() - t0);
      return r;
    },
  };
}

function onBereit(u: Umgebung): void {
  window.tethysTest = {
    ...rechnungTestpfad(u), // Ticket 88
    async lvAnlegen(projektId, inhalt) {
      const a = await lvBefehlAnwenden(u, projektId, null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: inhalt.wurzelId,
        projektId,
        inhalt,
      });
      return { ok: a.ok, id: inhalt.wurzelId };
    },
    speicherFehler(code) {
      fehlercode = code;
    },
    anwendenMs,
    async projektdatei(projektId) {
      const r = await u.speicher.projektdateiExportieren(projektId);
      if (!r.ok) return null;
      const d = JSON.parse(r.wert) as Record<string, unknown>;
      delete d['protokoll'];
      return JSON.stringify(d);
    },
    historie() {
      return befehlswegFuer(u).historie.tiefe;
    },
    leerlauf() {
      return befehlswegFuer(u).reihe(() => Promise.resolve());
    },
  };
}

/** Eigenschaften für `SpeicherAnbieter`; ohne Testpfad leer. */
export const testpfad: Pick<SpeicherAnbieterProps, 'umhuellen' | 'onBereit'> = AKTIV
  ? { umhuellen, onBereit }
  : {};
