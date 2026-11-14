// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 150: Die Bezeichnungen der Kostengruppen liegen in den Einstellungen des Speichers, nicht mehr im Browserspeicher.
import { describe, expect, it } from 'vitest';
import { EinstellungenSitzung } from '../historie/einstellungen';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { bezeichnungenAusCsv, bezeichnungenGemerkt, bezeichnungenMerken } from './bezeichnungen';

describe('Bezeichnungen der Kostengruppen', () => {
  it('merkt die Bezeichnungen der CSV in den Einstellungen und vergisst sie wieder', async () => {
    const s = new EinstellungenSitzung(testUmgebung(await speicherImSpeicher()));
    await s.laden();
    expect(bezeichnungenGemerkt()).toBeNull();
    expect(bezeichnungenMerken('Nummer;Bezeichnung\n340;Innen; und "Trenn"wände\n330;Wände\n')).toBe(true);
    await s.laden(); // wartet, bis der Befehl geschrieben ist (die Sitzung reiht nacheinander)
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
    expect(bezeichnungenMerken(null)).toBe(true);
    await s.laden();
    expect(s.zustand.kostengruppenbezeichnungen).toEqual([]);
    expect(bezeichnungenGemerkt()).toBeNull();
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
