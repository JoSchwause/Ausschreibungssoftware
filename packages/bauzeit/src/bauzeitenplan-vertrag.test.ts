// SPDX-License-Identifier: AGPL-3.0-or-later
// Terminrechnung an den Vertragstypen v1.6 (Ticket 109 Punkt 1, D-97.10): Eingabe ist der gespeicherte `Bauzeitenplan`,
// Ergebnis das `Bauzeitenplanergebnis` des Vertrags (je Vorgang `vorgangId`). Sollwerte aus unabhängigen Quellen: das
// Beispiel des Vertrags (Ticket 97, von Hand hergeleitet) und die Fixture des Tors X2 (Ticket 112, von Hand hergeleitet und
// im Selbsttest der Fixtures eigens nachgerechnet).

import { readFileSync } from 'node:fs';
import type {
  Bauzeitenplan,
  Bauzeitenplanergebnis as VertragsErgebnis,
  Kalenderdatum,
  Vorgangstermine as VertragsTermine,
} from '@tethys/vertrag';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { beispielBauzeitenplan, beispielBauzeitenplanergebnis } from '../../vertrag/src/beispiele';
import type { Bauzeitenplaneingabe } from './index';
import { bauzeitenplanBerechnen } from './index';

interface Fixture {
  readonly plan: Bauzeitenplan;
  readonly sollwerte: {
    readonly projektbeginn: string;
    readonly projektende: string;
    readonly vorgaenge: readonly {
      readonly vorgangId: string;
      readonly art: string;
      readonly termine: VertragsTermine;
    }[];
    readonly kritischeWege: readonly (readonly string[])[];
    readonly befunde: readonly unknown[];
  };
  readonly gegenprobeOhneLand: {
    readonly kalender: Bauzeitenplan['kalender'];
    readonly projektende: string;
    readonly geaendert: readonly ({ readonly nummer: string } & Partial<VertragsTermine>)[];
  };
}
const FIXTURE = JSON.parse(
  readFileSync(new URL('../../../fixtures/bauzeit.json', import.meta.url), 'utf8'),
) as Fixture;

describe('Vertragstypen (v1.6)', () => {
  it('nimmt den gespeicherten Bauzeitenplan als Eingabe und liefert das Ergebnis des Vertrags', () => {
    expectTypeOf<Bauzeitenplan>().toExtend<Bauzeitenplaneingabe>();
    expectTypeOf(bauzeitenplanBerechnen).returns.toExtend<VertragsErgebnis>();
    // Die Daten des Ergebnisses sind geprüfte Daten (D-102.5): die App gibt sie ohne Prüfung an die Zeitachse weiter.
    expectTypeOf(bauzeitenplanBerechnen).returns.toHaveProperty('projektende').toEqualTypeOf<Kalenderdatum | null>();
  });

  it('Beispiel des Vertrags: Rohbau mit Sammelvorgang, Bezug und Ist-Terminen (Ticket 97, D-63)', () => {
    expect(bauzeitenplanBerechnen(beispielBauzeitenplan)).toEqual(beispielBauzeitenplanergebnis);
  });
});

describe('Fixture des Tors X2 (fixtures/bauzeit.json, Ticket 112)', () => {
  const soll = FIXTURE.sollwerte;

  it('Sollwerte: Termine, Puffer, kritischer Weg, keine Befunde', () => {
    const e = bauzeitenplanBerechnen(FIXTURE.plan);
    expect(e).toEqual({
      projektbeginn: soll.projektbeginn,
      projektende: soll.projektende,
      // Die Fixture steht in der Form des Vertrags v1.6 (`vorgangId`, D-97.10; Ticket 122, PB4).
      vorgaenge: soll.vorgaenge,
      kritischeWege: soll.kritischeWege,
      befunde: soll.befunde,
    });
  });

  it('Gegenprobe ohne Land: der Buß- und Bettag ist Arbeitstag, ab ihm liegt alles einen Kalendertag früher', () => {
    const gegen = FIXTURE.gegenprobeOhneLand;
    const e = bauzeitenplanBerechnen({ ...FIXTURE.plan, kalender: gegen.kalender });
    expect(e.projektende).toBe(gegen.projektende);
    const nachNummer = new Map(FIXTURE.plan.vorgaenge.map((v, i) => [v.nummer, i]));
    const erwartet = soll.vorgaenge.map((v) => v.termine);
    for (const { nummer, ...aenderung } of gegen.geaendert) {
      const i = nachNummer.get(nummer) ?? -1;
      erwartet[i] = { ...(erwartet[i] as VertragsTermine), ...aenderung };
    }
    expect(e.vorgaenge.map((v) => v.termine)).toEqual(erwartet);
    expect(e.kritischeWege).toEqual(soll.kritischeWege);
  });
});
