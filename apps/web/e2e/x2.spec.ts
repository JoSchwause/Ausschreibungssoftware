// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X2 (Ticket 118, D-58): Der Bauzeitenplan aus `fixtures/bauzeit.json` (Ticket 112) entsteht über die Oberfläche
// (Formular je Vorgang, Vorgänger aus dem Plan gewählt) → kritischer Weg, Projektende und je Vorgang Beginn, Ende und
// Gesamtpuffer = Soll → Neuladen (gespeichert, U7) → PDF erzeugt, sein Text nennt das Projektende. Dazu Befund mit Sprunglink,
// Rückgängig/Wiederholen und Löschen mit Bestätigung.
//
// Alle erwarteten Werte stehen in der Fixture (von Hand hergeleitet, README der Fixtures, „Bauzeitenplan: Tor X2“), nie aus
// einem Lauf der App; die Daten werden nur ins deutsche Format gebracht (N4).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { projektAnlegen } from './hilfen';

interface FxVorgang {
  readonly id: string;
  readonly nummer: string;
  readonly bezeichnung: string;
  readonly elternId: string | null;
  readonly dauer: number;
  readonly vorgaenger: readonly {
    readonly vorgaengerId: string;
    readonly art: string;
    readonly abstand: number;
  }[];
}
const fx = JSON.parse(readFileSync(new URL('../../../fixtures/bauzeit.json', import.meta.url), 'utf8')) as {
  readonly plan: {
    readonly name: string;
    readonly projektbeginn: string;
    readonly vorgaenge: readonly FxVorgang[];
  };
  readonly sollwerte: {
    readonly projektende: string;
    readonly vorgaenge: readonly {
      readonly vorgangId: string;
      readonly termine: { readonly beginn: string; readonly ende: string; readonly gesamtpuffer: number };
    }[];
    readonly kritischeWege: readonly (readonly string[])[];
  };
};

const de = (iso: string): string => iso.split('-').reverse().join('.');
const nachId = new Map(fx.plan.vorgaenge.map((v) => [v.id, v]));
/** Vorgänge des zweiten Tests, der nicht die Fixture nutzt. */
const eigene = new Map<string, FxVorgang>();
const name = (id: string): string => {
  const v = nachId.get(id) ?? eigene.get(id);
  if (v === undefined) throw new Error(`Fixture: ${id}`);
  return `${v.nummer} ${v.bezeichnung}`;
};
const ART: Readonly<Record<string, string>> = {
  'ende-anfang': 'Ende-Anfang',
  'anfang-anfang': 'Anfang-Anfang',
  'ende-ende': 'Ende-Ende',
  'anfang-ende': 'Anfang-Ende',
};
const PROJEKTENDE = de(fx.sollwerte.projektende);
const KRITISCHER_WEG = (fx.sollwerte.kritischeWege[0] ?? []).map((id) => nachId.get(id)?.nummer).join(' → ');

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Vorgänge' });

/** Text der Zelle `spalte` in der Zeile, deren Nummer `nummer` ist. */
function zelle(page: Page, nummer: string, spalte: string): Locator {
  const g = grid(page);
  return g
    .locator('[role="row"]')
    .filter({
      has: page.locator('[data-spalte="nummer"] .tx-grid__text', {
        hasText: new RegExp(`^${nummer.replace('.', '\\.')}$`),
      }),
    })
    .locator(`[data-spalte="${spalte}"] .tx-grid__text`);
}

