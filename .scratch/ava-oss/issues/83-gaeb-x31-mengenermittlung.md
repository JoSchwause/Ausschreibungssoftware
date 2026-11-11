# 83: M3: GAEB X31 (Mengenermittlung) lesen und schreiben

Status: claimed
Type: task
Welle: 5 · Strang: M3 · Paket: `packages/gaeb` (dazu `werkzeuge/xsd-gegenpruefung.mjs` im Paket)
Blocked by: 70, 73
Regeln: A2, A3, N1, N4, Q3, Q5, U5, G-10, G-11, G-16, ADR 0010, D-22, D-33, D-36
Herkunft: `plan.md` §2 M3; D-33 (nur X31, DA11 später)

## What to build

1. **X31 lesen** (3.3 und 3.2, G-10): `x31Lesen(text, auftragsLv: AuftragsLvZustand)` → `Aufmass`-Inhalt (Positionen mit
   `mengenansatz` als `Ansatzzeile`n und `menge: null` – die Menge rechnet die App mit `mengen`, D-22/D-36) plus Befunde.
   Zuordnung der `Item`s über die OZ des Auftrags-LV (wie der X84-Leser über das LV). Die Zeilen in `QTakeoff Row="…"` haben
   das feste Spaltenformat der REB-Verfahrensbeschreibung 23.003 (Text-, Rechen- und Ergebniszeilen, Formelnummer,
   Zeilennummer und Zeilenkennung am Ende). Das Format aus der öffentlich zugänglichen Beschreibung bzw. der BVBS-Prüfdatei
   `fixtures/extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31` herleiten und im Code in
   eigenen Worten dokumentieren (keine Texte der Norm übernehmen, C1). Formel 91 (freier Rechenansatz, auch über mehrere
   Zeilen fortgesetzt) wird zur Ansatzzeile; andere Formelnummern bleiben als Text mit Befund `formel-nicht-unterstuetzt`
   (Menge dieser Position `null`, nie geraten, Q5). Textzeilen (`*`) als Bemerkung oder Befund, entscheiden.
2. **X31 schreiben:** `aufmassAlsX31(aufmass, auftragsLv, version)` für Ansatzzeilen der Formel 91; eigene Prüfung wie bei
   den anderen Phasen (ADR 0010); XSD-Gegenprüfung in der CI um das amtliche X31-Schema erweitern (Schema zur Laufzeit von
   gaeb.de laden, SHA-256 prüfen, nie committen; URL und Prüfsumme im Skript).
3. **Rundweg** (Q3): eigenes Aufmaß → X31 → Aufmaß gleich; BVBS-X31 → Aufmaß → X31 → Aufmaß gleich, soweit Formel 91.

## Grenzen

- Nur `packages/gaeb`. Keine Rechnung der Ausdrücke in `gaeb` (das ist `mengen`, A3).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] BVBS-X31 gelesen: alle Items zugeordnet oder mit Befund; Golden-Test der Ansatzzeilen einer Position mit mehrzeiliger
      Formel 91
- [ ] Rundweg-Tests (Q3), XSD-Gegenprüfung grün (`pnpm --filter @tethys/gaeb run xsd-gegenpruefung`)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Rückgabe von `x31Lesen`: `Omit<Aufmass, 'id' | 'projektId' | 'auftragsLvId' | 'nummer'>` (plus Befunde); die App ergänzt
  den Kopf und baut `AufmassAnlegen`.
- Mehrere `Item`s zu derselben OZ zu einer Aufmaßposition zusammenführen (sonst weist der Ausführer mit `ungueltige-eingabe` ab).

## Comments
