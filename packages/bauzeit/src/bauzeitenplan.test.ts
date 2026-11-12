// SPDX-License-Identifier: AGPL-3.0-or-later
// Terminrechnung (Ticket 102 Punkt 3 und 4): Vorwärts- und Rückwärtsrechnung in Arbeitstagen, Puffer, kritischer Weg,
// Sammelvorgänge und Befunde. Alle Erwartungswerte sind von Hand am Kalender hergeleitet (Kommentare).
//
// Kalender Januar/Februar 2027 (Montag bis Freitag, ohne Land): Fr 01.01. Neujahr; Mo 04. bis Fr 08.; Mo 11. bis Fr 15.;
// Mo 18. bis Fr 22.; Mo 25. bis Fr 29.; Mo 01.02. bis Fr 05.02.; Wochenenden dazwischen.

import { describe, expect, it } from 'vitest';
import type { Anordnungsbeziehung, Arbeitskalender, Bauzeitenplaneingabe, Vorgang, VorgangId } from './index';
import { STANDARD_ARBEITSTAGE, bauzeitenplanBerechnen } from './index';

const MO_FR: Arbeitskalender = { arbeitstage: STANDARD_ARBEITSTAGE, bundesland: null, freieTage: [] };

const vid = (id: string): VorgangId => id as VorgangId;
/** Weitere Felder eines Vorgangs; der Sammelvorgang als Text. */
type Weiteres = Partial<Omit<Vorgang, 'elternId'>> & { readonly elternId?: string };
function vorgang(
  id: string,
  dauer: number,
  vorgaenger: readonly Anordnungsbeziehung[] = [],
  weiteres: Weiteres = {},
): Vorgang {
  const { elternId, ...rest } = weiteres;
  return {
    id: vid(id),
    nummer: null,
    bezeichnung: `Vorgang ${id}`,
    elternId: elternId === undefined ? null : vid(elternId),
    dauer,
    vorgaenger,
    fruehesterBeginn: null,
    bezug: null,
    ist: null,
    ...rest,
  };
}

const ea = (vorgaengerId: string, abstand = 0): Anordnungsbeziehung => ({
  vorgaengerId: vid(vorgaengerId),
  art: 'ende-anfang',
  abstand,
});

function plan(
  vorgaenge: readonly Vorgang[],
  weiteres: Partial<Bauzeitenplaneingabe> = {},
): Bauzeitenplaneingabe {
  return { projektbeginn: '2027-01-04', kalender: MO_FR, vorgaenge, ...weiteres };
}

describe('ein Vorgang', () => {
  it('belegt seine Dauer in Arbeitstagen ab dem Projektbeginn; Ende einschließlich', () => {
    // 5 Arbeitstage ab Mo 04.01.2027: Mo, Di, Mi, Do, Fr → Ende Fr 08.01.; er allein ist kritisch.
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 5)]));
    expect(e.vorgaenge).toEqual([
      {
        vorgangId: 'a',
        art: 'vorgang',
        termine: {
          beginn: '2027-01-04',
          ende: '2027-01-08',
          spaetesterBeginn: '2027-01-04',
          spaetestesEnde: '2027-01-08',
          gesamtpuffer: 0,
          freierPuffer: 0,
          kritisch: true,
        },
      },
    ]);
    expect(e.projektbeginn).toBe('2027-01-04');
    expect(e.projektende).toBe('2027-01-08');
    expect(e.kritischeWege).toEqual([['a']]);
    expect(e.befunde).toEqual([]);
  });
});

const aa = (vorgaengerId: string, abstand = 0): Anordnungsbeziehung => ({
  vorgaengerId: vid(vorgaengerId),
  art: 'anfang-anfang',
  abstand,
});
const ee = (vorgaengerId: string, abstand = 0): Anordnungsbeziehung => ({
  vorgaengerId: vid(vorgaengerId),
  art: 'ende-ende',
  abstand,
});
const ae = (vorgaengerId: string, abstand = 0): Anordnungsbeziehung => ({
  vorgaengerId: vid(vorgaengerId),
  art: 'anfang-ende',
  abstand,
});

/** Beginn und Ende (frühe Lage) je Vorgang. */
function lage(e: ReturnType<typeof bauzeitenplanBerechnen>): Record<string, [string, string] | null> {
  return Object.fromEntries(
    e.vorgaenge.map((v) => [v.vorgangId, v.termine === null ? null : [v.termine.beginn, v.termine.ende]]),
  );
}

