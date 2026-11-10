// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB DA XML 3.3, Phasen X81 und X83 → `LvInhalt` (Ticket 22). Tolerant lesen: Fehler sind Prüfbefunde, nie ein
// Abbruch. Rein (A2): Eingabe sind Bytes oder Text, Kennungen kommen aus der `IdQuelle`, kein I/O, keine Uhr.
//
// Zuordnung GAEB → `vertrag`: siehe Ticket 22, Abschnitt Comments. Was `vertrag` nicht halten kann, wird nicht
// still verworfen, sondern als Befund gemeldet (`nicht-abgebildet`, `formatierung-verworfen`, …).

import { leseAustausch } from '@tethys/dezimal';
import type { Austauschhinweiscode, Zahl } from '@tethys/dezimal';
import type {
  ElternId,
  GaebLesung,
  GaebPhase,
  Hinweistext,
  Bedarf,
  Bezugsposition,
  IdQuelle,
  Knoten,
  LeistungsverzeichnisId,
  Leitbeschreibung,
  Los,
  LvInhalt,
  OzMaske,
  OzStelle,
  Ordnungszahl,
  Position,
  PositionId,
  Prozent,
  Positionsmerkmale,
  Pruefbefund,
  Titel,
  Unterbeschreibung,
  Wahlzuordnung,
  Zahlenart,
  Zuschlagsbezug,
} from '@tethys/vertrag';
import { erkenne } from './erkennung';
import { dekodiereBytes } from './kodierung';
import { leseKurztext, leseLangtext } from './text';
import type { Textergebnis } from './text';
import { STANDARD_MAX_TIEFE, elementKinder, parseXml, textInhalt } from './xml';
import type { XmlElement, XmlErgebnis } from './xml';

export interface LeseOptionen {
  /** Quelle für alle neuen Kennungen (A2: der Leser erzeugt keine). */
  readonly ids: IdQuelle;
  /**
   * MwSt-Satz des LV. X81 und X83 tragen keinen Steuersatz; `LvInhalt.mwstSatz` ist Pflicht. Liefert der Aufrufer
   * einen, setzt der Leser ihn ein und meldet das als Befund `mwst-ersatzwert`. Liefert er keinen, gilt
   * `STANDARD_MWST_SATZ` (19,00 %, E-19) mit der Warnung `mwst-standardsatz`.
   */
  readonly standardMwstSatz?: Prozent;
  /** Dateiname, nur für die Erkennung über die Endung (`.X83`) und als Ersatzname des LV. */
  readonly dateiname?: string;
  /** Größte erlaubte Eingabe in Bytes (bzw. Zeichen bei Text). Voreinstellung 100 MiB. */
  readonly maxBytes?: number;
  /** Größte erlaubte XML-Verschachtelungstiefe. Voreinstellung 100. */
  readonly maxTiefe?: number;
  /** Trennzeichen der Anzeige-Ordnungszahl und in `OzMaske.trennzeichen`. Voreinstellung `.`, `null`: keines. */
  readonly trennzeichen?: string | null;
}

/**
 * Ergebnis des Lesers. Die Wurzelkennung, unter der die obersten Knoten hängen, steht seit v1.1a nur noch in
 * `inhalt.wurzelId`.
 */
export type GaebLesungErgebnis = GaebLesung;

/** E-19: MwSt-Satz, wenn der Aufrufer keinen liefert (X81/X83 tragen keinen). */
export const STANDARD_MWST_SATZ = '19.00' as Prozent;
export const STANDARD_MAX_BYTES = 100 * 1024 * 1024;
/** Obergrenze der OZ-Länge (Fachdokumentation 3.3, Abschnitt 4.2.1 und 11.2.3 BoQInfo 2). */
export const OZ_MAX_LAENGE = 14;
/** Höchstzahl der Gliederungsstufen einschließlich Los (Fachdokumentation 3.3, Abschnitt 4.2.1/4.2.2). */
export const MAX_STUFEN = 5;
/** Höchstzahl einzeln aufgezeichneter Befunde je Phase (Schutz vor Dateien voller Fehler). */
const MAX_BEFUNDE = 10_000;

/** Elemente mit reinem Textinhalt: ein fehlendes Schließ-Tag wird beim nächsten öffnenden Tag erkannt. */
const BLATTNAMEN: ReadonlySet<string> = new Set([
  'Version',
  'VersDate',
  'Date',
  'Time',
  'ProgSystem',
  'ProgName',
  'NamePrj',
  'LblPrj',
  'Cur',
  'CurLbl',
  'BidCommPerm',
  'DP',
  'Name',
  'LblBoQ',
  'OutlCompl',
  'Type',
  'Length',
  'Num',
  'Alignment',
  'Qty',
  'QU',
  'PredQty',
  'UP',
  'Provis',
  'ALNGroupNo',
  'ALNSerNo',
  'LumpSumItem',
  'HourIt',
  'MarkupIt',
  'QtyTBD',
  'NotAppl',
  'MarkupType',
  'SumDescr',
  'SubDNo',
  'QtySpec',
  'RefDescr',
  'CtlgID',
  'CtlgCode',
]);

type Veraenderlich<T> = { -readonly [K in keyof T]: T[K] };

const kind = (e: XmlElement | undefined, name: string): XmlElement | undefined =>
  e ? elementKinder(e).find((k) => k.name === name) : undefined;
const kinder = (e: XmlElement | undefined, name: string): XmlElement[] =>
  e ? elementKinder(e).filter((k) => k.name === name) : [];
const wert = (e: XmlElement | undefined): string | null => (e ? textInhalt(e).trim() : null);

interface Aggregat {
  anzahl: number;
  readonly erstes: XmlElement | null;
  readonly code: string;
  readonly meldung: (anzahl: number) => string;
}

const HINWEIS_TEXT: Readonly<Record<Austauschhinweiscode, string | null>> = {
  'leerraum-entfernt': 'enthält überflüssigen Leerraum',
  dezimalkomma: 'verwendet ein Dezimalkomma statt des Dezimalpunkts',
  'plus-entfernt': 'trägt ein überflüssiges Pluszeichen',
  'fuehrende-nullen-entfernt': 'hat führende Nullen',
  'vorzeichen-null-entfernt': 'ist eine negative Null',
  'nachkommastellen-aufgefuellt': null, // zulässig (weniger Stellen), kein Befund
  'nullen-abgeschnitten': 'hat mehr Nachkommastellen als zulässig (nur Nullen, verlustfrei gekürzt)',
  gerundet: 'hat mehr Nachkommastellen als zulässig; der Wert wurde kaufmännisch gerundet',
};

