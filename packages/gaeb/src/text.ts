// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB-Textstruktur → `Langtext` (v1.1b; F6, E-10) oder Einzeiler (Kurztext, Titel).
//
// Abgebildet wird die GAEB-abbildbare Teilmenge (Ticket 26, Comments Punkt 5 „Abbildung auf GAEB“; Ticket 32):
// - `span` → Textlauf; `font-weight` bold, `font-style` italic, `text-decoration` underline im `style` (auch an
//   umgebenden Elementen, vererbt; `normal`/`none` heben auf) → `fett`, `kursiv`, `unterstrichen`.
// - `br` → `umbruch`; `p` → `absatz`; `ul`/`ol`/`li` → `liste`; `table`/`tr`/`td` (mit `colspan`) → `tabelle`;
//   `image` (in `p`) und `Image` (auf Textebene, so das Schema) → `bild`, an seiner Stelle.
// - `TextComplement` (`Kind`, `MarkLbl`, `Empty`, `ComplCaption`/`ComplBody`/`ComplTail`) → `ergaenzung`, nur auf
//   oberster Ebene (Geschwister von `Text` in `DetailTxt`). Steht eine tiefer, bleibt ihr Text im Fluss und es gibt
//   den Befund `ergaenzung-nicht-oben`.
// - `span` und `br` ohne `p` bleiben lose Bausteine (der Vertrag erlaubt sie, Offene Typfrage 1 in Ticket 26); ein
//   `p` mit einer Liste oder Tabelle darin wird an ihr geteilt.
// - Kanonisch wie im Langtext-Editor (Ticket 34): benachbarte Textläufe gleicher Auszeichnung verschmelzen, leere
//   Textläufe entfallen. Ein Zeilenwechsel im Dateitext ist Leerraum und wird ein Leerzeichen; ein `\n` entsteht nie.
//
// Nicht abgebildet ist der Rest (Schriftart, -größe, Farbe, Ausrichtung, Seitenumbruch `page`, Bildgröße,
// Tabellenbreiten, `ComplBodyDec`, `ArtChrIdent`, dazu weitere Formate der Dateien wie Durchstreichen, Hoch- und
// Tiefstellung, Rahmen, Einzüge). Der Leser liefert diese Arten in `formatierung` zurück, damit der Aufrufer sie als
// Befund `formatierung-verworfen` meldet (Q5: kein stiller Verlust). Der Text selbst bleibt immer erhalten.

import type {
  Auszeichnung,
  Ergaenzungsherkunft,
  IdQuelle,
  Langtext,
  LangtextBaustein,
  LangtextInline,
  LangtextInnen,
  LangtextInnenBaustein,
  Tabellenzeile,
  Textbild,
  Textergaenzung,
  Textfluss,
  Textlauf,
  Zeilenumbruch,
} from '@tethys/vertrag';
import { elementKinder, textInhalt } from './xml';
import type { XmlElement } from './xml';

export interface Textproblem {
  readonly code:
    | 'bild-ungueltig'
    | 'bild-medientyp-fehlt'
    | 'bild-in-kurztext-verworfen'
    | 'ergaenzung-nicht-oben'
    | 'ergaenzung-ungueltig';
  readonly meldung: string;
  readonly element: XmlElement;
}

