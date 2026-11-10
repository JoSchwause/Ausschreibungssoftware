# 41: Kern: Prüfregeln, formale LV-Prüfung (K8, Logikteil); Befehle für Kopfdaten (D-07)

Status: ready-for-agent
Type: task
Welle: 3 (Phase B) · Strang: K (K8) · Paket: `packages/kern`
Blocked by: 37, 29
Regeln: A2, A6, F1, F2, F3, F4, N1, N5, U5, L1, L2, Q1, Q4, C3
Herkunft: D-07 (`entscheidungen-auto.md`: Kern-Handler der Kopfdaten-Befehle aus Ticket 29, Punkt 8), `plan.md` §2 K8, altes Ticket `.scratch/ava-mvp/issues/16` (Logikteil), U5/G-13, E-06 (negatives Netto ist Befund), E-09/F2 (doppelte OZ bei Handeingabe erlaubt, wird gemeldet), W-05 Nr. 2 (Längen, Zeichen und Einheiten prüft erst K8), Ticket 27 (`FELD_ANNAHMEN`), Ticket 37 (Altform, Formprüfungen)

## What to build

Eine reine Funktion prüft ein LV und liefert Prüfbefunde. Sie sperrt nie (U5): Jeder Befehl, den der Kern annimmt, bleibt
angenommen; die Prüfung sagt nur, was nicht stimmt. Die App zeigt die Befunde im Prüf-Panel mit Sprunglinks (Ticket 47)
und an den Zellen des Grids (`LvZeile.befunde`). Vorgehen: TDD mit dem Skill `tdd`; am Ende
`pnpm lint && pnpm typecheck && pnpm test` grün. `okf/research/` wird nicht gelesen (C3).

- **API** (Vorschlag): `lvPruefen(zustand: LvZustand): readonly Pruefbefund[]`, Typ aus `vertrag` (`gaeb.ts`): `schwere`
  (`warnung` | `fehler`), `quelle: 'lv-pruefung'`, stabiler `code`, deutsche `meldung`, `ort` mit `knotenId` und `feld`
  (Spaltenname wie `LvSpalte`, z. B. `menge`; bei LV-weiten Befunden ohne `knotenId`, `feld` z. B. `name`, `nachlass`).
  Reihenfolge der Befunde: Dokumentreihenfolge der Knoten, je Knoten nach Code; deterministisch (Golden-tauglich).
- **Regeln** an genau einer Stelle (`pruefregeln.ts`), jede eine benannte Funktion mit Code, Schwere und Test. „Fehler“
  heißt: ein GAEB-Export würde ungültig oder eine Summe ist fachlich falsch; „Warnung“: unvollständig oder auffällig.
  Grenzen aus dem GAEB-XSD 3.3 sind in der Ticketsitzung gelesen und hier in eigenen Worten genannt.

