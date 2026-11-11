// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Inhalt der eingefrorenen Projektdatei der Schemaversion 3 (`fixtures/projektdatei-v3.json`), selbst
// verfasst (C4). Er beginnt mit dem Inhalt der Version 2 (`inhalt-v2.ts`) und bringt alles, was Version 3 neu kann:
// einen Papierkorb mit einem Eintrag (eine Position, auf die das Angebot weiter verweist, D-12; ein zweiter Eintrag
// wurde endgültig entfernt, die Nummer 1 bleibt), einen LV-Stand, der den Papierkorb trägt und nach dem das LV weiter
// geändert wurde, und im Protokoll `Rueckgaengig` und `Wiederholen`.
//
// Die ChangeSets entstehen aus dem jeweils gespeicherten Stand (wie die App sie vom Kern bekäme); deshalb wendet die
// Hilfe die Schritte selbst an. Die Beträge sind Speicherbeispiele (`speicher` rechnet nicht).

import type { Befehl, ChangeSet, LvZustand, Position, PositionId } from '@tethys/vertrag';
import type { SpeicherKern } from '../kern';
import { eintrag, type Schritt } from './fixtures';
import { inhaltV2, V2_LV, V2_PROJEKT } from './inhalt-v2';
import { wert } from './node';
import { ausBaumNehmen, eintragEntfernen, feldAendern, standAnlegen, umkehren } from './umkehrung';

const id = (n: number): string => `019b7700-0000-7000-8000-${String(n).padStart(12, '0')}`;
const pid = (n: number): PositionId => id(100 + n) as PositionId;
const HINWEIS = id(12);
export const V3_EINTRAG_1 = id(201);
const EINTRAG_2 = id(202);
export const V3_STAND = id(301);

/** Wendet die Befehlsfolge der Version 3 an (über `kern`) und liefert alle Schritte, Version 2 eingeschlossen. */
export async function schritteV3(kern: SpeicherKern): Promise<Schritt[]> {
  const schritte: Schritt[] = [];
  const schreibe = async (befehl: Befehl, changeSet: ChangeSet): Promise<Schritt> => {
    const s: Schritt = {
      eintrag: eintrag(schritte.length + 1, V2_PROJEKT, { art: 'leistungsverzeichnis', id: V2_LV }, befehl),
      changeSet,
    };
    wert(await kern.anwenden(s.eintrag, s.changeSet));
    schritte.push(s);
    return s;
  };
  for (const s of inhaltV2().schritte) {
    wert(await kern.anwenden(s.eintrag, s.changeSet));
    schritte.push(s);
  }
  const lv = (): LvZustand => wert(kern.lvLaden(V2_LV));
  const position = (n: number): Position =>
    lv().leistungsverzeichnis.knoten.find((k): k is Position => k.id === pid(n)) ??
    (() => {
      throw new Error(`Position ${String(n)} fehlt`);
    })();

  // Menge ändern, rückgängig machen, wiederholen.
  const menge = feldAendern(lv(), pid(1), { ...position(1), menge: '12.000' as Position['menge'] }, '540.00');
  const original = await schreibe(
    { art: 'MengeAendern', positionId: pid(1), menge: '12.000' as never },
    menge,
  );
  await schreibe({ art: 'Rueckgaengig', protokollId: original.eintrag.id }, umkehren(menge));
  await schreibe({ art: 'Wiederholen', protokollId: original.eintrag.id }, menge);

  // Zwei Einträge in den Papierkorb, der zweite (ohne Angebotsverweis) wird endgültig entfernt.
  await schreibe(
    { art: 'KnotenInPapierkorbLegen', eintragId: V3_EINTRAG_1 as never, knotenIds: [pid(7)] },
    ausBaumNehmen(lv(), [pid(7)], { id: V3_EINTRAG_1, nummer: 1 }),
  );
  await schreibe(
    { art: 'KnotenInPapierkorbLegen', eintragId: EINTRAG_2 as never, knotenIds: [HINWEIS as never] },
    ausBaumNehmen(lv(), [HINWEIS], { id: EINTRAG_2, nummer: 2 }),
  );
  const zweiter = lv().papierkorb?.find((e) => e.id === EINTRAG_2);
  if (zweiter === undefined) throw new Error('Eintrag 2 fehlt');
  await schreibe(
    { art: 'PapierkorbeintragEntfernen', eintragId: zweiter.id },
    eintragEntfernen(lv(), zweiter),
  );

  // Ein Stand, danach wird das LV weiter geändert.
  await schreibe(
    { art: 'LvStandAnlegen', id: V3_STAND as never, name: 'Versand' },
    standAnlegen(lv(), V3_STAND, 'Versand'),
  );
  await schreibe(
    { art: 'MengeAendern', positionId: pid(2), menge: '3.000' as never },
    feldAendern(lv(), pid(2), { ...position(2), menge: '3.000' as Position['menge'] }, '150.00'),
  );
  return schritte;
}
