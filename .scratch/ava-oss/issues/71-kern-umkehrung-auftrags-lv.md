# 71: Kern v1.4: Befehle am Auftrags-LV, Umkehrung, neue LV-Befehle

Status: claimed
Type: task
Welle: 5 · Strang: K · Paket: `packages/kern`
Blocked by: 70
Regeln: A2, A5, A6, F1, N2, U5, Q1, ADR 0011, D-35, D-36, D-40
Herkunft: D-64.4 (die App kehrt Auftrags-LV-ChangeSets mit der LV-Umkehrung um, über `as string as LeistungsverzeichnisId`);
`vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Kern“)

## What to build

Die Handler für alles, was `vertrag` v1.4 dem Kern zuweist; bis dahin weist der Kern es mit `befehl-nicht-zustaendig` ab
(markierte mechanische Zeilen aus Ticket 70 ersetzen).

1. **Auftrags-LV:** `auftragsLvChangeSetAnwenden` und `auftragsLvChangeSetUmkehren` (Signaturen aus v1.4), eigene
   Implementierung oder geteilte Hilfsfunktion mit der LV-Umkehrung, aber ohne Kennungs-Umdeutung (D-64.4).
2. **`NachtragUebernehmen`** (D-35): hängt den Teilbaum an die Wurzel des Auftrags-LV; prüft Baumregeln (F1, höchstens 5
   Ebenen, Eltern vor Kindern, eindeutige Kennungen auch gegen den vorhandenen Baum – eine zweite Übernahme desselben
   Nachtrags ist damit ein Fehler), Form der Positionen wie beim Anlegen; rechnet die Summen des Auftrags-LV neu (A6: nur
   der betroffene Teilbaum und die Gesamtsumme), ChangeSet mit `knoten.hinzugefuegt` und `summen.vorher`.
3. **`KostengruppeSetzen`** im LV und im Auftrags-LV: nur an Positionen; Form der Nummer prüfen (dreistellig `100`–`999`
   wie im Glossar „Kostengruppe“; der Kern darf `kosten` nicht importieren, A3 – eigene kleine Formprüfung mit Verweis auf
   den Glossar, oder dem Typ vertrauen; entscheiden und begründen). Keine Summenänderung.
4. **`NachtragsangabenSetzen`, `VorlageSetzen`, `TextquelleSetzen`** (D-35, D-40) als Kopf- bzw. Feldbefehle wie die
   vorhandenen (`kopfdaten-befehle.ts`, `feld-befehle.ts`). `Nachtragsangaben.nummer` nicht leer; Status aus der Liste.
5. Kopieren (`kopieBauen`, K9) und GAEB-unabhängige Prüfungen nehmen die neuen Positionsfelder mit (Kostengruppe und
   Textquelle bleiben bei Kopie erhalten; ein Muster-LV ist eine Quelle für Kopien, C5).

## Grenzen

- Nur `packages/kern`. Die App stellt in Ticket 86 auf die neue Umkehrung um (Umweg aus D-64.4 entfernen).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Property-Test anwenden ∘ umkehren = Identität für jeden neuen Befehl (LV und Auftrags-LV)
- [ ] Golden-Test `NachtragUebernehmen` an `typisch` als Auftrags-LV: Summen danach = Summen vorher + Summe des Nachtrags
- [ ] Fehlerfälle: zweite Übernahme, sechste Ebene, Los neben Titel (F1), Kostengruppe an Gliederung
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Form von `kostengruppe` prüfen (die Marke und `KostengruppeSetzen` legen das fest; Fehler `ungueltige-eingabe`) und
  `textquelle: ''` entfernen bzw. abweisen – auch an mitgebrachten Knoten (`LeistungsverzeichnisAnlegen`,
  `AuftragsLeistungsverzeichnisAnlegen`, `KnotenEinfuegen`, `NachtragUebernehmen`; über `positionsdatenFehler` bzw.
  `positionNormal`), damit „nie `''` im Zustand“ gilt. Punkt 3 oben ist damit entschieden.
- D-42 (Kern-Teil): `AuftragsLeistungsverzeichnisAnlegen` legt im ChangeSet-Kopf nur Felder von `AuftragsLvKopf` ab (heute
  `ohneKnoten(a)` trägt zur Laufzeit `nachtrag`/`vorlage` eines LV mit); Test.

## Comments

(Alt: „Kern: Umkehrung für ChangeSets des Auftrags-LV“, Punkt 1 oben; der App-Teil liegt jetzt in Ticket 86.)
