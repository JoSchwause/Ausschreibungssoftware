// SPDX-License-Identifier: AGPL-3.0-or-later
// `Langtext` → GAEB-Textstruktur (Ticket 40), die Umkehrung von `text.ts`.
//
// Abbildung (Ticket 26, Punkt 5; Ticket 32): Textlauf → `span` (Auszeichnung im `style`), Zeilenumbruch → `br`,
// Absatz → `p`, Liste → `ul`/`ol` mit `li`, Tabelle → `table`/`tr`/`td` (`colspan`), Bild → `Image` (oberste Ebene
// eines `Text`) bzw. `image` (in `p`), Textergänzung → `TextComplement` als Geschwister von `Text` in `DetailTxt`.
//
// Was das Schema an einer Stelle nicht zulässt, wird so geschrieben, dass kein Text verloren geht, und gemeldet:
// - eine Tabelle in einem Listenpunkt (`li` kennt kein `table`): die Zellinhalte werden nacheinander geschrieben,
//   die Tabellenform entfällt (Warnung `export-verworfen`);
// - ein loses Bild in einem Listenpunkt oder einer Zelle (`li`/`td` kennen kein Bild): in einem eigenen `p`
//   (kein Verlust; beim Wiederlesen ist es ein Absatz mit dem Bild);
// - eine leere Liste oder Tabelle (`ul`/`ol` brauchen ein `li`, `table` ein `tr`): entfällt (Warnung); ebenso eine
//   Tabellenzeile ohne Zellen (v1.3, D-22 (iii): das XSD ließe ein leeres `tr` zu, der Kern meldet sie als Befund) und
//   damit eine Tabelle, die nur aus leeren Zeilen besteht;
// - ein Bild mit einem Medientyp außer PNG, JPEG, GIF: entfällt (Warnung).

import type {
  Langtext,
  LangtextInnen,
  LangtextInnenBaustein,
  Textbild,
  Textergaenzung,
  Textfluss,
  Textlauf,
} from '@tethys/vertrag';
import type { XmlAusgabe } from './ausgabe';

export interface TextMelder {
  /** Etwas wird nicht (in dieser Form) geschrieben; `art` beschreibt was, gezählt je Datei. */
  verworfen(art: string): void;
  fehler(code: string, meldung: string): void;
}

type Umgebung = 'text' | 'li' | 'td' | 'p';

const BILDTYPEN: ReadonlySet<string> = new Set(['image/png', 'image/jpeg', 'image/gif']);

function stil(t: Textlauf): string | null {
  const teile: string[] = [];
  if (t.fett) teile.push('font-weight:bold;');
  if (t.kursiv) teile.push('font-style:italic;');
  if (t.unterstrichen) teile.push('text-decoration:underline;');
  return teile.length === 0 ? null : teile.join('');
}

/** Ein Textlauf; ein `\n` (Form vor v1.1b) wird ein `br`. */
function textlauf(aus: XmlAusgabe, t: Textlauf): void {
  const s = stil(t);
  t.text.split('\n').forEach((teil, i) => {
    if (i > 0) aus.leer('br');
    if (teil !== '') aus.blatt('span', teil, [['style', s]]);
  });
}

function bild(aus: XmlAusgabe, b: Textbild, name: 'Image' | 'image', m: TextMelder): void {
  if (!BILDTYPEN.has(b.bild.medientyp)) {
    m.verworfen(`Bild mit Medientyp ${b.bild.medientyp} (GAEB kennt nur PNG, JPEG, GIF)`);
    return;
  }
  aus.blatt(name, b.bild.daten, [['Type', b.bild.medientyp]]);
}

function bausteine(aus: XmlAusgabe, liste: LangtextInnen, u: Umgebung, m: TextMelder): void {
  for (const b of liste) baustein(aus, b, u, m);
}

