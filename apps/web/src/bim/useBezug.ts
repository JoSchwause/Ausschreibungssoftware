// SPDX-License-Identifier: AGPL-3.0-or-later
// Das LV, auf das sich Zuordnung, Färbung und Aufmaßblatt der Modellseite beziehen (Ticket 115, D-52): ein
// Ausschreibungs-LV oder ein Auftrags-LV des Projekts. `BauteileZuordnen` ist an beiden ein Befehl; geschrieben wird über
// die Sitzungen des Befehlswegs (ein Undo-Schritt je Aktion). Nach Rückgängig/Wiederholen lädt der Bezug neu.

import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvUebersicht,
  AuftragsLvZustand,
  BauteileZuordnen,
  Knoten,
  LeistungsverzeichnisId,
  LvUebersicht,
  LvZustand,
  ProjektId,
} from '@tethys/vertrag';
import { useCallback, useEffect, useState } from 'react';
import { auftragsLvSitzung } from '../kosten/schreiben';
import { befehlswegFuer, type Ausgang } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { texte } from './texte';

export interface Bezugswahl {
  /** `lv:<id>` oder `auftrag:<id>`. */
  readonly schluessel: string;
  readonly label: string;
}

export type Bezug =
  | { readonly art: 'lv'; readonly zustand: LvZustand }
  | { readonly art: 'auftrag'; readonly zustand: AuftragsLvZustand };

export interface Bezugsstand {
  /** `null`, solange die Liste lädt. */
  readonly wahlen: readonly Bezugswahl[] | null;
  readonly schluessel: string | undefined;
  readonly waehlen: (schluessel: string) => void;
  readonly bezug: Bezug | null;
  readonly knoten: readonly Knoten[];
  /** Schreibt die Befehle als einen Undo-Schritt; `true`, wenn alle angenommen wurden. */
  readonly senden: (befehle: readonly BauteileZuordnen[]) => Promise<boolean>;
}

export function knotenDes(bezug: Bezug | null): readonly Knoten[] {
  if (bezug === null) return [];
  return bezug.art === 'lv'
    ? bezug.zustand.leistungsverzeichnis.knoten
    : bezug.zustand.auftragsLeistungsverzeichnis.knoten;
}

/**
 * Die Wahl des LV für die Zuordnung: Ausschreibungs-LVs, dann Auftrags-LVs; ohne Muster-LVs (Ticket 122, PC-c2, wie D-116.6):
 * Zuordnungen an einem Muster-LV verwirft jede Übernahme (D-66 MUST 2), es wäre ein Ziel ohne Wirkung.
 */
export function bezugswahlenBauen(
  lvs: readonly LvUebersicht[],
  auftraege: readonly AuftragsLvUebersicht[],
): Bezugswahl[] {
  return [
    ...lvs
      .filter((l) => l.vorlage !== true)
      .map((l) => ({ schluessel: `lv:${l.id}`, label: texte.zuordnung.lv(l.name) })),
    ...auftraege.map((a) => ({ schluessel: `auftrag:${a.id}`, label: texte.zuordnung.auftrag(a.name) })),
  ];
}

export function useBezug(projektId: ProjektId): Bezugsstand {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [wahlen, setWahlen] = useState<readonly Bezugswahl[] | null>(null);
  const [schluessel, setSchluessel] = useState<string | undefined>(undefined);
  const [bezug, setBezug] = useState<Bezug | null>(null);
  const [lauf, setLauf] = useState(0);

  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  useEffect(() => {
    const abo = { aktiv: true };
    void (async () => {
      const [lvs, auftraege] = await Promise.all([
        u.speicher.leistungsverzeichnisse.auflisten(projektId),
        u.speicher.auftragsLeistungsverzeichnisse.auflisten(projektId),
      ]);
      const liste = bezugswahlenBauen(lvs.ok ? lvs.wert : [], auftraege.ok ? auftraege.wert : []);
      if (!abo.aktiv) return;
      setWahlen(liste);
      setSchluessel((s) =>
        s !== undefined && liste.some((w) => w.schluessel === s) ? s : liste[0]?.schluessel,
      );
    })();
    return () => {
      abo.aktiv = false;
    };
  }, [u, projektId, lauf]);

  useEffect(() => {
    let aktiv = true;
    if (schluessel === undefined) {
      setBezug(null);
      return;
    }
    const [art, id] = schluessel.split(/:(.*)/s) as [string, string];
    void (async (): Promise<Bezug | null> => {
      if (art === 'lv') {
        const r = await u.speicher.leistungsverzeichnisse.laden(id as LeistungsverzeichnisId);
        return r.ok ? { art: 'lv', zustand: r.wert } : null;
      }
      const r = await u.speicher.auftragsLeistungsverzeichnisse.laden(id as AuftragsLeistungsverzeichnisId);
      return r.ok ? { art: 'auftrag', zustand: r.wert } : null;
    })().then((b) => {
      if (aktiv) setBezug(b);
    });
    return () => {
      aktiv = false;
    };
  }, [u, schluessel, lauf]);

  const senden = useCallback(
    async (befehle: readonly BauteileZuordnen[]): Promise<boolean> => {
      if (bezug === null || befehle.length === 0) return false;
      let aus: Ausgang<unknown>[];
      if (bezug.art === 'lv') {
        const s = befehlswegFuer(u).lv(projektId, bezug.zustand);
        aus = await s.folge(befehle);
        const z = s.zustand;
        if (z !== null) setBezug({ art: 'lv', zustand: z });
      } else {
        const s = auftragsLvSitzung(u, projektId, bezug.zustand);
        aus = await s.folge(befehle);
        setBezug({ art: 'auftrag', zustand: s.zustand });
      }
      let ok = true;
      for (const a of aus) if (!pruefe(a)) ok = false;
      return ok;
    },
    [u, projektId, bezug, pruefe],
  );

  return { wahlen, schluessel, waehlen: setSchluessel, bezug, knoten: knotenDes(bezug), senden };
}
