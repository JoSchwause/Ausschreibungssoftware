// SPDX-License-Identifier: AGPL-3.0-or-later
// Positionsdialog (U4, Ticket 47): eine Position vollständig bearbeiten. Übernehmen schickt je geändertes Feld genau
// einen Befehl (`entwurfBefehle`); Abbrechen verwirft ohne Befehl. Ungültige Zahlen und Formfehler des Kerns bleiben am
// Feld markiert, die übrigen Felder werden trotzdem übernommen (U5); dann bleibt der Dialog offen. Basis und Betrag
// einer Zuschlagsposition kommen aus dem Kern (A5, N1), gerechnet auf einem gedachten Stand mit den Werten im Dialog.

import { ANTEILE, lvBefehlAusfuehren, lvChangeSetAnwenden, zuschlagsbasen } from '@tethys/kern';
import { Auswahl, Button, Dialog, Eingabefeld, LangtextEditor } from '@tethys/ui-basis';
import type { Bedarf, LvBefehl, LvZustand, Position, PositionId } from '@tethys/vertrag';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Ausgang } from './befehlsweg';
import {
  entwurfBefehle,
  entwurfVon,
  kernFehlerFeld,
  type Bezugsform,
  type Feldfehler,
  type Positionsentwurf,
  type UnterbeschreibungEntwurf,
} from './positionsentwurf';
import { texte } from './texte';
import { formatiereBetragDe } from './zahlen';

const t = texte.dialog;

const BEDARF: readonly { wert: Bedarf | null; label: string }[] = [
  { wert: null, label: texte.merkmale.keinBedarf },
  { wert: 'ohne-gesamtbetrag', label: texte.merkmale.bedarfOhne },
  { wert: 'mit-gesamtbetrag', label: texte.merkmale.bedarfMit },
];
const BEZUGSFORMEN: readonly Bezugsform[] = ['positionen', 'gliederung', 'kennzeichnung'];
const KEINE_GRUNDPOSITION = '-';

/** Felder des Entwurfs, die als Text eingegeben werden. */
type Textfeld = {
  [K in keyof Positionsentwurf]: Positionsentwurf[K] extends string ? K : never;
}[keyof Positionsentwurf];
const MAX_TREFFER = 8;

const positionsname = (p: Position): string => [p.ordnungszahl, p.kurztext].filter(Boolean).join(' ');

/** Basis und Betrag aus dem Kern für den Stand nach den Befehlen des Entwurfs (ohne zu speichern). */
function zuschlagsvorschau(
  zustand: LvZustand,
  positionId: PositionId,
  befehle: readonly LvBefehl[],
): { basis: string; betrag: string | null } | null {
  let z = zustand;
  for (const b of befehle) {
    const r = lvBefehlAusfuehren(z, b);
    if (r.ok) z = lvChangeSetAnwenden(z, r.wert) ?? z;
  }
  const lv = z.leistungsverzeichnis;
  const zb = zuschlagsbasen(lv).get(positionId);
  return zb ? { basis: zb.basis, betrag: zb.betrag } : null;
}

export interface PositionsDialogProps {
  zustand: LvZustand;
  /** Offen, solange eine Position gewählt ist. */
  positionId: PositionId | null;
  onSchliessen: () => void;
  /** Ein Befehl durch Kern und Speicher; die Folge des Übernehmens läuft nacheinander. */
  befehl: (b: LvBefehl) => Promise<Ausgang<unknown>>;
  /** Abweisung durch den Speicher (nicht am Feld darstellbar): Meldung wie überall in der App. */
  speicherAbweisung: (a: Ausgang<unknown>) => void;
}

export function PositionsDialog(props: PositionsDialogProps): ReactElement {
  const { zustand, positionId } = props;
  const knoten = zustand.leistungsverzeichnis.knoten;
  const position = useMemo(() => {
    const k = positionId === null ? undefined : knoten.find((x) => x.id === positionId);
    return k?.art === 'position' ? k : null;
  }, [knoten, positionId]);
  const offen = position !== null;
  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) props.onSchliessen();
      }}
      titel={position ? `${t.titel}: ${positionsname(position)}` : t.titel}
    >
      {position ? <Inhalt key={position.id} {...props} position={position} /> : null}
    </Dialog>
  );
}

