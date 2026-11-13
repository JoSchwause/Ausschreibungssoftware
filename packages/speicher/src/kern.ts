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
  Einstellungen,
  EinstellungenChangeSet,
  EinstellungenProtokolleintrag,
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
  ProjektdateiEinleseergebnis,
  ProjektId,
  Projektuebersicht,
  Protokolleintrag,
  Speicherfehler,
} from '@tethys/vertrag';
import { aggregatDes, wendeAn } from './aggregatarten';
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
  leseEinstellungen,
  leseEinstellungsprotokoll,
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
  modelldateiZeichen,
} from './lesen';
import { migriere, MIGRATIONEN, type Migration } from './migrationen';
import {
  baueProjektdatei,
  leseProjektdatei,
  pruefeModelldateienDerDatei,
  schreibeProjektdatei,
  uebernimmEinstellungenDerDatei,
} from './projektdatei';
import type { Kennungsbedarf, Kennungsvorrat } from './kennungen';
import { alsKopie, kennungsbedarf } from './kopie';
import {
  gibUngenutzteModelldateienFrei,
  schreibeModelldatei,
  schreibeProtokolleintrag,
  schreibeEinstellungsprotokolleintrag,
  wendeEinstellungenAn,
} from './schreiben';
import { transaktion, type Datenbank, type SqlZeile } from './sql';
import type { Migrationsbefund } from './summenmigration';

/**
 * Optionen von `SpeicherKern.projektdateiEinlesen`: wie `ProjektdateiEinleseoptionen` des Vertrags, die Kennungen der Kopie aber
 * als Daten (`Kennungsvorrat`), weil die `IdQuelle` nicht über die Grenze zum Worker kommt (der Client zieht sie, `client.ts`).
 */
export interface Einleseoptionen {
  readonly alsKopie?: { readonly kennungen: Kennungsvorrat; readonly name: string };
  /** Wie im Vertrag (D-82 M1): Kopf des Eintrags, unter dem die Übernahme der Einstellungen ins Einstellungsprotokoll geht. */
  readonly einstellungsuebernahme?: Pick<EinstellungenProtokolleintrag, 'id' | 'wer' | 'wann'>;
}

/**
 * `Rueckgaengig` und `Wiederholen` im Einstellungsprotokoll (D-82 M1, wie `pruefeHistorienbezug` beim Projekt): `protokollId`
 * muss auf einen ursprünglichen Befehl in diesem Protokoll zeigen, nicht auf einen anderen Historienbefehl; sonst `konflikt`.
 */
