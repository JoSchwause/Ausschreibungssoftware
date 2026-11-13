// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: Lesen, Filtern und Befehle der Mängelseite. Erwartet werden Werte, die von Hand aus den Eingaben folgen.

import type {
  AuftragsLeistungsverzeichnisId,
  IdQuelle,
  Knoten,
  Mangel,
  MangelId,
  PositionId,
  ProjektId,
  Pruefbefund,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  AKTION_NACH,
  ALLE,
  KEIN_FILTER,
  OHNE,
  aktionMoeglich,
  angabenLesen,
  auftragnehmerAngaben,
  auftragnehmerNamen,
  entwurfAusMangel,
  filterBeschreibung,
  filtern,
  fuerAnzeige,
  leererEntwurf,
  mangelAnlegenBefehl,
  mangelAngabenBefehl,
  maengelZeilen,
  namenJeAuftrag,
  positionenNachOz,
  statusBefehle,
  fristbefundText,
  ueberfaelligeIds,
  verlaufZeilen,
} from './maengel';

const P = 'p1' as ProjektId;
const A1 = 'a1' as AuftragsLeistungsverzeichnisId;
const A2 = 'a2' as AuftragsLeistungsverzeichnisId;
const GID = '0123456789abcdefghijkl';

function mangel(nummer: number, extra: Partial<Mangel> = {}): Mangel {
  return {
    id: `m${String(nummer)}` as MangelId,
    projektId: P,
    nummer,
    titel: `Mangel ${String(nummer)}`,
    beschreibung: null,
    ort: null,
    auftragsLvId: null,
    positionId: null,
    bauteil: null,
    festgestellt: '2026-11-10',
    frist: null,
    verlauf: [{ status: 'offen', datum: '2026-11-10', bemerkung: null }],
    ...extra,
  };
}

const angezeigt = (nummer: number, frist: string, a: AuftragsLeistungsverzeichnisId): Mangel =>
  mangel(nummer, {
    auftragsLvId: a,
    frist,
    verlauf: [
      { status: 'offen', datum: '2026-11-10', bemerkung: null },
      { status: 'angezeigt', datum: '2026-11-11', bemerkung: null, frist },
    ],
  });

const ids = { mangel: () => 'neu' as MangelId } as unknown as IdQuelle;

describe('Auftragnehmer', () => {
  it('nimmt den Namen des Auftragnehmers, sonst den des Auftrags-LV', () => {
    const angaben = auftragnehmerAngaben([
      { id: A1, name: 'LV Rohbau', auftragnehmer: { name: ' Rohbau GmbH ' } },
      { id: A2, name: 'LV Tiefbau', auftragnehmer: { name: null } },
    ]);
    expect(angaben).toEqual([
      { auftragsLvId: A1, auftragnehmer: 'Rohbau GmbH' },
      { auftragsLvId: A2, auftragnehmer: 'LV Tiefbau' },
    ]);
    expect(namenJeAuftrag(angaben)).toEqual({ a1: 'Rohbau GmbH', a2: 'LV Tiefbau' });
  });

  it('die Auswahl nennt jede Firma einmal, deutsch geordnet', () => {
    expect(
      auftragnehmerNamen([
        { auftragsLvId: A1, auftragnehmer: 'Zeta' },
        { auftragsLvId: A2, auftragnehmer: 'Ärger' },
        { auftragsLvId: 'a3' as AuftragsLeistungsverzeichnisId, auftragnehmer: 'Zeta' },
      ]),
    ).toEqual(['Ärger', 'Zeta']);
  });
});

describe('Filter', () => {
  const namen = { a1: 'Rohbau', a2: 'Tiefbau' };
  const maengel = [angezeigt(1, '2026-11-20', A1), mangel(2, { auftragsLvId: A2 }), mangel(3)];

  it('nach Status', () => {
    expect(filtern(maengel, { status: 'offen', auftragnehmer: ALLE }, namen).map((m) => m.nummer)).toEqual([
      2, 3,
    ]);
    expect(
      filtern(maengel, { status: 'angezeigt', auftragnehmer: ALLE }, namen).map((m) => m.nummer),
    ).toEqual([1]);
  });
  it('nach Auftragnehmer, auch „ohne“', () => {
    expect(filtern(maengel, { status: ALLE, auftragnehmer: 'Tiefbau' }, namen).map((m) => m.nummer)).toEqual([
      2,
    ]);
    expect(filtern(maengel, { status: ALLE, auftragnehmer: OHNE }, namen).map((m) => m.nummer)).toEqual([3]);
    expect(filtern(maengel, KEIN_FILTER, namen)).toHaveLength(3);
  });
  it('beschreibt den Filter für den Druck', () => {
    expect(filterBeschreibung(KEIN_FILTER)).toBeNull();
    expect(filterBeschreibung({ status: 'offen', auftragnehmer: 'Rohbau' })).toBe(
      'Status: offen; Auftragnehmer: Rohbau',
    );
  });
});

