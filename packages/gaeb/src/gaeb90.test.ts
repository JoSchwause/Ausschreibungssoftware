// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 144: GAEB 90 lesen, je Satzart ein Test. Seams: `leseGaeb` (LV, .d81/.d83/.d86) und `leseAngebot` (.d84). Die Sätze
// sind von Hand nach der Formatbeschreibung gesetzt (Stellen siehe `gaeb90.ts`, Quellen im Ticket); sie prüfen das eigene
// Verständnis des Formats, nicht Dateien anderer Software (D-71).

import { describe, expect, it } from 'vitest';
import type { AngebotId, BieterId, Leistungsverzeichnis, Position, ProjektId, Titel } from '@tethys/vertrag';
import { leseAngebot, leseGaeb } from './index';
import type { GaebBefund } from './index';
import { TEST_MWST, testIds } from './testhilfen';

/** Ein Satz: Satzart und Felder ab ihrer Stelle (1 = erste Stelle der Zeile); die Satznummer setzt `datei`. */
function satz(art: string, ...felder: readonly (readonly [number, string])[]): string {
  let z = ' '.repeat(72);
  for (const [stelle, wert] of felder) z = z.slice(0, stelle - 3) + wert + z.slice(stelle - 3 + wert.length);
  return art + z;
}
const datei = (...saetze: readonly string[]): string =>
  saetze.map((s, i) => `${s}${String(i + 1).padStart(6, '0')}`).join('\r\n') + '\r\n';

const KOPF = (da = '83', maske = '1122PPPPI'): string[] => [
  satz('00', [11, da], [13, 'L'], [63, maske], [72, '90']),
  satz('01', [3, 'Testbau Halle']),
];
const titel = (oz: string, text: string): string[] => [satz('11', [3, oz], [12, 'N']), satz('12', [3, text])];
const pos = (oz: string, art: string, menge: string, einheit: string, kurz: string): string[] => [
  satz('21', [3, oz], [12, art], [24, menge], [35, einheit]),
  satz('25', [3, kurz]),
];

const lies = (text: string | Uint8Array, dateiname = 'lv.d83') =>
  leseGaeb(text, { ids: testIds(), standardMwstSatz: TEST_MWST, dateiname });

function inhaltVon(text: string | Uint8Array, dateiname?: string) {
  const l = lies(text, dateiname);
  if (l.inhalt === null) throw new Error(`kein Inhalt: ${l.befunde.map((b) => b.meldung).join(' | ')}`);
  return { ...l, inhalt: l.inhalt };
}
const positionen = (knoten: readonly { art: string }[]): Position[] =>
  knoten.filter((k): k is Position => k.art === 'position');
const codes = (b: readonly GaebBefund[]): string[] => b.map((x) => x.code);
const nichtUebernommen = (b: readonly GaebBefund[]): (string | undefined)[] =>
  b.filter((x) => x.code === 'nicht-abgebildet').map((x) => x.nichtUebernommen);

describe('jeder GAEB-90-Import', () => {
  it('trägt den festen Hinweis „nicht an Dateien aus anderer Software geprüft, Summen vergleichen“ (D-71)', () => {
    const l = lies(
      datei(
        ...KOPF(),
        ...titel('01', 'Rohbau'),
        ...pos('010010', 'NNN', '00000001000', 'St', 'Tür'),
        satz('31', [3, '01']),
      ),
    );
    expect(l.format).toBe('gaeb-90');
    const h = l.befunde.filter((b) => b.code === 'format-ungeprueft');
    expect(h).toHaveLength(1);
    expect(h[0]?.meldung).toBe(
      'Das Lesen von GAEB 90 ist nach der Formatbeschreibung gebaut und nicht an Dateien aus anderer Software geprüft; bitte ' +
        'die Summen mit denen des Absenders vergleichen.',
    );
    expect(h[0]?.werte).toEqual({ format: { art: 'text', wert: 'GAEB 90' } });
  });
});

