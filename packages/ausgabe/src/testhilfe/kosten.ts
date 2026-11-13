// SPDX-License-Identifier: AGPL-3.0-or-later
// Testdaten der Ausgaben der Kosten (Ticket 153), nicht exportiert über index.ts. Die Zahlen sind Eingaben, wie `kosten` sie
// liefern würde, von Hand gesetzt und in sich stimmig (der Druck rechnet nichts, A2). Die Bezeichnungen sind erfunden, keine
// Texte der Norm (C1, G-16).

import type {
  Betrag,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppenbezeichnung,
  Kostengruppennummer,
  ProjektId,
} from '@tethys/vertrag';
import type { KostenermittlungEingabe, KostenkontrolleEingabe } from '../kosten-druck';

const b = (t: string): Betrag => t as Betrag;
const kg = (t: string): Kostengruppennummer => t as Kostengruppennummer;

export const KOSTENERMITTLUNG: Kostenermittlung = {
  id: 'ke-1' as KostenermittlungId,
  projektId: 'projekt-1' as ProjektId,
  stufe: 'kostenberechnung',
  name: 'Entwurf',
  eintraege: [
    { nummer: kg('330'), betrag: b('120000.00'), bemerkung: 'nach Planstand 3' },
    { nummer: kg('340'), betrag: b('45000.00') },
    { nummer: kg('400'), betrag: b('30000.00') },
  ],
};

/** Ergebnis von `kostenermittlungBerechnen` zu den Einträgen oben: 300 nur als Vorfahre. */
export const KOSTENERMITTLUNG_ERGEBNIS: KostenermittlungEingabe['ergebnis'] = {
  gruppen: [
    { nummer: kg('300'), ebene: 1, eigenerBetrag: null, summe: b('165000.00') },
    { nummer: kg('330'), ebene: 2, eigenerBetrag: b('120000.00'), summe: b('120000.00') },
    { nummer: kg('340'), ebene: 2, eigenerBetrag: b('45000.00'), summe: b('45000.00') },
    { nummer: kg('400'), ebene: 1, eigenerBetrag: b('30000.00'), summe: b('30000.00') },
  ],
  gesamtsumme: b('195000.00'),
};

/** Erfundene Bezeichnungen für zwei der vier Gruppen; 340 und 400 bleiben ohne. */
export const BEZEICHNUNGEN: readonly Kostengruppenbezeichnung[] = [
  { nummer: kg('300'), bezeichnung: 'Eigene Gruppe Hochbau' },
  { nummer: kg('330'), bezeichnung: 'Eigene Gruppe Mauern' },
];

const w = (budget: string | null, vergabe: string, abrechnung: string, abweichung: string | null) => ({
  budget: budget === null ? null : b(budget),
  vergabe: b(vergabe),
  abrechnung: b(abrechnung),
  abweichung: abweichung === null ? null : b(abweichung),
});

/**
 * Ergebnis von `kostenkontrolleBerechnen` mit der Kostenermittlung oben als Budget: Zeilensumme (Ebene 1 + ohne
 * Kostengruppe + Nachlass) = Gesamt in jeder Spalte (D-37), Abweichung = Vergabe − Budget.
 */
export const KOSTENKONTROLLE: KostenkontrolleEingabe['kontrolle'] = {
  kostengruppen: [
    { nummer: kg('300'), ebene: 1, ...w('165000.00', '158400.50', '80000.00', '-6599.50') },
    { nummer: kg('330'), ebene: 2, ...w('120000.00', '125000.25', '80000.00', '5000.25') },
    { nummer: kg('340'), ebene: 2, ...w('45000.00', '33400.25', '0.00', '-11599.75') },
    { nummer: kg('400'), ebene: 1, ...w('30000.00', '0.00', '0.00', '-30000.00') },
  ],
  ohneKostengruppe: w(null, '1200.00', '300.00', '1200.00'),
  nachlass: w(null, '-3000.00', '-1500.00', '-3000.00'),
  gesamt: w('195000.00', '156600.50', '78800.00', '-38399.50'),
};
