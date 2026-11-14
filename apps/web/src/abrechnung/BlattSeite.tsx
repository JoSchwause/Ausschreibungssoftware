// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/auftrag/<id>/aufmass/<blatt>` (Ticket 87, A2): ein Aufmaßblatt im einen Grid (`VergleichsGrid`,
// U2) mit dem Baum des Auftrags-LV. Die Menge einer Zeile kommt aus der Mengenermittlung (Panel aus `src/mengen/`,
// Formel 91) oder direkt als Zahl; jeder Schritt ist ein Befehl am Blatt (A5) und ein Undo-Schritt.
//
// Das Grid ist schreibgeschützt (es kennt nur LV-Befehle); bearbeitet wird im Panel (D-87.2): Enter, F2, Strg+Alt+E oder
// Doppelklick auf eine Position öffnen es. Die Seite fängt Enter und F2 an Positionszeilen vor dem Grid ab.
// Ticket 152: Werkzeugleiste aus `ui-basis` (D-89); „Ausgabe“ mit dem Aufmaßblatt als PDF (Vorschau) und Excel.

import { aufmassPruefen } from '@tethys/abrechnung';
import {
  Button,
  Dialog,
  Tastenkuerzel,
  Werkzeuggruppe,
  Werkzeugleiste,
  Werkzeugverweis,
  useToast,
} from '@tethys/ui-basis';
import { VergleichsGrid } from '@tethys/ui-grid';
import type { Aufmass, AufmassBefehl, AufmassId, AufmassZustand, Menge } from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { auftragPfad } from '../auftrag/ziel';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { datumDe } from '../lv/kopfdaten';
import { useMeldungen } from '../lv/meldungen';
import { ozText } from '../lv/oztext';
import { imLeerlauf } from '../lv/pruefung';
import { MengenansatzPanel, type Mengenziel } from '../mengen/MengenPanel';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { aufmassSitzung, type Abrechnungsstand, type AufmassSitzung } from './aufmass';
import { BerichtAusgabe } from './Ausgabe';
import { aufmassblattEingabe, dateinameAufmassblatt } from './berichte';
import { blattAnsicht, kumuliertBisHier, zeilenBefehl, zeilenZiel } from './blatt';
import { KopfDialog } from './KopfDialog';
import { aufmassPfad, sollIstPfad } from './pfad';
import { texte } from './texte';
import { Verweis } from '../ui/Verweis';
import { X31Ausgeben } from './X31Ausgeben';

const t = texte.blatt;
const KEINE: ReadonlyMap<string, Menge | null> = new Map();

export function BlattSeite({
  stand,
  aufmassId,
  gehe,
  neuLaden,
}: {
  stand: Abrechnungsstand;
  aufmassId: AufmassId;
  gehe: (pfad: string) => void;
  neuLaden: () => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const a = stand.auftrag.auftragsLeistungsverzeichnis;
  const geladen = stand.blaetter.find((b) => b.id === aufmassId) ?? null;
  const sitzung = useMemo(
    () => aufmassSitzung(weg, a.projektId, geladen === null ? null : { aufmass: geladen }),
    [weg, a.projektId, geladen],
  );
  const zustand = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen);

  // Rückgängig/Wiederholen an diesem Blatt: Das ChangeSet ist das, das die Sitzung zuletzt angewandt hat (gleiche
  // Objekte), also direkt nachführen; jeder andere Schritt (anderes Blatt, anderes Aggregat) lädt neu (D-87.4).
  useEffect(
    () =>
      weg.beiHistorie((teil) => {
        const cs = teil.changeSet;
        if (cs.art === 'aufmass' && cs.aufmassId === aufmassId) {
          const jetzt = sitzung.zustand?.aufmass ?? null;
          const { vorher, nachher } = cs.aufmass;
          const ziel = jetzt === nachher ? vorher : jetzt === vorher ? nachher : undefined;
          if (ziel !== undefined) {
            sitzung.setze(ziel === null ? null : { aufmass: ziel });
            return;
          }
        }
        neuLaden();
      }),
    [weg, sitzung, aufmassId, neuLaden],
  );

  if (zustand === null) {
    return (
      <div className="seite">
        <h1>{texte.blattFehlt}</h1>
        <p>{texte.blattFehltText}</p>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={aufmassPfad(a.projektId, a.id)} text={texte.zurListe} gehe={gehe} />
        </div>
      </div>
    );
  }
  return <Blatt stand={stand} sitzung={sitzung} zustand={zustand} gehe={gehe} />;
}

