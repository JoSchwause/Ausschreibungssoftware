// SPDX-License-Identifier: AGPL-3.0-or-later
// Auftrags-LV (Ticket 30, Punkt 12; ADR 0011): `AuftragsLeistungsverzeichnisAnlegen`. Bis zur Vergabe (Welle 4) der einzige
// Befehl am Auftrags-LV. Es gelten dieselben Baumregeln wie beim LV; die Wurzel ist die Kennung des Auftrags-LV. Das
// ChangeSet trägt Kopf, alle Knoten (kanonisch) und die vollständigen Summen (`kopf.vorher: null`).

import type { AuftragsLeistungsverzeichnis, AuftragsLvBefehlAusfuehren, AuftragsLvKopf } from '@tethys/vertrag';
import { positionNormal } from './mengenansatz';
import { nein, ok } from './fehler';
import { anlegeHinweise } from './hinweise';
import { baumfehler, inhaltKopfFehler } from './pruefung';
import { kanonisch } from './struktur';
import { LEERES_SUMMENVORHER, summenBerechnen } from './summen';

/**
 * Die Felder von `AuftragsLvKopf`. Der Typprüfer verlangt jedes (ein neues Vertragsfeld fällt hier auf, statt still zu
 * fehlen) und kein anderes.
 */
const KOPF_FELDER: { readonly [F in keyof Required<AuftragsLvKopf>]: true } = {
  id: true,
  projektId: true,
  leistungsverzeichnisId: true,
  angebotId: true,
  name: true,
  ozMaske: true,
  mwstSatz: true,
  nachlass: true,
  auftraggeber: true,
  vergabeinformationen: true,
  auftragnehmer: true,
  epaBezeichnungen: true,
};

/**
 * Der Kopf des Auftrags-LV mit genau den Feldern von `AuftragsLvKopf` (D-42): Was ein Aufrufer zur Laufzeit mehr
 * mitbringt (`nachtrag`, `vorlage` eines LV, `wurzelId`, `knoten`), landet nicht im ChangeSet. Fehlende optionale Felder
 * fehlen auch im Ergebnis.
 */
function auftragsLvKopfVon(a: AuftragsLeistungsverzeichnis): AuftragsLvKopf {
  const kopf: Partial<Record<keyof AuftragsLvKopf, unknown>> = {};
  for (const f of Object.keys(KOPF_FELDER) as (keyof AuftragsLvKopf)[]) if (a[f] !== undefined) kopf[f] = a[f];
  return kopf as AuftragsLvKopf;
}

/**
 * Führt einen Befehl am Auftrags-LV aus. `AuftragsLeistungsverzeichnisAnlegen` braucht `zustand === null`, sonst
 * `befehl-nicht-zustaendig`. Wie `LeistungsverzeichnisAnlegen`: Form der Stammdaten (`ungueltige-eingabe`), Baumregeln,
 * `''` als Einheit wird `null`, Hinweise für eine beanstandete Maske und ein negatives Netto (angenommen, U5).
 */
export const auftragsLvBefehlAusfuehren: AuftragsLvBefehlAusfuehren = (zustand, befehl) => {
  // v1.4: mechanisch angepasst, Folgeticket (Ticket 71: Handler für die neuen Befehle am Auftrags-LV)
  if (befehl.art !== 'AuftragsLeistungsverzeichnisAnlegen') {
    return nein(
      'befehl-nicht-zustaendig',
      `Befehl ${befehl.art} ist im Kern noch nicht umgesetzt; zuständig: Ticket 71.`,
    );
  }
  if (zustand !== null) {
    return nein('befehl-nicht-zustaendig', `${befehl.art}: das Auftrags-LV existiert schon.`);
  }
  const a = befehl.auftragsLeistungsverzeichnis;
  const kopfFehler = inhaltKopfFehler(a);
  if (kopfFehler) return { ok: false, fehler: kopfFehler };
  const [erster] = baumfehler(a.id, a.knoten);
  if (erster) return { ok: false, fehler: erster };
  const knoten = kanonisch(
    a.id,
    a.knoten.map((k) => (k.art === 'position' ? positionNormal(k) : k)),
  );
  const summen = summenBerechnen({ id: a.id, knoten, nachlass: a.nachlass, mwstSatz: a.mwstSatz });
  const hinweise = anlegeHinweise(a.ozMaske, summen.gesamt);
  return ok({
    art: 'auftrags-leistungsverzeichnis',
    auftragsLeistungsverzeichnisId: a.id,
    kopf: { vorher: null, nachher: auftragsLvKopfVon(a) },
    knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
    summen: {
      positionen: summen.positionen,
      gliederungen: summen.gliederungen,
      gesamt: summen.gesamt,
      vorher: LEERES_SUMMENVORHER,
    },
    ...(hinweise.length === 0 ? {} : { hinweise }),
  });
};
