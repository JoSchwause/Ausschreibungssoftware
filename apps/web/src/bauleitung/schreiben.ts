// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreib- und Lesewege der Mängel- und Bautagebuchseite (Ticket 120). Jede Änderung ist ein Befehl durch `bauleitung` und
// Speicher mit Protokolleintrag und einem Undo-Teil (A5, U7). Mehrere Befehle einer Benutzeraktion (etwa „Mangel anzeigen“:
// Verlaufseintrag und neue Frist) bilden über `Sitzung.folge` einen Undo-Schritt. Die Ausführer prüfen die eindeutige Nummer
// bzw. das eindeutige Datum gegen den Bestand des Projekts; den liest dieser Weg vor jedem Befehl aus dem Speicher.

import {
  bautagebucheintragBefehlAusfuehren,
  bautagebucheintragChangeSetAnwenden,
  mangelBefehlAusfuehren,
  mangelChangeSetAnwenden,
} from '@tethys/bauleitung';
import type {
  Bautagebucheintrag,
  BautagebucheintragBefehl,
  BautagebucheintragZustand,
  Ergebnis,
  Mangel,
  MangelBefehl,
  MangelZustand,
  ProjektId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import type { Lauf, Sitzung, Umgebung } from '../lv/befehlsweg';
import { befehlSchreiben, fachSitzung } from '../ui/schreibweg';

export type MangelSitzung = Sitzung<MangelZustand | null, MangelBefehl>;
export type BautagebuchSitzung = Sitzung<BautagebucheintragZustand | null, BautagebucheintragBefehl>;

/** Ein Befehl am Mangel durch den Ausführer und den Speicher. `zustand` ist `null` nur für `MangelAnlegen`. */
export async function mangelBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: MangelZustand | null,
  befehl: MangelBefehl,
): Promise<Lauf<MangelZustand | null>> {
  const bestand = await u.speicher.maengel.auflisten(projektId);
  if (!bestand.ok) return { ok: false, abweisung: { art: 'speicher', fehler: bestand.fehler } };
  return befehlSchreiben(
    u,
    projektId,
    befehl,
    mangelBefehlAusfuehren(zustand, befehl, bestand.wert),
    (cs) => ({ art: 'mangel', id: cs.mangelId }),
    (cs) => mangelChangeSetAnwenden(zustand, cs),
  );
}

/** Ein Befehl am Bautagebucheintrag durch den Ausführer und den Speicher. `zustand` ist `null` beim Anlegen. */
export async function bautagebucheintragBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BautagebucheintragZustand | null,
  befehl: BautagebucheintragBefehl,
): Promise<Lauf<BautagebucheintragZustand | null>> {
  const bestand = await u.speicher.bautagebuch.auflisten(projektId);
  if (!bestand.ok) return { ok: false, abweisung: { art: 'speicher', fehler: bestand.fehler } };
  return befehlSchreiben(
    u,
    projektId,
    befehl,
    bautagebucheintragBefehlAusfuehren(zustand, befehl, bestand.wert),
    (cs) => ({ art: 'bautagebucheintrag', id: cs.bautagebucheintragId }),
    (cs) => bautagebucheintragChangeSetAnwenden(zustand, cs),
  );
}

export function mangelSitzung(u: Umgebung, projektId: ProjektId, mangel: Mangel | null): MangelSitzung {
  return fachSitzung(u, projektId, mangel === null ? null : { mangel }, mangelBefehlAnwenden);
}

export function bautagebuchSitzung(
  u: Umgebung,
  projektId: ProjektId,
  bautagebucheintrag: Bautagebucheintrag | null,
): BautagebuchSitzung {
  return fachSitzung(
    u,
    projektId,
    bautagebucheintrag === null ? null : { bautagebucheintrag },
    bautagebucheintragBefehlAnwenden,
  );
}

/** Alle Mängel des Projekts, nach Nummer (Repository). */
export const maengelLaden = (
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly Mangel[], Speicherfehler>> => speicher.maengel.auflisten(projektId);

/** Alle Einträge des Bautagebuchs, nach Datum (Repository). */
export const bautagebuchLaden = (
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly Bautagebucheintrag[], Speicherfehler>> =>
  speicher.bautagebuch.auflisten(projektId);
