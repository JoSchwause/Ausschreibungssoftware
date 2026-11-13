// SPDX-License-Identifier: AGPL-3.0-or-later
// Nummerierte Vorwärts-Migrationen (A8). Die Schemaversion steht in `PRAGMA user_version`, ändert sich
// atomar mit der Migration und ist zugleich die `schemaVersion` der JSON-Projektdatei.
//
// Regeln für eine neue Migration N+1:
//  1. Eintrag am Ende von `MIGRATIONEN` anfügen (lückenlos nummeriert). Bestehende Einträge nie ändern.
//  2. `hoch` verändert das Schema und überführt vorhandene Zeilen; kein Datenverlust (Q5).
//  3. `datei` hebt eine Projektdatei der Version N auf N+1 (reine Funktion über das geparste JSON).
//  4. Die eingefrorenen Dateien `packages/speicher/fixtures/projektdatei-v<N>.json` bleiben unverändert und werden
//     weiter geöffnet; für N+1 kommt eine weitere eingefrorene Datei dazu.
//  5. Das SQL steht hier (A5: Schema nur in dieser Datei), die Dateimigration ab Version 2 in `dateimigration<N>.ts`.
//  6. Ändert der Schritt, was der Kern rechnet, setzt er `summenNeuRechnen` (D-17): Danach stehen alle gespeicherten
//     Summen so, wie der Kern sie vollständig rechnet, auf dem Datenbank- und dem Dateiweg (`summenmigration.ts`).

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import { fehlerAusAusnahme } from './fehler';
import { fehler, ok } from './ergebnis';
import { dateiAuf2 } from './dateimigration2';
import { dateiAuf3 } from './dateimigration3';
import { dateiAuf4 } from './dateimigration4';
import { dateiAuf5 } from './dateimigration5';
import { dateiAuf6 } from './dateimigration6';
import { dateiAuf7 } from './dateimigration7';
import type { Datenbank } from './sql';
import { summenDerDatenbankNeuRechnen, type Migrationsbefund } from './summenmigration';

export interface Migration {
  readonly version: number;
  readonly name: string;
  /** Verändert das Schema von `version - 1` auf `version`. Läuft in einer Transaktion. */
  readonly hoch: (db: Datenbank) => void;
  /** Hebt eine Projektdatei von `version - 1` auf `version`. `null` für Version 1 (Anfang der Reihe). */
  readonly datei: ((roh: Record<string, unknown>) => Record<string, unknown>) | null;
  /**
   * Nach dem Schritt alle gespeicherten Summen mit dem Kern neu rechnen (D-17): auf dem Datenbankweg in derselben
   * Transaktion, auf dem Dateiweg nach der Prüfung der gehobenen Datei. Was der Kern abweist, bleibt und wird Befund.
   */
  readonly summenNeuRechnen?: boolean;
}

/**
 * Version 1. Alle Dezimalwerte sind TEXT in kanonischer Punktnotation und werden nie gerechnet (N1). Zahlen
 * (`reihenfolge`, Flags) sind INTEGER. `knoten` und die Summentabellen sind nach `aggregat_id` geschlüsselt:
 * das ist die Kennung eines LV, Angebots oder Auftrags-LV (Positionsidentität ist je Aggregat eindeutig).
 */
