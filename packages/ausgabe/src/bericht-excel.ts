// SPDX-License-Identifier: AGPL-3.0-or-later
// Excel-Renderer für das `Berichtsmodell` (Ticket 141; Preisspiegel, Aufmaßblatt, Soll/Ist): ein Blatt mit dem Kopf und den
// Abschnitten untereinander. Zahlen stehen als Zahlen in der Zelle (mit dem Zahlformat ihrer Art, N3), damit man mit ihnen
// weiterrechnen kann; Texte wie im Druck. Liest nur das Modell, rechnet nichts (A2); gleiche Eingabe, gleiche Bytes.

import type { Zahlenart } from '@tethys/vertrag';
import { KUERZUNGSMARKE } from './kuerzen';
import type {
  BerichtBlock,
  BerichtFeld,
  BerichtSpalte,
  BerichtWert,
  BerichtZelle,
  Berichtsmodell,
} from './bericht';
import { STIL, schreibeXlsx } from './xlsx';
import type { Spalte, Stil, Zelle } from './xlsx';

/** Grenze einer Excel-Zelle in Zeichen. */
const MAX_TEXT = 32767;
/** Breite der ersten Spalte (Bezeichnungen im Kopf) in Zeichen. */
const MIN_BREITE_ERSTE = 18;
const STANDARD_BREITE = 12;

const ZAHLSTIL: Readonly<Record<Zahlenart, Stil>> = {
  menge: STIL.menge,
  einheitspreis: STIL.einheitspreis,
  betrag: STIL.betrag,
  prozent: STIL.prozent,
};

type Zeile = (Zelle | null)[];

function text(t: string, stil: Stil = STIL.text): Zelle {
  const kurz = t.length > MAX_TEXT ? `${t.slice(0, MAX_TEXT - KUERZUNGSMARKE.length)}${KUERZUNGSMARKE}` : t;
  return { wert: { art: 'text', text: kurz }, stil };
}

function wertZelle(w: BerichtWert, fett: boolean): Zelle | null {
  if (w.zahl === undefined && w.text === '') return null;
  return w.zahl === undefined
    ? text(w.text, fett ? STIL.titel : STIL.text)
    : { wert: { art: 'zahl', dezimal: w.zahl.wert }, stil: ZAHLSTIL[w.zahl.art] };
}

const alsZelle = (z: string | BerichtZelle | undefined): BerichtZelle =>
  z === undefined ? { werte: [] } : typeof z === 'string' ? { werte: [{ text: z }] } : z;

/** Spaltenbreite in Zeichen aus der Breite im Druck (pt). */
const zeichen = (s: BerichtSpalte): number =>
  s.breite === '*' ? 40 : Math.max(8, Math.round(s.breite / 4.5));

interface Tabellenblatt {
  readonly zeilen: Zeile[];
  /** Breite je Spalte in Zeichen (die größte über alle Tabellen gilt). */
  readonly breiten: number[];
}

