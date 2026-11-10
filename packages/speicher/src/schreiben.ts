// SPDX-License-Identifier: AGPL-3.0-or-later
// Die einzige Stelle, die Tabellen schreibt (A5). Jede Funktion hier läuft innerhalb der Transaktion des
// Aufrufers (`anwenden` oder Import); wirft sie, wird alles zurückgerollt.
//
// `speicher` darf `kern` nicht importieren (A3) und wendet ChangeSets deshalb auf Tabellenebene an:
// `hinzugefuegt` fügt Zeilen ein, `geaendert` ersetzt die Zeile, `entfernt` löscht sie, die gelisteten Summen
// werden überschrieben, `kopf` ersetzt die Stammdaten. Summen werden weder berechnet noch geprüft.
//
// Konsistenz: Vor jeder Änderung oder Löschung wird der gespeicherte Stand mit `vorher` (bzw. dem vollständigen
// Stand in `entfernt`) verglichen. Passt er nicht, bricht die Transaktion mit einem Fehlerwert ab und nichts
// wird geschrieben (Q5). Nach dem Schreiben der Knoten wird der Baum auf Waisen und lückenlose
// `reihenfolge` je Elternknoten geprüft.

import type {
  Aenderungen,
  AngebotChangeSet,
  AuftragsLvZustand,
  Gesamtsummen,
  Knoten,
  LvChangeSet,
  Projekt,
  ProjektChangeSet,
  ProjektId,
  Protokolleintrag,
  Summenaenderung,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import { kanonischKompakt } from './kanonisch';
import { leseAngebotKopf, leseAngebotposition, leseKnoten1, leseLvKopf, leseProjekt } from './lesen';
import type { Datenbank, SqlWert } from './sql';
import {
  angebotspositionZuBindung,
  KNOTEN_SPALTEN,
  knotenZuBindung,
  nachlassSpalten,
  pruefeKopfdaten,
  pruefeSummenfelder,
} from './zeilen';

const gleich = (a: unknown, b: unknown): boolean => kanonischKompakt(a) === kanonischKompakt(b);

const konflikt = (was: string): never =>
  abbruch('unbekannt', `Konflikt: ${was} passt nicht zum gespeicherten Stand; es wurde nichts geschrieben.`);

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

export function wendeProjektAn(db: Datenbank, cs: ProjektChangeSet): void {
  const { vorher, nachher } = cs.projekt;
  if (nachher === null) {
    return abbruch('unbekannt', 'Ein Projekt zu löschen ist im Vertrag nicht vorgesehen (kein Befehl, Q5).');
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
      'unbekannt',
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
      'unbekannt',
      `Konflikt: Die Reihenfolge unter ${String(luecke['eltern_id'])} ist nicht dicht; nichts geschrieben.`,
    );
  }
}

function schreibeGesamt(db: Datenbank, aggregatId: string, g: Gesamtsummen): void {
  db.ausfuehren(
    `INSERT INTO summe_gesamt (aggregat_id, netto, nachlass, netto_nach_nachlass, mwst, brutto)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (aggregat_id) DO UPDATE SET netto = excluded.netto, nachlass = excluded.nachlass,
       netto_nach_nachlass = excluded.netto_nach_nachlass, mwst = excluded.mwst, brutto = excluded.brutto`,
    [aggregatId, g.netto, g.nachlass, g.nettoNachNachlass, g.mwst, g.brutto],
  );
}

/** Überschreibt die gelisteten Summen. Es wird nichts berechnet oder geprüft. */
function wendeSummenAn(db: Datenbank, aggregatId: string, s: Summenaenderung): void {
  pruefeSummenfelder(aggregatId, s); // // v1.1b: mechanisch angepasst, Folgeticket
  db.stapel(
    `INSERT INTO summe_position (aggregat_id, position_id, gesamtpreis, geht_in_summe) VALUES (?, ?, ?, ?)
     ON CONFLICT (aggregat_id, position_id) DO UPDATE SET gesamtpreis = excluded.gesamtpreis,
       geht_in_summe = excluded.geht_in_summe`,
    s.positionen.map((p): SqlWert[] => [aggregatId, p.positionId, p.gesamtpreis, p.gehtInSummeEin ? 1 : 0]),
  );
  db.stapel(
    `INSERT INTO summe_gliederung (aggregat_id, gliederung_id, summe) VALUES (?, ?, ?)
     ON CONFLICT (aggregat_id, gliederung_id) DO UPDATE SET summe = excluded.summe`,
    s.gliederungen.map((g): SqlWert[] => [aggregatId, g.gliederungId, g.summe]),
  );
  if (s.gesamt !== null) schreibeGesamt(db, aggregatId, s.gesamt);
}

