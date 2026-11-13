// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB 90 (Satzformat, Dateien .d81/.d83/.d86 und .d84) → dasselbe Modell wie DA XML (Ticket 144, E6, D-71). Nur lesen.
// Rein (A2): Eingabe ist der schon dekodierte Text, Kennungen aus der `IdQuelle`.
//
// Die Satzarten und Stellen stammen aus frei zugänglichen Beschreibungen (Quellen und Unsicherheiten im Ticket, D-144.1),
// in eigenen Worten: Jede Zeile ist ein Satz zu 80 Zeichen, Stellen 1–2 die Satzart, 75–80 die Satznummer. Gelesen werden:
//   00 Eröffnungssatz: Datenart (Phase) 11–12, OZ-Maske 63–71 (z. B. `1122PPPPI`: Ziffer = Gliederungsstufe, P = Position,
//      I = Index, 0 = unbelegt)
//   01 Bezeichnung des LV 3–42 · 02 Projekt · 03 Auftraggeber · 04 Bieter bzw. Auftragnehmer (Text ab Stelle 3)
//   11 Beginn einer Gliederung: OZ 3–11, Kennzeichen 12 · 12 Bezeichnung der Gliederung · 31 Ende der Gliederung: OZ 3–11
//   20 Beginn eines Hinweistexts · 21 Position: OZ 3–11, Positionsart 12 (N, G Grundposition, A Alternative) und 13
//      (N, E Bedarf ohne Gesamtbetrag, M Bedarf mit Gesamtbetrag), Menge 24–34 (8 + 3 Stellen ohne Komma), Einheit 35–38
//   23 Preise: Einheitspreis 13–22 (8 + 2 Stellen) mit Zehntelcent 23, Gesamtbetrag 25–36 (10 + 2 Stellen)
//   25 Kurztext · 26 Langtext (Text ab Stelle 3, führender Leerraum fällt weg)
//   T0 … T9 vertragliche Regelungen vor dem Satz 00 (T1 trägt den Text)
// Abgeleitete Angaben (32 Summe einer Gliederung, 99 Abschluss) liest die App nicht; sie rechnet selbst. Was belegt ist, aber
// keinen Platz im Modell hat, ist ein Befund „Nicht übernommen“ (D-80); unbekannte Satzarten sind Befunde (D-71).

import { gesamtpreis, leseAustausch, vergleiche } from '@tethys/dezimal';
import type { Zahl } from '@tethys/dezimal';
import type {
  Angebotsposition,
  Auftraggeber,
  Auftragnehmer,
  Bedarf,
  Betrag,
  Einheitspreis,
  GaebPhase,
  IdQuelle,
  Knoten,
  Langtext,
  LvInhalt,
  OzMaske,
  OzStelle,
  Position,
  PositionId,
  Prozent,
  Zahlenart,
} from '@tethys/vertrag';
import { betragsziel } from '@tethys/kern';
import { phaseAbweisen } from './abweisung';
import { deutsch, text } from './befunde';
import type { GaebBefund } from './befunde';
import type { Phasenquelle } from './erkennung';
import { LvAufbau } from './lvaufbau';
import type { Wahlangabe } from './lvaufbau';
import { Zeilenmelder } from './zeilenbefunde';
import { ZEICHENSATZ_NAME } from './zeichensatz';
import type { Zeichensatz } from './zeichensatz';

/** Eine erkannte GAEB-90-Datei, schon dekodiert (aus dem Vorlauf der Leser). */
export interface Gaeb90Datei {
  readonly text: string;
  /** Am Inhalt geschätzt; `null`, wenn die Eingabe schon Text war. */
  readonly zeichensatz: Zeichensatz | null;
  readonly phase: GaebPhase | null;
  readonly phasenquelle: Phasenquelle | null;
  /** Die Phase, auf die die Dateiendung hinweist (`.d83` → X83), `null`: keine GAEB-Endung. */
  readonly endungsphase: GaebPhase | null;
}

const SATZLAENGE = 80;

/** Ein Satz der Datei: Satzart, Zeile (ab 1) und der Satz auf 80 Zeichen aufgefüllt. */
interface Satz {
  readonly art: string;
  readonly zeile: number;
  readonly s: string;
}

/** Stellen `von` bis `bis` (ab 1, einschließlich), wie die Formatbeschreibung sie zählt. */
const stellen = (s: Satz, von: number, bis: number): string => s.s.slice(von - 1, bis);
const leer = (t: string): boolean => t.trim() === '';

/** Text eines Textsatzes (12, 25, 26, T1, 01 … 04): ab Stelle 3 bis vor die Satznummer, Leerraum außen entfernt. */
const textVon = (s: Satz): string => stellen(s, 3, 74).trim();

const DOS_ENDE = String.fromCharCode(0x1a);

