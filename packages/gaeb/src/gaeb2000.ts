// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB 2000 (Schlüsselwortformat, Dateien .p81/.p83/.p86 und .p84) → dasselbe Modell wie DA XML (Ticket 145, E6, D-71). Nur
// lesen. Rein (A2): Eingabe ist der schon dekodierte Text, Kennungen aus der `IdQuelle`.
//
// Der Aufbau stammt aus frei zugänglichen Beschreibungen (Quellen und Unsicherheiten im Ticket 145), in eigenen Worten: Ein
// Abschnitt (Objekt) steht zwischen `#begin[Name]` und `#end[Name]` (dahinter darf eine Nummer stehen, hinter `#end[GAEB]` die
// Zahl der Objekte und Elemente als `n|m`), ein Wert als `[Name]Wert[end]`, auch über mehrere Zeilen. Gelesen werden:
//   GAEB › GAEBInfo (Version, Zeichensatz; sonst Angaben zum erzeugenden Programm) › PrjInfo (Name) › Vergabe ([DP] Phase,
//   VergabeInfo, AG und AN je mit Adresse/Name1, LV)
//   LV › LVInfo (Name, Bez, LVGlied je mit Typ LVStufe/Position/Index und Laenge = OZ-Maske) · Hinweis (Beschreibung) ·
//   LVBereich (OZ, Bez, darin LVBereich, Position, Hinweis) · Position (OZ, Menge, ME, EP, GB, Beschreibung mit Kurztext und
//   Langtext)
// Die OZ steht ohne Trennzeichen und vollständig (Bereich `01`, Position `010010`); Zahlen mit Dezimalkomma; Texte ab 1.1 als
// RTF (`rtf.ts`). Summen (Summe, SummeNachNL, SummeBrutto) sind abgeleitet und werden nicht gelesen. Was belegt ist, aber keinen
// Platz im Modell hat, ist „nicht übernommen“ (D-80); unbekannte Schlüsselwörter sind Befunde (D-71). Kennzeichen für Bedarf,
// Wahl, Stundenlohn, Pauschal und Zuschlag sind in keiner freien Quelle belegt und werden nicht gelesen (D-145.4).

import { gesamtpreis, leseAustausch, vergleiche } from '@tethys/dezimal';
import type { Zahl } from '@tethys/dezimal';
import type {
  Angebotsposition,
  Auftraggeber,
  Auftragnehmer,
  GaebPhase,
  IdQuelle,
  Knoten,
  Langtext,
  LvInhalt,
  OzMaske,
  OzStelle,
  Prozent,
  Zahlenart,
} from '@tethys/vertrag';
import { phaseAbweisen } from './abweisung';
import { Angebotsaufbau } from './angebotsaufbau';
import { deutsch, text } from './befunde';
import type { GaebBefund } from './befunde';
import type { Phasenquelle } from './erkennung';
import { MAX_STUFEN, OZ_MAX_LAENGE } from './lesen';
import { LvAufbau } from './lvaufbau';
import { textinhalt } from './rtf';
import type { Inline, Textinhalt } from './rtf';
import { Zeilenmelder } from './zeilenbefunde';
import { ZEICHENSATZ_NAME, dekodiereMit } from './zeichensatz';
import type { Zeichensatz } from './zeichensatz';

/** Eine erkannte GAEB-2000-Datei, schon dekodiert (aus dem Vorlauf der Leser, `bereiteGaeb2000`). */
export interface Gaeb2000Datei {
  readonly text: string;
  /** Befund zum Zeichensatz (am Inhalt erkannt oder abweichend von der Angabe der Datei); `null`: keiner. */
  readonly zeichensatz: { readonly meldung: string; readonly name: string } | null;
  readonly phase: GaebPhase | null;
  readonly phasenquelle: Phasenquelle | null;
  /** Die Phase, auf die die Dateiendung hinweist (`.p83` → X83), `null`: keine GAEB-Endung. */
  readonly endungsphase: GaebPhase | null;
}

// --- Zeichensatz --------------------------------------------------------------------------------------------

