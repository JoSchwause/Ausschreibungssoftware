// SPDX-License-Identifier: AGPL-3.0-or-later
// Die schlichten Listen je Projekt, die die Seitenleiste braucht (Ticket 131, E1): Leistungsverzeichnisse, Vergabe,
// Auftrags-LVs, Nachträge, Aufmaß und Rechnungen. Sie zeigen, was es gibt, und führen auf die Fachseiten; geändert wird dort
// (die LV-Liste teilt den Abschnitt der Projektübersicht und legt auch an).

import type { ProjektId } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { aufmassPfad, blattPfad, sollIstPfad } from '../abrechnung/pfad';
import { texte as abrechnungTexte } from '../abrechnung/texte';
import { auftragPfad } from '../auftrag/ziel';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { NachtragKennzeichen } from '../nachtrag/NachtragKennzeichen';
import { rechnungPfad, rechnungenPfad } from '../rechnung/pfad';
import { Ladeansicht, useSeitenladen } from '../ui/seite';
import type { Projektlistenart } from '../ui/navigation';
import { texte as uiTexte } from '../ui/texte';
import { Verweis } from '../ui/Verweis';
import { preisspiegelPfad } from '../vergabe/pfad';
import { LvAbschnitt, lvPfad } from './LvAbschnitt';
import { LvNetto } from './LvNetto';
import { auftragZu, nachtraegeZu, projektstandLaden, type Projektstand } from './stand';
import { texte } from './texte';
import '../lv/lv.css';
import './projekt.css';

const t = texte.bereiche;
const u = texte.uebersicht;

