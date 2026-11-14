// SPDX-License-Identifier: AGPL-3.0-or-later
// Die GAEB-Wege der App ohne Oberfläche (Ticket 49): LV lesen, LV ausgeben, Angebot (X84) lesen und als Plan für
// Bieter und Angebot aufbereiten, Bietersummen. Rein: Uhr und Kennungen kommen vom Aufrufer (A2, A7). Die Oberfläche
// zeigt, was hier herauskommt; die Befehle laufen über den Befehlsweg (A5).

import { zuschlagsbasen } from '@tethys/kern';
import {
  STANDARD_MWST_SATZ,
  leseAngebot,
  leseGaeb,
  schreibeGaeb,
  type ExportPhase,
  type ExportVersion,
} from '@tethys/gaeb';
import { angebotSummenBerechnen } from '@tethys/vergabe';
import type {
  Angebot,
  Betrag,
  Bieter,
  Bieterangaben,
  Gesamtsummen,
  GaebPhase,
  GaebVersion,
  IdQuelle,
  LvInhalt,
  LvZustand,
  PositionId,
  Projekt,
  Pruefbefund,
} from '@tethys/vertrag';
import { ERSATZ_LV, dateinameSauber } from '../dateiname';
import { lvInhalt } from '../lv/inhalt';

export const PROGRAMMNAME = 'Tethys AVA';

/** Befunde nach Schwere gruppiert; die Reihenfolge innerhalb der Gruppe bleibt die der Datei. */
export function befundeNachSchwere(befunde: readonly Pruefbefund[]): {
  readonly fehler: readonly Pruefbefund[];
  readonly warnungen: readonly Pruefbefund[];
} {
  return {
    fehler: befunde.filter((b) => b.schwere === 'fehler'),
    warnungen: befunde.filter((b) => b.schwere === 'warnung'),
  };
}

// --- LV einlesen ----------------------------------------------------------------------------------------------

export interface Lesevorschau {
  readonly phase: GaebPhase | null;
  readonly version: GaebVersion | null;
  readonly inhalt: LvInhalt | null;
  readonly befunde: readonly Pruefbefund[];
  readonly anzahl: {
    readonly gliederungen: number;
    readonly positionen: number;
    readonly hinweistexte: number;
  };
  /**
   * Ohne Inhalt (andere Austauschphase, unlesbare oder keine GAEB-Datei) gibt es nichts zu übernehmen; die Befunde bleiben
   * sichtbar, der Satz der Abweisung steht vorn. GAEB 90 und GAEB 2000 werden gelesen wie GAEB DA XML.
   */
  readonly uebernehmbar: boolean;
}

/**
 * Liest eine X81, X83 oder X86 (GAEB DA XML 3.3, 3.2, 3.1, GAEB 90, GAEB 2000) mit den Kennungen der App und dem
 * Ersatzwert 19,00 % für die MwSt (E-19).
 */
export function lvLesen(bytes: Uint8Array, dateiname: string, ids: IdQuelle): Lesevorschau {
  const l = leseGaeb(bytes, { ids, dateiname, standardMwstSatz: STANDARD_MWST_SATZ });
  const knoten = l.inhalt?.knoten ?? [];
  const anzahl = {
    gliederungen: knoten.filter((k) => k.art === 'titel' || k.art === 'los').length,
    positionen: knoten.filter((k) => k.art === 'position').length,
    hinweistexte: knoten.filter((k) => k.art === 'hinweis').length,
  };
  return { ...l, anzahl, uebernehmbar: l.inhalt !== null };
}

// --- LV ausgeben ----------------------------------------------------------------------------------------------

export interface Ausgabe {
  readonly xml: string;
  readonly phase: ExportPhase;
  readonly version: ExportVersion;
  readonly befunde: readonly Pruefbefund[];
  /** Die eigene Prüfung fand Fehler: warnen und als Entwurf kennzeichnen, nie sperren (U5, G-13, ADR 0010). */
  readonly entwurf: boolean;
  readonly dateiname: string;
}

/** Dateiname ohne Sonderzeichen; bei einem Entwurf mit `_Entwurf` vor der Endung (G-13). */
export function dateinameAusgabe(lvName: string, phase: ExportPhase, entwurf: boolean): string {
  return `${dateinameSauber(lvName, ERSATZ_LV)}${entwurf ? '_Entwurf' : ''}.${phase.toLowerCase()}`;
}

/**
 * Das LV als GAEB-Datei. Datum und Uhrzeit stammen von der Uhr der App (`jetzt`, in UTC wie `Protokolleintrag.wann`),
 * für X86 kommen Summenstand und Zuschlagsbasen aus dem Kern. Den Kopf baut `lvInhalt` (S5); das Auftrags-LV geht über
 * `alsLvZustand` denselben Weg.
 */
