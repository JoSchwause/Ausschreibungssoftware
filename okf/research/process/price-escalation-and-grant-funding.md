---
type: Research Note
title: "Öffentliche Mittel in Abrechnung und Kostenkontrolle: Preisgleitklauseln, Zuwendungsrecht und Verwendungsnachweis"
description: Spezifiziert Rechenregeln, Datenfelder und Ausgaben, die eine AVA-Software braucht, wenn öffentliches Geld im Spiel ist – Lohn- und Stoffpreisgleitklauseln nach VHB Bund (Teil A) sowie Vergabepflichten, Mittelabruf und Verwendungsnachweis bei geförderten Bauvorhaben (Teil B).
resource: https://fib-bund.de/Inhalt/Vergabe/VHB/VHB_2017_Lesefassung_2023.pdf
tags: [research, preisgleitklausel, stoffpreisgleitklausel, zuwendungsrecht, verwendungsnachweis, mittelabruf, destatis]
timestamp: 2026-11-09T17:16:17Z
sources: 32
confidence: mittel
---

# Öffentliche Mittel in Abrechnung und Kostenkontrolle: Preisgleitklauseln, Zuwendungsrecht und Verwendungsnachweis

> **Lesehilfe für Nicht-Architekten.** Diese Notiz ergänzt [Prozess II: Nachträge, Aufmaß, Rechnungsprüfung](/okf/research/process/billing-and-cost-control.md) um zwei Themen, die nur auftreten, wenn **öffentliches Geld** im Spiel ist. **Teil A** behandelt **Preisgleitklauseln** (engl. *price escalation clauses*): Vertragsklauseln, die den vereinbarten Preis nachträglich an Lohn- oder Materialpreisänderungen anpassen. **Teil B** behandelt **Zuwendungen** (Fördermittel, engl. *grants*): Geld vom Staat für ein Vorhaben eines Dritten, z. B. einer Kommune, eines Vereins oder eines Kita-Trägers. Wer Fördermittel erhält, muss oft Vergaberecht anwenden, Kosten getrennt nachweisen und Geld nach festen Regeln abrufen. Abkürzungen: **AG/AN** = Auftraggeber/Auftragnehmer, **LV** = Leistungsverzeichnis, **OZ** = Ordnungszahl (Positionsnummer), **VHB** = Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes, **KG** = Kostengruppe nach DIN 276. **Rechtliche Aussagen sind Einschätzungen, keine Rechtsberatung.**

## Kurzfassung

- **Stoffpreisgleitklauseln: seit 01.07.2023 wieder Regelverfahren.** Die Sonderregeln wegen des Ukraine-Kriegs (Erlasse vom 25.03.2022 bis 20.06.2023) sind ausgelaufen. Es gilt VHB-Richtlinie 225: mindestens 10 (ausnahmsweise 6) Monate zwischen Angebot und Fertigstellung, Stoffanteil mindestens 1 % der geschätzten Auftragssumme, Bagatellgrenze 2 %, Selbstbeteiligung 10 % (mindestens der Bagatellbetrag). Formblatt 225a (Bieter-Stoffpreis statt Basiswert 1) bleibt zulässig [1][3][4][5]. Berlin übernimmt das 1:1 (ABau 2026) [21]; eine Asphalt-Erleichterung des Bundesverkehrsministeriums galt nur für Bekanntmachungen bis 30.09.2026 [8].
- **Rechenkern:** Basiswert 2 = Basiswert 1 × Index(Angebotsöffnung) / Index(Versand); Basiswert 3 = Basiswert 2 × Index(Einbaumonat) / Index(Angebotsöffnung); Mehr- oder Minderaufwand = (B3 − B2) × Menge, monatsweise; Saldo über alle Verzeichnis-OZ; Erstattung = Saldo − max(10 % Saldo, 2 % der Abrechnungssumme) [4][22]. Die Notiz liefert 13 Testfälle und ein nachgerechnetes Verbandsbeispiel (Erstattung 2.461,78 €).
- **Lohngleitklausel (Formblatt 224):** Änderungssatz in Promille je Cent Tariflohnänderung, Bagatell- und Selbstbeteiligung 0,5 % der Abrechnungssumme; das amtliche VHB-Beispiel ergibt 20.271,58 € netto [1].
- **Indexdaten:** Destatis-Tabelle 61241-0004, Basis 2021 = 100 seit 2024 (alle Werte ab 2021 neu berechnet), Veröffentlichung rund 20 Tage nach Monatsende, Datenlizenz Deutschland 2.0. Die GENESIS-API verlangt ein Nutzerkonto oder einen Token [23][24][25] – daher CSV-Import plus optionaler Nutzer-Token.
- **Private Verträge:** Stoffpreisgleitklauseln sind als Kostenelementeklauseln nach § 1 Abs. 2 Nr. 3 PrKG zulässig [26]; nach BGH (01.10.2014, VII ZR 344/13) muss der Verwender auf ungewöhnliche Kalkulationsanforderungen hinweisen [27].
- **Markt und GAEB:** In öffentlicher Herstellerdokumentation fand ich keine Gleitberechnung in ORCA, California, iTWO, NEVARIS, AVANTI oder NOVA, und GAEB kennt kein Datenelement dafür – eine Lücke, die ein offenes Produkt füllen kann.
- **Zuwendungsrecht im Umbruch:** Der Bund verlangt VOB/A bzw. UVgO von privaten Zuwendungsempfängern seit 08.09.2026 erst bei Zuwendungen über 175.000 € **und** überwiegend öffentlicher Finanzierung (vorher über 100.000 €) [9][10]. NRW verlangt sie ab über 50 % Förderquote und über 500.000 € Zuwendung [12]; Hessen und Niedersachsen verlangen in ihren ANBest-P nur noch Vergleichsangebote [13][14]. Kommunen wenden ihr eigenes Haushaltsvergaberecht an [15].
- **Verstöße kosten Förderung:** Nach der bayerischen Rückforderungsrichtlinie (2021) führt ein schwerer Vergabeverstoß – ausdrücklich auch fehlende Dokumentation – in der Regel zum Ausschluss der betroffenen Auftragseinheit, im Härtefall zu 20–25 % Kürzung der Gesamtzuwendung [16]; Gerichte bestätigten 20 % und 25 % [17][18].
- **Verwendungsnachweis:** Sachbericht + zahlenmäßiger Nachweis + Belegliste (Tag, Empfänger, Grund, Betrag je Zahlung), bei Baumaßnahmen Summen nach DIN-276-Kostengruppen, „insgesamt“ und „zuwendungsfähig“, laut Bescheid gegen laut Abrechnung; Aufbewahrung 5 Jahre nach Vorlage [9][19][20].
- **Mittelabruf: keine einheitliche Zwei-Monats-Regel mehr.** Bund „alsbald“ (Verbrauch nach mehr als 6 Wochen löst Zinsen von 5 Prozentpunkten über dem Basiszinssatz aus), NRW 2 Monate, Hessen 3, Niedersachsen 6; kommunaler Hochbau beim Bund nach Meilensteinen 20/30/40/10 % [9][12][13][14][15].
- **Folgerung:** Der Modus „gefördert“ braucht ein Förderdatenmodell mit Fassung der Nebenbestimmungen, Förderfähigkeit je Position/KG, Belegliste- und KG-Exporte, Abrufplanung und eine lückenlose Vergabeakte; der Gleitrechner ist ein Soll. Grob geschätzt 42–64 Personentage.

## 1. Begriffe

| Begriff | Erklärung |
|---|---|
| **Preisvorbehalt / Preisgleitklausel** | Vertragsregel, nach der sich der Preis bei Änderung bestimmter Kostenfaktoren ändert. Im öffentlichen Bau die Ausnahme, Festpreise haben Vorrang [1]. |
| **Lohngleitklausel** (VHB-Formblatt 224) | Erstattet Mehr- oder Minderkosten aus Tariflohnänderungen über einen **Änderungssatz** (Promille der Vergütung je Cent Lohnänderung) [1]. |
| **Stoffpreisgleitklausel** (Formblatt 225/225a) | Erstattet Mehr- oder Minderkosten einzelner Baustoffe anhand amtlicher Preisindizes [1][4]. |
| **Stoffpreisgleitklausel Nichteisenmetalle (NEM)** (Formblatt 228) | Gleitung für Kupfer, Blei, Aluminium in Kabeln und Leitungen anhand von Metallnotierungen [1]. |
| **Basiswert 1 / 2 / 3** | Materialpreis (netto je Einheit) zum Versand der Vergabeunterlagen (1), fortgeschrieben auf den Monat der Angebotsöffnung (2) und auf den Monat von Einbau, Lieferung oder Verwendung (3) [4]. |
| **GP-Nummer** | Nummer im Güterverzeichnis für Produktionsstatistiken (GP 2019) des Statistischen Bundesamts; bestimmt die Indexreihe [4]. |
| **Bagatellgrenze** | Mindestbetrag, unterhalb dessen keine Gleitung abgerechnet wird [1]. |
| **Selbstbeteiligung / Selbstbehalt** | Anteil der Mehr- oder Minderkosten, den der AN selbst trägt bzw. behalten darf [1]. |
| **Zuwendung** | Geldleistung des Staates an Stellen außerhalb der Verwaltung für einen bestimmten Zweck (§§ 23, 44 BHO und Landeshaushaltsordnungen). |
| **Zuwendungsbescheid** | Verwaltungsakt, mit dem die Bewilligungsbehörde die Zuwendung gewährt; die ANBest sind seine Nebenbestimmungen [9]. |
| **ANBest-P / -Gk / -I / -K** | Allgemeine Nebenbestimmungen für Projektförderung (P), Gebietskörperschaften (Gk), institutionelle Förderung (I), in Bayern für kommunale Empfänger (K) [9]. |
| **Verwendungsnachweis** | Abschlussbericht über die Verwendung: Sachbericht plus zahlenmäßiger Nachweis mit Belegliste [9]. |
| **Mittelabruf** | Anforderung eines Teilbetrags der bewilligten Zuwendung; nur für bald fällige Zahlungen erlaubt [9]. |

## Teil A: Preisgleitklauseln

### A.1 Rechtsgrundlagen und Stand am 09.11.2026

**Grundsatz: Festpreis vor Gleitklausel.** Das VHB enthält als Anhang 4 die „Grundsätze zur Anwendung von Preisvorbehalten bei öffentlichen Aufträgen“ vom 04.05.1972. Sie sind bis heute die Leitplanke für alle Gleitklauseln [1]:

1. Feste Preise haben Vorrang. Preisvorbehalte sind nur zulässig, wenn sie in der Branche üblich sind. Klauseln wie „Preis freibleibend“ ohne Bindung an bestimmte Kostenfaktoren sind ausgeschlossen [1].
2. **Zeitregel:** Kein Preisvorbehalt, wenn zwischen Angebotsabgabe und vereinbarter Lieferung oder Fertigstellung weniger als **10 Monate** liegen. Bei besonders hohem Wagnis darf davon abgewichen werden, aber nie unter **6 Monate** [1].
3. Gleitklauseln dürfen nur erhebliche Kostenfaktoren erfassen und nur den betroffenen Teil der Leistung. Sie brauchen eine **Bagatellklausel** und eine **Selbstbeteiligung**. Auf die Mehr- oder Minderbeträge kommt nur die anteilige Umsatzsteuer, keine weiteren Zu- oder Abschläge. Der AN muss die Nachweise erbringen [1].
4. Stoffpreisgleitklauseln sind nur für Stoffe zulässig, deren Preise besonders stark schwanken und die wertmäßig einen hohen Anteil an der Leistung haben [1].

**Instrumente und ihr Status** (Stand 09.11.2026):

