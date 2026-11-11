// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor M3 (Ticket 64, `plan.md` §4): zwei X84-Angebote über die Oberfläche einlesen, der Preisspiegel zeigt die
// Sollwerte der Fixture, der Zuschlag an den Erstplatzierten (mit der Alternative der Wahlgruppe) erzeugt das
// Auftrags-LV mit den erwarteten Summen; ein zweiter Zuschlag geht nicht, Rückgängig nimmt ihn zurück, nach dem
// Neuladen ist alles noch da.
//
// LV `typisch` kommt als X83 über „GAEB einlesen“ (Ticket 91, D-64.1 zurückgenommen): Die Datei schreibt der GAEB-Writer
// aus der Fixture; seit Ticket 73 trägt die Wahlgruppe nach dem Rundweg ihre Grundposition (02.0070 Variante 0, 02.0070 A
// Variante 1), der Zuschlag mit Wahl ersetzt sie also. Alle erwarteten Zahlen stehen in den Fixtures
// (`typisch-angebote.json`: Bietersummen, Rang, GP je Position) oder sind daraus nach N2 hergeleitet, nie aus einem Lauf
// des Kerns.

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureAlsX83 } from './fixture-inhalt';
import { betragDe, gaebEinlesen, projektAnlegen, summen } from './hilfen';

type Summen = Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
interface FxBieter {
  readonly angebotId: string;
  readonly name: string;
  readonly datei: string;
  readonly summen: Summen;
}
const wurzel = new URL('../../../fixtures/', import.meta.url);
const fx = JSON.parse(readFileSync(new URL('typisch-angebote.json', wurzel), 'utf8')) as {
  angebote: readonly {
    id: string;
    nachlass: { art: 'prozent' | 'betrag'; wert: string } | null;
    sollwerte: { positionen: Readonly<Record<string, { gp: string }>> };
  }[];
  preisspiegel: {
    bieter: readonly FxBieter[];
    vergleiche: readonly { angebotIds: readonly string[]; rang: Readonly<Record<string, string>> }[];
  };
};
const lvFx = JSON.parse(readFileSync(new URL('typisch.json', wurzel), 'utf8')) as {
  name: string;
  mwstSatz: string;
  knoten: readonly { id: string; ordnungszahl?: string; positionsart?: string; grundpositionId?: string }[];
};

// Ticket 69: für M3 das Paar A+B (Rang A 1, B 2).
const PAAR = fx.preisspiegel.bieter.filter((b) => b.name === 'Bieter A' || b.name === 'Bieter B');
const RANG =
  fx.preisspiegel.vergleiche.find(
    (v) => v.angebotIds.length === 2 && PAAR.every((b) => v.angebotIds.includes(b.angebotId)),
  )?.rang ?? {};
const ERSTER = PAAR.find((b) => RANG[b.angebotId] === '1') as FxBieter;

// Die Wahlgruppe von `typisch`: die Alternative 02.0070 A und ihre Grundposition 02.0070.
const ALTERNATIVE = lvFx.knoten.find((k) => k.positionsart === 'wahl');
const GRUND = lvFx.knoten.find((k) => k.id === ALTERNATIVE?.grundpositionId);
const gpErster = (id: string | undefined): string =>
  fx.angebote.find((a) => a.id === ERSTER.angebotId)?.sollwerte.positionen[id ?? '']?.gp ?? '';

/** Beträge in Cent als ganze Zahl (die Fixture schreibt `1234.56`); nur für die Herleitung der Erwartung. */
const cent = (b: string): bigint => BigInt(b.replace('.', ''));
const betrag = (c: bigint): string => `${(c / 100n).toString()}.${(c % 100n).toString().padStart(2, '0')}`;

/** Prozentwert der Fixture als Hundertstel (`19.00` → 1900); kaufmännisch gerundet(c × p / 100, 2) für c ≥ 0. */
const prozentVon = (c: bigint, p: string): bigint => (c * cent(p) + 5000n) / 10000n;

/**
 * Erwartete Summen des Auftrags-LV mit gewählter Alternative (D-21, R2/N2): Die Alternative ersetzt die Grundposition,
 * das Netto ist das des Bieters minus GP der Grundposition plus GP der Alternative (beide GP aus der Fixture). Der
 * Nachlass ist der des Angebots aus der Fixture (D-21; N5: Prozent auf das Netto, kaufmännisch auf 2 Stellen, oder der
 * Betrag), MwSt = kaufmännisch gerundet(Netto nach Nachlass × Satz des LV, 2).
 */
function erwartet(): Summen {
  const netto = cent(ERSTER.summen.netto) - cent(gpErster(GRUND?.id)) + cent(gpErster(ALTERNATIVE?.id));
  const n = fx.angebote.find((a) => a.id === ERSTER.angebotId)?.nachlass ?? null;
  const nachlass = n === null ? 0n : n.art === 'prozent' ? prozentVon(netto, n.wert) : cent(n.wert);
  const nachNachlass = netto - nachlass;
  const mwst = prozentVon(nachNachlass, lvFx.mwstSatz);
  return {
    netto: betrag(netto),
    nachlass: betrag(nachlass),
    nettoNachNachlass: betrag(nachNachlass),
    mwst: betrag(mwst),
    brutto: betrag(nachNachlass + mwst),
  };
}

const datei = (rel: string): string => new URL(rel, wurzel).pathname;
const bieterTabelle = (page: Page): Locator => page.getByRole('table', { name: 'Bieter des Preisspiegels' });
const zuschlagKnopf = (page: Page, name: string): Locator =>
  bieterTabelle(page).getByRole('button', { name: `Zuschlag erteilen: ${name}` });

