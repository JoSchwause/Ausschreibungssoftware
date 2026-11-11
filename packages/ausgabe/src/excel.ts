// SPDX-License-Identifier: AGPL-3.0-or-later
// Excel-Rundlauf für Bieter (G-14, Ticket 61): „LV für Bieter“ als .xlsx schreiben und den Rücklauf als
// Angebotspositionen lesen. Reine Funktionen, Bytes rein, Bytes raus (A2). Zahlen gehen als Dezimaltext in die Datei
// und kommen über `@tethys/dezimal` zurück (N1, N4); was sich nicht eindeutig lesen lässt, wird ein Befund und nie
// still gerundet oder verworfen (Q5).

import { leseAustausch, parseDe } from '@tethys/dezimal';
import type {
  Angebotsposition,
  Befundort,
  Befundschwere,
  Einheitspreis,
  Knoten,
  KnotenId,
  Leistungsverzeichnis,
  LvZustand,
  Position,
  Prozent,
} from '@tethys/vertrag';
import { bloeckeAlsText } from './langtext';
import { baueAusgabemodell } from './modell';
import { sha256Hex } from './pruefsumme';
import { STIL, excelZahl, leseXlsx, schreibeXlsx, spaltenname } from './xlsx';
import type { Blatt, GeleseneZelle, Zelle } from './xlsx';

// --- Befunde -----------------------------------------------------------------------------------------------------

export type ExcelBefundcode =
  /** Export: Ein Text ist länger, als eine Excel-Zelle fasst (32.767 Zeichen); er steht gekürzt in der Datei. */
  | 'text-gekuerzt'
  /** Export: Eine Zahl hat mehr als 15 geltende Ziffern; Excel zeigt und rechnet sie nur gerundet. */
  | 'zahl-zu-genau'
  /** Rücklauf: keine lesbare .xlsx-Datei. */
  | 'datei-unlesbar'
  /** Rücklauf: Kopfzeile oder Spaltenüberschriften des Blanketts fehlen. */
  | 'kopf-fehlt'
  /** Rücklauf: Die Datei gehört zu einem anderen LV; es wird nichts übernommen. */
  | 'falsches-lv'
  /** Rücklauf: Die Prüfsumme der LV-Struktur weicht ab (Knoten, OZ, Menge oder Einheit geändert). */
  | 'struktur-geaendert'
  /** Rücklauf: Eine Zeile mit Preis trägt keine Positions-ID. */
  | 'positions-id-fehlt'
  /** Rücklauf: Die Positions-ID gibt es im LV nicht. */
  | 'positions-id-unbekannt'
  /** Rücklauf: Dieselbe Positions-ID steht in mehreren Zeilen; nur die erste zählt. */
  | 'positions-id-doppelt'
  /** Rücklauf: Eine Position des LV fehlt in der Datei; für sie entsteht keine Angebotsposition. */
  | 'position-fehlt'
  /** Rücklauf: Preis oder Satz an einer Gliederung (Los, Titel) oder einem Hinweistext. */
  | 'preis-an-gliederung'
  /** Rücklauf: Zuschlagssatz an einer Position, die keine Zuschlagsposition ist; der Satz wird nicht übernommen. */
  | 'satz-ohne-zuschlagsposition'
  /** Rücklauf: In einer Zahlzelle steht etwas, das keine Zahl ist. */
  | 'text-in-zahlzelle'
  /** Rücklauf: Eine Formel in einer Zahlzelle hat kein gespeichertes Ergebnis (Datei wurde nie berechnet). */
  | 'formel-ohne-ergebnis'
  /** Rücklauf: mehr Nachkommastellen als EP (3) bzw. Satz (2) fassen; es wird nicht gerundet. */
  | 'zu-viele-nachkommastellen';

/** Befund des Excel-Rundlaufs, gebaut wie ein `Pruefbefund`, mit eigener Quelle. Sperrt nichts (U5). */
export interface ExcelBefund {
  readonly schwere: Befundschwere;
  readonly quelle: 'excel';
  readonly code: ExcelBefundcode;
  readonly meldung: string;
  /** `zeile` und `spalte` (1-basiert) in der Tabelle, `knotenId` im LV, `feld`: `einheitspreis` oder `zuschlagssatz`. */
  readonly ort: Befundort;
}

