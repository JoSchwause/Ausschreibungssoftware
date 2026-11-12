// SPDX-License-Identifier: AGPL-3.0-or-later
// Terminrechnung des Bauzeitenplans (Ticket 102 Punkt 3 und 4, D-57): Vorwärts- und Rückwärtsrechnung (Methode des
// kritischen Wegs) in Arbeitstagen des Arbeitskalenders, Gesamtpuffer und freier Puffer, kritische Wege. Die Lesarten
// stehen in `BAUZEIT_ANNAHMEN`. Eigene Eingabetypen bis zur Umstellung auf die Vertragstypen (Tickets 97, 109). Rein (A2),
// keine Uhr, kein Zufall. Auffälliges ist ein Befund, nie eine Sperre (U5).
//
// Rechenmodell: Index k = k-ter Arbeitstag ab dem Projektbeginn (k = 0 ist der erste). Ein Vorgang hat den Anfang `a`
// (Index seines ersten Tages) und das Ende `e = a + dauer` (Index nach seinem letzten Tag, also der Zeitpunkt, an dem er
// fertig ist); angezeigt wird als Ende der Tag `e − 1`, beim Meilenstein der Tag `a`.

import { alsProzent, vergleiche, vorzeichen } from '@tethys/dezimal';
import type { Prozent } from '@tethys/vertrag';
import { HOECHSTWERT_ARBEITSTAGE, KRITISCHE_WEGE_HOECHSTENS } from './annahmen';
import type { Datum, Tagnummer } from './datum';
import { LETZTER_TAG, datumAusTagnummer, tagnummerLesen } from './datum';
import type { Arbeitskalender, Kalenderhinweis } from './kalender';
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

const BEZIEHUNGSARTEN: readonly Beziehungsart[] = [
  'ende-anfang',
  'anfang-anfang',
  'ende-ende',
  'anfang-ende',
];

const ganzeArbeitstage = (wert: number, kleinster: number): boolean =>
  Number.isInteger(wert) && wert >= kleinster && wert <= HOECHSTWERT_ARBEITSTAGE;

function hundertProzent(): Prozent {
  const p = alsProzent('100.00');
  if (!p.ok) throw new Error(p.fehler.meldung);
  return p.wert;
}
const HUNDERT_PROZENT = hundertProzent();

/** Prüft Ist-Termine und Fortschritt; liefert das Problem als Text oder `null`. */
function istPruefen(ist: Isttermine): string | null {
  const beginn = ist.beginn === null ? null : tagnummerLesen(ist.beginn);
  const ende = ist.ende === null ? null : tagnummerLesen(ist.ende);
  if (beginn !== null && !beginn.ok) return `Ist-Beginn: ${beginn.fehler.meldung}`;
  if (ende !== null && !ende.ok) return `Ist-Ende: ${ende.fehler.meldung}`;
  if (ende !== null && beginn === null) return 'Ist-Ende ohne Ist-Beginn';
  // Hier sind beide, wenn vorhanden, gültig gelesen.
  if (beginn?.ok === true && ende?.ok === true && ende.wert < beginn.wert)
    return 'Ist-Ende liegt vor dem Ist-Beginn';
  const fortschritt = alsProzent(String(ist.fortschritt));
  if (!fortschritt.ok) return `Fortschritt: ${fortschritt.fehler.meldung}`;
  if (vorzeichen(fortschritt.wert) < 0 || vergleiche(fortschritt.wert, HUNDERT_PROZENT) > 0) {
    return `Fortschritt außerhalb von 0 bis 100 Prozent: ${fortschritt.wert}`;
  }
  return null;
}

function kalenderMeldung(h: Kalenderhinweis): string {
  switch (h.code) {
    case 'arbeitstag-ungueltig':
      return `Kein Wochentag 1 bis 7: ${JSON.stringify(h.wert)}; übergangen`;
    case 'bundesland-unbekannt':
      return `Unbekanntes Bundesland ${JSON.stringify(h.wert)}; es gelten nur die bundesweiten Feiertage`;
    case 'freier-tag-ungueltig':
      return `Freier Tag ist kein Datum JJJJ-MM-TT: ${JSON.stringify(h.wert)}; übergangen`;
  }
}

/**
 * Kreise in der Gliederung (`elternId`): Jeder Vorgang hat höchstens einen Elternteil, also ist jeder Kreis eine Schleife
 * von Elternverweisen. Beteiligte aufsteigend, Kreise nach ihrem ersten Beteiligten.
 */
