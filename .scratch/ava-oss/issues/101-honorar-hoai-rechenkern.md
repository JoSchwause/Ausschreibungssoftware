# 101: X3: HOAI-Rechenkern (`honorar`)

Status: claimed
Type: task
Welle: 6 · Strang: X3 · Paket: `packages/honorar` (neu; dazu `tools/boundaries.mjs`, Workspace-Dateien)
Blocked by: –
Modell: opus
Regeln: A2, A3, N1–N3, Q1, C1, C4, U5, D-56
Herkunft: `plan.md` §2 X3, Berater D-56 (HOAI-Tafeln als Daten im Repo, Rundungskette als Projektkonvention)

## What to build

Ein reines TS-Paket (A2), das Honorare nach der **HOAI 2021** rechnet (Verordnung über die Honorare für Architekten- und
Ingenieurleistungen, Fassung der Änderungsverordnung BGBl. I 2020 S. 2636; amtliches Werk nach § 5 Abs. 1 UrhG, deshalb dürfen
Tafelwerte ins Repo, D-56). Es importiert nur `vertrag` und `dezimal` (`'packages/honorar': ['packages/vertrag',
'packages/dezimal']`, `apps/web` darf es importieren). In diesem Ticket mit **eigenen Eingabetypen**; die Vertragstypen
(`Honorarberechnung`, `Honorarergebnis`) bringt Ticket 97, die Umstellung und die Befehle Ticket 110. Halte die eigenen Typen
nahe an der Form unten.

**Quelle.** Lies die Paragraphen selbst auf `https://www.gesetze-im-internet.de/hoai_2013/` (§§ 4, 6, 7, 13, 14, 16, 33, 34,
35, 36, 51, 52, 55, 56; dazu 39, 40, 43, 44, 47, 48, wenn die Zeit reicht). Im Repo stehen nur Tafelwerte, Namen der
Leistungsphasen und Prozentsätze, je mit § und Absatz und Abrufdatum als Kommentar – **keine** Texte der Grundleistungen aus
den Anlagen (C1).

1. **Honorartafeln als Daten** (Pflicht: § 35 Abs. 1 Gebäude und Innenräume, § 52 Abs. 1 Tragwerksplanung, § 56 Abs. 1
   Technische Ausrüstung; wenn Zeit bleibt: § 40 Freianlagen, § 44 Ingenieurbauwerke, § 48 Verkehrsanlagen). Je Zeile die
   anrechenbaren Kosten und je Honorarzone „von“ und „bis“ in Euro (Honorarspannen, Orientierungswerte nach § 35 Abs. 1). Die
   Zahl der Honorarzonen je Leistungsbild aus der Quelle (z. B. § 56: I–III). **Datentests:** Zeilen streng steigend; wo die
   Tafel es zeigt, „bis“ der Zone n = „von“ der Zone n+1; erste und letzte Zeile jeder Tafel gegen die Quelle (Abschrift im
   Test, mit §).
2. **Leistungsphasen** je Leistungsbild mit Prozentsätzen aus der Quelle (Gebäude § 34 Abs. 3, Innenräume abweichend;
   Tragwerksplanung § 51; Technische Ausrüstung § 55). Die Sätze LPH 6–9 nicht aus dem Gedächtnis, nur aus der Quelle.
3. **Rechnung (N1, Rundungskette D-56):**
   - § 13: lineare Interpolation zwischen den Tafelzeilen, „von“ und „bis“ je für sich:
     `von(aK) = von_u + (aK − aK_u) × (von_o − von_u) / (aK_o − aK_u)`, erst multiplizieren, dann teilen, Ergebnis
     kaufmännisch auf 2 Stellen. Anrechenbare Kosten genau auf einer Tafelzeile: deren Werte.
   - Honorar = round(von + (bis − von) × Honorarsatz / 100, 2); **Honorarsatz in Prozent der Spanne**, 0 = Basishonorarsatz
     (Standard nach § 7 Abs. 1, wenn nichts vereinbart ist), 100 = oberer Honorarsatz. „Mittelsatz“ (50) ist nur eine
     Bezeichnung der Praxis, kein Begriff der HOAI.
   - je beauftragter Leistungsphase round(Honorar × Anteil / 100, 2); Grundhonorar = Summe der Phasen.
   - Umbauzuschlag (§ 6 Abs. 2, § 36) = round(Grundhonorar × Satz / 100, 2); über 33 % (Gebäude) bzw. 50 % (Innenräume): Hinweis,
     kein Fehler. Ohne Satz kein Zuschlag (die App bietet 20 % als Vorschlag an, wenn der Nutzer „Umbau“ wählt).
   - Nebenkosten (§ 14): als Prozent = round((Grundhonorar + Umbauzuschlag) × Satz / 100, 2) oder als Betrag.
   - Umsatzsteuer (§ 16 Abs. 1) = round((Grundhonorar + Umbauzuschlag + Nebenkosten) × Satz / 100, 2); Brutto.
   - Mehrere Objekte: je Objekt für sich, dann summiert; § 11 (Wiederholungen, mehrere Objekte) nicht in v1, Hinweis.
   - Anrechenbare Kosten außerhalb der Tafel (unter der ersten, über der letzten Zeile): Befund `ausserhalb-honorartafel`,
     kein Honorar für dieses Objekt (keine Extrapolation; RifT später). Leistungsbild ohne Tafel: Befund.
