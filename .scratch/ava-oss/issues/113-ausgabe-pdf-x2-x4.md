# 113: O: PDF für Mängelliste, Bautagebuch, Honorarberechnung, Bauzeitenplan

Status: ready-for-agent
Type: task
Welle: 6 · Strang: O, X2–X4 · Paket: `packages/ausgabe`
Blocked by: 97
Modell: sonnet
Regeln: ADR 0012, A2, N4, Q5, D-56, D-57, D-58
Herkunft: Tore X2–X4 verlangen je ein PDF (`plan.md` §4, D-58)

## What to build

Vier Ausgaben über das bestehende `Ausgabemodell` (ADR 0012: das Modell rechnet nichts und trägt fertig formatierte de-DE-Texte;
pdfmake bleibt der Renderer; das Erzeugungsdatum kommt aus der Eingabe), je mit Test über den Seitentext wie die LV-Ausgabe:

1. **Mängelliste** (alle oder gefiltert, z. B. je Auftragnehmer): Nummer, Titel, Ort, Auftragnehmer, festgestellt, Frist,
   Status mit Datum, Kennzeichen „überfällig“ (die Befunde gibt der Aufrufer mit); dazu die **Mängelanzeige** für einen
   Auftragnehmer (die angezeigten Mängel mit Frist). Eingabe: `Mangel`-Liste, Kopfdaten, Befunde.
2. **Bautagebuch** für einen Zeitraum: je Tag Wetter, Arbeitskräfte je Firma, Geräte, Leistungen, Behinderungen,
   Vorkommnisse. Eingabe: `Bautagebucheintrag`-Liste.
3. **Honorarberechnung**: je Objekt anrechenbare Kosten mit Herleitung, Tafelwerte, Honorar, Phasen, Umbauzuschlag; gesamt
   Nebenkosten, Netto, USt, Brutto; Befunde und Hinweise (D-56). Eingabe: `Honorarberechnung` und `Honorarergebnis`.
4. **Bauzeitenplan** als Tabelle (Nummer, Vorgang, Dauer, Beginn, Ende, Puffer, kritisch) mit Projektende und kritischem Weg;
   Balken nicht nötig. Eingabe: `Bauzeitenplan` und `Terminplan`. (Kürzbar laut Schnitt, dann im Ticket vermerken.)

Was nicht ins Modell passt, verschwindet nicht still (Q5): Marke im Text wie „[Abbildung]“ im LV-Druck.

Aus Ticket 97 und dem Review (D-64, D-66): Eingabe des Bauzeitenplans ist `Bauzeitenplanergebnis` (nicht „Terminplan“); der
Hinweis zu DIN 276:2008-12 steht im Honorar-PDF als fester Text; die Mängelanzeige nimmt die Frist aus dem Verlaufseintrag
`angezeigt` (`frist?`).

## Grenzen

- Nur `packages/ausgabe`. Keine Rechnung im Paket (A2/ADR 0012). `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Je Ausgabe ein Test über Modell und Seitentext; das PDF ist bei gleicher Eingabe gleich
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments
