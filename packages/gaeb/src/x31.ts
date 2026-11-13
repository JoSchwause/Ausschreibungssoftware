// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB DA XML 3.3/3.2, Phase X31 (Mengenermittlung) → Inhalt eines Aufmaßblatts (Ticket 83, M3; D-33, D-36 (1)). Rein
// (A2): kein I/O, keine Uhr, keine Rechnung. Die Zeilen in `QTakeoff/@Row` haben das feste Spaltenformat aus `reb.ts`.
// Tolerant: Was nicht passt, wird Befund, nichts geht still verloren (Q5). Zuordnung der `Item`s allein über die
// Ordnungszahl des Auftrags-LV (A7), wie der Angebotsleser über das LV.
//
// Lesarten (Entscheidungen D-83.x in Ticket 83):
// - Formel 91 (freier Rechenansatz, auch über mehrere Zeilen) wird je Ausdruck eine Ansatzzeile mit eigener
//   Zeilennummer 1, 2, … je Aufmaßposition; ein Verweis auf die Zeilennummer einer früheren solchen Zeile derselben
//   Position wird zum Bezug `Z<n>`. Die Menge bleibt `null`: Sie rechnet die App mit `mengen` (D-22, D-36).
// - Was der freie Rechenansatz nicht genau abbildet (andere Formel, Kennung wie `H` oder `Z`, Vorzeichen oder Faktor,
//   Verweis außerhalb der Position oder auf eine solche Zeile, Buchstaben im Ausdruck), steht in der **Textform** im
//   Modell: `formel` ist die Formelnummer der Datei, `ausdruck` ist `*` und dahinter die Spalten 13–69 der Zeile. `mengen`
//   weist einen Ausdruck, der mit `*` beginnt, immer ab; die Menge der Position bleibt also `null`, nie geraten (Q5).
// - Textzeilen (`*`) und die kurzen Texte der Rechenzeilen sind Befund: Das Aufmaßblatt hat kein Feld für Bemerkungen
//   (Offene Typfrage 10, Ticket 70).
// - Mehrere `Item`s zur selben OZ ergeben eine Aufmaßposition (D-42); ein `Item` ohne Zeilen und ohne Menge keine.

import type {
  Ansatzzeile,
  Aufmass,
  Aufmassposition,
  AuftragsLvZustand,
  GaebFormat,
  GaebPhase,
  GaebVersion,
  Menge,
  OzMaske,
  OzStelle,
  Position,
  PositionId,
} from '@tethys/vertrag';
import { phaseAbweisen } from './abweisung';
import { anzahl, text } from './befunde';
import type { GaebBefund } from './befunde';
import { kind, kinder, leseMaske, vorlauf, wert } from './lesen';
import type { Leser, VorlaufOptionen } from './lesen';
import { FORMEL_91, VERWEIS, rebZeileZerlegen } from './reb';
import type { RebZeile } from './reb';
import { elementKinder } from './xml';
import type { XmlElement } from './xml';

/** Inhalt eines Aufmaßblatts aus einer X31: ohne Kennung, Projekt, Auftrags-LV und Nummer (die ergänzt die App, D-42). */
export type X31Aufmass = Omit<Aufmass, 'id' | 'projektId' | 'auftragsLvId' | 'nummer'>;

export interface X31Lesung {
  /** `null`: nichts zu übernehmen (andere Phase oder Version, unlesbar, kein LV in der Datei). */
  readonly aufmass: X31Aufmass | null;
  readonly phase: GaebPhase | null;
  readonly version: GaebVersion | null;
  /** Herkunftsformat (Ticket 136); fehlt, wenn die Datei keine GAEB-Datei ist. */
  readonly format?: GaebFormat;
  readonly befunde: readonly GaebBefund[];
}

/** Ein Vorkommen einer Position in der Datei: ihre Zeilen und ihre Menge (`Qty`). */
interface Eintrag {
  readonly position: Position;
  readonly element: XmlElement;
  readonly zeilen: { readonly zeile: RebZeile; readonly el: XmlElement }[];
  readonly mengen: { readonly wert: Menge; readonly el: XmlElement }[];
}

const gleicheStelle = (a: OzStelle, b: OzStelle): boolean => a.laenge === b.laenge && a.zeichen === b.zeichen;

