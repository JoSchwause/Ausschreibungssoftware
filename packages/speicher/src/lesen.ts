// SPDX-License-Identifier: AGPL-3.0-or-later
// Lesende Seite der Repositories. Hier steht kein schreibender SQL-Befehl (A5). Die Reihenfolge aller
// Ergebnisse ist kanonisch: Knoten in Tiefensuche-Reihenfolge (Eltern vor Kindern, Geschwister nach
// `reihenfolge`), Summen und Angebotspositionen nach Kennung, Protokoll nach Eintragsreihenfolge.

import type {
  Bautagebucheintrag,
  Bauwerksmodell,
  BauwerksmodellUebersicht,
  Bauzeitenplan,
  BauzeitenplanKopf,
  Honorarberechnung,
  HonorarberechnungUebersicht,
  Mangel,
  Angebot,
  Angebotsposition,
  AngebotId,
  AngebotKopf,
  AngebotZustand,
  Aufmass,
  AufmassKopf,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvKopf,
  AuftragsLvUebersicht,
  AuftragsLvZustand,
  Bieter,
  Bieterangaben,
  Betrag,
  Gliederungssumme,
  Knoten,
  Kostenermittlung,
  KostenermittlungUebersicht,
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  LvKopf,
  LvStand,
  LvStandId,
  LvStandUebersicht,
  LvUebersicht,
  LvZustand,
  Papierkorbeintrag,
  PapierkorbeintragId,
  PositionId,
  Positionssumme,
  Projekt,
  Projektangaben,
  ProjektId,
  Protokolleintrag,
  Rechnung,
  Summenstand,
  Zeitstempel,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import type { Datenbank, SqlZeile } from './sql';
import {
  angebotspositionAusZeile,
  aufmassAusZeile,
  aufmasskopfAusZeile,
  bautagebucheintragAusZeile,
  bauwerksmodellAusZeilen,
  bauwerksmodellUebersichtAusZeile,
  bauzeitenplanAusZeile,
  bauzeitenplanKopfAusZeile,
  honorarberechnungAusZeile,
  honorarberechnungUebersichtAusZeile,
  mangelAusZeile,
  kostenermittlungAusZeile,
  kostenermittlungUebersichtAusZeile,
  rechnungAusZeile,
  ausweisAusZeile,
  bieterId,
  ganzzahl,
  gesamtAusZeile,
  gliederungId,
  jsonSpalte,
  knotenAusZeile,
  kopfdatenAusZeile,
  lvId,
  lvKennzeichenAusZeile,
  lvPreisspiegelAusZeile,
  angabenAusZeile,
  maskeAusZeile,
  nachlassAusZeile,
  projektId,
  text,
  textOderNull,
} from './zeilen';

export function leseProjekt(db: Datenbank, id: ProjektId): Projekt | null {
  const kopf = db.zeilen('SELECT * FROM projekt WHERE id = ?', [id])[0];
  if (kopf === undefined) return null;
  const bieter = db
    .zeilen('SELECT * FROM bieter WHERE projekt_id = ? ORDER BY reihenfolge, id', [id])
    .map((z): Bieter => ({
      id: bieterId(z, 'id'),
      name: text(z, 'name'),
      ...angabenAusZeile<Bieterangaben>(z), // Schema 7 (v1.7a)
    }));
  return {
    id,
    name: text(kopf, 'name'),
    bauherr: { name: text(kopf, 'bauherr_name'), anschrift: textOderNull(kopf, 'bauherr_anschrift') },
    bieter,
    ...angabenAusZeile<Projektangaben>(kopf), // Schema 7 (v1.7a)
  };
}

/** Deutscher Namensvergleich für die Projektliste (Umlaute beim Grundbuchstaben, Groß/klein nachrangig). */
const NAMENSVERGLEICH = new Intl.Collator('de-DE');

/**
 * Projektliste nach Name, deutsch verglichen (`Intl.Collator('de-DE')`; SQLite sortiert nur nach Bytes); gleiche Namen
 * nach Kennung, damit die Reihenfolge stabil ist (Ticket 38, Punkt 6).
 */
export function listeProjekte(db: Datenbank): { id: ProjektId; name: string }[] {
  return db
    .zeilen('SELECT id, name FROM projekt ORDER BY id')
    .map((z) => ({ id: projektId(z, 'id'), name: text(z, 'name') }))
    .sort((a, b) => NAMENSVERGLEICH.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Nach Name deutsch verglichen, gleiche Namen nach Kennung (Projekt-, LV-, Auftrags-LV- und Kostenermittlungsliste). */
const nachName = <T extends { readonly id: string; readonly name: string }>(a: T, b: T): number =>
  NAMENSVERGLEICH.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * LV-Liste eines Projekts (`LvRepository.auflisten`, v1.3): sortiert wie die Projektliste. v1.4 (D-43): dazu
 * `nachtrag` und `vorlage` aus dem Kopf (fehlt = nein). v1.5 (D-95.5, Ticket 106): dazu `nettoNachNachlass` aus der
 * gespeicherten Zeile in `summe_gesamt`, nie gerechnet; ohne Zeile fehlt das Feld (nie `null`).
 */
export function listeLvs(db: Datenbank, projekt: ProjektId): LvUebersicht[] {
  return (
    db
      // `l.*` statt der Spaltennamen: liest auch eine Datenbank vor Schema 5 (Migrationstests), die Köpfe sind klein.
      .zeilen(
        `SELECT l.*, s.netto_nach_nachlass AS uebersicht_netto_nach_nachlass FROM leistungsverzeichnis l
         LEFT JOIN summe_gesamt s ON s.aggregat_id = l.id WHERE l.projekt_id = ? ORDER BY l.id`,
        [projekt],
      )
      .map((z): LvUebersicht => {
        const netto = textOderNull(z, 'uebersicht_netto_nach_nachlass') as Betrag | null;
        return {
          id: lvId(z, 'id'),
          name: text(z, 'name'),
          ...lvKennzeichenAusZeile(z),
          ...(netto === null ? {} : { nettoNachNachlass: netto }),
        };
      })
      .sort(nachName)
  );
}

/** Auftrags-LV-Liste eines Projekts (`AuftragsLvRepository.auflisten`, v1.4): ohne Knoten, sortiert wie die LV-Liste. */
export function listeAuftragsLvs(db: Datenbank, projekt: ProjektId): AuftragsLvUebersicht[] {
  return db
    .zeilen(
      'SELECT id, name, leistungsverzeichnis_id, angebot_id FROM auftrags_lv WHERE projekt_id = ? ORDER BY id',
      [projekt],
    )
    .map((z) => ({
      id: text(z, 'id') as AuftragsLeistungsverzeichnisId,
      name: text(z, 'name'),
      leistungsverzeichnisId: lvId(z, 'leistungsverzeichnis_id'),
      angebotId: text(z, 'angebot_id') as AngebotId,
    }))
    .sort(nachName);
}

export function listeIds(db: Datenbank, sql: string, bind: readonly string[]): string[] {
  return db.zeilen(sql, bind).map((z) => text(z, 'id'));
}

// --- LV ------------------------------------------------------------------------------------------------------

export function leseLvKopf(db: Datenbank, id: LeistungsverzeichnisId): LvKopf | null {
  const z = db.zeilen('SELECT * FROM leistungsverzeichnis WHERE id = ?', [id])[0];
  if (z === undefined) return null;
  return {
    id,
    projektId: projektId(z),
    name: text(z, 'name'),
    ozMaske: maskeAusZeile(z),
    mwstSatz: text(z, 'mwst_satz') as LvKopf['mwstSatz'],
    nachlass: nachlassAusZeile(z),
    ...kopfdatenAusZeile(z),
    ...lvKennzeichenAusZeile(z),
    ...lvPreisspiegelAusZeile(z), // Schema 7 (v1.7a)
  };
}

/** Knoten eines Aggregats in kanonischer Reihenfolge. Verwaiste Knoten sind ein Fehler, kein stiller Verlust. */
export function leseKnoten(db: Datenbank, aggregatId: string): Knoten[] {
  const alle = db.zeilen('SELECT * FROM knoten WHERE aggregat_id = ?', [aggregatId]).map(knotenAusZeile);
  const kinder = new Map<string, Knoten[]>();
  for (const k of alle) {
    const liste = kinder.get(k.elternId);
    if (liste === undefined) kinder.set(k.elternId, [k]);
    else liste.push(k);
  }
  for (const liste of kinder.values()) {
    liste.sort((a, b) => a.reihenfolge - b.reihenfolge || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  const ergebnis: Knoten[] = [];
  const stapel: Knoten[] = [...(kinder.get(aggregatId) ?? [])].reverse();
  for (let k = stapel.pop(); k !== undefined; k = stapel.pop()) {
    ergebnis.push(k);
    const unter = kinder.get(k.id);
    if (unter !== undefined) for (let i = unter.length - 1; i >= 0; i--) stapel.push(unter[i] as Knoten);
  }
  if (ergebnis.length !== alle.length) {
    return abbruch('datei-ungueltig', `Aggregat ${aggregatId}: Die Datenbank enthält verwaiste Knoten.`);
  }
  return ergebnis;
}

export function leseKnoten1(db: Datenbank, aggregatId: string, id: string): Knoten | null {
  const z = db.zeilen('SELECT * FROM knoten WHERE aggregat_id = ? AND id = ?', [aggregatId, id])[0];
  return z === undefined ? null : knotenAusZeile(z);
}

export const positionssummeAusZeile = (z: SqlZeile): Positionssumme => ({
  positionId: text(z, 'position_id') as PositionId,
  gesamtpreis: textOderNull(z, 'gesamtpreis') as Betrag | null,
  gehtInSummeEin: z['geht_in_summe'] === 1,
});

export const gliederungssummeAusZeile = (z: SqlZeile): Gliederungssumme => ({
  gliederungId: gliederungId(z, 'gliederung_id'),
  summe: text(z, 'summe') as Betrag,
  ...ausweisAusZeile(z),
});

export function leseSummen(db: Datenbank, aggregatId: string): Summenstand | null {
  const gesamt = db.zeilen('SELECT * FROM summe_gesamt WHERE aggregat_id = ?', [aggregatId])[0];
  if (gesamt === undefined) return null;
  return {
    positionen: db
      .zeilen('SELECT * FROM summe_position WHERE aggregat_id = ? ORDER BY position_id', [aggregatId])
      .map(positionssummeAusZeile),
    gliederungen: db
      .zeilen('SELECT * FROM summe_gliederung WHERE aggregat_id = ? ORDER BY gliederung_id', [aggregatId])
      .map(gliederungssummeAusZeile),
    gesamt: gesamtAusZeile(gesamt),
  };
}

export function leseLv(db: Datenbank, id: LeistungsverzeichnisId): LvZustand | null {
  const kopf = leseLvKopf(db, id);
  if (kopf === null) return null;
  const summen = leseSummen(db, id);
  if (summen === null) {
    return abbruch('datei-ungueltig', `LV ${id}: Es fehlen die gespeicherten Gesamtsummen.`);
  }
  const lv: Leistungsverzeichnis = { ...kopf, knoten: leseKnoten(db, id) };
  const papierkorb = lesePapierkorb(db, id);
  return {
    leistungsverzeichnis: lv,
    summen: inKnotenreihenfolge(summen, lv.knoten),
    // Fehlt: leer (Vertrag). Ein leerer Papierkorb steht deshalb nie im Zustand, auch nicht in der Projektdatei.
    ...(papierkorb.length > 0 ? { papierkorb } : {}),
  };
}

// --- Papierkorb und LV-Stände (Schema 3, Ticket 43) ------------------------------------------------------------------

function papierkorbeintragAusZeile(z: SqlZeile): Papierkorbeintrag {
  return {
    id: text(z, 'id') as PapierkorbeintragId,
    nummer: ganzzahl(z, 'nummer'),
    knoten: jsonSpalte(z, 'knoten') as Knoten[],
  };
}

/** Der Papierkorb eines LV nach `nummer` (Reihenfolge des Hineinlegens, D-12). */
export function lesePapierkorb(db: Datenbank, lvId: string): Papierkorbeintrag[] {
  return db
    .zeilen('SELECT * FROM papierkorb_eintrag WHERE leistungsverzeichnis_id = ? ORDER BY nummer', [lvId])
    .map(papierkorbeintragAusZeile);
}

export function lesePapierkorbeintrag(db: Datenbank, lvId: string, id: string): Papierkorbeintrag | null {
  const z = db.zeilen('SELECT * FROM papierkorb_eintrag WHERE leistungsverzeichnis_id = ? AND id = ?', [
    lvId,
    id,
  ])[0];
  return z === undefined ? null : papierkorbeintragAusZeile(z);
}

function lvStandUebersichtAusZeile(z: SqlZeile): LvStandUebersicht {
  return {
    id: text(z, 'id') as LvStandId,
    leistungsverzeichnisId: lvId(z, 'leistungsverzeichnis_id'),
    name: text(z, 'name'),
    angelegt: text(z, 'angelegt') as Zeitstempel,
  };
}

/**
 * Die LV-Stände eines LV ohne Zustand, in der Reihenfolge des Anlegens (ältester zuerst): nach `angelegt`, bei gleichem
 * Zeitpunkt nach der Reihenfolge des Schreibens (D-82 S1). So steht ein wiederhergestellter Stand wieder an seinem Platz.
 */
export function leseLvStaende(db: Datenbank, lv: string): LvStandUebersicht[] {
  return db
    .zeilen(
      `SELECT id, leistungsverzeichnis_id, name, angelegt FROM lv_stand WHERE leistungsverzeichnis_id = ?
       ORDER BY angelegt, seq`,
      [lv],
    )
    .map(lvStandUebersichtAusZeile);
}

export function leseLvStand(db: Datenbank, id: string): LvStand | null {
  const z = db.zeilen('SELECT * FROM lv_stand WHERE id = ?', [id])[0];
  return z === undefined
    ? null
    : { ...lvStandUebersichtAusZeile(z), zustand: jsonSpalte(z, 'zustand') as LvZustand };
}

/** Alle LV-Stände eines Projekts mit Zustand, nach LV-Kennung und dann in der Reihenfolge des Anlegens (Projektdatei, S1). */
export function leseLvStaendeDesProjekts(db: Datenbank, projektId: ProjektId): LvStand[] {
  return db
    .zeilen(
      `SELECT s.* FROM lv_stand s JOIN leistungsverzeichnis l ON l.id = s.leistungsverzeichnis_id
       WHERE l.projekt_id = ? ORDER BY s.leistungsverzeichnis_id, s.angelegt, s.seq`,
      [projektId],
    )
    .map((z) => ({ ...lvStandUebersichtAusZeile(z), zustand: jsonSpalte(z, 'zustand') as LvZustand }));
}

/**
 * Bringt die Summenlisten in die Reihenfolge des Knotenarrays, wie `kern` sie definiert (`summenBerechnen`:
 * Positionen in der Reihenfolge der Positionsknoten, Gliederungen in der der Gliederungsknoten). Die Tabellen
 * liefern sie nach Kennung; so ist ein geladener Stand gleich dem frisch berechneten. Einträge ohne Knoten
 * (kommt bei einem gültigen Stand nicht vor) bleiben hinten, nach Kennung geordnet.
 */
function inKnotenreihenfolge(summen: Summenstand, knoten: readonly Knoten[]): Summenstand {
  const platz = new Map<string, number>();
  knoten.forEach((k, i) => platz.set(k.id, i));
  const nach = <T>(liste: readonly T[], idVon: (e: T) => string): T[] =>
    [...liste].sort((a, b) => (platz.get(idVon(a)) ?? Infinity) - (platz.get(idVon(b)) ?? Infinity));
  return {
    positionen: nach(summen.positionen, (e) => e.positionId),
    gliederungen: nach(summen.gliederungen, (e) => e.gliederungId),
    gesamt: summen.gesamt,
  };
}

// --- Angebot -------------------------------------------------------------------------------------------------

export function leseAngebotKopf(db: Datenbank, id: AngebotId): AngebotKopf | null {
  const z = db.zeilen('SELECT * FROM angebot WHERE id = ?', [id])[0];
  if (z === undefined) return null;
  return {
    id,
    projektId: projektId(z),
    leistungsverzeichnisId: lvId(z, 'leistungsverzeichnis_id'),
    bieterId: bieterId(z, 'bieter_id'),
    nachlass: nachlassAusZeile(z),
  };
}

export function leseAngebotposition(
  db: Datenbank,
  angebotId: AngebotId,
  positionId: string,
): Angebotsposition | null {
  const z = db.zeilen('SELECT * FROM angebotsposition WHERE angebot_id = ? AND position_id = ?', [
    angebotId,
    positionId,
  ])[0];
  return z === undefined ? null : angebotspositionAusZeile(z);
}

export function leseAngebot(db: Datenbank, id: AngebotId): AngebotZustand | null {
  const kopf = leseAngebotKopf(db, id);
  if (kopf === null) return null;
  const summen = leseSummen(db, id);
  if (summen === null) {
    return abbruch('datei-ungueltig', `Angebot ${id}: Es fehlen die gespeicherten Gesamtsummen.`);
  }
  const positionen = db
    .zeilen('SELECT * FROM angebotsposition WHERE angebot_id = ? ORDER BY position_id', [id])
    .map(angebotspositionAusZeile);
  const angebot: Angebot = { ...kopf, positionen };
  return { angebot, summen };
}

// --- Auftrags-LV (v1.4: `AuftragsLvRepository`, Ticket 79; vorher nur über die Projektdatei, D-64.2) ---------------

export function leseAuftragsLvKopf(db: Datenbank, id: AuftragsLeistungsverzeichnisId): AuftragsLvKopf | null {
  const z = db.zeilen('SELECT * FROM auftrags_lv WHERE id = ?', [id])[0];
  if (z === undefined) return null;
  return {
    id,
    projektId: projektId(z),
    leistungsverzeichnisId: lvId(z, 'leistungsverzeichnis_id'),
    angebotId: text(z, 'angebot_id') as AngebotId,
    name: text(z, 'name'),
    ozMaske: maskeAusZeile(z),
    mwstSatz: text(z, 'mwst_satz') as AuftragsLvKopf['mwstSatz'],
    nachlass: nachlassAusZeile(z),
    ...kopfdatenAusZeile(z),
  };
}

export function leseAuftragsLv(db: Datenbank, id: AuftragsLeistungsverzeichnisId): AuftragsLvZustand | null {
  const kopf = leseAuftragsLvKopf(db, id);
  if (kopf === null) return null;
  const summen = leseSummen(db, id);
  if (summen === null) {
    return abbruch('datei-ungueltig', `Auftrags-LV ${id}: Es fehlen die gespeicherten Gesamtsummen.`);
  }
  const lv: AuftragsLeistungsverzeichnis = { ...kopf, knoten: leseKnoten(db, id) };
  return { auftragsLeistungsverzeichnis: lv, summen: inKnotenreihenfolge(summen, lv.knoten) };
}

// --- Aufmaßblatt, Rechnung, Kostenermittlung (Schema 5, v1.4) ----------------------------------------------------------

export function leseAufmass(db: Datenbank, id: string): Aufmass | null {
  const z = db.zeilen('SELECT * FROM aufmass WHERE id = ?', [id])[0];
  return z === undefined ? null : aufmassAusZeile(z);
}

/** Ein gespeichertes Blatt mit seinen Zeilen als gespeicherter kanonischer Text (`kanonischKompakt`), nicht geparst. */
export interface AufmassText {
  readonly kopf: AufmassKopf;
  readonly positionen: string;
}

/** Das Blatt für den Vergleich mit `vorher` (Ticket 94): Die Zeilen bleiben Text, geparst wird nichts. */
export function leseAufmassText(db: Datenbank, id: string): AufmassText | null {
  const z = db.zeilen('SELECT * FROM aufmass WHERE id = ?', [id])[0];
  return z === undefined ? null : { kopf: aufmasskopfAusZeile(z), positionen: text(z, 'positionen') };
}

/** Die Köpfe der Blätter eines Auftrags-LV nach Blattnummer (`AufmassRepository.auflisten`), ohne die Zeilen zu lesen. */
export function listeAufmasse(db: Datenbank, auftragsLvId: string): AufmassKopf[] {
  return db
    .zeilen(
      `SELECT id, projekt_id, auftrags_lv_id, nummer, bezeichnung, datum FROM aufmass
       WHERE auftrags_lv_id = ? ORDER BY nummer`,
      [auftragsLvId],
    )
    .map(aufmasskopfAusZeile);
}

export function leseRechnung(db: Datenbank, id: string): Rechnung | null {
  const z = db.zeilen('SELECT * FROM rechnung WHERE id = ?', [id])[0];
  return z === undefined ? null : rechnungAusZeile(z);
}

/** Die Rechnungen eines Auftrags-LV, ganz, nach Nummer (`RechnungRepository.auflisten`). */
export function leseRechnungen(db: Datenbank, auftragsLvId: string): Rechnung[] {
  return db
    .zeilen('SELECT * FROM rechnung WHERE auftrags_lv_id = ? ORDER BY nummer', [auftragsLvId])
    .map(rechnungAusZeile);
}

export function leseKostenermittlung(db: Datenbank, id: string): Kostenermittlung | null {
  const z = db.zeilen('SELECT * FROM kostenermittlung WHERE id = ?', [id])[0];
  return z === undefined ? null : kostenermittlungAusZeile(z);
}

/** Die Kostenermittlungen eines Projekts ohne Einträge, sortiert wie die LV-Liste. */
export function listeKostenermittlungen(db: Datenbank, projekt: ProjektId): KostenermittlungUebersicht[] {
  return db
    .zeilen('SELECT id, projekt_id, stufe, name FROM kostenermittlung WHERE projekt_id = ? ORDER BY id', [
      projekt,
    ])
    .map(kostenermittlungUebersichtAusZeile)
    .sort(nachName);
}

/** Alle Aufmaßblätter, Rechnungen bzw. Kostenermittlungen eines Projekts nach Kennung (Projektdatei). */
export function aggregateDesProjekts(db: Datenbank, projekt: ProjektId) {
  const alle = (tabelle: string): SqlZeile[] =>
    db.zeilen(`SELECT * FROM ${tabelle} WHERE projekt_id = ? ORDER BY id`, [projekt]);
  return {
    aufmasse: alle('aufmass').map(aufmassAusZeile),
    rechnungen: alle('rechnung').map(rechnungAusZeile),
    kostenermittlungen: alle('kostenermittlung').map(kostenermittlungAusZeile),
  };
}

// --- Bauwerksmodell (Schema 6, v1.6; D-51, D-54) -----------------------------------------------------------------------

/** Kopf eines Bauwerksmodells und die Zahl seiner Bauteile (`BauwerksmodellUebersicht`), ohne den Inhalt zu lesen. */
export function leseBauwerksmodellKopf(db: Datenbank, id: string): BauwerksmodellUebersicht | null {
  const z = db.zeilen('SELECT * FROM bauwerksmodell WHERE id = ?', [id])[0];
  return z === undefined ? null : bauwerksmodellUebersichtAusZeile(z);
}

export function leseBauwerksmodell(db: Datenbank, id: string): Bauwerksmodell | null {
  const z = db.zeilen('SELECT * FROM bauwerksmodell WHERE id = ?', [id])[0];
  if (z === undefined) return null;
  const inhalt = db.zeilen('SELECT * FROM bauwerksmodell_inhalt WHERE bauwerksmodell_id = ?', [id])[0];
  if (inhalt === undefined)
    return abbruch('datei-ungueltig', `Bauwerksmodell ${id}: Struktur und Bauteile fehlen in der Datenbank.`);
  return bauwerksmodellAusZeilen(z, inhalt);
}

/** Die Modelle eines Projekts als Übersicht (Kopf und Zahl der Bauteile), sortiert wie die LV-Liste; ohne den Inhalt. */
export function listeBauwerksmodelle(db: Datenbank, projekt: ProjektId): BauwerksmodellUebersicht[] {
  return db
    .zeilen('SELECT * FROM bauwerksmodell WHERE projekt_id = ? ORDER BY id', [projekt])
    .map(bauwerksmodellUebersichtAusZeile)
    .sort(nachName);
}

// --- Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag (Schema 6, v1.6; D-57) -----------------------------------

const eine = <T>(db: Datenbank, tabelle: string, id: string, aus: (z: SqlZeile) => T): T | null => {
  const z = db.zeilen(`SELECT * FROM ${tabelle} WHERE id = ?`, [id])[0];
  return z === undefined ? null : aus(z);
};

export const leseBauzeitenplan = (db: Datenbank, id: string): Bauzeitenplan | null =>
  eine(db, 'bauzeitenplan', id, bauzeitenplanAusZeile);

/** Ein gespeicherter Plan mit seinen Vorgängen als gespeicherter kanonischer Text, nicht geparst (wie `AufmassText`). */
export interface BauzeitenplanText {
  readonly kopf: BauzeitenplanKopf;
  readonly vorgaenge: string;
}

export const leseBauzeitenplanText = (db: Datenbank, id: string): BauzeitenplanText | null =>
  eine(db, 'bauzeitenplan', id, (z) => ({
    kopf: bauzeitenplanKopfAusZeile(z),
    vorgaenge: text(z, 'vorgaenge'),
  }));

/** Die Pläne eines Projekts ohne Vorgänge, sortiert wie die LV-Liste. */
export function listeBauzeitenplaene(db: Datenbank, projekt: ProjektId): BauzeitenplanKopf[] {
  return db
    .zeilen(
      'SELECT id, projekt_id, name, projektbeginn, kalender FROM bauzeitenplan WHERE projekt_id = ? ORDER BY id',
      [projekt],
    )
    .map(bauzeitenplanKopfAusZeile)
    .sort(nachName);
}

export const leseHonorarberechnung = (db: Datenbank, id: string): Honorarberechnung | null =>
  eine(db, 'honorarberechnung', id, honorarberechnungAusZeile);

/** Die Honorarberechnungen eines Projekts ohne Objekte, sortiert wie die LV-Liste. */
export function listeHonorarberechnungen(db: Datenbank, projekt: ProjektId): HonorarberechnungUebersicht[] {
  return db
    .zeilen(
      'SELECT id, projekt_id, name, nebenkosten, mwst_satz FROM honorarberechnung WHERE projekt_id = ? ORDER BY id',
      [projekt],
    )
    .map(honorarberechnungUebersichtAusZeile)
    .sort(nachName);
}

export const leseMangel = (db: Datenbank, id: string): Mangel | null =>
  eine(db, 'mangel', id, mangelAusZeile);

/** Die Mängel eines Projekts, ganz, nach Nummer (`MangelRepository.auflisten`). */
export function listeMaengel(db: Datenbank, projekt: ProjektId): Mangel[] {
  return db
    .zeilen('SELECT * FROM mangel WHERE projekt_id = ? ORDER BY nummer', [projekt])
    .map(mangelAusZeile);
}

export const leseBautagebucheintrag = (db: Datenbank, id: string): Bautagebucheintrag | null =>
  eine(db, 'bautagebucheintrag', id, bautagebucheintragAusZeile);

/** Die Einträge eines Projekts, ganz, nach Datum (`BautagebuchRepository.auflisten`; je Datum höchstens einer). */
export function listeBautagebuch(db: Datenbank, projekt: ProjektId): Bautagebucheintrag[] {
  return db
    .zeilen('SELECT * FROM bautagebucheintrag WHERE projekt_id = ? ORDER BY datum', [projekt])
    .map(bautagebucheintragAusZeile);
}

/** Die Aggregate aus v1.6 eines Projekts, je nach Kennung (Projektdatei). */
export function aggregateV16DesProjekts(db: Datenbank, projekt: ProjektId) {
  const alle = (tabelle: string): SqlZeile[] =>
    db.zeilen(`SELECT * FROM ${tabelle} WHERE projekt_id = ? ORDER BY id`, [projekt]);
  return {
    bauwerksmodelle: alle('bauwerksmodell').map((z) => {
      const inhalt = db.zeilen('SELECT * FROM bauwerksmodell_inhalt WHERE bauwerksmodell_id = ?', [
        text(z, 'id'),
      ])[0];
      if (inhalt === undefined)
        return abbruch(
          'datei-ungueltig',
          `Bauwerksmodell ${text(z, 'id')}: Struktur und Bauteile fehlen in der Datenbank.`,
        );
      return bauwerksmodellAusZeilen(z, inhalt);
    }),
    bauzeitenplaene: alle('bauzeitenplan').map(bauzeitenplanAusZeile),
    honorarberechnungen: alle('honorarberechnung').map(honorarberechnungAusZeile),
    maengel: alle('mangel').map(mangelAusZeile),
    bautagebuch: alle('bautagebucheintrag').map(bautagebucheintragAusZeile),
  };
}

// --- Modelldateien (Schema 6, v1.6; D-51) --------------------------------------------------------------------------------

/** Die Hashes der Modelldateien, die die Modelle eines Projekts nennen, aufsteigend, je Hash einmal. */
const DATEIEN_DES_PROJEKTS = `SELECT DISTINCT datei_hash AS hash FROM bauwerksmodell WHERE projekt_id = ?`;

/** Die abgelegten Modelldateien eines Projekts (komprimiert, wie gespeichert), nach Hash (Projektdatei, D-51). */
export function modelldateienDesProjekts(
  db: Datenbank,
  projekt: ProjektId,
): { hash: string; inhalt: Uint8Array }[] {
  return db
    .zeilen(
      `SELECT m.hash, m.inhalt FROM modelldatei m WHERE m.hash IN (${DATEIEN_DES_PROJEKTS}) ORDER BY m.hash`,
      [projekt],
    )
    .map((z) => {
      const inhalt = z['inhalt'];
      if (!(inhalt instanceof Uint8Array))
        return abbruch(
          'datei-ungueltig',
          `Modelldatei ${text(z, 'hash')}: Die Bytes fehlen in der Datenbank.`,
        );
      return { hash: text(z, 'hash'), inhalt };
    });
}

/** Zeichen, die die Modelldateien eines Projekts in Base64 bräuchten, ohne sie zu lesen (Grenze des Exports, D-51). */
export function modelldateiZeichen(db: Datenbank, projekt: ProjektId): number {
  const n = db.zeilen(
    `SELECT COALESCE(SUM(((length(inhalt) + 2) / 3) * 4), 0) AS n FROM modelldatei WHERE hash IN (${DATEIEN_DES_PROJEKTS})`,
    [projekt],
  )[0]?.['n'];
  return typeof n === 'number' ? n : 0;
}

/** Eine abgelegte Modelldatei: Länge der unkomprimierten Bytes und die Bytes mit deflate-raw komprimiert. */
export interface GespeicherteModelldatei {
  readonly groesse: number;
  readonly inhalt: Uint8Array;
}

export function leseModelldatei(db: Datenbank, hash: string): GespeicherteModelldatei | null {
  const z = db.zeilen('SELECT groesse, inhalt FROM modelldatei WHERE hash = ?', [hash])[0];
  if (z === undefined) return null;
  const inhalt = z['inhalt'];
  if (!(inhalt instanceof Uint8Array))
    return abbruch('datei-ungueltig', `Modelldatei ${hash}: Die Bytes fehlen in der Datenbank.`);
  return { groesse: ganzzahl(z, 'groesse'), inhalt };
}

/** Länge der abgelegten unkomprimierten Bytes, ohne sie zu lesen; `null`: nicht abgelegt. */
export function modelldateiGroesse(db: Datenbank, hash: string): number | null {
  const z = db.zeilen('SELECT groesse FROM modelldatei WHERE hash = ?', [hash])[0];
  return z === undefined ? null : ganzzahl(z, 'groesse');
}

// --- Protokoll ---------------------------------------------------------------------------------------------------

export function leseProtokoll(db: Datenbank, id: ProjektId): Protokolleintrag[] {
  return db.zeilen('SELECT * FROM protokoll WHERE projekt_id = ? ORDER BY seq', [id]).map((z) => {
    const art = text(z, 'aggregat_art');
    const aggregatId = text(z, 'aggregat_id');
    let befehl: unknown;
    try {
      befehl = JSON.parse(text(z, 'befehl'));
    } catch {
      return abbruch('datei-ungueltig', `Protokolleintrag ${text(z, 'id')}: Befehl ist kein gültiges JSON.`);
    }
    return {
      id: text(z, 'id'),
      projektId: id,
      aggregat: { art, id: aggregatId },
      wer: text(z, 'wer'),
      wann: text(z, 'wann'),
      befehl,
    } as Protokolleintrag;
  });
}

/** Alle Kennungen eines Projekts je Aggregatart, kanonisch nach Kennung sortiert. */
export function aggregatIds(
  db: Datenbank,
  tabelle: 'leistungsverzeichnis' | 'angebot' | 'auftrags_lv',
  id: ProjektId,
): string[] {
  return listeIds(db, `SELECT id FROM ${tabelle} WHERE projekt_id = ? ORDER BY id`, [id]);
}
