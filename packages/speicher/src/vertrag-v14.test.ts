// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.4: mechanisch angepasst, Folgeticket (Ticket 79 ersetzt diese Tests durch das Speichern der neuen Felder und
// Aggregate). Bis dahin weist `speicher` alles, was Vertrag v1.4 neu bringt, laut mit `unbekannt` ab, statt es still zu
// verwerfen (Q5), und die neuen Repositories antworten mit `unbekannt`.

import type { ChangeSet, Protokolleintrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { kopfAendern } from './testhilfe/umkehrung';

const f = ladeFixture('winzig');
const lv = f.lv.leistungsverzeichnis;
const P = f.projekt.id;

/** Projekt und LV des Fixtures, ohne Angebote. */
async function mitLv(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(f).slice(0, 2));
  return kern;
}

const befehl: Protokolleintrag['befehl'] = { art: 'LeistungsverzeichnisUmbenennen', name: 'x' };

async function versuche(kern: SpeicherKern, cs: ChangeSet, aggregat: Protokolleintrag['aggregat']) {
  return kern.anwenden(eintrag(900, P, aggregat, befehl), cs);
}

describe('Vertrag v1.4 bis Ticket 79: unbekannt statt still verworfen (Q5)', () => {
  it('Nachtragsangaben am LV-Kopf', async () => {
    const kern = await mitLv();
    const cs = kopfAendern(
      f.lv,
      { nachtrag: { auftragsLvId: 'auftrags-lv-1' as never, nummer: 'N01', status: 'angemeldet' } },
      f.lv.summen.gesamt.netto,
    );
    const r = await versuche(kern, cs, { art: 'leistungsverzeichnis', id: lv.id });
    expect(!r.ok && r.fehler.code).toBe('unbekannt');
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
  });

  it('das Repository der Auftrags-LVs antwortet mit unbekannt', async () => {
    const s = speicherUeberTransport(direktTransport((await neuerKern()).kern), null);
    const a = await s.auftragsLeistungsverzeichnisse.auflisten(P);
    const l = await s.auftragsLeistungsverzeichnisse.laden('auftrags-lv-1' as never);
    expect([a, l].map((r) => !r.ok && r.fehler.code)).toEqual(['unbekannt', 'unbekannt']);
  });
});
