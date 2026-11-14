// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Stände bearbeiten (Ticket 150; E8, B-16, D-127.1, D-82 S6). Umbenennen und Löschen laufen über den Ausführer des Kerns
// (`lvStandBefehlAusfuehren`, Zustand: der ganze Stand aus `lvStaende.laden`) und den Befehlsweg der App: ein Eintrag im
// Befehlsprotokoll mit dem LV des Stands als Aggregat, ein Undo-Schritt. Löschen trägt den Inhalt des Stands im ChangeSet;
// Rückgängig legt genau diesen Stand wieder ab (Q5).
//
// „Als neues LV übernehmen“: Ein LV aus einem Stand bringt die Preisspiegel-Einstellungen nicht von selbst mit; trägt der Stand
// welche, folgt `PreisspiegelEinstellungenSetzen` in derselben Befehlsfolge (ein Undo-Schritt).

import { lvStandBefehlAusfuehren } from '@tethys/kern';
import type { IdQuelle, LvBefehl, LvStand, LvStandBefehl } from '@tethys/vertrag';
import { befehlswegFuer, eintrag, speichern, type Ausgang, type Umgebung } from '../lv/befehlsweg';
import { standAlsLvBefehl } from '../lv/stand';

/** Benennt einen LV-Stand um oder löscht ihn; bei Erfolg ein Schritt im Rückgängig des Projekts. */
export function lvStandBefehlAnwenden(u: Umgebung, befehl: LvStandBefehl): Promise<Ausgang<null>> {
  const weg = befehlswegFuer(u);
  return weg.reihe(async () => {
    const s = await u.speicher.lvStaende.laden(befehl.lvStandId);
    if (!s.ok) return { ok: false, abweisung: { art: 'speicher', fehler: s.fehler } };
    const r = lvStandBefehlAusfuehren(s.wert, befehl);
    if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
    const lv = s.wert.zustand.leistungsverzeichnis;
    const e = eintrag(
      u,
      lv.projektId,
      { art: 'leistungsverzeichnis', id: s.wert.leistungsverzeichnisId },
      befehl,
    );
    const a = await speichern(u, e, r.wert, () => null);
    if (!a.ok) return a;
    weg.historie.aufnehmen([a.teil]);
    return { ok: true, zustand: null, hinweise: a.hinweise };
  });
}

/** Die Befehlsfolge „Als neues LV übernehmen“: das neue LV und, wenn der Stand welche trägt, seine Preisspiegel-Einstellungen. */
export function standAlsNeuesLv(stand: LvStand, ids: IdQuelle): LvBefehl[] {
  const anlegen = standAlsLvBefehl(stand, ids);
  const preisspiegel = stand.zustand.leistungsverzeichnis.preisspiegel;
  return preisspiegel === undefined
    ? [anlegen]
    : [anlegen, { art: 'PreisspiegelEinstellungenSetzen', einstellungen: preisspiegel }];
}