/** Der eigentliche Leser, ein Aufruf je Datei. */
class Leser {
  readonly befunde: Pruefbefund[] = [];
  private readonly aggregate = new Map<string, Aggregat>();
  private begrenzt = false;
  private formatKnoten = 0;
  private readonly formatArten = new Set<string>();
  private formatErst: XmlElement | null = null;

  constructor(
    private readonly xml: XmlErgebnis,
    private readonly opt: LeseOptionen,
  ) {}

  // --- Befunde -------------------------------------------------------------------------------------------

  ort(
    el: XmlElement | undefined,
    extra: { knotenId?: PositionId | string; feld?: string } = {},
  ): Pruefbefund['ort'] {
    if (!el) return { ...(extra.feld ? { feld: extra.feld } : {}) };
    const { zeile, spalte } = this.xml.ortVon(el.offset);
    return {
      pfad: this.xml.pfadVon(el),
      zeile,
      spalte,
      ...(extra.knotenId ? { knotenId: extra.knotenId as PositionId } : {}),
      ...(extra.feld ? { feld: extra.feld } : {}),
    };
  }

  melde(
    schwere: Pruefbefund['schwere'],
    code: string,
    meldung: string,
    el?: XmlElement,
    extra: { knotenId?: PositionId | string; feld?: string } = {},
  ): void {
    if (this.befunde.length >= MAX_BEFUNDE) {
      if (!this.begrenzt) {
        this.begrenzt = true;
        this.befunde.push({
          schwere: 'warnung',
          quelle: 'gaeb-lesen',
          code: 'befunde-begrenzt',
          meldung: `Weitere Befunde des Lesers werden nicht mehr aufgezeichnet (Grenze ${String(MAX_BEFUNDE)}).`,
          ort: {},
        });
      }
      return;
    }
    this.befunde.push({ schwere, quelle: 'gaeb-lesen', code, meldung, ort: this.ort(el, extra) });
  }

  /** Fasst gleichartige Befunde einer Datei zu einem zusammen (Anzahl, erster Ort). */
  aggregiere(
    schluessel: string,
    code: string,
    el: XmlElement | null,
    meldung: (anzahl: number) => string,
  ): void {
    const vorhanden = this.aggregate.get(schluessel);
    if (vorhanden) vorhanden.anzahl += 1;
    else this.aggregate.set(schluessel, { anzahl: 1, erstes: el, code, meldung });
  }

  nichtAbgebildet(el: XmlElement, bezeichnung: string, grundVorgabe?: string): void {
    const grund =
      grundVorgabe ??
      (bezeichnung.endsWith('AddText')
        ? 'Zusatztext des LV mit darin eingebetteten Bildern; der Vertrag hat dafür kein Feld'
        : 'nicht im Vertrag abbildbar');
    this.aggregiere(
      `nicht-abgebildet|${bezeichnung}`,
      'nicht-abgebildet',
      el,
      (n) => `Element ${bezeichnung} (${grund}) wird nicht übernommen, ${String(n)} Vorkommen.`,
    );
  }

  /** Meldet alle Kinder von `el`, die nicht in `behandelt` stehen, als nicht abgebildet. */
  restMelden(el: XmlElement, behandelt: ReadonlySet<string>, bezeichnung: string): void {
    for (const k of elementKinder(el))
      if (!behandelt.has(k.name)) this.nichtAbgebildet(k, `${bezeichnung}/${k.name}`);
  }

  abschliessen(): void {
    if (this.formatKnoten > 0)
      this.befunde.push({
        schwere: 'warnung',
        quelle: 'gaeb-lesen',
        code: 'formatierung-verworfen',
        meldung:
          `In ${String(this.formatKnoten)} ${this.formatKnoten === 1 ? 'Text' : 'Texten'} wurde Auszeichnung verworfen, die der Vertrag nicht abbildet ` +
          `(${[...this.formatArten].sort().join('; ')}). Der Text bleibt als reiner Text erhalten.`,
        ort: this.ort(this.formatErst ?? undefined),
      });
    for (const a of this.aggregate.values())
      this.befunde.push({
        schwere: 'warnung',
        quelle: 'gaeb-lesen',
        code: a.code,
        meldung: a.meldung(a.anzahl),
        ort: this.ort(a.erstes ?? undefined),
      });
  }

  // --- Texte ---------------------------------------------------------------------------------------------

  private nimm(r: Textergebnis, el: XmlElement | undefined): void {
    if (r.formatierung.length > 0) {
      this.formatKnoten += 1;
      this.formatErst ??= el ?? null;
      for (const a of r.formatierung) this.formatArten.add(a);
    }
    for (const p of r.probleme) this.melde('warnung', p.code, p.meldung, p.element);
  }

  kurztext(el: XmlElement | undefined): string {
    const r = leseKurztext(el, this.opt.ids);
    this.nimm(r, el);
    return r.text;
  }

  langtext(el: XmlElement | undefined): Position['langtext'] {
    const r = leseLangtext(el, this.opt.ids);
    this.nimm(r, el);
    return r.langtext;
  }

  // --- Zahlen und Aufzählungen ---------------------------------------------------------------------------

  zahl<Z extends Zahlenart>(art: Z, el: XmlElement, knotenId: string, feld: string): Zahl<Z> | null {
    // Leerraum um den Wert ist in GAEB-XML Formatierung (Schema: Leerraum wird zusammengefaltet), kein Befund.
    const roh = textInhalt(el).trim();
    const r = leseAustausch(art, roh);
    if (!r.ok) {
      this.melde(
        'fehler',
        'dezimal-ungueltig',
        `Wert „${roh.trim()}“ ist keine lesbare Zahl: ${r.fehler.meldung}`,
        el,
        { knotenId, feld },
      );
      return null;
    }
    for (const h of r.hinweise) {
      const text = HINWEIS_TEXT[h.code];
      if (text !== null)
        this.melde(
          h.code === 'gerundet' ? 'fehler' : 'warnung',
          h.code,
          `Wert „${h.original.trim()}“ ${text}.`,
          el,
          { knotenId, feld },
        );
    }
    return r.wert;
  }

