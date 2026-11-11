# 59: V4: Zuschlag → Auftrags-LV (Rechnung)

Status: claimed
Type: task
Welle: 4 · Strang: V4 · Paket: `packages/vergabe`
Blocked by: 53 (`vertrag` v1.3: Auftragnehmer), 51 (Fixtures in GAEB-Form); für das Speichern des Ergebnisses 57
Regeln: A2, A3, A5, ADR 0011, F4, N2, N5, U5, Q5, G-26, E-04, D-21
Herkunft: `plan.md` §2 V4, D-21

## What to build

Reine Funktion in `vergabe` (D-21):

`zuschlagErteilen(lv: LvZustand, angebot: AngebotZustand | Angebot, projekt: Projekt, gewaehlt: ReadonlySet<PositionId>,
neueId: AuftragsLeistungsverzeichnisId) → Ergebnis<{ befehl: AuftragsLeistungsverzeichnisAnlegen; warnungen: Zuschlagswarnung[] }>`

1. Grundlage ist das **gedachte LV** des Angebots (`gedachtesLv`): EP des Bieters, Zuschlagssatz des Bieters an
   Zuschlagspositionen, Nachlass des Angebots, MwSt des LV, Kopfdaten (Name, OZ-Maske, Auftraggeber, Vergabeinformationen)
   aus dem LV. `projektId`, `leistungsverzeichnisId`, `angebotId` gesetzt; Auftragnehmer (v1.3) = Name des Bieters.
2. **Wahl:** Eine gewählte Wahlposition wird normale Position (`merkmale.wahl` entfernt). Grundposition (Variante 0) und
   nicht gewählte Alternativen ihrer Gruppe entfallen. Gruppen ohne Wahl behalten die Grundposition; ihre Alternativen
   entfallen. Bedarf bleibt Bedarf (mit/ohne Gesamtbetrag unverändert).
3. **Aufräumen:** `reihenfolge` je Elternknoten dicht neu; OZ unverändert (Lücken erlaubt); geleerte Titel bleiben.
   Listenbezüge von Zuschlagspositionen und `grundpositionId` auf entfallene Positionen werden entfernt, je Warnung; nicht
   umlenken (Annahme).
4. **Fehler:** mehr als eine gewählte Position je Gruppe; eine gewählte Kennung, die keine Alternative (Wahl mit Variante ≠ 0)
   des LV ist; Angebot gehört nicht zum LV. Ergebnis `ok: false` mit `ungueltige-eingabe` und Feld.
5. **Warnungen (U5):** nicht angebotene Position (auch gewählte) → EP `null`; Zuschlagsposition ohne Satz des Bieters →
   Satz `null`; entfernte Bezüge; Zahl der entfallenen Positionen. Der Befehl entsteht trotzdem.
6. Der Kern muss den Befehl annehmen (`auftragsLvBefehlAusfuehren`) und die Summen des Auftrags-LV stimmen bei einem Angebot
   ohne Wahl und ohne fehlende Preise mit den Bietersummen (`angebotSummenBerechnen`) überein: Test mit allen drei Bietern
   aus `typisch-angebote` (Sollwerte der Fixture), dazu Fälle mit Wahl und Lücken.

Hilfsfunktion für die App: `zuschlagsvorschau(lv, angebot, gewaehlt)` mit Zahl entfallender und unbepreister Positionen,
Wahlgruppen mit ihren Varianten (für den Dialog in Ticket 64).

## Grenzen

- Nur `packages/vergabe` (Abhängigkeit `vergabe → kern` ist erlaubt, A3). Keine eigene Summenregel: Summen rechnet der Kern.
- Keine Uhr (A2); ein Zuschlagsdatum gibt es in v1.3 nicht.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Golden-Tests gegen `typisch-angebote` (alle Bieter) und `zuschlag.json`; Fälle Wahl gewählt/nicht gewählt, Bedarf,
      nicht angeboten, Bezug entfernt
- [ ] Property-Test: Positionen des Auftrags-LV ⊆ Positionen des LV, IDs unverändert; ohne Wahlgruppen und ohne Lücken
      Netto des Auftrags-LV = Netto des Angebots
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Oberfläche (Ticket 64), Nachträge, X86-Export des Auftrags-LV (läuft über den vorhandenen Writer).

## Comments

### Aus Ticket 53 (Review, D-27)
- Ein gesetzter `auftragnehmer` wird von `speicher` bis Ticket 57 mit `unbekannt` abgewiesen; die Rechnung hier ist davon unabhängig, die App (64) braucht 57.
- Der Mengenansatz der Positionen kommt über das gedachte LV mit ins Auftrags-LV (Spread); das ist gewollt.

