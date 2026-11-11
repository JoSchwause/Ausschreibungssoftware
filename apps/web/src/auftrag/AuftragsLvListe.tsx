// SPDX-License-Identifier: AGPL-3.0-or-later
// Liste der Auftrags-LVs auf der Projektseite (Ticket 64). Lädt selbst (über die Projektdatei, D-64.2) und nach jedem
// Undo/Redo neu. Netto nach Nachlass aus dem gespeicherten Summenstand (Kern), formatiert über `dezimal`.

import { formatiereBetragDe } from '@tethys/dezimal';
import type { AuftragsLvZustand, Projekt } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { auftragsLvsLaden } from './auftrag';
import { texte } from './texte';
import { auftragPfad } from './ziel';

const t = texte.liste;

export function AuftragsLvListe({
  projekt,
  gehe,
}: {
  projekt: Projekt;
  gehe: (pfad: string) => void;
}): ReactElement | null {
  const u = useUmgebung();
  const [auftraege, setAuftraege] = useState<readonly AuftragsLvZustand[] | null>(null);
  const [lauf, setLauf] = useState(0);
  useEffect(() => {
    let aktiv = true;
    void auftragsLvsLaden(u.speicher, projekt.id).then((r) => {
      if (aktiv) setAuftraege(r.ok ? r.wert : []);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projekt.id, lauf]);
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );
  if (auftraege === null) return null;

  return (
    <>
      <h2>{t.titel}</h2>
      {auftraege.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <ul className="projekt__liste" aria-label={t.tabelle}>
          {auftraege.map((z) => {
            const a = z.auftragsLeistungsverzeichnis;
            const pfad = auftragPfad(projekt.id, a.id);
            const name = t.eintrag(a.name, a.auftragnehmer?.name ?? '–');
            return (
              <li key={a.id}>
                <a
                  href={hrefFuer(pfad)}
                  onClick={(e) => {
                    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    gehe(pfad);
                  }}
                >
                  {name}
                </a>
                <span className="projekt__betrag" aria-label={`${t.netto} ${name}`}>
                  {formatiereBetragDe(z.summen.gesamt.nettoNachNachlass)} €
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
