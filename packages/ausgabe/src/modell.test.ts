// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { formatiereBetragDe } from '@tethys/dezimal';
import type { Betrag, Bauherr, Einheitspreis, Menge, Prozent } from '@tethys/vertrag';
import { baueAusgabemodell } from './modell';
import type { PositionZeile } from './modell';
import { bloeckeAlsText } from './langtext';
import { fixtureZustand, mitInhalt, positionenAendern, zuschlagFixture } from './testhilfe/bau';

const positionen = (m: ReturnType<typeof baueAusgabemodell>): PositionZeile[] =>
  m.zeilen.filter((z): z is PositionZeile => z.art === 'position');

describe('Kopf', () => {
  const bauherr: Bauherr = { name: 'Beispiel-Bauherr GmbH', anschrift: 'Beispielweg 3, 10000 Beispielstadt' };

  it('führt Projektname, Bauherr, LV-Name, Auftraggeber und Vergabeinformationen auf, soweit gesetzt', () => {
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
        ausfuehrungsbeginn: '2027-03-01',
        ausfuehrungsende: null,
        auftragsnummer: null,
        auftragsdatum: null,
        abnahmeart: null,
        gewaehrleistung: { dauer: 5, einheit: 'Years' },
      },
    }));
    const m = baueAusgabemodell(z, { projekt: { name: 'Neubau Beispiel', bauherr }, datum: '2026-11-11' });
    expect(m.kopf.lvName).toBe(z.leistungsverzeichnis.name);
    expect(m.kopf.felder).toEqual([
      { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
      { bezeichnung: 'Bauherr', wert: 'Beispiel-Bauherr GmbH, Beispielweg 3, 10000 Beispielstadt' },
      { bezeichnung: 'Auftraggeber', wert: 'Beispiel-Auftraggeber, Beispielstraße 1, 10000 Beispielstadt' },
      { bezeichnung: 'Vergabenummer', wert: 'V-0001' },
      { bezeichnung: 'Eröffnung', wert: '01.12.2026, 10:30 Uhr' },
      { bezeichnung: 'Ausführungsbeginn', wert: '01.03.2027' },
      { bezeichnung: 'Gewährleistung', wert: '5 Jahre' },
    ]);
    expect(m.datum).toBe('11.11.2026');
  });

  it('lässt nicht gesetzte Angaben weg', () => {
    const { zustand } = fixtureZustand('winzig');
    const m = baueAusgabemodell(zustand);
    expect(m.kopf.felder).toEqual([]);
    expect(m.kopf.absender).toEqual([]);
    expect(m.datum).toBeNull();
  });

  it('nennt das Büro als Absender, die Projektangaben und den Auftragnehmer, soweit vorhanden', () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) => ({
      ...i,
      auftragnehmer: { name: 'Beispielbau GmbH', strasse: 'Werkweg 2', plz: '20000', ort: 'Musterort' },
    }));
    const m = baueAusgabemodell(z, {
      projekt: {
        name: 'Neubau Beispiel',
        bauherr,
        angaben: {
          nummer: 'P-2026-07',
          ort: 'Beispielstadt',
          baustelle: { strasse: 'Baustraße 9', plz: '10001', ort: null },
        },
      },
      buero: {
        name: 'Planungsbüro Beispiel',
        anschrift: { strasse: 'Planweg 1', plz: '10002', ort: 'Beispielstadt' },
        telefon: '030 1234',
        email: null,
      },
    });
    expect(m.kopf.absender).toEqual([
      'Planungsbüro Beispiel',
      'Planweg 1',
      '10002 Beispielstadt',
      'Telefon 030 1234',
    ]);
    expect(m.kopf.felder).toEqual([
      { bezeichnung: 'Projekt', wert: 'Neubau Beispiel' },
      { bezeichnung: 'Projektnummer', wert: 'P-2026-07' },
      { bezeichnung: 'Ort', wert: 'Beispielstadt' },
      { bezeichnung: 'Baustelle', wert: 'Baustraße 9, 10001' },
      { bezeichnung: 'Bauherr', wert: 'Beispiel-Bauherr GmbH, Beispielweg 3, 10000 Beispielstadt' },
      { bezeichnung: 'Auftragnehmer', wert: 'Beispielbau GmbH, Werkweg 2, 20000 Musterort' },
    ]);
  });

  it('druckt ohne Deckblatt weder Absender noch Angaben', () => {
    const { zustand } = fixtureZustand('winzig');
    const m = baueAusgabemodell(zustand, {
      deckblatt: false,
      projekt: { name: 'Neubau Beispiel', bauherr },
      buero: { name: 'Planungsbüro Beispiel', anschrift: null, telefon: null, email: null },
    });
    expect(m.kopf).toEqual({ lvName: zustand.leistungsverzeichnis.name, absender: [], felder: [] });
  });
});

