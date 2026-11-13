// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 136 Punkt 4 und 6 (E10, D-82 S7): Die Angebotsdatei (X84) liefert Name und Angaben des Bieters (Anschrift,
// Ansprechperson, Telefon, E-Mail) in der Form von `BieterAnlegen`; eine X86 füllt nur den Auftragnehmer des LV, ihre
// Kontaktangaben bleiben Befund. Seams: `leseAngebot`, `leseGaeb`. Erwartete Werte aus den Dateien abgeschrieben.

import { describe, expect, it } from 'vitest';
import type { AngebotId, BieterId, Leistungsverzeichnis, ProjektId } from '@tethys/vertrag';
import { leseAngebot, leseGaeb, nichtUebernommeneAngaben } from './index';
import type { AngebotLesung } from './index';
import { TEST_MWST, lesePfad, testIds } from './testhilfen';

const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';
const MUSTER_31 = 'fixtures/extern/gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001';

function lvAus(pfad: string): Leistungsverzeichnis {
  const l = leseGaeb(lesePfad(pfad), { ids: testIds(), standardMwstSatz: TEST_MWST });
  if (l.inhalt === null) throw new Error('LV nicht lesbar');
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  return { ...kopf, id: wurzelId, projektId: 'projekt-1' as ProjektId, knoten };
}

const angebot = (eingabe: Uint8Array | string, lv: Leistungsverzeichnis): AngebotLesung =>
  leseAngebot(eingabe, { lv, angebotId: 'angebot-1' as AngebotId, bieterId: 'bieter-1' as BieterId });

describe('X84: Name und Angaben des Bieters', () => {
  it('BVBS AVA X84: Anschrift, Ansprechperson, Telefon und E-Mail; Land und Fax bleiben Befund', () => {
    const l = angebot(lesePfad(`${AVA}.X84`), lvAus(`${AVA}.X81`));
    expect(l.bieter).toEqual({
      name: 'Maler + Lackierer Pinsel und Co KG',
      angaben: {
        anschrift: { strasse: 'Auswegstr. 33', plz: '12345', ort: 'Musterstadt' },
        ansprechperson: 'Klecks',
        email: 'pinsel@ildfh.de',
        telefon: '1234 / 11223',
      },
    });
    const ctr = l.befunde.filter(
      (b) => b.code === 'nicht-abgebildet' && b.ort.pfad?.startsWith('/GAEB/Award/CTR'),
    );
    expect(ctr.map((b) => b.werte?.['element']?.wert)).toEqual(['CTR/Address/Country', 'CTR/Address/Fax']);
    expect(nichtUebernommeneAngaben(ctr)).toEqual(['Land des Bieters', 'Fax des Bieters']);
  });

  it('Musterdatei 3.1: dieselben Felder; die Bieternummer bleibt Befund', () => {
    const l = angebot(lesePfad(`${MUSTER_31}.X84`), lvAus(`${MUSTER_31}.X83`));
    expect(l.bieter?.angaben).toEqual({
      anschrift: { strasse: 'Auswegstr. 33', plz: '70327', ort: 'Stuttgart' },
      ansprechperson: 'Klecks',
      email: 'pinsel@ildfh.de',
      telefon: '0711 / 11223',
    });
    expect(nichtUebernommeneAngaben(l.befunde)).toEqual(
      expect.arrayContaining(['Land des Bieters', 'Fax des Bieters', 'Bieternummer']),
    );
  });

  it('nur ein Name: keine Angaben', () => {
    const l = angebot(lesePfad('fixtures/angebote/typisch-bieter-a.x84'), lvTypisch());
    expect(l.bieter).toEqual({ name: 'Bieter A' });
  });

  it('leere Felder werden null, eine leere Anschrift fehlt; Angaben ohne Namen ergeben einen leeren Namen mit Befund', () => {
    const datei = new TextDecoder()
      .decode(lesePfad(`${AVA}.X84`))
      .replace(/<Name1>[^<]*<\/Name1><Name4>[^<]*<\/Name4>/, '')
      .replace(/<Street>[^<]*<\/Street><PCode>[^<]*<\/PCode><City>[^<]*<\/City>/, '<Street> </Street><City/>')
      .replace(/<Phone>[^<]*<\/Phone>/, '<Phone></Phone>');
    const l = angebot(datei, lvAus(`${AVA}.X81`));
    expect(l.bieter).toEqual({
      name: '',
      angaben: { anschrift: null, ansprechperson: 'Klecks', email: 'pinsel@ildfh.de', telefon: null },
    });
    expect(l.befunde.map((b) => b.code)).toContain('bieter-name-fehlt');
  });
});

describe('X86: der Auftragnehmer, kein Bieter (D-82)', () => {
  it('Name, Straße, PLZ und Ort im Auftragnehmer; Ansprechperson, Telefon und E-Mail bleiben Befund', () => {
    const l = leseGaeb(lesePfad(`${AVA}.X86`), { ids: testIds() });
    expect(l.inhalt?.auftragnehmer).toEqual({
      name: 'Musterfirma',
      strasse: 'Robert-Schuman-Platz 1',
      plz: '53175',
      ort: 'Bonn',
    });
    expect('bieter' in l).toBe(false);
    expect(nichtUebernommeneAngaben(l.befunde)).toEqual(
      expect.arrayContaining([
        'Ansprechperson des Auftragnehmers',
        'Telefon des Auftragnehmers',
        'E-Mail des Auftragnehmers',
      ]),
    );
  });
});

function lvTypisch(): Leistungsverzeichnis {
  // Das LV, auf das die typischen Angebote abgegeben sind: als X83 aus der Fixture geschrieben liegt es nicht vor; die
  // Zuordnung der Zeilen spielt für den Bieter keine Rolle, also genügt ein beliebiges LV.
  return lvAus(`${AVA}.X81`);
}
