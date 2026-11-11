// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreibt alle Exporte der XSD-Gegenprüfung (Ticket 40, ADR 0010) in das Verzeichnis aus `GAEB_EXPORT_VERZEICHNIS`.
// Ohne die Variable läuft nichts: Das Skript `werkzeuge/xsd-gegenpruefung.mjs` setzt sie und prüft danach jede Datei
// mit xmllint gegen das amtliche XSD. Das Verzeichnis liegt außerhalb des Repos.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { schreibeGaeb } from './index';
import { exportInhalt, exportOptionen, exportfaelle } from './testhilfen';

const ZIEL = process.env['GAEB_EXPORT_VERZEICHNIS'];

describe.runIf(ZIEL !== undefined)('Exporte für die XSD-Gegenprüfung', () => {
  it('schreibt jede Fixture × Phase × Version', () => {
    const ziel = ZIEL ?? '';
    mkdirSync(ziel, { recursive: true });
    const faelle = exportfaelle();
    for (const f of faelle) {
      const e = schreibeGaeb(exportInhalt(f.phase, f.n), exportOptionen(f.phase, f.version, f.n));
      writeFileSync(join(ziel, f.datei), e.xml);
    }
    expect(faelle.length).toBeGreaterThan(0);
  });
});
