// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Inhalt der eingefrorenen Projektdatei der Schemaversion 5 (`fixtures/projektdatei-v5.json`), selbst
// verfasst (C4). Er beginnt mit dem Inhalt der Version 4 (`inhalt-v4.ts`) und bringt alles, was Version 5 (`vertrag` v1.4,
// Ticket 79) neu speichert:
//  - im LV der Version 2 eine Kostengruppe und eine Textquelle an zwei Positionen, das Kennzeichen „Muster-LV“, einen
//    LV-Stand, der alles trägt, und die Position mit Textquelle danach im Papierkorb;
//  - ein Nachtrags-LV N01 zum Auftrags-LV der Version 4 (Nachtragsangaben „angeboten“), die Übernahme seiner Position in
//    das Auftrags-LV (`NachtragUebernehmen`), dann „beauftragt“; eine Kostengruppe im Auftrags-LV;
//  - zwei Aufmaßblätter (eines mit einer korrigierten Zeile, rückgängig gemacht und wiederholt), Abschlagsrechnung 1
//    (freigegeben) und Schlussrechnung 2, eine Kostenberechnung mit einem nachträglich gesetzten Eintrag.
//
// Die ChangeSets entstehen aus dem jeweils gespeicherten Stand (wie die App sie vom Kern bekäme). Die Beträge sind
// Speicherbeispiele (`speicher` rechnet nicht), aber von Hand nachvollziehbar (Kommentare).

import type {
  Aufmass,
  AufmassId,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Befehl,
  Betrag,
  ChangeSet,
  Einheitspreis,
  ElternId,
  Gesamtsummen,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LvZustand,
  Menge,
  Ordnungszahl,
  Position,
  PositionId,
  Protokolleintrag,
  Prozent,
  Rechnung,
  RechnungId,
  TitelId,
} from '@tethys/vertrag';
import type { SpeicherKern } from '../kern';
import { eintrag, lvAnlegenChangeSet, type Schritt } from './fixtures';
import { V2_LV, V2_PROJEKT } from './inhalt-v2';
import { schritteV4, V4_AUFTRAG } from './inhalt-v4';
import { wert } from './node';
import { ausBaumNehmen, feldAendern, kopfAendern, standAnlegen, umkehren } from './umkehrung';
import { ANSATZ } from './v13';

const id = (n: number): string => `019b7700-0000-7000-8000-${String(n).padStart(12, '0')}`;
const pid = (n: number): PositionId => id(100 + n) as PositionId;
const qid = (n: number): PositionId => id(420 + n) as PositionId;
export const V5_STAND = id(503);
const EINTRAG_4 = id(504);
export const V5_NACHTRAG = id(510) as LeistungsverzeichnisId;
const NACHTRAG_TITEL = id(511) as TitelId;
export const V5_NACHTRAGSPOSITION = id(512) as PositionId;
const NACHTRAG_GLIEDERUNG = id(513) as TitelId;
export const V5_BLATT_1 = id(520) as AufmassId;
export const V5_BLATT_2 = id(521) as AufmassId;
export const V5_RECHNUNG_1 = id(530) as RechnungId;
export const V5_RECHNUNG_2 = id(531) as RechnungId;
export const V5_KOSTENERMITTLUNG = id(540) as KostenermittlungId;

export const V5_KOSTENGRUPPE = '330' as Kostengruppennummer;
export const V5_TEXTQUELLE = 'Muster-LV Rohbau (erfunden)';

const b = (x: string): Betrag => x as Betrag;
const kg = (x: string): Kostengruppennummer => x as Kostengruppennummer;

const summen = (netto: string, mwst: string, brutto: string): Gesamtsummen => ({
  netto: b(netto),
  nachlass: b('0.00'),
  nettoNachNachlass: b(netto),
  mwst: b(mwst),
  brutto: b(brutto),
  summeBedarfOhneGesamtbetrag: b('0.00'),
  summeWahl: b('0.00'),
});

const keineSummen = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: { positionen: [], gliederungen: [] } },
} as const;