| Instrument | Kernregeln | Status am 09.11.2026 | Quelle |
|---|---|---|---|
| **Formblatt 224** „Angebot Lohngleitklausel“ mit Richtlinie | Änderungssatz in ‰ der Vergütung je Cent Tariflohnänderung; Bagatell- und Selbstbeteiligung 0,5 % der Abrechnungssumme | gültig (VHB 2017) | [1] |
| **Formblatt 225** „Stoffpreisgleitklausel – Einheitliche Fassung“ mit Richtlinie 225 | AG setzt Basiswert 1 fest; 10 (ausnahmsweise 6) Monate; Stoffanteil ≥ 1 % der geschätzten Auftragssumme; Bagatellgrenze 2 %; Selbstbeteiligung 10 %, mindestens Bagatellbetrag | gültig, Fassung vom 20.06.2023 | [1][3][4] |
| **Formblatt 225a** „Stoffpreisgleitklausel ohne Basiswert 1“ | Bieter nennt je GP-Nummer seinen Stoffpreis ohne AGK, BGK, Wagnis und Gewinn; dieser wird Basiswert 2; fehlende Angaben werden nicht nachgefordert, das Angebot wird ausgeschlossen | gültig, wenn kein belastbarer Basiswert 1 ermittelbar ist | [3][5] |
| **Formblatt 228** „Stoffpreisgleitklausel Nichteisenmetalle“ | Abrechnung über Metallnotierungen (DEL-Notiz) und NE-Gewichte je 1000 m Kabel; Bagatellgrenze 2 %, Selbstbeteiligung 10 % | gültig (VHB 2017; keine neuere Fassung gefunden) | [1] |
| Formblatt 615 „Preisgleitklausel“ für Rahmenvereinbarungen | nicht ausgewertet | gültig (VHB Teil 6) | [1] |
| BMWSB-Erlass vom 25.03.2022 | Sonderregeln für 8 Produktgruppen, Zeitregel auf 1 Monat gesenkt, Betriebsstoffe, nachträgliche Klausel in Altverträgen mit 20 % Selbstbeteiligung | ausgelaufen (30.06.2022) | [6] |
| Erlasse vom 22.06.2022 und 06.12.2022 | Verlängerung bis 31.12.2022 bzw. 30.06.2023; Einführung von Formblatt 225a | ausgelaufen (30.06.2023) | [3] |
| **BMWSB-Erlass vom 20.06.2023** | ab 01.07.2023 wieder Regelverfahren nach Richtlinie 225; 225a bleibt zulässig; Hinweisblatt weiter beifügen; Indexquelle von Fachserie 17 Reihe 2 auf Statistischen Bericht und GENESIS umgestellt | gilt | [3] |
| BMV-Rundschreiben vom 21.05.2026 (Asphaltmischgut, Straßenbau) | auf Verlangen eines Bieters Gleitung schon ab 2 Monaten zwischen Angebot und Einbau; Stoffanteil weiter ≥ 1 %; Ermessen der Vergabestelle, Begründung im Vergabevermerk; Bayern wendet es auch auf Staatsstraßen an | befristet für Auftragsbekanntmachungen bis 30.09.2026, also für neue Verfahren ausgelaufen | [8] (Verbandsmeldung, BMV-Text nicht selbst gelesen) |

**Die 2022er Produktgruppen.** Der Erlass vom 25.03.2022 stellte für folgende Produktgruppen fest, dass das Preisrisiko nicht kalkulierbar ist: Stahl und Stahllegierungen, Aluminium, Kupfer, Erdölprodukte (Bitumen, Kunststoffrohre, Folien und Dichtbahnen, Asphaltmischgut), Epoxidharze, Zementprodukte, Holz und gusseiserne Rohre [6]. Seit 01.07.2023 gibt es keine solche Liste mehr; die Vergabestelle prüft die Voraussetzungen wieder im Einzelfall [3].

**Anwendungsvoraussetzungen nach Richtlinie 225 Nr. 2** (alle drei müssen erfüllt sein) [1][3]:

| Nr. | Voraussetzung | Prüfgröße für die Software |
|---|---|---|
| a | Stoff ist besonderen Preisschwankungen ausgesetzt, nicht kalkulierbares Preisrisiko | Begründung (Text) im Vergabevermerk |
| b | ≥ 10 Monate zwischen Angebotsabgabe und vereinbarter Fertigstellung; im begründeten Ausnahmefall ≥ 6 Monate | Datum Angebotsfrist, Fertigstellungstermin je Position/Abschnitt |
| c | Stoffkostenanteil des betroffenen Stoffes ≥ 1 % der geschätzten Auftragssumme | Stoffmenge × marktüblicher Preis gegen Kostenschätzung der VE |

Die Klausel ist nur für Positionen vorzusehen, deren Stoffanteil die Auftragssumme wesentlich beeinflusst und die nicht vor Ablauf von 10 Monaten fertig werden. Für Betriebsstoffe (z. B. Diesel) ist sie nur ausnahmsweise möglich. Per Erlass kann davon abgewichen werden (Richtlinie 225 Nr. 2.4) – das war der Mechanismus der Jahre 2022/2023 [1].

**Folgen für Vergabe und Wertung** (LPH 6/7, siehe [Prozess I](/okf/research/process/tendering-and-award.md)):

- Stoffpreisgleitklauseln bleiben bei der Wertung unberücksichtigt [1].
- Bei Formblatt 225a muss die Vergabestelle prüfen, ob der vom Bieter angegebene Stoffpreis wirtschaftlich ist, und ihn mit den Stoffpreisen der anderen Bieter vergleichen. Bei erheblicher Abweichung ist das Angebot aufzuklären [3]. Der Preisspiegel braucht also eine eigene Spalte für die 225a-Stoffpreise (Einschätzung).
- Wo Stoffpreisgleitklauseln zugelassen sind, sind grundsätzlich Nebenangebote mit anderen Baustoffen oder Bauweisen zuzulassen [1].
- Bei der **Lohngleitklausel** geht dagegen ein fiktiver Erstattungsbetrag in die Wertungssumme ein. Das LV enthält dafür einen eigenen Titel, in den der Bieter den Betrag aus Formblatt 224 überträgt. Fehlt Formblatt 224 bei vorhandenem Erstattungsbetrag, ist das Angebot auszuschließen [1].
- Den Vergabeunterlagen ist ein Hinweisblatt zur Wirkungsweise der Klausel beizufügen [3].

**Bestehende Verträge ohne Klausel.** Für Verträge ohne Gleitklausel bleibt nur die Anpassung wegen Störung der Geschäftsgrundlage (§ 313 BGB) oder eine Vertragsänderung nach § 58 BHO. Das BMWSB betont, dass das immer eine Einzelfallprüfung ist: Die in der Rechtsprechung zu § 2 Abs. 7 VOB/B genannten Werte von 10 bis 29 % Mehrkosten sind nur Orientierung [3]. Der Erlass von 2022 sah vor, dass der AG regelmäßig nicht mehr als die Hälfte der Mehrkosten übernimmt, und zwar nur auf die reinen Materialpreise ohne Zuschläge [6]. Solche Anpassungen sind Nachträge eigener Art; die Software sollte sie als eigenen Nachtragstyp „Preisanpassung § 313 BGB“ führen (Einschätzung).

### A.2 Stoffpreisgleitklausel (Formblatt 225 und 225a): Rechenvorschrift

**Eingaben** (je Zeile des „Verzeichnisses für Stoffpreisgleitklausel“) [4][5]:

| Feld | Inhalt | wer legt fest |
|---|---|---|
| Stoff | z. B. Betonstahl, Bitumen, Diesel | AG |
| OZ-Liste | Positionen, in denen der Stoff gleitet | AG |
| GP-Nummer | 9-stellige Güternummer der Indexreihe | AG |
| Basiswert 1 + Monat | Nettopreis je Abrechnungseinheit (z. B. €/t) zum Versand der Vergabeunterlagen; Mittel aus Angaben von ≥ 3 Lieferanten; bei Stahl Grundpreis plus Abmessungs-, Güte- und Schrottaufpreis, ohne Lieferanten- und Transportzuschläge | AG (nur Formblatt 225) |
| Stoffpreis des Bieters | Nettopreis je Abrechnungseinheit ohne AGK, BGK, Wagnis und Gewinn = Basiswert 2 | Bieter (nur Formblatt 225a) |
| Abrechnungseinheit | bei Betriebsstoffen Verbrauch je LV-Einheit (z. B. l/m³) | AG |
| Abrechnungszeitpunkt | Einbau, Lieferung oder Verwendung (in Worten, kein Datum) | AG |

Dazu je Vertrag: Monat des Versands der Vergabeunterlagen (M_V), Monat der Angebotsöffnung (M_E). Je Abrechnung: Stoffmenge je OZ und Monat des Einbaus, der Lieferung oder der Verwendung, belegt durch prüfbare Aufzeichnungen des AN [4].

**Rechenschritte** (Formeln nach Formblatt 225 Nr. 2–3 und 225a Nr. 3.3–3.6; Darstellung als Pseudocode ist eigene Umsetzung) [4][5]:

```
# Indizes: I(m) = Erzeugerpreisindex der GP-Nummer im Monat m (GENESIS 61241-0004)
B2 = B1 * I(M_E) / I(M_V)              # Formblatt 225
B2 = Stoffpreis_Bieter                 # Formblatt 225a (kein B1)
für jede OZ und jeden Abrechnungsmonat m:
    B3(m)   = B2 * I(m) / I(M_E)
    D(OZ,m) = (B3(m) - B2) * q(OZ,m)   # q = nachgewiesene Stoffmenge in der Abrechnungseinheit
Mehr  = Summe aller D > 0 ;  Minder = Summe aller D < 0     # getrennt ermitteln (Nr. 2.6)
S     = Mehr + Minder                                        # gegeneinander aufrechnen
G     = Abrechnungssumme der im Verzeichnis genannten OZ, netto, ohne Gleitbeträge
Bag   = 0,02 * G                                             # Bagatellbetrag (Nr. 2.3)
wenn |S| <= Bag:  E = 0                                      # „mehr als zwei v. H.“ nötig
sonst:            E = sign(S) * ( |S| - max(0,10 * |S|, Bag) )   # Selbstbeteiligung (Nr. 2.4/2.5)
Gleitbetrag brutto = E * (1 + USt-Satz)                      # nur USt, keine Zuschläge
```

Hinweise zur Rechenvorschrift:

- **Algebraische Vereinfachung (eigene Herleitung):** Bei Formblatt 225 kürzt sich der Index der Angebotsöffnung heraus: B3 − B2 = B1 × (I(m) − I(M_E)) / I(M_V). Die Software sollte trotzdem B2 und B3 einzeln ausweisen, weil das Formblatt so prüft.
- **Mengenbasis:** Gleitet nur die Menge, für die nach dem Vertrag eine Vergütung zu zahlen ist; bei Pauschalierung die pauschalierte Stoffmenge [4].
- **Monatsgenauigkeit:** Jede Teilmenge braucht ihren eigenen Monat. Aufmaß und Lieferscheine müssen also das Einbau- oder Lieferdatum tragen (Einschätzung, folgt aus Nr. 2.1 und 3.4 [4]).
- **Vermeidbare Mehraufwendungen** werden nicht erstattet, insbesondere wenn der AN schuldhaft Fristen überschreitet und sich die Gleitung dadurch zulasten des AG verschiebt [4]. Die Software kann das nicht entscheiden, aber Mengen nach dem vertraglichen Fertigstellungstermin markieren und eine Vergleichsrechnung zum Index des Soll-Monats anbieten (Einschätzung).
- **Nachunternehmer:** Für weitergegebene Leistungen muss der AN nachweisen, dass die Mehraufwendungen tatsächlich entstanden sind; bei Preissenkungen ist kein Nachweis nötig [4].
- **Nachträge:** Die Klausel gilt auch für die Abrechnung von Nachträgen [4]. Ob neue Nachtrags-OZ in das Verzeichnis aufgenommen werden, regelt die Nachtragsvereinbarung (Einschätzung).
- **Abschlagsrechnungen:** Mehr- und Minderaufwendungen dürfen schon in Abschlagsrechnungen abgerechnet werden (Richtlinie 225 Nr. 6.8) [1]. Welche Abrechnungssumme G dann für die Bagatellgrenze gilt, regelt das Formblatt 225 nicht; bei der Lohngleitklausel gilt bis zur Schlussrechnung die Auftragssumme (siehe A.3). Einschätzung: kumulativ rechnen wie bei der Rechnungsprüfung ([Prozess II, 5.2](/okf/research/process/billing-and-cost-control.md)), G bis zur Schlussrechnung aus der Auftragssumme der Verzeichnis-OZ ansetzen und in der Schlussrechnung neu berechnen; die Regel konfigurierbar halten.
- **Nachlass:** Ein unbedingter Nachlass gilt nach Auffassung der VOB-Stelle Rheinland-Pfalz nicht für Beträge aus Lohn- und Stoffpreisgleitklauseln ([Prozess I, Abschnitt 4](/okf/research/process/tendering-and-award.md)). Die Gleitbeträge laufen also neben dem Nachlass.
- **Umsatzsteuer:** Bagatellgrenze und Selbstbeteiligung werden netto berechnet; auf den Gleitbetrag kommt die Umsatzsteuer [1][4].
- **Skonto:** Keine Regel in den Formblättern gefunden. Einschätzung: Skonto bezieht sich auf den Zahlbetrag der Rechnung; ob er Gleitbeträge erfasst, entscheidet die Skontovereinbarung (offene Frage).
- **Rundung:** Die Formblätter schreiben keine Rundung vor. Einschätzung: Indexquotienten ungerundet, Basiswerte und Beträge auf Cent runden, Rundungsregel im Prüfprotokoll ausweisen.