function gleicheMaske(a: OzMaske, b: OzMaske): boolean {
  return (
    a.gliederung.length === b.gliederung.length &&
    a.gliederung.every((s, i) => {
      const t = b.gliederung[i];
      return t !== undefined && gleicheStelle(s, t);
    }) &&
    gleicheStelle(a.position, b.position) &&
    (a.index === null ? b.index === null : b.index !== null && gleicheStelle(a.index, b.index))
  );
}

const ANGABE_ZUM_AUFTRAG = 'Angabe zum Auftrag; maßgeblich ist das Auftrags-LV';
const OZ = (p: Position): string => `${p.ordnungszahl ?? '(ohne OZ)'}${p.ozIndex ?? ''}`;
const zitat = (texte: readonly string[]): string => texte.map((t) => `„${t}“`).join(', ');

class Aufmassaufbau {
  /** OZ-Schlüssel (`oz|index`) → Position des Auftrags-LV. */
  private readonly positionen = new Map<string, Position>();
  /** Einträge je Position in der Reihenfolge der Datei. */
  readonly eintraege = new Map<PositionId, Eintrag[]>();

  constructor(
    private readonly l: Leser,
    private readonly trenn: string,
    knoten: AuftragsLvZustand['auftragsLeistungsverzeichnis']['knoten'],
  ) {
    for (const k of knoten)
      if (k.art === 'position' && k.ordnungszahl !== null) {
        l.ozBekannt(k.id, OZ(k));
        const s = `${k.ordnungszahl}|${k.ozIndex ?? ''}`;
        if (!this.positionen.has(s)) this.positionen.set(s, k);
      }
  }

  koerper(body: XmlElement, teile: readonly string[] | null): void {
    for (const k of elementKinder(body)) {
      if (k.name === 'BoQCtgy') this.gliederung(k, teile);
      else if (k.name === 'Itemlist') this.liste(k, teile);
      else this.l.nichtAbgebildet(k, `BoQBody/${k.name}`);
    }
  }

  private gliederung(el: XmlElement, eltern: readonly string[] | null): void {
    const t = el.attrs.get('RNoPart');
    const teile = eltern === null || t === undefined || t === '' ? null : [...eltern, t];
    this.l.restMelden(el, new Set(['BoQBody']), 'BoQCtgy');
    for (const b of kinder(el, 'BoQBody')) this.koerper(b, teile);
  }

  private liste(liste: XmlElement, teile: readonly string[] | null): void {
    for (const k of elementKinder(liste)) {
      if (k.name === 'Item') this.item(k, teile);
      else this.l.nichtAbgebildet(k, `Itemlist/${k.name}`);
    }
  }

  private item(el: XmlElement, eltern: readonly string[] | null): void {
    const t = el.attrs.get('RNoPart');
    const index = el.attrs.get('RNoIndex') ?? '';
    const oz = eltern === null || t === undefined || t === '' ? null : [...eltern, t].join(this.trenn);
    const p = oz === null ? undefined : this.positionen.get(`${oz}|${index}`);
    this.l.restMelden(el, new Set(['QtyDeterm']), 'Item');
    if (!p) {
      this.l.melde(
        'fehler',
        'position-unbekannt',
        `Die Position ${oz === null ? '(ohne OZ)' : `${oz}${index}`} der Mengenermittlung gibt es im Auftrags-LV nicht; ` +
          'ihre Zeilen werden nicht übernommen.',
        el,
        oz === null ? {} : { oz: `${oz}${index}` },
      );
      return;
    }
    const eintrag: Eintrag = { position: p, element: el, zeilen: [], mengen: [] };
    const qd = kind(el, 'QtyDeterm');
    if (qd) {
      this.l.restMelden(qd, new Set(['Qty', 'QDetermItem']), 'Item/QtyDeterm');
      const qty = kind(qd, 'Qty');
      if (qty) {
        const m = this.l.zahl('menge', qty, p.id, 'menge');
        if (m !== null) eintrag.mengen.push({ wert: m, el: qty });
      }
      for (const qi of kinder(qd, 'QDetermItem')) {
        this.l.restMelden(qi, new Set(['QTakeoff']), 'QDetermItem');
        const qt = kind(qi, 'QTakeoff');
        const row = qt?.attrs.get('Row');
        if (qt === undefined || row === undefined) {
          this.l.melde('warnung', 'zeile-fehlt', 'Ein QDetermItem ohne QTakeoff/@Row wird übergangen.', qi, {
            knotenId: p.id,
          });
          continue;
        }
        const zeile = rebZeileZerlegen(row);
        if (zeile.laengeAbweichend)
          this.l.aggregiere(
            'zeile-laenge',
            'zeile-laenge',
            qt,
            (n) =>
              `${String(n)} ${n === 1 ? 'Zeile hat' : 'Zeilen haben'} nicht genau 80 Zeichen; gelesen wird nach den festen Spalten ` +
              '(fehlende Zeichen als Leerzeichen).',
          );
        if (zeile.randBelegt)
          this.l.aggregiere(
            'zeile-rand',
            'nicht-abgebildet',
            qt,
            (n) =>
              `${String(n)} ${n === 1 ? 'Zeile trägt' : 'Zeilen tragen'} Angaben in den Spalten 1–12 oder 76–80; sie werden nicht übernommen.`,
            { nichtUebernommen: 'Angaben am Rand einer Aufmaßzeile' },
          );
        eintrag.zeilen.push({ zeile, el: qt });
      }
    }
    const liste = this.eintraege.get(p.id) ?? [];
    liste.push(eintrag);
    this.eintraege.set(p.id, liste);
  }
}