/** Zerlegt den Text in Sätze; falsche Satzlänge und Lücken in der Satznummer sind je ein zusammengefasster Befund. */
function saetzeLesen(text: string, m: Zeilenmelder): Satz[] {
  const zeilen = text.split(/\r\n|\n|\r/);
  while (zeilen.length > 0 && (zeilen.at(-1) ?? '').replaceAll(DOS_ENDE, '').trim() === '') zeilen.pop();
  const saetze: Satz[] = [];
  for (const [i, roh] of zeilen.entries()) {
    const zeile = i + 1;
    if (roh.length !== SATZLAENGE)
      m.sammle('satz-laenge', 'satz-laenge', zeile, (n) =>
        n === 1
          ? `Ein Satz ist nicht genau ${String(SATZLAENGE)} Zeichen lang; er wird aufgefüllt bzw. nach Stelle ${String(SATZLAENGE)} abgeschnitten.`
          : `${String(n)} Sätze sind nicht genau ${String(SATZLAENGE)} Zeichen lang; sie werden aufgefüllt bzw. nach Stelle ${String(SATZLAENGE)} abgeschnitten.`,
      );
    const s = roh.padEnd(SATZLAENGE, ' ').slice(0, SATZLAENGE);
    const nummer = s.slice(74);
    if (!/^[0-9]{6}$/.test(nummer) || Number(nummer) !== zeile)
      m.sammle('satznummer', 'satznummer-abweichend', zeile, (n) =>
        n === 1
          ? 'Eine Satznummer (Stellen 75 bis 80) fehlt oder ist nicht fortlaufend; gelesen wird trotzdem in der Reihenfolge der Datei.'
          : `${String(n)} Satznummern (Stellen 75 bis 80) fehlen oder sind nicht fortlaufend; gelesen wird trotzdem in der Reihenfolge der Datei.`,
      );
    saetze.push({ art: s.slice(0, 2), zeile, s });
  }
  return saetze;
}

// --- OZ-Maske und OZ ---------------------------------------------------------------------------------------

/** Die Maske als Stellenbereiche im OZ-Feld (Stellen 3–11 der Sätze 11, 21, 23 …). */
interface Maskenbereiche {
  readonly maske: OzMaske;
  /** Je Gliederungsstufe [Anfang, Länge] im 9-stelligen OZ-Feld. */
  readonly stufen: readonly (readonly [number, number])[];
  readonly position: readonly [number, number];
  readonly index: readonly [number, number] | null;
}

const NUMERISCH = (laenge: number): OzStelle => ({ laenge, zeichen: 'numerisch' });

/**
 * OZ-Maske des Satzes 00 (9 Zeichen). Gliederungsstufen sind Ziffern 1, 2, … in dieser Reihenfolge, dann `P`, dann
 * höchstens ein `I`, unbelegte Stellen `0` (oder leer) am Ende. Nur der Index ist alphanumerisch. Eine ungültige Maske ist
 * ein Fehler; dann gilt das ganze OZ-Feld als Positionsnummer.
 */
function leseMaske90(roh: string, trenn: string | null, m: Zeilenmelder, zeile: number | null): Maskenbereiche {
  const ersatz: Maskenbereiche = {
    maske: { gliederung: [], position: NUMERISCH(9), index: null, trennzeichen: trenn },
    stufen: [],
    position: [0, 9],
    index: null,
  };
  const laeufe: { zeichen: string; anfang: number; laenge: number }[] = [];
  for (const [i, c] of [...roh].entries()) {
    const z = c === ' ' ? '0' : c.toUpperCase();
    const letzter = laeufe.at(-1);
    if (letzter && letzter.zeichen === z) letzter.laenge += 1;
    else laeufe.push({ zeichen: z, anfang: i, laenge: 1 });
  }
  const belegt = laeufe.filter((l) => l.zeichen !== '0');
  const stufen = belegt.filter((l) => /^[1-9]$/.test(l.zeichen));
  const pos = belegt.filter((l) => l.zeichen === 'P');
  const idx = belegt.filter((l) => l.zeichen === 'I');
  const fremd = belegt.filter((l) => !/^[1-9PI]$/.test(l.zeichen));
  const reihenfolge = belegt.map((l) => l.zeichen).join('');
  const erwartet = `${stufen.map((_, i) => String(i + 1)).join('')}P${idx.length === 1 ? 'I' : ''}`;
  const ungenutztInnen = laeufe.findIndex((l) => l.zeichen === '0') < laeufe.findLastIndex((l) => l.zeichen !== '0');
  const indexLaenge = idx[0]?.laenge ?? 1;
  if (
    fremd.length > 0 ||
    pos.length !== 1 ||
    idx.length > 1 ||
    reihenfolge !== erwartet ||
    ungenutztInnen ||
    indexLaenge !== 1
  ) {
    m.melde(
      'fehler',
      'oz-maske-ungueltig',
      `Die OZ-Maske „${roh.trim()}“ im Eröffnungssatz ist nicht lesbar (erwartet z. B. 1122PPPPI: Ziffern für die ` +
        'Gliederungsstufen, P für die Position, I für den Index, 0 für unbelegte Stellen); die ganze OZ wird als ' +
        'Positionsnummer gelesen.',
      zeile,
      { werte: { wert: text(roh.trim()) } },
    );
    return ersatz;
  }
  const p = pos[0] as { anfang: number; laenge: number };
  const i = idx[0];
  return {
    maske: {
      gliederung: stufen.map((s) => NUMERISCH(s.laenge)),
      position: NUMERISCH(p.laenge),
      index: i === undefined ? null : { laenge: 1, zeichen: 'alphanumerisch' },
      trennzeichen: trenn,
    },
    stufen: stufen.map((s) => [s.anfang, s.laenge] as const),
    position: [p.anfang, p.laenge],
    index: i === undefined ? null : [i.anfang, 1],
  };
}

