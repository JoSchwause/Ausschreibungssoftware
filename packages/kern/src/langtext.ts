// SPDX-License-Identifier: AGPL-3.0-or-later
// Langtext im Kern (Ticket 50, Vertrag v1.1b, F6): Formprüfung für LangtextAendern und HinweistextAendern und die
// strukturelle Gleichheit für „derselbe Wert → leeres ChangeSet“.
//
// Geprüft wird nur die Form, genau so streng, wie `speicher` den Langtext liest (Ticket 31): bekannte `art` je Ebene,
// keine fehlenden und keine fremden Felder, Auszeichnung nur `true` (fehlt sonst), `spalten` ganzzahlig ab 1,
// Textergänzung nur auf oberster Ebene, in ihr nur Textläufe und Zeilenumbrüche. Was der Kern annimmt, kann `speicher`
// also immer zurücklesen. Inhalt prüft der Befehl nie (U5): leere Absätze, Zellen, Listen und Texte, Längen und
// Bildkennungen sind Sache der LV-Prüfung (K8).

import type { Langtext, LangtextBaustein, LangtextInnen, Tabellenzeile, Textfluss } from '@tethys/vertrag';

/** Wo ein Baustein steht; jede Ebene erlaubt eine Teilmenge der Arten (Vertrag `modell.ts`). */
type Ebene = 'langtext' | 'innen' | 'absatz' | 'textfluss';

const ARTEN_JE_EBENE: Record<Ebene, readonly string[]> = {
  langtext: ['text', 'umbruch', 'bild', 'absatz', 'liste', 'tabelle', 'ergaenzung'],
  innen: ['text', 'umbruch', 'bild', 'absatz', 'liste', 'tabelle'],
  absatz: ['text', 'umbruch', 'bild'],
  textfluss: ['text', 'umbruch'],
};
const ORT: Record<Ebene, string> = {
  langtext: 'im Langtext',
  innen: 'in einem Listenpunkt oder einer Tabellenzelle',
  absatz: 'in einem Absatz',
  textfluss: 'in einer Textergänzung',
};
const AUSZEICHNUNGEN = ['fett', 'kursiv', 'unterstrichen'] as const;

type Roh = Readonly<Record<string, unknown>>;
/** Erster Formfehler als Meldung mit Pfad, sonst `null`. */
type Befund = string | null;

const istObjekt = (x: unknown): x is Roh => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Objekt mit genau diesen Feldern (fehlende und fremde sind Formfehler). */
function felder(
  x: unknown,
  pfad: string,
  erlaubt: readonly string[],
  pflicht: readonly string[] = erlaubt,
): Befund {
  if (!istObjekt(x)) return `${pfad}: Objekt erwartet.`;
  for (const f of pflicht) if (!Object.hasOwn(x, f)) return `${pfad}.${f}: Feld fehlt.`;
  for (const f of Object.keys(x)) if (!erlaubt.includes(f)) return `${pfad}.${f}: unbekanntes Feld.`;
  return null;
}

const text = (x: unknown, pfad: string): Befund => (typeof x === 'string' ? null : `${pfad}: Text erwartet.`);
const wahrheit = (x: unknown, pfad: string): Befund =>
  typeof x === 'boolean' ? null : `${pfad}: true oder false erwartet.`;

function erster<T>(xs: readonly T[], f: (x: T, i: number) => Befund): Befund {
  for (let i = 0; i < xs.length; i++) {
    const b = f(xs[i] as T, i);
    if (b !== null) return b;
  }
  return null;
}

function liste(x: unknown, pfad: string, f: (x: unknown, pfad: string) => Befund): Befund {
  if (!Array.isArray(x)) return `${pfad}: Liste erwartet.`;
  return erster(x as readonly unknown[], (e, i) => f(e, `${pfad}[${String(i)}]`));
}

const bausteine = (x: unknown, pfad: string, ebene: Ebene): Befund =>
  liste(x, pfad, (b, p) => baustein(b, p, ebene));

function baustein(x: unknown, pfad: string, ebene: Ebene): Befund {
  if (!istObjekt(x)) return `${pfad}: Baustein ist kein Objekt.`;
  const art = x['art'];
  if (typeof art !== 'string' || !ARTEN_JE_EBENE.langtext.includes(art))
    return `${pfad}.art: unbekannte Bausteinart.`;
  if (!ARTEN_JE_EBENE[ebene].includes(art)) return `${pfad}.art: „${art}“ steht nicht ${ORT[ebene]}.`;
  switch (art) {
    case 'text': {
      const f = felder(x, pfad, ['art', 'text', ...AUSZEICHNUNGEN], ['art', 'text']);
      if (f !== null) return f;
      for (const a of AUSZEICHNUNGEN)
        if (Object.hasOwn(x, a) && x[a] !== true)
          return `${pfad}.${a}: nur true erlaubt; ohne Auszeichnung fehlt das Feld.`;
      return text(x['text'], `${pfad}.text`);
    }
    case 'umbruch':
      return felder(x, pfad, ['art']);
    case 'bild': {
      const f =
        felder(x, pfad, ['art', 'bild']) ?? felder(x['bild'], `${pfad}.bild`, ['id', 'medientyp', 'daten']);
      if (f !== null) return f;
      const b = x['bild'] as Roh;
      return erster(['id', 'medientyp', 'daten'], (n) => text(b[n], `${pfad}.bild.${n}`));
    }
    case 'absatz':
      return felder(x, pfad, ['art', 'inhalt']) ?? bausteine(x['inhalt'], `${pfad}.inhalt`, 'absatz');
    case 'liste':
      return (
        felder(x, pfad, ['art', 'geordnet', 'punkte']) ??
        wahrheit(x['geordnet'], `${pfad}.geordnet`) ??
        liste(x['punkte'], `${pfad}.punkte`, (p, q) => bausteine(p, q, 'innen'))
      );
    case 'tabelle':
      return felder(x, pfad, ['art', 'zeilen']) ?? liste(x['zeilen'], `${pfad}.zeilen`, zeile);
    default:
      return (
        felder(x, pfad, ['art', 'herkunft', 'kennung', 'leer', 'davor', 'inhalt', 'danach']) ??
        (x['herkunft'] === 'bieter' || x['herkunft'] === 'ausschreibender'
          ? null
          : `${pfad}.herkunft: „bieter“ oder „ausschreibender“ erwartet.`) ??
        text(x['kennung'], `${pfad}.kennung`) ??
        wahrheit(x['leer'], `${pfad}.leer`) ??
        erster(['davor', 'inhalt', 'danach'], (n) => bausteine(x[n], `${pfad}.${n}`, 'textfluss'))
      );
  }
}

