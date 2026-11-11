// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Vitest (Ticket 88): ein Auftrags-LV mit Aufmaßblättern in einem echten Speicher (In-Memory-SQLite), alles über
// Befehle. LV `typisch`, Angebot von Bieter A aus seiner X84, Zuschlag ohne Wahl (wie `auftrag/auftrag.test.ts`).

import { readFileSync } from 'node:fs';
import type { Aufmass, AuftragsLvZustand, Menge, PositionId, Projekt } from '@tethys/vertrag';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { zuschlagserteilungSpeichern } from '../auftrag/auftrag';
import { zuschlagserteilungPlanen } from '../auftrag/zuschlagserteilung';
import { angebotAnlegenPlan, angebotLesen } from '../gaeb/gaeb';
import { befehlswegFuer, type Befehlsweg, type Umgebung } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { aufmassSchreiben } from './testpfad';

const wurzel = new URL('../../../../', import.meta.url);

export interface Auftragsstand {
  readonly u: Umgebung;
  readonly weg: Befehlsweg;
  readonly projekt: Projekt;
  readonly auftrag: AuftragsLvZustand;
}

/** Projekt, LV `typisch`, Angebot von Bieter A (oder B), Zuschlag ohne Wahl: ein Auftrags-LV im Speicher. */
export async function mitAuftrag(bieter: 'a' | 'b' = 'a'): Promise<Auftragsstand> {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = befehlswegFuer(u);
  const p = await weg.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Musterhaus',
    bauherr: { name: 'Bauherr', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const inhalt = fixtureInhalt('typisch');
  const s = weg.lv(p.zustand.id, null);
  const l = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: p.zustand.id,
    inhalt,
  });
  if (!l.ok || s.zustand === null) throw new Error('LV');
  const lv = s.zustand;
  const datei = `typisch-bieter-${bieter}.x84`;
  const bytes = new Uint8Array(readFileSync(new URL(`fixtures/angebote/${datei}`, wurzel)));
  const v = angebotLesen(bytes, datei, lv, u.ids);
  const plan = angebotAnlegenPlan(v, v.bieterName, p.zustand, u.ids);
  if (plan === null) throw new Error('Angebot');
  const a = await weg.angebotAnlegen(p.zustand, lv, plan.neuerBieter, plan.angebot);
  if (!a.ok) throw new Error('Angebot');
  const z = zuschlagserteilungPlanen({
    lv,
    angebot: plan.angebot,
    projekt: a.zustand,
    gewaehlt: new Set<PositionId>(),
    neueId: u.ids.auftragsLeistungsverzeichnis(),
  });
  if (z.befehl === null) throw new Error(z.fehler ?? 'Zuschlag');
  const r = await zuschlagserteilungSpeichern(weg, z.befehl);
  if (!r.ok) throw new Error('Zuschlag');
  const auftrag = await u.speicher.auftragsLeistungsverzeichnisse.laden(r.id);
  if (!auftrag.ok) throw new Error(auftrag.fehler.meldung);
  return { u, weg, projekt: a.zustand, auftrag: auftrag.wert };
}

/** Ein Aufmaßblatt mit der Menge je Position (nach OZ, kanonisch mit 3 Stellen), über `AufmassAnlegen`. */
export async function blattAnlegen(
  s: Auftragsstand,
  nummer: number,
  mengen: Readonly<Record<string, string>>,
): Promise<Aufmass> {
  const kopf = s.auftrag.auftragsLeistungsverzeichnis;
  const positionen = Object.entries(mengen).map(([oz, menge]) => {
    const k = kopf.knoten.find((x) => x.art === 'position' && x.ordnungszahl === oz);
    if (k === undefined) throw new Error(`keine Position ${oz}`);
    return { positionId: k.id as PositionId, mengenansatz: null, menge: menge as Menge };
  });
  const aufmass: Aufmass = {
    id: s.u.ids.aufmass(),
    projektId: kopf.projektId,
    auftragsLvId: kopf.id,
    nummer,
    bezeichnung: `Blatt ${String(nummer)}`,
    datum: null,
    positionen,
  };
  const r = await aufmassSchreiben(s.u, aufmass);
  if (!r.ok) throw new Error(r.fehler);
  return aufmass;
}
