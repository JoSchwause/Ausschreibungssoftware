// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: Nachtragsliste auf der Seite des Auftrags-LV: Nummer, Bezeichnung (Link zum Nachtrags-LV), Status, Netto des
// Angebots des Auftragnehmers und „Beauftragen“; darunter die Nachtragsbefunde als Hinweis (U5). Welche LVs Nachträge sind,
// steht in der LV-Übersicht (D-43); geladen werden nur diese. Lädt neu, wenn sich das Auftrags-LV ändert (Undo/Redo,
// Beauftragen).

import { Button } from '@tethys/ui-basis';
import type { AuftragsLvZustand } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Verweis } from '../auftrag/Verweis';
import { befehlswegFuer } from '../lv/befehlsweg';
import { formatiereBetragDe } from '../lv/zahlen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BeauftragenDialog, type Beauftragungsziel } from './BeauftragenDialog';
import { nachtraegeLaden, type Nachtragsliste as Liste } from './speichern';
import { texte } from './texte';
import './nachtrag.css';

const t = texte.liste;

export function Nachtragsliste({
  auftrag,
  gehe,
  onBeauftragt,
}: {
  auftrag: AuftragsLvZustand;
  gehe: (pfad: string) => void;
  /** Ein Nachtrag ist beauftragt: Das Auftrags-LV hat neue Positionen und lädt neu. */
  onBeauftragt: () => void;
}): ReactElement {
  const u = useUmgebung();
  const [liste, setListe] = useState<Liste | null>(null);
  const [lauf, setLauf] = useState(0);
  const [ziel, setZiel] = useState<Beauftragungsziel | null>(null);
  const a = auftrag.auftragsLeistungsverzeichnis;

  useEffect(() => {
    let aktiv = true;
    void nachtraegeLaden(u.speicher, auftrag).then((r) => {
      if (aktiv) setListe(r.ok ? r.wert : { nachtraege: [], befunde: [] });
    });
    return () => {
      aktiv = false;
    };
  }, [u, auftrag, lauf]);
  // Undo/Redo kann den Status eines Nachtrags ändern, ohne das Auftrags-LV zu ändern.
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  return (
    <section className="nachtrag__liste" aria-label={t.titel}>
      <h2 className="auftrag__unterkopf">{t.titel}</h2>
      {liste === null ? null : liste.nachtraege.length === 0 ? (
        <p className="auftrag__leise">{t.leer}</p>
      ) : (
        <table className="nachtrag__tabelle" aria-label={t.tabelle}>
          <thead>
            <tr>
              <th scope="col">{t.nummer}</th>
              <th scope="col">{t.bezeichnung}</th>
              <th scope="col">{t.status}</th>
              <th scope="col">{t.angebot}</th>
              <th scope="col">{t.aktion}</th>
            </tr>
          </thead>
          <tbody>
            {liste.nachtraege.map((n) => (
              <tr key={n.lvId}>
                <td>{n.nummer}</td>
                <td>
                  <Verweis pfad={`/lv/${n.lvId}`} text={n.name} gehe={gehe} />
                </td>
                <td data-testid="nachtrag-status">{texte.status[n.status]}</td>
                <td>
                  {n.angebotsnetto === null ? t.ohneAngebot : `${formatiereBetragDe(n.angebotsnetto)} €`}
                </td>
                <td>
                  {n.status === 'angemeldet' || n.status === 'angeboten' ? (
                    <Button
                      groesse="sm"
                      aria-label={t.beauftragenFuer(n.nummer)}
                      onClick={() => {
                        setZiel({ auftragsLvId: a.id, nachtragsLvId: n.lvId, nummer: n.nummer });
                      }}
                    >
                      {texte.band.beauftragen}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {liste === null || liste.befunde.length === 0 ? null : (
        <ul className="auftrag__warnungen" role="note" aria-label={t.befunde}>
          {liste.befunde.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      <BeauftragenDialog
        ziel={ziel}
        onSchliessen={() => {
          setZiel(null);
        }}
        onBeauftragt={() => {
          setZiel(null);
          onBeauftragt();
        }}
      />
    </section>
  );
}
