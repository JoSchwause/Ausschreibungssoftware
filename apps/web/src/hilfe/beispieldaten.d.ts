// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Modul, das der Build aus den Fixtures erzeugt (Plugin `beispielprojekt` in `vite.config.ts`, Ticket 147).

declare module 'virtual:tethys-beispielprojekt' {
  /** `fixtures/typisch.json` als Text. */
  export const lv: string;
  /** `fixtures/typisch-angebote.json` als Text. */
  export const angebote: string;
  /** `fixtures/typisch-abrechnung.json` als Text. */
  export const abrechnung: string;
  /** Dateiname des Modells (`haus-v1.ifc`). */
  export const modellDateiname: string;
  /** `fixtures/ifc/haus-v1.ifc` als Text (ASCII nach ISO 10303-21). */
  export const modell: string;
}
