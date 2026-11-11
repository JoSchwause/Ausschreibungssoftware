// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der Mengenermittlung X31 (Ticket 83, M3; D-33). Zuerst geschrieben (Q1). Seams: `x31Lesen` und `aufmassAlsX31`.
//
// Die erwarteten Ansatzzeilen der BVBS-Prüfdatei sind von Hand aus den Zeilen der Datei abgeschrieben (Spalten 32–69,
// Zeilen ohne `=` am Ende setzen sich in der nächsten fort), nicht aus dem Leser erzeugt.

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  LeistungsverzeichnisId,
  Position,
  ProjektId,
} from '@tethys/vertrag';
import { leseGaeb, x31Lesen } from './index';
import { TEST_MWST, lesePfad, testIds } from './testhilfen';

const BVBS = 'fixtures/extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021';
const NULL = '0.00' as Betrag;

/** Das Auftrags-LV aus der X86 neben der Prüfdatei, wie die App es nach dem Zuschlag hält. */
function auftragsLvAus(bytes: Uint8Array): AuftragsLvZustand {
  const l = leseGaeb(bytes, { ids: testIds(), standardMwstSatz: TEST_MWST });
  if (l.inhalt === null) throw new Error('Auftrags-LV nicht lesbar');
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  return {
    auftragsLeistungsverzeichnis: {
      ...kopf,
      id: wurzelId as string as AuftragsLeistungsverzeichnisId,
      projektId: 'projekt-1' as ProjektId,
      leistungsverzeichnisId: 'lv-1' as LeistungsverzeichnisId,
      angebotId: 'angebot-1' as AngebotId,
      knoten,
    },
    summen: {
      positionen: [],
      gliederungen: [],
      gesamt: { netto: NULL, nachlass: NULL, nettoNachNachlass: NULL, mwst: NULL, brutto: NULL },
    },
  };
}

const BVBS_LV = auftragsLvAus(lesePfad(`${BVBS}.x86`));

/** Kennung der Position mit dieser OZ (mit Index) im Auftrags-LV. */
function positionId(lv: AuftragsLvZustand, oz: string): string {
  const p = lv.auftragsLeistungsverzeichnis.knoten.find(
    (k): k is Position => k.art === 'position' && `${k.ordnungszahl ?? ''}${k.ozIndex ?? ''}` === oz,
  );
  if (!p) throw new Error(`keine Position ${oz}`);
  return p.id;
}

describe('X31 lesen: BVBS-Prüfdatei Mengenermittlung 3.3', () => {
  const l = x31Lesen(lesePfad(`${BVBS}.x31`), BVBS_LV);

  it('erkennt Phase und Version und liefert ein Aufmaßblatt', () => {
    expect(l.phase).toBe('X31');
    expect(l.version).toBe('3.3');
    expect(l.aufmass).not.toBeNull();
  });

  it('Golden: mehrzeilige Formel 91 wird je Rechenansatz eine Ansatzzeile (002.001.0020)', () => {
    const z = l.aufmass?.positionen.find((p) => p.positionId === positionId(BVBS_LV, '002.001.0020'));
    expect(z).toEqual({
      positionId: positionId(BVBS_LV, '002.001.0020'),
      mengenansatz: [
        { zeile: 1, formel: 91, ausdruck: '(4,55 + 5,12 + 5,12) * 2', variable: null },
        {
          zeile: 2,
          formel: 91,
          ausdruck: '((5,50 + 7,50 + 1,22 * (2,3*1,23)))+(5,12 +5,33 + 9,21)',
          variable: null,
        },
      ],
      menge: null,
    });
  });
});
