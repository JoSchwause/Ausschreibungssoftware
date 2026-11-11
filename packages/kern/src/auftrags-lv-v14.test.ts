// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 71 (Vertrag v1.4): Befehle am Auftrags-LV, Anwenden und Umkehren seiner ChangeSets. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Knoten,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  Ordnungszahl,
  OzMaske,
} from '@tethys/vertrag';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import {
  KEINE_SUMMEN,
  PROJEKT_ID,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  posKnoten,
  sollwerteLesen,
  standardMaske,
  titelKnoten,
} from './testhilfen';

const fx = fixtureLesen('typisch');
const AID = fx.id as AuftragsLeistungsverzeichnisId;

function auftragsLv(ueber: Partial<AuftragsLeistungsverzeichnis> = {}): AuftragsLeistungsverzeichnis {
  const inh = fixtureAlsInhalt(fx);
  return {
    name: inh.name,
    ozMaske: inh.ozMaske,
    mwstSatz: inh.mwstSatz,
    nachlass: inh.nachlass,
    id: AID,
    projektId: PROJEKT_ID,
    leistungsverzeichnisId: 'lv-ausschreibung' as LeistungsverzeichnisId,
    angebotId: 'angebot-1' as AngebotId,
    knoten: inh.knoten,
    ...ueber,
  };
}

function anlegeCs(a: AuftragsLeistungsverzeichnis = auftragsLv()): AuftragsLvChangeSet {
  return erwarteOk(
    auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: a,
    }),
  );
}

/** Auftrags-LV als Zustand (über den Kern angelegt). */
function zustand(a: AuftragsLeistungsverzeichnis = auftragsLv()): AuftragsLvZustand {
  const z = auftragsLvChangeSetAnwenden(null, anlegeCs(a));
  if (z === null) throw new Error('kein Zustand');
  return z;
}

describe('auftragsLvChangeSetAnwenden und auftragsLvChangeSetUmkehren (Ticket 71, D-64.4)', () => {
  it('Anlegen anwenden ergibt das Auftrags-LV samt Summen = Neuberechnung; die Umkehrung entfernt es wieder', () => {
    const cs = anlegeCs();
    const z = zustand();
    expect(z.auftragsLeistungsverzeichnis.id).toBe(AID);
    expect(z.auftragsLeistungsverzeichnis.knoten).toHaveLength(fx.knoten.length);
    expect(z.summen).toEqual(summenBerechnen(z.auftragsLeistungsverzeichnis));
    const u = auftragsLvChangeSetUmkehren(cs);
    expect(u.art).toBe('auftrags-leistungsverzeichnis');
    expect(u.auftragsLeistungsverzeichnisId).toBe(AID);
    expect(u.kopf).toEqual({ vorher: cs.kopf?.nachher, nachher: null });
    expect(u.knoten.entfernt).toEqual(cs.knoten.hinzugefuegt);
    expect(auftragsLvChangeSetAnwenden(z, u)).toBeNull();
    // Die Umkehrung des Löschens legt es wieder an.
    expect(auftragsLvChangeSetAnwenden(null, auftragsLvChangeSetUmkehren(u))).toEqual(z);
  });

  it('ein ChangeSet ohne Kopf auf „kein Auftrags-LV“ ist ein Programmfehler', () => {
    const cs = anlegeCs();
    expect(() => auftragsLvChangeSetAnwenden(null, { ...cs, kopf: null })).toThrow();
  });
});

