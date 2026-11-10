# 30: Anpassung `kern` an v1.1a (füllt `summen.vorher`, Löschen, Hinweise, Maskenbefund am Befehl)

Status: ready-for-agent
Type: task
Welle: 3 (Phase A) · Strang: K · Paket: `packages/kern`
Blocked by: - (Punkt 9 braucht den Hinweiscode aus Ticket 29; diesen Punkt zuletzt, nach dem Merge von 29)
Regeln: A2, A5, A6, A7, F1, F2, N2, N5, U5, Q1, Q5
Herkunft: Ticket 24, Comments „Folgetickets: kern“; D-02, D-06 (`entscheidungen-auto.md`); W-01, W-05 Nr. 3, Abschnitt C (`next-decisions-welle-2.md`)

## What to build

Der Kern nutzt, was `vertrag` v1.1a anbietet, und räumt die mit `// v1.1a: mechanisch angepasst, Folgeticket`
markierten Stellen ab. Jeder Befehl bleibt rein und deterministisch (A2); Fehler sind Werte.

1. **`summen.vorher` füllen.** Jedes `LvChangeSet`, das der Kern erzeugt, setzt `summen.vorher` (`Summenvorher`):
   alte Werte jeder genannten Positions- und Gliederungssumme, `gesamt` (wenn geändert oder das LV gelöscht wird),
   `entfernt` (volle Summen entfernter Knoten). Der zentrale Ort ist `summenAenderung` in `summen.ts` und
   `baueChangeSet` in `changeset.ts`; `LEERE_SUMMENAENDERUNG` trägt ein leeres `vorher`.
2. **`changeSetUmkehren(cs)` ohne Vorzustand.** Die Umkehrung liest alles aus dem ChangeSet (`kopf`, `knoten`,
   `summen.vorher`). Der zweite Parameter `zustandVorher` entfällt; alle Aufrufer und Tests werden angepasst.
   Achtung (Ticket 24, „Nachbesserung“): die Gleichheit der doppelten Umkehrung darf nicht an der Reihenfolge in
   `summen.positionen`/`gliederungen` hängen; vergleiche als Mengen oder ordne kanonisch.
3. **`lvChangeSetAnwenden` liefert `null`**, wenn `kopf.nachher` `null` ist (Löschen, Umkehrung des Anlegens). Die
   Annotation `: LvChangeSetAnwenden` ersetzt das `satisfies` (Marker in `changeset.ts` weg); kein Wurf mehr dafür.
4. **`LeistungsverzeichnisLoeschen`.** Handler in `BEFEHLS_HANDLER`, Schlüssel aus `ZUSTAENDIGES_TICKET` weg.
   ChangeSet: `kopf: { vorher: Kopf, nachher: null }`, alle Knoten in `knoten.entfernt` (Eltern vor Kindern), keine
   neuen Summen, `summen.gesamt: null`, `summen.vorher` mit `gesamt` und allen Summen unter `entfernt`.
5. **`LeistungsverzeichnisAnlegen`: Wurzel prüfen.** Weicht `inhalt.wurzelId` von `id` ab: `ungueltige-eingabe`,
   `feld: 'inhalt.wurzelId'` (Typkommentar im Vertrag). Knoten der obersten Ebene mit anderer `elternId` weist
   `baumfehler` schon ab; Test dafür.
6. **`GliederungAnlegen.ordnungszahl`** übernehmen (fehlt oder `null`: wie heute `null`). Eine gesetzte OZ wird wie
   bei `OrdnungszahlSetzen` an einer Gliederung geprüft (gleiche Funktion, gleiche Codes); doppelte OZ sind bei der
   Handeingabe erlaubt (F2).
