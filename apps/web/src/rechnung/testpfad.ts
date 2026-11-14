// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Teil des Testpfads (`src/testpfad.ts`, nur im Test-Build): ein Aufmaßblatt anlegen und einen Nachtrag ins
// Auftrags-LV übernehmen, damit die E2E der Rechnungen nicht von Aufmaß- und Nachtragsseite (Tickets 86, 87) abhängt.
// Auch hier geht alles als Befehl durch Ausführer (`abrechnung`, `kern`) und Speicher (A5), auf der Kette des
// Befehlswegs; kein Undo-Schritt (diese Seiten sind nicht Teil dieser Tests).

import { aufmassBefehlAusfuehren } from '@tethys/abrechnung';
import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import type {
  Aufmass,
  AufmassBefehl,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  Ergebnis,
  Knoten,
  LeistungsverzeichnisId,
} from '@tethys/vertrag';
import { befehlswegFuer, eintrag, eintragSchreiben, type Umgebung } from '../lv/befehlsweg';

/** Legt das Blatt an; der Fehler ist der Code des Ausführers oder des Speichers. */
export function aufmassSchreiben(u: Umgebung, aufmass: Aufmass): Promise<Ergebnis<void, string>> {
  return befehlswegFuer(u).reihe(async () => {
    const befehl = { art: 'AufmassAnlegen', aufmass } as const;
    const r = aufmassBefehlAusfuehren(null, befehl);
    if (!r.ok) return { ok: false, fehler: r.fehler.code };
    const e = eintrag(u, aufmass.projektId, { art: 'aufmass', id: aufmass.id }, befehl);
    const s = await eintragSchreiben(u, e, r.wert);
    return s.ok ? { ok: true, wert: undefined } : { ok: false, fehler: s.fehler.code };
  });
}

/** Ein Befehl an ein vorhandenes Blatt (Ticket 152: die Korrektur aus M4 für die E2E der Zahlungen). */
export function aufmassBefehlSchreiben(
  u: Umgebung,
  aufmassId: AufmassId,
  befehl: AufmassBefehl,
): Promise<Ergebnis<void, string>> {
  return befehlswegFuer(u).reihe(async () => {
    const z = await u.speicher.aufmasse.laden(aufmassId);
    if (!z.ok) return { ok: false, fehler: z.fehler.code };
    const r = aufmassBefehlAusfuehren(z.wert, befehl);
    if (!r.ok) return { ok: false, fehler: r.fehler.code };
    const e = eintrag(u, z.wert.aufmass.projektId, { art: 'aufmass', id: aufmassId }, befehl);
    const s = await eintragSchreiben(u, e, r.wert);
    return s.ok ? { ok: true, wert: undefined } : { ok: false, fehler: s.fehler.code };
  });
}

/** Übernimmt die Knoten eines Nachtrags ins Auftrags-LV (`NachtragUebernehmen`, Kern). */
export function nachtragSchreiben(
  u: Umgebung,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  nachtragLvId: LeistungsverzeichnisId,
  knoten: readonly Knoten[],
): Promise<Ergebnis<void, string>> {
  return befehlswegFuer(u).reihe(async () => {
    const z = await u.speicher.auftragsLeistungsverzeichnisse.laden(auftragsLvId);
    if (!z.ok) return { ok: false, fehler: z.fehler.code };
    const befehl = { art: 'NachtragUebernehmen', nachtragLvId, knoten } as const;
    const r = auftragsLvBefehlAusfuehren(z.wert, befehl);
    if (!r.ok) return { ok: false, fehler: r.fehler.code };
    const e = eintrag(
      u,
      z.wert.auftragsLeistungsverzeichnis.projektId,
      { art: 'auftrags-leistungsverzeichnis', id: auftragsLvId },
      befehl,
    );
    const s = await eintragSchreiben(u, e, r.wert);
    return s.ok ? { ok: true, wert: undefined } : { ok: false, fehler: s.fehler.code };
  });
}

/** Was der Testpfad der App für die Rechnungen anbietet (`window.tethysTest`). */
export interface RechnungTestpfad {
  /** Legt ein Aufmaßblatt an (Vertragsform `Aufmass`); `true`: gespeichert. */
  aufmassAnlegen(aufmass: Aufmass): Promise<boolean>;
  /** Schickt einen Befehl an ein vorhandenes Blatt; `true`: gespeichert. */
  aufmassBefehl(aufmassId: AufmassId, befehl: AufmassBefehl): Promise<boolean>;
  /** Übernimmt Nachtragsknoten ins Auftrags-LV; `true`: gespeichert. */
  nachtragUebernehmen(
    auftragsLvId: AuftragsLeistungsverzeichnisId,
    nachtragLvId: LeistungsverzeichnisId,
    knoten: readonly Knoten[],
  ): Promise<boolean>;
}

export function rechnungTestpfad(u: Umgebung): RechnungTestpfad {
  return {
    async aufmassAnlegen(aufmass) {
      return (await aufmassSchreiben(u, aufmass)).ok;
    },
    async aufmassBefehl(aufmassId, befehl) {
      return (await aufmassBefehlSchreiben(u, aufmassId, befehl)).ok;
    },
    async nachtragUebernehmen(auftragsLvId, nachtragLvId, knoten) {
      return (await nachtragSchreiben(u, auftragsLvId, nachtragLvId, knoten)).ok;
    },
  };
}