function pruefeEinstellungshistorie(db: Datenbank, e: EinstellungenProtokolleintrag): void {
  const b = e.befehl;
  if (b.art !== 'Rueckgaengig' && b.art !== 'Wiederholen') return;
  const z = db.zeilen(`SELECT ${ARTEN_DES_BEFEHLS} FROM einstellungen_protokoll WHERE id = ?`, [
    b.protokollId,
  ])[0];
  if (z === undefined || istHistorienbefehl(z))
    abbruch(
      'konflikt',
      `Konflikt: ${b.art} verweist auf ${b.protokollId}, keinen ursprünglichen Befehl im Einstellungsprotokoll; ` +
        'es wurde nichts geschrieben.',
    );
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
function pruefeHistorienbezug(db: Datenbank, e: Protokolleintrag, cs: ChangeSet): string | null {
  const b = e.befehl;
  if (b.art !== 'Rueckgaengig' && b.art !== 'Wiederholen') return null;
  if (cs.art === 'projekt' && cs.projekt.vorher === null) return null;
  const z = db.zeilen(
    `SELECT projekt_id, aggregat_art, aggregat_id, ${ARTEN_DES_BEFEHLS} FROM protokoll WHERE id = ?`,
    [b.protokollId],
  )[0];
  const passt =
    z !== undefined &&
    z['projekt_id'] === e.projektId &&
    z['aggregat_art'] === e.aggregat.art &&
    z['aggregat_id'] === e.aggregat.id &&
    !istHistorienbefehl(z);
  if (!passt) {
    abbruch(
      'konflikt',
      `Konflikt: ${b.art} verweist auf ${b.protokollId}, keinen ursprünglichen Befehl an ${e.aggregat.art} ` +
        `${e.aggregat.id} in diesem Projekt; es wurde nichts geschrieben.`,
    );
  }
  return artDesBefehls(z);
}

/**
 * Die Art eines gespeicherten Befehls ohne ihn ganz zu lesen (ein Befehl kann groß sein, etwa 5.000 Bauteilzuordnungen): SQLite
 * liest `art` und bei einer Kurzfassung `kopf.art` aus dem JSON.
 */
const ARTEN_DES_BEFEHLS = `json_extract(befehl, '$.art') AS befehlsart, json_extract(befehl, '$.kopf.art') AS kopfart`;

/** Die Art des Befehls einer Zeile mit `ARTEN_DES_BEFEHLS`; bei einer Kurzfassung die des Massenbefehls. */
function artDesBefehls(z: SqlZeile | undefined): string | null {
  const art = z?.['befehlsart'] === 'Befehlskurzfassung' ? z['kopfart'] : z?.['befehlsart'];
  return typeof art === 'string' ? art : null;
}

/** Ist der gespeicherte Befehl der Zeile (mit `ARTEN_DES_BEFEHLS`) ein `Rueckgaengig` oder `Wiederholen`? */
function istHistorienbefehl(z: SqlZeile): boolean {
  return z['befehlsart'] === 'Rueckgaengig' || z['befehlsart'] === 'Wiederholen';
}

/** Die Art des Befehls eines Eintrags; bei einer Kurzfassung die des Massenbefehls. */
const befehlsart = (e: Protokolleintrag): string =>
  e.befehl.art === 'Befehlskurzfassung' ? e.befehl.kopf.art : e.befehl.art;

/**
 * Grenze der exportierten Projektdatei in Zeichen (D-51, D-106.6): 500.000.000, mit Abstand unter der größten Zeichenkette von
 * V8 (2^29 − 24 = 536.870.888 Zeichen, „etwa 512 MB Text“), damit der Export laut fehlschlägt, bevor die Laufzeit es tut.
 */
export const GRENZE_ZEICHEN = 500_000_000;

const GESCHLOSSEN = (): Ergebnis<never, Speicherfehler> =>
  fehler('gesperrt', 'Der Speicher ist geschlossen; für weitere Aufrufe muss er neu geöffnet werden.');

export class SpeicherKern {
  // Echte private Felder (`#`): Die Datenbank ist von außen nicht erreichbar, auch nicht zur Laufzeit (A5).
  readonly #db: Datenbank;
  readonly #migrationen: readonly Migration[];
  /** Befunde der Summen-Neuberechnung beim Öffnen und bei jedem Import einer alten Datei (D-17). */
  readonly #befunde: Migrationsbefund[];
  /** Höchste Länge der exportierten Projektdatei in Zeichen (D-51); darüber `datei-zu-gross`. */
  readonly #grenzeZeichen: number;
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

  /** Ist der Speicher geschlossen? (Als Methode, damit eine Prüfung nach `await` nicht als überflüssig gilt.) */
  #istGeschlossen(): boolean {
    return this.#geschlossen;
  }

  private constructor(
    db: Datenbank,
    migrationen: readonly Migration[],
    befunde: Migrationsbefund[],
    grenzeZeichen: number,
  ) {
    this.#db = db;
    this.#migrationen = migrationen;
    this.#befunde = befunde;
    this.#grenzeZeichen = grenzeZeichen;
  }

  /**
   * Schaltet Fremdschlüssel ein, bringt das Schema auf den aktuellen Stand (A8) und gibt ungenutzte Modelldateien frei
   * (D-97.5). `optionen.grenzeZeichen` nur für Tests (der Export über der Grenze, ohne 500 MB Text zu bauen).
   */
  static oeffnen(
    db: Datenbank,
    migrationen: readonly Migration[] = MIGRATIONEN,
    optionen: { readonly grenzeZeichen?: number } = {},
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
    return ok(new SpeicherKern(db, migrationen, befunde, optionen.grenzeZeichen ?? GRENZE_ZEICHEN));
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
        // Der Anlass des Schreibens (`Schreibanlass`): bei Rückgängig und Wiederholen mit der Art des ursprünglichen Befehls.
        const ursprung = pruefeHistorienbezug(this.#db, eintrag, changeSet);
        wendeAn(this.#db, changeSet, eintrag.projektId, {
          wann: eintrag.wann,
          befehl: befehlsart(eintrag),
          ursprung,
        });
        // Mit dem Projekt ist auch sein Protokoll gelöscht; der Eintrag des Löschbefehls hat kein Projekt mehr, dem er
        // gehören könnte (siehe `wendeProjektAn`, D-31.1).
        const projektGeloescht = changeSet.art === 'projekt' && changeSet.projekt.nachher === null;
        if (!projektGeloescht) schreibeProtokolleintrag(this.#db, eintrag);
      });
    });
  }

  // --- Einstellungen des Geräts (v1.7a, D-73, D-127.8; `EinstellungenRepository`) ---------------------------------------

  /** `EinstellungenRepository.laden`: ohne gespeicherte Einstellungen `LEERE_EINSTELLUNGEN` (kein `nicht-gefunden`). */
  einstellungenLaden(): Ergebnis<Einstellungen, Speicherfehler> {
    return this.#fange(() => leseEinstellungen(this.#db));
  }

  /**
   * `EinstellungenRepository.anwenden` (D-82 M1): Eintrag des Einstellungsprotokolls und ChangeSet in einer Transaktion, genau
   * ein Eintrag je Befehl (A5, ADR 0009); `konflikt` bei abweichendem Vorherstand oder einem `Rueckgaengig`/`Wiederholen`, das
   * auf keinen ursprünglichen Eintrag zeigt, und dann nichts geschrieben (Q5). Läuft in der Reihe von `anwenden`.
   */
  einstellungenAnwenden(
    eintrag: EinstellungenProtokolleintrag,
    changeSet: EinstellungenChangeSet,
  ): Promise<Ergebnis<void, Speicherfehler>> {
    const lauf = this.#reihe.then(() =>
      this.#fange(() => {
        transaktion(this.#db, () => {
          pruefeEinstellungshistorie(this.#db, eintrag);
          wendeEinstellungenAn(this.#db, changeSet);
          schreibeEinstellungsprotokolleintrag(this.#db, eintrag);
        });
      }),
    );
    this.#reihe = lauf;
    return lauf;
  }

  /** `EinstellungenRepository.protokoll` (D-82 M1): das Einstellungsprotokoll, ältester Eintrag zuerst. */
  einstellungenProtokoll(): Ergebnis<readonly EinstellungenProtokolleintrag[], Speicherfehler> {
    return this.#fange(() => leseEinstellungsprotokoll(this.#db));
  }

  // --- Projektdatei -----------------------------------------------------------------------------------------

  /**
   * Exportiert die Projektdatei. v1.6 (D-51): Würde der Text die Grenze für Zeichenketten erreichen (`grenzeZeichen`, Standard
   * `GRENZE_ZEICHEN`, unter der Grenze von V8), schlägt der Export mit `datei-zu-gross` fehl und kürzt nie (Q5). Geprüft
   * wird zuerst die Base64-Länge der Modelldateien (ohne sie zu lesen), dann der fertige Text; wirft die Laufzeit beim Bauen
   * des Texts selbst (`RangeError`), ist es derselbe Fehler.
   */
  projektdateiExportieren(projektId: ProjektId): Ergebnis<string, Speicherfehler> {
    return this.#fange(() => {
      const grenze = this.#grenzeZeichen;
      const zuGross = (n: string): never =>
        abbruch(
          'datei-zu-gross',
          `Die Projektdatei würde ${n} Zeichen lang, mehr als ${String(grenze)}; es entsteht keine Datei.`,
        );
      const modelle = modelldateiZeichen(this.#db, projektId);
      if (modelle > grenze) zuGross(`mindestens ${String(modelle)}`);
      let text: string;
      try {
        text = kanonischesJson(
          baueProjektdatei(
            this.#db,
            projektId,
            this.#migrationen[this.#migrationen.length - 1]?.version ?? 0,
          ),
        );
      } catch (e) {
        if (e instanceof RangeError) return zuGross('über die Grenze der Laufzeit hinaus');
        throw e;
      }
      if (text.length > grenze) zuGross(String(text.length));
      return text;
    });
  }

  /**
   * Importiert atomar (`Speicher.projektdateiImportieren`): wie `projektdateiEinlesen` ohne Optionen, ohne Bericht. Existiert
   * das Projekt schon, wird nichts überschrieben (Q5).
   */
  async projektdateiImportieren(inhalt: string): Promise<Ergebnis<ProjektId, Speicherfehler>> {
    const r = await this.projektdateiEinlesen(inhalt);
    return r.ok ? ok(r.wert.projektId) : r;
  }

  /**
   * Wie viele neue Kennungen je Art eine Kopie der Datei braucht (v1.7a, D-127.10). Der Client zieht sie aus der `IdQuelle` der
   * App und gibt sie `projektdateiEinlesen` mit (Funktionen kommen nicht über die Grenze zum Worker). Liest die Datei wie das
   * Einlesen selbst (gleiche Fehler), schreibt nichts.
   */
  projektdateiKennungsbedarf(inhalt: string): Ergebnis<Kennungsbedarf, Speicherfehler> {
    if (this.#geschlossen) return GESCHLOSSEN();
    const datei = leseProjektdatei(inhalt, this.#migrationen);
    return datei.ok ? this.#fange(() => kennungsbedarf(datei.wert)) : datei;
  }

  /**
   * `Speicher.projektdateiEinlesen` (v1.7a, D-127.9, D-127.10): liest atomar ein, wahlweise als Kopie (neue Kennungen aus
   * `optionen.alsKopie.kennungen`, siehe `kopie.ts`), und übernimmt aus dem Block `einstellungen` nur Fehlendes je Schlüssel. Der
   * Bericht sagt, was übernommen und was belassen wurde (`null`: die Datei trägt keinen Block). Ohne Kopie und mit vorhandenem
   * Projekt derselben Kennung: `existiert-bereits`, nichts geschrieben (Q5). v1.6 (D-51): Die Bytes der Modelldateien prüft das
   * Einlesen vor der Transaktion (SHA-256 über Web Crypto, asynchron); passt einer nicht, ist die ganze Datei `datei-ungueltig`.
   * Läuft in der Reihe von `anwenden` (ein Schreiber).
   */
  projektdateiEinlesen(
    inhalt: string,
    optionen: Einleseoptionen = {},
  ): Promise<Ergebnis<ProjektdateiEinleseergebnis, Speicherfehler>> {
    const lauf = this.#reihe.then(() => this.#einlesenDann(inhalt, optionen));
    this.#reihe = lauf;
    return lauf;
  }

  async #einlesenDann(
    inhalt: string,
    optionen: Einleseoptionen,
  ): Promise<Ergebnis<ProjektdateiEinleseergebnis, Speicherfehler>> {
    if (this.#geschlossen) return GESCHLOSSEN();
    const befunde: Migrationsbefund[] = [];
    const gelesen = leseProjektdatei(inhalt, this.#migrationen, befunde);
    if (!gelesen.ok) return gelesen;
    const kopie = optionen.alsKopie;
    const datei =
      kopie === undefined ? gelesen : fange(() => alsKopie(gelesen.wert, kopie.kennungen, kopie.name));
    if (!datei.ok) return datei;
    let bytes: Awaited<ReturnType<typeof pruefeModelldateienDerDatei>>;
    try {
      bytes = await pruefeModelldateienDerDatei(datei.wert);
    } catch (x) {
      return { ok: false, fehler: fehlerAusAusnahme(x) };
    }
    // Während des Wartens auf die Prüfsummen kann `schliessen` gekommen sein (es läuft nicht in der Reihe).
    if (this.#istGeschlossen()) return GESCHLOSSEN();
    const r = fange(() =>
      transaktion(this.#db, (): ProjektdateiEinleseergebnis => {
        if (leseProjekt(this.#db, datei.wert.projekt.id) !== null) {
          abbruch(
            'existiert-bereits',
            `Das Projekt ${datei.wert.projekt.id} existiert bereits; es wird nicht überschrieben.`,
          );
        }
        const projektId = schreibeProjektdatei(this.#db, datei.wert, bytes);
        return {
          projektId,
          einstellungen: uebernimmEinstellungenDerDatei(
            this.#db,
            datei.wert,
            optionen.einstellungsuebernahme,
          ),
        };
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
