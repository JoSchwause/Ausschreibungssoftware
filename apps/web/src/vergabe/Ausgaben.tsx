// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Preisspiegel-Seite (Ticket 149; E11, B-21, B-22): Preisspiegel als PDF (quer) und als Excel, Vergabevorschlag
// als PDF mit Begründung. Ein PDF entsteht zuerst als Vorschau im Dialog und wird erst dann heruntergeladen. Der Druck läuft
// im Web Worker (abbrechbar); Datum aus der Uhr der App, Büro aus den Einstellungen, Projekt mit Projektangaben (D-141.6).

import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { Preisspiegel } from '@tethys/vergabe';
import type { BieterId, Buero, LvZustand, Projekt } from '@tethys/vertrag';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { datumAusUhr } from '../ausgabe/logik';
import { useEinstellungen } from '../historie/EinstellungenAnbieter';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import type { Spaltenwahl } from './ansicht';
import {
  dateinamePreisspiegelExcel,
  dateinamePreisspiegelPdf,
  dateinameVergabevorschlag,
  pdfImWorker,
  preisspiegelEingabe,
  vergabevorschlagEingabe,
  type Drucklauf,
  type Druckstand,
} from './druck';
import type { Druckauftrag } from './druck-worker';
import { texte } from './texte';

const t = texte.ausgabe;
const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface AusgabeStand {
  readonly lv: LvZustand;
  readonly projekt: Projekt;
  readonly preisspiegel: Preisspiegel;
}

type Lage =
  | { readonly art: 'bereit' }
  | { readonly art: 'laeuft' }
  | { readonly art: 'fehler'; readonly meldung: string }
  | { readonly art: 'vorschau'; readonly bytes: Uint8Array; readonly url: string };

/** Büro aus den Einstellungen des Geräts (wie der LV-Druck). */
function useBuero(): Buero | null {
  return useEinstellungen().zustand.buero;
}

/**
 * Dialog „PDF mit Vorschau“: Datum (und was der Aufrufer dazugibt), „Vorschau erzeugen“ zeigt das PDF im Dialog,
 * „Herunterladen“ speichert genau diese Bytes. Ändert sich eine Eingabe (`schluessel`), gilt die Vorschau nicht mehr.
 */
