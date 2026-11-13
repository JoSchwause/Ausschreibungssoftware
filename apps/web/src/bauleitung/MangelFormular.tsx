// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: das Formular „Neuer Mangel“ bzw. „Mangel bearbeiten“ (ein Dialog) und der Dialog einer Statusaktion. Beide
// lesen nur Text; Prüfung und Befehle stehen in `maengel.ts`. Ein Feldfehler sperrt nie die Eingabe (U5), er verhindert nur
// den Befehl; Enter im Feld übernimmt. Position und Bauteil werden aus dem Auftrags-LV bzw. dem Modell gewählt, nicht
// getippt (Ticket 155).

import { Auswahl, Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { BauwerksmodellId, BauwerksmodellUebersicht, Mangel } from '@tethys/vertrag';
import { useEffect, useId, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { datumDe } from '../lv/kopfdaten';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import {
  bauteilwahl,
  neuesterStand,
  type Auswahlwert,
  type Feldfehler,
  type MangelEntwurf,
  type Statusaktion,
  type StatusEntwurf,
  type Statusfehler,
} from './maengel';
import { Suchauswahl } from './Suchauswahl';
import { texte } from './texte';

const KEINE = '-';

type Bauteillage =
  | { readonly art: 'kein-modell' }
  | { readonly art: 'laedt' }
  | { readonly art: 'da'; readonly modell: string; readonly optionen: readonly Auswahlwert[] };

/**
 * Die Bauteile zur Auswahl: die des gewählten Modells, bei „in jedem Modellstand“ die des zuletzt eingelesenen Stands. Ein
 * gespeichertes Bauteil, das dort fehlt, bleibt als eigener Eintrag wählbar (nichts geht still verloren, Q5).
 */
function useBauteilwahl(modellId: string, modelle: readonly BauwerksmodellUebersicht[]): Bauteillage {
  const u = useUmgebung();
  const id = modellId === '' ? neuesterStand(modelle) : (modellId as BauwerksmodellId);
  const [lage, setLage] = useState<Bauteillage>({ art: 'laedt' });
  useEffect(() => {
    if (id === null) {
      setLage({ art: 'kein-modell' });
      return;
    }
    let aktiv = true;
    setLage({ art: 'laedt' });
    void u.speicher.bauwerksmodelle.laden(id).then((r) => {
      if (!aktiv) return;
      setLage(
        r.ok
          ? { art: 'da', modell: r.wert.bauwerksmodell.name, optionen: bauteilwahl(r.wert.bauwerksmodell) }
          : { art: 'kein-modell' },
      );
    });
    return () => {
      aktiv = false;
    };
  }, [u, id]);
  return lage;
}

export function MangelFormular({
  titel,
  start,
  auftraege,
  positionenVon,
  modelle,
  nummerFest,
  onSenden,
  onSchliessen,
}: {
  titel: string;
  start: MangelEntwurf;
  auftraege: readonly Auswahlwert[];
  /** Die Positionen eines Auftrags-LV als Auswahl (Kennung → OZ und Kurztext). */
  positionenVon: (auftragsLvId: string) => readonly Auswahlwert[];
  modelle: readonly BauwerksmodellUebersicht[];
  /** Nach dem Anlegen bleibt die Nummer fest (D-57). */
  nummerFest: boolean;
  /** Gibt die Feldfehler zurück; `null`: gespeichert, der Dialog schließt. */
  onSenden: (e: MangelEntwurf) => Promise<Feldfehler | null>;
  onSchliessen: () => void;
}): ReactElement {
  const formId = useId();
  const [e, setE] = useState(start);
  const [fehler, setFehler] = useState<Feldfehler>({});
  const feld = (name: keyof MangelEntwurf) => ({
    value: e[name],
    onWertChange: (w: string): void => {
      setE((alt) => ({ ...alt, [name]: w }));
    },
    ...(fehler[name] === undefined ? {} : { meldung: fehler[name] }),
  });
  const senden = async (ev: SyntheticEvent): Promise<void> => {
    ev.preventDefault();
    setFehler((await onSenden(e)) ?? {});
  };
  const f = texte.formular;
  const bauteile = useBauteilwahl(e.modellId, modelle);
  const bauteilOptionen =
    bauteile.art === 'da' && e.globalId !== '' && !bauteile.optionen.some((o) => o.wert === e.globalId)
      ? [...bauteile.optionen, { wert: e.globalId, label: f.bauteilNichtImModell(e.globalId) }]
      : bauteile.art === 'da'
        ? bauteile.optionen
        : e.globalId === ''
          ? []
          : [{ wert: e.globalId, label: f.bauteilNichtImModell(e.globalId) }];
  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={titel}
      fuss={
        <>
          <Button onClick={onSchliessen}>{f.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {f.speichern}
          </Button>
        </>
      }
    >
      <form id={formId} className="bauleitung__formular" onSubmit={(ev) => void senden(ev)}>
        <Eingabefeld label={f.nummer} disabled={nummerFest} {...feld('nummer')} />
        <Eingabefeld label={f.festgestellt} {...feld('festgestellt')} />
        <div className="bauleitung__breit">
          <Eingabefeld label={f.titel} {...feld('titel')} />
        </div>
        <div className="bauleitung__breit">
          <Eingabefeld label={f.beschreibung} {...feld('beschreibung')} />
        </div>
        <Eingabefeld label={f.ort} {...feld('ort')} />
        <Eingabefeld label={f.frist} {...feld('frist')} />
        <Auswahl
          label={f.auftrag}
          wert={e.auftragsLvId === '' ? KEINE : e.auftragsLvId}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, auftragsLvId: w === KEINE ? '' : w, positionId: '' }));
          }}
          optionen={[{ wert: KEINE, label: f.keinAuftrag }, ...auftraege]}
        />
        <Suchauswahl
          label={f.position}
          keine={f.keinePosition}
          optionen={e.auftragsLvId === '' ? [] : positionenVon(e.auftragsLvId)}
          wert={e.positionId}
          deaktiviert={e.auftragsLvId === ''}
          meldung={fehler.positionId}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, positionId: w }));
          }}
        />
        <Auswahl
          label={f.modell}
          wert={e.modellId === '' ? KEINE : e.modellId}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, modellId: w === KEINE ? '' : w }));
          }}
          optionen={[{ wert: KEINE, label: f.jedesModell }, ...modelle.map((m) => ({ wert: m.id, label: m.name }))]}
        />
        <Suchauswahl
          label={f.bauteil}
          keine={f.keinBauteil}
          optionen={bauteilOptionen}
          wert={e.globalId}
          deaktiviert={bauteile.art === 'laedt' || bauteilOptionen.length === 0}
          meldung={fehler.globalId}
          hinweis={
            bauteile.art === 'laedt'
              ? f.modellLaedt
              : bauteile.art === 'kein-modell'
                ? f.keinModell
                : e.modellId === ''
                  ? f.bauteilAusNeuestem(bauteile.modell)
                  : undefined
          }
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, globalId: w }));
          }}
        />
      </form>
    </Dialog>
  );
}

