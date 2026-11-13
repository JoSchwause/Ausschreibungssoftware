// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog mit einem kleinen Formular der Projektseiten; Enter im Feld übernimmt.

import { Button, Dialog } from '@tethys/ui-basis';
import { useId } from 'react';
import type { ReactElement } from 'react';
import { texte } from './texte';

export function FormDialog(props: {
  offen: boolean;
  titel: string;
  onSchliessen: () => void;
  onSenden: () => void;
  children: ReactElement | ReactElement[];
}): ReactElement {
  const formId = useId();
  return (
    <Dialog
      offen={props.offen}
      onOffenChange={(o) => {
        if (!o) props.onSchliessen();
      }}
      titel={props.titel}
      fuss={
        <>
          <Button onClick={props.onSchliessen}>{texte.projekt.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {texte.projekt.speichern}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSenden();
        }}
      >
        {props.children}
      </form>
    </Dialog>
  );
}
