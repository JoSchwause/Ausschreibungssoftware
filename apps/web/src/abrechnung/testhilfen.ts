// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Vitest unter Node (Ticket 87): ein Auftrags-LV im echten Speicher (In-Memory-SQLite), entstanden wie in der
// App: Projekt, LV `typisch`, Angebot von Bieter A aus seiner X84, Zuschlag, alles über den Befehlsweg (A5).

import { readFileSync } from 'node:fs';
import type { AuftragsLvZustand, PositionId, Projekt, Speicher } from '@tethys/vertrag';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { zuschlagserteilungSpeichern } from '../auftrag/auftrag';
import { zuschlagserteilungPlanen } from '../auftrag/zuschlagserteilung';
import { angebotAnlegenPlan, angebotLesen } from '../gaeb/gaeb';
import { Befehlsweg, type Umgebung } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';

const wurzel = new URL('../../../../', import.meta.url);

export interface Aufbau {
  readonly u: Umgebung;
  readonly weg: Befehlsweg;
  readonly projekt: Projekt;
  readonly auftrag: AuftragsLvZustand;
}

/** Projekt „Musterhaus“, LV `typisch`, Angebot von Bieter A und der Zuschlag an ihn; ein frischer Undo-Stapel danach. */
export async function mitAuftrag(speicher?: Speicher): Promise<Aufbau> {
  const u = testUmgebung(speicher ?? (await speicherImSpeicher()));
  const vorbereitung = new Befehlsweg(u);
  const p = await vorbereitung.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Musterhaus',
    bauherr: { name: 'Bauherr', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const inhalt = fixtureInhalt('typisch');
  const s = vorbereitung.lv(p.zustand.id, null);
  const l = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: p.zustand.id,
    inhalt,
  });
  if (!l.ok || s.zustand === null) throw new Error('LV');
  const lv = s.zustand;
  const bytes = new Uint8Array(readFileSync(new URL('fixtures/angebote/typisch-bieter-a.x84', wurzel)));
  const v = angebotLesen(bytes, 'typisch-bieter-a.x84', lv, u.ids);
  const plan = angebotAnlegenPlan(v, v.bieterName, p.zustand, u.ids);
  if (plan === null) throw new Error('Angebot');
  const a = await vorbereitung.angebotAnlegen(p.zustand, lv, plan.neuerBieter, plan.angebot);
  if (!a.ok) throw new Error('Angebot');
  const z = zuschlagserteilungPlanen({
    lv,
    angebot: plan.angebot,
    projekt: a.zustand,
    gewaehlt: new Set<PositionId>(),
    neueId: u.ids.auftragsLeistungsverzeichnis(),
  });
  if (z.befehl === null) throw new Error(z.fehler ?? 'Zuschlag');
  const r = await zuschlagserteilungSpeichern(vorbereitung, z.befehl);
  if (!r.ok) throw new Error('Zuschlag');
  const auftrag = await u.speicher.auftragsLeistungsverzeichnisse.laden(r.id);
  if (!auftrag.ok) throw new Error(auftrag.fehler.meldung);
  return { u, weg: new Befehlsweg(u), projekt: a.zustand, auftrag: auftrag.wert };
}

/** Die Positionen des Auftrags-LV mit OZ, für Tests, die eine Position über ihre OZ meinen. */
export function positionMitOz(auftrag: AuftragsLvZustand, oz: string): PositionId {
  const k = auftrag.auftragsLeistungsverzeichnis.knoten.find(
    (x) => x.art === 'position' && `${x.ordnungszahl ?? ''}${x.ozIndex ?? ''}` === oz,
  );
  if (k?.art !== 'position') throw new Error(`keine Position ${oz}`);
  return k.id;
}
