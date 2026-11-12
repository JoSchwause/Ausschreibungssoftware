// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Inhalt der eingefrorenen Projektdatei der Schemaversion 6 (`fixtures/projektdatei-v6.json`), selbst verfasst
// (C4). Er beginnt mit dem Inhalt der Version 5 (`inhalt-v5.ts`) und bringt alles, was Version 6 (`vertrag` v1.6, Ticket 106)
// neu speichert:
//  - Bauteilzuordnungen an einer Position des LV und einer des Auftrags-LV;
//  - zwei Bauwerksmodelle mit ihren Modelldateien (der zweite Stand nennt den ersten als Vorgänger), das zweite umbenannt;
//  - einen Bauzeitenplan mit Sammelvorgang, zwei Vorgängen und einem Meilenstein (Bezug auf das Auftrags-LV), danach ein
//    Vorgang mit Ist-Terminen;
//  - eine Honorarberechnung, die auf die Kostenberechnung der Version 5 verweist;
//  - zwei Mängel (einer am Auftrags-LV und an einem Bauteil des ersten Modells, angezeigt, rückgängig gemacht und wiederholt);
//  - zwei Bautagebucheinträge.
// Die Werte sind Speicherbeispiele (`speicher` rechnet nicht); Namen und Firmen erfunden.

import type {
  Bautagebucheintrag,
  BautagebucheintragId,
  Bauteilzuordnung,
  Bauwerksmodell,
  BauwerksmodellId,
  Bauzeitenplan,
  BauzeitenplanId,
  Befehl,
  Betrag,
  ChangeSet,
  Honorarberechnung,
  HonorarberechnungId,
  LvZustand,
  Mangel,
  MangelId,
  Position,
  PositionId,
  Protokolleintrag,
  Prozent,
  VorgangId,
} from '@tethys/vertrag';
import type { SpeicherKern } from '../kern';
import { eintrag, type Schritt } from './fixtures';
import { V2_LV, V2_PROJEKT } from './inhalt-v2';
import { V4_AUFTRAG } from './inhalt-v4';
import { schritteV5, V5_KOSTENERMITTLUNG } from './inhalt-v5';
import { wert } from './node';
import { feldAendern, umkehren } from './umkehrung';
import { gid, ifcBytes, kopfVon, modellinhalt, sha256 } from './v16';

const id = (n: number): string => `019b7700-0000-7000-8000-${String(n).padStart(12, '0')}`;
const pid = (n: number): PositionId => id(100 + n) as PositionId;
const qid = (n: number): PositionId => id(420 + n) as PositionId;

export const V6_BYTES_1 = ifcBytes('haus-v1 (erfunden)');
export const V6_BYTES_2 = ifcBytes('haus-v2 (erfunden)');
export const V6_MODELL_1 = id(601) as BauwerksmodellId;
export const V6_MODELL_2 = id(602) as BauwerksmodellId;
export const V6_PLAN = id(610) as BauzeitenplanId;
export const V6_HONORAR = id(620) as HonorarberechnungId;
export const V6_MANGEL_1 = id(630) as MangelId;
export const V6_MANGEL_2 = id(631) as MangelId;
export const V6_TAG_1 = id(640) as BautagebucheintragId;
export const V6_TAG_2 = id(641) as BautagebucheintragId;

const pz = (x: string): Prozent => x as Prozent;
const btr = (x: string): Betrag => x as Betrag;
const vid = (n: number): VorgangId => id(650 + n) as VorgangId;

const inhalt = modellinhalt(12, 2);
const modell1: Bauwerksmodell = {
  id: V6_MODELL_1,
  projektId: V2_PROJEKT,
  name: 'Haus, Entwurf (erfunden)',
  datei: { hash: sha256(V6_BYTES_1), dateiname: 'haus-v1.ifc', groesse: V6_BYTES_1.length },
  schema: 'IFC4',
  vorgaengerId: null,
  eingelesen: '2026-11-12',
  ...inhalt,
};
const modell2: Bauwerksmodell = {
  ...modell1,
  id: V6_MODELL_2,
  name: 'Haus, Ausführung (erfunden)',
  datei: { hash: sha256(V6_BYTES_2), dateiname: 'haus-v2.ifc', groesse: V6_BYTES_2.length },
  schema: 'IFC2X3',
  vorgaengerId: V6_MODELL_1,
  eingelesen: '2026-11-19',
  bauteile: inhalt.bauteile.slice(0, 10),
};