export interface Textergebnis {
  readonly langtext: Langtext;
  /** Arten der verworfenen Formatierung, sortiert und ohne Doppelte; leer: nichts ging verloren. */
  readonly formatierung: readonly string[];
  readonly probleme: readonly Textproblem[];
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const ZEILENWECHSEL = /[ \t]*(?:\r\n|\r|\n)[ \t]*/g;

/** Elemente, die nur Text umschließen und keine eigene Bedeutung im Langtext haben. */
const HUELLEN: ReadonlySet<string> = new Set(['Text', 'DetailTxt', 'TextOutlTxt', 'OutlTxt', 'LblTx']);
const TABELLENTEILE: ReadonlySet<string> = new Set([
  'table',
  'tr',
  'td',
  'th',
  'tbody',
  'thead',
  'tfoot',
  'col',
]);

/** Attribute, deren Inhalt nicht abgebildet ist, nach Art des Verlusts. */
const ATTRIBUTART: Readonly<Record<string, string>> = {
  valign: 'Ausrichtung',
  align: 'Ausrichtung',
  width: 'Tabellenbreiten und -abstände',
  height: 'Tabellenbreiten und -abstände',
  cellpadding: 'Tabellenbreiten und -abstände',
  cellspacing: 'Tabellenbreiten und -abstände',
  border: 'Rahmen',
  rowspan: 'Zelle über mehrere Zeilen (rowspan)',
  ArtChrIdent: 'ArtChrIdent',
};

type Baustein = LangtextBaustein;
type Inline = LangtextInline;

const istInline = (b: Baustein): b is Inline => b.art === 'text' || b.art === 'umbruch' || b.art === 'bild';

const gleicheAuszeichnung = (a: Auszeichnung, b: Auszeichnung): boolean =>
  a.fett === b.fett && a.kursiv === b.kursiv && a.unterstrichen === b.unterstrichen;

/** Verschmilzt benachbarte Textläufe gleicher Auszeichnung und lässt leere weg. */
function kanonisch<T extends Baustein>(bausteine: readonly T[]): T[] {
  const aus: T[] = [];
  for (const b of bausteine) {
    if (b.art === 'text' && b.text === '') continue;
    const vorher = aus.at(-1);
    if (b.art === 'text' && vorher?.art === 'text' && gleicheAuszeichnung(vorher, b))
      aus[aus.length - 1] = { ...vorher, text: vorher.text + b.text };
    else aus.push(b);
  }
  return aus;
}

/** Ein Textlauf mit genau den gesetzten Auszeichnungen (nie `false`, siehe `Auszeichnung`). */
function textlauf(text: string, a: Auszeichnung): Textlauf {
  return {
    art: 'text',
    text,
    ...(a.fett ? { fett: true } : {}),
    ...(a.kursiv ? { kursiv: true } : {}),
    ...(a.unterstrichen ? { unterstrichen: true } : {}),
  };
}

class Sammler {
  readonly formatierung = new Set<string>();
  readonly probleme: Textproblem[] = [];

  constructor(
    private readonly ids: IdQuelle,
    private readonly bilderErlaubt: boolean,
  ) {}

  // --- Formatierung --------------------------------------------------------------------------------------------

  /** Wertet `style` und die übrigen Attribute aus: Auszeichnung wird geerbt, alles andere ist Verlust. */
  private stil(e: XmlElement, a: Auszeichnung, behandelt: readonly string[] = []): Auszeichnung {
    for (const name of e.attrs.keys()) {
      if (name === 'style' || behandelt.includes(name) || name.startsWith('xmlns') || name.startsWith('xml:'))
        continue;
      this.formatierung.add(ATTRIBUTART[name] ?? `Attribut ${name}`);
    }
    const stil = e.attrs.get('style');
    if (stil === undefined) return a;
    let { fett, kursiv, unterstrichen } = a;
    for (const regel of stil.split(';')) {
      const k = regel.indexOf(':');
      if (k < 0) continue;
      const eigenschaft = regel.slice(0, k).trim().toLowerCase();
      const wert = regel
        .slice(k + 1)
        .trim()
        .toLowerCase();
      if (eigenschaft === '' || wert === '') continue;
      switch (eigenschaft) {
        case 'font-weight':
          fett =
            wert === 'bold' ||
            wert === 'bolder' ||
            (/^[0-9]+$/.test(wert) && Number(wert) >= 600) ||
            undefined;
          break;
        case 'font-style':
          kursiv = wert === 'italic' || wert === 'oblique' || undefined;
          break;
        case 'text-decoration':
        case 'text-decoration-line':
          for (const t of wert.split(/\s+/)) {
            if (t === 'underline') unterstrichen = true;
            else if (t === 'none') unterstrichen = undefined;
            else if (t === 'line-through') this.formatierung.add('Durchgestrichen');
            else this.formatierung.add(`Textdekoration ${t}`);
          }
          break;
        default:
          this.formatierung.add(this.stilart(eigenschaft, wert, e));
      }
    }
    return {
      ...(fett ? { fett: true } : {}),
      ...(kursiv ? { kursiv: true } : {}),
      ...(unterstrichen ? { unterstrichen: true } : {}),
    };
  }

