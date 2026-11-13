// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 105 (Vertrag v1.6 Punkt 3; X1c, D-52, D-97.7): `BauteileZuordnen` im LV und im Auftrags-LV, die Zuordnungen an
// Anlege-, Kopier-, Verschiebe- und Papierkorbbefehlen. Zuerst geschrieben (Q1). Ersetzt die Abweisungen bis Ticket 105
// (`vertrag-v16.test.ts`).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvZustand,
  Bauteilzuordnung,
  IfcGlobalId,
  Knoten,
  LeistungsverzeichnisId,
  LvBefehl,
  LvStandId,
  LvZustand,
  Menge,
  Ordnungszahl,
  PapierkorbeintragId,
  Position,
} from '@tethys/vertrag';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
  changeSetUmkehren,
  kopieBauen,
  lvBefehlAusfuehren,
  pruefeLvInvarianten,
} from './index';
import {
  KEINE_SUMMEN,
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  id,
  inhalt,
  lvMit,
  posKnoten,
  positionsdaten,
  titelKnoten,
} from './testhilfen';

// --- Hilfen ---------------------------------------------------------------------------------------------------------

/** Eine GlobalId in Form (22 Zeichen aus `0-9A-Za-z_$`), lesbar aus einem Stamm und einer Nummer gebaut. */
const gid = (stamm: string, nr = 0): IfcGlobalId => {
  const s = `${stamm}${nr.toString(36)}`;
  return (s + '_'.repeat(22)).slice(0, 22) as IfcGlobalId;
};
const zu = (globalId: IfcGlobalId, mengenart = 'NetVolume'): Bauteilzuordnung => ({ globalId, mengenart });

const WAND = gid('Wand$Aussen_EG');
const DECKE = gid('Decke_OG');
const ZWEI: readonly Bauteilzuordnung[] = [zu(WAND), zu(DECKE, 'NetArea')];

/** T1 mit P1, P2 und H1, T2 leer. */
function basis(knoten: readonly Knoten[] = []): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000'),
    posKnoten('P2', 'T1', 1, '3.000', '5.000'),
    { art: 'hinweis', id: id.hinweis('H1'), elternId: id.eltern('T1'), reihenfolge: 2, text: [] },
    titelKnoten('T2', LV_ID, 1),
    ...knoten,
  ]);
}

const setze = (positionId: string, bauteile: readonly Bauteilzuordnung[] | null): LvBefehl => ({
  art: 'BauteileZuordnen',
  positionId: id.pos(positionId),
  bauteile,
});

const fehler = (z: LvZustand, b: LvBefehl) => {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error(`angenommen: ${b.art}`);
  return e.fehler;
};

/** Befehl ausführen, anwenden, Umkehrung prüfen; liefert den neuen Zustand. */
function wendeMitUmkehr(z: LvZustand, b: LvBefehl): LvZustand {
  const cs = erwarteOk(lvBefehlAusfuehren(z, b));
  const neu = anwenden(z, cs);
  expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  return neu;
}

const position = (z: LvZustand, kennung: string): Position => {
  const p = z.leistungsverzeichnis.knoten.find((k) => k.id === kennung);
  if (p?.art !== 'position') throw new Error(`keine Position: ${kennung}`);
  return p;
};

// --- BauteileZuordnen im LV -----------------------------------------------------------------------------------------

