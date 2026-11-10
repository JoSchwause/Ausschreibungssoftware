// SPDX-License-Identifier: AGPL-3.0-or-later
// Weg B des Spikes: Druckweg des Browsers. Das LV wird als HTML mit Druck-CSS (`@page`, Randboxen für „Seite x von y“,
// wiederholter Tabellenkopf) erzeugt; das PDF entsteht im Druckdialog des Browsers (Speichern als PDF). Es gibt keine
// PDF-Bytes aus dieser Funktion, und Seitenzahl und Umbruch gehören dem Browser.

import { baueAusgabemodell } from './modell';
import type { AusgabeZeile, Ausgabemodell } from './modell';
import type { Schriften } from './schriften';
import type { LvZustand } from '@tethys/vertrag';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

function alsBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const CSS = (schriften: Schriften): string => `
@font-face{font-family:"Noto Sans";font-weight:400;src:url(data:font/woff;base64,${alsBase64(schriften.normal)}) format("woff")}
@font-face{font-family:"Noto Sans";font-weight:700;src:url(data:font/woff;base64,${alsBase64(schriften.fett)}) format("woff")}
@page{size:A4;margin:20mm 14mm 16mm 14mm;@bottom-right{content:"Seite " counter(page) " von " counter(pages);font:7pt "Noto Sans"}}
html{font:8pt/1.3 "Noto Sans"}
body{margin:0}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead{display:table-header-group}
th{font-size:7pt;text-align:left;border-bottom:.5pt solid #000;padding:1pt 2pt}
td{padding:1pt 2pt;vertical-align:top;overflow-wrap:anywhere}
tr{break-inside:avoid}
tr.titel{break-after:avoid;font-weight:700}
tr.summe td{font-weight:700;padding-bottom:6pt}
tr.lang td,tr.hinweis td{font-size:7pt;color:#555;white-space:pre-line}
.r{text-align:right}
tr.gesamt td{padding:1pt 2pt}
tr.gesamt.fett td{font-weight:700}
`;

const SPALTEN = ['58pt', 'auto', '54pt', '28pt', '58pt', '66pt'];

function zeilenHtml(z: AusgabeZeile): string {
  const e = escapeHtml;
  switch (z.art) {
    case 'titel':
      return `<tr class="titel"><td colspan="6">${e(z.ordnungszahl)}&nbsp;&nbsp;${e(z.kurztext)}</td></tr>`;
    case 'titelsumme':
      return `<tr class="summe"><td colspan="5">Summe ${e(z.ordnungszahl)} ${e(z.kurztext)}</td><td class="r">${e(z.summe)}</td></tr>`;
    case 'hinweis':
      return `<tr class="hinweis"><td></td><td colspan="5">${e(z.text)}</td></tr>`;
    case 'position': {
      const gp = z.gehtInSummeEin ? e(z.gesamtpreis) : `(${e(z.gesamtpreis)})`;
      // Mit Langtext: Kopfzeile und Langtext zusammenhalten (break-after:avoid auf der Kopfzeile).
      const halten = z.langtext === '' ? '' : ' style="break-after:avoid"';
      const kopf = `<tr class="position"${halten}><td>${e(z.ordnungszahl)}</td><td>${e(z.kurztext)}</td><td class="r">${e(z.menge)}</td><td>${e(z.einheit)}</td><td class="r">${e(z.einheitspreis)}</td><td class="r">${gp}</td></tr>`;
      return z.langtext === ''
        ? kopf
        : `${kopf}<tr class="lang"><td></td><td colspan="5">${e(z.langtext)}</td></tr>`;
    }
  }
}

function summenHtml(m: Ausgabemodell['summen']): string {
  const z = (bezeichnung: string, wert: string, fett = false): string =>
    `<tr class="gesamt${fett ? ' fett' : ''}"><td colspan="5" class="r">${escapeHtml(bezeichnung)}</td><td class="r">${escapeHtml(wert)}</td></tr>`;
  return [
    z('Netto', m.netto),
    ...(m.nachlass
      ? [z(m.nachlass.bezeichnung, m.nachlass.betrag), z('Netto nach Nachlass', m.nettoNachNachlass)]
      : []),
    z(m.mwstBezeichnung, m.mwst),
    z('Brutto', m.brutto, true),
  ].join('');
}

export function erzeugeDruckHtml(zustand: LvZustand, schriften: Schriften): string {
  const modell = baueAusgabemodell(zustand);
  const kopf = ['OZ', 'Kurztext', 'Menge', 'Einh.', 'EP in €', 'GP in €']
    .map((t, i) => `<th${i === 2 || i >= 4 ? ' class="r"' : ''}>${t}</th>`)
    .join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(modell.name)}</title><style>${CSS(schriften)}</style></head><body><table><colgroup>${SPALTEN.map((w) => `<col style="width:${w}">`).join('')}</colgroup><thead><tr><th colspan="6" style="font-size:9pt;border:0">${escapeHtml(modell.name)}</th></tr><tr>${kopf}</tr></thead><tbody>${modell.zeilen.map(zeilenHtml).join('')}${summenHtml(modell.summen)}</tbody></table></body></html>`;
}
