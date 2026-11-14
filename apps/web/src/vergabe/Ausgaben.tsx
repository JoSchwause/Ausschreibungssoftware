// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Preisspiegel-Seite (Ticket 149; E11, B-21, B-22): Preisspiegel als PDF (quer) und als Excel, Vergabevorschlag
// als PDF mit Begründung. Ein PDF entsteht zuerst als Vorschau im Dialog und wird erst dann heruntergeladen. Der Druck läuft
// im Web Worker (abbrechbar); Datum aus der Uhr der App, Büro aus den Einstellungen, Projekt mit Projektangaben (D-141.6).

import { Auswahl, Button, Dialog, useToast } from '@tethys/ui-basis';
import type { Preisspiegel } from '@tethys/vergabe';
import type { BieterId, Buero, LvZustand, Projekt } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { datumAusUhr } from '../ausgabe/logik';
import { texte as fehlerTexte } from '../fehler/texte';
import { useEinstellungen } from '../historie/EinstellungenAnbieter';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { PdfMitVorschau as PdfDialog } from '../ui/PdfMitVorschau';
import type { Spaltenwahl } from './ansicht';
import {
  dateinamePreisspiegelExcel,
  dateinamePreisspiegelPdf,
  dateinameVergabevorschlag,
  pdfImWorker,
  preisspiegelEingabe,
  vergabevorschlagEingabe,
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

/** Büro aus den Einstellungen des Geräts (wie der LV-Druck). */
function useBuero(): Buero | null {
  return useEinstellungen().zustand.buero;
}

/**
 * Dialog „PDF mit Vorschau“ (`ui/PdfMitVorschau.tsx`) mit dem Druck-Worker der Vergabe: Datum aus der Uhr der App, Büro aus
 * den Einstellungen. Auch die Berichte der Abrechnung drucken hierüber (D-98).
 */
export function PdfMitVorschau({
  auftrag,
  ...rest
}: {
  knopf: string;
  titel: string;
  dateiname: string;
  schluessel: string;
  auftrag: (datum: string, buero: Buero | null) => Druckauftrag;
  children?: ReactNode;
}): ReactElement {
  const u = useUmgebung();
  const buero = useBuero();
  return (
    <PdfDialog
      {...rest}
      heute={() => datumAusUhr(u.uhr())}
      drucken={(datum) => pdfImWorker(auftrag(datum, buero))}
    />
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
  const [fehler, setFehler] = useState(false);
  const buero = useBuero();
  const name = dateinamePreisspiegelExcel(stand.lv);

  useEffect(() => {
    if (!offen) return;
    let lebt = true;
    void import('@tethys/ausgabe')
      .then(({ preisspiegelAlsExcel }) => {
        if (!lebt) return;
        const datum = datumAusUhr(u.uhr());
        setBytes(preisspiegelAlsExcel(preisspiegelEingabe(druckstand(stand, datum, buero), wahl)));
      })
      .catch(() => {
        // Wellen-Review SB1: kein stilles Hängen und kein Rohtext, sondern ein Satz mit dem nächsten Schritt.
        if (lebt) setFehler(true);
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
          setFehler(false);
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
        {fehler ? (
          <p role="alert">
            <strong>{t.excelFehler}</strong> {fehlerTexte.pdf}
          </p>
        ) : bytes === null ? (
          <p aria-busy="true">…</p>
        ) : null}
      </Dialog>
    </>
  );
}
