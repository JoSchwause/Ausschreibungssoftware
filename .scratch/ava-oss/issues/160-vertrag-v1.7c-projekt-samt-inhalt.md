# 160: `vertrag` v1.7c: Projekt samt Inhalt löschen

Status: ready-for-agent
Type: task
Welle: 7 · Strang: F, E8 · Paket/Ordner: `packages/vertrag`, `GLOSSARY.md` (mechanische Folgezeilen nur, wo der Typcheck sie erzwingt)
Blocked by: – (nach 128)
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A4, A5, A8, P9, Q5; ADR 0009, ADR 0011; D-96
Herkunft: Tor E (158), E8, D-96

## What to build

Nach **D-96**:
1. Neuer Befehl `ProjektSamtInhaltLoeschen { art }` in `ProjektBefehl`; `ProjektLoeschen` bleibt unverändert.
2. Neue ChangeSet-Art `ProjektbestandChangeSet { art: 'projektbestand'; projekt: Aenderung<Projekt>; bestand:
   Aenderung<Projektbestand> }`. `Projektbestand` = die Struktur, die die Projektdatei schon trägt (Schema 7). Prüfen und im
   Ticket belegen, dass LV-Stände, Befehlsprotokoll und Modellverweise enthalten sind; fehlt etwas, hier ergänzen.
3. Lesarten: Ausführer bekommt den Bestand als Pflichtparameter (sonst `ungueltige-eingabe`); `speicher` löscht in einer
   Transaktion, Undo stellt über den Schreibweg von `projektdateiEinlesen` mit gleichen IDs wieder her; andere Formen von
   `projektbestand` → `unbekannt`; Modell-Bytes werden erst freigegeben, wenn kein Undo-Schritt sie mehr nennt; Protokoll als
   Massenbefehl (Kopf und Prüfsumme, `MASSENBEFEHLSARTEN`).
4. Glossar: „Projekt samt Inhalt löschen“, „Projektbestand“.

## Acceptance criteria

- [ ] Typtests; Lesarten als D-160.x für 161
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
