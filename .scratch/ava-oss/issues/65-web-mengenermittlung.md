# 65: M2: Mengenermittlungs-Panel

Status: resolved
Type: task
Welle: 4 · Strang: M2 · Paket: `apps/web` (Ordner `src/mengen/`; Einhängestelle im Positionsdialog bzw. `lv/LvSeite.tsx`, D-20)
Blocked by: 56 (Kern: `MengenansatzSetzen`), 57 (Speicher: Mengenansatz)
Regeln: A3, A5, N1, N4, U3, U5, U7, Q5, D-22, D-35a
Herkunft: `plan.md` §2 M2, Ticket 35 (Formelparser, freier Rechenansatz Formel 91)

## What to build

Ein Panel zur Mengenermittlung einer Position (aufrufbar per Tastatur aus dem Grid, z. B. Strg+M, und im Positionsdialog):

1. Tabelle der Ansatzzeilen: Zeilennummer, Formel (zunächst nur 91, als Auswahl), Ausdruck, Variable; Zeilen per Tastatur
   anlegen, löschen, verschieben. Jede Zeile zeigt ihr Ergebnis bzw. den Fehler mit Spalte (aus `mengenansatzBerechnen` in
   `mengen`; die App rechnet selbst nichts, N1). Summe unten; Einheit der Position daneben.
2. „Übernehmen“ schickt **einen** Befehl `MengenansatzSetzen` mit Ansatz und Summe (bei Fehler `menge: null`, D-22 (b)).
   Ein Undo-Schritt. Wiederöffnen zeigt den gespeicherten Ansatz.
3. Hat eine Position einen Ansatz und der Nutzer ändert die Menge direkt im Grid, fragt die App vorher („Mengenansatz wird
   entfernt“, D-22 (a)); Abbrechen lässt alles unverändert. Positionen mit Ansatz tragen im Grid ein Kennzeichen (über die
   vorhandene Hinweis-/Merkmalsdarstellung; braucht das eine Grid-Änderung, melden statt ändern).
4. Formeln und Zwischenstellen aus `MENGEN_ANNAHMEN`; Texte deutsch (L1).

## Grenzen

- Nur `apps/web/src/mengen/` plus markierte Einhängestellen. `apps/web` bekommt die Abhängigkeit `@tethys/mengen`.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] E2E: Ansatz mit drei Zeilen (eine mit Variable, eine fehlerhaft, dann korrigiert) → Menge und GP in der Zeile, Summen
      stimmen; Neuladen → Ansatz noch da; Undo stellt die alte Menge her; direkte Mengenänderung fragt nach
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Weitere REB-Formeln, Aufmaßblätter (A2), X31.

## Comments

### Aus Ticket 53 (Review, D-27)
- Die Rückfrage nach Lesart (a) braucht es auch im Positionsdialog (`apps/web/src/lv/positionsentwurf.ts`), nicht nur bei der Grid-Eingabe (die Grid-Eingabe läuft über `ui-grid/src/eingabe.ts`; braucht das Grid dafür eine Eigenschaft, melden).

### Ergebnis (Branch `welle-4/65-mengen-panel`, Basis `integration/welle-4`)

