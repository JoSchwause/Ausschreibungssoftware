// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Rechnungen prüfen und freigeben, XRechnung einlesen. Weg wie Tor M4 (Ticket 85, D-85.1): LV `typisch` über
// den Testpfad, Angebot von Bieter B als X84 über die Oberfläche, Zuschlag im Preisspiegel; Nachtrag N01 und die
// Aufmaßblätter kommen über den Testpfad als Befehle (ihre Seiten sind Tickets 86 und 87). Dann alles in der Oberfläche:
// Abschlagsrechnung 1 → Prüfansicht (jede Zeile der Kette wie die Fixture, Zahlbetrag 8.874,40) → freigeben → Blatt 2 →
// Abschlagsrechnung 2 zieht den eingefrorenen Zahlbetrag ab (10.100,84) → Freigabe-Reihenfolge, Rückgängig/Wiederholen,
// `konflikt` als Meldung → XRechnung (selbst verfasste Datei aus Ticket 76) einlesen → Neuladen.
//
// Alle erwarteten Zahlen stehen in den Fixtures (`typisch-abrechnung.json`, `packages/erechnung/testdaten/README.md`) oder
// sind daraus durch eine Subtraktion hergeleitet, nie aus einem Lauf von `abrechnung`.

import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Aufmass, AuftragsLeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, erwarteMeldung, projektAnlegen } from './hilfen';
import {
  M4_BIETER,
  M4_NACHTRAG_LV,
  M4_PRUEFUNGEN,
  M4_RECHNUNGEN,
  m4Blatt,
  m4Nachtragsknoten,
  type FxKette,
} from './rechnung-fixture';

const wurzel = new URL('../../../', import.meta.url);
const datei = (rel: string): string => new URL(rel, wurzel).pathname;
const de = (b: string): string => b.replace('.', ',');

/** Betrag in Cent (Fixture `1234.56`); nur für die eine Differenz unten. */
const cent = (b: string): bigint => BigInt(b.replace('.', '').replace(',', ''));
const ausCent = (c: bigint): string => `${(c / 100n).toString()}.${(c % 100n).toString().padStart(2, '0')}`;

/** Legt ein Aufmaßblatt über den Testpfad an (Befehl `AufmassAnlegen`). */
async function blattAnlegen(page: Page, aufmass: Aufmass): Promise<void> {
  expect(await page.evaluate((a) => window.tethysTest?.aufmassAnlegen(a), aufmass)).toBe(true);
}

/** Wechselt in der App (ohne Neuladen, der Undo-Stapel bleibt) zur Liste und lädt sie dabei neu aus dem Speicher. */
async function listeNeuLaden(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Zum Auftrags-LV' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await page.getByRole('toolbar').getByRole('link', { name: 'Rechnungen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Rechnungen – / })).toBeVisible();
}

/** Öffnet die Prüfansicht einer Rechnung über die Liste (in der App, ohne Neuladen). */
async function oeffnen(page: Page, nummer: number): Promise<void> {
  if (await page.getByRole('link', { name: 'Zur Rechnungsliste' }).isVisible())
    await page.getByRole('link', { name: 'Zur Rechnungsliste' }).click();
  await page.getByRole('link', { name: `Rechnung ${String(nummer)} öffnen` }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: new RegExp(`rechnung ${String(nummer)} – `) }),
  ).toBeVisible();
}

