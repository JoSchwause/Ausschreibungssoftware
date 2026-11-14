// SPDX-License-Identifier: AGPL-3.0-or-later
// Projekt samt Inhalt löschen (Vertrag v1.7c; E8, D-96; Ticket 161): das ChangeSet `projektbestand` schreiben, in der Transaktion
// des Aufrufers (`SpeicherKern.anwenden`). Lesarten D-160.3 (Formen), D-160.5 (Löschen), D-160.6 (Undo), D-160.7 (Modell-Bytes).
//
// - Löschen (beide `nachher: null`): Projekt samt Bietern und Bestand müssen dem gespeicherten Stand gleichen (kanonische Form wie
//   D-31.2), das gespeicherte Protokoll muss mit dem des Bestands beginnen (D-104), sonst `konflikt`; dann werden alle Zeilen des Projekts gelöscht, das Protokoll eingeschlossen. Der Eintrag des
//   Löschens bleibt nicht stehen (wie D-31.1). Einstellungen, ihr Protokoll und die Modell-Bytes bleiben (D-160.7).
// - Undo (beide `vorher: null`): über den Schreibweg des Einlesens (`dekodiereProjektdatei`, `schreibeProjektdatei`) mit denselben
//   Kennungen. Besteht das Projekt oder eine Kennung des Bestands schon oder fehlen Bytes einer genannten Modelldatei: `konflikt`.
//   Danach schreibt der Aufrufer den Eintrag des Undo wie jeden anderen.
// - Jede andere Form: `unbekannt`.

import type {
  Projekt,
  Projektbestand,
  ProjektbestandChangeSet,
  Projektdatei,
  ProjektId,
  Protokolleintrag,
} from '@tethys/vertrag';
import { vorhandeneKennungen } from './aggregatarten';
import { dekodiereProjektdatei } from './dekoder';
import { abbruch, SpeicherAbbruch } from './ergebnis';
import { kanonischKompakt } from './kanonisch';
import { base64 } from './komprimierung';
import { leseModelldatei, leseProjekt } from './lesen';
import { baueProjektdatei, schreibeProjektdatei } from './projektdatei';
import { loescheProjektMitInhalt } from './schreiben';
import type { Datenbank } from './sql';

const NICHT_IM_BESTAND = new Set(['schemaVersion', 'projekt', 'modelldateien', 'einstellungen']);

/** Der Bestand einer Projektdatei: ohne Schemaversion, Projekt, Modell-Bytes und Einstellungen (Vertrag, `Projektbestand`). */
export function bestandDer(d: Projektdatei): Projektbestand {
  return Object.fromEntries(
    Object.entries(d).filter(([k]) => !NICHT_IM_BESTAND.has(k)),
  ) as unknown as Projektbestand;
}

const konflikt = (was: string): never =>
  abbruch('konflikt', `Konflikt: ${was}; es wurde nichts geschrieben.`);

/** Was das Schreiben tun soll: löschen oder (Undo) wiederherstellen. Prüft Form und Protokollbezug (`unbekannt`). */
function richtung(e: Protokolleintrag, cs: ProjektbestandChangeSet): 'loeschen' | 'herstellen' {
  const { projekt, bestand } = cs;
  const loeschen =
    projekt.vorher !== null &&
    projekt.nachher === null &&
    bestand.vorher !== null &&
    bestand.nachher === null;
  const herstellen =
    projekt.vorher === null &&
    projekt.nachher !== null &&
    bestand.vorher === null &&
    bestand.nachher !== null;
  if (!loeschen && !herstellen)
    abbruch(
      'unbekannt',
      'ChangeSet „projektbestand“: nur Löschen (beide nachher null) oder Wiederherstellen (beide vorher null).',
    );
  const p = (projekt.vorher ?? projekt.nachher) as Projekt;
  if (p.id !== cs.projektId) abbruch('unbekannt', 'ChangeSet: projektId und Projekt.id weichen ab.');
  if (e.projektId !== cs.projektId || e.aggregat.art !== 'projekt' || e.aggregat.id !== cs.projektId)
    abbruch('unbekannt', 'Protokolleintrag und ChangeSet betreffen verschiedene Aggregate (projekt).');
  return loeschen ? 'loeschen' : 'herstellen';
}

