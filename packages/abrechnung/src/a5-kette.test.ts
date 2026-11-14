// SPDX-License-Identifier: AGPL-3.0-or-later
// Kettentest A5 ohne Oberfläche (Ticket 143, D-72): vom Stand des Tors M4 aus (Auftrags-LV nach Nachtrag N01, Blätter 1 und 2,
// Korrektur an Blatt 1) werden die Befehle aus `typisch-zahlungen.json` so ausgeführt, wie die App sie schickt: AR 1 anlegen,
// Skonto und Bauabzugsteuer setzen, prüfen, mit dem geprüften Zahlbetrag freigeben, Zahlung erfassen; Blatt 1 korrigieren;
// AR 2 anlegen (Vorschlag der Vertragsstrafe aus AR 1: keine), Vertragsstrafe und Skonto setzen, prüfen, freigeben, Teilzahlung
// und Zahlung nach der Frist erfassen. Jeder Zwischenstand gleich den Sollwerten der Fixture; die eingefrorenen Zahlbeträge
// von M4 bleiben, wo keine Vertragsstrafe hinzukommt.

import type { Rechnung, RechnungBefehl, RechnungZustand } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { rechnungBefehlAusfuehren } from './rechnung-befehle';
import { rechnungChangeSetAnwenden, rechnungChangeSetUmkehren } from './rechnung-changeset';
import { rechnungPruefen } from './rechnung-pruefen';
import { abrechnungsFixture, erwarteFehler, erwarteOk, m4Stand, zahlungsFixture } from './testhilfen';
import { vertragsstrafeVorschlag } from './zahlungsstand';

const fx = zahlungsFixture();
const m4fx = abrechnungsFixture();
const m4 = m4Stand();

/** Führt die Befehle nacheinander aus wie die App (Ausführer, dann ChangeSet anwenden); jedes ChangeSet ist umkehrbar. */
function ausfuehren(z: RechnungZustand | null, befehle: readonly RechnungBefehl[]): RechnungZustand {
  let x = z;
  for (const befehl of befehle) {
    const cs = erwarteOk(rechnungBefehlAusfuehren(x, befehl));
    const danach = rechnungChangeSetAnwenden(x, cs);
    expect(rechnungChangeSetAnwenden(danach, rechnungChangeSetUmkehren(cs))).toEqual(x);
    x = danach;
  }
  if (x === null) throw new Error('Rechnung fehlt');
  return x;
}

/** Die Rechnung, wie M4 sie anlegt: ohne Freigabe und ohne die Felder aus v1.7b. */
const m4Neu = (r: Rechnung): Rechnung => ({ ...r, freigabe: null });