/** Die Ansatzzeilen einer Position aus ihren Zeilen; meldet, was nicht genau abgebildet wird. */
class Ansatzbau {
  readonly zeilen: Ansatzzeile[] = [];
  /** Zeilennummer der Datei → Nummer der Ansatzzeile, nur für genau abgebildete Ausdrücke (deren letzte Zeile). */
  private readonly ergebnisse = new Map<string, number>();
  private readonly bemerkungen: string[] = [];
  private readonly formeln = new Set<string>();
  private formelZeilen = 0;
  private readonly gruende = new Set<string>();
  private textformZeilen = 0;
  private offeneAusdruecke = 0;
  private gruppe: RebZeile[] = [];

  constructor(
    private readonly l: Leser,
    private readonly p: Position,
    private readonly el: XmlElement,
  ) {}

  zeile(z: RebZeile): void {
    if (z.kennung === '*') {
      this.gruppeBeenden(false);
      if (z.text !== '') this.bemerkungen.push(z.text);
      return;
    }
    if (z.formel === String(FORMEL_91)) {
      this.gruppe.push(z);
      if (z.inhalt.endsWith('=')) this.gruppeBeenden(true);
      return;
    }
    this.gruppeBeenden(false);
    if (z.roh.trim() === '') return;
    if (!/^[0-9]{2}$/.test(z.formel)) {
      this.l.melde(
        'fehler',
        'zeile-ohne-formel',
        `Eine Rechenzeile der Position ${OZ(this.p)} hat keine Formelnummer (Spalten 30–31) und wird nicht übernommen: „${z.roh.trim()}“.`,
        this.el,
        { knotenId: this.p.id },
      );
      return;
    }
    this.formeln.add(z.formel);
    this.formelZeilen += 1;
    this.textform(z);
  }

  private naechste(): number {
    return this.zeilen.length + 1;
  }

  /** Die Zeile in der Textform: Ihr Text bleibt im Ausdruck stehen, ist also kein Befund. */
  private textform(z: RebZeile): void {
    this.zeilen.push({
      zeile: this.naechste(),
      formel: Number(z.formel),
      ausdruck: `*${z.roh}`,
      variable: null,
    });
  }

  gruppeBeenden(vollstaendig: boolean): void {
    const g = this.gruppe;
    if (g.length === 0) return;
    this.gruppe = [];
    if (!vollstaendig) this.offeneAusdruecke += 1;
    const gruende: string[] = [];
    for (const z of g) {
      if (z.kennung !== ' ') gruende.push(`Kennung „${z.kennung}“ in Spalte 13`);
      if (z.vorzeichenFaktor !== '') gruende.push('Vorzeichen oder Faktor in den Spalten 23–29');
    }
    let ausdruck = g.map((z) => z.inhalt).join('');
    if (vollstaendig) ausdruck = ausdruck.slice(0, -1);
    const uebersetzt = ausdruck.replace(VERWEIS, (nummer: string) => {
      const n = this.ergebnisse.get(nummer);
      if (n === undefined) {
        gruende.push(
          `Verweis auf die Zeile ${nummer}, die kein früherer, abgebildeter Ausdruck dieser Position ist`,
        );
        return nummer;
      }
      return `Z${String(n)}`;
    });
    if (/\p{L}/u.test(ausdruck.replace(VERWEIS, '')))
      gruende.push('Buchstaben im Ausdruck, die der freie Rechenansatz nicht kennt');
    if (gruende.length > 0) {
      for (const g2 of gruende) this.gruende.add(g2);
      this.textformZeilen += g.length;
      for (const z of g) this.textform(z);
      return;
    }
    for (const z of g) if (z.text !== '') this.bemerkungen.push(z.text);
    const n = this.naechste();
    this.zeilen.push({ zeile: n, formel: FORMEL_91, ausdruck: uebersetzt, variable: null });
    const nummer = g.at(-1)?.nummer ?? '';
    if (nummer !== '' && !this.ergebnisse.has(nummer)) this.ergebnisse.set(nummer, n);
  }

