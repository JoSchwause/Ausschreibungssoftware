// SPDX-License-Identifier: AGPL-3.0-or-later
// Roundtrip Export → Import → Modell (Q3, Ticket 40, D-18): für jede Fixture und jede Phase und für die Inhalte, die
// der Leser aus den amtlichen 3.3-Dateien X81/X83 liest. Seams: `schreibeGaeb` und `leseGaeb`.
//
// Verglichen wird das Ausgangsmodell mit normierten Kennungen (zählende IdQuelle in Dokumentreihenfolge, wie der
// Leser sie vergibt) gegen das wieder gelesene Modell, und zwar ganz: Erlaubt ist nur, was die Phase nicht trägt
// (`phasenform`), und die ausdrücklich gelisteten Unterschiede je Fixture und Position
// (`testdaten/roundtrip-unterschiede.json`). Jeder andere Unterschied lässt den Test scheitern, ebenso ein gelisteter, der
// nicht (mehr) eintritt. Der zweite Export des wieder gelesenen Modells ist byte-gleich dem ersten. M2 gilt damit als
// „erfüllt mit gelisteten Unterschieden“ (D-18). Seit Ticket 51 tragen die Fixtures ihre Zuschlagspositionen in GAEB-Form;
// die Einträge der Altform sind aus der Liste verschwunden, übrig sind die Wahlpositionen ohne Gruppe und Variante. Seit
// Ticket 73 behält eine Wahlgruppe im Rundweg ihre Grundposition: Diese steht als Variante 0 in der Liste, der Verweis
// der Alternative ist kein Unterschied mehr.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LvInhalt, Position } from '@tethys/vertrag';
import { leseGaeb, schreibeGaeb } from './index';
import type { ExportPhase, ExportVersion } from './index';
import {
  AMTLICH_LESBAR,
  FIXTURES,
  amtlichLv,
  exportInhalt,
  exportOptionen,
  fixtureLv,
  mitKostengruppen,
  normiereKennungen,
  ohneAuftragnehmer,
  testIds,
} from './testhilfen';
import type { FixtureName, Normiert } from './testhilfen';

/**
 * Ein erwarteter Unterschied an einer Position, benannt über ihre OZ mit Index. Die Fixtures tragen keine Gruppen- und
 * Variantennummern (Fixture-Format, README A3), GAEB kennt eine Wahl aber nur über sie; der Writer vergibt sie (D-16):
 * - `wahl-nummer-kuenstlich`: Wahlposition ohne Gruppe und Variante (aus v1) kommt mit diesen Nummern zurück. Ihren
 *   Verweis auf die Grundposition behält sie, wenn die Liste die Grundposition als Variante 0 derselben Gruppe nennt
 *   (der Leser ordnet über die Gruppennummer zu, Ticket 22); sonst geht er verloren.
 * - `grundposition-nummer-kuenstlich`: Grundposition ohne eigene Wahl kommt als Variante 0 dieser Gruppe zurück
 *   (Ticket 73; Summen gleich, Variante 0 geht ins Netto).
 * Die Altform der Zuschlagsposition (`altform-zuschlag`) steht seit Ticket 51 in keiner Fixture mehr (Fixture-Format,
 * mechanisch); ihren Export prüft `schreiben.test.ts` an einem eigenen LV.
 */
interface Unterschied {
  readonly oz: string;
  readonly art: 'wahl-nummer-kuenstlich' | 'grundposition-nummer-kuenstlich';
  readonly gruppe: number;
  readonly variante: number;
}

const UNTERSCHIEDE = JSON.parse(
  readFileSync(new URL('../testdaten/roundtrip-unterschiede.json', import.meta.url), 'utf8'),
) as Readonly<Record<FixtureName, readonly Unterschied[]>>;

const ozVon = (p: Position): string => `${p.ordnungszahl ?? ''}${p.ozIndex ?? ''}`;

/**
 * Was die Phase überhaupt trägt (kein Unterschied des Modells, sondern die Form der Phase): X81/X83 haben keine Preise
 * (EP, Anteile, Zuschlagssatz, Nachlass) und keinen Auftragnehmer; X86 schreibt einen fehlenden Auftraggeber leer (OWN ist
 * Pflicht). Ein X86 mit Anteilen aus einem LV ohne EPA-Bezeichnungen trägt die feste Belegung des Writers ausdrücklich
 * (`LblUPComp1…6`); der Leser liest sie als `epaBezeichnungen`, die Bezeichnung des freien Anteils steht dann dort statt an
 * der Position (D-53.6: „Feld fehlt = feste Belegung“, gleiche Bedeutung, ausdrückliche Form; v1.3, Ticket 68).
 */