const ZEICHENSATZ_ANGABE = /\[Zeichensatz\]([^[\r\n]*)\[end\]/;

/**
 * Dekodiert eine GAEB-2000-Datei. Die Datei nennt ihren Zeichensatz in `[Zeichensatz]` (ANSI, ASCII oder Unicode). ANSI wird als
 * Windows-1252 gelesen; ist der Inhalt aber gültiges UTF-8 oder sieht er nach DOS-Zeichensatz aus, ist das ein Befund. Ohne
 * Angabe wird der Zeichensatz am Inhalt geschätzt (Befund wie bei GAEB 90). `geschaetzt` ist die Kodierung aus der Erkennung.
 */
export function bereiteGaeb2000(
  vorlaeufig: string,
  bytes: Uint8Array | null,
  geschaetzt: string | null,
  kopf: Pick<Gaeb2000Datei, 'phase' | 'phasenquelle' | 'endungsphase'>,
): Gaeb2000Datei {
  const fertig = (t: string, zeichensatz: Gaeb2000Datei['zeichensatz']): Gaeb2000Datei => ({
    text: t,
    zeichensatz,
    ...kopf,
  });
  if (bytes === null || geschaetzt === null || geschaetzt.startsWith('utf-16') || geschaetzt === 'ascii')
    return fertig(vorlaeufig, null);
  const angabeRoh = ZEICHENSATZ_ANGABE.exec(vorlaeufig)?.[1]?.trim() ?? null;
  const angabe = angabeRoh?.toUpperCase() ?? null;
  const est = geschaetzt as Zeichensatz;
  const name = ZEICHENSATZ_NAME[est];
  if (angabe === 'ANSI' && est !== 'utf-8') {
    const t = dekodiereMit(bytes, 'iso-8859-1');
    if (est === 'iso-8859-1') return fertig(t, null);
    return fertig(t, {
      name: 'ANSI (Windows-1252)',
      meldung:
        `Die Datei nennt den Zeichensatz ANSI, der Inhalt sieht nach ${name} aus; gelesen wie angegeben als ANSI ` +
        '(Windows-1252). Umlaute bitte prüfen.',
    });
  }
  const t = dekodiereMit(bytes, est);
  if (angabe === 'UNICODE' && est === 'utf-8') return fertig(t, null);
  return fertig(t, {
    name,
    meldung:
      angabeRoh === null || angabeRoh === ''
        ? `Die Datei nennt ihren Zeichensatz nicht; am Inhalt erkannt und gelesen als ${name}. Umlaute bitte prüfen.`
        : `Die Datei nennt den Zeichensatz „${angabeRoh}“, der Inhalt passt nicht dazu; am Inhalt erkannt und gelesen als ` +
          `${name}. Umlaute bitte prüfen.`,
  });
}

// --- Aufbau der Datei: Objekte und Werte ----------------------------------------------------------------------

interface Wert {
  readonly art: 'wert';
  readonly name: string;
  readonly wert: string;
  readonly zeile: number;
}

interface Objekt {
  readonly art: 'objekt';
  readonly name: string;
  readonly zeile: number;
  readonly kinder: (Wert | Objekt)[];
}

const NAME = '[A-Za-z_][A-Za-z0-9_]*';
const BEGIN = new RegExp(`#begin\\[(${NAME})\\][ \\t]*[0-9]*`, 'y');
const END = new RegExp(`#end\\[(${NAME})\\][ \\t]*(?:[0-9]+(?:\\|[0-9]+)?)?`, 'y');
const WERT = new RegExp(`\\[(${NAME})\\]`, 'y');
/** Beginn des nächsten Schlüsselworts am Anfang einer Zeile: dort endet ein Wert ohne `[end]`. */
const NAECHSTES = new RegExp(`\\r?\\n[ \\t]*(?:#begin\\[|#end\\[|\\[(?!end\\])${NAME}\\])`, 'g');

/** Zeichen, mit dem DOS-Dateien enden können (Strg+Z), und ein Byte-Order-Mark: beide kein Inhalt. */
const DOS_ENDE = String.fromCharCode(0x1a);
const BOM = String.fromCharCode(0xfeff);

/** Zeilennummer (ab 1) zu einer Stelle im Text. */
function zeilenrechner(text: string): (i: number) => number {
  const umbrueche: number[] = [];
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) umbrueche.push(i);
  return (stelle) => {
    let lo = 0;
    let hi = umbrueche.length;
    while (lo < hi) {
      const mitte = (lo + hi) >> 1;
      if ((umbrueche[mitte] ?? 0) < stelle) lo = mitte + 1;
      else hi = mitte;
    }
    return lo + 1;
  };
}

/** Zerlegt den Text in Objekte und Werte; Fehler im Aufbau sind Befunde, gelesen wird so viel wie möglich. */
function zerlege(quelle: string, m: Zeilenmelder): Objekt | null {
  const zeileBei = zeilenrechner(quelle);
  const stapel: Objekt[] = [];
  let wurzel: Objekt | null = null;
  const ausserhalb = (stelle: number): void => {
    m.sammle('ausserhalb', 'xml-text-ausserhalb', zeileBei(stelle), (n) =>
      n === 1
        ? 'Text außerhalb eines Schlüsselworts wird übergangen.'
        : `${String(n)} Stellen mit Text außerhalb eines Schlüsselworts werden übergangen.`,
    );
  };
  let i = 0;
  while (i < quelle.length) {
    const c = quelle.charAt(i);
    if (c.trim() === '' || c === DOS_ENDE || c === BOM) {
      i += 1;
      continue;
    }
    if (c === '#') {
      BEGIN.lastIndex = i;
      const b = BEGIN.exec(quelle);
      if (b) {
        const o: Objekt = { art: 'objekt', name: b[1] ?? '', zeile: zeileBei(i), kinder: [] };
        const oben = stapel.at(-1);
        if (oben) oben.kinder.push(o);
        else if (wurzel === null) wurzel = o;
        else ausserhalb(i);
        stapel.push(o);
        i = BEGIN.lastIndex;
        continue;
      }
      END.lastIndex = i;
      const e = END.exec(quelle);
      if (e) {
        const name = e[1] ?? '';
        const tiefe = stapel.map((o) => o.name).lastIndexOf(name);
        if (tiefe < 0)
          m.melde(
            'warnung',
            'xml-schliessendes-tag-unerwartet',
            `Das Ende „${name}“ gehört zu keinem offenen Abschnitt; es wird übergangen.`,
            zeileBei(i),
            { werte: { element: text(name) } },
          );
        else {
          for (const offen of stapel.slice(tiefe + 1))
            m.melde(
              'warnung',
              'xml-abschnitt-offen',
              `Der Abschnitt „${offen.name}“ hat kein Ende; er endet mit „${name}“.`,
              offen.zeile,
              { werte: { element: text(offen.name) } },
            );
          stapel.length = tiefe;
        }
        i = END.lastIndex;
        continue;
      }
    }
    if (c === '[') {
      WERT.lastIndex = i;
      const w = WERT.exec(quelle);
      if (w && w[1] !== 'end') {
        const oben = stapel.at(-1);
        const start = WERT.lastIndex;
        const ende = quelle.indexOf('[end]', start);
        NAECHSTES.lastIndex = start;
        const naechstes = NAECHSTES.exec(quelle);
        let wert: string;
        let abgeschlossen = false;
        if (naechstes && (ende < 0 || naechstes.index < ende)) {
          wert = quelle.slice(start, naechstes.index);
          i = naechstes.index;
        } else if (ende < 0) {
          wert = quelle.slice(start);
          i = quelle.length;
        } else {
          wert = quelle.slice(start, ende);
          i = ende + '[end]'.length;
          abgeschlossen = true;
        }
        if (!abgeschlossen)
          m.sammle('ohne-end', 'xml-tag-nicht-geschlossen', zeileBei(start), (n) =>
            n === 1
              ? 'Ein Wert ist nicht mit [end] abgeschlossen; er endet vor dem nächsten Schlüsselwort.'
              : `${String(n)} Werte sind nicht mit [end] abgeschlossen; sie enden vor dem nächsten Schlüsselwort.`,
          );
        if (oben) oben.kinder.push({ art: 'wert', name: w[1] ?? '', wert, zeile: zeileBei(w.index) });
        else ausserhalb(w.index);
        continue;
      }
    }
    ausserhalb(i);
    const zeilenende = quelle.indexOf('\n', i);
    i = zeilenende < 0 ? quelle.length : zeilenende + 1;
  }
  if (stapel.length > 0)
    m.melde(
      'warnung',
      'xml-abschnitt-offen',
      `${stapel.length === 1 ? 'Ein Abschnitt ist' : `${String(stapel.length)} Abschnitte sind`} am Ende der Datei nicht ` +
        `geschlossen (${stapel.map((o) => o.name).join(', ')}).`,
      null,
    );
  return wurzel;
}

