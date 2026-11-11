// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle zur Ordnungszahl (Ticket 06): OzMaskeSetzen, OrdnungszahlSetzen, Umnummerieren. Jeder ist
// `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`: rein, ohne Zufall und Uhr (A2). Alle Regeln (Längen,
// Zeichen, Schritte, Annahmen) stehen in `ozregeln.ts`; hier steht nur der Ablauf.
//
// Die OZ ist Anzeigedatum (A7): kein Befehl ändert eine ID, die Baumstruktur oder eine Summe. Das ChangeSet nennt genau
// die Knoten, deren `ordnungszahl` sich ändert; Summen bleiben leer (A6). Umnummerieren und OzMaskeSetzen sind alles
// oder nichts: kann ein Knoten nicht nummeriert werden, gibt es einen Fehlerwert und keine einzige Änderung. Weicht eine
// Geschwistergruppe auf einen kleineren Schritt aus (F2, E-09), trägt das ChangeSet einen Hinweis je Gruppe.

import type {
  Befehlsfehler,
  Befehlshinweis,
  Ergebnis,
  Knoten,
  LvChangeSet,
  LvZustand,
  Ordnungszahl,
  OrdnungszahlSetzen,
  OzMaske,
  OzMaskeSetzen,
  Umnummerieren,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { befehlshinweis } from './hinweise';
import { ebenenbeitrag, obersteEbeneFehler } from './regeln';
import { ebenenBis, indexVon, ohneKnoten } from './struktur';
import type { Baumindex } from './struktur';
import {
  gliederungsTeil,
  indexFehler,
  maskeFehler,
  maskenGleich,
  ozFehler,
  ozSchluessel,
  ozZerlegen,
  ozZusammensetzen,
  POSITION_SCHRITT,
  positionsTeil,
  stellenFuer,
  zaehlerSchritt,
} from './ozregeln';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Neue OZ je Knoten-ID in Vorordnung (Einfügereihenfolge der `Map`). */
type NeueOz = Map<string, Ordnungszahl>;

/** Ergebnis der Vergabe: neue OZ und Hinweise (Ausweichen auf einen kleineren Schritt, F2). */
export interface Vergabe {
  readonly oz: NeueOz;
  readonly hinweise: Befehlshinweis[];
}

/**
 * Vergibt die OZ aller Nachfahren von `elternId` (Gliederung +1, Positionen +10, führende Nullen; passt ein Zähler nicht,
 * weicht die Geschwistergruppe auf Schritt 5, 2, 1 aus, E-09, und es entsteht ein Hinweis `oz-schritt-ausgewichen` an
 * der ersten Position der Gruppe). `ebene` ist die Zahl der Stufen bis einschließlich `elternId` (0 für die LV-Wurzel),
 * `praefix` die Teile von dessen OZ. Gibt den ersten Fehler zurück (Knoten nennend) oder `null`: `oz-ueberlauf`, wenn
 * auch Schritt 1 (Position) bzw. die Gliederungsnummer nicht in die Stellen passt; `maske-ungueltig`, wenn die Maske den
 * Knoten nicht fasst (Stufe, Index). Die Rekursion ist durch die Stufenzahl der Maske (höchstens 5) begrenzt.
 */
export function nummeriere(
  idx: Baumindex,
  maske: OzMaske,
  elternId: string,
  ebene: number,
  praefix: readonly string[],
  aus: Vergabe,
): Befehlsfehler | null {
  const befehlsfehler = (
    code: 'maske-ungueltig' | 'oz-ueberlauf',
    meldung: string,
    k: Knoten,
  ): Befehlsfehler => {
    const e = nein(code, meldung, k.id);
    if (e.ok) throw new Error('unerreichbar');
    return e.fehler;
  };
  const kinder = idx.kinder.get(elternId) ?? [];
  // Zähler der Geschwistergruppe vorab zählen, damit der Schritt für die ganze Gruppe feststeht.
  // (Gliederungen haben Standardschritt 1 und damit keinen Rückfall.)
  let anzahlPositionen = 0;
  for (const k of kinder) {
    if (k.art === 'position' && !(k.ozIndex !== null && anzahlPositionen > 0)) anzahlPositionen++;
  }
  // Ohne passenden Schritt gilt Schritt 1; der erste Knoten ohne Platz wird dann unten abgewiesen.
  const gefunden = zaehlerSchritt(maske.position, anzahlPositionen, POSITION_SCHRITT);
  const positionsSchritt = gefunden ?? 1;
  const erste = kinder.find((k) => k.art === 'position');
  if (gefunden !== null && gefunden < POSITION_SCHRITT && erste !== undefined) {
    aus.hinweise.push(
      befehlshinweis(
        'oz-schritt-ausgewichen',
        `Die ${String(anzahlPositionen)} Positionen unter ${elternId} passen mit Schritt ${String(POSITION_SCHRITT)} nicht in ${String(maske.position.laenge)} Stellen; die Vergabe weicht auf Schritt ${String(gefunden)} aus.`,
        erste.id,
        'ordnungszahl',
      ),
    );
  }
  let gliederungen = 0;
  let positionen = 0;
  let grundteil: string | null = null;
  for (const k of kinder) {
    if (k.art === 'hinweis') continue;
    if (k.art === 'position') {
      const f = indexFehler(maske, 'position', k.ozIndex);
      if (f !== null) return befehlsfehler('maske-ungueltig', `Position ${k.id}: ${f}`, k);
      if (stellenFuer(maske, 'position', ebene) === null) {
        return befehlsfehler(
          'maske-ungueltig',
          `Position ${k.id} liegt in Stufe ${String(ebene)}; die Maske hat nur ${String(maske.gliederung.length)} Gliederungsstufen.`,
          k,
        );
      }
      let teil: string | null;
      if (k.ozIndex !== null && grundteil !== null) {
        teil = grundteil;
      } else {
        positionen++;
        teil = positionsTeil(maske.position, positionen, positionsSchritt);
        if (teil === null) {
          return befehlsfehler(
            'oz-ueberlauf',
            `Position ${k.id} ist die ${String(positionen)}. Position unter ${elternId}; ihre Nummer passt auch mit Schritt 1 nicht in ${String(maske.position.laenge)} Stellen.`,
            k,
          );
        }
        grundteil = teil;
      }
      aus.oz.set(k.id, ozZusammensetzen(maske, [...praefix, teil]));
      continue;
    }
    const stufe = ebene + ebenenbeitrag(k.art);
    const stelle = stellenFuer(maske, 'gliederung', stufe)?.at(-1);
    if (stelle === undefined) {
      return befehlsfehler(
        'maske-ungueltig',
        `${k.art === 'los' ? 'Los' : 'Titel'} ${k.id} liegt in Stufe ${String(stufe)}; die Maske hat nur ${String(maske.gliederung.length)} Gliederungsstufen.`,
        k,
      );
    }
    gliederungen++;
    const teil = gliederungsTeil(stelle, gliederungen);
    if (teil === null) {
      return befehlsfehler(
        'oz-ueberlauf',
        `${k.id} ist die ${String(gliederungen)}. Gliederung unter ${elternId}; ihre Nummer passt nicht in ${String(stelle.laenge)} Stellen.`,
        k,
      );
    }
    const teile = [...praefix, teil];
    aus.oz.set(k.id, ozZusammensetzen(maske, teile));
    const f = nummeriere(idx, maske, k.id, stufe, teile, aus);
    if (f !== null) return f;
  }
  return null;
}

/**
 * Prüft die neue Vergabe gegen die OZ der Knoten außerhalb des Teilbaums: eine OZ mit Index, die dort schon steht (oder
 * innerhalb des Teilbaums doppelt entstünde), wird nicht erzeugt (`OZ_ANNAHMEN.eindeutigkeit`).
 */
function doppeltFehler(idx: Baumindex, neu: NeueOz): Befehlsfehler | null {
  const belegt = new Set<string>();
  for (const k of idx.byId.values()) {
    if (k.art === 'hinweis' || k.ordnungszahl === null || neu.has(k.id)) continue;
    belegt.add(ozSchluessel(k.ordnungszahl, k.art === 'position' ? k.ozIndex : null));
  }
  for (const [kennung, oz] of neu) {
    const k = idx.byId.get(kennung);
    if (k === undefined || k.art === 'hinweis') continue;
    const s = ozSchluessel(oz, k.art === 'position' ? k.ozIndex : null);
    if (belegt.has(s)) {
      const e = nein(
        'oz-doppelt',
        `Die OZ „${oz}“ würde doppelt vergeben (Knoten ${kennung}).`,
        kennung,
        'ordnungszahl',
      );
      return e.ok ? null : e.fehler;
    }
    belegt.add(s);
  }
  return null;
}

/** Das ChangeSet der Knoten, deren OZ sich ändert, in Vorordnung, samt den Hinweisen der Vergabe. */
function aenderungen(z: LvZustand, idx: Baumindex, neu: Vergabe, kopf?: LvChangeSet['kopf']): LvChangeSet {
  const geaendert: { vorher: Knoten; nachher: Knoten }[] = [];
  for (const [kennung, oz] of neu.oz) {
    const k = idx.byId.get(kennung);
    if (k === undefined || k.art === 'hinweis' || k.ordnungszahl === oz) continue;
    geaendert.push({ vorher: k, nachher: { ...k, ordnungszahl: oz } });
  }
  const hinweise = neu.hinweise;
  return baueChangeSet(
    z,
    kopf === undefined || kopf === null ? { geaendert, hinweise } : { geaendert, kopf, hinweise },
  );
}

/** Nummeriert den ganzen Baum unter der Wurzel mit `maske` neu; Fehlerwert oder die neuen OZ. */
function nummeriereAlles(idx: Baumindex, maske: OzMaske): Ergebnis<Vergabe, Befehlsfehler> {
  const neu: Vergabe = { oz: new Map(), hinweise: [] };
  const f = nummeriere(idx, maske, idx.lvId, 0, [], neu) ?? doppeltFehler(idx, neu.oz);
  return f === null ? ok(neu) : { ok: false, fehler: f };
}

/** `Umnummerieren`: die Nachfahren von `teilbaumId` (LV oder Gliederung) bekommen neue OZ; IDs und Baum bleiben. */
export function umnummerieren(z: LvZustand, b: Umnummerieren): Antwort {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const maske = lv.ozMaske;
  if (b.teilbaumId === lv.id) {
    const r = nummeriereAlles(idx, maske);
    return r.ok ? ok(aenderungen(z, idx, r.wert)) : r;
  }
  const wurzel = idx.byId.get(b.teilbaumId);
  if (wurzel === undefined)
    return nein('knoten-unbekannt', `Knoten unbekannt: ${b.teilbaumId}`, b.teilbaumId);
  if (wurzel.art !== 'los' && wurzel.art !== 'titel') {
    return nein(
      'knotenart-unzulaessig',
      `Umnummerieren braucht das LV oder eine Gliederung, nicht „${wurzel.art}“.`,
      b.teilbaumId,
    );
  }
  const stufe = ebenenBis(idx, wurzel.elternId) + ebenenbeitrag(wurzel.art);
  const stellen = stellenFuer(maske, 'gliederung', stufe);
  if (stellen === null) {
    return nein(
      'maske-ungueltig',
      `${wurzel.id} liegt in Stufe ${String(stufe)}; die Maske hat nur ${String(maske.gliederung.length)} Gliederungsstufen.`,
      wurzel.id,
    );
  }
  const oz = wurzel.ordnungszahl;
  if (oz === null) {
    return nein(
      'oz-ungueltig',
      `Die Teilbaumwurzel ${wurzel.id} hat keine OZ (sie liefert die Vorsilben).`,
      wurzel.id,
      'ordnungszahl',
    );
  }
  const meldung = ozFehler(maske, oz, null, 'gliederung', stufe);
  const praefix = ozZerlegen(maske, oz, stellen);
  if (meldung !== null || praefix === null) {
    return nein(
      'oz-ungueltig',
      `Die OZ der Teilbaumwurzel ${wurzel.id} ist ungültig${meldung === null ? '' : `: ${meldung}`}`,
      wurzel.id,
      'ordnungszahl',
    );
  }
  const neu: Vergabe = { oz: new Map(), hinweise: [] };
  const f = nummeriere(idx, maske, wurzel.id, stufe, praefix, neu) ?? doppeltFehler(idx, neu.oz);
  return f === null ? ok(aenderungen(z, idx, neu)) : { ok: false, fehler: f };
}

/**
 * `OzMaskeSetzen`: setzt die Maske und nummeriert den ganzen Baum neu, in EINEM ChangeSet (Kopf und Knoten). Eine
 * ungültige Maske oder ein Knoten, der unter der neuen Maske keine OZ bekommen kann, ergibt einen Fehlerwert ohne jede
 * Änderung. Dieselbe Maske noch einmal: leeres ChangeSet.
 */
export function ozMaskeSetzen(z: LvZustand, b: OzMaskeSetzen): Antwort {
  const meldung = maskeFehler(b.maske);
  if (meldung !== null) return nein('maske-ungueltig', meldung, undefined, 'maske');
  const lv = z.leistungsverzeichnis;
  if (maskenGleich(lv.ozMaske, b.maske)) return ok(baueChangeSet(z, {}));
  const idx = indexVon(lv.id, lv.knoten);
  if (b.maske.losStufe === true) {
    // F1, E-08: mit Los-Stufe stehen auf der obersten Ebene nur Lose (`obersteEbeneFehler`).
    const titel = (idx.kinder.get(lv.id) ?? []).find((k) => k.art === 'titel');
    if (titel !== undefined) {
      return nein(
        'knotenart-unzulaessig',
        obersteEbeneFehler('titel', [], true) ?? 'Titel auf der Los-Stufe.',
        titel.id,
      );
    }
  }
  const r = nummeriereAlles(idx, b.maske);
  if (!r.ok) return r;
  const vorher = ohneKnoten(lv);
  return ok(aenderungen(z, idx, r.wert, { vorher, nachher: { ...vorher, ozMaske: b.maske } }));
}

/**
 * Prüft eine von Hand eingegebene OZ samt Index an einem Knoten der Art `art` in Stufe `stufe` gegen die Maske
 * (`OrdnungszahlSetzen`, `GliederungAnlegen`): Fehlerwert `oz-ungueltig` mit dem Feld (`ordnungszahl` oder `ozIndex`)
 * oder `null`. Eindeutigkeit wird nicht geprüft (U5, F2). `stufe`: bei einer Gliederung ihre eigene Stufe, bei einer
 * Position die Zahl der Stufen darüber.
 */
export function handOzFehler(
  maske: OzMaske,
  art: 'los' | 'titel' | 'position',
  stufe: number,
  ordnungszahl: Ordnungszahl | null,
  ozIndex: string | null,
  knotenId: string,
): Befehlsfehler | null {
  const fehler = (meldung: string, feld: string): Befehlsfehler => {
    const e = nein('oz-ungueltig', meldung, knotenId, feld);
    if (e.ok) throw new Error('unerreichbar');
    return e.fehler;
  };
  const gliederung = art !== 'position';
  const ozArt = gliederung ? 'gliederung' : 'position';
  const index = gliederung ? null : ozIndex;
  if (ozIndex !== null && gliederung) return fehler('Eine Gliederung hat keinen Index.', 'ozIndex');
  if (ordnungszahl === null) {
    return ozIndex === null ? null : fehler('Ein Index braucht eine OZ.', 'ozIndex');
  }
  const f = ozFehler(maske, ordnungszahl, index, ozArt, stufe);
  if (f === null) return null;
  return fehler(f, indexFehler(maske, ozArt, index) === null ? 'ordnungszahl' : 'ozIndex');
}

/**
 * `OrdnungszahlSetzen`: Handeingabe von OZ und Index an einer Gliederung oder Position, geprüft gegen die Maske
 * (Zeichen, Teilzahl, Teillängen, Gesamtlänge, Index). Eindeutigkeit wird NICHT erzwungen (U5, `doppelteOrdnungszahlen`),
 * ebenso nicht der Zusammenhang mit der OZ der Eltern. `null` löscht die OZ (dann ohne Index).
 */
export function ordnungszahlSetzen(z: LvZustand, b: OrdnungszahlSetzen): Antwort {
  const lv = z.leistungsverzeichnis;
  const idx = indexVon(lv.id, lv.knoten);
  const k = idx.byId.get(b.knotenId);
  if (k === undefined) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  if (k.art === 'hinweis') {
    return nein('knotenart-unzulaessig', 'Ein Hinweistext trägt keine Ordnungszahl.', k.id);
  }
  const gliederung = k.art !== 'position';
  const stufe = ebenenBis(idx, k.elternId) + (gliederung ? ebenenbeitrag(k.art) : 0);
  const f = handOzFehler(lv.ozMaske, k.art, stufe, b.ordnungszahl, b.ozIndex, k.id);
  if (f !== null) return { ok: false, fehler: f };
  const nachher: Knoten =
    k.art === 'position'
      ? { ...k, ordnungszahl: b.ordnungszahl, ozIndex: b.ozIndex }
      : { ...k, ordnungszahl: b.ordnungszahl };
  const gleich = k.ordnungszahl === b.ordnungszahl && (k.art !== 'position' || k.ozIndex === b.ozIndex);
  return ok(baueChangeSet(z, gleich ? {} : { geaendert: [{ vorher: k, nachher }] }));
}
