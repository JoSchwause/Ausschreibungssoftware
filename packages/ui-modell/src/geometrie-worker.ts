// SPDX-License-Identifier: AGPL-3.0-or-later
// Geometrie-Worker: web-ifc (WASM, Single-Thread-Bauart, keine COOP/COEP-Kopfzeilen nötig) rechnet die Geometrie abseits
// des Hauptthreads (D-50). Die WASM-Datei kommt über `?url` aus dem Paket und wird mit der App gebündelt, nie von einem
// CDN geladen (ADR 0001). Ein Worker je Ladevorgang; `geometrie-laden.ts` beendet ihn danach und gibt so den Speicher
// von web-ifc frei.

import { IfcAPI } from 'web-ifc';
import wasmUrl from 'web-ifc/web-ifc.wasm?url';
import { geometrieLesen, Lesefehler } from './geometrie-lesen';
import type { Workerantwort, Workerauftrag } from './geometrie-laden';

const senden = (antwort: Workerantwort, uebergeben: Transferable[] = []): void => {
  (self as unknown as { postMessage: (a: Workerantwort, t: Transferable[]) => void }).postMessage(
    antwort,
    uebergeben,
  );
};

self.onmessage = (e: MessageEvent<Workerauftrag>): void => {
  void (async () => {
    try {
      const api = new IfcAPI();
      await api.Init((pfad) => (pfad.endsWith('.wasm') ? wasmUrl : pfad), true);
      const geometrie = geometrieLesen(api, new Uint8Array(e.data.datei));
      const puffer = geometrie.gruppen.flatMap((g) =>
        [g.positionen, g.normalen, g.indizes, g.teile, g.farben, g.grenzen].map((a) => a.buffer),
      );
      senden({ art: 'geometrie', geometrie }, puffer);
    } catch (fehler) {
      senden({
        art: 'fehler',
        code: fehler instanceof Lesefehler ? 'datei-nicht-lesbar' : 'worker-fehler',
        meldung: fehler instanceof Error ? fehler.message : String(fehler),
      });
    }
  })();
};