  private stilart(eigenschaft: string, wert: string, e: XmlElement): string {
    if (eigenschaft === 'font-family') return 'Schriftart';
    if (eigenschaft === 'font-size') return 'Schriftgröße';
    if (eigenschaft === 'color') return 'Farbe';
    if (eigenschaft.startsWith('background')) return 'Hintergrundfarbe';
    if (eigenschaft === 'vertical-align' && (wert === 'sub' || wert === 'super'))
      return 'Hoch- und Tiefstellung';
    if (eigenschaft === 'text-align' || eigenschaft === 'vertical-align') return 'Ausrichtung';
    if (eigenschaft === 'width' || eigenschaft === 'height')
      return TABELLENTEILE.has(e.name) ? 'Tabellenbreiten und -abstände' : 'Breite und Höhe';
    if (eigenschaft.startsWith('border')) return 'Rahmen';
    if (
      eigenschaft.startsWith('margin') ||
      eigenschaft.startsWith('padding') ||
      eigenschaft === 'text-indent' ||
      eigenschaft === 'line-height'
    )
      return 'Einzug und Abstand';
    if (eigenschaft.startsWith('list-style')) return 'Listenstil';
    return `Format ${eigenschaft}`;
  }

  // --- Inhalt --------------------------------------------------------------------------------------------------

  /**
   * Liest die Kinder von `e` in Lesereihenfolge. `oben`: `e` ist (eine Hülle auf) oberster Ebene des Langtexts;
   * nur dort entsteht eine Textergänzung.
   */
  inhalt(e: XmlElement, a: Auszeichnung, oben: boolean): Baustein[] {
    const aus: Baustein[] = [];
    for (const k of e.children) {
      if (typeof k === 'string') {
        if (e.name === 'span' || k.trim() !== '') aus.push(textlauf(k.replace(ZEILENWECHSEL, ' '), a));
        continue;
      }
      switch (k.name) {
        case 'span':
          aus.push(...this.inhalt(k, this.stil(k, a), false));
          break;
        case 'br':
          this.stil(k, a);
          aus.push({ art: 'umbruch' });
          break;
        case 'image':
        case 'Image': {
          const b = this.bild(k);
          if (b) aus.push(b);
          break;
        }
        case 'p':
          aus.push(...this.absatz(k, a));
          break;
        case 'ul':
        case 'ol':
          aus.push(this.liste(k, a));
          break;
        case 'table':
          aus.push(this.tabelle(k, a));
          break;
        case 'page':
          this.formatierung.add('Seitenumbruch');
          break;
        case 'TextComplement':
          aus.push(...this.textergaenzung(k, a, oben));
          break;
        default:
          if (HUELLEN.has(k.name)) aus.push(...this.inhalt(k, this.stil(k, a), oben));
          else {
            this.formatierung.add(`Element ${k.name}`);
            aus.push(...this.inhalt(k, this.stil(k, a), false));
          }
      }
    }
    return aus;
  }

  /** Inhalt ohne Textergänzung (Listenpunkt, Tabellenzelle): `oben` ist dort immer `false`. */
  private innen(e: XmlElement, a: Auszeichnung): LangtextInnen {
    return kanonisch(
      this.inhalt(e, a, false).filter((b): b is LangtextInnenBaustein => b.art !== 'ergaenzung'),
    );
  }

