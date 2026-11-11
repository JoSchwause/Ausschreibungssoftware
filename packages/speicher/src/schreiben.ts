// SPDX-License-Identifier: AGPL-3.0-or-later
// Die einzige Stelle, die Tabellen schreibt (A5). Jede Funktion hier läuft innerhalb der Transaktion des
// Aufrufers (`anwenden` oder Import); wirft sie, wird alles zurückgerollt.
//
// `speicher` darf `kern` nicht importieren (A3) und wendet ChangeSets deshalb auf Tabellenebene an:
// `hinzugefuegt` fügt Zeilen ein, `geaendert` ersetzt die Zeile, `entfernt` löscht sie, die gelisteten Summen
// werden überschrieben, `kopf` ersetzt die Stammdaten. Summen werden weder berechnet noch geprüft.
//
// Konsistenz: Vor jeder Änderung oder Löschung wird der gespeicherte Stand mit `vorher` (bzw. dem vollständigen
// Stand in `entfernt`) verglichen. Passt er nicht, bricht die Transaktion mit `konflikt` ab und nichts wird
// geschrieben (Q5). Nach dem Schreiben der Knoten wird der Baum auf Waisen und lückenlose `reihenfolge` je
// Elternknoten geprüft (ebenfalls `konflikt`). Widerspricht ein ChangeSet sich selbst oder dem Protokolleintrag
// (Kennungen weichen ab, fremdes Projekt), ist das ein Programmfehler: `unbekannt`.
//
// Löschen eines Aggregats (v1.1a, `nachher: null`): Das ChangeSet muss den vollen gespeicherten Stand tragen (Kopf in
// `vorher`, alle Knoten bzw. Angebotspositionen in `entfernt`, die Summen in `summen.vorher`, sofern gesetzt), damit
// seine Umkehrung das Aggregat ohne Verlust wiederherstellt. Hängen noch andere Aggregate daran, wird nicht
// kaskadiert, sondern mit `konflikt` abgewiesen.

