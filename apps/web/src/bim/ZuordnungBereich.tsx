// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuordnung auf der Modellseite (Ticket 115, X1c, D-52): LV wählen (Ausschreibungs-LV oder Auftrags-LV), die Auswahl einer
// Position zuordnen („Zuordnen …“: Position suchen, Mengenart wählen, Befunde vorab), Zuordnungen je Position ansehen und
// entfernen, Befunde der Zuordnung mit Sprung in den Baum (U5). Dazu „Aufmaßblatt aus Auswahl …“ bei einem Auftrags-LV.

import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { Bauwerksmodell, IfcGlobalId, Position, PositionId, ProjektId } from '@tethys/vertrag';
import { zuordnungenPruefen } from '@tethys/bim';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { AufmassAusAuswahlDialog } from './AufmassAusAuswahlDialog';
import { BefundListe } from './BefundListe';
import { texte } from './texte';
import { uebernahmeVorschau } from './uebernahme';
import type { Bezugsstand } from './useBezug';
import {
  mengenartenDerAuswahl,
  positionenSuchen,
  zuordnenBefehl,
  zuordnungEntfernenBefehl,
  zuordnungenDerPositionen,
} from './zuordnung';

const t = texte.zuordnung;
const HOECHSTENS = 50;

export function ZuordnungBereich({
  projektId,
  modell,
  auswahl,
  bezug,
  zurZeile,
  gehe,
}: {
  projektId: ProjektId;
  modell: Bauwerksmodell;
  auswahl: readonly string[];
  bezug: Bezugsstand;
  zurZeile: (globalId: string) => void;
  gehe: (pfad: string) => void;
}): ReactElement {
  const [dialog, setDialog] = useState<'zuordnen' | 'aufmass' | null>(null);
  const namen = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of modell.bauteile) if (!m.has(b.globalId)) m.set(b.globalId, b.name ?? b.globalId);
    return m;
  }, [modell]);
  const pruefung = useMemo(
    () => (bezug.bezug === null ? null : zuordnungenPruefen(bezug.knoten, modell)),
    [bezug.bezug, bezug.knoten, modell],
  );
  const mitZuordnung = useMemo(() => zuordnungenDerPositionen(bezug.knoten), [bezug.knoten]);
  const anzahlBauteile = new Set(modell.bauteile.map((b) => b.globalId)).size;

  return (
    <section className="bim__leiste bim__zuordnung" aria-label={t.region}>
      <h2>{t.region}</h2>
      {bezug.wahlen === null ? (
        <p aria-busy="true">{t.laedt}</p>
      ) : bezug.wahlen.length === 0 ? (
        <p>{t.keinLv}</p>
      ) : (
        <div className="bim__aktionen">
          <Auswahl
            kompakt
            label={t.bezug}
            wert={bezug.schluessel}
            optionen={bezug.wahlen.map((w) => ({ wert: w.schluessel, label: w.label }))}
            onWertChange={bezug.waehlen}
          />
          <Button
            disabled={auswahl.length === 0 || bezug.bezug === null}
            onClick={() => {
              setDialog('zuordnen');
            }}
          >
            {t.zuordnen}
          </Button>
          <Button
            disabled={auswahl.length === 0 || bezug.bezug?.art !== 'auftrag'}
            title={texte.aufmass.nurAuftrag}
            onClick={() => {
              setDialog('aufmass');
            }}
          >
            {texte.aufmass.knopf}
          </Button>
        </div>
      )}
      {pruefung === null ? null : (
        <p>{t.zaehlung(anzahlBauteile - pruefung.ohneZuordnung.length, pruefung.ohneZuordnung.length)}</p>
      )}
      <h3>{t.liste}</h3>
      {bezug.bezug === null ? null : mitZuordnung.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <ul className="bim__zuordnungen" aria-label={t.liste}>
          {mitZuordnung.map((p) => (
            <li key={p.id}>
              <strong>{t.position(p.ordnungszahl ?? '', p.kurztext)}</strong>
              <ul>
                {(p.bauteile ?? []).map((z) => {
                  const name = namen.get(z.globalId) ?? t.unbekannt(z.globalId);
                  return (
                    <li key={`${z.globalId}|${z.mengenart}`}>
                      {t.paar(name, z.mengenart)}{' '}
                      <Button
                        variante="schlicht"
                        groesse="sm"
                        aria-label={t.entfernenVon(name, p.ordnungszahl ?? p.kurztext)}
                        onClick={() => {
                          const b = zuordnungEntfernenBefehl(p, z);
                          if (b !== null) void bezug.senden([b]);
                        }}
                      >
                        {t.entfernen}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {pruefung === null ? null : (
        <BefundListe befunde={pruefung.befunde} beschriftung={t.befunde} onSprung={zurZeile} />
      )}
      {dialog === 'zuordnen' ? (
        <ZuordnenDialog
          modell={modell}
          auswahl={auswahl}
          bezug={bezug}
          onSchliessen={() => {
            setDialog(null);
          }}
          zurZeile={zurZeile}
        />
      ) : null}
      {dialog === 'aufmass' && bezug.bezug?.art === 'auftrag' ? (
        <AufmassAusAuswahlDialog
          projektId={projektId}
          modell={modell}
          auswahl={auswahl}
          auftrag={bezug.bezug.zustand}
          onSchliessen={() => {
            setDialog(null);
          }}
          gehe={gehe}
        />
      ) : null}
    </section>
  );
}

function ZuordnenDialog({
  modell,
  auswahl,
  bezug,
  onSchliessen,
  zurZeile,
}: {
  modell: Bauwerksmodell;
  auswahl: readonly string[];
  bezug: Bezugsstand;
  onSchliessen: () => void;
  zurZeile: (globalId: string) => void;
}): ReactElement {
  const { zeige } = useToast();
  const [suche, setSuche] = useState('');
  const [positionId, setPositionId] = useState<PositionId | null>(null);
  const [mengenart, setMengenart] = useState<string | undefined>(undefined);
  const arten = useMemo(() => mengenartenDerAuswahl(modell, auswahl), [modell, auswahl]);
  const anzahl = arten.at(-1)?.anzahl ?? 0;
  const treffer = useMemo(() => positionenSuchen(bezug.knoten, suche), [bezug.knoten, suche]);
  const position: Position | undefined = bezug.knoten.find(
    (k): k is Position => k.art === 'position' && k.id === positionId,
  );
  const befehl =
    position === undefined || mengenart === undefined
      ? null
      : zuordnenBefehl(position, auswahl as readonly IfcGlobalId[], mengenart);
  // Befunde vorab (D-52, D-53): wie die Mengenübernahme die Position nach dem Zuordnen läse.
  const befunde =
    befehl === null || position === undefined
      ? []
      : (uebernahmeVorschau([{ ...position, bauteile: befehl.bauteile ?? [] }], modell).zeilen[0]?.befunde ?? []);

  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={texte.zuordnung.titel(anzahl)}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button
            variante="primaer"
            disabled={befehl === null}
            onClick={() => {
              if (befehl === null) return;
              void bezug.senden([befehl]).then((ok) => {
                if (ok) {
                  zeige({ titel: t.zugeordnet(anzahl), art: 'erfolg' });
                  onSchliessen();
                }
              });
            }}
          >
            {t.ausfuehren}
          </Button>
        </>
      }
    >
      <Eingabefeld label={t.suche} value={suche} onWertChange={setSuche} />
      <fieldset className="bim__positionen">
        <legend>{t.positionen}</legend>
        {treffer.length === 0 ? <p>{t.keineTreffer}</p> : null}
        {treffer.slice(0, HOECHSTENS).map((p) => (
          <label key={p.id} className="bim__position">
            <input
              type="radio"
              name="bim-position"
              checked={p.id === positionId}
              onChange={() => {
                setPositionId(p.id);
              }}
            />{' '}
            {t.position(p.ordnungszahl ?? '', p.kurztext)}
            {p.einheit ? ` (${p.einheit})` : ''}
          </label>
        ))}
        {treffer.length > HOECHSTENS ? <p>{t.mehrTreffer(treffer.length - HOECHSTENS)}</p> : null}
      </fieldset>
      <Auswahl
        label={t.mengenart}
        wert={mengenart}
        optionen={arten.map((a) => ({
          wert: a.name,
          label: t.mengenartOption(a.name, a.einheit, a.anzahl, anzahl),
        }))}
        onWertChange={setMengenart}
      />
      {position !== undefined && mengenart !== undefined && befehl === null ? <p>{t.keineAenderung}</p> : null}
      {befehl !== null ? (
        <BefundListe
          befunde={befunde}
          beschriftung={t.vorschau}
          onSprung={(g) => {
            onSchliessen();
            zurZeile(g);
          }}
        />
      ) : null}
    </Dialog>
  );
}