describe('Anordnungsbeziehungen (Indizes: 0 = Mo 04.01., 4 = Fr 08.01., 5 = Mo 11.01., …)', () => {
  // a: 5 Tage Mo 04.01. bis Fr 08.01. (Anfang 0, Ende 5).
  const a = vorgang('a', 5);

  it('Ende-Anfang, Abstand 0: Beginn am nächsten Arbeitstag nach dem Ende, über das Wochenende', () => {
    // b: Anfang ≥ 5 + 0 → Mo 11.01., 3 Tage bis Mi 13.01.
    expect(lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 3, [ea('a')])])))).toEqual({
      a: ['2027-01-04', '2027-01-08'],
      b: ['2027-01-11', '2027-01-13'],
    });
  });

  it('Ende-Anfang, Abstand 2: zwei Arbeitstage Pause', () => {
    // b: Anfang ≥ 5 + 2 = 7 → Mi 13.01. (Pause Mo 11. und Di 12.), 3 Tage bis Fr 15.01.
    expect(lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 3, [ea('a', 2)])])))['b']).toEqual([
      '2027-01-13',
      '2027-01-15',
    ]);
  });

  it('Ende-Anfang, Abstand −1: Beginn am letzten Tag des Vorgängers', () => {
    // b: Anfang ≥ 5 − 1 = 4 → Fr 08.01., 3 Tage: Fr 08., Mo 11., Di 12.01.
    expect(lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 3, [ea('a', -1)])])))['b']).toEqual([
      '2027-01-08',
      '2027-01-12',
    ]);
  });

  it('Anfang-Anfang, Abstand 0 und 2', () => {
    // b: Anfang ≥ 0 → Mo 04.01. bis Di 05.01.; c: Anfang ≥ 0 + 2 → Mi 06.01. bis Do 07.01.
    expect(
      lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 2, [aa('a')]), vorgang('c', 2, [aa('a', 2)])]))),
    ).toEqual({
      a: ['2027-01-04', '2027-01-08'],
      b: ['2027-01-04', '2027-01-05'],
      c: ['2027-01-06', '2027-01-07'],
    });
  });

  it('Ende-Ende, Abstand 0 und 1', () => {
    // b (3 Tage): Ende ≥ 5 → Anfang 2 → Mi 06.01. bis Fr 08.01. (endet mit a);
    // c (3 Tage): Ende ≥ 5 + 1 = 6 → Anfang 3 → Do 07.01. bis Mo 11.01.
    expect(
      lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 3, [ee('a')]), vorgang('c', 3, [ee('a', 1)])]))),
    ).toEqual({
      a: ['2027-01-04', '2027-01-08'],
      b: ['2027-01-06', '2027-01-08'],
      c: ['2027-01-07', '2027-01-11'],
    });
  });

  it('Anfang-Ende, Abstand 0 und 2: der Nachfolger endet vor bzw. nach dem Beginn des Vorgängers', () => {
    // x: 2 Tage nach a (Ende-Anfang) → Anfang 5 = Mo 11.01. bis Di 12.01.
    // b (3 Tage): Ende ≥ Anfang(x) + 0 = 5 → Anfang 2 → Mi 06.01. bis Fr 08.01., der Arbeitstag vor Mo 11.01.;
    // c (3 Tage): Ende ≥ 5 + 2 = 7 → Anfang 4 → Fr 08.01. bis Di 12.01.
    const e = bauzeitenplanBerechnen(
      plan([a, vorgang('x', 2, [ea('a')]), vorgang('b', 3, [ae('x')]), vorgang('c', 3, [ae('x', 2)])]),
    );
    expect(lage(e)).toEqual({
      a: ['2027-01-04', '2027-01-08'],
      x: ['2027-01-11', '2027-01-12'],
      b: ['2027-01-06', '2027-01-08'],
      c: ['2027-01-08', '2027-01-12'],
    });
  });

  it('ein Nachfolger beginnt nie vor dem Projektbeginn, auch nicht mit negativem Abstand', () => {
    // b (3 Tage): Ende-Ende −4 von a: Ende ≥ 5 − 4 = 1 → Anfang −2 → auf 0 angehoben: Mo 04.01. bis Mi 06.01.
    expect(lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 3, [ee('a', -4)])])))['b']).toEqual([
      '2027-01-04',
      '2027-01-06',
    ]);
  });

  it('mehrere Vorgänger: der späteste Wert bestimmt den Beginn', () => {
    // b: Ende-Anfang von a (≥ 5) und Anfang-Anfang +7 von a (≥ 7) → Anfang 7 = Mi 13.01.
    expect(lage(bauzeitenplanBerechnen(plan([a, vorgang('b', 1, [ea('a'), aa('a', 7)])])))['b']).toEqual([
      '2027-01-13',
      '2027-01-13',
    ]);
  });
});

