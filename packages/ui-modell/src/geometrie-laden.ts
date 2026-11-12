// SPDX-License-Identifier: AGPL-3.0-or-later
// Hauptthread-Seite des Geometrie-Workers: ein Worker je Ladevorgang, danach beendet.

import type { Modellgeometrie } from './geometrie-lesen';
import type { Modellfehler } from './typen';

export interface Workerauftrag {
  /** eine Kopie der Bytes; die Datei der App bleibt unberührt */
  readonly datei: ArrayBuffer;
}

export type Workerantwort =
  | { readonly art: 'geometrie'; readonly geometrie: Modellgeometrie }
  | ({ readonly art: 'fehler' } & Modellfehler);

export interface Ladeauftrag {
  readonly ergebnis: Promise<Modellgeometrie>;
  /** beendet den Worker; `ergebnis` erfüllt sich dann nie */
  abbrechen(): void;
}

/** Fehler des Ladens mit dem Code für `onFehler`. */
export class Ladefehler extends Error {
  constructor(readonly fehler: Modellfehler) {
    super(fehler.meldung);
  }
}

const neuerWorker = (): Worker =>
  new Worker(new URL('./geometrie-worker.ts', import.meta.url), { type: 'module', name: 'ui-modell-geometrie' });

export function geometrieLaden(datei: Uint8Array, worker: Worker = neuerWorker()): Ladeauftrag {
  const ergebnis = new Promise<Modellgeometrie>((erfuellen, ablehnen) => {
    worker.onmessage = (e: MessageEvent<Workerantwort>) => {
      worker.terminate();
      const a = e.data;
      if (a.art === 'geometrie') erfuellen(a.geometrie);
      else ablehnen(new Ladefehler({ code: a.code, meldung: a.meldung }));
    };
    worker.onerror = (e: ErrorEvent) => {
      worker.terminate();
      ablehnen(new Ladefehler({ code: 'worker-fehler', meldung: e.message || 'Der Geometrie-Worker ist abgestürzt.' }));
    };
  });
  const kopie = datei.slice().buffer;
  const auftrag: Workerauftrag = { datei: kopie };
  worker.postMessage(auftrag, [kopie]);
  return {
    ergebnis,
    abbrechen: () => {
      worker.terminate();
    },
  };
}