import type {
  Aenderung,
  Aenderungen,
  AngebotChangeSet,
  AuftragsLvChangeSet,
  Gesamtsummen,
  Knoten,
  LeistungsverzeichnisId,
  LvChangeSet,
  LvStand,
  LvStandKopf,
  Papierkorbeintrag,
  Projekt,
  ProjektChangeSet,
  ProjektId,
  Protokolleintrag,
  Summenaenderung,
  Summenstand,
  Zeitstempel,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import { kanonischKompakt } from './kanonisch';
import {
  leseAngebotKopf,
  leseAngebotposition,
  leseAuftragsLvKopf,
  leseKnoten1,
  leseLv,
  leseLvKopf,
  leseLvStand,
  lesePapierkorbeintrag,
  leseProjekt,
  leseSummen,
} from './lesen';
import type { Datenbank, SqlWert } from './sql';
import {
  angebotspositionWerte,
  KNOTEN_SPALTEN,
  knotenZuBindung,
  kopfdatenSpalten,
  nachlassSpalten,
} from './zeilen';

const gleich = (a: unknown, b: unknown): boolean => kanonischKompakt(a) === kanonischKompakt(b);

const konflikt = (was: string): never =>
  abbruch('konflikt', `Konflikt: ${was} passt nicht zum gespeicherten Stand; es wurde nichts geschrieben.`);

/** Löschen verhindert, weil noch abhängige Aggregate bestehen (kein Kaskadieren, v1.1a). */
function abhaengig(db: Datenbank, was: string, sql: string, id: string): void {
  const z = db.zeilen(sql, [id]);
  if (z.length > 0) {
    abbruch(
      'konflikt',
      `Konflikt: ${was} lässt sich nicht löschen, solange abhängige Aggregate bestehen (${z
        .map((x) => `${String(x['art'])} ${String(x['id'])}`)
        .join(', ')}); es wurde nichts geschrieben.`,
    );
  }
}

const anzahl = (db: Datenbank, sql: string, id: string): number => {
  const n = db.zeilen(sql, [id])[0]?.['n'];
  return typeof n === 'number' ? n : 0;
};

/** Löscht die Summen eines Aggregats (alle drei Tabellen). */
function loescheSummen(db: Datenbank, aggregatId: string): void {
  db.ausfuehren('DELETE FROM summe_position WHERE aggregat_id = ?', [aggregatId]);
  db.ausfuehren('DELETE FROM summe_gliederung WHERE aggregat_id = ?', [aggregatId]);
  db.ausfuehren('DELETE FROM summe_gesamt WHERE aggregat_id = ?', [aggregatId]);
}

const nachKennung = <T>(liste: readonly T[], id: (e: T) => string): T[] =>
  [...liste].sort((a, b) => (id(a) < id(b) ? -1 : id(a) > id(b) ? 1 : 0));

/**
 * Prüft beim Löschen eines Aggregats, dass das ChangeSet keine neuen Summen setzt und dass `summen.vorher` (falls
 * gesetzt) den gespeicherten Summen entspricht: Gesamtsummen und alle Positions- und Gliederungssummen als entfernt.
 */
function pruefeLoeschSummen(db: Datenbank, aggregatId: string, s: Summenaenderung, was: string): void {
  if (s.positionen.length > 0 || s.gliederungen.length > 0 || s.gesamt !== null) {
    abbruch('unbekannt', `ChangeSet: Das Löschen von ${was} setzt neue Summen.`);
  }
  const v = s.vorher;
  if (v === undefined) return;
  const gespeichert = leseSummen(db, aggregatId);
  const passt =
    gespeichert !== null &&
    gleich(v.gesamt, gespeichert.gesamt) &&
    gleich(
      nachKennung(v.entfernt.positionen, (e) => e.positionId),
      nachKennung(gespeichert.positionen, (e) => e.positionId),
    ) &&
    gleich(
      nachKennung(v.entfernt.gliederungen, (e) => e.gliederungId),
      nachKennung(gespeichert.gliederungen, (e) => e.gliederungId),
    );
  if (!passt) konflikt(`die Summen von ${was}`);
}

// --- Projekt ----------------------------------------------------------------------------------------------------

function schreibeBieter(db: Datenbank, p: Projekt): void {
  db.stapel(
    `INSERT INTO bieter (projekt_id, id, name, reihenfolge) VALUES (?, ?, ?, ?)
     ON CONFLICT (projekt_id, id) DO UPDATE SET name = excluded.name, reihenfolge = excluded.reihenfolge`,
    p.bieter.map((b, i): SqlWert[] => [p.id, b.id, b.name, i]),
  );
  const behalten = new Set(p.bieter.map((b) => b.id as string));
  for (const z of db.zeilen('SELECT id FROM bieter WHERE projekt_id = ?', [p.id])) {
    const id = z['id'];
    if (typeof id === 'string' && !behalten.has(id)) {
      db.ausfuehren('DELETE FROM bieter WHERE projekt_id = ? AND id = ?', [p.id, id]);
    }
  }
}

/**
 * Projekt anlegen, ändern oder löschen. Beim Löschen (v1.1a) gehen die Bieter und das Befehlsprotokoll des Projekts
 * mit: `protokoll.projekt_id` verweist auf das Projekt (seit Schema 1; Schema 2 lässt das so, Ticket 38). Der Eintrag
 * des Löschbefehls selbst wird deshalb nicht geschrieben (`anwenden` überspringt ihn), weil es kein Projekt mehr gibt,
 * dem er gehört. Das ist die einzige Ausnahme von „ein Eintrag je Befehl“ (D-31.1).
 * LVs, Angebote und Auftrags-LV verhindern das Löschen (`konflikt`).
 */
export function wendeProjektAn(db: Datenbank, cs: ProjektChangeSet): void {
  const { vorher, nachher } = cs.projekt;
  if (nachher === null) {
    loescheProjekt(db, cs);
    return;
  }
  if (nachher.id !== cs.projektId)
    return abbruch('unbekannt', 'ChangeSet: projektId und Projekt.id weichen ab.');
  const gespeichert = leseProjekt(db, cs.projektId);
  if (vorher === null) {
    if (gespeichert !== null) return konflikt(`Projekt ${cs.projektId} existiert bereits, das ChangeSet`);
    db.ausfuehren('INSERT INTO projekt (id, name, bauherr_name, bauherr_anschrift) VALUES (?, ?, ?, ?)', [
      nachher.id,
      nachher.name,
      nachher.bauherr.name,
      nachher.bauherr.anschrift,
    ]);
  } else {
    if (gespeichert === null)
      return abbruch('nicht-gefunden', `Projekt ${cs.projektId} ist nicht vorhanden.`);
    if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Projekts');
    db.ausfuehren('UPDATE projekt SET name = ?, bauherr_name = ?, bauherr_anschrift = ? WHERE id = ?', [
      nachher.name,
      nachher.bauherr.name,
      nachher.bauherr.anschrift,
      nachher.id,
    ]);
  }
  schreibeBieter(db, nachher);
}

function loescheProjekt(db: Datenbank, cs: ProjektChangeSet): void {
  const id = cs.projektId;
  const vorher = cs.projekt.vorher;
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: Projekt ohne vorher und nachher.');
  if (vorher.id !== id) return abbruch('unbekannt', 'ChangeSet: projektId und Projekt.id weichen ab.');
  const gespeichert = leseProjekt(db, id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`);
  if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Projekts');
  abhaengig(
    db,
    `Projekt ${id}`,
    `SELECT 'LV' AS art, id FROM leistungsverzeichnis WHERE projekt_id = ?1
     UNION ALL SELECT 'Angebot', id FROM angebot WHERE projekt_id = ?1
     UNION ALL SELECT 'Auftrags-LV', id FROM auftrags_lv WHERE projekt_id = ?1
     ORDER BY 1, 2`,
    id,
  );
  db.ausfuehren('DELETE FROM protokoll WHERE projekt_id = ?', [id]);
  db.ausfuehren('DELETE FROM bieter WHERE projekt_id = ?', [id]);
  db.ausfuehren('DELETE FROM projekt WHERE id = ?', [id]);
}

// --- Knoten und Summen (LV und Auftrags-LV) --------------------------------------------------------------------

const KNOTEN_EINFUEGEN = `INSERT INTO knoten (${KNOTEN_SPALTEN.join(', ')}) VALUES (${KNOTEN_SPALTEN.map(() => '?').join(', ')})`;
const KNOTEN_AENDERN = `UPDATE knoten SET ${KNOTEN_SPALTEN.slice(2)
  .map((s) => `${s} = ?`)
  .join(', ')} WHERE aggregat_id = ? AND id = ?`;

function wendeKnotenAn(db: Datenbank, aggregatId: string, k: Aenderungen<Knoten>): void {
  for (const e of k.entfernt) {
    const gespeichert = leseKnoten1(db, aggregatId, e.id);
    if (gespeichert === null) return abbruch('nicht-gefunden', `Knoten ${e.id} ist nicht vorhanden.`);
    if (!gleich(gespeichert, e)) return konflikt(`der entfernte Knoten ${e.id}`);
  }
  for (const { vorher, nachher } of k.geaendert) {
    if (vorher.id !== nachher.id)
      return abbruch('unbekannt', `ChangeSet: geänderter Knoten ${vorher.id} wechselt die Kennung.`);
    const gespeichert = leseKnoten1(db, aggregatId, vorher.id);
    if (gespeichert === null) return abbruch('nicht-gefunden', `Knoten ${vorher.id} ist nicht vorhanden.`);
    if (!gleich(gespeichert, vorher)) return konflikt(`der Vorherstand des Knotens ${vorher.id}`);
  }
  db.stapel(
    'DELETE FROM knoten WHERE aggregat_id = ? AND id = ?',
    k.entfernt.map((e): SqlWert[] => [aggregatId, e.id]),
  );
  // Summen entfernter Knoten fallen mit dem Knoten weg (Vertrag, Summenaenderung).
  db.stapel(
    'DELETE FROM summe_position WHERE aggregat_id = ? AND position_id = ?',
    k.entfernt.map((e): SqlWert[] => [aggregatId, e.id]),
  );
  db.stapel(
    'DELETE FROM summe_gliederung WHERE aggregat_id = ? AND gliederung_id = ?',
    k.entfernt.map((e): SqlWert[] => [aggregatId, e.id]),
  );
  db.stapel(
    KNOTEN_AENDERN,
    k.geaendert.map(({ nachher }): SqlWert[] => [
      ...knotenZuBindung(aggregatId, nachher).slice(2),
      aggregatId,
      nachher.id,
    ]),
  );
  db.stapel(
    KNOTEN_EINFUEGEN,
    k.hinzugefuegt.map((n) => knotenZuBindung(aggregatId, n)),
  );
  if (k.entfernt.length + k.geaendert.length + k.hinzugefuegt.length > 0) pruefeBaum(db, aggregatId);
}

/** Struktur des Baums nach dem Schreiben: keine Waisen, `reihenfolge` je Elternknoten dicht 0..n-1. */
function pruefeBaum(db: Datenbank, aggregatId: string): void {
  const waise = db.zeilen(
    `SELECT k.id FROM knoten k
     WHERE k.aggregat_id = ? AND k.eltern_id <> ?
       AND NOT EXISTS (SELECT 1 FROM knoten p WHERE p.aggregat_id = ? AND p.id = k.eltern_id)
     LIMIT 1`,
    [aggregatId, aggregatId, aggregatId],
  )[0];
  if (waise !== undefined) {
    return abbruch(
      'konflikt',
      `Konflikt: Knoten ${String(waise['id'])} hat keinen vorhandenen Elternknoten; nichts geschrieben.`,
    );
  }
  const luecke = db.zeilen(
    `SELECT eltern_id FROM knoten WHERE aggregat_id = ? GROUP BY eltern_id
     HAVING COUNT(*) <> COUNT(DISTINCT reihenfolge) OR MIN(reihenfolge) <> 0 OR MAX(reihenfolge) <> COUNT(*) - 1
     LIMIT 1`,
    [aggregatId],
  )[0];
  if (luecke !== undefined) {
    return abbruch(
      'konflikt',
      `Konflikt: Die Reihenfolge unter ${String(luecke['eltern_id'])} ist nicht dicht; nichts geschrieben.`,
    );
  }
}

function schreibeGesamt(db: Datenbank, aggregatId: string, g: Gesamtsummen): void {
  db.ausfuehren(
    `INSERT INTO summe_gesamt (aggregat_id, netto, nachlass, netto_nach_nachlass, mwst, brutto, summe_bedarf_ohne_gb,
       summe_wahl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (aggregat_id) DO UPDATE SET netto = excluded.netto, nachlass = excluded.nachlass,
       netto_nach_nachlass = excluded.netto_nach_nachlass, mwst = excluded.mwst, brutto = excluded.brutto,
       summe_bedarf_ohne_gb = excluded.summe_bedarf_ohne_gb, summe_wahl = excluded.summe_wahl`,
    [
      aggregatId,
      g.netto,
      g.nachlass,
      g.nettoNachNachlass,
      g.mwst,
      g.brutto,
      g.summeBedarfOhneGesamtbetrag ?? null,
      g.summeWahl ?? null,
    ],
  );
}

/** Überschreibt die gelisteten Summen. Es wird nichts berechnet oder geprüft. */
function wendeSummenAn(db: Datenbank, aggregatId: string, s: Summenaenderung): void {
  db.stapel(
    `INSERT INTO summe_position (aggregat_id, position_id, gesamtpreis, geht_in_summe) VALUES (?, ?, ?, ?)
     ON CONFLICT (aggregat_id, position_id) DO UPDATE SET gesamtpreis = excluded.gesamtpreis,
       geht_in_summe = excluded.geht_in_summe`,
    s.positionen.map((p): SqlWert[] => [aggregatId, p.positionId, p.gesamtpreis, p.gehtInSummeEin ? 1 : 0]),
  );
  db.stapel(
    `INSERT INTO summe_gliederung (aggregat_id, gliederung_id, summe, summe_bedarf_ohne_gb, summe_wahl)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (aggregat_id, gliederung_id) DO UPDATE SET summe = excluded.summe,
       summe_bedarf_ohne_gb = excluded.summe_bedarf_ohne_gb, summe_wahl = excluded.summe_wahl`,
    s.gliederungen.map((g): SqlWert[] => [
      aggregatId,
      g.gliederungId,
      g.summe,
      g.summeBedarfOhneGesamtbetrag ?? null,
      g.summeWahl ?? null,
    ]),
  );
  if (s.gesamt !== null) schreibeGesamt(db, aggregatId, s.gesamt);
}

/** Ersetzt alle Summen eines Aggregats durch einen vollständigen Stand (Neuberechnung nach Migration 2, D-17). */
export function ersetzeSummen(db: Datenbank, aggregatId: string, stand: Summenstand): void {
  loescheSummen(db, aggregatId);
  wendeSummenAn(db, aggregatId, stand);
}

// --- Leistungsverzeichnis ------------------------------------------------------------------------------------

/**
 * ChangeSet am LV: Kopf, Knoten, Summen, Papierkorb und LV-Stand, in dieser Reihenfolge. `wann` ist der Zeitpunkt des
 * Protokolleintrags; ein LV-Stand bekommt ihn als `angelegt` (nur `anwenden` legt Stände über ein ChangeSet an).
 */
export function wendeLvAn(db: Datenbank, cs: LvChangeSet, projektId: ProjektId, wann?: Zeitstempel): void {
  const id = cs.leistungsverzeichnisId;
  const gespeichert = leseLvKopf(db, id);
  if (cs.kopf === null) {
    if (gespeichert === null)
      return abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`);
    if (gespeichert.projektId !== projektId)
      return abbruch('unbekannt', `LV ${id} gehört zu einem anderen Projekt.`);
  } else {
    const { vorher, nachher } = cs.kopf;
    if (nachher === null) {
      loescheLv(db, cs, projektId);
      return;
    }
    if (nachher.id !== id)
      return abbruch('unbekannt', 'ChangeSet: leistungsverzeichnisId und Kopf.id weichen ab.');
    if (nachher.projektId !== projektId)
      return abbruch('unbekannt', 'ChangeSet: Kopf.projektId passt nicht zum Protokolleintrag.');
    const [nachlassArt, nachlassWert] = nachlassSpalten(nachher.nachlass);
    const [auftraggeber, vergabeinformationen] = kopfdatenSpalten(nachher);
    if (vorher === null) {
      if (gespeichert !== null) return konflikt(`LV ${id} existiert bereits, das ChangeSet`);
      if (leseProjekt(db, nachher.projektId) === null) {
        return abbruch('nicht-gefunden', `Projekt ${nachher.projektId} ist nicht vorhanden.`);
      }
      if (cs.summen.gesamt === null) {
        return abbruch('unbekannt', `ChangeSet für das neue LV ${id} enthält keine Gesamtsummen.`);
      }
      db.ausfuehren(
        `INSERT INTO leistungsverzeichnis (id, projekt_id, name, oz_maske, mwst_satz, nachlass_art, nachlass_wert,
           auftraggeber, vergabeinformationen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          nachher.projektId,
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          auftraggeber,
          vergabeinformationen,
        ],
      );
    } else {
      if (gespeichert === null)
        return abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`);
      if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des LV-Kopfs');
      if (vorher.projektId !== nachher.projektId)
        return abbruch('unbekannt', 'Ein LV wechselt nicht das Projekt.');
      db.ausfuehren(
        `UPDATE leistungsverzeichnis SET name = ?, oz_maske = ?, mwst_satz = ?, nachlass_art = ?, nachlass_wert = ?,
           auftraggeber = ?, vergabeinformationen = ?
         WHERE id = ?`,
        [
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          auftraggeber,
          vergabeinformationen,
          id,
        ],
      );
    }
  }
  wendeKnotenAn(db, id, cs.knoten);
  wendeSummenAn(db, id, cs.summen);
  if (cs.papierkorb !== undefined) wendePapierkorbAn(db, id, cs.papierkorb);
  if (cs.papierkorb !== undefined || cs.knoten.hinzugefuegt.length > 0) pruefePapierkorb(db, id, cs);
  if (cs.lvStand !== undefined) wendeLvStandAn(db, id, cs.lvStand, wann);
}

// --- Papierkorb (Schema 3) ---------------------------------------------------------------------------------------

const PAPIERKORB_SCHREIBEN = `INSERT INTO papierkorb_eintrag (leistungsverzeichnis_id, id, nummer, knoten) VALUES (?, ?, ?, ?)`;

/**
 * Papierkorbeinträge wie Knoten: `entfernt` und `geaendert[].vorher` müssen dem gespeicherten Eintrag gleichen
 * (sonst `konflikt`), ein hinzugefügter darf noch nicht da sein. Ein Eintrag wird als Ganzes geschrieben.
 */
function wendePapierkorbAn(db: Datenbank, lvId: string, p: Aenderungen<Papierkorbeintrag>): void {
  for (const e of p.entfernt) {
    const gespeichert = lesePapierkorbeintrag(db, lvId, e.id);
    if (gespeichert === null)
      return abbruch('nicht-gefunden', `Papierkorbeintrag ${e.id} ist nicht vorhanden.`);
    if (!gleich(gespeichert, e)) return konflikt(`der entfernte Papierkorbeintrag ${e.id}`);
  }
  for (const { vorher, nachher } of p.geaendert) {
    if (vorher.id !== nachher.id)
      return abbruch('unbekannt', `ChangeSet: Papierkorbeintrag ${vorher.id} wechselt die Kennung.`);
    const gespeichert = lesePapierkorbeintrag(db, lvId, vorher.id);
    if (gespeichert === null)
      return abbruch('nicht-gefunden', `Papierkorbeintrag ${vorher.id} ist nicht vorhanden.`);
    if (!gleich(gespeichert, vorher)) return konflikt(`der Vorherstand des Papierkorbeintrags ${vorher.id}`);
  }
  db.stapel(
    'DELETE FROM papierkorb_eintrag WHERE leistungsverzeichnis_id = ? AND id = ?',
    p.entfernt.map((e): SqlWert[] => [lvId, e.id]),
  );
  db.stapel(
    'DELETE FROM papierkorb_eintrag WHERE leistungsverzeichnis_id = ? AND id = ?',
    p.geaendert.map(({ vorher }): SqlWert[] => [lvId, vorher.id]),
  );
  for (const e of [...p.geaendert.map((g) => g.nachher), ...p.hinzugefuegt]) {
    if (lesePapierkorbeintrag(db, lvId, e.id) !== null)
      return konflikt(`Papierkorbeintrag ${e.id} existiert bereits, das ChangeSet`);
    const nummer = db.zeilen(
      'SELECT id FROM papierkorb_eintrag WHERE leistungsverzeichnis_id = ? AND nummer = ?',
      [lvId, e.nummer],
    )[0];
    if (nummer !== undefined)
      return konflikt(
        `die Nummer ${String(e.nummer)} des Papierkorbeintrags ${e.id} (vergeben), das ChangeSet`,
      );
    db.ausfuehren(PAPIERKORB_SCHREIBEN, [lvId, e.id, e.nummer, kanonischKompakt(e.knoten)]);
  }
}

/** Kennungen der Knoten (bzw. nur der Positionen) in Papierkorbeinträgen, als SQL-Teilabfrage. */
const PAPIERKORB_KNOTEN = `SELECT p.id AS eintrag, json_extract(j.value, '$.id') AS knoten_id,
    json_extract(j.value, '$.art') AS art
  FROM papierkorb_eintrag p, json_each(p.knoten) j WHERE p.leistungsverzeichnis_id = ?`;

/**
 * Nach dem Schreiben: (1) Kein Knoten liegt zweimal im LV, im Baum und im Papierkorb oder in zwei Einträgen
 * (Positionsidentität, ADR 0011).
 * (2) Q5, D-12: Eine Position aus einem entfernten Eintrag, die weder in den Baum zurückkam noch in einem anderen
 * Eintrag liegt, darf von keinem Angebot des LV mehr gebraucht werden; sonst `konflikt` (Entfernen und Leeren
 * des Papierkorbs, solange ein Angebot auf eine Position im Eintrag verweist).
 */
function pruefePapierkorb(db: Datenbank, lvId: string, cs: LvChangeSet): void {
  const doppelt =
    db.zeilen(
      `SELECT pk.knoten_id AS id FROM (${PAPIERKORB_KNOTEN}) pk
       JOIN knoten k ON k.aggregat_id = ? AND k.id = pk.knoten_id LIMIT 1`,
      [lvId, lvId],
    )[0] ??
    db.zeilen(
      `SELECT knoten_id AS id FROM (${PAPIERKORB_KNOTEN}) GROUP BY knoten_id HAVING COUNT(*) > 1 LIMIT 1`,
      [lvId],
    )[0];
  if (doppelt !== undefined) {
    return abbruch(
      'konflikt',
      `Konflikt: Knoten ${String(doppelt['id'])} läge zweimal im LV (Baum und Papierkorb oder zwei Einträge); nichts geschrieben.`,
    );
  }
  const weg = (cs.papierkorb?.entfernt ?? [])
    .flatMap((e) => e.knoten)
    .filter((k) => k.art === 'position')
    .map((k) => k.id as string);
  for (const positionId of weg) {
    if (leseKnoten1(db, lvId, positionId) !== null) continue;
    const imKorb = db.zeilen(`SELECT 1 AS da FROM (${PAPIERKORB_KNOTEN}) WHERE knoten_id = ?`, [
      lvId,
      positionId,
    ]);
    if (imKorb.length > 0) continue;
    const angebot = db.zeilen(
      `SELECT a.id FROM angebot a JOIN angebotsposition ap ON ap.angebot_id = a.id
       WHERE a.leistungsverzeichnis_id = ? AND ap.position_id = ? ORDER BY a.id LIMIT 1`,
      [lvId, positionId],
    )[0];
    if (angebot !== undefined) {
      return abbruch(
        'konflikt',
        `Konflikt: Angebot ${String(angebot['id'])} verweist auf Position ${positionId} im Papierkorbeintrag; ` +
          'der Eintrag lässt sich nicht endgültig entfernen (Q5). Es wurde nichts geschrieben.',
      );
    }
  }
}

/** Liegt `positionId` als Position im Papierkorb des LV? (Angebote verweisen weiter auf sie, D-12.) */
function imPapierkorb(db: Datenbank, lvId: string, positionId: string): boolean {
  return (
    db.zeilen(`SELECT 1 AS da FROM (${PAPIERKORB_KNOTEN}) WHERE knoten_id = ? AND art = 'position'`, [
      lvId,
      positionId,
    ]).length > 0
  );
}

// --- LV-Stand (Schema 3, ADR 0006) ---------------------------------------------------------------------------------

const LV_STAND_SCHREIBEN = `INSERT INTO lv_stand (id, leistungsverzeichnis_id, name, angelegt, zustand) VALUES (?, ?, ?, ?, ?)`;

/**
 * `vorher: null`: friert den gespeicherten Stand des LV ein (nach den übrigen Teilen dieses ChangeSets, in derselben
 * Transaktion), `angelegt` = `wann`. `nachher: null` (nur als Umkehrung): Der Stand muss genau so gespeichert sein
 * und entfällt. Ein Stand wird nie geändert; beide Seiten gesetzt ist ein Programmfehler.
 */
function wendeLvStandAn(
  db: Datenbank,
  lvId: LeistungsverzeichnisId,
  s: Aenderung<LvStandKopf>,
  wann: Zeitstempel | undefined,
): void {
  const { vorher, nachher } = s;
  if (vorher !== null && nachher !== null)
    return abbruch('unbekannt', 'ChangeSet: Ein LV-Stand wird nie geändert (ADR 0006).');
  if (nachher !== null) {
    if (nachher.leistungsverzeichnisId !== lvId)
      return abbruch('unbekannt', 'ChangeSet: Der LV-Stand gehört zu einem anderen LV.');
    if (wann === undefined) return abbruch('unbekannt', 'Ein LV-Stand entsteht nur über anwenden.');
    if (leseLvStand(db, nachher.id) !== null)
      return konflikt(`LV-Stand ${nachher.id} existiert bereits, das ChangeSet`);
    const zustand = leseLv(db, lvId);
    if (zustand === null)
      return abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
    db.ausfuehren(LV_STAND_SCHREIBEN, [nachher.id, lvId, nachher.name, wann, kanonischKompakt(zustand)]);
    return;
  }
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: LV-Stand ohne vorher und nachher.');
  const gespeichert = leseLvStand(db, vorher.id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `LV-Stand ${vorher.id} ist nicht vorhanden.`);
  const { id, leistungsverzeichnisId, name } = gespeichert;
  if (!gleich({ id, leistungsverzeichnisId, name }, vorher) || leistungsverzeichnisId !== lvId)
    return konflikt(`der LV-Stand ${vorher.id}`);
  db.ausfuehren('DELETE FROM lv_stand WHERE id = ?', [vorher.id]);
}

/** Schreibt einen LV-Stand aus der Projektdatei unverändert (Import; der Stand ist schon eingefroren). */
export function schreibeLvStand(db: Datenbank, s: LvStand): void {
  if (leseLvStand(db, s.id) !== null) return konflikt(`LV-Stand ${s.id} existiert bereits, die Datei`);
  db.ausfuehren(LV_STAND_SCHREIBEN, [
    s.id,
    s.leistungsverzeichnisId,
    s.name,
    s.angelegt,
    kanonischKompakt(s.zustand),
  ]);
}

/**
 * Löscht Knoten und Summen eines Aggregats mit Knoten (LV), nachdem der Kopf geprüft ist. Die Knoten prüft
 * `wendeKnotenAn` einzeln gegen den gespeicherten Stand; bleibt danach einer übrig, fehlte er im ChangeSet (`konflikt`).
 */
function loescheKnotenUndSummen(
  db: Datenbank,
  aggregatId: string,
  k: Aenderungen<Knoten>,
  s: Summenaenderung,
  was: string,
): void {
  if (k.hinzugefuegt.length > 0 || k.geaendert.length > 0) {
    abbruch('unbekannt', `ChangeSet: Das Löschen von ${was} fügt Knoten hinzu oder ändert sie.`);
  }
  pruefeLoeschSummen(db, aggregatId, s, was);
  wendeKnotenAn(db, aggregatId, k);
  const rest = anzahl(db, 'SELECT COUNT(*) AS n FROM knoten WHERE aggregat_id = ?', aggregatId);
  if (rest > 0) konflikt(`die Knotenliste zum Löschen von ${was} (${String(rest)} Knoten fehlen darin)`);
  loescheSummen(db, aggregatId);
}

function loescheLv(db: Datenbank, cs: LvChangeSet, projektId: ProjektId): void {
  const id = cs.leistungsverzeichnisId;
  const vorher = cs.kopf?.vorher ?? null;
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: LV-Kopf ohne vorher und nachher.');
  if (vorher.id !== id)
    return abbruch('unbekannt', 'ChangeSet: leistungsverzeichnisId und Kopf.id weichen ab.');
  const gespeichert = leseLvKopf(db, id);
  if (gespeichert === null)
    return abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`);
  if (gespeichert.projektId !== projektId)
    return abbruch('unbekannt', `LV ${id} gehört zu einem anderen Projekt.`);
  if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des LV-Kopfs');
  // LV-Stände verhindern das Löschen wie Angebote (D-12): Ein Stand ist unveränderlich und geht nicht still verloren.
  abhaengig(
    db,
    `LV ${id}`,
    `SELECT 'Angebot' AS art, id FROM angebot WHERE leistungsverzeichnis_id = ?1
     UNION ALL SELECT 'Auftrags-LV', id FROM auftrags_lv WHERE leistungsverzeichnis_id = ?1
     UNION ALL SELECT 'LV-Stand', id FROM lv_stand WHERE leistungsverzeichnis_id = ?1
     ORDER BY 1, 2`,
    id,
  );
  if (cs.lvStand !== undefined)
    return abbruch('unbekannt', `ChangeSet: Das Löschen von LV ${id} legt einen Stand an.`);
  // Der Papierkorb geht im ChangeSet mit (`papierkorb.entfernt`, Vertrag `LeistungsverzeichnisLoeschen`); fehlt ein
  // Eintrag darin, ist das ChangeSet unvollständig (`konflikt`), nie still verworfen.
  const p = cs.papierkorb;
  if (p !== undefined && (p.hinzugefuegt.length > 0 || p.geaendert.length > 0))
    return abbruch(
      'unbekannt',
      `ChangeSet: Das Löschen von LV ${id} legt Papierkorbeinträge an oder ändert sie.`,
    );
  if (p !== undefined) wendePapierkorbAn(db, id, p);
  const rest = anzahl(
    db,
    'SELECT COUNT(*) AS n FROM papierkorb_eintrag WHERE leistungsverzeichnis_id = ?',
    id,
  );
  if (rest > 0) konflikt(`der Papierkorb zum Löschen von LV ${id} (${String(rest)} Einträge fehlen darin)`);
  loescheKnotenUndSummen(db, id, cs.knoten, cs.summen, `LV ${id}`);
  db.ausfuehren('DELETE FROM leistungsverzeichnis WHERE id = ?', [id]);
}

// --- Angebot ---------------------------------------------------------------------------------------------------

function pruefeAngebotsposition(db: Datenbank, lvId: string, positionId: string): void {
  const z = db.zeilen("SELECT 1 AS da FROM knoten WHERE aggregat_id = ? AND id = ? AND art = 'position'", [
    lvId,
    positionId,
  ])[0];
  // Eine Position im Papierkorb behält ihre Angebotspositionen (D-12); sie kommt mit derselben Kennung zurück.
  if (z === undefined && !imPapierkorb(db, lvId, positionId)) {
    return abbruch('nicht-gefunden', `Angebotsposition ${positionId}: keine Position im LV ${lvId}.`);
  }
}

export function wendeAngebotAn(db: Datenbank, cs: AngebotChangeSet, projektId: ProjektId): void {
  const id = cs.angebotId;
  const gespeichert = leseAngebotKopf(db, id);
  let lvId: string;
  if (cs.kopf === null) {
    if (gespeichert === null) return abbruch('nicht-gefunden', `Angebot ${id} ist nicht vorhanden.`);
    if (gespeichert.projektId !== projektId)
      return abbruch('unbekannt', `Angebot ${id} gehört zu einem anderen Projekt.`);
    lvId = gespeichert.leistungsverzeichnisId;
  } else {
    const { vorher, nachher } = cs.kopf;
    if (nachher === null) {
      loescheAngebot(db, cs, projektId);
      return;
    }
    if (nachher.id !== id) return abbruch('unbekannt', 'ChangeSet: angebotId und Kopf.id weichen ab.');
    if (nachher.projektId !== projektId)
      return abbruch('unbekannt', 'ChangeSet: Kopf.projektId passt nicht zum Protokolleintrag.');
    lvId = nachher.leistungsverzeichnisId;
    const lv = leseLvKopf(db, nachher.leistungsverzeichnisId);
    if (lv === null) return abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
    if (lv.projektId !== projektId)
      return abbruch('unbekannt', `LV ${lvId} gehört zu einem anderen Projekt.`);
    const [nachlassArt, nachlassWert] = nachlassSpalten(nachher.nachlass);
    if (vorher === null) {
      if (gespeichert !== null) return konflikt(`Angebot ${id} existiert bereits, das ChangeSet`);
      if (cs.summen.gesamt === null) {
        return abbruch('unbekannt', `ChangeSet für das neue Angebot ${id} enthält keine Gesamtsummen.`);
      }
      db.ausfuehren(
        `INSERT INTO angebot (id, projekt_id, leistungsverzeichnis_id, bieter_id, nachlass_art, nachlass_wert)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nachher.projektId, lvId, nachher.bieterId, nachlassArt, nachlassWert],
      );
    } else {
      if (gespeichert === null) return abbruch('nicht-gefunden', `Angebot ${id} ist nicht vorhanden.`);
      if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Angebotskopfs');
      if (
        vorher.leistungsverzeichnisId !== nachher.leistungsverzeichnisId ||
        vorher.bieterId !== nachher.bieterId
      ) {
        return abbruch('unbekannt', 'Ein Angebot wechselt weder LV noch Bieter.');
      }
      db.ausfuehren('UPDATE angebot SET nachlass_art = ?, nachlass_wert = ? WHERE id = ?', [
        nachlassArt,
        nachlassWert,
        id,
      ]);
    }
  }

  const p = cs.positionen;
  for (const e of p.entfernt) {
    const stand = leseAngebotposition(db, id, e.positionId);
    if (stand === null)
      return abbruch('nicht-gefunden', `Angebotsposition ${e.positionId} ist nicht vorhanden.`);
    if (!gleich(stand, e)) return konflikt(`die entfernte Angebotsposition ${e.positionId}`);
  }
  for (const { vorher, nachher } of p.geaendert) {
    if (vorher.positionId !== nachher.positionId) {
      return abbruch(
        'unbekannt',
        `ChangeSet: geänderte Angebotsposition ${vorher.positionId} wechselt die Kennung.`,
      );
    }
    const stand = leseAngebotposition(db, id, vorher.positionId);
    if (stand === null)
      return abbruch('nicht-gefunden', `Angebotsposition ${vorher.positionId} ist nicht vorhanden.`);
    if (!gleich(stand, vorher)) return konflikt(`der Vorherstand der Angebotsposition ${vorher.positionId}`);
  }
  for (const n of [...p.hinzugefuegt, ...p.geaendert.map((g) => g.nachher)])
    pruefeAngebotsposition(db, lvId, n.positionId);
  const schluessel = (positionId: string): SqlWert[] => [id, positionId];
  db.stapel(
    'DELETE FROM angebotsposition WHERE angebot_id = ? AND position_id = ?',
    p.entfernt.map((e) => schluessel(e.positionId)),
  );
  db.stapel(
    'DELETE FROM summe_position WHERE aggregat_id = ? AND position_id = ?',
    p.entfernt.map((e) => schluessel(e.positionId)),
  );
  db.stapel(
    `UPDATE angebotsposition SET status = ?, einheitspreis = ?, epa = ?, zuschlagssatz = ?
     WHERE angebot_id = ? AND position_id = ?`,
    p.geaendert.map(({ nachher }): SqlWert[] => [...angebotspositionWerte(nachher), id, nachher.positionId]),
  );
  db.stapel(
    `INSERT INTO angebotsposition (angebot_id, position_id, status, einheitspreis, epa, zuschlagssatz)
     VALUES (?, ?, ?, ?, ?, ?)`,
    p.hinzugefuegt.map((n): SqlWert[] => [id, n.positionId, ...angebotspositionWerte(n)]),
  );
  wendeSummenAn(db, id, cs.summen);
}

