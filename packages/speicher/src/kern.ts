// SPDX-License-Identifier: AGPL-3.0-or-later
// Synchroner Speicherkern: Repositories, Einzelweg `anwenden`, Projektdatei. Er kennt nur die schmale
// `Datenbank`-Schnittstelle und läuft unverändert im Worker (OPFS) und in Node-Tests (In-Memory).
// Die asynchrone `Speicher`-Schnittstelle des Vertrags entsteht darüber in `client.ts`.

import type {
  AngebotId,
  AngebotZustand,
  ChangeSet,
  Ergebnis,
  LeistungsverzeichnisId,
  LvStand,
  LvStandId,
  LvStandUebersicht,
  LvZustand,
  Projekt,
  ProjektId,
  Projektuebersicht,
  Protokolleintrag,
  Speicherfehler,
} from '@tethys/vertrag';
import { abbruch, fehler, ok } from './ergebnis';
import { fange, fehlerAusAusnahme } from './fehler';
import { kanonischesJson } from './kanonisch';
import { protokollform } from './kurzfassung';
import {
  aggregatIds,
  leseAngebot,
  leseLv,
  leseLvKopf,
  leseLvStaende,
  leseLvStand,
  leseProjekt,
  leseProtokoll,
  listeIds,
  listeProjekte,
} from './lesen';
import { migriere, MIGRATIONEN, type Migration } from './migrationen';
import { baueProjektdatei, leseProjektdatei, schreibeProjektdatei } from './projektdatei';
import {
  schreibeProtokolleintrag,
  wendeAngebotAn,
  wendeAuftragsLvAn,
  wendeLvAn,
  wendeProjektAn,
} from './schreiben';
import { transaktion, type Datenbank } from './sql';
import type { Migrationsbefund } from './summenmigration';

/** Prüft, dass der Protokolleintrag zum ChangeSet passt: gleiches Aggregat, gleiches Projekt. */
function pruefeBezug(e: Protokolleintrag, cs: ChangeSet): void {
  const erwartet =
    cs.art === 'projekt'
      ? { art: 'projekt', id: cs.projektId as string }
      : cs.art === 'leistungsverzeichnis'
        ? { art: 'leistungsverzeichnis', id: cs.leistungsverzeichnisId as string }
        : cs.art === 'angebot'
          ? { art: 'angebot', id: cs.angebotId as string }
          : { art: 'auftrags-leistungsverzeichnis', id: cs.auftragsLeistungsverzeichnisId as string };
  if (e.aggregat.art !== erwartet.art || e.aggregat.id !== erwartet.id) {
    abbruch(
      'unbekannt',
      `Protokolleintrag und ChangeSet betreffen verschiedene Aggregate (${erwartet.art} ${erwartet.id}).`,
    );
  }
  if (cs.art === 'projekt' && e.projektId !== cs.projektId) {
    abbruch('unbekannt', 'Protokolleintrag und ChangeSet betreffen verschiedene Projekte.');
  }
}

/**
 * `Rueckgaengig` und `Wiederholen` (v1.2, S3): `protokollId` muss auf einen gespeicherten Eintrag desselben Projekts
 * und desselben Aggregats zeigen, und zwar auf den ursprünglichen Befehl, nicht auf einen anderen Historienbefehl
 * (Vertrag). Sonst `konflikt`: Die Umkehrung gehört dann nicht zu diesem Stand. Ob das ChangeSet wirklich die
 * Umkehrung ist, prüft `speicher` nicht (das Protokoll ist Nebenbuch, Undo liest es nicht; ADR 0009); geprüft wird wie
 * bei jedem ChangeSet, dass `vorher` zum gespeicherten Stand passt.
 *
 * Ausnahme (D-31.1): Ein ChangeSet, das das Projekt anlegt, findet den Eintrag nicht mehr, weil das Löschen des Projekts
 * sein Protokoll mitnahm. Sein Verweis wird nicht geprüft.
 */
function pruefeHistorienbezug(db: Datenbank, e: Protokolleintrag, cs: ChangeSet): void {
  const b = e.befehl;
  if (b.art !== 'Rueckgaengig' && b.art !== 'Wiederholen') return;
  if (cs.art === 'projekt' && cs.projekt.vorher === null) return;
  const z = db.zeilen('SELECT projekt_id, aggregat_art, aggregat_id, befehl FROM protokoll WHERE id = ?', [
    b.protokollId,
  ])[0];
  const passt =
    z !== undefined &&
    z['projekt_id'] === e.projektId &&
    z['aggregat_art'] === e.aggregat.art &&
    z['aggregat_id'] === e.aggregat.id &&
    !istHistorienbefehl(String(z['befehl']));
  if (!passt) {
    abbruch(
      'konflikt',
      `Konflikt: ${b.art} verweist auf ${b.protokollId}, keinen ursprünglichen Befehl an ${e.aggregat.art} ` +
        `${e.aggregat.id} in diesem Projekt; es wurde nichts geschrieben.`,
    );
  }
}

