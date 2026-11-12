# 102: X2: Terminrechnung des Bauzeitenplans (`bauzeit`)

Status: claimed
Type: task
Welle: 6 · Strang: X2 · Paket: `packages/bauzeit` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: –
Modell: opus
Regeln: A2, A3, Q1, Q4, U5, C4, D-57
Herkunft: `plan.md` §2 X2, Berater D-57

## What to build

Ein reines TS-Paket (A2: keine Uhr, kein Zufall, kein DOM), das einen Bauzeitenplan terminiert: Arbeitskalender, Vorgänge mit
Dauer in Arbeitstagen, Anordnungsbeziehungen, Vorwärts- und Rückwärtsrechnung (Netzplan, Methode des kritischen Wegs), Puffer,
kritischer Weg. Es importiert nur `vertrag` und `dezimal` (`'packages/bauzeit': ['packages/vertrag', 'packages/dezimal']`,
`apps/web` darf es importieren). In diesem Ticket mit **eigenen Eingabetypen**; die Vertragstypen (`Bauzeitenplan`, `Vorgang`,
`Vorgangstermine`) bringt Ticket 97, die Umstellung und die Befehle Ticket 109. Halte die eigenen Typen nahe an der Form unten.

1. **Datum.** Kalendertage als Text `JJJJ-MM-TT`; gerechnet über eine ganze Tageszahl (proleptischer gregorianischer
   Kalender), nicht über Zeitzonen. Ungültiges Datum: Fehler.
2. **Arbeitskalender** `{ arbeitstage: Wochentage (ISO, 1 = Montag; Standard Mo–Fr), bundesland: Kürzel nach ISO 3166-2:DE
   oder null, freieTage: Daten }`. **Feiertage rein aus Regeln** (D-57): bundesweit Neujahr, Karfreitag, Ostermontag, 1. Mai,
   Christi Himmelfahrt, Pfingstmontag, 3. Oktober, 25./26. Dezember (Ostersonntag nach der gregorianischen Osterformel); dazu
   die landesweiten Feiertage je Land nach den Feiertagsgesetzen der Länder (z. B. 6. Januar, 8. März, Fronleichnam,
   15. August, 20. September, 31. Oktober, 1. November, Buß- und Bettag – welches Land welchen hat, aus der Quelle, mit
   Gültigkeitsjahr, z. B. 8. März in Berlin ab 2019). Nur regional geltende Feiertage und einmalige Feiertage gehen über
   `freieTage`. Tests je Feiertag mit festen Jahren (z. B. Ostersonntag 2026 = 05.04.2026, 2027 = 28.03.2027).
3. **Vorgang** `{ id, nummer?, bezeichnung, elternId: Kennung | null (Sammelvorgang = hat Kinder), dauer: ganze Arbeitstage ≥ 0
   (0 = Meilenstein; am Sammelvorgang ohne Bedeutung), vorgaenger: Anordnungsbeziehung[], fruehesterBeginn: Datum | null
   (Terminvorgabe „Beginn frühestens“), ist: { beginn, ende, fortschritt } | null }`. **Anordnungsbeziehung** `{ vorgaengerId,
   art: 'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende', abstand: ganze Arbeitstage, auch 0 oder negativ }`.
4. **Rechnung.** Lege die Lesarten fest und schreibe sie an den Code (`BAUZEIT_ANNAHMEN` oder ähnlich): Ende ist der letzte
   Arbeitstag des Vorgangs (einschließlich); Ende-Anfang mit Abstand 0 heißt Beginn am nächsten Arbeitstag nach dem Ende;
   Meilenstein hat Beginn = Ende; ein Vorgang beginnt nie vor dem Projektbeginn und nie an einem freien Tag. Vorwärtsrechnung
   (frühester Beginn/frühestes Ende), Rückwärtsrechnung vom Projektende (spätester Beginn/spätestes Ende), Gesamtpuffer und
   freier Puffer in Arbeitstagen, kritisch = Gesamtpuffer ≤ 0, kritischer Weg als Folge von Vorgängen. Sammelvorgang: Beginn =
   frühester Beginn, Ende = spätestes Ende seiner Kinder; eine Anordnungsbeziehung an einem Sammelvorgang ist in v1 ein Befund
   `beziehung-an-sammelvorgang` und wird nicht gerechnet. Zyklus: Befund `zyklus` mit den beteiligten Vorgängen, diese
   bleiben ohne Termine; unbekannter Vorgänger: Befund. Ist-Termine werden angezeigt, verschieben aber nichts (v1).
5. **Zeitachse für die Anzeige** (rein, ohne DOM): aus Projektbeginn und -ende den Tagesindex je Datum, die Abschnitte der
   Kopfzeilen (Monate, Kalenderwochen nach ISO 8601) und die Indizes der freien Tage – passend zur Balkenspalte des
   Vergleichsgrids (Ticket 96: `Zeitleiste`, `Zeitabschnitt`, `Balken` mit Tagesindex). Die Texte formatiert die App (N4).
6. **Tests (Q1, C4):** Golden-Tests von Hand hergeleitet (Herleitung im Test): ein Plan mit 6–8 Vorgängen, allen vier
   Beziehungsarten, einem Abstand 0 und einem negativen, einem Meilenstein, einem Feiertag und einem Wochenende auf dem
   kritischen Weg; Property-Tests (Puffer ≥ 0 bei konsistenter Eingabe; jeder kritische Weg ist zusammenhängend;
   Verschieben des Projektbeginns um eine Arbeitswoche verschiebt alle Termine um eine Arbeitswoche, wenn keine Feiertage
   im Weg liegen). **Leistung (Q4):** 1.000 Vorgänge mit 2.000 Beziehungen ≤ 100 ms CPU.

Begriffe zuerst ins `GLOSSARY.md` (L2), Abschnitt „Planerhonorar (HOAI) & Projektsteuerung“ beim Bauzeitenplan:
**Vorgang**, **Sammelvorgang**, **Meilenstein**, **Anordnungsbeziehung** (vier Arten, Abstand), **Arbeitskalender**,
**Gesamtpuffer**, **freier Puffer**, **kritischer Weg**, **Terminvorgabe**.

## Grenzen

- Nur `packages/bauzeit` (und die genannten Wurzeldateien). Keine Befehle, kein Speicher (Ticket 109). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [ ] Golden-, Property- und Leistungstests wie oben; Feiertage je Land mit Quelle
- [ ] Paketgrenzen-Prüfung kennt `bauzeit`
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments
