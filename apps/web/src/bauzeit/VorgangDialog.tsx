// SPDX-License-Identifier: AGPL-3.0-or-later
// Formular eines Vorgangs (Ticket 118): Bezeichnung, Nummer, Sammelvorgang, Dauer, Terminvorgabe, Anordnungsbeziehungen mit
// Art und Abstand, Bezug auf ein LV, Ist-Termine und Fortschritt. Ein Vorgänger wird aus dem Plan gewählt, nie getippt
// (D-64). Fehler stehen am Feld, der Entwurf bleibt (U5). Speichern ist ein `VorgangSetzen` (ein Undo-Schritt).

import { Auswahl, Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { Anordnungsart, Bauzeitenplan, ProjektId, VorgangId, Vorgangsbezug } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { teilbaum, type Feldfehler, type Vorgangsentwurf } from './befehle';
import { vorgangName } from './ansicht';
import { ANORDNUNGSARTEN, texte } from './texte';

const OBEN = 'oben';
const KEIN = 'kein';
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
    ...lvWahl.map((w) =>
      e.bezug !== null && w.wert === bezugSchluessel(e.bezug) && e.bezug.knotenIds !== null
        ? { wert: w.wert, label: `${w.label} (${t.bezugTeil})` }
        : { wert: w.wert, label: w.label },
    ),
  ];

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
        </fieldset>
      </form>
    </Dialog>
  );
}
