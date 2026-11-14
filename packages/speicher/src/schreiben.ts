// SPDX-License-Identifier: AGPL-3.0-or-later
// Die einzige Stelle, die Tabellen schreibt (A5). Jede Funktion hier läuft innerhalb der Transaktion des
// Aufrufers (`anwenden` oder Import); wirft sie, wird alles zurückgerollt.
//
// `speicher` darf `kern` nicht importieren (A3) und wendet ChangeSets deshalb auf Tabellenebene an:
// `hinzugefuegt` fügt Zeilen ein, `geaendert` ersetzt die Zeile, `entfernt` löscht sie, die gelisteten Summen
// werden überschrieben, `kopf` ersetzt die Stammdaten. Summen werden nie berechnet; ihre alten Werte
// (`summen.vorher`) werden wie `vorher` der Knoten gegen den gespeicherten Stand geprüft (`summenvorher.ts`).
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
  Einstellungen,
  EinstellungenChangeSet,
  EinstellungenProtokolleintrag,
  Aenderung,
  Aenderungen,
  Angebotsposition,
  AngebotChangeSet,
  Aufmass,
  AufmassChangeSet,
  AuftragsLvChangeSet,
  BauwerksmodellChangeSet,
  BauwerksmodellKopf,
  BauwerksmodellUebersicht,
  BautagebucheintragChangeSet,
  Bauzeitenplan,
  BauzeitenplanChangeSet,
  BauzeitenplanKopf,
  HonorarberechnungChangeSet,
  MangelChangeSet,
  Gesamtsummen,
  Knoten,
  KostenermittlungChangeSet,
  LeistungsverzeichnisId,
  LvChangeSet,
  LvStand,
  LvStandKopf,
  Papierkorbeintrag,
  Projekt,
  ProjektChangeSet,
  ProjektId,
  Protokolleintrag,
  RechnungChangeSet,
  Summenaenderung,
  Summenstand,
  Zeitstempel,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import { kanonischeListe, kanonischKompakt } from './kanonisch';
import {
  leseAngebotKopf,
  leseAngebotposition,
  leseAufmassText,
  leseAuftragsLvKopf,
  leseBautagebucheintrag,
  leseEinstellungen,
  leseBauwerksmodellKopf,
  leseBauzeitenplanText,
  leseHonorarberechnung,
  leseMangel,
  leseKnoten1,
  leseKostenermittlung,
  leseLv,
  leseLvKopf,
  leseLvStand,
  lesePapierkorbeintrag,
  leseProjekt,
  leseRechnung,
  leseSummen,
  type AufmassText,
  type BauzeitenplanText,
} from './lesen';
import type { Datenbank, Spaltenwerte, SqlWert } from './sql';
import { pruefeSummenvorher } from './summenvorher';
import { einstellungenFormfehler } from './einstellungen';
import {
  ANGEBOTSPOSITION_SPALTEN,
  angebotspositionZeile,
  aufmassZeile,
  bautagebucheintragZeile,
  bauwerksmodellZeile,
  bauzeitenplanZeile,
  honorarberechnungZeile,
  mangelZeile,
  ohne,
  KNOTEN_SPALTEN,
  knotenZuBindung,
  KOPFDATEN_SPALTEN,
  kopfdatenSpalten,
  LV_KENNZEICHEN_SPALTEN,
  LV_PREISSPIEGEL_SPALTE,
  lvKennzeichenSpalten,
  lvPreisspiegelSpalte,
  angabenSpalte,
  kostenermittlungZeile,
  nachlassSpalten,
  rechnungZeile,
} from './zeilen';
import {
  pruefeAufmassAnlegen,
  pruefeAufmassLoeschen,
  pruefeAuftragsLvKopf,
  pruefeBauwerksmodellAnlegen,
  pruefeBauwerksmodellLoeschen,
  pruefeBautagebucheintrag,
  pruefeHonorarbezuege,
  pruefeKostenermittlungLoeschen,
  pruefeMangel,
  pruefeEntfernteAufmasspositionen,
  pruefeFreigabereihenfolge,
  pruefeNachtragsbezug,
  pruefeRechnungAnlegen,
  pruefeRechnungLoeschen,
  pruefeRechnungsaufmasse,
  pruefeZahlungenNurFreigegeben,
} from './bezuege';

/** `auftraggeber = ?, …`: die Kopfdaten im UPDATE von LV und Auftrags-LV (Reihenfolge wie `kopfdatenSpalten`). */
const KOPFDATEN_SETZEN = KOPFDATEN_SPALTEN.map((s) => `${s} = ?`).join(', ');
/**
 * Am LV dazu Nachtragsangaben und Vorlage (Schema 5, v1.4; Reihenfolge wie `lvKennzeichenSpalten`) und die
 * Preisspiegel-Einstellungen (Schema 7, v1.7a; `lvPreisspiegelSpalte`).
 */
const LV_KOPF_SPALTEN: readonly string[] = [
  ...KOPFDATEN_SPALTEN,
  ...LV_KENNZEICHEN_SPALTEN,
  LV_PREISSPIEGEL_SPALTE,
];
const LV_KOPF_SETZEN = LV_KOPF_SPALTEN.map((s) => `${s} = ?`).join(', ');

// --- Zeilen nach Spaltennamen (Ticket 135, SA7) ------------------------------------------------------------------------
//
// Eine Zeile ist ein Objekt Spalte → Wert (`zeilen.ts`). INSERT und UPDATE binden jeden Wert über den Namen seiner Spalte;
// welche Spalten ein UPDATE schreibt, steht als Namen beim Aufrufer, nicht als Stelle in einem Tupel. Tabellen- und
// Spaltennamen sind Konstanten im Code, nie Eingaben.

/** Die Werte der Spalten `namen`, in ihrer Reihenfolge (Bindungsliste). */
export function spaltenwerte<S extends string>(zeile: Spaltenwerte<S>, namen: readonly S[]): SqlWert[] {
  return namen.map((n) => zeile[n]);
}

/** `INSERT INTO tabelle (…) VALUES (…)` mit allen Spalten der Zeile, in der Reihenfolge ihrer Schlüssel. */
export function einfuegen(db: Datenbank, tabelle: string, zeile: Spaltenwerte): void {
  const namen = Object.keys(zeile);
  db.ausfuehren(
    `INSERT INTO ${tabelle} (${namen.join(', ')}) VALUES (${namen.map(() => '?').join(', ')})`,
    Object.values(zeile),
  );
}

/** `UPDATE tabelle SET … WHERE id = ?`: nur die Spalten `namen` der Zeile, die Kennung aus ihrer Spalte `id`. */
export function aendern<S extends string>(
  db: Datenbank,
  tabelle: string,
  zeile: Spaltenwerte<S | 'id'>,
  namen: readonly S[],
): void {
  db.ausfuehren(`UPDATE ${tabelle} SET ${namen.map((n) => `${n} = ?`).join(', ')} WHERE id = ?`, [
    ...spaltenwerte(zeile, namen),
    zeile.id,
  ]);
}

