// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X2 (Ticket 118, D-58): die Kette des Bauzeitenplans ohne Oberfläche, mit den Wegen, die die App nimmt. Der Plan aus
// `fixtures/bauzeit.json` (Ticket 112) entsteht wie im Formular aus de-DE-Feldern (`bauzeit/befehle.ts`): Plan anlegen, je
// Vorgang ein `VorgangSetzen` durch `bauzeit` und den echten Speicher (In-Memory-SQLite) → neu laden → Terminrechnung gegen
// alle Sollwerte (Projektbeginn, Projektende, je Vorgang Art und Termine, kritischer Weg, keine Befunde) → Ansicht der App
// (Kopfzeile) → Druckmodell des PDF (Projektende) → Rückgängig und Wiederholen → Gegenprobe ohne Land.
//
// Jede erwartete Zahl steht in der Fixture (von Hand hergeleitet, README der Fixtures, „Bauzeitenplan: Tor X2“), nie aus einem
// Lauf der Pakete. Die Fixture wird gelesen, nicht importiert (A3). Die Kennungen vergibt die App neu; zugeordnet wird über
// die Nummer, die in der Fixture eindeutig ist.

import { readFileSync } from 'node:fs';
import { baueBauzeitenplanModell } from '@tethys/ausgabe';
import { bauzeitenplanBerechnen } from '@tethys/bauzeit';
import type {
  Anordnungsart,
  Bauzeitenplan,
  BauzeitenplanZustand,
  Bundesland,
  VorgangId,
  Wochentag,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befundtexteFuerDruck, planAnsicht } from './bauzeit/ansicht';
import { kopfBefehl, leererVorgangsentwurf, planAnlegenBefehl, vorgangSetzenBefehl } from './bauzeit/befehle';
import { bauzeitenplanSitzung } from './bauzeit/schreiben';
import { befehlswegFuer, projektSitzung } from './lv/befehlsweg';
import { projektAnlegenBefehl } from './projekt/befehle';
import { speicherImSpeicher, testUmgebung } from './testhilfen';

interface FxVorgang {
  readonly id: string;
  readonly nummer: string;
  readonly bezeichnung: string;
  readonly elternId: string | null;
  readonly dauer: number;
  readonly vorgaenger: readonly {
    readonly vorgaengerId: string;
    readonly art: Anordnungsart;
    readonly abstand: number;
  }[];
}
interface FxTermine {
  readonly beginn: string;
  readonly ende: string;
  readonly spaetesterBeginn: string;
  readonly spaetestesEnde: string;
  readonly gesamtpuffer: number;
  readonly freierPuffer: number;
  readonly kritisch: boolean;
}
const fx = JSON.parse(readFileSync(new URL('../../../fixtures/bauzeit.json', import.meta.url), 'utf8')) as {
  readonly plan: {
    readonly name: string;
    readonly projektbeginn: string;
    readonly kalender: { readonly arbeitstage: readonly Wochentag[]; readonly bundesland: Bundesland };
    readonly vorgaenge: readonly FxVorgang[];
  };
  readonly sollwerte: {
    readonly projektbeginn: string;
    readonly projektende: string;
    readonly vorgaenge: readonly { readonly id: string; readonly art: string; readonly termine: FxTermine }[];
    readonly kritischeWege: readonly (readonly string[])[];
    readonly befunde: readonly unknown[];
  };
  readonly gegenprobeOhneLand: { readonly projektende: string };
};

/** Fixture-Datum `2026-11-01` so, wie der Nutzer es tippt. */
const de = (iso: string): string => iso.split('-').reverse().join('.');
const nummerVonFx = new Map(fx.plan.vorgaenge.map((v) => [v.id, v.nummer]));

