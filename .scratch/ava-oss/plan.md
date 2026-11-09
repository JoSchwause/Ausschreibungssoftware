# Arbeitsplan: Open-Source-AVA (angelehnt an NOVA AVA)

Stand: 2026-11-09. Ersetzt `.scratch/ava-mvp/map.md`. Die Tickets `.scratch/ava-mvp/issues/01`–`17`
bleiben gültig und sind unten den Strängen zugeordnet (Nummer in Klammern).

- Regeln: `docs/regeln.md` (verbindlich, zuerst lesen).
- Offene Fragen: `.scratch/ava-oss/grilling.md` (G-IDs). **Vor der Grilling-Sitzung startet nichts
  aus Welle 1 oder später.** Nur F1 und F3 hängen an keiner offenen Frage.
- Verhalten der Referenzsoftware: `okf/research/` (öffentlich), Rohrecherche lokal und
  git-ignoriert (Regel C3).

## 1. Zielstruktur (pnpm-Monorepo)

| Paket | Inhalt | Strang |
|---|---|---|
| `packages/vertrag` | Domänentypen, Befehle, ChangeSet, Repository-Schnittstellen | F |
| `packages/dezimal` | Dezimalwert, Rundung, de-DE-Parsen/-Formatieren | K |
| `packages/kern` | LV-Baum, OZ, Positionsarten, Summen, EPA, Prüfregeln | K |
| `packages/speicher` | SQLite-WASM/OPFS, Migrationen, Projektdatei, LV-Stände, Undo | S |
| `packages/gaeb` | DA-XML-Modell, Parser, Writer, Phasenprofile, XSD-Validierung | G |
| `packages/vergabe` | Bieter, Angebot, Preisspiegel-Rechnung, Zuschlag | V |
| `packages/mengen` | REB-23.003-Formelparser, Aufmaßblätter, X31 | M |
| `packages/abrechnung` | Auftrag, Nachträge, Soll/Ist, Rechnungsprüfung, E-Rechnung | A |
| `packages/kosten` | DIN-276-Gliederung, Kostenermittlung, Kostenkontrolle, EP-Kalkulation | C |
| `packages/ausgabe` | PDF, Excel | O |
| `packages/ui-grid`, `packages/ui-basis` | gemeinsames Grid, Tokens, Dialoge, Rich-Text | U |
| `apps/web` | PWA-Hülle, Routing, Fachansichten (ein Ordner `src/<strang>/` je Strang) | U + je Strang |
| `fixtures/` | selbst verfasste LVs und GAEB-Dateien mit Sollwerten | F |

Ein Paket hat zu jedem Zeitpunkt genau einen schreibenden Agenten (Regel P2).

## 2. Stränge

„Braucht“ nennt die G-Fragen, die vorher beantwortet sein müssen.

**F — Fundament** (seriell, blockiert alles)
- F1 Repo-Gerüst, CI, Lizenz-, Paketgrenzen- und Clean-Room-Prüfung (03)
- F2 `vertrag` v1: Domänentypen, Befehle, ChangeSet (02). Braucht G-09, G-20…G-25, G-28, G-29.
- F3 Fixtures v1: drei selbst verfasste LVs (winzig, typisch, 5.000 Zeilen)

**K — Kern** (`dezimal`, `kern`; intern seriell, ein Agent)
- K1 Dezimal und Rundung (04) · K2 Hierarchie (05) · K3 OZ-Maske und Umnummerierung (06)
- K4 Summen, Nachlass, MwSt mit ChangeSet (07) · K5 Positionsarten 1 (08)
- K6 Grund-/Wahl- und Zulagepositionen (09; braucht G-22) · K7 EPA (17)
- K8 Prüfregeln (16, Logikteil) · K9 Kopieren/Verschieben/Papierkorb als Befehle (15, Logikteil)

**S — Speicher**
- S1 Schema, Migrationen, Repositories (10) · S2 Projektliste und Projektdatei (11)
- S3 Undo/Redo und LV-Stände (14; braucht G-24) · S4 PWA-Installation, Offline, Datensicherung
  (braucht G-03)

**U — Oberfläche**
- U1 Tokens, App-Hülle, Dialog- und Formularbausteine (braucht G-30, G-31)
- U2 `ui-grid`: Baum-Grid auf Fixture-Daten · U3 LV-Grid an Befehle angebunden (12)
- U4 Positionsdialog mit TipTap-Schema (13; braucht G-32) · U5 Zwischenablage, Verschieben,
  Papierkorb (15) · U6 Prüf-Panel mit Sprunglinks (16)

**G — GAEB** (braucht G-10…G-13)
- G1 XML-Modell und Parser X81/X83 · G2 Writer X81/X83/X86 mit XSD-Validierung
- G3 Import X84 → Angebot · G4 weitere Versionen und Phasen

