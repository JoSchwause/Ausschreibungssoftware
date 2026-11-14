// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor E, Punkt 2 (Ticket 158, U6): Bei 1280 px läuft keine Seite der App waagerecht über. Die Routenliste kommt aus der App,
// nicht von Hand: Der Test folgt ab der Projektliste jedem Verweis der App (Seitenleiste, Brotkrumen, Verweise der Seiten)
// und prüft jede erreichte Adresse. Damit jede Art von Seite einen Verweis hat, legt er vorher über die Oberfläche das
// Beispielprojekt an und ergänzt, was dort fehlt (Nachtrag, LV-Stand, Kostenermittlung, Honorarberechnung,
// Bauzeitenplan, zweiter Modellstand für den Vergleich).
//
// Vollständigkeit: Jede besuchte Adresse wird mit den Erkennern der App (`*/pfad.ts`, `ui/navigation.ts`) einer Seitenart
// zugeordnet, in derselben Reihenfolge wie die Regeln in `App.tsx`. Eine Adresse ohne Seitenart (neue Route) und eine
// Seitenart ohne besuchte Adresse lassen den Test fehlschlagen; die Seitenleiste muss jeden Bereich verlinken.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { ProjektId } from '@tethys/vertrag';
import { abrechnungsseite } from '../src/abrechnung/pfad';
import { bauleitungRoute } from '../src/bauleitung/pfad';
import { bauzeitRoute } from '../src/bauzeit/pfad';
import { bimRoute } from '../src/bim/pfad';
import { honorarRoute } from '../src/honorar/pfad';
import { kostenRoute } from '../src/kosten/pfad';
import { vergleichRoute } from '../src/modellvergleich/pfad';
import { rechnungsadresse } from '../src/rechnung/pfad';
import { SEITENLEISTE, bereichsPfad, projektlistenRoute } from '../src/ui/navigation';
import { preisspiegelLvId } from '../src/vergabe/pfad';
import { fixturePfad, ueberLeiste, waagerechterUeberlauf } from './umsteiger-hilfen';
import { werkzeug } from './werkzeuge';

test.use({ viewport: { width: 1280, height: 800 } });

/**
 * Seitenart einer Adresse, in der Reihenfolge der Regeln in `App.tsx` (die erste passende gilt). Wo die App einen Erkenner
 * exportiert, wird er benutzt; die übrigen Muster stehen in `App.tsx` als Ausdrücke in den Regeln.
 */
function seitenart(pfad: string): string | null {
  if (/^\/projekt\/[^/]+$/.test(pfad)) return 'uebersicht';
  const liste = projektlistenRoute(pfad);
  if (liste !== null) return `liste:${liste.art}`;
  const abrechnung = abrechnungsseite(pfad);
  if (abrechnung !== null) return `aufmass:${abrechnung.art}`;
  const rechnung = rechnungsadresse(pfad);
  if (rechnung !== null) return rechnung.rechnungId === null ? 'rechnungen' : 'rechnung';
  if (/^\/projekt\/[^/]+\/auftrag\/[^/]+$/.test(pfad)) return 'auftragsLv';
  const kosten = kostenRoute(pfad);
  if (kosten !== null) return `kosten:${kosten.art}`;
  const honorar = honorarRoute(pfad);
  if (honorar !== null) return `honorar:${honorar.art}`;
  const bauleitung = bauleitungRoute(pfad);
  if (bauleitung !== null) return bauleitung.art;
  const bauzeit = bauzeitRoute(pfad);
  if (bauzeit !== null) return `bauzeit:${bauzeit.art}`;
  if (vergleichRoute(pfad) !== null) return 'vergleich';
  const bim = bimRoute(pfad);
  if (bim !== null) return `modelle:${bim.art}`;
  if (/^\/lv\/[^/]+\/stand\/[^/]+$/.test(pfad)) return 'lvStand';
  if (preisspiegelLvId(pfad) !== null) return 'preisspiegel';
  if (/^\/lv\/[^/]+$/.test(pfad)) return 'lv';
  if (pfad === '/') return 'projekte';
  if (pfad === '/hilfe') return 'hilfe';
  if (pfad === '/katalog') return 'katalog';
  return null;
}

