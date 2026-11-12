// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 89 auf der LV-Seite (D-20, Review Welle 5, S12): Kostengruppen mehrerer Positionen (Strg+Alt+G) und
// EP-Kalkulation einer Position (Strg+Alt+K). Die Fachlogik der Einhängestelle steht hier; `lv/LvSeite.tsx` gibt nur
// LV, aktive Zeile und den Befehlsweg herein und setzt Knöpfe, Tastenkürzel und Dialoge an markierten Stellen ein.

import { Button, Tastenkuerzel, useToast } from '@tethys/ui-basis';
import type { KnotenId, Leistungsverzeichnis, LvBefehl, Position, PositionId } from '@tethys/vertrag';
import { useMemo, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import type { Ausgang } from '../lv/befehlsweg';
import { KalkulationsDialog } from './KalkulationsDialog';
import { KostengruppenDialog } from './KostengruppenDialog';
import { positionenInReihenfolge } from './kostengruppe';
import { texte } from './texte';

export interface LvKostenEingang {
  readonly lv: Leistungsverzeichnis;
  /** Die aktive Zeile des Grids. */
  readonly aktiv: RefObject<KnotenId | null>;
  /** Befehle als ein Undo-Schritt, mit ihrem Ausgang (wie `folge` der LV-Seite). */
  readonly folge: (bs: readonly LvBefehl[]) => Promise<Ausgang<unknown>[]>;
  /** Meldet eine Abweisung als Toast; `true`, wenn der Befehl angenommen wurde. */
  readonly pruefe: (a: Ausgang<unknown>) => boolean;
}

export interface LvKosten {
  /** Die Knöpfe der Werkzeugleiste. */
  readonly knoepfe: ReactElement;
  /** Die Tastenkürzel mit Strg+Alt, nach `KeyboardEvent.code`. */
  readonly tasten: Readonly<Record<'KeyG' | 'KeyK', () => void>>;
  /** Die Mehrfachauswahl des Grids (`onAuswahlChange`), Vorauswahl der Kostengruppen. */
  readonly auswahlAendern: (ids: readonly KnotenId[]) => void;
  readonly dialoge: ReactElement;
}

export function useLvKosten({ lv, aktiv, folge, pruefe }: LvKostenEingang): LvKosten {
  const { zeige } = useToast();
  const [kgOffen, setKgOffen] = useState(false);
  const [kalkulation, setKalkulation] = useState<Position | null>(null);
  const auswahl = useRef<readonly KnotenId[]>([]);

  // Je Aktion ein Undo-Schritt, Meldungen wie überall.
  const senden = async (bs: readonly LvBefehl[]): Promise<boolean> => {
    const aus = await folge(bs);
    let ok = true;
    for (const a of aus) if (!pruefe(a)) ok = false;
    return ok;
  };
  const kgOeffnen = (): void => {
    setKgOffen(true);
  };
  const kalkulationOeffnen = (): void => {
    const k = aktiv.current === null ? undefined : lv.knoten.find((x) => x.id === aktiv.current);
    if (k?.art === 'position') setKalkulation(k);
    else zeige({ titel: texte.kalkulation.keinePosition, beschreibung: texte.kalkulation.keinePositionText });
  };
  const kgPositionen = useMemo(
    () => (kgOffen ? positionenInReihenfolge(lv.id, lv.knoten) : []),
    [kgOffen, lv.id, lv.knoten],
  );

  return {
    knoepfe: (
      <>
        <Button onClick={kgOeffnen} aria-keyshortcuts="Control+Alt+G">
          {texte.zuordnung.knopf} <Tastenkuerzel tasten={['Strg', 'Alt', 'G']} />
        </Button>
        <Button onClick={kalkulationOeffnen} aria-keyshortcuts="Control+Alt+K">
          {texte.kalkulation.knopf} <Tastenkuerzel tasten={['Strg', 'Alt', 'K']} />
        </Button>
      </>
    ),
    tasten: { KeyG: kgOeffnen, KeyK: kalkulationOeffnen },
    auswahlAendern: (ids) => {
      auswahl.current = ids;
    },
    dialoge: (
      <>
        <KostengruppenDialog
          offen={kgOffen}
          onSchliessen={() => {
            setKgOffen(false);
          }}
          projektId={lv.projektId}
          positionen={kgPositionen}
          vorauswahl={auswahl.current as readonly string[] as readonly PositionId[]}
          senden={senden}
        />
        <KalkulationsDialog
          position={kalkulation}
          epaBezeichnungenGesetzt={lv.epaBezeichnungen !== undefined}
          onSchliessen={() => {
            setKalkulation(null);
          }}
          senden={senden}
        />
      </>
    ),
  };
}