// --- Zugriff auf Objekte ----------------------------------------------------------------------------------

const werteVon = (o: Objekt, name: string): Wert[] =>
  o.kinder.filter((k): k is Wert => k.art === 'wert' && k.name === name);
const objekteVon = (o: Objekt | undefined, name: string): Objekt[] =>
  o === undefined ? [] : o.kinder.filter((k): k is Objekt => k.art === 'objekt' && k.name === name);
const leer = (w: Wert | undefined): boolean => w === undefined || w.wert.trim() === '';

/**
 * Prüft die Kinder eines Objekts: bekannte Namen gibt `bekannt` vor; Unbekanntes ist ein zusammengefasster Befund. Ein Wert, der
 * mehrfach steht, wo einer erwartet wird, ist ab dem zweiten „nicht übernommen“.
 */
function pruefeKinder(
  o: Objekt,
  bekannt: ReadonlySet<string>,
  mehrfach: ReadonlySet<string>,
  m: Zeilenmelder,
): void {
  const gesehen = new Set<string>();
  for (const k of o.kinder) {
    const schluessel = `${k.art}|${k.name}`;
    if (!bekannt.has(k.name)) unbekannt(k, m);
    else if (gesehen.has(schluessel) && !mehrfach.has(k.name))
      m.nichtUebernommen(k.zeile, `wiederholte Angabe „${k.name}“`);
    gesehen.add(schluessel);
  }
}

function unbekannt(k: Wert | Objekt, m: Zeilenmelder): void {
  m.sammle(
    `schluesselwort|${k.name}`,
    'schluesselwort-unbekannt',
    k.zeile,
    (n) =>
      `${n === 1 ? 'Ein Eintrag' : `${String(n)} Einträge`} mit dem Schlüsselwort „${k.name}“ ${n === 1 ? 'ist' : 'sind'} ` +
      `in der Formatbeschreibung nicht belegt und ${n === 1 ? 'wird' : 'werden'} nicht übernommen.`,
    { werte: { schluesselwort: text(k.name) } },
  );
}

/** Ein Wert, der belegt ist, aber keinen Platz im Modell hat (nur wenn er nicht leer ist). */
function nichtUebernommen(o: Objekt, name: string, bezeichnung: string, m: Zeilenmelder): void {
  for (const w of werteVon(o, name)) if (!leer(w)) m.nichtUebernommen(w.zeile, bezeichnung);
}

// --- Zahlen und Texte ---------------------------------------------------------------------------------------

const HINWEIS: Readonly<Record<string, string | null>> = {
  'leerraum-entfernt': null,
  dezimalkomma: null, // die Schreibweise von GAEB 2000
  'plus-entfernt': 'trägt ein überflüssiges Pluszeichen',
  'fuehrende-nullen-entfernt': 'hat führende Nullen',
  'vorzeichen-null-entfernt': 'ist eine negative Null',
  'nachkommastellen-aufgefuellt': null,
  'nullen-abgeschnitten': 'hat mehr Nachkommastellen als zulässig (nur Nullen, verlustfrei gekürzt)',
  gerundet: 'hat mehr Nachkommastellen als zulässig; der Wert wurde kaufmännisch gerundet',
};

/** Eine Zahl mit Dezimalkomma (`125,040`); ein Dezimalpunkt wird gelesen, ist aber ein Befund (Lesart D-145.7). */
function zahl<Z extends Zahlenart>(
  art: Z,
  w: Wert | undefined,
  m: Zeilenmelder,
  feld: string,
): Zahl<Z> | null {
  if (w === undefined || leer(w)) return null;
  const roh = w.wert.trim();
  const r = leseAustausch(art, roh);
  if (!r.ok) {
    m.melde(
      'fehler',
      'dezimal-ungueltig',
      `Wert „${roh}“ ist keine lesbare Zahl: ${r.fehler.meldung}`,
      w.zeile,
      {
        feld,
        werte: { wert: text(roh) },
      },
    );
    return null;
  }
  if (roh.includes('.'))
    m.sammle('dezimalpunkt', 'dezimalpunkt', w.zeile, (n) =>
      n === 1
        ? `Der Wert „${roh}“ hat einen Dezimalpunkt statt des Dezimalkommas; der Punkt wurde als Dezimaltrennzeichen gelesen.`
        : `${String(n)} Werte haben einen Dezimalpunkt statt des Dezimalkommas; der Punkt wurde als Dezimaltrennzeichen gelesen.`,
    );
  for (const h of r.hinweise) {
    const hinweis = HINWEIS[h.code];
    if (hinweis !== null && hinweis !== undefined)
      m.melde(h.code === 'gerundet' ? 'fehler' : 'warnung', h.code, `Wert „${roh}“ ${hinweis}.`, w.zeile, {
        feld,
        werte: { wert: text(roh) },
      });
  }
  return r.wert;
}

/** Text eines Werts; verworfene Formatierung und Bilder sind zusammengefasste Befunde. */
function textVon(w: Wert | undefined, m: Zeilenmelder): Textinhalt {
  if (w === undefined) return { absaetze: [], verworfen: 0, bilder: 0 };
  const t = textinhalt(w.wert);
  if (t.verworfen > 0)
    m.sammle('formatierung', 'formatierung-verworfen', w.zeile, (n) =>
      n === 1
        ? 'Eine Textformatierung (z. B. Schrift, Größe, Farbe, Einzug, Tabelle) wird nicht übernommen; der Text bleibt.'
        : `In ${String(n)} Texten wird Formatierung (z. B. Schrift, Größe, Farbe, Einzug, Tabelle) nicht übernommen; der Text bleibt.`,
    );
  if (t.bilder > 0) m.nichtUebernommen(w.zeile, 'Bild im Text');
  return t;
}

