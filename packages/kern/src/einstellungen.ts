// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstellungen (Vertrag v1.7a, Ticket 137; E10, E15, D-73, D-127.8): Befehle am globalen Aggregat `Einstellungen` (Büro,
// eigene Druckprofile, Kostengruppenbezeichnungen). `(Einstellungen, Befehl) → Ergebnis<EinstellungenChangeSet, …>`: rein
// (A2), prüft nur die Form (`ungueltige-eingabe` mit `feld`). Das ChangeSet trägt die ganzen Einstellungen vorher und
// nachher; die Umkehrung ist der Tausch (`einstellungenChangeSetUmkehren`, für das Sitzungs-Undo der App, Review D-82 M1).
// Protokoll und Undo-Historie der Einstellungen führen `speicher` und die App, nicht der Kern.

import { KOSTENGRUPPENNUMMER_MUSTER } from '@tethys/vertrag';
import type {
  Druckprofil,
  Einstellungen,
  EinstellungenBefehlAusfuehren,
  EinstellungenChangeSet,
  Kostengruppenbezeichnung,
  LangtextUmfang,
} from '@tethys/vertrag';
import { bueroFehler, bueroNormal } from './angaben';
import { nein, ok } from './fehler';
import { gleicherWert } from './merkmal-befehle';
import type { Formfehler } from './positionsfelder';

const istObjekt = (w: unknown): w is Record<string, unknown> =>
  typeof w === 'object' && w !== null && !Array.isArray(w);

const istName = (w: unknown): w is string => typeof w === 'string' && w.trim() !== '';

const SCHALTER = ['mitPreisen', 'titelsummen', 'schlussblock', 'deckblatt'] as const;
const SEITENRAENDER: ReadonlySet<unknown> = new Set<Druckprofil['seitenrand']>(['normal', 'eng']);

/**
 * Form eines Druckprofils (Vertrag `Druckprofil`): Name nicht leer (Leerraum zählt als leer; er ist die Kennung), die
 * Schalter Wahrheitswerte, der Langtext `voll`, `kein` oder `zeilen` mit `anzahl` als ganzer Zahl ab 1, Kopf- und Fußzeile
 * Text oder `null`, Seitenrand `normal` oder `eng`. Ob der Name einem mitgelieferten Profil gleicht, weiß der Kern nicht.
 */
function druckprofilFehler(wert: unknown, pfad = 'druckprofil'): Formfehler | null {
  if (!istObjekt(wert)) return { feld: pfad, meldung: 'Das Druckprofil ist ein Objekt.' };
  if (!istName(wert['name']))
    return { feld: `${pfad}.name`, meldung: 'Ein Druckprofil braucht einen Namen.' };
  for (const f of SCHALTER)
    if (typeof wert[f] !== 'boolean') return { feld: `${pfad}.${f}`, meldung: `${f} ist true oder false.` };
  const langtext = wert['langtext'];
  const art = istObjekt(langtext) ? langtext['art'] : undefined;
  if (art !== 'voll' && art !== 'kein' && art !== 'zeilen')
    return { feld: `${pfad}.langtext`, meldung: 'Der Langtext ist „voll“, „kein“ oder „zeilen“.' };
  if (art === 'zeilen') {
    const anzahl = (langtext as Record<string, unknown>)['anzahl'];
    if (typeof anzahl !== 'number' || !Number.isSafeInteger(anzahl) || anzahl < 1)
      return { feld: `${pfad}.langtext.anzahl`, meldung: 'Die Zahl der Zeilen ist eine ganze Zahl ab 1.' };
  }
  for (const f of ['kopfzeile', 'fusszeile'] as const) {
    const v = wert[f];
    if (v !== null && typeof v !== 'string')
      return { feld: `${pfad}.${f}`, meldung: `${f} muss ein Text oder null sein.` };
  }
  if (!SEITENRAENDER.has(wert['seitenrand']))
    return { feld: `${pfad}.seitenrand`, meldung: 'Der Seitenrand ist „normal“ oder „eng“.' };
  return null;
}

/** Genau die Felder des Vertrags (was ein Aufrufer mehr mitbringt, landet nicht in den Einstellungen). */
function druckprofilNormal(p: Druckprofil): Druckprofil {
  const langtext: LangtextUmfang =
    p.langtext.art === 'zeilen' ? { art: 'zeilen', anzahl: p.langtext.anzahl } : { art: p.langtext.art };
  return {
    name: p.name,
    mitPreisen: p.mitPreisen,
    langtext,
    titelsummen: p.titelsummen,
    schlussblock: p.schlussblock,
    deckblatt: p.deckblatt,
    kopfzeile: p.kopfzeile,
    fusszeile: p.fusszeile,
    seitenrand: p.seitenrand,
  };
}

/**
 * Form der Kostengruppenbezeichnungen: eine Liste von Objekten, Nummer nach `KOSTENGRUPPENNUMMER_MUSTER` und höchstens
 * einmal, Bezeichnung nicht leer (Leerraum zählt als leer). Felder ohne Zeilennummer.
 */