### Umsetzer (Branch `welle-4/59-zuschlag`)

Dateien: `packages/vergabe/src/zuschlag-erteilen.ts` (`zuschlagErteilen`, `zuschlagsvorschau`), `wahlgruppen.ts`
(`wahlgruppenBilden`, nicht exportiert über `index.ts`), Tests `zuschlag-erteilen.test.ts` (Goldens, Fehler, Warnungen,
Vorschau) und `zuschlag-eigenschaften.test.ts` (Property-Test, 400 Läufe, gegen `auftragsLvBefehlAusfuehren`).
Testhilfe: `lvAusFixture('zuschlag')` liest jetzt `zuschlagskennzeichen`; `FxAngebotsset.preisspiegel` typisiert.
`GLOSSARY.md`: neuer Eintrag „Wahlgruppe“ (L2).

Goldens (alle aus Sollwerten der Fixtures): drei Bieter aus `typisch-angebote` ohne Wahl (Summen, Titelsummen nach ID
und nach OZ aus dem Block `preisspiegel`, Auftragnehmer = Name); Bieter A mit 02.0070 A gewählt (Netto 55.481,84 −
5.155,30 + 5.774,21 = 56.100,75; Titel 02 25.685,08); `zuschlag.json` mit den Preisen des LV (alle drei Bezugsformen,
Netto 6.850,60) und mit gewählter Alternative zu 02.0010 (Listenbezug von 01.03.0040 entfernt, Betrag 0,00, Netto
6.280,50). Dazu kleine LVs für Wahl in beiden Formen, Bedarf mit/ohne Gesamtbetrag, Lücken, Papierkorb.

**Schnittstelle für Ticket 64** (`@tethys/vergabe`):

```ts
zuschlagErteilen(lv: LvZustand, angebot: AngebotZustand | Angebot, projekt: Projekt,
  gewaehlt: ReadonlySet<PositionId>, neueId: AuftragsLeistungsverzeichnisId)
  → Ergebnis<{ befehl: AuftragsLeistungsverzeichnisAnlegen; warnungen: readonly Zuschlagswarnung[] }, Befehlsfehler>

type Zuschlagswarnung =
  | { code: 'positionen-entfallen'; anzahl: number; positionIds: readonly PositionId[] }   // zuerst, nur wenn > 0
  | { code: 'nicht-angeboten'; positionId }        // EP null (auch gewählte Alternative, auch Zuschlagsposition)
  | { code: 'zuschlagssatz-fehlt'; positionId }    // angebotene Zuschlagsposition ohne Satz → Satz null
  | { code: 'wahl-ohne-grundposition'; positionId } // gewählte Alternative ersetzt nichts (D-59.2)
  | { code: 'bezug-entfernt'; positionId; feld: 'zuschlag.bezug.positionen' | 'merkmale.wahl.grundpositionId';
      zielId: PositionId };
// Reihenfolge: positionen-entfallen, dann je Position in Dokumentreihenfolge: Preis, Grundposition, Bezüge.

zuschlagsvorschau(lv: LvZustand, angebot: AngebotZustand | Angebot, gewaehlt: ReadonlySet<PositionId>)
  → { entfallend: number | null; unbepreist: number | null;      // null bei ungültiger Wahl
      wahlgruppen: readonly { gruppe: number | null; grundpositionen: readonly PositionId[];
        alternativen: readonly { positionId: PositionId; variante: number | null }[];
        gewaehlt: PositionId | null }[];                          // Dokumentreihenfolge
      fehler: Befehlsfehler | null }                              // derselbe Fehler wie zuschlagErteilen (feld 'gewaehlt')
```

Fehler (`ungueltige-eingabe`, Reihenfolge der Prüfung): `angebot.leistungsverzeichnisId`, `angebot.projektId`,
`projekt.id`, `angebot.bieterId`, dann `gewaehlt` mit `knotenId` (keine Alternative: erste solche Kennung in der
Reihenfolge der Menge; zwei in einer Gruppe: die zweite in Dokumentreihenfolge). Die App legt mit dem Befehl über
`auftragsLvBefehlAusfuehren` an; einen zweiten Zuschlag zum selben LV lehnt die App ab (D-21), nicht diese Funktion.
Das Speichern braucht Ticket 57 (Auftragnehmer, siehe oben).

