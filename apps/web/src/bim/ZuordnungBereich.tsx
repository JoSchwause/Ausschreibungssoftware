// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuordnung auf der Modellseite (Ticket 115, X1c, D-52): LV wählen (Ausschreibungs-LV oder Auftrags-LV), die Auswahl einer
// Position zuordnen („Zuordnen …“: Position suchen, Mengenart wählen, Befunde vorab), Zuordnungen je Position ansehen und
// entfernen, Befunde der Zuordnung mit Sprung in den Baum (U5). Dazu „Aufmaßblatt aus Auswahl …“ bei einem Auftrags-LV.

import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import {
  MENGENART_STUECK,
  type Bauwerksmodell,
  type IfcGlobalId,
  type KnotenId,
  type Position,
  type PositionId,
  type ProjektId,
} from '@tethys/vertrag';
import { zuordnungenPruefen } from '@tethys/bim';
import { useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { AufmassAusAuswahlDialog } from './AufmassAusAuswahlDialog';
import { BefundListe } from './BefundListe';
import { texte } from './texte';
import { uebernahmeVorschau } from './uebernahme';
import type { ZuordnungsLvStand } from './zuordnungsLv';
import {
  bauteileInModellreihenfolge,
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
  zuordnungsLv,
  zurZeile,
  gehe,
}: {
  projektId: ProjektId;
  modell: Bauwerksmodell;
  auswahl: readonly string[];
  zuordnungsLv: ZuordnungsLvStand;
  zurZeile: (globalId: IfcGlobalId) => void;
  gehe: (pfad: string) => void;
}): ReactElement {
  const [dialog, setDialog] = useState<'zuordnen' | 'aufmass' | null>(null);
  const namen = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of modell.bauteile) if (!m.has(b.globalId)) m.set(b.globalId, b.name ?? b.globalId);
    return m;
  }, [modell]);
  const pruefung = useMemo(
    () => (zuordnungsLv.lv === null ? null : zuordnungenPruefen(zuordnungsLv.knoten, modell)),
    [zuordnungsLv.lv, zuordnungsLv.knoten, modell],
  );
  const mitZuordnung = useMemo(() => zuordnungenDerPositionen(zuordnungsLv.knoten), [zuordnungsLv.knoten]);
  const anzahlBauteile = namen.size;
  // Ein Sprung nur zu Objekten im Baum; eine hängende Zuordnung (Bauteil fehlt im Modell) hat keine Zeile.
  const imModell = useMemo(() => {
    const ids = new Set<string>(namen.keys());
    for (const k of modell.struktur) ids.add(k.globalId);
    return (g: string): boolean => ids.has(g);
  }, [namen, modell]);
  // Ticket 122 (PC-a1): Sprung aus einem Befund zur Position in der Liste der Zuordnungen (auch bei hängender Zuordnung).
  const bereich = useRef<HTMLElement | null>(null);
  const zurPosition = (knotenId: KnotenId): void => {
    const ziel = bereich.current?.querySelector<HTMLElement>(`[data-position="${CSS.escape(knotenId)}"]`);
    ziel?.scrollIntoView({ block: 'nearest' });
    ziel?.focus();
  };

  return (
    <section ref={bereich} className="bim__leiste bim__zuordnung" aria-label={t.region}>
      <h2>{t.region}</h2>
      {zuordnungsLv.wahlen === null ? (
        <p aria-busy="true">{t.laedt}</p>
      ) : zuordnungsLv.wahlen.length === 0 ? (
        <p>{t.keinLv}</p>
      ) : (
        <div className="bim__aktionen">
          <Auswahl
            kompakt
            label={t.zuordnungsLv}
            wert={zuordnungsLv.schluessel}
            optionen={zuordnungsLv.wahlen.map((w) => ({ wert: w.schluessel, label: w.label }))}
            onWertChange={zuordnungsLv.waehlen}
          />
          <Button
            disabled={auswahl.length === 0 || zuordnungsLv.lv === null}
            onClick={() => {
              setDialog('zuordnen');
            }}
          >
            {t.zuordnen}
          </Button>
          <Button
            disabled={auswahl.length === 0 || zuordnungsLv.lv?.art !== 'auftrag'}
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
      {zuordnungsLv.lv === null ? null : mitZuordnung.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <ul className="bim__zuordnungen" aria-label={t.liste}>
          {mitZuordnung.map((p) => (
            <li key={p.id} data-position={p.id} tabIndex={-1}>
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
                          if (b !== null) void zuordnungsLv.senden([b]);
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
        <BefundListe
          befunde={pruefung.befunde}
          beschriftung={t.befunde}
          onSprung={zurZeile}
          imModell={imModell}
          onPositionSprung={zurPosition}
        />
      )}
      {dialog === 'zuordnen' ? (
        <ZuordnenDialog
          modell={modell}
          auswahl={auswahl}
          zuordnungsLv={zuordnungsLv}
          onSchliessen={() => {
            setDialog(null);
          }}
          zurZeile={zurZeile}
          zurPosition={zurPosition}
          imModell={imModell}
        />
      ) : null}
      {dialog === 'aufmass' && zuordnungsLv.lv?.art === 'auftrag' ? (
        <AufmassAusAuswahlDialog
          projektId={projektId}
          modell={modell}
          auswahl={auswahl}
          auftrag={zuordnungsLv.lv.zustand}
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
  zuordnungsLv,
  onSchliessen,
  zurZeile,
  zurPosition,
  imModell,
}: {
  modell: Bauwerksmodell;
  auswahl: readonly string[];
  zuordnungsLv: ZuordnungsLvStand;
  onSchliessen: () => void;
  zurZeile: (globalId: IfcGlobalId) => void;
  zurPosition: (knotenId: KnotenId) => void;
  imModell: (globalId: string) => boolean;
}): ReactElement {
  const { zeige } = useToast();
  const [suche, setSuche] = useState('');
  const [positionId, setPositionId] = useState<PositionId | null>(null);
  const [mengenart, setMengenart] = useState<string | undefined>(undefined);
  const arten = useMemo(() => mengenartenDerAuswahl(modell, auswahl), [modell, auswahl]);
  // Die Zahl der gewählten Bauteile trägt die Mengenart „Stück“ (jedes Bauteil zählt 1), ausdrücklich gesucht (Ticket 122).
  const anzahl = arten.find((a) => a.name === MENGENART_STUECK)?.anzahl ?? 0;
  const treffer = useMemo(() => positionenSuchen(zuordnungsLv.knoten, suche), [zuordnungsLv.knoten, suche]);
  const position: Position | undefined = zuordnungsLv.knoten.find(
    (k): k is Position => k.art === 'position' && k.id === positionId,
  );
  const bauteile = useMemo(() => bauteileInModellreihenfolge(modell, auswahl), [modell, auswahl]);
  const befehl =
    position === undefined || mengenart === undefined ? null : zuordnenBefehl(position, bauteile, mengenart);
  // Befunde vorab (D-52, D-53): wie die Mengenübernahme die Position nach dem Zuordnen läse.
  const befunde =
    befehl === null || position === undefined
      ? []
      : (uebernahmeVorschau([{ ...position, bauteile: befehl.bauteile ?? [] }], modell).zeilen[0]?.befunde ??
        []);

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
              void zuordnungsLv.senden([befehl]).then((ok) => {
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
      {position !== undefined && mengenart !== undefined && befehl === null ? (
        <p>{t.keineAenderung}</p>
      ) : null}
      {befehl !== null ? (
        <BefundListe
          befunde={befunde}
          beschriftung={t.vorschau}
          onSprung={(g) => {
            onSchliessen();
            zurZeile(g);
          }}
          imModell={imModell}
          onPositionSprung={(k) => {
            onSchliessen();
            zurPosition(k);
          }}
        />
      ) : null}
    </Dialog>
  );
}