  /** Ein `p` wird ein Absatz; steht eine Liste, Tabelle oder ein weiteres `p` darin, wird er dort geteilt. */
  private absatz(p: XmlElement, a: Auszeichnung): LangtextInnenBaustein[] {
    const teile = this.inhalt(p, this.stil(p, a), false);
    const aus: LangtextInnenBaustein[] = [];
    let lauf: Inline[] = [];
    const schliesse = (): void => {
      if (lauf.length > 0) aus.push({ art: 'absatz', inhalt: kanonisch(lauf) });
      lauf = [];
    };
    for (const t of teile) {
      if (istInline(t)) lauf.push(t);
      else if (t.art !== 'ergaenzung') {
        schliesse();
        aus.push(t);
      }
    }
    if (aus.length === 0) return [{ art: 'absatz', inhalt: kanonisch(lauf) }];
    schliesse();
    return aus;
  }

  private liste(e: XmlElement, a: Auszeichnung): LangtextInnenBaustein {
    const stil = this.stil(e, a);
    const punkte: LangtextInnen[] = [];
    for (const k of elementKinder(e)) {
      if (k.name !== 'li') this.formatierung.add(`Element ${k.name} in Liste`);
      punkte.push(this.innen(k, this.stil(k, stil)));
    }
    return { art: 'liste', geordnet: e.name === 'ol', punkte };
  }

  private tabelle(e: XmlElement, a: Auszeichnung): LangtextInnenBaustein {
    const stil = this.stil(e, a);
    const zeilen: Tabellenzeile[] = [];
    const zeile = (tr: XmlElement, za: Auszeichnung): void => {
      const zellen = elementKinder(tr).map((td) => {
        if (td.name === 'th') this.formatierung.add('Kopfzelle (th)');
        else if (td.name !== 'td') this.formatierung.add(`Element ${td.name} in Tabellenzeile`);
        const roh = td.attrs.get('colspan');
        let spalten = 1;
        if (roh !== undefined) {
          if (/^[0-9]+$/.test(roh.trim()) && Number(roh) >= 1) spalten = Number(roh);
          else this.formatierung.add('ungültiges colspan');
        }
        return { spalten, inhalt: this.innen(td, this.stil(td, za, ['colspan'])) };
      });
      zeilen.push({ zellen });
    };
    for (const k of elementKinder(e)) {
      if (k.name === 'tr') zeile(k, this.stil(k, stil));
      else if (k.name === 'tbody' || k.name === 'thead' || k.name === 'tfoot') {
        const ta = this.stil(k, stil);
        for (const tr of elementKinder(k)) zeile(tr, this.stil(tr, ta));
      } else if (k.name === 'col' || k.name === 'colgroup')
        this.formatierung.add('Tabellenbreiten und -abstände');
      else {
        this.formatierung.add(`Element ${k.name} in Tabelle`);
        zeile(k, stil);
      }
    }
    return { art: 'tabelle', zeilen };
  }