interface Oz {
  /** Gliederungsteile, dann bei einer Position die Positionsstelle; `null`: nicht lesbar. */
  readonly teile: string[] | null;
  readonly index: string | null;
}

/**
 * Das OZ-Feld (Stellen 3–11) nach der Maske zerlegen. Bei einer Gliederung zählen die belegten Stufen von vorn; bei einer
 * Position müssen alle Stufen und die Positionsstelle belegt sein. Ziffern sind Pflicht außer im Index (Befund).
 */
function zerlegeOz(s: Satz, b: Maskenbereiche, m: Zeilenmelder, position: boolean): Oz {
  const feld = stellen(s, 3, 11);
  const teil = ([anfang, laenge]: readonly [number, number]): string =>
    feld.slice(anfang, anfang + laenge).trim();
  const teile: string[] = [];
  for (const bereich of b.stufen) {
    const t = teil(bereich);
    if (t === '') break;
    teile.push(t);
  }
  const anzeige = feld.trim();
  if (position) {
    const p = teil(b.position);
    if (teile.length < b.stufen.length || p === '') {
      m.melde(
        'warnung',
        'oz-teil-fehlt',
        `Die Ordnungszahl „${anzeige}“ füllt die OZ-Maske nicht; die Ordnungszahl bleibt leer.`,
        s.zeile,
        { werte: { wert: text(anzeige) } },
      );
      return { teile: null, index: null };
    }
    teile.push(p);
  } else if (teile.length === 0) return { teile: null, index: null };
  if (teile.some((t) => !/^[0-9]+$/.test(t)))
    m.melde(
      'warnung',
      'oz-teil-zeichen',
      `Die Ordnungszahl „${anzeige}“ enthält außerhalb des Index andere Zeichen als Ziffern.`,
      s.zeile,
      { werte: { wert: text(anzeige) } },
    );
  const index = position && b.index !== null ? teil(b.index) || null : null;
  return { teile, index };
}

// --- Zahlen ------------------------------------------------------------------------------------------------

/**
 * Eine Zahl ohne Komma mit fester Zahl von Nachkommastellen (`00000125500` mit 3 → 125.500). Leer: `null`. Andere Zeichen als
 * Ziffern sind ein Befund `dezimal-ungueltig`, der Wert fehlt dann.
 */
function festzahl<Z extends Zahlenart>(
  art: Z,
  roh: string,
  nach: number,
  s: Satz,
  m: Zeilenmelder,
  feld: string,
): Zahl<Z> | null {
  if (leer(roh)) return null;
  const ziffern = roh.trim();
  if (!/^[0-9]+$/.test(ziffern)) {
    m.melde('fehler', 'dezimal-ungueltig', `Wert „${ziffern}“ ist keine Zahl ohne Komma.`, s.zeile, {
      feld,
      werte: { wert: text(ziffern) },
    });
    return null;
  }
  const voll = ziffern.padStart(nach + 1, '0');
  const ganz = voll.slice(0, voll.length - nach).replace(/^0+(?=[0-9])/, '');
  const r = leseAustausch(art, nach === 0 ? ganz : `${ganz}.${voll.slice(voll.length - nach)}`);
  if (!r.ok) {
    m.melde('fehler', 'dezimal-ungueltig', `Wert „${ziffern}“ ist keine lesbare Zahl: ${r.fehler.meldung}`, s.zeile, {
      feld,
      werte: { wert: text(ziffern) },
    });
    return null;
  }
  return r.wert;
}

// --- Texte -------------------------------------------------------------------------------------------------

/**
 * Langtextzeilen → Langtext: aufeinanderfolgende Zeilen bilden einen Absatz mit Zeilenumbrüchen, eine leere Zeile beginnt
 * einen neuen Absatz (Lesart D-144.7; GAEB 90 kennt keine Auszeichnung, Listen oder Tabellen).
 */
function langtextAus(zeilen: readonly string[]): Langtext {
  const absaetze: string[][] = [];
  let aktuell: string[] = [];
  for (const z of zeilen) {
    if (z === '') {
      if (aktuell.length > 0) absaetze.push(aktuell);
      aktuell = [];
    } else aktuell.push(z);
  }
  if (aktuell.length > 0) absaetze.push(aktuell);
  return absaetze.map((a) => ({
    art: 'absatz',
    inhalt: a.flatMap((z, i) =>
      i === 0 ? [{ art: 'text', text: z } as const] : [{ art: 'umbruch' } as const, { art: 'text', text: z } as const],
    ),
  }));
}

// --- Blöcke ------------------------------------------------------------------------------------------------

/** Sätze, die zum Satz davor gehören (Texte, Preise, Bezeichnung der Gliederung, vertragliche Regelungen). */
const FOLGESAETZE: ReadonlySet<string> = new Set(['12', '22', '23', '25', '26', '30', 'T1', 'T9']);

interface Block {
  readonly kopf: Satz;
  readonly folge: Satz[];
}

function bloecke(saetze: readonly Satz[]): Block[] {
  const ergebnis: Block[] = [];
  for (const s of saetze) {
    const letzter = ergebnis.at(-1);
    if (letzter && FOLGESAETZE.has(s.art)) letzter.folge.push(s);
    else ergebnis.push({ kopf: s, folge: [] });
  }
  return ergebnis;
}