function tabelle(b: Extract<BerichtBlock, { art: 'tabelle' }>, blatt: Tabellenblatt): void {
  // Je Spalte: so viele Excel-Spalten wie Teile, dazu eine für Hinweise, wenn eine Zelle der Spalte einen trägt.
  const aufbau = b.spalten.map((s, i) => ({
    spalte: s,
    teile: Math.max(1, s.teile?.length ?? 1),
    hinweis: b.zeilen.some((z) => {
      const zelle = z.zellen[i];
      return typeof zelle !== 'string' && zelle?.hinweis !== undefined;
    }),
  }));
  const kleinerText = b.zeilen.some((z) => z.kleinerText !== undefined);
  const kopf: Zeile = aufbau.flatMap(({ spalte, hinweis }) => [
    ...(spalte.teile ?? [null]).map((t) =>
      text(t === null ? spalte.titel : `${spalte.titel} ${t}`, STIL.kopf),
    ),
    ...(hinweis ? [text(`${spalte.titel} Hinweis`, STIL.kopf)] : []),
  ]);
  if (kleinerText) kopf.push(text('Hinweis', STIL.kopf));
  blatt.zeilen.push(kopf);
  let spalte = 0;
  for (const a of aufbau) {
    for (let t = 0; t < a.teile + (a.hinweis ? 1 : 0); t++) {
      blatt.breiten[spalte] = Math.max(blatt.breiten[spalte] ?? 0, zeichen(a.spalte));
      spalte++;
    }
  }
  for (const z of b.zeilen) {
    const fett = z.fett === true;
    const zeile: Zeile = aufbau.flatMap((a, i) => {
      const zelle = alsZelle(z.zellen[i]);
      const einzug = i === 0 && (z.einrueckung ?? 0) > 0 ? '  '.repeat(z.einrueckung ?? 0) : '';
      const werte: Zeile = Array.from({ length: a.teile }, (_, t) => {
        const w = zelle.werte[t];
        if (w === undefined) return null;
        return einzug !== '' && w.zahl === undefined
          ? text(`${einzug}${w.text}`, fett || zelle.fett === true ? STIL.titel : STIL.text)
          : wertZelle(w, fett || zelle.fett === true);
      });
      return a.hinweis ? [...werte, zelle.hinweis === undefined ? null : text(zelle.hinweis)] : werte;
    });
    if (z.kleinerText !== undefined) zeile.push(text(z.kleinerText));
    blatt.zeilen.push(zeile);
  }
}

function feldZeile(f: BerichtFeld & { readonly fett?: boolean }): Zeile {
  const fett = f.fett === true;
  return [
    text(f.bezeichnung, fett ? STIL.titel : STIL.text),
    f.zahl === undefined
      ? text(f.wert, fett ? STIL.titel : STIL.text)
      : wertZelle({ text: f.wert, zahl: f.zahl }, fett),
  ];
}

function block(b: BerichtBlock, blatt: Tabellenblatt): void {
  switch (b.art) {
    case 'absatz':
      blatt.zeilen.push([text(b.text)]);
      break;
    case 'liste':
      for (const p of b.punkte) blatt.zeilen.push([text(`– ${p}`)]);
      break;
    case 'angaben':
    case 'felder':
      for (const f of b.felder) blatt.zeilen.push(feldZeile(f));
      break;
    case 'tabelle':
      tabelle(b, blatt);
      break;
  }
}

/** Ein Blattname ohne die in Excel verbotenen Zeichen `[]:*?/\`, höchstens 31 Zeichen, nie leer. */
function blattname(titel: string): string {
  const name = titel.replace(/[[\]:*?/\\]/g, '-').slice(0, 31);
  return name.trim() === '' ? 'Bericht' : name;
}

/** Ein `Berichtsmodell` als .xlsx mit einem Blatt. */
export function berichtAlsExcel(m: Berichtsmodell): Uint8Array {
  const blatt: Tabellenblatt = { zeilen: [], breiten: [MIN_BREITE_ERSTE] };
  blatt.zeilen.push([text(m.titel, STIL.titel)]);
  const absender = m.absender ?? [];
  if (absender.length > 0) blatt.zeilen.push([text('Absender'), text(absender.join(', '))]);
  for (const f of m.kopf) blatt.zeilen.push(feldZeile(f));
  if (m.datum !== null) blatt.zeilen.push([text('Stand'), text(m.datum)]);
  for (const a of m.abschnitte) {
    blatt.zeilen.push([]);
    if (a.ueberschrift !== null) blatt.zeilen.push([text(a.ueberschrift, STIL.titel)]);
    a.bloecke.forEach((b, i) => {
      if (i > 0 && b.art === 'tabelle') blatt.zeilen.push([]);
      block(b, blatt);
    });
  }
  const spalten: Spalte[] = Array.from({ length: Math.max(blatt.breiten.length, 2) }, (_, i): Spalte => ({
    breite: Math.max(blatt.breiten[i] ?? STANDARD_BREITE, i === 1 ? 24 : 0),
  }));
  const datum = m.erstellt !== null && m.erstellt >= '1980-01-01' ? m.erstellt : '1980-01-01';
  return schreibeXlsx(
    { name: blattname(m.titel), spalten, zeilen: blatt.zeilen, fixierteZeilen: 0, geschuetzt: false },
    { titel: m.titel, datum },
  );
}
