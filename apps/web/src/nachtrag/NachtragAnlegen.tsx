// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: „Nachtrag anlegen“ auf der Seite eines Auftrags-LV. Ein kleiner Dialog fragt die Bezeichnung; Anlegen schreibt
// LV und Nachtragsangaben als einen Undo-Schritt (`speichern.ts`) und öffnet die LV-Seite des neuen Nachtrags.

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { AuftragsLvKopf } from '@tethys/vertrag';
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { abweisungText } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { nachtragAnlegen } from './speichern';
import { texte } from './texte';

const t = texte.anlegen;

export function NachtragAnlegen({
  auftrag,
  gehe,
}: {
  auftrag: Pick<AuftragsLvKopf, 'id' | 'projektId' | 'ozMaske' | 'mwstSatz'>;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const formId = useId();
  const [offen, setOffen] = useState(false);
  const [bezeichnung, setBezeichnung] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const anlegen = async (): Promise<void> => {
    if (laeuft) return;
    setLaeuft(true);
    const r = await nachtragAnlegen(befehlswegFuer(u), auftrag, bezeichnung);
    setLaeuft(false);
    if (!r.ok) {
      zeige({ ...abweisungText(r.abweisung), art: 'fehler' });
      return;
    }
    setOffen(false);
    setBezeichnung('');
    zeige({ titel: t.angelegt(r.nummer), art: 'erfolg' });
    gehe(`/lv/${r.lvId}`);
  };

  return (
    <>
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={t.titel}
        beschreibung={t.einleitung}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button type="submit" form={formId} variante="primaer" disabled={laeuft}>
              {t.anlegen}
            </Button>
          </>
        }
      >
        {auftrag.ozMaske.gliederung.length === 0 && (
          <p className="nachtrag__hinweis" role="note">
            {t.maskeOhneGliederung}
          </p>
        )}
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            void anlegen();
          }}
        >
          <Eingabefeld
            label={t.bezeichnung}
            hinweis={t.hinweis}
            value={bezeichnung}
            onWertChange={setBezeichnung}
          />
        </form>
      </Dialog>
    </>
  );
}