describe('BauteileZuordnen im LV (D-52)', () => {
  it('setzt die ganze Liste an der Position: eine Knotenänderung, keine Summen, kein Kopf; umkehrbar', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setze('P1', ZWEI)));
    expect(cs.kopf).toBeNull();
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect(cs.knoten.geaendert[0]?.vorher).toEqual(position(z, 'P1'));
    expect(cs.knoten.geaendert[0]?.nachher).toEqual({ ...position(z, 'P1'), bauteile: ZWEI });
    const neu = wendeMitUmkehr(z, setze('P1', ZWEI));
    expect(position(neu, 'P1').bauteile).toEqual(ZWEI);
    expect(position(neu, 'P2').bauteile).toBeUndefined();
    expect(neu.summen).toEqual(z.summen);
    expect(pruefeLvInvarianten(neu.leistungsverzeichnis, neu.papierkorb)).toEqual([]);
  });

  it('ersetzt die Liste ganz, in der genannten Reihenfolge', () => {
    const z1 = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    const andere = [zu(DECKE, 'NetArea'), zu(gid('Stuetze'), 'Stueck')];
    const z2 = wendeMitUmkehr(z1, setze('P1', andere));
    expect(position(z2, 'P1').bauteile).toEqual(andere);
    const umgedreht = [...ZWEI].reverse();
    expect(position(wendeMitUmkehr(z1, setze('P1', umgedreht)), 'P1').bauteile).toEqual(umgedreht);
  });

  it('null und [] entfernen die Zuordnungen (das Feld fehlt danach, nie [] im Zustand)', () => {
    const z1 = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    for (const leer of [null, []]) {
      const z2 = wendeMitUmkehr(z1, setze('P1', leer));
      expect('bauteile' in position(z2, 'P1'), JSON.stringify(leer)).toBe(false);
      expect(z2).toEqual(basis());
    }
  });

  it('derselbe Wert ist keine Änderung: leeres ChangeSet', () => {
    const z = basis();
    expect(erwarteOk(lvBefehlAusfuehren(z, setze('P1', null))).knoten.geaendert).toEqual([]);
    expect(erwarteOk(lvBefehlAusfuehren(z, setze('P1', []))).knoten.geaendert).toEqual([]);
    const z1 = wendeMitUmkehr(z, setze('P1', ZWEI));
    expect(erwarteOk(lvBefehlAusfuehren(z1, setze('P1', [...ZWEI]))).knoten.geaendert).toEqual([]);
  });

  it('nur an einer Position: Gliederung und Hinweistext knotenart-unzulaessig, unbekannt knoten-unbekannt', () => {
    const z = basis();
    for (const [k, code] of [
      ['T1', 'knotenart-unzulaessig'],
      ['H1', 'knotenart-unzulaessig'],
      ['gibt-es-nicht', 'knoten-unbekannt'],
    ] as const) {
      const f = fehler(z, setze(k, ZWEI));
      expect(f.code, k).toBe(code);
      expect(f.knotenId).toBe(k);
    }
  });

  it('dasselbe Paar (GlobalId, Mengenart) zweimal: ungueltige-eingabe mit feld bauteile', () => {
    const f = fehler(basis(), setze('P1', [zu(WAND), zu(DECKE), zu(WAND)]));
    expect(f.code).toBe('ungueltige-eingabe');
    expect(f.feld).toBe('bauteile');
    expect(f.knotenId).toBe('P1');
  });

  it('dieselbe GlobalId mit zwei Mengenarten und dieselbe Mengenart an zwei Bauteilen sind erlaubt', () => {
    const liste = [
      zu(WAND, 'NetVolume'),
      zu(WAND, 'NetSideArea'),
      zu(DECKE, 'NetVolume'),
      zu(WAND, 'Stueck'),
    ];
    expect(position(wendeMitUmkehr(basis(), setze('P1', liste)), 'P1').bauteile).toEqual(liste);
  });

  it('Form: GlobalId 22 Zeichen aus 0-9A-Za-z_$, Mengenart ein nicht leerer Text, die Liste eine Liste von Objekten', () => {
    const z = basis();
    const falsch: unknown[] = [
      [{ globalId: WAND.slice(0, 21), mengenart: 'NetVolume' }],
      [{ globalId: `${WAND}x`, mengenart: 'NetVolume' }],
      [{ globalId: `${WAND.slice(0, 21)}-`, mengenart: 'NetVolume' }],
      [{ globalId: `${WAND.slice(0, 21)}ä`, mengenart: 'NetVolume' }],
      [{ globalId: 42, mengenart: 'NetVolume' }],
      [{ mengenart: 'NetVolume' }],
      [{ globalId: WAND, mengenart: '' }],
      [{ globalId: WAND, mengenart: 7 }],
      [{ globalId: WAND }],
      [null],
      ['1Wand'],
      [[WAND, 'NetVolume']],
      'NetVolume',
      { globalId: WAND, mengenart: 'NetVolume' },
      42,
    ];
    for (const bauteile of falsch) {
      const f = fehler(z, {
        art: 'BauteileZuordnen',
        positionId: id.pos('P1'),
        bauteile: bauteile as readonly Bauteilzuordnung[],
      });
      expect(f.code, JSON.stringify(bauteile)).toBe('ungueltige-eingabe');
      expect(f.feld).toBe('bauteile');
    }
    // Groß- und Kleinschreibung, `_` und `$` sind Teil des Alphabets; Leerraum in der Mengenart bleibt Text (U5).
    const gut = [
      zu('0123456789ABCDEFGHIJ$_' as IfcGlobalId, ' '),
      zu('abcdefghijklmnopqrstuv' as IfcGlobalId),
    ];
    expect(position(wendeMitUmkehr(z, setze('P1', gut)), 'P1').bauteile).toEqual(gut);
  });

  it('eine GlobalId wird nicht gegen ein Modell geprüft (A3): jede in Form wird angenommen', () => {
    const liste = Array.from({ length: 50 }, (_, i) => zu(gid('Unbekannt', i)));
    expect(position(wendeMitUmkehr(basis(), setze('P1', liste)), 'P1').bauteile).toEqual(liste);
  });

  it('Befehl und ChangeSet sind reine Daten (JSON-Rundweg, wie das Befehlsprotokoll sie speichert)', () => {
    const b = setze('P1', ZWEI);
    const cs = erwarteOk(lvBefehlAusfuehren(basis(), b));
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
    expect(JSON.parse(JSON.stringify(cs))).toEqual(cs);
    expect(erwarteOk(lvBefehlAusfuehren(basis(), JSON.parse(JSON.stringify(b)) as LvBefehl))).toEqual(cs);
  });
});

