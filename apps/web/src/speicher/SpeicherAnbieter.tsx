// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffnet den Speicher (SQLite-WASM im OPFS, im Worker) einmal für die App und stellt die Umgebung des Befehlswegs
// bereit. Ist die Datenbank in einem anderen Tab offen (`gesperrt`), erscheint eine verständliche Meldung statt einer
// leeren Fläche (E-14). Beim Neuladen gibt der alte Worker die Sperre erst kurz nach dem Start der neuen Seite frei;
// deshalb versucht die App es einige Male, bevor sie die Meldung zeigt. Scheitert das Öffnen aus einem anderen Grund,
// nennt die Meldung Ursache und nächsten Schritt (E13, B-24). Solange der Speicher offen ist, kennt ihn die Fehlergrenze
// für die Notfallsicherung.

import { speicherOeffnen } from '@tethys/speicher';
import SpeicherWorker from '@tethys/speicher/worker?worker';
import { Button } from '@tethys/ui-basis';
import type { Speicher, Speicherfehler } from '@tethys/vertrag';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { speicherAbmelden, speicherMelden } from '../fehler/notfall';
import { EINZIGER_NUTZER, type Umgebung } from '../lv/befehlsweg';
import { appIdQuelle, appUhr } from '../lv/ids';
import { texte } from './texte';

const Kontext = createContext<Umgebung | null>(null);

/** Die Umgebung des Befehlswegs; nur unterhalb von `SpeicherAnbieter`. */
export function useUmgebung(): Umgebung {
  const u = useContext(Kontext);
  if (u === null) throw new Error('useUmgebung außerhalb von SpeicherAnbieter');
  return u;
}

/** Wie oft und in welchem Abstand das Öffnen bei `gesperrt` wiederholt wird (Neuladen, siehe oben). */
const VERSUCHE = 12;
const ABSTAND_MS = 250;

const warte = (ms: number): Promise<void> =>
  new Promise((fertig) => {
    setTimeout(fertig, ms);
  });

async function oeffnen(): Promise<{ ok: true; speicher: Speicher } | { ok: false; fehler: Speicherfehler }> {
  let letzter: Speicherfehler = { code: 'unbekannt', meldung: '' };
  for (let i = 0; i < VERSUCHE; i++) {
    const r = await speicherOeffnen({ worker: new SpeicherWorker() });
    if (r.ok) return { ok: true, speicher: r.wert };
    letzter = r.fehler;
    if (r.fehler.code !== 'gesperrt') break;
    await warte(ABSTAND_MS);
  }
  return { ok: false, fehler: letzter };
}

type Lage =
  | { readonly art: 'oeffnet' }
  | { readonly art: 'bereit'; readonly umgebung: Umgebung }
  | { readonly art: 'fehler'; readonly fehler: Speicherfehler };

export interface SpeicherAnbieterProps {
  readonly children: ReactNode;
  /** Für den Testpfad: Hülle um den geöffneten Speicher (z. B. ein Speicher, der Fehler liefert). */
  readonly umhuellen?: (speicher: Speicher) => Speicher;
  readonly onBereit?: (umgebung: Umgebung) => void;
  /**
   * `false`: Die Seite braucht den Speicher nicht und erscheint sofort, ohne Warte- oder Fehlermeldung. Der Speicher
   * bleibt trotzdem offen, damit der Undo-Stapel der Sitzung einen Abstecher auf eine solche Seite übersteht.
   */
  readonly mussOffen?: boolean;
}

export function SpeicherAnbieter({
  children,
  umhuellen,
  onBereit,
  mussOffen = true,
}: SpeicherAnbieterProps): ReactElement {
  const [lage, setLage] = useState<Lage>({ art: 'oeffnet' });
  const [runde, setRunde] = useState(0);

  useEffect(() => {
    let aktiv = true;
    let offen: Speicher | null = null;
    const freigeben = (): void => {
      if (offen !== null) {
        speicherAbmelden(offen);
        void offen.schliessen();
      }
      offen = null;
    };
    void oeffnen().then((r) => {
      if (!r.ok) {
        if (aktiv) setLage({ art: 'fehler', fehler: r.fehler });
        return;
      }
      offen = r.speicher;
      if (!aktiv) {
        freigeben();
        return;
      }
      const umgebung: Umgebung = {
        speicher: umhuellen ? umhuellen(r.speicher) : r.speicher,
        ids: appIdQuelle(),
        uhr: appUhr,
        nutzer: EINZIGER_NUTZER,
      };
      speicherMelden(r.speicher);
      onBereit?.(umgebung);
      setLage({ art: 'bereit', umgebung });
    });
    window.addEventListener('pagehide', freigeben);
    return () => {
      aktiv = false;
      window.removeEventListener('pagehide', freigeben);
      freigeben();
    };
    // `umhuellen` und `onBereit` gelten nur beim Öffnen.
  }, [runde]);

  const erneut = useCallback(() => {
    setLage({ art: 'oeffnet' });
    setRunde((n) => n + 1);
  }, []);

  // Gleicher Baum vor und nach dem Öffnen: Eine Seite ohne Speicher wird beim Öffnen nicht neu aufgebaut.
  if (lage.art === 'bereit' || !mussOffen) {
    return (
      <Kontext.Provider value={lage.art === 'bereit' ? lage.umgebung : null}>{children}</Kontext.Provider>
    );
  }
  if (lage.art === 'oeffnet') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.oeffnet}</p>
      </div>
    );
  }
  const gesperrt = lage.fehler.code === 'gesperrt';
  return (
    <div className="seite" role="alert">
      <h1>{gesperrt ? texte.gesperrtTitel : texte.fehlerTitel}</h1>
      <p>{gesperrt ? texte.gesperrtText : texte.oeffnenFehler[lage.fehler.code]}</p>
      <Button variante="primaer" onClick={erneut}>
        {texte.erneut}
      </Button>
      {gesperrt || lage.fehler.meldung === '' ? null : (
        <details>
          <summary>{texte.einzelheiten}</summary>
          <pre>{lage.fehler.meldung}</pre>
        </details>
      )}
    </div>
  );
}