// --- Blattaufbau -------------------------------------------------------------------------------------------------

const SPALTEN = [
  { kopf: 'OZ', breite: 12 },
  { kopf: 'Kurztext', breite: 48 },
  { kopf: 'Merkmale', breite: 28 },
  { kopf: 'Menge', breite: 12 },
  { kopf: 'Einheit', breite: 8 },
  { kopf: 'EP', breite: 13 },
  { kopf: 'GP', breite: 14 },
  { kopf: 'Zuschlagssatz in %', breite: 12 },
  { kopf: 'Positions-ID', breite: 38, versteckt: true },
] as const;

const SP = { oz: 0, kurztext: 1, merkmale: 2, menge: 3, einheit: 4, ep: 5, gp: 6, satz: 7, id: 8 } as const;
const KOPF_LV_ID = 'LV-ID';
const KOPF_PRUEFSUMME = 'Prüfsumme';
const ERSTE_DATENZEILE = 4;
const MAX_TEXT = 32767;

export interface ExcelOptionen {
  /** Vorgabe `false` (Blankett für Bieter). `true`: Schätzpreise und Sätze des LV als Werte (für den Ausschreibenden). */
  readonly mitPreisen?: boolean;
  /** Datum der Datei (`JJJJ-MM-TT`, ab 1980) für Dokumenteigenschaften und ZIP; Vorgabe `1980-01-01`. */
  readonly datum?: string;
}

export interface ExcelDatei {
  readonly bytes: Uint8Array;
  readonly befunde: readonly ExcelBefund[];
}

/** Knoten in Dokumentreihenfolge (Tiefensuche nach `reihenfolge`). */
function dokumentreihenfolge(lv: Leistungsverzeichnis): Knoten[] {
  const kinder = new Map<string, Knoten[]>();
  for (const k of lv.knoten) {
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
  }
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  const folge: Knoten[] = [];
  const besuche = (id: string): void => {
    for (const k of kinder.get(id) ?? []) {
      folge.push(k);
      besuche(k.id);
    }
  };
  besuche(lv.id);
  return folge;
}

/**
 * Prüfsumme der Struktur: Knoten in Dokumentreihenfolge mit Art, Kennung, Eltern, OZ, Menge, Einheit und ob die
 * Position eine Zuschlagsposition ist. Texte und Preise zählen nicht (der Bieter darf sie sehen, sie ändern die
 * Zuordnung nicht).
 */
export function strukturPruefsumme(lv: Leistungsverzeichnis): string {
  const zeilen = dokumentreihenfolge(lv).map((k) => {
    const teile: string[] = [k.art, k.id, k.elternId];
    if (k.art === 'position')
      teile.push(
        k.ordnungszahl ?? '',
        k.ozIndex ?? '',
        k.menge ?? '',
        k.einheit ?? '',
        k.zuschlag ? 'z' : '',
      );
    else if (k.art !== 'hinweis') teile.push(k.ordnungszahl ?? '');
    return teile.join('|');
  });
  return sha256Hex(`tethys-excel-1\n${lv.id}\n${zeilen.join('\n')}`);
}

/** Geltende Ziffern eines Dezimaltexts (ohne Vorzeichen, führende und Nachkommanullen). */
function geltendeZiffern(dezimal: string): number {
  const z = dezimal.replace('-', '').replace('.', '').replace(/^0+/, '');
  return (dezimal.includes('.') ? z.replace(/0+$/, '') : z).length;
}