/** Die Zeilen der Abzugskette in der Prüfansicht wie die Fixture (de-DE). */
async function kettePruefen(page: Page, k: FxKette, frueher: readonly number[]): Promise<void> {
  const soll: [string, string][] = [
    ['leistung', k.leistung],
    ['nachlass', k.nachlass],
    ['nettoNachNachlass', k.nettoNachNachlass],
    ['mwst', k.mwst],
    ['bruttoKumuliert', k.bruttoKumuliert],
    ...k.umlagen.map((u, i): [string, string] => [`umlage-${String(i)}`, u.betrag]),
    ['einbehalt', k.einbehalt],
    ...frueher.map((n): [string, string] => [`frueher-${String(n)}`, k.fruehereZahlbetraege]),
    ['zahlbetrag', k.zahlbetrag],
  ];
  if (frueher.length === 0) soll.splice(-1, 0, ['fruehere', k.fruehereZahlbetraege]);
  for (const [schluessel, betrag] of soll)
    await expect(page.getByTestId(`kette-${schluessel}`)).toHaveText(betragDe(betrag));
}

const werkzeuge = (page: Page): Locator => page.getByRole('toolbar', { name: 'Werkzeuge der Rechnungen' });

async function neueRechnung(page: Page, nummer: number, eingang: string, rnr: string): Promise<Locator> {
  await werkzeuge(page).getByRole('button', { name: 'Neue Rechnung' }).click();
  const dialog = page.getByRole('dialog', { name: `Neue Rechnung ${String(nummer)}` });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Eingangsdatum').fill(eingang);
  await dialog.getByLabel('Rechnungsnummer des Auftragnehmers').fill(rnr);
  return dialog;
}

