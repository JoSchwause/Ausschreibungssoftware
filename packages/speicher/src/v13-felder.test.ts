// SPDX-License-Identifier: AGPL-3.0-or-later
// Vertrag v1.3 in `speicher` (Ticket 57): Auftragnehmer und EPA-Bezeichnungen am Kopf von LV und Auftrags-LV,
// Mengenansatz an der Position. Was der Kern liefert, kommt verlustfrei zurück (Q5): Speichern → Laden, Undo,
// Papierkorb, LV-Stand, Projektdatei-Export → -Import.

import type { ChangeSet, Knoten, LvZustand, Position } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import {
  anlegenSchritte,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
  lvAnlegenChangeSet,
} from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { ausBaumNehmen, feldAendern, kopfAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';
import { ANSATZ, AUFTRAGNEHMER, EPA_BEZEICHNUNGEN } from './testhilfe/v13';

const f = ladeFixture('typisch');
const lv = f.lv.leistungsverzeichnis;
const P = f.projekt.id;

const positionen = (k: readonly Knoten[]): Position[] => k.filter((x): x is Position => x.art === 'position');
const erste = positionen(lv.knoten)[0] as Position;

/** Das Fixture mit allen drei neuen Feldern: am Kopf und an der ersten Position. */
const mitV13: LvZustand = {
  ...f.lv,
  leistungsverzeichnis: {
    ...lv,
    auftragnehmer: AUFTRAGNEHMER,
    epaBezeichnungen: EPA_BEZEICHNUNGEN,
    knoten: lv.knoten.map((k) => (k.id === erste.id ? { ...erste, mengenansatz: ANSATZ } : k)),
  },
};

let nr = 100;
async function schreibe(kern: SpeicherKern, cs: ChangeSet): Promise<void> {
  nr += 1;
  const aggregat =
    cs.art === 'auftrags-leistungsverzeichnis'
      ? ({ art: cs.art, id: cs.auftragsLeistungsverzeichnisId } as const)
      : ({ art: 'leistungsverzeichnis', id: lv.id } as const);
  wert(
    await kern.anwenden(eintrag(nr, P, aggregat, { art: 'LeistungsverzeichnisUmbenennen', name: 'x' }), cs),
  );
}

async function mitProjekt(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(f).slice(0, 1));
  return kern;
}

describe('Vertrag v1.3: neue Felder speichern', () => {
  it('Anlegen → Laden: Auftragnehmer, EPA-Bezeichnungen und Mengenansatz kommen zurück', async () => {
    const kern = await mitProjekt();
    await schreibe(kern, lvAnlegenChangeSet(mitV13));
    expect(wert(kern.lvLaden(lv.id))).toEqual(mitV13);
  });

  it('Mengenansatz setzen und entfernen, jeweils mit Undo', async () => {
    const kern = await mitProjekt();
    await schreibe(kern, lvAnlegenChangeSet(f.lv));
    const setzen = feldAendern(
      f.lv,
      erste.id,
      { ...erste, mengenansatz: ANSATZ, menge: '12.000' as never },
      '9.99',
    );
    await schreibe(kern, setzen);
    const gesetzt = wert(kern.lvLaden(lv.id));
    const mitAnsatz = positionen(gesetzt.leistungsverzeichnis.knoten)[0] as Position;
    expect(mitAnsatz.mengenansatz).toEqual(ANSATZ);
    await schreibe(kern, umkehren(setzen));
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);

    await schreibe(kern, setzen);
    const ohne: Position & { mengenansatz?: unknown } = { ...mitAnsatz };
    delete ohne.mengenansatz;
    const entfernen = feldAendern(gesetzt, erste.id, ohne, '9.98');
    await schreibe(kern, entfernen);
    expect(positionen(wert(kern.lvLaden(lv.id)).leistungsverzeichnis.knoten)[0]).toEqual(ohne);
    await schreibe(kern, umkehren(entfernen));
    expect(wert(kern.lvLaden(lv.id))).toEqual(gesetzt);
  });

  it('Kopf: Auftragnehmer und EPA-Bezeichnungen setzen und rückgängig machen', async () => {
    const kern = await mitProjekt();
    await schreibe(kern, lvAnlegenChangeSet(f.lv));
    const cs = kopfAendern(
      f.lv,
      { auftragnehmer: AUFTRAGNEHMER, epaBezeichnungen: EPA_BEZEICHNUNGEN },
      '1.11',
    );
    await schreibe(kern, cs);
    const z = wert(kern.lvLaden(lv.id));
    expect(z.leistungsverzeichnis.auftragnehmer).toEqual(AUFTRAGNEHMER);
    expect(z.leistungsverzeichnis.epaBezeichnungen).toEqual(EPA_BEZEICHNUNGEN);
    await schreibe(kern, umkehren(cs));
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
  });

  it('Papierkorb und LV-Stand tragen den Mengenansatz; Wiederherstellen bringt ihn zurück', async () => {
    const kern = await mitProjekt();
    await schreibe(kern, lvAnlegenChangeSet(mitV13));
    await schreibe(kern, standAnlegen(mitV13, 'stand-v13', 'Versand'));
    const inKorb = ausBaumNehmen(mitV13, [erste.id], { id: 'korb-v13', nummer: 1 });
    await schreibe(kern, inKorb);
    const z = wert(kern.lvLaden(lv.id));
    expect(z.papierkorb?.[0]?.knoten[0]).toEqual({ ...erste, mengenansatz: ANSATZ });
    expect(wert(kern.lvStandLaden('stand-v13' as never)).zustand).toEqual(mitV13);
    await schreibe(kern, umkehren(inKorb));
    expect(wert(kern.lvLaden(lv.id))).toEqual(mitV13);
  });

  it('Auftrags-LV und LV mit den neuen Feldern: Export → Import → Export ist byte-gleich', async () => {
    const kern = await mitProjekt();
    await speichere(kern, anlegenSchritte(f).slice(1)); // LV und Angebote
    const angebot = f.angebote[0]?.angebot.id;
    if (angebot === undefined) throw new Error('kein Angebot');
    const auftrag = auftragsLvAus(mitV13, angebot);
    await schreibe(kern, auftragsLvAnlegenChangeSet(auftrag));
    await schreibe(
      kern,
      kopfAendern(f.lv, { auftragnehmer: AUFTRAGNEHMER, epaBezeichnungen: EPA_BEZEICHNUNGEN }, '1.11'),
    );
    const text = wert(kern.projektdateiExportieren(P));
    const d = JSON.parse(text) as { auftragsLeistungsverzeichnisse: unknown[] };
    expect(d.auftragsLeistungsverzeichnisse[0]).toEqual(auftrag);
    const zweiter = await neuerKern();
    wert(await zweiter.kern.projektdateiImportieren(text));
    expect(wert(zweiter.kern.projektdateiExportieren(P)) === text).toBe(true);
    const geladen = wert(zweiter.kern.lvLaden(lv.id)).leistungsverzeichnis;
    expect(geladen.auftragnehmer).toEqual(AUFTRAGNEHMER);
    expect(geladen.epaBezeichnungen).toEqual(EPA_BEZEICHNUNGEN);
  });
});
