// SPDX-License-Identifier: AGPL-3.0-or-later
// Werkzeugleiste in Gruppen (Ticket 142): Viele Schaltflächen und Verweise der LV-, Auftrags-LV- und Preisspiegelseite
// stehen in Menüs. Diese Hilfen öffnen das Menü einer Gruppe und wählen einen Punkt, wie ein Nutzer.

import { expect, type Locator, type Page } from '@playwright/test';

/** Die Werkzeugleiste der Seite (LV, Auftrags-LV, Preisspiegel, LV-Stand). */
export const werkzeugleiste = (page: Page): Locator => page.getByRole('toolbar', { name: /^Werkzeuge/ });

/** Öffnet das Menü der Gruppe `gruppe` (falls zu) und gibt seinen Punkt `name` zurück. */
export async function menuepunkt(page: Page, gruppe: string, name: string | RegExp): Promise<Locator> {
  const ausloeser = werkzeugleiste(page).getByRole('button', { name: gruppe, exact: true });
  if ((await ausloeser.getAttribute('aria-expanded')) !== 'true') await ausloeser.click();
  const punkt = page
    .getByRole('menu')
    .getByRole('menuitem', typeof name === 'string' ? { name, exact: true } : { name });
  await expect(punkt).toBeVisible();
  return punkt;
}

/** Wählt den Punkt `name` aus dem Menü der Gruppe `gruppe`. */
export async function werkzeug(page: Page, gruppe: string, name: string | RegExp): Promise<void> {
  await (await menuepunkt(page, gruppe, name)).click();
}

/** Prüft, dass das Menü der Gruppe den Punkt zeigt (z. B. „Angebote (1)“), und schließt es wieder. */
export async function erwartePunkt(page: Page, gruppe: string, name: string | RegExp): Promise<void> {
  await menuepunkt(page, gruppe, name);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
}

/** Blendet das Prüf-Panel über die Schaltfläche „Prüfung“ der Werkzeugleiste ein. */
export async function pruefungEinblenden(page: Page): Promise<Locator> {
  const knopf = werkzeugleiste(page).getByRole('button', { name: /^Prüfung/ });
  if ((await knopf.getAttribute('aria-expanded')) !== 'true') await knopf.click();
  const panel = page.getByRole('complementary', { name: 'Prüfung des LV' });
  await expect(panel).toBeVisible();
  return panel;
}
