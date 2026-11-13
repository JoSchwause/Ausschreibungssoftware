// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauzeitenplan (Ticket 109 Punkt 2; `vertrag` v1.6 Punkt 4, D-57, D-97.9): Ausführen, Anwenden, Umkehren. Das
// ChangeSet trägt den ganzen Plan vorher und nachher (D-57). Der Ausführer sieht nur den Plan und prüft die Form
// (`ungueltige-eingabe` mit `feld`, Lesarten an den Vertragstypen); fachlich Auffälliges (Zyklus über Anordnungsbeziehungen,
// Beziehung oder Terminvorgabe an einem Sammelvorgang, Ist-Ende vor Ist-Beginn) bleibt ein Befund der Terminrechnung (U5).
// Die Grenzen sind dieselben wie in der Rechnung (`HOECHSTWERT_ARBEITSTAGE`, Daten wie `datumPruefen`). Rein (A2).

import type {
  Arbeitskalender,
  Bauzeitenplan,
  BauzeitenplanBefehlAusfuehren,
  BauzeitenplanChangeSet,
  BauzeitenplanChangeSetAnwenden,
  BauzeitenplanChangeSetUmkehren,
  BauzeitenplanKopf,
  Befehlsfehler,
  Befehlsfehlercode,
  Ergebnis,
  Isttermine,
  Vorgang,
  VorgangEntfernen,
  VorgangId,
  VorgangSetzen,
  Wochentag,
} from '@tethys/vertrag';
import { HOECHSTWERT_ARBEITSTAGE } from './annahmen';
import { BEZIEHUNGSARTEN, fortschrittPruefen, ganzeArbeitstage } from './bauzeitenplan';
import { tagnummerLesen } from './datum';
import { BUNDESLAENDER } from './feiertage';

type Antwort = Ergebnis<BauzeitenplanChangeSet, Befehlsfehler>;
interface Nein {
  readonly ok: false;
  readonly fehler: Befehlsfehler;
}

function nein(code: Befehlsfehlercode, meldung: string, feld?: string): Nein {
  return { ok: false, fehler: feld === undefined ? { code, meldung } : { code, meldung, feld } };
}
const formfehler = (feld: string, meldung: string): Nein => nein('ungueltige-eingabe', meldung, feld);

function changeSet(vorher: Bauzeitenplan | null, nachher: Bauzeitenplan | null): Antwort {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('ChangeSet ohne Bauzeitenplan');
  return {
    ok: true,
    wert: { art: 'bauzeitenplan', bauzeitenplanId: id, bauzeitenplan: { vorher, nachher } },
  };
}

/**
 * Führt einen Befehl am Bauzeitenplan aus. `BauzeitenplanAnlegen` braucht `zustand === null`, jeder andere Befehl einen
 * Zustand; sonst `befehl-nicht-zustaendig` (wie Kern und `kosten`).
 */