describe('AuftragsLeistungsverzeichnisAnlegen: nur Felder von AuftragsLvKopf im Kopf (D-42)', () => {
  it('nachtrag und vorlage eines LV (zur Laufzeit mitgebracht) landen nicht im Kopf des Auftrags-LV', () => {
    const mitLvKennzeichen = {
      ...auftragsLv(),
      nachtrag: { auftragsLvId: AID, nummer: 'N01', status: 'beauftragt' },
      vorlage: true,
      wurzelId: AID,
    } as AuftragsLeistungsverzeichnis;
    const kopf = anlegeCs(mitLvKennzeichen).kopf?.nachher;
    expect(Object.keys(kopf ?? {}).sort()).toEqual(
      [
        'angebotId',
        'id',
        'leistungsverzeichnisId',
        'mwstSatz',
        'nachlass',
        'name',
        'ozMaske',
        'projektId',
      ].sort(),
    );
  });

  it('die optionalen Felder des Kopfs (Auftraggeber, Vergabeinformationen, Auftragnehmer, EPA-Bezeichnungen) bleiben', () => {
    const a = auftragsLv({
      auftraggeber: { name: 'AG', strasse: null, plz: null, ort: null, vergabenummer: null },
      auftragnehmer: { name: 'AN', strasse: null, plz: null, ort: null },
      epaBezeichnungen: [{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }],
    });
    const kopf = anlegeCs(a).kopf?.nachher;
    expect(kopf?.auftraggeber).toEqual(a.auftraggeber);
    expect(kopf?.auftragnehmer).toEqual(a.auftragnehmer);
    expect(kopf?.epaBezeichnungen).toEqual(a.epaBezeichnungen);
    expect(kopf).not.toHaveProperty('vergabeinformationen');
  });
});

// --- Ticket 71: Befehle am bestehenden Auftrags-LV ------------------------------------------------------------------

const kg = (s: string) => s as Kostengruppennummer;
const oz = (s: string) => s as Ordnungszahl;
const NACHTRAG_LV = 'lv-nachtrag-n01' as LeistungsverzeichnisId;
const NT = 'nachtrag-n01';

/** Befehl ausführen und anwenden; wirft bei Fehlerwert oder wenn das Auftrags-LV verschwindet. */
function wende(z: AuftragsLvZustand, b: AuftragsLvBefehl): AuftragsLvZustand {
  const neu = auftragsLvChangeSetAnwenden(z, erwarteOk(auftragsLvBefehlAusfuehren(z, b)));
  if (neu === null) throw new Error('Auftrags-LV verschwunden');
  return neu;
}

function fehler(z: AuftragsLvZustand | null, b: AuftragsLvBefehl) {
  const e = auftragsLvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error(`angenommen: ${b.art}`);
  return e.fehler;
}

/**
 * Nachtrag N01 in der Lesart von `NachtragUebernehmen` (D-35, D-70.6): ein Titel „Nachtrag N01“ ans Ende der obersten Ebene
 * (`typisch` hat dort drei Titel, also `reihenfolge` 3, OZ 04), darunter ein Hinweistext und zwei Positionen.
 * GP N1 = 12,500 × 48,200 = 602,50; GP N2 = 3,000 × 215,750 = 647,25; Summe des Nachtrags 1.249,75.
 */
function nachtragKnoten(ueber: { wurzel?: Partial<Knoten>; reihenfolge?: number } = {}): Knoten[] {
  return [
    {
      ...titelKnoten(NT, AID, ueber.reihenfolge ?? 3),
      ordnungszahl: oz('04'),
      kurztext: 'Nachtrag N01',
      ...ueber.wurzel,
    } as Knoten,
    { art: 'hinweis', id: id.hinweis('n01-h'), elternId: id.eltern(NT), reihenfolge: 0, text: [] },
    posKnoten('n01-p1', NT, 1, '12.500', '48.200', {
      ordnungszahl: oz('04.0010'),
      einheit: 'm2',
      kostengruppe: kg('335'),
      textquelle: 'Nachtragsangebot',
    }),
    posKnoten('n01-p2', NT, 2, '3.000', '215.750', {
      ordnungszahl: oz('04.0020'),
      einheit: '',
      textquelle: '',
    }),
  ];
}

const uebernehmen = (knoten: readonly Knoten[] = nachtragKnoten()): AuftragsLvBefehl => ({
  art: 'NachtragUebernehmen',
  nachtragLvId: NACHTRAG_LV,
  knoten,
});