/** Nachtrags-LV N01: eine Position 2,000 m² · 15,000 = 30,00; MwSt 19 % 5,70; Brutto 35,70. */
function nachtragsLv(): LvZustand {
  return {
    leistungsverzeichnis: {
      id: V5_NACHTRAG,
      projektId: V2_PROJEKT,
      name: 'Nachtrag N01 (erfunden)',
      ozMaske: {
        gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
        position: { laenge: 4, zeichen: 'numerisch' },
        index: null,
        trennzeichen: '.',
      },
      mwstSatz: '19.00' as Prozent,
      nachlass: null,
      knoten: [
        {
          art: 'titel',
          id: NACHTRAG_TITEL,
          elternId: V5_NACHTRAG as ElternId,
          reihenfolge: 0,
          ordnungszahl: '01' as Ordnungszahl,
          kurztext: 'Mehrleistungen (erfunden)',
        },
        {
          art: 'position',
          id: V5_NACHTRAGSPOSITION,
          elternId: NACHTRAG_TITEL as ElternId,
          reihenfolge: 0,
          ordnungszahl: '01.0010' as Ordnungszahl,
          ozIndex: null,
          merkmale: {
            bedarf: null,
            wahl: null,
            stundenlohn: false,
            pauschal: false,
            zuschlagskennzeichen: false,
          },
          zuschlag: null,
          kurztext: 'Zusätzliche Abdichtung (erfunden)',
          langtext: [],
          menge: '2.000' as Menge,
          einheit: 'm2',
          einheitspreis: '15.000' as Einheitspreis,
          epa: null,
          kostengruppe: kg('330'),
        },
      ],
    },
    summen: {
      positionen: [{ positionId: V5_NACHTRAGSPOSITION, gesamtpreis: b('30.00'), gehtInSummeEin: true }],
      gliederungen: [
        {
          gliederungId: NACHTRAG_TITEL,
          summe: b('30.00'),
          summeBedarfOhneGesamtbetrag: b('0.00'),
          summeWahl: b('0.00'),
        },
      ],
      gesamt: summen('30.00', '5.70', '35.70'),
    },
  };
}

/**
 * `NachtragUebernehmen` (vereinfacht, D-35): eine neue Gliederung „Nachtrag N01“ (OZ 02) auf oberster Ebene des
 * Auftrags-LV mit der Position des Nachtrags-LV (Kennung wie dort). Netto 144,50 + 30,00 = 174,50; MwSt
 * round(174,50 × 19 %, 2) = 33,16 (33,155); Brutto 207,66.
 */
function nachtragUebernehmen(
  a: AuftragsLvZustand,
  n: LvZustand,
): { befehl: Befehl; cs: AuftragsLvChangeSet } {
  const quelle = n.leistungsverzeichnis.knoten.find((k): k is Position => k.id === V5_NACHTRAGSPOSITION);
  if (quelle === undefined) throw new Error('Nachtragsposition fehlt');
  const oben = a.auftragsLeistungsverzeichnis.knoten.filter((k) => k.elternId === V4_AUFTRAG).length;
  const knoten = [
    {
      art: 'titel' as const,
      id: NACHTRAG_GLIEDERUNG,
      elternId: V4_AUFTRAG as ElternId,
      reihenfolge: oben,
      ordnungszahl: '02' as Ordnungszahl,
      kurztext: 'Nachtrag N01',
    },
    { ...quelle, elternId: NACHTRAG_GLIEDERUNG as ElternId, ordnungszahl: '02.0010' as Ordnungszahl },
  ];
  return {
    befehl: { art: 'NachtragUebernehmen', nachtragLvId: V5_NACHTRAG, knoten },
    cs: {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: V4_AUFTRAG,
      kopf: null,
      knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
      summen: {
        positionen: [{ positionId: V5_NACHTRAGSPOSITION, gesamtpreis: b('30.00'), gehtInSummeEin: true }],
        gliederungen: [
          {
            gliederungId: NACHTRAG_GLIEDERUNG,
            summe: b('30.00'),
            summeBedarfOhneGesamtbetrag: b('0.00'),
            summeWahl: b('0.00'),
          },
        ],
        gesamt: summen('174.50', '33.16', '207.66'),
        vorher: {
          positionen: [],
          gliederungen: [],
          gesamt: a.summen.gesamt,
          entfernt: { positionen: [], gliederungen: [] },
        },
      },
    },
  };
}