/** Als Langtext: Absätze mit Textläufen (nur gesetzte Auszeichnung) und Zeilenumbrüchen. */
function langtextAus(t: Textinhalt): Langtext {
  return t.absaetze.map((a) => ({
    art: 'absatz',
    inhalt: a.map((l) =>
      l.art === 'umbruch'
        ? { art: 'umbruch' }
        : {
            art: 'text',
            text: l.text,
            ...(l.fett ? { fett: true } : {}),
            ...(l.kursiv ? { kursiv: true } : {}),
            ...(l.unterstrichen ? { unterstrichen: true } : {}),
          },
    ),
  }));
}

/** Als einzeiliger Text (Kurztext, Bezeichnung): Absätze und Umbrüche werden Leerzeichen; Auszeichnung ist ein Befund. */
function zeileAus(t: Textinhalt, w: Wert | undefined, m: Zeilenmelder): string {
  const laeufe: Inline[] = t.absaetze.flatMap((a, i) => (i === 0 ? a : [{ art: 'umbruch' } as const, ...a]));
  if (laeufe.some((l) => l.art === 'text' && (l.fett || l.kursiv || l.unterstrichen)))
    m.sammle('formatierung', 'formatierung-verworfen', w?.zeile ?? null, (n) =>
      n === 1
        ? 'Eine Textformatierung (z. B. Schrift, Größe, Farbe, Einzug, Tabelle) wird nicht übernommen; der Text bleibt.'
        : `In ${String(n)} Texten wird Formatierung (z. B. Schrift, Größe, Farbe, Einzug, Tabelle) nicht übernommen; der Text bleibt.`,
    );
  return laeufe
    .map((l) => (l.art === 'umbruch' ? ' ' : l.text))
    .join('')
    .trim();
}

// --- OZ-Maske und OZ ----------------------------------------------------------------------------------------

interface Maske2000 {
  readonly maske: OzMaske;
  /** Längen der Gliederungsstufen; leer bei der Ersatzmaske. */
  readonly stufen: readonly number[];
  readonly position: number;
  readonly index: boolean;
  /** Ersatz für eine fehlende oder unlesbare Maske: die ganze OZ ist die Positionsnummer. */
  readonly ersatz: boolean;
}

const NUMERISCH = (laenge: number): OzStelle => ({ laenge, zeichen: 'numerisch' });

const ersatzmaske = (trenn: string | null): Maske2000 => ({
  maske: { gliederung: [], position: NUMERISCH(OZ_MAX_LAENGE), index: null, trennzeichen: trenn },
  stufen: [],
  position: OZ_MAX_LAENGE,
  index: false,
  ersatz: true,
});

/** OZ-Maske aus den `LVGlied` der `LVInfo`: Stufen (`LVStufe`), dann `Position`, dann höchstens ein `Index` der Länge 1. */
function maskeLesen(info: Objekt | undefined, trenn: string | null, m: Zeilenmelder): Maske2000 {
  const glieder = objekteVon(info, 'LVGlied');
  if (glieder.length === 0) {
    m.melde(
      'fehler',
      'oz-maske-ohne-position',
      'Die Datei beschreibt keine OZ-Maske (Gliederung der Ordnungszahl); die ganze OZ wird als Positionsnummer gelesen.',
      info?.zeile ?? null,
    );
    return ersatzmaske(trenn);
  }
  const teile: { typ: string; laenge: number }[] = [];
  for (const g of glieder) {
    pruefeKinder(g, new Set(['Typ', 'Laenge', 'Bez']), new Set(), m);
    nichtUebernommen(g, 'Bez', 'Bezeichnung einer Gliederungsstufe', m);
    const laenge = Number((werteVon(g, 'Laenge')[0]?.wert ?? '').trim());
    teile.push({ typ: (werteVon(g, 'Typ')[0]?.wert ?? '').trim(), laenge });
  }
  const folge = teile.map((t) =>
    t.typ === 'LVStufe' ? 'S' : t.typ === 'Position' ? 'P' : t.typ === 'Index' ? 'I' : '?',
  );
  const stufen = teile.filter((t) => t.typ === 'LVStufe').map((t) => t.laenge);
  const position = teile.find((t) => t.typ === 'Position')?.laenge ?? 0;
  const index = teile.find((t) => t.typ === 'Index');
  const summe = teile.reduce((s, t) => s + t.laenge, 0);
  const gueltig =
    /^S*PI?$/.test(folge.join('')) &&
    teile.every((t) => Number.isInteger(t.laenge) && t.laenge >= 1) &&
    (index === undefined || index.laenge === 1) &&
    stufen.length <= MAX_STUFEN &&
    summe <= OZ_MAX_LAENGE;
  if (!gueltig) {
    m.melde(
      'fehler',
      'oz-maske-ungueltig',
      `Die OZ-Maske (${teile.map((t) => `${t.typ || '?'} ${String(t.laenge)}`).join(', ')}) ist nicht lesbar (erwartet: bis zu ` +
        `${String(MAX_STUFEN)} Gliederungsstufen, eine Position, höchstens ein Index der Länge 1, zusammen höchstens ` +
        `${String(OZ_MAX_LAENGE)} Stellen); die ganze OZ wird als Positionsnummer gelesen.`,
      glieder[0]?.zeile ?? null,
    );
    return ersatzmaske(trenn);
  }
  return {
    maske: {
      gliederung: stufen.map(NUMERISCH),
      position: NUMERISCH(position),
      index: index === undefined ? null : { laenge: 1, zeichen: 'alphanumerisch' },
      trennzeichen: trenn,
    },
    stufen,
    position,
    index: index !== undefined,
    ersatz: false,
  };
}

function zerteile(s: string, laengen: readonly number[]): string[] {
  const aus: string[] = [];
  let a = 0;
  for (const l of laengen) {
    aus.push(s.slice(a, a + l));
    a += l;
  }
  return aus;
}

function ozZeichen(teile: readonly string[], anzeige: string, zeile: number, m: Zeilenmelder): void {
  if (teile.some((t) => !/^[0-9]+$/.test(t)))
    m.melde(
      'warnung',
      'oz-teil-zeichen',
      `Die Ordnungszahl „${anzeige}“ enthält außerhalb des Index andere Zeichen als Ziffern.`,
      zeile,
      { werte: { wert: text(anzeige) } },
    );
}