  private textergaenzung(e: XmlElement, a: Auszeichnung, oben: boolean): Baustein[] {
    this.stil(e, a, ['Kind', 'MarkLbl', 'Empty']);
    const teil = (name: string): Textfluss => {
      const el = elementKinder(e).find((k) => k.name === name);
      return el ? this.fluss(this.inhalt(el, this.stil(el, a), false)) : [];
    };
    for (const k of elementKinder(e))
      if (k.name === 'ComplBodyDec') this.formatierung.add('ComplBodyDec');
      else if (!['ComplCaption', 'ComplBody', 'ComplTail'].includes(k.name))
        this.formatierung.add(`Element ${k.name} in Textergänzung`);
    const davor = teil('ComplCaption');
    const inhalt = teil('ComplBody');
    const danach = teil('ComplTail');
    const flach: Inline[] = [...davor, ...inhalt, ...danach];

    const art = e.attrs.get('Kind');
    const herkunft: Ergaenzungsherkunft | null =
      art === 'Bidder' ? 'bieter' : art === 'Owner' ? 'ausschreibender' : null;
    const kennung = e.attrs.get('MarkLbl')?.trim() ?? '';
    if (!oben) {
      this.probleme.push({
        code: 'ergaenzung-nicht-oben',
        meldung:
          'Eine Textergänzung steht innerhalb eines Textblocks statt auf oberster Ebene; ihr Text bleibt, die Kennzeichnung entfällt.',
        element: e,
      });
      return flach;
    }
    if (herkunft === null || kennung === '') {
      this.probleme.push({
        code: 'ergaenzung-ungueltig',
        meldung: `Die Textergänzung hat ${herkunft === null ? `keine gültige Herkunft (Kind „${art ?? ''}“, erlaubt: Bidder, Owner)` : 'keine Kennung (MarkLbl)'}; ihr Text bleibt als Absatz, die Kennzeichnung entfällt.`,
        element: e,
      });
      return [{ art: 'absatz', inhalt: kanonisch(flach) }];
    }
    const ergaenzung: Textergaenzung = {
      art: 'ergaenzung',
      herkunft,
      kennung,
      leer: e.attrs.get('Empty') === 'Yes',
      davor,
      inhalt,
      danach,
    };
    return [ergaenzung];
  }

  /** Inhalt einer Textergänzung: nur Textläufe und Umbrüche. Absätze werden Umbrüche, Struktur und Bilder Verlust. */
  private fluss(bausteine: readonly Baustein[]): Textfluss {
    const aus: (Textlauf | Zeilenumbruch)[] = [];
    const umbruch = (): void => {
      if (aus.length > 0 && aus.at(-1)?.art !== 'umbruch') aus.push({ art: 'umbruch' });
    };
    for (const b of bausteine) {
      if (b.art === 'text' || b.art === 'umbruch') aus.push(b);
      else if (b.art === 'absatz') {
        umbruch();
        aus.push(...this.fluss(b.inhalt));
      } else {
        this.formatierung.add(`${b.art === 'bild' ? 'Bild' : 'Struktur'} in Textergänzung`);
        if (b.art !== 'bild') {
          umbruch();
          aus.push(textlauf(einzeiler([b]), {}));
        }
      }
    }
    return kanonisch(aus);
  }

