// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/kosten/<kid>` (Ticket 89, C3): eine Kostenermittlung. Die Kostengruppen stehen im gemeinsamen
// Vergleichsgrid (U2) mit Summen je Gruppe und gesamt (`kostenermittlungBerechnen`); Einträge setzt und entfernt ein
// Formular (jede Änderung ein Befehl, ein Undo-Schritt). Die Bezeichnungen aus der CSV des Nutzers sind eine Einstellung
// dieses Geräts, nicht Teil der Projektdatei (G-16). Hinweise zur Ermittlung blockieren nie (U5).

import { kostenermittlungBerechnen } from '@tethys/kosten';
import { Auswahl, Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import { VergleichsGrid } from '@tethys/ui-grid';
import type {
  KostenermittlungId,
  KostenermittlungZustand,
  Kostenermittlungsstufe,
  ProjektId,
} from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { ermittlungAnsicht } from './ansicht';
import { bezeichnungenAusCsv, bezeichnungenGemerkt, bezeichnungenMerken } from './bezeichnungen';
import { eintragEntfernenBefehl, eintragSetzenBefehl, kopfBefehl, type Feld } from './befehle';
import { kontrollePfad, kostenPfad } from './pfad';
import { kostenermittlungSitzung } from './schreiben';
import { STUFEN, texte } from './texte';
import { Verweis } from '../ui/Verweis';
import { HonorarVerweise } from '../honorar/HonorarVerweise'; // Ticket 155: Verweis zum Honorar
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import './kosten.css';

const t = texte.editor;

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; zustand: KostenermittlungZustand };

export function KostenermittlungSeite({
  projektId,
  id,
  gehe,
}: {
  projektId: ProjektId;
  id: KostenermittlungId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void u.speicher.kostenermittlungen.laden(id).then((r) => {
      if (aktiv) setLage(r.ok ? { art: 'da', zustand: r.wert } : { art: 'fehlt' });
    });
    return () => {
      aktiv = false;
    };
  }, [u, id, lauf]);
  // Undo und Redo können sie ändern oder entfernen: neu laden.
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.seite.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{t.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={kostenPfad(projektId)} text={t.zurueck} gehe={gehe} />
        </div>
      </div>
    );
  }
  return (
    <Editor
      zustand={lage.zustand}
      gehe={gehe}
      neuLaden={() => {
        setLauf((n) => n + 1);
      }}
    />
  );
}

