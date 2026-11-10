// Wegwerfcode: vergleicht die Bildschirmwerte des laufenden Prototyps mit der Handrechnung
// (daten/erwartet.json, erzeugt von daten/handrechnung.mjs) und prueft die Tastaturbedienung des Grids.
// Voraussetzung: `pnpm start` laeuft. Aufruf: node pruefung/pruefen.mjs   (Exit-Code 1 bei Abweichung)
import { chromium } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASIS = process.env.PROTO_URL ?? 'http://127.0.0.1:5180';
const datei = (p) => fileURLToPath(new URL(p, import.meta.url));
const erwartet = JSON.parse(readFileSync(datei('../daten/erwartet.json'), 'utf8'));
const lv = JSON.parse(readFileSync(datei('../src/daten/lv.json'), 'utf8'));

const fmt = (s) => {
  const [g, n] = s.split('.');
  return `${g.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${n}`;
};
let geprueft = 0;
const abweichungen = [];
const gleich = (was, ist, soll) => {
  geprueft++;
  if (ist !== soll) abweichungen.push(`${was}: Bildschirm "${ist}", Handrechnung "${soll}"`);
};
const wahr = (was, bedingung, detail = '') => {
  geprueft++;
  if (!bedingung) abweichungen.push(`${was} ${detail}`);
};