function elternKreiseFinden(eltern: readonly number[]): number[][] {
  const zustand = new Array<number>(eltern.length).fill(0); // 0 offen, 1 auf dem Weg, 2 fertig
  const kreise: number[][] = [];
  for (let s = 0; s < eltern.length; s++) {
    const weg: number[] = [];
    let i = s;
    while (i >= 0 && zustand[i] === 0) {
      zustand[i] = 1;
      weg.push(i);
      i = eltern[i] ?? -1;
    }
    if (i >= 0 && zustand[i] === 1) kreise.push(weg.slice(weg.indexOf(i)).sort((x, y) => x - y));
    for (const w of weg) zustand[w] = 2;
  }
  return kreise.sort((x, y) => (x[0] ?? 0) - (y[0] ?? 0));
}

export function bauzeitenplanBerechnen(eingabe: Bauzeitenplaneingabe): Bauzeitenplanergebnis {
  const vorgaenge = eingabe.vorgaenge;
  const n = vorgaenge.length;
  const id = (i: number): VorgangId => vorgaenge[i]?.id ?? '';
  // Befunde in Rechenreihenfolge: Plan und Kalender; Gliederung; je Vorgang in Eingabereihenfolge (Werte, dann
  // Beziehungen); Zyklen; Terminvorgaben jenseits des Kalenders; entfallene Beziehungen; Termine jenseits des Kalenders;
  // kritische Wege.
  const planBefunde: Bauzeitbefund[] = [];
  const befunde: Bauzeitbefund[] = [];

  // --- Plan und Kalender ---
  const kalender = new Tageskalender(eingabe.kalender);
  const start = tagnummerLesen(eingabe.projektbeginn);
  if (!start.ok) planBefunde.push(befund('projektbeginn-ungueltig', start.fehler.meldung));
  for (const h of kalender.hinweise) planBefunde.push(befund(h.code, kalenderMeldung(h)));
  if (!kalender.hatArbeitstage) {
    planBefunde.push(befund('kalender-ohne-arbeitstage', 'Der Arbeitskalender hat keinen Arbeitstag'));
  }

  // --- Gliederung: Kennungen, Eltern, Art ---
  const indexVon = new Map<VorgangId, number>();
  const doppelt = new Array<boolean>(n).fill(false);
  vorgaenge.forEach((v, i) => {
    if (indexVon.has(v.id)) doppelt[i] = true;
    else indexVon.set(v.id, i);
  });
  const eltern = new Array<number>(n).fill(-1);
  vorgaenge.forEach((v, i) => {
    if (doppelt[i] === true) {
      befunde.push(
        befund('id-doppelt', `Kennung ${v.id} kommt mehrfach vor; nur der erste Vorgang zählt`, v.id),
      );
      return;
    }
    if (v.elternId === null) return;
    const p = indexVon.get(v.elternId);
    if (p === undefined) {
      befunde.push(
        befund('eltern-unbekannt', `Vorgang ${v.id}: Sammelvorgang ${v.elternId} gibt es nicht`, v.id),
      );
      return;
    }
    eltern[i] = p;
  });
  for (const kreis of elternKreiseFinden(eltern)) {
    for (const i of kreis) eltern[i] = -1;
    const ids = kreis.map(id);
    befunde.push(befund('eltern-zyklus', `Kreis in der Gliederung: ${ids.join(' → ')}`, null, null, ids));
  }
  const hatKinder = new Array<boolean>(n).fill(false);
  for (const p of eltern) if (p >= 0) hatKinder[p] = true;
  const art: Vorgangsart[] = vorgaenge.map((v, i) =>
    hatKinder[i] === true ? 'sammelvorgang' : v.dauer === 0 ? 'meilenstein' : 'vorgang',
  );
  const sammel = (i: number): boolean => art[i] === 'sammelvorgang';

  // --- Je Vorgang: Dauer, Terminvorgabe, Ist-Termine, Anordnungsbeziehungen ---
  const gueltig = new Array<boolean>(n).fill(false);
  const vorgabeTag = new Array<Tagnummer | null>(n).fill(null);
  const kanten: Kante[] = [];
  vorgaenge.forEach((v, nach) => {
    if (doppelt[nach] === true) return;
    if (sammel(nach)) {
      if (v.fruehesterBeginn !== null) {
        befunde.push(
          befund(
            'terminvorgabe-an-sammelvorgang',
            `Sammelvorgang ${v.id}: Terminvorgabe nicht gerechnet`,
            v.id,
          ),
        );
      }
    } else {
      if (ganzeArbeitstage(v.dauer, 0)) gueltig[nach] = true;
      else {
        befunde.push(
          befund(
            'dauer-ungueltig',
            `Vorgang ${v.id}: Dauer ${String(v.dauer)} ist keine gültige Dauer`,
            v.id,
          ),
        );
      }
      if (v.fruehesterBeginn !== null) {
        const tag = tagnummerLesen(v.fruehesterBeginn);
        if (tag.ok) vorgabeTag[nach] = tag.wert;
        else befunde.push(befund('terminvorgabe-ungueltig', `Vorgang ${v.id}: ${tag.fehler.meldung}`, v.id));
      }
    }
    if (v.ist !== null) {
      const problem = istPruefen(v.ist);
      if (problem !== null) befunde.push(befund('ist-ungueltig', `Vorgang ${v.id}: ${problem}`, v.id));
    }
    for (const b of v.vorgaenger) {
      const von = indexVon.get(b.vorgaengerId);
      const beziehung = `Anordnungsbeziehung ${b.vorgaengerId} → ${v.id}`;
      const melde = (code: Bauzeitbefundcode, text: string): void => {
        befunde.push(befund(code, `${beziehung}: ${text}`, v.id, b.vorgaengerId));
      };
      if (von === undefined) melde('vorgaenger-unbekannt', 'den Vorgänger gibt es nicht');
      else if (!BEZIEHUNGSARTEN.includes(b.art))
        melde('beziehungsart-unbekannt', `Art ${JSON.stringify(b.art)}`);
      else if (!ganzeArbeitstage(b.abstand, -HOECHSTWERT_ARBEITSTAGE)) {
        melde('abstand-ungueltig', `Abstand ${String(b.abstand)} ist keine gültige Zahl von Arbeitstagen`);
      } else if (sammel(von) || sammel(nach)) {
        melde('beziehung-an-sammelvorgang', 'an einem Sammelvorgang nicht gerechnet');
      } else kanten.push({ von, nach, art: b.art, abstand: b.abstand });
    }
  });

  // --- Zyklen unter den gültigen Vorgängen: ihre Beteiligten bleiben ohne Termine ---
  const imZyklus = new Array<boolean>(n).fill(false);
  const gueltigeKanten = kanten.filter((k) => gueltig[k.von] === true && gueltig[k.nach] === true);
  for (const zyklus of zyklenFinden(n, gueltigeKanten)) {
    for (const i of zyklus) imZyklus[i] = true;
    const ids = zyklus.map(id);
    befunde.push(
      befund('zyklus', `Zyklus in den Anordnungsbeziehungen: ${ids.join(' → ')}`, null, null, ids),
    );
  }

  const ohneTermine = (): Bauzeitenplanergebnis => ({
    projektbeginn: null,
    projektende: null,
    vorgaenge: vorgaenge.map((v, i) => ({ id: v.id, art: art[i] ?? 'vorgang', termine: null })),
    kritischeWege: [],
    befunde: [...planBefunde, ...befunde],
  });
  if (!start.ok || !kalender.hatArbeitstage) return ohneTermine();
  const folge = new Arbeitstagefolge(kalender, start.wert);
  const startTag = folge.tag(0);
  if (startTag === null) {
    befunde.push(
      befund('termin-ausserhalb-kalender', 'Ab dem Projektbeginn gibt es bis 9999-12-31 keinen Arbeitstag'),
    );
    return ohneTermine();
  }

  // --- Netz: gültige Vorgänge außerhalb von Zyklen; Terminvorgabe als Index des ersten Arbeitstags ab dem Datum ---
  const vorgabe = new Array<number>(n).fill(0);
  const imNetz = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (gueltig[i] !== true || imZyklus[i] === true) continue;
    const tag = vorgabeTag[i] ?? null;
    if (tag !== null) {
      const index = folge.indexAb(tag);
      if (index === null) {
        befunde.push(
          befund(
            'termin-ausserhalb-kalender',
            `Vorgang ${id(i)}: ab der Terminvorgabe gibt es bis 9999-12-31 keinen Arbeitstag`,
            id(i),
          ),
        );
        continue;
      }
      vorgabe[i] = index;
    }
    imNetz[i] = true;
  }
  const netzkanten: Kante[] = [];
  for (const k of kanten) {
    if (imNetz[k.von] === true && imNetz[k.nach] === true) netzkanten.push(k);
    else if (imNetz[k.nach] === true) {
      befunde.push(
        befund(
          'vorgaenger-ohne-termine',
          `Vorgang ${id(k.nach)}: Vorgänger ${id(k.von)} hat keine Termine, die Beziehung entfällt`,
          id(k.nach),
          id(k.von),
        ),
      );
    }
  }
  const aus: Kante[][] = Array.from({ length: n }, () => []);
  const ein: Kante[][] = Array.from({ length: n }, () => []);
  for (const k of netzkanten) {
    aus[k.von]?.push(k);
    ein[k.nach]?.push(k);
  }

  // --- Topologische Ordnung des Netzes (Kahn), Startknoten in Eingabereihenfolge ---
  const offen = new Array<number>(n).fill(0);
  for (const k of netzkanten) offen[k.nach] = (offen[k.nach] ?? 0) + 1;
  const ordnung: number[] = [];
  for (let i = 0; i < n; i++) if (imNetz[i] === true && offen[i] === 0) ordnung.push(i);
  for (let p = 0; p < ordnung.length; p++) {
    for (const k of aus[ordnung[p] ?? 0] ?? []) {
      const rest = (offen[k.nach] ?? 0) - 1;
      offen[k.nach] = rest;
      if (rest === 0) ordnung.push(k.nach);
    }
  }

  // --- Vorwärtsrechnung: Anfang a, Ende e = a + dauer (Indizes der Arbeitstagefolge) ---
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

  // --- Rückwärtsrechnung vom Projektende: spätester Anfang sa, spätestes Ende se ---
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

  // --- Lagen in Tagesindizes (Ende einschließlich), Sammelvorgänge aus ihren Nachfahren ---
  const lagen = new Array<Lage | null>(n).fill(null);
  for (const i of ordnung) {
    const d = dauer[i] ?? 0;
    const gesamtpuffer = (sa[i] ?? 0) - (a[i] ?? 0);
    let freierPuffer = projektende - (e[i] ?? 0);
    for (const k of aus[i] ?? []) freierPuffer = Math.min(freierPuffer, spielraum(k));
    const lage: Lage = {
      von: a[i] ?? 0,
      bis: d === 0 ? (a[i] ?? 0) : (e[i] ?? 0) - 1,
      spaetVon: sa[i] ?? 0,
      spaetBis: d === 0 ? (sa[i] ?? 0) : (se[i] ?? 0) - 1,
      gesamtpuffer,
      freierPuffer,
    };
    lagen[i] = lage;
    // In alle Sammelvorgänge darüber einrechnen (die Gliederung ist nach dem Auflösen der Kreise ein Wald).
    for (let p = eltern[i] ?? -1; p >= 0; p = eltern[p] ?? -1) lagen[p] = vereinigen(lagen[p] ?? null, lage);
  }

  // --- Termine als Daten; ein Tag nach 9999-12-31 ist ein Befund ---
  const ergebnisse: Vorgangsergebnis[] = vorgaenge.map((v, i) => {
    const l = lagen[i] ?? null;
    if (l === null) return { id: v.id, art: art[i] ?? 'vorgang', termine: null };
    const [von, bis, spaetVon, spaetBis] = [l.von, l.bis, l.spaetVon, l.spaetBis].map((k) => folge.tag(k));
    if (von === undefined || von === null || bis === undefined || bis === null) return ausserhalb(i);
    if (spaetVon === undefined || spaetVon === null || spaetBis === undefined || spaetBis === null) {
      return ausserhalb(i);
    }
    return {
      id: v.id,
      art: art[i] ?? 'vorgang',
      termine: {
        beginn: datumAusTagnummer(von),
        ende: datumAusTagnummer(bis),
        spaetesterBeginn: datumAusTagnummer(spaetVon),
        spaetestesEnde: datumAusTagnummer(spaetBis),
        gesamtpuffer: l.gesamtpuffer,
        freierPuffer: l.freierPuffer,
        kritisch: l.gesamtpuffer <= 0,
      },
    };
  });
  function ausserhalb(i: number): Vorgangsergebnis {
    befunde.push(
      befund('termin-ausserhalb-kalender', `Vorgang ${id(i)}: ein Termin läge nach 9999-12-31`, id(i)),
    );
    return { id: id(i), art: art[i] ?? 'vorgang', termine: null };
  }

  const kritischeWege = kritischeWegeFinden(ordnung, aus, ein, lagen, id, spielraum, befunde);
  let ende: Datum | null = null;
  for (const r of ergebnisse) {
    if (r.termine !== null && (ende === null || r.termine.ende > ende)) ende = r.termine.ende;
  }
  return {
    projektbeginn: datumAusTagnummer(startTag),
    projektende: ende,
    vorgaenge: ergebnisse,
    kritischeWege,
    befunde: [...planBefunde, ...befunde],
  };
}

