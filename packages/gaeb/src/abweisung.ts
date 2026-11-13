// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein Satz für jede abgewiesene Datei (Ticket 136, E7, B-10, B-11): was die Datei ist und was stattdessen geht. Ohne
// Ticketnummern, Codes oder Paketnamen (L5), unpersönlich (L4). Was „stattdessen“ geht, hängt vom Leser ab, der abweist: Ein
// LV liest man ins Projekt, ein Angebot zu seinem LV, eine Mengenermittlung zu einem Auftrag (Lesart D-136.3).

import type { GaebFormat, GaebPhase } from '@tethys/vertrag';
import { text } from './befunde';
import type { Befundwerte } from './befunde';

/** Welcher Leser abweist. */
export type Leserart = 'lv' | 'angebot' | 'mengenermittlung';

export interface Abweisung {
  readonly meldung: string;
  readonly werte: Befundwerte;
}

/**
 * Was eine Datei der Phase ist (Glossar „GAEB-Austauschphasen“). X80, X87 und X88 nennt das Glossar nicht; der Satz nennt
 * dort nur die Phase (D-136.3).
 */
const WAS: Readonly<Partial<Record<GaebPhase, string>>> = {
  X81: 'eine Leistungsbeschreibung',
  X82: 'ein Kostenansatz',
  X83: 'eine Angebotsaufforderung',
  X84: 'eine Angebotsabgabe',
  X85: 'ein Nebenangebot',
  X86: 'eine Auftragserteilung',
  X89: 'eine Rechnung',
  X31: 'eine Mengenermittlung',
};

const LV_PHASEN: ReadonlySet<GaebPhase> = new Set<GaebPhase>(['X81', 'X83', 'X86']);

const ERWARTET: Readonly<Record<Leserart, string>> = {
  lv: 'Eingelesen werden Leistungsverzeichnisse der Phasen X81, X83 und X86.',
  angebot: 'Als Angebot wird eine Angebotsabgabe (X84) eingelesen.',
  mengenermittlung: 'Bei der Abrechnung wird eine Mengenermittlung (X31) eingelesen.',
};

const ERWARTET_FORMAT: Readonly<Record<Leserart, string>> = {
  lv: 'Eingelesen werden Leistungsverzeichnisse im Format GAEB DA XML (Endungen .x81, .x83 und .x86).',
  angebot: 'Als Angebot wird eine Angebotsabgabe im Format GAEB DA XML eingelesen (Endung .x84).',
  mengenermittlung:
    'Bei der Abrechnung wird eine Mengenermittlung im Format GAEB DA XML eingelesen (Endung .x31).',
};

const FORMATNAME: Readonly<Record<GaebFormat, string>> = {
  'da-xml': 'GAEB DA XML',
  'gaeb-90': 'GAEB 90',
  'gaeb-2000': 'GAEB 2000',
};

/** Wo die Datei stattdessen hingehört, wenn sie in einem anderen Leser richtig ist. */
function stattdessen(phase: GaebPhase | null, leser: Leserart): string | null {
  if (phase === null) return null;
  if (LV_PHASEN.has(phase) && leser !== 'lv')
    return 'Ein Leistungsverzeichnis wird als GAEB-Datei in ein Projekt eingelesen.';
  if (phase === 'X84' && leser !== 'angebot')
    return 'Ein Angebot wird bei dem Leistungsverzeichnis eingelesen, auf das es sich bezieht.';
  if (phase === 'X31' && leser !== 'mengenermittlung')
    return 'Eine Mengenermittlung wird bei der Abrechnung eines Auftrags eingelesen.';
  if (phase === 'X85') return 'Nebenangebote werden nicht eingelesen.';
  if (phase === 'X89')
    return 'Rechnungen im GAEB-Format werden nicht eingelesen; eine Rechnung lässt sich als XRechnung einlesen.';
  return null;
}

/** Eine Datei der falschen oder einer nicht gelesenen Austauschphase. */
export function phaseAbweisen(phase: GaebPhase | null, leser: Leserart): Abweisung {
  const was =
    phase === null
      ? 'Die Austauschphase der Datei ist nicht erkennbar.'
      : WAS[phase] === undefined
        ? `Die Datei gehört zur Austauschphase ${phase}; Dateien dieser Phase werden nicht eingelesen.`
        : `Die Datei ist ${WAS[phase] ?? ''} (${phase}).`;
  const sonst = stattdessen(phase, leser);
  return {
    meldung: [was, sonst, ERWARTET[leser]].filter((s) => s !== null).join(' '),
    werte: phase === null ? {} : { phase: text(phase) },
  };
}

/** GAEB 90 oder GAEB 2000: erkannt, aber (noch) nicht gelesen. */
export function formatAbweisen(
  format: 'gaeb-90' | 'gaeb-2000',
  phase: GaebPhase | null,
  leser: Leserart,
): Abweisung {
  const name = FORMATNAME[format];
  return {
    meldung:
      `Die Datei ist im Format ${name}${phase === null ? '' : ` (Phase ${phase})`}. Dieses Format wird nicht gelesen; die ` +
      `Software, aus der die Datei stammt, kann sie in der Regel als GAEB DA XML ausgeben` +
      `${phase === null ? '' : ` (Endung .${phase.toLowerCase()})`}. ${ERWARTET_FORMAT[leser]}`,
    werte: { format: text(name), ...(phase === null ? {} : { phase: text(phase) }) },
  };
}

/** Weder GAEB DA XML noch GAEB 90 noch GAEB 2000. */
export function unbekannteDatei(leser: Leserart): Abweisung {
  return {
    meldung: `Die Datei ist keine GAEB-Datei (weder GAEB DA XML noch GAEB 90 oder GAEB 2000). ${ERWARTET_FORMAT[leser]}`,
    werte: {},
  };
}

/** XML, aber mit einem anderen obersten Element als `GAEB`. */
export function fremdesXml(wurzel: string, leser: Leserart): Abweisung {
  return {
    meldung: `Die Datei ist eine XML-Datei, aber keine GAEB-Datei (ihr oberstes Element heißt „${wurzel}“). ${ERWARTET_FORMAT[leser]}`,
    werte: { element: text(wurzel) },
  };
}

/** GAEB DA XML älter als 3.1. */
export function versionAbweisen(version: string): Abweisung {
  return {
    meldung:
      `Die Datei ist GAEB DA XML ${version}. Gelesen werden die Versionen 3.1, 3.2 und 3.3; die Software, aus der die Datei ` +
      'stammt, kann sie in der Regel in einer dieser Versionen ausgeben.',
    werte: { version: text(version), format: text(FORMATNAME['da-xml']) },
  };
}
