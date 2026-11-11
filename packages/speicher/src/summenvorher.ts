// SPDX-License-Identifier: AGPL-3.0-or-later
// `Summenaenderung.vorher` (Pflicht seit `vertrag` v1.3, Ticket 53 Punkt 3) gegen den gespeicherten Stand prüfen, in
// jedem ChangeSet an LV, Angebot und Auftrags-LV, nicht nur beim Löschen (Ticket 57, Review D-27). Das ChangeSet ist
// allein umkehrbar (Undo, LV-Stand) nur, wenn `vorher` die alten Summen trägt; stimmt es nicht, schriebe die Umkehrung
// falsche Summen zurück oder ließe gespeicherte wegfallen (Q5). Lesend; läuft vor dem Schreiben in der Transaktion des
// Aufrufers. Das Löschen eines ganzen Aggregats prüft `pruefeLoeschSummen` in `schreiben.ts` (D-31.2).

import type { Gliederungssumme, Positionssumme, Summenaenderung, Summenvorher } from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import { kanonischKompakt } from './kanonisch';
import { gliederungssummeAusZeile, positionssummeAusZeile } from './lesen';
import type { Datenbank, SqlZeile } from './sql';
import { gesamtAusZeile } from './zeilen';

/** Keine alten Summen: das Aggregat entsteht erst (Anlegen, Import der Projektdatei). */
export const LEERES_SUMMENVORHER: Summenvorher = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  entfernt: { positionen: [], gliederungen: [] },
};

const gleich = (a: unknown, b: unknown): boolean => kanonischKompakt(a) === kanonischKompakt(b);

const konflikt = (was: string): never =>
  abbruch('konflikt', `Konflikt: ${was} passt nicht zum gespeicherten Stand; es wurde nichts geschrieben.`);

/** Ab so vielen Kennungen liest die Prüfung alle Summen des Aggregats auf einmal statt einzeln. */
const EINZELN_BIS = 64;

/** Gespeicherte Summen je Kennung: einzeln über den Primärschlüssel oder, bei vielen, alle des Aggregats. */
function gespeicherteSummen<T>(
  db: Datenbank,
  tabelle: 'summe_position' | 'summe_gliederung',
  spalte: 'position_id' | 'gliederung_id',
  aggregatId: string,
  ids: ReadonlySet<string>,
  ausZeile: (z: SqlZeile) => T,
): Map<string, T> {
  const ergebnis = new Map<string, T>();
  if (ids.size === 0) return ergebnis;
  if (ids.size > EINZELN_BIS) {
    for (const z of db.zeilen(`SELECT * FROM ${tabelle} WHERE aggregat_id = ?`, [aggregatId])) {
      const id = String(z[spalte]);
      if (ids.has(id)) ergebnis.set(id, ausZeile(z));
    }
    return ergebnis;
  }
  const sql = `SELECT * FROM ${tabelle} WHERE aggregat_id = ? AND ${spalte} = ?`;
  for (const id of ids) {
    const z = db.zeilen(sql, [aggregatId, id])[0];
    if (z !== undefined) ergebnis.set(id, ausZeile(z));
  }
  return ergebnis;
}

/**
 * Eine Summenart (Positionen oder Gliederungen): `geaendert` sind die neuen Werte des ChangeSets, `alt` ihre alten Werte
 * aus `vorher`, `entfernt` die Summen entfernter Knoten aus `vorher.entfernt`, `weg` die Kennungen der Knoten, die das
 * ChangeSet entfernt (`null`: keine Knoten, beim Angebot).
 */
function pruefeArt<T>(
  was: string,
  geaendert: readonly T[],
  alt: readonly T[],
  entfernt: readonly T[],
  weg: ReadonlySet<string> | null,
  idVon: (e: T) => string,
  lesen: (ids: ReadonlySet<string>) => Map<string, T>,
): void {
  const neu = new Set(geaendert.map(idVon));
  const altNachId = new Map(alt.map((e) => [idVon(e), e]));
  for (const id of altNachId.keys())
    if (!neu.has(id)) abbruch('unbekannt', `ChangeSet: alte ${was}summe ${id} ohne neuen Wert.`);
  for (const e of entfernt) {
    const id = idVon(e);
    if (weg !== null && !weg.has(id))
      abbruch('unbekannt', `ChangeSet: entfernte ${was}summe ${id} ohne entfernten Knoten.`);
  }
  const gespeichert = lesen(new Set([...neu, ...entfernt.map(idVon), ...(weg ?? [])]));
  // Jede genannte Summe: alter Wert gleich dem gespeicherten; ohne alten Wert darf keine gespeichert sein (sonst
  // löschte die Umkehrung sie). Ein alter Wert ohne gespeicherte Summe verliert nichts und bleibt erlaubt (D-57.2).
  for (const id of neu) {
    const g = gespeichert.get(id);
    const a = altNachId.get(id);
    if (g !== undefined && (a === undefined || !gleich(g, a))) konflikt(`die alte ${was}summe ${id}`);
  }
  for (const e of entfernt) {
    const g = gespeichert.get(idVon(e));
    if (g === undefined || !gleich(g, e)) konflikt(`die entfernte ${was}summe ${idVon(e)}`);
  }
  // Jede gespeicherte Summe eines entfernten Knotens steht in `vorher.entfernt` (die Umkehrung bringt sie zurück).
  const genannt = new Set(entfernt.map(idVon));
  for (const id of weg ?? [])
    if (gespeichert.has(id) && !genannt.has(id)) konflikt(`die Summe des entfernten Knotens ${id}`);
}

/**
 * Prüft `s.vorher` eines ChangeSets, das das Aggregat anlegt oder ändert (nicht löscht). `neu`: das Aggregat entsteht
 * (`kopf.vorher` ist `null`), dann gibt es keine alten Summen. `weg`: Kennungen der entfernten Knoten (LV, Auftrags-LV);
 * `null` beim Angebot, dessen Summen nicht an Angebotspositionen hängen.
 */
export function pruefeSummenvorher(
  db: Datenbank,
  aggregatId: string,
  s: Summenaenderung,
  neu: boolean,
  weg: ReadonlySet<string> | null,
): void {
  const v = s.vorher;
  if (neu) {
    if (!gleich(v, LEERES_SUMMENVORHER)) konflikt('summen.vorher eines neuen Aggregats');
    return;
  }
  if (s.gesamt !== null) {
    const z = db.zeilen('SELECT * FROM summe_gesamt WHERE aggregat_id = ?', [aggregatId])[0];
    const gespeichert = z === undefined ? null : gesamtAusZeile(z);
    if (!gleich(v.gesamt, gespeichert)) konflikt('die alten Gesamtsummen');
  } else if (v.gesamt !== null) {
    abbruch('unbekannt', 'ChangeSet: alte Gesamtsummen ohne neue.');
  }
  pruefeArt<Positionssumme>(
    'Positions',
    s.positionen,
    v.positionen,
    v.entfernt.positionen,
    weg,
    (e) => e.positionId,
    (ids) => gespeicherteSummen(db, 'summe_position', 'position_id', aggregatId, ids, positionssummeAusZeile),
  );
  pruefeArt<Gliederungssumme>(
    'Gliederungs',
    s.gliederungen,
    v.gliederungen,
    v.entfernt.gliederungen,
    weg,
    (e) => e.gliederungId,
    (ids) =>
      gespeicherteSummen(db, 'summe_gliederung', 'gliederung_id', aggregatId, ids, gliederungssummeAusZeile),
  );
}
