// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/auftrag/<id>/aufmass` (Ticket 87, A2): die Aufmaßblätter eines Auftrags-LV mit Nummer,
// Bezeichnung, Datum und Zahl der Positionen; „Neues Aufmaßblatt“ (nächste Nummer), „X31 einlesen“, Blatt öffnen.
// Anlegen ist ein Befehl über den Befehlsweg (A5) und ein Undo-Schritt; danach öffnet die App das neue Blatt.

import { naechsteAufmassnummer } from '@tethys/abrechnung';
import { Button, Werkzeugleiste, Werkzeugverweis, useToast } from '@tethys/ui-basis';
import type { Aufmass, Aufmassposition } from '@tethys/vertrag';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { datumDe } from '../lv/kopfdaten';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { auftragPfad } from '../auftrag/ziel';
import { aufmassSitzung, neuesBlatt, type Abrechnungsstand } from './aufmass';
import { KopfDialog } from './KopfDialog';
import type { Kopfangaben } from './kopf';
import { blattPfad, sollIstPfad } from './pfad';
import { texte } from './texte';
import { Verweis } from '../ui/Verweis';
import { X31Einlesen } from './X31Einlesen';

const t = texte.liste;

export function BlattListe({
  stand,
  gehe,
}: {
  stand: Abrechnungsstand;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const [neu, setNeu] = useState(false);
  const a = stand.auftrag.auftragsLeistungsverzeichnis;
  const nummer = naechsteAufmassnummer(stand.blaetter);

  /** `AufmassAnlegen` über den Befehlsweg; bei Erfolg auf das neue Blatt. */
  const anlegen = async (
    kopf: Kopfangaben,
    positionen: readonly Aufmassposition[] = [],
  ): Promise<boolean> => {
    const befehl = neuesBlatt(u.ids, a, stand.blaetter, kopf, positionen);
    const r = await aufmassSitzung(weg, a.projektId, null).befehl(befehl);
    if (!pruefe(r)) return false;
    zeige({ titel: texte.meldungen.angelegt(befehl.aufmass.nummer), art: 'erfolg' });
    gehe(blattPfad(a.projektId, a.id, befehl.aufmass.id));
    return true;
  };

  return (
    <div className="seite lv abrechnung">
      <div className="lv__kopf">
        <h1>{t.titel(a.name)}</h1>
        <Verweis pfad={auftragPfad(a.projektId, a.id)} text={texte.zumAuftrag} gehe={gehe} />
      </div>
      <Werkzeugleiste beschriftung={texte.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          variante="primaer"
          onClick={() => {
            setNeu(true);
          }}
        >
          {t.neu}
        </Button>
        <X31Einlesen auftrag={stand.auftrag} naechsteNummer={nummer} anlegen={anlegen} />
        <Werkzeugverweis
          href={sollIstPfad(a.projektId, a.id)}
          onFolgen={() => {
            gehe(sollIstPfad(a.projektId, a.id));
          }}
        >
          {t.sollIst}
        </Werkzeugverweis>
      </Werkzeugleiste>
      {stand.blaetter.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <table className="abrechnung__liste" aria-label={t.tabelle}>
          <thead>
            <tr>
              <th scope="col">{t.nummer}</th>
              <th scope="col">{t.bezeichnung}</th>
              <th scope="col">{t.datum}</th>
              <th scope="col" className="abrechnung__zahl">
                {t.positionen}
              </th>
            </tr>
          </thead>
          <tbody>
            {stand.blaetter.map((b: Aufmass) => (
              <tr key={b.id} data-nummer={b.nummer}>
                <td className="abrechnung__zahl">{b.nummer}</td>
                <td>
                  <Verweis
                    pfad={blattPfad(a.projektId, a.id, b.id)}
                    text={b.bezeichnung === '' ? t.oeffnen(b.nummer) : b.bezeichnung}
                    gehe={gehe}
                  />
                </td>
                <td>{b.datum === null ? '' : datumDe(b.datum)}</td>
                <td className="abrechnung__zahl">{b.positionen.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <KopfDialog
        offen={neu}
        titel={texte.kopf.titelNeu}
        beschreibung={texte.kopf.beschreibungNeu(nummer)}
        anfang={{ bezeichnung: '', datum: null }}
        bestaetigen={texte.kopf.anlegen}
        onSchliessen={() => {
          setNeu(false);
        }}
        onBestaetigen={(k) => anlegen(k)}
      />
    </div>
  );
}
