// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebot bearbeiten (Ticket 149; E8, B-15): Preise je Position und Nachlass als Texte der Felder (de-DE, N4), daraus die
// Befehle `AngebotspositionSetzen`, `AngebotsNachlassSetzen` und `AngebotsNachlassEntfernen`, nur für das, was sich ändert.
// Rein und ohne React. Eine unlesbare Eingabe ist eine Meldung am Feld und wird nicht gesendet (U5: sie sperrt die übrigen
// nicht). Einen Eintrag ganz zu entfernen gibt es nicht; die Berichtigung ist „nicht angeboten“ (D-138.6).

import { formatiereBetragDe, formatiereEinheitspreisDe, formatiereProzentDe, parseDe } from '@tethys/dezimal';
import type {
  Angebot,
  AngebotBefehl,
  Angebotsposition,
  Einheitspreis,
  Knoten,
  LvZustand,
  Nachlass,
  Position,
  PositionId,
} from '@tethys/vertrag';
import { kinderJeEltern } from '../lv/ansicht';
import { texte } from './texte';

export type Nachlassart = 'kein' | 'prozent' | 'betrag';

export interface Preiszeile {
  readonly positionId: PositionId;
  /** EP oder, an einer Zuschlagsposition, der Satz in % (Text der Eingabe). */
  readonly text: string;
  readonly nichtAngeboten: boolean;
}

export interface Angebotsentwurf {
  readonly zeilen: ReadonlyMap<PositionId, Preiszeile>;
  readonly nachlassart: Nachlassart;
  readonly nachlass: string;
}

/** Die Positionen des LV in der Reihenfolge des Baums (Tiefe zuerst). */
export function positionenInReihenfolge(lv: LvZustand): Position[] {
  const kinder = kinderJeEltern(lv.leistungsverzeichnis.knoten);
  const aus: Position[] = [];
  const besuche = (id: string): void => {
    for (const k of kinder.get(id) ?? ([] as readonly Knoten[])) {
      if (k.art === 'position') aus.push(k);
      besuche(k.id);
    }
  };
  besuche(lv.leistungsverzeichnis.id);
  return aus;
}

const istZuschlag = (p: Position): boolean => p.zuschlag !== null;

function zeileAus(p: Position, e: Angebotsposition | undefined): Preiszeile {
  if (e === undefined) return { positionId: p.id, text: '', nichtAngeboten: false };
  if (e.status === 'nicht-angeboten') return { positionId: p.id, text: '', nichtAngeboten: true };
  const text =
    istZuschlag(p) && e.zuschlagssatz !== undefined
      ? formatiereProzentDe(e.zuschlagssatz)
      : formatiereEinheitspreisDe(e.einheitspreis);
  return { positionId: p.id, text, nichtAngeboten: false };
}

/** Der Entwurf aus dem gespeicherten Angebot. */
export function angebotsentwurf(lv: LvZustand, angebot: Angebot): Angebotsentwurf {
  const eintraege = new Map(angebot.positionen.map((e) => [e.positionId, e]));
  const zeilen = new Map<PositionId, Preiszeile>();
  for (const p of positionenInReihenfolge(lv)) zeilen.set(p.id, zeileAus(p, eintraege.get(p.id)));
  const n = angebot.nachlass;
  return {
    zeilen,
    nachlassart: n === null ? 'kein' : n.art,
    nachlass:
      n === null ? '' : n.art === 'prozent' ? formatiereProzentDe(n.wert) : formatiereBetragDe(n.wert),
  };
}

export interface Entwurfsergebnis {
  readonly befehle: readonly AngebotBefehl[];
  /** Meldungen je Feld: Kennung der Position oder `nachlass`. Solange eine besteht, sendet der Dialog nichts. */
  readonly fehler: ReadonlyMap<string, string>;
}

function lesefehler(code: string): string {
  return code === 'zu-viele-nachkommastellen' ? texte.bearbeiten.zuVieleStellen : texte.bearbeiten.ungueltig;
}

/** Die Befehle, die das Angebot auf den Stand des Entwurfs bringen. */
export function entwurfsbefehle(lv: LvZustand, angebot: Angebot, entwurf: Angebotsentwurf): Entwurfsergebnis {
  const t = texte.bearbeiten;
  const befehle: AngebotBefehl[] = [];
  const fehler = new Map<string, string>();
  const eintraege = new Map(angebot.positionen.map((e) => [e.positionId, e]));
  for (const p of positionenInReihenfolge(lv)) {
    const z = entwurf.zeilen.get(p.id);
    if (z === undefined) continue;
    const alt = eintraege.get(p.id);
    const vorher = zeileAus(p, alt);
    if (z.nichtAngeboten === vorher.nichtAngeboten && z.text.trim() === vorher.text) continue;
    if (z.nichtAngeboten) {
      befehle.push({
        art: 'AngebotspositionSetzen',
        position: { positionId: p.id, status: 'nicht-angeboten' },
      });
      continue;
    }
    if (z.text.trim() === '') {
      fehler.set(p.id, t.preisFehlt);
      continue;
    }
    if (istZuschlag(p)) {
      const satz = parseDe('prozent', z.text);
      if (!satz.ok) {
        fehler.set(p.id, lesefehler(satz.fehler.code));
        continue;
      }
      // Der EP einer Zuschlagsposition ist Platzhalter (Vertrag `Angebotsposition`); gerechnet wird nur der Satz.
      const ep = alt?.status === 'angeboten' ? alt.einheitspreis : ('0.000' as Einheitspreis);
      befehle.push({
        art: 'AngebotspositionSetzen',
        position: {
          positionId: p.id,
          status: 'angeboten',
          einheitspreis: ep,
          epa: null,
          zuschlagssatz: satz.wert,
        },
      });
      continue;
    }
    const ep = parseDe('einheitspreis', z.text);
    if (!ep.ok) {
      fehler.set(p.id, lesefehler(ep.fehler.code));
      continue;
    }
    // Ein neuer EP passt nicht mehr zu den Anteilen der Datei: sie entfallen (wie EP von Hand im LV).
    befehle.push({
      art: 'AngebotspositionSetzen',
      position: { positionId: p.id, status: 'angeboten', einheitspreis: ep.wert, epa: null },
    });
  }
  const nachlass = nachlassAusEntwurf(entwurf);
  if (nachlass === 'fehler') fehler.set('nachlass', t.ungueltig);
  else if (nachlass === 'leer') fehler.set('nachlass', t.nachlassFehlt);
  else if (JSON.stringify(nachlass) !== JSON.stringify(angebot.nachlass))
    befehle.push(
      nachlass === null ? { art: 'AngebotsNachlassEntfernen' } : { art: 'AngebotsNachlassSetzen', nachlass },
    );
  return { befehle, fehler };
}

function nachlassAusEntwurf(e: Angebotsentwurf): Nachlass | null | 'fehler' | 'leer' {
  if (e.nachlassart === 'kein') return null;
  if (e.nachlass.trim() === '') return 'leer';
  if (e.nachlassart === 'prozent') {
    const p = parseDe('prozent', e.nachlass);
    return p.ok ? { art: 'prozent', wert: p.wert } : 'fehler';
  }
  const b = parseDe('betrag', e.nachlass);
  return b.ok ? { art: 'betrag', wert: b.wert } : 'fehler';
}