/** Summenzeile des schreibgeschützten Grids des Auftrags-LV in der Form der Fixture (de-DE). */
const summenDe = (s: Summen): Record<string, string> => ({
  Netto: betragDe(s.netto),
  Nachlass: betragDe(s.nachlass),
  'Netto nach Nachlass': betragDe(s.nettoNachNachlass),
  MwSt: betragDe(s.mwst),
  Brutto: betragDe(s.brutto),
});

async function preisspiegelPruefen(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /^Preisspiegel/ })).toBeVisible();
  for (const b of PAAR) {
    const zeile = bieterTabelle(page).getByRole('row', { name: new RegExp(b.name) });
    await expect(zeile.getByTestId('rang')).toHaveText(RANG[b.angebotId] ?? '');
    await expect(zeile.getByTestId('netto')).toHaveText(betragDe(b.summen.netto));
    await expect(zeile.getByTestId('nettoNachNachlass')).toHaveText(betragDe(b.summen.nettoNachNachlass));
    await expect(zeile.getByTestId('brutto')).toHaveText(betragDe(b.summen.brutto));
  }
}

async function auftragsLvPruefen(page: Page, soll: Summen): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await expect(page.getByTestId('auftragnehmer')).toHaveText(ERSTER.name);
  const grid = page.getByRole('treegrid', { name: 'Positionen des Auftrags-LV' });
  await expect(grid).toHaveAttribute('aria-readonly', 'true');
  await expect.poll(() => summen(page)).toMatchObject(summenDe(soll));
}

test('Tor M3: zwei X84, Preisspiegel wie die Sollwerte, Zuschlag mit Wahl erzeugt das Auftrags-LV', async ({
  page,
}) => {
  expect(PAAR).toHaveLength(2);
  expect(ALTERNATIVE?.ordnungszahl).toBe('02.0070');
  const soll = erwartet();

  // Projekt und LV `typisch` per X83, dann die zwei Angebote über „Angebot einlesen“.
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektPfad = new URL(page.url()).pathname;
  const projektId = decodeURIComponent(projektPfad.split('/').at(-1) ?? '');
  await gaebEinlesen(page, fixtureAlsX83('typisch'), lvFx.name);
  const lvPfad = new URL(page.url()).pathname;
  for (const b of PAAR) {
    await page.getByLabel('Angebotsdatei wählen').setInputFiles(datei(b.datei));
    const dialog = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
    await expect(dialog.getByLabel('Bieter')).toHaveValue(b.name);
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    const liste = page.getByRole('dialog', { name: 'Angebote' });
    await expect(liste.getByRole('row', { name: new RegExp(b.name) })).toBeVisible();
    await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await expect(liste).toBeHidden();
  }

  // Preisspiegel: Netto, Netto nach Nachlass, Brutto und Rang je Bieter wie die Fixture.
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await preisspiegelPruefen(page);

  // Zuschlag an den Erstplatzierten, mit der Alternative 02.0070 A.
  await zuschlagKnopf(page, ERSTER.name).click();
  const dialog = page.getByRole('dialog', { name: `Zuschlag erteilen – ${ERSTER.name}` });
  await expect(dialog.getByTestId('zuschlag-entfallend')).toHaveText('1'); // ohne Wahl entfällt die Alternative
  await dialog.getByRole('checkbox', { name: /^02\.0070A .* wählen$/ }).check();
  await expect(dialog.getByTestId('zuschlag-entfallend')).toHaveText('1'); // nun die Grundposition
  await expect(dialog.getByTestId('zuschlag-unbepreist')).toHaveText('0');
  await expect(dialog).toContainText('Im Auftrags-LV entfällt 1 Position: 02.0070 ');
  await dialog.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(dialog).toBeHidden();
  await auftragsLvPruefen(page, soll);
  const auftragPfad = new URL(page.url()).pathname;
  expect(auftragPfad).toMatch(new RegExp(`^/projekt/${projektId}/auftrag/[^/]+$`));

  // Rückgängig nimmt den Zuschlag zurück: zurück zum Preisspiegel, der Knopf geht wieder.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page).toHaveURL(new RegExp(`${lvPfad}/preisspiegel$`));
  await preisspiegelPruefen(page);
  await expect(zuschlagKnopf(page, ERSTER.name)).toBeEnabled();

  // Wiederholen bringt ihn zurück, auf die Seite des Auftrags-LV.
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(page).toHaveURL(new RegExp(`${auftragPfad}$`));
  await auftragsLvPruefen(page, soll);

  // Ein zweiter Zuschlag zum selben LV ist nicht möglich: Knöpfe aus, der Grund steht daneben.
  await page.getByRole('link', { name: `Angebot von ${ERSTER.name}` }).click();
  await preisspiegelPruefen(page);
  for (const b of PAAR) {
    await expect(zuschlagKnopf(page, b.name)).toBeDisabled();
    await expect(zuschlagKnopf(page, b.name)).toHaveAccessibleDescription(
      new RegExp(`an ${ERSTER.name} erteilt. Ein zweiter Zuschlag ist nicht möglich`),
    );
  }

  // Neuladen: Auftrags-LV, Summen und die Liste auf der Projektseite sind noch da.
  await page.goto(auftragPfad);
  await auftragsLvPruefen(page, soll);
  await page.reload();
  await auftragsLvPruefen(page, soll);
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  const liste = page.getByRole('list', { name: 'Auftrags-LVs des Projekts' });
  await expect(liste.getByRole('link', { name: new RegExp(`\\(${ERSTER.name}\\)$`) })).toBeVisible();
  await expect(liste).toContainText(`${betragDe(soll.nettoNachNachlass)} €`);
});