7. **Codes und Hinweise der OZ-Vergabe (F2, E-09).** In `oz-befehle.ts`:
   - Doppelte OZ beim Umnummerieren (`doppeltFehler`): `oz-doppelt` statt `oz-ungueltig`.
   - Überlauf, wenn auch Schritt 1 nicht passt (Position) bzw. eine Gliederungsnummer nicht in ihre Stellen passt:
     `oz-ueberlauf` statt `maske-ungueltig`.
   - Weicht eine Geschwistergruppe auf Schritt 5, 2 oder 1 aus: ein `Befehlshinweis` `oz-schritt-ausgewichen` je
     Gruppe, `knotenId` = erste Position der Gruppe, `feld: 'ordnungszahl'`, Meldung nennt den Schritt. Gilt für
     `Umnummerieren` und `OzMaskeSetzen`. `OZ_ANNAHMEN.ueberlauf` wird entsprechend umformuliert (der Kanal existiert jetzt).
   - `losStufe` (F1, E-08): Ist `ozMaske.losStufe === true`, sind alle Gliederungen der obersten Ebene Lose; ein Titel
     dort wird beim Anlegen, Verschieben und `OzMaskeSetzen` abgewiesen (`knotenart-unzulaessig`), Positionen und
     Hinweistexte direkt unter dem LV bleiben erlaubt. Ist `losStufe` nicht `true`, bleibt das heutige Verhalten
     (`LOS_ANNAHME`). Lose und Titel nebeneinander auf der obersten Ebene sind in beiden Fällen verboten (F1); fehlt
     diese Prüfung heute, kommt sie dazu (`regeln.ts`, eine benannte Funktion).
8. **Negatives Netto nach Nachlass (N5, E-06).** Hat ein ChangeSet `summen.gesamt` gesetzt und ist dort
   `nettoNachNachlass` negativ, trägt es den Hinweis `netto-nach-nachlass-negativ` (einmal je ChangeSet). Der Befehl
   wird ausgeführt (keine Sperre). Vorläufige Annahme, Entscheidung offen: der Hinweis kommt bei jedem solchen
   ChangeSet, nicht nur beim Übergang von positiv zu negativ.
9. **Maskenbefund am Befehl** (nach Ticket 29): `LeistungsverzeichnisAnlegen` nimmt eine Maske, die `maskeFehler`
   beanstandet, weiter an (U5, GAEB-Import) und liefert den Befund aus `maskePruefen` als `Befehlshinweis`
   `oz-maske-ungueltig`, `feld: 'ozMaske'`. `OzMaskeSetzen` weist eine solche Maske weiter mit `maske-ungueltig` ab
   (Handeingabe, unverändert). Der Kommentar an `maskePruefen` wird entsprechend umformuliert.
10. **Leere Einheit (D-06, W-05 Nr. 3, Vertrag v1.2).** `''` als Einheit wird beim Befehl zu `null`: in
    `EinheitAendern`, `PositionAnlegen` und `LeistungsverzeichnisAnlegen` (Positionen und Unterbeschreibungen der
    Leitbeschreibung). `EinheitAendern` mit `''` auf eine Position mit `null` ergibt ein leeres ChangeSet. Nur genau
    `''`; Leerzeichen bleiben Text (kein Trimmen, U5). Der Kommentar „Einheit leer“ in `feld-befehle.ts` und
    `FELD_ANNAHMEN` werden angepasst.
11. **Projektbefehle.** `projektBefehlAusfuehren: ProjektBefehlAusfuehren` (neue Datei, Export über `index.ts`) für
    `ProjektAnlegen`, `ProjektStammdatenSetzen`, `BieterAnlegen`, `ProjektLoeschen`. `ProjektChangeSet` mit `vorher`
    und `nachher`; Löschen: `nachher: null`, `vorher` = voller Stand samt Bietern. Fehler: `befehl-nicht-zustaendig`
    (Anlegen mit Zustand, andere ohne), `id-vergeben` (Bieter-ID doppelt), `ungueltige-eingabe` (Form). Leerer Name
    erlaubt (wie `FELD_ANNAHMEN`). Gebraucht von Ticket 38/39 (Projektliste) und Ticket 36 (Bieter).
12. **Auftrags-LV anlegen.** `auftragsLvBefehlAusfuehren: AuftragsLvBefehlAusfuehren` für
    `AuftragsLeistungsverzeichnisAnlegen`: Baumregeln wie beim LV (Wurzel ist die Auftrags-LV-ID), vollständige
    Summen, `kopf.vorher: null`.
13. **Marker abräumen (v1.1a):** `changeset.ts` (Punkt 3), `ausfuehren.ts` (`LeistungsverzeichnisLoeschen`),
    `testhilfen.ts` (zwei Stellen `wurzelId`) und `summen-eigenschaften.test.ts` (`wurzelId`): Kommentar weg, Code ist
    schon richtig. Die `v1.1b`-Marker im Kern gehören **nicht** hierher, sondern zu Ticket 37 (`summenregeln.ts`,
    `knoten-befehle.ts`, `pruefung.ts`, `ausfuehren.ts` `PositionsmerkmaleSetzen`, `testhilfen.ts` `positionsfelder`,
    `baum.test.ts`, `fixtures.test.ts`, `summen.test.ts`, `feld-befehle.test.ts`).

