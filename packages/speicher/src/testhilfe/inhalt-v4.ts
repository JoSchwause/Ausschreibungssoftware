// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Inhalt der eingefrorenen Projektdatei der Schemaversion 4 (`fixtures/projektdatei-v4.json`), selbst
// verfasst (C4). Er beginnt mit dem Inhalt der Version 3 (`inhalt-v3.ts`) und bringt alles, was Version 4 (`vertrag`
// v1.3) neu speichert:
//  - im LV der Version 2 einen Mengenansatz an einer Position (`MengenansatzSetzen`), einen zweiten an einer Position,
//    die danach in den Papierkorb geht, und einen LV-Stand, der beide trägt;
//  - ein zweites LV aus einem Import (`LeistungsverzeichnisAnlegen`) mit EPA-Bezeichnungen (mit Lücke und leerer
//    Beschriftung, D-28) und einer Position mit Mengenansatz, ein Angebot dazu und das Auftrags-LV aus dem Zuschlag
//    (`AuftragsLeistungsverzeichnisAnlegen`) mit Auftragnehmer, EPA-Bezeichnungen und dem Mengenansatz.
//
// Die ChangeSets entstehen aus dem jeweils gespeicherten Stand (wie die App sie vom Kern bekäme). Die Beträge sind
// Speicherbeispiele (`speicher` rechnet nicht), aber von Hand nachvollziehbar (Kommentare).

