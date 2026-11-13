// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreib- und Lesewege der Honorarseiten (Ticket 119). Jede Änderung ist ein Befehl durch `honorar` und Speicher mit
// Protokolleintrag und einem Undo-Teil (A5, U7). Lesen über die Repositories von `speicher`, nie über die Projektdatei.

import {
  honorarBerechnen,
  honorarberechnungBefehlAusfuehren,
  honorarberechnungChangeSetAnwenden,
} from '@tethys/honorar';
import type {
  Ergebnis,
  Honorarberechnung,
  HonorarberechnungBefehl,
  HonorarberechnungZustand,
  Honorarergebnis,
  Kostenermittlung,
  Nebenkostenangabe,
  Honorarobjekt,
  IdQuelle,
  ProjektId,
  Prozent,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { befehlswegFuer, eintrag, speichern, Sitzung, type Lauf, type Umgebung } from '../lv/befehlsweg';
import { kostenermittlungenLaden } from '../kosten/schreiben';
import { STANDARD_MWST } from '../projekt/befehle';

export type HonorarberechnungSitzung = Sitzung<HonorarberechnungZustand | null, HonorarberechnungBefehl>;

/** Ein Befehl an der Honorarberechnung durch Fachpaket und Speicher. `zustand` ist `null` nur für `HonorarberechnungAnlegen`. */
export async function honorarberechnungBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: HonorarberechnungZustand | null,
  befehl: HonorarberechnungBefehl,
): Promise<Lauf<HonorarberechnungZustand | null>> {
  const r = honorarberechnungBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'honorarberechnung', id: cs.honorarberechnungId }, befehl);
  return speichern(u, e, cs, () => honorarberechnungChangeSetAnwenden(zustand, cs));
}

export function honorarberechnungSitzung(
  u: Umgebung,
  projektId: ProjektId,
  zustand: HonorarberechnungZustand | null,
): HonorarberechnungSitzung {
  return new Sitzung(befehlswegFuer(u), zustand, (z, b) =>
    honorarberechnungBefehlAnwenden(u, projektId, z, b),
  );
}

/** Die Honorarberechnungen des Projekts ganz geladen, in der Reihenfolge der Liste (Name, dann Kennung). */
export async function honorarberechnungenLaden(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly HonorarberechnungZustand[], Speicherfehler>> {
  const liste = await speicher.honorarberechnungen.auflisten(projektId);
  if (!liste.ok) return liste;
  const alle: HonorarberechnungZustand[] = [];
  for (const h of liste.wert) {
    const z = await speicher.honorarberechnungen.laden(h.id);
    if (!z.ok) return z;
    alle.push(z.wert);
  }
  return { ok: true, wert: alle };
}

/** Alle Kostenermittlungen des Projekts ganz (mit Einträgen), wie `honorarBerechnen` sie braucht (D-110.2). */
export async function kostenermittlungenDesProjekts(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly Kostenermittlung[], Speicherfehler>> {
  const r = await kostenermittlungenLaden(speicher, projektId);
  return r.ok ? { ok: true, wert: r.wert.map((z) => z.kostenermittlung) } : r;
}

/** Das Honorarergebnis der Berechnung mit allen Kostenermittlungen des Projekts (D-110.2); nie gespeichert. */
export function ergebnisBerechnen(
  berechnung: Honorarberechnung,
  kostenermittlungen: readonly Kostenermittlung[],
): Honorarergebnis {
  return honorarBerechnen(berechnung, kostenermittlungen);
}

/** Eine leere Honorarberechnung mit Standardwerten (MwSt 19 %); die Objekte folgen mit `HonorarberechnungSetzen`. */
export function honorarberechnungNeu(
  ids: IdQuelle,
  projektId: ProjektId,
  name: string,
  objekte: readonly Honorarobjekt[] = [],
  nebenkosten: Nebenkostenangabe | null = null,
  mwstSatz: Prozent = STANDARD_MWST, // Ticket 122: derselbe Standard wie für ein neues LV
): HonorarberechnungBefehl {
  return {
    art: 'HonorarberechnungAnlegen',
    honorarberechnung: {
      id: ids.honorarberechnung(),
      projektId,
      name: name.trim(),
      objekte,
      nebenkosten,
      mwstSatz,
    },
  };
}