const SCHEMA_V1 = `
CREATE TABLE projekt (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  bauherr_name TEXT NOT NULL,
  bauherr_anschrift TEXT
) STRICT;

CREATE TABLE bieter (
  projekt_id TEXT NOT NULL REFERENCES projekt (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  reihenfolge INTEGER NOT NULL,
  PRIMARY KEY (projekt_id, id)
) STRICT;

CREATE TABLE leistungsverzeichnis (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  name TEXT NOT NULL,
  oz_maske TEXT NOT NULL,
  mwst_satz TEXT NOT NULL,
  nachlass_art TEXT CHECK (nachlass_art IN ('prozent', 'betrag')),
  nachlass_wert TEXT,
  CHECK ((nachlass_art IS NULL) = (nachlass_wert IS NULL))
) STRICT;
CREATE INDEX leistungsverzeichnis_projekt ON leistungsverzeichnis (projekt_id);

CREATE TABLE angebot (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  bieter_id TEXT NOT NULL,
  nachlass_art TEXT CHECK (nachlass_art IN ('prozent', 'betrag')),
  nachlass_wert TEXT,
  CHECK ((nachlass_art IS NULL) = (nachlass_wert IS NULL)),
  FOREIGN KEY (projekt_id, bieter_id) REFERENCES bieter (projekt_id, id)
) STRICT;
CREATE INDEX angebot_lv ON angebot (leistungsverzeichnis_id);

CREATE TABLE angebotsposition (
  angebot_id TEXT NOT NULL REFERENCES angebot (id) ON DELETE CASCADE,
  position_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('angeboten', 'nicht-angeboten')),
  einheitspreis TEXT,
  epa TEXT,
  PRIMARY KEY (angebot_id, position_id),
  CHECK (status = 'angeboten' OR (einheitspreis IS NULL AND epa IS NULL)),
  CHECK (status = 'nicht-angeboten' OR einheitspreis IS NOT NULL)
) STRICT;

CREATE TABLE auftrags_lv (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  angebot_id TEXT NOT NULL REFERENCES angebot (id),
  name TEXT NOT NULL,
  oz_maske TEXT NOT NULL,
  mwst_satz TEXT NOT NULL,
  nachlass_art TEXT CHECK (nachlass_art IN ('prozent', 'betrag')),
  nachlass_wert TEXT,
  CHECK ((nachlass_art IS NULL) = (nachlass_wert IS NULL))
) STRICT;

CREATE TABLE knoten (
  aggregat_id TEXT NOT NULL,
  id TEXT NOT NULL,
  art TEXT NOT NULL CHECK (art IN ('los', 'titel', 'position', 'hinweis')),
  eltern_id TEXT NOT NULL,
  reihenfolge INTEGER NOT NULL CHECK (reihenfolge >= 0),
  ordnungszahl TEXT,
  oz_index TEXT,
  kurztext TEXT,
  positionsart TEXT CHECK (positionsart IN ('normal', 'bedarf', 'wahl', 'zuschlag', 'stundenlohn')),
  pauschal INTEGER CHECK (pauschal IN (0, 1)),
  bedarf_mit_gesamtbetrag INTEGER CHECK (bedarf_mit_gesamtbetrag IN (0, 1)),
  bezugsposition_id TEXT,
  grundposition_id TEXT,
  text_json TEXT,
  menge TEXT,
  einheit TEXT,
  einheitspreis TEXT,
  epa TEXT,
  PRIMARY KEY (aggregat_id, id),
  CHECK (art NOT IN ('los', 'titel', 'position') OR kurztext IS NOT NULL),
  CHECK (art NOT IN ('hinweis', 'position') OR text_json IS NOT NULL),
  CHECK (art <> 'position' OR (positionsart IS NOT NULL AND pauschal IS NOT NULL
                               AND bedarf_mit_gesamtbetrag IS NOT NULL))
) STRICT;
CREATE INDEX knoten_eltern ON knoten (aggregat_id, eltern_id, reihenfolge);

CREATE TABLE summe_position (
  aggregat_id TEXT NOT NULL,
  position_id TEXT NOT NULL,
  gesamtpreis TEXT,
  geht_in_summe INTEGER NOT NULL CHECK (geht_in_summe IN (0, 1)),
  PRIMARY KEY (aggregat_id, position_id)
) STRICT;

CREATE TABLE summe_gliederung (
  aggregat_id TEXT NOT NULL,
  gliederung_id TEXT NOT NULL,
  summe TEXT NOT NULL,
  PRIMARY KEY (aggregat_id, gliederung_id)
) STRICT;

CREATE TABLE summe_gesamt (
  aggregat_id TEXT NOT NULL PRIMARY KEY,
  netto TEXT NOT NULL,
  nachlass TEXT NOT NULL,
  netto_nach_nachlass TEXT NOT NULL,
  mwst TEXT NOT NULL,
  brutto TEXT NOT NULL
) STRICT;

CREATE TABLE protokoll (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  aggregat_art TEXT NOT NULL CHECK (aggregat_art IN
    ('projekt', 'leistungsverzeichnis', 'angebot', 'auftrags-leistungsverzeichnis')),
  aggregat_id TEXT NOT NULL,
  wer TEXT NOT NULL,
  wann TEXT NOT NULL,
  befehl TEXT NOT NULL
) STRICT;
CREATE INDEX protokoll_projekt ON protokoll (projekt_id, seq);
`;