export const V6_ZUORDNUNGEN: readonly Bauteilzuordnung[] = [
  { globalId: gid('Bauteil', 0), mengenart: 'NetVolume' },
  { globalId: gid('Bauteil', 6), mengenart: 'NetVolume' },
  { globalId: gid('Bauteil', 1), mengenart: 'Stueck' },
];

const plan: Bauzeitenplan = {
  id: V6_PLAN,
  projektId: V2_PROJEKT,
  name: 'Rohbau (erfunden)',
  projektbeginn: '2026-11-16',
  kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BY', freieTage: ['2026-12-24', '2026-12-31'] },
  vorgaenge: [
    {
      id: vid(1),
      nummer: '1',
      bezeichnung: 'Rohbau',
      elternId: null,
      dauer: 0,
      vorgaenger: [],
      fruehesterBeginn: null,
      bezug: { art: 'auftrags-leistungsverzeichnis', id: V4_AUFTRAG, knotenIds: null },
      ist: null,
    },
    {
      id: vid(2),
      nummer: '1.1',
      bezeichnung: 'Erdarbeiten',
      elternId: vid(1),
      dauer: 5,
      vorgaenger: [],
      fruehesterBeginn: '2026-11-18',
      bezug: { art: 'auftrags-leistungsverzeichnis', id: V4_AUFTRAG, knotenIds: [qid(1)] },
      ist: null,
    },
    {
      id: vid(3),
      nummer: '1.2',
      bezeichnung: 'Mauerwerk EG',
      elternId: vid(1),
      dauer: 10,
      vorgaenger: [{ vorgaengerId: vid(2), art: 'ende-anfang', abstand: -2 }],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
    {
      id: vid(4),
      nummer: null,
      bezeichnung: 'Rohbau fertig',
      elternId: null,
      dauer: 0,
      vorgaenger: [{ vorgaengerId: vid(3), art: 'ende-anfang', abstand: 0 }],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
  ],
};

const honorar: Honorarberechnung = {
  id: V6_HONORAR,
  projektId: V2_PROJEKT,
  name: 'Architekt, LPH 1–9 (erfunden)',
  objekte: [
    {
      bezeichnung: 'Umbau Wohnhaus',
      leistungsbild: 'gebaeude',
      honorarzone: 'III',
      honorarsatz: pz('50.00'),
      anrechenbareKosten: {
        art: 'kostenermittlung',
        kostenermittlungId: V5_KOSTENERMITTLUNG,
        technischeAnlagenAnteilig: true,
        weitereKosten: btr('18000.00'),
        mitzuverarbeitendeBausubstanz: btr('10000.00'),
      },
      leistungsphasen: [{ nummer: 1 }, { nummer: 2 }, { nummer: 3 }, { nummer: 8, anteil: pz('30.00') }],
      umbauzuschlagssatz: pz('20.00'),
    },
    {
      bezeichnung: 'Tragwerk',
      leistungsbild: 'tragwerksplanung',
      honorarzone: 'II',
      honorarsatz: pz('0.00'),
      anrechenbareKosten: { art: 'betrag', betrag: btr('120000.00') },
      leistungsphasen: [],
      umbauzuschlagssatz: null,
    },
  ],
  nebenkosten: { art: 'prozent', satz: pz('5.00') },
  mwstSatz: pz('19.00'),
};

const mangel1: Mangel = {
  id: V6_MANGEL_1,
  projektId: V2_PROJEKT,
  nummer: 1,
  titel: 'Putzriss (erfunden)',
  beschreibung: 'Haarriss über dem Fenstersturz',
  ort: 'EG, Nordwand',
  auftragsLvId: V4_AUFTRAG,
  positionId: qid(1),
  bauteil: { bauwerksmodellId: V6_MODELL_1, globalId: gid('Bauteil', 0) },
  festgestellt: '2026-11-20',
  frist: '2026-12-04',
  verlauf: [{ status: 'offen', datum: '2026-11-20', bemerkung: null }],
};
const mangel2: Mangel = {
  id: V6_MANGEL_2,
  projektId: V2_PROJEKT,
  nummer: 2,
  titel: 'Tür schleift (erfunden)',
  beschreibung: null,
  ort: null,
  auftragsLvId: null,
  positionId: null,
  bauteil: { bauwerksmodellId: null, globalId: gid('Bauteil', 3) },
  festgestellt: '2026-11-23',
  frist: null,
  verlauf: [
    { status: 'offen', datum: '2026-11-23', bemerkung: null },
    { status: 'angezeigt', datum: '2026-11-24', bemerkung: 'Mängelanzeige per Brief' },
  ],
};

const tag = (
  n: BautagebucheintragId,
  datum: string,
  mehr: Partial<Bautagebucheintrag>,
): Bautagebucheintrag => ({
  id: n,
  projektId: V2_PROJEKT,
  datum,
  wetter: { beschreibung: null, temperaturMin: null, temperaturMax: null },
  arbeitskraefte: [],
  geraete: null,
  leistungen: null,
  behinderungen: null,
  vorkommnisse: null,
  ...mehr,
});
const tag1 = tag(V6_TAG_1, '2026-11-23', {
  wetter: { beschreibung: 'bedeckt, trocken', temperaturMin: -2, temperaturMax: 6 },
  arbeitskraefte: [
    { firma: 'Muster Bau GmbH (erfunden)', anzahl: 6 },
    { firma: 'Elektro Beispiel (erfunden)', anzahl: 2 },
  ],
  geraete: 'Turmdrehkran, Minibagger',
  leistungen: 'Mauerwerk EG Achse 1–3',
  vorkommnisse: 'Besuch der Bauherrin',
});
const tag2 = tag(V6_TAG_2, '2026-11-24', { behinderungen: 'Frost, kein Mauern (angezeigt)' });

const keineSummen = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: { positionen: [], gliederungen: [] } },
} as const;