### A.3 Lohngleitklausel (Formblatt 224): Rechenvorschrift und amtliches Beispiel

**Regeln** (Vertragsbedingungen Formblatt 224) [1]:

1. Erstattet werden nur Lohnänderungen durch Tarifverträge (bei tariflosem Zustand durch orts- oder gewerbeübliche Betriebsvereinbarungen). Tarifverträge, die am Tag vor Ablauf der Angebotsfrist schon unterzeichnet waren, lösen nichts aus.
2. **Maßgebender Lohn** ist, wenn nichts anderes angegeben ist, der Gesamttarifstundenlohn des Spezialbaufacharbeiters der Lohngruppe 4 (West). Für andere Gewerke nennt die Richtlinie andere Ecklöhne (Dachdecker, Maler, Metall- und Elektroindustrie).
3. Je Cent Änderung des maßgebenden Lohns ändert sich die Vergütung für die **nach dem Wirksamwerden** erbrachten Leistungen um den vereinbarten **Änderungssatz** (‰). Damit sind alle direkten und indirekten Lohnfolgekosten abgegolten.
4. Am Stichtag der Lohnänderung wird der **Leistungsstand** durch gemeinsames Aufmaß festgestellt, mindestens so genau wie eine geprüfte Abschlagsrechnung.
5. **Bagatell- und Selbstbeteiligung:** Erstattet wird nur der Teil über 0,5 % der Abrechnungssumme (netto, ohne Gleitbeträge). Bis die Abrechnungssumme feststeht, gilt 0,5 % der Auftragssumme. In Abschlagsrechnungen darf erst gezahlt werden, wenn die nachgewiesenen Mehraufwendungen 0,5 % der Auftragssumme überschreiten (Richtlinie 400 Nr. 14.11).
6. Bei Nachträgen gilt die Lohngleitklausel weiter, soweit die Nachtragspreise die Lohnänderung nicht schon enthalten (Richtlinie 510).

**Formeln** (Richtlinie 224 Nr. 3) [1]:

```
Lohnanteil [%]        = L * 100 / (A - N)
Änderungssatz f [‰]   = L * 10 / ((A - N) * LT)          # LT in €/h, f in Promille je Cent
Mehrkosten je Periode = Leistung_Periode * ΔLohn_kumuliert[Cent] * f / 1000
Erstattung            = Summe(Mehrkosten) - 0,005 * Abrechnungssumme
```

A = Angebotssumme netto, L = kalkulierte Lohnkosten (eigene Löhne, Lohnanteile in Baustellengemeinkosten und Gerätekosten), N = Nachunternehmerleistungen, LT = maßgebender Lohn.

**Amtliches Beispiel** (Richtlinie 224, „Neubau Verwaltungsgebäude, Rohbauarbeiten“, nachgerechnet) [1]:

| Größe | Wert |
|---|---|
| Angebotssumme netto A | 2.155.354,00 € |
| Kalkulierte Lohnkosten L (17.344 h × 36,75 €/h, aufgeteilt in 637.392 + 211.380 + 77.552 €) | 926.324,00 € |
| Nachunternehmerleistungen N | 178.563,00 € |
| Lohnanteil L × 100 / (A − N) | 46,86 % |
| Maßgebender Lohn LT (Lohngruppe 4 West ab 01.06.2015) | 18,64 €/h = 1.864 Cent |
| Änderungssatz f = L × 10 / ((A − N) × LT) | 0,2514 ‰ je Cent |

| Lohnperiode | Leistung in der Periode | kumulierte Lohnerhöhung | Mehrkosten |
|---|---:|---:|---:|
| 1: 01.04.–31.05.2016 | 10 % = 215.535,40 € | 0 Cent | 0,00 € |
| 2: ab 01.06.2016 (+2,4 % × 1.864 Cent) | 50 % = 1.077.677,00 € | 45 Cent | 12.191,76 € |
| 3: ab 01.06.2017 (+2,2 % × 1.909 Cent = 42 Cent) | 40 % = 862.141,60 € | 87 Cent | 18.856,59 € |
| Zwischensumme | | | 31.048,35 € |
| − Bagatell- und Selbstbeteiligung 0,5 % × 2.155.354,00 € | | | −10.776,77 € |
| **Mehrkosten netto** | | | **20.271,58 €** |
| Mehrkosten einschließlich 19 % USt | | | 24.123,18 € |

Im Original beginnt Periode 3 mit „01.05.2017“, obwohl Periode 2 bis 31.05.2017 läuft – vermutlich ein Tippfehler der Quelle [1]. Für die **Angebotswertung** rechnet die Richtlinie eine fiktive Lohnänderung linear über die Bauzeit: (2 Monate × 0 Cent + 12 Monate × 58 Cent + 8 Monate × 108 Cent) / 22 Monate ≈ 71 Cent (eigene Nachrechnung: 70,9 Cent) [1].

### A.4 Stoffpreisgleitklausel Nichteisenmetalle (Formblatt 228)

- Gilt für Kupfer, Blei, Aluminium und weitere NE-Metalle in Leitungen, Kabeln, Drähten und Sammelschienen (typisch: Elektroinstallation, TGA) [1].
- Das LV nennt je Position die **NE-Zahl** = Metallgewicht in kg je 1000 m Leitung (bzw. je 1 m Sammelschiene). Daraus ergibt sich das gleitende Metallgewicht; Kunststoffummantelungen und Bezugskosten zählen nicht [1].
- Der AG setzt einen **Basiswert** (Euro je 100 kg) zum Versand der Vergabeunterlagen fest. Abgerechnet wird nach dem **Abrechnungspreis**: unterer Wert der Notierung der NE-Metallverarbeiter (DEL-Notiz) am 5. Tag nach dem Datum des Auftragsschreibens, bei Nachträgen nach dem Datum der Anordnung; ohne Notierung an diesem Tag gilt die nächste [1].
- Bagatellgrenze 2 % der Abrechnungssumme der Verzeichnis-OZ, Selbstbeteiligung 10 %, mindestens Bagatellbetrag, Saldierung wie bei 225 [1].
- Einschätzung: Anders als bei 225 ist der Abrechnungspreis an einen **Tag** (Auftragsschreiben + 5 Tage) gebunden, nicht an den Einbaumonat. Die Software braucht dafür Tageswerte einer Metallnotierung. Ob die DEL-Notiz frei verwendet werden darf, ist ungeklärt (siehe Offene Fragen).

### A.5 Testfälle

Eigene Testfälle, abgeleitet aus Formblatt 225/225a und Formblatt 224; Index- und Preiswerte sind fiktiv gewählt, damit die Ergebnisse glatt nachprüfbar sind. Gemeinsame Annahmen (wo nicht anders angegeben): Formblatt 225, B1 = 800,00 €/t (Betonstahl), I(M_V) = 120,0, I(M_E) = 126,0, also B2 = 840,00 €/t; Abrechnungssumme der Verzeichnis-OZ G = 400.000 € netto, Bagatellbetrag 8.000 €; USt 19 %.

| Nr. | Fall | Eingaben | Erwartetes Ergebnis |
|---|---|---|---|
| T1 | Grundfall Preisanstieg | 250 t, Einbaumonat-Index 138,6 → B3 = 924,00; D = 84,00 × 250 = 21.000 € | E = 21.000 − max(2.100; 8.000) = **13.000,00 € netto** (15.470,00 € brutto) |
| T2 | Großer Anstieg, 10 % > Bagatelle | S = 100.000 € | E = 100.000 − 10.000 = **90.000,00 €** |
| T3 | Knapp unter Bagatelle | S = 7.999,99 € | **0,00 €** |
| T4 | Genau auf der Bagatellgrenze | S = 8.000,00 € | **0,00 €** („mehr als“ 2 % nötig) |
| T5 | Preissenkung | Index 113,4 → B3 = 756,00; D = −84,00 × 250 = −21.000 € | AN zieht ab: −(21.000 − 8.000) = **−13.000,00 €** |
| T6 | Mehr- und Minderaufwand saldiert | Stahl +30.000 €, Holz −12.000 € → S = 18.000 € | E = 18.000 − max(1.800; 8.000) = **10.000,00 €** |
| T7 | Mehrere Einbaumonate | G = 300.000 € (Bagatelle 6.000 €); 100 t bei Index 132,3 (B3 = 882,00 → 4.200 €) und 150 t bei Index 129,15 (B3 = 861,00 → 3.150 €); S = 7.350 € | E = 7.350 − max(735; 6.000) = **1.350,00 €** |
| T8 | Formblatt 225a | Bieter-Stoffpreis B2 = 650,00 €/t; I(M_E) = 125,0; I(m) = 131,25 → B3 = 682,50; 1.000 t → S = 32.500 €; G = 1.500.000 € (Bagatelle 30.000 €) | E = 32.500 − max(3.250; 30.000) = **2.500,00 €** |
| T9 | Fehlender Bieter-Stoffpreis in 225a | eine GP-Nummer ohne Angabe | Angebot **ausschließen**, keine Nachforderung [5] |
| T10 | Lohngleitklausel, amtliches Beispiel | Werte aus A.3 | **20.271,58 € netto** |
| T11 | Lohngleitklausel in Abschlagsrechnung | nachgewiesene Mehrkosten bisher 9.000 €; Auftragssumme 2.155.354 € (0,5 % = 10.776,77 €) | **keine Zahlung** bis 10.776,77 € überschritten sind [1] |
| T12 | Tarifvertrag vor Angebotsfrist unterzeichnet | Unterzeichnung am Tag vor Ablauf der Angebotsfrist | **keine Erstattung** für diese Erhöhung [1] |
| T13 | Eingabefehler Bemessungsgrundlage | G brutto (inkl. USt) oder inkl. Gleitbeträgen eingegeben | Validierung schlägt an: G muss netto und ohne Gleitbeträge sein [4] |

**Referenzbeispiel der Bauverbände** (Leitfaden von Hauptverband der Deutschen Bauindustrie, ZDB und BVMB, 2015, zur damals gleichlautenden Formblatt-225-Logik; Indexwerte aus der inzwischen eingestellten Fachserie 17 Reihe 2) [22]:

| Schritt | Werte | Ergebnis |
|---|---|---|
| Basiswert 2 | B1 = 553,33 €/t × Index 04/2012 (117,0) / Index 02/2012 (118,3), GP-Nr. 241002410 | 547,25 €/t |
| Basiswert 3 | 547,25 €/t × Index 11/2012 (108,1) / 117,0 | 505,62 €/t |
| Minderaufwand dieser OZ | 16,750 t × (505,62 − 547,25) €/t | −697,30 € |
| Bagatellbetrag | 2 % × Auftragssumme aller Verzeichnis-OZ 1.608.767,68 € | 32.175,35 € |
| Saldo aller Verzeichnis-OZ (Diesel, Asphalt, Betonstahl) | Summe der Mehr- und Minderaufwendungen | +34.637,13 € |
| Selbstbeteiligung | max(10 % × 34.637,13 = 3.463,71; 32.175,35) | 32.175,35 € |
| **Erstattung** | 34.637,13 − 32.175,35 | **2.461,78 €** |

Der Leitfaden ergänzt drei Auslegungen, die die Software übernehmen sollte [22]: Die Bagatellgrenze wird über **alle Verzeichnis-OZ gemeinsam** geprüft, nicht je OZ; wird ein Stoff über mehrere Monate verbaut, ist **monatsweise** zu rechnen; in Abschlagsrechnungen gilt bis zur endgültigen Abrechnungssumme die **Auftragssumme der Verzeichnis-OZ** als Basis der Bagatellgrenze. An anderer Stelle nennt derselbe Leitfaden den in Rechnung gestellten Leistungsstand als Basis – die Regel bleibt also auslegungsbedürftig. Die ältere Klauselfassung hatte eine Bagatellgrenze von 0,5 % der gesamten Abrechnungssumme [22].

### A.6 Indexdaten von Destatis

