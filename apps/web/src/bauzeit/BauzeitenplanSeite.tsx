// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/bauzeit/<bid>` (Ticket 118): ein Bauzeitenplan im gemeinsamen Vergleichsgrid mit Balkenspalte (U2,
// Ticket 96). Kopfzeile mit Projektende und kritischem Weg; Vorgänge anlegen, bearbeiten, entfernen über ein Formular (je
// Änderung ein Befehl, ein Undo-Schritt, sofort gespeichert: A5, U7); Befunde der Terminrechnung mit Sprunglink (U5); PDF.
// Termine rechnet `bauzeit` bei jedem Stand neu, gespeichert werden nur die Eingaben (D-57).

import { bauzeitenplanBerechnen } from '@tethys/bauzeit';
import { Button, Dialog } from '@tethys/ui-basis';
import { VergleichsGrid, type VergleichsSprungziel } from '@tethys/ui-grid';
import type { BauzeitenplanId, BauzeitenplanZustand, ProjektId, VorgangId } from '@tethys/vertrag';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Ladeansicht, useSeitenladen } from '../ui/seite';
import { Verweis } from '../ui/Verweis';
import { planAnsicht, vorgangName, type Befundgruppe } from './ansicht';
import {
  kopfBefehl,
  kopfentwurf,
  leererVorgangsentwurf,
  vorgangEntfernenBefehl,
  vorgangEntfernenFrage,
  vorgangSetzenBefehl,
  vorgangsentwurf,
  type Feldfehler,
  type Kopfentwurf,
  type Vorgangsentwurf,
} from './befehle';
import { KopfFelder } from './KopfFelder';
import { bauzeitPfad } from './pfad';
import { PlanDrucken } from './PlanDrucken';
import { bauzeitenplanSitzung, type BauzeitenplanSitzung } from './schreiben';
import { texte } from './texte';
import { VorgangDialog } from './VorgangDialog';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import './bauzeit.css';

const t = texte.plan;

interface Geladen {
  sitzung: BauzeitenplanSitzung;
  projekt: string | null;
}

