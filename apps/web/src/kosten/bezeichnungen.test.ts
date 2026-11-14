// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 150: Die Bezeichnungen der Kostengruppen liegen in den Einstellungen des Speichers, nicht mehr im Browserspeicher.
// Wellen-Review SB2/PB4 (Q5): Ein Schreibfehler geht nicht verloren, eine CSV ohne lesbare Zeile löscht nichts.
import type { Speicher } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { EinstellungenSitzung } from '../historie/einstellungen';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { bezeichnungenAusCsv, bezeichnungenGemerkt, bezeichnungenMerken } from './bezeichnungen';

const CSV = 'Nummer;Bezeichnung\n340;Innen; und "Trenn"wände\n330;Wände\n';

describe('Bezeichnungen der Kostengruppen', () => {
  it('merkt die Bezeichnungen der CSV in den Einstellungen und vergisst sie wieder', async () => {
    const s = new EinstellungenSitzung(testUmgebung(await speicherImSpeicher()));
    await s.laden();
    expect(bezeichnungenGemerkt()).toBeNull();
    expect(await bezeichnungenMerken(CSV)).toEqual({ art: 'gemerkt', anzahl: 2 });
    expect(s.zustand.kostengruppenbezeichnungen).toEqual([
      { nummer: '330', bezeichnung: 'Wände' },
      { nummer: '340', bezeichnung: 'Innen' },
    ]);
    // Der gemerkte Text liest sich wieder zu denselben Bezeichnungen, auch mit Trennzeichen und Anführungszeichen im Text.
    await s.befehl({
      art: 'KostengruppenbezeichnungenSetzen',
      bezeichnungen: [{ nummer: '330' as never, bezeichnung: 'Wände; "außen"' }],
    });
    expect([...bezeichnungenAusCsv(bezeichnungenGemerkt())]).toEqual([['330', 'Wände; "außen"']]);
    expect(await bezeichnungenMerken(null)).toEqual({ art: 'gemerkt', anzahl: 0 });
    expect(s.zustand.kostengruppenbezeichnungen).toEqual([]);
    expect(bezeichnungenGemerkt()).toBeNull();
  });

  it('eine CSV ohne lesbare Zeile schreibt nichts: die vorhandenen Bezeichnungen bleiben', async () => {
    const s = new EinstellungenSitzung(testUmgebung(await speicherImSpeicher()));
    await s.laden();
    await bezeichnungenMerken(CSV);
    expect(await bezeichnungenMerken('Nummer;Bezeichnung\nkaputt;x\n')).toEqual({ art: 'leer' });
    expect(await bezeichnungenMerken('')).toEqual({ art: 'leer' });
    expect(s.zustand.kostengruppenbezeichnungen).toHaveLength(2);
  });

  it('ein Schreibfehler des Speichers kommt beim Aufrufer an, statt als Erfolg zu gelten', async () => {
    const innen = await speicherImSpeicher();
    const repo = innen.einstellungen;
    if (repo === undefined) throw new Error('Speicher ohne Einstellungen');
    const speicher: Speicher = {
      ...innen,
      einstellungen: {
        ...repo,
        laden: () => repo.laden(),
        protokoll: () => repo.protokoll(),
        anwenden: () => Promise.resolve({ ok: false, fehler: { code: 'speicher-voll', meldung: 'voll' } }),
      },
    };
    const s = new EinstellungenSitzung(testUmgebung(speicher));
    await s.laden();
    const a = await bezeichnungenMerken(CSV);
    expect(a).toEqual({
      art: 'abgewiesen',
      abweisung: { art: 'speicher', fehler: { code: 'speicher-voll', meldung: 'voll' } },
    });
    expect(s.zustand.kostengruppenbezeichnungen).toEqual([]);
  });

  it('liest Nummer und Bezeichnung aus der CSV; ohne CSV bleibt die Zuordnung leer', () => {
    const m = bezeichnungenAusCsv('Nummer;Bezeichnung\n330;Außenwände\n340;Innenwände\nkaputt;x\n');
    expect([...m]).toEqual([
      ['330', 'Außenwände'],
      ['340', 'Innenwände'],
    ]);
    expect(bezeichnungenAusCsv(null).size).toBe(0);
  });
});
