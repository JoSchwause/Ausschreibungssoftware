# 68: `gaeb` v1.3: Auftragnehmer in X86, EPA-Bezeichnungen, leere Langtext-Strukturen, Import der X84 aus Ticket 69

Status: claimed
Type: task
Welle: 4 · Strang: G · Paket: `packages/gaeb`
Blocked by: 53 (`vertrag` v1.3), 51 (Goldens), 57 (Speicherung der neuen Felder), 69 (X84-Dateien)
Regeln: Q3, Q5, U5, C4, ADR 0010, D-22, D-40.1, D-45.1
Herkunft: Ticket 53 (Punkte 2, 6, 8), Tickets 40, 45, 49 (Comments)

## What to build

1. **Auftragnehmer** (Punkt 6): X86-Writer schreibt `CTR` mit dem Auftragnehmer aus dem Modell (Warnung `angabe-leer`
   nur noch, wenn er fehlt); X86-Leser liest ihn. Zusätzlich: ein Auftrags-LV lässt sich als X86 schreiben (Option bzw.
   Funktion `schreibeGaeb` mit `AuftragsLeistungsverzeichnis`), falls das ohne Vertragsänderung geht.
2. **EPA-Bezeichnungen** (Punkt 2): X83/X86-Writer schreiben `LblUPComp` aus dem LV; Leser von X83/X86 übernehmen sie ins
   LV; der X84-Angebotsleser ordnet Anteile über die Bezeichnungen des LV zu, sodass die Anteile der BVBS-X84 nicht mehr
   `null` bleiben, wo das LV Bezeichnungen hat (Befund `epa-nicht-abgebildet` nur noch ohne Bezeichnung).
3. **Leere Langtext-Strukturen** (Punkt 8, D-22 (iii)): Writer verwirft leere Liste/Tabelle/Zeile mit Warnung; Export
   bleibt XSD-gültig.
4. **X84 aus Ticket 69:** Import-Test liest jede Datei mit `leseAngebot` gegen `typisch` und vergleicht die
   Angebotspositionen exakt mit `typisch-angebote.json`; Befunde nur die erwarteten.
5. Roundtrip-Liste (`testdaten/roundtrip-unterschiede.json`) nachziehen (nur kürzen, jeden neuen Eintrag begründen);
   XSD-Gegenprüfung lokal ausführen, falls das Netz die amtlichen ZIPs erreicht (sonst vermerken).

## Grenzen

- Nur `packages/gaeb`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Tests je Punkt; Golden-Exporte begründet aktualisiert
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün,
      `pnpm --filter @tethys/gaeb run xsd-gegenpruefung` grün oder mit sichtbarem Überspringen (ohne Netz)

## Nicht-Ziele

Positionsnachlass/Bieterergänzungen im Angebot (D-22 (ii)), GAEB 90/2000, X82/X85/X89.

## Comments

### Aus Ticket 53 (Review, D-27, D-28)
- Option `auftragnehmer` in `SchreibOptionen` doppelt `LvInhaltKopf.auftragnehmer`: das Modell gewinnt, die Option entfällt.
- EPA-Bezeichnungen in der Form aus D-28; nie umnummerieren. Prüfen, ob das XSD Lücken in `LblUPComp` mit `NoUPComps` = höchste Nummer annimmt; sonst Platzhalter-Beschriftung.
