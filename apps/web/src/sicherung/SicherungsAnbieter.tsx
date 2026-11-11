// SPDX-License-Identifier: AGPL-3.0-or-later
// Datensicherung (G-03): „Jetzt sichern“ (Projektdatei in den Sicherungsordner oder als Download), automatisches
// Sichern nach jedem n-ten Befehl und beim Verlassen der Seite, Merken des letzten Exports je Projekt.
// Der Export selbst ist der vorhandene Weg (`projektdateiExportieren`, Ticket 38); hier wird nichts am Speicher geändert.

import { useToast } from '@tethys/ui-basis';
import type { ProjektId } from '@tethys/vertrag';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { nachJedemEintrag } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { einstellungenLesen, einstellungenSchreiben, letzterExportMerken } from './ablage';
import { sicherungsdateiname } from './dateiname';
import {
  berechtigungSichern,
  inOrdnerSchreiben,
  ordnerLaden,
  ordnerMerken,
  ordnerVergessen,
  ordnerWaehlen,
  ordnerWahlUnterstuetzt,
  type OrdnerHandle,
} from './ordner';
import { AUTO_SICHERN_ALLE_BEFEHLE } from './regel';
import { texte } from './texte';

export interface Sicherung {
  /** Gibt es die Ordnerwahl in diesem Browser (Chromium)? Sonst bleibt nur der normale Export. */
  readonly ordnerMoeglich: boolean;
  readonly ordnerName: string | null;
  readonly automatisch: boolean;
  /** Zählt hoch, wenn sich ein Zeitpunkt der Sicherung geändert hat (Anzeigen laden dann neu). */
  readonly stand: number;
  /** Sichert das Projekt jetzt (aus einer Nutzeraktion): in den Ordner, sonst als Download. */
  sichern(projekt: { id: ProjektId; name: string }): Promise<boolean>;
  /** Die Projektseite hat die Projektdatei selbst exportiert: Zeitpunkt merken. */
  exportVermerken(projektId: ProjektId): void;
  ordnerAuswaehlen(): Promise<void>;
  ordnerEntfernen(): Promise<void>;
  automatischSetzen(an: boolean): void;
}

const Kontext = createContext<Sicherung | null>(null);

export function useSicherung(): Sicherung {
  const s = useContext(Kontext);
  if (s === null) throw new Error('useSicherung außerhalb von SicherungsAnbieter');
  return s;
}