describe('Positionen', () => {
  it('weist Bedarf, Wahl (Gruppe, Variante), Stundenlohn und Pauschal als Merkmale aus', () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) => {
      let n = 0;
      return positionenAendern(
        i,
        () => true,
        (p) => {
          n++;
          const merkmale = [
            { ...p.merkmale, bedarf: 'ohne-gesamtbetrag' as const },
            { ...p.merkmale, bedarf: 'mit-gesamtbetrag' as const },
            {
              ...p.merkmale,
              wahl: { gruppe: 2, variante: 1, grundpositionId: null },
              stundenlohn: true,
              pauschal: true,
            },
          ][n - 1];
          return merkmale === undefined ? p : { ...p, merkmale };
        },
      );
    });
    const [a, b, c] = positionen(baueAusgabemodell(z));
    expect(a?.merkmale).toEqual(['Bedarfsposition ohne Gesamtbetrag']);
    expect(b?.merkmale).toEqual(['Bedarfsposition mit Gesamtbetrag']);
    expect(c?.merkmale).toEqual(['Wahlposition, Gruppe 2, Variante 1', 'Stundenlohnarbeiten', 'Pauschal']);
  });

  it('weist eine Zuschlagsposition mit Satz, Bezug und dem Betrag des Kerns aus', () => {
    const { fx, zustand } = zuschlagFixture();
    const m = baueAusgabemodell(zustand);
    const zuschlaege = positionen(m).filter((p) => p.zuschlag !== null);
    expect(zuschlaege).toHaveLength(Object.keys(fx.sollwerte.zuschlaege).length);
    const betraege = Object.values(fx.sollwerte.zuschlaege).map((z) =>
      formatiereBetragDe(z.betrag as Betrag),
    );
    expect(zuschlaege.map((p) => p.gesamtpreis).sort()).toEqual([...betraege].sort());
    for (const p of zuschlaege) expect(p.zuschlag?.satz).toBe('10,00 %');
    const bezuege = new Set(zuschlaege.map((p) => p.zuschlag?.bezug));
    expect(bezuege).toContain('auf die gekennzeichneten Positionen');
    expect(bezuege).toContain('auf alle Positionen der Gliederung 01.02');
    expect([...bezuege].some((b) => b?.startsWith('auf Position 01.03.'))).toBe(true);
  });

  it('übernimmt Leit- und Unterbeschreibungen', () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) =>
      positionenAendern(
        i,
        (p) => p.ordnungszahl === i.knoten.find((k) => k.art === 'position')?.ordnungszahl,
        (p) => ({
          ...p,
          leitbeschreibung: {
            unterbeschreibungen: [
              {
                nummer: '01',
                kurztext: 'Teilleistung A',
                langtext: [{ art: 'text', text: 'Text zu A' }],
                menge: '5.000' as Menge,
                einheit: 'm',
              },
              { nummer: '02', kurztext: 'Teilleistung B', langtext: [], menge: null, einheit: null },
            ],
          },
        }),
      ),
    );
    const mit = positionen(baueAusgabemodell(z)).filter((p) => p.unterbeschreibungen.length > 0);
    expect(mit).toHaveLength(1);
    const [u1, u2] = mit[0]?.unterbeschreibungen ?? [];
    expect(u1).toMatchObject({ nummer: '01', kurztext: 'Teilleistung A', menge: '5,000', einheit: 'm' });
    expect(bloeckeAlsText(u1?.langtext ?? [])).toBe('Text zu A');
    expect(u2).toMatchObject({ nummer: '02', menge: '', einheit: '' });
  });
});