function loescheAngebot(db: Datenbank, cs: AngebotChangeSet, projektId: ProjektId): void {
  const id = cs.angebotId;
  const vorher = cs.kopf?.vorher ?? null;
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: Angebotskopf ohne vorher und nachher.');
  if (vorher.id !== id) return abbruch('unbekannt', 'ChangeSet: angebotId und Kopf.id weichen ab.');
  const gespeichert = leseAngebotKopf(db, id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `Angebot ${id} ist nicht vorhanden.`);
  if (gespeichert.projektId !== projektId)
    return abbruch('unbekannt', `Angebot ${id} gehört zu einem anderen Projekt.`);
  if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Angebotskopfs');
  abhaengig(
    db,
    `Angebot ${id}`,
    `SELECT 'Auftrags-LV' AS art, id FROM auftrags_lv WHERE angebot_id = ?1 ORDER BY 2`,
    id,
  );
  const p = cs.positionen;
  if (p.hinzugefuegt.length > 0 || p.geaendert.length > 0) {
    return abbruch(
      'unbekannt',
      `ChangeSet: Das Löschen von Angebot ${id} fügt Positionen hinzu oder ändert sie.`,
    );
  }
  pruefeLoeschSummen(db, id, cs.summen, `Angebot ${id}`);
  for (const e of p.entfernt) {
    const stand = leseAngebotposition(db, id, e.positionId);
    if (stand === null)
      return abbruch('nicht-gefunden', `Angebotsposition ${e.positionId} ist nicht vorhanden.`);
    if (!gleich(stand, e)) return konflikt(`die entfernte Angebotsposition ${e.positionId}`);
  }
  const gespeichertePositionen = anzahl(
    db,
    'SELECT COUNT(*) AS n FROM angebotsposition WHERE angebot_id = ?',
    id,
  );
  if (gespeichertePositionen !== new Set(p.entfernt.map((e) => e.positionId)).size) {
    konflikt(`die Positionsliste zum Löschen von Angebot ${id}`);
  }
  db.ausfuehren('DELETE FROM angebotsposition WHERE angebot_id = ?', [id]);
  loescheSummen(db, id);
  db.ausfuehren('DELETE FROM angebot WHERE id = ?', [id]);
}

