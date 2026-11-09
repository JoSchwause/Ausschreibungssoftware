# Spec: Tethys AVA (Arbeitsname) – Open-Source-AVA für Planer und Architekten

Stand: 2026-11-09. Quellen: `.scratch/ava-oss/plan.md`, `.scratch/ava-oss/grilling.md`, `docs/regeln.md`,
ADRs 0001–0011, `GLOSSARY.md`. Diese Spec erfindet nichts Neues. Sie fasst die Entscheidungen
zusammen, damit Tickets sie zitieren können. Bei Widerspruch gilt: ADR vor Regel vor Plan vor Spec.

## 1. Problem

Planer und Architekten erstellen Leistungsverzeichnisse (LV), werten Angebote aus und rechnen Bauleistungen
ab (AVA). Marktübliche Software ist lizenzpflichtig, geschlossen und an Hersteller-Formate gebunden. Es
gibt keine freie, deutsche AVA-Software, die GAEB DA XML sauber liest und schreibt und Preisspiegel und
Zuschlag abdeckt. Ein befreundetes Architekturbüro nutzt heute eine kommerzielle AVA und ist der erste
Nutzer (G-02).

## 2. Ziel (MVP, Meilenstein M3)

Ein Architekt kann **ein LV anlegen, mit GAEB austauschen, Angebote vergleichen und den Zuschlag
erteilen** (Schnitt A, Vergabe-Kern LPH 6–7; G-04). Konkret:

1. LV anlegen, gliedern, Positionen aller Arten pflegen, Summen, Nachlass und MwSt rechnen lassen.
2. LV als X81/X83/X86 exportieren und X81/X83/X84 einlesen (GAEB DA XML 3.3 und 3.2; G-10, G-11).
3. Bieter und Angebote erfassen oder per X84 einlesen, Preisspiegel mit virtuellen Bietern, Ausreißern,
   ABC-Klassen und Rangfolge ansehen.
4. Zuschlag erteilen und daraus das Auftrags-LV erzeugen.
5. Daten bleiben lokal, nichts geht verloren (G-03, G-35, Regel Q5).

## 3. Nicht-Ziele (v1)

Mehrbenutzer und Server (G-01) · Bieteroberfläche über X84 und Excel hinaus (G-14) · Länder außer
Deutschland (G-08) · STLB-Bau und DIN-Katalogtexte im Repo (G-16, G-17) · GAEB 90/2000 · Phasen 82, 85, 89
(G-11) · Rechnungserzeugung (G-15) · Nachlass je Titel oder Position (G-23) · mehrere Nachlässe, MwSt-Satzwechsel
(G-23, G-26, G-28) · getrennte Vergabe von Losen (G-29) · Tablet und Handy (G-30) · Übersetzungen (G-34).
Erweiterungen X1–X6 (BIM, Bauzeitenplan, HOAI, Bauleitung, Bieterportal, KI) erst nach M4 (G-05). Auktion nie.

## 4. Nutzer und Randbedingungen

- **Nutzer:** Planer, Architekten, Ingenieurbüros; ein Büro am Anfang, Einzelnutzer-Betrieb je Installation.
- **Gerät:** Desktop ab 1280 px, Tastatur zuerst, Excel-ähnliche Zellnavigation (G-30, U3).
- **Umfang:** Ziel 10.000 Positionen, Tests bei 5.000 und 10.000 (G-33, Q4).
- **Betrieb:** PWA auf GitHub Pages, offline nutzbar, kein Konto (G-53, ADR 0001).
- **Lizenz:** AGPL-3.0-or-later, DCO, REUSE (ADR 0008). Clean Room: kein fremder Code, keine fremden
  Assets, keine lizenzierten Texte (ADR 0007, Regel C1).

## 5. Fachmodell (Kurzform, Details in `GLOSSARY.md` und ADR 0011)

- **Projekt** mit Name und Bauherr-Feldern; darin mehrere LVs.
- **Ausschreibungs-LV, Angebot, Auftrags-LV** sind getrennte Aggregate mit gemeinsamer
  Positionsidentität (UUIDv7, Regel A7). Die Ordnungszahl ist Anzeige, nie Schlüssel.
