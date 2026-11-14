// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 62: App offline (Service Worker im Build), Export-Erinnerung, Sicherungsordner.

import { expect, test, type Page } from '@playwright/test';
import { erwarteMeldung, projektAnlegen } from './hilfen';

const TAG_MS = 24 * 60 * 60 * 1000;

function projektId(page: Page): string {
  const id = new URL(page.url()).pathname.split('/').pop();
  if (!id) throw new Error('keine Projektkennung in der Adresse');
  return id;
}

test('Das Manifest ist eingebunden und die App startet nach dem ersten Laden ohne Netz', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Projekte' })).toBeVisible();

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = (await (await page.request.get(href ?? '/manifest.webmanifest')).json()) as {
    name: string;
    icons: { sizes: string }[];
  };
  expect(manifest.name).toBe('Tethys AVA');
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));

  // Service Worker aktiv: alle Bündel sind vorgehalten.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Projekte' })).toBeVisible();
  // Der Speicher (Worker, WASM) kommt ebenfalls aus dem Zwischenspeicher: Projekt anlegen geht ohne Netz.
  await page.getByLabel('Projektname').fill('Offline-Projekt');
  await page.getByRole('button', { name: 'Projekt anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Offline-Projekt' })).toBeVisible();
  await context.setOffline(false);
});

test('Erinnerung: nach mehr als 7 Tagen ohne Export und mit Befehlen seitdem; „Jetzt sichern“ lädt die Datei', async ({
  page,
}) => {
  await projektAnlegen(page, 'Erinnerungsprojekt', 'Bauherr');
  const id = projektId(page);
  await page.getByRole('link', { name: 'Zur Projektliste' }).click();
  // Frisch angelegt: der erste Befehl ist von jetzt, nichts ist fällig.
  await expect(page.getByRole('status').filter({ hasText: 'Erinnerungsprojekt' })).toHaveCount(0);

  // Letzter Export vor 10 Tagen (vorgestellter Zeitstempel); der Befehl „Projekt anlegen“ ist jünger.
  await page.evaluate(
    ([k, t]) => {
      window.localStorage.setItem(
        'tethys.sicherung.letzterExport.' + String(k),
        new Date(Number(t)).toISOString(),
      );
    },
    [id, String(Date.now() - 10 * TAG_MS)],
  );
  await page.reload();
  const hinweis = page.getByRole('status').filter({ hasText: 'Erinnerungsprojekt' });
  await expect(hinweis).toContainText('Die letzte Sicherung ist 10 Tage her');

  const download = page.waitForEvent('download');
  await hinweis.getByRole('button', { name: 'Jetzt sichern' }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^Erinnerungsprojekt-\d{4}-\d{2}-\d{2}\.tethys\.json$/,
  );
  await expect(hinweis).toHaveCount(0);

  // Der Zeitpunkt ist neu gesetzt: auch nach dem Neuladen keine Erinnerung.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Projekte' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Erinnerungsprojekt' })).toHaveCount(0);
});

test('Sicherungsordner: wählen, „Jetzt sichern“ schreibt <Projektname>-<Datum>.tethys.json dorthin', async ({
  page,
}) => {
  // Die Ordnerwahl ist ein Systemdialog. Der Test setzt an ihre Stelle einen Ordner im OPFS, eingepackt in ein Objekt
  // mit denselben Methoden der File System Access API. Der Umschlag ist nicht klonbar: Die App kann den Handle dann
  // nicht in IndexedDB ablegen und behält ihn bis zum Neuladen. Das ist Absicht: Das headless Chromium dieses Tests
  // stürzt ab, sobald es einen Dateisystem-Handle aus IndexedDB liest; das Merken über einen Neustart ist deshalb
  // hier nicht prüfbar (siehe Ticket 62, D-62.3).
  await page.addInitScript(() => {
    (window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = async () => {
      const wurzel = await navigator.storage.getDirectory();
      const ordner = await wurzel.getDirectoryHandle('sicherungsordner-test', { create: true });
      return {
        kind: 'directory',
        name: ordner.name,
        getFileHandle: (n: string, o?: FileSystemGetFileOptions) => ordner.getFileHandle(n, o),
        queryPermission: () => Promise.resolve('granted'),
        requestPermission: () => Promise.resolve('granted'),
      };
    };
  });
  await projektAnlegen(page, 'Ordnerprojekt', 'Bauherr');
  const id = projektId(page);
  await page.getByRole('link', { name: 'Zur Projektliste' }).click();

  await page.getByRole('button', { name: 'Sicherung' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sicherung' });
  await expect(dialog.getByText('Kein Ordner gewählt')).toBeVisible();
  await dialog.getByRole('button', { name: 'Ordner wählen …' }).click();
  await expect(dialog.getByText('Ordner: sicherungsordner-test')).toBeVisible();
  await dialog.getByRole('checkbox').check();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Letzter Export vor 9 Tagen; die Liste wertet beim Öffnen der Seite aus: Projekt öffnen und zurück.
  await page.evaluate(
    ([k, t]) => {
      window.localStorage.setItem(
        'tethys.sicherung.letzterExport.' + String(k),
        new Date(Number(t)).toISOString(),
      );
    },
    [id, String(Date.now() - 9 * TAG_MS)],
  );
  await page.getByRole('link', { name: 'Ordnerprojekt' }).click();
  await page.getByRole('link', { name: 'Zur Projektliste' }).click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Ordnerprojekt' })
    .getByRole('button', { name: 'Jetzt sichern' })
    .click();
  await erwarteMeldung(page, 'in sicherungsordner-test');

  const datei = await page.evaluate(async () => {
    const wurzel = await navigator.storage.getDirectory();
    const ordner = await wurzel.getDirectoryHandle('sicherungsordner-test');
    const namen: string[] = [];
    let inhalt = '';
    for await (const [name, h] of ordner as unknown as AsyncIterable<[string, FileSystemFileHandle]>) {
      namen.push(name);
      inhalt = await (await h.getFile()).text();
    }
    return { namen, inhalt };
  });
  expect(datei.namen).toHaveLength(1);
  expect(datei.namen[0]).toMatch(/^Ordnerprojekt-\d{4}-\d{2}-\d{2}\.tethys\.json$/);
  expect(datei.inhalt).toContain('Ordnerprojekt');
  // Gesichert: keine Erinnerung mehr. Gesucht wird die Erinnerung mit ihrem Knopf, nicht die Ansage der Meldung (B-38).
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Ordnerprojekt', has: page.getByRole('button', { name: 'Jetzt sichern' }) }),
  ).toHaveCount(0);
});