function Vergabe({ stand, gehe }: { stand: Projektstand; gehe: (pfad: string) => void }): ReactElement {
  const lvs = stand.lvs.filter((lv) => lv.vorlage !== true);
  if (lvs.length === 0) return <p>{t.vergabeLeer}</p>;
  return (
    <ul className="projekt__liste" aria-label={t.vergabeListe}>
      {lvs.map((lv) => {
        const auftrag = auftragZu(stand, lv.id);
        return (
          <li key={lv.id}>
            <Verweis pfad={lvPfad(lv.id)} text={lv.name} gehe={gehe} />
            <NachtragKennzeichen nachtrag={lv.nachtrag} />
            <span>{u.angebote(stand.angebote.get(lv.id) ?? 0)}</span>
            <Verweis
              pfad={preisspiegelPfad(lv.id)}
              text={u.preisspiegel}
              aria-label={u.preisspiegelVon(lv.name)}
              gehe={gehe}
            />
            {auftrag === null ? (
              <span>{u.keinZuschlag}</span>
            ) : (
              <Verweis
                pfad={auftragPfad(stand.projekt.id, auftrag.id)}
                text={u.zuschlag}
                aria-label={u.von(u.zuschlag, lv.name)}
                gehe={gehe}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Auftraege({ stand, gehe }: { stand: Projektstand; gehe: (pfad: string) => void }): ReactElement {
  const p = stand.projekt.id;
  if (stand.auftraege.length === 0) return <p>{t.auftraegeLeer}</p>;
  return (
    <ul className="projekt__liste" aria-label={t.auftraegeListe}>
      {stand.auftraege.map((a) => {
        const n = nachtraegeZu(stand, a.id).length;
        const blaetter = stand.aufmasse.get(a.id)?.length ?? 0;
        const rechnungen = stand.rechnungen.get(a.id)?.length ?? 0;
        return (
          <li key={a.id}>
            <Verweis pfad={auftragPfad(p, a.id)} text={a.name} gehe={gehe} />
            <span>{u.nachtraege(n)}</span>
            <Verweis
              pfad={aufmassPfad(p, a.id)}
              text={u.aufmass(blaetter)}
              aria-label={u.von(u.aufmass(blaetter), a.name)}
              gehe={gehe}
            />
            <Verweis
              pfad={rechnungenPfad(p, a.id)}
              text={u.rechnungen(rechnungen)}
              aria-label={u.von(u.rechnungen(rechnungen), a.name)}
              gehe={gehe}
            />
          </li>
        );
      })}
    </ul>
  );
}

function Nachtraege({ stand, gehe }: { stand: Projektstand; gehe: (pfad: string) => void }): ReactElement {
  const mit = stand.auftraege.filter((a) => nachtraegeZu(stand, a.id).length > 0);
  if (mit.length === 0) return <p>{t.nachtraegeLeer}</p>;
  return (
    <>
      {mit.map((a) => (
        <section key={a.id} className="projekt__abschnitt" aria-label={t.nachtraegeListe(a.name)}>
          <h2>
            <Verweis pfad={auftragPfad(stand.projekt.id, a.id)} text={a.name} gehe={gehe} />
          </h2>
          <ul className="projekt__liste">
            {nachtraegeZu(stand, a.id).map((lv) => (
              <li key={lv.id}>
                <Verweis pfad={lvPfad(lv.id)} text={lv.name} gehe={gehe} />
                <NachtragKennzeichen nachtrag={lv.nachtrag} />
                <LvNetto name={lv.name} netto={lv.nettoNachNachlass} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Aufmass({ stand, gehe }: { stand: Projektstand; gehe: (pfad: string) => void }): ReactElement {
  const p = stand.projekt.id;
  if (stand.auftraege.length === 0) return <p>{t.aufmassLeer}</p>;
  return (
    <>
      {stand.auftraege.map((a) => {
        const blaetter = stand.aufmasse.get(a.id) ?? [];
        return (
          <section key={a.id} className="projekt__abschnitt" aria-label={t.aufmassListe(a.name)}>
            <h2>
              <Verweis pfad={aufmassPfad(p, a.id)} text={a.name} gehe={gehe} />
            </h2>
            {blaetter.length === 0 ? (
              <p>{t.keineBlaetter}</p>
            ) : (
              <ul className="projekt__liste">
                {blaetter.map((b) => (
                  <li key={b.id}>
                    <Verweis
                      pfad={blattPfad(p, a.id, b.id)}
                      text={abrechnungTexte.blatt.titel(b.nummer, b.bezeichnung)}
                      gehe={gehe}
                    />
                  </li>
                ))}
              </ul>
            )}
            <ul className="projekt__verweise">
              <li>
                <Verweis
                  pfad={sollIstPfad(p, a.id)}
                  text={u.sollIst}
                  aria-label={u.von(u.sollIst, a.name)}
                  gehe={gehe}
                />
              </li>
            </ul>
          </section>
        );
      })}
    </>
  );
}

function Rechnungen({ stand, gehe }: { stand: Projektstand; gehe: (pfad: string) => void }): ReactElement {
  const p = stand.projekt.id;
  if (stand.auftraege.length === 0) return <p>{t.rechnungenLeer}</p>;
  return (
    <>
      {stand.auftraege.map((a) => {
        const liste = stand.rechnungen.get(a.id) ?? [];
        return (
          <section key={a.id} className="projekt__abschnitt" aria-label={t.rechnungenListe(a.name)}>
            <h2>
              <Verweis pfad={rechnungenPfad(p, a.id)} text={a.name} gehe={gehe} />
            </h2>
            {liste.length === 0 ? (
              <p>{t.keineRechnungen}</p>
            ) : (
              <ul className="projekt__liste">
                {liste.map((r) => (
                  <li key={r.id}>
                    <Verweis
                      pfad={rechnungPfad(p, a.id, r.id)}
                      text={uiTexte.gegenstand.rechnungNummer(r.nummer)}
                      gehe={gehe}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}

export function ProjektbereichSeite({
  art,
  projektId,
  gehe,
}: {
  art: Projektlistenart;
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const { lage, neuLaden } = useSeitenladen(
    ({ speicher }) => projektstandLaden(speicher, projektId),
    [projektId],
  );
  if (lage.art !== 'da') {
    return <Ladeansicht lage={lage} laden={t.laden} nichtGefunden={texte.projekt.nichtGefunden} />;
  }
  const stand = lage.wert;
  const titel = t.titel(uiTexte.huelle.eintraege[art], stand.projekt.name);
  return (
    <div className="seite projekt">
      <div className="lv__kopf">
        <h1>{titel}</h1>
      </div>
      <div className="lv__werkzeuge">
        <HistorieKnoepfe />
      </div>
      {art === 'leistungsverzeichnisse' ? (
        <LvAbschnitt stand={stand} neuLaden={neuLaden} gehe={gehe} />
      ) : art === 'vergabe' ? (
        <Vergabe stand={stand} gehe={gehe} />
      ) : art === 'auftraege' ? (
        <Auftraege stand={stand} gehe={gehe} />
      ) : art === 'nachtraege' ? (
        <Nachtraege stand={stand} gehe={gehe} />
      ) : art === 'aufmass' ? (
        <Aufmass stand={stand} gehe={gehe} />
      ) : (
        <Rechnungen stand={stand} gehe={gehe} />
      )}
    </div>
  );
}