| Merkmal | Stand 09.11.2026 | Quelle |
|---|---|---|
| Indexreihe | Index der Erzeugerpreise gewerblicher Produkte (Inlandsabsatz), Güter nach GP-Nummer (9-Steller) | [4][23] |
| GENESIS-Tabelle | **61241-0004** (Detailreihen nach Güterverzeichnis); 61241-0002 ist der Gesamtindex | [4][23] |
| Basisjahr | **2021 = 100** seit Berichtsmonat Januar 2024; alle Werte ab Januar 2021 wurden mit neuen Gewichten neu berechnet; Werte auf Basis 2015 gelten nicht mehr | [23][25] |
| Erhebungsstichtag | 15. des Berichtsmonats; Preise ohne Umsatzsteuer | [23] |
| Veröffentlichung | etwa 20 Tage nach Monatsende (September 2026 am 20.10.2026 veröffentlicht) | [23] |
| frühere Quelle | Fachserie 17 Reihe 2 („Lange Reihen“) – eingestellt; seitdem Statistischer Bericht und GENESIS | [3] |
| Gliederungstiefe | GENESIS enthält teils feinere 9-Steller als die frühere Fachserie (Beispiel 2022: 161010350 Nadelschnittholz) | [7] |
| Lizenz | Datenlizenz Deutschland – Namensnennung 2.0; Quellenvermerk „© Statistisches Bundesamt (Destatis)“, siehe auch [DIN-276-Notiz](/okf/research/standards/din-276-cost-planning.md) | [24] |
| API | GENESIS-Webservice, nur noch REST/JSON (SOAP abgeschaltet), Anfragen per POST; **jede Anfrage braucht Anmeldung** (Benutzername/Passwort oder persönlicher 32-stelliger Token aus dem Nutzerkonto); Tabellen-Download über `https://genesis.destatis.de/genesisWS/rest/2020/data/tablefile`; nur begrenzt viele parallele Anfragen | [24] |

**Folgerungen für den Import (Einschätzung):**

1. **Datenhaltung:** Indexwert je GP-Nummer und Monat mit Basisjahr, Abrufdatum und Quelle speichern. Ein Wert ist nur innerhalb derselben Basis mit anderen Werten verrechenbar.
2. **Umbasierung:** Bei der nächsten Umbasierung ändern sich auch rückwirkend alle Werte. Ein laufender Vertrag kann dann Quotienten aus neuer und alter Basis mischen. Destatis gibt dazu in der Pressemitteilung keine Hinweise für Preisgleitklauseln [25]. Die Software sollte für alle Monate eines Vertrags dieselbe Basis verwenden und den Stand dokumentieren; welche Fassung vertraglich gilt, ist eine offene Rechtsfrage.
3. **Bezugsweg:** Da die API ein Nutzerkonto verlangt, sind drei Wege denkbar: (a) der Nutzer hinterlegt seinen eigenen Token, (b) Import einer manuell aus GENESIS heruntergeladenen CSV/XLSX, (c) das Projekt veröffentlicht die benötigten Reihen selbst (Lizenz erlaubt Weitergabe mit Namensnennung). Ein Projekt-Token auf einem Server wäre ein Account des Projekts und muss vorher geklärt werden.
4. **Verzögerung:** Der Indexwert eines Monats liegt erst rund drei Wochen nach Monatsende vor. Gleitbeträge in Abschlagsrechnungen müssen daher oft vorläufig gerechnet und später nachberechnet werden (Status „vorläufig/endgültig“ je Indexwert).
5. **Revisionen:** Ob Destatis Monatswerte außerhalb von Umbasierungen korrigiert, habe ich nicht verifiziert (siehe Offene Fragen); ein Abgleich beim erneuten Import mit Änderungsprotokoll ist billig und sicher.

### A.7 Länder, Kommunen und private Verträge

**Länder und Kommunen** übernehmen die Bundesregeln weitgehend:

| Gebiet | Regel | Quelle |
|---|---|---|
| Berlin | ABau 2026, Richtlinie V 225.H (Stand März 2026): inhaltlich wie VHB-Richtlinie 225 (10/6 Monate, 1 %, Bagatellgrenze 2 %, Selbstbehalt 10 %, GENESIS 61241-0004); gilt für Bauaufträge des Landes; Abweichungen „durch Rundschreiben“ möglich | [21] |
| Nordrhein-Westfalen, Kommunen | Erlass des Kommunalministeriums vom 01.04.2022: keine Bedenken, die Bundesregeln auch kommunal anzuwenden; Entscheidung im Einzelfall vor Ort; mit Hinweisblatt und GENESIS-Anleitung | [7] |
| Bayern, Staatsstraßen | Erleichterung des BMV für Asphaltmischgut (2 Monate) 2026 auch für bayerische Staatsstraßen; Vergabestellen frei in der Entscheidung | [8] |
| weitere Länder | 2022 eigene Rundschreiben u. a. in Rheinland-Pfalz, Schleswig-Holstein, Sachsen-Anhalt, Brandenburg (laut Suchtreffern, nicht einzeln ausgewertet) | – |

**Private Verträge** (Einschätzung, keine Rechtsberatung):

- **Preisklauselgesetz:** Automatische Wertsicherungsklauseln sind grundsätzlich verboten (§ 1 Abs. 1 PrKG). Erlaubt sind u. a. **Kostenelementeklauseln**, bei denen der Preis nur insoweit von Preisen abhängt, wie diese die Selbstkosten des Gläubigers unmittelbar beeinflussen (§ 1 Abs. 2 Nr. 3 PrKG) [26]. Eine Stoffpreisgleitklausel, die nur den Materialanteil bestimmter Positionen gleiten lässt, entspricht diesem Typ; eine Klausel, die den ganzen Werklohn an einen allgemeinen Index koppelt, wäre riskant.
- **AGB-Recht:** Verwendet der Bauherr (oder sein Architekt) die Klausel vorformuliert, gelten §§ 305c, 307 BGB. Der BGH entschied am 01.10.2014 (VII ZR 344/13), dass ein öffentlicher AG auf ungewöhnliche Kalkulationsanforderungen einer Stoffpreisgleitklausel ausdrücklich hinweisen muss; sonst kann ein normal kalkulierender Bieter die Vergütung für das erfasste Material verlieren und die Klausel als überraschend scheitern [27]. Das erklärt das Pflicht-Hinweisblatt der Bundesregeln [3].
- **Ohne Klausel** bleibt nur § 313 BGB mit hohen Hürden (siehe A.1) [3][6].
- **Wer schreibt die Klausel?** Vertragsentwürfe und Preisgleitklauseln gehören nach BGH nicht zu den Architektenleistungen ([Prozess I](/okf/research/process/tendering-and-award.md)). Laut einem Beitrag im Deutschen Architektenblatt (Bayerische Architektenkammer, 2022) gehören beim Umgang mit Stoffpreisgleitklauseln nur das Erheben der Lieferantenpreise (Basiswert 1) und die Übergabe der Ergebnisse an den Bauherrn zu den Grundleistungen; weitere Schritte sind als Besondere Leistungen zu vereinbaren [28]. Die Software kann Formblatt und Rechnung liefern, die Entscheidung über die Klausel bleibt beim Bauherrn.

### A.8 Unterstützung in AVA-Produkten und GAEB

- **Negativbefund:** In öffentlich zugänglicher Dokumentation von ORCA AVA, G&W California, RIB iTWO, NEVARIS, AVANTI und NOVA AVA fand ich keine beschriebene Funktion für Stoff- oder Lohnpreisgleitung (Indeximport, Basiswerte, Bagatelle, Selbstbehalt). Ein NEVARIS-Blogbeitrag (aktualisiert 16.04.2026) erklärt Preisgleitklauseln nur allgemein [32]. Auch die Notizen zu [NOVA](/okf/research/nova-ava/manual-and-workflows.md) und zu den [etablierten Anbietern](/okf/research/market/established-vendors.md) nennen nichts dazu. Das heißt nicht, dass es keine Funktion gibt – Herstellerhandbücher sind oft nicht öffentlich.
- **Praxis laut Verbänden:** Die Bauverbände stellten 2015 ein Excel-Formular für die Berechnung bereit [22]. Einschätzung: Gleitberechnungen laufen heute meist in Excel neben der AVA.
- **GAEB:** Weder in den GAEB-Notizen dieses Wissensbestands ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md), [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)) noch in den gelesenen Quellen fand sich ein Datenelement für Basiswerte, GP-Nummern oder Gleitbeträge. Einschätzung: Das Verzeichnis für Stoffpreisgleitklausel reist als PDF-Formblatt neben dem LV; Gleitbeträge erscheinen in Rechnungen als eigene Position oder Anlage. Ein eigenes, offenes JSON-Schema „Gleitverzeichnis“ wäre eine Differenzierungschance.

## Teil B: Zuwendungsrecht

### B.1 Wann Zuwendungsempfänger Vergaberecht anwenden müssen

**Mechanik.** Ein privater Zuwendungsempfänger (Verein, Kirchengemeinde, Kita-Träger, Stiftung) ist kein öffentlicher Auftraggeber. Er muss Vergaberecht nur anwenden, weil der Zuwendungsbescheid es über die **Nebenbestimmungen** (ANBest) anordnet. Kommunen wenden ohnehin ihr Haushaltsvergaberecht an; für sie gelten eigene Nebenbestimmungen (Bund: ANBest-Gk, Bayern: ANBest-K, NRW: ANBest-G). Oberhalb der EU-Schwellen kann ein privater Bauherr zudem nach § 99 Nr. 4 GWB selbst öffentlicher Auftraggeber werden, wenn bestimmte Bauvorhaben (u. a. Schulen, Sport- und Freizeiteinrichtungen, Krankenhäuser) zu mehr als 50 % öffentlich finanziert sind ([Vergaberecht, Abschnitt 1](/okf/research/standards/procurement-law-e-vergabe.md)); das bleibt von den ANBest unberührt [9].

**Welche Fassung gilt?** Maßgeblich ist immer die Fassung, die dem konkreten Bescheid beiliegt; spätere Änderungen gelten nicht automatisch (Einschätzung). Die Software muss also je Förderung die **Fassung der Nebenbestimmungen** speichern, nicht „die aktuelle Regel“.

**Vergleich der Vergabepflichten in der Projektförderung (ANBest-P) für nicht-kommunale Empfänger** (Stand 09.11.2026):

| Geber | Fassung | Unterhalb der Schwelle | Ab welcher Schwelle VOB/A Abschnitt 1 (Bau) bzw. UVgO | Besonderheiten | Quelle |
|---|---|---|---|---|---|
| **Bund** | ANBest-P ab 08.09.2026 (BMF-Rundschreiben vom 07.09.2026) | wettbewerblich und wirtschaftlich vergeben, Preise möglichst von mehreren Anbietern ermitteln (auch aus Katalogen, Preislisten, Internet), Verfahren angemessen dokumentieren | Gesamtausgaben **überwiegend** aus öffentlichen Zuwendungen **und** Zuwendung (bei mehreren Gebern: Summe) **> 175.000 €** | UVgO mit Direktaufträgen bis 50.000 €; einige UVgO-Vorschriften ausgenommen (u. a. Lose, Bekanntmachungen, ungewöhnlich niedrige Angebote, Bieterinformation); GWB-Pflichten bleiben unberührt | [9] |
| Bund (Vorfassung) | ANBest-P ab 24.04.2025 | keine besondere Regel | Zuwendung **> 100.000 €** (ohne Finanzierungsquote) | ähnliche UVgO-Ausnahmen | [10] |
| **Nordrhein-Westfalen** | ANBest-P (Fassung ab 15.10.2025, Kopie eines Zuwendungsempfängers) | Zuwendung > 100.000 € und öffentliche Finanzierung ≤ 50 %: wettbewerblich, möglichst 3 Angebote, dokumentieren | öffentliche Finanzierung **> 50 %** und Zuwendung **> 500.000 €** | dazwischen (> 50 %, Zuwendung ≤ 500.000 €) 3 Angebote; bei VOB/A eigene Wertgrenzen: Beschränkte Ausschreibung ohne Teilnahmewettbewerb je Gewerk bis 750.000 € bzw. gesamt 1.250.000 €, Freihändige Vergabe je Auftrag bis 75.000 € bzw. gesamt 125.000 € (Zuordnung aus dem zweispaltigen PDF rekonstruiert), Direktauftrag bis 15.000 € (freiberuflich 25.000 €) | [12] |
| **Niedersachsen** | ANBest-P ab 01.01.2026 (NBank) | grundsätzlich mindestens 3 Unternehmen zur Angebotsabgabe auffordern, dokumentieren; Direktauftrag, wenn Zuwendung ≤ 100.000 € oder Auftragswert ≤ 25.000 € netto | **keine** Pflicht zur VOB/A in den ANBest-P selbst gefunden | Förderrichtlinien oder Bescheid können strenger sein (Einschätzung) | [13] |
| **Hessen** | ANBest-P Stand 09/2026 (WIBank) | wirtschaftlich vergeben | **keine** VOB/A-Pflicht in den ANBest-P; ab Zuwendung 100.000 € bei Aufträgen > 20.000 € netto grundsätzlich 3 vergleichbare Angebote, Stückelungsverbot, Auswahl dokumentieren | „vergaberechtliche Bestimmungen bleiben unberührt“ | [14] |
| Bayern | ANBest-P und ANBest-K (Anlagen zu VV Art. 44 BayHO) | nicht ausgewertet (Text nur als Anlage verlinkt, siehe Offene Fragen) | nicht ausgewertet | Verstöße gegen Nr. 3 der ANBest-P, ANBest-I und ANBest-K sanktioniert die RZVR (B.2) | [16] |

