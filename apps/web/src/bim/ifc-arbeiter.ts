// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Hauptthread-Teil des IFC-Workers (Ticket 114): Aufträge als Promises, der Reihe nach beantwortet. Ein Arbeiter je
// Einlesen bzw. je offener Modellseite; `beenden` gibt den Speicher des Workers frei.

import type { BauwerksmodellLesung, Objekteigenschaften } from '@tethys/ifc';
import type { BauwerksmodellKopf } from '@tethys/vertrag';
import type { IfcAntwort, IfcAuftrag } from './ifc-auftrag';

type Ohne<A> = A extends unknown ? Omit<A, 'nr'> : never;

export class IfcArbeiter {
  readonly #worker = new Worker(new URL('./ifc-worker.ts', import.meta.url), { type: 'module' });
  readonly #offen = new Map<number, (a: IfcAntwort) => void>();
  #nr = 0;

  constructor() {
    this.#worker.onmessage = (e: MessageEvent<IfcAntwort>) => {
      const f = this.#offen.get(e.data.nr);
      this.#offen.delete(e.data.nr);
      f?.(e.data);
    };
    this.#worker.onerror = (e) => {
      for (const [nr, f] of this.#offen) f({ nr, art: 'fehler', meldung: e.message || 'IFC-Worker abgestürzt' });
      this.#offen.clear();
    };
  }

  #senden(a: Ohne<IfcAuftrag>): Promise<IfcAntwort> {
    const nr = ++this.#nr;
    return new Promise((ok) => {
      this.#offen.set(nr, ok);
      this.#worker.postMessage({ ...a, nr } as IfcAuftrag);
    });
  }

  async lesen(bytes: Uint8Array, kopf: Omit<BauwerksmodellKopf, 'schema'>): Promise<BauwerksmodellLesung> {
    const a = await this.#senden({ art: 'lesen', bytes, kopf });
    if (a.art !== 'gelesen') throw new Error(a.art === 'fehler' ? a.meldung : 'unerwartete Antwort');
    return a.lesung;
  }

  /** Baut den Eigenschaftsindex; `false`, wenn die Datei nicht lesbar ist. */
  async indexBauen(bytes: Uint8Array): Promise<boolean> {
    return (await this.#senden({ art: 'index', bytes })).art === 'index';
  }

  async eigenschaften(globalId: string): Promise<Objekteigenschaften | null> {
    const a = await this.#senden({ art: 'eigenschaften', globalId });
    return a.art === 'eigenschaften' ? a.wert : null;
  }

  beenden(): void {
    this.#worker.terminate();
    for (const [nr, f] of this.#offen) f({ nr, art: 'fehler', meldung: 'beendet' });
    this.#offen.clear();
  }
}
