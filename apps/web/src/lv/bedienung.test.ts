// SPDX-License-Identifier: AGPL-3.0-or-later
// Bedienung der LV-Seite (E8, B-26, KG-Hinweis an der Zelle): Ort eines neuen Hinweistexts (Vor- oder Nachtext), Vorschau der
// OZ-Maske mit Liste der Konflikte und der Hinweis „KG außerhalb der Gliederung“. Geprüft über eine echte Sitzung (Kern und
// Speicher), nicht über Einzelteile.

import type {
  Einheitspreis,
  KnotenId,
  Kostenermittlung,
  Kostengruppennummer,
  LvZustand,
  Menge,
  Positionsdaten,
  Projekt,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { lvAnsichtBauen } from './ansicht';
import { lvSitzung, projektSitzung, type LvSitzung } from './befehlsweg';
import { hinweistextOrt, positionOrt, titelOrt, untertitelOrt } from './einfuegeort';
import { kgAusserhalbBefunde } from './kgHinweis';
import { ozMaskeLesen } from './ozmaske';
import { ozMaskeVorschau } from './ozmaskeVorschau';

const maske = (text: string) => {
  const r = ozMaskeLesen(text);
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
};

const daten = (kurztext: string, kostengruppe?: string): Positionsdaten => ({
  ordnungszahl: null,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext,
  langtext: [],
  menge: '1.000' as Menge,
  einheit: 'St',
  einheitspreis: '10.000' as Einheitspreis,
  epa: null,
  ...(kostengruppe === undefined ? {} : { kostengruppe: kostengruppe as Kostengruppennummer }),
});

const zustand = (s: LvSitzung): LvZustand => {
  if (s.zustand === null) throw new Error('kein LV');
  return s.zustand;
};

/** Ein Titel 01 mit Untertitel 01.01 (zwei Positionen) und Titel 01.02 (eine Position), Maske NN.NN.NNNN[I]. */
async function kleinesLv() {
  const u = testUmgebung(await speicherImSpeicher());
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'P', 'B'));
  const projekt = (p.ok ? p.zustand : null) as Projekt;
  const s = lvSitzung(u, projekt.id, null);
  await s.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'LV', maske('NN.NN.NNNN[I]')));
  const titel = async (unter: boolean, aktiv: KnotenId | null, kurztext: string) => {
    const id = u.ids.titel();
    const lv = zustand(s).leistungsverzeichnis;
    const ort = unter ? untertitelOrt(lv, aktiv) : titelOrt(lv, aktiv);
    await s.befehl({ art: 'GliederungAnlegen', id, gliederungsart: 'titel', ort, kurztext });
    return id;
  };
  const position = async (aktiv: KnotenId, d: Positionsdaten) => {
    const id = u.ids.position();
    await s.befehl({ art: 'PositionAnlegen', id, ort: positionOrt(zustand(s).leistungsverzeichnis, aktiv), daten: d });
    return id;
  };
  const t01 = await titel(false, null, 'Rohbau');
  const t0101 = await titel(true, t01, 'Erdarbeiten');
  const t0102 = await titel(false, t0101, 'Mauerarbeiten');
  const p1 = await position(t0101, daten('Aushub', '310'));
  const p2 = await position(p1, daten('Verfüllen', '390'));
  const p3 = await position(t0102, daten('Mauerwerk', '340'));
  const r = await s.befehl({ art: 'Umnummerieren', teilbaumId: zustand(s).leistungsverzeichnis.id });
  if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
  return { u, s, t01, t0101, t0102, p1, p2, p3 };
}

/** Die Zeilen als „OZ Kurztext“ bzw. „Hinweis: Text“, in Dokumentreihenfolge. */
function zeilen(s: LvSitzung): string[] {
  return lvAnsichtBauen(zustand(s), new Set()).zeilen.map((z) =>
    z.knoten.art === 'hinweis'
      ? `Hinweis: ${z.knoten.text.map((b) => (b.art === 'text' ? b.text : '')).join('')}`
      : `${z.knoten.ordnungszahl ?? ''} ${z.knoten.kurztext}`,
  );
}

const absatz = (text: string) => [{ art: 'text' as const, text }];

describe('Hinweistext anlegen: Vortext, Nachtext, hinter der Zeile', () => {
  it('Vortext am Anfang und Nachtext am Ende der Gliederung der aktiven Zeile, sonst hinter der Position', async () => {
    const { u, s, t0101, p1 } = await kleinesLv();
    const anlegen = async (aktiv: KnotenId | null, lage: 'vortext' | 'nachtext' | 'hinter', text: string) => {
      const r = await s.befehl({
        art: 'HinweistextAnlegen',
        id: u.ids.hinweistext(),
        ort: hinweistextOrt(zustand(s).leistungsverzeichnis, aktiv, lage),
        text: absatz(text),
      });
      if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
    };
    await anlegen(p1, 'vortext', 'Vor den Erdarbeiten');
    await anlegen(t0101, 'nachtext', 'Nach den Erdarbeiten');
    await anlegen(p1, 'hinter', 'Zum Aushub');
    await anlegen(null, 'vortext', 'Vorbemerkung zum LV');
    expect(zeilen(s)).toEqual([
      'Hinweis: Vorbemerkung zum LV',
      '01 Rohbau',
      '01.01 Erdarbeiten',
      'Hinweis: Vor den Erdarbeiten',
      '01.01.0010 Aushub',
      'Hinweis: Zum Aushub',
      '01.01.0020 Verfüllen',
      'Hinweis: Nach den Erdarbeiten',
      '01.02 Mauerarbeiten',
      '01.02.0010 Mauerwerk',
    ]);
  });

  it('„hinter der Zeile“ an einer Gliederung wird zum Nachtext (eine Gliederung hat kein „dahinter“ als Kind)', async () => {
    const { s, t0101 } = await kleinesLv();
    const lv = zustand(s).leistungsverzeichnis;
    expect(hinweistextOrt(lv, t0101, 'hinter')).toEqual({ art: 'ende', elternId: t0101 });
    expect(hinweistextOrt(lv, null, 'nachtext')).toEqual({ art: 'ende', elternId: lv.id });
  });
});

