# 137: Kern v1.7a: neue Befehle, Kalkulationsansätze, Projektangaben, Einstellungen

Status: ready-for-agent
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

- [ ] Jeder neue Befehl mit Test und Umkehrung; Einzeländerung < 16 ms bei 5.000 Positionen unverändert
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
