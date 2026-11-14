# 162: Fokus nach dem Löschen eines Druckprofils

Status: resolved
Type: task
Welle: 7 · Strang: O, E15 · Paket/Ordner: `apps/web/src/ausgabe/` (Druckprofile), `apps/web/e2e/druckprofil.spec.ts` nur falls der Test selbst falsch ist
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, Q2, Q5; D-150
Herkunft: Prüflauf der Integration (Commit `1dbfdca`): `apps/web/e2e/druckprofil.spec.ts:127` (Test ab :84) fällt 3 von 3, auch allein

## What to build

Nach dem Bestätigen „Profil löschen“ hält keine Option der Profilliste den Fokus; die Hilfe `profilInAuswahl` (`druckprofil.spec.ts:50`,
`expect(liste.locator(':focus')).toHaveCount(1)`) findet nichts. Vermutlich aus 150 (Löschen mit Rückfrage, Einstellungs-Undo,
`a980228`) gegen die Hilfe aus `f07509f`. Ursache finden: Nach dem Löschen soll der Fokus auf einer sinnvollen Option liegen
(das nächste Profil, sonst „Standard“), wie bei Tastaturbedienung erwartet (U3). Nicht den Test abschwächen; nur wenn der Test eine
falsche Erwartung hat, ihn mit Begründung anpassen. Zweimal hintereinander grün, dazu `einstellungen.spec.ts` und `ausgabe.spec.ts`.

## Acceptance criteria

- [x] `druckprofil.spec.ts` dreimal hintereinander grün; Ursache im Ticket
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

**Ursache.** `loeschen` (Ticket 150) wartete auf den Befehl `DruckprofilEntfernen` und wechselte erst danach die Auswahl. Unter
Last öffnete der Test die Profilliste, solange das gelöschte Profil noch gewählt war: Radix setzte den Fokus auf diese Option,
sie verschwand mit dem gespeicherten Löschen, und der Fokus fiel auf die Liste selbst (`listbox [active]`, keine Option). Die
Meldung „Profil … gelöscht“ erschien zudem erst nach dem Öffnen der Liste und lag als oberste Ebene über ihr, sodass Escape
die Meldung statt der Liste geschlossen hätte. Nachgestellt, indem die Nachrichten an den Speicher-Worker 600 ms verzögert
wurden: alter Stand rot an derselben Stelle, neuer Stand grün über den ganzen Test. Der Test erwartet das Richtige, er bleibt.

- **D-162.1 Auswahl nach dem Löschen.** Frage: welches Profil gilt danach? Entscheidung: das nächste eigene Profil, am Ende der
  Liste das vorige, ohne weitere eigene Profile „Auftrags-LV mit Preisen“ (`profilNachLoeschen`). Grund: übliche Listenregel
  (U3), das Ticket nennt „das nächste Profil, sonst Standard“; das vorige statt Standard hält die Auswahl bei eigenen Profilen.
- **D-162.2 Reihenfolge.** Die Auswahl wechselt sofort beim Bestätigen; schlägt das Speichern fehl, kehrt die vorige Auswahl
  samt ungespeicherter Änderungen zurück. Bis das Löschen gespeichert ist, sind die Profilfelder gesperrt; danach steht der
  Fokus auf der Profilauswahl (statt auf der dann gesperrten Schaltfläche „Profil löschen“, die ihn verlor).
- **D-162.3 Nicht gelöst (anderes Paket).** Eine Meldung (Radix Toast), die erscheint, während eine Auswahlliste offen ist,
  fängt Escape ab; das gilt in der ganzen App und gehört nach `packages/ui-basis` (Frage an den Orchestrator).

**Prüfung.** `druckprofil.spec.ts` 3× hintereinander grün (9/9), `einstellungen.spec.ts` und `ausgabe.spec.ts` grün (12/12);
lint, typecheck grün; `pnpm test` 4735 grün, 2 Leistungsbudgets (`speicher/v16-leistung`, `abrechnung/leistung`) nur unter
paralleler Last rot, allein grün (nicht gelockert).

## Answer

Gemergt nach `integration/welle-7` mit `e63b4db`. Ergebnisse, Testläufe und Entscheidungen (D-162.x) unter `## Comments`.
