// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreib- und Lesewege der Bauzeitseiten (Ticket 118). Jede Änderung ist ein `BauzeitenplanBefehl` durch `bauzeit` und den
// Speicher mit Protokolleintrag und einem Undo-Teil (A5, U7); Lesen über das Repository `bauzeitenplaene` (Ticket 106).

import { bauzeitenplanBefehlAusfuehren, bauzeitenplanChangeSetAnwenden } from '@tethys/bauzeit';
import type {
  BauzeitenplanBefehl,
  BauzeitenplanUebersicht,
  BauzeitenplanZustand,
  Ergebnis,
  ProjektId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { befehlswegFuer, eintrag, speichern, Sitzung, type Lauf, type Umgebung } from '../lv/befehlsweg';

export type BauzeitenplanSitzung = Sitzung<BauzeitenplanZustand | null, BauzeitenplanBefehl>;

/** Ein Befehl am Bauzeitenplan durch `bauzeit` und Speicher. `zustand` ist `null` nur für `BauzeitenplanAnlegen`. */
export async function bauzeitenplanBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BauzeitenplanZustand | null,
  befehl: BauzeitenplanBefehl,
): Promise<Lauf<BauzeitenplanZustand | null>> {
  const r = bauzeitenplanBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'bauzeitenplan', id: cs.bauzeitenplanId }, befehl);
  return speichern(u, e, cs, () => bauzeitenplanChangeSetAnwenden(zustand, cs));
}

export function bauzeitenplanSitzung(
  u: Umgebung,
  projektId: ProjektId,
  zustand: BauzeitenplanZustand | null,
): BauzeitenplanSitzung {
  return new Sitzung(befehlswegFuer(u), zustand, (z, b) => bauzeitenplanBefehlAnwenden(u, projektId, z, b));
}

/** Die Bauzeitenpläne des Projekts (nur Köpfe), nach Name, dann Kennung. */
export async function bauzeitenplaeneAuflisten(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly BauzeitenplanUebersicht[], Speicherfehler>> {
  const r = await speicher.bauzeitenplaene.auflisten(projektId);
  if (!r.ok) return r;
  const liste = [...r.wert].sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id));
  return { ok: true, wert: liste };
}
