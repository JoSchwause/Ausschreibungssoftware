// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleines Menü der Merkmale an der aktiven Position (F4, F5): Bedarf ohne/mit Gesamtbetrag, Wahl, Stundenlohn,
// Pauschal. Ein Dialog mit nativen Optionsfeldern: Tab wechselt, Leertaste kreuzt an, Enter übernimmt (U3, U8).
// Übernommen wird als genau ein Befehl (`PositionsmerkmaleSetzen`).

import { Button, Dialog } from '@tethys/ui-basis';
import type { Bedarf, Position } from '@tethys/vertrag';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { merkmalwahlVon, type Merkmalwahl } from './merkmale';
import { texte } from './texte';

const BEDARF: readonly { wert: Bedarf | null; label: string }[] = [
  { wert: null, label: texte.merkmale.keinBedarf },
  { wert: 'ohne-gesamtbetrag', label: texte.merkmale.bedarfOhne },
  { wert: 'mit-gesamtbetrag', label: texte.merkmale.bedarfMit },
];

export function MerkmaleDialog(props: {
  position: Position | null;
  onSchliessen: () => void;
  onUebernehmen: (position: Position, wahl: Merkmalwahl) => void;
}): ReactElement {
  const { position, onSchliessen, onUebernehmen } = props;
  const formId = useId();
  // Anfangsfokus auf „Übernehmen“: Enter bestätigt sofort, ohne vorher ins Formular zu müssen (Ticket 54, Punkt 6).
  const uebernehmenKnopf = useRef<HTMLButtonElement>(null);
  const [w, setW] = useState<Merkmalwahl | null>(null);
  useEffect(() => {
    setW(position ? merkmalwahlVon(position) : null);
  }, [position]);

  const titel = position
    ? `${texte.merkmale.titel}: ${[position.ordnungszahl, position.kurztext].filter(Boolean).join(' ')}`
    : texte.merkmale.titel;
  const schalter = (feld: 'wahl' | 'stundenlohn' | 'pauschal', label: string): ReactElement => (
    <label className="lv__option">
      <input
        type="checkbox"
        checked={w?.[feld] ?? false}
        onChange={(e) => {
          setW((alt) => (alt ? { ...alt, [feld]: e.target.checked } : alt));
        }}
      />
      {label}
    </label>
  );

  return (
    <Dialog
      offen={position !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={titel}
      anfangsfokus={uebernehmenKnopf}
      fuss={
        <>
          <Button onClick={onSchliessen}>{texte.merkmale.abbrechen}</Button>
          <Button ref={uebernehmenKnopf} type="submit" form={formId} variante="primaer">
            {texte.merkmale.uebernehmen}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="lv__merkmale"
        onSubmit={(e) => {
          e.preventDefault();
          if (position && w) onUebernehmen(position, w);
        }}
      >
        <fieldset>
          <legend>{texte.merkmale.bedarf}</legend>
          {BEDARF.map((b) => (
            <label key={b.label} className="lv__option">
              <input
                type="radio"
                name={`${formId}-bedarf`}
                checked={(w?.bedarf ?? null) === b.wert}
                onChange={() => {
                  setW((alt) => (alt ? { ...alt, bedarf: b.wert } : alt));
                }}
              />
              {b.label}
            </label>
          ))}
        </fieldset>
        {schalter('wahl', texte.merkmale.wahl)}
        {schalter('stundenlohn', texte.merkmale.stundenlohn)}
        {schalter('pauschal', texte.merkmale.pauschal)}
      </form>
    </Dialog>
  );
}
