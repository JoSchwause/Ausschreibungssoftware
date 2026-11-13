// SPDX-License-Identifier: AGPL-3.0-or-later
// Erkennung von GAEB-Version und Phase. Reihenfolge der Quellen (Ticket 22): Namensraum, `GAEBInfo/Version`,
// `Award/DP`, zuletzt die Dateiendung. Widersprüche zwischen den Quellen sind Befunde, die erste vorhandene
// Quelle gilt.

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

export interface Erkennung {
  /** Das Ergebnis für `GaebLesung.version`: nur 3.1, 3.2 und 3.3 sind darstellbar, sonst `null`. */
  readonly version: GaebVersion | null;
  /** Die erkannte Version im Wortlaut (z. B. `3.1`), `null`: keine Angabe. */
  readonly versionText: string | null;
  readonly stand: Versionsstand;
  readonly phase: GaebPhase | null;
  readonly befunde: readonly ErkennungsBefund[];
}

export interface ErkennungsBefund {
  readonly schwere: 'warnung' | 'fehler';
  readonly code: string;
  readonly meldung: string;
  readonly element?: XmlElement;
}

const PHASEN: ReadonlySet<string> = new Set(['X81', 'X82', 'X83', 'X84', 'X85', 'X86', 'X89', 'X31']);
const NAMENSRAUM = /^http:\/\/www\.gaeb\.de\/GAEB_DA_XML\/DA(\d{2})\/(\d+\.\d+)$/;
const NAMENSRAUM_31 = 'http://www.gaeb.de/GAEB_DA_XML/200407';

const kind = (e: XmlElement | undefined, name: string): XmlElement | undefined =>
  e ? elementKinder(e).find((k) => k.name === name) : undefined;

function namensraumVon(wurzel: XmlElement): string | null {
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

export function erkenne(wurzel: XmlElement, dateiname: string | undefined): Erkennung {
  const befunde: ErkennungsBefund[] = [];
  const ns = namensraumVon(wurzel);
  let nsVersion: string | null = null;
  let nsPhase: string | null = null;
  if (ns === null) {
    befunde.push({
      schwere: 'warnung',
      code: 'namespace-fehlt',
      meldung: 'Das Wurzelelement hat keinen Namensraum; Version und Phase kommen aus den Elementen.',
      element: wurzel,
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
        element: wurzel,
      });
  }

  const infoVersionEl = kind(kind(wurzel, 'GAEBInfo'), 'Version');
  const infoVersion = infoVersionEl ? textInhalt(infoVersionEl).trim() || null : null;
  const award = kind(wurzel, 'Award');
  const dpEl = kind(award, 'DP');
  const dpRoh = dpEl ? textInhalt(dpEl).trim() : null;
  let dpPhase: string | null = null;
  if (dpRoh !== null && dpRoh !== '') {
    const kandidat = `X${dpRoh}`;
    if (PHASEN.has(kandidat)) dpPhase = kandidat;
    else
      befunde.push({
        schwere: 'warnung',
        code: 'phase-ungueltig',
        meldung: `Award/DP „${dpRoh}“ ist keine bekannte Austauschphase.`,
        ...(dpEl ? { element: dpEl } : {}),
      });
  }

  // Version: Namensraum vor GAEBInfo.
  const versionText = nsVersion ?? infoVersion;
  if (nsVersion !== null && infoVersion !== null && nsVersion !== infoVersion)
    befunde.push({
      schwere: 'warnung',
      code: 'version-widerspruch',
      meldung: `Namensraum (${nsVersion}) und GAEBInfo/Version (${infoVersion}) widersprechen sich; der Namensraum gilt.`,
      ...(infoVersionEl ? { element: infoVersionEl } : {}),
    });

  // Phase: Namensraum, dann DP, dann Endung.
  const endung = dateiname === undefined ? null : (/\.[xX]([0-9]{2})$/.exec(dateiname)?.[1] ?? null);
  const endungPhase = endung === null ? null : `X${endung}`;
  const primaer = nsPhase ?? dpPhase;
  if (nsPhase !== null && dpPhase !== null && nsPhase !== dpPhase)
    befunde.push({
      schwere: 'warnung',
      code: 'phase-widerspruch',
      meldung: `Namensraum (${nsPhase}) und Award/DP (${dpPhase}) widersprechen sich; der Namensraum gilt.`,
      ...(dpEl ? { element: dpEl } : {}),
    });
  let phase = primaer ?? endungPhase;
  if (primaer !== null && endungPhase !== null && primaer !== endungPhase)
    befunde.push({
      schwere: 'warnung',
      code: 'phase-endung-widerspruch',
      meldung: `Die Dateiendung (.${(dateiname ?? '').split('.').at(-1) ?? ''}) passt nicht zur Phase ${primaer} im Inhalt; der Inhalt gilt.`,
    });
  if (phase === null)
    befunde.push({
      schwere: 'warnung',
      code: 'phase-unbekannt',
      meldung: 'Die Austauschphase ist weder aus Namensraum, Award/DP noch aus der Dateiendung erkennbar.',
    });
  if (phase !== null && !PHASEN.has(phase)) phase = null;

  const stand = versionText === null ? 'unbekannt' : klassifiziere(versionText);
  const version = versionText === null ? null : (GELESEN.get(versionText) ?? null);
  return { version, versionText, stand, phase: phase as GaebPhase | null, befunde };
}
