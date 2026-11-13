// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlag zurücknehmen (Ticket 138; Vertrag v1.7a, D-127.3, D-74): löscht das Auftrags-LV wie `LeistungsverzeichnisLoeschen`,
// gesperrt durch Nachträge, Aufmaßblätter, Rechnungen und Mängel; ein Rückgängig-Schritt stellt alles wieder her. Alle übrigen
// Befehle am Auftrags-LV reicht `auftragsLvBefehlAusfuehren` an den Kern weiter.

import {
  auftragsLvBefehlAusfuehren as imKern,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
} from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvZustand,
  Befehlsfehler,
  Kostengruppennummer,
  PositionId,
  Verweisanzahl,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { auftragsLvBefehlAusfuehren, zuschlagErteilen } from './index';
import {
  angebot,
  ep,
  erwarteOk,
  hinweis,
  liste,
  lv,
  position,
  projekt,
  prozent,
  satz,
  titel,
  zuschlagsposition,
} from './testhilfen';

const z = lv('lv-1', [
  titel('t1', 'lv-1', 0),
  position('p1', 't1', 0, '10.000'),
  hinweis('h1', 't1', 1),
  position('p2', 't1', 2, '5.000'),
  titel('t2', 'lv-1', 1),
  position('p3', 't2', 0, '2.000'),
  zuschlagsposition('z1', 't2', 1, liste('p1', 'p3')),
]);
const proj = projekt(['b-a']);
const a = angebot('a1', z, 'b-a', [ep('p1', '10.000'), ep('p2', '8.000'), ep('p3', '4.500'), satz('z1', '5.00')], prozent('2.00'));
const zuruecknehmen: AuftragsLvBefehl = { art: 'ZuschlagZuruecknehmen' };

/** Ein Auftrags-LV aus dem Zuschlag, angelegt vom Kern. */
function auftrag(): AuftragsLvZustand {
  const { befehl } = erwarteOk(zuschlagErteilen(z, a, proj, new Set(), 'auftrag-1' as AuftragsLeistungsverzeichnisId));
  const s = auftragsLvChangeSetAnwenden(null, erwarteOk(imKern(null, befehl)));
  if (s === null) throw new Error('Auftrags-LV fehlt');
  return s;
}

function fehler(
  zustand: AuftragsLvZustand | null,
  befehl: AuftragsLvBefehl,
  verweise?: readonly Verweisanzahl[],
): Befehlsfehler {
  const e = auftragsLvBefehlAusfuehren(zustand, befehl, verweise);
  if (e.ok) throw new Error('Fehlerwert erwartet');
  return e.fehler;
}

const sortiert = <T>(xs: readonly T[], id: (x: T) => string): T[] => [...xs].sort((x, y) => (id(x) < id(y) ? -1 : 1));

