// SPDX-License-Identifier: AGPL-3.0-or-later
// Verweis Kostenermittlung → Honorar (Ticket 155): die Honorarberechnungen, die eine Kostenermittlung lesen, als Verweise.
// Einhängestelle im Kopf der Kostenermittlung (`kosten/KostenermittlungSeite.tsx`, eine Zeile wie D-115). Ohne Honorar
// zeigt der Baustein nichts. Lädt neu, wenn sich die Kostenermittlung ändert (Undo und Redo eingeschlossen).

import type { Honorarberechnung, KostenermittlungId, ProjektId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { honorarberechnungPfad } from './pfad';
import { texte } from './texte';
import { honorareDerKostenermittlung, type Honorarverweis } from './verweise';

export function HonorarVerweise({
  projektId,
  kostenermittlungId,
  gehe,
}: {
  projektId: ProjektId;
  kostenermittlungId: KostenermittlungId;
  gehe: (pfad: string) => void;
}): ReactElement | null {
  const u = useUmgebung();
  const [verweise, setVerweise] = useState<readonly Honorarverweis[]>([]);
  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Honorarverweis[]> => {
      const liste = await u.speicher.honorarberechnungen.auflisten(projektId);
      if (!liste.ok) return [];
      const ganz: Honorarberechnung[] = [];
      for (const h of liste.wert) {
        const r = await u.speicher.honorarberechnungen.laden(h.id);
        if (r.ok) ganz.push(r.wert.honorarberechnung);
      }
      return honorareDerKostenermittlung(ganz, kostenermittlungId);
    })().then((v) => {
      if (aktiv) setVerweise(v);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, kostenermittlungId]);
  if (verweise.length === 0) return null;
  return (
    <>
      {verweise.map((h) => (
        <Verweis
          key={h.id}
          pfad={honorarberechnungPfad(projektId, h.id)}
          text={texte.verweis.zumHonorar(h.name)}
          gehe={gehe}
        />
      ))}
    </>
  );
}
