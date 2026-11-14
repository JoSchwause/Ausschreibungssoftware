// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/kosten/<kid>` (Ticket 89, C3): eine Kostenermittlung. Die Kostengruppen stehen im gemeinsamen
// Vergleichsgrid (U2) mit Summen je Gruppe und gesamt (`kostenermittlungBerechnen`); Einträge setzt und entfernt ein
// Formular (jede Änderung ein Befehl, ein Undo-Schritt). Die Bezeichnungen aus der CSV des Nutzers sind eine Einstellung
// (G-16); solange keine da sind, steht ein Hinweis mit Verweis zum Einlesen (Ticket 154, B-14). Hinweise zur Ermittlung
// blockieren nie (U5). Ticket 154 (E12): „Ausgabe“ mit Vorschau, PDF und Excel; Werkzeugleiste aus `ui-basis` (D-89).

import { kostenermittlungBerechnen } from '@tethys/kosten';
import { Auswahl, Button, Dialog, Eingabefeld, Werkzeuggruppe, Werkzeugleiste } from '@tethys/ui-basis';
import { VergleichsGrid } from '@tethys/ui-grid';
import type {
  KostenermittlungId,
  KostenermittlungZustand,
  Kostenermittlungsstufe,
  ProjektId,
} from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { ermittlungAnsicht } from './ansicht';
import { BezeichnungenBereich, BezeichnungenHinweis, useBezeichnungen } from './Bezeichnungen';
import { dateinameKostenermittlung, kostenermittlungEingabe } from './berichte';
import { KostenAusgabe } from './KostenAusgabe';
import { eintragEntfernenBefehl, eintragSetzenBefehl, kopfBefehl, type Feld } from './befehle';
import { BEZEICHNUNGEN_ANKER, kontrollePfad, kostenPfad, kostenermittlungPfad } from './pfad';
import { kostenermittlungSitzung } from './schreiben';
import { STUFEN, texte } from './texte';
import { Verweis } from '../ui/Verweis';
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
  const bezeichnungsstand = useBezeichnungen();
  const { bezeichnungen } = bezeichnungsstand;

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

  return (
    <div className="seite lv kosten">
      <div className="lv__kopf">
        <h1>{texte.editor.titel(k.name)}</h1>
        <Verweis pfad={kostenPfad(k.projektId)} text={t.zurueck} gehe={gehe} />
        <Verweis pfad={kontrollePfad(k.projektId)} text={texte.seite.zurKontrolle} gehe={gehe} />
      </div>
      <Werkzeugleiste beschriftung={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        <Werkzeuggruppe titel={texte.ausgabe.gruppe}>
          <KostenAusgabe
            projektId={k.projektId}
            titel={texte.ausgabe.titelErmittlung(k.name)}
            dateiname={(endung) => dateinameKostenermittlung(k.name, endung)}
            bezeichnungen={bezeichnungen}
            bericht={(kopf) => ({ art: 'ermittlung', eingabe: kostenermittlungEingabe(k, kopf) })}
          />
        </Werkzeuggruppe>
        <Button
          variante="gefahr"
          onClick={() => {
            setLoeschen(true);
          }}
        >
          {t.loeschen}
        </Button>
      </Werkzeugleiste>
      <BezeichnungenHinweis
        stand={bezeichnungsstand}
        pfad={`${kostenermittlungPfad(k.projektId, k.id)}#${BEZEICHNUNGEN_ANKER}`}
        gehe={gehe}
      />

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

      <BezeichnungenBereich stand={bezeichnungsstand} />

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