/** OZ eines `LVBereich` der Tiefe `tiefe` (ab 1): die Stellen der Stufen bis dahin, ohne Trennzeichen. */
function ozBereich(
  w: Wert | undefined,
  tiefe: number,
  mk: Maske2000,
  m: Zeilenmelder,
  zeile: number,
): string[] | null {
  const s = (w?.wert ?? '').trim();
  if (mk.ersatz) return s === '' ? null : [s];
  if (tiefe > mk.stufen.length) return null; // die Gliederung selbst ist schon ein Befund (`LvAufbau`)
  const laengen = mk.stufen.slice(0, tiefe);
  const soll = laengen.reduce((a, b) => a + b, 0);
  if (s.length !== soll) {
    m.melde(
      'warnung',
      'oz-teil-fehlt',
      `Die Ordnungszahl „${s}“ des Bereichs passt nicht zur OZ-Maske (erwartet ${String(soll)} Stellen); die Ordnungszahl ` +
        'bleibt leer.',
      w?.zeile ?? zeile,
      { werte: { wert: text(s) } },
    );
    return null;
  }
  const teile = zerteile(s, laengen);
  ozZeichen(teile, s, w?.zeile ?? zeile, m);
  return teile;
}

/** OZ einer Position: alle Stufen und die Positionsstelle, dazu der Index, wenn die Maske einen hat und die OZ eine Stelle länger ist. */
function ozPosition(
  w: Wert | undefined,
  mk: Maske2000,
  m: Zeilenmelder,
  zeile: number,
): { teile: string[] | null; index: string | null; anzeige: string } {
  const s = (w?.wert ?? '').trim();
  if (mk.ersatz) return { teile: s === '' ? null : [s], index: null, anzeige: s };
  const laengen = [...mk.stufen, mk.position];
  const soll = laengen.reduce((a, b) => a + b, 0);
  const mitIndex = mk.index && s.length === soll + 1;
  if (s.length !== soll && !mitIndex) {
    m.melde(
      'warnung',
      'oz-teil-fehlt',
      `Die Ordnungszahl „${s}“ passt nicht zur OZ-Maske (erwartet ${String(soll)} Stellen` +
        `${mk.index ? ` oder ${String(soll + 1)} mit Index` : ''}); die Ordnungszahl bleibt leer.`,
      w?.zeile ?? zeile,
      { werte: { wert: text(s) } },
    );
    return { teile: null, index: null, anzeige: s };
  }
  const teile = zerteile(s, laengen);
  ozZeichen(teile, s, w?.zeile ?? zeile, m);
  return { teile, index: mitIndex ? s.slice(soll) : null, anzeige: s };
}

// --- Kopf ---------------------------------------------------------------------------------------------------

/** Version 1.0 bis 1.2 sind beschrieben; eine andere ist ein Befund, gelesen wird trotzdem. */
const VERSIONEN: ReadonlySet<string> = new Set(['1.0', '1.1', '1.2']);

interface Kopf {
  vergabe: Objekt | undefined;
  lv: Objekt | undefined;
  projektname: string | null;
  auftraggeber: string | null;
  auftragnehmer: string | null;
}

/** Name aus `Adresse/Name1` eines `AG` oder `AN`; weitere Angaben sind „nicht übernommen“. */
function adressname(o: Objekt | undefined, wer: string, m: Zeilenmelder): string | null {
  if (o === undefined) return null;
  pruefeKinder(o, new Set(['Adresse']), new Set(), m);
  const a = objekteVon(o, 'Adresse')[0];
  if (a === undefined) return null;
  pruefeKinder(a, new Set(['Name1', 'Email']), new Set(), m);
  nichtUebernommen(a, 'Email', `E-Mail-Adresse ${wer}`, m);
  const name = (werteVon(a, 'Name1')[0]?.wert ?? '').trim();
  return name === '' ? null : name;
}

/** Wurzel, `GAEBInfo`, `PrjInfo`, `Vergabe` mit `VergabeInfo`, `AG`, `AN`; liefert das LV. */
function kopfLesen(w: Objekt, m: Zeilenmelder): Kopf {
  pruefeKinder(w, new Set(['GAEBInfo', 'PrjInfo', 'Vergabe']), new Set(), m);
  const info = objekteVon(w, 'GAEBInfo')[0];
  if (info) {
    pruefeKinder(
      info,
      new Set([
        'Version',
        'VersMon',
        'VersJahr',
        'Datum',
        'Uhrzeit',
        'ProgSystem',
        'ProgName',
        'Zertifikat',
        'Zeichensatz',
      ]),
      new Set(),
      m,
    );
    const v = werteVon(info, 'Version')[0];
    const version = (v?.wert ?? '').trim();
    if (v && !VERSIONEN.has(version))
      m.melde(
        'warnung',
        'version-unbekannt',
        `Die GAEB-2000-Version „${version}“ ist unbekannt; gelesen wird nach der Beschreibung der Versionen 1.0 bis 1.2.`,
        v.zeile,
        { werte: { version: text(version) } },
      );
  }
  let projektname: string | null = null;
  for (const p of objekteVon(w, 'PrjInfo')) {
    pruefeKinder(p, new Set(['Name', 'Bez', 'Beschreib', 'Wae', 'WaeBez']), new Set(), m);
    projektname ??= (werteVon(p, 'Name')[0]?.wert ?? '').trim() || null;
    nichtUebernommen(p, 'Bez', 'Projektbezeichnung', m);
    nichtUebernommen(p, 'Beschreib', 'Projektbeschreibung', m);
    nichtUebernommen(p, 'Wae', 'Währung', m);
    nichtUebernommen(p, 'WaeBez', 'Bezeichnung der Währung', m);
  }
  const vergabe = objekteVon(w, 'Vergabe')[0];
  if (vergabe === undefined)
    return { vergabe, lv: undefined, projektname, auftraggeber: null, auftragnehmer: null };
  pruefeKinder(vergabe, new Set(['DP', 'VergabeInfo', 'AG', 'AN', 'LV']), new Set(), m);
  for (const vi of objekteVon(vergabe, 'VergabeInfo')) {
    pruefeKinder(vi, new Set(['Art', 'Wae', 'WaeBez', 'Beschreibung']), new Set(), m);
    nichtUebernommen(vi, 'Art', 'Art der Vergabe', m);
    nichtUebernommen(vi, 'Wae', 'Währung', m);
    nichtUebernommen(vi, 'WaeBez', 'Bezeichnung der Währung', m);
    for (const b of objekteVon(vi, 'Beschreibung')) m.nichtUebernommen(b.zeile, 'Beschreibung der Vergabe');
  }
  return {
    vergabe,
    lv: objekteVon(vergabe, 'LV')[0],
    projektname,
    auftraggeber: adressname(objekteVon(vergabe, 'AG')[0], 'des Auftraggebers', m),
    auftragnehmer: adressname(objekteVon(vergabe, 'AN')[0], 'des Auftragnehmers', m),
  };
}

