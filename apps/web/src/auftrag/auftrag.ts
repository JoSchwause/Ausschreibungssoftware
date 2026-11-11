// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV in der App. Anlegen nur über den Befehlsweg (A5, U7: ein Befehl, ein Undo-Schritt). Keine
// Rechnung hier: Summen kommen aus dem Kern (`auftragsLvBefehlAusfuehren`). Ticket 86: gelesen wird über das Repository
// `speicher.auftragsLeistungsverzeichnisse` (Vertrag v1.4) statt über den Export der Projektdatei (D-64.2), die Umkehrung
// ist `auftragsLvChangeSetUmkehren` des Kerns (D-64.4 entfällt).

import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisAnlegen,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvUebersicht,
  AuftragsLvZustand,
  Ergebnis,
  LeistungsverzeichnisId,
  LvZustand,
  ProjektId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { eintrag, speichern, type Abweisung, type Befehlsweg } from '../lv/befehlsweg';
import { inhaltKopf } from '../lv/inhalt';

/** Die Auftrags-LVs eines Projekts, ganz (mit Knoten und Summen), in der Reihenfolge des Repositorys (Name). */
export async function auftragsLvsLaden(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly AuftragsLvZustand[], Speicherfehler>> {
  const liste = await speicher.auftragsLeistungsverzeichnisse.auflisten(projektId);
  if (!liste.ok) return liste;
  const auftraege: AuftragsLvZustand[] = [];
  for (const { id } of liste.wert) {
    const a = await speicher.auftragsLeistungsverzeichnisse.laden(id);
    if (!a.ok) return a;
    auftraege.push(a.wert);
  }
  return { ok: true, wert: auftraege };
}

/** Das Auftrags-LV zu einem Ausschreibungs-LV aus der Übersicht, ohne die übrigen zu laden; `null`: keines (D-21). */
export async function auftragZumLvLaden(
  speicher: Speicher,
  projektId: ProjektId,
  lvId: LeistungsverzeichnisId,
): Promise<Ergebnis<AuftragsLvZustand | null, Speicherfehler>> {
  const liste = await speicher.auftragsLeistungsverzeichnisse.auflisten(projektId);
  if (!liste.ok) return liste;
  const u: AuftragsLvUebersicht | undefined = liste.wert.find((a) => a.leistungsverzeichnisId === lvId);
  if (u === undefined) return { ok: true, wert: null };
  return speicher.auftragsLeistungsverzeichnisse.laden(u.id);
}

/** Das Auftrags-LV zu einem Ausschreibungs-LV; es gibt höchstens eines (D-21). */
export function auftragZumLv(
  auftraege: readonly AuftragsLvZustand[],
  lvId: LeistungsverzeichnisId,
): AuftragsLvZustand | null {
  return auftraege.find((a) => a.auftragsLeistungsverzeichnis.leistungsverzeichnisId === lvId) ?? null;
}

export type Zuschlagserteilungsausgang =
  | { readonly ok: true; readonly id: AuftragsLeistungsverzeichnisId }
  /** Zum LV gibt es schon ein Auftrags-LV (D-21, Q5); nichts geschrieben. */
  | { readonly ok: false; readonly art: 'schon-vergeben'; readonly auftrag: AuftragsLvZustand }
  | { readonly ok: false; readonly art: 'abweisung'; readonly abweisung: Abweisung };

/**
 * Schreibt den Zuschlag (`AuftragsLeistungsverzeichnisAnlegen`) über die Kette des Befehlswegs: Kern, dann Speicher mit
 * Protokolleintrag, dann ein Undo-Schritt. Gibt es zum LV schon ein Auftrags-LV, wird nichts geschrieben; geprüft in der
 * Kette, damit auch ein doppelter Klick keinen zweiten Zuschlag erzeugt.
 */
export function zuschlagserteilungSpeichern(
  weg: Befehlsweg,
  befehl: AuftragsLeistungsverzeichnisAnlegen,
): Promise<Zuschlagserteilungsausgang> {
  const u = weg.umgebung;
  const a = befehl.auftragsLeistungsverzeichnis;
  return weg.reihe(async (): Promise<Zuschlagserteilungsausgang> => {
    const vorhanden = await auftragZumLvLaden(u.speicher, a.projektId, a.leistungsverzeichnisId);
    if (!vorhanden.ok)
      return { ok: false, art: 'abweisung', abweisung: { art: 'speicher', fehler: vorhanden.fehler } };
    if (vorhanden.wert !== null) return { ok: false, art: 'schon-vergeben', auftrag: vorhanden.wert };
    const r = auftragsLvBefehlAusfuehren(null, befehl);
    if (!r.ok) return { ok: false, art: 'abweisung', abweisung: { art: 'befehl', fehler: r.fehler } };
    const e = eintrag(u, a.projektId, { art: 'auftrags-leistungsverzeichnis', id: a.id }, befehl);
    const s = await speichern(u, e, r.wert, () => null);
    if (!s.ok) return { ok: false, art: 'abweisung', abweisung: s.abweisung };
    weg.historie.aufnehmen([s.teil]);
    return { ok: true, id: a.id };
  });
}

/**
 * Das Auftrags-LV in der Form eines LV-Zustands, für das schreibgeschützte Grid, die Prüfung und den GAEB-Writer, die
 * mit LVs arbeiten. Die Kennung des Auftrags-LV ist die Wurzel seiner Knoten (`WurzelId`).
 */
export function alsLvZustand(z: AuftragsLvZustand): LvZustand {
  const a = z.auftragsLeistungsverzeichnis;
  return {
    leistungsverzeichnis: {
      ...inhaltKopf(a),
      id: a.id as string as LeistungsverzeichnisId,
      projektId: a.projektId,
      knoten: a.knoten,
    },
    summen: z.summen,
  };
}
