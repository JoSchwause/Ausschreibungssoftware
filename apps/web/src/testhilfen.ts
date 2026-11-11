// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Vitest unter Node: echter Speicher auf einer In-Memory-SQLite (dieselbe Logik wie im Worker) und Attrappen
// um ihn herum, die zählen oder Fehler liefern.

import { SpeicherKern, direktTransport, speicherUeberTransport } from '@tethys/speicher';
import { oeffneInMemory } from '@tethys/speicher/backends';
import type {
  ChangeSet,
  Ergebnis,
  Protokolleintrag,
  Speicher,
  Speicherfehler,
  Speicherfehlercode,
  Zeitstempel,
} from '@tethys/vertrag';
import { EINZIGER_NUTZER, type Umgebung } from './lv/befehlsweg';
import { appIdQuelle } from './lv/ids';

export async function speicherImSpeicher(): Promise<Speicher> {
  const db = await oeffneInMemory();
  const kern = SpeicherKern.oeffnen(db.db);
  if (!kern.ok) throw new Error(kern.fehler.meldung);
  return speicherUeberTransport(direktTransport(kern.wert), null);
}

/** Zählt jedes `anwenden` und kann ab einem Zeitpunkt einen Fehlercode liefern, ohne zu schreiben. */
export interface ZaehlenderSpeicher extends Speicher {
  readonly geschrieben: readonly { readonly eintrag: Protokolleintrag; readonly changeSet: ChangeSet }[];
  fehlerAb(code: Speicherfehlercode | null): void;
}

export function zaehlenderSpeicher(innen: Speicher): ZaehlenderSpeicher {
  const geschrieben: { eintrag: Protokolleintrag; changeSet: ChangeSet }[] = [];
  let fehlercode: Speicherfehlercode | null = null;
  return {
    ...innen,
    geschrieben,
    fehlerAb(code) {
      fehlercode = code;
    },
    anwenden: (eintrag, changeSet): Promise<Ergebnis<void, Speicherfehler>> => {
      if (fehlercode !== null)
        return Promise.resolve({ ok: false, fehler: { code: fehlercode, meldung: 'Attrappe' } });
      geschrieben.push({ eintrag, changeSet });
      return innen.anwenden(eintrag, changeSet);
    },
  };
}

export function testUmgebung(speicher: Speicher): Umgebung {
  let n = 0;
  return {
    speicher,
    ids: appIdQuelle(),
    uhr: () => new Date(Date.UTC(2026, 10, 10, 12, 0, n++)).toISOString() as Zeitstempel,
    nutzer: EINZIGER_NUTZER,
  };
}