/** Befunde, die jeder GAEB-2000-Import trägt: der feste Hinweis (D-71), Zeichensatz, Widerspruch zwischen Inhalt und Endung. */
function grundbefunde(d: Gaeb2000Datei, m: Zeilenmelder): void {
  m.melde(
    'warnung',
    'format-ungeprueft',
    'Das Lesen von GAEB 2000 ist nach der Formatbeschreibung gebaut und nicht an Dateien aus anderer Software geprüft; bitte ' +
      'die Summen mit denen des Absenders vergleichen.',
    null,
    { werte: { format: text('GAEB 2000') } },
  );
  if (d.zeichensatz !== null)
    m.melde('warnung', 'zeichensatz-erkannt', d.zeichensatz.meldung, null, {
      werte: { zeichensatz: text(d.zeichensatz.name) },
    });
  if (d.phasenquelle === 'inhalt' && d.endungsphase !== null && d.endungsphase !== d.phase)
    m.melde(
      'warnung',
      'phase-endung-widerspruch',
      `Die Dateiendung weist auf ${d.endungsphase}, die Datei selbst nennt ${d.phase ?? ''}; es gilt die Datei.`,
      null,
      { werte: { phase: text(d.phase ?? ''), endung: text(d.endungsphase) } },
    );
}

/** Zerlegt die Datei und prüft die Wurzel; `null` mit Fehlerbefund, wenn nichts zu lesen ist. */
function wurzelLesen(d: Gaeb2000Datei, m: Zeilenmelder): Objekt | null {
  const w = zerlege(d.text, m);
  if (w === null) {
    m.melde('fehler', 'xml-keine-wurzel', 'Die Datei enthält keinen Abschnitt „GAEB“.', null);
    return null;
  }
  if (w.name !== 'GAEB') {
    m.melde(
      'fehler',
      'wurzel-unerwartet',
      `Der oberste Abschnitt heißt „${w.name}“ statt „GAEB“; die Datei wird nicht gelesen.`,
      w.zeile,
      { werte: { element: text(w.name) } },
    );
    return null;
  }
  return w;
}

// --- LV (X81, X83, X86) -------------------------------------------------------------------------------------

export interface Gaeb2000LvOptionen {
  readonly ids: IdQuelle;
  readonly standardMwstSatz?: Prozent;
  readonly dateiname?: string;
  readonly trennzeichen?: string | null;
}

const LESBARE_PHASEN: ReadonlySet<GaebPhase> = new Set<GaebPhase>(['X81', 'X83', 'X86']);
/** Abgeleitete Summen: Die App rechnet selbst (wie `Totals` in DA XML). */
const SUMMEN = ['Summe', 'SummeNachNL', 'SummeBrutto', 'USt'] as const;

class Lv2000 {
  readonly aufbau: LvAufbau;

  constructor(
    private readonly m: Zeilenmelder,
    private readonly mk: Maske2000,
    ids: IdQuelle,
  ) {
    this.aufbau = new LvAufbau(m, ids, mk.maske);
  }

  /** Inhalt des LV oder eines Bereichs in der Reihenfolge der Datei. */
  inhalt(o: Objekt, tiefe: number): void {
    for (const k of o.kinder) {
      if (k.art !== 'objekt') continue;
      if (k.name === 'LVBereich') this.bereich(k, tiefe + 1);
      else if (k.name === 'Position') this.position(k);
      else if (k.name === 'Hinweis') this.hinweis(k);
    }
  }

  private bereich(o: Objekt, tiefe: number): void {
    pruefeKinder(
      o,
      new Set(['OZ', 'Bez', 'BezTx', 'LVBereich', 'Position', 'Hinweis', ...SUMMEN]),
      new Set(['LVBereich', 'Position', 'Hinweis']),
      this.m,
    );
    const oz = ozBereich(werteVon(o, 'OZ')[0], tiefe, this.mk, this.m, o.zeile);
    const bez = werteVon(o, 'Bez')[0] ?? werteVon(o, 'BezTx')[0];
    if (werteVon(o, 'Bez')[0] !== undefined)
      nichtUebernommen(o, 'BezTx', 'zweite Bezeichnung des Bereichs', this.m);
    this.aufbau.oeffne(oz, zeileAus(textVon(bez, this.m), bez, this.m), o.zeile);
    this.inhalt(o, tiefe);
    this.aufbau.schliesse(null, o.zeile);
  }

  /** `Hinweis` mit `Beschreibung`: der Langtext, ohne Langtext der Kurztext (wie GAEB 90, D-144.7). */
  private hinweis(o: Objekt): void {
    pruefeKinder(o, new Set(['Beschreibung']), new Set(), this.m);
    const b = objekteVon(o, 'Beschreibung')[0];
    if (b) pruefeKinder(b, new Set(['Kurztext', 'Langtext']), new Set(), this.m);
    const lang = textVon(b === undefined ? undefined : werteVon(b, 'Langtext')[0], this.m);
    const kurzWert = b === undefined ? undefined : werteVon(b, 'Kurztext')[0];
    const kurz = textVon(kurzWert, this.m);
    if (lang.absaetze.length === 0) this.aufbau.hinweis(langtextAus(kurz));
    else {
      if (kurz.absaetze.length > 0)
        this.m.nichtUebernommen(kurzWert?.zeile ?? o.zeile, 'Kurztext eines Hinweistexts');
      this.aufbau.hinweis(langtextAus(lang));
    }
  }

