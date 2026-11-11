// SPDX-License-Identifier: AGPL-3.0-or-later
// Wohin die App nach Undo/Redo wechselt, Zeilen des Papierkorbs und „Stand als neues LV übernehmen“ (Ticket 48).
import type { LvStand, LvStandId, Projekt, Zeitstempel } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { Befehlsweg, type LvSitzung } from '../lv/befehlsweg';
import { ozMaskeLesen } from '../lv/ozmaske';
import { eintragZeile } from '../lv/PapierkorbDialog';
import { standAlsLvBefehl } from '../lv/stand';
import type { Teil } from './historie';
import { zielNach } from './HistorieAnbieter';

const maske = (() => {
  const r = ozMaskeLesen('NN.NNNN');
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
})();

async function aufbau() {
  const speicher = await speicherImSpeicher();
  const u = testUmgebung(speicher);
  const weg = new Befehlsweg(u);
  const p = await weg.projekt(null).befehl(projektAnlegenBefehl(u.ids, 'Kita', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  const lv: LvSitzung = weg.lv(projekt.id, null);
  await lv.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'Rohbau', maske));
  const z = lv.zustand;
  if (z === null) throw new Error('LV');
  const titel = u.ids.titel();
  await lv.befehl({
    art: 'GliederungAnlegen',
    id: titel,
    gliederungsart: 'titel',
    ort: { art: 'ende', elternId: z.leistungsverzeichnis.id },
    kurztext: 'Erdarbeiten',
  });
  for (const k of ['Aushub', 'Verfüllen']) {
    await lv.befehl({
      art: 'PositionAnlegen',
      id: u.ids.position(),
      ort: { art: 'ende', elternId: titel },
      daten: {
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
        kurztext: k,
        langtext: [],
        menge: null,
        einheit: null,
        einheitspreis: null,
        epa: null,
      },
    });
  }
  return { u, weg, projekt, lv };
}

/** Der oberste Teil des Undo-Stapels. */
function oben(weg: Befehlsweg): Teil {
  const t = weg.historie.naechsterRueckgaengig()?.at(-1);
  if (t === undefined) throw new Error('leer');
  return t;
}

describe('zielNach', () => {
  it('eine Änderung im LV führt auf die LV-Seite, außer man ist schon dort', async () => {
    const { weg, lv } = await aufbau();
    const t = oben(weg);
    const lvPfad = `/lv/${lv.zustand?.leistungsverzeichnis.id ?? ''}`;
    expect(zielNach(t, true, '/')).toBe(lvPfad);
    expect(zielNach(t, true, lvPfad)).toBeNull();
  });

  it('LV anlegen oder löschen ist auf der Projektseite sichtbar; Projekt löschen auf der Liste', async () => {
    const { weg, projekt, lv } = await aufbau();
    const z = lv.zustand;
    if (z === null) throw new Error('LV');
    await weg.lv(projekt.id, z).befehl({ art: 'LeistungsverzeichnisLoeschen' });
    const projektPfad = `/projekt/${projekt.id}`;
    expect(zielNach(oben(weg), true, '/')).toBe(projektPfad);
    expect(zielNach(oben(weg), false, projektPfad)).toBeNull();
    await weg.projekt(projekt).befehl({ art: 'ProjektLoeschen' });
    // Undo legt das Projekt wieder an: auf der Liste sichtbar, also bleiben.
    expect(zielNach(oben(weg), true, '/')).toBeNull();
    // Redo löscht es: von der Projektseite zurück auf die Liste.
    expect(zielNach(oben(weg), false, projektPfad)).toBe('/');
  });
});

describe('Papierkorb und Stand', () => {
  it('ein Eintrag zeigt OZ und Kurztext des ersten Knotens, weitere oberste Knoten und die Zahl der Positionen', async () => {
    const { u, lv } = await aufbau();
    const z = lv.zustand;
    if (z === null) throw new Error('LV');
    const positionen = z.leistungsverzeichnis.knoten.filter((k) => k.art === 'position');
    await lv.befehl({
      art: 'KnotenInPapierkorbLegen',
      eintragId: u.ids.papierkorbeintrag(),
      knotenIds: positionen.map((p) => p.id),
    });
    const e = lv.zustand?.papierkorb?.[0];
    if (e === undefined) throw new Error('kein Eintrag');
    expect(eintragZeile(e)).toEqual({ oz: '01.0010', kurztext: 'Aushub (+1)', positionen: 2 });
  });

  it('Stand als neues LV: neue Kennungen, gleicher Inhalt, Name mit Stand', async () => {
    const { u, weg, projekt, lv } = await aufbau();
    const z = lv.zustand;
    if (z === null) throw new Error('LV');
    const stand: LvStand = {
      id: 'stand' as LvStandId,
      leistungsverzeichnisId: z.leistungsverzeichnis.id,
      name: 'Versand',
      angelegt: '2026-11-11T10:00:00.000Z' as Zeitstempel,
      zustand: z,
    };
    const befehl = standAlsLvBefehl(stand, u.ids);
    expect(befehl.inhalt.name).toBe('Rohbau (Stand Versand)');
    expect(befehl.id).not.toBe(z.leistungsverzeichnis.id);
    const alt = new Set<string>(z.leistungsverzeichnis.knoten.map((k) => k.id));
    expect(befehl.inhalt.knoten.some((k) => alt.has(k.id))).toBe(false);
    const a = await weg.lv(projekt.id, null).befehl(befehl);
    expect(a.ok).toBe(true);
    const neu = a.ok ? a.zustand : null;
    expect(neu?.leistungsverzeichnis.knoten.map((k) => (k.art === 'hinweis' ? null : k.kurztext))).toEqual(
      z.leistungsverzeichnis.knoten.map((k) => (k.art === 'hinweis' ? null : k.kurztext)),
    );
  });
});
