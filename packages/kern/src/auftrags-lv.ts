// SPDX-License-Identifier: AGPL-3.0-or-later
// Auftrags-LV (Ticket 30, Punkt 12; ADR 0011; Vertrag v1.4, Ticket 71): die drei Befehle am Auftrags-LV (D-36 (4)).
//  - `AuftragsLeistungsverzeichnisAnlegen` (Zuschlag, D-21): dieselben Baumregeln wie beim LV, die Wurzel ist die Kennung
//    des Auftrags-LV. Das ChangeSet trägt Kopf (nur Felder von `AuftragsLvKopf`, D-42), alle Knoten (kanonisch) und die
//    vollständigen Summen (`kopf.vorher: null`).
//  - `NachtragUebernehmen` (D-35, D-70.6): ein Teilbaum ans Ende der obersten Ebene, wie mitgebracht; Summen nur für den
//    neuen Teilbaum und die Gesamtsumme (A6).
//  - `KostengruppeSetzen` (D-70.1): dieselbe Handlung wie im LV (`kostengruppeWechsel`), Summen unverändert.
//  - `BauteileZuordnen` (v1.6, Ticket 105, D-52): dieselbe Handlung wie im LV (`bauteileWechsel`), Summen unverändert.
// Anwenden und Umkehren der ChangeSets: `changeset.ts` (`auftragsLvChangeSetAnwenden`, `auftragsLvChangeSetUmkehren`).

import type {
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisAnlegen,
  BauteileZuordnen,
  AuftragsLvBefehlAusfuehren,
  AuftragsLvChangeSet,
  AuftragsLvKopf,
  AuftragsLvZustand,
  Befehlsfehler,
  Ergebnis,
  Knoten,
  KostengruppeSetzen,
  NachtragUebernehmen,
} from '@tethys/vertrag';
import { bauteileWechsel } from './bauteile';
import { baueAuftragsChangeSet } from './changeset';
import { listeFehler } from './einfuegen-befehle';
import { nein, ok } from './fehler';
import { anlegeHinweise } from './hinweise';
import { kostengruppeWechsel } from './kostengruppe';
import { positionNormal } from './mengenansatz';
import { baumfehler, inhaltKopfFehler } from './pruefung';
import { MAX_GLIEDERUNGSEBENEN, obersteEbeneFehler } from './regeln';
import { baueIndex, ebenenHoehe, indexVon, kanonisch } from './struktur';
import { LEERES_SUMMENVORHER, summenAenderung, summenBerechnen } from './summen';

type Antwort = Ergebnis<AuftragsLvChangeSet, Befehlsfehler>;

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
  for (const f of Object.keys(KOPF_FELDER) as (keyof AuftragsLvKopf)[])
    if (a[f] !== undefined) kopf[f] = a[f];
  return kopf as AuftragsLvKopf;
}

/**
 * `AuftragsLeistungsverzeichnisAnlegen`: wie `LeistungsverzeichnisAnlegen` Form der Stammdaten (`ungueltige-eingabe`),
 * Baumregeln, Normalform der Positionen (`''` als Einheit wird `null`, `''` als Textquelle fällt weg), Hinweise für eine
 * beanstandete Maske und ein negatives Netto (angenommen, U5).
 */
function anlegen(b: AuftragsLeistungsverzeichnisAnlegen): Antwort {
  const a = b.auftragsLeistungsverzeichnis;
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
}

const KEIN_PAPIERKORB: ReadonlyMap<string, Knoten> = new Map();

/**
 * `NachtragUebernehmen` (D-35, Lesart D-70.6 am Vertragstyp): Der Kern übernimmt die Knoten, wie sie kommen (Lage, OZ, Preise
 * setzt `nachtragUebernehmen` in `abrechnung`), und prüft:
 *  - die Liste wie bei `KnotenEinfuegen` (`listeFehler`): nicht leer, Kennungen neu auch gegen den vorhandenen Baum
 *    (`id-vergeben`; das sperrt eine zweite Übernahme), Eltern vor Kindern, dichte `reihenfolge` im Teilbaum, Kinder nur
 *    unter Gliederungen, Form der Positionen (samt Kostengruppe und Textquelle);
 *  - genau eine Wurzel (`ungueltige-eingabe`), auf der obersten Ebene (`elternId` = Kennung des Auftrags-LV; ein Knoten
 *    des Baums als Elternknoten: `ungueltige-eingabe`, ein unbekannter: `eltern-unbekannt`), eine Gliederung
 *    (`knotenart-unzulaessig`, D-71.6), ans Ende (`reihenfolge` = Zahl der Knoten dort, sonst `ungueltige-eingabe`);
 *  - F1 an der obersten Ebene (`obersteEbeneFehler`: kein Los neben Titeln und umgekehrt, unter einer Los-Stufe nur ein
 *    Los; `knotenart-unzulaessig`) und höchstens 5 Gliederungsebenen samt der neuen (`ebene-ueberschritten`).
 * Die OZ prüft er nicht gegen die Maske (U5, Befund der LV-Prüfung). ChangeSet: `knoten.hinzugefuegt` (die Liste, Positionen
 * in Normalform), Summen des neuen Teilbaums und die Gesamtsummen samt `summen.vorher` (A6).
 */