- **Gliederung:** Lose (nur gliedernd), Titel, Positionen, Hinweistexte. OZ-Maske je LV frei definierbar,
  ein GAEB-Import übernimmt eine abweichende Maske (G-25).
- **Positionsarten:** Normal, Bedarf mit und ohne Gesamtbetrag, Wahl, Zuschlagsposition (GAEB `MarkupItem`,
  nicht „Zulage“; G-22), Stundenlohn, Pauschal, Hinweis. Dazu Einheitspreisanteile (EPA).
- **Nachlass:** genau einer je LV und je Angebot, prozentual oder absolut, umkehrbar, nie in die EP
  eingerechnet (G-23, G-26). **MwSt:** ein Satz je LV (G-28).
- **Preisspiegel:** virtuelle Bieter Min, Mittel, Max; Ausreißer ±20 %; ABC-Klasse A bis 80 %; beides
  einstellbar (G-26).

## 6. Rechenregeln

Alle Rechnung steht in einem reinen TypeScript-Paket ohne DOM, Speicher, I/O, Zeit und Zufall
(ADR 0003, A2). Verbindlich: Regeln N1–N4 und G-21.

| Regel | Inhalt |
|---|---|
| Dezimal | Kein `number` für Menge, Preis, Betrag, Prozent (N1). |
| Stellen | Menge 3, EP 3 (gespeichert), Prozent 2, Betrag 2 (G-21). |
| GP | `round_half_up(Menge × EP, 2)` (N2). |
| Summen | Summe der **gerundeten** GPs. |
| MwSt | Auf die Nettosumme nach Nachlass, nicht je Position (N2). |
| Neuberechnung | Nur im betroffenen Teilbaum, Ergebnis als ChangeSet (A6). |

**Golden-Tests** nur mit Zahlen, die aus einer VOB- oder GAEB-Regel herleitbar sind (G-41, C4).
Von Hand nachrechenbare Beispiele: `1,235 × 10 = 12,35`; `3,333 × 4,56 = 15,19848 → 15,20`;
2565,00 netto × 19 % = 487,35 MwSt, brutto 3052,35.

## 6a. Austausch und Prüfung (GAEB)

- Eigene Validierung in der App; das offizielle XSD läuft nur in der CI als Gegenprüfung und wird nicht
  committet (G-12, ADR 0010).
- Export bei fehlgeschlagener Prüfung: warnen und als Entwurf kennzeichnen, nicht sperren (G-13).
- Jede Phase hat einen Roundtrip-Test Import → Export → Import (Q3).
- Tolerant lesen, streng schreiben. Testdaten und ihre Herkunft: `okf/research/standards/test-data-sources.md`
  (lokal) und G-55 (Dateien Dritter nur mit Herkunftsvermerk und REUSE-Eintrag, Regel C4).
- Abgrenzung: Bei Bieter-Rückgaben gilt „nicht angeboten“ ungleich 0,00 EUR.

## 7. Qualität und Verifikation

- TDD mit Vitest; Golden- und Property-Tests für Rechenregeln (Q1).
- Playwright-E2E für jeden Kernablauf; CI aus Lint, Typen, Unit, E2E, Paketgrenzen, Lizenzen (Q2).
- Leistungsbudgets sind Tests (Q4). Kein stiller Datenverlust (Q5), Speichern bei jedem Befehl (G-35).
- Meilensteine: **M1** LV anlegen, rechnen, speichern · **M2** GAEB rein und raus, XSD-valide ·
  **M3 = MVP** Ausschreibung → Angebote → Zuschlag · **M4** durchgehende Kette LPH 6–8.
  Verifikation je Meilenstein steht in `plan.md` Abschnitt 4.

## 8. Prototyp und Nutzerinterview

Der Nutzer will **zuerst einen Prototyp**, an dem sich Fragen für das Interview mit dem Büro später klären
lassen (G-02, Nachtrag 2026-11-09). Konsequenz für den Plan:

