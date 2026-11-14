// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „OZ-Maske ändern“ (E8, F2): Maske als Text wie beim Anlegen des LV, dazu die Los-Stufe. Die Vorschau rechnet der
// Kern auf dem geladenen Stand (`ozMaskeVorschau`): neue Ordnungszahlen oder die Liste der Zeilen, die nicht passen. Passt
// die Maske nicht, lässt sie sich nicht übernehmen und das LV bleibt, wie es ist (Q5). Übernehmen ist genau ein Befehl
// (`OzMaskeSetzen`, er nummeriert den ganzen Baum neu), ein Undo-Schritt.

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { LvBefehl, LvZustand, OzMaske } from '@tethys/vertrag';
import { useId, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { ozMaskeLesen, ozMaskeText } from './ozmaske';
import { ozMaskeVorschau } from './ozmaskeVorschau';
import { texte } from './texte';

const t = texte.ozMaske;
/** So viele Zeilen zeigt die Vorschau; der Rest steht als Anzahl darunter. */
const MAX_ZEILEN = 12;

export function OzMaskeDialog(props: {
  zustand: LvZustand;
  offen: boolean;
  onSchliessen: () => void;
  /** Schickt den Befehl; `true`, wenn er angenommen und gespeichert wurde (sonst meldet die Seite den Grund). */
  senden: (befehl: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const { offen, onSchliessen } = props;
  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
    >
      {offen ? <Inhalt {...props} /> : null}
    </Dialog>
  );
}

function Inhalt(props: {
  zustand: LvZustand;
  onSchliessen: () => void;
  senden: (befehl: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const { zustand, onSchliessen, senden } = props;
  const formId = useId();
  const vorschauId = useId();
  const jetzt = zustand.leistungsverzeichnis.ozMaske;
  const [text, setText] = useState(() => ozMaskeText(jetzt));
  const [los, setLos] = useState(jetzt.losStufe === true);
  const [laeuft, setLaeuft] = useState(false);

  const gelesen = ozMaskeLesen(text);
  const maske: OzMaske | null = gelesen.ok
    ? los
      ? { ...gelesen.wert, losStufe: true }
      : gelesen.wert
    : null;
  // Die Vorschau hängt nur am Stand und an der Eingabe, nicht an jedem neuen Maskenobjekt.
  const vorschau = useMemo(() => {
    const g = ozMaskeLesen(text);
    if (!g.ok) return null;
    return ozMaskeVorschau(zustand, los ? { ...g.wert, losStufe: true } : g.wert);
  }, [zustand, text, los]);
  const uebernehmbar = vorschau?.art === 'neu' && !laeuft;

  const uebernehmen = async (): Promise<void> => {
    if (maske === null || !uebernehmbar) return;
    setLaeuft(true);
    const ok = await senden({ art: 'OzMaskeSetzen', maske });
    setLaeuft(false);
    if (ok) onSchliessen();
  };

  return (
    <form
      id={formId}
      className="lv-dialog lv-dialog--schmal"
      onSubmit={(e) => {
        e.preventDefault();
        void uebernehmen();
      }}
    >
      <Eingabefeld
        label={t.feld}
        value={text}
        hinweis={t.hinweis}
        onWertChange={setText}
        spellCheck={false}
        {...(gelesen.ok ? {} : { meldung: gelesen.fehler })}
      />
      <label className="lv__option">
        <input
          type="checkbox"
          checked={los}
          onChange={(e) => {
            setLos(e.target.checked);
          }}
        />
        {t.losStufe}
      </label>
      <section className="lv-dialog__bereich" aria-label={t.vorschau}>
        <div id={vorschauId} role="status" aria-live="polite">
          {vorschau === null ? null : vorschau.art === 'gleich' ? (
            <p className="lv-dialog__hinweis">{t.gleich}</p>
          ) : vorschau.art === 'neu' ? (
            vorschau.aenderungen.length === 0 ? (
              <p className="lv-dialog__hinweis">{t.bleibt}</p>
            ) : (
              <p className="lv-dialog__hinweis">{t.neu(vorschau.aenderungen.length)}</p>
            )
          ) : (
            <>
              <p className="lv__meldung">{t.abgewiesen}</p>
              <p>
                {vorschau.knoten.length === 0
                  ? vorschau.meldung
                  : (t.konflikt[vorschau.code] ?? t.konfliktAllgemein)}
              </p>
            </>
          )}
        </div>
        {vorschau?.art === 'neu' && vorschau.aenderungen.length > 0 ? (
          <Liste
            name={t.vorschau}
            zeilen={vorschau.aenderungen.map((a) => ({
              id: a.knotenId,
              text: `${a.vorher || t.ohneOz} → ${a.nachher} ${a.kurztext}`,
            }))}
          />
        ) : null}
        {vorschau?.art === 'abgewiesen' && vorschau.knoten.length > 0 ? (
          <Liste
            name={t.konfliktAllgemein}
            zeilen={vorschau.knoten.map((k) => ({
              id: k.knotenId,
              text: `${k.oz || t.ohneOz} ${k.kurztext}`,
            }))}
          />
        ) : null}
      </section>
      <footer className="tx-dialog__fuss">
        <Button onClick={onSchliessen}>{texte.dialog.abbrechen}</Button>
        <Button type="submit" variante="primaer" disabled={!uebernehmbar}>
          {texte.dialog.uebernehmen}
        </Button>
      </footer>
    </form>
  );
}

function Liste({
  name,
  zeilen,
}: {
  name: string;
  zeilen: readonly { id: string; text: string }[];
}): ReactElement {
  return (
    <ul className="lv-ozmaske__liste" aria-label={name}>
      {zeilen.slice(0, MAX_ZEILEN).map((z) => (
        <li key={z.id}>{z.text}</li>
      ))}
      {zeilen.length > MAX_ZEILEN ? (
        <li className="lv-dialog__hinweis">{t.weitere(zeilen.length - MAX_ZEILEN)}</li>
      ) : null}
    </ul>
  );
}
