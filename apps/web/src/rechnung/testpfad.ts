// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Teil des Testpfads (`src/testpfad.ts`, nur im Test-Build): ein Aufmaßblatt anlegen, damit die E2E der
// Rechnungen nicht von der Aufmaßseite (Ticket 87) abhängt. Auch hier geht alles als Befehl durch den Ausführer
// (`abrechnung`) und den Speicher (A5), auf der Kette des Befehlswegs; kein Undo-Schritt (die Aufmaßseite ist nicht Teil
// dieser Tests).

import { aufmassBefehlAusfuehren } from '@tethys/abrechnung';
import type { Aufmass, Ergebnis } from '@tethys/vertrag';
import { befehlswegFuer, eintragSchreiben, type Umgebung } from '../lv/befehlsweg';

/** Legt das Blatt an; der Fehler ist der Code des Ausführers oder des Speichers. */
export function aufmassSchreiben(u: Umgebung, aufmass: Aufmass): Promise<Ergebnis<void, string>> {
  return befehlswegFuer(u).reihe(async () => {
    const befehl = { art: 'AufmassAnlegen', aufmass } as const;
    const r = aufmassBefehlAusfuehren(null, befehl);
    if (!r.ok) return { ok: false, fehler: r.fehler.code };
    const e = {
      id: u.ids.protokoll(),
      projektId: aufmass.projektId,
      aggregat: { art: 'aufmass', id: aufmass.id },
      wer: u.nutzer,
      wann: u.uhr(),
      befehl,
    } as const;
    const s = await eintragSchreiben(u, e, r.wert);
    return s.ok ? { ok: true, wert: undefined } : { ok: false, fehler: s.fehler.code };
  });
}

/** Was der Testpfad der App für die Rechnungen anbietet (`window.tethysTest`). */
export interface RechnungTestpfad {
  /** Legt ein Aufmaßblatt an (Vertragsform `Aufmass`); `true`: gespeichert. */
  aufmassAnlegen(aufmass: Aufmass): Promise<boolean>;
}

export function rechnungTestpfad(u: Umgebung): RechnungTestpfad {
  return {
    async aufmassAnlegen(aufmass) {
      return (await aufmassSchreiben(u, aufmass)).ok;
    },
  };
}
