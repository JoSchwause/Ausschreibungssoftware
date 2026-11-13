# 137: Kern v1.7a: neue Befehle, Kalkulationsansätze, Projektangaben, Einstellungen

Status: done-by-agent
Type: task
Welle: 7 · Strang: K · Paket/Ordner: `packages/kern` (+ `packages/kosten`, falls die Kalkulationsansätze dort gerechnet werden)
Blocked by: 127
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A2, A5, A6, N1–N3, Q1, Q5; D-73
Herkunft: umfang §3 E8, E9, E10, E15; Ticket 123 Punkt 8 (`kern`-Doppelungen)

## What to build

Kern-Umsetzung der Befehle aus v1.7a (127), soweit sie im Kern liegen (Bieter und Zuschlag: 138). Je Befehl Unit-, Golden-
oder Eigenschaftstests wie bisher, inklusive Umkehrung (Undo-ChangeSet).

1. `LvStandUmbenennen`, `LvStandLoeschen` (`lv-stand.ts`).
2. Kalkulationsansätze und Zuschlagssätze an der Position setzen (Feldbefehl); `kosten/kalkulation.ts` rechnet aus den
   gespeicherten Ansätzen (reine Funktion, A2).
3. Projektangaben setzen (Nummer, Ort, Anschrift der Baustelle, Name, Bauherr).
4. `Einstellungen`: Befehle für Büro, Druckprofile, KG-Bezeichnungen (D-73), ohne Projekt-Undo.
5. Preisspiegel-Einstellungen am LV setzen (LV-Befehl, Undo).
6. Prüfen, dass `HinweistextAnlegen/Aendern` und `OzMaskeSetzen` (mit Prüfung vorhandener OZ, F2) für die Bedienung taugen
   (Fehlercodes für „Maske passt nicht zu vorhandenen OZ“ mit Liste).
8. **Aus dem Review (D-82):** M2 – `changeSetUmkehren` tauscht `lvStandInhalt`; Eigenschaftstest: Löschen und Undo ergeben einen Stand, der dem ursprünglichen gleicht (`angelegt` eingeschlossen). S3 – `KalkulationSetzen` an einer Zuschlagsposition → `knotenart-unzulaessig`; `PositionsmerkmaleSetzen` mit Zuschlag entfernt die Kalkulation im selben ChangeSet. S4 – Hinweis `kalkulation-entfernt` mit `knotenId`, wenn ein Preisbefehl die Kalkulation entfernt. M1 – Einstellungs-ChangeSets sind umkehrbar (Funktion für das Sitzungs-Undo der App). S9 – den Normalisierer der Bieterangaben exportieren (`vergabe` nutzt ihn). S5 – Befehlsname `PreisspiegelEinstellungenSetzen`, sobald der Vertragsnachtrag gemergt ist.
7. Ticket 123 §8: die `kern`-Doppelungen aus 122 Punkt 20; die Konstanten aus 127 nutzen.

## Acceptance criteria

- [x] Jeder neue Befehl mit Test und Umkehrung; Einzeländerung < 16 ms bei 5.000 Positionen unverändert
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (eng gelesen; die Lesarten D-127.1 bis D-127.17 und D-82 gelten unverändert):

- **D-137.1 Leerer Name beim Umbenennen eines Stands.** Frage: Der Vertragstext zu `LvStandUmbenennen` sagt „darf leer sein wie
  bei `LvStandAnlegen`“, der Kern weist beim Anlegen aber einen leeren Namen ab (Ticket 42). Entscheidung: wie beim Anlegen,
  `ungueltige-eingabe` mit `feld: 'name'` (Leerraum zählt als leer). Grund: „wie bei `LvStandAnlegen`“ ist die Begründung des
  Vertrags; ein namenloser Stand ist in der Liste nicht zu finden. Bitte im Vertragsnachtrag den Satz angleichen.
- **D-137.2 Derselbe Name.** `LvStandUmbenennen` mit dem bisherigen Namen liefert ein leeres ChangeSet ohne `lvStand` (wie jeder
  LV-Befehl mit demselben Wert).