/** Satzarten, die belegt sind, deren Inhalt das Modell aber nicht hält (Bezeichnung in Nutzersprache). */
const NICHT_UEBERNOMMEN: Readonly<Record<string, string>> = {
  '06': 'Bezeichnung der Einheitspreisanteile',
  '08': 'Währung',
  '10': 'Los außerhalb der Ordnungszahl',
  '33': 'Los außerhalb der Ordnungszahl',
  '22': 'Preisangabe der Satzart 22',
  '24': 'Unterbeschreibung',
  '30': 'Einheitspreisanteile',
};

/** Abgeleitete Sätze: Die App rechnet die Summen selbst (wie `Totals` in DA XML). */
const ABGELEITET: ReadonlySet<string> = new Set(['32', '99']);

// --- Kopf ----------------------------------------------------------------------------------------------------

interface Kopf {
  bereiche: Maskenbereiche;
  name: string | null;
  projekt: { text: string; zeile: number } | null;
  auftraggeber: string | null;
  bieter: string | null;
  vertraglich: string[];
}

/** Der Eröffnungssatz 00: Maske; Stellen außer Datenart, Kennzeichen 13, Maske und Ausgabejahr sind Befund. */
function eroeffnung(s: Satz, trenn: string | null, m: Zeilenmelder): Maskenbereiche {
  const rest = stellen(s, 3, 10) + stellen(s, 14, 62);
  if (!leer(rest)) m.nichtUebernommen(s.zeile, 'weitere Angaben im Eröffnungssatz');
  return leseMaske90(stellen(s, 63, 71), trenn, m, s.zeile);
}

/** Satzarten 01–09 und T0 … T9; liefert `true`, wenn der Block zum Kopf gehörte. */
function kopfsatz(b: Block, k: Kopf, m: Zeilenmelder, trenn: string | null): boolean {
  const s = b.kopf;
  switch (s.art) {
    case '00':
      k.bereiche = eroeffnung(s, trenn, m);
      return true;
    case '01':
      k.name ??= stellen(s, 3, 42).trim() || null;
      if (!leer(stellen(s, 43, 50))) m.nichtUebernommen(s.zeile, 'Datum des Leistungsverzeichnisses');
      if (!leer(stellen(s, 51, 74))) m.nichtUebernommen(s.zeile, 'weitere Angaben zum Leistungsverzeichnis');
      return true;
    case '02':
      if (!leer(textVon(s))) k.projekt ??= { text: textVon(s), zeile: s.zeile };
      return true;
    case '03':
      if (k.auftraggeber === null) k.auftraggeber = textVon(s) || null;
      else if (!leer(textVon(s))) m.nichtUebernommen(s.zeile, 'weitere Angaben zum Auftraggeber');
      return true;
    case '04':
      if (k.bieter === null) k.bieter = textVon(s) || null;
      else if (!leer(textVon(s))) m.nichtUebernommen(s.zeile, 'weitere Angaben zum Bieter');
      return true;
    case 'T0':
      for (const f of b.folge) if (f.art === 'T1') k.vertraglich.push(textVon(f));
      if (!leer(textVon(s))) k.vertraglich.unshift(textVon(s));
      return true;
    default:
      return false;
  }
}

// --- Gemeinsamer Lauf über die Datei ----------------------------------------------------------------------

/** Meldet einen Satz, den kein Leser übernimmt: belegt, aber ohne Platz, oder unbekannt. */
function uebrig(s: Satz, m: Zeilenmelder): void {
  const bez = NICHT_UEBERNOMMEN[s.art];
  if (bez !== undefined) m.nichtUebernommen(s.zeile, bez);
  else if (/^[78][0-9]$/.test(s.art)) m.nichtUebernommen(s.zeile, `freie Angaben der Satzart ${s.art}`);
  else
    m.sammle(`satzart|${s.art}`, 'satzart-unbekannt', s.zeile, (n) =>
      `${n === 1 ? 'Ein Satz' : `${String(n)} Sätze`} der Satzart „${s.art}“ ${n === 1 ? 'ist' : 'sind'} in der ` +
        `Formatbeschreibung nicht belegt und ${n === 1 ? 'wird' : 'werden'} nicht übernommen.`,
      { werte: { satzart: text(s.art) } },
    );
}

/** Befunde, die jeder GAEB-90-Import trägt: der feste Hinweis (D-71), Zeichensatz, Widerspruch zwischen Inhalt und Endung. */
function grundbefunde(d: Gaeb90Datei, m: Zeilenmelder): void {
  m.melde(
    'warnung',
    'format-ungeprueft',
    'Das Lesen von GAEB 90 ist nach der Formatbeschreibung gebaut und nicht an Dateien aus anderer Software geprüft; bitte die ' +
      'Summen mit denen des Absenders vergleichen.',
    null,
    { werte: { format: text('GAEB 90') } },
  );
  if (d.zeichensatz !== null)
    m.melde(
      'warnung',
      'zeichensatz-erkannt',
      `Die Datei nennt ihren Zeichensatz nicht; am Inhalt erkannt und gelesen als ${ZEICHENSATZ_NAME[d.zeichensatz]}. ` +
        'Umlaute bitte prüfen.',
      null,
      { werte: { zeichensatz: text(ZEICHENSATZ_NAME[d.zeichensatz]) } },
    );
  if (d.phasenquelle === 'inhalt' && d.endungsphase !== null && d.endungsphase !== d.phase)
    m.melde(
      'warnung',
      'phase-endung-widerspruch',
      `Die Dateiendung weist auf ${d.endungsphase}, die Datei selbst nennt ${d.phase ?? ''}; es gilt die Datei.`,
      1,
      { werte: { phase: text(d.phase ?? ''), endung: text(d.endungsphase) } },
    );
}