**Einschätzung:** Die Reformwelle 2025/2026 entlastet private Zuwendungsempfänger deutlich (Bund 175.000 € plus Finanzierungsquote, Hessen und Niedersachsen ohne VOB/A-Pflicht in den ANBest-P). Gleichzeitig wird das Bild uneinheitlicher. Für die Software heißt das: keine fest verdrahtete „Schwelle 100.000 €“, sondern eine datierte Regeltabelle je Geber und Fassung, die der Nutzer beim Anlegen der Förderung auswählt und im Einzelfall überschreiben kann. Die Vergabestellen-Logik selbst (Verfahrensarten, Wertgrenzen) beschreibt die [Vergaberechts-Notiz](/okf/research/standards/procurement-law-e-vergabe.md).

**Kommunale Empfänger (Bund, ANBest-Gk ab 24.04.2025):** Unterhalb der EU-Schwellen wendet die Kommune die Vergabegrundsätze ihres eigenen Haushaltsrechts an; die ANBest-Gk setzen keine eigene Wertgrenze [15]. Für eine Kommune ändert die Förderung also meist nicht *ob*, sondern *wie gründlich* dokumentiert werden muss (Einschätzung).

### B.2 Folgen von Vergabeverstößen

Verstöße gegen die Vergabeauflage erlauben den (Teil-)Widerruf des Bescheids und die Rückforderung der Zuwendung mit Zinsen von 5 Prozentpunkten über dem Basiszinssatz pro Jahr (ANBest-P Nr. 8) [9]. Am ausführlichsten geregelt ist das in Bayern, in der **Rückforderungsrichtlinie (RZVR)** vom 25.02.2021, in Kraft seit 01.03.2021 [16]:

| Stufe | Regel (RZVR) | Folge für die Software |
|---|---|---|
| Jeder Verstoß | Vermeidbare Mehrausgaben (z. B. durch unvollständige Leistungsbeschreibung oder falsche Mengenansätze) werden aus der Förderung herausgenommen | Nachträge mit Ursache „LV-Fehler“ als förderrechtlich riskant markieren |
| Schwerer Verstoß | im Regelfall werden die Ausgaben der betroffenen **Auftragseinheit** (Teillos, Fachlos) von der Förderung ausgeschlossen | Förderfähigkeit je VE/Auftrag speichern, nicht nur je Kostengruppe |
| Härtefall | Würde das die Gesamtmaßnahme ganz oder weitgehend entwerten (z. B. fehlende Losbildung), kann die Kürzung auf **20–25 % der Gesamtzuwendung** begrenzt werden; der Rahmen kann über- oder unterschritten werden | Szenariorechnung „Kürzung“ im Kostenbericht |
| EU-Mittel (EFRE, ESF, ELER …) | stattdessen gelten die Leitlinien der EU-Kommission für Finanzkorrekturen | Projektmerkmal „EU-kofinanziert“ |

**Schwere Vergabeverstöße** sind nach RZVR insbesondere [16]:

1. Direktauftrag, Freihändige Vergabe oder Verhandlungsvergabe ohne die vergaberechtlichen Voraussetzungen,
2. ungerechtfertigte Einschränkung des Wettbewerbs (z. B. nur örtliche Bieter) oder unterlassene EU-weite Bekanntmachung,
3. Übergehen des wirtschaftlichsten Angebots durch grob fehlerhafte Wertung,
4. vorsätzliche Verstöße gegen die Grundsätze von § 2 VOB/A, § 2 UVgO oder § 97 GWB,
5. Vergabe an einen Generalübernehmer, wenn nicht zugelassen,
6. **fehlende oder fehlerhafte Dokumentation**, sodass das ordnungsgemäße Verfahren nicht nachweisbar ist.

Gerichte haben solche Kürzungen bestätigt: Das VG München billigte 2021 eine Kürzung der Gesamtzuwendung um 20 % wegen unzulässiger Gesamtvergabe mehrerer Lose [17]. Das VG Halle bestätigte am 13.10.2023 (3 A 256/21) bei einer EU-kofinanzierten kommunalen Maßnahme 25 % Kürzung, gestützt auf die EU-Leitlinien für Finanzkorrekturen; Anlass war, dass ein Bieter trotz fehlender Nachunternehmererklärungen nicht ausgeschlossen wurde – geringe Auftragsanteile spielten keine Rolle [18]. In NRW gibt es einen eigenen Runderlass zur Rückforderung bei Vergabeverstößen; eine aktuelle Fassung mit Prozentsätzen habe ich nicht gefunden (siehe Offene Fragen).

**Einschätzung:** Punkt 6 macht die Vergabedokumentation der AVA zum Förderrisiko. Eine lückenlose, exportierbare Vergabeakte je Auftrag (Vergabevermerk, Angebotsöffnung, Preisspiegel, Wertung, Zuschlag, siehe [Prozess I](/okf/research/process/tendering-and-award.md)) ist im Modus „gefördert“ ein Muss.

### B.3 Verwendungsnachweis

**Grundstruktur** (Bund, ANBest-P 2026 Nr. 6) [9]:

| Bestandteil | Inhalt | Frist |
|---|---|---|
| **Zwischennachweis** | Sachbericht + summarischer zahlenmäßiger Nachweis nach Gliederung des Finanzierungsplans, **ohne Belegliste** | 4 Monate nach Ende jedes Haushaltsjahres, wenn der Zweck noch nicht erfüllt ist |
| **Verwendungsnachweis** | **Sachbericht** (Verwendung, Ergebnis gegen Ziele, Notwendigkeit und Angemessenheit) + **zahlenmäßiger Nachweis** (alle Einnahmen und Ausgaben in zeitlicher Folge, gegliedert wie der Finanzierungsplan) + **Belegliste** + Bestätigung, dass die Ausgaben notwendig waren, wirtschaftlich gehandelt wurde und die Angaben mit Büchern und Belegen übereinstimmen | 6 Monate nach Erfüllung des Zwecks, spätestens 6 Monate nach Ende des Bewilligungszeitraums |
| **Belege** | übliche Angaben, insbesondere Zahlungsempfänger, Grund und Tag der Zahlung, Zahlungsbeweis; eindeutiges Zuordnungsmerkmal zum Projekt (z. B. Projektnummer) | – |
| **Aufbewahrung** | Belege, Vergabeverträge und alle Förderunterlagen **5 Jahre nach Vorlage des Verwendungsnachweises** (länger, wenn Steuerrecht o. Ä. es verlangt); in der Regel elektronisch; Scans müssen dem Original entsprechen | – |

Bei Vorsteuerabzugsberechtigung zählen nur Nettobeträge [9]. Die Bewilligungsbehörde darf Bücher und Belege anfordern, vor Ort prüfen und bei elektronischer Buchführung Einsicht in die Daten oder einen maschinell auswertbaren Export verlangen; auch der Bundesrechnungshof darf prüfen [9]. **Einschätzung:** Ein strukturierter Export (CSV/XLSX) von Belegliste und Rechnungsdaten ist deshalb kein Komfort, sondern deckt eine echte Prüfpflicht ab.

**Abweichungen, die die Software abbilden muss:**

| Regelwerk | Abweichung | Quelle |
|---|---|---|
| ANBest-Gk 2025 (Kommunen, Bund) | Verwendungsnachweis innerhalb **eines Jahres** nach Zweckerfüllung; zahlenmäßiger Nachweis nur **summarisch** nach Finanzierungsplan, keine Belegliste; Berichte der technischen Dienststellen beifügen | [15] |
| ANBest-P Niedersachsen 2026 | Zwischennachweis nur als Sachbericht; zahlenmäßiger Nachweis in **monatlichen Summen**, unter 25.000 € Zuwendung summarisch | [13] |
| Baumaßnahmen (NBest-Bau NRW, RZBau-Muster 2) | Ausgaben nur als **Summen der Kostengruppen**, bei Hochbauten nach DIN 276; je Bauobjekt oder Bauabschnitt getrennt | [19][20] |

**Vorlage „Verwendungsnachweis Baumaßnahme“** (zusammengeführt aus NRW-Muster 1 zu Nr. 3.1 NBest-Bau [19] und RZBau-Muster 2 in der hessischen Fassung vom 02.02.2024 [20]):

1. **Kopf:** Zuwendungsempfänger, Bewilligungsbehörde, Maßnahme, Bescheide (Datum, Aktenzeichen, Betrag, Zuschuss oder Darlehen), bewilligter Gesamtbetrag, ausgezahlter bzw. in Anspruch genommener Betrag, Bankverbindung.
2. **Sachbericht:** Beginn, Dauer, Abschluss, Abweichungen von Planung und Finanzierungsplan.
3. **Einnahmen:** Eigenanteil, Leistungen Dritter, Bundes-, Landes- und sonstige öffentliche Mittel – jeweils laut Bescheid und laut Abrechnung, in Euro und Prozent.
4. **Ausgaben nach Kostengruppen DIN 276** (KG 100 bis 800, mit KG 710 „Bauherrenaufgaben“ und Baufeiern aus KG 769 gesondert ausgewiesen) – Spalten: laut Bescheid insgesamt / davon zuwendungsfähig, laut Abrechnung insgesamt / davon zuwendungsfähig; Kennzeichen netto oder brutto; Ausgaben früherer Bauabschnitte.
5. **Ist-Ergebnis:** zuwendungsfähige Ausgaben und Einnahmen laut Bescheid gegen Abrechnung, Mehr- oder Minderausgaben.
6. **Erklärungen:** Nebenbestimmungen beachtet, Ausgaben notwendig, wirtschaftlich und sparsam, Angaben stimmen mit Büchern und Belegen überein; bei Bau zusätzlich Prüfungen und Abnahmen durchgeführt, Baurechnung mit Belegen liegt zur Prüfung bereit.
7. **Prüfvermerke:** baufachliche Prüfung durch die Bauverwaltung (stichprobenweise Prüfung von Ausführung und Rechnungsbelegen) und Prüfung durch die Bewilligungsbehörde.

**Belegliste – Datenfelder** (Pflichtfelder nach ANBest-P Nr. 6.2.2 und 6.4 [9]; Zusatzfelder als Einschätzung für Bauvorhaben):

| Feld | Pflicht nach ANBest-P | Herkunft in der AVA |
|---|---|---|
| laufende Nummer, Belegnummer | ja (Zuordnung) | Rechnungsbuch |
| Zahlungstag | ja | Zahlungsrückmeldung des Bauherrn |
| Empfänger / Einzahler | ja | Auftragnehmer der VE |
| Grund der Zahlung | ja | Rechnungsart + VE + Rechnungsnummer (z. B. „3. AR Rohbau“) |
| Einzelbetrag | ja | gezahlter Betrag (nach Skonto, Einbehalt, Bauabzug) |
| Ausgabeart / Gliederung des Finanzierungsplans | ja („nach Art getrennt“) | Zuordnung VE → Finanzierungsplanposition |
| Projektkennung | ja (Belegangabe) | Förderkennzeichen des Bescheids |
| netto / USt / brutto | bei Vorsteuerabzug nur netto | Rechnungsprüfung |
| Kostengruppe DIN 276, Bauabschnitt | bei Baumaßnahmen | KG-Zuordnung der Positionen |
| davon förderfähig / nicht förderfähig, Fördergegenstand | Einschätzung | Förderfähigkeits-Kennzeichen je Position oder Anteil |
| Vergabeverfahren / Verweis auf Vergabeakte | Einschätzung (Prüfung Nr. 3) | Vergabevermerk der VE |

### B.4 Mittelabruf und Mittelabflussplanung

**Die „Zwei-Monats-Regel“ ist keine bundeseinheitliche Regel mehr.** Die Zeitspanne, für die Geld abgerufen werden darf, unterscheidet sich je Geber und Fassung (Stand 09.11.2026):

