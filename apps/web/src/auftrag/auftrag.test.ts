// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: der Zuschlag auf dem Befehlsweg der App, gegen einen echten Speicher (In-Memory-SQLite). LV `typisch`,
// Bieter A aus seiner X84 (Ticket 69). Erwartete Summen aus der Fixture (`typisch-angebote.json`), nicht aus dem Kern.

import { readFileSync } from 'node:fs';
import type { PositionId, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { angebotAnlegenPlan, angebotLesen } from '../gaeb/gaeb';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { auftragsLvsLaden, auftragZumLv, zuschlagserteilungSpeichern } from './auftrag';
import { zuschlagserteilungPlanen } from './zuschlagserteilung';

const wurzel = new URL('../../../../', import.meta.url);
const fx = JSON.parse(readFileSync(new URL('fixtures/typisch-angebote.json', wurzel), 'utf8')) as {
  preisspiegel: {
    bieter: readonly {
      name: string;
      summen: Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
    }[];
  };
};
const sollA = fx.preisspiegel.bieter.find((b) => b.name === 'Bieter A')?.summen;

/** Projekt, LV `typisch` und das Angebot von Bieter A, alles über den Befehlsweg. */
async function mitAngebot() {
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
  const bytes = new Uint8Array(readFileSync(new URL('fixtures/angebote/typisch-bieter-a.x84', wurzel)));
  const v = angebotLesen(bytes, 'typisch-bieter-a.x84', lv, u.ids);
  const plan = angebotAnlegenPlan(v, v.bieterName, p.zustand, u.ids);
  if (plan === null) throw new Error('Angebot');
  const a = await weg.angebotAnlegen(p.zustand, lv, plan.neuerBieter, plan.angebot);
  if (!a.ok) throw new Error('Angebot');
  const projekt: Projekt = a.zustand;
  return { u, weg, projekt, lv, angebot: plan.angebot };
}

describe('Zuschlag über den Befehlsweg', () => {
  it('legt das Auftrags-LV an (Summen wie das Angebot), ein zweiter Zuschlag wird abgewiesen, Undo nimmt ihn zurück', async () => {
    const { u, weg, projekt, lv, angebot } = await mitAngebot();
    const plan = zuschlagserteilungPlanen({
      lv,
      angebot,
      projekt,
      gewaehlt: new Set<PositionId>(),
      neueId: u.ids.auftragsLeistungsverzeichnis(),
    });
    if (plan.befehl === null) throw new Error(plan.fehler ?? 'kein Befehl');

    const r = await zuschlagserteilungSpeichern(weg, plan.befehl);
    expect(r).toEqual({ ok: true, id: plan.befehl.auftragsLeistungsverzeichnis.id });
    expect(weg.historie.tiefe.rueck).toBe(4); // Projekt, LV, Angebot, Zuschlag: je ein Schritt

    const geladen = await auftragsLvsLaden(u.speicher, projekt.id);
    if (!geladen.ok) throw new Error(geladen.fehler.meldung);
    expect(geladen.wert).toHaveLength(1);
    const [auftrag] = geladen.wert;
    // Ohne Wahl gleich den Summen des Angebots (D-59.8), aus der Fixture.
    expect(auftrag?.summen.gesamt).toMatchObject(sollA ?? {});
    expect(auftrag?.auftragsLeistungsverzeichnis.auftragnehmer?.name).toBe('Bieter A');
    expect(auftragZumLv(geladen.wert, lv.leistungsverzeichnis.id)?.auftragsLeistungsverzeichnis.id).toBe(
      plan.befehl.auftragsLeistungsverzeichnis.id,
    );

    const zweiter = zuschlagserteilungPlanen({
      lv,
      angebot,
      projekt,
      gewaehlt: new Set<PositionId>(),
      neueId: u.ids.auftragsLeistungsverzeichnis(),
    });
    if (zweiter.befehl === null) throw new Error('kein Befehl');
    const r2 = await zuschlagserteilungSpeichern(weg, zweiter.befehl);
    expect(r2).toMatchObject({ ok: false, art: 'schon-vergeben' });
    expect(weg.historie.tiefe.rueck).toBe(4);

    const undo = await weg.rueckgaengig();
    expect(undo.ok).toBe(true);
    const danach = await auftragsLvsLaden(u.speicher, projekt.id);
    expect(danach.ok && danach.wert).toEqual([]);

    const redo = await weg.wiederholen();
    expect(redo.ok).toBe(true);
    const wieder = await auftragsLvsLaden(u.speicher, projekt.id);
    expect(wieder.ok && wieder.wert.map((z) => z.summen.gesamt.nettoNachNachlass)).toEqual([
      sollA?.nettoNachNachlass,
    ]);
  });

  it('liest Auftrags-LVs über das Repository, nicht über den Export der Projektdatei (Ticket 86, D-64.2)', async () => {
    const { u, weg, projekt, lv, angebot } = await mitAngebot();
    const plan = zuschlagserteilungPlanen({
      lv,
      angebot,
      projekt,
      gewaehlt: new Set<PositionId>(),
      neueId: u.ids.auftragsLeistungsverzeichnis(),
    });
    if (plan.befehl === null) throw new Error('kein Befehl');
    // Ab hier ist der Export gesperrt: Laden und die Prüfung „schon vergeben“ dürfen ihn nicht brauchen.
    const ohneExport = {
      ...u.speicher,
      projektdateiExportieren: () => Promise.reject(new Error('Export der Projektdatei')),
    } as typeof u.speicher;
    const weg2 = befehlswegFuer({ ...u, speicher: ohneExport });
    expect(await zuschlagserteilungSpeichern(weg2, plan.befehl)).toMatchObject({ ok: true });
    const geladen = await auftragsLvsLaden(ohneExport, projekt.id);
    expect(geladen.ok && geladen.wert.map((z) => z.auftragsLeistungsverzeichnis.id)).toEqual([
      plan.befehl.auftragsLeistungsverzeichnis.id,
    ]);
    expect(weg.historie.tiefe.rueck).toBe(3);
  });
});