function phasenform(inhalt: LvInhalt, phase: ExportPhase): LvInhalt {
  const x86 = phase === 'X86';
  const positionen = inhalt.knoten.filter((k): k is Position => k.art === 'position');
  const festeBelegung =
    x86 && inhalt.epaBezeichnungen === undefined && positionen.some((p) => p.epa !== null);
  const frei = positionen.find((p) => p.epa?.freiBezeichnung != null)?.epa?.freiBezeichnung ?? null;
  const knoten = inhalt.knoten.map((k) => {
    if (k.art !== 'position') return k;
    // Die Textquelle (v1.4) hat in keiner Phase ein Gegenstück: Der Writer verwirft sie mit Warnung (Ticket 84).
    const ohneTextquelle: Position = { ...k };
    Reflect.deleteProperty(ohneTextquelle, 'textquelle');
    if (x86)
      return festeBelegung && k.epa !== null
        ? { ...ohneTextquelle, epa: { ...k.epa, freiBezeichnung: null } }
        : ohneTextquelle;
    const p: Position = { ...ohneTextquelle, einheitspreis: null, epa: null };
    return p.zuschlag === null ? p : { ...p, zuschlag: { ...p.zuschlag, prozentsatz: null } };
  });
  // X81/X83 kennen kein CTR: Der Auftragnehmer wird mit Warnung verworfen (v1.3, Ticket 68).
  return {
    ...(x86 ? inhalt : ohneAuftragnehmer(inhalt)),
    knoten,
    ...(x86 ? {} : { nachlass: null }),
    ...(x86 && inhalt.auftraggeber === undefined
      ? { auftraggeber: { name: null, strasse: null, plz: null, ort: null, vergabenummer: null } }
      : {}),
    ...(festeBelegung
      ? {
          epaBezeichnungen: [
            { nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' },
            { nummer: 2, anteil: 'stoffe', bezeichnung: 'Stoffe' },
            { nummer: 3, anteil: 'geraete', bezeichnung: 'Geräte' },
            { nummer: 4, anteil: 'nachunternehmer', bezeichnung: 'Nachunternehmer' },
            { nummer: 5, anteil: 'sonstiges', bezeichnung: 'Sonstiges' },
            { nummer: 6, anteil: 'frei', bezeichnung: frei },
          ],
        }
      : {}),
  };
}

/**
 * Wendet einen gelisteten Unterschied an; passt er nicht zur Position, ist die Liste falsch. `grund` ist der Eintrag der
 * Grundposition, auf die eine Wahlposition verweist.
 */
function wende(p: Position, u: Unterschied, grund: Unterschied | undefined): Position {
  const w = p.merkmale.wahl;
  if (u.art === 'grundposition-nummer-kuenstlich') {
    expect(w, `${u.oz}: Grundposition mit eigener Wahl`).toBeNull();
    expect(u.variante, `${u.oz}: Grundposition nicht Variante 0`).toBe(0);
    return {
      ...p,
      merkmale: { ...p.merkmale, wahl: { gruppe: u.gruppe, variante: 0, grundpositionId: null } },
    };
  }
  expect(u.art, `${u.oz}: unbekannte Art`).toBe('wahl-nummer-kuenstlich');
  expect(w !== null && (w.gruppe === null || w.variante === null), `${u.oz}: keine Wahl ohne Nummer`).toBe(
    true,
  );
  const verweis =
    grund?.art === 'grundposition-nummer-kuenstlich' && grund.gruppe === u.gruppe
      ? (w?.grundpositionId ?? null)
      : null;
  return {
    ...p,
    merkmale: { ...p.merkmale, wahl: { gruppe: u.gruppe, variante: u.variante, grundpositionId: verweis } },
  };
}

/** Das erwartete wieder gelesene Modell: Phasenform des Ausgangsmodells mit genau den gelisteten Unterschieden. */
function erwartet(inhalt: LvInhalt, phase: ExportPhase, liste: readonly Unterschied[]): LvInhalt {
  const nachOz = new Map(liste.map((u) => [u.oz, u]));
  expect(nachOz.size, 'jede OZ höchstens einmal in der Liste').toBe(liste.length);
  const ozJeId = new Map(
    inhalt.knoten.filter((k): k is Position => k.art === 'position').map((p) => [p.id as string, ozVon(p)]),
  );
  const getroffen: string[] = [];
  const knoten = inhalt.knoten.map((k) => {
    const u = k.art === 'position' ? nachOz.get(ozVon(k)) : undefined;
    if (k.art !== 'position' || u === undefined) return k;
    getroffen.push(u.oz);
    const grundId = k.merkmale.wahl?.grundpositionId ?? null;
    return wende(k, u, grundId === null ? undefined : nachOz.get(ozJeId.get(grundId) ?? ''));
  });
  expect(getroffen.sort(), 'jede gelistete OZ gibt es im LV').toEqual([...nachOz.keys()].sort());
  return phasenform({ ...inhalt, knoten }, phase);
}

function rundweg(
  n: Normiert,
  phase: ExportPhase,
  version: ExportVersion,
): { erster: string; zweiter: string; gelesen: LvInhalt | null } {
  const opt = exportOptionen(phase, version, n);
  const erster = schreibeGaeb(exportInhalt(phase, n), opt);
  const l = leseGaeb(erster.xml, { ids: testIds(), standardMwstSatz: n.inhalt.mwstSatz });
  expect(l.phase).toBe(phase);
  expect(l.version).toBe(version);
  expect(l.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
  const gelesen = l.inhalt;
  const zweiter = gelesen === null ? '' : schreibeGaeb(gelesen, opt).xml;
  return { erster: erster.xml, zweiter, gelesen };
}

const PHASEN: readonly ExportPhase[] = ['X81', 'X83', 'X86'];

describe('Roundtrip der Fixtures', () => {
  it('die Liste der Unterschiede nennt genau die Fixtures', () => {
    expect(Object.keys(UNTERSCHIEDE).sort()).toEqual([...FIXTURES].sort());
  });

  for (const name of FIXTURES)
    for (const phase of PHASEN)
      for (const version of ['3.3', '3.2'] as const)
        it(`${name} als ${phase} ${version}: Modell gleich bis auf die erwarteten Unterschiede, zweiter Export byte-gleich`, () => {
          const { inhalt, summen, basen } = fixtureLv(name);
          const n = normiereKennungen(inhalt, summen, basen);
          const r = rundweg(n, phase, version);
          expect(r.gelesen).toEqual(erwartet(exportInhalt(phase, n), phase, UNTERSCHIEDE[name]));
          expect(r.zweiter).toBe(r.erster);
        });
});

describe('Kostengruppen im Rundweg (Ticket 84)', () => {
  for (const phase of PHASEN)
    for (const version of ['3.3', '3.2'] as const)
      it(`typisch mit Kostengruppen als ${phase} ${version}: jede Kostengruppe kommt zurück`, () => {
        const { inhalt, summen, basen } = fixtureLv('typisch');
        const n = normiereKennungen(mitKostengruppen(inhalt), summen, basen);
        // 25 Positionen (fixtures/typisch.json), die 1., 3., … 25. mit Kostengruppe.
        expect(
          n.inhalt.knoten.filter((k) => k.art === 'position' && k.kostengruppe !== undefined).length,
        ).toBe(13);
        const r = rundweg(n, phase, version);
        expect(r.gelesen).toEqual(erwartet(exportInhalt(phase, n), phase, UNTERSCHIEDE.typisch));
        expect(r.zweiter).toBe(r.erster);
      });
});

describe('Textquelle im Rundweg: bekannte Ausnahme (Ticket 84)', () => {
  for (const phase of PHASEN)
    it(`typisch mit Textquelle als ${phase}: die Textquelle entfällt mit Warnung, sonst gleich`, () => {
      const { inhalt, summen, basen } = fixtureLv('typisch');
      const knoten = inhalt.knoten.map((k) => (k.art === 'position' ? { ...k, textquelle: 'Muster-LV' } : k));
      const n = normiereKennungen({ ...inhalt, knoten }, summen, basen);
      const opt = exportOptionen(phase, '3.3', n);
      const e = schreibeGaeb(exportInhalt(phase, n), opt);
      expect(e.befunde.filter((b) => b.meldung.startsWith('Textquelle der Position'))).toHaveLength(1);
      const r = rundweg(n, phase, '3.3');
      expect(r.gelesen).toEqual(erwartet(exportInhalt(phase, n), phase, UNTERSCHIEDE.typisch));
    });
});

describe('Wahlgruppe im Rundweg (Ticket 73)', () => {
  // `typisch` hat eine Wahlgruppe aus v1: 02.0070 A ist die Alternative zu 02.0070, beide ohne Gruppe und Variante.
  // GAEB kennt die Zuordnung nur über die Gruppennummer; Variante 0 ist die Grundausführung (FD 4.5.2, Ticket 22).
  // Die Fixture hat keine belegte Gruppe, also ist die künstliche Gruppe 1 (D-16).
  for (const phase of PHASEN)
    it(`typisch als ${phase}: die Wahlgruppe kommt mit ihrer Grundposition zurück`, () => {
      const { inhalt, summen, basen } = fixtureLv('typisch');
      const n = normiereKennungen(inhalt, summen, basen);
      const xml = schreibeGaeb(exportInhalt(phase, n), exportOptionen(phase, '3.3', n)).xml;
      const l = leseGaeb(xml, { ids: testIds(), standardMwstSatz: n.inhalt.mwstSatz });
      expect(l.befunde.map((b) => b.code)).not.toContain('wahl-ohne-grundposition');
      const nachOz = new Map(
        (l.inhalt?.knoten ?? []).filter((k): k is Position => k.art === 'position').map((p) => [ozVon(p), p]),
      );
      const grund = nachOz.get('02.0070');
      expect(grund?.merkmale.wahl).toEqual({ gruppe: 1, variante: 0, grundpositionId: null });
      expect(nachOz.get('02.0070A')?.merkmale.wahl).toEqual({
        gruppe: 1,
        variante: 1,
        grundpositionId: grund?.id,
      });
    });
});

describe('Roundtrip der amtlichen Dateien (Inhalt des Lesers)', () => {
  for (const a of AMTLICH_LESBAR)
    for (const phase of ['X81', 'X83'] as const)
      it(`${a.name} als ${phase} 3.3`, () => {
        const n = amtlichLv(a.pfad);
        const r = rundweg(n, phase, '3.3');
        expect(r.gelesen).toEqual(erwartet(exportInhalt(phase, n), phase, []));
        expect(r.zweiter).toBe(r.erster);
      });
});
