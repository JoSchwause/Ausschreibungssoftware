// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 105 (Vertrag v1.5 Punkt 1, D-71.3, D-95.1): ein Fehlercode für alle Feldbefehle, im LV und im Auftrags-LV. Hat der
// Baum keinen Knoten mit der Kennung: `knoten-unbekannt`; trifft der Befehl einen vorhandenen Knoten, der das Feld nicht
// trägt: `knotenart-unzulaessig`. Der Knoten wird vor dem Wert geprüft (ein beliebiger, auch unsinniger Wert ändert den Code
// nicht). Zuerst geschrieben (Q1).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvZustand,
  Befehlsfehlercode,
  Knoten,
  LeistungsverzeichnisId,
  LvBefehl,
  LvZustand,
} from '@tethys/vertrag';
import { auftragsLvBefehlAusfuehren, auftragsLvChangeSetAnwenden, lvBefehlAusfuehren } from './index';
import { LV_ID, PROJEKT_ID, erwarteOk, id, inhalt, lvMit, posKnoten, titelKnoten } from './testhilfen';

type Ziel = 'gliederung' | 'position' | 'hinweis';

/** Ein Feldbefehl mit der Kennung `k` und dem (beliebigen) Wert `w`, dazu die Knotenarten, die sein Feld tragen. */
interface Feldbefehl<B> {
  readonly bauen: (k: string, w: unknown) => B;
  readonly traegt: readonly Ziel[];
}

const NUR_POSITION: readonly Ziel[] = ['position'];

/** Jeder Feldbefehl des LV (Vertrag `befehle.ts`, Abschnitt „Felder ändern“, dazu Leitbeschreibung und OZ). */
const LV_FELDBEFEHLE: Readonly<Record<string, Feldbefehl<LvBefehl>>> = {
  KurztextAendern: {
    bauen: (k, w) => ({ art: 'KurztextAendern', knotenId: id.pos(k), kurztext: w as string }),
    traegt: ['gliederung', 'position'],
  },
  LangtextAendern: {
    bauen: (k, w) => ({ art: 'LangtextAendern', positionId: id.pos(k), langtext: w as [] }),
    traegt: NUR_POSITION,
  },
  HinweistextAendern: {
    bauen: (k, w) => ({ art: 'HinweistextAendern', knotenId: id.hinweis(k), text: w as [] }),
    traegt: ['hinweis'],
  },
  MengeAendern: {
    bauen: (k, w) => ({ art: 'MengeAendern', positionId: id.pos(k), menge: w as null }),
    traegt: NUR_POSITION,
  },
  MengenansatzSetzen: {
    bauen: (k, w) => ({
      art: 'MengenansatzSetzen',
      positionId: id.pos(k),
      mengenansatz: w as null,
      menge: w as null,
    }),
    traegt: NUR_POSITION,
  },
  EinheitAendern: {
    bauen: (k, w) => ({ art: 'EinheitAendern', positionId: id.pos(k), einheit: w as null }),
    traegt: NUR_POSITION,
  },
  EinheitspreisAendern: {
    bauen: (k, w) => ({ art: 'EinheitspreisAendern', positionId: id.pos(k), einheitspreis: w as null }),
    traegt: NUR_POSITION,
  },
  EinheitspreisanteileSetzen: {
    bauen: (k, w) => ({ art: 'EinheitspreisanteileSetzen', positionId: id.pos(k), epa: w as null }),
    traegt: NUR_POSITION,
  },
  PositionsmerkmaleSetzen: {
    bauen: (k, w) => ({
      art: 'PositionsmerkmaleSetzen',
      positionId: id.pos(k),
      merkmale: w as never,
      zuschlag: w as null,
    }),
    traegt: NUR_POSITION,
  },
  KostengruppeSetzen: {
    bauen: (k, w) => ({ art: 'KostengruppeSetzen', positionId: id.pos(k), kostengruppe: w as null }),
    traegt: NUR_POSITION,
  },
  BauteileZuordnen: {
    bauen: (k, w) => ({ art: 'BauteileZuordnen', positionId: id.pos(k), bauteile: w as null }),
    traegt: NUR_POSITION,
  },
  TextquelleSetzen: {
    bauen: (k, w) => ({ art: 'TextquelleSetzen', positionId: id.pos(k), textquelle: w as null }),
    traegt: NUR_POSITION,
  },
  LeitbeschreibungSetzen: {
    bauen: (k, w) => ({ art: 'LeitbeschreibungSetzen', positionId: id.pos(k), leitbeschreibung: w as null }),
    traegt: NUR_POSITION,
  },
  OrdnungszahlSetzen: {
    bauen: (k, w) => ({
      art: 'OrdnungszahlSetzen',
      knotenId: id.pos(k),
      ordnungszahl: w as null,
      ozIndex: w as null,
    }),
    traegt: ['gliederung', 'position'],
  },
};