| Geber / Fassung | Regel für den Mittelabruf | Sanktion bei zu frühem Abruf | Quelle |
|---|---|---|---|
| Bund, ANBest-P 2025 und 2026 | Regelfall **Abrufverfahren** nach den Besonderen Nebenbestimmungen „BNBest-Abruf“; sonst nur, soweit das Geld **alsbald** nach Auszahlung für fällige Zahlungen gebraucht wird; jede Anforderung muss den Bedarf begründen | Zinsen 5 Prozentpunkte über Basiszinssatz p. a. für die Zeit bis zur Verwendung; „alsbald“ ist im Anforderungsverfahren jedenfalls nicht mehr gegeben, wenn das Geld erst **nach mehr als 6 Wochen** verbraucht wird (Nr. 8.5) | [9][10] |
| Bund, ANBest-Gk 2025 (Kommunen) | wie ANBest-P; **Hochbau** bei Anteil- oder Festbetragsfinanzierung nach Baufortschritt: **20 %** nach Vergabe des Rohbauauftrags, **30 %** nach baurechtlicher Abnahme des Rohbaus, **40 %** nach baurechtlicher Schlussabnahme, **10 %** nach Vorlage des Verwendungsnachweises, jeweils mit Abnahmebescheinigung | wie oben | [15] |
| Nordrhein-Westfalen, ANBest-P (Fassung ab 15.10.2025) | nur für Zahlungen, die **innerhalb von zwei Monaten** nach Auszahlung fällig werden | Zinsen nach Nr. 8 | [12] |
| Hessen, ANBest-P Stand 09/2026 | **innerhalb von drei Monaten**, sofern keine festen Teilbetragstermine zugelassen sind | Zinsen nach Nr. 8 | [14] |
| Niedersachsen, ANBest-P ab 01.01.2026 | **innerhalb von sechs Monaten**; Anforderung begründen und mitteilen, wie weit frühere Teilbeträge verwendet sind | Zinsen nach Nr. 8 | [13] |
| Bayern | nicht ausgewertet (siehe Offene Fragen) | – | – |

**Gemeinsame Regeln** [9][12][13]:

- **Anteil- oder Festbetragsfinanzierung:** Abruf nur anteilig mit den anderen Zuwendungen und den Eigenmitteln. Bei 60 % Förderquote dürfen also höchstens 60 % jeder fälligen förderfähigen Zahlung abgerufen werden.
- **Fehlbedarfsfinanzierung:** Abruf erst, wenn die eigenen und sonstigen Mittel verbraucht sind.
- **Vorsteuerabzug:** Wer zum Vorsteuerabzug berechtigt ist, rechnet netto ab [9].
- **Zahlungen vor Leistung** (Vorauszahlungen an Baufirmen) nur, wenn allgemein üblich oder besonders begründet [9].

**Abgeleitete Anforderungen an die Software (Einschätzung):**

1. **Zahlungsprognose je Auftrag:** aus Zahlungsplan bzw. Bauzeitenplan, Abschlagsrhythmus und offenen Nachträgen einen erwarteten Rechnungsstrom je VE erzeugen (Datum, Betrag netto/brutto).
2. **Fälligkeit je Rechnung:** Eingangsdatum + Prüffrist (VOB/B: Abschlag 21 Tage, Schlussrechnung 30 Tage, siehe [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md)), Skontoziel, Freigabedatum, tatsächliches Zahlungsdatum.
3. **Förderfähiger Anteil je Rechnung:** Aufteilung nach Fördergegenstand, förderfähig/nicht förderfähig und Kostengruppe; Skonto mindert die tatsächlich gezahlte und damit die förderfähige Ausgabe (Einschätzung).
4. **Abrufvorschlag:** Summe der förderfähigen Zahlungen, die im zulässigen Fenster (6 Wochen, 2, 3 oder 6 Monate – je Bescheid konfigurierbar) nach erwarteter Auszahlung fällig werden, mal Förderquote, minus noch nicht verbrauchter früherer Abrufe. Die Bearbeitungszeit der Bewilligungsstelle ist ein eigener Parameter.
5. **Meilensteinabruf:** alternativ Abruf nach Bauabschnitten (ANBest-Gk-Hochbau 20/30/40/10) mit Upload der Abnahmebescheinigung.
6. **Überwachung:** Warnung, wenn abgerufene Mittel nicht im Fenster ausgegeben werden; Zinsrisiko = Betrag × (Basiszinssatz + 5 %) × Tage / 365.
7. **Mittelabflussplan nach Haushaltsjahren:** Kommunen und Förderstellen planen nach Haushaltsjahren (Verpflichtungsermächtigungen, Jahresraten); der Plan muss Soll und Ist je Jahr zeigen (Einschätzung, vgl. Zahlungsplan als Besondere Leistung in [Prozess II](/okf/research/process/billing-and-cost-control.md)).

### B.5 Was Architekten für Fördergeber erstellen

**HOAI:** Fördermittelarbeit ist keine Grundleistung. Die HOAI nennt als Besondere Leistungen in LPH 2 „Aufstellen eines Finanzierungsplanes“ und „Mitwirken bei der Kredit- und Fördermittelbeschaffung“, in LPH 8 „Aufstellen, Überwachen und Fortschreiben eines Zahlungsplanes“ [29]. Den Verwendungsnachweis erwähnt die HOAI nicht; Mitwirkung daran ist also gesondert zu vereinbaren (Einschätzung). Ein eigenes Kammer-Merkblatt zum Zuwendungsbau fand ich nicht (Negativbefund).

**Typische Zulieferungen des Architekten** (abgeleitet aus Formularen und Regeln, Einschätzung, wo nicht anders belegt):

| Unterlage | wofür | Grundlage in der AVA |
|---|---|---|
| Kostenberechnung nach DIN 276 mit Trennung zuwendungsfähig / nicht zuwendungsfähig | Antrag, Finanzierungsplan | [DIN-276-Notiz](/okf/research/standards/din-276-cost-planning.md) |
| Vergabedokumentation je Auftrag (Vergabevermerk, Preisspiegel, Wertung) | Nachweis der Vergabeauflage; fehlende Dokumentation ist nach RZVR ein schwerer Verstoß [16] | [Prozess I](/okf/research/process/tendering-and-award.md) |
| geprüfte Rechnungen mit Prüfvermerk („Baurechnung“) | Grundlage der baufachlichen Prüfung, die Rechnungsbelege stichprobenweise prüft [20] | [Prozess II](/okf/research/process/billing-and-cost-control.md) |
| Kostenaufstellung nach Kostengruppen, laut Bescheid gegen laut Abrechnung | zahlenmäßiger Nachweis bei Baumaßnahmen [19][20] | Kostenfeststellung |
| Zahlungs- und Mittelabflussplan | Mittelabrufe, Haushaltsjahre | Zahlungsplan (Besondere Leistung LPH 8) [29] |
| Angaben zum Bauablauf, Abweichungen, Fotos | Sachbericht; in Bayerns Städtebauförderung bei bedeutenderen Maßnahmen Fotodokumentation [31] | Bautagebuch |
| Abnahmebescheinigungen Rohbau und Schlussabnahme | Meilensteinabruf nach ANBest-Gk [15] | Abnahmeprotokolle |

**Städtebauförderung Bayern** als Beispiel für Programmregeln: Für jede Einzelmaßnahme ist nach Abschluss ein elektronischer Verwendungsnachweis vorzulegen; bis 100.000 € Zuwendung nur auf Anforderung; bei Festbetrags- oder Pauschalförderung nur aus Landesmitteln genügt eine Verwendungsbestätigung ohne Belege; die Regierungen prüfen binnen drei Monaten auf Plausibilität und stichprobenweise vertieft [31].

**KfW / Bundesförderung für effiziente Gebäude (BEG):** Die BEG-Richtlinie Wohngebäude vom 17.07.2026 erklärt ANBest-P bzw. ANBest-Gk für anwendbar; die KfW setzt sie über privatrechtliche Verträge um. Abweichend gilt bis zu einer Zuwendung von 5 Mio. € nur: Aufträge wettbewerblich an fachkundige Anbieter, möglichst mindestens drei Angebote [30]. Zuschüsse gibt es dort nur für kommunale Antragsteller. Der Energieeffizienz-Experte – oft der Architekt – wirkt bei Ausschreibung und Vergabe der förderfähigen Maßnahmen mit, prüft die Aufträge gegen den Effizienzhaus-Nachweis und hilft beim Aufstellen der förderfähigen Ausgaben [30]. Vergabepflichten entstehen also auch hier, aber deutlich leichter als VOB/A.

## C. Modusmatrix privat / öffentlich / gefördert

Die Prozessnotizen nennen einen Regelwerk-Modus je Projekt oder VE ([Prozess I](/okf/research/process/tendering-and-award.md)). Diese Matrix füllt den Modus „gefördert“ und die Gleitklauseln mit Regeln (Einschätzung auf Basis der Quellen dieser Notiz):

| Regel / Ausgabe | privat | öffentlich (Bund, Land, Kommune) | gefördert, privater Empfänger (Verein, Kirche, Kita-Träger) | gefördert, Kommune |
|---|---|---|---|---|
| Vergabeverfahren VOB/A bzw. UVgO | nein | ja, mit Landes- oder Kommunalwertgrenzen | nur oberhalb der ANBest-Schwelle der jeweiligen Fassung (Bund 175.000 € + überwiegend öffentlich, NRW > 50 % und > 500.000 €); sonst Vergleichsangebote dokumentieren | ja, nach eigenem Haushaltsrecht |
| Vergabedokumentation | empfohlen (Haftung) | Pflicht | **Pflicht**, Lücken = schwerer Verstoß (Bayern) | Pflicht |
| Preisgleitklausel (224/225/225a/228) | frei vereinbar, PrKG und AGB beachten | Prüfpflicht nach Richtlinie 225 (10/6 Monate, 1 %) | wie privat, sofern Bescheid nichts vorgibt | wie öffentlich, wenn Landesregeln übernommen |
| Hinweisblatt zur Wirkungsweise | empfohlen (BGH 2014) | Pflicht (BMWSB) | empfohlen | empfohlen/Pflicht je Land |
| Gleitberechnung in der Rechnungsprüfung | wenn vereinbart | wenn vereinbart | wenn vereinbart; Mehrkosten über Bewilligung prüfen | wenn vereinbart |
| Förderfähigkeit je Position/KG | – | – | **Muss** | **Muss** |
| Finanzierungsplan mit Quellen | optional | Haushalt | **Muss** (verbindlich im Gesamtergebnis; beim Bund dürfen Einzelansätze bis 20 % überschritten werden, wenn andere Ansätze das ausgleichen) [9] | **Muss** |
| Mittelabruf | – | Haushaltsmittel | **Muss**: Fenster je Bescheid (6 Wochen bis 6 Monate) | **Muss**: Fenster oder Meilensteine 20/30/40/10 |
| Zwischen- und Verwendungsnachweis | – | – | **Muss**, mit Belegliste (Bund, NRW); NDS monatliche Summen | summarisch (ANBest-Gk), Bau: KG-Summen |
| USt-Modus der Nachweise | wie Vertrag | meist brutto | netto bei Vorsteuerabzug [9] | meist brutto |
| Aufbewahrung | Handels-/Steuerrecht | Haushaltsrecht | 5 Jahre nach Vorlage VN (länger, wenn Steuerrecht) [9] | 5 Jahre nach VN [15] |
| Prüfungsexport | – | Rechnungsprüfung | maschinell auswertbarer Export auf Verlangen [9] | wie links |
| Rückforderungs-Szenario | – | – | Kürzung Auftragseinheit bzw. 20–25 % [16] | wie links |

## D. Datenfelder und Berichtsvorlagen

### D.1 Datenfelder Preisgleitung

