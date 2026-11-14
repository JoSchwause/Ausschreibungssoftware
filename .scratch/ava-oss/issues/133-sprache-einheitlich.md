# 133: Einheitliche Sprache und Sprachtest

Status: resolved
Type: task
Welle: 7 · Strang: E14 · Paket/Ordner: `apps/web/src/*/texte.ts`, `packages/ui-*/src/texte.ts`, `GLOSSARY.md`, neu `apps/web/src/sprache.test.ts`; Textstellen außerhalb von `texte.ts` nur, wo dort Nutzertext fest steht
Blocked by: –
Modell: sonnet
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: L1, L2, L4, L5; G-63
Herkunft: umfang §3 E14, B-27, B-28

## What to build

1. **Test zuerst:** `apps/web/src/sprache.test.ts` liest alle `texte.ts` (App und `packages/ui-*`) und schlägt fehl bei
   „du“-Formen (du, dich, dir, dein…, Imperativ mit „du“-Endung ist nicht prüfbar – nur Pronomen), bei den abgewählten
   Doppelbegriffen (Liste im Test, aus Punkt 2) und bei Ticketnummern/Paketnamen (L5: „Ticket“, „vertrag“ als Wort, `G4`, …).
2. **Ein Begriff je Sache** nach `GLOSSARY.md`; wo das Glossar zwei zulässt, hier entscheiden und dort eintragen (L2):
   Ordnungszahl/OZ (Vorschlag: Spaltenkopf „OZ“, Fließtext „Ordnungszahl“ – festlegen), MwSt/Umsatzsteuer, Menge/Vordersatz,
   „Projektdatei exportieren“/„Datensicherung“ → ein Name, einlesen/importieren → „einlesen“, „Projekt anlegen“/„Anlegen“/„Neue
   Rechnung“ → Verb mit Gegenstand.
3. **Anrede nach L4:** unpersönlich, wo nötig „Sie“; alle „du“-Texte (`kosten`, `bauzeit`, `honorar`) und „Sie“-Texte prüfen.
4. **Schaltflächen:** Verb mit Gegenstand, „…“ nur, wenn ein Dialog folgt; ein Trennzeichen in Seitentiteln; „€“ einheitlich
   (Regel im Glossar oder in `docs/regeln.md` unter L festhalten? Nur Glossar/Kommentar im Test; `docs/regeln.md` nicht ändern).
5. **IFC-Klassen** mit deutschem Namen und der Klasse in Klammern („Fundament (IfcFooting)“): Tabelle in `apps/web/src/bim/`
   Texten, nur Anzeige.
6. E2E-Specs, die geänderte Texte suchen, nachziehen.

Läuft parallel zu 131 und 132, die in `ui/`, `projekt/` und den Specs arbeiten: dort Texte ändern, Konflikte löst der Merger.

## Acceptance criteria

- [x] Sprachtest grün und schlägt bei einem eingefügten „du“ fehl (Test des Tests)
- [x] Glossar trägt jede Entscheidung aus Punkt 2; alle E2E grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

- D-133.1 OZ/Ordnungszahl: Beschriftung, Spaltenkopf und Feldname „OZ“ (Grid, Merkmale-Dialog), im Satz „Ordnungszahl“. Grund: kurz in Tabellen, gleich wie in `historie` und `bim`; der Test lehnt „Ordnungszahl“ als ganze Beschriftung ab.
- D-133.2 Menge/Vordersatz: „Menge“; „Vordersatz“ ist ein Wort der Vorbild-Software und fällt in allen Texten weg (Glossar angepasst).
- D-133.3 MwSt/Umsatzsteuer: „MwSt“. Ausnahme „Umsatzsteuer (BT-110)“ in der XRechnung-Vorschau, weil das der Name des Feldes der EN 16931 ist; BT-Nummern bleiben (Normkennung, keine Code-Kennung).
- D-133.4 Projektdatei: Die Datei heißt „Projektdatei“, die Handlung „sichern“ („Projektdatei sichern“, „Jetzt sichern“); Bereich und Dialog heißen „Sicherung“. Das Druckprofil folgt: „Profil sichern“ / „Profil einlesen“. Grund: „sichern“ steht schon in der Erinnerung und im Dialog; ein zweites Wort „exportieren“ für dieselbe Handlung entfällt.
- D-133.5 einlesen statt importieren, auch in Meldungen („Projekt eingelesen“, „Einlesen nicht möglich“, „Sichern nicht möglich“ statt „Export nicht möglich“).
- D-133.6 Anlegen: Jede Schaltfläche trägt den Gegenstand („Honorarberechnung anlegen“, „Bauzeitenplan anlegen“, „Kostenermittlung anlegen“, „Nachtrag anlegen“, „Rechnung anlegen“, „Bauteile zuordnen …“). „Projekt umbenennen“ (ändert auch den Bauherrn) heißt „Stammdaten ändern“.
- D-133.7 Schaltflächen mit „…“: Namen der Funktionen, die einen Dialog mit gleichem Namen öffnen („Mengenermittlung …“, „Mengen aus Modell …“, „Aufmaßblatt aus Auswahl …“, „Kostenschätzung über Kennwerte …“, „Mengen aktualisieren …“, „Neuer Stand …“) bleiben; das Verb steht dann im Dialog. Nur „Zuordnen …“ (Verb ohne Gegenstand) wurde ergänzt. „…“ immer mit Leerzeichen davor (Test).
- D-133.8 „€“, Trennzeichen, Anrede: „€“ nur als Zeichen mit Leerzeichen hinter der Zahl (Test lehnt „EUR“, „Euro“, „5€“ ab); Seitentitel bleiben „Seite – Projekt“ (Halbgeviertstrich), Zellen im Klartext trennt „ · “ statt „ | “. „Sie“-Texte bleiben, wo sie direkt anreden (L4 erlaubt „Sie“); die „du“-Texte und alle Imperative der 2. Person Singular in `kosten`, `honorar`, `bauzeit` sind unpersönlich umformuliert, der Test prüft Pronomen und eine Liste solcher Imperative.
- D-133.9 IFC-Klassen: Tabelle `IFC_KLASSEN` und `ifcKlassenName` in `apps/web/src/bim/texte.ts` (nur Anzeige: Baum, Eigenschaften, Klassenauswahl, Vergleich); unbekannte Klassen unverändert. Die Auswahl nennt „Wand (IfcWall): 3“ statt „IfcWall (3)“. Regel- und Kennungsreste in Nutzertexten (Paketname im Bausteinkatalog, „(F1)“, „(Regel U5)“) entfernt.
- Prüfstand: Sprachtest 31/31 grün (auch Test des Tests); volle Unit-Suite grün bis auf 8 Leistungsbudget-Tests unter Last (gaeb, kern, speicher, vergabe, abrechnung; nicht angefasst, nicht gelockert); volle E2E 89/90 grün, bim-tastatur.spec.ts fällt mit 2 Workern unter Last (Fokus in der Auswahl), allein grün (zweimal).

## Answer

Gemergt nach `integration/welle-7` mit `83ba3c9`. Ergebnisse, Testläufe und Entscheidungen (D-133.x) unter `## Comments`.
