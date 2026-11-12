// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bautagebucheintrag (Ticket 111 Punkt 4; `vertrag` v1.6 Punkt 6, D-57, D-97.13): Setzen (anlegen oder ersetzen),
// Löschen, Anwenden, Umkehren. Das ChangeSet trägt den ganzen Eintrag vorher und nachher. Der Ausführer sieht den Bestand
// des Projekts (Kennung und Datum der übrigen Einträge), weil er „ein Eintrag je Datum“ prüft; `speicher` hält es
// zusätzlich (`konflikt`). Temperaturen und Köpfe sind ganze Zahlen (N1 gilt nicht). Leere Texte werden `null` (D-111.4).
// Rein (A2).

import type {
  Bautagebucheintrag,
  BautagebucheintragBefehlAusfuehren,
  BautagebucheintragChangeSet,
  BautagebucheintragChangeSetAnwenden,
  BautagebucheintragChangeSetUmkehren,
  Befehlsfehler,
  Ergebnis,
} from '@tethys/vertrag';
import { type Abweisung, istFehler, nein, textOderNull } from './befehlshilfen';
import { istKalendertag } from './datum';

type Antwort = Ergebnis<BautagebucheintragChangeSet, Befehlsfehler>;

function ganzOderNull(wert: unknown): boolean {
  return wert === null || Number.isSafeInteger(wert);
}

/** Prüft die Form eines Eintrags und gibt ihn in Speicherform zurück (leere Texte als `null`). */
function eintragLesen(e: Bautagebucheintrag): Bautagebucheintrag | Abweisung {
  if (!istKalendertag(e.datum))
    return nein('ungueltige-eingabe', `Kein Kalendertag: ${JSON.stringify(e.datum)}`, 'datum');
  const { temperaturMin, temperaturMax } = e.wetter;
  if (!ganzOderNull(temperaturMin))
    return nein('ungueltige-eingabe', 'Die tiefste Temperatur ist keine ganze Zahl', 'temperaturMin');
  if (!ganzOderNull(temperaturMax))
    return nein('ungueltige-eingabe', 'Die höchste Temperatur ist keine ganze Zahl', 'temperaturMax');
  if (temperaturMin !== null && temperaturMax !== null && temperaturMin > temperaturMax)
    return nein(
      'ungueltige-eingabe',
      `Tiefste Temperatur ${String(temperaturMin)} über der höchsten ${String(temperaturMax)}`,
      'temperaturMin',
    );
  const beschreibung = textOderNull(e.wetter.beschreibung);
  if (beschreibung === undefined)
    return nein('ungueltige-eingabe', 'Die Wetterbeschreibung ist kein Text', 'beschreibung');
  const firmen = new Set<string>();
  for (const a of e.arbeitskraefte) {
    if (typeof a.firma !== 'string' || a.firma.trim() === '')
      return nein('ungueltige-eingabe', 'Arbeitskräfte ohne Firma', 'firma');
    if (firmen.has(a.firma)) return nein('ungueltige-eingabe', `Firma ${a.firma} steht zweimal da`, 'firma');
    firmen.add(a.firma);
    if (!Number.isSafeInteger(a.anzahl) || a.anzahl < 0)
      return nein('ungueltige-eingabe', `Keine Kopfzahl ≥ 0 bei ${a.firma}: ${String(a.anzahl)}`, 'anzahl');
  }
  const texte = {
    geraete: textOderNull(e.geraete),
    leistungen: textOderNull(e.leistungen),
    behinderungen: textOderNull(e.behinderungen),
    vorkommnisse: textOderNull(e.vorkommnisse),
  };
  for (const [feld, wert] of Object.entries(texte)) {
    if (wert === undefined) return nein('ungueltige-eingabe', `${feld} ist kein Text`, feld);
  }
  return {
    id: e.id,
    projektId: e.projektId,
    datum: e.datum,
    wetter: { beschreibung, temperaturMin, temperaturMax },
    arbeitskraefte: e.arbeitskraefte.map(({ firma, anzahl }) => ({ firma, anzahl })),
    geraete: texte.geraete ?? null,
    leistungen: texte.leistungen ?? null,
    behinderungen: texte.behinderungen ?? null,
    vorkommnisse: texte.vorkommnisse ?? null,
  };
}

function changeSet(vorher: Bautagebucheintrag | null, nachher: Bautagebucheintrag | null): Antwort {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('ChangeSet ohne Bautagebucheintrag');
  return {
    ok: true,
    wert: { art: 'bautagebucheintrag', bautagebucheintragId: id, bautagebucheintrag: { vorher, nachher } },
  };
}

/**
 * Führt einen Befehl am Bautagebucheintrag aus. `BautagebucheintragSetzen` legt ohne Zustand an und ersetzt mit Zustand
 * (gleiche Kennung und gleiches Projekt, sonst `ungueltige-eingabe` mit `feld: 'id'` bzw. `'projektId'`);
 * `BautagebucheintragLoeschen` braucht einen Zustand (sonst `befehl-nicht-zustaendig`). `bestand`: Kennung und Datum der
 * Einträge des Projekts; ein Eintrag mit der eigenen Kennung zählt nicht.
 */
export const bautagebucheintragBefehlAusfuehren: BautagebucheintragBefehlAusfuehren = (
  zustand,
  befehl,
  bestand,
) => {
  if (befehl.art === 'BautagebucheintragLoeschen') {
    if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Eintrag übergeben.`);
    return changeSet(zustand.bautagebucheintrag, null);
  }
  const vorher = zustand?.bautagebucheintrag ?? null;
  const e = befehl.eintrag;
  if (vorher !== null && e.id !== vorher.id)
    return nein('ungueltige-eingabe', 'Ersetzen mit einer anderen Kennung', 'id');
  if (vorher !== null && e.projektId !== vorher.projektId)
    return nein('ungueltige-eingabe', 'Ersetzen in einem anderen Projekt', 'projektId');
  const nachher = eintragLesen(e);
  if (istFehler(nachher)) return nachher;
  if (bestand.some((b) => b.id !== e.id && b.datum === e.datum))
    return nein('ungueltige-eingabe', `Zum ${e.datum} gibt es schon einen Eintrag`, 'datum');
  return changeSet(vorher, nachher);
};

/** Wendet ein ChangeSet an: `nachher` ist der neue Stand, `null` heißt gelöscht (ganzes Aggregat). */
export const bautagebucheintragChangeSetAnwenden: BautagebucheintragChangeSetAnwenden = (
  _zustand,
  changeSet,
) => {
  const nachher = changeSet.bautagebucheintrag.nachher;
  return nachher === null ? null : { bautagebucheintrag: nachher };
};

/** Kehrt ein ChangeSet um: Tausch von `vorher` und `nachher`. */
export const bautagebucheintragChangeSetUmkehren: BautagebucheintragChangeSetUmkehren = (changeSet) => ({
  ...changeSet,
  bautagebucheintrag: {
    vorher: changeSet.bautagebucheintrag.nachher,
    nachher: changeSet.bautagebucheintrag.vorher,
  },
});
