# 92: Behebung des Wellen-Reviews Welle 5

Status: resolved
Type: task
Welle: 5 · Strang: – · Pakete: wie je Befund genannt (benannte Ausnahme von P2: in dieser Phase schreibt außer Ticket 91
nur dieses Ticket; 91 schreibt `apps/web/e2e/m4.spec.ts`, `m3.spec.ts`, `src/m4-kette.test.ts` – diese nicht anfassen)
Blocked by: –
Regeln: siehe je Befund; D-47, D-48
Herkunft: `../review-welle-5.md`

## What to build

In dieser Reihenfolge, je Befund ein Commit (Befundnummer in der Nachricht). Erst die Pflichtpunkte, dann die Sollpunkte.

**Pflicht**
1. **P6** (D-48): Ein neues Nachtrags-LV bekommt die OZ-Maske des Auftrags-LV **ohne deren oberste Stufe** (die übernimmt
   die Gliederung „Nachtrag <nummer>“, D-35/D-80.1); hat die Maske keine Gliederungsstufe, bleibt sie gleich und die App
   zeigt den Hinweis. `nachtragUebernehmen` warnt (`maske-zu-tief` o. ä.), wenn Tiefe des Nachtrags + 1 die Maske des
   Auftrags-LV überschreitet. Test mit einem Nachtrag, der zwei Titelstufen nutzt; die M4-Fixture bleibt gleich.
2. **S1, S2**: `Ansatzzeile` der Kalkulation → `Kalkulationszeile`; Text/Bezeichner „Zuschlag“ der Kalkulation →
   „Kalkulationszuschlag“ (Glossar „Zuschlagssatz der Kalkulation“).
3. **S11**: `Abweichung` (gefordert − geprüft) in `abrechnung` → `Differenz` (o. ä., Glossar prüfen/ergänzen, L2).
4. **P2**: „Zuschlag erteilen“ im Preisspiegel eines Nachtrags-LV ausblenden (`lv.nachtrag !== undefined`), D-42.
5. **P3**: Projektseite liest die LV-Liste über `leistungsverzeichnisse.auflisten` (`LvUebersicht` mit `nachtrag`/`vorlage`,
   D-43) statt jedes LV ganz zu laden; die Netto-Spalte braucht sonst das ganze LV – Lösung wählen und begründen (z. B.
   Summen nur für sichtbare LVs nachladen oder Spalte aus `LvUebersicht` streichen, wenn D-53.1 keine Summen vorsieht).
6. **P5**: In der Rechnungsprüfung eine Infozeile je nicht beauftragtem Nachtrag mit Angebot (Nummer, Status, Angebotssumme
   netto), nie in der Rechnung gerechnet (D-35).
7. **P7**: Unlesbare oder doppelte gespeicherte Druckprofile nicht still verwerfen: Rohdaten behalten, Hinweis zeigen (Q5).
8. **S12**: Fachlogik von Ticket 89 aus `lv/LvSeite.tsx` in `src/kosten/` (Hook), in `LvSeite.tsx` bleibt eine kurze,
   markierte Einhängestelle (D-20).

**Soll** (so weit die Zeit reicht; nicht Erledigtes als Folgeticket-Stichpunkt im Ticket)
9. **S7**: eine Tabelle `art → { umkehren, ziel }` für `befehlsweg.ts`, `historie.ts` (`Teil.changeSet` aus `ChangeSet`
   ableiten), `HistorieAnbieter.tsx`.
10. **S8**: eine `Verweis`-Komponente in `apps/web/src/ui/`, alle Kopien ersetzen; **S6** `rechnung/ausfuehrer.ts` entfernen.
11. **S5**: `nachtrag`, `abrechnung`, `rechnung`, `auftrag` nutzen `eintrag`/`speichern` des Befehlswegs statt eigener Kopien.
12. **S3**: `gaeb` und `speicher` nutzen die KG-Formregel des Kerns (`KOSTENGRUPPE_FORM`/`kostengruppeFehler`); `kosten` behält
    seine (darf `kern` nicht importieren, A3) mit Verweis-Kommentar.
13. **S9, S4, S10**: Kern exportiert die Kinder-Hilfe (`baueIndex` o. ä.) und `mengenansatzFehler`; `abrechnung`, `gaeb`
    (X31-Writer) nutzen sie; `vorlage/logik.ts` ebenso; `baueAuftragsChangeSet` und `baueChangeSet` im Kern zusammenführen.
    Die Kalenderprüfung in `abrechnung` und `erechnung` bleibt doppelt (Fachpakete importieren einander nicht) – Kommentar.
14. **D-86.7**: Wiederholen einer Beauftragung bleibt auf dem Auftrags-LV.

## Acceptance criteria

