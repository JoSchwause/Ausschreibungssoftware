// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der Kopfdaten-Befehle (Ticket 41, D-07): AuftraggeberSetzen, VergabeinformationenSetzen,
// LeitbeschreibungSetzen. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  Auftraggeber,
  Leitbeschreibung,
  LvBefehl,
  LvChangeSet,
  LvZustand,
  Menge,
  Position,
  Vergabeinformationen,
} from '@tethys/vertrag';
import { ZUSTAENDIGES_TICKET, changeSetUmkehren, lvBefehlAusfuehren } from './index';
import { KEINE_SUMMEN, anwenden, id, lvMit, posKnoten, titelKnoten } from './testhilfen';

const AUFTRAGGEBER: Auftraggeber = {
  name: 'Gemeinde Musterstadt',
  strasse: 'Am Markt 1',
  plz: '12345',
  ort: 'Musterstadt',
  vergabenummer: 'V-2026-01',
};

const VERGABE: Vergabeinformationen = {
  eroeffnungsdatum: '2026-12-01',
  eroeffnungszeit: '10:00:00',
  abgabeort: 'Rathaus, Zimmer 3',
  ausfuehrungsbeginn: null,
  ausfuehrungsende: null,
  auftragsnummer: null,
  auftragsdatum: null,
  abnahmeart: null,
  gewaehrleistung: { dauer: 5, einheit: 'Years' },
};

const LEIT: Leitbeschreibung = {
  unterbeschreibungen: [
    { nummer: '01', kurztext: 'Teil A', langtext: [], menge: '2.000' as Menge, einheit: 'm' },
    { nummer: '02', kurztext: 'Teil B', langtext: [], menge: null, einheit: null },
  ],
};

function basis(): LvZustand {
  return lvMit([
    titelKnoten('T1', 'lv-test', 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000', { einheit: 'm' }),
  ]);
}

const fuehre = (z: LvZustand, b: LvBefehl): LvChangeSet => {
  const e = lvBefehlAusfuehren(z, b);
  if (!e.ok) throw new Error(JSON.stringify(e.fehler));
  return e.wert;
};

function fehlerVon(z: LvZustand, b: LvBefehl): { code: string; knotenId?: string; feld?: string } {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error('Befehl wurde angenommen');
  return e.fehler;
}

const positionVon = (z: LvZustand, kennung: string): Position => {
  const k = z.leistungsverzeichnis.knoten.find((n) => n.id === kennung);
  if (k?.art !== 'position') throw new Error('keine Position');
  return k;
};

/** Anwenden, dann Umkehrung anwenden: der Vorzustand exakt. */
function umkehrbar(z: LvZustand, cs: LvChangeSet): void {
  const danach = anwenden(z, cs);
  expect(anwenden(danach, changeSetUmkehren(cs))).toEqual(z);
}

describe('Zuständigkeit (D-07)', () => {
  it('die drei Kopfdaten-Befehle stehen nicht mehr in ZUSTAENDIGES_TICKET', () => {
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('AuftraggeberSetzen');
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('VergabeinformationenSetzen');
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('LeitbeschreibungSetzen');
  });
});

describe('AuftraggeberSetzen', () => {
  it('setzt den Auftraggeber am Kopf, ohne Knoten und Summen', () => {
    const z = basis();
    const cs = fuehre(z, { art: 'AuftraggeberSetzen', auftraggeber: AUFTRAGGEBER });
    expect(cs.kopf?.vorher).not.toHaveProperty('auftraggeber');
    expect(cs.kopf?.nachher).toMatchObject({ auftraggeber: AUFTRAGGEBER, name: 'Testverzeichnis' });
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(anwenden(z, cs).leistungsverzeichnis.auftraggeber).toEqual(AUFTRAGGEBER);
    umkehrbar(z, cs);
  });

  it('null entfernt das Feld; Umkehrung stellt es wieder her', () => {
    const z = anwenden(basis(), fuehre(basis(), { art: 'AuftraggeberSetzen', auftraggeber: AUFTRAGGEBER }));
    const cs = fuehre(z, { art: 'AuftraggeberSetzen', auftraggeber: null });
    const danach = anwenden(z, cs);
    expect(danach.leistungsverzeichnis).not.toHaveProperty('auftraggeber');
    umkehrbar(z, cs);
  });

  it('gleicher Wert liefert ein leeres ChangeSet (auch null ohne Feld)', () => {
    const z = anwenden(basis(), fuehre(basis(), { art: 'AuftraggeberSetzen', auftraggeber: AUFTRAGGEBER }));
    const cs = fuehre(z, { art: 'AuftraggeberSetzen', auftraggeber: { ...AUFTRAGGEBER } });
    expect(cs.kopf).toBeNull();
    expect(cs.knoten.geaendert).toEqual([]);
    expect(fuehre(basis(), { art: 'AuftraggeberSetzen', auftraggeber: null }).kopf).toBeNull();
  });

  it('weist eine falsche Form ab (ungueltige-eingabe, feld auftraggeber)', () => {
    const kaputt = { ...AUFTRAGGEBER, plz: 12345 } as unknown as Auftraggeber;
    expect(fehlerVon(basis(), { art: 'AuftraggeberSetzen', auftraggeber: kaputt })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'auftraggeber.plz',
    });
    const ohneFeld = { name: 'x' } as unknown as Auftraggeber;
    expect(fehlerVon(basis(), { art: 'AuftraggeberSetzen', auftraggeber: ohneFeld }).code).toBe(
      'ungueltige-eingabe',
    );
  });

  it('prüft keine Inhalte (U5): leere Texte werden angenommen', () => {
    const leer: Auftraggeber = { name: '', strasse: null, plz: 'abc', ort: null, vergabenummer: null };
    expect(lvBefehlAusfuehren(basis(), { art: 'AuftraggeberSetzen', auftraggeber: leer }).ok).toBe(true);
  });
});