// --- Auftrags-LV (v1.1a, Punkt 5) --------------------------------------------------------------------------------

/**
 * Wie `wendeLvAn`, Aggregat `auftrags_lv`. Beim Anlegen müssen LV und Angebot existieren, zum Projekt gehören und
 * zueinander passen (das Angebot gilt für dieses LV). Gelöscht wird ein Auftrags-LV (Ticket 43) als Umkehrung seines
 * Anlegens, mit vollem Stand wie beim LV (D-31.2); daran hängt nichts. Auch der Import der Projektdatei schreibt hierüber.
 */
export function wendeAuftragsLvAn(db: Datenbank, cs: AuftragsLvChangeSet, projektId: ProjektId): void {
  const id = cs.auftragsLeistungsverzeichnisId;
  const gespeichert = leseAuftragsLvKopf(db, id);
  if (cs.kopf === null) {
    if (gespeichert === null) return abbruch('nicht-gefunden', `Auftrags-LV ${id} ist nicht vorhanden.`);
    if (gespeichert.projektId !== projektId)
      return abbruch('unbekannt', `Auftrags-LV ${id} gehört zu einem anderen Projekt.`);
  } else {
    const { vorher, nachher } = cs.kopf;
    if (nachher === null) {
      loescheAuftragsLv(db, cs, projektId);
      return;
    }
    if (nachher.id !== id)
      return abbruch('unbekannt', 'ChangeSet: auftragsLeistungsverzeichnisId und Kopf.id weichen ab.');
    if (nachher.projektId !== projektId)
      return abbruch('unbekannt', 'ChangeSet: Kopf.projektId passt nicht zum Protokolleintrag.');
    const [nachlassArt, nachlassWert] = nachlassSpalten(nachher.nachlass);
    const [auftraggeber, vergabeinformationen] = kopfdatenSpalten(nachher);
    if (vorher === null) {
      if (gespeichert !== null) return konflikt(`Auftrags-LV ${id} existiert bereits, das ChangeSet`);
      const lv = leseLvKopf(db, nachher.leistungsverzeichnisId);
      if (lv === null) {
        return abbruch(
          'nicht-gefunden',
          `Leistungsverzeichnis ${nachher.leistungsverzeichnisId} ist nicht vorhanden.`,
        );
      }
      if (lv.projektId !== projektId)
        return abbruch('unbekannt', `LV ${lv.id} gehört zu einem anderen Projekt.`);
      const angebot = leseAngebotKopf(db, nachher.angebotId);
      if (angebot === null)
        return abbruch('nicht-gefunden', `Angebot ${nachher.angebotId} ist nicht vorhanden.`);
      if (angebot.projektId !== projektId)
        return abbruch('unbekannt', `Angebot ${angebot.id} gehört zu einem anderen Projekt.`);
      if (angebot.leistungsverzeichnisId !== lv.id)
        return abbruch('unbekannt', `Angebot ${angebot.id} gilt nicht für das LV ${lv.id}.`);
      if (cs.summen.gesamt === null) {
        return abbruch('unbekannt', `ChangeSet für das neue Auftrags-LV ${id} enthält keine Gesamtsummen.`);
      }
      db.ausfuehren(
        `INSERT INTO auftrags_lv (id, projekt_id, leistungsverzeichnis_id, angebot_id, name, oz_maske, mwst_satz,
           nachlass_art, nachlass_wert, auftraggeber, vergabeinformationen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          projektId,
          lv.id,
          angebot.id,
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          auftraggeber,
          vergabeinformationen,
        ],
      );
    } else {
      if (gespeichert === null) return abbruch('nicht-gefunden', `Auftrags-LV ${id} ist nicht vorhanden.`);
      if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Auftrags-LV-Kopfs');
      if (
        vorher.projektId !== nachher.projektId ||
        vorher.leistungsverzeichnisId !== nachher.leistungsverzeichnisId ||
        vorher.angebotId !== nachher.angebotId
      ) {
        return abbruch('unbekannt', 'Ein Auftrags-LV wechselt weder Projekt noch LV noch Angebot.');
      }
      db.ausfuehren(
        `UPDATE auftrags_lv SET name = ?, oz_maske = ?, mwst_satz = ?, nachlass_art = ?, nachlass_wert = ?,
           auftraggeber = ?, vergabeinformationen = ?
         WHERE id = ?`,
        [
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          auftraggeber,
          vergabeinformationen,
          id,
        ],
      );
    }
  }
  wendeKnotenAn(db, id, cs.knoten);
  wendeSummenAn(db, id, cs.summen);
}

function loescheAuftragsLv(db: Datenbank, cs: AuftragsLvChangeSet, projektId: ProjektId): void {
  const id = cs.auftragsLeistungsverzeichnisId;
  const vorher = cs.kopf?.vorher ?? null;
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: Auftrags-LV-Kopf ohne vorher und nachher.');
  if (vorher.id !== id)
    return abbruch('unbekannt', 'ChangeSet: auftragsLeistungsverzeichnisId und Kopf.id weichen ab.');
  const gespeichert = leseAuftragsLvKopf(db, id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `Auftrags-LV ${id} ist nicht vorhanden.`);
  if (gespeichert.projektId !== projektId)
    return abbruch('unbekannt', `Auftrags-LV ${id} gehört zu einem anderen Projekt.`);
  if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Auftrags-LV-Kopfs');
  loescheKnotenUndSummen(db, id, cs.knoten, cs.summen, `Auftrags-LV ${id}`);
  db.ausfuehren('DELETE FROM auftrags_lv WHERE id = ?', [id]);
}

// --- Protokoll -------------------------------------------------------------------------------------------------

export function schreibeProtokolleintrag(db: Datenbank, e: Protokolleintrag): void {
  db.ausfuehren(
    `INSERT INTO protokoll (id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [e.id, e.projektId, e.aggregat.art, e.aggregat.id, e.wer, e.wann, kanonischKompakt(e.befehl)],
  );
}
