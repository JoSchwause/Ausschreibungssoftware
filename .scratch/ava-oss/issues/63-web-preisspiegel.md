# 63: V3: Preisspiegel-Ansicht in der App

Status: resolved
Type: task
Welle: 4 · Strang: V3 · Paket: `apps/web` (Ordner `src/vergabe/`; Einhängestellen in `App.tsx`/`lv/LvSeite.tsx`, D-20)
Blocked by: 60 (`VergleichsGrid`), 51 (Fixtures)
Regeln: U1–U8, N1, N4, A5, G-26, D-05, D-36.1, D-44.1, Q2
Herkunft: `plan.md` §2 V3, Tor M3

## What to build

Eine Seite „Preisspiegel“ zu einem LV (Route z. B. `/projekt/<id>/lv/<id>/preisspiegel`, erreichbar von der LV-Seite und aus
der Angebotsliste aus Ticket 49):

1. Daten: LV-Zustand, alle Angebote des LV, Projekt (Bieternamen); Rechnung nur über `preisspiegelBerechnen` aus `vergabe`
   (die App rechnet nichts selbst, A5). Darstellung im `VergleichsGrid` aus `ui-grid` (U2): je Bieter EP und GP, virtuelle
   Bieter Min/Mittel/Max, optional Schätzpreis des LV; Kennzeichen Ausreißer hoch/niedrig, nicht angeboten, Nullpreis,
   Zuschlagssatz fehlt, ABC-Klasse; Gliederungssummen je Bieter; Summenzeilen Netto, Nachlass, Netto nach Nachlass, MwSt,
   Brutto, Bedarfs- und Wahlsumme (F4), **Rang**.
2. Einstellungen (G-26: einstellbar): Ausreißer-Schwelle in % (Standard 20), ABC-Schwelle A (Standard 80 %), Bezug der
   ABC-Klasse; Spalten ein/aus (EP, GP, virtuelle Bieter). Nicht gespeichert (Sitzungszustand genügt; vermerken).
3. Zellen-Details: aktive Zelle zeigt in einer Leiste Bieter, Position, Kennzeichen-Erklärung in Worten.
4. Zahlen de-DE über `dezimal` (N4).

## Grenzen

- Nur `apps/web/src/vergabe/` plus je eine markierte Einhängestelle. Keine Änderung an Paketen; fehlt etwas in `vergabe`
  oder `ui-grid`, melden.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] E2E: Projekt mit `typisch` und den drei Angeboten aus `typisch-angebote` (über den vorhandenen Testweg oder X84 aus
      Ticket 69, falls schon gemergt) → Preisspiegel zeigt je Bieter Netto, Netto nach Nachlass, Brutto und Rang gleich den
      Sollwerten der Fixture; ein Ausreißer und ein „nicht angeboten“ sind sichtbar und per Tastatur erreichbar
- [x] Schwelle ändern ändert die Kennzeichen (E2E)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Zuschlag erteilen (Ticket 64), Drucken/Excel des Preisspiegels, Speichern der Einstellungen.

## Comments

### Umsetzung (Branch `welle-4/63-preisspiegel`)

Nur `apps/web/src/vergabe/` plus je eine markierte Einhängestelle (`// Ticket 63`): Route in `App.tsx`, Link in der
Werkzeugleiste von `lv/LvSeite.tsx`, Link im Fuß der Angebotsliste in `gaeb/Angebote.tsx`. Keine Paketänderung; in
`vergabe` und `ui-grid` fehlte nichts.

- `ansicht.ts` (rein): `preisspiegelRechnen` (einziger Aufruf von `preisspiegelBerechnen`), `preisspiegelAnsicht`
  (Spalten, Zeilen, Summenzeilen, Kennzeichentexte für das `VergleichsGrid`), `zellDetail` (Detailleiste). Formatieren
  nur über `dezimal`. `einstellungen.ts`: `schwelleLesen` (de-DE-Prozent, meldet statt zu sperren).
- `PreisspiegelSeite.tsx` (`/lv/<id>/preisspiegel`), `Einstellungen.tsx`, `Detailleiste.tsx`, `Bieteruebersicht.tsx`,
  `PreisspiegelLink.tsx`, `texte.ts`, `vergabe.css`.
- Tests: `ansicht.test.ts` (typisch über den Kern, die drei X84 aus Ticket 69 über `angebotLesen` der App; Sollwerte aus
  `typisch-angebote.json`), `einstellungen.test.ts`, `e2e/preisspiegel.spec.ts` (drei X84 über die Oberfläche; Summen,
  Rang, Ausreißer, nicht angeboten, Schwelle 200 % → keine Ausreißer, Spalten aus).