describe('Satz 00 (Eröffnung): Phase und OZ-Maske', () => {
  it('Datenart 83 ist die Phase; die Maske 1122PPPPI ergibt zwei Stufen zu 2, Position 4 und Index 1', () => {
    const l = inhaltVon(datei(...KOPF('83'), ...titel('01', 'A')), 'lv.d81');
    expect(l.phase).toBe('X83');
    expect(l.inhalt.ozMaske).toEqual({
      gliederung: [
        { laenge: 2, zeichen: 'numerisch' },
        { laenge: 2, zeichen: 'numerisch' },
      ],
      position: { laenge: 4, zeichen: 'numerisch' },
      index: { laenge: 1, zeichen: 'alphanumerisch' },
      trennzeichen: '.',
    });
    // Die Endung sagt X81, die Datei X83: es gilt die Datei, mit Befund.
    expect(codes(l.befunde)).toContain('phase-endung-widerspruch');
  });

  it('unbelegte Stellen (0) am Ende: 12P000000 ist Stufe 1, Stufe 2 und Position zu je 1 Stelle', () => {
    const l = inhaltVon(
      datei(...KOPF('86', '12P000000'), ...pos('101', 'NNN', '00000001000', 'St', 'Tür')),
      'lv.d86',
    );
    expect(l.inhalt.ozMaske.gliederung.map((g) => g.laenge)).toEqual([1, 1]);
    expect(positionen(l.inhalt.knoten)[0]?.ordnungszahl).toBe('1.0.1');
  });

  it('eine unlesbare Maske ist ein Fehler; die ganze OZ gilt als Positionsnummer', () => {
    const l = inhaltVon(datei(...KOPF('83', 'PP11XPPPI'), ...pos('123', 'NNN', '00000001000', 'St', 'Tür')));
    expect(l.befunde.find((b) => b.code === 'oz-maske-ungueltig')?.schwere).toBe('fehler');
    expect(positionen(l.inhalt.knoten)[0]?.ordnungszahl).toBe('123');
  });

  it('andere Phasen als X81, X83, X86 weist der LV-Leser mit Satz ab', () => {
    const l = lies(datei(...KOPF('85')), 'n.d85');
    expect([l.format, l.phase, l.inhalt]).toEqual(['gaeb-90', 'X85', null]);
    expect(l.befunde.find((b) => b.code === 'phase-nicht-unterstuetzt')?.meldung).toContain(
      'Nebenangebot (X85)',
    );
  });
});

describe('Sätze 01 bis 04, 08: Kopfangaben', () => {
  const kopf = (da: string): string =>
    datei(
      satz('00', [11, da], [13, 'L'], [63, '11PPPP000'], [72, '90']),
      satz('01', [3, 'Leistungsverzeichnis Halle'], [43, '13.11.26']),
      satz('02', [3, 'Neubau Halle Nord']),
      satz('03', [3, 'Stadt Musterhausen']),
      satz('04', [3, 'Baufirma Muster']),
      satz('08', [3, 'EUR'], [9, 'Euro']),
      ...pos('010010', 'NNN', '00000001000', 'St', 'Tür'),
    );

  it('01 ist der Name des LV, 03 der Auftraggeber; Datum, Projekt und Währung sind „nicht übernommen“', () => {
    const l = inhaltVon(kopf('83'));
    expect(l.inhalt.name).toBe('Leistungsverzeichnis Halle');
    expect(l.inhalt.auftraggeber).toEqual({
      name: 'Stadt Musterhausen',
      strasse: null,
      plz: null,
      ort: null,
      vergabenummer: null,
    });
    expect(l.inhalt.auftragnehmer).toBeUndefined();
    expect(nichtUebernommen(l.befunde)).toEqual(
      expect.arrayContaining([
        'Datum des Leistungsverzeichnisses',
        'Währung',
        'Projektbezeichnung',
        'Angaben zum Bieter',
      ]),
    );
  });

  it('X86: 04 ist der Auftragnehmer', () => {
    const l = inhaltVon(kopf('86'), 'a.d86');
    expect(l.inhalt.auftragnehmer).toEqual({ name: 'Baufirma Muster', strasse: null, plz: null, ort: null });
  });

  it('ohne Satz 01 heißt das LV wie das Projekt (02)', () => {
    const l = inhaltVon(
      datei(satz('00', [11, '83'], [63, 'PPPP00000']), satz('02', [3, 'Neubau Halle Nord'])),
    );
    expect(l.inhalt.name).toBe('Neubau Halle Nord');
  });

  it('kein Steuersatz aus GAEB 90: der eingestellte Satz mit Befund', () => {
    const l = inhaltVon(kopf('86'), 'a.d86');
    expect(l.inhalt.mwstSatz).toBe(TEST_MWST);
    expect(codes(l.befunde)).toContain('mwst-ersatzwert');
  });
});

