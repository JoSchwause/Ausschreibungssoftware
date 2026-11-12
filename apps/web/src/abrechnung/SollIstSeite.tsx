// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/auftrag/<id>/soll-ist` (Ticket 87, A2): Soll/Ist über alle Aufmaßblätter im Vergleichsgrid (U2),
// Summen je Gliederung und gesamt. Befunde (VOB/B § 2 Abs. 3, D-35) stehen in der Befundspalte mit neutralem Kennzeichen
// und als Liste, deren Einträge per Tastatur zur Zeile springen (U3). Die Schwellen gelten für die Sitzung, sie werden
// nicht gespeichert; unter der unteren Schwelle gibt es Befunde erst mit einer Schlussrechnung (`abgeschlossen`).

import { formatiereProzentDe } from '@tethys/dezimal';
import { Eingabefeld } from '@tethys/ui-basis';
import { VergleichsGrid, type VergleichsSprungziel } from '@tethys/ui-grid';
import type { Prozent } from '@tethys/vertrag';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { auftragPfad } from '../auftrag/ziel';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { zahlLesen } from '../lv/zahlen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import type { Abrechnungsstand } from './aufmass';
import { aufmassPfad } from './pfad';
import { STANDARD_OBERSCHWELLE, STANDARD_UNTERSCHWELLE, sollIstAnsicht, sollIstRechnen } from './sollist';
import { texte } from './texte';
import { Verweis } from '../ui/Verweis';

const t = texte.sollIst;

function Schwellenfeld({
  label,
  wert,
  onWert,
}: {
  label: string;
  wert: Prozent;
  onWert: (p: Prozent) => void;
}): ReactElement {
  const [text, setText] = useState(formatiereProzentDe(wert));
  const [meldung, setMeldung] = useState<string | null>(null);
  const uebernehmen = (): void => {
    const r = zahlLesen('prozent', text);
    if (!r.ok) {
      setMeldung(r.fehler);
      return;
    }
    setMeldung(null);
    setText(formatiereProzentDe(r.wert));
    if (r.wert !== wert) onWert(r.wert);
  };
  return (
    <Eingabefeld
      label={label}
      value={text}
      kompakt
      className="abrechnung__schwelle"
      onWertChange={(w) => {
        setText(w);
        setMeldung(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          uebernehmen();
        }
      }}
      onBlur={uebernehmen}
      {...(meldung === null ? {} : { meldung })}
    />
  );
}

export function SollIstSeite({
  stand,
  gehe,
}: {
  stand: Abrechnungsstand;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const auftrag = stand.auftrag;
  const a = auftrag.auftragsLeistungsverzeichnis;
  const [oben, setOben] = useState<Prozent>(STANDARD_OBERSCHWELLE);
  const [unten, setUnten] = useState<Prozent>(STANDARD_UNTERSCHWELLE);
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [sprungziel, setSprungziel] = useState<VergleichsSprungziel | undefined>(undefined);
  const sprungNr = useRef(0);
  // Abgeschlossen heißt: Es gibt eine Schlussrechnung (D-35).
  const [abgeschlossen, setAbgeschlossen] = useState(false);
  useEffect(() => {
    let aktiv = true;
    void u.speicher.rechnungen.auflisten(a.id).then((r) => {
      if (aktiv) setAbgeschlossen(r.ok && r.wert.some((x) => x.art === 'schluss'));
    });
    return () => {
      aktiv = false;
    };
  }, [u, a.id, stand]);

  const sollIst = useMemo(
    () =>
      sollIstRechnen(auftrag, stand.blaetter, { abgeschlossen, oberSchwelle: oben, unterSchwelle: unten }),
    [auftrag, stand.blaetter, abgeschlossen, oben, unten],
  );
  const ansicht = useMemo(
    () => sollIstAnsicht({ auftrag, sollIst, zugeklappt }),
    [auftrag, sollIst, zugeklappt],
  );

  /** Springt zur Befundzelle einer Position; ihre Vorfahren werden dazu aufgeklappt. */
  const springe = (positionId: string): void => {
    const vorfahren = new Set<string>();
    let k = a.knoten.find((x) => x.id === positionId);
    while (k !== undefined && k.elternId !== a.id) {
      vorfahren.add(k.elternId);
      const eltern: string = k.elternId;
      k = a.knoten.find((x) => x.id === eltern);
    }
    if ([...vorfahren].some((id) => zugeklappt.has(id)))
      setZugeklappt((alt) => new Set([...alt].filter((id) => !vorfahren.has(id))));
    sprungNr.current += 1;
    setSprungziel({ zeilenId: positionId, spalte: 'befund', nr: sprungNr.current });
  };

  return (
    <div className="seite lv abrechnung">
      <div className="lv__kopf">
        <h1>{t.titel(a.name)}</h1>
        <Verweis pfad={aufmassPfad(a.projektId, a.id)} text={texte.zurListe} gehe={gehe} />
        <Verweis pfad={auftragPfad(a.projektId, a.id)} text={texte.zumAuftrag} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.werkzeuge}>
        <HistorieKnoepfe />
      </div>
      <fieldset className="abrechnung__einstellungen">
        <legend>{t.einstellungen}</legend>
        <Schwellenfeld label={t.oberSchwelle} wert={oben} onWert={setOben} />
        <Schwellenfeld label={t.unterSchwelle} wert={unten} onWert={setUnten} />
        <p className="abrechnung__hinweis" data-testid="soll-ist-abgeschlossen">
          {abgeschlossen ? t.abgeschlossen : t.offen}
        </p>
      </fieldset>
      <p className="abrechnung__hinweis">{t.blaetter(stand.blaetter.length)}</p>
      <div className="lv__grid abrechnung__grid">
        <VergleichsGrid
          beschriftung={t.grid}
          spalten={ansicht.spalten}
          zeilen={ansicht.zeilen}
          summen={ansicht.summen}
          kennzeichenTexte={ansicht.kennzeichenTexte}
          fixierteSpalten={2}
          baumspalte="kurztext"
          {...(sprungziel ? { sprungziel } : {})}
          onAufklappen={(id, auf) => {
            setZugeklappt((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(id);
              else neu.add(id);
              return neu;
            });
          }}
        />
      </div>
      <section className="abrechnung__befunde" aria-label={t.befunde}>
        <h2>
          {t.befunde} ({ansicht.befunde.length})
        </h2>
        {ansicht.befunde.length === 0 ? (
          <p>{t.keineBefunde}</p>
        ) : (
          <ul>
            {ansicht.befunde.map((b) => (
              <li key={b.positionId}>
                <button
                  type="button"
                  className="abrechnung__sprung"
                  onClick={() => {
                    springe(b.positionId);
                  }}
                >
                  {b.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