function Inhalt(props: PositionsDialogProps & { position: Position }): ReactElement {
  const { zustand, position, onSchliessen, befehl, speicherAbweisung } = props;
  const formId = useId();
  const [e, setE] = useState<Positionsentwurf>(() => entwurfVon(position));
  /** Immer der neueste Entwurf: der Langtext-Editor meldet beim Verlassen, kurz vor dem Klick auf Übernehmen. */
  const aktuell = useRef(e);
  aktuell.current = e;
  const [kernfehler, setKernfehler] = useState<Feldfehler>({});
  const [laeuft, setLaeuft] = useState(false);
  const [gesendet, setGesendet] = useState(false);

  const setze = <K extends keyof Positionsentwurf>(feld: K, wert: Positionsentwurf[K]): void => {
    setE((alt) => {
      const neu = { ...alt, [feld]: wert };
      aktuell.current = neu;
      return neu;
    });
  };

  const { befehle, fehler: eingabefehler } = useMemo(() => entwurfBefehle(position, e), [position, e]);
  const fehler: Feldfehler = { ...kernfehler, ...eingabefehler };
  const vorschau = useMemo(
    () => (e.zuschlag ? zuschlagsvorschau(zustand, position.id, befehle) : null),
    [e.zuschlag, zustand, position.id, befehle],
  );

  const positionen = useMemo(
    () => zustand.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position'),
    [zustand.leistungsverzeichnis.knoten],
  );
  const nachId = useMemo(() => new Map(positionen.map((p) => [p.id, p])), [positionen]);

  const uebernehmen = async (): Promise<void> => {
    if (laeuft) return;
    setLaeuft(true);
    const r = entwurfBefehle(position, aktuell.current);
    const neu: Record<string, string> = {};
    for (const b of r.befehle) {
      const a = await befehl(b);
      if (a.ok) continue;
      if (a.abweisung.art === 'befehl') {
        const feld = kernFehlerFeld(a.abweisung.fehler.feld);
        neu[feld] = t.kernfehler[feld] ?? texte.befehlsfehler[a.abweisung.fehler.code];
      } else speicherAbweisung(a);
    }
    setKernfehler(neu);
    setLaeuft(false);
    setGesendet(true);
    if (Object.keys(neu).length === 0 && Object.keys(r.fehler).length === 0) onSchliessen();
  };

  const feld = (name: Textfeld, label: string, zahl = false): ReactElement => (
    <Eingabefeld
      kompakt
      label={label}
      value={e[name]}
      onWertChange={(w) => {
        setze(name, w);
      }}
      {...(zahl ? { inputMode: 'decimal' as const, className: 'tx-eingabe--zahl' } : {})}
      {...(fehler[name] ? { meldung: fehler[name] } : {})}
    />
  );
  const schalter = (
    name: 'wahl' | 'stundenlohn' | 'pauschal' | 'zuschlagskennzeichen' | 'zuschlag' | 'leitbeschreibung',
    label: string,
  ): ReactElement => (
    <label className="lv__option">
      <input
        type="checkbox"
        checked={e[name]}
        onChange={(x) => {
          setze(name, x.target.checked);
        }}
      />
      {label}
    </label>
  );

  return (
    <form
      id={formId}
      className="lv-dialog"
      onSubmit={(x) => {
        x.preventDefault();
        void uebernehmen();
      }}
    >
      <div className="lv-dialog__spalten">
        <div className="lv-dialog__spalte">
          <Bereich titel={t.texte}>
            <div className="lv-dialog__zeile">
              {feld('ordnungszahl', t.ordnungszahl)}
              {feld('kurztext', t.kurztext)}
            </div>
            <div className="lv-dialog__langtext">
              <span className="tx-feld__label">{t.langtext}</span>
              <LangtextEditor
                wert={e.langtext}
                beschriftung={t.langtext}
                onBestaetigen={(l) => {
                  setze('langtext', l);
                }}
              />
            </div>
          </Bereich>
          <Bereich titel={t.mengeUndPreis}>
            <div className="lv-dialog__zeile">
              {feld('menge', t.menge, true)}
              {feld('einheit', t.einheit)}
              {feld('einheitspreis', t.einheitspreis, true)}
            </div>
          </Bereich>
          <Bereich titel={t.epa} meldung={fehler['epa']}>
            <p className="lv-dialog__hinweis">{t.epaHinweis}</p>
            <div className="lv-dialog__raster">
              {ANTEILE.map((a) => (
                <Eingabefeld
                  key={a}
                  kompakt
                  label={t.anteile[a]}
                  value={e.epa[a]}
                  inputMode="decimal"
                  className="tx-eingabe--zahl"
                  onWertChange={(w) => {
                    setze('epa', { ...aktuell.current.epa, [a]: w });
                  }}
                  {...(fehler[`epa.${a}`] ? { meldung: fehler[`epa.${a}`] } : {})}
                />
              ))}
            </div>
            {feld('freiBezeichnung', t.freiBezeichnung)}
          </Bereich>
        </div>
        <div className="lv-dialog__spalte">
          <Bereich titel={t.merkmale} meldung={fehler['merkmale']}>
            <fieldset className="lv-dialog__gruppe">
              <legend>{texte.merkmale.bedarf}</legend>
              {BEDARF.map((b) => (
                <label key={b.label} className="lv__option">
                  <input
                    type="radio"
                    name={`${formId}-bedarf`}
                    checked={e.bedarf === b.wert}
                    onChange={() => {
                      setze('bedarf', b.wert);
                    }}
                  />
                  {b.label}
                </label>
              ))}
            </fieldset>
            {schalter('stundenlohn', texte.merkmale.stundenlohn)}
            {schalter('pauschal', texte.merkmale.pauschal)}
            {schalter('zuschlagskennzeichen', t.zuschlagskennzeichen)}
            {schalter('wahl', texte.merkmale.wahl)}
            {e.wahl ? (
              <div className="lv-dialog__zeile">
                {feld('wahlGruppe', t.wahlGruppe)}
                {feld('wahlVariante', t.wahlVariante)}
                <Auswahl
                  kompakt
                  label={t.grundposition}
                  wert={e.grundpositionId ?? KEINE_GRUNDPOSITION}
                  optionen={[
                    { wert: KEINE_GRUNDPOSITION, label: t.keineGrundposition },
                    ...positionen
                      .filter((p) => p.id !== position.id)
                      .map((p) => ({ wert: p.id, label: positionsname(p) || p.id })),
                  ]}
                  onWertChange={(w) => {
                    setze('grundpositionId', w === KEINE_GRUNDPOSITION ? null : (w as PositionId));
                  }}
                />
              </div>
            ) : null}
          </Bereich>
          <Bereich titel={t.zuschlag} meldung={fehler['zuschlag']}>
            {schalter('zuschlag', t.zuschlagsposition)}
            {e.zuschlag ? (
              <>
                {feld('zuschlagssatz', t.zuschlagssatz, true)}
                <fieldset className="lv-dialog__gruppe">
                  <legend>{t.bezugsform}</legend>
                  {BEZUGSFORMEN.map((f) => (
                    <label key={f} className="lv__option">
                      <input
                        type="radio"
                        name={`${formId}-bezug`}
                        checked={e.bezugsform === f}
                        onChange={() => {
                          setze('bezugsform', f);
                        }}
                      />
                      {t.bezugsformen[f]}
                    </label>
                  ))}
                </fieldset>
                {e.bezugsform === 'positionen' ? (
                  <Bezugsliste
                    entwurf={e}
                    fehler={fehler}
                    positionen={positionen}
                    nachId={nachId}
                    selbst={position.id}
                    onChange={(liste) => {
                      setze('bezugspositionen', liste);
                    }}
                  />
                ) : null}
                <dl className="lv-dialog__vorschau" aria-label={t.ausDemKern}>
                  <dt>{t.basis}</dt>
                  <dd data-wert="basis">{vorschau ? formatiereBetragDe(vorschau.basis as never) : '–'}</dd>
                  <dt>{t.betrag}</dt>
                  <dd data-wert="betrag">
                    {vorschau?.betrag ? formatiereBetragDe(vorschau.betrag as never) : '–'}
                  </dd>
                </dl>
              </>
            ) : null}
          </Bereich>
          <Bereich titel={t.leitbeschreibung} meldung={fehler['leitbeschreibung']}>
            {schalter('leitbeschreibung', t.istLeitbeschreibung)}
            {e.leitbeschreibung ? (
              <Unterbeschreibungen
                liste={e.unterbeschreibungen}
                fehler={fehler}
                onChange={(liste) => {
                  setze('unterbeschreibungen', liste);
                }}
              />
            ) : null}
          </Bereich>
        </div>
      </div>
      <p className="lv__meldung" role="status">
        {gesendet && Object.keys(fehler).length > 0 ? t.nichtUebernommen : ''}
        {fehler['allgemein'] ?? ''}
      </p>
      <footer className="tx-dialog__fuss">
        <Button onClick={onSchliessen}>{t.abbrechen}</Button>
        <Button type="submit" variante="primaer" disabled={laeuft}>
          {t.uebernehmen}
        </Button>
      </footer>
    </form>
  );
}