// --- Eigenschaft ----------------------------------------------------------------------------------------------------

/** Zufällige Zuordnungen aus kleinen Vorräten, damit doppelte Paare vorkommen; selten eine GlobalId außer Form. */
const zuordnungArb: fc.Arbitrary<Bauteilzuordnung> = fc.record({
  globalId: fc.oneof(
    { weight: 12, arbitrary: fc.nat(6).map((n) => gid('Bauteil', n)) },
    { weight: 1, arbitrary: fc.constantFrom('zu-kurz', `${WAND}!`).map((s) => s as IfcGlobalId) },
  ),
  mengenart: fc.oneof(
    { weight: 12, arbitrary: fc.constantFrom('NetVolume', 'NetArea', 'Length', 'Stueck') },
    { weight: 1, arbitrary: fc.constant('') },
  ),
});

/** Orakel: angenommen genau dann, wenn jede Zuordnung in Form ist und kein Paar zweimal vorkommt. */
function orakelGueltig(liste: readonly Bauteilzuordnung[]): boolean {
  const paare = liste.map((b) => JSON.stringify([b.globalId, b.mengenart]));
  const inForm = liste.every((b) => /^[0-9A-Za-z_$]{22}$/.test(b.globalId) && b.mengenart !== '');
  return inForm && new Set(paare).size === paare.length;
}

describe('BauteileZuordnen: Eigenschaften', () => {
  it('angenommen genau für gültige Listen; danach steht genau die Liste (leer: kein Feld); Umkehrung stellt her; Summen bleiben', () => {
    let angenommen = 0;
    let abgewiesen = 0;
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.array(zuordnungArb, { maxLength: 8 }), { freq: 6 }), {
          minLength: 1,
          maxLength: 6,
        }),
        fc.array(fc.constantFrom('P1', 'P2'), { minLength: 6, maxLength: 6 }),
        (folge, ziele) => {
          let z = basis();
          folge.forEach((liste, i) => {
            const ziel = ziele[i] ?? 'P1';
            const e = lvBefehlAusfuehren(z, setze(ziel, liste));
            const gueltig = liste === null || orakelGueltig(liste);
            expect(e.ok, JSON.stringify(liste)).toBe(gueltig);
            if (!e.ok) {
              abgewiesen++;
              expect(e.fehler).toMatchObject({
                code: 'ungueltige-eingabe',
                feld: 'bauteile',
                knotenId: ziel,
              });
              return;
            }
            angenommen++;
            expect(e.wert.knoten.geaendert.length).toBeLessThanOrEqual(1);
            expect(e.wert.summen).toEqual(KEINE_SUMMEN);
            const neu = anwenden(z, e.wert);
            expect(anwenden(neu, changeSetUmkehren(e.wert))).toEqual(z);
            const p = position(neu, ziel);
            if (liste === null || liste.length === 0) expect('bauteile' in p).toBe(false);
            else expect(p.bauteile).toEqual(liste);
            expect(neu.summen).toEqual(z.summen);
            expect(pruefeLvInvarianten(neu.leistungsverzeichnis, neu.papierkorb)).toEqual([]);
            z = neu;
          });
        },
      ),
      { numRuns: 200 },
    );
    expect(angenommen).toBeGreaterThan(100);
    expect(abgewiesen).toBeGreaterThan(20);
  });
});

