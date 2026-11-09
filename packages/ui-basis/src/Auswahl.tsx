// SPDX-License-Identifier: AGPL-3.0-or-later
import * as Select from '@radix-ui/react-select';
import { useId } from 'react';
import type { ReactElement } from 'react';
import { Icon } from './Icon';
import { baustein } from './texte';

export interface AuswahlOption {
  /** Technischer Wert; darf nicht leer sein (Radix-Vorgabe). */
  wert: string;
  label: string;
  deaktiviert?: boolean;
}

export interface AuswahlProps {
  label: string;
  optionen: readonly AuswahlOption[];
  /** Gewählter Wert; `undefined` zeigt den Platzhalter. */
  wert: string | undefined;
  onWertChange: (wert: string) => void;
  platzhalter?: string;
  kompakt?: boolean;
  deaktiviert?: boolean;
}

/** Auswahlliste auf Radix Select: Enter/Leertaste/Pfeil öffnet, Pfeile wählen, Escape schließt. */
export function Auswahl({
  label,
  optionen,
  wert,
  onWertChange,
  platzhalter = baustein.auswahlPlatzhalter,
  kompakt,
  deaktiviert,
}: AuswahlProps): ReactElement {
  const id = useId();
  return (
    <div className={kompakt ? 'tx-feld tx-feld--kompakt' : 'tx-feld'}>
      <label className="tx-feld__label" htmlFor={id}>
        {label}
      </label>
      <Select.Root
        {...(wert === undefined ? {} : { value: wert })}
        onValueChange={onWertChange}
        disabled={deaktiviert ?? false}
      >
        <Select.Trigger id={id} className="tx-auswahl">
          <Select.Value placeholder={platzhalter} />
          <Select.Icon className="tx-auswahl__pfeil">
            <Icon name="pfeilUnten" groesse={14} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="tx-auswahl__inhalt" position="popper" sideOffset={2}>
            <Select.Viewport className="tx-auswahl__viewport">
              {optionen.map((o) => (
                <Select.Item
                  key={o.wert}
                  value={o.wert}
                  disabled={o.deaktiviert ?? false}
                  className="tx-auswahl__option"
                >
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator className="tx-auswahl__haken">
                    <Icon name="haken" groesse={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