describe('Sätze 11, 12, 31: Gliederung', () => {
  it('zwei Stufen geschachtelt; 12 ist die Bezeichnung (mehrere Zeilen mit Leerzeichen verbunden)', () => {
    const l = inhaltVon(
      datei(
        ...KOPF(),
        ...titel('01', 'Rohbau'),
        satz('11', [3, '0102'], [12, 'N']),
        satz('12', [3, 'Mauerarbeiten im']),
        satz('12', [3, 'Erdgeschoss']),
        ...pos('01020010', 'NNN', '00000001000', 'St', 'Tür'),
        satz('31', [3, '0102']),
        satz('31', [3, '01']),
      ),
    );
    const t = l.inhalt.knoten.filter((k): k is Titel => k.art === 'titel');
    expect(t.map((x) => [x.ordnungszahl, x.kurztext])).toEqual([
      ['01', 'Rohbau'],
      ['01.02', 'Mauerarbeiten im Erdgeschoss'],
    ]);
    expect(t[1]?.elternId).toBe(t[0]?.id);
    const p = positionen(l.inhalt.knoten)[0];
    expect([p?.ordnungszahl, p?.elternId]).toEqual(['01.02.0010', t[1]?.id]);
    expect(codes(l.befunde)).not.toContain('gliederungsende-abweichend');
  });

  it('ein Ende mit anderer OZ, ein fehlendes Ende und eine Wahl an der Gliederung sind Befunde', () => {
    const l = inhaltVon(
      datei(
        ...KOPF(),
        satz('11', [3, '01'], [12, 'A']),
        satz('12', [3, 'Rohbau']),
        satz('31', [3, '02']),
        ...titel('03', 'Dach'),
      ),
    );
    expect(codes(l.befunde).filter((c) => c === 'gliederungsende-abweichend')).toHaveLength(2);
    expect(codes(l.befunde)).toContain('gliederungswahl-nicht-abgebildet');
  });
});

describe('Satz 21: Position', () => {
  const lv = (...p: string[]) =>
    inhaltVon(datei(...KOPF(), ...titel('01', 'Rohbau'), ...p, satz('31', [3, '01'])));

  it('OZ, Menge mit drei Nachkommastellen ohne Komma, Einheit, Index', () => {
    const p = positionen(lv(...pos('01000010a', 'NNN', '00000125500', 'm2', 'Wand')).inhalt.knoten)[0];
    expect([p?.ordnungszahl, p?.ozIndex, p?.menge, p?.einheit, p?.kurztext]).toEqual([
      '01.00.0010',
      'a',
      '125.500',
      'm2',
      'Wand',
    ]);
  });

  it('Positionsart: G Grundposition, A Alternative mit Verweis, E Bedarf ohne, M Bedarf mit Gesamtbetrag', () => {
    const ps = positionen(
      lv(
        ...pos('01000010', 'GNN', '00000001000', 'St', 'Tür Holz'),
        ...pos('01000020', 'ANN', '00000001000', 'St', 'Tür Stahl'),
        ...pos('01000030', 'NEN', '00000001000', 'h', 'Pumpe'),
        ...pos('01000040', 'NMN', '00000001000', 'm3', 'Kies'),
      ).inhalt.knoten,
    );
    expect(ps.map((p) => [p.merkmale.wahl, p.merkmale.bedarf])).toEqual([
      [{ gruppe: null, variante: 0, grundpositionId: null }, null],
      [{ gruppe: null, variante: null, grundpositionId: ps[0]?.id }, null],
      [null, 'ohne-gesamtbetrag'],
      [null, 'mit-gesamtbetrag'],
    ]);
    expect(ps.every((p) => !p.merkmale.stundenlohn && !p.merkmale.pauschal && p.zuschlag === null)).toBe(
      true,
    );
  });

  it('eine Alternative ohne eindeutige Grundposition bleibt ohne Verweis, mit Befund', () => {
    const l = lv(
      ...pos('01000010', 'GNN', '00000001000', 'St', 'A'),
      ...pos('01000020', 'GNN', '00000001000', 'St', 'B'),
      ...pos('01000030', 'ANN', '00000001000', 'St', 'C'),
    );
    expect(positionen(l.inhalt.knoten)[2]?.merkmale.wahl).toEqual({
      gruppe: null,
      variante: null,
      grundpositionId: null,
    });
    expect(codes(l.befunde)).toContain('wahl-ohne-grundposition');
  });

  it('unbekannte Positionsarten, Stelle 14 und belegte freie Stellen sind Befunde; die Position bleibt', () => {
    const l = lv(
      satz('21', [3, '01000010'], [12, 'XNS'], [16, '11'], [24, '00000001000'], [35, 'St']),
      satz('25', [3, 'Tür']),
    );
    expect(codes(l.befunde)).toContain('enum-ungueltig');
    expect(nichtUebernommen(l.befunde)).toEqual(
      expect.arrayContaining(['Positionsart in Stelle 14', 'weitere Angaben zur Position']),
    );
    expect(positionen(l.inhalt.knoten)).toHaveLength(1);
  });

  it('Menge mit anderen Zeichen als Ziffern, fehlende Menge und Einheit, Buchstaben in der OZ', () => {
    const l = lv(satz('21', [3, '01000A10'], [12, 'NNN'], [24, '0000001,000']), satz('25', [3, 'Tür']));
    expect(codes(l.befunde)).toEqual(
      expect.arrayContaining(['dezimal-ungueltig', 'menge-fehlt', 'einheit-fehlt', 'oz-teil-zeichen']),
    );
  });

  it('eine OZ, die die Maske nicht füllt, bleibt leer', () => {
    const l = lv(...pos('01', 'NNN', '00000001000', 'St', 'Tür'));
    expect(positionen(l.inhalt.knoten)[0]?.ordnungszahl).toBeNull();
    expect(codes(l.befunde)).toContain('oz-teil-fehlt');
  });

  it('doppelte OZ ist ein Befund', () => {
    const l = lv(
      ...pos('01000010', 'NNN', '00000001000', 'St', 'A'),
      ...pos('01000010', 'NNN', '00000001000', 'St', 'B'),
    );
    expect(codes(l.befunde)).toContain('doppelte-ordnungszahl');
  });
});