describe('Meilenstein', () => {
  it('liegt nach einem Vorgang am nächsten Arbeitstag und kostet keine Zeit', () => {
    // m: Anfang ≥ Ende(a) = 5 → Mo 11.01., Beginn = Ende; b: Anfang ≥ Ende(m) = 5 → ebenfalls Mo 11.01.
    const e = bauzeitenplanBerechnen(
      plan([vorgang('a', 5), vorgang('m', 0, [ea('a')]), vorgang('b', 2, [ea('m')])]),
    );
    expect(lage(e)).toEqual({
      a: ['2027-01-04', '2027-01-08'],
      m: ['2027-01-11', '2027-01-11'],
      b: ['2027-01-11', '2027-01-12'],
    });
    expect(e.vorgaenge.find((v) => v.vorgangId === 'm')?.art).toBe('meilenstein');
    expect(e.kritischeWege).toEqual([['a', 'm', 'b']]);
  });

  it('am Projektbeginn liegt er auf dem ersten Arbeitstag', () => {
    expect(lage(bauzeitenplanBerechnen(plan([vorgang('m', 0)])))).toEqual({
      m: ['2027-01-04', '2027-01-04'],
    });
  });
});

describe('Projektbeginn und Terminvorgabe', () => {
  it('ist der Projektbeginn frei (Neujahr, Freitag), beginnt der Plan am ersten Arbeitstag danach', () => {
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 2)], { projektbeginn: '2027-01-01' }));
    expect(e.projektbeginn).toBe('2027-01-04');
    expect(lage(e)).toEqual({ a: ['2027-01-04', '2027-01-05'] });
  });

  it('Terminvorgabe auf einem Samstag: Beginn am Montag danach; vor dem Projektbeginn ohne Wirkung', () => {
    const e = bauzeitenplanBerechnen(
      plan([
        vorgang('a', 5, [], { fruehesterBeginn: '2027-01-09' }),
        vorgang('b', 1, [], { fruehesterBeginn: '2026-12-01' }),
      ]),
    );
    expect(lage(e)).toEqual({ a: ['2027-01-11', '2027-01-15'], b: ['2027-01-04', '2027-01-04'] });
    // a beginnt an seiner Terminvorgabe und endet am Projektende: ein kritischer Weg aus a allein.
    expect(e.kritischeWege).toEqual([['a']]);
  });

  it('ein Feiertag des Landes unterbricht den Vorgang (Heilige Drei Könige, Mi 06.01.2027, Bayern)', () => {
    // 5 Arbeitstage: Mo 04., Di 05., Do 07., Fr 08., Mo 11.01.
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 5)], { kalender: { ...MO_FR, bundesland: 'BY' } }));
    expect(lage(e)).toEqual({ a: ['2027-01-04', '2027-01-11'] });
  });
});

