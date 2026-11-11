// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezüge zwischen Aggregaten aus `vertrag` v1.4 (Ticket 79; Kommentar an `Speicher`, Q5). Nur lesende Prüfungen: Sie
// laufen in der Transaktion von `anwenden` bzw. des Imports (`schreiben.ts`) und brechen mit `konflikt` ab, wenn ein
// ChangeSet (auch ohne Ausführer, als Undo) einen Verweis ins Leere oder eine Regel über mehrere Aggregate verletzen würde.
// Der Kern sieht immer nur ein Aggregat (D-70.3); was nie verletzt sein darf, hält `speicher`.

import type { Aufmass, AuftragsLvKopf, Knoten, LvKopf, ProjektId, Rechnung } from '@tethys/vertrag';
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
    konflikt(
      `Die Nachtragsangaben des LV ${kopf.id} verweisen auf das Auftrags-LV ${n.auftragsLvId}, das es im Projekt nicht gibt`,
    );
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
      abbruch(
        'unbekannt',
        `Auftrags-LV ${kopf.id}: Das Feld ${feld} gibt es nur am Kopf eines LV (Vertrag v1.4).`,
      );
}

// --- Aufmaßblatt --------------------------------------------------------------------------------------------------

/** Anlegen: Das Auftrags-LV gibt es im Projekt, die Blattnummer ist dort noch frei (je Auftrags-LV eindeutig). */
export function pruefeAufmassAnlegen(db: Datenbank, a: Aufmass): void {
  if (!auftragsLvImProjekt(db, a.auftragsLvId, a.projektId))
    konflikt(
      `Aufmaßblatt ${a.id} verweist auf das Auftrags-LV ${a.auftragsLvId}, das es im Projekt nicht gibt`,
    );
  const da = db.zeilen('SELECT id FROM aufmass WHERE auftrags_lv_id = ? AND nummer = ?', [
    a.auftragsLvId,
    a.nummer,
  ])[0];
  if (da !== undefined)
    konflikt(
      `Die Blattnummer ${String(a.nummer)} hat im Auftrags-LV ${a.auftragsLvId} schon ${String(da['id'])}`,
    );
}

/**
 * Ein Auftrags-LV-ChangeSet entfernt keine Position, auf die eine Aufmaßzeile eines Blatts dieses Auftrags-LV verweist
 * (etwa die Umkehrung von `NachtragUebernehmen`). Nur wenn das ChangeSet Positionen entfernt: Die Einzeländerung bleibt
 * frei von dieser Abfrage (Ticket 52).
 */
export function pruefeEntfernteAufmasspositionen(
  db: Datenbank,
  auftragsLvId: string,
  entfernt: readonly Knoten[],
): void {
  const weg = new Set<string>(entfernt.filter((k) => k.art === 'position').map((k) => k.id));
  if (weg.size === 0) return;
  const zeilen = db.zeilen(
    `SELECT a.id, json_extract(j.value, '$.positionId') AS position FROM aufmass a, json_each(a.positionen) j
     WHERE a.auftrags_lv_id = ? ORDER BY a.nummer`,
    [auftragsLvId],
  );
  const treffer = zeilen.find((z) => weg.has(String(z['position'])));
  if (treffer !== undefined)
    konflikt(
      `Die Position ${String(treffer['position'])} hat eine Zeile im Aufmaßblatt ${String(treffer['id'])} und lässt sich nicht aus dem Auftrags-LV entfernen`,
    );
}

/** Löschen: Kein Blatt, das in einer Rechnung steht (`Rechnung.aufmassIds`). */
export function pruefeAufmassLoeschen(db: Datenbank, a: Aufmass): void {
  const r = db.zeilen(
    `SELECT r.id FROM rechnung r, json_each(r.angaben, '$.aufmassIds') j
     WHERE r.auftrags_lv_id = ? AND j.value = ? ORDER BY r.nummer LIMIT 1`,
    [a.auftragsLvId, a.id],
  )[0];
  if (r !== undefined)
    konflikt(`Aufmaßblatt ${a.id} steht in Rechnung ${String(r['id'])} und lässt sich nicht löschen`);
}

// --- Rechnung (Invariante der Freigaben, D-34 (7)) -------------------------------------------------------------------