describe('Mängelanzeige', () => {
  const namen = { a1: 'Rohbau', a2: 'Tiefbau' };
  it('nimmt die angezeigten, noch nicht beseitigten Mängel eines Auftragnehmers, auch wieder geöffnete', () => {
    const wiederOffen = mangel(2, {
      auftragsLvId: A1,
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null, frist: '2026-11-19' },
        { status: 'beseitigt', datum: '2026-11-19', bemerkung: null },
        { status: 'offen', datum: '2026-11-23', bemerkung: null },
      ],
    });
    const nurOffen = mangel(3, { auftragsLvId: A1 });
    const beseitigt = mangel(4, {
      auftragsLvId: A1,
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null },
        { status: 'beseitigt', datum: '2026-11-12', bemerkung: null },
      ],
    });
    const fremd = angezeigt(5, '2026-11-20', A2);
    const gewaehlt = fuerAnzeige(
      [angezeigt(1, '2026-11-20', A1), wiederOffen, nurOffen, beseitigt, fremd],
      namen,
      'Rohbau',
    );
    expect(gewaehlt.map((m) => m.nummer)).toEqual([1, 2]);
  });
});

describe('Ansicht', () => {
  it('zeigt Auftragnehmer, Daten in de-DE, Status und das Kennzeichen „überfällig“ nur bei einem Befund', () => {
    const m = angezeigt(3, '2026-11-25', A1);
    const [z0, z1] = maengelZeilen([m, mangel(4)], { a1: 'Rohbau' }, new Set([m.id]));
    expect(z0?.zellen['auftragnehmer']?.text).toBe('Rohbau');
    expect(z0?.zellen['frist']?.text).toBe('25.11.2026');
    expect(z0?.zellen['status']?.text).toBe('angezeigt');
    expect(z0?.zellen['ueberfaellig']).toEqual({ text: 'überfällig', kennzeichen: ['hinweis'] });
    expect(z1?.zellen['frist']?.text).toBe('–');
    expect(z1?.zellen['ueberfaellig']?.text).toBe('');
  });

  it('liest die überfälligen Kennungen aus den Befunden der Fristprüfung', () => {
    const befunde: Pruefbefund[] = [
      {
        schwere: 'warnung',
        quelle: 'fristpruefung',
        code: 'mangel-frist-ueberschritten',
        meldung: 'x',
        ort: { mangelId: 'm3' as MangelId, feld: 'frist' },
      },
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'andere',
        meldung: 'y',
        ort: { mangelId: 'm9' as MangelId },
      },
    ];
    expect([...ueberfaelligeIds(befunde)]).toEqual(['m3']);
  });

  it('ein angezeigter Mangel ohne Frist ist ein Befund mit eigenem Text, aber nicht überfällig (Ticket 122, PB6)', () => {
    const ohneFrist: Pruefbefund = {
      schwere: 'warnung',
      quelle: 'fristpruefung',
      code: 'mangel-angezeigt-ohne-frist',
      meldung: 'Mangel 4: angezeigt ohne Frist; er kann nicht überfällig werden',
      ort: { mangelId: 'm4' as MangelId, feld: 'frist' },
    };
    expect([...ueberfaelligeIds([ohneFrist])]).toEqual([]);
    expect(fristbefundText(ohneFrist, mangel(4, { titel: 'Riss' }), '2026-12-01')).toBe(
      'Mangel 4 – Riss: angezeigt ohne Frist; er kann nicht überfällig werden. Frist setzen.',
    );
    const ueber: Pruefbefund = { ...ohneFrist, code: 'mangel-frist-ueberschritten' };
    expect(fristbefundText(ueber, mangel(3, { titel: 'Tür', frist: '2026-11-25' }), '2026-12-01')).toBe(
      'Mangel 3 – Tür: Frist 25.11.2026 vor dem Stichtag 01.12.2026 überschritten',
    );
  });
});