  /** Liest ein Ja-Merkmal (`<LumpSumItem>Yes</LumpSumItem>`); jeder andere Wert ist ein Befund und gilt als nicht gesetzt. */
  merkmal(eltern: XmlElement, name: string, knotenId: string): boolean {
    const el = kind(eltern, name);
    if (!el) return false;
    const w = wert(el);
    if (w === 'Yes') return true;
    this.melde(
      'warnung',
      'enum-ungueltig',
      `Wert „${w ?? ''}“ von ${name} ist ungültig (erlaubt: Yes); das Merkmal gilt als nicht gesetzt.`,
      el,
      { knotenId },
    );
    return false;
  }

  aufzaehlung<T extends string>(
    el: XmlElement | undefined,
    erlaubt: readonly T[],
    knotenId?: string,
  ): T | null {
    if (!el) return null;
    const w = wert(el) ?? '';
    const treffer = erlaubt.find((e) => e === w);
    if (treffer) return treffer;
    this.melde(
      'warnung',
      'enum-ungueltig',
      `Wert „${w}“ von ${el.name} ist ungültig (erlaubt: ${erlaubt.join(', ')}).`,
      el,
      knotenId ? { knotenId } : {},
    );
    return null;
  }
}

// --- OZ-Maske ----------------------------------------------------------------------------------------------

interface Bkdn {
  readonly typ: 'Lot' | 'BoQLevel' | 'Item' | 'Index';
  readonly laenge: number;
  readonly numerisch: boolean;
  readonly el: XmlElement;
}

const stelle = (b: Bkdn): OzStelle => ({
  laenge: b.laenge,
  zeichen: b.numerisch ? 'numerisch' : 'alphanumerisch',
});

function leseMaske(
  l: Leser,
  boqInfo: XmlElement | undefined,
  trenn: string | null,
): { maske: OzMaske; stufen: Bkdn[] } {
  const eintraege: Bkdn[] = [];
  for (const b of kinder(boqInfo, 'BoQBkdn')) {
    const typ = l.aufzaehlung(kind(b, 'Type'), ['Lot', 'BoQLevel', 'Item', 'Index'] as const);
    const laengeEl = kind(b, 'Length');
    const laengeText = wert(laengeEl);
    const laenge = laengeText !== null && /^[0-9]+$/.test(laengeText) ? Number(laengeText) : 0;
    if (typ === null) {
      if (!kind(b, 'Type'))
        l.melde('fehler', 'oz-maske-ungueltig', 'Ein BoQBkdn ohne Type wird übersprungen.', b);
      continue;
    }
    if (laenge < 1) {
      l.melde(
        'fehler',
        'oz-maske-ungueltig',
        `BoQBkdn ${typ}: Length „${laengeText ?? ''}“ ist keine positive ganze Zahl; der Eintrag wird übersprungen.`,
        laengeEl ?? b,
      );
      continue;
    }
    const num = l.aufzaehlung(kind(b, 'Num'), ['Yes', 'No'] as const);
    if (num === null && !kind(b, 'Num'))
      l.melde('warnung', 'enum-ungueltig', `BoQBkdn ${typ}: Num fehlt; alphanumerisch angenommen.`, b);
    eintraege.push({ typ, laenge, numerisch: num === 'Yes', el: b });
  }

  const lot = eintraege.filter((e) => e.typ === 'Lot');
  const stufen = eintraege.filter((e) => e.typ === 'Lot' || e.typ === 'BoQLevel');
  const items = eintraege.filter((e) => e.typ === 'Item');
  const indizes = eintraege.filter((e) => e.typ === 'Index');

  if (lot.length > 1 || (lot.length === 1 && eintraege[0]?.typ !== 'Lot'))
    l.melde(
      'warnung',
      'oz-maske-reihenfolge',
      'Ein Los (Lot) darf nur einmal und nur an erster Stelle der Gliederung stehen.',
      lot[0]?.el,
    );
  if (items.length > 1)
    l.melde(
      'warnung',
      'oz-maske-reihenfolge',
      'Die Position (Item) darf nur einmal in der Gliederung stehen; die erste gilt.',
      items[1]?.el,
    );
  if (indizes.length > 1)
    l.melde(
      'warnung',
      'oz-maske-reihenfolge',
      'Der Index darf nur einmal in der Gliederung stehen; der erste gilt.',
      indizes[1]?.el,
    );
  const posIdx = eintraege.findIndex((e) => e.typ === 'Item');
  const idxIdx = eintraege.findIndex((e) => e.typ === 'Index');
  if (posIdx >= 0 && idxIdx >= 0 && idxIdx < posIdx)
    l.melde('warnung', 'oz-maske-reihenfolge', 'Der Index muss nach der Position stehen.', indizes[0]?.el);
  if (stufen.length > MAX_STUFEN)
    l.melde(
      'fehler',
      'gliederung-zu-tief',
      `Die Gliederung hat ${String(stufen.length)} Stufen einschließlich Los; zulässig sind höchstens ${String(MAX_STUFEN)}.`,
      stufen[MAX_STUFEN]?.el,
    );
  const gesamt = eintraege.reduce((s, e) => s + e.laenge, 0);
  if (gesamt > OZ_MAX_LAENGE)
    l.melde(
      'fehler',
      'oz-maske-ueberlauf',
      `Die Teilschlüssel der OZ sind zusammen ${String(gesamt)} Stellen lang; zulässig sind höchstens ${String(OZ_MAX_LAENGE)}.`,
      boqInfo,
    );
  const item = items[0];
  if (!item)
    l.melde(
      'fehler',
      'oz-maske-ohne-position',
      'Die Gliederung enthält keinen Teilschlüssel für die Position (Item); 4 numerische Stellen werden angenommen.',
      boqInfo,
    );
  const index = indizes[0];
  if (index && index.laenge !== 1)
    l.melde(
      'warnung',
      'oz-index-laenge',
      `Der Index muss genau 1 Stelle lang sein, ist aber ${String(index.laenge)}.`,
      index.el,
    );

  // F1 (v1.1a): Nur ein Lot an erster Stelle ist die Los-Stufe; tiefere Lot-Stufen werden Titel (`los-zu-titel`).
  const losStufe = eintraege[0]?.typ === 'Lot';
  const maske: OzMaske = {
    gliederung: stufen.map(stelle),
    ...(losStufe ? { losStufe: true } : {}),
    position: item ? stelle(item) : { laenge: 4, zeichen: 'numerisch' },
    index: index ? stelle(index) : null,
    trennzeichen: trenn,
  };
  return { maske, stufen };
}

// --- Aufbau des LV ----------------------------------------------------------------------------------------

