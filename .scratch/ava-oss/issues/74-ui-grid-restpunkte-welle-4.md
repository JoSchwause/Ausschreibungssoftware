# 74: `ui-grid`: Restpunkte aus Welle 4

Status: done-by-agent
Type: task
Welle: 5 · Strang: U · Paket: `packages/ui-grid`
Blocked by: –
Regeln: U3, U4, U8, Q4
Herkunft: D-65.2, D-26, Ticket 60 (Comments)

## What to build

1. Neutrales Zellkennzeichen (kein Warnstil) für „Position hat einen Mengenansatz“ (D-65.2); die App stellt darauf um.
2. Löschdialog des Grids nutzt den Anfangsfokus aus `ui-basis` statt eines eigenen Enter-Handlers (D-26; `Button` nimmt jetzt `ref`).
3. `VergleichsGrid`: schnelles Wischen über 5.000 Zeilen × 5 Bieter läuft mit 15–23 Bildern/s (LvGrid 45–60); weniger
   DOM-Elemente je Zelle, Ziel ≥ 30 Bilder/s.

## Acceptance criteria

- [x] je Punkt ein Test; Leistungsmessung im Ticket

## Comments

### Umsetzung (Branch `welle-5/74-ui-grid-rest`, Basis `integration/welle-5`)

Paket `packages/ui-grid`, dazu die benannte Ausnahme in `apps/web` (nur die Stelle mit dem Warnstil für den
Mengenansatz). Tests je Punkt:

1. `e2e/hinweise-und-summen.spec.ts`, „Mengenansatz (Ticket 74, D-65.2)“ (3 Tests: Marke ohne Warnstil, auch
   schreibgeschützt; neben einer Warnung). Testseite: neuer Parameter `ansatz=1`. In der App `e2e/mengen.spec.ts`
   (prüft jetzt `tx-grid__zelle--mengenansatz` statt `--warnung`).
2. `e2e/zeilenaktionen.spec.ts`, „Anfangsfokus auf der Bestätigung (Ticket 74, D-26)“.
3. `e2e/leistung.spec.ts`, „Vergleich 5.000 Zeilen x 5 Bieter: je Zelle nur Zelle, Text und Marken“ (Zählung, hängt
   nicht an der Maschine) und die vorhandene Bildratenmessung (Fall „Vergleich 5.000 Zeilen x 5 Bieter“).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-74.1 Woher kennt das Grid den Mengenansatz?** Aus `zeile.knoten.mengenansatz` (Position, nicht leer); keine neue
  Eigenschaft an `LvZeile` oder am Grid. Grund: Die Angabe steht schon im Knoten der Zeile (v1.3); eine neue
  `LvZeile`-Eigenschaft wäre eine Vertragsänderung (P9) ohne Gewinn. Reversible: yes.
- **D-74.2 Darstellung.** Marke „Σ“ links neben der Zahl in der Fläche der neutralen Kennzeichen-Marke des
  Vergleichsgrids (`.tx-grid__kennzeichen`: `text-muted` auf `surface-sunken`, Kontrast schon geprüft), Klasse
  `tx-grid__zelle--mengenansatz`, Beschreibung „Menge aus Mengenansatz. Eine direkte Änderung der Menge entfernt den
  Mengenansatz“ im `title` und für den Screenreader; kein Warnstil, kein `aria-invalid`, kein Befund. Steht ein Befund an
  derselben Zelle, erscheinen Warnzeichen und Marke nebeneinander, die Ansatz-Beschreibung zuerst. Auch im
  schreibgeschützten Grid; während die Zelle bearbeitet wird, fehlt die Marke. Der Text gehört dem Grid (`texte.ts`).
  Grund: ein Kennzeichen-Vokabular für beide Grids (U2), nicht nur Farbe (U8). Reversible: yes.
- **D-74.3 Umstellung der App.** `lv/LvSeite.tsx` legt keine Befunde `mengenansatz` mehr an; `ansatzKennzeichen`,
  `befundeZusammen` (`mengen/rueckfrage.ts`), ihr Unit-Test und `texte.kennzeichen` (`mengen/texte.ts`) sind entfernt.
  Grund: toter Code nach der Umstellung; sonst nichts in der App. Hinweis für Ticket 87 (schreibt `src/mengen/`): diese
  Dateien sind hier geändert. Reversible: yes.
- **D-74.4 Löschdialog.** `anfangsfokus` des Dialogs aus `ui-basis` auf „In den Papierkorb legen“ (`Button` mit `ref`);
  der eigene Enter-Handler (Hülle `tx-grid__rueckfrage`, `data-abbrechen`) ist weg. Enter wirkt nur noch auf die
  fokussierte Schaltfläche: beim Öffnen bestätigt Enter wie bisher, auf „Abbrechen“ und auf dem Schließen-Kreuz bricht
  es ab. Grund: D-26; nebenbei behoben: Enter auf dem Schließen-Kreuz legte bisher die Zeilen in den Papierkorb (Q5).
  Reversible: yes.
- **D-74.5 Weniger Elemente je Zelle im Vergleichsgrid.** Marken stehen ohne Hülle direkt in der Zelle; die Beschreibung
  der Kennzeichen steht nur im `title` (zugängliche Beschreibung aus `title`, kein verstecktes Element, kein
  `aria-describedby`); `aria-readonly` nur am Grid, nicht je Zelle; der Einzug einer Zeile ohne Unterknoten ist ein
  Element (gemeinsamer `Baumeinzug`, auch im `LvGrid`). Gemessen: Elemente je Zelle 2,67 → 2,27, je Zeile 38,3 → 32,8
  (Zelle ohne Kennzeichen 2, mit 1 / 2 Kennzeichen 5 / 6 → 3 / 4, Baumzelle 4,1 → 3,1), Attribute je Zelle 7,1 → 6,1.
  Grund: Ticket („weniger DOM-Elemente je Zelle“), `.tx-grid__text` bleibt (Tests der App greifen darauf zu).
  Reversible: yes.