const zeile = (x: unknown, pfad: string): Befund =>
  felder(x, pfad, ['zellen']) ?? liste((x as Roh)['zellen'], `${pfad}.zellen`, zelle);

function zelle(x: unknown, pfad: string): Befund {
  const f = felder(x, pfad, ['spalten', 'inhalt']);
  if (f !== null) return f;
  const o = x as Roh;
  const spalten = o['spalten'];
  if (typeof spalten !== 'number' || !Number.isInteger(spalten) || spalten < 1)
    return `${pfad}.spalten: ganze Zahl ab 1 erwartet.`;
  return bausteine(o['inhalt'], `${pfad}.inhalt`, 'innen');
}

/**
 * Formfehler eines Langtexts (der Typ sagt `Langtext`; ein Aufrufer ohne Typprüfung kann anderes schicken) als
 * Meldung mit Pfad ab `feld`, z. B. `langtext[2].zeilen[0].zellen[1].inhalt[0].art: …`; formgültig: `null`.
 */
export function langtextFormFehler(wert: unknown, feld: string): string | null {
  if (!Array.isArray(wert)) return `${feld}: muss eine Liste von Bausteinen sein.`;
  return bausteine(wert, feld, 'langtext');
}

// --- Gleichheit -------------------------------------------------------------------------------------------------

function gleicheListen<T>(a: readonly T[], b: readonly T[], gleich: (x: T, y: T) => boolean): boolean {
  return a === b || (a.length === b.length && a.every((x, i) => gleich(x, b[i] as T)));
}

const flussGleich = (a: Textfluss, b: Textfluss): boolean => gleicheListen(a, b, bausteinGleich);
const innenGleich = (a: LangtextInnen, b: LangtextInnen): boolean => gleicheListen(a, b, bausteinGleich);
const zeileGleich = (a: Tabellenzeile, b: Tabellenzeile): boolean =>
  gleicheListen(a.zellen, b.zellen, (x, y) => x.spalten === y.spalten && innenGleich(x.inhalt, y.inhalt));

function bausteinGleich(x: LangtextBaustein, y: LangtextBaustein): boolean {
  switch (x.art) {
    case 'text':
      return (
        y.art === 'text' &&
        x.text === y.text &&
        x.fett === y.fett &&
        x.kursiv === y.kursiv &&
        x.unterstrichen === y.unterstrichen
      );
    case 'umbruch':
      return y.art === 'umbruch';
    case 'bild':
      return (
        y.art === 'bild' &&
        x.bild.id === y.bild.id &&
        x.bild.medientyp === y.bild.medientyp &&
        x.bild.daten === y.bild.daten
      );
    case 'absatz':
      return y.art === 'absatz' && gleicheListen(x.inhalt, y.inhalt, bausteinGleich);
    case 'liste':
      return y.art === 'liste' && x.geordnet === y.geordnet && gleicheListen(x.punkte, y.punkte, innenGleich);
    case 'tabelle':
      return y.art === 'tabelle' && gleicheListen(x.zeilen, y.zeilen, zeileGleich);
    case 'ergaenzung':
      return (
        y.art === 'ergaenzung' &&
        x.herkunft === y.herkunft &&
        x.kennung === y.kennung &&
        x.leer === y.leer &&
        flussGleich(x.davor, y.davor) &&
        flussGleich(x.inhalt, y.inhalt) &&
        flussGleich(x.danach, y.danach)
      );
  }
}

/**
 * Gleichheit zweier Langtexte für die Regel „derselbe Wert → leeres ChangeSet“: strukturell über den ganzen Baum. Je
 * Stelle gleiche Bausteinart und gleiche Felder: Text Zeichen für Zeichen und dieselbe Auszeichnung; Bild mit
 * gleicher `id`, `medientyp` und `daten`; Absatz, Liste (samt `geordnet`), Tabelle (samt `spalten`) und Textergänzung
 * (samt `herkunft`, `kennung`, `leer`) mit gleichem Inhalt. Die Reihenfolge zählt. Keine Normalisierung (zwei
 * Textläufe `a`,`b` sind nicht gleich einem Textlauf `ab`; ein Textlauf ist nicht gleich einem Absatz um ihn).
 */
export function langtextGleich(a: Langtext, b: Langtext): boolean {
  return gleicheListen(a, b, bausteinGleich);
}