const gleich = (a: unknown, b: unknown): boolean => kanonischKompakt(a) === kanonischKompakt(b);

const kennungen = (knoten: readonly Knoten[]): Set<string> => new Set(knoten.map((k) => k.id));

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
 * Prüft beim Löschen eines Aggregats, dass das ChangeSet keine neuen Summen setzt und dass `summen.vorher` (seit
 * v1.3 Pflicht) den gespeicherten Summen entspricht: Gesamtsummen und alle Positions- und Gliederungssummen als entfernt.
 */
function pruefeLoeschSummen(db: Datenbank, aggregatId: string, s: Summenaenderung, was: string): void {
  if (s.positionen.length > 0 || s.gliederungen.length > 0 || s.gesamt !== null) {
    abbruch('unbekannt', `ChangeSet: Das Löschen von ${was} setzt neue Summen.`);
  }
  const v = s.vorher;
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

/**
 * Schreibt die Bieter des Projekts (Reihenfolge, Name, seit Schema 7 die Angaben). Ein Bieter, der wegfällt, darf kein Angebot
 * haben (v1.7a, D-127.2: `BieterLoeschen` nur ohne Angebot; ebenso als Undo von `BieterAnlegen`): sonst `konflikt` mit den
 * Angeboten, bevor etwas geschrieben ist.
 */
function schreibeBieter(db: Datenbank, p: Projekt): void {
  const behalten = new Set(p.bieter.map((b) => b.id as string));
  const weg = db
    .zeilen('SELECT id FROM bieter WHERE projekt_id = ? ORDER BY id', [p.id])
    .map((z) => String(z['id']))
    .filter((id) => !behalten.has(id));
  for (const id of weg) {
    const angebote = db
      .zeilen('SELECT id FROM angebot WHERE projekt_id = ? AND bieter_id = ? ORDER BY id', [p.id, id])
      .map((z) => String(z['id']));
    if (angebote.length > 0)
      abbruch(
        'konflikt',
        `Konflikt: Bieter ${id} lässt sich nicht entfernen, solange Angebote auf ihn verweisen (${angebote.join(', ')}); ` +
          'es wurde nichts geschrieben.',
      );
  }
  db.stapel(
    `INSERT INTO bieter (projekt_id, id, name, reihenfolge, angaben) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (projekt_id, id) DO UPDATE SET name = excluded.name, reihenfolge = excluded.reihenfolge,
       angaben = excluded.angaben`,
    p.bieter.map((b, i): SqlWert[] => [p.id, b.id, b.name, i, angabenSpalte(`Bieter ${b.id}`, b.angaben)]),
  );
  for (const id of weg) db.ausfuehren('DELETE FROM bieter WHERE projekt_id = ? AND id = ?', [p.id, id]);
}

/** Kopftabelle eines Aggregats, das an einem Projekt hängt, und sein Name in der Meldung (`AGGREGATARTEN`). */
export interface AbhaengigeTabelle {
  readonly tabelle: string;
  readonly bezeichnung: string;
}

/**
 * Projekt anlegen, ändern oder löschen. Beim Löschen (v1.1a) gehen die Bieter und das Befehlsprotokoll des Projekts
 * mit: `protokoll.projekt_id` verweist auf das Projekt (seit Schema 1; Schema 2 lässt das so, Ticket 38). Der Eintrag
 * des Löschbefehls selbst wird deshalb nicht geschrieben (`anwenden` überspringt ihn), weil es kein Projekt mehr gibt,
 * dem er gehört. Das ist die einzige Ausnahme von „ein Eintrag je Befehl“ (D-31.1).
 * Jedes Aggregat in `abhaengige` (alle Arten außer dem Projekt, aus `AGGREGATARTEN`) verhindert das Löschen (`konflikt`).
 */
export function wendeProjektAn(
  db: Datenbank,
  cs: ProjektChangeSet,
  abhaengige: readonly AbhaengigeTabelle[],
): void {
  const { vorher, nachher } = cs.projekt;
  if (nachher === null) {
    loescheProjekt(db, cs, abhaengige);
    return;
  }
  if (nachher.id !== cs.projektId)
    return abbruch('unbekannt', 'ChangeSet: projektId und Projekt.id weichen ab.');
  const gespeichert = leseProjekt(db, cs.projektId);
  const angaben = angabenSpalte(`Projekt ${nachher.id}`, nachher.angaben); // Schema 7 (v1.7a)
  if (vorher === null) {
    if (gespeichert !== null) return konflikt(`Projekt ${cs.projektId} existiert bereits, das ChangeSet`);
    db.ausfuehren(
      'INSERT INTO projekt (id, name, bauherr_name, bauherr_anschrift, angaben) VALUES (?, ?, ?, ?, ?)',
      [nachher.id, nachher.name, nachher.bauherr.name, nachher.bauherr.anschrift, angaben],
    );
  } else {
    if (gespeichert === null)
      return abbruch('nicht-gefunden', `Projekt ${cs.projektId} ist nicht vorhanden.`);
    if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Projekts');
    db.ausfuehren(
      'UPDATE projekt SET name = ?, bauherr_name = ?, bauherr_anschrift = ?, angaben = ? WHERE id = ?',
      [nachher.name, nachher.bauherr.name, nachher.bauherr.anschrift, angaben, nachher.id],
    );
  }
  schreibeBieter(db, nachher);
}

function loescheProjekt(db: Datenbank, cs: ProjektChangeSet, abhaengige: readonly AbhaengigeTabelle[]): void {
  const id = cs.projektId;
  const vorher = cs.projekt.vorher;
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: Projekt ohne vorher und nachher.');
  if (vorher.id !== id) return abbruch('unbekannt', 'ChangeSet: projektId und Projekt.id weichen ab.');
  const gespeichert = leseProjekt(db, id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`);
  if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des Projekts');
  // Bezeichnung und Tabelle sind Konstanten aus `AGGREGATARTEN`, keine Eingaben.
  const auswahl = abhaengige.map(
    (a) => `SELECT '${a.bezeichnung}' AS art, id FROM ${a.tabelle} WHERE projekt_id = ?1`,
  );
  if (auswahl.length > 0)
    abhaengig(db, `Projekt ${id}`, `${auswahl.join('\n     UNION ALL ')}\n     ORDER BY 1, 2`, id);
  db.ausfuehren('DELETE FROM protokoll WHERE projekt_id = ?', [id]);
  db.ausfuehren('DELETE FROM bieter WHERE projekt_id = ?', [id]);
  db.ausfuehren('DELETE FROM projekt WHERE id = ?', [id]);
}

// --- Knoten und Summen (LV und Auftrags-LV) --------------------------------------------------------------------

const KNOTEN_EINFUEGEN = `INSERT INTO knoten (${KNOTEN_SPALTEN.join(', ')}) VALUES (${KNOTEN_SPALTEN.map(() => '?').join(', ')})`;
/** `vorDemSchreiben` läuft nach der Prüfung der Vorherstände der Knoten, bevor etwas geschrieben wird. */
function wendeKnotenAn(
  db: Datenbank,
  aggregatId: string,
  k: Aenderungen<Knoten>,
  vorDemSchreiben?: () => void,
): void {
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
  vorDemSchreiben?.();
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
  // Nur die Spalten, in denen sich `nachher` von `vorher` unterscheidet (Ticket 52): Bleiben Elternknoten und
  // Reihenfolge, fasst SQLite den Index `knoten_eltern` nicht an, und das WAL schreibt eine Seite weniger. `vorher` gleicht
  // dem gespeicherten Stand (oben geprüft); die Zeile ist danach dieselbe wie beim Ersetzen aller Spalten. Änderungen
  // mit denselben Spalten gehen in einer vorbereiteten Anweisung (Umnummerieren: eine für alle).
  const nachSpalten = new Map<string, SqlWert[][]>();
  for (const { vorher, nachher } of k.geaendert) {
    const alt = knotenZuBindung(aggregatId, vorher);
    const neu = knotenZuBindung(aggregatId, nachher);
    const stellen = KNOTEN_SPALTEN.flatMap((_, i) => (i >= 2 && alt[i] !== neu[i] ? [i] : []));
    if (stellen.length === 0) continue;
    const sql = `UPDATE knoten SET ${stellen.map((i) => `${KNOTEN_SPALTEN[i] ?? ''} = ?`).join(', ')} WHERE aggregat_id = ? AND id = ?`;
    const liste = nachSpalten.get(sql) ?? [];
    liste.push([...stellen.map((i) => neu[i] ?? null), aggregatId, nachher.id]);
    nachSpalten.set(sql, liste);
  }
  for (const [sql, bindungen] of nachSpalten) db.stapel(sql, bindungen);
  db.stapel(
    KNOTEN_EINFUEGEN,
    k.hinzugefuegt.map((n) => knotenZuBindung(aggregatId, n)),
  );
  if (k.entfernt.length + k.geaendert.length + k.hinzugefuegt.length > 0) pruefeBaum(db, aggregatId);
}

/**
 * Beide Bedingungen der Baumprüfung in einem Durchlauf über den Index `knoten_eltern` (Ticket 52): je Elternknoten die
 * Reihenfolge (dicht 0..n-1) und, außer an der Wurzel, ob es den Elternknoten gibt (Index des Primärschlüssels). Leer
 * genau dann, wenn es weder eine Waise noch eine Lücke gibt; dann reicht dieser eine Durchlauf.
 */
const BAUM_BEFUND = `SELECT k.eltern_id FROM knoten k WHERE k.aggregat_id = ?1 GROUP BY k.eltern_id
  HAVING COUNT(*) <> COUNT(DISTINCT k.reihenfolge) OR MIN(k.reihenfolge) <> 0 OR MAX(k.reihenfolge) <> COUNT(*) - 1
    OR (k.eltern_id <> ?1 AND NOT EXISTS (SELECT 1 FROM knoten p WHERE p.aggregat_id = ?1 AND p.id = k.eltern_id))
  LIMIT 1`;

/** Ein Knoten, dessen Elternknoten fehlt (für die Meldung; nur nach einem Befund). */
const BAUM_WAISE = `SELECT k.id FROM knoten k
  WHERE k.aggregat_id = ?1 AND k.eltern_id <> ?1
    AND NOT EXISTS (SELECT 1 FROM knoten p WHERE p.aggregat_id = ?1 AND p.id = k.eltern_id)
  LIMIT 1`;

/**
 * Struktur des Baums nach dem Schreiben: keine Waisen, `reihenfolge` je Elternknoten dicht 0..n-1. Geprüft wird immer
 * der ganze Baum des Aggregats. Gibt es einen Befund, nennt die Meldung zuerst eine Waise, sonst den ersten
 * Elternknoten (nach Kennung) mit Lücke; ohne Waise ist das genau die Zeile des Befunds.
 */
function pruefeBaum(db: Datenbank, aggregatId: string): void {
  const befund = db.zeilen(BAUM_BEFUND, [aggregatId])[0];
  if (befund === undefined) return;
  const waise = db.zeilen(BAUM_WAISE, [aggregatId])[0];
  if (waise !== undefined) {
    return abbruch(
      'konflikt',
      `Konflikt: Knoten ${String(waise['id'])} hat keinen vorhandenen Elternknoten; nichts geschrieben.`,
    );
  }
  return abbruch(
    'konflikt',
    `Konflikt: Die Reihenfolge unter ${String(befund['eltern_id'])} ist nicht dicht; nichts geschrieben.`,
  );
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
function wendeSummenAn(db: Datenbank, aggregatId: string, s: Omit<Summenaenderung, 'vorher'>): void {
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
 * Woher ein ChangeSet kommt, das `anwenden` schreibt (nicht der Import): Zeitpunkt und Befehlsart des Protokolleintrags, bei
 * `Rueckgaengig` und `Wiederholen` dazu die Art des ursprünglichen Befehls (`ursprung`, sonst `null`). Daran hängt, was ein
 * LV-Stand ohne seinen Inhalt (`lvStandInhalt`) bedeuten darf (D-82 M2): einfrieren nur bei `LvStandAnlegen` und dessen
 * `Wiederholen`, entfernen nur als `Rueckgaengig` eines `LvStandAnlegen`. Alles andere ist ein Programmfehler und wird nicht
 * still zu einem neuen oder fehlenden Stand.
 */
export interface Schreibanlass {
  readonly wann: Zeitstempel;
  readonly befehl: string;
  readonly ursprung: string | null;
}

/** Friert der Befehl des Anlasses einen LV-Stand ein? (`LvStandAnlegen` oder dessen `Wiederholen`, D-82 M2) */
const friertEin = (a: Schreibanlass): boolean =>
  a.befehl === 'LvStandAnlegen' || (a.befehl === 'Wiederholen' && a.ursprung === 'LvStandAnlegen');

/** Nimmt der Befehl des Anlasses einen eingefrorenen Stand ohne seinen Inhalt zurück? (Rückgängig von `LvStandAnlegen`) */
const nimmtAnlegenZurueck = (a: Schreibanlass): boolean =>
  a.befehl === 'Rueckgaengig' && a.ursprung === 'LvStandAnlegen';

/**
 * ChangeSet am LV: Kopf, Knoten, Summen, Papierkorb und LV-Stand, in dieser Reihenfolge. `anlass` fehlt nur beim Import;
 * ein eingefrorener LV-Stand bekommt `anlass.wann` als `angelegt` (nur `anwenden` legt Stände über ein ChangeSet an).
 */
export function wendeLvAn(
  db: Datenbank,
  cs: LvChangeSet,
  projektId: ProjektId,
  anlass?: Schreibanlass,
  /** v1.4: Verweis der Nachtragsangaben prüfen; der Import prüft alle am Ende (das Auftrags-LV kommt dort später). */
  nachtragPruefen = true,
): void {
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
    const kopfdaten = [
      ...kopfdatenSpalten(nachher),
      ...lvKennzeichenSpalten(nachher),
      lvPreisspiegelSpalte(nachher),
    ];
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
           ${LV_KOPF_SPALTEN.join(', ')})
         VALUES (?, ?, ?, ?, ?, ?, ?, ${LV_KOPF_SPALTEN.map(() => '?').join(', ')})`,
        [
          id,
          nachher.projektId,
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          ...kopfdaten,
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
           ${LV_KOPF_SETZEN}
         WHERE id = ?`,
        [
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          ...kopfdaten,
          id,
        ],
      );
    }
    if (nachtragPruefen) pruefeNachtragsbezug(db, nachher);
  }
  wendeKnotenAn(db, id, cs.knoten, () => {
    pruefeSummenvorher(db, id, cs.summen, cs.kopf?.vorher === null, kennungen(cs.knoten.entfernt));
  });
  wendeSummenAn(db, id, cs.summen);
  if (cs.papierkorb !== undefined) wendePapierkorbAn(db, id, cs.papierkorb);
  if (cs.papierkorb !== undefined || cs.knoten.hinzugefuegt.length > 0) pruefePapierkorb(db, id, cs);
  wendeLvStandAn(db, id, cs, anlass);
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
 * Der LV-Stand eines ChangeSets (`lvStand`, `lvStandInhalt`; v1.2, v1.7a D-127.1). Vier Formen, sonst `unbekannt` und nichts
 * geschrieben:
 * - `vorher: null` ohne Inhalt (`LvStandAnlegen` und dessen `Wiederholen`, D-82 M2): friert den gespeicherten Stand des LV ein
 *   (nach den übrigen Teilen dieses ChangeSets, in derselben Transaktion), `angelegt` = Zeitpunkt des Eintrags.
 * - `vorher: null` mit Inhalt (Umkehrung von `LvStandLoeschen`): legt genau diesen Stand mit seinem `angelegt` ab, friert
 *   nichts ein; nach `angelegt` geordnet steht er wieder an seinem Platz (D-82 S1).
 * - `nachher: null` (Umkehrung des Anlegens; mit Inhalt `LvStandLoeschen`): Der Stand muss genau so gespeichert sein, mit
 *   Inhalt auch mit diesem `angelegt` und Zustand (sonst `konflikt`), und entfällt.
 * - beide Seiten (`LvStandUmbenennen`, ohne Inhalt): gleiche Kennung und gleiches LV, nur der Name ändert sich.
 */
function wendeLvStandAn(
  db: Datenbank,
  lvId: LeistungsverzeichnisId,
  cs: LvChangeSet,
  anlass: Schreibanlass | undefined,
): void {
  const s = cs.lvStand;
  const inhalt = cs.lvStandInhalt;
  if (s === undefined) {
    if (inhalt !== undefined) abbruch('unbekannt', 'ChangeSet: lvStandInhalt ohne lvStand (Vertrag v1.7a).');
    return;
  }
  const { vorher, nachher } = s;
  if (
    inhalt !== undefined &&
    ((vorher === null) === (nachher === null) ||
      (inhalt.vorher === null) !== (vorher === null) ||
      (inhalt.nachher === null) !== (nachher === null))
  )
    return abbruch(
      'unbekannt',
      'ChangeSet: lvStandInhalt steht nur beim Löschen eines Stands und seiner Umkehrung, auf derselben Seite wie lvStand.',
    );
  if (vorher !== null && nachher !== null) {
    standUmbenennen(db, lvId, vorher, nachher);
    return;
  }
  if (nachher !== null) {
    if (nachher.leistungsverzeichnisId !== lvId)
      return abbruch('unbekannt', 'ChangeSet: Der LV-Stand gehört zu einem anderen LV.');
    if (leseLvStand(db, nachher.id) !== null)
      return konflikt(`LV-Stand ${nachher.id} existiert bereits, das ChangeSet`);
    if (inhalt?.nachher != null) {
      if (inhalt.nachher.zustand.leistungsverzeichnis.id !== lvId)
        return abbruch('unbekannt', 'ChangeSet: Der Zustand des LV-Stands gehört zu einem anderen LV.');
      schreibeLvStand(db, { ...nachher, ...inhalt.nachher });
      return;
    }
    if (anlass === undefined) return abbruch('unbekannt', 'Ein LV-Stand entsteht nur über anwenden.');
    if (!friertEin(anlass))
      return abbruch(
        'unbekannt',
        `ChangeSet: Ein LV-Stand ohne seinen Inhalt entsteht nur über LvStandAnlegen oder dessen Wiederholen (${nachher.id}).`,
      );
    const zustand = leseLv(db, lvId);
    if (zustand === null)
      return abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
    db.ausfuehren(LV_STAND_SCHREIBEN, [
      nachher.id,
      lvId,
      nachher.name,
      anlass.wann,
      kanonischKompakt(zustand),
    ]);
    return;
  }
  if (vorher === null) return abbruch('unbekannt', 'ChangeSet: LV-Stand ohne vorher und nachher.');
  if (inhalt === undefined && (anlass === undefined || !nimmtAnlegenZurueck(anlass)))
    return abbruch(
      'unbekannt',
      `ChangeSet: Ein LV-Stand ohne seinen Inhalt entfällt nur als Rückgängig von LvStandAnlegen (${vorher.id}).`,
    );
  const gespeichert = gespeicherterStand(db, lvId, vorher);
  if (
    inhalt?.vorher != null &&
    !gleich({ angelegt: gespeichert.angelegt, zustand: gespeichert.zustand }, inhalt.vorher)
  )
    return konflikt(`der Inhalt des LV-Stands ${vorher.id}`);
  db.ausfuehren('DELETE FROM lv_stand WHERE id = ?', [vorher.id]);
}

/** Der gespeicherte Stand zum Kopf `vorher`: fehlt er, `nicht-gefunden`; weicht sein Kopf ab, `konflikt`. */
function gespeicherterStand(db: Datenbank, lvId: LeistungsverzeichnisId, vorher: LvStandKopf): LvStand {
  const gespeichert = leseLvStand(db, vorher.id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `LV-Stand ${vorher.id} ist nicht vorhanden.`);
  const { id, leistungsverzeichnisId, name } = gespeichert;
  if (!gleich({ id, leistungsverzeichnisId, name }, vorher) || leistungsverzeichnisId !== lvId)
    return konflikt(`der LV-Stand ${vorher.id}`);
  return gespeichert;
}

/** `LvStandUmbenennen` (v1.7a): Kennung und LV bleiben, der Inhalt des Stands bleibt unverändert (ADR 0006). */
function standUmbenennen(
  db: Datenbank,
  lvId: LeistungsverzeichnisId,
  vorher: LvStandKopf,
  nachher: LvStandKopf,
): void {
  if (nachher.id !== vorher.id || nachher.leistungsverzeichnisId !== vorher.leistungsverzeichnisId)
    abbruch(
      'unbekannt',
      `ChangeSet: Ein LV-Stand wechselt beim Umbenennen weder Kennung noch LV (${vorher.id}).`,
    );
  gespeicherterStand(db, lvId, vorher);
  db.ausfuehren('UPDATE lv_stand SET name = ? WHERE id = ?', [nachher.name, vorher.id]);
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
  if (cs.lvStand !== undefined || cs.lvStandInhalt !== undefined)
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

/** Die Spalten einer Angebotsposition nach Namen (`ANGEBOTSPOSITION_SPALTEN`), der Schlüssel am Ende bzw. am Anfang. */
const ANGEBOTSPOSITION_AENDERN = `UPDATE angebotsposition SET ${ANGEBOTSPOSITION_SPALTEN.map((s) => `${s} = ?`).join(', ')}
  WHERE angebot_id = ? AND position_id = ?`;
const ANGEBOTSPOSITION_EINFUEGEN = `INSERT INTO angebotsposition (angebot_id, position_id, ${ANGEBOTSPOSITION_SPALTEN.join(', ')})
  VALUES (?, ?, ${ANGEBOTSPOSITION_SPALTEN.map(() => '?').join(', ')})`;

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
  // Angebotssummen hängen an den Positionen des LV, nicht an den Angebotspositionen: keine Kennungen entfernter Knoten.
  pruefeSummenvorher(db, id, cs.summen, cs.kopf?.vorher === null, null);
  const schluessel = (positionId: string): SqlWert[] => [id, positionId];
  db.stapel(
    'DELETE FROM angebotsposition WHERE angebot_id = ? AND position_id = ?',
    p.entfernt.map((e) => schluessel(e.positionId)),
  );
  db.stapel(
    'DELETE FROM summe_position WHERE aggregat_id = ? AND position_id = ?',
    p.entfernt.map((e) => schluessel(e.positionId)),
  );
  const werte = (n: Angebotsposition): SqlWert[] =>
    spaltenwerte(angebotspositionZeile(n), ANGEBOTSPOSITION_SPALTEN);
  db.stapel(
    ANGEBOTSPOSITION_AENDERN,
    p.geaendert.map(({ nachher }): SqlWert[] => [...werte(nachher), id, nachher.positionId]),
  );
  db.stapel(
    ANGEBOTSPOSITION_EINFUEGEN,
    p.hinzugefuegt.map((n): SqlWert[] => [id, n.positionId, ...werte(n)]),
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
    pruefeAuftragsLvKopf(nachher);
    const [nachlassArt, nachlassWert] = nachlassSpalten(nachher.nachlass);
    const kopfdaten = kopfdatenSpalten(nachher);
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
           nachlass_art, nachlass_wert, ${KOPFDATEN_SPALTEN.join(', ')})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${KOPFDATEN_SPALTEN.map(() => '?').join(', ')})`,
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
          ...kopfdaten,
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
           ${KOPFDATEN_SETZEN}
         WHERE id = ?`,
        [
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
          ...kopfdaten,
          id,
        ],
      );
    }
  }
  wendeKnotenAn(db, id, cs.knoten, () => {
    pruefeSummenvorher(db, id, cs.summen, cs.kopf?.vorher === null, kennungen(cs.knoten.entfernt));
    pruefeEntfernteAufmasspositionen(db, id, cs.knoten.entfernt);
  });
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
  // v1.4 (Q5): Aufmaßblätter, Rechnungen und Nachtragsangaben eines LV verweisen auf das Auftrags-LV; v1.6 (D-97.6): Mängel.
  abhaengig(
    db,
    `Auftrags-LV ${id}`,
    `SELECT 'Aufmaßblatt' AS art, id FROM aufmass WHERE auftrags_lv_id = ?1
     UNION ALL SELECT 'Rechnung', id FROM rechnung WHERE auftrags_lv_id = ?1
     UNION ALL SELECT 'LV mit Nachtragsangaben', id FROM leistungsverzeichnis
       WHERE json_extract(nachtrag, '$.auftragsLvId') = ?1
     UNION ALL SELECT 'Mangel', id FROM mangel WHERE auftrags_lv_id = ?1
     ORDER BY 1, 2`,
    id,
  );
  loescheKnotenUndSummen(db, id, cs.knoten, cs.summen, `Auftrags-LV ${id}`);
  db.ausfuehren('DELETE FROM auftrags_lv WHERE id = ?', [id]);
}

// --- Aufmaßblatt, Rechnung, Kostenermittlung (Schema 5, v1.4; D-36 (8)) -------------------------------------------------
//
// Ihre ChangeSets tragen das ganze Aggregat vorher und nachher, ohne Summen. Gemeinsam: `vorher: null` legt an (die
// Kennung darf es noch nicht geben), `nachher: null` löscht, beide gesetzt ändern; `vorher` muss kanonisch gleich dem
// gespeicherten Stand sein (`konflikt`), ein unbekanntes Aggregat zu ändern oder zu löschen ist `nicht-gefunden` (wie bei
// LV und Angebot). Kennung und Projekt müssen zu ChangeSet und Protokolleintrag passen, Auftrags-LV und Nummer bleiben
// nach dem Anlegen fest (D-70.9); sonst ist das ChangeSet ein Programmfehler (`unbekannt`). Die Bezüge zu anderen
// Aggregaten prüft `bezuege.ts`.

interface GanzesAggregat {
  readonly id: string;
  readonly projektId: ProjektId;
}

/** Der gespeicherte Stand eines ganzen Aggregats, gegen den `vorher` geprüft wird. */
interface GespeicherterStand<T> {
  /** Ist `vorher` kanonisch gleich dem gespeicherten Stand? */
  readonly passt: (vorher: T) => boolean;
}

/** Der gespeicherte Stand als gelesenes Aggregat: `vorher` passt, wenn beide kanonisch gleich sind. */
const alsStand = <T>(gespeichert: T | null): GespeicherterStand<T> | null =>
  gespeichert === null ? null : { passt: (vorher) => gleich(gespeichert, vorher) };

/** Prüft ein ChangeSet eines ganzen Aggregats gegen sich selbst, den Protokolleintrag und den gespeicherten Stand. */
function pruefeGanzesAggregat<T extends GanzesAggregat>(
  a: Aenderung<T>,
  id: string,
  projektId: ProjektId,
  gespeichert: GespeicherterStand<T> | null,
  was: string,
  fest: readonly (keyof T & string)[],
): void {
  const { vorher, nachher } = a;
  if (vorher === null && nachher === null) abbruch('unbekannt', `ChangeSet: ${was} ohne vorher und nachher.`);
  for (const seite of [vorher, nachher]) {
    if (seite === null) continue;
    if (seite.id !== id) abbruch('unbekannt', `ChangeSet: Die Kennung von ${was} weicht ab (${seite.id}).`);
    if (seite.projektId !== projektId)
      abbruch('unbekannt', `ChangeSet: ${was} gehört zu einem anderen Projekt als der Protokolleintrag.`);
  }
  if (vorher === null) {
    if (gespeichert !== null) konflikt(`${was} existiert bereits, das ChangeSet`);
    return;
  }
  if (gespeichert === null) abbruch('nicht-gefunden', `${was} ist nicht vorhanden.`);
  if (!gespeichert.passt(vorher)) konflikt(`der Vorherstand von ${was}`);
  if (nachher !== null)
    for (const f of fest)
      if (!gleich(vorher[f], nachher[f])) abbruch('unbekannt', `ChangeSet: ${f} von ${was} bleibt fest.`);
}

/** Blatt- und Rechnungsnummer: ganze Zahl ab 1 (Form, prüft der Ausführer; hier nur gegen Programmfehler). */
function pruefeNummer(nummer: number, was: string): void {
  if (!Number.isSafeInteger(nummer) || nummer < 1)
    abbruch('unbekannt', `ChangeSet: Die Nummer von ${was} ist keine ganze Zahl ab 1 (${String(nummer)}).`);
}

/** Die Zeilen eines Blatts in kanonischer Form; eine Zeile, die als dasselbe Objekt schon geschrieben wurde, aus der Merkliste. */
const zeilentext = (positionen: unknown, merkliste: WeakMap<object, string>): string =>
  Array.isArray(positionen)
    ? kanonischeListe(positionen, merkliste, '$.positionen')
    : kanonischKompakt(positionen);

/**
 * Der gespeicherte Stand eines Aufmaßblatts mit den Zeilen als gespeichertem Text (Ticket 94). `vorher` passt, wenn sein Kopf
 * kanonisch gleich dem gespeicherten ist und seine Zeilen in kanonischer Form genau den gespeicherten Text ergeben: dieselbe
 * Gleichheit wie `gleich` über das ganze Blatt, ohne den Text zu parsen und ein zweites Mal zu sortieren. Beide Teile werden
 * ganz in kanonische Form gebracht, bevor verglichen wird; ein Wert, der kein JSON ist, bleibt so ein Programmfehler.
 */
function aufmassStand(g: AufmassText, merkliste: WeakMap<object, string>): GespeicherterStand<Aufmass> {
  return {
    passt: (vorher) => {
      const { positionen, ...kopf } = vorher;
      const kopfGleich = gleich(g.kopf, kopf);
      // Ohne Zeilen fehlt der Schlüssel in der kanonischen Form: nicht gleich (gespeichert sind immer Zeilen).
      const zeilen: unknown = positionen;
      return (zeilen === undefined ? null : zeilentext(zeilen, merkliste)) === g.positionen && kopfGleich;
    },
  };
}

/**
 * Aufmaßblatt anlegen, ändern oder löschen (`AufmassChangeSet`). Ändern (Ticket 94): Das ChangeSet trägt das ganze Blatt
 * zweimal (D-36 (8)); jede Zeile wird höchstens einmal in kanonische Form gebracht (die Zeilen, die `nachher` mit `vorher`
 * teilt, über die Merkliste; auch nach der Worker-Grenze, weil `postMessage` geteilte Objekte geteilt lässt), das gespeicherte
 * Blatt wird nicht geparst, und geschrieben wird nur, was sich ändert.
 */
export function wendeAufmassAn(db: Datenbank, cs: AufmassChangeSet, projektId: ProjektId): void {
  const id = cs.aufmassId;
  const was = `Aufmaßblatt ${id}`;
  const { vorher, nachher } = cs.aufmass;
  const merkliste = new WeakMap<object, string>();
  const gespeichert = leseAufmassText(db, id);
  pruefeGanzesAggregat(
    cs.aufmass,
    id,
    projektId,
    gespeichert === null ? null : aufmassStand(gespeichert, merkliste),
    was,
    ['auftragsLvId', 'nummer'],
  );
  if (nachher === null) {
    if (vorher !== null) pruefeAufmassLoeschen(db, vorher);
    db.ausfuehren('DELETE FROM aufmass WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) {
    pruefeNummer(nachher.nummer, was);
    pruefeAufmassAnlegen(db, nachher);
    einfuegen(db, 'aufmass', aufmassZeile(nachher));
    return;
  }
  // `vorher` ist der gespeicherte Stand (oben geprüft); Nummer und Auftrags-LV bleiben fest.
  if (nachher.bezeichnung !== vorher.bezeichnung || nachher.datum !== vorher.datum)
    db.ausfuehren('UPDATE aufmass SET bezeichnung = ?, datum = ? WHERE id = ?', [
      nachher.bezeichnung,
      nachher.datum,
      id,
    ]);
  const zeilen = zeilentext(nachher.positionen, merkliste);
  if (zeilen !== gespeichert?.positionen)
    db.ausfuehren('UPDATE aufmass SET positionen = ? WHERE id = ?', [zeilen, id]);
}

/**
 * Rechnung anlegen, ändern oder löschen (`RechnungChangeSet`). Vor dem Schreiben die Bezüge (Auftrags-LV, Nummer,
 * `aufmassIds`) und die Regeln „keine spätere freigegebene“ beim Anlegen und Löschen, danach die Invariante der Freigaben
 * (D-34 (7)): Sie fängt das Freigeben und das Aufheben der Freigabe außer der Reihe.
 * v1.7b (D-128.7, D-93): Zahlungen nur an einer freigegebenen Rechnung, sonst `konflikt` (auch für ein Undo).
 */
export function wendeRechnungAn(db: Datenbank, cs: RechnungChangeSet, projektId: ProjektId): void {
  const id = cs.rechnungId;
  const was = `Rechnung ${id}`;
  const { vorher, nachher } = cs.rechnung;
  pruefeGanzesAggregat(cs.rechnung, id, projektId, alsStand(leseRechnung(db, id)), was, [
    'auftragsLvId',
    'nummer',
  ]);
  if (nachher === null) {
    if (vorher !== null) pruefeRechnungLoeschen(db, vorher);
    db.ausfuehren('DELETE FROM rechnung WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) {
    pruefeNummer(nachher.nummer, was);
    pruefeRechnungAnlegen(db, nachher);
  }
  pruefeRechnungsaufmasse(db, nachher);
  pruefeZahlungenNurFreigegeben(nachher); // v1.7b (D-128.7, D-93)
  const zeile = rechnungZeile(nachher);
  if (vorher === null) einfuegen(db, 'rechnung', zeile);
  else aendern(db, 'rechnung', zeile, ['angaben']); // Auftrags-LV und Nummer bleiben fest (oben geprüft)
  pruefeFreigabereihenfolge(db, nachher.auftragsLvId);
}

/** Kostenermittlung anlegen, ändern oder löschen (`KostenermittlungChangeSet`); an ihr hängt nichts. */
export function wendeKostenermittlungAn(
  db: Datenbank,
  cs: KostenermittlungChangeSet,
  projektId: ProjektId,
): void {
  const id = cs.kostenermittlungId;
  const was = `Kostenermittlung ${id}`;
  const { vorher, nachher } = cs.kostenermittlung;
  pruefeGanzesAggregat(cs.kostenermittlung, id, projektId, alsStand(leseKostenermittlung(db, id)), was, []);
  if (nachher === null) {
    pruefeKostenermittlungLoeschen(db, id); // v1.6 (Q5): keine Honorarberechnung verweist darauf
    db.ausfuehren('DELETE FROM kostenermittlung WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) {
    if (leseProjekt(db, projektId) === null)
      abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
    einfuegen(db, 'kostenermittlung', kostenermittlungZeile(nachher));
    return;
  }
  aendern(db, 'kostenermittlung', kostenermittlungZeile(nachher), ['stufe', 'name', 'eintraege']);
}

// --- Bauwerksmodell (Schema 6, v1.6; D-51, D-54, D-97.3) ------------------------------------------------------------------

/**
 * Bauwerksmodell anlegen, umbenennen oder löschen (`BauwerksmodellChangeSet`). Verglichen wird nur der Kopf mit dem
 * gespeicherten Stand (Struktur und Bauteile ändern sich nie, Vertrag); beim Löschen dazu die Zahl der Bauteile und
 * Strukturknoten, damit ein Undo kein verkürztes Modell zurücklegt. Kopf und Inhalt stehen in getrennten Tabellen: Umbenennen
 * schreibt nur die kleine Kopfzeile.
 */
export function wendeBauwerksmodellAn(
  db: Datenbank,
  cs: BauwerksmodellChangeSet,
  projektId: ProjektId,
): void {
  const id = cs.bauwerksmodellId;
  const was = `Bauwerksmodell ${id}`;
  const { vorher, nachher } = cs.kopf;
  const i = cs.inhalt;
  // `inhalt` genau dann, wenn eine Seite des Kopfs `null` ist, und dann auf derselben Seite `null` (Vertrag).
  const ganz = vorher === null || nachher === null;
  if (
    ganz !== (i !== undefined) ||
    (i !== undefined &&
      ((i.vorher === null) !== (vorher === null) || (i.nachher === null) !== (nachher === null)))
  )
    abbruch('unbekannt', `ChangeSet: ${was} trägt den Inhalt genau beim Anlegen und Löschen.`);
  const gespeichert = leseBauwerksmodellKopf(db, id);
  const kopf = gespeichert === null ? null : bauwerksmodellKopfOhneAnzahl(gespeichert);
  pruefeGanzesAggregat(cs.kopf, id, projektId, alsStand(kopf), was, [
    'datei',
    'schema',
    'vorgaengerId',
    'eingelesen',
  ]);
  if (nachher === null) {
    const vorherInhalt = i?.vorher;
    if (gespeichert === null || vorherInhalt == null) return; // oben geprüft
    if (
      vorherInhalt.bauteile.length !== gespeichert.anzahlBauteile ||
      vorherInhalt.struktur.length !== strukturAnzahl(db, id)
    )
      konflikt(`der Inhalt von ${was}`);
    pruefeBauwerksmodellLoeschen(db, id);
    db.ausfuehren('DELETE FROM bauwerksmodell_inhalt WHERE bauwerksmodell_id = ?', [id]);
    db.ausfuehren('DELETE FROM bauwerksmodell WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) {
    const neu = i?.nachher;
    if (neu == null) return; // oben geprüft
    if (leseProjekt(db, projektId) === null)
      abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
    pruefeBauwerksmodellAnlegen(db, nachher);
    einfuegen(db, 'bauwerksmodell', bauwerksmodellZeile(nachher, neu.bauteile.length));
    db.ausfuehren(
      'INSERT INTO bauwerksmodell_inhalt (bauwerksmodell_id, struktur, bauteile) VALUES (?, ?, ?)',
      [id, kanonischKompakt(neu.struktur), kanonischKompakt(neu.bauteile)],
    );
    return;
  }
  // Umbenennen: alles außer dem Namen ist oben als fest geprüft.
  db.ausfuehren('UPDATE bauwerksmodell SET name = ? WHERE id = ?', [nachher.name, id]);
}

// --- Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag (Schema 6, v1.6; D-57) -----------------------------------
//
// Ganze Aggregate wie Aufmaßblatt und Rechnung (`pruefeGanzesAggregat`). Ein Aggregat in einem Projekt anzulegen, das es nicht
// gibt, ist `nicht-gefunden` (wie die Kostenermittlung, D-79.5).

function projektDa(db: Datenbank, projektId: ProjektId): void {
  if (leseProjekt(db, projektId) === null)
    abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
}

/** Der Kopf eines Plans (ohne Vorgänge). */
function planKopf(b: Bauzeitenplan): BauzeitenplanKopf {
  return ohne(b, 'vorgaenge');
}

/**
 * Der gespeicherte Stand eines Plans mit den Vorgängen als gespeichertem Text (wie `aufmassStand`, Ticket 94): Die Vorgänge,
 * die `vorher` mit `nachher` teilt, werden nur einmal in kanonische Form gebracht, der gespeicherte Text wird nicht geparst
 * (Undo bei 1.000 Vorgängen, D-57).
 */
function planStand(
  g: BauzeitenplanText,
  merkliste: WeakMap<object, string>,
): GespeicherterStand<Bauzeitenplan> {
  return {
    passt: (vorher) => {
      const zeilen: unknown = vorher.vorgaenge;
      return (
        (zeilen === undefined ? null : zeilentext(zeilen, merkliste)) === g.vorgaenge &&
        gleich(g.kopf, planKopf(vorher))
      );
    },
  };
}

/** Bauzeitenplan anlegen, ändern oder löschen (`BauzeitenplanChangeSet`); seine Verweise sind schwach (Befunde der App). */
export function wendeBauzeitenplanAn(db: Datenbank, cs: BauzeitenplanChangeSet, projektId: ProjektId): void {
  const id = cs.bauzeitenplanId;
  const was = `Bauzeitenplan ${id}`;
  const { vorher, nachher } = cs.bauzeitenplan;
  const merkliste = new WeakMap<object, string>();
  const gespeichert = leseBauzeitenplanText(db, id);
  pruefeGanzesAggregat(
    cs.bauzeitenplan,
    id,
    projektId,
    gespeichert === null ? null : planStand(gespeichert, merkliste),
    was,
    [],
  );
  if (nachher === null) {
    db.ausfuehren('DELETE FROM bauzeitenplan WHERE id = ?', [id]);
    return;
  }
  const vorgaenge = zeilentext(nachher.vorgaenge, merkliste);
  if (vorher === null) {
    projektDa(db, projektId);
    einfuegen(db, 'bauzeitenplan', bauzeitenplanZeile(nachher, vorgaenge));
    return;
  }
  // `vorher` ist der gespeicherte Stand (oben geprüft); geschrieben wird nur, was sich ändert.
  if (!gleich(planKopf(vorher), planKopf(nachher)))
    aendern(db, 'bauzeitenplan', bauzeitenplanZeile(nachher, vorgaenge), [
      'name',
      'projektbeginn',
      'kalender',
    ]);
  if (vorgaenge !== gespeichert?.vorgaenge)
    db.ausfuehren('UPDATE bauzeitenplan SET vorgaenge = ? WHERE id = ?', [vorgaenge, id]);
}

/** Honorarberechnung anlegen, ändern oder löschen; ihre Verweise auf Kostenermittlungen hält `speicher` (Q5). */
export function wendeHonorarberechnungAn(
  db: Datenbank,
  cs: HonorarberechnungChangeSet,
  projektId: ProjektId,
): void {
  const id = cs.honorarberechnungId;
  const { vorher, nachher } = cs.honorarberechnung;
  pruefeGanzesAggregat(
    cs.honorarberechnung,
    id,
    projektId,
    alsStand(leseHonorarberechnung(db, id)),
    `Honorarberechnung ${id}`,
    [],
  );
  if (nachher === null) {
    db.ausfuehren('DELETE FROM honorarberechnung WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) projektDa(db, projektId);
  pruefeHonorarbezuege(db, nachher);
  const zeile = honorarberechnungZeile(nachher);
  if (vorher === null) einfuegen(db, 'honorarberechnung', zeile);
  else aendern(db, 'honorarberechnung', zeile, ['name', 'nebenkosten', 'mwst_satz', 'objekte']);
}

/** Mangel anlegen, ändern oder löschen; die Nummer bleibt fest (D-97.13), Auftrags-LV und Modell hält `speicher` (D-97.6). */
/**
 * Schreibt ein ChangeSet an den Einstellungen des Geräts (v1.7a, D-73, D-127.8): ganz vorher und nachher. Weicht `vorher` vom
 * gespeicherten Stand ab, `konflikt` (Q5); eine Form, die sich nicht mehr als Projektdatei einlesen ließe (doppelter Name eines
 * Druckprofils, Kostengruppen ungeordnet oder doppelt), `unbekannt`. Kein Projekt, kein Protokolleintrag eines Projekts.
 */
export function wendeEinstellungenAn(db: Datenbank, cs: EinstellungenChangeSet): void {
  if ((cs as { art?: unknown }).art !== 'einstellungen')
    abbruch('unbekannt', 'ChangeSet: Die Einstellungen nehmen nur ChangeSets der Art einstellungen an.');
  const { vorher, nachher } = cs.einstellungen;
  if (!gleich(leseEinstellungen(db), vorher)) konflikt('der Vorherstand der Einstellungen');
  const befund = einstellungenFormfehler(nachher);
  if (befund !== null) abbruch('unbekannt', `ChangeSet: ${befund}`);
  schreibeEinstellungen(db, nachher);
}

/** Schreibt einen Eintrag des Einstellungsprotokolls (Schema 7, D-82 M1); in der Transaktion seines ChangeSets. */
export function schreibeEinstellungsprotokolleintrag(db: Datenbank, e: EinstellungenProtokolleintrag): void {
  db.ausfuehren('INSERT INTO einstellungen_protokoll (id, wer, wann, befehl) VALUES (?, ?, ?, ?)', [
    e.id,
    e.wer,
    e.wann,
    kanonischKompakt(e.befehl),
  ]);
}

/** Legt die Einstellungen ab (eine Zeile, der ganze Wert als kanonisches JSON; Schema 7). */
function schreibeEinstellungen(db: Datenbank, e: Einstellungen): void {
  db.ausfuehren(
    `INSERT INTO einstellungen (id, inhalt) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET inhalt = excluded.inhalt`,
    [kanonischKompakt(e)],
  );
}

export function wendeMangelAn(db: Datenbank, cs: MangelChangeSet, projektId: ProjektId): void {
  const id = cs.mangelId;
  const { vorher, nachher } = cs.mangel;
  pruefeGanzesAggregat(cs.mangel, id, projektId, alsStand(leseMangel(db, id)), `Mangel ${id}`, ['nummer']);
  if (nachher === null) {
    db.ausfuehren('DELETE FROM mangel WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) {
    pruefeNummer(nachher.nummer, `Mangel ${id}`);
    projektDa(db, projektId);
  }
  pruefeMangel(db, nachher);
  const zeile = mangelZeile(nachher);
  if (vorher === null) einfuegen(db, 'mangel', zeile);
  else aendern(db, 'mangel', zeile, ['auftrags_lv_id', 'bauwerksmodell_id', 'angaben']); // die Nummer bleibt fest
}

/** Bautagebucheintrag anlegen, ändern oder löschen; je Projekt und Datum höchstens einer (D-57). */
export function wendeBautagebucheintragAn(
  db: Datenbank,
  cs: BautagebucheintragChangeSet,
  projektId: ProjektId,
): void {
  const id = cs.bautagebucheintragId;
  const { vorher, nachher } = cs.bautagebucheintrag;
  pruefeGanzesAggregat(
    cs.bautagebucheintrag,
    id,
    projektId,
    alsStand(leseBautagebucheintrag(db, id)),
    `Bautagebucheintrag ${id}`,
    [],
  );
  if (nachher === null) {
    db.ausfuehren('DELETE FROM bautagebucheintrag WHERE id = ?', [id]);
    return;
  }
  if (vorher === null) projektDa(db, projektId);
  pruefeBautagebucheintrag(db, nachher);
  const zeile = bautagebucheintragZeile(nachher);
  if (vorher === null) einfuegen(db, 'bautagebucheintrag', zeile);
  else aendern(db, 'bautagebucheintrag', zeile, ['datum', 'angaben']);
}

const bauwerksmodellKopfOhneAnzahl = (u: BauwerksmodellUebersicht): BauwerksmodellKopf =>
  ohne(u, 'anzahlBauteile');

const strukturAnzahl = (db: Datenbank, id: string): number =>
  anzahl(
    db,
    'SELECT json_array_length(struktur) AS n FROM bauwerksmodell_inhalt WHERE bauwerksmodell_id = ?',
    id,
  );

// --- Modelldateien (Schema 6, v1.6; D-51) ------------------------------------------------------------------------------

/**
 * Legt die Bytes einer Modelldatei ab (`inhalt` schon mit deflate-raw komprimiert, `groesse` die Länge der unkomprimierten
 * Bytes). Idempotent: Ein Hash, der schon abgelegt ist, bleibt unverändert (gleiche Bytes, gleicher Hash).
 */
export function schreibeModelldatei(db: Datenbank, hash: string, groesse: number, inhalt: Uint8Array): void {
  db.ausfuehren(
    'INSERT INTO modelldatei (hash, groesse, inhalt) VALUES (?, ?, ?) ON CONFLICT (hash) DO NOTHING',
    [hash, groesse, inhalt],
  );
}

/**
 * Freigabe (D-97.5): entfernt die Bytes, die kein Bauwerksmodell irgendeines Projekts nennt. Nur beim Öffnen des Speichers,
 * nie während einer Sitzung: Ein Undo von `BauwerksmodellLoeschen` oder ein Wiederholen des Anlegens findet die Bytes so noch.
 */
export function gibUngenutzteModelldateienFrei(db: Datenbank): void {
  db.ausfuehren('DELETE FROM modelldatei WHERE hash NOT IN (SELECT datei_hash FROM bauwerksmodell)');
}

// --- Protokoll -------------------------------------------------------------------------------------------------

export function schreibeProtokolleintrag(db: Datenbank, e: Protokolleintrag): void {
  db.ausfuehren(
    `INSERT INTO protokoll (id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [e.id, e.projektId, e.aggregat.art, e.aggregat.id, e.wer, e.wann, kanonischKompakt(e.befehl)],
  );
}
