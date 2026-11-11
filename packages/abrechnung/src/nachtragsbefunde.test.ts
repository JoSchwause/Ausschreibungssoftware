// SPDX-License-Identifier: AGPL-3.0-or-later
// `nachtragsbefunde` (Ticket 80, D-35): Status und Übernahme eines Nachtrags passen nicht zusammen. Grundlage ist das
// Tor M4 (Auftrags-LV aus `typisch`, Nachtrag N01 aus `typisch-abrechnung`).

import type { LosId, LvZustand, Nachtragsstatus, Prozent, TitelId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { nachtragUebernehmen } from './nachtrag-uebernehmen';
import { nachtragsbefunde } from './nachtragsbefunde';
import {
  MASKE,
  PROJEKT,
  auftragsLvZustand,
  erwarteOk,
  lvZustand,
  m4AuftragsLv,
  m4Nachtrag,
  position,
  titel,
} from './testhilfen';

const ids = { los: () => 'neu' as LosId, titel: () => 'neu' as TitelId };

describe('nachtragsbefunde', () => {
  const vorher = m4AuftragsLv();
  const nachtrag = m4Nachtrag();
  const { befehl } = erwarteOk(
    nachtragUebernehmen(
      vorher,
      nachtrag.lv,
      nachtrag.angebot,
      { id: vorher.auftragsLeistungsverzeichnis.angebotId, bieterId: nachtrag.angebot.bieterId },
      ids,
    ),
  );
  const a = vorher.auftragsLeistungsverzeichnis;
  const nachher = auftragsLvZustand({ ...a, knoten: [...a.knoten, ...befehl.knoten] });
  const positionen = nachtrag.lv.leistungsverzeichnis.knoten
    .filter((k) => k.art === 'position')
    .map((k) => k.id);
  const mitStatus = (status: Nachtragsstatus, z: LvZustand = nachtrag.lv): LvZustand => {
    const n = z.leistungsverzeichnis.nachtrag;
    if (n === undefined) throw new Error('kein Nachtrags-LV');
    return { ...z, leistungsverzeichnis: { ...z.leistungsverzeichnis, nachtrag: { ...n, status } } };
  };
  const lvId = nachtrag.lv.leistungsverzeichnis.id;

  it('beauftragt und übernommen: kein Befund', () => {
    expect(nachtragsbefunde(nachher, [mitStatus('beauftragt')])).toEqual([]);
  });

  it('beauftragt, aber Positionen fehlen im Auftrags-LV', () => {
    expect(nachtragsbefunde(vorher, [mitStatus('beauftragt')])).toEqual([
      { code: 'beauftragt-nicht-uebernommen', nachtragLvId: lvId, nummer: 'N01', positionIds: positionen },
    ]);
  });

  it('übernommen, aber nicht beauftragt (jeder andere Status)', () => {
    for (const status of ['angemeldet', 'angeboten', 'abgelehnt'] as const)
      expect(nachtragsbefunde(nachher, [mitStatus(status)])).toEqual([
        {
          code: 'uebernommen-nicht-beauftragt',
          nachtragLvId: lvId,
          nummer: 'N01',
          status,
          positionIds: positionen,
        },
      ]);
  });

  it('nicht beauftragt und nicht übernommen: kein Befund', () => {
    expect(nachtragsbefunde(vorher, [mitStatus('angeboten'), mitStatus('abgelehnt')])).toEqual([]);
  });

  it('LVs ohne Nachtragsangaben oder zu einem anderen Auftrags-LV zählen nicht', () => {
    const knoten = [titel('t', 'x', 0, '01'), position(positionen[0] ?? 'p', 't', 0, '01.0010', '1.000')];
    const kopf = { name: 'X', ozMaske: MASKE, mwstSatz: '19.00' as Prozent, nachlass: null, knoten };
    const gewoehnlich = lvZustand('x', kopf);
    const fremd = mitStatus(
      'angeboten',
      lvZustand('x', kopf, PROJEKT, { auftragsLvId: 'anderes' as never, nummer: 'N09', status: 'angeboten' }),
    );
    expect(nachtragsbefunde(nachher, [gewoehnlich, fremd])).toEqual([]);
  });

  it('teilweise übernommen und beauftragt: nur die fehlenden; Alternativen fehlen nie', () => {
    const [erste] = positionen;
    const ohneErste = auftragsLvZustand({
      ...a,
      knoten: [...a.knoten, ...befehl.knoten.filter((k) => k.id !== erste)].map((k) =>
        k.art === 'position' && k.elternId === befehl.knoten[1]?.id ? { ...k, reihenfolge: 0 } : k,
      ),
    });
    const n = nachtrag.lv.leistungsverzeichnis;
    const alternative = position('alt', n.knoten[0]?.id ?? 't', 2, null, '1.000', null, {
      wahl: { gruppe: null, variante: null, grundpositionId: null },
    });
    const mitAlternative = mitStatus('beauftragt', {
      ...nachtrag.lv,
      leistungsverzeichnis: { ...n, knoten: [...n.knoten, alternative] },
    });
    expect(nachtragsbefunde(ohneErste, [mitAlternative])).toEqual([
      { code: 'beauftragt-nicht-uebernommen', nachtragLvId: lvId, nummer: 'N01', positionIds: [erste] },
    ]);
  });
});