4. **Anrechenbare Kosten aus Kosten nach DIN 276** (Gebäude und Innenräume, § 33; netto nach § 4 Abs. 1): KG 300 voll
   (Abs. 1); KG 400, wenn der Auftragnehmer die Technischen Anlagen nicht selbst plant oder überwacht (Abs. 2): voll bis 25 %
   der sonstigen anrechenbaren Kosten, zur Hälfte für den Teil darüber; „sonstige“ = KG 300 plus ein von Hand eingegebener
   Betrag nach Abs. 3 (Herrichten, nichtöffentliche Erschließung, Ausstattung, Kunstwerke, nur wenn geplant oder überwacht);
   mitzuverarbeitende Bausubstanz (§ 4 Abs. 3) von Hand dazu. Jeder Teilbetrag auf 2 Stellen. Andere Leistungsbilder:
   anrechenbare Kosten von Hand. Die Prüfung der Kostenermittlungsstufe (§ 6 Abs. 1 Nr. 2: Kostenberechnung, sonst
   Kostenschätzung) kommt mit Ticket 110.
5. **Ergebnis** je Objekt (anrechenbare Kosten mit Herleitung, Tafelzeilen unten/oben, von, bis, Honorar, Phasenbeträge,
   Umbauzuschlag) und gesamt (Grundhonorar, Umbauzuschläge, Nebenkosten, Netto, USt, Brutto) mit Befunden (U5).
6. **Tests (Q1, C4):** Golden-Tests von Hand aus der Tafel hergeleitet (Herleitung im Test): mindestens ein Fall Gebäude
   Zone III mit aK streng zwischen zwei Zeilen und KG 400 über 25 % (beide Zweige von § 33 Abs. 2), Honorarsatz 50, LPH 1–9,
   Umbauzuschlag, Nebenkosten in Prozent, USt; ein Fall genau auf einer Tafelzeile; je ein Fall Tragwerksplanung und
   Technische Ausrüstung; ein Fall außerhalb der Tafel = Befund. Property-Tests: innerhalb einer Zone monoton in aK;
   Honorarsatz 0 → von, 100 → bis; Summe der Phasen bei 100 % Anteil = Honorar bis auf Rundungsreste (≤ 1 Cent je Phase).

Begriffe zuerst ins `GLOSSARY.md` (L2), Abschnitt „Planerhonorar (HOAI)“: **Honorartafel**, **Honorarspanne** (von/bis),
**Basishonorarsatz**, **oberer Honorarsatz**, **Honorarsatz** (Lage in der Spanne in Prozent; den bestehenden Eintrag
„Honorarzone & Honorarsatz“ an HOAI 2021 anpassen: Basishonorarsatz statt Mindestsatz), **Grundhonorar**, **Nebenkosten**,
**Honorarobjekt**.

## Grenzen

- Nur `packages/honorar` (und die genannten Wurzeldateien). Keine Befehle, kein Speicher (Ticket 110). `okf/research/` wird nicht
  gelesen (C3).

## Acceptance criteria

- [ ] Datentests der Tafeln, Golden- und Property-Tests wie oben; jede Tafel mit Quelle (§, Absatz, URL, Abrufdatum)
- [ ] Paketgrenzen-Prüfung kennt `honorar`; Lint-Regel N1 gilt für das Paket
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments
