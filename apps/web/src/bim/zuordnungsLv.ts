// SPDX-License-Identifier: AGPL-3.0-or-later
// Das LV, auf das sich Zuordnung, Färbung und Aufmaßblatt der Modellseite beziehen (Ticket 115, D-52): ein
// Ausschreibungs-LV oder ein Auftrags-LV des Projekts. `BauteileZuordnen` ist an beiden ein Befehl; geschrieben wird über
// die Sitzungen des Befehlswegs (ein Undo-Schritt je Aktion). Nach Rückgängig/Wiederholen lädt das LV neu. Seit Ticket 155 heißt
// es „LV für Zuordnung“ statt „Bezug“ (L2: „Bezug“ ist in den Kennwerten die Bezugsgröße).

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

export interface ZuordnungsLvWahl {
  /** `lv:<id>` oder `auftrag:<id>`. */
  readonly schluessel: string;
  readonly label: string;
}

export type ZuordnungsLv =
  | { readonly art: 'lv'; readonly zustand: LvZustand }
  | { readonly art: 'auftrag'; readonly zustand: AuftragsLvZustand };

export interface ZuordnungsLvStand {
  /** `null`, solange die Liste lädt. */
  readonly wahlen: readonly ZuordnungsLvWahl[] | null;
  readonly schluessel: string | undefined;
  readonly waehlen: (schluessel: string) => void;
  readonly lv: ZuordnungsLv | null;
  readonly knoten: readonly Knoten[];
  /** Schreibt die Befehle als einen Undo-Schritt; `true`, wenn alle angenommen wurden. */
  readonly senden: (befehle: readonly BauteileZuordnen[]) => Promise<boolean>;
}

export function knotenDes(lv: ZuordnungsLv | null): readonly Knoten[] {
  if (lv === null) return [];
  return lv.art === 'lv'
    ? lv.zustand.leistungsverzeichnis.knoten
    : lv.zustand.auftragsLeistungsverzeichnis.knoten;
}

/**
 * Die Wahl des LV für die Zuordnung: Ausschreibungs-LVs, dann Auftrags-LVs; ohne Muster-LVs (Ticket 122, PC-c2, wie D-116.6):
 * Zuordnungen an einem Muster-LV verwirft jede Übernahme (D-66 MUST 2), es wäre ein Ziel ohne Wirkung.
 */
export function zuordnungsLvWahlen(
  lvs: readonly LvUebersicht[],
  auftraege: readonly AuftragsLvUebersicht[],
): ZuordnungsLvWahl[] {
  return [
    ...lvs
      .filter((l) => l.vorlage !== true)
      .map((l) => ({ schluessel: `lv:${l.id}`, label: texte.zuordnung.lv(l.name) })),
    ...auftraege.map((a) => ({ schluessel: `auftrag:${a.id}`, label: texte.zuordnung.auftrag(a.name) })),
  ];
}

export function useZuordnungsLv(projektId: ProjektId): ZuordnungsLvStand {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [wahlen, setWahlen] = useState<readonly ZuordnungsLvWahl[] | null>(null);
  const [schluessel, setSchluessel] = useState<string | undefined>(undefined);
  const [lv, setLv] = useState<ZuordnungsLv | null>(null);
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
      const liste = zuordnungsLvWahlen(lvs.ok ? lvs.wert : [], auftraege.ok ? auftraege.wert : []);
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
      setLv(null);
      return;
    }
    const [art, id] = schluessel.split(/:(.*)/s) as [string, string];
    void (async (): Promise<ZuordnungsLv | null> => {
      if (art === 'lv') {
        const r = await u.speicher.leistungsverzeichnisse.laden(id as LeistungsverzeichnisId);
        return r.ok ? { art: 'lv', zustand: r.wert } : null;
      }
      const r = await u.speicher.auftragsLeistungsverzeichnisse.laden(id as AuftragsLeistungsverzeichnisId);
      return r.ok ? { art: 'auftrag', zustand: r.wert } : null;
    })().then((b) => {
      if (aktiv) setLv(b);
    });
    return () => {
      aktiv = false;
    };
  }, [u, schluessel, lauf]);

  const senden = useCallback(
    async (befehle: readonly BauteileZuordnen[]): Promise<boolean> => {
      if (lv === null || befehle.length === 0) return false;
      let aus: Ausgang<unknown>[];
      if (lv.art === 'lv') {
        const s = befehlswegFuer(u).lv(projektId, lv.zustand);
        aus = await s.folge(befehle);
        const z = s.zustand;
        if (z !== null) setLv({ art: 'lv', zustand: z });
      } else {
        const s = auftragsLvSitzung(u, projektId, lv.zustand);
        aus = await s.folge(befehle);
        setLv({ art: 'auftrag', zustand: s.zustand });
      }
      let ok = true;
      for (const a of aus) if (!pruefe(a)) ok = false;
      return ok;
    },
    [u, projektId, lv, pruefe],
  );

  return { wahlen, schluessel, waehlen: setSchluessel, lv, knoten: knotenDes(lv), senden };
}
