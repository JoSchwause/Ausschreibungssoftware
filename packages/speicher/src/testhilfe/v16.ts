// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Aggregate aus `vertrag` v1.6 (Bauwerksmodell mit Modelldatei, Bauzeitenplan, Honorarberechnung, Mangel,
// Bautagebucheintrag) zum Projekt des Fixtures `typisch`, selbst verfasst (C4), dazu ein deterministischer Erzeuger großer
// Bauwerksmodelle in der Form von v1.6 (bis Ticket 107 `ifc` auf `Bauwerksmodell` abbildet; `speicher` darf `ifc` nicht
// importieren, A3). Die Werte sind Speicherbeispiele: `speicher` prüft nur Form und Bezüge, es rechnet nichts (A3).

import { createHash } from 'node:crypto';
import type {
  Bautagebucheintrag,
  BautagebucheintragChangeSet,
  BautagebucheintragId,
  Bauteil,
  Bauteilmenge,
  Bauwerksmodell,
  BauwerksmodellChangeSet,
  BauwerksmodellId,
  BauwerksmodellKopf,
  Bauzeitenplan,
  BauzeitenplanChangeSet,
  BauzeitenplanId,
  Betrag,
  Honorarberechnung,
  HonorarberechnungChangeSet,
  HonorarberechnungId,
  IfcGlobalId,
  KostenermittlungId,
  Kostengruppennummer,
  Mangel,
  MangelChangeSet,
  MangelId,
  Menge,
  ProjektId,
  Prozent,
  Strukturknoten,
  Vorgang,
  VorgangId,
} from '@tethys/vertrag';
import { ohne } from '../zeilen';
import { P } from './v14';

export const sha256 = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

const m = (x: string): Menge => x as Menge;
const pz = (x: string): Prozent => x as Prozent;
const btr = (x: string): Betrag => x as Betrag;

/** GlobalId der Form von `IfcGlobalId` (22 Zeichen aus dem IFC-Base64-Alphabet) aus einem Text und einer Zahl. */
export const gid = (art: string, n: number): IfcGlobalId =>
  `${art}$${n.toString(36)}`.padStart(22, '0').slice(-22) as IfcGlobalId;

// --- Bauwerksmodell -------------------------------------------------------------------------------------------------

/** Bytes einer kleinen „IFC-Datei“ (nur der Rahmen); `text` macht sie unterscheidbar. */
export const ifcBytes = (text: string): Uint8Array =>
  new TextEncoder().encode(
    `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((''),'2;1');\nFILE_NAME('${text}');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n`,
  );

const wandmengen = (n: number): Bauteilmenge[] => {
  const l = `${String(4 + (n % 5))}.${String(n % 1000).padStart(3, '0')}`;
  return [
    { satz: 'Qto_WallBaseQuantities', name: 'Length', art: 'laenge', wert: m(l) },
    { satz: 'Qto_WallBaseQuantities', name: 'Width', art: 'laenge', wert: m('0.240') },
    { satz: 'Qto_WallBaseQuantities', name: 'Height', art: 'laenge', wert: m('2.750') },
    { satz: 'Qto_WallBaseQuantities', name: 'GrossSideArea', art: 'flaeche', wert: m('13.750') },
    { satz: 'Qto_WallBaseQuantities', name: 'NetSideArea', art: 'flaeche', wert: m('11.250') },
    { satz: 'Qto_WallBaseQuantities', name: 'GrossVolume', art: 'volumen', wert: m('3.300') },
    { satz: 'Qto_WallBaseQuantities', name: 'NetVolume', art: 'volumen', wert: m('2.700') },
  ];
};
const oeffnungsmengen: Bauteilmenge[] = [
  { satz: 'Qto_WindowBaseQuantities', name: 'Width', art: 'laenge', wert: m('1.260') },
  { satz: 'Qto_WindowBaseQuantities', name: 'Height', art: 'laenge', wert: m('2.370') },
  { satz: 'Qto_WindowBaseQuantities', name: 'Area', art: 'flaeche', wert: m('2.986') },
];
const deckenmengen: Bauteilmenge[] = [
  { satz: 'Qto_SlabBaseQuantities', name: 'Width', art: 'laenge', wert: m('0.250') },
  { satz: 'Qto_SlabBaseQuantities', name: 'Perimeter', art: 'laenge', wert: m('24.000') },
  { satz: 'Qto_SlabBaseQuantities', name: 'GrossArea', art: 'flaeche', wert: m('36.000') },
  { satz: 'Qto_SlabBaseQuantities', name: 'NetArea', art: 'flaeche', wert: m('36.000') },
  { satz: 'Qto_SlabBaseQuantities', name: 'GrossVolume', art: 'volumen', wert: m('9.000') },
  { satz: 'Qto_SlabBaseQuantities', name: 'NetVolume', art: 'volumen', wert: m('9.000') },
];

