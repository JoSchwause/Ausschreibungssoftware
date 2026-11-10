// Wegwerfcode. Ansicht 4: GAEB-Dialog. Zwei Varianten.
//  schritte : Assistent in drei Schritten
//  seite    : eine Seite mit Prüfliste
// GAEB ist gespielt: Die Dateien sind vorbereitete JSON-Dateien aus src/daten/. Kein XML, kein XSD.
import { useEffect, useState } from 'react';
import { Button, Dialog, Icon } from '@tethys/ui-basis';
import type { Position } from '@tethys/vertrag';
import x83 from './daten/gaeb-x83.json';
import x84 from './daten/gaeb-x84.json';
import exportJson from './daten/gaeb-export.json';
import { useStore } from './store';
import { Seitenkopf, istPosition, oz } from './teile';

function Befund({ art, children }: { art: string; children: React.ReactNode }) {
  return (
    <li className={`p-befund p-befund--${art}`}>
      <Icon name={art === 'info' ? 'info' : 'warnung'} groesse={14} />
      <span>{children}</span>
    </li>
  );
}

function DateiKarte({
  nr,
  titel,
  datei,
  geladen,
  onLaden,
  knopf,
  erneut,
}: {
  nr: number;
  titel: string;
  datei: typeof x83 | typeof x84;
  geladen: boolean;
  onLaden: () => void;
  knopf: string;
  erneut: string;
}) {
  return (
    <section className={`p-datei${geladen ? ' ist-geladen' : ''}`} aria-label={titel}>
      <h3>
        <span className="p-schritt">{nr}</span> {titel}
      </h3>
      {geladen ? (
        <>
          <p className="p-datei__name">
            <Icon name="haken" groesse={14} /> <strong>{datei.datei}</strong> · {datei.phase} · {datei.groesse}
          </p>
          <ul className="p-datei__inhalt">
            {datei.inhalt.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <ul className="p-befunde">
            {datei.befunde.map((b) => (
              <Befund key={b.text} art={b.art}>
                {b.text}
              </Befund>
            ))}
          </ul>
          <Button groesse="sm" variante="schlicht" onClick={onLaden}>
            {erneut}
          </Button>
        </>
      ) : (
        <>
          <p className="p-leise">{datei.hinweis}</p>
          <Button variante="primaer" onClick={onLaden}>
            {knopf}
          </Button>
        </>
      )}
    </section>
  );
}

/** Prüfliste: die zwei erfundenen Warnungen plus ein Befund, der aus dem LV gerechnet wird. */
function Pruefliste({ zumLv }: { zumLv: (positionId: string | null) => void }) {
  const s = useStore();
  const positionen = s.knoten.filter(istPosition);
  const ohne = positionen.filter((p: Position) => !p.menge || !p.einheitspreis || !p.einheit);
  const sprung = (ortOz: string | null) => zumLv(ortOz ? (positionen.find((p) => oz(p) === ortOz)?.id ?? null) : null);
  return (
    <section className="p-pruefliste" aria-label="Prüfliste" data-pruefliste>
      <h3>Prüfliste vor dem Export</h3>
      <ul className="p-befunde">
        {exportJson.pruefliste.map((b) => (
          <Befund key={b.id} art={b.art}>
            {b.text}{' '}
            {b.ort ? (
              <button type="button" className="p-link" onClick={() => sprung(b.ort)}>
                Zur Position {b.ort}
              </button>
            ) : null}
          </Befund>
        ))}
        {ohne.length > 0 ? (
          <Befund art="warnung">
            {ohne.length} Position{ohne.length === 1 ? '' : 'en'} ohne Menge, Einheit oder Einheitspreis (aus dem LV gerechnet).{' '}
            <button type="button" className="p-link" onClick={() => sprung(oz(ohne[0]!))}>
              Zur ersten
            </button>
          </Befund>
        ) : (
          <Befund art="info">Alle {positionen.length} Positionen haben Menge, Einheit und Einheitspreis (aus dem LV gerechnet).</Befund>
        )}
      </ul>
      <p className="p-hinweis">Die Liste sperrt nichts. Sie können jederzeit exportieren; die Datei wird dann als Entwurf gekennzeichnet.</p>
    </section>
  );
}

function ExportKarte() {
  const s = useStore();
  return (
    <div className="p-export">
      <Button variante="primaer" onClick={() => s.setGaeb({ export: true })}>
        Als Entwurf exportieren
      </Button>
      <span className="p-entwurf" data-entwurf>
        ENTWURF
      </span>
      {s.gaeb.export ? (
        <p className="p-export__ok" role="status">
          <Icon name="haken" groesse={14} /> {exportJson.datei} erzeugt (gespielt: es wird keine Datei geschrieben). Kennzeichen „Entwurf“ gesetzt, weil die Prüfliste Warnungen enthält.
        </p>
      ) : (
        <p className="p-leise">Mit Warnungen wird gewarnt, nicht gesperrt: Die Datei trägt das Kennzeichen „Entwurf“.</p>
      )}
    </div>
  );
}

function Schritte({ schliessen, zumLv }: { schliessen: () => void; zumLv: (id: string | null) => void }) {
  const s = useStore();
  const [schritt, setSchritt] = useState(1);
  const namen = ['Ausschreibung laden (X83)', 'Angebot einlesen (X84)', 'Prüfen und exportieren'];
  return (
    <Dialog
      offen
      onOffenChange={(o) => !o && schliessen()}
      titel="GAEB-Austausch"
      beschreibung="Drei Schritte. Jeder Schritt lässt sich überspringen; nichts wird gesperrt."
      fuss={
        <>
          <Button variante="schlicht" onClick={schliessen}>
            Schließen
          </Button>
          <Button disabled={schritt === 1} onClick={() => setSchritt(schritt - 1)}>
            Zurück
          </Button>
          {schritt < 3 ? (
            <Button variante="primaer" onClick={() => setSchritt(schritt + 1)}>
              Weiter
            </Button>
          ) : null}
        </>
      }
    >
      <ol className="p-schrittleiste" aria-label="Schritte">
        {namen.map((n, i) => (
          <li key={n} className={i + 1 === schritt ? 'ist-aktuell' : i + 1 < schritt ? 'ist-erledigt' : ''} aria-current={i + 1 === schritt ? 'step' : undefined}>
            <button type="button" onClick={() => setSchritt(i + 1)}>
              <span className="p-schritt">{i + 1}</span> {n}
            </button>
          </li>
        ))}
      </ol>
      <div className="p-schrittinhalt">
        {schritt === 1 ? (
          <DateiKarte nr={1} titel="Ausschreibung laden (X83)" datei={x83} geladen={s.gaeb.x83} onLaden={() => s.setGaeb({ x83: true })} knopf="X83 laden" erneut="Erneut laden" />
        ) : null}
        {schritt === 2 ? (
          <DateiKarte nr={2} titel="Angebot einlesen (X84)" datei={x84} geladen={s.gaeb.x84} onLaden={() => s.setGaeb({ x84: true })} knopf="X84 einlesen" erneut="Erneut einlesen" />
        ) : null}
        {schritt === 3 ? (
          <>
            <Pruefliste zumLv={zumLv} />
            <ExportKarte />
          </>
        ) : null}
      </div>
    </Dialog>
  );
}

function EineSeite({ schliessen, zumLv }: { schliessen: () => void; zumLv: (id: string | null) => void }) {
  const s = useStore();
  return (
    <Dialog
      offen
      onOffenChange={(o) => !o && schliessen()}
      titel="GAEB-Austausch"
      beschreibung="Alles auf einer Seite: Dateien links, Prüfliste und Export rechts."
      fuss={
        <Button variante="schlicht" onClick={schliessen}>
          Schließen
        </Button>
      }
    >
      <div className="p-zweispaltig">
        <div className="p-spalte">
          <DateiKarte nr={1} titel="Ausschreibung laden (X83)" datei={x83} geladen={s.gaeb.x83} onLaden={() => s.setGaeb({ x83: true })} knopf="X83 laden" erneut="Erneut laden" />
          <DateiKarte nr={2} titel="Angebot einlesen (X84)" datei={x84} geladen={s.gaeb.x84} onLaden={() => s.setGaeb({ x84: true })} knopf="X84 einlesen" erneut="Erneut einlesen" />
        </div>
        <div className="p-spalte">
          <Pruefliste zumLv={zumLv} />
          <ExportKarte />
        </div>
      </div>
    </Dialog>
  );
}

export function GaebAnsicht({ variante }: { variante: string }) {
  const s = useStore();
  const [offen, setOffen] = useState(true);
  // Wechselt man per Leiste die Variante, oeffnet sich der Dialog der neuen Variante wieder.
  useEffect(() => {
    setOffen(true);
  }, [variante]);
  const zumLv = (id: string | null) => {
    if (id) s.setWahl(id);
    setOffen(false);
    s.navigiere('lv', 'panel');
  };
  return (
    <div className="p-seite">
      <Seitenkopf titel="GAEB-Austausch" frage="Teilfrage 4: Ist der Ablauf „X83 laden, X84 einlesen, Export mit Prüfwarnung als Entwurf“ verständlich?">
        <Button variante="primaer" onClick={() => setOffen(true)}>
          GAEB-Dialog öffnen
        </Button>
      </Seitenkopf>
      <ul className="p-stand" aria-label="Stand">
        <li>X83 geladen: <strong>{s.gaeb.x83 ? 'ja' : 'nein'}</strong></li>
        <li>X84 eingelesen: <strong>{s.gaeb.x84 ? 'ja' : 'nein'}</strong></li>
        <li>Export als Entwurf erzeugt: <strong>{s.gaeb.export ? 'ja' : 'nein'}</strong></li>
      </ul>
      <p className="p-leise">Der Dialog liegt über dieser Seite. Die Dateien sind vorbereitete JSON-Dateien; es wird nichts gelesen oder geschrieben.</p>
      {offen ? variante === 'seite' ? <EineSeite schliessen={() => setOffen(false)} zumLv={zumLv} /> : <Schritte schliessen={() => setOffen(false)} zumLv={zumLv} /> : null}
    </div>
  );
}
