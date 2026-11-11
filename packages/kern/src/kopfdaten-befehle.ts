// SPDX-License-Identifier: AGPL-3.0-or-later
// Kopfdaten-Befehle (Ticket 41, D-07; Vertrag v1.2): AuftraggeberSetzen, VergabeinformationenSetzen,
// LeitbeschreibungSetzen; seit Vertrag v1.4 (Ticket 71, D-35, D-40) NachtragsangabenSetzen und VorlageSetzen. Wie die Feldbefehle aus Ticket 27: `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`,
// rein (A2). Jeder Befehl setzt den ganzen Wert; `null` entfernt das Feld. Das ChangeSet nennt nur den Kopf bzw. die eine
// Position und keine Summen (A6): keines dieser Felder geht in eine Summe ein, auch nicht die Mengen der
// Unterbeschreibungen. Derselbe Wert liefert ein leeres ChangeSet. Abgewiesen wird nur eine falsche Form
// (`ungueltige-eingabe`); Inhalte prüft der Kern nicht (U5), fehlende Pflichtangaben einer Vergabe sind kein Fehler.
// Normalisierungen: `''` als Einheit einer Unterbeschreibung wird `null` (Vertrag v1.2, D-06, wie Ticket 30); von den
// Nachtragsangaben landen genau ihre drei Felder im Kopf; `vorlage: false` entfernt das Feld (nie `false` im Zustand).

