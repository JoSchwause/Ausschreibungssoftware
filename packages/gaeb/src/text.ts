// SPDX-License-Identifier: AGPL-3.0-or-later
// GAEB-Textstruktur (Absätze, Spans, Tabellen, Listen, Bilder, Textergänzungen) → `Langtext` oder Einzeiler.
//
// `vertrag` kennt im Langtext nur Text und Bilder (Ticket 02, Offene Typfragen 7). Alles andere (Zeichen- und
// Absatzformat, Tabellenstruktur, Listenstruktur, Seitenumbruch, Kennzeichnung der Textergänzungen) geht verloren;
// der Leser liefert dafür `formatierung` zurück, damit der Aufrufer es als Befund meldet (Q5: kein stiller Verlust).

import type { IdQuelle, Langtext, LangtextBaustein } from '@tethys/vertrag';
import { elementKinder, textInhalt } from './xml';
import type { XmlElement } from './xml';

export interface Textproblem {
  readonly code: 'bild-ungueltig' | 'bild-medientyp-fehlt' | 'bild-in-kurztext-verworfen';
  readonly meldung: string;
  readonly element: XmlElement;
}

export interface Textergebnis {
  readonly langtext: Langtext;
  /** Arten der verworfenen Auszeichnung, sortiert und ohne Doppelte; leer: nichts ging verloren. */
  readonly formatierung: readonly string[];
  readonly probleme: readonly Textproblem[];
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

class Sammler {
  readonly bausteine: LangtextBaustein[] = [];
  readonly formatierung = new Set<string>();
  readonly probleme: Textproblem[] = [];
  puffer = '';

  constructor(
    private readonly ids: IdQuelle,
    private readonly bilderErlaubt: boolean,
  ) {}

  text(s: string): void {
    this.puffer += s;
  }

  /** Beginnt eine neue Zeile, wenn die aktuelle nicht leer ist. */
  zeilenanfang(): void {
    if (this.puffer !== '' && !this.puffer.endsWith('\n')) this.puffer += '\n';
  }

  absatzEnde(leer: boolean): void {
    if (leer || !this.puffer.endsWith('\n')) this.puffer += '\n';
  }

  leere(): void {
    const roh = this.puffer;
    this.puffer = '';
    const s = roh.replace(/^\n+/, '').replace(/\n+$/, '');
    if (s.trim() !== '') this.bausteine.push({ art: 'text', text: s });
  }

  bild(e: XmlElement): void {
    if (!this.bilderErlaubt) {
      this.probleme.push({
        code: 'bild-in-kurztext-verworfen',
        meldung: 'Ein Bild in einem Kurztext wird verworfen.',
        element: e,
      });
      return;
    }
    const daten = textInhalt(e).replace(/\s+/g, '');
    if (daten === '' || !BASE64.test(daten)) {
      this.probleme.push({
        code: 'bild-ungueltig',
        meldung: 'Der Bildinhalt ist leer oder keine gültige Base64-Zeichenfolge; das Bild wird verworfen.',
        element: e,
      });
      return;
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
    this.leere();
    this.bausteine.push({
      art: 'bild',
      bild: { id: this.ids.bild(), medientyp: medientyp.trim(), daten },
    });
  }
}

function markiereStil(e: XmlElement, s: Sammler): void {
  const stil = e.attrs.get('style');
  if (stil !== undefined && stil.trim() !== '') s.formatierung.add('Zeichen- und Absatzformat (style)');
}

function gehe(e: XmlElement, s: Sammler, liste: { ordered: boolean; n: number } | null): void {
  for (const k of e.children) {
    if (typeof k === 'string') {
      if (e.name === 'span' || k.trim() !== '') s.text(k);
      continue;
    }
    markiereStil(k, s);
    switch (k.name) {
      case 'span':
      case 'Text':
      case 'DetailTxt':
      case 'TextOutlTxt':
      case 'OutlTxt':
      case 'LblTx':
      case 'ComplCaption':
      case 'ComplBody':
      case 'ComplTail':
        gehe(k, s, liste);
        break;
      case 'br':
        s.text('\n');
        break;
      case 'p': {
        s.zeilenanfang();
        const vorher = s.puffer.length + s.bausteine.length;
        gehe(k, s, liste);
        s.absatzEnde(s.puffer.length + s.bausteine.length === vorher);
        break;
      }
      case 'table':
        s.formatierung.add('Tabelle');
        s.zeilenanfang();
        gehe(k, s, liste);
        s.zeilenanfang();
        break;
      case 'tr': {
        s.zeilenanfang();
        elementKinder(k).forEach((zelle, i) => {
          if (i > 0) s.text('\t');
          markiereStil(zelle, s);
          gehe(zelle, s, liste);
        });
        s.zeilenanfang();
        break;
      }
      case 'td':
      case 'th':
        gehe(k, s, liste);
        break;
      case 'ul':
      case 'ol':
        s.formatierung.add('Liste');
        s.zeilenanfang();
        gehe(k, s, { ordered: k.name === 'ol', n: 0 });
        s.zeilenanfang();
        break;
      case 'li': {
        s.zeilenanfang();
        if (liste) {
          liste.n += 1;
          s.text(liste.ordered ? `${String(liste.n)}. ` : '- ');
        }
        gehe(k, s, liste);
        s.zeilenanfang();
        break;
      }
      case 'image':
        s.bild(k);
        break;
      case 'page':
        s.formatierung.add('Seitenumbruch');
        break;
      case 'TextComplement':
        s.formatierung.add('Textergänzung (Art und Nummer der Kennzeichnung)');
        gehe(k, s, liste);
        break;
      default:
        s.formatierung.add(`Element ${k.name}`);
        gehe(k, s, liste);
    }
  }
}

/** Liest einen Langtext (z. B. `DetailTxt`, `Text`) mit Bildern an ihrer Stelle. `null`: kein Element. */
export function leseLangtext(container: XmlElement | undefined, ids: IdQuelle): Textergebnis {
  if (container === undefined) return { langtext: [], formatierung: [], probleme: [] };
  const s = new Sammler(ids, true);
  markiereStil(container, s);
  gehe(container, s, null);
  s.leere();
  return { langtext: s.bausteine, formatierung: [...s.formatierung].sort(), probleme: s.probleme };
}

/** Liest einen Kurztext oder Titel als Einzeiler. Bilder werden verworfen und als Problem gemeldet. */
export function leseKurztext(
  container: XmlElement | undefined,
  ids: IdQuelle,
): { text: string } & Textergebnis {
  if (container === undefined) return { text: '', langtext: [], formatierung: [], probleme: [] };
  const s = new Sammler(ids, false);
  markiereStil(container, s);
  gehe(container, s, null);
  const roh = s.puffer;
  const text = roh.replace(/[\n\t]+/g, ' ').trim();
  return { text, langtext: [], formatierung: [...s.formatierung].sort(), probleme: s.probleme };
}
