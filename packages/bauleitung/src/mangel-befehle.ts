// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Mangel (Ticket 111 Punkt 1; `vertrag` v1.6 Punkt 6, D-57, D-97.13): Ausführen, Anwenden, Umkehren und der
// Vorschlag der nächsten Nummer. Das ChangeSet trägt den ganzen, kleinen Mangel vorher und nachher. Anders als die übrigen
// Ausführer sieht dieser den Bestand des Projekts (Kennung und Nummer der übrigen Mängel), weil er die eindeutige Nummer
// prüft; `speicher` hält sie zusätzlich (`konflikt`). Der Status wechselt nur über Verlaufseinträge nach der Statustabelle
// (`MANGELSTATUSWECHSEL`). Leere Texte (`''`) werden als `null` gespeichert (D-111.4). Rein (A2).

import type {
  Befehlsfehler,
  Ergebnis,
  Mangel,
  MangelangabenSetzen,
  MangelBefehlAusfuehren,
  MangelChangeSet,
  MangelChangeSetAnwenden,
  MangelChangeSetUmkehren,
  Mangelverlaufseintrag,
} from '@tethys/vertrag';
import { type Abweisung, istFehler, istKennung, nein, textOderNull } from './befehlshilfen';
import { istKalendertag } from './datum';
import { istMangelstatus, statuswechselZulaessig } from './mangelstatus';

type Antwort = Ergebnis<MangelChangeSet, Befehlsfehler>;

/** Die Angaben eines Mangels, die `MangelangabenSetzen` als ganze Werte setzt. */
type Mangelangaben = Omit<MangelangabenSetzen, 'art'>;

/** Form einer GlobalId (Zusage der Marke `IfcGlobalId`, D-97.4): 22 Zeichen aus dem IFC-Base64-Alphabet. */
const GLOBAL_ID = /^[0-9A-Za-z_$]{22}$/;

/** Prüft die Angaben und gibt sie in Speicherform zurück (leere Texte als `null`). */
function angabenLesen(a: Mangelangaben): Mangelangaben | Abweisung {
  if (typeof a.titel !== 'string' || a.titel.trim() === '')
    return nein('ungueltige-eingabe', 'Der Titel ist leer', 'titel');
  const beschreibung = textOderNull(a.beschreibung);
  if (beschreibung === undefined)
    return nein('ungueltige-eingabe', 'Die Beschreibung ist kein Text', 'beschreibung');
  const ort = textOderNull(a.ort);
  if (ort === undefined) return nein('ungueltige-eingabe', 'Der Ort ist kein Text', 'ort');
  if (a.auftragsLvId !== null && !istKennung(a.auftragsLvId))
    return nein('ungueltige-eingabe', 'Keine Kennung eines Auftrags-LV', 'auftragsLvId');
  if (a.positionId !== null && (!istKennung(a.positionId) || a.auftragsLvId === null))
    return nein('ungueltige-eingabe', 'Eine Position braucht ein Auftrags-LV', 'positionId');
  if (a.bauteil !== null) {
    const { bauwerksmodellId, globalId } = a.bauteil;
    if (!GLOBAL_ID.test(globalId) || (bauwerksmodellId !== null && !istKennung(bauwerksmodellId)))
      return nein('ungueltige-eingabe', `Kein Bauteil: GlobalId ${JSON.stringify(globalId)}`, 'bauteil');
  }
  if (!istKalendertag(a.festgestellt))
    return nein('ungueltige-eingabe', `Kein Kalendertag: ${JSON.stringify(a.festgestellt)}`, 'festgestellt');
  if (a.frist !== null && !istKalendertag(a.frist))
    return nein('ungueltige-eingabe', `Kein Kalendertag: ${JSON.stringify(a.frist)}`, 'frist');
  return {
    titel: a.titel,
    beschreibung,
    ort,
    auftragsLvId: a.auftragsLvId,
    positionId: a.positionId,
    bauteil: a.bauteil,
    festgestellt: a.festgestellt,
    frist: a.frist,
  };
}

/**
 * Prüft einen Verlaufseintrag als Nachfolger von `vorheriger` (`null`: erster Eintrag) und gibt ihn in Speicherform zurück.
 * Reihenfolge: Form (die Frist der Mängelanzeige nur bei `angezeigt`, D-66), dann Statuswechsel, dann Datum gegen den vorigen
 * Eintrag.
 */
function eintragLesen(
  e: Mangelverlaufseintrag,
  vorheriger: Mangelverlaufseintrag | null,
): Mangelverlaufseintrag | Abweisung {
  if (!istMangelstatus(e.status))
    return nein('ungueltige-eingabe', `Unbekannter Status: ${JSON.stringify(e.status)}`, 'status');
  if (!istKalendertag(e.datum))
    return nein('ungueltige-eingabe', `Kein Kalendertag: ${JSON.stringify(e.datum)}`, 'datum');
  const bemerkung = textOderNull(e.bemerkung);
  if (bemerkung === undefined) return nein('ungueltige-eingabe', 'Die Bemerkung ist kein Text', 'bemerkung');
  if (e.frist !== undefined && e.status !== 'angezeigt')
    return nein('ungueltige-eingabe', `Eine Frist gehört nur zu angezeigt, nicht zu ${e.status}`, 'frist');
  if (e.frist !== undefined && !istKalendertag(e.frist))
    return nein('ungueltige-eingabe', `Kein Kalendertag: ${JSON.stringify(e.frist)}`, 'frist');
  const von = vorheriger?.status ?? null;
  if (!statuswechselZulaessig(von, e.status))
    return nein(
      'statuswechsel-unzulaessig',
      von === null
        ? `Der Verlauf beginnt mit ${e.status}, nicht mit offen`
        : `Statuswechsel ${von} → ${e.status} ist nicht zulässig`,
      'status',
    );
  if (vorheriger !== null && e.datum < vorheriger.datum)
    return nein(
      'ungueltige-eingabe',
      `${e.datum} liegt vor dem vorigen Eintrag (${vorheriger.datum})`,
      'datum',
    );
  // Kopie statt Neubau: `frist` (D-66) und spätere additive Felder bleiben (D-111.9, Q5).
  return { ...e, bemerkung };
}

