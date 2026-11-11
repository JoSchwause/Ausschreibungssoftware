// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV in der App. Anlegen nur über den Befehlsweg (A5, U7: ein Befehl, ein Undo-Schritt), lesen
// über die Projektdatei, weil `Speicher` (Vertrag v1.3) kein Repository für Auftrags-LVs hat (D-64.2). Keine Rechnung
// hier: Summen kommen aus dem Kern (`auftragsLvBefehlAusfuehren`), die Umkehrung ist die des Kerns für LV-ChangeSets,
// auf das gleich gebaute ChangeSet des Auftrags-LV übertragen.

import { auftragsLvBefehlAusfuehren, changeSetUmkehren } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisAnlegen,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Ergebnis,
  LeistungsverzeichnisId,
  LvChangeSet,
  LvKopf,
  LvZustand,
  Projektdatei,
  ProjektId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import type { Teil } from '../historie/historie';
import type { Abweisung, Befehlsweg } from '../lv/befehlsweg';

/** Die Auftrags-LVs eines Projekts, aus der Projektdatei des Speichers (D-64.2). */
export async function auftragsLvsLaden(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Ergebnis<readonly AuftragsLvZustand[], Speicherfehler>> {
  const r = await speicher.projektdateiExportieren(projektId);
  if (!r.ok) return r;
  // Dezimalwerte stehen in der Datei als Zeichenketten, also in der Form des Vertrags (G-56).
  const datei = JSON.parse(r.wert) as Pick<Projektdatei, 'auftragsLeistungsverzeichnisse'>;
  return { ok: true, wert: datei.auftragsLeistungsverzeichnisse };
}

/** Das Auftrags-LV zu einem Ausschreibungs-LV; es gibt höchstens eines (D-21). */
export function auftragZumLv(
  auftraege: readonly AuftragsLvZustand[],
  lvId: LeistungsverzeichnisId,
): AuftragsLvZustand | null {
  return auftraege.find((a) => a.auftragsLeistungsverzeichnis.leistungsverzeichnisId === lvId) ?? null;
}

export type Zuschlagsausgang =
  | { readonly ok: true; readonly id: AuftragsLeistungsverzeichnisId }
  /** Zum LV gibt es schon ein Auftrags-LV (D-21, Q5); nichts geschrieben. */
  | { readonly ok: false; readonly art: 'schon-vergeben'; readonly auftrag: AuftragsLvZustand }
  | { readonly ok: false; readonly art: 'abweisung'; readonly abweisung: Abweisung };

/**
 * Schreibt den Zuschlag (`AuftragsLeistungsverzeichnisAnlegen`) über die Kette des Befehlswegs: Kern, dann Speicher mit
 * Protokolleintrag, dann ein Undo-Schritt. Gibt es zum LV schon ein Auftrags-LV, wird nichts geschrieben; geprüft in der
 * Kette, damit auch ein doppelter Klick keinen zweiten Zuschlag erzeugt.
 */
export function zuschlagSpeichern(
  weg: Befehlsweg,
  befehl: AuftragsLeistungsverzeichnisAnlegen,
): Promise<Zuschlagsausgang> {
  const u = weg.umgebung;
  const a = befehl.auftragsLeistungsverzeichnis;
  return weg.reihe(async (): Promise<Zuschlagsausgang> => {
    const vorhanden = await auftragsLvsLaden(u.speicher, a.projektId);
    if (!vorhanden.ok)
      return { ok: false, art: 'abweisung', abweisung: { art: 'speicher', fehler: vorhanden.fehler } };
    const auftrag = auftragZumLv(vorhanden.wert, a.leistungsverzeichnisId);
    if (auftrag !== null) return { ok: false, art: 'schon-vergeben', auftrag };
    const r = auftragsLvBefehlAusfuehren(null, befehl);
    if (!r.ok) return { ok: false, art: 'abweisung', abweisung: { art: 'befehl', fehler: r.fehler } };
    const eintrag = {
      id: u.ids.protokoll(),
      projektId: a.projektId,
      aggregat: { art: 'auftrags-leistungsverzeichnis', id: a.id },
      wer: u.nutzer,
      wann: u.uhr(),
      befehl,
    } as const;
    const s = await u.speicher.anwenden(eintrag, r.wert);
    if (!s.ok) return { ok: false, art: 'abweisung', abweisung: { art: 'speicher', fehler: s.fehler } };
    const teil: Teil = {
      protokollId: eintrag.id,
      projektId: eintrag.projektId,
      aggregat: eintrag.aggregat,
      changeSet: r.wert,
    };
    weg.historie.aufnehmen([teil]);
    return { ok: true, id: a.id };
  });
}

/**
 * Umkehrung eines ChangeSets am Auftrags-LV (Undo/Redo). Das ChangeSet ist gleich gebaut wie das des LV (Vertrag); die
 * Knoten und Summen kehrt deshalb `changeSetUmkehren` des Kerns um, Kennung und Kopf werden nur vertauscht.
 */
export function auftragsLvChangeSetUmkehren(cs: AuftragsLvChangeSet): AuftragsLvChangeSet {
  const alsLv: LvChangeSet = {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: cs.auftragsLeistungsverzeichnisId as string as LeistungsverzeichnisId,
    kopf: null,
    knoten: cs.knoten,
    summen: cs.summen,
  };
  const u = changeSetUmkehren(alsLv);
  return {
    art: cs.art,
    auftragsLeistungsverzeichnisId: cs.auftragsLeistungsverzeichnisId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    knoten: u.knoten,
    summen: u.summen,
  };
}

/**
 * Das Auftrags-LV in der Form eines LV-Zustands, für das schreibgeschützte Grid, die Prüfung und den GAEB-Writer, die
 * mit LVs arbeiten. Die Kennung des Auftrags-LV ist die Wurzel seiner Knoten (`WurzelId`).
 */
export function alsLvZustand(z: AuftragsLvZustand): LvZustand {
  const {
    id,
    projektId,
    leistungsverzeichnisId: _lv,
    angebotId: _angebot,
    knoten,
    ...kopf
  } = z.auftragsLeistungsverzeichnis;
  const lvKopf: LvKopf = { ...kopf, id: id as string as LeistungsverzeichnisId, projektId };
  return { leistungsverzeichnis: { ...lvKopf, knoten }, summen: z.summen };
}
