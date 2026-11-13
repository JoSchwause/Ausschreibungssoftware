// SPDX-License-Identifier: AGPL-3.0-or-later
// Mängelauswertung (Ticket 111 Punkt 3; Glossar „Mängelauswertung“): Zahlen der Mängel eines Projekts zu einem Stichtag je
// Auftrags-LV mit dem Namen seines Auftragnehmers und gesamt. Den Namen übergibt die App (er steht am Auftrags-LV oder beim
// Bieter, die das Paket nicht liest). Rein (A2); der Stichtag kommt vom Aufrufer.

import type { AuftragsLeistungsverzeichnisId, Mangel, Mangelstatus } from '@tethys/vertrag';
import { istUeberfaellig, stichtagPruefen } from './fristpruefung';
import { istOffenerStatus, mangelstatus } from './mangelstatus';

/** Der Auftragnehmer eines Auftrags-LV, wie die App ihn anzeigt (Glossar „Mängelauswertung“). */
export interface Auftragnehmerangabe {
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
  /** Name des Auftragnehmers. */
  readonly auftragnehmer: string;
}

/** Zahlen einer Menge von Mängeln. Ganze Zahlen (Zähler), keine Mengen oder Beträge. */
export interface Maengelzahlen {
  readonly anzahl: number;
  readonly jeStatus: Readonly<Record<Mangelstatus, number>>;
  /** Mängel im Status offen oder angezeigt (noch nicht als beseitigt gemeldet), dieselbe Menge wie bei der Fristprüfung. */
  readonly offen: number;
  /** Mängel, die zum Stichtag überfällig sind (Fristprüfung). */
  readonly ueberfaellig: number;
}

/**
 * Eine Zeile der Auswertung: die Mängel eines Auftrags-LV. `auftragsLvId: null`: die Mängel ohne Auftrags-LV;
 * `auftragnehmer: null`: dazu keine Angabe der App (auch in der Zeile ohne Auftrags-LV).
 */
export interface Maengelauswertungszeile extends Maengelzahlen {
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId | null;
  readonly auftragnehmer: string | null;
}

export interface Maengelauswertung {
  readonly stichtag: string;
  /**
   * Zuerst jedes übergebene Auftrags-LV in der übergebenen Reihenfolge (auch ohne Mangel), dann je ein Auftrags-LV, das die
   * App nicht übergab (nach der kleinsten Mangelnummer), zuletzt die Mängel ohne Auftrags-LV (nur wenn es welche gibt).
   */
  readonly jeAuftragnehmer: readonly Maengelauswertungszeile[];
  readonly gesamt: Maengelzahlen;
}

type Zaehler = {
  -readonly [K in keyof Maengelzahlen]: K extends 'jeStatus' ? Record<Mangelstatus, number> : number;
};

function leer(): Zaehler {
  return {
    anzahl: 0,
    jeStatus: { offen: 0, angezeigt: 0, beseitigt: 0, abgenommen: 0 },
    offen: 0,
    ueberfaellig: 0,
  };
}

function zaehlen(z: Zaehler, m: Pick<Mangel, 'frist' | 'verlauf'>, stichtag: string): void {
  const status = mangelstatus(m);
  z.anzahl += 1;
  z.jeStatus[status] += 1;
  if (istOffenerStatus(status)) z.offen += 1;
  if (istUeberfaellig(m, stichtag)) z.ueberfaellig += 1;
}

/**
 * Wertet die Mängel eines Projekts zum Stichtag (`JJJJ-MM-TT`) aus. `auftraege`: je Auftrags-LV der Name seines
 * Auftragnehmers; nennt die Liste ein Auftrags-LV zweimal, gilt die erste Angabe. Ein Stichtag, der kein Kalendertag ist:
 * `RangeError`.
 */
export function maengelAuswerten(
  maengel: readonly Pick<Mangel, 'nummer' | 'auftragsLvId' | 'frist' | 'verlauf'>[],
  auftraege: readonly Auftragnehmerangabe[],
  stichtag: string,
): Maengelauswertung {
  stichtagPruefen(stichtag);
  const zeilen = new Map<
    AuftragsLeistungsverzeichnisId | null,
    { auftragnehmer: string | null; z: Zaehler }
  >();
  for (const a of auftraege) {
    if (!zeilen.has(a.auftragsLvId))
      zeilen.set(a.auftragsLvId, { auftragnehmer: a.auftragnehmer, z: leer() });
  }
  const gesamt = leer();
  const geordnet = [...maengel].sort((a, b) => a.nummer - b.nummer);
  for (const m of geordnet.filter((x) => x.auftragsLvId !== null)) {
    let zeile = zeilen.get(m.auftragsLvId);
    if (zeile === undefined) {
      zeile = { auftragnehmer: null, z: leer() };
      zeilen.set(m.auftragsLvId, zeile);
    }
    zaehlen(zeile.z, m, stichtag);
    zaehlen(gesamt, m, stichtag);
  }
  const ohne = geordnet.filter((x) => x.auftragsLvId === null);
  if (ohne.length > 0) {
    const zeile = { auftragnehmer: null, z: leer() };
    for (const m of ohne) {
      zaehlen(zeile.z, m, stichtag);
      zaehlen(gesamt, m, stichtag);
    }
    zeilen.set(null, zeile);
  }
  return {
    stichtag,
    jeAuftragnehmer: [...zeilen].map(([auftragsLvId, { auftragnehmer, z }]) => ({
      auftragsLvId,
      auftragnehmer,
      ...z,
    })),
    gesamt,
  };
}
