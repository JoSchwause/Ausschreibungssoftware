// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86 (A1, D-35): Nachträge in der App. Ein Nachtrag ist ein gewöhnliches Ausschreibungs-LV mit Nachtragsangaben;
// hier stehen nur reine Funktionen für die Oberfläche: Nummernvergabe, die Befehle zum Anlegen und die Vorschau der
// Beauftragung. Fachliches rechnen Kern (`auftragsLvBefehlAusfuehren`) und `abrechnung` (`nachtragUebernehmen`); geschrieben
// wird über den Befehlsweg (`speichern.ts`, A5).

import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvKopf,
  IdQuelle,
  LeistungsverzeichnisAnlegen,
  LeistungsverzeichnisId,
  LvUebersicht,
  NachtragsangabenSetzen,
} from '@tethys/vertrag';
import { texte } from './texte';

const NUMMER = /^N(\d+)$/i;

/**
 * Die nächste Nachtragsnummer eines Auftrags-LV: die höchste vergebene der Form `N<Ziffern>` plus 1, mindestens zweistellig
 * (`N01`, `N02`, …, `N100`). Frei vergebene Nummern anderer Form zählen nicht (D-86.1).
 */
export function naechsteNachtragsnummer(
  lvs: readonly LvUebersicht[],
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): string {
  let hoechste = 0;
  for (const l of lvs) {
    if (l.nachtrag?.auftragsLvId !== auftragsLvId) continue;
    const m = NUMMER.exec(l.nachtrag.nummer.trim());
    if (m?.[1] !== undefined) hoechste = Math.max(hoechste, Number(m[1]));
  }
  return `N${String(hoechste + 1).padStart(2, '0')}`;
}

export interface Nachtragsanlage {
  readonly nummer: string;
  readonly lvId: LeistungsverzeichnisId;
  /** Eine Befehlsfolge am neuen LV, ein Undo-Schritt: erst anlegen, dann die Nachtragsangaben setzen (D-35, Vertrag). */
  readonly befehle: readonly [LeistungsverzeichnisAnlegen, NachtragsangabenSetzen];
}

/**
 * „Nachtrag anlegen“ auf der Seite eines Auftrags-LV: ein leeres Ausschreibungs-LV mit OZ-Maske und MwSt-Satz des Auftrags-LV,
 * ohne Nachlass, Name „Nachtrag <Nummer> – <Bezeichnung>“, dazu die Nachtragsangaben mit der nächsten freien Nummer und dem
 * Status `angemeldet`.
 */
export function nachtragAnlegenPlanen(
  auftrag: Pick<AuftragsLvKopf, 'id' | 'projektId' | 'ozMaske' | 'mwstSatz'>,
  lvs: readonly LvUebersicht[],
  bezeichnung: string,
  ids: Pick<IdQuelle, 'leistungsverzeichnis'>,
): Nachtragsanlage {
  const nummer = naechsteNachtragsnummer(lvs, auftrag.id);
  const lvId = ids.leistungsverzeichnis();
  const anlegen: LeistungsverzeichnisAnlegen = {
    art: 'LeistungsverzeichnisAnlegen',
    id: lvId,
    projektId: auftrag.projektId,
    inhalt: {
      name: texte.lvName(nummer, bezeichnung.trim()),
      ozMaske: auftrag.ozMaske,
      mwstSatz: auftrag.mwstSatz,
      nachlass: null,
      wurzelId: lvId,
      knoten: [],
    },
  };
  const setzen: NachtragsangabenSetzen = {
    art: 'NachtragsangabenSetzen',
    nachtrag: { auftragsLvId: auftrag.id, nummer, status: 'angemeldet' },
  };
  return { nummer, lvId, befehle: [anlegen, setzen] };
}