// --- Anlegen, Kopieren, Verschieben, Papierkorb, LV-Stand -----------------------------------------------------------

const ende = (eltern: string) => ({ art: 'ende', elternId: id.eltern(eltern) }) as const;

describe('Bauteilzuordnungen an den übrigen Befehlen (D-52, D-97.7)', () => {
  it('PositionAnlegen übernimmt sie, wie sie kommen; [] fällt weg; Form wie bei BauteileZuordnen', () => {
    const z = basis();
    const mit = wendeMitUmkehr(z, {
      art: 'PositionAnlegen',
      id: id.pos('P9'),
      ort: ende('T2'),
      daten: positionsdaten('P9', { bauteile: ZWEI }),
    });
    expect(position(mit, 'P9').bauteile).toEqual(ZWEI);
    const leer = wendeMitUmkehr(z, {
      art: 'PositionAnlegen',
      id: id.pos('P9'),
      ort: ende('T2'),
      daten: positionsdaten('P9', { bauteile: [] }),
    });
    expect('bauteile' in position(leer, 'P9')).toBe(false);
    const f = fehler(z, {
      art: 'PositionAnlegen',
      id: id.pos('P9'),
      ort: ende('T2'),
      daten: positionsdaten('P9', { bauteile: [zu(WAND), zu(WAND)] }),
    });
    expect(f).toMatchObject({ code: 'ungueltige-eingabe', feld: 'bauteile', knotenId: 'P9' });
  });

  it('LeistungsverzeichnisAnlegen übernimmt sie; [] fällt weg; eine Zuordnung außer Form wird abgewiesen', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '1.000', { bauteile: ZWEI }),
      posKnoten('P2', 'T1', 1, '1.000', '1.000', { bauteile: [] }),
    ]);
    expect(position(z, 'P1').bauteile).toEqual(ZWEI);
    expect('bauteile' in position(z, 'P2')).toBe(false);
    const e = lvBefehlAusfuehren(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: LV_ID,
      projektId: PROJEKT_ID,
      inhalt: inhalt([
        titelKnoten('T1', LV_ID, 0),
        posKnoten('P1', 'T1', 0, null, null, { bauteile: [zu('kurz' as IfcGlobalId)] }),
      ]),
    });
    expect(!e.ok && e.fehler).toMatchObject({ code: 'ungueltige-eingabe', feld: 'bauteile', knotenId: 'P1' });
  });

  it('Kopieren verwirft sie (kopieBauen, dann KnotenEinfuegen); das Original behält sie', () => {
    let z = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    let n = 0;
    const ids = {
      los: () => id.los(`L-${String(++n)}`),
      titel: () => id.titel(`T-${String(++n)}`),
      position: () => id.pos(`P-${String(++n)}`),
      hinweistext: () => id.hinweis(`H-${String(++n)}`),
    };
    const kopie = kopieBauen(z, [id.knoten('T1')], ids);
    for (const k of kopie) if (k.art === 'position') expect('bauteile' in k, k.id).toBe(false);
    z = wendeMitUmkehr(z, { art: 'KnotenEinfuegen', ort: ende(LV_ID), knoten: kopie });
    const kopiert = z.leistungsverzeichnis.knoten.filter(
      (k) => k.art === 'position' && k.id.startsWith('P-'),
    );
    expect(kopiert).toHaveLength(2);
    for (const k of kopiert) expect('bauteile' in k).toBe(false);
    expect(position(z, 'P1').bauteile).toEqual(ZWEI);
  });

  it('kopieBauen mit Option: verwerfen (Vorgabe, Kopieren im LV, Muster-LV) oder behalten (LV-Stand als neues LV; D-66)', () => {
    const z = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    let n = 0;
    const ids = {
      los: () => id.los(`L-${String(++n)}`),
      titel: () => id.titel(`T-${String(++n)}`),
      position: () => id.pos(`P-${String(++n)}`),
      hinweistext: () => id.hinweis(`H-${String(++n)}`),
    };
    const positionen = (k: readonly Knoten[]) => k.filter((x): x is Position => x.art === 'position');
    const kopieVon = (k: readonly Knoten[]) => positionen(k).find((p) => p.kurztext === 'Position P1');
    const vorgabe = kopieBauen(z, [id.knoten('T1')], ids);
    const verwerfen = kopieBauen(z, [id.knoten('T1')], ids, { bauteile: 'verwerfen' });
    const behalten = kopieBauen(z, [id.knoten('T1')], ids, { bauteile: 'behalten' });
    const ohneZuordnung = (p: Position | undefined) => p !== undefined && !('bauteile' in p);
    expect(ohneZuordnung(kopieVon(vorgabe))).toBe(true);
    expect(ohneZuordnung(kopieVon(verwerfen))).toBe(true);
    expect(kopieVon(behalten)?.bauteile).toEqual(ZWEI);
    expect(kopieVon(behalten)?.id).not.toBe('P1');
    // Ohne Zuordnungen bleibt die Kopie ohne das Feld, auch mit „behalten“.
    expect(positionen(behalten).filter((p) => 'bauteile' in p)).toHaveLength(1);
    // Die behaltenen Zuordnungen nimmt KnotenEinfuegen an (Form wie bei BauteileZuordnen).
    const eingefuegt = wendeMitUmkehr(z, { art: 'KnotenEinfuegen', ort: ende(LV_ID), knoten: behalten });
    expect(position(eingefuegt, kopieVon(behalten)?.id ?? '').bauteile).toEqual(ZWEI);
  });

  it('KnotenEinfuegen mit mitgebrachten Zuordnungen (kein Kopieren) übernimmt sie, Form geprüft', () => {
    const z = basis();
    const neu = { ...posKnoten('P9', LV_ID, 0, null, null, { bauteile: ZWEI }), elternId: id.eltern('T2') };
    const mit = wendeMitUmkehr(z, { art: 'KnotenEinfuegen', ort: ende('T2'), knoten: [neu] });
    expect(position(mit, 'P9').bauteile).toEqual(ZWEI);
    const falsch = { ...neu, bauteile: [zu(WAND, '')] };
    expect(fehler(z, { art: 'KnotenEinfuegen', ort: ende('T2'), knoten: [falsch] })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'bauteile',
    });
  });

  it('Verschieben behält sie (KnotenVerschieben, KnotenlisteVerschieben, auch mit Teilbaum)', () => {
    let z = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    z = wendeMitUmkehr(z, { art: 'KnotenVerschieben', knotenId: id.knoten('P1'), ziel: ende('T2') });
    expect(position(z, 'P1').elternId).toBe('T2');
    expect(position(z, 'P1').bauteile).toEqual(ZWEI);
    z = wendeMitUmkehr(z, {
      art: 'KnotenlisteVerschieben',
      knotenIds: [id.knoten('P1'), id.knoten('P2')],
      ziel: ende('T1'),
    });
    expect(position(z, 'P1').bauteile).toEqual(ZWEI);
    z = wendeMitUmkehr(z, { art: 'KnotenVerschieben', knotenId: id.knoten('T1'), ziel: ende(LV_ID) });
    expect(position(z, 'P1').bauteile).toEqual(ZWEI);
  });

  it('Papierkorb und Wiederherstellen behalten sie', () => {
    let z = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    const eintrag = 'korb-1' as PapierkorbeintragId;
    z = wendeMitUmkehr(z, {
      art: 'KnotenInPapierkorbLegen',
      eintragId: eintrag,
      knotenIds: [id.knoten('P1')],
    });
    const imKorb = z.papierkorb?.[0]?.knoten.find((k) => k.id === 'P1');
    expect(imKorb?.art === 'position' && imKorb.bauteile).toEqual(ZWEI);
    z = wendeMitUmkehr(z, { art: 'PapierkorbeintragWiederherstellen', eintragId: eintrag, ort: null });
    expect(position(z, 'P1').bauteile).toEqual(ZWEI);
  });

  it('ein LV-Stand trägt sie: LvStandAnlegen lässt den Zustand samt Zuordnungen, wie er ist', () => {
    const z = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, { art: 'LvStandAnlegen', id: 'stand-1' as LvStandId, name: 'Vor Vergabe' }),
    );
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(anwenden(z, cs).leistungsverzeichnis).toEqual(z.leistungsverzeichnis);
  });

  it('jeder andere Befehl an der Position lässt sie stehen (kein stiller Verlust, Q5)', () => {
    const z = wendeMitUmkehr(basis(), setze('P1', ZWEI));
    const p = id.pos('P1');
    const befehle: LvBefehl[] = [
      { art: 'KurztextAendern', knotenId: p, kurztext: 'neu' },
      { art: 'LangtextAendern', positionId: p, langtext: [{ art: 'absatz', inhalt: [] }] },
      { art: 'MengeAendern', positionId: p, menge: '7.000' as Menge },
      {
        art: 'MengenansatzSetzen',
        positionId: p,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '7', variable: null }],
        menge: '7.000' as Menge,
      },
      { art: 'EinheitAendern', positionId: p, einheit: null },
      { art: 'EinheitspreisAendern', positionId: p, einheitspreis: null },
      { art: 'KostengruppeSetzen', positionId: p, kostengruppe: null },
      { art: 'TextquelleSetzen', positionId: p, textquelle: 'Muster-LV' },
      { art: 'LeitbeschreibungSetzen', positionId: p, leitbeschreibung: null },
      { art: 'OrdnungszahlSetzen', knotenId: p, ordnungszahl: '01.0099' as Ordnungszahl, ozIndex: null },
      { art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) },
      {
        art: 'PositionsmerkmaleSetzen',
        positionId: p,
        merkmale: { ...position(z, 'P1').merkmale, pauschal: true },
        zuschlag: null,
      },
    ];
    for (const b of befehle) {
      const neu = wendeMitUmkehr(z, b);
      expect(position(neu, 'P1').bauteile, b.art).toEqual(ZWEI);
    }
  });
});

