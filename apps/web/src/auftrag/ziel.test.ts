// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: wohin die App nach Rückgängig oder Wiederholen eines Zuschlags wechselt.

import type { AuftragsLeistungsverzeichnisId, LeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { auftragPfad, auftragZiel } from './ziel';

const P = 'p' as ProjektId;
const kopf = {
  id: 'a1' as AuftragsLeistungsverzeichnisId,
  leistungsverzeichnisId: 'lv1' as LeistungsverzeichnisId,
};
const anlegen = { kopf: { vorher: null, nachher: kopf } };

describe('auftragZiel', () => {
  it('Zuschlag wiederholt: zur Seite des Auftrags-LV; zurückgenommen: zum Preisspiegel des LV', () => {
    expect(auftragPfad(P, kopf.id)).toBe('/projekt/p/auftrag/a1');
    expect(auftragZiel(P, anlegen, false, '/lv/lv1/preisspiegel')).toBe('/projekt/p/auftrag/a1');
    expect(auftragZiel(P, anlegen, true, '/projekt/p/auftrag/a1')).toBe('/lv/lv1/preisspiegel');
  });
  it('steht die Seite schon dort, bleibt sie', () => {
    expect(auftragZiel(P, anlegen, true, '/lv/lv1/preisspiegel')).toBeNull();
    expect(auftragZiel(P, anlegen, false, '/projekt/p/auftrag/a1')).toBeNull();
  });
});