| Objekt | Felder |
|---|---|
| **Gleitvereinbarung** (je Vertrag) | Typ (224 / 225 / 225a / 228 / frei), Fassung und Stand des Formblatts, Monat Versand der Vergabeunterlagen, Monat Angebotsöffnung, Bagatellsatz (2 % bzw. 0,5 %), Bezugsgröße der Bagatelle (Verzeichnis-OZ / gesamte Abrechnungssumme), Regel für Abschläge (Auftragssumme / Leistungsstand), Selbstbeteiligungssatz (10 %, nachträglich 2022: 20 %), „mindestens Bagatellbetrag“ ja/nein, USt-Satz, Hinweisblatt beigefügt ja/nein |
| **Verzeichniszeile** | Stoff, GP-Nummer, OZ-Liste, Basiswert 1 mit Monat und Lieferantenbelegen (≥ 3) oder Bieter-Stoffpreis (225a), Abrechnungseinheit, Umrechnungsfaktor Stoffmenge je LV-Einheit, Abrechnungszeitpunkt (Einbau/Lieferung/Verwendung) |
| **Mengennachweis** | OZ, Monat, Stoffmenge, Beleg (Lieferschein, Wiegeschein, Aufmaß), Nachunternehmer ja/nein mit Nachweis, Kennzeichen „nach Vertragsfrist“ |
| **Indexwert** | GP-Nummer, Monat, Wert, Basisjahr, Quelle (Tabelle 61241-0004), Abrufdatum, Status vorläufig/endgültig |
| **Gleitabrechnung** (je Rechnung, kumuliert, als Snapshot) | Mehr, Minder, Saldo, Bezugssumme G, Bagatellbetrag, Selbstbeteiligung, Erstattung netto, USt, Differenz zur Vorrechnung |
| **Lohngleitung** | maßgebender Lohn (Berufsgruppe, Cent), Änderungssatz f mit Herleitung (A, L, N, LT), Abschnitte, Tarifverträge (Unterzeichnung, Wirksamkeit, Erhöhung), Leistungsstand je Stichtag |
| **NE-Metalle** | NE-Zahl je OZ, Metall, Basiswert €/100 kg mit Monat, Datum Auftragsschreiben/Anordnung, Notierung des 5. Tages |

### D.2 Datenfelder Förderung

| Objekt | Felder |
|---|---|
| **Förderung** | Geber, Programm, Bescheid (Datum, Aktenzeichen, Betrag, Zuschuss/Darlehen), Förderkennzeichen, Finanzierungsart (Anteil, Fehlbedarf, Festbetrag, Voll), Förderquote, Höchstbetrag, Bewilligungszeitraum, Nebenbestimmungen (Typ und Fassung), Baufachliche Nebenbestimmungen (z. B. NBest-Bau, RZBau), Datum Maßnahmebeginn bzw. Zustimmung zum vorzeitigen Beginn, Vorsteuerabzug ja/nein, Abruffenster, Meilensteinplan, Fristen für Zwischen- und Verwendungsnachweis, Aufbewahrungsende, EU-Kofinanzierung ja/nein |
| **Finanzierungsplan** | Ausgabepositionen (Kostengruppen oder Fördergegenstände) mit Ansätzen; Einnahmen: Eigenmittel, Leistungen Dritter, Zuwendungen je Geber |
| **Förderzuordnung** | VE / Position / Kostengruppe → Fördergegenstand, förderfähiger Anteil in %, Begründung bei Nicht-Förderfähigkeit |
| **Mittelabruf** | Nummer, Datum, Betrag, zugrunde liegende Rechnungen, Eingangsdatum, Verwendungsfrist, verbraucht bis, Status, Zinsrisiko |
| **Belegzeile** | Felder siehe B.3 |
| **Vergabeakte** | Verweis je VE: Verfahren, angewandte Wertgrenze und Fassung, Dokumente, Abweichungen |

### D.3 Berichtsvorlagen

1. **Belegliste** (CSV/XLSX/PDF): Nr., Belegnummer, Zahlungstag, Empfänger, Grund, Ausgabeart, KG, netto, USt, brutto, davon förderfähig, Förderkennzeichen; Summen je Ausgabeart.
2. **Kostenaufstellung förderfähig / nicht förderfähig:** Zeilen KG 100–800 (KG 710 und Baufeiern aus KG 769 gesondert), je Bauabschnitt; Spalten: laut Bescheid insgesamt / davon zuwendungsfähig, laut Abrechnung insgesamt / davon zuwendungsfähig, Differenz; Kennzeichen netto/brutto [19][20].
3. **Verwendungsnachweis Bau:** Kopf, Sachbericht-Gerüst (Bauablauf, Abweichungen), Einnahmen, Ausgaben nach KG, Ist-Ergebnis, Erklärungen (siehe B.3).
4. **Mittelabrufplan:** je Monat oder Quartal: erwartete fällige förderfähige Zahlungen, Förderquote, Abrufbetrag, kumuliert abgerufen, kumuliert verausgabt, Restbewilligung, Fensterprüfung (Ampel), Haushaltsjahr.
5. **Gleitabrechnung als Rechnungsanlage:** je OZ und Monat Menge, B2, Indizes, B3, Differenz, Betrag; Summen Mehr/Minder, Bezugssumme, Bagatelle, Selbstbeteiligung, Erstattung, USt; Indexquellen mit Abrufdatum.

## Relevanz für unser Projekt

**Muss** (für Projekte im Modus „öffentlich“ oder „gefördert“; Einschätzung):

- M1 **Regelwerk-Modus mit Fassungen:** Förderung und Gleitvereinbarung speichern die Fassung ihrer Regeln (ANBest-P 2025 vs. 2026, Formblatt 225 Stand 2023). Keine fest verdrahteten Schwellen.
- M2 **Förderzuordnung** je Position/KG (förderfähig ja/nein/Anteil) und **Belegliste- sowie KG-Kostenaufstellungs-Export**. Das ist billig, weil Rechnungsbuch und KG-Zuordnung ohnehin existieren ([Prozess II](/okf/research/process/billing-and-cost-control.md)).
- M3 **Revisionsfeste Vergabeakte** je VE – fehlende Dokumentation kostet nach RZVR die Förderung der Auftragseinheit.

**Soll:**

- S1 **Stoffpreisgleit-Rechner 225/225a** im Rechnungsprüfungsdialog, kumulativ, mit den Testfällen T1–T13 und dem Verbandsbeispiel als automatisierten Tests.
- S2 **Indeximport** aus GENESIS-CSV, optional über den eigenen API-Token des Nutzers; Basisjahr und Abrufdatum je Wert.
- S3 **Mittelabruf- und Mittelabflussplanung** mit konfigurierbarem Fenster oder Meilensteinen und Zinsrisiko-Warnung.
- S4 **Hinweis- und Formblattausgabe** (Verzeichnis 225/225a, Hinweisblatt) beim Erstellen der Vergabeunterlagen.

**Kann:**

- K1 Lohngleitklausel 224 (Änderungssatz, Lohnperioden, Leistungsstand je Stichtag).
- K2 NE-Metall-Gleitung 228 (abhängig von einer frei nutzbaren Metallnotierung).
- K3 Rückforderungs-Szenarien und Ampel „Förderrisiko“ je VE.
- K4 Offenes JSON-Schema für Gleitverzeichnisse und Förderdaten als Austauschformat.

**Differenzierungschancen:** Keine der untersuchten AVA-Lösungen dokumentiert öffentlich eine Gleitberechnung (A.8); Praktiker arbeiten mit Excel [22]. Eine nachvollziehbare, testbare Rechenengine mit offenen Formeln und Prüfprotokoll passt gut zu einem Open-Source-Produkt. Die Förder-Exporte lösen manuelle Excel-Listen ab und greifen direkt auf Daten zu, die die AVA schon hat.

**Risiken:**

- **Auslegung:** Bagatellbasis in Abschlägen, Umbasierung des Index, Skonto auf Gleitbeträge sind nicht eindeutig geregelt → jede Regel konfigurierbar, im Prüfprotokoll ausweisen, Voreinstellung dokumentieren.
- **Regelwechsel:** ANBest-Fassungen änderten sich 2025 und 2026 mehrfach (Bund, Hessen, Niedersachsen) → datierte Regeltabelle mit Quelle, Pflegeprozess im Projekt.
- **Haftung:** Fehlerhafte Rechnungsprüfung trifft den Architekten ([Prozess II](/okf/research/process/billing-and-cost-control.md)); Rechenfehler der Software würden durchschlagen → hohe Testabdeckung, Haftungsausschluss in der Lizenz.
- **Lizenzen:** Destatis-Daten frei mit Namensnennung [24]; VHB-Formblätter vermutlich als amtliche Werke nachbaubar ([Vergaberecht, 7.3](/okf/research/standards/procurement-law-e-vergabe.md)); Lizenz der DEL-Metallnotierung ungeklärt.

**Aufwandsschätzung** (Personentage für einen erfahrenen Entwickler, grobe Einschätzung):

| Paket | PT |
|---|---:|
| Gleitrechner 225/225a inkl. Testsuite und Rechnungsanlage | 8–12 |
| Indeximport (CSV) + optionaler API-Abruf | 4–6 |
| Lohngleitklausel 224 | 4–6 |
| NE-Metall-Gleitung 228 | 3–5 (ohne Datenquelle) |
| Förder-Datenmodell, Finanzierungsplan, Förderzuordnung | 8–12 |
| Belegliste, KG-Kostenaufstellung, Verwendungsnachweis-Export | 4–6 |
| Mittelabruf- und Mittelabflussplanung | 8–12 |
| Regeltabellen (ANBest-Fassungen, Abruffenster, Schwellen) + Pflegeprozess | 3–5 |
| **Summe** | **42–64** |

## Offene Fragen

**Nicht gefunden oder nicht verifiziert:**

1. **Bayern:** Text von ANBest-P und ANBest-K (Nr. 1.4 Mittelabruf, Nr. 3 Vergabe, Schwellen) – auf gesetze-bayern.de nur als Anlage verlinkt, nicht gelesen.
2. **NRW:** aktuelle Fassung des Runderlasses zur Rückforderung bei Vergabeverstößen mit Prozentsätzen; die ANBest-G (Kommunen) habe ich nicht gelesen.
3. **Bund:** Inhalt der „BNBest-Abruf“ (Regelfall Abrufverfahren) und die angekündigte Anpassung der VV-BHO an die ANBest-P 2026 [11].
4. **BMV-Rundschreiben vom 21.05.2026** (Asphalt) nur über eine Verbandsmeldung bekannt; ob es über den 30.09.2026 hinaus verlängert wurde, ist offen [8].
5. **Neuere Bundeserlasse:** Die fib-bund-Seite listet nach dem 20.06.2023 keinen weiteren Stoffpreis-Erlass [2]; ein VHB-Stand nach VgBG/VOB/A 2026 war nicht veröffentlicht.
6. **Abschlagsrechnungen:** Bezugsgröße der 2-%-Bagatelle (Auftragssumme der Verzeichnis-OZ oder abgerechneter Leistungsstand) – amtlich nicht geregelt, Verbandsleitfaden widersprüchlich [22].
7. **Index:** Ob Tabelle 61241-0004 heute nach GP 2019 gegliedert ist (2022 noch GP 2009 [7]), welche GP-Nummern typische Hochbaustoffe haben, ob Monatswerte außerhalb von Umbasierungen revidiert werden, und wie laufende Verträge eine Umbasierung behandeln.
8. **Skonto und Nachlass** auf Gleitbeträge: nur die Auffassung der VOB-Stelle Rheinland-Pfalz zum Nachlass gefunden.
9. **Förderfähigkeit von Gleitbeträgen:** Sind Mehrkosten aus Gleitklauseln zuwendungsfähig, und wie wird eine Überschreitung der Bewilligung behandelt (Nachbewilligung, Eigenanteil)?
10. **DEL-Notiz:** Zugang und Lizenz der Metallnotierung für Formblatt 228.
11. **AVA-Produkte:** Ob ORCA, California, iTWO, NEVARIS, AVANTI oder NOVA Gleitberechnungen in nicht öffentlichen Handbüchern anbieten.
12. **Rechtsprechung:** Folgeentscheidungen zum BGH-Urteil von 2014 (laut Fachbeiträgen u. a. BGH, 25.01.2018, VII ZR 219/14) nicht selbst gelesen.

**Fragen an den Architekten-Freund:**

1. Wie viele deiner Projekte sind gefördert? Welche Programme (Städtebauförderung, Schul-/Kita-Bau, Sportstätten, BEG/KfW, Denkmal, EU-Mittel) und in welchen Ländern?
2. Wer sind die geförderten Bauherren: Kommunen, Kirchengemeinden, Vereine, Kita-Träger? Welche Nebenbestimmungen (ANBest-P, ANBest-K, NBest-Bau) stehen in deren Bescheiden?
3. Erstellst du Mittelabrufe, Belegliste und Verwendungsnachweis selbst (als Besondere Leistung) oder liefert du nur Kostenaufstellungen zu? In welchem Format verlangen die Förderstellen das (Excel-Vorlage, Online-Portal, PDF)?
4. Hattest du schon Prüfungen durch Rechnungsprüfungsamt oder Förderstelle oder gar Rückforderungen? Woran lag es?
5. Enthalten deine Verträge Stoffpreisgleitklauseln (Formblatt 225 oder 225a) oder Lohngleitklauseln? Wie rechnest du sie heute ab – Excel, NOVA, gar nicht?
6. Welche DIN-276-Fassung verlangen deine Fördergeber für die Kostengliederung?
7. Plant ihr den Mittelabfluss nach Haushaltsjahren für kommunale Bauherren mit, und wer pflegt diesen Plan?

