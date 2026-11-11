# 86: A1 in der App: Auftrags-LV lesen und umkehren über den Vertrag, Nachträge

Status: ready-for-agent
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