- **D-137.3 Feld im Formfehler.** Der Pfad im Befehl, ohne Zeilennummer: `einstellungen.abcSchwelleB` (A > B wird an B gemeldet),
  `kalkulation.ansaetze.art`, `kalkulation.zuschlagssaetze.<art>`, `angaben.baustelle.plz`, `bieter.angaben.email`,
  `buero.name`, `druckprofil.langtext.anzahl`, `bezeichnungen.nummer`. Fremdfelder, die ein Aufrufer mitbringt, fallen in der
  Normalform weg.
- **D-137.4 Kalkulation an einer Zuschlagsposition (D-82 S3, streng).** `KalkulationSetzen` an jeder Zuschlagsposition (mit Satz
  oder Altform) ist `knotenart-unzulaessig`, auch mit `kalkulation: null`, vor der Formprüfung. `PositionsmerkmaleSetzen` mit
  Zuschlag entfernt die Kalkulation im selben ChangeSet. Anlegen (Position, LV, Einfügen) einer Zuschlagsposition mit
  Kalkulation: `ungueltige-eingabe`, `feld: 'kalkulation'` (auch in `baumfehler`): Eine Zuschlagsposition trägt nie eine.
- **D-137.5 Normalform der Kalkulation.** Genau die Vertragsfelder, Sätze in der Reihenfolge der Kostenarten; ohne Ansatz und ohne
  Satz fehlt das Feld (auch beim Anlegen, `positionNormal`). Kein Wertcheck: negative Werte und Sätze unter −100 % sind Befunde
  in `kosten` (U5). `KalkulationSetzen` bildet den EP nicht aus den EPA (anders als `EinheitspreisanteileSetzen`); er legt ab, was
  kommt (A3).
- **D-137.6 Lesart (a) nur bei einer Änderung.** `EinheitspreisAendern` und `EinheitspreisanteileSetzen` entfernen die Kalkulation
  nur, wenn sie etwas ändern; derselbe EP bzw. dieselben Anteile lassen sie stehen (wie D-56.2). Menge, Texte und Merkmale ohne
  Zuschlag lassen sie stehen (sie gilt je Einheit).
- **D-137.7 LV aus einem Stand.** `LeistungsverzeichnisAnlegen` lässt ein zur Laufzeit mitgebrachtes `preisspiegel` weg (D-127.7);
  `nachtrag` und `vorlage` bleiben wie bisher (nicht Teil dieses Tickets).
- **D-137.8 Angaben an einer Stelle (`angaben.ts`).** `''` → `null`, leere Anschrift → `null`, ganz leere Angaben → Feld fehlt;
  Leerraum bleibt Text, kein Format von E-Mail, Telefon oder PLZ (U5); ein fehlendes Feld ist ein Formfehler. Für `vergabe`
  exportiert (D-82 S9): `bieterangabenFehler(wert, pfad)`, `bieterangabenNormalisieren` (Name wie in `vergabe`), `bieterMitAngaben`. Der Kern liest
  `verweise` bei Projektbefehlen nicht (kein Kernbefehl löscht etwas mit Verweisen); `ZuschlagZuruecknehmen` weist er
  ausdrücklich ab (D-127.17).
- **D-137.9 Einstellungen.** Ein Name (Büro, Druckprofil) und eine KG-Bezeichnung sind leer, wenn nur Leerraum; derselbe Wert
  liefert `nachher` = Zustand; unbekannte Befehlsart `befehl-nicht-zustaendig`. `einstellungenChangeSetUmkehren` (Tausch) und
  `einstellungenChangeSetAnwenden` (wirft bei abweichendem `vorher`, im Speicher ist das `konflikt`) für das Sitzungs-Undo
  (D-82 M1). Ob ein eigener Profilname einem mitgelieferten gleicht, sieht der Kern nicht (die App verhindert es).