- **D-59.1 Was eine Wahlgruppe ist.** Frage: Das Ticket spricht von „Gruppe“; die Daten tragen sie in zwei Formen
  (GAEB `wahl.gruppe`/`variante`; Verweisform `grundpositionId` mit Gruppe/Variante `null`, so in `typisch`).
  Entscheidung: Zusammenhangskomponente aus (a) gleicher `wahl.gruppe` unter demselben Elternknoten (der GAEB-Leser
  zählt `ALNGroupNo` je `Itemlist`, eine Gruppennummer kann in zwei Titeln vorkommen) und (b) Alternative → ihr
  `grundpositionId`, wenn das Ziel im LV steht. Alternative = Wahl mit Variante ≠ 0 (`null` zählt, D-37.1); jedes andere
  Mitglied ist Grundposition. Grund: deckt beide Formen und Mischformen ohne Sonderfall; ein Verweis auf eine andere
  Alternative führt in dieselbe Gruppe (Glossar: „oder einer anderen Wahlposition“).
- **D-59.2 Gewählte Alternative ohne Grundposition.** Frage: Ein LV nach einem X83-Rundweg trägt Alternativen mit
  künstlicher Gruppe, aber ohne Variante 0 (D-16; der Leser meldet `wahl-ohne-grundposition`). Entscheidung: Die Wahl ist
  gültig, ersetzt nichts, Warnung `wahl-ohne-grundposition`. Grund: kein Fehler, den der Nutzer nicht beheben kann (U5),
  aber kein stilles Doppelzählen im Netto (Q5).
- **D-59.3 Weitere Fehler.** Zusätzlich zu Punkt 4: Angebot eines anderen Projekts (`angebot.projektId`), Projekt
  nicht das des LV (`projekt.id`), Bieter nicht im Projekt (`angebot.bieterId`). Grund: Der Auftragnehmer braucht den
  Namen des Bieters; ein Befehl mit falschem Projekt wäre ein falsches Aggregat.
- **D-59.4 Kopf und Anteile.** Kopf = Kopf des LV per Spread (Name, OZ-Maske, MwSt, Auftraggeber,
  Vergabeinformationen, `epaBezeichnungen`), Nachlass des Angebots, `auftragnehmer = { name: Bieter.name, strasse,
  plz, ort: null }` (ein `auftragnehmer` am LV wird ersetzt). Die Einheitspreisanteile einer Position sind die des
  Bieters (`Angebotsposition.epa`), nicht die des LV; `null` bei „nicht angeboten“ und an einer Zuschlagsposition mit
  Satz (D-37.3). Grund: Vertragspreise sind die des Bieters; die Anteile des LV gehörten zu einem anderen EP.
- **D-59.5 Bezüge allgemein.** Entfernt wird jeder Listenbezug und jeder `grundpositionId`, dessen Ziel nicht im
  Auftrags-LV steht: entfallen oder im Papierkorb des LV (der Kern weist Bezüge auf fehlende Positionen beim Anlegen ab,
  das Auftrags-LV hat keinen Papierkorb). Die Grundposition einer Gruppe ohne Wahl behält `wahl` mit Variante 0 (F4:
  Gruppe und Variante bleiben; zählt wie eine Normalposition).
- **D-59.6 Zuschlagsposition ohne Satz.** Wie das gedachte LV (D-44.1 (2)): Satz `null`, der EP des Bieters bleibt
  stehen (rechnet nur die Altform). Nicht angeboten oder ohne Eintrag: nur `nicht-angeboten`, nicht zusätzlich
  `zuschlagssatz-fehlt` (D-44.1 (1)).
- **D-59.7 Vorschau bei ungültiger Wahl.** Zahlen `null`, `fehler` gesetzt, Gruppen mit der ersten gewählten
  Alternative je Gruppe. `unbepreist` = Zahl der Warnungen `nicht-angeboten` + `zuschlagssatz-fehlt` im Auftrags-LV.
  Die Vorschau prüft die Zugehörigkeit des Angebots nicht (das tut `zuschlagErteilen`).
- **D-59.8 Property stärker als verlangt.** Ohne Wahl (nicht nur ohne Wahlgruppen und Lücken) sind alle Gesamtsummen
  des Auftrags-LV gleich denen des Angebots, `summeWahl` 0,00: Alternativen gehen weder ins Netto noch in eine
  Zuschlagsbasis (R2), Lücken sind in beiden `null`. Mit Wahl: keine Alternative mehr im Auftrags-LV, gewählte stehen
  ohne Wahl darin, Knoten ⊆ LV mit gleichen Kennungen, `positionen-entfallen.anzahl` = Differenz.