/** LV als .xlsx: eine Zeile je Knoten in Dokumentreihenfolge; nur EP und Zuschlagssatz sind eingebbar. */
export function lvAlsExcel(zustand: LvZustand, optionen: ExcelOptionen = {}): ExcelDatei {
  const mitPreisen = optionen.mitPreisen ?? false;
  const lv = zustand.leistungsverzeichnis;
  const modell = baueAusgabemodell(zustand, { mitPreisen });
  const positionen = new Map(lv.knoten.filter((k) => k.art === 'position').map((p) => [p.id as string, p]));
  const gp = new Map(zustand.summen.positionen.map((s) => [s.positionId as string, s.gesamtpreis]));
  const befunde: ExcelBefund[] = [];

  const text = (t: string, stil: Zelle['stil'] = STIL.text, knotenId?: KnotenId): Zelle => {
    if (t.length > MAX_TEXT)
      befunde.push({
        schwere: 'warnung',
        quelle: 'excel',
        code: 'text-gekuerzt',
        meldung: `Ein Text mit ${String(t.length)} Zeichen ist auf ${String(MAX_TEXT)} Zeichen gekürzt (Grenze einer Excel-Zelle).`,
        ort: knotenId === undefined ? {} : { knotenId },
      });
    return { wert: { art: 'text', text: t.slice(0, MAX_TEXT) }, stil };
  };
  const zahl = (dezimal: string, stil: Zelle['stil'], knotenId: KnotenId, feld: string): Zelle => {
    if (geltendeZiffern(dezimal) > 15)
      befunde.push({
        schwere: 'warnung',
        quelle: 'excel',
        code: 'zahl-zu-genau',
        meldung: `${dezimal} hat mehr als 15 geltende Ziffern; Excel zeigt und rechnet die Zahl nur gerundet.`,
        ort: { knotenId, feld },
      });
    return { wert: { art: 'zahl', dezimal }, stil };
  };

  const zeilen: (Zelle | null)[][] = [
    [text('Leistungsverzeichnis', STIL.titel), text(lv.name, STIL.titel)],
    [
      text(KOPF_LV_ID, STIL.titel),
      text(lv.id),
      text(KOPF_PRUEFSUMME, STIL.titel),
      text(strukturPruefsumme(lv)),
    ],
    SPALTEN.map((s) => text(s.kopf, STIL.kopf)),
  ];

  for (const z of modell.zeilen) {
    const r = String(zeilen.length + 1);
    const zeile: (Zelle | null)[] = Array.from({ length: SPALTEN.length }, () => null);
    switch (z.art) {
      case 'titel':
        zeile[SP.oz] = text(z.ordnungszahl, STIL.titel);
        zeile[SP.kurztext] = text(z.kurztext, STIL.titel, z.knotenId);
        zeile[SP.id] = text(z.knotenId);
        break;
      case 'hinweis':
        zeile[SP.kurztext] = text(bloeckeAlsText(z.text), STIL.textUmbruch, z.knotenId);
        zeile[SP.id] = text(z.knotenId);
        break;
      case 'position': {
        const p = positionen.get(z.knotenId) as Position;
        const merkmale = [...z.merkmale];
        if (z.zuschlag) merkmale.push(`Zuschlagsposition ${z.zuschlag.bezug}`);
        zeile[SP.oz] = text(z.ordnungszahl);
        zeile[SP.kurztext] = text(z.kurztext, STIL.text, p.id);
        zeile[SP.merkmale] = text(merkmale.join('; '), STIL.text, p.id);
        if (p.menge !== null) zeile[SP.menge] = zahl(p.menge, STIL.menge, p.id, 'menge');
        zeile[SP.einheit] = text(p.einheit ?? '');
        if (p.zuschlag === null) {
          const ep = mitPreisen ? p.einheitspreis : null;
          zeile[SP.ep] =
            ep === null
              ? { wert: null, stil: STIL.eingabePreis }
              : zahl(ep, STIL.eingabePreis, p.id, 'einheitspreis');
          zeile[SP.gp] = {
            wert: { art: 'formel', formel: `IF(F${r}="","",ROUND(D${r}*F${r},2))` },
            stil: STIL.betrag,
          };
        } else {
          const satz = mitPreisen ? p.zuschlag.prozentsatz : null;
          zeile[SP.satz] =
            satz === null
              ? { wert: null, stil: STIL.eingabeSatz }
              : zahl(satz, STIL.eingabeSatz, p.id, 'zuschlagssatz');
          const betrag = mitPreisen ? (gp.get(p.id) ?? null) : null;
          if (betrag !== null) zeile[SP.gp] = zahl(betrag, STIL.betrag, p.id, 'gesamtpreis');
        }
        zeile[SP.id] = text(p.id);
        break;
      }
      case 'titelsumme':
        continue;
    }
    zeilen.push(zeile);
  }

  const blatt: Blatt = {
    name: 'LV',
    spalten: SPALTEN.map((s) => ({ breite: s.breite, versteckt: 'versteckt' in s ? s.versteckt : false })),
    zeilen,
    fixierteZeilen: ERSTE_DATENZEILE - 1,
    geschuetzt: true,
  };
  const bytes = schreibeXlsx(blatt, { titel: lv.name, datum: optionen.datum ?? '1980-01-01' });
  return { bytes, befunde };
}