function nachtragUebernehmen(z: AuftragsLvZustand, b: NachtragUebernehmen): Antwort {
  const a = z.auftragsLeistungsverzeichnis;
  const idx = indexVon(a.id, a.knoten);
  const geprueft = listeFehler(a.id, idx, KEIN_PAPIERKORB, b.knoten);
  if (!geprueft.ok) return geprueft;
  const [wurzel, zweite] = geprueft.wert;
  if (wurzel === undefined)
    return nein('ungueltige-eingabe', 'Die Liste der Knoten ist leer.', undefined, 'knoten');
  if (zweite !== undefined)
    return nein(
      'ungueltige-eingabe',
      'Ein Nachtrag ist genau eine Gliederung samt Teilbaum (eine Wurzel).',
      zweite.id,
      'knoten',
    );
  if (wurzel.elternId !== a.id) {
    return idx.byId.has(wurzel.elternId)
      ? nein(
          'ungueltige-eingabe',
          'Der Nachtrag kommt auf die oberste Ebene des Auftrags-LV.',
          wurzel.id,
          'elternId',
        )
      : nein('eltern-unbekannt', `Elternknoten fehlt: ${wurzel.elternId}`, wurzel.id);
  }
  if (wurzel.art !== 'los' && wurzel.art !== 'titel')
    return nein(
      'knotenart-unzulaessig',
      `Die Wurzel eines Nachtrags ist eine Gliederung (Los oder Titel), nicht „${wurzel.art}“.`,
      wurzel.id,
    );
  const oben = idx.kinder.get(a.id) ?? [];
  if (wurzel.reihenfolge !== oben.length)
    return nein(
      'ungueltige-eingabe',
      `Der Nachtrag kommt ans Ende der obersten Ebene (reihenfolge ${String(oben.length)}).`,
      wurzel.id,
      'reihenfolge',
    );
  const f1 = obersteEbeneFehler(
    wurzel.art,
    oben.map((k) => k.art),
    a.ozMaske.losStufe === true,
  );
  if (f1 !== null) return nein('knotenart-unzulaessig', f1, wurzel.id);
  if (ebenenHoehe(baueIndex(a.id, b.knoten), wurzel) > MAX_GLIEDERUNGSEBENEN)
    return nein(
      'ebene-ueberschritten',
      `Mehr als ${String(MAX_GLIEDERUNGSEBENEN)} Gliederungsebenen.`,
      wurzel.id,
    );
  const hinzugefuegt = b.knoten.map((k) => (k.art === 'position' ? positionNormal(k) : k));
  const summen = summenAenderung({ summen: z.summen, leistungsverzeichnis: a }, idx, {
    knoten: { hinzugefuegt },
  });
  return ok(baueAuftragsChangeSet(z, { hinzugefuegt, summen }));
}

/** `KostengruppeSetzen` im Auftrags-LV: dieselbe Prüfung wie im LV (`kostengruppeWechsel`), Summen unverändert. */
function kostengruppeSetzen(z: AuftragsLvZustand, b: KostengruppeSetzen): Antwort {
  const a = z.auftragsLeistungsverzeichnis;
  const idx = indexVon(a.id, a.knoten);
  const w = kostengruppeWechsel((i) => idx.byId.get(i), b);
  if (!w.ok) return w;
  return ok(baueAuftragsChangeSet(z, w.wert === null ? {} : { geaendert: [w.wert] }));
}

/** `BauteileZuordnen` im Auftrags-LV: dieselbe Prüfung wie im LV (`bauteileWechsel`), Summen unverändert. */
function bauteileZuordnen(z: AuftragsLvZustand, b: BauteileZuordnen): Antwort {
  const a = z.auftragsLeistungsverzeichnis;
  const idx = indexVon(a.id, a.knoten);
  const w = bauteileWechsel((i) => idx.byId.get(i), b);
  if (!w.ok) return w;
  return ok(baueAuftragsChangeSet(z, w.wert === null ? {} : { geaendert: [w.wert] }));
}

/**
 * Führt einen Befehl am Auftrags-LV aus: `(Zustand, Befehl) → ChangeSet` oder Fehlerwert (A5), rein und deterministisch
 * (A2). `AuftragsLeistungsverzeichnisAnlegen` braucht `zustand === null`, die anderen einen Zustand; sonst
 * `befehl-nicht-zustaendig` („Befehl passt nicht zum übergebenen Zustand“), ebenso für eine unbekannte Befehlsart (Protokoll).
 */
export const auftragsLvBefehlAusfuehren: AuftragsLvBefehlAusfuehren = (zustand, befehl) => {
  const art: string = befehl.art;
  if (befehl.art === 'AuftragsLeistungsverzeichnisAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', `${befehl.art}: das Auftrags-LV existiert schon.`);
    return anlegen(befehl);
  }
  if (zustand === null)
    return nein('befehl-nicht-zustaendig', `${art}: kein Auftrags-LV als Zustand übergeben.`);
  switch (befehl.art) {
    case 'NachtragUebernehmen':
      return nachtragUebernehmen(zustand, befehl);
    case 'KostengruppeSetzen':
      return kostengruppeSetzen(zustand, befehl);
    case 'BauteileZuordnen':
      return bauteileZuordnen(zustand, befehl);
    default:
      return nein('befehl-nicht-zustaendig', `Befehl ${art} gehört nicht zum Auftrags-LV.`);
  }
};
