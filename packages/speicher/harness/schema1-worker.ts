// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für den Prüfstand: legt im OPFS eine Datenbank der Schemaversion 1 an und füllt sie so, wie `speicher` vor
// Migration 2 schrieb. Danach gibt der Worker die Datenbank frei; der echte Speicher-Worker öffnet sie und migriert.

import type { Projektdatei } from '@tethys/vertrag';
import { oeffneOpfs } from '../src/backends';
import { migriere, MIGRATIONEN } from '../src/migrationen';
import { schreibeInSchema1 } from '../src/testhilfe/schema1';

interface Auftrag {
  readonly name: string;
  readonly datei: Projektdatei;
}

self.addEventListener('message', (e: MessageEvent<Auftrag>) => {
  void (async () => {
    try {
      const offen = await oeffneOpfs(e.data.name);
      try {
        offen.db.ausfuehren('PRAGMA foreign_keys = ON');
        const m = migriere(
          offen.db,
          MIGRATIONEN.filter((x) => x.version <= 1),
        );
        if (!m.ok) throw new Error(m.fehler.meldung);
        schreibeInSchema1(offen.db, e.data.datei);
        const v = offen.db.zeilen('PRAGMA user_version')[0]?.['user_version'];
        offen.db.schliessen();
        await offen.freigeben();
        self.postMessage({ ok: true, version: v });
      } catch (x) {
        offen.db.schliessen();
        await offen.freigeben();
        throw x;
      }
    } catch (x) {
      self.postMessage({ ok: false, meldung: x instanceof Error ? x.message : String(x) });
    }
  })();
});