function bezeichnungenFehler(wert: unknown, pfad = 'bezeichnungen'): Formfehler | null {
  if (!Array.isArray(wert)) return { feld: pfad, meldung: 'Die Kostengruppenbezeichnungen sind eine Liste.' };
  const gesehen = new Set<string>();
  for (const roh of wert as readonly unknown[]) {
    if (!istObjekt(roh)) return { feld: pfad, meldung: 'Eine Kostengruppenbezeichnung ist ein Objekt.' };
    const nummer = roh['nummer'];
    if (typeof nummer !== 'string' || !KOSTENGRUPPENNUMMER_MUSTER.test(nummer))
      return {
        feld: `${pfad}.nummer`,
        meldung: 'Die Kostengruppe ist eine dreistellige Nummer von 100 bis 999.',
      };
    if (gesehen.has(nummer))
      return { feld: `${pfad}.nummer`, meldung: `Die Kostengruppe ${nummer} ist doppelt bezeichnet.` };
    gesehen.add(nummer);
    if (!istName(roh['bezeichnung']))
      return { feld: `${pfad}.bezeichnung`, meldung: `Die Kostengruppe ${nummer} hat keine Bezeichnung.` };
  }
  return null;
}

/** Nach Nummer aufsteigend (drei Ziffern: die Textordnung ist die Zahlordnung), genau die Felder des Vertrags. */
const bezeichnungenNormal = (liste: readonly Kostengruppenbezeichnung[]): Kostengruppenbezeichnung[] =>
  liste
    .map((b) => ({ nummer: b.nummer, bezeichnung: b.bezeichnung }))
    .sort((a, b) => (a.nummer < b.nummer ? -1 : a.nummer > b.nummer ? 1 : 0));

const changeSet = (vorher: Einstellungen, nachher: Einstellungen): EinstellungenChangeSet => ({
  art: 'einstellungen',
  einstellungen: { vorher, nachher: gleicherWert(vorher, nachher) ? vorher : nachher },
});

const formfehler = (f: Formfehler): ReturnType<EinstellungenBefehlAusfuehren> =>
  nein('ungueltige-eingabe', f.meldung, undefined, f.feld);

/**
 * Führt einen Einstellungsbefehl aus (D-127.8). Derselbe Wert ist keine Änderung (`nachher` ist dann der Zustand selbst);
 * eine unbekannte Befehlsart ist `befehl-nicht-zustaendig`.
 *
 * - `BueroSetzen`: das Büro als ganzer Wert in Normalform (`''` → `null`); `null` entfernt es. Leerer Name: `buero.name`.
 * - `DruckprofilSetzen`: ersetzt das Profil gleichen Namens an seiner Stelle, sonst ans Ende.
 * - `DruckprofilEntfernen`: gibt es kein Profil dieses Namens, `ungueltige-eingabe` mit `feld: 'name'`.
 * - `KostengruppenbezeichnungenSetzen`: die ganze Liste, nach Nummer geordnet.
 */
export const einstellungenBefehlAusfuehren: EinstellungenBefehlAusfuehren = (zustand, befehl) => {
  const art: string = befehl.art;
  switch (befehl.art) {
    case 'BueroSetzen': {
      const f = bueroFehler(befehl.buero, 'buero');
      if (f !== null) return formfehler(f);
      return ok(
        changeSet(zustand, { ...zustand, buero: befehl.buero === null ? null : bueroNormal(befehl.buero) }),
      );
    }
    case 'DruckprofilSetzen': {
      const f = druckprofilFehler(befehl.druckprofil);
      if (f !== null) return formfehler(f);
      const neu = druckprofilNormal(befehl.druckprofil);
      const i = zustand.druckprofile.findIndex((p) => p.name === neu.name);
      const druckprofile =
        i < 0 ? [...zustand.druckprofile, neu] : zustand.druckprofile.map((p, j) => (j === i ? neu : p));
      return ok(changeSet(zustand, { ...zustand, druckprofile }));
    }
    case 'DruckprofilEntfernen': {
      if (!zustand.druckprofile.some((p) => p.name === befehl.name))
        return nein(
          'ungueltige-eingabe',
          `Kein eigenes Druckprofil mit dem Namen „${befehl.name}“.`,
          undefined,
          'name',
        );
      return ok(
        changeSet(zustand, {
          ...zustand,
          druckprofile: zustand.druckprofile.filter((p) => p.name !== befehl.name),
        }),
      );
    }
    case 'KostengruppenbezeichnungenSetzen': {
      const f = bezeichnungenFehler(befehl.bezeichnungen);
      if (f !== null) return formfehler(f);
      return ok(
        changeSet(zustand, {
          ...zustand,
          kostengruppenbezeichnungen: bezeichnungenNormal(befehl.bezeichnungen),
        }),
      );
    }
    default:
      return nein('befehl-nicht-zustaendig', `Befehl ${art} gehört nicht zu den Einstellungen.`);
  }
};

/** Die Umkehrung (Sitzungs-Undo der App, D-82 M1): vorher und nachher getauscht. */
export const einstellungenChangeSetUmkehren = (cs: EinstellungenChangeSet): EinstellungenChangeSet => ({
  art: cs.art,
  einstellungen: { vorher: cs.einstellungen.nachher, nachher: cs.einstellungen.vorher },
});

/**
 * Wendet ein Einstellungs-ChangeSet an: der neue Stand ist `nachher`. Passt `vorher` nicht zum Zustand, ist das ein
 * Programmfehler und die Funktion wirft (im Speicher ist derselbe Fall der Fehlerwert `konflikt` von
 * `EinstellungenRepository.anwenden`).
 */
export function einstellungenChangeSetAnwenden(
  zustand: Einstellungen,
  cs: EinstellungenChangeSet,
): Einstellungen {
  if (!gleicherWert(zustand, cs.einstellungen.vorher))
    throw new Error('Einstellungs-ChangeSet passt nicht zum Zustand.');
  return cs.einstellungen.nachher;
}
