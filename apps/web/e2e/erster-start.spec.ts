// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 147 (E2, Punkt 4): erster Start → Beispielprojekt laden → die Projektseite zeigt LV, Angebote und Auftrags-LV; die
// Hilfeseiten sind erreichbar; die Statuszeile zeigt Speicherzustand und letzte Sicherung; „GAEB-Datei einlesen“ legt ein
// Projekt an und öffnet das Einlesen. Nur Schaltflächen, Verweise und Tastatur, keine Testhaken. Die erwarteten Zahlen stehen
// in den Fixtures, nie aus einem Lauf der App.

import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { fixtureAlsX83 } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';

const lies = (pfad: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${pfad}`, import.meta.url), 'utf8'));
const TYPISCH = lies('fixtures/typisch.json') as {
  readonly name: string;
  readonly sollwerte: { readonly summen: { readonly nettoNachNachlass: string } };
};
const ABRECHNUNG = lies('fixtures/typisch-abrechnung.json') as {
  readonly zuschlag: {
    readonly bieterName: string;
    readonly sollwerte: { readonly summen: { readonly nettoNachNachlass: string } };
  };
};
const VERSION = (lies('apps/web/package.json') as { readonly version: string }).version;

const ohneUeberlauf = (): boolean => document.documentElement.scrollWidth <= window.innerWidth;

test('Erster Start: Begrüßung mit drei Wegen; das Beispielprojekt zeigt LV, Angebote und Auftrags-LV', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const start = page.getByRole('region', { name: 'Willkommen bei Tethys AVA' });
  await expect(start.getByText('Noch keine Projekte.')).toBeVisible();
  await expect(start.getByRole('heading', { level: 3 })).toHaveText([
    'Beispielprojekt ansehen',
    'Mit einer GAEB-Datei beginnen',
    'Leeres Projekt anlegen',
  ]);
  await expect(start.getByRole('note', { name: 'Wo die Daten liegen' })).toBeVisible();
  expect(await page.evaluate(ohneUeberlauf)).toBe(true);

  await start.getByRole('button', { name: 'Beispielprojekt laden' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beispielprojekt Musterhaus' })).toBeVisible();

  // Das LV mit drei Angeboten und dem Zuschlag; Netto nach Nachlass wie in der Fixture
  const lvs = page.getByRole('list', { name: 'Leistungsverzeichnisse', exact: true });
  await expect(lvs.getByRole('link', { name: TYPISCH.name, exact: true })).toBeVisible();
  await expect(lvs).toContainText('3 Angebote');
  await expect(lvs.getByRole('link', { name: `Zuschlag erteilt: ${TYPISCH.name}` })).toBeVisible();
  await expect(page.getByLabel(`Netto nach Nachlass ${TYPISCH.name}`, { exact: true })).toHaveText(
    `${betragDe(TYPISCH.sollwerte.summen.nettoNachNachlass)} €`,
  );

  // Das Auftrags-LV des bezuschlagten Bieters mit dessen Summe, dazu ein Aufmaßblatt, eine Rechnung und das Modell
  const auftraege = page.getByRole('list', { name: 'Auftrags-LVs des Projekts' });
  await expect(
    auftraege.getByRole('link', { name: new RegExp(`\\(${ABRECHNUNG.zuschlag.bieterName}\\)$`) }),
  ).toBeVisible();
  await expect(auftraege).toContainText(
    `${betragDe(ABRECHNUNG.zuschlag.sollwerte.summen.nettoNachNachlass)} €`,
  );
  await expect(page.getByRole('link', { name: /^Aufmaßblätter \(1\)/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Rechnungen \(1\)/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modelle (1)' })).toBeVisible();

  // Die Angebote auf der Seite des LV
  await lvs.getByRole('link', { name: TYPISCH.name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: TYPISCH.name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Angebote (3)' })).toBeVisible();
});

test('Hilfe: Erste Schritte, Daten und Sicherung, Tastenkürzel, Annahmen und Über sind erreichbar', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Hilfe' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();
  const reiter = page.getByRole('tablist', { name: 'Teile der Hilfe' });
  await expect(reiter.getByRole('tab')).toHaveText([
    'Erste Schritte',
    'Daten und Sicherung',
    'Tastenkürzel',
    'Annahmen',
    'Über',
  ]);
  await expect(page.getByRole('heading', { level: 2, name: 'Erste Schritte' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Rechnung prüfen' })).toBeVisible();

  // Per Tastatur zum nächsten Reiter
  await reiter.getByRole('tab', { name: 'Erste Schritte' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { level: 2, name: 'Daten und Sicherung' })).toBeVisible();

  await reiter.getByRole('tab', { name: 'Tastenkürzel' }).click();
  const zeilen = page.getByRole('table', { name: 'Tastenkürzel: Zeilen' });
  await expect(zeilen.getByRole('row', { name: /Strg\+Plus/ })).toContainText('Neue Position');
  await expect(zeilen.getByRole('row', { name: /Strg\+Entf oder Strg\+Minus/ })).toBeVisible();

  await reiter.getByRole('tab', { name: 'Annahmen' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Rechnungsprüfung' })).toBeVisible();
  await expect(page.getByText(/§ 48 EStG zählen auch Aufrechnungen/)).toBeVisible();
  await expect(page.getByText(/110 %/)).toBeVisible();

  await reiter.getByRole('tab', { name: 'Über' }).click();
  await expect(page.getByRole('definition').filter({ hasText: VERSION })).toBeVisible();
  await expect(page.getByText('AGPL-3.0-or-later')).toBeVisible();
  await expect(page.getByRole('link', { name: /github\.com/ })).toHaveAttribute('href', /^https:\/\//);

  // Ein Anker in der Adresse öffnet den Reiter direkt.
  await page.goto('/hilfe#annahmen');
  await expect(page.getByRole('tab', { name: 'Annahmen' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveTitle('Hilfe – Tethys AVA');
});

test('Statuszeile: Speicherzustand und letzte Sicherung; Hinweis zu den Daten beim ersten Projekt', async ({
  page,
}) => {
  await page.goto('/');
  const status = page.getByRole('contentinfo', { name: 'Statuszeile' });
  const speicher = status.getByRole('link', { name: /^Speicher: (dauerhaft|nicht dauerhaft|unbekannt)$/ });
  await expect(speicher).toBeVisible();

  await projektAnlegen(page, 'Statusprojekt', 'Bauherr S');
  await expect(status).toContainText('Noch nicht gesichert');
  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Projektdatei sichern' }).click(),
  ]);
  await expect(status.getByText(/^Letzte Sicherung: \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/)).toBeVisible();

  // Auf der Projektliste: die jüngste Sicherung mit dem Namen des Projekts; beim ersten Projekt der Hinweis zu den Daten
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Projekte' })
    .click();
  await expect(status).toContainText(/Letzte Sicherung: .* \(Statusprojekt\)/);
  const hinweis = page.getByRole('note', { name: 'Wo die Daten liegen' });
  await expect(hinweis).toBeVisible();
  await hinweis.getByRole('button', { name: 'Hinweis ausblenden' }).click();
  await expect(hinweis).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Statusprojekt' })).toBeVisible();
  await expect(hinweis).toHaveCount(0);

  // Der Speicherzustand führt zur Hilfe „Daten und Sicherung“.
  await speicher.click();
  await expect(page.getByRole('tab', { name: 'Daten und Sicherung' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { level: 3, name: 'Dauerhafter Speicher' })).toBeVisible();
});

test('„GAEB-Datei einlesen“ aus der Begrüßung legt ein Projekt an und öffnet das Einlesen', async ({
  page,
}) => {
  await page.goto('/');
  const start = page.getByRole('region', { name: 'Willkommen bei Tethys AVA' });
  const [auswahl] = await Promise.all([
    page.waitForEvent('filechooser'),
    start.getByRole('button', { name: 'GAEB-Datei einlesen …' }).click(),
  ]);
  await auswahl.setFiles(fixtureAlsX83('typisch'));
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await expect(dialog.getByTestId('anzahl-positionen')).toHaveText('25');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Neues Projekt' })).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'Leistungsverzeichnisse', exact: true })
      .getByRole('link', { name: TYPISCH.name, exact: true }),
  ).toBeVisible();
});
