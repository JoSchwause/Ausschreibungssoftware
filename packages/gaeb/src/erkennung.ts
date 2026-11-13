// SPDX-License-Identifier: AGPL-3.0-or-later
// Erkennung von GAEB-Version und Phase einer DA-XML-Datei. Reihenfolge der Quellen (Ticket 22): Namensraum,
// `GAEBInfo/Version`, `Award/DP`, zuletzt die Dateiendung. Widersprüche zwischen den Quellen sind Befunde, die erste
// vorhandene Quelle gilt. Dieselben Regeln gelten für den Leser (Kopf aus dem geparsten Wurzelelement, `erkenne`) und für
// die leichte Erkennung ohne Parser (`dateiart.ts`, Kopf aus dem Anfang der Datei, Ticket 136).

import type { GaebPhase, GaebVersion } from '@tethys/vertrag';
import { elementKinder, textInhalt } from './xml';
import type { XmlElement } from './xml';

export type Versionsstand =
  /** 3.3, 3.2 (Ticket 40) und 3.1 (Ticket 129): werden gelesen. */
  | 'unterstuetzt'
  /** Älter als 3.1: bekannt, aber nicht gelesen. */
  | 'bekannt-nicht-unterstuetzt'
  /** Nicht erkennbar oder neuer als 3.3: tolerant als 3.3 gelesen. */
  | 'unbekannt';

/** Woher die Phase stammt: aus dem Inhalt (Namensraum, `Award/DP`) oder nur aus der Dateiendung (Hinweis). */
export type Phasenquelle = 'inhalt' | 'endung';

export interface Erkennung {
  /** Das Ergebnis für `GaebLesung.version`: nur 3.1, 3.2 und 3.3 sind darstellbar, sonst `null`. */
  readonly version: GaebVersion | null;
  /** Die erkannte Version im Wortlaut (z. B. `3.1`), `null`: keine Angabe. */
  readonly versionText: string | null;
  readonly stand: Versionsstand;
  readonly phase: GaebPhase | null;
  readonly phasenquelle: Phasenquelle | null;
  readonly befunde: readonly ErkennungsBefund[];
}

export interface ErkennungsBefund {
  readonly schwere: 'warnung' | 'fehler';
  readonly code: string;
  readonly meldung: string;
  readonly element?: XmlElement;
}

/**
 * Die Kopfangaben einer DA-XML-Datei, aus denen Version und Phase folgen. Die Elemente fehlen bei der leichten Erkennung
 * (dann tragen die Befunde keinen Ort).
 */
export interface Kopfangaben {
  /** `xmlns` des Wurzelelements, `null`: keiner. */
  readonly namensraum: string | null;
  /** Text von `GAEBInfo/Version`, `null`: fehlt oder leer. */
  readonly infoVersion: string | null;
  /** Text von `Award/DP` (bei X31 `QtyDeterm/DP`), `null`: fehlt. */
  readonly dp: string | null;
  readonly wurzel?: XmlElement;
  readonly infoVersionElement?: XmlElement;
  readonly dpElement?: XmlElement;
}

/**
 * Alle Phasen, die der Leser benennen kann (Glossar „GAEB-Austauschphasen“). X80, X87 und X88 seit v1.7a (Ticket 127,
 * D-127.11): Sie werden nur erkannt, um sie mit einem eigenen Satz abzuweisen (Ticket 136).
 */
export const PHASEN: ReadonlySet<GaebPhase> = new Set<GaebPhase>([
  'X80',
  'X81',
  'X82',
  'X83',
  'X84',
  'X85',
  'X86',
  'X87',
  'X88',
  'X89',
  'X31',
]);
const NAMENSRAUM = /^http:\/\/www\.gaeb\.de\/GAEB_DA_XML\/DA(\d{2})\/(\d+\.\d+)$/;
const NAMENSRAUM_31 = 'http://www.gaeb.de/GAEB_DA_XML/200407';
/** Endung als Hinweis auf die Phase: `.x83`, auch `.d83` (GAEB 90) und `.p83` (GAEB 2000), Groß- und Kleinschreibung egal. */
const ENDUNG = /\.[xXdDpP]([0-9]{2})$/;

const kind = (e: XmlElement | undefined, name: string): XmlElement | undefined =>
  e ? elementKinder(e).find((k) => k.name === name) : undefined;

export function namensraumVon(wurzel: XmlElement): string | null {
  const k = wurzel.qname.indexOf(':');
  const attr = k < 0 ? 'xmlns' : `xmlns:${wurzel.qname.slice(0, k)}`;
  return wurzel.attrs.get(attr) ?? null;
}

/**
 * Die gelesenen Versionen. 3.1 hat einen gemeinsamen Namensraum für alle Phasen (`NAMENSRAUM_31`), 3.2 und 3.3 einen je
 * Phase; der Aufbau von LV, Positionen, Texten und Summen ist in den drei Versionen derselbe, der Leser hat dafür keine
 * eigene Weiche (Ticket 129, geprüft an den amtlichen Musterdateien 3.1).
 */
const GELESEN: ReadonlyMap<string, GaebVersion> = new Map([
  ['3.3', '3.3'],
  ['3.2', '3.2'],
  ['3.1', '3.1'],
]);

function klassifiziere(version: string): Versionsstand {
  const m = /^(\d+)\.(\d+)$/.exec(version);
  if (!m) return 'unbekannt';
  if (GELESEN.has(version)) return 'unterstuetzt';
  const haupt = Number(m[1]);
  const neben = Number(m[2]);
  if (haupt < 3 || (haupt === 3 && neben < 1)) return 'bekannt-nicht-unterstuetzt';
  return 'unbekannt';
}

