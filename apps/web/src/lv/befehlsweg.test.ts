// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LvZustand, Menge, PositionId, Projekt, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung, zaehlenderSpeicher } from '../testhilfen';
import { EINZIGER_NUTZER, lvSitzung, projektSitzung, type Umgebung } from './befehlsweg';
import { ozMaskeLesen } from './ozmaske';

const maske = (() => {
  const r = ozMaskeLesen('NN.NN.NNNN[I]');
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
})();

async function mitProjektUndLv(u: Umgebung) {
  const projekte = projektSitzung(u, null);
  const p = await projekte.befehl(projektAnlegenBefehl(u.ids, 'Neubau Kita', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt nicht angelegt');
  const projekt: Projekt = p.zustand;
  const lv = lvSitzung(u, projekt.id, null);
  const a = await lv.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'Rohbau', maske));
  if (!a.ok) throw new Error('LV nicht angelegt');
  return { projekt, lv };
}

function zustand(z: LvZustand | null): LvZustand {
  if (z === null) throw new Error('kein LV');
  return z;
}

describe('Befehlsweg: Kern → Speicher → Zustand', () => {
  it('jede Änderung geht als genau ein Befehl mit einem Protokolleintrag durch Kern und Speicher', async () => {
    const speicher = zaehlenderSpeicher(await speicherImSpeicher());
    const u = testUmgebung(speicher);
    const { projekt, lv } = await mitProjektUndLv(u);
    const pos = u.ids.position();
    await lv.befehl({
      art: 'PositionAnlegen',
      id: pos,
      ort: { art: 'ende', elternId: zustand(lv.zustand).leistungsverzeichnis.id },
      daten: {
        ordnungszahl: null,
        ozIndex: null,
        merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
        zuschlag: null,
        kurztext: 'Bauzaun',
        langtext: [],
        menge: null,
        einheit: 'm',
        einheitspreis: '7.450' as never,
        epa: null,
      },
    });
    await lv.befehl({ art: 'MengeAendern', positionId: pos, menge: '86.500' as Menge });

    expect(speicher.geschrieben.map((s) => s.eintrag.befehl.art)).toEqual([
      'ProjektAnlegen',
      'LeistungsverzeichnisAnlegen',
      'PositionAnlegen',
      'MengeAendern',
    ]);
    for (const s of speicher.geschrieben) {
      expect(s.eintrag.wer).toBe(EINZIGER_NUTZER);
      expect(s.eintrag.projektId).toBe(projekt.id);
    }
    // Der Zustand der App ist der gespeicherte.
    const gespeichert = await speicher.leistungsverzeichnisse.laden(zustand(lv.zustand).leistungsverzeichnis.id);
    expect(gespeichert.ok && gespeichert.wert.summen.gesamt.netto).toBe('644.43');
    expect(zustand(lv.zustand).summen.gesamt.netto).toBe('644.43');
  });

  it('schnell hintereinander gesendete Befehle laufen nacheinander auf dem jeweils neuen Stand', async () => {
    const u = testUmgebung(await speicherImSpeicher());
    const { lv } = await mitProjektUndLv(u);
    const wurzel = zustand(lv.zustand).leistungsverzeichnis.id;
    const titel = u.ids.titel();
    const a = lv.befehl({
      art: 'GliederungAnlegen',
      id: titel,
      gliederungsart: 'titel',
      ort: { art: 'ende', elternId: wurzel },
      kurztext: 'Rohbau',
    });
    const b = lv.befehl({ art: 'KurztextAendern', knotenId: titel, kurztext: 'Erdarbeiten' });
    expect((await a).ok && (await b).ok).toBe(true);
    expect(zustand(lv.zustand).leistungsverzeichnis.knoten.map((k) => k.art === 'titel' && k.kurztext)).toEqual([
      'Erdarbeiten',
    ]);
  });

  it('Speicherfehler: der Zustand bleibt beim alten Stand, der Grund kommt als Wert zurück', async () => {
    const speicher = zaehlenderSpeicher(await speicherImSpeicher());
    const u = testUmgebung(speicher);
    const { lv } = await mitProjektUndLv(u);
    const vorher = lv.zustand;
    let benachrichtigt = 0;
    lv.abonnieren(() => (benachrichtigt += 1));
    speicher.fehlerAb('speicher-voll');

    const r = await lv.befehl({ art: 'MwstSatzSetzen', mwstSatz: '7.00' as Prozent });

    expect(r).toEqual({ ok: false, abweisung: { art: 'speicher', fehler: { code: 'speicher-voll', meldung: 'Attrappe' } } });
    expect(lv.zustand).toBe(vorher);
    expect(benachrichtigt).toBe(0);
    // Der nächste Befehl läuft wieder, sobald der Speicher schreibt.
    speicher.fehlerAb(null);
    expect((await lv.befehl({ art: 'MwstSatzSetzen', mwstSatz: '7.00' as Prozent })).ok).toBe(true);
    expect(zustand(lv.zustand).leistungsverzeichnis.mwstSatz).toBe('7.00');
  });

  it('ein vom Kern abgewiesener Befehl erreicht den Speicher nicht', async () => {
    const speicher = zaehlenderSpeicher(await speicherImSpeicher());
    const u = testUmgebung(speicher);
    const { lv } = await mitProjektUndLv(u);
    const vorher = speicher.geschrieben.length;
    const r = await lv.befehl({ art: 'MengeAendern', positionId: 'gibt-es-nicht' as PositionId, menge: null });
    expect(r.ok === false && r.abweisung.art).toBe('befehl');
    expect(speicher.geschrieben.length).toBe(vorher);
  });

  it('Hinweise des Kerns kommen mit dem angenommenen Befehl zurück', async () => {
    const u = testUmgebung(await speicherImSpeicher());
    const { lv } = await mitProjektUndLv(u);
    const r = await lv.befehl({ art: 'NachlassSetzen', nachlass: { art: 'betrag', wert: '10.00' as never } });
    expect(r.ok && r.hinweise.map((h) => h.code)).toEqual(['netto-nach-nachlass-negativ']);
  });
});
