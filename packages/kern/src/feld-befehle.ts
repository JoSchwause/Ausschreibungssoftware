// SPDX-License-Identifier: AGPL-3.0-or-later
// Feldbefehle (Ticket 27, E-12): KurztextAendern, LangtextAendern, HinweistextAendern, EinheitAendern,
// LeistungsverzeichnisUmbenennen; seit Vertrag v1.4 TextquelleSetzen (Ticket 71, D-40). Jeder Befehl ist `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`: rein (A2).
// Das ChangeSet nennt genau den geänderten Knoten (oder den Kopf) und keine Summen: diese Felder gehen in keine Summe ein
// (A6). Derselbe Wert noch einmal liefert ein leeres ChangeSet. Text wird unverändert übernommen (U5): kein Trimmen, keine
// Längen- oder Zeichenregel, keine Einheitenliste; ein Langtext wird nur auf seine Form geprüft (`langtext.ts`, Ticket 50).
// Prüfungen sind Sache der LV-Prüfung (K8). Ausnahmen: eine leere Einheit (`''`) legt der Kern als `null` ab
// (Vertrag v1.2, D-06), eine leere Textquelle ebenso (Vertrag v1.4, `TextquelleSetzen`).

import type {
  Befehlsfehler,
  Einheit,
  EinheitAendern,
  Ergebnis,
  Hinweistext,
  HinweistextAendern,
  Knoten,
  KurztextAendern,
  LangtextAendern,
  LeistungsverzeichnisUmbenennen,
  LvChangeSet,
  LvZustand,
  Position,
  TextquelleSetzen,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { einheitNormal } from './einheit';
import { nein, ok } from './fehler';
import { langtextFormFehler, langtextGleich } from './langtext';
import { textquelleFehler, textquelleNormal } from './positionsfelder';
import { indexVon, mitFeld, ohneKnoten } from './struktur';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/**
 * VORLÄUFIGE ANNAHME, ENTSCHEIDUNG OFFEN (Ticket 27): Ein leerer Kurztext (Los, Titel, Position) und ein leerer LV-Name
 * sind erlaubt. Es gibt keine Regel, die sie verbietet (U5: Validierung blockiert nie); ob die LV-Prüfung (K8) sie
 * beanstandet, ist offen. Wer das entscheidet, ändert nur diese Konstanten und die Prüfung `textFehler` darunter.
 * Ebenso offen und nicht geprüft: Längengrenzen, erlaubte Zeichen und eine Liste zulässiger Einheiten.
 *
 * Nicht mehr offen (Vertrag v1.2, D-06, W-05 Nr. 3): Eine leere Einheit gibt es nicht; `''` wird beim Befehl zu `null`
 * (`einheitNormal`, Ticket 30). Das steht in `leereEinheit`, damit die Liste der Feldregeln vollständig bleibt.
 */
export const FELD_ANNAHMEN: {
  readonly status: string;
  readonly leererKurztextErlaubt: boolean;
  readonly leererLvNameErlaubt: boolean;
  readonly leereEinheit: string;
} = {
  status: 'vorläufige Annahme, Entscheidung offen',
  leererKurztextErlaubt: true,
  leererLvNameErlaubt: true,
  leereEinheit:
    "ENTSCHIEDEN (v1.2, D-06): '' als Einheit wird null (EinheitAendern, PositionAnlegen, LeistungsverzeichnisAnlegen samt Unterbeschreibungen); nur genau '', Leerzeichen bleiben Text",
};

/** Form der Eingabe (der Typ sagt `string`; ein Aufrufer ohne Typprüfung kann anderes schicken). Inhalt bleibt unberührt. */
function textFehler(wert: unknown, feld: string, leerErlaubt: boolean): string | null {
  if (typeof wert !== 'string') return `${feld} muss ein Text sein.`;
  if (wert === '' && !leerErlaubt) return `${feld} darf nicht leer sein.`;
  return null;
}

function knotenFinden(z: LvZustand, knotenId: string): Knoten | null {
  return z.leistungsverzeichnis.knoten.find((k) => k.id === knotenId) ?? null;
}

/** Ein Knoten wird ersetzt; kein Summenbezug (A6). */
const knotenErsetzen = (z: LvZustand, vorher: Knoten, nachher: Knoten): LvChangeSet =>
  baueChangeSet(z, { geaendert: [{ vorher, nachher }] });

export function kurztextAendern(z: LvZustand, b: KurztextAendern): Antwort {
  const k = knotenFinden(z, b.knotenId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  if (k.art === 'hinweis') {
    return nein(
      'knotenart-unzulaessig',
      'Ein Hinweistext hat keinen Kurztext; sein Text ändert sich mit HinweistextAendern.',
      b.knotenId,
    );
  }
  const meldung = textFehler(b.kurztext, 'kurztext', FELD_ANNAHMEN.leererKurztextErlaubt);
  if (meldung !== null) return nein('ungueltige-eingabe', meldung, b.knotenId, 'kurztext');
  if (k.kurztext === b.kurztext) return ok(baueChangeSet(z, {}));
  return ok(knotenErsetzen(z, k, { ...k, kurztext: b.kurztext }));
}

export function langtextAendern(z: LvZustand, b: LangtextAendern): Antwort {
  const k = knotenFinden(z, b.positionId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.positionId}`, b.positionId);
  if (k.art !== 'position') {
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt einen Langtext, nicht „${k.art}“.`,
      b.positionId,
    );
  }
  const meldung = langtextFormFehler(b.langtext, 'langtext');
  if (meldung !== null) return nein('ungueltige-eingabe', meldung, b.positionId, 'langtext');
  if (langtextGleich(k.langtext, b.langtext)) return ok(baueChangeSet(z, {}));
  const neu: Position = { ...k, langtext: b.langtext };
  return ok(knotenErsetzen(z, k, neu));
}

