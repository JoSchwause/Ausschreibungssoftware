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
import { lvBefehlAnwenden, type Umgebung } from './lv/befehlsweg';
import type { SpeicherAnbieterProps } from './speicher/SpeicherAnbieter';

export interface Testpfad {
  /** Legt ein LV mit vollem Inhalt an (z. B. die Fixture `gross`); `inhalt.wurzelId` ist die neue Kennung. */
  lvAnlegen(projektId: ProjektId, inhalt: LvInhalt): Promise<{ ok: boolean; id: LeistungsverzeichnisId }>;
  /** Ab jetzt weist `anwenden` mit diesem Code ab, ohne zu schreiben; `null` hebt das auf. */
  speicherFehler(code: Speicherfehlercode | null): void;
}

declare global {
  interface Window {
    tethysTest?: Testpfad;
  }
}

const AKTIV = import.meta.env.VITE_TESTPFAD === '1';

let fehlercode: Speicherfehlercode | null = null;

function umhuellen(speicher: Speicher): Speicher {
  return {
    ...speicher,
    anwenden: (eintrag, changeSet) =>
      fehlercode === null
        ? speicher.anwenden(eintrag, changeSet)
        : Promise.resolve({ ok: false, fehler: { code: fehlercode, meldung: 'Testpfad' } }),
  };
}

function onBereit(u: Umgebung): void {
  window.tethysTest = {
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
  };
}

/** Eigenschaften für `SpeicherAnbieter`; ohne Testpfad leer. */
export const testpfad: Pick<SpeicherAnbieterProps, 'umhuellen' | 'onBereit'> = AKTIV
  ? { umhuellen, onBereit }
  : {};