describe('VergabeinformationenSetzen', () => {
  it('setzt die Vergabeinformationen am Kopf, umkehrbar', () => {
    const z = basis();
    const cs = fuehre(z, { art: 'VergabeinformationenSetzen', vergabeinformationen: VERGABE });
    expect(cs.kopf?.nachher).toMatchObject({ vergabeinformationen: VERGABE });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    umkehrbar(z, cs);
    const z2 = anwenden(z, cs);
    const weg = fuehre(z2, { art: 'VergabeinformationenSetzen', vergabeinformationen: null });
    expect(anwenden(z2, weg).leistungsverzeichnis).not.toHaveProperty('vergabeinformationen');
    umkehrbar(z2, weg);
  });

  it('gleicher Wert liefert ein leeres ChangeSet', () => {
    const z = anwenden(
      basis(),
      fuehre(basis(), { art: 'VergabeinformationenSetzen', vergabeinformationen: VERGABE }),
    );
    const cs = fuehre(z, {
      art: 'VergabeinformationenSetzen',
      vergabeinformationen: { ...VERGABE, gewaehrleistung: { einheit: 'Years', dauer: 5 } },
    });
    expect(cs.kopf).toBeNull();
  });

  it('weist eine falsche Form ab', () => {
    const kaputt = { ...VERGABE, gewaehrleistung: { dauer: '5', einheit: 'Years' } };
    expect(
      fehlerVon(basis(), {
        art: 'VergabeinformationenSetzen',
        vergabeinformationen: kaputt as unknown as Vergabeinformationen,
      }),
    ).toMatchObject({ code: 'ungueltige-eingabe', feld: 'vergabeinformationen.gewaehrleistung' });
    const datum = { ...VERGABE, eroeffnungsdatum: 20261201 };
    expect(
      fehlerVon(basis(), {
        art: 'VergabeinformationenSetzen',
        vergabeinformationen: datum as unknown as Vergabeinformationen,
      }),
    ).toMatchObject({ code: 'ungueltige-eingabe', feld: 'vergabeinformationen.eroeffnungsdatum' });
  });
});

