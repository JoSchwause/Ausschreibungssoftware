// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 149: Schreibwege der Vergabe mit echtem Kern, `vergabe` und Speicher (In-Memory-SQLite). Seams: `angebotAendern`,
// `bieterLoeschenSchreiben`, `ruecknahmelage`, `zuschlagZuruecknehmenSchreiben`, `preisspiegelEinstellungenSetzen` und der
// Projektweg des Befehlswegs für `BieterUmbenennen`/`BieterangabenSetzen`. Sollwerte: Fixture `typisch-angebote.json`
// (Summen von Bieter A) und von Hand nach N2 daraus hergeleitet (Position 01.0010: Menge 1,000, EP 1.814,850).

import { readFileSync } from 'node:fs';
import type { PositionId, Projekt, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { neuesBlatt, aufmassBefehlAnwenden } from '../abrechnung/aufmass';
import { zuschlagserteilungPlanen } from '../auftrag/zuschlagserteilung';
import { zuschlagserteilungSpeichern } from '../auftrag/auftrag';
import { angebotAnlegenPlan, angebotLesen } from '../gaeb/gaeb';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import {
  angebotAendern,
  angeboteJeBieter,
  bieterLoeschenSchreiben,
  preisspiegelEinstellungenSetzen,
  ruecknahmelage,
  zuschlagZuruecknehmenSchreiben,
} from './schreiben';

const wurzel = new URL('../../../../', import.meta.url);
/** Position 01.0010 „Baustelle einrichten“ (Menge 1,000); Bieter A bietet 1.814,850. */
const P0010 = '019b76e9-ea42-7a6c-9180-36c38b8c3b9e' as PositionId;

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

async function gesamt(u: Awaited<ReturnType<typeof mitAngebot>>['u'], id: string) {
  const a = await u.speicher.angebote.laden(id as never);
  if (!a.ok) throw new Error(a.fehler.meldung);
  return a.wert;
}

describe('angebotAendern', () => {
  it('berichtigt einen Preis, setzt „nicht angeboten“ und einen Nachlass als einen Undo-Schritt', async () => {
    const { u, weg, angebot } = await mitAngebot();
    const tiefe = weg.historie.tiefe.rueck;
    const r = await angebotAendern(weg, angebot.id, [
      {
        art: 'AngebotspositionSetzen',
        position: { positionId: P0010, status: 'angeboten', einheitspreis: '1900.000' as never, epa: null },
      },
      { art: 'AngebotsNachlassSetzen', nachlass: { art: 'prozent', wert: '5.00' as Prozent } },
    ]);
    expect(r.ok).toBe(true);
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    // 55.481,84 + (1.900,00 − 1.814,85) = 55.566,99; 5 % davon 2.778,35 (2.778,3495 gerundet).
    const z = await gesamt(u, angebot.id);
    expect(z.summen.gesamt.netto).toBe('55566.99');
    expect(z.summen.gesamt.nachlass).toBe('2778.35');
    expect(z.summen.gesamt.nettoNachNachlass).toBe('52788.64');

    const n = await angebotAendern(weg, angebot.id, [
      { art: 'AngebotspositionSetzen', position: { positionId: P0010, status: 'nicht-angeboten' } },
      { art: 'AngebotsNachlassEntfernen' },
    ]);
    expect(n.ok).toBe(true);
    // 55.481,84 − 1.814,85 = 53.666,99
    expect((await gesamt(u, angebot.id)).summen.gesamt.nettoNachNachlass).toBe('53666.99');

    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await gesamt(u, angebot.id)).summen.gesamt.nettoNachNachlass).toBe('55481.84');
  });

  it('löscht das Angebot; Rückgängig holt es zurück', async () => {
    const { u, weg, angebot, lv } = await mitAngebot();
    const r = await angebotAendern(weg, angebot.id, [{ art: 'AngebotLoeschen' }]);
    expect(r).toMatchObject({ ok: true, zustand: null });
    const ids = await u.speicher.angebote.auflisten(lv.leistungsverzeichnis.id);
    expect(ids.ok && ids.wert).toEqual([]);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect((await gesamt(u, angebot.id)).summen.gesamt.nettoNachNachlass).toBe('55481.84');
  });

  it('ein abgewiesener Befehl kommt als Wert zurück; nichts geschrieben', async () => {
    const { u, weg, angebot } = await mitAngebot();
    const tiefe = weg.historie.tiefe.rueck;
    const r = await angebotAendern(weg, angebot.id, [
      { art: 'AngebotsNachlassSetzen', nachlass: { art: 'prozent', wert: '120.00' as Prozent } },
    ]);
    expect(r.ok === false && r.abweisung.art).toBe('befehl');
    expect(weg.historie.tiefe.rueck).toBe(tiefe);
    expect((await gesamt(u, angebot.id)).summen.gesamt.nachlass).toBe('0.00');
  });
});