// --- Version 2 (Ticket 38) ------------------------------------------------------------------------------------------
//
// Das Inhaltsmodell von `vertrag` v1.1b/v1.2 verlustfrei ablegen. Die Tabelle `knoten` verliert die Spalten der alten
// Positionsform (`positionsart`, `pauschal`, `bedarf_mit_gesamtbetrag`, `bezugsposition_id`, `grundposition_id`) und
// bekommt `merkmale`, `zuschlag` und `leitbeschreibung` als kanonisches JSON (Dezimalwerte darin als Zeichenketten,
// N1). SQLite kann Spalten, die in einer CHECK-Regel stehen, nicht löschen; die Tabelle wird deshalb neu angelegt und
// umkopiert (keine Fremdschlüssel zeigen auf sie). Die übrigen Tabellen bekommen nur Spalten dazu (`NULL` = fehlt bzw.
// nicht berechnet). Vorhandene Positionen werden überführt wie in `dateimigration2.ts` (Altform, nichts erfunden).

// Schlüssel in `json_object` alphabetisch: so ist das Ergebnis schon kanonisch (wie `kanonischKompakt`).
const MERKMALE_AUS_V1 = `CASE WHEN art = 'position' THEN json_object(
    'bedarf', CASE WHEN positionsart = 'bedarf'
                   THEN CASE WHEN bedarf_mit_gesamtbetrag = 1 THEN 'mit-gesamtbetrag' ELSE 'ohne-gesamtbetrag' END
              END,
    'pauschal', json(CASE WHEN pauschal = 1 THEN 'true' ELSE 'false' END),
    'stundenlohn', json(CASE WHEN positionsart = 'stundenlohn' THEN 'true' ELSE 'false' END),
    'wahl', CASE WHEN positionsart = 'wahl'
                 THEN json_object('grundpositionId', grundposition_id, 'gruppe', NULL, 'variante', NULL) END,
    'zuschlagskennzeichen', json('false')) END`;

const ZUSCHLAG_AUS_V1 = `CASE WHEN art = 'position' AND positionsart = 'zuschlag' THEN json_object(
    'bezug', json_object('art', 'positionen', 'positionen',
      CASE WHEN bezugsposition_id IS NULL THEN json_array()
           ELSE json_array(json_object('positionId', bezugsposition_id, 'teilmenge', NULL)) END),
    'prozentsatz', NULL) END`;

/** Schema von Version 1 auf 2. Läuft in der Transaktion von `migriere`. */
const SCHEMA_V2 = `
CREATE TABLE knoten_v2 (
  aggregat_id TEXT NOT NULL,
  id TEXT NOT NULL,
  art TEXT NOT NULL CHECK (art IN ('los', 'titel', 'position', 'hinweis')),
  eltern_id TEXT NOT NULL,
  reihenfolge INTEGER NOT NULL CHECK (reihenfolge >= 0),
  ordnungszahl TEXT,
  oz_index TEXT,
  kurztext TEXT,
  merkmale TEXT,
  zuschlag TEXT,
  leitbeschreibung TEXT,
  text_json TEXT,
  menge TEXT,
  einheit TEXT,
  einheitspreis TEXT,
  epa TEXT,
  PRIMARY KEY (aggregat_id, id),
  CHECK (art NOT IN ('los', 'titel', 'position') OR kurztext IS NOT NULL),
  CHECK (art NOT IN ('hinweis', 'position') OR text_json IS NOT NULL),
  CHECK ((art = 'position') = (merkmale IS NOT NULL)),
  CHECK (art = 'position' OR (zuschlag IS NULL AND leitbeschreibung IS NULL))
) STRICT;

INSERT INTO knoten_v2 (aggregat_id, id, art, eltern_id, reihenfolge, ordnungszahl, oz_index, kurztext, merkmale,
                       zuschlag, leitbeschreibung, text_json, menge, einheit, einheitspreis, epa)
SELECT aggregat_id, id, art, eltern_id, reihenfolge, ordnungszahl, oz_index, kurztext, ${MERKMALE_AUS_V1},
       ${ZUSCHLAG_AUS_V1}, NULL, text_json, menge, einheit, einheitspreis, epa
FROM knoten;

DROP TABLE knoten;
ALTER TABLE knoten_v2 RENAME TO knoten;
CREATE INDEX knoten_eltern ON knoten (aggregat_id, eltern_id, reihenfolge);

ALTER TABLE leistungsverzeichnis ADD COLUMN auftraggeber TEXT;
ALTER TABLE leistungsverzeichnis ADD COLUMN vergabeinformationen TEXT;
ALTER TABLE auftrags_lv ADD COLUMN auftraggeber TEXT;
ALTER TABLE auftrags_lv ADD COLUMN vergabeinformationen TEXT;

ALTER TABLE summe_gesamt ADD COLUMN summe_bedarf_ohne_gb TEXT;
ALTER TABLE summe_gesamt ADD COLUMN summe_wahl TEXT;
ALTER TABLE summe_gliederung ADD COLUMN summe_bedarf_ohne_gb TEXT;
ALTER TABLE summe_gliederung ADD COLUMN summe_wahl TEXT;

ALTER TABLE angebotsposition ADD COLUMN zuschlagssatz TEXT CHECK (zuschlagssatz IS NULL OR status = 'angeboten');
`;