describe('LeitbeschreibungSetzen', () => {
  it('setzt die Leitbeschreibung an der Position: ein geänderter Knoten, keine Summen, umkehrbar', () => {
    const z = basis();
    const cs = fuehre(z, { art: 'LeitbeschreibungSetzen', positionId: id.pos('P1'), leitbeschreibung: LEIT });
    expect(cs.kopf).toBeNull();
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect(cs.knoten.geaendert[0]?.nachher).toMatchObject({ id: 'P1', leitbeschreibung: LEIT });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(positionVon(anwenden(z, cs), 'P1').leitbeschreibung).toEqual(LEIT);
    umkehrbar(z, cs);
  });

  it('null entfernt das Feld; gleicher Wert liefert ein leeres ChangeSet', () => {
    const z = anwenden(
      basis(),
      fuehre(basis(), { art: 'LeitbeschreibungSetzen', positionId: id.pos('P1'), leitbeschreibung: LEIT }),
    );
    const gleich = fuehre(z, {
      art: 'LeitbeschreibungSetzen',
      positionId: id.pos('P1'),
      leitbeschreibung: structuredClone(LEIT),
    });
    expect(gleich.knoten.geaendert).toEqual([]);
    const weg = fuehre(z, {
      art: 'LeitbeschreibungSetzen',
      positionId: id.pos('P1'),
      leitbeschreibung: null,
    });
    expect(positionVon(anwenden(z, weg), 'P1')).not.toHaveProperty('leitbeschreibung');
    umkehrbar(z, weg);
    expect(
      fuehre(basis(), { art: 'LeitbeschreibungSetzen', positionId: id.pos('P1'), leitbeschreibung: null })
        .knoten.geaendert,
    ).toEqual([]);
  });

  it("legt '' als Einheit einer Unterbeschreibung als null ab (wie Ticket 30)", () => {
    const mitLeer: Leitbeschreibung = {
      unterbeschreibungen: [{ nummer: '01', kurztext: 'A', langtext: [], menge: null, einheit: '' }],
    };
    const cs = fuehre(basis(), {
      art: 'LeitbeschreibungSetzen',
      positionId: id.pos('P1'),
      leitbeschreibung: mitLeer,
    });
    const nachher = cs.knoten.geaendert[0]?.nachher as Position;
    expect(nachher.leitbeschreibung?.unterbeschreibungen[0]?.einheit).toBeNull();
  });

  it('Fehlerfälle: knoten-unbekannt, knotenart-unzulaessig, ungueltige-eingabe', () => {
    const z = basis();
    expect(
      fehlerVon(z, { art: 'LeitbeschreibungSetzen', positionId: id.pos('X'), leitbeschreibung: LEIT }),
    ).toMatchObject({ code: 'knoten-unbekannt', knotenId: 'X' });
    expect(
      fehlerVon(z, { art: 'LeitbeschreibungSetzen', positionId: id.pos('T1'), leitbeschreibung: LEIT }),
    ).toMatchObject({ code: 'knotenart-unzulaessig', knotenId: 'T1' });
    const falscheMenge: Leitbeschreibung = {
      unterbeschreibungen: [
        { nummer: '01', kurztext: 'A', langtext: [], menge: '2.5' as Menge, einheit: 'm' },
      ],
    };
    expect(
      fehlerVon(z, {
        art: 'LeitbeschreibungSetzen',
        positionId: id.pos('P1'),
        leitbeschreibung: falscheMenge,
      }),
    ).toMatchObject({
      code: 'ungueltige-eingabe',
      knotenId: 'P1',
      feld: 'leitbeschreibung.unterbeschreibungen.menge',
    });
    const keineListe = { unterbeschreibungen: 'x' } as unknown as Leitbeschreibung;
    expect(
      fehlerVon(z, { art: 'LeitbeschreibungSetzen', positionId: id.pos('P1'), leitbeschreibung: keineListe }),
    ).toMatchObject({ code: 'ungueltige-eingabe', feld: 'leitbeschreibung.unterbeschreibungen' });
  });
});
