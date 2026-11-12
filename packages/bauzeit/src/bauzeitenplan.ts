// SPDX-License-Identifier: AGPL-3.0-or-later
// Terminrechnung des Bauzeitenplans (Ticket 102 Punkt 3 und 4, D-57): Vorwärts- und Rückwärtsrechnung (Methode des
// kritischen Wegs) in Arbeitstagen des Arbeitskalenders, Gesamtpuffer und freier Puffer, kritische Wege. Die Lesarten
// stehen in `BAUZEIT_ANNAHMEN`. Ein- und Ausgabe sind die Vertragstypen v1.6 (Ticket 109). Rein (A2), keine Uhr, kein
// Zufall. Auffälliges ist ein Befund (`Pruefbefund`, Quelle `terminrechnung`), nie eine Sperre (U5).
//
// Rechenmodell: Index k = k-ter Arbeitstag ab dem Projektbeginn (k = 0 ist der erste). Ein Vorgang hat den Anfang `a`
// (Index seines ersten Tages) und das Ende `e = a + dauer` (Index nach seinem letzten Tag, also der Zeitpunkt, an dem er
// fertig ist); angezeigt wird als Ende der Tag `e − 1`, beim Meilenstein der Tag `a`.

import { alsProzent, vergleiche, vorzeichen } from '@tethys/dezimal';
import type {
  Anordnungsart,
  Bauzeitenplan,
  Befundort,
  Befundschwere,
  Isttermine,
  Pruefbefund,
  Prozent,
  Bauzeitenplanergebnis as VertragsBauzeitenplanergebnis,
  VorgangId,
  Vorgangsart,
  Vorgangsergebnis as VertragsVorgangsergebnis,
  Vorgangstermine as VertragsVorgangstermine,
} from '@tethys/vertrag';
import { HOECHSTWERT_ARBEITSTAGE, KRITISCHE_WEGE_HOECHSTENS } from './annahmen';
import type { Datum, Tagnummer } from './datum';
import { LETZTER_TAG, datumAusTagnummer, tagnummerLesen } from './datum';
import type { Kalenderhinweis } from './kalender';
import { Tageskalender } from './kalender';

// --- Schnittstelle ---------------------------------------------------------------------------------------------
//
// Eingaben sind die Vertragstypen v1.6 (`Bauzeitenplan`, `Vorgang`, `Anordnungsbeziehung`, `Arbeitskalender`; Ticket 97
// Punkt 4, Ticket 109). Das Ergebnis ist das `Bauzeitenplanergebnis` des Vertrags, hier mit den Daten als geprüftes `Datum`
// (D-102.5, D-109.2): zuweisbar an den Vertragstyp, und die App gibt die Daten ohne erneute Prüfung an die Zeitachse.

/** Was die Terminrechnung vom gespeicherten `Bauzeitenplan` liest (Name aus Ticket 102, D-102.12); der Plan selbst passt. */
export type Bauzeitenplaneingabe = Pick<Bauzeitenplan, 'projektbeginn' | 'kalender' | 'vorgaenge'>;

/** `Vorgangstermine` des Vertrags mit geprüften Daten (D-109.2). */
export interface Vorgangstermine extends VertragsVorgangstermine {
  readonly beginn: Datum;
  readonly ende: Datum;
  readonly spaetesterBeginn: Datum;
  readonly spaetestesEnde: Datum;
}

/** `Vorgangsergebnis` des Vertrags mit geprüften Daten (D-109.2). */
export interface Vorgangsergebnis extends VertragsVorgangsergebnis {
  readonly termine: Vorgangstermine | null;
}

/** `Bauzeitenplanergebnis` des Vertrags mit geprüften Daten (D-109.2). */
export interface Bauzeitenplanergebnis extends VertragsBauzeitenplanergebnis {
  readonly projektbeginn: Datum | null;
  readonly projektende: Datum | null;
  readonly vorgaenge: readonly Vorgangsergebnis[];
}