async function waehle(page: Page, bereich: Locator, feld: string, option: string): Promise<void> {
  await bereich.getByRole('combobox', { name: feld, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function planAnlegen(page: Page, projekt: string, planName: string): Promise<void> {
  await projektAnlegen(page, projekt, 'Bauherr (erfunden)');
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Bauzeitenpläne' })
    .click();
  const form = page.getByRole('form', { name: 'Bauzeitenplan anlegen' });
  await form.getByLabel('Name').fill(planName);
  await form.getByLabel('Projektbeginn').fill(de(fx.plan.projektbeginn));
  await waehle(page, form, 'Bundesland (Feiertage)', 'Sachsen');
  await form.getByRole('button', { name: 'Anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Bauzeitenplan: ${planName}` })).toBeVisible();
}

async function vorgangAnlegen(page: Page, v: FxVorgang): Promise<void> {
  if (!nachId.has(v.id)) eigene.set(v.id, v);
  await page.getByRole('button', { name: 'Vorgang anlegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Vorgang anlegen' });
  await dialog.getByLabel('Bezeichnung').fill(v.bezeichnung);
  await dialog.getByLabel('Nummer').fill(v.nummer);
  if (v.elternId !== null) await waehle(page, dialog, 'Unter Sammelvorgang', name(v.elternId));
  await dialog.getByLabel('Dauer (Arbeitstage)').fill(String(v.dauer));
  for (const [i, b] of v.vorgaenger.entries()) {
    const n = i + 1;
    await dialog.getByRole('button', { name: 'Vorgänger hinzufügen' }).click();
    await waehle(page, dialog, `Vorgänger ${String(n)}`, name(b.vorgaengerId));
    await waehle(page, dialog, `Art ${String(n)}`, ART[b.art] ?? b.art);
    await dialog.getByLabel(`Abstand ${String(n)} (AT)`).fill(String(b.abstand));
  }
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(zelle(page, v.nummer, 'vorgang')).toHaveText(v.bezeichnung);
}

async function sollPruefen(page: Page): Promise<void> {
  await expect(page.getByTestId('projektende')).toHaveText(PROJEKTENDE);
  await expect(page.getByTestId('kritischer-weg')).toHaveText(KRITISCHER_WEG);
  await expect(page.getByTestId('befundzahl')).toHaveText('(0)');
  for (const s of fx.sollwerte.vorgaenge) {
    const nummer = nachId.get(s.vorgangId)?.nummer ?? '';
    await expect(zelle(page, nummer, 'beginn')).toHaveText(de(s.termine.beginn));
    await expect(zelle(page, nummer, 'ende')).toHaveText(de(s.termine.ende));
    await expect(zelle(page, nummer, 'puffer')).toHaveText(String(s.termine.gesamtpuffer));
  }
}

test('Tor X2: Plan der Fixture über die Oberfläche → Soll → Neuladen → PDF mit Projektende', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await planAnlegen(page, 'Lagerhalle X2', fx.plan.name);
  for (const v of fx.plan.vorgaenge) await vorgangAnlegen(page, v);

  await sollPruefen(page);
  // Kritisch ist nicht nur Farbe (U8): Kennzeichen am Vorgang und Name des Balkens
  await expect(zelle(page, '3', 'vorgang').locator('..')).toHaveAttribute('title', /kritisch/);

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: `Bauzeitenplan: ${fx.plan.name}` })).toBeVisible();
  await sollPruefen(page);

  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'Bauzeitenplan als PDF ausgeben' });
  await expect(dialog.getByTestId('pdf-dateiname')).toHaveText(
    'Bauzeitenplan Anbau Lagerhalle Gründung und Rohbau erfunden.pdf',
  );
  await dialog.getByLabel('Datum').fill('12.11.2026');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'PDF erzeugen' }).click(),
  ]);
  // Der Dateiname steht im Dialog; Chromium dieser Testumgebung meldet Namen mit Umlaut als „download“ (D-118.6).
  expect(download.suggestedFilename()).toMatch(/^(Bauzeitenplan .*\.pdf|download)$/);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  const text = alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
  expect(text).toContain(`Projektende ${PROJEKTENDE}`);
  await expect(dialog).toBeHidden();
});

test('Befund mit Sprunglink, Rückgängig/Wiederholen, Vorgang entfernen und Plan löschen mit Bestätigung', async ({
  page,
}) => {
  await planAnlegen(page, 'Zyklus X2', 'Kreis (erfunden)');
  await vorgangAnlegen(page, {
    id: 'a',
    nummer: '1',
    bezeichnung: 'Schalung',
    elternId: null,
    dauer: 2,
    vorgaenger: [],
  });
  await vorgangAnlegen(page, {
    id: 'b',
    nummer: '2',
    bezeichnung: 'Bewehrung',
    elternId: null,
    dauer: 1,
    vorgaenger: [{ vorgaengerId: 'a', art: 'ende-anfang', abstand: 0 }],
  });
  await expect(page.getByTestId('befundzahl')).toHaveText('(0)');

  // Vorgang 1 bekommt 2 als Vorgänger: ein Zyklus ist ein Befund, keine Sperre (U5)
  await zelle(page, '1', 'vorgang').click();
  await page.getByRole('button', { name: 'Vorgang bearbeiten' }).click();
  const dialog = page.getByRole('dialog', { name: 'Vorgang bearbeiten' });
  await dialog.getByRole('button', { name: 'Vorgänger hinzufügen' }).click();
  await waehle(page, dialog, 'Vorgänger 1', '2 Bewehrung');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('befundzahl')).toHaveText('(2)');
  await expect(zelle(page, '1', 'beginn')).toHaveText('–');
  await expect(page.getByTestId('projektende')).toHaveText('nicht berechnet');

  // Sprunglink: der Befund zu Vorgang 2 fokussiert dessen Zeile
  const panel = page.getByRole('complementary', { name: 'Befunde der Terminrechnung' });
  await panel.getByRole('button', { name: /^2 Bewehrung/ }).click();
  await expect(grid(page).locator('[role="gridcell"]:focus')).toContainText('Bewehrung');

  // Ein Rückgängig nimmt die Änderung zurück (ein Undo-Schritt), Wiederholen setzt sie wieder
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByTestId('befundzahl')).toHaveText('(0)');
  await expect(zelle(page, '1', 'beginn')).toHaveText('02.11.2026');
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(page.getByTestId('befundzahl')).toHaveText('(2)');

  // Entfernen fragt nach, weil eine Beziehung auf den Vorgang mitgeht (Q5)
  await zelle(page, '2', 'vorgang').click();
  await page.getByRole('button', { name: 'Vorgang entfernen' }).click();
  const frage = page.getByRole('dialog', { name: 'Vorgang entfernen?' });
  await expect(frage).toContainText('Anordnungsbeziehung');
  await frage.getByRole('button', { name: 'Entfernen' }).click();
  await expect(zelle(page, '2', 'vorgang')).toHaveCount(0);
  await expect(page.getByTestId('befundzahl')).toHaveText('(0)');

  // Plan löschen nur mit Bestätigung; danach die Liste, Rückgängig holt ihn zurück
  await page.getByRole('button', { name: 'Bauzeitenplan löschen' }).click();
  await page
    .getByRole('dialog', { name: 'Bauzeitenplan löschen?' })
    .getByRole('button', { name: 'Löschen' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Bauzeitenpläne – / })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kreis (erfunden)' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bauzeitenplan: Kreis (erfunden)' }),
  ).toBeVisible();
});
