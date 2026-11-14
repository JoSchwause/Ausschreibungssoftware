// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64: das Auftrags-LV als GAEB X86 über den vorhandenen Writer. LV `typisch`, Bieter A aus seiner X84; Summen aus
// der Fixture (`typisch-angebote.json`), nicht aus dem Kern.

import { readFileSync } from 'node:fs';
import { auftragsLvBefehlAusfuehren, lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  PositionId,
  Projekt,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { angebotLesen } from '../gaeb/gaeb';
import { appIdQuelle } from '../lv/ids';
import { excelRuecklaufLesen } from '@tethys/ausgabe';
import { alsLvZustand } from './auftrag';
import { auftragAusgeben, auftragExcel } from './ausgabe';
import { zuschlagserteilungPlanen } from './zuschlagserteilung';

const wurzel = new URL('../../../../', import.meta.url);
const P = 'p' as ProjektId;
const sollA = (
  JSON.parse(readFileSync(new URL('fixtures/typisch-angebote.json', wurzel), 'utf8')) as {
    preisspiegel: { bieter: { name: string; summen: Record<string, string> }[] };
  }
).preisspiegel.bieter.find((b) => b.name === 'Bieter A')?.summen;

function auftragA(): AuftragsLvZustand {
  const inhalt = fixtureInhalt('typisch');
  const l = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: P,
    inhalt,
  });
  if (!l.ok) throw new Error(l.fehler.meldung);
  const lv = lvChangeSetAnwenden(null, l.wert);
  if (lv === null) throw new Error('LV');
  const bytes = new Uint8Array(readFileSync(new URL('fixtures/angebote/typisch-bieter-a.x84', wurzel)));
  const v = angebotLesen(bytes, 'a.x84', lv, appIdQuelle());
  if (v.angebot === null) throw new Error('Angebot');
  const projekt: Projekt = {
    id: P,
    name: 'M',
    bauherr: { name: 'B', anschrift: null },
    bieter: [{ id: v.angebot.bieterId, name: v.bieterName }],
  };
  const plan = zuschlagserteilungPlanen({
    lv,
    angebot: v.angebot,
    projekt,
    gewaehlt: new Set<PositionId>(),
    neueId: 'a1' as AuftragsLeistungsverzeichnisId,
  });
  if (plan.befehl === null) throw new Error(plan.fehler ?? '');
  const cs = auftragsLvBefehlAusfuehren(null, plan.befehl);
  if (!cs.ok) throw new Error(cs.fehler.meldung);
  const { kopf, knoten, summen } = cs.wert;
  if (kopf?.nachher == null || summen.gesamt === null) throw new Error('Auftrags-LV');
  return {
    auftragsLeistungsverzeichnis: { ...kopf.nachher, knoten: knoten.hinzugefuegt },
    summen: { positionen: summen.positionen, gliederungen: summen.gliederungen, gesamt: summen.gesamt },
  };
}

describe('auftragAusgeben', () => {
  it('X86 mit dem Auftragnehmer und den Vertragssummen des Bieters', () => {
    const a = auftragAusgeben(auftragA(), '3.3', new Date(Date.UTC(2026, 10, 11, 9, 30, 0)));
    expect(a.phase).toBe('X86');
    expect(a.dateiname).toMatch(/\.x86$/);
    expect(a.xml).toContain('<DP>86</DP>');
    expect(a.xml).toMatch(/<CTR>\s*<Address>\s*<Name1>Bieter A<\/Name1>/);
    expect(a.xml).toContain(`<Total>${sollA?.netto ?? ''}</Total>`);
    expect(a.xml).toContain(`<TotalGross>${sollA?.brutto ?? ''}</TotalGross>`);
  });
});

describe('auftragExcel (Ticket 151)', () => {
  it('Excel des Auftrags-LV mit den Vertragspreisen; Dateiname mit „-Auftrag“', async () => {
    const auftrag = auftragA();
    const r = await auftragExcel(auftrag, '2026-11-14');
    expect(r.dateiname).toBe(
      `${auftrag.auftragsLeistungsverzeichnis.name.replace(/[^\p{L}\p{N} _-]+/gu, '').trim()}-Auftrag.xlsx`,
    );
    // Zurückgelesen stehen die EP des Auftrags-LV in der Datei (nicht leer wie im Blankett für Bieter).
    const zurueck = excelRuecklaufLesen(r.datei.bytes, alsLvZustand(auftrag));
    const soll = auftrag.auftragsLeistungsverzeichnis.knoten.flatMap((k) =>
      k.art === 'position' && k.einheitspreis !== null && k.zuschlag === null
        ? [[k.id, k.einheitspreis] as const]
        : [],
    );
    expect(soll.length).toBeGreaterThan(0);
    const ist = new Map(
      zurueck.positionen.map((p) => [p.positionId as string, p.status === 'angeboten' ? p.einheitspreis : null]),
    );
    for (const [id, ep] of soll) expect(ist.get(id)).toBe(ep);
  });
});
