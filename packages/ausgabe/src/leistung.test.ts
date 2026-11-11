// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistung (Ticket 58): `gross` (5.000 Positionen) unter Node in unter 5 s. Gemessen wird die CPU-Zeit des Prozesses, nicht
// die Wanduhr: Auf einer Maschine, auf der andere Läufe parallel arbeiten, schwankt die Wanduhr um ein Mehrfaches. Der
// schnellere von zwei Läufen zählt (nach einem Aufwärmlauf). Messwerte und Umgebung stehen im Ticket.

import { describe, expect, it } from 'vitest';
import { formatiereBetragDe } from '@tethys/dezimal';
import type { Betrag } from '@tethys/vertrag';
import { erzeugePdf } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { lvZustandAusFixture } from './testhilfen';

describe('Leistung', () => {
  it('druckt gross (5.000 Positionen) in unter 5 s CPU-Zeit und vollständig', async () => {
    const { fx, zustand } = lvZustandAusFixture('gross');
    const schriften = schriftenAusDateien();
    await erzeugePdf(zustand, schriften); // Aufwärmen
    let bester = Infinity;
    let pdf: Uint8Array = new Uint8Array();
    for (let i = 0; i < 2; i++) {
      const c0 = process.cpuUsage();
      pdf = await erzeugePdf(zustand, schriften, { datum: '2026-11-11' });
      const c = process.cpuUsage(c0);
      bester = Math.min(bester, (c.user + c.system) / 1000);
    }
    expect(bester).toBeLessThan(5000);
    const inhalt = await liesPdf(pdf);
    const text = alsText(inhalt);
    const s = fx.sollwerte.summen;
    for (const wert of [s.netto, s.nettoNachNachlass, s.mwst, s.brutto])
      expect(text).toContain(formatiereBetragDe(wert as Betrag));
    expect(inhalt.seiten.length).toBeGreaterThan(100);
  }, 180_000);
});
