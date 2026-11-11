// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64 (V4, D-21): Dialog „Zuschlag erteilen“ aus dem Preisspiegel. Vor dem Bestätigen: Wahlgruppen zum Ankreuzen
// (höchstens eine Alternative je Gruppe), Zahl der entfallenden und der unbepreisten Positionen, Warnungen in Worten.
// Bestätigen schickt `AuftragsLeistungsverzeichnisAnlegen` über den Befehlsweg (ein Undo-Schritt, U7); der Dialog ist die
// ausdrückliche Bestätigung (Q5).

import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type {
  AngebotZustand,
  AuftragsLeistungsverzeichnisId,
  LvZustand,
  PositionId,
  Projekt,
} from '@tethys/vertrag';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { abweisungText } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { zuschlagserteilungSpeichern } from './auftrag';
import { texte } from './texte';
import { wahlSetzen, zuschlagserteilungPlanen } from './zuschlagserteilung';
import './auftrag.css';

const t = texte.dialog;

export interface ZuschlagserteilungDialogProps {
  readonly lv: LvZustand;
  readonly projekt: Projekt;
  /** Das Angebot, das den Zuschlag bekommen soll, mit dem Namen des Bieters; `null`: Dialog zu. */
  readonly bieter: { readonly name: string; readonly zustand: AngebotZustand } | null;
  readonly onSchliessen: () => void;
  /** Der Zuschlag ist geschrieben. */
  readonly onErteilt: (id: AuftragsLeistungsverzeichnisId) => void;
}

export function ZuschlagserteilungDialog(props: ZuschlagserteilungDialogProps): ReactElement {
  const { bieter } = props;
  return (
    <Dialog
      offen={bieter !== null}
      onOffenChange={(o) => {
        if (!o) props.onSchliessen();
      }}
      titel={bieter === null ? t.titel('') : t.titel(bieter.name)}
    >
      {bieter === null ? null : <Inhalt {...props} bieter={bieter} key={bieter.zustand.angebot.id} />}
    </Dialog>
  );
}

function Inhalt({
  lv,
  projekt,
  bieter,
  onSchliessen,
  onErteilt,
}: ZuschlagserteilungDialogProps & {
  bieter: NonNullable<ZuschlagserteilungDialogProps['bieter']>;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  // Die Kennung des neuen Auftrags-LV entsteht einmal je Dialog (A2: Kennungen kommen von der App).
  const [neueId] = useState(() => u.ids.auftragsLeistungsverzeichnis());
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<PositionId>>(new Set());
  const [laeuft, setLaeuft] = useState(false);
  const plan = useMemo(
    () => zuschlagserteilungPlanen({ lv, angebot: bieter.zustand, projekt, gewaehlt, neueId }),
    [lv, bieter, projekt, gewaehlt, neueId],
  );

  const erteilen = async (): Promise<void> => {
    if (plan.befehl === null || laeuft) return;
    setLaeuft(true);
    const r = await zuschlagserteilungSpeichern(befehlswegFuer(u), plan.befehl);
    setLaeuft(false);
    if (r.ok) {
      zeige({ titel: t.erteilt(bieter.name), art: 'erfolg' });
      onErteilt(r.id);
      return;
    }
    if (r.art === 'schon-vergeben') {
      zeige({ titel: t.nichtErteilt, beschreibung: texte.schonVergeben, art: 'fehler' });
      onSchliessen();
      return;
    }
    zeige({ ...abweisungText(r.abweisung), art: 'fehler' });
  };

  return (
    <div className="auftrag__zuschlag">
      <p>{t.einleitung(bieter.name)}</p>
      {plan.wahlgruppen.length === 0 ? (
        <p>{t.keineWahl}</p>
      ) : (
        plan.wahlgruppen.map((g, i) => (
          <fieldset key={`${String(i)}-${g.titel}`} className="auftrag__wahlgruppe">
            <legend>{g.titel}</legend>
            {g.alternativen.map((x) => (
              <label key={x.positionId} className="auftrag__option">
                <input
                  type="checkbox"
                  checked={x.gewaehlt}
                  onChange={(e) => {
                    setGewaehlt((alt) => wahlSetzen(alt, g, x.positionId, e.target.checked));
                  }}
                />
                {t.waehlen(x.text)}
              </label>
            ))}
          </fieldset>
        ))
      )}
      <dl className="auftrag__zahlen">
        <dt>{t.entfallend}</dt>
        <dd data-testid="zuschlag-entfallend">{plan.entfallend ?? '–'}</dd>
        <dt>{t.unbepreist}</dt>
        <dd data-testid="zuschlag-unbepreist">{plan.unbepreist ?? '–'}</dd>
      </dl>
      {plan.fehler === null ? null : (
        <p className="auftrag__fehler" role="alert">
          {plan.fehler}
        </p>
      )}
      {plan.warnungen.length === 0 ? null : (
        <section aria-label={t.warnungen}>
          <h3 className="auftrag__unterkopf">{t.warnungen}</h3>
          <ul className="auftrag__warnungen">
            {plan.warnungen.map((w, i) => (
              <li key={`${String(i)}-${w}`}>{w}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="auftrag__leise">{t.undo}</p>
      <div className="auftrag__fuss">
        <Button onClick={onSchliessen}>{t.abbrechen}</Button>
        <Button variante="primaer" disabled={plan.befehl === null || laeuft} onClick={() => void erteilen()}>
          {t.bestaetigen}
        </Button>
      </div>
    </div>
  );
}