/**
 * Struktur und Bauteile eines Modells mit `anzahl` Bauteilen auf `geschosse` Geschossen, gebaut wie der Erzeuger in
 * `fixtures/ifc/erzeugen.mjs` (Felder zu je sechs Bauteilen: Außenwand, Fenster, Innenwand, Tür, Innenwand, Deckenfeld; die
 * Mengensätze wie im Haus), deterministisch.
 */
export function modellinhalt(anzahl: number, geschosse = 10): Pick<Bauwerksmodell, 'struktur' | 'bauteile'> {
  const projekt = gid('Projekt', 0);
  const gebaeude = gid('Gebaeude', 0);
  const struktur: Strukturknoten[] = [
    { globalId: projekt, art: 'projekt', name: 'Projekt', elternGlobalId: null, mengen: [] },
    {
      globalId: gid('Grundstueck', 0),
      art: 'grundstueck',
      name: 'Grundstück',
      elternGlobalId: projekt,
      mengen: [],
    },
    {
      globalId: gebaeude,
      art: 'gebaeude',
      name: 'Gebäude',
      elternGlobalId: gid('Grundstueck', 0),
      mengen: [],
    },
  ];
  for (let g = 0; g < geschosse; g++)
    struktur.push({
      globalId: gid('Geschoss', g),
      art: 'geschoss',
      name: `${String(g)}. OG`,
      elternGlobalId: gebaeude,
      mengen: [
        {
          satz: 'Qto_BuildingStoreyBaseQuantities',
          name: 'GrossFloorArea',
          art: 'flaeche',
          wert: m('1240.000'),
        },
        {
          satz: 'Qto_BuildingStoreyBaseQuantities',
          name: 'GrossVolume',
          art: 'volumen',
          wert: m('3720.000'),
        },
      ],
    });
  const jeGeschoss = Math.ceil(anzahl / geschosse);
  const bauteile: Bauteil[] = [];
  for (let n = 0; n < anzahl; n++) {
    const art = n % 6;
    const strukturGlobalId = gid('Geschoss', Math.floor(n / jeGeschoss));
    const globalId = gid('Bauteil', n);
    const name = `Feld ${String(Math.floor(n / 6) + 1)}`;
    if (art === 0 || art === 2 || art === 4)
      bauteile.push({
        globalId,
        ifcKlasse: 'IfcWallStandardCase',
        name: `${art === 0 ? 'Außenwand' : 'Innenwand'} ${name}`,
        typ: art === 0 ? 'AW 24' : 'IW 11,5',
        strukturGlobalId,
        ...(art === 0 ? { kostengruppe: '331' as Kostengruppennummer } : {}),
        mengen: wandmengen(n),
      });
    else if (art === 1 || art === 3)
      bauteile.push({
        globalId,
        ifcKlasse: art === 1 ? 'IfcWindow' : 'IfcDoor',
        name: `${art === 1 ? 'Fenster' : 'Tür'} ${name}`,
        typ: null,
        strukturGlobalId,
        teilVonGlobalId: gid('Bauteil', n - 1),
        mengen: oeffnungsmengen,
      });
    else
      bauteile.push({
        globalId,
        ifcKlasse: 'IfcSlab',
        name: `Deckenfeld ${name}`,
        typ: 'DE 25',
        strukturGlobalId,
        kostengruppe: '351' as Kostengruppennummer,
        mengen: deckenmengen,
      });
  }
  return { struktur, bauteile };
}

