// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite der Modellansicht (nur für Playwright und zum Ansehen). Sie spielt die Rolle der App: Sie hält Auswahl,
// Ausblenden, Isolieren und Färbung und gibt sie der Leinwand; ein Klick ersetzt die Auswahl, Strg+Klick ergänzt sie.
// Der Prüfzugang `window.__modell` steht nur hier, nie im Paket.
//
// Aufruf-Parameter:
//   modell=klein|gross|kaputt|haus-v1|haus-v2|d54   Standard klein (selbst verfasst, testhilfe/ifc-erzeuger.ts);
//                                               haus-v1/-v2 aus fixtures/ifc (Ticket 99); d54 reicht der Leistungstest
//                                               unter modelle/d54.ifc (fixtures/ifc/erzeugen.mjs, Ticket 122)
//   anzahl=10000                                Bauteile im großen Modell
//   thema=dark|light

import type { IfcGlobalId } from '@tethys/vertrag';
import '@tethys/ui-basis/tokens.css';
import '../../src/modellansicht.css';
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modellansicht } from '../../src/index';
import type { Bauteilkennzeichen, ModellansichtRef } from '../../src/index';
import { grossesModell, ifcBytes, kleinesModell } from '../../src/testhilfe/ifc-erzeuger';
import type { Pruefeingaben } from './global';

const params = new URLSearchParams(window.location.search);
document.documentElement.dataset['theme'] = params.get('thema') === 'dark' ? 'dark' : 'light';

async function modellBytes(): Promise<Uint8Array> {
  const name = params.get('modell') ?? 'klein';
  if (name === 'klein') return ifcBytes(kleinesModell());
  if (name === 'gross') return ifcBytes(grossesModell(Number(params.get('anzahl') ?? '10000')));
  if (name === 'kaputt') return new TextEncoder().encode('Das ist keine IFC-Datei.');
  const antwort = await fetch(`modelle/${name}.ifc`);
  if (!antwort.ok) throw new Error(`Modell fehlt: ${name}`);
  return new Uint8Array(await antwort.arrayBuffer());
}

const datei = await modellBytes();
let ansicht: ModellansichtRef | null = null;
const fertig = (): ModellansichtRef => {
  if (!ansicht) throw new Error('Leinwand nicht bereit');
  return ansicht;
};
/** Wartet auf den nächsten Commit der Testseite (danach hat die Leinwand die neuen Eingaben übernommen). */
const nachCommit: (() => void)[] = [];
let eingabenSetzen: ((f: (e: Pruefeingaben) => Pruefeingaben) => void) | null = null;
let aktuell: Pruefeingaben = { auswahl: [], ausgeblendet: [], isoliert: null, faerbung: {} };

const leinwandElement = (): HTMLCanvasElement => {
  const c = document.querySelector('canvas');
  if (!c) throw new Error('keine Leinwand');
  return c;
};

/** Wartet, bis die GPU alle Befehle ausgeführt hat (ein Pixel lesen zwingt dazu). */
function gpuWarten(): void {
  const gl = leinwandElement().getContext('webgl2');
  gl?.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
}

function klicken(x: number, y: number): void {
  const c = leinwandElement();
  const art = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' };
  c.dispatchEvent(new PointerEvent('pointerdown', { ...art, button: 0, buttons: 1, isPrimary: true }));
  c.dispatchEvent(new PointerEvent('pointerup', { ...art, button: 0, buttons: 0, isPrimary: true }));
}

const uebergabe = performance.now();

window.__modell = {
  ereignisse: { auswahl: [], geladen: [], fehler: [] },
  setzen: (teil) =>
    new Promise((erfuellt) => {
      nachCommit.push(erfuellt);
      eingabenSetzen?.((e) => ({ ...e, ...teil }));
    }),
  eingaben: () => aktuell,
  darstellung: () => fertig().darstellung(),
  punkt: (id) => fertig().bildschirmpunkt(id as IfcGlobalId),
  auswahlZeigen: async () => {
    fertig().auswahlZeigen();
    await fertig().gezeichnet();
  },
  ansichtZuruecksetzen: async () => {
    fertig().ansichtZuruecksetzen();
    await fertig().gezeichnet();
  },
  messePicken: async (id) => {
    const p = fertig().bildschirmpunkt(id as IfcGlobalId);
    if (!p) throw new Error(`Bauteil nicht sichtbar: ${id}`);
    const committed = new Promise<void>((erfuellt) => nachCommit.push(erfuellt));
    const start = performance.now();
    klicken(p.x, p.y);
    await committed;
    await fertig().gezeichnet();
    gpuWarten();
    const dauer = performance.now() - start;
    if (
      !fertig()
        .darstellung()
        .hervorgehoben.includes(id as IfcGlobalId)
    )
      throw new Error(`nicht hervorgehoben: ${id}`);
    return dauer;
  },
  renderer: () => {
    const gl = leinwandElement().getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  },
};

function Pruefstand() {
  const [eingaben, setEingaben] = useState<Pruefeingaben>(aktuell);
  eingabenSetzen = setEingaben;
  aktuell = eingaben;
  useEffect(() => {
    for (const f of nachCommit.splice(0)) f();
  }, [eingaben]);
  // Die Prüfeingaben kommen als JSON aus dem Test; die GlobalIds der Leinwand tragen die Marke des Vertrags (Ticket 155).
  const faerbung = useMemo(
    () => new Map(Object.entries(eingaben.faerbung) as [IfcGlobalId, Bauteilkennzeichen][]),
    [eingaben.faerbung],
  );
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Modellansicht
        ref={(r) => {
          ansicht = r;
        }}
        datei={datei}
        auswahl={eingaben.auswahl}
        ausgeblendet={eingaben.ausgeblendet}
        isoliert={eingaben.isoliert}
        faerbung={faerbung}
        onAuswahl={(ids, { hinzufuegen }) => {
          window.__modell.ereignisse.auswahl.push({ globalIds: [...ids], hinzufuegen });
          setEingaben((e) => ({
            ...e,
            auswahl: hinzufuegen ? [...new Set([...e.auswahl, ...ids])] : [...ids],
          }));
        }}
        onGeladen={(bericht) => {
          gpuWarten();
          window.__modell.ereignisse.geladen.push({
            ...bericht,
            seitUebergabeMs: performance.now() - uebergabe,
          });
        }}
        onFehler={(f) => {
          window.__modell.ereignisse.fehler.push(f);
        }}
      />
    </div>
  );
}

const wurzel = document.getElementById('root');
if (!wurzel) throw new Error('#root fehlt');
createRoot(wurzel).render(
  <StrictMode>
    <Pruefstand />
  </StrictMode>,
);