const POSITION_BEHANDELT: ReadonlySet<string> = new Set([
  'Qty',
  'QU',
  'UP',
  'Description',
  'LumpSumItem',
  'HourIt',
  'Provis',
  'ALNGroupNo',
  'ALNSerNo',
  'MarkupIt',
  'SumDescr',
  'SubDescr',
]);
/** Eine Zuschlagsposition trägt dieselben Merkmale wie eine Position (F5) plus Bezugsform und Satz. */
const ZUSCHLAG_BEHANDELT: ReadonlySet<string> = new Set([
  'MarkupType',
  'MarkupSubQty',
  'Markup',
  'Description',
  'LumpSumItem',
  'HourIt',
  'Provis',
  'ALNGroupNo',
  'ALNSerNo',
  'MarkupIt',
]);
const UNTERBESCHREIBUNG_BEHANDELT: ReadonlySet<string> = new Set([
  'SubDNo',
  'Description',
  'QtySpec',
  'Qty',
  'QU',
]);
const BESCHREIBUNG_BEHANDELT: ReadonlySet<string> = new Set(['CompleteText']);
const KOMPLETTTEXT_BEHANDELT: ReadonlySet<string> = new Set(['DetailTxt', 'OutlineText']);
const KATEGORIE_BEHANDELT: ReadonlySet<string> = new Set(['LblTx', 'BoQBody']);
const TEILE_ERLAUBT = /^[0-9A-Za-z_ ]*$/;

interface Ebene {
  /** Kennung des Elternknotens im Ergebnis. */
  readonly id: string;
  /** RNoPart-Kette von oben bis hierher. */
  readonly teile: readonly string[];
  /** `false`, wenn in der Kette ein Teil fehlt: dann gibt es keine Ordnungszahl. */
  readonly ozOk: boolean;
  /** Tiefe der Gliederung: 0 an der Wurzel. */
  readonly tiefe: number;
}

class Aufbau {
  readonly knoten: Knoten[] = [];
  private readonly folge = new Map<string, number>();
  private readonly gaebIds = new Map<string, PositionId>();
  private readonly ozGesehen = new Set<string>();
  private readonly grundpositionen = new Map<string, PositionId>();
  private bereichszaehler = 0;
  private readonly zuschlaege: {
    pos: Veraenderlich<Position>;
    refs: { id: string; el: XmlElement }[];
  }[] = [];

  constructor(
    private readonly l: Leser,
    private readonly ids: IdQuelle,
    private readonly maske: OzMaske,
    private readonly stufen: readonly Bkdn[],
    private readonly trenn: string | null,
    readonly wurzelId: LeistungsverzeichnisId,
  ) {}

  private reihenfolge(elternId: string): number {
    const n = this.folge.get(elternId) ?? 0;
    this.folge.set(elternId, n + 1);
    return n;
  }

  private oz(teile: readonly string[], ok: boolean): Ordnungszahl | null {
    return ok && teile.length > 0 ? (teile.join(this.trenn ?? '') as Ordnungszahl) : null;
  }

  /** Liest RNoPart und prüft Länge und Zeichen gegen die Maske. `null`: fehlt. */
  private teil(el: XmlElement, st: OzStelle | undefined, bez: string): string | null {
    const t = el.attrs.get('RNoPart');
    if (t === undefined || t === '') {
      this.l.melde('warnung', 'oz-teil-fehlt', `${bez} ohne RNoPart; die Ordnungszahl bleibt leer.`, el);
      return null;
    }
    if (st && t.length > st.laenge)
      this.l.melde(
        'fehler',
        'oz-teil-ueberlauf',
        `RNoPart „${t}“ ist ${String(t.length)} Stellen lang, die Gliederung erlaubt ${String(st.laenge)}.`,
        el,
      );
    if (!TEILE_ERLAUBT.test(t) || (st?.zeichen === 'numerisch' && !/^[0-9]+$/.test(t)))
      this.l.melde(
        'warnung',
        'oz-teil-zeichen',
        `RNoPart „${t}“ enthält unzulässige Zeichen für diese Stelle.`,
        el,
      );
    return t;
  }

  private registriereId(el: XmlElement, id: PositionId | null): void {
    const g = el.attrs.get('ID');
    if (g !== undefined && id !== null && !this.gaebIds.has(g)) this.gaebIds.set(g, id);
  }

  // --- Struktur ------------------------------------------------------------------------------------------

  koerper(body: XmlElement, eltern: Ebene): void {
    for (const k of elementKinder(body)) {
      switch (k.name) {
        case 'Remark':
          this.hinweis(k, eltern);
          break;
        case 'BoQCtgy':
          this.gliederung(k, eltern);
          break;
        case 'Itemlist':
          this.positionsliste(k, eltern);
          break;
        default:
          this.l.nichtAbgebildet(
            k,
            `BoQBody/${k.name}`,
            k.name === 'LotGrp' ? 'Losgruppen kennt der Vertrag nicht' : 'nicht im Vertrag abbildbar',
          );
      }
    }
  }

