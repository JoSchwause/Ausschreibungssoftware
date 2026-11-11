// SPDX-License-Identifier: AGPL-3.0-or-later
// Vom Preisspiegel aus `vergabe` zur Ansicht des Vergleichsgrids (Ticket 63). Die App rechnet nie (A5, N1): Jede Zahl
// kommt aus `preisspiegelBerechnen` und wird hier nur über `dezimal` in de-DE formatiert (N4). Rein und ohne React,
// damit Spalten, Zeilen, Summen und die Erklärungen der Detailleiste ohne Browser testbar sind.

import {
  formatiereBetragDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
} from '@tethys/dezimal';
import { preisspiegelBerechnen } from '@tethys/vergabe';
import type {
  Bieterpreis,
  Preisspiegel,
  PreisspiegelEinstellungen,
  Preisspiegelzeile,
  VirtuellerPreis,
} from '@tethys/vergabe';
import type {
  KennzeichenText,
  VergleichsSpalte,
  VergleichsSummenzeile,
  VergleichsZeile,
  VergleichsZelle,
  VergleichsZellort,
} from '@tethys/ui-grid';
import type { AngebotZustand, Betrag, Einheitspreis, Knoten, LvZustand, Prozent } from '@tethys/vertrag';
import { kinderJeEltern } from '../lv/ansicht';
import { ozText } from '../lv/oztext';
import { texte } from './texte';

/** Ein Angebot mit dem Namen seines Bieters (aus dem Projekt). */
export interface Anbieter {
  readonly name: string;
  readonly zustand: AngebotZustand;
}

/** Welche Spalten sichtbar sind (G-26: einstellbar; Sitzungszustand, nicht gespeichert). */
export interface Spaltenwahl {
  readonly ep: boolean;
  readonly gp: boolean;
  readonly virtuell: boolean;
  readonly schaetzpreis: boolean;
}

export const STANDARD_WAHL: Spaltenwahl = { ep: true, gp: true, virtuell: true, schaetzpreis: true };

/** Die Rechnung, getrennt von der Ansicht: Auf- und Zuklappen und Spaltenwahl rechnen nicht neu. */
export function preisspiegelRechnen(
  lv: LvZustand,
  anbieter: readonly Anbieter[],
  einstellungen: Partial<PreisspiegelEinstellungen> = {},
): Preisspiegel {
  return preisspiegelBerechnen(
    lv,
    anbieter.map((a) => a.zustand),
    einstellungen,
  );
}

export interface AnsichtEingang {
  readonly lv: LvZustand;
  readonly anbieter: readonly Anbieter[];
  readonly preisspiegel: Preisspiegel;
  readonly wahl: Spaltenwahl;
  /** Zugeklappte Gliederungen (Kennungen); der Aufklappzustand gehört der Seite. */
  readonly zugeklappt: ReadonlySet<string>;
}

export interface PreisspiegelAnsicht {
  readonly spalten: readonly VergleichsSpalte[];
  readonly zeilen: readonly VergleichsZeile[];
  readonly summen: readonly VergleichsSummenzeile[];
  readonly kennzeichenTexte: Readonly<Record<string, KennzeichenText>>;
}

// --- Spalten ------------------------------------------------------------------------------------------------------

const VIRTUELL = ['min', 'mittel', 'max'] as const;
type Virtuell = (typeof VIRTUELL)[number];

/** Spaltenkennung einer Bieter- oder virtuellen Spalte: `<angebotId|min|mittel|max|schaetzpreis>:<ep|gp>`. */
export const spaltenId = (wer: string, was: 'ep' | 'gp'): string => `${wer}:${was}`;

/** Die Spalte, in der Summen und Gliederungssummen stehen: GP, ohne GP-Spalte der EP. */
const wertspalte = (wahl: Spaltenwahl): 'ep' | 'gp' => (wahl.gp ? 'gp' : 'ep');
/** Die Spalte mit den Kennzeichen eines Preises: der verglichene Wert (EP, an einer Zuschlagsposition der Betrag). */
const kennzeichenspalte = (wahl: Spaltenwahl, zuschlag: boolean): 'ep' | 'gp' =>
  !wahl.ep ? 'gp' : !wahl.gp ? 'ep' : zuschlag ? 'gp' : 'ep';

