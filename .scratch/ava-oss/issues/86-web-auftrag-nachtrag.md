# 86: A1 in der App: Auftrags-LV lesen und umkehren über den Vertrag, Nachträge

Status: resolved
Type: task
Welle: 5 · Strang: A1 · Ordner: `apps/web/src/auftrag/`, `apps/web/src/nachtrag/` (neu); Einhängestellen in `App.tsx`,
`lv/LvSeite.tsx`, `lv/befehlsweg.ts`, `projekt/ProjektSeite.tsx` (markiert `// Ticket 86`, D-20)
Blocked by: 71, 79, 80
Regeln: A5, U3, U5, U7, Q2, Q5, D-20, D-21, D-35, D-64.2, D-64.4
Herkunft: Tickets 70/71 (App-Teil), `plan.md` §2 A1

## What to build

1. **Umwege zurückbauen:** Auftrags-LVs über `speicher.auftragsLeistungsverzeichnisse` laden statt aus dem
   Projektdatei-Export (D-64.2); Umkehrung der Auftrags-LV-ChangeSets mit `auftragsLvChangeSetUmkehren` aus dem Kern statt der
   LV-Umkehrung mit umgedeuteter Kennung (D-64.4); `m3.spec.ts` bleibt grün.
2. **Nachtrag anlegen:** auf der Auftrags-LV-Seite „Nachtrag anlegen“: legt ein neues Ausschreibungs-LV an (gleiche OZ-Maske
   und MwSt wie das Auftrags-LV, Name „Nachtrag N<nn> – <Bezeichnung>“) und setzt `Nachtragsangaben` (nächste freie Nummer
   `N01`, `N02`, …; Status `angemeldet`) – als Befehlsfolge mit einem Undo-Schritt. Danach öffnet sich die LV-Seite des
   Nachtrags; dort zeigt ein Kopfband „Nachtrag N01 zu <Auftrags-LV> · Status“ mit Statuswahl (angemeldet, angeboten,
   abgelehnt; `beauftragt` nur über Punkt 3) und Link zurück.
3. **Nachtrag beauftragen:** Das Angebot des Auftragnehmers zum Nachtrags-LV entsteht auf den vorhandenen Wegen (X84 einlesen,
   Excel-Rücklauf oder Erfassung; Bieter = Bieter des Auftrags). „Beauftragen“ auf dem Kopfband bzw. in der Nachtragsliste:
   `nachtragUebernehmen` (`abrechnung`) → Vorschau (Zahl der Positionen, Summe, Warnungen) → bestätigen → Befehlsfolge
   `NachtragUebernehmen` (Auftrags-LV) + `NachtragsangabenSetzen { status: 'beauftragt' }` (Nachtrags-LV), ein Undo-Schritt
   (D-35: erst übernehmen, dann Status).
4. **Nachtragsliste** auf der Auftrags-LV-Seite: Nummer, Bezeichnung, Status, Summe des Angebots (netto), Link; Befunde aus
   `nachtragsbefunde` als Hinweis (U5). Die Auftrags-LV-Seite zeigt übernommene Nachtragspositionen wie die übrigen (schreib-
   geschützt). Auf der Projektseite stehen Nachtrags-LVs in der LV-Liste mit Kennzeichen „Nachtrag N01“.
5. **E2E** `apps/web/e2e/nachtrag.spec.ts`: Zuschlag (wie M3) → Nachtrag anlegen → zwei Positionen → Angebot des AN erfassen
   → beauftragen → Auftrags-LV zeigt die Gliederung „Nachtrag N01“ und die neue Summe → Rückgängig/Wiederholen → Neuladen.

## Grenzen

- Kein Bearbeiten des Auftrags-LV außer über die Befehle aus v1.4. Aufmaß, Rechnung, Kosten sind andere Tickets (87–89);
  lass auf der Auftrags-LV-Seite eine markierte Einhängestelle für deren Links (`{/* Ticket 87–89: Abrechnung */}`).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Unit-Tests der Logik (Nummernvergabe, Befehlsfolgen), E2E `nachtrag.spec.ts` und `m3.spec.ts` grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün,
      `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test e2e/nachtrag.spec.ts e2e/m3.spec.ts`

## Nachträge aus dem Review von v1.4 (D-42)

- D-42: Auf der LV-Seite eines Nachtrags-LV keinen „Zuschlag erteilen“ anbieten (der Weg ist „Beauftragen“, Punkt 3);
  `zuschlagErteilen` weist ein Nachtrags-LV ohnehin ab.
- LV-Liste und Nachtragsliste lesen `LvUebersicht.nachtrag`/`vorlage` (D-43) statt ganze LVs zu laden.
- Die neue ChangeSet-Art des Auftrags-LV (`NachtragUebernehmen`) über `auftragsLvChangeSetUmkehren` umkehren.

## Comments

### Umsetzung (Branch `welle-5/86-nachtrag`)

