// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Daten des Beispielprojekts (Ticket 147): Der Build bindet die Fixtures als eigenes Modul ein (`vite.config.ts`, Plugin
// `beispielprojekt`); es wird erst beim Klick auf „Beispielprojekt laden“ nachgeladen. Nur die Oberfläche nutzt diese Datei;
// die Tests übergeben die Fixtures selbst an `beispielprojektAnlegen`.

import type { Beispielquelle } from './beispielprojekt';

export async function beispielquelleLaden(): Promise<Beispielquelle> {
  const m = await import('virtual:tethys-beispielprojekt');
  return {
    lv: m.lv,
    angebote: m.angebote,
    abrechnung: m.abrechnung,
    modell: { dateiname: m.modellDateiname, bytes: new TextEncoder().encode(m.modell) },
  };
}