export function StatusDialog({
  aktion,
  mangel,
  start,
  onSenden,
  onSchliessen,
}: {
  aktion: Statusaktion;
  mangel: Mangel;
  start: StatusEntwurf;
  /** Gibt die Feldfehler zurück; `null`: übernommen, der Dialog schließt. */
  onSenden: (e: StatusEntwurf) => Promise<Statusfehler | null>;
  onSchliessen: () => void;
}): ReactElement {
  const formId = useId();
  const [e, setE] = useState(start);
  const [fehler, setFehler] = useState<Statusfehler>({});
  const a = texte.aktion;
  const feld = (name: keyof StatusEntwurf) => ({
    value: e[name],
    onWertChange: (w: string): void => {
      setE((alt) => ({ ...alt, [name]: w }));
    },
    ...(fehler[name] === undefined ? {} : { meldung: fehler[name] }),
  });
  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={a.titel[aktion]}
      beschreibung={`Mangel ${String(mangel.nummer)} – ${mangel.titel}`}
      fuss={
        <>
          <Button onClick={onSchliessen}>{a.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {a.uebernehmen}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="bauleitung__formular"
        onSubmit={(ev) => {
          ev.preventDefault();
          void onSenden(e).then((f) => {
            setFehler(f ?? {});
          });
        }}
      >
        <Eingabefeld label={a.datum} {...feld('datum')} />
        {aktion === 'anzeigen' ? <Eingabefeld label={a.frist} {...feld('frist')} /> : <span />}
        <div className="bauleitung__breit">
          <Eingabefeld label={a.bemerkung} {...feld('bemerkung')} />
        </div>
      </form>
    </Dialog>
  );
}

/** Vorbelegung der Statusaktion: heute, bei „anzeigen“ die bisherige Frist. */
export function statusStart(mangel: Mangel, aktion: Statusaktion, heute: string): StatusEntwurf {
  return {
    datum: datumDe(heute),
    frist: aktion === 'anzeigen' && mangel.frist !== null ? datumDe(mangel.frist) : '',
    bemerkung: '',
  };
}