function Blatt({
  stand,
  sitzung,
  zustand,
  gehe,
}: {
  stand: Abrechnungsstand;
  sitzung: AufmassSitzung;
  zustand: AufmassZustand;
  gehe: (pfad: string) => void;
}): ReactElement {
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const auftrag = stand.auftrag;
  const a = auftrag.auftragsLeistungsverzeichnis;
  const blatt = zustand.aufmass;
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [ziel, setZiel] = useState<Mengenziel | null>(null);
  const [kopfOffen, setKopfOffen] = useState(false);
  const [loeschenOffen, setLoeschenOffen] = useState(false);
  const aktiv = useRef<string | null>(null);
  const abbrechen = useRef<HTMLButtonElement>(null);

  // Die anderen Blätter wie geladen, dieses im Stand der Sitzung.
  const blaetter = useMemo(
    () => stand.blaetter.map((b): Aufmass => (b.id === blatt.id ? blatt : b)),
    [stand.blaetter, blatt],
  );
  // „Kumuliert bis hier“ rechnet Soll/Ist über alle Zeilen (bei 5.000 Zeilen spürbar, D-87.7): im nächsten Leerlauf wie
  // die LV-Prüfung, nie im Tastendruck; bis dahin steht der vorige Wert.
  const [kumuliert, setKumuliert] = useState<ReadonlyMap<string, Menge | null>>(KEINE);
  useEffect(
    () =>
      imLeerlauf(() => {
        setKumuliert(kumuliertBisHier(auftrag, blaetter, blatt.nummer));
      }),
    [auftrag, blaetter, blatt.nummer],
  );
  const ansicht = useMemo(
    () => blattAnsicht({ auftrag, blatt, kumuliert, zugeklappt }),
    [auftrag, blatt, kumuliert, zugeklappt],
  );
  const befunde = useMemo(() => aufmassPruefen(blatt, auftrag), [blatt, auftrag]);
  const ozVon = useCallback(
    (id: string): string => {
      const k = a.knoten.find((x) => x.id === id);
      return k === undefined ? id : ozText(k) || id;
    },
    [a.knoten],
  );
  const befundtexte = useMemo(() => befunde.map((b) => texte.befund(b, ozVon)), [befunde, ozVon]);

  const senden = async (b: AufmassBefehl): Promise<boolean> => {
    const r = await sitzung.befehl(b);
    if (!r.ok && r.abweisung.art === 'speicher' && r.abweisung.fehler.code === 'konflikt') {
      zeige({ titel: texte.blatt.konflikt, art: 'fehler' });
      return false;
    }
    return pruefe(r);
  };

  /** Öffnet die Mengenermittlung an einer Zeile des Grids (nur Positionen, keine Zuschlagspositionen). */
  const oeffnen = (knotenId: string | null): void => {
    const z = knotenId === null ? ({ art: 'keine-position' } as const) : zeilenZiel(auftrag, blatt, knotenId);
    if (z.art === 'ziel') setZiel(z.ziel);
    else if (z.art === 'zuschlagsposition')
      zeige({ titel: t.zuschlagsposition, beschreibung: t.zuschlagspositionText });
    else zeige({ titel: t.keinePosition, beschreibung: t.keinePositionText });
  };

  /** Die Positionszeile unter einem Ereignis im Grid (`data-i` ist der Index in den sichtbaren Zeilen). */
  const positionszeile = (ziel: EventTarget): string | null => {
    if (!(ziel instanceof Element) || ziel.closest('[role="gridcell"]') === null) return null;
    const i = Number(ziel.closest<HTMLElement>('[data-i]')?.dataset['i']);
    const z = Number.isNaN(i) ? undefined : ansicht.zeilen[i];
    return z?.art === 'position' ? z.id : null;
  };

  // Enter und F2 auf einer Position öffnen das Panel, bevor das (schreibgeschützte) Grid sie sieht (D-87.2).
  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>): void => {
    if ((e.key !== 'Enter' && e.key !== 'F2') || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const id = positionszeile(e.target);
    if (id === null) return;
    e.preventDefault();
    e.stopPropagation();
    oeffnen(id);
  };
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>): void => {
    const id = positionszeile(e.target);
    if (id !== null) oeffnen(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey || e.code !== 'KeyE') return;
    e.preventDefault();
    oeffnen(aktiv.current);
  };

  const listePfad = aufmassPfad(a.projektId, a.id);
  return (
    <div className="seite lv abrechnung" onKeyDown={onKeyDown}>
      <div className="lv__kopf">
        <h1>{t.titel(blatt.nummer, blatt.bezeichnung)}</h1>
        <span className="lv__kennzeichen" data-testid="blatt-datum">
          {blatt.datum === null ? t.ohneDatum : t.datum(datumDe(blatt.datum))}
        </span>
        <Verweis pfad={listePfad} text={texte.zurListe} gehe={gehe} />
        <Verweis pfad={auftragPfad(a.projektId, a.id)} text={texte.zumAuftrag} gehe={gehe} />
      </div>
      <Werkzeugleiste beschriftung={texte.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          onClick={() => {
            oeffnen(aktiv.current);
          }}
          aria-keyshortcuts="Control+Alt+E"
        >
          {t.mengenermittlung} <Tastenkuerzel tasten={t.tasten} />
        </Button>
        <Button
          onClick={() => {
            setKopfOffen(true);
          }}
        >
          {texte.kopf.knopf}
        </Button>
        <X31Ausgeben blatt={blatt} auftrag={auftrag} />
        <Werkzeuggruppe titel={texte.ausgabe.gruppe}>
          <BerichtAusgabe
            projektId={a.projektId}
            name={texte.ausgabe.aufmassblatt}
            dateiname={(endung) => dateinameAufmassblatt(auftrag, blatt, endung)}
            schluessel={JSON.stringify(blatt)}
            pdf={(kopf) => ({
              art: 'aufmassblatt',
              eingabe: aufmassblattEingabe(auftrag, blatt, kopf, befundtexte),
            })}
            excel={async (kopf) =>
              (await import('@tethys/ausgabe')).aufmassblattAlsExcel(
                aufmassblattEingabe(auftrag, blatt, kopf, befundtexte),
              )
            }
          />
        </Werkzeuggruppe>
        <Werkzeugverweis
          href={sollIstPfad(a.projektId, a.id)}
          onFolgen={() => {
            gehe(sollIstPfad(a.projektId, a.id));
          }}
        >
          {texte.liste.sollIst}
        </Werkzeugverweis>
        <Button
          variante="gefahr"
          onClick={() => {
            setLoeschenOffen(true);
          }}
        >
          {t.loeschen}
        </Button>
      </Werkzeugleiste>
      <p className="abrechnung__hinweis">{t.tastenHinweis}</p>
      <div
        className="lv__grid abrechnung__grid"
        onKeyDownCapture={onKeyDownCapture}
        onDoubleClick={onDoubleClick}
      >
        <VergleichsGrid
          beschriftung={t.grid}
          spalten={ansicht.spalten}
          zeilen={ansicht.zeilen}
          kennzeichenTexte={ansicht.kennzeichenTexte}
          fixierteSpalten={2}
          baumspalte="kurztext"
          onAufklappen={(id, auf) => {
            setZugeklappt((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(id);
              else neu.add(id);
              return neu;
            });
          }}
          onZeileAktiv={(id) => {
            aktiv.current = id;
          }}
        />
      </div>
      {befunde.length === 0 ? null : (
        <section className="abrechnung__befunde" aria-label={t.befunde}>
          <h2>{t.befunde}</h2>
          <ul>
            {befunde.map((b, i) => (
              <li key={i}>{texte.befund(b, ozVon)}</li>
            ))}
          </ul>
        </section>
      )}
      <MengenansatzPanel
        ziel={ziel}
        direkteMenge
        onSchliessen={() => {
          setZiel(null);
        }}
        uebernehmen={async (e) => {
          if (ziel === null) return false;
          const b = zeilenBefehl(blatt, ziel.schluessel, e);
          return b === null ? true : senden(b);
        }}
      />
      <KopfDialog
        offen={kopfOffen}
        titel={texte.kopf.titelAendern}
        anfang={blatt}
        bestaetigen={texte.kopf.uebernehmen}
        onSchliessen={() => {
          setKopfOffen(false);
        }}
        onBestaetigen={async (k) =>
          k.bezeichnung === blatt.bezeichnung && k.datum === blatt.datum
            ? true
            : senden({ art: 'AufmasskopfSetzen', bezeichnung: k.bezeichnung, datum: k.datum })
        }
      />
      <Dialog
        offen={loeschenOffen}
        onOffenChange={setLoeschenOffen}
        titel={t.loeschen}
        beschreibung={t.loeschenFrage(blatt.nummer)}
        anfangsfokus={abbrechen}
        fuss={
          <>
            <Button
              ref={abbrechen}
              onClick={() => {
                setLoeschenOffen(false);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button
              variante="gefahr"
              onClick={() => {
                setLoeschenOffen(false);
                void senden({ art: 'AufmassLoeschen' }).then((ok) => {
                  if (!ok) return;
                  zeige({ titel: texte.meldungen.geloescht(blatt.nummer), art: 'erfolg' });
                  gehe(listePfad);
                });
              }}
            >
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </div>
  );
}
