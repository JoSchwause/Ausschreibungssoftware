// SPDX-License-Identifier: AGPL-3.0-or-later
// „Aufmaßblatt aus Auswahl …“ (Ticket 115, X1d, D-53): Vorschau je Position des Auftrags-LV mit ausgewählten, zugeordneten
// Bauteilen, der feste Hinweis aus `bim` und `AufmassAnlegen` (ein Undo-Schritt); danach Sprung zum neuen Blatt.

import { formatiereMengeDe } from '@tethys/dezimal';
import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { AufmassKopf, AuftragsLvZustand, Bauwerksmodell, ProjektId } from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { aufmassSitzung } from '../abrechnung/aufmass';
import { kopfEingabe } from '../abrechnung/kopf';
import { blattPfad } from '../abrechnung/pfad';
import { datumAusUhr } from '../ausgabe/logik';
import { befehlswegFuer } from '../lv/befehlsweg';
import { datumDe } from '../lv/kopfdaten';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { aufmassBlattBefehl, aufmassVorschau } from './aufmassblatt';
import { BefundListe } from './BefundListe';
import { ansatzText } from './darstellung';
import { texte } from './texte';

const t = texte.aufmass;

export function AufmassAusAuswahlDialog({
  projektId,
  modell,
  auswahl,
  auftrag,
  onSchliessen,
  gehe,
}: {
  projektId: ProjektId;
  modell: Bauwerksmodell;
  auswahl: readonly string[];
  auftrag: AuftragsLvZustand;
  onSchliessen: () => void;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const a = auftrag.auftragsLeistungsverzeichnis;
  const [bezeichnung, setBezeichnung] = useState(t.bezeichnungVorschlag(modell.name));
  const [datum, setDatum] = useState(datumDe(datumAusUhr(u.uhr())));
  const [vorhanden, setVorhanden] = useState<readonly AufmassKopf[] | null>(null);
  const vorschau = useMemo(() => aufmassVorschau(a.knoten, modell, auswahl), [a.knoten, modell, auswahl]);
  const kopf = kopfEingabe({ bezeichnung, datum });

  useEffect(() => {
    let aktiv = true;
    void u.speicher.aufmasse.auflisten(a.id).then((r) => {
      if (aktiv) setVorhanden(r.ok ? r.wert : []);
    });
    return () => {
      aktiv = false;
    };
  }, [u, a.id]);

  const anlegbar = kopf.ok && vorhanden !== null && vorschau.zeilen.some((z) => z.zeilen.length > 0);
  const anlegen = async (): Promise<void> => {
    if (!kopf.ok || vorhanden === null) return;
    const befehl = aufmassBlattBefehl(u.ids, a, vorhanden, kopf.wert, vorschau);
    const r = await aufmassSitzung(befehlswegFuer(u), projektId, null).befehl(befehl);
    if (!pruefe(r)) return;
    zeige({ titel: t.angelegt(befehl.aufmass.nummer), art: 'erfolg' });
    onSchliessen();
    gehe(blattPfad(projektId, a.id, befehl.aufmass.id));
  };

  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button variante="primaer" disabled={!anlegbar} onClick={() => void anlegen()}>
            {t.anlegen}
          </Button>
        </>
      }
    >
      <Eingabefeld label={t.bezeichnung} value={bezeichnung} onWertChange={setBezeichnung} />
      <Eingabefeld
        label={t.datum}
        value={datum}
        onWertChange={setDatum}
        {...(kopf.ok ? {} : { meldung: kopf.fehler })}
      />
      {vorschau.zeilen.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <table className="bim__tabelle" aria-label={t.vorschau}>
          <thead>
            <tr>
              {t.spalten.map((s) => (
                <th key={s} scope="col">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vorschau.zeilen.map((z) => (
              <tr key={z.positionId}>
                <td>{z.oz}</td>
                <td>{z.kurztext}</td>
                <td className="bim__zahl">{String(z.bauteile.length)}</td>
                <td>{ansatzText(z.zeilen)}</td>
                <td className="bim__zahl" data-wert="menge">
                  {z.menge === null ? '–' : `${formatiereMengeDe(z.menge)} ${z.einheit}`.trim()}
                </td>
                <td>{z.befunde.map((b) => b.meldung).join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {vorschau.zeilen.some((z) => z.befunde.length > 0) ? (
        <BefundListe befunde={vorschau.zeilen.flatMap((z) => z.befunde)} beschriftung={texte.seite.befunde} />
      ) : null}
      {vorschau.hinweise.length > 0 ? <p role="note">{t.hinweis}</p> : null}
    </Dialog>
  );
}