/** Die Phase, auf die eine Dateiendung hinweist (`.X83`, `.d83`, `.p83` → `X83`); `null`: keine GAEB-Endung. */
export function phaseAusEndung(dateiname: string | undefined): GaebPhase | null {
  const n = dateiname === undefined ? null : (ENDUNG.exec(dateiname)?.[1] ?? null);
  const phase = n === null ? null : `X${n}`;
  return phase !== null && PHASEN.has(phase as GaebPhase) ? (phase as GaebPhase) : null;
}

/** Version und Phase aus den Kopfangaben einer DA-XML-Datei. */
export function erkenneKopf(kopf: Kopfangaben, dateiname: string | undefined): Erkennung {
  const befunde: ErkennungsBefund[] = [];
  const wurzel = kopf.wurzel ? { element: kopf.wurzel } : {};
  const ns = kopf.namensraum;
  let nsVersion: string | null = null;
  let nsPhase: string | null = null;
  if (ns === null) {
    befunde.push({
      schwere: 'warnung',
      code: 'namespace-fehlt',
      meldung: 'Das Wurzelelement hat keinen Namensraum; Version und Phase kommen aus den Elementen.',
      ...wurzel,
    });
  } else {
    const m = NAMENSRAUM.exec(ns);
    if (m) {
      nsPhase = `X${m[1] ?? ''}`;
      nsVersion = m[2] ?? null;
    } else if (ns === NAMENSRAUM_31) nsVersion = '3.1';
    else
      befunde.push({
        schwere: 'warnung',
        code: 'namespace-unbekannt',
        meldung: `Der Namensraum „${ns}“ ist kein GAEB-DA-XML-Namensraum.`,
        ...wurzel,
      });
  }

  const infoVersion = kopf.infoVersion;
  const dpRoh = kopf.dp;
  let dpPhase: string | null = null;
  if (dpRoh !== null && dpRoh !== '') {
    const kandidat = `X${dpRoh}`;
    if (PHASEN.has(kandidat as GaebPhase)) dpPhase = kandidat;
    else
      befunde.push({
        schwere: 'warnung',
        code: 'phase-ungueltig',
        meldung: `Award/DP „${dpRoh}“ ist keine bekannte Austauschphase.`,
        ...(kopf.dpElement ? { element: kopf.dpElement } : {}),
      });
  }

  // Version: Namensraum vor GAEBInfo.
  const versionText = nsVersion ?? infoVersion;
  if (nsVersion !== null && infoVersion !== null && nsVersion !== infoVersion)
    befunde.push({
      schwere: 'warnung',
      code: 'version-widerspruch',
      meldung: `Namensraum (${nsVersion}) und GAEBInfo/Version (${infoVersion}) widersprechen sich; der Namensraum gilt.`,
      ...(kopf.infoVersionElement ? { element: kopf.infoVersionElement } : {}),
    });

  // Phase: Namensraum, dann DP, dann Endung.
  const endungPhase = phaseAusEndung(dateiname);
  const primaer = nsPhase ?? dpPhase;
  if (nsPhase !== null && dpPhase !== null && nsPhase !== dpPhase)
    befunde.push({
      schwere: 'warnung',
      code: 'phase-widerspruch',
      meldung: `Namensraum (${nsPhase}) und Award/DP (${dpPhase}) widersprechen sich; der Namensraum gilt.`,
      ...(kopf.dpElement ? { element: kopf.dpElement } : {}),
    });
  if (primaer !== null && endungPhase !== null && primaer !== endungPhase)
    befunde.push({
      schwere: 'warnung',
      code: 'phase-endung-widerspruch',
      meldung: `Die Dateiendung (.${(dateiname ?? '').split('.').at(-1) ?? ''}) passt nicht zur Phase ${primaer} im Inhalt; der Inhalt gilt.`,
    });
  const phaseText = primaer ?? endungPhase;
  if (phaseText === null)
    befunde.push({
      schwere: 'warnung',
      code: 'phase-unbekannt',
      meldung: 'Die Austauschphase ist weder aus Namensraum, Award/DP noch aus der Dateiendung erkennbar.',
    });
  const phase = phaseText !== null && PHASEN.has(phaseText as GaebPhase) ? (phaseText as GaebPhase) : null;
  const phasenquelle: Phasenquelle | null =
    phase === null ? null : primaer !== null ? 'inhalt' : 'endung';

  const stand = versionText === null ? 'unbekannt' : klassifiziere(versionText);
  const version = versionText === null ? null : (GELESEN.get(versionText) ?? null);
  return { version, versionText, stand, phase, phasenquelle, befunde };
}

/** Version und Phase am geparsten Wurzelelement (der Leser). */
export function erkenne(wurzel: XmlElement, dateiname: string | undefined): Erkennung {
  const infoVersionElement = kind(kind(wurzel, 'GAEBInfo'), 'Version');
  const dpElement = kind(kind(wurzel, 'Award'), 'DP') ?? kind(kind(wurzel, 'QtyDeterm'), 'DP');
  const dp = dpElement ? textInhalt(dpElement).trim() : null;
  return erkenneKopf(
    {
      namensraum: namensraumVon(wurzel),
      infoVersion: infoVersionElement ? textInhalt(infoVersionElement).trim() || null : null,
      dp,
      wurzel,
      ...(infoVersionElement ? { infoVersionElement } : {}),
      ...(dpElement ? { dpElement } : {}),
    },
    dateiname,
  );
}