const leererKopf = (trenn: string | null): Kopf => ({
  bereiche: {
    maske: { gliederung: [], position: NUMERISCH(9), index: null, trennzeichen: trenn },
    stufen: [],
    position: [0, 9],
    index: null,
  },
  name: null,
  projekt: null,
  auftraggeber: null,
  bieter: null,
  vertraglich: [],
});

// --- LV (X81, X83, X86) ----------------------------------------------------------------------------------

export interface Gaeb90LvOptionen {
  readonly ids: IdQuelle;
  readonly standardMwstSatz?: Prozent;
  readonly dateiname?: string;
  readonly trennzeichen?: string | null;
}

const LESBARE_PHASEN: ReadonlySet<GaebPhase> = new Set<GaebPhase>(['X81', 'X83', 'X86']);

/** Positionsart 1 (Stelle 12): N normal, G Grundposition, A Alternative. */
function wahlAus(c: string): Wahlangabe | null | undefined {
  if (c === 'G') return { art: 'grund', gruppe: null, variante: null };
  if (c === 'A') return { art: 'alternative', gruppe: null, variante: null };
  return c === 'N' || c === ' ' ? null : undefined;
}

/** Positionsart 2 (Stelle 13): N normal, E Bedarf ohne Gesamtbetrag, M Bedarf mit Gesamtbetrag. */
function bedarfAus(c: string): Bedarf | null | undefined {
  if (c === 'E') return 'ohne-gesamtbetrag';
  if (c === 'M') return 'mit-gesamtbetrag';
  return c === 'N' || c === ' ' ? null : undefined;
}

interface Preise {
  readonly ep: Einheitspreis | null;
  readonly gb: Betrag | null;
  readonly zeile: number | null;
}

/** Satz 23: Einheitspreis (13–22 mit Zehntelcent in 23, zusammen drei Nachkommastellen) und Gesamtbetrag (25–36). */
function preiseAus(folge: readonly Satz[], m: Zeilenmelder): Preise {
  const satz = folge.find((f) => f.art === '23');
  for (const f of folge.filter((x) => x.art === '23').slice(1))
    m.nichtUebernommen(f.zeile, 'zweite Preisangabe einer Position');
  if (!satz) return { ep: null, gb: null, zeile: null };
  const epRoh = stellen(satz, 13, 22);
  const zehntel = stellen(satz, 23, 23);
  const ep = leer(epRoh)
    ? null
    : festzahl('einheitspreis', epRoh.trim() + (zehntel === ' ' ? '0' : zehntel), 3, satz, m, 'einheitspreis');
  const gb = festzahl('betrag', stellen(satz, 25, 36), 2, satz, m, 'gesamtpreis');
  if (!leer(stellen(satz, 12, 12) + stellen(satz, 24, 24) + stellen(satz, 37, 74)))
    m.nichtUebernommen(satz.zeile, 'weitere Angaben zum Preis einer Position');
  return { ep, gb, zeile: satz.zeile };
}

class Lv90 {
  readonly aufbau: LvAufbau;

  constructor(
    private readonly m: Zeilenmelder,
    private readonly k: Kopf,
    ids: IdQuelle,
  ) {
    this.aufbau = new LvAufbau(m, ids, k.bereiche.maske);
  }

  block(b: Block): void {
    const s = b.kopf;
    switch (s.art) {
      case '11':
        return this.gliederung(b);
      case '31':
        return this.aufbau.schliesse(zerlegeOz(s, this.k.bereiche, this.m, false).teile, s.zeile);
      case '20':
        return this.hinweis(b);
      case '21':
        return this.position(b);
      default:
        if (ABGELEITET.has(s.art)) return;
        uebrig(s, this.m);
        for (const f of b.folge) uebrig(f, this.m);
    }
  }

  private gliederung(b: Block): void {
    const s = b.kopf;
    const oz = zerlegeOz(s, this.k.bereiche, this.m, false);
    const kurz = b.folge
      .filter((f) => f.art === '12')
      .map(textVon)
      .filter((t) => t !== '')
      .join(' ');
    const kennzeichen = stellen(s, 12, 12);
    if (kennzeichen === 'G' || kennzeichen === 'A')
      this.m.melde(
        'warnung',
        'gliederungswahl-nicht-abgebildet',
        `Die Gliederung ${stellen(s, 3, 11).trim()} ist als ${kennzeichen === 'G' ? 'Grundausführung' : 'Alternative'} ` +
          'gekennzeichnet. Eine Wahl gibt es nur an einzelnen Positionen; die Positionen der Gliederung werden ohne Wahl gelesen.',
        s.zeile,
      );
    else if (kennzeichen !== 'N' && kennzeichen !== ' ')
      this.m.melde('warnung', 'enum-ungueltig', `Kennzeichen „${kennzeichen}“ der Gliederung ist unbekannt.`, s.zeile);
    if (!leer(stellen(s, 13, 74))) this.m.nichtUebernommen(s.zeile, 'weitere Angaben zur Gliederung');
    this.aufbau.oeffne(oz.teile, kurz, s.zeile);
    for (const f of b.folge) if (f.art !== '12') uebrig(f, this.m);
  }