function herunterladen(name: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function SicherungsAnbieter({ children }: { children: ReactNode }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const { speicherfehler } = useMeldungen();
  const [ordner, setOrdner] = useState<OrdnerHandle | null>(null);
  const [automatisch, setAutomatisch] = useState(() => einstellungenLesen().automatisch);
  const [stand, setStand] = useState(0);
  const ordnerMoeglich = ordnerWahlUnterstuetzt();
  // Aktueller Stand für Rückrufe außerhalb des Renderns (Hörer am Befehlsweg, Seite verlassen).
  const live = useRef({ ordner, automatisch });
  live.current = { ordner, automatisch };
  /** Befehle je Projekt seit der letzten Sicherung. */
  const offen = useRef(new Map<ProjektId, number>());
  const kette = useRef<Promise<unknown>>(Promise.resolve());
  const hinweisPausiert = useRef(false);

  useEffect(() => {
    if (!ordnerMoeglich) return;
    let aktiv = true;
    void ordnerLaden().then((h) => {
      if (aktiv && h !== null) setOrdner((alt) => alt ?? h);
    });
    return () => {
      aktiv = false;
    };
  }, [ordnerMoeglich]);

  const vermerken = useCallback(
    (id: ProjektId) => {
      letzterExportMerken(id, Date.parse(u.uhr()));
      offen.current.delete(id);
      setStand((n) => n + 1);
    },
    [u],
  );

  /** Exportiert das Projekt und schreibt es in den Ordner. `fuerNutzer`: darf nachfragen und Fehler melden. */
  const inOrdnerSichern = useCallback(
    async (projekt: { id: ProjektId; name: string }, fuerNutzer: boolean): Promise<boolean | 'download'> => {
      const o = live.current.ordner;
      if (o === null) return 'download';
      if (!(await berechtigungSichern(o, fuerNutzer))) {
        if (fuerNutzer) {
          zeige({
            titel: texte.meldung.ordnerFehler,
            beschreibung: texte.meldung.ordnerRecht,
            art: 'warnung',
          });
          return 'download';
        }
        if (!hinweisPausiert.current) {
          hinweisPausiert.current = true;
          zeige({
            titel: texte.meldung.ordnerFehler,
            beschreibung: texte.meldung.ordnerRecht,
            art: 'warnung',
          });
        }
        return false;
      }
      const r = await u.speicher.projektdateiExportieren(projekt.id);
      if (!r.ok) {
        if (fuerNutzer) speicherfehler(r.fehler, texte.meldung.exportFehler);
        return false;
      }
      const datei = sicherungsdateiname(projekt.name, new Date(u.uhr()));
      const s = await inOrdnerSchreiben(o, datei, r.wert);
      if (!s.ok) {
        zeige({ titel: texte.meldung.ordnerFehler, beschreibung: s.meldung, art: 'fehler' });
        return false;
      }
      vermerken(projekt.id);
      if (fuerNutzer) {
        zeige({
          titel: texte.meldung.gesichert,
          beschreibung: texte.meldung.gesichertInOrdner(datei, o.name),
          art: 'erfolg',
        });
      }
      return true;
    },
    [u, zeige, speicherfehler, vermerken],
  );

  const sichern = useCallback(
    async (projekt: { id: ProjektId; name: string }): Promise<boolean> => {
      const lauf = kette.current.then(() => inOrdnerSichern(projekt, true));
      kette.current = lauf.catch(() => undefined);
      const ergebnis = await lauf;
      if (ergebnis !== 'download') return ergebnis;
      // Ohne Ordner (oder ohne Erlaubnis): der normale Export als Download.
      const r = await u.speicher.projektdateiExportieren(projekt.id);
      if (!r.ok) {
        speicherfehler(r.fehler, texte.meldung.exportFehler);
        return false;
      }
      herunterladen(sicherungsdateiname(projekt.name, new Date(u.uhr())), r.wert);
      vermerken(projekt.id);
      return true;
    },
    [u, speicherfehler, vermerken, inOrdnerSichern],
  );

  /** Automatisch im Hintergrund: nur mit Ordner, eingeschaltet und schon erteilter Berechtigung. */
  const autoSichern = useCallback(
    (id: ProjektId): void => {
      const { ordner: o, automatisch: an } = live.current;
      if (!an || o === null) return;
      const lauf = kette.current.then(async () => {
        const p = await u.speicher.projekte.laden(id);
        if (!p.ok) return; // z. B. gelöscht
        await inOrdnerSichern({ id, name: p.wert.name }, false);
      });
      kette.current = lauf.catch(() => undefined);
    },
    [u, inOrdnerSichern],
  );

  // Befehle zählen: Jeder angenommene Eintrag (Befehl, Undo, Redo) meldet der Befehlsweg (A5, D-62.2).
  useEffect(
    () =>
      nachJedemEintrag(u, (eintrag) => {
        const n = (offen.current.get(eintrag.projektId) ?? 0) + 1;
        offen.current.set(eintrag.projektId, n);
        if (n % AUTO_SICHERN_ALLE_BEFEHLE === 0) autoSichern(eintrag.projektId);
      }),
    [u, autoSichern],
  );

  // Beim Verlassen der Seite: alles, was seit der letzten Sicherung dazukam. `visibilitychange` ist zuverlässiger als
  // `pagehide`; beides löst höchstens einmal je Projekt aus, weil das Sichern den Zähler leert.
  useEffect(() => {
    const verlassen = (): void => {
      for (const [id, n] of [...offen.current]) if (n > 0) autoSichern(id);
    };
    const sichtbarkeit = (): void => {
      if (document.visibilityState === 'hidden') verlassen();
    };
    document.addEventListener('visibilitychange', sichtbarkeit);
    window.addEventListener('pagehide', verlassen);
    return () => {
      document.removeEventListener('visibilitychange', sichtbarkeit);
      window.removeEventListener('pagehide', verlassen);
    };
  }, [autoSichern]);

  const ordnerAuswaehlen = useCallback(async () => {
    const h = await ordnerWaehlen();
    if (h === null) return;
    hinweisPausiert.current = false;
    setOrdner(h);
    await ordnerMerken(h); // Gelingt es nicht, gilt der Ordner bis zum Neuladen.
  }, []);

  const ordnerEntfernen = useCallback(async () => {
    setOrdner(null);
    setAutomatisch(false);
    einstellungenSchreiben({ automatisch: false });
    await ordnerVergessen();
  }, []);

  const automatischSetzen = useCallback((an: boolean) => {
    setAutomatisch(an);
    einstellungenSchreiben({ automatisch: an });
  }, []);

  const wert = useMemo<Sicherung>(
    () => ({
      ordnerMoeglich,
      ordnerName: ordner?.name ?? null,
      automatisch,
      stand,
      sichern,
      exportVermerken: vermerken,
      ordnerAuswaehlen,
      ordnerEntfernen,
      automatischSetzen,
    }),
    [
      ordnerMoeglich,
      ordner,
      automatisch,
      stand,
      sichern,
      vermerken,
      ordnerAuswaehlen,
      ordnerEntfernen,
      automatischSetzen,
    ],
  );

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}