export function BauzeitenplanSeite({
  projektId,
  id,
  gehe,
}: {
  projektId: ProjektId;
  id: BauzeitenplanId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  // Undo und Redo können den Plan ändern oder entfernen: das Gerüst lädt neu.
  const { lage } = useSeitenladen(
    async ({ speicher }) => {
      const [r, p] = await Promise.all([
        speicher.bauzeitenplaene.laden(id),
        speicher.projekte.laden(projektId),
      ]);
      return r.ok ? { zustand: r.wert, projekt: p.ok ? p.wert.name : null } : null;
    },
    [id, projektId],
    {
      // Dieselbe Sitzung behalten (Undo/Redo schreibt den neuen Stand hinein), damit kein Befehl auf einem alten Stand läuft.
      alsWert: (neu, alt: Geladen | null): Geladen => {
        if (alt !== null) {
          alt.sitzung.setze(neu.zustand);
          return alt;
        }
        return {
          sitzung: bauzeitenplanSitzung(u, neu.zustand.bauzeitenplan.projektId, neu.zustand),
          projekt: neu.projekt,
        };
      },
    },
  );

  if (lage.art !== 'da') {
    return (
      <Ladeansicht
        lage={lage}
        laden={t.laden}
        nichtGefunden={t.nichtGefunden}
        zusatz={<Verweis pfad={bauzeitPfad(projektId)} text={t.zurueck} gehe={gehe} />}
      />
    );
  }
  return <Planseite sitzung={lage.wert.sitzung} projekt={lage.wert.projekt} gehe={gehe} />;
}

function Planseite({
  sitzung,
  projekt,
  gehe,
}: {
  sitzung: BauzeitenplanSitzung;
  projekt: string | null;
  gehe: (pfad: string) => void;
}): ReactElement {
  const zustand = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen);
  if (zustand === null) {
    return (
      <div className="seite">
        <h1>{t.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
        </div>
      </div>
    );
  }
  return <Editor sitzung={sitzung} zustand={zustand} projekt={projekt} gehe={gehe} />;
}

type Frage =
  | { art: 'keine' }
  | { art: 'entfernen'; vorgangId: VorgangId; name: string; kinder: number; nachfolger: number }
  | { art: 'loeschen' };

function Editor({
  sitzung,
  zustand,
  projekt,
  gehe,
}: {
  sitzung: BauzeitenplanSitzung;
  zustand: BauzeitenplanZustand;
  projekt: string | null;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const plan = zustand.bauzeitenplan;
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const ergebnis = useMemo(() => bauzeitenplanBerechnen(plan), [plan]);
  const ansicht = useMemo(() => planAnsicht(plan, ergebnis, zugeklappt), [plan, ergebnis, zugeklappt]);
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [sprung, setSprung] = useState<VergleichsSprungziel | undefined>(undefined);
  const [dialog, setDialog] = useState<{ offen: boolean; anfang: Vorgangsentwurf }>({
    offen: false,
    anfang: leererVorgangsentwurf(),
  });
  const [frage, setFrage] = useState<Frage>({ art: 'keine' });
  const [kopf, setKopf] = useState<Kopfentwurf>(() => kopfentwurf(plan));
  const [kopfFehler, setKopfFehler] = useState<readonly Feldfehler[]>([]);
  useEffect(() => {
    setKopf(kopfentwurf(plan));
    // Nur wenn sich der gespeicherte Kopf ändert (etwa nach Undo), nicht bei jedem Vorgang.
  }, [plan.name, plan.projektbeginn, plan.kalender]);

  const aktiverVorgang = plan.vorgaenge.find((v) => v.id === aktiv) ?? null;

  const springe = (vorgangId: VorgangId): void => {
    // Zugeklappte Sammelvorgänge über dem Ziel aufklappen, dann springen.
    const nachId = new Map(plan.vorgaenge.map((v) => [v.id, v]));
    const auf = new Set(zugeklappt);
    for (let e = nachId.get(vorgangId)?.elternId ?? null; e !== null; e = nachId.get(e)?.elternId ?? null)
      auf.delete(e);
    setZugeklappt(auf);
    setSprung((alt) => ({ zeilenId: vorgangId, spalte: 'vorgang', nr: (alt?.nr ?? 0) + 1 }));
  };

  const vorgangSpeichern = async (e: Vorgangsentwurf): Promise<readonly Feldfehler[] | null> => {
    const b = vorgangSetzenBefehl(plan, e, () => u.ids.vorgang());
    if (!b.ok) return b.fehler;
    const a = await sitzung.befehl(b.wert);
    if (!pruefe(a)) return [];
    setDialog((d) => ({ ...d, offen: false }));
    springe(b.wert.vorgang.id);
    return null;
  };

  const entfernen = async (vorgangId: VorgangId): Promise<void> => {
    setFrage({ art: 'keine' });
    pruefe(await sitzung.befehl(vorgangEntfernenBefehl(vorgangId)));
  };

  const entfernenFragen = (): void => {
    if (aktiverVorgang === null) return;
    const f = vorgangEntfernenFrage(plan, aktiverVorgang.id);
    if (f === null) void entfernen(aktiverVorgang.id);
    else
      setFrage({ art: 'entfernen', vorgangId: aktiverVorgang.id, name: vorgangName(aktiverVorgang), ...f });
  };

  const kopfSpeichern = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    const b = kopfBefehl(kopf);
    if (!b.ok) {
      setKopfFehler(b.fehler);
      return;
    }
    setKopfFehler([]);
    pruefe(await sitzung.befehl(b.wert));
  };

  const loeschen = async (): Promise<void> => {
    setFrage({ art: 'keine' });
    const a = await sitzung.befehl({ art: 'BauzeitenplanLoeschen' });
    if (pruefe(a)) gehe(bauzeitPfad(plan.projektId));
  };

  return (
    <div className="seite lv bauzeit">
      <div className="lv__kopf">
        <h1>{t.titel(plan.name)}</h1>
        <Verweis pfad={bauzeitPfad(plan.projektId)} text={t.zurueck} gehe={gehe} />
      </div>
      <dl className="bauzeit__eckdaten" aria-label={t.titel(plan.name)}>
        <div>
          <dt>{t.projektbeginn}</dt>
          <dd data-testid="projektbeginn">{ansicht.kopf.projektbeginn}</dd>
        </div>
        <div>
          <dt>{t.projektende}</dt>
          <dd data-testid="projektende">{ansicht.kopf.projektende}</dd>
        </div>
        <div>
          <dt>{t.kritischerWeg}</dt>
          <dd data-testid="kritischer-weg">{ansicht.kopf.kritischerWeg}</dd>
        </div>
      </dl>
      <div className="lv__werkzeuge" role="toolbar" aria-label={t.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          variante="primaer"
          onClick={() => {
            setDialog({ offen: true, anfang: leererVorgangsentwurf() });
          }}
        >
          {t.vorgangAnlegen}
        </Button>
        <Button
          disabled={aktiverVorgang === null}
          title={aktiverVorgang === null ? t.keinVorgangGewaehlt : undefined}
          onClick={() => {
            if (aktiverVorgang !== null) setDialog({ offen: true, anfang: vorgangsentwurf(aktiverVorgang) });
          }}
        >
          {t.vorgangBearbeiten}
        </Button>
        <Button disabled={aktiverVorgang === null} onClick={entfernenFragen}>
          {t.vorgangEntfernen}
        </Button>
        <PlanDrucken plan={plan} ergebnis={ergebnis} projekt={projekt} />
        <Button
          variante="gefahr"
          onClick={() => {
            setFrage({ art: 'loeschen' });
          }}
        >
          {t.loeschen}
        </Button>
      </div>

      <div className="bauzeit__haupt">
        <div className="bauzeit__grid">
          {plan.vorgaenge.length === 0 ? <p>{t.leer}</p> : null}
          <VergleichsGrid
            beschriftung={t.grid}
            spalten={ansicht.spalten}
            zeilen={ansicht.zeilen}
            baumspalte="vorgang"
            fixierteSpalten={2}
            kennzeichenTexte={texte.kennzeichen}
            {...(sprung === undefined ? {} : { sprungziel: sprung })}
            onZeileAktiv={setAktiv}
            onAufklappen={(zeilenId, auf) => {
              setZugeklappt((alt) => {
                const neu = new Set(alt);
                if (auf) neu.delete(zeilenId);
                else neu.add(zeilenId);
                return neu;
              });
            }}
          />
        </div>
        <BefundPanel gruppen={ansicht.befunde} onSprung={springe} />
      </div>

      <h2>{t.kopf}</h2>
      <form className="bauzeit__formular" onSubmit={(e) => void kopfSpeichern(e)} aria-label={t.kopf}>
        <KopfFelder entwurf={kopf} onEntwurf={setKopf} fehler={kopfFehler} />
        <Button type="submit">{t.kopfSpeichern}</Button>
      </form>

      <VorgangDialog
        plan={plan}
        anfang={dialog.anfang}
        offen={dialog.offen}
        onSchliessen={() => {
          setDialog((d) => ({ ...d, offen: false }));
        }}
        onSpeichern={vorgangSpeichern}
      />
      <Dialog
        offen={frage.art === 'entfernen'}
        onOffenChange={(o) => {
          if (!o) setFrage({ art: 'keine' });
        }}
        titel={t.entfernenTitel}
        beschreibung={
          frage.art === 'entfernen' ? t.entfernenFrage(frage.name, frage.kinder, frage.nachfolger) : ''
        }
        fuss={
          <>
            <Button
              onClick={() => {
                setFrage({ art: 'keine' });
              }}
            >
              {t.abbrechen}
            </Button>
            <Button
              variante="gefahr"
              onClick={() => {
                if (frage.art === 'entfernen') void entfernen(frage.vorgangId);
              }}
            >
              {t.entfernenBestaetigen}
            </Button>
          </>
        }
      />
      <Dialog
        offen={frage.art === 'loeschen'}
        onOffenChange={(o) => {
          if (!o) setFrage({ art: 'keine' });
        }}
        titel={t.loeschenTitel}
        beschreibung={t.loeschenFrage(plan.name)}
        fuss={
          <>
            <Button
              onClick={() => {
                setFrage({ art: 'keine' });
              }}
            >
              {t.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschen()}>
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </div>
  );
}

/** Befunde der Terminrechnung je Schwere; jeder Eintrag mit Vorgang springt zu dessen Zeile (U5). */
function BefundPanel({
  gruppen,
  onSprung,
}: {
  gruppen: readonly Befundgruppe[];
  onSprung: (vorgangId: VorgangId) => void;
}): ReactElement {
  const b = texte.befunde;
  const anzahl = gruppen.reduce((n, g) => n + g.eintraege.length, 0);
  return (
    <aside className="bauzeit__befunde" aria-label={b.panel}>
      <h2>
        {b.titel} <span data-testid="befundzahl">({String(anzahl)})</span>
      </h2>
      {anzahl === 0 ? <p>{b.keine}</p> : null}
      {gruppen
        .filter((g) => g.eintraege.length > 0)
        .map((g) => (
          <section key={g.schwere}>
            <h3>
              {g.schwere === 'fehler' ? 'Fehler' : 'Warnungen'} ({String(g.eintraege.length)})
            </h3>
            <ul>
              {g.eintraege.map((e, i) => (
                <li key={`${e.befund.code}-${String(i)}`}>
                  <button
                    type="button"
                    className="bauzeit__befund"
                    data-code={e.befund.code}
                    disabled={e.vorgangId === null}
                    onClick={() => {
                      if (e.vorgangId !== null) onSprung(e.vorgangId);
                    }}
                  >
                    <span className="bauzeit__befund-ort">{e.ort ?? b.planweit}</span>
                    {e.text}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </aside>
  );
}
