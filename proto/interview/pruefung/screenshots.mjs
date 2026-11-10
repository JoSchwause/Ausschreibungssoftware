// Wegwerfcode: ein Screenshot je Ansicht und Variante bei 1440x900 nach screenshots/.
// Voraussetzung: `pnpm start` laeuft (http://127.0.0.1:5180). Aufruf: node pruefung/screenshots.mjs
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASIS = process.env.PROTO_URL ?? 'http://127.0.0.1:5180';
const aus = fileURLToPath(new URL('../screenshots/', import.meta.url));
mkdirSync(aus, { recursive: true });
const ansichten = {
  lv: ['baum', 'panel', 'karten'],
  spiegel: ['farbe', 'rang', 'balken'],
  projekt: ['baum', 'reiter', 'vorgang'],
  gaeb: ['schritte', 'seite'],
};
const browser = await chromium.launch({
  ...(existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fehler = [];
page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
page.on('pageerror', (e) => fehler.push(String(e)));
for (const [a, vs] of Object.entries(ansichten)) {
  for (const v of vs) {
    await page.goto(`${BASIS}/?ansicht=${a}&variante=${v}`);
    await page.waitForSelector('main[data-ansicht]');
    await page.waitForTimeout(400);
    const datei = `${aus}${a}-${v}.png`;
    await page.screenshot({ path: datei });
    console.log('Screenshot', datei);
  }
}
// Zusatzbilder: GAEB nach dem Durchklicken
await page.goto(`${BASIS}/?ansicht=gaeb&variante=schritte`);
await page.getByRole('button', { name: 'X83 laden' }).click();
await page.getByRole('button', { name: 'Weiter' }).click();
await page.getByRole('button', { name: 'X84 einlesen' }).click();
await page.getByRole('button', { name: 'Weiter' }).click();
await page.getByRole('button', { name: 'Als Entwurf exportieren' }).click();
await page.screenshot({ path: `${aus}gaeb-schritte-pruefung.png` });
await page.goto(`${BASIS}/?ansicht=gaeb&variante=seite`);
await page.getByRole('button', { name: 'X83 laden' }).click();
await page.getByRole('button', { name: 'X84 einlesen' }).click();
await page.getByRole('button', { name: 'Als Entwurf exportieren' }).click();
await page.screenshot({ path: `${aus}gaeb-seite-exportiert.png` });
await browser.close();
console.log(fehler.length ? `Konsolenfehler:\n${fehler.join('\n')}` : 'keine Konsolenfehler');
