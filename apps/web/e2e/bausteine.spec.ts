import { expect, test } from '@playwright/test';

// Die Katalogseite zeigt jeden Baustein zweimal (Hell- und Dunkel-Rahmen). Die Tests arbeiten im ersten.
test.beforeEach(async ({ page }) => {
  await page.goto('/katalog');
  await expect(page.getByRole('heading', { level: 1, name: 'Bausteinkatalog' })).toBeVisible();
});

const hell = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Hell' });
const dunkel = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Dunkel' });

test('Katalog zeigt Bausteine in beiden Modi', async ({ page }) => {
  for (const rahmen of [hell(page), dunkel(page)]) {
    await expect(rahmen.getByRole('button', { name: 'Speichern' })).toBeVisible();
    await expect(rahmen.getByRole('textbox', { name: 'Kurztext' })).toBeVisible();
    await expect(rahmen.getByRole('combobox', { name: 'Einheit' })).toBeVisible();
    await expect(rahmen.getByRole('tablist', { name: 'Beispielreiter' })).toBeVisible();
    await expect(rahmen.getByRole('button', { name: 'Dialog öffnen' })).toBeVisible();
  }
  const farbe = async (modus: 'hell' | 'dunkel') =>
    (modus === 'hell' ? hell(page) : dunkel(page)).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await farbe('hell')).not.toBe(await farbe('dunkel'));
});

test('Dialog: per Tastatur öffnen, Fokus bleibt gefangen, Escape schließt und gibt den Fokus zurück', async ({
  page,
}) => {
  const ausloeser = hell(page).getByRole('button', { name: 'Dialog öffnen' });
  await ausloeser.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Änderungen verwerfen?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Die geänderte Menge geht verloren.');

  // Tab zyklisch: Schließen -> Abbrechen -> Verwerfen -> wieder Schließen; der Fokus verlässt den Dialog nie.
  const imDialog = () => dialog.evaluate((d) => d.contains(document.activeElement));
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await imDialog()).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await imDialog()).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(ausloeser).toBeFocused();
});

test('Dialog: Schaltfläche in der Fußzeile schließt ihn', async ({ page }) => {
  await hell(page).getByRole('button', { name: 'Dialog öffnen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Abbrechen' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
});

test('Auswahl: per Tastatur öffnen, mit Pfeilen wählen, mit Enter übernehmen, Escape verwirft', async ({
  page,
}) => {
  const auswahl = hell(page).getByRole('combobox', { name: 'Einheit' });
  await expect(auswahl).toContainText('m² (Quadratmeter)');

  await auswahl.focus();
  await page.keyboard.press('Enter');
  const liste = page.getByRole('listbox');
  await expect(liste).toBeVisible();
  // Geöffnet steht die Markierung auf dem aktuellen Wert; Pfeil unten springt zum nächsten.
  await expect(page.getByRole('option', { name: /Quadratmeter/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: /Kubikmeter/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(liste).toBeHidden();
  await expect(auswahl).toContainText('m³ (Kubikmeter)');
  await expect(auswahl).toBeFocused();

  // Escape schließt ohne zu ändern.
  await page.keyboard.press('ArrowDown');
  await expect(liste).toBeVisible();
  await expect(page.getByRole('option', { name: /Kubikmeter/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: /Stück/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(liste).toBeHidden();
  await expect(auswahl).toContainText('m³ (Kubikmeter)');
  await expect(auswahl).toBeFocused();

  // Deaktivierte Option ist nicht wählbar.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('option', { name: /nicht verfügbar/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await page.keyboard.press('Escape');
});

test('Reiter: Pfeiltasten wechseln den Reiter', async ({ page }) => {
  const liste = hell(page).getByRole('tablist', { name: 'Beispielreiter' });
  const allgemein = liste.getByRole('tab', { name: 'Allgemein' });
  await allgemein.focus();
  await expect(allgemein).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(liste.getByRole('tab', { name: 'Preise' })).toHaveAttribute('aria-selected', 'true');
  await expect(hell(page).getByRole('tabpanel')).toContainText('Inhalt des Reiters Preise.');
});

test('Tooltip erscheint bei Tastaturfokus und Escape schließt ihn', async ({ page }) => {
  const knopf = hell(page).getByRole('button', { name: 'Mit Hinweis' });
  // Per Tastatur anspringen (Tab, zurück mit Umschalt+Tab), nicht per Maus.
  await knopf.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(knopf).toBeFocused();
  await expect(page.getByRole('tooltip').first()).toContainText('Speichert das Leistungsverzeichnis');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('Tooltip bleibt offen, wenn der Fokus seinen Knopf erst ins Bild scrollt', async ({ page }) => {
  const knopf = hell(page).getByRole('button', { name: 'Mit Hinweis' });
  const tooltip = page.getByRole('tooltip').first();
  await expect(knopf).not.toBeInViewport();
  await knopf.focus();
  await expect(tooltip).toContainText('Speichert das Leistungsverzeichnis');
  // Der Fokus hat den Knopf ins Bild gescrollt; das Scroll-Ereignis dazu kommt erst mit dem nächsten Bild und darf
  // den Tooltip nicht schließen, solange der Knopf den Fokus hat.
  await expect(knopf).toBeInViewport();
  await page.evaluate(
    () =>
      new Promise<void>((fertig) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fertig();
          });
        });
      }),
  );
  await expect(tooltip).toContainText('Speichert das Leistungsverzeichnis');
});

test('Meldung (Toast) erscheint per Tastatur und lässt sich schließen', async ({ page }) => {
  const knopf = hell(page).getByRole('button', { name: 'Hinweis zeigen' });
  await knopf.focus();
  await page.keyboard.press('Enter');
  const toast = page.getByRole('listitem').filter({ hasText: 'Gespeichert' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Meldung schließen' }).click();
  await expect(toast).toHaveCount(0);
});

test('Validierung blockiert die Eingabe nie (U5)', async ({ page }) => {
  const feld = hell(page).getByRole('textbox', { name: 'Menge (Probe)' });
  await feld.fill('');
  await feld.pressSequentially('1.234,50 abc ,,, !?');
  // Alles wurde angenommen, auch Ungültiges.
  await expect(feld).toHaveValue('1.234,50 abc ,,, !?');
  await expect(feld).toHaveAttribute('aria-invalid', 'true');
  await expect(hell(page).getByText('Das Zahlenformat ist ungewöhnlich.').first()).toBeVisible();
  await expect(hell(page).getByTestId('probe-roh')).toHaveText('1.234,50 abc ,,, !?');

  // Gültiger Text nimmt den Hinweis zurück.
  await feld.fill('1.234,50');
  await expect(feld).not.toHaveAttribute('aria-invalid', 'true');
  await expect(hell(page).getByTestId('probe-roh')).toHaveText('1.234,50');
  // Die Meldung nimmt dem Feld nicht den Fokus und sperrt es nicht.
  await feld.focus();
  await page.keyboard.type('x');
  await expect(feld).toHaveValue('1.234,50x');
});
