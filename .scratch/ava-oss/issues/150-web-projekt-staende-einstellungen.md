# 150: App: Projektangaben, LV-Stände, Einstellungen, Kopie-Import

Status: resolved
Type: task
Welle: 7 · Strang: E8, E10, E15 · Paket/Ordner: `apps/web/src/projekt/`, `historie/`, `sicherung/`, `ausgabe/` (Druckprofile), `kosten/bezeichnungen.ts` (nur Speicherweg)
Blocked by: 137, 139, 147
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q5, A8, U7; D-73
Herkunft: umfang §3 E8, E10, E15, B-16, B-20, B-25, B-29

## What to build

1. **„Projektangaben“** statt „Stammdaten ändern“ (Name nach 133, D-133.x; Befehl `ProjektangabenSetzen` nach D-127.5): Name, Bauherr, Nummer, Ort, Anschrift der Baustelle.
2. **Büro (Absender)** einmal für alle Projekte (Einstellungen, D-73), erreichbar über die Projektliste/Hilfe-Leiste.
3. **LV-Stand umbenennen und löschen** (Bestätigung, Undo).
4. **Einstellungen im Speicher:** Druckprofile und KG-Bezeichnungen aus `localStorage` einmalig übernehmen (wenn der Speicher
   leer ist; alte Schlüssel bleiben), danach nur noch über die Einstellungen lesen/schreiben.
6. **Aus dem Review (D-82):** S6 – „Als neues LV übernehmen“ (`historie/`) hängt `PreisspiegelEinstellungenSetzen` an die Befehlsfolge, wenn der Stand Einstellungen trägt. S8 – `localStorage` nur übernehmen, solange das Einstellungsprotokoll leer ist. M1 – Einstellungen haben ein eigenes Sitzungs-Undo (Strg+Z auf den Einstellungsseiten), getrennt von der Projekthistorie.
7. **Aus 138:** Projektbefehle über `projektBefehlAusfuehren` aus `@tethys/vergabe` (leitet an `kern` weiter), damit Bieterbefehle denselben Weg nehmen.
5. **Projektdatei einlesen, wenn das Projekt schon da ist:** Wahl „als Kopie einlesen“ oder Abbrechen; der Dialog nennt, welche
   Einstellungen übernommen und welche belassen wurden.

## Acceptance criteria