## Grenzen

- **Größer als 4 h.** Wird es eng, zuerst Punkt 12 (Auftrags-LV, erst in Welle 4 gebraucht), dann den Teil `losStufe`
  von Punkt 7 in ein Folgeticket `kern` abgeben (Comments). Punkt 11 bleibt drin: Ticket 38/39 brauchen ihn für M1.
- Keine Änderung an `vertrag` (P2). Fehlt dem Vertrag etwas: in die Comments, nicht raten.
- Ticket 29 trägt in `ZUSTAENDIGES_TICKET` (`ausfuehren.ts`) die neuen Befehle von v1.2 ein (markiert); beim
  Zusammenführen übernehmen.
- Leistungsbudget Q4 bleibt: eine Einzeländerung bei 5.000 Positionen < 16 ms (`summen-leistung.test.ts` grün).
- `okf/research/` wird nicht gelesen (C3). Offene Punkte entscheidet der Umsetzer und protokolliert sie in
  `.scratch/ava-oss/entscheidungen-auto.md` (Demo-Modus); D-01 bis D-06, ADRs und Regeln bleiben bindend.
- TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test` grün.

## Acceptance criteria

- [ ] Property-Test: Für zufällige Befehlsfolgen (wie `eigenschaften.test.ts`) stellt `lvChangeSetAnwenden(nach, changeSetUmkehren(cs))` den Vorzustand samt Summen exakt her, ohne dass die Umkehrung den Vorzustand kennt; `changeSetUmkehren(changeSetUmkehren(cs))` ist gleich `cs` (Listen ohne Reihenfolge verglichen)
- [ ] Jedes vom Kern erzeugte `LvChangeSet` hat `summen.vorher` (Property-Test über alle Befehlsarten)
- [ ] `LeistungsverzeichnisLoeschen`: Anwenden liefert `null`; die Umkehrung, auf `null` angewendet, ergibt das LV samt Summen
- [ ] `inhalt.wurzelId ≠ id` → `ungueltige-eingabe`, `feld: 'inhalt.wurzelId'`
- [ ] `GliederungAnlegen` mit OZ: übernommen, ungültige OZ abgewiesen wie bei `OrdnungszahlSetzen`
- [ ] Tests für `oz-doppelt`, `oz-ueberlauf` und den Hinweis `oz-schritt-ausgewichen` (eine Gruppe mit so vielen Positionen, dass Schritt 10 nicht passt, Schritt 5 aber schon)
- [ ] `losStufe: true`: Titel auf oberster Ebene abgewiesen; Lose und Titel nebeneinander auf oberster Ebene abgewiesen; ohne `losStufe` unverändert (bestehende Tests grün)
- [ ] Hinweis `netto-nach-nachlass-negativ` bei `NachlassSetzen` mit Betrag über dem Netto; ChangeSet trotzdem geliefert
- [ ] Hinweis `oz-maske-ungueltig` bei `LeistungsverzeichnisAnlegen` mit einer Maske, die `maskeFehler` beanstandet
- [ ] `''` als Einheit landet als `null` (drei Befehle getestet); `''` auf `null` ergibt ein leeres ChangeSet
- [ ] `projektBefehlAusfuehren`: vier Befehle mit Wirkung, Fehlern und Umkehrbarkeit getestet
- [ ] `auftragsLvBefehlAusfuehren`: Anlegen mit den Fixture-Knoten von `typisch` ergibt die Summen der Fixture
- [ ] Kein `// v1.1a: mechanisch angepasst`-Marker mehr in `packages/kern`
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün

## Nicht-Ziele

Positionsmerkmale, Wahl- und Zuschlagspositionen, EPA und alle `v1.1b`-Marker (Ticket 37). Prüfregeln (Ticket 41).
Kopieren, Papierkorb, `LvStandAnlegen` (Ticket 42). Angebotsbefehle (Ticket 36, `vergabe`). `Summenaenderung.vorher`
zur Pflicht machen (späteres Vertragsticket, sobald dieses Ticket gemergt ist).

## Comments