/** Jeder Feldbefehl des Auftrags-LV. */
const AUFTRAGS_LV_FELDBEFEHLE: Readonly<Record<string, Feldbefehl<AuftragsLvBefehl>>> = {
  KostengruppeSetzen: {
    bauen: (k, w) => ({ art: 'KostengruppeSetzen', positionId: id.pos(k), kostengruppe: w as null }),
    traegt: NUR_POSITION,
  },
  BauteileZuordnen: {
    bauen: (k, w) => ({ art: 'BauteileZuordnen', positionId: id.pos(k), bauteile: w as null }),
    traegt: NUR_POSITION,
  },
};

/** Ein Baum mit je einem Knoten jeder Art: Gliederung G (Titel oder Los), darunter Position P und Hinweistext H. */
function baum(wurzel: string, gliederung: 'titel' | 'los'): Knoten[] {
  const g: Knoten =
    gliederung === 'titel'
      ? titelKnoten('G', wurzel, 0)
      : { ...titelKnoten('G', wurzel, 0), art: 'los', id: id.los('G') };
  return [
    g,
    posKnoten('P', 'G', 0, '2.000', '10.000'),
    { art: 'hinweis', id: id.hinweis('H'), elternId: id.eltern('G'), reihenfolge: 1, text: [] },
  ];
}

const KENNUNG: Readonly<Record<Ziel, string>> = { gliederung: 'G', position: 'P', hinweis: 'H' };

const lvZustand = (gliederung: 'titel' | 'los'): LvZustand => lvMit(baum(LV_ID, gliederung));

const AID = 'auftrags-lv-fehlercode' as AuftragsLeistungsverzeichnisId;
function auftragsLvZustand(gliederung: 'titel' | 'los'): AuftragsLvZustand {
  const inh = inhalt();
  const cs = erwarteOk(
    auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: {
        name: inh.name,
        ozMaske: inh.ozMaske,
        mwstSatz: inh.mwstSatz,
        nachlass: null,
        id: AID,
        projektId: PROJEKT_ID,
        leistungsverzeichnisId: 'lv-ausschreibung' as LeistungsverzeichnisId,
        angebotId: 'angebot-1' as AngebotId,
        knoten: baum(AID, gliederung),
      },
    }),
  );
  const z = auftragsLvChangeSetAnwenden(null, cs);
  if (z === null) throw new Error('kein Auftrags-LV');
  return z;
}

const ZUSTAENDE = {
  lv: { titel: lvZustand('titel'), los: lvZustand('los') },
  auftragsLv: { titel: auftragsLvZustand('titel'), los: auftragsLvZustand('los') },
};

/** Code des Fehlerwerts oder `null`, wenn der Befehl angenommen wurde. */
const code = (
  e: { ok: true } | { ok: false; fehler: { code: Befehlsfehlercode } },
): Befehlsfehlercode | null => (e.ok ? null : e.fehler.code);

