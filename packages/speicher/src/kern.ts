// SPDX-License-Identifier: AGPL-3.0-or-later
// Synchroner Speicherkern: Repositories, Einzelweg `anwenden`, Projektdatei. Er kennt nur die schmale
// `Datenbank`-Schnittstelle und läuft unverändert im Worker (OPFS) und in Node-Tests (In-Memory).
// Die asynchrone `Speicher`-Schnittstelle des Vertrags entsteht darüber in `client.ts`.

import type {
  AngebotId,
  AngebotZustand,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvUebersicht,
  AuftragsLvZustand,
  AufmassId,
  AufmassKopf,
  AufmassZustand,
  BauwerksmodellId,
  BauwerksmodellUebersicht,
  BauwerksmodellZustand,
  Bautagebucheintrag,
  BautagebucheintragId,
  BautagebucheintragZustand,
  BauzeitenplanId,
  BauzeitenplanUebersicht,
  BauzeitenplanZustand,
  HonorarberechnungId,
  HonorarberechnungUebersicht,
  HonorarberechnungZustand,
  Mangel,
  MangelId,
  MangelZustand,
  ChangeSet,
  KostenermittlungId,
  KostenermittlungUebersicht,
  KostenermittlungZustand,
  Rechnung,
  RechnungId,
  RechnungZustand,
  Ergebnis,
  LeistungsverzeichnisId,
  LvStand,
  LvStandId,
  LvStandUebersicht,
  LvUebersicht,
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
import { deflateRaw, inflateRaw, sha256Hex } from './komprimierung';
import { protokollform } from './kurzfassung';
import {
  leseAngebot,
  leseAufmass,
  leseAuftragsLv,
  leseBautagebucheintrag,
  leseBauwerksmodell,
  leseBauzeitenplan,
  leseHonorarberechnung,
  leseMangel,
  leseKostenermittlung,
  leseLv,
  leseLvKopf,
  leseLvStaende,
  leseLvStand,
  leseModelldatei,
  leseProjekt,
  leseProtokoll,
  leseRechnung,
  leseRechnungen,
  listeAufmasse,
  listeAuftragsLvs,
  listeBautagebuch,
  listeBauwerksmodelle,
  listeBauzeitenplaene,
  listeHonorarberechnungen,
  listeMaengel,
  listeIds,
  listeKostenermittlungen,
  listeLvs,
  listeProjekte,
  modelldateiGroesse,
} from './lesen';
import { migriere, MIGRATIONEN, type Migration } from './migrationen';
import { baueProjektdatei, leseProjektdatei, schreibeProjektdatei } from './projektdatei';
import {
  gibUngenutzteModelldateienFrei,
  schreibeModelldatei,
  schreibeProtokolleintrag,
  wendeAngebotAn,
  wendeAufmassAn,
  wendeAuftragsLvAn,
  wendeBautagebucheintragAn,
  wendeBauwerksmodellAn,
  wendeBauzeitenplanAn,
  wendeHonorarberechnungAn,
  wendeMangelAn,
  wendeKostenermittlungAn,
  wendeLvAn,
  wendeProjektAn,
  wendeRechnungAn,
} from './schreiben';
import { transaktion, type Datenbank } from './sql';
import type { Migrationsbefund } from './summenmigration';

/** Das Aggregat, auf das ein ChangeSet wirkt (Art und Kennung wie in `AggregatBezug`). */
function aggregatDes(cs: ChangeSet): { art: string; id: string } {
  switch (cs.art) {
    case 'projekt':
      return { art: cs.art, id: cs.projektId };
    case 'leistungsverzeichnis':
      return { art: cs.art, id: cs.leistungsverzeichnisId };
    case 'angebot':
      return { art: cs.art, id: cs.angebotId };
    case 'auftrags-leistungsverzeichnis':
      return { art: cs.art, id: cs.auftragsLeistungsverzeichnisId };
    case 'aufmass':
      return { art: cs.art, id: cs.aufmassId };
    case 'rechnung':
      return { art: cs.art, id: cs.rechnungId };
    case 'kostenermittlung':
      return { art: cs.art, id: cs.kostenermittlungId };
    case 'bauwerksmodell':
      return { art: cs.art, id: cs.bauwerksmodellId };
    case 'bauzeitenplan':
      return { art: cs.art, id: cs.bauzeitenplanId };
    case 'honorarberechnung':
      return { art: cs.art, id: cs.honorarberechnungId };
    case 'mangel':
      return { art: cs.art, id: cs.mangelId };
    case 'bautagebucheintrag':
      return { art: cs.art, id: cs.bautagebucheintragId };
  }
}

/** Prüft, dass der Protokolleintrag zum ChangeSet passt: gleiches Aggregat, gleiches Projekt. */
function pruefeBezug(e: Protokolleintrag, cs: ChangeSet): void {
  const erwartet = aggregatDes(cs);
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
    // Beginn einer Sitzung: Bytes, die kein Modell nennt, werden frei (D-97.5); erst ab Schema 6 gibt es die Ablage.
    if (m.wert >= 6) {
      const frei = fange(() => {
        gibUngenutzteModelldateienFrei(db);
      });
      if (!frei.ok) return frei;
    }
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

  lvAuflisten(projektId: ProjektId): Ergebnis<readonly LvUebersicht[], Speicherfehler> {
    return this.#fange(() => {
      this.#projektDa(projektId);
      return listeLvs(this.#db, projektId);
    });
  }

  /** Bricht mit `nicht-gefunden` ab, wenn es das Projekt nicht gibt (Listen eines Projekts). */
  #projektDa(projektId: ProjektId): void {
    if (this.#db.zeilen('SELECT 1 AS da FROM projekt WHERE id = ?', [projektId]).length === 0)
      abbruch('nicht-gefunden', `Projekt ${projektId} ist nicht vorhanden.`);
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

  /** `AuftragsLvRepository.auflisten` (v1.4): die Auftrags-LVs des Projekts ohne Knoten, nach Name. */
  auftragsLvAuflisten(projektId: ProjektId): Ergebnis<readonly AuftragsLvUebersicht[], Speicherfehler> {
    return this.#fange(() => {
      this.#projektDa(projektId);
      return listeAuftragsLvs(this.#db, projektId);
    });
  }

  /** `AuftragsLvRepository.laden` (v1.4). */
  auftragsLvLaden(id: AuftragsLeistungsverzeichnisId): Ergebnis<AuftragsLvZustand, Speicherfehler> {
    return this.#fange(
      () =>
        leseAuftragsLv(this.#db, id) ?? abbruch('nicht-gefunden', `Auftrags-LV ${id} ist nicht vorhanden.`),
    );
  }

  /** Bricht mit `nicht-gefunden` ab, wenn es das Auftrags-LV nicht gibt (Listen eines Auftrags-LV). */
  #auftragsLvDa(id: AuftragsLeistungsverzeichnisId): void {
    if (this.#db.zeilen('SELECT 1 AS da FROM auftrags_lv WHERE id = ?', [id]).length === 0)
      abbruch('nicht-gefunden', `Auftrags-LV ${id} ist nicht vorhanden.`);
  }

  /** `AufmassRepository.auflisten` (v1.4): die Blätter des Auftrags-LV ohne Zeilen, nach Blattnummer. */
  aufmasseAuflisten(
    auftragsLvId: AuftragsLeistungsverzeichnisId,
  ): Ergebnis<readonly AufmassKopf[], Speicherfehler> {
    return this.#fange(() => {
      this.#auftragsLvDa(auftragsLvId);
      return listeAufmasse(this.#db, auftragsLvId);
    });
  }

  /** `AufmassRepository.laden` (v1.4). */
  aufmassLaden(id: AufmassId): Ergebnis<AufmassZustand, Speicherfehler> {
    return this.#fange(() => {
      const aufmass = leseAufmass(this.#db, id);
      return aufmass === null
        ? abbruch('nicht-gefunden', `Aufmaßblatt ${id} ist nicht vorhanden.`)
        : { aufmass };
    });
  }

  /** `RechnungRepository.auflisten` (v1.4): die Rechnungen des Auftrags-LV, ganz, nach Nummer. */
  rechnungenAuflisten(
    auftragsLvId: AuftragsLeistungsverzeichnisId,
  ): Ergebnis<readonly Rechnung[], Speicherfehler> {
    return this.#fange(() => {
      this.#auftragsLvDa(auftragsLvId);
      return leseRechnungen(this.#db, auftragsLvId);
    });
  }

  /** `RechnungRepository.laden` (v1.4). */
  rechnungLaden(id: RechnungId): Ergebnis<RechnungZustand, Speicherfehler> {
    return this.#fange(() => {
      const rechnung = leseRechnung(this.#db, id);
      return rechnung === null
        ? abbruch('nicht-gefunden', `Rechnung ${id} ist nicht vorhanden.`)
        : { rechnung };
    });
  }

  /** `KostenermittlungRepository.auflisten` (v1.4): die Kostenermittlungen des Projekts ohne Einträge, nach Name. */
  kostenermittlungenAuflisten(
    projektId: ProjektId,
  ): Ergebnis<readonly KostenermittlungUebersicht[], Speicherfehler> {
    return this.#fange(() => {
      this.#projektDa(projektId);
      return listeKostenermittlungen(this.#db, projektId);
    });
  }

  /** `KostenermittlungRepository.laden` (v1.4). */
  kostenermittlungLaden(id: KostenermittlungId): Ergebnis<KostenermittlungZustand, Speicherfehler> {
    return this.#fange(() => {
      const kostenermittlung = leseKostenermittlung(this.#db, id);
      return kostenermittlung === null
        ? abbruch('nicht-gefunden', `Kostenermittlung ${id} ist nicht vorhanden.`)
        : { kostenermittlung };
    });
  }

  // --- Aggregate aus v1.6 (Ticket 106) -----------------------------------------------------------------------------------

  /** `BauwerksmodellRepository.auflisten`: die Köpfe mit der Zahl der Bauteile, ohne Struktur und Bauteile zu lesen. */
  bauwerksmodelleAuflisten(
    projektId: ProjektId,
  ): Ergebnis<readonly BauwerksmodellUebersicht[], Speicherfehler> {
    return this.#fange(() => {
      this.#projektDa(projektId);
      return listeBauwerksmodelle(this.#db, projektId);
    });
  }

  /** `BauwerksmodellRepository.laden`: das ganze Modell, ohne die Bytes der Datei. */
  bauwerksmodellLaden(id: BauwerksmodellId): Ergebnis<BauwerksmodellZustand, Speicherfehler> {
    return this.#fange(() => {
      const bauwerksmodell = leseBauwerksmodell(this.#db, id);
      return bauwerksmodell === null
        ? abbruch('nicht-gefunden', `Bauwerksmodell ${id} ist nicht vorhanden.`)
        : { bauwerksmodell };
    });
  }

  /** Liest ein Aggregat oder bricht mit `nicht-gefunden` ab. */
  #eines<T, K extends string>(
    lesen: () => T | null,
    was: string,
    schluessel: K,
  ): Ergebnis<{ readonly [P in K]: T }, Speicherfehler> {
    return this.#fange(() => {
      const wert = lesen();
      return wert === null
        ? abbruch('nicht-gefunden', `${was} ist nicht vorhanden.`)
        : ({ [schluessel]: wert } as { readonly [P in K]: T });
    });
  }

  /** Eine Liste des Projekts; unbekanntes Projekt: `nicht-gefunden`. */
  #liste<T>(projektId: ProjektId, f: () => T): Ergebnis<T, Speicherfehler> {
    return this.#fange(() => {
      this.#projektDa(projektId);
      return f();
    });
  }

  /** `BauzeitenplanRepository.auflisten`: die Pläne ohne Vorgänge, nach Name. */
  bauzeitenplaeneAuflisten(
    projektId: ProjektId,
  ): Ergebnis<readonly BauzeitenplanUebersicht[], Speicherfehler> {
    return this.#liste(projektId, () => listeBauzeitenplaene(this.#db, projektId));
  }

  bauzeitenplanLaden(id: BauzeitenplanId): Ergebnis<BauzeitenplanZustand, Speicherfehler> {
    return this.#eines(() => leseBauzeitenplan(this.#db, id), `Bauzeitenplan ${id}`, 'bauzeitenplan');
  }

  /** `HonorarberechnungRepository.auflisten`: ohne Objekte, nach Name. */
  honorarberechnungenAuflisten(
    projektId: ProjektId,
  ): Ergebnis<readonly HonorarberechnungUebersicht[], Speicherfehler> {
    return this.#liste(projektId, () => listeHonorarberechnungen(this.#db, projektId));
  }

  honorarberechnungLaden(id: HonorarberechnungId): Ergebnis<HonorarberechnungZustand, Speicherfehler> {
    return this.#eines(
      () => leseHonorarberechnung(this.#db, id),
      `Honorarberechnung ${id}`,
      'honorarberechnung',
    );
  }

  /** `MangelRepository.auflisten`: die Mängel ganz, nach Nummer. */
  maengelAuflisten(projektId: ProjektId): Ergebnis<readonly Mangel[], Speicherfehler> {
    return this.#liste(projektId, () => listeMaengel(this.#db, projektId));
  }

  mangelLaden(id: MangelId): Ergebnis<MangelZustand, Speicherfehler> {
    return this.#eines(() => leseMangel(this.#db, id), `Mangel ${id}`, 'mangel');
  }

  /** `BautagebuchRepository.auflisten`: die Einträge ganz, nach Datum. */
  bautagebuchAuflisten(projektId: ProjektId): Ergebnis<readonly Bautagebucheintrag[], Speicherfehler> {
    return this.#liste(projektId, () => listeBautagebuch(this.#db, projektId));
  }

  bautagebucheintragLaden(id: BautagebucheintragId): Ergebnis<BautagebucheintragZustand, Speicherfehler> {
    return this.#eines(
      () => leseBautagebucheintrag(this.#db, id),
      `Bautagebucheintrag ${id}`,
      'bautagebucheintrag',
    );
  }

  // --- Modelldateien (`Modelldateiablage`, v1.6; D-51) ------------------------------------------------------------------

  /**
   * `Modelldateiablage.ablegen`: SHA-256 der unkomprimierten Bytes (Web Crypto, asynchron vor der Transaktion), dann die Bytes
   * mit deflate-raw komprimiert ablegen. Idempotent; schon abgelegte Bytes werden nicht noch einmal komprimiert. Kein Befehl:
   * kein Protokolleintrag, kein ChangeSet. Läuft in der Reihe von `anwenden` (ein Schreiber).
   */
  modelldateiAblegen(bytes: Uint8Array): Promise<Ergebnis<string, Speicherfehler>> {
    const lauf = this.#reihe.then(() => this.#ablegenDann(bytes));
    this.#reihe = lauf;
    return lauf;
  }

  async #ablegenDann(bytes: Uint8Array): Promise<Ergebnis<string, Speicherfehler>> {
    if (this.#geschlossen) return GESCHLOSSEN();
    if (!(bytes instanceof Uint8Array))
      return fehler('unbekannt', 'Modelldateiablage: ablegen erwartet die Bytes der Datei (Uint8Array).');
    let hash: string;
    try {
      hash = await sha256Hex(bytes);
    } catch (x) {
      return { ok: false, fehler: fehlerAusAusnahme(x) };
    }
    return this.#fange(() => {
      if (modelldateiGroesse(this.#db, hash) === null)
        transaktion(this.#db, () => {
          schreibeModelldatei(this.#db, hash, bytes.length, deflateRaw(bytes));
        });
      return hash;
    });
  }

  /** `Modelldateiablage.laden`: die abgelegten Bytes unverändert; ein Hash ohne Bytes: `nicht-gefunden`. */
  modelldateiLaden(hash: string): Ergebnis<Uint8Array, Speicherfehler> {
    return this.#fange(() => {
      const d = leseModelldatei(this.#db, hash);
      if (d === null) return abbruch('nicht-gefunden', `Die Modelldatei ${hash} ist nicht abgelegt.`);
      const bytes = inflateRaw(d.inhalt);
      if (bytes.length !== d.groesse)
        abbruch('datei-ungueltig', `Modelldatei ${hash}: Die Länge der Bytes passt nicht zur Ablage.`);
      return bytes;
    });
  }

  /** `Modelldateiablage.vorhanden`. */
  modelldateiVorhanden(hash: string): Ergebnis<boolean, Speicherfehler> {
    return this.#fange(() => modelldateiGroesse(this.#db, hash) !== null);
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
          case 'aufmass':
            wendeAufmassAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'rechnung':
            wendeRechnungAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'kostenermittlung':
            wendeKostenermittlungAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'bauwerksmodell':
            wendeBauwerksmodellAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'bauzeitenplan':
            wendeBauzeitenplanAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'honorarberechnung':
            wendeHonorarberechnungAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'mangel':
            wendeMangelAn(this.#db, changeSet, eintrag.projektId);
            break;
          case 'bautagebucheintrag':
            wendeBautagebucheintragAn(this.#db, changeSet, eintrag.projektId);
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