/** Ist der gespeicherte Befehl (JSON) ein `Rueckgaengig` oder `Wiederholen`? */
function istHistorienbefehl(json: string): boolean {
  const art = (JSON.parse(json) as { art?: unknown }).art;
  return art === 'Rueckgaengig' || art === 'Wiederholen';
}

const GESCHLOSSEN = (): Ergebnis<never, Speicherfehler> =>
  fehler('gesperrt', 'Der Speicher ist geschlossen; für weitere Aufrufe muss er neu geöffnet werden.');

export class SpeicherKern {
  // Echte private Felder (`#`): Die Datenbank ist von außen nicht erreichbar, auch nicht zur Laufzeit (A5).
  readonly #db: Datenbank;
  readonly #migrationen: readonly Migration[];
  /** Befunde der Summen-Neuberechnung beim Öffnen und bei jedem Import einer alten Datei (D-17). */
  readonly #befunde: Migrationsbefund[];
  #geschlossen = false;
  /** Letzter `anwenden`-Lauf: der nächste wartet auf ihn (Reihenfolge der Aufrufe, ein Schreiber). */
  #reihe: Promise<unknown> = Promise.resolve();

  /**
   * Führt `f` aus und macht aus jeder Ausnahme einen Fehlerwert. Nach `schliessen` liefert jeder Aufruf `gesperrt`
   * (v1.1a, Punkt 3), ohne die geschlossene Datenbank anzufassen.
   */
  #fange<T>(f: () => T): Ergebnis<T, Speicherfehler> {
    return this.#geschlossen ? GESCHLOSSEN() : fange(f);
  }

  private constructor(db: Datenbank, migrationen: readonly Migration[], befunde: Migrationsbefund[]) {
    this.#db = db;
    this.#migrationen = migrationen;
    this.#befunde = befunde;
  }

  /** Schaltet Fremdschlüssel ein und bringt das Schema auf den aktuellen Stand (A8). */
  static oeffnen(
    db: Datenbank,
    migrationen: readonly Migration[] = MIGRATIONEN,
  ): Ergebnis<SpeicherKern, Speicherfehler> {
    const f = fange(() => {
      db.ausfuehren('PRAGMA foreign_keys = ON');
    });
    if (!f.ok) return f;
    const befunde: Migrationsbefund[] = [];
    const m = migriere(db, migrationen, befunde);
    if (!m.ok) return m;
    return ok(new SpeicherKern(db, migrationen, befunde));
  }

  /**
   * Befunde der Migrationen seit dem Öffnen (D-17): Aggregate, deren Summen der Kern nicht neu rechnen konnte, weil er
   * ihre Daten abweist. Die Daten sind unverändert gespeichert.
   */
  migrationsbefunde(): Ergebnis<readonly Migrationsbefund[], Speicherfehler> {
    return this.#fange(() => [...this.#befunde]);
  }

  // --- Lesen ------------------------------------------------------------------------------------------------

  projekteAuflisten(): Ergebnis<readonly Projektuebersicht[], Speicherfehler> {
    return this.#fange(() => listeProjekte(this.#db));
  }

  projektLaden(id: ProjektId): Ergebnis<Projekt, Speicherfehler> {
    return this.#fange(
      () => leseProjekt(this.#db, id) ?? abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`),
    );
  }

  lvAuflisten(projektId: ProjektId): Ergebnis<readonly LeistungsverzeichnisId[], Speicherfehler> {
    return this.#fange(() => {
      if (leseProjekt(this.#db, projektId) === null)
        abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
      return aggregatIds(this.#db, 'leistungsverzeichnis', projektId) as LeistungsverzeichnisId[];
    });
  }

  lvLaden(id: LeistungsverzeichnisId): Ergebnis<LvZustand, Speicherfehler> {
    return this.#fange(
      () =>
        leseLv(this.#db, id) ?? abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`),
    );
  }

  angeboteAuflisten(lvId: LeistungsverzeichnisId): Ergebnis<readonly AngebotId[], Speicherfehler> {
    return this.#fange(() => {
      const da = this.#db.zeilen('SELECT 1 AS da FROM leistungsverzeichnis WHERE id = ?', [lvId])[0];
      if (da === undefined) abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
      return listeIds(this.#db, 'SELECT id FROM angebot WHERE leistungsverzeichnis_id = ? ORDER BY id', [
        lvId,
      ]) as AngebotId[];
    });
  }

  angebotLaden(id: AngebotId): Ergebnis<AngebotZustand, Speicherfehler> {
    return this.#fange(
      () => leseAngebot(this.#db, id) ?? abbruch('nicht-gefunden', `Angebot ${id} ist nicht vorhanden.`),
    );
  }

  /** `LvStandRepository.auflisten` (v1.2): die Stände des LV ohne Zustand, ältester zuerst. */
  lvStaendeAuflisten(lvId: LeistungsverzeichnisId): Ergebnis<readonly LvStandUebersicht[], Speicherfehler> {
    return this.#fange(() => {
      if (leseLvKopf(this.#db, lvId) === null)
        abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
      return leseLvStaende(this.#db, lvId);
    });
  }

  /** `LvStandRepository.laden` (v1.2): ein Stand samt eingefrorenem Zustand. */
  lvStandLaden(id: LvStandId): Ergebnis<LvStand, Speicherfehler> {
    return this.#fange(
      () => leseLvStand(this.#db, id) ?? abbruch('nicht-gefunden', `LV-Stand ${id} ist nicht vorhanden.`),
    );
  }

  protokoll(projektId: ProjektId): Ergebnis<readonly Protokolleintrag[], Speicherfehler> {
    return this.#fange(() => {
      if (leseProjekt(this.#db, projektId) === null)
        abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
      return leseProtokoll(this.#db, projektId);
    });
  }

  // --- Einziger Schreibweg (A5) -----------------------------------------------------------------------------

  /**
   * ChangeSet und Protokolleintrag in einer Transaktion. Schlägt irgendein Schritt fehl (Konflikt mit dem
   * gespeicherten Stand, Quote, Sperre), wird alles zurückgerollt und der Fehler als Wert geliefert (Q5).
   *
   * Ein Massenbefehl geht als `Befehlskurzfassung` ins Protokoll (E-13). Die Prüfsumme entsteht asynchron (Web Crypto)
   * vor der Transaktion; die Transaktion selbst bleibt synchron. Aufrufe laufen in der Reihenfolge ihres Eintreffens,
   * auch wenn der Aufrufer nicht auf den vorigen wartet.
   */
  anwenden(eintrag: Protokolleintrag, changeSet: ChangeSet): Promise<Ergebnis<void, Speicherfehler>> {
    const lauf = this.#reihe.then(() => this.#anwendenDann(eintrag, changeSet));
    this.#reihe = lauf;
    return lauf;
  }

  async #anwendenDann(e: Protokolleintrag, changeSet: ChangeSet): Promise<Ergebnis<void, Speicherfehler>> {
    if (this.#geschlossen) return GESCHLOSSEN();
    let eintrag: Protokolleintrag;
    try {
      eintrag = await protokollform(e);
    } catch (x) {
      return { ok: false, fehler: fehlerAusAusnahme(x) };
    }
    return this.#fange(() => {
      transaktion(this.#db, () => {
        pruefeBezug(eintrag, changeSet);
        pruefeHistorienbezug(this.#db, eintrag, changeSet);
        switch (changeSet.art) {
          case 'projekt':
            wendeProjektAn(this.#db, changeSet);
            break;
          case 'leistungsverzeichnis':
            wendeLvAn(this.#db, changeSet, eintrag.projektId, eintrag.wann);
            break;
          case 'angebot':
            wendeAngebotAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'auftrags-leistungsverzeichnis':
            wendeAuftragsLvAn(this.#db, changeSet, eintrag.projektId);
            break;
        }
        // Mit dem Projekt ist auch sein Protokoll gelöscht; der Eintrag des Löschbefehls hat kein Projekt mehr, dem er
        // gehören könnte (siehe `wendeProjektAn`, D-31.1).
        const projektGeloescht = changeSet.art === 'projekt' && changeSet.projekt.nachher === null;
        if (!projektGeloescht) schreibeProtokolleintrag(this.#db, eintrag);
      });
    });
  }

  // --- Projektdatei -----------------------------------------------------------------------------------------

  projektdateiExportieren(projektId: ProjektId): Ergebnis<string, Speicherfehler> {
    return this.#fange(() =>
      kanonischesJson(
        baueProjektdatei(this.#db, projektId, this.#migrationen[this.#migrationen.length - 1]?.version ?? 0),
      ),
    );
  }

  /** Importiert atomar. Existiert das Projekt schon, wird nichts überschrieben (Q5). */
  projektdateiImportieren(inhalt: string): Ergebnis<ProjektId, Speicherfehler> {
    if (this.#geschlossen) return GESCHLOSSEN();
    const befunde: Migrationsbefund[] = [];
    const datei = leseProjektdatei(inhalt, this.#migrationen, befunde);
    if (!datei.ok) return datei;
    const r = fange(() =>
      transaktion(this.#db, () => {
        if (leseProjekt(this.#db, datei.wert.projekt.id) !== null) {
          abbruch(
            'existiert-bereits',
            `Das Projekt ${datei.wert.projekt.id} existiert bereits; es wird nicht überschrieben.`,
          );
        }
        return schreibeProjektdatei(this.#db, datei.wert);
      }),
    );
    if (r.ok) this.#befunde.push(...befunde);
    return r;
  }

  /** Schließt die Datenbank. Danach liefert jeder Aufruf `gesperrt`, auch ein zweites `schliessen`. */
  schliessen(): Ergebnis<void, Speicherfehler> {
    return this.#fange(() => {
      this.#geschlossen = true;
      this.#db.schliessen();
    });
  }
}