describe('Satz 23: Preise', () => {
  it('EP mit Zehntelcent (drei Nachkommastellen); ein abweichender Gesamtbetrag ist ein Befund', () => {
    const l = inhaltVon(
      datei(
        ...KOPF('86'),
        ...pos('01000010', 'NNN', '00000125500', 'm2', 'Wand'),
        satz('23', [3, '01000010'], [13, '00000004125'], [25, '000000051769']),
        ...pos('01000020', 'NNN', '00000002000', 'St', 'Tür'),
        satz('23', [3, '01000020'], [13, '0000012000'], [25, '000000030000']),
      ),
      'lv.d86',
    );
    const ps = positionen(l.inhalt.knoten);
    expect(ps.map((p) => p.einheitspreis)).toEqual(['4.125', '120.000']);
    const b = l.befunde.filter((x) => x.code === 'gesamtpreis-abweichend');
    expect(b).toHaveLength(1);
    expect(b[0]?.oz).toBe('01.00.0020');
    expect(b[0]?.werte).toEqual({
      datei: { art: 'betrag', wert: '300.00' },
      gerechnet: { art: 'betrag', wert: '240.00' },
    });
  });

  it('Satz 22 ist belegt, seine Bedeutung neben 23 nicht: nicht übernommen', () => {
    const l = inhaltVon(
      datei(
        ...KOPF('86'),
        ...pos('01000010', 'NNN', '00000001000', 'St', 'Tür'),
        satz('22', [3, '01000010'], [13, '0000010000']),
      ),
    );
    expect(positionen(l.inhalt.knoten)[0]?.einheitspreis).toBeNull();
    expect(nichtUebernommen(l.befunde)).toContain('Preisangabe der Satzart 22');
  });
});