/** Die nach Nummer erste freigegebene Rechnung des Auftrags-LV mit größerer Nummer als `nummer`, sonst `undefined`. */
function spaetereFreigegebene(db: Datenbank, auftragsLvId: string, nummer: number): string | undefined {
  const z = db.zeilen(
    `SELECT id FROM rechnung WHERE auftrags_lv_id = ? AND nummer > ?
       AND json_extract(angaben, '$.freigabe') IS NOT NULL ORDER BY nummer LIMIT 1`,
    [auftragsLvId, nummer],
  )[0];
  return z === undefined ? undefined : String(z['id']);
}

/**
 * Anlegen: Das Auftrags-LV gibt es im Projekt, die Nummer ist frei, und keine Rechnung mit größerer Nummer ist schon
 * freigegeben (sonst käme eine Rechnung zwischen eingefrorene Zahlbeträge: AR 2 löschen, AR 3 freigeben, AR 2 neu anlegen).
 */
export function pruefeRechnungAnlegen(db: Datenbank, r: Rechnung): void {
  if (!auftragsLvImProjekt(db, r.auftragsLvId, r.projektId))
    konflikt(`Rechnung ${r.id} verweist auf das Auftrags-LV ${r.auftragsLvId}, das es im Projekt nicht gibt`);
  const da = db.zeilen('SELECT id FROM rechnung WHERE auftrags_lv_id = ? AND nummer = ?', [
    r.auftragsLvId,
    r.nummer,
  ])[0];
  if (da !== undefined)
    konflikt(
      `Die Rechnungsnummer ${String(r.nummer)} hat im Auftrags-LV ${r.auftragsLvId} schon ${String(da['id'])}`,
    );
  const spaeter = spaetereFreigegebene(db, r.auftragsLvId, r.nummer);
  if (spaeter !== undefined)
    konflikt(
      `Rechnung ${r.id} (Nummer ${String(r.nummer)}) läge vor der schon freigegebenen Rechnung ${spaeter}`,
    );
}

/** Löschen: keine spätere Rechnung desselben Auftrags-LV ist freigegeben. */
export function pruefeRechnungLoeschen(db: Datenbank, r: Rechnung): void {
  const spaeter = spaetereFreigegebene(db, r.auftragsLvId, r.nummer);
  if (spaeter !== undefined)
    konflikt(
      `Rechnung ${r.id} lässt sich nicht löschen, solange die spätere Rechnung ${spaeter} freigegeben ist`,
    );
}

/** Jede Kennung in `aufmassIds` ist ein Blatt desselben Auftrags-LV. */
export function pruefeRechnungsaufmasse(db: Datenbank, r: Rechnung): void {
  for (const a of r.aufmassIds) {
    const da = db.zeilen('SELECT 1 AS da FROM aufmass WHERE id = ? AND auftrags_lv_id = ?', [
      a,
      r.auftragsLvId,
    ]);
    if (da.length === 0)
      konflikt(
        `Rechnung ${r.id} nennt das Aufmaßblatt ${a}, das es im Auftrags-LV ${r.auftragsLvId} nicht gibt`,
      );
  }
}

/**
 * Nach dem Schreiben: Die freigegebenen Rechnungen des Auftrags-LV sind die mit den kleinsten Nummern (D-34 (7)). Verletzt
 * ist sie nach einer Freigabe, solange eine frühere nicht freigegeben ist, und nach dem Aufheben einer Freigabe, solange
 * eine spätere freigegeben ist.
 */
export function pruefeFreigabereihenfolge(db: Datenbank, auftragsLvId: string): void {
  const z = db.zeilen(
    `SELECT f.id AS frei, o.id AS offen FROM rechnung f JOIN rechnung o
       ON o.auftrags_lv_id = f.auftrags_lv_id AND o.nummer < f.nummer
     WHERE f.auftrags_lv_id = ? AND json_extract(f.angaben, '$.freigabe') IS NOT NULL
       AND json_extract(o.angaben, '$.freigabe') IS NULL
     ORDER BY o.nummer, f.nummer LIMIT 1`,
    [auftragsLvId],
  )[0];
  if (z !== undefined)
    konflikt(
      `Rechnung ${String(z['frei'])} wäre freigegeben, die frühere Rechnung ${String(z['offen'])} nicht ` +
        '(die freigegebenen Rechnungen sind stets die mit den kleinsten Nummern, D-34 (7))',
    );
}