// --- Rücklauf ----------------------------------------------------------------------------------------------------

export interface ExcelRuecklauf {
  /** Angebotspositionen in Dokumentreihenfolge des LV; Positionen mit Befund in ihrer Zeile fehlen. */
  readonly positionen: readonly Angebotsposition[];
  /** Die Datei trägt keinen Nachlass; er wird beim Anlegen des Angebots erfasst. */
  readonly nachlass: null;
  readonly befunde: readonly ExcelBefund[];
}

type Zahlzelle<T> =
  | { readonly art: 'leer' }
  | { readonly art: 'wert'; readonly wert: T }
  | {
      readonly art: 'befund';
      readonly code: 'text-in-zahlzelle' | 'zu-viele-nachkommastellen' | 'formel-ohne-ergebnis';
      readonly inhalt: string;
    };

const zelltext = (z: GeleseneZelle | undefined): string =>
  z === undefined ? '' : z.wert.art === 'leer' ? '' : z.wert.text.trim();

/** Liest eine EP- oder Satzzelle. Zahlzellen kommen als Gleitkommatext, Textzellen in de-DE-Schreibweise. */
function zahlzelle<A extends 'einheitspreis' | 'prozent'>(
  z: GeleseneZelle | undefined,
  art: A,
): Zahlzelle<A extends 'einheitspreis' ? Einheitspreis : Prozent> {
  type W = A extends 'einheitspreis' ? Einheitspreis : Prozent;
  if (z === undefined) return { art: 'leer' };
  if (z.wert.art === 'leer') return { art: 'befund', code: 'formel-ohne-ergebnis', inhalt: '' };
  const w = z.wert;
  if (w.art === 'zahl') {
    const dezimal = excelZahl(w.text);
    if (dezimal === null) return { art: 'befund', code: 'text-in-zahlzelle', inhalt: w.text };
    const e = leseAustausch(art, dezimal);
    if (!e.ok) return { art: 'befund', code: 'text-in-zahlzelle', inhalt: w.text };
    if (e.hinweise.some((h) => h.code === 'gerundet'))
      return { art: 'befund', code: 'zu-viele-nachkommastellen', inhalt: dezimal };
    return { art: 'wert', wert: e.wert as W };
  }
  if (w.art !== 'text') return { art: 'befund', code: 'text-in-zahlzelle', inhalt: w.text };
  const roh = art === 'prozent' ? w.text.trim().replace(/\s*%$/, '') : w.text.trim();
  if (roh === '') return { art: 'leer' };
  const e = parseDe(art, roh);
  if (e.ok) return { art: 'wert', wert: e.wert as W };
  return {
    art: 'befund',
    code: e.fehler.code === 'zu-viele-nachkommastellen' ? 'zu-viele-nachkommastellen' : 'text-in-zahlzelle',
    inhalt: w.text,
  };
}

const NULL_EP = '0.000' as Einheitspreis;

