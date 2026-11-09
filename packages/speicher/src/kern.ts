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
  LvZustand,
  Projekt,
  ProjektId,
  Projektuebersicht,
  Protokolleintrag,
  Speicherfehler,
} from '@tethys/vertrag';
import { abbruch, fehler, ok } from './ergebnis';
import { fange } from './fehler';
import { kanonischesJson } from './kanonisch';
import {
  aggregatIds,
  leseAngebot,
  leseLv,
  leseProjekt,
  leseProtokoll,
  listeIds,
  listeProjekte,
} from './lesen';
import { migriere, MIGRATIONEN, type Migration } from './migrationen';
import { baueProjektdatei, leseProjektdatei, schreibeProjektdatei } from './projektdatei';
import { schreibeProtokolleintrag, wendeAngebotAn, wendeLvAn, wendeProjektAn } from './schreiben';
import { transaktion, type Datenbank } from './sql';

/** Prüft, dass der Protokolleintrag zum ChangeSet passt: gleiches Aggregat, gleiches Projekt. */
function pruefeBezug(e: Protokolleintrag, cs: ChangeSet): void {
  const erwartet =
    cs.art === 'projekt'
      ? { art: 'projekt', id: cs.projektId as string }
      : cs.art === 'leistungsverzeichnis'
        ? { art: 'leistungsverzeichnis', id: cs.leistungsverzeichnisId as string }
        : { art: 'angebot', id: cs.angebotId as string };
  if (e.aggregat.art !== erwartet.art || e.aggregat.id !== erwartet.id) {
    abbruch('unbekannt', `Protokolleintrag und ChangeSet betreffen verschiedene Aggregate (${erwartet.art} ${erwartet.id}).`);
  }
  if (cs.art === 'projekt' && e.projektId !== cs.projektId) {
    abbruch('unbekannt', 'Protokolleintrag und ChangeSet betreffen verschiedene Projekte.');
  }
}

export class SpeicherKern {
  private constructor(
    private readonly db: Datenbank,
    private readonly migrationen: readonly Migration[],
  ) {}

  /** Schaltet Fremdschlüssel ein und bringt das Schema auf den aktuellen Stand (A8). */
  static oeffnen(
    db: Datenbank,
    migrationen: readonly Migration[] = MIGRATIONEN,
  ): Ergebnis<SpeicherKern, Speicherfehler> {
    const f = fange(() => {
      db.ausfuehren('PRAGMA foreign_keys = ON');
    });
    if (!f.ok) return f;
    const m = migriere(db, migrationen);
    if (!m.ok) return m;
    return ok(new SpeicherKern(db, migrationen));
  }

  // --- Lesen ------------------------------------------------------------------------------------------------

  projekteAuflisten(): Ergebnis<readonly Projektuebersicht[], Speicherfehler> {
    return fange(() => listeProjekte(this.db));
  }

  projektLaden(id: ProjektId): Ergebnis<Projekt, Speicherfehler> {
    return fange(() => leseProjekt(this.db, id) ?? abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`));
  }

  lvAuflisten(projektId: ProjektId): Ergebnis<readonly LeistungsverzeichnisId[], Speicherfehler> {
    return fange(() => {
      if (leseProjekt(this.db, projektId) === null) abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
      return aggregatIds(this.db, 'leistungsverzeichnis', projektId) as LeistungsverzeichnisId[];
    });
  }

  lvLaden(id: LeistungsverzeichnisId): Ergebnis<LvZustand, Speicherfehler> {
    return fange(() => leseLv(this.db, id) ?? abbruch('nicht-gefunden', `Leistungsverzeichnis ${id} ist nicht vorhanden.`));
  }

  angeboteAuflisten(lvId: LeistungsverzeichnisId): Ergebnis<readonly AngebotId[], Speicherfehler> {
    return fange(() => {
      const da = this.db.zeilen('SELECT 1 AS da FROM leistungsverzeichnis WHERE id = ?', [lvId])[0];
      if (da === undefined) abbruch('nicht-gefunden', `Leistungsverzeichnis ${lvId} ist nicht vorhanden.`);
      return listeIds(this.db, 'SELECT id FROM angebot WHERE leistungsverzeichnis_id = ? ORDER BY id', [lvId]) as AngebotId[];
    });
  }

  angebotLaden(id: AngebotId): Ergebnis<AngebotZustand, Speicherfehler> {
    return fange(() => leseAngebot(this.db, id) ?? abbruch('nicht-gefunden', `Angebot ${id} ist nicht vorhanden.`));
  }

  protokoll(projektId: ProjektId): Ergebnis<readonly Protokolleintrag[], Speicherfehler> {
    return fange(() => {
      if (leseProjekt(this.db, projektId) === null) abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
      return leseProtokoll(this.db, projektId);
    });
  }

  // --- Einziger Schreibweg (A5) -----------------------------------------------------------------------------

  /**
   * ChangeSet und Protokolleintrag in einer Transaktion. Schlägt irgendein Schritt fehl (Konflikt mit dem
   * gespeicherten Stand, Quote, Sperre), wird alles zurückgerollt und der Fehler als Wert geliefert (Q5).
   */
  anwenden(eintrag: Protokolleintrag, changeSet: ChangeSet): Ergebnis<void, Speicherfehler> {
    return fange(() => {
      transaktion(this.db, () => {
        pruefeBezug(eintrag, changeSet);
        switch (changeSet.art) {
          case 'projekt':
            wendeProjektAn(this.db, changeSet);
            break;
          case 'leistungsverzeichnis':
            wendeLvAn(this.db, changeSet, eintrag.projektId);
            break;
          case 'angebot':
            wendeAngebotAn(this.db, changeSet, eintrag.projektId);
            break;
        }
        schreibeProtokolleintrag(this.db, eintrag);
      });
    });
  }

  // --- Projektdatei -----------------------------------------------------------------------------------------

  projektdateiExportieren(projektId: ProjektId): Ergebnis<string, Speicherfehler> {
    return fange(() =>
      kanonischesJson(baueProjektdatei(this.db, projektId, this.migrationen[this.migrationen.length - 1]?.version ?? 0)),
    );
  }

  /** Importiert atomar. Existiert das Projekt schon, wird nichts überschrieben (Q5). */
  projektdateiImportieren(inhalt: string): Ergebnis<ProjektId, Speicherfehler> {
    const datei = leseProjektdatei(inhalt, this.migrationen);
    if (!datei.ok) return datei;
    return fange(() =>
      transaktion(this.db, () => {
        if (leseProjekt(this.db, datei.wert.projekt.id) !== null) {
          abbruch('unbekannt', `Das Projekt ${datei.wert.projekt.id} existiert bereits; es wird nicht überschrieben.`);
        }
        return schreibeProjektdatei(this.db, datei.wert);
      }),
    );
  }

  schliessen(): Ergebnis<void, Speicherfehler> {
    return fange(() => {
      this.db.schliessen();
    });
  }
}

export { fehler };
