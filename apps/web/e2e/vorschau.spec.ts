// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 155: Vorschau-Module angebunden. Mangel → Position und Bauteil werden gewählt, nicht getippt; ein Vorgang bezieht
// sich auf einzelne Knoten des Auftrags-LV, das Formular schlägt den Fortschritt aus dem Leistungsstand vor, und ein
// Vorgang lässt sich per Tastatur in seiner Ebene verschieben (ein Rückgängig-Schritt); Honorar und Kostenermittlung
// verweisen aufeinander. Bedienung nur über Schaltflächen, Felder und Tastatur; die Vorbereitung (LV `typisch`) über den
// Testpfad wie in `bim-mengen.spec.ts`.

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { projektAnlegen } from './hilfen';
import { ifcDatei } from './x1-aufbau';

const wurzel = new URL('../../../', import.meta.url);

async function waehle(page: Page, bereich: Locator, label: string, option: string | RegExp): Promise<void> {
  await bereich.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).click();
}

/** Projekt mit LV `typisch`, Modell `haus-v1` und dem Zuschlag an Bieter A; gibt Projekt und Name des Auftrags-LV zurück. */
async function projektMitAuftrag(page: Page): Promise<{ projektId: string; auftrag: string }> {
  await projektAnlegen(page, 'Vorschau-Haus', 'Bauherr Vorschau');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const inhalt = fixtureInhalt('typisch');
  const lv = await page.evaluate(([id, i]) => window.tethysTest?.lvAnlegen(id as never, i as never), [
    projektId,
    inhalt,
  ] as const);
  expect(lv?.ok).toBe(true);

  await page.goto(`/projekt/${projektId}/modelle`);
  await page.getByLabel('IFC-Datei wählen').setInputFiles(ifcDatei('haus-v1'));
  const eingelesen = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(eingelesen.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await eingelesen.getByRole('button', { name: 'Modell öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();

  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page
    .getByLabel('Angebotsdatei wählen')
    .setInputFiles(new URL('fixtures/angebote/typisch-bieter-a.x84', wurzel).pathname);
  const x84 = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await x84.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await expect(angebote.getByRole('row', { name: /Bieter A/ })).toBeVisible();
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: 'Zuschlag erteilen: Bieter A' })
    .click();
  await page
    .getByRole('dialog', { name: 'Zuschlag erteilen – Bieter A' })
    .getByRole('button', { name: 'Zuschlag erteilen', exact: true })
    .click();
  const kopf = page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / });
  await expect(kopf).toBeVisible();
  const auftrag = ((await kopf.textContent()) ?? '').replace(/^Auftrags-LV – /, '');
  return { projektId, auftrag };
}