const BREITE_EP = 136;
const BREITE_GP = 120;

function preisgruppe(wer: string, kopf: string, wahl: Spaltenwahl): VergleichsSpalte[] {
  const gruppe = { id: wer, kopf };
  const aus: VergleichsSpalte[] = [];
  if (wahl.ep)
    aus.push({
      id: spaltenId(wer, 'ep'),
      kopf: texte.spalten.ep,
      gruppe,
      ausrichtung: 'rechts',
      breite: BREITE_EP,
    });
  if (wahl.gp)
    aus.push({
      id: spaltenId(wer, 'gp'),
      kopf: texte.spalten.gp,
      gruppe,
      ausrichtung: 'rechts',
      breite: BREITE_GP,
    });
  return aus;
}

function spaltenBauen(anbieter: readonly Anbieter[], wahl: Spaltenwahl): VergleichsSpalte[] {
  const s = texte.spalten;
  return [
    { id: 'oz', kopf: s.oz, breite: 96 },
    { id: 'kurztext', kopf: s.kurztext, breite: 260 },
    { id: 'menge', kopf: s.menge, ausrichtung: 'rechts', breite: 96 },
    { id: 'einheit', kopf: s.einheit, breite: 64 },
    { id: 'abc', kopf: s.abc, ausrichtung: 'mitte', breite: 48 },
    ...(wahl.schaetzpreis ? preisgruppe('schaetzpreis', s.schaetzpreis, wahl) : []),
    ...anbieter.flatMap((a) => preisgruppe(a.zustand.angebot.id, a.name, wahl)),
    ...(wahl.virtuell ? VIRTUELL.flatMap((v) => preisgruppe(v, s[v], wahl)) : []),
  ];
}

// --- Zellen -------------------------------------------------------------------------------------------------------

const ep = (e: Einheitspreis | null): string => (e === null ? '' : formatiereEinheitspreisDe(e));
const betrag = (b: Betrag | null | undefined): string =>
  b === null || b === undefined ? '' : formatiereBetragDe(b);
const prozent = (p: Prozent): string => `${formatiereProzentDe(p)} %`;

/** Anzeige des EP-Felds: an einer Zuschlagsposition der Satz (ohne Satz der EP der Altform). */
function epText(zeile: Preisspiegelzeile, e: Einheitspreis | null, satz: Prozent | null | undefined): string {
  if (zeile.zuschlagsposition && satz !== null && satz !== undefined) return prozent(satz);
  return ep(e);
}

/** Kennzeichen eines Bieterpreises in Anzeigereihenfolge: Zustand, Ausreißer, Min/Max, Hinweis. */
function bieterKennzeichen(zeile: Preisspiegelzeile, b: Bieterpreis): string[] {
  const k: string[] = [];
  if (b.kennzeichen !== 'angeboten') k.push(b.kennzeichen);
  if (b.ausreisser !== null) k.push(b.ausreisser);
  const istMin = zeile.min.angebotIds.includes(b.angebotId);
  const istMax = zeile.max.angebotIds.includes(b.angebotId);
  // Sind Min und Max derselbe Wert, sagt keins von beiden etwas.
  if (istMin && !istMax) k.push('min');
  if (istMax && !istMin) k.push('max');
  if (b.zuschlag?.basisUnvollstaendig === true) k.push('hinweis');
  return k;
}

function zelle(text: string, kennzeichen: readonly string[] = [], tooltip?: string): VergleichsZelle {
  return {
    text,
    ...(kennzeichen.length > 0 ? { kennzeichen } : {}),
    ...(tooltip === undefined ? {} : { tooltip }),
  };
}

function preiszellen(
  wer: string,
  wahl: Spaltenwahl,
  zuschlag: boolean,
  epFeld: string,
  gpFeld: string,
  kennzeichen: readonly string[],
  tooltip: string | undefined,
): Record<string, VergleichsZelle> {
  const an = kennzeichenspalte(wahl, zuschlag);
  const aus: Record<string, VergleichsZelle> = {};
  if (wahl.ep) aus[spaltenId(wer, 'ep')] = an === 'ep' ? zelle(epFeld, kennzeichen, tooltip) : zelle(epFeld);
  if (wahl.gp) aus[spaltenId(wer, 'gp')] = an === 'gp' ? zelle(gpFeld, kennzeichen, tooltip) : zelle(gpFeld);
  return aus;
}