  /** Satz 20 mit Langtext (26); ohne Langtext trägt der Kurztext (25) den Hinweis. */
  private hinweis(b: Block): void {
    if (!leer(stellen(b.kopf, 3, 74))) this.m.nichtUebernommen(b.kopf.zeile, 'weitere Angaben zum Hinweistext');
    const lang = b.folge.filter((f) => f.art === '26').map(textVon);
    const kurz = b.folge.filter((f) => f.art === '25');
    let zeilen = lang;
    if (lang.every((z) => z === '')) zeilen = kurz.map(textVon);
    else if (kurz.some((f) => !leer(textVon(f))))
      this.m.nichtUebernommen(kurz[0]?.zeile ?? null, 'Kurztext eines Hinweistexts');
    for (const f of b.folge) if (f.art !== '25' && f.art !== '26') uebrig(f, this.m);
    this.aufbau.hinweis(langtextAus(zeilen));
  }

  private position(b: Block): void {
    const s = b.kopf;
    const oz = zerlegeOz(s, this.k.bereiche, this.m, true);
    const p1 = stellen(s, 12, 12);
    const p2 = stellen(s, 13, 13);
    const p3 = stellen(s, 14, 14);
    const wahl = wahlAus(p1);
    const bedarf = bedarfAus(p2);
    if (wahl === undefined)
      this.m.melde('warnung', 'enum-ungueltig', `Positionsart „${p1}“ (Stelle 12) ist unbekannt; gelesen als normale Position.`, s.zeile);
    if (bedarf === undefined)
      this.m.melde('warnung', 'enum-ungueltig', `Positionsart „${p2}“ (Stelle 13) ist unbekannt; gelesen als normale Position.`, s.zeile);
    // Stelle 14: in allen Beispielen „N“; eine Bedeutung anderer Werte ist nicht belegt (D-144.5).
    if (p3 !== 'N' && p3 !== ' ')
      this.m.nichtUebernommen(s.zeile, 'Positionsart in Stelle 14', `der Wert „${p3}“ ist in der Formatbeschreibung nicht belegt`);
    if (!leer(stellen(s, 15, 23) + stellen(s, 39, 74)))
      this.m.nichtUebernommen(s.zeile, 'weitere Angaben zur Position');
    const menge = festzahl('menge', stellen(s, 24, 34), 3, s, this.m, 'menge');
    const einheit = stellen(s, 35, 38).trim() || null;
    const kurz = b.folge.filter((f) => f.art === '25').map(textVon).filter((t) => t !== '');
    const lang = b.folge.filter((f) => f.art === '26').map(textVon);
    const preise = preiseAus(b.folge, this.m);
    for (const f of b.folge) if (!['23', '25', '26'].includes(f.art)) uebrig(f, this.m);

    const pos = this.aufbau.position({
      teile: oz.teile,
      index: oz.index,
      merkmale: { bedarf: bedarf ?? null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
      wahl: wahl ?? null,
      kurztext: kurz.join(' '),
      langtext: langtextAus(lang),
      menge,
      einheit,
      einheitspreis: preise.ep,
      zeile: s.zeile,
    });
    const ort = { knotenId: pos.id };
    if (menge === null)
      this.m.melde('warnung', 'menge-fehlt', 'Die Position hat keine Menge.', s.zeile, { ...ort, feld: 'menge' });
    if (einheit === null)
      this.m.melde('warnung', 'einheit-fehlt', 'Die Position hat keine Mengeneinheit.', s.zeile, { ...ort, feld: 'einheit' });
    if (kurz.length === 0 && lang.every((z) => z === ''))
      this.m.melde('warnung', 'beschreibung-fehlt', 'Die Position hat weder Kurz- noch Langtext.', s.zeile, ort);
    if (menge !== null && preise.ep !== null && preise.gb !== null) {
      const soll = gesamtpreis(menge, preise.ep);
      if (vergleiche(preise.gb, soll) !== 0) {
        const datei = { art: 'betrag', wert: preise.gb } as const;
        const gerechnet = { art: 'betrag', wert: soll } as const;
        this.m.melde(
          'warnung',
          'gesamtpreis-abweichend',
          `Der Gesamtbetrag der Datei (${deutsch(datei)}) weicht von Menge × EP (${deutsch(gerechnet)}) ab; gerechnet wird ` +
            'mit Menge × EP.',
          preise.zeile,
          { ...ort, feld: 'gesamtpreis', werte: { datei, gerechnet } },
        );
      }
    }
  }
}

/** Bereitet Sätze und Kopf für beide Leser vor. */
function vorbereiten(d: Gaeb90Datei, m: Zeilenmelder, trenn: string | null): { kopf: Kopf; rest: Block[] } {
  const kopf = leererKopf(trenn);
  const rest: Block[] = [];
  let mitMaske = false;
  for (const b of bloecke(saetzeLesen(d.text, m))) {
    if (b.kopf.art === '00') mitMaske = true;
    if (!kopfsatz(b, kopf, m, trenn)) rest.push(b);
  }
  if (!mitMaske)
    m.melde(
      'fehler',
      'oz-maske-ohne-position',
      'Der Eröffnungssatz 00 fehlt; ohne OZ-Maske wird die ganze OZ als Positionsnummer gelesen.',
      null,
    );
  return { kopf, rest };
}

/** GAEB 90, Phasen X81, X83, X86 → `LvInhalt`. Wirft nie bei Dateiinhalt. */
export function leseGaeb90Lv(
  d: Gaeb90Datei,
  opt: Gaeb90LvOptionen,
): { phase: GaebPhase | null; inhalt: LvInhalt | null; befunde: GaebBefund[] } {
  const m = new Zeilenmelder();
  grundbefunde(d, m);
  if (d.phase !== null && !LESBARE_PHASEN.has(d.phase)) {
    const a = phaseAbweisen(d.phase, 'lv');
    m.melde('fehler', 'phase-nicht-unterstuetzt', a.meldung, null, { werte: a.werte });
    return { phase: d.phase, inhalt: null, befunde: m.ergebnis() };
  }
  const trenn = opt.trennzeichen === undefined ? '.' : opt.trennzeichen;
  const { kopf, rest } = vorbereiten(d, m, trenn);
  const lv = new Lv90(m, kopf, opt.ids);
  if (kopf.vertraglich.some((z) => z !== '')) lv.aufbau.hinweis(langtextAus(kopf.vertraglich));
  for (const b of rest) lv.block(b);
  lv.aufbau.ende(rest.at(-1)?.kopf.zeile ?? null);
  if (!lv.aufbau.knoten.some((k) => k.art === 'position'))
    m.melde('warnung', 'lv-leer', 'Das Leistungsverzeichnis enthält keine Position.', null);

  const x86 = d.phase === 'X86';
  const name = kopf.name ?? kopf.projekt?.text ?? opt.dateiname ?? 'Leistungsverzeichnis';
  if (kopf.projekt !== null && kopf.name !== null) m.nichtUebernommen(kopf.projekt.zeile, 'Projektbezeichnung');
  if (kopf.bieter !== null && !x86) m.nichtUebernommen(null, 'Angaben zum Bieter');
  const auftraggeber: Auftraggeber | undefined =
    kopf.auftraggeber === null
      ? undefined
      : { name: kopf.auftraggeber, strasse: null, plz: null, ort: null, vergabenummer: null };
  const auftragnehmer: Auftragnehmer | undefined =
    kopf.bieter === null || !x86 ? undefined : { name: kopf.bieter, strasse: null, plz: null, ort: null };

  // Lesart D-144.8: einen Steuersatz liest der Leser aus GAEB 90 nicht (seine Stelle ist nur aus Beispielen erschlossen).
  const mwstSatz = opt.standardMwstSatz ?? ('19.00' as Prozent);
  const satz = { art: 'prozent', wert: mwstSatz } as const;
  m.melde(
    'warnung',
    opt.standardMwstSatz === undefined ? 'mwst-standardsatz' : 'mwst-ersatzwert',
    `Aus GAEB 90 wird kein Steuersatz gelesen; eingesetzt wird ${opt.standardMwstSatz === undefined ? 'der Standardsatz' : 'der voreingestellte Satz'} ` +
      `von ${deutsch(satz)}.`,
    null,
    { feld: 'mwstSatz', werte: { satz } },
  );
  const inhalt: LvInhalt = {
    name,
    ozMaske: kopf.bereiche.maske,
    mwstSatz,
    nachlass: null,
    ...(auftraggeber === undefined ? {} : { auftraggeber }),
    ...(auftragnehmer === undefined ? {} : { auftragnehmer }),
    wurzelId: lv.aufbau.wurzelId,
    knoten: lv.aufbau.knoten,
  };
  return { phase: d.phase, inhalt, befunde: m.ergebnis() };
}

// --- Angebot (X84) -----------------------------------------------------------------------------------------

export interface Gaeb90AngebotErgebnis {
  readonly phase: GaebPhase | null;
  readonly positionen: readonly Angebotsposition[] | null;
  readonly bietername: string | null;
  readonly befunde: readonly GaebBefund[];
}

/** Sätze des LV (Gliederung, Texte, Mengen) und abgeleitete Summen: Ein Angebot übernimmt nur Preise. */
const IM_ANGEBOT_UEBERGANGEN: ReadonlySet<string> = new Set(['11', '12', '20', '21', '25', '26', '31', '32', '99']);

const ozVon = (p: Position): string => `${p.ordnungszahl ?? '(ohne OZ)'}${p.ozIndex ?? ''}`;

/**
 * GAEB 90, Phase X84 → Angebotspositionen zum LV (Zuordnung allein über die OZ wie beim DA-XML-Leser). Eine D84 trägt nur
 * Ordnungszahlen und Preise (Satz 23); Sätze der Gliederung und Texte gehören zum LV und werden übergangen. Einen Nachlass und
 * Zuschlagssätze trägt sie nach der Beschreibung nicht.
 */
export function leseGaeb90Angebot(
  d: Gaeb90Datei,
  lv: { readonly knoten: readonly Knoten[]; readonly ozMaske: OzMaske },
  gleicheMaske: (a: OzMaske, b: OzMaske) => boolean,
): Gaeb90AngebotErgebnis {
  const m = new Zeilenmelder();
  grundbefunde(d, m);
  if (d.phase !== 'X84') {
    const a = phaseAbweisen(d.phase, 'angebot');
    m.melde('fehler', 'phase-nicht-unterstuetzt', a.meldung, null, { werte: a.werte });
    return { phase: d.phase, positionen: null, bietername: null, befunde: m.ergebnis() };
  }
  const trenn = lv.ozMaske.trennzeichen;
  const { kopf, rest } = vorbereiten(d, m, trenn);
  if (!gleicheMaske(kopf.bereiche.maske, lv.ozMaske))
    m.melde(
      'warnung',
      'maske-abweichend',
      'Die OZ-Maske der Angebotsdatei weicht von der des LV ab; zugeordnet wird trotzdem über die Teile der OZ.',
      null,
    );
  const imLv = new Map<string, Position>();
  for (const k of lv.knoten)
    if (k.art === 'position' && k.ordnungszahl !== null) {
      m.ozBekannt(k.id, ozVon(k));
      const s = `${k.ordnungszahl}|${k.ozIndex ?? ''}`;
      if (!imLv.has(s)) imLv.set(s, k);
    }
  const zeilen = new Map<PositionId, Angebotsposition>();
  const jeSatz = (s: Satz): void => {
    if (s.art !== '23') {
      if (!IM_ANGEBOT_UEBERGANGEN.has(s.art)) uebrig(s, m);
      return;
    }
    const oz = zerlegeOz(s, kopf.bereiche, m, true);
    const anzeige = oz.teile === null ? stellen(s, 3, 11).trim() : `${oz.teile.join(trenn ?? '')}${oz.index ?? ''}`;
    const p = oz.teile === null ? undefined : imLv.get(`${oz.teile.join(trenn ?? '')}|${oz.index ?? ''}`);
    if (!p) {
      m.melde(
        'fehler',
        'position-unbekannt',
        `Die Position ${anzeige} der Angebotsdatei gibt es im LV nicht; die Zeile wird nicht übernommen.`,
        s.zeile,
        { oz: anzeige },
      );
      return;
    }
    if (zeilen.has(p.id)) {
      m.melde(
        'fehler',
        'doppelte-ordnungszahl',
        `Die Position ${anzeige} steht mehrfach in der Angebotsdatei; nur die erste Zeile wird übernommen.`,
        s.zeile,
        { knotenId: p.id },
      );
      return;
    }
    const preise = preiseAus([s], m);
    if (preise.ep === null) {
      zeilen.set(p.id, { positionId: p.id, status: 'nicht-angeboten' });
      return;
    }
    if (p.zuschlag !== null) {
      m.melde(
        'fehler',
        'zuschlag-art-abweichend',
        `Die Position ${anzeige} ist im LV eine Zuschlagsposition, die Angebotsdatei trägt dort einen Einheitspreis; die Zeile ` +
          'wird nicht übernommen.',
        s.zeile,
        { knotenId: p.id },
      );
      zeilen.set(p.id, { positionId: p.id, status: 'nicht-angeboten' });
      return;
    }
    if (preise.gb !== null && p.menge !== null) {
      const soll = gesamtpreis(p.menge, preise.ep);
      const ohneSumme = betragsziel(p) !== 'netto';
      if (!(ohneSumme && vergleiche(preise.gb, '0.00' as Betrag) === 0) && vergleiche(preise.gb, soll) !== 0) {
        const datei = { art: 'betrag', wert: preise.gb } as const;
        const gerechnet = { art: 'betrag', wert: soll } as const;
        m.melde(
          'warnung',
          'gp-abweichend',
          `Der Gesamtbetrag der Angebotsdatei (${deutsch(datei)}) weicht von Menge des LV × EP (${deutsch(gerechnet)}) ab; ` +
            'gerechnet wird mit Menge × EP.',
          s.zeile,
          { knotenId: p.id, feld: 'gesamtpreis', werte: { datei, gerechnet } },
        );
      }
    }
    zeilen.set(p.id, { positionId: p.id, status: 'angeboten', einheitspreis: preise.ep, epa: null });
  };
  for (const b of rest) for (const s of [b.kopf, ...b.folge]) jeSatz(s);

  const positionen: Angebotsposition[] = [];
  for (const k of lv.knoten) {
    if (k.art !== 'position') continue;
    const z = zeilen.get(k.id);
    if (z === undefined)
      m.melde(
        'warnung',
        'position-fehlt-im-angebot',
        `Die Position ${ozVon(k)} des LV fehlt in der Angebotsdatei; sie gilt als nicht angeboten.`,
        null,
        { knotenId: k.id },
      );
    positionen.push(z ?? { positionId: k.id, status: 'nicht-angeboten' });
  }
  if (kopf.projekt !== null) m.nichtUebernommen(kopf.projekt.zeile, 'Projektbezeichnung');
  if (kopf.auftraggeber !== null) m.nichtUebernommen(null, 'Angaben zum Auftraggeber');
  return { phase: d.phase, positionen, bietername: kopf.bieter, befunde: m.ergebnis() };
}