describe('Kette A5: M4 → Abzüge → Freigabe → Zahlungen (typisch-zahlungen)', () => {
  // AR 1 vor der Korrektur
  const ar1Angelegt = ausfuehren(null, [
    { art: 'RechnungAnlegen', rechnung: m4Neu(m4.ar1) },
    ...fx.befehle.ar1.vorFreigabe,
  ]);
  const ar1Vorschau = rechnungPruefen(ar1Angelegt.rechnung, m4.auftrag, [m4.blatt1], [ar1Angelegt.rechnung]);
  const ar1Frei = ausfuehren(ar1Angelegt, [
    { art: 'RechnungFreigeben', zahlbetrag: ar1Vorschau.kette.zahlbetrag },
    ...fx.befehle.ar1.nachFreigabe,
  ]);
  const ar1 = ar1Frei.rechnung;

  // AR 2 nach der Korrektur; der Vorschlag der Vertragsstrafe kommt aus AR 1.
  const blaetter = [m4.blatt1Korrigiert, m4.blatt2];
  const vorschlag = vertragsstrafeVorschlag([ar1], m4.ar2.auftragsLvId, m4.ar2.nummer);
  const ar2Angelegt = ausfuehren(null, [
    { art: 'RechnungAnlegen', rechnung: m4Neu(m4.ar2) },
    ...fx.befehle.ar2.vorFreigabe,
  ]);
  const ar2Vorschau = rechnungPruefen(ar2Angelegt.rechnung, m4.auftrag, blaetter, [
    ar1,
    ar2Angelegt.rechnung,
  ]);
  const ar2Frei = ausfuehren(ar2Angelegt, [
    { art: 'RechnungFreigeben', zahlbetrag: ar2Vorschau.kette.zahlbetrag },
    ...fx.befehle.ar2.nachFreigabe,
  ]);
  const ar2 = ar2Frei.rechnung;

  it('AR 1: Skonto und Steuer ändern den Zahlbetrag nicht; freigegeben wird 8.874,40 wie in M4', () => {
    expect(ar1Vorschau.kette.zahlbetrag).toBe(m4fx.pruefungen.ar1.kette.zahlbetrag);
    expect(ar1Vorschau.kette.zahlbetrag).toBe(fx.befehle.ar1.freigabe.zahlbetrag);
    // Vorschau vor der Freigabe: dieselben Fälle wie danach, noch keine Zahlung.
    expect(ar1Vorschau.zahlungsstand.mitSkonto).toEqual(fx.pruefungen.ar1.zahlungsstand.mitSkonto);
    expect(ar1Vorschau.zahlungsstand.offen).toBe(ar1Vorschau.zahlungsstand.ohneSkonto.auszahlung);
  });

  it('AR 1 nach Freigabe und Zahlung = Fixture (Rechnung, Kette, Zahlungsstand, keine Befunde)', () => {
    expect(ar1).toEqual(fx.rechnungen[0]);
    const p = rechnungPruefen(ar1, m4.auftrag, [m4.blatt1], [ar1]);
    expect(p.kette.vertragsstrafe).toBe(fx.pruefungen.ar1.kette.vertragsstrafe);
    expect(p.zahlungsstand).toEqual(fx.pruefungen.ar1.zahlungsstand);
    expect(p.befunde).toEqual([]);
  });

  it('AR 2: Vorschlag aus AR 1 ist keine Strafe; Vertragsstrafe senkt den Zahlbetrag von 10.070,67 auf 8.570,67', () => {
    expect(vorschlag).toBeNull();
    expect(m4fx.pruefungen.ar2NachKorrektur.kette.zahlbetrag).toBe('10070.67');
    expect(ar2Vorschau.kette.zahlbetrag).toBe(fx.pruefungen.ar2.kette.zahlbetrag);
    expect(ar2Vorschau.kette.vertragsstrafe).toBe('1500.00');
    expect(ar2Vorschau.kette.fruehereZahlbetraege).toBe('8874.40');
  });

  it('AR 2 nach Freigabe und Zahlungen = Fixture; der Vorschlag für eine AR 3 ist die kumulierte Strafe aus AR 2', () => {
    expect(ar2).toEqual(fx.rechnungen[1]);
    const p = rechnungPruefen(ar2, m4.auftrag, blaetter, [ar1, ar2]);
    expect(p.kette.zahlbetrag).toBe(fx.pruefungen.ar2.kette.zahlbetrag);
    expect(p.zahlungsstand).toEqual(fx.pruefungen.ar2.zahlungsstand);
    expect(p.befunde).toEqual([]);
    expect(vertragsstrafeVorschlag([ar1, ar2], ar2.auftragsLvId, 3)).toEqual(ar2.vertragsstrafe);
  });

  it('AR 1 nach der Korrektur: eingefroren bleibt 8.874,40 (Befund freigabe-abweichend), Zahlungsstand unverändert', () => {
    const p = rechnungPruefen(ar1, m4.auftrag, blaetter, [ar1, ar2]);
    expect(p.zahlungsstand).toEqual(fx.pruefungen.ar1.zahlungsstand);
    expect(p.befunde.map((b) => b.code)).toEqual(['freigabe-abweichend']);
  });

  it('Freigabe aufheben ist gesperrt, solange Zahlungen bestehen (Q5)', () => {
    expect(erwarteFehler(rechnungBefehlAusfuehren(ar1Frei, { art: 'RechnungsfreigabeAufheben' })).code).toBe(
      'zahlungen-vorhanden',
    );
    expect(erwarteFehler(rechnungBefehlAusfuehren(ar2Frei, { art: 'RechnungsfreigabeAufheben' })).code).toBe(
      'zahlungen-vorhanden',
    );
  });
});