/** Eine Kette aus `tiefe` Titeln: der Nachtragstitel und darunter je ein weiterer. */
function titelkette(tiefe: number): Knoten[] {
  const kette: Knoten[] = [{ ...titelKnoten(NT, AID, 3), ordnungszahl: oz('04') }];
  for (let i = 1; i < tiefe; i++) {
    const eltern = kette[i - 1]?.id ?? NT;
    kette.push(titelKnoten(`n01-t${String(i)}`, eltern, 0));
  }
  return kette;
}

describe('NachtragUebernehmen (D-35, D-70.6)', () => {
  it('Golden an typisch: Netto danach = Netto vorher + Summe des Nachtrags; Nachlass, MwSt, Brutto nach N2/N5', () => {
    const soll = sollwerteLesen('typisch');
    const z = zustand();
    expect(z.summen.gesamt).toMatchObject(soll.summen);
    const cs = erwarteOk(auftragsLvBefehlAusfuehren(z, uebernehmen()));
    expect(cs.art).toBe('auftrags-leistungsverzeichnis');
    expect(cs.auftragsLeistungsverzeichnisId).toBe(AID);
    expect(cs.kopf).toBeNull();
    expect(cs.knoten.hinzugefuegt.map((k) => k.id)).toEqual([NT, 'n01-h', 'n01-p1', 'n01-p2']);
    expect(cs.knoten.geaendert).toEqual([]);
    // 55.465,59 + 1.249,75 = 56.715,34; Nachlass 2 % = 1.134,3068 → 1.134,31; Netto n. N. 55.581,03;
    // MwSt 19 % = 10.560,3957 → 10.560,40; Brutto 66.141,43 (N2: je Schritt auf 2 Stellen; N5).
    expect(cs.summen.gesamt).toMatchObject({
      netto: '56715.34',
      nachlass: '1134.31',
      nettoNachNachlass: '55581.03',
      mwst: '10560.40',
      brutto: '66141.43',
    });
    expect(cs.summen.vorher.gesamt).toEqual(z.summen.gesamt);
    // A6: nur der neue Teilbaum und die Gesamtsumme, keine Summe des vorhandenen Baums.
    expect(cs.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['n01-p1', '602.50'],
      ['n01-p2', '647.25'],
    ]);
    expect(cs.summen.gliederungen.map((g) => [g.gliederungId, g.summe])).toEqual([[NT, '1249.75']]);
    expect(cs.summen.vorher.positionen).toEqual([]);
    expect(cs.summen.vorher.gliederungen).toEqual([]);

    const neu = wende(z, uebernehmen());
    expect(neu.summen).toEqual(summenBerechnen(neu.auftragsLeistungsverzeichnis));
    expect(pruefeLvInvarianten(neu.auftragsLeistungsverzeichnis)).toEqual([]);
    expect(neu.auftragsLeistungsverzeichnis.knoten.at(-4)?.id).toBe(NT);
  });

  it('übernimmt die Knoten wie mitgebracht (Kennungen, OZ, Kostengruppe, Textquelle); "" als Einheit/Textquelle fällt weg', () => {
    const neu = wende(zustand(), uebernehmen());
    const p1 = neu.auftragsLeistungsverzeichnis.knoten.find((k) => k.id === 'n01-p1');
    const p2 = neu.auftragsLeistungsverzeichnis.knoten.find((k) => k.id === 'n01-p2');
    expect(p1).toMatchObject({
      ordnungszahl: '04.0010',
      kostengruppe: '335',
      textquelle: 'Nachtragsangebot',
    });
    expect(p2?.art === 'position' && p2.einheit).toBeNull();
    expect(p2).not.toHaveProperty('textquelle');
  });

  it('die Umkehrung entfernt den Nachtrag wieder und stellt Knoten und Summen exakt her', () => {
    const z = zustand();
    const cs = erwarteOk(auftragsLvBefehlAusfuehren(z, uebernehmen()));
    const neu = wende(z, uebernehmen());
    const u = auftragsLvChangeSetUmkehren(cs);
    expect(u.knoten.entfernt).toEqual(cs.knoten.hinzugefuegt);
    expect(auftragsLvChangeSetAnwenden(neu, u)).toEqual(z);
  });

  it('zweite Übernahme desselben Nachtrags: id-vergeben', () => {
    const neu = wende(zustand(), uebernehmen());
    const f = fehler(neu, uebernehmen(nachtragKnoten({ reihenfolge: 4 })));
    expect(f.code).toBe('id-vergeben');
    expect(f.knotenId).toBe(NT);
    // Auch eine einzelne Position mit vorhandener Kennung sperrt.
    const vorhanden = fx.knoten.find((k) => k.art === 'position')?.id ?? '';
    const mitAlterPosition = nachtragKnoten().map((k): Knoten =>
      k.id === 'n01-p2' ? ({ ...k, id: id.pos(vorhanden) } as Knoten) : k,
    );
    expect(fehler(zustand(), uebernehmen(mitAlterPosition)).code).toBe('id-vergeben');
  });

  it('sechste Ebene: ebene-ueberschritten (der Nachtragstitel zählt mit)', () => {
    expect(auftragsLvBefehlAusfuehren(zustand(), uebernehmen(titelkette(5))).ok).toBe(true);
    expect(fehler(zustand(), uebernehmen(titelkette(6))).code).toBe('ebene-ueberschritten');
  });

  it('F1: ein Los neben Titeln auf oberster Ebene und ein Titel unter einer Los-Stufe: knotenart-unzulaessig', () => {
    const los = nachtragKnoten({ wurzel: { art: 'los' } });
    expect(fehler(zustand(), uebernehmen(los)).code).toBe('knotenart-unzulaessig');
    const MIT_LOS: OzMaske = { ...standardMaske, losStufe: true };
    const mitLosen = zustand(
      auftragsLv({
        ozMaske: MIT_LOS,
        knoten: [
          {
            art: 'los',
            id: id.los('L1'),
            elternId: id.eltern(AID),
            reihenfolge: 0,
            ordnungszahl: null,
            kurztext: 'Los 1',
          },
        ],
      }),
    );
    expect(fehler(mitLosen, uebernehmen(nachtragKnoten({ reihenfolge: 1 }))).code).toBe(
      'knotenart-unzulaessig',
    );
    const alsLos = nachtragKnoten({ reihenfolge: 1, wurzel: { art: 'los' } });
    expect(auftragsLvBefehlAusfuehren(mitLosen, uebernehmen(alsLos)).ok).toBe(true);
  });

  it('Form des Teilbaums: genau eine Gliederung als Wurzel, ans Ende der obersten Ebene, Eltern vor Kindern, dicht', () => {
    const z = zustand();
    const [wurzel, h, p1, p2] = nachtragKnoten();
    if (!wurzel || !h || !p1 || !p2) throw new Error('Testdaten');
    expect(fehler(z, uebernehmen([])).code).toBe('ungueltige-eingabe');
    expect(fehler(z, uebernehmen(nachtragKnoten({ reihenfolge: 2 }))).feld).toBe('reihenfolge');
    expect(fehler(z, uebernehmen([wurzel, h, p2, { ...p1, reihenfolge: 3 }])).feld).toBe('reihenfolge');
    expect(fehler(z, uebernehmen([h, wurzel, p1, p2])).code).toBe('ungueltige-eingabe');
    const zweiWurzeln = [...nachtragKnoten(), { ...titelKnoten('n01-x', AID, 4), ordnungszahl: oz('05') }];
    expect(fehler(z, uebernehmen(zweiWurzeln)).code).toBe('ungueltige-eingabe');
    const ersterTitel = id.eltern(fx.knoten[0]?.id ?? '');
    const unterTitel = nachtragKnoten({ wurzel: { elternId: ersterTitel }, reihenfolge: 0 });
    expect(fehler(z, uebernehmen(unterTitel)).code).toBe('ungueltige-eingabe');
    const elternFehlt = nachtragKnoten({ wurzel: { elternId: id.eltern('gibt-es-nicht') } });
    expect(fehler(z, uebernehmen(elternFehlt)).code).toBe('eltern-unbekannt');
    const positionAlsWurzel = posKnoten('n01-p9', AID, 3, '1.000', '1.000');
    expect(fehler(z, uebernehmen([positionAlsWurzel])).code).toBe('knotenart-unzulaessig');
    const kgFalsch = nachtragKnoten().map((k) => (k.id === 'n01-p1' ? { ...k, kostengruppe: kg('33') } : k));
    expect(fehler(z, uebernehmen(kgFalsch)).feld).toBe('kostengruppe');
  });

  it('ohne Auftrags-LV als Zustand: befehl-nicht-zustaendig', () => {
    expect(fehler(null, uebernehmen()).code).toBe('befehl-nicht-zustaendig');
  });
});

