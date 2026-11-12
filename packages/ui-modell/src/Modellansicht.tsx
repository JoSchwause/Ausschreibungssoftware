// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Modellansicht: nur die 3D-Leinwand (D-50). Modellbaum und Eigenschaften stehen in der App auf ui-grid (U2); der
// barrierefreie Weg zur Auswahl ist dort der Baum, die Leinwand ergänzt ihn (U8).

import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { auswahlBeiKlick } from './darstellung';
import type { Darstellungseingaben } from './darstellung';
import { geometrieLaden, Ladefehler } from './geometrie-laden';
import { Leinwand } from './leinwand';
import { BEDIENHILFE, BESCHRIFTUNG, FEHLERTEXT, LAEDT, leinwandName, OHNE_GEOMETRIE } from './texte';
import type { Darstellungsstand, Modellfehler, ModellansichtProps } from './typen';
import type { Bauteilverzeichnis } from './zuordnung';

type Zustand =
  | { readonly art: 'laedt' }
  | { readonly art: 'bereit'; readonly verzeichnis: Bauteilverzeichnis; readonly bauteile: number }
  | { readonly art: 'fehler'; readonly fehler: Modellfehler };

const OHNE_MODELL: Darstellungsstand = {
  geladen: false,
  bauteile: 0,
  sichtbar: [],
  hervorgehoben: [],
  farben: {},
  hintergrund: '',
  kamera: { ziel: [0, 0, 0], azimut: 0, hoehe: 0, abstand: 0 },
  bilder: 0,
};

export function Modellansicht(props: ModellansichtProps): ReactElement {
  const { datei, auswahl, ausgeblendet, isoliert, faerbung, beschriftung = BESCHRIFTUNG, ref } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leinwand = useRef<Leinwand | null>(null);
  const [zustand, setZustand] = useState<Zustand>({ art: 'laedt' });
  const hilfeId = useId();

  // Rückrufe und Eingaben immer aktuell, ohne die Leinwand neu anzulegen
  const rueckrufe = useRef(props);
  useLayoutEffect(() => {
    rueckrufe.current = props;
  });
  const eingaben: Darstellungseingaben = useMemo(
    () => ({ auswahl, ausgeblendet, isoliert, faerbung }),
    [auswahl, ausgeblendet, isoliert, faerbung],
  );
  const eingabenRef = useRef(eingaben);

  const melden = (fehler: Modellfehler): void => {
    setZustand({ art: 'fehler', fehler });
    rueckrufe.current.onFehler?.(fehler);
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let l: Leinwand;
    try {
      l = new Leinwand(canvas, {
        klick: (globalId, ergaenzen) => {
          const e = auswahlBeiKlick(globalId, ergaenzen);
          if (e) rueckrufe.current.onAuswahl(e.globalIds, { hinzufuegen: e.hinzufuegen });
        },
      });
    } catch (e) {
      melden({ code: 'webgl-fehlt', meldung: e instanceof Error ? e.message : String(e) });
      return;
    }
    leinwand.current = l;
    return () => {
      l.entsorgen();
      leinwand.current = null;
    };
    // Die Leinwand gehört zum Canvas-Element; Rückrufe kommen über die Ref (`rueckrufe`).
  }, []);

  useEffect(() => {
    const l = leinwand.current;
    if (!l) return;
    const start = performance.now();
    let aktiv = true;
    // als Funktion, damit die Prüfung nach `await` nicht als schon entschieden gilt
    const abgeloest = (): boolean => !aktiv;
    setZustand({ art: 'laedt' });
    const auftrag = geometrieLaden(datei);
    auftrag.ergebnis.then(
      async (geometrie) => {
        if (abgeloest()) return;
        l.modellZeigen(geometrie);
        l.darstellungSetzen(eingabenRef.current);
        const verzeichnis = l.verzeichnis;
        if (verzeichnis) setZustand({ art: 'bereit', verzeichnis, bauteile: geometrie.mitGeometrie.length });
        await l.gezeichnet();
        if (abgeloest()) return;
        rueckrufe.current.onGeladen?.({
          mitGeometrie: geometrie.mitGeometrie,
          ohneGeometrie: geometrie.ohneGeometrie,
          dauerMs: performance.now() - start,
        });
      },
      (fehler: unknown) => {
        if (abgeloest()) return;
        melden(
          fehler instanceof Ladefehler
            ? fehler.fehler
            : { code: 'worker-fehler', meldung: fehler instanceof Error ? fehler.message : String(fehler) },
        );
      },
    );
    return () => {
      aktiv = false;
      auftrag.abbrechen();
    };
    // Nur eine neue Datei lädt neu; die Eingaben kommen über `eingabenRef`.
  }, [datei]);

  useLayoutEffect(() => {
    eingabenRef.current = eingaben;
    leinwand.current?.darstellungSetzen(eingaben);
  }, [eingaben]);

  useImperativeHandle(
    ref,
    () => ({
      auswahlZeigen: () => {
        leinwand.current?.bedienen({ art: 'auswahl-zeigen' });
      },
      ansichtZuruecksetzen: () => {
        leinwand.current?.bedienen({ art: 'zuruecksetzen' });
      },
      darstellung: () => leinwand.current?.darstellung() ?? OHNE_MODELL,
      bildschirmpunkt: (globalId) => leinwand.current?.bildschirmpunkt(globalId) ?? null,
      gezeichnet: () => leinwand.current?.gezeichnet() ?? Promise.resolve(),
    }),
    [],
  );

  const ausgewaehlt =
    zustand.art === 'bereit' ? new Set(auswahl.filter((id) => zustand.verzeichnis.enthaelt(id))).size : 0;
  const name = leinwandName(
    beschriftung,
    zustand.art === 'bereit' ? { bauteile: zustand.bauteile, ausgewaehlt } : null,
  );

  return (
    <div className="tx-modell">
      <canvas
        ref={canvasRef}
        className="tx-modell__leinwand"
        tabIndex={0}
        role="application"
        aria-label={name}
        aria-describedby={hilfeId}
      />
      <p id={hilfeId} className="tx-modell__unsichtbar">
        {BEDIENHILFE}
      </p>
      {zustand.art === 'laedt' && (
        <p className="tx-modell__hinweis" role="status">
          {LAEDT}
        </p>
      )}
      {zustand.art === 'fehler' && (
        <p className="tx-modell__hinweis tx-modell__hinweis--fehler" role="alert">
          {FEHLERTEXT[zustand.fehler.code]}
        </p>
      )}
      {zustand.art === 'bereit' && zustand.bauteile === 0 && (
        <p className="tx-modell__hinweis" role="status">
          {OHNE_GEOMETRIE}
        </p>
      )}
    </div>
  );
}