- Das Interview ist kein Tor mehr vor Welle 3, sondern findet am Prototyp statt.
- Der Prototyp ist **Wegwerfcode** (Skill `prototype`), kein Teil des Monorepos. Er soll LV-Grid, Summen und
  Preisspiegel auf Fixture-Daten zeigen, also genau das, wofür U2 ohnehin gegen Fixtures baut.
- Er beantwortet vier Fragen (entschieden 2026-11-09): LV-Grid und Tastatur, Lesbarkeit des Preisspiegels,
  Gliederung Projekt/LV/Angebot, GAEB-Weg. Form: klickbare UI mit mehreren Varianten je Ansicht.
  Ticket: `.scratch/ava-oss/issues/18-prototyp-interview.md`.

## 9. Ergebnis der ADR-Prüfung (Ticket 01)

ADR 0001–0011 geprüft gegen die Antworten G-01 bis G-55. **Angenommen**, mit folgenden Anpassungen:

| ADR | Befund | Maßnahme |
|---|---|---|
| 0003 | Folge „Golden Tests mit gemessenen Referenzwerten“ widerspricht G-41 (nur herleitbare Zahlen). Außerdem „Zulagen“ statt „Zuschlagspositionen“ (G-22). | **Korrigiert.** Wortlaut an G-41 und G-22 angepasst. |
| 0001 / 0002 | Die Projektdatei heißt in ADR 0001 „JSON-Projektdatei“, in ADR 0002 ist es „die Datenbankdatei“. | **Entschieden: G-56.** JSON-Datei zum Sichern und Austauschen, SQLite bleibt intern. ADR 0002 angepasst. |
| 0002 | OPFS-Speicher kann vom Browser geräumt werden. Nur G-03 (Export-Erinnerung, Sicherungsordner) mildert das. | **Empfehlung:** In S1/S4 `navigator.storage.persist()` anfragen und den Zustand in der UI zeigen. Kein ADR-Änderungsbedarf. |
| 0007 | „ggf. DIN-Katalogtexte“ ist durch G-16 entschieden (im Repo nur Nummern). Lizenzteil ist durch ADR 0008 ersetzt. | Nur Wortlaut; Statusvermerk genügt. |
| 0010 / G-55 | ADR 0010 hält das XSD aus dem Repo, weil es © DIN trägt. G-55 erlaubt unveränderte BVBS- und GAEB-Dateien im Repo, die in derselben Lage sind. Das ist ein bewusst in Kauf genommener Widerspruch. | **Vermerkt.** Bei Beanstandung zuerst die amtlichen Dateien entfernen; Herkunft ist je Datei dokumentiert. |
| 0004 | Gilt. G-31 nennt zusätzlich Radix-Primitive (MIT, AGPL-kompatibel). | Keine. |
| 0005, 0006, 0008, 0009, 0011 | Konsistent mit den Antworten. 0011 deckt G-23/G-26 ab (ein Nachlass je LV; für Angebote durch G-26-Nachtrag ergänzt). | Keine. |

Weitere Unstimmigkeit außerhalb der ADRs: `GLOSSARY.md` nennt „EP … 2, optional 3 Nachkommastellen“, G-21 legt
EP mit 3 gespeichert fest. Das Glossar ist beim Schreiben von F2 anzupassen (Regel L2).

## 10. Offene Punkte

| Punkt | Wo | Blockiert |
|---|---|---|
| G-27 Tiefe der Rechnungsprüfung | vertagt, eigene Runde vor Welle 5 | A3 |
| „VOB 80“, zweite Bedeutung | vor A1 klären | A1 |
| Rechtliche Prüfung der NOVA-Recherche (G-42) | `okf/research/` bleibt lokal | Veröffentlichung |
| Prototyp bauen (Ticket 18), danach Interview | `.scratch/ava-oss/issues/18-prototyp-interview.md` | Interview |
| Tickets für Welle 1–2 schneiden | `plan.md` Abschnitt 5, Schritt 5 | Welle 1 |