function mittelText(zeile: Preisspiegelzeile): string {
  return zeile.zuschlagsposition ? betrag(zeile.mittel.gesamtpreis) : ep(zeile.mittel.einheitspreis);
}

function positionszellen(
  knoten: Knoten & { art: 'position' },
  zeile: Preisspiegelzeile,
  wahl: Spaltenwahl,
): Record<string, VergleichsZelle> {
  const z = zeile.zuschlagsposition;
  const zellen: Record<string, VergleichsZelle> = {
    oz: zelle(ozText(knoten)),
    kurztext: zelle(knoten.kurztext, zeile.gehtInSummeEin ? [] : ['nicht-in-summe']),
    menge: zelle(knoten.menge === null ? '' : formatiereMengeDe(knoten.menge)),
    einheit: zelle(knoten.einheit ?? ''),
    abc:
      zeile.abcKlasse === null
        ? zelle('')
        : zelle(zeile.abcKlasse, [], texte.kennzeichen.abc(zeile.abcKlasse)),
  };
  if (wahl.schaetzpreis) {
    const s = zeile.schaetzpreis;
    const tip =
      s.zuschlag === null
        ? undefined
        : s.zuschlag.satz === null
          ? texte.tooltip.keinSatz
          : texte.tooltip.satz(formatiereProzentDe(s.zuschlag.satz), formatiereBetragDe(s.zuschlag.basis));
    Object.assign(
      zellen,
      preiszellen(
        'schaetzpreis',
        wahl,
        z,
        epText(zeile, s.einheitspreis, s.zuschlag?.satz),
        betrag(s.gesamtpreis),
        [],
        tip,
      ),
    );
  }
  for (const b of zeile.bieter) {
    const kennzeichen = bieterKennzeichen(zeile, b);
    const tip =
      b.ausreisser !== null
        ? texte.tooltip.mittel(mittelText(zeile))
        : b.zuschlag !== null && b.zuschlag.satz !== null
          ? texte.tooltip.satz(formatiereProzentDe(b.zuschlag.satz), formatiereBetragDe(b.zuschlag.basis))
          : undefined;
    Object.assign(
      zellen,
      preiszellen(
        b.angebotId,
        wahl,
        z,
        epText(zeile, b.einheitspreis, b.zuschlag?.satz),
        betrag(b.gesamtpreis),
        kennzeichen,
        tip,
      ),
    );
  }
  if (wahl.virtuell) {
    for (const v of VIRTUELL) {
      const p: VirtuellerPreis = zeile[v];
      Object.assign(
        zellen,
        preiszellen(v, wahl, z, ep(p.einheitspreis), betrag(p.gesamtpreis), [], undefined),
      );
    }
  }
  return zellen;
}

// --- Zeilen und Summen --------------------------------------------------------------------------------------------

/** Zellen einer Gliederung (Los, Titel): OZ, Kurztext und die Gliederungssumme je Bieter. */
function gliederungszellen(
  k: Exclude<Knoten, { art: 'hinweis' | 'position' }>,
  e: AnsichtEingang,
): Record<string, VergleichsZelle> {
  const zellen: Record<string, VergleichsZelle> = {
    oz: zelle(ozText(k)),
    kurztext: zelle(k.kurztext),
  };
  const spalte = wertspalte(e.wahl);
  for (const s of e.preisspiegel.gliederungen.find((g) => g.gliederungId === k.id)?.summen ?? [])
    zellen[spaltenId(s.angebotId, spalte)] = zelle(betrag(s.summe));
  return zellen;
}

