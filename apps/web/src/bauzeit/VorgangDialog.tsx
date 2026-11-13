// SPDX-License-Identifier: AGPL-3.0-or-later
// Formular eines Vorgangs (Ticket 118): Bezeichnung, Nummer, Sammelvorgang, Dauer, Terminvorgabe, Anordnungsbeziehungen mit
// Art und Abstand, Bezug auf ein LV, Ist-Termine und Fortschritt. Ein Vorgänger wird aus dem Plan gewählt, nie getippt
// (D-64). Fehler stehen am Feld, der Entwurf bleibt (U5). Speichern ist ein `VorgangSetzen` (ein Undo-Schritt).
// Ticket 155: Der Bezug kann einzelne Gliederungen und Positionen nennen; bei einem Auftrags-LV schlägt das Formular den
// Fortschritt aus dem Leistungsstand vor (D-109.7), übernommen wird er nur auf Knopfdruck.

import { formatiereProzentDe } from '@tethys/dezimal';
import { Auswahl, Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type {
  Anordnungsart,
  AuftragsLeistungsverzeichnisId,
  Bauzeitenplan,
  GliederungId,
  Knoten,
  LeistungsverzeichnisId,
  PositionId,
  ProjektId,
  VorgangId,
  Vorgangsbezug,
} from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { abrechnungLaden, type Abrechnungsstand } from '../abrechnung/aufmass';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { teilbaum, type Feldfehler, type Vorgangsentwurf } from './befehle';
import { fortschrittAusAbrechnung, knotenFiltern, knotenwahl, type Knotenwahl } from './bezug';
import { vorgangName } from './ansicht';
import { ANORDNUNGSARTEN, texte } from './texte';

const OBEN = 'oben';
const KEIN = 'kein';
const GANZ = 'ganz';
const KNOTEN = 'knoten';
/** So viele Knoten zeigt die Wahl höchstens auf einmal (die gewählten immer dazu). */
const KNOTENGRENZE = 100;
const t = texte.vorgang;

interface LvWahl {
  readonly wert: string;
  readonly label: string;
  readonly bezug: Vorgangsbezug;
}

const bezugSchluessel = (b: Vorgangsbezug): string =>
  `${b.art === 'leistungsverzeichnis' ? 'lv' : 'auftrag'}:${b.id}`;

/** LVs und Auftrags-LVs des Projekts als Wahl für den Bezug (das ganze LV). */
function useLvWahl(projektId: ProjektId, aktiv: boolean): readonly LvWahl[] {
  const u = useUmgebung();
  const [wahl, setWahl] = useState<readonly LvWahl[]>([]);
  useEffect(() => {
    if (!aktiv) return;
    let lebt = true;
    void (async (): Promise<readonly LvWahl[]> => {
      const lvs = await u.speicher.leistungsverzeichnisse.auflisten(projektId);
      const auftraege = await u.speicher.auftragsLeistungsverzeichnisse.auflisten(projektId);
      const liste: LvWahl[] = [];
      if (lvs.ok)
        for (const lv of lvs.wert)
          liste.push({
            wert: `lv:${lv.id}`,
            label: lv.name,
            bezug: { art: 'leistungsverzeichnis', id: lv.id, knotenIds: null },
          });
      if (auftraege.ok)
        for (const a of auftraege.wert)
          liste.push({
            wert: `auftrag:${a.id}`,
            label: a.name,
            bezug: {
              art: 'auftrags-leistungsverzeichnis',
              id: a.id,
              knotenIds: null,
            },
          });
      return liste;
    })().then((liste) => {
      if (lebt) setWahl(liste);
    });
    return () => {
      lebt = false;
    };
  }, [u, projektId, aktiv]);
  return wahl;
}

/** Das bezogene LV: seine Knoten und, bei einem Auftrags-LV, die Blätter für den Leistungsstand. */
interface BezugsLv {
  readonly knoten: readonly Knoten[];
  readonly abrechnung: Abrechnungsstand | null;
}

/** Lädt das LV des Bezugs, solange der Dialog offen ist; `null`: lädt noch (oder kein Bezug). */
function useBezugsLv(bezug: Vorgangsbezug | null, aktiv: boolean): BezugsLv | null {
  const u = useUmgebung();
  const art = bezug?.art ?? null;
  const id = bezug?.id ?? null;
  const [lv, setLv] = useState<BezugsLv | null>(null);
  useEffect(() => {
    if (!aktiv || art === null || id === null) return;
    let lebt = true;
    setLv(null);
    void (async (): Promise<BezugsLv> => {
      if (art === 'leistungsverzeichnis') {
        const r = await u.speicher.leistungsverzeichnisse.laden(id as LeistungsverzeichnisId);
        return { knoten: r.ok ? r.wert.leistungsverzeichnis.knoten : [], abrechnung: null };
      }
      const r = await abrechnungLaden(u.speicher, id as AuftragsLeistungsverzeichnisId);
      return r.ok
        ? { knoten: r.wert.auftrag.auftragsLeistungsverzeichnis.knoten, abrechnung: r.wert }
        : { knoten: [], abrechnung: null };
    })().then((x) => {
      if (lebt) setLv(x);
    });
    return () => {
      lebt = false;
    };
  }, [u, art, id, aktiv]);
  return lv;
}

/** Die Wahl einzelner Gliederungen und Positionen: Suchfeld und Kontrollkästchen, eingerückt nach der Tiefe im LV. */
function KnotenWahl({
  liste,
  gewaehlt,
  meldung,
  onAendern,
}: {
  liste: readonly Knotenwahl[] | null;
  gewaehlt: readonly (GliederungId | PositionId)[];
  meldung: string | undefined;
  onAendern: (ids: readonly (GliederungId | PositionId)[]) => void;
}): ReactElement {
  const [suche, setSuche] = useState('');
  const menge = useMemo(() => new Set<string>(gewaehlt), [gewaehlt]);
  const gefiltert = useMemo(
    () => (liste === null ? null : knotenFiltern(liste, suche, menge, KNOTENGRENZE)),
    [liste, suche, menge],
  );
  const bekannt = useMemo(() => new Set<string>(liste?.map((k) => k.id) ?? []), [liste]);
  const unbekannt = liste === null ? 0 : gewaehlt.filter((id) => !bekannt.has(id)).length;
  return (
    <fieldset className="bauzeit__knotenwahl">
      <legend>{t.knoten}</legend>
      {gefiltert === null ? (
        <p aria-busy="true">{t.knotenLaedt}</p>
      ) : (
        <>
          <Eingabefeld
            label={t.knotenSuchen}
            value={suche}
            hinweis={
              gefiltert.treffer > KNOTENGRENZE
                ? t.knotenTreffer(KNOTENGRENZE, gefiltert.treffer)
                : t.knotenSuchHinweis
            }
            onWertChange={setSuche}
          />
          <p role="status">{t.knotenGewaehlt(gewaehlt.length)}</p>
          <ul className="bauzeit__knoten" aria-label={t.knoten}>
            {gefiltert.zeilen.map((k) => (
              <li key={k.id} style={{ paddingInlineStart: `calc(var(--tx-space-4) * ${String(k.tiefe)})` }}>
                <label>
                  <input
                    type="checkbox"
                    checked={menge.has(k.id)}
                    onChange={(ev) => {
                      onAendern(ev.target.checked ? [...gewaehlt, k.id] : gewaehlt.filter((x) => x !== k.id));
                    }}
                  />
                  {k.label}
                </label>
              </li>
            ))}
          </ul>
          {unbekannt > 0 ? <p role="note">{t.knotenUnbekannt(unbekannt)}</p> : null}
        </>
      )}
      <p className="tx-feld__meldung" role="status">
        {meldung ?? ''}
      </p>
    </fieldset>
  );
}

export function VorgangDialog({
  plan,
  anfang,
  offen,
  onSchliessen,
  onSpeichern,
}: {
  plan: Bauzeitenplan;
  /** Der Entwurf beim Öffnen (neu oder aus einem Vorgang). */
  anfang: Vorgangsentwurf;
  offen: boolean;
  onSchliessen: () => void;
  /** Liefert Feldfehler oder `null`, wenn der Vorgang gespeichert ist. */
  onSpeichern: (e: Vorgangsentwurf) => Promise<readonly Feldfehler[] | null>;
}): ReactElement {
  const [e, setE] = useState(anfang);
  const [fehler, setFehler] = useState<readonly Feldfehler[]>([]);
  const lvWahl = useLvWahl(plan.projektId, offen);
  useEffect(() => {
    if (offen) {
      setE(anfang);
      setFehler([]);
    }
  }, [offen, anfang]);

  const meldung = (feld: string): { meldung?: string } => {
    const f = fehler.find((x) => x.feld === feld);
    return f === undefined ? {} : { meldung: f.meldung };
  };
  const ausgeschlossen = e.id === null ? new Set<VorgangId>() : teilbaum(plan, e.id);
  const elternWahl = plan.vorgaenge
    .filter((v) => !ausgeschlossen.has(v.id))
    .map((v) => ({ wert: v.id, label: vorgangName(v) }));
  const vorgaengerWahl = plan.vorgaenge
    .filter((v) => v.id !== e.id)
    .map((v) => ({ wert: v.id, label: vorgangName(v) }));
  const bezugOptionen = [
    { wert: KEIN, label: t.keinBezug },
    ...lvWahl.map((w) => ({ wert: w.wert, label: w.label })),
  ];
  const bezugsLv = useBezugsLv(e.bezug, offen);
  const knotenliste = useMemo(() => (bezugsLv === null ? null : knotenwahl(bezugsLv.knoten)), [bezugsLv]);
  // `undefined`: der Leistungsstand lädt noch; `null`: kein Vorschlag.
  const vorschlag =
    e.bezug?.art !== 'auftrags-leistungsverzeichnis'
      ? null
      : bezugsLv?.abrechnung == null
        ? undefined
        : fortschrittAusAbrechnung(e.bezug, bezugsLv.abrechnung);
  const knotenSetzen = (knotenIds: Vorgangsbezug['knotenIds']): void => {
    if (e.bezug !== null) setE({ ...e, bezug: { ...e.bezug, knotenIds } });
  };

  const beziehungAendern = (i: number, teil: Partial<Vorgangsentwurf['beziehungen'][number]>): void => {
    setE({ ...e, beziehungen: e.beziehungen.map((b, j) => (j === i ? { ...b, ...teil } : b)) });
  };

  const speichern = async (x?: SyntheticEvent): Promise<void> => {
    x?.preventDefault();
    const f = await onSpeichern(e);
    setFehler(f ?? []);
  };

  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={e.id === null ? t.titelNeu : t.titelBearbeiten}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button variante="primaer" onClick={() => void speichern()}>
            {t.speichern}
          </Button>
        </>
      }
    >
      <form
        className="bauzeit__dialog"
        aria-label={e.id === null ? t.titelNeu : t.titelBearbeiten}
        onSubmit={(x) => void speichern(x)}
        onKeyDown={(x) => {
          // Enter in einem Textfeld speichert (die Schaltflächen stehen im Fuß des Dialogs, außerhalb des Formulars).
          if (x.key === 'Enter' && x.target instanceof HTMLInputElement && x.target.type !== 'checkbox')
            void speichern(x);
        }}
      >
        <Eingabefeld
          label={t.bezeichnung}
          value={e.bezeichnung}
          onWertChange={(bezeichnung) => {
            setE({ ...e, bezeichnung });
          }}
          {...meldung('bezeichnung')}
        />
        <Eingabefeld
          label={t.nummer}
          value={e.nummer}
          onWertChange={(nummer) => {
            setE({ ...e, nummer });
          }}
        />
        <Auswahl
          label={t.eltern}
          wert={e.elternId ?? OBEN}
          onWertChange={(w) => {
            setE({ ...e, elternId: w === OBEN ? null : (w as VorgangId) });
          }}
          optionen={[{ wert: OBEN, label: t.obersteEbene }, ...elternWahl]}
        />
        <Eingabefeld
          label={t.dauer}
          value={e.dauer}
          hinweis={t.dauerHinweis}
          inputMode="numeric"
          onWertChange={(dauer) => {
            setE({ ...e, dauer });
          }}
          {...meldung('dauer')}
        />
        <Eingabefeld
          label={t.fruehesterBeginn}
          value={e.fruehesterBeginn}
          hinweis={t.fruehesterBeginnHinweis}
          onWertChange={(fruehesterBeginn) => {
            setE({ ...e, fruehesterBeginn });
          }}
          {...meldung('fruehesterBeginn')}
        />
        <Auswahl
          label={t.bezug}
          wert={e.bezug === null ? KEIN : bezugSchluessel(e.bezug)}
          onWertChange={(w) => {
            if (w === KEIN) setE({ ...e, bezug: null });
            else if (e.bezug === null || w !== bezugSchluessel(e.bezug)) {
              const neu = lvWahl.find((x) => x.wert === w);
              if (neu !== undefined) setE({ ...e, bezug: neu.bezug });
            }
          }}
          optionen={
            e.bezug !== null && !lvWahl.some((w) => e.bezug !== null && w.wert === bezugSchluessel(e.bezug))
              ? [...bezugOptionen, { wert: bezugSchluessel(e.bezug), label: e.bezug.id }]
              : bezugOptionen
          }
        />
        {e.bezug === null ? null : (
          <Auswahl
            label={t.umfang}
            wert={e.bezug.knotenIds === null ? GANZ : KNOTEN}
            onWertChange={(w) => {
              if (w === GANZ) knotenSetzen(null);
              else if (e.bezug?.knotenIds === null) knotenSetzen([]);
            }}
            optionen={[
              { wert: GANZ, label: t.umfangGanz },
              { wert: KNOTEN, label: t.umfangKnoten },
            ]}
          />
        )}
        {e.bezug?.knotenIds == null ? null : (
          <KnotenWahl
            liste={knotenliste}
            gewaehlt={e.bezug.knotenIds}
            meldung={meldung('bezugKnoten').meldung}
            onAendern={knotenSetzen}
          />
        )}
        <fieldset>
          <legend>{t.beziehungen}</legend>
          {e.beziehungen.length === 0 ? <p>{t.keineBeziehungen}</p> : null}
          {e.beziehungen.map((b, i) => (
            <div className="bauzeit__beziehung" key={i}>
              <Auswahl
                label={t.vorgaenger(i + 1)}
                wert={b.vorgaengerId ?? undefined}
                onWertChange={(w) => {
                  beziehungAendern(i, { vorgaengerId: w as VorgangId });
                }}
                optionen={vorgaengerWahl}
              />
              <p className="tx-feld__meldung" role="status">
                {meldung(`beziehung-${String(i)}-vorgaenger`).meldung ?? ''}
              </p>
              <Auswahl
                label={t.art(i + 1)}
                wert={b.art}
                onWertChange={(w) => {
                  beziehungAendern(i, { art: w as Anordnungsart });
                }}
                optionen={ANORDNUNGSARTEN.map((a) => ({ wert: a, label: texte.anordnungsart[a] }))}
              />
              <Eingabefeld
                label={t.abstand(i + 1)}
                value={b.abstand}
                inputMode="numeric"
                onWertChange={(abstand) => {
                  beziehungAendern(i, { abstand });
                }}
                {...meldung(`beziehung-${String(i)}-abstand`)}
              />
              <Button
                onClick={() => {
                  setE({ ...e, beziehungen: e.beziehungen.filter((_, j) => j !== i) });
                }}
              >
                {t.beziehungEntfernen(i + 1)}
              </Button>
            </div>
          ))}
          <Button
            onClick={() => {
              setE({
                ...e,
                beziehungen: [...e.beziehungen, { vorgaengerId: null, art: 'ende-anfang', abstand: '0' }],
              });
            }}
          >
            {t.beziehungHinzufuegen}
          </Button>
        </fieldset>
        <fieldset>
          <legend>{t.ist}</legend>
          <div className="bauzeit__ist">
            <Eingabefeld
              label={t.istBeginn}
              value={e.istBeginn}
              onWertChange={(istBeginn) => {
                setE({ ...e, istBeginn });
              }}
              {...meldung('istBeginn')}
            />
            <Eingabefeld
              label={t.istEnde}
              value={e.istEnde}
              onWertChange={(istEnde) => {
                setE({ ...e, istEnde });
              }}
              {...meldung('istEnde')}
            />
            <Eingabefeld
              label={t.fortschritt}
              value={e.fortschritt}
              inputMode="decimal"
              onWertChange={(fortschritt) => {
                setE({ ...e, fortschritt });
              }}
              {...meldung('fortschritt')}
            />
          </div>
          {e.bezug === null ? null : e.bezug.art === 'leistungsverzeichnis' ? (
            <p className="bauzeit__vorschlag">{t.vorschlagNurAuftrag}</p>
          ) : vorschlag === undefined ? (
            <p className="bauzeit__vorschlag" aria-busy="true">
              {t.vorschlagLaedt}
            </p>
          ) : vorschlag === null ? (
            <p className="bauzeit__vorschlag">{t.keinVorschlag}</p>
          ) : (
            <p className="bauzeit__vorschlag">
              <span data-testid="fortschritt-vorschlag">{t.vorschlag(formatiereProzentDe(vorschlag))}</span>{' '}
              <Button
                groesse="sm"
                onClick={() => {
                  setE({ ...e, fortschritt: formatiereProzentDe(vorschlag) });
                }}
              >
                {t.vorschlagUebernehmen}
              </Button>
            </p>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
