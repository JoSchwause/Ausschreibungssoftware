// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LeistungsverzeichnisId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { preisspiegelLvId, preisspiegelPfad } from './pfad';

describe('Adresse des Preisspiegels (S10)', () => {
  it('bauen und lesen passen zueinander', () => {
    const id = 'lv 1' as LeistungsverzeichnisId;
    expect(preisspiegelPfad('lv1' as LeistungsverzeichnisId)).toBe('/lv/lv1/preisspiegel');
    expect(preisspiegelLvId(preisspiegelPfad(encodeURIComponent(id) as LeistungsverzeichnisId))).toBe(id);
  });

  it('andere Adressen sind keine', () => {
    expect(preisspiegelLvId('/lv/lv1')).toBeNull();
    expect(preisspiegelLvId('/lv/lv1/preisspiegel/x')).toBeNull();
  });
});
