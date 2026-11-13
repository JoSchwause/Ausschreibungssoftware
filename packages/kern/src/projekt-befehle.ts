// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektbefehle (Ticket 30, Punkt 11; ADR 0011): ProjektAnlegen, ProjektStammdatenSetzen, BieterAnlegen, ProjektLoeschen.
// `(Projekt | null, Befehl) → Ergebnis<ProjektChangeSet, Befehlsfehler>`: rein, ohne Uhr und Zufall (A2); alle Kennungen
// bringt der Befehl mit. Das ChangeSet trägt den ganzen alten und neuen Stand (`projekt.vorher`/`nachher`); damit ist es
// ohne Vorzustand umkehrbar (`projektChangeSetUmkehren`).
//
// Text wird unverändert übernommen (U5): ein leerer Projekt- oder Bietername ist erlaubt, wie `FELD_ANNAHMEN`. Geprüft
// wird nur die Form (Typ der Felder, nicht leere Kennungen) und die Eindeutigkeit der Bieter-ID.

import type {
  Bauherr,
  Befehlsfehler,
  Bieter,
  Projekt,
  ProjektBefehlAusfuehren,
  ProjektChangeSet,
} from '@tethys/vertrag';
import { nein, ok } from './fehler';

/** Fehlertext zur Form des Bauherrn oder `null`. */
function bauherrFehler(b: unknown): string | null {
  if (typeof b !== 'object' || b === null || Array.isArray(b)) return 'bauherr muss ein Objekt sein.';
  const { name, anschrift } = b as { name?: unknown; anschrift?: unknown };
  if (typeof name !== 'string') return 'bauherr.name muss ein Text sein.';
  if (anschrift !== null && typeof anschrift !== 'string')
    return 'bauherr.anschrift muss ein Text oder null sein.';
  return null;
}

const istKennung = (x: unknown): boolean => typeof x === 'string' && x !== '';

function stammdatenFehler(name: unknown, bauherr: unknown): Befehlsfehler | null {
  const fehlerwert = (meldung: string, feld: string): Befehlsfehler => {
    const e = nein('ungueltige-eingabe', meldung, undefined, feld);
    if (e.ok) throw new Error('unerreichbar');
    return e.fehler;
  };
  if (typeof name !== 'string') return fehlerwert('name muss ein Text sein.', 'name');
  const b = bauherrFehler(bauherr);
  return b === null ? null : fehlerwert(b, 'bauherr');
}

const changeSet = (projekt: Projekt, vorher: Projekt | null, nachher: Projekt | null): ProjektChangeSet => ({
  art: 'projekt',
  projektId: projekt.id,
  projekt: { vorher, nachher },
});

/**
 * Führt einen Projektbefehl aus. `ProjektAnlegen` braucht `zustand === null`, jeder andere Befehl ein Projekt; sonst
 * `befehl-nicht-zustaendig`. `ProjektStammdatenSetzen` mit denselben Werten liefert `vorher` gleich `nachher` (keine
 * Änderung). `ProjektLoeschen`: `nachher: null`, `vorher` ist der volle Stand samt Bietern; ob noch LVs oder Angebote
 * am Projekt hängen, prüft `speicher` (`konflikt`).
 */
export const projektBefehlAusfuehren: ProjektBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'ProjektAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', 'ProjektAnlegen: das Projekt existiert schon.');
    if (!istKennung(befehl.id))
      return nein('ungueltige-eingabe', 'id muss eine nicht leere Kennung sein.', undefined, 'id');
    const f = stammdatenFehler(befehl.name, befehl.bauherr);
    if (f !== null) return { ok: false, fehler: f };
    const neu: Projekt = { id: befehl.id, name: befehl.name, bauherr: befehl.bauherr, bieter: [] };
    return ok(changeSet(neu, null, neu));
  }
  if (zustand === null)
    return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Projekt als Zustand übergeben.`);
  switch (befehl.art) {
    case 'ProjektStammdatenSetzen': {
      const f = stammdatenFehler(befehl.name, befehl.bauherr);
      if (f !== null) return { ok: false, fehler: f };
      const bauherr: Bauherr = befehl.bauherr;
      const gleich =
        zustand.name === befehl.name &&
        zustand.bauherr.name === bauherr.name &&
        zustand.bauherr.anschrift === bauherr.anschrift;
      return ok(changeSet(zustand, zustand, gleich ? zustand : { ...zustand, name: befehl.name, bauherr }));
    }
    case 'BieterAnlegen': {
      const b: unknown = befehl.bieter;
      if (typeof b !== 'object' || b === null) {
        return nein('ungueltige-eingabe', 'bieter muss ein Objekt sein.', undefined, 'bieter');
      }
      const { id, name } = b as { id?: unknown; name?: unknown };
      if (!istKennung(id)) {
        return nein(
          'ungueltige-eingabe',
          'bieter.id muss eine nicht leere Kennung sein.',
          undefined,
          'bieter.id',
        );
      }
      if (typeof name !== 'string') {
        return nein('ungueltige-eingabe', 'bieter.name muss ein Text sein.', undefined, 'bieter.name');
      }
      if (zustand.bieter.some((x) => x.id === id)) {
        return nein('id-vergeben', `Bieter-ID bereits vergeben: ${String(id)}`, undefined, 'bieter.id');
      }
      const neu: Bieter = { id: befehl.bieter.id, name: befehl.bieter.name };
      return ok(changeSet(zustand, zustand, { ...zustand, bieter: [...zustand.bieter, neu] }));
    }
    case 'ProjektLoeschen':
      return ok(changeSet(zustand, zustand, null));
    // Vertrag v1.7a (Ticket 127), mechanisch: Projektangaben liefert Ticket 137 hier; die Bieterbefehle führt `vergabe` aus
    // (Ticket 138, D-127.17) und bleiben hier abgewiesen.
    case 'ProjektangabenSetzen':
      return nein(
        'befehl-nicht-zustaendig',
        `Befehl ${befehl.art} ist im Kern noch nicht umgesetzt (Ticket 137).`,
      );
    case 'BieterUmbenennen':
    case 'BieterLoeschen':
    case 'BieterangabenSetzen':
      return nein('befehl-nicht-zustaendig', `Befehl ${befehl.art} führt die Vergabe aus, nicht der Kern.`);
  }
};

/**
 * Wendet ein Projekt-ChangeSet an: der neue Stand ist `projekt.nachher` (`null`: das Projekt ist gelöscht). Passt das
 * ChangeSet nicht zum Zustand (ein Projekt anlegen, wo eins ist, oder ändern, wo keins ist), ist das ein Programmfehler.
 */
export function projektChangeSetAnwenden(zustand: Projekt | null, cs: ProjektChangeSet): Projekt | null {
  if ((zustand === null) !== (cs.projekt.vorher === null))
    throw new Error('Projekt-ChangeSet passt nicht zum Zustand.');
  return cs.projekt.nachher;
}

/** Die Umkehrung (Undo): `vorher` und `nachher` vertauscht; Hinweise gehen nicht mit. */
export function projektChangeSetUmkehren(cs: ProjektChangeSet): ProjektChangeSet {
  return {
    art: cs.art,
    projektId: cs.projektId,
    projekt: { vorher: cs.projekt.nachher, nachher: cs.projekt.vorher },
  };
}