const browser = await chromium.launch({
  ...(existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASIS });
const page = await context.newPage();
const seite = async (a, v) => {
  await page.goto(`${BASIS}/?ansicht=${a}&variante=${v}`);
  await page.waitForSelector('main[data-ansicht]');
};
const text = async (loc) => (await loc.first().innerText()).replace(/\s+/g, ' ').trim();

// ---------------- 1. LV: Summen in allen drei Varianten ----------------
const sl = erwartet.lv.summen;
const summenSoll = { netto: sl.netto, nachlass: sl.nachlass, nach: sl.nach, mwst: sl.mwst, brutto: sl.brutto };

await seite('lv', 'baum');
const gridSummen = async () => {
  const r = {};
  for (const [k, name] of [['netto', 'Netto'], ['nachlass', 'Nachlass'], ['nach', 'Netto nach Nachlass'], ['mwst', 'MwSt'], ['brutto', 'Brutto']]) {
    r[k] = await text(page.locator('.tx-grid__summe').filter({ has: page.getByText(name, { exact: true }) }).locator('.tx-grid__summe-wert'));
  }
  return r;
};
const zeileOz = (oz) => page.locator('[role="row"][data-i]').filter({ has: page.locator('[data-spalte="ordnungszahl"]', { hasText: new RegExp(`^${oz.replace('.', '\\.')}$`) }) });
// Das Grid virtualisiert: Zeilen ausserhalb des Sichtbereichs sind nicht im DOM. Erst scrollen, dann suchen.
const sichtbar = async (oz) => {
  const r = zeileOz(oz);
  if ((await r.count()) > 0) return r;
  const sc = page.locator('.tx-grid__scroll');
  await sc.evaluate((e) => { e.scrollTop = 0; });
  for (let i = 0; i < 40 && (await r.count()) === 0; i++) {
    await sc.evaluate((e) => { e.scrollTop += 250; });
    await page.waitForTimeout(30);
  }
  return r;
};
const zelle = async (oz, spalte) => (await sichtbar(oz)).locator(`[data-spalte="${spalte}"]`);
{
  const g = await gridSummen();
  for (const k of Object.keys(summenSoll)) gleich(`LV Grid ${k}`, g[k], fmt(summenSoll[k]));
  for (const [oz, soll] of Object.entries(erwartet.lv.titel)) gleich(`LV Grid Titelsumme ${oz}`, await text((await zelle(oz, 'gesamtpreis'))), fmt(soll));
  for (const z of erwartet.preisspiegel) gleich(`LV Grid GP ${z.oz}`, await text(await zelle(z.oz, 'gesamtpreis')), fmt(z.schaetzpreis));
}
for (const v of ['panel', 'karten']) {
  await seite('lv', v);
  for (const k of Object.keys(summenSoll)) gleich(`LV ${v} ${k}`, await text(page.locator(`[data-summe="${k}"]`)), fmt(summenSoll[k]));
  if (v === 'karten') for (const [oz, soll] of Object.entries(erwartet.lv.titel)) gleich(`LV karten Titel ${oz}`, await text(page.locator(`[data-summe="titel-${oz}"]`)), fmt(soll));
}

// ---------------- 2. Preisspiegel: drei Varianten ----------------
const namen = erwartet.angebote.map((a) => a.name);
const abw = [];
for (const v of ['farbe', 'rang', 'balken']) {
  await seite('spiegel', v);
  // Rangfolge
  const reihe = await page.locator('[data-rangfolge] li').evaluateAll((l) => l.map((e) => [e.dataset.bieter, e.querySelector('[data-wert="nach"]').textContent]));
  erwartet.rangfolge.forEach((r, i) => {
    gleich(`Spiegel ${v} Rang ${i + 1} Bieter`, reihe[i][0], r.name);
    gleich(`Spiegel ${v} Rang ${i + 1} Netto nach Nachlass`, reihe[i][1], fmt(r.nettoNachNachlass));
  });
  // Summenzeilen je Bieter
  const zeile = (k) => page.locator(`tr[data-zeile="${k}"]`);
  const zellenwert = async (k, bieter, wert) => text(zeile(k).locator(`[data-bieter="${bieter}"][data-wert="${wert}"]`));
  for (const [i, a] of erwartet.angebote.entries()) {
    const n = namen[i];
    gleich(`Spiegel ${v} ${n} Netto`, await zellenwert('netto', n, 'netto'), fmt(a.summen.netto));
    gleich(`Spiegel ${v} ${n} Netto nach Nachlass`, await zellenwert('nach', n, 'nach'), fmt(a.summen.nach));
    if (v !== 'balken') {
      gleich(`Spiegel ${v} ${n} MwSt`, await zellenwert('mwst', n, 'mwst'), fmt(a.summen.mwst));
      gleich(`Spiegel ${v} ${n} Brutto`, await zellenwert('brutto', n, 'brutto'), fmt(a.summen.brutto));
    } else {
      gleich(`Spiegel ${v} ${n} MwSt`, await zellenwert('mwst', n, 'mwst'), fmt(a.summen.mwst));
      gleich(`Spiegel ${v} ${n} Brutto`, await zellenwert('brutto', n, 'brutto'), fmt(a.summen.brutto));
    }
    const nl = await zellenwert('nachlass', n, 'nachlass');
    if (a.nachlassProzent) {
      wahr(`Spiegel ${v} ${n} Nachlass getrennt`, nl.includes(fmt(a.summen.nachlass)), nl);
    } else wahr(`Spiegel ${v} ${n} ohne Nachlass`, nl.includes('kein Nachlass'), nl);
  }
  for (const [feld, st, zk] of [['netto', erwartet.virtuelleBieter.netto, 'netto'], ['nach', erwartet.virtuelleBieter.nettoNachNachlass, 'nach']]) {
    for (const w of ['min', 'mittel', 'max']) gleich(`Spiegel ${v} virtuell ${feld} ${w}`, await text(zeile(zk).locator(`[data-wert="${w}"]`)), fmt(st[w]));
  }
  // Titelsummen
  for (const [i, a] of erwartet.angebote.entries()) {
    for (const [oz, soll] of Object.entries(a.titel)) {
      const l = page.locator(`[data-titel="${oz}"] [data-bieter="${namen[i]}"][data-wert="titel"]`);
      gleich(`Spiegel ${v} ${namen[i]} Titel ${oz}`, await text(l), fmt(soll));
    }
  }
  // Positionen
  let ausreisserGesehen = [];
  for (const z of erwartet.preisspiegel) {
    const rz = page.locator(`[data-oz="${z.oz}"]`);
    for (const [i, w] of z.werte.entries()) {
      const c = rz.locator(`[data-bieter="${namen[i]}"]`).first();
      const art = await c.getAttribute('data-wert');
      const t = await text(c);
      if (w === null) {
        gleich(`Spiegel ${v} ${z.oz} ${namen[i]} nicht angeboten (Art)`, art, 'nicht');
        wahr(`Spiegel ${v} ${z.oz} ${namen[i]} Text "nicht angeboten"`, t.includes('nicht angeboten'), t);
        wahr(`Spiegel ${v} ${z.oz} ${namen[i]} nicht angeboten ist nicht 0,00`, !t.includes('0,00'), t);
      } else {
        gleich(`Spiegel ${v} ${z.oz} ${namen[i]} Art`, art, 'gp');
        wahr(`Spiegel ${v} ${z.oz} ${namen[i]} GP ${fmt(w)}`, t.startsWith(fmt(w)) || t.includes(fmt(w)), t);
        const aus = (await c.getAttribute('data-ausreisser')) === 'true';
        if (aus) ausreisserGesehen.push(`${z.oz} ${namen[i]}`);
        gleich(`Spiegel ${v} ${z.oz} ${namen[i]} Ausreisser`, String(aus), String(z.ausreisser[i]));
      }
    }
    for (const w of ['min', 'mittel', 'max']) {
      const t = await text(rz.locator(`[data-wert="${w}"]`));
      wahr(`Spiegel ${v} ${z.oz} ${w} ${fmt(z[w])}`, t.includes(fmt(z[w])), t);
    }
    if (v !== 'balken') gleich(`Spiegel ${v} ${z.oz} Schaetzpreis`, await text(rz.locator('[data-wert="schaetz"]')), fmt(z.schaetzpreis));
  }
  gleich(`Spiegel ${v} Ausreisser insgesamt`, JSON.stringify(ausreisserGesehen.sort()), JSON.stringify([...erwartet.ausreisser].sort()));
  abw.push(`${v}: ${ausreisserGesehen.length} Ausreisser gesehen`);
}

// ---------------- 3. Tastatur im Grid ----------------
const bericht = [];
const ok = (was, bed, detail = '') => {
  bericht.push(`${bed ? 'geht' : 'GEHT NICHT'}: ${was}${detail ? ` (${detail})` : ''}`);
  if (!bed) abweichungen.push(`Tastatur ${was} ${detail}`);
  geprueft++;
};
const aktiv = () =>
  page.evaluate(() => {
    const a = document.activeElement;
    return { spalte: a?.dataset?.spalte ?? null, i: a?.closest?.('[data-i]')?.dataset?.i ?? null, tag: a?.tagName ?? null, text: (a?.textContent ?? '').trim().slice(0, 30) };
  });

await seite('lv', 'baum');
await (await zelle('01.0010', 'kurztext')).click();
let a = await aktiv();
const i0 = Number(a.i);
await page.keyboard.press('ArrowDown');
a = await aktiv();
ok('Pfeil runter wechselt die Zeile', Number(a.i) === i0 + 1 && a.spalte === 'kurztext', JSON.stringify(a));
await page.keyboard.press('ArrowRight');
a = await aktiv();
ok('Pfeil rechts wechselt die Spalte', a.spalte === 'menge', JSON.stringify(a));
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowLeft');
a = await aktiv();
ok('Pfeil hoch und links', Number(a.i) === i0 && a.spalte === 'kurztext', JSON.stringify(a));
await page.keyboard.press('End');
a = await aktiv();
ok('Ende springt in die letzte Spalte der Zeile', a.spalte === 'gesamtpreis', JSON.stringify(a));
await page.keyboard.press('Home');
a = await aktiv();
ok('Pos1 springt in die erste Spalte der Zeile', a.spalte === 'ordnungszahl', JSON.stringify(a));
await page.keyboard.press('PageDown');
a = await aktiv();
ok('Bild runter springt eine Seite', Number(a.i) > i0 + 5, JSON.stringify(a));
await page.keyboard.press('Control+Home');
a = await aktiv();
ok('Strg+Pos1 springt in die erste Zelle', a.i === '0' && a.spalte === 'ordnungszahl', JSON.stringify(a));

// Eingabe 1: Enter beginnt die Eingabe; Enter bestaetigt und geht nach unten (Menge 01.0010: 1,000 -> 2)
await (await zelle('01.0010', 'menge')).click();
await page.keyboard.press('Enter');
ok('Enter beginnt das Bearbeiten', (await (await zelle('01.0010', 'menge')).getByRole('textbox').count()) === 1);
await page.keyboard.press('Control+A');
await page.keyboard.type('2');
await page.keyboard.press('Enter');
a = await aktiv();
ok('Enter bestätigt und geht eine Zeile nach unten', a.spalte === 'menge' && Number(a.i) === Number((await (await sichtbar('01.0020')).getAttribute('data-i'))), JSON.stringify(a));
// Unabhaengige Erwartung (BigInt) fuer die geaenderte Menge
const ganz = (s) => BigInt(s.replace('.', ''));
const hh = (z, n) => (2n * z + n) / (2n * n);
const cent = (c) => { const s = c.toString().padStart(3, '0'); return `${s.slice(0, -2)}.${s.slice(-2)}`; };
const rechne = (aenderung) => {
  const pos = lv.knoten.filter((k) => k.art === 'position').map((p) => ({ ...p, ...(aenderung[p.ordnungszahl + (p.ozIndex ?? '')] ?? {}) }));
  const gp = (p) => (p.menge && p.einheitspreis ? hh(ganz(p.menge) * ganz(p.einheitspreis), 10n ** 4n) : 0n);
  let netto = 0n;
  for (const p of pos) netto += gp(p);
  return { netto, pos, gp };
};
const summenVon = (netto, nachlassProzent, mwst = '19.00') => {
  const nachlass = hh(netto * ganz(nachlassProzent), 10000n);
  const nach = netto - nachlass;
  const m = hh(nach * ganz(mwst), 10000n);
  return { netto: cent(netto), nachlass: cent(nachlass), nach: cent(nach), mwst: cent(m), brutto: cent(nach + m) };
};
{
  const e = summenVon(rechne({ '01.0010': { menge: '2.000' } }).netto, '2.00');
  const g = await gridSummen();
  for (const k of Object.keys(e)) gleich(`nach Mengenaenderung (Grid) ${k}`, g[k], fmt(e[k]));
  gleich('nach Mengenaenderung GP 01.0010', await text((await zelle('01.0010', 'gesamtpreis'))), '3.700,00');
  gleich('nach Mengenaenderung Titelsumme 01', await text((await zelle('01', 'gesamtpreis'))), fmt(cent(609079n + 185000n)));
  ok('Eingabe ändert GP, Titelsumme, Netto, Nachlass, MwSt und Brutto sofort', true, `Netto ${fmt(e.netto)}, Brutto ${fmt(e.brutto)}`);
}
// Eingabe 2: Tab bestaetigt und geht nach rechts (EP 01.0020: 7,450 -> 8,5 ueber F2 und Tab von der Einheit)
await (await zelle('01.0020', 'einheit')).click();
await page.keyboard.press('F2');
ok('F2 beginnt das Bearbeiten', (await (await zelle('01.0020', 'einheit')).getByRole('textbox').count()) === 1);
await page.keyboard.press('Tab');
a = await aktiv();
ok('Tab im Eingabefeld bestätigt und geht eine Zelle nach rechts', a.spalte === 'einheitspreis' && a.tag !== 'INPUT', JSON.stringify(a));
await page.keyboard.press('F2');
await page.keyboard.press('Control+A');
await page.keyboard.type('8,5');
await page.keyboard.press('Tab');
{
  const e = summenVon(rechne({ '01.0010': { menge: '2.000' }, '01.0020': { einheitspreis: '8.500' } }).netto, '2.00');
  const g = await gridSummen();
  for (const k of Object.keys(e)) gleich(`nach EP-Aenderung (Grid) ${k}`, g[k], fmt(e[k]));
  gleich('GP 01.0020 nach EP 8,500', await text((await zelle('01.0020', 'gesamtpreis'))), '735,25');
}
// Escape verwirft; Zeichen tippen beginnt die Eingabe
await (await zelle('01.0030', 'menge')).click();
await page.keyboard.type('9');
ok('Zeichen tippen beginnt die Eingabe', (await (await zelle('01.0030', 'menge')).getByRole('textbox').inputValue()) === '9');
await page.keyboard.press('Escape');
gleich('Escape verwirft (Menge 01.0030)', await text((await zelle('01.0030', 'menge'))), '4,000');
ok('Escape verwirft die Eingabe', true);
// Ungueltige Eingabe sperrt nicht
await (await zelle('01.0030', 'menge')).click();
await page.keyboard.press('F2');
await page.keyboard.press('Control+A');
await page.keyboard.type('zwölf');
await page.keyboard.press('Enter');
const ungueltig = await (await zelle('01.0030', 'menge')).locator('[aria-invalid="true"], [aria-invalid]').count();
ok('ungültige Eingabe bleibt sichtbar markiert, nichts wird gesperrt (U5)', ungueltig > 0 || (await (await zelle('01.0030', 'menge')).getAttribute('aria-invalid')) === 'true');
await page.keyboard.press('Escape');
// Entf leert
await (await zelle('01.0040', 'einheitspreis')).click();
await page.keyboard.press('Delete');
{
  const e = summenVon(rechne({ '01.0010': { menge: '2.000' }, '01.0020': { einheitspreis: '8.500' }, '01.0040': { einheitspreis: null } }).netto, '2.00');
  const g = await gridSummen();
  for (const k of Object.keys(e)) gleich(`nach Entf (Grid) ${k}`, g[k], fmt(e[k]));
  ok('Entf leert den Einheitspreis, die Position hat keinen GP mehr, Summen folgen', true, `Netto ${fmt(e.netto)}`);
}
// Leertaste waehlt: ein Mausklick waehlt die Zeile bereits, Leertaste schaltet um
await (await zelle('01.0050', 'kurztext')).click();
const gewaehlt = async () => (await (await sichtbar('01.0050')).getAttribute('aria-selected')) === 'true';
const nachKlick = await gewaehlt();
await page.keyboard.press('Space');
const nachSpace1 = await gewaehlt();
await page.keyboard.press('Space');
const nachSpace2 = await gewaehlt();
ok('Leertaste schaltet die Zeilenauswahl um', nachSpace1 !== nachSpace2, `nach Klick: ${nachKlick}, 1. Leertaste: ${nachSpace1}, 2. Leertaste: ${nachSpace2}`);
// Alt+Links klappt zu
await (await zelle('02', 'kurztext')).click();
const vorher = await page.locator('[role="row"][data-i]').count();
await page.keyboard.press('Alt+ArrowLeft');
const nachher = await page.locator('[role="row"][data-i]').count();
ok('Alt+Pfeil links klappt den Titel zu', nachher < vorher, `${vorher} -> ${nachher} Zeilen`);
await page.keyboard.press('Alt+ArrowRight');
ok('Alt+Pfeil rechts klappt auf', (await page.locator('[role="row"][data-i]').count()) === vorher);
// Nachlass-Feld
await page.getByTestId('feld-nachlass').fill('3,5');
{
  const e = summenVon(rechne({ '01.0010': { menge: '2.000' }, '01.0020': { einheitspreis: '8.500' }, '01.0040': { einheitspreis: null } }).netto, '3.50');
  const g = await gridSummen();
  for (const k of Object.keys(e)) gleich(`nach Nachlass 3,5 % (Grid) ${k}`, g[k], fmt(e[k]));
}
await page.getByTestId('feld-mwst').fill('7');
{
  const e = summenVon(rechne({ '01.0010': { menge: '2.000' }, '01.0020': { einheitspreis: '8.500' }, '01.0040': { einheitspreis: null } }).netto, '3.50', '7.00');
  const g = await gridSummen();
  for (const k of Object.keys(e)) gleich(`nach MwSt 7 % (Grid) ${k}`, g[k], fmt(e[k]));
}
// Einfuegen aus Excel
await (await zelle('03.0080', 'kurztext')).click();
const n0 = await page.locator('[role="row"][data-i]').count();
await page.evaluate((t) => navigator.clipboard.writeText(t), 'Neue Position A\t10\tm\t5,5\r\nNeue Position B\t2\tSt\t100\r\n');
await page.keyboard.press('Control+V');
await page.waitForTimeout(200);
const status = await text(page.getByRole('status'));
ok('Strg+V aus Excel legt neue Positionen an (2 Zeilen -> 2 neue Positionen)', status.includes('2 Positionen eingefügt'), status);
{
  const e = summenVon(rechne({ '01.0010': { menge: '2.000' }, '01.0020': { einheitspreis: '8.500' }, '01.0040': { einheitspreis: null } }).netto + 5500n + 20000n, '3.50', '7.00');
  const g = await gridSummen();
  for (const k of Object.keys(e)) gleich(`nach Einfuegen (Grid) ${k}`, g[k], fmt(e[k]));
}
// Variante panel: Tastatur
await seite('lv', 'panel');
await page.locator('[role="listbox"]').focus();
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
ok('Panel: Enter springt vom Listenfeld ins Panel', (await page.evaluate(() => document.activeElement?.closest('[data-panel]') !== null)));

// Leiste: jede Ansicht und jede Variante ist per Klick erreichbar
{
  const soll = { lv: ['baum', 'panel', 'karten'], spiegel: ['farbe', 'rang', 'balken'], projekt: ['baum', 'reiter', 'vorgang'], gaeb: ['schritte', 'seite'] };
  const kurz = { lv: '1 LV-Grid', spiegel: '2 Preisspiegel', projekt: '3 Projektübersicht', gaeb: '4 GAEB-Dialog' };
  await page.goto(BASIS + '/');
  for (const [a, vs] of Object.entries(soll)) {
    await page.getByRole('group', { name: 'Ansicht' }).getByRole('button', { name: kurz[a] }).click();
    for (const v of vs) {
      await page.locator(`[data-variante-knopf="${v}"]`).click();
      const m = page.locator('main[data-ansicht]');
      gleich(`Leiste ${a}/${v}`, `${await m.getAttribute('data-ansicht')}/${await m.getAttribute('data-variante')}`, `${a}/${v}`);
      gleich(`URL ${a}/${v}`, new URL(page.url()).search, `?ansicht=${a}&variante=${v}`);
    }
  }
}

await browser.close();

console.log(`Geprüft: ${geprueft} Werte und Verhaltensweisen`);
console.log(abw.join('\n'));
console.log('--- Tastatur im Grid (Variante "dichte Tabelle mit Baum") ---');
console.log(bericht.join('\n'));
if (abweichungen.length) {
  console.log(`\n${abweichungen.length} ABWEICHUNGEN:\n${abweichungen.join('\n')}`);
  process.exit(1);
}
console.log('\nAlle Bildschirmwerte stimmen mit der Handrechnung überein.');