**Für Ticket 64:** `Bieteruebersicht` hat die Eigenschaft `aktion?: (a: Anbieter) => ReactNode` (eigene Spalte „Aktion“
je Bieter, nach Rang sortiert); in `PreisspiegelSeite.tsx` steht die Stelle als Kommentar. Die Seite lädt bei jedem
Undo/Redo neu (`beiHistorie`); nach einem eigenen Befehl (Zuschlag) muss sie `setLauf` auslösen oder ebenfalls über
`beiHistorie` gehen. Spaltenkennungen: `<angebotId>:ep|gp`, `min|mittel|max|schaetzpreis:ep|gp`; Summenzeilen
`summe:<netto|nachlass|nettoNachNachlass|mwst|brutto|bedarf|wahl|rang>`. Die E2E-Hilfe `zurZelle` in
`preisspiegel.spec.ts` findet eine Zelle per Tastatur über den Gruppenkopf des Bieters.

Entscheidungen (Frage → Entscheidung → Grund):

- **D-63.1** Route? → `/lv/<id>/preisspiegel` statt `/projekt/<id>/lv/<id>/preisspiegel` → Die LV-Seite heißt schon
  `/lv/<id>` (Stände: `/lv/<id>/stand/<id>`); das LV kennt sein Projekt. Reversible: yes.
- **D-63.2** Rechnung und Ansicht getrennt → `preisspiegelBerechnen` nur bei neuem Stand oder neuer Schwelle/neuem
  Bezug (`useMemo`); Spalten ein/aus, Aufklappen und aktive Zelle bauen nur die Ansicht neu. Schwellen gelten mit Enter
  oder beim Verlassen des Felds, nicht je Tastendruck → `gross` mit 5 Angeboten rechnet etwa 0,5 s (D-36.1).
  Reversible: yes.
- **D-63.3** Einstellungen → Sitzungszustand der Seite (React-State), nicht gespeichert, Hinweis am Feld („Gilt nur für
  diese Sitzung“). ABC-Schwelle B bleibt 95 % (nicht im Ticket einstellbar). Eine unlesbare, negative oder bei ABC über
  100 liegende Eingabe meldet am Feld und lässt die geltende Schwelle stehen (U5). EP und GP lassen sich nicht beide
  ausblenden (die letzte Preisspalte ist gesperrt). Reversible: yes.
- **D-63.4** Wo stehen Kennzeichen? → Am verglichenen Wert: EP, an einer Zuschlagsposition der Betrag (GP); ist diese
  Spalte aus, an der anderen. Nicht doppelt → weniger Elemente je Zeile (Bildrate, D-60.10). Min/Max nur, wenn Min und
  Max verschieden sind; Ausreißer mit Tooltip „Mittel …“; „Basis unvollständig“ als `hinweis`; „Zuschlagssatz fehlt“
  (`%`) und „geht nicht in die Summe ein“ (`( )`, am Kurztext) als eigene Kennzeichen. Nicht angeboten: leerer Text mit
  der Marke „–“ (TSV-Kopie bleibt eine leere Zahl). Reversible: yes.
- **D-63.5** ABC-Klasse → eigene schmale Spalte „ABC“ mit dem Buchstaben und dem Tooltip „ABC-Klasse …“, kein
  Kennzeichen → der Buchstabe ist selbst schon Text (U8). Reversible: yes.
- **D-63.6** Zuschlagsposition → EP-Feld zeigt den Satz des Bieters („8,51 %“, Tooltip mit Basis), GP den Betrag; in der
  Altform den EP. Virtuelle Bieter: EP leer, GP die Beträge (D-44.1). Reversible: yes.
- **D-63.7** Summenzeilen → Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto, Bedarfssumme (ohne Gesamtbetrag),
  Wahlsumme, Rang; Werte in der GP-Spalte des Bieters (ohne GP im EP). Netto der virtuellen Bieter und des Schätzpreises
  in der Zeile „Netto“ (ohne Nachlass, Tooltip). Gliederungssummen nur je Bieter (`vergabe` liefert keine virtuellen
  Gliederungssummen; die App rechnet sie nicht). Hinweistexte erscheinen nicht. Die Zahl der nicht angebotenen
  Positionen steht in der Bieterübersicht, nicht im Grid (Platz). Reversible: yes.
- **D-63.8** Bieterübersicht unter dem Grid → Tabelle je Bieter nach Rang: Rang, Netto, Netto nach Nachlass, Brutto,
  nicht angebotene Positionen; Ort für „Zuschlag erteilen“ (Ticket 64). Spaltenfolge im Grid: Schätzpreis, Bieter nach
  Namen, Min, Mittel, Max. Reversible: yes.
- **D-63.9** Ausreißer-Erwartung der E2E → aus `ausreisserAnnahmeA7` der Fixture (Bieter C: 02.0050, 03.0030, 03.0080),
  ohne 03.0080: dort bietet C 0,000, nach D-05 ein Nullpreis und nie Ausreißer (A7 zählt Nullen mit). „Schwelle ändern“
  prüft 200 %: Bei drei Bietern liegt ein Preis > 0 höchstens 200 % über und weniger als 100 % unter dem Mittel, also
  verschwinden alle Ausreißer (aus der Regel hergeleitet, nicht aus dem Kern). Reversible: yes.

## Answer

Gemergt auf `integration/welle-4` mit Merge-Commit 51ebd1c; Review-Befunde behoben in `fix/welle-4-review` (847aa43, siehe `../review-welle-4.md`).
