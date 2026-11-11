// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Test der Kostenkontrolle gegen die Sollwerte des Tors M4 (Ticket 82, D-38; Fixture `typisch-abrechnung.json`
// aus Ticket 85, Herleitung im README der Fixtures, „M4-Abrechnung“). Eingaben: die Kostenberechnung als Budget, das
// Auftrags-LV nach Zuschlag und Nachtrag (Positionssummen und Gesamtsummen aus `nachtrag.sollwerte`, Kostengruppen aus
// `positionen`) und der Leistungsstand von AR 2 nach der Korrektur. Lesart der leeren Zellen: D-85.3 schreibt für
// „ohne Kostengruppe“ und „Nachlass“ Budget 0,00, die Kostenkontrolle `null` („ohne Budget“, D-37, D-82.5); die Zahlen
// sind dieselben.

import { readFileSync } from 'node:fs';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  Gesamtsummen,
  Kostenermittlung,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  Leistungsstand,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kostenkontrolleBerechnen } from './index';
import type { Kostenkontrollwerte } from './index';

interface Zeile {
  readonly budget: string;
  readonly vergabe: string;
  readonly abrechnung: string;
  readonly abweichung: string;
}
interface Fixture {
  readonly projektId: string;
  readonly zuschlag: { readonly auftragsLvId: string };
  readonly positionen: readonly { readonly positionId: string; readonly kostengruppe?: string }[];
  readonly nachtrag: {
    readonly sollwerte: {
      readonly positionen: Readonly<
        Record<string, { readonly gp: string | null; readonly inSumme: boolean }>
      >;
      readonly summen: Gesamtsummen;
    };
  };
  readonly kostenermittlung: Kostenermittlung;
  readonly pruefungen: { readonly ar2NachKorrektur: { readonly leistungsstand: Leistungsstand } };
  readonly kostenkontrolle: {
    readonly zeilen: readonly (Zeile & { readonly kostengruppe: string })[];
    readonly ohneKostengruppe: Zeile;
    readonly nachlass: Zeile;
    readonly gesamt: Zeile;
  };
}

const f = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-abrechnung.json', import.meta.url), 'utf8'),
) as Fixture;

const auftragsLvId = f.zuschlag.auftragsLvId as AuftragsLeistungsverzeichnisId;
const auftrag: AuftragsLvZustand = {
  auftragsLeistungsverzeichnis: {
    id: auftragsLvId,
    projektId: f.projektId as AuftragsLvZustand['auftragsLeistungsverzeichnis']['projektId'],
    leistungsverzeichnisId: 'lv' as LeistungsverzeichnisId,
    angebotId: 'angebot' as AngebotId,
    name: 'Auftrags-LV',
    ozMaske: {
      gliederung: [],
      position: { laenge: 4, zeichen: 'numerisch' },
      index: null,
      trennzeichen: null,
    },
    mwstSatz: '19.00' as Prozent,
    nachlass: null,
    knoten: f.positionen.map((p, i) => ({
      art: 'position',
      id: p.positionId as PositionId,
      elternId: auftragsLvId,
      reihenfolge: i,
      ordnungszahl: null,
      ozIndex: null,
      merkmale: {
        bedarf: null,
        wahl: null,
        stundenlohn: false,
        pauschal: false,
        zuschlagskennzeichen: false,
      },
      zuschlag: null,
      kurztext: '',
      langtext: [],
      menge: null,
      einheit: null,
      einheitspreis: null,
      epa: null,
      ...(p.kostengruppe === undefined ? {} : { kostengruppe: p.kostengruppe as Kostengruppennummer }),
    })),
  },
  summen: {
    positionen: Object.entries(f.nachtrag.sollwerte.positionen).map(([id, s]) => ({
      positionId: id as PositionId,
      gesamtpreis: s.gp === null ? null : (s.gp as Betrag),
      gehtInSummeEin: s.inSumme,
    })),
    gliederungen: [],
    gesamt: f.nachtrag.sollwerte.summen,
  },
};

const werte = (z: Kostenkontrollwerte): Zeile => ({
  budget: z.budget ?? '0.00',
  vergabe: z.vergabe,
  abrechnung: z.abrechnung,
  abweichung: z.abweichung ?? '',
});

describe('Kostenkontrolle: Sollwerte des Tors M4', () => {
  const r = kostenkontrolleBerechnen({
    budget: f.kostenermittlung,
    auftraege: [auftrag],
    leistungsstaende: [{ auftragsLvId, leistungsstand: f.pruefungen.ar2NachKorrektur.leistungsstand }],
  });

  it('Zeilen je Kostengruppe wie in der Fixture', () => {
    expect(r.kostengruppen.map((z) => ({ kostengruppe: z.nummer, ...werte(z) }))).toEqual(
      f.kostenkontrolle.zeilen,
    );
  });

  it('„ohne Kostengruppe“, „Nachlass“ (ohne Budget) und Gesamt wie in der Fixture', () => {
    expect(r.ohneKostengruppe.budget).toBeNull();
    expect(r.nachlass.budget).toBeNull();
    expect(werte(r.ohneKostengruppe)).toEqual(f.kostenkontrolle.ohneKostengruppe);
    expect(werte(r.nachlass)).toEqual(f.kostenkontrolle.nachlass);
    expect(werte(r.gesamt)).toEqual(f.kostenkontrolle.gesamt);
  });

  it('keine Befunde: jede Kostengruppe der Positionen liegt im Budget, die Summen gehen auf', () => {
    expect(r.befunde).toEqual([]);
  });
});
