// SPDX-License-Identifier: AGPL-3.0-or-later
// Terminrechnung des Bauzeitenplans (Ticket 102 Punkt 3 und 4, D-57): Vorwärts- und Rückwärtsrechnung (Methode des
// kritischen Wegs) in Arbeitstagen des Arbeitskalenders, Gesamtpuffer und freier Puffer, kritische Wege. Die Lesarten
// stehen in `BAUZEIT_ANNAHMEN`. Eigene Eingabetypen bis zur Umstellung auf die Vertragstypen (Tickets 97, 109). Rein (A2),
// keine Uhr, kein Zufall. Auffälliges ist ein Befund, nie eine Sperre (U5).
//
// Rechenmodell: Index k = k-ter Arbeitstag ab dem Projektbeginn (k = 0 ist der erste). Ein Vorgang hat den Anfang `a`
// (Index seines ersten Tages) und das Ende `e = a + dauer` (Index nach seinem letzten Tag, also der Zeitpunkt, an dem er
// fertig ist); angezeigt wird als Ende der Tag `e − 1`, beim Meilenstein der Tag `a`.

import type { Prozent } from '@tethys/vertrag';
import { KRITISCHE_WEGE_HOECHSTENS } from './annahmen';
import type { Datum, Tagnummer } from './datum';
import { LETZTER_TAG, datumAusTagnummer, tagnummerLesen } from './datum';
import type { Arbeitskalender } from './kalender';
import { Tageskalender } from './kalender';

// --- Schnittstelle ---------------------------------------------------------------------------------------------

/** Kennung eines Vorgangs, eindeutig im Plan (A7; die Vertragstypen bringt Ticket 97). */
export type VorgangId = string;

export type Beziehungsart = 'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende';

/** Abhängigkeit vom Vorgänger (Glossar „Anordnungsbeziehung“). */
export interface Anordnungsbeziehung {
  readonly vorgaengerId: VorgangId;
  readonly art: Beziehungsart;
  /** Ganze Arbeitstage, auch 0 oder negativ (Überlappung). */
  readonly abstand: number;
}

/** Ist-Termine von Hand (ungeprüfte Daten `JJJJ-MM-TT`); sie verschieben nichts (v1). */
export interface Isttermine {
  readonly beginn: string | null;
  readonly ende: string | null;
  /** Fortschritt in Prozent, `0.00` bis `100.00` (N1). */
  readonly fortschritt: Prozent;
}

/** Eingabe eines Vorgangs, ungeprüft (Glossar „Vorgang“). */
export interface Vorgang {
  readonly id: VorgangId;
  readonly nummer?: string;
  readonly bezeichnung: string;
  /** Sammelvorgang, unter dem der Vorgang steht; `null` = oberste Ebene. */
  readonly elternId: VorgangId | null;
  /** Ganze Arbeitstage ≥ 0; 0 = Meilenstein; am Sammelvorgang ohne Bedeutung. */
  readonly dauer: number;
  readonly vorgaenger: readonly Anordnungsbeziehung[];
  /** Terminvorgabe „Beginn frühestens“ (`JJJJ-MM-TT`) oder keine. */
  readonly fruehesterBeginn: string | null;
  readonly ist: Isttermine | null;
}

export interface Bauzeitenplaneingabe {
  /** Projektbeginn `JJJJ-MM-TT`, ungeprüft. */
  readonly projektbeginn: string;
  readonly kalender: Arbeitskalender;
  readonly vorgaenge: readonly Vorgang[];
}

export type Vorgangsart = 'vorgang' | 'sammelvorgang' | 'meilenstein';

/** Gerechnete Termine eines Vorgangs (nie gespeichert, D-57). */
export interface Vorgangstermine {
  /** Frühe Lage aus der Vorwärtsrechnung: die Termine des Plans. Ende einschließlich. */
  readonly beginn: Datum;
  readonly ende: Datum;
  /** Späte Lage aus der Rückwärtsrechnung vom Projektende. */
  readonly spaetesterBeginn: Datum;
  readonly spaetestesEnde: Datum;
  /** Arbeitstage; nie negativ, solange es nur Terminvorgaben „Beginn frühestens“ gibt. */
  readonly gesamtpuffer: number;
  readonly freierPuffer: number;
  /** Gesamtpuffer ≤ 0. */
  readonly kritisch: boolean;
}

export interface Vorgangsergebnis {
  readonly id: VorgangId;
  readonly art: Vorgangsart;
  /** `null`: nicht gerechnet (Befund nennt den Grund). */
  readonly termine: Vorgangstermine | null;
}

