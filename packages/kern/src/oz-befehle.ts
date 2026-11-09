// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle zur Ordnungszahl (Ticket 06): OzMaskeSetzen, OrdnungszahlSetzen, Umnummerieren. Jeder ist
// `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`: rein, ohne Zufall und Uhr (A2). Alle Regeln (Längen,
// Zeichen, Schritte, Annahmen) stehen in `ozregeln.ts`; hier steht nur der Ablauf.
//
// Die OZ ist Anzeigedatum (A7): kein Befehl ändert eine ID, die Baumstruktur oder eine Summe. Das ChangeSet nennt genau
// die Knoten, deren `ordnungszahl` sich ändert; Summen bleiben leer (A6). Umnummerieren und OzMaskeSetzen sind alles
// oder nichts: kann ein Knoten nicht nummeriert werden, gibt es einen Fehlerwert und keine einzige Änderung.

import type {
  Befehlsfehler,
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
import { ebenenbeitrag } from './regeln';
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
  positionsTeil,
  stellenFuer,
} from './ozregeln';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Neue OZ je Knoten-ID in Vorordnung (Einfügereihenfolge der `Map`). */
type NeueOz = Map<string, Ordnungszahl>;

/**
 * Vergibt die OZ aller Nachfahren von `elternId` (Gliederung +1, Positionen +10, führende Nullen). `ebene` ist die Zahl
 * der Stufen bis einschließlich `elternId` (0 für die LV-Wurzel), `praefix` die Teile von dessen OZ. Gibt den ersten
 * Fehler zurück (Knoten nennend) oder `null`. Die Rekursion ist durch die Stufenzahl der Maske (höchstens 5) begrenzt.
 */
function nummeriere(
  idx: Baumindex,
  maske: OzMaske,
  elternId: string,
  ebene: number,
  praefix: readonly string[],
  aus: NeueOz,
): Befehlsfehler | null {
  const befehlsfehler = (
    code: 'maske-ungueltig' | 'oz-ungueltig',
    meldung: string,
    k: Knoten,
  ): Befehlsfehler => {
    const e = nein(code, meldung, k.id);
    if (e.ok) throw new Error('unerreichbar');
    return e.fehler;
  };
  let gliederungen = 0;
  let positionen = 0;
  let grundteil: string | null = null;
  for (const k of idx.kinder.get(elternId) ?? []) {
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
        teil = positionsTeil(maske.position, positionen);
        if (teil === null) {
          return befehlsfehler(
            'maske-ungueltig',
            `Position ${k.id} ist die ${String(positionen)}. Position unter ${elternId}; ihre Nummer passt nicht in ${String(maske.position.laenge)} Stellen.`,
            k,
          );
        }
        grundteil = teil;
      }
      aus.set(k.id, ozZusammensetzen(maske, [...praefix, teil]));
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
        'maske-ungueltig',
        `${k.id} ist die ${String(gliederungen)}. Gliederung unter ${elternId}; ihre Nummer passt nicht in ${String(stelle.laenge)} Stellen.`,
        k,
      );
    }
    const teile = [...praefix, teil];
    aus.set(k.id, ozZusammensetzen(maske, teile));
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
        'oz-ungueltig',
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

/** Das ChangeSet der Knoten, deren OZ sich ändert, in Vorordnung. */
function aenderungen(z: LvZustand, idx: Baumindex, neu: NeueOz, kopf?: LvChangeSet['kopf']): LvChangeSet {
  const geaendert: { vorher: Knoten; nachher: Knoten }[] = [];
  for (const [kennung, oz] of neu) {
    const k = idx.byId.get(kennung);
    if (k === undefined || k.art === 'hinweis' || k.ordnungszahl === oz) continue;
    geaendert.push({ vorher: k, nachher: { ...k, ordnungszahl: oz } });
  }
  return baueChangeSet(z, kopf === undefined || kopf === null ? { geaendert } : { geaendert, kopf });
}

/** Nummeriert den ganzen Baum unter der Wurzel mit `maske` neu; Fehlerwert oder die neuen OZ. */
function nummeriereAlles(idx: Baumindex, maske: OzMaske): Ergebnis<NeueOz, Befehlsfehler> {
  const neu: NeueOz = new Map();
  const f = nummeriere(idx, maske, idx.lvId, 0, [], neu) ?? doppeltFehler(idx, neu);
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
  const neu: NeueOz = new Map();
  const f = nummeriere(idx, maske, wurzel.id, stufe, praefix, neu) ?? doppeltFehler(idx, neu);
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
  const r = nummeriereAlles(idx, b.maske);
  if (!r.ok) return r;
  const vorher = ohneKnoten(lv);
  return ok(aenderungen(z, idx, r.wert, { vorher, nachher: { ...vorher, ozMaske: b.maske } }));
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
  const art = gliederung ? 'gliederung' : 'position';
  const stufe = ebenenBis(idx, k.elternId) + (gliederung ? ebenenbeitrag(k.art) : 0);
  const index = gliederung ? null : b.ozIndex;
  if (b.ozIndex !== null && gliederung) {
    return nein('oz-ungueltig', 'Eine Gliederung hat keinen Index.', k.id, 'ozIndex');
  }
  if (b.ordnungszahl === null) {
    if (b.ozIndex !== null) return nein('oz-ungueltig', 'Ein Index braucht eine OZ.', k.id, 'ozIndex');
  } else {
    const f = ozFehler(lv.ozMaske, b.ordnungszahl, index, art, stufe);
    if (f !== null) {
      const feld = indexFehler(lv.ozMaske, art, index) === null ? 'ordnungszahl' : 'ozIndex';
      return nein('oz-ungueltig', f, k.id, feld);
    }
  }
  const nachher: Knoten =
    k.art === 'position'
      ? { ...k, ordnungszahl: b.ordnungszahl, ozIndex: b.ozIndex }
      : { ...k, ordnungszahl: b.ordnungszahl };
  const gleich = k.ordnungszahl === b.ordnungszahl && (k.art !== 'position' || k.ozIndex === b.ozIndex);
  return ok(baueChangeSet(z, gleich ? {} : { geaendert: [{ vorher: k, nachher }] }));
}