// --- Version 3 (Ticket 43, S3) ---------------------------------------------------------------------------------------
//
// Papierkorb und LV-Stände (ADR 0006, `vertrag` v1.2). Beide hängen am LV (Fremdschlüssel): Ein LV mit Ständen lässt
// sich nicht löschen (D-12), sein Papierkorb geht beim Löschen im ChangeSet mit (`papierkorb.entfernt`).
//
// `papierkorb_eintrag`: ein Eintrag je Löschvorgang, `nummer` ist die Reihenfolge des Hineinlegens (D-12). Die Knoten
// stehen als kanonisches JSON im Eintrag (flach, Eltern vor Kindern, mit alter Lage), nicht in `knoten`: Der Baum, seine
// Prüfungen und Summen bleiben unberührt, und ein Eintrag wird nur als Ganzes hineingelegt, wiederhergestellt oder
// entfernt.
//
// `lv_stand`: eingefrorener `LvZustand` (samt Summen und Papierkorb) als kanonisches JSON, `angelegt` ist
// `Protokolleintrag.wann` des Befehls. `seq` hält die Reihenfolge des Anlegens (ältester zuerst).
const SCHEMA_V3 = `
CREATE TABLE papierkorb_eintrag (
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  id TEXT NOT NULL,
  nummer INTEGER NOT NULL CHECK (nummer >= 1),
  knoten TEXT NOT NULL,
  PRIMARY KEY (leistungsverzeichnis_id, id),
  UNIQUE (leistungsverzeichnis_id, nummer)
) STRICT;

CREATE TABLE lv_stand (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  leistungsverzeichnis_id TEXT NOT NULL REFERENCES leistungsverzeichnis (id),
  name TEXT NOT NULL,
  angelegt TEXT NOT NULL,
  zustand TEXT NOT NULL
) STRICT;
CREATE INDEX lv_stand_lv ON lv_stand (leistungsverzeichnis_id, seq);
`;

// --- Version 4 (Ticket 57, `vertrag` v1.3) ----------------------------------------------------------------------------
//
// Die neuen optionalen Felder aus v1.3 als kanonisches JSON, `NULL` = fehlt: `auftragnehmer` und `epa_bezeichnungen` am
// Kopf von LV und Auftrags-LV (Ticket 53 Punkte 2 und 6, D-28; beide am gemeinsamen `LvInhaltKopf`), `mengenansatz` an
// der Position (Punkt 9, D-22). Nur neue Spalten; vorhandene Zeilen bleiben, wie sie sind (alle neuen Werte fehlen).
// Den Mengenansatz rechnet `speicher` nie aus (A3), er ändert keine Summe: keine Neuberechnung (D-17).
// Papierkorbeinträge und LV-Stände halten Knoten und Kopf schon als JSON; sie brauchen keine Spalte.
const SCHEMA_V4 = `
ALTER TABLE leistungsverzeichnis ADD COLUMN auftragnehmer TEXT;
ALTER TABLE leistungsverzeichnis ADD COLUMN epa_bezeichnungen TEXT;
ALTER TABLE auftrags_lv ADD COLUMN auftragnehmer TEXT;
ALTER TABLE auftrags_lv ADD COLUMN epa_bezeichnungen TEXT;
ALTER TABLE knoten ADD COLUMN mengenansatz TEXT CHECK (mengenansatz IS NULL OR art = 'position');
`;