export function lvAusgeben(
  zustand: LvZustand,
  phase: ExportPhase,
  version: ExportVersion,
  jetzt: Date,
): Ausgabe {
  const iso = jetzt.toISOString();
  const l = zustand.leistungsverzeichnis;
  const basen = new Map<PositionId, Betrag>();
  if (phase === 'X86') for (const [id, b] of zuschlagsbasen(l)) basen.set(id, b.basis);
  const e = schreibeGaeb(lvInhalt(l), {
    phase,
    version,
    erstellt: { datum: iso.slice(0, 10), zeit: iso.slice(11, 19) },
    programm: PROGRAMMNAME,
    ...(phase === 'X86' ? { summen: zustand.summen, zuschlagsbasen: basen } : {}),
  });
  return {
    xml: e.xml,
    phase,
    version,
    befunde: e.befunde,
    entwurf: e.entwurf,
    dateiname: dateinameAusgabe(l.name, phase, e.entwurf),
  };
}

// --- Angebot einlesen -----------------------------------------------------------------------------------------

export interface Angebotsvorschau {
  readonly phase: GaebPhase | null;
  readonly version: GaebVersion | null;
  readonly befunde: readonly Pruefbefund[];
  /** Vorschlag aus der Datei; die Oberfläche lässt ihn ändern. Leer, wenn die Datei keinen nennt. */
  readonly bieterName: string;
  /** Anschrift und Kontakt des Bieters aus der Datei (`CTR/Address`); fehlt, wenn sie keine trägt. */
  readonly bieterAngaben?: Bieterangaben;
  readonly angebot: Angebot | null;
  readonly uebernehmbar: boolean;
}

/** Liest eine X84 (3.3, 3.2, 3.1) gegen dieses LV. Die vorläufigen Kennungen ersetzt `angebotAnlegenPlan`. */
export function angebotLesen(
  bytes: Uint8Array,
  dateiname: string,
  lv: LvZustand,
  ids: IdQuelle,
): Angebotsvorschau {
  const l = leseAngebot(bytes, {
    lv: lv.leistungsverzeichnis,
    angebotId: ids.angebot(),
    bieterId: ids.bieter(),
    dateiname,
  });
  const angebot = l.befehl?.angebot ?? null;
  return {
    phase: l.phase,
    version: l.version,
    befunde: l.befunde,
    bieterName: l.bieter?.name ?? '',
    ...(l.bieter?.angaben === undefined ? {} : { bieterAngaben: l.bieter.angaben }),
    angebot,
    uebernehmbar: angebot !== null,
  };
}

const gleichNamig = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase('de') === b.trim().toLocaleLowerCase('de');

/** Der Bieter dieses Namens im Projekt (Groß-/Kleinschreibung und Ränder egal), wenn es ihn gibt. */
export function vorhandenerBieter(projekt: Projekt, bieterName: string): Bieter | undefined {
  return bieterName.trim() === '' ? undefined : projekt.bieter.find((b) => gleichNamig(b.name, bieterName));
}

/** Ob das Projekt einen Bieter dieses Namens hat (Groß-/Kleinschreibung und Ränder egal); er wird wiederverwendet. */
export function bieterVorhanden(projekt: Projekt, bieterName: string): boolean {
  return bieterName.trim() !== '' && projekt.bieter.some((b) => gleichNamig(b.name, bieterName));
}

export interface Angebotsplan {
  /** `null`: Der Bieter ist im Projekt schon da (gleicher Name, Groß-/Kleinschreibung und Ränder egal). */
  readonly neuerBieter: Bieter | null;
  readonly angebot: Angebot;
}

/**
 * Bieter (nur wenn neu) und Angebot für den Befehlsweg. `null`: nichts zu übernehmen oder kein Name. Ein neuer Bieter bringt
 * die Angaben aus der Datei mit (`BieterAnlegen` mit `angaben`), auch unter einem geänderten Namen; ein vorhandener Bieter
 * wird nicht überschrieben (D-82, S7).
 */
export function angebotAnlegenPlan(
  vorschau: Angebotsvorschau,
  bieterName: string,
  projekt: Projekt,
  ids: IdQuelle,
): Angebotsplan | null {
  const name = bieterName.trim();
  if (vorschau.angebot === null || name === '') return null;
  const vorhanden = projekt.bieter.find((b) => gleichNamig(b.name, name));
  const angaben = vorschau.bieterAngaben === undefined ? {} : { angaben: vorschau.bieterAngaben };
  const neuerBieter: Bieter | null = vorhanden ? null : { id: vorschau.angebot.bieterId, name, ...angaben };
  const bieterId = vorhanden ? vorhanden.id : (neuerBieter?.id ?? ids.bieter());
  return { neuerBieter, angebot: { ...vorschau.angebot, bieterId } };
}

// --- Bietersummen ---------------------------------------------------------------------------------------------

/** Netto, Netto nach Nachlass und Brutto eines Angebots (R7, vergabe über den Kern). */
export function bietersummen(lv: LvZustand, angebot: Pick<Angebot, 'positionen' | 'nachlass'>): Gesamtsummen {
  return angebotSummenBerechnen(lv, angebot).gesamt;
}