  private bild(e: XmlElement): Textbild | null {
    if (!this.bilderErlaubt) {
      this.probleme.push({
        code: 'bild-in-kurztext-verworfen',
        meldung: 'Ein Bild in einem Kurztext wird verworfen.',
        element: e,
      });
      return null;
    }
    const daten = textInhalt(e).replace(/\s+/g, '');
    if (daten === '' || !BASE64.test(daten)) {
      this.probleme.push({
        code: 'bild-ungueltig',
        meldung: 'Der Bildinhalt ist leer oder keine gültige Base64-Zeichenfolge; das Bild wird verworfen.',
        element: e,
      });
      return null;
    }
    let medientyp = e.attrs.get('Type') ?? e.attrs.get('type');
    if (medientyp === undefined || medientyp.trim() === '') {
      medientyp = 'application/octet-stream';
      this.probleme.push({
        code: 'bild-medientyp-fehlt',
        meldung: 'Das Bild hat keinen Medientyp (Attribut Type); application/octet-stream wird eingesetzt.',
        element: e,
      });
    }
    if (e.attrs.has('align') || e.attrs.has('width') || e.attrs.has('height'))
      this.formatierung.add('Bildgröße und -ausrichtung');
    return { art: 'bild', bild: { id: this.ids.bild(), medientyp: medientyp.trim(), daten } };
  }
}

/** Text eines Langtexts als Zeichenkette: Absätze, Umbrüche und Zellen trennen mit `\n` bzw. `\t`. */
function einzeiler(bausteine: readonly Baustein[]): string {
  let s = '';
  for (const x of bausteine) {
    if (x.art === 'text') s += x.text;
    else if (x.art === 'umbruch') s += '\n';
    else if (x.art === 'absatz') s += `\n${einzeiler(x.inhalt)}\n`;
    else if (x.art === 'liste') s += x.punkte.map((p) => `\n${einzeiler(p)}\n`).join('');
    else if (x.art === 'tabelle')
      s += x.zeilen.map((z) => `\n${z.zellen.map((c) => einzeiler(c.inhalt)).join('\t')}\n`).join('');
    else if (x.art === 'ergaenzung') s += einzeiler([...x.davor, ...x.inhalt, ...x.danach]);
  }
  return s;
}

/** `true`: Der Langtext hat weder Text (außer Leerraum) noch Bild noch Textergänzung, nur leere Absätze und Umbrüche. */
export function langtextLeer(l: Langtext): boolean {
  const zeigt = (b: Baustein): boolean =>
    b.art === 'bild' ||
    b.art === 'ergaenzung' ||
    (b.art === 'text' && b.text.trim() !== '') ||
    (b.art === 'absatz' && b.inhalt.some(zeigt)) ||
    (b.art === 'liste' && b.punkte.some((p) => p.some(zeigt))) ||
    (b.art === 'tabelle' && b.zeilen.some((z) => z.zellen.some((c) => c.inhalt.some(zeigt))));
  return !l.some(zeigt);
}

/** Liest einen Langtext (z. B. `DetailTxt`) mit Bildern an ihrer Stelle. Kein Element: leerer Langtext. */
export function leseLangtext(container: XmlElement | undefined, ids: IdQuelle): Textergebnis {
  if (container === undefined) return { langtext: [], formatierung: [], probleme: [] };
  const s = new Sammler(ids, true);
  const langtext = kanonisch(s.inhalt(container, {}, true));
  return { langtext, formatierung: [...s.formatierung].sort(), probleme: s.probleme };
}

/**
 * Liest einen Kurztext oder Titel als Einzeiler. Der Vertrag hält hier nur eine Zeichenkette: Auszeichnung,
 * Listen, Tabellen und Textergänzungen sind Verlust (`formatierung`), Bilder werden verworfen (Problem).
 */
export function leseKurztext(
  container: XmlElement | undefined,
  ids: IdQuelle,
): { text: string } & Textergebnis {
  if (container === undefined) return { text: '', langtext: [], formatierung: [], probleme: [] };
  const s = new Sammler(ids, false);
  const bausteine = s.inhalt(container, {}, true);
  const alle = (bs: readonly (Baustein | LangtextInnenBaustein)[]): Baustein[] =>
    bs.flatMap((b): Baustein[] => {
      if (b.art === 'absatz') return [b, ...alle(b.inhalt)];
      if (b.art === 'liste') return [b, ...alle(b.punkte.flat())];
      if (b.art === 'tabelle')
        return [b, ...alle(b.zeilen.flatMap((z) => z.zellen.flatMap((c) => c.inhalt)))];
      return [b];
    });
  for (const b of alle(bausteine)) {
    if (b.art === 'text' && (b.fett || b.kursiv || b.unterstrichen))
      s.formatierung.add('Auszeichnung im Kurztext');
    else if (b.art === 'liste') s.formatierung.add('Liste im Kurztext');
    else if (b.art === 'tabelle') s.formatierung.add('Tabelle im Kurztext');
    else if (b.art === 'ergaenzung') s.formatierung.add('Textergänzung im Kurztext');
  }
  const text = einzeiler(bausteine)
    .replace(/[\n\t]+/g, ' ')
    .trim();
  return { text, langtext: [], formatierung: [...s.formatierung].sort(), probleme: s.probleme };
}