/**
 * Schreibt ein ChangeSet `projektbestand` (in der Transaktion des Aufrufers). `schemaVersion` ist die aktuelle des Speichers.
 * Liefert, ob der Eintrag `e` ins Protokoll gehört: nach dem Löschen nicht (es gibt kein Projekt mehr), nach dem Undo ja.
 */
export function wendeProjektbestandAn(
  db: Datenbank,
  e: Protokolleintrag,
  cs: ProjektbestandChangeSet,
  schemaVersion: number,
): boolean {
  if (richtung(e, cs) === 'loeschen') {
    loesche(
      db,
      cs.projektId,
      cs.projekt.vorher as Projekt,
      cs.bestand.vorher as Projektbestand,
      schemaVersion,
    );
    return false;
  }
  stelleHer(db, cs.projekt.nachher as Projekt, cs.bestand.nachher as Projektbestand, schemaVersion);
  return true;
}

function loesche(
  db: Datenbank,
  id: ProjektId,
  projekt: Projekt,
  bestand: Projektbestand,
  schemaVersion: number,
): void {
  const gespeichert = leseProjekt(db, id);
  if (gespeichert === null) return abbruch('nicht-gefunden', `Projekt ${id} ist nicht vorhanden.`);
  if (kanonischKompakt(gespeichert) !== kanonischKompakt(projekt))
    konflikt('Der Vorherstand des Projekts passt nicht zum gespeicherten Stand');
  const { protokoll: gespeichertesProtokoll, ...gespeicherterRest } = bestandDer(
    baueProjektdatei(db, id, schemaVersion),
  );
  const { protokoll, ...rest } = bestand;
  const abweichung = `Der Bestand im ChangeSet ist nicht der gespeicherte Bestand von Projekt ${id}`;
  if (kanonischKompakt(gespeicherterRest) !== kanonischKompakt(rest)) konflikt(abweichung);
  // D-104: Das gespeicherte Protokoll muss mit dem des Bestands beginnen; danach angehängte Einträge (Rückgängig und
  // Wiederholen dieses Löschens) sind erlaubt und gehen mit dem Projekt. Sonst schlüge jedes Wiederholen fehl.
  if (
    !Array.isArray(protokoll) ||
    protokoll.length > gespeichertesProtokoll.length ||
    protokoll.some((x, i) => kanonischKompakt(x) !== kanonischKompakt(gespeichertesProtokoll[i]))
  )
    konflikt(abweichung);
  loescheProjektMitInhalt(db, id);
}

function stelleHer(db: Datenbank, projekt: Projekt, bestand: Projektbestand, schemaVersion: number): void {
  // Die Bytes stehen nie im ChangeSet (D-51); das Undo findet sie in der Ablage, solange der Speicher nicht neu geöffnet wurde.
  const hashes = [...new Set((bestand.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell.datei.hash))].sort();
  const modelldateien = hashes.map((hash) => {
    const d = leseModelldatei(db, hash);
    return d === null
      ? konflikt(`Die Bytes der Modelldatei ${hash} sind nicht mehr abgelegt`)
      : { hash, inhalt: base64(d.inhalt) };
  });
  let datei: Projektdatei;
  try {
    // Dieselbe strenge Prüfung wie beim Einlesen einer Datei.
    datei = dekodiereProjektdatei(
      { ...bestand, schemaVersion, projekt, ...(modelldateien.length > 0 ? { modelldateien } : {}) },
      schemaVersion,
    );
  } catch (x) {
    if (x instanceof SpeicherAbbruch && x.fehler.code === 'datei-ungueltig')
      return abbruch('unbekannt', `ChangeSet „projektbestand“: ${x.fehler.meldung}`);
    throw x;
  }
  const da = vorhandeneKennungen(db, datei);
  if (da.length > 0) konflikt(`Schon vorhanden: ${da.slice(0, 5).join(', ')}${da.length > 5 ? ' …' : ''}`);
  // Ohne Bytes: Sie sind schon abgelegt (oben geprüft).
  schreibeProjektdatei(db, datei);
}