// --- Leistungsverzeichnis ------------------------------------------------------------------------------------

export function wendeLvAn(db: Datenbank, cs: LvChangeSet, projektId: ProjektId): void {
  const id = cs.leistungsverzeichnisId;
  // v1.2: mechanisch angepasst, Folgeticket (Papierkorb und LV-Stand ablegen: Ticket 43; laut abweisen, Q5)
  if (cs.papierkorb !== undefined || cs.lvStand !== undefined) {
    return abbruch('unbekannt', 'Papierkorb und LV-Stand legt speicher noch nicht ab (Ticket 43).');
  }
  const gespeichert = leseLvKopf(db, id);
  if (cs.kopf === null) {
    if (gespeichert === null)
      return abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`);
    if (gespeichert.projektId !== projektId)
      return abbruch('unbekannt', `LV ${id} gehört zu einem anderen Projekt.`);
  } else {
    const { vorher, nachher } = cs.kopf;
    if (nachher === null) {
      return abbruch('unbekannt', 'Ein LV zu löschen ist im Vertrag nicht vorgesehen (kein Befehl, Q5).');
    }
    if (nachher.id !== id)
      return abbruch('unbekannt', 'ChangeSet: leistungsverzeichnisId und Kopf.id weichen ab.');
    if (nachher.projektId !== projektId)
      return abbruch('unbekannt', 'ChangeSet: Kopf.projektId passt nicht zum Protokolleintrag.');
    pruefeKopfdaten(nachher); // // v1.1b: mechanisch angepasst, Folgeticket
    const [nachlassArt, nachlassWert] = nachlassSpalten(nachher.nachlass);
    if (vorher === null) {
      if (gespeichert !== null) return konflikt(`LV ${id} existiert bereits, das ChangeSet`);
      if (leseProjekt(db, nachher.projektId) === null) {
        return abbruch('nicht-gefunden', `Projekt ${nachher.projektId} ist nicht vorhanden.`);
      }
      if (cs.summen.gesamt === null) {
        return abbruch('unbekannt', `ChangeSet für das neue LV ${id} enthält keine Gesamtsummen.`);
      }
      db.ausfuehren(
        `INSERT INTO leistungsverzeichnis (id, projekt_id, name, oz_maske, mwst_satz, nachlass_art, nachlass_wert)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          nachher.projektId,
          nachher.name,
          kanonischKompakt(nachher.ozMaske),
          nachher.mwstSatz,
          nachlassArt,
          nachlassWert,
        ],
      );
    } else {
      if (gespeichert === null)
        return abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`);
      if (!gleich(gespeichert, vorher)) return konflikt('der Vorherstand des LV-Kopfs');
      if (vorher.projektId !== nachher.projektId)
        return abbruch('unbekannt', 'Ein LV wechselt nicht das Projekt.');
      db.ausfuehren(
        `UPDATE leistungsverzeichnis SET name = ?, oz_maske = ?, mwst_satz = ?, nachlass_art = ?, nachlass_wert = ?
         WHERE id = ?`,
        [nachher.name, kanonischKompakt(nachher.ozMaske), nachher.mwstSatz, nachlassArt, nachlassWert, id],
      );
    }
  }
  wendeKnotenAn(db, id, cs.knoten);
  wendeSummenAn(db, id, cs.summen);
}

// --- Angebot ---------------------------------------------------------------------------------------------------

function pruefeAngebotsposition(db: Datenbank, lvId: string, positionId: string): void {
  const z = db.zeilen("SELECT 1 AS da FROM knoten WHERE aggregat_id = ? AND id = ? AND art = 'position'", [
    lvId,
    positionId,
  ])[0];
  if (z === undefined) {
    return abbruch('nicht-gefunden', `Angebotsposition ${positionId}: keine Position im LV ${lvId}.`);
  }
}

export function wendeAngebotAn(db: Datenbank, cs: AngebotChangeSet, projektId: ProjektId): void {
  const id = cs.angebotId;
  // v1.2: mechanisch angepasst, Folgeticket (Zuschlagssatz des Bieters ablegen: Ticket 38; laut abweisen, Q5)
  const neueZeilen = [...cs.positionen.hinzugefuegt, ...cs.positionen.geaendert.map((g) => g.nachher)];
  if (neueZeilen.some((z) => z.status === 'angeboten' && z.zuschlagssatz !== undefined)) {
    return abbruch('unbekannt', 'Den Zuschlagssatz des Bieters legt speicher noch nicht ab (Ticket 38).');
  }
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
      return abbruch(
        'unbekannt',
        'Ein Angebot zu löschen ist im Vertrag nicht vorgesehen (kein Befehl, Q5).',
      );
    }
    if (nachher.id !== id) return abbruch('unbekannt', 'ChangeSet: angebotId und Kopf.id weichen ab.');
    if (nachher.projektId !== projektId)
      return abbruch('unbekannt', 'ChangeSet: Kopf.projektId passt nicht zum Protokolleintrag.');
    lvId = nachher.leistungsverzeichnisId;
    const lv = leseLvKopf(db, nachher.leistungsverzeichnisId);
    if (lv === null) return abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
    if (lv.projektId !== projektId)
      return abbruch('unbekannt', `LV ${lvId} gehört zu einem anderen Projekt.`);
    pruefeKopfdaten(nachher); // // v1.1b: mechanisch angepasst, Folgeticket
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
    'UPDATE angebotsposition SET status = ?, einheitspreis = ?, epa = ? WHERE angebot_id = ? AND position_id = ?',
    p.geaendert.map(({ nachher }): SqlWert[] => {
      const b = angebotspositionZuBindung(id, nachher);
      return [b[2] ?? null, b[3] ?? null, b[4] ?? null, id, nachher.positionId];
    }),
  );
  db.stapel(
    'INSERT INTO angebotsposition (angebot_id, position_id, status, einheitspreis, epa) VALUES (?, ?, ?, ?, ?)',
    p.hinzugefuegt.map((n) => angebotspositionZuBindung(id, n)),
  );
  wendeSummenAn(db, id, cs.summen);
}

// --- Auftrags-LV (nur Projektdatei-Import; der Vertrag kennt dafür kein ChangeSet) ------------------------------------

export function schreibeAuftragsLv(db: Datenbank, z: AuftragsLvZustand): void {
  const k = z.auftragsLeistungsverzeichnis;
  pruefeKopfdaten(k); // // v1.1b: mechanisch angepasst, Folgeticket
  const [nachlassArt, nachlassWert] = nachlassSpalten(k.nachlass);
  db.ausfuehren(
    `INSERT INTO auftrags_lv (id, projekt_id, leistungsverzeichnis_id, angebot_id, name, oz_maske, mwst_satz,
       nachlass_art, nachlass_wert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      k.id,
      k.projektId,
      k.leistungsverzeichnisId,
      k.angebotId,
      k.name,
      kanonischKompakt(k.ozMaske),
      k.mwstSatz,
      nachlassArt,
      nachlassWert,
    ],
  );
  wendeKnotenAn(db, k.id, { hinzugefuegt: k.knoten, geaendert: [], entfernt: [] });
  wendeSummenAn(db, k.id, {
    positionen: z.summen.positionen,
    gliederungen: z.summen.gliederungen,
    gesamt: z.summen.gesamt,
  });
}

// --- Protokoll -------------------------------------------------------------------------------------------------

export function schreibeProtokolleintrag(db: Datenbank, e: Protokolleintrag): void {
  db.ausfuehren(
    `INSERT INTO protokoll (id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [e.id, e.projektId, e.aggregat.art, e.aggregat.id, e.wer, e.wann, kanonischKompakt(e.befehl)],
  );
}