/** Ein Bauwerksmodell des Projekts zu den Bytes `bytes` (deren Hash und Länge stehen in `datei`). */
export function modell(
  nr: number,
  bytes: Uint8Array,
  mehr: Partial<Bauwerksmodell> = {},
  anzahl = 6,
): Bauwerksmodell {
  return {
    id: `modell-${String(nr)}` as BauwerksmodellId,
    projektId: P,
    name: `Haus, Stand ${String(nr)}`,
    datei: { hash: sha256(bytes), dateiname: `haus-v${String(nr)}.ifc`, groesse: bytes.length },
    schema: 'IFC4',
    vorgaengerId: null,
    eingelesen: '2026-11-12',
    ...modellinhalt(anzahl, 2),
    ...mehr,
  };
}

export const kopfVon = (b: Bauwerksmodell): BauwerksmodellKopf => ohne(b, 'struktur', 'bauteile');

export const modellAnlegenCs = (b: Bauwerksmodell): BauwerksmodellChangeSet => ({
  art: 'bauwerksmodell',
  bauwerksmodellId: b.id,
  kopf: { vorher: null, nachher: kopfVon(b) },
  inhalt: { vorher: null, nachher: { struktur: b.struktur, bauteile: b.bauteile } },
});

export const modellLoeschenCs = (b: Bauwerksmodell): BauwerksmodellChangeSet => ({
  art: 'bauwerksmodell',
  bauwerksmodellId: b.id,
  kopf: { vorher: kopfVon(b), nachher: null },
  inhalt: { vorher: { struktur: b.struktur, bauteile: b.bauteile }, nachher: null },
});

export const modellUmbenennenCs = (b: Bauwerksmodell, name: string): BauwerksmodellChangeSet => ({
  art: 'bauwerksmodell',
  bauwerksmodellId: b.id,
  kopf: { vorher: kopfVon(b), nachher: { ...kopfVon(b), name } },
});

// --- Bauzeitenplan ----------------------------------------------------------------------------------------------------

const vid = (n: number): VorgangId => `vorgang-${String(n).padStart(4, '0')}` as VorgangId;

/** Vorgänge in Dokumentreihenfolge: je zehn ein Sammelvorgang mit neun Kindern in einer Kette (Ende-Anfang). */
export function vorgaenge(anzahl: number): Vorgang[] {
  const liste: Vorgang[] = [];
  for (let n = 0; n < anzahl; n++) {
    const sammel = n % 10 === 0;
    const eltern = sammel ? null : vid(n - (n % 10));
    liste.push({
      id: vid(n),
      nummer: sammel ? String(n / 10 + 1) : `${String(Math.floor(n / 10) + 1)}.${String(n % 10)}`,
      bezeichnung: sammel ? `Abschnitt ${String(n / 10 + 1)}` : `Vorgang ${String(n)}`,
      elternId: eltern,
      dauer: sammel ? 0 : (n % 7) + 1,
      vorgaenger:
        sammel || n % 10 === 1 ? [] : [{ vorgaengerId: vid(n - 1), art: 'ende-anfang', abstand: 0 }],
      fruehesterBeginn: null,
      bezug: null,
      ist: n % 10 === 1 ? { beginn: '2026-11-16', ende: null, fortschritt: pz('40.00') } : null,
    });
  }
  return liste;
}

export const bauzeitenplan = (nr: number, anzahl = 3, mehr: Partial<Bauzeitenplan> = {}): Bauzeitenplan => ({
  id: `plan-${String(nr)}` as BauzeitenplanId,
  projektId: P,
  name: `Plan ${String(nr)}`,
  projektbeginn: '2026-11-16',
  kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BY', freieTage: ['2026-12-24'] },
  vorgaenge: vorgaenge(anzahl),
  ...mehr,
});

