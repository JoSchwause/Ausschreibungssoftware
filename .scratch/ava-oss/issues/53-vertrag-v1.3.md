# 53: `vertrag` v1.3 (Vertrag plus Anpassung)

Status: ready-for-agent
Type: task
Welle: 4 · Strang: F · Paket: `packages/vertrag` (dazu nur mechanische, markierte Zeilen in den Paketen, die den Typ nutzen)
Blocked by: –
Welle-4-Lauf: siehe `../schnitt-welle-4.md`; Zusatzpunkt 9 und Entscheidungen D-22
Regeln: A4, F3, W-03 (b), D-06, P9 (der Nutzer prüft), G-26, G-32
Herkunft: Comments der Tickets 30, 34, 38, 39, 40, 43, 45, 46, 47, 48 und 49 (Lücken, siehe Liste)

## What to build

Die Umsetzer der Welle 3 haben Lücken im Vertrag gemeldet, die sie nicht geändert haben (A4). Dieses Ticket sammelt sie zu
einer Fassung v1.3 im Stil von Ticket 29: enge, umkehrbare Lesart im Typ, Alternativen als Offene Typfragen, Nicht-Additives
(Pflichtfelder, neue Glieder geschlossener Listen) nur mit der mechanischen Anpassung im selben Ticket (W-03 (b)).

1. **`LvUebersicht { id, name }` für `LvRepository.auflisten`** (Tickets 38, 39). Heute nur Kennungen; die Projektseite lädt
   jedes LV ganz (bei `gross` 5.000 Positionen). Wie `Projektuebersicht`, nach Name sortiert (`speicher` sortiert mit `Intl.Collator('de-DE')`).
2. **EPA-Bezeichnungen am LV** (Ticket 45). `LvInhalt` hält die Beschriftungen der EPA-Anteile (`LblUPComp`) nicht; deshalb
   bleiben die Anteile der BVBS-X84 `null`. Typ ergänzen, Leser und Writer (`gaeb`) später anschließen (Folgeticket).
3. **`Summenaenderung.vorher` Pflicht** (Ticket 30). Seit Ticket 30 füllt der Kern es immer; Pflichtfeld macht die Prüfung
   in `speicher` überall möglich (heute nur beim Löschen eines Aggregats).
4. **`Speicher.lvStaende` Pflicht** (Tickets 29 Offene Typfrage 3, 43). `speicher` liefert es immer; Test-Doubles und
   `Projektdatei.lvStaende` mitziehen.
5. **`Einfuegeort` „nach einer Gliederung“** (Tickets 39, 46, 42). Heute heißt `nach` einer Gliederung „als erstes Kind“; ein
   Geschwister direkt hinter einem nicht letzten Titel ist in einem Befehl nicht ausdrückbar. Neue Form für „hinter der
   Gliederung als Geschwister“ (neues Glied geschlossener Liste: mechanische Anpassung in `kern`, `speicher`, `ui-grid`, `apps/web`).
6. **Auftragnehmer im GAEB-Modell** (Tickets 40, 49). X86 schreibt `CTR` mit leerer Adresse und Warnung `angabe-leer`, weil
   `LvInhalt` keinen Auftragnehmer kennt. Typ am LV (oder am Auftrags-LV) ergänzen, Leser und Writer später anschließen.
7. **Angebotsposition: Positionsnachlass und Bieterergänzungen** (Ticket 45; G-26, G-32). `Angebotsposition` hat kein Feld
   für einen Nachlass je Position oder Gliederung und keines für Bieterergänzungen (`Kind="Bidder"`); beides geht beim
   X84-Import als Befund verloren (`nachlass-nicht-abgebildet`, 1.30.10 = 1.500,00 statt 1.450,50). Nur als Typfrage mit
   Alternativen aufnehmen; der Nutzer entscheidet (G-26).
8. **Leere Liste, Tabelle ohne Zeilen, Zeile ohne Zellen im `Langtext`** (Ticket 34). Der Editor kann sie nicht darstellen;
   Typfrage, ob der Vertrag sie verbietet (G2 prüft, ob GAEB sie zulässt).

9. **Mengenansatz an der Position** (Welle 4, M2; D-22). `Ansatzzeile` (heute `packages/mengen/src/mengenansatz.ts`) wandert
   nach `vertrag`; `mengen` importiert den Typ von dort (mechanisch). `Positionsdaten.mengenansatz?: readonly Ansatzzeile[]`
   (optional wie `leitbeschreibung`, fehlt = kein Ansatz). Neuer `LvBefehl` `MengenansatzSetzen { positionId, mengenansatz:
   readonly Ansatzzeile[] | null, menge: Menge | null }`: die App rechnet die Menge mit `mengen`, der Kern speichert beides
   unausgewertet (A3: kein `kern → mengen`). Lesarten im Typkommentar: (a) ein reiner Mengenbefehl (`MengeAendern` u. a.)
   an einer Position mit Ansatz entfernt den Ansatz im selben ChangeSet; (b) ein Ansatz mit Fehler kommt mit `menge: null`.
   Neues Glied der geschlossenen Befehlsliste: Kern-Handler, Speicher und Panel sind Folgetickets (56, 57, 65); hier nur so
   viel Mechanik, dass alles grün bleibt (z. B. der Kern weist den Befehl vorläufig mit `befehl-nicht-zustaendig` ab, markiert).

**Entscheidungen für diesen Lauf (D-22):** Punkt 7 bekommt **keinen** Typ (Offene Typfrage mit Alternativen in den Comments,
G-26). Punkt 8: Typ bleibt weit; K8-Befund und Writer-Warnung kommen in Folgetickets (56, 68). Punkte 2 und 6: Typ als
optionale Felder (additiv), Leser/Writer in Ticket 68, Speicherung in Ticket 57. Punkt 5: Typ und mechanische Anpassung hier,
die Kern-Logik für die neue Form in Ticket 56 (bis dahin weist der Kern sie markiert ab). Prüfung durch einen Opus-Reviewer
statt des Nutzers (P9, D-22); der Merge wartet auf diesen Review.

Aus Ticket 47 und 48 kommen keine Vertragslücken; ihre Lücken stehen in Ticket 54 (`ui-grid`, `ui-basis`) und für `speicher`
in Ticket 43 (D-31.1, Fremdschlüssel `protokoll.projekt_id`, kein Vertragsthema).

## Grenzen

- Nur `packages/vertrag` und die markierten mechanischen Zeilen (`// v1.3: mechanisch angepasst, Folgeticket`); keine Logik.
- Punkte 2, 6 und 7 nur als Typ; Leser, Writer und Oberfläche sind Folgetickets.
- Der Nutzer prüft den Pull Request (P9); offene Alternativen stehen als Typfragen im Ticket, nicht geraten (P5, außer im Demo-Modus mit Protokoll).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Typen für die Punkte 1 bis 9 (Punkte 2, 6, 7, 8 wie unter „Entscheidungen für diesen Lauf“) mit Kommentar im Stil von `vertrag`
- [ ] Jede mechanische Anpassung markiert; ihre Liste in den Comments
- [ ] Offene Typfragen mit Alternativen in den Comments
- [ ] `GLOSSARY.md` nachgezogen (L2), falls neue Begriffe entstehen (z. B. „Auftragnehmer“, „Bieterergänzung“)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Leser/Writer/Oberfläche für die neuen Felder, Änderung der Rechenregeln.

## Comments