export function PdfMitVorschau({
  knopf,
  titel,
  dateiname,
  schluessel,
  auftrag,
  children,
}: {
  knopf: string;
  titel: string;
  dateiname: string;
  schluessel: string;
  auftrag: (datum: string, buero: Buero | null) => Druckauftrag;
  children?: ReactNode;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [datum, setDatum] = useState('');
  const [lage, setLage] = useState<Lage>({ art: 'bereit' });
  const lauf = useRef<Drucklauf | null>(null);
  const buero = useBuero();
  const gelesen = datumLesen(datum);

  const verwerfen = (): void => {
    lauf.current?.abbrechen();
    lauf.current = null;
    setLage((l) => {
      if (l.art === 'vorschau') URL.revokeObjectURL(l.url);
      return { art: 'bereit' };
    });
  };
  // Neue Eingaben: die Vorschau zeigt nicht mehr, was heruntergeladen würde.
  useEffect(verwerfen, [schluessel, datum]);
  useEffect(() => verwerfen, []);

  const schliessen = (): void => {
    verwerfen();
    setOffen(false);
  };

  const erzeugen = async (): Promise<void> => {
    if (!gelesen.ok) return;
    verwerfen();
    setLage({ art: 'laeuft' });
    const neu = pdfImWorker(auftrag(gelesen.wert, buero));
    lauf.current = neu;
    try {
      const bytes = await neu.ergebnis;
      if (lauf.current !== neu) return;
      lauf.current = null;
      if (bytes === null) {
        setLage({ art: 'bereit' });
        return;
      }
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      setLage({ art: 'vorschau', bytes, url });
    } catch (e) {
      if (lauf.current !== neu) return;
      lauf.current = null;
      setLage({ art: 'fehler', meldung: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setDatum(datumDe(datumAusUhr(u.uhr())));
          setLage({ art: 'bereit' });
          setOffen(true);
        }}
      >
        {knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={titel}
        fuss={
          <>
            <Button onClick={schliessen}>{lage.art === 'laeuft' ? t.abbrechen : t.schliessen}</Button>
            <Button disabled={lage.art === 'laeuft' || !gelesen.ok} onClick={() => void erzeugen()}>
              {t.vorschauErzeugen}
            </Button>
            <Button
              variante="primaer"
              disabled={lage.art !== 'vorschau'}
              onClick={() => {
                if (lage.art !== 'vorschau') return;
                herunterladenBytes(dateiname, lage.bytes, 'application/pdf');
                zeige({ titel: t.gespeichert, beschreibung: dateiname, art: 'erfolg' });
                schliessen();
              }}
            >
              {t.herunterladen}
            </Button>
          </>
        }
      >
        <div className="vergabe__formular">
          <Eingabefeld
            label={t.datum}
            value={datum}
            onWertChange={setDatum}
            {...(gelesen.ok ? {} : { meldung: t.datumFehler })}
          />
          {children}
        </div>
        <p>
          {t.dateiname}: <code data-testid="pdf-dateiname">{dateiname}</code>
        </p>
        {lage.art === 'laeuft' ? (
          <p role="status" aria-busy="true">
            {t.laeuft}
          </p>
        ) : null}
        {lage.art === 'fehler' ? (
          <p className="gaeb__entwurf" role="alert">
            <strong>{t.fehler}</strong> {lage.meldung}
          </p>
        ) : null}
        {lage.art === 'vorschau' ? (
          <iframe className="vergabe__vorschau" title={t.vorschau} src={lage.url} />
        ) : null}
      </Dialog>
    </>
  );
}

const druckstand = (s: AusgabeStand, datum: string, buero: Buero | null): Druckstand => ({
  ...s,
  datum,
  buero,
});

/** Preisspiegel als PDF (quer), Spalten wie am Bildschirm. */
export function PreisspiegelPdf({ stand, wahl }: { stand: AusgabeStand; wahl: Spaltenwahl }): ReactElement {
  return (
    <PdfMitVorschau
      knopf={t.pdfKnopf}
      titel={t.pdfTitel}
      dateiname={dateinamePreisspiegelPdf(stand.lv)}
      schluessel={`${String(wahl.schaetzpreis)}${String(wahl.virtuell)}`}
      auftrag={(datum, buero) => ({
        art: 'preisspiegel',
        eingabe: preisspiegelEingabe(druckstand(stand, datum, buero), wahl),
      })}
    >
      <p>{t.spalten}</p>
    </PdfMitVorschau>
  );
}

/** Vergabevorschlag: vorgeschlagener Bieter (Vorgabe: Rang 1) und freier Begründungstext. */
export function Vergabevorschlag({ stand }: { stand: AusgabeStand }): ReactElement {
  const erster = [...stand.preisspiegel.bietersummen].sort((a, b) => a.rang - b.rang)[0]?.bieterId ?? null;
  const [bieter, setBieter] = useState<BieterId | null>(erster);
  const [begruendung, setBegruendung] = useState('');
  const KEINER = '';
  const optionen = [
    { wert: KEINER, label: t.keiner },
    ...stand.preisspiegel.bietersummen
      .map((s) => stand.projekt.bieter.find((b) => b.id === s.bieterId))
      .filter((b) => b !== undefined)
      .map((b) => ({ wert: b.id, label: b.name })),
  ];
  return (
    <PdfMitVorschau
      knopf={t.vorschlagKnopf}
      titel={t.vorschlagTitel}
      dateiname={dateinameVergabevorschlag(stand.lv)}
      schluessel={`${bieter ?? ''}\u0000${begruendung}`}
      auftrag={(datum, buero) => ({
        art: 'vergabevorschlag',
        eingabe: vergabevorschlagEingabe(druckstand(stand, datum, buero), bieter, begruendung),
      })}
    >
      <Auswahl
        label={t.vorgeschlagen}
        optionen={optionen}
        wert={bieter ?? KEINER}
        onWertChange={(w) => {
          setBieter(w === KEINER ? null : (w as BieterId));
        }}
      />
      <label className="vergabe__begruendung">
        <span>{t.begruendung}</span>
        <textarea
          rows={6}
          value={begruendung}
          aria-describedby="vergabe-begruendung-hinweis"
          onChange={(e) => {
            setBegruendung(e.target.value);
          }}
        />
        <small id="vergabe-begruendung-hinweis">{t.begruendungHinweis}</small>
      </label>
    </PdfMitVorschau>
  );
}

/** Preisspiegel als Excel: die Datei entsteht beim Öffnen; alle Bieter nebeneinander. */
export function PreisspiegelExcel({ stand, wahl }: { stand: AusgabeStand; wahl: Spaltenwahl }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const buero = useBuero();
  const name = dateinamePreisspiegelExcel(stand.lv);

  useEffect(() => {
    if (!offen) return;
    let lebt = true;
    void import('@tethys/ausgabe').then(({ preisspiegelAlsExcel }) => {
      if (!lebt) return;
      const datum = datumAusUhr(u.uhr());
      setBytes(preisspiegelAlsExcel(preisspiegelEingabe(druckstand(stand, datum, buero), wahl)));
    });
    return () => {
      lebt = false;
    };
  }, [offen, stand, wahl, buero, u]);

  return (
    <>
      <Button
        onClick={() => {
          setBytes(null);
          setOffen(true);
        }}
      >
        {t.excelKnopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={t.excelTitel}
        beschreibung={t.excelHinweis}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {t.schliessen}
            </Button>
            <Button
              variante="primaer"
              disabled={bytes === null}
              onClick={() => {
                if (bytes === null) return;
                herunterladenBytes(name, bytes, EXCEL);
                zeige({ titel: t.gespeichert, beschreibung: name, art: 'erfolg' });
                setOffen(false);
              }}
            >
              {t.herunterladen}
            </Button>
          </>
        }
      >
        <p>
          {t.dateiname}: <code data-testid="excel-dateiname">{name}</code>
        </p>
        <p>{t.spalten}</p>
        {bytes === null ? <p aria-busy="true">…</p> : null}
      </Dialog>
    </>
  );
}
