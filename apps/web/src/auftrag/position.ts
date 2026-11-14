// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 151 (B-17): die Angaben einer Position des Auftrags-LV für den Positionsdialog „nur lesen“. Zahlen nur am Rand in
// de-DE (N4), der Gesamtpreis aus den Summen des Kerns (N1); nichts wird hier gerechnet.

import {
  formatiereBetragDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
} from '@tethys/dezimal';
import type { AuftragsLvZustand, Langtext, Position, PositionId } from '@tethys/vertrag';
import { ozText } from '../lv/oztext';
import { texte } from './texte';

const t = texte.position;
const LEER = '–';

export interface Positionsangaben {
  readonly titel: string;
  readonly zeilen: readonly { readonly label: string; readonly wert: string }[];
  readonly langtext: Langtext;
}

function merkmale(p: Position): string {
  const m = p.merkmale;
  const teile: string[] = [];
  if (m.bedarf === 'ohne-gesamtbetrag') teile.push(t.bedarfOhne);
  if (m.bedarf === 'mit-gesamtbetrag') teile.push(t.bedarfMit);
  if (m.wahl !== null && m.wahl.variante !== null && m.wahl.variante > 0) teile.push(t.wahl);
  if (m.stundenlohn) teile.push(t.stundenlohn);
  if (m.pauschal) teile.push(t.pauschal);
  if (p.zuschlag !== null) teile.push(t.zuschlagsposition);
  return teile.length === 0 ? t.keine : teile.join(', ');
}

/** Angaben der Position `id`; `null`: keine Position dieser Kennung im Auftrags-LV. */
export function positionsangaben(z: AuftragsLvZustand, id: PositionId): Positionsangaben | null {
  const p = z.auftragsLeistungsverzeichnis.knoten.find(
    (k): k is Position => k.art === 'position' && k.id === id,
  );
  if (p === undefined) return null;
  const gp = z.summen.positionen.find((s) => s.positionId === id)?.gesamtpreis ?? null;
  const oz = ozText(p);
  const preis =
    p.zuschlag === null
      ? {
          label: t.einheitspreis,
          wert: p.einheitspreis === null ? LEER : `${formatiereEinheitspreisDe(p.einheitspreis)} €`,
        }
      : {
          label: t.zuschlagssatz,
          wert: p.zuschlag.prozentsatz === null ? LEER : `${formatiereProzentDe(p.zuschlag.prozentsatz)} %`,
        };
  return {
    titel: [oz, p.kurztext].filter((x) => x !== '').join(' ') || t.titel,
    zeilen: [
      { label: t.oz, wert: oz === '' ? LEER : oz },
      { label: t.kurztext, wert: p.kurztext === '' ? LEER : p.kurztext },
      { label: t.menge, wert: p.menge === null ? LEER : formatiereMengeDe(p.menge) },
      { label: t.einheit, wert: p.einheit ?? LEER },
      preis,
      { label: t.gesamtpreis, wert: gp === null ? LEER : `${formatiereBetragDe(gp)} €` },
      { label: t.merkmale, wert: merkmale(p) },
      ...(p.kostengruppe === undefined ? [] : [{ label: t.kostengruppe, wert: p.kostengruppe }]),
    ],
    langtext: p.langtext,
  };
}