function zeilenBauen(e: AnsichtEingang): VergleichsZeile[] {
  const lv = e.lv.leistungsverzeichnis;
  const kinder = kinderJeEltern(lv.knoten);
  const preiszeile = new Map(e.preisspiegel.zeilen.map((z) => [z.positionId as string, z]));
  const zeilen: VergleichsZeile[] = [];
  const besuche = (elternId: string, tiefe: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      if (k.art === 'hinweis') continue;
      const unter = (kinder.get(k.id) ?? []).filter((x) => x.art !== 'hinweis');
      const hatUnterknoten = unter.length > 0;
      const aufgeklappt = hatUnterknoten && !e.zugeklappt.has(k.id);
      if (k.art === 'position') {
        const z = preiszeile.get(k.id);
        if (z === undefined) continue;
        zeilen.push({
          id: k.id,
          art: 'position',
          tiefe,
          hatUnterknoten,
          aufgeklappt,
          zellen: positionszellen(k, z, e.wahl),
        });
      } else {
        zeilen.push({
          id: k.id,
          art: 'gliederung',
          tiefe,
          hatUnterknoten,
          aufgeklappt,
          zellen: gliederungszellen(k, e),
        });
      }
      if (aufgeklappt) besuche(k.id, tiefe + 1);
    }
  };
  besuche(lv.id, 0);
  return zeilen;
}

/** Kennungen der Summenzeilen; eindeutig gegenüber den Knotenkennungen (UUIDv7). */
export const SUMMENZEILEN = [
  'netto',
  'nachlass',
  'nettoNachNachlass',
  'mwst',
  'brutto',
  'bedarf',
  'wahl',
  'rang',
] as const;
export type Summenzeile = (typeof SUMMENZEILEN)[number];
export const summenzeilenId = (s: Summenzeile): string => `summe:${s}`;

function summenBauen(e: AnsichtEingang): VergleichsSummenzeile[] {
  const spalte = wertspalte(e.wahl);
  const ps = e.preisspiegel;
  return SUMMENZEILEN.map((s) => {
    const zellen: Record<string, VergleichsZelle> = { kurztext: zelle(texte.summen[s]) };
    for (const b of ps.bietersummen) {
      const g = b.gesamt;
      const text =
        s === 'rang'
          ? String(b.rang)
          : s === 'bedarf'
            ? betrag(g.summeBedarfOhneGesamtbetrag)
            : s === 'wahl'
              ? betrag(g.summeWahl)
              : betrag(g[s]);
      zellen[spaltenId(b.angebotId, spalte)] = zelle(text);
    }
    if (s === 'netto') {
      if (e.wahl.schaetzpreis)
        zellen[spaltenId('schaetzpreis', spalte)] = zelle(
          betrag(ps.virtuelleSummen.schaetzpreis),
          [],
          texte.summen.virtuellNetto,
        );
      if (e.wahl.virtuell)
        for (const v of VIRTUELL)
          zellen[spaltenId(v, spalte)] = zelle(betrag(ps.virtuelleSummen[v]), [], texte.summen.virtuellNetto);
    }
    return { id: summenzeilenId(s), zellen };
  });
}

const KENNZEICHEN_TEXTE: Readonly<Record<string, KennzeichenText>> = {
  'zuschlagssatz-fehlt': texte.kennzeichen.zuschlagssatzFehlt,
  'nicht-in-summe': texte.kennzeichen.nichtInSumme,
  hinweis: { symbol: '!', beschreibung: texte.kennzeichen.basisUnvollstaendig },
};

export function preisspiegelAnsicht(e: AnsichtEingang): PreisspiegelAnsicht {
  return {
    spalten: spaltenBauen(e.anbieter, e.wahl),
    zeilen: zeilenBauen(e),
    summen: summenBauen(e),
    kennzeichenTexte: KENNZEICHEN_TEXTE,
  };
}

// --- Detailleiste ------------------------------------------------------------------------------------------------

/** Was die Detailleiste zur aktiven Zelle zeigt: Bieter, Position, Wert und die Kennzeichen in Worten (U8). */
export interface Zelldetail {
  /** Name des Bieters oder des virtuellen Bieters; `null` in einer Spalte ohne Bieter (OZ, Kurztext, ABC). */
  readonly bieter: string | null;
  /** OZ und Kurztext der Zeile, bei einer Summenzeile ihre Beschriftung. */
  readonly position: string;
  readonly wert: string;
  readonly erklaerungen: readonly string[];
}

function zeilenText(e: AnsichtEingang, zeilenId: string): { position: string; knoten: Knoten | undefined } {
  const summe = SUMMENZEILEN.find((s) => summenzeilenId(s) === zeilenId);
  if (summe !== undefined) return { position: texte.summen[summe], knoten: undefined };
  const k = e.lv.leistungsverzeichnis.knoten.find((x) => x.id === zeilenId);
  if (k === undefined || k.art === 'hinweis') return { position: '', knoten: k };
  return { position: [ozText(k), k.kurztext].filter((t) => t !== '').join(' '), knoten: k };
}