import type {
  AngebotId,
  AngebotZustand,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Befehl,
  Betrag,
  BieterId,
  ChangeSet,
  Einheitspreis,
  ElternId,
  Gesamtsummen,
  LeistungsverzeichnisId,
  LvZustand,
  Menge,
  Ordnungszahl,
  Position,
  PositionId,
  Protokolleintrag,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import type { SpeicherKern } from '../kern';
import {
  angebotAnlegenChangeSet,
  auftragsLvAnlegenChangeSet,
  eintrag,
  lvAnlegenChangeSet,
  type Schritt,
} from './fixtures';
import { V2_LV, V2_PROJEKT } from './inhalt-v2';
import { schritteV3 } from './inhalt-v3';
import { wert } from './node';
import { ausBaumNehmen, feldAendern, standAnlegen } from './umkehrung';
import { ANSATZ, AUFTRAGNEHMER, EPA_BEZEICHNUNGEN } from './v13';

const id = (n: number): string => `019b7700-0000-7000-8000-${String(n).padStart(12, '0')}`;
const pid = (n: number): PositionId => id(100 + n) as PositionId;
const EINTRAG_3 = id(203);
export const V4_STAND = id(302);
export const V4_LV = id(401) as LeistungsverzeichnisId;
export const V4_ANGEBOT = id(402) as AngebotId;
export const V4_AUFTRAG = id(403) as AuftragsLeistungsverzeichnisId;
const TITEL = id(410) as TitelId;
const qid = (n: number): PositionId => id(420 + n) as PositionId;

const b = (x: string): Betrag => x as Betrag;
const ep = (x: string): Einheitspreis => x as Einheitspreis;

/** Zweiter Ansatz: 3 · 1,5 = 4,5. */
const ANSATZ_2 = [{ zeile: 1, formel: 91, ausdruck: '3*1,5', variable: null }] as const;

const summen = (netto: string, mwst: string, brutto: string): Gesamtsummen => ({
  netto: b(netto),
  nachlass: b('0.00'),
  nettoNachNachlass: b(netto),
  mwst: b(mwst),
  brutto: b(brutto),
  summeBedarfOhneGesamtbetrag: b('0.00'),
  summeWahl: b('0.00'),
});

const position = (n: number, elternId: string, mehr: Partial<Position>): Position => ({
  art: 'position',
  id: qid(n),
  elternId: elternId as ElternId,
  reihenfolge: n - 1,
  ordnungszahl: `01.000${String(n)}` as Ordnungszahl,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext: `Position ${String(n)} (erfunden)`,
  langtext: [],
  menge: null,
  einheit: 'm2',
  einheitspreis: null,
  epa: null,
  ...mehr,
});

/** LV aus einem Import: 12,000 m² · 10,000 = 120,00 und 5,000 m² · 2,000 = 10,00; Netto 130,00, MwSt 19 % 24,70. */
function lvV4(): LvZustand {
  const titel = TITEL as string;
  return {
    leistungsverzeichnis: {
      id: V4_LV,
      projektId: V2_PROJEKT,
      name: 'Importiert v4 (erfunden)',
      ozMaske: {
        gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
        position: { laenge: 4, zeichen: 'numerisch' },
        index: null,
        trennzeichen: '.',
      },
      mwstSatz: '19.00' as Prozent,
      nachlass: null,
      epaBezeichnungen: EPA_BEZEICHNUNGEN,
      knoten: [
        {
          art: 'titel',
          id: TITEL,
          elternId: V4_LV as ElternId,
          reihenfolge: 0,
          ordnungszahl: '01' as Ordnungszahl,
          kurztext: 'Titel (erfunden)',
        },
        position(1, titel, { menge: '12.000' as Menge, einheitspreis: ep('10.000'), mengenansatz: ANSATZ }),
        position(2, titel, { menge: '5.000' as Menge, einheitspreis: ep('2.000') }),
      ],
    },
    summen: {
      positionen: [
        { positionId: qid(1), gesamtpreis: b('120.00'), gehtInSummeEin: true },
        { positionId: qid(2), gesamtpreis: b('10.00'), gehtInSummeEin: true },
      ],
      gliederungen: [
        {
          gliederungId: TITEL,
          summe: b('130.00'),
          summeBedarfOhneGesamtbetrag: b('0.00'),
          summeWahl: b('0.00'),
        },
      ],
      gesamt: summen('130.00', '24.70', '154.70'),
    },
  };
}

/** Angebot von Bieter 2: 12 · 11,000 = 132,00 und 5 · 2,500 = 12,50; Netto 144,50, MwSt 27,46 (27,455 aufgerundet). */
function angebotV4(): AngebotZustand {
  return {
    angebot: {
      id: V4_ANGEBOT,
      projektId: V2_PROJEKT,
      leistungsverzeichnisId: V4_LV,
      bieterId: 'bieter-2' as BieterId,
      nachlass: null,
      positionen: [
        {
          positionId: qid(1),
          status: 'angeboten',
          einheitspreis: ep('11.000'),
          // Anteile nach den EPA-Bezeichnungen des LV: UPComp1 Lohn, UPComp2 Stoffe.
          epa: {
            lohn: ep('5.000'),
            stoffe: ep('6.000'),
            geraete: null,
            nachunternehmer: null,
            sonstiges: null,
            frei: null,
            freiBezeichnung: null,
          },
        },
        { positionId: qid(2), status: 'angeboten', einheitspreis: ep('2.500'), epa: null },
      ],
    },
    summen: {
      positionen: [
        { positionId: qid(1), gesamtpreis: b('132.00'), gehtInSummeEin: true },
        { positionId: qid(2), gesamtpreis: b('12.50'), gehtInSummeEin: true },
      ],
      gliederungen: [
        {
          gliederungId: TITEL,
          summe: b('144.50'),
          summeBedarfOhneGesamtbetrag: b('0.00'),
          summeWahl: b('0.00'),
        },
      ],
      gesamt: summen('144.50', '27.46', '171.96'),
    },
  };
}

/** Auftrags-LV aus dem Zuschlag auf das Angebot (D-21): EP des Bieters, Auftragnehmer am Kopf, Ansatz bleibt. */
function auftragV4(lv: LvZustand, a: AngebotZustand): AuftragsLvZustand {
  const { id: lvId, knoten, ...kopf } = lv.leistungsverzeichnis;
  const preis = new Map(
    a.angebot.positionen.map((p) => [p.positionId as string, p.status === 'angeboten' ? p : null]),
  );
  return {
    auftragsLeistungsverzeichnis: {
      ...kopf,
      id: V4_AUFTRAG,
      leistungsverzeichnisId: lvId,
      angebotId: a.angebot.id,
      name: 'Auftrag Importiert v4 (erfunden)',
      auftragnehmer: { ...AUFTRAGNEHMER, name: 'Beispiel AG (erfunden)' },
      knoten: knoten.map((k) => {
        const lage = k.elternId === lvId ? { elternId: V4_AUFTRAG as ElternId } : {};
        if (k.art !== 'position') return { ...k, ...lage };
        const p = preis.get(k.id);
        return { ...k, ...lage, einheitspreis: p?.einheitspreis ?? null, epa: p?.epa ?? null };
      }),
    },
    summen: a.summen,
  };
}

/** Wendet die Befehlsfolge der Version 4 an (über `kern`) und liefert alle Schritte, Version 3 eingeschlossen. */
export async function schritteV4(kern: SpeicherKern): Promise<Schritt[]> {
  const schritte = await schritteV3(kern);
  const schreibe = async (
    aggregat: Protokolleintrag['aggregat'],
    befehl: Befehl,
    changeSet: ChangeSet,
  ): Promise<void> => {
    const s: Schritt = { eintrag: eintrag(schritte.length + 1, V2_PROJEKT, aggregat, befehl), changeSet };
    wert(await kern.anwenden(s.eintrag, s.changeSet));
    schritte.push(s);
  };
  const amLv = { art: 'leistungsverzeichnis', id: V2_LV } as const;
  const lv = (): LvZustand => wert(kern.lvLaden(V2_LV));
  const position = (p: PositionId): Position => {
    const k = lv().leistungsverzeichnis.knoten.find((x): x is Position => x.id === p);
    if (k === undefined) throw new Error(`Position ${p} fehlt`);
    return k;
  };

  // Mengenansatz an Position 1: 2,5 · 4 = 10; 10 + 2 = 12 (die Menge bleibt 12,000, der GP 540,00).
  await schreibe(
    amLv,
    { art: 'MengenansatzSetzen', positionId: pid(1), mengenansatz: ANSATZ, menge: '12.000' as Menge },
    feldAendern(lv(), pid(1), { ...position(pid(1)), mengenansatz: ANSATZ }, '540.00'),
  );
  // Mengenansatz an Position 3 (4,5), dann ein Stand mit beiden Ansätzen, dann Position 3 in den Papierkorb.
  await schreibe(
    amLv,
    { art: 'MengenansatzSetzen', positionId: pid(3), mengenansatz: ANSATZ_2, menge: '4.500' as Menge },
    feldAendern(
      lv(),
      pid(3),
      { ...position(pid(3)), mengenansatz: ANSATZ_2, menge: '4.500' as Menge },
      '67.50',
    ),
  );
  await schreibe(
    amLv,
    { art: 'LvStandAnlegen', id: V4_STAND as never, name: 'Mit Mengenansatz' },
    standAnlegen(lv(), V4_STAND, 'Mit Mengenansatz'),
  );
  await schreibe(
    amLv,
    { art: 'KnotenInPapierkorbLegen', eintragId: EINTRAG_3 as never, knotenIds: [pid(3)] },
    ausBaumNehmen(lv(), [pid(3)], { id: EINTRAG_3, nummer: 3 }),
  );

  // Zweites LV (Import), Angebot, Auftrags-LV mit Auftragnehmer.
  const neu = lvV4();
  const { knoten, ...kopf } = neu.leistungsverzeichnis;
  await schreibe(
    { art: 'leistungsverzeichnis', id: V4_LV },
    {
      art: 'LeistungsverzeichnisAnlegen',
      id: V4_LV,
      projektId: V2_PROJEKT,
      inhalt: {
        name: kopf.name,
        ozMaske: kopf.ozMaske,
        mwstSatz: kopf.mwstSatz,
        nachlass: kopf.nachlass,
        epaBezeichnungen: EPA_BEZEICHNUNGEN,
        wurzelId: V4_LV,
        knoten,
      },
    },
    lvAnlegenChangeSet(neu),
  );
  const a = angebotV4();
  await schreibe(
    { art: 'angebot', id: V4_ANGEBOT },
    { art: 'AngebotAnlegen', angebot: a.angebot },
    angebotAnlegenChangeSet(a),
  );
  const au = auftragV4(neu, a);
  await schreibe(
    { art: 'auftrags-leistungsverzeichnis', id: V4_AUFTRAG },
    {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: au.auftragsLeistungsverzeichnis,
    },
    auftragsLvAnlegenChangeSet(au),
  );
  return schritte;
}