describe('OZ-Maske ändern: Vorschau mit Prüfung der vorhandenen OZ', () => {
  it('eine passende Maske zeigt die neuen OZ; dieselbe Maske ändert nichts', async () => {
    const { s } = await kleinesLv();
    const v = ozMaskeVorschau(zustand(s), maske('NN.NNN.NNNN[I]'));
    expect(v.art).toBe('neu');
    if (v.art !== 'neu') return;
    expect(v.aenderungen.map((a) => `${a.vorher} → ${a.nachher} ${a.kurztext}`)).toEqual([
      '01.01 → 01.001 Erdarbeiten',
      '01.01.0010 → 01.001.0010 Aushub',
      '01.01.0020 → 01.001.0020 Verfüllen',
      '01.02 → 01.002 Mauerarbeiten',
      '01.02.0010 → 01.002.0010 Mauerwerk',
    ]);
    expect(ozMaskeVorschau(zustand(s), maske('NN.NN.NNNN[I]'))).toEqual({ art: 'gleich' });
  });

  it('eine Maske ohne Platz nennt alle Gliederungen ohne Stufe, in Dokumentreihenfolge', async () => {
    const { s, t0101, t0102 } = await kleinesLv();
    const v = ozMaskeVorschau(zustand(s), maske('NN.NNNN'));
    expect(v).toMatchObject({ art: 'abgewiesen', code: 'maske-ungueltig' });
    if (v.art !== 'abgewiesen') return;
    expect(v.knoten).toEqual([
      { knotenId: t0101, oz: '01.01', kurztext: 'Erdarbeiten' },
      { knotenId: t0102, oz: '01.02', kurztext: 'Mauerarbeiten' },
    ]);
  });

  it('die Los-Stufe über Titeln der obersten Ebene wird abgewiesen und nennt die Titel', async () => {
    const { s, t01 } = await kleinesLv();
    const v = ozMaskeVorschau(zustand(s), { ...maske('NN.NN.NNNN[I]'), losStufe: true });
    expect(v).toMatchObject({ art: 'abgewiesen', code: 'knotenart-unzulaessig' });
    if (v.art !== 'abgewiesen') return;
    expect(v.knoten.map((k) => k.knotenId)).toEqual([t01]);
  });

  it('eine unzulässige Maske (mehr als 14 Zeichen) wird ohne Zeilenliste abgewiesen', async () => {
    const { s } = await kleinesLv();
    const v = ozMaskeVorschau(zustand(s), maske('NNN.NNN.NNNNNNNN[I]'));
    expect(v).toMatchObject({ art: 'abgewiesen', code: 'maske-ungueltig', knoten: [] });
  });
});

describe('Hinweis „KG außerhalb der Gliederung“ an der Zelle', () => {
  const ermittlung = (...nummern: string[]): Pick<Kostenermittlung, 'eintraege'> =>
    ({ eintraege: nummern.map((nummer) => ({ nummer, betrag: '1.00', bemerkung: null })) }) as unknown as Pick<
      Kostenermittlung,
      'eintraege'
    >;

  it('eine Warnung an der Spalte KG je Position, deren Kostengruppe in keiner Kostenermittlung liegt', async () => {
    const { s, p2, p3 } = await kleinesLv();
    const knoten = zustand(s).leistungsverzeichnis.knoten;
    // 310 liegt in der Ermittlung, 330 als Nachfahr von 300 ebenfalls; 390 und 340 nicht.
    const befunde = kgAusserhalbBefunde(knoten, [ermittlung('310'), ermittlung('330')]);
    expect(befunde.map((b) => [b.ort.knotenId, b.ort.feld, b.schwere, b.code])).toEqual([
      [p2, 'kostengruppe', 'warnung', 'kg-ausserhalb-gliederung'],
      [p3, 'kostengruppe', 'warnung', 'kg-ausserhalb-gliederung'],
    ]);
    expect(befunde[0]?.meldung).toBe('Kostengruppe 390 liegt in keiner Kostenermittlung des Projekts.');
    expect(kgAusserhalbBefunde(knoten, [ermittlung('300')])).toEqual([]);
  });

  it('ohne Kostenermittlung im Projekt kein Hinweis (nichts, woran die Gliederung zu messen wäre)', async () => {
    const { s } = await kleinesLv();
    expect(kgAusserhalbBefunde(zustand(s).leistungsverzeichnis.knoten, [])).toEqual([]);
  });
});