// --- Version 5 (Ticket 79, `vertrag` v1.4) ----------------------------------------------------------------------------
//
// (1) Neue optionale Felder, `NULL` = fehlt: `kostengruppe` und `textquelle` an der Position (Text; CHECK wie
// `mengenansatz`), `nachtrag` (kanonisches JSON) und `vorlage` (nur `1`, D-70.2: `true` oder fehlt) am Kopf des
// Ausschreibungs-LV. Das Auftrags-LV trägt beide Kopffelder nie (D-42). Papierkorb und LV-Stände halten Knoten und Kopf
// schon als JSON. Keines der Felder ändert eine Summe: keine Neuberechnung (D-17).
//
// (2) Drei Aggregate (D-36 (8): ganze Aggregate im ChangeSet): Aufmaßblatt, Rechnung, Kostenermittlung. Je Tabelle die
// Kopfspalten zum Suchen, Sortieren und für Fremdschlüssel (`projekt_id`, `auftrags_lv_id`, `nummer` mit
// `UNIQUE (auftrags_lv_id, nummer)`), der Rest als kanonisches JSON (D-79.1): beim Aufmaßblatt die Zeilen
// (`positionen`, bis zu einer je Position des Auftrags-LV; `auflisten` liefert die Köpfe ohne sie zu lesen), bei der
// Kostenermittlung die Einträge, bei der Rechnung alle übrigen Angaben (`angaben`; klein, nur als Ganzes gelesen).
// Eigene Tabellen für Zeilen, Einträge oder `aufmassIds` braucht keine Abfrage: Die Bezüge (Position mit Aufmaßzeile,
// Blatt in einer Rechnung) prüft `speicher` über `json_each` nur beim Entfernen bzw. Löschen.
//
// (3) `protokoll.aggregat_art` kennt die drei neuen Arten. SQLite ändert keine CHECK-Regel: Die Tabelle wird neu angelegt
// und umkopiert wie `knoten` in Version 2; `seq` (Reihenfolge der Einträge) und der Zähler in `sqlite_sequence` bleiben,
// damit ein neuer Eintrag nie eine schon vergebene Nummer bekommt (AUTOINCREMENT). Keine Tabelle verweist auf `protokoll`.
const PROTOKOLL_V5 = `
CREATE TABLE protokoll_v5 (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  aggregat_art TEXT NOT NULL CHECK (aggregat_art IN
    ('projekt', 'leistungsverzeichnis', 'angebot', 'auftrags-leistungsverzeichnis', 'aufmass', 'rechnung',
     'kostenermittlung')),
  aggregat_id TEXT NOT NULL,
  wer TEXT NOT NULL,
  wann TEXT NOT NULL,
  befehl TEXT NOT NULL
) STRICT;

INSERT INTO protokoll_v5 (seq, id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl)
SELECT seq, id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl FROM protokoll ORDER BY seq;

INSERT INTO sqlite_sequence (name, seq)
SELECT 'protokoll_v5', seq FROM sqlite_sequence
WHERE name = 'protokoll' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'protokoll_v5');
UPDATE sqlite_sequence
SET seq = (SELECT MAX(seq) FROM sqlite_sequence WHERE name IN ('protokoll', 'protokoll_v5'))
WHERE name = 'protokoll_v5';

DROP TABLE protokoll;
ALTER TABLE protokoll_v5 RENAME TO protokoll;
CREATE INDEX protokoll_projekt ON protokoll (projekt_id, seq);
`;

const SCHEMA_V5 = `
ALTER TABLE leistungsverzeichnis ADD COLUMN nachtrag TEXT;
ALTER TABLE leistungsverzeichnis ADD COLUMN vorlage INTEGER CHECK (vorlage IS NULL OR vorlage = 1);
ALTER TABLE knoten ADD COLUMN kostengruppe TEXT CHECK (kostengruppe IS NULL OR art = 'position');
ALTER TABLE knoten ADD COLUMN textquelle TEXT CHECK (textquelle IS NULL OR art = 'position');

CREATE TABLE aufmass (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  auftrags_lv_id TEXT NOT NULL REFERENCES auftrags_lv (id),
  nummer INTEGER NOT NULL CHECK (nummer >= 1),
  bezeichnung TEXT NOT NULL,
  datum TEXT,
  positionen TEXT NOT NULL,
  UNIQUE (auftrags_lv_id, nummer)
) STRICT;

CREATE TABLE rechnung (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  auftrags_lv_id TEXT NOT NULL REFERENCES auftrags_lv (id),
  nummer INTEGER NOT NULL CHECK (nummer >= 1),
  angaben TEXT NOT NULL,
  UNIQUE (auftrags_lv_id, nummer)
) STRICT;

CREATE TABLE kostenermittlung (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  stufe TEXT NOT NULL CHECK (stufe IN
    ('kostenrahmen', 'kostenschaetzung', 'kostenberechnung', 'kostenanschlag', 'kostenfeststellung')),
  name TEXT NOT NULL,
  eintraege TEXT NOT NULL
) STRICT;
CREATE INDEX kostenermittlung_projekt ON kostenermittlung (projekt_id);
${PROTOKOLL_V5}`;