describe('ZuschlagZuruecknehmen', () => {
  it('ohne Verweise: Kopf vorher, nachher null; alle Knoten entfernt; alle Summen in summen.vorher', () => {
    const s = auftrag();
    const cs = erwarteOk(auftragsLvBefehlAusfuehren(s, zuruecknehmen, []));
    const { knoten, ...kopf } = s.auftragsLeistungsverzeichnis;
    expect(cs.art).toBe('auftrags-leistungsverzeichnis');
    expect(cs.auftragsLeistungsverzeichnisId).toBe('auftrag-1');
    expect(cs.kopf).toEqual({ vorher: kopf, nachher: null });
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: knoten });
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    expect(cs.summen.gesamt).toBeNull();
    expect(cs.summen.vorher.positionen).toEqual([]);
    expect(cs.summen.vorher.gliederungen).toEqual([]);
    expect(cs.summen.vorher.gesamt).toEqual(s.summen.gesamt);
    expect(sortiert(cs.summen.vorher.entfernt.positionen, (p) => p.positionId)).toEqual(
      sortiert(s.summen.positionen, (p) => p.positionId),
    );
    expect(sortiert(cs.summen.vorher.entfernt.gliederungen, (g) => g.gliederungId)).toEqual(
      sortiert(s.summen.gliederungen, (g) => g.gliederungId),
    );
    // Das Auftrags-LV trägt Summen von Positionen (vier) und Gliederungen (zwei): sie gehen alle mit.
    expect(cs.summen.vorher.entfernt.positionen).toHaveLength(4);
    expect(cs.summen.vorher.entfernt.gliederungen).toHaveLength(2);
    expect(cs.hinweise).toBeUndefined();
  });

  it('anwenden löscht das Auftrags-LV; ein Rückgängig-Schritt stellt es samt Summen exakt wieder her', () => {
    const s = auftrag();
    const cs = erwarteOk(auftragsLvBefehlAusfuehren(s, zuruecknehmen, []));
    expect(auftragsLvChangeSetAnwenden(s, cs)).toBeNull();
    const umkehrung = auftragsLvChangeSetUmkehren(cs);
    expect(umkehrung.kopf?.vorher).toBeNull();
    expect(auftragsLvChangeSetAnwenden(null, umkehrung)).toEqual(s);
    expect(auftragsLvChangeSetUmkehren(umkehrung)).toEqual(cs);
  });

  it('Angebote und eine Anzahl 0 sperren nicht; fehlende Arten zählen 0', () => {
    const s = auftrag();
    const verweise: Verweisanzahl[] = [
      { art: 'angebot', anzahl: 3 },
      { art: 'mangel', anzahl: 0 },
    ];
    expect(auftragsLvBefehlAusfuehren(s, zuruecknehmen, verweise).ok).toBe(true);
  });

  it('Nachträge, Aufmaßblätter, Rechnungen, Mängel sperren: verweise-vorhanden mit Art und Anzahl in fester Reihenfolge', () => {
    const f = fehler(auftrag(), zuruecknehmen, [
      { art: 'mangel', anzahl: 4 },
      { art: 'rechnung', anzahl: 1 },
      { art: 'angebot', anzahl: 2 },
      { art: 'aufmass', anzahl: 2 },
      { art: 'nachtrag', anzahl: 0 },
    ]);
    expect(f.code).toBe('verweise-vorhanden');
    expect(f.verweise).toEqual([
      { art: 'aufmass', anzahl: 2 },
      { art: 'rechnung', anzahl: 1 },
      { art: 'mangel', anzahl: 4 },
    ]);
    expect(fehler(auftrag(), zuruecknehmen, [{ art: 'nachtrag', anzahl: 1 }]).verweise).toEqual([
      { art: 'nachtrag', anzahl: 1 },
    ]);
  });

  it('ohne verweise → ungueltige-eingabe, feld verweise; ohne Auftrags-LV → nicht zuständig', () => {
    expect(fehler(auftrag(), zuruecknehmen)).toMatchObject({ code: 'ungueltige-eingabe', feld: 'verweise' });
    expect(fehler(null, zuruecknehmen, [])).toMatchObject({ code: 'befehl-nicht-zustaendig' });
  });
});

describe('übrige Befehle am Auftrags-LV gehen an den Kern', () => {
  it('AuftragsLeistungsverzeichnisAnlegen und KostengruppeSetzen: dasselbe Ergebnis wie im Kern', () => {
    const { befehl } = erwarteOk(zuschlagErteilen(z, a, proj, new Set(), 'auftrag-1' as AuftragsLeistungsverzeichnisId));
    expect(auftragsLvBefehlAusfuehren(null, befehl)).toEqual(imKern(null, befehl));
    const s = auftrag();
    const kg: AuftragsLvBefehl = {
      art: 'KostengruppeSetzen',
      positionId: 'p1' as PositionId,
      kostengruppe: '330' as Kostengruppennummer,
    };
    expect(auftragsLvBefehlAusfuehren(s, kg)).toEqual(imKern(s, kg));
    expect(auftragsLvBefehlAusfuehren(s, kg).ok).toBe(true);
  });
});
