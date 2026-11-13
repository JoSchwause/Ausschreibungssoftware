// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauzeitenplan aus Formularfeldern (Ticket 118). Der Rand liest de-DE-Text (N4): Daten `TT.MM.JJJJ` (oder ISO),
// ganze Arbeitstage, Prozent mit Komma. Eine unlesbare Eingabe ist ein Feldfehler und kommt nie in einen Befehl; das Feld
// behält sie, bis der Nutzer sie korrigiert (U5). Ein Vorgänger, den es im Plan nicht gibt, ist ebenso ein Feldfehler: Der
// Ausführer würde ihn abweisen (D-64).

import { formatiereProzentDe, vergleiche } from '@tethys/dezimal';
import type {
  Anordnungsart,
  Anordnungsbeziehung,
  Arbeitskalender,
  Bauzeitenplan,
  BauzeitenplanAnlegen,
  BauzeitenplankopfSetzen,
  Bundesland,
  Ergebnis,
  IdQuelle,
  Isttermine,
  ProjektId,
  Prozent,
  Vorgang,
  VorgangEntfernen,
  VorgangId,
  VorgangSetzen,
  Vorgangsbezug,
  Wochentag,
} from '@tethys/vertrag';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { zahlLesen } from '../lv/zahlen';
import type { Feldfehler } from '../ui/feldfehler';
import { texte } from './texte';

/** Feldnamen: die des Formulars, bei Beziehungen `beziehung-<i>-vorgaenger` bzw. `beziehung-<i>-abstand` (ab 0). */
export type { Feldfehler };

type Gelesen<T> = Ergebnis<T, readonly Feldfehler[]>;

// --- Kopf -------------------------------------------------------------------------------------------------------

/** Die Felder von Name und Arbeitskalender, wie das Formular sie hält. */
export interface Kopfentwurf {
  readonly name: string;
  readonly projektbeginn: string;
  readonly arbeitstage: readonly Wochentag[];
  readonly bundesland: Bundesland | null;
  /** Daten, getrennt durch Komma, Semikolon oder Leerraum. */
  readonly freieTage: string;
}

export function kopfentwurf(plan: Bauzeitenplan): Kopfentwurf {
  return {
    name: plan.name,
    projektbeginn: datumDe(plan.projektbeginn),
    arbeitstage: plan.kalender.arbeitstage,
    bundesland: plan.kalender.bundesland,
    freieTage: plan.kalender.freieTage.map(datumDe).join(', '),
  };
}

interface Kopfwerte {
  readonly name: string;
  readonly projektbeginn: string;
  readonly kalender: Arbeitskalender;
}

function kopfLesen(e: Kopfentwurf): Gelesen<Kopfwerte> {
  const fehler: Feldfehler[] = [];
  const t = texte.kopf;
  const name = e.name.trim();
  if (name === '') fehler.push({ feld: 'name', meldung: t.fehlerName });
  const beginn = datumLesen(e.projektbeginn);
  if (!beginn.ok) fehler.push({ feld: 'projektbeginn', meldung: t.fehlerDatum });
  const arbeitstage = [...new Set(e.arbeitstage)].sort((a, b) => a - b);
  if (arbeitstage.length === 0) fehler.push({ feld: 'arbeitstage', meldung: t.fehlerArbeitstage });
  const freie = new Set<string>();
  for (const teil of e.freieTage.split(/[;,\s]+/).filter((x) => x !== '')) {
    const d = datumLesen(teil);
    if (!d.ok) {
      fehler.push({ feld: 'freieTage', meldung: t.fehlerFreieTage(teil) });
      break;
    }
    freie.add(d.wert);
  }
  if (fehler.length > 0 || !beginn.ok) return { ok: false, fehler };
  return {
    ok: true,
    wert: {
      name,
      projektbeginn: beginn.wert,
      kalender: { arbeitstage, bundesland: e.bundesland, freieTage: [...freie].sort() },
    },
  };
}

/** Ein leerer Bauzeitenplan; die Vorgänge folgen mit `VorgangSetzen` (D-97.9). */
export function planAnlegenBefehl(
  ids: IdQuelle,
  projektId: ProjektId,
  e: Kopfentwurf,
): Gelesen<BauzeitenplanAnlegen> {
  const k = kopfLesen(e);
  if (!k.ok) return k;
  return {
    ok: true,
    wert: {
      art: 'BauzeitenplanAnlegen',
      bauzeitenplan: { id: ids.bauzeitenplan(), projektId, ...k.wert, vorgaenge: [] },
    },
  };
}

