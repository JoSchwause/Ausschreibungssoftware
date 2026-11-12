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
import { befehlswegFuer, eintrag, speichern, Sitzung, type Lauf, type Umgebung } from '../lv/befehlsweg';

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
  const r = mangelBefehlAusfuehren(zustand, befehl, bestand.wert);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'mangel', id: cs.mangelId }, befehl);
  return speichern(u, e, cs, () => mangelChangeSetAnwenden(zustand, cs));
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
  const r = bautagebucheintragBefehlAusfuehren(zustand, befehl, bestand.wert);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'bautagebucheintrag', id: cs.bautagebucheintragId }, befehl);
  return speichern(u, e, cs, () => bautagebucheintragChangeSetAnwenden(zustand, cs));
}

export function mangelSitzung(u: Umgebung, projektId: ProjektId, mangel: Mangel | null): MangelSitzung {
  return new Sitzung<MangelZustand | null, MangelBefehl>(
    befehlswegFuer(u),
    mangel === null ? null : { mangel },
    (z, b) => mangelBefehlAnwenden(u, projektId, z, b),
  );
}

export function bautagebuchSitzung(
  u: Umgebung,
  projektId: ProjektId,
  bautagebucheintrag: Bautagebucheintrag | null,
): BautagebuchSitzung {
  return new Sitzung<BautagebucheintragZustand | null, BautagebucheintragBefehl>(
    befehlswegFuer(u),
    bautagebucheintrag === null ? null : { bautagebucheintrag },
    (z, b) => bautagebucheintragBefehlAnwenden(u, projektId, z, b),
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