**V — Vergabe** (braucht G-14, G-26)
- V1 Bieter, Angebot, Bietersummen · V2 Preisspiegel-Rechnung (virtuelle Bieter, Rangfolge,
  Ausreißer, ABC, Wahlpositions-Simulation) · V3 Preisspiegel-Ansicht
- V4 Zuschlag → Auftrags-LV · V5 Excel-Rundlauf für Bieter (mit O2)

**M — Mengen**
- M1 REB-Formelparser (Formel 91 zuerst) · M2 Mengenermittlungs-Panel · M3 X31/DA11

**A — Auftrag und Abrechnung** (braucht G-15, G-27)
- A1 Nachträge · A2 Aufmaßblätter und Soll/Ist · A3 Rechnungsprüfung (Abzugskette)
- A4 XRechnung/ZUGFeRD

**C — Kosten** (braucht G-16)
- C1 Kostengliederung und Kostenermittlung · C2 Zuordnung LV ↔ Kostengruppe · C3 Kostenkontrolle
- C4 EP-Kalkulation · C5 Muster-LV und Textbausteine

**O — Ausgabe**
- O1 PDF-Druck des LV · O2 Excel-Export/-Import · O3 Druckprofile

**X — Erweiterungen** (voneinander unabhängig; jede braucht ein Ja/Nein aus G-05)
- X1 BIM/IFC · X2 Bauzeitenplan · X3 HOAI · X4 Bauleitung (Mängel, Bautagebuch)
- X5 Bieterportal / Sync-Server · X6 KI-Assistent

## 3. Wellen

| Welle | Parallel laufende Agenten | Tor zur nächsten Welle |
|---|---|---|
| 0 | Grilling-Sitzung (Mensch) ‖ F1 ‖ F3 | Stufe-1-Fragen beantwortet; F2 gemergt |
| 1 | K1→K4 · S1 · U1+U2 · G1 | `vertrag` stabil; Grid zeigt Fixture |
| 2 | K5→K7 · S2 · U3 · G2 · O1 (Spike) | **M1: LV anlegen, rechnen, speichern** |
| 3 | K8+K9 · S3 · U4–U6 · G3 · V1+V2 · M1 | **M2: GAEB rein und raus, XSD-valide** |
| 4 | V3+V4 · O1+O2 · M2 · S4 · C1 | **M3 = MVP: Ausschreibung → Angebote → Zuschlag** |
| 5 | A1–A4 · M3 · C2–C5 · O3 | **M4: durchgehende Kette LPH 6–8** |
| 6 | in G-05 gewählte X-Stränge | je Modul |

U hängt nur über `vertrag` an K. Deshalb baut U2 gegen Fixtures, bevor K fertig ist.

## 4. Verifikation

- Je Ticket: `pnpm lint && pnpm test && pnpm e2e` grün, Akzeptanzkriterien des Tickets erfüllt.
- **M1:** E2E legt ein LV an (2 Ebenen, 5 Positionen, jede Positionsart), lädt neu, Summen stimmen
  mit den Fixtures.
- **M2:** Jede Fixture exportiert nach X81/X83/X86, validiert gegen das XSD und ergibt beim
  Re-Import ein identisches Modell. Zusätzlich von Hand: Export in einem freien GAEB-Betrachter
  öffnen.
- **M3:** E2E importiert zwei X84-Angebote, Preisspiegel-Summen stimmen mit den Sollwerten, der
  Zuschlag erzeugt das Auftrags-LV.
- Dauerhaft in der CI: Paketgrenzen, Lizenzprüfung, Clean-Room-Prüfung, Leistungsbudgets.

## 5. Rückschreib-Protokoll (Grilling → Plan)

Für jede beantwortete G-Frage tut die Grilling-Sitzung genau das:

1. Antwort unter der Frage in `grilling.md` eintragen (`**Antwort:** …` mit Datum).
2. Antworten zu Architektur, Lizenz oder Umfang werden neue oder geänderte ADRs (ab 0008).
   Begriffe kommen ins `GLOSSARY.md`.
3. Diesen Plan anpassen: „braucht G-xx“ entfernen, Umfang oder Welle des Strangs ändern, oder den
   Strang streichen.
4. Bestätigte [NEU]-Regeln in `docs/regeln.md` als entschieden markieren, verworfene löschen.
5. Sind alle Stufe-1-Fragen geschlossen: Tickets für Welle 1–2 nach `.scratch/ava-oss/issues/`
   schneiden (03–17 wiederverwenden). Jedes Ticket nennt sein Paket, `Blocked by` und die
   geltenden Regeln.
6. OKF aktualisieren. Unbeantwortete Stufe-2-Fragen behalten ihren Standard und werden im Plan als
   `Annahme` markiert.