  private gliederung(el: XmlElement, eltern: Ebene): void {
    const tiefe = eltern.tiefe + 1;
    const st = this.stufen[tiefe - 1];
    if (!st && this.stufen.length > 0)
      this.l.melde(
        'fehler',
        'gliederung-ueberzaehlig',
        `Gliederungsebene ${String(tiefe)}, die Gliederung hat nur ${String(this.stufen.length)}.`,
        el,
      );
    const t = this.teil(el, st ? stelle(st) : undefined, 'LV-Bereich');
    const teile = t === null ? eltern.teile : [...eltern.teile, t];
    const ozOk = eltern.ozOk && t !== null;
    const kurz = this.l.kurztext(kind(el, 'LblTx'));
    if (tiefe > MAX_STUFEN) {
      // Der Kern lässt höchstens 5 Gliederungsebenen zu (F1) und wies sonst das ganze LV ab. Die Ebene entfällt
      // als Knoten; Unterbereiche, Positionen und Hinweise hängen unter dem Knoten darüber (Befund, kein Verlust).
      this.l.melde(
        'warnung',
        'gliederung-ebene-entfallen',
        `Gliederungsebene ${String(tiefe)}${kurz === '' ? '' : ` („${kurz}“)`} liegt unter der ${String(MAX_STUFEN)}. Stufe; ` +
          'sie wird nicht als Titel übernommen, ihr Inhalt hängt unter der Ebene darüber.',
        el,
      );
      this.l.restMelden(el, KATEGORIE_BEHANDELT, 'BoQCtgy');
      const flach: Ebene = { id: eltern.id, teile, ozOk, tiefe };
      for (const b of kinder(el, 'BoQBody')) this.koerper(b, flach);
      return;
    }
    // F1: Das Los ist nur als oberste Stufe erlaubt. Steht `Lot` weiter unten in der Gliederung, wird die Ebene ein
    // Titel (sonst wies der Kern das ganze LV ab).
    const istLos = st?.typ === 'Lot' && tiefe === 1;
    if (st?.typ === 'Lot' && !istLos)
      this.l.melde(
        'warnung',
        'los-zu-titel',
        `Gliederungsebene ${String(tiefe)} ist als Los (Lot) angelegt, ein Los ist aber nur als oberste Stufe erlaubt; die Ebene wird als Titel übernommen.`,
        el,
      );
    const gemeinsam = {
      elternId: eltern.id as ElternId,
      reihenfolge: this.reihenfolge(eltern.id),
      ordnungszahl: this.oz(teile, ozOk),
      kurztext: kurz,
    };
    let id: string;
    if (istLos) {
      const los: Los = { art: 'los', id: this.ids.los(), ...gemeinsam };
      this.knoten.push(los);
      id = los.id;
    } else {
      const titel: Titel = { art: 'titel', id: this.ids.titel(), ...gemeinsam };
      this.knoten.push(titel);
      id = titel.id;
    }
    this.l.restMelden(el, KATEGORIE_BEHANDELT, 'BoQCtgy');
    const naechste: Ebene = { id, teile, ozOk, tiefe };
    for (const b of kinder(el, 'BoQBody')) this.koerper(b, naechste);
  }

  private hinweis(el: XmlElement, eltern: Ebene): void {
    const desc = kind(el, 'Description');
    const ct = kind(desc, 'CompleteText');
    const detail = kind(ct, 'DetailTxt');
    const outline = kind(kind(kind(ct, 'OutlineText'), 'OutlTxt'), 'TextOutlTxt');
    let text = this.l.langtext(detail);
    if (text.length === 0) text = this.l.langtext(outline);
    else if (outline && textInhalt(outline).trim() !== '')
      this.l.nichtAbgebildet(outline, 'Remark/OutlineText', 'Kurztext des Hinweistexts ohne Entsprechung');
    const h: Hinweistext = {
      art: 'hinweis',
      id: this.ids.hinweistext(),
      elternId: eltern.id as ElternId,
      reihenfolge: this.reihenfolge(eltern.id),
      text,
    };
    this.knoten.push(h);
  }

  private positionsliste(liste: XmlElement, eltern: Ebene): void {
    const bereich = ++this.bereichszaehler;
    for (const k of elementKinder(liste)) {
      switch (k.name) {
        case 'Item':
          this.position(k, eltern, bereich);
          break;
        case 'MarkupItem':
          this.zuschlagsposition(k, eltern, bereich);
          break;
        case 'Remark':
          this.hinweis(k, eltern);
          break;
        default:
          this.l.nichtAbgebildet(
            k,
            `Itemlist/${k.name}`,
            k.name === 'PerfDescr'
              ? 'Ausführungsbeschreibungen kennt der Vertrag nicht'
              : 'nicht im Vertrag abbildbar',
          );
      }
    }
  }

  // --- Positionen ----------------------------------------------------------------------------------------

  private basis(el: XmlElement, eltern: Ebene, id: PositionId): Pick<Position, 'ordnungszahl' | 'ozIndex'> {
    const t = this.teil(el, this.maske.position, 'Position');
    const teile = t === null ? eltern.teile : [...eltern.teile, t];
    const ozOk = eltern.ozOk && t !== null;
    const ordnungszahl = this.oz(teile, ozOk);
    let ozIndex: string | null = null;
    const roh = el.attrs.get('RNoIndex');
    if (roh !== undefined && roh !== '') {
      ozIndex = roh;
      if (!this.maske.index)
        this.l.melde(
          'warnung',
          'oz-index-ohne-maske',
          'RNoIndex ist gesetzt, aber die Gliederung hat keine Indexstelle.',
          el,
          { knotenId: id },
        );
      else if (roh.length !== this.maske.index.laenge)
        this.l.melde(
          'fehler',
          'oz-teil-ueberlauf',
          `RNoIndex „${roh}“ ist ${String(roh.length)} Stellen lang, die Indexstelle hat ${String(this.maske.index.laenge)}.`,
          el,
          { knotenId: id },
        );
    }
    if (ordnungszahl !== null) {
      const laenge = teile.reduce((summe, t) => summe + t.length, 0) + (ozIndex?.length ?? 0);
      if (laenge > OZ_MAX_LAENGE)
        this.l.melde(
          'fehler',
          'oz-ueberlauf',
          `Die Ordnungszahl ist ${String(laenge)} Stellen lang (mit Index); zulässig sind höchstens ${String(OZ_MAX_LAENGE)}.`,
          el,
          { knotenId: id },
        );
      const schluessel = `${ordnungszahl}|${ozIndex ?? ''}`;
      if (this.ozGesehen.has(schluessel))
        this.l.melde(
          'warnung',
          'doppelte-ordnungszahl',
          `Die Ordnungszahl ${ordnungszahl}${ozIndex ?? ''} kommt mehrfach vor.`,
          el,
          { knotenId: id },
        );
      else this.ozGesehen.add(schluessel);
    }
    return { ordnungszahl, ozIndex };
  }