export function kopfBefehl(e: Kopfentwurf): Gelesen<BauzeitenplankopfSetzen> {
  const k = kopfLesen(e);
  return k.ok ? { ok: true, wert: { art: 'BauzeitenplankopfSetzen', ...k.wert } } : k;
}

// --- Vorgang ----------------------------------------------------------------------------------------------------

export interface Beziehungsentwurf {
  /** `null`: noch keiner gewählt. */
  readonly vorgaengerId: VorgangId | null;
  readonly art: Anordnungsart;
  readonly abstand: string;
}

/** Die Felder des Vorgangsformulars. `id: null` heißt neuer Vorgang. */
export interface Vorgangsentwurf {
  readonly id: VorgangId | null;
  readonly bezeichnung: string;
  readonly nummer: string;
  readonly elternId: VorgangId | null;
  readonly dauer: string;
  readonly fruehesterBeginn: string;
  readonly beziehungen: readonly Beziehungsentwurf[];
  /** Der Bezug wird gewählt, nicht getippt; ein Bezug auf einzelne Knoten bleibt beim Bearbeiten erhalten. */
  readonly bezug: Vorgangsbezug | null;
  readonly istBeginn: string;
  readonly istEnde: string;
  readonly fortschritt: string;
}

export function leererVorgangsentwurf(elternId: VorgangId | null = null): Vorgangsentwurf {
  return {
    id: null,
    bezeichnung: '',
    nummer: '',
    elternId,
    dauer: '',
    fruehesterBeginn: '',
    beziehungen: [],
    bezug: null,
    istBeginn: '',
    istEnde: '',
    fortschritt: '',
  };
}

export function vorgangsentwurf(v: Vorgang): Vorgangsentwurf {
  return {
    id: v.id,
    bezeichnung: v.bezeichnung,
    nummer: v.nummer ?? '',
    elternId: v.elternId,
    dauer: String(v.dauer),
    fruehesterBeginn: v.fruehesterBeginn === null ? '' : datumDe(v.fruehesterBeginn),
    beziehungen: v.vorgaenger.map((b) => ({
      vorgaengerId: b.vorgaengerId,
      art: b.art,
      abstand: String(b.abstand),
    })),
    bezug: v.bezug,
    istBeginn: v.ist?.beginn == null ? '' : datumDe(v.ist.beginn),
    istEnde: v.ist?.ende == null ? '' : datumDe(v.ist.ende),
    fortschritt: v.ist?.fortschritt == null ? '' : formatiereProzentDe(v.ist.fortschritt),
  };
}

/** Ganze Arbeitstage, auch negativ (Abstand); höchstens sieben Ziffern (der Ausführer prüft die Obergrenze). */
const GANZ = /^[+-]?\d{1,7}$/;

/** Kennungen des Vorgangs und aller seiner Nachkommen. */
export function teilbaum(plan: Bauzeitenplan, id: VorgangId): ReadonlySet<VorgangId> {
  const menge = new Set<VorgangId>([id]);
  // Dokumentreihenfolge: Kinder stehen hinter ihrem Elternteil, ein Durchlauf genügt.
  for (const v of plan.vorgaenge) if (v.elternId !== null && menge.has(v.elternId)) menge.add(v.id);
  return menge;
}

/** Lage des Vorgangs: bleibt er unter seinem Elternteil, behält er seinen Platz; sonst hinter dem letzten Geschwister. */
function lage(plan: Bauzeitenplan, id: VorgangId | null, elternId: VorgangId | null): VorgangId | null {
  const bisher = id === null ? undefined : plan.vorgaenge.find((v) => v.id === id);
  const geschwister = plan.vorgaenge.filter((v) => v.elternId === elternId);
  if (bisher !== undefined && bisher.elternId === elternId) {
    const i = geschwister.findIndex((v) => v.id === id);
    return i > 0 ? (geschwister[i - 1]?.id ?? null) : null;
  }
  return geschwister.filter((v) => v.id !== id).at(-1)?.id ?? null;
}

function datumOderLeer(text: string, feld: string, fehler: Feldfehler[]): string | null {
  if (text.trim() === '') return null;
  const d = datumLesen(text);
  if (d.ok) return d.wert;
  fehler.push({ feld, meldung: texte.vorgang.fehlerDatum });
  return null;
}