function baustein(aus: XmlAusgabe, b: LangtextInnenBaustein, u: Umgebung, m: TextMelder): void {
  switch (b.art) {
    case 'text':
      textlauf(aus, b);
      return;
    case 'umbruch':
      aus.leer('br');
      return;
    case 'bild':
      if (u === 'text') bild(aus, b, 'Image', m);
      else if (u === 'p') bild(aus, b, 'image', m);
      else
        aus.element('p', [], () => {
          bild(aus, b, 'image', m);
        });
      return;
    case 'absatz':
      aus.element('p', [], () => {
        bausteine(aus, b.inhalt, 'p', m);
      });
      return;
    case 'liste':
      if (b.punkte.length === 0) {
        m.verworfen('leere Liste');
        return;
      }
      aus.element(b.geordnet ? 'ol' : 'ul', [], () => {
        for (const punkt of b.punkte)
          aus.element('li', [], () => {
            bausteine(aus, punkt, 'li', m);
          });
      });
      return;
    case 'tabelle': {
      if (u === 'li') {
        m.verworfen('Tabelle in einem Listenpunkt (Zellinhalte ohne Tabellenform geschrieben)');
        for (const z of b.zeilen) for (const zelle of z.zellen) bausteine(aus, zelle.inhalt, 'li', m);
        return;
      }
      for (const z of b.zeilen) if (z.zellen.length === 0) m.verworfen('leere Tabellenzeile');
      const zeilen = b.zeilen.filter((z) => z.zellen.length > 0);
      if (zeilen.length === 0) {
        m.verworfen('leere Tabelle');
        return;
      }
      aus.element('table', [], () => {
        for (const z of zeilen)
          aus.element('tr', [], () => {
            for (const zelle of z.zellen)
              aus.element('td', [['colspan', zelle.spalten === 1 ? null : String(zelle.spalten)]], () => {
                bausteine(aus, zelle.inhalt, 'td', m);
              });
          });
      });
      return;
    }
  }
}

function fluss(aus: XmlAusgabe, name: string, f: Textfluss, pflicht: boolean): void {
  if (f.length === 0) {
    if (pflicht) aus.leer(name);
    return;
  }
  aus.element(name, [], () => {
    for (const b of f)
      if (b.art === 'text') textlauf(aus, b);
      else aus.leer('br');
  });
}

function ergaenzung(aus: XmlAusgabe, e: Textergaenzung, m: TextMelder): void {
  if (!/^-?[0-9]+$/.test(e.kennung))
    m.fehler(
      'ergaenzung-kennung-ungueltig',
      `Die Kennung „${e.kennung}“ einer Textergänzung ist keine ganze Zahl; GAEB verlangt für MarkLbl eine Zahl.`,
    );
  aus.element(
    'TextComplement',
    [
      ['Kind', e.herkunft === 'bieter' ? 'Bidder' : 'Owner'],
      ['MarkLbl', e.kennung],
      ['Empty', e.leer ? 'Yes' : null],
    ],
    () => {
      fluss(aus, 'ComplCaption', e.davor, false);
      fluss(aus, 'ComplBody', e.inhalt, true);
      fluss(aus, 'ComplTail', e.danach, false);
    },
  );
}

/** `DetailTxt`: Textblöcke in `Text`, Textergänzungen als Geschwister dazwischen. */
export function schreibeDetailtext(aus: XmlAusgabe, langtext: Langtext, m: TextMelder): void {
  if (langtext.length === 0) {
    aus.leer('DetailTxt');
    return;
  }
  aus.element('DetailTxt', [], () => {
    let lauf: LangtextInnenBaustein[] = [];
    const schliesse = (): void => {
      if (lauf.length === 0) return;
      const inhalt = lauf;
      aus.element('Text', [], () => {
        bausteine(aus, inhalt, 'text', m);
      });
      lauf = [];
    };
    for (const b of langtext)
      if (b.art === 'ergaenzung') {
        schliesse();
        ergaenzung(aus, b, m);
      } else lauf.push(b);
    schliesse();
  });
}

/** Ein Einzeiler (Kurztext, Bezeichnung) als `span` in `name`; leer ergibt ein leeres Element. */
export function schreibeEinzeiler(aus: XmlAusgabe, name: string, text: string): void {
  const t = text.replace(/[\r\n\t]+/g, ' ');
  if (t === '') aus.leer(name);
  else
    aus.element(name, [], () => {
      aus.blatt('span', t);
    });
}

/** `OutlineText` mit dem Kurztext; ein leerer Kurztext wird nicht geschrieben. */
export function schreibeKurztext(aus: XmlAusgabe, text: string): void {
  if (text.trim() === '') return;
  aus.element('OutlineText', [], () => {
    aus.element('OutlTxt', [], () => {
      schreibeEinzeiler(aus, 'TextOutlTxt', text);
    });
  });
}