/** Prüft den ganzen Verlauf eines neuen Mangels gegen seinen Tag der Feststellung. */
function verlaufLesen(
  verlauf: readonly Mangelverlaufseintrag[],
  festgestellt: string,
): Mangelverlaufseintrag[] | Abweisung {
  if (verlauf.length === 0) return nein('ungueltige-eingabe', 'Der Verlauf ist leer', 'verlauf');
  const gelesen: Mangelverlaufseintrag[] = [];
  for (const e of verlauf) {
    const g = eintragLesen(e, gelesen.at(-1) ?? null);
    if (istFehler(g)) return g;
    gelesen.push(g);
  }
  return festgestelltPasst(festgestellt, gelesen) ?? gelesen;
}

/** Die Feststellung liegt nicht nach dem ersten Verlaufseintrag (Lesart `Mangel`, `MangelangabenSetzen`). */
function festgestelltPasst(
  festgestellt: string,
  verlauf: readonly Mangelverlaufseintrag[],
): Abweisung | null {
  const erster = verlauf[0];
  if (erster !== undefined && festgestellt > erster.datum)
    return nein(
      'ungueltige-eingabe',
      `Festgestellt am ${festgestellt}, aber der Verlauf beginnt am ${erster.datum}`,
      'festgestellt',
    );
  return null;
}

function changeSet(vorher: Mangel | null, nachher: Mangel | null): Antwort {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('ChangeSet ohne Mangel');
  return { ok: true, wert: { art: 'mangel', mangelId: id, mangel: { vorher, nachher } } };
}

/**
 * Führt einen Befehl am Mangel aus. `MangelAnlegen` braucht `zustand === null`, jeder andere Befehl einen Zustand; sonst
 * `befehl-nicht-zustaendig`. `bestand`: Kennung und Nummer der Mängel des Projekts; ein Eintrag mit der Kennung des Mangels
 * selbst zählt nicht.
 */
export const mangelBefehlAusfuehren: MangelBefehlAusfuehren = (zustand, befehl, bestand) => {
  if (befehl.art === 'MangelAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', 'MangelAnlegen: der Mangel existiert schon.');
    const m = befehl.mangel;
    if (!Number.isSafeInteger(m.nummer) || m.nummer < 1)
      return nein('ungueltige-eingabe', `Keine Nummer ≥ 1: ${String(m.nummer)}`, 'nummer');
    const angaben = angabenLesen(m);
    if (istFehler(angaben)) return angaben;
    const verlauf = verlaufLesen(m.verlauf, m.festgestellt);
    if (istFehler(verlauf)) return verlauf;
    if (bestand.some((b) => b.id !== m.id && b.nummer === m.nummer))
      return nein(
        'ungueltige-eingabe',
        `Die Nummer ${String(m.nummer)} ist im Projekt schon vergeben`,
        'nummer',
      );
    return changeSet(null, { ...m, ...angaben, verlauf });
  }
  if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Mangel übergeben.`);
  const m = zustand.mangel;
  switch (befehl.art) {
    case 'MangelangabenSetzen': {
      const angaben = angabenLesen(befehl);
      if (istFehler(angaben)) return angaben;
      const f = festgestelltPasst(angaben.festgestellt, m.verlauf);
      if (f) return f;
      return changeSet(m, { ...m, ...angaben });
    }
    case 'MangelstatusSetzen': {
      const letzter = m.verlauf.at(-1);
      if (letzter === undefined) throw new Error('Mangel ohne Verlauf'); // der Vertrag sagt mindestens einen Eintrag zu
      const e = eintragLesen(befehl.eintrag, letzter);
      if (istFehler(e)) return e;
      return changeSet(m, { ...m, verlauf: [...m.verlauf, e] });
    }
    case 'MangelLoeschen':
      return changeSet(m, null);
  }
};

/** Wendet ein ChangeSet an: `nachher` ist der neue Stand, `null` heißt gelöscht (ganzes Aggregat). */
export const mangelChangeSetAnwenden: MangelChangeSetAnwenden = (_zustand, changeSet) => {
  const nachher = changeSet.mangel.nachher;
  return nachher === null ? null : { mangel: nachher };
};

/** Kehrt ein ChangeSet um: Tausch von `vorher` und `nachher`. */
export const mangelChangeSetUmkehren: MangelChangeSetUmkehren = (changeSet) => ({
  ...changeSet,
  mangel: { vorher: changeSet.mangel.nachher, nachher: changeSet.mangel.vorher },
});

/**
 * Vorschlag für die Nummer eines neuen Mangels: die höchste Nummer im Bestand + 1, im leeren Projekt 1. Lücken (nach dem
 * Löschen) werden nicht aufgefüllt, damit eine Nummer nie zwei Mängel nacheinander bezeichnet.
 */
export function naechsteMangelnummer(bestand: readonly Pick<Mangel, 'nummer'>[]): number {
  return bestand.reduce((hoechste, m) => Math.max(hoechste, m.nummer), 0) + 1;
}
