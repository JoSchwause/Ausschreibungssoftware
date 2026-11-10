// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingeschränktes Schema des Langtext-Editors (Ticket 34, F6, ADR 0004): eine Erlaubnisliste einzelner TipTap-
// Erweiterungen, kein StarterKit. Es kennt genau die GAEB-abbildbare Teilmenge des Vertrags; was es nicht kennt, fällt
// beim Einfügen weg. Knotennamen siehe `KNOTEN` in `abbildung.ts`.

import { getSchema, mergeAttributes, Node, type AnyExtension } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image';
import Italic from '@tiptap/extension-italic';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import Paragraph from '@tiptap/extension-paragraph';
import { Table, TableCell, TableRow } from '@tiptap/extension-table';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import type { Schema } from '@tiptap/pm/model';
import type { Ergaenzungsherkunft, Textfluss } from '@tethys/vertrag';
import { KNOTEN } from './abbildung';
import { langtextTexte } from '../texte';

/** Dokument: Blöcke und, nur auf oberster Ebene, Textergänzungen. */
const Dokument = Document.extend({ content: `(block | ${KNOTEN.textergaenzung})+` });

/** Absatz mit dem Attribut `lose`: Inline-Bausteine, die im Langtext ohne Absatz stehen. Eingefügt ist nie lose. */
const Absatz = Paragraph.extend({
  addAttributes() {
    return {
      lose: {
        default: false,
        parseHTML: () => false,
        renderHTML: (a: Record<string, unknown>) => (a['lose'] === true ? { 'data-lose': '' } : {}),
      },
    };
  },
});

/** Harter Zeilenumbruch nur mit Umschalt+Enter; Strg+Enter bestätigt den Editor. */
const Umbruch = HardBreak.extend({
  addKeyboardShortcuts() {
    return { 'Shift-Enter': () => this.editor.commands.setHardBreak() };
  },
});

/** Nummerierte Liste ohne Startwert und ohne Zählart (der Vertrag kennt nur `geordnet`). */
const NummerierteListe = OrderedList.extend({
  addAttributes() {
    return {};
  },
  renderHTML({ HTMLAttributes }) {
    return ['ol', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

/** Listenpunkt: beliebige Blöcke wie ein Langtext ohne Textergänzung (auch eine Liste oder Tabelle zuerst). */
const Listenpunkt = ListItem.extend({ content: 'block+' });

/**
 * Tabelle ohne die Plugins von prosemirror-tables: `fixTables` würde ungleich lange Zeilen beim Bearbeiten mit
 * Zellen auffüllen und so den Langtext ändern. Tab und Umschalt+Tab wechseln die Zelle; sie legen keine Zeile an.
 */
const Tabelle = Table.extend({
  addProseMirrorPlugins() {
    return [];
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.goToNextCell(),
      'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
    };
  },
});

/** Tabellenzeile: nur Zellen, keine Kopfzellen. */
const Tabellenzeile = TableRow.extend({ content: `${KNOTEN.tabellenzelle}+` });

/** Zelle: nur `colspan`; `rowspan` ist fest 1, Spaltenbreiten gibt es nicht (die Attribute braucht prosemirror-tables). */
const Tabellenzelle = TableCell.extend({
  addAttributes() {
    return {
      colspan: {
        default: 1,
        parseHTML: (el: HTMLElement) =>
          Math.max(1, Number.parseInt(el.getAttribute('colspan') ?? '1', 10) || 1),
      },
      rowspan: { default: 1, parseHTML: () => 1, renderHTML: () => ({}) },
      colwidth: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
    };
  },
});

/**
 * Bild im Text (inline wie im Vertrag) mit `id`, `medientyp`, `daten`; angezeigt als `data:`-URL in einem `img`.
 * Eingefügte Bilder fallen weg (sie hätten keine `BildId`), Eingaberegeln gibt es keine.
 */
const Bildknoten = Image.extend({
  inline: true,
  group: 'inline',
  draggable: false,
  addAttributes() {
    return {
      id: { default: null, rendered: false },
      medientyp: { default: null, rendered: false },
      daten: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [];
  },
  renderHTML({ node }) {
    const a = node.attrs as Record<string, unknown>;
    return [
      'img',
      {
        class: 'tx-langtext-bild',
        alt: langtextTexte.bild,
        src: `data:${String(a['medientyp'])};base64,${String(a['daten'])}`,
      },
    ];
  },
  addInputRules() {
    return [];
  },
});

/** Text einer Textergänzung zur Anzeige: Umbrüche als Leerzeichen. */
function textflussText(fluss: unknown): string {
  if (!Array.isArray(fluss)) return '';
  return (fluss as Textfluss)
    .map((b) => (b.art === 'text' ? b.text : ' '))
    .join('')
    .replace(/\n/g, ' ');
}

/**
 * Textergänzung: Atom-Block nur auf oberster Ebene (kein Mitglied der Gruppe `block`, daher nicht in Listen oder
 * Zellen). Die sechs Felder sind reine Daten in den Attributen. Wird angezeigt und als Ganzes gelöscht, nie aus
 * eingefügtem HTML gelesen.
 */
const Textergaenzungsknoten = Node.create({
  name: KNOTEN.textergaenzung,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      herkunft: { default: 'bieter', rendered: false },
      kennung: { default: '', rendered: false },
      leer: { default: false, rendered: false },
      davor: { default: [], rendered: false },
      inhalt: { default: [], rendered: false },
      danach: { default: [], rendered: false },
    };
  },
  parseHTML() {
    return [];
  },
  renderHTML({ node }) {
    const a = node.attrs as Record<string, unknown>;
    const herkunft = a['herkunft'] as Ergaenzungsherkunft;
    const inhalt = textflussText(a['inhalt']);
    return [
      'div',
      { class: 'tx-langtext-ergaenzung', 'data-herkunft': herkunft, contenteditable: 'false' },
      [
        'span',
        { class: 'tx-langtext-ergaenzung__art' },
        `${langtextTexte.ergaenzung[herkunft]} ${String(a['kennung'])}`,
      ],
      ['span', {}, textflussText(a['davor'])],
      [
        'span',
        { class: 'tx-langtext-ergaenzung__inhalt' },
        inhalt === '' ? langtextTexte.ergaenzungLeer : inhalt,
      ],
      ['span', {}, textflussText(a['danach'])],
    ];
  },
});

/** Die Erlaubnisliste: genau diese Knoten und Marken, sonst nichts. */
export const langtextSchemaErweiterungen: readonly AnyExtension[] = [
  Dokument,
  Absatz,
  Text,
  Bold,
  Italic,
  Underline,
  Umbruch,
  BulletList,
  NummerierteListe,
  Listenpunkt,
  Tabelle,
  Tabellenzeile,
  Tabellenzelle,
  Bildknoten,
  Textergaenzungsknoten,
];

/** ProseMirror-Schema des Langtext-Editors (ohne DOM, z. B. zum Prüfen eines Dokuments). */
export function langtextSchema(): Schema {
  return getSchema([...langtextSchemaErweiterungen]);
}
