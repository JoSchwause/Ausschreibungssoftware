import { expect, test } from '@playwright/test';

const BASIS = '/tethys-probe/';

test('Der Build mit Basis-Pfad lädt unter dem Pfad, ohne fehlende Dateien', async ({ page, request }) => {
  const fehlend: string[] = [];
  const konsole: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) fehlend.push(`${String(r.status())} ${r.url()}`);
  });
  page.on('console', (m) => {
    // Ohne Ausnahme (D-104): Seit Ticket 139 prüft der Speicher-Worker die OPFS-Dateien beim Neuladen still vorher.
    if (m.type() === 'error') konsole.push(m.text());
  });
  page.on('pageerror', (e) => konsole.push(e.message));

  await page.goto(BASIS);
  // Seit der Navigation der Welle 7 nennt der Fenstertitel die Seite („Projekte – Tethys AVA“).
  await expect(page).toHaveTitle('Projekte – Tethys AVA');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  // Der Speicher läuft in einem Worker (OPFS): Die Projektliste erscheint erst, wenn er geantwortet hat.
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible();

  // Wechsel innerhalb der App behält den Basis-Pfad.
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Hilfe' })
    .click();
  await expect(page).toHaveURL(new RegExp(`${BASIS}hilfe$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();

  // Neuladen auf einer Unterseite (bei Pages liefert 404.html die Startseite aus).
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Hilfe' })).toBeVisible();

  // Manifest: Start-Adresse und Geltungsbereich folgen dem Basis-Pfad.
  const antwort = await request.get(`${BASIS}manifest.webmanifest`);
  expect(antwort.ok()).toBe(true);
  const manifest = (await antwort.json()) as { start_url: string; scope: string };
  expect(manifest.start_url).toBe(BASIS);
  expect(manifest.scope).toBe(BASIS);

  // Der Service Worker wird, falls angemeldet, unter dem Basis-Pfad angemeldet.
  const scope = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r ? new URL(r.scope).pathname : null;
  });
  expect(scope === null || scope === BASIS).toBe(true);

  expect(fehlend).toEqual([]);
  expect(konsole).toEqual([]);
});
