// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: was der Dialog „Zuschlag erteilen“ zeigt und abschickt. LV `typisch` über den Kern, die Angebote aus den
// X84-Dateien von Ticket 69 über den GAEB-Weg der App. Erwartungen aus den Fixtures (`typisch.json`,
// `typisch-angebote.json`), nicht aus einem Lauf des Kerns.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  Angebot,
  AuftragsLeistungsverzeichnisId,
  BieterId,
  LvZustand,
  PositionId,
  Projekt,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { angebotLesen } from '../gaeb/gaeb';
import { appIdQuelle } from '../lv/ids';
import { wahlSetzen, zuschlagserteilungPlanen } from './zuschlagserteilung';

const wurzel = new URL('../../../../', import.meta.url);
const datei = (pfad: string): Uint8Array => new Uint8Array(readFileSync(new URL(pfad, wurzel)));
const PROJEKT = 'p' as ProjektId;
const NEUE_ID = 'auftrag-1' as AuftragsLeistungsverzeichnisId;

function typisch(): LvZustand {
  const inhalt = fixtureInhalt('typisch');
  const r = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: PROJEKT,
    inhalt,
  });
  if (!r.ok) throw new Error(r.fehler.meldung);
  const z = lvChangeSetAnwenden(null, r.wert);
  if (z === null) throw new Error('LV');
  return z;
}

const lv = typisch();
const ids = appIdQuelle();

/** Ein Angebot wie nach „Angebot einlesen“, mit einem Bieter des Projekts. */
function eingelesen(name: 'a' | 'b'): { angebot: Angebot; bieter: { id: BieterId; name: string } } {
  const v = angebotLesen(datei(`fixtures/angebote/typisch-bieter-${name}.x84`), 'x.x84', lv, ids);
  if (v.angebot === null) throw new Error(name);
  return { angebot: v.angebot, bieter: { id: v.angebot.bieterId, name: v.bieterName } };
}
const a = eingelesen('a');
const b = eingelesen('b');
const projekt: Projekt = {
  id: PROJEKT,
  name: 'Musterhaus',
  bauherr: { name: 'Bauherr', anschrift: null },
  bieter: [a.bieter, b.bieter],
};

const id = (oz: string, index: string | null = null): PositionId => {
  const p = lv.leistungsverzeichnis.knoten.find(
    (k) => k.art === 'position' && k.ordnungszahl === oz && k.ozIndex === index,
  );
  if (p === undefined) throw new Error(oz);
  return p.id as PositionId;
};
const KEINE: ReadonlySet<PositionId> = new Set();