describe('Sätze 25, 26 und 20: Texte', () => {
  it('Kurztext über mehrere Zeilen; Langtext: Zeilen eines Absatzes mit Umbruch, eine leere Zeile beginnt einen neuen', () => {
    const l = inhaltVon(
      datei(
        ...KOPF(),
        satz('21', [3, '01000010'], [12, 'NNN'], [24, '00000001000'], [35, 'St']),
        satz('25', [3, 'Tür aus Holz,']),
        satz('25', [3, 'einflügelig']),
        satz('26', [6, 'Erste Zeile']),
        satz('26', [6, 'zweite Zeile']),
        satz('26'),
        satz('26', [6, 'Neuer Absatz']),
      ),
    );
    const p = positionen(l.inhalt.knoten)[0];
    expect(p?.kurztext).toBe('Tür aus Holz, einflügelig');
    expect(p?.langtext).toEqual([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'Erste Zeile' },
          { art: 'umbruch' },
          { art: 'text', text: 'zweite Zeile' },
        ],
      },
      { art: 'absatz', inhalt: [{ art: 'text', text: 'Neuer Absatz' }] },
    ]);
  });

  it('20 ist ein Hinweistext: vor dem ersten Titel am LV (Vortext), nach Positionen im Titel (Nachtext)', () => {
    const l = inhaltVon(
      datei(
        ...KOPF(),
        satz('20'),
        satz('26', [6, 'Vorbemerkung']),
        ...titel('01', 'Rohbau'),
        ...pos('01000010', 'NNN', '00000001000', 'St', 'Tür'),
        satz('20'),
        satz('25', [3, 'Nachtext nur als Kurztext']),
        satz('31', [3, '01']),
      ),
    );
    const k = l.inhalt.knoten;
    const hinweise = k.flatMap((x) => (x.art === 'hinweis' ? [x] : []));
    expect(hinweise.map((h) => [h.elternId, h.reihenfolge, h.text])).toEqual([
      [l.inhalt.wurzelId, 0, [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Vorbemerkung' }] }]],
      [
        k.find((x) => x.art === 'titel')?.id,
        1,
        [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Nachtext nur als Kurztext' }] }],
      ],
    ]);
  });

  it('T0 … T9 (vertragliche Regelungen vor dem Satz 00) werden der erste Hinweistext', () => {
    const l = inhaltVon(
      datei(
        satz('T0'),
        satz('T1', [3, 'Vertragliche Regelungen']),
        satz('T1', [3, 'gelten.']),
        satz('T9'),
        ...KOPF(),
      ),
    );
    expect(l.inhalt.knoten[0]).toMatchObject({
      art: 'hinweis',
      text: [
        {
          art: 'absatz',
          inhalt: [
            { art: 'text', text: 'Vertragliche Regelungen' },
            { art: 'umbruch' },
            { art: 'text', text: 'gelten.' },
          ],
        },
      ],
    });
  });
});

describe('übrige Satzarten, Satzlänge und Satznummer', () => {
  it('belegte Satzarten ohne Platz im Modell sind „nicht übernommen“, unbekannte ein eigener Befund, Summen still', () => {
    const l = inhaltVon(
      datei(
        ...KOPF('86'),
        satz('06', [3, '2Lohn']),
        satz('10', [3, '01'], [5, 'Los 1']),
        ...pos('01000010', 'NNN', '00000001000', 'St', 'Tür'),
        satz('30', [3, '01000010']),
        satz('24', [3, '01']),
        satz('26', [6, 'Unterbeschreibung']),
        satz('33', [3, '01']),
        satz('47', [3, 'unbekannt']),
        satz('47', [3, 'unbekannt']),
        satz('70', [3, 'Programm']),
        satz('32', [3, '01'], [13, '000000001000']),
        satz('99', [70, '00001']),
      ),
      'lv.d86',
    );
    expect(nichtUebernommen(l.befunde)).toEqual(
      expect.arrayContaining([
        'Bezeichnung der Einheitspreisanteile',
        'Los außerhalb der Ordnungszahl',
        'Unterbeschreibung',
        'Einheitspreisanteile',
        'freie Angaben der Satzart 70',
      ]),
    );
    const u = l.befunde.filter((b) => b.code === 'satzart-unbekannt');
    expect(u).toHaveLength(1);
    expect(u[0]?.werte).toEqual({ satzart: { art: 'text', wert: '47' }, anzahl: { art: 'anzahl', wert: 2 } });
    expect(u[0]?.meldung).toBe(
      '2 Sätze der Satzart „47“ sind in der Formatbeschreibung nicht belegt und werden nicht übernommen.',
    );
    // Der Text der Unterbeschreibung landet nicht im Langtext der Position.
    expect(positionen(l.inhalt.knoten)[0]?.langtext).toEqual([]);
  });

  it('Folgesätze ohne passenden Satz davor (Preis, Text, Bezeichnung) sind „nicht übernommen“', () => {
    const l = inhaltVon(
      datei(
        ...KOPF(),
        satz('23', [3, '01000010'], [13, '0000001000']),
        satz('26', [6, 'verwaister Text']),
        satz('12', [3, 'Bezeichnung']),
        ...pos('01000010', 'NNN', '00000001000', 'St', 'Tür'),
      ),
    );
    expect(nichtUebernommen(l.befunde)).toEqual(
      expect.arrayContaining([
        'Preisangabe ohne Position',
        'Text ohne Position',
        'Bezeichnung ohne Gliederung',
      ]),
    );
    expect(codes(l.befunde)).not.toContain('satzart-unbekannt');
  });

  it('falsche Satzlänge und nicht fortlaufende Satznummern sind je ein zusammengefasster Befund', () => {
    const zeilen = datei(
      ...KOPF(),
      ...pos('01000010', 'NNN', '00000001000', 'St', 'Tür'),
      ...pos('01000020', 'NNN', '00000001000', 'St', 'Tor'),
      ...pos('01000030', 'NNN', '00000001000', 'St', 'Fenster'),
    ).split('\r\n');
    zeilen[1] = (zeilen[1] ?? '').replace('  ', ' ');
    zeilen[2] = (zeilen[2] ?? '').replace(/[0-9]{6}$/, '000009');
    zeilen[3] = (zeilen[3] ?? '').replace(/[0-9]{6}$/, '000001');
    const l = inhaltVon(zeilen.join('\r\n'));
    expect(l.befunde.find((b) => b.code === 'satz-laenge')?.werte).toEqual({
      anzahl: { art: 'anzahl', wert: 1 },
    });
    // Drei Satznummern: die beiden geänderten und die des zu kurzen Satzes (sie steht nicht mehr in den Stellen 75 bis 80).
    expect(l.befunde.find((b) => b.code === 'satznummer-abweichend')?.werte).toEqual({
      anzahl: { art: 'anzahl', wert: 3 },
    });
  });
});

describe('Zeichensatz am Inhalt', () => {
  const MIT_UMLAUT = datei(...KOPF(), ...pos('01000010', 'NNN', '00000001000', 'St', 'Tür für Gebäude'));
  const cp850 = (t: string): Uint8Array =>
    Uint8Array.from(Array.from(t, (c) => ({ ü: 0x81, ä: 0x84 })[c] ?? c.charCodeAt(0)));

  it('DOS-Codepage 850: Umlaute richtig, Befund nennt den Zeichensatz', () => {
    const l = inhaltVon(cp850(MIT_UMLAUT));
    expect(positionen(l.inhalt.knoten)[0]?.kurztext).toBe('Tür für Gebäude');
    expect(l.befunde.find((b) => b.code === 'zeichensatz-erkannt')?.werte).toEqual({
      zeichensatz: { art: 'text', wert: 'DOS-Zeichensatz (Codepage 437 oder 850, gelesen als 850)' },
    });
  });

  it('ISO-8859-1 und UTF-8 ebenso; Text als Eingabe hat keinen Zeichensatz', () => {
    const latin = Uint8Array.from(Buffer.from(MIT_UMLAUT, 'latin1'));
    const l1 = inhaltVon(latin);
    expect(positionen(l1.inhalt.knoten)[0]?.kurztext).toBe('Tür für Gebäude');
    expect(l1.befunde.find((b) => b.code === 'zeichensatz-erkannt')?.meldung).toContain('ISO-8859-1');
    const l2 = inhaltVon(new TextEncoder().encode(MIT_UMLAUT));
    expect(l2.befunde.find((b) => b.code === 'zeichensatz-erkannt')?.meldung).toContain('UTF-8');
    expect(codes(lies(MIT_UMLAUT).befunde)).not.toContain('zeichensatz-erkannt');
  });
});

describe('.d84: Angebot', () => {
  const lvDatei = datei(
    ...KOPF('83'),
    ...titel('01', 'Rohbau'),
    ...pos('01000010', 'NNN', '00000002000', 'St', 'Tür'),
    ...pos('01000020', 'ANN', '00000001000', 'St', 'Tür Stahl'),
    ...pos('01000030', 'NNN', '00000003000', 'm', 'Zarge'),
    satz('31', [3, '01']),
  );
  const l = inhaltVon(lvDatei);
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  const LV: Leistungsverzeichnis = { ...kopf, id: wurzelId, projektId: 'projekt-1' as ProjektId, knoten };
  const angebot = (text: string, dateiname = 'a.d84') =>
    leseAngebot(text, {
      lv: LV,
      angebotId: 'angebot-1' as AngebotId,
      bieterId: 'bieter-1' as BieterId,
      dateiname,
    });

  it('Satz 23 je OZ → Preise; Bieter aus Satz 04; fehlende Positionen gelten als nicht angeboten', () => {
    const a = angebot(
      datei(
        satz('00', [11, '84'], [63, '1122PPPPI'], [72, '90']),
        satz('04', [3, 'Baufirma Muster']),
        satz('23', [3, '01000010'], [13, '0000012345'], [25, '000000024690']),
        satz('23', [3, '01000020'], [13, '0000015000']),
        satz('23', [3, '01990010'], [13, '0000001000']),
        satz('32', [3, '01'], [13, '000000024690']),
        satz('99', [3, '000000024690']),
      ),
    );
    expect([a.format, a.phase, a.version]).toEqual(['gaeb-90', 'X84', null]);
    expect(a.bieter).toEqual({ name: 'Baufirma Muster' });
    const ps = a.befehl?.angebot.positionen ?? [];
    const [p1, p2, p3] = positionen(knoten).map((p) => p.id);
    expect(ps).toEqual([
      { positionId: p1, status: 'angeboten', einheitspreis: '123.450', epa: null },
      { positionId: p2, status: 'angeboten', einheitspreis: '150.000', epa: null },
      { positionId: p3, status: 'nicht-angeboten' },
    ]);
    expect(a.befehl?.angebot.nachlass).toBeNull();
    expect(codes(a.befunde)).toEqual(
      expect.arrayContaining(['format-ungeprueft', 'position-unbekannt', 'position-fehlt-im-angebot']),
    );
    expect(codes(a.befunde)).not.toContain('gp-abweichend');
  });

  it('ein abweichender Gesamtpreis ist derselbe Befund mit demselben Text wie beim DA-XML-Leser', () => {
    const a = angebot(
      datei(
        satz('00', [11, '84'], [63, '1122PPPPI'], [72, '90']),
        satz('23', [3, '01000010'], [13, '0000012345'], [25, '000000024000']),
      ),
    );
    const gp = a.befunde.filter((b) => b.code === 'gp-abweichend');
    expect(gp).toHaveLength(1);
    expect(gp[0]?.meldung).toBe(
      'Der Gesamtpreis der Angebotsdatei (240,00 €) weicht von Menge des LV × EP (246,90 €) ab; gerechnet wird mit Menge × EP.',
    );
  });

  it('ein EP an einer Zuschlagsposition des LV wird nicht übernommen, der Befund nennt den Preis', () => {
    const [p1] = positionen(knoten);
    if (p1 === undefined) throw new Error('keine Position');
    const zuschlagsLv: Leistungsverzeichnis = {
      ...LV,
      knoten: knoten.map((k) =>
        k.id === p1.id && k.art === 'position'
          ? { ...k, zuschlag: { prozentsatz: null, bezug: { art: 'positionen', positionen: [] } } }
          : k,
      ),
    };
    const a = leseAngebot(
      datei(
        satz('00', [11, '84'], [63, '1122PPPPI'], [72, '90']),
        satz('23', [3, '01000010'], [13, '0000012345']),
      ),
      {
        lv: zuschlagsLv,
        angebotId: 'angebot-1' as AngebotId,
        bieterId: 'bieter-1' as BieterId,
        dateiname: 'a.d84',
      },
    );
    const b = a.befunde.find((x) => x.code === 'zuschlag-art-abweichend');
    expect(b?.meldung).toContain('trägt dort einen Einheitspreis (123,450)');
    expect(a.befehl?.angebot.positionen[0]).toEqual({ positionId: p1.id, status: 'nicht-angeboten' });
  });

  it('eine Angebotsaufforderung ist kein Angebot; eine andere Maske ist ein Befund', () => {
    expect(codes(angebot(lvDatei, 'lv.d83').befunde)).toContain('phase-nicht-unterstuetzt');
    const a = angebot(
      datei(satz('00', [11, '84'], [63, '11PPPP000']), satz('23', [3, '010010'], [13, '0000001000'])),
    );
    expect(codes(a.befunde)).toContain('maske-abweichend');
  });
});
