// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB DA XML 3.3/3.2/3.1, Phase X84 (Angebotsabgabe) → ein Befehl `AngebotAnlegen` (Ticket 45, E-13). Rein (A2):
// Kennungen bringt der Aufrufer, kein I/O, keine Uhr. Tolerant: Was nicht passt, wird Befund, nichts geht still
// verloren (Q5). Zuordnung zum LV allein über die Ordnungszahl (A7); die GAEB-`ID` ist kein Schlüssel.
//
// Lesarten (D-45.1, Ticket 45, Comments): EPA wie der X86-Leser (Bezeichnung vor `Type`). Seit v1.3 (Ticket 68, D-28)
// ordnet das LV mit seinen EPA-Bezeichnungen die Anteile über die Nummer zu; nur ohne Bezeichnung (im LV, bei einem LV
// vor v1.3 in der Datei) bleiben sie unzugeordnet (Befund). Nachlässe je Position oder Gliederung kann das Angebot nicht halten
// (G-26, D-10 Nr. 3): Fehler `nachlass-nicht-abgebildet`, der Preis bleibt ohne Nachlass.

import { NULL_EINHEITSPREIS, gesamtpreis, vergleiche } from '@tethys/dezimal';
import { betragsziel } from '@tethys/kern';
import type {
  AngebotAnlegen,
  AngebotId,
  Angebotsposition,
  BieterId,
  Bieterangaben,
  Einheitspreis,
  Einheitspreisanteile,
  EpaBezeichnung,
  GaebFormat,
  GaebPhase,
  GaebVersion,
  Knoten,
  Leistungsverzeichnis,
  Nachlass,
  OzMaske,
  OzStelle,
  Position,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { phaseAbweisen } from './abweisung';
import { deutsch, zahlwert } from './befunde';
import type { GaebBefund } from './befunde';
import { EPA_NUMMERN, deuteBeschriftung } from './epa';
import { ANTEILE, kind, kinder, leseMaske, vorlauf, wert } from './lesen';
import type { Anteil, Leser, VorlaufOptionen } from './lesen';
import { elementKinder, textInhalt } from './xml';
import type { XmlElement } from './xml';

export interface AngebotLeseOptionen extends VorlaufOptionen {
  /** Das Ausschreibungs-LV, gegen das der Bieter angeboten hat. */
  readonly lv: Leistungsverzeichnis;
  readonly angebotId: AngebotId;
  readonly bieterId: BieterId;
}

/**
 * Der Bieter, wie die Angebotsdatei ihn nennt (`CTR/Address`): Name aus `Name1` bis `Name4` und, wo die Datei sie trägt, die
 * Angaben (Ticket 136, E10, D-82 S7) in der Form von `BieterAnlegen`: Anschrift aus `Street`, `PCode`, `City`, Ansprechperson
 * aus `Contact`, Telefon aus `Phone`, E-Mail aus `Email`. Leer wird `null`; ohne jede Angabe fehlt `angaben`.
 */
export interface Bietervorschlag {
  /** Leer, wenn die Datei Angaben, aber keinen Namen trägt (Befund `bieter-name-fehlt`). */
  readonly name: string;
  readonly angaben?: Bieterangaben;
}

export interface AngebotLesung {
  /** `null`: nichts zu übernehmen (andere Phase oder Version, unlesbar, kein LV in der Datei). */
  readonly befehl: AngebotAnlegen | null;
  /**
   * Vorschlag für den Bieter aus `CTR/Address`; die App legt damit den Bieter an, falls er fehlt (`BieterAnlegen` mit
   * `angaben`), und überschreibt einen vorhandenen nicht (D-82). `null`: Die Datei nennt weder Namen noch Angaben.
   */
  readonly bieter: Bietervorschlag | null;
  readonly phase: GaebPhase | null;
  readonly version: GaebVersion | null;
  /** Herkunftsformat (Ticket 136); fehlt, wenn die Datei keine GAEB-Datei ist. */
  readonly format?: GaebFormat;
  readonly befunde: readonly GaebBefund[];
}

interface Anteilsangaben {
  /** Je `UPComp1…6` der Anteil, `null`: nicht zuordenbar (Grund in `grund`). */
  readonly anteile: readonly (Anteil | null)[];
  readonly grund: readonly string[];
  readonly freiBezeichnung: string | null;
}

/**
 * `LblUPComp1…6` der Angebotsdatei → Anteile (D-45.1), gedeutet wie im LV-Leser (`epa.ts`). Nur für ein LV ohne
 * EPA-Bezeichnungen (Daten vor v1.3); sonst gilt `anteileAusLv`.
 */
function leseAnteilsangaben(l: Leser, boqInfo: XmlElement | undefined): Anteilsangaben {
  const anteile: (Anteil | null)[] = [];
  const grund: string[] = [];
  const belegt = new Set<Anteil>();
  let freiBezeichnung: string | null = null;
  for (let n = 1; n <= 6; n++) {
    const el = kind(boqInfo, `LblUPComp${String(n)}`);
    if (!el) {
      anteile.push(null);
      grund.push('ohne LblUPComp im BoQInfo der Datei');
      continue;
    }
    const bez = wert(el) ?? '';
    const typ = el.attrs.get('Type') ?? '';
    const { anteil, vertraeglich } = deuteBeschriftung(bez, typ);
    if (!vertraeglich)
      l.melde(
        'warnung',
        'epa-beschriftung-abweichend',
        `LblUPComp${String(n)} „${bez}“ hat den Typ ${typ}; der Anteil wird nach der Bezeichnung zugeordnet.`,
        el,
      );
    if (belegt.has(anteil)) {
      anteile.push(null);
      grund.push(`zweiter Anteil derselben Art (LblUPComp${String(n)} „${bez}“)`);
      continue;
    }
    belegt.add(anteil);
    anteile.push(anteil);
    grund.push('');
    if (anteil === 'frei') freiBezeichnung = bez === '' ? null : bez;
  }
  return { anteile, grund, freiBezeichnung };
}

/**
 * Anteile über die EPA-Bezeichnungen des LV (v1.3, Ticket 68, D-28): `UPComp<n>` ist der Anteil, den das LV unter der
 * Nummer `n` führt. Die Nummer ist der Schlüssel; die amtlichen X84 tragen keine `LblUPComp` (das XSD der Phase 84 kennt
 * sie nicht). Beschriftet die Datei trotzdem einen Platz anders als das LV, gilt das LV (Warnung
 * `epa-beschriftung-abweichend`). Ein Platz ohne Bezeichnung im LV bleibt unzugeordnet (Befund `epa-nicht-abgebildet`).
 * Die Bezeichnung des freien Anteils steht im LV, nicht an der Position (D-53.6).
 */
function anteileAusLv(
  l: Leser,
  boqInfo: XmlElement | undefined,
  bezeichnungen: readonly EpaBezeichnung[],
): Anteilsangaben {
  const anteile: (Anteil | null)[] = [];
  const grund: string[] = [];
  for (const n of EPA_NUMMERN) {
    const imLv = bezeichnungen.find((e) => e.nummer === n);
    const el = kind(boqInfo, `LblUPComp${String(n)}`);
    if (el) {
      const bez = wert(el) ?? '';
      const inDatei = deuteBeschriftung(bez, el.attrs.get('Type') ?? '').anteil;
      if (inDatei !== imLv?.anteil)
        l.melde(
          'warnung',
          'epa-beschriftung-abweichend',
          `LblUPComp${String(n)} „${bez}“ der Angebotsdatei steht für ${inDatei}, das LV führt unter Nummer ${String(n)} ` +
            `${imLv === undefined ? 'keinen Anteil' : imLv.anteil}; es gilt das LV.`,
          el,
        );
    }
    anteile.push(imLv?.anteil ?? null);
    grund.push(imLv === undefined ? 'ohne EPA-Bezeichnung im LV' : '');
  }
  return { anteile, grund, freiBezeichnung: null };
}

const gleicheStelle = (a: OzStelle, b: OzStelle): boolean => a.laenge === b.laenge && a.zeichen === b.zeichen;

function gleicheMaske(a: OzMaske, b: OzMaske): boolean {
  return (
    a.gliederung.length === b.gliederung.length &&
    a.gliederung.every((s, i) => {
      const t = b.gliederung[i];
      return t !== undefined && gleicheStelle(s, t);
    }) &&
    (a.losStufe ?? false) === (b.losStufe ?? false) &&
    gleicheStelle(a.position, b.position) &&
    (a.index === null ? b.index === null : b.index !== null && gleicheStelle(a.index, b.index))
  );
}

const ITEM_BEHANDELT: ReadonlySet<string> = new Set([
  'Qty',
  'UP',
  'IT',
  ...ANTEILE,
  'DiscountPcnt',
  'DiscountAmt',
  'Description',
  'SubDescr',
]);
const ZUSCHLAG_BEHANDELT: ReadonlySet<string> = new Set([
  'Markup',
  'ITMarkup',
  'UP',
  'IT',
  'DiscountPcnt',
  'DiscountAmt',
  'Description',
]);
const KATEGORIE_BEHANDELT: ReadonlySet<string> = new Set(['LblTx', 'BoQBody', 'Totals']);
/** Beträge in `Totals` sind abgeleitet (die Summen rechnet `vergabe`); nur der Nachlass ist eine Angabe. */
const TOTALS_BEHANDELT: ReadonlySet<string> = new Set([
  'Total',
  'DiscountPcnt',
  'DiscountAmt',
  'TotAfterDisc',
  'VAT',
  'TotalNet',
  'VATAmount',
  'TotalGross',
  'TotalLSUM',
  'VATPart',
  'TotalNetUpComp',
]);

class Angebotsaufbau {
  /** OZ-Schlüssel (`oz|index`) → Position des LV. */
  private readonly positionen = new Map<string, Position>();
  /** OZ → Gliederung des LV (für den Ort der Befunde an `Totals`). */
  private readonly gliederungen = new Map<string, Knoten>();
  /** Gelesene Zeilen je Position des LV; `null`: Zeile vorhanden, aber nicht übernommen. */
  readonly zeilen = new Map<PositionId, Angebotsposition | null>();
  private epaOhneZuordnung = 0;
  private epaErst: XmlElement | null = null;
  private readonly epaGruende = new Set<string>();

  constructor(
    private readonly l: Leser,
    private readonly lv: Leistungsverzeichnis,
    private readonly anteile: Anteilsangaben,
  ) {
    for (const k of lv.knoten) {
      if (k.art === 'position') {
        if (k.ordnungszahl === null) continue;
        l.ozBekannt(k.id, ozVon(k));
        const s = `${k.ordnungszahl}|${k.ozIndex ?? ''}`;
        if (!this.positionen.has(s)) this.positionen.set(s, k);
      } else if ((k.art === 'titel' || k.art === 'los') && k.ordnungszahl !== null) {
        l.ozBekannt(k.id, k.ordnungszahl);
        if (!this.gliederungen.has(k.ordnungszahl)) this.gliederungen.set(k.ordnungszahl, k);
      }
    }
  }

  private get trenn(): string {
    return this.lv.ozMaske.trennzeichen ?? '';
  }

  koerper(body: XmlElement, teile: readonly string[] | null): void {
    for (const k of elementKinder(body)) {
      if (k.name === 'BoQCtgy') this.gliederung(k, teile);
      else if (k.name === 'Itemlist') this.liste(k, teile);
      else if (k.name === 'Remark') this.ergaenzungen(k);
      else this.l.nichtAbgebildet(k, `BoQBody/${k.name}`);
    }
  }

  private gliederung(el: XmlElement, eltern: readonly string[] | null): void {
    const t = el.attrs.get('RNoPart');
    const teile = eltern === null || t === undefined || t === '' ? null : [...eltern, t];
    this.l.restMelden(el, KATEGORIE_BEHANDELT, 'BoQCtgy');
    for (const b of kinder(el, 'BoQBody')) this.koerper(b, teile);
    const totals = kind(el, 'Totals');
    if (!totals) return;
    this.l.restMelden(totals, TOTALS_BEHANDELT, 'BoQCtgy/Totals');
    const oz = teile === null ? null : teile.join(this.trenn);
    const knoten = oz === null ? undefined : this.gliederungen.get(oz);
    this.nachlassMelden(totals, `der Gliederung ${oz ?? '(ohne OZ)'}`, knoten?.id, oz);
    pauschalsummeMelden(this.l, totals, `der Gliederung ${oz ?? '(ohne OZ)'}`, knoten?.id, oz);
  }

  /** `DiscountPcnt`/`DiscountAmt` an Position oder Gliederung: im Angebot nicht abbildbar (G-26, D-10 Nr. 3). */
  private nachlassMelden(el: XmlElement, wo: string, knotenId: string | undefined, oz: string | null): void {
    for (const name of ['DiscountPcnt', 'DiscountAmt'] as const) {
      const d = kind(el, name);
      if (!d) continue;
      const nachlass = zahlwert(name === 'DiscountPcnt' ? 'prozent' : 'betrag', wert(d) ?? '');
      this.l.melde(
        'fehler',
        'nachlass-nicht-abgebildet',
        `Nachlass ${deutsch(nachlass)} ${wo}: Ein Angebot hat genau einen Nachlass für das ganze Angebot; der Preis wird ` +
          'ohne diesen Nachlass übernommen.',
        d,
        {
          ...(knotenId === undefined ? {} : { knotenId }),
          ...(knotenId === undefined && oz !== null ? { oz } : {}),
          feld: 'nachlass',
          werte: { nachlass },
        },
      );
    }
  }

  /** Textergänzungen des Bieters mit Inhalt: das Angebot hat kein Feld dafür (G-32), je Datei ein Befund. */
  private ergaenzungen(el: XmlElement): void {
    const stapel: XmlElement[] = [el];
    for (let e = stapel.pop(); e !== undefined; e = stapel.pop()) {
      if (e.name === 'TextComplement') {
        if (e.attrs.get('Kind') === 'Bidder' && e.attrs.get('Empty') !== 'Yes' && textInhalt(e).trim() !== '')
          this.l.aggregiere(
            'bieterergaenzung',
            'bieterergaenzung-nicht-abgebildet',
            e,
            (n) =>
              `${String(n)} ${n === 1 ? 'Textergänzung' : 'Textergänzungen'} des Bieters ${n === 1 ? 'wird' : 'werden'} ` +
              'nicht übernommen; ein Angebot hält nur Preise.',
            { nichtUebernommen: 'Textergänzungen des Bieters' },
          );
        continue;
      }
      stapel.push(...elementKinder(e));
    }
  }

  private liste(liste: XmlElement, teile: readonly string[] | null): void {
    for (const k of elementKinder(liste)) {
      if (k.name === 'Item' || k.name === 'MarkupItem') this.zeile(k, teile);
      else if (k.name === 'Remark') this.ergaenzungen(k);
      else if (k.name !== 'PerfDescr') this.l.nichtAbgebildet(k, `Itemlist/${k.name}`);
    }
  }

  private zeile(el: XmlElement, eltern: readonly string[] | null): void {
    const t = el.attrs.get('RNoPart');
    const index = el.attrs.get('RNoIndex') ?? '';
    const oz = eltern === null || t === undefined || t === '' ? null : [...eltern, t].join(this.trenn);
    const anzeige = oz === null ? '(ohne OZ)' : `${oz}${index}`;
    const p = oz === null ? undefined : this.positionen.get(`${oz}|${index}`);
    if (!p) {
      this.l.melde(
        'fehler',
        'position-unbekannt',
        `Die Position ${anzeige} der Angebotsdatei gibt es im LV nicht; die Zeile wird nicht übernommen.`,
        el,
        oz === null ? {} : { oz: anzeige },
      );
      return;
    }
    if (this.zeilen.has(p.id)) {
      this.l.melde(
        'fehler',
        'doppelte-ordnungszahl',
        `Die Position ${anzeige} steht mehrfach in der Angebotsdatei; nur die erste Zeile wird übernommen.`,
        el,
        { knotenId: p.id },
      );
      return;
    }
    const zuschlagszeile = el.name === 'MarkupItem';
    this.ergaenzungen(el);
    this.nachlassMelden(el, `an der Position ${anzeige}`, p.id, anzeige);
    if (zuschlagszeile !== (p.zuschlag !== null)) {
      const roh = wert(kind(el, zuschlagszeile ? 'Markup' : 'UP'));
      const w = roh === null ? null : zahlwert(zuschlagszeile ? 'prozent' : 'einheitspreis', roh);
      const angabe = `${zuschlagszeile ? 'einen Zuschlagssatz' : 'einen Einheitspreis'}${w === null ? '' : ` (${deutsch(w)})`}`;
      this.l.melde(
        'fehler',
        'zuschlag-art-abweichend',
        `Die Position ${anzeige} ist im LV ${p.zuschlag === null ? 'keine' : 'eine'} Zuschlagsposition, die Angebotsdatei ` +
          `trägt dort ${angabe}; die Zeile wird nicht übernommen.`,
        el,
        { knotenId: p.id, ...(w === null ? {} : { werte: { wert: w } }) },
      );
      this.zeilen.set(p.id, null);
      return;
    }
    if (zuschlagszeile) this.zuschlagszeile(el, p);
    else this.preiszeile(el, p);
  }

  private preiszeile(el: XmlElement, p: Position): void {
    this.l.restMelden(el, ITEM_BEHANDELT, 'Item');
    // Eine Menge in der Angebotszeile ist die des Bieters (z. B. bei „Menge vom Bieter festzulegen“, QtyTBD im LV). Das
    // Angebot hält nur Preise; Befund an der Position, denn ihr GP weicht dann von der Datei ab (Ticket 129).
    const qtyEl = kind(el, 'Qty');
    if (qtyEl) {
      const bietermenge = zahlwert('menge', wert(qtyEl) ?? '');
      const lvMenge = p.menge === null ? null : zahlwert('menge', p.menge);
      this.l.melde(
        'warnung',
        'bietermenge-nicht-abgebildet',
        `Die Position ${ozVon(p)} trägt eine Menge des Bieters (${deutsch(bietermenge)}). Ein Angebot übernimmt nur Preise; ` +
          `es gilt die Menge des LV (${lvMenge === null ? 'ohne Menge' : deutsch(lvMenge)}).`,
        qtyEl,
        { knotenId: p.id, feld: 'menge', werte: { bietermenge, ...(lvMenge === null ? {} : { lvMenge }) } },
      );
    }
    for (const sub of kinder(el, 'SubDescr')) this.l.restMelden(sub, new Set(['SubDNo']), 'Item/SubDescr');
    const upEl = kind(el, 'UP');
    const ep = upEl ? this.l.zahl('einheitspreis', upEl, p.id, 'einheitspreis') : null;
    const epa = this.epa(el, p.id, ep !== null);
    if (ep === null) {
      this.zeilen.set(p.id, { positionId: p.id, status: 'nicht-angeboten' });
      return;
    }
    this.pruefeGesamtpreis(el, p, ep);
    this.zeilen.set(p.id, { positionId: p.id, status: 'angeboten', einheitspreis: ep, epa });
  }

  private zuschlagszeile(el: XmlElement, p: Position): void {
    this.l.restMelden(el, ZUSCHLAG_BEHANDELT, 'MarkupItem');
    const markupEl = kind(el, 'Markup');
    const satz: Prozent | null = markupEl ? this.l.zahl('prozent', markupEl, p.id, 'zuschlagssatz') : null;
    if (satz === null) {
      this.zeilen.set(p.id, { positionId: p.id, status: 'nicht-angeboten' });
      return;
    }
    // Platzhalter (Vertrag v1.2, D-12 Nr. 7): nie gerechnet; der EP der Datei, falls sie einen nennt.
    const upEl = kind(el, 'UP');
    const ep =
      (upEl ? this.l.zahl('einheitspreis', upEl, p.id, 'einheitspreis') : null) ?? NULL_EINHEITSPREIS;
    this.zeilen.set(p.id, {
      positionId: p.id,
      status: 'angeboten',
      einheitspreis: ep,
      epa: null,
      zuschlagssatz: satz,
    });
  }

  /** `UPComp1…6` → Einheitspreisanteile; nicht zuordenbare Werte zählen in einen Befund je Datei. */
  private epa(el: XmlElement, id: PositionId, mitPreis: boolean): Einheitspreisanteile | null {
    const epa: { -readonly [K in keyof Einheitspreisanteile]: Einheitspreisanteile[K] } = {
      lohn: null,
      stoffe: null,
      geraete: null,
      nachunternehmer: null,
      sonstiges: null,
      frei: null,
      freiBezeichnung: null,
    };
    let gesetzt = false;
    for (const [i, name] of ANTEILE.entries()) {
      const komp = kind(el, name);
      if (!komp) continue;
      const anteil = this.anteile.anteile[i] ?? null;
      if (anteil === null || !mitPreis) {
        this.epaOhneZuordnung += 1;
        this.epaErst ??= komp;
        this.epaGruende.add(mitPreis ? (this.anteile.grund[i] ?? '') : 'an einer Zeile ohne Einheitspreis');
        continue;
      }
      const w = this.l.zahl('einheitspreis', komp, id, 'epa');
      if (w === null) continue;
      epa[anteil] = w;
      gesetzt = true;
      if (anteil === 'frei') epa.freiBezeichnung = this.anteile.freiBezeichnung;
    }
    return gesetzt ? epa : null;
  }

  /** Punkt 4: gerundet(Menge des LV × EP, 2) gegen `IT` der Datei; nur Befund, die Summen rechnet `vergabe`. */
  private pruefeGesamtpreis(el: XmlElement, p: Position, ep: Einheitspreis): void {
    const itEl = kind(el, 'IT');
    if (!itEl || p.menge === null) return;
    const it = this.l.zahl('betrag', itEl, p.id, 'gesamtpreis');
    if (it === null) return;
    // Eine Position, die nicht ins Netto eingeht (Wahl, Bedarf ohne Gesamtbetrag), trägt in der Datei `IT` 0.00 (BVBS
    // Bauausführung, 001.002.0050); das ist kein abweichender Gesamtpreis (D-45.1). Wohin ein Betrag geht, sagt allein
    // der Kern (`betragsziel`, D-16): auch eine Wahl ohne Gruppe und Variante ist Wahl (D-37.1).
    const ohneSumme = betragsziel(p) !== 'netto';
    if (ohneSumme && vergleiche(it, '0.00' as typeof it) === 0) return;
    const soll = gesamtpreis(p.menge, ep);
    if (vergleiche(it, soll) !== 0) {
      const datei = { art: 'betrag', wert: it } as const;
      const gerechnet = { art: 'betrag', wert: soll } as const;
      this.l.melde(
        'warnung',
        'gp-abweichend',
        `Der Gesamtpreis der Angebotsdatei (${deutsch(datei)}) weicht von Menge des LV × EP (${deutsch(gerechnet)}) ab; ` +
          'gerechnet wird mit Menge × EP.',
        itEl,
        { knotenId: p.id, feld: 'gesamtpreis', werte: { datei, gerechnet } },
      );
    }
  }

  abschliessen(): void {
    const n = this.epaOhneZuordnung;
    if (n > 0)
      this.l.melde(
        'warnung',
        'epa-nicht-abgebildet',
        `${n === 1 ? '1 Wert' : `${String(n)} Werte`} der Einheitspreisanteile ${n === 1 ? 'lässt' : 'lassen'} ` +
          `sich keinem Anteil zuordnen (${[...this.epaGruende].sort().join('; ')}) und ${n === 1 ? 'wird' : 'werden'} ` +
          'nicht übernommen; der Einheitspreis bleibt.',
        this.epaErst ?? undefined,
        { werte: { anzahl: { art: 'anzahl', wert: n } } },
      );
  }

  /** Alle Positionen des LV in LV-Reihenfolge; ohne Zeile in der Datei „nicht angeboten“ mit Warnung. */
  angebotspositionen(): Angebotsposition[] {
    const ergebnis: Angebotsposition[] = [];
    for (const k of this.lv.knoten) {
      if (k.art !== 'position') continue;
      const z = this.zeilen.get(k.id);
      if (z === undefined)
        this.l.melde(
          'warnung',
          'position-fehlt-im-angebot',
          `Die Position ${k.ordnungszahl ?? '(ohne OZ)'}${k.ozIndex ?? ''} des LV fehlt in der Angebotsdatei; sie gilt als nicht angeboten.`,
          undefined,
          { knotenId: k.id },
        );
      ergebnis.push(z ?? { positionId: k.id, status: 'nicht-angeboten' });
    }
    return ergebnis;
  }
}

const ozVon = (p: Position): string => `${p.ordnungszahl ?? '(ohne OZ)'}${p.ozIndex ?? ''}`;

/**
 * `TotalLSUM`: eine Pauschalsumme des Bieters für eine Gliederung oder das LV. Das Angebot hält nur Preise je Position;
 * Befund, denn die Summen rechnen dann aus den Positionen und weichen von der Datei ab (Ticket 129).
 */
function pauschalsummeMelden(
  l: Leser,
  totals: XmlElement,
  wo: string,
  knotenId: string | undefined,
  oz: string | null,
): void {
  const el = kind(totals, 'TotalLSUM');
  if (!el) return;
  const pauschalsumme = zahlwert('betrag', wert(el) ?? '');
  l.melde(
    'warnung',
    'pauschalsumme-nicht-abgebildet',
    `Pauschalsumme ${deutsch(pauschalsumme)} ${wo}: Ein Angebot hält nur Preise je Position; die Summe wird aus den ` +
      'Positionen gerechnet.',
    el,
    {
      ...(knotenId === undefined ? {} : { knotenId }),
      ...(knotenId === undefined && oz !== null ? { oz } : {}),
      werte: { pauschalsumme },
    },
  );
}

/** `BoQInfo/Totals` des LV: der Nachlass des Angebots (G-26). Beträge sind abgeleitet, eine Pauschalsumme ist Befund. */
function leseAngebotsnachlass(l: Leser, totals: XmlElement | undefined): Nachlass | null {
  if (!totals) return null;
  l.restMelden(totals, TOTALS_BEHANDELT, 'BoQInfo/Totals');
  pauschalsummeMelden(l, totals, 'des LV', undefined, null);
  const dp = kind(totals, 'DiscountPcnt');
  const da = kind(totals, 'DiscountAmt');
  if (dp && da)
    l.melde(
      'fehler',
      'nachlass-nicht-abgebildet',
      'Die Datei trägt einen Nachlass in Prozent und einen als Betrag; ein Angebot hat genau einen, übernommen wird der in ' +
        'Prozent.',
      da,
      { feld: 'nachlass' },
    );
  if (dp) {
    const w = l.zahl('prozent', dp, '', 'nachlass');
    return w === null ? null : { art: 'prozent', wert: w };
  }
  if (da) {
    const w = l.zahl('betrag', da, '', 'nachlass');
    return w === null ? null : { art: 'betrag', wert: w };
  }
  return null;
}

const NAMEN = ['Name1', 'Name2', 'Name3', 'Name4'] as const;
/** `CTR/Address` → Bieterangaben (Ticket 136, E10): die Felder, die `Bieterangaben` hält. */
const ANGABEN_FELDER = ['Street', 'PCode', 'City', 'Contact', 'Phone', 'Email'] as const;

/**
 * `CTR/Address` → Bietervorschlag (Ticket 136, D-82 S7): Name aus `Name1…4`, Angaben aus `Street`, `PCode`, `City`,
 * `Contact`, `Phone`, `Email`; leer wird `null`, eine Anschrift ganz ohne Werte `null`, Angaben ganz ohne Werte fehlen
 * (Normalisierung wie D-127.4). Übrige Angaben zum Bieter (Land, Fax, Nummern) sind Befund (`nicht-abgebildet`).
 */
function leseBieter(l: Leser, award: XmlElement): Bietervorschlag | null {
  const ctr = kind(award, 'CTR');
  const adresse = kind(ctr, 'Address');
  const melde = (el: XmlElement, behandelt: readonly string[], bez: string): void => {
    for (const k of elementKinder(el))
      if (!behandelt.includes(k.name) && textInhalt(k).trim() !== '')
        l.nichtAbgebildet(k, `${bez}/${k.name}`, 'für diese Angabe zum Bieter gibt es kein Feld');
  };
  if (ctr) melde(ctr, ['Address'], 'CTR');
  if (adresse) melde(adresse, [...NAMEN, ...ANGABEN_FELDER], 'CTR/Address');
  const feld = (name: (typeof ANGABEN_FELDER)[number]): string | null => wert(kind(adresse, name)) || null;
  const strasse = feld('Street');
  const plz = feld('PCode');
  const ort = feld('City');
  const angaben: Bieterangaben = {
    anschrift: strasse === null && plz === null && ort === null ? null : { strasse, plz, ort },
    ansprechperson: feld('Contact'),
    email: feld('Email'),
    telefon: feld('Phone'),
  };
  const mitAngaben = Object.values(angaben).some((w) => w !== null);
  const name = NAMEN.map((n) => wert(kind(adresse, n)) ?? '')
    .filter((n) => n !== '')
    .join(' ');
  if (name === '')
    l.melde(
      'warnung',
      'bieter-name-fehlt',
      'Die Angebotsdatei nennt keinen Namen des Bieters (CTR/Address/Name1…4).',
      ctr ?? award,
    );
  if (name === '' && !mitAngaben) return null;
  return { name, ...(mitAngaben ? { angaben } : {}) };
}

/**
 * Liest eine Angebotsdatei X84 (GAEB DA XML 3.3 oder 3.2) gegen das LV, auf das der Bieter angeboten hat, und macht
 * daraus einen Befehl `AngebotAnlegen` mit einer Angebotsposition je Position des LV (LV-Reihenfolge). Wirft nie bei
 * Dateiinhalt. Andere Phasen liest `leseGaeb` (Fehler `phase-nicht-unterstuetzt`).
 */
export function leseAngebot(eingabe: Uint8Array | string, opt: AngebotLeseOptionen): AngebotLesung {
  const v = vorlauf(eingabe, opt, null, 'angebot');
  if (!v.bereit)
    return {
      befehl: null,
      bieter: null,
      phase: v.phase,
      version: v.version,
      ...(v.format === undefined ? {} : { format: v.format }),
      befunde: v.befunde,
    };
  const l = v.leser;
  const ergebnis = (befehl: AngebotAnlegen | null, bieter: AngebotLesung['bieter']): AngebotLesung => ({
    befehl,
    bieter,
    phase: v.phase,
    version: v.version,
    format: v.format,
    befunde: [...v.vorlauf, ...l.ozBefunde()],
  });
  if (v.phase !== 'X84') {
    const a = phaseAbweisen(v.phase, 'angebot');
    l.melde('fehler', 'phase-nicht-unterstuetzt', a.meldung, v.wurzel, { werte: a.werte });
    return ergebnis(null, null);
  }
  const award = kind(v.wurzel, 'Award');
  const boq = kind(award, 'BoQ');
  if (!award || !boq) {
    l.melde(
      'fehler',
      'lv-fehlt',
      'Die Datei enthält kein Leistungsverzeichnis (Award/BoQ).',
      award ?? v.wurzel,
    );
    return ergebnis(null, null);
  }
  for (const k of elementKinder(award))
    if (!['DP', 'AwardInfo', 'OWN', 'CTR', 'BoQ'].includes(k.name)) l.nichtAbgebildet(k, `Award/${k.name}`);
  const bieter = leseBieter(l, award);

  const { lv } = opt;
  const boqInfo = kind(boq, 'BoQInfo');
  if (boqInfo)
    l.restMelden(
      boqInfo,
      new Set([
        'Name',
        'LblBoQ',
        'BoQBkdn',
        'Totals',
        'NoUPComps',
        ...ANTEILE.map((a) => a.replace('UPComp', 'LblUPComp')),
      ]),
      'BoQInfo',
    );
  const { maske } = leseMaske(l, boqInfo, lv.ozMaske.trennzeichen);
  if (!gleicheMaske(maske, lv.ozMaske))
    l.melde(
      'warnung',
      'maske-abweichend',
      'Die OZ-Maske der Angebotsdatei (BoQBkdn) weicht von der des LV ab; zugeordnet wird trotzdem über die Teile der OZ.',
      boqInfo ?? boq,
    );
  const nachlass = leseAngebotsnachlass(l, kind(boqInfo, 'Totals'));

  const anteile =
    lv.epaBezeichnungen === undefined
      ? leseAnteilsangaben(l, boqInfo)
      : anteileAusLv(l, boqInfo, lv.epaBezeichnungen);
  const aufbau = new Angebotsaufbau(l, lv, anteile);
  for (const b of kinder(boq, 'BoQBody')) aufbau.koerper(b, []);
  for (const extra of kinder(award, 'BoQ').slice(1))
    l.nichtAbgebildet(extra, 'Award/BoQ (weiteres)', 'je Datei wird nur ein LV gelesen');
  aufbau.abschliessen();
  const positionen = aufbau.angebotspositionen();
  l.abschliessen();

  const befehl: AngebotAnlegen = {
    art: 'AngebotAnlegen',
    angebot: {
      id: opt.angebotId,
      projektId: lv.projektId,
      leistungsverzeichnisId: lv.id,
      bieterId: opt.bieterId,
      nachlass,
      positionen,
    },
  };
  return ergebnis(befehl, bieter);
}