describe('zuschlagserteilungPlanen', () => {
  it('ohne Wahl: die Alternative 02.0070A entfällt, Bieter A hat alles angeboten, der Befehl ist bereit', () => {
    const plan = zuschlagserteilungPlanen({
      lv,
      angebot: a.angebot,
      projekt,
      gewaehlt: KEINE,
      neueId: NEUE_ID,
    });
    expect(plan.fehler).toBeNull();
    expect(plan.entfallend).toBe(1);
    expect(plan.unbepreist).toBe(0);
    expect(plan.warnungen).toEqual([
      'Im Auftrags-LV entfällt 1 Position: 02.0070A Bodenplatte wasserundurchlässig.',
    ]);
    expect(plan.befehl?.auftragsLeistungsverzeichnis).toMatchObject({
      id: NEUE_ID,
      projektId: PROJEKT,
      leistungsverzeichnisId: lv.leistungsverzeichnis.id,
      angebotId: a.angebot.id,
      auftragnehmer: { name: 'Bieter A', strasse: null, plz: null, ort: null },
    });
  });

  it('Bieter B hat 03.0070 nicht angeboten: eine unbepreiste Position, in Worten gewarnt', () => {
    const plan = zuschlagserteilungPlanen({
      lv,
      angebot: b.angebot,
      projekt,
      gewaehlt: KEINE,
      neueId: NEUE_ID,
    });
    expect(plan.unbepreist).toBe(1);
    expect(plan.warnungen).toContain(
      '03.0070 Silikonfuge: vom Bieter nicht angeboten; die Position steht ohne Einheitspreis im Auftrags-LV.',
    );
  });

  it('Wahlgruppe von typisch: 02.0070A statt 02.0070; gewählt entfällt die Grundposition', () => {
    const ohne = zuschlagserteilungPlanen({
      lv,
      angebot: a.angebot,
      projekt,
      gewaehlt: KEINE,
      neueId: NEUE_ID,
    });
    expect(ohne.wahlgruppen).toEqual([
      {
        titel: 'Statt 02.0070 Bodenplatte herstellen',
        alternativen: [
          {
            positionId: id('02.0070', 'A'),
            text: '02.0070A Bodenplatte wasserundurchlässig',
            gewaehlt: false,
          },
        ],
      },
    ]);
    const gewaehlt = wahlSetzen(
      KEINE,
      ohne.wahlgruppen[0] ?? { titel: '', alternativen: [] },
      id('02.0070', 'A'),
      true,
    );
    const mit = zuschlagserteilungPlanen({ lv, angebot: a.angebot, projekt, gewaehlt, neueId: NEUE_ID });
    expect(mit.wahlgruppen[0]?.alternativen[0]?.gewaehlt).toBe(true);
    expect(mit.entfallend).toBe(1);
    expect(mit.warnungen).toEqual(['Im Auftrags-LV entfällt 1 Position: 02.0070 Bodenplatte herstellen.']);
    expect(mit.befehl?.auftragsLeistungsverzeichnis.knoten.map((k) => k.id)).not.toContain(id('02.0070'));
  });

  it('ein Angebot zu einem anderen LV: Fehler in Worten, kein Befehl', () => {
    const fremd = { ...a.angebot, leistungsverzeichnisId: 'anderes-lv' as Angebot['leistungsverzeichnisId'] };
    const plan = zuschlagserteilungPlanen({ lv, angebot: fremd, projekt, gewaehlt: KEINE, neueId: NEUE_ID });
    expect(plan.fehler).toBe('Das Angebot gehört nicht zu diesem LV.');
    expect(plan.befehl).toBeNull();
  });

  it('ein Nachtrags-LV bekommt keinen Zuschlag; der Grund nennt den Weg „Beauftragen“ (Ticket 86, D-42)', () => {
    const nachtrag = {
      ...lv,
      leistungsverzeichnis: {
        ...lv.leistungsverzeichnis,
        nachtrag: { auftragsLvId: NEUE_ID, nummer: 'N01', status: 'angeboten' as const },
      },
    };
    const plan = zuschlagserteilungPlanen({
      lv: nachtrag,
      angebot: a.angebot,
      projekt,
      gewaehlt: KEINE,
      neueId: NEUE_ID,
    });
    expect(plan.befehl).toBeNull();
    expect(plan.fehler).toBe(
      'Nachtrag N01 ist ein Nachtrags-LV und bekommt keinen Zuschlag. Er wird auf seiner LV-Seite beauftragt („Beauftragen“).',
    );
  });
});

describe('wahlSetzen', () => {
  const gruppe = {
    titel: 'Statt 1',
    alternativen: [
      { positionId: 'x' as PositionId, text: 'X', gewaehlt: false },
      { positionId: 'y' as PositionId, text: 'Y', gewaehlt: false },
    ],
  };
  it('höchstens eine Alternative je Gruppe: Ankreuzen nimmt die andere weg, Abkreuzen lässt keine', () => {
    const andere = 'z' as PositionId;
    const x = wahlSetzen(new Set([andere]), gruppe, 'x' as PositionId, true);
    expect([...x]).toEqual([andere, 'x']);
    const y = wahlSetzen(x, gruppe, 'y' as PositionId, true);
    expect([...y]).toEqual([andere, 'y']);
    expect([...wahlSetzen(y, gruppe, 'y' as PositionId, false)]).toEqual([andere]);
  });
});