describe('Variante ohne Preise (Blankett)', () => {
  it.each(['winzig', 'typisch', 'zuschlag'] as const)(
    '%s: kein EP, GP, Titelsumme oder Schlussblock',
    (name) => {
      const { zustand } = fixtureZustand(name);
      const m = baueAusgabemodell(zustand, { mitPreisen: false });
      expect(m.mitPreisen).toBe(false);
      expect(m.summen).toBeNull();
      expect(m.zeilen.some((z) => z.art === 'titelsumme')).toBe(false);
      for (const p of positionen(m)) {
        expect(p.einheitspreis).toBe('');
        expect(p.gesamtpreis).toBe('');
        expect(p.zuschlag?.satz ?? '').toBe('');
      }
      // Mengen und Einheiten bleiben: Der Bieter preist genau diese Positionen.
      expect(positionen(m).some((p) => p.menge !== '' && p.einheit !== '')).toBe(true);
    },
  );

  it('mit Preisen (Vorgabe) steht jeder Schätzpreis im Modell', () => {
    const { zustand } = fixtureZustand('winzig');
    const m = baueAusgabemodell(zustand);
    expect(m.mitPreisen).toBe(true);
    expect(positionen(m).every((p) => p.einheitspreis !== '' && p.gesamtpreis !== '')).toBe(true);
  });
});

describe('Schlussblock', () => {
  it('trennt Bedarfssumme und Wahlsumme von der Netto-Summe (F4), wenn es solche Positionen gibt', () => {
    const { fx, zustand } = fixtureZustand('typisch');
    const m = baueAusgabemodell(zustand);
    const soll = fx.sollwerte.ausweise;
    if (soll === undefined) throw new Error('Fixture typisch trägt keine Ausweise');
    expect(m.summen?.bedarf).toBe(formatiereBetragDe(soll.gesamt.summeBedarfOhneGesamtbetrag as Betrag));
    expect(m.summen?.wahl).toBe(formatiereBetragDe(soll.gesamt.summeWahl as Betrag));
    expect(m.summen?.netto).toBe(formatiereBetragDe(fx.sollwerte.summen.netto as Betrag));
    // Je Titel: null, wenn der Sollwert 0,00 ist.
    const ausweis = (wert: string): string | null =>
      Number(wert) === 0 ? null : formatiereBetragDe(wert as Betrag);
    const sollTitel = Object.values(soll.titel);
    const zeilen = m.zeilen.filter((r) => r.art === 'titelsumme');
    expect(zeilen.map((r) => r.bedarf).sort()).toEqual(
      sollTitel.map((t) => ausweis(t.summeBedarfOhneGesamtbetrag)).sort(),
    );
    expect(zeilen.map((r) => r.wahl).sort()).toEqual(sollTitel.map((t) => ausweis(t.summeWahl)).sort());
  });

  it('lässt Bedarfs- und Wahlsumme weg, wenn das LV keine solchen Positionen hat', () => {
    const { zustand } = fixtureZustand('winzig');
    const m = baueAusgabemodell(zustand);
    expect(m.summen?.bedarf).toBeNull();
    expect(m.summen?.wahl).toBeNull();
  });

  it('druckt den Nachlass mit Satz', () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) => ({ ...i, nachlass: { art: 'prozent', wert: '3.00' as Prozent } }));
    expect(baueAusgabemodell(z).summen?.nachlass?.bezeichnung).toBe('Nachlass 3,00 %');
  });

  it('rechnet nichts: ein Schätzpreis ohne Menge bleibt ohne GP', () => {
    const { zustand } = fixtureZustand('winzig');
    const z = mitInhalt(zustand, (i) =>
      positionenAendern(
        i,
        () => true,
        (p) => ({ ...p, menge: null, einheitspreis: '1.000' as Einheitspreis }),
      ),
    );
    expect(positionen(baueAusgabemodell(z)).every((p) => p.gesamtpreis === '')).toBe(true);
  });
});
