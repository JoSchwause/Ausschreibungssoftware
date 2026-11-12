// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: die M4-Fixture (`fixtures/typisch-abrechnung.json`, Ticket 85) in der Form des Vertrags, für Vitest und die
// E2E der Rechnungen. Reine Daten, keine Rechnung: Die Sollwerte der Abzugskette hat Ticket 85 unabhängig hergeleitet.
// Die Kennungen von Projekt und Auftrags-LV vergibt die App; Blätter und Nachtragsknoten werden darauf umgeschrieben.

import { readFileSync } from 'node:fs';
import type {
  Ansatzzeile,
  Aufmass,
  Aufmassposition,
  AuftragsLeistungsverzeichnisId,
  Einheitspreis,
  ElternId,
  Knoten,
  LeistungsverzeichnisId,
  Menge,
  Ordnungszahl,
  PositionId,
  ProjektId,
  TitelId,
} from '@tethys/vertrag';

interface FxKnoten {
  readonly id: string;
  readonly parentId: string;
  readonly art: 'titel' | 'position';
  readonly ordnungszahl: string;
  readonly kurztext: string;
  readonly langtext?: string;
  readonly menge?: string;
  readonly einheit?: string;
  readonly einheitspreis?: string;
}

/** Die Kette einer Prüfung, wie die Fixture sie nennt (Beträge kanonisch, `1234.56`). */
export interface FxKette {
  readonly leistung: string;
  readonly nachlass: string;
  readonly nettoNachNachlass: string;
  readonly mwst: string;
  readonly bruttoKumuliert: string;
  readonly umlagen: readonly {
    readonly bezeichnung: string;
    readonly satz: string;
    readonly betrag: string;
  }[];
  readonly einbehalt: string;
  readonly fruehereZahlbetraege: string;
  readonly zahlbetrag: string;
}

/** Ein Blatt in der Form der Fixture: ganze Zahlen als Text (D-85.4). */
interface FxAufmass extends Omit<Aufmass, 'nummer' | 'positionen'> {
  readonly nummer: string;
  readonly positionen: readonly (Omit<Aufmassposition, 'mengenansatz'> & {
    readonly mengenansatz:
      | readonly (Omit<Ansatzzeile, 'zeile' | 'formel'> & {
          readonly zeile: string;
          readonly formel: string;
        })[]
      | null;
  })[];
}

interface FxRechnung {
  readonly nummer: string;
  readonly eingang: string;
  readonly rechnungsnummerAuftragnehmer: string;
  readonly umlagen: readonly { readonly bezeichnung: string; readonly satz: string }[];
  readonly sicherheitSatz: string | null;
}

interface Fx {
  readonly auftragsLvIdFixture: string;
  readonly zuschlag: { readonly bieterName: string; readonly auftragsLvId: string };
  readonly nachtrag: {
    readonly uebernahme: {
      readonly nachtragLvId: string;
      /** Stelle der neuen Gliederung auf der obersten Ebene (Text, D-85.4). */
      readonly gliederungReihenfolge: string;
      readonly knoten: readonly FxKnoten[];
    };
  };
  readonly aufmasse: readonly { readonly aufmass: FxAufmass }[];
  readonly rechnungen: readonly FxRechnung[];
  readonly pruefungen: Readonly<
    Record<'ar1' | 'ar2VorKorrektur' | 'ar2NachKorrektur', { readonly kette: FxKette }>
  >;
}

const fx = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-abrechnung.json', import.meta.url), 'utf8'),
) as Omit<Fx, 'auftragsLvIdFixture'>;

/** Bieter des Zuschlags (D-85.1: Bieter B, 3,00 % Nachlass, keine Wahl). */
export const M4_BIETER = fx.zuschlag.bieterName;
/** Die Rechnungen der Fixture (Angaben und Abzüge, wie der Prüfer sie erfasst). */
export const M4_RECHNUNGEN = fx.rechnungen;
/** Sollwerte der Abzugskette (Ticket 85). */
export const M4_PRUEFUNGEN = fx.pruefungen;
/** Das Nachtrags-LV der Übernahme (nur für das Protokoll; der Kern prüft es nicht). */
export const M4_NACHTRAG_LV = fx.nachtrag.uebernahme.nachtragLvId as LeistungsverzeichnisId;

/** Die Knoten des Nachtrags N01 unter dem Auftrags-LV `auftragsLvId` (Vertragsform), ans Ende der obersten Ebene. */
export function m4Nachtragsknoten(auftragsLvId: AuftragsLeistungsverzeichnisId): Knoten[] {
  const folge = new Map<string, number>([
    [auftragsLvId, Number(fx.nachtrag.uebernahme.gliederungReihenfolge)],
  ]);
  return fx.nachtrag.uebernahme.knoten.map((k): Knoten => {
    const eltern = k.parentId === fx.zuschlag.auftragsLvId ? auftragsLvId : k.parentId;
    const reihenfolge = folge.get(eltern) ?? 0;
    folge.set(eltern, reihenfolge + 1);
    const lage = { elternId: eltern as ElternId, reihenfolge };
    const ordnungszahl = k.ordnungszahl as Ordnungszahl;
    if (k.art === 'titel')
      return { ...lage, art: 'titel', id: k.id as TitelId, ordnungszahl, kurztext: k.kurztext };
    return {
      ...lage,
      art: 'position',
      id: k.id as PositionId,
      ordnungszahl,
      ozIndex: null,
      merkmale: {
        bedarf: null,
        wahl: null,
        stundenlohn: false,
        pauschal: false,
        zuschlagskennzeichen: false,
      },
      zuschlag: null,
      kurztext: k.kurztext,
      langtext: [],
      menge: (k.menge ?? null) as Menge | null,
      einheit: k.einheit ?? null,
      einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
      epa: null,
    };
  });
}

/** Aufmaßblatt `i` (0: Blatt 1) der Fixture für Projekt und Auftrags-LV der App. */
export function m4Blatt(
  i: number,
  projektId: ProjektId,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): Aufmass {
  const a = fx.aufmasse[i]?.aufmass;
  if (a === undefined) throw new Error(`Fixture: kein Blatt ${String(i)}`);
  // Ganze Zahlen stehen in der Fixture als Text (D-85.4): Nummer, Zeile und Formel.
  const positionen = a.positionen.map((p) => ({
    ...p,
    mengenansatz:
      p.mengenansatz === null
        ? null
        : p.mengenansatz.map((z) => ({ ...z, zeile: Number(z.zeile), formel: Number(z.formel) })),
  }));
  return { ...a, nummer: Number(a.nummer), projektId, auftragsLvId, positionen };
}
