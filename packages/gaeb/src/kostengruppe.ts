// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppe der Position als GAEB-Katalogzuordnung (Ticket 84, C2; D-36 (4)). In GAEB nennt `BoQInfo/Ctlg` einen
// Katalog (Kennung, Art, Name), und eine Position verweist mit `CtlgAssign` (Kennung des Katalogs, Code) darauf. Die
// Kostengruppe ist der Code einer Zuordnung zu einem Katalog der Art „cost group DIN 276 …“; nur die Nummer, keine
// Bezeichnung (G-16). X84 kennt keine Kataloge (XSD), ein Angebot trägt keine Kostengruppe.
//
// Lesarten (Entscheidungen D-84.x in Ticket 84):
// - Gelesen werden die Ausgaben der DIN 276 mit dreistelliger Gliederung 100 bis 800 (2006, 2008, 2018), deren Nummern
//   die Ableitung aus den Ziffern trägt (D-24). Andere Ausgaben und andere Katalogarten sind Befund, nichts wird erfunden.
// - Geschrieben wird ein Katalog `DIN276` mit der neuesten Ausgabe, die das Schema der Version kennt.

import { KOSTENGRUPPENNUMMER_MUSTER } from '@tethys/vertrag';
import type { Kostengruppennummer, PositionId } from '@tethys/vertrag';
import type { Leser } from './lesen';
import { elementKinder, textInhalt } from './xml';
import type { XmlElement } from './xml';

// Eigene kleine Helfer statt der aus `lesen.ts`: `lesen.ts` importiert dieses Modul (kein Kreis zur Ladezeit).
const kinder = (e: XmlElement | undefined, name: string): XmlElement[] =>
  e ? elementKinder(e).filter((k) => k.name === name) : [];
const kind = (e: XmlElement | undefined, name: string): XmlElement | undefined => kinder(e, name)[0];
const wert = (e: XmlElement | undefined): string | null => (e ? textInhalt(e).trim() : null);

/** Kennung, Name und Art des Katalogs, den der Writer schreibt (`tgCtlgID`, `tgCtlgName`, `tgCtlgType`). */
export const KG_KATALOG_ID = 'DIN276';
export const KG_KATALOG_NAME = 'DIN 276';
export const KG_KATALOGART: Readonly<Record<'3.3' | '3.2', string>> = {
  '3.3': 'cost group DIN 276 2018-12',
  '3.2': 'cost group DIN 276-1 2008-12',
};
/** Katalogarten, deren Codes der Leser als Kostengruppe übernimmt. */
const LESBAR: ReadonlySet<string> = new Set([
  'cost group DIN 276-06',
  'cost group DIN 276-1 2008-12',
  'cost group DIN 276 2018-12',
]);
const DIN_276 = 'cost group DIN 276';

/** Form einer Kostengruppennummer (Marke `Kostengruppennummer`): das Muster des Vertrags (`KOSTENGRUPPENNUMMER_MUSTER`, D-87). */
export const istKostengruppe = (s: string): s is Kostengruppennummer => KOSTENGRUPPENNUMMER_MUSTER.test(s);

/** Die Kataloge einer Datei: Kennungen der Kostengruppenkataloge und die Art der übrigen. */
export interface Kataloge {
  readonly kostengruppen: ReadonlySet<string>;
  readonly andere: ReadonlyMap<string, string>;
}

export const KEINE_KATALOGE: Kataloge = { kostengruppen: new Set(), andere: new Map() };

/** `BoQInfo/Ctlg` → Kataloge; meldet Kataloge, deren Zuordnungen nicht übernommen werden. */
export function katalogeLesen(l: Leser, boqInfo: XmlElement | undefined): Kataloge {
  const kostengruppen = new Set<string>();
  const andere = new Map<string, string>();
  for (const c of kinder(boqInfo, 'Ctlg')) {
    l.restMelden(c, new Set(['CtlgID', 'CtlgType', 'CtlgName', 'CtlgAssignType']), 'BoQInfo/Ctlg');
    const id = wert(kind(c, 'CtlgID')) ?? '';
    const art = wert(kind(c, 'CtlgType')) ?? '';
    if (LESBAR.has(art)) {
      kostengruppen.add(id);
      continue;
    }
    andere.set(id, art);
    if (art.startsWith(DIN_276))
      l.melde(
        'warnung',
        'katalog-nicht-abgebildet',
        `Der Katalog „${wert(kind(c, 'CtlgName')) ?? id}“ gliedert nach ${art}; übernommen werden nur die Ausgaben ` +
          '2006, 2008 und 2018 der DIN 276. Seine Zuordnungen werden nicht als Kostengruppe übernommen.',
        c,
      );
    else l.nichtAbgebildet(c, `BoQInfo/Ctlg (${art})`, 'übernommen werden nur Kostengruppen nach DIN 276');
  }
  return { kostengruppen, andere };
}

/**
 * Die Kostengruppe aus den `CtlgAssign` einer Position (`Item`, `MarkupItem`), oder `undefined`. Zuordnungen zu anderen
 * Katalogen sind Befund; eine Zuordnung mit Menge (Aufteilung), ein Code, der keine Kostengruppennummer ist, und eine
 * zweite Kostengruppe werden nicht übernommen (Befund).
 */
export function kostengruppeLesen(
  l: Leser,
  el: XmlElement,
  k: Kataloge,
  id: PositionId,
): Kostengruppennummer | undefined {
  let kg: Kostengruppennummer | undefined;
  for (const a of kinder(el, 'CtlgAssign')) {
    const katalog = wert(kind(a, 'CtlgID')) ?? '';
    const code = wert(kind(a, 'CtlgCode')) ?? '';
    if (!k.kostengruppen.has(katalog)) {
      const art = k.andere.get(katalog);
      l.nichtAbgebildet(
        a,
        `${el.name}/CtlgAssign (${art ?? 'ohne Katalog'})`,
        art === undefined
          ? 'der Katalog steht nicht im Kopf des Leistungsverzeichnisses'
          : 'übernommen werden nur Zuordnungen zu Kostengruppen nach DIN 276',
      );
      continue;
    }
    const ort = { knotenId: id, feld: 'kostengruppe' };
    if (kind(a, 'Quantity')) {
      l.melde(
        'warnung',
        'kostengruppe-anteil',
        `Die Zuordnung zur Kostengruppe ${code} nennt eine Menge (Quantity); eine Position trägt eine Kostengruppe ganz, ` +
          'die Zuordnung wird nicht übernommen.',
        a,
        ort,
      );
      continue;
    }
    if (!istKostengruppe(code)) {
      l.melde(
        'warnung',
        'kostengruppe-ungueltig',
        `„${code}“ ist keine Kostengruppennummer (drei Ziffern, die erste nicht 0); die Zuordnung wird nicht übernommen.`,
        a,
        ort,
      );
      continue;
    }
    if (kg !== undefined) {
      l.melde(
        'warnung',
        'kostengruppe-mehrfach',
        `Die Position ist den Kostengruppen ${kg} und ${code} zugeordnet; übernommen wird ${kg}, eine Position trägt eine.`,
        a,
        ort,
      );
      continue;
    }
    kg = code;
  }
  return kg;
}