/** Lage eines Vorgangs in Tagesindizes der Arbeitstagefolge, Ende einschließlich. */
interface Lage {
  readonly von: number;
  readonly bis: number;
  readonly spaetVon: number;
  readonly spaetBis: number;
  readonly gesamtpuffer: number;
  readonly freierPuffer: number;
}

/** Sammelvorgang: frühester Beginn, spätestes Ende, kleinste Puffer (je Lage für sich). */
function vereinigen(bisher: Lage | null, neu: Lage): Lage {
  if (bisher === null) return neu;
  return {
    von: Math.min(bisher.von, neu.von),
    bis: Math.max(bisher.bis, neu.bis),
    spaetVon: Math.min(bisher.spaetVon, neu.spaetVon),
    spaetBis: Math.max(bisher.spaetBis, neu.spaetBis),
    gesamtpuffer: Math.min(bisher.gesamtpuffer, neu.gesamtpuffer),
    freierPuffer: Math.min(bisher.freierPuffer, neu.freierPuffer),
  };
}

/**
 * Kritische Wege: alle längsten Folgen über kritische Kanten (Spielraum 0 zwischen zwei kritischen Vorgängen), je von einem
 * kritischen Vorgang ohne kritischen Vorgänger bis zu einem ohne kritischen Nachfolger.
 */