// --- Version 6 (Ticket 106, `vertrag` v1.5/v1.6) ----------------------------------------------------------------------
//
// (1) `knoten.bauteile` (Bauteilzuordnungen der Position, kanonisches JSON, `NULL` = fehlt; CHECK wie `mengenansatz`).
// Papierkorb und LV-Stände halten Knoten schon als JSON. Wirkt auf keine Summe: keine Neuberechnung (D-17).
//
// (2) Modelldateien (D-51): `modelldatei` hält die Bytes inhaltsadressiert (`hash` = SHA-256 der unkomprimierten Bytes,
// `groesse` ihre Länge, `inhalt` mit deflate-raw komprimiert), außerhalb jedes Aggregats; sie gehört dem ganzen Speicher,
// nicht einem Projekt (dieselbe Datei in zwei Projekten liegt einmal ab).
//
// (3) Bauwerksmodell (D-51, D-54): Kopf und Inhalt in getrennten Tabellen. `bauwerksmodell` hält den Kopf (klein; `auflisten`
// und Umbenennen lesen und schreiben nur ihn) samt `anzahl_bauteile` für die Übersicht, `bauwerksmodell_inhalt` Struktur und
// Bauteile als kanonisches JSON (bis 10.000 Bauteile; nach dem Anlegen unveränderlich). Fremdschlüssel auf die Modelldatei
// (keine Bytes werden freigegeben, die ein Modell nennt) und auf den Vorgänger.
//
// (4) Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag: ganze Aggregate im ChangeSet (D-57) wie Aufmaßblatt und
// Rechnung in Version 5 (D-79.1): Kopfspalten zum Suchen, Sortieren und für Fremdschlüssel, der Rest als kanonisches JSON.
// `mangel` trägt `auftrags_lv_id` und `bauwerksmodell_id` (aus `bauteil`) als Spalten mit Fremdschlüssel und Index, damit das
// Löschen eines Auftrags-LV oder Modells die Verweise ohne `json_each` findet; `UNIQUE (projekt_id, nummer)` bzw.
// `UNIQUE (projekt_id, datum)` hält Nummer und Datum je Projekt eindeutig (`konflikt` prüft `speicher` vorher selbst).
//
// (5) `protokoll.aggregat_art` kennt die fünf neuen Arten: neu anlegen und umkopieren wie in Version 5; `seq` und Zähler
// bleiben.
const PROTOKOLL_V6 = `
CREATE TABLE protokoll_v6 (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  aggregat_art TEXT NOT NULL CHECK (aggregat_art IN
    ('projekt', 'leistungsverzeichnis', 'angebot', 'auftrags-leistungsverzeichnis', 'aufmass', 'rechnung',
     'kostenermittlung', 'bauwerksmodell', 'bauzeitenplan', 'honorarberechnung', 'mangel', 'bautagebucheintrag')),
  aggregat_id TEXT NOT NULL,
  wer TEXT NOT NULL,
  wann TEXT NOT NULL,
  befehl TEXT NOT NULL
) STRICT;

INSERT INTO protokoll_v6 (seq, id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl)
SELECT seq, id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl FROM protokoll ORDER BY seq;

INSERT INTO sqlite_sequence (name, seq)
SELECT 'protokoll_v6', seq FROM sqlite_sequence
WHERE name = 'protokoll' AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'protokoll_v6');
UPDATE sqlite_sequence
SET seq = (SELECT MAX(seq) FROM sqlite_sequence WHERE name IN ('protokoll', 'protokoll_v6'))
WHERE name = 'protokoll_v6';

DROP TABLE protokoll;
ALTER TABLE protokoll_v6 RENAME TO protokoll;
CREATE INDEX protokoll_projekt ON protokoll (projekt_id, seq);
`;

