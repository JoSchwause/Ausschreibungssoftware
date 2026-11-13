// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieterbefehle (Ticket 138; Vertrag v1.7a, D-127.4, D-127.17): `BieterUmbenennen`, `BieterangabenSetzen`, `BieterLoeschen`
// führt die Vergabe aus; jeden anderen Projektbefehl reicht `projektBefehlAusfuehren` unverändert an den Kern weiter. Die App
// nimmt für Projektbefehle diese Funktion. Rein und deterministisch (A2); das ChangeSet trägt das ganze Projekt vorher und
// nachher, die Umkehrung (Undo) ist die des Kerns (`projektChangeSetUmkehren`).

import { projektBefehlAusfuehren as imKern } from '@tethys/kern';
import type {
  Anschrift,
  Befehlsfehler,
  Befehlsfehlercode,
  Bieter,
  Bieterangaben,
  BieterId,
  Ergebnis,
  Projekt,
  ProjektBefehlAusfuehren,
  ProjektChangeSet,
} from '@tethys/vertrag';

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
  return i >= 0 ? i : nein('ungueltige-eingabe', `${art}: Bieter ${String(bieterId)} gibt es im Projekt nicht.`, 'bieterId');
}

/** Ersetzt den Bieter an Stelle `i`; ist er unverändert, bleibt das Projekt dasselbe (vorher gleich nachher). */
function ersetzt(projekt: Projekt, i: number, neu: Bieter, unveraendert: boolean): Antwort {
  if (unveraendert) return geaendert(projekt, projekt);
  return geaendert(projekt, { ...projekt, bieter: projekt.bieter.map((x, j) => (j === i ? neu : x)) });
}

// --- Bieterangaben: Form und Normalisierung (D-127.4) ---------------------------------------------------------------

const TEXTFELDER = ['ansprechperson', 'email', 'telefon'] as const;
const ANSCHRIFTFELDER = ['strasse', 'plz', 'ort'] as const;

const istObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Ein Feld: Text oder `null`; `''` wird `null`. Sonst der Name des Felds als Fehler. */
function textNormal(objekt: Record<string, unknown>, feld: string, pfad: string): string | null | { feld: string } {
  const w = objekt[feld];
  if (w === null || w === '') return null;
  return typeof w === 'string' ? w : { feld: `${pfad}.${feld}` };
}

/**
 * Prüft die Form der Bieterangaben und normalisiert sie (D-127.4): `''` wird `null`, eine Anschrift ohne jedes Teil
 * `null`, Angaben ohne jedes Feld `null` (der Block fehlt dann am Bieter). Kein Formatcheck für E-Mail und Telefon (U5);
 * Text bleibt sonst unverändert. Fehler: das Feld, dessen Form nicht stimmt.
 */
function angabenNormal(a: unknown): { ok: true; wert: Bieterangaben | null } | { ok: false; feld: string } {
  if (a === null) return { ok: true, wert: null };
  if (!istObjekt(a)) return { ok: false, feld: 'angaben' };
  let anschrift: Anschrift | null = null;
  if (a.anschrift !== null) {
    if (!istObjekt(a.anschrift)) return { ok: false, feld: 'angaben.anschrift' };
    const teile: Record<string, string | null> = {};
    for (const f of ANSCHRIFTFELDER) {
      const t = textNormal(a.anschrift, f, 'angaben.anschrift');
      if (t !== null && typeof t === 'object') return { ok: false, feld: t.feld };
      teile[f] = t;
    }
    if (ANSCHRIFTFELDER.some((f) => teile[f] !== null)) anschrift = teile as unknown as Anschrift;
  }
  const texte: Record<string, string | null> = {};
  for (const f of TEXTFELDER) {
    const t = textNormal(a, f, 'angaben');
    if (t !== null && typeof t === 'object') return { ok: false, feld: t.feld };
    texte[f] = t;
  }
  const { ansprechperson = null, email = null, telefon = null } = texte;
  if (anschrift === null && ansprechperson === null && email === null && telefon === null)
    return { ok: true, wert: null };
  return { ok: true, wert: { anschrift, ansprechperson, email, telefon } };
}

const gleicheAnschrift = (x: Anschrift | null, y: Anschrift | null): boolean =>
  x === y || (x !== null && y !== null && ANSCHRIFTFELDER.every((f) => x[f] === y[f]));

const gleicheAngaben = (x: Bieterangaben | null, y: Bieterangaben | null): boolean =>
  x === y ||
  (x !== null && y !== null && gleicheAnschrift(x.anschrift, y.anschrift) && TEXTFELDER.every((f) => x[f] === y[f]));

/** Der Bieter mit diesen Angaben; `null` lässt das Feld weg (nie `angaben: null`, Vertrag). */
function mitAngaben(bieter: Bieter, angaben: Bieterangaben | null): Bieter {
  const { angaben: _alt, ...rest } = bieter;
  return angaben === null ? rest : { ...rest, angaben };
}

/**
 * Führt einen Projektbefehl aus (Vertragstyp `ProjektBefehlAusfuehren`). Die Bieterbefehle brauchen ein Projekt
 * (`befehl-nicht-zustaendig` sonst) und einen Bieter des Projekts (`ungueltige-eingabe`, `feld: 'bieterId'`).
 */
export const projektBefehlAusfuehren: ProjektBefehlAusfuehren = (zustand, befehl, verweise) => {
  switch (befehl.art) {
    case 'BieterUmbenennen': {
      if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Projekt als Zustand übergeben.`);
      const i = stelle(zustand, befehl.bieterId, befehl.art);
      if (typeof i !== 'number') return i;
      if (typeof befehl.name !== 'string') return nein('ungueltige-eingabe', 'name muss ein Text sein.', 'name');
      const alt = zustand.bieter[i] as Bieter;
      return ersetzt(zustand, i, { ...alt, name: befehl.name }, alt.name === befehl.name);
    }
    case 'BieterangabenSetzen': {
      if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Projekt als Zustand übergeben.`);
      const i = stelle(zustand, befehl.bieterId, befehl.art);
      if (typeof i !== 'number') return i;
      const n = angabenNormal(befehl.angaben);
      if (!n.ok) return nein('ungueltige-eingabe', `${n.feld}: Form der Bieterangaben stimmt nicht.`, n.feld);
      const alt = zustand.bieter[i] as Bieter;
      return ersetzt(zustand, i, mitAngaben(alt, n.wert), gleicheAngaben(alt.angaben ?? null, n.wert));
    }
    default:
      return imKern(zustand, befehl, verweise);
  }
};