test('Mangel wählt Position und Bauteil; Vorgang mit Knoten, Fortschrittsvorschlag und Verschieben', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const { projektId, auftrag } = await projektMitAuftrag(page);
  const haus = JSON.parse(readFileSync(new URL('fixtures/typisch-bim.json', wurzel), 'utf8')) as {
    bauteile: { v1: readonly { name: string }[] };
  };
  expect(haus.bauteile.v1.some((b) => b.name === 'Bodenplatte')).toBe(true);

  // --- Mangel: Position aus dem Auftrags-LV, Bauteil aus dem Modell -------------------------------------------------
  await page.goto(`/projekt/${projektId}/maengel`);
  await page
    .getByRole('toolbar', { name: 'Werkzeuge der Mängel' })
    .getByRole('button', { name: 'Neuer Mangel' })
    .click();
  const neu = page.getByRole('dialog', { name: 'Neuer Mangel' });
  await neu.getByLabel('Titel', { exact: true }).fill('Riss in der Bodenplatte');
  await expect(neu.getByRole('combobox', { name: 'Position im Auftrags-LV' })).toBeDisabled();
  await waehle(page, neu, 'Auftrags-LV', /\(Bieter A\)$/);
  await waehle(page, neu, 'Position im Auftrags-LV', /^02\.0020 Baugrube ausheben$/);
  await expect(neu.getByText('Bauteile aus dem neuesten Stand „haus-v1“')).toBeVisible();
  await waehle(page, neu, 'Bauteil', /^Bodenplatte · .* · EG$/);
  await neu.getByRole('button', { name: 'Speichern' }).click();
  await expect(neu).toBeHidden();
  await expect(page.getByTestId('auswahl')).toHaveText('Ausgewählt: Mangel 1 – Riss in der Bodenplatte');

  await page
    .getByRole('toolbar', { name: 'Werkzeuge der Mängel' })
    .getByRole('button', { name: 'Bearbeiten', exact: true })
    .click();
  const bearbeiten = page.getByRole('dialog', { name: 'Mangel 1 bearbeiten' });
  await expect(bearbeiten.getByRole('combobox', { name: 'Position im Auftrags-LV' })).toHaveText(
    '02.0020 Baugrube ausheben',
  );
  await expect(bearbeiten.getByRole('combobox', { name: 'Bauteil', exact: true })).toHaveText(
    /^Bodenplatte · /,
  );
  await bearbeiten.getByRole('button', { name: 'Abbrechen' }).click();

  // --- Bauzeitenplan: Bezug auf Titel 02, Vorschlag aus dem Leistungsstand ----------------------------------------
  await page.goto(`/projekt/${projektId}/bauzeit`);
  const form = page.getByRole('form', { name: 'Bauzeitenplan anlegen' });
  await form.getByLabel('Name').fill('Ablauf');
  await form.getByLabel('Projektbeginn').fill('02.11.2026');
  await form.getByRole('button', { name: 'Bauzeitenplan anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bauzeitenplan: Ablauf' })).toBeVisible();

  await page.getByRole('button', { name: 'Vorgang anlegen' }).click();
  const v1 = page.getByRole('dialog', { name: 'Vorgang anlegen' });
  await v1.getByLabel('Bezeichnung').fill('Erdarbeiten');
  await v1.getByLabel('Nummer').fill('1');
  await v1.getByLabel('Dauer (Arbeitstage)').fill('5');
  await waehle(page, v1, 'Bezug auf LV', `Auftrags-LV: ${auftrag}`);
  // Ohne Aufmaß ist nichts geleistet: 0 % (D-109.7), übernommen nur auf Knopfdruck.
  await expect(v1.getByTestId('fortschritt-vorschlag')).toHaveText(
    'Vorschlag aus dem Leistungsstand: 0,00 %',
  );
  await expect(v1.getByLabel('Fortschritt (%)')).toHaveValue('');
  await waehle(page, v1, 'Umfang des Bezugs', 'Ausgewählte Gliederungen und Positionen');
  await expect(v1.getByText('0 Knoten gewählt')).toBeVisible();
  await v1.getByRole('button', { name: 'Speichern' }).click();
  await expect(v1.getByText('Bitte mindestens eine Gliederung oder Position wählen.')).toBeVisible();
  await v1.getByRole('checkbox', { name: /^02 / }).check();
  await expect(v1.getByText('1 Knoten gewählt')).toBeVisible();
  await v1.getByRole('button', { name: 'Vorschlag übernehmen' }).click();
  await expect(v1.getByLabel('Fortschritt (%)')).toHaveValue('0,00');
  await v1.getByRole('button', { name: 'Speichern' }).click();
  await expect(v1).toBeHidden();

  await page.getByRole('button', { name: 'Vorgang anlegen' }).click();
  const v2 = page.getByRole('dialog', { name: 'Vorgang anlegen' });
  await v2.getByLabel('Bezeichnung').fill('Rohbau');
  await v2.getByLabel('Nummer').fill('2');
  await v2.getByLabel('Dauer (Arbeitstage)').fill('10');
  await v2.getByRole('button', { name: 'Speichern' }).click();
  await expect(v2).toBeHidden();

  // --- Verschieben per Tastatur in der Ebene, ein Rückgängig-Schritt -----------------------------------------------
  const grid = page.getByRole('treegrid', { name: 'Vorgänge' });
  const reihe = (): Promise<string[]> =>
    grid.locator('[role="row"] [data-spalte="vorgang"] .tx-grid__text').allTextContents();
  await expect.poll(reihe).toEqual(['Erdarbeiten', 'Rohbau']);
  await expect(page.getByRole('button', { name: /^Nach oben/ })).toBeEnabled();
  await page.keyboard.press('Alt+ArrowUp');
  await expect.poll(reihe).toEqual(['Rohbau', 'Erdarbeiten']);
  await expect(page.getByRole('button', { name: /^Nach oben/ })).toBeDisabled();
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect.poll(reihe).toEqual(['Erdarbeiten', 'Rohbau']);

  // Der Bezug auf den Titel bleibt beim Bearbeiten gewählt.
  await grid
    .locator('[role="row"] [data-spalte="vorgang"] .tx-grid__text', { hasText: 'Erdarbeiten' })
    .click();
  await page.getByRole('button', { name: 'Vorgang bearbeiten' }).click();
  const bearb = page.getByRole('dialog', { name: 'Vorgang bearbeiten' });
  await expect(bearb.getByRole('combobox', { name: 'Umfang des Bezugs' })).toHaveText(
    'Ausgewählte Gliederungen und Positionen',
  );
  await expect(bearb.getByRole('checkbox', { name: /^02 / })).toBeChecked();
  await bearb.getByRole('button', { name: 'Abbrechen' }).click();
});

test('Honorar und Kostenermittlung verweisen aufeinander', async ({ page }) => {
  await projektAnlegen(page, 'Verweise', 'Bauherr Verweise');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  await page.goto(`/projekt/${projektId}/kosten`);
  await page.getByLabel('Name', { exact: true }).fill('Kostenberechnung Haus');
  await page.getByRole('button', { name: 'Kostenermittlung anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenberechnung Haus' }),
  ).toBeVisible();
  // Noch liest kein Honorar diese Kostenermittlung.
  await expect(page.getByRole('link', { name: /^Zum Honorar/ })).toHaveCount(0);

  await page.goto(`/projekt/${projektId}/honorar`);
  await page.getByLabel('Name', { exact: true }).fill('Honorar Architektur');
  await page.getByRole('button', { name: 'Honorarberechnung anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Honorarberechnung – Honorar Architektur' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Objekt hinzufügen' }).click();
  const objekt = page.locator('section.honorar__objekt').first();
  await waehle(page, objekt, 'Anrechenbare Kosten aus', /Kostenermittlung des Projekts/);
  await objekt.getByRole('link', { name: 'Zur Kostenermittlung „Kostenberechnung Haus“' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenberechnung Haus' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Zum Honorar „Honorar Architektur“' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Honorarberechnung – Honorar Architektur' }),
  ).toBeVisible();
});