const SCHEMA_V6 = `
ALTER TABLE knoten ADD COLUMN bauteile TEXT CHECK (bauteile IS NULL OR art = 'position');

CREATE TABLE modelldatei (
  hash TEXT NOT NULL PRIMARY KEY CHECK (length(hash) = 64),
  groesse INTEGER NOT NULL CHECK (groesse >= 0),
  inhalt BLOB NOT NULL
) STRICT;

CREATE TABLE bauwerksmodell (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  name TEXT NOT NULL,
  datei_hash TEXT NOT NULL REFERENCES modelldatei (hash),
  datei_name TEXT NOT NULL,
  datei_groesse INTEGER NOT NULL CHECK (datei_groesse >= 0),
  schema TEXT NOT NULL CHECK (schema IN ('IFC2X3', 'IFC4')),
  vorgaenger_id TEXT REFERENCES bauwerksmodell (id),
  eingelesen TEXT NOT NULL,
  anzahl_bauteile INTEGER NOT NULL CHECK (anzahl_bauteile >= 0)
) STRICT;
CREATE INDEX bauwerksmodell_projekt ON bauwerksmodell (projekt_id);
CREATE INDEX bauwerksmodell_datei ON bauwerksmodell (datei_hash);
CREATE INDEX bauwerksmodell_vorgaenger ON bauwerksmodell (vorgaenger_id);

CREATE TABLE bauwerksmodell_inhalt (
  bauwerksmodell_id TEXT NOT NULL PRIMARY KEY REFERENCES bauwerksmodell (id),
  struktur TEXT NOT NULL,
  bauteile TEXT NOT NULL
) STRICT;

CREATE TABLE bauzeitenplan (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  name TEXT NOT NULL,
  projektbeginn TEXT NOT NULL,
  kalender TEXT NOT NULL,
  vorgaenge TEXT NOT NULL
) STRICT;
CREATE INDEX bauzeitenplan_projekt ON bauzeitenplan (projekt_id);

CREATE TABLE honorarberechnung (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  name TEXT NOT NULL,
  nebenkosten TEXT,
  mwst_satz TEXT NOT NULL,
  objekte TEXT NOT NULL
) STRICT;
CREATE INDEX honorarberechnung_projekt ON honorarberechnung (projekt_id);

CREATE TABLE mangel (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  nummer INTEGER NOT NULL CHECK (nummer >= 1),
  auftrags_lv_id TEXT REFERENCES auftrags_lv (id),
  bauwerksmodell_id TEXT REFERENCES bauwerksmodell (id),
  angaben TEXT NOT NULL,
  UNIQUE (projekt_id, nummer)
) STRICT;
CREATE INDEX mangel_auftrags_lv ON mangel (auftrags_lv_id);
CREATE INDEX mangel_bauwerksmodell ON mangel (bauwerksmodell_id);

CREATE TABLE bautagebucheintrag (
  id TEXT NOT NULL PRIMARY KEY,
  projekt_id TEXT NOT NULL REFERENCES projekt (id),
  datum TEXT NOT NULL,
  angaben TEXT NOT NULL,
  UNIQUE (projekt_id, datum)
) STRICT;
${PROTOKOLL_V6}`;

// --- Version 7 (Ticket 139, `vertrag` v1.7a) --------------------------------------------------------------------------
//
// (1) Neue optionale Felder als kanonisches JSON, `NULL` = fehlt (wie in Version 4 bis 6): `angaben` an Projekt (E10,
// `Projektangaben`) und Bieter (`Bieterangaben`), `preisspiegel` am Kopf des Ausschreibungs-LV (E15; das Auftrags-LV trägt es
// nie, D-127.7), `kalkulation` an der Position (E9; CHECK wie `mengenansatz`). Papierkorb und LV-Stände halten Knoten und Kopf
// schon als JSON. Keines der Felder ändert eine Summe: keine Neuberechnung (D-17).
//
// (2) Die Einstellungen des Geräts (E15, D-73): ein globales Aggregat ohne Kennung und ohne Projekt, außerhalb des Protokolls.
// Eine Zeile (`id = 1`), der ganze Wert als kanonisches JSON: Das ChangeSet trägt die Einstellungen immer ganz (vorher,
// nachher), gelesen und geschrieben werden sie nur als Ganzes, und sie sind klein. Ein neues optionales Feld der Einstellungen
// braucht so keine Migration. Fehlt die Zeile, gelten `LEERE_EINSTELLUNGEN`.
//
// (3) Das Einstellungsprotokoll (Review D-82 M1: A5 und ADR 0009 ohne Ausnahme): je Befehl an den Einstellungen ein Eintrag,
// geschrieben mit dem ChangeSet in einer Transaktion, ohne Projekt und ohne Aggregat (es gibt nur eines). `seq` hält die
// Reihenfolge des Schreibens wie beim Befehlsprotokoll; der Befehl steht als kanonisches JSON.
//
// (4) Keine neue Aggregatart: `LvStandUmbenennen` und `LvStandLoeschen` stehen mit ihrem LV im Protokoll (D-127.1), die Befehle
// an den Einstellungen in ihrem eigenen; `protokoll.aggregat_art` bleibt, wie es ist.
const SCHEMA_V7 = `
ALTER TABLE projekt ADD COLUMN angaben TEXT;
ALTER TABLE bieter ADD COLUMN angaben TEXT;
ALTER TABLE leistungsverzeichnis ADD COLUMN preisspiegel TEXT;
ALTER TABLE knoten ADD COLUMN kalkulation TEXT CHECK (kalkulation IS NULL OR art = 'position');

CREATE TABLE einstellungen (
  id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
  inhalt TEXT NOT NULL
) STRICT;

CREATE TABLE einstellungen_protokoll (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  wer TEXT NOT NULL,
  wann TEXT NOT NULL,
  befehl TEXT NOT NULL
) STRICT;
`;

