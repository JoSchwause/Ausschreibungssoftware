// SPDX-License-Identifier: AGPL-3.0-or-later
// JSON-Projektdatei (G-56): Aufbau aus der Datenbank, Hebung alter Dateiversionen und Schreiben beim Import.

import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  Ergebnis,
  Knoten,
  LeistungsverzeichnisId,
  Projektdatei,
  ProjektId,
  Speicherfehler,
} from '@tethys/vertrag';
import { dekodiereProjektdatei } from './dekoder';
import { altSpalten } from './zeilen';
import { abbruch, fehler, SpeicherAbbruch } from './ergebnis';
import { fange, fehlerAusAusnahme, istAusgabefehler } from './fehler';
import { aggregatIds, leseAngebot, leseAuftragsLv, leseLv, leseProjekt, leseProtokoll } from './lesen';
import type { Migration } from './migrationen';
import {
  schreibeProtokolleintrag,
  wendeAngebotAn,
  wendeAuftragsLvAn,
  wendeLvAn,
  wendeProjektAn,
} from './schreiben';
import type { Datenbank } from './sql';

/** Baut die Projektdatei im Stand der aktuellen Schemaversion. Reihenfolge der Listen: nach Kennung. */
export function baueProjektdatei(db: Datenbank, id: ProjektId, schemaVersion: number): Projektdatei {
  const projekt = leseProjekt(db, id);
  if (projekt === null) return abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`);
  const holen = <T>(wert: T | null, was: string): T =>
    wert === null ? abbruch('datei-ungueltig', `${was} verschwand während des Exports.`) : wert;
  return {
    schemaVersion,
    projekt,
    leistungsverzeichnisse: aggregatIds(db, 'leistungsverzeichnis', id).map((lv) =>
      holen(leseLv(db, lv as LeistungsverzeichnisId), `LV ${lv}`),
    ),
    angebote: aggregatIds(db, 'angebot', id).map((a) =>
      holen(leseAngebot(db, a as AngebotId), `Angebot ${a}`),
    ),
    auftragsLeistungsverzeichnisse: aggregatIds(db, 'auftrags_lv', id).map((a) =>
      holen(leseAuftragsLv(db, a as AuftragsLeistungsverzeichnisId), `Auftrags-LV ${a}`),
    ),
    protokoll: leseProtokoll(db, id),
  };
}

/**
 * // v1.1b: mechanisch angepasst, Folgeticket: Die Projektdatei der Schemaversion 1 trägt Positionen noch in der Form vor v1.1b (`positionsart`,
 * `pauschal`, `bedarfMitGesamtbetrag`, `bezugspositionId`, `grundpositionId`); der Export in Version 1 ist byte-gleich der
 * eingefrorenen Datei und bleibt es. Diese Funktion schreibt die Positionen der LV und Auftrags-LV in diese Form
 * zurück; eine Position, die sich darin nicht verlustfrei ablegen lässt, weist `altSpalten` ab (Q5). Das Folgeticket
 * `speicher` hebt die Datei mit einer Migration auf die neue Form (A8) und löscht diese Funktion. Befehle im Protokoll
 * gehen unverändert durch (undurchsichtiges JSON).
 */
export function projektdateiInAlterForm(d: Projektdatei): unknown {
  const knoten = (ks: readonly Knoten[]): unknown[] =>
    ks.map((k) => {
      if (k.art !== 'position') return k;
      const rest: Record<string, unknown> = { ...k };
      for (const feld of ['merkmale', 'zuschlag', 'leitbeschreibung']) Reflect.deleteProperty(rest, feld);
      const [art, pauschal, mit, bezug, grund] = altSpalten(k);
      return {
        ...rest,
        positionsart: art,
        pauschal: pauschal === 1,
        bedarfMitGesamtbetrag: mit === 1,
        bezugspositionId: bezug,
        grundpositionId: grund,
      };
    });
  return {
    ...d,
    leistungsverzeichnisse: d.leistungsverzeichnisse.map((z) => ({
      ...z,
      leistungsverzeichnis: { ...z.leistungsverzeichnis, knoten: knoten(z.leistungsverzeichnis.knoten) },
    })),
    auftragsLeistungsverzeichnisse: d.auftragsLeistungsverzeichnisse.map((z) => ({
      ...z,
      auftragsLeistungsverzeichnis: {
        ...z.auftragsLeistungsverzeichnis,
        knoten: knoten(z.auftragsLeistungsverzeichnis.knoten),
      },
    })),
  };
}

/**
 * Liest den JSON-Text, hebt eine ältere Dateiversion Schritt für Schritt auf die aktuelle (A8) und prüft das
 * Ergebnis streng gegen die aktuelle Form.
 */
export function leseProjektdatei(
  inhalt: string,
  migrationen: readonly Migration[],
): Ergebnis<Projektdatei, Speicherfehler> {
  let roh: unknown;
  try {
    roh = JSON.parse(inhalt);
  } catch (e) {
    return fehler(
      'datei-ungueltig',
      `Die Projektdatei ist kein gültiges JSON: ${fehlerAusAusnahme(e).meldung}`,
    );
  }
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) {
    return fehler('datei-ungueltig', 'Die Projektdatei muss ein JSON-Objekt sein.');
  }
  let aktuell = roh as Record<string, unknown>;
  const von = aktuell['schemaVersion'];
  const ziel = migrationen[migrationen.length - 1]?.version ?? 0;
  if (typeof von !== 'number' || !Number.isSafeInteger(von) || von < 1) {
    return fehler('datei-ungueltig', 'Die Projektdatei hat keine gültige schemaVersion.');
  }
  if (von > ziel) {
    return fehler(
      'schema-zu-neu',
      `Die Projektdatei hat Schemaversion ${String(von)}, diese Version kennt höchstens ${String(ziel)}.`,
    );
  }
  for (const m of migrationen) {
    if (m.version <= von) continue;
    if (m.datei === null) {
      return fehler('migration-fehlgeschlagen', `Migration ${String(m.version)} hat keine Dateimigration.`);
    }
    try {
      aktuell = { ...m.datei(aktuell), schemaVersion: m.version };
    } catch (e) {
      return fehler(
        'migration-fehlgeschlagen',
        `Dateimigration auf Version ${String(m.version)} fehlgeschlagen: ${fehlerAusAusnahme(e).meldung}`,
      );
    }
  }
  return fange(() => dekodiereProjektdatei(aktuell, ziel));
}

/**
 * Schreibt eine geprüfte Projektdatei in die Tabellen (innerhalb der Transaktion des Aufrufers). Es werden
 * dieselben Schreibfunktionen wie bei `anwenden` benutzt. Das Protokoll der Datei wird unverändert
 * übernommen; der Import selbst ist kein Befehl und erzeugt keinen Eintrag.
 */
export function schreibeProjektdatei(db: Datenbank, d: Projektdatei): ProjektId {
  const projektId = d.projekt.id;
  try {
    wendeProjektAn(db, { art: 'projekt', projektId, projekt: { vorher: null, nachher: d.projekt } });
    for (const z of d.leistungsverzeichnisse) {
      const { knoten, ...kopf } = z.leistungsverzeichnis;
      wendeLvAn(
        db,
        {
          art: 'leistungsverzeichnis',
          leistungsverzeichnisId: kopf.id,
          kopf: { vorher: null, nachher: kopf },
          knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
          summen: z.summen,
        },
        projektId,
      );
    }
    for (const z of d.angebote) {
      const { positionen, ...kopf } = z.angebot;
      wendeAngebotAn(
        db,
        {
          art: 'angebot',
          angebotId: kopf.id,
          kopf: { vorher: null, nachher: kopf },
          positionen: { hinzugefuegt: positionen, geaendert: [], entfernt: [] },
          summen: z.summen,
        },
        projektId,
      );
    }
    for (const z of d.auftragsLeistungsverzeichnisse) {
      const { knoten, ...kopf } = z.auftragsLeistungsverzeichnis;
      wendeAuftragsLvAn(
        db,
        {
          art: 'auftrags-leistungsverzeichnis',
          auftragsLeistungsverzeichnisId: kopf.id,
          kopf: { vorher: null, nachher: kopf },
          knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
          summen: z.summen,
        },
        projektId,
      );
    }
    for (const e of d.protokoll) schreibeProtokolleintrag(db, e);
  } catch (e) {
    // Jede Verletzung von Integritätsregeln beim Import heißt: Die Datei passt nicht zum Schema. Ein
    // Ein-/Ausgabefehler des Speichers sagt nichts über die Datei und bleibt, was er ist.
    const f = fehlerAusAusnahme(e);
    if (
      (f.code === 'unbekannt' || f.code === 'nicht-gefunden' || f.code === 'konflikt') &&
      !istAusgabefehler(e)
    )
      throw new SpeicherAbbruch('datei-ungueltig', f.meldung);
    throw e;
  }
  return projektId;
}