  /**
   * Liest die Positionsmerkmale (F5): Bedarf (`Provis`), Wahl (`ALNGroupNo`/`ALNSerNo`), Stundenlohn (`HourIt`),
   * Pauschal (`LumpSumItem`) und Zuschlagskennzeichen (`MarkupIt`), jedes unabhängig von den anderen. Für eine
   * Alternative (Variante > 0) setzt `grundpositionId` die erste Grundausführung (Variante 0) derselben Gruppe im
   * selben LV-Bereich davor; die Grundausführung selbst verweist auf keine (Vertragskommentar `Positionsmerkmale.wahl`).
   */
  private merkmale(el: XmlElement, id: PositionId, bereich: number): Positionsmerkmale {
    const pauschal = this.l.merkmal(el, 'LumpSumItem', id);
    const stundenlohn = this.l.merkmal(el, 'HourIt', id);
    const zuschlagskennzeichen = this.l.merkmal(el, 'MarkupIt', id);
    const provis = this.l.aufzaehlung(kind(el, 'Provis'), ['WithTotal', 'WithoutTotal'] as const, id);
    const bedarf: Bedarf | null =
      provis === null ? null : provis === 'WithTotal' ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag';

    let wahl: Wahlzuordnung | null = null;
    const gruppeEl = kind(el, 'ALNGroupNo');
    const serieEl = kind(el, 'ALNSerNo');
    if (gruppeEl || serieEl) {
      const g = wert(gruppeEl);
      const s = wert(serieEl);
      if (g === null || s === null || !/^[0-9]+$/.test(g) || !/^[0-9]+$/.test(s))
        this.l.melde(
          'warnung',
          'wahl-angabe-unvollstaendig',
          'ALNGroupNo und ALNSerNo müssen beide als Zahl vorhanden sein; die Position wird ohne Wahl übernommen.',
          gruppeEl ?? serieEl,
          { knotenId: id },
        );
      else {
        const gruppe = Number(g);
        const variante = Number(s);
        const schluessel = `${String(bereich)}|${String(gruppe)}`;
        let grundpositionId: PositionId | null = null;
        if (variante === 0) {
          if (!this.grundpositionen.has(schluessel)) this.grundpositionen.set(schluessel, id);
        } else {
          grundpositionId = this.grundpositionen.get(schluessel) ?? null;
          if (grundpositionId === null)
            this.l.melde(
              'warnung',
              'wahl-ohne-grundposition',
              `Zur Wahlposition (Gruppe ${String(gruppe)}, Variante ${String(variante)}) gibt es im selben LV-Bereich davor keine Grundposition.`,
              el,
              { knotenId: id, feld: 'grundpositionId' },
            );
        }
        wahl = { gruppe, variante, grundpositionId };
      }
    }
    return { bedarf, wahl, stundenlohn, pauschal, zuschlagskennzeichen };
  }

  /** Kurz- und Langtext aus `Description/CompleteText`. */
  private texte(desc: XmlElement | undefined): Pick<Position, 'kurztext' | 'langtext'> {
    const ct = kind(desc, 'CompleteText');
    return {
      kurztext: this.l.kurztext(kind(kind(kind(ct, 'OutlineText'), 'OutlTxt'), 'TextOutlTxt')),
      langtext: this.l.langtext(kind(ct, 'DetailTxt')),
    };
  }

  /** Einheit (`QU`): leer ergibt `null`, nie `''` (Vertrag v1.2); `----` bleibt Text. */
  private einheit(el: XmlElement): string | null {
    const w = wert(kind(el, 'QU'));
    return w === null || w === '' ? null : w;
  }

  private position(el: XmlElement, eltern: Ebene, bereich: number): void {
    const id = this.ids.position();
    this.registriereId(el, id);
    const { ordnungszahl, ozIndex } = this.basis(el, eltern, id);
    const merkmale = this.merkmale(el, id, bereich);
    const qtyTbd = kind(el, 'QtyTBD') !== undefined;

    // Menge, Einheit, Preis
    const qtyEl = kind(el, 'Qty');
    const menge = qtyEl ? this.l.zahl('menge', qtyEl, id, 'menge') : null;
    if (!qtyEl && !qtyTbd && !merkmale.pauschal)
      this.l.melde(
        'warnung',
        'menge-fehlt',
        'Die Position hat keine Menge (und weder QtyTBD noch LumpSumItem).',
        el,
        { knotenId: id, feld: 'menge' },
      );
    const einheit = this.einheit(el);
    if (einheit === null)
      this.l.melde(
        'warnung',
        'einheit-fehlt',
        'Die Position hat keine Mengeneinheit (QU).',
        kind(el, 'QU') ?? el,
        { knotenId: id, feld: 'einheit' },
      );
    const upEl = kind(el, 'UP');
    const einheitspreis = upEl ? this.l.zahl('einheitspreis', upEl, id, 'einheitspreis') : null;

    const desc = kind(el, 'Description');
    if (!desc)
      this.l.melde(
        'warnung',
        'beschreibung-fehlt',
        'Die Position hat keine Beschreibung (Description).',
        el,
        { knotenId: id },
      );
    const texte = this.texte(desc);
    const leitbeschreibung = this.leitbeschreibung(el, id);

    const pos: Position = {
      art: 'position',
      id,
      elternId: eltern.id as ElternId,
      reihenfolge: this.reihenfolge(eltern.id),
      ordnungszahl,
      ozIndex,
      merkmale,
      zuschlag: null,
      ...(leitbeschreibung === undefined ? {} : { leitbeschreibung }),
      ...texte,
      menge,
      einheit,
      einheitspreis,
      epa: null,
    };
    this.knoten.push(pos);
    this.l.restMelden(el, POSITION_BEHANDELT, 'Item');
  }

  /**
   * Leitbeschreibung (E-11): `SumDescr` = Yes und die `SubDescr` darunter. `undefined`: keine. Unterbeschreibungen
   * ohne `SumDescr` werden trotzdem übernommen (kein stiller Verlust), mit Befund.
   */
  private leitbeschreibung(el: XmlElement, id: PositionId): Leitbeschreibung | undefined {
    const sum = this.l.merkmal(el, 'SumDescr', id);
    const subs = kinder(el, 'SubDescr');
    if (!sum && subs.length === 0) return undefined;
    if (!sum)
      this.l.melde(
        'warnung',
        'leitbeschreibung-ohne-kennzeichen',
        'Die Position hat Unterbeschreibungen (SubDescr), aber SumDescr ist nicht Yes; sie werden als Leitbeschreibung übernommen.',
        subs[0],
        { knotenId: id, feld: 'leitbeschreibung' },
      );
    const unterbeschreibungen = subs.map((sub): Unterbeschreibung => {
      const nummer = wert(kind(sub, 'SubDNo')) ?? '';
      if (nummer === '')
        this.l.melde(
          'warnung',
          'unterbeschreibung-ohne-nummer',
          'Die Unterbeschreibung hat keine Nummer (SubDNo).',
          sub,
          { knotenId: id, feld: 'leitbeschreibung' },
        );
      const mitMenge = this.l.merkmal(sub, 'QtySpec', id);
      const qtyEl = kind(sub, 'Qty');
      const menge = mitMenge && qtyEl ? this.l.zahl('menge', qtyEl, id, 'leitbeschreibung') : null;
      if (!mitMenge && qtyEl) this.l.nichtAbgebildet(qtyEl, 'SubDescr/Qty', 'Menge ohne QtySpec Yes');
      const desc = kind(sub, 'Description');
      if (desc) {
        this.l.restMelden(desc, BESCHREIBUNG_BEHANDELT, 'SubDescr/Description');
        const ct = kind(desc, 'CompleteText');
        if (ct) this.l.restMelden(ct, KOMPLETTTEXT_BEHANDELT, 'SubDescr/CompleteText');
      }
      this.l.restMelden(sub, UNTERBESCHREIBUNG_BEHANDELT, 'SubDescr');
      return { nummer, ...this.texte(desc), menge, einheit: this.einheit(sub) };
    });
    return { unterbeschreibungen };
  }

