// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/honorar` (Ticket 119): die Honorarberechnungen des Projekts, anlegen, öffnen. Jede Änderung ist ein
// Befehl durch `honorar` und Speicher (A5). Die Bruttosumme je Berechnung rechnet `honorar` (N1).

import { formatiereBetragDe } from '@tethys/dezimal';
import { Button, Eingabefeld } from '@tethys/ui-basis';
import type { Honorarberechnung, Kostenermittlung, Projekt, ProjektId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
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

type Laden =
  | { art: 'laedt' }
  | { art: 'fehlt' }
  | {
      art: 'da';
      projekt: Projekt;
      berechnungen: readonly Honorarberechnung[];
      kostenermittlungen: readonly Kostenermittlung[];
    };

export function HonorarListeSeite({
  projektId,
  gehe,
}: {
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);
  const [name, setName] = useState('');
  const [nameFehlt, setNameFehlt] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const p = await u.speicher.projekte.laden(projektId);
      const h = await honorarberechnungenLaden(u.speicher, projektId);
      const k = await kostenermittlungenDesProjekts(u.speicher, projektId);
      return p.ok && h.ok && k.ok
        ? {
            art: 'da',
            projekt: p.wert,
            berechnungen: h.wert.map((z) => z.honorarberechnung),
            kostenermittlungen: k.wert,
          }
        : { art: 'fehlt' };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lauf]);
  // Undo und Redo können Berechnungen anlegen, ändern oder löschen: neu laden.
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.seite.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{texte.seite.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
        </div>
      </div>
    );
  }
  const { projekt, berechnungen, kostenermittlungen } = lage;

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
