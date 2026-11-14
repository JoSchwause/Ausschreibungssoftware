// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „Hinweistext anlegen“ und „Hinweistext ändern“ (E8, B-15): Langtext-Editor wie im Positionsdialog. Beim Anlegen
// wählt der Nutzer die Lage: Vortext am Anfang oder Nachtext am Ende der Gliederung der gewählten Zeile, oder direkt hinter
// der gewählten Position bzw. dem gewählten Hinweistext. Übernehmen ist genau ein Befehl (`HinweistextAnlegen` oder
// `HinweistextAendern`), ein Undo-Schritt.

import { Button, Dialog, LangtextEditor } from '@tethys/ui-basis';
import type {
  Hinweistext,
  HinweistextId,
  KnotenId,
  Langtext,
  Leistungsverzeichnis,
  LvBefehl,
} from '@tethys/vertrag';
import { useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { hinweistextOrt, type Hinweistextlage } from './einfuegeort';
import { ozText } from './oztext';
import { texte } from './texte';

const t = texte.hinweistext;

/** Was der Dialog tut: anlegen an der gewählten Zeile oder einen vorhandenen Hinweistext ändern. */
export type Hinweistextauftrag =
  | { readonly art: 'anlegen'; readonly aktiv: KnotenId | null }
  | { readonly art: 'aendern'; readonly hinweis: Hinweistext };

export function HinweistextDialog(props: {
  lv: Leistungsverzeichnis;
  auftrag: Hinweistextauftrag | null;
  onSchliessen: () => void;
  neueId: () => HinweistextId;
  /** Schickt den Befehl; `true`, wenn er angenommen und gespeichert wurde (sonst meldet die Seite den Grund). */
  senden: (befehl: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const { auftrag, onSchliessen } = props;
  return (
    <Dialog
      offen={auftrag !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={auftrag?.art === 'aendern' ? t.titelAendern : t.titelAnlegen}
    >
      {auftrag === null ? null : (
        <Inhalt key={auftrag.art === 'aendern' ? auftrag.hinweis.id : 'neu'} {...props} auftrag={auftrag} />
      )}
    </Dialog>
  );
}

function Inhalt(props: {
  lv: Leistungsverzeichnis;
  auftrag: Hinweistextauftrag;
  onSchliessen: () => void;
  neueId: () => HinweistextId;
  senden: (befehl: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const { lv, auftrag, onSchliessen, neueId, senden } = props;
  const formId = useId();
  const anfang = auftrag.art === 'aendern' ? auftrag.hinweis.text : [];
  /** Immer der neueste Text: der Editor meldet beim Verlassen, kurz vor dem Klick auf Übernehmen. */
  const text = useRef<Langtext>(anfang);
  const [lage, setLage] = useState<Hinweistextlage>('vortext');
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const aktiv = auftrag.art === 'anlegen' ? auftrag.aktiv : null;
  const aktivKnoten = aktiv === null ? undefined : lv.knoten.find((k) => k.id === aktiv);
  const hinterMoeglich = aktivKnoten?.art === 'position' || aktivKnoten?.art === 'hinweis';
  const gliederungsname = (): string => {
    const ort = hinweistextOrt(lv, aktiv, 'nachtext');
    const g = ort.art === 'ende' ? lv.knoten.find((k) => k.id === ort.elternId) : undefined;
    if (g === undefined || g.art === 'hinweis') return t.obersteEbene;
    return t.gliederung([ozText(g), g.kurztext].filter((x) => x !== '').join(' '));
  };

  const uebernehmen = async (): Promise<void> => {
    const l = text.current;
    if (l.length === 0) {
      setFehler(t.leer);
      return;
    }
    setFehler(null);
    setLaeuft(true);
    const befehl: LvBefehl =
      auftrag.art === 'aendern'
        ? { art: 'HinweistextAendern', knotenId: auftrag.hinweis.id, text: l }
        : { art: 'HinweistextAnlegen', id: neueId(), ort: hinweistextOrt(lv, aktiv, lage), text: l };
    const ok = await senden(befehl);
    setLaeuft(false);
    if (ok) onSchliessen();
  };

  const option = (wert: Hinweistextlage, label: string, gesperrt = false): ReactElement => (
    <label className="lv__option">
      <input
        type="radio"
        name={`${formId}-lage`}
        checked={lage === wert}
        disabled={gesperrt}
        onChange={() => {
          setLage(wert);
        }}
      />
      {label}
    </label>
  );

  return (
    <form
      id={formId}
      className="lv-dialog lv-dialog--schmal"
      onSubmit={(e) => {
        e.preventDefault();
        void uebernehmen();
      }}
    >
      {auftrag.art === 'anlegen' ? (
        <fieldset className="lv-dialog__bereich">
          <legend>{t.lage}</legend>
          <p className="lv-dialog__hinweis">{gliederungsname()}</p>
          {option('vortext', t.vortext)}
          {option('nachtext', t.nachtext)}
          {option('hinter', t.hinter, !hinterMoeglich)}
        </fieldset>
      ) : null}
      <div className="lv-dialog__langtext">
        <span className="tx-feld__label">{t.text}</span>
        <LangtextEditor
          wert={anfang}
          beschriftung={t.text}
          onBestaetigen={(l) => {
            text.current = l;
            setFehler(null);
          }}
        />
        <p className="lv__meldung" role="status">
          {fehler ?? ''}
        </p>
      </div>
      <footer className="tx-dialog__fuss">
        <Button onClick={onSchliessen}>{texte.dialog.abbrechen}</Button>
        <Button type="submit" variante="primaer" disabled={laeuft}>
          {texte.dialog.uebernehmen}
        </Button>
      </footer>
    </form>
  );
}