// --- Auftrags-LV ----------------------------------------------------------------------------------------------------

const AID = 'auftrags-lv-bauteile' as AuftragsLeistungsverzeichnisId;

function auftragsLv(knoten: readonly Knoten[]): AuftragsLeistungsverzeichnis {
  const inh = inhalt();
  return {
    name: inh.name,
    ozMaske: inh.ozMaske,
    mwstSatz: inh.mwstSatz,
    nachlass: null,
    id: AID,
    projektId: PROJEKT_ID,
    leistungsverzeichnisId: 'lv-ausschreibung' as LeistungsverzeichnisId,
    angebotId: 'angebot-1' as AngebotId,
    knoten,
  };
}

const AUFTRAGS_KNOTEN: readonly Knoten[] = [
  titelKnoten('T1', AID, 0),
  posKnoten('P1', 'T1', 0, '2.000', '10.000'),
  { art: 'hinweis', id: id.hinweis('H1'), elternId: id.eltern('T1'), reihenfolge: 1, text: [] },
];

function auftragsZustand(knoten: readonly Knoten[] = AUFTRAGS_KNOTEN): AuftragsLvZustand {
  const cs = erwarteOk(
    auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: auftragsLv(knoten),
    }),
  );
  const z = auftragsLvChangeSetAnwenden(null, cs);
  if (z === null) throw new Error('kein Auftrags-LV');
  return z;
}

