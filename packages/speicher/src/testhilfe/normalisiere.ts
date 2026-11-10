// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests (Node und Browser): bringt einen Zustand in die kanonische Reihenfolge des Speichers.

import type { AngebotZustand, Knoten, Leistungsverzeichnis, LvZustand, Summenstand } from '@tethys/vertrag';

/**
 * Vergleichsform: Listen, deren Reihenfolge der Speicher kanonisch festlegt, sortiert. Beim LV folgen die Summen
 * der Knotenreihenfolge (wie `kern`), beim Angebot sind sie nach Kennung sortiert.
 */
export function normalisiere(z: LvZustand): LvZustand;
export function normalisiere(z: AngebotZustand): AngebotZustand;
export function normalisiere(z: LvZustand | AngebotZustand): LvZustand | AngebotZustand {
  const nachId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const s = z.summen;
  if ('angebot' in z) {
    const summenstand: Summenstand = {
      positionen: [...s.positionen].sort((a, b) => nachId(a.positionId, b.positionId)),
      gliederungen: [...s.gliederungen].sort((a, b) => nachId(a.gliederungId, b.gliederungId)),
      gesamt: s.gesamt,
    };
    const positionen = [...z.angebot.positionen].sort((a, b) => nachId(a.positionId, b.positionId));
    return { ...z, angebot: { ...z.angebot, positionen }, summen: summenstand };
  }
  const knoten = tiefensuche(z.leistungsverzeichnis);
  const platz = new Map<string, number>();
  knoten.forEach((k, i) => platz.set(k.id, i));
  const nachPlatz = (a: string, b: string): number => (platz.get(a) ?? Infinity) - (platz.get(b) ?? Infinity);
  const summenstand: Summenstand = {
    positionen: [...s.positionen].sort((a, b) => nachPlatz(a.positionId, b.positionId)),
    gliederungen: [...s.gliederungen].sort((a, b) => nachPlatz(a.gliederungId, b.gliederungId)),
    gesamt: s.gesamt,
  };
  return {
    ...z,
    leistungsverzeichnis: { ...z.leistungsverzeichnis, knoten },
    summen: summenstand,
  };
}

/** Kanonische Knotenreihenfolge des Speichers: Tiefensuche, Eltern vor Kindern, Geschwister nach `reihenfolge`. */
function tiefensuche(lv: Leistungsverzeichnis): Knoten[] {
  const kinder = new Map<string, Knoten[]>();
  for (const k of lv.knoten) {
    const liste = kinder.get(k.elternId);
    if (liste === undefined) kinder.set(k.elternId, [k]);
    else liste.push(k);
  }
  const aus: Knoten[] = [];
  const geheTief = (elternId: string): void => {
    for (const k of [...(kinder.get(elternId) ?? [])].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
      aus.push(k);
      geheTief(k.id);
    }
  };
  geheTief(lv.id);
  return aus;
}