- [x] Je Befund ein Commit; Ticket-Comments: Befund → Commit, nicht Erledigtes mit Grund
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; E2E `nachtrag`, `preisspiegel`,
      `projekt`, `rechnung`, `kosten`, `aufmass`, `vorlage`, `druckprofil`, `undo`, `m3` grün

## Comments

### Umsetzung (Branch `welle-5/92-review-fix`, Basis `integration/welle-5`)

Befund → Commit (Pflicht):
- P6 → `48e1e1c` (`nachtragsmaske` + Warnung `maske-zu-tief` in `abrechnung`, App legt das Nachtrags-LV mit der verkürzten
  Maske an, Hinweis bei Maske ohne Gliederungsstufe; Glossar „Nachtrag übernehmen“)
- S1, S2 → `8771547` (`Kalkulationszeile`, `spalteKalkulationszuschlag`; Glossar-Notiz am Kalkulationsansatz)
- S11 → `de32709` (`Forderungsdifferenz`; Glossar Rechnungsprüfung)
- P2 → `d819eec` (Preisspiegel eines Nachtrags-LV ohne „Zuschlag erteilen“, mit Hinweis; E2E in `nachtrag.spec.ts`)
- P3 → `6e1035e` (Projektseite aus `auflisten`; Netto je sichtbarer Zeile nachgeladen, `LvNetto.tsx`; E2E in `projekt.spec.ts`)
- P5 → `367911c` (Infozeilen nicht beauftragter Nachträge in der Prüfansicht, `nachtragsinfo`)
- P7 → `237a096` (`ablageLesen`/`ablageAlsText`: Zurückgehaltenes bleibt in der Ablage, Hinweis im Druckdialog; E2E)
- S12 → `0582354` (`kosten/useLvKosten.tsx`, Einhängestellen in `LvSeite.tsx`)

Befund → Commit (Soll, alle erledigt):
- S7 → `21995b7` (`historie/arten.ts`: Tabelle `art → { umkehren, ziel }`, `Teil.changeSet` ist `ChangeSet`)
- S8 → `13c865a` (`ui/Verweis.tsx`; die Kopien in `abrechnung`, `auftrag`, `rechnung`, `kosten` und die Links in
  `ProjektSeite.tsx`, `AuftragsLvListe.tsx`, `PreisspiegelLink.tsx`, `PreisspiegelSeite.tsx` ersetzt)
- S6 → `3c5c480` (`rechnung/ausfuehrer.ts` entfernt)
- S5 → `fadf4a0` (`aufmass.ts`, `rechnungen.ts`, `nachtrag/speichern.ts`, `auftrag/auftrag.ts`, dazu `rechnung/testpfad.ts`)
- S3 → `17d4d61` (`gaeb`, `speicher` nehmen `KOSTENGRUPPE_FORM`; `kosten` mit Verweis-Kommentar)
- S10 → `eafdf55` (`knotenUndSummen` in `kern/changeset.ts`, `baueAuftragsChangeSet` dort)
- S4 → `215d6cf` (Kern exportiert `mengenansatzFehler`, `ansatzFehler` entfällt; Kalenderregel in `abrechnung` und
  `erechnung` bleibt doppelt, Kommentar an beiden Stellen)
- S9 → `83e3bf1` (Kern exportiert `kinderJeEltern`, `dokumentreihenfolge`; `abrechnung/baum.ts`,
  `nachtrag-uebernehmen.ts`, `gaeb/x31-schreiben.ts`, `vorlage/logik.ts`)
- D-86.7 → `7eb4690` (Wiederholen der Beauftragung bleibt auf dem Auftrags-LV; E2E `nachtrag.spec.ts` angepasst)

Nicht in diesem Ticket (D-47): P1 und P4 sind die Folgetickets 93 und 94.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-92.1** (P6) Form der Warnung und Ort der Regel? **`nachtragsmaske(auftragsmaske)` in `abrechnung` (neben
  `nachtragUebernehmen`), Warnung `{ code: 'maske-zu-tief', tiefe, stufen }` vor `oz-unpassend`; eine Los-Stufe entfällt
  mit der obersten Stufe; ohne Gliederungsstufe bleibt die Maske, der Dialog „Nachtrag anlegen“ sagt es vorab.** Grund: Regel
  und Warnung gehören zusammen (D-48); `tiefe` zählt die neue Gliederung als Stufe 1, so ist die Warnung ohne Rechnen lesbar.
  Die M4-Fixture bleibt (ihr Nachtrag nutzt eine Titelstufe; `m4-kette.test.ts` erwartet weiter keine Warnung).
- **D-92.2** (S11) Name? **`Forderungsdifferenz`** (statt nur `Differenz`, das auch Soll/Ist als Feld trägt), im Glossar
  bei „Rechnungsprüfung“. Die Befundcodes `gefordert-abweichend` und `freigabe-abweichend` bleiben (Adjektiv, kein Fachbegriff;
  Texte der App hängen daran).