function auftragsWende(z: AuftragsLvZustand, b: AuftragsLvBefehl): AuftragsLvZustand {
  const cs = erwarteOk(auftragsLvBefehlAusfuehren(z, b));
  const neu = auftragsLvChangeSetAnwenden(z, cs);
  if (neu === null) throw new Error('Auftrags-LV verschwunden');
  expect(auftragsLvChangeSetAnwenden(neu, auftragsLvChangeSetUmkehren(cs))).toEqual(z);
  return neu;
}

const auftragsPosition = (z: AuftragsLvZustand, kennung: string): Position => {
  const p = z.auftragsLeistungsverzeichnis.knoten.find((k) => k.id === kennung);
  if (p?.art !== 'position') throw new Error(`keine Position: ${kennung}`);
  return p;
};

describe('BauteileZuordnen im Auftrags-LV (D-52, D-70.1)', () => {
  it('dieselbe Handlung wie im LV: eine Knotenänderung, Summen unverändert, umkehrbar; null entfernt', () => {
    const z = auftragsZustand();
    const cs = erwarteOk(auftragsLvBefehlAusfuehren(z, setze('P1', ZWEI) as AuftragsLvBefehl));
    expect(cs.kopf).toBeNull();
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(cs.knoten.geaendert).toHaveLength(1);
    const z1 = auftragsWende(z, setze('P1', ZWEI) as AuftragsLvBefehl);
    expect(auftragsPosition(z1, 'P1').bauteile).toEqual(ZWEI);
    expect(auftragsWende(z1, setze('P1', null) as AuftragsLvBefehl)).toEqual(z);
    expect(auftragsWende(z1, setze('P1', []) as AuftragsLvBefehl)).toEqual(z);
    expect(
      erwarteOk(auftragsLvBefehlAusfuehren(z1, setze('P1', ZWEI) as AuftragsLvBefehl)).knoten.geaendert,
    ).toEqual([]);
  });

  it('Fehler wie im LV: Knotenart, unbekannt, doppeltes Paar, Form, kein Zustand', () => {
    const z = auftragsZustand();
    const code = (zz: AuftragsLvZustand | null, b: LvBefehl) => {
      const e = auftragsLvBefehlAusfuehren(zz, b as AuftragsLvBefehl);
      return e.ok ? null : e.fehler;
    };
    expect(code(z, setze('T1', ZWEI))?.code).toBe('knotenart-unzulaessig');
    expect(code(z, setze('H1', ZWEI))?.code).toBe('knotenart-unzulaessig');
    expect(code(z, setze('gibt-es-nicht', ZWEI))?.code).toBe('knoten-unbekannt');
    expect(code(z, setze('P1', [zu(WAND), zu(WAND)]))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'bauteile',
    });
    expect(code(z, setze('P1', [zu('x' as IfcGlobalId)]))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'bauteile',
    });
    expect(code(null, setze('P1', ZWEI))?.code).toBe('befehl-nicht-zustaendig');
  });

  it('AuftragsLeistungsverzeichnisAnlegen und NachtragUebernehmen übernehmen sie; Form geprüft', () => {
    const mit = [titelKnoten('T1', AID, 0), posKnoten('P1', 'T1', 0, '1.000', '1.000', { bauteile: ZWEI })];
    const z = auftragsZustand(mit);
    expect(auftragsPosition(z, 'P1').bauteile).toEqual(ZWEI);
    const falsch = auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: auftragsLv([
        titelKnoten('T1', AID, 0),
        posKnoten('P1', 'T1', 0, null, null, { bauteile: [zu(WAND, '')] }),
      ]),
    });
    expect(!falsch.ok && falsch.fehler).toMatchObject({ code: 'ungueltige-eingabe', feld: 'bauteile' });

    const n = auftragsWende(z, {
      art: 'NachtragUebernehmen',
      nachtragLvId: 'lv-nachtrag' as LeistungsverzeichnisId,
      knoten: [titelKnoten('N1', AID, 1), posKnoten('NP1', 'N1', 0, '1.000', '2.000', { bauteile: ZWEI })],
    });
    expect(auftragsPosition(n, 'NP1').bauteile).toEqual(ZWEI);
  });
});
