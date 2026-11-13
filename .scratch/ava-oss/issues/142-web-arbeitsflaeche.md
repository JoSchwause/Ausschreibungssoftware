# 142: App: Arbeitsfläche und Werkzeugleiste

Status: claimed
Type: task
Welle: 7 · Strang: U, E3 · Paket/Ordner: `apps/web/src/lv/`, `auftrag/`, `vergabe/` (Layout), `packages/ui-basis` (Werkzeugleiste, Menü)
Blocked by: 130, 131
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U1, U3, U4, U6, Q4
Herkunft: umfang §3 E3, B-05, B-06, B-08

## What to build

1. **Werkzeugleiste** als Baustein in `ui-basis`: Gruppen mit Radix-Menüs (Dropdown), Tastatur erreichbar; bei 1280 px eine
   Zeile. Dasselbe Muster auf LV-, Auftrags-LV- und Preisspiegelseite (und überall, wo heute Schaltflächenreihen stehen, sobald
   die jeweiligen Ordner-Tickets es übernehmen).
2. **LV-Seite:** 22 Schaltflächen in Gruppen (z. B. Bearbeiten, Einfügen, Struktur, Prüfen, Ausgabe, Austausch); Grid füllt die
   restliche Höhe; Prüf-Panel einklappbar, ohne Befunde zu; Summenfuß sichtbar und nicht von Meldungen überdeckt.
3. **Auftrags-LV:** Gesamtpreis sichtbar bei 1440 und 1280 px; Verweise einheitlich (Schaltfläche oder Menü).
4. **Preisspiegel:** Summenblock einklappbar, Bieterübersicht ohne Überlauf, Meldung überdeckt nichts.
5. **Ziel als Test (E2E):** bei 1280×800 zeigt die LV-Seite mit `typisch` (oder der BVBS-X83) mindestens 15 Zeilen und die
   Spalten EP und GP ohne waagerechtes Rollen; Auftrags-LV und Preisspiegel ohne waagerechten Überlauf.
6. **Aus 130:** an jedem `LvGrid` `spaltenbreitenSchluessel` (ein Schlüssel je Seite, z. B. `lv`, `auftrags-lv`, `lv-stand`) und `ozMaske={lv.ozMaske}` setzen; sonst merkt die App keine Breiten und misst die OZ nur aus sichtbaren Zeilen. Kürzel siehe `GRID_KUERZEL` (D-130.4: Alt+Umschalt+Pfeil ändert die Spaltenbreite).
8. **Aus 131 (D-131.7):** 131 nutzt `@radix-ui/react-dropdown-menu` direkt in `apps/web` (Projektseite, Menü „Weitere Aktionen“). Der gemeinsame Menübaustein gehört nach `ui-basis`; die Projektseite stellt darauf um (Abhängigkeit dann in `ui-basis`).
7. Specs nachziehen, die Schaltflächen der alten Leiste suchen (Rolle `menuitem` statt `button` usw.).

## Acceptance criteria