  private position(o: Objekt): void {
    const m = this.m;
    pruefeKinder(o, new Set(['OZ', 'Menge', 'ME', 'EP', 'GB', 'Beschreibung']), new Set(), m);
    const oz = ozPosition(werteVon(o, 'OZ')[0], this.mk, m, o.zeile);
    const menge = zahl('menge', werteVon(o, 'Menge')[0], m, 'menge');
    const einheit = (werteVon(o, 'ME')[0]?.wert ?? '').trim() || null;
    const ep = zahl('einheitspreis', werteVon(o, 'EP')[0], m, 'einheitspreis');
    const gbWert = werteVon(o, 'GB')[0];
    const gb = zahl('betrag', gbWert, m, 'gesamtpreis');
    const b = objekteVon(o, 'Beschreibung')[0];
    if (b) pruefeKinder(b, new Set(['Kurztext', 'Langtext']), new Set(), m);
    const kurzWert = b === undefined ? undefined : werteVon(b, 'Kurztext')[0];
    const kurztext = zeileAus(textVon(kurzWert, m), kurzWert, m);
    const langtext = langtextAus(textVon(b === undefined ? undefined : werteVon(b, 'Langtext')[0], m));
    const pos = this.aufbau.position({
      teile: oz.teile,
      index: oz.index,
      merkmale: { bedarf: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
      wahl: null,
      kurztext,
      langtext,
      menge,
      einheit,
      einheitspreis: ep,
      zeile: o.zeile,
    });
    const ort = { knotenId: pos.id };
    if (menge === null)
      m.melde('warnung', 'menge-fehlt', 'Die Position hat keine Menge.', o.zeile, { ...ort, feld: 'menge' });
    if (einheit === null)
      m.melde('warnung', 'einheit-fehlt', 'Die Position hat keine Mengeneinheit.', o.zeile, {
        ...ort,
        feld: 'einheit',
      });
    if (kurztext === '' && langtext.length === 0)
      m.melde('warnung', 'beschreibung-fehlt', 'Die Position hat weder Kurz- noch Langtext.', o.zeile, ort);
    if (menge !== null && ep !== null && gb !== null) {
      const soll = gesamtpreis(menge, ep);
      if (vergleiche(gb, soll) !== 0) {
        const datei = { art: 'betrag', wert: gb } as const;
        const gerechnet = { art: 'betrag', wert: soll } as const;
        m.melde(
          'warnung',
          'gesamtpreis-abweichend',
          `Der Gesamtbetrag der Datei (${deutsch(datei)}) weicht von Menge × EP (${deutsch(gerechnet)}) ab; gerechnet wird ` +
            'mit Menge × EP.',
          gbWert?.zeile ?? o.zeile,
          { ...ort, feld: 'gesamtpreis', werte: { datei, gerechnet } },
        );
      }
    }
  }
}

/** Name des LV wie beim DA-XML-Leser: `Name`, oder `Bez`, wenn `Name` deren Anfang ist (gekürzte Form). */
function lvName(info: Objekt | undefined, m: Zeilenmelder): string | null {
  if (info === undefined) return null;
  const name = (werteVon(info, 'Name')[0]?.wert ?? '').trim();
  const bezWert = werteVon(info, 'Bez')[0];
  const bez = (bezWert?.wert ?? '').trim();
  if (bez !== '' && bez.startsWith(name)) return bez;
  if (bez !== '' && bezWert) m.nichtUebernommen(bezWert.zeile, 'Bezeichnung des Leistungsverzeichnisses');
  return name === '' ? null : name;
}

/** `LVInfo`: Name, Maske; Datum, Zeiteinheit und Steuersatz sind „nicht übernommen“, Summen still. */
function lvInfoLesen(info: Objekt | undefined, m: Zeilenmelder): void {
  if (info === undefined) return;
  pruefeKinder(
    info,
    new Set(['Name', 'Bez', 'Datum', 'KurzLang', 'BezZeit', 'LVGlied', ...SUMMEN]),
    new Set(['LVGlied']),
    m,
  );
  nichtUebernommen(info, 'Datum', 'Datum des Leistungsverzeichnisses', m);
  nichtUebernommen(info, 'BezZeit', 'Bezeichnung der Zeiteinheit', m);
}

/** GAEB 2000, Phasen X81, X83, X86 → `LvInhalt`. Wirft nie bei Dateiinhalt. */
export function leseGaeb2000Lv(
  d: Gaeb2000Datei,
  opt: Gaeb2000LvOptionen,
): { phase: GaebPhase | null; inhalt: LvInhalt | null; befunde: GaebBefund[] } {
  const m = new Zeilenmelder();
  grundbefunde(d, m);
  if (d.phase !== null && !LESBARE_PHASEN.has(d.phase)) {
    const a = phaseAbweisen(d.phase, 'lv');
    m.melde('fehler', 'phase-nicht-unterstuetzt', a.meldung, null, { werte: a.werte });
    return { phase: d.phase, inhalt: null, befunde: m.ergebnis() };
  }
  const w = wurzelLesen(d, m);
  if (w === null) return { phase: d.phase, inhalt: null, befunde: m.ergebnis() };
  const kopf = kopfLesen(w, m);
  if (kopf.lv === undefined) {
    m.melde('fehler', 'lv-fehlt', 'Die Datei enthält kein Leistungsverzeichnis (Abschnitt „LV“).', null);
    return { phase: d.phase, inhalt: null, befunde: m.ergebnis() };
  }
  const lvObjekt = kopf.lv;
  pruefeKinder(
    lvObjekt,
    new Set(['LVInfo', 'Hinweis', 'LVBereich', 'Position']),
    new Set(['Hinweis', 'LVBereich', 'Position']),
    m,
  );
  const info = objekteVon(lvObjekt, 'LVInfo')[0];
  lvInfoLesen(info, m);
  const trenn = opt.trennzeichen === undefined ? '.' : opt.trennzeichen;
  const mk = maskeLesen(info, trenn, m);
  const lv = new Lv2000(m, mk, opt.ids);
  lv.inhalt(lvObjekt, 0);
  lv.aufbau.ende(null);
  if (!lv.aufbau.knoten.some((k) => k.art === 'position'))
    m.melde('warnung', 'lv-leer', 'Das Leistungsverzeichnis enthält keine Position.', null);

  const x86 = d.phase === 'X86';
  const name = lvName(info, m) ?? kopf.projektname ?? opt.dateiname ?? 'Leistungsverzeichnis';
  if (kopf.auftragnehmer !== null && !x86) m.nichtUebernommen(null, 'Angaben zum Bieter');
  const auftraggeber: Auftraggeber | undefined =
    kopf.auftraggeber === null
      ? undefined
      : { name: kopf.auftraggeber, strasse: null, plz: null, ort: null, vergabenummer: null };
  const auftragnehmer: Auftragnehmer | undefined =
    kopf.auftragnehmer === null || !x86
      ? undefined
      : { name: kopf.auftragnehmer, strasse: null, plz: null, ort: null };

  // Lesart D-145.8: Einen Steuersatz liest der Leser aus GAEB 2000 nicht (`USt` ist nur aus einem Beispiel bekannt).
  const mwstSatz = opt.standardMwstSatz ?? ('19.00' as Prozent);
  const satz = { art: 'prozent', wert: mwstSatz } as const;
  m.melde(
    'warnung',
    opt.standardMwstSatz === undefined ? 'mwst-standardsatz' : 'mwst-ersatzwert',
    `Aus GAEB 2000 wird kein Steuersatz gelesen; eingesetzt wird ${opt.standardMwstSatz === undefined ? 'der Standardsatz' : 'der voreingestellte Satz'} ` +
      `von ${deutsch(satz)}.`,
    null,
    { feld: 'mwstSatz', werte: { satz } },
  );
  const inhalt: LvInhalt = {
    name,
    ozMaske: mk.maske,
    mwstSatz,
    nachlass: null,
    ...(auftraggeber === undefined ? {} : { auftraggeber }),
    ...(auftragnehmer === undefined ? {} : { auftragnehmer }),
    wurzelId: lv.aufbau.wurzelId,
    knoten: lv.aufbau.knoten,
  };
  return { phase: d.phase, inhalt, befunde: m.ergebnis() };
}

// --- Angebot (X84) ------------------------------------------------------------------------------------------

export interface Gaeb2000AngebotErgebnis {
  readonly phase: GaebPhase | null;
  readonly positionen: readonly Angebotsposition[] | null;
  readonly bietername: string | null;
  readonly befunde: readonly GaebBefund[];
}

/**
 * GAEB 2000, Phase X84 → Angebotspositionen zum LV (Zuordnung allein über die OZ). Die Datei trägt das LV mit Bereichen und
 * Positionen; übernommen werden je Position `EP` (und `GB` zur Prüfung). Texte, Mengen und Bezeichnungen gehören zum LV und
 * werden übergangen. Bieter ist der `AN`.
 */
export function leseGaeb2000Angebot(
  d: Gaeb2000Datei,
  lv: { readonly knoten: readonly Knoten[]; readonly ozMaske: OzMaske },
  gleicheMaske: (a: OzMaske, b: OzMaske) => boolean,
): Gaeb2000AngebotErgebnis {
  const m = new Zeilenmelder();
  grundbefunde(d, m);
  const nichts = (): Gaeb2000AngebotErgebnis => ({
    phase: d.phase,
    positionen: null,
    bietername: null,
    befunde: m.ergebnis(),
  });
  if (d.phase !== 'X84') {
    const a = phaseAbweisen(d.phase, 'angebot');
    m.melde('fehler', 'phase-nicht-unterstuetzt', a.meldung, null, { werte: a.werte });
    return nichts();
  }
  const w = wurzelLesen(d, m);
  if (w === null) return nichts();
  const kopf = kopfLesen(w, m);
  if (kopf.lv === undefined) {
    m.melde(
      'fehler',
      'lv-fehlt',
      'Die Angebotsdatei enthält kein Leistungsverzeichnis (Abschnitt „LV“).',
      null,
    );
    return nichts();
  }
  const trenn = lv.ozMaske.trennzeichen;
  const info = objekteVon(kopf.lv, 'LVInfo')[0];
  if (info)
    pruefeKinder(
      info,
      new Set(['Name', 'Bez', 'Datum', 'KurzLang', 'BezZeit', 'LVGlied', ...SUMMEN]),
      new Set(['LVGlied']),
      m,
    );
  const mk = maskeLesen(info, trenn, m);
  if (!gleicheMaske(mk.maske, lv.ozMaske))
    m.melde(
      'warnung',
      'maske-abweichend',
      'Die OZ-Maske der Angebotsdatei weicht von der des LV ab; zugeordnet wird trotzdem über die Teile der OZ.',
      info?.zeile ?? null,
    );
  const aufbau = new Angebotsaufbau(m, lv.knoten);
  const durchlaufe = (o: Objekt): void => {
    for (const k of o.kinder) {
      if (k.art !== 'objekt') continue;
      if (k.name === 'LVBereich') {
        pruefeKinder(
          k,
          new Set(['OZ', 'Bez', 'BezTx', 'LVBereich', 'Position', 'Hinweis', ...SUMMEN]),
          new Set(['LVBereich', 'Position', 'Hinweis']),
          m,
        );
        durchlaufe(k);
      } else if (k.name === 'Position') {
        pruefeKinder(k, new Set(['OZ', 'Menge', 'ME', 'EP', 'GB', 'Beschreibung']), new Set(), m);
        const oz = ozPosition(werteVon(k, 'OZ')[0], mk, m, k.zeile);
        const anzeige = oz.teile === null ? oz.anzeige : `${oz.teile.join(trenn ?? '')}${oz.index ?? ''}`;
        const ep = zahl('einheitspreis', werteVon(k, 'EP')[0], m, 'einheitspreis');
        const gb = zahl('betrag', werteVon(k, 'GB')[0], m, 'gesamtpreis');
        aufbau.preis(oz.teile?.join(trenn ?? '') ?? null, oz.index, anzeige, ep, gb, k.zeile);
      }
    }
  };
  pruefeKinder(
    kopf.lv,
    new Set(['LVInfo', 'Hinweis', 'LVBereich', 'Position']),
    new Set(['Hinweis', 'LVBereich', 'Position']),
    m,
  );
  durchlaufe(kopf.lv);
  const positionen = aufbau.positionen();
  if (kopf.auftraggeber !== null) m.nichtUebernommen(null, 'Angaben zum Auftraggeber');
  return { phase: d.phase, positionen, bietername: kopf.auftragnehmer, befunde: m.ergebnis() };
}