function Editor({
  zustand,
  gehe,
  neuLaden,
}: {
  zustand: KostenermittlungZustand;
  gehe: (pfad: string) => void;
  neuLaden: () => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const k = zustand.kostenermittlung;
  const sitzung = useMemo(() => kostenermittlungSitzung(u, k.projektId, zustand), [u, k.projektId, zustand]);

  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [csv, setCsv] = useState<string | null>(() => bezeichnungenGemerkt());
  const [csvMeldung, setCsvMeldung] = useState<string | null>(null);
  const bezeichnungen = useMemo(() => bezeichnungenAusCsv(csv), [csv]);

  const ergebnis = useMemo(() => kostenermittlungBerechnen(k.eintraege), [k.eintraege]);
  const bemerkungen = useMemo(
    () =>
      new Map(
        k.eintraege.flatMap((e) => (e.bemerkung === undefined ? [] : [[e.nummer, e.bemerkung] as const])),
      ),
    [k.eintraege],
  );
  const ansicht = useMemo(
    () => ermittlungAnsicht(ergebnis, bezeichnungen, bemerkungen, zugeklappt),
    [ergebnis, bezeichnungen, bemerkungen, zugeklappt],
  );

  // Eintrag
  const [nummer, setNummer] = useState('');
  const [betrag, setBetrag] = useState('');
  const [bemerkung, setBemerkung] = useState('');
  const [fehler, setFehler] = useState<{ feld: Feld; meldung: string } | null>(null);
  // Kopf
  const [name, setName] = useState(k.name);
  const [stufe, setStufe] = useState<Kostenermittlungsstufe>(k.stufe);
  useEffect(() => {
    setName(k.name);
    setStufe(k.stufe);
  }, [k.name, k.stufe]);
  const [loeschen, setLoeschen] = useState(false);

  const setzen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    const b = eintragSetzenBefehl(nummer, betrag, bemerkung);
    if (!b.ok) {
      setFehler(b.fehler);
      return;
    }
    setFehler(null);
    const a = await sitzung.befehl(b.wert);
    if (!pruefe(a)) return;
    setNummer('');
    setBetrag('');
    setBemerkung('');
    neuLaden();
  };

  const entfernen = async (): Promise<void> => {
    const b = eintragEntfernenBefehl(nummer);
    if (!b.ok) {
      setFehler(b.fehler);
      return;
    }
    if (!k.eintraege.some((x) => x.nummer === b.wert.nummer)) {
      setFehler({ feld: 'nummer', meldung: t.entfernenFehlt });
      return;
    }
    setFehler(null);
    const a = await sitzung.befehl(b.wert);
    if (!pruefe(a)) return;
    setNummer('');
    setBetrag('');
    setBemerkung('');
    neuLaden();
  };

  const kopfSpeichern = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (name.trim() === '') return;
    if (name.trim() === k.name && stufe === k.stufe) return;
    const a = await sitzung.befehl(kopfBefehl(name, stufe));
    if (pruefe(a)) neuLaden();
  };

  const loeschenBestaetigt = async (): Promise<void> => {
    setLoeschen(false);
    const a = await sitzung.befehl({ art: 'KostenermittlungLoeschen' });
    if (pruefe(a)) gehe(kostenPfad(k.projektId));
  };

  const csvWaehlen = useCallback(async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const datei = e.target.files?.[0];
    e.target.value = '';
    if (datei === undefined) return;
    try {
      const text = await datei.text();
      setCsv(text);
      bezeichnungenMerken(text);
      setCsvMeldung(null);
    } catch {
      setCsvMeldung(t.csvFehler);
    }
  }, []);

  const csvEntfernen = (): void => {
    setCsv(null);
    bezeichnungenMerken(null);
    setCsvMeldung(null);
  };

  return (
    <div className="seite lv kosten">
      <div className="lv__kopf">
        <h1>{texte.editor.titel(k.name)}</h1>
        <Verweis pfad={kostenPfad(k.projektId)} text={t.zurueck} gehe={gehe} />
        <Verweis pfad={kontrollePfad(k.projektId)} text={texte.seite.zurKontrolle} gehe={gehe} />
        <HonorarVerweise projektId={k.projektId} kostenermittlungId={k.id} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          variante="gefahr"
          onClick={() => {
            setLoeschen(true);
          }}
        >
          {t.loeschen}
        </Button>
      </div>

      <div className="lv__grid kosten__grid">
        <VergleichsGrid
          beschriftung={t.grid}
          spalten={ansicht.spalten}
          zeilen={ansicht.zeilen}
          summen={ansicht.summen}
          baumspalte="nummer"
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

      <form className="kosten__formular" onSubmit={(e) => void setzen(e)} aria-label={t.eintragTitel}>
        <Eingabefeld
          label={t.nummer}
          value={nummer}
          onWertChange={setNummer}
          {...(fehler?.feld === 'nummer' ? { meldung: fehler.meldung } : {})}
        />
        <Eingabefeld
          label={t.betrag}
          value={betrag}
          onWertChange={setBetrag}
          inputMode="decimal"
          {...(fehler?.feld === 'betrag' ? { meldung: fehler.meldung } : {})}
        />
        <Eingabefeld label={t.bemerkung} value={bemerkung} onWertChange={setBemerkung} />
        <Button type="submit" variante="primaer">
          {t.setzen}
        </Button>
        <Button
          onClick={() => {
            void entfernen();
          }}
        >
          {t.entfernen}
        </Button>
      </form>

      <h2>{t.befunde}</h2>
      {ergebnis.befunde.length === 0 ? (
        <p>{t.keineBefunde}</p>
      ) : (
        <ul className="kosten__befunde" aria-label={t.befunde}>
          {ergebnis.befunde.map((b, i) => (
            <li key={`${b.code}-${String(i)}`}>
              {b.nummer === null ? '' : `KG ${b.nummer}: `}
              {t.befund[b.code]}
            </li>
          ))}
        </ul>
      )}

      <h2>{t.kopf}</h2>
      <form className="kosten__formular" onSubmit={(e) => void kopfSpeichern(e)} aria-label={t.kopf}>
        <Eingabefeld label={texte.seite.name} value={name} onWertChange={setName} />
        <Auswahl
          label={texte.seite.stufe}
          wert={stufe}
          onWertChange={(w) => {
            setStufe(w as Kostenermittlungsstufe);
          }}
          optionen={STUFEN.map((s) => ({ wert: s, label: texte.stufe[s] }))}
        />
        <Button type="submit">{t.kopfSpeichern}</Button>
      </form>

      <h2>{t.csvTitel}</h2>
      <p className="kosten__hinweis">{t.csvHinweis}</p>
      <div className="kosten__datei">
        <label>
          {t.csvWaehlen}{' '}
          <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void csvWaehlen(e)} />
        </label>
        <Button onClick={csvEntfernen} disabled={csv === null}>
          {t.csvEntfernen}
        </Button>
        <span role="status">
          {csvMeldung ?? (bezeichnungen.size > 0 ? t.csvGelesen(bezeichnungen.size) : t.csvKeine)}
        </span>
      </div>

      <Dialog
        offen={loeschen}
        onOffenChange={(o) => {
          if (!o) setLoeschen(false);
        }}
        titel={t.loeschenTitel}
        beschreibung={t.loeschenFrage(k.name)}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschen(false);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschenBestaetigt()}>
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </div>
  );
}