- [ ] E2E aus Punkt 5; alle Web-E2E grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/142-arbeitsflaeche`):

- **D-142.1** Nähte? → `packages/ui-basis/src/Werkzeugleiste.test.ts` (happy-dom: Gruppe zeigt Schaltflächen als
  Menüpunkte in Reihenfolge, Aktion erst nach dem Schließen, Dialog gibt den Fokus an den Auslöser zurück, Schaltflächen im
  Dialog bleiben Schaltflächen, gesperrt/Gefahr, Verweis außen und im Menü, Pfeile in der Leiste), `pruefstand` in
  `lv/pruefung.test.ts`, App-E2E `e2e/arbeitsflaeche.spec.ts` (Ziel aus Punkt 5). Mutation: ohne Aufschub der Aktion, ohne
  Sperre und ohne Schließen beim Verweis fallen je ein Test.
- **D-142.2** Wie kommen Schaltflächen anderer Ordner (`gaeb/`, `ausgabe/`, `kosten/`, `bim/`, `vorlage/`) ins Menü, ohne
  diese Ordner anzufassen (P2)? → In einer `Werkzeuggruppe` meldet sich der `Button` aus `ui-basis` (und der neue
  `Werkzeugverweis`) bei der Gruppe an, statt sich zu zeigen; die Bausteine bleiben unsichtbar im Baum, ihr Zustand und ihre
  Dialoge bestehen. `Dialog` setzt die Gruppe für seinen Inhalt zurück. Ein gewählter Punkt läuft erst, wenn das Menü zu ist
  und der Fokus auf dem Auslöser steht (ein Dialog gibt ihn beim Schließen dorthin zurück). Verworfen: jeden Baustein in
  Auslöser und Dialog teilen (Änderungen in sechs fremden Ordnern).
- **D-142.3** Gruppen der LV-Seite → Rückgängig und Wiederholen direkt; „Einfügen“ (Titel, Untertitel, Position, Aus Vorlage),
  „Bearbeiten“ (Position bearbeiten, Merkmale, Mengenermittlung, Mengen aus Modell, Kostengruppen, Kalkulieren), „LV“
  (LV-Angaben, Umnummerieren, Papierkorb, LV-Stände), „Ausgabe“ (GAEB, PDF, Excel für Bieter), „Angebote“ (Angebot und
  Excel einlesen, Angebote, Preisspiegel); „Prüfung“ als Schaltfläche mit Zahl. Tastenkürzel unverändert, im Menü sichtbar.
  Auftrags-LV: „Ausgabe“, „Nachtrag anlegen“, „Kostengruppen“, „Abrechnung“, „Prüfung“. Preisspiegel: „Summen“.
- **D-142.4** Prüf-Panel beim Öffnen der Seite zu, **auch mit Befunden** (weicht vom Wortlaut „ohne Befunde zu“ ab): `typisch`
  hat 26 Warnungen, die BVBS-X83 2 Fehler; mit 300 px Panel bleiben dem Grid 750 px, die Spalten brauchen rund 1.030 px, EP und
  GP wären nicht zu sehen (Punkt 5). Die Schaltfläche „Prüfung“ zeigt die Zahl (Farbe nach der schwersten Schwere), F8
  blendet ein und fokussiert, Escape oder das Kreuz blenden aus (Fokus zurück auf die Schaltfläche). Nicht gemerkt.
- **D-142.5** Meldungen (Toast) oben rechts über dem rechten Teil der Kopfzeile statt unten rechts: unten stehen Summenfuß,
  Nachlass/MwSt und die Bieterübersicht, unter der Kopfzeile das Ende der Werkzeugleiste. Eine Meldung überdeckt kurz nur
  den Hell/Dunkel-Schalter und leeren Platz neben dem Seitentitel; erst zwei Meldungen zugleich reichen bis zur Leiste.
- **D-142.6** Preisspiegel: Summenblock eingeklappt, bis „Summen“ ihn öffnet (nicht gemerkt); die Summen je Bieter stehen in
  der Bieterübersicht. Die Bieterübersicht nimmt ihre Breite, die Detailleiste den Rest (kein Überlauf mehr bei 1280 px).
- **D-142.7** Auftrags-LV: Aufmaß, Soll/Ist, Rechnungen und Aufmaß aus Modell einheitlich im Menü „Abrechnung“, als echte
  Verweise (`Werkzeugverweis`, Mittelklick geht); Pfade und Texte aus `abrechnung/`, `rechnung/`, `bim/` nur importiert.
  `abrechnung/Verweis.tsx` (`AbrechnungVerweise`) wird dadurch nicht mehr benutzt; nicht gelöscht (fremder Ordner, P2).
- **D-142.8** Nachlass, Nachlass als und MwSt-Satz in einer Zeile, Beschriftung links (rund 40 px mehr für das Grid: 16
  Zeilen mit `typisch` und der BVBS-X83 bei 1280×800).
- **D-142.9** Aus 130: `spaltenbreitenSchluessel` `lv`, `auftrags-lv`, `lv-stand` und `ozMaske` an allen drei LV-Grids.
- **D-142.10** Aus 131: Die Projektseite nutzt für „Weitere Aktionen“ die `Werkzeuggruppe` (ohne Pfeil); die Abhängigkeit
  `@radix-ui/react-dropdown-menu` wandert von `apps/web` nach `ui-basis`, die Menüregeln in `projekt.css` entfallen.
- **D-142.11** Tastatur in der Leiste: Tab wie bisher, zusätzlich Pfeil links/rechts, Pos1, Ende zwischen den Elementen (kein
  Roving-Tabindex, damit bestehende Tab-Wege bleiben).
- **D-142.12** Specs: Hilfe `e2e/werkzeuge.ts` (eigene Datei, um `hilfen.ts` von 132 nicht zu berühren); in 21 Specs nur die
  Zeilen der Leiste, des Prüf-Panels und der Summen geändert, keine Meldungsprüfung.