Getestete Schnittstellen (Demo-Modus, statt Abstimmung mit dem Nutzer): `nachtrag/nachtrag.ts` rein
(`naechsteNachtragsnummer`, `nachtragAnlegenPlanen`, `nachtragBeauftragenPlanen`, `nachtragsangebot`; Vitest mit den
Sollwerten des Tors M4 aus `typisch-abrechnung.json`), `nachtrag/speichern.ts` auf dem Befehlsweg gegen einen echten
In-Memory-Speicher (`nachtragAnlegen`, `nachtragBeauftragen`, `nachtraegeLaden`, Undo/Redo), `auftrag/auftrag.ts`
(`auftragsLvsLaden` ohne Export der Projektdatei), E2E `nachtrag.spec.ts`.

Neu in `src/nachtrag/`: `nachtrag.ts`, `speichern.ts`, `texte.ts`, `NachtragAnlegen.tsx` (Knopf und Dialog auf der
Auftrags-LV-Seite), `NachtragKopfband.tsx` (LV-Seite des Nachtrags), `BeauftragenDialog.tsx` (Vorschau, Bestätigen),
`Nachtragsliste.tsx` (Auftrags-LV-Seite), `NachtragKennzeichen.tsx` (Projektseite), `nachtrag.css`. In `src/auftrag/`:
`auftrag.ts` liest über `speicher.auftragsLeistungsverzeichnisse` (D-64.2 entfällt), die eigene Umkehrung ist weg
(D-64.4 entfällt); `AuftragsLvSeite.tsx` lädt per `laden(id)`, trägt „Nachtrag anlegen“, die Nachtragsliste und die
Einhängestelle `{/* Ticket 87–89: Abrechnung */}` in der Werkzeugleiste; `Verweis.tsx` (aus der Seite herausgelöst);
`zuschlagserteilung.ts` nennt bei einem Nachtrags-LV den Weg „Beauftragen“ (D-42). Einhängestellen (`// Ticket 86`):
`lv/befehlsweg.ts` (Import von `auftragsLvChangeSetUmkehren` aus dem Kern), `lv/LvSeite.tsx` (Kopfband),
`projekt/ProjektSeite.tsx` (Kennzeichen). `App.tsx` brauchte nichts (das Nachtrags-LV ist ein LV unter `/lv/<id>`).
Neue Abhängigkeit `@tethys/abrechnung` in `apps/web` (Workspace-Paket, Lockfile).

- **D-86.1** Nächste Nachtragsnummer? → Höchste vergebene Nummer der Form `N<Ziffern>` (Groß/klein egal) des Auftrags-LV
  plus 1, mindestens zweistellig (`N01` … `N99`, `N100`); frei vergebene andere Nummern zählen nicht. → Wie
  `naechsteAufmassnummer` (höchste + 1): eine zurückgenommene Nummer kommt nicht unbemerkt wieder. Gelesen aus
  `LvUebersicht.nachtrag` (D-43), in der Kette des Befehlswegs (kein Doppel bei doppeltem Klick). Reversible: yes.
- **D-86.2** Kopf des neuen Nachtrags-LV? → Nur OZ-Maske und MwSt-Satz des Auftrags-LV (wie das Ticket), kein Nachlass,
  keine Knoten; Name „Nachtrag N01 – <Bezeichnung>“, ohne Bezeichnung nur „Nachtrag N01“. Auftraggeber und
  Vergabeinformationen werden nicht kopiert. Reversible: yes.
- **D-86.3** Welches Angebot ist das Nachtragsangebot? → Das Angebot zum Nachtrags-LV mit dem Bieter des beauftragten
  Angebots; bei mehreren das zuletzt angelegte (größte UUIDv7), mit Hinweis in der Vorschau. Kein Angebot: kein
  „Beauftragen“, der Grund nennt die Wege (X84/Excel, Bieter = Auftragnehmer). Reversible: yes.
- **D-86.4** Kennzeichen „Nachtrag N01“ auf der Projektseite → aus dem Kopf des schon geladenen LV
  (`LvZustand.leistungsverzeichnis.nachtrag`, dieselben Daten wie `LvUebersicht.nachtrag`). Die Projektseite lädt jedes LV
  weiter ganz (Netto, Löschen; Folgeticket aus v1.3), ein Umbau gehört nicht in eine Einhängestelle. Die Nachtragsliste
  und die Nummernvergabe lesen dagegen nur `LvUebersicht` und laden nur die Nachtrags-LVs (D-43). Reversible: yes.
- **D-86.5** Statuswahl → angemeldet, angeboten, abgelehnt wählbar; `beauftragt` steht in der Liste, ist aber nicht wählbar
  (nur über „Beauftragen“). Ein Statuswechsel weg von `beauftragt` sperrt nicht (U5); die Nachtragsliste zeigt dann den
  Befund `uebernommen-nicht-beauftragt`. „Beauftragen“ nur bei `angemeldet` oder `angeboten`; sonst aus, mit Grund
  daneben (`aria-describedby`). Reversible: yes.