/**
 * Codes der Befunde der Terminrechnung (`Pruefbefund.code`, Quelle `terminrechnung`; D-97.11: das Paket führt seine Liste).
 * Je Code die Folge für die Rechnung; die Schwere steht in {@link BAUZEITBEFUNDE}.
 */
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
  | 'anordnungsart-unbekannt' // Beziehung übergangen
  | 'abstand-ungueltig' // Beziehung übergangen
  | 'beziehung-an-sammelvorgang' // Beziehung übergangen (v1)
  | 'zyklus' // die Beteiligten bleiben ohne Termine
  | 'vorgaenger-ohne-termine' // Beziehung von einem Vorgang ohne Termine; übergangen
  | 'termin-ausserhalb-kalender' // nach 9999-12-31; ohne Termine
  | 'kritische-wege-gekuerzt'; // mehr als KRITISCHE_WEGE_HOECHSTENS Wege

/**
 * Schwere je Code (D-109.3): `fehler`, wo eine Eingabe die Form verletzt (der Ausführer ließe sie nicht zu; sie kommt nur aus
 * einer Datei oder einem älteren Stand) oder ein Vorgang ohne Termine bleibt; `warnung`, wo v1 etwas bewusst nicht rechnet
 * (Sammelvorgang), eine Folge schon gemeldet ist, nur Angezeigtes betroffen ist (Ist-Termine) oder die Aufzählung endet.
 */
export const BAUZEITBEFUNDE: Readonly<Record<Bauzeitbefundcode, Befundschwere>> = {
  'projektbeginn-ungueltig': 'fehler',
  'kalender-ohne-arbeitstage': 'fehler',
  'arbeitstag-ungueltig': 'fehler',
  'bundesland-unbekannt': 'fehler',
  'freier-tag-ungueltig': 'fehler',
  'id-doppelt': 'fehler',
  'eltern-unbekannt': 'fehler',
  'eltern-zyklus': 'fehler',
  'dauer-ungueltig': 'fehler',
  'terminvorgabe-ungueltig': 'fehler',
  'terminvorgabe-an-sammelvorgang': 'warnung',
  'ist-ungueltig': 'warnung',
  'vorgaenger-unbekannt': 'fehler',
  'anordnungsart-unbekannt': 'fehler',
  'abstand-ungueltig': 'fehler',
  'beziehung-an-sammelvorgang': 'warnung',
  zyklus: 'fehler',
  'vorgaenger-ohne-termine': 'warnung',
  'termin-ausserhalb-kalender': 'fehler',
  'kritische-wege-gekuerzt': 'warnung',
};

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
  readonly art: Anordnungsart;
  readonly abstand: number;
  /** Stelle der Beziehung in `vorgaenger` des Nachfolgers (ab 0), für den Pfad eines Befunds. */
  readonly stelle: number;
}

const vomEnde = (art: Anordnungsart): boolean => art === 'ende-anfang' || art === 'ende-ende';
const zumEnde = (art: Anordnungsart): boolean => art === 'ende-ende' || art === 'anfang-ende';

/** Ein Befund der Terminrechnung; der Ort nach der Lesart von `Befundort` für `terminrechnung` (D-97.11). */
function befund(code: Bauzeitbefundcode, meldung: string, ort: Befundort = {}): Pruefbefund {
  return { schwere: BAUZEITBEFUNDE[code], quelle: 'terminrechnung', code, meldung, ort };
}
/** Ort: ein Vorgang und eines seiner Felder. */
const am = (vorgangId: VorgangId, feld?: string): Befundort =>
  feld === undefined ? { vorgangId } : { vorgangId, feld };
/**
 * Ort eines Befunds zu genau einer Anordnungsbeziehung (Nachtrag Review, D-66): der Nachfolger, `feld: 'vorgaenger'` und
 * `pfad: '/vorgaenge[n]/vorgaenger[m]'`, beide ab 1 (Stelle im Plan und in `Vorgang.vorgaenger`).
 */