  private zuschlagsposition(el: XmlElement, eltern: Ebene, bereich: number): void {
    const id = this.ids.position();
    this.registriereId(el, id);
    const { ordnungszahl, ozIndex } = this.basis(el, eltern, id);
    const merkmale = this.merkmale(el, id, bereich);
    const typEl = kind(el, 'MarkupType');
    const typ = this.l.aufzaehlung(typEl, ['IdentAsMark', 'AllInCat', 'ListInSubQty'] as const, id);
    const markupEl = kind(el, 'Markup');
    const prozentsatz = markupEl ? this.l.zahl('prozent', markupEl, id, 'zuschlag.prozentsatz') : null;

    const refs: { id: string; el: XmlElement }[] = [];
    for (const sub of kinder(el, 'MarkupSubQty')) {
      const r = kind(sub, 'RefItem');
      const ref = r?.attrs.get('IDRef');
      if (r && ref !== undefined) refs.push({ id: ref, el: r });
      // Eine Teilmenge zeigt keine amtliche Datei; sie wird nicht geraten (`teilmenge: null`), sondern gemeldet.
      const subQty = kind(sub, 'SubQty');
      if (subQty) this.l.nichtAbgebildet(subQty, 'MarkupSubQty/SubQty', 'Teilmenge der Bezugsposition');
    }

    let bezug: Zuschlagsbezug;
    if (typ === 'IdentAsMark') bezug = { art: 'kennzeichnung' };
    else if (typ === 'AllInCat') bezug = { art: 'gliederung' };
    else bezug = { art: 'positionen', positionen: [] };
    if (typ === null)
      this.l.melde(
        'warnung',
        'zuschlag-bezug-nicht-abbildbar',
        `Die Zuschlagsposition hat keine gültige Bezugsform (MarkupType); ${refs.length > 0 ? 'die RefItem werden als Liste von Bezugspositionen übernommen' : 'der Bezug bleibt leer'}.`,
        typEl ?? el,
        { knotenId: id, feld: 'zuschlag.bezug' },
      );
    else if (typ !== 'ListInSubQty' && refs.length > 0)
      this.l.melde(
        'warnung',
        'zuschlag-bezug-nicht-abbildbar',
        `Die Bezugsform ${typ} hat keine Liste von Bezugspositionen; ${String(refs.length)} RefItem werden nicht übernommen.`,
        refs[0]?.el,
        { knotenId: id, feld: 'zuschlag.bezug' },
      );

    const pos: Veraenderlich<Position> = {
      art: 'position',
      id,
      elternId: eltern.id as ElternId,
      reihenfolge: this.reihenfolge(eltern.id),
      ordnungszahl,
      ozIndex,
      merkmale,
      zuschlag: { prozentsatz, bezug },
      ...this.texte(kind(el, 'Description')),
      menge: null,
      einheit: null,
      einheitspreis: null,
      epa: null,
    };
    this.knoten.push(pos);
    if (bezug.art === 'positionen' && refs.length > 0) this.zuschlaege.push({ pos, refs });
    this.l.restMelden(el, ZUSCHLAG_BEHANDELT, 'MarkupItem');
  }

  /** Löst die Verweise der Zuschlagspositionen (`ListInSubQty`) auf, nachdem alle Positionen gelesen sind. */
  loeseVerweise(): void {
    for (const z of this.zuschlaege) {
      const positionen: Bezugsposition[] = [];
      for (const r of z.refs) {
        const ziel = this.gaebIds.get(r.id);
        if (ziel === z.pos.id)
          // Der Kern weist eine Zuschlagsposition, die auf sich selbst zeigt, samt LV ab (bezug-unbekannt).
          this.l.melde(
            'warnung',
            'verweis-auf-sich',
            `RefItem der Zuschlagsposition verweist auf deren eigene ID „${r.id}“; der Bezug entfällt.`,
            r.el,
            { knotenId: z.pos.id, feld: 'zuschlag.bezug' },
          );
        else if (ziel) positionen.push({ positionId: ziel, teilmenge: null });
        else
          this.l.melde(
            'warnung',
            'verweis-unbekannt',
            `RefItem verweist auf die unbekannte ID „${r.id}“.`,
            r.el,
            { knotenId: z.pos.id, feld: 'zuschlag.bezug' },
          );
      }
      z.pos.zuschlag = {
        prozentsatz: z.pos.zuschlag?.prozentsatz ?? null,
        bezug: { art: 'positionen', positionen },
      };
    }
  }
}

// --- Dokumentkopf ---------------------------------------------------------------------------------------

/** Prüft alle `ID`-Attribute des Dokuments auf Doppelte (GAEB: xs:ID, eindeutig im ganzen Dokument). */
function pruefeIds(l: Leser, wurzel: XmlElement): void {
  const gesehen = new Set<string>();
  const stapel: XmlElement[] = [wurzel];
  for (let e = stapel.pop(); e !== undefined; e = stapel.pop()) {
    const id = e.attrs.get('ID');
    if (id !== undefined) {
      if (gesehen.has(id))
        l.melde('fehler', 'doppelte-id', `Die ID „${id}“ kommt mehrfach im Dokument vor.`, e);
      else gesehen.add(id);
    }
    const ks = elementKinder(e);
    for (let i = ks.length - 1; i >= 0; i--) stapel.push(ks[i] as XmlElement);
  }
}