- **D-86.6** „Beauftragen“ auf dem Befehlsweg → in der Kette frisch geladen und geplant (Vorschau im Dialog nur zur
  Anzeige), dann `NachtragUebernehmen` (Kern, Speicher, Protokoll) und `NachtragsangabenSetzen { beauftragt }` über
  `lvBefehlAnwenden`, beide Teile ein Undo-Schritt; die offene LV-Sitzung des Nachtrags bekommt den neuen Stand
  (`Sitzung.setze`). Weist der Speicher den Status ab, bleibt die Übernahme als eigener Undo-Schritt und die Meldung sagt
  es (Befund in der Liste). Kein Eingriff in `befehlsweg.ts` außer dem Import. Reversible: yes.
- **D-86.7** Ziel nach Undo/Redo → unverändert die Regeln der Historie: Rückgängig der Beauftragung bleibt auf der Seite
  (letzter Teil ist die Übernahme, `auftragZiel` → bleiben); Wiederholen endet auf der LV-Seite des Nachtrags, weil der
  letzte Teil der Status ist (dort sichtbar). Rückgängig von „Nachtrag anlegen“ führt zur Projektseite (LV gelöscht).
  Eine eigene Regel in `historie/*` hätte eine nicht genannte Einhängestelle gebraucht. Reversible: yes.
- **D-86.8** D-42 „kein Zuschlag für ein Nachtrags-LV“ → Der Dialog „Zuschlag erteilen“ (eigener Ordner) zeigt statt der
  Meldung von `zuschlagErteilen` „Nachtrag N01 ist ein Nachtrags-LV und bekommt keinen Zuschlag. Er wird auf seiner
  LV-Seite beauftragt („Beauftragen“)“, Bestätigen ist aus. Der Knopf im Preisspiegel (`src/vergabe/`, kein Ordner dieses
  Tickets) bleibt sichtbar; ihn für Nachtrags-LVs auszublenden, wäre eine Zeile in `PreisspiegelSeite.tsx` (Folgepunkt
  für den Merger oder ein `vergabe`-Ticket). Der Preisspiegel-Link der LV-Seite bleibt (Vergleich der Angebote). Reversible:
  yes.
- **D-86.9** E2E → Bieter B (Auftragnehmer des Tors M4) statt A, damit alle Zahlen aus `typisch-abrechnung.json` kommen
  (Zuschlag 56.607,77; Angebot N01 1.445,24; danach 59.803,77 / 1.794,11 / 58.009,66 / 11.021,84 / 69.031,50). Das
  Nachtragsangebot kommt über den Excel-Rücklauf (Datei im Test aus dem gespeicherten Nachtrags-LV mit den EP der
  Fixture, wie `ausgabe.spec.ts`); X84 bräuchte eine Datei zu einem LV, das erst im Test entsteht. Reversible: yes.
- Nach Merge von `integration/welle-5` (6cb3f73): Lint, Typecheck grün; `pnpm test` 2471 bestanden, 1 rot nur in der vollen
  Suite: `packages/vergabe/src/leistung.test.ts` „preisspiegelBerechnen für gross mit 5 Angeboten unter 1000 ms“ mit
  1194,1 ms bei Last 16,9 (parallele Agenten); die Datei allein: 498,3 ms, grün. Nicht berührt, Budget nicht gelockert.
  E2E `nachtrag.spec.ts`, `m3.spec.ts`, `undo.spec.ts` grün (8/8), `nachtrag.spec.ts` dreimal hintereinander grün;
  vor dem Merge auch `preisspiegel.spec.ts`, `projekt.spec.ts` grün.

## Answer

Merged: a47b297 in integration/welle-5


Branch `welle-5/86-nachtrag` (enthält `integration/welle-5` bis 6cb3f73). Auftrags-LVs liest die App über
`speicher.auftragsLeistungsverzeichnisse` (D-64.2 entfällt), Undo/Redo kehrt sie mit `auftragsLvChangeSetUmkehren` des
Kerns um (D-64.4 entfällt). Nachträge: „Nachtrag anlegen“ auf der Auftrags-LV-Seite (LV + Nachtragsangaben, ein
Undo-Schritt, Nummer N01, N02, … aus `LvUebersicht.nachtrag`), Kopfband auf der LV-Seite des Nachtrags (Status, Link zurück,
„Beauftragen“), „Beauftragen“ mit Vorschau aus `nachtragUebernehmen` und dem Kern (Positionen, Angebotssumme,
Auftragssumme vorher/nachher, Hinweise), Befehlsfolge `NachtragUebernehmen` + Status `beauftragt` als ein Undo-Schritt,
Nachtragsliste mit Befunden aus `nachtragsbefunde`, Kennzeichen „Nachtrag N01“ auf der Projektseite; der Zuschlagsdialog
nennt bei einem Nachtrags-LV den Weg „Beauftragen“ (D-42). Einhängestelle `{/* Ticket 87–89: Abrechnung */}` in der
Werkzeugleiste der Auftrags-LV-Seite. Entscheidungen D-86.1 bis D-86.9. Offen: Der Knopf „Zuschlag erteilen“ im
Preisspiegel eines Nachtrags-LV bleibt sichtbar (Dialog sperrt; `src/vergabe/`, D-86.8); die Projektseite lädt LVs weiter
ganz (D-86.4).