test('Rechnungen: AR 1 prüfen und freigeben, AR 2 zieht AR 1 ab, XRechnung einlesen, Neuladen', async ({
  page,
}) => {
  const [ar1, ar2] = M4_RECHNUNGEN;
  if (ar1 === undefined || ar2 === undefined) throw new Error('Fixture');

  // Projekt, LV `typisch`, Angebot von Bieter B (X84), Zuschlag ohne Wahl.
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '') as ProjektId;
  const inhalt = fixtureInhalt('typisch');
  const lv = await page.evaluate(([id, i]) => window.tethysTest?.lvAnlegen(id as never, i as never), [
    projektId,
    inhalt,
  ] as const);
  expect(lv?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page
    .getByLabel('Angebotsdatei wählen')
    .setInputFiles(datei('fixtures/angebote/typisch-bieter-b.x84'));
  const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await expect(einlesen.getByLabel('Bieter')).toHaveValue(M4_BIETER);
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await expect(angebote.getByRole('row', { name: new RegExp(M4_BIETER) })).toBeVisible();
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${M4_BIETER}` })
    .click();
  const zuschlag = page.getByRole('dialog', { name: `Zuschlag erteilen – ${M4_BIETER}` });
  await zuschlag.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  const auftragsLvId = decodeURIComponent(
    new URL(page.url()).pathname.split('/').at(-1) ?? '',
  ) as AuftragsLeistungsverzeichnisId;

  // Nachtrag N01 und Blatt 1 als Befehle über den Testpfad.
  const nachtrag = await page.evaluate(([a, n, k]) => window.tethysTest?.nachtragUebernehmen(a, n, k), [
    auftragsLvId,
    M4_NACHTRAG_LV,
    m4Nachtragsknoten(auftragsLvId),
  ] as const);
  expect(nachtrag).toBe(true);
  await blattAnlegen(page, m4Blatt(0, projektId, auftragsLvId));

  // Zur Rechnungsliste über den Link des Auftrags-LV.
  await page.getByRole('toolbar').getByRole('link', { name: 'Rechnungen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Rechnungen – / })).toBeVisible();
  await expect(page.getByText('Noch keine Rechnung erfasst.')).toBeVisible();

  // Abschlagsrechnung 1: Blatt 1 vorgewählt; Umlage 0,50 % und Sicherheitseinbehalt 5,00 % wie die Fixture.
  let dialog = await neueRechnung(page, 1, '30.10.2026', ar1.rechnungsnummerAuftragnehmer);
  await expect(dialog.getByRole('checkbox', { name: /^Blatt 1/ })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Abschlagsrechnung' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Umlage hinzufügen' }).click();
  const umlage = ar1.umlagen[0];
  if (umlage === undefined) throw new Error('Fixture: Umlage');
  await dialog.getByLabel('Bezeichnung der Umlage 1').fill(umlage.bezeichnung);
  await dialog.getByLabel('Satz der Umlage 1').fill(de(umlage.satz));
  await dialog.getByLabel('Sicherheitseinbehalt').fill(de(ar1.sicherheitSatz ?? ''));
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();

  // Prüfansicht AR 1: jede Zeile wie die Fixture; ohne Forderung kein Vergleich (D-44).
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 1 – / })).toBeVisible();
  await kettePruefen(page, M4_PRUEFUNGEN.ar1.kette, []);
  await expect(page.getByTestId('gefordert-zahlbetrag')).toHaveText('–');
  await expect(page.getByTestId('differenz-zahlbetrag')).toHaveText('–');

  // Freigeben: Bestätigung nennt den Betrag, der eingefroren wird (Q5).
  await page.getByRole('button', { name: 'Freigeben', exact: true }).click();
  const frage = page.getByRole('dialog', { name: 'Rechnung 1 freigeben' });
  await expect(frage).toContainText(`${betragDe(M4_PRUEFUNGEN.ar1.kette.zahlbetrag)} €`);
  await frage.getByRole('button', { name: 'Freigeben', exact: true }).click();
  await expect(page.getByTestId('freigabe')).toHaveText(`Freigegeben mit ${betragDe('8874.40')} €`);
  await expect(page.getByRole('button', { name: 'Angaben bearbeiten' })).toBeDisabled();

  // Blatt 2 (Testpfad), dann Abschlagsrechnung 2: beide Blätter, Umlage und Satz aus AR 1 vorgeschlagen.
  await blattAnlegen(page, m4Blatt(1, projektId, auftragsLvId));
  await listeNeuLaden(page);
  dialog = await neueRechnung(page, 2, '27.11.2026', ar2.rechnungsnummerAuftragnehmer);
  await expect(dialog.getByRole('checkbox', { name: /^Blatt 1/ })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: /^Blatt 2/ })).toBeChecked();
  await expect(dialog.getByLabel('Bezeichnung der Umlage 1')).toHaveValue(umlage.bezeichnung);
  await expect(dialog.getByLabel('Satz der Umlage 1')).toHaveValue(de(umlage.satz));
  await expect(dialog.getByLabel('Sicherheitseinbehalt')).toHaveValue(de(ar2.sicherheitSatz ?? ''));
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 2 – / })).toBeVisible();
  await kettePruefen(page, M4_PRUEFUNGEN.ar2VorKorrektur.kette, [1]);
  await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toBeEnabled();

  // Freigabe von AR 1 aufheben: AR 2 ist dann gesperrt, mit Erklärung. Rückgängig stellt die Freigabe wieder her und
  // zeigt AR 1; Wiederholen hebt sie wieder auf.
  await oeffnen(page, 1);
  await page.getByRole('button', { name: 'Freigabe aufheben' }).click();
  const aufheben = page.getByRole('dialog', { name: 'Freigabe von Rechnung 1 aufheben' });
  await aufheben.getByRole('button', { name: 'Freigabe aufheben' }).click();
  await expect(page.getByTestId('freigabe')).toHaveText('Offen (nicht freigegeben)');
  await oeffnen(page, 2);
  const freigeben = page.getByRole('button', { name: 'Freigeben', exact: true });
  await expect(freigeben).toBeDisabled();
  await expect(freigeben).toHaveAccessibleDescription(
    'Erst Rechnung 1 freigeben: Freigegeben wird in der Reihenfolge der Nummern.',
  );
  await expect(page.getByTestId('befunde')).toContainText('Rechnung 1 ist nicht freigegeben');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 1 – / })).toBeVisible();
  await expect(page.getByTestId('freigabe')).toHaveText(`Freigegeben mit ${betragDe('8874.40')} €`);
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(page.getByTestId('freigabe')).toHaveText('Offen (nicht freigegeben)');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByTestId('freigabe')).toHaveText(`Freigegeben mit ${betragDe('8874.40')} €`);

  // Ein `konflikt` des Speichers kommt als verständliche Meldung; nichts ändert sich (Q5).
  await oeffnen(page, 2);
  await expect(page.getByRole('button', { name: 'Freigeben', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    window.tethysTest?.speicherFehler('konflikt');
  });
  await page.getByRole('button', { name: 'Freigeben', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Rechnung 2 freigeben' })
    .getByRole('button', { name: 'Freigeben' })
    .click();
  await erwarteMeldung(page, 'Freigaben gehen nur in der Reihenfolge der Rechnungsnummern');
  await expect(page.getByTestId('freigabe')).toHaveText('Offen (nicht freigegeben)');
  await page.evaluate(() => {
    window.tethysTest?.speicherFehler(null);
  });

  // XRechnung (875, CII) in AR 2: Vorschau, Art aus BT-3, Ziel vorgewählt; übernimmt Nummer, Datum und Forderungen.
  await page
    .getByLabel('XRechnung wählen')
    .setInputFiles(datei('packages/erechnung/testdaten/bau-abschlag-875.xml'));
  const xr = page.getByRole('dialog', { name: 'XRechnung einlesen' });
  await expect(xr.getByTestId('xr-nummer')).toHaveText('AR-2026-001');
  await expect(xr.getByTestId('xr-datum')).toHaveText('15.09.2026');
  await expect(xr.getByTestId('xr-art')).toHaveText('Abschlagsrechnung');
  await expect(xr.getByTestId('xr-netto')).toHaveText('10.185,99 €');
  await expect(xr.getByTestId('xr-brutto')).toHaveText('12.121,33 €');
  await expect(xr.getByTestId('xr-zahlbetrag')).toHaveText('12.121,33 €');
  await expect(xr.getByRole('radio', { name: 'Abschlagsrechnung' })).toBeChecked();
  await expect(xr.getByRole('radio', { name: 'Rechnung 2 (offen)' })).toBeChecked();
  await xr.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(xr).toBeHidden();
  await expect(page.getByTestId('rechnungsnummer')).toHaveText('AR-2026-001');
  // Verglichen wird bevorzugt der Zahlbetrag (D-44): gefordert − geprüft.
  const differenz = ausCent(cent('12121.33') - cent(M4_PRUEFUNGEN.ar2VorKorrektur.kette.zahlbetrag));
  await expect(page.getByTestId('gefordert-zahlbetrag')).toHaveText('12.121,33');
  await expect(page.getByTestId('geprueft-zahlbetrag')).toHaveText(betragDe('10100.84'));
  await expect(page.getByTestId('differenz-zahlbetrag')).toHaveText(betragDe(differenz));
  await expect(page.getByTestId('befunde')).toContainText(
    `Zahlbetrag: Gefordert weicht um ${betragDe(differenz)} €`,
  );
  // Rückgängig nimmt die Übernahme zurück, Wiederholen bringt sie wieder.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByTestId('gefordert-zahlbetrag')).toHaveText('–');
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(page.getByTestId('gefordert-zahlbetrag')).toHaveText('12.121,33');

  // Neuladen: alles gespeichert.
  await page.reload();
  await kettePruefen(page, M4_PRUEFUNGEN.ar2VorKorrektur.kette, [1]);
  await expect(page.getByTestId('gefordert-zahlbetrag')).toHaveText('12.121,33');
  await page.getByRole('link', { name: 'Zur Rechnungsliste' }).click();
  const liste = page.getByRole('table', { name: 'Rechnungen des Auftrags-LV' });
  await expect(liste.getByTestId('zahlbetrag')).toHaveText([betragDe('8874.40'), betragDe('10100.84')]);
  await expect(liste.getByTestId('status')).toHaveText(['freigegeben', 'offen']);
});
