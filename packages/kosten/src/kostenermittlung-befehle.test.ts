// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle an der Kostenermittlung (Ticket 82, v1.4): Ausführer, Anwenden, Umkehren. Der Ausführer prüft nur die Form
// (D-70.3): Nummer nach `kgLesen`, Betrag kanonisch mit 2 Stellen, Nummern eindeutig; Einträge nach Nummer geordnet,
// `bemerkung: ''` fällt weg. Nummern sind beliebige Ziffernfolgen der Form, keine Gruppen der Norm (G-16).

import type {
  Betrag,
  Kostenermittlung,
  KostenermittlungId,
  Kostenermittlungseintrag,
  KostenermittlungZustand,
  Kostengruppennummer,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kostenermittlungBefehlAusfuehren } from './index';

const kg = (n: string): Kostengruppennummer => n as Kostengruppennummer;
const b = (t: string): Betrag => t as Betrag;
function eintrag(nummer: string, betrag: string, bemerkung?: string): Kostenermittlungseintrag {
  return bemerkung === undefined
    ? { nummer: kg(nummer), betrag: b(betrag) }
    : { nummer: kg(nummer), betrag: b(betrag), bemerkung };
}

const ID = '019b76e9-0000-7000-8000-000000000130' as KostenermittlungId;
const KB: Kostenermittlung = {
  id: ID,
  projektId: '019b76e9-0000-7000-8000-000000000001' as ProjektId,
  stufe: 'kostenberechnung',
  name: 'Kostenberechnung',
  eintraege: [eintrag('330', '15.00', 'Außenwände'), eintrag('340', '10.00'), eintrag('410', '25.00')],
};
const ZUSTAND: KostenermittlungZustand = { kostenermittlung: KB };

describe('kostenermittlungBefehlAusfuehren: KostenermittlungAnlegen', () => {
  it('ordnet die Einträge nach Nummer und lässt eine leere Bemerkung weg', () => {
    const r = kostenermittlungBefehlAusfuehren(null, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: {
        ...KB,
        eintraege: [
          eintrag('410', '25.00', ''),
          eintrag('330', '15.00', 'Außenwände'),
          eintrag('340', '10.00'),
        ],
      },
    });
    expect(r).toEqual({
      ok: true,
      wert: {
        art: 'kostenermittlung',
        kostenermittlungId: ID,
        kostenermittlung: { vorher: null, nachher: KB },
      },
    });
  });

  it('verlangt, dass es die Kostenermittlung noch nicht gibt', () => {
    const r = kostenermittlungBefehlAusfuehren(ZUSTAND, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: KB,
    });
    expect(r.ok ? null : r.fehler.code).toBe('befehl-nicht-zustaendig');
  });

  it.each([
    ['Nummer mit Leerraum', [eintrag(' 330', '15.00')], 'nummer'],
    ['Nummer unter 100', [eintrag('099', '15.00')], 'nummer'],
    ['Nummer mit Präfix', [eintrag('KG330', '15.00')], 'nummer'],
    ['Betrag mit 1 Stelle', [eintrag('330', '15.0')], 'betrag'],
    ['Betrag mit 3 Stellen', [eintrag('330', '15.000')], 'betrag'],
    ['Betrag mit Komma', [eintrag('330', '15,00')], 'betrag'],
    ['doppelte Nummer', [eintrag('330', '15.00'), eintrag('340', '1.00'), eintrag('330', '2.00')], 'nummer'],
  ])('weist eine ungültige Form ab: %s', (_, eintraege, feld) => {
    const r = kostenermittlungBefehlAusfuehren(null, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: { ...KB, eintraege },
    });
    expect(r.ok ? null : [r.fehler.code, r.fehler.feld]).toEqual(['ungueltige-eingabe', feld]);
  });

  it('weist eine unbekannte Stufe ab', () => {
    const r = kostenermittlungBefehlAusfuehren(null, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: { ...KB, stufe: 'kostenvoranschlag' as Kostenermittlung['stufe'] },
    });
    expect(r.ok ? null : [r.fehler.code, r.fehler.feld]).toEqual(['ungueltige-eingabe', 'stufe']);
  });

  it('nimmt negative Beträge und eigene Beträge neben Kindern an (Befund der Rechnung, keine Sperre, U5)', () => {
    const r = kostenermittlungBefehlAusfuehren(null, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: { ...KB, eintraege: [eintrag('300', '-5.00'), eintrag('330', '15.00')] },
    });
    expect(r.ok).toBe(true);
  });
});
