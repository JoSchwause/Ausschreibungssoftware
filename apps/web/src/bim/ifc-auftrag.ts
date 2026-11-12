// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Arbeit des IFC-Workers (Ticket 114): Modell lesen und abbilden, Eigenschaftsindex bauen und abfragen (`ifc`, D-51). Ohne
// Worker-API, damit Vitest es unter Node prüft; `ifc-worker.ts` hängt es an `onmessage`.

import { bauwerksmodellLesen, eigenschaftsindexBauen, globalIdLesen } from '@tethys/ifc';
import type { BauwerksmodellLesung, Eigenschaftsindex, Objekteigenschaften } from '@tethys/ifc';
import type { BauwerksmodellKopf } from '@tethys/vertrag';

export type IfcAuftrag =
  | {
      readonly nr: number;
      readonly art: 'lesen';
      readonly bytes: Uint8Array;
      readonly kopf: Omit<BauwerksmodellKopf, 'schema'>;
    }
  | { readonly nr: number; readonly art: 'index'; readonly bytes: Uint8Array }
  | { readonly nr: number; readonly art: 'eigenschaften'; readonly globalId: string };

export type IfcAntwort =
  | { readonly nr: number; readonly art: 'gelesen'; readonly lesung: BauwerksmodellLesung }
  | { readonly nr: number; readonly art: 'index' }
  | { readonly nr: number; readonly art: 'eigenschaften'; readonly wert: Objekteigenschaften | null }
  | { readonly nr: number; readonly art: 'fehler'; readonly meldung: string };

export class IfcBearbeiter {
  #index: Eigenschaftsindex | null = null;

  bearbeite(a: IfcAuftrag): IfcAntwort {
    switch (a.art) {
      case 'lesen':
        return { nr: a.nr, art: 'gelesen', lesung: bauwerksmodellLesen(a.bytes, a.kopf) };
      case 'index': {
        const r = eigenschaftsindexBauen(a.bytes);
        if (!r.ok) return { nr: a.nr, art: 'fehler', meldung: r.fehler.meldung };
        this.#index = r.wert;
        return { nr: a.nr, art: 'index' };
      }
      case 'eigenschaften': {
        if (this.#index === null) return { nr: a.nr, art: 'fehler', meldung: 'kein Index' };
        const g = globalIdLesen(a.globalId);
        return { nr: a.nr, art: 'eigenschaften', wert: g.ok ? this.#index.eigenschaften(g.wert) : null };
      }
    }
  }
}
