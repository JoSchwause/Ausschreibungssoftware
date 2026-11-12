// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  Aufmass,
  AuftragsLvZustand,
  KostenermittlungId,
  KostenermittlungZustand,
  Leistungsstand,
  Rechnung,
  Speicher,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { budgetWaehlen, leistungsstaendeLaden } from './kontrolle';

const auftrag = (id: string) => ({ auftragsLeistungsverzeichnis: { id } }) as unknown as AuftragsLvZustand;
const rechnung = (nummer: number, aufmassIds: string[]) => ({ nummer, aufmassIds }) as unknown as Rechnung;
const stand = (gp: string) => ({ nettoNachNachlass: gp }) as unknown as Leistungsstand;

/** Ein Speicher, der nur Rechnungen und Aufmaße kennt. */
function speicher(rechnungen: Record<string, Rechnung[]>): Speicher {
  return {
    rechnungen: {
      auflisten: (id: string) => Promise.resolve({ ok: true, wert: rechnungen[id] ?? [] }),
    },
    aufmasse: {
      laden: (id: string) => Promise.resolve({ ok: true, wert: { aufmass: { id } as unknown as Aufmass } }),
    },
  } as unknown as Speicher;
}

describe('leistungsstaendeLaden', () => {
  const s = speicher({ a1: [rechnung(2, ['m2']), rechnung(1, ['m1'])], a2: [] });

  it('nimmt je Auftrags-LV die Rechnung mit der höchsten Nummer und deren Aufmaßblätter', async () => {
    const gesehen: { nummer: number; aufmasse: string[] }[] = [];
    const r = await leistungsstaendeLaden(s, [auftrag('a1'), auftrag('a2')], (_a, rechn, aufmasse) => {
      gesehen.push({ nummer: rechn.nummer, aufmasse: aufmasse.map((x) => x.id) });
      return stand('42.00');
    });
    expect(gesehen).toEqual([{ nummer: 2, aufmasse: ['m2'] }]);
    expect(r).toEqual({ ok: true, wert: [{ auftragsLvId: 'a1', leistungsstand: stand('42.00') }] });
  });

  it('ohne Rechner (Abrechnung nicht angeschlossen) gibt es keine Leistungsstände', async () => {
    expect(await leistungsstaendeLaden(s, [auftrag('a1')], null)).toEqual({ ok: true, wert: [] });
  });

  it('ein Speicherfehler kommt als Fehler zurück', async () => {
    const kaputt = {
      rechnungen: {
        auflisten: () => Promise.resolve({ ok: false, fehler: { code: 'unbekannt', meldung: 'x' } }),
      },
    } as unknown as Speicher;
    const r = await leistungsstaendeLaden(kaputt, [auftrag('a1')], () => stand('0.00'));
    expect(r.ok).toBe(false);
  });
});

describe('budgetWaehlen', () => {
  const z = (id: string) => ({ kostenermittlung: { id } }) as unknown as KostenermittlungZustand;
  it('findet die gewählte Kostenermittlung; null und Unbekanntes heißen kein Budget', () => {
    const alle = [z('k1'), z('k2')];
    expect(budgetWaehlen(alle, 'k2' as KostenermittlungId)?.id).toBe('k2');
    expect(budgetWaehlen(alle, null)).toBeNull();
    expect(budgetWaehlen(alle, 'x' as KostenermittlungId)).toBeNull();
  });
});