| Code | Schwere | Regel | Ort |
|---|---|---|---|
| `netto-nach-nachlass-negativ` | fehler | Netto nach Nachlass < 0 (N5, E-06; gleicher Code wie der Befehlshinweis) | LV, `feld: 'nachlass'` |
| `lv-name-leer` | warnung | LV-Name leer oder nur Leerraum (W-05 Nr. 2) | LV, `name` |
| `lv-name-zu-lang` | warnung | LV-Name länger als 20 Zeichen (GAEB `BoQInfo/Name`; der Export kürzt) | LV, `name` |
| `oz-fehlt` | warnung | Gliederung oder Position ohne Ordnungszahl | Knoten, `ordnungszahl` |
| `oz-doppelt` | fehler | dieselbe OZ samt Index an zwei Knoten (F2, E-09; je beteiligtem Knoten ein Befund) | Knoten, `ordnungszahl` |
| `oz-maske-verletzt` | fehler | OZ passt nicht zur Maske des LV (Stufenzahl, Länge, Ziffern/Buchstaben, Index ein Zeichen; vorhandene Funktionen aus `ozregeln.ts`) | Knoten, `ordnungszahl` |
| `oz-passt-nicht-zur-gliederung` | warnung | die vorderen Teile der OZ weichen von der OZ der Elterngliederung ab (z. B. nach Verschieben) | Knoten, `ordnungszahl` |
| `kurztext-leer` | warnung | Los, Titel oder Position ohne Kurztext (W-05 Nr. 2; Eingabe bleibt erlaubt, `FELD_ANNAHMEN`) | Knoten, `kurztext` |
| `kurztext-zeilenumbruch` | warnung | Kurztext enthält Zeilenumbruch oder Steuerzeichen (GAEB-Kurztext ist einzeilig gedacht; der Leser macht Leerzeichen daraus) | Knoten, `kurztext` |
| `langtext-leer` | warnung | Position ohne Langtext (altes Ticket 16) | Knoten, `langtext` |
| `hinweistext-leer` | warnung | Hinweistext ohne Text | Knoten, `text` |
| `gliederung-leer` | warnung | Los oder Titel ohne Position im Unterbaum | Knoten |
| `einheit-fehlt` | warnung | Position (nicht Zuschlag, nicht Pauschal) ohne Einheit; für X83 Pflicht | Knoten, `einheit` |
| `einheit-zu-lang` | fehler | Einheit länger als 4 Zeichen (GAEB `QU`) | Knoten, `einheit` |
| `einheit-zeichen` | fehler | Einheit mit Zeilenumbruch oder Steuerzeichen | Knoten, `einheit` |
| `menge-fehlt` | warnung | Position ohne Menge (nicht Zuschlag; Pauschal darf ohne Menge sein) | Knoten, `menge` |
| `menge-null` | warnung | Menge 0,000 (altes Ticket 16) | Knoten, `menge` |
| `pauschal-menge` | warnung | Pauschalposition mit Menge ungleich 1,000 | Knoten, `menge` |
| `zahl-zu-gross` | fehler | Menge mehr als 8, EP mehr als 10, GP oder Summe mehr als 11, Zuschlagssatz mehr als 3 Vorkommastellen (GAEB-Zahlformate) | Knoten bzw. LV, Feld der Zahl |
| `zuschlag-ohne-bezug` | warnung | Zuschlagsposition, deren Basis leer ist (leere Liste; kein Bereich nach R3; keine gekennzeichnete Position nach R4 aus Ticket 37) | Knoten |
| `zuschlag-altform` | warnung | Zuschlagsposition ohne Satz, aber mit Menge und EP (Ticket 37, R8): rechnet Menge × EP | Knoten |
| `zuschlag-satz-und-menge` | warnung | Zuschlagsposition mit Satz und zugleich Menge oder EP (Menge und EP werden nicht gerechnet) | Knoten, `menge` |
| `zuschlagskennzeichen-ohne-zuschlag` | warnung | gekennzeichnete Position, in deren Bereich keine Zuschlagsposition der Form Kennzeichnung steht | Knoten |
| `teilmenge-zu-gross` | warnung | Teilmenge einer Bezugsposition größer als deren Menge | Zuschlagsposition, `zuschlag` |
| `wahl-ohne-zuordnung` | warnung | Wahlposition ohne Gruppe, Variante und Grundposition | Knoten |
| `epa-summe-abweichend` | warnung | Einheitspreisanteile gesetzt, ihre Summe ≠ EP (K7, Ticket 37) | Knoten, `einheitspreis` |

  Nicht in der Liste und nicht zu prüfen, weil der Kern sie schon abweist: Gliederungstiefe, Los neben Titel (F1),
  unbekannte Bezüge, Formfehler aus Ticket 37. Ein Kurztext hat in GAEB DA XML keine Längengrenze; deshalb keine Regel
  „Kurztext zu lang“.
- **Schwellen und Grenzen** (20 Zeichen, 4 Zeichen, Vorkommastellen) als Konstanten an genau einer Stelle (N3-Prinzip).
- **Leistung:** `lvPruefen` auf `gross` (5.000 Positionen) unter 50 ms (Messwert im Ticket). Eine inkrementelle Prüfung
  ist nicht verlangt; die App ruft die Prüfung nach einem Befehl entkoppelt auf (Ticket 47).
