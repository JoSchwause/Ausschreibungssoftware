// SPDX-License-Identifier: AGPL-3.0-or-later
// Lesende Seite der Repositories. Hier steht kein schreibender SQL-Befehl (A5). Die Reihenfolge aller
// Ergebnisse ist kanonisch: Knoten in Tiefensuche-Reihenfolge (Eltern vor Kindern, Geschwister nach
// `reihenfolge`), Summen und Angebotspositionen nach Kennung, Protokoll nach Eintragsreihenfolge.

import type {
  Angebot,
  Angebotsposition,
  AngebotId,
  AngebotKopf,
  AngebotZustand,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvKopf,
  AuftragsLvZustand,
  Bieter,
  Betrag,
  Knoten,
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  LvKopf,
  LvZustand,
  PositionId,
  Projekt,
  ProjektId,
  Protokolleintrag,
  Summenstand,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import type { Datenbank } from './sql';
import {
  angebotspositionAusZeile,
  bieterId,
  gesamtAusZeile,
  gliederungId,
  knotenAusZeile,
  lvId,
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
    .map((z): Bieter => ({ id: bieterId(z, 'id'), name: text(z, 'name') }));
  return {
    id,
    name: text(kopf, 'name'),
    bauherr: { name: text(kopf, 'bauherr_name'), anschrift: textOderNull(kopf, 'bauherr_anschrift') },
    bieter,
  };
}

export function listeProjekte(db: Datenbank): { id: ProjektId; name: string }[] {
  return db
    .zeilen('SELECT id, name FROM projekt ORDER BY name, id')
    .map((z) => ({ id: projektId(z, 'id'), name: text(z, 'name') }));
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

export function leseSummen(db: Datenbank, aggregatId: string): Summenstand | null {
  const gesamt = db.zeilen('SELECT * FROM summe_gesamt WHERE aggregat_id = ?', [aggregatId])[0];
  if (gesamt === undefined) return null;
  return {
    positionen: db
      .zeilen('SELECT * FROM summe_position WHERE aggregat_id = ? ORDER BY position_id', [aggregatId])
      .map((z) => ({
        positionId: text(z, 'position_id') as PositionId,
        gesamtpreis: textOderNull(z, 'gesamtpreis') as Betrag | null,
        gehtInSummeEin: z['geht_in_summe'] === 1,
      })),
    gliederungen: db
      .zeilen('SELECT * FROM summe_gliederung WHERE aggregat_id = ? ORDER BY gliederung_id', [aggregatId])
      .map((z) => ({ gliederungId: gliederungId(z, 'gliederung_id'), summe: text(z, 'summe') as Betrag })),
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
  return { leistungsverzeichnis: lv, summen };
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

// --- Auftrags-LV (nur über Projektdatei, siehe Ticket) ----------------------------------------------------------

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
  return { auftragsLeistungsverzeichnis: lv, summen };
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