export const planCs = (
  vorher: Bauzeitenplan | null,
  nachher: Bauzeitenplan | null,
): BauzeitenplanChangeSet => ({
  art: 'bauzeitenplan',
  bauzeitenplanId: (nachher ?? vorher)?.id ?? ('plan-?' as BauzeitenplanId),
  bauzeitenplan: { vorher, nachher },
});

// --- Honorarberechnung ----------------------------------------------------------------------------------------------

export function honorarberechnung(
  nr: number,
  kostenermittlungId: KostenermittlungId | null,
  mehr: Partial<Honorarberechnung> = {},
): Honorarberechnung {
  return {
    id: `honorar-${String(nr)}` as HonorarberechnungId,
    projektId: P,
    name: `Architekt ${String(nr)}`,
    objekte: [
      {
        bezeichnung: 'Wohnhaus',
        leistungsbild: 'gebaeude',
        honorarzone: 'III',
        honorarsatz: pz('0.00'),
        anrechenbareKosten:
          kostenermittlungId === null
            ? { art: 'betrag', betrag: btr('500000.00') }
            : {
                art: 'kostenermittlung',
                kostenermittlungId,
                technischeAnlagenAnteilig: true,
                weitereKosten: btr('0.00'),
                mitzuverarbeitendeBausubstanz: btr('0.00'),
              },
        leistungsphasen: [{ nummer: 1 }, { nummer: 2 }, { nummer: 3, anteil: pz('15.00') }],
        umbauzuschlagssatz: null,
      },
    ],
    nebenkosten: { art: 'prozent', satz: pz('5.00') },
    mwstSatz: pz('19.00'),
    ...mehr,
  };
}

export const honorarCs = (
  vorher: Honorarberechnung | null,
  nachher: Honorarberechnung | null,
): HonorarberechnungChangeSet => ({
  art: 'honorarberechnung',
  honorarberechnungId: (nachher ?? vorher)?.id ?? ('honorar-?' as HonorarberechnungId),
  honorarberechnung: { vorher, nachher },
});

// --- Mangel und Bautagebucheintrag ------------------------------------------------------------------------------------

export const mangel = (nr: number, mehr: Partial<Mangel> = {}, projektId: ProjektId = P): Mangel => ({
  id: `mangel-${String(nr)}` as MangelId,
  projektId,
  nummer: nr,
  titel: `Mangel ${String(nr)}`,
  beschreibung: null,
  ort: 'EG, Nordwand',
  auftragsLvId: null,
  positionId: null,
  bauteil: null,
  festgestellt: '2026-11-20',
  frist: '2026-12-04',
  verlauf: [{ status: 'offen', datum: '2026-11-20', bemerkung: null }],
  ...mehr,
});

export const mangelCs = (vorher: Mangel | null, nachher: Mangel | null): MangelChangeSet => ({
  art: 'mangel',
  mangelId: (nachher ?? vorher)?.id ?? ('mangel-?' as MangelId),
  mangel: { vorher, nachher },
});

export const tagebuch = (
  nr: number,
  datum: string,
  mehr: Partial<Bautagebucheintrag> = {},
): Bautagebucheintrag => ({
  id: `tag-${String(nr)}` as BautagebucheintragId,
  projektId: P,
  datum,
  wetter: { beschreibung: 'bedeckt', temperaturMin: -2, temperaturMax: 6 },
  arbeitskraefte: [{ firma: 'Muster Bau (erfunden)', anzahl: 6 }],
  geraete: null,
  leistungen: 'Mauerwerk EG',
  behinderungen: null,
  vorkommnisse: null,
  ...mehr,
});

export const tagebuchCs = (
  vorher: Bautagebucheintrag | null,
  nachher: Bautagebucheintrag | null,
): BautagebucheintragChangeSet => ({
  art: 'bautagebucheintrag',
  bautagebucheintragId: (nachher ?? vorher)?.id ?? ('tag-?' as BautagebucheintragId),
  bautagebucheintrag: { vorher, nachher },
});