export function hinweistextAendern(z: LvZustand, b: HinweistextAendern): Antwort {
  const k = knotenFinden(z, b.knotenId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  if (k.art !== 'hinweis') {
    return nein('knotenart-unzulaessig', `Kein Hinweistext, sondern „${k.art}“.`, b.knotenId);
  }
  const meldung = langtextFormFehler(b.text, 'text');
  if (meldung !== null) return nein('ungueltige-eingabe', meldung, b.knotenId, 'text');
  if (langtextGleich(k.text, b.text)) return ok(baueChangeSet(z, {}));
  const neu: Hinweistext = { ...k, text: b.text };
  return ok(knotenErsetzen(z, k, neu));
}

/**
 * `null` leert die Einheit. `''` legt der Kern ebenfalls als `null` ab (Vertrag v1.2, D-06; `einheit.ts`); jeder andere
 * Text wird unverändert gespeichert, auch nur Leerzeichen (kein Trimmen, U5).
 */
export function einheitAendern(z: LvZustand, b: EinheitAendern): Antwort {
  const k = knotenFinden(z, b.positionId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.positionId}`, b.positionId);
  if (k.art !== 'position') {
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt eine Einheit, nicht „${k.art}“.`,
      b.positionId,
    );
  }
  if (b.einheit !== null && typeof b.einheit !== 'string') {
    return nein('ungueltige-eingabe', 'einheit muss ein Text oder null sein.', b.positionId, 'einheit');
  }
  const einheit: Einheit | null = einheitNormal(b.einheit);
  if (k.einheit === einheit) return ok(baueChangeSet(z, {}));
  return ok(knotenErsetzen(z, k, { ...k, einheit }));
}

export function leistungsverzeichnisUmbenennen(z: LvZustand, b: LeistungsverzeichnisUmbenennen): Antwort {
  const meldung = textFehler(b.name, 'name', FELD_ANNAHMEN.leererLvNameErlaubt);
  if (meldung !== null) return nein('ungueltige-eingabe', meldung, undefined, 'name');
  const kopfAlt = ohneKnoten(z.leistungsverzeichnis);
  if (kopfAlt.name === b.name) return ok(baueChangeSet(z, {}));
  return ok(baueChangeSet(z, { kopf: { vorher: kopfAlt, nachher: { ...kopfAlt, name: b.name } } }));
}

/**
 * `TextquelleSetzen` (D-40): setzt die Textquelle einer Position; `null` und `''` entfernen sie. Fehler wie bei den
 * Feldbefehlen: `knoten-unbekannt`, `knotenart-unzulaessig` (nur eine Position trägt eine Textquelle; Hinweistexte nicht,
 * Offene Typfrage 4 in Ticket 70), `ungueltige-eingabe` mit `feld: 'textquelle'` für einen Wert, der kein Text ist.
 */
export function textquelleSetzen(z: LvZustand, b: TextquelleSetzen): Antwort {
  const lv = z.leistungsverzeichnis;
  const k = indexVon(lv.id, lv.knoten).byId.get(b.positionId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.positionId}`, b.positionId);
  if (k.art !== 'position')
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt eine Textquelle, nicht „${k.art}“.`,
      b.positionId,
    );
  if (b.textquelle !== null) {
    const f = textquelleFehler(b.textquelle);
    if (f !== null) return nein('ungueltige-eingabe', f, b.positionId, 'textquelle');
  }
  const wert = textquelleNormal(b.textquelle);
  if ((k.textquelle ?? null) === wert) return ok(baueChangeSet(z, {}));
  return ok(baueChangeSet(z, { geaendert: [{ vorher: k, nachher: mitFeld(k, 'textquelle', wert) }] }));
}