describe('Positionen', () => {
  it('findet eine Position über ihre OZ mit Index', () => {
    const k = [
      { art: 'titel', id: 't' },
      { art: 'position', id: 'p1', ordnungszahl: '01.0010', ozIndex: null },
      { art: 'position', id: 'p2', ordnungszahl: '01.0020', ozIndex: 'A' },
    ] as unknown as Knoten[];
    const m = positionenNachOz(k);
    expect(m.get('01.0010')).toBe('p1');
    expect(m.get('01.0020A')).toBe('p2');
    expect(m.has('01.0020')).toBe(false);
  });
});

describe('Formular', () => {
  const heute = '2026-11-26';
  const entwurf = {
    ...leererEntwurf(6, heute),
    titel: ' Riss in der Wand ',
    ort: 'EG',
    auftragsLvId: 'a1',
    frist: '03.12.2026',
  };

  it('schlägt die Nummer und das heutige Datum vor', () => {
    const e = leererEntwurf(6, heute);
    expect(e.nummer).toBe('6');
    expect(e.festgestellt).toBe('26.11.2026');
  });

  it('legt einen Mangel mit Verlauf „offen“ am Tag der Feststellung an', () => {
    const r = mangelAnlegenBefehl(ids, P, entwurf, null, [1, 2, 3, 4, 5]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.wert.mangel).toEqual({
      id: 'neu',
      projektId: P,
      nummer: 6,
      titel: 'Riss in der Wand',
      beschreibung: null,
      ort: 'EG',
      auftragsLvId: 'a1',
      positionId: null,
      bauteil: null,
      festgestellt: '2026-11-26',
      frist: '2026-12-03',
      verlauf: [{ status: 'offen', datum: '2026-11-26', bemerkung: null }],
    });
  });

  it('meldet jedes unlesbare Feld, ohne einen Befehl zu bauen', () => {
    const r = mangelAnlegenBefehl(
      ids,
      P,
      {
        ...entwurf,
        nummer: '0',
        titel: ' ',
        festgestellt: '31.02.2026',
        frist: 'bald',
        globalId: 'kurz',
        position: '01.0010',
      },
      new Map(),
      [],
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.fehler).sort()).toEqual([
      'festgestellt',
      'frist',
      'globalId',
      'nummer',
      'position',
      'titel',
    ]);
  });

  it('weist eine vergebene Nummer ab', () => {
    const r = mangelAnlegenBefehl(ids, P, { ...entwurf, nummer: '3' }, null, [1, 3]);
    expect(r.ok ? null : r.fehler.nummer).toMatch(/schon vergeben/);
  });

  it('eine Position braucht ein Auftrags-LV und eine bekannte OZ; ein Bauteil eine GlobalId mit 22 Zeichen', () => {
    const positionen = new Map([['01.0010', 'p1' as PositionId]]);
    const ok = angabenLesen(
      { ...entwurf, position: '01.0010', globalId: GID, modellId: 'mod' },
      positionen,
      null,
    );
    expect(ok.ok && ok.wert.positionId).toBe('p1');
    expect(ok.ok && ok.wert.bauteil).toEqual({ bauwerksmodellId: 'mod', globalId: GID });
    const ohne = angabenLesen({ ...entwurf, auftragsLvId: '', position: '01.0010' }, positionen, null);
    expect(ohne.ok ? null : ohne.fehler.position).toMatch(/braucht ein Auftrags-LV/);
    const jedes = angabenLesen({ ...entwurf, globalId: GID }, null, null);
    expect(jedes.ok && jedes.wert.bauteil).toEqual({ bauwerksmodellId: null, globalId: GID });
  });

  it('beim Bearbeiten liegt die Feststellung nicht nach dem ersten Verlaufseintrag; ohne Änderung kein Befehl', () => {
    const m = angezeigt(3, '2026-11-25', A1);
    const gleich = mangelAngabenBefehl(entwurfAusMangel(m, ''), null, m);
    expect(gleich).toEqual({ ok: true, wert: null });
    const spaet = mangelAngabenBefehl({ ...entwurfAusMangel(m, ''), festgestellt: '12.11.2026' }, null, m);
    expect(spaet.ok ? null : spaet.fehler.festgestellt).toMatch(/nicht nach dem ersten Verlaufseintrag/);
    const neu = mangelAngabenBefehl(
      { ...entwurfAusMangel(m, ''), frist: '04.12.2026', ort: ' Keller ' },
      null,
      m,
    );
    expect(neu.ok && neu.wert).toMatchObject({
      art: 'MangelangabenSetzen',
      frist: '2026-12-04',
      ort: 'Keller',
      titel: 'Mangel 3',
    });
  });
});

