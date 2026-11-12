// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezeichnungen der Kostengruppen aus einer CSV des Nutzers (Ticket 55, D-24). Die Norm-Texte stehen nie im Repo
// (G-16, C1); der Nutzer bringt sie mit. Reine Funktion Text → Zuordnung (A2), keine Datei-API.
//
// Format: erste Spalte Nummer, zweite Bezeichnung, weitere Spalten werden übergangen. Trenner `;` oder `,` (der erste
// außerhalb von Anführungszeichen in der ersten nicht leeren Zeile; sonst `;`). Optionale Kopfzeile: die erste nicht
// leere Zeile, wenn ihre erste Zelle keine Ziffer enthält. UTF-8 mit oder ohne BOM; Zeilenenden CRLF, LF oder CR.
// Anführungszeichen nach RFC 4180 (`""` im Feld, Trenner und Zeilenumbrüche im Feld).

import type { Kostengruppennummer } from '@tethys/vertrag';
import { kgLesen } from './kostengruppe';

export type Trenner = ';' | ',';

export type Bezeichnungsbefundcode =
  | 'nummer-ungueltig' // Zeile wird übergangen
  | 'nummer-doppelt' // die erste Zeile mit dieser Nummer gilt (D-55.6)
  | 'bezeichnung-leer' // leere oder fehlende zweite Spalte; Zeile wird übergangen
  | 'anfuehrungszeichen-offen'; // Feld bis zum Textende nicht geschlossen; Datensatz wird übergangen

export interface Bezeichnungsbefund {
  readonly code: Bezeichnungsbefundcode;
  /** Physische Zeile (ab 1), in der der Datensatz beginnt. */
  readonly zeile: number;
  /** Gelesene Nummer; `null`, wenn sie ungültig ist oder der Datensatz nicht gelesen werden konnte. */
  readonly nummer: Kostengruppennummer | null;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

export interface Bezeichnungsergebnis {
  /** Nummer → Bezeichnung (Leerraum am Rand entfernt), in Reihenfolge der Datei. */
  readonly bezeichnungen: ReadonlyMap<Kostengruppennummer, string>;
  readonly trenner: Trenner;
  readonly kopfzeile: boolean;
  /** In Reihenfolge der Datei. */
  readonly befunde: readonly Bezeichnungsbefund[];
}

// --- Zerlegen (RFC 4180) ---------------------------------------------------------------------------------------

interface Datensatz {
  readonly zeile: number;
  readonly felder: readonly string[];
  /** Das letzte Feld endet ohne schließendes Anführungszeichen am Textende. */
  readonly offen: boolean;
}

const BOM = '﻿';

/** Erster `;` oder `,` außerhalb von Anführungszeichen in der ersten Zeile mit Inhalt; sonst `;`. */
function trennerErkennen(text: string): Trenner {
  let inAnfuehrung = false;
  let inhalt = false;
  for (const z of text) {
    if (z === '"') {
      inAnfuehrung = !inAnfuehrung;
      inhalt = true;
    } else if (inAnfuehrung) {
      continue;
    } else if (z === ';' || z === ',') {
      return z;
    } else if (z === '\n' || z === '\r') {
      if (inhalt) break;
    } else if (z.trim() !== '') {
      inhalt = true;
    }
  }
  return ';';
}

function zerlegen(text: string, trenner: Trenner): Datensatz[] {
  const saetze: Datensatz[] = [];
  let zeile = 1;
  let start = 1;
  let felder: string[] = [];
  let feld = '';
  let i = 0;
  const n = text.length;

  const satzEnde = (offen: boolean): void => {
    felder.push(feld);
    saetze.push({ zeile: start, felder, offen });
    felder = [];
    feld = '';
  };

  while (i < n) {
    const z = text.charAt(i);
    if (z === '"' && feld === '') {
      // Feld in Anführungszeichen: bis zum schließenden `"`, `""` steht für ein `"`.
      i++;
      let geschlossen = false;
      while (i < n) {
        const q = text.charAt(i);
        if (q === '"') {
          if (text[i + 1] === '"') {
            feld += '"';
            i += 2;
            continue;
          }
          i++;
          geschlossen = true;
          break;
        }
        if (q === '\r' || q === '\n') {
          zeile++;
          if (q === '\r' && text[i + 1] === '\n') {
            feld += '\r\n';
            i += 2;
            continue;
          }
        }
        feld += q;
        i++;
      }
      if (!geschlossen) {
        satzEnde(true);
        return saetze;
      }
      continue;
    }
    if (z === trenner) {
      felder.push(feld);
      feld = '';
      i++;
      continue;
    }
    if (z === '\r' || z === '\n') {
      i += z === '\r' && text[i + 1] === '\n' ? 2 : 1;
      satzEnde(false);
      zeile++;
      start = zeile;
      continue;
    }
    feld += z;
    i++;
  }
  if (feld !== '' || felder.length > 0) satzEnde(false);
  return saetze;
}

// --- Lesen -----------------------------------------------------------------------------------------------------

const leer = (s: Datensatz): boolean => s.felder.every((f) => f.trim() === '');

export function bezeichnungenLesen(text: string): Bezeichnungsergebnis {
  const ohneBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const trenner = trennerErkennen(ohneBom);
  const saetze = zerlegen(ohneBom, trenner).filter((s) => s.offen || !leer(s));

  const erster = saetze[0];
  const kopfzeile = erster !== undefined && !erster.offen && !/[0-9]/.test(erster.felder[0] ?? '');
  const bezeichnungen = new Map<Kostengruppennummer, string>();
  const befunde: Bezeichnungsbefund[] = [];

  for (const satz of kopfzeile ? saetze.slice(1) : saetze) {
    const befund = (
      code: Bezeichnungsbefundcode,
      nummer: Kostengruppennummer | null,
      meldung: string,
    ): void => {
      befunde.push({ code, zeile: satz.zeile, nummer, meldung });
    };
    if (satz.offen) {
      befund('anfuehrungszeichen-offen', null, 'Anführungszeichen bis zum Textende nicht geschlossen');
      continue;
    }
    const nummer = kgLesen(satz.felder[0] ?? '');
    if (!nummer.ok) {
      befund('nummer-ungueltig', null, nummer.fehler.meldung);
      continue;
    }
    const n = nummer.wert;
    const bezeichnung = (satz.felder[1] ?? '').trim();
    if (bezeichnung === '') {
      befund('bezeichnung-leer', n, `Keine Bezeichnung für ${n}`);
      continue;
    }
    if (bezeichnungen.has(n)) {
      befund('nummer-doppelt', n, `Nummer ${n} kommt mehrfach vor; die erste Bezeichnung gilt`);
      continue;
    }
    bezeichnungen.set(n, bezeichnung);
  }
  return { bezeichnungen, trenner, kopfzeile, befunde };
}