## Quellen

1. VHB 2017, Stand 2023, Lesefassung (Formblätter und Richtlinien 224, 225, 228; Anhang 4 „Grundsätze zur Anwendung von Preisvorbehalten bei öffentlichen Aufträgen“ vom 04.05.1972; Richtlinien 100, 321, 400, 510) – BMWSB / Fachinformationsbörse fib-bund.de – https://fib-bund.de/Inhalt/Vergabe/VHB/VHB_2017_Lesefassung_2023.pdf – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
2. VHB-Downloadseite mit Erlassen und Formblättern 225/225a – fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/ – Art: Primärquelle – abgerufen 2026-11-09
3. Erlass BMWSB B II 6 – 70437/9#4 vom 20.06.2023 „Lieferengpässe und Preissteigerungen wichtiger Baumaterialien als Folge des Ukraine-Kriegs“ (Auslaufen der Sonderregelungen) – fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/2023-06-20_BMWSB_BII6_Stoffpreissteigerungen_Aufhebung.pdf – Art: Primärquelle (Erlass) – abgerufen 2026-11-09
4. Formblatt 225 „Stoffpreisgleitklausel – Einheitliche Fassung“, Stand 20.06.2023 – fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/2023-06-20_Formblatt_225.pdf – Art: Primärquelle – abgerufen 2026-11-09
5. Formblatt 225a „Stoffpreisgleitklausel ohne Basiswert 1“ und Hinweisblatt zu 225a, Stand 20.06.2023 – fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/2023-06-20_Formblatt_225a.pdf und https://www.fib-bund.de/Inhalt/Vergabe/VHB/2023-06-20_Hinweis_zum_FB_225a.pdf – Art: Primärquelle – abgerufen 2026-11-09
6. Erlass BMWSB BW I 7 – 70437/9#4 vom 25.03.2022 „Lieferengpässe und Preissteigerungen wichtiger Baumaterialien als Folge des Ukraine-Kriegs“ (Kopie des Nds. Wirtschaftsministeriums) – https://www.mw.niedersachsen.de/download/182405 – Art: Primärquelle (Erlass, außer Kraft) – abgerufen 2026-11-09
7. Erlass MHKBD NRW vom 01.04.2022 „Kommunale Auftragsvergaben; Stoffpreisgleitklausel“ inkl. Anlagen (Hinweisblatt, Anleitung GENESIS-Online) – https://www.mhkbd.nrw/system/files/media/document/file/2022-04-01_erlass_kommunale_auftragsvergabe_stoffpreisgleitklausel_inkl.anlagen.pdf – Art: Primärquelle (Erlass) – abgerufen 2026-11-09
8. „Vereinbarung einer Stoffpreisgleitung für Asphaltmischgut wird befristet erleichtert“ (09.06.2026, mit BMV-Rundschreiben vom 21.05.2026) – Landesverband Bayerischer Bauinnungen (LBB) – https://www.lbb-bayern.de/aktuelles/news/news-uebersicht/news-detailansicht/vereinbarung-einer-stoffpreisgleitung-fuer-asphaltmischgut-wird-befristet-erleichtert.html – Art: Verbandsmeldung (sekundär) – abgerufen 2026-11-09
9. ANBest-P ab 08.09.2026 (BMF-Rundschreiben vom 07.09.2026, Gz. IIA3 – H 1005/00151/007/002), Anlage 2 zur VV Nr. 5.1 zu § 44 BHO – Bundesverwaltungsamt – https://www.bva.bund.de/SharedDocs/Downloads/DE/Aufgaben/ZMB/Zuwendungen_national/Nebenbestimmungen/nebenbestimmungen_anbest_p_2026.pdf?__blob=publicationFile&v=5 – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
10. ANBest-P, Fassung gültig ab 24.04.2025 (Kopie der Bundeszentrale für politische Bildung) – https://www.bpb.de/system/files/dokument_pdf/ANBest-P_24.04.2025.pdf?download=1 – Art: Primärquelle (Vorgängerfassung) – abgerufen 2026-11-09
11. „ANBest: Kommen bei Zuwendungen deutliche Vereinfachungen, höhere Wertgrenzen und mehr Flexibilität im Vergabewesen?“ (06.10.2026) – Vergabeblog – https://vergabeblog.de/2026-10-06/anbest-kommen-fuer-zuwendungsempfaenger-deutliche-vereinfachungen-hoehere-wertgrenzen-und-mehr-flexibilitaet/ – Art: Fachblog – abgerufen 2026-11-09
12. ANBest-P Nordrhein-Westfalen, Fassung ab 15.10.2025 (Kopie auf lmr-nrw.de; zweispaltiges PDF, Text per Extraktion rekonstruiert) – https://www.lmr-nrw.de/fileadmin/user_upload/ANBest-P_neu_ab_15.10.2025.pdf – Art: Primärquelle (Verwaltungsvorschrift, Kopie) – abgerufen 2026-11-09
13. ANBest-P Niedersachsen ab 01.01.2026 – NBank – https://www.nbank.de/medien/nb-media/Downloads/Rechtliche-Grundlagen/Landesrecht/Allgemeine-Nebenbestimmungen-f%C3%BCr-Zuwendungen-zur-Projektf%C3%B6rderung-(ANBest-P)-ab-01.01.2026.pdf – Art: Primärquelle (Förderbank) – abgerufen 2026-11-09
14. ANBest-P Hessen, Stand 09/2026 – WIBank – https://www.wibank.de/resource/blob/wibank/604978/98d7004485c14f12be45629b9d563c1b/anbest-projektfoerderung-data.pdf – Art: Primärquelle (Förderbank) – abgerufen 2026-11-09
15. ANBest-Gk ab 24.04.2025 (GMBl. 2025 Nr. 9, S. 162), Anlage 3 zur VV Nr. 5.1 zu § 44 BHO – Bundesverwaltungsamt – https://www.bva.bund.de/SharedDocs/Downloads/DE/Aufgaben/ZMB/Zuwendungen_national/Nebenbestimmungen/nebenbestimmungen_anbest_gk_2025.pdf?__blob=publicationFile – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
16. Richtlinie zur Rückforderung von Zuwendungen bei schweren Vergabeverstößen (RZVR), Bekanntmachung StMFH vom 25.02.2021, BayMBl. 2021 Nr. 182 – Verkündungsplattform Bayern – https://www.verkuendung-bayern.de/files/baymbl/2021/182/baymbl-2021-182.pdf – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
17. „Rückforderung von Zuwendungen wegen schwerer Vergabeverstöße“ (13.04.2022, zu VG München, Urteil vom 12.05.2021) – Bayerischer Rechts- und Verwaltungsreport (Boorberg) – https://bayrvr.boorberg.de/2022/04/13/rueckforderung-von-zuwendungen-wegen-schwerer-vergabeverstoesse/ – Art: Fachpresse – abgerufen 2026-11-09
18. „Widerruf einer Zuwendung in Höhe von 25 % auch bei kleinen Vergaberechtsverstößen geboten!“ (04.03.2024, zu VG Halle, 13.10.2023, 3 A 256/21) – Vergabeblog – https://vergabeblog.de/2024-03-04/widerruf-einer-zuwendung-in-hoehe-von-25-auch-bei-kleinen-vergaberechtsverstoessen-geboten-vg-halle-beschl-v-13-10-2023-3-a-256-21/ – Art: Fachblog – abgerufen 2026-11-09
19. Muster 1 zu Nr. 3.1 NBest-Bau „Verwendungsnachweis“ (SMBl. NRW 631, Fassung 06.06.2022) – recht.nrw.de – https://recht.nrw.de/system/files/BA/49029-53512-smbl_631_20220606_a_anlagemuster1zunr.3.1nbest-bau.pdf – Art: Primärquelle (Verwaltungsvorschrift, Formular) – abgerufen 2026-11-09
20. Vordruck Verwendungsnachweis, RZBau 2015 Muster 2 (Stand 02.02.2024) – Regierungspräsidium Gießen – https://rp-giessen.hessen.de/sites/rp-giessen.hessen.de/files/2025-05/vordruck_verwendungsnachweis_ausfuellbar_bf.pdf – Art: Primärquelle (Formular) – abgerufen 2026-11-09
21. V 225.H „Richtlinien Stoffpreisgleitklausel“, ABau 2026, Stand März 2026 – Senatsverwaltung für Stadtentwicklung Berlin – https://senstadtfms.stadt-berlin.de/intelliform/forms/eabau_2026/berlin/V_225H/index – Art: Primärquelle (Landes-Verwaltungsvorschrift) – abgerufen 2026-11-09
22. Leitfaden „Berechnung von Mehr- und Minderaufwendungen bei der Anwendung von Stoffpreisgleitklauseln in Bauverträgen“ (2015) – Hauptverband der Deutschen Bauindustrie, ZDB, BVMB (Kopie Bauindustrie Mitte) – https://www.bauindustrie-mitte.de/fileadmin/user_upload/Leitfaden_Stoffpreisgleitklausel_Final_25_03_15.pdf – Art: Verbandsleitfaden (Indexquelle veraltet) – abgerufen 2026-11-09
23. „Erzeugerpreise im September 2026: +6,7 % gegenüber September 2025“, Pressemitteilung Nr. 373 vom 20.10.2026 – Destatis – https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/10/PD26_373_61241.html – Art: Primärquelle (amtliche Statistik) – abgerufen 2026-11-09
24. GENESIS Anwenderdokumentation „Webservice/API“, Version 5.1 vom 01.06.2026 – Destatis – https://genesis.destatis.de/datenbank/online/docs/GENESIS-Webservices_Einfuehrung.pdf – Art: Primärquelle (technische Dokumentation) – abgerufen 2026-11-09
25. Press release No. 088 of 14 March 2024 (Erzeugerpreisindex, Umbasierung auf 2021) – Destatis – https://destatis.de/EN/Press/2024/03/PE24_088_61241.html – Art: Primärquelle (amtliche Statistik) – abgerufen 2026-11-09
26. § 1 Preisklauselgesetz (PrKG) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/prkg/__1.html – Art: Gesetz – abgerufen 2026-11-09
27. „BGH: Hinweis auf ungewöhnliche Kalkulationsanforderungen“ (13.01.2015, zu BGH, Urteil vom 01.10.2014, VII ZR 344/13) – Heuking Kühn Lüer Wojtek – https://www.heuking.de/de/news-events/newsletter-fachbeitraege/artikel/bgh-hinweis-auf-ungewoehnliche-kalkulationsanforderungen.html – Art: Kanzlei-Fachbeitrag – abgerufen 2026-11-09
28. „Stoffpreisgleitklausel: Wie wird sie ermittelt und wer zahlt das?“ (29.07.2022, Rechtsreferat der Bayerischen Architektenkammer) – Deutsches Architektenblatt – https://www.dabonline.de/recht/wie-wird-stoffpreisgleitklausel-ermittelt-grundleistung-materialkosten-preissteigerung/ – Art: Fachpresse (Kammer) – abgerufen 2026-11-09
29. HOAI 2021, Anlage 10 (Leistungsbild Gebäude und Innenräume, Besondere Leistungen) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/anlage_10.html – Art: Verordnung – abgerufen 2026-11-09
30. Förderrichtlinie für die Bundesförderung für effiziente Gebäude – Wohngebäude (BEG WG) vom 17.07.2026 (Kopie der Bundesingenieurkammer) – https://www.ingenieurkammer.de/fileadmin/dokumente/Downloads_PDF/News_Dokumente/20260717_F%C3%B6rderrichtlinie_BEG_WG.pdf – Art: Primärquelle (Förderrichtlinie) – abgerufen 2026-11-09
31. Städtebauförderungsrichtlinien Bayern (StBauFR), Nr. 22 „Verwendung“ – gesetze-bayern.de – https://www.gesetze-bayern.de/Content/Rtf/BayVV_2131_B_14785-NN23?all=False – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
32. „Preisgleitklausel für den Bau: Gesetz, Formel & Muster“ (18.10.2024, aktualisiert 16.04.2026) – NEVARIS Bausoftware – https://www.nevaris.com/blog/was-bedeutet-die-preisgleitklausel/ – Art: Herstellerangabe (Negativbefund zu Softwarefunktionen) – abgerufen 2026-11-09