- **D-74.6 Weitere Schritte, gemessen.** (a) Stabile Rückrufe für den Virtualisierer im gemeinsamen Kern: ein neuer
  `getItemKey` je Rendern ließ ihn bei jedem Scrollschritt alle 5.000 Zeilen neu vermessen (hilft auch dem `LvGrid`).
  (b) Zeilen erben Raster, Höhe und Mindestbreite von Körper bzw. Fuß; eine neue Zeile trägt nur ihren Versatz als
  eigenen Stil. (c) Der Kopf wird nur bei neuen Spalten neu gebaut. (d) Feste Höhe der Rasterzeile (`grid-template-rows:
  100%`), etwa −5 %. (e) Rechtsbündiger Text ohne eigenen Clip (die Zelle schneidet ab), etwa −10 %. Reversible: yes.
- **D-74.7 Verworfen nach Messung.** Ohne messbaren Gewinn: Zeilen beim Scrollen wiederverwenden (Plätze als
  React-Schlüssel), eine klebende Hülle je Zeile für die fixierten Zellen (dazu ARIA-Risiko), `top` statt `transform`,
  Zellen als Block statt Flex, `position: static`, `contain` (schlechter), kein Fragment je Zelle. Mit Gewinn, aber nicht
  umgesetzt: kleinerer Überhang der Virtualisierung (waagerecht 2 → 0: −9 %, senkrecht 10 → 5: −3 %; weniger Puffer beim
  Scrollen im Compositor) und fixierte Spalten nur kleben lassen, wenn waagerecht gescrollt ist (−15 %, aber beim ersten
  waagerechten Scrollen ein Bild lang verrutschte Spalten). Die fixierten Spalten (`sticky`) sind mit etwa 15 % der
  größte verbleibende Posten. Reversible: yes.
- **D-74.8 Messmethode.** Neben der Bildratenmessung des Pakets (unverändert, harte Schranke weiter nur mit
  `GRID_MIN_FPS`) eine lastarme Vergleichsgröße: Prozessorzeit des Renderer-Hauptthreads je Bild (Trace, `tdur`) bei einem
  festen Wisch von 240 Bildern zu je 467 px (28.000 px/s bei 60 Bildern/s), abwechselnd gegen einen Build vor Punkt 3
  (Commit 7f47639), Median aus 3–4 Läufen. Das Hilfsskript liegt nicht im Repo. Reversible: yes.

### Leistungsmessung (Headless-Chromium ohne GPU, 4 Kerne, bis zu 8 Agenten gleichzeitig)

Vergleichsgrid 5.000 Zeilen × 5 Bieter (20 Spalten), schneller Wisch 28.000 px/s, Messung `e2e/leistung.spec.ts`:

| Stand | Last (1 min) | 5.600 px/s | 28.000 px/s | 6-fach gedrosselt 5.600 / 28.000 |
|---|---|---|---|---|
| vorher (Basis `integration/welle-5`) | 0,3–0,9 | 59,6 | 37,1 | 5,2 / 4,4 |
| nachher, Datei allein | 1,1–1,9 | 59,4 | 56,8 | 10,4 / 5,6 |
| nachher, ganze E2E des Pakets | 2,8–3,1 | 59,2 | 56,8 | 8,7 / 5,9 |
| nachher, ganze E2E nach Merge von `vertrag` v1.4 | 4,4–5,5 | 60,0 | 54,8 | 13,2 / 6,7 |

Abwechselnd vorher/nachher unter gleicher Last (je 3 Läufe à 5 s, Bilder/s bei 28.000 px/s): Last 1,3–2,2: vorher
45,7 / 48,5 / 39,7 → nachher 57,8 / 58,8 / 56,8; Last 3,6–5,0: vorher 50,0 / 36,1 / 45,8 → nachher 46,6 / 57,6 / 47,4.
`LvGrid` (gross) in denselben Läufen 59,6–60.

Prozessorzeit je Bild (D-74.8), vorher → nachher: 17,2 → 13,9 ms (Last 6), 16,6 → 14,5 ms (nach Punkt D-74.5 allein,
Last 6–11), 15,0 → 11,9 ms (Last 4–5): −19 bis −21 %, Stil und Layout −25 %. `LvGrid` 8,9 → 8,7 und 7,4 → 7,0 ms.

Bewertung: Ziel ≥ 30 Bilder/s bei allen gemessenen Lasten (bis 5) erreicht (46–59 statt 36–50). Die Last 13–17 aus
Ticket 60 trat während der Schlussmessungen nicht auf; Zwischenmessungen bei Last 6–11 mit der Methode D-74.8 zeigten
denselben Abstand. Kein Budget gelockert, keine neue harte Schranke.

## Answer

Erledigt auf `welle-5/74-ui-grid-rest`: (1) neutrale Marke Σ an der Mengenzelle von Positionen mit Mengenansatz, ohne
Warnstil, App umgestellt (D-74.1–3); (2) Löschdialog mit Anfangsfokus aus `ui-basis` statt eigenem Enter-Handler
(D-74.4); (3) Vergleichsgrid mit weniger Elementen je Zelle und weniger Arbeit je Scrollschritt: schneller Wisch
57 Bilder/s bei Last 1–3 (vorher 37–48), Prozessorzeit je Bild −20 % (D-74.5–8). Lint, Typen, Unit-Tests, E2E von
`ui-grid` (63) und `e2e/mengen.spec.ts` der App grün. Offen: Messung unter Last 13–17 und, falls dort nötig, der
größte Restposten (klebende fixierte Spalten, D-74.7).