function fortschrittLesen(text: string, fehler: Feldfehler[]): Prozent | null {
  if (text.trim() === '') return null;
  const p = zahlLesen('prozent', text.trim());
  if (p.ok && vergleiche(p.wert, '0.00' as Prozent) >= 0 && vergleiche(p.wert, '100.00' as Prozent) <= 0)
    return p.wert;
  fehler.push({ feld: 'fortschritt', meldung: texte.vorgang.fehlerFortschritt });
  return null;
}

/** `VorgangSetzen` aus dem Formular; `neueId` vergibt die Kennung eines neuen Vorgangs. */
export function vorgangSetzenBefehl(
  plan: Bauzeitenplan,
  e: Vorgangsentwurf,
  neueId: () => VorgangId,
): Gelesen<VorgangSetzen> {
  const t = texte.vorgang;
  const fehler: Feldfehler[] = [];
  const bekannt = new Set(plan.vorgaenge.map((v) => v.id));

  const bezeichnung = e.bezeichnung.trim();
  if (bezeichnung === '') fehler.push({ feld: 'bezeichnung', meldung: t.fehlerBezeichnung });
  if (
    e.elternId !== null &&
    (!bekannt.has(e.elternId) || (e.id !== null && teilbaum(plan, e.id).has(e.elternId)))
  )
    fehler.push({ feld: 'elternId', meldung: t.fehlerEltern });
  const dauerText = e.dauer.trim();
  const dauer = /^\d{1,7}$/.test(dauerText) ? Number(dauerText) : null;
  if (dauer === null) fehler.push({ feld: 'dauer', meldung: t.fehlerDauer });
  const fruehesterBeginn = datumOderLeer(e.fruehesterBeginn, 'fruehesterBeginn', fehler);

  const vorgaenger: Anordnungsbeziehung[] = [];
  e.beziehungen.forEach((b, i) => {
    const vid = b.vorgaengerId;
    const vorgaengerOk = vid !== null && bekannt.has(vid) && vid !== e.id;
    if (!vorgaengerOk)
      fehler.push({ feld: `beziehung-${String(i)}-vorgaenger`, meldung: t.fehlerVorgaenger });
    const abstand = b.abstand.trim() === '' ? '0' : b.abstand.trim().replace('−', '-');
    if (!GANZ.test(abstand))
      fehler.push({ feld: `beziehung-${String(i)}-abstand`, meldung: t.fehlerAbstand });
    else if (vorgaengerOk) vorgaenger.push({ vorgaengerId: vid, art: b.art, abstand: Number(abstand) + 0 });
  });

  const istBeginn = datumOderLeer(e.istBeginn, 'istBeginn', fehler);
  const istEnde = datumOderLeer(e.istEnde, 'istEnde', fehler);
  const fortschritt = fortschrittLesen(e.fortschritt, fehler);

  if (fehler.length > 0 || dauer === null) return { ok: false, fehler };
  const ist: Isttermine | null =
    istBeginn === null && istEnde === null && fortschritt === null
      ? null
      : { beginn: istBeginn, ende: istEnde, fortschritt };
  const nummer = e.nummer.trim();
  return {
    ok: true,
    wert: {
      art: 'VorgangSetzen',
      nach: lage(plan, e.id, e.elternId),
      vorgang: {
        id: e.id ?? neueId(),
        nummer: nummer === '' ? null : nummer,
        bezeichnung,
        elternId: e.elternId,
        dauer,
        vorgaenger,
        fruehesterBeginn,
        bezug: e.bezug,
        ist,
      },
    },
  };
}

export function vorgangEntfernenBefehl(vorgangId: VorgangId): VorgangEntfernen {
  return { art: 'VorgangEntfernen', vorgangId };
}

/**
 * Was beim Entfernen mitgeht (Q5): Untervorgänge und Anordnungsbeziehungen anderer Vorgänge auf den Teilbaum. `null`: nichts
 * außer dem Vorgang selbst, keine Rückfrage nötig.
 */
export function vorgangEntfernenFrage(
  plan: Bauzeitenplan,
  id: VorgangId,
): { readonly kinder: number; readonly nachfolger: number } | null {
  const baum = teilbaum(plan, id);
  const kinder = baum.size - 1;
  let nachfolger = 0;
  for (const v of plan.vorgaenge) {
    if (baum.has(v.id)) continue;
    nachfolger += v.vorgaenger.filter((b) => baum.has(b.vorgaengerId)).length;
  }
  return kinder === 0 && nachfolger === 0 ? null : { kinder, nachfolger };
}