describe('Tor X2: Bauzeitenplan aus der Fixture über die Wege der App', () => {
  it('angelegt, gespeichert, neu geladen und gerechnet = Soll; Ansicht, PDF-Modell, Undo und Gegenprobe', async () => {
    const speicher = await speicherImSpeicher();
    const u = testUmgebung(speicher);
    const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Lagerhalle', 'Bauherr'));
    if (!p.ok || p.zustand === null) throw new Error('Projekt');
    const projektId = p.zustand.id;

    // 1. Plan anlegen wie im Formular
    const anlegen = planAnlegenBefehl(u.ids, projektId, {
      name: fx.plan.name,
      projektbeginn: de(fx.plan.projektbeginn),
      arbeitstage: fx.plan.kalender.arbeitstage,
      bundesland: fx.plan.kalender.bundesland,
      freieTage: '',
    });
    if (!anlegen.ok) throw new Error('Kopf');
    const sitzung = bauzeitenplanSitzung(u, projektId, null);
    expect((await sitzung.befehl(anlegen.wert)).ok).toBe(true);
    const planId = anlegen.wert.bauzeitenplan.id;

    // 2. Vorgänge in Fixture-Reihenfolge, jeder ein Befehl (und ein Undo-Schritt)
    const neueId = new Map<string, VorgangId>();
    for (const v of fx.plan.vorgaenge) {
      const stand = sitzung.zustand?.bauzeitenplan;
      if (stand === undefined) throw new Error('Plan fehlt');
      const r = vorgangSetzenBefehl(
        stand,
        {
          ...leererVorgangsentwurf(v.elternId === null ? null : (neueId.get(v.elternId) ?? null)),
          bezeichnung: v.bezeichnung,
          nummer: v.nummer,
          dauer: String(v.dauer),
          beziehungen: v.vorgaenger.map((b) => ({
            vorgaengerId: neueId.get(b.vorgaengerId) ?? null,
            art: b.art,
            abstand: String(b.abstand),
          })),
        },
        () => u.ids.vorgang(),
      );
      if (!r.ok) throw new Error(`Vorgang ${v.nummer}: ${r.fehler.map((f) => f.feld).join(', ')}`);
      neueId.set(v.id, r.wert.vorgang.id);
      const a = await sitzung.befehl(r.wert);
      expect(a.ok, v.nummer).toBe(true);
    }

    // 3. Neu laden aus dem Speicher
    const geladen = await speicher.bauzeitenplaene.laden(planId);
    if (!geladen.ok) throw new Error('laden');
    const plan: Bauzeitenplan = geladen.wert.bauzeitenplan;
    const nummer = new Map(plan.vorgaenge.map((v) => [v.id, v.nummer]));
    expect(plan.vorgaenge.map((v) => v.nummer)).toEqual(fx.plan.vorgaenge.map((v) => v.nummer));
    expect(plan.projektbeginn).toBe(fx.plan.projektbeginn);

    // 4. Terminrechnung gegen alle Sollwerte
    const e = bauzeitenplanBerechnen(plan);
    const s = fx.sollwerte;
    expect(e.projektbeginn).toBe(s.projektbeginn);
    expect(e.projektende).toBe(s.projektende);
    expect(
      e.vorgaenge.map((r) => ({ nummer: nummer.get(r.vorgangId), art: r.art, termine: r.termine })),
    ).toEqual(s.vorgaenge.map((r) => ({ nummer: nummerVonFx.get(r.id), art: r.art, termine: r.termine })));
    expect(e.kritischeWege.map((w) => w.map((id) => nummer.get(id)))).toEqual(
      s.kritischeWege.map((w) => w.map((id) => nummerVonFx.get(id))),
    );
    expect(e.befunde).toEqual(s.befunde);

    // 5. Kopfzeile der Planseite und Druckmodell des PDF
    expect(planAnsicht(plan, e, new Set()).kopf).toEqual({
      projektbeginn: de(s.projektbeginn),
      projektende: de(s.projektende),
      kritischerWeg: s.kritischeWege[0]?.map((id) => nummerVonFx.get(id)).join(' → '),
    });
    const modell = baueBauzeitenplanModell({
      plan,
      ergebnis: e,
      befundtexte: befundtexteFuerDruck(plan, e),
      datum: '2026-11-12',
    });
    expect(modell.kopf).toContainEqual({ bezeichnung: 'Projektende', wert: de(s.projektende) });

    // 6. Rückgängig nimmt den letzten Vorgang zurück, Wiederholen stellt ihn her (gespeichert, U7)
    const weg = befehlswegFuer(u);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    const ohne = await speicher.bauzeitenplaene.laden(planId);
    expect(ohne.ok && ohne.wert.bauzeitenplan.vorgaenge.length).toBe(fx.plan.vorgaenge.length - 1);
    expect((await weg.wiederholen()).ok).toBe(true);
    const wieder = await speicher.bauzeitenplaene.laden(planId);
    expect(wieder.ok && wieder.wert.bauzeitenplan).toEqual(plan);

    // 7. Gegenprobe ohne Land über den Kopf (Buß- und Bettag wird Arbeitstag)
    const zustand: BauzeitenplanZustand = { bauzeitenplan: plan };
    const ohneLand = kopfBefehl({
      name: plan.name,
      projektbeginn: de(plan.projektbeginn),
      arbeitstage: plan.kalender.arbeitstage,
      bundesland: null,
      freieTage: '',
    });
    if (!ohneLand.ok) throw new Error('Kopf');
    const k = await bauzeitenplanSitzung(u, projektId, zustand).befehl(ohneLand.wert);
    if (!k.ok || k.zustand === null) throw new Error('KopfSetzen');
    expect(bauzeitenplanBerechnen(k.zustand.bauzeitenplan).projektende).toBe(
      fx.gegenprobeOhneLand.projektende,
    );
  });
});