describe('Statusaktionen', () => {
  it('sind nur möglich, wo die Statustabelle den Wechsel erlaubt', () => {
    const offen = mangel(1);
    const beseitigt = mangel(2, {
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null },
        { status: 'beseitigt', datum: '2026-11-12', bemerkung: null },
      ],
    });
    expect(AKTION_NACH.oeffnen).toBe('offen');
    expect(aktionMoeglich(offen, 'anzeigen')).toBe(true);
    expect(aktionMoeglich(offen, 'beseitigt')).toBe(false);
    expect(aktionMoeglich(offen, 'oeffnen')).toBe(false);
    expect(aktionMoeglich(beseitigt, 'abnehmen')).toBe(true);
    expect(aktionMoeglich(beseitigt, 'oeffnen')).toBe(true);
    expect(aktionMoeglich(beseitigt, 'anzeigen')).toBe(false);
  });

  it('„Mangel anzeigen“ setzt Eintrag mit Frist und die Frist am Mangel als zwei Befehle eines Schritts', () => {
    const m = mangel(1, { frist: '2026-11-20' });
    const r = statusBefehle(m, 'anzeigen', {
      datum: '11.11.2026',
      frist: '19.11.2026',
      bemerkung: ' Anzeige ',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.wert).toEqual([
      {
        art: 'MangelstatusSetzen',
        eintrag: { status: 'angezeigt', datum: '2026-11-11', bemerkung: 'Anzeige', frist: '2026-11-19' },
      },
      expect.objectContaining({ art: 'MangelangabenSetzen', frist: '2026-11-19', titel: 'Mangel 1' }),
    ]);
  });

  it('bleibt die Frist gleich, genügt der Eintrag', () => {
    const m = mangel(1, { frist: '2026-11-20' });
    const r = statusBefehle(m, 'anzeigen', { datum: '11.11.2026', frist: '20.11.2026', bemerkung: '' });
    expect(r.ok && r.wert).toHaveLength(1);
  });

  it('andere Aktionen tragen keine Frist', () => {
    const m = angezeigt(1, '2026-11-20', A1);
    const r = statusBefehle(m, 'beseitigt', { datum: '19.11.2026', frist: '', bemerkung: '' });
    expect(r.ok && r.wert).toEqual([
      { art: 'MangelstatusSetzen', eintrag: { status: 'beseitigt', datum: '2026-11-19', bemerkung: null } },
    ]);
  });

  it('weist ein fehlendes oder unlesbares Datum, eine fehlende Frist und ein Datum vor dem letzten Eintrag ab', () => {
    const m = angezeigt(1, '2026-11-20', A1);
    const a = statusBefehle(m, 'anzeigen', { datum: '', frist: '', bemerkung: '' });
    expect(a.ok ? null : Object.keys(a.fehler).sort()).toEqual(['datum', 'frist']);
    const b = statusBefehle(m, 'beseitigt', { datum: '10.11.2026', frist: '', bemerkung: '' });
    expect(b.ok ? null : b.fehler.datum).toBe(
      'Das Datum liegt vor dem letzten Verlaufseintrag (11.11.2026).',
    );
    const c = statusBefehle(m, 'beseitigt', { datum: 'gestern', frist: '', bemerkung: '' });
    expect(c.ok).toBe(false);
  });

  it('der Verlauf wird mit Datum, Status, Frist und Bemerkung gezeigt', () => {
    const m = mangel(1, {
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: 'bei der Begehung' },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null, frist: '2026-11-20' },
      ],
    });
    expect(verlaufZeilen(m)).toEqual([
      '10.11.2026: offen – bei der Begehung',
      '11.11.2026: angezeigt (Frist 20.11.2026)',
    ]);
  });
});