  befundeMelden(): void {
    const oz = OZ(this.p);
    const ort = { knotenId: this.p.id };
    if (this.formelZeilen > 0)
      this.l.melde(
        'fehler',
        'formel-nicht-unterstuetzt',
        `Position ${oz}: ${String(this.formelZeilen)} ${this.formelZeilen === 1 ? 'Zeile' : 'Zeilen'} mit Formel ` +
          `${[...this.formeln].sort().join(', ')} ${this.formelZeilen === 1 ? 'steht' : 'stehen'} als Text im Aufmaßblatt; ` +
          'umgesetzt ist nur Formel 91, die Menge der Position wird nicht gerechnet.',
        this.el,
        {
          ...ort,
          werte: { anzahl: anzahl(this.formelZeilen), formeln: text([...this.formeln].sort().join(', ')) },
        },
      );
    if (this.textformZeilen > 0)
      this.l.melde(
        'fehler',
        'zeile-nicht-abbildbar',
        `Position ${oz}: ${String(this.textformZeilen)} ${this.textformZeilen === 1 ? 'Zeile' : 'Zeilen'} der Formel 91 ` +
          `${this.textformZeilen === 1 ? 'steht' : 'stehen'} als Text im Aufmaßblatt (${[...this.gruende].join('; ')}); ` +
          'die Menge der Position wird nicht gerechnet.',
        this.el,
        { ...ort, werte: { anzahl: anzahl(this.textformZeilen) } },
      );
    if (this.offeneAusdruecke > 0)
      this.l.melde(
        'warnung',
        'formel-ohne-abschluss',
        `Position ${oz}: ${String(this.offeneAusdruecke)} ${this.offeneAusdruecke === 1 ? 'Ausdruck endet' : 'Ausdrücke enden'} ` +
          'ohne „=“; übernommen wird, was dasteht.',
        this.el,
        { ...ort, werte: { anzahl: anzahl(this.offeneAusdruecke) } },
      );
    if (this.bemerkungen.length > 0)
      this.l.melde(
        'warnung',
        'bemerkung-nicht-abgebildet',
        `Position ${oz}: ${String(this.bemerkungen.length)} ${this.bemerkungen.length === 1 ? 'Text wird' : 'Texte werden'} ` +
          `nicht übernommen, das Aufmaßblatt hat kein Feld für Bemerkungen: ${zitat(this.bemerkungen)}.`,
        this.el,
        { ...ort, werte: { anzahl: anzahl(this.bemerkungen.length), texte: text(zitat(this.bemerkungen)) } },
      );
  }
}

/** Eine Aufmaßposition aus allen Einträgen einer Position, oder `null`, wenn nichts aufgemessen ist. */
function aufmassposition(l: Leser, eintraege: readonly Eintrag[]): Aufmassposition | null {
  const erster = eintraege[0];
  if (erster === undefined) return null;
  const p = erster.position;
  const bau = new Ansatzbau(l, p, erster.element);
  for (const e of eintraege) {
    for (const { zeile } of e.zeilen) bau.zeile(zeile);
    bau.gruppeBeenden(false);
  }
  bau.befundeMelden();
  const mengen = eintraege.flatMap((e) => e.mengen);
  if (bau.zeilen.length > 0) {
    if (mengen.length > 0)
      l.aggregiere(
        'menge-neben-ansatz',
        'menge-nicht-uebernommen',
        mengen[0]?.el ?? null,
        (n) =>
          `${String(n)} ${n === 1 ? 'Position trägt' : 'Positionen tragen'} eine Menge neben den Aufmaßzeilen; übernommen ` +
          'werden die Zeilen, die Menge wird daraus gerechnet.',
      );
    return { positionId: p.id, mengenansatz: bau.zeilen, menge: null };
  }
  const [einzige, ...weitere] = mengen;
  if (einzige === undefined) return null;
  if (weitere.length > 0) {
    l.melde(
      'fehler',
      'menge-mehrfach',
      `Position ${OZ(p)}: ${String(mengen.length)} Mengen ohne Aufmaßzeilen; welche gilt, ist offen, keine wird ` +
        'übernommen.',
      einzige.el,
      { knotenId: p.id, werte: { anzahl: anzahl(mengen.length) } },
    );
    return null;
  }
  return { positionId: p.id, mengenansatz: null, menge: einzige.wert };
}