function baueInhalt(root: XmlElement, opt: LeseOptionen, l: Leser): LvInhalt | null {
  const award = kind(root, 'Award');
  const boq = kind(award, 'BoQ');
  if (!award || !boq) {
    l.melde('fehler', 'lv-fehlt', 'Die Datei enthält kein Leistungsverzeichnis (Award/BoQ).', award ?? root);
    return null;
  }

  pruefeIds(l, root);

  for (const k of elementKinder(root))
    if (!['GAEBInfo', 'PrjInfo', 'Award'].includes(k.name)) l.nichtAbgebildet(k, `GAEB/${k.name}`);
  const prj = kind(root, 'PrjInfo');
  if (prj) l.restMelden(prj, new Set(['NamePrj']), 'PrjInfo');
  l.restMelden(award, new Set(['DP', 'BoQ']), 'Award');
  for (const extra of kinder(award, 'BoQ').slice(1))
    l.nichtAbgebildet(extra, 'Award/BoQ (weiteres)', 'je Datei wird nur ein LV gelesen');

  const boqInfo = kind(boq, 'BoQInfo');
  if (boqInfo) l.restMelden(boqInfo, new Set(['Name', 'BoQBkdn']), 'BoQInfo');
  else l.melde('warnung', 'oz-maske-ohne-position', 'BoQInfo fehlt; die Gliederung ist unbekannt.', boq);
  const trenn = opt.trennzeichen === undefined ? '.' : opt.trennzeichen;
  const { maske, stufen } = leseMaske(l, boqInfo, trenn);

  const name =
    wert(kind(boqInfo, 'Name')) || wert(kind(prj, 'NamePrj')) || opt.dateiname || 'Leistungsverzeichnis';
  const wurzelId = opt.ids.leistungsverzeichnis();
  const aufbau = new Aufbau(l, opt.ids, maske, stufen, trenn, wurzelId);
  const wurzelEbene: Ebene = { id: wurzelId, teile: [], ozOk: true, tiefe: 0 };
  const bodies = kinder(boq, 'BoQBody');
  if (bodies.length === 0) l.melde('warnung', 'lv-leer', 'Das Leistungsverzeichnis hat keinen BoQBody.', boq);
  for (const b of bodies) aufbau.koerper(b, wurzelEbene);
  aufbau.loeseVerweise();

  const mwstSatz = opt.standardMwstSatz ?? STANDARD_MWST_SATZ;
  if (opt.standardMwstSatz === undefined) {
    l.melde(
      'warnung',
      'mwst-standardsatz',
      `X81/X83 tragen keinen Steuersatz und der Aufrufer lieferte keinen; der Standardsatz ${STANDARD_MWST_SATZ} % wird eingesetzt.`,
      undefined,
      { feld: 'mwstSatz' },
    );
  } else {
    l.melde(
      'warnung',
      'mwst-ersatzwert',
      `X81/X83 tragen keinen Steuersatz; der vom Aufrufer gelieferte Satz ${opt.standardMwstSatz} % wird eingesetzt.`,
      undefined,
      { feld: 'mwstSatz' },
    );
  }
  return { name, ozMaske: maske, mwstSatz, nachlass: null, wurzelId, knoten: aufbau.knoten };
}

// --- Einstieg -----------------------------------------------------------------------------------------------

const LESBARE_PHASEN: ReadonlySet<GaebPhase> = new Set<GaebPhase>(['X81', 'X83']);

/**
 * Liest eine GAEB-DA-XML-3.3-Datei der Phase X81 oder X83. Wirft nie bei Dateiinhalt: Probleme sind Befunde;
 * `inhalt` ist `null`, wenn gar keine Struktur zu retten war (zurückgewiesen, unlesbar, andere Version oder Phase).
 */
export function leseGaeb(eingabe: Uint8Array | string, opt: LeseOptionen): GaebLesungErgebnis {
  const vorlauf: Pruefbefund[] = [];
  const ergebnis = (
    phase: GaebLesung['phase'],
    version: GaebLesung['version'],
    befunde: readonly Pruefbefund[],
    inhalt: LvInhalt | null = null,
  ): GaebLesungErgebnis => ({ phase, version, inhalt, befunde: [...vorlauf, ...befunde] });

  const groesse = eingabe.length;
  const maxBytes = opt.maxBytes ?? STANDARD_MAX_BYTES;
  if (groesse > maxBytes) {
    vorlauf.push({
      schwere: 'fehler',
      quelle: 'gaeb-lesen',
      code: 'datei-zu-gross',
      meldung: `Die Eingabe ist ${String(groesse)} Bytes groß; zulässig sind höchstens ${String(maxBytes)}. Sie wird nicht gelesen.`,
      ort: {},
    });
    return ergebnis(null, null, []);
  }

  let text: string;
  if (typeof eingabe === 'string') text = eingabe.charCodeAt(0) === 0xfeff ? eingabe.slice(1) : eingabe;
  else {
    const d = dekodiereBytes(eingabe);
    text = d.text;
    vorlauf.push(...d.befunde);
  }

  const xml = parseXml(text, { maxTiefe: opt.maxTiefe ?? STANDARD_MAX_TIEFE, blattNamen: BLATTNAMEN });
  vorlauf.push(...xml.befunde);
  const root = xml.wurzel;
  if (xml.abgelehnt || root === null) return ergebnis(null, null, []);

  const l = new Leser(xml, opt);
  if (root.name !== 'GAEB') {
    l.melde(
      'fehler',
      'wurzel-unerwartet',
      `Das Wurzelelement heißt „${root.name}“, erwartet wird GAEB.`,
      root,
    );
    return ergebnis(null, null, l.befunde);
  }

  const erk = erkenne(root, opt.dateiname);
  for (const b of erk.befunde) l.melde(b.schwere, b.code, b.meldung, b.element);

  if (erk.stand === 'bekannt-nicht-unterstuetzt') {
    l.melde(
      'fehler',
      'version-nicht-unterstuetzt',
      `GAEB DA XML ${erk.versionText ?? ''} wird nicht gelesen; gelesen wird nur 3.3 (3.2 folgt mit Ticket G4).`,
      root,
    );
    return ergebnis(erk.phase, erk.version, l.befunde);
  }
  if (erk.stand === 'unbekannt')
    l.melde(
      'warnung',
      'version-unbekannt',
      `Die Version ${erk.versionText === null ? '(ohne Angabe)' : `„${erk.versionText}“`} ist unbekannt; die Datei wird wie 3.3 gelesen.`,
      root,
    );
  if (erk.phase !== null && !LESBARE_PHASEN.has(erk.phase)) {
    l.melde(
      'fehler',
      'phase-nicht-unterstuetzt',
      `Die Phase ${erk.phase} wird in diesem Leser nicht gelesen (nur X81 und X83).`,
      root,
    );
    return ergebnis(erk.phase, erk.version, l.befunde);
  }

  const gebaut = baueInhalt(root, opt, l);
  l.abschliessen();
  return ergebnis(erk.phase, erk.version, l.befunde, gebaut);
}
