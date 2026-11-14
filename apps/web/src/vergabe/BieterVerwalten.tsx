// SPDX-License-Identifier: AGPL-3.0-or-later
// „Bieter verwalten …“ (Ticket 149; E8, E10, B-16): alle Bieter des Projekts mit Anschrift (auch aus einer X84), Kontakt und
// Zahl der Angebote. Bearbeiten ändert Name und Bieterangaben in einem Undo-Schritt; Löschen geht nur ohne Angebot und erst
// nach ausdrücklicher Bestätigung (Q5), sonst nennt der Dialog, was im Weg steht. Ein Dialog mit Ansichten statt
// verschachtelter Dialoge (wie der Papierkorb).

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { Bieter, BieterId, Projekt, ProjektId } from '@tethys/vertrag';
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { anschriftZeile, bieterBefehle, bieterformular, kontaktZeile, type Bieterformular } from './bieter';
import { angeboteJeBieter, bieterLoeschenSchreiben } from './schreiben';
import { texte } from './texte';
import './vergabe.css';

const t = texte.verwalten;

interface Stand {
  readonly projekt: Projekt;
  readonly angebote: ReadonlyMap<BieterId, number>;
}

type Ansicht =
  | { readonly art: 'liste' }
  | { readonly art: 'bearbeiten'; readonly bieter: Bieter; readonly form: Bieterformular }
  | { readonly art: 'loeschen'; readonly bieter: Bieter };

const FELDER: readonly (readonly [keyof Bieterformular, string])[] = [
  ['name', t.name],
  ['strasse', t.strasse],
  ['plz', t.plz],
  ['ort', t.ort],
  ['ansprechperson', t.ansprechperson],
  ['email', t.email],
  ['telefon', t.telefon],
];

export function BieterVerwalten({
  projektId,
  onGeaendert,
}: {
  projektId: ProjektId;
  /** Nach jeder geschriebenen Änderung (z. B. Bieternamen in der Seite neu laden). */
  onGeaendert?: () => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [stand, setStand] = useState<Stand | null>(null);
  const [ansicht, setAnsicht] = useState<Ansicht>({ art: 'liste' });
  const [lauf, setLauf] = useState(0);

  const laden = useCallback(async (): Promise<Stand | null> => {
    const p = await u.speicher.projekte.laden(projektId);
    const a = await angeboteJeBieter(u.speicher, projektId);
    return p.ok && a.ok ? { projekt: p.wert, angebote: a.wert } : null;
  }, [u, projektId]);

  useEffect(() => {
    if (!offen) return;
    let aktiv = true;
    void laden().then((s) => {
      if (aktiv) setStand(s);
    });
    return () => {
      aktiv = false;
    };
  }, [offen, laden, lauf]);
  useEffect(
    () =>
      weg.beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [weg],
  );

  const geaendert = (): void => {
    setAnsicht({ art: 'liste' });
    setLauf((n) => n + 1);
    onGeaendert?.();
  };

  const speichern = async (b: Bieter, form: Bieterformular): Promise<void> => {
    const befehle = bieterBefehle(b, form);
    if (befehle.length === 0 || stand === null) {
      setAnsicht({ art: 'liste' });
      return;
    }
    const aus = await weg.projekt(stand.projekt).folge(befehle);
    if (!aus.every((a) => pruefe(a))) return;
    zeige({ titel: t.gespeichert, beschreibung: form.name, art: 'erfolg' });
    geaendert();
  };

  const loeschen = async (b: Bieter): Promise<void> => {
    const r = await bieterLoeschenSchreiben(weg, projektId, b.id);
    if (!pruefe(r)) return;
    zeige({ titel: t.geloescht, beschreibung: b.name, art: 'erfolg' });
    geaendert();
  };

  const schliessen = (): void => {
    setOffen(false);
    setAnsicht({ art: 'liste' });
  };
  const zurListe = (): void => {
    setAnsicht({ art: 'liste' });
  };

  const zahl = (b: Bieter): number => stand?.angebote.get(b.id) ?? 0;

  const fuss =
    ansicht.art === 'liste' ? (
      <Button onClick={schliessen}>{t.schliessen}</Button>
    ) : ansicht.art === 'bearbeiten' ? (
      <>
        <Button onClick={zurListe}>{t.abbrechen}</Button>
        <Button variante="primaer" onClick={() => void speichern(ansicht.bieter, ansicht.form)}>
          {t.speichern}
        </Button>
      </>
    ) : zahl(ansicht.bieter) > 0 ? (
      <Button onClick={zurListe}>{t.schliessen}</Button>
    ) : (
      <>
        <Button onClick={zurListe}>{t.abbrechen}</Button>
        <Button variante="gefahr" onClick={() => void loeschen(ansicht.bieter)}>
          {t.loeschenBestaetigen}
        </Button>
      </>
    );

  return (
    <>
      <Button
        onClick={() => {
          setStand(null);
          setAnsicht({ art: 'liste' });
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={ansicht.art === 'bearbeiten' ? t.bearbeitenTitel(ansicht.bieter.name) : t.titel}
        fuss={fuss}
      >
        {ansicht.art === 'bearbeiten' ? (
          <form
            className="vergabe__formular"
            onSubmit={(e) => {
              e.preventDefault();
              void speichern(ansicht.bieter, ansicht.form);
            }}
          >
            {FELDER.map(([feld, label]) => (
              <Eingabefeld
                key={feld}
                label={label}
                value={ansicht.form[feld]}
                onWertChange={(w) => {
                  setAnsicht({ ...ansicht, form: { ...ansicht.form, [feld]: w } });
                }}
              />
            ))}
            <button type="submit" hidden />
          </form>
        ) : ansicht.art === 'loeschen' ? (
          <p role="alert">
            {zahl(ansicht.bieter) > 0
              ? t.gesperrt(ansicht.bieter.name, zahl(ansicht.bieter))
              : t.loeschenFrage(ansicht.bieter.name)}
          </p>
        ) : stand === null ? (
          <p aria-busy="true">{t.laden}</p>
        ) : stand.projekt.bieter.length === 0 ? (
          <p>{t.leer}</p>
        ) : (
          <table className="gaeb__tabelle vergabe__bieter" aria-label={t.tabelle}>
            <thead>
              <tr>
                <th scope="col">{t.name}</th>
                <th scope="col">{t.anschrift}</th>
                <th scope="col">{t.kontakt}</th>
                <th scope="col">{t.angebote}</th>
                <th scope="col">{t.aktionen}</th>
              </tr>
            </thead>
            <tbody>
              {stand.projekt.bieter.map((b) => (
                <tr key={b.id}>
                  <th scope="row">{b.name}</th>
                  <td data-testid="anschrift">{anschriftZeile(b.angaben?.anschrift)}</td>
                  <td>{kontaktZeile(b.angaben)}</td>
                  <td data-testid="angebote">{zahl(b)}</td>
                  <td className="vergabe__aktionen">
                    <Button
                      groesse="sm"
                      aria-label={t.bearbeitenFuer(b.name)}
                      onClick={() => {
                        setAnsicht({ art: 'bearbeiten', bieter: b, form: bieterformular(b) });
                      }}
                    >
                      {t.bearbeiten}
                    </Button>
                    <Button
                      groesse="sm"
                      variante="gefahr"
                      aria-label={t.loeschenFuer(b.name)}
                      onClick={() => {
                        setAnsicht({ art: 'loeschen', bieter: b });
                      }}
                    >
                      {t.loeschen}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Dialog>
    </>
  );
}
