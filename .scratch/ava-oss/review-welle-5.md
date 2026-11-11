# Wellen-Review Welle 5

Stand 2026-11-11/12, Skill `code-review`, Fixpunkt `97bd414` (Ende Welle 4), Kopf `integration/welle-5` nach dem Merge von
87 (Ticket 91 lief noch). Zwei getrennte Achsen (Opus), Befunde nicht zusammengelegt.

## Standards

Sauber geprüft: N1, A2, A3, A5, Q5 im GAEB-Writer und in Migration 5, N2/N5 (abrechnung nutzt `nachlassBetrag`,
`gesamtpreis`, `prozentVon`).

Hart (L1/L2, GLOSSARY):
- **S1** `apps/web/src/kosten/kalkulation.ts:25` `interface Ansatzzeile` meint eine Kalkulationszeile; „Ansatzzeile“ ist im
  Glossar die Zeile eines Mengenansatzes. Umbenennen (`Kalkulationszeile`).
- **S2** `apps/web/src/kosten/texte.ts:175` `spalteZuschlag: 'Zuschlag'` für den Kalkulationszuschlag; nach Glossar muss
  „Kalkulation“ im Bezeichner stehen.

Ermessen (Fowler):
- **S3** KG-Formregel `^[1-9][0-9]{2}$` viermal (`kern/positionsfelder.ts:14`, `gaeb/kostengruppe.ts:39`,
  `speicher/dekoder.ts:751`, `kosten/kostengruppe.ts:22`); `gaeb`/`speicher` dürfen `kern` importieren.
- **S4** `abrechnung/form.ts:63` `ansatzFehler` kopiert `mengenansatzFehler` des Kerns (nicht exportiert);
  `form.ts:48` `datumFehler` und `erechnung/zahlen.ts:55` `kalenderdatum` gleiche Kalenderlogik.
- **S5** Vier Stellen bauen Protokolleintrag + `eintragSchreiben` + `Teil` von Hand (`abrechnung/aufmass.ts:44` samt eigenem
  `Lauf`, `rechnung/rechnungen.ts:48`, `nachtrag/speichern.ts:190`, `auftrag/auftrag.ts:86`) statt `eintrag`/`speichern`.
- **S6** Middle Man `rechnung/ausfuehrer.ts` (nur Re-Export; Grund entfallen).
- **S7** Repeated Switches: `umkehren` (`befehlsweg.ts:229`), `zielNach` (`HistorieAnbieter.tsx:38`), `Teil.changeSet`
  (`historie.ts`) – je neuer Aggregatart drei Stellen; eine Tabelle `art → { umkehren, ziel }`.
- **S8** Vier gleiche `Verweis`-Komponenten (`abrechnung/`, `auftrag/`, `rechnung/`, `kosten/`) plus Kopie in `ProjektSeite.tsx`.
- **S9** Kinder je Eltern nach Reihenfolge dreimal (`abrechnung/baum.ts:10`, `gaeb/x31-schreiben.ts:72`, `vorlage/logik.ts:76`);
  Kern hat `baueIndex`, exportiert ihn nicht.
- **S10** `kern/auftrags-lv.ts:105` `baueAuftragsChangeSet` spiegelt `kern/changeset.ts:177` `baueChangeSet`.
- **S11** `abrechnung/rechnung-pruefen.ts:69` `Abweichung` (gefordert − geprüft) gegen Glossar „Abweichung“ der
  Kostenkontrolle (Vergabe − Budget).
- **S12** D-20: `lv/LvSeite.tsx:289–305` trägt Fachlogik von Ticket 89 (`kostenFolge`, `kalkulationOeffnen`, `kgPositionen`)
  in der gemeinsamen Datei.

## Spec

Geldregeln stimmen (D-34-Kette, Nachlass absolut anteilig, Umlagen nach MwSt, eingefrorene Zahlbeträge, Freigabe-Invariante an
drei Stellen, Soll/Ist streng, < 90 % nur abgeschlossen, Kostenkontrolle mit Summenbefund). Migration 5, Projektdatei v5,
Undo aller neuen Arten, X31, XRechnung, KG als `CtlgAssign`, E2E je App-Ticket: wie verlangt.

(a) Fehlt oder teilweise:
- **P1** 89: „im LV-Grid eine Spalte „KG““ – wurde ein Dialog (D-89.1).
- **P2** 86: kein „Zuschlag erteilen“ an einem Nachtrags-LV – Knopf im Preisspiegel noch sichtbar (`PreisspiegelSeite.tsx:227`).
- **P3** 86: LV-Liste aus `LvUebersicht.nachtrag`/`vorlage` – `ProjektSeite.tsx` lädt weiter ganze LVs (D-86.4).
- **P4** D-45: Undo-Messung 82–144 ms je Schritt am Blatt mit 5.000 Zeilen; Folgeticket fehlt.
- **P5** D-35: nicht beauftragter Nachtrag als Infozeile in der Rechnung – fehlt in `rechnung/Pruefansicht.tsx`.
- Offen, nicht gezählt: Ticket 91 (Kettentest, `m4.spec.ts`, Abrechnungsspalte in der Kosten-E2E, Korrektur nach Freigabe
  über die Oberfläche).

(b) Scope creep: keiner von Gewicht (zusätzliche Befunde `freigabe-abweichend`, `leistungsstand-doppelt`, `summe-abweichend`,
Dialog für den Blattkopf).

(c) Umgesetzt, aber vermutlich falsch:
- **P6** Nachtrags-OZ: Das Nachtrags-LV bekommt die Maske des Auftrags-LV, D-80.1 setzt die OZ der neuen Gliederung davor
  (`abrechnung/src/nachtrag-uebernehmen.ts:324–326`). Nutzt der Nachtrag seine Maske voll, landet er eine Stufe zu tief
  (`04.01.01.0010` gegen `NN.NN.NNNN`) → `oz-unpassend`, GAEB-Export des Auftrags-LV wird Entwurf. Die Fixture hat nur eine
  Titelstufe.
- **P7** Q5: `apps/web/src/ausgabe/profile.ts:30` verwirft unlesbare/doppelte gespeicherte Druckprofile still; das nächste
  Speichern überschreibt sie.

Summe: Standards 12 (2 hart, schwerster S1/S2 Glossar-Doppelbedeutung); Spec 7 (schwerster P6 Nachtrags-OZ eine Stufe zu tief).

## Behebung

Siehe D-47 in `entscheidungen-auto.md` und Ticket `issues/92-fix-welle-5-review.md`.