const QTYDETERM_BEHANDELT: ReadonlySet<string> = new Set(['QtyDetermInfo', 'DP', 'BoQ']);
const VERFAHREN = 'REB23003-2009';

/**
 * Liest eine Mengenermittlung X31 (GAEB DA XML 3.3 oder 3.2) gegen das Auftrags-LV, dessen Positionen sie aufmisst.
 * Liefert den Inhalt eines Aufmaßblatts (Positionen mit Mengenansatz, Menge `null`) und Befunde; die App ergänzt Kennung,
 * Projekt, Auftrags-LV und Nummer und rechnet die Mengen mit `mengen`. Wirft nie bei Dateiinhalt.
 */
export function x31Lesen(
  eingabe: Uint8Array | string,
  auftragsLv: AuftragsLvZustand,
  opt: VorlaufOptionen = {},
): X31Lesung {
  const v = vorlauf(eingabe, opt, null, 'mengenermittlung');
  if (!v.bereit)
    return {
      aufmass: null,
      phase: v.phase,
      version: v.version,
      ...(v.format === undefined ? {} : { format: v.format }),
      befunde: v.befunde,
    };
  const l = v.leser;
  const ergebnis = (aufmass: X31Aufmass | null): X31Lesung => ({
    aufmass,
    phase: v.phase,
    version: v.version,
    format: v.format,
    befunde: [...v.vorlauf, ...l.ozBefunde()],
  });
  if (v.phase !== 'X31') {
    const a = phaseAbweisen(v.phase, 'mengenermittlung');
    l.melde('fehler', 'phase-nicht-unterstuetzt', a.meldung, v.wurzel, { werte: a.werte });
    l.abschliessen();
    return ergebnis(null);
  }
  const qd = kind(v.wurzel, 'QtyDeterm');
  const boq = kind(qd, 'BoQ');
  if (!qd || !boq) {
    l.melde(
      'fehler',
      'lv-fehlt',
      'Die Datei enthält kein Leistungsverzeichnis (QtyDeterm/BoQ).',
      qd ?? v.wurzel,
    );
    l.abschliessen();
    return ergebnis(null);
  }
  for (const k of elementKinder(qd))
    if (!QTYDETERM_BEHANDELT.has(k.name)) l.nichtAbgebildet(k, `QtyDeterm/${k.name}`, ANGABE_ZUM_AUFTRAG);
  const info = kind(qd, 'QtyDetermInfo');
  if (info) {
    l.restMelden(info, new Set(['MethodDescription']), 'QtyDetermInfo');
    const verfahren = wert(kind(info, 'MethodDescription'));
    if (verfahren !== VERFAHREN)
      l.melde(
        'warnung',
        'verfahren-abweichend',
        `Die Datei nennt das Verfahren ${verfahren === null ? '(keine Angabe)' : `„${verfahren}“`}; gelesen wird nach dem ` +
          `Zeilenformat von ${VERFAHREN}.`,
        kind(info, 'MethodDescription') ?? info,
      );
  }

  const lv = auftragsLv.auftragsLeistungsverzeichnis;
  l.restMelden(boq, new Set(['BoQBkdn', 'BoQBody']), 'BoQ');
  const { maske } = leseMaske(l, boq, lv.ozMaske.trennzeichen);
  if (!gleicheMaske(maske, lv.ozMaske))
    l.melde(
      'warnung',
      'maske-abweichend',
      'Die OZ-Maske der Mengenermittlung (BoQBkdn) weicht von der des Auftrags-LV ab; zugeordnet wird trotzdem über die Teile der OZ.',
      boq,
    );
  const aufbau = new Aufmassaufbau(l, lv.ozMaske.trennzeichen ?? '', lv.knoten);
  for (const b of kinder(boq, 'BoQBody')) aufbau.koerper(b, []);
  const positionen: Aufmassposition[] = [];
  for (const eintraege of aufbau.eintraege.values()) {
    const a = aufmassposition(l, eintraege);
    if (a !== null) positionen.push(a);
  }
  l.abschliessen();
  return ergebnis({ bezeichnung: '', datum: null, positionen });
}
