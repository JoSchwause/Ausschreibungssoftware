// SPDX-License-Identifier: AGPL-3.0-or-later
// JSON-Projektdatei (G-56): Aufbau aus der Datenbank, Hebung alter Dateiversionen und Schreiben beim Import.

import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  Bauwerksmodell,
  Ergebnis,
  LeistungsverzeichnisId,
  Projektdatei,
  ProjektId,
  Speicherfehler,
} from '@tethys/vertrag';
import { dekodiereProjektdatei } from './dekoder';
import { abbruch, fehler, SpeicherAbbruch } from './ergebnis';
import { fange, fehlerAusAusnahme, istAusgabefehler } from './fehler';
import { ausBase64, base64, inflateRaw, sha256Hex } from './komprimierung';
import {
  aggregateDesProjekts,
  aggregateV16DesProjekts,
  modelldateienDesProjekts,
  aggregatIds,
  leseAngebot,
  leseAuftragsLv,
  leseLv,
  leseLvStaendeDesProjekts,
  leseProjekt,
  leseProtokoll,
} from './lesen';
import type { Migration } from './migrationen';
import {
  schreibeLvStand,
  schreibeProtokolleintrag,
  wendeAngebotAn,
  wendeAufmassAn,
  schreibeModelldatei,
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
import { pruefeNachtragsbezuege } from './bezuege';
import type { Datenbank } from './sql';
import { summenDerDateiNeuRechnen, type Migrationsbefund } from './summenmigration';
import { LEERES_SUMMENVORHER } from './summenvorher';

/** Baut die Projektdatei im Stand der aktuellen Schemaversion. Reihenfolge der Listen: nach Kennung. */
export function baueProjektdatei(db: Datenbank, id: ProjektId, schemaVersion: number): Projektdatei {
  const projekt = leseProjekt(db, id);
  if (projekt === null) return abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`);
  const holen = <T>(wert: T | null, was: string): T =>
    wert === null ? abbruch('datei-ungueltig', `${was} verschwand während des Exports.`) : wert;
  const staende = leseLvStaendeDesProjekts(db, id);
  const { aufmasse, rechnungen, kostenermittlungen } = aggregateDesProjekts(db, id);
  const v16 = aggregateV16DesProjekts(db, id);
  // Die Bytes stehen, wie sie abgelegt sind (deflate-raw), als Base64 in der Datei (D-51); nichts wird neu komprimiert.
  const modelldateien = modelldateienDesProjekts(db, id).map((m) => ({
    hash: m.hash,
    inhalt: base64(m.inhalt),
  }));
  const liste = <K extends string, T>(name: K, werte: readonly T[]): { [P in K]?: readonly T[] } =>
    (werte.length > 0 ? { [name]: werte } : {}) as { [P in K]?: readonly T[] };
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
    // Schema 3: fehlt, wenn es keine Stände gibt (Vertrag: „Fehlt: keine“); so bleibt eine Datei ohne Stände gleich.
    ...(staende.length > 0 ? { lvStaende: staende } : {}),
    // Schema 5 (v1.4): wie `lvStaende` nur, wenn es welche gibt; nach Kennung wie die übrigen Listen.
    ...(aufmasse.length > 0 ? { aufmasse: aufmasse.map((aufmass) => ({ aufmass })) } : {}),
    ...(rechnungen.length > 0 ? { rechnungen: rechnungen.map((rechnung) => ({ rechnung })) } : {}),
    ...(kostenermittlungen.length > 0
      ? { kostenermittlungen: kostenermittlungen.map((kostenermittlung) => ({ kostenermittlung })) }
      : {}),
    // Schema 6 (v1.6): ebenso nur, wenn es welche gibt (eine Datei ohne sie bleibt bis auf die Version gleich, A8);
    // `modelldateien` nach Hash, genau die, die die Modelle nennen.
    ...liste(
      'bauwerksmodelle',
      v16.bauwerksmodelle.map((bauwerksmodell) => ({ bauwerksmodell })),
    ),
    ...liste('modelldateien', modelldateien),
    ...liste(
      'bauzeitenplaene',
      v16.bauzeitenplaene.map((bauzeitenplan) => ({ bauzeitenplan })),
    ),
    ...liste(
      'honorarberechnungen',
      v16.honorarberechnungen.map((honorarberechnung) => ({ honorarberechnung })),
    ),
    ...liste(
      'maengel',
      v16.maengel.map((mangel) => ({ mangel })),
    ),
    ...liste(
      'bautagebuch',
      v16.bautagebuch.map((bautagebucheintrag) => ({ bautagebucheintrag })),
    ),
  };
}

/** Die Bytes einer Modelldatei aus der Projektdatei: komprimiert wie in der Datei, dazu die Länge der entpackten Bytes. */
export interface Dateibytes {
  readonly groesse: number;
  readonly komprimiert: Uint8Array;
}

/**
 * Prüft die Bytes der Modelldateien einer gelesenen Projektdatei (D-51, Lesart an `Projektdatei.modelldateien`): Base64 mit
 * Auffüllung, gültiges deflate-raw, SHA-256 der entpackten Bytes gleich `hash`, Länge gleich `datei.groesse` jedes Modells,
 * das den Hash nennt. Sonst `datei-ungueltig`, bevor irgendetwas geschrieben wird (nichts halb importiert, Q5). Asynchron
 * (Web Crypto), deshalb vor der Transaktion des Imports.
 */
export async function pruefeModelldateienDerDatei(d: Projektdatei): Promise<ReadonlyMap<string, Dateibytes>> {
  const ergebnis = new Map<string, Dateibytes>();
  for (const [i, e] of (d.modelldateien ?? []).entries()) {
    const pfad = `$.modelldateien[${String(i)}].inhalt`;
    const komprimiert = ausBase64(e.inhalt);
    if (komprimiert === null)
      return abbruch('datei-ungueltig', `${pfad}: kein Base64 (RFC 4648, mit Auffüllung)`);
    let roh: Uint8Array;
    try {
      roh = inflateRaw(komprimiert);
    } catch {
      return abbruch('datei-ungueltig', `${pfad}: kein deflate-raw (RFC 1951)`);
    }
    if ((await sha256Hex(roh)) !== e.hash)
      abbruch('datei-ungueltig', `${pfad}: Der SHA-256 der entpackten Bytes ist nicht ${e.hash}.`);
    for (const z of d.bauwerksmodelle ?? [])
      if (z.bauwerksmodell.datei.hash === e.hash && z.bauwerksmodell.datei.groesse !== roh.length)
        abbruch(
          'datei-ungueltig',
          `Bauwerksmodell ${z.bauwerksmodell.id}: Die Modelldatei hat ${String(roh.length)} Bytes, nicht ${String(z.bauwerksmodell.datei.groesse)}.`,
        );
    ergebnis.set(e.hash, { groesse: roh.length, komprimiert });
  }
  return ergebnis;
}

/** Die Modelle in einer Reihenfolge, in der jeder Vorgänger vor seinem Nachfolger steht (sonst in der Reihenfolge der Datei). */
function vorgaengerZuerst(modelle: readonly Bauwerksmodell[]): Bauwerksmodell[] {
  const geschrieben = new Set<string>();
  const folge: Bauwerksmodell[] = [];
  let rest = [...modelle];
  while (rest.length > 0) {
    const bereit = rest.filter((m) => m.vorgaengerId === null || geschrieben.has(m.vorgaengerId));
    // Ein Vorgänger, den es in der Datei nicht gibt (oder ein Ring): Der erste übrige geht trotzdem, sein Anlegen weist ab.
    const jetzt = bereit.length > 0 ? bereit : rest.slice(0, 1);
    for (const m of jetzt) {
      folge.push(m);
      geschrieben.add(m.id);
    }
    rest = rest.filter((m) => !geschrieben.has(m.id));
  }
  return folge;
}

/**
 * Liest den JSON-Text, hebt eine ältere Dateiversion Schritt für Schritt auf die aktuelle (A8) und prüft das
 * Ergebnis streng gegen die aktuelle Form. Verlangt ein Schritt es, rechnet der Kern danach alle Summen neu (D-17);
 * Befunde dazu landen in `befunde`.
 */
export function leseProjektdatei(
  inhalt: string,
  migrationen: readonly Migration[],
  befunde: Migrationsbefund[] = [],
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
  let summenNeu = false;
  for (const m of migrationen) {
    if (m.version <= von) continue;
    summenNeu ||= m.summenNeuRechnen === true;
    if (m.datei === null) {
      return fehler('migration-fehlgeschlagen', `Migration ${String(m.version)} hat keine Dateimigration.`);
    }
    try {
      aktuell = { ...m.datei(aktuell), schemaVersion: m.version };
    } catch (e) {
      // Eine Datei, die schon in ihrer alten Version nicht stimmt, ist ungültig, nicht die Migration fehlgeschlagen.
      if (e instanceof SpeicherAbbruch && e.fehler.code === 'datei-ungueltig')
        return { ok: false, fehler: e.fehler };
      return fehler(
        'migration-fehlgeschlagen',
        `Dateimigration auf Version ${String(m.version)} fehlgeschlagen: ${fehlerAusAusnahme(e).meldung}`,
      );
    }
  }
  const datei = fange(() => dekodiereProjektdatei(aktuell, ziel));
  if (!datei.ok || !summenNeu) return datei;
  const neu = summenDerDateiNeuRechnen(datei.wert);
  befunde.push(...neu.befunde);
  return { ok: true, wert: neu.datei };
}

/**
 * Schreibt eine geprüfte Projektdatei in die Tabellen (innerhalb der Transaktion des Aufrufers). Es werden
 * dieselben Schreibfunktionen wie bei `anwenden` benutzt. Das Protokoll der Datei wird unverändert
 * übernommen; der Import selbst ist kein Befehl und erzeugt keinen Eintrag.
 */
export function schreibeProjektdatei(
  db: Datenbank,
  d: Projektdatei,
  dateibytes: ReadonlyMap<string, Dateibytes> = new Map(),
): ProjektId {
  const projektId = d.projekt.id;
  try {
    // Schema 6 (D-51): zuerst die geprüften Bytes; schon abgelegte bleiben unverändert (gleicher Hash, gleiche Bytes).
    for (const [hash, b] of dateibytes) schreibeModelldatei(db, hash, b.groesse, b.komprimiert);
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
          summen: { ...z.summen, vorher: LEERES_SUMMENVORHER },
          ...(z.papierkorb === undefined
            ? {}
            : { papierkorb: { hinzugefuegt: z.papierkorb, geaendert: [], entfernt: [] } }),
        },
        projektId,
        undefined,
        false, // Nachtragsangaben: Das Auftrags-LV kommt erst unten (siehe `pruefeNachtragsbezuege`).
      );
    }
    for (const s of d.lvStaende ?? []) schreibeLvStand(db, s);
    for (const z of d.angebote) {
      const { positionen, ...kopf } = z.angebot;
      wendeAngebotAn(
        db,
        {
          art: 'angebot',
          angebotId: kopf.id,
          kopf: { vorher: null, nachher: kopf },
          positionen: { hinzugefuegt: positionen, geaendert: [], entfernt: [] },
          summen: { ...z.summen, vorher: LEERES_SUMMENVORHER },
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
          summen: { ...z.summen, vorher: LEERES_SUMMENVORHER },
        },
        projektId,
      );
    }
    // Schema 5 (v1.4): Blätter vor Rechnungen (`aufmassIds`), Rechnungen nach Nummer (Invariante der Freigaben, D-34 (7):
    // in der Datei stehen sie nach Kennung).
    for (const z of d.aufmasse ?? [])
      wendeAufmassAn(
        db,
        { art: 'aufmass', aufmassId: z.aufmass.id, aufmass: { vorher: null, nachher: z.aufmass } },
        projektId,
      );
    const rechnungen = [...(d.rechnungen ?? [])].sort((a, b) => a.rechnung.nummer - b.rechnung.nummer);
    for (const z of rechnungen)
      wendeRechnungAn(
        db,
        { art: 'rechnung', rechnungId: z.rechnung.id, rechnung: { vorher: null, nachher: z.rechnung } },
        projektId,
      );
    for (const z of d.kostenermittlungen ?? [])
      wendeKostenermittlungAn(
        db,
        {
          art: 'kostenermittlung',
          kostenermittlungId: z.kostenermittlung.id,
          kostenermittlung: { vorher: null, nachher: z.kostenermittlung },
        },
        projektId,
      );
    // Schema 6 (v1.6): Modelle nach den Bytes und vor den Mängeln, Vorgänger zuerst; Honorarberechnungen nach den
    // Kostenermittlungen, Mängel nach Auftrags-LV und Modellen (starke Verweise, D-97.6).
    for (const m of vorgaengerZuerst((d.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell))) {
      const { struktur, bauteile, ...kopf } = m;
      wendeBauwerksmodellAn(
        db,
        {
          art: 'bauwerksmodell',
          bauwerksmodellId: m.id,
          kopf: { vorher: null, nachher: kopf },
          inhalt: { vorher: null, nachher: { struktur, bauteile } },
        },
        projektId,
      );
    }
    for (const z of d.bauzeitenplaene ?? [])
      wendeBauzeitenplanAn(
        db,
        {
          art: 'bauzeitenplan',
          bauzeitenplanId: z.bauzeitenplan.id,
          bauzeitenplan: { vorher: null, nachher: z.bauzeitenplan },
        },
        projektId,
      );
    for (const z of d.honorarberechnungen ?? [])
      wendeHonorarberechnungAn(
        db,
        {
          art: 'honorarberechnung',
          honorarberechnungId: z.honorarberechnung.id,
          honorarberechnung: { vorher: null, nachher: z.honorarberechnung },
        },
        projektId,
      );
    for (const z of d.maengel ?? [])
      wendeMangelAn(
        db,
        { art: 'mangel', mangelId: z.mangel.id, mangel: { vorher: null, nachher: z.mangel } },
        projektId,
      );
    for (const z of d.bautagebuch ?? [])
      wendeBautagebucheintragAn(
        db,
        {
          art: 'bautagebucheintrag',
          bautagebucheintragId: z.bautagebucheintrag.id,
          bautagebucheintrag: { vorher: null, nachher: z.bautagebucheintrag },
        },
        projektId,
      );
    pruefeNachtragsbezuege(db, projektId);
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
