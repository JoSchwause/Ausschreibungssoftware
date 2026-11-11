// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87 (M3): GAEB X31 (Mengenermittlung) in der App, über `gaeb` (Ticket 83). Einlesen liefert die Zeilen eines
// neuen Blatts; die Menge je Position rechnet `mengen` aus dem Ansatz (D-22, D-36: `gaeb` rechnet nie), eine Zeile in
// der Textform oder mit Fehler bleibt ohne Menge (Q5). Ausgeben schreibt ein Blatt; Datum und Uhrzeit von der Uhr der App
// (A2). Rein: Die Oberfläche zeigt die Befunde (U5) und schickt den Befehl über den Befehlsweg (A5).

import { aufmassAlsX31, type ExportVersion } from '@tethys/gaeb';
import { x31Lesen } from '@tethys/gaeb';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type { Aufmass, Aufmassposition, AuftragsLvZustand, Pruefbefund } from '@tethys/vertrag';
import { ERSATZ_LV, dateinameSauber } from '../dateiname';
import { PROGRAMMNAME } from '../gaeb/gaeb';

export interface X31Vorschau {
  readonly befunde: readonly Pruefbefund[];
  /** Die Zeilen des neuen Blatts, Menge aus dem Ansatz gerechnet (`mengen`), in der Reihenfolge der Datei. */
  readonly positionen: readonly Aufmassposition[];
  /** Zahl der Zeilen ohne Menge (Ansatz mit Fehler oder in der Textform). */
  readonly ungerechnet: number;
  /** Ohne eine Zeile zu einer Position des Auftrags-LV entsteht kein Blatt (D-87.6). */
  readonly uebernehmbar: boolean;
}

/** Liest eine X31 gegen das Auftrags-LV (Zuordnung über die OZ, Ticket 83). */
export function x31Vorschau(eingabe: Uint8Array | string, auftrag: AuftragsLvZustand): X31Vorschau {
  const l = x31Lesen(eingabe, auftrag);
  const positionen = (l.aufmass?.positionen ?? []).map((p): Aufmassposition =>
    p.mengenansatz === null ? p : { ...p, menge: mengenansatzBerechnen(p.mengenansatz).summe },
  );
  return {
    befunde: l.befunde,
    positionen,
    ungerechnet: positionen.filter((p) => p.menge === null).length,
    uebernehmbar: positionen.length > 0,
  };
}

export interface X31Ausgabe {
  readonly xml: string;
  readonly befunde: readonly Pruefbefund[];
  /** Die eigene Prüfung fand Fehler: warnen und als Entwurf kennzeichnen, nie sperren (U5, ADR 0010). */
  readonly entwurf: boolean;
  readonly dateiname: string;
}

/** Ein Blatt als X31; Dateiname aus Auftrags-LV und Blattnummer, bei einem Entwurf mit `_Entwurf` (G-13). */
export function blattAlsX31(
  blatt: Aufmass,
  auftrag: AuftragsLvZustand,
  version: ExportVersion,
  jetzt: Date,
): X31Ausgabe {
  const iso = jetzt.toISOString();
  const e = aufmassAlsX31(blatt, auftrag, version, {
    erstellt: { datum: iso.slice(0, 10), zeit: iso.slice(11, 19) },
    programm: PROGRAMMNAME,
  });
  const name = dateinameSauber(
    `${auftrag.auftragsLeistungsverzeichnis.name} Aufmaßblatt ${String(blatt.nummer)}`,
    ERSATZ_LV,
  );
  return {
    xml: e.xml,
    befunde: e.befunde,
    entwurf: e.entwurf,
    dateiname: `${name}${e.entwurf ? '_Entwurf' : ''}.x31`,
  };
}
