// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests über den Text des PDF (ADR 0012, Ticket 58): Jede Position, jede Titelsumme und die Schlussblöcke stehen im Druck;
// die Variante ohne Preise enthält keinen Preis. Erwartete Zahlen kommen aus den Sollwerten der Fixture (Rechenregel aus
// VOB/GAEB, vom Fixture-Skript gerechnet) oder, wo die Fixture sie nicht trägt, aus dem Summenstand des Kerns.

import { describe, expect, it } from 'vitest';
import { formatiereBetragDe, formatiereEinheitspreisDe, formatiereMengeDe } from '@tethys/dezimal';
import type { Betrag, Langtext, LvZustand, Menge, Position } from '@tethys/vertrag';
import { baueAusgabemodell, erzeugePdf } from './index';
import type { PositionZeile } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand, mitInhalt, positionenAendern } from './testhilfe/bau';
import type { FixtureName } from './testhilfe/bau';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const betrag = (b: string): string => formatiereBetragDe(b as Betrag);

async function pdfText(zustand: LvZustand, optionen: Parameters<typeof erzeugePdf>[2] = {}): Promise<string> {
  return normal(alsText(await liesPdf(await erzeugePdf(zustand, schriften, optionen))));
}

const positionen = (z: LvZustand): PositionZeile[] =>
  baueAusgabemodell(z).zeilen.filter((r): r is PositionZeile => r.art === 'position');

describe.each(['winzig', 'typisch', 'zuschlag'] as FixtureName[])('Druck mit Preisen: %s', (name) => {
  const { fx, zustand } = fixtureZustand(name);
  const text = pdfText(zustand);

  it('druckt jede Position mit OZ, Kurztext, Menge, Einheit, EP und GP', async () => {
    const t = await text;
    for (const p of positionen(zustand)) {
      expect(t, p.ordnungszahl).toContain(p.ordnungszahl);
      expect(t, p.kurztext).toContain(normal(p.kurztext));
      if (p.menge !== '') expect(t).toContain(p.menge);
      if (p.einheit !== '') expect(t).toContain(p.einheit);
    }
    for (const k of zustand.leistungsverzeichnis.knoten) {
      if (k.art !== 'position') continue;
      if (k.einheitspreis !== null) expect(t).toContain(formatiereEinheitspreisDe(k.einheitspreis));
      if (k.menge !== null) expect(t).toContain(formatiereMengeDe(k.menge));
      const soll = (
        fx.sollwerte as unknown as { positionen: Record<string, { gp: string; inSumme: boolean }> }
      ).positionen[k.id];
      if (soll !== undefined && k.menge !== null) {
        const gp = betrag(soll.gp);
        expect(t).toContain(soll.inSumme ? gp : `(${gp})`);
      }
    }
  });

  it('druckt jede Titelsumme und die Schlussblöcke mit den Sollwerten', async () => {
    const t = await text;
    for (const titel of Object.values(fx.sollwerte.titel)) expect(t).toContain(betrag(titel.summe));
    const s = fx.sollwerte.summen;
    for (const wert of [s.netto, s.nettoNachNachlass, s.mwst, s.brutto]) expect(t).toContain(betrag(wert));
    expect(t).toContain('Brutto');
    if (fx.nachlass !== null) {
      expect(t).toContain('Netto nach Nachlass');
      expect(t).toContain(betrag(s.nachlass));
    }
  });

  it('druckt Bedarfs- und Wahlsumme getrennt, wenn das LV solche Positionen hat (F4)', async () => {
    const t = await text;
    const soll = fx.sollwerte.ausweise;
    if (soll !== undefined) {
      expect(t).toContain('Bedarfssumme');
      expect(t).toContain(formatiereBetragDe(soll.gesamt.summeBedarfOhneGesamtbetrag as Betrag));
      expect(t).toContain('Wahlsumme');
      expect(t).toContain(formatiereBetragDe(soll.gesamt.summeWahl as Betrag));
    } else {
      expect(t).not.toContain('Bedarfssumme');
      expect(t).not.toContain('Wahlsumme');
    }
  });
});

describe('Fixture typisch: Merkmale und Hinweistexte', () => {
  it('weist Bedarf und Wahl an der Position aus und druckt die Hinweistexte', async () => {
    const { fx, zustand } = fixtureZustand('typisch');
    const t = await pdfText(zustand);
    expect(t).toContain('Bedarfsposition ohne Gesamtbetrag');
    expect(t).toContain('Wahlposition');
    for (const k of fx.knoten) if (k.art === 'hinweis' && k.text) expect(t).toContain(normal(k.text));
  });
});