describe('Puffer und kritischer Weg', () => {
  // a (5) und b (2) ab Projektbeginn, d (1) nach b, c (1) nach a und d (alle Ende-Anfang, Abstand 0).
  // Vorwärts: a 0–5, b 0–2, d 2–3, c max(5, 3) = 5–6; Projektende 6 (c endet Mo 11.01.).
  // Rückwärts: c spätestes Ende 6, spätester Anfang 5; a 0–5; d 4–5; b 2–4.
  // Gesamtpuffer: a 0, b 2, d 2, c 0. Freier Puffer: b min(6 − 2, 2 − 2) = 0 (d hängt an b), d 5 − 3 = 2, a 0, c 0.
  const e = bauzeitenplanBerechnen(
    plan([vorgang('a', 5), vorgang('b', 2), vorgang('d', 1, [ea('b')]), vorgang('c', 1, [ea('a'), ea('d')])]),
  );
  const t = (id: string) => e.vorgaenge.find((v) => v.vorgangId === id)?.termine;

  it('Gesamtpuffer, freier Puffer und späte Lage', () => {
    expect(t('b')).toEqual({
      beginn: '2027-01-04',
      ende: '2027-01-05',
      spaetesterBeginn: '2027-01-06',
      spaetestesEnde: '2027-01-07',
      gesamtpuffer: 2,
      freierPuffer: 0,
      kritisch: false,
    });
    expect(t('d')).toEqual({
      beginn: '2027-01-06',
      ende: '2027-01-06',
      spaetesterBeginn: '2027-01-08',
      spaetestesEnde: '2027-01-08',
      gesamtpuffer: 2,
      freierPuffer: 2,
      kritisch: false,
    });
    expect([t('a')?.gesamtpuffer, t('a')?.kritisch, t('c')?.gesamtpuffer, t('c')?.kritisch]).toEqual([
      0,
      true,
      0,
      true,
    ]);
    expect(e.projektende).toBe('2027-01-11');
  });

  it('der kritische Weg ist a → c', () => {
    expect(e.kritischeWege).toEqual([['a', 'c']]);
  });

  it('zwei gleich lange Zweige ergeben zwei kritische Wege in Eingabereihenfolge', () => {
    const zwei = bauzeitenplanBerechnen(
      plan([vorgang('a', 3), vorgang('b', 3), vorgang('c', 1, [ea('b'), ea('a')])]),
    );
    expect(zwei.kritischeWege).toEqual([
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });
});

describe('Sammelvorgang', () => {
  // p fasst s und t zusammen; s fasst a (5) und b (3, nach a) zusammen, t fasst x (1) zusammen.
  // a 0–5 (Mo 04. bis Fr 08.01.), b 5–8 (Mo 11. bis Mi 13.01.), x 0–1 (Mo 04.01.); Projektende 8.
  // x: spätester Anfang 7 (Mi 13.01.), Gesamtpuffer 7, freier Puffer 8 − 1 = 7.
  const unter = (elternId: string): Weiteres => ({ elternId });
  const vorgaenge = [
    vorgang('p', 0),
    vorgang('s', 99, [], unter('p')),
    vorgang('a', 5, [], unter('s')),
    vorgang('b', 3, [ea('a')], unter('s')),
    vorgang('t', 0, [], unter('p')),
    vorgang('x', 1, [], unter('t')),
  ];
  const e = bauzeitenplanBerechnen(plan(vorgaenge));
  const v = (id: string) => e.vorgaenge.find((r) => r.vorgangId === id);

  it('Beginn = frühester Beginn, Ende = spätestes Ende der Kinder; Dauer ohne Bedeutung', () => {
    expect(v('s')).toEqual({
      vorgangId: 's',
      art: 'sammelvorgang',
      termine: {
        beginn: '2027-01-04',
        ende: '2027-01-13',
        spaetesterBeginn: '2027-01-04',
        spaetestesEnde: '2027-01-13',
        gesamtpuffer: 0,
        freierPuffer: 0,
        kritisch: true,
      },
    });
    expect(v('t')).toEqual({
      vorgangId: 't',
      art: 'sammelvorgang',
      termine: {
        beginn: '2027-01-04',
        ende: '2027-01-04',
        spaetesterBeginn: '2027-01-13',
        spaetestesEnde: '2027-01-13',
        gesamtpuffer: 7,
        freierPuffer: 7,
        kritisch: false,
      },
    });
  });

  it('verschachtelt: der oberste fasst alle Nachfahren zusammen', () => {
    expect(v('p')?.art).toBe('sammelvorgang');
    expect(v('p')?.termine).toMatchObject({ beginn: '2027-01-04', ende: '2027-01-13', gesamtpuffer: 0 });
  });

  it('gehört nie zu einem kritischen Weg', () => {
    expect(e.kritischeWege).toEqual([['a', 'b']]);
    expect(e.befunde).toEqual([]);
  });

  it('eine Anordnungsbeziehung an einem Sammelvorgang ist ein Befund und wird nicht gerechnet', () => {
    const mit = bauzeitenplanBerechnen(
      plan([...vorgaenge.slice(0, 5), vorgang('x', 1, [ea('s')], unter('t')), vorgang('y', 2, [ea('t')])]),
    );
    expect(lage(mit)['x']).toEqual(['2027-01-04', '2027-01-04']);
    expect(lage(mit)['y']).toEqual(['2027-01-04', '2027-01-05']);
    expect(mit.befunde.map((b) => [b.code, b.ort])).toEqual([
      ['beziehung-an-sammelvorgang', { vorgangId: 'x', feld: 'vorgaenger' }],
      ['beziehung-an-sammelvorgang', { vorgangId: 'y', feld: 'vorgaenger' }],
    ]);
    expect(mit.befunde.map((b) => b.meldung)).toEqual([
      expect.stringContaining('s → x') as string,
      expect.stringContaining('t → y') as string,
    ]);
    const amSammel = bauzeitenplanBerechnen(
      plan([
        vorgang('z', 4),
        ...vorgaenge.slice(0, 1),
        vorgang('s', 0, [ea('z')], unter('p')),
        ...vorgaenge.slice(2),
      ]),
    );
    expect(lage(amSammel)['a']).toEqual(['2027-01-04', '2027-01-08']);
    expect(amSammel.befunde.map((b) => [b.code, b.ort])).toEqual([
      ['beziehung-an-sammelvorgang', { vorgangId: 's', feld: 'vorgaenger' }],
    ]);
  });

  it('eine Terminvorgabe an einem Sammelvorgang ist ein Befund und wird nicht gerechnet', () => {
    const mit = bauzeitenplanBerechnen(
      plan([
        ...vorgaenge.slice(0, 1),
        vorgang('s', 0, [], { elternId: 'p', fruehesterBeginn: '2027-01-11' }),
        ...vorgaenge.slice(2),
      ]),
    );
    expect(lage(mit)['a']).toEqual(['2027-01-04', '2027-01-08']);
    expect(mit.befunde.map((b) => [b.code, b.ort])).toEqual([
      ['terminvorgabe-an-sammelvorgang', { vorgangId: 's', feld: 'fruehesterBeginn' }],
    ]);
  });
});

describe('unbekannter Vorgänger und Zyklen', () => {
  it('ein unbekannter Vorgänger ist ein Befund; die Beziehung entfällt', () => {
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 2), vorgang('b', 1, [ea('fehlt'), ea('a')])]));
    expect(lage(e)['b']).toEqual(['2027-01-06', '2027-01-06']);
    expect(e.befunde).toEqual([
      {
        schwere: 'fehler',
        quelle: 'terminrechnung',
        code: 'vorgaenger-unbekannt',
        meldung: expect.stringContaining('fehlt → b') as string,
        ort: { vorgangId: 'b', feld: 'vorgaenger' },
      },
    ]);
  });

  // a (2) → e (1); b und c hängen im Kreis aneinander; d (1) folgt auf c; f bezieht sich auf sich selbst.
  const e = bauzeitenplanBerechnen(
    plan([
      vorgang('a', 2),
      vorgang('b', 2, [ea('c')]),
      vorgang('c', 2, [ea('b'), ea('a')]),
      vorgang('d', 1, [ea('c')]),
      vorgang('e', 1, [ea('a')]),
      vorgang('f', 1, [ea('f')]),
    ]),
  );

  it('die Beteiligten eines Zyklus bleiben ohne Termine; der Befund nennt sie in Eingabereihenfolge', () => {
    expect(lage(e)).toEqual({
      a: ['2027-01-04', '2027-01-05'],
      b: null,
      c: null,
      // d ohne die Beziehung von c: ab Projektbeginn.
      d: ['2027-01-04', '2027-01-04'],
      e: ['2027-01-06', '2027-01-06'],
      f: null,
    });
    // Je Beteiligter ein Befund (D-97.11), in der Reihenfolge der Zyklen und der Eingabe.
    expect(e.befunde.map((b) => [b.code, b.ort.vorgangId, b.ort.feld])).toEqual([
      ['zyklus', 'b', 'vorgaenger'],
      ['zyklus', 'c', 'vorgaenger'],
      ['zyklus', 'f', 'vorgaenger'],
      ['vorgaenger-ohne-termine', 'd', 'vorgaenger'],
    ]);
    expect(e.befunde.map((b) => b.meldung)).toEqual([
      expect.stringContaining('b → c') as string,
      expect.stringContaining('b → c') as string,
      expect.stringContaining('f') as string,
      expect.stringContaining('Vorgänger c') as string,
    ]);
  });

  it('die übrigen Vorgänge rechnen weiter; der kritische Weg führt nicht durch den Zyklus', () => {
    expect(e.projektende).toBe('2027-01-06');
    expect(e.kritischeWege).toEqual([['a', 'e']]);
  });
});
