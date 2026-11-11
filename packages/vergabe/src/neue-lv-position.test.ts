// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 72 (D-57.2): Eine LV-Position, die nach dem Anlegen des Angebots ins LV kam, hat im Angebot keine gespeicherte
// Summe. Bepreist der Bieter sie, nennt `summen.vorher` für sie keinen alten Wert (der gespeicherte Stand ist „keine
// Zeile“); Rückgängig stellt den Summenstand von vorher her, ohne eine Summe mehr.

import { describe, expect, it } from 'vitest';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type { AngebotZustand, ElternId, LvBefehl, LvZustand, Menge, PositionId } from '@tethys/vertrag';
import { angebotBefehlAusfuehrer, angebotChangeSetAnwenden, angebotChangeSetUmkehren } from './index';
import {
  angebot,
  angebotszeilen,
  ep,
  erwarteOk,
  lv,
  position,
  projekt,
  speicherAnwenden,
  titel,
  wende,
} from './testhilfen';

/** LV-Befehl über den Kern ausführen und anwenden. */
function lvBefehl(z: LvZustand, befehl: LvBefehl): LvZustand {
  const neu = lvChangeSetAnwenden(z, erwarteOk(lvBefehlAusfuehren(z, befehl)));
  if (neu === null) throw new Error('Das LV ist weg.');
  return neu;
}

const vorAngebot = lv('lv-1', [
  titel('t1', 'lv-1', 0),
  position('p1', 't1', 0, '10.000'),
  position('p2', 't1', 1, '5.000'),
  titel('t2', 'lv-1', 1),
  position('p3', 't2', 0, '2.000'),
]);
const proj = projekt(['b-a']);

/** Das Angebot auf dem LV ohne `p4`, wie gespeichert. */
const angebotsstand = wende(angebotBefehlAusfuehrer(proj, vorAngebot), null, {
  art: 'AngebotAnlegen',
  angebot: angebot('a1', vorAngebot, 'b-a', [ep('p1', '10.000'), ep('p2', '8.000')]),
}) as AngebotZustand;

/** Danach kommt `p4` (Menge 4) ans Ende von Titel `t1`. */
const nachher = lvBefehl(vorAngebot, {
  art: 'PositionAnlegen',
  id: 'p4' as PositionId,
  ort: { art: 'ende', elternId: 't1' as ElternId },
  daten: {
    ordnungszahl: null,
    ozIndex: null,
    merkmale: position('x', 't1', 0, null).merkmale,
    zuschlag: null,
    kurztext: 'Position p4',
    langtext: [],
    menge: '4.000' as Menge,
    einheit: 'm',
    einheitspreis: null,
    epa: null,
  },
});
const ausfuehren = angebotBefehlAusfuehrer(proj, nachher);

describe('Bepreisen einer LV-Position, die nach dem Angebot hinzukam', () => {
  it('Rückgängig stellt den Summenstand von vorher her', () => {
    const cs = erwarteOk(
      ausfuehren(angebotsstand, { art: 'AngebotspositionSetzen', position: ep('p4', '2.500') }),
    );
    const bepreist = angebotChangeSetAnwenden(angebotsstand, cs) as AngebotZustand;
    // 4 × 2,500 = 10,00 kommt zu t1 (100,00 + 40,00) und zum Netto hinzu.
    expect(bepreist.summen.positionen.find((p) => p.positionId === 'p4')?.gesamtpreis).toBe('10.00');
    expect(bepreist.summen.gliederungen.find((g) => g.gliederungId === 't1')?.summe).toBe('150.00');
    expect(bepreist.summen.gesamt.netto).toBe('150.00');

    expect(angebotChangeSetAnwenden(bepreist, angebotChangeSetUmkehren(cs))).toEqual(angebotsstand);
  });

  it('auch in speicher: Rückgängig lässt keine Summenzeile zurück, Wiederholen schreibt sie wieder', () => {
    const cs = erwarteOk(
      ausfuehren(angebotsstand, { art: 'AngebotspositionSetzen', position: ep('p4', '2.500') }),
    );
    const gespeichert = angebotszeilen(angebotsstand);
    const bepreist = speicherAnwenden(gespeichert, cs);
    expect(bepreist).toEqual(angebotszeilen(angebotChangeSetAnwenden(angebotsstand, cs) as AngebotZustand));

    const zurueck = speicherAnwenden(bepreist, angebotChangeSetUmkehren(cs));
    expect(zurueck).toEqual(gespeichert);
    expect(speicherAnwenden(zurueck, cs)).toEqual(bepreist);
  });
});