- [x] E2E für 1–5, inklusive Sicherung → Projekt löschen → Einlesen → gleiche Einstellungen
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/150-projekt-einstellungen`):

- **D-150.1 Sitzung der Einstellungen.** `historie/einstellungen.ts` (`EinstellungenSitzung`, eine je Umgebung): Kern →
  `einstellungen.anwenden` → Zustand, nacheinander gereiht; eigene Stapel für Rückgängig/Wiederholen (getauschtes ChangeSet,
  `Rueckgaengig`/`Wiederholen` mit der Kennung des ursprünglichen Eintrags, D-82 M1). Ein Konflikt schreibt nichts, der Schritt
  bleibt, die Sitzung liest den gespeicherten Stand neu. Grund: wie `Befehlsweg`, aber ohne die Projekthistorie (D-73).
- **D-150.2 Wo die Einstellungen in die Seiten kommen.** `EinstellungenAnbieter` in `HistorieAnbieter` (eigener Ordner, `App.tsx`
  bleibt unberührt); die Seiten erscheinen erst nach dem Laden (eine Zeile), damit synchrone Leser (`kosten/bezeichnungen.ts`)
  den Stand haben. Für Leser ohne React gibt es `aktuelleEinstellungen()`.
- **D-150.3 „Einstellungsseiten“ (M1).** Es gibt keine eigene Route; Einstellungen ändern der Dialog „Büro (Absender)“, die
  Druckprofile im PDF-Dialog und die CSV der Kostengruppen. In den beiden Dialogen stehen „Einstellung rückgängig“/„Einstellung
  wiederholen“, Strg+Z/Strg+Y außerhalb eines Feldes wirken dort auf die Einstellungen (das Projekt-Rückgängig lässt Dialoge
  ohnehin aus). Die CSV auf der Kostenseite schreibt als Befehl in denselben Verlauf; Bedienelemente dort gehören zu 154.
- **D-150.4 Übernahme aus dem Browserspeicher (S8).** `sicherung/browserablage.ts`: beim ersten Laden je Speicher, nur wenn
  das Einstellungsprotokoll leer ist und ein alter Schlüssel Inhalt hat; je Profil ein `DruckprofilSetzen`, die CSV als ein
  `KostengruppenbezeichnungenSetzen`; nicht im Rückgängig (der Nutzer hat sie nicht ausgelöst). Das Druckpaket wird nur
  nachgeladen, wenn Profile abgelegt sind. Alte Schlüssel bleiben; was dort nicht als Profil galt (unlesbar, Standardname,
  doppelt), zeigt der Druckdialog weiter an und „Einträge entfernen“ entfernt nur das aus dem alten Schlüssel (Q5, Ticket 121).
  Die zuletzt gewählte Profilauswahl bleibt Komfort im Browserspeicher.
- **D-150.5 KG-Bezeichnungen.** `kosten/bezeichnungen.ts` behält die Schnittstelle der Kostenseiten (CSV-Text lesen/merken),
  liest aber aus den Einstellungen (CSV mit Anführungszeichen erzeugt, Rundweg getestet) und schreibt einen Befehl. So ändert
  sich in `kosten/` nur der Speicherweg (Ordner von 154).
- **D-150.6 Druckprofil löschen** fragt vorher (Q5, Kommentar am Vertrag); fällt das gewählte Profil durch Rückgängig weg, gilt
  wieder das Standardprofil. Büro und Projekt (mit `angaben`) gehen in den LV-Druck (D-141.6); die übrigen Ausgaben bauen
  149/152/154.
- **D-150.7 Projektangaben.** Ein Dialog, ein Befehl `ProjektangabenSetzen` (ein Undo-Schritt); leere Felder `null`, ganz leer
  `angaben: null`; die Anschrift des Bauherrn (freier Text) bleibt unverändert. Der Kopf der Projektseite zeigt Nummer, Ort,
  Baustelle. Schaltfläche „Projektangaben …“; Glossar-Tabelle (Benennung) nachgeführt.
- **D-150.8 Büro.** Schaltfläche „Büro (Absender) …“ auf der Projektliste (gilt für alle Projekte); der Dialog bleibt nach dem
  Speichern offen (Rückgängig im Dialog). Alles leer = kein Büro; Angaben ohne Namen werden am Feld gemeldet.
- **D-150.9 LV-Stand umbenennen/löschen.** Logik in `historie/staende.ts` (lädt den Stand, `lvStandBefehlAusfuehren`, ein Eintrag
  mit dem LV als Aggregat, ein Undo-Schritt); Bedienung als Zeilenknöpfe im vorhandenen Dialog `lv/StaendeDialog.tsx`.
  Löschen mit Bestätigung, Rückgängig legt denselben Stand (samt `angelegt`) zurück.
- **D-150.10 S6.** `standAlsNeuesLv` hängt `PreisspiegelEinstellungenSetzen` an, wenn der Stand Einstellungen trägt;
  `LvStandSeite` führt die Folge als einen Undo-Schritt aus.
- **D-150.11 Einlesen (E8, D-84).** Die Projektliste ruft `projektdateiEinlesen` immer mit `einstellungsuebernahme`; bei
  `existiert-bereits` fragt ein Dialog „Projekt schon vorhanden“ mit Namensfeld (Vorschlag „<Name> (Kopie)“) und „Als Kopie
  einlesen“/„Abbrechen“. Trägt die Datei Einstellungen, nennt der Dialog „Projektdatei eingelesen“, was übernommen und was
  belassen wurde; danach liest die Sitzung die Einstellungen neu.
- **D-150.12 Punkt 7.** `lv/befehlsweg.ts` importiert `projektBefehlAusfuehren` aus `@tethys/vergabe` (eine Zeile).

Außerhalb der genannten Ordner (vom Ticket erzwungen, je klein): `lv/befehlsweg.ts` (Import, Punkt 7), `lv/StaendeDialog.tsx`
und `lv/LvStandSeite.tsx` (Bedienung der Stände, S6; die Logik liegt in `historie/`), `hilfe/texte.ts` (ein Satz nannte
„Stammdaten ändern“), `GLOSSARY.md` (Zeile „Projektangaben ändern“ der Benennungstabelle), E2E `projekt.spec.ts` und
`druckprofil.spec.ts` (Erwartungen an den neuen Dialog bzw. an die Einstellungen statt des Browserspeichers).

Ergebnis (nach dem Merge von `integration/welle-7` samt 146): `pnpm lint` und `pnpm typecheck` grün. `pnpm test`: 4506 grün,
3 übersprungen, 8 rot, alle Leistungsbudgets unter Last (Lastmittel 24–27 auf 4 Kernen: `gaeb` lesen 2 MB, `kern` lvPruefen
gross und Mengenansatz, `speicher` v16-leistung ×2 und aufmass-leistung, `vergabe` Preisspiegel, web `abrechnung/leistung`); keine
Datei dieses Tickets, nichts gelockert. E2E: neu `einstellungen.spec.ts` (5), dazu `druckprofil`, `projekt`, `undo`,
`erster-start`, `kosten`, `ausgabe` – 29/29 grün; vor dem Merge zusätzlich `sicherung`, `start`, `huelle` grün.

## Answer

Gemergt nach `integration/welle-7` mit `3ee47d7`. Ergebnisse, Testläufe und Entscheidungen (D-150.x) unter `## Comments`.