import { alsMenge } from '@tethys/dezimal';
import type {
  AuftraggeberSetzen,
  Befehlsfehler,
  Ergebnis,
  Leitbeschreibung,
  LeitbeschreibungSetzen,
  LvChangeSet,
  LvKopf,
  LvZustand,
  Nachtragsangaben,
  NachtragsangabenSetzen,
  Nachtragsstatus,
  Position,
  VergabeinformationenSetzen,
  VorlageSetzen,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { einheitNormal } from './einheit';
import { nein, ok } from './fehler';
import { gleicherWert } from './merkmal-befehle';
import { ohneKnoten } from './struktur';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Formfehler: das Feld (Pfad wie `auftraggeber.plz`) und eine Meldung. */
interface Formfehler {
  readonly feld: string;
  readonly meldung: string;
}

const istObjekt = (w: unknown): w is Record<string, unknown> =>
  typeof w === 'object' && w !== null && !Array.isArray(w);

/** Ein Objekt mit genau diesen Textfeldern (je Text oder `null`); fehlende Felder sind ein Formfehler. */
function textfelderFehler(
  wert: Record<string, unknown>,
  felder: readonly string[],
  pfad: string,
): Formfehler | null {
  for (const f of felder) {
    const v = wert[f];
    if (v !== null && typeof v !== 'string')
      return { feld: `${pfad}.${f}`, meldung: `${f} muss ein Text oder null sein.` };
  }
  return null;
}

const AUFTRAGGEBER_FELDER = ['name', 'strasse', 'plz', 'ort', 'vergabenummer'] as const;

const VERGABE_TEXTFELDER = [
  'eroeffnungsdatum',
  'eroeffnungszeit',
  'abgabeort',
  'ausfuehrungsbeginn',
  'ausfuehrungsende',
  'auftragsnummer',
  'auftragsdatum',
  'abnahmeart',
] as const;

function auftraggeberFehler(wert: unknown): Formfehler | null {
  if (!istObjekt(wert))
    return { feld: 'auftraggeber', meldung: 'Der Auftraggeber muss ein Objekt oder null sein.' };
  return textfelderFehler(wert, AUFTRAGGEBER_FELDER, 'auftraggeber');
}

function vergabeinformationenFehler(wert: unknown): Formfehler | null {
  const pfad = 'vergabeinformationen';
  if (!istObjekt(wert))
    return { feld: pfad, meldung: 'Die Vergabeinformationen müssen ein Objekt oder null sein.' };
  const t = textfelderFehler(wert, VERGABE_TEXTFELDER, pfad);
  if (t !== null) return t;
  const g = wert['gewaehrleistung'];
  if (g === null) return null;
  if (
    !istObjekt(g) ||
    typeof g['dauer'] !== 'number' ||
    !Number.isFinite(g['dauer']) ||
    typeof g['einheit'] !== 'string'
  )
    return {
      feld: `${pfad}.gewaehrleistung`,
      meldung: 'Die Gewährleistung ist null oder hat eine Dauer (Zahl) und eine Einheit (Text).',
    };
  return null;
}

/** Die Liste der Nachtragsstatus (Vertrag `Nachtragsstatus`, D-35). */
const NACHTRAGSSTATUS: ReadonlySet<unknown> = new Set<Nachtragsstatus>([
  'angemeldet',
  'angeboten',
  'beauftragt',
  'abgelehnt',
]);

/**
 * Form der Nachtragsangaben (Vertrag `Nachtragsangaben`): `auftragsLvId` ein Text (die Kennung prüft der Kern nicht, sie
 * gehört zu einem anderen Aggregat), `nummer` ein Text mit mindestens einem Zeichen außer Leerraum, `status` einer der vier
 * Werte. Übergänge zwischen Status prüft der Kern nicht (er sieht das Auftrags-LV nicht).
 */
function nachtragsangabenFehler(wert: unknown): Formfehler | null {
  if (!istObjekt(wert))
    return { feld: 'nachtrag', meldung: 'Die Nachtragsangaben müssen ein Objekt oder null sein.' };
  if (typeof wert['auftragsLvId'] !== 'string')
    return { feld: 'nachtrag.auftragsLvId', meldung: 'Die Kennung des Auftrags-LV muss ein Text sein.' };
  const nummer = wert['nummer'];
  if (typeof nummer !== 'string' || nummer.trim() === '')
    return { feld: 'nachtrag.nummer', meldung: 'Die Nachtragsnummer darf nicht leer sein.' };
  if (!NACHTRAGSSTATUS.has(wert['status']))
    return {
      feld: 'nachtrag.status',
      meldung: 'Der Nachtragsstatus ist „angemeldet“, „angeboten“, „beauftragt“ oder „abgelehnt“.',
    };
  return null;
}

/** Genau die drei Felder der Nachtragsangaben (was ein Aufrufer mehr mitbringt, landet nicht im Kopf). */
const nachtragsangabenNormal = (n: Nachtragsangaben): Nachtragsangaben => ({
  auftragsLvId: n.auftragsLvId,
  nummer: n.nummer,
  status: n.status,
});

function leitbeschreibungFehler(wert: unknown): Formfehler | null {
  const pfad = 'leitbeschreibung.unterbeschreibungen';
  if (!istObjekt(wert))
    return { feld: 'leitbeschreibung', meldung: 'Die Leitbeschreibung muss ein Objekt oder null sein.' };
  const liste = wert['unterbeschreibungen'];
  if (!Array.isArray(liste))
    return { feld: pfad, meldung: 'Die Unterbeschreibungen müssen eine Liste sein.' };
  for (const u of liste as readonly unknown[]) {
    if (!istObjekt(u)) return { feld: pfad, meldung: 'Eine Unterbeschreibung ist kein Objekt.' };
    for (const f of ['nummer', 'kurztext'] as const)
      if (typeof u[f] !== 'string') return { feld: `${pfad}.${f}`, meldung: `${f} muss ein Text sein.` };
    if (!Array.isArray(u['langtext']))
      return { feld: `${pfad}.langtext`, meldung: 'Der Langtext muss eine Liste von Bausteinen sein.' };
    const menge = u['menge'];
    if (menge !== null) {
      const e = typeof menge === 'string' ? alsMenge(menge) : null;
      if (e === null || !e.ok)
        return {
          feld: `${pfad}.menge`,
          meldung: e?.ok === false ? e.fehler.meldung : 'Die Menge muss null oder eine Menge sein.',
        };
    }
    const einheit = u['einheit'];
    if (einheit !== null && typeof einheit !== 'string')
      return { feld: `${pfad}.einheit`, meldung: 'Die Einheit muss ein Text oder null sein.' };
  }
  return null;
}

/** Die Leitbeschreibung mit `''` → `null` als Einheit jeder Unterbeschreibung (D-06). */
const leitbeschreibungNormal = (l: Leitbeschreibung): Leitbeschreibung =>
  l.unterbeschreibungen.some((u) => u.einheit === '')
    ? {
        ...l,
        unterbeschreibungen: l.unterbeschreibungen.map((u) => ({ ...u, einheit: einheitNormal(u.einheit) })),
      }
    : l;

/** Ein Objekt mit gesetztem (`wert`) oder entferntem (`null`) Feld; ein entferntes Feld fehlt danach ganz. */
export function mitFeld<T extends object>(objekt: T, feld: string, wert: unknown): T {
  const eintraege: [string, unknown][] = Object.entries(objekt).filter(([k]) => k !== feld);
  if (wert !== null) eintraege.push([feld, wert]);
  return Object.fromEntries(eintraege) as T;
}

/**
 * Gemeinsamer Ablauf der Kopf-Befehle: Form prüfen, in die Normalform bringen, gleich → leer, sonst Kopf vorher/nachher.
 * `null` (nach der Normalform) entfernt das Feld.
 */
function kopfSetzen<W>(
  z: LvZustand,
  feld: 'auftraggeber' | 'vergabeinformationen' | 'nachtrag' | 'vorlage',
  roh: W | null,
  formfehler: (w: unknown) => Formfehler | null,
  normal: (w: W) => unknown = (w) => w,
): Antwort {
  if (roh !== null) {
    const f = formfehler(roh);
    if (f !== null) return nein('ungueltige-eingabe', f.meldung, undefined, f.feld);
  }
  const wert = roh === null ? null : normal(roh);
  const vorher: LvKopf = ohneKnoten(z.leistungsverzeichnis);
  if (gleicherWert(vorher[feld] ?? null, wert)) return ok(baueChangeSet(z, {}));
  return ok(baueChangeSet(z, { kopf: { vorher, nachher: mitFeld(vorher, feld, wert) } }));
}

export const auftraggeberSetzen = (z: LvZustand, b: AuftraggeberSetzen): Antwort =>
  kopfSetzen(z, 'auftraggeber', b.auftraggeber, auftraggeberFehler);

export const vergabeinformationenSetzen = (z: LvZustand, b: VergabeinformationenSetzen): Antwort =>
  kopfSetzen(z, 'vergabeinformationen', b.vergabeinformationen, vergabeinformationenFehler);

/** `NachtragsangabenSetzen` (D-35): die Angaben als ganzer Wert am Kopf; `null` entfernt sie. Nur Kopf, keine Summen. */
export const nachtragsangabenSetzen = (z: LvZustand, b: NachtragsangabenSetzen): Antwort =>
  kopfSetzen(z, 'nachtrag', b.nachtrag, nachtragsangabenFehler, nachtragsangabenNormal);

/**
 * `VorlageSetzen` (D-40): `true` kennzeichnet das LV als Muster-LV, `false` entfernt das Feld (Vertrag `LvKopf.vorlage?:
 * true`, eine Schreibweise für „kein Muster-LV“). Nur Kopf, keine Summen; kein Wahrheitswert: `ungueltige-eingabe`.
 */
export function vorlageSetzen(z: LvZustand, b: VorlageSetzen): Antwort {
  if (typeof b.vorlage !== 'boolean')
    return nein('ungueltige-eingabe', 'vorlage ist true oder false.', undefined, 'vorlage');
  return kopfSetzen(z, 'vorlage', b.vorlage ? true : null, () => null);
}

export function leitbeschreibungSetzen(z: LvZustand, b: LeitbeschreibungSetzen): Antwort {
  const k = z.leistungsverzeichnis.knoten.find((n) => n.id === b.positionId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.positionId}`, b.positionId);
  if (k.art !== 'position')
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt eine Leitbeschreibung, nicht „${k.art}“.`,
      b.positionId,
    );
  let wert: Leitbeschreibung | null = null;
  if (b.leitbeschreibung !== null) {
    const f = leitbeschreibungFehler(b.leitbeschreibung);
    if (f !== null) return nein('ungueltige-eingabe', f.meldung, b.positionId, f.feld);
    wert = leitbeschreibungNormal(b.leitbeschreibung);
  }
  if (gleicherWert(k.leitbeschreibung ?? null, wert)) return ok(baueChangeSet(z, {}));
  const nachher: Position = mitFeld(k, 'leitbeschreibung', wert);
  return ok(baueChangeSet(z, { geaendert: [{ vorher: k, nachher }] }));
}