describe('KostengruppeSetzen im Auftrags-LV (D-70.1)', () => {
  const erstePosition = fx.knoten.find((k) => k.art === 'position')?.id ?? '';
  const setze = (positionId: string, kostengruppe: string | null): AuftragsLvBefehl => ({
    art: 'KostengruppeSetzen',
    positionId: id.pos(positionId),
    kostengruppe: kostengruppe === null ? null : kg(kostengruppe),
  });

  it('eine Knotenänderung der Position, keine Summen; null entfernt; Umkehrung stellt her', () => {
    const z = zustand();
    const cs = erwarteOk(auftragsLvBefehlAusfuehren(z, setze(erstePosition, '391')));
    expect(cs.kopf).toBeNull();
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect(cs.knoten.geaendert[0]?.nachher).toMatchObject({ id: erstePosition, kostengruppe: '391' });
    const z1 = wende(z, setze(erstePosition, '391'));
    expect(auftragsLvChangeSetAnwenden(z1, auftragsLvChangeSetUmkehren(cs))).toEqual(z);
    expect(wende(z1, setze(erstePosition, null))).toEqual(z);
    expect(erwarteOk(auftragsLvBefehlAusfuehren(z, setze(erstePosition, null))).knoten.geaendert).toEqual([]);
  });

  it('Fehler: Kostengruppe an Gliederung, falsche Form, kein Zustand', () => {
    const z = zustand();
    const titel = fx.knoten.find((k) => k.art === 'titel')?.id ?? '';
    expect(fehler(z, setze(titel, '391')).code).toBe('knoten-unbekannt');
    expect(fehler(z, setze(erstePosition, '39')).code).toBe('ungueltige-eingabe');
    expect(fehler(null, setze(erstePosition, '391')).code).toBe('befehl-nicht-zustaendig');
  });
});

describe('AuftragsLeistungsverzeichnisAnlegen mit Kostengruppe und Textquelle', () => {
  it('übernimmt beide Felder, lässt "" als Textquelle weg und weist eine Kostengruppe in falscher Form ab', () => {
    const knoten = [
      posKnoten('A1', AID, 0, null, null, { kostengruppe: kg('330'), textquelle: 'Muster-LV' }),
      posKnoten('A2', AID, 1, null, null, { textquelle: '' }),
    ];
    const cs = anlegeCs(auftragsLv({ knoten }));
    expect(cs.knoten.hinzugefuegt[0]).toMatchObject({ kostengruppe: '330', textquelle: 'Muster-LV' });
    expect(cs.knoten.hinzugefuegt[1]).not.toHaveProperty('textquelle');
    const falsch = auftragsLv({ knoten: [posKnoten('A1', AID, 0, null, null, { kostengruppe: kg('1') })] });
    const e = auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: falsch,
    });
    expect(!e.ok && [e.fehler.code, e.fehler.feld]).toEqual(['ungueltige-eingabe', 'kostengruppe']);
  });
});
