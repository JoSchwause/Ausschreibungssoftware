// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlag zurücknehmen (Ticket 138; Vertrag v1.7a, D-127.3, D-127.17, D-74): `ZuschlagZuruecknehmen` führt die Vergabe aus;
// jeden anderen Befehl am Auftrags-LV reicht `auftragsLvBefehlAusfuehren` unverändert an den Kern weiter. Die App nimmt für
// Befehle am Auftrags-LV diese Funktion. Rein und deterministisch (A2): Die Verweise zählt die App aus den Listen des
// Speichers und gibt sie als dritten Parameter mit; die Umkehrung (Undo) ist die des Kerns (`auftragsLvChangeSetUmkehren`).

import { auftragsLvBefehlAusfuehren as imKern } from '@tethys/kern';
import type {
  AuftragsLvBefehlAusfuehren,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Befehlsfehler,
  Ergebnis,
  Gliederungssumme,
  Positionssumme,
  Verweisanzahl,
} from '@tethys/vertrag';
import { verweissperre } from './verweise';

/** Kennungsordnung der Summenlisten, wie sie der Kern beim Löschen schreibt. */
const nachId = <T>(liste: readonly T[], id: (x: T) => string): T[] =>
  [...liste].sort((a, b) => {
    const x = id(a);
    const y = id(b);
    return x < y ? -1 : x > y ? 1 : 0;
  });

/**
 * `ZuschlagZuruecknehmen` (D-127.3, D-74): löscht das Auftrags-LV wie `LeistungsverzeichnisLoeschen` das LV. Gesperrt, solange
 * Nachträge, Aufmaßblätter, Rechnungen oder Mängel darauf verweisen (`verweise-vorhanden` mit Art und Anzahl, in dieser
 * Reihenfolge); Angebote zählen nicht, Bauzeitenplan und Kostenkontrolle sperren nicht und werden nicht angefasst.
 *
 * ChangeSet: `kopf.vorher` der ganze Kopf (alles außer den Knoten, damit die Umkehrung ihn exakt wieder anlegt),
 * `kopf.nachher: null`, alle Knoten unter `knoten.entfernt` (wie gespeichert, Eltern vor Kindern), keine neuen Summen,
 * `summen.vorher` mit `gesamt` und den Summen aller Knoten unter `entfernt`. Angebot, LV und Nachtragsangaben bleiben; einen
 * Zuschlagsvermerk gibt es nicht (der Zuschlag ist das Bestehen des Auftrags-LV, D-21).
 */
function zuschlagZuruecknehmen(
  z: AuftragsLvZustand,
  verweise: readonly Verweisanzahl[] | undefined,
): Ergebnis<AuftragsLvChangeSet, Befehlsfehler> {
  const { knoten, ...kopf } = z.auftragsLeistungsverzeichnis;
  const sperre = verweissperre('ZuschlagZuruecknehmen', 'das Auftrags-LV', verweise, [
    'nachtrag',
    'aufmass',
    'rechnung',
    'mangel',
  ]);
  if (sperre !== null) return { ok: false, fehler: sperre };
  const positionssummen = new Map(z.summen.positionen.map((p) => [p.positionId as string, p]));
  const gliederungssummen = new Map(z.summen.gliederungen.map((g) => [g.gliederungId as string, g]));
  const positionen: Positionssumme[] = [];
  const gliederungen: Gliederungssumme[] = [];
  for (const k of knoten) {
    if (k.art === 'hinweis') continue;
    if (k.art === 'position') {
      const p = positionssummen.get(k.id);
      if (p !== undefined) positionen.push(p);
    } else {
      const g = gliederungssummen.get(k.id);
      if (g !== undefined) gliederungen.push(g);
    }
  }
  return {
    ok: true,
    wert: {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: kopf.id,
      kopf: { vorher: kopf, nachher: null },
      knoten: { hinzugefuegt: [], geaendert: [], entfernt: knoten },
      summen: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        vorher: {
          positionen: [],
          gliederungen: [],
          gesamt: z.summen.gesamt,
          entfernt: {
            positionen: nachId(positionen, (p) => p.positionId),
            gliederungen: nachId(gliederungen, (g) => g.gliederungId),
          },
        },
      },
    },
  };
}

/**
 * Führt einen Befehl am Auftrags-LV aus (Vertragstyp `AuftragsLvBefehlAusfuehren`). `ZuschlagZuruecknehmen` braucht ein
 * Auftrags-LV (`befehl-nicht-zustaendig` sonst) und die Verweise (`ungueltige-eingabe`, `feld: 'verweise'`, wenn sie fehlen).
 */
export const auftragsLvBefehlAusfuehren: AuftragsLvBefehlAusfuehren = (zustand, befehl, verweise) => {
  if (befehl.art !== 'ZuschlagZuruecknehmen') return imKern(zustand, befehl, verweise);
  if (zustand === null)
    return {
      ok: false,
      fehler: {
        code: 'befehl-nicht-zustaendig',
        meldung: `${befehl.art}: kein Auftrags-LV als Zustand übergeben.`,
      },
    };
  return zuschlagZuruecknehmen(zustand, verweise);
};