/** Liest den Rücklauf eines Bieters zu diesem LV. Nichts wird still verworfen: Jede Abweichung ist ein Befund. */
export function excelRuecklaufLesen(bytes: Uint8Array, zustand: LvZustand): ExcelRuecklauf {
  const lv = zustand.leistungsverzeichnis;
  const befunde: ExcelBefund[] = [];
  const befund = (
    schwere: Befundschwere,
    code: ExcelBefundcode,
    meldung: string,
    ort: Befundort = {},
  ): void => void befunde.push({ schwere, quelle: 'excel', code, meldung, ort });
  const ergebnis = (positionen: readonly Angebotsposition[]): ExcelRuecklauf => ({
    positionen,
    nachlass: null,
    befunde,
  });

  const lesung = leseXlsx(bytes);
  if (!lesung.ok) {
    befund('fehler', 'datei-unlesbar', lesung.meldung);
    return ergebnis([]);
  }
  const zeilennummern = [...lesung.zeilen.keys()].sort((a, b) => a - b);

  // Kopfangaben: Bezeichnung in einer Zelle, Wert in der Zelle rechts daneben.
  let lvId: string | null = null;
  let pruefsumme: string | null = null;
  let kopfzeile: number | null = null;
  const spalte = new Map<string, number>();
  for (const n of zeilennummern) {
    const zellen = lesung.zeilen.get(n) ?? new Map<number, GeleseneZelle>();
    for (const [s, z] of zellen) {
      const t = zelltext(z);
      if (t === KOPF_LV_ID && lvId === null) lvId = zelltext(zellen.get(s + 1));
      if (t === KOPF_PRUEFSUMME && pruefsumme === null) pruefsumme = zelltext(zellen.get(s + 1));
    }
    const texte = [...zellen].map(([s, z]) => [zelltext(z), s] as const);
    if (texte.some(([t]) => t === SPALTEN[SP.id].kopf)) {
      kopfzeile = n;
      for (const [t, s] of texte) if (!spalte.has(t)) spalte.set(t, s);
      break;
    }
  }
  const spId = spalte.get(SPALTEN[SP.id].kopf);
  const spEp = spalte.get(SPALTEN[SP.ep].kopf);
  const spSatz = spalte.get(SPALTEN[SP.satz].kopf);
  if (kopfzeile === null || spId === undefined || spEp === undefined || spSatz === undefined) {
    befund(
      'fehler',
      'kopf-fehlt',
      'Die Spaltenüberschriften „EP“, „Zuschlagssatz in %“ und „Positions-ID“ fehlen; die Datei ist kein Blankett dieses Programms.',
    );
    return ergebnis([]);
  }
  if (lvId === null || lvId === '') {
    befund('fehler', 'kopf-fehlt', 'Die Kopfzeile mit der LV-ID fehlt.');
  } else if (lvId !== lv.id) {
    befund(
      'fehler',
      'falsches-lv',
      `Die Datei gehört zum LV ${lvId}, nicht zu diesem LV (${lv.id}); nichts übernommen.`,
    );
    return ergebnis([]);
  }
  if (pruefsumme !== strukturPruefsumme(lv))
    befund(
      'warnung',
      'struktur-geaendert',
      'Die Struktur des LV hat sich seit dem Export geändert (Prüfsumme weicht ab). Die Preise sind über die Positions-ID zugeordnet; Mengen und Positionen bitte prüfen.',
    );

  const knoten = new Map(lv.knoten.map((k) => [k.id as string, k]));
  const gelesen = new Map<string, Angebotsposition | null>();
  for (const n of zeilennummern) {
    if (n <= kopfzeile) continue;
    const zellen = lesung.zeilen.get(n) ?? new Map<number, GeleseneZelle>();
    const id = zelltext(zellen.get(spId));
    const epZelle = zellen.get(spEp);
    const satzZelle = zellen.get(spSatz);
    const ep = zahlzelle(epZelle, 'einheitspreis');
    const satz = zahlzelle(satzZelle, 'prozent');
    const hatEingabe = ep.art !== 'leer' || satz.art !== 'leer';
    const ort = (s: number, k?: Knoten, feld?: string): Befundort => ({
      zeile: n,
      spalte: s + 1,
      ...(k ? { knotenId: k.id } : {}),
      ...(feld ? { feld } : {}),
    });
    const zelle = (s: number): string => `${spaltenname(s)}${String(n)}`;

    if (id === '') {
      if (hatEingabe)
        befund(
          'fehler',
          'positions-id-fehlt',
          `Zeile ${String(n)} trägt einen Preis, aber keine Positions-ID.`,
          ort(spId),
        );
      continue;
    }
    const k = knoten.get(id);
    if (k === undefined) {
      befund(
        hatEingabe ? 'fehler' : 'warnung',
        'positions-id-unbekannt',
        `Die Positions-ID ${id} in Zeile ${String(n)} gibt es in diesem LV nicht.`,
        ort(spId),
      );
      continue;
    }
    if (k.art !== 'position') {
      if (hatEingabe)
        befund(
          'fehler',
          'preis-an-gliederung',
          `Zeile ${String(n)} ist keine Position (${k.art === 'hinweis' ? 'Hinweistext' : 'Gliederung'}), trägt aber einen Preis oder Satz.`,
          ort(ep.art !== 'leer' ? spEp : spSatz, k),
        );
      continue;
    }
    if (gelesen.has(k.id)) {
      befund(
        'fehler',
        'positions-id-doppelt',
        `Die Position ${k.ordnungszahl ?? id} steht mehrfach in der Datei; Zeile ${String(n)} wird nicht übernommen.`,
        ort(spId, k),
      );
      continue;
    }
    let lesbar = true;
    for (const [z, s, feld] of [
      [ep, spEp, 'einheitspreis'],
      [satz, spSatz, 'zuschlagssatz'],
    ] as const) {
      if (z.art !== 'befund') continue;
      lesbar = false;
      befund(
        'fehler',
        z.code,
        z.code === 'text-in-zahlzelle'
          ? `${zelle(s)}: „${z.inhalt}“ ist keine Zahl.`
          : z.code === 'formel-ohne-ergebnis'
            ? `${zelle(s)}: Die Formel hat kein gespeichertes Ergebnis (Datei in Excel oder LibreOffice neu berechnen und speichern).`
            : `${zelle(s)}: ${z.inhalt} hat mehr Nachkommastellen als erlaubt (${feld === 'einheitspreis' ? '3' : '2'}); es wird nicht gerundet.`,
        ort(s, k, feld),
      );
    }
    if (satz.art === 'wert' && k.zuschlag === null) {
      befund(
        'fehler',
        'satz-ohne-zuschlagsposition',
        `${zelle(spSatz)}: Die Position ${k.ordnungszahl ?? id} ist keine Zuschlagsposition; der Satz wird nicht übernommen.`,
        ort(spSatz, k, 'zuschlagssatz'),
      );
    }
    if (!lesbar) {
      gelesen.set(k.id, null);
      continue;
    }
    const positionId = k.id;
    const epWert = ep.art === 'wert' ? ep.wert : null;
    const satzWert = satz.art === 'wert' && k.zuschlag !== null ? satz.wert : null;
    gelesen.set(
      k.id,
      satzWert !== null
        ? {
            positionId,
            status: 'angeboten',
            einheitspreis: epWert ?? NULL_EP,
            epa: null,
            zuschlagssatz: satzWert,
          }
        : epWert !== null
          ? { positionId, status: 'angeboten', einheitspreis: epWert, epa: null }
          : { positionId, status: 'nicht-angeboten' },
    );
  }

  const positionen: Angebotsposition[] = [];
  for (const k of dokumentreihenfolge(lv)) {
    if (k.art !== 'position') continue;
    const p = gelesen.get(k.id);
    if (p === undefined)
      befund(
        'warnung',
        'position-fehlt',
        `Die Position ${k.ordnungszahl ?? k.id} fehlt in der Datei; für sie entsteht keine Angebotsposition.`,
        { knotenId: k.id },
      );
    else if (p !== null) positionen.push(p);
  }
  return ergebnis(positionen);
}