describe('Bieter', () => {
  it('umbenennen und Angaben setzen über den Projektweg; ein Undo-Schritt', async () => {
    const { weg, projekt } = await mitAngebot();
    const bieter = projekt.bieter[0];
    if (bieter === undefined) throw new Error('Bieter');
    const s = weg.projekt(projekt);
    const r = await s.folge([
      { art: 'BieterUmbenennen', bieterId: bieter.id, name: 'Bieter A GmbH' },
      {
        art: 'BieterangabenSetzen',
        bieterId: bieter.id,
        angaben: {
          anschrift: { strasse: 'Weg 1', plz: '12345', ort: 'Musterstadt' },
          ansprechperson: null,
          email: 'a@example.org',
          telefon: '',
        },
      },
    ]);
    expect(r.every((a) => a.ok)).toBe(true);
    expect(s.zustand?.bieter[0]).toEqual({
      id: bieter.id,
      name: 'Bieter A GmbH',
      angaben: {
        anschrift: { strasse: 'Weg 1', plz: '12345', ort: 'Musterstadt' },
        ansprechperson: null,
        email: 'a@example.org',
        telefon: null,
      },
    });
  });

  it('löschen nur ohne Angebot: mit Angebot gesperrt (Anzahl), nach dem Löschen des Angebots geht es', async () => {
    const { u, weg, projekt, angebot } = await mitAngebot();
    const bieterId = angebot.bieterId;
    const zaehlung = await angeboteJeBieter(u.speicher, projekt.id);
    expect(zaehlung.ok && zaehlung.wert.get(bieterId)).toBe(1);

    const gesperrt = await bieterLoeschenSchreiben(weg, projekt.id, bieterId);
    expect(gesperrt.ok === false && gesperrt.abweisung.art === 'befehl' && gesperrt.abweisung.fehler).toMatchObject(
      { code: 'verweise-vorhanden', verweise: [{ art: 'angebot', anzahl: 1 }] },
    );

    expect((await angebotAendern(weg, angebot.id, [{ art: 'AngebotLoeschen' }])).ok).toBe(true);
    const r = await bieterLoeschenSchreiben(weg, projekt.id, bieterId);
    expect(r.ok && r.zustand.bieter).toEqual([]);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    const p = await u.speicher.projekte.laden(projekt.id);
    expect(p.ok && p.wert.bieter.map((b) => b.id)).toEqual([bieterId]);
  });
});