export const MIGRATIONEN: readonly Migration[] = [
  {
    version: 1,
    name: 'Grundschema',
    hoch: (db) => {
      db.skript(SCHEMA_V1);
    },
    datei: null,
  },
  {
    version: 2,
    name: 'Inhaltsmodell v1.1b/v1.2: Merkmale, Zuschlag, Leitbeschreibung, Kopfdaten, Ausweise, Zuschlagssatz',
    hoch: (db) => {
      db.skript(SCHEMA_V2);
    },
    datei: dateiAuf2,
    // Version 1 kannte weder Bedarfs- und Wahlsumme noch Pauschal ohne Menge (D-37.1, Review C1).
    summenNeuRechnen: true,
  },
  {
    version: 3,
    name: 'Papierkorb und LV-Stände',
    hoch: (db) => {
      db.skript(SCHEMA_V3);
    },
    datei: dateiAuf3,
  },
  {
    version: 4,
    name: 'Vertrag v1.3: Auftragnehmer, EPA-Bezeichnungen, Mengenansatz',
    hoch: (db) => {
      db.skript(SCHEMA_V4);
    },
    datei: dateiAuf4,
  },
  {
    version: 5,
    name: 'Vertrag v1.4: Nachtrag, Vorlage, Kostengruppe, Textquelle, Aufmaßblatt, Rechnung, Kostenermittlung',
    hoch: (db) => {
      db.skript(SCHEMA_V5);
    },
    datei: dateiAuf5,
  },
  {
    version: 6,
    name: 'Vertrag v1.6: Bauteilzuordnung, Modelldatei, Bauwerksmodell, Bauzeitenplan, Honorarberechnung, Mangel, Bautagebuch',
    hoch: (db) => {
      db.skript(SCHEMA_V6);
    },
    datei: dateiAuf6,
  },
  {
    version: 7,
    name: 'Vertrag v1.7a: Projekt- und Bieterangaben, Preisspiegel, Kalkulation, Einstellungen und ihr Protokoll',
    hoch: (db) => {
      db.skript(SCHEMA_V7);
    },
    datei: dateiAuf7,
  },
];

/** Aktuelle Schemaversion: die der letzten Migration. */
export const SCHEMA_VERSION: number = MIGRATIONEN[MIGRATIONEN.length - 1]?.version ?? 0;

export function aktuelleVersion(db: Datenbank): number {
  const zeile = db.zeilen('PRAGMA user_version')[0];
  const v = zeile?.['user_version'];
  return typeof v === 'number' ? v : 0;
}

/**
 * Wendet alle noch fehlenden Migrationen an, jede in einer eigenen Transaktion. Befunde der Summen-Neuberechnung
 * (D-17) landen in `befunde`; sie brechen nichts ab.
 */
export function migriere(
  db: Datenbank,
  migrationen: readonly Migration[] = MIGRATIONEN,
  befunde: Migrationsbefund[] = [],
): Ergebnis<number, Speicherfehler> {
  const ziel = migrationen[migrationen.length - 1]?.version ?? 0;
  const start = aktuelleVersion(db);
  if (start > ziel) {
    return fehler(
      'schema-zu-neu',
      `Die Datenbank hat Schemaversion ${String(start)}, diese Version kennt höchstens ${String(ziel)}.`,
    );
  }
  for (const m of migrationen) {
    if (m.version <= start) continue;
    try {
      db.ausfuehren('BEGIN IMMEDIATE');
      try {
        m.hoch(db);
        const neu = m.summenNeuRechnen === true ? summenDerDatenbankNeuRechnen(db) : [];
        db.skript(`PRAGMA user_version = ${String(m.version)}`);
        db.ausfuehren('COMMIT');
        befunde.push(...neu);
      } catch (e) {
        try {
          db.ausfuehren('ROLLBACK');
        } catch {
          // Der Erstfehler bleibt maßgeblich.
        }
        throw e;
      }
    } catch (e) {
      const ursache = fehlerAusAusnahme(e);
      return fehler(
        'migration-fehlgeschlagen',
        `Migration ${String(m.version)} (${m.name}) fehlgeschlagen: ${ursache.meldung}`,
      );
    }
  }
  return ok(ziel);
}
