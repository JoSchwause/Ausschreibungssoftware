// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/honorar` (Ticket 119): die Honorarberechnungen des Projekts, anlegen, öffnen. Jede Änderung ist ein
// Befehl durch `honorar` und Speicher (A5). Die Bruttosumme je Berechnung rechnet `honorar` (N1).

import { formatiereBetragDe } from '@tethys/dezimal';
import { Button, Eingabefeld } from '@tethys/ui-basis';
import type { Honorarberechnung, Kostenermittlung, Projekt, ProjektId } from '@tethys/vertrag';
import { useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Ladeansicht, useSeitenladen } from '../ui/seite';
import { Verweis } from '../ui/Verweis';
import { honorarberechnungPfad } from './pfad';
import {
  ergebnisBerechnen,
  honorarberechnungNeu,
  honorarberechnungSitzung,
  honorarberechnungenLaden,
  kostenermittlungenDesProjekts,
} from './schreiben';
import { texte } from './texte';
import '../lv/lv.css';
import '../projekt/projekt.css';
import './honorar.css';

interface Stand {
  projekt: Projekt;
  berechnungen: readonly Honorarberechnung[];
  kostenermittlungen: readonly Kostenermittlung[];
}

export function HonorarListeSeite({
  projektId,
  gehe,
}: {
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [name, setName] = useState('');
  const [nameFehlt, setNameFehlt] = useState(false);

  // Undo und Redo können Berechnungen anlegen, ändern oder löschen: das Gerüst lädt neu.
  const { lage } = useSeitenladen(
    async ({ speicher }): Promise<Stand | null> => {
      const p = await speicher.projekte.laden(projektId);
      const h = await honorarberechnungenLaden(speicher, projektId);
      const k = await kostenermittlungenDesProjekts(speicher, projektId);
      return p.ok && h.ok && k.ok
        ? {
            projekt: p.wert,
            berechnungen: h.wert.map((z) => z.honorarberechnung),
            kostenermittlungen: k.wert,
          }
        : null;
    },
    [projektId],
  );

  if (lage.art !== 'da') {
    return <Ladeansicht lage={lage} laden={texte.seite.laden} nichtGefunden={texte.seite.nichtGefunden} />;
  }
  const { projekt, berechnungen, kostenermittlungen } = lage.wert;

  const anlegen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (name.trim() === '') {
      setNameFehlt(true);
      return;
    }
    setNameFehlt(false);
    const befehl = honorarberechnungNeu(u.ids, projekt.id, name);
    const a = await honorarberechnungSitzung(u, projekt.id, null).befehl(befehl);
    if (pruefe(a) && befehl.art === 'HonorarberechnungAnlegen')
      gehe(honorarberechnungPfad(projekt.id, befehl.honorarberechnung.id));
  };

  return (
    <div className="seite projekt honorar">
      <div className="lv__kopf">
        <h1>{texte.seite.titel(projekt.name)}</h1>
        <Verweis pfad={`/projekt/${projekt.id}`} text={texte.seite.zumProjekt} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
      </div>
      {berechnungen.length === 0 ? (
        <p>{texte.seite.leer}</p>
      ) : (
        <ul className="projekt__liste" aria-label={texte.seite.liste}>
          {berechnungen.map((b) => (
            <li key={b.id}>
              <Verweis pfad={honorarberechnungPfad(projekt.id, b.id)} text={b.name} gehe={gehe} />
              <span className="projekt__betrag" aria-label={texte.seite.brutto(b.name)}>
                {formatiereBetragDe(ergebnisBerechnen(b, kostenermittlungen).brutto)} €
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="honorar__formular"
        onSubmit={(e) => void anlegen(e)}
        aria-label={texte.seite.anlegenTitel}
      >
        <Eingabefeld
          label={texte.seite.name}
          value={name}
          onWertChange={setName}
          {...(nameFehlt ? { meldung: texte.seite.nameFehlt } : {})}
        />
        <Button type="submit" variante="primaer">
          {texte.seite.anlegen}
        </Button>
      </form>
    </div>
  );
}
