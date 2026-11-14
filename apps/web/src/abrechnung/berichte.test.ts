// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (E11, D-95): die Eingaben der Ausgaben Aufmaßblatt, Soll/Ist und Rechnungsprüfung aus dem Stand der Seiten,
// geprüft über die Berichtsmodelle von `ausgabe` (das Modell, aus dem PDF und Excel entstehen). Büro und Projekt stehen in
// jedem Kopf; die Zeilenergebnisse der Mengenansätze rechnet `mengen` (Sollwerte aus `typisch-abrechnung.json`).

import {
  baueAufmassblattModell,
  baueRechnungspruefungModell,
  baueSollIstModell,
  type Berichtsmodell,
} from '@tethys/ausgabe';
import type { Buero, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { M4_NACHTRAG_LV, m4Blatt, m4Nachtragsknoten } from '../../e2e/rechnung-fixture';
import { entwurfLesen, neuerEntwurf, rechnungAnlegenBefehl } from '../rechnung/entwurf';
import { pruefen } from '../rechnung/pruefung';
import { rechnungenSitzung, rechnungsstandLaden } from '../rechnung/rechnungen';
import { mitAuftrag } from '../rechnung/testhilfen';
import { aufmassSchreiben, nachtragSchreiben } from '../rechnung/testpfad';
import {
  aufmassblattEingabe,
  dateinameAufmassblatt,
  dateinameRechnungspruefung,
  dateinameSollIst,
  rechnungspruefungEingabe,
  sollIstEingabe,
  type Druckkopf,
} from './berichte';
import { sollIstRechnen } from './sollist';

const BUERO: Buero = { name: 'Planungsbüro Muster (erfunden)', anschrift: null, telefon: null, email: null };

/** Alle Texte eines Berichtsmodells, wie Vorschau, PDF und Excel sie zeigen. */
const text = (m: Berichtsmodell): string => JSON.stringify(m);

async function m4() {
  const a = await mitAuftrag('b');
  const kopf = a.auftrag.auftragsLeistungsverzeichnis;
  const n = await nachtragSchreiben(a.u, kopf.id, M4_NACHTRAG_LV, m4Nachtragsknoten(kopf.id));
  if (!n.ok) throw new Error(n.fehler);
  const b = await aufmassSchreiben(a.u, m4Blatt(0, kopf.projektId, kopf.id));
  if (!b.ok) throw new Error(b.fehler);
  const st = await rechnungsstandLaden(a.u.speicher, kopf.id);
  if (!st.ok) throw new Error(st.fehler.meldung);
  const druck: Druckkopf = { projekt: a.projekt, buero: BUERO, datum: '2026-11-14' };
  return { ...a, stand: st.wert, druck };
}

describe('Eingaben der Abrechnungsberichte', () => {
  it('Aufmaßblatt: Zeilenergebnisse je Ansatzzeile aus `mengen`, Büro und Projekt im Kopf', async () => {
    const a = await m4();
    const blatt = a.stand.aufmasse[0];
    if (blatt === undefined) throw new Error('Blatt');
    const e = aufmassblattEingabe(a.auftrag, blatt, a.druck);
    // Zwei Ansatzzeilen: 2*(12+9)*0,6*0,8 = 20,160 und 2,5*1,75*0,3 = 1,3125 → 1,313 (Summe 21,473 laut Fixture).
    const zweiZeilen = blatt.positionen.find((p) => p.menge === '21.473');
    expect(e.ergebnisse?.find((r) => r.positionId === zweiZeilen?.positionId)?.zeilen).toEqual([
      { zeile: 1, menge: '20.160' },
      { zeile: 2, menge: '1.313' },
    ]);
    expect(e.buero).toEqual(BUERO);
    expect(e.projekt).toBe(a.projekt);
    expect(e.datum).toBe('2026-11-14');
    const t = text(baueAufmassblattModell(e));
    expect(t).toContain(BUERO.name);
    expect(t).toContain('Musterhaus');
    expect(t).toContain('20,160');
    expect(dateinameAufmassblatt(a.auftrag, blatt, 'pdf')).toMatch(/^Aufmaßblatt 1 .+\.pdf$/);
  });

  it('Soll/Ist: Schwellen der Seite als Optionen, Büro und Projekt im Kopf', async () => {
    const a = await m4();
    const sollIst = sollIstRechnen(a.auftrag, a.stand.aufmasse, {
      abgeschlossen: false,
      oberSchwelle: '120.00' as Prozent,
    });
    const e = sollIstEingabe(a.auftrag, sollIst, false, a.druck);
    expect(e.optionen).toEqual({ abgeschlossen: false, oberSchwelle: '120.00', unterSchwelle: '90.00' });
    const t = text(baueSollIstModell(e));
    expect(t).toContain(BUERO.name);
    expect(t).toContain('120,00');
    expect(dateinameSollIst(a.auftrag, 'xlsx')).toMatch(/^Soll-Ist .+\.xlsx$/);
  });

  it('Rechnungsprüfung: Kette und Befunde mit den Texten der Seite, Büro und Projekt im Kopf', async () => {
    const a = await m4();
    const kopf = a.auftrag.auftragsLeistungsverzeichnis;
    const s = rechnungenSitzung(a.weg, kopf.projektId, []);
    const w = entwurfLesen({ ...neuerEntwurf([], a.stand.blaetter), sicherheitSatz: '5,00' });
    if (!w.ok) throw new Error('unlesbar');
    const b = rechnungAnlegenBefehl(a.u.ids.rechnung(), kopf.projektId, kopf.id, [], w.wert);
    expect((await s.befehl({ rechnungId: null, befehl: b })).ok).toBe(true);
    const r = b.rechnung;
    const p = pruefen(r, a.stand, s.zustand);
    const e = rechnungspruefungEingabe(r, a.stand, p, ['Ein Befund der Seite.'], a.druck);
    expect(e.pruefung).toBe(p);
    expect(e.aufmasse).toBe(a.stand.blaetter);
    expect(e.befundtexte).toEqual([{ schwere: 'warnung', ort: null, text: 'Ein Befund der Seite.' }]);
    const t = text(baueRechnungspruefungModell(e));
    expect(t).toContain(BUERO.name);
    expect(t).toContain('Musterhaus');
    expect(t).toContain('Ein Befund der Seite.');
    // Die Zahlungsfreigabe (A5) kommt aus `pruefung.zahlungsstand`; vor der Freigabe als Vorschau.
    expect(t).toContain('Zahlungsfreigabe');
    expect(t).toContain('Zahlbetrag (geprüft, noch nicht freigegeben)');
    expect(dateinameRechnungspruefung(a.auftrag, r, 'pdf')).toMatch(/^Rechnungsprüfung 1 .+\.pdf$/);
  });
});