/** Blatt 1: Position 01.0001 mit Ansatz (12,000), die Nachtragsposition von Hand (2,500). */
const blatt1: Aufmass = {
  id: V5_BLATT_1,
  projektId: V2_PROJEKT,
  auftragsLvId: V4_AUFTRAG,
  nummer: 1,
  bezeichnung: 'Blatt 1 (erfunden)',
  datum: '2026-11-02',
  positionen: [
    { positionId: qid(1), mengenansatz: ANSATZ, menge: '12.000' as Menge },
    { positionId: V5_NACHTRAGSPOSITION, mengenansatz: null, menge: '2.500' as Menge },
  ],
};

/** Blatt 2: Position 01.0002 von Hand (5,000), ohne Datum. */
const blatt2: Aufmass = {
  id: V5_BLATT_2,
  projektId: V2_PROJEKT,
  auftragsLvId: V4_AUFTRAG,
  nummer: 2,
  bezeichnung: '',
  datum: null,
  positionen: [{ positionId: qid(2), mengenansatz: null, menge: '5.000' as Menge }],
};

/**
 * Abschlagsrechnung 1 über Blatt 1, freigegeben. Zahlbetrag (jeder Schritt auf 2 Stellen, N2): Leistung 12,000 × 11,000 =
 * 132,00 und 2,500 × 15,000 = 37,50, zusammen 169,50; MwSt 32,21 (32,205); Brutto 201,71; Umlage 0,50 %: 1,01 (1,00855);
 * Sicherheitseinbehalt 5 %: 10,09 (10,0855); Zahlbetrag 201,71 − 1,01 − 10,09 = 190,61.
 */
const rechnung1: Rechnung = {
  id: V5_RECHNUNG_1,
  projektId: V2_PROJEKT,
  auftragsLvId: V4_AUFTRAG,
  nummer: 1,
  art: 'abschlag',
  eingang: '2026-11-05',
  rechnungsnummerAuftragnehmer: 'AR-2026-001',
  gefordert: { netto: b('169.50'), brutto: b('201.71'), zahlbetrag: null },
  aufmassIds: [V5_BLATT_1],
  umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50' as Prozent }],
  sicherheitSatz: '5.00' as Prozent,
  gewaehrleistungSatz: null,
  freigabe: null,
};

/** Schlussrechnung 2 über beide Blätter (kumuliert), mit Gewährleistungseinbehalt, noch nicht freigegeben. */
const rechnung2: Rechnung = {
  ...rechnung1,
  id: V5_RECHNUNG_2,
  nummer: 2,
  art: 'schluss',
  eingang: null,
  rechnungsnummerAuftragnehmer: null,
  gefordert: null,
  aufmassIds: [V5_BLATT_2, V5_BLATT_1],
  gewaehrleistungSatz: '3.00' as Prozent,
};

/** Kostenberechnung (D-38: Budget der Kostenkontrolle); Beträge erfunden, nur Nummern (G-16). */
const kostenberechnung: Kostenermittlung = {
  id: V5_KOSTENERMITTLUNG,
  projektId: V2_PROJEKT,
  stufe: 'kostenberechnung',
  name: 'Kostenberechnung Entwurf (erfunden)',
  eintraege: [
    { nummer: kg('330'), betrag: b('150.00'), bemerkung: 'Außenwände (erfunden)' },
    { nummer: kg('340'), betrag: b('20.00') },
  ],
};