export type Bauzeitbefundcode =
  | 'projektbeginn-ungueltig' // nichts wird gerechnet
  | 'kalender-ohne-arbeitstage' // nichts wird gerechnet
  | 'arbeitstag-ungueltig' // kein Wochentag 1–7; übergangen
  | 'bundesland-unbekannt' // nur die bundesweiten Feiertage
  | 'freier-tag-ungueltig' // übergangen
  | 'id-doppelt' // der spätere Vorgang wird nicht gerechnet
  | 'eltern-unbekannt' // der Vorgang steht auf der obersten Ebene
  | 'eltern-zyklus' // die Beteiligten stehen auf der obersten Ebene
  | 'dauer-ungueltig' // keine ganze Zahl von 0 bis HOECHSTWERT_ARBEITSTAGE; ohne Termine
  | 'terminvorgabe-ungueltig' // übergangen
  | 'terminvorgabe-an-sammelvorgang' // übergangen (v1)
  | 'ist-ungueltig' // nur gemeldet; Ist-Termine verschieben nichts
  | 'vorgaenger-unbekannt' // Beziehung übergangen
  | 'beziehungsart-unbekannt' // Beziehung übergangen
  | 'abstand-ungueltig' // Beziehung übergangen
  | 'beziehung-an-sammelvorgang' // Beziehung übergangen (v1)
  | 'zyklus' // die Beteiligten bleiben ohne Termine
  | 'vorgaenger-ohne-termine' // Beziehung von einem Vorgang ohne Termine; übergangen
  | 'termin-ausserhalb-kalender' // nach 9999-12-31; ohne Termine
  | 'kritische-wege-gekuerzt'; // mehr als KRITISCHE_WEGE_HOECHSTENS Wege

export interface Bauzeitbefund {
  readonly code: Bauzeitbefundcode;
  /** Betroffener Vorgang; `null` bei Befunden über Plan, Kalender oder einen Zyklus. */
  readonly vorgangId: VorgangId | null;
  /** Bei Befunden über eine Anordnungsbeziehung ihr Vorgänger, sonst `null`. */
  readonly vorgaengerId: VorgangId | null;
  /** Bei `zyklus` und `eltern-zyklus` die Beteiligten in Eingabereihenfolge, sonst leer. */
  readonly beteiligte: readonly VorgangId[];
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

export interface Bauzeitenplanergebnis {
  /** Erster Arbeitstag ab dem eingegebenen Projektbeginn; `null`, wenn nicht gerechnet werden konnte. */
  readonly projektbeginn: Datum | null;
  /** Spätestes Ende der frühen Lage; `null` ohne gerechneten Vorgang. */
  readonly projektende: Datum | null;
  /** Je Eingabe ein Ergebnis, in Eingabereihenfolge. */
  readonly vorgaenge: readonly Vorgangsergebnis[];
  /** Die kritischen Wege als Folgen von Kennungen, in Eingabereihenfolge ihrer Vorgänge aufgezählt. */
  readonly kritischeWege: readonly (readonly VorgangId[])[];
  readonly befunde: readonly Bauzeitbefund[];
}

// --- Arbeitstage ------------------------------------------------------------------------------------------------

/** Index k ↔ Tagnummer des k-ten Arbeitstags ab einem Starttag; wächst bei Bedarf, höchstens bis 9999-12-31. */
class Arbeitstagefolge {
  private readonly tage: Tagnummer[] = [];
  private naechster: Tagnummer;

  constructor(
    private readonly kalender: Tageskalender,
    start: Tagnummer,
  ) {
    this.naechster = start;
  }

  /** Tagnummer des Arbeitstags mit Index k ≥ 0, `null` hinter dem letzten darstellbaren Tag. */
  tag(k: number): Tagnummer | null {
    while (this.tage.length <= k) if (!this.erweitern()) return null;
    return this.tage[k] ?? null;
  }

  /** Index des ersten Arbeitstags am oder nach `tag` (vor dem Start: 0); `null` hinter dem letzten Tag. */
  indexAb(tag: Tagnummer): number | null {
    for (;;) {
      const letzter = this.tage[this.tage.length - 1];
      if (letzter !== undefined && letzter >= tag) break;
      if (!this.erweitern()) return null;
    }
    let unten = 0;
    let oben = this.tage.length - 1;
    while (unten < oben) {
      const mitte = (unten + oben) >> 1;
      if ((this.tage[mitte] ?? 0) < tag) unten = mitte + 1;
      else oben = mitte;
    }
    return unten;
  }

