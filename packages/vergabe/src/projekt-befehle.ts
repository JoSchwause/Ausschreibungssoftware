// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieterbefehle (Ticket 138; Vertrag v1.7a, D-127.4, D-127.17): `BieterUmbenennen`, `BieterangabenSetzen`, `BieterLoeschen`
// führt die Vergabe aus; jeden anderen Projektbefehl reicht `projektBefehlAusfuehren` unverändert an den Kern weiter. Rein und
// deterministisch (A2); das ChangeSet trägt das ganze Projekt vorher und nachher, die Umkehrung (Undo) ist die des Kerns
// (`projektChangeSetUmkehren`).
//
// Review D-82 (S9): Das Löschen hat eine schmale Funktion `bieterLoeschen`, deren Typ die Verweise verlangt; die App ruft sie
// dafür. Der Verteiler behält den optionalen Parameter des Vertragstyps (Aufrufe mit zwei Argumenten bleiben gültig) und weist
// `BieterLoeschen` ohne Verweise zur Laufzeit ab.

import { projektBefehlAusfuehren as imKern } from '@tethys/kern';
import type {
  Befehlsfehler,
  Befehlsfehlercode,
  Bieter,
  Bieterangaben,
  BieterangabenSetzen,
  BieterId,
  BieterLoeschen,
  BieterUmbenennen,
  Ergebnis,
  Projekt,
  ProjektBefehlAusfuehren,
  ProjektChangeSet,
  Verweisanzahl,
} from '@tethys/vertrag';
import { bieterangabenFormfehler, bieterangabenNormalisieren, gleicheBieterangaben } from './bieterangaben';
import { verweissperre } from './verweise';

type Antwort = Ergebnis<ProjektChangeSet, Befehlsfehler>;

function nein(code: Befehlsfehlercode, meldung: string, feld?: string): Antwort {
  return { ok: false, fehler: { code, meldung, ...(feld === undefined ? {} : { feld }) } };
}

const geaendert = (vorher: Projekt, nachher: Projekt): Antwort => ({
  ok: true,
  wert: { art: 'projekt', projektId: vorher.id, projekt: { vorher, nachher } },
});

/** Die Stelle des Bieters in `Projekt.bieter` oder ein Fehlerwert (`feld: 'bieterId'`). */
function stelle(projekt: Projekt, bieterId: BieterId, art: string): number | Antwort {
  const i = projekt.bieter.findIndex((x) => x.id === bieterId);
  return i >= 0
    ? i
    : nein('ungueltige-eingabe', `${art}: Bieter ${String(bieterId)} gibt es im Projekt nicht.`, 'bieterId');
}

/** Ersetzt den Bieter an Stelle `i`; ist er unverändert, bleibt das Projekt dasselbe (vorher gleich nachher). */
function ersetzt(projekt: Projekt, i: number, neu: Bieter, unveraendert: boolean): Antwort {
  if (unveraendert) return geaendert(projekt, projekt);
  return geaendert(projekt, { ...projekt, bieter: projekt.bieter.map((x, j) => (j === i ? neu : x)) });
}

/** Der Bieter mit diesen Angaben; `null` lässt das Feld weg (nie `angaben: null`, Vertrag). */
function mitAngaben(bieter: Bieter, angaben: Bieterangaben | null): Bieter {
  if (angaben !== null) return { ...bieter, angaben };
  const kopie: { -readonly [K in keyof Bieter]?: Bieter[K] } = { ...bieter };
  delete kopie.angaben;
  return kopie as Bieter;
}

function umbenennen(zustand: Projekt, befehl: BieterUmbenennen): Antwort {
  const i = stelle(zustand, befehl.bieterId, befehl.art);
  if (typeof i !== 'number') return i;
  if (typeof befehl.name !== 'string') return nein('ungueltige-eingabe', 'name muss ein Text sein.', 'name');
  const alt = zustand.bieter[i] as Bieter;
  return ersetzt(zustand, i, { ...alt, name: befehl.name }, alt.name === befehl.name);
}

function angabenSetzen(zustand: Projekt, befehl: BieterangabenSetzen): Antwort {
  const i = stelle(zustand, befehl.bieterId, befehl.art);
  if (typeof i !== 'number') return i;
  const feld = bieterangabenFormfehler(befehl.angaben);
  if (feld !== null) return nein('ungueltige-eingabe', `${feld}: Form der Bieterangaben stimmt nicht.`, feld);
  const neu = bieterangabenNormalisieren(befehl.angaben);
  const alt = zustand.bieter[i] as Bieter;
  return ersetzt(zustand, i, mitAngaben(alt, neu), gleicheBieterangaben(alt.angaben ?? null, neu));
}

function loeschen(
  zustand: Projekt,
  befehl: BieterLoeschen,
  verweise: readonly Verweisanzahl[] | undefined,
): Antwort {
  const i = stelle(zustand, befehl.bieterId, befehl.art);
  if (typeof i !== 'number') return i;
  const sperre = verweissperre(befehl.art, `den Bieter ${String(befehl.bieterId)}`, verweise, ['angebot']);
  if (sperre !== null) return { ok: false, fehler: sperre };
  return geaendert(zustand, { ...zustand, bieter: zustand.bieter.filter((_, j) => j !== i) });
}

/**
 * Löscht einen Bieter, nur ohne Angebot (D-127.2, D-127.4; Review D-82, S9): die schmale Funktion für die App, deren Typ die
 * Verweise verlangt (`{ art: 'angebot', anzahl }`, gezählt aus den Angeboten des Speichers). Ein Angebot sperrt
 * (`verweise-vorhanden` mit der Anzahl); ein Bieter, den das Projekt nicht hat: `ungueltige-eingabe` (`feld: 'bieterId'`).
 * Ergebnis wie `projektBefehlAusfuehren(zustand, befehl, verweise)`.
 */
export function bieterLoeschen(
  zustand: Projekt,
  befehl: BieterLoeschen,
  verweise: readonly Verweisanzahl[],
): Ergebnis<ProjektChangeSet, Befehlsfehler> {
  return loeschen(zustand, befehl, verweise);
}

/**
 * Führt einen Projektbefehl aus (Vertragstyp `ProjektBefehlAusfuehren`). Die Bieterbefehle brauchen ein Projekt
 * (`befehl-nicht-zustaendig` sonst) und einen Bieter des Projekts (`ungueltige-eingabe`, `feld: 'bieterId'`);
 * `BieterLoeschen` ohne `verweise`: `ungueltige-eingabe` (`feld: 'verweise'`, die App nimmt dafür `bieterLoeschen`).
 */
export const projektBefehlAusfuehren: ProjektBefehlAusfuehren = (zustand, befehl, verweise) => {
  switch (befehl.art) {
    case 'BieterUmbenennen':
    case 'BieterangabenSetzen':
    case 'BieterLoeschen':
      if (zustand === null)
        return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Projekt als Zustand übergeben.`);
      if (befehl.art === 'BieterUmbenennen') return umbenennen(zustand, befehl);
      if (befehl.art === 'BieterangabenSetzen') return angabenSetzen(zustand, befehl);
      return loeschen(zustand, befehl, verweise);
    default:
      return imKern(zustand, befehl, verweise);
  }
};