- **D-137.10 OZ-Maske mit Liste (Punkt 6, D-127.14).** Die Codes bleiben die bisherigen von `OzMaskeSetzen` (`maske-ungueltig`,
  `oz-ueberlauf`, bei der Los-Stufe `knotenart-unzulaessig`), nicht `oz-ungueltig` (D-127.14 nennt es als Beispiel; ein
  Wechsel bräche vorhandene Tests und die Anzeige). `knotenIds` nur bei mindestens zwei Knoten, in Dokumentreihenfolge; eine
  Gliederung ohne Platz steht für ihren Teilbaum, Indexpositionen hinter einer Position ohne OZ werden mitgenannt.
  `Umnummerieren` bleibt beim ersten Fehler. `HinweistextAnlegen`/`HinweistextAendern` reichen ohne Änderung (vorhandene Tests).
- **D-137.11 `kosten` und Konstanten.** `kosten` nimmt `Kalkulationsansatz`/`Kalkulationszuschlagssaetze` aus dem Vertrag und
  reicht sie weiter (die App importiert sie unverändert); neu `kalkulationBerechnen(angaben, freiBezeichnung)`; `kgLesen` prüft
  gegen `KOSTENGRUPPENNUMMER_MUSTER`. `KOSTENGRUPPE_FORM` im Kern ist nur noch dieselbe Konstante unter altem Namen, bis
  `speicher` und `gaeb` umstellen (135/140). Weitere Kopien von `BAUTEILMENGENARTEN`, `STRUKTURKNOTENARTEN`, `MENGENART_STUECK`
  hat der Kern nicht.
- **D-137.12 Doppelungen (122 Punkt 20).** `kostengruppeWechsel` und `bauteileWechsel` laufen über `positionsfeldWechsel`;
  `positionMitBauteilen` und die neue `positionMitKalkulation` über `mitFeld`; `ANTEILE` liegt in `positionsfelder.ts`
  (weitergereicht aus `epa.ts`).
- **D-137.13 Hinweis `kalkulation-entfernt` (D-82 S4).** Nur wenn der Befehl eine vorhandene Kalkulation tatsächlich entfernt
  (`EinheitspreisAendern`, `EinheitspreisanteileSetzen`, `PositionsmerkmaleSetzen` mit Zuschlag), mit `knotenId` der Position
  und `feld: 'kalkulation'`; die Meldung nennt den Grund (Preis von Hand oder Zuschlagsposition). Die Umkehrung trägt wie jede
  keine Hinweise.
- **D-137.14 `EinstellungenUebernehmen` (D-127.8, D-127.9).** Der ganze Block wird geprüft wie bei den einzelnen Befehlen, mit
  Pfaden unter `einstellungen.` (etwa `einstellungen.druckprofile.seitenrand`); doppelte Profilnamen in der Datei sind außer
  Form (`einstellungen.druckprofile.name`, die Namen sind die Kennung). Übernommenes kommt in Normalform; übernimmt der Befehl
  nichts, ist `nachher` der Zustand selbst (`speicher` schreibt dann keinen Eintrag).
- **D-137.15 Last.** Unter Volllast (Lastmittel 13 bis 19 auf 4 Kernen) liefen im Gesamtlauf zwei Eigenschaftstests des Kerns
  (`eigenschaften.test.ts`, `summen-eigenschaften.test.ts`) in die 5-s-Grenze von Vitest und drei Leistungsbudgets in
  `speicher` (Aufmaßblatt, Modell 10.000 Bauteile, BauteileZuordnen) über ihre Grenze; einzeln laufen alle grün, und die
  Eigenschaftstests brauchen mit dem Kern vor diesem Ticket gleich lang (2,4 s/3,3 s gegen 2,6 s/3,4 s). Nichts gelockert.
- **Abschluss (Lauf am Ende, nach dem Merge von `integration/welle-7` mit 127-Nachtrag, 138 und 140).** Lint und Typen grün.
  `pnpm test`: 4.188 grün, 6 rot, alle sechs Leistungsbudgets unter Volllast (Lastmittel über 20 auf 4 Kernen: Kern
  Bauteilzuordnungen, `speicher` Aufmaßblatt, Modell 10.000 Bauteile und BauteileZuordnen, `vergabe` Preisspiegel, App
  Aufmaß-Undo); einzeln nacheinander laufen alle sieben Budgetdateien grün (D-137.15), nichts gelockert. E2E `kosten`, `lv`,
  `projekt`, `preisspiegel`: 10 von 10 grün.