function kritischeWegeFinden(
  ordnung: readonly number[],
  aus: readonly (readonly Kante[])[],
  ein: readonly (readonly Kante[])[],
  lagen: readonly (Lage | null)[],
  id: (i: number) => VorgangId,
  spielraum: (k: Kante) => number,
  befunde: Bauzeitbefund[],
): VorgangId[][] {
  const kritisch = (i: number): boolean => (lagen[i]?.gesamtpuffer ?? 1) <= 0;
  const kritischeKante = (k: Kante): boolean => kritisch(k.von) && kritisch(k.nach) && spielraum(k) === 0;
  const nachfolger = (i: number): number[] => {
    const ziele = new Set<number>();
    for (const k of aus[i] ?? []) if (kritischeKante(k)) ziele.add(k.nach);
    return [...ziele].sort((x, y) => x - y);
  };
  const starts = ordnung
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
        else wege.push(pfad.map(id));
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

/**
 * Zyklen der Anordnungsbeziehungen: starke Zusammenhangskomponenten (Tarjan, ohne Rekursion) mit mehr als einem Vorgang
 * oder mit einer Beziehung auf sich selbst. Beteiligte je Zyklus aufsteigend, Zyklen nach ihrem ersten Beteiligten.
 */
function zyklenFinden(n: number, kanten: readonly Kante[]): number[][] {
  const nachfolger: number[][] = Array.from({ length: n }, () => []);
  const selbst = new Array<boolean>(n).fill(false);
  for (const k of kanten) {
    nachfolger[k.von]?.push(k.nach);
    if (k.von === k.nach) selbst[k.von] = true;
  }
  const nummer = new Array<number>(n).fill(-1);
  const tiefste = new Array<number>(n).fill(0);
  const aufStapel = new Array<boolean>(n).fill(false);
  const stapel: number[] = [];
  const zyklen: number[][] = [];
  let zaehler = 0;
  const betreten = (v: number): void => {
    nummer[v] = zaehler;
    tiefste[v] = zaehler;
    zaehler++;
    stapel.push(v);
    aufStapel[v] = true;
  };
  for (let s = 0; s < n; s++) {
    if (nummer[s] !== -1) continue;
    betreten(s);
    const ruf: { v: number; pos: number }[] = [{ v: s, pos: 0 }];
    while (ruf.length > 0) {
      const oben = ruf[ruf.length - 1] ?? { v: s, pos: 0 };
      const ziele = nachfolger[oben.v] ?? [];
      if (oben.pos < ziele.length) {
        const w = ziele[oben.pos] ?? 0;
        oben.pos++;
        if (nummer[w] === -1) {
          betreten(w);
          ruf.push({ v: w, pos: 0 });
        } else if (aufStapel[w] === true) {
          tiefste[oben.v] = Math.min(tiefste[oben.v] ?? 0, nummer[w] ?? 0);
        }
        continue;
      }
      ruf.pop();
      const unten = ruf[ruf.length - 1];
      if (unten !== undefined) tiefste[unten.v] = Math.min(tiefste[unten.v] ?? 0, tiefste[oben.v] ?? 0);
      if (tiefste[oben.v] !== nummer[oben.v]) continue;
      const komponente: number[] = [];
      for (;;) {
        const w = stapel.pop() ?? oben.v;
        aufStapel[w] = false;
        komponente.push(w);
        if (w === oben.v) break;
      }
      if (komponente.length > 1 || selbst[oben.v] === true) zyklen.push(komponente.sort((x, y) => x - y));
    }
  }
  return zyklen.sort((x, y) => (x[0] ?? 0) - (y[0] ?? 0));
}
