// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Einstiege der Berichte: Eingabe der Domänentypen → Berichtsmodell → PDF- bzw. Excel-Bytes (Tickets 113, 141;
// ADR 0012).

import { baueAufmassblattModell } from './aufmass-druck';
import type { AufmassblattEingabe } from './aufmass-druck';
import { berichtAlsExcel } from './bericht-excel';
import { erzeugeBerichtPdf } from './bericht-pdf';
import { baueBautagebuchModell } from './bautagebuch-druck';
import type { BautagebuchEingabe } from './bautagebuch-druck';
import { baueBauzeitenplanModell } from './bauzeit-druck';
import type { BauzeitenplanEingabe } from './bauzeit-druck';
import { baueHonorarModell } from './honorar-druck';
import type { HonorarEingabe } from './honorar-druck';
import { baueMaengelanzeigeModell, baueMaengellisteModell } from './maengel-druck';
import type { MaengelanzeigeEingabe, MaengellisteEingabe } from './maengel-druck';
import { bauePreisspiegelModell } from './preisspiegel-druck';
import type { PreisspiegelEingabe } from './preisspiegel-druck';
import type { Schriften } from './schriften';
import { baueSollIstModell } from './soll-ist-druck';
import type { SollIstEingabe } from './soll-ist-druck';
import { baueVergabevorschlagModell } from './vergabevorschlag-druck';
import type { VergabevorschlagEingabe } from './vergabevorschlag-druck';

export const erzeugeMaengellistePdf = (e: MaengellisteEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueMaengellisteModell(e), s);
export const erzeugeMaengelanzeigePdf = (e: MaengelanzeigeEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueMaengelanzeigeModell(e), s);
export const erzeugeBautagebuchPdf = (e: BautagebuchEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueBautagebuchModell(e), s);
export const erzeugeHonorarPdf = (e: HonorarEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueHonorarModell(e), s);
export const erzeugeBauzeitenplanPdf = (e: BauzeitenplanEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueBauzeitenplanModell(e), s);

// Kernkette (Ticket 141)
export const erzeugePreisspiegelPdf = (e: PreisspiegelEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(bauePreisspiegelModell(e), s);
/** Alle Bieter nebeneinander in einer Tabelle (im Druck je Seite höchstens `BIETER_JE_TABELLE`). */
export const preisspiegelAlsExcel = (e: PreisspiegelEingabe): Uint8Array =>
  berichtAlsExcel(bauePreisspiegelModell(e, Number.POSITIVE_INFINITY));
export const erzeugeVergabevorschlagPdf = (e: VergabevorschlagEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueVergabevorschlagModell(e), s);
export const erzeugeAufmassblattPdf = (e: AufmassblattEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueAufmassblattModell(e), s);
export const aufmassblattAlsExcel = (e: AufmassblattEingabe): Uint8Array =>
  berichtAlsExcel(baueAufmassblattModell(e));
export const erzeugeSollIstPdf = (e: SollIstEingabe, s: Schriften): Promise<Uint8Array> =>
  erzeugeBerichtPdf(baueSollIstModell(e), s);
export const sollIstAlsExcel = (e: SollIstEingabe): Uint8Array => berichtAlsExcel(baueSollIstModell(e));