/** Wendet die Befehlsfolge der Version 5 an (über `kern`) und liefert alle Schritte, Version 4 eingeschlossen. */
export async function schritteV5(kern: SpeicherKern): Promise<Schritt[]> {
  const schritte = await schritteV4(kern);
  const schreibe = async (
    aggregat: Protokolleintrag['aggregat'],
    befehl: Befehl,
    changeSet: ChangeSet,
  ): Promise<Schritt> => {
    const s: Schritt = { eintrag: eintrag(schritte.length + 1, V2_PROJEKT, aggregat, befehl), changeSet };
    wert(await kern.anwenden(s.eintrag, s.changeSet));
    schritte.push(s);
    return s;
  };
  const amLv = { art: 'leistungsverzeichnis', id: V2_LV } as const;
  const lv = (): LvZustand => wert(kern.lvLaden(V2_LV));
  const position = (p: PositionId): Position => {
    const k = lv().leistungsverzeichnis.knoten.find((x): x is Position => x.id === p);
    if (k === undefined) throw new Error(`Position ${p} fehlt`);
    return k;
  };
  const ohneSummen = (cs: ReturnType<typeof feldAendern>): ChangeSet => ({ ...cs, summen: keineSummen });

  // LV der Version 2: Kostengruppe, Textquelle, Muster-LV, Stand, dann die Position mit Textquelle in den Papierkorb.
  await schreibe(
    amLv,
    { art: 'KostengruppeSetzen', positionId: pid(1), kostengruppe: V5_KOSTENGRUPPE },
    ohneSummen(feldAendern(lv(), pid(1), { ...position(pid(1)), kostengruppe: V5_KOSTENGRUPPE }, '0.00')),
  );
  await schreibe(
    amLv,
    { art: 'TextquelleSetzen', positionId: pid(2), textquelle: V5_TEXTQUELLE },
    ohneSummen(feldAendern(lv(), pid(2), { ...position(pid(2)), textquelle: V5_TEXTQUELLE }, '0.00')),
  );
  const z = lv();
  await schreibe(
    amLv,
    { art: 'VorlageSetzen', vorlage: true },
    {
      ...kopfAendern(z, { vorlage: true }, z.summen.gesamt.netto),
      summen: keineSummen,
    },
  );
  await schreibe(
    amLv,
    { art: 'LvStandAnlegen', id: V5_STAND as never, name: 'Muster mit Kostengruppe' },
    standAnlegen(lv(), V5_STAND, 'Muster mit Kostengruppe'),
  );
  await schreibe(
    amLv,
    { art: 'KnotenInPapierkorbLegen', eintragId: EINTRAG_4 as never, knotenIds: [pid(2)] },
    ausBaumNehmen(lv(), [pid(2)], { id: EINTRAG_4, nummer: 4 }),
  );

  // Nachtrags-LV N01, Übernahme in das Auftrags-LV der Version 4, dann beauftragt.
  const n = nachtragsLv();
  const { knoten, ...kopf } = n.leistungsverzeichnis;
  const amNachtrag = { art: 'leistungsverzeichnis', id: V5_NACHTRAG } as const;
  await schreibe(
    amNachtrag,
    {
      art: 'LeistungsverzeichnisAnlegen',
      id: V5_NACHTRAG,
      projektId: V2_PROJEKT,
      inhalt: {
        name: kopf.name,
        ozMaske: kopf.ozMaske,
        mwstSatz: kopf.mwstSatz,
        nachlass: kopf.nachlass,
        wurzelId: V5_NACHTRAG,
        knoten,
      },
    },
    lvAnlegenChangeSet(n),
  );
  const angaben = { auftragsLvId: V4_AUFTRAG, nummer: 'N01', status: 'angeboten' } as const;
  await schreibe(
    amNachtrag,
    { art: 'NachtragsangabenSetzen', nachtrag: angaben },
    {
      ...kopfAendern(n, { nachtrag: angaben }, '30.00'),
      summen: keineSummen,
    },
  );
  const amAuftrag = { art: 'auftrags-leistungsverzeichnis', id: V4_AUFTRAG } as const;
  const auftrag = (): AuftragsLvZustand => wert(kern.auftragsLvLaden(V4_AUFTRAG));
  const uebernahme = nachtragUebernehmen(auftrag(), n);
  await schreibe(amAuftrag, uebernahme.befehl, uebernahme.cs);
  const nachtrag = wert(kern.lvLaden(V5_NACHTRAG));
  await schreibe(
    amNachtrag,
    { art: 'NachtragsangabenSetzen', nachtrag: { ...angaben, status: 'beauftragt' } },
    {
      ...kopfAendern(nachtrag, { nachtrag: { ...angaben, status: 'beauftragt' } }, '30.00'),
      summen: keineSummen,
    },
  );
  const p1 = auftrag().auftragsLeistungsverzeichnis.knoten.find((k): k is Position => k.id === qid(1));
  if (p1 === undefined) throw new Error('Position 01.0001 fehlt');
  await schreibe(
    amAuftrag,
    { art: 'KostengruppeSetzen', positionId: qid(1), kostengruppe: kg('340') },
    {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: V4_AUFTRAG,
      kopf: null,
      knoten: {
        hinzugefuegt: [],
        geaendert: [{ vorher: p1, nachher: { ...p1, kostengruppe: kg('340') } }],
        entfernt: [],
      },
      summen: keineSummen,
    },
  );

  // Zwei Aufmaßblätter; eine Korrektur auf Blatt 1 (2,400 statt 2,500), rückgängig gemacht und wiederholt.
  for (const blatt of [blatt1, blatt2])
    await schreibe(
      { art: 'aufmass', id: blatt.id },
      { art: 'AufmassAnlegen', aufmass: blatt },
      {
        art: 'aufmass',
        aufmassId: blatt.id,
        aufmass: { vorher: null, nachher: blatt },
      },
    );
  const zeile = { positionId: V5_NACHTRAGSPOSITION, mengenansatz: null, menge: '2.400' as Menge };
  const korrektur: ChangeSet = {
    art: 'aufmass',
    aufmassId: V5_BLATT_1,
    aufmass: {
      vorher: blatt1,
      nachher: { ...blatt1, positionen: [blatt1.positionen[0] ?? zeile, zeile] },
    },
  };
  const amBlatt1 = { art: 'aufmass', id: V5_BLATT_1 } as const;
  const original = await schreibe(amBlatt1, { art: 'AufmasspositionSetzen', position: zeile }, korrektur);
  await schreibe(amBlatt1, { art: 'Rueckgaengig', protokollId: original.eintrag.id }, umkehren(korrektur));
  await schreibe(amBlatt1, { art: 'Wiederholen', protokollId: original.eintrag.id }, korrektur);

  // Rechnung 1 anlegen und freigeben, Schlussrechnung 2 anlegen.
  await schreibe(
    { art: 'rechnung', id: V5_RECHNUNG_1 },
    { art: 'RechnungAnlegen', rechnung: rechnung1 },
    {
      art: 'rechnung',
      rechnungId: V5_RECHNUNG_1,
      rechnung: { vorher: null, nachher: rechnung1 },
    },
  );
  await schreibe(
    { art: 'rechnung', id: V5_RECHNUNG_1 },
    { art: 'RechnungFreigeben', zahlbetrag: b('190.61') },
    {
      art: 'rechnung',
      rechnungId: V5_RECHNUNG_1,
      rechnung: { vorher: rechnung1, nachher: { ...rechnung1, freigabe: { zahlbetrag: b('190.61') } } },
    },
  );
  await schreibe(
    { art: 'rechnung', id: V5_RECHNUNG_2 },
    { art: 'RechnungAnlegen', rechnung: rechnung2 },
    {
      art: 'rechnung',
      rechnungId: V5_RECHNUNG_2,
      rechnung: { vorher: null, nachher: rechnung2 },
    },
  );

  // Kostenberechnung anlegen, dann ein Eintrag 410 (an seine Stelle nach Nummer).
  const amKe = { art: 'kostenermittlung', id: V5_KOSTENERMITTLUNG } as const;
  await schreibe(
    amKe,
    { art: 'KostenermittlungAnlegen', kostenermittlung: kostenberechnung },
    {
      art: 'kostenermittlung',
      kostenermittlungId: V5_KOSTENERMITTLUNG,
      kostenermittlung: { vorher: null, nachher: kostenberechnung },
    },
  );
  const eintrag410 = { nummer: kg('410'), betrag: b('35.70') };
  await schreibe(
    amKe,
    { art: 'KostenermittlungseintragSetzen', eintrag: eintrag410 },
    {
      art: 'kostenermittlung',
      kostenermittlungId: V5_KOSTENERMITTLUNG,
      kostenermittlung: {
        vorher: kostenberechnung,
        nachher: { ...kostenberechnung, eintraege: [...kostenberechnung.eintraege, eintrag410] },
      },
    },
  );
  return schritte;
}