function Bereich(props: { titel: string; meldung?: string | undefined; children: ReactNode }): ReactElement {
  return (
    <fieldset className="lv-dialog__bereich">
      <legend>{props.titel}</legend>
      {props.children}
      {props.meldung ? (
        <p className="lv__meldung" role="alert">
          {props.meldung}
        </p>
      ) : null}
    </fieldset>
  );
}

function Bezugsliste(props: {
  entwurf: Positionsentwurf;
  fehler: Feldfehler;
  positionen: readonly Position[];
  nachId: ReadonlyMap<string, Position>;
  selbst: PositionId;
  onChange: (liste: Positionsentwurf['bezugspositionen']) => void;
}): ReactElement {
  const { entwurf, fehler, positionen, nachId, selbst, onChange } = props;
  const [suche, setSuche] = useState('');
  const liste = entwurf.bezugspositionen;
  const treffer = useMemo(() => {
    const s = suche.trim().toLocaleLowerCase('de');
    if (s === '') return [];
    const gewaehlt = new Set(liste.map((b) => b.positionId));
    return positionen
      .filter((p) => p.id !== selbst && !gewaehlt.has(p.id))
      .filter(
        (p) =>
          (p.ordnungszahl ?? '').toLocaleLowerCase('de').includes(s) ||
          p.kurztext.toLocaleLowerCase('de').includes(s),
      )
      .slice(0, MAX_TREFFER);
  }, [suche, positionen, liste, selbst]);

  return (
    <div className="lv-dialog__bezug">
      <span className="tx-feld__label">{texte.dialog.bezugspositionen}</span>
      {fehler['bezug'] ? <p className="lv__meldung">{fehler['bezug']}</p> : null}
      <ul className="lv-dialog__liste">
        {liste.map((b, i) => (
          <li key={b.positionId}>
            <span className="lv-dialog__name">
              {nachId.get(b.positionId) ? positionsname(nachId.get(b.positionId) as Position) : b.positionId}
            </span>
            <Eingabefeld
              kompakt
              label={`${texte.dialog.teilmenge} ${String(i + 1)}`}
              value={b.teilmenge}
              inputMode="decimal"
              className="tx-eingabe--zahl"
              onWertChange={(w) => {
                onChange(liste.map((x, j) => (j === i ? { ...x, teilmenge: w } : x)));
              }}
              {...(fehler[`bezug.${String(i)}.teilmenge`]
                ? { meldung: fehler[`bezug.${String(i)}.teilmenge`] }
                : {})}
            />
            <Button
              groesse="sm"
              variante="schlicht"
              onClick={() => {
                onChange(liste.filter((_, j) => j !== i));
              }}
            >
              {texte.dialog.bezugEntfernen}
            </Button>
          </li>
        ))}
      </ul>
      <Eingabefeld kompakt label={texte.dialog.bezugSuchen} value={suche} onWertChange={setSuche} />
      {suche.trim() !== '' ? (
        <ul className="lv-dialog__treffer" aria-label={texte.dialog.bezugSuchen}>
          {treffer.length === 0 ? <li>{texte.dialog.keineTreffer}</li> : null}
          {treffer.map((p) => (
            <li key={p.id}>
              <Button
                groesse="sm"
                onClick={() => {
                  onChange([...liste, { positionId: p.id, teilmenge: '' }]);
                  setSuche('');
                }}
              >
                {texte.dialog.bezugHinzufuegen}: {positionsname(p)}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Unterbeschreibungen(props: {
  liste: readonly UnterbeschreibungEntwurf[];
  fehler: Feldfehler;
  onChange: (liste: readonly UnterbeschreibungEntwurf[]) => void;
}): ReactElement {
  const { liste, fehler, onChange } = props;
  // Die Liste ändert sich auch aus dem Langtext-Editor heraus (beim Verlassen): immer auf dem neuesten Stand ändern.
  const aktuell = useRef(liste);
  useEffect(() => {
    aktuell.current = liste;
  }, [liste]);
  const aendere = (i: number, x: Partial<UnterbeschreibungEntwurf>): void => {
    const neu = aktuell.current.map((u, j) => (j === i ? { ...u, ...x } : u));
    aktuell.current = neu;
    onChange(neu);
  };
  return (
    <div className="lv-dialog__unter">
      {liste.map((u, i) => {
        const n = `${texte.dialog.unterbeschreibung} ${String(i + 1)}`;
        return (
          <fieldset key={i} className="lv-dialog__gruppe">
            <legend>{n}</legend>
            <div className="lv-dialog__zeile">
              <Eingabefeld
                kompakt
                label={`${n}: ${texte.dialog.unterNummer}`}
                value={u.nummer}
                onWertChange={(w) => {
                  aendere(i, { nummer: w });
                }}
              />
              <Eingabefeld
                kompakt
                label={`${n}: ${texte.dialog.kurztext}`}
                value={u.kurztext}
                onWertChange={(w) => {
                  aendere(i, { kurztext: w });
                }}
              />
            </div>
            <LangtextEditor
              wert={u.langtext}
              beschriftung={`${n}: ${texte.dialog.langtext}`}
              onBestaetigen={(l) => {
                aendere(i, { langtext: l });
              }}
            />
            <div className="lv-dialog__zeile">
              <Eingabefeld
                kompakt
                label={`${n}: ${texte.dialog.menge}`}
                value={u.menge}
                inputMode="decimal"
                className="tx-eingabe--zahl"
                onWertChange={(w) => {
                  aendere(i, { menge: w });
                }}
                {...(fehler[`unter.${String(i)}.menge`]
                  ? { meldung: fehler[`unter.${String(i)}.menge`] }
                  : {})}
              />
              <Eingabefeld
                kompakt
                label={`${n}: ${texte.dialog.einheit}`}
                value={u.einheit}
                onWertChange={(w) => {
                  aendere(i, { einheit: w });
                }}
              />
            </div>
            <Button
              groesse="sm"
              variante="schlicht"
              onClick={() => {
                onChange(aktuell.current.filter((_, j) => j !== i));
              }}
            >
              {texte.dialog.unterEntfernen}
            </Button>
          </fieldset>
        );
      })}
      <Button
        groesse="sm"
        onClick={() => {
          onChange([
            ...aktuell.current,
            {
              nummer: String(aktuell.current.length + 1).padStart(2, '0'),
              kurztext: '',
              langtext: [],
              menge: '',
              einheit: '',
            },
          ]);
        }}
      >
        {texte.dialog.unterHinzufuegen}
      </Button>
    </div>
  );
}