function bieterErklaerungen(e: AnsichtEingang, zeile: Preisspiegelzeile, b: Bieterpreis): string[] {
  const t = texte.detail;
  const schwelle = formatiereProzentDe(e.preisspiegel.einstellungen.ausreisserSchwelle);
  const aus: string[] = [];
  for (const k of bieterKennzeichen(zeile, b)) {
    if (k === 'hoch') aus.push(t.hoch(schwelle, mittelText(zeile)));
    else if (k === 'niedrig') aus.push(t.niedrig(schwelle, mittelText(zeile)));
    else if (k === 'nicht-angeboten') aus.push(t.nichtAngeboten);
    else if (k === 'nullpreis') aus.push(t.nullpreis);
    else if (k === 'zuschlagssatz-fehlt') aus.push(t.zuschlagssatzFehlt);
    else if (k === 'hinweis') aus.push(t.basisUnvollstaendig);
    else if (k === 'min') aus.push(t.min);
    else if (k === 'max') aus.push(t.max);
  }
  if (b.zuschlag !== null && b.zuschlag.satz !== null)
    aus.push(
      `${texte.tooltip.satz(formatiereProzentDe(b.zuschlag.satz), formatiereBetragDe(b.zuschlag.basis))}.`,
    );
  return aus;
}

/** Die aktive Zelle in Worten; nur Lesen aus dem Preisspiegel, keine Rechnung. */
export function zellDetail(e: AnsichtEingang, ort: VergleichsZellort): Zelldetail {
  const { position, knoten } = zeilenText(e, ort.zeilenId);
  const [wer = '', was = ''] = ort.spalte.split(':');
  const ps = e.preisspiegel;
  const anbieter = e.anbieter.find((a) => a.zustand.angebot.id === wer);
  const virtuell = (VIRTUELL as readonly string[]).includes(wer) || wer === 'schaetzpreis';
  const bieter = anbieter?.name ?? (virtuell ? texte.spalten[wer as Virtuell | 'schaetzpreis'] : null);
  const zeile = ps.zeilen.find((z) => z.positionId === ort.zeilenId);
  const erklaerungen: string[] = [];

  // Der Text der Zelle, so wie das Grid ihn zeigt.
  const summe = SUMMENZEILEN.find((s) => summenzeilenId(s) === ort.zeilenId);
  const zellen =
    summe !== undefined
      ? summenBauen(e).find((s) => s.id === ort.zeilenId)?.zellen
      : knoten?.art === 'position' && zeile !== undefined
        ? positionszellen(knoten, zeile, e.wahl)
        : knoten === undefined || knoten.art === 'hinweis' || knoten.art === 'position'
          ? undefined
          : gliederungszellen(knoten, e);
  const text = zellen?.[ort.spalte]?.text ?? '';
  const kopf = was === 'ep' ? texte.spalten.ep : was === 'gp' ? texte.spalten.gp : '';
  const wert =
    summe !== undefined
      ? text === ''
        ? ''
        : `${texte.summen[summe]} ${text}`
      : [kopf, text].filter((x) => x !== '').join(' ');

  if (zeile !== undefined && summe === undefined) {
    const b = zeile.bieter.find((x) => x.angebotId === wer);
    if (b !== undefined) erklaerungen.push(...bieterErklaerungen(e, zeile, b));
    else if (virtuell && bieter !== null) erklaerungen.push(texte.detail.virtuell(bieter));
    if (zeile.abcKlasse !== null && (ort.spalte === 'abc' || bieter === null))
      erklaerungen.push(
        texte.detail.abc(
          zeile.abcKlasse,
          ps.einstellungen.abcBezug === 'mittel'
            ? texte.einstellungen.bezugMittel
            : texte.einstellungen.bezugSchaetzpreis,
        ),
      );
    if (!zeile.gehtInSummeEin) erklaerungen.push(texte.detail.nichtInSumme);
  } else if (virtuell && bieter !== null && summe === undefined)
    erklaerungen.push(texte.detail.virtuell(bieter));
  return { bieter, position, wert, erklaerungen };
}

export type { VergleichsZellort, Virtuell };