const erwartet = (ziel: Ziel | 'unbekannt'): Befehlsfehlercode =>
  ziel === 'unbekannt' ? 'knoten-unbekannt' : 'knotenart-unzulaessig';

const zielArb = fc.constantFrom<Ziel | 'unbekannt'>('gliederung', 'hinweis', 'unbekannt');
const gliederungArb = fc.constantFrom<'titel' | 'los'>('titel', 'los');

describe('Fehlercode der Feldbefehle (D-71.3): Knoten vor Wert', () => {
  it('LV: jeder Feldbefehl an einem Knoten ohne das Feld → knotenart-unzulaessig, ohne Knoten → knoten-unbekannt, bei jedem Wert', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(LV_FELDBEFEHLE)),
        zielArb,
        gliederungArb,
        fc.anything(),
        (art, ziel, gliederung, wert) => {
          const f = LV_FELDBEFEHLE[art];
          if (f === undefined) throw new Error(art);
          if (ziel !== 'unbekannt' && f.traegt.includes(ziel)) return;
          const kennung = ziel === 'unbekannt' ? 'gibt-es-nicht' : KENNUNG[ziel];
          const e = lvBefehlAusfuehren(ZUSTAENDE.lv[gliederung], f.bauen(kennung, wert));
          expect(code(e), `${art} an ${ziel}`).toBe(erwartet(ziel));
          if (!e.ok) expect(e.fehler.knotenId).toBe(kennung);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('Auftrags-LV: jeder Feldbefehl ebenso', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(AUFTRAGS_LV_FELDBEFEHLE)),
        zielArb,
        gliederungArb,
        fc.anything(),
        (art, ziel, gliederung, wert) => {
          const f = AUFTRAGS_LV_FELDBEFEHLE[art];
          if (f === undefined) throw new Error(art);
          if (ziel !== 'unbekannt' && f.traegt.includes(ziel)) return;
          const kennung = ziel === 'unbekannt' ? 'gibt-es-nicht' : KENNUNG[ziel];
          const e = auftragsLvBefehlAusfuehren(ZUSTAENDE.auftragsLv[gliederung], f.bauen(kennung, wert));
          expect(code(e), `${art} an ${ziel}`).toBe(erwartet(ziel));
          if (!e.ok) expect(e.fehler.knotenId).toBe(kennung);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('die Listen nennen jeden Feldbefehl, den der Kern kennt', () => {
    // Orakel: die Befehle des Vertrags mit `positionId` oder `knotenId` an genau einem Knoten (ohne Baumbefehle).
    expect(Object.keys(LV_FELDBEFEHLE).sort()).toEqual(
      [
        'BauteileZuordnen',
        'EinheitAendern',
        'EinheitspreisAendern',
        'EinheitspreisanteileSetzen',
        'HinweistextAendern',
        'KostengruppeSetzen',
        'KurztextAendern',
        'LangtextAendern',
        'LeitbeschreibungSetzen',
        'MengeAendern',
        'MengenansatzSetzen',
        'OrdnungszahlSetzen',
        'PositionsmerkmaleSetzen',
        'TextquelleSetzen',
      ].sort(),
    );
    expect(Object.keys(AUFTRAGS_LV_FELDBEFEHLE).sort()).toEqual(['BauteileZuordnen', 'KostengruppeSetzen']);
  });

  it('KostengruppeSetzen an Gliederung und Hinweistext: knotenart-unzulaessig (bisher knoten-unbekannt)', () => {
    const lv = ZUSTAENDE.lv.titel;
    const a = ZUSTAENDE.auftragsLv.titel;
    for (const k of ['G', 'H']) {
      const b = { art: 'KostengruppeSetzen', positionId: id.pos(k), kostengruppe: null } as const;
      expect(code(lvBefehlAusfuehren(lv, b)), k).toBe('knotenart-unzulaessig');
      expect(code(auftragsLvBefehlAusfuehren(a, b)), k).toBe('knotenart-unzulaessig');
    }
  });
});