- **Glossar (L2):** „Formale LV-Prüfung“ (die Prüfung, die diese Befunde liefert, Quelle `lv-pruefung`) eintragen, falls
  noch nicht vorhanden; die Codes sind Bezeichner, keine Fachbegriffe.

- **Befehle für Kopfdaten (D-07).** Ticket 29 (Punkt 8) legt im Vertrag je einen Befehl an, der Auftraggeber bzw.
  Vergabeinformationen am LV und die Leitbeschreibung an einer Position mit dem ganzen neuen Wert setzt (`null` =
  entfernen); die Namen stehen in `packages/vertrag/src/befehle.ts` (Vorschlag: `AuftraggeberSetzen`,
  `VergabeinformationenSetzen`, `LeitbeschreibungSetzen`). Handler wie die Feldbefehle aus Ticket 27: minimales ChangeSet
  (`kopf` bzw. der eine Knoten, keine Summen; nur die Unterbeschreibungen mit Menge ändern keine Summe, weil sie nicht
  gerechnet werden), gleicher Wert → leeres ChangeSet, umkehrbar, Fehler als Werte (`knoten-unbekannt`,
  `knotenart-unzulaessig` für Nicht-Positionen, `ungueltige-eingabe` bei falscher Form, z. B. Menge nicht in der Skala;
  `''` als Einheit einer Unterbeschreibung wird `null` wie in Ticket 30). Die Schlüssel verschwinden aus
  `ZUSTAENDIGES_TICKET`. Inhalte werden nicht geprüft (U5); fehlende Pflichtangaben für eine Vergabe sind kein Teil dieses
  Tickets.

Offene Schwellen (z. B. ob `menge-null` eine Warnung ist) entscheidet der Umsetzer im Demo-Modus und trägt sie als `D-xx`
in `.scratch/ava-oss/entscheidungen-auto.md` ein.

## Grenzen

- **Paket `packages/kern`.** Keine Änderung an `vertrag`: `Pruefbefund` und `Befundquelle 'lv-pruefung'` gibt es schon.
  Braucht eine Regel einen Code, der in `vertrag` stehen müsste, gehört er dort nicht hin (`code` ist `string`).
- Validierung blockiert nie (U5): keine Regel ändert einen Befehl oder weist ihn ab.
- GAEB-spezifische Prüfung des Exports ist Ticket 40 (`gaeb-pruefung`); Überschneidungen sind gewollt (die LV-Prüfung
  warnt früh, der Export prüft die Datei).
- **Zu groß?** Zuerst streichen: `zahl-zu-gross`, `pauschal-menge`, `oz-passt-nicht-zur-gliederung`, `epa-summe-abweichend`.
  Die Kopfdaten-Befehle bleiben (Ticket 47 braucht sie).

## Acceptance criteria

- [ ] `lvPruefen` liefert für jede Regel der Tabelle einen Befund mit Code, Schwere, Quelle `lv-pruefung`, `knotenId` und `feld` wie angegeben; je Regel ein positiver und ein negativer Test
- [ ] Doppelte OZ aus Handeingabe (`OrdnungszahlSetzen`) werden angenommen und als `oz-doppelt` an beiden Knoten gemeldet
- [ ] Ein LV mit Absolutnachlass über dem Netto: Befehl angenommen, Befund `netto-nach-nachlass-negativ`
- [ ] Golden: `lvPruefen` über `winzig`, `typisch`, `gross` und (falls vorhanden) `zuschlag` als Golden-Datei; `typisch` meldet die Altform-Zuschlagsposition
- [ ] Ergebnis deterministisch (gleiche Eingabe, gleiche Reihenfolge); Property-Test: kein Befehl wird wegen einer Regel abgewiesen
- [ ] `lvPruefen(gross)` < 50 ms (Messwert im Ticket)
- [ ] Die drei Kopfdaten-Befehle aus Ticket 29 sind zuständig; je Wirkung, leeres ChangeSet bei gleichem Wert, Umkehrung, Fehlerfälle getestet
- [ ] `pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Prüf-Panel und Sprunglinks (47), Prüfung von Angeboten (Welle 4), GAEB-Exportprüfung (40), Korrekturvorschläge oder
Autokorrektur, inkrementelle Prüfung.

## Comments