/** Alle Seitenarten, die `seitenart` kennt; jede muss besucht werden. */
const ALLE_SEITENARTEN = [
  'uebersicht',
  'liste:leistungsverzeichnisse',
  'liste:vergabe',
  'liste:auftraege',
  'liste:nachtraege',
  'liste:aufmass',
  'liste:rechnungen',
  'aufmass:liste',
  'aufmass:blatt',
  'aufmass:soll-ist',
  'rechnungen',
  'rechnung',
  'auftragsLv',
  'kosten:liste',
  'kosten:kontrolle',
  'kosten:ermittlung',
  'honorar:liste',
  'honorar:berechnung',
  'maengel',
  'bautagebuch',
  'bauzeit:liste',
  'bauzeit:plan',
  'vergleich',
  'modelle:liste',
  'modelle:modell',
  'lvStand',
  'preisspiegel',
  'lv',
  'projekte',
  'hilfe',
  'katalog',
];

const ifc = (name: string): { name: string; mimeType: string; buffer: Buffer } => ({
  name: `${name}.ifc`,
  mimeType: 'application/octet-stream',
  buffer: readFileSync(fixturePfad(`ifc/${name}.ifc`)),
});

/** Beispielprojekt laden und über die Oberfläche ergänzen, bis jede Seitenart einen Verweis hat. */
async function aufbauen(page: Page): Promise<string[]> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Beispielprojekt laden' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beispielprojekt Musterhaus' })).toBeVisible();

  // LV-Stand am LV.
  await page
    .getByRole('list', { name: 'Leistungsverzeichnisse', exact: true })
    .getByRole('link')
    .first()
    .click();
  await werkzeug(page, 'LV', 'LV-Stände');
  const staende = page.getByRole('dialog', { name: 'LV-Stände' });
  await staende.getByLabel('Name des Stands').fill('Versand');
  await staende.getByRole('button', { name: 'Stand anlegen' }).click();
  await expect(staende.getByRole('list', { name: 'LV-Stände' })).toContainText('Versand');
  // Den Stand verlinkt nur der Dialog: Seine Adresse kommt als Startadresse dazu.
  await staende.getByRole('link', { name: 'Öffnen: Versand' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Versand/ })).toBeVisible();
  const start = [new URL(page.url()).pathname];

  // Nachtrag am Auftrags-LV.
  await ueberLeiste(page, 'Auftrags-LV');
  await page.getByRole('list', { name: 'Auftrags-LVs' }).getByRole('link').first().click();
  await page.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  const nachtrag = page.getByRole('dialog', { name: 'Nachtrag anlegen' });
  await nachtrag.getByLabel('Bezeichnung').fill('Zusatzleistungen');
  await nachtrag.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Nachtrag N01 – Zusatzleistungen' }),
  ).toBeVisible();

  // Kostenermittlung, Honorarberechnung, Bauzeitenplan.
  await ueberLeiste(page, 'Kosten');
  await page.getByLabel('Name', { exact: true }).fill('Kostenberechnung');
  await page.getByRole('button', { name: 'Kostenermittlung anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenberechnung' }),
  ).toBeVisible();
  await ueberLeiste(page, 'Honorar');
  await page.getByLabel('Name', { exact: true }).fill('Objektplanung');
  await page.getByRole('button', { name: 'Honorarberechnung anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Honorarberechnung – Objektplanung' }),
  ).toBeVisible();
  await ueberLeiste(page, 'Bauzeitenpläne');
  const plan = page.getByRole('form', { name: 'Bauzeitenplan anlegen' });
  await plan.getByLabel('Name').fill('Rohbau');
  await plan.getByLabel('Projektbeginn').fill('02.11.2026');
  await plan.getByRole('button', { name: 'Bauzeitenplan anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bauzeitenplan: Rohbau' })).toBeVisible();

  // Zweiter Stand des Modells: Erst dann gibt es den Vergleich.
  await ueberLeiste(page, 'Modelle');
  const wahl = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: /^Neuer Stand von / })
    .first()
    .click();
  await (await wahl).setFiles(ifc('haus-v2'));
  const eingelesen = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await eingelesen.getByRole('button', { name: 'Modell öffnen' }).click({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Mit Vorgänger vergleichen' })).toBeVisible();
  return start;
}

/** Wartet, bis die Seite steht: Überschrift da, nichts lädt mehr, zweimal hintereinander dieselbe Breite. */
async function seiteSteht(page: Page): Promise<void> {
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  // Listen laden nach der Überschrift: warten, bis Breite und Zahl der Verweise zweimal hintereinander gleich sind.
  const stand = (): Promise<string> =>
    page.evaluate(
      () =>
        `${String(document.documentElement.scrollWidth)}/${String(document.querySelectorAll('a[href]').length)}`,
    );
  await expect
    .poll(async () => {
      const a = await stand();
      await page.waitForTimeout(400);
      return a === (await stand());
    })
    .toBe(true);
}

/** Alle Verweise der Seite auf Adressen der App (Pfad und Anker). */
function verweise(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .map((a) => new URL(a.href, location.href))
      .filter((u) => u.origin === location.origin)
      .map((u) => u.pathname + u.hash),
  );
}