/** Wendet die Befehlsfolge der Version 6 an (über `kern`) und liefert alle Schritte, Version 5 eingeschlossen. */
export async function schritteV6(kern: SpeicherKern): Promise<Schritt[]> {
  const schritte = await schritteV5(kern);
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

  // Bauteilzuordnungen: im LV der Version 2 und im Auftrags-LV der Version 4.
  const lv = (): LvZustand => wert(kern.lvLaden(V2_LV));
  const p = lv().leistungsverzeichnis.knoten.find((k): k is Position => k.id === pid(1));
  if (p === undefined) throw new Error('Position fehlt');
  await schreibe(
    { art: 'leistungsverzeichnis', id: V2_LV },
    { art: 'BauteileZuordnen', positionId: p.id, bauteile: V6_ZUORDNUNGEN },
    { ...feldAendern(lv(), p.id, { ...p, bauteile: V6_ZUORDNUNGEN }, '0.00'), summen: keineSummen },
  );
  const q = wert(kern.auftragsLvLaden(V4_AUFTRAG)).auftragsLeistungsverzeichnis.knoten.find(
    (k): k is Position => k.id === qid(1),
  );
  if (q === undefined) throw new Error('Position im Auftrags-LV fehlt');
  const zweiZuordnungen = V6_ZUORDNUNGEN.slice(0, 2);
  await schreibe(
    { art: 'auftrags-leistungsverzeichnis', id: V4_AUFTRAG },
    { art: 'BauteileZuordnen', positionId: q.id, bauteile: zweiZuordnungen },
    {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: V4_AUFTRAG,
      kopf: null,
      knoten: {
        hinzugefuegt: [],
        geaendert: [{ vorher: q, nachher: { ...q, bauteile: zweiZuordnungen } }],
        entfernt: [],
      },
      summen: keineSummen,
    },
  );

  // Zwei Modellstände: erst die Bytes ablegen (kein Befehl), dann anlegen; der zweite wird umbenannt.
  for (const [m, bytes] of [
    [modell1, V6_BYTES_1],
    [modell2, V6_BYTES_2],
  ] as const) {
    wert(await kern.modelldateiAblegen(bytes));
    await schreibe(
      { art: 'bauwerksmodell', id: m.id },
      { art: 'BauwerksmodellAnlegen', bauwerksmodell: m },
      {
        art: 'bauwerksmodell',
        bauwerksmodellId: m.id,
        kopf: { vorher: null, nachher: kopfVon(m) },
        inhalt: { vorher: null, nachher: { struktur: m.struktur, bauteile: m.bauteile } },
      },
    );
  }
  const name = 'Haus, Ausführung Stand 2 (erfunden)';
  await schreibe(
    { art: 'bauwerksmodell', id: V6_MODELL_2 },
    { art: 'BauwerksmodellUmbenennen', name },
    {
      art: 'bauwerksmodell',
      bauwerksmodellId: V6_MODELL_2,
      kopf: { vorher: kopfVon(modell2), nachher: { ...kopfVon(modell2), name } },
    },
  );

  // Bauzeitenplan, dann Ist-Termine an den Erdarbeiten.
  const amPlan = { art: 'bauzeitenplan', id: V6_PLAN } as const;
  await schreibe(
    amPlan,
    { art: 'BauzeitenplanAnlegen', bauzeitenplan: plan },
    {
      art: 'bauzeitenplan',
      bauzeitenplanId: V6_PLAN,
      bauzeitenplan: { vorher: null, nachher: plan },
    },
  );
  const [rohbau, erd, ...rest] = plan.vorgaenge;
  if (rohbau === undefined || erd === undefined) throw new Error('Vorgänge fehlen');
  const erdIst = { ...erd, ist: { beginn: '2026-11-18', ende: null, fortschritt: pz('40.00') } };
  await schreibe(
    amPlan,
    { art: 'VorgangSetzen', vorgang: erdIst, nach: null },
    {
      art: 'bauzeitenplan',
      bauzeitenplanId: V6_PLAN,
      bauzeitenplan: { vorher: plan, nachher: { ...plan, vorgaenge: [rohbau, erdIst, ...rest] } },
    },
  );

  // Honorarberechnung mit Verweis auf die Kostenberechnung der Version 5.
  await schreibe(
    { art: 'honorarberechnung', id: V6_HONORAR },
    { art: 'HonorarberechnungAnlegen', honorarberechnung: honorar },
    {
      art: 'honorarberechnung',
      honorarberechnungId: V6_HONORAR,
      honorarberechnung: { vorher: null, nachher: honorar },
    },
  );

  // Mängel: Mangel 1 angezeigt, rückgängig gemacht und wiederholt; Mangel 2 nacherfasst.
  await schreibe(
    { art: 'mangel', id: V6_MANGEL_1 },
    { art: 'MangelAnlegen', mangel: mangel1 },
    {
      art: 'mangel',
      mangelId: V6_MANGEL_1,
      mangel: { vorher: null, nachher: mangel1 },
    },
  );
  const anzeige = { status: 'angezeigt', datum: '2026-11-21', bemerkung: null } as const;
  const angezeigt: ChangeSet = {
    art: 'mangel',
    mangelId: V6_MANGEL_1,
    mangel: { vorher: mangel1, nachher: { ...mangel1, verlauf: [...mangel1.verlauf, anzeige] } },
  };
  const amMangel = { art: 'mangel', id: V6_MANGEL_1 } as const;
  const original = await schreibe(amMangel, { art: 'MangelstatusSetzen', eintrag: anzeige }, angezeigt);
  await schreibe(amMangel, { art: 'Rueckgaengig', protokollId: original.eintrag.id }, umkehren(angezeigt));
  await schreibe(amMangel, { art: 'Wiederholen', protokollId: original.eintrag.id }, angezeigt);
  await schreibe(
    { art: 'mangel', id: V6_MANGEL_2 },
    { art: 'MangelAnlegen', mangel: mangel2 },
    {
      art: 'mangel',
      mangelId: V6_MANGEL_2,
      mangel: { vorher: null, nachher: mangel2 },
    },
  );

  // Bautagebuch.
  for (const t of [tag1, tag2])
    await schreibe(
      { art: 'bautagebucheintrag', id: t.id },
      { art: 'BautagebucheintragSetzen', eintrag: t },
      {
        art: 'bautagebucheintrag',
        bautagebucheintragId: t.id,
        bautagebucheintrag: { vorher: null, nachher: t },
      },
    );
  return schritte;
}