describe('Zuschlag zurücknehmen', () => {
  async function mitZuschlag() {
    const g = await mitAngebot();
    const plan = zuschlagserteilungPlanen({
      lv: g.lv,
      angebot: g.angebot,
      projekt: g.projekt,
      gewaehlt: new Set<PositionId>(),
      neueId: g.u.ids.auftragsLeistungsverzeichnis(),
    });
    if (plan.befehl === null) throw new Error('Zuschlag');
    const r = await zuschlagserteilungSpeichern(g.weg, plan.befehl);
    if (!r.ok) throw new Error('Zuschlag');
    const a = await g.u.speicher.auftragsLeistungsverzeichnisse.laden(r.id);
    if (!a.ok) throw new Error('Auftrags-LV');
    return { ...g, auftrag: a.wert };
  }

  it('ohne Verweise: löscht das Auftrags-LV; danach lässt sich das Angebot löschen; Undo stellt es her', async () => {
    const { u, weg, projekt, auftrag, angebot } = await mitZuschlag();
    const id = auftrag.auftragsLeistungsverzeichnis.id;
    const lage = await ruecknahmelage(u.speicher, auftrag);
    expect(lage.ok && lage.wert).toEqual({
      verweise: [
        { art: 'nachtrag', anzahl: 0 },
        { art: 'aufmass', anzahl: 0 },
        { art: 'rechnung', anzahl: 0 },
        { art: 'mangel', anzahl: 0 },
      ],
      vorgaenge: [],
      auftragswert: '55481.84',
    });
    // Mit Zuschlag sperrt der Speicher das Löschen des beauftragten Angebots.
    const vorher = await angebotAendern(weg, angebot.id, [{ art: 'AngebotLoeschen' }]);
    expect(vorher.ok === false && vorher.abweisung.art).toBe('speicher');

    expect((await zuschlagZuruecknehmenSchreiben(weg, id)).ok).toBe(true);
    const liste = await u.speicher.auftragsLeistungsverzeichnisse.auflisten(projekt.id);
    expect(liste.ok && liste.wert).toEqual([]);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    const zurueck = await u.speicher.auftragsLeistungsverzeichnisse.laden(id);
    expect(zurueck.ok && zurueck.wert).toEqual(auftrag);
  });

  it('ein Aufmaßblatt sperrt; die Abweisung nennt Art und Anzahl', async () => {
    const { u, weg, auftrag } = await mitZuschlag();
    const a = auftrag.auftragsLeistungsverzeichnis;
    const blatt = await aufmassBefehlAnwenden(
      u,
      a.projektId,
      null,
      neuesBlatt(u.ids, a, [], { bezeichnung: 'Blatt 1', datum: null }),
    );
    expect(blatt.ok).toBe(true);
    const r = await zuschlagZuruecknehmenSchreiben(weg, a.id);
    expect(r.ok === false && r.abweisung.art === 'befehl' && r.abweisung.fehler).toMatchObject({
      code: 'verweise-vorhanden',
      verweise: [{ art: 'aufmass', anzahl: 1 }],
    });
    const noch = await u.speicher.auftragsLeistungsverzeichnisse.laden(a.id);
    expect(noch.ok).toBe(true);
  });
});

describe('preisspiegelEinstellungenSetzen', () => {
  it('speichert die Einstellungen am LV; null stellt die Standardwerte her; Undo', async () => {
    const { u, weg, lv } = await mitAngebot();
    const e = {
      ausreisserSchwelle: '30.00' as Prozent,
      abcSchwelleA: '70.00' as Prozent,
      abcSchwelleB: '90.00' as Prozent,
      abcBezug: 'schaetzpreis' as const,
    };
    const r = await preisspiegelEinstellungenSetzen(weg, lv, e);
    expect(r.ok).toBe(true);
    const geladen = await u.speicher.leistungsverzeichnisse.laden(lv.leistungsverzeichnis.id);
    expect(geladen.ok && geladen.wert.leistungsverzeichnis.preisspiegel).toEqual(e);
    if (!geladen.ok) return;
    expect((await preisspiegelEinstellungenSetzen(weg, geladen.wert, null)).ok).toBe(true);
    const ohne = await u.speicher.leistungsverzeichnisse.laden(lv.leistungsverzeichnis.id);
    expect(ohne.ok && ohne.wert.leistungsverzeichnis.preisspiegel).toBeUndefined();
    expect((await weg.rueckgaengig()).ok).toBe(true);
    const wieder = await u.speicher.leistungsverzeichnisse.laden(lv.leistungsverzeichnis.id);
    expect(wieder.ok && wieder.wert.leistungsverzeichnis.preisspiegel).toEqual(e);
  });
});
