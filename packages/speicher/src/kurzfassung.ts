// SPDX-License-Identifier: AGPL-3.0-or-later
// Massenbefehle im Befehlsprotokoll (E-13, ADR 0009): Statt des vollständigen Befehls steht eine `Befehlskurzfassung`
// mit Kopf und Prüfsumme im Protokoll. Alle anderen Befehle bleiben vollständig.
//
// Prüfsumme: SHA-256 über die UTF-8-Bytes von `kanonischesJson(befehl)` (dieselbe Form wie die Projektdatei, G-56:
// Schlüssel sortiert, zwei Leerzeichen Einrückung, abschließender Zeilenumbruch), hexadezimal klein. Gebildet über Web
// Crypto (`crypto.subtle.digest`, in Browser und Node vorhanden, keine Abhängigkeit). Wer einen Massenbefehl ausführt,
// prüft mit `pruefsummeBilden` oder `befehlskurzfassung`, dass seine Summe zum Protokoll passt.

import {
  MASSENBEFEHLSARTEN,
  type Befehl,
  type Befehlskurzfassung,
  type Massenbefehlskopf,
  type Protokolleintrag,
  type Pruefsumme,
} from '@tethys/vertrag';
import { kanonischesJson } from './kanonisch';

type Massenbefehl = Extract<Befehl, { art: (typeof MASSENBEFEHLSARTEN)[number] }>;

const MASSENBEFEHLE: ReadonlySet<string> = new Set(MASSENBEFEHLSARTEN);

export const istMassenbefehl = (b: Befehl | Befehlskurzfassung): b is Massenbefehl =>
  MASSENBEFEHLE.has(b.art);

/** Kopie von `o` ohne das Feld `k`. */
function ohne<T extends object, K extends keyof T>(o: T, k: K): Omit<T, K> {
  const kopie = { ...o };
  Reflect.deleteProperty(kopie, k);
  return kopie;
}

/** Der Befehl ohne seine lange Liste (`Massenbefehlskopf`). */
export function massenbefehlskopf(b: Massenbefehl): Massenbefehlskopf {
  switch (b.art) {
    case 'LeistungsverzeichnisAnlegen':
      return { art: b.art, id: b.id, projektId: b.projektId, inhalt: ohne(b.inhalt, 'knoten') };
    case 'AngebotAnlegen':
      return { art: b.art, angebot: ohne(b.angebot, 'positionen') };
    case 'AuftragsLeistungsverzeichnisAnlegen':
      return { art: b.art, auftragsLeistungsverzeichnis: ohne(b.auftragsLeistungsverzeichnis, 'knoten') };
  }
}

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 über die UTF-8-Bytes der kanonischen JSON-Form des vollständigen Befehls. */
export async function pruefsummeBilden(befehl: Befehl): Promise<Pruefsumme> {
  const bytes = new TextEncoder().encode(kanonischesJson(befehl));
  return { algorithmus: 'sha-256', wert: hex(await crypto.subtle.digest('SHA-256', bytes)) };
}

/** Kurzfassung eines Massenbefehls, wie `anwenden` sie protokolliert. */
export async function befehlskurzfassung(befehl: Massenbefehl): Promise<Befehlskurzfassung> {
  return {
    art: 'Befehlskurzfassung',
    kopf: massenbefehlskopf(befehl),
    pruefsumme: await pruefsummeBilden(befehl),
  };
}

/**
 * Der Eintrag, wie er ins Protokoll geht: bei einem Massenbefehl mit der Kurzfassung, sonst unverändert. Eine schon
 * gekürzte Fassung bleibt, wie sie ist (der Typ erlaubt sie; `speicher` kann ihre Summe ohne den Befehl nicht prüfen).
 */
export async function protokollform(e: Protokolleintrag): Promise<Protokolleintrag> {
  return istMassenbefehl(e.befehl) ? { ...e, befehl: await befehlskurzfassung(e.befehl) } : e;
}
