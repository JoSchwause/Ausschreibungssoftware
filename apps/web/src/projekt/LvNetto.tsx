// SPDX-License-Identifier: AGPL-3.0-or-later
// Netto eines LV in der Liste der Projektseite (Review Welle 5, P3). Die Liste kommt aus `leistungsverzeichnisse.auflisten`
// (`LvUebersicht`, ohne Summen, D-53.1); ein Netto gibt es nur aus dem ganzen LV. Darum lädt die Seite es erst, wenn die
// Zeile sichtbar wird, und nur einmal je Stand der Liste. Kommt das Netto einmal mit der Übersicht (Typfrage 1 aus Ticket 53),
// entfällt dieses Nachladen.

import type { Betrag, LeistungsverzeichnisId } from '@tethys/vertrag';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { formatiereBetragDe } from '../lv/zahlen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { texte } from './texte';

/**
 * Netto je LV, nachgeladen; `null`: das LV ließ sich nicht laden. `neu()` verwirft alles (neuer Stand der Liste); `stand`
 * zählt die Stände, als Schlüssel der Zellen, damit eine Zelle, deren Laden verworfen wurde, neu beginnt.
 */
export function useLvNetto(): {
  netto: ReadonlyMap<LeistungsverzeichnisId, Betrag | null>;
  nachladen: (id: LeistungsverzeichnisId) => void;
  neu: () => void;
  stand: number;
} {
  const u = useUmgebung();
  const [netto, setNetto] = useState<ReadonlyMap<LeistungsverzeichnisId, Betrag | null>>(new Map());
  const [standZahl, setStandZahl] = useState(0);
  // Ein Ergebnis aus einem älteren Stand der Liste (vor Undo/Redo oder einer Änderung) zählt nicht mehr.
  const stand = useRef(0);
  const unterwegs = useRef(new Set<LeistungsverzeichnisId>());

  const nachladen = useCallback(
    (id: LeistungsverzeichnisId) => {
      if (unterwegs.current.has(id)) return;
      unterwegs.current.add(id);
      const meiner = stand.current;
      void u.speicher.leistungsverzeichnisse.laden(id).then((r) => {
        if (meiner !== stand.current) return;
        unterwegs.current.delete(id);
        setNetto((alt) => new Map(alt).set(id, r.ok ? r.wert.summen.gesamt.netto : null));
      });
    },
    [u],
  );
  const neu = useCallback(() => {
    stand.current++;
    unterwegs.current = new Set();
    setNetto(new Map());
    setStandZahl(stand.current);
  }, []);
  return { netto, nachladen, neu, stand: standZahl };
}

/** Die Zelle „Netto“: lädt das LV, sobald sie sichtbar ist (ohne `IntersectionObserver` sofort). */
export function LvNetto({
  id,
  name,
  netto,
  nachladen,
}: {
  id: LeistungsverzeichnisId;
  name: string;
  /** `undefined`: noch nicht geladen. */
  netto: Betrag | null | undefined;
  nachladen: (id: LeistungsverzeichnisId) => void;
}): ReactElement {
  const zelle = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = zelle.current;
    if (netto !== undefined || el === null) return;
    if (typeof IntersectionObserver === 'undefined') {
      nachladen(id);
      return;
    }
    const beobachter = new IntersectionObserver((eintraege) => {
      if (!eintraege.some((e) => e.isIntersecting)) return;
      beobachter.disconnect();
      nachladen(id);
    });
    beobachter.observe(el);
    return () => {
      beobachter.disconnect();
    };
  }, [id, netto, nachladen]);
  return (
    <span
      ref={zelle}
      className="projekt__betrag"
      aria-label={`${texte.lvs.netto} ${name}`}
      aria-busy={netto === undefined}
    >
      {netto === undefined ? texte.lvs.nettoLaedt : netto === null ? '–' : `${formatiereBetragDe(netto)} €`}
    </span>
  );
}
