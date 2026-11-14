// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreib- und Lesewege der Kostenseiten (Ticket 89). Jede Änderung ist ein Befehl durch Fachpaket und Speicher mit
// Protokolleintrag und einem Undo-Teil (A5, U7): `KostenermittlungBefehl` über `kosten`, `KostengruppeSetzen` am Auftrags-LV
// über den Kern. Mehrere Befehle einer Benutzeraktion bilden über `Sitzung.folge` einen Undo-Schritt. Lesen über die
// Repositories von `speicher` (v1.4), nie über die Projektdatei.

import { auftragsLvChangeSetAnwenden } from '@tethys/kern';
import { auftragsLvBefehlAusfuehren } from '@tethys/vergabe'; // D-98: Bieter- und Zuschlagsbefehle über die Vergabe
import { kostenermittlungBefehlAusfuehren, kostenermittlungChangeSetAnwenden } from '@tethys/kosten';
import type {
  AuftragsLvBefehl,
  AuftragsLvZustand,
  Ergebnis,
  KostenermittlungBefehl,
  KostenermittlungZustand,
  ProjektId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { befehlswegFuer, eintrag, speichern, Sitzung, type Lauf, type Umgebung } from '../lv/befehlsweg';

export type KostenermittlungSitzung = Sitzung<KostenermittlungZustand | null, KostenermittlungBefehl>;
export type AuftragsLvSitzung = Sitzung<AuftragsLvZustand, AuftragsLvBefehl>;

/** Ein Befehl an der Kostenermittlung durch Fachpaket und Speicher. `zustand` ist `null` nur für `KostenermittlungAnlegen`. */
export async function kostenermittlungBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: KostenermittlungZustand | null,
  befehl: KostenermittlungBefehl,
): Promise<Lauf<KostenermittlungZustand | null>> {
  const r = kostenermittlungBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'kostenermittlung', id: cs.kostenermittlungId }, befehl);
  return speichern(u, e, cs, () => kostenermittlungChangeSetAnwenden(zustand, cs));
}

/** Ein Befehl am Auftrags-LV (hier: `KostengruppeSetzen`) durch den Kern und den Speicher. */
export async function auftragsLvBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: AuftragsLvZustand,
  befehl: AuftragsLvBefehl,
): Promise<Lauf<AuftragsLvZustand>> {
  const r = auftragsLvBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(
    u,
    projektId,
    { art: 'auftrags-leistungsverzeichnis', id: cs.auftragsLeistungsverzeichnisId },
    befehl,
  );
  return speichern(u, e, cs, () => {
    const neu = auftragsLvChangeSetAnwenden(zustand, cs);
    if (neu === null) throw new Error('auftragsLvBefehlAnwenden: Auftrags-LV nach dem Befehl leer');
    return neu;
  });
}

export function kostenermittlungSitzung(
  u: Umgebung,
  projektId: ProjektId,
  zustand: KostenermittlungZustand | null,
): KostenermittlungSitzung {
  return new Sitzung(befehlswegFuer(u), zustand, (z, b) =>
    kostenermittlungBefehlAnwenden(u, projektId, z, b),
  );
}

export function auftragsLvSitzung(
  u: Umgebung,
  projektId: ProjektId,
  zustand: AuftragsLvZustand,
): AuftragsLvSitzung {
  return new Sitzung(befehlswegFuer(u), zustand, (z, b) => auftragsLvBefehlAnwenden(u, projektId, z, b));
}

/** Alle Kostenermittlungen des Projekts ganz geladen, in der Reihenfolge der Liste (Name, dann Kennung). */
export async function kostenermittlungenLaden(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly KostenermittlungZustand[], Speicherfehler>> {
  const liste = await speicher.kostenermittlungen.auflisten(projektId);
  if (!liste.ok) return liste;
  const alle: KostenermittlungZustand[] = [];
  for (const k of liste.wert) {
    const z = await speicher.kostenermittlungen.laden(k.id);
    if (!z.ok) return z;
    alle.push(z.wert);
  }
  return { ok: true, wert: alle };
}

/** Alle Auftrags-LVs des Projekts ganz geladen (Positionen und Summenstand). */
export async function auftraegeLaden(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly AuftragsLvZustand[], Speicherfehler>> {
  const liste = await speicher.auftragsLeistungsverzeichnisse.auflisten(projektId);
  if (!liste.ok) return liste;
  const alle: AuftragsLvZustand[] = [];
  for (const a of liste.wert) {
    const z = await speicher.auftragsLeistungsverzeichnisse.laden(a.id);
    if (!z.ok) return z;
    alle.push(z.wert);
  }
  return { ok: true, wert: alle };
}