describe('Fixture zuschlag: Zuschlagspositionen', () => {
  it('druckt Satz, Bezug und Betrag jeder Zuschlagsposition', async () => {
    const { fx, zustand } = fixtureZustand('zuschlag');
    const t = await pdfText(zustand);
    expect(t).toContain('10,00 %');
    expect(t).toContain('auf die gekennzeichneten Positionen');
    expect(t).toContain('auf alle Positionen der Gliederung 01.02');
    const zuschlaege = (fx.sollwerte as unknown as { zuschlaege: Record<string, { betrag: string }> })
      .zuschlaege;
    for (const z of Object.values(zuschlaege)) expect(t).toContain(betrag(z.betrag));
  });
});

describe('Variante ohne Preise', () => {
  it.each(['winzig', 'typisch', 'zuschlag'] as FixtureName[])('%s: kein Preis im PDF', async (name) => {
    const { fx, zustand } = fixtureZustand(name);
    const t = await pdfText(zustand, { mitPreisen: false });
    const mengen = new Set(
      zustand.leistungsverzeichnis.knoten.flatMap((k) =>
        k.art === 'position' && k.menge !== null ? [formatiereMengeDe(k.menge)] : [],
      ),
    );
    // Alle Positionen stehen weiter da (der Bieter preist sie), mit Menge und Einheit.
    for (const p of positionen(zustand)) {
      expect(t).toContain(p.ordnungszahl);
      expect(t).toContain(normal(p.kurztext));
      if (p.menge !== '') expect(t).toContain(p.menge);
    }
    const preise = new Set<string>();
    for (const titel of Object.values(fx.sollwerte.titel)) preise.add(betrag(titel.summe));
    for (const wert of Object.values(fx.sollwerte.summen)) preise.add(betrag(wert));
    for (const k of zustand.leistungsverzeichnis.knoten)
      if (k.art === 'position' && k.einheitspreis !== null)
        preise.add(formatiereEinheitspreisDe(k.einheitspreis));
    for (const s of zustand.summen.positionen) if (s.gesamtpreis !== null) preise.add(betrag(s.gesamtpreis));
    const woerter = new Set(t.split(' '));
    let geprueft = 0;
    for (const preis of preise) {
      if (mengen.has(preis)) continue; // gleicher Wert wie eine Menge, nicht unterscheidbar
      geprueft++;
      expect(woerter.has(preis), preis).toBe(false);
    }
    expect(geprueft).toBeGreaterThan(3);
    for (const wort of ['Brutto', 'Netto', 'MwSt', 'Nachlass', 'Bedarfssumme', 'Wahlsumme', 'Summe '])
      expect(t, wort).not.toContain(wort);
  });
});

describe('Kopf, Kopf- und Fußzeile', () => {
  it('druckt Projekt, Bauherr, Auftraggeber und Vergabeinformationen, soweit gesetzt', async () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) => ({
      ...i,
      auftraggeber: {
        name: 'Beispiel-Auftraggeber',
        strasse: 'Beispielstraße 1',
        plz: '10000',
        ort: 'Beispielstadt',
        vergabenummer: 'V-0001',
      },
      vergabeinformationen: {
        eroeffnungsdatum: '2026-12-01',
        eroeffnungszeit: '10:30:00',
        abgabeort: null,
        ausfuehrungsbeginn: null,
        ausfuehrungsende: null,
        auftragsnummer: null,
        auftragsdatum: null,
        abnahmeart: null,
        gewaehrleistung: { dauer: 5, einheit: 'Years' },
      },
    }));
    const t = await pdfText(z, {
      projekt: { name: 'Neubau Beispiel', bauherr: { name: 'Beispiel-Bauherr GmbH', anschrift: null } },
    });
    for (const s of [
      'Neubau Beispiel',
      'Beispiel-Bauherr GmbH',
      'Beispiel-Auftraggeber, Beispielstraße 1, 10000 Beispielstadt',
      'V-0001',
      '01.12.2026, 10:30 Uhr',
      '5 Jahre',
      z.leistungsverzeichnis.name,
    ])
      expect(t, s).toContain(s);
  });

  it('trägt „Seite x von y“ und das übergebene Datum auf jeder Seite', async () => {
    const { zustand } = fixtureZustand('typisch');
    const inhalt = await liesPdf(await erzeugePdf(zustand, schriften, { datum: '2026-11-11' }));
    expect(inhalt.seiten.length).toBeGreaterThan(0);
    inhalt.seiten.forEach((seite, i) => {
      const t = normal(seite.map((s) => s.text).join(' '));
      expect(t).toContain(`Seite ${String(i + 1)} von ${String(inhalt.seiten.length)}`);
      expect(t).toContain('11.11.2026');
    });
  });
});