Nur `apps/web/src/mengen/` (Panel `MengenPanel.tsx`, Rückfrage `AnsatzFrage.tsx`, reine Teile `ansatz.ts` und `rueckfrage.ts`, Texte, CSS) plus markierte Einhängestellen `// Ticket 65` in `lv/LvSeite.tsx` und `lv/PositionsDialog.tsx` (`positionsentwurf.ts` blieb unberührt: die Erkennung liegt in `mengen/rueckfrage.ts`). Abhängigkeit `@tethys/mengen` in `apps/web`. Kein Paket außerhalb geändert, keine Grid-Änderung. E2E `e2e/mengen.spec.ts` (3 Tests); sie brauchen Ticket 57 (`speicher` weist `mengenansatz` sonst mit `unbekannt` ab), mit dem Branch `welle-4/57-speicher-v1.3` zusammengeführt waren alle drei grün.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-65.1 Tastenkürzel.** Strg+M (Ticket: „z. B.“)? Nein: Strg+Alt+E („Ermittlung“) und eine Schaltfläche „Mengenermittlung“ in der Werkzeugleiste, dazu im Positionsdialog „Mengenermittlung …“. Grund: Die App-Kürzel der LV-Seite sind Strg+Alt+Buchstabe (Strg+Alt+M ist „Merkmale“); Strg+M schaltet in Firefox den Tab stumm.
- **D-65.2 Kennzeichen im Grid.** Das Grid kennt nur Befunde als Hinweisdarstellung (Warnzeichen und Text an der Zelle). Die App legt je Position mit Ansatz einen Befund `mengenansatz` (Warnung, an der Mengenzelle) in `LvZeile.befunde`, aber nicht ins Prüf-Panel (nur im Grid). Das Warnzeichen ist nicht ganz treffend (es ist keine Warnung); eine neutrale Marke bräuchte eine Grid-Änderung (`ui-grid`, eigene Zellmarke aus einer neuen `LvZeile`-Eigenschaft). Gemeldet statt geändert.
- **D-65.3 Zeilennummern und Formelauswahl.** Die Zeilennummer ist nicht bearbeitbar: neue Zeile = größte Nummer + 1, Löschen und Verschieben nummerieren nie um (ein Bezug `Z3` behält seinen Sinn; „früher“ heißt ohnehin weiter vorn in der Folge, D-35a). Die Formel ist ein natives `select` (Zeilentabelle, Tastatur) mit den Nummern aus `FORMELN`; bisher nur 91 „Freier Rechenansatz“.
- **D-65.4 Leere Zeilen und leerer Ansatz.** Ganz leere Zeilen (weder Ausdruck noch Variable) zählen nicht und gehen nicht in den Befehl. Sind alle Zeilen weg: hat die Position einen Ansatz, entfernt Übernehmen ihn (`mengenansatz: null`, `menge` bleibt die gespeicherte); sonst schließt Übernehmen ohne Befehl. Ein unveränderter Ansatz schickt keinen Befehl (kein leerer Undo-Schritt).
- **D-65.5 Tasten im Panel.** Enter legt eine Zeile hinter der aktuellen an, Strg+Entf löscht, Alt+Pfeil hoch/runter verschiebt (wie im Grid), Strg+Enter übernimmt; Schaltflächen gibt es auch. Der Fehler einer Zeile ist eine Schaltfläche, die das Feld an der Fehlerspalte markiert (Spalte ab 1 angezeigt, `mengen` zählt ab 0).
- **D-65.6 Rückfrage.** Wo: jede Befehlsfolge, die das Grid sendet (`onBefehl`, `onBefehlsfolge`, also auch Einfügen und Entf in der Mengenzelle) und „Übernehmen“ im Positionsdialog. Gefragt wird nur bei einem `MengeAendern` mit anderer Menge an einer Position mit Ansatz (dieselbe Menge ändert nichts, D-56.2). Abbrechen: kein Befehl; das Grid zeigt ohnehin nur den gespeicherten Stand (Q5), der Positionsdialog bleibt mit seinem Entwurf offen. Anfangsfokus auf „Abbrechen“.
- **D-65.7 Panel im Positionsdialog.** Das Panel liegt als zweiter Dialog über dem Positionsdialog; seine Befehle gehen über dieselbe Befehlsfolge wie „Übernehmen“ des Positionsdialogs, die Eingaben des Positionsdialogs bleiben erhalten (`entwurfNachfuehren` zeigt die neue Menge, solange die Menge nicht angefasst wurde).

## Answer

Gemergt auf `integration/welle-4` mit Merge-Commit b60ca0b; Review-Befunde behoben in `fix/welle-4-review` (847aa43, siehe `../review-welle-4.md`). Neutrales Kennzeichen für Positionen mit Ansatz braucht `ui-grid`: Ticket 74.
