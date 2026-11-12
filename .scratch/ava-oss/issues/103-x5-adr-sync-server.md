# 103: X5: ADR 0013 „Sync-Server nach v1“ (Vorschlag) und Grilling-Frage G-57

Status: resolved
Type: task
Welle: 6 · Strang: X5 · Ort: `docs/adr/0013-sync-server-nach-v1.md` (neu), `.scratch/ava-oss/grilling.md` (G-57),
`.scratch/ava-oss/plan.md` (§2, Zeile X5)
Blocked by: –
Modell: sonnet
Regeln: ADR 0001, ADR 0009, G-01, G-14, E-13, E-14, A5–A7, D-36 (8), D-51, D-55
Herkunft: `plan.md` §2 X5 („widerspricht ADR 0001 sowie G-01 und G-14: vorher eine ADR und eine Grilling-Frage“), Berater D-55

## What to build

Kein Produktcode. X5 besteht in Welle 6 nur aus einer ADR mit Status `proposed` und einer offenen Grilling-Frage (D-55).

1. **ADR 0013** im Stil der übrigen ADRs (`docs/adr/`, Kopf `status: proposed`, deutsch, kurze Sätze): „Optionaler,
   selbst betriebener Sync-Server nach v1“. Inhalt:
   - Entscheidungsvorschlag: Die PWA bleibt lokal und ohne Server voll nutzbar (ADR 0001, G-01). Ein Sync-Server ist frühestens
     nach v1 ein optionaler Zusatz für mehrere Nutzer eines Büros. Ein **Bieterportal gibt es nicht**: G-14 (nur X84 und
     Excel-Rundlauf, keine zweite Installation für Bieter) ist entschieden und bleibt bindend.
   - Was der heutige Entwurf schon trägt: stabile UUIDv7-Kennungen (A7), Befehle als reine Daten (A5), ChangeSets mit
     altem und neuem Stand (A6), dauerhaftes Befehlsprotokoll (ADR 0009).
   - **Was ihn heute blockiert** (ausdrücklich als Hindernisse, nicht als Randnotizen): Massenbefehle stehen im Protokoll nur
     als Kopf und Prüfsumme (E-13), das Protokoll lässt sich also nicht nachspielen; ChangeSets mit ganzen Aggregaten
     (D-36 (8)) sind für das Zusammenführen zu grob; ein Tab je Datenbank (E-14); große Modelldateien (D-51) im Abgleich.
   - Betrachtete Optionen: (a) Server als führende Datenquelle (verworfen: ADR 0001), (b) Abgleich über Dateien zwischen zwei
     Installationen, (c) optionaler Sync-Server mit ChangeSet-Abgleich; Folgen und nötige Vorarbeiten (Abgleich je Aggregat,
     Konfliktregeln, Identität des Nutzers im Protokolleintrag, Protokoll nachspielbar).
   - Status: Vorschlag, Mensch entscheidet über G-57.
2. **G-57** in `grilling.md`, neuer Abschnitt „Stufe 4 — Welle 6“: Frage „Sync-Server nach v1: ja oder nein, und in welcher
   Form (Datei-Abgleich zwischen Installationen oder selbst betriebener Server)?“, Status *offen*, darunter die Zeile
   `Annahme für Demo, Mensch bestätigt später: ADR 0013 als Vorschlag, kein Code in Welle 6 (D-55 in entscheidungen-auto.md).`
3. **`plan.md` §2**, Zeile „X2–X5 je ein Strang …“: Verweis auf ADR 0013 und G-57 ergänzen (ein Halbsatz).

## Grenzen

- Kein Code, keine Änderung an anderen ADRs (ADR 0001 bleibt `accepted` und unverändert). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] ADR 0013 (`proposed`), G-57 (*offen*, mit Annahme-Zeile) und der Verweis in `plan.md` stimmen überein; keine Aussage
      widerspricht ADR 0001, G-01 oder G-14
- [ ] `pnpm lint` grün (Prettier über die Markdown-Dateien)

## Comments

Ergebnis (Agent): ADR 0013 (`proposed`) geschrieben, G-57 (*offen*, mit Annahme-Zeile) im neuen Abschnitt „Stufe 4 — Welle 6“
in `grilling.md`, Verweis in `plan.md` §2. Kein Code, keine andere ADR geändert. Die vier Hindernisse (E-13, D-36 (8),
E-14, D-51) stehen im Abschnitt „Hindernisse heute“.

## Answer

Gemergt in `integration/welle-6` mit `1c61a8a` (Branch `welle-6/103-x5-adr`). ADR 0013 (`proposed`), G-57 (*offen*, Annahme für
Demo), Verweis in `plan.md` §2. Tor X5 (Stimmigkeit, D-58): erfüllt; kein Code.