describe('Langtext', () => {
  const langtext: Langtext = [
    {
      art: 'absatz',
      inhalt: [
        { art: 'text', text: 'Wand ' },
        { art: 'text', text: 'tragend', fett: true },
        { art: 'umbruch' },
        { art: 'text', text: 'nach Plan', kursiv: true, unterstrichen: true },
      ],
    },
    {
      art: 'liste',
      geordnet: true,
      punkte: [
        [{ art: 'text', text: 'Untergrund prüfen' }],
        [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Anschlüsse herstellen' }] }],
      ],
    },
    {
      art: 'liste',
      geordnet: false,
      punkte: [[{ art: 'text', text: 'Aufzählungspunkt' }]],
    },
    {
      art: 'tabelle',
      zeilen: [
        { zellen: [{ spalten: 2, inhalt: [{ art: 'text', text: 'Kennwerte' }] }] },
        {
          zellen: [
            { spalten: 1, inhalt: [{ art: 'text', text: 'Dicke' }] },
            { spalten: 1, inhalt: [{ art: 'text', text: '100 mm' }] },
          ],
        },
      ],
    },
    {
      art: 'ergaenzung',
      herkunft: 'bieter',
      kennung: '60',
      leer: true,
      davor: [{ art: 'text', text: 'Breite von ' }],
      inhalt: [{ art: 'text', text: '...........' }],
      danach: [{ art: 'text', text: ' cm.' }],
    },
    {
      art: 'ergaenzung',
      herkunft: 'ausschreibender',
      kennung: '61',
      leer: false,
      davor: [{ art: 'text', text: 'Fabrikat ' }],
      inhalt: [{ art: 'text', text: 'Beispielwerk' }],
      danach: [],
    },
  ];

  function mitLangtext(): LvZustand {
    const { zustand } = fixtureZustand('winzig');
    let erste = true;
    return mitInhalt(zustand, (i) =>
      positionenAendern(
        i,
        () => {
          const jetzt = erste;
          erste = false;
          return jetzt;
        },
        (p: Position) => ({ ...p, langtext }),
      ),
    );
  }

  it('zeigt Absätze, Auszeichnung, Liste, Aufzählung, Tabelle und Textergänzungen lesbar', async () => {
    const t = await pdfText(mitLangtext());
    expect(t).toContain('Wand tragend');
    expect(t).toContain('nach Plan');
    expect(t).toContain('Untergrund prüfen');
    expect(t).toContain('Anschlüsse herstellen');
    expect(t).toContain('Aufzählungspunkt');
    expect(t).toContain('Kennwerte');
    expect(t).toContain('Dicke');
    expect(t).toContain('100 mm');
    expect(t).toContain('Breite von [______] cm.');
    expect(t).toContain('Fabrikat [Beispielwerk]');
  });

  it('setzt die Nummer eines Listenpunkts links in dieselbe Zeile wie seinen Text', async () => {
    const inhalt = await liesPdf(await erzeugePdf(mitLangtext(), schriften));
    const stuecke = inhalt.seiten.flat();
    for (const [nummer, punkt] of [
      ['1.', 'Untergrund prüfen'],
      ['2.', 'Anschlüsse herstellen'],
    ] as const) {
      const text = stuecke.find((t) => normal(t.text) === punkt);
      const marke = stuecke.find((t) => normal(t.text) === nummer);
      expect(text, punkt).toBeDefined();
      expect(marke, nummer).toBeDefined();
      expect(Math.abs((marke?.y ?? 0) - (text?.y ?? 99))).toBeLessThan(1);
      expect(marke?.x ?? 99).toBeLessThan(text?.x ?? 0);
    }
  });

  it('setzt kursiven Text in der eingebetteten Kursivschrift', async () => {
    const roh = new TextDecoder('latin1').decode(await erzeugePdf(mitLangtext(), schriften));
    expect(roh).toMatch(/\/BaseFont\s*\/[A-Z]+\+NotoSans-Italic/);
  });

  it('druckt Unterbeschreibungen einer Leitbeschreibung', async () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) =>
      positionenAendern(
        i,
        () => true,
        (p) => ({
          ...p,
          leitbeschreibung: {
            unterbeschreibungen: [
              {
                nummer: '01',
                kurztext: 'Teilleistung Alpha',
                langtext: [{ art: 'text', text: 'Text zu Alpha' }],
                menge: '5.000' as Menge,
                einheit: 'm',
              },
            ],
          },
        }),
      ),
    );
    const t = await pdfText(z);
    expect(t).toContain('Teilleistung Alpha');
    expect(t).toContain('Text zu Alpha');
    expect(t).toContain(formatiereMengeDe('5.000' as Menge));
  });
});

describe('Bytes', () => {
  it('sind bei gleicher Eingabe gleich (Datum als Eingabe, keine Uhr)', async () => {
    const { zustand } = fixtureZustand('typisch');
    const a = await erzeugePdf(zustand, schriften, { datum: '2026-11-11' });
    const b = await erzeugePdf(zustand, schriften, { datum: '2026-11-11' });
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    const c = await erzeugePdf(zustand, schriften, { datum: '2026-11-12' });
    expect(Buffer.from(a).equals(Buffer.from(c))).toBe(false);
  });
});
