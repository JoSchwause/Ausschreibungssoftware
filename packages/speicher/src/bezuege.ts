// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezüge zwischen Aggregaten aus `vertrag` v1.4 (Ticket 79; Kommentar an `Speicher`, Q5). Nur lesende Prüfungen: Sie
// laufen in der Transaktion von `anwenden` bzw. des Imports (`schreiben.ts`) und brechen mit `konflikt` ab, wenn ein
// ChangeSet (auch ohne Ausführer, als Undo) einen Verweis ins Leere oder eine Regel über mehrere Aggregate verletzen würde.
// Der Kern sieht immer nur ein Aggregat (D-70.3); was nie verletzt sein darf, hält `speicher`.

import type { AuftragsLvKopf, LvKopf, ProjektId } from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import type { Datenbank } from './sql';

const konflikt = (was: string): never =>
  abbruch('konflikt', `Konflikt: ${was}; es wurde nichts geschrieben.`);

/** Gibt es das Auftrags-LV im Projekt? */
export function auftragsLvImProjekt(db: Datenbank, id: string, projektId: ProjektId): boolean {
  return (
    db.zeilen('SELECT 1 AS da FROM auftrags_lv WHERE id = ? AND projekt_id = ?', [id, projektId]).length > 0
  );
}

/** Nachtragsangaben am LV-Kopf verweisen auf ein Auftrags-LV desselben Projekts (`Nachtragsangaben.auftragsLvId`). */
export function pruefeNachtragsbezug(db: Datenbank, kopf: LvKopf): void {
  const n = kopf.nachtrag;
  if (n !== undefined && !auftragsLvImProjekt(db, n.auftragsLvId, kopf.projektId))
    konflikt(`Die Nachtragsangaben des LV ${kopf.id} verweisen auf das Auftrags-LV ${n.auftragsLvId}, das es im Projekt nicht gibt`);
}

/** Nach einem Import: die Nachtragsangaben aller LVs des Projekts (das Auftrags-LV entsteht dort erst nach dem LV). */
export function pruefeNachtragsbezuege(db: Datenbank, projektId: ProjektId): void {
  const z = db.zeilen(
    `SELECT l.id, json_extract(l.nachtrag, '$.auftragsLvId') AS ziel FROM leistungsverzeichnis l
     WHERE l.projekt_id = ?1 AND l.nachtrag IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM auftrags_lv a
                       WHERE a.id = json_extract(l.nachtrag, '$.auftragsLvId') AND a.projekt_id = ?1)
     ORDER BY l.id LIMIT 1`,
    [projektId],
  )[0];
  if (z !== undefined)
    konflikt(
      `Die Nachtragsangaben des LV ${String(z['id'])} verweisen auf das Auftrags-LV ${String(z['ziel'])}, das es im Projekt nicht gibt`,
    );
}

/**
 * Am Kopf des Auftrags-LV gibt es weder `nachtrag` noch `vorlage` (D-70.2, D-42). Trägt ein ChangeSet sie trotzdem (etwa
 * aus einem LV-Kopf übernommen), gingen sie beim Speichern still verloren (Q5): `unbekannt` (D-79.3).
 */
export function pruefeAuftragsLvKopf(kopf: AuftragsLvKopf): void {
  for (const feld of ['nachtrag', 'vorlage'])
    if ((kopf as unknown as Record<string, unknown>)[feld] !== undefined)
      abbruch('unbekannt', `Auftrags-LV ${kopf.id}: Das Feld ${feld} gibt es nur am Kopf eines LV (Vertrag v1.4).`);
}
