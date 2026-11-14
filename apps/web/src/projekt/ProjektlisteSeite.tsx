// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/`: Projekte nach Name, Projekt anlegen, Projektdatei importieren. Jede Änderung geht als Befehl durch Kern
// und Speicher (A5); der Import ist der Weg der Projektdatei (`projektdateiImportieren`, G-56). Ticket 147: Ist die Liste
// leer, begrüßt die Seite mit drei Wegen (Beispielprojekt, GAEB-Datei, leeres Projekt mit dem Formular dieser Seite); beim
// ersten Projekt steht der Hinweis, wo die Daten liegen und wie man sichert.

import { Button, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { ProjektId, Projektuebersicht } from '@tethys/vertrag';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SyntheticEvent, ReactElement } from 'react';
import { Datenhinweis } from '../hilfe/Datenhinweis'; // Ticket 147
import { Willkommen } from '../hilfe/Willkommen'; // Ticket 147
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { SicherungsBereich } from '../sicherung/SicherungsBereich'; // Ticket 62
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { projektAnlegenBefehl } from './befehle';
import { texte } from './texte';
import './projekt.css';

const nachName = (a: Projektuebersicht, b: Projektuebersicht): number =>
  a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id);

export function projektPfad(id: ProjektId): string {
  return `/projekt/${id}`;
}

export function ProjektlisteSeite({ gehe }: { gehe: (pfad: string) => void }): ReactElement {
  const u = useUmgebung();
  const { pruefe, speicherfehler } = useMeldungen();
  const { zeige } = useToast();
  const [projekte, setProjekte] = useState<readonly Projektuebersicht[] | null>(null);
  const [name, setName] = useState('');
  const [bauherr, setBauherr] = useState('');
  const [nameFehlt, setNameFehlt] = useState(false);
  const datei = useRef<HTMLInputElement>(null);

  const laden = useCallback(async () => {
    const r = await u.speicher.projekte.auflisten();
    if (r.ok) setProjekte([...r.wert].sort(nachName));
    else {
      setProjekte([]);
      speicherfehler(r.fehler);
    }
  }, [u, speicherfehler]);

  useEffect(() => {
    void laden();
  }, [laden]);
  // Undo/Redo kann Projekte anlegen oder löschen: neu laden.
  useEffect(() => befehlswegFuer(u).beiHistorie(() => void laden()), [u, laden]);

  const anlegen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (name.trim() === '') {
      setNameFehlt(true);
      return;
    }
    const a = await befehlswegFuer(u)
      .projekt(null)
      .befehl(projektAnlegenBefehl(u.ids, name.trim(), bauherr.trim()));
    if (pruefe(a) && a.zustand !== null) gehe(projektPfad(a.zustand.id));
  };

  const importieren = async (f: File): Promise<void> => {
    const r = await u.speicher.projektdateiImportieren(await f.text());
    if (!r.ok) {
      speicherfehler(r.fehler, texte.importieren.fehler);
      return;
    }
    zeige({ titel: texte.importieren.erfolg, beschreibung: f.name, art: 'erfolg' });
    await laden();
  };

  // Ticket 147: dasselbe Formular unter der Liste und, bei leerer Liste, als dritter Weg der Begrüßung (dort ohne Überschrift).
  const formular = (mitTitel: boolean): ReactElement => (
    <form className="projekt__formular" onSubmit={(e) => void anlegen(e)} aria-label={texte.anlegen.titel}>
      {mitTitel ? <h2>{texte.anlegen.titel}</h2> : null}
      <div className="projekt__felder">
        <Eingabefeld
          label={texte.anlegen.name}
          value={name}
          onWertChange={(w) => {
            setName(w);
            setNameFehlt(false);
          }}
          {...(nameFehlt ? { meldung: texte.anlegen.nameFehlt } : {})}
        />
        <Eingabefeld label={texte.anlegen.bauherr} value={bauherr} onWertChange={setBauherr} />
        <Button type="submit" variante="primaer">
          {texte.anlegen.knopf}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="seite projekt">
      <h1>{texte.liste.titel}</h1>
      <SicherungsBereich /> {/* Ticket 62 */}
      {projekte === null ? (
        <p aria-busy="true">{texte.liste.laden}</p>
      ) : projekte.length === 0 ? (
        <Willkommen gehe={gehe} leer={texte.liste.leer} formular={formular(false)} />
      ) : (
        <>
          <ul className="projekt__liste" aria-label={texte.liste.tabelle}>
            {projekte.map((p) => (
              <li key={p.id}>
                <a
                  href={hrefFuer(projektPfad(p.id))}
                  onClick={(e) => {
                    e.preventDefault();
                    gehe(projektPfad(p.id));
                  }}
                >
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
          {projekte.length === 1 ? <Datenhinweis gehe={gehe} ausblendbar /> : null}
          {formular(true)}
        </>
      )}
      <div className="projekt__werkzeuge">
        <HistorieKnoepfe />
        <input
          ref={datei}
          type="file"
          accept=".json,application/json"
          className="projekt__datei"
          aria-label={texte.importieren.knopf}
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importieren(f);
          }}
        />
        <Button onClick={() => datei.current?.click()}>{texte.importieren.knopf}</Button>
      </div>
    </div>
  );
}
