// SPDX-License-Identifier: AGPL-3.0-or-later
// Form der Kopffelder aus Vertrag v1.3 (Ticket 56, aus Ticket 53/D-27; D-28): `auftragnehmer` und `epaBezeichnungen`
// prüft der Kern beim Anlegen eines LV und eines Auftrags-LV (`inhaltKopfFehler`). Nur die Form, nie Inhalte (wie
// D-41.1 für die Kopfdaten).

import { describe, expect, it } from 'vitest';
import type {
  Auftragnehmer,
  AuftragsLeistungsverzeichnisId,
  EpaBezeichnung,
  LvBefehl,
  LvInhalt,
  ProjektId,
} from '@tethys/vertrag';
import { auftragsLvBefehlAusfuehren, lvBefehlAusfuehren } from './index';
import { LV_ID, PROJEKT_ID, anwenden, erwarteOk, inhalt } from './testhilfen';

const anlegen = (ueber: Partial<LvInhalt>): LvBefehl => ({
  art: 'LeistungsverzeichnisAnlegen',
  id: LV_ID,
  projektId: PROJEKT_ID,
  inhalt: { ...inhalt(), ...ueber },
});

const feldfehler = (ueber: Record<string, unknown>): string | null => {
  const e = lvBefehlAusfuehren(null, anlegen(ueber));
  return e.ok ? null : `${e.fehler.code}:${e.fehler.feld ?? ''}`;
};

const AUFTRAGNEHMER: Auftragnehmer = { name: 'Bau GmbH', strasse: null, plz: '12345', ort: 'Ort' };
const EPA: readonly EpaBezeichnung[] = [
  { nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' },
  { nummer: 3, anteil: 'geraete', bezeichnung: null },
  { nummer: 6, anteil: 'frei', bezeichnung: 'Fracht' },
];

describe('Kopf v1.3: Auftragnehmer und EPA-Bezeichnungen', () => {
  it('gültige Felder werden angenommen und stehen im Kopf', () => {
    const z = anwenden(
      null,
      erwarteOk(lvBefehlAusfuehren(null, anlegen({ auftragnehmer: AUFTRAGNEHMER, epaBezeichnungen: EPA }))),
    );
    expect(z.leistungsverzeichnis.auftragnehmer).toEqual(AUFTRAGNEHMER);
    expect(z.leistungsverzeichnis.epaBezeichnungen).toEqual(EPA);
  });

  it('auftragnehmer: ein Objekt mit vier Feldern, je Zeichenkette oder null', () => {
    const ae = 'ungueltige-eingabe:auftragnehmer';
    expect(feldfehler({ auftragnehmer: null })).toBe(ae);
    expect(feldfehler({ auftragnehmer: 'Bau GmbH' })).toBe(ae);
    expect(feldfehler({ auftragnehmer: { ...AUFTRAGNEHMER, plz: 12345 } })).toBe(ae);
    expect(feldfehler({ auftragnehmer: { name: 'x', strasse: null, plz: null } })).toBe(ae);
    expect(feldfehler({ auftragnehmer: { name: null, strasse: null, plz: null, ort: null } })).toBeNull();
  });

  it('epaBezeichnungen: nicht leer, nach nummer aufsteigend, nummer 1 bis 6 und anteil je eindeutig (D-28)', () => {
    const epa = 'ungueltige-eingabe:epaBezeichnungen';
    const mit = (...e: readonly unknown[]) => feldfehler({ epaBezeichnungen: e });
    expect(mit()).toBe(epa); // nie [] (D-53.6)
    expect(feldfehler({ epaBezeichnungen: 'Lohn' })).toBe(epa);
    expect(mit(EPA[1], EPA[0])).toBe(epa); // nicht sortiert
    expect(mit(EPA[0], { ...EPA[1], nummer: 1 })).toBe(epa); // nummer doppelt
    expect(mit(EPA[0], { ...EPA[1], anteil: 'lohn' })).toBe(epa); // anteil doppelt
    expect(mit({ ...EPA[0], nummer: 0 })).toBe(epa);
    expect(mit({ ...EPA[0], nummer: 7 })).toBe(epa);
    expect(mit({ ...EPA[0], nummer: 1.5 })).toBe(epa);
    expect(mit({ ...EPA[0], anteil: 'freiBezeichnung' })).toBe(epa);
    expect(mit({ ...EPA[0], anteil: 'material' })).toBe(epa);
    expect(mit({ ...EPA[0], bezeichnung: 3 })).toBe(epa);
    expect(mit(null)).toBe(epa);
    expect(mit({ nummer: 2, anteil: 'stoffe', bezeichnung: null })).toBeNull();
  });

  it('Auftrags-LV: dieselbe Prüfung', () => {
    const lv = erwarteOk(lvBefehlAusfuehren(null, anlegen({})));
    const kopf = lv.kopf?.nachher ?? null;
    if (kopf === null) throw new Error('kein Kopf');
    const e = auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: {
        ...kopf,
        id: 'auftrag' as AuftragsLeistungsverzeichnisId,
        projektId: 'projekt-test' as ProjektId,
        leistungsverzeichnisId: LV_ID,
        angebotId: 'angebot' as never,
        knoten: [],
        epaBezeichnungen: [],
      },
    });
    expect(e.ok ? null : e.fehler.feld).toBe('epaBezeichnungen');
  });
});