- **D-92.3** (S1, S2) **`Kalkulationszeile`** mit Glossar-Notiz beim Kalkulationsansatz; Spalte und Bezeichner
  **`spalteKalkulationszuschlag: 'Kalkulationszuschlag'`**. Die Feldbeschriftungen „Zuschlagssatz Lohn (%)“ stehen unter
  „Zuschlagssätze je Kostenart“ im Kalkulationsdialog und bleiben (Text, kein Bezeichner; die E2E `kosten` nutzt sie).
- **D-92.4** (P3) Netto-Spalte? **Behalten, aber nachgeladen: `LvNetto` lädt ein LV erst, wenn seine Zeile sichtbar ist
  (`IntersectionObserver`, sonst sofort), einmal je Stand der Liste; Umbenennen und Löschen laden das LV beim Klick.** Grund:
  `LvUebersicht` hat nach D-53.1 keine Summen, eine Summe dort ist eine Vertragsänderung (Typfrage 1 aus Ticket 53); die Spalte
  zu streichen nähme dem Nutzer eine sichtbare Zahl. Folgeticket-Stichpunkt: `LvUebersicht.netto` aus `summe_gesamt`
  (Vertrag, zusammen mit 95), dann entfällt das Nachladen.
- **D-92.5** (P5) Welche Nachträge? **Jeder nicht beauftragte (angemeldet, angeboten, abgelehnt) mit einem Angebot des
  Auftragnehmers, mit Status in der Zeile; geladen in `rechnungsstandLaden` über `nachtraegeLaden` (nur die Nachtrags-LVs,
  D-43).** Grund: Der Status sagt, wie die Zahl zu lesen ist; ein abgelehnter Nachtrag mit Angebot ist für den Prüfer genauso
  Information. Getestet über Speicher und `nachtragsinfo` (Vitest); keine eigene E2E (die Rechnungs-E2E hat keinen
  Nachtrag mit Angebot, die Kette gehört Ticket 91).
- **D-92.6** (P7) Wie bleiben die Rohdaten? **Jeder nicht verwendbare Eintrag (unlesbar, Standardname, doppelter Name) bleibt
  unverändert hinter den eigenen Profilen in der Ablage; ein ganzer Text, der keine JSON-Liste ist, wird ein Eintrag (als
  Zeichenkette).** Grund: kein zweiter Schlüssel, Rundweg stabil (Test). Folgeticket-Stichpunkt: zurückgehaltene Einträge
  als Datei sichern oder bewusst entfernen (heute bleiben sie für immer).
- **D-92.7** (S9) Namen im Kern? **`kinderJeEltern` und `dokumentreihenfolge` (Export der inneren `gruppiere`, `praeorder`)**,
  `KinderMap` als Typ. Grund: sprechende Namen außen, innen kein Umbau; die Kopie `kinderVon` in `nachtrag-uebernehmen.ts`
  fiel mit.
- **D-92.8** (D-86.7) Mechanik? **In der Tabelle (S7) beim LV: Ändert ein Teil nur den Kopf und trägt der Kopf
  Nachtragsangaben, ist die Änderung auch auf der Seite des Auftrags-LV sichtbar (Nachtragsliste); dort bleibt die App.**
  Grund: dieselbe Regel wie „nur Kopf, Projektseite offen“; keine Sonderregel für Schritte, Rückgängig von „Nachtrag anlegen“
  führt weiter zur Projektseite.

### Prüfung

Nach dem Merge von `integration/welle-5` (`c835924`, mit Ticket 91): `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`
(samt Lizenz- und Clean-Room-Prüfung), `pnpm typecheck`, `pnpm test` grün: Vitest 205 Dateien, 2606 Tests bestanden,
3 übersprungen wie zuvor; kein Budget fiel, keines gelockert. E2E (`PW_WEB_PORT=4395`) `nachtrag`, `preisspiegel`,
`projekt`, `rechnung`, `kosten`, `aufmass`, `vorlage`, `druckprofil`, `undo`, `m3`: 24/24 grün; zusätzlich `m4.spec.ts`
(Ticket 91) grün.

## Answer

Merged: b281a1f in integration/welle-5


Branch `welle-5/92-review-fix` (enthält `integration/welle-5` bis `1443c21`). Alle 9 Pflicht- und alle 9 Sollpunkte sind
erledigt, je Befund ein Commit (Liste oben). Entscheidungen D-92.1 bis D-92.8. Folgeticket-Stichpunkte:
`LvUebersicht.netto` im Vertrag, damit die Projektseite das Netto nicht nachladen muss (D-92.4); zurückgehaltene
Druckprofile sichern oder entfernen (D-92.6). P1 und P4 bleiben die Tickets 93 und 94 (D-47).
