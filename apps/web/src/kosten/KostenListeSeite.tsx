// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/kosten` (Ticket 89, C3): die Kostenermittlungen des Projekts, anlegen, öffnen. Jede Änderung ist ein
// Befehl durch `kosten` und Speicher (A5); die Summe je Kostenermittlung rechnet `kosten` (N1). Ticket 154: Bezeichnungen der
// Kostengruppen hier einlesen, mit Hinweis, solange keine da sind (B-14); Werkzeugleiste aus `ui-basis` (D-89).

import { formatiereBetragDe } from '@tethys/dezimal';
import { kostenermittlungBerechnen } from '@tethys/kosten';
import { Auswahl, Button, Eingabefeld, Werkzeugleiste, Werkzeugverweis } from '@tethys/ui-basis';
import type { KostenermittlungZustand, Kostenermittlungsstufe, Projekt, ProjektId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { kostenermittlungAnlegenBefehl } from './befehle';
import { BezeichnungenBereich, BezeichnungenHinweis, useBezeichnungen } from './Bezeichnungen';
import { bezeichnungenPfad, kontrollePfad, kostenermittlungPfad } from './pfad';
import { kostenermittlungSitzung, kostenermittlungenLaden } from './schreiben';
import { STUFEN, texte } from './texte';
import { hrefFuer } from '../ui/route';
import { Verweis } from '../ui/Verweis';
import { modellePfad } from '../bim/pfad'; // Ticket 122
import '../lv/lv.css';
import './kosten.css';

type Laden =
  | { art: 'laedt' }
  | { art: 'fehlt' }
  | { art: 'da'; projekt: Projekt; ermittlungen: readonly KostenermittlungZustand[] };

export function KostenListeSeite({
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
  const [stufe, setStufe] = useState<Kostenermittlungsstufe>('kostenberechnung');
  const [nameFehlt, setNameFehlt] = useState(false);
  const bezeichnungsstand = useBezeichnungen();

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const p = await u.speicher.projekte.laden(projektId);
      const k = await kostenermittlungenLaden(u.speicher, projektId);
      return p.ok && k.ok ? { art: 'da', projekt: p.wert, ermittlungen: k.wert } : { art: 'fehlt' };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lauf]);
  // Undo und Redo können Kostenermittlungen anlegen, ändern oder löschen: neu laden.
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
  const { projekt, ermittlungen } = lage;

  const anlegen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (name.trim() === '') {
      setNameFehlt(true);
      return;
    }
    setNameFehlt(false);
    const befehl = kostenermittlungAnlegenBefehl(u.ids, projekt.id, name, stufe);
    const a = await kostenermittlungSitzung(u, projekt.id, null).befehl(befehl);
    if (pruefe(a)) gehe(kostenermittlungPfad(projekt.id, befehl.kostenermittlung.id));
  };

  return (
    <div className="seite projekt kosten">
      <div className="lv__kopf">
        <h1>{texte.seite.titel(projekt.name)}</h1>
        <Verweis pfad={`/projekt/${projekt.id}`} text={texte.seite.zumProjekt} gehe={gehe} />
      </div>
      <Werkzeugleiste beschriftung={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        <Werkzeugverweis
          href={hrefFuer(kontrollePfad(projekt.id))}
          onFolgen={() => {
            gehe(kontrollePfad(projekt.id));
          }}
        >
          {texte.seite.zurKontrolle}
        </Werkzeugverweis>
        {/* Ticket 122 (PC-a5): Verweis auf die Kennwerte der Modellseite (Ticket 115, nur Verweis) */}
        <span title={texte.seite.zuDenKennwertenTitel}>
          <Werkzeugverweis
            href={hrefFuer(modellePfad(projekt.id))}
            onFolgen={() => {
              gehe(modellePfad(projekt.id));
            }}
          >
            {texte.seite.zuDenKennwerten}
          </Werkzeugverweis>
        </span>
      </Werkzeugleiste>
      <BezeichnungenHinweis stand={bezeichnungsstand} pfad={bezeichnungenPfad(projekt.id)} gehe={gehe} />
      {ermittlungen.length === 0 ? (
        <p>{texte.seite.leer}</p>
      ) : (
        <ul className="projekt__liste" aria-label={texte.seite.liste}>
          {ermittlungen.map((z) => {
            const k = z.kostenermittlung;
            const summe = kostenermittlungBerechnen(k.eintraege).gesamtsumme;
            return (
              <li key={k.id}>
                <Verweis pfad={kostenermittlungPfad(projekt.id, k.id)} text={k.name} gehe={gehe} />
                <span>{texte.stufe[k.stufe]}</span>
                <span className="projekt__betrag" aria-label={`Summe ${k.name}`}>
                  {formatiereBetragDe(summe)} €
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="kosten__formular"
        onSubmit={(e) => void anlegen(e)}
        aria-label={texte.seite.anlegenTitel}
      >
        <Eingabefeld
          label={texte.seite.name}
          value={name}
          onWertChange={setName}
          {...(nameFehlt ? { meldung: 'Der Name fehlt.' } : {})}
        />
        <Auswahl
          label={texte.seite.stufe}
          wert={stufe}
          onWertChange={(w) => {
            setStufe(w as Kostenermittlungsstufe);
          }}
          optionen={STUFEN.map((s) => ({ wert: s, label: texte.stufe[s] }))}
        />
        <Button type="submit" variante="primaer">
          {texte.seite.anlegen}
        </Button>
      </form>
      <BezeichnungenBereich stand={bezeichnungsstand} />
    </div>
  );
}
