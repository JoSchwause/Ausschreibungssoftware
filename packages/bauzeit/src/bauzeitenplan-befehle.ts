// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauzeitenplan (Ticket 109 Punkt 2; `vertrag` v1.6 Punkt 4, D-57, D-97.9): Ausführen, Anwenden, Umkehren. Das
// ChangeSet trägt den ganzen Plan vorher und nachher (D-57). Der Ausführer sieht nur den Plan und prüft die Form
// (`ungueltige-eingabe` mit `feld`, Lesarten an den Vertragstypen); fachlich Auffälliges (Zyklus über Anordnungsbeziehungen,
// Beziehung oder Terminvorgabe an einem Sammelvorgang, Ist-Ende vor Ist-Beginn) bleibt ein Befund der Terminrechnung (U5).
// Rein (A2).

import type {
  Bauzeitenplan,
  BauzeitenplanBefehlAusfuehren,
  BauzeitenplanChangeSet,
  BauzeitenplanChangeSetAnwenden,
  BauzeitenplanChangeSetUmkehren,
  Befehlsfehler,
  Befehlsfehlercode,
  Ergebnis,
  Vorgang,
  VorgangEntfernen,
  VorgangId,
  VorgangSetzen,
} from '@tethys/vertrag';

type Antwort = Ergebnis<BauzeitenplanChangeSet, Befehlsfehler>;

function nein(code: Befehlsfehlercode, meldung: string, feld?: string): Antwort {
  return { ok: false, fehler: feld === undefined ? { code, meldung } : { code, meldung, feld } };
}

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
    return changeSet(null, befehl.bauzeitenplan);
  }
  if (zustand === null)
    return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Bauzeitenplan übergeben.`);
  const plan = zustand.bauzeitenplan;
  switch (befehl.art) {
    case 'BauzeitenplankopfSetzen':
      return changeSet(plan, {
        ...plan,
        name: befehl.name,
        projektbeginn: befehl.projektbeginn,
        kalender: befehl.kalender,
      });
    case 'VorgangSetzen':
      return vorgangSetzen(plan, befehl);
    case 'VorgangEntfernen':
      return vorgangEntfernen(plan, befehl);
    case 'BauzeitenplanLoeschen':
      return changeSet(plan, null);
  }
};

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

/** Legt an oder ersetzt, samt Lage (`nach`); der Teilbaum eines ersetzten Vorgangs zieht mit. */
function vorgangSetzen(plan: Bauzeitenplan, befehl: VorgangSetzen): Antwort {
  const neu = befehl.vorgang;
  const alt = indexVon(plan.vorgaenge, neu.id);
  let block: Vorgang[] = [neu];
  let rest: readonly Vorgang[] = plan.vorgaenge;
  if (alt >= 0) {
    const ende = teilbaumEnde(plan.vorgaenge, alt);
    block = [neu, ...plan.vorgaenge.slice(alt + 1, ende)];
    rest = [...plan.vorgaenge.slice(0, alt), ...plan.vorgaenge.slice(ende)];
  }
  let stelle: number;
  if (befehl.nach === null) stelle = neu.elternId === null ? 0 : indexVon(rest, neu.elternId) + 1;
  else stelle = teilbaumEnde(rest, indexVon(rest, befehl.nach));
  return changeSet(plan, { ...plan, vorgaenge: [...rest.slice(0, stelle), ...block, ...rest.slice(stelle)] });
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
