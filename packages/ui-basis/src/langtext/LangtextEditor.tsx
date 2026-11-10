// SPDX-License-Identifier: AGPL-3.0-or-later
// Langtext-Editor (Ticket 34): TipTap mit eingeschränktem Schema. Arbeitet auf einer Kopie und meldet den neuen
// `Langtext` genau einmal beim Bestätigen (Fokus verlassen oder Strg+Enter); Esc verwirft. Kein Befehl, kein Speichern:
// den Befehl baut der Aufrufer (A5).

import type { Langtext } from '@tethys/vertrag';
import { Extension, type Editor } from '@tiptap/core';
import { Gapcursor, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useMemo, useRef, type FocusEvent, type ReactElement, type ReactNode } from 'react';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { langtextTexte } from '../texte';
import { Tooltip } from '../Tooltip';
import { dokumentZuLangtext, langtextGleich, langtextKanonisch, langtextZuDokument } from './abbildung';
import { langtextSchemaErweiterungen } from './schema';

export interface LangtextEditorProps {
  wert: Langtext;
  /** Wird genau einmal je Bestätigen mit dem geänderten Langtext gerufen, nie ohne Änderung. */
  onBestaetigen: (l: Langtext) => void;
  /** Zugängliche Beschriftung des Eingabefelds. */
  beschriftung: string;
  nurLesen?: boolean;
}

export function LangtextEditor({
  wert,
  onBestaetigen,
  beschriftung,
  nurLesen = false,
}: LangtextEditorProps): ReactElement {
  /** Zuletzt übernommener Stand (kanonisch): Vergleichsbasis fürs Melden und Ziel fürs Verwerfen. */
  const basis = useRef<Langtext>(langtextKanonisch(wert));
  const melden = useRef<(l: Langtext) => void>(() => undefined);
  const aktionen = useRef<{ bestaetigen: () => void; verwerfen: () => void }>({
    bestaetigen: () => undefined,
    verwerfen: () => undefined,
  });

  useEffect(() => {
    melden.current = onBestaetigen;
  }, [onBestaetigen]);

  const erweiterungen = useMemo(
    () => [
      ...langtextSchemaErweiterungen,
      UndoRedo,
      Gapcursor,
      Extension.create({
        name: 'langtextBestaetigen',
        addKeyboardShortcuts() {
          return {
            'Mod-Enter': () => {
              aktionen.current.bestaetigen();
              return true;
            },
            Escape: () => {
              aktionen.current.verwerfen();
              return true;
            },
          };
        },
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions: erweiterungen,
    content: langtextZuDokument(wert),
    editable: !nurLesen,
    editorProps: {
      attributes: {
        'aria-label': beschriftung,
        'aria-multiline': 'true',
        role: 'textbox',
        class: 'tx-langtext__feld',
      },
    },
  });

  aktionen.current = {
    bestaetigen: () => {
      if (nurLesen) return;
      const neu = dokumentZuLangtext(editor.getJSON());
      if (langtextGleich(neu, basis.current)) return;
      basis.current = neu;
      melden.current(neu);
    },
    verwerfen: () => {
      setzeInhalt(editor, basis.current);
    },
  };

  // Neuer Wert von außen: Basis übernehmen, Inhalt nur ersetzen, wenn er sich unterscheidet (Cursor bleibt sonst).
  useEffect(() => {
    const kanonisch = langtextKanonisch(wert);
    basis.current = kanonisch;
    if (!langtextGleich(dokumentZuLangtext(editor.getJSON()), kanonisch)) setzeInhalt(editor, kanonisch);
  }, [editor, wert]);

  useEffect(() => {
    editor.setEditable(!nurLesen);
  }, [editor, nurLesen]);

  const verlassen = (e: FocusEvent<HTMLDivElement>): void => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    aktionen.current.bestaetigen();
  };

  return (
    <div className="tx-langtext" onBlur={verlassen}>
      {nurLesen ? null : <Werkzeugleiste editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function setzeInhalt(editor: Editor, l: Langtext): void {
  editor.commands.setContent(langtextZuDokument(l), { emitUpdate: false });
}

function Werkzeugleiste({ editor }: { editor: Editor }): ReactElement {
  const aktiv = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      fett: e.isActive('bold'),
      kursiv: e.isActive('italic'),
      unterstrichen: e.isActive('underline'),
      aufzaehlung: e.isActive('bulletList'),
      nummeriert: e.isActive('orderedList'),
    }),
  });
  const kette = () => editor.chain().focus();
  return (
    <div className="tx-langtext__werkzeuge" role="toolbar" aria-label={langtextTexte.werkzeugleiste}>
      <Werkzeug
        text={langtextTexte.fett}
        kuerzel="Strg+B"
        aktiv={aktiv.fett}
        onAusloesen={() => kette().toggleBold().run()}
      >
        <span className="tx-langtext__zeichen tx-langtext__zeichen--fett">F</span>
      </Werkzeug>
      <Werkzeug
        text={langtextTexte.kursiv}
        kuerzel="Strg+I"
        aktiv={aktiv.kursiv}
        onAusloesen={() => kette().toggleItalic().run()}
      >
        <span className="tx-langtext__zeichen tx-langtext__zeichen--kursiv">K</span>
      </Werkzeug>
      <Werkzeug
        text={langtextTexte.unterstrichen}
        kuerzel="Strg+U"
        aktiv={aktiv.unterstrichen}
        onAusloesen={() => kette().toggleUnderline().run()}
      >
        <span className="tx-langtext__zeichen tx-langtext__zeichen--unterstrichen">U</span>
      </Werkzeug>
      <Werkzeug
        text={langtextTexte.aufzaehlung}
        kuerzel="Strg+Umschalt+8"
        aktiv={aktiv.aufzaehlung}
        onAusloesen={() => kette().toggleBulletList().run()}
      >
        <Icon name="aufzaehlung" />
      </Werkzeug>
      <Werkzeug
        text={langtextTexte.nummerierteListe}
        kuerzel="Strg+Umschalt+7"
        aktiv={aktiv.nummeriert}
        onAusloesen={() => kette().toggleOrderedList().run()}
      >
        <Icon name="nummeriert" />
      </Werkzeug>
    </div>
  );
}

interface WerkzeugProps {
  text: string;
  kuerzel: string;
  aktiv: boolean;
  onAusloesen: () => void;
  children: ReactNode;
}

function Werkzeug({ text, kuerzel, aktiv, onAusloesen, children }: WerkzeugProps): ReactElement {
  return (
    <Tooltip text={text} kuerzel={kuerzel}>
      <Button
        variante="schlicht"
        groesse="sm"
        aria-label={text}
        aria-pressed={aktiv}
        // Maus: Fokus bleibt im Text, damit der Klick nicht als „Verlassen“ bestätigt.
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={onAusloesen}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
