// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: die reine Logik der Nachträge in der App (Nummernvergabe, Befehlsfolgen, Vorschau der Beauftragung).

import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisId,
  LeistungsverzeichnisId,
  LvBefehl,
  LvUebersicht,
  LvZustand,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { appIdQuelle } from '../lv/ids';
import { ozMaskeLesen } from '../lv/ozmaske';
import { nachtragAnlegenPlanen, naechsteNachtragsnummer } from './nachtrag';

const A = 'auftrag-a' as AuftragsLeistungsverzeichnisId;
const B = 'auftrag-b' as AuftragsLeistungsverzeichnisId;

function uebersicht(
  id: string,
  nachtrag?: { auftragsLvId: AuftragsLeistungsverzeichnisId; nummer: string },
): LvUebersicht {
  return {
    id: id as LeistungsverzeichnisId,
    name: id,
    ...(nachtrag === undefined ? {} : { nachtrag: { ...nachtrag, status: 'angemeldet' as const } }),
  };
}

describe('naechsteNachtragsnummer', () => {
  it('beginnt mit N01, wenn das Auftrags-LV noch keinen Nachtrag hat', () => {
    expect(naechsteNachtragsnummer([], A)).toBe('N01');
    expect(naechsteNachtragsnummer([uebersicht('lv'), uebersicht('n', { auftragsLvId: B, nummer: 'N01' })], A)).toBe(
      'N01',
    );
  });

  it('nimmt die höchste Nummer des Auftrags-LV plus 1, zweistellig, ab 100 dreistellig', () => {
    const lvs = [
      uebersicht('n1', { auftragsLvId: A, nummer: 'N01' }),
      uebersicht('n3', { auftragsLvId: A, nummer: 'N03' }),
      uebersicht('fremd', { auftragsLvId: B, nummer: 'N07' }),
    ];
    expect(naechsteNachtragsnummer(lvs, A)).toBe('N04');
    expect(naechsteNachtragsnummer([uebersicht('n', { auftragsLvId: A, nummer: 'N09' })], A)).toBe('N10');
    expect(naechsteNachtragsnummer([uebersicht('n', { auftragsLvId: A, nummer: 'N99' })], A)).toBe('N100');
  });

  it('übergeht frei vergebene Nummern, die nicht die Form N<Ziffern> haben', () => {
    const lvs = [
      uebersicht('x', { auftragsLvId: A, nummer: 'NT-5' }),
      uebersicht('y', { auftragsLvId: A, nummer: ' n02 ' }),
    ];
    expect(naechsteNachtragsnummer(lvs, A)).toBe('N03');
  });
});

describe('nachtragAnlegenPlanen', () => {
  const maske = ozMaskeLesen('NN.NN.NNNN[I]');
  if (!maske.ok) throw new Error(maske.fehler);
  const auftrag = {
    id: A,
    projektId: 'projekt' as ProjektId,
    name: 'Rohbau',
    ozMaske: maske.wert,
    mwstSatz: '7.00' as Prozent,
  };

  it('legt ein leeres LV mit Maske und MwSt des Auftrags-LV an und setzt die Nachtragsangaben (angemeldet)', () => {
    const lvs = [uebersicht('n1', { auftragsLvId: A, nummer: 'N01' })];
    const plan = nachtragAnlegenPlanen(auftrag, lvs, '  Kernbohrungen ', appIdQuelle());
    expect(plan.nummer).toBe('N02');
    const [anlegen, setzen] = plan.befehle;
    expect(anlegen).toMatchObject({
      art: 'LeistungsverzeichnisAnlegen',
      projektId: 'projekt',
      inhalt: {
        name: 'Nachtrag N02 – Kernbohrungen',
        ozMaske: maske.wert,
        mwstSatz: '7.00',
        nachlass: null,
        knoten: [],
      },
    });
    expect(anlegen?.art === 'LeistungsverzeichnisAnlegen' && anlegen.inhalt.wurzelId).toBe(plan.lvId);
    expect(setzen).toEqual({
      art: 'NachtragsangabenSetzen',
      nachtrag: { auftragsLvId: A, nummer: 'N02', status: 'angemeldet' },
    });
  });

  it('ohne Bezeichnung heißt das LV nur „Nachtrag N01“', () => {
    const plan = nachtragAnlegenPlanen(auftrag, [], '   ', appIdQuelle());
    expect(plan.befehle[0]).toMatchObject({ inhalt: { name: 'Nachtrag N01' } });
  });

  it('der Kern nimmt die Befehlsfolge an: danach ist das LV ein Nachtrags-LV', () => {
    const plan = nachtragAnlegenPlanen(auftrag, [], 'Mehrleistung', appIdQuelle());
    let z: LvZustand | null = null;
    for (const b of plan.befehle as readonly LvBefehl[]) {
      const r = lvBefehlAusfuehren(z, b);
      if (!r.ok) throw new Error(r.fehler.meldung);
      z = lvChangeSetAnwenden(z, r.wert);
    }
    expect(z?.leistungsverzeichnis.id).toBe(plan.lvId);
    expect(z?.leistungsverzeichnis.nachtrag).toEqual({ auftragsLvId: A, nummer: 'N01', status: 'angemeldet' });
    expect(z?.summen.gesamt.netto).toBe('0.00');
  });
});
