// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 116: das LV `typisch` nach der Mengenübernahme mit `haus-v1` (D-99.12): die Zuordnungen aus `typisch-bim.json`
// (D-52) an den Positionen und die Vordersätze laut v1 als Ansatz samt Menge. Reine Daten für den Testpfad (E2E) und
// Vitest; die Summen rechnet der Kern beim `LeistungsverzeichnisAnlegen`. Dazu die Sollwerte des Vergleichs v1 → v2.

import { readFileSync } from 'node:fs';
import type { Ansatzzeile, IfcGlobalId, LvInhalt, Menge } from '@tethys/vertrag';
import { fixtureInhalt } from './fixture-inhalt';

interface FxAnsatzzeile {
  readonly zeile: string;
  readonly formel: string;
  readonly ausdruck: string;
  readonly variable: string | null;
}

interface FxVordersatz {
  readonly positionId: string;
  readonly oz: string;
  readonly mengenansatz: readonly FxAnsatzzeile[];
  readonly menge: string;
}

interface FxBauteil {
  readonly globalId: string;
  readonly kennung: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
}

export interface BimSoll {
  readonly bauteile: { readonly v1: readonly FxBauteil[]; readonly v2: readonly FxBauteil[] };
  readonly zuordnungen: readonly {
    readonly positionId: string;
    readonly oz: string;
    readonly bauteile: readonly { readonly globalId: string; readonly mengenart: string }[];
  }[];
  readonly kern: {
    readonly vordersaetze: readonly FxVordersatz[];
    readonly sollwerte: { readonly summen: Record<string, string> };
  };
  readonly erweitert: {
    readonly vergleich: {
      readonly hinzugefuegt: readonly FxBauteil[];
      readonly entfernt: readonly FxBauteil[];
      readonly geaendert: readonly {
        readonly globalId: string;
        readonly kennung: string;
        readonly felder: readonly string[];
        readonly name?: { readonly vorher: string; readonly nachher: string };
        readonly strukturknoten?: { readonly vorher: string; readonly nachher: string };
        readonly mengen?: readonly {
          readonly name: string;
          readonly vorher: string;
          readonly nachher: string;
        }[];
      }[];
    };
    readonly betroffenePositionen: readonly {
      readonly positionId: string;
      readonly oz: string;
      readonly vorher: string;
      readonly nachher: string;
      readonly differenz: string;
    }[];
    readonly mengenAktualisieren: {
      readonly vordersaetze: readonly FxVordersatz[];
      readonly befunde: readonly {
        readonly positionId: string;
        readonly art: string;
        readonly globalId: string;
      }[];
      readonly sollwerte: { readonly summen: Record<string, string> };
    };
  };
}

export const BIM_SOLL = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-bim.json', import.meta.url), 'utf8'),
) as BimSoll;

export const ansatz = (zeilen: readonly FxAnsatzzeile[]): Ansatzzeile[] =>
  zeilen.map((z) => ({
    zeile: Number(z.zeile),
    formel: Number(z.formel),
    ausdruck: z.ausdruck,
    variable: z.variable,
  }));

/** `typisch` mit den sieben Zuordnungen und den Vordersätzen laut v1 (LV nach der Übernahme, Netto 36.068,86). */
export function typischNachUebernahme(): LvInhalt {
  const inhalt = fixtureInhalt('typisch');
  const zuordnung = new Map(BIM_SOLL.zuordnungen.map((z) => [z.positionId, z.bauteile]));
  const vordersatz = new Map(BIM_SOLL.kern.vordersaetze.map((v) => [v.positionId, v]));
  return {
    ...inhalt,
    knoten: inhalt.knoten.map((k) => {
      if (k.art !== 'position') return k;
      const b = zuordnung.get(k.id);
      const v = vordersatz.get(k.id);
      if (b === undefined || v === undefined) return k;
      return {
        ...k,
        bauteile: b.map((x) => ({ globalId: x.globalId as IfcGlobalId, mengenart: x.mengenart })),
        mengenansatz: ansatz(v.mengenansatz),
        menge: v.menge as Menge,
      };
    }),
  };
}