test('Kein waagerechter Überlauf bei 1280 px auf allen Routen der App', async ({ page }) => {
  test.setTimeout(600_000);
  const offen = ['/', ...(await aufbauen(page))];
  const besucht = new Map<string, string>(); // Adresse → Seitenart
  const ueberlauf: string[] = [];
  while (offen.length > 0) {
    const adresse = offen.shift() ?? '/';
    if (besucht.has(adresse)) continue;
    const art = seitenart(adresse.split('#')[0] ?? adresse);
    expect(art, `Adresse ohne Seitenart in App.tsx: ${adresse}`).not.toBeNull();
    besucht.set(adresse, art ?? '');
    expect(besucht.size, 'zu viele Adressen: läuft die Suche im Kreis?').toBeLessThan(200);

    await page.goto(adresse);
    await seiteSteht(page);
    const u = await waagerechterUeberlauf(page);
    if (u !== null)
      ueberlauf.push(
        `${adresse} (${art ?? ''}): Seite +${String(u.seite)} px, Arbeitsfläche +${String(u.arbeitsflaeche)} px`,
      );

    // Die Hilfe zeigt ihre Teile als Reiter: jeder Reiter einmal.
    if (art === 'hilfe' && !adresse.includes('#')) {
      for (const reiter of await page.getByRole('tablist').getByRole('tab').all()) {
        await reiter.click();
        await seiteSteht(page);
        const r = await waagerechterUeberlauf(page);
        if (r !== null)
          ueberlauf.push(`${adresse} Reiter „${await reiter.innerText()}“: +${String(r.seite)} px`);
      }
    }
    for (const v of await verweise(page)) if (!besucht.has(v) && !offen.includes(v)) offen.push(v);
  }

  expect(ueberlauf, 'Seiten mit waagerechtem Überlauf bei 1280 px').toEqual([]);

  // Jede Seitenart der App ist besucht.
  const arten = new Set(besucht.values());
  expect(
    ALLE_SEITENARTEN.filter((a) => !arten.has(a)),
    'nicht erreichte Seitenarten',
  ).toEqual([]);
  // Die Seitenleiste verlinkt jeden Bereich eines Projekts.
  const projekt = [...besucht.keys()].find((a) => seitenart(a) === 'uebersicht')?.split('/')[2] ?? '';
  for (const { bereiche } of SEITENLEISTE)
    for (const b of bereiche)
      expect(besucht.has(bereichsPfad(b, projekt as ProjektId)), `Seitenleiste: ${b}`).toBe(true);
});