const anBeziehung = (vorgangId: VorgangId, vorgang: number, stelle: number): Befundort => ({
  vorgangId,
  feld: 'vorgaenger',
  pfad: `/vorgaenge[${String(vorgang + 1)}]/vorgaenger[${String(stelle + 1)}]`,
});

/** Die vier Anordnungsarten (auch für die Formprüfung des Ausführers). */
export const BEZIEHUNGSARTEN: readonly Anordnungsart[] = [
  'ende-anfang',
  'anfang-anfang',
  'ende-ende',
  'anfang-ende',
];

/** Ganze Arbeitstage von `kleinster` bis `HOECHSTWERT_ARBEITSTAGE` (D-102.7; auch für den Ausführer). */
export const ganzeArbeitstage = (wert: number, kleinster: number): boolean =>
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
  return ist.fortschritt === null ? null : fortschrittPruefen(ist.fortschritt);
}

/** Fortschritt: Prozent mit zwei Stellen (N3), `0.00` bis `100.00` (D-102.6); liefert das Problem oder `null`. */
export function fortschrittPruefen(wert: Prozent): string | null {
  const fortschritt = alsProzent(String(wert));
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
  const id = (i: number): VorgangId => vorgaenge[i]?.id ?? ('' as VorgangId);
  // Befunde in Rechenreihenfolge: Plan und Kalender; Gliederung; je Vorgang in Eingabereihenfolge (Werte, dann
  // Beziehungen); Zyklen; Terminvorgaben jenseits des Kalenders; entfallene Beziehungen; Termine jenseits des Kalenders;
  // kritische Wege.
  const planBefunde: Pruefbefund[] = [];
  const befunde: Pruefbefund[] = [];

  // --- Plan und Kalender ---
  const kalender = new Tageskalender(eingabe.kalender);
  const start = tagnummerLesen(eingabe.projektbeginn);
  if (!start.ok) {
    planBefunde.push(befund('projektbeginn-ungueltig', start.fehler.meldung, { feld: 'projektbeginn' }));
  }
  for (const h of kalender.hinweise)
    planBefunde.push(befund(h.code, kalenderMeldung(h), { feld: 'kalender' }));
  if (!kalender.hatArbeitstage) {
    planBefunde.push(
      befund('kalender-ohne-arbeitstage', 'Der Arbeitskalender hat keinen Arbeitstag', { feld: 'kalender' }),
    );
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
        befund(
          'id-doppelt',
          `Kennung ${v.id} kommt mehrfach vor; nur der erste Vorgang zählt`,
          am(v.id, 'id'),
        ),
      );
      return;
    }
    if (v.elternId === null) return;
    const p = indexVon.get(v.elternId);
    if (p === undefined) {
      befunde.push(
        befund(
          'eltern-unbekannt',
          `Vorgang ${v.id}: Sammelvorgang ${v.elternId} gibt es nicht`,
          am(v.id, 'elternId'),
        ),
      );
      return;
    }
    eltern[i] = p;
  });
  for (const kreis of elternKreiseFinden(eltern)) {
    for (const i of kreis) eltern[i] = -1;
    const ids = kreis.map(id);
    // Je Beteiligter ein Befund (D-97.11); die Meldung nennt den ganzen Kreis.
    for (const v of ids) {
      befunde.push(befund('eltern-zyklus', `Kreis in der Gliederung: ${ids.join(' → ')}`, am(v, 'elternId')));
    }
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
            am(v.id, 'fruehesterBeginn'),
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
            am(v.id, 'dauer'),
          ),
        );
      }
      if (v.fruehesterBeginn !== null) {
        const tag = tagnummerLesen(v.fruehesterBeginn);
        if (tag.ok) vorgabeTag[nach] = tag.wert;
        else {
          befunde.push(
            befund(
              'terminvorgabe-ungueltig',
              `Vorgang ${v.id}: ${tag.fehler.meldung}`,
              am(v.id, 'fruehesterBeginn'),
            ),
          );
        }
      }
    }
    if (v.ist !== null) {
      const problem = istPruefen(v.ist);
      if (problem !== null)
        befunde.push(befund('ist-ungueltig', `Vorgang ${v.id}: ${problem}`, am(v.id, 'ist')));
    }
    v.vorgaenger.forEach((b, stelle) => {
      const von = indexVon.get(b.vorgaengerId);
      const beziehung = `Anordnungsbeziehung ${b.vorgaengerId} → ${v.id}`;
      const melde = (code: Bauzeitbefundcode, text: string): void => {
        befunde.push(befund(code, `${beziehung}: ${text}`, anBeziehung(v.id, nach, stelle)));
      };
      if (von === undefined) melde('vorgaenger-unbekannt', 'den Vorgänger gibt es nicht');
      else if (!BEZIEHUNGSARTEN.includes(b.art))
        melde('anordnungsart-unbekannt', `Art ${JSON.stringify(b.art)}`);
      else if (!ganzeArbeitstage(b.abstand, -HOECHSTWERT_ARBEITSTAGE)) {
        melde('abstand-ungueltig', `Abstand ${String(b.abstand)} ist keine gültige Zahl von Arbeitstagen`);
      } else if (sammel(von) || sammel(nach)) {
        melde('beziehung-an-sammelvorgang', 'an einem Sammelvorgang nicht gerechnet');
      } else kanten.push({ von, nach, art: b.art, abstand: b.abstand, stelle });
    });
  });

  // --- Zyklen unter den gültigen Vorgängen: ihre Beteiligten bleiben ohne Termine ---
  const imZyklus = new Array<boolean>(n).fill(false);
  const gueltigeKanten = kanten.filter((k) => gueltig[k.von] === true && gueltig[k.nach] === true);
  for (const zyklus of zyklenFinden(n, gueltigeKanten)) {
    for (const i of zyklus) imZyklus[i] = true;
    const ids = zyklus.map(id);
    befunde.push(
      ...ids.map((v) =>
        befund('zyklus', `Zyklus in den Anordnungsbeziehungen: ${ids.join(' → ')}`, am(v, 'vorgaenger')),
      ),
    );
  }

  const ohneTermine = (): Bauzeitenplanergebnis => ({
    projektbeginn: null,
    projektende: null,
    vorgaenge: vorgaenge.map((v, i) => ({ vorgangId: v.id, art: art[i] ?? 'vorgang', termine: null })),
    kritischeWege: [],
    befunde: [...planBefunde, ...befunde],
  });
  if (!start.ok || !kalender.hatArbeitstage) return ohneTermine();
  const folge = new Arbeitstagefolge(kalender, start.wert);
  const startTag = folge.tag(0);
  if (startTag === null) {
    befunde.push(
      befund('termin-ausserhalb-kalender', 'Ab dem Projektbeginn gibt es bis 9999-12-31 keinen Arbeitstag', {
        feld: 'projektbeginn',
      }),
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
            am(id(i), 'fruehesterBeginn'),
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
          anBeziehung(id(k.nach), k.nach, k.stelle),
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
    if (l === null) return { vorgangId: v.id, art: art[i] ?? 'vorgang', termine: null };
    const [von, bis, spaetVon, spaetBis] = [l.von, l.bis, l.spaetVon, l.spaetBis].map((k) => folge.tag(k));
    if (von === undefined || von === null || bis === undefined || bis === null) return ausserhalb(i);
    if (spaetVon === undefined || spaetVon === null || spaetBis === undefined || spaetBis === null) {
      return ausserhalb(i);
    }
    return {
      vorgangId: v.id,
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
      befund('termin-ausserhalb-kalender', `Vorgang ${id(i)}: ein Termin läge nach 9999-12-31`, am(id(i))),
    );
    return { vorgangId: id(i), art: art[i] ?? 'vorgang', termine: null };
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
  befunde: Pruefbefund[],
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
