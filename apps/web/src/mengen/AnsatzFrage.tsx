// SPDX-License-Identifier: AGPL-3.0-or-later
// Rückfrage „Mengenansatz wird entfernt“ (D-22 (a), Q5): Wer die Menge einer Position mit Ansatz direkt ändert, entfernt
// den Ansatz. Vorher fragt die App; Abbrechen lässt alles unverändert, es geht dann kein Befehl hinaus.

import { Button, Dialog } from '@tethys/ui-basis';
import type { Knoten, LvBefehl, Position } from '@tethys/vertrag';
import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ansatzEntfernungen } from './rueckfrage';
import { texte } from './texte';

interface Offen {
  readonly positionen: readonly Position[];
  readonly entscheide: (ja: boolean) => void;
}

const name = (p: Position): string =>
  [p.ordnungszahl, p.kurztext].filter(Boolean).join(' ') || 'der Position';

export interface AnsatzFrage {
  /**
   * Ruft `weiter` auf, sobald nichts mehr zu fragen ist: sofort (im selben Aufruf), wenn kein Mengenansatz verloren
   * ginge, sonst nach der Bestätigung. Bei Abbrechen wird `weiter` nie aufgerufen.
   */
  readonly vor: (
    knoten: readonly Knoten[],
    befehle: readonly LvBefehl[],
    weiter: () => void,
    abbruch?: () => void,
  ) => void;
  /** Wie `vor`, als Versprechen: `true` heißt weitermachen, `false` abgebrochen. */
  readonly pruefen: (knoten: readonly Knoten[], befehle: readonly LvBefehl[]) => Promise<boolean>;
  /** Der Dialog; irgendwo im Baum der Seite einzusetzen (er rendert nur, solange gefragt wird). */
  readonly dialog: ReactElement;
}

export function useAnsatzFrage(): AnsatzFrage {
  const [offen, setOffen] = useState<Offen | null>(null);
  const abbrechen = useRef<HTMLButtonElement>(null);

  const vor = useCallback(
    (
      knoten: readonly Knoten[],
      befehle: readonly LvBefehl[],
      weiter: () => void,
      abbruch?: () => void,
    ): void => {
      const betroffen = ansatzEntfernungen(knoten, befehle);
      if (betroffen.length === 0) {
        weiter();
        return;
      }
      setOffen({
        positionen: betroffen,
        entscheide: (ja) => {
          setOffen(null);
          if (ja) weiter();
          else abbruch?.();
        },
      });
    },
    [],
  );
  const pruefen = useCallback(
    (knoten: readonly Knoten[], befehle: readonly LvBefehl[]): Promise<boolean> =>
      new Promise<boolean>((fertig) => {
        vor(
          knoten,
          befehle,
          () => {
            fertig(true);
          },
          () => {
            fertig(false);
          },
        );
      }),
    [vor],
  );

  const t = texte.rueckfrage;
  const dialog = (
    <Dialog
      offen={offen !== null}
      onOffenChange={(o) => {
        if (!o) offen?.entscheide(false);
      }}
      titel={t.titel}
      beschreibung={
        offen === null
          ? ''
          : `${
              offen.positionen.length === 1 && offen.positionen[0] !== undefined
                ? t.einzeln(name(offen.positionen[0]))
                : t.mehrere(offen.positionen.length)
            } ${t.rueckgaengig}`
      }
      anfangsfokus={abbrechen}
      fuss={
        <>
          <Button
            ref={abbrechen}
            onClick={() => {
              offen?.entscheide(false);
            }}
          >
            {t.abbrechen}
          </Button>
          <Button
            variante="primaer"
            onClick={() => {
              offen?.entscheide(true);
            }}
          >
            {t.bestaetigen}
          </Button>
        </>
      }
    />
  );
  return { vor, pruefen, dialog };
}