  private erweitern(): boolean {
    while (this.naechster <= LETZTER_TAG) {
      const t = this.naechster++;
      if (this.kalender.istArbeitstag(t)) {
        this.tage.push(t);
        return true;
      }
    }
    return false;
  }
}

// --- Rechnen ----------------------------------------------------------------------------------------------------

interface Kante {
  readonly von: number;
  readonly nach: number;
  readonly art: Beziehungsart;
  readonly abstand: number;
}

const vomEnde = (art: Beziehungsart): boolean => art === 'ende-anfang' || art === 'ende-ende';
const zumEnde = (art: Beziehungsart): boolean => art === 'ende-ende' || art === 'anfang-ende';

function befund(
  code: Bauzeitbefundcode,
  meldung: string,
  vorgangId: VorgangId | null = null,
  vorgaengerId: VorgangId | null = null,
  beteiligte: readonly VorgangId[] = [],
): Bauzeitbefund {
  return { code, vorgangId, vorgaengerId, beteiligte, meldung };
}

export function bauzeitenplanBerechnen(eingabe: Bauzeitenplaneingabe): Bauzeitenplanergebnis {
  const vorgaenge = eingabe.vorgaenge;
  const n = vorgaenge.length;
  const befunde: Bauzeitbefund[] = [];
  const ohneTermine = (projektbeginn: Datum | null): Bauzeitenplanergebnis => ({
    projektbeginn,
    projektende: null,
    vorgaenge: vorgaenge.map((v) => ({
      id: v.id,
      art: v.dauer === 0 ? 'meilenstein' : 'vorgang',
      termine: null,
    })),
    kritischeWege: [],
    befunde,
  });

  const kalender = new Tageskalender(eingabe.kalender);
  const start = tagnummerLesen(eingabe.projektbeginn);
  if (!start.ok) {
    befunde.push(befund('projektbeginn-ungueltig', start.fehler.meldung));
    return ohneTermine(null);
  }
  const folge = new Arbeitstagefolge(kalender, start.wert);
  const startTag = folge.tag(0);
  if (startTag === null) return ohneTermine(null);

  const indexVon = new Map<VorgangId, number>();
  vorgaenge.forEach((v, i) => indexVon.set(v.id, i));

  // Kanten (Vorgänger → Nachfolger) in Eingabereihenfolge der Nachfolger und ihrer Beziehungen.
  const kanten: Kante[] = [];
  vorgaenge.forEach((v, nach) => {
    for (const b of v.vorgaenger) {
      const von = indexVon.get(b.vorgaengerId);
      if (von === undefined) continue;
      kanten.push({ von, nach, art: b.art, abstand: b.abstand });
    }
  });
  const aus: Kante[][] = Array.from({ length: n }, () => []);
  const ein: Kante[][] = Array.from({ length: n }, () => []);
  for (const k of kanten) {
    aus[k.von]?.push(k);
    ein[k.nach]?.push(k);
  }

  // Topologische Ordnung (Kahn), Startknoten in Eingabereihenfolge.
  const offen = new Array<number>(n).fill(0);
  for (const k of kanten) offen[k.nach] = (offen[k.nach] ?? 0) + 1;
  const ordnung: number[] = [];
  for (let i = 0; i < n; i++) if (offen[i] === 0) ordnung.push(i);
  for (let p = 0; p < ordnung.length; p++) {
    for (const k of aus[ordnung[p] ?? 0] ?? []) {
      const rest = (offen[k.nach] ?? 0) - 1;
      offen[k.nach] = rest;
      if (rest === 0) ordnung.push(k.nach);
    }
  }

  // Terminvorgabe „Beginn frühestens“ als Index des ersten Arbeitstags ab dem Datum.
  const vorgabe = vorgaenge.map((v) => {
    if (v.fruehesterBeginn === null) return 0;
    const tag = tagnummerLesen(v.fruehesterBeginn);
    return tag.ok ? (folge.indexAb(tag.wert) ?? 0) : 0;
  });

  // Vorwärtsrechnung: Anfang a, Ende e = a + dauer (Indizes der Arbeitstagefolge).
  const dauer = vorgaenge.map((v) => v.dauer);
  const a = new Array<number>(n).fill(0);
  const e = new Array<number>(n).fill(0);
  for (const j of ordnung) {
    let anfang = vorgabe[j] ?? 0;
    for (const k of ein[j] ?? []) {
      const anker = vomEnde(k.art) ? (e[k.von] ?? 0) : (a[k.von] ?? 0);
      anfang = Math.max(anfang, anker + k.abstand - (zumEnde(k.art) ? (dauer[j] ?? 0) : 0));
    }
    a[j] = anfang;
    e[j] = anfang + (dauer[j] ?? 0);
  }
  let projektende = 0;
  for (const j of ordnung) projektende = Math.max(projektende, e[j] ?? 0);

  // Rückwärtsrechnung vom Projektende: spätester Anfang sa, spätestes Ende se.
  const sa = new Array<number>(n).fill(0);
  const se = new Array<number>(n).fill(0);
  for (let p = ordnung.length - 1; p >= 0; p--) {
    const i = ordnung[p] ?? 0;
    let ende = projektende;
    for (const k of aus[i] ?? []) {
      const anker = zumEnde(k.art) ? (se[k.nach] ?? 0) : (sa[k.nach] ?? 0);
      ende = Math.min(ende, anker - k.abstand + (vomEnde(k.art) ? 0 : (dauer[i] ?? 0)));
    }
    se[i] = ende;
    sa[i] = ende - (dauer[i] ?? 0);
  }

  // Spielraum einer Kante in der frühen Lage.
  const spielraum = (k: Kante): number =>
    (zumEnde(k.art) ? (e[k.nach] ?? 0) : (a[k.nach] ?? 0)) -
    ((vomEnde(k.art) ? (e[k.von] ?? 0) : (a[k.von] ?? 0)) + k.abstand);

  const tagText = (index: number): Datum => datumAusTagnummer(folge.tag(index) ?? startTag);
  const ergebnisse: Vorgangsergebnis[] = vorgaenge.map((v, i) => {
    const d = dauer[i] ?? 0;
    const gesamtpuffer = (sa[i] ?? 0) - (a[i] ?? 0);
    let freierPuffer = projektende - (e[i] ?? 0);
    for (const k of aus[i] ?? []) freierPuffer = Math.min(freierPuffer, spielraum(k));
    return {
      id: v.id,
      art: d === 0 ? 'meilenstein' : 'vorgang',
      termine: {
        beginn: tagText(a[i] ?? 0),
        ende: tagText(d === 0 ? (a[i] ?? 0) : (e[i] ?? 0) - 1),
        spaetesterBeginn: tagText(sa[i] ?? 0),
        spaetestesEnde: tagText(d === 0 ? (sa[i] ?? 0) : (se[i] ?? 0) - 1),
        gesamtpuffer,
        freierPuffer,
        kritisch: gesamtpuffer <= 0,
      },
    };
  });

  const kritischeWege = kritischeWegeFinden(ordnung, aus, ein, ergebnisse, spielraum, befunde);
  let ende: Datum | null = null;
  for (const r of ergebnisse)
    if (r.termine !== null && (ende === null || r.termine.ende > ende)) ende = r.termine.ende;
  return {
    projektbeginn: datumAusTagnummer(startTag),
    projektende: ende,
    vorgaenge: ergebnisse,
    kritischeWege,
    befunde,
  };
}

/** Kritische Wege: alle längsten Folgen über kritische Kanten (Spielraum 0 zwischen zwei kritischen Vorgängen). */
function kritischeWegeFinden(
  ordnung: readonly number[],
  aus: readonly (readonly Kante[])[],
  ein: readonly (readonly Kante[])[],
  ergebnisse: readonly Vorgangsergebnis[],
  spielraum: (k: Kante) => number,
  befunde: Bauzeitbefund[],
): VorgangId[][] {
  const kritisch = (i: number): boolean => ergebnisse[i]?.termine?.kritisch === true;
  const kritischeKante = (k: Kante): boolean => kritisch(k.von) && kritisch(k.nach) && spielraum(k) === 0;
  const nachfolger = (i: number): number[] => {
    const ziele = new Set<number>();
    for (const k of aus[i] ?? []) if (kritischeKante(k)) ziele.add(k.nach);
    return [...ziele].sort((x, y) => x - y);
  };
  const starts = [...ordnung]
    .filter((i) => kritisch(i) && !(ein[i] ?? []).some(kritischeKante))
    .sort((x, y) => x - y);
  // Tiefensuche ohne Rekursion; jeder kritische Vorgang erreicht das Projektende, also gibt es keine Sackgassen.
  const wege: VorgangId[][] = [];
  let gekuerzt = false;
  for (const s of starts) {
    const pfad = [s];
    const weiterJeTiefe = [nachfolger(s)];
    const naechsterJeTiefe = [0];
    while (pfad.length > 0 && !gekuerzt) {
      const tiefe = pfad.length - 1;
      const weiter = weiterJeTiefe[tiefe] ?? [];
      const naechster = naechsterJeTiefe[tiefe] ?? 0;
      if (weiter.length === 0) {
        if (wege.length === KRITISCHE_WEGE_HOECHSTENS) gekuerzt = true;
        else wege.push(pfad.map((p) => ergebnisse[p]?.id ?? ''));
      }
      if (naechster >= weiter.length) {
        pfad.pop();
        weiterJeTiefe.pop();
        naechsterJeTiefe.pop();
        continue;
      }
      naechsterJeTiefe[tiefe] = naechster + 1;
      const j = weiter[naechster] ?? 0;
      pfad.push(j);
      weiterJeTiefe.push(nachfolger(j));
      naechsterJeTiefe.push(0);
    }
    if (gekuerzt) break;
  }
  if (gekuerzt) {
    befunde.push(
      befund(
        'kritische-wege-gekuerzt',
        `Mehr als ${String(KRITISCHE_WEGE_HOECHSTENS)} kritische Wege; aufgezählt sind die ersten`,
      ),
    );
  }
  return wege;
}