export const bauzeitenplanBefehlAusfuehren: BauzeitenplanBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'BauzeitenplanAnlegen') {
    if (zustand !== null) return nein('befehl-nicht-zustaendig', `${befehl.art}: der Plan existiert schon.`);
    return planAnlegen(befehl.bauzeitenplan);
  }
  if (zustand === null)
    return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Bauzeitenplan übergeben.`);
  const plan = zustand.bauzeitenplan;
  switch (befehl.art) {
    case 'BauzeitenplankopfSetzen': {
      const kopf = kopfLesen(befehl);
      if (!kopf.ok) return kopf;
      return changeSet(plan, { ...plan, ...kopf.wert });
    }
    case 'VorgangSetzen':
      return vorgangSetzen(plan, befehl);
    case 'VorgangEntfernen':
      return vorgangEntfernen(plan, befehl);
    case 'BauzeitenplanLoeschen':
      return changeSet(plan, null);
  }
};

// --- Form der Teile ---------------------------------------------------------------------------------------------

const istText = (wert: unknown): wert is string => typeof wert === 'string';
/** Liste (Werte aus einer Datei können den Typ verfehlen); `Array.isArray` allein verengt auf `any[]`. */
const istListe = (wert: unknown): wert is readonly unknown[] => Array.isArray(wert);
const nichtLeer = (wert: unknown): wert is string => istText(wert) && wert.trim() !== '';
const istDatum = (wert: unknown): boolean => istText(wert) && tagnummerLesen(wert).ok;

/** Ordnet eine Liste und weist Doppelte ab (Lesart an `Arbeitskalender`). */
function geordnetOhneDoppelte<T extends number | string>(werte: readonly T[]): T[] | null {
  const geordnet = [...werte].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return geordnet.some((w, i) => i > 0 && geordnet[i - 1] === w) ? null : geordnet;
}

/** Prüft den Arbeitskalender und gibt ihn mit geordneten Listen zurück (Lesart an `Arbeitskalender`). */
function kalenderLesen(k: Arbeitskalender): Ergebnis<Arbeitskalender, Befehlsfehler> {
  const fehler = (meldung: string): Nein => formfehler('kalender', meldung);
  if (!istListe(k.arbeitstage) || k.arbeitstage.length === 0) {
    return fehler('Der Arbeitskalender braucht mindestens einen Arbeitstag.');
  }
  for (const w of k.arbeitstage as readonly unknown[]) {
    if (typeof w !== 'number' || !Number.isInteger(w) || w < 1 || w > 7) {
      return fehler(`Kein Wochentag 1 bis 7: ${JSON.stringify(w)}`);
    }
  }
  const arbeitstage = geordnetOhneDoppelte<Wochentag>(k.arbeitstage);
  if (arbeitstage === null) return fehler('Ein Arbeitstag steht doppelt im Kalender.');
  if (k.bundesland !== null && !BUNDESLAENDER.includes(k.bundesland)) {
    return fehler(`Unbekanntes Bundesland: ${JSON.stringify(k.bundesland)}`);
  }
  if (!istListe(k.freieTage)) return fehler('Die freien Tage sind keine Liste.');
  const unlesbar = k.freieTage.find((t) => !istDatum(t));
  if (unlesbar !== undefined)
    return fehler(`Freier Tag ist kein Datum JJJJ-MM-TT: ${JSON.stringify(unlesbar)}`);
  const freieTage = geordnetOhneDoppelte(k.freieTage);
  if (freieTage === null) return fehler('Ein freier Tag steht doppelt im Kalender.');
  return { ok: true, wert: { arbeitstage, bundesland: k.bundesland, freieTage } };
}

type Kopfangaben = Pick<BauzeitenplanKopf, 'name' | 'projektbeginn' | 'kalender'>;

/** Prüft Name, Projektbeginn und Kalender; der Kalender kommt geordnet zurück. */
function kopfLesen(k: Kopfangaben): Ergebnis<Kopfangaben, Befehlsfehler> {
  if (!nichtLeer(k.name)) return formfehler('name', 'Der Plan braucht einen Namen.');
  if (!istDatum(k.projektbeginn)) {
    return formfehler(
      'projektbeginn',
      `Projektbeginn ist kein Datum JJJJ-MM-TT: ${JSON.stringify(k.projektbeginn)}`,
    );
  }
  const kalender = kalenderLesen(k.kalender);
  if (!kalender.ok) return kalender;
  return { ok: true, wert: { name: k.name, projektbeginn: k.projektbeginn, kalender: kalender.wert } };
}

function beziehungenFehler(v: Vorgang): Nein | null {
  const fehler = (meldung: string): Nein => formfehler('vorgaenger', `Vorgang ${v.id}: ${meldung}`);
  if (!istListe(v.vorgaenger)) return fehler('die Anordnungsbeziehungen sind keine Liste.');
  const paare = new Set<string>();
  for (const b of v.vorgaenger) {
    if (!nichtLeer(b.vorgaengerId)) return fehler('Anordnungsbeziehung ohne Vorgänger.');
    if (b.vorgaengerId === v.id) return fehler('Anordnungsbeziehung auf sich selbst.');
    if (!BEZIEHUNGSARTEN.includes(b.art)) return fehler(`unbekannte Anordnungsart ${JSON.stringify(b.art)}.`);
    if (typeof b.abstand !== 'number' || !ganzeArbeitstage(b.abstand, -HOECHSTWERT_ARBEITSTAGE)) {
      return fehler(`Abstand ${String(b.abstand)} ist keine ganze Zahl von Arbeitstagen in den Grenzen.`);
    }
    const paar = `${b.art} ${b.vorgaengerId}`;
    if (paare.has(paar)) return fehler(`Beziehung ${b.art} zu ${b.vorgaengerId} steht doppelt.`);
    paare.add(paar);
  }
  return null;
}

function bezugFehler(v: Vorgang): Nein | null {
  const b: unknown = v.bezug;
  if (b === null) return null;
  const fehler = (meldung: string): Nein => formfehler('bezug', `Vorgang ${v.id}: ${meldung}`);
  if (typeof b !== 'object') return fehler('der Bezug ist kein Objekt.');
  const { art, id, knotenIds } = b as Record<string, unknown>;
  if (art !== 'leistungsverzeichnis' && art !== 'auftrags-leistungsverzeichnis') {
    return fehler(`unbekannte Art des Bezugs ${JSON.stringify(art)}.`);
  }
  if (!nichtLeer(id)) return fehler('der Bezug nennt kein LV.');
  if (knotenIds === null) return null;
  if (!istListe(knotenIds) || knotenIds.length === 0) {
    return fehler('die Knotenliste ist leer; das ganze LV heißt null.');
  }
  if (!knotenIds.every(nichtLeer)) return fehler('ein Knoten ohne Kennung.');
  if (new Set(knotenIds).size !== knotenIds.length) return fehler('ein Knoten steht doppelt.');
  return null;
}

function isttermineFehler(v: Vorgang): Nein | null {
  const ist: Isttermine | null = v.ist;
  if (ist === null) return null;
  const fehler = (meldung: string): Nein => formfehler('ist', `Vorgang ${v.id}: ${meldung}`);
  if (ist.beginn === null && ist.ende === null && ist.fortschritt === null) {
    return fehler('nichts erfasst schreibt sich ist: null.');
  }
  if (ist.beginn !== null && !istDatum(ist.beginn)) return fehler('Ist-Beginn ist kein Datum JJJJ-MM-TT.');
  if (ist.ende !== null && !istDatum(ist.ende)) return fehler('Ist-Ende ist kein Datum JJJJ-MM-TT.');
  const fortschritt = ist.fortschritt === null ? null : fortschrittPruefen(ist.fortschritt);
  return fortschritt === null ? null : fehler(fortschritt);
}

/** Form eines Vorgangs ohne Bezug auf den Plan (Lesarten an `Vorgang`, `Anordnungsbeziehung`, `Isttermine`). */
function vorgangFehler(v: Vorgang): Nein | null {
  if (!istText(v.id) || v.id === '') return formfehler('id', 'Vorgang ohne Kennung.');
  if (v.nummer !== null && (!istText(v.nummer) || v.nummer === '')) {
    return formfehler('nummer', `Vorgang ${v.id}: keine Nummer schreibt sich null, nie ''.`);
  }
  if (!nichtLeer(v.bezeichnung)) return formfehler('bezeichnung', `Vorgang ${v.id}: Bezeichnung leer.`);
  if (v.elternId !== null && (!istText(v.elternId) || v.elternId === '')) {
    return formfehler('elternId', `Vorgang ${v.id}: Sammelvorgang ohne Kennung.`);
  }
  if (typeof v.dauer !== 'number' || !ganzeArbeitstage(v.dauer, 0)) {
    return formfehler(
      'dauer',
      `Vorgang ${v.id}: Dauer ${String(v.dauer)} ist keine ganze Zahl ≥ 0 in den Grenzen.`,
    );
  }
  if (v.fruehesterBeginn !== null && !istDatum(v.fruehesterBeginn)) {
    return formfehler('fruehesterBeginn', `Vorgang ${v.id}: Terminvorgabe ist kein Datum JJJJ-MM-TT.`);
  }
  return beziehungenFehler(v) ?? bezugFehler(v) ?? isttermineFehler(v);
}

/** Jede Anordnungsbeziehung nennt einen Vorgang des Plans (D-97.9: sonst Fehler, kein Befund). */
function vorgaengerFehler(vorgaenge: readonly Vorgang[], ids: ReadonlySet<VorgangId>): Nein | null {
  for (const v of vorgaenge) {
    const fehlt = v.vorgaenger.find((b) => !ids.has(b.vorgaengerId));
    if (fehlt !== undefined) {
      return formfehler(
        'vorgaenger',
        `Vorgang ${v.id}: den Vorgänger ${fehlt.vorgaengerId} gibt es im Plan nicht.`,
      );
    }
  }
  return null;
}

// --- Gliederung -------------------------------------------------------------------------------------------------

/**
 * Index hinter dem Teilbaum des Vorgangs an der Stelle `i` (Dokumentreihenfolge: der Teilbaum steht zusammenhängend direkt
 * hinter ihm).
 */
function teilbaumEnde(vorgaenge: readonly Vorgang[], i: number): number {
  const imTeilbaum = new Set<VorgangId>();
  const wurzel = vorgaenge[i];
  if (wurzel === undefined) return i;
  imTeilbaum.add(wurzel.id);
  let j = i + 1;
  for (
    let v = vorgaenge[j];
    v !== undefined && v.elternId !== null && imTeilbaum.has(v.elternId);
    v = vorgaenge[j]
  ) {
    imTeilbaum.add(v.id);
    j++;
  }
  return j;
}

const indexVon = (vorgaenge: readonly Vorgang[], id: VorgangId): number =>
  vorgaenge.findIndex((v) => v.id === id);

/**
 * Gliederung eines ganzen Plans (Anlegen): Kennungen eindeutig, Eltern vorhanden, kein Ring, Dokumentreihenfolge (jeder
 * Sammelvorgang vor seinen Kindern, sein Teilbaum zusammenhängend direkt dahinter).
 */
function gliederungFehler(vorgaenge: readonly Vorgang[]): Nein | null {
  const eltern = new Map<VorgangId, VorgangId | null>();
  for (const v of vorgaenge) {
    if (eltern.has(v.id)) return formfehler('id', `Die Kennung ${v.id} steht doppelt im Plan.`);
    eltern.set(v.id, v.elternId);
  }
  for (const v of vorgaenge) {
    if (v.elternId !== null && !eltern.has(v.elternId)) {
      return nein(
        'eltern-unbekannt',
        `Vorgang ${v.id}: den Sammelvorgang ${v.elternId} gibt es nicht.`,
        'elternId',
      );
    }
  }
  // Ring: höchstens so viele Schritte nach oben, wie es Vorgänge gibt; geprüfte Ketten werden nicht erneut begangen.
  const ohneRing = new Set<VorgangId>();
  for (const v of vorgaenge) {
    const weg = new Set<VorgangId>();
    for (let id: VorgangId | null = v.id; id !== null && !ohneRing.has(id); id = eltern.get(id) ?? null) {
      if (weg.has(id)) return nein('zyklus', `Vorgang ${id} steht in einem Ring der Gliederung.`, 'elternId');
      weg.add(id);
    }
    for (const id of weg) ohneRing.add(id);
  }
  // Dokumentreihenfolge: Der Elternteil jedes Vorgangs ist der nächste offene Vorfahr auf dem Stapel.
  const stapel: VorgangId[] = [];
  for (const v of vorgaenge) {
    while (stapel.length > 0 && stapel[stapel.length - 1] !== v.elternId) stapel.pop();
    if (v.elternId !== null && stapel.length === 0) {
      return formfehler(
        'vorgaenge',
        `Vorgang ${v.id} steht nicht im zusammenhängenden Teilbaum hinter seinem Sammelvorgang ${v.elternId}.`,
      );
    }
    stapel.push(v.id);
  }
  return null;
}

// --- Befehle ----------------------------------------------------------------------------------------------------

function planAnlegen(plan: Bauzeitenplan): Antwort {
  if (!nichtLeer(plan.id)) return formfehler('id', 'Der Plan braucht eine Kennung.');
  if (!nichtLeer(plan.projektId)) return formfehler('projektId', 'Der Plan braucht ein Projekt.');
  const kopf = kopfLesen(plan);
  if (!kopf.ok) return kopf;
  if (!istListe(plan.vorgaenge)) return formfehler('vorgaenge', 'Die Vorgänge sind keine Liste.');
  for (const v of plan.vorgaenge) {
    const f = vorgangFehler(v);
    if (f) return f;
  }
  const f =
    gliederungFehler(plan.vorgaenge) ??
    vorgaengerFehler(plan.vorgaenge, new Set(plan.vorgaenge.map((v) => v.id)));
  if (f) return f;
  return changeSet(null, { ...plan, ...kopf.wert });
}

/** Legt an oder ersetzt, samt Lage (`nach`); der Teilbaum eines ersetzten Vorgangs zieht mit (D-97.9). */
function vorgangSetzen(plan: Bauzeitenplan, befehl: VorgangSetzen): Antwort {
  const neu = befehl.vorgang;
  const form = vorgangFehler(neu);
  if (form) return form;
  const alt = indexVon(plan.vorgaenge, neu.id);
  let block: Vorgang[] = [neu];
  let rest: readonly Vorgang[] = plan.vorgaenge;
  if (alt >= 0) {
    const ende = teilbaumEnde(plan.vorgaenge, alt);
    block = [neu, ...plan.vorgaenge.slice(alt + 1, ende)];
    rest = [...plan.vorgaenge.slice(0, alt), ...plan.vorgaenge.slice(ende)];
  }
  if (neu.elternId !== null && indexVon(rest, neu.elternId) < 0) {
    return block.some((v) => v.id === neu.elternId)
      ? nein('zyklus', `Vorgang ${neu.id} käme unter sich selbst oder einen eigenen Nachfahren.`, 'elternId')
      : nein('eltern-unbekannt', `Den Sammelvorgang ${neu.elternId} gibt es nicht.`, 'elternId');
  }
  let stelle: number;
  if (befehl.nach === null) stelle = neu.elternId === null ? 0 : indexVon(rest, neu.elternId) + 1;
  else {
    const k = indexVon(rest, befehl.nach);
    if (k < 0 || rest[k]?.elternId !== neu.elternId) {
      return formfehler('nach', `${befehl.nach} ist kein anderes Geschwister unter ${String(neu.elternId)}.`);
    }
    stelle = teilbaumEnde(rest, k);
  }
  const vorgaenge = [...rest.slice(0, stelle), ...block, ...rest.slice(stelle)];
  const f = vorgaengerFehler([neu], new Set(vorgaenge.map((v) => v.id)));
  if (f) return f;
  return changeSet(plan, { ...plan, vorgaenge });
}

/** Entfernt den Vorgang samt Teilbaum und jede Anordnungsbeziehung, die einen entfernten Vorgang nennt (D-97.9). */
function vorgangEntfernen(plan: Bauzeitenplan, befehl: VorgangEntfernen): Antwort {
  const i = indexVon(plan.vorgaenge, befehl.vorgangId);
  if (i < 0) {
    return nein('knoten-unbekannt', `Den Vorgang ${befehl.vorgangId} gibt es im Plan nicht.`, 'vorgangId');
  }
  const ende = teilbaumEnde(plan.vorgaenge, i);
  const entfernt = new Set(plan.vorgaenge.slice(i, ende).map((v) => v.id));
  const vorgaenge = [...plan.vorgaenge.slice(0, i), ...plan.vorgaenge.slice(ende)].map((v) =>
    v.vorgaenger.some((b) => entfernt.has(b.vorgaengerId))
      ? { ...v, vorgaenger: v.vorgaenger.filter((b) => !entfernt.has(b.vorgaengerId)) }
      : v,
  );
  return changeSet(plan, { ...plan, vorgaenge });
}

// --- Anwenden und Umkehren --------------------------------------------------------------------------------------

/** Wendet ein ChangeSet an: `nachher` ist der neue Stand, `null` heißt gelöscht (ganzes Aggregat, D-57). */
export const bauzeitenplanChangeSetAnwenden: BauzeitenplanChangeSetAnwenden = (_zustand, cs) => {
  const nachher = cs.bauzeitenplan.nachher;
  return nachher === null ? null : { bauzeitenplan: nachher };
};

/** Kehrt ein ChangeSet um: Tausch von `vorher` und `nachher`. */
export const bauzeitenplanChangeSetUmkehren: BauzeitenplanChangeSetUmkehren = (cs) => ({
  ...cs,
  bauzeitenplan: { vorher: cs.bauzeitenplan.nachher, nachher: cs.bauzeitenplan.vorher },
});
